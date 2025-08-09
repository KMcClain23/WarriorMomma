// backend/utils/covers.js
const https = require('https');

function httpsGetJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch (e) { reject(e); } });
    }).on('error', reject);
  });
}

function cleanTitle(raw = "") {
  let t = String(raw)
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/\([^)]*\)/g, " ")
    .replace(/\b(Book|Bk|Volume|Vol|Part|Duet|Trilogy|Series)\b\.?\s*#?\d+\b/gi, " ")
    .replace(/#\d+\b/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
  return t;
}

function isPlaceholder(url) {
  return !url || /placehold\.co/i.test(url) || /^data:/.test(url);
}

async function fetchFromOpenLibrary(title, author) {
  const params = new URLSearchParams();
  if (title) params.set('title', title);
  if (author) params.set('author', author);
  params.set('limit', '1');
  const parsed = await httpsGetJson(`https://openlibrary.org/search.json?${params.toString()}`);
  const doc = parsed?.docs?.[0];
  if (!doc) return null;
  if (doc.cover_i) return `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`;
  const isbn = Array.isArray(doc.isbn) && doc.isbn[0];
  return isbn ? `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg` : null;
}

async function fetchFromGoogleBooks(title, author) {
  const variants = [];
  const ct = cleanTitle(title);
  variants.push({ t: title, a: author });
  if (ct && ct !== title) variants.push({ t: ct, a: author });
  if (ct) variants.push({ t: ct, a: '' });
  if (title) variants.push({ t: title, a: '' });

  for (const { t, a } of variants) {
    const q = [t && `intitle:${encodeURIComponent(t)}`, a && `inauthor:${encodeURIComponent(a)}`]
      .filter(Boolean).join('+');
    const parsed = await httpsGetJson(`https://www.googleapis.com/books/v1/volumes?q=${q}&printType=books&maxResults=5`);
    const items = parsed?.items || [];
    for (const it of items) {
      const il = it?.volumeInfo?.imageLinks;
      const candidate = il?.extraLarge || il?.large || il?.medium || il?.thumbnail || il?.smallThumbnail;
      if (candidate) return candidate.replace(/^http:/, 'https:').replace(/&edge=curl/g, '');
    }
  }
  return null;
}

async function findCoverUrl(title, author) {
  // Try Open Library then Google Books, with cleaned variants
  let url = await fetchFromOpenLibrary(title, author);
  if (!url) {
    const ct = cleanTitle(title);
    if (ct && ct !== title) url = await fetchFromOpenLibrary(ct, author);
  }
  if (!url) url = await fetchFromGoogleBooks(title, author);
  return url ? url.replace(/^http:/, 'https:') : null;
}

async function enrichCover(book) {
  const title = book.title || book.name || '';
  const author = book.author || (Array.isArray(book.authors) ? book.authors[0] : '') || '';
  const existing = book.coverUrl || book.cover_image_url;

  if (!title) return book;
  if (existing && !isPlaceholder(existing)) {
    // normalize both keys
    const norm = existing.replace(/^http:/, 'https:');
    return { ...book, coverUrl: norm, cover_image_url: norm };
  }

  const found = await findCoverUrl(title, author);
  if (found) {
    return { ...book, coverUrl: found, cover_image_url: found };
  }
  return book; // leave as-is; UI will show fallback
}

module.exports = { enrichCover, findCoverUrl, isPlaceholder, cleanTitle };
