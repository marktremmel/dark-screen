# What each lesson night code holds (for the teacher guide): python3 codes.py codes.json out.json
import sys, json
from test import run
codes = json.load(open(sys.argv[1])); res = []
def s(pg, shot, ev, key):
    pg.wait_for_timeout(4500)
    pg.fill('#nick','Codes'); pg.click('#go'); pg.wait_for_timeout(400); pg.click('#ok'); pg.wait_for_timeout(1500)
    ev("()=>{window.SK_GAME.noIntro=true; window.SK_GAME.goRogue(); return 1}"); pg.wait_for_timeout(16000)
    ev("()=>{const b=document.querySelector('[data-f=\"5\"]'); if(b) b.click(); return 1}"); pg.wait_for_timeout(5000)
    for c in codes:
        r = pg.evaluate("async (c)=>{ try { return await window.SK_GAME.previewNight(c); } catch(e) { return {err:String(e.stack||e)}; } }", c['code'])
        r['topic'] = c['topic']; r['shape'] = c['shape']; r['seed'] = c['seed']; res.append(r); print(c['code'], 'ok' if 'err' not in r else r['err'][:300], flush=True)
logs = run(s, 1280, 720, 'codes_')
json.dump(res, open(sys.argv[2], 'w'), ensure_ascii=False, indent=1)
