// v0.24: the view from the balcony, all the way round (Mark: the painted picture there "breaks reality").
// The estate is built from boxes: your own block's façade on both sides of you, other panel blocks across the yard with
// lit and dark windows, the ground far below with lamps and trees, and a night sky with the city's glow on the horizon.
// No lights are added (unlit materials), and nothing here is fogged, so it reads from any floor.
import * as THREE from 'three';
import { canvasTex } from '../../core/world.js';
import { rng } from '../logic/rng.js';

const STOREY = 2.8;

/** A window grid: cols x rows windows, some lit. One texture per block, so the pattern never repeats on it. */
function facadeTex(r, cols, rows, lit = 0.28) {
  const W = cols * 8, H = rows * 10;
  const t = canvasTex(W, H, c => {
    c.fillStyle = '#2f3139'; c.fillRect(0, 0, W, H);                                    // the panels
    for (let y = 0; y < rows; y++) { c.fillStyle = 'rgba(0,0,0,.18)'; c.fillRect(0, y * 10 + 9, W, 1); }   // the seams between storeys
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      const on = r() < lit, warm = r();
      c.fillStyle = on ? (warm < 0.7 ? `rgb(${235 + r() * 20 | 0},${185 + r() * 40 | 0},${110 + r() * 40 | 0})` : warm < 0.9 ? '#a8c8ff' : '#7ae0ff') : `rgb(${22 + r() * 14 | 0},${26 + r() * 14 | 0},${36 + r() * 16 | 0})`;
      c.fillRect(x * 8 + 2, y * 10 + 2, 4, 5);
      if (on && r() < 0.3) { c.fillStyle = 'rgba(40,20,10,.55)'; c.fillRect(x * 8 + 2, y * 10 + 2, 2, 5); }   // a curtain
    }
  });
  t.magFilter = THREE.NearestFilter; t.minFilter = THREE.LinearFilter;
  return t;
}
const unlit = (map, color = 0xffffff) => new THREE.MeshBasicMaterial({ map, color, fog: false });

/** One panel block: a box with windows on the long sides and plain gables. x,z = centre of its base. */
function block(g, r, x, z, w, d, floors, rotY, ground, shade = 1) {
  const h = floors * STOREY, cols = Math.round(w / 2.4);
  const front = facadeTex(r, cols, floors), back = facadeTex(r, cols, floors, 0.15);
  const gable = new THREE.MeshBasicMaterial({ color: new THREE.Color(0x26282e).multiplyScalar(shade), fog: false });
  const roof = new THREE.MeshBasicMaterial({ color: 0x1a1b20, fog: false });
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [gable, gable, roof, roof, unlit(front, new THREE.Color(1, 1, 1).multiplyScalar(shade)), unlit(back, new THREE.Color(1, 1, 1).multiplyScalar(shade))]);
  m.position.set(x, ground + h / 2, z); m.rotation.y = rotY; g.add(m);
  return m;
}

/**
 * @param {THREE.Group} g the flat's root
 * @param {{x0:number,x1:number,z0:number,z1:number}} bal the balcony (outside is towards -z)
 * @param {number} floor your floor (1..10)
 * @param {{x0:number,x1:number}} flat the flat's extent along x (its outer wall is at z = bal.z1)
 */
export function buildEstate(g, bal, floor, flat) {
  const r = rng(4242 + floor), ground = -floor * STOREY - 0.2, wallZ = bal.z1 - 0.06, est = new THREE.Group(); g.add(est);
  // the sky: dark blue above, the orange glow of the city at the horizon, a few stars
  const sky = canvasTex(64, 256, c => {
    const gr = c.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, '#04060d'); gr.addColorStop(0.42, '#0b1222'); gr.addColorStop(0.5, '#2a2430'); gr.addColorStop(0.54, '#3b2a28'); gr.addColorStop(0.6, '#0a0b10'); gr.addColorStop(1, '#050507');
    c.fillStyle = gr; c.fillRect(0, 0, 64, 256);
    for (let i = 0; i < 40; i++) { c.fillStyle = `rgba(255,255,255,${0.2 + r() * 0.5})`; c.fillRect(r() * 64 | 0, r() * 100 | 0, 1, 1); }
  });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(260, 24, 16), new THREE.MeshBasicMaterial({ map: sky, side: THREE.BackSide, fog: false, depthWrite: false }));
  dome.position.set((bal.x0 + bal.x1) / 2, 0, bal.z0); dome.renderOrder = -1; est.add(dome);
  // the ground: the yard between the blocks, paths and grass
  const yard = canvasTex(128, 128, c => {
    c.fillStyle = '#0d120d'; c.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 500; i++) { c.fillStyle = `rgba(${30 + r() * 20 | 0},${40 + r() * 25 | 0},${28 + r() * 15 | 0},.6)`; c.fillRect(r() * 128 | 0, r() * 128 | 0, 2, 2); }
    c.fillStyle = '#1e1f22'; c.fillRect(0, 56, 128, 10); c.fillRect(60, 0, 8, 128);   // paths
  });
  yard.wrapS = yard.wrapT = THREE.RepeatWrapping; yard.repeat.set(6, 6); yard.magFilter = THREE.NearestFilter;
  const gm = new THREE.Mesh(new THREE.PlaneGeometry(500, 500), unlit(yard, 0x9a9a9a)); gm.rotation.x = -Math.PI / 2; gm.position.set(0, ground, -80); est.add(gm);
  // your own block: the façade to the left and right of your flat, and above and below it
  const fx0 = flat.x0 - 0.05, fx1 = flat.x1 + 0.05, top = (Math.max(floor, 9) + 1 - floor) * STOREY;   // ten storeys, you are on `floor`
  const own = (x0, x1, y0, y1) => {
    if (x1 - x0 < 0.1 || y1 - y0 < 0.1) return;
    const cols = Math.max(1, Math.round((x1 - x0) / 2.4)), rows = Math.max(1, Math.round((y1 - y0) / STOREY));
    const t = facadeTex(r, cols, rows, 0.22), m = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, y1 - y0), unlit(t, 0x9a9aa4));
    m.rotation.y = Math.PI; m.position.set((x0 + x1) / 2, (y0 + y1) / 2, wallZ); est.add(m);   // faces outwards (-z)
  };
  own(fx0 - 30, fx0, ground, top); own(fx1, fx1 + 30, ground, top);
  own(fx0, fx1, ground, -0.05); own(fx0, fx1, STOREY - 0.05, top);
  // the other blocks round the yard
  const B = [
    [-6, -48, 54, 12, 10, 0, 0.9], [44, -60, 42, 12, 11, 0.25, 0.8], [-58, -66, 40, 12, 10, -0.35, 0.75],
    [10, -105, 70, 12, 15, 0, 0.6], [-95, -25, 46, 12, 10, Math.PI / 2 - 0.1, 0.7], [100, -30, 50, 12, 10, -Math.PI / 2 + 0.15, 0.7],
    [-40, -140, 60, 12, 14, 0.1, 0.5], [70, -150, 60, 12, 13, -0.1, 0.5],
  ];
  for (const [x, z, w, d, fl, ry, sh] of B) block(est, r, x, z, w, d, fl, ry, ground, sh);
  // lamps along the paths, and dark trees
  const lampM = new THREE.MeshBasicMaterial({ color: 0xffd090, fog: false }), poolM = new THREE.MeshBasicMaterial({ color: 0x3a2a14, fog: false, transparent: true, opacity: 0.3, depthWrite: false });
  for (let i = 0; i < 14; i++) {
    const x = -70 + i * 11, z = -26 + (i % 2) * 2;
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.35, 6, 4), lampM); b.position.set(x, ground + 4.2, z); est.add(b);
    const p = new THREE.Mesh(new THREE.CircleGeometry(3, 10), poolM); p.rotation.x = -Math.PI / 2; p.position.set(x, ground + 0.05, z); est.add(p);
  }
  const treeM = new THREE.MeshBasicMaterial({ color: 0x0c1a10, fog: false });
  for (let i = 0; i < 26; i++) {
    const x = -80 + r() * 160, z = -14 - r() * 34; if (Math.abs(z + 26) < 3) continue;
    const t = new THREE.Mesh(new THREE.IcosahedronGeometry(2 + r() * 2.2, 0), treeM); t.position.set(x, ground + 3 + r() * 2, z); est.add(t);
  }
  return est;
}
