#!/usr/bin/env bash
# One-time macOS setup so Capacitor iOS builds work (Xcode + CocoaPods).
# Run in your own Terminal (may ask for password for xcode-select).
set -euo pipefail

XCODE_DEV="/Applications/Xcode.app/Contents/Developer"

if [[ ! -d "$XCODE_DEV" ]]; then
  echo "Xcode.app not found at /Applications/Xcode.app" >&2
  echo "Install Xcode from the App Store, then re-run this script." >&2
  exit 1
fi

echo "→ Switching xcode-select to full Xcode (password may be required)…"
sudo xcode-select -s "$XCODE_DEV"
sudo xcodebuild -license accept >/dev/null 2>&1 || true
sudo xcodebuild -runFirstLaunch >/dev/null 2>&1 || true

echo "→ Active developer dir: $(xcode-select -p)"
xcodebuild -version

export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
if ! command -v pod >/dev/null 2>&1; then
  echo "→ Installing CocoaPods via Homebrew…"
  brew install cocoapods
fi
echo "→ CocoaPods: $(pod --version)"

echo ""
echo "OK. Now build the mobile shell:"
echo "  cd library-management && ./scripts/run-mobile-local.sh --build-only"
echo "  open mobile/ios/App/App.xcworkspace   # Xcode → iPhone or iPad"
