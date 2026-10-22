// Mission: the empty school at night. Three zones and an exit.
//  1. The corridor ring (the Feed): screens with attention hooks pull your view. Switch every one off and the north door opens.
//  2. The classroom (the Watcher): it moves only while you look away. The Badger lens (Q) shows the trackers that feed it.
//  3. The gym (the found phone): sort the messages, safely only in the one working light. Then the fire exit intercom.
import * as THREE from 'three';
import { Walker } from '../../scenes/walker.js';
import { texBox, plane, wall, windowPane, place, canvasTex, pxText } from '../../core/world.js';
import { psxMat } from '../../core/render.js';
import { lockPointer, wasPressed } from '../../core/player.js';
import { hud, hudParts, objective, prompt, caption, fade, flash, checklist, wait } from '../../core/hud.js';
import { loop, play, music } from '../../core/audio.js';
import { S, persist } from '../../core/state.js';
import { CFG, floorMult } from '../config.js';
import { rng, freshSeed } from '../logic/rng.js';
import { Noise } from '../logic/reading.js';
import { earn, nerve, die } from '../save/rogueSave.js';
import { FEED_LIGHTS, TRACKERS, INBOX, GATE } from '../content/school.js';
import { Watcher } from '../entities/watcher.js';
import { phonePanel, gatePanel, missionDebrief } from '../ui/missionPanels.js';
import { deathPanel } from '../ui/panels.js';

const D2R = Math.PI / 180;
const RING = { x0: -8, x1: 8, z0: -16, z1: 0, ix0: -5, ix1: 5, iz0: -13, iz1: -3, cz: -8 };
const ROOM = { x0: -6, x1: 6, z0: -26, z1: -16 };
const GYM = { x0: -8, x1: 8, z0: -46, z1: -32 };
const LAMP = { x: 0, z: -39, r: 2.4 };
const HOOK_AT = [[-3, -2.92, 0], [-7.92, -8, 90], [-3, -13.08, 180], [4, -15.92, 0], [5.08, -8, 90], [7.92, -2.2, -90]];

export class School extends Walker {
  constructor(G, R, run) { super(G); this.R = R; this.run = run || { xp: 0, coins: 0 }; this.quitLabel = 'Run home (keep what you earned)'; this.updateWhileOverlay = true; }

  async build() {
    const g = this.newScene(0x040509, 2.5, 15);
    this.r = rng(freshSeed());
    this.noise = new Noise();
    this.st = { zone: 1, hooks: 0, laps: 0, trackers: 0, phone: false, sorted: 0, right: 0, rushed: 0, gateCool: 0, caught: 0, lessons: [] };
    this.doors = {};
    this.buildRing(g); this.buildRoom(g); this.buildGym(g);
    this.scene.add(new THREE.AmbientLight(0x404a66, 0.2));
    this.scene.add(new THREE.HemisphereLight(0x6070a0, 0x100c0a, 0.15));
    this.watcher = new Watcher(g);
    this.setupRig({ arms: true, flash: true, stepVol: 0.3, reach: 2.3 });
    this.flashOn = true;
    this.mult = floorMult(this.R.life.floor);
    this.msgs = [...INBOX].sort(() => this.r() - 0.5).slice(0, 4);
    if (!this.msgs.some(m => !m.scam)) this.msgs[3] = INBOX.find(m => !m.scam);
    if (!this.msgs.some(m => m.scam)) this.msgs[3] = INBOX.find(m => m.scam);
    this.phoneState = { done: {} };
    this.setupInteractions();
  }

  // ---------- doors ----------
  door(g, key, name, x, z, o = {}) {
    // a door in a wall that runs along x, hinged on its left edge; opening swings it into the room ahead
    const w = name === 'door_gym' ? 1.74 : 1.14;
    const pivot = new THREE.Group(); pivot.position.set(x - w / 2, 0, z); g.add(pivot);
    const d = place(pivot, 'sk_' + name, w / 2, 0, 0, 0);
    const col = { x0: x - w / 2, x1: x + w / 2, z0: z - 0.14, z1: z + 0.14 }; this.col.push(col);
    const rec = { pivot, obj: d, col, open: false };
    rec.openUp = () => { if (rec.open) return; rec.open = true; col.off = true; rec.target = Math.PI / 2; play('door_open', { vol: 0.5, pos: [x, 1, z] }); };
    this.doors[key] = rec; return rec;
  }

  // ---------- zone 1: the corridor ring ----------
  buildRing(g) {
    const col = this.col, block = this.block, W = { col, block, h: 3, tile: 2 }, R = RING;
    plane(g, 'vct', R.x0, R.z0, R.x1, 4, 0, { tile: 2 });
    plane(g, 'ceil_tile', R.x0, R.z0, R.x1, 4, 3, { tile: 2, ceiling: true, color: 0x5e626a });
    // the entrance hall (z 0..4) and the ring's outer walls
    wall(g, 'glazed', -3, 4, 3, 4, W); wall(g, 'glazed', -3, 0, -3, 4, W); wall(g, 'glazed', 3, 0, 3, 4, W);
    place(g, 'sk_door_front', 0, 0, 3.98, 180);
    place(g, 'sk_trophy_case', -2.95, 0, 2, 90, { col });
    wall(g, 'corridor', R.x0, R.z1, R.x1, R.z1, { ...W, gaps: [[-1.5, 1.5, 3]] });
    wall(g, 'corridor', R.x0, R.z0, R.x1, R.z0, { ...W, gaps: [[-0.6, 0.6, 2.3]] });
    wall(g, 'corridor', R.x0, R.z0, R.x0, R.z1, W); wall(g, 'corridor', R.x1, R.z0, R.x1, R.z1, W);
    // the inner block (classrooms you cannot open)
    wall(g, 'glazed', R.ix0, R.iz0, R.ix1, R.iz0, W); wall(g, 'glazed', R.ix0, R.iz1, R.ix1, R.iz1, W);
    wall(g, 'glazed', R.ix0, R.iz0, R.ix0, R.iz1, W); wall(g, 'glazed', R.ix1, R.iz0, R.ix1, R.iz1, W);
    col.push({ x0: R.ix0, x1: R.ix1, z0: R.iz0, z1: R.iz1 });
    this.lockedDoors = [];
    [[1, -3, 0], [-1, -13, 0], [-5, -6, 90], [5, -10, 90]].forEach(([x, z, r], i) => this.lockedDoors.push({ obj: place(g, 'sk_door_classroom', x, 0, z, r), no: 101 + i }));
    // lockers along the outer walls, radiators, a clock
    for (let x = -6.5; x < 7; x += 2) { if (Math.abs(x) > 2) place(g, 'sk_lockers', x, 0, R.z1, 180, { col, shrink: 0 }); }
    for (const z of [-14.5, -12.5, -4.5, -2.5]) place(g, 'sk_lockers', R.x0, 0, z, 90, { col, shrink: 0 });
    for (let x = -6.5; x < 7; x += 3) if (Math.abs(x) > 1.5) place(g, 'sk_radiator', x, 0.1, R.z0 + 0.05, 0);
    place(g, 'sk_wall_clock', R.x1 - 0.05, 0, -6, -90);
    place(g, 'sk_notice_board', R.x1 - 0.03, 0, -11, -90);
    // flickering ceiling lights
    this.lights = [];
    for (const [x, z] of [[0, -1.5], [-6.5, -8], [0, -14.5], [6.5, -4]]) { place(g, 'sk_ceiling_light', x, 0, z, 0); const L = new THREE.PointLight(0xdfe8ff, 1.0, 8, 1.6); L.position.set(x, 2.8, z); g.add(L); this.lights.push(L); }
    this.lights[2].userData.flicker = true;
    // the attention hooks
    this.hooks = FEED_LIGHTS.map((f, i) => {
      const [x, z, r] = HOOK_AT[i];
      const t = canvasTex(96, 70, () => { });
      const m = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.45), new THREE.MeshBasicMaterial({ map: t, fog: false }));
      m.position.set(x, 1.55, z); m.rotation.y = r * D2R; g.add(m);
      const frame = texBox(g, null, -0.36, -0.27, -0.045, 0.36, 0.27, -0.008, { color: 0x1a1a1e }); g.remove(frame); m.add(frame);
      const n = new THREE.Vector3(Math.sin(r * D2R), 0, Math.cos(r * D2R));
      const L = new THREE.PointLight(0xff5a6a, 1.1, 3.4, 1.6); L.position.set(x + n.x * 0.5, 1.6, z + n.z * 0.5); g.add(L);
      return { f, mesh: m, tex: t, light: L, off: false, pos: new THREE.Vector3(x, 1.55, z), n };
    });
    this.doors.north = this.door(g, 'north', 'door_classroom', 0, R.z0);
    this.exitSign = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.16), new THREE.MeshBasicMaterial({ map: canvasTex(48, 16, (c, w, h) => { c.fillStyle = '#3a0e0e'; c.fillRect(0, 0, w, h); c.fillStyle = '#ff7060'; c.font = '16px m5x7'; c.textBaseline = 'top'; c.fillText('LOCKED', 6, 1); }), fog: false }));
    this.exitSign.position.set(0, 2.5, R.z0 + 0.1); g.add(this.exitSign);
  }
  drawHook(h, t) {
    const c = h.tex.userData.g, w = 96, hh = 70;
    if (h.off) { c.fillStyle = '#050506'; c.fillRect(0, 0, w, hh); h.tex.needsUpdate = true; return; }
    c.fillStyle = '#1a0610'; c.fillRect(0, 0, w, hh);
    c.fillStyle = 'rgba(255,90,120,.18)'; c.fillRect(0, (t * 30) % hh, w, 6);
    c.fillStyle = '#ff4060'; c.beginPath(); c.arc(84, 11, 7 + Math.sin(t * 6) * 1.5, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#ffe0e8'; c.font = '16px m5x7'; c.textBaseline = 'top';
    let [a, b] = h.f.screen; if (h.f.id === 'autoplay') b = String(3 - (Math.floor(t) % 3));
    pxText(c, a, 4, 22, 16); pxText(c, b, 4, 40, 16);
    h.tex.needsUpdate = true;
  }

  // ---------- zone 2: the classroom ----------
  buildRoom(g) {
    const col = this.col, block = this.block, W = { col, block, h: 3, tile: 2 }, R = ROOM;
    plane(g, 'vct', R.x0, R.z0, R.x1, R.z1, 0, { tile: 2 });
    plane(g, 'ceil_tile', R.x0, R.z0, R.x1, R.z1, 3, { tile: 2, ceiling: true, color: 0x5e626a });
    wall(g, 'class_paint', R.x0, R.z0, R.x1, R.z0, { ...W, gaps: [[3.93, 5.07, 2.3]] });
    wall(g, 'class_paint', R.x0, R.z0, R.x0, R.z1, W); wall(g, 'class_paint', R.x1, R.z0, R.x1, R.z1, W);
    for (const z of [-24, -20.5]) windowPane(g, R.x0 + 0.07, 1.7, z, 1.6, 1.2, Math.PI / 2, { lights: true, view: 'view_night_school' });
    place(g, 'sk_chalkboard', 0, 0, R.z0 + 0.06, 0);
    place(g, 'sk_teacher_desk', -3.5, 0, -24.6, 0, { col });
    for (const x of [-3, 0, 3]) for (const z of [-19.5, -21.5, -23.5]) { place(g, 'sk_student_desk', x, 0, z, 180, { col, shrink: 0.05 }); place(g, 'sk_student_chair', x, 0, z + 0.5, 180); }
    place(g, 'sk_tv_cart', 5.2, 0, -24.8, -30, { col });
    const moon = new THREE.PointLight(0x8ea6ff, 0.9, 9, 1.4); moon.position.set(R.x0 + 1.2, 2, -22); g.add(moon);
    // trackers: visible only through the Badger lens
    const eyeTex = canvasTex(32, 32, c => {
      c.fillStyle = 'rgba(0,0,0,0)'; c.clearRect(0, 0, 32, 32); c.fillStyle = '#ff2a2a'; c.beginPath(); c.ellipse(16, 16, 14, 8, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#1a0000'; c.beginPath(); c.arc(16, 16, 5, 0, Math.PI * 2); c.fill(); c.fillStyle = '#fff'; c.fillRect(17, 12, 2, 2);
    });
    this.trackers = TRACKERS.map(t => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.34), new THREE.MeshBasicMaterial({ map: eyeTex, transparent: true, fog: false, depthTest: true }));
      m.position.set(...t.at); if (t.flat) { m.rotation.x = -Math.PI / 2; m.position.y += 0.01; } else m.rotation.y = t.rot;
      m.visible = false; g.add(m);
      return { t, mesh: m, off: false };
    });
    this.doors.gymc = this.door(g, 'gymc', 'door_classroom', 4.5, R.z0);
    // the short corridor to the gym
    plane(g, 'vct', 3, -32, 6, R.z0, 0, { tile: 2 }); plane(g, 'ceil_tile', 3, -32, 6, R.z0, 3, { tile: 2, ceiling: true, color: 0x5e626a });
    wall(g, 'corridor', 3, -32, 3, R.z0, W); wall(g, 'corridor', 6, -32, 6, R.z0, W);
    place(g, 'sk_sign_gym', 4.5, 0, -31.9, 180);
  }

  // ---------- zone 3: the gym ----------
  buildGym(g) {
    const col = this.col, block = this.block, W = { col, block, h: 5, tile: 2.5 }, R = GYM;
    plane(g, 'wood_floor', R.x0, R.z0, R.x1, R.z1, 0, { tile: 1.6 });
    plane(g, 'ceil_tile', R.x0, R.z0, R.x1, R.z1, 5, { tile: 2.5, ceiling: true, color: 0x3a3e46 });
    wall(g, 'class_paint', R.x0, R.z1, R.x1, R.z1, { ...W, gaps: [[3, 6, 3]] });
    wall(g, 'class_paint', R.x0, R.z0, R.x1, R.z0, W);
    wall(g, 'class_paint', R.x0, R.z0, R.x0, R.z1, W); wall(g, 'class_paint', R.x1, R.z0, R.x1, R.z1, W);
    for (const z of [-44, -40, -36]) { place(g, 'sk_bench', R.x0 + 0.4, 0, z, 90, { col }); }
    place(g, 'sk_bench', R.x1 - 0.4, 0, -37, -90, { col });
    // court lines
    const lm = new THREE.MeshBasicMaterial({ color: 0xd8c070 });
    for (const [w, d, x, z] of [[14, 0.06, 0, -33], [14, 0.06, 0, -45], [0.06, 12, -7, -39], [0.06, 12, 7, -39], [14, 0.06, 0, -39]]) { const l = new THREE.Mesh(new THREE.PlaneGeometry(w, d), lm); l.rotation.x = -Math.PI / 2; l.position.set(x, 0.005, z); g.add(l); }
    const ring = new THREE.Mesh(new THREE.RingGeometry(1.6, 1.66, 32), lm); ring.rotation.x = -Math.PI / 2; ring.position.set(0, 0.006, -39); g.add(ring);
    // the one lamp that works: a pool of light
    const sp = new THREE.SpotLight(0xfff1d0, 14, 9, 0.5, 0.35, 1.2); sp.position.set(LAMP.x, 4.8, LAMP.z); sp.target.position.set(LAMP.x, 0, LAMP.z); g.add(sp); g.add(sp.target);
    place(g, 'sk_ceiling_light', LAMP.x, 2, LAMP.z, 0);
    for (const [x, z] of [[-4, -35], [4, -43], [-4, -43]]) place(g, 'sk_ceiling_light_dead', x, 2, z, 0);
    // the phone on the floor
    const ph = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.012, 0.16), psxMat({ color: 0x1a1a1e })); ph.add(body);
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.068, 0.14), new THREE.MeshBasicMaterial({ color: 0x8fb8ff, fog: false })); scr.rotation.x = -Math.PI / 2; scr.position.y = 0.007; ph.add(scr);
    ph.position.set(6.4, 0.01, -44.4); ph.rotation.y = 0.6; g.add(ph); this.phoneObj = ph;
    this.phoneGlow = new THREE.PointLight(0x8fb8ff, 0.5, 1.6, 1.5); this.phoneGlow.position.set(6.4, 0.25, -44.4); g.add(this.phoneGlow);
    // the fire exit and its intercom
    this.doors.fire = this.door(g, 'fire', 'door_exit', -5, R.z0);
    place(g, 'sk_exit_sign', -5, 0, R.z0 + 0.1, 0);
    this.intercom = texBox(g, null, -3.95, 1.2, R.z0 + 0.02, -3.65, 1.6, R.z0 + 0.1, { color: 0x6a6e74 });
    const il = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.06), new THREE.MeshBasicMaterial({ color: 0x40ff80, fog: false })); il.position.set(-3.8, 1.5, R.z0 + 0.11); g.add(il); this.intercomLed = il;
    const eg = new THREE.PointLight(0x5fff9a, 0.5, 4, 1.6); eg.position.set(-5, 2.6, R.z0 + 0.6); g.add(eg);
  }

  setupInteractions() {
    const it = this.it;
    for (const h of this.hooks) it.add(h.mesh, () => h.f.label + ': switch it off', () => this.silence(h), () => !h.off);
    for (const d of this.lockedDoors) it.add(d.obj, `Room ${d.no}`, () => { play('click', { vol: 0.4, rate: 0.6 }); caption('Locked.', 'say', 1.5); });
    it.add(this.doors.north.obj, 'Door to the classroom', () => { if (!this.doors.north.open) { play('denied', { vol: 0.3 }); caption(`Locked. The screens in the corridor are still on (${this.hooks.length - this.st.hooks} left).`, 'say', 3); } }, () => !this.doors.north.open);
    for (const tr of this.trackers) it.add(tr.mesh, () => tr.t.label + ': block it', () => this.block1(tr), () => this.lensOn && !tr.off);
    it.add(this.doors.gymc.obj, 'Door to the gym', () => { play('denied', { vol: 0.3 }); caption(this.lensOn ? 'Locked. Something is still watching through the trackers.' : 'Locked. Something here is still watching you. Try the Badger lens (Q).', 'say', 3.5); }, () => !this.doors.gymc.open);
    it.add(this.phoneObj, 'A phone on the floor, screen lit', () => this.pickPhone(), () => !this.st.phone);
    it.add(this.intercom, 'Fire exit intercom (kaputelefon)', () => this.gate());
    it.add(this.doors.fire.obj, 'Fire exit', () => { play('denied', { vol: 0.3 }); caption(this.st.sorted < this.msgs.length ? 'Locked. The intercom next to it blinks.' : 'Locked. Use the intercom.', 'say', 3); });
  }

  // ---------- actions ----------
  silence(h) {
    if (h.off) return;
    h.off = true; h.light.intensity = 0; this.drawHook(h, 0); this.st.hooks++;
    play('switch_off', { vol: 0.5 }); this.gain(CFG.xpHook, 0);
    this.st.lessons.push({ zone: 1, theme: h.f.theme, title: h.f.off, text: h.f.lesson });
    caption(`${h.f.off} ${h.f.lesson}`, 'say', 7);
    if (this.st.hooks === this.hooks.length) {
      this.doors.north.openUp(); this.gain(0, CFG.coinsZone);
      this.exitSign.material.map = canvasTex(48, 16, (c, w, hh) => { c.fillStyle = '#0e3a1a'; c.fillRect(0, 0, w, hh); c.fillStyle = '#7dff9a'; c.font = '16px m5x7'; c.textBaseline = 'top'; c.fillText('OPEN', 10, 1); });
      setTimeout(() => caption('Quiet. Somewhere on the north side, a door clicks open.', 'say', 4), 2500);
    }
    this.setObjective();
  }
  block1(tr) {
    if (tr.off || !this.lensOn) return;
    tr.off = true; tr.mesh.visible = false; this.st.trackers++;
    play('rg_signal1', { vol: 0.35 }); this.gain(CFG.xpTracker, 0);
    this.st.lessons.push({ zone: 2, theme: 'T3', title: 'Blocked: ' + tr.t.label.toLowerCase(), text: tr.t.lesson });
    caption(`Blocked. ${tr.t.lesson}`, 'say', 7);
    this.watcher.setSize(0.7 + 0.08 * this.trackersLeft());
    if (!this.trackersLeft()) { this.dissolving = true; caption('With nothing left to feed it, the figure thins out like smoke.', 'say', 5); }
    this.setObjective();
  }
  trackersLeft() { return this.trackers.length - this.st.trackers; }
  toggleLens() {
    if (this.st.zone < 2) return;
    this.lensOn = !this.lensOn; play('click', { vol: 0.4, rate: this.lensOn ? 1.3 : 0.8 });
    for (const tr of this.trackers) tr.mesh.visible = this.lensOn && !tr.off;
    if (!this.lensEl) {
      const el = this.lensEl = document.createElement('div');
      el.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:4;background:radial-gradient(ellipse at center, rgba(255,40,40,.04) 35%, rgba(70,0,0,.6) 100%);box-shadow:inset 0 0 120px rgba(255,0,0,.35);display:none';
      el.innerHTML = '<div style="position:absolute;bottom:16px;left:50%;transform:translateX(-50%);font-family:m5x7,monospace;color:#ff9a8a;font-size:22px;letter-spacing:2px">BADGER LENS · trackers visible</div>';
      document.body.appendChild(el);
    }
    this.lensEl.style.display = this.lensOn ? 'block' : 'none';
  }
  pickPhone() {
    this.st.phone = true; this.phoneObj.visible = false; this.phoneGlow.intensity = 0; play('pickup', { vol: 0.5 });
    caption('Someone\'s phone. It\'s unlocked, and the inbox is full. Press P to read it. Read it in the light, where nothing can reach you.', 'say', 7);
    this.setObjective();
  }
  async readPhone() {
    if (!this.st.phone || this.reading) return;
    const inLight = this.inLight();
    if (!inLight) caption('Reading in the dark. While your eyes are on the screen, you are not watching the dark.', 'say', 4);
    this.reading = true; this.G.unlock(); prompt(null);
    await phonePanel(this.msgs, this.phoneState, c => { this.phoneClose = c; }, (m, r) => {
      this.st.sorted++;
      if (r.rushed) { this.st.rushed++; this.noise.add(CFG.noiseRushed); caption('It heard you.', 'say', 2.5); }
      if (r.right) { this.st.right++; if (!r.rushed) this.gain(CFG.xpMsg, 0); this.st.lessons.push({ zone: 3, theme: m.theme, title: (m.scam ? 'Spotted: ' : 'Trusted: ') + m.subject, text: m.why }); }
      else { this.noise.add(CFG.noiseWrong); if (nerve(this.R, -CFG.nerveWrongMsg)) this.dieSoon = true; }
      if (this.st.sorted === this.msgs.length) { this.gain(0, CFG.coinsZone); this.intercomLed.material.color.set(0xffd040); }
    });
    if (!this.reading) return;   // the phone was knocked out of your hands
    this.reading = false;
    if (this.dieSoon) { this.death(); return; }
    this.setObjective(); lockPointer();
  }
  inLight() { const p = this.player.pos; return Math.hypot(p.x - LAMP.x, p.z - LAMP.z) < LAMP.r; }
  async gate() {
    if (this.st.sorted < this.msgs.length) { play('denied', { vol: 0.3 }); caption(this.st.phone ? 'The intercom stays dark. Sort the messages on the phone first.' : 'The intercom stays dark. There is something you have not found yet.', 'say', 3.5); return; }
    if (this.st.gateCool > 0) { caption('Static. Wait a moment.', 'say', 2); return; }
    this.playing = false; this.G.unlock(); prompt(null);
    const r = await gatePanel(GATE);
    this.playing = true;
    if (!r) { lockPointer(); return; }
    if (r.score >= 1) {
      this.gain(CFG.xpGate + CFG.xpGateExtra * Math.max(0, r.hits - 1), CFG.coinsMission);
      play('door_open', { vol: 0.6 }); this.doors.fire.openUp();
      caption(`"${r.hits > 1 ? 'That is more than enough. Go home safe.' : 'Good. Go home safe.'}" The fire exit clicks open.`, 'say', 4);
      await wait(2.5); this.finish();
    } else {
      this.st.gateCool = 8; this.noise.add(CFG.noiseWrong);
      if (nerve(this.R, -CFG.nerveGateFail)) { this.death(); return; }
      caption('"That does not tell me anything yet." Think about tonight: the screens, the trackers, the messages. Try again in a moment.', 'say', 6);
      lockPointer();
    }
  }
  gain(xp, coins) {
    xp = Math.round(xp * this.mult); coins = Math.round(coins * this.mult);
    earn(this.R, xp, coins); this.run.xp += xp; this.run.coins += coins; persist();
  }
  async caught() {
    this.st.caught++; this.playing = false; prompt(null);
    if (!S.settings.quiet) { flash(0.9, 500); play('stinger', { vol: 0.45 }); } else play('thump', { vol: 0.4 });
    const dead = nerve(this.R, -CFG.caughtNerve); persist();
    await fade(true, '', 0.5);
    if (dead) { this.death(); return; }
    this.respawn();
    await fade(false, '', 0.8);
    caption(`It reached you. Nerve −${CFG.caughtNerve}. You find yourself back at the door, heart pounding.`, 'say', 5);
    this.playing = true;
  }
  respawn() {
    const z = this.st.zone;
    if (z === 2) { this.player.set(0, -16.8, 0); this.watcher.place(-5, -25, { x0: -5.6, x1: 5.6, z0: -25.6, z1: -16.4 }); }
    else { this.player.set(4.5, -32.8, 0); this.watcher.place(7, -45, { x0: -7.5, x1: 7.5, z0: -45.5, z1: -32.6 }, LAMP); }
  }
  async death() {
    this.playing = false; this.G.unlock(); prompt(null); if (this.lensEl) this.lensEl.style.display = 'none';
    await fade(true, '', 1.2); await fade(false, '', 0.01);
    await deathPanel(this.R, null);
    die(this.R, null); persist(); this.G.goRogue();
  }
  async finish() {
    this.playing = false; this.G.unlock(); prompt(null); if (this.lensEl) this.lensEl.style.display = 'none';
    this.R.record.missions++; persist();
    const seen = new Set(), per = {}, lessons = this.st.lessons.filter(l => { const k = l.title, z = l.zone || 0; if (seen.has(k) || (per[z] = (per[z] || 0) + 1) > 3) return false; seen.add(k); return true; });
    await missionDebrief({
      stats: [`Stairwell: caught ${this.run.spot || 0}, missed ${this.run.miss || 0}`, `+${this.run.xp} XP tonight`, `+${this.run.coins} coins tonight`, `Screens switched off: ${this.st.hooks}/${this.hooks.length}`, `Times round the corridor: ${this.st.laps}`,
        `Trackers blocked: ${this.st.trackers}/${this.trackers.length}`, `Messages sorted right: ${this.st.right}/${this.msgs.length}`, `Rushed answers: ${this.st.rushed}`, `Caught: ${this.st.caught}`, `Nerve left: ${this.R.life.nerve}`],
      lessons: lessons.slice(0, 10),
    });
    await fade(true, '', 0.6); this.G.goRogue();
  }
  quit() { this.playing = false; if (this.lensEl) this.lensEl.style.display = 'none'; fade(true, '', 0.6).then(() => this.G.goRogue()); }
  exit() { super.exit(); if (this.lensEl) { this.lensEl.remove(); this.lensEl = null; } }

  // ---------- flow ----------
  async enter() {
    this.playing = false; hud(false); music(null);
    loop('rgsc', 'rg_drone_stair', { vol: 0.22 }); this.loops.push('rgsc');
    loop('rgh', 'hum', { vol: 0.06 }); this.loops.push('rgh');
    this.player.set(0, 2.6, 0);
    await fade(true, 'Across the courtyard, the school is dark.\nThe front door is open. It should not be.', 0.01);
    await wait(3.2);
    this.playing = true; hud(true); hudParts({ checklist: true, status: false, eye: false, batt: false });
    this.setObjective(); this.updateHud(); lockPointer();
    await fade(false, '', 1.0);
    caption('Screens are glowing somewhere down the corridor.', 'say', 4);
  }
  setObjective() {
    const s = this.st;
    if (s.zone === 1) objective(`The corridor screens are pulling at you. Walk up to each one and switch it off (E). ${s.hooks}/${this.hooks.length}`);
    else if (s.zone === 2) objective(`It only moves when you look away. Press Q for the Badger lens, then block the trackers that feed it (E). ${s.trackers}/${this.trackers.length}`);
    else if (!s.phone) objective('The gym. Find what is glowing on the floor. Keep to the light when you can.');
    else if (s.sorted < this.msgs.length) objective(`Read the phone in the light (P). Trust it, or report it as a scam. ${s.sorted}/${this.msgs.length}`);
    else objective('Use the intercom by the fire exit.');
  }
  updateHud() {
    const s = this.st, L = this.R.life, n = this.noise.v;
    const rows = [{ name: `Nerve: ${L.nerve}`, hu: 'idegek' }, { name: `Noise: ${n < 10 ? 'quiet' : n < 40 ? 'some' : n < 70 ? 'loud' : 'very loud'}`, hu: 'zaj' }];
    if (s.zone === 1) rows.push({ name: `Screens on: ${this.hooks.length - s.hooks}`, hu: 'képernyők' });
    if (s.zone === 2) rows.push({ name: `Trackers left: ${this.trackersLeft()}`, hu: 'követők' }, { name: `Lens: ${this.lensOn ? 'on' : 'off'} (Q)`, hu: 'lencse' });
    if (s.zone === 3) rows.push({ name: `Messages sorted: ${s.sorted}/${this.msgs.length}`, hu: 'levelek' }, { name: this.inLight() ? 'In the light: safe' : 'In the dark', hu: 'fény' });
    rows.push({ name: `Coins tonight: ${this.run.coins}`, hu: 'zseton' });
    checklist(`The school · zone ${s.zone} of 3`, rows);
  }

  // which zone you are in, by position
  zoneCheck() {
    const p = this.player.pos, s = this.st;
    if (s.zone === 1 && p.z < RING.z0 - 0.4) {
      s.zone = 2; this.respawnPoint = 2;
      this.watcher.place(-5, -25, { x0: -5.6, x1: 5.6, z0: -25.6, z1: -16.4 }); this.watcher.setSize(0.7 + 0.08 * this.trackersLeft());
      caption('A classroom. In the far corner stands a tall figure with a red light where its face should be.', 'say', 5);
      setTimeout(() => caption('Your phone buzzes: "Badger lens ready. Press Q to see trackers."', 'say', 5), 4500);
      this.setObjective();
    }
    if (s.zone === 2 && p.z < ROOM.z0 - 0.4) {
      s.zone = 3; if (this.lensOn) this.toggleLens();
      this.watcher.place(7, -45, { x0: -7.5, x1: 7.5, z0: -45.5, z1: -32.6 }, LAMP); this.watcher.setSize(0.85); this.dissolving = false;
      this.watcher.npc.obj.traverse(o => { if (o.isMesh) { o.material.opacity = 1; } });
      caption('The gym. One lamp still works. In the dark at the far end, a red light blinks on.', 'say', 5);
      this.setObjective();
    }
  }
  // the Feed: lit screens drag your view towards them
  feed(dt, t) {
    const P = this.player, cam = this.G.camera.position;
    let best = null, bd = 1e9;
    for (const h of this.hooks) {
      if (h.off) continue;
      const dx = h.pos.x - cam.x, dz = h.pos.z - cam.z, d = Math.hypot(dx, dz);
      if (d > 8 || d < 0.9) continue;
      const fwd = P.forward(new THREE.Vector3()); const dot = (fwd.x * dx + fwd.z * dz) / d;
      if (dot < 0.25 || !this.lineOfSight(cam, h.pos.clone().addScaledVector(h.n, 0.15))) continue;
      if (d < bd) { bd = d; best = h; }
    }
    if (best) {
      const want = Math.atan2(-(best.pos.x - cam.x), -(best.pos.z - cam.z));
      let diff = want - P.yaw; while (diff > Math.PI) diff -= Math.PI * 2; while (diff < -Math.PI) diff += Math.PI * 2;
      P.yaw += Math.sign(diff) * Math.min(Math.abs(diff), CFG.feedPull * dt * (1.2 - bd / 10));
      this.pingT = (this.pingT || 0) - dt;
      if (this.pingT <= 0) { this.pingT = 3.5 + this.r() * 2; play('beep', { vol: 0.25, pos: [best.pos.x, 1.5, best.pos.z] }); }
    }
    for (const h of this.hooks) if (!h.off) this.drawHook(h, t);
    // going round the ring with screens still on costs nerve
    const p = P.pos, a = Math.atan2(p.x, p.z - RING.cz);
    if (this.lastA != null && p.z < 0 && p.z > RING.z0) {
      let da = a - this.lastA; while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2;
      this.lapAcc = (this.lapAcc || 0) + da;
      if (Math.abs(this.lapAcc) >= Math.PI * 2) {
        this.lapAcc = 0; this.st.laps++;
        if (this.st.hooks < this.hooks.length) { const dead = nerve(this.R, -CFG.feedLapNerve); caption(`Round the same corridor again (${this.st.laps}). The screens are still on. Nerve −${CFG.feedLapNerve}.`, 'say', 4); if (dead) this.death(); }
      }
    }
    this.lastA = a;
  }
  watcherSeen() {
    const w = this.watcher; if (!w.active) return true;
    const cam = this.G.camera.position, h = w.head(), dx = h.x - cam.x, dz = h.z - cam.z, d = Math.hypot(dx, dz);
    const fwd = this.player.forward(new THREE.Vector3());
    const ang = Math.acos(Math.max(-1, Math.min(1, (fwd.x * dx + fwd.z * dz) / (d * Math.hypot(fwd.x, fwd.z) || 1))));
    return ang < 38 * D2R && this.lineOfSight(cam, h);
  }

  update(dt, t) {
    for (const d of Object.values(this.doors)) if (d.target != null) { d.pivot.rotation.y += (d.target - d.pivot.rotation.y) * Math.min(1, dt * 3); }
    for (const L of this.lights) if (L.userData.flicker) L.intensity = Math.random() < 0.06 ? 0.1 : 1.0;
    if (this.st.gateCool > 0) this.st.gateCool -= dt;
    // while reading the phone, the world keeps going: only the watcher moves, and you are not watching it
    if (this.reading) {
      if (this.st.zone === 3 && this.watcher.active) {
        const r = this.watcher.update(dt, { player: this.player.pos, seen: false, trackers: 0, noise: this.noise.v });
        if (r === 'caught' && !this.inLight()) { this.reading = false; this.phoneClose && this.phoneClose(); this.caught(); }
      }
      this.noise.tick(dt, false);
      return;
    }
    if (!this.playing) return;
    this.player.update(dt);
    this.noise.tick(dt, this.player.running);
    this.zoneCheck();
    if (this.st.zone === 1) this.feed(dt, t);
    if (wasPressed('KeyQ')) this.toggleLens();
    if (wasPressed('KeyP')) this.readPhone();
    if (this.watcher.active) {
      if (this.dissolving) { if (this.watcher.dissolve(dt)) { this.dissolving = false; this.doors.gymc.openUp(); this.gain(0, CFG.coinsZone); caption('The door to the gym swings open on its own.', 'say', 4); } }
      else {
        const r = this.watcher.update(dt, { player: this.player.pos, seen: this.watcherSeen(), trackers: this.st.zone === 2 ? this.trackersLeft() : 0, noise: this.noise.v });
        if (r === 'caught' && !(this.st.zone === 3 && this.inLight())) { this.caught(); return; }
      }
    }
    this.updateFlash(dt); this.updateArms(dt, t);
    this._h = (this._h || 0) + dt; if (this._h > 0.25) { this._h = 0; this.updateHud(); }
    this.interact();
  }
}
