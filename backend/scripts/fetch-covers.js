// backend/scripts/fetch-covers.js
const fs = require('fs/promises');
const path = require('path');
const https = require('https');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DATA_FILES = ['library.json', 'recommended.json', 'upcoming.json'];

async function readJsonFile(filename) {
  const filePath = path.join(DATA_DIR, filename);
  const data = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(data);
}

async function writeJsonFile(filename, data) {
  const filePath = path.join(DATA_DIR, filename);
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function isPlaceholder(url) {
  if (!url || typeof url !== 'string') return true;
  return /placehold\.co/i.test(url) || /^data:/.test(url);
}

function httpsGetJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

function cleanTitle(raw = "") {
  let t = String(raw);
  t = t
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-");

  // remove things like (Villain #2), (Dark Romantasy #1)
  t = t.replace(/\([^)]*\)/g, " ").trim();

  // remove series markers like Book 2, Duet #2, #3, Vol 1
  t = t.replace(/\b(Book|Bk|Volume|Vol|Part|Duet|Trilogy|Series)\b\.?\s*#?\d+\b/gi, " ").trim();
  t = t.replace(/#\d+\b/g, " ").trim();

  // collapse whitespace
  t = t.replace(/\s{2,}/g, " ").trim();
  return t;
}

function firstTwoWords(str = "") {
  return String(str).trim().split(/\s+/).slice(0, 2).join(" ");
}

async function fetchFromOpenLibrary(title, author) {
  const params = new URLSearchParams();
  if (title) params.set('title', title);
  if (author) params.set('author', author);
  params.set('limit', '1');

  const url = `https://openlibrary.org/search.json?${params.toString()}`;
  const parsed = await httpsGetJson(url);
  const doc = parsed && parsed.docs && parsed.docs[0];
  if (!doc) return null;

  if (doc.cover_i) {
    return `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`;
  }
  const isbn = Array.isArray(doc.isbn) && doc.isbn[0];
  if (isbn) {
    return `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`;
  }
  return null;
}

async function fetchFromGoogleBooks(title, author) {
  const variants = [];
  const ct = cleanTitle(title);

  variants.push({ t: title, a: author });
  if (ct && ct !== title) variants.push({ t: ct, a: author });
  if (ct) variants.push({ t: ct, a: "" });
  if (title) variants.push({ t: title, a: "" });

  const two = firstTwoWords(ct || title);
  if (two && author) variants.push({ t: two, a: author });

  for (const { t, a } of variants) {
    const qParts = [];
    if (t) qParts.push(`intitle:${encodeURIComponent(t)}`);
    if (a) qParts.push(`inauthor:${encodeURIComponent(a)}`);
    const url = `https://www.googleapis.com/books/v1/volumes?q=${qParts.join('+')}&printType=books&maxResults=5`;

    try {
      const parsed = await httpsGetJson(url);
      const items = (parsed && parsed.items) || [];
      if (!items.length) continue;

      for (const it of items) {
        const il = it?.volumeInfo?.imageLinks;
        if (!il) continue;
        const candidate = il.extraLarge || il.large || il.medium || il.thumbnail || il.smallThumbnail;
        if (candidate) {
          return candidate.replace(/^http:/, "https:").replace(/&edge=curl/g, "");
        }
      }
    } catch {
      // try next variant
    }
  }
  return null;
}

async function main() {
  const missingAll = [];

  for (const filename of DATA_FILES) {
    console.log(`Processing ${filename}...`);
    const books = await readJsonFile(filename);
    let booksUpdated = 0;

    const list = Array.isArray(books) ? books : (books.books || []);
    if (!Array.isArray(list)) {
      console.warn(`  Skipping ${filename}: not an array`);
      continue;
    }

    for (const book of list) {
      const title = book.title || book.name || '';
      const author = book.author || (Array.isArray(book.authors) ? book.authors[0] : '') || '';
      const existing = book.coverUrl || book.cover_image_url;
      const needsFetch = !existing || isPlaceholder(existing);
      if (!title) continue;

      if (!needsFetch) {
        book.coverUrl = existing.replace(/^http:/, 'https:');
        book.cover_image_url = book.coverUrl;
        continue;
      }

      console.log(`  Fetching cover for "${title}"${author ? ` by ${author}` : ''}...`);
      let coverUrl = null;

      try {
        coverUrl = await fetchFromOpenLibrary(title, author);
        if (!coverUrl) {
          const ct = cleanTitle(title);
          if (ct && ct !== title) coverUrl = await fetchFromOpenLibrary(ct, author);
        }
        if (!coverUrl) {
          console.log(`    -> Open Library not found, trying Google Books...`);
          coverUrl = await fetchFromGoogleBooks(title, author);
        }

        if (coverUrl) {
          coverUrl = coverUrl.replace(/^http:/, 'https:');
          book.coverUrl = coverUrl;
          book.cover_image_url = coverUrl;
          console.log(`    -> Found cover`);
          booksUpdated++;
        } else {
          console.log(`    -> No cover found`);
          missingAll.push({ file: filename, title, author });
        }
      } catch (error) {
        console.error(`    -> Error:`, error.message);
        missingAll.push({ file: filename, title, author, error: error.message });
      }

      await sleep(800);
    }

    if (booksUpdated > 0) {
      console.log(`Writing updated data to ${filename}...`);
      if (Array.isArray(books)) {
        await writeJsonFile(filename, list);
      } else {
        await writeJsonFile(filename, { ...books, books: list });
      }
    }
    console.log(`Finished processing ${filename}.`);
  }

  const reportPath = path.join(DATA_DIR, 'covers_missing.json');
  await fs.writeFile(reportPath, JSON.stringify(missingAll, null, 2));
  console.log(`Missing report written to ${reportPath}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
