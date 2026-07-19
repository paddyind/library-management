#!/usr/bin/env bash
# Build a debug APK into mobile/dist/ for sideload testing.
# Requires Android SDK (Android Studio) + JDK 17+.
set -euo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MOBILE="$(cd "$DIR/.." && pwd)"
cd "$MOBILE"

resolve_sdk() {
  if [[ -n "${ANDROID_HOME:-}" && -d "$ANDROID_HOME" ]]; then
    echo "$ANDROID_HOME"
    return
  fi
  if [[ -n "${ANDROID_SDK_ROOT:-}" && -d "$ANDROID_SDK_ROOT" ]]; then
    echo "$ANDROID_SDK_ROOT"
    return
  fi
  for candidate in \
    "$HOME/Library/Android/sdk" \
    "$HOME/Android/Sdk" \
    "/usr/local/share/android-sdk"; do
    if [[ -d "$candidate" ]]; then
      echo "$candidate"
      return
    fi
  done
  return 1
}

if ! SDK="$(resolve_sdk)"; then
  cat >&2 <<'EOF'
Android SDK not found.

Install Android Studio, open it once (SDK installs under ~/Library/Android/sdk), then:

  export ANDROID_HOME="$HOME/Library/Android/sdk"
  export PATH="$ANDROID_HOME/platform-tools:$PATH"
  ./scripts/build-apk.sh

Or build via GitHub Actions: Actions → Mobile Build (APK + iOS) → Run workflow.
EOF
  exit 1
fi

export ANDROID_HOME="$SDK"
export ANDROID_SDK_ROOT="$SDK"
export PATH="$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin:${PATH:-}"

echo "ANDROID_HOME=$ANDROID_HOME"

if [[ ! -f env.build ]]; then
  echo "Missing env.build — run ../scripts/run-mobile-local.sh --build-only first." >&2
  exit 1
fi

chmod +x ./build-mobile.sh
./build-mobile.sh

# Cleartext + tablet screens (idempotent)
MANIFEST="android/app/src/main/AndroidManifest.xml"
if [[ -f "$MANIFEST" ]]; then
  python3 - <<'PY'
import xml.etree.ElementTree as ET
from pathlib import Path
manifest_path = Path("android/app/src/main/AndroidManifest.xml")
ET.register_namespace("android", "http://schemas.android.com/apk/res/android")
tree = ET.parse(manifest_path)
root = tree.getroot()
android_ns = "{http://schemas.android.com/apk/res/android}"
app = root.find("application")
if app is not None:
    app.set(f"{android_ns}usesCleartextTraffic", "true")
if root.find("supports-screens") is None:
    ET.SubElement(
        root,
        "supports-screens",
        {
            f"{android_ns}smallScreens": "true",
            f"{android_ns}normalScreens": "true",
            f"{android_ns}largeScreens": "true",
            f"{android_ns}xlargeScreens": "true",
            f"{android_ns}anyDensity": "true",
        },
    )
tree.write(manifest_path, encoding="utf-8", xml_declaration=True)
PY
fi

if [[ -f android/variables.gradle ]]; then
  sed -E -i.bak 's/minSdkVersion *= *[0-9]+/minSdkVersion = 24/' android/variables.gradle || true
  sed -E -i.bak 's/compileSdkVersion *= *[0-9]+/compileSdkVersion = 34/' android/variables.gradle || true
  sed -E -i.bak 's/targetSdkVersion *= *[0-9]+/targetSdkVersion = 34/' android/variables.gradle || true
  rm -f android/variables.gradle.bak
fi

echo "→ Gradle assembleDebug…"
(
  cd android
  chmod +x gradlew
  ./gradlew clean assembleDebug --no-daemon
)

mkdir -p dist
APK_SRC="$(ls -1 android/app/build/outputs/apk/debug/*.apk | head -n 1)"
STAMP="$(date +%Y%m%d-%H%M%S)"
APK_DST="dist/library-management-${STAMP}.apk"
cp "$APK_SRC" "$APK_DST"
cp -f build-info.json dist/build-info.json 2>/dev/null || true
ln -sfn "$(basename "$APK_DST")" dist/library-management-latest.apk

echo ""
echo "APK ready:"
echo "  $MOBILE/$APK_DST"
echo "  $MOBILE/dist/library-management-latest.apk"
echo ""
echo "Install on a device (USB debugging):"
echo "  adb install -r \"$MOBILE/dist/library-management-latest.apk\""
echo "Or copy the APK to the phone and open it."
if [[ -f build-info.json ]]; then
  echo ""
  echo "Baked endpoints:"
  cat build-info.json
fi
