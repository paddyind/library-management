# Mobile builds — phone / tablet / iPad (local Docker or public)

Capacitor 5 shell (same idea as **photo-booth**). The WebView loads the **live Next.js UI** at a bake-time URL (`server.url`), so one APK/IPA works on phone, Android tablet, iPhone, and iPad.

| Profile | Use when | Endpoints |
|---------|----------|-----------|
| **local** | Same Wi‑Fi as your Mac/PC | Docker host ports via LAN IP |
| **public** | Staging / pre-external | HTTPS web + API + Keycloak |

**Never use `localhost` on the device** — that is the phone itself.

| Service | Docker host port | Device URL (local) |
|---------|------------------|--------------------|
| Frontend | 3300 | `http://{LAN_IP}:3300` |
| API | 3301 | `http://{LAN_IP}:3301/api` |
| Keycloak | 3510 | `http://{LAN_IP}:3510` |

---

## Override endpoints anytime

Edit `mobile/env.build` (or pass env vars), then apply:

```bash
cd library-management

# Example: keep Docker on current LAN, rebuild native shell + APK
LIBRARY_WEB_URL=http://192.168.1.7:3300 \
LIBRARY_API_URL=http://192.168.1.7:3301/api \
LIBRARY_KEYCLOAK_URL=http://192.168.1.7:3510 \
  ./scripts/apply-mobile-endpoints.sh --docker --apk
```

| Flag | Effect |
|------|--------|
| *(none)* | Rewrite config + `cap sync` |
| `--docker` | Recreate frontend/backend (+ Keycloak redirects) with those URLs |
| `--apk` | Build debug APK → `mobile/dist/` |
| `--bridge` | Shell injects API/Keycloak into `localStorage` then opens web URL (use when API/KC differ from the frontend bake) |
| `--remote` | Default: Capacitor opens web URL directly |

**Rule of thumb**

- **remote** (default): Docker `NEXT_PUBLIC_*` and the APK’s `server.url` must match. Use `--docker` when you change LAN IP / URLs.
- **bridge**: APK can carry different `LIBRARY_API_URL` / `LIBRARY_KEYCLOAK_URL` than the hosted frontend (auth + profile use runtime overrides).

CI workflow inputs: `web_url`, `api_url`, `keycloak_url`, `lan_ip`, `shell_mode`.

---

## Local mode (recommended for validation)

One command (detects LAN IP, restarts Keycloak + library with LAN URLs, patches OIDC redirects, builds Capacitor):

```bash
cd library-management
./scripts/run-mobile-local.sh
```

Flags:

| Flag | Meaning |
|------|---------|
| `--skip-build` | Stack + Keycloak only (no Capacitor sync) |
| `--build-only` | Refresh `env.build` + Capacitor (stack already up) |

Then:

1. Phone browser: open the printed `http://{LAN}:3300` and sign in with Keycloak  
   - Desktop Mac: prefer `http://localhost:3300` (secure context). LAN HTTP works via a PKCE Web Crypto polyfill in the app.  
   - Capacitor WebViews are already a secure context — prefer the native shell for devices.  
2. **Android** — see below  
3. **Xcode** → open `mobile/ios/App/App.xcworkspace` → iPhone or **iPad** simulator / device  

Revert desktop defaults when finished:

```bash
./scripts/stop-mobile-local.sh
```

### What the script configures

| Layer | Change |
|-------|--------|
| `mobile/env.build` | `LIBRARY_CONNECTIVITY=local` + LAN IP |
| identity-platform | `docker-compose.mobile.yml` → `KC_HOSTNAME=http://{LAN}:3510` (JWT `iss` matches phone) |
| library compose | `NEXT_PUBLIC_*` + `KEYCLOAK_PUBLIC_URL` + CORS for localhost **and** LAN |
| Keycloak client | Adds `http://{LAN}:3300/*` redirect + web origin (keeps localhost) |

---

## Android APK (local)

Requires **Android Studio** once (installs SDK under `~/Library/Android/sdk`).

```bash
cd library-management
./scripts/run-mobile-local.sh --build-only   # if stack already up
cd mobile
npm run build:apk
# → mobile/dist/library-management-latest.apk
```

Install:

```bash
adb install -r mobile/dist/library-management-latest.apk
```

Or: **Android Studio → Open → `mobile/android` → ▶ Run** on emulator / USB device.

---

## CI/CD (APK + iOS artifacts)

Workflow: **`.github/workflows/mobile-build.yml`** (Actions → **Mobile Build (APK + iOS)** → **Run workflow**).

| Input | Default | Purpose |
|-------|---------|---------|
| `connectivity` | `local` | `local` or `public` |
| `lan_ip` | placeholder | Used when web/api/kc URLs empty |
| `web_url` / `api_url` / `keycloak_url` | — | **Override** bake-time endpoints |
| `shell_mode` | `remote` | `remote` or `bridge` |
| `build_apk` | true | Debug APK + `build-info.json` |
| `build_ios_simulator_app` | true | Simulator `.app` (no signing) |
| `build_ipa` | false | Signed IPA (needs secrets) |

**Download artifacts** from the run summary: `library-management-apk-*`, `library-management-ios-sim-*`, optional `library-management-ipa-*`.

**IPA secrets:** `IOS_CERT_P12_BASE64`, `IOS_CERT_PASSWORD`, `IOS_PROVISIONING_PROFILE_BASE64`, `IOS_BUNDLE_ID`.

For **public** CI builds, set repo variables or workflow inputs to staging HTTPS URLs (do not ship LAN IPs externally).

Example (your current Docker Desktop LAN):

| Input | Value |
|-------|-------|
| `connectivity` | `local` |
| `lan_ip` | `192.168.1.7` |
| `web_url` | `http://192.168.1.7:3300` |
| `api_url` | `http://192.168.1.7:3301/api` |
| `keycloak_url` | `http://192.168.1.7:3510` |

---

## Public / pre-external cutover

```bash
# mobile/env.build
LIBRARY_CONNECTIVITY=public
LIBRARY_WEB_URL=https://library.example.com
LIBRARY_API_URL=https://api.library.example.com/api
LIBRARY_KEYCLOAK_URL=https://auth.example.com
```

1. Deploy frontend, API, Keycloak with the same public URLs  
2. Keycloak client: HTTPS redirect URIs + web origins  
3. `./build-mobile.sh` or CI with `connectivity=public`  
4. Distribute debug/TestFlight builds for validation before store / wide release  

---

## Tooling

- Node 18+  
- Android Studio (SDK 34)  
- macOS + **Xcode.app** + **CocoaPods** for iOS / iPad  
- Docker Desktop for local backend / Keycloak  

If `xcodebuild` says it needs Xcode but the app is installed:

```bash
./scripts/setup-ios-xcode.sh
# Or: export DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer
```

- Host firewall: allow **3300 / 3301 / 3510** on Wi‑Fi for local mode  

Related: [README](../README.md) · [keycloak/README](../keycloak/README.md) · [identity-platform OBSERVABILITY](../../identity-platform/OBSERVABILITY.md)
