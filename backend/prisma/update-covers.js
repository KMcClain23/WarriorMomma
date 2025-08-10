// backend/prisma/update-covers.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function getCoverImageUrl(title, author) {
  if (!title || !author) return null;
  const apiKey = process.env.GOOGLE_BOOKS_API_KEY;
  if (!apiKey) {
    console.log("Google Books API key is missing.");
    return null;
  }

  const query = encodeURIComponent(`intitle:${title}+inauthor:${author}`);
  const url = `https://www.googleapis.com/books/v1/volumes?q=${query}&key=${apiKey}`;
  try {
    const response = await fetch(url);
    const data = await response.json();
    const imageUrl = data.items?.[0]?.volumeInfo?.imageLinks?.thumbnail;
    return imageUrl || null;
  } catch (error) {
    console.error("Error fetching from Google Books API:", error);
    return null;
  }
}

async function main() {
  console.log('Starting cover update process...');
  const booksToUpdate = await prisma.book.findMany();
  let updatedCount = 0;
  for (const book of booksToUpdate) {
    const newCoverUrl = await getCoverImageUrl(book.title, book.author);
    if (newCoverUrl && newCoverUrl !== book.cover_image_url) {
      await prisma.book.update({
        where: { id: book.id },
        data: { cover_image_url: newCoverUrl },
      });
      updatedCount++;
      console.log(`Updated cover for: ${book.title}`);
    }
  }
  console.log(`Cover update complete. ${updatedCount} covers updated.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });