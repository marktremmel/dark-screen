// The Mimic: someone you think you know, walking out of the dark. Where the face should be there is a glowing phone screen
// showing a blurry face. It says what manipulators say; typing the safe reply makes it dissolve into static.
import * as THREE from 'three';
import { NPC } from '../../core/npc.js';
import { canvasTex } from '../../core/world.js';

const BODIES = ['npc_guard', 'npc_caretaker', 'npc_nagyi'];
let faceTex = null;
function face() {
  if (faceTex) return faceTex;
  faceTex = canvasTex(32, 40, c => {
    const g = c.createRadialGradient(16, 18, 2, 16, 18, 18); g.addColorStop(0, '#d8c8b8'); g.addColorStop(1, '#2a3a5a');
    c.fillStyle = g; c.fillRect(0, 0, 32, 40);
    c.fillStyle = 'rgba(20,20,30,.55)'; c.fillRect(9, 14, 4, 3); c.fillRect(19, 14, 4, 3); c.fillRect(12, 26, 8, 2);
    for (let y = 0; y < 40; y += 2) { c.fillStyle = 'rgba(0,0,0,.18)'; c.fillRect(0, y, 32, 1); }
    c.fillStyle = '#9fc8ff'; c.fillRect(0, 0, 32, 2); c.fillRect(0, 38, 32, 2);
  });
  return faceTex;
}

export class Mimic {
  constructor(parent, i, data, x, z, speed) {
    this.data = data; this.id = data.id; this.speed = speed; this.state = 'walk'; this.t = 0;
    this.npc = new NPC(BODIES[i % BODIES.length], { speed });
    const dark = new THREE.MeshLambertMaterial({ color: 0x4a4c5a, emissive: 0x0c0e16 });
    this.npc.obj.traverse(o => { if (o.isMesh) o.material = dark; });
    this.root = new THREE.Group(); this.root.add(this.npc.obj); this.root.position.set(x, 0, z); parent.add(this.root);
    this.screen = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.3), new THREE.MeshBasicMaterial({ map: face(), fog: false, transparent: true }));
    this.screen.position.set(0, 1.58, 0.3); this.npc.obj.add(this.screen);   // held in front of the face, so it never cuts through the head
    // no point light here: adding lights mid-game makes every material recompile (a long freeze on school computers)
    this.npc.play('Walk_Loop', 0);
  }
  get pos() { return this.root.position; }
  head() { return new THREE.Vector3(this.pos.x, 2.05, this.pos.z); }
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
