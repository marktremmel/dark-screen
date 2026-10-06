import * as THREE from 'three';
import { A, inst } from '../core/assets.js';
import { psxMat, R } from '../core/render.js';
import { texBox, plane, wall, windowPane, lamp, canvasTex, place, colliderFor, clockFace } from '../core/world.js';
import { Player, Interactor, IN, wasPressed, lockPointer } from '../core/player.js';
import { hud, hudParts, objective, prompt, caption, toast, fade, flash, checklist, eye, battery, carry, wait } from '../core/hud.js';
import { music, loop, stopLoop, play, AU } from '../core/audio.js';
import { S, epData, persist } from '../core/state.js';
import { PARTS, PART_ORDER, DEBRIEF_EP1, plain, rich } from '../text.js';
import { openScreen, closeScreen, debriefScreen, cutIn } from '../ui/screens.js';
import { floatTorch, swayTorch } from './walker.js';
import { openFit } from '../ui/fit.js';

const RESTORE_ORDER = ['kitchen', 'living', 'bedroom', 'pantry', 'myroom', 'windows'];
// Each part has several possible hiding places; one is picked per playthrough
// (so classmates can't just tell each other where everything is).
const PART_SPOTS = {
  cpu: { spots: [[4.0, 0.45, 6.25], [-1.15, 0.75, 6.75], [2.75, 0.42, 7.0]], box: [0.13, 0.05, 0.13], color: '#2b6fd6', label: 'CPU' },
  cooler: { spots: [[-3.5, 1.8, 4.5], [5.74, 1.8, 4.75], [-3.6, 0.9, 6.55]], box: [0.18, 0.16, 0.18], color: '#d6542b', label: 'COOL' },
  ram: { spots: [[-3.72, 0.55, 0.3], [4.32, 0.55, 4.3], [-2.4, 0.42, 2.6]], box: [0.16, 0.03, 0.1], color: '#2bb07a', label: 'RAM' },
  ssd: { spots: [[5.66, 0.98, 5.0], [1.0, 0.95, -1.55], [-1.85, 0.75, 6.3]], box: [0.1, 0.03, 0.12], color: '#8a2bd6', label: 'SSD' },
  gpu: { spots: [[-1.3, 1.25, 0.42]], box: [0.34, 0.08, 0.16], color: '#d62b4a', label: 'GPU', hidden: true },
  psu: { spots: [[0.32, 0, 7.25], [-2.6, 0, 7.5], [-1.4, 0, 3.5]], box: [0.22, 0.18, 0.22], color: '#333a44', label: 'PSU' },
  cables: { spots: [[0.5, 0, -1.05]], box: null, color: '#aa8855', label: '' },
};
const BATTERIES = [[4.55, 0.56, 0.32], [-1.5, 0.76, 6.6], [1.0, 1.82, -1.75]];
const STATION = new THREE.Vector3(5.2, 0, 1.25);

export class Ep1 {
  constructor(G) { this.G = G; this.playing = false; this.quitLabel = 'Back to the lab (progress is saved)'; }

  async build() {
    const sc = this.scene = new THREE.Scene();
    sc.background = new THREE.Color(0x07080c);
    sc.fog = new THREE.Fog(0x07080c, 3.5, 13);
    const g = this.root = new THREE.Group(); sc.add(g);
    const col = this.col = [], block = this.block = [];
    // ---------- floors & ceiling ----------
    plane(g, 'wood_floor', 2, 0, 6, 4, 0, { tile: 1.2 });
    plane(g, 'tiles', 0, -2, 2, 8, 0, { tile: 0.8 });
    plane(g, 'wood_floor', 2, 4, 6, 8, 0, { tile: 1.2 });
    plane(g, 'carpet', -4, 0, 0, 4, 0, { tile: 1.0 });
    plane(g, 'tiles', -4, 4, 0, 8, 0, { tile: 0.6, color: 0xd8d0c0 });
    plane(g, 'wall2', -4, -2, 6, 8, 2.6, { tile: 1.5, ceiling: true, color: 0xbdb6aa });
    // ---------- walls ----------
    const wo = { col, block, tile: 1.3 };
    wall(g, 'wall', -4, 0, 0, 0, wo); wall(g, 'wall', 2, 0, 6, 0, wo);
    wall(g, 'wall', 0, -2, 2, -2, wo); wall(g, 'wall', 0, -2, 0, 0, wo); wall(g, 'wall', 2, -2, 2, 0, wo);
    wall(g, 'wall', 0, 0, 2, 0, { ...wo, gaps: [[0.55, 1.45]] });
    wall(g, 'wall', -4, 8, 6, 8, wo);
    wall(g, 'wall', -4, 0, -4, 8, wo); wall(g, 'wall', 6, 0, 6, 8, wo);
    wall(g, 'wall', 0, 0, 0, 8, { ...wo, gaps: [[1.2, 2.1], [5.2, 6.6]] });
    wall(g, 'wall', 2, 0, 2, 8, { ...wo, gaps: [[2.6, 3.5], [5.0, 6.0]] });
    wall(g, 'wall', -4, 4, 0, 4, wo); wall(g, 'wall', 2, 4, 6, 4, wo);
    // ---------- windows & moonlight ----------
    windowPane(g, 5.93, 1.55, 3.1, 1.0, 1.1, -Math.PI / 2, { lights: true, view: 'view_night_flat' });
    windowPane(g, 5.93, 1.55, 6.9, 1.0, 1.1, -Math.PI / 2, { lights: true, view: 'view_night_flat' });
    windowPane(g, -3.93, 1.55, 3.2, 1.0, 1.1, Math.PI / 2, { lights: true, view: 'view_night_flat' });
    windowPane(g, -2.0, 1.55, 7.93, 1.0, 1.1, Math.PI, { lights: true, view: 'view_night_flat' });
    this.amb = new THREE.AmbientLight(0x6070a0, 0.0); sc.add(this.amb);
    this.moon = new THREE.HemisphereLight(0x5a6c9c, 0x1a1612, 0.0); sc.add(this.moon);
    // ---------- lamps ----------
    this.lamps = {
      myroom: lamp(g, 4, 2.6, 2), hallway: lamp(g, 1, 2.6, 4.2, { intensity: 5 }), pantry: lamp(g, 1, 2.6, -1, { intensity: 3.5 }),
      living: lamp(g, 4, 2.6, 6), kitchen: lamp(g, -2, 2.6, 6), bedroom: lamp(g, -2, 2.6, 2),
    };
    // ---------- furniture ----------
    const desk = place(g, 'studydesk', 5.65, 0, 1.4, -90, { col });
    this.deskChair = place(g, 'studychair', 4.95, 0, 1.35, 90, { col, noisy: true, shrink: 0.08 });
    const bed = place(g, 'bed', 3.3, 0, 0.58, 0, { col });
    place(g, 'mattress', 3.32, 0.22, 0.58, 0);
    place(g, 'bedside', 4.62, 0, 0.3, 0, { col });
    place(g, 'carpet', 3.7, 0.006, 2.4, 0, { scale: 0.75 });
    // hallway
    this.box = place(g, 'box', 1.05, 0, 6.5, 18, { col });
    this.coat = this.makeCoatStand(); this.coat.position.set(1.62, 0, 7.6); g.add(this.coat); col.push({ x0: 1.45, x1: 1.8, z0: 7.45, z1: 7.8 });
    const fb = place(g, 'fusebox', 0.18, 1.15, 7.2, 90); this.fusebox = fb;
    const fdoor = place(g, 'door', 1.0, 0, 7.92, 180); fdoor.scale.set(0.75, 1, 1);
    clockFace(g, 1.93, 2.0, 3.6, -Math.PI / 2);
    // pantry
    place(g, 'cupboard', 1.0, 0, -1.76, 0, { col });
    this.cableBox = place(g, 'box', 0.5, 0, -1.0, 30, { col, scale: 0.65 });
    // living room
    place(g, 'sofa', 4.0, 0, 7.55, 180, { col });
    place(g, 'coffeetable', 4.0, 0, 6.25, 90, { col });
    place(g, 'carpet', 4.0, 0.005, 6.2, 0, { scale: 0.9 });
    place(g, 'bedside', 4.0, 0, 4.28, 0, { col });
    this.tv = place(g, 'tubetv', 4.0, 0.55, 4.3, 0);
    place(g, 'bookshelf', 5.74, 0, 5.0, -90, { col });
    place(g, 'armchair', 2.75, 0, 7.0, 120, { col });
    place(g, 'photoframe', 5.74, 1.8, 5.0, -90, { scale: 0.8 });
    // kitchen
    place(g, 'fridge', -3.5, 0, 4.45, 0, { col });
    place(g, 'ksink', -3.7, 0, 5.55, 90, { col });
    place(g, 'kcabinet', -3.6, 0, 6.4, 90, { col });
    place(g, 'diningtable', -1.5, 0, 6.5, 90, { col });
    place(g, 'diningchair', -1.5, 0, 7.3, 180, { col, noisy: true, shrink: 0.06 });
    place(g, 'diningchair', -1.5, 0, 5.7, 0, { col, noisy: true, shrink: 0.06 });
    // bedroom
    place(g, 'bigbed', -2.9, 0, 2.2, 0, { col });
    place(g, 'bigmattress', -2.88, 0.24, 2.2, 0);
    place(g, 'bedside', -3.72, 0, 0.3, 0, { col });
    this.wardrobe = place(g, 'wardrobe', -1.3, 0, 0.32, 0, { col });
    // ---------- PC build station ----------
    this.buildStation(g);
    // ---------- shadow figure (only ever a silhouette) ----------
    this.shadow = this.makeFigure(); this.shadow.visible = false; g.add(this.shadow);
    this.watcherFig = this.makeFigure(); this.watcherFig.visible = false; g.add(this.watcherFig);
    this.watch = { t: 30, on: false, seen: 0 };
    // ---------- pickups ----------
    const saved0 = epData(1).state;
    this.spotIdx = (saved0 && saved0.spots) || Object.fromEntries(PART_ORDER.map(k => [k, Math.floor(Math.random() * PART_SPOTS[k].spots.length)]));
    this.makePickups(g);
    this.buildThriller(g);
    // ---------- player, flashlight, arms ----------
    const cam = this.G.camera; sc.add(cam);
    this.player = new Player(cam); this.player.boxes = col; this.player.stepVol = 0.3;
    this.player.onBump = b => this.bump();
    this.flash = new THREE.SpotLight(0xfff1d6, 0, 15, 0.5, 0.55, 1.2);
    this.flash.position.set(0.1, -0.1, -0.42); cam.add(this.flash); cam.add(this.flash.target); this.flash.target.position.set(-0.1, -0.25, -5);
    this.fill = new THREE.PointLight(0xc8d0ff, 0.0, 2.2, 1.5); cam.add(this.fill);
    this.buildViewmodel();
    this.it = new Interactor(cam); this.it.blockers = block; this.it.ray.far = 2.3;
    if (!this.noBubu) this.addBubu(g);
    this.addPeephole(g);
    this.setupInteractions();
    // ---------- state ----------
    const saved = epData(1).state;
    this.st = { fitted: [], carrying: null, batt: 1, battsUsed: [], phase: 'intro', noise: 0, mistakes: 0, caught: 0, start: Date.now(), flashOn: false, hasFlash: false };
    if (saved && saved.fitted && saved.fitted.length) Object.assign(this.st, { fitted: saved.fitted.slice(), batt: saved.batt ?? 0.8, battsUsed: saved.battsUsed || [], phase: saved.phase === 'fuse' ? 'fuse' : 'parts', hasFlash: true, mistakes: saved.mistakes || 0, caught: saved.caught || 0, start: Date.now() - (saved.elapsed || 0) });
    if (saved && saved.events) this.st.events = saved.events;
    this.st.events = this.st.events || {};
    this.threat = { active: false, cool: 20 };
    this.scare1 = { armed: false, done: false };
  }

  // A tall human-like silhouette: only ever seen as a black shape, never up close.
  makeFigure() {
    const grp = new THREE.Group(); const m = new THREE.MeshBasicMaterial({ color: 0x010102 });
    const coat = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.27, 1.35, 7), m); coat.position.y = 0.72; grp.add(coat);
    const sh = new THREE.Mesh(new THREE.SphereGeometry(0.21, 7, 4, 0, Math.PI * 2, 0, Math.PI / 2), m); sh.scale.set(1.15, 0.45, 0.75); sh.position.y = 1.4; grp.add(sh);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.12, 5), m); neck.position.y = 1.5; grp.add(neck);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.11, 7, 5), m); head.scale.set(0.9, 1.1, 0.95); head.position.y = 1.66; grp.add(head);
    for (const x of [-0.24, 0.24]) { const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.04, 0.75, 5), m); arm.position.set(x, 1.05, 0); arm.rotation.z = x > 0 ? 0.08 : -0.08; grp.add(arm); }
    grp.traverse(o => { o.frustumCulled = false; });
    return grp;
  }
  // Glimpses: the figure appears at the edge of your vision (or behind you)
  // and is gone the moment your flashlight finds it.
  updateWatcher(dt, opts = {}) {
    const W = this.watch; if (!W) return;
    const cam = this.G.camera, fig = this.watcherFig;
    const fwd = cam.getWorldDirection(new THREE.Vector3()); fwd.y = 0; fwd.normalize();
    const angleTo = p => { const d = new THREE.Vector3(p.x - cam.position.x, 0, p.z - cam.position.z); const dist = d.length(); d.normalize(); return [Math.acos(Math.max(-1, Math.min(1, d.dot(fwd)))) * 180 / Math.PI, dist]; };
    if (W.on) {
      W.life -= dt;
      const [ang, dist] = angleTo(fig.position);
      if (W.mode === 'behind' && !W.revealed) {
        if (ang < 35) { W.revealed = true; W.life = 0.35; play('presence', { vol: 0.35, pos: [fig.position.x, 1.5, fig.position.z] }); }
        else if (W.life < 0) { W.on = false; fig.visible = false; }
        return;
      }
      const beam = this.st.flashOn && this.flash.intensity > 0.5 && ang < 9;
      if (beam || dist < 2.4 || W.life < 0) {
        W.on = false; fig.visible = false;
        if (beam && !this.G.quiet()) play('distort', { vol: 0.25, rate: 1.3 });
        W.seen++;
        if (W.seen === 1) setTimeout(() => caption('…Was someone standing there?', 'say', 3.5), 600);
        if (W.seen === 4) setTimeout(() => caption("Stop it. It's just shadows. It's just shadows.", 'say', 3.5), 600);
      }
      return;
    }
    if (opts.block) return;
    W.t -= dt; if (W.t > 0) return;
    W.t = (opts.min || 30) + Math.random() * (opts.range || 35);
    // pick a spot: mostly at the edge of vision, sometimes right behind you
    const spots = [[0.25, 1.65], [0.25, 5.9], [1.75, 3.05], [1.75, 5.5], [1, 0.4], [1, 7.2], [-3.3, 0.7], [-3.4, 7.4], [5.4, 7.4], [5.5, 0.5], [-0.6, 3.4], [3.0, 4.6], [1, -1.4], [-2.2, 4.6], [4.6, 3.5]];
    const behind = Math.random() < 0.3;
    const ok = spots.map(([x, z]) => { const [a, d] = angleTo({ x, z }); return { x, z, a, d }; }).filter(s => s.d > 3.2 && s.d < 9.5 && (behind ? s.a > 140 : s.a > 16 && s.a < 40) && this.lineOfSight(s.x, s.z));
    if (!ok.length) { W.t = 4; return; }
    const s = ok[(Math.random() * ok.length) | 0];
    fig.position.set(s.x, 0, s.z); fig.lookAt(cam.position.x, 0, cam.position.z); fig.visible = true;
    Object.assign(W, { on: true, mode: behind ? 'behind' : 'edge', revealed: false, life: behind ? 6 : 2.6 });
  }
  lineOfSight(x, z) {
    const cam = this.G.camera; const to = new THREE.Vector3(x, 1.5, z).sub(cam.position); const dist = to.length(); to.normalize();
    const rc = this._los || (this._los = new THREE.Raycaster()); rc.set(cam.position, to); rc.far = dist;
    return rc.intersectObjects(this.block, false).length === 0;
  }
  makeCoatStand(shadow = false) {
    const grp = new THREE.Group();
    const m = shadow ? new THREE.MeshBasicMaterial({ color: 0x020203 }) : psxMat({ color: 0x2b2722 });
    const coatM = shadow ? m : psxMat({ color: 0x23262b });
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 1.85, 5), m); pole.position.y = 0.925; grp.add(pole);
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.25, 0.04, 6), m); foot.position.y = 0.02; grp.add(foot);
    const coat = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.3, 1.15, 6, 1, true), coatM); coat.position.y = 1.15; grp.add(coat);
    const sh = new THREE.Mesh(new THREE.SphereGeometry(0.2, 6, 3, 0, Math.PI * 2, 0, Math.PI / 2), coatM); sh.scale.set(1.15, 0.5, 0.8); sh.position.y = 1.72; grp.add(sh);
    const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.13, 6), m); hat.position.y = 1.93; grp.add(hat);
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.015, 8), m); brim.position.y = 1.87; grp.add(brim);
    if (shadow) { const head = new THREE.Mesh(new THREE.SphereGeometry(0.11, 6, 4), m); head.position.y = 1.83; grp.add(head); }
    return grp;
  }

  boxTexture(color, label) {
    return canvasTex(32, 32, (c, w, h) => { c.fillStyle = color; c.fillRect(0, 0, w, h); c.fillStyle = 'rgba(255,255,255,.85)'; c.fillRect(0, 22, w, 10); c.fillStyle = '#111'; c.font = '16px m5x7'; c.textBaseline = 'top'; c.fillText(label, 2, 20); c.fillStyle = 'rgba(255,255,255,.3)'; c.fillRect(2, 2, 10, 3); });
  }
  makePickups(g) {
    this.pick = {};
    for (const k of PART_ORDER) {
      const P0 = PART_SPOTS[k]; const sp = { ...P0, pos: P0.spots[(this.spotIdx[k] || 0) % P0.spots.length] }; let obj;
      if (k === 'cables') { obj = this.cableBox; }
      else {
        const [w, h, d] = sp.box;
        obj = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), psxMat({ map: this.boxTexture(sp.color, sp.label) }));
        obj.position.set(sp.pos[0], sp.pos[1] + h / 2, sp.pos[2]); obj.rotation.y = Math.random() * 0.8 - 0.4; g.add(obj);
      }
      const glint = new THREE.Mesh(new THREE.OctahedronGeometry(0.022, 0), new THREE.MeshBasicMaterial({ color: 0xfff4c8 }));
      glint.position.set(sp.pos[0], sp.pos[1] + (k === 'cables' ? 0.42 : sp.box[1] + 0.12), sp.pos[2]); g.add(glint);
      this.pick[k] = { obj, glint, home: obj.position.clone() };
      if (sp.hidden) obj.visible = false;
    }
    this.batts = BATTERIES.map((p, i) => { const b = inst('battery'); b.scale.setScalar(1.6); b.position.set(...p); b.rotation.y = i; g.add(b); const gl = new THREE.Mesh(new THREE.OctahedronGeometry(0.025, 0), new THREE.MeshBasicMaterial({ color: 0x9fd8ff })); gl.position.set(p[0], p[1] + 0.1, p[2]); g.add(gl); return { obj: b, glint: gl, i }; });
  }

  buildStation(g) {
    // open PC case on the desk, open side facing the room (-X)
    const cg = this.caseGroup = new THREE.Group(); cg.position.set(5.66, 0.76, 0.98); g.add(cg);
    const metal = psxMat({ color: 0x2a2c31 });
    const side = (w, h, d, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), metal); m.position.set(x, y, z); cg.add(m); return m; };
    side(0.02, 0.46, 0.44, 0.11, 0.23, 0); side(0.22, 0.02, 0.44, 0, 0.45, 0); side(0.22, 0.02, 0.44, 0, 0.01, 0);
    side(0.22, 0.46, 0.02, 0, 0.23, -0.21); side(0.22, 0.46, 0.02, 0, 0.23, 0.21);
    const mb = inst('motherboard'); mb.rotation.z = Math.PI / 2; mb.rotation.y = 0; mb.scale.setScalar(1.15); mb.position.set(0.1, 0.07, -0.17); cg.add(mb);
    const mbFallback = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.3), psxMat({ map: A.tex.electronics, side: THREE.DoubleSide })); mbFallback.rotation.y = -Math.PI / 2; mbFallback.position.set(0.098, 0.25, 0); cg.add(mbFallback);
    // fitted-part visuals
    const pm = c => psxMat({ color: c });
    const P = this.partVis = {
      cpu: new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.045, 0.045), pm(0xb9bec6)),
      cooler: new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.07, 8), pm(0x3a3d44)),
      ram: new THREE.Group(), ssd: new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.02, 0.08), pm(0x151515)),
      gpu: new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.04, 0.26), psxMat({ map: A.tex.electronics2 })),
      psu: new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.08, 0.15), pm(0x24272d)),
      cables: new THREE.Group(),
    };
    P.cpu.position.set(0.095, 0.33, -0.02); P.cooler.rotation.z = Math.PI / 2; P.cooler.position.set(0.06, 0.33, -0.02);
    for (let i = 0; i < 2; i++) { const s = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.12, 0.006), pm(0x2f6dbd)); s.position.set(0.085, 0.33, 0.06 + i * 0.022); P.ram.add(s); }
    P.ssd.position.set(0.094, 0.22, 0.0); P.gpu.position.set(0.04, 0.17, 0.0); P.psu.position.set(0.0, 0.06, 0.0);
    const cm = pm(0xd0d0d0); [[0.05, 0.25, 0.15, 0.2], [0.05, 0.28, -0.1, 0.25]].forEach(([x, y, z, h]) => { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, h, 4), cm); c.position.set(x, y, z); P.cables.add(c); });
    for (const k of PART_ORDER) { P[k].visible = false; cg.add(P[k]); }
    // monitor with webcam
    const mon = this.monitor = new THREE.Group(); mon.position.set(5.78, 0.76, 1.68); g.add(mon);
    const mm = psxMat({ color: 0x1c1d22 });
    const stand = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.02, 0.18), mm); stand.position.y = 0.01; mon.add(stand);
    const neck = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.18, 0.04), mm); neck.position.y = 0.1; mon.add(neck);
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.32, 0.52), mm); body.position.y = 0.34; mon.add(body);
    this.screenTex = canvasTex(128, 80, (c, w, h) => { c.fillStyle = '#000'; c.fillRect(0, 0, w, h); });
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.48, 0.28), new THREE.MeshBasicMaterial({ map: this.screenTex, fog: false })); scr.rotation.y = -Math.PI / 2; scr.position.set(-0.032, 0.34, 0); mon.add(scr);
    const cam = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.03, 0.07), mm); cam.position.set(0, 0.515, 0); mon.add(cam);
    this.camLedM = new THREE.MeshBasicMaterial({ color: 0x220505 }); const led = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.008, 0.008), this.camLedM); led.position.set(-0.024, 0.515, 0.022); mon.add(led);
    this.screenLight = new THREE.PointLight(0x9fc4ff, 0, 2.5, 1.5); this.screenLight.position.set(5.4, 1.1, 1.68); g.add(this.screenLight);
    this.deskObj = this.caseGroup;
  }

  buildViewmodel() {
    const vm = this.vmScene = new THREE.Scene();
    this.vmCam = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.01, 5);
    vm.add(this.vmCam);
    this.vmAmb = new THREE.AmbientLight(0xffffff, 0.3); vm.add(this.vmAmb);
    this.vmKey = new THREE.DirectionalLight(0xfff1d6, 0.0); this.vmKey.position.set(0.3, 0.5, 1); vm.add(this.vmKey);
    // arms: right hand grips the flashlight (knife-grip pose, right-arm bones only),
    // left arm stays down and only reaches in to grab things.
    const arms = A.models.arms;
    this.armsRoot = new THREE.Group(); this.armsRoot.add(arms);
    this.armsRoot.rotation.y = Math.PI; this.armsBase = new THREE.Vector3(-0.12, -1.64, 0.04); this.armsRoot.position.copy(this.armsBase);
    this.vmCam.add(this.armsRoot);
    this.mixer = new THREE.AnimationMixer(arms);
    const anims = A.anims.arms || [];
    const sub = (name, side) => { const c = anims.find(a => a.name === name); if (!c) return null; return new THREE.AnimationClip(name + '_' + side, c.duration, c.tracks.filter(t => { const b = t.name.split('.')[0]; return side === 'R' ? /R$/.test(b) : /L$/.test(b); })); };
    const hold = (clip, frac) => { if (!clip) return null; const a = this.mixer.clipAction(clip); a.play(); a.paused = true; a.time = clip.duration * frac; return a; };
    this.gripR = hold(sub('knife_idle', 'R'), 0.5);
    this.restL = hold(sub('rest', 'L'), 0);
    const g = sub('grab.L', 'L');
    if (g) { this.grabL = this.mixer.clipAction(g); this.grabL.setLoop(THREE.LoopOnce, 1); this.grabL.clampWhenFinished = false; }
    this.mixer.addEventListener('finished', e => { if (e.action === this.grabL) { this.grabL.stop(); if (this.restL) { this.restL.play(); this.restL.paused = true; } this.grabT = 0; } });
    this.lArm = arms.getObjectByName('upper_armL'); this.grabT = 0;
    this.mixer.update(0);
    arms.traverse(o => { if (o.isMesh) { o.frustumCulled = false; if (o.material) o.material.fog = false; } });
    // no visible hands: only the torch floats in view (the skinned arms still drive its sway)
    arms.traverse(o => { if (o.isSkinnedMesh) o.visible = false; });
    floatTorch(this);
    this.sway = { x: 0, y: 0, ly: 0, lp: 0 };
    this.armsRoot.visible = false;
  }

  // Bubu, the old smart teddy, on the bed in your room. It is still switched on (Episode 2 is about it).
  addBubu(g) {
    if (!A.models.teddy) return;
    const bear = this.bubu = inst('teddy'); bear.position.set(3.75, 0.43, 0.45); bear.rotation.y = 0.2; g.add(bear);
    const tint = new THREE.Color(0x9a6a44);
    bear.traverse(o => { if (o.isMesh) { const fix = m => { const n = m.clone(); n.color = m.color.clone().lerp(tint, 0.65); return n; }; o.material = Array.isArray(o.material) ? o.material.map(fix) : fix(o.material); } });
    this.bubuEye = new THREE.MeshBasicMaterial({ color: 0x2a0000, fog: false });
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.012, 5, 4), this.bubuEye); e.position.set(0.035, 0.265, 0.085); bear.add(e);
    const e2 = new THREE.Mesh(new THREE.SphereGeometry(0.012, 5, 4), new THREE.MeshBasicMaterial({ color: 0x050505 })); e2.position.set(-0.035, 0.265, 0.085); bear.add(e2);
  }
  bubuBlink(n = 3) { if (!this.bubuEye) return; let i = 0; const f = () => { this.bubuEye.color.setHex(i % 2 ? 0x2a0000 : 0xff2020); if (++i < n * 2) setTimeout(f, 260); }; f(); }
  // an invisible target on the front door: look through the peephole (kémlelő)
  addPeephole(g) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.9, 0.06), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
    m.position.set(1, 1.0, 7.9); g.add(m); this.peep = m;
  }
  peepImage() {
    if (A.img.ep1_peephole) return A.img.ep1_peephole;
    const c = document.createElement('canvas'); c.width = c.height = 320; const x = c.getContext('2d');
    const gr = x.createRadialGradient(170, 150, 10, 160, 160, 160); gr.addColorStop(0, '#6b5a3a'); gr.addColorStop(0.35, '#2a2620'); gr.addColorStop(1, '#000'); x.fillStyle = gr; x.fillRect(0, 0, 320, 320);
    x.fillStyle = '#0d0c0b'; x.beginPath(); x.ellipse(160, 210, 62, 120, 0, 0, Math.PI * 2); x.fill(); x.beginPath(); x.arc(160, 108, 34, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#ffe9a8'; x.beginPath(); x.arc(196, 190, 9, 0, Math.PI * 2); x.fill();
    return c.toDataURL();
  }
  async usePeephole() {
    const T = this.threat;
    if (!T.active || T.leaving) { play('knob', { vol: 0.2 }); caption('The peephole (kémlelő): the landing outside is dark and empty.', 'say', 3); return; }
    this.playing = false; this.G.unlock(); this.st.peeped = true;
    await cutIn(this.peepImage(), '', 3600, 'peep');
    T.leaving = true; T.leaveAt = T.t; this.st.noise = 0.3;
    caption('Through the peephole: Mrs Kovács from the third floor, in her dressing gown, with a torch. She listens… shakes her head… and goes back upstairs.', 'say', 6);
    this.playing = true; lockPointer();
  }
  setupInteractions() {
    const it = this.it;
    // pickups
    for (const k of PART_ORDER) {
      const p = this.pick[k]; const P = PARTS[k];
      const lab = () => `Pick up: ${P.name} (${P.hu})`;
      if (k === 'gpu') continue;
      p.item = it.add(p.obj, lab, () => this.pickUp(k), () => this.st.phase === 'parts' && !this.st.fitted.includes(k) && this.st.carrying !== k && p.obj.visible);
    }
    it.add(this.wardrobe, () => this.st.carrying ? 'Wardrobe' : 'Open the wardrobe', () => {
      if (this.st.phase !== 'parts' || this.st.fitted.includes('gpu') || this.st.carrying === 'gpu' || this.scare1.done) { play('closet', { vol: 0.5 }); caption('Just clothes. And the smell of mothballs.', 'say', 3); return; }
      play('closet', { vol: 0.8, pos: [-1.3, 1, 0.4] });
      if (this.st.carrying) { caption(`The graphics card box is in here, but your hands are full. Take the ${PARTS[this.st.carrying].name} to your desk first.`, 'say', 4); return; }
      this.pickUp('gpu');
    }, () => this.st.phase === 'parts');
    this.batts.forEach(b => { b.item = it.add(b.obj, 'Pick up a spare battery (elem)', () => this.takeBattery(b), () => this.st.hasFlash && !this.st.battsUsed.includes(b.i)); });
    it.add(this.caseGroup, () => this.stationLabel(), () => this.useStation());
    it.add(this.monitor, () => this.stationLabel(), () => this.useStation());
    it.add(this.box, () => this.st.phase === 'flash' ? 'Open the delivery box' : 'Delivery box (empty)', () => this.openBox(), () => this.st.hasFlash);
    it.add(this.fusebox, () => this.st.phase === 'fuse' ? 'Switch the main switch (főkapcsoló) back on' : 'Fuse box (biztosítéktábla)', () => this.useFuse());
    it.add(this.vela, 'VELA smart speaker (okoshangszóró)', () => this.velaSay(this.st.phase === 'boot' ? 'Goodnight. I\'ll be listening.' : 'Hi! I\'m VELA. I\'m always here when you need me.'));
    it.add(this.landline, () => this.ringing ? 'Answer the phone (vezetékes telefon)' : 'Landline phone (vezetékes telefon)', () => { if (this.ringing) this.answerLandline(); else caption(this.st.events.answered ? 'Dead silence on the line now.' : 'An old wired phone. It works even in a power cut.', 'say', 3); });
    it.add(this.note, 'Read the note', () => this.readNote(), () => this.note.visible);
    it.add(this.peep, () => this.threat.active && !this.threat.leaving ? 'Look through the peephole (kémlelő)' : 'Front door', () => this.usePeephole(), () => !this.st.carrying || this.threat.active);
    if (this.bubu) it.add(this.bubu, 'Bubu, your old smart teddy (okosmaci)', () => { this.bubuBlink(1); caption(this.st.phase === 'lit' ? 'Bubu. You haven\'t played with it in years. Mum says it\'s "still connected to something".' : 'Bubu. Its eye just blinked red. …It\'s still on?', 'say', 4.5); });
    it.add(this.coat, 'Coat stand', () => { caption(this.st.phase === 'done' || this.st.phase === 'boot' ? "Dad's long winter coat. Just a coat." : "A tall coat stand. You'd rather not look at it too long in the dark.", 'say', 3); });
  }

  // ---------------- psychological layer ----------------
  buildThriller(g) {
    // VELA smart speaker on the TV stand: it has a battery, so it keeps listening in the dark
    const v = this.vela = new THREE.Group(); v.position.set(4.36, 0.55, 4.25); g.add(v);
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.055, 0.13, 10), psxMat({ color: 0x2a2c33 })); body.position.y = 0.065; v.add(body);
    this.velaRingM = new THREE.MeshBasicMaterial({ color: 0x06121a });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.042, 0.009, 4, 12), this.velaRingM); ring.rotation.x = Math.PI / 2; ring.position.y = 0.132; v.add(ring);
    this.velaLight = new THREE.PointLight(0x46c8ff, 0, 1.8, 1.5); this.velaLight.position.set(4.36, 0.75, 4.35); g.add(this.velaLight);
    this.velaT = 0;
    // landline phone on a little hallway shelf (a wired phone works in a power cut)
    place(g, 'bedside', 1.74, 0, 1.0, -90, { col: this.col });
    const ph = this.landline = new THREE.Group(); ph.position.set(1.74, 0.55, 1.0); g.add(ph);
    const pm = psxMat({ color: 0x5b1d1a });
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.06, 0.2), pm); base.position.y = 0.03; ph.add(base);
    this.handset = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.22), pm); this.handset.position.set(0, 0.075, 0); ph.add(this.handset);
    this.ringing = false;
    // a note that appears under the front door at the end
    this.note = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.1), psxMat({ color: 0xe8e2d4 })); this.note.rotation.x = -Math.PI / 2; this.note.rotation.z = 0.4; this.note.position.set(0.85, 0.012, 7.7); this.note.visible = false; g.add(this.note);
  }
  velaSay(text, o = {}) {
    play('vela' + (1 + ((Math.random() * 5) | 0)), { vol: o.vol || 0.55, rate: 0.95, pos: [4.36, 0.65, 4.25] });
    caption('VELA (smart speaker): "' + text + '"', 'vela', 4.5);
    this.velaT = 3;
  }
  ringLandline() {
    if (this.ringing) return; this.ringing = true; this.ringT = 0;
    loop('ring', 'phonering', { vol: 0.75, pos: [1.74, 0.7, 1.0] });
    caption('[an old phone is ringing in the hallway]', 'sfx', 5);
  }
  answerLandline() {
    this.ringing = false; this.st.events.answered = true; stopLoop('ring', 0.05); play('pickup', { vol: 0.8 }); this.armPush();
    this.handset.visible = false; this.save();
    const lines = [
      [0.4, '[crackling, a bad line]', 'sfx'],
      [2.0, 'Mum: "…hear me? Your mobile is off, I\'ve been calling for ages—"', 'say'],
      [5.2, 'Mum: "—Mrs Kovács from the third floor rang me, she heard noises from our flat… are you al—"', 'say'],
      [9.0, '[the line hisses… and goes dead]', 'sfx'],
    ];
    for (const [t, l, k] of lines) setTimeout(() => caption(l, k, 4), t * 1000);
    setTimeout(() => { play('hangup', { vol: 0.7 }); this.handset.visible = true; }, 9200);
    setTimeout(() => caption('Noises from our flat? That\'s me. …Isn\'t it?', 'say', 4), 11000);
  }
  storyBeat(n) { // escalation after each fitted part; each happens once per playthrough
    const E = this.st.events; if (E['b' + n]) return; E['b' + n] = true;
    const quiet = this.G.quiet();
    if (n === 2) setTimeout(() => toast('Mum', 'your phone goes straight to voicemail?? Mrs Kovács from the 3rd floor says there\'s banging in our flat. are you ok?? 😟', 10), 3500);
    if (n === 3) setTimeout(() => this.ringLandline(), 5000);
    if (n === 4) { this.deskChair.rotation.y = -Math.PI / 2 + 0.3; E.chairTurned = true; }
    if (n === 5) {
      setTimeout(() => this.velaSay('Motion detected. Front door.'), 3000);
      setTimeout(() => { play('knock', { vol: 0.9, pos: [1, 1, 8.3] }); caption('[three slow knocks at the front door]', 'sfx', 4); }, 6500);
      setTimeout(() => caption('…Nobody knocks at this time of night.', 'say', 4), 9000);
    }
    if (n === 6) setTimeout(() => { if (!this.threat.active && this.st.phase === 'parts') { this.threat.cool = 0; this.st.noise = 1; } }, 9000);
  }
  // ---------------- flow ----------------
  enter() {
    this.playing = false;
    music(null);
    hud(false);
    if (this.st.phase === 'intro') { this.player.set(4.3, 2.4, -90); this.setLights('all', 1); loop('fridge', 'fridgehum', { vol: 0.25, pos: [-3.5, 1, 4.6] }); this.phoneIntro(); }
    else this.resumeFromSave();
  }
  resumeFromSave() {
    this.player.set(4.5, 1.3, -90); this.player.pitch = -0.28;
    this.setLights('all', 0); this.applyRestored();
    this.st.hasFlash = true; this.setFlash(true); this.armsRoot.visible = true;
    if (this.st.events.chairTurned) this.deskChair.rotation.y = -Math.PI / 2 + 0.3;
    for (const k of this.st.fitted) { this.partVis[k].visible = true; this.pick[k].obj.visible = false; this.pick[k].glint.visible = false; }
    for (const b of this.batts) if (this.st.battsUsed.includes(b.i)) { b.obj.visible = false; b.glint.visible = false; }
    this.startPlay();
    this.updateChecklist();
    if (this.st.phase === 'fuse') objective('The power is back outside. Switch on the [[breaker]] in the [[fusebox]] in the hallway.');
    else objective('Find the parts around the flat and fit them in the computer on your desk.');
    caption('Welcome back. Your fitted parts are still in the computer.', 'say', 4);
    music('mus_dark', 0.35);
  }
  startPlay() {
    this.playing = true; hud(true);
    const showStatus = this.st.hasFlash;
    hudParts({ checklist: this.st.phase === 'parts' || this.st.phase === 'fuse', status: showStatus, eye: this.st.phase === 'parts' || this.st.phase === 'fuse' });
    lockPointer();
  }
  phoneIntro() {
    const msgs = [
      ['Mum', 'Working the night shift, back at 7. Dinner\'s in the fridge ❤️'],
      ['ParcelPoint', 'Your parcel has been delivered: 7 items. Left at your door.', true],
      ['Bence', 'did u build it yet?? Ms Varga\'s project is due 8am 😬'],
      ['Bence', 'send a pic when it boots'],
    ];
    const el = openScreen(`<div class="phone"><div class="bar"><span>22:47</span><span>▮▮▮ 21%</span></div><div class="appbar">Messages</div><div class="msgs" id="m"></div><div class="foot"><button class="btn primary hidden" id="ok">Put the phone away</button></div></div>`, 'solid');
    const box = el.querySelector('#m'); let i = 0;
    const next = () => {
      if (i >= msgs.length) { el.querySelector('#ok').classList.remove('hidden'); el.querySelector('#ok').focus(); return; }
      const [w, t, sys] = msgs[i++]; const d = document.createElement('div'); d.className = 'msg' + (sys ? ' sys' : ''); d.innerHTML = `<span class="who">${w}</span>${rich(t)}`; box.appendChild(d); play('beep', { vol: 0.3 });
      setTimeout(next, 1300);
    };
    setTimeout(next, 600);
    el.querySelector('#ok').onclick = () => { closeScreen(el); this.st.phase = 'lit'; this.startPlay(); hudParts({ checklist: false, status: false }); objective('Your new computer parts arrived today. Get the delivery box from the hallway (előszoba).'); caption('Click to look around. W A S D to walk.', 'say', 5); this.litT = 0; };
  }
  powerCut() {
    this.st.phase = 'dark';
    play('switch_off', { vol: 0.6 }); play('rumble', { vol: 0.5 }); stopLoop('fridge', 0.5);
    let n = 0; const fl = setInterval(() => { this.setLights('all', n % 2 ? 0.6 : 0.05); if (++n > 5) { clearInterval(fl); this.setLights('all', 0); } }, 90);
    caption('[click… the lights die. The fridge goes silent.]', 'sfx', 5);
    setTimeout(() => { caption('…Cirmi? Is that you? I\'m scared of the dark, OK? Don\'t tell anyone.', 'say', 4); this.bubuBlink(4); }, 5000);
    setTimeout(() => toast('VárosVill', 'Power cut (áramszünet) in District XIII. Our team is working on it. Sorry for the inconvenience.'), 1800);
    setTimeout(() => this.velaSay('Power outage detected. Running on battery. I\'m still here.'), 7000);
    setTimeout(() => { music('mus_dark', 0.3); if (this.st.phase !== 'dark') return; objective('It\'s dark. Find the [[flashlight]] in your desk drawer (íróasztal fiók).'); caption("Great. Phone's at 2%. The flashlight is in my desk drawer.", 'say', 5); }, 2600);
  }
  takeFlashlight() {
    play('drawer', { vol: 0.7 });
    this.st.hasFlash = true; this.st.phase = 'flash'; this.armsRoot.visible = true; this.setFlash(true); play('switch_on', { vol: 0.5 });
    hudParts({ checklist: false, status: true, eye: false });
    objective('Get the delivery box from the hallway. F switches the flashlight on and off.');
    caption('Got it. The battery won\'t last forever: spare batteries (elem) are somewhere in the flat.', 'say', 5);
  }
  openBox() {
    if (this.st.phase !== 'flash') { caption('Empty. Torn cardboard and some packing foam.', 'say', 2.5); return; }
    play('box', { vol: 0.8 }); this.st.phase = 'parts';
    if (A.img.ep1_intro && !this.st.boxCut) { this.st.boxCut = true; this.playing = false; this.G.unlock(); cutIn(A.img.ep1_intro, '', 3200).then(() => { this.playing = true; lockPointer(); }); }
    caption('The box is torn open… and the parts are gone. Scattered all over the flat?', 'say', 6);
    setTimeout(() => caption('[something scratches behind a door, far away]', 'sfx', 4), 3500);
    setTimeout(() => play('scrape', { vol: 0.35, pos: [1, 1, -1.5] }), 3500);
    objective('Find the 7 parts around the flat and fit each one in the computer on your desk.');
    hudParts({ checklist: true, status: true, eye: true });
    this.updateChecklist(); this.save();
    music('mus_tense', 0.28);
  }
  pickUp(k) {
    if (this.st.carrying) { caption(`Your hands are full. Take the ${PARTS[this.st.carrying].name} to your desk first.`, 'say', 3.5); play('denied', { vol: 0.3 }); return; }
    const p = this.pick[k];
    this.st.carrying = k; p.obj.visible = false; p.glint.visible = false;
    play(k === 'cables' ? 'box' : 'plastic', { vol: 0.7 }); this.armPush();
    carry(`Carrying: ${PARTS[k].name} (${PARTS[k].hu}). Take it to your desk. Q: put it back`);
    if (k === 'gpu') { this.scare1.armed = true; this.scare1.t = 0; caption('The graphics card box, on the shelf behind the clothes. Who puts it in here?', 'say', 4); }
    else caption(`${PARTS[k].name} (${PARTS[k].hu}). Back to the desk.`, 'say', 3);
    this.updateChecklist();
  }
  dropCarried() { // returns the carried part to where it was found
    const k = this.st.carrying; if (!k) return;
    const p = this.pick[k]; this.st.carrying = null; carry('');
    if (k !== 'gpu') { p.obj.visible = true; p.glint.visible = true; }
    this.updateChecklist();
  }
  stationLabel() {
    const k = this.st.carrying;
    if (this.st.phase === 'lit' || this.st.phase === 'intro') return 'Your new computer: the case is open and waiting';
    if (this.st.phase === 'dark') return 'Desk drawer: get the flashlight';
    if (this.st.phase === 'boot') return 'Press the power button';
    if (this.st.phase === 'fuse') return 'The computer is ready, but there\'s no power at this socket';
    if (k) return `Fit the ${PARTS[k].name} (${PARTS[k].hu})`;
    if (this.st.phase === 'parts') return 'Your computer: bring the parts here';
    return 'Your computer';
  }
  useStation() {
    const ph = this.st.phase;
    if (ph === 'dark') return this.takeFlashlight();
    if (ph === 'boot') return this.boot();
    if (ph === 'fuse') { caption('Nothing. The hallway is still dark too: check the fuse box (biztosítéktábla) by the front door.', 'say', 4); return; }
    const k = this.st.carrying;
    if (ph !== 'parts' || !k) { caption(ph === 'parts' ? 'Bring a part here first. The list in the top left shows what\'s missing.' : 'Not yet.', 'say', 3); return; }
    if (k === 'cooler' && !this.st.fitted.includes('cpu')) { caption('The cooler sits on top of the CPU (processzor). Fit the CPU first.', 'say', 4); play('denied', { vol: 0.3 }); return; }
    if (k === 'cables' && this.st.fitted.length < 6) { caption('The cables go in last, when everything else is fitted. Press Q to put them back for now.', 'say', 5); play('denied', { vol: 0.3 }); return; }
    this.G.unlock(); this.inFit = true; this.armPush();
    openFit(k, {
      fitted: this.st.fitted,
      mistake: (kind, msg) => this.mistake(kind),
      done: part => { this.inFit = false; this.fitted(part); lockPointer(); },
      close: () => { this.inFit = false; lockPointer(); },
    });
  }
  mistake(kind) {
    this.st.mistakes++;
    const pos = [5.6, 1.0, 1.0];
    if (kind === 'spark' || kind === 'static') { play(Math.random() < 0.5 ? 'spark1' : 'spark2', { vol: 0.8 }); flash(0.25, 160); this.addNoise(0.45); }
    else { play('clang', { vol: 0.8 }); play('drop', { vol: 0.6 }); this.addNoise(0.35); }
  }
  fitted(k) {
    this.st.fitted.push(k); this.st.carrying = null; carry('');
    this.partVis[k].visible = true;
    const n = this.st.fitted.length;
    this.storyBeat(n);
    if (n <= 6) {
      const room = RESTORE_ORDER[n - 1];
      setTimeout(() => { this.restoreRoom(room, true); toast('VárosVill', `Restoring power: ${n}/6 areas back online.`); }, 900);
    }
    this.updateChecklist(); this.save();
    if (n === 7) {
      this.st.phase = 'fuse';
      setTimeout(() => toast('VárosVill', 'Power is restored in District XIII. Still dark at home? Check your [[fusebox]].', 10), 1500);
      objective('The computer is built! Switch on the [[breaker]] in the [[fusebox]] in the hallway.');
      this.save();
    } else {
      objective(`${7 - n} part${7 - n === 1 ? '' : 's'} to go. Find them around the flat.`);
    }
  }
  restoreRoom(room, sound) {
    if (room === 'windows') { this.moon.intensity = 0.5; caption('[the street lights outside come back on]', 'sfx', 3); return; }
    const L = this.lamps[room]; if (!L) return;
    let n = 0; const iv = setInterval(() => { L.set(n % 2 ? 0.55 : 0.1); if (++n > 6) { clearInterval(iv); L.set(0.55); L.flicker = 0.35; } }, 80);
    if (sound) caption(`[a lamp flickers on ${{ myroom: 'in your room', living: 'in the living room', kitchen: 'in the kitchen', bedroom: 'in your parents\' bedroom', pantry: 'in the pantry' }[room]}]`, 'sfx', 3);
  }
  applyRestored() { const n = Math.min(6, this.st.fitted.length); for (let i = 0; i < n; i++) { const r = RESTORE_ORDER[i]; if (r === 'windows') this.moon.intensity = 0.5; else { this.lamps[r].set(0.55); this.lamps[r].flicker = 0.35; } } }
  setLights(which, v) { for (const [k, L] of Object.entries(this.lamps)) if (which === 'all' || which === k) { L.set(v); L.flicker = 0; } }
  readNote() {
    this.G.unlock();
    const el = openScreen(`<div class="panel" style="width:min(520px,92vw);background:#efe9da;color:#2a241c;font-family:'Segoe Print','Comic Sans MS',cursive">
      <p>Dear neighbours,</p><p>I heard banging and footsteps from your flat in the dark and I got worried. I knocked but nobody answered. Is everything all right? Ring me any time.</p>
      <p>Kovács néni, 3rd floor</p><div class="btns"><button class="btn" id="x" autofocus>Put it down</button></div></div>`);
    el.querySelector('#x').onclick = () => { closeScreen(el); lockPointer(); caption('So those footsteps on the stairs… were Mrs Kovács.', 'say', 5); };
  }
  takeBattery(b) {
    this.st.battsUsed.push(b.i); b.obj.visible = false; b.glint.visible = false;
    this.st.batt = Math.min(1, this.st.batt + 0.45); play('plastic', { vol: 0.5 }); this.armPush();
    caption('Fresh battery (elem). The beam gets brighter.', 'say', 3); this.save();
  }
  useFuse() {
    if (this.st.phase !== 'fuse') { caption(this.st.phase === 'parts' ? 'All the switches are up. The power cut is outside, not here.' : 'The fuse box (biztosítéktábla).', 'say', 3); return; }
    this.st.phase = 'reveal'; this.armPush(); play('latch', { vol: 0.9 });
    const quiet = this.G.quiet();
    const finish = () => {
      this.setLights('all', 1); this.moon.intensity = 0.6; this.lamps.hallway.flicker = 0;
      play('switch_on', { vol: 0.7 }); loop('fridge', 'fridgehum', { vol: 0.25, pos: [-3.5, 1, 4.6] });
      caption('[the whole flat lights up. The fridge hums back to life.]', 'sfx', 4);
      setTimeout(() => caption('…the tall shape by the door is Dad\'s long coat on the coat stand. Just a coat.', 'say', 5), 1500);
      setTimeout(() => { play('meow', { vol: 0.9, pos: [4, 0.3, 7.4] }); caption('[a cat meows under the sofa]', 'sfx', 4); }, 5200);
      this.note.visible = true; setTimeout(() => caption('There\'s a folded note on the floor by the front door.', 'say', 4), 10500);
      setTimeout(() => { loop('purr', 'purr', { vol: 0.5, pos: [4, 0.3, 7.4] }); caption('Cirmi! So YOU dragged the parts all over the flat.', 'say', 5); }, 7000);
      setTimeout(() => { this.st.phase = 'boot'; objective('Read the note by the front door if you like. Then go back to your desk and press the power button.'); hudParts({ checklist: true, status: false }); this.setFlash(false); this.save(); }, 8500);
    };
    if (quiet) { setTimeout(finish, 600); }
    else { // jump scare 2: the hallway bulb pops
      setTimeout(() => { this.lamps.hallway.set(1.6); flash(0.7, 120); play('spark2', { vol: 1 }); play('stinger', { vol: 0.8 }); }, 350);
      setTimeout(() => { this.lamps.hallway.set(0); caption('[POP! The hallway bulb flashes and dies… then the power returns]', 'sfx', 4); }, 520);
      setTimeout(finish, 1700);
    }
  }
  async boot() {
    this.st.phase = 'ending'; this.playing = false; this.G.unlock(); hud(false); stopLoop('purr', 1);
    play('poweron', { vol: 0.8 }); play('fan', { vol: 0.5 });
    music(null, 0, 1);
    const el = openScreen(`<div class="monitor"><div class="cam" id="cam"></div><div id="post"></div></div>`, 'solid');
    const post = el.querySelector('#post');
    const lines = ['NIMBUS BIOS v2.1', '', 'CPU ........ 8 cores  OK', 'Memory ..... 16 GB (dual channel)  OK', 'Storage .... 1 TB SSD  OK', 'Graphics ... OK', 'Cooling .... fan 1200 rpm  OK', '', 'All parts found. Starting the system…'];
    for (const l of lines) { post.innerHTML += (l || '&nbsp;') + '<br>'; play('click', { vol: 0.15 }); await wait(0.35); }
    await wait(0.8);
    post.innerHTML = `<div class="os"><div class="dlg"><h4>Welcome! Let's set up your new computer.</h4>
      <p>For the best experience, allow access to your <b>camera</b> and <b>microphone</b>. Your assistant can then recognise your face and voice.</p>
      <div class="btns"><button class="btn" id="y1">Yes, allow</button><button class="btn" id="y2">Yes, of course</button></div>
      <p style="font-size:.7em;color:#777;margin-top:10px;cursor:pointer" id="later">ask me later</p></div></div>`;
    play('aithink', { vol: 0.5 });
    await new Promise(res => { ['#y1', '#y2', '#later'].forEach(q => post.querySelector(q).onclick = () => res(q)); });
    post.querySelector('.dlg').innerHTML = '<h4>Setting things up…</h4><p>Please keep looking at the screen.</p>';
    await wait(1.4);
    el.querySelector('#cam').classList.add('on'); this.camLedM.color.set(0xff2020); play('beep', { vol: 0.4, rate: 0.7 });
    if (!this.G.quiet()) play('presence', { vol: 0.5 });
    await wait(2.2);
    closeScreen(el);
    await fade(true, 'End of episode 1.\n\nThe little red light next to the camera stays on.', 1.5);
    await wait(2.5);
    this.finishEpisode();
  }
  async finishEpisode() {
    const secs = Math.round((Date.now() - this.st.start) / 1000);
    const d = epData(1); d.done = true; d.state = null; d.best = d.best ? Math.min(d.best, secs) : secs; persist();
    music('mus_debrief', 0.45);
    await fade(false, '', 0.5);
    const r = await debriefScreen(DEBRIEF_EP1, [`Time: ${Math.floor(secs / 60)} min ${secs % 60} s`, `Mistakes: ${this.st.mistakes}`, `Times "something" found you: ${this.st.caught}`], this.G.nextLabel(1));
    await fade(true, '', 0.6);
    if (r === 'next') { await this.G.goNext(1); await fade(false, '', 0.8); return; }
    await this.G.goHub();
    await fade(false, '', 0.8);
  }
  save() {
    const d = epData(1);
    d.state = { spots: this.spotIdx, events: this.st.events, fitted: this.st.fitted.slice(), batt: this.st.batt, battsUsed: this.st.battsUsed.slice(), phase: this.st.phase === 'fuse' ? 'fuse' : 'parts', mistakes: this.st.mistakes, caught: this.st.caught, elapsed: Date.now() - this.st.start };
    if (!this.st.fitted.length && this.st.phase !== 'parts') d.state = null;
    persist();
  }
  updateChecklist() {
    checklist('Your PC', PART_ORDER.map(k => ({ name: PARTS[k].name, hu: PARTS[k].hu, cls: this.st.fitted.includes(k) ? 'done' : this.st.carrying === k ? 'got' : '' })));
  }

  // ---------------- systems ----------------
  setFlash(on) { this.st.flashOn = on && this.st.hasFlash; }
  armPush() { if (!this.grabL) return; if (this.restL) this.restL.stop(); this.grabL.reset(); this.grabL.timeScale = 1.6; this.grabL.play(); this.grabT = this.grabL.getClip().duration / 1.6 + 0.05; }
  addNoise(v) { if (this.st.phase !== 'parts' && this.st.phase !== 'fuse') return; this.st.noise = Math.min(1.05, this.st.noise + v); }
  bump() { if (this._bumpT && this.G.t - this._bumpT < 1.2) return; this._bumpT = this.G.t; play('chair', { vol: 0.6 }); caption('[a chair scrapes loudly]', 'sfx', 2); this.addNoise(0.18); }

  updateThreat(dt) {
    const T = this.threat, st = this.st;
    if (T.cool > 0) T.cool -= dt;
    if (!T.active) {
      if (this.player.running) this.addNoise(0.12 * dt);
      else st.noise = Math.max(0, st.noise - 0.016 * dt);
      if (st.noise > 0.5 && !this._velaHeard) { this._velaHeard = true; this.velaSay(['Sorry, I didn\'t catch that.', 'Did you say something?', 'I\'m listening.'][(Math.random() * 3) | 0]); }
      if (st.noise < 0.3) this._velaHeard = false;
      if (st.noise >= 0.97 && T.cool <= 0 && !this.inFit && st.phase === 'parts' && !this.scare1.active) this.startListen();
      eye(st.noise, st.noise > 0.75);
      return;
    }
    // active listening event
    T.t += dt; eye(1, true);
    const still = !this.st.flashOn && !this.player.moving;
    T.still = still ? T.still + dt : Math.max(0, T.still - dt * 2);
    const p = this.player.pos;
    T.stepT -= dt;
    if (T.stepT <= 0) {
      T.stepT = T.leaving ? 0.8 : 0.85;
      // footsteps walk from the hallway towards the player, stopping ~3 m away
      // the steps come down the stairwell towards your front door, then stop right outside it
      const tgt = T.leaving ? T.exit : T.door;
      const d = tgt.clone().sub(T.pos); const dist = d.length();
      if (dist > 0.05) T.pos.add(d.normalize().multiplyScalar(Math.min(0.7, dist)));
      play('heavy' + (1 + ((Math.random() * 4) | 0)), { vol: T.leaving ? 0.5 : 0.85, rate: 0.75, pos: [T.pos.x, 0.2, T.pos.z] });
    }
    if (T.leaving) { if (T.t > T.leaveAt + 4) { T.active = false; T.cool = 28; objective(this.objBackup); } return; }
    if (T.still >= 6) { T.leaving = true; T.leaveAt = T.t; caption('[the footsteps stop at your door… a long silence… then they slowly go away]', 'sfx', 5); st.noise = 0.35; return; }
    if (T.t > 12) this.caught();
  }
  startListen() {
    const T = this.threat;
    Object.assign(T, { active: true, t: 0, still: 0, stepT: 1.0, leaving: false, pos: new THREE.Vector3(-3, 2.5, 11), door: new THREE.Vector3(1, 0.5, 8.4), exit: new THREE.Vector3(-3, 3, 11) });
    this.objBackup = document.getElementById('objective').innerHTML.replace(/<[^>]+>/g, '');
    objective('Something heard you. Switch off the [[flashlight]] (F) and stand completely still. Or, if you dare, look through the peephole of the front door (E).');
    caption('[slow, heavy footsteps… coming down towards your door]', 'sfx', 5);
    play('distort', { vol: 0.5 });
    this.flickerT = 1.2;
  }
  async caught() {
    const T = this.threat; T.active = false; T.cool = 25;
    this.st.caught++; this.playing = false; this.G.unlock();
    play('presence', { vol: 0.7 });
    play('knock', { vol: 0.9, pos: [1, 1, 8.3] });
    await fade(true, 'Three slow knocks on the front door.\nThe door handle moves… then stops.\nYou run back to your room and hide behind the desk until the steps go away.', 1.2);
    this._droppedName = this.st.carrying ? PARTS[this.st.carrying].name : null; this.dropCarried();
    this.st.noise = 0.2; this.st.batt = Math.max(0.15, this.st.batt - 0.15);
    this.player.set(4.6, 1.4, -90);
    await wait(2.8);
    objective(this.objBackup || 'Find the parts around the flat and fit them in the computer on your desk.');
    caption(this._droppedName ? `In the panic you dropped the ${this._droppedName}. It's back where you found it. Move quietly: no running, no forcing.` : 'Move quietly: no running, no forcing.', 'say', 6);
    await fade(false, '', 1);
    this.playing = true; lockPointer();
  }
  updateScare1(dt) {
    const s = this.scare1; if (!s.armed || s.done) return;
    s.t += dt;
    if (s.t > 12) { s.done = true; s.armed = false; return; }
    if (s.t < 1.2) return;
    const door = new THREE.Vector3(0.25, 1.4, 1.65);
    const cam = this.G.camera; const dir = cam.getWorldDirection(new THREE.Vector3());
    const to = door.clone().sub(cam.position); const dist = to.length(); to.normalize();
    if (dir.dot(to) > 0.9 && dist < 4.5) {
      s.done = true; s.armed = false; s.active = true;
      if (this.G.quiet()) {
        play('thump', { vol: 0.7, pos: [1, 1, 2] }); play('door_close', { vol: 0.5, pos: [1, 1, 3] }); caption('[a door closes somewhere in the flat]', 'sfx', 3);
        s.active = false; return;
      }
      this.shadow.position.set(0.4, 0, 1.65); this.shadow.rotation.y = -Math.PI / 2; this.shadow.visible = true;
      play('stinger', { vol: 1 }); this.flickerT = 0; this.forceDark = 1.6;
      setTimeout(() => { this.shadow.visible = false; }, 420);
      setTimeout(() => { caption('[…was something standing in the doorway?]', 'sfx', 4); s.active = false; }, 1700);
    }
  }

  // arms: bob while walking, lag behind mouse movement, grab animation
  updateArms(dt, t) {
    if (this.armsRoot.visible) {
      const P = this.player, sw = this.sway;
      let dy = P.yaw - sw.ly; if (dy > Math.PI) dy -= Math.PI * 2; if (dy < -Math.PI) dy += Math.PI * 2;
      const dp = P.pitch - sw.lp; sw.ly = P.yaw; sw.lp = P.pitch;
      sw.x += (Math.max(-0.12, Math.min(0.12, dy * 2.2)) - sw.x) * Math.min(1, dt * 8);
      sw.y += (Math.max(-0.1, Math.min(0.1, dp * 2.2)) - sw.y) * Math.min(1, dt * 8);
      const bx = P.moving ? Math.cos(P.bob * 0.5) * 0.012 : 0, by = P.moving ? Math.abs(Math.sin(P.bob * 0.5)) * 0.014 : Math.sin(t * 1.3) * 0.004;
      this.armsRoot.position.set(this.armsBase.x + bx + sw.x * 0.25, this.armsBase.y - by - sw.y * 0.2, this.armsBase.z);
      this.armsRoot.rotation.set(-sw.y * 0.6, Math.PI + sw.x * 0.6, 0);
      if (this.grabT > 0) { this.armsRoot.position.y -= 0.035; this.armsRoot.rotation.x += 0.12; }
      swayTorch(this);
      this.mixer.update(dt);
      if (this.grabT > 0) this.grabT -= dt;
      if (this.lArm) this.lArm.scale.setScalar(this.grabT > 0 ? 1 : 0.001);
      this.lens.material.color.setScalar(this.flash.intensity > 0.5 ? 1 : 0.15);
    }
  }
  update(dt, t) {
    for (const L of Object.values(this.lamps)) L.update(t);
    if (!this.playing) return;
    const st = this.st;
    this.player.update(dt);
    if (wasPressed('KeyQ') && st.carrying && !this.threat.active) { const k = st.carrying; this.dropCarried(); play('plastic', { vol: 0.5 }); this.armPush(); caption(`You put the ${PARTS[k].name} back where you found it.`, 'say', 3); }
    // flashlight
    if (wasPressed('KeyF') && st.hasFlash) { this.setFlash(!st.flashOn); play('click', { vol: 0.4 }); }
    if (st.flashOn) st.batt = Math.max(0, st.batt - dt * 0.003);
    battery(st.batt);
    if (st.batt < 0.2 && !this._lowWarned) { this._lowWarned = true; caption('The flashlight is getting weak. Look for spare batteries (elem).', 'say', 4); }
    let fI = st.flashOn ? (st.batt > 0 ? 9 * (0.35 + 0.65 * Math.min(1, st.batt * 2.5)) : 1.2) : 0;
    if (this.flickerT > 0) { this.flickerT -= dt; fI *= Math.random() < 0.5 ? 0.15 : 1; }
    if (this.forceDark > 0) { this.forceDark -= dt; fI = 0; }
    if (st.batt <= 0 && st.flashOn) fI *= Math.random() < 0.1 ? 0.3 : 1;
    this.flash.intensity = fI; this.vmKey.intensity = fI > 0 ? 1.2 : 0.0;
    const lit = Object.values(this.lamps).reduce((a, L) => a + L.light.intensity, 0);
    this.vmAmb.intensity = 0.12 + Math.min(0.6, lit * 0.04) + (fI > 0 ? 0.2 : 0);
    this.fill.intensity = st.phase === 'intro' || st.phase === 'lit' ? 0 : 0.35;
    this.amb.intensity = 0.16; this.moon.intensity = Math.max(this.moon.intensity, 0.25);
    this.updateArms(dt, t);
    // phase logic
    if (st.phase === 'lit') { this.litT += dt; const p = this.player.pos; if (this.litT > 25 || (p.x < 2.3 && this.litT > 2)) this.powerCut(); }
    if (st.phase === 'parts' || st.phase === 'fuse') { this.updateThreat(dt); this.updateScare1(dt); }
    if (st.phase === 'parts' || st.phase === 'flash') { const n = st.fitted.length; this.updateWatcher(dt, { block: this.threat.active || this.scare1.active || this.inFit, min: n >= 3 ? 20 : 32, range: n >= 3 ? 25 : 35 }); }
    // VELA ring: dim blue on battery, pulses while talking
    if (st.phase !== 'intro' && st.phase !== 'lit') {
      this.velaT = Math.max(0, this.velaT - dt);
      const v = this.velaT > 0 ? 0.6 + Math.sin(t * 14) * 0.4 : 0.12 + Math.sin(t * 1.5) * 0.06;
      this.velaRingM.color.setRGB(0.15 * v, 0.7 * v, 1.0 * v); this.velaLight.intensity = this.velaT > 0 ? 0.9 * v : 0.12;
    }
    if (this.ringing) { this.ringT += dt; if (this.ringT > 28) { this.ringing = false; stopLoop('ring', 0.2); setTimeout(() => toast('Mum', 'pick up the landline!! 📞', 8), 2000); } }
    if (st.events.chairTurned && !st.events.chairSeen && this.player.pos.distanceTo(STATION) < 2.4) {
      st.events.chairSeen = true; play('squeak', { vol: 0.7, pos: [4.95, 0.5, 1.35] });
      caption('[the desk chair creaks… it\'s turned towards the door now]', 'sfx', 4);
      setTimeout(() => caption('I didn\'t move that.', 'say', 3), 2500);
    }
    // glints: only close up and in the flashlight beam (or a lit room)
    const gl = 0.6 + Math.sin(t * 4) * 0.4;
    const cam = this.G.camera, fwd = cam.getWorldDirection(this._fw || (this._fw = new THREE.Vector3()));
    const seen = (p) => { const d = this._tv || (this._tv = new THREE.Vector3()); d.copy(p).sub(cam.position); const dist = d.length(); if (dist > 3.6) return false; d.normalize(); return st.flashOn && this.flash.intensity > 0.5 ? d.dot(fwd) > 0.86 : false; };
    for (const k of PART_ORDER) { const p = this.pick[k]; p.glint.rotation.y = t * 2; p.glint.scale.setScalar(gl); p.glint.visible = st.phase === 'parts' && !st.fitted.includes(k) && st.carrying !== k && k !== 'gpu' && seen(p.glint.position); }
    for (const b of this.batts) { b.glint.rotation.y = t * 2; b.glint.visible = st.hasFlash && !st.battsUsed.includes(b.i) && seen(b.glint.position); }
    // monitor glow in final phase
    if (st.phase === 'boot') { const c = this.screenTex.userData.g; c.fillStyle = '#05070b'; c.fillRect(0, 0, 128, 80); c.fillStyle = Math.sin(t * 4) > 0 ? '#8fe3c9' : '#05070b'; c.fillRect(8, 64, 6, 6); c.fillStyle = '#9fb'; c.font = '16px m5x7'; c.fillText('PRESS POWER', 20, 72); this.screenTex.needsUpdate = true; this.screenLight.intensity = 0.6; }
    // interaction
    const cur = this.it.update();
    prompt(cur && !this.threat.active ? this.it.label() : null);
    if (cur && wasPressed('KeyE') && !this.threat.active) cur.use();
  }
  vmRender(renderer) {
    if (!this.armsRoot.visible || !this.playing) return;
    this.vmCam.aspect = this.G.camera.aspect; this.vmCam.updateProjectionMatrix();
    renderer.autoClear = false; renderer.clearDepth(); renderer.render(this.vmScene, this.vmCam); renderer.autoClear = true;
  }
  resume() { lockPointer(); }
  quit() { this.save(); this.playing = false; this.G.goHub(); }
  exit() { this.playing = false; stopLoop('fridge'); stopLoop('purr'); stopLoop('ring'); prompt(null); this.G.camera.remove(this.flash); this.G.camera.remove(this.fill); this.G.camera.remove(this.flash.target); }
}
