import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import axios from 'axios';
import Layout from '../src/components/layout/Layout.js';
import { useAuth } from '../src/contexts/AuthContext';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export default function SearchPage() {
  const router = useRouter();
  const { q } = router.query;
  const { user } = useAuth();
  const [bookResults, setBookResults] = useState([]);
  const [memberResults, setMemberResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!q) {
      setLoading(false);
      return;
    }

    const fetchResults = async () => {
      try {
        setLoading(true);
        setError(null);
        const token = localStorage.getItem('token');
        
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        
        // Search books (public endpoint)
        try {
          const booksResponse = await axios.get(`${API_BASE_URL}/books/search?q=${q}`, { headers });
          setBookResults(Array.isArray(booksResponse.data) ? booksResponse.data : []);
        } catch (err) {
          console.error('Error fetching books:', err);
          setBookResults([]);
        }

        // Search members (only if authenticated and admin)
        if (token && user?.role === 'admin') {
          try {
            const searchResponse = await axios.get(`${API_BASE_URL}/search?q=${q}&type=members`, { headers });
            setMemberResults(Array.isArray(searchResponse.data) ? searchResponse.data : []);
          } catch (err) {
            console.error('Error fetching members:', err);
            setMemberResults([]);
          }
        } else {
          setMemberResults([]);
        }
      } catch (err) {
        console.error('Search error:', err);
        setError('Failed to fetch search results');
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [q, user]);

  const renderBookCard = (book) => (
    <div key={book.id} className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 overflow-hidden border border-gray-200">
      <div className="p-6">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">{book.title}</h3>
            <p className="text-sm text-gray-600 mb-1">by {book.author}</p>
            <p className="text-sm text-gray-500">ISBN: {book.isbn || 'N/A'}</p>
          </div>
          <span className="ml-2 text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">Book</span>
        </div>
        <div className="mt-4 flex items-center justify-between">
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
            book.status === 'available' || !book.status
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}>
            {book.status || 'available'}
          </span>
          <Link
            href={`/books/${book.id}`}
            className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
          >
            View Details →
          </Link>
        </div>
      </div>
    </div>
  );

  const renderMemberCard = (member) => (
    <div key={member.id} className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 overflow-hidden border border-gray-200">
      <div className="p-6">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">{member.name}</h3>
            <p className="text-sm text-gray-600 mb-1">{member.email}</p>
            <p className="text-sm text-gray-500">Role: {member.role || 'member'}</p>
          </div>
          <span className="ml-2 text-xs font-medium text-purple-600 bg-purple-50 px-2 py-1 rounded">Member</span>
        </div>
        <div className="mt-4">
          <Link
            href={`/members`}
            className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
          >
            View Details →
          </Link>
        </div>
      </div>
    </div>
  );

  return (
    <Layout>
      <div className="py-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          Search Results for "{q}"
        </h1>

        {loading && (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6">
            {error}
          </div>
        )}

        {!loading && !error && (
          <>
            {/* Books Section */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                  <svg className="h-5 w-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  Books
                  {bookResults.length > 0 && (
                    <span className="ml-2 text-sm font-normal text-gray-500">({bookResults.length} found)</span>
                  )}
                </h2>
              </div>
              
              {bookResults.length === 0 ? (
                <div className="bg-gray-50 rounded-lg border border-gray-200 p-8 text-center">
                  <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  <p className="text-gray-500 text-lg mb-2">No books found</p>
                  <p className="text-gray-400 text-sm">Try searching with different keywords</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {bookResults.map(renderBookCard)}
                </div>
              )}
            </div>

            {/* Members Section (only for admins) */}
            {user?.role === 'admin' && (
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                    <svg className="h-5 w-5 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.196-2.133M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.196-2.133M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    Members
                    {memberResults.length > 0 && (
                      <span className="ml-2 text-sm font-normal text-gray-500">({memberResults.length} found)</span>
                    )}
                  </h2>
                </div>
                
                {memberResults.length === 0 ? (
                  <div className="bg-gray-50 rounded-lg border border-gray-200 p-8 text-center">
                    <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.196-2.133M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.196-2.133M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <p className="text-gray-500 text-lg mb-2">No members found</p>
                    <p className="text-gray-400 text-sm">Try searching with different keywords</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {memberResults.map(renderMemberCard)}
                  </div>
                )}
              </div>
            )}

            {/* No results at all */}
            {!loading && bookResults.length === 0 && (!user || user.role !== 'admin' || memberResults.length === 0) && (
              <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-gray-500 text-lg mb-2">No results found for "{q}"</p>
                <p className="text-gray-400 text-sm mb-6">Try searching with different keywords</p>
                <Link href="/request-book" className="inline-block bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 transition-colors">
                  Request a Book
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
