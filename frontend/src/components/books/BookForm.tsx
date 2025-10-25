import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

interface BookFormProps {
  bookId?: string;
  onSuccess: () => void;
  onCancel: () => void;
}

interface BookFormData {
  title: string;
  author: string;
  isbn?: string;
  genre?: string;
  tags?: string[];
}

export function BookForm({ bookId, onSuccess, onCancel }: BookFormProps) {
  const [formData, setFormData] = useState<BookFormData>({
    title: '',
    author: '',
    isbn: '',
    genre: '',
    tags: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (bookId) {
      loadBook();
    }
  }, [bookId]);

  const loadBook = async () => {
    try {
      const book = await api.getBook(bookId!);
      setFormData({
        title: book.title,
        author: book.author,
        isbn: book.isbn || '',
        genre: book.genre || '',
        tags: book.tags || [],
      });
    } catch (err) {
      setError('Failed to load book');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (bookId) {
        await api.updateBook(bookId, formData);
      } else {
        await api.createBook(formData);
      }
      onSuccess();
    } catch (err) {
      setError('Failed to save book');
    } finally {
      setLoading(false);
    }
  };

  const handleTagsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const tags = e.target.value.split(',').map(tag => tag.trim()).filter(Boolean);
    setFormData(prev => ({ ...prev, tags }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 text-red-500 p-3 rounded">
          {error}
        </div>
      )}
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700">
          Title *
        </label>
        <input
          type="text"
          id="title"
          value={formData.title}
          onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          required
        />
      </div>
      <div>
        <label htmlFor="author" className="block text-sm font-medium text-gray-700">
          Author *
        </label>
        <input
          type="text"
          id="author"
          value={formData.author}
          onChange={(e) => setFormData(prev => ({ ...prev, author: e.target.value }))}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          required
        />
      </div>
      <div>
        <label htmlFor="isbn" className="block text-sm font-medium text-gray-700">
          ISBN
        </label>
        <input
          type="text"
          id="isbn"
          value={formData.isbn}
          onChange={(e) => setFormData(prev => ({ ...prev, isbn: e.target.value }))}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
        />
      </div>
      <div>
        <label htmlFor="genre" className="block text-sm font-medium text-gray-700">
          Genre
        </label>
        <input
          type="text"
          id="genre"
          value={formData.genre}
          onChange={(e) => setFormData(prev => ({ ...prev, genre: e.target.value }))}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
        />
      </div>
      <div>
        <label htmlFor="tags" className="block text-sm font-medium text-gray-700">
          Tags (comma-separated)
        </label>
        <input
          type="text"
          id="tags"
          value={formData.tags?.join(', ')}
          onChange={handleTagsChange}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          placeholder="fiction, mystery, favorite"
        />
      </div>
      <div className="flex justify-end space-x-2">
        <button
          type="button"
          onClick={onCancel}
          className="py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          {loading ? 'Saving...' : (bookId ? 'Update' : 'Create')}
        </button>
      </div>
    </form>
  );
}
