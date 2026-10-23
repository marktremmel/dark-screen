// Mission: the park walk at night. A path from the street gate to the far gate, lamp posts, trees, fog.
// Three times on the way, figures step out of the trees and walk towards you saying what manipulators say.
// You stand your ground and type the safe reply under each one before it reaches you (Typing of the Dead style).
// At the far gate, type tonight's rules back to open it.
import * as THREE from 'three';
import { Walker } from '../../scenes/walker.js';
import { texBox, canvasTex, pxText } from '../../core/world.js';
import { A, tex } from '../../core/assets.js';
import { psxMat } from '../../core/render.js';
import { lockPointer, wasPressed } from '../../core/player.js';
import { hud, hudParts, objective, prompt, caption, fade, flash, checklist, wait } from '../../core/hud.js';
import { loop, play, music } from '../../core/audio.js';
import { S, persist } from '../../core/state.js';
import { CFG, floorMult } from '../config.js';
import { rng, freshSeed } from '../logic/rng.js';
import { Targets, timeFor, wpm } from '../logic/typing.js';
import { earn, nerve, die } from '../save/rogueSave.js';
import { MIMICS } from '../content/park.js';
import { GATE } from '../content/school.js';
import { Mimic } from '../entities/mimic.js';
import { missionDebrief } from '../ui/missionPanels.js';
import { deathPanel } from '../ui/panels.js';
import { typeOne, captureKeys, LabelLayer } from '../ui/typing.js';

const PX = z => 2.4 * Math.sin(z / 10);           // the path's centre line
const Z_END = -76, WAVES = [{ z: -14, n: 2 }, { z: -35, n: 3 }, { z: -56, n: 4 }];

export class Park extends Walker {
  constructor(G, R, run) { super(G); this.R = R; this.run = run || { xp: 0, coins: 0 }; this.quitLabel = 'Run home (keep what you earned)'; }

  async build() {
    const g = this.newScene(0x05070c, 3, 22);
    this.r = rng(freshSeed());
    this.mult = floorMult(this.R.life.floor);
    this.st = { wave: 0, done: 0, reached: 0, typedChars: 0, typeMs: 0, keys: 0, errors: 0, lessons: [] };
    this.mimics = []; this.labels = new LabelLayer();
    // the mimics for tonight: 9 different ones, never the same twice
    const pool = [...MIMICS].sort(() => this.r() - 0.5);
    this.queue = WAVES.map(w => pool.splice(0, w.n));
    this.buildPark(g);
    this.scene.add(new THREE.HemisphereLight(0x5a6a9a, 0x0a0c08, 0.5));
    const moon = new THREE.DirectionalLight(0x8ea6ff, 0.25); moon.position.set(-20, 30, 10); this.scene.add(moon);
    this.setupRig({ arms: true, flash: true, stepVol: 0.28, reach: 2.4 });
    this.flashOn = true;
  }

  buildPark(g) {
    const col = this.col;
    const gt = tex('grass', 40, 50); const ground = new THREE.Mesh(new THREE.PlaneGeometry(60, 100), psxMat({ map: gt, color: 0x5a6a48 }));
    ground.rotation.x = -Math.PI / 2; ground.position.set(0, 0, -36); g.add(ground);
    // the path: short asphalt strips following the curve
    const pm = psxMat({ map: tex('rg_asphalt', 1, 1), color: 0x8a8a8a });
    for (let z = 3; z > Z_END - 2; z -= 1.5) {
      const z2 = z - 1.6, x1 = PX(z), x2 = PX(z2), s = new THREE.Mesh(new THREE.PlaneGeometry(2.4, Math.hypot(x2 - x1, 1.6) + 0.05), pm);
      s.rotation.x = -Math.PI / 2; s.rotation.z = Math.atan2(x2 - x1, 1.6); s.position.set((x1 + x2) / 2, 0.012, (z + z2) / 2); g.add(s);
    }
    // fences on the sides and behind you (the street gate is shut)
    const fm = 0x2a2e2a;
    texBox(g, null, -14.1, 0, Z_END - 4, -13.9, 1.1, 4, { col, color: fm }); texBox(g, null, 13.9, 0, Z_END - 4, 14.1, 1.1, 4, { col, color: fm });
    texBox(g, null, -14, 0, 3.9, 14, 1.1, 4.1, { col, color: fm });
    // the far gate
    const gx = PX(Z_END);
    texBox(g, null, gx - 2.1, 0, Z_END - 0.3, gx - 1.5, 2.4, Z_END + 0.3, { col, color: 0x5a5248 });
    texBox(g, null, gx + 1.5, 0, Z_END - 0.3, gx + 2.1, 2.4, Z_END + 0.3, { col, color: 0x5a5248 });
    texBox(g, null, -14, 0, Z_END - 0.1, gx - 2.1, 1.1, Z_END + 0.1, { col, color: fm }); texBox(g, null, gx + 2.1, 0, Z_END - 0.1, 14, 1.1, Z_END + 0.1, { col, color: fm });
    this.gateBars = new THREE.Group(); g.add(this.gateBars);
    for (let x = gx - 1.45; x <= gx + 1.46; x += 0.18) texBox(this.gateBars, null, x - 0.02, 0, Z_END - 0.02, x + 0.02, 2.1, Z_END + 0.02, { color: 0x1e2220 });
    this.gateCol = { x0: gx - 1.5, x1: gx + 1.5, z0: Z_END - 0.15, z1: Z_END + 0.15 }; col.push(this.gateCol);
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.42), new THREE.MeshLambertMaterial({ map: canvasTex(70, 42, c => {
      c.fillStyle = '#1d3a2c'; c.fillRect(0, 0, 70, 42); c.fillStyle = '#d6efe2'; c.font = '16px m5x7'; c.textBaseline = 'top';
      pxText(c, 'PARK', 4, 2, 16); pxText(c, 'closes 22:00', 4, 14, 16); pxText(c, 'kapu', 4, 26, 16);
    }) }));
    plate.position.set(gx + 1.8, 1.5, Z_END + 0.31); g.add(plate); this.gatePlate = plate;
    // lamp posts
    this.lamps = [];
    [0, -12, -24, -36, -48, -60, -70].forEach((z, i) => {
      const x = PX(z) + (i % 2 ? 1.9 : -1.9);
      texBox(g, null, x - 0.06, 0, z - 0.06, x + 0.06, 3.4, z + 0.06, { color: 0x262a2c });
      const bm = new THREE.MeshBasicMaterial({ color: 0xffd9a0, fog: false });
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), bm); b.position.set(x, 3.4, z); g.add(b);
      const L = new THREE.PointLight(0xffc880, 3.2, 10, 1.4); L.position.set(x, 3.2, z); g.add(L);
      this.lamps.push({ L, bm, broken: i === 4 });
      col.push({ x0: x - 0.15, x1: x + 0.15, z0: z - 0.15, z1: z + 0.15 });
      if (i % 2 === 0) { texBox(g, null, x - 0.9, 0.42, z + 0.6, x + 0.9, 0.48, z + 1.0, { color: 0x5a3a22, col }); texBox(g, null, x - 0.9, 0.48, z + 0.95, x + 0.9, 0.9, z + 1.0, { color: 0x5a3a22 }); }
    });
    // trees and bushes (instanced), kept off the path
    const calmCache = new Map();
    const calm = m => { if (!calmCache.has(m)) calmCache.set(m, new THREE.MeshLambertMaterial({ map: m.map, color: new THREE.Color(m.color || 0xffffff).multiplyScalar(0.55), alphaTest: m.alphaTest || 0, side: THREE.DoubleSide })); return calmCache.get(m); };
    // plants are grouped in 16 m chunks along the path; only chunks near you are drawn (the fog hides the rest)
    this.chunks = [];
    const chunkOf = z => Math.max(0, Math.floor((4 - z) / 16));
    const chunk = i => { if (!this.chunks[i]) { const cg = new THREE.Group(); cg.userData.z = 4 - i * 16 - 8; g.add(cg); this.chunks[i] = cg; } return this.chunks[i]; };
    const scatter = (key, n, minOff, sMin, sMax, collide) => {
      const src = A.models[key]; if (!src) return;
      const by = new Map();
      for (let i = 0, k = 0; i < n * 4 && k < n; i++) {
        const z = 2 - this.r() * (2 - Z_END + 2), x = -13 + this.r() * 26;
        if (Math.abs(x - PX(z)) < minOff) continue;
        k++; const c = chunkOf(z); if (!by.has(c)) by.set(c, []);
        by.get(c).push({ x, z, s: sMin + this.r() * (sMax - sMin), r: this.r() * Math.PI * 2 });
        if (collide) col.push({ x0: x - 0.3, x1: x + 0.3, z0: z - 0.3, z1: z + 0.3 });
      }
      src.updateMatrixWorld(true);
      for (const [ci, pts] of by) src.traverse(c => {
        if (!c.isMesh) return;
        const im = new THREE.InstancedMesh(c.geometry, calm(c.material), pts.length), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
        pts.forEach((p, i) => { q.setFromAxisAngle(up, p.r); m4.compose(new THREE.Vector3(p.x, 0, p.z), q, new THREE.Vector3(p.s, p.s, p.s)).multiply(c.matrixWorld); im.setMatrixAt(i, m4); });
        im.frustumCulled = false; chunk(ci).add(im);
      });
    };
    scatter('nat_commontree_1', 10, 4.2, 0.9, 1.3, true); scatter('nat_commontree_2', 10, 4.2, 0.9, 1.3, true);
    scatter('nat_commontree_3', 14, 4.2, 0.9, 1.2, true); scatter('nat_pine_2', 12, 4.5, 0.9, 1.2, true);
    scatter('nat_bush_common', 24, 2.4, 0.8, 1.2, false); scatter('nat_bush_common_flowers', 10, 2.4, 0.8, 1.1, false);
    scatter('nat_grass_common_tall', 50, 1.6, 0.8, 1.3, false); scatter('nat_plant_7_big', 14, 2.4, 0.8, 1.1, false);
    scatter('nat_rock_medium_1', 10, 2.0, 0.5, 0.9, false);
  }
  cullChunks() { const pz = this.player.pos.z; for (const c of this.chunks) if (c) c.visible = Math.abs(c.userData.z - pz) < 30; }

  async enter() {
    this.playing = false; hud(false); music(null);
    loop('pkw', 'amb_woods', { vol: 0.25 }); this.loops.push('pkw');
    loop('pkd', 'rg_drone_stair', { vol: 0.18 }); this.loops.push('pkd');
    this.player.set(PX(1.5), 1.5, 0); this.cullChunks();
    await fade(true, 'The park gate creaks shut behind you.\nThe path to the far gate is lit, mostly.', 0.01);
    await wait(3.2);
    this.playing = true; hud(true); hudParts({ checklist: true, status: false, eye: false, batt: false });
    this.setObjective(); this.updateHud(); lockPointer();
    await fade(false, '', 1.0);
    caption('Stay on the path. If anything walks out of the trees, stand still and type your answer.', 'say', 6);
  }
  setObjective() {
    if (this.wave) objective('Type the reply under each figure before it reaches you. The first letter picks the nearest one.');
    else if (this.st.wave < WAVES.length) objective(`Walk the path to the far gate. ${WAVES.length - this.st.wave} stretch${WAVES.length - this.st.wave > 1 ? 'es' : ''} of dark ahead.`);
    else objective('The far gate. Read the sign and type tonight\'s rules back to open it (E).');
  }
  updateHud() {
    const s = this.st, L = this.R.life;
    checklist('The park walk', [
      { name: `Nerve: ${L.nerve}`, hu: 'idegek' },
      { name: `Dark stretches: ${Math.min(s.wave, WAVES.length)}/${WAVES.length}`, hu: 'szakasz' },
      { name: `Answered: ${s.done} · reached you: ${s.reached}`, hu: 'válaszok' },
      { name: `Typing: ${this.avgWpm()} wpm`, hu: 'gépelés' },
      { name: `Coins tonight: ${this.run.coins}`, hu: 'zseton' },
    ]);
  }
  avgWpm() { return this.st.typeMs > 0 ? wpm(this.st.typedChars, this.st.typeMs) : 0; }
  gain(xp, coins) { xp = Math.round(xp * this.mult); coins = Math.round(coins * this.mult); earn(this.R, xp, coins); this.run.xp += xp; this.run.coins += coins; persist(); }

  // ---------- a wave of mimics ----------
  startWave() {
    const i = this.st.wave, list = this.queue[i];
    this.st.wave++;
    this.wave = { list: list.slice(), spawnT: 0.8, targets: new Targets(), active: [], t0: performance.now(), first: 0 };
    this.player.frozen = true; this.turnTo = 0; prompt(null);
    caption(i === 0 ? 'Something steps out of the trees. It has a phone where its face should be.' : 'More of them. Stand still. Answer them.', 'say', 4);
    play('rg_signal2', { vol: 0.5 });
    this.stopKeys = captureKeys(ch => this.typeKey(ch));
    this.setObjective();
  }
  spawnOne() {
    const w = this.wave, data = w.list.shift(), p = this.player.pos;
    const a = (this.r() * 2 - 1) * 0.55, d = 9 + this.r() * 2.5;
    const m = new Mimic(this.root, this.mimics.length, data, p.x + Math.sin(a) * d, p.z - Math.cos(a) * d, CFG.mimicSpeed + this.st.wave * 0.05);
    this.mimics.push(m); w.active.push(m);
    w.targets.add(m.id, data.type, d);
    play('presence', { vol: 0.25, pos: [m.pos.x, 1.5, m.pos.z] });
  }
  typeKey(ch) {
    const w = this.wave; if (!w) return;
    if (!w.first) w.first = performance.now();
    this.st.keys++;
    const r = w.targets.input(ch);
    if (r.result === 'miss') { this.st.errors++; play('click', { vol: 0.22, rate: 0.5 }); return; }
    play('click', { vol: 0.1, rate: 1.4 });
    if (r.result === 'done') {
      const m = w.active.find(x => x.id === r.id); if (!m) return;
      this.st.done++; this.st.typedChars += m.data.type.length;
      m.dissolve(); this.labels.remove(m.id); play('rg_signal1', { vol: 0.4 });
      this.gain(CFG.xpMimic, 0);
      this.st.lessons.push({ zone: this.st.wave, theme: m.data.theme, title: `"${m.data.type}"`, text: m.data.lesson, rule: m.data.rule });
      caption(m.data.lesson, 'say', 5);
    }
  }
  updateWave(dt) {
    const w = this.wave, P = this.player;
    // turn to face along the path, so everything comes from in front of you
    if (this.turnTo != null) { const d = this.turnTo - P.yaw; P.yaw += d * Math.min(1, dt * 4); P.pitch *= 0.9; P.sync(); if (Math.abs(d) < 0.01) this.turnTo = null; }
    w.spawnT -= dt;
    if (w.list.length && w.spawnT <= 0) { this.spawnOne(); w.spawnT = 4.2 - this.st.wave * 0.5; }
    const cam = this.G.camera, v = new THREE.Vector3();
    for (const m of w.active) {
      const res = m.update(dt, P.pos);
      const t = w.targets.list.find(x => x.id === m.id);
      if (t) t.dist = Math.hypot(m.pos.x - P.pos.x, m.pos.z - P.pos.z);
      if (res === 'reached' && t) {
        w.targets.remove(m.id); this.labels.remove(m.id); m.dissolve(); this.st.reached++;
        if (!S.settings.quiet) flash(0.5, 300);
        play('thump', { vol: 0.4 });
        caption(`It got too close. The answer was "${m.data.type}". ${m.data.lesson}`, 'say', 7);
        this.st.lessons.push({ zone: this.st.wave, theme: m.data.theme, title: `"${m.data.type}"`, text: m.data.lesson, rule: m.data.rule });
        if (nerve(this.R, -CFG.mimicNerve)) { this.endWave(); this.death(); return; }
      }
      if (t) {
        v.copy(m.head()).project(cam);
        const on = v.z < 1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1;
        this.labels.set(m.id, (v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight, `${m.data.who}: ${m.data.say}`, t.p, w.targets.lock === t, on);
      }
    }
    if (!w.list.length && !w.targets.list.length && w.active.every(m => m.state === 'gone')) {
      if (w.first) this.st.typeMs += performance.now() - w.first;
      this.endWave(); this.gain(0, CFG.coinsZone);
      caption('The path is quiet again. Keep walking.', 'say', 3.5); this.setObjective();
    }
  }
  endWave() {
    if (this.stopKeys) { this.stopKeys(); this.stopKeys = null; }
    this.labels.clear(); this.wave = null; this.player.frozen = false; this.turnTo = null;
  }

  // ---------- the far gate ----------
  async gate() {
    if (this.typing) return;
    this.typing = true; this.player.frozen = true; prompt(null);
    const rules = [...new Set(this.st.lessons.map(l => l.rule))];
    const lines = rules.sort(() => this.r() - 0.5).slice(0, GATE.lines);
    caption('A voice from the keeper\'s hut: "Say the rules back to me and I\'ll open up."', 'say', 4);
    for (let i = 0; i < lines.length; i++) {
      for (;;) {
        this.typeHandle = {};
        const t0 = performance.now();
        const r = await typeOne({ text: lines[i], title: `The gate: type tonight's rule (${i + 1} of ${lines.length})`, time: timeFor(lines[i], GATE.base, GATE.perChar), handle: this.typeHandle });
        if (r.ok) { this.st.typedChars += lines[i].length; this.st.typeMs += performance.now() - t0; play('beep', { vol: 0.3, rate: 1.3 }); break; }
        if (r.cancelled) { this.typing = false; this.player.frozen = false; return; }
        caption('"Too slow. Again."', 'say', 2.5);
        if (nerve(this.R, -CFG.nerveGateFail)) { this.typing = false; this.death(); return; }
      }
    }
    this.typing = false;
    this.gain(CFG.xpGate + CFG.xpGateExtra * lines.length, CFG.coinsMission);
    this.gateCol.off = true; this.gateOpen = true; play('door_open', { vol: 0.6 });
    caption('The gate swings open. The street beyond is lit and ordinary.', 'say', 4);
    await wait(2.5); this.finish();
  }

  async death() {
    this.endWave(); this.playing = false; this.G.unlock(); prompt(null);
    await fade(true, '', 1.2); await fade(false, '', 0.01);
    await deathPanel(this.R, null);
    die(this.R, null); persist(); this.G.goRogue();
  }
  async finish() {
    this.playing = false; this.G.unlock(); prompt(null);
    this.R.record.missions++; persist();
    const seen = new Set(), lessons = this.st.lessons.filter(l => !seen.has(l.title) && seen.add(l.title));
    const acc = this.st.keys ? Math.round((this.st.keys - this.st.errors) / this.st.keys * 100) : 100;
    await missionDebrief({
      title: 'The park, tonight',
      body: 'You came out through the far gate onto an ordinary street. Behind you the path is empty, and the lamp posts hum.',
      stats: [`Stairwell: caught ${this.run.spot || 0}, missed ${this.run.miss || 0}`, `+${this.run.xp} XP tonight`, `+${this.run.coins} coins tonight`,
        `Answered in time: ${this.st.done}`, `Reached you: ${this.st.reached}`, `Typing: ${this.avgWpm()} wpm, ${acc}% accurate`, `Nerve left: ${this.R.life.nerve}`],
      lessons: lessons.slice(0, 9),
    });
    await fade(true, '', 0.6); this.G.goRogue();
  }
  quit() { this.endWave(); this.playing = false; fade(true, '', 0.6).then(() => this.G.goRogue()); }
  exit() { this.endWave(); if (this.typeHandle && this.typeHandle.cancel) this.typeHandle.cancel(); super.exit(); }

  update(dt, t) {
    for (const l of this.lamps) if (l.broken) { const on = Math.random() > 0.08; l.L.intensity = on ? 1.4 : 0; l.bm.color.setScalar(on ? 0.7 : 0.1); }
    if (this.gateOpen) this.gateBars.position.x = Math.min(2.9, this.gateBars.position.x + dt * 1.5);
    for (const m of this.mimics) if (!this.wave && m.state === 'fade') m.update(dt, this.player.pos);
    if (!this.playing) return;
    this.player.update(dt);
    this.cullChunks();
    if (this.wave) this.updateWave(dt);
    else if (this.st.wave < WAVES.length && this.player.pos.z < WAVES[this.st.wave].z) this.startWave();
    this.updateFlash(dt); this.updateArms(dt, t);
    this._h = (this._h || 0) + dt; if (this._h > 0.25) { this._h = 0; this.updateHud(); }
    if (!this.wave && !this.typing) {
      // the far gate: E when close and looking at it
      const p = this.player.pos, gx = PX(Z_END);
      if (this.st.wave >= WAVES.length && !this.gateOpen && Math.hypot(p.x - gx, p.z - Z_END) < 2.6) {
        prompt('The far gate: type tonight\'s rules to open it');
        if (wasPressed('KeyE')) this.gate();
      } else this.interact();
    }
  }
}
