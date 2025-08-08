// frontend/src/BookModal.jsx
import { useEffect, useState } from 'react';

export default function BookModal({ book, onClose, onSave }) {
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    genres: [],
    spice_level: '',
    release_date: '',
    notes: ''
  });

  useEffect(() => {
    if (book) {
      // Normalize genre data into an array
      let genresArray = [];
      if (Array.isArray(book.genres)) {
        genresArray = book.genres;
      } else if (book.genre) {
        genresArray = [book.genre];
      } else if (book['genre/theme']) {
        genresArray = [book['genre/theme']];
      } else if (book['genre/category']) {
        genresArray = [book['genre/category']];
      }

      setFormData({
        title: book.title || '',
        author: book.author || '',
        genres: genresArray,
        spice_level: book.spice_level || '',
        release_date: book.release_date || '',
        notes: book.notes || ''
      });
    }
  }, [book]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleGenreChange = (e) => {
    const { value } = e.target;
    setFormData((prev) => ({ ...prev, genres: value.split(',').map(g => g.trim()) }));
  };

  const handleSave = () => {
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 animate-velvetFade">
      <div className="bg-raven-ink p-8 rounded-[14px] shadow-lg w-full max-w-md">
        <h2 className="text-2xl font-bold text-gold-ritual mb-4">{book ? 'Edit Book' : 'Add Book'}</h2>
        <div className="space-y-4">
          <input type="text" name="title" value={formData.title} onChange={handleChange} placeholder="Title" className="w-full p-2 rounded-[14px] bg-paper border border-gold-ritual/20" />
          <input type="text" name="author" value={formData.author} onChange={handleChange} placeholder="Author" className="w-full p-2 rounded-[14px] bg-paper border border-gold-ritual/20" />
          <input type="text" name="genres" value={formData.genres.join(', ')} onChange={handleGenreChange} placeholder="Genres (comma-separated)" className="w-full p-2 rounded-[14px] bg-paper border border-gold-ritual/20" />
          <input type="text" name="spice_level" value={formData.spice_level} onChange={handleChange} placeholder="Spice Level" className="w-full p-2 rounded-[14px] bg-paper border border-gold-ritual/20" />
          <input type="text" name="release_date" value={formData.release_date} onChange={handleChange} placeholder="Release Date" className="w-full p-2 rounded-[14px] bg-paper border border-gold-ritual/20" />
          <textarea name="notes" value={formData.notes} onChange={handleChange} placeholder="Notes" className="w-full p-2 rounded-[14px] bg-paper border border-gold-ritual/20"></textarea>
        </div>
        <div className="mt-6 flex justify-end gap-4">
          <button onClick={onClose} className="btn btn-phantom">Cancel</button>
          <button onClick={handleSave} className="btn bg-gold-ritual text-raven-ink hover:bg-gold-ritual/80">Save</button>
        </div>
      </div>
    </div>
  );
}
