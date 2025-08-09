import prisma from '../../lib/prisma.js';
import { allowedSections, normalizeIncoming } from '../_utils.js';

export default async function handler(req, res) {
  const { section } = req.query;
  if (!allowedSections.has(section)) {
    return res.status(400).json({ message: 'Invalid section' });
  }

  try {
    if (req.method === 'GET') {
      const books = await prisma.book.findMany({
        where: { section },
        orderBy: { createdAt: 'desc' }
      });
      return res.status(200).json(books);
    }

    if (req.method === 'POST') {
      const data = normalizeIncoming(req.body, section);
      const created = await prisma.book.create({ data });
      return res.status(201).json(created);
    }

    res.setHeader('Allow', 'GET,POST');
    return res.status(405).json({ message: 'Method not allowed' });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: 'Server error' });
  }
}
