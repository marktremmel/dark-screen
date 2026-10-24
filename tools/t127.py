from test import run
SC="window.SK_GAME.scene"
def s(pg, shot, ev, key):
    pg.wait_for_timeout(4500)
    pg.fill('#nick','Phone'); pg.click('#go'); pg.wait_for_timeout(400); pg.click('#ok'); pg.wait_for_timeout(1500)
    ev("()=>{window.SK_GAME.goRogue(); return 1}"); pg.wait_for_timeout(16000); pg.click('[data-f="3"]'); pg.wait_for_timeout(6000)
    ev(f"()=>{{const sc={SC}; sc.playing=true; const p=sc.player; p.set(1.3,-3.85,0); p.sync&&p.sync(); return 1}}"); pg.wait_for_timeout(800)
    ev(f"()=>{{const sc={SC}; sc.player.pitch=-0.75; sc.player.sync(); return 1}}"); pg.wait_for_timeout(600); shot('desk')
    print(ev(f"()=>JSON.stringify([{SC}.jobWaiting()&&{SC}.jobWaiting().id])"))
    ev(f"()=>{{{SC}.openPhone(); return 1}}"); pg.wait_for_timeout(4500); shot('chat')
    # pick a risky reply first
    ev("()=>{const b=[...document.querySelectorAll('[data-i]')].find(b=>!b.textContent.startsWith('I do not')); b.click(); return 1}"); pg.wait_for_timeout(2500); shot('risky')
    ev("()=>{const b=[...document.querySelectorAll('[data-i]')].find(b=>b.textContent.startsWith('I do not')); b.click(); return 1}"); pg.wait_for_timeout(500)
    for ch in 'I do not send photos to people I have not met.':
        pg.keyboard.type(ch)
    pg.wait_for_timeout(5000); shot('done')
    ev("()=>{document.querySelector('#hd').click(); return 1}"); pg.wait_for_timeout(800)
    print(ev(f"()=>JSON.stringify([{SC}.R.record.jobs, {SC}.R.record.notebook, {SC}.jobWaiting()])"))
run(s, 960, 540, 'ph_')
