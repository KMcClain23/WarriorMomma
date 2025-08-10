import { useEffect, useState } from 'react';

function SpiceChips({ value, onChange }) {
  const base = 'px-3 py-2 rounded-full border text-sm transition select-none focus:outline-none focus:ring-2 focus:ring-gold-ritual/60';
  const active = 'bg-gold-ritual text-raven-ink border-gold-ritual';
  const idle = 'btn-phantom';
  const emojis = (n) => '🌶️'.repeat(n);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {[0,1,2,3,4,5].map(n => (
        <button
          key={n}
          type="button"
          className={`${base} ${value === n ? active : idle}`}
          onClick={() => onChange(n)}
          aria-pressed={value === n}
          aria-label={`Spice ${n}`}
          title={`Spice ${n}`}
        >
          {n === 0 ? '0' : emojis(n)}
        </button>
      ))}
    </div>
  );
}

export default function BookModal({ book, onClose, onSave }) {
  const [form, setForm] = useState({
    title: '',
    author: '',
    genre: '',
    spice_level: 0,
    release_date: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!book) return;
    // Normalize genre(s) to a comma string for editing
    const genreString = Array.isArray(book.genres)
      ? book.genres.map(g => (typeof g === 'string' ? g : g?.name)).filter(Boolean).join(', ')
      : (typeof book.genre === 'string' ? book.genre : book.genre?.name) || '';

    setForm({
      title: book.title ?? '',
      author: book.author ?? '',
      genre: genreString,
      spice_level: Number(book.spice_level ?? 0),
      release_date: book.release_date ?? '',
      notes: book.notes ?? '',
    });
  }, [book]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      // Send simple fields; backend can decide whether to store `genre` or `genres`.
      await onSave({
        title: form.title,
        author: form.author,
        genre: form.genre, // simple string
        spice_level: Number(form.spice_level),
        release_date: form.release_date,
        notes: form.notes,
      });
    } catch (err) {
      setError(err?.message || 'Could not save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-xl rounded-2xl bg-raven-ink border border-white/10 shadow-xl">
        <header className="p-5 border-b border-white/10">
          <h2 className="text-2xl font-semibold">Edit Book</h2>
        </header>

        <form onSubmit={handleSave} className="p-5 space-y-4">
          <input className="w-full rounded-lg bg-black/30 border border-white/10 px-3 py-2" placeholder="Title" name="title" value={form.title} onChange={handleChange} required />
          <input className="w-full rounded-lg bg-black/30 border border-white/10 px-3 py-2" placeholder="Author" name="author" value={form.author} onChange={handleChange} />
          <input className="w-full rounded-lg bg-black/30 border border-white/10 px-3 py-2" placeholder="Genre (comma separated or single)" name="genre" value={form.genre} onChange={handleChange} />

          <div>
            <label className="block text-sm text-white/70 mb-2">Spice</label>
            <div className="flex items-center justify-between gap-4">
              <SpiceChips value={Number(form.spice_level)} onChange={(n) => setForm((f) => ({ ...f, spice_level: n }))} />
              <div className="shrink-0 px-3 py-2 rounded-full bg-rose-900/30 border border-rose-400/30" title={`Selected spice ${form.spice_level}`}>
                {Number(form.spice_level) === 0 ? '0' : '🌶️'.repeat(Number(form.spice_level))}
              </div>
            </div>
          </div>

          <input className="w-full rounded-lg bg-black/30 border border-white/10 px-3 py-2" placeholder="Release date (YYYY-MM-DD)" name="release_date" value={form.release_date} onChange={handleChange} />
          <textarea className="w-full min-h-28 rounded-lg bg-black/30 border border-white/10 px-3 py-2" placeholder="Notes" name="notes" value={form.notes} onChange={handleChange} />

          {error && <p className="text-sm text-red-300">{error}</p>}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn btn-phantom rounded-full px-4 py-2" disabled={saving}>Cancel</button>
            <button type="submit" className={`rounded-full px-4 py-2 bg-gold-ritual text-raven-ink hover:brightness-105 ${saving ? 'opacity-70 cursor-not-allowed' : ''}`} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
