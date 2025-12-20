import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import Layout from '../../src/components/layout/Layout.js';
import { useAuth } from '../../src/contexts/AuthContext';
import withAuth from '../../src/components/withAuth';
import { isAdmin } from '../../src/utils/roleUtils';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

function ApprovalsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [pendingReviews, setPendingReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectingId, setRejectingId] = useState(null);

  useEffect(() => {
    if (user && isAdmin(user)) {
      fetchPendingReviews();
    }
  }, [user]);


  const fetchPendingReviews = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/reviews/pending`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPendingReviews(response.data || []);
    } catch (err) {
      console.error('Error fetching pending reviews:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(
        `${API_BASE_URL}/reviews/${id}/approve`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert('Review approved successfully!');
      fetchPendingReviews();
    } catch (err) {
      console.error('Error approving review:', err);
      const errorMessage = err.response?.data?.message || 'Failed to approve review';
      alert(errorMessage);
      // Refresh to update the list
      fetchPendingReviews();
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      alert('Please provide a reason for rejection.');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.patch(
        `${API_BASE_URL}/reviews/${rejectingId}/reject`,
        { reason: rejectReason },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert('Review rejected successfully!');
      setRejectReason('');
      setRejectingId(null);
      fetchPendingReviews();
    } catch (err) {
      console.error('Error rejecting review:', err);
      const errorMessage = err.response?.data?.message || 'Failed to reject review';
      alert(errorMessage);
      // Refresh to update the list
      fetchPendingReviews();
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </Layout>
    );
  }

  if (!user || !isAdmin(user)) {
    return (
      <Layout>
        <div className="py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <p className="text-red-800">Access denied. Admin privileges required.</p>
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
          <h1 className="text-2xl font-semibold text-gray-900 mb-6">Pending Review Approvals</h1>
          <p className="text-sm text-gray-600 mb-6">Note: Ratings are published immediately. Only reviews require approval.</p>

          {/* Reviews Only - Ratings are immediate, no approval needed */}
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            {pendingReviews.length === 0 ? (
                <div className="p-12 text-center">
                  <p className="text-gray-500">No pending reviews to review.</p>
                </div>
              ) : (
                <ul className="divide-y divide-gray-200">
                  {pendingReviews.map((review) => (
                    <li key={review.id} className="px-4 py-4 sm:px-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <p className="text-sm font-semibold text-gray-900">
                                {review.bookName || 'Unknown Book'}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                Book ID: {review.bookId}
                              </p>
                            </div>
                            {review.rating && (
                              <div className="flex items-center space-x-1">
                                <span className="text-sm font-medium text-gray-700">Rating:</span>
                                <span className="text-lg font-bold text-yellow-500">
                                  {review.rating}/5
                                </span>
                                <span className="text-yellow-500">★</span>
                              </div>
                            )}
                          </div>
                          <p className="mt-2 text-sm text-gray-700 bg-gray-50 p-3 rounded-md">
                            {review.review}
                          </p>
                          <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
                            <div>
                              <span className="font-medium">Reviewer:</span> {review.memberName || 'Unknown User'}
                            </div>
                            {review.transactionId && (
                              <div>
                                <span className="font-medium">Transaction:</span> {review.transactionId.substring(0, 8)}...
                              </div>
                            )}
                          </div>
                          <p className="mt-1 text-xs text-gray-400">
                            Submitted: {new Date(review.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <div className="ml-4 flex space-x-2">
                          <button
                            onClick={() => handleApprove(review.id)}
                            className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md transition-colors"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => {
                              setRejectingId(review.id);
                            }}
                            className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
          </div>
        </div>
      </div>

      {/* Reject Reason Modal */}
      {rejectingId && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
          <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Reject Review
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Please provide a reason for rejection (required):
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              rows="4"
              placeholder="Enter rejection reason..."
            />
            <div className="flex justify-end space-x-3 mt-4">
              <button
                onClick={() => {
                  setRejectReason('');
                  setRejectingId(null);
                }}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

export default withAuth(ApprovalsPage);

