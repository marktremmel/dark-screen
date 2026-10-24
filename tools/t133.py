import time
from test import run
SC="window.SK_GAME.scene"
def s(pg, shot, ev, key):
    pg.wait_for_timeout(4500)
    pg.fill('#nick','Perf'); pg.click('#go'); pg.wait_for_timeout(400); pg.click('#ok'); pg.wait_for_timeout(1500)
    ev("()=>{window.SK_GAME.goRogue(); return 1}"); pg.wait_for_timeout(16000); pg.click('[data-f="3"]'); pg.wait_for_timeout(5000)
    ev("()=>{const G=window.SK_GAME; G.run={topic:'T1',diff:'normal',hard:false,shape:'usual',route:['stairs','walk','school','metro'],walk:'park',xp:0,coins:0,spot:0,miss:0,fals:0,stages:['stairs'],lessons:[],typedChars:0,typeMs:0,keys:0,errors:0,cards:0,cur:'walk'}; G.goWalk(G.run); return 1}")
    for i in range(10):
        t=time.time(); r=ev("()=>{const sc=window.SK_GAME.scene; return [sc&&sc.constructor.name, !!(sc&&sc.lamps), window.SK_GAME.t]}"); print(i, round(time.time()-t,1), r, flush=True); pg.wait_for_timeout(5000)
    ev(f"()=>{{const sc={SC}; sc.playing=true; sc.flashOn=true; return 1}}")
    for i in range(6):
        t=time.time(); r=ev("()=>window.SK_GAME.t"); print('on', i, round(time.time()-t,1), r, flush=True); pg.wait_for_timeout(3000)
run(s, 960, 540, 'perf_')
