import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import AuthLayout from '../src/components/AuthLayout';
import { useAuth } from '../src/contexts/AuthContext';

/**
 * Keycloak mode: kick off adapter register() (PKCE-safe).
 * Legacy mode: kept as a thin redirect to the old form is no longer needed —
 * this page only handles Keycloak; legacy users use /login form.
 */
export default function Register() {
  const { keycloakMode, registerWithKeycloak, user } = useAuth();
  const router = useRouter();
  const [error, setError] = useState('');
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (!keycloakMode) {
      router.replace('/login');
      return;
    }
    if (user) {
      router.replace('/dashboard');
      return;
    }
    if (started) return;

    setStarted(true);
    registerWithKeycloak('/dashboard').catch((err) => {
      setError(err.message || 'Could not open Keycloak registration');
      setStarted(false);
    });
  }, [keycloakMode, user, registerWithKeycloak, router, started]);

  return (
    <AuthLayout title="Create your account">
      <div className="mt-8 space-y-4 text-center">
        {error ? (
          <>
            <p className="text-sm text-red-700 bg-red-50 p-3 rounded-md">{error}</p>
            <button
              type="button"
              onClick={() => {
                setError('');
                setStarted(false);
              }}
              className="text-primary-600 font-medium hover:text-primary-500"
            >
              Try again
            </button>
          </>
        ) : (
          <p className="text-gray-600">Redirecting to Keycloak to create your account…</p>
        )}
        <p className="text-sm">
          <Link href="/login" className="text-primary-600 hover:text-primary-500">
            Back to sign in
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
