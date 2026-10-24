from test import run
SC="window.SK_GAME.scene"
def s(pg, shot, ev, key):
    pg.wait_for_timeout(4500)
    pg.fill('#nick','Route'); pg.click('#go'); pg.wait_for_timeout(400); pg.click('#ok'); pg.wait_for_timeout(1500)
    ev("()=>{window.SK_GAME.goRogue(); return 1}"); pg.wait_for_timeout(16000); pg.click('[data-f="3"]'); pg.wait_for_timeout(5000)
    ev("()=>{window.SK_GAME.startNight(); return 1}"); pg.wait_for_timeout(1200); shot('menu')
    ev("()=>{document.querySelector('#sr').click(); return 1}"); pg.wait_for_timeout(300); shot('menu2')
    ev("()=>{document.querySelector('#x').click(); return 1}"); pg.wait_for_timeout(800); shot('stayin')
    print(ev("()=>document.body.innerText.slice(0,300)"))
    # a long night, jump to after the metro: walk2 should load
    ev("()=>{const G=window.SK_GAME; G.run={topic:'T1',diff:'normal',hard:false,shape:'long',route:['stairs','walk','school','metro','walk2'],walk:'park',walk2:'pool',xp:40,coins:5,spot:1,miss:0,fals:0,stages:['stairs','walk','school','metro'],lessons:[],typedChars:0,typeMs:0,keys:0,errors:0,cards:0}; G.rogueNext(G.run,'metro'); return 1}"); pg.wait_for_timeout(1500); shot('choice')
    print(ev("()=>[...document.querySelectorAll('.panel,.phone')].map(e=>e.innerText.slice(0,120)).join(' || ')"))
    ev("()=>{document.querySelector('[data-m=go]').click(); return 1}"); pg.wait_for_timeout(22000); shot('walk2')
    print(ev(f"()=>JSON.stringify([{SC}.constructor.name, {SC}.kind, {SC}.stage])"))
    # finish: push walk2 and go next -> full
    ev(f"()=>{{const sc={SC}; sc.run.stages.push('walk2'); sc.playing=false; window.SK_GAME.rogueNext(sc.run,'walk2'); return 1}}"); pg.wait_for_timeout(5000); shot('debrief')
    print(ev("()=>document.body.innerText.slice(0,500)"))
run(s, 960, 540, 'rt_')
