// The outdoor walks added in v0.17 (Mark's list item 3): the courtyard and playground, the alley, the bus station.
// Each is a straight stretch about 60 m long (like the park), dressed differently, with a fixed number of lights
// (never add lights during play), an exit at the far end and the same three waves of figures.
// buildStreet(walk, g) fills in what Walk needs: route, spawn, exitAt, gateCol/gateBars, lamps, drone, amb, intro.
import * as THREE from 'three';
import { texBox, plane, place, canvasTex } from '../../core/world.js';
import { psxMat } from '../../core/render.js';
import { A, tex } from '../../core/assets.js';

export const STREETS = {
  courtyard: { len: 62, hw: 11, bg: 0x0a0d14, fog: [3, 22], hemi: [0x8a9ac8, 0x1a2014, 0.68], rain: false, exitName: 'the archway',
    drone: 'rg_drone_stair', amb: 'amb_woods',
    intro: 'You step out into the courtyard between the blocks.\nFog sits on the playground. The archway on the far side leads out.' },
  alley: { len: 58, hw: 2.3, bg: 0x060509, fog: [2, 15], hemi: [0x8a7aa0, 0x100c0c, 0.32], rain: true, exitName: 'the gate at the end of the alley',
    drone: 'rg_drone_stair', amb: 'rain',
    intro: 'A shortcut through the alley behind the shops.\nShutters, bins, a red bulb over a back door. It is raining.' },
  bus: { len: 60, hw: 9, bg: 0x070912, fog: [3, 24], hemi: [0x8090b0, 0x10141a, 0.42], rain: true, exitName: 'the night bus',
    drone: 'rg_drone_stair', amb: 'rain',
    intro: 'The bus station. Rain on the asphalt, the buses parked for the night.\nOne of them, at the far end, has its lights on.' },
};

/** Rain: short streaks that fall around the camera and wrap (cheap: one LineSegments). */
export function makeRain(scene, n = 700) {
  const pos = new Float32Array(n * 6), geo = new THREE.BufferGeometry(), R = 11, H = 9;
  const drops = Array.from({ length: n }, () => ({ x: (Math.random() - 0.5) * 2 * R, y: Math.random() * H, z: (Math.random() - 0.5) * 2 * R, v: 9 + Math.random() * 4 }));
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const lines = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0x9aaac0, transparent: true, opacity: 0.45, fog: true }));
  lines.frustumCulled = false; scene.add(lines);
  return (dt, c) => {
    for (let i = 0; i < n; i++) {
      const d = drops[i]; d.y -= d.v * dt;
      if (d.y < 0) { d.y += H; d.x = (Math.random() - 0.5) * 2 * R; d.z = (Math.random() - 0.5) * 2 * R; }
      const x = c.x + d.x, z = c.z + d.z, k = i * 6;
      pos[k] = x; pos[k + 1] = d.y; pos[k + 2] = z; pos[k + 3] = x + 0.02; pos[k + 4] = d.y + 0.32; pos[k + 5] = z;
    }
    geo.attributes.position.needsUpdate = true;
  };
}

/** BKV blue: recolour the Ikarus palette (orange and yellow become blue; pure reds, the lights, stay). Cached. */
let blueTex = null;
function blueBus(o) {
  o.traverse(m => {
    if (!m.isMesh) return;
    m.geometry.computeBoundingBox(); const b = m.geometry.boundingBox;
    if (b.max.y - b.min.y < 0.01 && b.max.x - b.min.x > 100) { m.visible = false; return; }   // the round shadow disc under the model
    const mat = m.material; if (!mat || !mat.map || !mat.map.image) return;
    if (!blueTex) {
      const im = mat.map.image, c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
      const x = c.getContext('2d'); x.drawImage(im, 0, 0); const d = x.getImageData(0, 0, c.width, c.height), p = d.data;
      for (let i = 0; i < p.length; i += 4) {
        const r = p[i] / 255, g = p[i + 1] / 255, bl = p[i + 2] / 255, mx = Math.max(r, g, bl), mn = Math.min(r, g, bl), l = (mx + mn) / 2, s = mx === mn ? 0 : (mx - mn) / (1 - Math.abs(2 * l - 1));
        let h = 0; if (mx !== mn) { if (mx === r) h = ((g - bl) / (mx - mn) + 6) % 6; else if (mx === g) h = (bl - r) / (mx - mn) + 2; else h = (r - g) / (mx - mn) + 4; } h *= 60;
        if (s > 0.35 && h > 10 && h < 62) {   // orange to yellow: the body colour -> BKV blue (hue 214)
          const C = (1 - Math.abs(2 * l - 1)) * s, H2 = 214 / 60, X = C * (1 - Math.abs(H2 % 2 - 1)), m0 = l - C / 2;
          const [r1, g1, b1] = H2 < 4 ? [0, X, C] : [X, 0, C];
          p[i] = (r1 + m0) * 255; p[i + 1] = (g1 + m0) * 255; p[i + 2] = (b1 + m0) * 255;
        }
      }
      x.putImageData(d, 0, 0); blueTex = new THREE.CanvasTexture(c); blueTex.colorSpace = mat.map.colorSpace; blueTex.flipY = mat.map.flipY;
      blueTex.magFilter = THREE.NearestFilter; blueTex.minFilter = THREE.NearestFilter; blueTex.wrapS = mat.map.wrapS; blueTex.wrapT = mat.map.wrapT;
    }
    m.material = mat.clone(); m.material.map = blueTex;
  });
  return o;
}

export function buildStreet(W, g, kind) {
  const S = STREETS[kind], col = W.col, r = W.r, L = S.len, hw = S.hw, Z_END = W.zEnd = -L;
  W.scene.add(new THREE.HemisphereLight(...S.hemi));
  const moon = new THREE.DirectionalLight(0xa8b8ff, 0.22); moon.position.set(-20, 30, 10); W.scene.add(moon);
  W.lamps = []; W.windows = [];
  const lampPost = (x, z, h = 3.6, color = 0xffc880, i = 0, broken = false) => {
    texBox(g, null, x - 0.06, 0, z - 0.06, x + 0.06, h, z + 0.06, { color: 0x262a2c });
    const bm = new THREE.MeshBasicMaterial({ color: 0xffd9a0, fog: false });
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), bm); b.position.set(x, h, z); g.add(b);
    const Lt = new THREE.PointLight(color, 4.5, 13, 1.3); Lt.position.set(x, h - 0.2, z); g.add(Lt);
    W.lamps.push({ L: Lt, bm, broken, base: 4.5 });
    col.push({ x0: x - 0.15, x1: x + 0.15, z0: z - 0.15, z1: z + 0.15 });
  };
  // panel-block facades along a side: storeys of 3 m, panels of 2 m, some windows lit
  const facade = (x, face, storeys, z0, z1, lit = 0.25, graffiti = 0) => {
    const rot = face > 0 ? 90 : -90;
    for (let z = z0; z > z1; z -= 2) for (let fy = 0; fy < storeys; fy++) {
      const name = fy === 0 ? (r() < graffiti ? 'bk_wall_panel_graffiti' : r() < 0.15 ? 'bk_wall_doorway_panel' : 'bk_wall_panel') : 'bk_wall_window_panel';
      place(g, name, x, fy * 3, z - 1, rot);
      if (name === 'bk_wall_window_panel' && r() < lit) {
        const w = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.0), new THREE.MeshBasicMaterial({ color: r() < 0.5 ? 0xe8b860 : 0x8fa8e0, fog: true }));
        w.position.set(x + face * 0.09, fy * 3 + 1.6, z - 1); w.rotation.y = face > 0 ? Math.PI / 2 : -Math.PI / 2; g.add(w); W.windows.push(w);
      }
    }
    texBox(g, null, face > 0 ? x - 9 : x + 0.12, 0, z1, face > 0 ? x - 0.12 : x + 9, storeys * 3, z0, { color: 0x15161a });
    col.push(face > 0 ? { x0: x - 9, x1: x + 0.25, z0: z1, z1: z0 } : { x0: x - 0.25, x1: x + 9, z0: z1, z1: z0 });
  };
  const gate = (x0, x1, z) => {
    W.gateBars = new THREE.Group(); g.add(W.gateBars);
    for (let x = x0 + 0.05; x <= x1 - 0.04; x += 0.18) texBox(W.gateBars, null, x - 0.02, 0, z - 0.02, x + 0.02, 2.1, z + 0.02, { color: 0x1e2220 });
    texBox(W.gateBars, null, x0, 2.0, z - 0.03, x1, 2.08, z + 0.03, { color: 0x1e2220 });
    W.gateCol = { x0, x1, z0: z - 0.15, z1: z + 0.15 }; col.push(W.gateCol);
  };
  const shutterTex = canvasTex(64, 64, c => { c.fillStyle = '#5a5e64'; c.fillRect(0, 0, 64, 64); for (let y = 0; y < 64; y += 4) { c.fillStyle = y % 8 ? '#6a6e74' : '#44474c'; c.fillRect(0, y, 64, 2); } c.fillStyle = 'rgba(30,20,10,.35)'; c.fillRect(0, 50, 64, 14); });
  const puddle = (x, z, w, d) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ color: 0x1a2230, transparent: true, opacity: 0.75, fog: true, polygonOffset: true, polygonOffsetFactor: -2 })); m.rotation.x = -Math.PI / 2; m.position.set(x, 0.015, z); g.add(m); return m; };

  if (kind === 'courtyard') {
    const gr = new THREE.Mesh(new THREE.PlaneGeometry(hw * 2 + 2, L + 12), psxMat({ map: tex('grass', 16, 30), color: 0x5a6a4c })); gr.rotation.x = -Math.PI / 2; gr.position.set(0, 0, -L / 2 + 2); g.add(gr);
    plane(g, 'rg_asphalt', -1.3, Z_END - 1, 1.3, 5, 0.012, { tile: 2, color: 0x9a9a9a });
    W.buildBlock(g, 5.6);
    facade(-hw, 1, 4, 4, Z_END - 1, 0.25, 0.25); facade(hw, -1, 4, 4, Z_END - 1, 0.25, 0.25);
    // the far side: another block with an archway through it
    for (let ix = -5; ix <= 5; ix++) for (let fy = 0; fy < 4; fy++) {
      if (fy === 0 && Math.abs(ix) <= 1) continue;
      place(g, fy === 0 ? 'bk_wall_panel' : 'bk_wall_window_panel', ix * 2, fy * 3, Z_END - 0.2, 0);
    }
    texBox(g, null, -11, 0, Z_END - 9, -3, 12, Z_END - 0.3, { color: 0x15161a, col }); texBox(g, null, 3, 0, Z_END - 9, 11, 12, Z_END - 0.3, { color: 0x15161a, col });
    texBox(g, null, -3, 3, Z_END - 9, 3, 12, Z_END - 0.3, { color: 0x15161a });
    plane(g, null, -3, Z_END - 9, 3, Z_END - 0.3, 0.01, { color: 0x101114 });
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(6, 3), new THREE.MeshBasicMaterial({ color: 0x3a4250, fog: false })); glow.position.set(0, 1.5, Z_END - 8.9); g.add(glow);   // the street beyond the archway
    gate(-3, 3, Z_END + 0.1);
    // the playground (Mark's model, real size), turned so it fits beside the path; the rocket climbing frame; a sandbox; a carpet rack
    place(g, 'playground', -6.3, 0, -27, 90); col.push({ x0: -11, x1: -1.7, z0: -33.5, z1: -20.5 });
    place(g, 'bk_rocket', 6, 0, -15, 30, { col, shrink: 0.2 });
    texBox(g, null, 4, 0, -43, 8, 0.25, -42.85, { color: 0x6a5a40, col }); texBox(g, null, 4, 0, -46.15, 8, 0.25, -46, { color: 0x6a5a40, col });
    texBox(g, null, 4, 0, -46, 4.15, 0.25, -43, { color: 0x6a5a40, col }); texBox(g, null, 7.85, 0, -46, 8, 0.25, -43, { color: 0x6a5a40, col });
    plane(g, null, 4.15, -45.85, 7.85, -43.15, 0.12, { color: 0xb8a070 });
    for (const x of [-7.5, -4.5]) texBox(g, null, x - 0.05, 0, -48.05, x + 0.05, 1.9, -47.95, { color: 0x2a3a30, col });
    texBox(g, null, -7.5, 1.6, -48.04, -4.5, 1.66, -47.96, { color: 0x2a3a30 }); texBox(g, null, -7.5, 1.1, -48.04, -4.5, 1.14, -47.96, { color: 0x2a3a30 });
    place(g, 'kiosk', 8, 0, -52, -90, { col, shrink: 0.05 });
    [[-3, -8], [3, -36], [-3, -40], [3, -54]].forEach(([x, z]) => place(g, 'bk_bench_entrance', x, 0, z, x < 0 ? 90 : -90, { col }));
    [[-3, -12], [3, -30], [-3, -50]].forEach(([x, z]) => place(g, 'bk_bin_container', x, 0, z, x < 0 ? 90 : -90, { col }));
    const trees = ['nat_commontree_1', 'nat_commontree_2', 'nat_commontree_3'];
    for (let i = 0; i < 9; i++) { const z = -4 - i * 6.5 - r() * 2, x = (i % 2 ? 1 : -1) * (8.4 + r() * 1.2); if (A.models[trees[i % 3]]) place(g, trees[i % 3], x, 0, z, r() * 360).scale.multiplyScalar(0.9 + r() * 0.3); col.push({ x0: x - 0.3, x1: x + 0.3, z0: z - 0.3, z1: z + 0.3 }); }
    for (let i = 0; i < 14; i++) if (A.models.nat_bush_common) place(g, 'nat_bush_common', (r() < 0.5 ? -1 : 1) * (2.5 + r() * 6), 0, -2 - r() * (L - 6), r() * 360);
    [-2, -14, -26, -38, -50, -58].forEach((z, i) => lampPost(i % 2 ? 1.9 : -1.9, z, 3.6, 0xffc880, i, i === 3));
  }

  if (kind === 'alley') {
    plane(g, 'rg_asphalt', -hw, Z_END - 1, hw, 5, 0, { tile: 1.6, color: 0x7a7a80 });
    facade(-hw, 1, 2, 4, Z_END - 1, 0.12, 0.2); facade(hw, -1, 2, 4, Z_END - 1, 0.12, 0.2);
    texBox(g, null, -hw, 0, 4.6, hw, 6, 5, { color: 0x1a1a1e, col });
    const back = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 2.05), psxMat({ map: tex('rg_flatdoor'), color: 0x8a7a68 })); back.position.set(0, 1.025, 4.58); back.rotation.y = Math.PI; g.add(back);
    // clutter along both walls: shutters, back doors, bins, crates, air-con boxes
    const sideStuff = [];
    for (let z = -2; z > Z_END + 3; z -= 3.2) for (const side of [-1, 1]) {
      const x = side * hw, k = r();
      if (k < 0.3) { const m = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 2.3), psxMat({ map: shutterTex })); m.position.set(x - side * 0.06, 1.15, z); m.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2; g.add(m); }
      else if (k < 0.45) { const d = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 2.0), psxMat({ map: tex('rg_flatdoor'), color: 0x6a7a70 })); d.position.set(x - side * 0.06, 1.0, z); d.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2; g.add(d); sideStuff.push({ x: x - side * 0.3, z, door: true }); }
      else if (k < 0.65) place(g, 'bk_bin_container', x - side * 0.55, 0, z, side > 0 ? -90 : 90, { col, shrink: 0.05 });
      else if (k < 0.8) { const s = 0.5 + r() * 0.3; texBox(g, null, x - side * (0.15 + s), 0, z - s / 2, x - side * 0.15, s, z + s / 2, { color: 0x5a4430, col }); }
      if (r() < 0.3) texBox(g, null, x - side * 0.5, 3.2, z - 0.4, x - side * 0.08, 3.7, z + 0.4, { color: 0x8a8e90 });   // an air-con box
    }
    for (let z = -4; z > Z_END; z -= 7) { const y = 4.2 + r() * 1.2; const c = texBox(g, null, -hw, y, z - 0.02, hw, y + 0.03, z + 0.02, { color: 0x0a0a0c }); c.rotation.z = (r() - 0.5) * 0.15; }   // cables overhead
    for (let i = 0; i < 7; i++) puddle((r() - 0.5) * 2.4, -4 - r() * (L - 8), 0.8 + r() * 1.4, 0.6 + r());
    // lights: bulbs over back doors, one of them red (a fixed set of five)
    const spots = [-6, -18, -29, -40, -51];
    spots.forEach((z, i) => {
      const side = i % 2 ? 1 : -1, x = side * (hw - 0.25), red = i === 2;
      const bm = new THREE.MeshBasicMaterial({ color: red ? 0xff3020 : 0xffd9a0, fog: false });
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), bm); b.position.set(x, 2.6, z); g.add(b);
      texBox(g, null, side > 0 ? x : x - 0.25, 2.7, z - 0.12, side > 0 ? x + 0.25 : x, 2.74, z + 0.12, { color: 0x2a2a2a });
      const Lt = new THREE.PointLight(red ? 0xff2a1a : 0xffc070, red ? 5 : 3.6, red ? 10 : 9, 1.4); Lt.position.set(x - side * 0.2, 2.4, z); g.add(Lt);
      W.lamps.push({ L: Lt, bm, broken: i === 4, base: red ? 5 : 3.6 });
      if (red) puddle(x - side * 0.8, z, 1.2, 1.6).material.color.set(0x3a1418);   // the puddle under it catches the red
    });
    // the end: a fence gate onto the lit street
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(hw * 2, 4), new THREE.MeshBasicMaterial({ map: canvasTex(8, 32, c => { const gr = c.createLinearGradient(0, 0, 0, 32); gr.addColorStop(0, '#0c0e14'); gr.addColorStop(0.55, '#2a3040'); gr.addColorStop(1, '#5a5040'); c.fillStyle = gr; c.fillRect(0, 0, 8, 32); }), fog: false })); glow.position.set(0, 2, Z_END - 2); g.add(glow);   // the lit street beyond, sodium-orange at the bottom
    texBox(g, null, -hw, 0, Z_END - 2.1, hw, 0.02, Z_END, { color: 0x2a2c30 });
    gate(-hw, hw, Z_END + 0.1);
    W.backDoors = sideStuff.filter(s => s.door);
  }

  if (kind === 'bus') {
    plane(g, 'rg_asphalt', -hw - 4, Z_END - 6, hw + 4, 6, 0, { tile: 2.2, color: 0x6a6c70 });
    // behind you: the station building you came out of
    for (let x = -7.5; x <= 7.5; x += 5) place(g, 'bd_doors', x, 0, 5, 180);
    texBox(g, null, -10, 0, 5.3, 10, 3.2, 12, { color: 0x15161a, col });
    // the platform island on the left: canopies, benches, the departure board
    texBox(g, 'rg_concrete', -7.5, 0, Z_END + 4, -3.5, 0.15, 2, { tile: 1.5 });
    for (let z = -1; z > Z_END + 8; z -= 5) { place(g, 'bd_canopy', -5.5, 0.15, z - 2.5, 90); }
    [[-5.2, -6], [-5.2, -19], [-5.2, -33], [-5.2, -46]].forEach(([x, z]) => place(g, 'bd_bench', x, 0.15, z, 90, { col }));
    const board = place(g, 'bd_board', -4.2, 1.7, -12, 90);
    const bt = canvasTex(96, 64, c => { c.fillStyle = '#0a0a08'; c.fillRect(0, 0, 96, 64); c.font = '16px m5x7'; c.textBaseline = 'top'; c.fillStyle = '#ffb030'; c.fillText('JÁRAT  IDŐ', 4, 2); c.fillStyle = '#ff7a20'; c.fillText('173   --:--', 4, 18); c.fillText('7E    --:--', 4, 32); c.fillStyle = '#ff3020'; c.fillText('NINCS JÁRAT', 4, 47); });
    const bp = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 1.1), new THREE.MeshBasicMaterial({ map: bt, fog: true })); bp.position.set(-4.12, 2.5, -12); bp.rotation.y = Math.PI / 2; g.add(bp);
    col.push({ x0: -7.5, x1: -3.6, z0: Z_END + 4, z1: 2 });   // the island is a kerb: walk the bus lane
    // the right side: a fence, a ticket booth, a snack machine
    for (let z = 1; z > Z_END; z -= 2) place(g, 'bk_fence_low', hw, 0, z - 1, 90);
    col.push({ x0: hw - 0.2, x1: hw + 9, z0: Z_END - 6, z1: 6 });
    col.push({ x0: -hw - 9, x1: -hw + 0.2, z0: Z_END - 6, z1: 6 });
    texBox(g, null, 5.5, 0, -8, 8.5, 2.6, -4, { color: 0x3a4a5a, col }); place(g, 'bd_counter', 5.4, 0, -6, -90);
    const kt = new THREE.Mesh(new THREE.PlaneGeometry(2.9, 0.4), new THREE.MeshBasicMaterial({ map: canvasTex(96, 14, c => { c.fillStyle = '#1a3a7a'; c.fillRect(0, 0, 96, 14); c.fillStyle = '#e8eef8'; c.font = '16px m5x7'; c.textBaseline = 'top'; c.fillText('JEGYPÉNZTÁR', 10, -2); }), fog: true })); kt.position.set(5.48, 2.3, -6); kt.rotation.y = -Math.PI / 2; g.add(kt);
    place(g, 'bd_snack', 7.8, 0, -10, -90, { col, shrink: 0.05 });
    // the buses: two parked dark, and the night bus at the end with its lights on (the way out)
    const bus = (x, z, rot) => { const o = blueBus(place(g, 'ikarus', x, 0, z, rot)); o.scale.multiplyScalar(1.23); return o; };   // the model is 8.9 m without its shadow disc: an Ikarus 260 is 11 m
    bus(5.6, -24, 0); bus(5.6, -38, 0); bus(-10.5, -30, 0);   // the model runs along z
    const nb = bus(3.2, Z_END + 7, 180);
    col.push({ x0: 4.2, x1: 7, z0: -30, z1: -18 }, { x0: 4.2, x1: 7, z0: -44, z1: -32 }, { x0: 1.9, x1: 4.5, z0: Z_END + 1, z1: Z_END + 13 });
    const inside = new THREE.PointLight(0xfff0c0, 3, 9, 1.4); inside.position.set(3.2, 2.1, Z_END + 7); g.add(inside);
    W.lamps.push({ L: inside, bm: null, broken: false, base: 3 });
    W.exitAt = new THREE.Vector3(1.1, 0, Z_END + 7); W.gateCol = null; W.nightBus = nb;
    for (let i = 0; i < 9; i++) puddle(-2.5 + r() * 5.5, -3 - r() * (L - 8), 1 + r() * 1.8, 0.7 + r() * 1.2);
    [-3, -16, -29, -42, -55].forEach((z, i) => lampPost(i % 2 ? 2.4 : -3.4, z, 5, 0xffb060, i, i === 2));
  } else W.exitAt = new THREE.Vector3(0, 0, Z_END);

  W.route = []; for (let z = 3; z >= Z_END + (kind === 'bus' ? 9 : 1); z -= 2) W.route.push(new THREE.Vector3(kind === 'bus' ? 0.6 : 0, 0, z));
  W.spawn = [kind === 'bus' ? 0.6 : 0, 3.2, 0];
  W.drone = S.drone; W.amb = S.amb; W.intro = S.intro; W.exitName = S.exitName;
  if (S.rain) W.rain = makeRain(W.scene);
}
