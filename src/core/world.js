import * as THREE from 'three';
import { psxMat } from './render.js';
import { A, inst, tex } from './assets.js';

// Box with world-scaled texture repeat. Returns mesh. Adds collider if `col` array given.
export function texBox(group, texName, x0, y0, z0, x1, y1, z1, o = {}) {
  const w = x1 - x0, h = y1 - y0, d = z1 - z0;
  const g = new THREE.BoxGeometry(w, h, d);
  // per-face UV scale so texture density stays constant (tile = o.tile metres)
  const tile = o.tile || 1.2; const uv = g.attributes.uv;
  const faces = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let i = 0; i < 4; i++) { const k = f * 4 + i; uv.setXY(k, uv.getX(k) * faces[f][0] / tile, uv.getY(k) * faces[f][1] / tile); }
  const m = psxMat({ map: texName ? tex(texName) : null, color: o.color || 0xffffff });
  const mesh = new THREE.Mesh(g, m); mesh.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  group.add(mesh);
  if (o.col) o.col.push({ x0, x1, z0, z1, noisy: o.noisy });
  if (o.block) o.block.push(mesh);
  return mesh;
}

// Horizontal plane (floor/ceiling).
export function plane(group, texName, x0, z0, x1, z1, y, o = {}) {
  const w = x1 - x0, d = z1 - z0, tile = o.tile || 1.5;
  const g = new THREE.PlaneGeometry(w, d);
  const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w / tile, uv.getY(i) * d / tile);
  const m = psxMat({ map: texName ? tex(texName) : null, color: o.color || 0xffffff, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(g, m); mesh.rotation.x = o.ceiling ? Math.PI / 2 : -Math.PI / 2; mesh.position.set((x0 + x1) / 2, y, (z0 + z1) / 2);
  group.add(mesh); return mesh;
}

// Wall from (ax,az) to (bx,bz), axis-aligned, with door gaps [[from,to,(topY)]] measured along the wall.
export function wall(group, texName, ax, az, bx, bz, o = {}) {
  const H = o.h || 2.6, T = o.t || 0.12, gaps = (o.gaps || []).slice().sort((a, b) => a[0] - b[0]);
  const alongX = Math.abs(bz - az) < 1e-6;
  const a = alongX ? Math.min(ax, bx) : Math.min(az, bz), b = alongX ? Math.max(ax, bx) : Math.max(az, bz);
  const fixed = alongX ? az : ax;
  const seg = (s, e, y0, y1, collide) => {
    if (e - s < 0.01) return;
    if (alongX) texBox(group, texName, s, y0, fixed - T / 2, e, y1, fixed + T / 2, { col: collide ? o.col : null, block: o.block, tile: o.tile, color: o.color });
    else texBox(group, texName, fixed - T / 2, y0, s, fixed + T / 2, y1, e, { col: collide ? o.col : null, block: o.block, tile: o.tile, color: o.color });
  };
  let cur = a;
  for (const gp of gaps) { seg(cur, gp[0], 0, H, true); seg(gp[0], gp[1], gp[2] || 2.1, H, false); cur = gp[1]; }
  seg(cur, b, 0, H, true);
  if (o.skirt) { // skirting / lower band
    let c2 = a; const sk = (s, e) => { if (e - s < 0.01) return; if (alongX) { texBox(group, o.skirt, s, 0, fixed - T / 2 - 0.01, e, o.skirtH || 1.0, fixed + T / 2 + 0.01, { tile: 1.0 }); } else { texBox(group, o.skirt, fixed - T / 2 - 0.01, 0, s, fixed + T / 2 + 0.01, o.skirtH || 1.0, e, { tile: 1.0 }); } };
    for (const gp of gaps) { sk(c2, gp[0]); c2 = gp[1]; } sk(c2, b);
  }
}

// A painted view (panel blocks) seen "through" the window: the picture sits a few metres behind the glass,
// so it shifts with the viewing angle (parallax). One texture per view, shared by every window.
const _viewTex = {};
function viewTex(key) {
  if (_viewTex[key]) return _viewTex[key];
  const im = new Image(); const t = new THREE.Texture(im); t.colorSpace = THREE.SRGBColorSpace; t.minFilter = THREE.LinearFilter; t.generateMipmaps = false;
  im.onload = () => { t.needsUpdate = true; t.userData.ar = im.width / im.height; for (const u of t.userData.users || []) u.value = im.width / im.height; };
  im.src = A.img[key]; t.userData.users = []; _viewTex[key] = t; return t;
}
function parallaxMat(key, w, h, o) {
  const tx = viewTex(key); const ar = { value: tx.userData.ar || 1.78 }; tx.userData.users.push(ar);
  return new THREE.ShaderMaterial({
    uniforms: { map: { value: tx }, win: { value: new THREE.Vector2(w, h) }, imgAr: ar, depth: { value: o.depth || 1.3 }, bright: { value: o.day ? 1.0 : 0.62 }, center: { value: new THREE.Vector2(0.5, 0.5) } },
    vertexShader: `varying vec2 vUv; varying vec3 vView;
      void main(){ vUv = uv; vec3 camLocal = (inverse(modelMatrix) * vec4(cameraPosition, 1.0)).xyz; vView = position - camLocal; gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform sampler2D map; uniform vec2 win; uniform float imgAr; uniform float depth; uniform float bright; uniform vec2 center; varying vec2 vUv; varying vec3 vView;
      void main(){
        vec3 v = normalize(vView);
        // the picture is a plane "depth" metres behind the glass, about 3x the window's size
        vec2 p = (vUv - 0.5) * win + v.xy / max(0.35, -v.z) * depth;
        float span = max(win.y, win.x / imgAr) * 3.4;
        vec2 uv = center + vec2(p.x / (span * imgAr), p.y / span);
        uv = 1.0 - abs(mod(uv, 2.0) - 1.0);   // mirror instead of smearing at the edges
        vec3 col = texture2D(map, uv).rgb * bright;
        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
      }`,
  });
}
// Emissive "window": a glowing plane (night sky, moonlight) with a frame texture on top.
export function windowPane(group, x, y, z, w, h, rotY, o = {}) {
  const c = document.createElement('canvas'); c.width = 64; c.height = 64; const g = c.getContext('2d');
  const grd = g.createLinearGradient(0, 0, 0, 64); grd.addColorStop(0, o.top || '#1d2a48'); grd.addColorStop(1, o.bottom || '#0b1020');
  g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
  for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(160,180,230,${Math.random() * 0.25})`; g.fillRect((Math.random() * 64) | 0, (Math.random() * 64) | 0, 1, 2 + Math.random() * 4); }
  if (o.lights) for (let i = 0; i < 9; i++) { g.fillStyle = Math.random() < 0.5 ? '#e9c77a' : '#7fa2d8'; g.fillRect((Math.random() * 60) | 0, 34 + (Math.random() * 26) | 0, 2, 2); }
  const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; t.colorSpace = THREE.SRGBColorSpace;
  const view = o.view;   // a painted view behind the glass, when the picture exists; otherwise the plain night glow
  const mat = view && A.img[view] ? parallaxMat(view, w, h, o) : new THREE.MeshBasicMaterial({ map: t, fog: false });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  m.position.set(x, y, z); m.rotation.y = rotY; group.add(m);
  // frame cross
  const fm = psxMat({ color: o.frame || 0x6b5a48 });
  const bar = (bw, bh, dx, dy) => { const b = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, 0.05), fm); b.position.set(dx, dy, 0.02); m.add(b); };
  bar(w + 0.08, 0.06, 0, h / 2); bar(w + 0.08, 0.06, 0, -h / 2); bar(0.06, h, -w / 2, 0); bar(0.06, h, w / 2, 0); bar(0.05, h, 0, 0); bar(w, 0.05, 0, h * 0.15);
  return m;
}

// Ceiling lamp model + point light + glowing bulb. Returns controller.
export function lamp(group, x, y, z, o = {}) {
  const l = inst('ceilinglamp'); l.position.set(x, y - 0.5, z); group.add(l);
  const bulbM = new THREE.MeshBasicMaterial({ color: 0x222222, fog: false });
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 4), bulbM); bulb.position.set(x, y - 0.52, z); group.add(bulb);
  const light = new THREE.PointLight(o.color || 0xffd9a0, 0, o.dist || 7, 1.6); light.position.set(x, y - 0.6, z); group.add(light);
  const ctl = {
    base: o.intensity || 6, level: 0, flicker: 0, light, bulb,
    set(v) { this.level = v; this.apply(v); },
    apply(v) { light.intensity = this.base * v; const c = 0.13 + 0.87 * Math.min(1, v); bulbM.color.setRGB(v > 0.02 ? 1 * c : 0.13, v > 0.02 ? 0.88 * c : 0.13, v > 0.02 ? 0.62 * c : 0.13); },
    update(t) { if (this.flicker > 0 && this.level > 0) { const f = Math.random() < this.flicker * 0.08 ? Math.random() * 0.4 : 1; this.apply(this.level * f); } },
  };
  return ctl;
}

// Text drawn to a canvas texture (blackboard, posters, screens).
export function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
  g.imageSmoothingEnabled = false; draw(g, w, h);
  const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; t.minFilter = THREE.LinearFilter; t.colorSpace = THREE.SRGBColorSpace; t.generateMipmaps = false;
  t.userData.canvas = c; t.userData.g = g; return t;
}

// Model collider from its bounding box (with optional shrink).
export function colliderFor(obj, col, shrink = 0.02, noisy = false) {
  obj.updateMatrixWorld(true);
  const b = new THREE.Box3().setFromObject(obj);
  col.push({ x0: b.min.x + shrink, x1: b.max.x - shrink, z0: b.min.z + shrink, z1: b.max.z - shrink, noisy });
  return b;
}
export function place(group, name, x, y, z, rotY = 0, o = {}) {
  const m = inst(name, { pos: [x, y, z], rotY, scale: o.scale }); group.add(m);
  if (o.col) colliderFor(m, o.col, o.shrink == null ? 0.03 : o.shrink, o.noisy);
  return m;
}

// m5x7 draws ő/ű exactly like ö/ü. We find where the font puts the two umlaut dots
// and paint a double acute (two little diagonals) there instead.
const _dotCache = {};
function umlautDots(size, upper) {
  const k = size + (upper ? 'U' : 'l'); if (_dotCache[k]) return _dotCache[k];
  const c = document.createElement('canvas'); c.width = size * 2; c.height = size * 2; const g = c.getContext('2d', { willReadFrequently: true });
  const draw = ch => { g.clearRect(0, 0, c.width, c.height); g.fillStyle = '#fff'; g.font = size + 'px m5x7'; g.textBaseline = 'top'; g.fillText(ch, 0, 0); return g.getImageData(0, 0, c.width, c.height).data; };
  const a = draw(upper ? 'O' : 'o'), b = draw(upper ? 'Ö' : 'ö');
  const px = [];
  for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) { const i = (y * c.width + x) * 4 + 3; if (b[i] > 128 && a[i] < 64) px.push([x, y]); }
  _dotCache[k] = px; return px;
}
export function pxText(c, text, x, y, size = 16) {
  const u = Math.max(1, Math.round(size / 16));
  c.font = size + 'px m5x7'; c.textBaseline = 'top';
  let cx = x;
  const map = { 'ő': 'o', 'ű': 'u', 'Ő': 'O', 'Ű': 'U' };
  for (const ch of text) {
    const base = map[ch] || ch;
    c.fillText(base, cx, y);
    if (map[ch]) {
      const dots = umlautDots(size, ch === ch.toUpperCase());
      // each umlaut pixel becomes the lower-left pixel of a small acute stroke
      const minY = Math.min(...dots.map(d => d[1]));
      for (const [dx, dy] of dots) { c.fillRect(cx + dx, y + dy, 1, 1); if (dy === minY) c.fillRect(cx + dx + u, y + dy - u, u, u); }
    }
    cx += c.measureText(base).width;
  }
  return cx - x;
}
// Pixel-font text as a crisp, scaled-up canvas element (for HTML headings with ő/ű).
export function pxCanvas(lines, scale = 5, size = 16, color = '#f1ece2') {
  const c = document.createElement('canvas'); const g = c.getContext('2d');
  g.font = size + 'px m5x7';
  const w = Math.max(...lines.map(l => g.measureText(l).width)) + 4, lh = size * 0.9;
  c.width = Math.ceil(w); c.height = Math.ceil(lines.length * lh + size * 0.4);
  const g2 = c.getContext('2d'); g2.fillStyle = color;
  lines.forEach((l, i) => pxText(g2, l, 2, Math.round(i * lh), size));
  c.style.width = c.width * scale + 'px'; c.style.height = c.height * scale + 'px'; c.style.imageRendering = 'pixelated';
  return c;
}
export function clockFace(group, x, y, z, rotY) {
  const t = canvasTex(32, 32, (c) => {
    c.fillStyle = '#ddd8cc'; c.beginPath(); c.arc(16, 16, 15, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#222'; c.lineWidth = 2; c.stroke();
    c.fillStyle = '#222'; for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; c.fillRect(16 + Math.sin(a) * 12 - 1, 16 - Math.cos(a) * 12 - 1, 2, 2); }
    c.beginPath(); c.moveTo(16, 16); c.lineTo(16 + 6, 16 + 2); c.moveTo(16, 16); c.lineTo(16 - 1, 16 - 11); c.stroke();
  });
  const m = new THREE.Mesh(new THREE.CircleGeometry(0.16, 12), new THREE.MeshLambertMaterial({ map: t }));
  m.position.set(x, y, z); m.rotation.y = rotY; group.add(m); return m;
}
