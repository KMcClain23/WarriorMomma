// backend/server.js
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(express.json());
app.use(cors({ origin: 'http://localhost:5173' }));

// Health
app.get('/api/health', (_req, res) => res.json({ ok: true }));

// === Add these three routes ===
app.get('/api/library', (_req, res) =>
  res.sendFile(path.join(__dirname, 'data', 'library.json'))
);
app.get('/api/recommended', (_req, res) =>
  res.sendFile(path.join(__dirname, 'data', 'recommended.json'))
);
app.get('/api/upcoming', (_req, res) =>
  res.sendFile(path.join(__dirname, 'data', 'upcoming.json'))
);

// Optional: keep your old /api/books if you want
// app.get('/api/books', ...)

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`WarriorMomma backend running on http://localhost:${PORT}`));
