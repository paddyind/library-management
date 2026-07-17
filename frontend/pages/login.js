import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../src/contexts/AuthContext';
import Link from 'next/link';
import AuthLayout from '../src/components/AuthLayout';
import {
  consumePostAuthMessage,
  describeAuthError,
} from '../src/lib/keycloak';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState('');
  const redirectedRef = useRef(false);
  const messagesHandledRef = useRef(false);
  const resumeRegisterRef = useRef(false);
  const router = useRouter();
  const {
    user,
    login,
    loginWithKeycloak,
    registerWithKeycloak,
    keycloakMode,
    authError,
    finishKeycloakRedirect,
  } = useAuth();

  // After Keycloak returns here with a session, continue to the intended page
  useEffect(() => {
    if (!router.isReady || !keycloakMode) return;

    if (user && !redirectedRef.current) {
      redirectedRef.current = true;
      const target = finishKeycloakRedirect();
      router.replace(target);
      return;
    }

    // Resume registration after SSO logout (?action=register)
    if (router.query.action === 'register' && !resumeRegisterRef.current) {
      resumeRegisterRef.current = true;
      setLoading(true);
      setInfo('Opening Keycloak registration…');
      router.replace('/login', undefined, { shallow: true });
      registerWithKeycloak('/dashboard', { skipLogout: true }).catch((err) => {
        setError(err.message || 'Could not open registration');
        setLoading(false);
        resumeRegisterRef.current = false;
      });
      return;
    }

    if (messagesHandledRef.current || resumeRegisterRef.current) return;
    messagesHandledRef.current = true;

    const oidcError = typeof router.query.error === 'string' ? router.query.error : '';
    const oidcDesc = typeof router.query.error_description === 'string' ? router.query.error_description : '';

    if (oidcError && oidcError !== 'PROFILE_MISSING') {
      setError(describeAuthError(oidcError, oidcDesc));
      router.replace('/login', undefined, { shallow: true });
      return;
    }

    if (router.query.error === 'PROFILE_MISSING') {
      setError(
        typeof router.query.message === 'string'
          ? router.query.message
          : 'Your account profile is missing. Please contact support or try signing in again.',
      );
      return;
    }

    const welcome = consumePostAuthMessage();
    if (welcome) {
      setSuccess(welcome);
    }

    setInfo(
      'Sign in with an existing Keycloak account, or create a new one. Migrated users may need to set a new password on first sign-in.',
    );
  }, [router.isReady, user, keycloakMode, finishKeycloakRedirect, router, registerWithKeycloak]);

  useEffect(() => {
    if (authError) setError(describeAuthError('auth', authError) || authError);
  }, [authError]);

  const handleKeycloakLogin = async () => {
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const redirect =
        typeof router.query.redirect === 'string' && !router.query.redirect.includes('state=')
          ? router.query.redirect
          : '/dashboard';
      await loginWithKeycloak(redirect);
    } catch (err) {
      setError(err.message || 'Keycloak sign-in failed');
      setLoading(false);
    }
  };

  const handleKeycloakRegister = async () => {
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await registerWithKeycloak('/dashboard');
    } catch (err) {
      setError(err.message || 'Keycloak registration failed');
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await login(email, password);
      router.push(typeof router.query.redirect === 'string' ? router.query.redirect : '/dashboard');
    } catch (err) {
      const errorCode = err.response?.data?.code;
      if (errorCode === 'PROFILE_MISSING') {
        setError('Your account profile is missing. Please contact support or try logging in again.');
      } else {
        setError(err.response?.data?.message || err.message || 'Invalid email or password. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (keycloakMode) {
    return (
      <AuthLayout title="Sign in to your account">
        <div className="mt-8 space-y-4">
          {info && !error && (
            <p className="text-sm text-gray-600 bg-gray-50 border border-gray-100 p-3 rounded-md">{info}</p>
          )}
          {success && (
            <p className="text-sm text-green-800 bg-green-50 border border-green-100 p-3 rounded-md">{success}</p>
          )}
          {error && (
            <p className="text-sm text-red-800 bg-red-50 border border-red-100 p-3 rounded-md">{error}</p>
          )}

          <button
            type="button"
            onClick={handleKeycloakLogin}
            disabled={loading}
            className="w-full py-2.5 px-4 border border-transparent rounded-md text-white bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 font-medium"
          >
            {loading ? 'Redirecting to Keycloak…' : 'Sign in with Keycloak'}
          </button>

          <button
            type="button"
            onClick={handleKeycloakRegister}
            disabled={loading}
            className="w-full py-2.5 px-4 border border-primary-200 rounded-md text-primary-700 bg-white hover:bg-primary-50 disabled:bg-gray-100 font-medium"
          >
            Create an account
          </button>

          <p className="text-center text-sm text-gray-500 pt-2">
            Already have a Keycloak account? Use <strong>Sign in with Keycloak</strong>.
            To register a different email, use <strong>Create an account</strong> (you will be signed out of any existing Keycloak session first).
          </p>

          <p className="text-center text-sm text-gray-600">
            <Link href="/" className="font-medium text-primary-600 hover:text-primary-500">
              Cancel and browse without signing in
            </Link>
          </p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Sign in to your account">
      <>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {success && (
            <div className="rounded-md bg-green-50 p-4">
              <p className="text-sm font-medium text-green-800">{success}</p>
            </div>
          )}
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <p className="text-sm font-medium text-red-800">{error}</p>
            </div>
          )}
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email" className="sr-only">Email address</label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                placeholder="Email address"
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                placeholder="Password"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm">
              <Link href="/forgot-password" className="font-medium text-primary-600 hover:text-primary-500">
                Forgot your password?
              </Link>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white ${
                loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-primary-600 hover:bg-primary-700'
              }`}
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-600">
              Don&apos;t have an account?{' '}
              <Link href="/register" className="font-medium text-primary-600 hover:text-primary-500">
                Register here
              </Link>
            </p>
            <p className="mt-2 text-sm text-gray-600">
              <Link href="/" className="font-medium text-primary-600 hover:text-primary-500">
                Browse books without signing in
              </Link>
            </p>
          </div>
        </form>
      </>
    </AuthLayout>
  );
}
