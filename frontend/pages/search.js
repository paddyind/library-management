import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import axios from 'axios';
import Layout from '../src/components/layout/Layout.js';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export default function SearchPage() {
  const router = useRouter();
  const { q, type } = router.query;
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!q) return;

    const fetchResults = async () => {
      try {
        setLoading(true);
        setError(null);
        const token = localStorage.getItem('token');
        
        // Search across books based on type or all
        const endpoint = type === 'books' ? '/books/search' : '/books/search';
        const response = await axios.get(`${API_BASE_URL}${endpoint}?q=${q}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        setResults(response.data);
      } catch (err) {
        console.error('Search error:', err);
        setError('Failed to fetch search results');
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [q, type]);

  return (
    <Layout>
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">
            Search Results for "{q}"
          </h1>

          {loading && (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded relative">
              {error}
            </div>
          )}

          {!loading && !error && results.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">No results found for "{q}"</p>
              <p className="text-gray-400 mt-2">Try searching with different keywords</p>
              <div className="mt-6">
                <Link href="/request-book" className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700">
                  Request a Book
                </Link>
              </div>
            </div>
          )}

          {!loading && !error && results.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {results.map((book) => (
                <div key={book.id} className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 overflow-hidden">
                  <div className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{book.title}</h3>
                    <p className="text-sm text-gray-600 mb-2">by {book.author}</p>
                    <p className="text-sm text-gray-500 mb-4">{book.isbn}</p>
                    <div className="flex items-center justify-between">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        book.status === 'available' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {book.status}
                      </span>
                      {book.status === 'available' && (
                        <button
                          onClick={() => router.push(`/books/${book.id}`)}
                          className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                        >
                          View Details
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
