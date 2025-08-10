import { useEffect, useState, useMemo } from 'react';
import BookModal from './BookModal'; // Make sure this path is correct

const API_URL = import.meta.env.VITE_API_BASE_URL;

const tabs = [
  { key: 'library', label: 'Collection', endpoint: '/api/library' },
  { key: 'recommended', label: 'Recommended', endpoint: '/api/recommended' },
  { key: 'upcoming', label: 'Upcoming', endpoint: '/api/upcoming' }
];

const renderSpiceEmojis = (spiceLevelString) => {
  const spiceMap = { "None": 0, "Low": 1, "Medium": 2, "Medium-High": 3, "High": 4, "Extra High": 5 };
  const count = spiceMap[spiceLevelString] || 0;
  if (count === 0) return null;
  return <div className="text-lg">{'🌶️'.repeat(count)}</div>;
};

export default function App() {
  const [activeTab, setActiveTab] = useState(tabs[0]);
  const [cache, setCache] = useState({});
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBook, setEditingBook] = useState(null);

  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true);
      const allData = {};
      for (const tab of tabs) {
        try {
          const response = await fetch(`${API_URL}${tab.endpoint}`);
          if (!response.ok) throw new Error(`Failed to fetch ${tab.key}`);
          allData[tab.key] = await response.json();
        } catch (error) {
          console.error(error);
          allData[tab.key] = [];
        }
      }
      setCache(allData);
      setLoading(false);
    };
    fetchAllData();
  }, []);

  const handleSaveBook = async (bookData) => {
    try {
      const method = editingBook ? 'PUT' : 'POST';
      
      // THIS IS THE FIX: Use `activeTab.endpoint` to build the correct URL
      const url = editingBook
        ? `${API_URL}${activeTab.endpoint}/${editingBook.id}`
        : `${API_URL}${activeTab.endpoint}`;

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to save book');
      }

      const savedBook = await response.json();

      setCache(prev => ({
        ...prev,
        [activeTab.key]: editingBook 
          ? prev[activeTab.key].map(b => b.id === editingBook.id ? savedBook : b)
          : [...(prev[activeTab.key] || []), savedBook]
      }));
      setIsModalOpen(false);
      setEditingBook(null);
    } catch (error) {
      console.error("Save operation failed:", error);
      alert(`Save failed: ${error.message}`);
    }
  };

  const books = cache[activeTab.key] || [];

  return (
    <div className="min-h-dvh p-6 max-w-6xl mx-auto bg-paper bg-opacity-90">
      <header className="relative">
        <h1 className="text-5xl font-bold">Moody tales. Bold hearts.</h1>
        <p className="mt-3 text-white/80 text-lg">Dark romance, romantasy, and neon noir.</p>
        <div className="mt-8 border-b border-white/10 flex gap-2">
          {tabs.map(t => (
            <button
              key={t.key}
              className={`px-4 py-2 text-lg rounded-t-[14px] hover:text-white transition-colors duration-300 ${activeTab.key === t.key ? 'text-white border-b-2 border-gold-ritual' : 'text-white/70'}`}
              onClick={() => setActiveTab(t)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </header>

      <section className="mt-6">
        {loading ? (
          <div className="text-white/70">Loading…</div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {books.map((book) => (
              <article key={book.id} className="card bg-plum-velvet bg-opacity-20 border border-gold-ritual/20 shadow-lg flex flex-col">
                <div className="relative">
                  <div className="absolute top-2 right-2 flex gap-2 z-10">
                    {book.isRead && <span className="badge-sm bg-gold-ritual text-raven-ink">Read</span>}
                    {book.isTbr && <span className="badge-sm bg-violet-phantom text-white">TBR</span>}
                  </div>
                  <img src={book.cover_image_url} alt={book.title} className="w-full h-auto rounded-t-[14px] aspect-[2/3] object-cover" />
                </div>
                <div className="p-4 flex flex-col flex-grow">
                  <h3 className="font-bold text-2xl text-gold-ritual">{book.title}</h3>
                  {book.author && <p className="text-white/80">{book.author}</p>}
                  
                  <div className="mt-3">
                    {renderSpiceEmojis(book.spice_level)}
                  </div>
                  
                  <div className="mt-3 text-sm text-white/70 space-y-1 flex-grow">
                    {book.release_date && <div>Release: {book.release_date}</div>}
                    {book.notes && <div className="text-white/60">{book.notes}</div>}
                  </div>

                  <div className="mt-4 flex gap-2 relative items-center">
                    <button onClick={() => { setEditingBook(book); setIsModalOpen(true); }} className="btn bg-plum-velvet text-white">Edit</button>
                    {/* Add Delete and Move functionality here later */}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <button onClick={() => { setEditingBook(null); setIsModalOpen(true); }} className="fixed bottom-8 right-8 w-16 h-16 bg-gold-ritual text-raven-ink rounded-full shadow-lg flex items-center justify-center text-4xl font-bold">+</button>

      {isModalOpen && (
        <BookModal
          book={editingBook}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveBook}
        />
      )}
    </div>
  );
}
