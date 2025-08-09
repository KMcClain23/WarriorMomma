// frontend/src/components/Filters.jsx
import { useMemo } from "react";

export default function Filters({
  books,
  selectedGenres,
  setSelectedGenres,
  spice,
  setSpice,
  onReset
}) {
  const allGenres = useMemo(() => {
    const set = new Set();
    books.forEach(b => (b.genres || []).forEach(g => set.add(g)));
    return Array.from(set).sort();
  }, [books]);

  const toggleGenre = g => {
    const next = new Set(selectedGenres);
    next.has(g) ? next.delete(g) : next.add(g);
    setSelectedGenres(next);
  };

  return (
    <div className="mb-6 grid gap-4 rounded-2xl bg-[var(--raven-ink)] p-4 ring-1 ring-white/10">
      <div>
        <div className="mb-2 text-sm font-semibold">Filter by genre</div>
        <div className="flex flex-wrap gap-3">
          {allGenres.map(g => (
            <label key={g} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={selectedGenres.has(g)}
                onChange={() => toggleGenre(g)}
              />
              <span>{g}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <label className="text-sm font-semibold">Spice level</label>
        <select
          value={spice}
          onChange={e => setSpice(e.target.value)}
          className="rounded bg-transparent ring-1 ring-white/20 px-2 py-1 text-sm"
        >
          <option value="any">Any</option>
          <option value="0">0</option>
          <option value="1">1 🌶️</option>
          <option value="2">2 🌶️</option>
          <option value="3">3 🌶️</option>
          <option value="4">4 🌶️</option>
          <option value="5">5 🌶️</option>
        </select>

        <button
          type="button"
          onClick={onReset}
          className="ml-auto rounded px-3 py-1 ring-1 ring-white/20 text-sm"
        >
          Reset
        </button>
      </div>
    </div>
  );
}
