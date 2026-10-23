// The Watcher: tracking, being watched. A tall faceless figure with a small red camera light for a face.
// It only moves while you are not looking at it. Every tracker still active makes it bigger and faster.
// It cannot step into the light (the gym lamp), and it stays inside the room it belongs to.
import * as THREE from 'three';
import { NPC } from '../../core/npc.js';
import { CFG } from '../config.js';

const POSES = [['Idle_Loop', 0.1], ['Interact', 0.45], ['Idle_Talking_Loop', 0.6], ['Interact', 0.8]];

let _flare = null;
function flareTex() {
  if (_flare) return _flare;
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.15, 'rgba(255,200,200,.8)'); gr.addColorStop(0.45, 'rgba(255,60,60,.25)'); gr.addColorStop(1, 'rgba(255,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  _flare = new THREE.CanvasTexture(c); _flare.colorSpace = THREE.SRGBColorSpace; return _flare;
}

export class Watcher {
  /** @param {THREE.Group} parent */
  constructor(parent) {
    this.npc = new NPC('npc_mannequin2');
    const dark = new THREE.MeshLambertMaterial({ color: 0x0c0c10 });
    this.npc.obj.traverse(o => { if (o.isMesh) { o.material = dark; } });
    this.root = new THREE.Group(); this.root.add(this.npc.obj); parent.add(this.root);
    this.eye = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 4), new THREE.MeshBasicMaterial({ color: 0xff1a1a, fog: false }));
    this.glow = new THREE.PointLight(0xff2020, 0.6, 2.2, 1.5);
    // the camera sits on the front of the face and moves with the head, so you can see where the red light comes from
    const o = this.npc.obj; o.updateMatrixWorld(true);
    let head = null; o.traverse(b => { if (b.isBone && /head$/i.test(b.name)) head = b; });
    const cam = new THREE.Group();
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.055, 0.05), new THREE.MeshBasicMaterial({ color: 0x1a1a1e }));
    this.eye.position.set(0, 0, 0.028); cam.add(box, this.eye);
    // the recording light glares at you: a soft glow and a thin horizontal streak, like a lens flare
    const glowTex = flareTex();
    const mk = (sx, sy, op) => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xff2a2a, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })); sp.scale.set(sx, sy, 1); sp.position.z = 0.05; cam.add(sp); return sp; };
    this.flare = mk(0.42, 0.42, 0.85); this.streak = mk(1.3, 0.045, 0.7); this.flareT = Math.random() * 6;
    if (head) {
      const p = o.localToWorld(new THREE.Vector3().copy(o.worldToLocal(head.getWorldPosition(new THREE.Vector3()))).add(new THREE.Vector3(0, 0.1, 0.13)));
      head.add(cam); cam.position.copy(head.worldToLocal(p.clone()));
      const s = head.getWorldScale(new THREE.Vector3()).x || 1; cam.scale.setScalar(1 / s);
      cam.quaternion.copy(head.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(o.getWorldQuaternion(new THREE.Quaternion())));
      const gp = o.localToWorld(o.worldToLocal(p.clone()).add(new THREE.Vector3(0, 0, 0.25)));
      head.add(this.glow); this.glow.position.copy(head.worldToLocal(gp));
    } else { cam.position.set(0, 1.62, 0.2); o.add(cam); this.glow.position.set(0, 1.6, 0.4); o.add(this.glow); }
    this.pose = 0; this.poseT = 0; this.active = false; this.size = 1; this.fade = 1;
    this.bounds = null; this.safe = null;   // {x0,x1,z0,z1}; safe = {x, z, r}: a light it will not enter
    this.npc.pose(...POSES[0]);
    this.root.visible = false;
  }
  get pos() { return this.root.position; }
  place(x, z, bounds, safe = null) { this.root.position.set(x, 0, z); this.bounds = bounds; this.safe = safe; this.active = true; this.root.visible = true; this.fade = 1; this.npc.obj.traverse(o => { if (o.isMesh) o.material.opacity = 1; }); }
  head() { return new THREE.Vector3(this.pos.x, 1.55 * this.size, this.pos.z); }
  setSize(s) { this.size = s; this.root.scale.setScalar(s); }

  /**
   * @param {number} dt
   * @param {{player: THREE.Vector3, seen: boolean, trackers: number, noise: number}} c
   * @returns {'caught'|null}
   */
  update(dt, c) {
    if (!this.active) return null;
    this.flareT += dt; const pulse = 0.75 + 0.25 * Math.sin(this.flareT * 3.1) + (Math.random() < 0.03 ? -0.4 : 0);
    if (this.flare) { this.flare.material.opacity = 0.85 * pulse * this.fade; this.streak.material.opacity = 0.7 * pulse * this.fade; }
    const p = this.pos, dx = c.player.x - p.x, dz = c.player.z - p.z, d = Math.hypot(dx, dz);
    this.root.rotation.y = Math.atan2(dx, dz);
    if (c.seen) return null;                                   // frozen while you look at it
    const v = (CFG.watcherSpeed + CFG.watcherPerTracker * c.trackers + CFG.watcherNoise * c.noise) * (this.speedMul || 1);
    let nx = p.x + dx / d * v * dt, nz = p.z + dz / d * v * dt;
    if (this.safe && Math.hypot(nx - this.safe.x, nz - this.safe.z) < this.safe.r + 0.3) { nx = p.x; nz = p.z; }   // it will not enter the light
    if (this.bounds) { const b = this.bounds; nx = Math.max(b.x0, Math.min(b.x1, nx)); nz = Math.max(b.z0, Math.min(b.z1, nz)); }
    p.x = nx; p.z = nz;
    // it changes pose between glances, never while you watch
    this.poseT -= dt; if (this.poseT <= 0) { this.poseT = 0.9; this.pose = (this.pose + 1) % POSES.length; this.npc.pose(...POSES[this.pose]); }
    return Math.hypot(c.player.x - p.x, c.player.z - p.z) < 0.85 ? 'caught' : null;
  }
  /** All its trackers are gone: it thins out and disappears. Returns true when finished. */
  dissolve(dt) {
    this.fade -= dt * 0.5;
    this.npc.obj.traverse(o => { if (o.isMesh) { o.material.transparent = true; o.material.opacity = Math.max(0, this.fade); } });
    this.glow.intensity = 0.6 * Math.max(0, this.fade);
    if (this.flare) { this.flare.material.opacity = 0.85 * Math.max(0, this.fade); this.streak.material.opacity = 0.7 * Math.max(0, this.fade); }
    if (this.fade <= 0) { this.active = false; this.root.visible = false; return true; }
    return false;
  }
}
