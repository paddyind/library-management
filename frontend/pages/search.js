import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import Layout from '../src/components/layout/Layout';

export default function SearchPage() {
  const router = useRouter();
  const { q, type } = router.query;
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!q) return;

    const fetchResults = async () => {
      try {
        setLoading(true);
        setError(null);
        const token = localStorage.getItem('token');
        const response = await axios.get(`http://localhost:3001/search?q=${q}&type=${type || ''}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setResults(response.data);
      } catch (err) {
        setError('Failed to fetch search results');
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [q, type]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>{error}</div>;

  return (
    <Layout>
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-semibold text-gray-900">Search Results for "{q}"</h1>
          {/* Display search results here */}
        </div>
      </div>
    </Layout>
  );
}
