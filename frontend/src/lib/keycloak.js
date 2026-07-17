import Keycloak from 'keycloak-js';

const keycloakConfig = {
  url: process.env.NEXT_PUBLIC_KEYCLOAK_URL || 'http://localhost:3510',
  realm: process.env.NEXT_PUBLIC_KEYCLOAK_REALM || 'library',
  clientId: process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID || 'library-frontend',
};

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
  return { ...keycloakConfig };
}

export function getKeycloak() {
  if (typeof window === 'undefined') {
    return null;
  }
  if (!keycloakInstance) {
    keycloakInstance = new Keycloak(keycloakConfig);
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

/**
 * Initialize Keycloak once per page load. Must run on AUTH_CALLBACK_PATH
 * so authorization-code + PKCE can complete.
 */
export function initKeycloak() {
  const keycloak = getKeycloak();
  if (!keycloak) {
    return Promise.resolve({ authenticated: false, keycloak: null });
  }

  if (!initPromise) {
    initPromise = keycloak
      .init({
        onLoad: 'check-sso',
        pkceMethod: 'S256',
        checkLoginIframe: false,
        silentCheckSsoRedirectUri: `${window.location.origin}/silent-check-sso.html`,
      })
      .then((authenticated) => ({ authenticated, keycloak }))
      .catch((error) => {
        initPromise = null;
        throw error;
      });
  }

  return initPromise;
}

export async function loginWithKeycloak(returnPath = '/dashboard') {
  const keycloak = getKeycloak();
  await initKeycloak();
  setPostLoginRedirect(returnPath);
  await keycloak.login({
    redirectUri: getAuthCallbackUri(),
  });
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
  const keycloak = getKeycloak();
  await initKeycloak();
  setPostLoginRedirect(returnPath);
  setPostAuthMessage('Account created successfully. Taking you to your dashboard…');

  if (!skipLogout) {
    // Always clear SSO before registration to avoid session conflicts
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
  const keycloak = getKeycloak();
  sessionStorage.removeItem(POST_LOGIN_KEY);
  sessionStorage.removeItem(POST_AUTH_MESSAGE_KEY);
  sessionStorage.removeItem(PENDING_REGISTER_KEY);
  localStorage.removeItem('token');
  if (!keycloak) {
    window.location.href = '/';
    return;
  }
  await keycloak.logout({
    redirectUri: `${window.location.origin}/`,
  });
}

export function getKeycloakAccountUrl() {
  const { url, realm } = keycloakConfig;
  return `${url}/realms/${realm}/account`;
}

/** Map Keycloak / OIDC / API error strings to human-readable copy. */
export function describeAuthError(error, description) {
  const code = (error || '').toLowerCase();
  const desc = decodeURIComponent((description || '').replace(/\+/g, ' '));
  const combined = `${code} ${desc}`.toLowerCase();

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
  if (desc) return desc;
  if (error) return `Sign-in failed (${error}).`;
  return null;
}
