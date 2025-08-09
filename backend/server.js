const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const fs = require('fs/promises');
const path = require('path');

const app = express();
const prisma = new PrismaClient();

app.use(express.json());

// Secure CORS configuration
const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://warrior-momma-five.vercel.app' // Your live frontend URL
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
// Fetches a book cover from the Google Books API
async function getCoverImageUrl(title, author) {
  if (!title || !author) return null;
  
  const apiKey = process.env.GOOGLE_BOOKS_API_KEY;
  if (!apiKey) {
    console.log("Google Books API key is missing.");
    return null;
  }

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

// Seed route for one-time database population
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
      if (!book.genre) continue;
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

// Health check route
app.get('/api/health', (_req, res) => res.json({ ok: true }));


// --- CORE API ROUTES ---

// Function to generate CRUD routes for a book section
const createSectionRoutes = (section) => {
  // GET all books in a section
  app.get(`/api/${section}`, async (_req, res) => {
    const books = await prisma.book.findMany({
      where: { section: section },
      include: { genres: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(books);
  });

  // POST a new book to a section
  app.post(`/api/${section}`, async (req, res) => {
    const { title, author } = req.body;
    const cover_image_url = await getCoverImageUrl(title, author);
    const newBook = await prisma.book.create({
      data: { 
        ...req.body,
        cover_image_url: cover_image_url,
        section: section 
      }
    });
    res.status(201).json(newBook);
  });

  // PUT (update) a book
  app.put(`/api/${section}/:id`, async (req, res) => {
    const { id } = req.params;
    try {
      const updatedBook = await prisma.book.update({
        where: { id: id },
        data: req.body
      });
      res.json(updatedBook);
    } catch (error) {
      res.status(404).json({ message: 'Book not found' });
    }
  });

  // DELETE a book
  app.delete(`/api/${section}/:id`, async (req, res) => {
    const { id } = req.params;
    try {
      await prisma.book.delete({ where: { id: id } });
      res.status(204).send();
    } catch (error) {
      res.status(404).json({ message: 'Book not found' });
    }
  });
};

// Create the routes for all three sections
createSectionRoutes('library');
createSectionRoutes('recommended');
createSectionRoutes('upcoming');

// Route to move a book from one section to another
app.post('/api/move-book', async (req, res) => {
  const { bookId, destinationSection } = req.body;
  try {
    const updatedBook = await prisma.book.update({
      where: { id: bookId },
      data: { section: destinationSection }
    });
    res.status(200).json(updatedBook);
  } catch (error) {
    res.status(500).json({ message: 'Error moving book', error: error.message });
  }
});


// Export the app for Vercel
module.exports = app;