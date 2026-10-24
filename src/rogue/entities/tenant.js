// The Tenant (a Lakó): hard mode's monster (Mark's list item 5, Phase 4 in doc 03). A tall, stooped figure in a long
// dark coat, after Mark's paintings "Ominous Stairwell Descent" and "Ominous Feet Beneath the Door".
// It roams the walks of the night. It cannot see well: it HEARS you when you run, and it SEES your torch when it is
// close. Walk, and switch the torch off when it is near, and it loses you. One learnable rule, like every monster.
// It moves along the walk's route (so it never goes through walls), and it never moves during a wave of figures.
import * as THREE from 'three';
import { NPC } from '../../core/npc.js';
import { bone, attach } from './rig.js';

export const TENANT = { slow: 1.5, hunt: 2.6, hearRun: 22, hearWalk: 3.5, seeTorch: 9, catchDist: 0.95, loseAfter: 2.2 };

export class Tenant {
  /** @param route Vector3[] the walk's route; @param routeLen cumulative lengths */
  constructor(parent, route, routeLen, r) {
    this.route = route; this.len = routeLen; this.r = r;
    this.npc = new NPC('npc_mannequin2', { speed: TENANT.slow });
    const dark = new THREE.MeshLambertMaterial({ color: 0x0b0b0e, emissive: 0x020203 });
    this.npc.obj.traverse(o => { if (o.isMesh) o.material = dark; });
    this.npc.obj.scale.set(1.08, 1.22, 1.08);   // tall and thin
    // the long coat: an open cone hanging from the chest to the shins
    const coat = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.36, 1.15, 10, 1, true), new THREE.MeshLambertMaterial({ color: 0x101014, side: THREE.DoubleSide }));
    const sp = bone(this.npc.obj, 'Spine') || bone(this.npc.obj, 'Spine1');
    if (sp) attach(this.npc.obj, sp, coat, new THREE.Vector3(0, -0.42, 0)); else { coat.position.y = 0.85; this.npc.obj.add(coat); }
    // two faint points where the eyes would be: you see them before you see it
    const eyeM = new THREE.MeshBasicMaterial({ color: 0x9aa4b0, fog: true });
    const hd = bone(this.npc.obj, 'Head');
    for (const x of [-0.035, 0.035]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.012, 4, 3), eyeM); if (hd) attach(this.npc.obj, hd, e, new THREE.Vector3(x, 0.07, 0.1)); else { e.position.set(x, 1.65, 0.1); this.npc.obj.add(e); } }
    this.npc.obj.visible = true; this.npc.obj.position.set(0, -50, 0);   // parked far below until it comes (no lights on it, so moving it is cheap)
    parent.add(this.npc.obj);
    this.state = 'away'; this.s = 0; this.awayT = 30 + r() * 20; this.lostT = 0; this.target = 0; this.met = false; this.noise = 0;
  }
  /** Distance along the route of the point nearest to (x, z). */
  sOf(x, z) { let best = 0, bd = 1e9; for (let i = 0; i < this.route.length; i++) { const p = this.route[i], d = (p.x - x) ** 2 + (p.z - z) ** 2; if (d < bd) { bd = d; best = i; } } return this.len[best]; }
  at(s) {
    const L = this.len, n = L.length; if (s <= 0) return this.route[0].clone(); if (s >= L[n - 1]) return this.route[n - 1].clone();
    let i = 1; while (i < n && L[i] < s) i++; const a = this.route[i - 1], b = this.route[i], f = (s - L[i - 1]) / Math.max(1e-4, L[i] - L[i - 1]);
    return a.clone().lerp(b, f);
  }
  /**
   * @param o {player: Vector3, running, moving, torch, paused}
   * @returns {'appear'|'heard'|'lost'|'brush'|'caught'|null} an event for the scene to react to
   */
  update(dt, o) {
    const n = this.npc, p = o.player;
    if (o.paused) { n.update(0); return null; }
    if (this.state === 'away') {
      this.awayT -= dt; if (this.awayT > 0) return null;
      // come in behind you, out of sight, about 18 m back along the route (or ahead, near the start)
      const ps = this.sOf(p.x, p.z); this.s = ps > 20 ? ps - 18 : Math.min(this.len[this.len.length - 1], ps + 22);
      const q = this.at(this.s); n.obj.position.set(q.x, 0, q.z); this.state = 'roam'; this.target = ps; this.lostT = 0;
      return 'appear';
    }
    const here = n.obj.position, d = Math.hypot(p.x - here.x, p.z - here.z);
    // what it notices: running (far), walking (close), the torch (close, if you face it or not)
    const heard = (o.running && d < TENANT.hearRun) || (o.moving && d < TENANT.hearWalk) || (o.torch && d < TENANT.seeTorch);
    let ev = null;
    if (heard) { if (this.state !== 'hunt') ev = 'heard'; this.state = 'hunt'; this.target = this.sOf(p.x, p.z); this.lostT = 0; }
    else if (this.state === 'hunt') { this.lostT += dt; if (this.lostT > TENANT.loseAfter) { this.state = 'search'; this.searchT = 4 + this.r() * 3; ev = 'lost'; } }
    if (this.state === 'search') { this.searchT -= dt; if (this.searchT <= 0) { this.state = 'leave'; this.target = this.s > 30 ? 0 : this.len[this.len.length - 1]; } }
    if (this.state === 'roam') {   // drifts around where you are, as if it smells you, but it needs a sound or a light to find you
      this.wanderT = (this.wanderT || 0) - dt;
      if (this.wanderT <= 0) { this.wanderT = 5 + this.r() * 4; this.target = this.sOf(p.x, p.z) + (this.r() - 0.5) * 12; }
    }
    const speed = this.state === 'hunt' ? TENANT.hunt : this.state === 'search' ? 0 : TENANT.slow;
    const ds = this.target - this.s, step = Math.sign(ds) * Math.min(Math.abs(ds), speed * dt);
    this.s += step;
    const q = this.state === 'hunt' && d < 4 ? new THREE.Vector3(p.x, 0, p.z) : this.at(this.s);   // the last few metres straight at you
    const mv = q.sub(here); const ml = mv.length();
    if (ml > 0.001) { const k = Math.min(1, speed * dt / ml); here.x += mv.x * k; here.z += mv.z * k; n.facing = Math.atan2(mv.x, mv.z); n.play(speed > 2 ? 'Walk_Loop' : 'Walk_Loop'); if (n.cur) n.cur.timeScale = speed / 1.4; }
    else { n.play('Idle_Loop'); if (this.state === 'search') n.facing += dt * 0.8; }
    if (this.state === 'leave' && Math.abs(this.target - this.s) < 0.5) { this.state = 'away'; this.awayT = 35 + this.r() * 25; here.set(0, -50, 0); }
    n.update(dt);
    if (this.state === 'roam' && d < 1.4 && !this.brushed) { this.brushed = true; ev = ev || 'brush'; }   // it passes right by you in the dark
    if (this.state === 'hunt' && d < TENANT.catchDist) { this.state = 'away'; this.awayT = 40 + this.r() * 20; here.set(0, -50, 0); return 'caught'; }
    return ev;
  }
  dist(p) { const h = this.npc.obj.position; return this.state === 'away' ? Infinity : Math.hypot(p.x - h.x, p.z - h.z); }
}
