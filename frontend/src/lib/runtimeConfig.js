/**
 * Runtime endpoint overrides for Capacitor / LAN testing.
 * Bake-time Next env is the default; window.__LIBRARY_RUNTIME__ wins when set
 * (from mobile shell localStorage hydrate or an injected script).
 */

const STORAGE_KEY = 'library_runtime_v1';

export function readStoredRuntime() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function persistRuntime(runtime) {
  if (typeof window === 'undefined' || !runtime) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(runtime));
    window.__LIBRARY_RUNTIME__ = { ...(window.__LIBRARY_RUNTIME__ || {}), ...runtime };
  } catch {
    /* ignore quota / private mode */
  }
}

/** Call once on app boot (client). */
export function hydrateLibraryRuntime() {
  if (typeof window === 'undefined') return null;
  const stored = readStoredRuntime();
  if (stored) {
    window.__LIBRARY_RUNTIME__ = { ...(window.__LIBRARY_RUNTIME__ || {}), ...stored };
  }
  return window.__LIBRARY_RUNTIME__ || null;
}

export function getLibraryRuntime() {
  if (typeof window !== 'undefined' && window.__LIBRARY_RUNTIME__) {
    return window.__LIBRARY_RUNTIME__;
  }
  return readStoredRuntime();
}

export function getApiBaseUrl() {
  const runtime = getLibraryRuntime();
  return (
    runtime?.apiUrl ||
    process.env.NEXT_PUBLIC_API_URL ||
    'http://localhost:4000/api'
  );
}

export function getKeycloakPublicUrl() {
  const runtime = getLibraryRuntime();
  return (
    runtime?.keycloakUrl ||
    process.env.NEXT_PUBLIC_KEYCLOAK_URL ||
    'http://localhost:3510'
  );
}
