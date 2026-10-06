#!/bin/bash
# Bundles src/ into game/game.js. The asset packs in game/data/ are prebuilt (tools/pack.py needs the original asset files, which are not in this repository).
cd "$(dirname "$0")" && ./node_modules/.bin/esbuild src/main.js --bundle --format=iife --minify --target=chrome90 --outfile=game/game.js --log-level=warning
