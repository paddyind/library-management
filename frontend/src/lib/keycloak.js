import Keycloak from 'keycloak-js';

const keycloakConfig = {
  url: process.env.NEXT_PUBLIC_KEYCLOAK_URL || 'http://localhost:3510',
  realm: process.env.NEXT_PUBLIC_KEYCLOAK_REALM || 'library',
  clientId: process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID || 'library-frontend',
};

let keycloakInstance = null;

export function isKeycloakMode() {
  return (process.env.NEXT_PUBLIC_IAM_PROVIDER || 'legacy').toLowerCase() === 'keycloak';
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

export function getKeycloakRegisterUrl() {
  const { url, realm } = keycloakConfig;
  const redirect = encodeURIComponent(`${window.location.origin}/login?registered=true`);
  return `${url}/realms/${realm}/protocol/openid-connect/registrations?client_id=${keycloakConfig.clientId}&response_type=code&scope=openid&redirect_uri=${redirect}`;
}

export function getKeycloakAccountUrl() {
  const { url, realm } = keycloakConfig;
  return `${url}/realms/${realm}/account`;
}
