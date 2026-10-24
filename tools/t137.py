from test import run
SC="window.SK_GAME.scene"
def s(pg, shot, ev, key):
    pg.wait_for_timeout(4500)
    pg.fill('#nick','Long'); pg.click('#go'); pg.wait_for_timeout(400); pg.click('#ok'); pg.wait_for_timeout(1500)
    ev("()=>{window.SK_GAME.goRogue(); return 1}"); pg.wait_for_timeout(16000); pg.click('[data-f="3"]'); pg.wait_for_timeout(5000)
    ev("()=>{const G=window.SK_GAME; G.run={topic:'T1',diff:'normal',hard:false,shape:'long',route:['stairs','walk','school','metro','walk2'],walk:'park',walk2:'alley',cur:'metro',xp:40,coins:5,spot:1,miss:0,fals:0,stages:['stairs','walk','school'],lessons:[],typedChars:0,typeMs:0,keys:0,errors:0,cards:0}; G.goMetro(G.run); return 1}"); pg.wait_for_timeout(26000)
    ev(f"()=>{{const sc={SC}; sc.playing=true; sc.st.train='in'; sc.board(); return 1}}"); pg.wait_for_timeout(6000); shot('after_board')
    print(ev("()=>[...document.querySelectorAll('.screen')].map(e=>e.innerText.slice(0,80)).join(' || ')"))
    ev("()=>{document.querySelector('[data-m=go]').click(); return 1}"); pg.wait_for_timeout(25000); shot('walk2')
    print(ev(f"()=>JSON.stringify([{SC}.kind, {SC}.stage])"))
run(s, 960, 540, 'ln_')
