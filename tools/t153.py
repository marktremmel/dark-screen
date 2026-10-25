# v0.24: a night code gives the same night as the preview; the question in your own words is saved; the board shows it.
from test import run
SC = "window.SK_GAME.scene"
def s(pg, shot, ev, key):
    pg.wait_for_timeout(4500)
    pg.fill('#nick','Coder'); pg.click('#go'); pg.wait_for_timeout(400); pg.click('#ok'); pg.wait_for_timeout(1500)
    ev("()=>{window.SK_GAME.noIntro=true; window.SK_GAME.goRogue(); return 1}"); pg.wait_for_timeout(16000)
    ev("()=>{const b=document.querySelector('[data-f=\"5\"]'); if(b) b.click(); return 1}"); pg.wait_for_timeout(6000)
    ev("()=>{window.SK_GAME.startNight(); return 1}"); pg.wait_for_timeout(1500)
    pg.fill('#nc', 't1 862hh'); ev("()=>{document.querySelector('#ncb').click(); return 1}"); pg.wait_for_timeout(600); shot('menu_code')
    print('menu topic', ev("()=>document.querySelector('#tt').textContent"), '|', ev("()=>document.querySelector('#nm').textContent.slice(0,60)"))
    ev("()=>{document.querySelector('#go').click(); return 1}"); pg.wait_for_timeout(9000)
    print('run', ev("()=>JSON.stringify({seed:window.SK_GAME.run.seed, code:window.SK_GAME.run.code, walk:window.SK_GAME.run.walk, shape:window.SK_GAME.run.shape})"))
    ev("()=>{const G=window.SK_GAME; G.run.cur='walk'; G.run.stages=['stairs']; G.goWalk(G.run); return 1}"); pg.wait_for_timeout(30000)
    print('first lines', ev(f"()=>{SC}.queue.map(w=>w.map(l=>l.who).join(' + ')).join(' / ')"))
    print('anchor', ev("()=>JSON.stringify(window.SK_GAME.run.anchor)"))
    ev("()=>{const G=window.SK_GAME; G.run.stages=['stairs','walk']; G.run.xp=40; G.endNight(G.run,'full'); return 1}"); pg.wait_for_timeout(5000)
    for i in range(3):
        if ev("()=>!!document.querySelector('#ra')"): break
        ev("()=>{const b=[...document.querySelectorAll('.panel button')].filter(b=>b.offsetParent); if(b.length) b[0].click(); return b.length}"); pg.wait_for_timeout(2500)
    pg.fill('#ra', 'The link wanted me to log in fast, and the hurry was the trick.'); pg.wait_for_timeout(300); shot('reflect'); ev("()=>{document.querySelector('#ok').click(); return 1}"); pg.wait_for_timeout(9000)
    print('saved night', ev("()=>{const r=window.SK_GAME.scene.R.record.nights[0]; return JSON.stringify({code:r.code,rq:r.rq,ra:r.ra})}"))
    ev(f"()=>{{{SC}.computer(); return 1}}"); pg.wait_for_timeout(2000)
    ev("()=>{document.querySelector('[data-t=\"save\"]').click(); return 1}"); pg.wait_for_timeout(800)
    code = ev("()=>document.querySelector('#cd').value"); print('save code length', len(code))
    b = pg.context.new_page(); b.goto('file:///home/claude/sotet/build/Teacher_Board_v14.html'); b.wait_for_timeout(1000)
    b.fill('textarea', code); b.evaluate("()=>document.querySelector('#add').click()"); b.wait_for_timeout(1200)
    b.evaluate("()=>{const t=document.querySelector('#tl tr[data-l]'); t&&t.click(); return 1}"); b.wait_for_timeout(500)
    b.screenshot(path='/home/claude/sotet/build/shots/code_board.png', full_page=True)
    print('board words', b.evaluate("()=>document.querySelector('#wl').textContent.slice(0,200)"))
logs = run(s, 1280, 720, 'code_')
