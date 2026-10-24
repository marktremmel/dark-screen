import time, os
from test import run
SC="window.SK_GAME.scene"
MODE=os.environ.get('MODE','all')
def s(pg, shot, ev, key):
    pg.wait_for_timeout(4500)
    pg.fill('#nick','Perf'); pg.click('#go'); pg.wait_for_timeout(400); pg.click('#ok'); pg.wait_for_timeout(1500)
    if MODE in ('nograin','none'):
        ev("()=>{setInterval(()=>{document.querySelectorAll('canvas').forEach(c=>{if(c.width===160&&c.height===90)c.remove()}); [...document.querySelectorAll('div')].forEach(d=>{if((d.style.background||'').includes('radial-gradient'))d.remove()})},500); return 1}")
    ev("()=>{window.SK_GAME.goRogue(); return 1}"); pg.wait_for_timeout(16000); pg.click('[data-f="3"]'); pg.wait_for_timeout(5000)
    t0=time.time(); g0=ev("()=>window.SK_GAME.t")
    pg.wait_for_timeout(15000)
    g1=ev("()=>window.SK_GAME.t"); print(MODE,'flat fps-ish', round((g1-g0)/(time.time()-t0),2), flush=True)
run(s, 960, 540, 'perf_')
