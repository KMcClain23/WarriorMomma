// frontend/src/App.jsx
import { useEffect, useState } from 'react';

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

  useEffect(() => { load(active); /* load first tab */ }, []);

  function load(tab) {
    if (cache[tab.key]) { setActive(tab); return; }
    setLoading(true);
    fetch(tab.endpoint)
      .then(r => r.json())
      .then(data => {
        setCache(prev => ({ ...prev, [tab.key]: data }));
        setActive(tab);
      })
      .finally(() => setLoading(false));
  }

  const data = cache[active.key] || [];

  return (
    <div className="min-h-dvh p-6 max-w-6xl mx-auto">
      <header>
        <h1 className="text-4xl font-semibold">Moody tales. Bold hearts.</h1>
        <p className="mt-3 text-white/80">Dark romance, romantasy, and neon noir.</p>

        <div className="mt-6 flex gap-2">
          <button className="btn btn-raven">Primary</button>
          <button className="btn btn-blood">Danger</button>
          <button className="btn btn-phantom">Ghost</button>
        </div>

        {/* Tabs */}
        <div className="mt-8 border-b border-white/10 flex gap-2">
          {tabs.map(t => (
            <button
              key={t.key}
              className={`px-3 py-2 text-sm rounded-t-[14px] hover:text-white ${
                active.key === t.key ? 'text-white border-b-2 border-[var(--accent)]' : 'text-white/70'
              }`}
              onClick={() => load(t)}
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
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.map((b, i) => (
              <article key={i} className="card p-4">
                <h3 className="font-semibold text-xl">{b.title}</h3>
                {b.author && <p className="text-white/70">{b.author}</p>}

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
                <div className="mt-4 flex gap-2">
                  <button className="btn btn-raven">Add to TBR</button>
                  <button className="btn btn-phantom">Details</button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
