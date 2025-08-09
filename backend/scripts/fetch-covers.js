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

async function fetchFromOpenLibrary(title, author) {
  const query = `title=${encodeURIComponent(title)}&author=${encodeURIComponent(author)}`;
  const url = `https://openlibrary.org/search.json?${query}`;

  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.docs && parsed.docs.length > 0) {
            const coverId = parsed.docs[0].cover_i;
            if (coverId) {
              resolve(`https://covers.openlibrary.org/b/id/${coverId}-L.jpg`);
            } else {
              resolve(null);
            }
          } else {
            resolve(null);
          }
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

async function fetchFromGoogleBooks(title, author) {
  const query = `q=intitle:${encodeURIComponent(title)}+inauthor:${encodeURIComponent(author)}`;
  const url = `https://www.googleapis.com/books/v1/volumes?${query}`;

  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.items && parsed.items.length > 0) {
            const imageLinks = parsed.items[0].volumeInfo.imageLinks;
            if (imageLinks && imageLinks.thumbnail) {
              resolve(imageLinks.thumbnail);
            } else {
              resolve(null);
            }
          } else {
            resolve(null);
          }
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

async function main() {
  for (const filename of DATA_FILES) {
    console.log(`Processing ${filename}...`);
    const books = await readJsonFile(filename);
    let booksUpdated = 0;

    for (const book of books) {
      // If the book already has a coverUrl, skip it.
      if (book.coverUrl) {
        continue;
      }

      console.log(`  Fetching cover for "${book.title}"...`);
      let coverUrl = null;

      try {
        coverUrl = await fetchFromOpenLibrary(book.title, book.author);
        if (!coverUrl) {
          console.log(`    -> Open Library failed, trying Google Books...`);
          coverUrl = await fetchFromGoogleBooks(book.title, book.author);
        }

        if (coverUrl) {
          // I'm getting a http url, but I want https
          book.coverUrl = coverUrl.replace(/^http:/, 'https:');
          console.log(`    -> Found cover: ${book.coverUrl}`);
          booksUpdated++;
        } else {
          console.log(`    -> No cover found for "${book.title}"`);
        }
      } catch (error) {
        console.error(`    -> Error fetching cover for "${book.title}":`, error.message);
      }

      // Remove the old placeholder URL field
      delete book.cover_image_url;

      // Be a good citizen and don't spam the APIs
      await sleep(1000);
    }

    if (booksUpdated > 0) {
      console.log(`Writing updated data to ${filename}...`);
      await writeJsonFile(filename, books);
    }
    console.log(`Finished processing ${filename}.`);
  }
}

main().catch(console.error);
