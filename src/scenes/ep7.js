// Episode 4 in play order (internal id 7): "Kamerák" (Cameras).
// A shopping centre after closing. A face-recognition system has "matched" you to a theft.
import * as THREE from 'three';
import { A, inst } from '../core/assets.js';
import { psxMat } from '../core/render.js';
import { texBox, plane, wall, canvasTex, place, colliderFor, pxText } from '../core/world.js';
import { wasPressed, lockPointer, IN } from '../core/player.js';
import { hud, hudParts, objective, prompt, caption, fade, flash, checklist, eye, wait } from '../core/hud.js';
import { music, loop, stopLoop, play } from '../core/audio.js';
import { S, epData, persist } from '../core/state.js';
import { DEBRIEF_EP7, rich, epPos } from '../text.js';
import { openScreen, closeScreen, debriefScreen } from '../ui/screens.js';
import { NPC, Graph } from '../core/npc.js';
import { Walker } from './walker.js';

const D2R = Math.PI / 180;
const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// cameras: position, look-at point, sweep half-angle (deg), sweep period (s), range (m)
const CAMS = [
  { id: 'C1', name: 'Atrium west', p: [-13.6, 3.4, -5.6], at: [-6, -3], sweep: 24, per: 9, range: 12.5 },
  { id: 'C2', name: 'Atrium south', p: [-3, 3.4, 5.6], at: [-3, -3], sweep: 50, per: 11, range: 10.5 },
  { id: 'C3', name: 'Atrium east', p: [4, 3.4, -5.6], at: [4, 3], sweep: 50, per: 10, range: 10.5 },
  { id: 'C4', name: 'Food court', p: [17.6, 3.2, -5.6], at: [11, 1.5], sweep: 28, per: 8, range: 12 },
  { id: 'C5', name: 'Food court south', p: [7, 3.2, 5.6], at: [11, -2], sweep: 38, per: 12, range: 10 },
  { id: 'C6', name: 'Staff corridor west', p: [-9.7, 2.6, -12], at: [0, -12], sweep: 0, per: 1, range: 8 },
  { id: 'C7', name: 'Staff corridor east', p: [13.6, 2.6, -12.8], at: [4, -12], sweep: 12, per: 7, range: 8.5 },
];
const NODES = {
  ent: [-12, 0], a1: [-8, 0], a2: [-4, 0], a3: [0, 0], a4: [4, 0], dvf: [-7, -4.6], dvi: [-7, -8.5], dvb: [-7, -12],
  f1: [8, 0], f2: [11, 0], f3: [12, 3.2], f4: [12, -4], p1: [12, -8.5], c5: [12, -12], c4: [8, -12], c3: [4, -12], c2: [0, -12], c1: [-4, -12],
  sec: [16, -12], cup: [5, -14.2],
};
const EDGES = [['ent', 'a1'], ['a1', 'a2'], ['a2', 'a3'], ['a3', 'a4'], ['a4', 'f1'], ['f1', 'f2'], ['f2', 'f3'], ['f2', 'f4'], ['f4', 'p1'], ['p1', 'c5'], ['c5', 'c4'], ['c4', 'c3'], ['c3', 'c2'], ['c2', 'c1'], ['c1', 'dvb'], ['dvb', 'dvi'], ['dvi', 'dvf'], ['dvf', 'a1'], ['dvf', 'a2'], ['c5', 'sec'], ['c3', 'cup']];
const PATROL = ['sec', 'c5', 'p1', 'f4', 'f2', 'f1', 'a4', 'a3', 'a2', 'a1', 'a2', 'a3', 'a4', 'f1', 'f3', 'f2', 'f4', 'p1', 'c5', 'c4', 'c3', 'c2', 'c1', 'c2', 'c3', 'c4', 'c5', 'sec'];
const CHECKPOINTS = { start: [-12.6, 4.3, -90], food: [8, 0, -90], passage: [12, -8.5, 180] };

export class Ep7 extends Walker {
  constructor(G) { super(G); this.epN = 7; }

  async build() {
    const g = this.newScene(0x040508, 4, 22);
    const col = this.col, block = this.block, W = { col, block };
    // ---------- floors & ceilings ----------
    plane(g, 'terrazzo', -14, -6, 18, 6, 0, { tile: 2 });
    plane(g, 'vct', -10, -11, 6, -6, 0, { tile: 2, color: 0x9a948a });
    plane(g, 'terrazzo', -10, 6, 6, 11, 0, { tile: 2 });
    plane(g, 'concrete', -10, -13, 14, -11, 0, { tile: 2 });
    plane(g, 'concrete', 11, -11, 13, -6, 0, { tile: 2 });
    plane(g, 'concrete', 3.5, -15.5, 6.5, -13, 0, { tile: 2 });
    plane(g, 'vct', 14, -16, 19, -9, 0, { tile: 2 });
    plane(g, 'ceil_tile', -14, -6, 6, 6, 5, { tile: 2, ceiling: true, color: 0x5a5e66 });
    plane(g, 'ceil_tile', 6, -6, 18, 6, 4, { tile: 2, ceiling: true, color: 0x6a6e76 });
    plane(g, 'ceil_tile', -10, -16, 19, -6, 3, { tile: 2, ceiling: true, color: 0x6a6e76 });
    // ---------- walls ----------
    const sh = { ...W, h: 5, tile: 2 };
    wall(g, 'plaster_c', -14, -6, -14, 6, { ...sh, color: 0x8a8f99 });                       // entrance wall
    wall(g, 'plaster_c', -14, -6, 6, -6, { ...sh, color: 0x9aa0aa, gaps: [[-8.5, -5.5, 2.6]] }); // north shopfronts
    wall(g, 'plaster_c', -14, 6, 18, 6, { ...sh, color: 0x9aa0aa });                         // south shopfronts + food court
    wall(g, 'plaster_c', 6, -6, 18, -6, { ...W, h: 4, tile: 2, color: 0x9aa0aa, gaps: [[11, 13, 2.4]] });
    wall(g, 'plaster_c', 18, -6, 18, 6, { ...W, h: 4, tile: 2, color: 0x8a8f99 });
    // north shops: separators + back wall (also the corridor's south wall)
    for (const x of [-10, -4, 1]) wall(g, 'plaster_c', x, -11, x, -6, { ...W, h: 3, tile: 2, color: 0x7d828c });
    wall(g, 'plaster_c', 6, -11, 6, -6, { ...W, h: 3, tile: 2, color: 0x7d828c });
    wall(g, 'corridor', -10, -11, 14, -11, { ...W, h: 3, tile: 2, gaps: [[-7.5, -6.5, 2.2], [11, 13, 2.6]] });
    wall(g, 'corridor', -10, -13, 14, -13, { ...W, h: 3, tile: 2, gaps: [[4.4, 5.6, 2.2]] });
    wall(g, 'corridor', -10, -13, -10, -11, { ...W, h: 3, tile: 2 });
    wall(g, 'corridor', 11, -11, 11, -6, { ...W, h: 3, tile: 2 }); wall(g, 'corridor', 13, -11, 13, -6, { ...W, h: 3, tile: 2 });
    wall(g, 'corridor', 3.5, -15.5, 6.5, -15.5, { ...W, h: 3 }); wall(g, 'corridor', 3.5, -15.5, 3.5, -13, { ...W, h: 3 }); wall(g, 'corridor', 6.5, -15.5, 6.5, -13, { ...W, h: 3 });
    // security room
    wall(g, 'corridor', 14, -16, 19, -16, { ...W, h: 3 }); wall(g, 'corridor', 19, -16, 19, -9, { ...W, h: 3 }); wall(g, 'corridor', 14, -9, 19, -9, { ...W, h: 3 });
    wall(g, 'corridor', 14, -16, 14, -9, { ...W, h: 3, gaps: [[-12.6, -11.4, 2.2]] });
    // closed shops: shutters as textured panels just inside the shopfront line
    const shutterTex = canvasTex(64, 64, (c, w, h) => { c.fillStyle = '#5d636c'; c.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 4) { c.fillStyle = '#474c54'; c.fillRect(0, y, w, 1); c.fillStyle = '#737a84'; c.fillRect(0, y + 1, w, 1); } });
    shutterTex.wrapS = shutterTex.wrapT = THREE.RepeatWrapping;
    const shopSign = (x, z, rot, name, color) => {
      const t = canvasTex(128, 24, (c, w, h) => { c.fillStyle = '#0c0c10'; c.fillRect(0, 0, w, h); c.fillStyle = color; c.font = '16px m5x7'; c.textBaseline = 'top'; pxText(c, name, 6, 4, 16); });
      const m = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 0.6), new THREE.MeshBasicMaterial({ map: t, fog: true, color: 0x666666 })); m.position.set(x, 3.1, z); m.rotation.y = rot; g.add(m); return m;
    };
    const shutter = (x0, x1, z, rot) => {
      const w = x1 - x0; const st = shutterTex.clone(); st.needsUpdate = true; st.repeat.set(w / 1.5, 2.6 / 1.5);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, 2.6), psxMat({ map: st })); m.position.set((x0 + x1) / 2, 1.3, z); m.rotation.y = rot; g.add(m);
    };
    shopSign(-7, -5.93, 0, 'DIVAT · fashion', '#f0c0d8'); shopSign(-1.5, -5.93, 0, 'KÖNYVES · books', '#cde'); shopSign(3.5, -5.93, 0, 'PATIKA · pharmacy', '#9fe6b0');
    shutter(-3.6, 0.6, -5.92, 0); shutter(1.4, 5.6, -5.92, 0);
    shopSign(-7, 5.93, Math.PI, 'VOLTA · electronics', '#9fd8ff'); shopSign(-1.5, 5.93, Math.PI, 'CIPŐ · shoes', '#ffd27a'); shopSign(3.5, 5.93, Math.PI, 'MOZI · cinema', '#ff9f8a');
    shutter(-9.6, -4.4, 5.92, Math.PI); shutter(-3.6, 0.6, 5.92, Math.PI); shutter(1.4, 5.6, 5.92, Math.PI);
    // police tape across VOLTA
    const tape = canvasTex(64, 8, (c, w, h) => { for (let x = 0; x < w; x += 16) { c.fillStyle = '#f2d24b'; c.fillRect(x, 0, 8, h); c.fillStyle = '#111'; c.fillRect(x + 8, 0, 8, h); } });
    tape.wrapS = THREE.RepeatWrapping; tape.repeat.set(4, 1);
    for (const y of [1.0, 1.25]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 0.08), new THREE.MeshBasicMaterial({ map: tape })); m.position.set(-7, y, 5.85); m.rotation.y = Math.PI; m.rotation.z = (y - 1.1) * 0.3; g.add(m); }
    // DIVAT half-raised shutter above the opening
    shutter(-8.5, -5.5, -5.9, 0); g.children[g.children.length - 1].position.y = 3.6; g.children[g.children.length - 1].scale.y = 0.5;
    // entrance: glass doors with the street outside + a closed shutter in front
    const street = canvasTex(128, 64, (c, w, h) => { c.fillStyle = '#05070c'; c.fillRect(0, 0, w, h); c.fillStyle = '#1a1c22'; c.fillRect(0, 44, w, 20); for (const x of [20, 90]) { c.fillStyle = '#ffb469'; c.fillRect(x, 8, 3, 3); c.fillStyle = 'rgba(255,180,105,.12)'; c.beginPath(); c.arc(x + 1, 10, 18, 0, 7); c.fill(); c.fillStyle = '#333'; c.fillRect(x + 1, 11, 1, 34); } c.fillStyle = '#c03'; c.fillRect(60, 40, 10, 4); c.fillStyle = 'rgba(255,255,255,.5)'; c.fillRect(56, 38, 3, 3); });
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 2.6), new THREE.MeshBasicMaterial({ map: street, fog: false })); glass.position.set(-13.92, 1.3, 0); glass.rotation.y = Math.PI / 2; g.add(glass);
    const grille = canvasTex(32, 32, (c, w, h) => { c.clearRect(0, 0, w, h); c.fillStyle = '#4a4f57'; for (let i = 0; i < w; i += 4) { c.fillRect(i, 0, 1, h); c.fillRect(0, i, w, 1); } });
    grille.wrapS = grille.wrapT = THREE.RepeatWrapping; grille.repeat.set(10, 6);
    const gm = new THREE.Mesh(new THREE.PlaneGeometry(4.8, 2.8), new THREE.MeshBasicMaterial({ map: grille, transparent: true, alphaTest: 0.5 })); gm.position.set(-13.75, 1.4, 0); gm.rotation.y = Math.PI / 2; g.add(gm);
    this.exitSign = place(g, 'sk_exit_sign', -13.4, 1.9, 0, 90);
    // pillars and big screens
    for (const [x, z] of [[-9, -2.5], [-9, 2.5], [-2, -2.5], [-2, 2.5], [3, -2.5], [3, 2.5]]) texBox(g, 'plaster_c', x - 0.35, 0, z - 0.35, x + 0.35, 5, z + 0.35, { col, block, color: 0x8d929c });
    this.screenTex = canvasTex(160, 96, () => { });
    const scrMat = new THREE.MeshBasicMaterial({ map: this.screenTex, fog: false, side: THREE.DoubleSide });
    this.screens = [];
    for (const [x, z] of [[-5.5, 0], [0.5, 0]]) {
      const frame = texBox(g, null, x - 1.25, 2.05, z - 0.08, x + 1.25, 3.55, z + 0.08, { color: 0x111216 });
      for (const r of [0, Math.PI]) { const s = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 1.36), scrMat); s.position.set(x, 2.8, z + (r ? -0.09 : 0.09)); s.rotation.y = r; g.add(s); }
      const L = new THREE.PointLight(0x9fc4ff, 0.6, 6, 1.6); L.position.set(x, 2.5, z); g.add(L); this.screens.push(L);
      const pole = texBox(g, null, x - 0.05, 3.55, z - 0.05, x + 0.05, 5, z + 0.05, { color: 0x222 });
    }
    { const s = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.96), scrMat); s.position.set(13.4, 3.0, 4); s.rotation.y = -Math.PI / 2; g.add(s); const L = new THREE.PointLight(0x9fc4ff, 0.4, 4, 1.6); L.position.set(13, 2.8, 4); g.add(L); this.screens.push(L); }
    // atrium dressing
    texBox(g, 'brick', -6.2, 0, -1.0, -4.8, 0.5, 1.0, { col, block, color: 0x8a7a6a });    // planter
    place(g, 'sk_plant_dead', -5.5, 0.5, 0, 0);
    place(g, 'sk_bench', -11, 0, 4.3, 0, { col }); place(g, 'sk_bench', 0.5, 0, -4.3, 180, { col });
    place(g, 'sk_trash_can', -10.5, 0, -4.8, 0, { col }); place(g, 'sk_trash_can', 4.5, 0, 4.8, 0, { col });
    place(g, 'sk_wet_floor_sign', -1.2, 0, 1.5, 30); place(g, 'sk_drinking_fountain', -13.6, 0, 4.5, 90, { col });
    place(g, 'sk_notice_board', -13.94, 0, -3.4, 90);
    // food court
    for (const [x, z] of [[8.5, -3], [8.5, 2.5], [11, -1], [15.5, -3], [15.5, 0]]) place(g, 'sk_cafeteria_table', x, 0, z, 0, { col, shrink: 0.15 });
    for (const [x, z, r] of [[17.6, -1.2, -90], [17.6, 0.2, -90]]) { place(g, 'sk_vending_machine', x, 0, z, r, { col }); const L = new THREE.PointLight(0xff8a7a, 0.7, 3.5, 1.6); L.position.set(x - 0.8, 1.4, z); g.add(L); }
    place(g, 'sk_waiting_chairs', 7.5, 0, 5.5, 180, { col });
    // lost-and-found kiosk
    texBox(g, 'plaster_c', 13.5, 0, 2.5, 13.7, 2.6, 3.3, { col, block, color: 0xa08a6a });
    texBox(g, 'plaster_c', 13.5, 0, 4.7, 13.7, 2.6, 5.9, { col, block, color: 0xa08a6a });
    texBox(g, 'plaster_c', 13.5, 0, 3.3, 13.7, 0.95, 4.7, { col, block, color: 0xa08a6a });
    texBox(g, 'plaster_c', 13.5, 2.1, 3.3, 13.7, 2.6, 4.7, { block, color: 0xa08a6a });
    texBox(g, 'plaster_c', 13.5, 0, 2.5, 18, 2.6, 2.7, { col, block, color: 0xa08a6a });
    texBox(g, null, 13.4, 2.6, 2.4, 17.9, 2.7, 6, { color: 0x3a2a22 });
    const kt = canvasTex(128, 20, (c) => { c.fillStyle = '#2a1d12'; c.fillRect(0, 0, 128, 20); pxText(c, 'TALÁLT TÁRGYAK · lost & found', 4, 2, 16); });
    const ks = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.4), new THREE.MeshBasicMaterial({ map: kt, color: 0x888888 })); ks.position.set(13.38, 2.35, 4.1); ks.rotation.y = -Math.PI / 2; g.add(ks);
    place(g, 'sk_cubbies', 17.95, 0, 4.1, -90); place(g, 'sk_umbrella', 16.9, 0, 5.3, 0); place(g, 'sk_backpack', 16.8, 0, 3.2, 40);
    this.kioskShutter = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.15), psxMat({ map: shutterTex })); this.kioskShutter.position.set(13.45, 1.52, 4.0); this.kioskShutter.rotation.y = -Math.PI / 2; g.add(this.kioskShutter);
    this.phoneObj = new THREE.Group(); { const b = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.012, 0.16), psxMat({ color: 0x1b1c22 })); b.position.y = 0.006; this.phoneObj.add(b); const s = new THREE.Mesh(new THREE.PlaneGeometry(0.065, 0.13), new THREE.MeshBasicMaterial({ color: 0x223355 })); s.rotation.x = -Math.PI / 2; s.position.y = 0.013; this.phoneObj.add(s); }
    this.phoneObj.position.set(13.95, 0.97, 4.0); this.phoneObj.rotation.y = 0.4; g.add(this.phoneObj);
    texBox(g, null, 13.7, 0.93, 3.3, 14.3, 0.97, 4.7, { color: 0x6a5240 });
    // staff door sign
    const sd = canvasTex(96, 16, c => { c.fillStyle = '#ddd'; c.fillRect(0, 0, 96, 16); c.fillStyle = '#a00'; pxText(c, 'SZEMÉLYZET · staff', 3, 0, 16); });
    const sds = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.27), new THREE.MeshBasicMaterial({ map: sd, color: 0x777777 })); sds.position.set(12, 2.6, -5.93); g.add(sds);
    // DIVAT interior: racks, counter, mannequins
    texBox(g, 'wood_dark', -9.6, 0, -10.6, -8.2, 1.0, -9.8, { col, block });
    for (const z of [-9.3, -7.6]) { texBox(g, null, -5.2, 1.5, z - 0.6, -5.1, 1.55, z + 0.6, { color: 0x888 }); for (let i = 0; i < 5; i++) texBox(g, null, -5.25, 0.7, z - 0.5 + i * 0.25, -5.05, 1.5, z - 0.4 + i * 0.25, { color: [0x5a2d3a, 0x2d3a5a, 0x3a5a2d, 0x5a4a2d, 0x333][i] }); col.push({ x0: -5.4, x1: -4.9, z0: z - 0.65, z1: z + 0.65 }); }
    this.mannequins = [];
    const mspots = [[-9, -7.2, 160], [-8.2, -8.6, 120], [-6.4, -9.8, 200], [-6.6, -7.5, 30], [-9.2, -9.3, 90], [-5.9, -6.6, 180]];
    mspots.forEach(([x, z, r], i) => {
      const m = new NPC(i % 2 ? 'npc_mannequin2' : 'npc_mannequin'); m.obj.position.set(x, 0.05, z); m.obj.rotation.y = r * D2R; m.facing = r * D2R;
      m.pose(['Idle_Loop', 'Interact', 'Idle_Talking_Loop'][i % 3], [0.1, 0.45, 0.6][i % 3]); g.add(m.obj); this.mannequins.push(m);
      texBox(g, null, x - 0.3, 0, z - 0.3, x + 0.3, 0.05, z + 0.3, { color: 0x2a2a2e }); col.push({ x0: x - 0.25, x1: x + 0.25, z0: z - 0.25, z1: z + 0.25 });
    });
    this.wanderer = new NPC('npc_mannequin'); this.wanderer.pose('Interact', 0.3); this.wanderer.obj.visible = false; g.add(this.wanderer.obj);
    // corridor clutter (cover from the corridor cameras)
    for (const [x, z] of [[-3, -12.6], [1.5, -11.45], [2.8, -12.6], [8.5, -12.6], [9.8, -11.45]]) { const b = place(g, 'sk_box_stack', x, 0, z, (x * 37) % 90, {}); colliderFor(b, col, 0.05); b.traverse(o => { if (o.isMesh) block.push(o); }); }
    place(g, 'sk_wire_shelf', -8.8, 0, -12.65, 0, { col }); place(g, 'sk_shelving_loaded', 6.8, 0, -12.65, 0, { col });
    // cleaner's cupboard
    this.cart = place(g, 'sk_janitor_cart', 4.3, 0, -14.6, 90, { col });
    place(g, 'sk_mop_bucket', 5.9, 0, -15, 0); place(g, 'sk_broom', 6.3, 0, -14.1, 0);
    this.keyObj = new THREE.Group(); { const ring = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.006, 4, 8), psxMat({ color: 0xc0c0b0 })); this.keyObj.add(ring); const k = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.07, 0.004), psxMat({ color: 0xd8c070 })); k.position.y = -0.05; this.keyObj.add(k); const tag = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.03, 0.004), psxMat({ color: 0xd04040 })); tag.position.set(0.03, -0.03, 0); this.keyObj.add(tag); }
    this.keyObj.position.set(5.0, 1.45, -15.42); g.add(this.keyObj);
    const hook = texBox(g, 'wood_dark', 4.6, 1.5, -15.5, 5.4, 1.58, -15.44, {});
    // security room
    this.secDesk = place(g, 'sk_teacher_desk', 17.6, 0, -14.6, 0, { col });
    this.term = place(g, 'sk_crt_monitor', 17.6, 0.86, -14.95, 0);
    place(g, 'sk_tv_cart', 15.0, 0, -15.2, 20, { col }); place(g, 'sk_filing_cabinet', 18.5, 0, -10.0, -90, { col });
    place(g, 'sk_phone_beige', 18.2, 0.86, -14.7, -20); place(g, 'sk_mug_coffee', 17.0, 0.86, -14.5, 0); place(g, 'sk_chair_folding', 17.6, 0, -13.7, 180);
    this.termTex = canvasTex(64, 48, c => { c.fillStyle = '#031a0e'; c.fillRect(0, 0, 64, 48); });
    const ts = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.225), new THREE.MeshBasicMaterial({ map: this.termTex, fog: false })); ts.position.set(17.6, 1.07, -14.876); g.add(ts);
    this.termLight = new THREE.PointLight(0x7fe0b0, 0.9, 4, 1.6); this.termLight.position.set(17.5, 1.3, -14); g.add(this.termLight);
    // ---------- lights ----------
    this.amb = new THREE.AmbientLight(0x4a5470, 0.55); this.scene.add(this.amb);
    this.hemi = new THREE.HemisphereLight(0x5a6c9c, 0x14110e, 0.5); this.scene.add(this.hemi);
    const emerg = (x, z, y = 2.5) => { const L = new THREE.PointLight(0x5fff9a, 0.55, 6, 1.6); L.position.set(x, y, z); this.root.add(L); };
    emerg(-13, 0, 2.8); emerg(12, -6.5); emerg(-7, -11.6); emerg(13.5, -12); emerg(5, -14.5, 2.4);
    this.corrLamp = new THREE.PointLight(0xdfe8ff, 1.4, 6, 1.6); this.corrLamp.position.set(1, 2.8, -12); this.root.add(this.corrLamp);
    this.divatLamp = new THREE.PointLight(0xffc0d0, 0.25, 5, 1.6); this.divatLamp.position.set(-7, 2.6, -8.5); this.root.add(this.divatLamp);
    // ---------- cameras ----------
    this.cams = CAMS.map(c => this.makeCamera(c));
    // ---------- guard ----------
    this.graph = new Graph(NODES, EDGES);
    this.guard = new NPC('npc_guard', { idle: 'Idle_Torch_Loop', speed: 1.25 }); this.guard.obj.position.set(16, 0, -12.5); g.add(this.guard.obj);
    this.gTorch = new THREE.SpotLight(0xfff1d6, 5, 13, 0.42, 0.5, 1.3); this.gTorch.position.set(0.15, 1.35, 0.25); this.guard.obj.add(this.gTorch);
    this.gTorch.target.position.set(0.1, 0.4, 4); this.guard.obj.add(this.gTorch.target);
    this.gs = { mode: 'office', seenT: 0, wait: 0, patrolI: 0, alertAt: null };
    // ---------- player ----------
    this.setupRig({ arms: false, flash: false, stepVol: 0.28, reach: 2.4 });
    this.setupInteractions();
    // ---------- state ----------
    const sv = epData(7).state;
    this.st = { phase: 'intro', key: false, phone: false, cp: 'start', alerts: 0, caught: 0, seen: [], hood: false, hoodUsed: false, ev: {}, scare1: false, scare2: false,
      term: { diffs: {}, ticket: false, cleared: false, photo: false, request: false, report: false, triedDelete: false, done: false }, start: Date.now() };
    if (sv) { Object.assign(this.st, sv, { start: Date.now() - (sv.elapsed || 0) }); if (this.st.phase === 'intro') this.st.phase = 'play'; }
    this.meter = 0; this.screenMode = 'night'; this.screenT = 0; this.wand = { t: 6, armed: false, shown: false };
  }

  makeCamera(c) {
    const g = new THREE.Group(); g.position.set(...c.p); this.root.add(g);
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, 0.3), psxMat({ color: 0xd8d8d0 })); body.position.z = 0.12; g.add(body);
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.04, 8), new THREE.MeshBasicMaterial({ color: 0x050505 })); lens.rotation.x = Math.PI / 2; lens.position.z = 0.28; g.add(lens);
    const ledM = new THREE.MeshBasicMaterial({ color: 0xff2020, fog: false }); const led = new THREE.Mesh(new THREE.SphereGeometry(0.018, 5, 4), ledM); led.position.set(0.05, 0.05, 0.26); g.add(led);
    const mount = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.25, 0.05), psxMat({ color: 0x888 })); mount.position.y = 0.15; g.add(mount);
    const base = Math.atan2(c.at[0] - c.p[0], c.at[1] - c.p[2]);
    // a faint red fan on the floor shows what the camera sees
    const fov = 46 * D2R, N = 18;
    // the fan on the floor is recomputed every frame with rays, so it stops at walls and shelves
    const pos = new Float32Array((N + 2) * 3), idx = [];
    for (let i = 0; i < N; i++) idx.push(0, i + 1, i + 2);
    const fg = new THREE.BufferGeometry(); fg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); fg.setIndex(idx);
    const fan = new THREE.Mesh(fg, new THREE.MeshBasicMaterial({ color: 0xff2a2a, transparent: true, opacity: 0.05, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, side: THREE.DoubleSide }));
    const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const edge = new THREE.LineLoop(lg, new THREE.LineBasicMaterial({ color: 0xff4040, transparent: true, opacity: 0.35, fog: false }));
    const fanHolder = new THREE.Group(); fanHolder.position.set(c.p[0], 0.04, c.p[2]); fanHolder.add(fan); fanHolder.add(edge); this.root.add(fanHolder);
    fan.frustumCulled = false; edge.frustumCulled = false;
    return { ...c, g, ledM, base, yaw: base, fan, edge, fanHolder, fov, N, pos, seenT: 0, phase: Math.random() * 6 };
  }

  setupInteractions() {
    const it = this.it;
    it.add(this.kioskShutter, () => this.st.key ? 'Unlock the lost-and-found shutter' : 'Lost-and-found shutter (locked)', () => this.useKiosk(), () => !this.st.phone);
    it.add(this.phoneObj, 'Take your phone', () => this.takePhone(), () => this.st.key && !this.st.phone && this.kioskOpen);
    it.add(this.keyObj, 'Take the key with the red tag', () => this.takeKey(), () => !this.st.key);
    it.add(this.cart, "Cleaner's cart", () => caption('Cleaning spray, gloves, a radio playing nothing. The keys usually hang on the wall hook.', 'say', 4));
    it.add(this.term, () => this.st.phone ? 'Use the FÜRKÉSZ terminal' : 'FÜRKÉSZ terminal: a live map of every camera', () => this.openTerminal());
    for (const m of this.mannequins) it.add(m.obj, 'Mannequin (próbababa)', () => { play('plastic2', { vol: 0.4, pos: [m.obj.position.x, 1, m.obj.position.z] }); caption('Plastic. Cold. Just a mannequin.', 'say', 2.5); });
    it.add(this.exitSign, 'Main entrance (shutters down)', () => caption('The shutter is down and locked from the outside. There must be a staff exit.', 'say', 4));
  }

  // ---------------- flow ----------------
  async enter() {
    this.playing = false; hud(false); music(null);
    loop('amb7', 'amb_hollow', { vol: 0.5 }); this.loops.push('amb7');
    loop('vent7', 'vent', { vol: 0.08 }); this.loops.push('vent7');
    if (this.st.phase === 'intro') {
      const cp = CHECKPOINTS.start; this.player.set(cp[0], cp[1], cp[2]);
      await fade(true, 'Saturday, 21:07. Pláza Platán.\n\nYou ran back in at closing for the phone you left at the food court.\nBehind you, the shutters came down.', 0.01);
      await wait(4.5);
      this.st.phase = 'play'; this.begin(false);
      await fade(false, '', 1.2);
      this.firstMatch();
    } else {
      const cp = CHECKPOINTS[this.st.cp] || CHECKPOINTS.start; this.player.set(cp[0], cp[1], cp[2]);
      this.camsOn = true; this.begin(true); await fade(false, '', 0.8);
    }
  }
  begin(resumed) {
    this.playing = true; hud(true); hudParts({ checklist: true, status: true, eye: true, batt: false });
    document.getElementById('eyebox').title = 'How sure the cameras are that they have seen your face';
    music('mus_dark', 0.18);
    this.updateGoals(); this.setObjective();
    if (resumed) caption('Back in the dark shopping centre. The cameras are still on.', 'say', 4);
    if (this.st.phone) this.guardMode('patrol');
    lockPointer();
  }
  firstMatch() {
    this.screenMode = 'match'; this.screenT = 0; play('sec_latch', { vol: 0.6 }); play('crton', { vol: 0.5, pos: [-5.5, 2.8, 0] });
    caption('[every screen in the hall switches on at once]', 'sfx', 4);
    setTimeout(() => caption('That\'s… me? "MATCH 91 %"?', 'say', 4), 2500);
    setTimeout(() => { objective('Get your phone from the lost-and-found (talált tárgyak) in the food court. The cameras look for your face: the eye fills while one sees you. H pulls your hood up.'); }, 5000);
    setTimeout(() => { this.screenMode = 'night'; }, 9000);
    setTimeout(() => { this.camsOn = true; play('sec_latch', { vol: 0.4 }); caption('[the cameras click back on, one by one. Each one sweeps a red fan across the floor: that is what it sees]', 'sfx', 6); }, 11000);
  }
  setObjective() {
    const s = this.st;
    if (!s.key && !s.phone) objective(this.kioskTried ? 'The lost-and-found is locked. The cleaner keeps keys in a cupboard off the staff corridor: through the "SZEMÉLYZET" door in the food court, or through the DIVAT shop\'s back door.' : 'Get your phone from the lost-and-found (talált tárgyak) in the food court. Keep out of the red camera fans. H: hood up.');
    else if (s.key && !s.phone) objective('You have the key. Back to the lost-and-found kiosk in the food court.');
    else if (s.phone && !s.term.done) objective('Clear your name: get to the security office at the east end of the staff corridor and open the FÜRKÉSZ terminal.');
  }
  updateGoals() {
    const s = this.st;
    checklist('Pláza Platán · 21:' + String(7 + Math.floor((Date.now() - s.start) / 60000)).padStart(2, '0').slice(-2), [
      { name: 'Key to the lost-and-found', hu: 'kulcs', cls: s.key ? 'done' : '' },
      { name: 'Your phone', hu: 'telefon', cls: s.phone ? 'done' : '' },
      { name: 'Prove the match is false', hu: 'téves egyezés', cls: s.term.cleared ? 'done' : '' },
    ]);
  }
  // ---------------- interactions ----------------
  useKiosk() {
    if (!this.st.key) { this.kioskTried = true; play('denied', { vol: 0.4 }); caption('Locked. Through the gap you can see your phone on the shelf. Who has the keys at night?', 'say', 4.5); this.setObjective(); return; }
    if (this.kioskOpen) return;
    this.kioskOpen = true; play('shutter', { vol: 0.7, pos: [13.45, 1.5, 4] }); this.kioskShutter.visible = false; this.it.items = this.it.items.filter(i => i.obj !== this.kioskShutter);
    caption('The shutter rattles up. Loud. Too loud.', 'say', 3);
  }
  takeKey() {
    this.st.key = true; this.keyObj.visible = false; play('pickup', { vol: 0.5 }); this.st.cp = 'passage';
    caption('A key with a red tag: "TALÁLT TÁRGYAK".', 'say', 3); this.updateGoals(); this.setObjective(); this.save();
  }
  async takePhone() {
    this.st.phone = true; this.phoneObj.visible = false; play('phonebtn', { vol: 0.6 }); this.st.cp = 'food';
    this.updateGoals(); this.save();
    this.playing = false; this.G.unlock(); this.seenUI(null);
    const el = openScreen(`<div class="phone"><div class="bar"><span>21:${String(14 + Math.floor((Date.now() - this.st.start) / 60000) % 40).padStart(2, '0')}</span><span>▮ 4%</span></div><div class="appbar">Your phone</div>
      <div class="msgs"><div class="msg sys">3 missed calls: Mum</div><div class="msg"><span class="who">Mum</span>where are you?? I'm outside the main entrance, it's all shut 😟</div>
      <div class="msg"><span class="who">Wallet</span>🎟️ <b>MOZI Platán</b> · Screen 3 · Saturday <b>18:30–20:45</b> · 1 seat · scanned at 18:24</div>
      <div class="msg sys">Battery 4%. Calls are not possible.</div></div>
      <div class="foot"><button class="btn primary" id="ok" autofocus>Text Mum: "stuck inside, coming"</button></div></div>`, 'solid');
    await new Promise(r => { el.querySelector('#ok').onclick = () => { closeScreen(el); r(); }; });
    play('beep', { vol: 0.4 }); this.playing = true; lockPointer();
    this.setObjective();
    setTimeout(() => this.alarmScare(), 2500);
  }
  alarmScare() {
    if (this.st.scare2) return; this.st.scare2 = true;
    const quiet = this.G.quiet();
    this.screenMode = 'alarm'; this.screenT = 0;
    if (!quiet) { play('stinger', { vol: 0.85 }); play('feedback', { vol: 0.5 }); flash(0.25, 150); loop('alarm7', 'distort', { vol: 0.35, rate: 0.6 }); setTimeout(() => stopLoop('alarm7', 0.5), 5000); }
    else play('sec_latch', { vol: 0.6 });
    caption('[every screen: your face. "SUSPECT · VOLTA · 18:40". Somewhere a radio crackles]', 'sfx', 5);
    this.dispatch(this.player.pos.x, this.player.pos.z, 'phone');
    setTimeout(() => { this.screenMode = 'night'; }, 9000);
  }
  // ---------------- cameras ----------------
  updateCams(dt, t) {
    const p = this.player.pos, head = new THREE.Vector3(p.x, 1.55, p.z);
    let seenBy = null;
    for (const c of this.cams) {
      c.yaw = c.base + (c.sweep ? Math.sin((t + c.phase) * Math.PI * 2 / c.per) * c.sweep * D2R : 0);
      c.g.rotation.y = c.yaw; this.updateFan(c);
      const dx = p.x - c.p[0], dz = p.z - c.p[2], d = Math.hypot(dx, dz);
      let ang = Math.atan2(dx, dz) - c.yaw; while (ang > Math.PI) ang -= Math.PI * 2; while (ang < -Math.PI) ang += Math.PI * 2;
      const inCone = d < c.range && Math.abs(ang) < c.fov / 2;
      const seen = inCone && this.lineOfSight(new THREE.Vector3(c.p[0], c.p[1] - 0.2, c.p[2]), head);
      c.ledM.color.setHex(seen ? (Math.sin(t * 20) > 0 ? 0xffffff : 0xff2020) : (Math.sin(t * 2 + c.phase) > 0.6 ? 0xff2020 : 0x400808));
      c.fan.material.opacity = seen ? 0.14 : 0.05; c.edge.material.opacity = seen ? 0.9 : 0.35;
      if (seen) seenBy = c;
    }
    this.alertCool = Math.max(0, (this.alertCool || 0) - dt);
    if (!this.camsOn) seenBy = null;
    this.seenUI(seenBy);
    if (seenBy && this.st.phase === 'play') {
      this.meter = Math.min(1.05, this.meter + dt / (this.st.hood ? 2.4 : 1.4) * (this.alertCool > 0 ? 0.35 : 1));
      if (!this._seenTick || t - this._seenTick > 0.9) { this._seenTick = t; play('knob', { vol: 0.12, rate: 1.5 }); }
      this.lastSeen = seenBy;
    } else this.meter = Math.max(0, this.meter - dt * 0.11);
    eye(this.meter, this.meter > 0.7);
    if (this.meter >= 1) this.camAlert(this.lastSeen);
  }
  updateFan(c) {
    const rc = this._fanRc || (this._fanRc = new THREE.Raycaster()); const o = new THREE.Vector3(c.p[0], 1.1, c.p[2]), d = new THREE.Vector3();
    const P = c.pos; P[0] = P[1] = P[2] = 0;
    for (let i = 0; i <= c.N; i++) {
      const a = c.yaw - c.fov / 2 + c.fov * i / c.N; d.set(Math.sin(a), 0, Math.cos(a));
      rc.set(o, d); rc.far = c.range; const h = rc.intersectObjects(this.block, false); const L = h.length ? h[0].distance : c.range;
      P[(i + 1) * 3] = d.x * L; P[(i + 1) * 3 + 1] = 0; P[(i + 1) * 3 + 2] = d.z * L;
    }
    c.fan.geometry.attributes.position.needsUpdate = true; c.edge.geometry.attributes.position.needsUpdate = true;
  }
  camAlert(c) {
    this.meter = 0.25; this.alertCool = 8; this.st.alerts++; this.runAlerts = (this.runAlerts || 0) + 1;
    if (this.runAlerts >= 4) { this.caught('lockdown'); return; }
    this.trackT = 12;
    const p = this.player.pos;
    this.st.seen.push({ cam: c.name, t: this.clockStr() }); if (this.st.seen.length > 12) this.st.seen.shift();
    play('sec_latch', { vol: 0.7 }); play('beep', { vol: 0.5, rate: 0.6 });
    caption(`[${c.name.toUpperCase()} locks on: MATCH ${88 + Math.floor(Math.random() * 8)} %. Fürkész sends your position to Laci's radio for 12 seconds. ${this.runAlerts === 3 ? 'One more and they call the police.' : 'Break the line of sight!'}]`, 'sfx', 5);
    play('feedback', { vol: 0.25, rate: 1.4 });
    this.screenMode = 'match'; this.screenT = 0; setTimeout(() => { if (this.screenMode === 'match') this.screenMode = 'night'; }, 5000);
    this.dispatch(p.x, p.z, 'cam'); this.save();
  }
  clockStr() { return '21:' + String(7 + Math.floor((Date.now() - this.st.start) / 60000)).padStart(2, '0').slice(-2); }
  seenUI(c) {
    let el = document.getElementById('seen7');
    if (!el) { el = document.createElement('div'); el.id = 'seen7'; el.innerHTML = '<div class="vig"></div><div class="lab"></div>'; document.body.appendChild(el); }
    el.classList.toggle('on', !!c && this.playing);
    if (c) el.querySelector('.lab').textContent = '📷 ' + c.name + ' sees your face';
    el.classList.toggle('track', this.trackT > 0 && this.playing);
  }
  // ---------------- guard ----------------
  guardMode(m) {
    const gs = this.gs; gs.mode = m;
    if (m === 'patrol') { const node = PATROL[gs.patrolI % PATROL.length]; const gp = this.guard.pos; this.guard.walkTo(this.graph.route(gp.x, gp.z, ...NODES[node]), () => { gs.patrolI++; gs.wait = 1.5; }); }
  }
  dispatch(x, z, why) {
    const gs = this.gs, gp = this.guard.pos;
    gs.mode = 'investigate'; gs.target = [x, z];
    this.guard.speed = 1.9; this.guard.walkAnim = 'Walk_Loop';
    this.guard.walkTo(this.graph.route(gp.x, gp.z, x, z), () => { gs.wait = 5; gs.mode = 'search'; this.guard.speed = 1.25; });
  }
  updateGuard(dt, t) {
    const gd = this.guard, gs = this.gs;
    // while the cameras feed him your position, he comes straight for you, fast
    if (this.trackT > 0) {
      this.trackT -= dt; this._trk = (this._trk || 0) - dt; gd.speed = 2.3;
      if (this._trk <= 0) { this._trk = 1.5; const p = this.player.pos; gs.mode = 'investigate'; gd.walkTo(this.graph.route(gd.pos.x, gd.pos.z, p.x, p.z), () => { gs.wait = 4; gs.mode = 'search'; gd.speed = 1.25; }); }
      if (this.trackT <= 0) { gd.speed = 1.6; caption('[the radio goes quiet. The cameras lost you]', 'sfx', 3); }
    }
    gd.update(dt);
    if (gs.mode === 'office') return;
    if (!gd.path.length) {
      gs.wait -= dt;
      if (gs.mode === 'search') gd.facing += dt * 0.9;
      if (gs.wait <= 0) { if (gs.mode === 'search') gs.mode = 'patrol'; this.guardMode('patrol'); }
    }
    // footsteps
    if (gd.path.length) { gs.stepT = (gs.stepT || 0) - dt; if (gs.stepT <= 0) { gs.stepT = 0.55 / (gd.speed / 1.25); play('heavy' + (1 + ((Math.random() * 4) | 0)), { vol: 0.55, rate: 0.95, pos: [gd.pos.x, 0.2, gd.pos.z] }); } }
    // can he see you?
    const p = this.player.pos, dx = p.x - gd.pos.x, dz = p.z - gd.pos.z, d = Math.hypot(dx, dz);
    const f = gd.forward(); const dot = (dx * f.x + dz * f.z) / Math.max(0.001, d);
    const sees = (d < 9 && dot > 0.82 && this.lineOfSight(new THREE.Vector3(gd.pos.x, 1.6, gd.pos.z), new THREE.Vector3(p.x, 1.4, p.z))) || d < 1.3;
    if (sees && this.st.phase === 'play') {
      gs.seenT += dt;
      if (gs.seenT > 0.15 && !gs.shouted) { gs.shouted = true; caption('Laci (the night guard): "Hey! You! Stop right there!"', 'say', 3); play('presence', { vol: 0.4 }); gd.faceTo(p.x, p.z); }
      if (gs.seenT > 1.1) this.caught();
    } else { gs.seenT = Math.max(0, gs.seenT - dt * 0.5); if (gs.seenT === 0) gs.shouted = false; }
  }
  async caught(kind) {
    if (this._caughtBusy) return; this._caughtBusy = true;
    this.st.caught++; this.playing = false; this.G.unlock(); prompt(null); this.trackT = 0; this.runAlerts = 0; this.seenUI(null);
    await fade(true, kind === 'lockdown' ? 'Four cameras, four matches. Every screen in the building shows your face.\nLaci is waiting at the next corner: "The police are on their way."\nWhile he argues with the dispatcher, you slip back into the dark.' : 'The torch finds your face.\n"Don\'t move. I\'ve called it in."\nWhile he talks into his radio, you slip behind a pillar and run.', 1.0);
    const cp = CHECKPOINTS[this.st.cp] || CHECKPOINTS.start; this.player.set(cp[0], cp[1], cp[2]);
    this.meter = 0.2; this.gs.seenT = 0; this.gs.shouted = false;
    const far = this.st.cp === 'start' ? 'sec' : 'a1'; this.guard.obj.position.set(...[NODES[far][0], 0, NODES[far][1]]); this.guard.stop(); this.gs.patrolI = PATROL.indexOf(far) + 1; this.guardMode('patrol');
    await wait(2.6); this.save();
    await fade(false, '', 0.8);
    caption('Stay out of his torch beam, and out of the red camera fans.', 'say', 4);
    this.playing = true; this._caughtBusy = false; lockPointer();
  }
  // ---------------- mannequins ----------------
  updateWanderer(dt) {
    const w = this.wand, m = this.wanderer, p = this.player.pos, cam = this.G.camera;
    const inDivat = p.x > -10 && p.x < -4 && p.z < -6 && p.z > -11, inCorr = p.z < -11 && p.z > -13 && p.x < 3;
    if (!(inDivat || inCorr)) { if (m.obj.visible && !w.shown) m.obj.visible = false; return; }
    const fwd = cam.getWorldDirection(new THREE.Vector3()); fwd.y = 0; fwd.normalize();
    const mp = m.obj.position, to = new THREE.Vector3(mp.x - p.x, 0, mp.z - p.z), dist = to.length(); to.normalize();
    const looking = m.obj.visible && to.dot(fwd) > 0.88 && this.lineOfSight(cam.position, new THREE.Vector3(mp.x, 1.3, mp.z));
    if (m.obj.visible && looking && dist < 3.2 && !this.st.scare1) {
      this.st.scare1 = true; w.shown = true;
      if (!this.G.quiet()) { play('stinger', { vol: 0.9 }); play('plastic2', { vol: 0.8, pos: [mp.x, 1, mp.z] }); flash(0.2, 120); }
      else play('strain', { vol: 0.5, pos: [mp.x, 1, mp.z] });
      caption('[a mannequin, right behind you. It wasn\'t there a second ago… was it?]', 'sfx', 4.5);
      setTimeout(() => caption('Plastic. Just plastic. Somebody must have left it there.', 'say', 3.5), 2500);
      setTimeout(() => { w.shown = false; }, 8000);
      return;
    }
    if (looking || w.shown) return;
    w.t -= dt; if (w.t > 0) return;
    w.t = 3 + Math.random() * 4;
    // place it 2.2–3.8 m behind you, somewhere the walls allow
    for (let i = 0; i < 12; i++) {
      const a = Math.atan2(-fwd.x, -fwd.z) + (Math.random() - 0.5) * 1.2, r = 2.2 + Math.random() * 1.6;
      const x = p.x + Math.sin(a) * r, z = p.z + Math.cos(a) * r;
      const ok = (inDivat ? (x > -9.7 && x < -4.3 && z < -6.3 && z > -10.7) : (x > -9.7 && x < 2.5 && z < -11.3 && z > -12.7)) && !this.col.some(b => x > b.x0 - 0.3 && x < b.x1 + 0.3 && z > b.z0 - 0.3 && z < b.z1 + 0.3);
      if (ok) { mp.set(x, 0, z); m.obj.rotation.y = Math.atan2(p.x - x, p.z - z); m.obj.visible = true; if (this.st.scare1) play('strain', { vol: 0.25, rate: 0.8, pos: [x, 1, z] }); break; }
    }
  }
  // ---------------- screens ----------------
  drawScreens(t) {
    this._sT = (this._sT || 0) + 1; if (this._sT % 3) return;
    const c = this.screenTex.userData.g, W = 160, H = 96, m = this.screenMode;
    const face = (x, y, s, col) => { // a pixel "CCTV still" of you: hoodie, face in a box
      c.fillStyle = '#7a1f2b'; c.fillRect(x - 14 * s, y + 10 * s, 28 * s, 22 * s); c.fillStyle = '#5c1520'; c.fillRect(x - 9 * s, y - 12 * s, 18 * s, 6 * s);
      c.fillStyle = '#c99a7a'; c.fillRect(x - 7 * s, y - 8 * s, 14 * s, 17 * s); c.fillStyle = '#222'; c.fillRect(x - 4 * s, y - 2 * s, 2 * s, 2 * s); c.fillRect(x + 2 * s, y - 2 * s, 2 * s, 2 * s);
      c.strokeStyle = col; c.lineWidth = 1; c.strokeRect(x - 10 * s, y - 11 * s, 20 * s, 23 * s);
      for (const [a, b] of [[-10, -11], [10, -11], [-10, 12], [10, 12]]) { c.fillStyle = col; c.fillRect(x + a * s - 1, y + b * s - 1, 3, 3); }
    };
    if (m === 'night') {
      c.fillStyle = '#04101c'; c.fillRect(0, 0, W, H); c.fillStyle = '#5fa8ff'; c.font = '16px m5x7'; c.textBaseline = 'top';
      pxText(c, 'FÜRKÉSZ · NIGHT MODE', 6, 4, 16); c.fillStyle = '#8fb8e0'; c.fillText('cameras online: 7/7', 6, 22); c.fillText(this.clockStr() + '  faces today: 14 822', 6, 36);
      for (let i = 0; i < 6; i++) { const x = 10 + i * 24, y = 56; c.fillStyle = '#123'; c.fillRect(x, y, 18, 22); c.fillStyle = (i + Math.floor(t * 2)) % 6 === 0 ? '#5fa8ff' : '#2a4058'; c.fillRect(x + 5, y + 4, 8, 10); c.fillRect(x + 3, y + 15, 12, 7); }
      if (Math.floor(t) % 7 === 3) { c.fillStyle = '#ffb469'; c.fillText('6 PERSONS · DIVAT', 6, 82); }
    } else if (m === 'match' || m === 'alarm') {
      const red = m === 'alarm' && Math.sin(t * 10) > 0;
      c.fillStyle = red ? '#3a0606' : '#081420'; c.fillRect(0, 0, W, H);
      face(40, 44, 1.5, red ? '#ff4040' : '#5fa8ff');
      c.font = '16px m5x7'; c.textBaseline = 'top'; c.fillStyle = m === 'alarm' ? '#ff6060' : '#ffd27a';
      c.fillText(m === 'alarm' ? 'SUSPECT' : 'MATCH 91 %', 76, 10); c.fillStyle = '#cde';
      c.fillText('VOLTA · 18:40', 76, 28); c.fillText('red hoodie', 76, 42); c.fillText('status: ' + (m === 'alarm' ? 'ALERT' : 'tracking'), 76, 56);
      c.fillText('guard notified', 76, 70);
    }
    this.screenTex.needsUpdate = true;
    for (const L of this.screens) L.color.setHex(m === 'alarm' ? 0xff5050 : 0x9fc4ff);
    // terminal glow
    const tc = this.termTex.userData.g; tc.fillStyle = '#031a0e'; tc.fillRect(0, 0, 64, 48); tc.fillStyle = '#7fe0b0'; tc.font = '16px m5x7'; tc.textBaseline = 'top';
    pxText(tc, 'FÜRKÉSZ', 4, 2, 16); tc.fillText(this.st.alerts + ' alerts', 4, 18); if (Math.sin(t * 3) > 0) tc.fillRect(4, 36, 5, 6); this.termTex.needsUpdate = true;
  }
  // ---------------- the terminal ----------------
  openTerminal() {
    if (!this.st.phone) { caption('A wall of camera views. In one of them, a figure in a red hoodie stands in a dark office. You.', 'say', 4.5); return; }
    this.playing = false; this.G.unlock(); prompt(null); this.seenUI(null);
    let tab = 'alerts';
    const T = this.st.term;
    const el = this.termEl = openScreen(`<div class="tablet fur"><div class="tbar"><b>FÜRKÉSZ · operator console</b><span>Pláza Platán · ${this.clockStr()}</span><span><button class="btn small" id="x">Close</button></span></div><div class="tbody"><div class="tlist" id="list"></div><div class="tmain" id="main"></div></div></div>`);
    const $ = q => el.querySelector(q);
    const render = () => {
      const tabs = [['alerts', '🔔 Alerts'], ['compare', '🔍 Compare'], ['log', '📋 Search log'], ['data', '🗂 Data & rights']];
      $('#list').innerHTML = tabs.map(([k, l]) => `<button class="tdev ${tab === k ? 'on' : ''}" data-tab="${k}"><span>${l}</span></button>`).join('') +
        `<div class="tmore">${T.cleared ? '✓ Match marked false' : 'Match: <b>open</b>'}<br>${[T.photo && '📸 log photographed', T.request && '🗂 data requested', T.report && '⚑ misuse reported'].filter(Boolean).join('<br>')}</div>` +
        (T.cleared && (T.request || T.report) ? '<button class="btn primary small" id="done" style="margin-top:8px">I\'m done here</button>' : '');
      let body = '';
      if (tab === 'alerts') {
        body = `<h3 style="margin:0">Alerts</h3><table class="tlog"><tr><td>18:40</td><td>VOLTA cam 2: theft reported · suspect: red hoodie, approx. 1.85 m</td></tr><tr><td>21:07</td><td>Atrium west: <b>MATCH 91 %</b> with suspect · status: ${T.cleared ? '<b style="color:#2c7a5a">FALSE MATCH (reviewed)</b>' : '<b style="color:#a23030">SUSPECT</b>'}</td></tr>${this.st.seen.map(s => `<tr><td>${s.t}</td><td>${esc(s.cam)}: same face again</td></tr>`).join('')}</table><p class="sub" style="font-size:.85em">Every time a camera saw your face, it was logged. Your whole route through the building is in here.</p>`;
      }
      if (tab === 'compare') {
        const d = T.diffs, n = Object.keys(d).length + (T.ticket ? 1 : 0);
        body = `<h3 style="margin:0">Compare: suspect vs. you</h3><p class="sub" style="font-size:.85em">Click every difference you can find. The 91 % is how similar two faces look to the program, not how likely it is that you did it.</p>
          <div class="cmp"><figure>${frame(true, d)}<figcaption>VOLTA cam 2 · 18:40 · suspect</figcaption></figure><figure>${frame(false, d)}<figcaption>Atrium west · 21:07 · you</figcaption></figure></div>
          <div class="tset"><span>🎟️ Cinema ticket in your phone: Screen 3, 18:30–20:45</span>${T.ticket ? '<b>✓ added as alibi</b>' : '<button class="btn small" id="ticket">Add as alibi</button>'}</div>
          <div class="tfoot">${T.cleared ? '<b>Marked as FALSE MATCH. The alert is closed.</b>' : `<button class="btn" id="clear" ${n >= 3 ? '' : 'disabled style="opacity:.5"'}>Mark as false match (${n}/3 proofs)</button>`}</div>`;
      }
      if (tab === 'log') {
        body = `<h3 style="margin:0">Search log</h3><p class="sub" style="font-size:.85em">Who searched for which face, and why.</p><table class="tlog">
          <tr><td>Tue 23:40</td><td>laci.n</td><td>face search: uploaded photo "kati_profil.jpg"</td><td>purpose: <i>(empty)</i> · 14 results</td></tr>
          <tr><td>Thu 22:15</td><td>laci.n</td><td>face search: "kati_profil.jpg"</td><td>purpose: <i>(empty)</i> · 9 results</td></tr>
          <tr><td>12 March</td><td>admin</td><td>"everyone at the bus-stop protest, 17:00–18:00"</td><td>purpose: "just in case" · 212 faces</td></tr>
          <tr><td>daily</td><td>marketing</td><td>"returning visitors, ages 12–17"</td><td>purpose: "personalised offers" · 3 104 faces</td></tr>
          <tr><td>today</td><td>system</td><td>you: ${this.st.alerts + 1} sightings</td><td>kept for 30 days</td></tr></table>
          <div class="tset"><span>Take a photo of this screen with your phone (evidence)</span>${T.photo ? '<b>✓ done</b>' : '<button class="btn small" id="photo">📸 Photo</button>'}</div>`;
      }
      if (tab === 'data') {
        body = `<h3 style="margin:0">Data &amp; rights</h3>
          <table class="tlog"><tr><td>Video recordings</td><td>kept 30 days</td></tr><tr><td>Face templates (numbers made from faces)</td><td>kept "until no longer needed"</td></tr><tr><td>Who can search</td><td>guards, admin, marketing</td></tr><tr><td>Data protection officer</td><td>adatvedelem@plaza-platan.example</td></tr></table>
          <div class="tset"><span>${rich('Ask for every recording and face template they hold about you ([[accessright|access request]])')}</span>${T.request ? '<b>✓ request sent</b>' : '<button class="btn small" id="req">Send request</button>'}</div>
          <div class="tset"><span>${rich('Report the private searches and the protest search to the [[dpo|data protection officer]]')}</span>${T.report ? '<b>✓ reported</b>' : '<button class="btn small" id="rep">Report</button>'}</div>
          <div class="tset"><span>Delete your own record from the system</span>${T.triedDelete ? '<b>✗ not allowed</b>' : '<button class="btn small" id="del">Delete</button>'}</div>
          <div class="sub" id="msg" style="font-size:.85em">${esc(this.termMsg || '')}</div>`;
      }
      $('#main').innerHTML = body;
      el.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { tab = b.dataset.tab; play('click', { vol: 0.3 }); render(); });
      el.querySelectorAll('[data-diff]').forEach(b => b.onclick = () => { if (!T.diffs[b.dataset.diff]) { T.diffs[b.dataset.diff] = true; play('paper', { vol: 0.4 }); this.save(); render(); } });
      const on = (id, f) => { const b = $(id); if (b) b.onclick = f; };
      on('#ticket', () => { T.ticket = true; play('phonebtn', { vol: 0.5 }); this.save(); render(); });
      on('#clear', () => { if (Object.keys(T.diffs).length + (T.ticket ? 1 : 0) < 3) return; T.cleared = true; play('latch', { vol: 0.6 }); this.updateGoals(); this.save(); render(); });
      on('#photo', () => { T.photo = true; play('press', { vol: 0.6, rate: 1.6 }); this.save(); render(); });
      on('#req', () => { T.request = true; this.termMsg = 'Request sent. By law they have to answer within a month and show you what they hold.'; play('beep', { vol: 0.4 }); this.save(); render(); });
      on('#rep', () => { T.report = true; this.termMsg = 'Report sent to the data protection officer. Searching for an ex-girlfriend is misuse. So is filing everyone at a protest "just in case".'; play('beep', { vol: 0.4 }); this.save(); render(); });
      on('#del', () => { T.triedDelete = true; this.termMsg = 'You are not allowed to delete records from someone else\'s system. But you can ask them to delete data they have no reason to keep.'; play('denied', { vol: 0.4 }); this.save(); render(); });
      on('#done', () => { closeScreen(el); this.termEl = null; T.done = true; this.save(); this.finale(); });
    };
    $('#x').onclick = () => { closeScreen(el); this.termEl = null; this.playing = true; lockPointer(); };
    render();
  }
  // ---------------- finale: Laci ----------------
  async finale() {
    this.st.phase = 'end'; prompt(null); this.seenUI(null);
    this.guard.stop(); this.guard.obj.position.set(13.2, 0, -12); this.guard.walkTo([new THREE.Vector3(15.6, 0, -12.2)], () => { this.guard.play('Idle_Talking_Loop'); this.guard.faceTo(this.player.pos.x, this.player.pos.z); });
    play('door_open', { vol: 0.6, pos: [14, 1, -12] });
    this.player.frozen = true; this.playing = true;
    this.player.set(16.9, -13.2, 0); this.player.yaw = Math.atan2(-(15.4 - 16.9), -(-12.2 + 13.2)); this.player.sync();
    await wait(2.5);
    this.playing = false;
    const T = this.st.term;
    const steps = [
      { who: 'Laci', text: 'Stay where you are! …Huh. You\'re just a kid.', opts: [['show', 'Look at the screen. The system matched the wrong person.'], ['phone', 'I only came back for my phone!']] },
      { who: 'Laci', text: 'White trainers. A backpack. Taller than you. And you were in Screen 3 at half six? …This thing beeps at every red hoodie in Budapest. Last week it matched a mannequin.', opts: [['log', 'Someone also searched for a "Kati" fourteen times. And everyone at a protest.'], ['home', 'Can I go home now?']] },
    ];
    let said = [];
    const el = openScreen(`<div class="panel" style="width:min(640px,94vw);margin-top:40vh"><div id="dlg"></div></div>`);
    const show = (s) => new Promise(r => {
      el.querySelector('#dlg').innerHTML = `<p><b>${s.who}:</b> ${esc(s.text)}</p><div class="btns" style="flex-direction:column;align-items:stretch">${s.opts.map(([k, l]) => `<button class="btn" data-k="${k}">${esc(l)}</button>`).join('')}</div>`;
      el.querySelectorAll('[data-k]').forEach(b => b.onclick = () => { play('uiclick', { vol: 0.4 }); r(b.dataset.k); });
    });
    said.push(await show(steps[0]));
    if (said[0] === 'phone') await show({ who: 'Laci', text: 'Your phone. Sure. The computer says you robbed the electronics shop.', opts: [['show', 'Then look at the computer. I marked it as a false match, with proof.']] });
    said.push(await show(steps[1]));
    if (said[1] === 'log') {
      const k = await show({ who: 'Laci', text: '…That\'s got nothing to do with you.', opts: T.report ? [['rep', 'It\'s already in my report to the data protection officer.'], ['sorry', 'Sorry. Forget it.']] : [['sorry', 'Sorry. Forget it.']] });
      if (k === 'rep') await show({ who: 'Laci', text: '…Fine. You\'re right. It shouldn\'t even be possible to do that with this thing. Come on.', opts: [['go', 'OK.']] });
      else await show({ who: 'Laci', text: 'Come on. Let\'s get you out.', opts: [['go', 'OK.']] });
    } else await show({ who: 'Laci', text: 'Come on. Staff exit\'s this way. Your mum\'s been ringing the bell for ten minutes.', opts: [['go', 'OK.']] });
    await show({ who: 'Laci', text: 'And one more thing. Some kid at the bus stop was filming the screens through the glass. Your face on every one of them. …I\'d keep an eye on that.', opts: [['ok', '…Great.']] });
    closeScreen(el);
    await this.ending();
  }
  async ending() {
    this.playing = false; this.G.unlock(); hud(false);
    for (const id of this.loops) stopLoop(id, 0.8);
    const T = this.st.term;
    await fade(true, T.report ? `End of episode ${epPos(7)}.\n\nThe side door clicks shut behind you. Mum hugs you too hard.\nOn Monday the shopping centre switches off the "marketing" searches.\nSomewhere, a 40-second video of the screens is uploading.` : `End of episode ${epPos(7)}.\n\nThe side door clicks shut behind you. Mum hugs you too hard.\nThe cameras keep watching. Somebody still searches for Kati.\nSomewhere, a 40-second video of the screens is uploading.`, 1.5);
    await wait(4);
    const secs = Math.round((Date.now() - this.st.start) / 1000);
    const d = epData(7); d.done = true; d.state = null; d.choices = { request: !!T.request, report: !!T.report, cleared: !!T.cleared }; d.best = d.best ? Math.min(d.best, secs) : secs; persist();
    music('mus_debrief', 0.45);
    await fade(false, '', 0.5);
    const stats = [`Times the cameras locked on: ${this.st.alerts}`, `Times Laci caught you: ${this.st.caught}`, `False match: ${T.cleared ? 'proved' : 'not proved'}`, `Data requested: ${T.request ? 'yes' : 'no'}`, `Misuse reported: ${T.report ? 'yes' : 'no'}`, `Hood used: ${this.st.hoodUsed ? 'yes' : 'no'}`];
    const nx = await debriefScreen(DEBRIEF_EP7, stats, this.G.nextLabel(7));
    await fade(true, '', 0.6);
    if (nx === 'next') { await this.G.goNext(7); await fade(false, '', 0.8); return; }
    await this.G.goHub(); await fade(false, '', 0.8);
  }
  save() {
    const st = this.st; if (st.phase === 'intro' || st.phase === 'end') return;
    const { start, ...rest } = st; epData(7).state = { ...rest, elapsed: Date.now() - start }; persist();
  }
  // ---------------- loop ----------------
  update(dt, t) {
    if (this.wanderer) this.wanderer.update(0);
    this.drawScreens(t);
    if (this.st.phase === 'end') { this.guard.update(dt); return; }
    if (!this.playing) return;
    this.player.update(dt);
    if (wasPressed('KeyH')) { this.st.hood = !this.st.hood; this.st.hoodUsed = true; play('strain', { vol: 0.25, rate: 1.6 }); caption(this.st.hood ? 'Hood up. Harder to read your face, but your hoodie and the way you walk are still you.' : 'Hood down.', 'say', 3); }
    if (this.st.phase === 'play') { this.updateCams(dt, t); this.updateGuard(dt, t); this.updateWanderer(dt); }
    if (this.gs.mode === 'office' && (Date.now() - this.st.start) / 1000 > 75) this.guardMode('patrol');
    this.corrLamp.intensity = Math.random() < 0.04 ? 0.2 : 1.4;
    this._g = (this._g || 0) + dt; if (this._g > 1) { this._g = 0; this.updateGoals(); }
    this._sv = (this._sv || 0) + dt; if (this._sv > 8) { this._sv = 0; this.save(); }
    this.interact();
  }
  exit() { super.exit(); stopLoop('alarm7'); const s7 = document.getElementById('seen7'); if (s7) s7.remove(); if (this.termEl) closeScreen(this.termEl); }
}

// Two CCTV stills side by side: the thief at VOLTA and you. Differences are clickable.
function frame(suspect, d) {
  const img = A.img[suspect ? 'ep7_cctv_suspect' : 'ep7_cctv_you'];
  if (img) {
    const hit = (k, x, y, w, h) => `<rect data-diff="${k}" x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="${d[k] ? 'rgba(255,210,122,.18)' : 'rgba(0,0,0,0)'}" stroke="${d[k] ? '#ffd27a' : 'none'}" stroke-width="4" style="cursor:pointer"/>`;
    const H = suspect ? { head: 140, feet: 398, x: 392, label: '≈ 1.85 m' } : { head: 205, feet: 398, x: 362, label: '≈ 1.58 m' };
    const ruler = `<line x1="${H.x}" y1="${H.head}" x2="${H.x}" y2="${H.feet}" stroke="#7fe0b0" stroke-width="3" stroke-dasharray="8 5"/><line x1="${H.x - 14}" y1="${H.head}" x2="${H.x + 14}" y2="${H.head}" stroke="#7fe0b0" stroke-width="3"/><line x1="${H.x - 14}" y1="${H.feet}" x2="${H.x + 14}" y2="${H.feet}" stroke="#7fe0b0" stroke-width="3"/><text x="${H.x + 8}" y="${H.head - 10}" font-size="22" font-family="monospace" fill="#7fe0b0" stroke="#000" stroke-width="3" paint-order="stroke">${H.label}</text>`;
    const hits = suspect ? hit('shoes', 268, 305, 112, 105) + hit('bag', 250, 178, 78, 95) + hit('height', H.x - 30, H.head - 36, 120, H.feet - H.head + 50)
      : hit('shoes', 252, 330, 100, 80) + hit('bag', 300, 210, 70, 85) + hit('height', H.x - 30, H.head - 36, 120, H.feet - H.head + 50);
    return `<svg viewBox="0 0 512 512" style="width:100%;display:block;background:#111"><image href="${img}" x="0" y="0" width="512" height="512"/>
      <rect x="0" y="0" width="512" height="34" fill="rgba(0,0,0,.55)"/><text x="10" y="24" font-size="20" font-family="monospace" fill="#cde">${suspect ? 'VOLTA cam2  18:40:12' : 'ATRIUM W  21:07:44'}</text>${ruler}${hits}</svg>`;
  }
  const tall = suspect ? 0 : 22, shoe = suspect ? '#f2f2f2' : '#1b1b1b';
  const hit = (k, x, y, w, h) => `<rect data-diff="${k}" x="${x}" y="${y}" width="${w}" height="${h}" fill="${d[k] ? 'rgba(255,210,122,.18)' : 'rgba(0,0,0,0)'}" stroke="${d[k] ? '#ffd27a' : 'none'}" stroke-width="2" style="cursor:pointer"/>`;
  return `<svg viewBox="0 0 200 220" style="width:100%;display:block;background:#1d2228">
    <rect width="200" height="220" fill="${suspect ? '#232a30' : '#1e2329'}"/>
    <rect x="130" y="20" width="44" height="180" fill="#2c343c" stroke="#55606a"/>
    ${[0, 1, 2, 3, 4, 5].map(i => `<line x1="174" y1="${200 - i * 30}" x2="182" y2="${200 - i * 30}" stroke="#9aa"/><text x="184" y="${203 - i * 30}" font-size="7" fill="#9aa" font-family="monospace">${(i * 0.4).toFixed(1)}</text>`).join('')}
    <g transform="translate(0 ${tall})">
      <ellipse cx="80" cy="58" rx="16" ry="18" fill="#5c1520"/><ellipse cx="80" cy="63" rx="11" ry="13" fill="#b58a6c"/>
      <path d="M52 170 C 52 110, 62 82, 80 80 C 98 82, 108 110, 108 170 Z" fill="#7a1f2b"/>
      ${suspect ? '<rect x="98" y="88" width="16" height="44" rx="4" fill="#2d4f8a"/><line x1="96" y1="90" x2="66" y2="120" stroke="#1d3460" stroke-width="4"/>' : ''}
      <rect x="62" y="170" width="14" height="${30 - tall}" fill="#2a2c33"/><rect x="84" y="170" width="14" height="${30 - tall}" fill="#2a2c33"/>
      <rect x="58" y="${196 - tall}" width="20" height="8" fill="${shoe}"/><rect x="82" y="${196 - tall}" width="20" height="8" fill="${shoe}"/>
    </g>
    <text x="6" y="14" font-size="9" fill="#cde" font-family="monospace">${suspect ? 'VOLTA cam2 18:40:12' : 'ATRIUM W 21:07:44'}</text>
    ${hit('shoes', 52, 190 - tall, 56, 22)}${hit('bag', 92, 84 + tall, 28, 54)}${hit('height', 126, 16, 66, 70)}
  </svg>`;
}
