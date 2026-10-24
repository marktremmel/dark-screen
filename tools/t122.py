from test import run
SC="window.SK_GAME.scene"
def step(ev, n=1, dt=0.05):
    return ev(f"()=>{{const G=window.SK_GAME; for(let i=0;i<{n};i++){{G.t+={dt}; G.scene.update({dt},G.t);}} return 1}}")
def s(pg, shot, ev, key):
    pg.wait_for_timeout(4500)
    pg.fill('#nick','Arc'); pg.click('#go'); pg.wait_for_timeout(400); pg.click('#ok'); pg.wait_for_timeout(1500)
    ev("()=>{window.SK_GAME.goRogue(); return 1}"); pg.wait_for_timeout(16000); pg.click('[data-f="3"]'); pg.wait_for_timeout(5000)
    ev("()=>{const G=window.SK_GAME; G.run={topic:'T5',diff:'normal',walk:'underpass',xp:0,coins:0,spot:0,miss:0,fals:0,stages:['stairs'],lessons:[],typedChars:0,typeMs:0,keys:0,errors:0,cards:0}; G.goWalk(G.run); return 1}"); pg.wait_for_timeout(28000)
    ev(f"()=>{{const sc={SC}; sc.playing=true; if (sc.wave) sc.endWave(); sc.st.wave=3; const A=sc.arcade; const p=sc.player; const ry=A.scr.rotation.y; p.set(A.pos.x + Math.sin(ry)*0.8, A.pos.z + Math.cos(ry)*0.8, ry*180/Math.PI); p.sync(); return 1}}"); step(ev,2); shot('cabinet')
    ev(f"()=>{{{SC}.playArcade(); return 1}}"); pg.wait_for_timeout(1200); shot('game')
    # click the tricks on screen 1, one honest part on purpose
    ev("""()=>{const bs=[...document.querySelectorAll('[data-i]')]; const T=['OFFER','MYSTERY','STREAK','ONLY 2','NO THANKS','GEMS','ENERGY','AHEAD','NOTIFICATIONS','DAY 6','SEND ME','FREE TRIAL']; let n=0; for(const b of bs){ if(T.some(t=>b.textContent.toUpperCase().includes(t))) {b.click(); n++;} } return n}""")
    pg.wait_for_timeout(1200); shot('summary')
    for i in range(2):
        ev("()=>{document.querySelector('#arcNx').click(); return 1}"); pg.wait_for_timeout(800)
        ev("""()=>{const bs=[...document.querySelectorAll('[data-i]')]; const T=['OFFER','MYSTERY','STREAK','ONLY 2','NO THANKS','GEMS','ENERGY','AHEAD','NOTIFICATIONS','DAY 6','SEND ME','FREE TRIAL']; for(const b of bs){ if(T.some(t=>b.textContent.toUpperCase().includes(t))) b.click(); } return 1}"""); pg.wait_for_timeout(1200)
    ev("()=>{document.querySelector('#arcNx').click(); return 1}"); pg.wait_for_timeout(800)
    print(ev(f"()=>JSON.stringify([{SC}.run.xp, {SC}.R.record.notebook.length])"))
run(s, 960, 540, 'ar_')
