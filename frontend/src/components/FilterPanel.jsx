import { useEffect, useMemo, useState } from "react";

export default function FilterPanel({
  data,                // books in the active tab
  selectedGenres,
  setSelectedGenres,
  spiceFilter,
  setSpiceFilter,
  statusFilter,        // "any" | "read" | "tbr"
  setStatusFilter,
  clearFilters
}) {
  // Genres present in current data
  const allGenres = useMemo(() => {
    const s = new Set();
    data.forEach(b => {
      const list = Array.isArray(b.genres)
        ? b.genres
        : String(b.genre || b["genre/theme"] || b["genre/category"] || "")
            .split(",")
            .map(x => x.trim())
            .filter(Boolean);
      list.forEach(g => s.add(g));
    });
    return Array.from(s).sort();
  }, [data]);

  // 🔒 Always offer full 0..5 range (plus Any), regardless of current data
  const spiceOptions = useMemo(() => ["any", "0", "1", "2", "3", "4", "5"], []);

  // Status options present in current data
  const statusOptions = useMemo(() => {
    let hasRead = false;
    let hasTbr = false;
    for (const b of data) {
      if (b?.isRead) hasRead = true;
      if (b?.isTbr) hasTbr = true;
      if (hasRead && hasTbr) break;
    }
    const opts = ["any"];
    if (hasRead) opts.push("read");
    if (hasTbr) opts.push("tbr");
    return opts;
  }, [data]);

  // Keep selections valid when options change
  useEffect(() => {
    if (!spiceOptions.includes(spiceFilter)) setSpiceFilter("any");
  }, [spiceOptions, spiceFilter, setSpiceFilter]);

  useEffect(() => {
    if (!statusOptions.includes(statusFilter)) setStatusFilter("any");
  }, [statusOptions, statusFilter, setStatusFilter]);

  const hasActiveFilters =
    selectedGenres.size > 0 || spiceFilter !== "any" || statusFilter !== "any";
  const [expanded, setExpanded] = useState(false);

  useEffect(() => { if (hasActiveFilters) setExpanded(true); }, [hasActiveFilters]);

  const toggleGenre = (g) => {
    setSelectedGenres(prev => {
      const next = new Set(prev);
      next.has(g) ? next.delete(g) : next.add(g);
      return next;
    });
  };

  // Smooth collapse/expand
  const [contentHeight, setContentHeight] = useState(0);
  const onContentRef = (el) => {
    if (!el) return;
    const update = () => setContentHeight(el.scrollHeight);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
  };

  // Render label for spice option: "Any", "0", or chilies 🌶️ x N
  const formatSpiceLabel = (opt) => {
    if (opt === "any") return "Any";
    const n = Number(opt);
    return n === 0 ? "0" : "🌶️".repeat(n);
  };

  return (
    <section className="mt-4 sm:mt-6 rounded-2xl bg-[var(--raven-ink)] ring-1 ring-white/10">
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between px-3 sm:px-4 py-3"
      >
        <div className="text-base sm:text-sm font-semibold">Filters</div>
        <div className="flex items-center gap-3">
          {hasActiveFilters && (
            <span className="text-xs text-white/70">
              {selectedGenres.size ? `${selectedGenres.size} genres` : null}
              {selectedGenres.size && (spiceFilter !== "any" || statusFilter !== "any") ? " • " : ""}
              {spiceFilter !== "any" ? `Spice ${spiceFilter}` : null}
              {spiceFilter !== "any" && statusFilter !== "any" ? " • " : ""}
              {statusFilter !== "any" ? (statusFilter === "read" ? "Read" : "TBR") : null}
            </span>
          )}
          <svg
            className={`h-5 w-5 sm:h-4 sm:w-4 transition-transform ${expanded ? "rotate-180" : ""}`}
            viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"
          >
            <path d="M5.23 7.21a.75.75 0 011.06.02L10 11.118l3.71-3.886a.75.75 0 111.08 1.04l-4.24 4.44a.75.75 0 01-1.08 0l-4.24-4.44a.75.75 0 01.02-1.06z" />
          </svg>
        </div>
      </button>

      {/* Collapsible body */}
      <div
        style={{ maxHeight: expanded ? contentHeight : 0 }}
        className="overflow-hidden transition-[max-height] duration-300 ease-in-out"
        aria-hidden={!expanded}
      >
        <div ref={onContentRef} className="p-3 sm:p-4 grid gap-4">
          {/* Genres */}
          <div>
            <div className="mb-2 text-sm font-semibold">Filter by genre</div>
            <div className="flex flex-wrap gap-2">
              {allGenres.length > 0 ? (
                allGenres.map(g => (
                  <button
                    type="button"
                    key={g}
                    onClick={() => toggleGenre(g)}
                    className={`badge ${selectedGenres.has(g) ? "badge-gold" : "badge-steel"}`}
                    aria-pressed={selectedGenres.has(g)}
                    title={selectedGenres.has(g) ? `Remove ${g}` : `Add ${g}`}
                  >
                    {g}
                  </button>
                ))
              ) : (
                <span className="text-sm text-white/60">No genres yet</span>
              )}
            </div>
          </div>

          {/* Spice */}
          <div className="flex items-center gap-3">
            <label className="text-sm font-semibold">Spice</label>
            <select
              value={spiceFilter}
              onChange={e => { setSpiceFilter(e.target.value); setExpanded(true); }}
              className="rounded bg-white text-black ring-1 ring-white/20 px-2 py-2 text-sm"
            >
              {spiceOptions.map(opt => (
                <option key={opt} value={opt}>
                  {formatSpiceLabel(opt)}
                </option>
              ))}
            </select>
          </div>

          {/* Read / TBR */}
          <div className="flex items-center gap-3">
            <label className="text-sm font-semibold">Status</label>
            <select
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value); setExpanded(true); }}
              className="rounded bg-white text-black ring-1 ring-white/20 px-2 py-2 text-sm"
            >
              {statusOptions.map(opt => (
                <option key={opt} value={opt}>
                  {opt === "any" ? "Any" : opt === "read" ? "Read" : "TBR"}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => { clearFilters(); setExpanded(false); }}
              className="ml-auto rounded px-3 py-2 ring-1 ring-white/20 text-sm"
            >
              Reset
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
