#!/bin/bash
# Builds the public version (itch.io, the iOS/Android app, phone browsers) into build/public:
# the game from game/ + the touch, gyroscope, keyboard and haptics layer from platform/, lesson codes off.
#   ./tools/build_public.sh                → build/public  (zip it for itch)
#   ./tools/build_public.sh <app folder>   → also copies it into a Capacitor project (its www/ and root), then: npx cap sync
set -e
cd "$(dirname "$0")/.."
./build.sh
OUT=build/public
rm -rf "$OUT" && mkdir -p "$OUT"
cp -R game/data "$OUT/data"
cp game/game.js game/style.css game/CREDITS.txt "$OUT/"
cp -R platform/* "$OUT/"
# index.html: the school page plus the phone layer, and no lesson codes
python3 - "$OUT/index.html" <<'EOF'
import sys
s = open('game/index.html').read()
s = s.replace('<meta name="viewport" content="width=device-width,initial-scale=1">',
  '<meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=no,viewport-fit=cover">')
s = s.replace('<link rel="stylesheet" href="style.css">', '''<link rel="stylesheet" href="style.css">
<link rel="stylesheet" href="touch.css">
<link rel="manifest" href="manifest.json">
<meta name="theme-color" content="#07070a">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Sötét Képernyő">
<link rel="apple-touch-icon" href="icon-192.png">''')
s = s.replace('<div id="loading"><div class="ltitle">SÖTÉT KÉPERNYŐ</div><div id="lbar"><div id="lfill"></div></div><div id="lmsg">Loading…</div></div>', '''<div id="loading">
  <div id="loading-backdrop" class="loading-backdrop">
    <div id="loading-art-a" class="loading-art active"></div>
    <div id="loading-art-b" class="loading-art"></div>
    <div class="loading-vignette"></div>
    <div class="loading-scanlines"></div>
  </div>
  <div class="loading-content">
    <div class="ltitle">SÖTÉT KÉPERNYŐ</div>
    <div id="lstage" class="loading-stage"></div>
    <div id="lbar"><div id="lfill"></div></div>
    <div id="lmsg">Loading…</div>
    <div id="lquote" class="loading-quote"></div>
  </div>
</div>
<script>window.SK_LOCKS = false; // public build: no lesson codes</script>''')
s = s.replace('<script src="game.js"></script>', '''<script src="game.js"></script>
<script src="splash_screen.js"></script>
<script src="touch_controls.js"></script>
<script src="gyro_aim.js"></script>
<script src="virtual_keyboard.js"></script>
<script src="audio_haptics.js"></script>''')
assert s.count('touch_controls.js') == 1 and 'SK_LOCKS = false' in s
open(sys.argv[1], 'w').write(s)
EOF
echo "build/public: $(find "$OUT" -type f | wc -l) files, $(du -sh "$OUT" | cut -f1)"
if [ -n "$1" ]; then
  APP="$1"
  for d in "$APP" "$APP/www"; do
    mkdir -p "$d"
    cp -R "$OUT"/* "$d/"
  done
  rm -f "$APP/sw.js" "$APP/www/sw.js"      # the app reads its files locally; an offline cache only caused stale versions
  echo "Copied into $APP (and www/). Next: cd \"$APP\" && npx cap sync ios"
fi
