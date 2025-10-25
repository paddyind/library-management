import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

interface Book {
  id: string;
  title: string;
  author: string;
  isbn?: string;
  coverImage?: string;
  status: 'available' | 'lent' | 'unavailable';
  tags?: string[];
}

export function BookList() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadBooks();
  }, []);

  const loadBooks = async () => {
    try {
      const data = await api.getBooks();
      setBooks(data);
    } catch (err) {
      setError('Failed to load books');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {books.map((book) => (
        <div
          key={book.id}
          className="border rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow"
        >
          {book.coverImage && (
            <img
              src={book.coverImage}
              alt={book.title}
              className="w-full h-48 object-cover rounded-md mb-4"
            />
          )}
          <h3 className="font-semibold text-lg">{book.title}</h3>
          <p className="text-gray-600">{book.author}</p>
          <div className="mt-2">
            <span
              className={`inline-block px-2 py-1 text-sm rounded ${
                book.status === 'available'
                  ? 'bg-green-100 text-green-800'
                  : book.status === 'lent'
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-red-100 text-red-800'
              }`}
            >
              {book.status}
            </span>
          </div>
          {book.tags && book.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {book.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
