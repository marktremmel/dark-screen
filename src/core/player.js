import * as THREE from 'three';
import { R } from './render.js';
import { play } from './audio.js';
import { S } from './state.js';

// ---------- input ----------
export const IN = { keys: {}, mdx: 0, mdy: 0, locked: false, pressed: {} };
const keyMap = k => ({ ArrowUp: 'KeyW', ArrowDown: 'KeyS', ArrowLeft: 'KeyA', ArrowRight: 'KeyD' }[k] || k);
addEventListener('keydown', e => {
  const c = keyMap(e.code);
  if (!IN.keys[c]) IN.pressed[c] = true;
  IN.keys[c] = true;
  if (['Space', 'ArrowUp', 'ArrowDown', 'Tab'].includes(e.code) && IN.locked) e.preventDefault();
});
addEventListener('keyup', e => { IN.keys[keyMap(e.code)] = false; });
addEventListener('blur', () => { IN.keys = {}; });
addEventListener('mousemove', e => { if (IN.locked) { IN.mdx += e.movementX; IN.mdy += e.movementY; } });
document.addEventListener('pointerlockchange', () => {
  IN.locked = document.pointerLockElement === R.canvas;
  if (!IN.locked && S.onUnlock) S.onUnlock();
});
export function wasPressed(code) { const v = !!IN.pressed[code]; return v; }
export function clearPressed() { IN.pressed = {}; IN.mdx = 0; IN.mdy = 0; }
export function lockPointer() { try { const p = R.canvas.requestPointerLock(); if (p && p.catch) p.catch(() => { }); } catch (e) { } }
export function unlockPointer() { if (document.pointerLockElement) document.exitPointerLock(); }

// ---------- player ----------
export class Player {
  constructor(camera) {
    this.cam = camera;
    this.pos = new THREE.Vector3();
    this.yaw = 0; this.pitch = 0;
    this.radius = 0.27; this.eye = 1.6;
    this.boxes = [];   // {x0,x1,z0,z1, noisy?}
    this.vel = new THREE.Vector3();
    this.moving = false; this.running = false;
    this.bob = 0; this.stepT = 0; this.frozen = false;
    this.speed = 2.0; this.runSpeed = 3.6;
    this.onBump = null; this.stepSounds = ['step1', 'step2', 'step3', 'step4'];
    this.stepVol = 0.35;
  }
  set(x, z, yawDeg = 0) { this.pos.set(x, 0, z); this.yaw = yawDeg * Math.PI / 180; this.pitch = 0; this.sync(); }
  update(dt) {
    const sens = 0.0022 * (S.settings.mouse || 1);
    if (!this.frozen) {
      this.yaw -= IN.mdx * sens; this.pitch -= IN.mdy * sens;
      this.pitch = Math.max(-1.35, Math.min(1.35, this.pitch));
    }
    IN.mdx = IN.mdy = 0;
    let fx = 0, fz = 0;
    if (!this.frozen) {
      if (IN.keys.KeyW) fz -= 1; if (IN.keys.KeyS) fz += 1;
      if (IN.keys.KeyA) fx -= 1; if (IN.keys.KeyD) fx += 1;
    }
    const len = Math.hypot(fx, fz);
    this.moving = len > 0;
    this.running = this.moving && (IN.keys.ShiftLeft || IN.keys.ShiftRight);
    if (len > 0) {
      fx /= len; fz /= len;
      const sp = this.running ? this.runSpeed : this.speed;
      const s = Math.sin(this.yaw), c = Math.cos(this.yaw);
      const dx = (fx * c + fz * s) * sp * dt, dz = (-fx * s + fz * c) * sp * dt;
      this.pos.x += dx; this.collide();
      this.pos.z += dz; this.collide();
      this.stepT += dt * (this.running ? 1.7 : 1.15);
      if (this.stepT > 0.55) { this.stepT = 0; play(this.stepSounds[(Math.random() * 4) | 0], { vol: this.stepVol * (this.running ? 1.4 : 1), rate: 0.9 + Math.random() * 0.2 }); }
      this.bob += dt * (this.running ? 11 : 7.5);
    } else { this.stepT = 0.4; }
    this.sync();
  }
  collide() {
    const r = this.radius, p = this.pos;
    for (const b of this.boxes) {
      if (b.off) continue;
      if (b.y0 != null && ((this.yOff || 0) < b.y0 || (this.yOff || 0) > b.y1)) continue; // height-limited colliders (stairwells)
      const cx = Math.max(b.x0, Math.min(p.x, b.x1)), cz = Math.max(b.z0, Math.min(p.z, b.z1));
      const dx = p.x - cx, dz = p.z - cz, d2 = dx * dx + dz * dz;
      if (d2 < r * r) {
        if (d2 > 1e-9) { const d = Math.sqrt(d2); p.x = cx + dx / d * r; p.z = cz + dz / d * r; }
        else { // centre inside box: push out the shortest way
          const opts = [[b.x0 - r - p.x, 0], [b.x1 + r - p.x, 0], [0, b.z0 - r - p.z], [0, b.z1 + r - p.z]];
          opts.sort((a, c) => Math.abs(a[0] + a[1]) - Math.abs(c[0] + c[1])); p.x += opts[0][0]; p.z += opts[0][1];
        }
        if (b.noisy && this.running && this.onBump) this.onBump(b);
      }
    }
  }
  sync() {
    const bobOn = S.settings.bob !== false;
    const by = bobOn && this.moving ? Math.sin(this.bob) * 0.035 : 0;
    this.cam.position.set(this.pos.x, this.eye + by + (this.yOff || 0), this.pos.z); // yOff: floor height (stairs)
    this.cam.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
  }
  forward(v = new THREE.Vector3()) { return this.cam.getWorldDirection(v); }
}

// ---------- interaction ----------
export class Interactor {
  constructor(camera) { this.cam = camera; this.items = []; this.blockers = []; this.ray = new THREE.Raycaster(); this.ray.far = 2.2; this.current = null; }
  add(obj, label, use, cond) { const it = { obj, label, use, cond, on: true }; obj.traverse(o => { o.userData.it = it; }); this.items.push(it); return it; }
  remove(it) { it.on = false; this.items = this.items.filter(x => x !== it); }
  update() {
    this.ray.setFromCamera({ x: 0, y: 0 }, this.cam);
    const objs = this.items.filter(i => i.on && (!i.cond || i.cond())).map(i => i.obj).concat(this.blockers);
    const hits = this.ray.intersectObjects(objs, true);
    let cur = null;
    if (hits.length) { let o = hits[0].object; while (o && !o.userData.it) o = o.parent; if (o && o.userData.it && o.userData.it.on) cur = o.userData.it; }
    this.current = cur;
    return cur;
  }
  label() { const c = this.current; if (!c) return null; return typeof c.label === 'function' ? c.label() : c.label; }
}
