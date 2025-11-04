import { useState, useEffect } from 'react';
import axios from 'axios';
import { withAuth } from '@/hoc/withAuth';
import { MemberRole } from '@/types/member.interface';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

function AdminBooksPage() {
  const [books, setBooks] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    isbn: '',
    count: 1,
    status: 'Available',
    forSale: false,
    price: 0,
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchBooks();
  }, []);

  const fetchBooks = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/books`);
      setBooks(response.data);
    } catch (err) {
      setError('Failed to fetch books.');
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await axios.post(`${API_BASE_URL}/books`, formData);
      fetchBooks();
      setFormData({
        title: '',
        author: '',
        isbn: '',
        count: 1,
        status: 'Available',
        forSale: false,
        price: 0,
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add book.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Manage Books</h1>
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Add New Book</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-red-500">{error}</p>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="Title"
              className="p-2 border rounded"
              required
            />
            <input
              type="text"
              name="author"
              value={formData.author}
              onChange={handleChange}
              placeholder="Author"
              className="p-2 border rounded"
              required
            />
            <input
              type="text"
              name="isbn"
              value={formData.isbn}
              onChange={handleChange}
              placeholder="ISBN"
              className="p-2 border rounded"
            />
            <input
              type="number"
              name="count"
              value={formData.count}
              onChange={handleChange}
              placeholder="Count"
              className="p-2 border rounded"
              min="1"
            />
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="p-2 border rounded"
            >
              <option value="New">New</option>
              <option value="Available">Available</option>
              <option value="Borrowed">Borrowed</option>
              <option value="Reserved">Reserved</option>
              <option value="Damaged">Damaged</option>
              <option value="OnSale">On Sale</option>
            </select>
            <div className="flex items-center">
              <input
                type="checkbox"
                name="forSale"
                checked={formData.forSale}
                onChange={handleChange}
                className="mr-2"
              />
              <label>For Sale</label>
            </div>
            {formData.forSale && (
              <input
                type="number"
                name="price"
                value={formData.price}
                onChange={handleChange}
                placeholder="Price"
                className="p-2 border rounded"
                min="0"
              />
            )}
          </div>
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-500 text-white p-2 rounded"
          >
            {loading ? 'Adding...' : 'Add Book'}
          </button>
        </form>
      </div>
      <div>
        <h2 className="text-xl font-semibold mb-2">Existing Books</h2>
        <table className="min-w-full bg-white">
          <thead>
            <tr>
              <th className="py-2">Title</th>
              <th className="py-2">Author</th>
              <th className="py-2">ISBN</th>
              <th className="py-2">Count</th>
              <th className="py-2">Status</th>
              <th className="py-2">For Sale</th>
              <th className="py-2">Price</th>
            </tr>
          </thead>
          <tbody>
            {books.map((book) => (
              <tr key={book.id}>
                <td className="border px-4 py-2">{book.title}</td>
                <td className="border px-4 py-2">{book.author}</td>
                <td className="border px-4 py-2">{book.isbn}</td>
                <td className="border px-4 py-2">{book.count}</td>
                <td className="border px-4 py-2">{book.status}</td>
                <td className="border px-4 py-2">{book.forSale ? 'Yes' : 'No'}</td>
                <td className="border px-4 py-2">{book.price}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default withAuth(AdminBooksPage, [MemberRole.ADMIN]);
