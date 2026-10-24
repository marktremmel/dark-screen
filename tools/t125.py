import os
from test import run
HARD=os.environ.get('HARD','true')
SC="window.SK_GAME.scene"
def step(ev, n=1, dt=0.05):
    return ev(f"()=>{{const G=window.SK_GAME; for(let i=0;i<{n};i++){{G.t+={dt}; G.scene.update({dt},G.t);}} return 1}}")
def s(pg, shot, ev, key):
    pg.wait_for_timeout(4500)
    pg.fill('#nick','Hard'); pg.click('#go'); pg.wait_for_timeout(400); pg.click('#ok'); pg.wait_for_timeout(1500)
    ev("()=>{window.SK_GAME.goRogue(); return 1}"); pg.wait_for_timeout(16000); pg.click('[data-f="3"]'); pg.wait_for_timeout(5000)
    ev("()=>{const G=window.SK_GAME; G.run={topic:'T1',diff:'normal',hard:"+HARD+",walk:'park',xp:0,coins:0,spot:0,miss:0,fals:0,stages:['stairs'],lessons:[],typedChars:0,typeMs:0,keys:0,errors:0,cards:0}; G.goWalk(G.run); return 1}"); pg.wait_for_timeout(26000)
    ev(f"()=>{{const sc={SC}; sc.playing=true; if(!sc.wave) sc.startWave&&sc.startWave(); return 1}}"); step(ev, 20); pg.wait_for_timeout(1500); shot('wave')
    print(ev(f"()=>JSON.stringify(({SC}.wave&&{SC}.wave.targets.list||[]).map(t=>[t.p.text,t.p.strict]))"))
run(s, 960, 540, 'pk'+HARD[0]+'_')
