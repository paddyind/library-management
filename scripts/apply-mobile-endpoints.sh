#!/usr/bin/env bash
# Apply endpoint overrides, refresh Docker LAN stack (optional), rebuild Capacitor + APK.
#
# Examples:
#   ./scripts/apply-mobile-endpoints.sh
#   LIBRARY_WEB_URL=http://192.168.1.7:3300 LIBRARY_API_URL=http://192.168.1.7:3301/api \
#     LIBRARY_KEYCLOAK_URL=http://192.168.1.7:3510 ./scripts/apply-mobile-endpoints.sh --apk
#   ./scripts/apply-mobile-endpoints.sh --docker --apk
#   ./scripts/apply-mobile-endpoints.sh --bridge --apk   # shell injects API/KC overrides via localStorage
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MOBILE="$ROOT/mobile"
DO_DOCKER=0
DO_APK=0
SHELL_MODE=""

for arg in "$@"; do
  case "$arg" in
    --docker) DO_DOCKER=1 ;;
    --apk) DO_APK=1 ;;
    --bridge) SHELL_MODE=bridge ;;
    --remote) SHELL_MODE=remote ;;
    --help|-h)
      sed -n '1,20p' "$0"
      exit 0
      ;;
  esac
done

if [[ ! -f "$MOBILE/env.build" ]]; then
  if [[ -f "$MOBILE/env.build.example" ]]; then
    cp "$MOBILE/env.build.example" "$MOBILE/env.build"
    echo "Created mobile/env.build from example — edit LIBRARY_LAN_IP / URLs, then re-run."
  else
    echo "Missing mobile/env.build" >&2
    exit 1
  fi
fi

# Allow env vars to override file (exported into prepare-config)
set -a
# shellcheck disable=SC1091
source "$MOBILE/env.build"
set +a

if [[ -n "$SHELL_MODE" ]]; then
  export LIBRARY_SHELL_MODE="$SHELL_MODE"
fi

# Persist non-empty CLI/env overrides back into env.build for next build
python3 - <<'PY' "$MOBILE/env.build"
import os, re, sys
path = sys.argv[1]
keys = [
    "LIBRARY_CONNECTIVITY",
    "LIBRARY_SHELL_MODE",
    "LIBRARY_LAN_IP",
    "LIBRARY_WEB_URL",
    "LIBRARY_API_URL",
    "LIBRARY_KEYCLOAK_URL",
    "LIBRARY_WEB_PORT",
    "LIBRARY_API_PORT",
    "LIBRARY_KEYCLOAK_PORT",
]
text = open(path).read()
for key in keys:
    val = os.environ.get(key)
    if not val:
        continue
    pattern = re.compile(rf"^{re.escape(key)}=.*$", re.M)
    line = f"{key}={val}"
    if pattern.search(text):
        text = pattern.sub(line, text)
    else:
        text = text.rstrip() + "\n" + line + "\n"
open(path, "w").write(text)
print(f"Updated {path}")
PY

echo "→ prepare-config"
(
  cd "$MOBILE"
  npm install --legacy-peer-deps >/dev/null
  npm run prepare-config
)

if [[ "$DO_DOCKER" -eq 1 ]]; then
  LAN_IP="${LIBRARY_LAN_IP:-$("$ROOT/scripts/lan-ip.sh")}"
  export LIBRARY_LAN_IP="$LAN_IP"
  echo "→ Docker stack with LIBRARY_LAN_IP=$LAN_IP"
  IDENTITY="$(cd "$ROOT/../identity-platform" && pwd)"
  (
    cd "$IDENTITY"
    docker compose -f docker-compose.yml -f docker-compose.mobile.yml up -d
  )
  KEYCLOAK_URL="http://localhost:3510" \
    "$IDENTITY/scripts/ensure-client-redirects.sh" library "${LIBRARY_WEB_URL:-http://${LAN_IP}:3300}"
  (
    cd "$ROOT"
    docker compose -f docker-compose.yml -f docker-compose.mobile.yml up -d --force-recreate frontend backend
  )
fi

echo "→ Capacitor sync"
chmod +x "$MOBILE/build-mobile.sh"
"$MOBILE/build-mobile.sh"

if [[ "$DO_APK" -eq 1 ]]; then
  chmod +x "$MOBILE/scripts/build-apk.sh"
  "$MOBILE/scripts/build-apk.sh"
fi

echo ""
echo "Endpoints (build-info):"
cat "$MOBILE/build-info.json" 2>/dev/null || true
echo ""
echo "Next: Android Studio → $MOBILE/android   or   Xcode → $MOBILE/ios/App/App.xcworkspace"
echo "Override later: LIBRARY_WEB_URL=… LIBRARY_API_URL=… LIBRARY_KEYCLOAK_URL=… $0 --apk"
