// frontend/src/components/BookCard.jsx
export default function BookCard({ book }) {
  const chilies = book.spice > 0 ? '🌶️'.repeat(book.spice) : '0';

  return (
    <div className="rounded-2xl bg-[var(--steel-mafia)] p-4 shadow ring-1 ring-white/10">
      {book.coverUrl ? (
        <img
          src={book.coverUrl}
          alt={`${book.title} cover`}
          className="w-full h-80 object-cover rounded-xl"
          loading="lazy"
        />
      ) : null}

      <h3 className="mt-4 text-lg font-semibold">{book.title}</h3>
      <p className="text-sm opacity-80">{book.author}</p>

      <div className="mt-3 flex flex-wrap gap-2">
        {(book.genres || []).map(g => (
          <span
            key={g}
            className="rounded-full px-3 py-1 text-xs bg-[var(--raven-ink)] ring-1 ring-white/10"
          >
            {g}
          </span>
        ))}
      </div>

      <div className="mt-2 text-sm">
        <span className="opacity-80 mr-2">Spice:</span>
        <span aria-label={`Spice ${book.spice} of 5`} title={`Spice ${book.spice}/5`}>
          {chilies}
        </span>
      </div>

      {book.releaseDate ? (
        <div className="mt-2 text-xs opacity-80">Release: {book.releaseDate}</div>
      ) : null}

      {book.notes ? (
        <div className="mt-1 text-xs opacity-80">{book.notes}</div>
      ) : null}
    </div>
  );
}
