// frontend/prisma/seed.mjs
import { PrismaClient } from '@prisma/client';
import library from '../data/library.json' assert { type: 'json' };
import recommended from '../data/recommended.json' assert { type: 'json' };
import upcoming from '../data/upcoming.json' assert { type: 'json' };

const prisma = new PrismaClient();

// normalize helpers
const toGenres = (b) =>
  Array.isArray(b.genres)
    ? b.genres
    : String(b.genre || b['genre/theme'] || b['genre/category'] || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

const clamp = (n) => Math.max(0, Math.min(5, Math.round(n)));
const toSpice = (b) => {
  const raw =
    b.spice ??
    b.spice_level ??
    b.spiceLevel ??
    b.spiceRating ??
    b.spice_rating ??
    b['spice level'] ??
    b['Spice Level'] ??
    b['Spice'] ??
    b['spice'];
  if (typeof raw === 'number' && Number.isFinite(raw)) return clamp(raw);
  const s = String(raw ?? '').toLowerCase();
  if (/\bhigh\b/.test(s)) return 5;
  if (/\bmedium\b/.test(s)) return 3;
  if (/\blow\b/.test(s)) return 1;
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? clamp(n) : 0;
};

async function seedSection(items, section) {
  for (const b of items) {
    await prisma.book.create({
      data: {
        title: b.title ?? 'Untitled',
        author: b.author ?? null,
        genres: toGenres(b),
        spice: toSpice(b),
        isRead: !!b.isRead,
        isTbr: !!b.isTbr,
        release_date: b.release_date ?? null,
        notes: b.notes ?? null,
        coverUrl: b.coverUrl ?? b.cover_image_url ?? null,
        cover_image_url: b.cover_image_url ?? b.coverUrl ?? null,
        section // "library" | "recommended" | "upcoming"
      }
    });
  }
  console.log(`✅ Seeded ${section} (${items.length} books)`);
}

async function main() {
  console.log('🫘 Seeding from /frontend/data');

  // Optional: clear to avoid duplicates while iterating
  await prisma.book.deleteMany({});

  await seedSection(library, 'library');
  await seedSection(recommended, 'recommended');
  await seedSection(upcoming, 'upcoming');
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log('🎉 Seed complete');
  })
  .catch(async (e) => {
    console.error('❌ Seed failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
