import { useState, useEffect, useContext, createContext, useCallback } from 'react';
import axios from 'axios';
import { getKeycloak, getKeycloakRegisterUrl, isKeycloakMode } from '../lib/keycloak';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const keycloakMode = isKeycloakMode();

  const fetchProfile = useCallback(async (token) => {
    const response = await axios.get(`${API_BASE_URL}/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setUser(response.data);
    return response.data;
  }, []);

  const persistToken = (token) => {
    localStorage.setItem('token', token);
  };

  const clearSession = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      if (keycloakMode) {
        const keycloak = getKeycloak();
        if (!keycloak) {
          setLoading(false);
          return;
        }

        try {
          const authenticated = await keycloak.init({
            onLoad: 'check-sso',
            pkceMethod: 'S256',
            checkLoginIframe: false,
          });

          if (cancelled) return;

          if (authenticated && keycloak.token) {
            persistToken(keycloak.token);
            await fetchProfile(keycloak.token);
          } else {
            const saved = localStorage.getItem('token');
            if (saved) {
              try {
                await fetchProfile(saved);
              } catch {
                clearSession();
              }
            }
          }
        } catch (error) {
          console.error('Keycloak init failed:', error.message);
          clearSession();
        } finally {
          if (!cancelled) setLoading(false);
        }
        return;
      }

      const token = localStorage.getItem('token');
      if (token) {
        try {
          await fetchProfile(token);
        } catch (error) {
          const errorCode = error.response?.data?.code;
          const errorMessage = error.response?.data?.message || '';

          if (errorCode === 'PROFILE_MISSING' || errorMessage.includes('profile is missing')) {
            clearSession();
            if (typeof window !== 'undefined') {
              const message = errorMessage || 'Your account profile is missing. Please contact support.';
              window.location.href = `/login?error=${encodeURIComponent('PROFILE_MISSING')}&message=${encodeURIComponent(message)}`;
            }
          } else {
            clearSession();
          }
        }
      }
      if (!cancelled) setLoading(false);
    }

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, [keycloakMode, fetchProfile]);

  const login = async (email, password) => {
    if (keycloakMode) {
      const keycloak = getKeycloak();
      await keycloak.login({
        redirectUri: `${window.location.origin}/dashboard`,
      });
      return null;
    }

    const response = await axios.post(`${API_BASE_URL}/auth/login`, { email, password });
    const { access_token, user: userData } = response.data;
    persistToken(access_token);

    try {
      const profile = await fetchProfile(access_token);
      return { ...response.data, user: profile };
    } catch (error) {
      console.warn('Failed to fetch profile after login, using login response data:', error.message);
      setUser(userData);
      return response.data;
    }
  };

  const loginWithKeycloak = async (redirectPath = '/dashboard') => {
    const keycloak = getKeycloak();
    await keycloak.login({
      redirectUri: `${window.location.origin}${redirectPath}`,
    });
  };

  const signUp = async (userData) => {
    if (keycloakMode) {
      window.location.href = getKeycloakRegisterUrl();
      return { data: null, error: null };
    }

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

  const logout = async () => {
    if (keycloakMode) {
      const keycloak = getKeycloak();
      clearSession();
      await keycloak.logout({ redirectUri: `${window.location.origin}/` });
      return;
    }
    clearSession();
  };

  const getAccessToken = () => {
    if (keycloakMode) {
      const keycloak = getKeycloak();
      return keycloak?.token || localStorage.getItem('token');
    }
    return localStorage.getItem('token');
  };

  const value = {
    user,
    loading,
    login,
    loginWithKeycloak,
    signUp,
    logout,
    getAccessToken,
    keycloakMode,
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
