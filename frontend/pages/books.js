import { useState, useEffect } from 'react';
import { useAuth } from '../src/contexts/AuthContext';
import { useRouter } from 'next/router';
import Layout from '../src/components/layout/Layout.js';
import axios from 'axios';
import withAuth from '../src/components/withAuth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

function BooksPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [books, setBooks] = useState([]);
  const [myTransactions, setMyTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchBooks();
    if (user) {
      fetchMyTransactions();
    }
  }, [user]);

  const fetchBooks = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(`${API_BASE_URL}/books`);
      setBooks(response.data);
    } catch (err) {
      console.error('Error fetching books:', err);
      setError('Failed to load books');
    } finally {
      setLoading(false);
    }
  };

  const fetchMyTransactions = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      const response = await axios.get(`${API_BASE_URL}/transactions/my-transactions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMyTransactions(response.data.filter(t => !t.returnDate));
    } catch (err) {
      console.error('Error fetching transactions:', err);
    }
  };

  const handleBorrow = async (bookId) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login?redirect=/books');
        return;
      }
      
      await axios.post(`${API_BASE_URL}/transactions`, 
        { bookId, type: 'borrow' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      alert('Book borrowed successfully!');
      fetchBooks();
      fetchMyTransactions();
    } catch (err) {
      console.error('Error borrowing book:', err);
      alert(err.response?.data?.message || 'Failed to borrow book');
    }
  };

  const handleReturn = async (transactionId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`${API_BASE_URL}/transactions/${transactionId}/return`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      alert('Book returned successfully!');
      fetchBooks();
      fetchMyTransactions();
    } catch (err) {
      console.error('Error returning book:', err);
      alert(err.response?.data?.message || 'Failed to return book');
    }
  };

  const filteredBooks = books.filter(book => {
    const matchesSearch = book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         book.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         book.isbn.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === 'all' || book.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  return (
    <Layout>
      <div className="space-y-6">
        {/* My Current Books Section */}
        {user && myTransactions.length > 0 && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg shadow-md p-6 border border-blue-200">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
              <svg className="h-6 w-6 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              My Current Books ({myTransactions.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myTransactions.map((transaction) => (
                <div key={transaction.id} className="bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                  <h3 className="font-semibold text-gray-900 mb-1">{transaction.book?.title || 'Unknown'}</h3>
                  <p className="text-sm text-gray-600 mb-2">by {transaction.book?.author || 'Unknown'}</p>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">
                      Due: {new Date(transaction.dueDate).toLocaleDateString()}
                    </span>
                    <button
                      onClick={() => handleReturn(transaction.id)}
                      className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs font-medium"
                    >
                      Return
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Search and Filter Section */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search books by title, author, or ISBN..."
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
              >
                <option value="all">All Status</option>
                <option value="available">Available</option>
                <option value="borrowed">Borrowed</option>
                <option value="reserved">Reserved</option>
              </select>
            </div>
          </div>

          {/* Books Grid */}
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded relative">
              {error}
            </div>
          ) : filteredBooks.length === 0 ? (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No books found</h3>
              <p className="mt-1 text-sm text-gray-500">Try adjusting your search or filter criteria</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredBooks.map((book) => (
                <div key={book.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow duration-200">
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-lg font-semibold text-gray-900 line-clamp-2 flex-1">
                        {book.title}
                      </h3>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">by {book.author}</p>
                    <p className="text-xs text-gray-500 mb-3">ISBN: {book.isbn}</p>
                    
                    <div className="flex items-center justify-between mb-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        book.status === 'available' 
                          ? 'bg-green-100 text-green-800' 
                          : book.status === 'borrowed'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {book.status}
                      </span>
                      <span className="text-xs text-gray-500">
                        {book.availableCopies || 0} available
                      </span>
                    </div>

                    {user && book.status === 'available' && (
                      <button
                        onClick={() => handleBorrow(book.id)}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-md text-sm font-medium transition-colors duration-200"
                      >
                        Borrow Book
                      </button>
                    )}
                    
                    {!user && (
                      <button
                        onClick={() => router.push('/login?redirect=/books')}
                        className="w-full bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-md text-sm font-medium transition-colors duration-200"
                      >
                        Login to Borrow
                      </button>
                    )}

                    {user && book.status !== 'available' && (
                      <button
                        disabled
                        className="w-full bg-gray-300 text-gray-500 py-2 px-4 rounded-md text-sm font-medium cursor-not-allowed"
                      >
                        Not Available
                      </button>
                    )}
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

export default withAuth(BooksPage);
