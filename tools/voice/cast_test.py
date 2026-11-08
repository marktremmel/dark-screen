# Sötét Képernyő casting round: 3 candidates per character on real game lines + Hungarian name spellings.
# Run in Terminal, in this folder:
#   uv run --python 3.12 --with kokoro --with soundfile --with "misaki[en]" python cast_test.py
# Then open cast.html.
import json, os, re, shutil, subprocess, time
import numpy as np, soundfile as sf
from kokoro import KPipeline

HERE = os.path.dirname(os.path.abspath(__file__)); os.chdir(HERE)
CAST = json.load(open('cast.json'))
PRON = {k: v for k, v in json.load(open('pron.json')).items() if not k.startswith('_')}
SR = 24000
FFMPEG = shutil.which('ffmpeg') or exit('ffmpeg is needed: brew install ffmpeg')
FX = {
  'phone':   'highpass=f=320,lowpass=f=3300,acompressor=threshold=-20dB:ratio=6,aresample=8000,aresample=24000,volume=1.6',
  'speaker': 'highpass=f=180,lowpass=f=7000,aecho=0.8:0.6:28|55:0.25|0.15,acompressor=threshold=-18dB:ratio=3',
  'chat':    'highpass=f=140,lowpass=f=7500,aecho=0.7:0.5:12:0.18,acompressor=threshold=-20dB:ratio=3,volume=1.1',
  'mail':    'highpass=f=120,lowpass=f=9000,acompressor=threshold=-20dB:ratio=2',
  'notif':   'highpass=f=200,lowpass=f=6000,aecho=0.6:0.4:18:0.15,acompressor=threshold=-20dB:ratio=3',
}
# Three spellings per Hungarian word: which one sounds closest?
NAMES = {
  'Nagyi': ['Nodge-ee', 'Naw-dyee', 'Nodjy'], 'Bence': ['Ben-tseh', 'Bentseh', 'Ben-tsuh'], 'Dóri': ['Doe-ree', 'Dawree', 'Dory'],
  'Réka': ['Ray-kah', 'Rayka', 'Reh-kaw'], 'Platán': ['Plot-aan', 'Plotahn', 'Plaw-taan'], 'Keleti': ['Keh-leh-tee', 'Kelletty', 'Kel-et-ee'],
  'Feri bácsi': ['Ferry baa-chee', 'Feh-ree bah-chee', 'Ferry bawchy'], 'Kovács': ['Koh-vaach', 'Kovahch', 'Ko-vatch'],
  'Varga': ['Vor-gah', 'Vawrga', 'Varga'], 'Laci': ['Lotsy', 'Law-tsee', 'Lotsee'], 'Szia, drágám': ['See-ya, draa-gaam', 'Seeya, drah-gahm', 'See-aw, draw-gahm'],
  'Kórház': ['Koar-haaz', 'Kore-hahz', 'Kawr-haz'], 'Gergő': ['Gair-gur', 'Gher-ger', 'Gair-guh'], 'Ádám': ['Aa-daam', 'Ah-dahm', 'Ahdam'],
  'Zsófi': ['Zhoe-fee', 'Zhofy', 'Zho-fee'], 'Kréta': ['Kray-tah', 'Kraytuh', 'Kreh-taw'], 'Fürkész': ['Fur-kace', 'Fewr-case', 'Foor-kayss'],
}

def respell(t):
  for k in sorted(PRON, key=len, reverse=True): t = re.sub(r'(?<![\wÀ-ž])' + re.escape(k) + r'(?![\wÀ-ž])', PRON[k], t)
  t = re.sub(r'(\d+) 000', lambda m: m.group(1) + ' thousand', t)
  return t.replace('…', '... ').replace('"', '')

def loud(a, target=-20.0):
  r = np.sqrt(np.mean(a ** 2)) + 1e-9; a = a * (10 ** (target / 20) / r)
  return np.tanh(a * 1.2) / 1.2

pipes = {}
def synth(text, voice, speed=1.0):
  lang = voice[0]; pipes.setdefault(lang, KPipeline(lang_code=lang, repo_id='hexgrad/Kokoro-82M'))
  parts = []
  for _, _, audio in pipes[lang](text, voice=voice, speed=speed, split_pattern=r'(?<=[.!?])\s+'):
    parts += [np.asarray(audio), np.zeros(int(SR * 0.45))]
  return loud(np.concatenate(parts[:-1]))

def save(a, name, semis=0, fx=None):
  tmp = name + '.wav'; sf.write(tmp, a, SR); filters = []
  if semis:
    r = 2 ** (semis / 12); filters.append(f'asetrate={int(SR * r)},aresample={SR},atempo={1 / r:.4f}')
  if fx and fx in FX: filters.append(FX[fx])
  cmd = [FFMPEG, '-y', '-loglevel', 'error', '-i', tmp] + (['-af', ','.join(filters)] if filters else []) + ['-c:a', 'aac', '-b:a', '96k', name]
  subprocess.run(cmd, check=True); os.remove(tmp)

os.makedirs('cast_clips', exist_ok=True)
man = {'cast': CAST, 'names': {}, 'clips': {}}
t0 = time.time()
for c in CAST:
  for ci, (voice, speed, semis) in enumerate(c['cands']):
    for li, ln in enumerate(c['lines']):
      name = f"cast_clips/{c['id']}_{ci}_{li}.m4a"
      man['clips'][f"{c['id']}_{ci}_{li}"] = name
      if os.path.exists(name): continue
      save(synth(respell(ln['text']), voice, speed), name, semis, ln.get('fx'))
      man['clips'][f"{c['id']}_{ci}_{li}"] = name
    print(f"{time.time() - t0:6.1f}s  {c['id']:10} {voice} speed {speed} pitch {semis:+}")
for hu, opts in NAMES.items():
  man['names'][hu] = opts
  for oi, sp in enumerate(opts):
    for v in ['af_nicole', 'af_heart']:
      name = f"cast_clips/name_{hu.replace(' ', '_').replace(',', '')}_{oi}_{v}.m4a"
      man['clips'][f'{hu}|{oi}|{v}'] = name
      if os.path.exists(name): continue
      save(synth(f'This is {sp}. {sp}.', v), name)
      man['clips'][f'{hu}|{oi}|{v}'] = name
  print(f"{time.time() - t0:6.1f}s  name {hu}")
open('cast_clips/manifest.js', 'w').write('window.CAST = ' + json.dumps(man, ensure_ascii=False) + ';')
print('\nDone. Open cast.html in your browser.')
