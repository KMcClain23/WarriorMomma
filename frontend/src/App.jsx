// frontend/src/App.jsx
import { useEffect, useState } from 'react';
import BookModal from './BookModal';

const tabs = [
  { key: 'library', label: 'Collection', endpoint: '/api/library' },
  { key: 'recommended', label: 'Recommended', endpoint: '/api/recommended' },
  { key: 'upcoming', label: 'Upcoming', endpoint: '/api/upcoming' }
];

function Badge({ kind = 'jade', children }) {
  const cls =
    kind === 'rose' ? 'badge badge-rose' :
    kind === 'gold' ? 'badge badge-gold' :
    kind === 'violet' ? 'badge badge-violet' :
    kind === 'steel' ? 'badge badge-steel' :
    kind === 'neon' ? 'badge badge-neon' :
    'badge badge-jade';
  return <span className={cls}>{children}</span>;
}

function spiceBadge(spice) {
  if (!spice) return null;
  const s = String(spice).trim();
  return <Badge kind="rose">Spice {s}</Badge>;
}

export default function App() {
  const [active, setActive] = useState(tabs[0]);
  const [cache, setCache] = useState({});
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBook, setEditingBook] = useState(null);
  const [moveMenuOpenFor, setMoveMenuOpenFor] = useState(null);

  useEffect(() => {
    if (!cache[active.key]) {
      setLoading(true);
      fetch(`http://localhost:5000${active.endpoint}`)
        .then((r) => r.json())
        .then((data) => {
          setCache((prev) => ({ ...prev, [active.key]: data }));
        })
        .finally(() => setLoading(false));
    }
  }, [active, cache]);

  function handleTabClick(tab) {
    setActive(tab);
  }

  const handleOpenModal = (book = null) => {
    setEditingBook(book);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setEditingBook(null);
    setIsModalOpen(false);
  };

  const handleSaveBook = async (bookData) => {
    const method = editingBook ? 'PUT' : 'POST';
    const url = editingBook
      ? `http://localhost:5000${active.endpoint}/${editingBook.id}`
      : `http://localhost:5000${active.endpoint}`;

    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bookData)
    });
    const savedBook = await response.json();

    if (editingBook) {
      setCache(prev => ({
        ...prev,
        [active.key]: prev[active.key].map(b => b.id === editingBook.id ? savedBook : b)
      }));
    } else {
      setCache(prev => ({
        ...prev,
        [active.key]: [...prev[active.key], savedBook]
      }));
    }
    handleCloseModal();
  };

  const handleDeleteBook = async (bookId) => {
    await fetch(`http://localhost:5000${active.endpoint}/${bookId}`, {
      method: 'DELETE'
    });
    setCache(prev => ({
      ...prev,
      [active.key]: prev[active.key].filter(b => b.id !== bookId)
    }));
  };

  const handleMoveBook = async (book, destinationSection) => {
    const sourceSection = active.key;
    const bookToMove = cache[sourceSection].find(b => b.id === book.id);

    // Optimistic UI update
    setCache(prev => ({
      ...prev,
      [sourceSection]: prev[sourceSection].filter(b => b.id !== book.id),
      [destinationSection]: [...(prev[destinationSection] || []), bookToMove]
    }));

    await fetch('http://localhost:5000/api/move-book', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookId: book.id, sourceSection, destinationSection })
    });
    // No need to reload data due to optimistic update
  };

  const handleUpdateBookStatus = async (book, field, value) => {
    const updatedBook = { ...book, [field]: value };

    // Optimistic UI update
    setCache(prev => ({
      ...prev,
      [active.key]: prev[active.key].map(b => b.id === book.id ? updatedBook : b)
    }));

    await fetch(`http://localhost:5000${active.endpoint}/${book.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value })
    });
  };

  const data = cache[active.key] || [];

  return (
    <div className="min-h-dvh p-6 max-w-6xl mx-auto bg-paper bg-opacity-90">
      <header className="relative">
        <div className="absolute top-0 right-0 -z-10">
          <img src="https://i.imgur.com/c1iP4sD.png" alt="Rose" className="w-64 h-64 object-contain opacity-20" />
        </div>
        <h1 className="text-5xl font-bold">Moody tales. Bold hearts.</h1>
        <p className="mt-3 text-white/80 text-lg">Dark romance, romantasy, and neon noir.</p>

        {/* Tabs */}
        <div className="mt-8 border-b border-white/10 flex gap-2">
          {tabs.map(t => (
            <button
              key={t.key}
              className={`px-4 py-2 text-lg rounded-t-[14px] hover:text-white transition-colors duration-300 ${
                active.key === t.key ? 'text-white border-b-2 border-gold-ritual' : 'text-white/70'
              }`}
              onClick={() => handleTabClick(t)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </header>

      {/* Grid */}
      <section className="mt-6">
        {loading ? (
          <div className="text-white/70">Loading…</div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {data.map((b, i) => (
              <article key={i} className={`card bg-plum-velvet bg-opacity-20 border border-gold-ritual/20 shadow-lg transition-all duration-300 hover:border-gold-ritual/50 hover:shadow-glow relative ${moveMenuOpenFor === b.id ? 'z-20' : 'z-auto'}`}>
                <div className="absolute top-2 right-2 flex gap-2 z-10">
                  <button onClick={() => handleUpdateBookStatus(b, 'isRead', !b.isRead)} className={`btn text-xs px-2 py-1 ${b.isRead ? 'bg-gold-ritual text-raven-ink border-transparent' : 'btn-phantom'}`}>Read</button>
                  <button onClick={() => handleUpdateBookStatus(b, 'isTbr', !b.isTbr)} className={`btn text-xs px-2 py-1 ${b.isTbr ? 'bg-violet-phantom text-white border-transparent' : 'btn-phantom'}`}>TBR</button>
                </div>
                {b.coverUrl ? (
                  <img src={b.coverUrl} alt={b.title} className="w-full h-auto rounded-t-[14px] aspect-[2/3] object-cover" />
                ) : (
                  <div className="w-full aspect-[2/3] bg-raven-ink rounded-t-[14px] flex items-center justify-center p-4">
                    <h3 className="text-gold-ritual text-center font-semibold">{b.title}</h3>
                  </div>
                )}
                <div className="p-4">
                  <h3 className="font-bold text-2xl text-gold-ritual">{b.title}</h3>
                  {b.author && <p className="text-white/80">{b.author}</p>}

                  {/* genres */}
                  <div className="mt-3 flex gap-2 flex-wrap">
                    {Array.isArray(b.genres)
                      ? b.genres.map((g, j) => <Badge key={j}>{g}</Badge>)
                      : b.genre
                        ? <Badge>{b.genre}</Badge>
                        : b['genre/theme']
                          ? <Badge>{b['genre/theme']}</Badge>
                          : b['genre/category']
                            ? <Badge>{b['genre/category']}</Badge>
                            : null}
                    {/* spice */}
                    {spiceBadge(b.spice_level)}
                  </div>

                  {/* dates / notes / reason */}
                  <div className="mt-3 text-sm text-white/70 space-y-1">
                    {b.release_date && <div>Release: {b.release_date}</div>}
                    {b['reason/description'] && <div className="text-white/80">{b['reason/description']}</div>}
                    {b.notes && <div className="text-white/60">{b.notes}</div>}
                  </div>

                  {/* actions */}
                  <div className="mt-4 flex gap-2 relative items-center">
                    <button onClick={() => handleOpenModal(b)} className="btn bg-plum-velvet text-white hover:bg-plum-velvet/80">Edit</button>
                    <button onClick={() => handleDeleteBook(b.id)} className="btn btn-phantom">Delete</button>
                    <div className="relative">
                      <button onClick={() => setMoveMenuOpenFor(moveMenuOpenFor === b.id ? null : b.id)} className="btn btn-phantom">Move</button>
                      {moveMenuOpenFor === b.id && (
                        <div className="absolute top-full right-0 mt-2 w-48 bg-raven-ink rounded-[14px] shadow-lg z-10">
                          {tabs.filter(t => t.key !== active.key).map(t => (
                            <button
                              key={t.key}
                              onClick={() => {
                                handleMoveBook(b, t.key);
                                setMoveMenuOpenFor(null);
                              }}
                              className="w-full text-left px-4 py-2 text-sm text-white hover:bg-plum-velvet"
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
            ))}
          </div>
        )}
      </section>

      <button
        onClick={() => handleOpenModal()}
        className="fixed bottom-8 right-8 w-16 h-16 bg-gold-ritual text-raven-ink rounded-full shadow-lg flex items-center justify-center text-4xl font-bold"
      >
        +
      </button>

      {isModalOpen && (
        <BookModal
          book={editingBook}
          onClose={handleCloseModal}
          onSave={handleSaveBook}
        />
      )}
    </div>
  );
}
