import { useState, useEffect, useContext, createContext } from 'react';
import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    if (token) {
      // Verify token and get user info
      axios
        .get(`${API_BASE_URL}/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        .then((response) => {
          setUser(response.data);
          setLoading(false);
        })
        .catch(() => {
          localStorage.removeItem('token');
          setUser(null);
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const response = await axios.post(`${API_BASE_URL}/auth/login`, {
      email,
      password,
    });
    const { access_token, user: userData } = response.data;
    localStorage.setItem('token', access_token);
    
    // Immediately fetch full profile to ensure we have complete user data (name, role, etc.)
    try {
      const profileResponse = await axios.get(`${API_BASE_URL}/profile`, {
        headers: { Authorization: `Bearer ${access_token}` },
      });
      setUser(profileResponse.data);
      return { ...response.data, user: profileResponse.data };
    } catch (error) {
      // If profile fetch fails, use login response data as fallback
      console.warn('Failed to fetch profile after login, using login response data:', error.message);
      setUser(userData);
      return response.data;
    }
  };

  const signUp = async (userData) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/register`, {
        email: userData.email,
        password: userData.password,
        name: userData.name,
      });
      return { data: response.data, error: null };
    } catch (error) {
      return {
        data: null,
        error: {
          message: error.response?.data?.message || error.message || 'Failed to register',
        },
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  const value = {
    user,
    loading,
    login,
    signUp,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;

