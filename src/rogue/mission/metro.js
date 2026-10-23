// Stage four: the last train. An empty metro platform; your own old posts glow all over it, and the Collector
// (a tall figure with glowing shopping bags) is picking them up one by one. Take down the posts that give away
// where you live, where you go and when you are alone, before it reaches them. Leave the harmless ones:
// hiding everything is not the point, knowing what matters is. Then the last train comes. Topic: T9 digital footprint.
import * as THREE from 'three';
import { Walker } from '../../scenes/walker.js';
import { texBox, place, canvasTex, pxText } from '../../core/world.js';
import { A } from '../../core/assets.js';
import { psxMat } from '../../core/render.js';
import { lockPointer, wasPressed } from '../../core/player.js';
import { hud, hudParts, objective, prompt, caption, fade, flash, checklist, wait } from '../../core/hud.js';
import { loop, play, music } from '../../core/audio.js';
import { S, persist } from '../../core/state.js';
import { CFG, floorMult } from '../config.js';
import { rng, freshSeed } from '../logic/rng.js';
import { DIFFS } from '../logic/night.js';
import { earn, nerve, noteCard } from '../save/rogueSave.js';
import { POSTS } from '../content/posts.js';
import { NPC } from '../../core/npc.js';
import { bone, attach, hideBone } from '../entities/rig.js';

const X1 = 24, EDGE = -5.6;

export class Metro extends Walker {
  constructor(G, R, run) { super(G); this.R = R; this.run = run; this.D = DIFFS[run.diff] || DIFFS.normal; this.quitLabel = 'Run home (keep what you earned)'; }

  async build() {
    const g = this.newScene(0x05070a, 3, 22);
    this.r = rng(freshSeed());
    this.mult = floorMult(this.R.life.floor) * this.D.reward;
    this.st = { down: 0, wrongDown: 0, taken: 0, safe: 0, timer: this.run.diff === 'calm' ? 100 : this.run.diff === 'hard' ? 65 : 80, train: 'away' };
    this.buildStation(g);
    this.scene.add(new THREE.HemisphereLight(0x8aa0b0, 0x101418, 0.22));
    this.setupRig({ arms: true, flash: true, stepVol: 0.3, reach: 2.4 });
    // the posts: four that give you away and four that don't, on random spots
    const rev = POSTS.filter(p => p.reveals).sort(() => this.r() - 0.5).slice(0, 4), safe = POSTS.filter(p => !p.reveals).sort(() => this.r() - 0.5).slice(0, 4);
    const slots = this.slots.sort(() => this.r() - 0.5);
    this.posts = [...rev, ...safe].map((p, i) => this.makePost(g, p, slots[i]));
    // the Collector
    const c = this.col_ = new NPC('npc_guard', { speed: 0.55 * this.D.speed });
    // the look follows Mark's painting "Ominous Figure in the Eerie Hallway": a tall dark coat with no head showing,
    // two plastic bags in its hands, glowing with the things it has collected
    const dark = new THREE.MeshLambertMaterial({ color: 0x1c1a20, emissive: 0x050406 });
    c.obj.traverse(o => { if (o.isMesh) o.material = dark; });
    c.obj.scale.setScalar(1.25); c.obj.position.set(X1 - 1.5, 0, -2.5); g.add(c.obj);
    hideBone(c, 'Head');
    const bagM = new THREE.MeshBasicMaterial({ color: 0xffc070, transparent: true, opacity: 0.82, fog: true });
    const itemTex = canvasTex(32, 32, cx => { cx.fillStyle = '#f4e8d0'; cx.fillRect(2, 4, 14, 18); cx.fillStyle = '#5a6a88'; cx.fillRect(4, 6, 10, 10); cx.fillStyle = '#e8d8b0'; cx.fillRect(15, 10, 14, 18); cx.fillStyle = '#8a5a48'; cx.fillRect(17, 12, 10, 10); });
    for (const side of ['Left', 'Right']) {
      const hand = bone(c.obj, side + 'Hand'); if (!hand) continue;
      const bag = new THREE.Group();
      const sack = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), bagM); sack.scale.set(1, 1.35, 0.8); sack.position.y = -0.26; bag.add(sack);
      const inside = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.2), new THREE.MeshBasicMaterial({ map: itemTex, transparent: true, opacity: 0.85, fog: true })); inside.position.set(0, -0.24, 0.13); bag.add(inside);
      attach(c.obj, hand, bag, new THREE.Vector3(0, 0, 0));
    }
    this.collector = c; this.cState = { target: null, t: 0, wait: 8 };
  }

  buildStation(g) {
    const col = this.col, block = this.block;
    // platform floor (two rows) and the edge row, tiles from the subway kit (origin at a tile corner, covering x..x+2, z-2..z)
    for (let x = 0; x < X1; x += 2) { place(g, 'sw_mod_platform_floor', x, 0, 0, 0); place(g, 'sw_mod_platform_floor', x, 0, -2, 0); place(g, 'sw_mod_platform_edge', x, 0, -4, 0); }
    // the track pit
    for (let x = -8; x < X1 + 8; x += 4) { place(g, 'sw_mod_track_straight', x, -1.2, -6, 0); place(g, 'sw_mod_track_straight', x, -1.2, -8, 0); }
    texBox(g, null, -8, -1.2, -6.05, X1 + 8, 0, -5.95, { color: 0x3a3a36 });
    // walls: back, far side, ends
    for (let x = 0; x < X1; x += 2) { place(g, 'sw_mod_wall_tall', x, 0, 0.1, 0); place(g, 'sw_mod_wall_tall', x, -1.2, -10.1, 0); }
    texBox(g, null, -0.3, -1.2, -10.2, 0, 4.2, 0.2, { col, block, color: 0x5a5e5a }); texBox(g, null, X1, -1.2, -10.2, X1 + 0.3, 4.2, 0.2, { col, block, color: 0x5a5e5a });
    for (let x = 0; x < X1; x += 2) for (const z of [0, -2, -4, -6, -8]) place(g, 'sw_mod_ceiling_tall', x, 0, z, 0);
    col.push({ x0: -1, x1: X1 + 1, z0: 0, z1: 1 });
    this.edgeCol = { x0: -1, x1: X1 + 1, z0: EDGE - 1, z1: EDGE }; col.push(this.edgeCol);
    // block the back wall for line of sight
    texBox(g, null, 0, 0, 0.12, X1, 4, 0.2, { block, color: 0x000000 });
    // pillars
    this.slots = [];
    for (const x of [6, 12, 18]) {
      texBox(g, null, x - 0.3, 0, -3.3, x + 0.3, 4, -2.7, { col, block, color: 0xb8b2a4 });
      this.slots.push({ x, z: -2.68, ry: 0 }, { x, z: -3.32, ry: Math.PI });
    }
    // benches, bins, timetables, a worklight, turnstiles at the stairs
    for (const x of [4, 10, 16, 21]) place(g, 'sw_prop_bench_01', x, 0, -0.5, 180, { col });
    for (const x of [8, 14, 20]) place(g, 'sw_prop_bin_01', x, 0, -0.45, 0, { col });
    for (const x of [3, 13, 22]) { place(g, 'sw_prop_timetable_01', x, 1.7, -0.02, 180); }
    place(g, 'sw_prop_worklight_01', 22.5, 0, -4.4, 0);
    for (const z of [-1.2, -2.3]) place(g, 'sw_prop_turnstile_01', 2.2, 0, z, 90, { col });
    // spots on the back wall for posts
    for (const x of [4.6, 9.4, 15.4, 19]) this.slots.push({ x, z: -0.04, ry: Math.PI });
    // lights (fixed number)
    for (const x of [2, 7, 12, 17, 22]) { const L = new THREE.PointLight(0xd8f0ff, 1.7, 8, 1.4); this.flick = this.flick || L; L.position.set(x, 3.6, -2.5); g.add(L); const p = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.2), new THREE.MeshBasicMaterial({ color: 0xe8f8ff })); p.rotation.x = Math.PI / 2; p.position.set(x, 3.79, -2.5); g.add(p); }
    // the platform clock
    this.clockTex = canvasTex(80, 24, () => { });
    const ck = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.36), new THREE.MeshBasicMaterial({ map: this.clockTex, fog: false })); ck.position.set(12, 3.1, -3.34); ck.rotation.y = Math.PI; g.add(ck);
    const ck2 = ck.clone(); ck2.position.z = -2.66; ck2.rotation.y = 0; g.add(ck2);
    // the train (waits in the tunnel)
    const tr = this.train = new THREE.Group();
    const body = psxMat({ color: 0x2c5a8a }), winM = new THREE.MeshBasicMaterial({ color: 0xfff0c0 });
    for (let i = 0; i < 2; i++) {
      const car = new THREE.Mesh(new THREE.BoxGeometry(11.5, 3.4, 2.7), body); car.position.set(i * 12, 0.75, 0); tr.add(car);
      for (let w = -4.5; w <= 4.5; w += 1.5) { const win = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.7), winM); win.position.set(i * 12 + w, 1.4, 1.36); tr.add(win); }
    }
    tr.position.set(-40, -0.6, -7.5); g.add(tr);
  }
  makePost(g, p, slot) {
    const t = canvasTex(120, 160, c => {
      c.fillStyle = '#101018'; c.fillRect(0, 0, 120, 160); c.fillStyle = '#1e1e2a'; c.fillRect(4, 4, 112, 152);
    });
    const draw = img => {
      const c = t.userData.g; c.fillStyle = '#101018'; c.fillRect(0, 0, 120, 160); c.fillStyle = '#f2f2f6'; c.fillRect(4, 4, 112, 152);
      if (img) c.drawImage(img, 8, 8, 104, 90);
      c.fillStyle = '#1a1a22'; c.font = '16px m5x7'; c.textBaseline = 'top';
      const words = p.caption.split(' '); let line = '', y = 102;
      for (const w of words) { const tr = line ? line + ' ' + w : w; if (c.measureText(tr).width > 104) { pxText(c, line, 8, y, 16); y += 12; line = w; } else line = tr; }
      if (line) pxText(c, line, 8, y, 16);
      c.fillStyle = '#d0306a'; c.fillRect(8, 146, 5, 5); c.fillStyle = '#555'; c.fillText(String(12 + (p.id.length * 7) % 80), 16, 142);
      t.needsUpdate = true;
    };
    const im = new Image(); im.onload = () => draw(im); im.src = A.img[p.img]; draw(null);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.54, 0.72), new THREE.MeshBasicMaterial({ map: t, fog: true }));
    m.position.set(slot.x, 1.55, slot.z); m.rotation.y = slot.ry; g.add(m);
    const rec = { p, mesh: m, gone: false };
    rec.pos = new THREE.Vector3(slot.x, 0, slot.z + (slot.ry === 0 ? 0.5 : -0.5));
    return rec;
  }

  async enter() {
    this.playing = false; hud(false); music(null);
    loop('mtd', 'rg_drone_stair', { vol: 0.25 }); this.loops.push('mtd');
    for (const rec of this.posts) rec.it = this.it.add(rec.mesh, () => `Your old post: "${rec.p.caption}". E to take it down`, () => this.takeDown(rec), () => !rec.gone);
    this.trainIt = this.it.add(this.train, 'Board the last train', () => this.board(), () => this.st.train === 'in');
    this.player.set(1.2, -1.6, -90);
    await fade(true, 'The metro. The last train is due.\nAll over the platform, your own old posts are glowing.\nSomething tall is collecting them.', 0.01);
    await wait(3.8);
    this.playing = true; hud(true); hudParts({ checklist: true, status: false, eye: false, batt: false });
    this.setObjective(); this.updateHud(); lockPointer();
    await fade(false, '', 1.0);
    caption('Read each post. Take down the ones that give away where you live, where you go, or when you are alone. Leave the harmless ones.', 'say', 8);
  }
  setObjective() {
    if (this.st.train === 'in') objective('The last train is here. Walk to the platform edge and board it (E).');
    else objective('Take down (E) your posts that give you away before the Collector reaches them. Leave the harmless ones. Then catch the last train.');
  }
  updateHud() {
    const s = this.st, L = this.R.life;
    const mm = Math.max(0, Math.ceil(s.timer));
    checklist('The last train', [
      { name: `Nerve: ${L.nerve}`, hu: 'idegek' },
      { name: s.train === 'away' ? `Train in ${Math.floor(mm / 60)}:${String(mm % 60).padStart(2, '0')}` : 'The train is in', hu: 'utolsó metró' },
      { name: `Taken down: ${s.down}`, hu: 'levett' }, { name: `Collected by it: ${s.taken}`, hu: 'elvitte' },
      { name: `Coins tonight: ${this.run.coins}`, hu: 'zseton' },
    ]);
    const c = this.clockTex.userData.g; c.fillStyle = '#120802'; c.fillRect(0, 0, 80, 24); c.fillStyle = '#ffb030'; c.font = '16px m5x7'; c.textBaseline = 'top';
    c.fillText(s.train === 'away' ? `${Math.floor(mm / 60)}:${String(mm % 60).padStart(2, '0')}` : 'NOW', 22, 4); this.clockTex.needsUpdate = true;
  }
  gain(xp, coins) { xp = Math.round(xp * this.mult); coins = Math.round(coins * this.mult); earn(this.R, xp, coins); this.run.xp += xp; this.run.coins += coins; persist(); }
  remove(rec) { rec.gone = true; rec.mesh.visible = false; this.it.remove(rec.it); }
  takeDown(rec) {
    if (rec.gone) return;
    this.remove(rec); play('click', { vol: 0.5, rate: 0.8 });
    if (rec.p.reveals) {
      this.st.down++; this.gain(CFG.xpTracker + 4, 2);
      if (noteCard(this.R, 'p:' + rec.p.id)) this.run.cards++;
      this.run.lessons.push({ zone: 'metro', theme: 'T9', title: `Taken down: "${rec.p.caption}"`, text: rec.p.why });
      caption(`Taken down. ${rec.p.why}`, 'say', 5);
    } else {
      this.st.wrongDown++;
      caption(`You took it down, but it was harmless. ${rec.p.why} Not everything needs hiding.`, 'say', 5);
    }
    this.checkDone();
  }
  checkDone() {
    if (!this.posts.some(r => !r.gone && r.p.reveals) && this.st.train === 'away' && this.st.timer > 6) { this.st.timer = 6; caption('Far down the tunnel, two lights. The train is early.', 'say', 4); }
  }
  collectorUpdate(dt) {
    const c = this.collector, cs = this.cState, p = c.obj.position;
    if (this.st.train !== 'away') { c.stop(); c.update(dt); return; }
    if (cs.wait > 0) { cs.wait -= dt; c.update(dt); return; }   // it has not noticed the posts yet: a head start
    if (!cs.target || cs.target.gone) {
      const left = this.posts.filter(r => !r.gone);
      cs.target = left.sort((a, b) => a.pos.distanceTo(p) - b.pos.distanceTo(p))[0] || null;
      if (cs.target) c.walkTo([cs.target.pos]);
      cs.t = 0;
    }
    if (cs.target && p.distanceTo(cs.target.pos) < 0.3) {
      c.stop(); c.faceTo(cs.target.mesh.position.x, cs.target.mesh.position.z); cs.t += dt;
      if (cs.t > 2.4) {
        const rec = cs.target; this.remove(rec); cs.target = null; this.st.taken++;
        play('paper', { vol: 0.5, pos: [rec.pos.x, 1.5, rec.pos.z] });
        if (rec.p.reveals) {
          if (!S.settings.quiet) flash(0.3, 250);
          caption(`It took "${rec.p.caption}". ${rec.p.why}`, 'say', 6);
          this.run.lessons.push({ zone: 'metro', theme: 'T9', title: `It collected: "${rec.p.caption}"`, text: rec.p.why });
          if (nerve(this.R, -Math.round(10 * this.D.nerveLoss))) { this.playing = false; this.G.loseLife(this.run); return; }
        } else caption(`It took "${rec.p.caption}" and learned nothing from it.`, 'say', 4);
        this.checkDone();
      }
    }
    c.update(dt);
  }
  async board() {
    if (this.st.train !== 'in' || this.boarding) return;
    this.boarding = true; this.playing = false; prompt(null);
    play('door_close', { vol: 0.5 });
    const kept = this.posts.filter(r => !r.gone && !r.p.reveals).length;
    this.gain(CFG.xpGate + 5 * this.st.down + 3 * kept, CFG.coinsMission);
    this.run.stages.push('metro');
    caption('The doors close. The Collector stays on the platform with whatever it found.', 'say', 4);
    await fade(true, 'The last train takes you home.', 1.2);
    await wait(1.5);
    this.G.endNight(this.run, 'metro');
  }
  quit() { this.playing = false; fade(true, '', 0.6).then(() => this.G.endNight(this.run, 'home')); }

  update(dt, t) {
    const s = this.st;
    if (s.train === 'arriving') { this.train.position.x += (2 - this.train.position.x) * Math.min(1, dt * 0.9); if (Math.abs(this.train.position.x - 2) < 0.05) { s.train = 'in'; play('door_open', { vol: 0.5 }); this.setObjective(); this.edgeCol.off = false; } }
    if (!this.playing) return;
    this.player.update(dt);
    if (this.flick) this.flick.intensity = Math.random() < 0.05 ? 0.2 : 1.7;
    if (s.train === 'away') {
      s.timer -= dt;
      if (s.timer <= 0) { s.train = 'arriving'; play('rumble', { vol: 0.6 }); caption('A rush of air. The last train pulls in.', 'say', 3); }
    }
    this.collectorUpdate(dt);
    // too close to the Collector: it swats you away
    this.swatCool = Math.max(0, (this.swatCool || 0) - dt);
    { const c = this.collector.obj.position, P = this.player, dx = P.pos.x - c.x, dz = P.pos.z - c.z, d = Math.hypot(dx, dz);
      if (d < 1.15 && !this.swatCool && s.train === 'away') {
        this.swatCool = 2.5; this.knock = { x: dx / (d || 1), z: dz / (d || 1), t: 0.35 };
        if (!S.settings.quiet) flash(0.5, 250); play('thump', { vol: 0.5 }); play('paper', { vol: 0.3 });
        caption('It swats you away without even looking. Nerve −4.', 'say', 3);
        if (nerve(this.R, -Math.round(4 * this.D.nerveLoss))) { this.playing = false; this.G.loseLife(this.run); return; }
      } }
    if (this.knock) { const k = this.knock, sp = 9 * dt; this.player.pos.x += k.x * sp; this.player.pos.z += k.z * sp; this.player.collide(); this.player.sync(); k.t -= dt; if (k.t <= 0) this.knock = null; }
    this.updateFlash(dt); this.updateArms(dt, t);
    this._h = (this._h || 0) + dt; if (this._h > 0.25) { this._h = 0; this.updateHud(); }
    if (s.train === 'in' && this.player.pos.z < -4.4) { prompt('The last train: E to board'); if (wasPressed('KeyE')) this.board(); }
    else this.interact();
  }
}
