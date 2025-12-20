import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import Layout from '../../src/components/layout/Layout.js';
import { useAuth } from '../../src/contexts/AuthContext';
import withAuth from '../../src/components/withAuth';
import { isMember, isAdminOrLibrarian } from '../../src/utils/roleUtils';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

function BookDetailsPage() {
  const router = useRouter();
  const { id } = router.query;
  const { user } = useAuth();
  const [book, setBook] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [averageRating, setAverageRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [rating, setRating] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [borrowing, setBorrowing] = useState(false);
  const [activeLoans, setActiveLoans] = useState([]);
  const [maxConcurrentLoans] = useState(2); // Gold plan default
  const [completedTransactionId, setCompletedTransactionId] = useState(null);

  useEffect(() => {
    if (id) {
      fetchBookDetails();
      fetchReviews();
      fetchAverageRating();
    }
  }, [id]);

  useEffect(() => {
    if (user) {
      fetchMyTransactions();
    }
  }, [user]);

  useEffect(() => {
    // Check if we should show rating form (from return prompt)
    if (router.query.rate === 'true' && router.query.transactionId) {
      setCompletedTransactionId(router.query.transactionId);
      // Scroll to rating section after a brief delay
      setTimeout(() => {
        const ratingSection = document.getElementById('rating-section');
        if (ratingSection) {
          ratingSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 500);
    }
  }, [router.query]);

  const fetchMyTransactions = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      const response = await axios.get(`${API_BASE_URL}/transactions/my-transactions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const active = (response.data || []).filter(t => 
        t.status === 'active' || t.status === 'pending_return_approval'
      );
      setActiveLoans(active);
    } catch (err) {
      console.error('Error fetching transactions:', err);
    }
  };

  const fetchBookDetails = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/books/${id}`);
      setBook(response.data);
    } catch (error) {
      console.error('Error fetching book details:', error);
      setError('Failed to load book details');
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/reviews/book/${id}`);
      setReviews(response.data || []);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    }
  };

  const fetchAverageRating = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/ratings/book/${id}/average`);
      setAverageRating(response.data || 0);
    } catch (error) {
      console.error('Error fetching average rating:', error);
    }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      router.push('/login');
      return;
    }

    // UI Validation
    const trimmedReview = reviewText.trim();
    if (!trimmedReview) {
      alert('Please enter a review before submitting.');
      return;
    }
    
    if (trimmedReview.length < 10) {
      alert('Review must be at least 10 characters long.');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const payload = {
        bookId: id,
        review: trimmedReview,
      };
      
      // Include transactionId if available (from return prompt)
      if (completedTransactionId) {
        payload.transactionId = completedTransactionId;
      }
      
      await axios.post(
        `${API_BASE_URL}/reviews`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setReviewText('');
      setCompletedTransactionId(null); // Clear after submission
      fetchReviews();
      alert('Review submitted successfully! It will be reviewed by an admin before being published.');
    } catch (error) {
      console.error('Error submitting review:', error);
      // Clear fields on error
      setReviewText('');
      setCompletedTransactionId(null);
      
      // Handle validation errors gracefully (400 status) - prevent error overlay
      if (error.response?.status === 400) {
        const errorMessage = error.response?.data?.message || 'You can only review books that you have borrowed and returned.';
        alert(errorMessage);
        // Prevent error from propagating to show error overlay
        return;
      } else {
        let errorMessage = 'Failed to submit review';
        if (error.response?.data?.message) {
          errorMessage = error.response.data.message;
        } else if (error.response?.data?.error) {
          errorMessage = error.response.data.error;
        } else if (error.message) {
          errorMessage = error.message;
        }
        alert(errorMessage);
        // Prevent error from propagating
        return;
      }
    }
  };

  const handleRatingSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      router.push('/login');
      return;
    }

    // UI Validation
    if (!rating || rating < 1 || rating > 5) {
      alert('Please select a rating between 1 and 5 stars.');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const payload = {
        bookId: id,
        rating,
      };
      
      // Include transactionId if available (from return prompt)
      if (completedTransactionId) {
        payload.transactionId = completedTransactionId;
      }
      
      await axios.post(
        `${API_BASE_URL}/ratings`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setRating(0);
      setCompletedTransactionId(null); // Clear after submission
      fetchAverageRating();
      alert('Rating submitted successfully!');
    } catch (error) {
      console.error('Error submitting rating:', error);
      // Clear fields on error
      setRating(0);
      setCompletedTransactionId(null);
      
      // Handle validation errors gracefully (400 status) - prevent error overlay
      if (error.response?.status === 400) {
        const errorMessage = error.response?.data?.message || 'You can only rate books that you have borrowed and returned.';
        alert(errorMessage);
        // Prevent error from propagating to show error overlay
        return;
      } else {
        let errorMessage = 'Failed to submit rating';
        if (error.response?.data?.message) {
          errorMessage = error.response.data.message;
        } else if (error.response?.data?.error) {
          errorMessage = error.response.data.error;
        } else if (error.message) {
          errorMessage = error.message;
        }
        alert(errorMessage);
        // Prevent error from propagating
        return;
      }
    }
  };

  const handleBorrow = async () => {
    if (!user) {
      router.push('/login?redirect=/books/' + id);
      return;
    }

    if (borrowing) return; // Prevent multiple clicks

    try {
      setBorrowing(true);
      const token = localStorage.getItem('token');
      
      // Fetch current transactions to check loan limit (prevent unnecessary API call)
      try {
        const transactionsRes = await axios.get(`${API_BASE_URL}/transactions/my-transactions`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const activeLoans = (transactionsRes.data || []).filter(t => 
          t.status === 'active' || t.status === 'pending_return_approval'
        );
        const maxConcurrentLoans = 2; // Gold plan default
        if (activeLoans.length >= maxConcurrentLoans) {
          alert(`You can only borrow ${maxConcurrentLoans} book(s) at a time. You currently have ${activeLoans.length} active loan(s).`);
          setBorrowing(false);
          return;
        }
      } catch (fetchError) {
        // If we can't fetch transactions, still try to borrow (backend will validate)
        console.warn('Could not check loan limit:', fetchError);
      }
      
      await axios.post(
        `${API_BASE_URL}/transactions`,
        { bookId: id, type: 'borrow' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert('Book borrowed successfully!');
      fetchBookDetails(); // Refresh to update availability
    } catch (error) {
      console.error('Error borrowing book:', error);
      alert(error.response?.data?.message || 'Failed to borrow book');
    } finally {
      setBorrowing(false);
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

  if (error || !book) {
    return (
      <Layout>
        <div className="py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <p className="text-red-800">{error || 'Book not found'}</p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;

    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <svg key={i} className="w-5 h-5 text-yellow-400 fill-current" viewBox="0 0 20 20">
          <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
        </svg>
      );
    }

    if (hasHalfStar) {
      stars.push(
        <svg key="half" className="w-5 h-5 text-yellow-400 fill-current" viewBox="0 0 20 20">
          <defs>
            <linearGradient id="half">
              <stop offset="50%" stopColor="currentColor" />
              <stop offset="50%" stopColor="transparent" stopOpacity="1" />
            </linearGradient>
          </defs>
          <path fill="url(#half)" d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
        </svg>
      );
    }

    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <svg key={`empty-${i}`} className="w-5 h-5 text-gray-300 fill-current" viewBox="0 0 20 20">
          <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
        </svg>
      );
    }

    return stars;
  };

  return (
    <Layout>
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Back Button */}
          <button
            onClick={() => router.back()}
            className="mb-6 flex items-center text-gray-600 hover:text-gray-900"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back
          </button>

          {/* Book Header */}
          <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
            <div className="flex flex-col md:flex-row gap-8">
              <div className="flex-1">
                <h1 className="text-4xl font-bold text-gray-900 mb-2">{book.title}</h1>
                <p className="text-2xl text-gray-600 mb-4">by {book.author}</p>
                <div className="flex items-center gap-4 mb-4">
                  <span className="text-sm text-gray-500">ISBN: {book.isbn || 'N/A'}</span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    book.borrowedByMe || book.status === 'with_me'
                      ? 'bg-blue-100 text-blue-800'
                      : (book.status === 'available' || book.isAvailable) 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {book.borrowedByMe || book.status === 'with_me' 
                      ? 'With me' 
                      : (book.status === 'available' || book.isAvailable) 
                      ? 'Available' 
                      : 'Out of Stock'}
                  </span>
                </div>
                <div className="flex items-center gap-2 mb-6">
                  <div className="flex items-center">
                    {renderStars(averageRating)}
                  </div>
                  <span className="text-lg font-semibold text-gray-700">
                    {averageRating > 0 ? averageRating.toFixed(1) : 'No ratings yet'}
                  </span>
                  <span className="text-sm text-gray-500">({reviews.length} {reviews.length === 1 ? 'review' : 'reviews'})</span>
                </div>
                {user && isMember(user) && (
                  <div>
                    <button
                      onClick={handleBorrow}
                      disabled={borrowing || book.borrowedByMe || book.status === 'with_me' || !(book.status === 'available' || book.isAvailable || book.status?.toLowerCase() === 'available') || activeLoans.length >= maxConcurrentLoans}
                      className={`font-semibold py-3 px-6 rounded-lg transition-colors duration-200 ${
                        borrowing
                          ? 'bg-indigo-400 text-white cursor-wait'
                          : book.borrowedByMe || book.status === 'with_me' || !(book.status === 'available' || book.isAvailable || book.status?.toLowerCase() === 'available') || activeLoans.length >= maxConcurrentLoans
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                      }`}
                    >
                      {borrowing ? 'Borrowing...' : activeLoans.length >= maxConcurrentLoans ? `Loan Limit Reached (${activeLoans.length}/${maxConcurrentLoans})` : 'Borrow This Book'}
                    </button>
                    {activeLoans.length >= maxConcurrentLoans && (
                      <p className="mt-2 text-sm text-red-600">
                        You have reached your loan limit. Please return a book before borrowing another.
                      </p>
                    )}
                  </div>
                )}
                {user && isAdminOrLibrarian(user) && (
                  <div className="mt-4 space-y-2">
                    <a
                      href={`/transactions?bookId=${book.id}`}
                      className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200 text-sm"
                    >
                      View Transaction Details
                    </a>
                    <a
                      href={`/settings?tab=manage-books`}
                      className="inline-block bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200 text-sm ml-2"
                    >
                      Edit Book
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Reviews Section */}
          <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Reviews</h2>
            {reviews.length === 0 ? (
              <p className="text-gray-500">No reviews yet. Be the first to review this book!</p>
            ) : (
              <div className="space-y-4">
                {reviews.map((review) => (
                  <div key={review.id} className="border-b border-gray-200 pb-4">
                    <p className="text-gray-700">{review.review}</p>
                    <p className="text-sm text-gray-500 mt-2">
                      {review.createdAt ? new Date(review.createdAt).toLocaleDateString() : ''}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add Review/Rating Section - Only for Members */}
          {user && isMember(user) && (
            <div id="rating-section" className="bg-white rounded-lg shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Share Your Thoughts</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Review Form */}
                <div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-4">Write a Review</h3>
                  <form onSubmit={handleReviewSubmit} className="space-y-4">
                    <textarea
                      value={reviewText}
                      onChange={(e) => setReviewText(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Write your review here (minimum 10 characters)..."
                      rows="5"
                      minLength={10}
                      required
                    />
                    <button
                      type="submit"
                      className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors duration-200"
                    >
                      Submit Review
                    </button>
                  </form>
                </div>

                {/* Rating Form */}
                <div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-4">Rate this Book</h3>
                  <form onSubmit={handleRatingSubmit} className="space-y-4">
                    <select
                      value={rating}
                      onChange={(e) => setRating(Number(e.target.value))}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    >
                      <option value={0} disabled>Select a rating (required)</option>
                      <option value={1}>1 - Poor</option>
                      <option value={2}>2 - Fair</option>
                      <option value={3}>3 - Good</option>
                      <option value={4}>4 - Very Good</option>
                      <option value={5}>5 - Excellent</option>
                    </select>
                    <button
                      type="submit"
                      className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors duration-200"
                    >
                      Submit Rating
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}

          {!user && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
              <p className="text-blue-800 mb-4">Please log in to leave a review or rate this book.</p>
              <button
                onClick={() => router.push('/login?redirect=/books/' + id)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors duration-200"
              >
                Log In
              </button>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

export default withAuth(BookDetailsPage);

