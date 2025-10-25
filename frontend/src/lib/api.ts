const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export async function fetchWithAuth(endpoint: string, options: RequestInit = {}) {
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
    const error = await response.json();
    throw new Error(error.message || 'An error occurred');
  }

  return response.json();
}

export const api = {
  // Auth
  login: (email: string, password: string) =>
    fetchWithAuth('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  // Books
  getBooks: () => fetchWithAuth('/books'),
  getBook: (id: string) => fetchWithAuth(`/books/${id}`),
  createBook: (data: any) =>
    fetchWithAuth('/books', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateBook: (id: string, data: any) =>
    fetchWithAuth(`/books/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  deleteBook: (id: string) =>
    fetchWithAuth(`/books/${id}`, {
      method: 'DELETE',
    }),

  // Users
  getUsers: () => fetchWithAuth('/users'),
  getUser: (id: string) => fetchWithAuth(`/users/${id}`),
  createUser: (data: any) =>
    fetchWithAuth('/users', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateUser: (id: string, data: any) =>
    fetchWithAuth(`/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  deleteUser: (id: string) =>
    fetchWithAuth(`/users/${id}`, {
      method: 'DELETE',
    }),

  // Loans
  createLoan: (data: any) =>
    fetchWithAuth('/loans', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  returnBook: (id: string) =>
    fetchWithAuth(`/loans/${id}/return`, {
      method: 'POST',
    }),
  getLoanHistory: () => fetchWithAuth('/loans/history'),
};
