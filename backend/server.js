const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const fs = require('fs/promises');
const path = require('path');

const app = express();
const prisma = new PrismaClient();

app.use(express.json());

const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://warrior-momma-five.vercel.app'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
}));

// --- HELPER FUNCTION ---
async function getCoverImageUrl(title, author) {
  if (!title || !author) return null;
  const apiKey = process.env.GOOGLE_BOOKS_API_KEY;
  if (!apiKey) return null;

  const query = encodeURIComponent(`intitle:${title}+inauthor:${author}`);
  const url = `https://www.googleapis.com/books/v1/volumes?q=${query}&key=${apiKey}`;
  try {
    const response = await fetch(url);
    const data = await response.json();
    const imageUrl = data.items?.[0]?.volumeInfo?.imageLinks?.thumbnail;
    return imageUrl || null;
  } catch (error) {
    console.error("Error fetching from Google Books API:", error);
    return null;
  }
}

// --- UTILITY ROUTES ---
app.get('/api/seed', async (req, res) => {
  if (req.query.secret !== process.env.SEED_SECRET) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const sectionsToSeed = ['library', 'recommended', 'upcoming'];

    for (const section of sectionsToSeed) {
      console.log(`Seeding section: ${section}...`);
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
          isRead: book.isRead || false,
          isTbr: book.isTbr || false,
          owned: book.owned === 'Yes',
          section: section,
        };

        await prisma.book.upsert({
          where: { id: book.id },
          update: bookData,
          create: {
            ...bookData,
            genres: {
              connectOrCreate: {
                where: { name: genreName },
                create: { name: genreName },
              },
            },
          },
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
    const booksToUpdate = await prisma.book.findMany();
    let updatedCount = 0;
    for (const book of booksToUpdate) {
      const newCoverUrl = await getCoverImageUrl(book.title, book.author);
      if (newCoverUrl && newCoverUrl !== book.cover_image_url) {
        await prisma.book.update({
          where: { id: book.id },
          data: { cover_image_url: newCoverUrl },
        });
        updatedCount++;
      }
    }
    res.status(200).json({ message: `Cover update complete. ${updatedCount} covers updated.` });
  } catch (error) {
    res.status(500).json({ message: 'Cover update failed.', error: error.message });
  }
});

app.get('/api/health', (_req, res) => res.json({ ok: true }));

// --- CORE API ROUTES ---
const createSectionRoutes = (section) => {
  // GET all
  app.get(`/api/${section}`, async (_req, res) => {
    const books = await prisma.book.findMany({
      where: { section: section },
      include: { genres: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(books);
  });

  // CREATE
  app.post(`/api/${section}`, async (req, res) => {
    try {
      const { title, author, genre, spice_level, release_date, notes, isRead, isTbr, owned } = req.body;
      const cover_image_url = await getCoverImageUrl(title, author);
      const newBook = await prisma.book.create({
        data: {
          title,
          author,
          spice_level,
          release_date,
          notes,
          isRead,
          isTbr,
          owned,
          section,
          cover_image_url,
          genres: genre
            ? { connectOrCreate: { where: { name: genre }, create: { name: genre } } }
            : undefined
        }
      });
      res.json(newBook);
    } catch (error) {
      res.status(500).json({ message: 'Create failed', error: error.message });
    }
  });

  // UPDATE
  app.put(`/api/${section}/:id`, async (req, res) => {
    try {
      const { title, author, genre, spice_level, release_date, notes, isRead, isTbr, owned } = req.body;
      const cover_image_url = await getCoverImageUrl(title, author);
      const updated = await prisma.book.update({
        where: { id: req.params.id },
        data: {
          title,
          author,
          spice_level,
          release_date,
          notes,
          isRead,
          isTbr,
          owned,
          cover_image_url,
          genres: genre
            ? { connectOrCreate: { where: { name: genre }, create: { name: genre } } }
            : undefined
        }
      });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: 'Update failed', error: error.message });
    }
  });

  // DELETE
  app.delete(`/api/${section}/:id`, async (req, res) => {
    try {
      await prisma.book.delete({ where: { id: req.params.id } });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: 'Delete failed', error: error.message });
    }
  });
};

createSectionRoutes('library');
createSectionRoutes('recommended');
createSectionRoutes('upcoming');

module.exports = app;
