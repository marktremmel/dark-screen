from test import run
SC="window.SK_GAME.scene"
def s(pg, shot, ev, key):
    pg.wait_for_timeout(4500)
    pg.fill('#nick','Red'); pg.click('#go'); pg.wait_for_timeout(400); pg.click('#ok'); pg.wait_for_timeout(1500)
    ev("()=>{window.SK_GAME.goRogue(); return 1}"); pg.wait_for_timeout(16000); pg.click('[data-f="3"]'); pg.wait_for_timeout(5000)
    ev("()=>{const G=window.SK_GAME; G.run={topic:'T1',diff:'normal',walk:'park',xp:0,coins:0,spot:0,miss:0,fals:0,stages:[],lessons:[],typedChars:0,typeMs:0,keys:0,errors:0,cards:0}; G.goStairs(G.run); return 1}"); pg.wait_for_timeout(9000)
    for i in range(3):
        ev("()=>{const b=[...document.querySelectorAll('button')].filter(b=>b.offsetParent); if(b.length) b[b.length-1].click(); return b.length}"); pg.wait_for_timeout(1500)
    ev(f"()=>{{const sc={SC}; sc.d.cur.anomaly='lift_send_it'; sc.dressAll(); return 1}}"); pg.wait_for_timeout(600); shot('normal')
    ev(f"()=>{{const sc={SC}; sc.d.cur.anomaly='notice_ai_caretaker'; sc.dressAll(); return 1}}"); pg.wait_for_timeout(600); shot('red')
    ev(f"()=>{{const p={SC}.player; p.set(p.x||0, p.z||0, 180); p.sync&&p.sync(); return 1}}"); pg.wait_for_timeout(600); shot('red2')
run(s, 960, 540, 'an2_')
