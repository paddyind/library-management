import { useState, useEffect, useContext, createContext, useCallback, useRef } from 'react';
import axios from 'axios';
import {
  consumePostLoginRedirect,
  getKeycloak,
  initKeycloak,
  isKeycloakMode,
  loginWithKeycloak as startKeycloakLogin,
  logoutFromKeycloak,
  registerWithKeycloak as startKeycloakRegister,
} from '../lib/keycloak';
import { getApiBaseUrl, getKeycloakPublicUrl } from '../lib/runtimeConfig';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);
  const keycloakMode = isKeycloakMode();
  const refreshTimer = useRef(null);

  const clearSession = useCallback(() => {
    localStorage.removeItem('token');
    setUser(null);
    if (refreshTimer.current) {
      clearInterval(refreshTimer.current);
      refreshTimer.current = null;
    }
  }, []);

  const fetchProfile = useCallback(async (token) => {
    const response = await axios.get(`${getApiBaseUrl()}/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setUser(response.data);
    setAuthError(null);
    return response.data;
  }, []);

  const persistToken = useCallback((token) => {
    if (token) localStorage.setItem('token', token);
  }, []);

  const setupTokenRefresh = useCallback((keycloak) => {
    if (refreshTimer.current) clearInterval(refreshTimer.current);
    refreshTimer.current = setInterval(async () => {
      try {
        const refreshed = await keycloak.updateToken(30);
        if (refreshed && keycloak.token) {
          persistToken(keycloak.token);
        }
      } catch {
        clearSession();
      }
    }, 20_000);
  }, [clearSession, persistToken]);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      if (keycloakMode) {
        try {
          const { authenticated, keycloak } = await initKeycloak();
          if (cancelled) return;

          if (authenticated && keycloak?.token) {
            persistToken(keycloak.token);
            setupTokenRefresh(keycloak);
            try {
              await fetchProfile(keycloak.token);
            } catch (profileError) {
              console.error('Profile fetch after Keycloak auth failed:', profileError.message);
              setAuthError(
                profileError.response?.data?.message ||
                  'Signed in with Keycloak, but your library profile could not be loaded. Try again or contact support.',
              );
              // Keep Keycloak session; user may retry profile
            }
          } else {
            clearSession();
          }
        } catch (error) {
          console.error('Keycloak init failed:', error?.message || error);
          if (!cancelled) {
            clearSession();
            const cfgUrl = getKeycloakPublicUrl();
            const detail = error?.message || String(error || '');
            setAuthError(
              detail.toLowerCase().includes('web crypto')
                ? detail
                : detail.toLowerCase().includes('initialized once')
                ? 'Sign-in client needed a reset. Click “Sign in with Keycloak” again.'
                : `Could not reach the sign-in service at ${cfgUrl}. ${
                    detail ? `(${detail}) ` : ''
                  }Confirm identity-platform is running and this device can open that URL.`,
            );
          }
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
          clearSession();
          if (errorCode === 'PROFILE_MISSING' || errorMessage.includes('profile is missing')) {
            if (typeof window !== 'undefined') {
              window.location.href = `/login?error=${encodeURIComponent('PROFILE_MISSING')}&message=${encodeURIComponent(errorMessage || 'Your account profile is missing.')}`;
            }
          }
        }
      }
      if (!cancelled) setLoading(false);
    }

    bootstrap();
    return () => {
      cancelled = true;
      if (refreshTimer.current) clearInterval(refreshTimer.current);
    };
  }, [keycloakMode, fetchProfile, persistToken, clearSession, setupTokenRefresh]);

  const login = async (email, password) => {
    if (keycloakMode) {
      await startKeycloakLogin('/dashboard');
      return null;
    }

    const response = await axios.post(`${getApiBaseUrl()}/auth/login`, { email, password });
    const { access_token, user: userData } = response.data;
    persistToken(access_token);

    try {
      const profile = await fetchProfile(access_token);
      return { ...response.data, user: profile };
    } catch (error) {
      setUser(userData);
      return response.data;
    }
  };

  const loginWithKeycloak = async (redirectPath = '/dashboard') => {
    setAuthError(null);
    await startKeycloakLogin(redirectPath);
  };

  const registerWithKeycloak = async (redirectPath = '/dashboard', options = {}) => {
    setAuthError(null);
    await startKeycloakRegister(redirectPath, options);
  };

  const signUp = async (userData) => {
    if (keycloakMode) {
      await startKeycloakRegister('/dashboard');
      return { data: null, error: null };
    }

    try {
      const response = await axios.post(`${getApiBaseUrl()}/auth/register`, {
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
      clearSession();
      await logoutFromKeycloak();
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

  const finishKeycloakRedirect = useCallback(() => consumePostLoginRedirect('/dashboard'), []);

  const value = {
    user,
    loading,
    authError,
    setAuthError,
    login,
    loginWithKeycloak,
    registerWithKeycloak,
    signUp,
    logout,
    getAccessToken,
    keycloakMode,
    finishKeycloakRedirect,
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
