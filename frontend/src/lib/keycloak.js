import Keycloak from 'keycloak-js';
import {
  describeInsecureOriginHint,
  ensureWebCryptoForPkce,
} from './ensureWebCrypto';

function resolveKeycloakConfig() {
  // Prefer bake-time Next env; allow Capacitor / localStorage runtime override.
  const runtime =
    typeof window !== 'undefined'
      ? window.__LIBRARY_RUNTIME__ ||
        (() => {
          try {
            const raw = localStorage.getItem('library_runtime_v1');
            return raw ? JSON.parse(raw) : null;
          } catch {
            return null;
          }
        })()
      : null;

  return {
    url:
      runtime?.keycloakUrl ||
      process.env.NEXT_PUBLIC_KEYCLOAK_URL ||
      'http://localhost:3510',
    realm:
      runtime?.keycloakRealm ||
      process.env.NEXT_PUBLIC_KEYCLOAK_REALM ||
      'library',
    clientId:
      runtime?.keycloakClientId ||
      process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID ||
      'library-frontend',
  };
}

/** Stable page that runs keycloak.init() and completes the OIDC code exchange. */
export const AUTH_CALLBACK_PATH = '/login';

const POST_LOGIN_KEY = 'library_post_login_redirect';
const POST_AUTH_MESSAGE_KEY = 'library_post_auth_message';
const PENDING_REGISTER_KEY = 'library_pending_register';

let keycloakInstance = null;
let initPromise = null;

export function isKeycloakMode() {
  return (process.env.NEXT_PUBLIC_IAM_PROVIDER || 'legacy').toLowerCase() === 'keycloak';
}

export function getKeycloakConfig() {
  return resolveKeycloakConfig();
}

function resetKeycloakClient() {
  keycloakInstance = null;
  initPromise = null;
}

export function getKeycloak() {
  if (typeof window === 'undefined') {
    return null;
  }
  if (!keycloakInstance) {
    keycloakInstance = new Keycloak(resolveKeycloakConfig());
  }
  return keycloakInstance;
}

export function getAuthCallbackUri() {
  return `${window.location.origin}${AUTH_CALLBACK_PATH}`;
}

export function setPostLoginRedirect(path) {
  if (typeof window === 'undefined') return;
  const safe = normalizeAppPath(path);
  sessionStorage.setItem(POST_LOGIN_KEY, safe);
}

export function consumePostLoginRedirect(fallback = '/dashboard') {
  if (typeof window === 'undefined') return fallback;
  const value = sessionStorage.getItem(POST_LOGIN_KEY);
  sessionStorage.removeItem(POST_LOGIN_KEY);
  return normalizeAppPath(value || fallback);
}

export function setPostAuthMessage(message) {
  if (typeof window === 'undefined' || !message) return;
  sessionStorage.setItem(POST_AUTH_MESSAGE_KEY, message);
}

export function consumePostAuthMessage() {
  if (typeof window === 'undefined') return null;
  const value = sessionStorage.getItem(POST_AUTH_MESSAGE_KEY);
  sessionStorage.removeItem(POST_AUTH_MESSAGE_KEY);
  return value;
}

function normalizeAppPath(path) {
  if (!path || typeof path !== 'string') return '/dashboard';
  let cleaned = path.split('#')[0].split('&state=')[0];
  if (cleaned.startsWith('http')) {
    try {
      cleaned = new URL(cleaned).pathname || '/dashboard';
    } catch {
      return '/dashboard';
    }
  }
  if (!cleaned.startsWith('/')) cleaned = `/${cleaned}`;
  if (cleaned.startsWith('/login') || cleaned.startsWith('/register')) {
    return '/dashboard';
  }
  return cleaned;
}

function isAlreadyInitializedError(error) {
  const msg = String(error?.message || error || '').toLowerCase();
  return msg.includes('initialized once') || msg.includes('already been initialized');
}

/**
 * Initialize Keycloak once per client instance.
 * On failure, discard the instance so a retry can create a fresh one
 * (keycloak-js forbids calling init() twice on the same object).
 */
function pkceInitOptions(extra = {}) {
  const { polyfilled } = ensureWebCryptoForPkce();
  const canPkce =
    typeof globalThis.crypto?.subtle?.digest === 'function' &&
    typeof globalThis.crypto?.randomUUID === 'function';

  if (!canPkce) {
    const hint = describeInsecureOriginHint();
    throw new Error(
      hint
        ? `Web Crypto API is not available. ${hint}`
        : 'Web Crypto API is not available.',
    );
  }

  if (polyfilled && process.env.NODE_ENV === 'development') {
    console.info('[library] Using Web Crypto polyfill for PKCE on a non-secure origin');
  }

  return {
    pkceMethod: 'S256',
    checkLoginIframe: false,
    ...extra,
  };
}

export function initKeycloak() {
  if (typeof window === 'undefined') {
    return Promise.resolve({ authenticated: false, keycloak: null });
  }

  const existing = keycloakInstance;
  // keycloak-js ≥26 sets didInitialize after the first init() attempt
  if (existing?.didInitialize) {
    return Promise.resolve({
      authenticated: Boolean(existing.authenticated),
      keycloak: existing,
    });
  }

  if (initPromise) {
    return initPromise;
  }

  let initOpts;
  try {
    initOpts = pkceInitOptions({
      onLoad: 'check-sso',
      silentCheckSsoRedirectUri: `${window.location.origin}/silent-check-sso.html`,
      enableLogging: process.env.NODE_ENV === 'development',
    });
  } catch (error) {
    return Promise.reject(error);
  }

  const keycloak = getKeycloak();
  initPromise = keycloak
    .init(initOpts)
    .then((authenticated) => ({ authenticated, keycloak }))
    .catch((error) => {
      // After the first init() call, keycloak-js refuses a second init().
      // SSO iframe/timeout failures often still set didInitialize — treat as logged out.
      if (keycloak.didInitialize || isAlreadyInitializedError(error)) {
        initPromise = Promise.resolve({
          authenticated: Boolean(keycloak.authenticated),
          keycloak,
        });
        return initPromise;
      }
      resetKeycloakClient();
      throw error;
    });

  return initPromise;
}

export async function loginWithKeycloak(returnPath = '/dashboard') {
  setPostLoginRedirect(returnPath);

  try {
    const { keycloak } = await initKeycloak();
    await keycloak.login({
      redirectUri: getAuthCallbackUri(),
    });
    return;
  } catch (error) {
    const msg = String(error?.message || error || '');
    if (msg.toLowerCase().includes('web crypto')) {
      throw error;
    }
    // SSO probe can fail (network / iframe); discard and start interactive login.
    if (isAlreadyInitializedError(error) || keycloakInstance) {
      resetKeycloakClient();
    }
  }

  const keycloak = getKeycloak();
  await keycloak.init(
    pkceInitOptions({
      onLoad: 'login-required',
      redirectUri: getAuthCallbackUri(),
    }),
  );
}

/**
 * Start registration with PKCE.
 * If a Keycloak SSO session already exists, clear it first — otherwise Keycloak
 * shows "already authenticated as different user".
 *
 * @param {{ skipLogout?: boolean }} options - set skipLogout after logout redirect
 */
export async function registerWithKeycloak(returnPath = '/dashboard', options = {}) {
  const { skipLogout = false } = options;
  setPostLoginRedirect(returnPath);
  setPostAuthMessage('Account created successfully. Taking you to your dashboard…');

  let keycloak;
  try {
    ({ keycloak } = await initKeycloak());
  } catch {
    resetKeycloakClient();
    keycloak = getKeycloak();
    await keycloak
      .init(
        pkceInitOptions({
          onLoad: 'check-sso',
          silentCheckSsoRedirectUri: `${window.location.origin}/silent-check-sso.html`,
        }),
      )
      .catch(() => {
        /* continue to register/logout */
      });
  }

  if (!skipLogout) {
    sessionStorage.setItem(PENDING_REGISTER_KEY, '1');
    await keycloak.logout({
      redirectUri: `${window.location.origin}${AUTH_CALLBACK_PATH}?action=register`,
    });
    return;
  }

  sessionStorage.removeItem(PENDING_REGISTER_KEY);
  await keycloak.register({
    redirectUri: getAuthCallbackUri(),
  });
}

export function shouldResumeRegistration() {
  if (typeof window === 'undefined') return false;
  return sessionStorage.getItem(PENDING_REGISTER_KEY) === '1';
}

export async function logoutFromKeycloak() {
  sessionStorage.removeItem(POST_LOGIN_KEY);
  sessionStorage.removeItem(POST_AUTH_MESSAGE_KEY);
  sessionStorage.removeItem(PENDING_REGISTER_KEY);
  localStorage.removeItem('token');

  const keycloak = keycloakInstance || getKeycloak();
  resetKeycloakClient();

  if (!keycloak) {
    window.location.href = '/';
    return;
  }

  try {
    if (!keycloak.didInitialize) {
      await keycloak.init(
        pkceInitOptions({
          onLoad: 'check-sso',
        }),
      );
    }
    await keycloak.logout({
      redirectUri: `${window.location.origin}/`,
    });
  } catch {
    window.location.href = '/';
  }
}

export function getKeycloakAccountUrl() {
  const { url, realm } = resolveKeycloakConfig();
  return `${url}/realms/${realm}/account`;
}

/** Map Keycloak / OIDC / API error strings to human-readable copy. */
export function describeAuthError(error, description) {
  const code = (error || '').toLowerCase();
  const desc = decodeURIComponent((description || '').replace(/\+/g, ' '));
  const combined = `${code} ${desc}`.toLowerCase();

  if (combined.includes('web crypto') || combined.includes('secure context')) {
    return (
      describeInsecureOriginHint() ||
      'Web Crypto is unavailable on this origin. Open http://localhost:3300 instead of a LAN IP, or use the Capacitor app.'
    );
  }
  if (combined.includes('initialized once')) {
    return 'Sign-in restarted after a connection glitch. Try “Sign in with Keycloak” again.';
  }
  if (combined.includes('issuer invalid') || combined.includes('jwt issuer')) {
    return 'Sign-in reached Keycloak, but the library API rejected the token (issuer mismatch). This is a server configuration issue — not your password.';
  }
  if (code === 'invalid_request' && desc.toLowerCase().includes('code_challenge')) {
    return 'Sign-in could not start securely (PKCE). Use “Sign in with Keycloak” or “Create an account” on this page — do not use a bookmarked Keycloak link.';
  }
  if (desc.toLowerCase().includes('already authenticated')) {
    return 'You already have a Keycloak session. Use “Sign in with Keycloak”, or sign out first if you want to create a different account.';
  }
  if (code === 'access_denied') {
    return 'Sign-in was cancelled. You can try again when ready.';
  }
  if (code === 'login_required') {
    return 'Please sign in to continue.';
  }
  if (combined.includes('failed to fetch') || combined.includes('networkerror') || combined.includes('load failed')) {
    const { url } = resolveKeycloakConfig();
    return `Could not reach Keycloak at ${url}. Confirm identity-platform is running and this device can open that URL.`;
  }
  if (desc) return desc;
  if (error) return `Sign-in failed (${error}).`;
  return null;
}
