#!/usr/bin/env bash
# Prepare Capacitor config + sync native projects (android / ios).
# Prerequisites: env.build (from env.build.example or scripts/run-mobile-local.sh)
set -euo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

ENV_FILE="$DIR/env.build"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing env.build — run ../scripts/run-mobile-local.sh or copy env.build.example." >&2
  exit 1
fi

echo "Loading $ENV_FILE"
set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

if [[ "${LIBRARY_CONNECTIVITY:-local}" == "local" && -z "${LIBRARY_LAN_IP:-}" && -z "${LIBRARY_WEB_URL:-}" ]]; then
  echo "LIBRARY_LAN_IP (or LIBRARY_WEB_URL) required for local mode." >&2
  exit 1
fi

# Prefer full Xcode.app even when xcode-select still points at Command Line Tools
if [[ "$(uname -s)" == "Darwin" ]]; then
  if [[ -z "${DEVELOPER_DIR:-}" && -d /Applications/Xcode.app/Contents/Developer ]]; then
    export DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer
  fi
  export PATH="/opt/homebrew/bin:/usr/local/bin:${DEVELOPER_DIR:-}/usr/bin:$PATH"
fi

have_xcode=0
if [[ "$(uname -s)" == "Darwin" ]] && xcodebuild -version >/dev/null 2>&1; then
  have_xcode=1
  echo "Xcode: $(xcodebuild -version | head -1) (DEVELOPER_DIR=${DEVELOPER_DIR:-$(xcode-select -p)})"
fi

have_pods=0
if command -v pod >/dev/null 2>&1; then
  have_pods=1
  echo "CocoaPods: $(pod --version)"
fi

npm install --legacy-peer-deps
npm run prepare-config

node -e "require('@capacitor/android')" 2>/dev/null || npm install @capacitor/android@5 --save --legacy-peer-deps
if [[ "$have_xcode" -eq 1 ]]; then
  node -e "require('@capacitor/ios')" 2>/dev/null || npm install @capacitor/ios@5 --save --legacy-peer-deps
fi

if [[ ! -d android ]]; then
  echo "Adding Android platform…"
  npx cap add android
fi

if [[ "$have_xcode" -eq 1 ]]; then
  if [[ ! -d ios ]]; then
    echo "Adding iOS platform…"
    npx cap add ios
  fi
else
  echo "Skipping iOS — Xcode not usable."
  echo "  If Xcode.app is installed: export DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer"
  echo "  One-time (recommended): sudo xcode-select -s /Applications/Xcode.app/Contents/Developer"
fi

echo "Syncing Android…"
npx cap sync android

if [[ "$have_xcode" -eq 1 && -d ios ]]; then
  if [[ "$have_pods" -eq 0 ]]; then
    echo "CocoaPods missing — installing via Homebrew…"
    if command -v brew >/dev/null 2>&1; then
      brew install cocoapods
      have_pods=1
    else
      echo "WARN: install CocoaPods: brew install cocoapods" >&2
    fi
  fi
  echo "Syncing iOS…"
  if ! npx cap sync ios; then
    echo "WARN: cap sync ios failed; trying pod install directly…" >&2
    (
      cd ios/App
      pod install --repo-update
    ) || {
      echo "iOS pod install failed." >&2
      exit 1
    }
  fi
fi

echo ""
echo "Done."
echo "  Android Studio → open mobile/android"
if [[ -d ios && "$have_xcode" -eq 1 ]]; then
  echo "  Xcode → open mobile/ios/App/App.xcworkspace (iPhone or iPad)"
  echo "    (use .xcworkspace, not .xcodeproj)"
fi
echo "  Capacitor server.url → $(node -e "console.log(require('./capacitor.config.json').server.url)")"
echo ""
if [[ "$(uname -s)" == "Darwin" ]] && [[ "$(xcode-select -p 2>/dev/null)" == "/Library/Developer/CommandLineTools" ]]; then
  echo "Optional (makes xcodebuild work without DEVELOPER_DIR every time):"
  echo "  sudo xcode-select -s /Applications/Xcode.app/Contents/Developer"
fi
