// Mission: the empty school at night. Three zones and an exit. The school is put together differently each night:
//  zone 1 is the Feed or the fuse boxes (app permissions), zone 3 the found phone or the Chorus (upstanding);
//  the classroom trackers are five picked from a larger set. Tonight's topic makes the matching version likelier.
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
import { FEED_LIGHTS, TRACKERS, TRACKERS_EXTRA, INBOX, GATE, FUSES, CHORUS } from '../content/school.js';
import { NPC } from '../../core/npc.js';
import { sitDown } from '../entities/rig.js';
import { Watcher } from '../entities/watcher.js';
import { phonePanel, fusePanel } from '../ui/missionPanels.js';
import { DIFFS, newRun } from '../logic/night.js';
import { schoolExitChoice } from '../ui/panels.js';
import { typeOne } from '../ui/typing.js';
import { timeFor } from '../logic/typing.js';

const D2R = Math.PI / 180;
const RING = { x0: -8, x1: 8, z0: -16, z1: 0, ix0: -5, ix1: 5, iz0: -13, iz1: -3, cz: -8 };
const ROOM = { x0: -6, x1: 6, z0: -26, z1: -16 };
const GYM = { x0: -8, x1: 8, z0: -46, z1: -32 };
const LAMP = { x: 0, z: -39, r: 2.4 };
const HOOK_AT = [[-3, -2.92, 0], [-7.92, -8, 90], [-3, -13.08, 180], [4, -15.92, 0], [5.08, -8, 90], [7.92, -2.2, -90]];

export class School extends Walker {
  constructor(G, R, run) { super(G); this.R = R; this.run = run || newRun('T1', 'normal', 'park'); this.D = DIFFS[this.run.diff] || DIFFS.normal; this.quitLabel = 'Run home (keep what you earned)'; this.updateWhileOverlay = true; }

  async build() {
    const g = this.newScene(0x040509, 2.5, 15);
    this.r = rng(freshSeed());
    const rnd = () => this.r() - 0.5, topic = this.run.topic;
    this.v = {
      ring: ['T3', 'T9', 'T12'].includes(topic) ? (this.r() < 0.75 ? 'fuse' : 'feed') : ['T5', 'T11'].includes(topic) ? (this.r() < 0.8 ? 'feed' : 'fuse') : (this.r() < 0.5 ? 'feed' : 'fuse'),
      gym: topic === 'T6' ? (this.r() < 0.8 ? 'chorus' : 'phone') : (this.r() < 0.4 ? 'chorus' : 'phone'),
    };
    if (this.G.forceSchool) Object.assign(this.v, this.G.forceSchool);   // tests
    this.trackerSet = topic === 'T3' ? [...TRACKERS_EXTRA, ...[...TRACKERS].sort(rnd).slice(0, 3)] : [...TRACKERS, ...TRACKERS_EXTRA].sort(rnd).slice(0, 5);
    const nn = 2 + (this.r() < 0.5 ? 1 : 0);
    this.fuseSet = [...FUSES.filter(f => f.need).sort(rnd).slice(0, nn), ...FUSES.filter(f => !f.need).sort(rnd).slice(0, 6 - nn)].sort(rnd);
    this.noise = new Noise();
    this.st = { zone: 1, fusesDone: 0, hooks: 0, laps: 0, trackers: 0, phone: false, sorted: 0, right: 0, rushed: 0, gateCool: 0, caught: 0, lessons: [] };
    this.doors = {};
    this.buildRing(g); this.buildRoom(g); this.buildGym(g);
    this.scene.add(new THREE.AmbientLight(0x404a66, 0.2));
    this.scene.add(new THREE.HemisphereLight(0x6070a0, 0x100c0a, 0.15));
    this.watcher = new Watcher(g); this.watcher.speedMul = this.D.speed;
    this.watcher.root.visible = true; this.watcher.root.position.set(0, -30, 0);   // always in the scene, parked: the light count never changes
    this.setupRig({ arms: true, flash: true, stepVol: 0.3, reach: 2.3 });
    this.flashOn = true;
    this.mult = floorMult(this.R.life.floor) * this.D.reward;
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
    // the attention hooks (the Feed), or the fuse boxes
    this.fuses = [];
    if (this.v.ring === 'fuse') { this.hooks = []; this.buildFuses(g); }
    else this.hooks = FEED_LIGHTS.map((f, i) => {
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
  buildFuses(g) {
    this.fuses = this.fuseSet.map((f, i) => {
      const [x, z, r] = HOOK_AT[i], n = new THREE.Vector3(Math.sin(r * D2R), 0, Math.cos(r * D2R));
      const box = new THREE.Group(); box.position.set(x, 1.45, z); box.rotation.y = r * D2R; g.add(box);
      const body = texBox(box, null, -0.3, -0.4, -0.02, 0.3, 0.4, 0.1, { color: 0x6c7076 }); body.userData.fuse = true;
      const t = canvasTex(120, 156, () => { });
      const face = new THREE.Mesh(new THREE.PlaneGeometry(0.52, 0.68), new THREE.MeshBasicMaterial({ map: t, fog: false })); face.position.z = 0.102; box.add(face);
      const fz = { f, mesh: face, tex: t, state: 'pending', pos: new THREE.Vector3(x, 1.45, z), n };
      this.drawFuse(fz); return fz;
    });
  }
  drawFuse(fz) {
    const c = fz.tex.userData.g, w = 120, h = 156, f = fz.f;
    c.fillStyle = '#2a2d33'; c.fillRect(0, 0, w, h); c.strokeStyle = '#8a8f98'; c.strokeRect(1.5, 1.5, w - 3, h - 3);
    c.fillStyle = '#ffd23a'; c.fillRect(4, 4, w - 8, 15); c.fillStyle = '#1a1a1a'; c.font = '16px m5x7'; c.textBaseline = 'top'; c.fillText('! PERMISSION', 8, 3);
    const wrap = (txt, y, col) => { c.fillStyle = col; let ln = ''; for (const wd of txt.split(' ')) { if (c.measureText(ln + ' ' + wd).width > w - 12 && ln) { c.fillText(ln, 6, y); y += 15; ln = wd; } else ln = ln ? ln + ' ' + wd : wd; } c.fillText(ln, 6, y); return y + 17; };
    let y = wrap(f.app, 26, '#e8ecf2'); y = wrap('wants: ' + f.perm.toLowerCase(), y + 2, '#9fd0ff');
    const on = fz.state !== 'off';
    c.fillStyle = '#111'; c.fillRect(42, 112, 30, 34); c.fillStyle = on ? '#4cff7a' : '#ff5050'; c.fillRect(46, on ? 115 : 130, 22, 13);
    c.fillStyle = '#c8ccd4'; c.fillText(on ? 'ON' : 'OFF', 80, 122);
    if (fz.state !== 'pending') { c.fillStyle = 'rgba(80,255,140,.22)'; c.fillRect(0, 0, w, h); }
    fz.tex.needsUpdate = true;
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
    this.trackers = this.trackerSet.map(t => {
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
    if (this.v.gym === 'chorus') { ph.visible = false; this.phoneGlow.intensity = 0; this.buildChorus(g); }
    // the fire exit and its intercom
    this.doors.fire = this.door(g, 'fire', 'door_exit', -5, R.z0);
    place(g, 'sk_exit_sign', -5, 0, R.z0 + 0.1, 0);
    this.intercom = texBox(g, null, -3.95, 1.2, R.z0 + 0.02, -3.65, 1.6, R.z0 + 0.1, { color: 0x6a6e74 });
    const il = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.06), new THREE.MeshBasicMaterial({ color: 0x40ff80, fog: false })); il.position.set(-3.8, 1.5, R.z0 + 0.11); g.add(il); this.intercomLed = il;
    const eg = new THREE.PointLight(0x5fff9a, 0.5, 4, 1.6); eg.position.set(-5, 2.6, R.z0 + 0.6); g.add(eg);
  }

  buildChorus(g) {
    const C = this.chorus = { crowd: [], pol: [], done: {}, standT: 0, heat: 0, jeerT: 4, evidence: 0 }, cx = 0, cz = -39.4;
    place(g, 'sk_bench', cx, 0, cz, 0, { col: this.col });
    const dani = C.dani = new NPC('npc_mannequin');
    const lm = new THREE.MeshLambertMaterial({ color: 0xb8b2a8 }); dani.obj.traverse(o => { if (o.isMesh) o.material = lm; });
    dani.obj.position.set(cx, 0.02, cz - 0.04); dani.facing = 0; dani.obj.rotation.y = 0; g.add(dani.obj); dani.pose('Idle_Loop', 0.2); sitDown(dani);
    const hit = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.3, 0.8), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
    hit.position.set(cx, 0.65, cz); g.add(hit); C.hit = hit; C.center = new THREE.Vector3(cx, 0, cz);
    // the crowd follows Mark's painting "Phone-Lit Circle in the Gym": dark shapes of people, each lit from below by a phone
    const screenTex = canvasTex(24, 40, c => { c.fillStyle = '#dfe9ff'; c.fillRect(0, 0, 24, 40); c.fillStyle = '#ff3b3b'; c.beginPath(); c.arc(12, 6, 3, 0, 7); c.fill(); c.fillStyle = '#7a8aa8'; c.fillRect(3, 12, 18, 22); });
    const glowTex = canvasTex(32, 32, c => { const g = c.createRadialGradient(16, 16, 0, 16, 16, 16); g.addColorStop(0, 'rgba(190,215,255,.9)'); g.addColorStop(1, 'rgba(120,160,255,0)'); c.fillStyle = g; c.fillRect(0, 0, 32, 32); });
    glowTex.magFilter = THREE.LinearFilter; glowTex.needsUpdate = true;   // a soft glow, not big pixels
    const bodies = ['npc_guard', 'npc_caretaker', 'npc_nagyi', 'npc_mannequin'];
    for (let i = 0; i < 10; i++) {
      const a = (50 + i * (260 / 9)) * D2R, rr = 2.3 + (i % 2) * 0.5, x = cx + Math.sin(a) * rr, z = cz + Math.cos(a) * rr;
      const n = new NPC(bodies[i % bodies.length]); const dm = new THREE.MeshLambertMaterial({ color: [0x1a1b20, 0x15161a, 0x1e1c22][i % 3], emissive: 0x050507 });
      n.obj.traverse(o => { if (o.isMesh) o.material = dm; });
      n.obj.position.set(x, 0, z); n.faceTo(cx, cz); n.obj.rotation.y = n.facing; g.add(n.obj); n.play(i % 2 ? 'Idle_Talking_Loop' : 'Idle_Loop', 0);
      // the phone, held up in front of the chest, screen towards its owner's face; a soft glow lights the face
      const ph = new THREE.Group();
      const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 0.15), new THREE.MeshBasicMaterial({ map: screenTex, fog: false, transparent: true })); scr.rotation.set(-0.5, Math.PI, 0); ph.add(scr);
      const back = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 0.15), new THREE.MeshBasicMaterial({ color: 0x101014 })); back.rotation.set(-0.5, 0, 0); back.position.z = 0.004; ph.add(back);
      const led = new THREE.Mesh(new THREE.PlaneGeometry(0.018, 0.018), new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false })); led.position.set(0.025, 0.05, 0.01); led.rotation.x = -0.5; ph.add(led);   // the camera light, pointed at him
      const gl = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })); gl.scale.set(0.3, 0.3, 1); gl.position.set(0, 0.1, -0.1); ph.add(gl);
      ph.position.set(0.05, 1.28, 0.32); n.obj.add(ph);
      const col = { x0: x - 0.25, x1: x + 0.25, z0: z - 0.25, z1: z + 0.25 }; this.col.push(col);
      C.crowd.push({ n, scr, mat: dm, col, state: 'on', f: 1, gl });
    }
    // three photos on the floor: the evidence
    const polTex = canvasTex(24, 30, c => { c.fillStyle = '#f2efe6'; c.fillRect(0, 0, 24, 30); c.fillStyle = '#4a5468'; c.fillRect(3, 3, 18, 18); c.fillStyle = '#c8b8a0'; c.beginPath(); c.arc(12, 11, 4, 0, 7); c.fill(); });
    const spots = [[-6, -34.5], [6.5, -36], [-6.5, -44.5], [5.5, -44.2], [-2.5, -44.8], [2.8, -33.4], [-6.8, -40]].sort(() => this.r() - 0.5).slice(0, 3);
    for (const [x, z] of spots) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.25), new THREE.MeshBasicMaterial({ map: polTex, fog: false })); m.rotation.x = -Math.PI / 2; m.rotation.z = this.r() * 6; m.position.set(x, 0.012, z); g.add(m);
      C.pol.push({ mesh: m, got: false });
    }
    // the report terminal on the west wall
    const term = new THREE.Group(); term.position.set(GYM.x0 + 0.06, 1.35, -37.5); term.rotation.y = Math.PI / 2; g.add(term);
    texBox(term, null, -0.32, -0.25, -0.05, 0.32, 0.25, 0.02, { color: 0x2a2c30 });
    const tt = canvasTex(64, 48, c => { c.fillStyle = '#0a1a2a'; c.fillRect(0, 0, 64, 48); c.fillStyle = '#7fd0ff'; c.font = '16px m5x7'; c.textBaseline = 'top'; c.fillText('REPORT', 12, 6); c.fillText('a post', 14, 20); c.fillStyle = '#ffd23a'; c.fillRect(8, 38, 48, 3); });
    const tf = new THREE.Mesh(new THREE.PlaneGeometry(0.58, 0.44), new THREE.MeshBasicMaterial({ map: tt, fog: false })); tf.position.z = 0.025; term.add(tf); C.term = tf;
  }
  setupInteractions() {
    const it = this.it;
    for (const h of this.hooks) it.add(h.mesh, () => h.f.label + ': switch it off', () => this.silence(h), () => !h.off);
    for (const fz of this.fuses) it.add(fz.mesh, () => `Fuse box: ${fz.f.app} wants ${fz.f.perm.toLowerCase()}`, () => this.fuseUse(fz), () => fz.state === 'pending');
    if (this.chorus) {
      const C = this.chorus;
      for (const p of C.pol) it.add(p.mesh, 'A photo on the floor: pick it up (evidence)', () => this.pickPolaroid(p), () => !p.got);
      it.add(C.term, 'Report terminal (bejelentés)', () => this.chorusReport(), () => !C.done.report);
      it.add(C.hit, () => C.done.stand ? `${CHORUS.target}: send him a message` : CHORUS.target, () => this.chorusMessage(), () => !C.done.message);
    }
    for (const d of this.lockedDoors) it.add(d.obj, `Room ${d.no}`, () => { play('click', { vol: 0.4, rate: 0.6 }); caption('Locked.', 'say', 1.5); });
    it.add(this.doors.north.obj, 'Door to the classroom', () => { if (!this.doors.north.open) { play('denied', { vol: 0.3 }); caption(this.v.ring === 'fuse' ? `Locked. The fuse boxes in the corridor are not sorted yet (${this.fuses.length - this.st.fusesDone} left).` : `Locked. The screens in the corridor are still on (${this.hooks.length - this.st.hooks} left).`, 'say', 3); } }, () => !this.doors.north.open);
    for (const tr of this.trackers) it.add(tr.mesh, () => tr.t.label + ': block it', () => this.block1(tr), () => this.lensOn && !tr.off);
    it.add(this.doors.gymc.obj, 'Door to the gym', () => { play('denied', { vol: 0.3 }); caption(this.lensOn ? 'Locked. Something is still watching through the trackers.' : 'Locked. Something here is still watching you. Try the Badger lens (Q).', 'say', 3.5); }, () => !this.doors.gymc.open);
    it.add(this.phoneObj, 'A phone on the floor, screen lit', () => this.pickPhone(), () => !this.st.phone && this.v.gym === 'phone');
    it.add(this.intercom, 'Fire exit intercom (kaputelefon)', () => this.gate());
    it.add(this.doors.fire.obj, 'Fire exit', () => { play('denied', { vol: 0.3 }); caption(!this.zone3Done() ? 'Locked. The intercom next to it blinks.' : 'Locked. Use the intercom.', 'say', 3); });
  }

  // ---------- actions ----------
  /** Type a phrase while the world keeps going (you stand still, the Watcher does not). */
  async typeTask(text, title, time) {
    if (this.typing) return { ok: false, cancelled: true };
    this.typing = true; this.player.frozen = true; prompt(null);
    this.typeHandle = {};
    const t0 = performance.now();
    const r = await typeOne({ text, title, time: time * this.D.typeTime, handle: this.typeHandle });
    this.typing = false; this.player.frozen = false; this.typeHandle = null;
    if (r.ok) { this.st.typed = (this.st.typed || 0) + 1; this.run.typedChars += text.length; this.run.typeMs += performance.now() - t0; const k = Math.round(text.length / Math.max(0.05, r.accuracy)); this.run.keys += k; this.run.errors += k - text.length; }
    return r;
  }
  async silence(h) {
    if (h.off || this.typing) return;
    const r = await this.typeTask(h.f.type, 'Switch it off: type the setting', timeFor(h.f.type, 3, 0.3));
    if (!r.ok) {
      if (r.cancelled) return;
      play('beep', { vol: 0.4, rate: 0.7 }); caption('Too slow. The screen glows brighter, and your eyes slide back to it.', 'say', 4);
      if (nerve(this.R, -Math.round(CFG.feedFailNerve * this.D.nerveLoss))) this.death();
      return;
    }
    h.off = true; h.light.intensity = 0; this.drawHook(h, 0); this.st.hooks++;
    play('switch_off', { vol: 0.5 }); this.gain(CFG.xpHook, 0);
    this.st.lessons.push({ zone: 1, theme: h.f.theme, title: h.f.off, text: h.f.lesson, rule: h.f.rule });
    caption(`${h.f.off} ${h.f.lesson} (${r.wpm} wpm)`, 'say', 7);
    if (this.st.hooks === this.hooks.length) {
      this.doors.north.openUp(); this.gain(0, CFG.coinsZone);
      this.exitSign.material.map = canvasTex(48, 16, (c, w, hh) => { c.fillStyle = '#0e3a1a'; c.fillRect(0, 0, w, hh); c.fillStyle = '#7dff9a'; c.font = '16px m5x7'; c.textBaseline = 'top'; c.fillText('OPEN', 10, 1); });
      setTimeout(() => caption('Quiet. Somewhere on the north side, a door clicks open.', 'say', 4), 2500);
    }
    this.setObjective();
  }
  async fuseUse(fz) {
    if (this.typing || fz.state !== 'pending') return;
    this.playing = false; this.G.unlock(); prompt(null);
    const ch = await fusePanel(fz.f);
    this.playing = true; lockPointer();
    if (!ch) return;
    const f = fz.f;
    if ((ch === 'off') === !f.need) {
      if (ch === 'off') {
        const r = await this.typeTask(f.type, `Switch it off: type the setting (${f.app})`, timeFor(f.type, 3, 0.3));
        if (!r.ok) { if (!r.cancelled) { play('beep', { vol: 0.4, rate: 0.7 }); caption('Too slow. The switch springs back.', 'say', 3); } return; }
        fz.state = 'off'; play('switch_off', { vol: 0.5 });
      } else { fz.state = 'on'; play('click', { vol: 0.5, rate: 1.2 }); }
      this.drawFuse(fz); this.st.fusesDone++; this.gain(CFG.xpHook, 0);
      this.st.lessons.push({ zone: 1, theme: 'T3', title: `${f.app}: ${f.perm.toLowerCase()} ${fz.state === 'off' ? 'off' : 'stays on'}`, text: f.lesson, rule: f.rule });
      caption((fz.state === 'off' ? 'Switched off. ' : 'Left on, and that is right. ') + f.lesson, 'say', 7);
      if (this.st.fusesDone === this.fuses.length) {
        this.doors.north.openUp(); this.gain(0, CFG.coinsZone);
        this.exitSign.material.map = canvasTex(48, 16, (c, w, hh) => { c.fillStyle = '#0e3a1a'; c.fillRect(0, 0, w, hh); c.fillStyle = '#7dff9a'; c.font = '16px m5x7'; c.textBaseline = 'top'; c.fillText('OPEN', 10, 1); });
        setTimeout(() => caption('The last box hums. Somewhere on the north side, a door clicks open.', 'say', 4), 2500);
      }
    } else {
      play('spark1', { vol: 0.5 }); flash(0.4, 200);
      const lit = this.lights.filter(L => L.intensity > 0.2 && !L.userData.dead);
      if (lit.length > 1) { const L = lit[Math.floor(this.r() * lit.length)]; L.userData.dead = true; L.userData.flicker = false; L.intensity = 0; }
      caption(ch === 'off' ? `${f.app} needs ${f.perm.toLowerCase()} for what you use it for. Switched off, it would just stop working. The box sparks and a light dies.` : `${f.app} does not need ${f.perm.toLowerCase()}. Leaving it on is how data leaks out. The box sparks and a light dies.`, 'say', 6);
      if (nerve(this.R, -Math.round(CFG.feedFailNerve * this.D.nerveLoss))) this.death();
    }
    this.setObjective();
  }
  chorusDone(key) {
    const C = this.chorus; if (C.done[key]) return; C.done[key] = true;
    const t = CHORUS.tasks[key];
    this.gain(CFG.xpHook * 2, 0); play('rg_signal1', { vol: 0.4 });
    this.st.lessons.push({ zone: 3, theme: 'T6', title: t.title, text: t.lesson, rule: t.rule });
    caption(`${t.title}. ${t.lesson}`, 'say', 7);
    const on = C.crowd.filter(c => c.state === 'on');
    const k = Object.keys(C.done).length === 4 ? on.length : 2;
    for (const c of on.slice(0, k)) { c.state = 'fade'; c.col.off = true; c.mat.transparent = true; }
    if (Object.keys(C.done).length === 4) {
      this.gain(0, CFG.coinsZone); this.intercomLed.material.color.set(0xffd040);
      setTimeout(() => { caption(`The phones go down. "Thanks," ${CHORUS.target} says quietly. "Really." By the fire exit, the intercom lights up.`, 'say', 6); if (C.dani.cur) C.dani.cur.paused = false; C.dani.obj.position.z = -38.9; C.standing = true; }, 2200);
    }
    this.setObjective();
  }
  pickPolaroid(p) {
    const C = this.chorus; if (p.got) return; p.got = true; p.mesh.visible = false; C.evidence++; play('pickup', { vol: 0.4 });
    if (C.evidence < C.pol.length) caption(`A printed screenshot of the post, with the comments. You keep it. (${C.evidence}/${C.pol.length})`, 'say', 3.5);
    else this.chorusDone('evidence');
  }
  async chorusReport() {
    const C = this.chorus; if (C.done.report || this.typing) return;
    const t = CHORUS.tasks.report, r = await this.typeTask(t.type, 'The report terminal: type your report', timeFor(t.type, 4, 0.3));
    if (r.ok) this.chorusDone('report'); else if (!r.cancelled) caption('The screen times out. Try again.', 'say', 2.5);
  }
  async chorusMessage() {
    const C = this.chorus; if (C.done.message || this.typing) return;
    if (!C.done.stand) { caption(`${CHORUS.target} does not look up. Stand next to him for a moment first.`, 'say', 3.5); return; }
    const t = CHORUS.tasks.message, r = await this.typeTask(t.type, `A message to ${CHORUS.target}`, timeFor(t.type, 4, 0.3));
    if (r.ok) this.chorusDone('message'); else if (!r.cancelled) caption('You hesitate, and the moment passes. Try again.', 'say', 2.5);
  }
  chorusTick(dt) {
    if (this.chorus.standing) this.chorus.dani.update(dt);   // he stands up when it is over
    const C = this.chorus, p = this.player.pos, d = Math.hypot(p.x - C.center.x, p.z - C.center.z);
    for (const c of C.crowd) {
      if (c.state === 'gone') continue;
      if (c.state === 'fade') { c.f -= dt * 0.8; c.mat.opacity = Math.max(0, c.f); c.scr.material.opacity = Math.max(0, c.f); c.gl.material.opacity = 0.4 * Math.max(0, c.f); if (c.f <= 0) { c.state = 'gone'; c.n.obj.visible = false; } c.n.update(dt); continue; }
      const onYou = d < 3.4, tx = onYou ? p.x : C.center.x, tz = onYou ? p.z : C.center.z; c.n.faceTo(tx, tz);
      // when the phones turn from Dani to you, their lights glare in your eyes
      const want = onYou ? 0.85 : 0.3, k = Math.min(1, dt * 3); if (c.glare == null) c.glare = 0.3; c.glare += (want - c.glare) * k;
      c.gl.scale.setScalar(c.glare); c.gl.material.opacity = 0.25 + c.glare * 0.6;
      c.n.update(dt); c.scr.material.opacity = Math.random() < 0.04 ? 0.5 : 1;
    }
    if (Object.keys(C.done).length === 4) return;
    if (!C.done.stand && Math.hypot(p.x - C.center.x, p.z - (C.center.z + 0.6)) < 1.3) { C.standT += dt; if (C.standT > 2.5) this.chorusDone('stand'); } else C.standT = 0;
    C.jeerT -= dt;
    if (C.jeerT <= 0 && d < 9) { C.jeerT = 5 + this.r() * 4; caption(CHORUS.jeers[Math.floor(this.r() * CHORUS.jeers.length)], 'sfx', 2.5); play('presence', { vol: 0.15 }); }
    // standing in the circle doing nothing: the crowd turns on you
    if (d < 3 && !this.typing) { C.heat += dt; if (C.heat > 8) { C.heat = 0; caption('The phones turn towards you. They laugh louder. Nerve −2.', 'say', 3); if (nerve(this.R, -Math.round(2 * this.D.nerveLoss))) this.death(); } } else C.heat = Math.max(0, C.heat - dt);
  }
  zone3Done() { return this.v.gym === 'chorus' ? Object.keys(this.chorus.done).length === 4 : this.st.sorted >= this.msgs.length; }
  block1(tr) {
    // blocking is one key press: in the classroom your eyes belong on the figure, not on a typing bar
    if (tr.off || !this.lensOn || this.typing) return;
    tr.off = true; tr.mesh.visible = false; this.st.trackers++;
    play('rg_signal1', { vol: 0.35 }); this.gain(CFG.xpTracker, 0);
    this.st.lessons.push({ zone: 2, theme: 'T3', title: 'Blocked: ' + tr.t.label.toLowerCase(), text: tr.t.lesson, rule: tr.t.rule });
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
      if (r.right) { this.st.right++; if (!r.rushed) this.gain(CFG.xpMsg, 0); this.st.lessons.push({ zone: 3, theme: m.theme, title: (m.scam ? 'Spotted: ' : 'Trusted: ') + m.subject, text: m.why, rule: m.rule }); }
      else { this.noise.add(CFG.noiseWrong); if (nerve(this.R, -Math.round(CFG.nerveWrongMsg * this.D.nerveLoss))) this.dieSoon = true; }
      if (this.st.sorted === this.msgs.length) { this.gain(0, CFG.coinsZone); this.intercomLed.material.color.set(0xffd040); }
    });
    if (!this.reading) return;   // the phone was knocked out of your hands
    this.reading = false;
    if (this.dieSoon) { this.death(); return; }
    this.setObjective(); lockPointer();
  }
  inLight() { const p = this.player.pos; return Math.hypot(p.x - LAMP.x, p.z - LAMP.z) < LAMP.r; }
  /** The intercom: type three rules from tonight (one per zone) before the time runs out. */
  async gate() {
    if (!this.zone3Done()) { play('denied', { vol: 0.3 }); caption(this.v.gym === 'chorus' ? `The intercom stays dark. Nobody here has helped ${CHORUS.target} yet.` : this.st.phone ? 'The intercom stays dark. Sort the messages on the phone first.' : 'The intercom stays dark. There is something you have not found yet.', 'say', 3.5); return; }
    if (this.typing || this.gating) return;
    this.gating = true;
    const pick = z => { const ls = this.st.lessons.filter(l => l.zone === z && l.rule); return ls.length ? ls[Math.floor(this.r() * ls.length)].rule : null; };
    const lines = [pick(1), pick(2), pick(3) || this.msgs[0].rule].filter(Boolean).slice(0, GATE.lines);
    caption('The intercom crackles: "Say tonight\'s rules back to me, and the door opens."', 'say', 4);
    for (let i = 0; i < lines.length; i++) {
      for (;;) {
        const r = await this.typeTask(lines[i], `The intercom: type tonight's rule (${i + 1} of ${lines.length})`, timeFor(lines[i], GATE.base, GATE.perChar));
        if (r.ok) { play('beep', { vol: 0.3, rate: 1.3 }); break; }
        if (r.cancelled) { this.gating = false; caption('You step back from the intercom.', 'say', 2); return; }
        caption('"Too slow. Again." The static gets louder.', 'say', 3); this.noise.add(CFG.noiseWrong);
        if (nerve(this.R, -Math.round(CFG.nerveGateFail * this.D.nerveLoss))) { this.gating = false; this.death(); return; }
      }
    }
    this.gating = false;
    this.gain(CFG.xpGate + CFG.xpGateExtra * lines.length, CFG.coinsMission);
    play('door_open', { vol: 0.6 }); this.doors.fire.openUp();
    caption('"Good. Go home safe." The fire exit clicks open.', 'say', 4);
    await wait(2.5); this.finish();
  }
  gain(xp, coins) {
    xp = Math.round(xp * this.mult); coins = Math.round(coins * this.mult);
    earn(this.R, xp, coins); this.run.xp += xp; this.run.coins += coins; persist();
  }
  async caught() {
    if (this.typeHandle && this.typeHandle.cancel) this.typeHandle.cancel();
    this.st.caught++; this.playing = false; prompt(null);
    if (!S.settings.quiet) { flash(0.9, 500); play('stinger', { vol: 0.45 }); } else play('thump', { vol: 0.4 });
    const dead = nerve(this.R, -Math.round(CFG.caughtNerve * this.D.nerveLoss)); persist();
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
    else { this.player.set(4.5, -32.8, 0); if (this.v.gym === 'phone') this.watcher.place(7, -45, { x0: -7.5, x1: 7.5, z0: -45.5, z1: -32.6 }, LAMP); }
  }
  death() {
    this.playing = false; prompt(null); if (this.lensEl) this.lensEl.style.display = 'none';
    if (this.typeHandle && this.typeHandle.cancel) this.typeHandle.cancel();
    this.G.loseLife(this.run);
  }
  async finish() {
    this.playing = false; this.G.unlock(); prompt(null); if (this.lensEl) this.lensEl.style.display = 'none';
    this.R.record.missions++; this.run.stages.push('school');
    const seen = new Set(), per = {};
    for (const l of this.st.lessons) { const z = l.zone || 0; if (seen.has(l.title) || (per[z] = (per[z] || 0) + 1) > 2) continue; seen.add(l.title); this.run.lessons.push({ ...l, zone: 'school' }); }
    persist();
    const next = await schoolExitChoice(this.run);
    await fade(true, '', 0.6);
    if (next === 'metro') this.G.goMetro(this.run); else this.G.endNight(this.run, 'school');
  }
  quit() { this.playing = false; if (this.lensEl) this.lensEl.style.display = 'none'; fade(true, '', 0.6).then(() => this.G.endNight(this.run, 'home')); }
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
    caption(this.v.ring === 'fuse' ? 'Grey fuse boxes on the corridor walls, each with a yellow sticker: PERMISSION. The north door will not open until they are sorted.' : 'Screens are glowing somewhere down the corridor. When one is in front of you, it pulls your eyes towards it.', 'say', 5);
  }
  setObjective() {
    const s = this.st;
    if (s.zone === 1 && this.v.ring === 'fuse') objective(`Each fuse box is one app permission. Leave on what the app needs; switch off (and type the setting) what it does not. ${s.fusesDone}/${this.fuses.length}`);
    else if (s.zone === 1) objective(`The screens drag your eyes towards them. Walk up to each one, press E and type the setting that switches it off. ${s.hooks}/${this.hooks.length}`);
    else if (s.zone === 2) objective(`It only moves when you look away. Q: Badger lens. Look at a tracker and press E to block it, then look back at the figure. ${s.trackers}/${this.trackers.length}`);
    else if (this.v.gym === 'chorus' && !this.zone3Done()) { const C = this.chorus, d = C.done; objective(`Be the upstander. ${d.evidence ? '✓' : '·'} Pick up the evidence (${C.evidence}/3)  ${d.stand ? '✓' : '·'} Stand next to ${CHORUS.target}  ${d.report ? '✓' : '·'} Report it at the terminal  ${d.message ? '✓' : '·'} Message him`); }
    else if (this.v.gym === 'chorus') objective('Use the intercom by the fire exit: type tonight\'s rules back to it.');
    else if (!s.phone) objective('The gym. Find what is glowing on the floor. Keep to the light when you can.');
    else if (s.sorted < this.msgs.length) objective(`Read the phone in the light (P). Trust it, or report it as a scam. ${s.sorted}/${this.msgs.length}`);
    else objective('Use the intercom by the fire exit: type tonight\'s rules back to it.');
  }
  updateHud() {
    const s = this.st, L = this.R.life, n = this.noise.v;
    const rows = [{ name: `Nerve: ${L.nerve}`, hu: 'idegek' }, { name: `Noise: ${n < 10 ? 'quiet' : n < 40 ? 'some' : n < 70 ? 'loud' : 'very loud'}`, hu: 'zaj' }];
    if (s.zone === 1) rows.push(this.v.ring === 'fuse' ? { name: `Fuse boxes left: ${this.fuses.length - s.fusesDone}`, hu: 'biztosítékok' } : { name: `Screens on: ${this.hooks.length - s.hooks}`, hu: 'képernyők' });
    if (s.zone === 2) rows.push({ name: `Trackers left: ${this.trackersLeft()}`, hu: 'követők' }, { name: `Lens: ${this.lensOn ? 'on' : 'off'} (Q)`, hu: 'lencse' });
    if (s.zone === 3 && this.v.gym === 'chorus') rows.push({ name: `Upstander actions: ${Object.keys(this.chorus.done).length}/4`, hu: 'kiállás' });
    else if (s.zone === 3) rows.push({ name: `Messages sorted: ${s.sorted}/${this.msgs.length}`, hu: 'levelek' }, { name: this.inLight() ? 'In the light: safe' : 'In the dark', hu: 'fény' });
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
      // the gym is thick with dust and haze: lights become shapes, the crowd becomes silhouettes (Mark: use fog more)
      this.scene.fog.color.set(0x0b0d14); this.scene.background.set(0x0b0d14); this.scene.fog.near = 1.2; this.scene.fog.far = this.v.gym === 'chorus' ? 10 : 12;
      this.dissolving = false;
      if (this.v.gym === 'phone') {
        this.watcher.place(7, -45, { x0: -7.5, x1: 7.5, z0: -45.5, z1: -32.6 }, LAMP); this.watcher.setSize(0.85);
        this.watcher.npc.obj.traverse(o => { if (o.isMesh) { o.material.opacity = 1; } });
        caption('The gym. One lamp still works. In the dark at the far end, a red light blinks on.', 'say', 5);
      } else {
        this.watcher.active = false; this.watcher.root.position.set(0, -30, 0);
        caption(`The gym. Under the one working lamp, a crowd stands in a circle with their phones up, filming ${CHORUS.target} on the bench.`, 'say', 6);
      }
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
        if (this.st.hooks < this.hooks.length) { const dead = nerve(this.R, -Math.round(CFG.feedLapNerve * this.D.nerveLoss)); caption(`Round the same corridor again (${this.st.laps}). The screens are still on. Nerve −${CFG.feedLapNerve}.`, 'say', 4); if (dead) this.death(); }
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
    if (this.st.zone === 1 && this.v.ring === 'feed') this.feed(dt, t);
    if (this.st.zone === 3 && this.chorus) this.chorusTick(dt);
    if (wasPressed('KeyQ')) this.toggleLens();
    if (wasPressed('KeyP')) this.readPhone();
    if (this.watcher.active) {
      if (this.dissolving) { if (this.watcher.dissolve(dt)) { this.dissolving = false; this.doors.gymc.openUp(); this.gain(0, CFG.coinsZone); caption('The door to the gym swings open on its own.', 'say', 4); } }
      else {
        const r = this.watcher.update(dt, { player: this.player.pos, seen: this.watcherSeen(), trackers: this.st.zone === 2 ? this.trackersLeft() : 0, noise: this.noise.v, cam: this.G.camera.position });
        if (r === 'caught' && !(this.st.zone === 3 && this.inLight())) { this.caught(); return; }
      }
    }
    this.updateFlash(dt); this.updateArms(dt, t);
    this._h = (this._h || 0) + dt; if (this._h > 0.25) { this._h = 0; this.updateHud(); }
    if (!this.typing) this.interact();
  }
}
