from test import run
SC="window.SK_GAME.scene"
FPS="()=>new Promise(r=>{let n=0;const t0=performance.now();const f=()=>{n++; if(performance.now()-t0<4000) requestAnimationFrame(f); else r(n/4)};requestAnimationFrame(f)})"
def s(pg, shot, ev, key):
    pg.wait_for_timeout(4500)
    pg.fill('#nick','Perf'); pg.click('#go'); pg.wait_for_timeout(400); pg.click('#ok'); pg.wait_for_timeout(1500)
    ev("()=>{window.SK_GAME.goRogue(); return 1}"); pg.wait_for_timeout(16000); pg.click('[data-f="3"]'); pg.wait_for_timeout(5000)
    ev("()=>{const G=window.SK_GAME; G.run={topic:'T1',diff:'normal',hard:false,shape:'usual',route:['stairs','walk','school','metro'],walk:'park',xp:0,coins:0,spot:0,miss:0,fals:0,stages:['stairs'],lessons:[],typedChars:0,typeMs:0,keys:0,errors:0,cards:0,cur:'walk'}; G.goWalk(G.run); return 1}"); pg.wait_for_timeout(28000)
    ev(f"()=>{{const sc={SC}; sc.playing=true; sc.flashOn=false; return 1}}")
    print('torch off', ev(FPS), flush=True)
    ev(f"()=>{{const sc={SC}; sc.flashOn=true; return 1}}")
    print('torch on', ev(FPS), flush=True)
    ev(f"()=>{{const sc={SC}; sc.dust=null; return 1}}")
    print('no dust', ev(FPS), flush=True)
    ev(f"()=>{{const sc={SC}; sc.scene.traverse(o=>{{if((o.isMesh||o.isSprite)&&o.material&&o.material.blending===2) o.visible=false;}}); sc.lamps.forEach(l=>{{l.shaft=null;l.glow=null;}}); return 1}}")
    print('no shafts', ev(FPS), flush=True)
run(s, 960, 540, 'perf_')
