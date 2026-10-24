# v0.23: the computer's new layout, every app.
from test import run
SC = "window.SK_GAME.scene"
def s(pg, shot, ev, key):
    pg.wait_for_timeout(4500)
    pg.fill('#nick','Desk'); pg.click('#go'); pg.wait_for_timeout(400); pg.click('#ok'); pg.wait_for_timeout(1500)
    ev("()=>{window.SK_GAME.noIntro=true; window.SK_GAME.goRogue(); return 1}"); pg.wait_for_timeout(16000)
    ev("()=>{const b=document.querySelector('[data-f=\"5\"]'); if(b) b.click(); return 1}"); pg.wait_for_timeout(6000)
    ev(f"()=>{{const sc={SC}; const R=sc.R; R.life.coins=230; R.record.xp=640; R.record.topics={{T1:3,T5:1,T9:2}}; R.record.best={{xp:180,wpm:41,stages:4,rooms:7}}; R.record.nights=[{{topic:'T1',walk:'alley',xp:120,wpm:38,outcome:'full'}},{{topic:'T9',walk:'park',xp:60,wpm:33,outcome:'home'}},{{topic:'T5',walk:'underpass',xp:40,wpm:29,outcome:'death'}}]; R.record.notebook=['bulb_red','wifi_note']; sc.computer(); return 1}}"); pg.wait_for_timeout(2500)
    for t in ['shop', 'stickers', 'maker', 'flat', 'notebook', 'record', 'save', 'help']:
        ev("(t)=>{document.querySelector('[data-t=\"'+t+'\"]').click(); return 1}", t); pg.wait_for_timeout(1500); shot(t)
    ev("()=>{document.querySelector('[data-t=\"save\"]').click(); document.querySelector('#st').click(); return 1}"); pg.wait_for_timeout(1200); shot('settings')
logs = run(s, 1280, 720, 'desk_')
