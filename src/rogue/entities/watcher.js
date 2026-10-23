// The Watcher: tracking, being watched. A tall faceless figure with a small red camera light for a face.
// It only moves while you are not looking at it. Every tracker still active makes it bigger and faster.
// It cannot step into the light (the gym lamp), and it stays inside the room it belongs to.
import * as THREE from 'three';
import { NPC } from '../../core/npc.js';
import { CFG } from '../config.js';
import { bone, attach } from './rig.js';

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
    // the look follows Mark's painting "Red-Eyed Shadow in the Hallway": a very tall, thin, pitch-black shape with two red eyes
    this.npc = new NPC('npc_mannequin2');
    const dark = new THREE.MeshBasicMaterial({ color: 0x030304 });   // unlit: a hole in the picture, whatever the light
    this.npc.obj.traverse(o => { if (o.isMesh) { o.material = dark; } });
    this.npc.obj.scale.set(0.82, 1.2, 0.82);
    this.root = new THREE.Group(); this.root.add(this.npc.obj); parent.add(this.root);
    this.glow = new THREE.PointLight(0xff2020, 0.6, 2.2, 1.5);
    const o = this.npc.obj, head = bone(o, 'Head');
    const eyes = new THREE.Group(), glowTex = flareTex();
    const eyeM = new THREE.MeshBasicMaterial({ color: 0xff2a1a, fog: false });
    this.flares = [];
    for (const x of [-0.034, 0.034]) {
      const e = new THREE.Mesh(new THREE.SphereGeometry(0.016, 6, 4), eyeM); e.position.set(x, 0, 0); eyes.add(e);
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xff2a2a, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })); sp.scale.set(0.2, 0.2, 1); sp.position.set(x, 0, 0.02); eyes.add(sp); this.flares.push(sp);
    }
    const streak = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xff3030, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })); streak.scale.set(0.9, 0.03, 1); streak.position.z = 0.03; eyes.add(streak);
    this.flare = this.flares[0]; this.streak = streak; this.eye = eyes.children[0]; this.flareT = Math.random() * 6;
    if (head) { attach(o, head, eyes, new THREE.Vector3(0, 0.1, 0.1)); attach(o, head, this.glow, new THREE.Vector3(0, 0.1, 0.35)); }
    else { eyes.position.set(0, 1.65, 0.12); o.add(eyes); this.glow.position.set(0, 1.6, 0.4); o.add(this.glow); }
    this.pose = 0; this.poseT = 0; this.active = false; this.size = 1; this.fade = 1;
    this.bounds = null; this.safe = null;   // {x0,x1,z0,z1}; safe = {x, z, r}: a light it will not enter
    this.npc.pose(...POSES[0]);
    this.root.visible = false;
  }
  get pos() { return this.root.position; }
  place(x, z, bounds, safe = null) { this.root.position.set(x, 0, z); this.bounds = bounds; this.safe = safe; this.active = true; this.root.visible = true; this.fade = 1; this.npc.obj.traverse(o => { if (o.isMesh) o.material.opacity = 1; }); }
  head() { return new THREE.Vector3(this.pos.x, 1.85 * this.size, this.pos.z); }
  setSize(s) { this.size = s; this.root.scale.setScalar(s); }

  /**
   * @param {number} dt
   * @param {{player: THREE.Vector3, seen: boolean, trackers: number, noise: number}} c
   * @returns {'caught'|null}
   */
  update(dt, c) {
    if (!this.active) return null;
    this.flareT += dt; const pulse = 0.75 + 0.25 * Math.sin(this.flareT * 3.1) + (Math.random() < 0.03 ? -0.4 : 0);
    if (this.flares) { for (const f of this.flares) f.material.opacity = 0.8 * pulse * this.fade; this.streak.material.opacity = 0.55 * pulse * this.fade; }
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
    if (this.flares) { for (const f of this.flares) f.material.opacity = 0.8 * Math.max(0, this.fade); this.streak.material.opacity = 0.55 * Math.max(0, this.fade); }
    if (this.fade <= 0) { this.active = false; this.root.visible = false; return true; }
    return false;
  }
}
