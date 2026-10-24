# Scout camera positions for cutscenes: python3 cscout.py plan.json  (plan: [{at, cams:[[x,y,z,yaw,pitch],...], setup?: "js(sc,C)", torch?}])
import sys, json
from test import run
plan = json.load(open(sys.argv[1])); tag = sys.argv[2] if len(sys.argv) > 2 else 'c'
def s(pg, shot, ev, key):
    pg.wait_for_timeout(4500)
    pg.fill('#nick','Bori'); pg.click('#go'); pg.wait_for_timeout(400); pg.click('#ok'); pg.wait_for_timeout(1500)
    ev("()=>{window.SK_GAME.noIntro=true; window.SK_GAME.goRogue(); return 1}"); pg.wait_for_timeout(16000)
    ev("()=>{const b=document.querySelector('[data-f=\"5\"]'); if(b) b.click(); return 1}"); pg.wait_for_timeout(5000)
    for j, p in enumerate(plan):
        setup = p.get('setup', '')
        ev("(a)=>{const G=window.SK_GAME; window._cdone=false; G.playCine([{at:a.at,dur:99999,cam:[a.cams[0]],torch:a.torch,fadeIn:false,fadeOut:false,setup:a.setup?new Function('sc','C',a.setup):null, tick:a.tick?new Function('sc','dt','k','C',a.tick):null}],Object.assign({skippable:false},a.o||{})).then(()=>window._cdone=true).catch(e=>{window._cerr=String(e&&e.stack||e)}); return 1}", {'at': p['at'], 'cams': p['cams'], 'torch': p.get('torch', False), 'setup': setup, 'tick': p.get('tick', ''), 'o': p.get('o')})
        for _ in range(60):
            pg.wait_for_timeout(1000)
            if ev("()=>{const C=window.SK_GAME.cine; return !!(C&&C.shot)||!!window._cerr}"): break
        err = ev("()=>window._cerr||''")
        if err: print('CINE ERROR', p['at'], err[:1500]); ev("()=>{window._cerr='';return 1}"); continue
        for i, c in enumerate(p['cams']):
            ev("(c)=>{window.SK_GAME.cine.shot.cam=[c]; return 1}", c); pg.wait_for_timeout(p.get('wait', 2500)); shot(f"{j}_{p['at'].replace(':','_')}_{i}")
        ev("()=>{const C=window.SK_GAME.cine; C.shot.dur=0; return 1}"); pg.wait_for_timeout(1500)
logs = run(s, 1280, 720, 'cine/' + tag)
print('\n'.join(l for l in logs if 'rror' in l)[:3000])
