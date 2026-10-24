from test import run
SC="window.SK_GAME.scene"
def s(pg, shot, ev, key):
    pg.wait_for_timeout(4500)
    pg.fill('#nick','Dof'); pg.click('#go'); pg.wait_for_timeout(400); pg.click('#ok'); pg.wait_for_timeout(1500)
    ev("()=>{window.SK_GAME.goRogue(); return 1}"); pg.wait_for_timeout(16000); pg.click('[data-f="3"]'); pg.wait_for_timeout(5000)
    ev("()=>{const G=window.SK_GAME; G.run={topic:'T1',diff:'normal',hard:false,shape:'usual',route:['stairs','walk','school','metro'],walk:'park',cur:'stairs',xp:0,coins:0,spot:0,miss:0,fals:0,stages:[],lessons:[],typedChars:0,typeMs:0,keys:0,errors:0,cards:0}; G.goStairs(G.run); return 1}"); pg.wait_for_timeout(9000)
    for i in range(3):
        ev("()=>{const b=[...document.querySelectorAll('button')].filter(b=>b.offsetParent); if(b.length) b[b.length-1].click(); return b.length}"); pg.wait_for_timeout(1500)
    for i,(x,z,yaw,pitch) in enumerate([(-0.95,1.35,0,0),(1.0,-0.6,-75,0),(-1.9,0.4,200,0),(0.3,-1.0,150,-0.1)]):
        ev(f"()=>{{const sc={SC}; sc.playing=true; const p=sc.player; p.set({x},{z},{yaw}); p.pitch={pitch}; p.sync(); return 1}}"); pg.wait_for_timeout(1500); shot(f'v{i}')
run(s, 960, 540, 'dof_')
