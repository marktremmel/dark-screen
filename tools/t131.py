from test import run
SC="window.SK_GAME.scene"
def s(pg, shot, ev, key):
    pg.wait_for_timeout(4500)
    pg.fill('#nick','Fx'); pg.click('#go'); pg.wait_for_timeout(400); pg.click('#ok'); pg.wait_for_timeout(1500)
    ev("()=>{window.SK_GAME.goRogue(); return 1}"); pg.wait_for_timeout(16000); pg.click('[data-f="3"]'); pg.wait_for_timeout(5000)
    ev("()=>{const G=window.SK_GAME; G.run={topic:'T1',diff:'normal',hard:false,shape:'usual',route:['stairs','walk','school','metro'],walk:'park',xp:0,coins:0,spot:0,miss:0,fals:0,stages:['stairs'],lessons:[],typedChars:0,typeMs:0,keys:0,errors:0,cards:0,cur:'walk'}; G.goWalk(G.run); return 1}"); pg.wait_for_timeout(28000)
    for i,(dz,yaw,pitch,fl) in enumerate([(5,0,0.15,False),(4,0,0.15,True),(7,10,0.05,True)]):
        ev(f"()=>{{const sc={SC}; sc.playing=true; const L=sc.lamps[{i}].L.position; const p=sc.player; p.set(L.x-0.8, L.z+{dz}, {yaw}); p.pitch={pitch}; p.sync(); sc.flashOn={'true' if fl else 'false'}; return 1}}"); pg.wait_for_timeout(1500); shot(f'lamp{i}')
run(s, 960, 540, 'lfx_')
