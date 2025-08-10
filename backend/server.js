const express = require('express');
const cors = require('cors');
// const { PrismaClient } = require('@prisma/client'); // Temporarily disabled

const app = express();
// const prisma = new PrismaClient(); // Temporarily disabled

app.use(express.json());
app.use(cors());

// The only active route is the health check
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, message: 'Server is running without Prisma.' });
});

// All other routes are temporarily disabled for this test
// createSectionRoutes('library');
// createSectionRoutes('recommended');
// createSectionRoutes('upcoming');
// ...

module.exports = app;