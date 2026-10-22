#!/bin/sh
# Builds the web game for the iPhone app and copies it into the app as `Game/` (an Xcode build phase runs this).
# The build is cached in ios/build/web and only redone when the game's sources change.
# Without Node.js the app still builds; it then explains on screen that the game files are missing.
set -eu

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/ios/build/web"
STAMP="$OUT/.stamp"

# Xcode runs build phases with a minimal PATH: look where Node usually lives
export PATH="/opt/homebrew/bin:/usr/local/bin:$HOME/.volta/bin:$PATH"
if [ -s "$HOME/.nvm/nvm.sh" ] && ! command -v node >/dev/null 2>&1; then
  # shellcheck disable=SC1091
  . "$HOME/.nvm/nvm.sh" >/dev/null 2>&1 || true
fi

needs_build() {
  [ ! -f "$STAMP" ] && return 0
  [ -n "$(find "$ROOT/src" "$ROOT/public" "$ROOT/index.html" "$ROOT/package-lock.json" "$ROOT/vite.config.ts" -newer "$STAMP" -print -quit)" ]
}

if command -v npm >/dev/null 2>&1; then
  if needs_build; then
    echo "Bundling the game with Vite..."
    cd "$ROOT"
    [ -d node_modules ] || npm ci --no-audit --no-fund
    MOSHI_BASE=./ npx vite build --outDir "$OUT" --emptyOutDir --logLevel warn
    # The app has its own offline copy: no service worker needed
    rm -f "$OUT/sw.js"
    touch "$STAMP"
  fi
elif [ ! -f "$OUT/index.html" ]; then
  echo "warning: Node.js not found, so the game wasn't bundled. Install Node 22 (brew install node) and build again."
  exit 0
fi

# Only inside an Xcode build: copy into the app bundle
if [ -n "${TARGET_BUILD_DIR:-}" ] && [ -n "${UNLOCALIZED_RESOURCES_FOLDER_PATH:-}" ]; then
  DEST="$TARGET_BUILD_DIR/$UNLOCALIZED_RESOURCES_FOLDER_PATH/Game"
  rm -rf "$DEST"
  mkdir -p "$DEST"
  cp -R "$OUT/." "$DEST/"
  rm -f "$DEST/.stamp"
fi
