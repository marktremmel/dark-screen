from test import run
SC="window.SK_GAME.scene"
def s(pg, shot, ev, key):
    pg.wait_for_timeout(4500)
    pg.fill('#nick','Ten'); pg.click('#go'); pg.wait_for_timeout(400); pg.click('#ok'); pg.wait_for_timeout(1500)
    ev("()=>{window.SK_GAME.goRogue(); return 1}"); pg.wait_for_timeout(16000); pg.click('[data-f="3"]'); pg.wait_for_timeout(5000)
    ev("()=>{const G=window.SK_GAME; G.run={topic:'T1',diff:'normal',hard:false,tenant:true,shape:'usual',route:['stairs','walk','school','metro'],walk:'underpass',cur:'walk',xp:10,coins:7,spot:0,miss:0,fals:0,stages:['stairs'],lessons:[],typedChars:0,typeMs:0,keys:0,errors:0,cards:0}; G.goWalk(G.run); return 1}"); pg.wait_for_timeout(28000)
    # put the player half way, skip waves, call the Tenant now
    ev(f"()=>{{const sc={SC}; sc.playing=true; sc.st.wave=3; const p=sc.route[Math.floor(sc.route.length*0.6)]; sc.player.set(p.x,p.z,0); sc.player.sync(); sc.tenant.awayT=0.05; return 1}}")
    pg.wait_for_timeout(2500); shot('glimpse')
    pg.wait_for_timeout(5000)
    print(ev(f"()=>JSON.stringify([{SC}.tenant.state, Math.round({SC}.tenant.dist({SC}.player.pos)), {SC}.run.tenantMet, {SC}.playing])"))
    for k,dd in enumerate([4.5,2.2]):
        ev(f"()=>{{const sc={SC}; sc.tenant.state='roam'; sc.tenant.wanderT=99; const i=Math.floor(sc.route.length*0.6); const a=sc.route[i], b=sc.route[i+2]; const dx=b.x-a.x, dz=b.z-a.z, L=Math.hypot(dx,dz); sc.player.set(a.x,a.z,Math.atan2(-dx,-dz)*180/Math.PI); sc.player.sync(); sc.flashOn=false; sc.tenant.target=sc.tenant.sOf(a.x+dx/L*{dd},a.z+dz/L*{dd}); sc.tenant.s=sc.tenant.target; sc.tenant.npc.obj.position.set(a.x+dx/L*{dd},0,a.z+dz/L*{dd}); sc.tenant.npc.faceTo(a.x,a.z); return 1}}"); pg.wait_for_timeout(1800); shot(f'close{k}')
run(s, 960, 540, 'tn2_')
