// frontend/src/App.jsx
import { useEffect, useMemo, useState } from 'react';
import BookModal from './BookModal.jsx';
import FilterPanel from './components/FilterPanel.jsx';

const API_BASE = ''; // same-origin (works with `vercel dev` and on Vercel)

const tabs = [
  { key: 'library', label: 'Collection', endpoint: '/api/library' },
  { key: 'recommended', label: 'Recommended', endpoint: '/api/recommended' },
  { key: 'upcoming', label: 'Upcoming', endpoint: '/api/upcoming' },
];

// ---- helpers ---------------------------------------------------------------
function getSpice(book) {
  const raw =
    book?.spice ??
    book?.spice_level ??
    book?.spiceLevel ??
    book?.spiceRating ??
    book?.spice_rating ??
    book?.['spice level'] ??
    book?.['Spice Level'] ??
    book?.['Spice'] ??
    book?.['spice'];
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return Math.max(0, Math.min(5, Math.round(raw)));
  }
  const v = String(raw ?? '').trim().toLowerCase();
  if (!v) return 0;
  if (/\bhigh\b/.test(v)) return 5;
  if (/\bmedium\b/.test(v)) return 3;
  if (/\blow\b/.test(v)) return 1;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? Math.max(0, Math.min(5, n)) : 0;
}

function spiceEmojis(n) {
  const x = Math.max(0, Math.min(5, Number(n) || 0));
  return x === 0 ? '0' : '🌶️'.repeat(x);
}

function getCover(book) {
  const url = book?.coverUrl || book?.cover_image_url || '';
  return url ? url.replace(/^http:/, 'https:').replace(/&edge=curl/g, '') : '';
}

function getGenres(book) {
  if (Array.isArray(book?.genres)) return book.genres.filter(Boolean);
  const raw = book?.genre || book?.['genre/theme'] || book?.['genre/category'] || '';
  return String(raw).split(',').map((s) => s.trim()).filter(Boolean);
}

// ---- component -------------------------------------------------------------
export default function App() {
  const [active, setActive] = useState(tabs[0]);
  const [cache, setCache] = useState({});
  const [loading, setLoading] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBook, setEditingBook] = useState(null);
  const [moveMenuOpenFor, setMoveMenuOpenFor] = useState(null);

  // filters
  const [selectedGenres, setSelectedGenres] = useState(new Set());
  const [spiceFilter, setSpiceFilter] = useState('any');   // "any" or "0".."5"
  const [statusFilter, setStatusFilter] = useState('any'); // "any" | "read" | "tbr"

  const sectionKey = active.key;
  const endpoint = `${API_BASE}${active.endpoint}`;

  // fetch data for active tab
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (cache[sectionKey]) return;
      setLoading(true);
      try {
        const r = await fetch(endpoint);
        const data = await r.json();
        if (!cancelled) {
          setCache((prev) => ({ ...prev, [sectionKey]: Array.isArray(data) ? data : [] }));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sectionKey, endpoint, cache]);

  // available genres for this tab (for dynamic filter pills)
  const availableGenres = useMemo(() => {
    const s = new Set();
    (cache[sectionKey] || []).forEach((b) => getGenres(b).forEach((g) => s.add(g)));
    return s;
  }, [sectionKey, cache]);

  // prune selected genres if they vanish on tab switch or data change
  useEffect(() => {
    if (!selectedGenres.size) return;
    const next = new Set([...selectedGenres].filter((g) => availableGenres.has(g)));
    if (next.size !== selectedGenres.size) setSelectedGenres(next);
  }, [availableGenres, selectedGenres]);

  // modal helpers
  const handleOpenModal = (book = null) => {
    setEditingBook(book);
    setIsModalOpen(true);
  };
  const handleCloseModal = () => {
    setEditingBook(null);
    setIsModalOpen(false);
  };

  // CRUD
  const handleSaveBook = async (bookData) => {
    const method = editingBook ? 'PUT' : 'POST';
    const url = editingBook ? `${endpoint}/${editingBook.id}` : endpoint;

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bookData),
    });
    const saved = await res.json();

    setCache((prev) => ({
      ...prev,
      [sectionKey]: editingBook
        ? prev[sectionKey].map((b) => (b.id === editingBook.id ? saved : b))
        : [...(prev[sectionKey] || []), saved],
    }));
    handleCloseModal();
  };

  const handleDeleteBook = async (bookId) => {
    await fetch(`${endpoint}/${bookId}`, { method: 'DELETE' });
    setCache((prev) => ({
      ...prev,
      [sectionKey]: prev[sectionKey].filter((b) => b.id !== bookId),
    }));
  };

  const handleMoveBook = async (book, destinationSection) => {
    const sourceSection = sectionKey;
    const bookToMove = cache[sourceSection].find((b) => b.id === book.id);

    // optimistic UI
    setCache((prev) => ({
      ...prev,
      [sourceSection]: prev[sourceSection].filter((b) => b.id !== book.id),
      [destinationSection]: [...(prev[destinationSection] || []), bookToMove],
    }));

    await fetch(`/api/move-book`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookId: book.id, sourceSection, destinationSection }),
    });
  };

  const handleUpdateBookStatus = async (book, field, value) => {
    const updatedBook = { ...book, [field]: value };

    // optimistic UI
    setCache((prev) => ({
      ...prev,
      [sectionKey]: prev[sectionKey].map((b) => (b.id === book.id ? updatedBook : b)),
    }));

    await fetch(`${endpoint}/${book.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value }),
    });
  };

  const data = cache[sectionKey] || [];
  const fallback = '/images/cover-fallback.svg';

  // apply filters
  const filteredData = useMemo(() => {
    return data.filter((b) => {
      const genres = getGenres(b);
      const spice = getSpice(b);

      const genresOk =
        selectedGenres.size === 0 || [...selectedGenres].every((g) => genres.includes(g));

      const spiceOk = spiceFilter === 'any' ? true : spice === Number(spiceFilter);

      const statusOk =
        statusFilter === 'any'
          ? true
          : statusFilter === 'read'
          ? !!b.isRead
          : !!b.isTbr;

      return genresOk && spiceOk && statusOk;
    });
  }, [data, selectedGenres, spiceFilter, statusFilter]);

  // ---- UI ------------------------------------------------------------------
  return (
    <div className="min-h-dvh p-4 sm:p-6 max-w-6xl mx-auto bg-paper">
      <header className="relative">
        <h1 className="font-bold">Moody tales. Bold hearts.</h1>
        <p className="mt-2 text-white/80 text-base sm:text-lg">
          Dark romance, romantasy, and neon noir.
        </p>

        {/* Tabs */}
        <div className="mt-4 sm:mt-8 border-b border-white/10 -mx-4 sm:mx-0 px-4 tabbar-scroll">
          <div className="flex gap-2 min-w-max">
            {tabs.map((t) => (
              <button
                key={t.key}
                className={`px-4 py-2 text-base sm:text-lg rounded-t-[14px] hover:text-white transition-colors ${
                  sectionKey === t.key
                    ? 'text-white border-b-2 border-[var(--gold-ritual)]'
                    : 'text-white/70'
                }`}
                onClick={() => setActive(t)}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Filters */}
      <FilterPanel
        data={data}
        selectedGenres={selectedGenres}
        setSelectedGenres={setSelectedGenres}
        spiceFilter={spiceFilter}
        setSpiceFilter={setSpiceFilter}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        clearFilters={() => {
          setSelectedGenres(new Set());
          setSpiceFilter('any');
          setStatusFilter('any');
        }}
      />

      {/* Grid */}
      <section className="mt-4 sm:mt-6">
        {loading ? (
          <div className="text-white/70">Loading…</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {filteredData.map((b) => {
              const cover = getCover(b);
              const spice = getSpice(b);
              return (
                <article
                  key={b.id}
                  className={`card hover:shadow-glow transition relative ${
                    moveMenuOpenFor === b.id ? 'z-20' : 'z-auto'
                  }`}
                >
                  {/* Top-right actions */}
                  <div className="absolute top-2 right-2 flex gap-2 z-10">
                    <button
                      onClick={() => handleUpdateBookStatus(b, 'isRead', !b.isRead)}
                      className={`btn text-xs px-3 py-2 ${
                        b.isRead
                          ? 'bg-[var(--gold-ritual)] text-[var(--raven-ink)] border-transparent'
                          : 'btn-phantom'
                      }`}
                      title={b.isRead ? 'Mark as Unread' : 'Mark as Read'}
                    >
                      Read
                    </button>
                    <button
                      onClick={() => handleUpdateBookStatus(b, 'isTbr', !b.isTbr)}
                      className={`btn text-xs px-3 py-2 ${
                        b.isTbr
                          ? 'bg-[var(--violet-phantom)] text-white border-transparent'
                          : 'btn-phantom'
                      }`}
                      title={b.isTbr ? 'Remove from TBR' : 'Add to TBR'}
                    >
                      TBR
                    </button>
                  </div>

                  {/* Cover or fallback */}
                  {cover ? (
                    <img
                      src={cover}
                      alt={b.title}
                      className="w-full h-auto rounded-t-[14px] aspect-[2/3] object-cover"
                      onError={(e) => {
                        if (e.currentTarget.dataset.fallbackApplied) return;
                        e.currentTarget.dataset.fallbackApplied = '1';
                        e.currentTarget.src = fallback;
                      }}
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full aspect-[2/3] bg-[var(--raven-ink)] rounded-t-[14px] flex items-center justify-center p-4">
                      <h3 className="text-[var(--gold-ritual)] text-center font-semibold">
                        {b.title}
                      </h3>
                    </div>
                  )}

                  <div className="p-4">
                    <h3 className="font-bold text-xl sm:text-2xl text-[var(--gold-ritual)]">
                      {b.title}
                    </h3>
                    {b.author && (
                      <p className="text-white/80 text-sm sm:text-base">{b.author}</p>
                    )}

                    {/* spice (chilies only) */}
                    <div
                      className="mt-3 text-2xl leading-none"
                      aria-label={`Spice ${spice} of 5`}
                      title={`Spice ${spice}/5`}
                    >
                      {spiceEmojis(spice)}
                    </div>

                    {/* meta */}
                    <div className="mt-3 text-sm text-white/70 space-y-1">
                      {b.release_date && <div>Release: {b.release_date}</div>}
                      {b['reason/description'] && (
                        <div className="text-white/80">{b['reason/description']}</div>
                      )}
                      {b.notes && <div className="text-white/60">{b.notes}</div>}
                    </div>

                    {/* actions */}
                    <div className="mt-4 flex gap-2 items-center">
                      <button
                        onClick={() => handleOpenModal(b)}
                        className="btn bg-[var(--violet-phantom)] text-white hover:opacity-90"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteBook(b.id)}
                        className="btn btn-phantom"
                      >
                        Delete
                      </button>

                      <div className="relative ml-auto">
                        <button
                          onClick={() =>
                            setMoveMenuOpenFor(moveMenuOpenFor === b.id ? null : b.id)
                          }
                          className="btn btn-phantom"
                        >
                          Move
                        </button>
                        {moveMenuOpenFor === b.id && (
                          <div className="absolute top-full right-0 mt-2 w-48 bg-[var(--raven-ink)] rounded-[14px] shadow-lg z-10 ring-1 ring-white/10">
                            {tabs
                              .filter((t) => t.key !== sectionKey)
                              .map((t) => (
                                <button
                                  key={t.key}
                                  onClick={() => {
                                    handleMoveBook(b, t.key);
                                    setMoveMenuOpenFor(null);
                                  }}
                                  className="w-full text-left px-4 py-2 text-sm text-white hover:bg-white/10"
                                >
                                  Move to {t.label}
                                </button>
                              ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* FAB */}
      <button
        onClick={() => handleOpenModal(null)}
        className="fixed bottom-4 right-4 w-14 h-14 sm:w-16 sm:h-16 bg-[var(--gold-ritual)] text-[var(--raven-ink)] rounded-full shadow-lg flex items-center justify-center text-3xl sm:text-4xl font-bold"
        aria-label="Add book"
      >
        +
      </button>

      {isModalOpen && (
        <BookModal book={editingBook} onClose={handleCloseModal} onSave={handleSaveBook} />
      )}
    </div>
  );
}
