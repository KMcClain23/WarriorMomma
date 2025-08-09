import prisma from '../lib/prisma.js';
import { allowedSections } from './_utils.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { bookId, sourceSection, destinationSection } = req.body || {};
  if (!bookId || !allowedSections.has(sourceSection) || !allowedSections.has(destinationSection)) {
    return res.status(400).json({ message: 'Invalid payload' });
  }

  try {
    const existing = await prisma.book.findUnique({ where: { id: bookId } });
    if (!existing || existing.section !== sourceSection) {
      return res.status(404).json({ message: 'Book not found in source section' });
    }

    await prisma.book.update({
      where: { id: bookId },
      data: { section: destinationSection }
    });

    return res.status(200).json({ message: 'Book moved successfully' });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: 'Server error' });
  }
}
