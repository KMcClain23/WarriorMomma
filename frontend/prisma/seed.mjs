import { PrismaClient } from '@prisma/client';
import library from '../data/library.json' assert { type: 'json' };
import recommended from '../data/recommended.json' assert { type: 'json' };
import upcoming from '../data/upcoming.json' assert { type: 'json' };

const prisma = new PrismaClient();

const clamp = (n) => Math.max(0, Math.min(5, Math.round(n)));

function toSpice(b) {
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
  const s = String(raw ?? '').toLowerCase().trim();
  if (!s) return 0;
  if (/\bhigh\b/.test(s)) return 5;
  if (/\bmedium\b/.test(s)) return 3;
  if (/\blow\b/.test(s)) return 1;
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? clamp(n) : 0;
}

function toGenres(b) {
  if (Array.isArray(b.genres)) return b.genres.filter(Boolean);
  const alt = b.genre || b['genre/theme'] || b['genre/category'] || '';
  return String(alt).split(',').map((x) => x.trim()).filter(Boolean);
}

function mergeNotes(b) {
  return b.notes ?? b['reason/description'] ?? null;
}

function normCover(b) {
  const url = b.coverUrl || b.cover_image_url || '';
  const safe = url ? url.replace(/^http:/, 'https:').replace(/&edge=curl/g, '') : null;
  return { coverUrl: safe, cover_image_url: safe };
}

async function seedSection(items, section) {
  for (const b of items) {
    const { coverUrl, cover_image_url } = normCover(b);
    await prisma.book.create({
      data: {
        title: b.title ?? 'Untitled',
        author: b.author ?? null,
        genres: toGenres(b),
        spice: toSpice(b),
        isRead: !!(b.isRead ?? b.read ?? b.is_read),
        isTbr: !!(b.isTbr ?? b.tbr ?? b.is_tbr),
        release_date: b.release_date ?? b.releaseDate ?? null,
        notes: mergeNotes(b),
        coverUrl,
        cover_image_url,
        section
      }
    });
  }
  console.log(`✅ Seeded ${section} (${items.length} books)`);
}

async function main() {
  console.log('🫘 Seeding from /frontend/data');
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
