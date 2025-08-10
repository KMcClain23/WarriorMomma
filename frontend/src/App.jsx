import { useEffect, useState, useMemo } from 'react';
import BookModal from './BookModal';

const API_URL = import.meta.env.VITE_API_BASE_URL;

const tabs = [
  { key: 'library', label: 'Collection', endpoint: '/api/library' },
  { key: 'recommended', label: 'Recommended', endpoint: '/api/recommended' },
  { key: 'upcoming', label: 'Upcoming', endpoint: '/api/upcoming' }
];

// HELPER FUNCTION: To convert spice level text to emojis
const renderSpiceEmojis = (spiceLevel) => {
  const spiceMap = {
    "Low": 1,
    "Medium": 2,
    "Medium-High": 3,
    "High": 4,
    "Extra High": 5
  };
  const count = spiceMap[spiceLevel] || 0;
  if (count === 0) return null;
  return <div className="text-lg">{'🌶️'.repeat(count)}</div>;
};

export default function App() {
  const [active, setActive] = useState(tabs[0]);
  const [cache, setCache] = useState({});
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBook, setEditingBook] = useState(null);
  const [moveMenuOpenFor, setMoveMenuOpenFor] = useState(null);

  // --- STATE FOR FILTERS ---
  const [isFilterVisible, setIsFilterVisible] = useState(true);
  const [readStatusFilter, setReadStatusFilter] = useState('tbr'); // 'tbr' or 'read'
  const [selectedGenres, setSelectedGenres] = useState([]);
  const [spiceLevelFilter, setSpiceLevelFilter] = useState('Any'); // 'Any' or a number

  useEffect(() => {
    if (!cache[active.key]) {
      setLoading(true);
      fetch(`${API_URL}${active.endpoint}`)
        .then((r) => r.json())
        .then((data) => {
          setCache((prev) => ({ ...prev, [active.key]: data }));
        })
        .catch(error => console.error("Failed to fetch books:", error))
        .finally(() => setLoading(false));
    }
  }, [active, cache]);

  const books = cache[active.key] || [];

  // --- FILTERING LOGIC ---
  const allGenres = useMemo(() => {
    const genreSet = new Set();
    books.forEach(book => {
      book.genres.forEach(genre => genreSet.add(genre.name));
    });
    return Array.from(genreSet).sort();
  }, [books]);

  const filteredBooks = useMemo(() => {
    return books.filter(book => {
      // Read/TBR Filter
      const readStatusMatch = readStatusFilter === 'read' ? book.isRead : book.isTbr;

      // Genre Filter
      const genreMatch = selectedGenres.length === 0 || 
        selectedGenres.every(selGenre => book.genres.some(bookGenre => bookGenre.name === selGenre));
        
      // Spice Level Filter
      const spiceMap = { "Low": 1, "Medium": 2, "Medium-High": 3, "High": 4, "Extra High": 5 };
      const spiceMatch = spiceLevelFilter === 'Any' || 
        (spiceMap[book.spice_level] >= parseInt(spiceLevelFilter));
        
      return readStatusMatch && genreMatch && spiceMatch;
    });
  }, [books, readStatusFilter, selectedGenres, spiceLevelFilter]);

  const handleGenreChange = (genre) => {
    setSelectedGenres(prev => 
      prev.includes(genre) ? prev.filter(g => g !== genre) : [...prev, genre]
    );
  };
  
  const handleTabClick = (tab) => {
    setActive(tab);
  };
  
  const handleOpenModal = (book = null) => {
    setEditingBook(book);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setEditingBook(null);
    setIsModalOpen(false);
  };

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

      {/* --- COLLAPSIBLE FILTER SECTION --- */}
      <section className="mt-6">
        <button onClick={() => setIsFilterVisible(!isFilterVisible)} className="btn btn-phantom mb-4">
          {isFilterVisible ? 'Hide Filters' : 'Show Filters'}
        </button>
        {isFilterVisible && (
          <div className="p-4 bg-plum-velvet/20 rounded-[14px] border border-white/10 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Read Status Filter */}
              <div>
                <h4 className="font-bold text-white/90 mb-2">Status</h4>
                <div className="flex gap-2">
                  <button onClick={() => setReadStatusFilter('tbr')} className={`btn text-sm w-full ${readStatusFilter === 'tbr' ? 'btn-primary' : 'btn-phantom'}`}>To Be Read</button>
                  <button onClick={() => setReadStatusFilter('read')} className={`btn text-sm w-full ${readStatusFilter === 'read' ? 'btn-primary' : 'btn-phantom'}`}>Read</button>
                </div>
              </div>

              {/* Spice Level Filter */}
              <div>
                <h4 className="font-bold text-white/90 mb-2">Spice Level (or higher)</h4>
                <select value={spiceLevelFilter} onChange={(e) => setSpiceLevelFilter(e.target.value)} className="select w-full">
                  <option>Any</option>
                  <option value="1">🌶️ Low</option>
                  <option value="2">🌶️🌶️ Medium</option>
                  <option value="3">🌶️🌶️🌶️ Medium-High</option>
                  <option value="4">🌶️🌶️🌶️🌶️ High</option>
                  <option value="5">🌶️🌶️🌶️🌶️🌶️ Extra High</option>
                </select>
              </div>
            </div>
            
            {/* Genre Filter */}
            <div className="mt-4">
              <h4 className="font-bold text-white/90 mb-2">Filter by genre</h4>
              <div className="flex flex-wrap gap-2">
                {allGenres.map(genre => (
                  <label key={genre} className="flex items-center gap-2 cursor-pointer p-2 rounded-md hover:bg-white/10">
                    <input 
                      type="checkbox" 
                      checked={selectedGenres.includes(genre)}
                      onChange={() => handleGenreChange(genre)}
                      className="checkbox"
                    />
                    <span className="text-white/80">{genre}</span>
                  </label>
                ))}
              </div>
            </div>
            <button onClick={() => { setSelectedGenres([]); setSpiceLevelFilter('Any'); }} className="btn btn-phantom text-sm mt-4">Reset</button>
          </div>
        )}
      </section>


      {/* --- GRID --- */}
      <section>
        {loading ? (
          <div className="text-white/70">Loading…</div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBooks.map((b) => (
              <article key={b.id} className={`card bg-plum-velvet bg-opacity-20 border border-gold-ritual/20 shadow-lg transition-all duration-300 hover:border-gold-ritual/50 hover:shadow-glow relative`}>
                <div className="absolute top-2 right-2 flex gap-2 z-10">
                  <button className={`btn text-xs px-2 py-1 ${b.isRead ? 'bg-gold-ritual text-raven-ink border-transparent' : 'btn-phantom'}`}>Read</button>
                  <button className={`btn text-xs px-2 py-1 ${b.isTbr ? 'bg-violet-phantom text-white border-transparent' : 'btn-phantom'}`}>TBR</button>
                </div>
                <img src={b.cover_image_url} alt={b.title} className="w-full h-auto rounded-t-[14px]" />
                <div className="p-4">
                  <h3 className="font-bold text-2xl text-gold-ritual">{b.title}</h3>
                  {b.author && <p className="text-white/80">{b.author}</p>}
                  
                  {/* Show spice emojis instead of genres */}
                  <div className="mt-3 flex gap-2 flex-wrap">
                    {renderSpiceEmojis(b.spice_level)}
                  </div>
                  
                  <div className="mt-3 text-sm text-white/70 space-y-1">
                    {b.release_date && <div>Release: {b.release_date}</div>}
                    {b.notes && <div className="text-white/60">{b.notes}</div>}
                  </div>

                  <div className="mt-4 flex gap-2 relative items-center">
                    <button onClick={() => handleOpenModal(b)} className="btn bg-plum-velvet text-white hover:bg-plum-velvet/80">Edit</button>
                    <button className="btn btn-phantom">Delete</button>
                    <div className="relative">
                      <button onClick={() => setMoveMenuOpenFor(moveMenuOpenFor === b.id ? null : b.id)} className="btn btn-phantom">Move</button>
                      {moveMenuOpenFor === b.id && (
                        <div className="absolute top-full right-0 mt-2 w-48 bg-raven-ink rounded-[14px] shadow-lg z-10">
                          {tabs.filter(t => t.key !== active.key).map(t => (
                            <button
                              key={t.key}
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

      {/* Add book button */}
      <button
        onClick={() => handleOpenModal()}
        className="fixed bottom-8 right-8 w-16 h-16 bg-gold-ritual text-raven-ink rounded-full shadow-lg flex items-center justify-center text-4xl font-bold"
      >
        +
      </button>

      {/* Modal logic */}
      {isModalOpen && (
        <BookModal
          book={editingBook}
          onClose={handleCloseModal}
          onSave={() => {}} // Placeholder for save functionality
        />
      )}
    </div>
  );
}