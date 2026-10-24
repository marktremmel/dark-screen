import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { psxMat } from './render.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';

export const A = { models: {}, anims: {}, tex: {}, img: {}, audio: {}, packs: {} };
const gltf = new GLTFLoader();

export function b64ToBuf(b64) {
  const bin = atob(b64); const u = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
  return u.buffer;
}

// Data packs are plain <script> files (works from file:// without a server).
export function loadPackScript(name) {
  window.SK_DATA = window.SK_DATA || {};
  return new Promise((res, rej) => {
    if (window.SK_DATA[name]) return res(window.SK_DATA[name]);
    const s = document.createElement('script');
    s.src = 'data/' + name + '.js';
    s.onload = () => res(window.SK_DATA[name]);
    s.onerror = () => rej(new Error('Missing file: data/' + name + '.js'));
    document.head.appendChild(s);
  });
}

function loadTexture(url) {
  return new Promise((res, rej) => {
    new THREE.TextureLoader().load(url, t => {
      t.colorSpace = THREE.SRGBColorSpace;
      // pixels stay crisp up close (Nearest), but far away and at low angles the mip levels blend smoothly:
      // NearestMipmapNearest made floors, rugs and window grids flicker whenever the view moved (Mark, 24 Oct)
      t.magFilter = THREE.NearestFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.anisotropy = 4;
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      res(t);
    }, undefined, rej);
  });
}

function psxify(root, vc = false) {
  const cache = new Map();
  root.traverse(o => {
    if (!o.isMesh) return;
    const conv = m => {
      if (cache.has(m)) return cache.get(m);
      if (m.map) { m.map.magFilter = THREE.NearestFilter; m.map.minFilter = THREE.LinearMipmapLinearFilter; m.map.anisotropy = 4; }
      const n = psxMat({ map: m.map || null, color: m.map ? 0xffffff : (m.color ? m.color.getHex() : 0xaaaaaa), side: THREE.DoubleSide, alphaTest: m.alphaTest > 0 ? Math.max(m.alphaTest, 0.35) : 0, skinning: !!o.isSkinnedMesh, vertexColors: vc && !!o.geometry.attributes.color });
      cache.set(m, n); return n;
    };
    o.material = Array.isArray(o.material) ? o.material.map(conv) : conv(o.material);
    o.frustumCulled = !o.isSkinnedMesh;
  });
}

export async function ingestPack(name, audioCtx, onProgress) {
  if (A.packs[name]) return;
  const P = await loadPackScript(name);
  const jobs = [];
  for (const [k, v] of Object.entries(P.glb || {})) jobs.push(async () => {
    const g = await gltf.parseAsync(b64ToBuf(v), '');
    if (k !== 'arms') psxify(g.scene);
    A.models[k] = g.scene; A.anims[k] = g.animations || [];
  });
  for (const [k, v] of Object.entries(P.tex || {})) jobs.push(async () => { A.tex[k] = await loadTexture('data:image/png;base64,' + v); });
  for (const [k, v] of Object.entries(P.img || {})) A.img[k] = v.startsWith('data:') ? v : 'data:image/png;base64,' + v;
  for (const [k, v] of Object.entries(P.audio || {})) jobs.push(async () => {
    try { A.audio[k] = await audioCtx.decodeAudioData(b64ToBuf(v)); } catch (e) { console.warn('audio decode failed', k); }
  });
  // modular kits: many small GLB pieces sharing one atlas texture (external 'atlas.png')
  for (const [kit, K] of Object.entries(P.kits || {})) {
    const atlasURL = 'data:image/png;base64,' + K.atlas;
    const mgr = new THREE.LoadingManager(); mgr.setURLModifier(u => /atlas[^/]*\.png$/.test(u) ? atlasURL : u);   // atlas_glow.png too (its glow is not used)
    const kl = new GLTFLoader(mgr);
    for (const [k, v] of Object.entries(K.pieces)) jobs.push(async () => {
      const g = await kl.parseAsync(b64ToBuf(v), 'kit/');
      const cols = []; g.scene.traverse(o => { if (o.isMesh && /collider/i.test(o.name)) cols.push(o); });
      for (const o of cols) o.parent.remove(o);   // collision proxies are not meant to be seen (they showed as grey boxes in the metro)
      psxify(g.scene, true); A.models[K.prefix + k] = g.scene; A.anims[K.prefix + k] = g.animations || [];
    });
  }
  if (P.font) {
    const ff = new FontFace('m5x7', b64ToBuf(P.font));
    jobs.push(async () => { await ff.load(); document.fonts.add(ff); });
  }
  let done = 0;
  await Promise.all(jobs.map(j => j().then(() => { done++; onProgress && onProgress(done / jobs.length); })));
  A.packs[name] = true;
}

// Clone a model; shares geometry and materials.
export function inst(name, opts = {}) {
  const src = A.models[name];
  if (!src) { console.warn('missing model', name); return new THREE.Group(); }
  const o = src.clone(true);
  if (opts.pos) o.position.set(...opts.pos);
  if (opts.rotY) o.rotation.y = opts.rotY * Math.PI / 180;
  if (opts.scale) o.scale.setScalar(opts.scale);
  return o;
}

// Skinned characters need a real skeleton clone. Returns the object with a mixer and named actions.
export function instNPC(name) {
  const src = A.models[name];
  if (!src) { console.warn('missing npc', name); return null; }
  const o = SkeletonUtils.clone(src);
  o.traverse(c => { if (c.isMesh) c.frustumCulled = false; });
  const mixer = new THREE.AnimationMixer(o); const actions = {};
  for (const c of A.anims[name] || []) actions[c.name] = mixer.clipAction(c);
  return { obj: o, mixer, actions };
}
export function tex(name, rx = 1, ry = 1) {
  const t = A.tex[name];
  if (!t) { console.warn('missing tex', name); return null; }
  const c = t.clone(); c.needsUpdate = true; c.repeat.set(rx, ry); return c;
}
