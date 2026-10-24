from test import run
SC="window.SK_GAME.scene"
def s(pg, shot, ev, key):
    pg.wait_for_timeout(4500)
    pg.fill('#nick','Lab'); pg.click('#go'); pg.wait_for_timeout(400); pg.click('#ok'); pg.wait_for_timeout(1500)
    ev("()=>{window.SK_GAME.goRogue(); return 1}"); pg.wait_for_timeout(16000); pg.click('[data-f="3"]'); pg.wait_for_timeout(5000)
    ev("()=>{window.SK_GAME.startNight(); return 1}"); pg.wait_for_timeout(1200); shot('menu')
    ev("()=>{document.querySelector('#lb').click(); return 1}"); pg.wait_for_timeout(16000)
    shot('room1')
    print(ev(f"()=>JSON.stringify([{SC}.endless, {SC}.mazeRule, {SC}.mz.N, document.querySelector('#checklist').innerText])"))
    for i in range(2):
        ev(f"()=>{{{SC}.nextRoom(); return 1}}"); pg.wait_for_timeout(3500)
    shot('room3_dark')
    print(ev(f"()=>JSON.stringify([{SC}.endless.room, {SC}.mz.N, {SC}.dark, {SC}.run.xp])"))
    for i in range(3):
        ev(f"()=>{{{SC}.mazeCaught(); return 1}}"); pg.wait_for_timeout(2500)
    pg.wait_for_timeout(3000); shot('debrief')
    print(ev("()=>document.body.innerText.slice(0,600)"))
run(s, 960, 540, 'lb_')
