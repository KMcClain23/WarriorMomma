const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');

const app = express();
const prisma = new PrismaClient();

app.use(express.json());

const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://warrior-momma-five.vercel.app'
];

app.use(cors({
  origin(origin, cb) {
    if (!origin || allowedOrigins.includes(origin)) cb(null, true);
    else cb(new Error('Not allowed by CORS'));
  }
}));

// --------- helpers ----------
async function getCoverImageUrl(title, author) {
  if (!title || !author) return null;
  const apiKey = process.env.GOOGLE_BOOKS_API_KEY;
  if (!apiKey) return null;

  const query = encodeURIComponent(`intitle:${title}+inauthor:${author}`);
  const url = `https://www.googleapis.com/books/v1/volumes?q=${query}&key=${apiKey}`;
  try {
    const response = await fetch(url);
    const data = await response.json();
    return data.items?.[0]?.volumeInfo?.imageLinks?.thumbnail || null;
  } catch {
    return null; // never throw from helper
  }
}

// Accepts {genre:"Dark"}, {genres:["Dark","Suspense"]}, or {genres:[{name:"Dark"}]}
function buildGenreMutation(body) {
  let names = [];
  if (Array.isArray(body.genres)) {
    names = body.genres.map(g => (typeof g === 'string' ? g : g?.name)).filter(Boolean);
  } else if (body.genre) {
    names = [body.genre];
  }
  names = [...new Set(names.map(s => s.trim()))].filter(Boolean);
  if (names.length === 0) return null;
  return {
    set: [], // replace existing set
    connectOrCreate: names.map(name => ({ where: { name }, create: { name } }))
  };
}

// ---------- utilities ----------
app.get('/api/seed', async (req, res) => {
  if (req.query.secret !== process.env.SEED_SECRET) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  try {
    const sectionsToSeed = ['library', 'recommended', 'upcoming'];
    for (const section of sectionsToSeed) {
      const dataPath = path.join(__dirname, 'data', `${section}.json`);
      const booksData = JSON.parse(await fs.readFile(dataPath, 'utf-8'));
      for (const book of booksData) {
        const genreName = book.genre || book['genre/theme'] || book['genre/category'];
        if (!book.id || !genreName) continue;

        const bookData = {
          id: book.id,
          title: book.title,
          author: book.author,
          cover_image_url: book.cover_image_url,
          notes: book.notes,
          spice_level: book.spice_level,
          release_date: book.release_date,
          isRead: !!book.isRead,
          isTbr: !!book.isTbr,
          owned: book.owned === 'Yes',
          section
        };

        await prisma.book.upsert({
          where: { id: book.id },
          update: bookData,
          create: {
            ...bookData,
            genres: {
              connectOrCreate: {
                where: { name: genreName },
                create: { name: genreName }
              }
            }
          }
        });
      }
    }
    res.status(200).json({ message: 'Seeding complete for all sections.' });
  } catch (error) {
    res.status(500).json({ message: 'Seeding failed.', error: error.message });
  }
});

app.get('/api/update-covers', async (req, res) => {
  if (req.query.secret !== process.env.SEED_SECRET) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  try {
    const books = await prisma.book.findMany();
    let updatedCount = 0;
    for (const book of books) {
      const newCover = await getCoverImageUrl(book.title, book.author);
      if (newCover && newCover !== book.cover_image_url) {
        await prisma.book.update({ where: { id: book.id }, data: { cover_image_url: newCover } });
        updatedCount++;
      }
    }
    res.status(200).json({ message: `Cover update complete. ${updatedCount} covers updated.` });
  } catch (error) {
    res.status(500).json({ message: 'Cover update failed.', error: error.message });
  }
});

// health
app.get('/api/health', (_req, res) => res.json({ ok: true }));

// ---------- READ by section ----------
const createSectionRoutes = (section) => {
  app.get(`/api/${section}`, async (_req, res) => {
    const books = await prisma.book.findMany({
      where: { section },
      include: { genres: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(books);
  });
};
createSectionRoutes('library');
createSectionRoutes('recommended');
createSectionRoutes('upcoming');

// ---------- CREATE ----------
app.post('/api/:section', async (req, res) => {
  try {
    const { section } = req.params;
    const b = req.body || {};
    const id = b.id || crypto.randomUUID();

    // try to fetch a cover only when creating and only if missing
    let coverUrl = b.cover_image_url ?? null;
    if (!coverUrl) coverUrl = await getCoverImageUrl(b.title, b.author);

    const genreMutation = buildGenreMutation(b);

    const created = await prisma.book.create({
      data: {
        id,
        section,
        title: b.title ?? '',
        author: b.author ?? '',
        cover_image_url: coverUrl,
        notes: b.notes ?? '',
        spice_level: b.spice_level != null ? Number(b.spice_level) : 0,
        release_date: b.release_date ?? null,
        isRead: !!b.isRead,
        isTbr: !!b.isTbr,
        owned: !!b.owned,
        ...(genreMutation ? { genres: genreMutation } : {})
      },
      include: { genres: true }
    });
    res.status(201).json(created);
  } catch (err) {
    console.error('POST error', err);
    res.status(500).json({ error: 'Create failed', detail: err.message });
  }
});

// ---------- UPDATE (no external API calls here) ----------
app.put('/api/:section/:id', async (req, res) => {
  try {
    const { section, id } = req.params;
    const patch = req.body || {};

    const existing = await prisma.book.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Not found' });
    if (existing.section !== section) {
      return res.status(400).json({ error: `Book is in '${existing.section}', not '${section}'` });
    }

    const genreMutation = buildGenreMutation(patch);

    const updated = await prisma.book.update({
      where: { id },
      data: {
        title: patch.title ?? undefined,
        author: patch.author ?? undefined,
        // only update cover if caller provided one
        cover_image_url: patch.cover_image_url ?? undefined,
        notes: patch.notes ?? undefined,
        spice_level: patch.spice_level != null ? Number(patch.spice_level) : undefined,
        release_date: patch.release_date ?? undefined,
        isRead: patch.isRead != null ? !!patch.isRead : undefined,
        isTbr: patch.isTbr != null ? !!patch.isTbr : undefined,
        owned: patch.owned != null ? !!patch.owned : undefined,
        ...(genreMutation ? { genres: genreMutation } : {})
      },
      include: { genres: true }
    });

    res.json(updated);
  } catch (err) {
    console.error('PUT error', err);
    res.status(500).json({ error: 'Update failed', detail: err.message });
  }
});

// ---------- DELETE ----------
app.delete('/api/:section/:id', async (req, res) => {
  try {
    const { section, id } = req.params;
    const existing = await prisma.book.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Not found' });
    if (existing.section !== section) {
      return res.status(400).json({ error: `Book is in '${existing.section}', not '${section}'` });
    }
    await prisma.book.delete({ where: { id } });
    res.status(204).end();
  } catch (err) {
    console.error('DELETE error', err);
    res.status(500).json({ error: 'Delete failed', detail: err.message });
  }
});

// ---------- MOVE ----------
app.post('/api/move-book', async (req, res) => {
  try {
    const { bookId, sourceSection, destinationSection } = req.body || {};
    if (!bookId || !sourceSection || !destinationSection) {
      return res.status(400).json({ error: 'Missing fields' });
    }
    const existing = await prisma.book.findUnique({ where: { id: bookId } });
    if (!existing) return res.status(404).json({ error: 'Not found' });
    if (existing.section !== sourceSection) {
      return res.status(400).json({ error: `Book is in '${existing.section}', not '${sourceSection}'` });
    }
    const moved = await prisma.book.update({
      where: { id: bookId },
      data: { section: destinationSection },
      include: { genres: true }
    });
    res.json(moved);
  } catch (err) {
    console.error('MOVE error', err);
    res.status(500).json({ error: 'Move failed', detail: err.message });
  }
});

// export for Vercel (no app.listen here)
module.exports = app;
