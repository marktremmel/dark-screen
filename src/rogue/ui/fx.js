// Look and feel (v0.18, Mark's list item 6), keeping the PSX style: everything here is cheap and adds no lights.
// - shaft(): a fake volumetric light cone under a lamp (additive, no depth write)
// - glow(): a soft flare sprite on a bulb
// - makeDust(): specks floating in the torch beam
// - routeStrip(): tonight's route in the corner, with where you are now
import * as THREE from 'three';
import { S } from '../../core/state.js';

let shaftTex = null, glowTex = null;
function grad(w, h, f) { const c = document.createElement('canvas'); c.width = w; c.height = h; f(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearFilter; return t; }

/** A light shaft: a cone from (x, y, z) down to the floor. Returns the mesh (hide it when the lamp goes out). */
export function shaft(g, x, y, z, color = 0xffd9a0, o = {}) {
  if (!shaftTex) shaftTex = grad(4, 64, (c, w, h) => { const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.3)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = gr; c.fillRect(0, 0, w, h); });
  const h = o.h || y, r0 = o.r0 || 0.08, r1 = o.r1 || h * 0.42;
  const geo = new THREE.CylinderGeometry(r0, r1, h, 16, 1, true);
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: shaftTex, color, transparent: true, opacity: (o.opacity || 0.07) * 1.5, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: true }));
  m.position.set(x, y - h / 2, z); m.renderOrder = 2; g.add(m); return m;
}

/** A soft glow (flare) around a bulb. */
export function glow(g, x, y, z, color = 0xffd9a0, size = 0.9, opacity = 0.55) {
  if (!glowTex) glowTex = grad(32, 32, (c) => { const gr = c.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,0.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = gr; c.fillRect(0, 0, 32, 32); });
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, fog: true }));
  s.position.set(x, y, z); s.scale.set(size, size, 1); g.add(s); return s;
}

/** Dust in the torch beam (v0.19: in the world now, so you move through it; before, it was stuck to the camera).
 * Specks float in a box around you and drift; each one glows only while it is inside the torch's cone. */
export function makeDust(scene, camera, n = 220) {
  const pos = new Float32Array(n * 3), colr = new Float32Array(n * 3), geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(colr, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.02, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: true }));
  pts.frustumCulled = false; scene.add(pts);
  const B = 3.2, H = 1.6, P = Array.from({ length: n }, () => ({ x: (Math.random() - 0.5) * 2 * B, y: Math.random() * 2 * H, z: (Math.random() - 0.5) * 2 * B, vx: (Math.random() - 0.5) * 0.06, vy: (Math.random() - 0.5) * 0.03, vz: (Math.random() - 0.5) * 0.06, ph: Math.random() * 6.28 }));
  const cam = new THREE.Vector3(), fw = new THREE.Vector3(); let level = 0, t = 0;
  const wrap = (v, c, r) => v - c > r ? v - 2 * r : v - c < -r ? v + 2 * r : v;
  return (dt, on) => {
    level += ((on ? 1 : 0) - level) * Math.min(1, dt * 4); pts.visible = level > 0.02; if (!pts.visible) return;
    t += dt; camera.getWorldPosition(cam); camera.getWorldDirection(fw);
    for (let i = 0; i < n; i++) {
      const p = P[i]; p.x += (p.vx + Math.sin(t * 0.3 + p.ph) * 0.02) * dt; p.y += p.vy * dt; p.z += (p.vz + Math.cos(t * 0.25 + p.ph) * 0.02) * dt;
      p.x = wrap(p.x, cam.x, B); p.z = wrap(p.z, cam.z, B); p.y = wrap(p.y, cam.y, H);
      const dx = p.x - cam.x, dy = p.y - cam.y, dz = p.z - cam.z, d = Math.hypot(dx, dy, dz) || 1, cos = (dx * fw.x + dy * fw.y + dz * fw.z) / d;
      const inBeam = Math.max(0, (cos - 0.86) / 0.14) * Math.max(0, 1 - d / 3.4) * (d > 0.25 ? 1 : 0);   // inside the cone, fading with distance
      const v = inBeam * level * (0.6 + 0.4 * Math.sin(t * 2 + p.ph)) * 0.75;
      pos[i * 3] = p.x; pos[i * 3 + 1] = p.y; pos[i * 3 + 2] = p.z; colr[i * 3] = v; colr[i * 3 + 1] = v * 0.95; colr[i * 3 + 2] = v * 0.82;
    }
    geo.attributes.position.needsUpdate = true; geo.attributes.color.needsUpdate = true;
  };
}

// Film grain and the vignette moved to ui/post.js in v0.19 (camera effects).

/** Tonight's route in the bottom-left corner: done stages ticked, the current one marked. */
let stripEl = null;
export function routeStrip(run, names) {
  if (!stripEl) { stripEl = document.createElement('div'); stripEl.style.cssText = 'position:fixed;left:12px;bottom:8px;z-index:40;font:13px m5x7,monospace;color:#b8b0c8;opacity:.8;pointer-events:none;letter-spacing:.5px;text-shadow:0 1px 3px #000;display:none'; document.body.appendChild(stripEl); }
  if (!run || !run.route || run.mode === 'labyrinth') { stripEl.style.display = 'none'; return; }
  const cur = run.cur || 'stairs';
  stripEl.innerHTML = 'Tonight: ' + run.route.map(st => { const n = names(run, st); return run.stages.includes(st) ? `<span style="color:#7fd0a8">✓ ${n}</span>` : st === cur ? `<span style="color:#ffe0a0">● ${n}</span>` : `<span style="opacity:.6">${n}</span>`; }).join(' › ');
  stripEl.style.display = 'block';
}
export function hideRouteStrip() { if (stripEl) stripEl.style.display = 'none'; }
