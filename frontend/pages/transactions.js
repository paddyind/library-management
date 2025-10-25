import { useState, useEffect } from 'react';
import Layout from '../src/components/layout/Layout.js';
import { useAuth } from '../src/hooks/useAuth';
import axios from 'axios';

export default function TransactionsPage() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTransactions = async () => {
      if (!user) return;
      try {
        setLoading(true);
        setError(null);
        const token = localStorage.getItem('token');
        const url = user.role === 'Admin' ? 'http://localhost:3001/transactions' : 'http://localhost:3001/transactions/my-transactions';
        const response = await axios.get(url, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setTransactions(response.data);
      } catch (err) {
        setError('Failed to fetch transactions');
      } finally {
        setLoading(false);
      }
    };
    fetchTransactions();
  }, [user]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>{error}</div>;

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

          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul role="list" className="divide-y divide-gray-200">
              {transactions.map((transaction) => (
                <li key={transaction.id}>
                  <div className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <p className="text-sm font-medium text-indigo-600 truncate">
                          {transaction.book.title}
                        </p>
                        <p className="text-sm text-gray-500">
                          ISBN: {transaction.book.isbn}
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
                          Member: {transaction.member.name} ({transaction.member.membershipId})
                        </p>
                      </div>
                      <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                        <p>
                          Checkout: {transaction.checkoutDate} | Due: {transaction.dueDate}
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
        </div>
      </div>
    </Layout>
  );
}
      type: 'checkout',
      book: {
        title: 'The Great Gatsby',
        isbn: '978-0743273565'
      },
      member: {
        name: 'John Doe',
        membershipId: 'MEM001'
      },
      checkoutDate: '2025-10-20',
      dueDate: '2025-11-03',
      status: 'active'
    },
    // Add more sample transactions
  ]);

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

          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul role="list" className="divide-y divide-gray-200">
              {transactions.map((transaction) => (
                <li key={transaction.id}>
                  <div className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <p className="text-sm font-medium text-indigo-600 truncate">
                          {transaction.book.title}
                        </p>
                        <p className="text-sm text-gray-500">
                          ISBN: {transaction.book.isbn}
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
                          Member: {transaction.member.name} ({transaction.member.membershipId})
                        </p>
                      </div>
                      <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                        <p>
                          Checkout: {transaction.checkoutDate} | Due: {transaction.dueDate}
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
        </div>
      </div>
    </Layout>
  );
}
