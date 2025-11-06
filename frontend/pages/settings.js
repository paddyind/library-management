import Layout from '../src/components/layout/Layout.js';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAuth } from '../src/contexts/AuthContext';
import withAuth from '../src/components/withAuth';
import { isAdmin, isAdminOrLibrarian } from '../src/utils/roleUtils';
import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

function Settings() {
  const router = useRouter();
  const { tab } = router.query;
  const [activeTab, setActiveTab] = useState(tab || 'general');
  const { user } = useAuth();
  
  // Update active tab when URL query param changes
  useEffect(() => {
    if (tab) {
      setActiveTab(tab);
    }
  }, [tab]);
  const userIsAdmin = isAdmin(user);
  const userIsAdminOrLibrarian = isAdminOrLibrarian(user);

  // Users state
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userFormData, setUserFormData] = useState({
    email: '',
    name: '',
    password: '',
    role: 'member',
  });

  // Groups state
  const [groups, setGroups] = useState([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [groupsError, setGroupsError] = useState(null);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [groupFormData, setGroupFormData] = useState({
    name: '',
    description: '',
    permissions: [],
  });

  // Books state
  const [books, setBooks] = useState([]);
  const [booksLoading, setBooksLoading] = useState(false);
  const [booksError, setBooksError] = useState(null);
  const [showBookModal, setShowBookModal] = useState(false);
  const [editingBook, setEditingBook] = useState(null);
  const [booksFormData, setBooksFormData] = useState({
    title: '',
    author: '',
    isbn: '',
    count: 1,
    status: 'available',
    forSale: false,
    price: 0,
  });

  // Fetch users
  const fetchUsers = async () => {
    if (!userIsAdmin) return;
    try {
      setUsersLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/members`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(response.data || []);
      setUsersError(null);
    } catch (err) {
      console.error('Failed to fetch users:', err);
      setUsersError('Failed to load users');
    } finally {
      setUsersLoading(false);
    }
  };

  // Fetch groups (for both Admin and Librarian - Librarian can view)
  const fetchGroups = async () => {
    if (!userIsAdminOrLibrarian) return;
    try {
      setGroupsLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/groups`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setGroups(response.data || []);
      setGroupsError(null);
    } catch (err) {
      console.error('Failed to fetch groups:', err);
      setGroupsError('Failed to load groups');
    } finally {
      setGroupsLoading(false);
    }
  };

  // Fetch books
  const fetchBooks = async () => {
    if (!userIsAdminOrLibrarian) return;
    try {
      setBooksLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/books`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setBooks(Array.isArray(response.data) ? response.data : []);
      setBooksError(null);
    } catch (err) {
      console.error('Failed to fetch books:', err);
      setBooksError('Failed to load books');
    } finally {
      setBooksLoading(false);
    }
  };

  // Handle book form submit
  const handleBookSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      if (editingBook) {
        await axios.patch(`${API_BASE_URL}/books/${editingBook.id}`, booksFormData, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await axios.post(`${API_BASE_URL}/books`, booksFormData, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      setShowBookModal(false);
      setEditingBook(null);
      setBooksFormData({ title: '', author: '', isbn: '', count: 1, status: 'available', forSale: false, price: 0 });
      fetchBooks();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save book');
    }
  };

  // Fetch users (for both Admin and Librarian - Librarian can view)
  const fetchUsersForView = async () => {
    if (!userIsAdminOrLibrarian) return;
    try {
      setUsersLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/members`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(response.data || []);
      setUsersError(null);
    } catch (err) {
      console.error('Failed to fetch users:', err);
      setUsersError('Failed to load users');
    } finally {
      setUsersLoading(false);
    }
  };

  // Load data when tab changes
  useEffect(() => {
    if (activeTab === 'users' && userIsAdminOrLibrarian) {
      if (userIsAdmin) {
        fetchUsers();
      } else {
        fetchUsersForView();
      }
    } else if (activeTab === 'groups' && userIsAdminOrLibrarian) {
      fetchGroups();
    } else if (activeTab === 'manage-books' && userIsAdminOrLibrarian) {
      fetchBooks();
    }
  }, [activeTab, userIsAdmin, userIsAdminOrLibrarian]);

  // Handle user form submit
  const handleUserSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      if (editingUser) {
        await axios.patch(`${API_BASE_URL}/members/${editingUser.id}`, userFormData, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await axios.post(`${API_BASE_URL}/members`, userFormData, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      setShowUserModal(false);
      setEditingUser(null);
      setUserFormData({ email: '', name: '', password: '', role: 'member' });
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save user');
    }
  };

  // Handle group form submit
  const handleGroupSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      if (editingGroup) {
        await axios.patch(`${API_BASE_URL}/groups/${editingGroup.id}`, groupFormData, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await axios.post(`${API_BASE_URL}/groups`, groupFormData, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      setShowGroupModal(false);
      setEditingGroup(null);
      setGroupFormData({ name: '', description: '', permissions: [] });
      fetchGroups();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save group');
    }
  };

  const tabs = [
    { id: 'general', name: 'General', icon: '⚙️' },
  ];

  // Show Manage Books for Admin and Librarian
  if (userIsAdminOrLibrarian) {
    tabs.push(
      { id: 'manage-books', name: 'Manage Books', icon: '📚' }
    );
  }

  // Show Users and Groups for Admin and Librarian (Librarian can view but not modify)
  if (userIsAdmin || userIsAdminOrLibrarian) {
    if (userIsAdmin) {
      tabs.push(
        { id: 'users', name: 'Users', icon: '👥' },
        { id: 'groups', name: 'Groups', icon: '👥' }
      );
    } else {
      // Librarian can view but not modify
      tabs.push(
        { id: 'users', name: 'Users', icon: '👥' },
        { id: 'groups', name: 'Groups', icon: '👥' }
      );
    }
  }

  // Add notification, security, integrations after the above tabs
  tabs.push(
    { id: 'notifications', name: 'Notifications', icon: '🔔' },
    { id: 'security', name: 'Security', icon: '🔒' },
    { id: 'integrations', name: 'Integrations', icon: '🔌' }
  );

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="mt-2 text-sm text-gray-600">
            Manage your library system preferences and configurations.
          </p>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 transition-colors`}
              >
                <span>{tab.icon}</span>
                <span>{tab.name}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          {activeTab === 'general' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">General Settings</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h4 className="font-medium text-gray-900 mb-2">Library Name</h4>
                  <p className="text-sm text-gray-600">Configure your library's display name</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h4 className="font-medium text-gray-900 mb-2">Operating Hours</h4>
                  <p className="text-sm text-gray-600">Set library opening and closing times</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h4 className="font-medium text-gray-900 mb-2">Loan Duration</h4>
                  <p className="text-sm text-gray-600">Default book borrowing period</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h4 className="font-medium text-gray-900 mb-2">Fine Policy</h4>
                  <p className="text-sm text-gray-600">Configure late return penalties</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Notification Settings</h3>
              <div className="space-y-3">
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h4 className="font-medium text-gray-900 mb-2">Email Notifications</h4>
                  <p className="text-sm text-gray-600">Configure email alerts for reservations and due dates</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h4 className="font-medium text-gray-900 mb-2">SMS Notifications</h4>
                  <p className="text-sm text-gray-600">Set up text message reminders</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h4 className="font-medium text-gray-900 mb-2">Push Notifications</h4>
                  <p className="text-sm text-gray-600">Manage in-app notification preferences</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Security Settings</h3>
              <div className="space-y-3">
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h4 className="font-medium text-gray-900 mb-2">Password Policy</h4>
                  <p className="text-sm text-gray-600">Set password requirements and expiration rules</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h4 className="font-medium text-gray-900 mb-2">Two-Factor Authentication</h4>
                  <p className="text-sm text-gray-600">Enable additional security layer for admin access</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h4 className="font-medium text-gray-900 mb-2">Session Management</h4>
                  <p className="text-sm text-gray-600">Configure session timeout and concurrent logins</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'integrations' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Integration Settings</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h4 className="font-medium text-gray-900 mb-2">Email Service</h4>
                  <p className="text-sm text-gray-600">Connect SMTP server for email delivery</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h4 className="font-medium text-gray-900 mb-2">Calendar Sync</h4>
                  <p className="text-sm text-gray-600">Integrate with Google Calendar or Outlook</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h4 className="font-medium text-gray-900 mb-2">Payment Gateway</h4>
                  <p className="text-sm text-gray-600">Setup payment processing for fines</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h4 className="font-medium text-gray-900 mb-2">API Keys</h4>
                  <p className="text-sm text-gray-600">Manage external API access</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'manage-books' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Book Management</h3>
                  <p className="text-sm text-gray-600 mt-1">Add, edit, and manage library books</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setBooksFormData({ title: '', author: '', isbn: '', count: 1, status: 'available', forSale: false, price: 0 });
                      setEditingBook(null);
                      setShowBookModal(true);
                    }}
                    className="bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 px-4 rounded-md transition-colors text-sm"
                  >
                    Add New Book
                  </button>
                </div>
              </div>
              {booksError && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                  <p className="text-sm text-red-800">{booksError}</p>
                </div>
              )}
              <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Author</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ISBN</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {books.map((book) => (
                      <tr key={book.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          <a href={`/books/${book.id}`} className="text-indigo-600 hover:text-indigo-800">
                            {book.title}
                          </a>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{book.author}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{book.isbn || 'N/A'}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            (book.status === 'available' || book.isAvailable) ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>{(book.status === 'available' || book.isAvailable) ? 'Available' : 'Out of Stock'}</span>
                          {!book.isAvailable && (
                            <a
                              href={`/transactions?bookId=${book.id}`}
                              className="ml-2 text-xs text-indigo-600 hover:text-indigo-800"
                            >
                              (View Details)
                            </a>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button onClick={() => { setEditingBook(book); setBooksFormData({ title: book.title || '', author: book.author || '', isbn: book.isbn || '', count: book.count || 1, status: book.status || 'available', forSale: book.forSale || false, price: book.price || 0 }); setShowBookModal(true); }} className="text-primary-600 hover:text-primary-900 mr-4">Edit</button>
                          <button onClick={async () => { if (confirm('Delete book?')) { try { const token = localStorage.getItem('token'); await axios.delete(`${API_BASE_URL}/books/${book.id}`, { headers: { Authorization: `Bearer ${token}` } }); fetchBooks(); } catch (err) { alert(err.response?.data?.message || 'Failed to delete'); } } }} className="text-red-600 hover:text-red-900">Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">User Management</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {userIsAdmin ? 'Manage system users and their roles' : 'View system users (read-only)'}
                  </p>
                </div>
                {userIsAdmin && (
                  <button
                    onClick={() => {
                      setShowUserModal(true);
                      setEditingUser(null);
                      setUserFormData({ email: '', name: '', password: '', role: 'member' });
                    }}
                    className="bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 px-4 rounded-md transition-colors text-sm"
                  >
                    Add New User
                  </button>
                )}
              </div>
              {usersError && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                  <p className="text-sm text-red-800">{usersError}</p>
                </div>
              )}
              <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users.map((u) => (
                      <tr key={u.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{u.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{u.email}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            u.role?.toLowerCase() === 'admin' ? 'bg-purple-100 text-purple-800' : 
                            u.role?.toLowerCase() === 'librarian' ? 'bg-blue-100 text-blue-800' : 
                            'bg-green-100 text-green-800'
                          }`}>{u.role}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          {userIsAdmin && (
                            <>
                              <button onClick={() => { setEditingUser(u); setUserFormData({ email: u.email, name: u.name, password: '', role: u.role }); setShowUserModal(true); }} className="text-primary-600 hover:text-primary-900 mr-4">Edit</button>
                              <button onClick={async () => { if (confirm('Delete user?')) { try { const token = localStorage.getItem('token'); await axios.delete(`${API_BASE_URL}/members/${u.id}`, { headers: { Authorization: `Bearer ${token}` } }); fetchUsers(); } catch (err) { alert(err.response?.data?.message || 'Failed to delete'); } } }} className="text-red-600 hover:text-red-900">Delete</button>
                            </>
                          )}
                          {!userIsAdmin && <span className="text-gray-400 text-xs">View only</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'groups' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Group Management</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {userIsAdmin ? 'Manage user groups and permissions' : 'View user groups (read-only)'}
                  </p>
                </div>
                {userIsAdmin && (
                  <button
                    onClick={() => {
                      setShowGroupModal(true);
                      setEditingGroup(null);
                      setGroupFormData({ name: '', description: '', permissions: [] });
                    }}
                    className="bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 px-4 rounded-md transition-colors text-sm"
                  >
                    Add New Group
                  </button>
                )}
              </div>
              {groupsError && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                  <p className="text-sm text-red-800">{groupsError}</p>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {groups.map((group) => (
                  <div key={group.id} className="bg-white shadow rounded-lg overflow-hidden">
                    <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                      <h3 className="text-lg font-medium text-gray-900">{group.name}</h3>
                      <p className="text-sm text-gray-500 mt-1">{group.description || 'No description'}</p>
                    </div>
                    <div className="px-6 py-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Permissions:</h4>
                      <div className="flex flex-wrap gap-2">
                        {group.permissions && group.permissions.length > 0 ? (
                          group.permissions.map((perm) => (
                            <span key={perm} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">{perm}</span>
                          ))
                        ) : (
                          <span className="text-sm text-gray-400">No permissions</span>
                        )}
                      </div>
                    </div>
                    <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3">
                      {userIsAdmin && (
                        <>
                          <button onClick={() => { setEditingGroup(group); setGroupFormData({ name: group.name, description: group.description || '', permissions: group.permissions || [] }); setShowGroupModal(true); }} className="text-sm text-primary-600 hover:text-primary-900 font-medium">Edit</button>
                          <button onClick={async () => { if (confirm('Delete group?')) { try { const token = localStorage.getItem('token'); await axios.delete(`${API_BASE_URL}/groups/${group.id}`, { headers: { Authorization: `Bearer ${token}` } }); fetchGroups(); } catch (err) { alert(err.response?.data?.message || 'Failed to delete'); } } }} className="text-sm text-red-600 hover:text-red-900 font-medium">Delete</button>
                        </>
                      )}
                      {!userIsAdmin && <span className="text-gray-400 text-xs">View only</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

      </div>

      {/* User Modal */}
      {showUserModal && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => { setShowUserModal(false); setEditingUser(null); }}></div>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={handleUserSubmit}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">{editingUser ? 'Edit User' : 'Add New User'}</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Name</label>
                      <input type="text" required value={userFormData.name} onChange={(e) => setUserFormData({ ...userFormData, name: e.target.value })} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Email</label>
                      <input type="email" required value={userFormData.email} onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Password {editingUser && <span className="text-gray-500">(leave blank to keep current)</span>}</label>
                      <input type="password" required={!editingUser} value={userFormData.password} onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Role</label>
                      <select value={userFormData.role} onChange={(e) => setUserFormData({ ...userFormData, role: e.target.value })} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500">
                        <option value="member">Member</option>
                        <option value="librarian">Librarian</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button type="submit" className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-600 text-base font-medium text-white hover:bg-primary-700 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm">{editingUser ? 'Update' : 'Create'}</button>
                  <button type="button" onClick={() => { setShowUserModal(false); setEditingUser(null); }} className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm">Cancel</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Group Modal */}
      {showGroupModal && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => { setShowGroupModal(false); setEditingGroup(null); }}></div>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
              <form onSubmit={handleGroupSubmit}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">{editingGroup ? 'Edit Group' : 'Add New Group'}</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Name</label>
                      <input type="text" required value={groupFormData.name} onChange={(e) => setGroupFormData({ ...groupFormData, name: e.target.value })} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Description</label>
                      <textarea value={groupFormData.description} onChange={(e) => setGroupFormData({ ...groupFormData, description: e.target.value })} rows={3} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button type="submit" className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-600 text-base font-medium text-white hover:bg-primary-700 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm">{editingGroup ? 'Update' : 'Create'}</button>
                  <button type="button" onClick={() => { setShowGroupModal(false); setEditingGroup(null); }} className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm">Cancel</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Book Modal */}
      {showBookModal && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => { setShowBookModal(false); setEditingBook(null); }}></div>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={handleBookSubmit}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">{editingBook ? 'Edit Book' : 'Add New Book'}</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Title</label>
                      <input type="text" required value={booksFormData.title} onChange={(e) => setBooksFormData({ ...booksFormData, title: e.target.value })} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Author</label>
                      <input type="text" required value={booksFormData.author} onChange={(e) => setBooksFormData({ ...booksFormData, author: e.target.value })} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">ISBN</label>
                      <input type="text" value={booksFormData.isbn} onChange={(e) => setBooksFormData({ ...booksFormData, isbn: e.target.value })} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Count</label>
                      <input type="number" min="1" value={booksFormData.count} onChange={(e) => setBooksFormData({ ...booksFormData, count: parseInt(e.target.value) || 1 })} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Status</label>
                      <select value={booksFormData.status} onChange={(e) => setBooksFormData({ ...booksFormData, status: e.target.value })} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500">
                        <option value="available">Available</option>
                        <option value="borrowed">Borrowed</option>
                        <option value="reserved">Reserved</option>
                      </select>
                    </div>
                    <div className="flex items-center">
                      <input type="checkbox" checked={booksFormData.forSale} onChange={(e) => setBooksFormData({ ...booksFormData, forSale: e.target.checked })} className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded" />
                      <label className="ml-2 block text-sm text-gray-700">For Sale</label>
                    </div>
                    {booksFormData.forSale && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Price</label>
                        <input type="number" min="0" step="0.01" value={booksFormData.price} onChange={(e) => setBooksFormData({ ...booksFormData, price: parseFloat(e.target.value) || 0 })} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
                      </div>
                    )}
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button type="submit" className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-600 text-base font-medium text-white hover:bg-primary-700 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm">{editingBook ? 'Update' : 'Create'}</button>
                  <button type="button" onClick={() => { setShowBookModal(false); setEditingBook(null); }} className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm">Cancel</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

export default withAuth(Settings);
