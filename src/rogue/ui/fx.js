// Look and feel (v0.18, Mark's list item 6), keeping the PSX style: everything here is cheap and adds no lights.
// - shaft(): a fake volumetric light cone under a lamp (additive, no depth write)
// - glow(): a soft flare sprite on a bulb
// - makeDust(): specks floating in the torch beam
// - grain(): film grain and a vignette over the picture (a setting, on by default)
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

/** Dust in the torch beam: specks in front of the camera that drift and turn slowly. Call the result each frame. */
export function makeDust(scene, camera, n = 70) {
  const pos = new Float32Array(n * 3), geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xb8ae98, size: 0.008, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: true }));
  pts.frustumCulled = false; scene.add(pts);
  const local = Array.from({ length: n }, () => ({ d: 0.4 + Math.random() * 2.2, a: Math.random() * 6.28, r: Math.random(), vy: (Math.random() - 0.5) * 0.05, y: 0 }));
  const v = new THREE.Vector3();
  return (dt, on) => {
    const target = on ? 0.22 : 0; pts.material.opacity += (target - pts.material.opacity) * Math.min(1, dt * 4);
    pts.visible = pts.material.opacity > 0.02; if (!pts.visible) return;
    for (let i = 0; i < n; i++) {
      const p = local[i]; p.y += p.vy * dt; p.a += dt * 0.05; if (Math.abs(p.y) > 0.4) p.vy = -p.vy;
      const spread = p.d * 0.38 * p.r;   // inside the beam's cone
      v.set(Math.cos(p.a) * spread, Math.sin(p.a) * spread * 0.7 + p.y * 0.3, -p.d).applyMatrix4(camera.matrixWorld);
      pos[i * 3] = v.x; pos[i * 3 + 1] = v.y; pos[i * 3 + 2] = v.z;
    }
    geo.attributes.position.needsUpdate = true;
  };
}

/** Film grain and a vignette, drawn inside the 3D picture as one full-screen quad. It costs almost nothing because
 * the game draws at 270 lines. (A first try used a page overlay; in testing that slowed the frame rate down a lot.) */
let grainMat = null;
function grainQuad() {
  if (!grainMat) grainMat = new THREE.ShaderMaterial({
    uniforms: { uT: { value: 0 }, uA: { value: 0.028 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy * 2.0, 0.0, 1.0); }',
    fragmentShader: 'uniform float uT; uniform float uA; varying vec2 vUv; float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)) + uT) * 43758.5453); }' +
      'void main(){ float n = h(floor(gl_FragCoord.xy) + floor(uT * 12.0)); vec2 d = vUv - 0.5; float v = smoothstep(0.32, 0.78, length(d * vec2(1.25, 1.0)));' +
      ' gl_FragColor = vec4(vec3(n), uA) * (1.0 - v) + vec4(0.0, 0.0, 0.0, v * 0.6); }',
    transparent: true, depthTest: false, depthWrite: false,
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), grainMat); m.frustumCulled = false; m.renderOrder = 9999; m.userData.grain = true;
  m.onBeforeRender = () => { grainMat.uniforms.uT.value = (performance.now() / 1000) % 100; };
  return m;
}
/** Put the grain into a scene (or take it out, when the setting is off). */
export function grain(scene, on) {
  if (!scene) return;
  on = on && S.settings.grain !== false;
  let q = scene.children.find(c => c.userData && c.userData.grain);
  if (on && !q) scene.add(q = grainQuad());
  if (q) q.visible = on;
}

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
