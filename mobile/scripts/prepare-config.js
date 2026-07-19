#!/usr/bin/env node
/**
 * Builds capacitor.config.json + www/ from env.build / process.env.
 * Connectivity profiles:
 *   local  → http://{LAN_IP}:{ports}  (phone/tablet on same Wi‑Fi)
 *   public → https://… endpoints
 *
 * URL precedence (highest last wins via process.env over env.build):
 *   LIBRARY_WEB_URL / LIBRARY_API_URL / LIBRARY_KEYCLOAK_URL
 *   else derived from LIBRARY_LAN_IP + ports (local)
 *
 * LIBRARY_SHELL_MODE:
 *   remote (default) — Capacitor loads server.url directly (Docker frontend must match)
 *   bridge — local www sets localStorage runtime then redirects (API/KC overrides apply in-app)
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const envPath = path.join(root, 'env.build');

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const out = {};
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

const fileEnv = loadEnvFile(envPath);
const env = { ...fileEnv, ...process.env };

const connectivity = String(env.LIBRARY_CONNECTIVITY || 'local').toLowerCase();
const shellMode = String(env.LIBRARY_SHELL_MODE || 'remote').toLowerCase();
const lanIp = (env.LIBRARY_LAN_IP || '').trim();
const webPort = env.LIBRARY_WEB_PORT || '3300';
const apiPort = env.LIBRARY_API_PORT || '3301';
const keycloakPort = env.LIBRARY_KEYCLOAK_PORT || '3510';

function requireLanIp() {
  if (!lanIp || lanIp === '127.0.0.1' || lanIp === 'localhost') {
    console.error(
      'LIBRARY_LAN_IP must be your Mac/PC LAN IPv4 (not localhost). See scripts/lan-ip.sh',
    );
    process.exit(1);
  }
}

let webUrl = (env.LIBRARY_WEB_URL || '').trim();
let apiUrl = (env.LIBRARY_API_URL || '').trim();
let keycloakUrl = (env.LIBRARY_KEYCLOAK_URL || '').trim();

if (connectivity === 'local') {
  if (!webUrl || !apiUrl || !keycloakUrl) {
    requireLanIp();
  }
  webUrl = webUrl || `http://${lanIp}:${webPort}`;
  apiUrl = apiUrl || `http://${lanIp}:${apiPort}/api`;
  keycloakUrl = keycloakUrl || `http://${lanIp}:${keycloakPort}`;
} else if (connectivity === 'public') {
  if (!webUrl || !apiUrl || !keycloakUrl) {
    console.error(
      'public mode requires LIBRARY_WEB_URL, LIBRARY_API_URL, and LIBRARY_KEYCLOAK_URL',
    );
    process.exit(1);
  }
} else {
  console.error(`Unknown LIBRARY_CONNECTIVITY=${connectivity} (use local|public)`);
  process.exit(1);
}

if (shellMode !== 'remote' && shellMode !== 'bridge') {
  console.error(`Unknown LIBRARY_SHELL_MODE=${shellMode} (use remote|bridge)`);
  process.exit(1);
}

if (/localhost|127\.0\.0\.1/.test(webUrl) || /localhost|127\.0\.0\.1/.test(apiUrl)) {
  console.warn(
    'WARNING: web/api URL contains localhost — phones cannot reach your host that way.',
  );
}

const appId = env.LIBRARY_APP_ID || 'com.librarymanagement.app';
const appName = env.LIBRARY_APP_NAME || 'Library Management';
const realm = env.LIBRARY_KEYCLOAK_REALM || 'library';
const clientId = env.LIBRARY_KEYCLOAK_CLIENT_ID || 'library-frontend';
const cleartext = webUrl.startsWith('http://') || apiUrl.startsWith('http://');

const capacitorConfig = {
  appId,
  appName,
  webDir: 'www',
  android: {
    allowMixedContent: cleartext,
  },
  ios: {
    contentInset: 'automatic',
    preferredContentMode: 'mobile',
  },
};

// remote: WebView opens Next.js directly. bridge: open local www first (runtime overrides).
if (shellMode === 'remote') {
  capacitorConfig.server = {
    url: webUrl,
    cleartext,
  };
}

const wwwDir = path.join(root, 'www');
fs.mkdirSync(wwwDir, { recursive: true });

const runtime = {
  connectivity,
  shellMode,
  webUrl,
  apiUrl,
  keycloakUrl,
  keycloakRealm: realm,
  keycloakClientId: clientId,
  builtAt: new Date().toISOString(),
};

fs.writeFileSync(
  path.join(wwwDir, 'runtime-config.js'),
  `window.__LIBRARY_RUNTIME__ = ${JSON.stringify(runtime, null, 2)};\n`,
);

const escapeHtml = (s) =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/"/g, '&quot;');

fs.writeFileSync(
  path.join(wwwDir, 'index.html'),
  `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <title>${escapeHtml(appName)}</title>
  <script src="./runtime-config.js"></script>
  <style>
    body { font-family: system-ui, sans-serif; margin: 2rem; line-height: 1.5; color: #111; }
    code { background: #f3f4f6; padding: 0.1rem 0.35rem; border-radius: 4px; }
    .ok { color: #047857; }
    .warn { color: #b45309; }
  </style>
</head>
<body>
  <h1>${escapeHtml(appName)}</h1>
  <p class="ok" id="status">Opening library app…</p>
  <ul>
    <li>Mode: <code>${escapeHtml(shellMode)}</code></li>
    <li>Web: <code id="w"></code></li>
    <li>API: <code id="a"></code></li>
    <li>Keycloak: <code id="k"></code></li>
  </ul>
  <p class="warn">If this page stays visible, the web URL is unreachable. Start Docker (see mobile/BUILD.md).</p>
  <script>
    const r = window.__LIBRARY_RUNTIME__ || {};
    document.getElementById('w').textContent = r.webUrl || '?';
    document.getElementById('a').textContent = r.apiUrl || '?';
    document.getElementById('k').textContent = r.keycloakUrl || '?';
    try {
      localStorage.setItem('library_runtime_v1', JSON.stringify(r));
    } catch (e) {}
    ${
      shellMode === 'bridge'
        ? `setTimeout(function () { window.location.replace(${JSON.stringify(webUrl)}); }, 50);`
        : `document.getElementById('status').textContent = 'Capacitor should load server.url. If you see this, server.url failed.';`
    }
  </script>
</body>
</html>
`,
);

fs.writeFileSync(path.join(root, 'capacitor.config.json'), JSON.stringify(capacitorConfig, null, 2) + '\n');

fs.writeFileSync(
  path.join(root, '.generated-urls.env'),
  [
    `# Generated by prepare-config.js — use with docker compose -f docker-compose.yml -f docker-compose.mobile.yml`,
    `LIBRARY_CONNECTIVITY=${connectivity}`,
    `LIBRARY_SHELL_MODE=${shellMode}`,
    `LIBRARY_WEB_URL=${webUrl}`,
    `LIBRARY_API_URL=${apiUrl}`,
    `LIBRARY_KEYCLOAK_URL=${keycloakUrl}`,
    `NEXT_PUBLIC_API_URL=${apiUrl}`,
    `NEXT_PUBLIC_KEYCLOAK_URL=${keycloakUrl}`,
    `NEXT_PUBLIC_KEYCLOAK_REALM=${realm}`,
    `NEXT_PUBLIC_KEYCLOAK_CLIENT_ID=${clientId}`,
    `KEYCLOAK_PUBLIC_URL=${keycloakUrl}`,
    `CORS_ORIGIN=${webUrl}`,
    '',
  ].join('\n'),
);

const buildInfo = {
  connectivity,
  shellMode,
  webUrl,
  apiUrl,
  keycloakUrl,
  keycloakRealm: realm,
  keycloakClientId: clientId,
  appId,
  appName,
  capacitorServerUrl: capacitorConfig.server?.url || null,
  builtAt: runtime.builtAt,
};

fs.writeFileSync(path.join(root, 'build-info.json'), JSON.stringify(buildInfo, null, 2) + '\n');

console.log('Prepared mobile config:');
console.log(`  connectivity: ${connectivity}`);
console.log(`  shell mode:   ${shellMode}`);
console.log(`  web:          ${webUrl}`);
console.log(`  api:          ${apiUrl}`);
console.log(`  keycloak:     ${keycloakUrl}`);
console.log(`  capacitor:    ${path.join(root, 'capacitor.config.json')}`);
console.log(`  build-info:   ${path.join(root, 'build-info.json')}`);
console.log(`  compose env:  ${path.join(root, '.generated-urls.env')}`);
