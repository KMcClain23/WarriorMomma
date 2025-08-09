const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');

const app = express();
const prisma = new PrismaClient();

app.use(express.json());
app.use(cors());

// NEW FUNCTION: Fetches a book cover from the Google Books API
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
    // Use optional chaining (?.) to safely access the image link
    const imageUrl = data.items?.[0]?.volumeInfo?.imageLinks?.thumbnail;
    return imageUrl || null;
  } catch (error) {
    console.error("Error fetching from Google Books API:", error);
    return null;
  }
}


// Health check route
app.get('/api/health', (_req, res) => res.json({ ok: true }));

// Generic CRUD routes for a section
const createSectionRoutes = (section) => {
  // GET all books in a section
  app.get(`/api/${section}`, async (_req, res) => {
    // ... (This route remains the same)
  });

  // MODIFIED: This route now automatically fetches the cover image
  app.post(`/api/${section}`, async (req, res) => {
    const { title, author } = req.body;
    
    // Fetch the cover image before creating the book
    const cover_image_url = await getCoverImageUrl(title, author);

    const newBook = await prisma.book.create({
      data: { 
        ...req.body,
        cover_image_url: cover_image_url, // Save the found URL
        section: section 
      }
    });
    res.status(201).json(newBook);
  });

  // ... (Your PUT and DELETE routes remain the same)
};

createSectionRoutes('library');
createSectionRoutes('recommended');
createSectionRoutes('upcoming');

// ... (Your /api/move-book route remains the same)

// Export the app for Vercel
module.exports = app;