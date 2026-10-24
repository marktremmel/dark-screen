from test import run
def s(pg, shot, ev, key):
    pg.wait_for_timeout(4500)
    pg.fill('#nick','Shop'); pg.click('#go'); pg.wait_for_timeout(400); pg.click('#ok'); pg.wait_for_timeout(1500)
    ev("()=>{window.SK_GAME.goRogue(); return 1}"); pg.wait_for_timeout(16000); pg.click('[data-f="3"]'); pg.wait_for_timeout(5000)
    print(ev("()=>{const k=Object.keys(window.SK_DATA.rogue.img).filter(k=>k.startsWith('th_')); return k.length}"))
    ev("()=>{window.SK_GAME.scene.computer(); return 1}"); pg.wait_for_timeout(2500)
    ev("()=>{const t=[...document.querySelectorAll('button,[data-tab],[data-c]')].find(b=>/paint|festm/i.test(b.textContent)); if(t) t.click(); return !!t}"); pg.wait_for_timeout(1500)
    ev("()=>{const i=[...document.querySelectorAll('img')].find(im=>im.src.length>1000 && im.closest('.screen')); const b=[...document.querySelectorAll('.screen b, .screen div')].find(e=>/Endless Maze/.test(e.textContent)); if(b) b.scrollIntoView(); return 1}"); pg.wait_for_timeout(1500); shot('shop')
    print(ev("()=>[...document.querySelectorAll('.screen img')].filter(i=>i.naturalWidth===0).length + ' broken of ' + document.querySelectorAll('.screen img').length"))
run(s, 960, 540, 'shop_')
