const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');

const app = express();
const prisma = new PrismaClient(); // Initialize Prisma Client

app.use(express.json());

// This now includes your live frontend URL to fix the CORS error
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

// Health check route
app.get('/api/health', (_req, res) => res.json({ ok: true }));

// Generic CRUD routes for a section using Prisma
const createSectionRoutes = (section) => {
  // GET all books in a section
  app.get(`/api/${section}`, async (_req, res) => {
    const books = await prisma.book.findMany({
      where: { section: section },
      orderBy: { createdAt: 'desc' }
    });
    res.json(books);
  });

  // POST a new book to a section
  app.post(`/api/${section}`, async (req, res) => {
    const newBook = await prisma.book.create({
      data: { ...req.body, section: section }
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