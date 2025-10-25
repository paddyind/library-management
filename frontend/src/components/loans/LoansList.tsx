import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

interface Loan {
  id: string;
  book: {
    id: string;
    title: string;
    author: string;
  };
  borrower: {
    id: string;
    name: string;
    email: string;
  };
  issueDate: string;
  dueDate: string;
  returnDate?: string;
  fineAmount: number;
}

export function LoansList() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadLoans();
  }, []);

  const loadLoans = async () => {
    try {
      const data = await api.getLoanHistory();
      setLoans(data);
    } catch (err) {
      setError('Failed to load loans');
    } finally {
      setLoading(false);
    }
  };

  const handleReturn = async (loanId: string) => {
    try {
      await api.returnBook(loanId);
      loadLoans();
    } catch (err) {
      setError('Failed to return book');
    }
  };

  const calculateStatus = (loan: Loan) => {
    if (loan.returnDate) return 'Returned';
    const dueDate = new Date(loan.dueDate);
    const today = new Date();
    return today > dueDate ? 'Overdue' : 'Active';
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Book
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Borrower
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Issue Date
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Due Date
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Fine
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {loans.map((loan) => (
            <tr key={loan.id}>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900">{loan.book.title}</div>
                <div className="text-sm text-gray-500">{loan.book.author}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900">{loan.borrower.name}</div>
                <div className="text-sm text-gray-500">{loan.borrower.email}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {new Date(loan.issueDate).toLocaleDateString()}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {new Date(loan.dueDate).toLocaleDateString()}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span
                  className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    calculateStatus(loan) === 'Returned'
                      ? 'bg-green-100 text-green-800'
                      : calculateStatus(loan) === 'Overdue'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}
                >
                  {calculateStatus(loan)}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                ₹{loan.fineAmount}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                {!loan.returnDate && (
                  <button
                    onClick={() => handleReturn(loan.id)}
                    className="text-indigo-600 hover:text-indigo-900"
                  >
                    Return
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
