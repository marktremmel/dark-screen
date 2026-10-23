// The Mimic: someone you think you know, walking out of the dark. Where the face should be there is a glowing phone screen
// showing a blurry face. It says what manipulators say; typing the safe reply makes it dissolve into static.
import * as THREE from 'three';
import { NPC } from '../../core/npc.js';
import { canvasTex } from '../../core/world.js';
import { bone, attach, hideBone } from './rig.js';

const BODIES = ['npc_guard', 'npc_caretaker', 'npc_nagyi'];
let faceTex = null;
function face() {
  if (faceTex) return faceTex;
  faceTex = canvasTex(40, 70, c => {
    const g = c.createLinearGradient(0, 0, 0, 70); g.addColorStop(0, '#3a4a66'); g.addColorStop(1, '#1a2234'); c.fillStyle = g; c.fillRect(0, 0, 40, 70);
    c.fillStyle = '#c9a98c'; c.beginPath(); c.ellipse(20, 30, 11, 14, 0, 0, 7); c.fill();               // a face, a little too close to the camera
    c.fillStyle = '#4a3426'; c.beginPath(); c.ellipse(20, 19, 12, 7, 0, Math.PI, 0); c.fill();
    c.fillStyle = '#2a1e18'; c.fillRect(13, 28, 5, 2); c.fillRect(23, 28, 5, 2); c.fillStyle = '#7a4a40'; c.fillRect(16, 38, 8, 2);
    c.fillStyle = '#2b3a52'; c.fillRect(6, 46, 28, 24);                                              // shoulders
    for (let y = 0; y < 70; y += 2) { c.fillStyle = 'rgba(0,0,0,.14)'; c.fillRect(0, y, 40, 1); }
    c.fillStyle = '#e8f0ff'; c.fillRect(0, 0, 40, 4); c.fillStyle = '#ff3b3b'; c.fillRect(31, 7, 5, 5);  // status bar and the REC dot
    c.fillStyle = '#1a1a1a'; c.fillRect(14, 62, 12, 3);
  });
  return faceTex;
}

export class Mimic {
  constructor(parent, i, data, x, z, speed) {
    this.data = data; this.id = data.id; this.speed = speed; this.state = 'walk'; this.t = 0;
    // the look follows Mark's painting "Phone-Faced Stranger in the Stairwell": an ordinary person in ordinary clothes,
    // and where the head should be, a phone held up, showing a face on a video call
    this.npc = new NPC(BODIES[i % BODIES.length], { speed });
    this.npc.obj.traverse(o => { if (o.isMesh) { o.material = o.material.clone(); if (o.material.color) o.material.color.multiplyScalar(0.55); } });
    this.root = new THREE.Group(); this.root.add(this.npc.obj); this.root.position.set(x, 0, z); parent.add(this.root);
    const phone = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.33, 0.025), new THREE.MeshLambertMaterial({ color: 0x18181c })); phone.add(body);
    this.screen = new THREE.Mesh(new THREE.PlaneGeometry(0.17, 0.3), new THREE.MeshBasicMaterial({ map: face(), fog: false, transparent: true })); this.screen.position.z = 0.0135; phone.add(this.screen);
    const neck = bone(this.npc.obj, 'Neck');
    if (neck) { attach(this.npc.obj, neck, phone, new THREE.Vector3(0, 0.17, 0.03)); hideBone(this.npc, 'Head'); }
    else { phone.position.set(0, 1.6, 0.05); this.npc.obj.add(phone); }
    // no point light here: adding lights mid-game makes every material recompile (a long freeze on school computers)
    this.npc.play('Walk_Loop', 0);
  }
  get pos() { return this.root.position; }
  head() { return new THREE.Vector3(this.pos.x, 2.0, this.pos.z); }
  /** @returns {'reached'|null} */
  update(dt, player) {
    this.t += dt;
    if (this.state === 'gone') return null;
    if (this.state === 'fade') {
      this.f -= dt * 1.6; const v = Math.max(0, this.f);
      this.npc.obj.traverse(o => { if (o.isMesh && o !== this.screen) { o.material.transparent = true; o.material.opacity = v; } });
      this.screen.material.opacity = v * (Math.random() < 0.5 ? 1 : 0.3);
      this.root.position.y = (1 - v) * 0.3;
      if (v <= 0) { this.state = 'gone'; this.root.visible = false; }
      this.npc.update(dt); return null;
    }
    const p = this.pos, dx = player.x - p.x, dz = player.z - p.z, d = Math.hypot(dx, dz);
    this.npc.facing = Math.atan2(dx, dz);
    if (d > 1.0) { const s = Math.min(d, this.speed * dt); p.x += dx / d * s; p.z += dz / d * s; }
    this.npc.update(dt);
    this.screen.material.opacity = Math.random() < 0.03 ? 0.4 : 1;
    return d <= 1.05 ? 'reached' : null;
  }
  dissolve() { if (this.state === 'walk') { this.state = 'fade'; this.f = 1; this.npc.obj.traverse(o => { if (o.isMesh && o !== this.screen) o.material = o.material.clone(); }); this.npc.play('Idle_Loop', 0.1); } }
  get dist() { return this._d || 0; }
}
