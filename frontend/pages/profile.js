import { useState, useEffect } from 'react';
import Layout from '../src/components/layout/Layout.js';
import { useAuth } from '../src/contexts/AuthContext';
import axios from 'axios';
import { useRouter } from 'next/router';
import withAuth from '../src/components/withAuth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

function Profile() {
  const { user: authUser, loading: authLoading } = useAuth();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: '',
  });
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !authUser) {
      router.push('/login');
      return;
    }

    if (authUser) {
      fetchUser();
    }
  }, [authUser, authLoading, router]);

  const fetchUser = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUser(response.data);
      setFormData({
        name: response.data.name || '',
        email: response.data.email || '',
        role: response.data.role || '',
      });
      setError(null);
    } catch (err) {
      console.error('Failed to fetch profile:', err);
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    try {
      await axios.put(`${API_BASE_URL}/profile`, formData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert('Profile updated successfully');
      fetchUser();
    } catch (err) {
      console.error('Failed to update profile:', err);
      alert(err.response?.data?.message || 'Failed to update profile');
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

  if (error) {
    return (
      <Layout>
        <div className="py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <p className="text-sm text-red-800">{error}</p>
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
          <div className="md:flex md:items-center md:justify-between mb-6">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
                Profile Settings
              </h1>
            </div>
          </div>

          <div className="mt-6 bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Profile Picture */}
                <div className="flex items-center space-x-6">
                  <div className="flex-shrink-0">
                    <img
                      className="h-24 w-24 rounded-full ring-4 ring-white"
                      src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
                      alt=""
                    />
                  </div>
                  <div>
                    <button
                      type="button"
                      className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                    >
                      Change photo
                    </button>
                    <p className="mt-2 text-xs text-gray-500">JPG, GIF or PNG. Max size of 800K</p>
                  </div>
                </div>

                {/* Name */}
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    Full Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    id="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  />
                </div>

                {/* Email */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    Email Address
                  </label>
                  <input
                    type="email"
                    name="email"
                    id="email"
                    disabled
                    value={formData.email}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-gray-50 text-gray-500 sm:text-sm"
                  />
                  <p className="mt-2 text-xs text-gray-500">Email cannot be changed</p>
                </div>

                {/* Role */}
                <div>
                  <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                    Role
                  </label>
                  <input
                    type="text"
                    name="role"
                    id="role"
                    disabled
                    value={formData.role}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-gray-50 text-gray-500 sm:text-sm"
                  />
                </div>

                {/* Member Info (if available) */}
                {user?.membershipId && (
                  <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                    <h3 className="text-sm font-medium text-blue-900 mb-2">Membership Information</h3>
                    <dl className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
                      <div>
                        <dt className="text-xs font-medium text-blue-700">Membership ID</dt>
                        <dd className="text-sm text-blue-900">{user.membershipId}</dd>
                      </div>
                      {user.memberSince && (
                        <div>
                          <dt className="text-xs font-medium text-blue-700">Member Since</dt>
                          <dd className="text-sm text-blue-900">{new Date(user.memberSince).toLocaleDateString()}</dd>
                        </div>
                      )}
                    </dl>
                  </div>
                )}

                {/* Submit Button */}
                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Additional Sections */}
          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Password Change */}
            <div className="bg-white shadow sm:rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Change Password</h3>
                <div className="mt-2 max-w-xl text-sm text-gray-500">
                  <p>Update your password to keep your account secure.</p>
                </div>
                <div className="mt-5">
                  <button
                    type="button"
                    className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:text-sm"
                  >
                    Change Password
                  </button>
                </div>
              </div>
            </div>

            {/* Account Stats */}
            <div className="bg-white shadow sm:rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Account Activity</h3>
                <dl className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div className="px-4 py-5 bg-gray-50 shadow rounded-lg overflow-hidden sm:p-6">
                    <dt className="text-sm font-medium text-gray-500 truncate">Books Borrowed</dt>
                    <dd className="mt-1 text-3xl font-semibold text-gray-900">0</dd>
                  </div>
                  <div className="px-4 py-5 bg-gray-50 shadow rounded-lg overflow-hidden sm:p-6">
                    <dt className="text-sm font-medium text-gray-500 truncate">Active Loans</dt>
                    <dd className="mt-1 text-3xl font-semibold text-gray-900">0</dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

export default withAuth(Profile);
