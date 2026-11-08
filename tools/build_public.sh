#!/bin/bash
# Builds the public version (itch.io, the iOS/Android app) into build/public: the game from game/
# (which already has the phone layer from platform/) with lesson codes off and the app's loading screen.
#   ./tools/build_public.sh                → build/public  (zip it for itch)
#   ./tools/build_public.sh <app folder>   → also copies it into a Capacitor project (its root and www/), then: npx cap sync ios
set -e
cd "$(dirname "$0")/.."
./build.sh
OUT=build/public
rm -rf "$OUT" && mkdir -p "$OUT"
cp -R game/* "$OUT/"
rm -f "$OUT/README.txt"
python3 tools/public_index.py game/index.html "$OUT/index.html"
echo "build/public: $(find "$OUT" -type f | wc -l | tr -d ' ') files, $(du -sh "$OUT" | cut -f1)"
if [ -n "$1" ]; then
  APP="$1"
  for d in "$APP" "$APP/www"; do
    mkdir -p "$d"
    cp -R "$OUT"/* "$d/"
  done
  rm -f "$APP/sw.js" "$APP/www/sw.js"      # the app reads its files locally; an offline cache only caused stale versions
  echo "Copied into $APP (and www/). Next: cd \"$APP\" && npx cap sync ios"
fi
