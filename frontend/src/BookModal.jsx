import { useEffect, useRef, useState } from 'react';

export default function BookModal({ book, onClose, onSave }) {
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [genresText, setGenresText] = useState('');
  const [spice, setSpice] = useState(0);
  const [releaseDate, setReleaseDate] = useState('');
  const [notes, setNotes] = useState('');
  const dialogRef = useRef(null);

  useEffect(() => {
    if (book) {
      setTitle(book.title || '');
      setAuthor(book.author || '');
      const g = Array.isArray(book.genres)
        ? book.genres.join(', ')
        : (book.genre || book['genre/theme'] || book['genre/category'] || '');
      setGenresText(g);

      const raw =
        book.spice ?? book.spice_level ?? book.spiceLevel ?? book.spice_rating ?? 0;
      const toNum = v => {
        if (typeof v === 'number' && Number.isFinite(v)) return v;
        const s = String(v ?? '').toLowerCase();
        if (/\bhigh\b/.test(s)) return 5;
        if (/\bmedium\b/.test(s)) return 3;
        if (/\blow\b/.test(s)) return 1;
        const n = parseInt(s, 10);
        return Number.isFinite(n) ? n : 0;
      };
      setSpice(Math.max(0, Math.min(5, toNum(raw))));
      setReleaseDate(book.release_date || book.releaseDate || '');
      setNotes(book.notes || '');
    } else {
      setTitle(''); setAuthor(''); setGenresText(''); setSpice(0); setReleaseDate(''); setNotes('');
    }
  }, [book]);

  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleBackdrop = e => { if (e.target === dialogRef.current) onClose(); };

  const handleSubmit = e => {
    e.preventDefault();
    const genres = genresText.split(',').map(s => s.trim()).filter(Boolean);
    onSave({ title, author, genres, spice: Number(spice), release_date: releaseDate, notes });
  };

  const labelCls = "text-sm text-white/80";
  const inputCls = "w-full rounded-xl bg-black/20 ring-1 ring-white/10 px-3 py-3 focus:ring-2 focus:ring-[var(--gold-ritual)]";

  return (
    <div
      ref={dialogRef}
      onMouseDown={handleBackdrop}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60"
    >
      <div
        onMouseDown={e => e.stopPropagation()}
        className="w-full h-[100dvh] sm:h-auto sm:max-h-[90vh] sm:max-w-2xl bg-[var(--raven-ink)] text-white ring-1 ring-white/10 shadow-2xl rounded-none sm:rounded-2xl flex flex-col"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 px-4 sm:px-6 py-4 border-b border-white/10 bg-[var(--raven-ink)] pt-[max(1rem,env(safe-area-inset-top))]">
          <div className="flex items-center justify-between">
            <h2 className="text-xl sm:text-2xl font-semibold">{book ? 'Edit Book' : 'Add Book'}</h2>
            <button onClick={onClose} className="btn btn-phantom px-3 py-2">Close</button>
          </div>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 grid gap-4">
          <label className="grid gap-2">
            <span className={labelCls}>Title</span>
            <input className={inputCls} value={title} onChange={e => setTitle(e.target.value)} required />
          </label>

          <label className="grid gap-2">
            <span className={labelCls}>Author</span>
            <input className={inputCls} value={author} onChange={e => setAuthor(e.target.value)} />
          </label>

          <label className="grid gap-2">
            <span className={labelCls}>Genres (comma separated)</span>
            <input className={inputCls} value={genresText} onChange={e => setGenresText(e.target.value)} placeholder="Romantasy, Dark Romance" />
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="grid gap-2">
              <span className={labelCls}>Spice</span>
              <select
                className="rounded-xl bg-black/20 ring-1 ring-white/10 px-3 py-3 focus:ring-2 focus:ring-[var(--gold-ritual)]"
                value={spice}
                onChange={e => setSpice(Number(e.target.value))}
              >
                <option value={0}>0</option>
                <option value={1}>1 🌶️</option>
                <option value={2}>2 🌶️</option>
                <option value={3}>3 🌶️</option>
                <option value={4}>4 🌶️</option>
                <option value={5}>5 🌶️</option>
              </select>
            </label>

            <label className="grid gap-2">
              <span className={labelCls}>Release date</span>
              <input className={inputCls} value={releaseDate} onChange={e => setReleaseDate(e.target.value)} placeholder="YYYY-MM-DD" />
            </label>
          </div>

          <label className="grid gap-2">
            <span className={labelCls}>Notes</span>
            <textarea className={`${inputCls} min-h-32 resize-y`} value={notes} onChange={e => setNotes(e.target.value)} />
          </label>
        </form>

        {/* Footer */}
        <div className="sticky bottom-0 z-10 px-4 sm:px-6 py-3 border-t border-white/10 bg-[var(--raven-ink)] pb-[max(0.75rem,env(safe-area-inset-bottom))] flex justify-end gap-2">
          <button type="button" className="btn btn-phantom px-4 py-3" onClick={onClose}>Cancel</button>
          <button type="submit" formAction="submit" onClick={e => e.currentTarget.closest('form')?.requestSubmit()} className="btn px-5 py-3 bg-[var(--gold-ritual)] text-[var(--raven-ink)] hover:opacity-90 rounded-xl">
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
