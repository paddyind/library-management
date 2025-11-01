import { useState, useEffect } from 'react';
import { BellIcon, UserCircleIcon, MenuIcon } from '@heroicons/react/outline';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export default function Header({ onMenuButtonClick }) {
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const router = useRouter();
  const { user, logout } = useAuth();

  // Fetch unread notification count - optimized to reduce API calls
  // Only polls when page is visible and user is authenticated
  // Reduced polling frequency from 60s to 5 minutes to minimize server load
  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    let isMounted = true;
    let intervalId = null;
    const POLL_INTERVAL = 5 * 60 * 1000; // 5 minutes instead of 60 seconds

    const fetchUnreadCount = async () => {
      // Skip if page is not visible (browser tab in background)
      if (document.hidden) {
        return;
      }

      try {
        const token = localStorage.getItem('token');
        if (!token) {
          if (isMounted) setUnreadCount(0);
          return;
        }

        const response = await axios.get(`${API_BASE_URL}/notifications/unread-count`, {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 5000, // 5 second timeout
        });
        if (isMounted) setUnreadCount(response.data || 0);
      } catch (err) {
        // Silently fail - no notifications available
        if (isMounted) setUnreadCount(0);
        // Only log errors in development to reduce console noise
        if (process.env.NODE_ENV === 'development') {
          console.error('Failed to fetch unread notifications:', err);
        }
      }
    };

    // Initial fetch only when component mounts
    fetchUnreadCount();

    // Poll at intervals only when page is visible
    const startPolling = () => {
      if (intervalId) clearInterval(intervalId);
      intervalId = setInterval(() => {
        if (isMounted && !document.hidden) {
          fetchUnreadCount();
        }
      }, POLL_INTERVAL);
    };

    // Handle page visibility changes - stop polling when tab is inactive
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Stop polling when page is hidden
        if (intervalId) {
          clearInterval(intervalId);
          intervalId = null;
        }
      } else {
        // Resume polling when page becomes visible, and fetch immediately
        fetchUnreadCount();
        startPolling();
      }
    };

    // Start polling
    startPolling();

    // Listen to page visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isMounted = false;
      if (intervalId) clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user]);

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  const handleSearchSubmit = (e) => {
    if (e.key === 'Enter') {
      router.push(`/search?q=${searchQuery}`);
    }
  };

  const handleMenuClick = () => {
    if (onMenuButtonClick) {
      onMenuButtonClick();
    }
  };

  const handleLogout = () => {
    logout();
  };

  return (
    <header className="bg-white shadow-float sticky top-0 z-10">
      <div className="mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex">
            <button
              type="button"
              className="md:hidden px-4 border-r border-gray-200 text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-secondary-500"
              onClick={handleMenuClick}
            >
              <span className="sr-only">Open sidebar</span>
              <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="flex-shrink-0 flex items-center">
              <Link href={user ? "/dashboard" : "/"} className="flex items-center group">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-secondary-600 group-hover:text-secondary-700 transition-colors duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                <span className="ml-2 text-xl font-bold text-gray-900 group-hover:text-gray-700 transition-colors duration-200 hidden lg:block">Library Management System</span>
              </Link>
            </div>
          </div>

          {/* Search Bar */}
          <div className="flex-1 flex items-center justify-center px-6">
            <div className="max-w-lg w-full">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-secondary-500 focus:border-secondary-500 sm:text-sm transition-all duration-200"
                  placeholder="Search books, members..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  onKeyDown={handleSearchSubmit}
                />
              </div>
            </div>
          </div>

          {/* Right Navigation */}
          <div className="flex items-center space-x-4">
            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="p-2 rounded-full text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary-500 transition-all duration-200"
              >
                <span className="sr-only">View notifications</span>
                <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 flex items-center justify-center h-5 w-5 text-xs font-bold text-white bg-red-500 rounded-full ring-2 ring-white">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
              
              {notificationsOpen && (
                <div className="origin-top-right absolute right-0 mt-2 w-80 rounded-lg shadow-float-strong bg-white ring-1 ring-black ring-opacity-5 focus:outline-none animate-fade-in">
                  <div className="py-2">
                    <div className="px-4 py-2 border-b border-gray-100">
                      <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {unreadCount === 0 ? (
                        <div className="px-4 py-8 text-center text-gray-500 text-sm">
                          No new notifications
                        </div>
                      ) : (
                        <div className="px-4 py-3 text-sm text-gray-500 text-center">
                          You have {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
                        </div>
                      )}
                    </div>
                    <div className="px-4 py-2 border-t border-gray-100 flex justify-between items-center">
                      <Link href="/notifications" className="text-sm font-medium text-primary-600 hover:text-primary-500">
                        All Notifications
                      </Link>
                      {unreadCount > 0 && (
                        <button 
                          onClick={async () => {
                            try {
                              const token = localStorage.getItem('token');
                              if (token) {
                                await axios.post(`${API_BASE_URL}/notifications/mark-all-read`, {}, {
                                  headers: { Authorization: `Bearer ${token}` },
                                });
                                setUnreadCount(0);
                              }
                            } catch (err) {
                              console.error('Failed to mark all as read:', err);
                            }
                          }}
                          className="text-sm font-medium text-gray-500 hover:text-gray-700"
                        >
                          Mark all as read
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Profile dropdown */}
            <div className="relative">
              <button
                onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                className="flex items-center space-x-2 text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary-500 rounded-full transition-all duration-200 p-1 hover:bg-gray-100"
              >
                <img
                  className="h-8 w-8 rounded-full ring-2 ring-white"
                  src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
                  alt=""
                />
                <span className="hidden md:block text-gray-700 font-medium">{user?.name || user?.email || 'User'}</span>
                <svg className="hidden md:block h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>

              {profileMenuOpen && (
                <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-lg shadow-float-strong bg-white ring-1 ring-black ring-opacity-5 focus:outline-none animate-fade-in">
                  <div className="py-1">
                    <Link
                      href="/profile"
                      className="dropdown-item"
                      onClick={() => setProfileMenuOpen(false)}
                    >
                      <div className="flex items-center">
                        <svg className="mr-3 h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        Your Profile
                      </div>
                    </Link>
                    <Link
                      href="/settings"
                      className="dropdown-item"
                      onClick={() => setProfileMenuOpen(false)}
                    >
                      <div className="flex items-center">
                        <svg className="mr-3 h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Settings
                      </div>
                    </Link>
                    <div className="border-t border-gray-100"></div>
                    <button
                      onClick={handleLogout}
                      className="dropdown-item text-red-600 hover:text-red-700 hover:bg-red-50 w-full text-left"
                    >
                      <div className="flex items-center">
                        <svg className="mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Sign out
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
