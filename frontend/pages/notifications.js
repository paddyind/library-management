import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../src/components/layout/Layout.js';
import { useAuth } from '../src/contexts/AuthContext';
import axios from 'axios';
import withAuth from '../src/components/withAuth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

function NotificationsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all'); // all, unread, read

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!authLoading && !user) {
      router.push('/login?redirect=/notifications');
      return;
    }

    const fetchNotifications = async () => {
      if (!user) return;

      try {
        setLoading(true);
        setError(null);
        const token = localStorage.getItem('token');
        
        if (!token) {
          router.push('/login?redirect=/notifications');
          return;
        }
        
        const response = await axios.get(`${API_BASE_URL}/notifications`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        setNotifications(response.data);
      } catch (err) {
        console.error('Failed to fetch notifications:', err);
        if (err.response?.status === 401) {
          router.push('/login?redirect=/notifications');
        } else {
          setError(err.response?.data?.message || 'Failed to fetch notifications');
        }
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading && user) {
      fetchNotifications();
    }
  }, [user, authLoading, router]);

  const markAsRead = async (notificationId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(
        `${API_BASE_URL}/notifications/${notificationId}/read`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      
      setNotifications(notifications.map(notif => 
        notif.id === notificationId ? { ...notif, read: true } : notif
      ));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_BASE_URL}/notifications/mark-all-read`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      
      setNotifications(notifications.map(notif => ({ ...notif, read: true })));
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_BASE_URL}/notifications/${notificationId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      setNotifications(notifications.filter(notif => notif.id !== notificationId));
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  };

  const filteredNotifications = notifications.filter(notif => {
    if (filter === 'unread') return !notif.read;
    if (filter === 'read') return notif.read;
    return true;
  });

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
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">{error}</h3>
                  <p className="text-sm text-yellow-700 mt-1">The notifications API is not yet implemented on the backend.</p>
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
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Notifications</h1>
              <p className="text-sm text-gray-500 mt-1">
                {filteredNotifications.filter(n => !n.read).length} unread notifications
              </p>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={markAllAsRead}
                className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium py-2 px-4 rounded-md transition-colors"
                disabled={notifications.every(n => n.read)}
              >
                Mark All as Read
              </button>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
              {[
                { id: 'all', name: 'All', count: notifications.length },
                { id: 'unread', name: 'Unread', count: notifications.filter(n => !n.read).length },
                { id: 'read', name: 'Read', count: notifications.filter(n => n.read).length },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setFilter(tab.id)}
                  className={`${
                    filter === tab.id
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
                >
                  {tab.name}
                  <span className={`ml-2 ${
                    filter === tab.id ? 'bg-primary-100 text-primary-600' : 'bg-gray-100 text-gray-900'
                  } py-0.5 px-2.5 rounded-full text-xs font-medium`}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </nav>
          </div>

          {/* Notifications List */}
          {filteredNotifications.length === 0 ? (
            <div className="bg-white shadow overflow-hidden sm:rounded-md p-12 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No notifications</h3>
              <p className="mt-1 text-sm text-gray-500">
                {filter === 'all' 
                  ? "You don't have any notifications yet."
                  : filter === 'unread'
                  ? "You don't have any unread notifications."
                  : "You don't have any read notifications."}
              </p>
            </div>
          ) : (
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <ul role="list" className="divide-y divide-gray-200">
                {filteredNotifications.map((notification) => (
                  <li
                    key={notification.id}
                    className={`${!notification.read ? 'bg-blue-50' : 'bg-white'} hover:bg-gray-50 transition-colors`}
                  >
                    <div className="px-4 py-4 sm:px-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center">
                            {!notification.read && (
                              <span className="flex-shrink-0 inline-block h-2 w-2 rounded-full bg-primary-600 mr-3"></span>
                            )}
                            <p className={`text-sm font-medium ${!notification.read ? 'text-gray-900' : 'text-gray-600'}`}>
                              {notification.title || 'Notification'}
                            </p>
                          </div>
                          <p className="mt-1 text-sm text-gray-500">
                            {notification.message || 'No message content'}
                          </p>
                          <p className="mt-2 text-xs text-gray-400">
                            {notification.createdAt 
                              ? new Date(notification.createdAt).toLocaleString()
                              : 'Just now'}
                          </p>
                        </div>
                        <div className="ml-4 flex-shrink-0 flex space-x-2">
                          {!notification.read && (
                            <button
                              onClick={() => markAsRead(notification.id)}
                              className="text-sm text-primary-600 hover:text-primary-900 font-medium"
                            >
                              Mark as read
                            </button>
                          )}
                          <button
                            onClick={() => deleteNotification(notification.id)}
                            className="text-sm text-red-600 hover:text-red-900 font-medium"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                      {notification.type && (
                        <div className="mt-2">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            notification.type === 'success' ? 'bg-green-100 text-green-800' :
                            notification.type === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                            notification.type === 'error' ? 'bg-red-100 text-red-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {notification.type}
                          </span>
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

export default withAuth(NotificationsPage);
