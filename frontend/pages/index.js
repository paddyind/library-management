import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export default function WelcomePage() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredBooks, setFilteredBooks] = useState([]);
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'top', 'recent'
  const router = useRouter();
  
  // Use ref to prevent duplicate fetches (React StrictMode causes double renders in dev)
  const fetchRef = useRef(false);
  const hasFetchedRef = useRef(false);

  useEffect(() => {
    // Fetch books only once on component mount (even with React StrictMode double render)
    if (!hasFetchedRef.current && !fetchRef.current) {
      fetchBooks();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array - only fetch once

  useEffect(() => {
    if (searchQuery) {
      const filtered = books.filter(book =>
        book.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        book.author?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        book.isbn?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredBooks(filtered);
    } else {
      setFilteredBooks(books);
    }
  }, [searchQuery, books]);

  const fetchBooks = async () => {
    // Prevent multiple simultaneous fetches (React StrictMode causes double renders)
    if (fetchRef.current || hasFetchedRef.current) {
      console.log('⏭️ [HomePage] Skipping duplicate fetch (already in progress or completed)');
      return;
    }
    
    fetchRef.current = true;
    
    try {
      setLoading(true);
      const apiUrl = `${API_BASE_URL}/books`;
      console.log('📚 [HomePage] Fetching books from:', apiUrl);
      
      // Try to fetch books without authentication (public endpoint)
      const response = await axios.get(apiUrl, {
        timeout: 15000, // 15 second timeout
        headers: {
          'Content-Type': 'application/json',
        },
        // Add response interceptor to handle network errors
        validateStatus: (status) => status < 500, // Don't throw on 4xx
      });
      
      if (response.status === 200 && response.data) {
        console.log('✅ [HomePage] Books fetched successfully:', response.data?.length || 0, 'books');
        
        const booksData = Array.isArray(response.data) ? response.data : [];
        
        // Map books to ensure they have the expected structure
        const mappedBooks = booksData.map(book => ({
          id: book.id,
          title: book.title || 'Untitled',
          author: book.author || 'Unknown Author',
          isbn: book.isbn || '',
          available: book.status === 'available' || book.status === undefined || book.available === true,
        }));
        
        setBooks(mappedBooks);
        setFilteredBooks(mappedBooks);
        hasFetchedRef.current = true; // Mark as successfully fetched
      } else {
        console.warn('⚠️ [HomePage] Unexpected response:', response.status, response.data);
        setBooks([]);
        setFilteredBooks([]);
      }
    } catch (err) {
      console.error('❌ [HomePage] Failed to fetch books:', err);
      if (err.response) {
        console.error('   Response status:', err.response.status);
        console.error('   Response data:', err.response.data);
        console.error('   Response headers:', err.response.headers);
      } else if (err.request) {
        console.error('   ❌ Network error - no response received from server');
        console.error('   Request URL:', err.config?.url);
        console.error('   💡 Check if backend is running and accessible at:', API_BASE_URL);
        console.error('   💡 In Docker, ensure ports are correctly mapped and CORS is configured');
      } else {
        console.error('   Error:', err.message);
      }
      
      // Show empty state instead of sample books to encourage API fix
      setBooks([]);
      setFilteredBooks([]);
    } finally {
      setLoading(false);
      fetchRef.current = false; // Reset fetch flag
    }
  };

  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
  };

  const getDisplayBooks = () => {
    if (searchQuery) {
      return filteredBooks;
    }
    
    switch (activeTab) {
      case 'top':
        // Sort by availability and show top books
        return [...filteredBooks].sort((a, b) => b.available - a.available).slice(0, 8);
      case 'recent':
        // Show most recent books (reverse order)
        return [...filteredBooks].reverse().slice(0, 8);
      default:
        return filteredBooks;
    }
  };

  const displayBooks = getDisplayBooks();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Hero Section */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <Link href="/" className="flex items-center space-x-3">
              <svg className="h-10 w-10 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <h1 className="text-xl md:text-2xl font-bold text-gray-900">Library Management System</h1>
            </Link>
            <div className="flex items-center space-x-2 md:space-x-4">
              <Link
                href="/help"
                className="px-3 md:px-4 py-2 text-sm font-medium text-gray-700 hover:text-primary-600 transition-colors"
              >
                Help
              </Link>
              <Link
                href="/login"
                className="px-3 md:px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors shadow-sm"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="px-3 md:px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors shadow-sm"
              >
                Register
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-primary-600 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <h2 className="text-4xl font-extrabold sm:text-5xl">
            Welcome to Our Library
          </h2>
          <p className="mt-4 text-xl text-primary-100">
            Discover, borrow, and enjoy thousands of books from our collection
          </p>
          
          {/* Search Bar */}
          <div className="mt-8 max-w-xl mx-auto">
            <div className="relative">
              <input
                type="text"
                placeholder="Search books by title, author, or ISBN..."
                value={searchQuery}
                onChange={handleSearch}
                className="w-full px-6 py-4 text-gray-900 placeholder-gray-500 rounded-full border-0 focus:outline-none focus:ring-4 focus:ring-white focus:ring-opacity-50 shadow-lg text-lg"
              />
              <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Books Catalog */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <h3 className="text-2xl font-bold text-gray-900">
            {searchQuery ? `Search Results (${displayBooks.length})` : 
             activeTab === 'top' ? 'Top Books' :
             activeTab === 'recent' ? 'Recently Added' :
             'Browse All Books'}
          </h3>

          {!searchQuery && (
            <div className="flex space-x-2">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'all'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All Books
              </button>
              <button
                onClick={() => setActiveTab('top')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'top'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                ⭐ Top Books
              </button>
              <button
                onClick={() => setActiveTab('recent')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'recent'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                🆕 Recent
              </button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : displayBooks.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No books found</h3>
            <p className="mt-1 text-sm text-gray-500">Try adjusting your search query.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {displayBooks.map((book) => (
              <div
                key={book.id}
                className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300 overflow-hidden"
              >
                <div className="h-48 bg-gradient-to-br from-primary-400 to-purple-500 flex items-center justify-center">
                  <svg className="h-20 w-20 text-white opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <div className="p-6">
                  <h4 className="text-lg font-semibold text-gray-900 line-clamp-2 mb-2">
                    {book.title}
                  </h4>
                  <p className="text-sm text-gray-600 mb-1">
                    <span className="font-medium">Author:</span> {book.author || 'Unknown'}
                  </p>
                  <p className="text-xs text-gray-500 mb-4">
                    ISBN: {book.isbn || 'N/A'}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      book.available
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {book.available ? 'Available' : 'Checked Out'}
                    </span>
                    <Link
                      href="/login"
                      className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                    >
                      Borrow →
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Call to Action */}
        {!loading && displayBooks.length > 0 && (
          <div className="mt-12 text-center bg-white rounded-lg shadow-md p-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              Want to borrow a book?
            </h3>
            <p className="text-gray-600 mb-6">
              Sign in to your account or register to start borrowing books from our library.
            </p>
            <div className="flex justify-center space-x-4">
              <Link
                href="/login"
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
              >
                Register
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-gray-800 text-white mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <p className="text-gray-400">© 2025 Library Management System. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
