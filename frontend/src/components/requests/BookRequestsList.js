import { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export default function BookRequestsList({ requests, isAdmin = false, onUpdate }) {
  const { user } = useAuth();
  const [error, setError] = useState('');

  const handleStatusChange = async (id, status) => {
    setError('');
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`${API_BASE_URL}/book-requests/${id}`, { status }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      onUpdate();
    } catch (err) {
      setError('Failed to update the request status.');
    }
  };

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-lg">
      <ul className="divide-y divide-gray-200">
        {requests.map((request) => (
          <li key={request.id}>
            <div className="px-4 py-4 sm:px-6">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-primary-600 truncate">{request.title}</p>
                <div className="ml-2 flex-shrink-0 flex">
                  <p className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    request.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    request.status === 'approved' ? 'bg-green-100 text-green-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {request.status}
                  </p>
                </div>
              </div>
              <div className="mt-2 sm:flex sm:justify-between">
                <div className="sm:flex">
                  <p className="flex items-center text-sm text-gray-500">
                    {request.author}
                  </p>
                  {isAdmin && (
                    <p className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 sm:ml-6">
                      Requested by: {request.requestedBy.email}
                    </p>
                  )}
                </div>
                <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                  {new Date(request.createdAt).toLocaleDateString()}
                  {isAdmin && (
                    <div className="ml-4">
                      <select
                        onChange={(e) => handleStatusChange(request.id, e.target.value)}
                        defaultValue={request.status}
                        className="text-xs border-gray-300 rounded"
                      >
                        <option value="pending">Pending</option>
                        <option value="approved">Approve</option>
                        <option value="rejected">Reject</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
      {error && <p className="text-red-500 text-sm p-4">{error}</p>}
    </div>
  );
}
