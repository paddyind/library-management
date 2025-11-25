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
  const [transactionStats, setTransactionStats] = useState({
    totalBorrowed: 0,
    activeLoans: 0,
  });
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    street: '',
    city: '',
    state: '',
    zipCode: '',
    country: '',
    preferences: [],
    role: '',
  });
  const [otherPreference, setOtherPreference] = useState('');
  const genreOptions = [
    'Fiction', 'Non-Fiction', 'Mystery', 'Thriller', 'Romance', 
    'Science Fiction', 'Fantasy', 'Biography'
  ];
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
      const [profileResponse, transactionsResponse] = await Promise.allSettled([
        axios.get(`${API_BASE_URL}/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${API_BASE_URL}/transactions/my-transactions`, {
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => ({ data: [] })), // Fallback to empty array if endpoint doesn't exist
      ]);
      
      if (profileResponse.status === 'fulfilled') {
        const userData = profileResponse.value.data;
        setUser(userData);
        
        // Parse address from string to fields
        let street = '', city = '', state = '', zipCode = '', country = '';
        if (userData.address) {
          const addressParts = userData.address.split(',').map(s => s.trim());
          if (addressParts.length >= 1) street = addressParts[0];
          if (addressParts.length >= 2) city = addressParts[1];
          if (addressParts.length >= 3) state = addressParts[2];
          if (addressParts.length >= 4) zipCode = addressParts[3];
          if (addressParts.length >= 5) country = addressParts[4];
        }
        
        // Parse preferences from JSON string to array
        let preferences = [];
        let otherPref = '';
        if (userData.preferences) {
          try {
            // Handle JSONB (Supabase) or JSON string
            const prefs = typeof userData.preferences === 'string' 
              ? JSON.parse(userData.preferences) 
              : userData.preferences;
            preferences = Array.isArray(prefs) ? prefs : [];
            // Check if any preference is "Other: ..." and extract it
            const otherIndex = preferences.findIndex(p => typeof p === 'string' && p.startsWith('Other:'));
            if (otherIndex !== -1) {
              otherPref = preferences[otherIndex].replace('Other: ', '');
              preferences[otherIndex] = 'Other';
            }
          } catch (e) {
            // If not JSON, treat as string and try to parse
            if (typeof userData.preferences === 'string') {
              preferences = userData.preferences.split(',').map(s => s.trim()).filter(Boolean);
            }
          }
        }
        
        setOtherPreference(otherPref);
        setFormData({
          name: userData.name || '',
          email: userData.email || '',
          phone: userData.phone || '',
          dateOfBirth: userData.dateOfBirth 
            ? (typeof userData.dateOfBirth === 'string' 
                ? userData.dateOfBirth.split('T')[0] 
                : new Date(userData.dateOfBirth).toISOString().split('T')[0])
            : '',
          street: street,
          city: city,
          state: state,
          zipCode: zipCode,
          country: country,
          preferences: preferences,
          role: userData.role || '',
        });
      }
      
      // Calculate transaction stats
      if (transactionsResponse.status === 'fulfilled') {
        const transactions = transactionsResponse.value.data || [];
        const totalBorrowed = transactions.filter(t => t.type === 'borrow').length;
        const activeLoans = transactions.filter(t => 
          t.type === 'borrow' && 
          (t.status === 'active' || t.status === 'pending_return_approval')
        ).length;
        
        setTransactionStats({
          totalBorrowed,
          activeLoans,
        });
      }
      
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
    
    // Validate required fields
    if (!formData.phone) {
      alert('Phone number is required');
      return;
    }
    
    // Validate preferences
    if (formData.preferences.length > 3) {
      alert('Please select a maximum of 3 preferences');
      return;
    }
    
    // Handle "Other" preference
    let finalPreferences = [...formData.preferences];
    if (formData.preferences.includes('Other')) {
      if (otherPreference.trim()) {
        finalPreferences = formData.preferences.map(p => p === 'Other' ? `Other: ${otherPreference.trim()}` : p);
      } else {
        alert('Please enter your preference for "Other" or remove it');
        return;
      }
    }
    
    const token = localStorage.getItem('token');
    try {
      // Combine address fields into a single string
      const addressParts = [formData.street, formData.city, formData.state, formData.zipCode, formData.country].filter(Boolean);
      const address = addressParts.length > 0 ? addressParts.join(', ') : undefined;
      
      // Prepare update data - only send fields that can be updated
      const updateData = {
        name: formData.name,
        phone: formData.phone,
        dateOfBirth: formData.dateOfBirth || undefined,
        address: address || undefined,
        preferences: finalPreferences.length > 0 ? JSON.stringify(finalPreferences) : undefined,
      };
      
      await axios.put(`${API_BASE_URL}/profile`, updateData, {
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

                {/* Phone */}
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    id="phone"
                    required
                    value={formData.phone}
                    onChange={handleChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    placeholder="+1234567890"
                  />
                  <p className="mt-2 text-xs text-gray-500">Phone number is required</p>
                </div>

                {/* Date of Birth */}
                <div>
                  <label htmlFor="dateOfBirth" className="block text-sm font-medium text-gray-700">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    name="dateOfBirth"
                    id="dateOfBirth"
                    value={formData.dateOfBirth}
                    onChange={handleChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  />
                </div>

                {/* Address Section */}
                <div className="bg-gradient-to-r from-green-50 to-teal-50 rounded-lg p-4 border border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Address Information</h3>
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="street" className="block text-sm font-medium text-gray-700 mb-1">
                        Street Address
                      </label>
                      <input
                        type="text"
                        name="street"
                        id="street"
                        value={formData.street}
                        onChange={handleChange}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                        placeholder="Enter street address"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
                          City
                        </label>
                        <input
                          type="text"
                          name="city"
                          id="city"
                          value={formData.city}
                          onChange={handleChange}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                          placeholder="Enter city"
                        />
                      </div>
                      <div>
                        <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-1">
                          State/Province
                        </label>
                        <input
                          type="text"
                          name="state"
                          id="state"
                          value={formData.state}
                          onChange={handleChange}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                          placeholder="Enter state/province"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="zipCode" className="block text-sm font-medium text-gray-700 mb-1">
                          ZIP/Postal Code
                        </label>
                        <input
                          type="text"
                          name="zipCode"
                          id="zipCode"
                          value={formData.zipCode}
                          onChange={handleChange}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                          placeholder="Enter ZIP/postal code"
                        />
                      </div>
                      <div>
                        <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-1">
                          Country
                        </label>
                        <input
                          type="text"
                          name="country"
                          id="country"
                          value={formData.country}
                          onChange={handleChange}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                          placeholder="Enter country"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Preferences Section */}
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4 border border-gray-200">
                  <label htmlFor="preferences" className="block text-base font-semibold text-gray-800 mb-4">
                    Your Preferences <span className="text-sm font-normal text-gray-500">(Select up to 3)</span>
                  </label>
                  
                  {/* Selected Preferences Display */}
                  {formData.preferences.length > 0 && (
                    <div className="mb-4 p-3 bg-white rounded-lg border border-primary-200 shadow-sm">
                      <p className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Selected ({formData.preferences.length}/3)</p>
                      <div className="flex flex-wrap gap-2">
                        {formData.preferences.map((pref) => (
                          <span
                            key={pref}
                            className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-primary-600 text-white shadow-sm whitespace-nowrap"
                          >
                            <span className="max-w-[200px] truncate">{pref === 'Other' && otherPreference ? `Other: ${otherPreference}` : pref}</span>
                            <button
                              type="button"
                              onClick={() => {
                                if (pref === 'Other') {
                                  setOtherPreference('');
                                }
                                setFormData((prev) => ({
                                  ...prev,
                                  preferences: prev.preferences.filter((p) => p !== pref),
                                }));
                              }}
                              className="ml-2 inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-primary-700 focus:outline-none flex-shrink-0"
                            >
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                              </svg>
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Preference Buttons Grid - Reduced list with better spacing */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 gap-3">
                    {genreOptions.map((category) => {
                      const isSelected = formData.preferences.includes(category);
                      return (
                        <button
                          key={category}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setFormData((prev) => ({
                                ...prev,
                                preferences: prev.preferences.filter((p) => p !== category),
                              }));
                            } else {
                              if (formData.preferences.length < 3) {
                                setFormData((prev) => ({
                                  ...prev,
                                  preferences: [...prev.preferences, category],
                                }));
                              } else {
                                alert('You can select a maximum of 3 preferences');
                              }
                            }
                          }}
                          className={`px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 whitespace-nowrap ${
                            isSelected
                              ? 'bg-primary-600 text-white shadow-md ring-2 ring-primary-300 hover:bg-primary-700'
                              : 'bg-white text-gray-700 border-2 border-gray-300 hover:border-primary-400 hover:bg-primary-50 hover:text-primary-700 shadow-sm'
                          }`}
                        >
                          {category}
                        </button>
                      );
                    })}
                    {/* Other option with text input */}
                    <div className="relative col-span-full">
                      <button
                        type="button"
                        onClick={() => {
                          if (formData.preferences.includes('Other')) {
                            setFormData((prev) => ({
                              ...prev,
                              preferences: prev.preferences.filter((p) => p !== 'Other'),
                            }));
                            setOtherPreference('');
                          } else {
                            if (formData.preferences.length < 3) {
                              setFormData((prev) => ({
                                ...prev,
                                preferences: [...prev.preferences, 'Other'],
                              }));
                            } else {
                              alert('You can select a maximum of 3 preferences');
                            }
                          }
                        }}
                        className={`w-full px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 ${
                          formData.preferences.includes('Other')
                            ? 'bg-primary-600 text-white shadow-md ring-2 ring-primary-300 hover:bg-primary-700'
                            : 'bg-white text-gray-700 border-2 border-gray-300 hover:border-primary-400 hover:bg-primary-50 hover:text-primary-700 shadow-sm'
                        }`}
                      >
                        Other
                      </button>
                      {formData.preferences.includes('Other') && (
                        <input
                          type="text"
                          value={otherPreference}
                          onChange={(e) => setOtherPreference(e.target.value)}
                          placeholder="Enter your preference"
                          className="mt-3 w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                          onClick={(e) => e.stopPropagation()}
                        />
                      )}
                    </div>
                  </div>

                  {/* Status Messages */}
                  <div className="mt-4 space-y-1.5">
                    {formData.preferences.length === 0 && (
                      <p className="text-sm text-gray-500 italic">
                        👆 Select up to 3 preferences that interest you
                      </p>
                    )}
                    {formData.preferences.length > 0 && formData.preferences.length < 3 && (
                      <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-lg">
                        <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <p className="text-sm text-green-700 font-medium">
                          Great! You can select up to {3 - formData.preferences.length} more preference{3 - formData.preferences.length === 1 ? '' : 's'}
                        </p>
                      </div>
                    )}
                    {formData.preferences.length === 3 && (
                      <div className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                        <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <p className="text-sm text-blue-700 font-medium">
                          Perfect! You've selected all 3 preferences
                        </p>
                      </div>
                    )}
                  </div>
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
                  <p className="mt-2 text-xs text-gray-500">Role cannot be changed</p>
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
                    <dd className="mt-1 text-3xl font-semibold text-gray-900">{transactionStats.totalBorrowed}</dd>
                  </div>
                  <div className="px-4 py-5 bg-gray-50 shadow rounded-lg overflow-hidden sm:p-6">
                    <dt className="text-sm font-medium text-gray-500 truncate">Active Loans</dt>
                    <dd className="mt-1 text-3xl font-semibold text-gray-900">{transactionStats.activeLoans}</dd>
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

