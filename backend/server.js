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
  // ... (Full function code)
}

// --- UTILITY ROUTES ---
app.get('/api/seed', async (req, res) => {
  // ... (Full seed route code)
});

app.get('/api/update-covers', async (req, res) => {
  // ... (Full update-covers route code)
});

// Health check route
app.get('/api/health', (_req, res) => res.json({ ok: true }));

// --- CORE API ROUTES ---
const createSectionRoutes = (section) => {
  // ... (Full GET, POST, PUT, DELETE routes)
};

createSectionRoutes('library');
createSectionRoutes('recommended');
createSectionRoutes('upcoming');

app.post('/api/move-book', async (req, res) => {
  // ... (Full move-book route code)
});

// Export the app for Vercel
module.exports = app;