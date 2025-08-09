import prisma from '../../../lib/prisma.js';
import { allowedSections, normalizeIncoming } from '../../_utils.js';

export default async function handler(req, res) {
  const { section, id } = req.query;
  if (!allowedSections.has(section)) {
    return res.status(400).json({ message: 'Invalid section' });
  }

  try {
    if (req.method === 'PUT') {
      const existing = await prisma.book.findUnique({ where: { id } });
      if (!existing) return res.status(404).json({ message: 'Book not found' });
      const merged = normalizeIncoming({ ...existing, ...req.body }, section);
      const updated = await prisma.book.update({ where: { id }, data: merged });
      return res.status(200).json(updated);
    }

    if (req.method === 'DELETE') {
      await prisma.book.delete({ where: { id } });
      return res.status(204).end();
    }

    res.setHeader('Allow', 'PUT,DELETE');
    return res.status(405).json({ message: 'Method not allowed' });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: 'Server error' });
  }
}
