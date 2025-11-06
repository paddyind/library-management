import { useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/router';
import Link from 'next/link';
import AuthLayout from '../src/components/AuthLayout';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export default function Register() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    dateOfBirth: '',
    street: '',
    city: '',
    state: '',
    zipCode: '',
    country: '',
    preferences: [],
    subscription: 'FREE',
  });
  
  const genreOptions = [
    'Fiction', 'Non-Fiction', 'Mystery', 'Thriller', 'Romance', 
    'Science Fiction', 'Fantasy', 'Biography'
  ];
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [otherPreference, setOtherPreference] = useState('');
  const router = useRouter();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // handlePreferenceChange is now handled inline in the checkbox onChange

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { name, email, password, phone, dateOfBirth, street, city, state, zipCode, country, preferences } = formData;
      if (!phone) {
        setError('Phone number is required');
        setLoading(false);
        return;
      }
      // Handle "Other" preference if selected
      let finalPreferences = [...preferences];
      if (preferences.includes('Other') && otherPreference.trim()) {
        finalPreferences = preferences.map(p => p === 'Other' ? `Other: ${otherPreference.trim()}` : p);
      } else if (preferences.includes('Other') && !otherPreference.trim()) {
        setError('Please enter your preference for "Other"');
        setLoading(false);
        return;
      }
      
      if (finalPreferences.length < 1) {
        setError('Please select at least 1 preference');
        setLoading(false);
        return;
      }
      if (finalPreferences.length > 3) {
        setError('Please select a maximum of 3 preferences');
        setLoading(false);
        return;
      }
      // Combine address fields into a single string
      const addressParts = [street, city, state, zipCode, country].filter(Boolean);
      const address = addressParts.length > 0 ? addressParts.join(', ') : undefined;
      
      await axios.post(`${API_BASE_URL}/auth/register`, { 
        name, 
        email, 
        password,
        phone, // Required field
        dateOfBirth: dateOfBirth || undefined,
        address: address || undefined,
        preferences: finalPreferences.length > 0 ? JSON.stringify(finalPreferences) : undefined,
      });
      // Redirect to login page on success
      router.push('/login?registered=true');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to register. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Create your account">
      <>
        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          {error && (
            <div className="rounded-md bg-red-50 p-4 border border-red-200">
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
          )}
          
          {/* Subscription Plan - Moved to Top */}
          <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg p-5 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <label htmlFor="subscription" className="block text-base font-semibold text-gray-800">
                Choose Your Subscription Plan
              </label>
              <a
                href="/help#membership-plans"
                target="_blank"
                className="text-sm text-primary-600 hover:text-primary-700 font-medium underline"
              >
                View Details
              </a>
            </div>
            <select
              name="subscription"
              id="subscription"
              value={formData.subscription}
              onChange={handleChange}
              className="block w-full border border-gray-300 rounded-lg shadow-sm py-3 px-4 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm bg-white font-medium text-gray-700 transition-all duration-200"
            >
              <option value="FREE">Free - 1 week</option>
              <option value="BRONZE">Bronze - ₹299/month</option>
              <option value="SILVER">Silver - ₹599/month</option>
              <option value="GOLD">Gold - ₹999/month</option>
            </select>
            <p className="mt-2 text-xs text-gray-600 italic">💡 You can upgrade your plan later from your profile settings</p>
          </div>

          <div className="space-y-5">
            {/* Personal Information Section */}
            <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg p-4 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Personal Information</h3>
              <div className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    id="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    className="appearance-none relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-400 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 sm:text-sm shadow-sm"
                    placeholder="Enter your full name"
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    id="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className="appearance-none relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-400 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 sm:text-sm shadow-sm"
                    placeholder="Enter your email address"
                  />
                </div>
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    name="password"
                    id="password"
                    required
                    minLength={6}
                    value={formData.password}
                    onChange={handleChange}
                    className="appearance-none relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-400 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 sm:text-sm shadow-sm"
                    placeholder="Enter password (min. 6 characters)"
                  />
                </div>
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    id="phone"
                    required
                    value={formData.phone}
                    onChange={handleChange}
                    className="appearance-none relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-400 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 sm:text-sm shadow-sm"
                    placeholder="Enter your phone number"
                  />
                </div>
                <div>
                  <label htmlFor="dateOfBirth" className="block text-sm font-medium text-gray-700 mb-1">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    name="dateOfBirth"
                    id="dateOfBirth"
                    value={formData.dateOfBirth}
                    onChange={handleChange}
                    className="appearance-none relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-400 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 sm:text-sm shadow-sm"
                  />
                </div>
              </div>
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
                    className="appearance-none relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-400 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 sm:text-sm shadow-sm"
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
                      className="appearance-none relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-400 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 sm:text-sm shadow-sm"
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
                      className="appearance-none relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-400 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 sm:text-sm shadow-sm"
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
                      className="appearance-none relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-400 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 sm:text-sm shadow-sm"
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
                      className="appearance-none relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-400 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 sm:text-sm shadow-sm"
                      placeholder="Enter country"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Preferences Section - Improved UX */}
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-5 border border-gray-200 shadow-sm">
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
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className={`group relative w-full flex justify-center items-center py-3 px-6 border border-transparent text-base font-semibold rounded-lg text-white shadow-lg transform transition-all duration-200 ${
                loading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-primary-600 hover:bg-primary-700 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 active:scale-95'
              }`}
            >
              <span className="absolute left-0 inset-y-0 flex items-center pl-4">
                {loading ? (
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <svg className="h-5 w-5 text-white group-hover:text-primary-100" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                )}
              </span>
              <span>{loading ? 'Creating account...' : 'Create Account'}</span>
            </button>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link href="/login" className="font-medium text-primary-600 hover:text-primary-500">
                Sign in
              </Link>
            </p>
            <p className="mt-2 text-sm text-gray-600">
              <Link href="/" className="font-medium text-primary-600 hover:text-primary-500">
                Browse books without signing in
              </Link>
            </p>
          </div>
        </form>
      </>
    </AuthLayout>
  );
}

