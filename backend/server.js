const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const fs = require('fs/promises');
const path = require('path');

const app = express();
const prisma = new PrismaClient();

app.use(express.json());
app.use(cors());

// --- SEED ROUTE ---
app.get('/api/seed', async (req, res) => {
  if (req.query.secret !== process.env.SEED_SECRET) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const libraryDataPath = path.join(__dirname, 'data', 'library.json');
    const libraryData = JSON.parse(await fs.readFile(libraryDataPath, 'utf-8'));

    await prisma.book.deleteMany({});
    await prisma.genre.deleteMany({});
    
    for (const book of libraryData) {
      if (!book.genre) continue; // Skip books that don't have a genre

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
          section: 'library',
          // MODIFIED: This now correctly handles the genre relationship
          genres: {
            connectOrCreate: {
              where: { name: book.genre },
              create: { name: book.genre },
            },
          },
        },
      });
    }
    
    res.status(200).json({ message: 'Seeding complete.' });

  } catch (error) {
    res.status(500).json({ message: 'Seeding failed.', error: error.message });
  }
});


// --- API ROUTES ---
app.get('/api/health', (_req, res) => res.json({ ok: true }));

const createSectionRoutes = (section) => {
  app.get(`/api/${section}`, async (_req, res) => {
    const books = await prisma.book.findMany({
      where: { section: section },
      include: { genres: true }, // Include genre data in the response
      orderBy: { createdAt: 'desc' }
    });
    res.json(books);
  });
};

createSectionRoutes('library');
createSectionRoutes('recommended');
createSectionRoutes('upcoming');


// Export the app for Vercel
module.exports = app;