const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

interface LoginData {
  email: string;
  password: string;
}

interface BookData {
  title: string;
  author: string;
  isbn: string;
  publishedYear: number;
  quantity: number;
}

interface LoanData {
  bookId: string;
  userId: string;
  dueDate: string;
}

interface ReturnData {
  loanId: string;
  condition: string;
}

async function request(endpoint: string, options: RequestInit = {}) {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
}

// Auth
export const login = (data: LoginData) => 
  request('/auth/login', {
    method: 'POST',
    body: JSON.stringify(data),
  });

// Books
export const getBooks = () => 
  request('/books');

export const getBook = (id: string) => 
  request(`/books/${id}`);

export const createBook = (data: BookData) => 
  request('/books', {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const updateBook = (id: string, data: Partial<BookData>) => 
  request(`/books/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });

export const deleteBook = (id: string) => 
  request(`/books/${id}`, {
    method: 'DELETE',
  });

// Loans
export const createLoan = (data: LoanData) => 
  request('/loans', {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const returnBook = (data: ReturnData) => 
  request('/loans/return', {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const getUserLoans = () => 
  request('/loans/user');

export const getLoanHistory = () => 
  request('/loans/history');

// Notifications
export const getNotifications = () => 
  request('/notifications');

export const markNotificationAsRead = (id: string) => 
  request(`/notifications/${id}/read`, {
    method: 'POST',
  });

// Users
export const getProfile = () => 
  request('/users/profile');

export const updateProfile = (data: any) => 
  request('/users/profile', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });

export const searchUsers = (query: string) => 
  request(`/users/search?q=${encodeURIComponent(query)}`);

const api = {
  login,
  getBooks,
  getBook,
  createBook,
  updateBook,
  deleteBook,
  createLoan,
  returnBook,
  getUserLoans,
  getLoanHistory,
  getNotifications,
  markNotificationAsRead,
  getProfile,
  updateProfile,
  searchUsers,
};

export default api;
