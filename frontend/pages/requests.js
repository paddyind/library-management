import { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from '../src/components/layout/Layout.js';
import withAuth from '../src/components/withAuth.js';
import BookRequestsList from '../src/components/requests/BookRequestsList.js';
import { useAuth } from '../src/contexts/AuthContext.js';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

function UserBookRequests() {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchRequests = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/book-requests/mine`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRequests(response.data);
    } catch (err) {
      setError('Failed to fetch your book requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchRequests();
    }
  }, [user]);

  return (
    <Layout>
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">My Book Requests</h1>
          {loading && <p>Loading...</p>}
          {error && <p className="text-red-500">{error}</p>}
          {!loading && !error && (
            <BookRequestsList requests={requests} onUpdate={fetchRequests} />
          )}
        </div>
      </div>
    </Layout>
  );
}

export default withAuth(UserBookRequests);
