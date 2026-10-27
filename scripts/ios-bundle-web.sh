#!/bin/sh
# Copies the exact verified web artifact used by Pages. No second Vite configuration or game build.
set -eu
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/ios/build/web"
export PATH="/opt/homebrew/bin:/usr/local/bin:$HOME/.volta/bin:$PATH"
if [ -s "$HOME/.nvm/nvm.sh" ] && ! command -v node >/dev/null 2>&1; then
  . "$HOME/.nvm/nvm.sh" >/dev/null 2>&1 || true
fi
if ! command -v npm >/dev/null 2>&1; then
  echo "error: Node.js 22 is required to verify and bundle the shared game. Install it and rebuild." >&2
  exit 1
fi
cd "$ROOT"
SOURCE="${MOSHI_WEB_BUNDLE:-$ROOT/dist}"
if ! node scripts/verify-web-bundle.mjs "$SOURCE"; then
  if [ -n "${MOSHI_WEB_BUNDLE:-}" ]; then
    echo "error: The supplied web artifact failed verification; refusing an untested replacement." >&2
    exit 1
  fi
  [ -d node_modules ] || npm ci --no-audit --no-fund
  npm run build
fi
# OUT and DEST are generated build resources; copy every file, including the browser-only service worker.
rm -rf "$OUT"
mkdir -p "$OUT"
cp -R "$SOURCE/." "$OUT/"
node scripts/verify-web-bundle.mjs "$OUT"
if [ -n "${TARGET_BUILD_DIR:-}" ] && [ -n "${UNLOCALIZED_RESOURCES_FOLDER_PATH:-}" ]; then
  DEST="$TARGET_BUILD_DIR/$UNLOCALIZED_RESOURCES_FOLDER_PATH/Game"
  rm -rf "$DEST"
  mkdir -p "$DEST"
  cp -R "$OUT/." "$DEST/"
  node scripts/verify-web-bundle.mjs "$DEST"
fi
