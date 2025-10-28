import { useState, useEffect } from 'react';
import Layout from '../src/components/layout/Layout.js';
import { useAuth } from '../src/contexts/AuthContext';
import axios from 'axios';
import withAuth from '../src/components/withAuth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

function TransactionsPage() {
  const { user, loading: authLoading } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

        const url = user.role === 'Admin' 
          ? `${API_BASE_URL}/transactions` 
          : `${API_BASE_URL}/transactions/my-transactions`;
        
        const response = await axios.get(url, {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        setTransactions(response.data || []);
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
  }, [user, authLoading]);

  if (authLoading || loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">{error}</h3>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-semibold text-gray-900">Transactions</h1>
            <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
              New Transaction
            </button>
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
                          <p className="text-sm font-medium text-indigo-600 truncate">
                            {transaction.book?.title || 'Unknown Book'}
                          </p>
                          <p className="text-sm text-gray-500">
                            ISBN: {transaction.book?.isbn || 'N/A'}
                          </p>
                        </div>
                        <div className="ml-2 flex-shrink-0 flex">
                          <p className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            transaction.status === 'active'
                              ? 'bg-green-100 text-green-800'
                              : transaction.status === 'overdue'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {transaction.status}
                          </p>
                        </div>
                      </div>
                      <div className="mt-2 sm:flex sm:justify-between">
                        <div className="sm:flex">
                          <p className="flex items-center text-sm text-gray-500">
                            Member: {transaction.member?.name || 'Unknown'} ({transaction.member?.membershipId || 'N/A'})
                          </p>
                        </div>
                        <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                          <p>
                            Checkout: {transaction.checkoutDate || 'N/A'} | Due: {transaction.dueDate || 'N/A'}
                          </p>
                        </div>
                      </div>
                      <div className="mt-2 flex justify-end space-x-4">
                        <button className="text-sm text-blue-600 hover:text-blue-900">
                          Renew
                        </button>
                        <button className="text-sm text-green-600 hover:text-green-900">
                          Return
                        </button>
                      </div>
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
