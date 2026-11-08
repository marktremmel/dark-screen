# Voice acting pipeline (v1.4)

All voices are Kokoro-82M (Apache 2.0), rendered on the Mac. Same steps as the Betűkaland dubbing playbook.

1. `node tools/voice/extract_lines.mjs`: collects every voiced line from src/ into voice/lines.json (+ summary.txt).
2. In a working folder with lines.json copied as all_lines.json, pron.json and the scripts:
   `uv run --python 3.12 --with kokoro --with soundfile --with "misaki[en]" --with ./en_core_web_sm-3.8.0-py3-none-any.whl python render_all.py`
   (test_voices.py + listen.html and cast_test.py + cast.html were the casting rounds; review.html checks the render.)
   The cast, per-line fixes and the who → role mapping are at the top of render_all.py. Re-running only renders new or changed lines.
3. Copy the render folder to voice/render and run `node tools/voice/build_voice.mjs voice/render`:
   writes game/data/vo_*.js and src/voice_index.js. Then `./build.sh`.

The game finds a clip by the words on screen (src/core/voice.js), so a changed line falls back to the old babble until it is re-rendered.
