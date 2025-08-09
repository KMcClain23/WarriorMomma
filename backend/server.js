// backend/server.js
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs/promises');
const crypto = require('crypto');

const app = express();
app.use(express.json());
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

// Generic CRUD routes for a section
const createSectionRoutes = (section) => {
  app.get(`/api/${section}`, async (_req, res) => {
    const data = await readData(section);
    res.json(data);
  });

  app.post(`/api/${section}`, async (req, res) => {
    const data = await readData(section);
    const newBook = { id: crypto.randomUUID(), ...req.body };
    data.push(newBook);
    await writeData(section, data);
    res.status(201).json(newBook);
  });

  app.put(`/api/${section}/:id`, async (req, res) => {
    const { id } = req.params;
    const data = await readData(section);
    const index = data.findIndex((book) => book.id === id);
    if (index === -1) {
      return res.status(404).json({ message: 'Book not found' });
    }
    data[index] = { ...data[index], ...req.body };
    await writeData(section, data);
    res.json(data[index]);
  });

  app.delete(`/api/${section}/:id`, async (req, res) => {
    const { id } = req.params;
    const data = await readData(section);
    const newData = data.filter((book) => book.id !== id);
    if (data.length === newData.length) {
      return res.status(404).json({ message: 'Book not found' });
    }
    await writeData(section, newData);
    res.status(204).send();
  });
};

createSectionRoutes('library');
createSectionRoutes('recommended');
createSectionRoutes('upcoming');

app.post('/api/move-book', async (req, res) => {
  const { bookId, sourceSection, destinationSection } = req.body;

  try {
    // Read source data
    const sourceData = await readData(sourceSection);
    const bookToMove = sourceData.find(book => book.id === bookId);

    if (!bookToMove) {
      return res.status(404).json({ message: 'Book not found in source section' });
    }

    // Remove book from source
    const newSourceData = sourceData.filter(book => book.id !== bookId);
    await writeData(sourceSection, newSourceData);

    // Read destination data
    const destinationData = await readData(destinationSection);

    // Add book to destination
    destinationData.push(bookToMove);
    await writeData(destinationSection, destinationData);

    res.status(200).json({ message: 'Book moved successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error moving book', error: error.message });
  }
});

const PORT = process.env.PORT || 5000;
if (require.main === module) {
  app.listen(PORT, () => console.log(`WarriorMomma backend running on http://localhost:${PORT}`));
}

module.exports = app;
