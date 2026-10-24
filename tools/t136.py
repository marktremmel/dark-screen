from test import run
SC="window.SK_GAME.scene"
def s(pg, shot, ev, key):
    pg.wait_for_timeout(4500)
    pg.fill('#nick','Cho'); pg.click('#go'); pg.wait_for_timeout(400); pg.click('#ok'); pg.wait_for_timeout(1500)
    ev("()=>{window.SK_GAME.goRogue(); return 1}"); pg.wait_for_timeout(16000); pg.click('[data-f="3"]'); pg.wait_for_timeout(5000)
    ev("()=>{const G=window.SK_GAME; G.forceSchool={ring:'feed',gym:'chorus'}; G.run={topic:'T6',diff:'normal',walk:'park',route:['stairs','walk','school','metro'],cur:'school',xp:0,coins:0,spot:0,miss:0,fals:0,stages:['stairs','walk'],lessons:[],typedChars:0,typeMs:0,keys:0,errors:0,cards:0}; G.goSchool(G.run); return 1}"); pg.wait_for_timeout(30000)
    print(ev(f"()=>JSON.stringify([{SC}.CH && {SC}.CH.target, {SC}.CH && {SC}.CH.him])"))
    ev(f"()=>{{const sc={SC}; sc.playing=true; sc.st.zone=3; sc.chorusDone('stand'); sc.setObjective(); return 1}}"); pg.wait_for_timeout(1500)
    print(ev("()=>document.body.innerText.slice(0,400)"))
run(s, 960, 540, 'ch_')
