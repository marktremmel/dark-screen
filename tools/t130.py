import os
from test import run
SC="window.SK_GAME.scene"
PLACE=os.environ.get('PLACE','courtyard')
def s(pg, shot, ev, key):
    pg.wait_for_timeout(4500)
    pg.fill('#nick','Place'); pg.click('#go'); pg.wait_for_timeout(400); pg.click('#ok'); pg.wait_for_timeout(1500)
    ev("()=>{window.SK_GAME.goRogue(); return 1}"); pg.wait_for_timeout(16000); pg.click('[data-f="3"]'); pg.wait_for_timeout(5000)
    ev("()=>{const G=window.SK_GAME; G.run={topic:'T1',diff:'normal',hard:false,shape:'usual',route:['stairs','walk','school','metro'],walk:'"+PLACE+"',xp:0,coins:0,spot:0,miss:0,fals:0,stages:['stairs'],lessons:[],typedChars:0,typeMs:0,keys:0,errors:0,cards:0}; G.run.cur='walk'; G.goWalk(G.run); return 1}"); pg.wait_for_timeout(30000)
    ev(f"()=>{{const sc={SC}; sc.playing=true; return 1}}"); pg.wait_for_timeout(1500); shot('start')
    for i,(z,yaw,pitch) in enumerate([(-14,0,0),(-26,25,-0.1),(-40,0,0),(-52,-20,0)]):
        ev(f"()=>{{const sc={SC}; const p=sc.player; p.set(sc.route[0].x+({i}%2?0.6:-0.6),{z},{yaw}); p.pitch={pitch}; p.sync(); sc.cullChunks&&sc.cullChunks(); return 1}}"); pg.wait_for_timeout(1500); shot(f'z{-z}')
    ev(f"()=>{{const sc={SC}; const p=sc.player; p.set(sc.exitAt.x+0.5, sc.exitAt.z+5, 0); p.sync(); return 1}}"); pg.wait_for_timeout(1500); shot('exit')
    print(ev(f"()=>JSON.stringify([{SC}.kind, {SC}.route.length, {SC}.lamps.length, {SC}.exitName, !!{SC}.rain])"))
run(s, 960, 540, 'pl_'+PLACE[:3]+'_')
