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
    # face it and show it
    ev(f"()=>{{const sc={SC}; const h=sc.tenant.npc.obj.position, p=sc.player.pos; const yaw=Math.atan2(-(h.x-p.x),-(h.z-p.z))*180/Math.PI; sc.player.set(p.x,p.z,yaw); sc.player.sync(); sc.flashOn=true; return 1}}"); pg.wait_for_timeout(2500); shot('seen')
    print(ev(f"()=>JSON.stringify([{SC}.tenant.state, Math.round({SC}.tenant.dist({SC}.player.pos)*10)/10])"))
    # caught: stand where it is while it hunts
    ev(f"()=>{{const sc={SC}; const h=sc.tenant.npc.obj.position; sc.tenant.state='hunt'; sc.player.set(h.x+0.5,h.z,0); sc.player.sync(); return 1}}"); pg.wait_for_timeout(5000); shot('caught')
    print(ev(f"()=>JSON.stringify([{SC}.R.life.nerve, {SC}.run.coins, {SC}.tenant.state])"))
run(s, 960, 540, 'tn_')
