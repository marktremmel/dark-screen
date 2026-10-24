// The stairwell descent: from your front door to the ground floor, with Exit 8 rules.
// One module = one landing, the flight down to the half landing (with a window), and the flight on to the next landing.
// Five modules are stacked (two above, two below). When you reach the next landing the whole world shifts by one storey,
// so you are always standing on module 0, and the landings are re-dressed for what comes next.
import * as THREE from 'three';
import { Walker } from '../../scenes/walker.js';
import { texBox, plane, windowPane, canvasTex } from '../../core/world.js';
import { psxMat } from '../../core/render.js';
import { tex } from '../../core/assets.js';
import { lockPointer, wasPressed } from '../../core/player.js';
import { hud, hudParts, objective, prompt, caption, fade, flash, checklist, wait } from '../../core/hud.js';
import { loop, stopLoop, play, music, babble } from '../../core/audio.js';
import { S, persist } from '../../core/state.js';
import { CFG } from '../config.js';
import { rng, freshSeed } from '../logic/rng.js';
import { newDescent, prepare, resolve, advance, groundReward } from '../logic/descent.js';
import { DIFFS, newRun } from '../logic/night.js';
import { TOPICS } from '../content/walks.js';
import { earn, nerve, noteAnomaly, die } from '../save/rogueSave.js';
import { ANOMALY, WHERE } from '../content/anomalies.js';
import { dressLanding, L } from './landing.js';
import { readPanel, rulesPanel } from '../ui/panels.js';
import { Watcher } from '../entities/watcher.js';
import { typeOne } from '../ui/typing.js';
import { timeFor, hardText } from '../logic/typing.js';
import { startNerve } from '../logic/home.js';
import { skipWait } from '../ui/skip.js';
import { shaft, glow, makeDust } from '../ui/fx.js';

const H = CFG.floorH, HALF = H / 2, RUN = 3.0, STEPS = 8;
const KS = [-2, -1, 0, 1, 2];
const FA = [0, 1.2], FB = [1.45, L.XR - L.WT];      // flight A (down from a landing) and flight B (on to the next one)
const ZW = -4.5;                                    // window wall
const YX = 60;                                      // the yellow rooms are built far away along x

export class Stairwell extends Walker {
  constructor(G, R, run) { super(G); this.R = R; this.run = run || newRun('T1', 'normal', 'park'); this.D = DIFFS[this.run.diff] || DIFFS.normal; this.quitLabel = 'Go home (the night ends here)'; }

  async build() {
    const g = this.newScene(0x040506, 2.2, 12.5);
    this.r = rng(freshSeed());
    this.d = newDescent(this.R.life.floor, { chance: this.D.anomaly, topic: this.run.topic, back: this.D.back }); prepare(this.r, this.d);
    this.R.life.nerveMax = startNerve(this.R.life); this.R.life.nerve = this.R.life.nerveMax; this.R.life.fed = false; this.R.life.rested = false;   // a meal and a rest count for one night
    this.mods = {};
    this.buildShaft(g);
    for (const k of KS) this.buildModule(g, k);
    this.buildYellow(g);
    this.scene.add(new THREE.AmbientLight(0x3a4456, 0.16));
    this.scene.add(new THREE.HemisphereLight(0x7a8aa0, 0x201810, 0.1));
    this.setupRig({ arms: true, flash: true, stepVol: 0.3, reach: 2.2 });
    this.dust = makeDust(this.scene, this.G.camera);
    this.gate = {
      up: { x0: FB[0], x1: FB[1], z0: -0.32, z1: -0.04, y0: -0.7, y1: 0.7 },
      down: { x0: FA[0], x1: FA[1], z0: -0.32, z1: -0.04, y0: -0.7, y1: 0.7 },
    };
    this.col.push(this.gate.up, this.gate.down);
    this.y = 0; this.lightT = this.D.light; this.lightsOn = true; this.voiceT = 0; this.busy = false;
    this.items = [];
    this.dressAll();
  }

  // ---------- geometry ----------
  buildShaft(g) {
    const W = { col: this.col, block: this.block, tile: H }, y0 = -3 * H, y1 = 3 * H;
    texBox(g, 'rg_wall', L.XL - 0.2, y0, L.ZB, L.XR + 0.2, y1, L.ZB + 0.2, W);                  // back wall (flat doors)
    texBox(g, 'rg_wall', L.XL - 0.2, y0, ZW, L.XL, y1, L.ZB, W);                                // left wall
    texBox(g, 'rg_wall', L.XR - L.WT, y0, ZW - 0.2, L.XR + 0.1, y1, L.ZB, W);                     // right wall
    texBox(g, 'rg_wall', 0, y0, ZW - 0.2, L.XR, y1, ZW, W);                                      // window wall
    texBox(g, 'rg_wall', L.XL, y0, -0.2, 0, y1, 0, W);                                          // lift wall
    texBox(g, 'rg_wall', -0.2, y0, ZW, 0, y1, -0.2, W);                                         // side of flight A
    this.col.push({ x0: L.XL, x1: 0, z0: ZW, z1: 0 });                                          // the lift shaft is solid
    this.col.push({ x0: FA[1], x1: FB[0], z0: -3, z1: 0 });                                     // the railing between the flights
  }
  buildModule(g, k) {
    const y0 = k * H, m = { k, g: new THREE.Group(), dg: new THREE.Group(), lamps: [] };
    m.g.position.y = y0; m.dg.position.y = y0; g.add(m.g); g.add(m.dg);
    const G = m.g, xR = L.XR - L.WT;
    // landing and half landing (terrazzo on top, whitewash underneath)
    texBox(G, 'rg_white', L.XL, -0.24, 0, xR, 0, L.ZB - L.WT, { tile: 2 });
    plane(G, 'rg_terrazzo', L.XL, 0, xR, L.ZB - L.WT, 0.003, { tile: 1.1 });
    texBox(G, 'rg_white', 0, -HALF - 0.24, ZW, xR, -HALF, -3, { tile: 2 });
    plane(G, 'rg_terrazzo', 0, ZW, xR, -3, -HALF + 0.003, { tile: 1.1 });
    // steps: flight A goes down from the landing towards the window, flight B comes back to the next landing
    const rise = HALF / STEPS, tread = RUN / STEPS;
    for (let i = 0; i < STEPS; i++) {
      const ta = -(i + 1) * rise; texBox(G, 'rg_concrete', FA[0], ta - 0.2, -(i + 1) * tread, FA[1], ta, -i * tread, { tile: 0.8 });
      const tb = -HALF - (i + 1) * rise; texBox(G, 'rg_concrete', FB[0], tb - 0.2, -3 + i * tread, FB[1], tb, -3 + (i + 1) * tread, { tile: 0.8 });
    }
    const ang = Math.atan2(HALF, RUN), len = Math.hypot(HALF, RUN), sm = psxMat({ color: 0xc9c3b4 });
    const soffit = (x0, x1, yTop, sign) => { const s = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, 0.1, len), sm); s.rotation.x = sign * ang; s.position.set((x0 + x1) / 2, yTop - HALF / 2 - 0.22, -1.5); G.add(s); };
    soffit(FA[0], FA[1], 0, -1); soffit(FB[0], FB[1], -HALF, 1);   // rotation.x > 0 tips the +z end down
    // railings: wooden handrail and green-painted bars along both flights
    const rm = psxMat({ color: 0x2f4a3a }), hm = psxMat({ color: 0x5a3a22 });
    const rail = (x, flightA) => {
      const hr = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.05, len), hm);
      hr.rotation.x = flightA ? -ang : ang; hr.position.set(x, (flightA ? -HALF / 2 : -HALF - HALF / 2) + 0.92, -1.5); G.add(hr);
      for (let i = 0; i <= STEPS; i++) {
        const z = flightA ? -i * tread : -3 + i * tread, y = flightA ? z / RUN * HALF : -HALF - (i * tread) / RUN * HALF;
        const bar = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.92, 0.025), rm); bar.position.set(x, y + 0.46, z); G.add(bar);
      }
    };
    rail(1.26, true); rail(1.39, false);
    // lights: a bulb on the landing ceiling and one on the half landing wall (only near modules carry real lights)
    const bulb = (x, y, z) => {
      const bm = new THREE.MeshBasicMaterial({ color: 0xffe0a8, fog: false });
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 6), bm); b.position.set(x, y, z); G.add(b);
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.03, 10), psxMat({ color: 0xd8d2c4 })); cap.position.set(x, y + 0.08, z); G.add(cap);
      const light = Math.abs(k) <= 1 ? new THREE.PointLight(0xffd9a0, 0, 7.5, 1.5) : null;
      if (light) { light.position.set(x, y - 0.15, z); G.add(light); }
      m.lamps.push({ bm, light, base: 4.2, glow: Math.abs(k) <= 1 ? glow(G, x, y, z, 0xffd9a0, 0.7, 0.45) : null, shaft: Math.abs(k) <= 1 && y > H / 2 ? shaft(G, x, y - 0.05, z, 0xffd9a0, { h: y, r1: 1.3, opacity: 0.05 }) : null });
    };
    bulb(-0.7, H - 0.36, 1.05);
    bulb(1.3, -HALF + 2.25, ZW + 0.2);
    if (Math.abs(k) <= 1) windowPane(G, 1.3, -HALF + 1.45, ZW + 0.012, 1.1, 1.0, 0, { lights: true, view: k === 0 ? 'view_night_high' : 'view_night_flat' });
    this.mods[k] = m;
  }
  buildYellow(g) {
    // the yellow rooms: a small maze that is generated again every time you fall into it
    const Y = this.yellow = new THREE.Group(); g.add(Y);
    const yl = new THREE.PointLight(0xfff0b0, 0, 14, 1.0); yl.position.set(YX, 2.3, 0); g.add(yl); this.yLight = yl;
    const ya = new THREE.AmbientLight(0xe8d890, 0); g.add(ya); this.yAmb = ya;
    this.watcher = new Watcher(g); this.watcher.speedMul = 1.15 * this.D.speed;
    this.watcher.root.visible = true; this.watcher.root.position.set(YX - 30, -20, 0);   // always in the scene (never change the light count), parked out of sight
  }
  /** Build a new maze: N x N cells of C metres, a spanning tree of openings, an exit on the far side. */
  genMaze(N = 4) {
    const Y = this.yellow, C = 4, h = 2.6, r = this.r;
    while (Y.children.length) Y.remove(Y.children[0]);
    for (let i = this.col.length - 1; i >= 0; i--) if (this.col[i].maze) this.col.splice(i, 1);
    for (let i = this.block.length - 1; i >= 0; i--) if (this.block[i].userData.maze) this.block.splice(i, 1);
    const open = new Set(), key = (a, b) => a < b ? a + ':' + b : b + ':' + a, id = (x, z) => z * N + x;
    const seen = new Set([0]), stack = [[0, 0]];
    while (stack.length) {
      const [cx, cz] = stack[stack.length - 1];
      const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dz]) => [cx + dx, cz + dz]).filter(([x, z]) => x >= 0 && z >= 0 && x < N && z < N && !seen.has(id(x, z)));
      if (!nb.length) { stack.pop(); continue; }
      const [nx, nz] = nb[Math.floor(r() * nb.length)]; open.add(key(id(cx, cz), id(nx, nz))); seen.add(id(nx, nz)); stack.push([nx, nz]);
    }
    for (let i = 0; i < 3; i++) { const x = Math.floor(r() * (N - 1)), z = Math.floor(r() * N); open.add(key(id(x, z), id(x + 1, z))); }   // a few loops
    const ox = YX, oz = 0, X = cx => ox + cx * C, Z = cz => oz - cz * C;   // cell (cx,cz) spans x X..X+C, z Z-C..Z
    plane(Y, 'rg_y_carpet', ox, oz - N * C, ox + N * C, oz, 0, { tile: 1.2 });
    plane(Y, 'rg_y_ceil', ox, oz - N * C, ox + N * C, oz, h, { tile: 1.2, ceiling: true });
    this.mz = { N, C, open, key, id, X, Z }; this.mPanels = []; this.mNotes = [];
    const W = { col: this.col, block: this.block, tile: 1.4 };
    const wallBox = (x0, z0, x1, z1) => { const m = texBox(Y, 'rg_y_wall', x0, 0, z0, x1, h, z1, W); m.userData.maze = true; this.col[this.col.length - 1].maze = true; };
    for (let cz = 0; cz < N; cz++) for (let cx = 0; cx < N; cx++) {
      // east wall of each cell, and the north wall (towards -z)
      if (cx < N - 1) { const x = X(cx + 1); if (open.has(key(id(cx, cz), id(cx + 1, cz)))) { wallBox(x - 0.1, Z(cz) - C, x + 0.1, Z(cz) - C + 1.2); wallBox(x - 0.1, Z(cz) - 1.2, x + 0.1, Z(cz)); } else wallBox(x - 0.1, Z(cz) - C, x + 0.1, Z(cz)); }
      if (cz < N - 1) { const z = Z(cz) - C; if (open.has(key(id(cx, cz), id(cx, cz + 1)))) { wallBox(X(cx), z - 0.1, X(cx) + 1.2, z + 0.1); wallBox(X(cx) + C - 1.2, z - 0.1, X(cx) + C, z + 0.1); } else wallBox(X(cx), z - 0.1, X(cx) + C, z + 0.1); }
      const p = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.6), new THREE.MeshBasicMaterial({ color: r() < 0.2 ? 0x8a8060 : 0xfff6d0, fog: true })); p.rotation.x = Math.PI / 2; p.position.set(X(cx) + C / 2, h - 0.01, Z(cz) - C / 2); Y.add(p); this.mPanels.push(p);
    }
    wallBox(ox - 0.2, oz - N * C, ox, oz); wallBox(ox + N * C, oz - N * C, ox + N * C + 0.2, oz); wallBox(ox, oz, ox + N * C, oz + 0.2); wallBox(ox, oz - N * C - 0.2, ox + N * C, oz - N * C);
    // the exit: the cell furthest from the start (along the corridors), on the far wall
    const dist = { 0: 0 }, q = [0];
    while (q.length) { const c = q.shift(), cx = c % N, cz = Math.floor(c / N); for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const x = cx + dx, z = cz + dz; if (x < 0 || z < 0 || x >= N || z >= N) continue; const n = id(x, z); if (dist[n] == null && open.has(key(c, n))) { dist[n] = dist[c] + 1; q.push(n); } } }
    const far = Object.keys(dist).map(Number).filter(c => Math.floor(c / N) === N - 1).sort((a, b) => dist[b] - dist[a])[0];
    const ex = X(far % N) + C / 2, ez = oz - N * C + 0.02;
    const door = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 2.05), psxMat({ map: tex('rg_flatdoor'), color: 0xd8c890 })); door.position.set(ex, 1.025, ez); Y.add(door);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.18), new THREE.MeshBasicMaterial({ map: canvasTex(48, 16, c => { c.fillStyle = '#0e5a2a'; c.fillRect(0, 0, 48, 16); c.fillStyle = '#d6ffe2'; c.font = '16px m5x7'; c.textBaseline = 'top'; c.fillText('EXIT', 10, 1); }) }));
    sign.position.set(ex, 2.35, ez + 0.01); Y.add(sign);
    this.yDoor = door; this.yExit = new THREE.Vector3(ex, 0, ez);
    // the watcher waits in a cell half way
    const mid = Object.keys(dist).map(Number).filter(c => dist[c] >= 2 && c !== far).sort(() => r() - 0.5)[0] ?? N + 1;
    this.mazeWatch = [X(mid % N) + C / 2, Z(Math.floor(mid / N)) - C / 2];
    this.mazeBounds = { x0: ox + 0.4, x1: ox + N * C - 0.4, z0: oz - N * C + 0.4, z1: oz - 0.4 };
    this.mazeStart = [X(0) + C / 2, Z(0) - C / 2];
    // two old screens on stands with a line from tonight's topic: typing one makes the figure lose you for a while
    const lines = (TOPICS[this.run.topic] || TOPICS.T1).lines.slice().sort(() => r() - 0.5);
    const cells = Object.keys(dist).map(Number).filter(c => c !== 0 && c !== far && c !== mid).sort(() => r() - 0.5).slice(0, N >= 6 ? 3 : 2);
    cells.forEach((c, i) => {
      const L0 = lines[i % lines.length], x = X(c % N) + C / 2 + (r() < 0.5 ? -1 : 1) * 0.9, z = Z(Math.floor(c / N)) - C / 2 + (r() < 0.5 ? -1 : 1) * 0.9;
      const stand = texBox(Y, 'rg_concrete', x - 0.05, 0, z - 0.05, x + 0.05, 1.1, z + 0.05, {}); stand.userData.maze = true;
      const dk = new THREE.MeshBasicMaterial({ color: 0x15161a });
      const scr = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.42, 0.06), [dk, dk, dk, dk, new THREE.MeshBasicMaterial({ map: canvasTex(124, 84, cx2 => {
        cx2.fillStyle = '#05140c'; cx2.fillRect(0, 0, 124, 84); cx2.fillStyle = '#7dffb0'; cx2.font = '16px m5x7'; cx2.textBaseline = 'top';
        cx2.fillText('> TYPE TO HIDE', 6, 4); const w = L0.type.split(' '); let ln = '', y = 26;
        for (const ww of w) { if ((ln + ' ' + ww).length > 17) { cx2.fillText(ln, 6, y); y += 14; ln = ww; } else ln = ln ? ln + ' ' + ww : ww; } cx2.fillText(ln, 6, y);
      }) }), dk]);
      scr.position.set(x, 1.32, z); scr.lookAt(X(c % N) + C / 2, 1.32, Z(Math.floor(c / N)) - C / 2); Y.add(scr);
      this.mNotes.push({ mesh: scr, line: L0, done: false });
    });
  }
  /** The maze cell a point is in. */
  mCell(x, z) { const { N, C, id } = this.mz; return id(Math.max(0, Math.min(N - 1, Math.floor((x - YX) / C))), Math.max(0, Math.min(N - 1, Math.floor(-z / C)))); }
  /** Where the figure walks next: along the corridors towards you, never through walls. */
  mazeTarget(p) {
    const { N, C, open, key, X, Z } = this.mz, w = this.watcher.pos, wc = this.mCell(w.x, w.z), pc = this.mCell(p.x, p.z);
    if (wc === pc) return p;
    const dist = { [pc]: 0 }, q = [pc];
    while (q.length) { const c = q.shift(); for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const x = c % N + dx, z = Math.floor(c / N) + dz; if (x < 0 || z < 0 || x >= N || z >= N) continue; const n = z * N + x; if (dist[n] == null && open.has(key(c, n))) { dist[n] = dist[c] + 1; q.push(n); } } }
    const ctr = c => new THREE.Vector3(X(c % N) + C / 2, 0, Z(Math.floor(c / N)) - C / 2);
    const here = ctr(wc);
    const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dz]) => [wc % N + dx, Math.floor(wc / N) + dz]).filter(([x, z]) => x >= 0 && z >= 0 && x < N && z < N).map(([x, z]) => z * N + x).filter(n => open.has(key(wc, n)) && dist[n] != null).sort((a, b) => dist[a] - dist[b])[0];
    if (nb == null) return p;
    const next = ctr(nb), horiz = Math.abs(next.x - here.x) > 0.1;
    const off = horiz ? Math.abs(w.z - here.z) : Math.abs(w.x - here.x);   // get onto the line through the gap first
    return off > 0.25 ? (horiz ? new THREE.Vector3(w.x, 0, here.z) : new THREE.Vector3(here.x, 0, w.z)) : next;
  }
  async mazeNote(n) {
    if (this.typing || n.done) return;
    this.typing = true; this.player.frozen = true; prompt(null);
    this.typeHandle = {};
    const r = await typeOne({ text: n.line.type, title: `${n.line.who}: "${n.line.say}" Your answer (it hides you from the figure):`, time: timeFor(n.line.type, 4, 0.35) * this.D.typeTime, handle: this.typeHandle });
    this.typing = false; this.player.frozen = false;
    if (!r.ok) { if (!r.cancelled) caption('The screen flickers. Try again.', 'say', 2); return; }
    n.done = true; this.run.typedChars += n.line.type.length; this.run.xp += 2; earn(this.R, 2, 0); if (this.endless) this.endless.screens++; else nerve(this.R, 2);
    this.it.remove(n.it); n.mesh.material[4].color.set(0x334433);
    this.wFreeze = 9; play('rg_signal1', { vol: 0.4 });
    caption(`"${n.line.type}". The figure has lost you: about nine seconds.${this.endless ? '' : ' Nerve +2.'}`, 'say', 4); this.updateHud();
  }
  // ---------- dressing ----------
  dressAll() {
    const d = this.d, nick = S.nick || 'you';
    const filler = n => ({ kind: 'normal', number: Math.max(1, n), anomaly: null });
    const next = d.next || filler(d.cur.number - 1);
    const specs = { 0: d.cur, 1: next, '-1': next, 2: filler(next.number - 1), '-2': filler(next.number - 1) };
    for (const it of this.items) this.it.remove(it);
    this.items = [];
    for (const k of KS) {
      const m = this.mods[k];
      while (m.dg.children.length) m.dg.remove(m.dg.children[0]);
      const res = dressLanding(m.dg, specs[k], { nick, floor: d.floor, live: k === 0, calm: this.run.diff === 'calm' });
      m.res = res;
      if (k !== 0) res.lampColor = 0xffd9a0;   // only the landing you stand on may show a red bulb: the next one's light must not leak up or down the stairwell
      const red = res.lampColor !== 0xffd9a0;
      res.midColor = red ? 0xff7a5a : 0xffd9a0;   // v0.15: the red bulb also stains the half-landing light, so the whole landing reads red (Mark did not notice it in v0.14)
      const l0 = m.lamps[0]; l0.bm.color.set(res.lampColor); l0.base = red ? 6 : 4.2; if (l0.light) { l0.light.color.set(res.lampColor); l0.light.distance = red ? 10 : 7.5; }
      const l1 = m.lamps[1]; if (l1) { l1.bm.color.set(res.midColor); if (l1.light) l1.light.color.set(res.midColor); }
      if (k === 0) for (const item of res.items) this.items.push(this.it.add(item.obj, () => this.label(item), () => this.use(item)));
    }
    this.gate.up.off = d.cur.kind !== 'start';
    this.gate.down.off = d.cur.kind !== 'lobby';
    this.applyLights();
  }
  label(item) {
    switch (item.kind) {
      case 'notice': return 'Read: ' + item.data.title;
      case 'door': return item.data.name ? `Flat ${item.data.no}: ${item.data.name}` : 'A door';
      case 'yourdoor': return 'Your flat: go home (ends the night)';
      case 'switch': return 'Light switch (villanykapcsoló)';
      case 'lift': return 'The lift (lift)';
      case 'rules': return 'Read the house rules (házirend)';
      case 'street': return 'The street door: go outside';
      case 'postbox': return 'Post boxes (postaládák)';
    }
    return '';
  }
  async use(item) {
    switch (item.kind) {
      case 'notice': await this.panel(() => readPanel(item.data.title, item.data.notices)); break;
      case 'rules': await this.panel(() => rulesPanel()); break;
      case 'door': play('knock', { vol: 0.5 }); caption(item.data.name ? 'You knock. Nobody opens. A television is on somewhere inside.' : 'There is no handle. There is no flat number.', 'say', 3.5); break;
      case 'yourdoor': this.goHome(); break;
      case 'switch': this.lightT = this.D.light; play('lightsw', { vol: 0.6 }); if (!this.lightsOn) { this.lightsOn = true; this.applyLights(); } break;
      case 'lift': play('denied', { vol: 0.3 }); caption('You press the button. Nothing. The lift never works at night.', 'say', 3); break;
      case 'postbox': caption('Rows of post boxes. Flyers stick out of most of them.', 'say', 3); break;
      case 'street': this.ground(); break;
    }
  }
  async panel(open) { this.playing = false; this.G.unlock(); prompt(null); await open(); this.playing = true; lockPointer(); }

  applyLights() {
    for (const k of KS) this.mods[k].lamps.forEach((l, i) => {
      const r = this.mods[k].res, c = !r ? 0xffd9a0 : i === 0 ? r.lampColor : (r.midColor || 0xffd9a0);
      if (!this.lightsOn) l.bm.color.setRGB(0.1, 0.09, 0.08); else l.bm.color.set(c);
      for (const f of [l.glow, l.shaft]) if (f) { f.visible = this.lightsOn; f.material.color.set(c); }
      if (l.light) l.light.intensity = this.lightsOn ? l.base : 0;
    });
  }

  // ---------- flow ----------
  async enter() {
    this.playing = false; hud(false); music(null);
    if (this.run.mode === 'labyrinth') return this.enterEndless();
    loop('rgst', 'rg_drone_stair', { vol: 0.32 }); this.loops.push('rgst');
    this.player.set(-0.95, 1.35, 0);
    const first = !this.G.testStart && !this.R.record.descents && !this.R.record.deaths && !Object.keys(this.R.record.missed).length && !this.R.record.notebook.length;
    await fade(true, first ? 'You lock your door. The stairwell light is ticking.\n\nRead the house rules next to your door before you go down.' : 'You lock your door. The stairwell light is ticking.', 0.01);
    await skipWait(first ? 3.2 : 1.6);
    this.playing = true; hud(true); hudParts({ checklist: true, status: false, eye: false, batt: false });
    this.setObjective(); this.updateHud();
    await fade(false, '', 1.0);
    if (first) { this.playing = false; this.G.unlock(); await rulesPanel(); this.playing = true; caption('Walk around this landing first and learn it: this is what normal looks like.', 'say', 6); }
    lockPointer();
    this.first = first;
    if (this.G.testStart === 'maze') {   // teacher test menu: straight into the yellow maze
      this.G.testStart = null;
      const ids = Object.keys(ANOMALY), a = ids[Math.floor(this.r() * ids.length)];
      this.toYellow({ result: 'miss', anomaly: a, nerve: 0 }, this.d.cur, false);
    }
  }
  setObjective() {
    const c = this.d.cur;
    if (c.kind === 'lobby') objective('Ground floor (földszint). The street door is in front of you.');
    else objective('Reach the ground floor (földszint). Something wrong on a landing? Go back up. All normal? Keep going down.');
  }
  updateHud() {
    if (this.endless) return this.endlessHud();
    const c = this.d.cur, L = this.R.life;
    checklist(`Lépcsőház · ${c.kind === 'lobby' ? 'ground floor' : c.number + '. emelet'}`, [
      { name: `Nerve: ${L.nerve}${L.nerve <= 30 ? '  (shaking)' : ''}`, hu: 'idegek' },
      { name: `Floors to go: ${this.d.floor - this.d.progress}`, hu: 'hátravan' },
      { name: 'Wrong? UP. Normal? DOWN.', hu: 'fel / le' },
      { name: `Tonight: ${TOPICS[this.run.topic].title}`, hu: this.D.label.toLowerCase() },
      { name: `Coins tonight: ${this.run.coins}`, hu: 'zseton' },
      { name: this.lightsOn ? `Light: ${Math.ceil(this.lightT)} s` : 'Light: off (F = torch)', hu: 'villany' },
    ]);
  }

  /** Height of the floor under you: the surface closest to where you were (stairs overlap in plan). */
  groundY(x, z, prev) {
    let b;
    if (z >= 0) b = 0; else if (z < -3) b = -HALF; else if (x < 1.33) b = z / RUN * HALF; else b = -HALF - (z + 3) / RUN * HALF;
    let best = b, bd = 1e9;
    for (let k = -3; k <= 3; k++) { const y = b + k * H, dd = Math.abs(y - prev); if (dd < bd) { bd = dd; best = y; } }
    return best;
  }

  arrive(dir, lv) {
    this.lingerT = 0; this.tenantWarned = false;   // v0.20: the Tenant on the stairs only comes for people who linger
    // shift the world so the landing you reached is module 0 again
    this.y -= lv * H; this.player.yOff = this.y; this.player.sync();
    const d = this.d, from = d.cur, out = resolve(d, dir), R = this.R;
    advance(this.r, d, out);
    if (out.nerve < 0) out.nerve = -Math.round(-out.nerve * this.D.nerveLoss);
    out.xp = Math.round(out.xp * this.D.reward); out.coins = Math.round(out.coins * this.D.reward);
    const dead = nerve(R, out.nerve);
    if (out.result === 'pass' || out.result === 'spot') {
      earn(R, out.xp, out.coins); this.run.xp += out.xp; this.run.coins += out.coins;
      this.dressAll(); this.setObjective();
      if (out.result === 'spot') {
        this.run.spot++; const a = ANOMALY[out.anomaly], isNew = noteAnomaly(R, out.anomaly, true);
        play('rg_signal1', { vol: 0.5 });
        caption(`Right call: something WAS wrong on floor ${from.number}, and you turned back. ${a.lesson}`, 'say', 11);
        this.run.lessons.push({ zone: 'stairs', theme: a.theme, title: a.card.title, text: a.card.text });
        if (isNew) { this.run.cards++; setTimeout(() => caption(`New notebook card: "${a.card.title}"`, 'say', 4), 1500); }
      } else caption(`Right call: floor ${from.number} was normal, and you kept going.`, 'say', 3);
      if (d.cur.kind === 'lobby') setTimeout(() => caption('Ground floor. The street door is right there.', 'say', 3), 700);
      else setTimeout(() => caption(this.first && d.progress <= 3
        ? `Now you are on floor ${d.cur.number}. This is a new landing to check: if anything is different, go UP. If all is normal, go DOWN.`
        : `Now: floor ${d.cur.number}. Check it.`, 'say', this.first && d.progress <= 3 ? 7 : 2.5), 700);
      persist(); this.updateHud();
      return;
    }
    // a wrong call: the yellow room, then back to your own floor
    if (out.result === 'miss') { this.run.miss++; noteAnomaly(R, out.anomaly, false); const a = ANOMALY[out.anomaly]; this.run.lessons.push({ zone: 'stairs', theme: a.theme, title: a.card.title, text: a.card.text }); } else this.run.fals++;
    persist();
    this.toYellow(out, from, dead);
  }

  async toYellow(out, from, dead) {
    this.playing = false; this.busy = true; prompt(null);
    play('rg_signal2', { vol: 0.6 }); flash(0.7, 400);
    await fade(true, '', 0.5);
    stopLoop('rgst'); loop('rgy', 'rg_drone_yellow', { vol: 0.4 }); this.loops.push('rgy');
    this.genMaze();
    this.inYellow = true; this.y = 0; this.player.yOff = 0; this.yLight.intensity = 4; this.yAmb.intensity = 0.4;
    this.player.set(this.mazeStart[0], this.mazeStart[1], 180);
    this.flashOn = false;
    this.watcher.place(this.mazeWatch[0], this.mazeWatch[1], this.mazeBounds); this.watcher.setSize(1);
    this.mazeRule = out.result === 'miss' ? ANOMALY[out.anomaly].rule : 'normal is normal';
    this.yDoorIt = this.it.add(this.yDoor, 'The way out: type the rule to open it', () => this.mazeGate());
    for (const n of this.mNotes) n.it = this.it.add(n.mesh, 'An old screen: type it to hide from the figure', () => this.mazeNote(n));
    this.wFreeze = 0; this.scareT = 6 + this.r() * 6;
    await fade(false, '', 0.8);
    const n = from.kind === 'lobby' ? 'the ground floor' : `floor ${from.number}`;
    this.mazeWhat = out.result === 'miss' ? `You missed it ${WHERE[ANOMALY[out.anomaly].where] || 'on the landing'} ("${ANOMALY[out.anomaly].card.title}"). Type its rule:` : 'Nothing was wrong on that landing. Type the rule:';
    if (out.result === 'miss') caption(`Something was wrong on ${n}, ${WHERE[ANOMALY[out.anomaly].where] || 'on the landing'}, and you kept going. ${ANOMALY[out.anomaly].lesson}`, 'say', 12);
    else caption(`Nothing was wrong on ${n}. Turning back on a normal landing costs nerve too.`, 'say', 7);
    setTimeout(() => caption(`Nerve −${-out.nerve}. Find the EXIT. Something tall is in here with you: it only moves when you are not looking.`, 'say', 6), 3000);
    this.updateHud();
    this.playing = true; this.busy = false; lockPointer();
    if (dead) { await wait(3.5); this.death(); }
  }
  async mazeGate() {
    if (this.typing) return;
    this.typing = true; this.player.frozen = true; prompt(null);
    this.typeHandle = {};
    const r = await typeOne({ text: this.mazeRule, title: this.mazeWhat || 'Type the rule to open the door', time: timeFor(this.mazeRule, 4, 0.35) * this.D.typeTime * (this.run.hard ? 1.15 : 1), handle: this.typeHandle, strict: !!(this.endless && this.run.hard) });
    this.typing = false; this.player.frozen = false;
    if (r.ok) { this.run.typedChars += this.mazeRule.length; if (this.endless) this.nextRoom(); else this.leaveYellow(); return; }
    if (!r.cancelled) { caption('The door stays shut. Try again.', 'say', 2.5); if (!this.endless && nerve(this.R, -2)) this.death(); }
  }
  async leaveYellow() {
    if (this.busy) return; this.busy = true; this.playing = false;
    play('door_close', { vol: 0.5 });
    await fade(true, '', 0.6);
    this.it.remove(this.yDoorIt); for (const n of this.mNotes) if (n.it && !n.done) this.it.remove(n.it);
    this.inYellow = false; this.yLight.intensity = 0; this.yAmb.intensity = 0; this.watcher.active = false; this.watcher.root.position.set(YX - 30, -20, 0);
    stopLoop('rgy'); loop('rgst', 'rg_drone_stair', { vol: 0.32 });
    this.y = 0; this.player.yOff = 0; this.dressAll(); this.setObjective();
    const start = this.d.cur.kind === 'start';
    if (start) this.player.set(-0.95, 1.35, 0); else this.player.set(-1.6, 1.6, 0);
    this.lightT = this.D.light; this.lightsOn = true; this.applyLights();
    await fade(false, '', 0.8);
    caption(start ? `Back outside your own door, floor ${this.d.floor}. Start again.` : `Floor ${this.d.cur.number}: ${this.D.back} floor${this.D.back > 1 ? 's' : ''} back up. This landing is normal. Learn it, then go on down.`, 'say', 5);
    this.playing = true; this.busy = false; lockPointer();
  }
  async mazeCaught() {
    if (this.endless) return this.endlessCaught();
    this.playing = false; prompt(null);
    if (!S.settings.quiet) { flash(0.8, 400); play('stinger', { vol: 0.35 }); } else play('thump', { vol: 0.4 });
    const dead = nerve(this.R, -Math.round(8 * this.D.nerveLoss));
    await fade(true, '', 0.4);
    if (dead) { this.death(); return; }
    this.player.set(this.mazeStart[0], this.mazeStart[1], 180); this.watcher.place(this.mazeWatch[0], this.mazeWatch[1], this.mazeBounds);
    await fade(false, '', 0.6);
    caption('It reached you. You are back where you fell in.', 'say', 3);
    this.playing = true;
  }
  /** Put the figure in a cell next to yours that you are not looking at (behind you, or round the side). */
  mazeAmbush(p) {
    const { N, C, open, key, X, Z } = this.mz, pc = this.mCell(p.x, p.z), f = this.player.forward(new THREE.Vector3());
    const nbs = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dz]) => [pc % N + dx, Math.floor(pc / N) + dz]).filter(([x, z]) => x >= 0 && z >= 0 && x < N && z < N)
      .map(([x, z]) => z * N + x).filter(n => open.has(key(pc, n)) && n !== this.mCell(this.yExit.x, this.yExit.z));
    const behind = nbs.map(n => { const cx = X(n % N) + C / 2, cz = Z(Math.floor(n / N)) - C / 2, dx = cx - p.x, dz = cz - p.z, d = Math.hypot(dx, dz) || 1; return { n, cx, cz, dot: (f.x * dx + f.z * dz) / d }; })
      .sort((a, b) => a.dot - b.dot)[0];
    if (!behind || behind.dot > 0.2) return;
    this.watcher.pos.set(behind.cx, 0, behind.cz); this.mazeAmbushCool = this.endless ? Math.max(4, 10 - this.endless.room) : 9; this.unseenT = 0;
    play('thump', { vol: 0.28, rate: 0.6, pos: [behind.cx, 0.2, behind.cz] });
  }
  mazeSeen() {
    const w = this.watcher, cam = this.G.camera.position, hd = w.head(), dx = hd.x - cam.x, dz = hd.z - cam.z, d = Math.hypot(dx, dz);
    const f = this.player.forward(new THREE.Vector3());
    const ang = Math.acos(Math.max(-1, Math.min(1, (f.x * dx + f.z * dz) / (d * Math.hypot(f.x, f.z) || 1))));
    return ang < 0.66 && this.lineOfSight(cam, hd);
  }
  // ---------- the endless labyrinth (v0.16) ----------
  // A night of its own, chosen in the night menu: room after room of the yellow maze. Every EXIT asks for a line from
  // tonight's topic and opens onto a bigger room; the figure gets a little faster each time. Three catches end it.
  // No nerve is lost here, so it never costs a life: it is the practice ground, with a score to beat.
  async enterEndless() {
    loop('rgy', 'rg_drone_yellow', { vol: 0.4 }); this.loops.push('rgy');
    this.endless = { room: 1, catches: 0, screens: 0, t0: performance.now() };
    const best = (this.R.record.best && this.R.record.best.rooms) || 0;
    await fade(true, `The yellow rooms. No floors, no stairs: only the next EXIT.\nEvery door asks for a line from tonight's topic. It will be waiting in every room.\n\n${best ? 'Your best: ' + best + ' rooms.' : 'How many rooms can you get through?'}`, 0.01);
    this.setupRoom();
    await skipWait(4.2);
    this.playing = true; hud(true); hudParts({ checklist: true, status: false, eye: false, batt: false });
    objective('Find the EXIT. It only moves when you are not looking. Caught three times and the labyrinth is over.');
    this.updateHud(); lockPointer();
    await fade(false, '', 1.0);
    caption('Room 1. Find the EXIT.', 'say', 3);
  }
  /** Build the current room and put everyone in place (the screen is black while this runs). */
  setupRoom() {
    const e = this.endless, N = Math.min(7, 4 + Math.floor((e.room - 1) / 2));
    if (this.yDoorIt) this.it.remove(this.yDoorIt); for (const n of this.mNotes || []) if (n.it && !n.done) this.it.remove(n.it);
    this.genMaze(N);
    this.inYellow = true; this.y = 0; this.player.yOff = 0;
    const dark = e.room % 3 === 0;   // every third room the lights are mostly out: your torch matters
    this.yLight.intensity = dark ? 0.7 : 4; this.yLight.distance = dark ? 5 : 14; this.yAmb.intensity = dark ? 0.03 : 0.4;
    for (const p of this.mPanels) if (dark && this.r() < 0.75) p.material.color.set(0x2a2618);
    this.player.set(this.mazeStart[0], this.mazeStart[1], 180);
    this.watcher.place(this.mazeWatch[0], this.mazeWatch[1], this.mazeBounds); this.watcher.setSize(1);
    const lines = TOPICS[this.run.topic].lines, L0 = lines[Math.floor(this.r() * lines.length)];
    this.mazeRule = this.run.hard ? hardText(L0.lesson) : L0.type; this.roomLine = L0;
    this.mazeWhat = `Room ${e.room}. ${L0.who}: "${L0.say}" Type the answer to open the EXIT:`;
    this.yDoorIt = this.it.add(this.yDoor, 'The EXIT: type the answer to open it', () => this.mazeGate());
    for (const n of this.mNotes) n.it = this.it.add(n.mesh, 'An old screen: type it to hide from the figure', () => this.mazeNote(n));
    this.wFreeze = 2.5; this.scareT = 6 + this.r() * 6; this.mazeAmbushCool = 4; this.unseenT = 0;
    this.dark = dark;
  }
  async nextRoom() {
    if (this.busy) return; this.busy = true; this.playing = false;
    const e = this.endless, xp = 4 + e.room * 2, coins = 2;
    earn(this.R, xp, coins); this.run.xp += xp; this.run.coins += coins; e.room++;
    const L0 = this.roomLine; if (L0) this.run.lessons.push({ zone: 'labyrinth', theme: this.run.topic, title: `"${L0.type}"`, text: L0.lesson, rule: L0.rule });
    play('door_close', { vol: 0.5 });
    await fade(true, `Room ${e.room - 1} done. +${xp} XP, +${coins} coins.`, 0.5);
    this.setupRoom(); this.updateHud();
    await wait(0.9);
    await fade(false, '', 0.6);
    caption(this.dark ? `Room ${e.room}. The lights are out in this one: use your torch (F).` : e.room % 2 ? `Room ${e.room}. Bigger again.` : `Room ${e.room}. It is a little faster now.`, 'say', 4);
    this.playing = true; this.busy = false; lockPointer();
  }
  async endlessCaught() {
    const e = this.endless; this.playing = false; prompt(null);
    if (!S.settings.quiet) { flash(0.8, 400); play('stinger', { vol: 0.35 }); } else play('thump', { vol: 0.4 });
    e.catches++;
    await fade(true, '', 0.4);
    if (e.catches >= 3) { this.endEndless('caught'); return; }
    this.player.set(this.mazeStart[0], this.mazeStart[1], 180); this.watcher.place(this.mazeWatch[0], this.mazeWatch[1], this.mazeBounds);
    this.wFreeze = 2.5; this.updateHud();
    await fade(false, '', 0.6);
    caption(`It reached you (${e.catches} of 3). Back to the start of this room.`, 'say', 3);
    this.playing = true;
  }
  /** The labyrinth is over: caught three times, or you went home. Rooms cleared is the score. */
  async endEndless(why) {
    if (this.over) return; this.over = true;
    this.playing = false; this.busy = true; this.G.unlock(); prompt(null);
    const e = this.endless; this.run.rooms = e.room - 1; this.run.screens = e.screens; this.run.labyrinthEnd = why;
    if (this.run.rooms > 0 && !this.run.stages.includes('labyrinth')) this.run.stages.push('labyrinth');
    persist();
    await fade(true, why === 'caught' ? `Caught for the third time, in room ${e.room}.` : 'You find a door that is only a door, and go home.', 0.8);
    await wait(1.6);
    this.G.endNight(this.run, 'labyrinth');
  }
  endlessHud() {
    const e = this.endless, best = (this.R.record.best && this.R.record.best.rooms) || 0;
    checklist(`The labyrinth · room ${e.room}`, [
      { name: `Rooms cleared: ${e.room - 1}${best ? '  (best ' + best + ')' : ''}`, hu: 'szobák' },
      { name: `Caught: ${e.catches} of 3`, hu: 'elkapott' },
      { name: `Tonight: ${TOPICS[this.run.topic].title}`, hu: this.run.hard ? 'téma · nehéz gépelés' : 'téma' },
      { name: `Coins tonight: ${this.run.coins}`, hu: 'zseton' },
    ]);
  }
  death() {
    this.playing = false; this.busy = true; prompt(null);
    play('stinger', { vol: 0.4 }); this.yLight.intensity = 0; this.yAmb.intensity = 0;
    this.G.loseLife(this.run);
  }
  async ground() {
    if (this.busy) return; this.busy = true; this.playing = false; this.G.unlock(); prompt(null);
    const rw = groundReward(this.d.floor), xp = Math.round(rw.xp * this.D.reward), coins = Math.round(rw.coins * this.D.reward);
    earn(this.R, xp, coins); this.R.record.descents++; this.run.xp += xp; this.run.coins += coins; this.run.stages.push('stairs'); persist();
    play('door_open', { vol: 0.5 });
    const shortcut = this.run.route && this.run.route[1] === 'metro';
    await fade(true, `Ground floor. +${xp} XP, +${coins} coins.\n\n${shortcut ? 'The basement door is open tonight. Steps down, a tunnel, and the hum of the metro.' : 'You push the street door open.'}`, 0.8);
    await wait(1.8);
    this.G.rogueNext(this.run, 'stairs');
  }
  async goHome() {
    this.playing = false; this.busy = true; this.G.unlock(); prompt(null);
    await fade(true, '', 0.8);
    this.G.endNight(this.run, 'home');
  }
  quit() { if (this.endless) this.endEndless('home'); else this.goHome(); }

  update(dt, t) {
    for (const k of KS) { const b = this.mods[k].res && this.mods[k].res.blink; if (b) b.visible = Math.sin(t * 6) > 0; }
    if (!this.playing) return;
    this.player.update(dt);
    if (this.inYellow && !this.typing) {
      const p = this.player.pos; this.yLight.position.set(p.x, 2.3, p.z);
      if (this.wFreeze > 0) this.wFreeze -= dt;
      else if (this.watcher.active) {
        const w = this.watcher.pos, ox = w.x, oz = w.z, dist = Math.hypot(w.x - p.x, w.z - p.z), far = dist > 7, seen = this.mazeSeen();
        this.watcher.speedMul = (far ? 2.2 : dist > 2.5 ? 1.6 : 1.25) * this.D.speed * (this.endless ? 1 + 0.07 * Math.min(10, this.endless.room - 1) : 1);   // run past it and it is soon right behind you again
        this.watcher.update(dt, { player: this.mazeTarget(p), seen, trackers: 0, noise: 0, cam: this.G.camera.position });
        // out of sight for a while and far away: it is waiting for you around a corner you have not looked at yet
        this.unseenT = seen ? 0 : (this.unseenT || 0) + dt;
        if (far && this.unseenT > 3 && !this.mazeAmbushCool) this.mazeAmbush(p);
        if (this.mazeAmbushCool) this.mazeAmbushCool = Math.max(0, this.mazeAmbushCool - dt);
        if (Math.hypot(w.x - ox, w.z - oz) > 0.0005) { this.stepT = (this.stepT || 0) - dt; if (this.stepT <= 0) { this.stepT = 0.62; play('thump', { vol: far ? 0.08 : 0.2, rate: 0.7, pos: [w.x, 0.2, w.z] }); } }
        if (Math.hypot(w.x - p.x, w.z - p.z) < 0.85) { this.mazeCaught(); return; }
      }
      // the rooms are not quite right: panels flicker, something knocks far away
      this.scareT -= dt;
      if (this.scareT <= 0) {
        this.scareT = 7 + this.r() * 9; const pn = this.mPanels[Math.floor(this.r() * this.mPanels.length)];
        if (pn) { pn.material.color.set(0x2a2618); setTimeout(() => pn.material.color.set(0xfff6d0), 400 + this.r() * 900); }
        if (this.r() < 0.5) play(this.r() < 0.5 ? 'knock' : 'presence', { vol: 0.25 });
      }
    }
    if (!this.inYellow) {
      const p = this.player.pos;
      // v0.20 hard mode: the Tenant comes down the stairs for anyone who stays too long on one landing
      if (this.run.tenant && !this.busy) {
        this.lingerT = (this.lingerT || 0) + dt;
        if (this.lingerT > 45 && !this.tenantWarned) { this.tenantWarned = true; play('thump', { vol: 0.35, rate: 0.5, pos: [p.x, p.y + 4, p.z] }); setTimeout(() => play('thump', { vol: 0.4, rate: 0.5, pos: [p.x, p.y + 3, p.z] }), 700); caption('(slow, heavy steps on the flight above you. Something is coming down. Decide.)', 'sfx', 5); }
        if (this.lingerT > 60) {
          this.lingerT = 0; this.tenantWarned = false; this.lightsOn = false; this.lightT = 0; this.applyLights(); flash(0.6, 500); play('stinger', { vol: 0.3 });
          const dead = nerve(this.R, -Math.round(15 * this.D.nerveLoss)); this.updateHud();
          if (dead) { this.death(); return; }
          caption(`The light dies. Something tall passes you in the dark, close enough to feel, and goes on down. Nerve −${Math.round(15 * this.D.nerveLoss)}.`, 'say', 6);
        }
      }
      // v0.17 small events: the block is lived in. Never an anomaly, never a clue: only the sounds of other people's night.
      this.evT = (this.evT == null ? 25 + this.r() * 20 : this.evT) - dt;
      if (this.evT <= 0 && !this.busy) {
        this.evT = 35 + this.r() * 30; const k = Math.floor(this.r() * 4);
        if (k === 0) { play('door_close', { vol: 0.25, pos: [p.x, p.y + 6, p.z] }); caption('(a door closes, a few floors up)', 'sfx', 2.5); }
        else if (k === 1) { play('lightsw', { vol: 0.3 }); caption('(the lift clunks to a stop on this floor. The doors stay shut. Nobody gets out.)', 'sfx', 3.5); }
        else if (k === 2) { play('knock', { vol: 0.2, pos: [p.x + 3, 1.2, p.z] }); caption('(somebody knocks on a door downstairs, then gives up)', 'sfx', 3); }
        else { play('presence', { vol: 0.12 }); caption('(a television, muffled, behind one of the doors)', 'sfx', 2.5); }
      }
      this.y = this.groundY(p.x, p.z, this.y); this.player.yOff = this.y; this.player.sync();
      if (p.z >= 0.05) { const lv = Math.round(this.y / H); if (lv !== 0 && Math.abs(this.y - lv * H) < 0.06) { this.arrive(lv > 0 ? 'up' : 'down', lv); return; } }
      // the light timer
      if (this.lightsOn) { this.lightT -= dt; if (this.lightT <= 0) { this.lightsOn = false; play('lightsw', { vol: 0.5, rate: 0.8 }); this.applyLights(); caption('Click. The light went out. Press F for your torch, or find a switch.', 'say', 4); } }
      // a phone rings behind a door, and someone answers in your voice
      if (this.d.cur.anomaly === 'phone_voice' && t > this.voiceT) {
        const d3 = this.mods[0].res.door3, dist = Math.hypot(p.x - d3.x, p.z - d3.z);
        if (dist < 3.4) {
          this.voiceT = t + 16;
          play('phonering', { vol: 0.35, pos: [d3.x, this.y + 1.2, d3.z + 0.6] });
          setTimeout(() => { if (this.d.cur.anomaly !== 'phone_voice') return; babble('Hello? Yes, it is me. I need that code, quickly.', 'you', { vol: 0.09 }); caption('(behind the door of flat ' + (this.d.cur.number * 3 + 3) + ', someone answers the phone in your voice)', 'sfx', 5); }, 2600);
        }
      }
    }
    this.updateFlash(dt); this.updateArms(dt, t);
    this.fill.intensity = this.flashOn ? 0.3 : 0.05;
    this._h = (this._h || 0) + dt; if (this._h > 0.25) { this._h = 0; this.updateHud(); }
    if (!this.typing) this.interact();
  }
}
