# Mix the trailer: frames from ccap.py (build/<dir>/f*.jpg, cues.txt) + music + the cue sounds -> MP4.
# python3 trailer_mix.py <dir> <out.mp4> [music_key]
import sys, os, json, base64, subprocess
d, out = sys.argv[1], sys.argv[2]; mus = sys.argv[3] if len(sys.argv) > 3 else 'mus_tense'
FPS = 24; DATA = '/home/claude/sotet/game/data/'; tmp = '/tmp/claude-0/mix/'; os.makedirs(tmp, exist_ok=True)
audio = {}
for f in ['core.js', 'ep1.js', 'rogue.js', 'metro.js', 'street.js', 'park.js']:
    s = open(DATA + f).read(); i = s.index('=', s.index('SK_DATA["')); pk = json.loads(s[s.index('{', i):].rstrip().rstrip(';'))
    for k, v in pk['audio'].items(): audio.setdefault(k, v)
def wav(key):
    p = tmp + key + '.wav'
    if not os.path.exists(p):
        v = audio[key]; b = base64.b64decode(v.split(',', 1)[1] if v.startswith('data:') else v)
        raw = tmp + key + '.bin'; open(raw, 'wb').write(b)
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', raw, '-ar', '44100', '-ac', '2', p], check=True)
    return p
n = len([f for f in os.listdir(d) if f.endswith('.jpg')]); dur = n / FPS
cues = []
for line in open(os.path.join(d, 'cues.txt')).read().split('\n'):
    if not line.strip(): continue
    t, c = line.split(' ', 1)
    for part in c.split(','):
        key, vol = part.split('@'); cues.append((float(t), key, float(vol)))
inputs = ['-framerate', str(FPS), '-i', os.path.join(d, 'f%05d.jpg'), '-stream_loop', '-1', '-i', wav(mus)]
filt = [f'[1:a]atrim=0:{dur:.3f},afade=t=in:st=0:d=1.5,afade=t=out:st={dur - 3:.3f}:d=3,volume=0.55[m]']
labels = ['[m]']
for j, (t, key, vol) in enumerate(cues):
    inputs += ['-i', wav(key)]; ms = int(t * 1000)
    filt.append(f'[{j + 2}:a]adelay={ms}|{ms},volume={vol * 1.6:.2f}[c{j}]'); labels.append(f'[c{j}]')
filt.append(''.join(labels) + f'amix=inputs={len(labels)}:duration=first:normalize=0,alimiter=limit=0.9[a]')
cmd = ['ffmpeg', '-y', '-loglevel', 'error'] + inputs + ['-filter_complex', ';'.join(filt), '-map', '0:v', '-map', '[a]',
       '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', os.environ.get('CRF', '21'), '-preset', 'slow', '-c:a', 'aac', '-b:a', '192k', '-t', f'{dur:.3f}', '-movflags', '+faststart', out]
subprocess.run(cmd, check=True); print('ok', out, f'{dur:.1f}s', len(cues), 'cues')
