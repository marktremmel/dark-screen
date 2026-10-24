# The intro plays at the first start: one screenshot in the middle of each shot, then the flat.
from test import run
def s(pg, shot, ev, key):
    pg.wait_for_timeout(4500)
    pg.fill('#nick','Intro'); pg.click('#go'); pg.wait_for_timeout(400); pg.click('#ok'); pg.wait_for_timeout(1500)
    ev("()=>{window.SK_GAME.goRogue(); return 1}"); pg.wait_for_timeout(16000)
    ev("()=>{const b=document.querySelector('[data-f=\"5\"]'); if(b) b.click(); return 1}")
    seen = set(); n = 0
    for i in range(400):
        pg.wait_for_timeout(500)
        st = ev("()=>{const C=window.SK_GAME.cine; if(!C) return 'none'; if(C.loading||!C.shot) return 'wait'; return C.shot.title+'|'+(C.t/C.shot.dur).toFixed(2)}")
        if st == 'none' and n > 2: break
        if '|' in st:
            t, k = st.split('|')
            if t not in seen and float(k) > 0.45:
                seen.add(t); n += 1; shot('shot_' + str(n))
    pg.wait_for_timeout(6000); shot('after')
    print('intro flag', ev("()=>window.SK_GAME.R && JSON.stringify((JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k=>localStorage.getItem(k).includes('Intro'))||'{}')||'{}'))).slice(0,0)"), 'shots', n)
logs = run(s, 1280, 720, 'cine/i')
