// Walking characters (retargeted PSX people) and a tiny waypoint graph for them.
import * as THREE from 'three';
import { instNPC } from './assets.js';

export class NPC {
  constructor(name, o = {}) {
    const n = instNPC(name);
    this.obj = n ? n.obj : new THREE.Group(); this.mixer = n ? n.mixer : null; this.actions = n ? n.actions : {};
    this.speed = o.speed || 1.15; this.idleAnim = o.idle || 'Idle_Loop'; this.walkAnim = o.walk || 'Walk_Loop';
    this.path = []; this.cur = null; this.onArrive = null; this.facing = 0;
    this.play(this.idleAnim, 0);
  }
  get pos() { return this.obj.position; }
  play(name, fade = 0.3) {
    const a = this.actions[name]; if (!a || this.cur === a) return;
    a.reset(); a.enabled = true; a.setEffectiveWeight(1); a.play();
    if (this.cur && fade > 0) this.cur.crossFadeTo(a, fade, false); else if (this.cur) this.cur.stop();
    this.cur = a;
  }
  // freeze on one frame (mannequins)
  pose(name, frac = 0) { const a = this.actions[name]; if (!a) return; this.play(name, 0); a.paused = true; a.time = a.getClip().duration * frac; this.mixer.update(0); }
  walkTo(points, onArrive) { this.path = points.map(p => p.clone ? p.clone() : new THREE.Vector3(p[0], 0, p[1])); this.onArrive = onArrive || null; }
  stop() { this.path = []; }
  faceTo(x, z) { this.facing = Math.atan2(x - this.obj.position.x, z - this.obj.position.z); }
  update(dt) {
    const p = this.obj.position;
    if (this.path.length) {
      const t = this.path[0], dx = t.x - p.x, dz = t.z - p.z, d = Math.hypot(dx, dz);
      if (d < 0.08) { this.path.shift(); if (!this.path.length) { this.play(this.idleAnim); const f = this.onArrive; this.onArrive = null; f && f(); } }
      else {
        const s = Math.min(d, this.speed * dt); p.x += dx / d * s; p.z += dz / d * s;
        this.facing = Math.atan2(dx, dz); this.play(this.walkAnim);
      }
    }
    // turn smoothly
    let dr = this.facing - this.obj.rotation.y; while (dr > Math.PI) dr -= Math.PI * 2; while (dr < -Math.PI) dr += Math.PI * 2;
    this.obj.rotation.y += dr * Math.min(1, dt * 6);
    if (this.mixer) this.mixer.update(dt);
    if (this.hidden) for (const b of this.hidden) b.scale.setScalar(0.001);   // parts hidden on purpose stay hidden
  }
  forward() { return new THREE.Vector3(Math.sin(this.obj.rotation.y), 0, Math.cos(this.obj.rotation.y)); }
}

// Waypoint graph: nodes {id: [x, z]}, edges [[a, b], ...]; shortest path by Dijkstra.
export class Graph {
  constructor(nodes, edges) {
    this.n = nodes; this.adj = {};
    for (const k of Object.keys(nodes)) this.adj[k] = [];
    for (const [a, b] of edges) { this.adj[a].push(b); this.adj[b].push(a); }
  }
  d(a, b) { const A = this.n[a], B = this.n[b]; return Math.hypot(A[0] - B[0], A[1] - B[1]); }
  nearest(x, z) { let best = null, bd = 1e9; for (const [k, [nx, nz]] of Object.entries(this.n)) { const d = Math.hypot(nx - x, nz - z); if (d < bd) { bd = d; best = k; } } return best; }
  path(from, to) {
    const dist = { [from]: 0 }, prev = {}, open = new Set([from]);
    while (open.size) {
      let u = null; for (const k of open) if (u === null || dist[k] < dist[u]) u = k;
      open.delete(u); if (u === to) break;
      for (const v of this.adj[u]) { const nd = dist[u] + this.d(u, v); if (dist[v] === undefined || nd < dist[v]) { dist[v] = nd; prev[v] = u; open.add(v); } }
    }
    const out = []; let c = to; if (dist[to] === undefined) return [];
    while (c !== undefined) { out.unshift(c); c = prev[c]; }
    return out.map(k => new THREE.Vector3(this.n[k][0], 0, this.n[k][1]));
  }
  // path from a world point to a world point via the graph
  route(x0, z0, x1, z1) {
    const p = this.path(this.nearest(x0, z0), this.nearest(x1, z1));
    p.push(new THREE.Vector3(x1, 0, z1)); return p;
  }
}
