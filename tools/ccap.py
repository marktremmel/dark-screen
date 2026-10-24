# Step a cutscene frame by frame (exact timing on a slow machine). python3 ccap.py intro|trailer every out_prefix [w h]
# every=1: every frame (the trailer, to a jpg sequence); every=N: one frame in N (checks).
import sys, os
from test import run
which, every, pre = sys.argv[1], int(sys.argv[2]), sys.argv[3]
W, H = (int(sys.argv[4]), int(sys.argv[5])) if len(sys.argv) > 5 else (1280, 720)
FPS = 24
outdir = f'/home/claude/sotet/build/{pre}/'; os.makedirs(outdir, exist_ok=True)
def s(pg, shot, ev, key):
    pg.wait_for_timeout(4500)
    pg.fill('#nick','Capture'); pg.click('#go'); pg.wait_for_timeout(400); pg.click('#ok'); pg.wait_for_timeout(1500)
    ev("()=>{window.SK_GAME.noIntro=true; window.SK_GAME.goRogue(); return 1}"); pg.wait_for_timeout(16000)
    ev("()=>{const b=document.querySelector('[data-f=\"5\"]'); if(b) b.click(); return 1}"); pg.wait_for_timeout(5000)
    ev("(w)=>{const G=window.SK_GAME; G.capture=true; window._cend=false; (w==='intro'?G.playIntro():G.playTrailer()).then(()=>window._cend=true).catch(e=>{window._cerr=String(e.stack||e); window._cend=true}); return 1}", which)
    f = 0; n = 0; cues = []
    while True:
        st = ev("()=>{const G=window.SK_GAME,C=G.cine; if(window._cend) return 'end'; if(!C||C.loading||!C.shot) return 'wait'; G.stepFrame(1/%d); const c=G._cue; G._cue=null; return c?('cue:'+c):'ok'}" % FPS)
        if st == 'end': break
        if st == 'wait': pg.wait_for_timeout(250); continue
        if st.startswith('cue:'): cues.append((f / FPS, st[4:]))
        if f % every == 0:
            n += 1; pg.screenshot(path=f'{outdir}f{n:05d}.jpg', type='jpeg', quality=92, timeout=90000)
        f += 1
        if f % 240 == 0: print('frame', f, flush=True)
    print('frames', f, 'saved', n, 'err', ev("()=>window._cerr||''"))
    open(outdir + 'cues.txt', 'w').write('\n'.join(f'{t:.3f} {c}' for t, c in cues))
logs = run(s, W, H, 'cine/x')
