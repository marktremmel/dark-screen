# v0.23: the intro starts at the first entry, Esc skips it, you land in your flat and it is marked as seen.
from test import run
def s(pg, shot, ev, key):
    pg.wait_for_timeout(4500)
    pg.fill('#nick','Fresh'); pg.click('#go'); pg.wait_for_timeout(400); pg.click('#ok'); pg.wait_for_timeout(1500)
    ev("()=>{window.SK_GAME.goRogue(); return 1}"); pg.wait_for_timeout(16000)
    ev("()=>{const b=document.querySelector('[data-f=\"5\"]'); if(b) b.click(); return 1}")
    for i in range(40):
        pg.wait_for_timeout(1000)
        if ev("()=>!!(window.SK_GAME.cine&&window.SK_GAME.cine.shot)"): break
    print('intro running:', ev("()=>!!window.SK_GAME.cine"))
    pg.wait_for_timeout(3000); shot('intro'); key('Space'); pg.wait_for_timeout(2500); shot('next'); key('Escape'); pg.wait_for_timeout(12000)
    print('after esc: cine', ev("()=>!!window.SK_GAME.cine"), 'home', ev("()=>!!(window.SK_GAME.scene&&window.SK_GAME.scene.phone)"), 'seen', ev("()=>JSON.stringify(window.SK_GAME.scene.R.record.intro)"), 'overlay', ev("()=>!!document.getElementById('cine')"))
    print(ev("()=>{const c=window.SK_GAME.camera; return JSON.stringify([c.position.toArray(),c.rotation.toArray(),c.parent&&c.parent.type, c.fov, c.zoom, c.aspect, c.scale.toArray()])}"))
    shot('home')
logs = run(s, 1280, 720, 'intro_')
