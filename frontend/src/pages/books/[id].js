import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import Layout from '@/components/layout/Layout';
import { useAuth } from '@/contexts/AuthContext';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export default function BookDetailsPage() {
  const router = useRouter();
  const { id } = router.query;
  const [book, setBook] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [averageRating, setAverageRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [rating, setRating] = useState(0);
  const { user, token } = useAuth();

  useEffect(() => {
    if (id) {
      fetchBookDetails();
      fetchReviews();
      fetchAverageRating();
    }
  }, [id]);

  const fetchBookDetails = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/books/${id}`);
      setBook(response.data);
    } catch (error) {
      console.error('Error fetching book details:', error);
    }
  };

  const fetchReviews = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/reviews/book/${id}`);
      setReviews(response.data);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    }
  };

  const fetchAverageRating = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/ratings/book/${id}/average`);
      setAverageRating(response.data);
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

    try {
      await axios.post(
        `${API_BASE_URL}/reviews`,
        { bookId: id, review: reviewText },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setReviewText('');
      fetchReviews();
    } catch (error) {
      console.error('Error submitting review:', error);
    }
  };

  const handleRatingSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      router.push('/login');
      return;
    }

    try {
      await axios.post(
        `${API_BASE_URL}/ratings`,
        { bookId: id, rating },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setRating(0);
      fetchAverageRating();
    } catch (error) {
      console.error('Error submitting rating:', error);
    }
  };

  if (!book) {
    return <div>Loading...</div>;
  }

  return (
    <Layout>
      <div className="container mx-auto p-4">
        <h1 className="text-3xl font-bold mb-4">{book.title}</h1>
        <p className="text-xl text-gray-600 mb-2">by {book.author}</p>
        <p className="text-gray-700 mb-4">{book.isbn}</p>
        <div className="mb-4">
          <strong>Average Rating:</strong> {averageRating.toFixed(1)} / 5
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h2 className="text-2xl font-semibold mb-4">Reviews</h2>
            <ul>
              {reviews.map((review) => (
                <li key={review.id} className="border-b py-2">
                  <p>{review.review}</p>
                </li>
              ))}
            </ul>
          </div>
          <div>
            {user && (
              <>
                <h2 className="text-2xl font-semibold mb-4">Leave a Review</h2>
                <form onSubmit={handleReviewSubmit} className="space-y-4">
                  <textarea
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    className="w-full p-2 border rounded"
                    placeholder="Write your review here..."
                    required
                  ></textarea>
                  <button type="submit" className="bg-blue-500 text-white p-2 rounded">
                    Submit Review
                  </button>
                </form>

                <h2 className="text-2xl font-semibold mt-8 mb-4">Rate this Book</h2>
                <form onSubmit={handleRatingSubmit} className="space-y-4">
                  <select
                    value={rating}
                    onChange={(e) => setRating(Number(e.target.value))}
                    className="w-full p-2 border rounded"
                    required
                  >
                    <option value={0} disabled>Select a rating</option>
                    <option value={1}>1 - Poor</option>
                    <option value={2}>2 - Fair</option>
                    <option value={3}>3 - Good</option>
                    <option value={4}>4 - Very Good</option>
                    <option value={5}>5 - Excellent</option>
                  </select>
                  <button type="submit" className="bg-blue-500 text-white p-2 rounded">
                    Submit Rating
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
