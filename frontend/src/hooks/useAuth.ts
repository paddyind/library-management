import { useState } from 'react';

interface AuthState {
  isAuthenticated: boolean;
  token: string | null;
  user: any | null;
}

interface AuthResponse {
  token: string;
  user: any;
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    token: null,
    user: null,
  });

  const login = async (email: string, password: string) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        throw new Error('Login failed');
      }

      const data: AuthResponse = await response.json();
      setAuthState({
        isAuthenticated: true,
        token: data.token,
        user: data.user,
      });

      // Store token in localStorage
      localStorage.setItem('token', data.token);
      return data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = () => {
    setAuthState({
      isAuthenticated: false,
      token: null,
      user: null,
    });
    localStorage.removeItem('token');
  };

  const checkAuth = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      return false;
    }

    try {
      const response = await fetch('/api/auth/verify', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Token verification failed');
      }

      const data = await response.json();
      setAuthState({
        isAuthenticated: true,
        token,
        user: data.user,
      });
      return true;
    } catch (error) {
      console.error('Auth check error:', error);
      logout();
      return false;
    }
  };

  return {
    ...authState,
    login,
    logout,
    checkAuth,
  };
}
