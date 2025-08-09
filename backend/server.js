// backend/server.js
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs/promises');
const crypto = require('crypto');
const { enrichCover } = require('./utils/covers');
const { normalizeBook } = require('./utils/normalize');

const app = express();
app.use(express.json());

// CORS for local dev
const allowedOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173'];
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
}));

// Health
app.get('/api/health', (_req, res) => res.json({ ok: true }));

// Helpers to read/write JSON files
const dataFilePath = (section) => path.join(__dirname, 'data', `${section}.json`);

const readData = async (section) => {
  const filePath = dataFilePath(section);
  const data = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(data);
};

const writeData = async (section, data) => {
  const filePath = dataFilePath(section);
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
};

// utility: apply query filters
function filterBooks(books, query) {
  const { genres = '', spice, spiceMin, spiceMax } = query;

  const wantedGenres = new Set(
    String(genres || '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
  );

  const exactSpice = spice !== undefined && spice !== '' ? Number(spice) : null;
  const min = spiceMin !== undefined ? Number(spiceMin) : 0;
  const max = spiceMax !== undefined ? Number(spiceMax) : 5;

  return books.filter(b => {
    const genreOk =
      wantedGenres.size === 0 ||
      Array.from(wantedGenres).every(g => b.genres?.includes(g));

    const spiceOk =
      exactSpice !== null
        ? b.spice === exactSpice
        : b.spice >= min && b.spice <= max;

    return genreOk && spiceOk;
  });
}

// Generic CRUD routes for a section, with cover enrichment and normalization
const createSectionRoutes = (section) => {
  // List with optional filters:
  // /api/:section?genres=A,B&spice=3
  // /api/:section?genres=A,B&spiceMin=1&spiceMax=5
  app.get(`/api/${section}`, async (req, res) => {
    try {
      const raw = await readData(section);
      const normalized = raw.map(normalizeBook);
      const filtered = filterBooks(normalized, req.query);
      res.json(filtered);
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: 'Failed to read data' });
    }
  });

  // Unique genres for a section
  app.get(`/api/${section}/genres`, async (_req, res) => {
    try {
      const raw = await readData(section);
      const normalized = raw.map(normalizeBook);
      const set = new Set();
      normalized.forEach(b => (b.genres || []).forEach(g => set.add(g)));
      res.json(Array.from(set).sort());
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: 'Failed to read genres' });
    }
  });

  // Create
  app.post(`/api/${section}`, async (req, res) => {
    try {
      const data = await readData(section);
      const incoming = { id: crypto.randomUUID(), ...req.body };

      // normalize and enrich
      const normalized = normalizeBook(incoming);
      const enriched = await enrichCover(normalized);

      data.push(enriched);
      await writeData(section, data);
      res.status(201).json(enriched);
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: 'Failed to create book' });
    }
  });

  // Update
  app.put(`/api/${section}/:id`, async (req, res) => {
    try {
      const { id } = req.params;
      const data = await readData(section);
      const index = data.findIndex((book) => String(book.id) === String(id));
      if (index === -1) {
        return res.status(404).json({ message: 'Book not found' });
      }

      const merged = { ...data[index], ...req.body, id };
      const normalized = normalizeBook(merged);
      const enriched = await enrichCover(normalized);

      data[index] = enriched;
      await writeData(section, data);
      res.json(enriched);
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: 'Failed to update book' });
    }
  });

  // Delete
  app.delete(`/api/${section}/:id`, async (req, res) => {
    try {
      const { id } = req.params;
      const data = await readData(section);
      const next = data.filter((book) => String(book.id) !== String(id));
      if (next.length === data.length) {
        return res.status(404).json({ message: 'Book not found' });
      }
      await writeData(section, next);
      res.status(204).send();
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: 'Failed to delete book' });
    }
  });
};

createSectionRoutes('library');
createSectionRoutes('recommended');
createSectionRoutes('upcoming');

// Move a book between sections, normalizing and enriching on the way
app.post('/api/move-book', async (req, res) => {
  const { bookId, sourceSection, destinationSection } = req.body;
  try {
    const sourceData = await readData(sourceSection);
    const idx = sourceData.findIndex(b => String(b.id) === String(bookId));
    if (idx === -1) {
      return res.status(404).json({ message: 'Book not found in source section' });
    }

    const [bookToMove] = sourceData.splice(idx, 1);
    await writeData(sourceSection, sourceData);

    const normalized = normalizeBook(bookToMove);
    const enriched = await enrichCover(normalized);

    const destData = await readData(destinationSection);
    destData.push(enriched);
    await writeData(destinationSection, destData);

    res.status(200).json({ message: 'Book moved successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error moving book', error: error.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`WarriorMomma backend running on http://localhost:${PORT}`));
