// The walk: the second stage of a night. One topic per night, one of four places:
//   park       outside, from your own panel block's entrance along a lit path to the far gate
//   backrooms  yellow rooms that should not be behind the street door
//   hotel      a red-carpeted corridor of numbered doors
//   pool       white and blue tiles, cold light, the smell of chlorine
// Three times on the way, figures with a phone for a face walk towards you saying what manipulators say (tonight's topic only).
// Stand still and type the safe reply under each before it reaches you. At the end, type tonight's rules to get out.
import * as THREE from 'three';
import { Walker } from '../../scenes/walker.js';
import { texBox, plane, canvasTex, pxText, place } from '../../core/world.js';
import { A, tex } from '../../core/assets.js';
import { psxMat } from '../../core/render.js';
import { lockPointer, wasPressed } from '../../core/player.js';
import { hud, hudParts, objective, prompt, caption, fade, flash, checklist, wait } from '../../core/hud.js';
import { loop, play, music } from '../../core/audio.js';
import { S, persist } from '../../core/state.js';
import { CFG, floorMult } from '../config.js';
import { rng, freshSeed } from '../logic/rng.js';
import { Targets, timeFor } from '../logic/typing.js';
import { DIFFS, runWpm } from '../logic/night.js';
import { earn, nerve, noteCard } from '../save/rogueSave.js';
import { TOPICS } from '../content/walks.js';
import { GATE } from '../content/school.js';
import { Mimic } from '../entities/mimic.js';
import { walkExitChoice } from '../ui/panels.js';
import { typeOne, captureKeys, LabelLayer, SpeechBox } from '../ui/typing.js';

const PX = z => 2.4 * Math.sin(z / 10);               // the park path's centre line
const STYLE = {
  backrooms: { bg: 0x1c1808, fog: [2, 15], wall: 'rg_y_wall', floor: 'rg_y_carpet', ceil: 'rg_y_ceil', light: 0xfff0b0, panel: 0xfff6d0, hemi: [0xfff0c0, 0x403818, 0.55], h: 2.7, drone: 'rg_drone_yellow',
    intro: 'You open the street door. It is not the street.\nYellow wallpaper, damp carpet, a hum in the lights.' },
  hotel: { bg: 0x120606, fog: [2, 14], wall: 'rg_hotel_wall', floor: 'rg_hotel_carpet', ceil: 'rg_white', light: 0xffb070, panel: 0xffd8a0, hemi: [0xffc8a0, 0x200808, 0.45], h: 2.9, drone: 'rg_drone_stair', doors: true,
    intro: 'You open the street door. It is not the street.\nA hotel corridor. Every door has a number, and none of them open.' },
  pool: { bg: 0x061418, fog: [2, 16], wall: 'rg_pool_white', floor: 'rg_pool_blue', ceil: 'rg_white', light: 0xbfe8ff, panel: 0xe8f8ff, hemi: [0xd0f0ff, 0x082028, 0.6], h: 3.2, drone: 'rg_drone_yellow',
    intro: 'You open the street door. It is not the street.\nWhite tiles, blue tiles, cold light. Somewhere, water drips.' },
};

export class Walk extends Walker {
  constructor(G, R, run) { super(G); this.R = R; this.run = run; this.kind = run.walk; this.quitLabel = 'Run home (keep what you earned)'; }

  async build() {
    const park = this.kind === 'park', st = STYLE[this.kind];
    const g = this.newScene(park ? 0x070a10 : st.bg, park ? 4 : st.fog[0], park ? 26 : st.fog[1]);
    this.r = rng(freshSeed());
    this.D = DIFFS[this.run.diff] || DIFFS.normal;
    this.mult = floorMult(this.R.life.floor) * this.D.reward;
    this.st = { wave: 0, done: 0, reached: 0 };
    this.mimics = []; this.labels = new LabelLayer(); this.speech = new SpeechBox();
    // tonight's lines, shuffled; three waves
    const counts = this.run.diff === 'calm' ? [1, 2, 2] : this.run.diff === 'hard' ? [2, 2, 3] : [2, 2, 2];
    const lines = [...TOPICS[this.run.topic].lines].sort(() => this.r() - 0.5);
    let k = 0; this.queue = counts.map(n => Array.from({ length: n }, () => lines[k++ % lines.length]));
    if (park) this.buildPark(g); else this.buildIndoor(g, st);
    this.setupRig({ arms: true, flash: true, stepVol: 0.28, reach: 2.4 });
    this.flashOn = park;
    // route length and wave positions (along the route)
    this.routeLen = []; let acc = 0; for (let i = 0; i < this.route.length; i++) { if (i) acc += this.route[i].distanceTo(this.route[i - 1]); this.routeLen.push(acc); }
    if (!this.waveAt) this.waveAt = [0.2, 0.47, 0.74].map(f => f * acc);
  }

  // ---------- the park ----------
  buildPark(g) {
    const col = this.col, Z_END = this.zEnd = -76;
    this.scene.add(new THREE.HemisphereLight(0x7a8ac0, 0x14180e, 0.85));
    const moon = new THREE.DirectionalLight(0xa8b8ff, 0.45); moon.position.set(-20, 30, 10); this.scene.add(moon);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(60, 100), psxMat({ map: tex('grass', 40, 50), color: 0x6a7a58 }));
    ground.rotation.x = -Math.PI / 2; ground.position.set(0, 0, -36); g.add(ground);
    const pm = psxMat({ map: tex('rg_asphalt', 1, 1), color: 0x9a9a9a });
    for (let z = 5; z > Z_END - 2; z -= 1.5) {
      const z2 = z - 1.6, x1 = PX(z), x2 = PX(z2), s = new THREE.Mesh(new THREE.PlaneGeometry(2.4, Math.hypot(x2 - x1, 1.6) + 0.05), pm);
      s.rotation.x = -Math.PI / 2; s.rotation.z = Math.atan2(x2 - x1, 1.6); s.position.set((x1 + x2) / 2, 0.012, (z + z2) / 2); g.add(s);
    }
    // your panel block, right behind you: you have just come out of its front door
    this.buildBlock(g, 5.6);
    const fm = 0x2a2e2a;
    texBox(g, null, -14.1, 0, Z_END - 4, -13.9, 1.1, 5.6, { col, color: fm }); texBox(g, null, 13.9, 0, Z_END - 4, 14.1, 1.1, 5.6, { col, color: fm });
    col.push({ x0: -14, x1: 14, z0: 5.4, z1: 6 });
    // the far gate
    const gx = PX(Z_END);
    texBox(g, null, gx - 2.1, 0, Z_END - 0.3, gx - 1.5, 2.4, Z_END + 0.3, { col, color: 0x6a6258 });
    texBox(g, null, gx + 1.5, 0, Z_END - 0.3, gx + 2.1, 2.4, Z_END + 0.3, { col, color: 0x6a6258 });
    texBox(g, null, -14, 0, Z_END - 0.1, gx - 2.1, 1.1, Z_END + 0.1, { col, color: fm }); texBox(g, null, gx + 2.1, 0, Z_END - 0.1, 14, 1.1, Z_END + 0.1, { col, color: fm });
    this.gateBars = new THREE.Group(); g.add(this.gateBars);
    for (let x = gx - 1.45; x <= gx + 1.46; x += 0.18) texBox(this.gateBars, null, x - 0.02, 0, Z_END - 0.02, x + 0.02, 2.1, Z_END + 0.02, { color: 0x1e2220 });
    this.gateCol = { x0: gx - 1.5, x1: gx + 1.5, z0: Z_END - 0.15, z1: Z_END + 0.15 }; col.push(this.gateCol);
    this.exitAt = new THREE.Vector3(gx, 0, Z_END);
    // lamp posts (a fixed number of lights: never add lights during play)
    this.lamps = [];
    [-2, -12, -24, -36, -48, -60, -70].forEach((z, i) => {
      const x = PX(z) + (i % 2 ? 1.9 : -1.9);
      texBox(g, null, x - 0.06, 0, z - 0.06, x + 0.06, 3.4, z + 0.06, { color: 0x262a2c });
      const bm = new THREE.MeshBasicMaterial({ color: 0xffd9a0, fog: false });
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), bm); b.position.set(x, 3.4, z); g.add(b);
      const L = new THREE.PointLight(0xffc880, 4.5, 12, 1.3); L.position.set(x, 3.2, z); g.add(L);
      this.lamps.push({ L, bm, broken: i === 4 });
      col.push({ x0: x - 0.15, x1: x + 0.15, z0: z - 0.15, z1: z + 0.15 });
      if (i % 2 === 0) { texBox(g, null, x - 0.9, 0.42, z + 0.6, x + 0.9, 0.48, z + 1.0, { color: 0x5a3a22, col }); texBox(g, null, x - 0.9, 0.48, z + 0.95, x + 0.9, 0.9, z + 1.0, { color: 0x5a3a22 }); }
    });
    this.buildPlants(g, Z_END);
    this.route = []; for (let z = 3; z >= Z_END + 1; z -= 2) this.route.push(new THREE.Vector3(PX(z), 0, z));
    this.spawn = [PX(3.2), 3.2, 0];
    this.drone = 'rg_drone_stair'; this.amb = 'amb_woods';
    this.intro = 'You step out of your block into the courtyard park.\nThe path to the far gate is lit, mostly.';
  }
  buildBlock(g, zf) {
    // the facade of a ten-storey panel block (we show four storeys; the fog takes the rest), front door in the middle
    const panels = new THREE.Group(); g.add(panels);
    for (let ix = -5; ix <= 5; ix++) for (let fy = 0; fy < 5; fy++) {
      const x = ix * 2, y = fy * 3;
      const name = fy === 0 && ix === 0 ? 'bk_wall_doorway_panel' : (fy === 0 && Math.abs(ix) === 1) ? 'bk_wall_panel' : 'bk_wall_window_panel';
      place(panels, name, x, y, zf, 180);
      if (name === 'bk_wall_window_panel' && this.r() < 0.3) {
        const w = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.0), new THREE.MeshBasicMaterial({ color: this.r() < 0.5 ? 0xe8b860 : 0x8fa8e0, fog: true }));
        w.position.set(x, y + 1.6, zf + 0.12); w.rotation.y = Math.PI; g.add(w);
      }
    }
    texBox(g, null, -11, 0, zf + 0.12, 11, 15, zf + 9, { color: 0x15161a });
    place(g, 'bk_door_entrance', 0, 0, zf, 180);
    place(g, 'bk_entrance_canopy', 0, 0, zf, 180);
    place(g, 'bk_sign_entrance', 0, 0, zf - 0.05, 180);
    place(g, 'bk_bench_entrance', -3, 0, zf - 0.6, 180, { col: this.col });
    place(g, 'bk_bin_container', 4, 0, zf - 1.0, 180, { col: this.col });
    const porch = new THREE.PointLight(0xffd090, 2.4, 7, 1.4); porch.position.set(0, 2.6, zf - 1.2); g.add(porch);
  }
  buildPlants(g, Z_END) {
    const col = this.col;
    this.chunks = [];
    const chunkOf = z => Math.max(0, Math.floor((4 - z) / 16));
    const chunk = i => { if (!this.chunks[i]) { const cg = new THREE.Group(); cg.userData.z = 4 - i * 16 - 8; g.add(cg); this.chunks[i] = cg; } return this.chunks[i]; };
    const calmCache = new Map();
    const calm = m => { if (!calmCache.has(m)) calmCache.set(m, new THREE.MeshLambertMaterial({ map: m.map, color: new THREE.Color(m.color || 0xffffff).multiplyScalar(0.7), alphaTest: m.alphaTest || 0, side: THREE.DoubleSide })); return calmCache.get(m); };
    const scatter = (key, n, minOff, sMin, sMax, collide) => {
      const src = A.models[key]; if (!src) return;
      const by = new Map();
      for (let i = 0, k = 0; i < n * 4 && k < n; i++) {
        const z = 1 - this.r() * (1 - Z_END + 2), x = -13 + this.r() * 26;
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
  cullChunks() { if (!this.chunks) return; const pz = this.player.pos.z; for (const c of this.chunks) if (c) c.visible = Math.abs(c.userData.z - pz) < 30; }

  // ---------- the indoor places: a corridor that turns, generated each night ----------
  buildIndoor(g, st) {
    const col = this.col, block = this.block, W = 3, H = st.h;   // W and the segment lengths stay on the 0.5 m wall grid
    this.scene.add(new THREE.HemisphereLight(...st.hemi));
    // five straight segments, alternating left and right turns (a zig-zag never crosses itself)
    const dirs = [[0, -1]]; let left = this.r() < 0.5;
    for (let i = 1; i < 5; i++) { const [dx, dz] = dirs[i - 1]; dirs.push(left ? [dz, -dx] : [-dz, dx]); left = !left; }
    const lens = dirs.map(() => 11 + Math.floor(this.r() * 4));
    const pts = [new THREE.Vector3(0, 0, 0)];
    dirs.forEach(([dx, dz], i) => { const p = pts[i]; pts.push(new THREE.Vector3(p.x + dx * lens[i], 0, p.z + dz * lens[i])); });
    // rectangles: each segment owns its corner square at the far end
    const rects = dirs.map(([dx, dz], i) => {
      const a = pts[i].clone().addScaledVector(new THREE.Vector3(dx, 0, dz), i === 0 ? -1 : W / 2), b = pts[i + 1].clone().addScaledVector(new THREE.Vector3(dx, 0, dz), W / 2);
      return { x0: Math.min(a.x, b.x) - (dx ? 0 : W / 2), x1: Math.max(a.x, b.x) + (dx ? 0 : W / 2), z0: Math.min(a.z, b.z) - (dz ? 0 : W / 2), z1: Math.max(a.z, b.z) + (dz ? 0 : W / 2) };
    });
    for (const R of rects) { plane(g, st.floor, R.x0, R.z0, R.x1, R.z1, 0, { tile: 1.6 }); plane(g, st.ceil, R.x0, R.z0, R.x1, R.z1, H, { tile: 1.6, ceiling: true }); }
    // walls from a 0.5 m occupancy grid
    const C = 0.5, inside = (x, z) => rects.some(R => x > R.x0 && x < R.x1 && z > R.z0 && z < R.z1);
    const bx0 = Math.min(...rects.map(r => r.x0)) - 1, bx1 = Math.max(...rects.map(r => r.x1)) + 1, bz0 = Math.min(...rects.map(r => r.z0)) - 1, bz1 = Math.max(...rects.map(r => r.z1)) + 1;
    const wallSeg = (x0, z0, x1, z1) => texBox(g, st.wall, x0, 0, z0, x1, H, z1, { col, block, tile: 1.4 });
    // horizontal edges (walls running along x)
    for (let z = bz0; z <= bz1; z += C) {
      let run = null;
      for (let x = bx0; x <= bx1 + C; x += C) {
        const a = inside(x + C / 2, z - C / 2), b = inside(x + C / 2, z + C / 2), edge = a !== b ? (a ? 'n' : 's') : null;
        if (edge && run && run.e === edge) run.x1 = x + C;
        else { if (run) wallSeg(run.x0, run.e === 'n' ? z : z - 0.15, run.x1, run.e === 'n' ? z + 0.15 : z); run = edge ? { e: edge, x0: x, x1: x + C } : null; }
      }
    }
    for (let x = bx0; x <= bx1; x += C) {
      let run = null;
      for (let z = bz0; z <= bz1 + C; z += C) {
        const a = inside(x - C / 2, z + C / 2), b = inside(x + C / 2, z + C / 2), edge = a !== b ? (a ? 'w' : 'e') : null;
        if (edge && run && run.e === edge) run.z1 = z + C;
        else { if (run) wallSeg(run.e === 'w' ? x : x - 0.15, run.z0, run.e === 'w' ? x + 0.15 : x, run.z1); run = edge ? { e: edge, z0: z, z1: z + C } : null; }
      }
    }
    // lights: glowing ceiling panels, and a fixed set of six real lights spread along the route
    const pm = new THREE.MeshBasicMaterial({ color: st.panel, fog: true });
    const route = [];
    pts.forEach((p, i) => { if (i < pts.length - 1) { const n = Math.floor(lens[i] / 2); for (let j = 0; j <= n; j++) route.push(p.clone().lerp(pts[i + 1], j / n)); } });
    route.forEach((p, i) => { if (i % 2 === 0) { const m = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.6), pm); m.rotation.x = Math.PI / 2; m.position.set(p.x, H - 0.01, p.z); g.add(m); } });
    this.lamps = [];
    for (let i = 0; i < 6; i++) { const p = route[Math.floor((i + 0.5) / 6 * route.length)]; const L = new THREE.PointLight(st.light, 3.2, 9, 1.3); L.position.set(p.x, H - 0.3, p.z); g.add(L); this.lamps.push({ L, bm: null, broken: i === 3 }); }
    // hotel doors along the walls
    if (st.doors) route.forEach((p, i) => {
      if (i % 3 !== 1 || pts.some(c => Math.hypot(c.x - p.x, c.z - p.z) < 2.6)) return;   // not at corners
      const q = route[Math.min(route.length - 1, i + 1)], dx = Math.sign(q.x - p.x), dz = Math.sign(q.z - p.z), side = i % 2 ? 1 : -1;
      const nx = -dz * side, nz = dx * side;            // the wall's inward normal is -n
      const d = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 2.05), psxMat({ map: tex('rg_flatdoor'), color: 0xc09070 }));
      d.position.set(p.x + nx * (W / 2 - 0.01), 1.025, p.z + nz * (W / 2 - 0.01)); d.rotation.y = Math.atan2(-nx, -nz); g.add(d);
      const no = 200 + i; const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.08), new THREE.MeshLambertMaterial({ map: canvasTex(40, 16, c => { c.fillStyle = '#c9a248'; c.fillRect(0, 0, 40, 16); c.fillStyle = '#2a1e0c'; c.font = '16px m5x7'; c.textBaseline = 'top'; c.fillText(String(no), 6, 0); }) }));
      plate.position.copy(d.position).add(new THREE.Vector3(-nx * 0.01, 0.6, -nz * 0.01)); plate.rotation.y = d.rotation.y; g.add(plate);
    });
    // the street door behind you, and the exit at the end
    const back = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 2.05), psxMat({ map: tex('rg_flatdoor'), color: 0x9a8a78 }));
    back.position.set(0, 1.025, rects[0].z1 - 0.16); back.rotation.y = Math.PI; g.add(back);
    const last = pts[pts.length - 1], [ex, ez] = dirs[dirs.length - 1];
    const exitP = last.clone().addScaledVector(new THREE.Vector3(ex, 0, ez), W / 2 - 0.16);
    const exit = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 2.1), psxMat({ map: tex('rg_flatdoor'), color: 0x8ab090 }));
    exit.position.set(exitP.x, 1.05, exitP.z); exit.rotation.y = Math.atan2(-ex, -ez); g.add(exit);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.18), new THREE.MeshBasicMaterial({ map: canvasTex(48, 16, c => { c.fillStyle = '#0e5a2a'; c.fillRect(0, 0, 48, 16); c.fillStyle = '#d6ffe2'; c.font = '16px m5x7'; c.textBaseline = 'top'; c.fillText('EXIT', 10, 1); }) }));
    sign.position.copy(exit.position).add(new THREE.Vector3(-ex * 0.02, 1.3, -ez * 0.02)); sign.rotation.y = exit.rotation.y; g.add(sign);
    this.exitAt = exitP;
    this.route = route; this.spawn = [0, -0.4, 0];
    this.drone = st.drone; this.amb = null; this.intro = st.intro;
    // waves start a little way into segments 2, 3 and 4, so the figures come down a straight stretch
    this.waveAt = [1, 2, 3].map(i => lens.slice(0, i).reduce((a, b) => a + b, 0) + 2.5);
  }

  // ---------- flow ----------
  async enter() {
    this.playing = false; hud(false); music(null);
    if (this.amb) { loop('wka', this.amb, { vol: 0.25 }); this.loops.push('wka'); }
    loop('wkd', this.drone, { vol: 0.2 }); this.loops.push('wkd');
    this.player.set(...this.spawn); this.cullChunks();
    const T = TOPICS[this.run.topic];
    await fade(true, this.intro + `\n\nTonight's topic: ${T.title}.`, 0.01);
    await wait(3.4);
    this.playing = true; hud(true); hudParts({ checklist: true, status: false, eye: false, batt: false });
    this.setObjective(); this.updateHud(); lockPointer();
    await fade(false, '', 1.0);
    caption('If anything walks towards you, stand your ground and type your answer.', 'say', 5);
  }
  setObjective() {
    if (this.wave) objective('');
    else if (this.st.wave < 3) objective(`Keep going: ${this.kind === 'park' ? 'the far gate' : 'the EXIT door'} is at the end. ${3 - this.st.wave} stretch${3 - this.st.wave > 1 ? 'es' : ''} of dark ahead.`);
    else objective(`${this.kind === 'park' ? 'The far gate' : 'The EXIT door'}: walk up to it and type tonight's rules back to open it (E).`);
  }
  updateHud() {
    const s = this.st, L = this.R.life;
    checklist(`${TOPICS[this.run.topic].title}`, [
      { name: `Nerve: ${L.nerve}`, hu: 'idegek' },
      { name: `Stretches: ${Math.min(s.wave, 3)}/3`, hu: 'szakasz' },
      { name: `Answered: ${s.done} · reached you: ${s.reached}`, hu: 'válaszok' },
      { name: `Typing: ${runWpm(this.run)} wpm`, hu: 'gépelés' },
      { name: `Coins tonight: ${this.run.coins}`, hu: 'zseton' },
    ]);
  }
  gain(xp, coins) { xp = Math.round(xp * this.mult); coins = Math.round(coins * this.mult); earn(this.R, xp, coins); this.run.xp += xp; this.run.coins += coins; persist(); }
  /** how far along the route the player is (metres) */
  progress() {
    const p = this.player.pos; let bi = 0, bd = 1e9;
    this.route.forEach((q, i) => { const d = Math.hypot(q.x - p.x, q.z - p.z); if (d < bd) { bd = d; bi = i; } });
    return this.routeLen[bi];
  }
  dirAt() {
    const p = this.player.pos; let bi = 0, bd = 1e9;
    this.route.forEach((q, i) => { const d = Math.hypot(q.x - p.x, q.z - p.z); if (d < bd) { bd = d; bi = i; } });
    const a = this.route[Math.min(bi, this.route.length - 2)], b = this.route[Math.min(bi + 1, this.route.length - 1)];
    return new THREE.Vector3(b.x - a.x, 0, b.z - a.z).normalize();
  }

  // ---------- a wave ----------
  startWave() {
    const i = this.st.wave, list = this.queue[i];
    this.st.wave++;
    this.wave = { list: list.slice(), spawnT: 0.8, targets: new Targets(), active: [], first: 0, lane: 0 };
    const d = this.dirAt(); this.waveDir = d; this.turnTo = Math.atan2(-d.x, -d.z);
    this.player.frozen = true; prompt(null);
    caption(i === 0 ? 'Something steps out of the dark, a phone where its face should be. Read what it says, then type the reply shown above its head.' : 'More of them. Stand still. Answer them.', 'say', 5);
    play('rg_signal2', { vol: 0.5 });
    this.stopKeys = captureKeys(ch => this.typeKey(ch));
    this.setObjective();
  }
  spawnOne() {
    const w = this.wave, data = w.list.shift(), p = this.player.pos, d = this.waveDir;
    const lanes = this.kind === 'park' ? [-2.2, 2.2, 0] : [-0.8, 0.8, 0], lat = lanes[w.lane++ % lanes.length];
    const dist = 9 + this.r() * 1.5, side = new THREE.Vector3(-d.z, 0, d.x);
    const x = p.x + d.x * dist + side.x * lat, z = p.z + d.z * dist + side.z * lat;
    const m = new Mimic(this.root, this.mimics.length, data, x, z, CFG.mimicSpeed * this.D.speed * (1 + this.st.wave * 0.08));
    m.uid = data.id + '_' + this.mimics.length;
    this.mimics.push(m); w.active.push(m);
    w.targets.add(m.uid, data.type, dist);
    play('presence', { vol: 0.25, pos: [x, 1.5, z] });
  }
  typeKey(ch) {
    const w = this.wave; if (!w) return;
    if (!w.first) w.first = performance.now();
    this.run.keys++;
    const r = w.targets.input(ch);
    if (r.result === 'miss') { this.run.errors++; play('click', { vol: 0.22, rate: 0.5 }); return; }
    play('click', { vol: 0.1, rate: 1.4 });
    if (r.result === 'done') {
      const m = w.active.find(x => x.uid === r.id); if (!m) return;
      this.st.done++; this.run.typedChars += m.data.type.length;
      m.dissolve(); this.labels.remove(m.uid); play('rg_signal1', { vol: 0.4 });
      this.gain(CFG.xpMimic, 0);
      if (noteCard(this.R, 'w:' + m.data.id)) { this.run.cards++; setTimeout(() => caption(`New notebook card: "${m.data.type}"`, 'say', 3), 1200); }
      this.run.lessons.push({ zone: 'walk', theme: this.run.topic, title: `"${m.data.type}"`, text: m.data.lesson, rule: m.data.rule });
      caption(m.data.lesson, 'say', 5);
    }
  }
  updateWave(dt) {
    const w = this.wave, P = this.player;
    if (this.turnTo != null) { let d = this.turnTo - P.yaw; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; P.yaw += d * Math.min(1, dt * 4); P.pitch *= 0.9; P.sync(); if (Math.abs(d) < 0.01) this.turnTo = null; }
    w.spawnT -= dt;
    if (w.list.length && w.spawnT <= 0) { this.spawnOne(); w.spawnT = 5 - this.st.wave * 0.5; }
    const cam = this.G.camera, v = new THREE.Vector3(), lab = []; cam.updateMatrixWorld();
    for (const m of w.active) {
      const res = m.update(dt, P.pos);
      const t = w.targets.list.find(x => x.id === m.uid);
      if (t) t.dist = Math.hypot(m.pos.x - P.pos.x, m.pos.z - P.pos.z);
      if (res === 'reached' && t) {
        w.targets.remove(m.uid); this.labels.remove(m.uid); m.dissolve(); this.st.reached++;
        if (!S.settings.quiet) flash(0.5, 300);
        play('thump', { vol: 0.4 });
        caption(`It got too close. The answer was "${m.data.type}". ${m.data.lesson}`, 'say', 7);
        this.run.lessons.push({ zone: 'walk', theme: this.run.topic, title: `"${m.data.type}"`, text: m.data.lesson, rule: m.data.rule });
        if (nerve(this.R, -Math.round(CFG.mimicNerve * this.D.nerveLoss))) { this.endWave(); this.playing = false; this.G.loseLife(this.run); return; }
      }
      if (t) { v.copy(m.head()).project(cam); lab.push({ m, t, x: (v.x + 1) / 2 * innerWidth, y: (1 - v.y) / 2 * innerHeight, on: v.z < 1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1 }); }
    }
    // labels: only the nearest (or the one you are typing) shows what it says; overlapping labels are pushed apart
    const near = w.targets.lock || w.targets.list.slice().sort((a, b) => a.dist - b.dist)[0];
    lab.sort((a, b) => a.t.dist - b.t.dist);
    const placed = [];
    for (const L of lab) {
      const isNear = near && L.t === near, h = Math.max(isNear ? 92 : 40, isNear === L.m._wasNear ? this.labels.height(L.m.uid) : 0); L.m._wasNear = isNear;   // the nearest one shows what it says ABOVE the reply, so you read the question first
      let y = L.y;
      for (let moved = true, n = 0; moved && n < 6; n++) { moved = false; for (const P2 of placed) if (Math.abs(P2.x - L.x) < 300 && y > P2.y - P2.h - 6 && y - h < P2.y) { y = P2.y - P2.h - 6; moved = true; } }   // labels hang above their point (bottom edge at y)
      placed.push({ x: L.x, y, h });
      this.labels.set(L.m.uid, L.x, y, isNear ? `${L.m.data.who}: ${L.m.data.say}` : '', L.t.p, w.targets.lock === L.t, L.on);
    }
    this.speech.set(lab.filter(L => !(near && L.t === near)).map(L => ({ who: L.m.data.who, say: L.m.data.say, near: false })));   // the others wait down here
    if (!w.list.length && !w.targets.list.length && w.active.every(m => m.state === 'gone')) {
      if (w.first) this.run.typeMs += performance.now() - w.first;
      this.endWave(); this.gain(0, CFG.coinsZone);
      caption('Quiet again. Keep going.', 'say', 3.5); this.setObjective();
    }
  }
  endWave() {
    if (this.stopKeys) { this.stopKeys(); this.stopKeys = null; }
    this.labels.clear(); if (this.speech) this.speech.clear(); this.wave = null; this.player.frozen = false; this.turnTo = null;
  }

  // ---------- the way out ----------
  async gate() {
    if (this.typing) return;
    this.typing = true; this.player.frozen = true; prompt(null);
    const rules = [...new Set(this.run.lessons.filter(l => l.zone === 'walk').map(l => l.rule))];
    const lines = (rules.length ? rules : TOPICS[this.run.topic].lines.map(l => l.rule)).sort(() => this.r() - 0.5).slice(0, GATE.lines);
    caption('A voice from behind the door: "Say tonight\'s rules back to me, and I\'ll open up."', 'say', 4);
    for (let i = 0; i < lines.length; i++) {
      for (;;) {
        this.typeHandle = {}; const t0 = performance.now();
        const r = await typeOne({ text: lines[i], title: `Type tonight's rule (${i + 1} of ${lines.length})`, time: timeFor(lines[i], GATE.base, GATE.perChar) * this.D.typeTime, handle: this.typeHandle });
        if (r.ok) { this.run.typedChars += lines[i].length; this.run.typeMs += performance.now() - t0; this.run.keys += Math.round(lines[i].length / Math.max(0.01, r.accuracy)); this.run.errors += Math.round(lines[i].length / Math.max(0.01, r.accuracy)) - lines[i].length; play('beep', { vol: 0.3, rate: 1.3 }); break; }
        if (r.cancelled) { this.typing = false; this.player.frozen = false; return; }
        caption('"Too slow. Again."', 'say', 2.5);
        if (nerve(this.R, -Math.round(CFG.nerveGateFail * this.D.nerveLoss))) { this.typing = false; this.playing = false; this.G.loseLife(this.run); return; }
      }
    }
    this.typing = false;
    this.gain(CFG.xpGate + CFG.xpGateExtra * lines.length, CFG.coinsMission);
    this.run.stages.push('walk');
    if (this.gateCol) { this.gateCol.off = true; this.gateOpen = true; }
    play('door_open', { vol: 0.6 });
    caption(this.kind === 'park' ? 'The gate swings open. The street beyond is lit and ordinary.' : 'The door opens onto an ordinary street. You don\'t look back.', 'say', 4);
    await wait(2.2);
    this.playing = false; this.G.unlock(); prompt(null);
    const next = await walkExitChoice(this.run);
    await fade(true, '', 0.6);
    if (next === 'school') this.G.goSchool(this.run); else this.G.endNight(this.run, 'walk');
  }
  quit() { this.endWave(); this.playing = false; fade(true, '', 0.6).then(() => this.G.endNight(this.run, 'home')); }
  exit() { this.endWave(); if (this.speech) this.speech.remove(); if (this.typeHandle && this.typeHandle.cancel) this.typeHandle.cancel(); super.exit(); }

  update(dt, t) {
    for (const l of this.lamps) if (l.broken) { const on = Math.random() > 0.08; l.L.intensity = on ? 2 : 0; if (l.bm) l.bm.color.setScalar(on ? 0.7 : 0.1); }
    if (this.gateOpen) this.gateBars.position.x = Math.min(2.9, this.gateBars.position.x + dt * 1.5);
    for (const m of this.mimics) if (!this.wave && m.state === 'fade') m.update(dt, this.player.pos);
    if (!this.playing) return;
    this.player.update(dt);
    this.cullChunks();
    if (this.wave) this.updateWave(dt);
    else if (this.st.wave < 3 && this.progress() > this.waveAt[this.st.wave]) this.startWave();
    this.updateFlash(dt); this.updateArms(dt, t);
    this._h = (this._h || 0) + dt; if (this._h > 0.25) { this._h = 0; this.updateHud(); }
    if (!this.wave && !this.typing) {
      const p = this.player.pos;
      if (this.st.wave >= 3 && Math.hypot(p.x - this.exitAt.x, p.z - this.exitAt.z) < 2.6) {
        prompt(this.kind === 'park' ? 'The far gate: type tonight\'s rules to open it' : 'The EXIT door: type tonight\'s rules to open it');
        if (wasPressed('KeyE')) this.gate();
      } else if (this.st.wave < 3 && Math.hypot(p.x - this.exitAt.x, p.z - this.exitAt.z) < 2.6) prompt('Locked. Something is still out there in the dark behind you.');
      else prompt(null);
    }
  }
}
