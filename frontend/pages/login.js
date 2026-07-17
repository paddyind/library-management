import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../src/contexts/AuthContext';
import Link from 'next/link';
import AuthLayout from '../src/components/AuthLayout';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { login, loginWithKeycloak, keycloakMode } = useAuth();

  useEffect(() => {
    if (router.query.registered === 'true') {
      setSuccess('Registration successful! Please sign in with your credentials.');
    }

    if (router.query.error === 'PROFILE_MISSING') {
      const message = router.query.message || 'Your account profile is missing. Please contact support or try logging in again.';
      setError(message);
    }
  }, [router.query]);

  const handleKeycloakLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const redirect = typeof router.query.redirect === 'string' ? router.query.redirect : '/dashboard';
      await loginWithKeycloak(redirect);
    } catch (err) {
      setError(err.message || 'Keycloak sign-in failed');
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
        <div className="mt-8 space-y-6">
          {success && <p className="text-sm text-green-700 bg-green-50 p-3 rounded-md">{success}</p>}
          {error && <p className="text-sm text-red-700 bg-red-50 p-3 rounded-md">{error}</p>}
          <button
            type="button"
            onClick={handleKeycloakLogin}
            disabled={loading}
            className="w-full py-2 px-4 border border-transparent rounded-md text-white bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400"
          >
            {loading ? 'Redirecting…' : 'Sign in with Keycloak'}
          </button>
          <p className="text-center text-sm text-gray-600">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="font-medium text-primary-600 hover:text-primary-500">
              Register via Keycloak
            </Link>
          </p>
          <p className="text-center text-sm text-gray-600">
            <Link href="/" className="font-medium text-primary-600 hover:text-primary-500">
              Browse books without signing in
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
