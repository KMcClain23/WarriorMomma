export const allowedSections = new Set(['library', 'recommended', 'upcoming']);

export function normalizeCover(book) {
  const url = book?.coverUrl || book?.cover_image_url || '';
  const safe = url ? url.replace(/^http:/, 'https:').replace(/&edge=curl/g, '') : null;
  return { ...book, coverUrl: safe ?? null, cover_image_url: safe ?? null };
}

export function normalizeIncoming(body, section) {
  const genres = Array.isArray(body.genres)
    ? body.genres
    : String(body.genre || body['genre/theme'] || body['genre/category'] || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

  const toNum = (v) => {
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    const s = String(v ?? '').toLowerCase();
    if (/\bhigh\b/.test(s)) return 5;
    if (/\bmedium\b/.test(s)) return 3;
    if (/\blow\b/.test(s)) return 1;
    const n = parseInt(s, 10);
    return Number.isFinite(n) ? n : 0;
  };
  const spiceRaw =
    body.spice ?? body.spice_level ?? body.spiceLevel ?? body.spiceRating ?? body.spice_rating;
  const spice = Math.max(0, Math.min(5, toNum(spiceRaw)));

  return normalizeCover({
    title: body.title,
    author: body.author ?? null,
    genres,
    spice,
    isRead: !!body.isRead,
    isTbr: !!body.isTbr,
    release_date: body.release_date ?? null,
    notes: body.notes ?? null,
    coverUrl: body.coverUrl ?? body.cover_image_url ?? null,
    cover_image_url: body.cover_image_url ?? body.coverUrl ?? null,
    section
  });
}
