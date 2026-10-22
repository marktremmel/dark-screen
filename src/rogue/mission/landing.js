// Dressing one stairwell landing: doors, nameplates, the lift, the noticeboard, the floor number, the plant.
// A normal landing always looks the same; an anomaly changes exactly one thing (content/anomalies.js).
// Local coordinates: the landing floor is y = 0, the back wall (flat doors) is z = 2.2, the lift wall is z = 0 (x < 0),
// the left wall is x = -3.2, the right wall is x = 2.7. The scene places the group at the landing's height.
import * as THREE from 'three';
import { psxMat } from '../../core/render.js';
import { tex } from '../../core/assets.js';
import { texBox, canvasTex, pxText } from '../../core/world.js';
import { ANOMALY, NOTICES } from '../content/anomalies.js';

export const L = { XL: -3.2, XR: 2.7, ZB: 2.2, ZL: 0, WT: 0.1 };
const NAMES = ['KISS', 'MOLNÁR', 'BALOGH'];
const DOOR_X = [-2.45, -0.95, 0.65];

const plateMat = (w, h, draw) => new THREE.MeshLambertMaterial({ map: canvasTex(w, h, draw) });
function planeAt(g, w, h, mat, x, y, z, rotY) { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); m.position.set(x, y, z); m.rotation.y = rotY; g.add(m); return m; }
const flatNo = (floor, i) => floor <= 0 ? i + 1 : floor * 3 + i + 1;

/** A flat door on the back wall (facing the landing). Returns the clickable door mesh. */
function flatDoor(g, x, plateLines, o = {}) {
  const z = L.ZB - L.WT - 0.012;
  texBox(g, null, x - 0.52, 0, z - 0.03, x - 0.45, 2.12, z + 0.02, { color: 0x4a3a2c });
  texBox(g, null, x + 0.45, 0, z - 0.03, x + 0.52, 2.12, z + 0.02, { color: 0x4a3a2c });
  texBox(g, null, x - 0.52, 2.05, z - 0.03, x + 0.52, 2.12, z + 0.02, { color: 0x4a3a2c });
  const door = planeAt(g, 0.9, 2.05, psxMat({ map: tex('rg_flatdoor'), color: o.tint || 0xc8b8a0 }), x, 1.025, z, Math.PI);
  // nameplate: flat number and surname, brass
  planeAt(g, 0.24, 0.09, plateMat(64, 24, c => {
    c.fillStyle = '#b8954a'; c.fillRect(0, 0, 64, 24); c.fillStyle = '#2a1e0c'; c.font = '16px m5x7'; c.textBaseline = 'top';
    pxText(c, plateLines[0], 3, 0, 16); pxText(c, plateLines[1], 3, 11, 16);
  }), x, 1.5, z - 0.006, Math.PI);
  // peephole
  planeAt(g, 0.03, 0.03, new THREE.MeshBasicMaterial({ color: 0x111111 }), x, 1.62, z - 0.006, Math.PI);
  return door;
}

/** Notices on the cork board drawn small (read them with E). */
function corkBoard(g, notices) {
  const t = canvasTex(96, 72, c => {
    c.fillStyle = '#9a7244'; c.fillRect(0, 0, 96, 72);
    for (let i = 0; i < 120; i++) { c.fillStyle = `rgba(60,35,10,${Math.random() * 0.3})`; c.fillRect(Math.random() * 96, Math.random() * 72, 1, 1); }
    c.fillStyle = '#5a3a1a'; c.fillRect(0, 0, 96, 3); c.fillRect(0, 69, 96, 3); c.fillRect(0, 0, 3, 72); c.fillRect(93, 0, 3, 72);
    notices.forEach((n, i) => {
      const x = 7 + i * 44, y = 7 + i * 4, red = /WARNING/.test(n[0]);
      c.fillStyle = '#ece6d6'; c.fillRect(x, y, 38, 52);
      if (red) { c.fillStyle = '#c0392b'; c.fillRect(x, y, 38, 4); c.fillRect(x, y + 48, 38, 4); }
      c.fillStyle = '#222'; for (let l = 0; l < 7; l++) c.fillRect(x + 3, y + 10 + l * 5, 18 + ((l * 7 + i * 3) % 14), 1);
      c.fillStyle = red ? '#c0392b' : '#333'; c.fillRect(x + 3, y + 5, 30, 2);
      c.fillStyle = '#d33'; c.fillRect(x + 17, y + 1, 3, 3);
    });
  });
  const board = planeAt(g, 0.82, 0.62, new THREE.MeshLambertMaterial({ map: t }), L.XL + L.WT + 0.012, 1.5, 0.62, Math.PI / 2);
  return board;
}

/**
 * Build a landing's props into group g.
 * @param {THREE.Group} g
 * @param {{kind:'start'|'normal'|'lobby', number:number, anomaly:string|null}} spec
 * @param {{nick:string, floor:number, live:boolean}} ctx live: this is the landing you stand on (gets interactions)
 * @returns {{items: {obj: THREE.Object3D, kind: string, data?: any}[], lampColor: number, blink: THREE.Mesh|null, door3: THREE.Vector3}}
 */
export function dressLanding(g, spec, ctx) {
  const a = spec.anomaly ? ANOMALY[spec.anomaly] : null, w = a ? a.where : '';
  const items = []; const nick = (ctx.nick || 'YOU').toUpperCase().slice(0, 10);
  const lobby = spec.kind === 'lobby', start = spec.kind === 'start';

  // floor number, stencilled on the right wall
  const label = lobby ? 'FÖLDSZINT' : spec.number + '. EMELET';
  const num = planeAt(g, 1.05, 0.34, plateMat(128, 40, c => {
    c.fillStyle = '#d9d4c4'; c.fillRect(0, 0, 128, 40); c.fillStyle = '#1b1b1b'; c.font = '32px m5x7'; c.textBaseline = 'top';
    const wdt = c.measureText(label).width; pxText(c, label, Math.max(2, (128 - wdt) / 2), 4, 32);
  }), L.XR - L.WT - 0.012, 1.85, 1.1, -Math.PI / 2);
  num.material.transparent = false;
  if (w === 'floorNumber') num.scale.x = -1;

  // three flat doors (on the ground floor the middle one is the street door)
  DOOR_X.forEach((x, i) => {
    if (lobby && i === 1) return;
    const no = flatNo(spec.number, i);
    let name = NAMES[i];
    if (start && i === 1) name = nick;                 // your own door
    if (w === 'door2' && i === 1) name = nick;         // ...but not on anyone else's floor
    const d = flatDoor(g, x, [String(no), name]);
    items.push({ obj: d, kind: start && i === 1 ? 'yourdoor' : 'door', data: { no, name } });
  });
  // doormat in front of the middle door
  const mat = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.45), psxMat({ color: 0x5a4632 })); mat.rotation.x = -Math.PI / 2; mat.position.set(DOOR_X[1], 0.006, L.ZB - 0.4); if (!lobby) g.add(mat);

  // the lift: door, indicator, a plaque or a note on the door
  const liftX = -1.7, lz = L.ZL + 0.012;
  const liftDoor = planeAt(g, 1.0, 2.0, psxMat({ map: canvasTex(48, 96, c => {
    c.fillStyle = '#7d8288'; c.fillRect(0, 0, 48, 96); c.fillStyle = '#6a6e74'; c.fillRect(23, 0, 2, 96);
    c.fillStyle = '#1a1c20'; c.beginPath(); c.arc(24, 30, 6, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#9aa0a6'; for (let y = 4; y < 96; y += 9) c.fillRect(2, y, 44, 1);
  }) }), liftX, 1.0, lz, 0);
  items.push({ obj: liftDoor, kind: 'lift' });
  texBox(g, null, liftX - 0.58, 0, lz - 0.02, liftX - 0.5, 2.1, lz + 0.03, { color: 0x3c4046 });
  texBox(g, null, liftX + 0.5, 0, lz - 0.02, liftX + 0.58, 2.1, lz + 0.03, { color: 0x3c4046 });
  texBox(g, null, liftX - 0.58, 2.02, lz - 0.02, liftX + 0.58, 2.1, lz + 0.03, { color: 0x3c4046 });
  const disp = w === 'liftDisplay' ? 'SZIA ' + nick : (lobby ? 'F' : String(spec.number));
  planeAt(g, 0.36, 0.12, new THREE.MeshBasicMaterial({ map: canvasTex(72, 24, c => {
    c.fillStyle = '#120802'; c.fillRect(0, 0, 72, 24); c.fillStyle = '#ffb030'; c.font = '16px m5x7'; c.textBaseline = 'top';
    const tw = c.measureText(disp).width; pxText(c, disp, Math.max(2, (72 - tw) / 2), 4, 16);
  }), fog: false }), liftX, 2.3, lz, 0);
  const wifi = w === 'liftDoor';
  const note = planeAt(g, wifi ? 0.2 : 0.24, wifi ? 0.2 : 0.14, new THREE.MeshLambertMaterial({ map: canvasTex(32, 24, c => {
    c.fillStyle = wifi ? '#f4e04a' : '#d8dde2'; c.fillRect(0, 0, 32, 24); c.fillStyle = '#333';
    for (let l = 0; l < 4; l++) c.fillRect(3, 4 + l * 5, 18 + (l * 5) % 9, 1);
    if (wifi) { c.fillStyle = '#d0306a'; c.fillRect(24, 3, 5, 5); }
  }) }), liftX + 0.22, 1.45, lz + 0.004, 0);
  items.push({ obj: note, kind: 'notice', data: { title: 'A note on the lift door', notices: [NOTICES[wifi ? 'liftDoor_wifi' : 'liftDoor']] } });

  // the light switch (glows orange in the dark, like every Hungarian stairwell)
  texBox(g, null, -0.5, 1.15, lz - 0.01, -0.38, 1.29, lz + 0.03, { color: 0xe8e2d0 });
  const btn = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.02), new THREE.MeshBasicMaterial({ color: 0xff8a1a, fog: false }));
  btn.position.set(-0.44, 1.22, lz + 0.035); g.add(btn);
  items.push({ obj: btn, kind: 'switch' });
  const swHit = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.22, 0.05), new THREE.MeshBasicMaterial({ visible: false })); swHit.position.copy(btn.position); g.add(swHit);
  items.push({ obj: swHit, kind: 'switch' });

  // the noticeboard
  const ns = [NOTICES.lift, NOTICES.cat];
  if (a && a.where === 'noticeboard') { if (a.notice.startsWith('cat')) ns[1] = NOTICES[a.notice]; else ns[0] = NOTICES[a.notice]; }
  const board = corkBoard(g, ns);
  items.push({ obj: board, kind: 'notice', data: { title: 'The noticeboard (hirdetőtábla)', notices: ns } });

  // a rubber plant by the stairs
  if (w !== 'plant') {
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.13, 0.32, 8), psxMat({ color: 0xa0522d })); pot.position.set(2.3, 0.16, 1.9); g.add(pot);
    const leafM = psxMat({ color: 0x2f5a2a });
    for (let i = 0; i < 7; i++) { const lf = new THREE.Mesh(new THREE.SphereGeometry(0.16, 6, 4), leafM); lf.scale.set(1, 0.35, 0.6); const an = i * 0.9; lf.position.set(2.3 + Math.cos(an) * 0.14, 0.45 + i * 0.09, 1.9 + Math.sin(an) * 0.14); lf.rotation.y = an; g.add(lf); }
  }

  // anomaly-only extras
  let blink = null;
  if (w === 'ceiling') {
    const cam = texBox(g, null, -1.12, 2.38, 2.0, -0.92, 2.5, 2.1, { color: 0x2a2a2e });
    blink = new THREE.Mesh(new THREE.SphereGeometry(0.018, 6, 4), new THREE.MeshBasicMaterial({ color: 0xff2020, fog: false })); blink.position.set(-1.02, 2.4, 1.99); g.add(blink);
    cam.rotation.x = 0.3;
  }
  if (w === 'leftWall') {
    const d = planeAt(g, 0.9, 2.05, psxMat({ map: tex('rg_flatdoor'), color: 0x9a8a78 }), L.XL + L.WT + 0.012, 1.025, 1.65, Math.PI / 2);
    items.push({ obj: d, kind: 'door', data: { no: '?', name: '' } });
  }

  // your own floor: the house rules by your door, and the way up is closed
  if (start) {
    const rules = planeAt(g, 0.42, 0.56, new THREE.MeshLambertMaterial({ map: canvasTex(42, 56, c => {
      c.fillStyle = '#efe9da'; c.fillRect(0, 0, 42, 56); c.fillStyle = '#7a1e1e'; c.fillRect(0, 0, 42, 7);
      c.fillStyle = '#333'; for (let l = 0; l < 8; l++) c.fillRect(4, 11 + l * 5, 24 + (l * 7) % 10, 1);
    }) }), DOOR_X[1] + 0.82, 1.45, L.ZB - L.WT - 0.012, Math.PI);
    items.push({ obj: rules, kind: 'rules' });
    grille(g, 1.45, 2.7, -0.18, 'PADLÁS');
  }
  // the ground floor: post boxes, the street door, the cellar closed
  if (lobby) {
    const pb = planeAt(g, 1.3, 0.8, psxMat({ map: canvasTex(104, 64, c => {
      c.fillStyle = '#4b5a46'; c.fillRect(0, 0, 104, 64);
      for (let r = 0; r < 4; r++) for (let k = 0; k < 6; k++) { c.fillStyle = '#6d7d66'; c.fillRect(3 + k * 17, 3 + r * 15, 15, 13); c.fillStyle = '#1b1b1b'; c.fillRect(6 + k * 17, 6 + r * 15, 9, 2); c.fillStyle = '#d8c070'; c.fillRect(14 + k * 17, 10 + r * 15, 2, 2); }
    }) }), L.XL + L.WT + 0.012, 1.25, 1.55, Math.PI / 2);
    items.push({ obj: pb, kind: 'postbox' });
    const sx = DOOR_X[1], z = L.ZB - L.WT - 0.012;
    const street = planeAt(g, 1.3, 2.3, psxMat({ map: canvasTex(52, 92, c => {
      c.fillStyle = '#5a4a36'; c.fillRect(0, 0, 52, 92); c.fillStyle = '#1d2a3a'; c.fillRect(5, 6, 18, 56); c.fillRect(29, 6, 18, 56);
      c.fillStyle = 'rgba(255,190,90,.35)'; c.fillRect(5, 6, 18, 20); c.fillRect(29, 6, 18, 20); c.fillStyle = '#2c2218'; c.fillRect(25, 0, 2, 92);
      c.fillStyle = '#c9a248'; c.fillRect(20, 50, 3, 8); c.fillRect(29, 50, 3, 8);
    }) }), sx, 1.15, z, Math.PI);
    items.push({ obj: street, kind: 'street' });
    grille(g, 0, 1.2, -0.18, 'PINCE');
  }
  return { items, lampColor: w === 'lamp' ? 0xff2a1a : 0xffd9a0, blink, door3: new THREE.Vector3(DOOR_X[2], 1.2, L.ZB) };
}

/** A locked metal grille across a flight, with a small sign. */
function grille(g, x0, x1, z, sign) {
  const m = psxMat({ color: 0x2f3a32 });
  for (let x = x0 + 0.06; x < x1; x += 0.12) texBox(g, null, x - 0.012, 0, z - 0.012, x + 0.012, 2.3, z + 0.012, { color: 0x2f3a32 });
  texBox(g, null, x0, 1.05, z - 0.02, x1, 1.1, z + 0.02, { color: 0x2f3a32 }); texBox(g, null, x0, 2.25, z - 0.02, x1, 2.3, z + 0.02, { color: 0x2f3a32 });
  planeAt(g, 0.4, 0.14, plateMat(48, 16, c => { c.fillStyle = '#c8c0a8'; c.fillRect(0, 0, 48, 16); c.fillStyle = '#7a1e1e'; c.font = '16px m5x7'; c.textBaseline = 'top'; pxText(c, sign, 3, 1, 16); }), (x0 + x1) / 2, 1.35, z + 0.03, 0);
  void m;
}
