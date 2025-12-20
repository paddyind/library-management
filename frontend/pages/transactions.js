import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Layout from '../src/components/layout/Layout.js';
import { useAuth } from '../src/contexts/AuthContext';
import axios from 'axios';
import withAuth from '../src/components/withAuth';
import { isAdminOrLibrarian, isMember } from '../src/utils/roleUtils';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

function TransactionsPage() {
  const router = useRouter();
  const { bookId } = router.query;
  const { user, loading: authLoading } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [allTransactions, setAllTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [showRatingPrompt, setShowRatingPrompt] = useState(null); // { transactionId, bookId, bookTitle }
  const [hasCheckedCompleted, setHasCheckedCompleted] = useState(false);
  const allTransactionsRef = useRef(allTransactions);
  
  // Keep ref in sync with state
  useEffect(() => {
    allTransactionsRef.current = allTransactions;
  }, [allTransactions]);

  const handleReturn = async (transactionId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(
        `${API_BASE_URL}/transactions/${transactionId}/return`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert('Return request submitted! Awaiting approval.');
      // Refresh transactions
      const isAdminOrLibrarian = user?.role?.toLowerCase() === 'admin' || user?.role?.toLowerCase() === 'librarian';
      const url = isAdminOrLibrarian
        ? `${API_BASE_URL}/transactions${bookId ? `?bookId=${bookId}` : ''}` 
        : `${API_BASE_URL}/transactions/my-transactions`;
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const allData = response.data || [];
      setAllTransactions(allData);
      if (statusFilter === 'all') {
        // Sort: pending_return_approval first, then by date
        const sorted = [...allData].sort((a, b) => {
          if (a.status === 'pending_return_approval' && b.status !== 'pending_return_approval') return -1;
          if (a.status !== 'pending_return_approval' && b.status === 'pending_return_approval') return 1;
          return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        });
        setTransactions(sorted.slice(0, 10));
      } else {
        setTransactions(allData.filter(t => t.status === statusFilter));
      }
    } catch (err) {
      console.error('Failed to return book:', err);
      alert(err.response?.data?.message || 'Failed to return book');
    }
  };

  const handleRenew = async (transactionId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(
        `${API_BASE_URL}/transactions/${transactionId}/renew`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert('Book renewed successfully!');
      // Refresh transactions
      const isAdminOrLibrarian = user?.role?.toLowerCase() === 'admin' || user?.role?.toLowerCase() === 'librarian';
      const url = isAdminOrLibrarian
        ? `${API_BASE_URL}/transactions${bookId ? `?bookId=${bookId}` : ''}` 
        : `${API_BASE_URL}/transactions/my-transactions`;
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const allData = response.data || [];
      setAllTransactions(allData);
      if (statusFilter === 'all') {
        // Sort: pending_return_approval first, then by date
        const sorted = [...allData].sort((a, b) => {
          if (a.status === 'pending_return_approval' && b.status !== 'pending_return_approval') return -1;
          if (a.status !== 'pending_return_approval' && b.status === 'pending_return_approval') return 1;
          return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        });
        setTransactions(sorted.slice(0, 10));
      } else {
        setTransactions(allData.filter(t => t.status === statusFilter));
      }
    } catch (err) {
      console.error('Failed to renew book:', err);
      alert(err.response?.data?.message || 'Failed to renew book');
    }
  };

  const handleApproveReturn = async (transactionId) => {
    if (!confirm('Approve this return request? The book will be marked as returned and available.')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.patch(
        `${API_BASE_URL}/transactions/${transactionId}/approve-return`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Find the transaction to get book info for rating prompt
      const transaction = allTransactions.find(t => t.id === transactionId);
      if (transaction && transaction.book && isMember(user)) {
        // Show rating/review prompt for members
        setShowRatingPrompt({
          transactionId,
          bookId: transaction.bookId,
          bookTitle: transaction.book.title || 'this book',
        });
      } else {
        alert('Return approved successfully! Book is now available.');
      }
      
      // Refresh transactions
      const url = user?.role?.toLowerCase() === 'admin' || user?.role?.toLowerCase() === 'librarian'
        ? `${API_BASE_URL}/transactions${bookId ? `?bookId=${bookId}` : ''}` 
        : `${API_BASE_URL}/transactions/my-transactions`;
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const allData = response.data || [];
      setAllTransactions(allData);
      if (statusFilter === 'all') {
        setTransactions(allData.slice(0, 10));
      } else {
        setTransactions(allData.filter(t => t.status === statusFilter));
      }
    } catch (err) {
      console.error('Failed to approve return:', err);
      alert(err.response?.data?.message || 'Failed to approve return');
    }
  };

  const handleRejectReturn = async (transactionId) => {
    const reason = prompt('Enter reason for rejection (optional):');
    if (reason === null) return; // User cancelled

    if (!confirm('Reject this return request? The transaction will be set back to active.')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.patch(
        `${API_BASE_URL}/transactions/${transactionId}/reject-return`,
        { reason: reason || undefined },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert('Return rejected. Transaction set back to active.');
      // Refresh transactions
      const url = user?.role?.toLowerCase() === 'admin' || user?.role?.toLowerCase() === 'librarian'
        ? `${API_BASE_URL}/transactions${bookId ? `?bookId=${bookId}` : ''}` 
        : `${API_BASE_URL}/transactions/my-transactions`;
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const allData = response.data || [];
      setAllTransactions(allData);
      if (statusFilter === 'all') {
        // Sort: pending_return_approval first, then by date
        const sorted = [...allData].sort((a, b) => {
          if (a.status === 'pending_return_approval' && b.status !== 'pending_return_approval') return -1;
          if (a.status !== 'pending_return_approval' && b.status === 'pending_return_approval') return 1;
          return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        });
        setTransactions(sorted.slice(0, 10));
      } else {
        setTransactions(allData.filter(t => t.status === statusFilter));
      }
    } catch (err) {
      console.error('Failed to reject return:', err);
      alert(err.response?.data?.message || 'Failed to reject return');
    }
  };

  useEffect(() => {
    const fetchTransactions = async () => {
      // Don't fetch if user is not authenticated
      if (!user) {
        setLoading(false);
        setError('Please login to view transactions');
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const token = localStorage.getItem('token');
        
        if (!token) {
          setError('Please login to view transactions');
          setLoading(false);
          return;
        }

        const isAdminOrLibrarian = user?.role?.toLowerCase() === 'admin' || user?.role?.toLowerCase() === 'librarian';
        const url = isAdminOrLibrarian
          ? `${API_BASE_URL}/transactions${bookId ? `?bookId=${bookId}` : ''}` 
          : `${API_BASE_URL}/transactions/my-transactions`;
        
        const response = await axios.get(url, {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        let allData = response.data || [];
        
        // For members, still filter by bookId on frontend if needed
        if (bookId && !isAdminOrLibrarian) {
          allData = allData.filter(t => t.bookId === bookId);
        }
        
        setAllTransactions(allData);
        // Show recent 10 by default, or filter by status
        // For admin/librarian, prioritize showing pending_return_approval transactions
        if (statusFilter === 'all') {
          // Sort: pending_return_approval first, then by date (newest first)
          const sorted = [...allData].sort((a, b) => {
            if (a.status === 'pending_return_approval' && b.status !== 'pending_return_approval') return -1;
            if (a.status !== 'pending_return_approval' && b.status === 'pending_return_approval') return 1;
            return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
          });
          setTransactions(sorted.slice(0, 10));
        } else {
          setTransactions(allData.filter(t => t.status === statusFilter));
        }
      } catch (err) {
        console.error('Failed to fetch transactions:', err);
        const errorMessage = err.response?.data?.message 
          || err.message 
          || 'Failed to fetch transactions. Please try again later.';
        setError(errorMessage);
        setTransactions([]); // Set empty array on error
      } finally {
        setLoading(false);
      }
    };
    
    if (!authLoading) {
        fetchTransactions();
        }
      }, [user, authLoading, statusFilter, bookId]); // Added bookId to dependencies

  // Check for recently completed transactions to show rating prompt
  // This useEffect must ALWAYS run before any conditional returns (React hooks rule)
  useEffect(() => {
    // Only execute logic if conditions are met, but hook always runs
    const isMemberUser = user && isMember(user);
    const currentTransactions = allTransactionsRef.current;
    const transactionsCount = currentTransactions.length;
    const hasTransactions = transactionsCount > 0;
    
    if (isMemberUser && hasTransactions && !hasCheckedCompleted && !showRatingPrompt) {
      const completedTransactions = currentTransactions.filter(t => 
        t.status === 'completed' && 
        t.type === 'borrow' &&
        t.returnDate && 
        new Date(t.returnDate).getTime() > Date.now() - 5 * 60 * 1000 // Completed in last 5 minutes
      );
      
      if (completedTransactions.length > 0) {
        const latest = completedTransactions[0];
        if (latest.book) {
          setShowRatingPrompt({
            transactionId: latest.id,
            bookId: latest.bookId,
            bookTitle: latest.book.title || 'this book',
          });
          setHasCheckedCompleted(true);
        } else {
          setHasCheckedCompleted(true);
        }
      } else {
        setHasCheckedCompleted(true);
      }
    }
    // Reset check flag when transactions change significantly
    if (!hasTransactions && hasCheckedCompleted) {
      setHasCheckedCompleted(false);
    }
    // Use stable dependencies - only length and user id, not the full array
  }, [allTransactions.length, user?.id, hasCheckedCompleted, showRatingPrompt]);

  return (
    <Layout>
      {/* Rating/Review Prompt Modal */}
      {showRatingPrompt && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
          <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Rate and Review "{showRatingPrompt.bookTitle}"
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              Thank you for returning the book! Would you like to rate and review it now?
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  router.push(`/books/${showRatingPrompt.bookId}?rate=true&transactionId=${showRatingPrompt.transactionId}`);
                  setShowRatingPrompt(null);
                }}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
              >
                Rate Now
              </button>
              <button
                onClick={() => setShowRatingPrompt(null)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
              >
                Later
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {bookId && (
            <div className="mb-4 bg-blue-50 border border-blue-200 rounded-md p-4">
              <p className="text-sm text-blue-800">
                Showing transactions for book ID: <strong>{bookId}</strong>
                <button onClick={() => router.push('/transactions')} className="ml-2 text-blue-600 hover:text-blue-800 underline">
                  Clear filter
                </button>
              </p>
            </div>
          )}
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-semibold text-gray-900">Transactions</h1>
            <div className="flex items-center gap-4">
              <label htmlFor="statusFilter" className="text-sm font-medium text-gray-700">
                Filter by Status:
              </label>
              <select
                id="statusFilter"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  if (e.target.value === 'all') {
                    setTransactions(allTransactions.slice(0, 10));
                  } else {
                    setTransactions(allTransactions.filter(t => t.status === e.target.value));
                  }
                }}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">All (Recent 10)</option>
                <option value="active">Active</option>
                <option value="pending_return_approval">Pending Return Approval</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          {transactions.length === 0 ? (
            <div className="bg-white shadow overflow-hidden sm:rounded-md p-12 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No transactions</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by creating a new transaction.</p>
            </div>
          ) : (
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <ul role="list" className="divide-y divide-gray-200">
                {transactions.map((transaction) => (
                  <li key={transaction.id}>
                    <div className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                          <a
                            href={`/books/${transaction.bookId}`}
                            className="text-sm font-medium text-indigo-600 hover:text-indigo-800 truncate cursor-pointer"
                          >
                            {transaction.book?.title || 'Unknown Book'}
                          </a>
                          <p className="text-sm text-gray-500">
                            ISBN: {transaction.book?.isbn || 'N/A'}
                          </p>
                        </div>
                        <div className="ml-2 flex-shrink-0 flex">
                              <p className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                transaction.status === 'active'
                                  ? 'bg-green-100 text-green-800'
                                  : transaction.status === 'pending_return_approval'
                                  ? 'bg-orange-100 text-orange-800'
                                  : transaction.status === 'overdue'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {transaction.status === 'pending_return_approval' ? 'Pending Return Approval' : transaction.status}
                              </p>
                        </div>
                      </div>
                      <div className="mt-2 sm:flex sm:justify-between">
                        <div className="sm:flex">
                          <p className="flex items-center text-sm text-gray-500">
                            {(user?.role?.toLowerCase() === 'admin' || user?.role?.toLowerCase() === 'librarian') && transaction.member ? (
                              <>
                                Borrowed by: {transaction.member.name || 'Unknown'} 
                                {transaction.member.phone && ` (${transaction.member.phone})`}
                              </>
                            ) : (
                              <>
                                {transaction.borrowedDate ? `Borrowed: ${new Date(transaction.borrowedDate).toLocaleDateString()}` : 'N/A'}
                              </>
                            )}
                          </p>
                        </div>
                        <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                          <p>
                            {transaction.borrowedDate ? `Borrowed: ${new Date(transaction.borrowedDate).toLocaleDateString()}` : 'N/A'} | 
                            Due: {transaction.dueDate ? new Date(transaction.dueDate).toLocaleDateString() : 'N/A'}
                          </p>
                        </div>
                      </div>
                          {/* Action buttons for members (return/renew) */}
                          {transaction.type === 'borrow' && isMember(user) && (
                            <div className="mt-2 flex justify-end space-x-4">
                              {transaction.status === 'active' && (
                                <>
                                  {/* Show renew button only if within 1-2 days of due date */}
                                  {transaction.dueDate && (() => {
                                    const dueDate = new Date(transaction.dueDate);
                                    const now = new Date();
                                    const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                                    if (daysUntilDue >= 1 && daysUntilDue <= 2) {
                                      return (
                                        <button
                                          onClick={() => handleRenew(transaction.id)}
                                          className="text-sm text-blue-600 hover:text-blue-900 font-medium"
                                        >
                                          Renew
                                        </button>
                                      );
                                    }
                                    return null;
                                  })()}
                                  <button
                                    onClick={() => handleReturn(transaction.id)}
                                    className="text-sm text-green-600 hover:text-green-900 font-medium"
                                  >
                                    Return
                                  </button>
                                </>
                              )}
                              {transaction.status === 'pending_return_approval' && (
                                <span className="text-sm text-orange-600 font-medium">Return Pending Approval</span>
                              )}
                            </div>
                          )}
                          
                          {/* Action buttons for admin/librarian (approve/reject pending returns) */}
                          {transaction.type === 'borrow' && transaction.status === 'pending_return_approval' && isAdminOrLibrarian(user) && (
                            <div className="mt-2 flex justify-end space-x-4">
                              <button
                                onClick={() => handleApproveReturn(transaction.id)}
                                className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md transition-colors"
                              >
                                Approve Return
                              </button>
                              <button
                                onClick={() => handleRejectReturn(transaction.id)}
                                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors"
                              >
                                Reject Return
                              </button>
                            </div>
                          )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

export default withAuth(TransactionsPage);
