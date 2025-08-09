const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const fs = require('fs/promises');
const path = require('path');

const app = express();
const prisma = new PrismaClient();

app.use(express.json());
app.use(cors());

// --- NEW SEED ROUTE ---
app.get('/api/seed', async (req, res) => {
  // A simple secret to prevent this from being run accidentally
  if (req.query.secret !== process.env.SEED_SECRET) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    console.log('Reading library data...');
    const libraryDataPath = path.join(__dirname, 'data', 'library.json');
    const libraryData = JSON.parse(await fs.readFile(libraryDataPath, 'utf-8'));

    console.log('Deleting existing data...');
    await prisma.book.deleteMany({});
    
    console.log('Seeding database...');
    for (const book of libraryData) {
      await prisma.book.create({
        data: {
          id: book.id,
          title: book.title,
          author: book.author,
          cover_image_url: book.cover_image_url,
          notes: book.notes,
          spice_level: book.spice_level,
          release_date: book.release_date,
          isRead: book.isRead,
          isTbr: book.isTbr,
          owned: book.owned === 'Yes',
          genre: book.genre,
          section: 'library'
        }
      });
    }
    console.log('Seeding complete.');
    res.status(200).json({ message: 'Seeding complete.' });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Seeding failed.', error: error.message });
  }
});


// Health check route
app.get('/api/health', (_req, res) => res.json({ ok: true }));

// Generic CRUD routes for a section
const createSectionRoutes = (section) => {
  app.get(`/api/${section}`, async (_req, res) => {
    const books = await prisma.book.findMany({
      where: { section: section },
      orderBy: { createdAt: 'desc' }
    });
    res.json(books);
  });
  // ... (other routes remain the same)
};

createSectionRoutes('library');
createSectionRoutes('recommended');
createSectionRoutes('upcoming');

// Export the app for Vercel
module.exports = app;