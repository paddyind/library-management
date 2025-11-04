import { useState, useEffect } from 'react';
import Layout from '../src/components/layout/Layout.js';
import { useAuth } from '../src/contexts/AuthContext';
import { useRouter } from 'next/router';
import axios from 'axios';
import withAuth from '../src/components/withAuth';

import { isAdminOrLibrarian, getUserDisplayName } from '../src/utils/roleUtils';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState({
    totalBooks: 0,
    availableBooks: 0,
    totalMembers: 0,
    activeLoans: 0,
  });
  const [loading, setLoading] = useState(true);
  
  // Compute role-based flags at component level (available in JSX)
  const isAdminOrLib = isAdminOrLibrarian(user);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      fetchStats();
    }
  }, [user, authLoading, router]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const userRole = user?.role?.toLowerCase();
      const isAdmin = userRole === 'admin';
      const isLibrarian = userRole === 'librarian';
      
      // Fetch stats based on user role
      const [booksRes, membersRes, transactionsRes] = await Promise.allSettled([
        axios.get(`${API_BASE_URL}/books`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }),
        // Only fetch users list if admin or librarian
        (token && (isAdmin || isLibrarian)) ? axios.get(`${API_BASE_URL}/users`, {
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => axios.get(`${API_BASE_URL}/members`, {
          headers: { Authorization: `Bearer ${token}` },
        })) : Promise.resolve({ value: { data: [] } }),
        // Use correct transactions endpoint based on role
        token ? (isAdmin 
          ? axios.get(`${API_BASE_URL}/transactions`, {
              headers: { Authorization: `Bearer ${token}` },
            }).catch(() => Promise.resolve({ data: [] }))
          : axios.get(`${API_BASE_URL}/transactions/my-transactions`, {
              headers: { Authorization: `Bearer ${token}` },
            }).catch(() => Promise.resolve({ data: [] }))
        ) : Promise.resolve({ data: [] }),
      ]);

      const books = booksRes.status === 'fulfilled' ? (booksRes.value.data || []) : [];
      const members = membersRes.status === 'fulfilled' ? (membersRes.value.data || []) : [];
      const transactions = transactionsRes.status === 'fulfilled' ? (transactionsRes.value.data || []) : [];

      // Calculate active loans (transactions without returnDate)
      const activeLoans = Array.isArray(transactions) 
        ? transactions.filter(t => t && !t.returnDate).length 
        : 0;

      setStats({
        totalBooks: Array.isArray(books) ? books.length : 0,
        availableBooks: Array.isArray(books) ? books.length : 0, // TODO: Add status field to books
        totalMembers: Array.isArray(members) ? members.length : 0,
        activeLoans: activeLoans,
      });
    } catch (err) {
      console.error('Failed to fetch stats:', err);
      // Keep default values (0)
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </Layout>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <Layout>
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold text-gray-900">
              Welcome back, {getUserDisplayName(user)}!
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Here's what's happening in your library today.
            </p>
          </div>
          
          {/* Stats Grid */}
          {/* For members, show 3 columns; for admin/librarian, show 4 columns */}
          <div className={`mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 ${isAdminOrLib ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}>
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Total Books</dt>
                      <dd className="flex items-baseline">
                        <div className="text-2xl font-semibold text-gray-900">{stats.totalBooks}</div>
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Available</dt>
                      <dd className="flex items-baseline">
                        <div className="text-2xl font-semibold text-gray-900">{stats.availableBooks}</div>
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            {/* Members count - only show for admin/librarian */}
            {isAdminOrLib && (
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Members</dt>
                        <dd className="flex items-baseline">
                          <div className="text-2xl font-semibold text-gray-900">{stats.totalMembers}</div>
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Active Loans</dt>
                      <dd className="flex items-baseline">
                        <div className="text-2xl font-semibold text-gray-900">{stats.activeLoans}</div>
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mt-8">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <a
                href="/books"
                className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-gray-400 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500"
              >
                <div className="flex-shrink-0">
                  <svg className="h-10 w-10 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <span className="absolute inset-0" aria-hidden="true" />
                  <p className="text-sm font-medium text-gray-900">Browse Books</p>
                  <p className="text-sm text-gray-500 truncate">View all available books</p>
                </div>
              </a>

              <a
                href="/transactions"
                className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-gray-400 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500"
              >
                <div className="flex-shrink-0">
                  <svg className="h-10 w-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <span className="absolute inset-0" aria-hidden="true" />
                  <p className="text-sm font-medium text-gray-900">My Transactions</p>
                  <p className="text-sm text-gray-500 truncate">View borrowing history</p>
                </div>
              </a>

              {isAdminOrLib && (
                <a
                  href="/users"
                  className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-gray-400 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500"
                >
                  <div className="flex-shrink-0">
                    <svg className="h-10 w-10 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="absolute inset-0" aria-hidden="true" />
                    <p className="text-sm font-medium text-gray-900">Manage Users</p>
                    <p className="text-sm text-gray-500 truncate">{user.role?.toLowerCase() === 'admin' ? 'Admin panel' : 'View users'}</p>
                  </div>
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

export default withAuth(Dashboard);
