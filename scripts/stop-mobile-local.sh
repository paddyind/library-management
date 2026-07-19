#!/usr/bin/env bash
# Revert Keycloak + library compose to desktop localhost defaults after mobile LAN testing.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
IDENTITY="$(cd "$ROOT/../identity-platform" && pwd)"

echo "Reverting Keycloak hostname to localhost…"
(
  cd "$IDENTITY"
  docker compose -f docker-compose.yml up -d keycloak
)

echo "Reverting library frontend/backend to desktop env…"
(
  cd "$ROOT"
  docker compose -f docker-compose.yml up -d --force-recreate frontend backend
)

echo "OK — desktop mode:"
echo "  App:      http://localhost:3300"
echo "  API:      http://localhost:3301/api"
echo "  Keycloak: http://localhost:3510"
echo ""
echo "LAN redirect URIs remain on the Keycloak client (harmless for desktop)."
