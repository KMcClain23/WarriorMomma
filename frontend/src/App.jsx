import { useEffect, useMemo, useState } from 'react';
import BookModal from './BookModal';

const API_URL = import.meta.env.VITE_API_BASE_URL;

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

function spiceEmojis(n) {
  const v = Number.isFinite(n) ? Math.max(0, Math.min(5, Number(n))) : 0;
  return '🌶️'.repeat(v);
}

export default function App() {
  const [active, setActive] = useState(tabs[0]);
  const [cache, setCache] = useState({});
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBook, setEditingBook] = useState(null);
  const [moveMenuOpenFor, setMoveMenuOpenFor] = useState(null);

  // Filters
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('any'); // any | tbr | read
  const [spiceFilter, setSpiceFilter] = useState('any');   // any | 0..5
  const [selectedGenres, setSelectedGenres] = useState(new Set());
  const [tbrFirst, setTbrFirst] = useState(true);

  useEffect(() => {
    if (!cache[active.key]) {
      setLoading(true);
      fetch(`${API_URL}${active.endpoint}`)
        .then((r) => r.json())
        .then((data) => setCache((prev) => ({ ...prev, [active.key]: data })))
        .finally(() => setLoading(false));
    }
  }, [active, cache]);

  const handleTabClick = (t) => {
    setActive(t);
    setMoveMenuOpenFor(null);
  };

  const handleOpenModal = (book = null) => {
    setEditingBook(book);
    setIsModalOpen(true);
  };
  const handleCloseModal = () => {
    setEditingBook(null);
    setIsModalOpen(false);
  };

  // ---------- FIXED: robust save with non-JSON/204 handling ----------
  const parseMaybeJson = async (resp) => {
    const text = await resp.text();
    if (!text) return null;
    try { return JSON.parse(text); } catch { return text; }
  };

  const handleSaveBook = async (bookData) => {
    const method = editingBook ? 'PUT' : 'POST';
    const url = editingBook
      ? `${API_URL}${active.endpoint}/${editingBook.id}`
      : `${API_URL}${active.endpoint}`;

    const resp = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bookData)
    });

    if (!resp.ok) {
      const errBody = await parseMaybeJson(resp);
      throw new Error(typeof errBody === 'string' ? errBody : 'Save failed');
    }

    // some backends return 204 No Content on PUT
    const savedBook = resp.status === 204 ? { ...editingBook, ...bookData } : await parseMaybeJson(resp);

    if (editingBook) {
      setCache(prev => ({
        ...prev,
        [active.key]: prev[active.key].map(b => b.id === editingBook.id ? savedBook : b)
      }));
    } else {
      setCache(prev => ({
        ...prev,
        [active.key]: [...(prev[active.key] || []), savedBook]
      }));
    }
    handleCloseModal();
  };
  // -------------------------------------------------------------------

  const handleDeleteBook = async (bookId) => {
    await fetch(`${API_URL}${active.endpoint}/${bookId}`, { method: 'DELETE' });
    setCache(prev => ({
      ...prev,
      [active.key]: prev[active.key].filter(b => b.id !== bookId)
    }));
  };

  const handleMoveBook = async (book, destinationSection) => {
    const sourceSection = active.key;
    const bookToMove = cache[sourceSection].find(b => b.id === book.id);

    setCache(prev => ({
      ...prev,
      [sourceSection]: prev[sourceSection].filter(b => b.id !== book.id),
      [destinationSection]: [...(prev[destinationSection] || []), bookToMove]
    }));

    await fetch(`${API_URL}/api/move-book`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookId: book.id, sourceSection, destinationSection })
    });
  };

  const handleUpdateBookStatus = async (book, field, value) => {
    const updatedBook = { ...book, [field]: value };
    setCache(prev => ({
      ...prev,
      [active.key]: prev[active.key].map(b => b.id === book.id ? updatedBook : b)
    }));

    await fetch(`${API_URL}${active.endpoint}/${book.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value })
    });
  };

  const rawData = cache[active.key] || [];

  // Unique genres (normalize to names)
  const allGenres = useMemo(() => {
    const set = new Set();
    rawData.forEach(b => {
      if (Array.isArray(b.genres)) {
        b.genres.forEach(g => set.add(typeof g === 'string' ? g : g?.name));
      } else if (b.genre) {
        set.add(typeof b.genre === 'string' ? b.genre : b.genre?.name);
      }
    });
    return [...set].filter(Boolean).sort((a, b) => a.localeCompare(b));
  }, [rawData]);

  // Filtered
  const filtered = useMemo(() => {
    return rawData.filter(b => {
      const isRead = !!b.isRead;
      const isTbr = b.isTbr ?? !isRead;

      if (statusFilter === 'tbr' && !isTbr) return false;
      if (statusFilter === 'read' && !isRead) return false;

      if (spiceFilter !== 'any') {
        const lvl = Number(b.spice_level ?? 0);
        if (lvl !== Number(spiceFilter)) return false;
      }

      if (selectedGenres.size > 0) {
        const names = Array.isArray(b.genres)
          ? b.genres.map(g => (typeof g === 'string' ? g : g?.name)).filter(Boolean)
          : b.genre ? [typeof b.genre === 'string' ? b.genre : b.genre?.name] : [];
        if (!names.some(n => selectedGenres.has(n))) return false;
      }
      return true;
    });
  }, [rawData, statusFilter, spiceFilter, selectedGenres]);

  // Sorted (optional TBR first)
  const data = useMemo(() => {
    if (!tbrFirst) return filtered;
    const arr = [...filtered];
    return arr.sort((a, b) => {
      const aRead = !!a.isRead, bRead = !!b.isRead;
      const aTbr  = a.isTbr ?? !aRead;
      const bTbr  = b.isTbr ?? !bRead;
      if (aTbr !== bTbr) return aTbr ? -1 : 1;
      if (aRead !== bRead) return aRead ? 1 : -1;
      return Number(b.spice_level ?? 0) - Number(a.spice_level ?? 0);
    });
  }, [filtered, tbrFirst]);

  const pill = (is) =>
    `px-3 py-1 rounded-full border text-sm transition ${is ? 'bg-gold-ritual text-raven-ink border-gold-ritual' : 'btn-phantom'}`;

  return (
    <div className="min-h-dvh p-6 max-w-6xl mx-auto bg-paper bg-opacity-90">
      <header className="relative">
        <div className="absolute top-0 right-0 -z-10">
          <img src="https://i.imgur.com/c1iP4sD.png" alt="Rose" className="w-64 h-64 object-contain opacity-20" />
        </div>
        <h1 className="text-5xl font-bold">Moody tales. Bold hearts.</h1>
        <p className="mt-3 text-white/80 text-lg">Dark romance, romantasy, and neon noir.</p>

        <div className="mt-8 border-b border-white/10 flex gap-2">
          {tabs.map(t => (
            <button
              key={t.key}
              className={`px-4 py-2 text-lg rounded-t-[14px] hover:text-white transition-colors duration-300 ${active.key === t.key ? 'text-white border-b-2 border-gold-ritual' : 'text-white/70'}`}
              onClick={() => handleTabClick(t)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </header>

      {/* Filters (collapsible) */}
      <div className="mt-4">
        <button
          className="btn btn-phantom"
          onClick={() => setFiltersOpen((v) => !v)}
          aria-expanded={filtersOpen}
          aria-controls="filters-panel"
        >
          {filtersOpen ? 'Hide Filters' : 'Show Filters'}
        </button>

        {filtersOpen && (
          <div id="filters-panel" className="mt-4 p-4 rounded-[14px] bg-raven-ink/60 border border-white/10 space-y-4">
            {/* Status */}
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-white/70 text-sm">Status</span>
              <button className={pill(statusFilter === 'any')} onClick={() => setStatusFilter('any')}>Any</button>
              <button className={`${pill(statusFilter === 'tbr')} ml-1 ring-1 ring-gold-ritual/40`} onClick={() => setStatusFilter('tbr')}>TBR</button>
              <button className={`${pill(statusFilter === 'read')} ml-1`} onClick={() => setStatusFilter('read')}>Read</button>
            </div>

            {/* Spice */}
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-white/70 text-sm">Spice</span>
              <button className={pill(spiceFilter === 'any')} onClick={() => setSpiceFilter('any')}>Any</button>
              {[0,1,2,3,4,5].map(n => (
                <button key={n} className={pill(spiceFilter === n)} onClick={() => setSpiceFilter(n)} title={`Spice ${n}`}>
                  {spiceEmojis(n) || '0'}
                </button>
              ))}
            </div>

            {/* Genres */}
            <div className="flex items-start gap-3 flex-wrap">
              <span className="text-white/70 text-sm mt-1">Genres</span>
              {allGenres.map(g => {
                const isOn = selectedGenres.has(g);
                return (
                  <button
                    key={g}
                    className={pill(isOn)}
                    onClick={() => {
                      const next = new Set(selectedGenres);
                      isOn ? next.delete(g) : next.add(g);
                      setSelectedGenres(next);
                    }}
                  >
                    {g}
                  </button>
                );
              })}
              <button className="ml-2 btn btn-phantom" onClick={() => setSelectedGenres(new Set())}>Reset</button>
            </div>

            {/* Order */}
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-white/70 text-sm">Order</span>
              <button className={pill(!tbrFirst)} onClick={() => setTbrFirst(false)}>Default</button>
              <button className={pill(tbrFirst)} onClick={() => setTbrFirst(true)}>TBR First</button>
            </div>
          </div>
        )}
      </div>

      {/* Cards */}
      <section className="mt-6">
        {loading ? (
          <div className="text-white/70">Loading…</div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {data.map((b) => (
              <article key={b.id} className="card bg-plum-velvet bg-opacity-20 border border-gold-ritual/20 shadow-lg transition-all duration-300 hover:border-gold-ritual/50 hover:shadow-glow relative">
                <div className="absolute top-2 right-2 flex gap-2 z-10">
                  <button onClick={() => handleUpdateBookStatus(b, 'isRead', !b.isRead)} className={`btn text-xs px-2 py-1 ${b.isRead ? 'bg-gold-ritual text-raven-ink border-transparent' : 'btn-phantom'}`}>Read</button>
                  <button onClick={() => handleUpdateBookStatus(b, 'isTbr', !b.isTbr)} className={`btn text-xs px-2 py-1 ${b.isTbr ? 'bg-violet-phantom text-white border-transparent' : 'btn-phantom'}`}>TBR</button>
                </div>

                <img src={b.cover_image_url} alt={b.title} className="w-full h-auto rounded-t-[14px]" />
                <div className="p-4">
                  <h3 className="font-bold text-2xl text-gold-ritual">{b.title}</h3>
                  {b.author && <p className="text-white/80">{b.author}</p>}

                  <div className="mt-3">
                    <Badge kind="rose">
                      <span aria-label={`Spice ${b.spice_level ?? 0}`}>{spiceEmojis(b.spice_level) || '0'}</span>
                    </Badge>
                  </div>

                  <div className="mt-3 text-sm text-white/70 space-y-1">
                    {b.release_date && <div>Release: {b.release_date}</div>}
                    {b.notes && <div className="text-white/60">{b.notes}</div>}
                  </div>

                  <div className="mt-4 flex gap-2 relative items-center">
                    <button onClick={() => handleOpenModal(b)} className="btn bg-plum-velvet text-white hover:bg-plum-velvet/80">Edit</button>
                    <button onClick={() => handleDeleteBook(b.id)} className="btn btn-phantom">Delete</button>
                    <div className="relative">
                      <button onClick={() => setMoveMenuOpenFor(moveMenuOpenFor === b.id ? null : b.id)} className="btn btn-phantom">Move</button>
                      {moveMenuOpenFor === b.id && (
                        <div className="absolute top-full right-0 mt-2 w-48 bg-raven-ink rounded-[14px] shadow-lg z-10">
                          {tabs.filter(t => t.key !== active.key).map(t => (
                            <button key={t.key} onClick={() => { handleMoveBook(b, t.key); setMoveMenuOpenFor(null); }} className="w-full text-left px-4 py-2 text-sm text-white hover:bg-plum-velvet">
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

      <button onClick={() => handleOpenModal()} className="fixed bottom-8 right-8 w-16 h-16 bg-gold-ritual text-raven-ink rounded-full shadow-lg flex items-center justify-center text-4xl font-bold">
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
