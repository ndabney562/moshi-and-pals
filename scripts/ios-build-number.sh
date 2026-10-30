#!/bin/sh
# Stamps the app's CFBundleVersion with the number of commits on HEAD, so every build Noah archives in Xcode
# (or CI builds) gets a higher build number than the last. TestFlight uploads come from main, which only grows.
set -eu
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PLIST="${1:-${TARGET_BUILD_DIR:?}/${INFOPLIST_PATH:?}}"
if [ "$(git -C "$ROOT" rev-parse --is-shallow-repository 2>/dev/null || echo true)" = "true" ]; then
  echo "warning: shallow or missing git history; the build number stays $(/usr/libexec/PlistBuddy -c 'Print :CFBundleVersion' "$PLIST")" >&2
  exit 0
fi
BUILD="$(git -C "$ROOT" rev-list --count HEAD)"
/usr/libexec/PlistBuddy -c "Set :CFBundleVersion $BUILD" "$PLIST"
echo "Build number $BUILD"
