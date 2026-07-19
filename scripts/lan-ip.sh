#!/usr/bin/env bash
# Print primary LAN IPv4 for mobile / Capacitor env.build
set -euo pipefail

if command -v ipconfig >/dev/null 2>&1; then
  for iface in en0 en1 en2; do
    ip="$(ipconfig getifaddr "$iface" 2>/dev/null || true)"
    if [[ -n "${ip:-}" ]]; then
      echo "$ip"
      exit 0
    fi
  done
fi

if command -v hostname >/dev/null 2>&1; then
  ip="$(hostname -I 2>/dev/null | awk '{print $1}' || true)"
  if [[ -n "${ip:-}" ]]; then
    echo "$ip"
    exit 0
  fi
fi

echo "Could not detect LAN IP. Set LIBRARY_LAN_IP manually in mobile/env.build" >&2
exit 1
