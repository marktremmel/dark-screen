# Sötét Képernyő voice test: every test line in every Kokoro voice (+ effects), then open listen.html.
# Run in Terminal, in this folder:
#   uv run --python 3.12 --with kokoro --with soundfile --with "misaki[en]" python test_voices.py
# (first run downloads the Kokoro model, ~330 MB; after that ~1-2 minutes on an M2 Pro)
import json, os, re, shutil, subprocess, sys, time
import numpy as np, soundfile as sf
from kokoro import KPipeline

HERE = os.path.dirname(os.path.abspath(__file__)); os.chdir(HERE)
LINES = json.load(open('test_lines.json'))
PRON = {k: v for k, v in json.load(open('pron.json')).items() if not k.startswith('_')}
VOICES = sys.argv[1:] or ['af_heart', 'af_bella', 'af_nicole', 'af_sarah', 'af_sky', 'am_michael', 'am_fenrir', 'am_puck', 'am_adam',
                          'bf_emma', 'bf_isabella', 'bf_alice', 'bf_lily', 'bm_george', 'bm_fable', 'bm_lewis', 'bm_daniel']
SR = 24000
FFMPEG = shutil.which('ffmpeg')
FX = {  # ffmpeg filters
  'phone':   'highpass=f=320,lowpass=f=3300,acompressor=threshold=-20dB:ratio=6,aresample=8000,aresample=24000,volume=1.6',
  'speaker': 'highpass=f=180,lowpass=f=7000,aecho=0.8:0.6:28|55:0.25|0.15,acompressor=threshold=-18dB:ratio=3',
  'chat':    'highpass=f=140,lowpass=f=7500,aecho=0.7:0.5:12:0.18,acompressor=threshold=-20dB:ratio=3,volume=1.1',
}

def respell(t):
  for k in sorted(PRON, key=len, reverse=True): t = re.sub(r'(?<![\wÀ-ž])' + re.escape(k) + r'(?![\wÀ-ž])', PRON[k], t)
  t = t.replace('…', '... ').replace('20 000', 'twenty thousand').replace('23:04', 'eleven oh four')
  return t

def loud(a, target=-20.0):  # equal loudness (RMS) per clip + soft limit
  r = np.sqrt(np.mean(a ** 2)) + 1e-9; a = a * (10 ** (target / 20) / r)
  return np.tanh(a * 1.2) / 1.2

pipes = {}
os.makedirs('clips', exist_ok=True)
manifest = {'voices': VOICES, 'lines': LINES, 'clips': {}}
t0 = time.time()
for v in VOICES:
  lang = v[0]  # 'a' American, 'b' British
  pipes.setdefault(lang, KPipeline(lang_code=lang, repo_id='hexgrad/Kokoro-82M'))
  for ln in LINES:
    text = respell(ln['text']); parts = []
    for _, _, audio in pipes[lang](text, voice=v, speed=ln.get('speed', 1.0), split_pattern=r'(?<=[.!?])\s+'):
      parts += [np.asarray(audio), np.zeros(int(SR * 0.4))]
    a = loud(np.concatenate(parts[:-1]))
    name = f"clips/{ln['id']}__{v}.wav"; sf.write(name, a, SR)
    if ln.get('fx') and FFMPEG:
      out = name.replace('.wav', '.m4a')
      subprocess.run([FFMPEG, '-y', '-loglevel', 'error', '-i', name, '-af', FX[ln['fx']], '-c:a', 'aac', '-b:a', '96k', out], check=True); os.remove(name); name = out
    elif FFMPEG:
      out = name.replace('.wav', '.m4a'); subprocess.run([FFMPEG, '-y', '-loglevel', 'error', '-i', name, '-c:a', 'aac', '-b:a', '96k', out], check=True); os.remove(name); name = out
    manifest['clips'][f"{ln['id']}__{v}"] = name
    print(f'{time.time() - t0:6.1f}s  {v:12} {ln["id"]}')
open('clips/manifest.js', 'w').write('window.MANIFEST = ' + json.dumps(manifest, ensure_ascii=False) + ';')
print('\nDone. Open listen.html in your browser.' + ('' if FFMPEG else '  (ffmpeg not found: no effects. brew install ffmpeg)'))
