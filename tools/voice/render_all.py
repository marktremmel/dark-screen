# Sötét Képernyő: render every line with the chosen cast → render/*.m4a + render/manifest.js, then open review.html.
# Run in Terminal, in this folder (~40 min on an M2 Pro; you can stop it and run again, it continues):
#   uv run --python 3.12 --with kokoro --with soundfile --with "misaki[en]" python render_all.py
# Only some groups:   ... python render_all.py ep9 lepcsohaz/calls
# Re-render one line after a fix: delete its file from render/ and run again.
import hashlib, json, os, re, shutil, subprocess, sys, time, zlib
import numpy as np, soundfile as sf
from kokoro import KPipeline

HERE = os.path.dirname(os.path.abspath(__file__)); os.chdir(HERE)
LINES = json.load(open('all_lines.json'))
PRON = {k: v for k, v in json.load(open('pron.json')).items() if not k.startswith('_')}
SR = 24000
FFMPEG = shutil.which('ffmpeg') or exit('ffmpeg is needed: brew install ffmpeg')

# Final cast: [voice, speed, semitones, extra effect]  (from cast_choices.json + Mark's notes)
CAST = {
  'narrator': ['af_nicole', 1.15, 0,    None],      # "very spooky, kinda slow: 1.1-1.2"
  'tip':      ['af_nicole', 1.2,  0,    None],      # "faster but nice"
  'thought':  ['af_nicole', 1.0,  0,    'close'],
  'nagyi':    ['bf_alice',  0.86, -2.5, 'old'],     # "alice sounds the oldest but all youngish": lower, slower, a little shake
  'mum':      ['af_heart',  1.1,  0,    None],      # "first is cool, just faster"
  'varga':    ['af_heart',  0.97, -0.5, None],
  'vela':     ['bf_emma',   0.95, 0,    'speaker'],
  'ai':       ['bf_emma',   1.0,  1,    None],      # Lumi and other AI friends: VELA's cousin, warmer
  'boys':     ['am_puck',   1.05, 2,    None],
  'girls':    ['af_bella',  1.1,  1.5,  None],
  'ghost':    ['am_puck',   1.0,  0,    None],
  'laci':     ['bm_lewis',  1.0,  0,    None],
  'feri':     ['bm_lewis',  0.92, -1,   None],
  'man':      ['am_fenrir', 0.95, -1,   None],      # Dad, police, coach (lewis is already Laci and Feri)
  'scammer':  ['am_michael', 1.0, 0,    None],
  'scammer_f':['af_bella',  1.0,  0,    None],
  'system':   ['bf_emma',   1.0,  0,    None],
}
FX = {
  'phone':   'highpass=f=320,lowpass=f=3300,acompressor=threshold=-20dB:ratio=6,aresample=8000,aresample=24000,volume=1.6',
  'speaker': 'highpass=f=180,lowpass=f=7000,aecho=0.8:0.6:28|55:0.25|0.15,acompressor=threshold=-18dB:ratio=3',
  'chat':    'highpass=f=140,lowpass=f=7500,aecho=0.7:0.5:12:0.18,acompressor=threshold=-20dB:ratio=3,volume=1.1',
  'mail':    'highpass=f=120,lowpass=f=9000,acompressor=threshold=-20dB:ratio=2',
  'notif':   'highpass=f=200,lowpass=f=6000,aecho=0.6:0.4:18:0.15,acompressor=threshold=-20dB:ratio=3',
  'old':     'vibrato=f=5.5:d=0.06,lowpass=f=8000',
  'close':   'aecho=0.6:0.5:40|80:0.18|0.1,lowpass=f=7000',
}

# Per-line fixes from review_fixes.json: id → speed / gap (pause between sentences, s) / voice role
FIXES = {
  'lepcsohaz_intro_dca40b17': {'gap': 0.25},   # parcel text: shorter pause between "stuck" and "Pay"
  'ep7_020e7d32': {'speed': 1.25},             # Laci: "Hey! You! Stop right there!" was a bit slow
}

def role_of(who, group):
  w = who.lower(); h = zlib.crc32(who.encode()) % 2
  if w in ('narrator', 'through the peephole', 'right call', 'new notebook card', 'lost', 'kept') : return 'narrator'
  if w == 'tip': return 'tip'
  if w.startswith('vela'): return 'vela'
  if 'lumi' in w or 'ai friend' in w or 'ai companion' in w or 'chatbot' in w or 'studybot' in w: return 'ai'
  if w.startswith('nagyi'): return 'nagyi'
  if w.startswith('mum') or w == 'the voice': return 'mum'           # scammers clone Mum's voice (ep9: fake Kati)
  if 'varga' in w or 'teacher' in w: return 'varga'
  if w.startswith('laci'): return 'laci'
  if w.startswith('feri'): return 'feri'
  if w.startswith('dad') or 'police officer' in w or 'man (behind' in w or 'coach' in w: return 'man'
  if 'szellem' in w or 'bully' in w or 'unknown account' in w or 'fake account' in w: return 'ghost'
  if re.match(r'(bence|dani|gergő|márk|ádám|szabi|your cousin|unknown \(from the game\)|a gaming friend|your team)', w): return 'boys'
  if re.match(r'(dori|dóri|lili|réka|zsófi|a voice message from lili|noémi)', w): return 'girls'
  if re.search(r'thought|feed|next video|streak|red badge|the shop|your post|notification at', w): return 'thought'
  if re.search(r'classmate|friend|group|class |comment|real$|^group$|club', w): return 'boys' if h else 'girls'
  if re.search(r'police|bank|support|winner|security|stranger|follower|someone|unknown|account security|instagram support', w):
    return 'scammer' if h else 'scammer_f'
  return 'system'

SLANG = {r'\bu\b': 'you', r'\bur\b': 'your', r'\bomg\b': 'oh my god', r'\bpls\b': 'please', r'\bya\b': 'yeah', r'\bidk\b': 'I dont know', r'\btbh\b': 'to be honest'}
def normalize(t):
  for k in sorted(PRON, key=len, reverse=True): t = re.sub(r'(?<![\wÀ-ž])' + re.escape(k) + r'(?![\wÀ-ž])', PRON[k], t)
  for k, v in SLANG.items(): t = re.sub(k, v, t, flags=re.I)
  t = re.sub(r'(\d+) 000 000', r'\1 million', t); t = re.sub(r'(\d+) 000', r'\1 thousand', t)
  t = re.sub(r'(\d+)\s*Ft\b', r'\1 forints', t)
  t = re.sub(r'\b(\d{1,2})\.([A-Z])\b', r'\1 \2', t)                      # 7.B → 7 B
  t = t.replace('District XIII', 'District thirteen').replace('@everyone', 'at everyone')
  t = t.replace('…', '... ').replace('"', '').replace('“', '').replace('”', '')
  return re.sub(r'\s+', ' ', t).strip()

def loud(a, target=-20.0):
  r = np.sqrt(np.mean(a ** 2)) + 1e-9; a = a * (10 ** (target / 20) / r)
  return np.tanh(a * 1.2) / 1.2

pipes = {}
def synth(text, voice, speed, gap=0.45):
  lang = voice[0]; pipes.setdefault(lang, KPipeline(lang_code=lang, repo_id='hexgrad/Kokoro-82M'))
  parts = []
  for _, _, audio in pipes[lang](text, voice=voice, speed=speed, split_pattern=r'(?<=[.!?])\s+'):
    parts += [np.asarray(audio), np.zeros(int(SR * gap))]
  return loud(np.concatenate(parts[:-1])) if parts else None

def encode(a, name, semis, fxs):
  tmp = name + '.wav'; sf.write(tmp, a, SR); f = []
  if semis: r = 2 ** (semis / 12); f.append(f'asetrate={int(SR * r)},aresample={SR},atempo={1 / r:.4f}')
  f += [FX[x] for x in fxs if x in FX]
  f.append('alimiter=limit=0.89')
  subprocess.run([FFMPEG, '-y', '-loglevel', 'error', '-i', tmp, '-af', ','.join(f), '-ac', '1', '-c:a', 'aac', '-b:a', '64k', name], check=True)
  os.remove(tmp)

only = sys.argv[1:]
os.makedirs('render', exist_ok=True)
man, t0, done, skipped = [], time.time(), 0, 0
todo = LINES
for i, l in enumerate(todo):
  wanted = not only or any(l['group'].startswith(o) for o in only)
  fix = FIXES.get(l['id'], {})
  role = fix.get('role') or role_of(l['who'], l['group']); voice, speed, semis, extra = CAST[role]
  speed = fix.get('speed', speed); gap = fix.get('gap', 0.45)
  entry = {'id': l['id'], 'group': l['group'], 'who': l['who'], 'role': role, 'text': l['text'], 'file': None, 'dynamic': l['dynamic'], 'fx': l.get('fx')}
  man.append(entry)
  if l['dynamic']: skipped += 1; continue                     # lines with {name}/{number} keep the babble for now
  said = normalize(l['spoken'])
  if not re.search(r'[A-Za-z]{2}', said): continue
  key = hashlib.sha1(json.dumps([said, voice, speed, semis, extra, l.get('fx')] + ([gap] if gap != 0.45 else [])).encode()).hexdigest()[:10]
  name = f"render/{l['id']}_{key}.m4a"; entry['file'] = name
  if os.path.exists(name): continue
  if not wanted: entry['file'] = None; continue
  a = synth(said, voice, speed, gap)
  if a is None: entry['file'] = None; continue
  encode(a, name, semis, [extra, l.get('fx')])
  done += 1
  el = time.time() - t0; print(f"{i + 1:4}/{len(todo)}  {el / 60:5.1f} min  {role:9} {l['group']:22} {said[:60]}")
open('render/manifest.js', 'w').write('window.RENDER = ' + json.dumps({'cast': CAST, 'lines': man}, ensure_ascii=False) + ';')
print(f'\nDone: {done} new clips, {skipped} dynamic lines skipped. Open review.html.')
