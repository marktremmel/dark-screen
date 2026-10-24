// Your flat: the safe place. Nothing can hurt you here.
// One room to start; bigger flats add a room and then a balcony. Buy things on the computer, take them out of the box,
// and place them: E puts it down, R turns it, X puts it back. Look at a placed thing and press E to move it again.
// What you place makes the flat cosy, and cosiness adds to your nerve on the stairs.
import * as THREE from 'three';
import { Walker } from '../../scenes/walker.js';
import { texBox, plane, windowPane, lamp, place, canvasTex } from '../../core/world.js';
import { psxMat } from '../../core/render.js';
import { A, tex, inst } from '../../core/assets.js';
import { lockPointer, wasPressed } from '../../core/player.js';
import { hud, hudParts, objective, prompt, caption, fade, checklist } from '../../core/hud.js';
import { loop, play, music } from '../../core/audio.js';
import { S, persist } from '../../core/state.js';
import { ITEM , WALLS } from '../content/furniture.js';
import { ensureHome, flatOf, cosiness, startNerve, takeOut, putBack, placeItem, lift, insideFlat } from '../logic/home.js';
import { homeComputer, boxPanel } from '../ui/homePanels.js';
import { preparePosters } from '../ui/posterMaker.js';
import { ledApp, ledState, ledSecure } from '../ui/ledApp.js';
import { noteCard } from '../save/rogueSave.js';
import { NPC } from '../../core/npc.js';
import { sitDown } from '../entities/rig.js';
import { floorPicker } from '../ui/panels.js';
import { thumb } from '../ui/thumbs.js';

const HH = 2.65, CELL = 0.2;

const texCache = {};
/** A texture from a packed image, made once and shared. */
function imgTex(key) {
  if (texCache[key]) return texCache[key];
  const im = new Image(), t = new THREE.Texture(im); t.colorSpace = THREE.SRGBColorSpace;
  im.onload = () => { t.needsUpdate = true; }; im.src = A.img[key] || ''; return (texCache[key] = t);
}

export class HomeScene extends Walker {
  constructor(G, R) { super(G); this.R = R; ensureHome(R.life); this.quitLabel = 'Back to Room 214 (your flat is saved)'; }

  async build() {
    await preparePosters(this.R.record);   // the player's own posters: images and shop items before anything is placed
    const g = this.newScene(0x07080c, 5, 22);
    const L = this.R.life, F = flatOf(L);
    this.buildRooms(g, F);
    this.scene.add(new THREE.AmbientLight(0x6e6a80, 0.34));
    this.scene.add(new THREE.HemisphereLight(0x8090c0, 0x302820, 0.2));
    this.tvLight = new THREE.PointLight(0x9a5cff, 0, 4.5, 1.5); g.add(this.tvLight);
    this.ledLights = [0, 1].map(() => { const l = new THREE.PointLight(0xffffff, 0, 4.2, 1.4); g.add(l); return l; });   // two strips can give light
    this.ledHack();
    this.makeVisitor();   // made now, switched on with a TV (never add lights later)
    // the front door, the desk and the computer, the mattress, the box: always here
    const door = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 2.05), psxMat({ map: tex('rg_flatdoor'), color: 0xd8c8b0 }));
    door.position.set(0.9, 1.025, -0.012); door.rotation.y = Math.PI; g.add(door);
    this.fixed = [];
    const fix = (name, x, z, r) => { const o = place(g, name, x, 0, z, r); this.fixed.push(o); this.colFor(o, true); return o; };
    const mat = fix('mattress', 3.55, -1.4, 90);
    const box = fix('box', 1.9, -0.75, 20);
    fix('studydesk', 1.0, -4.68, 0);
    const pc = place(g, 'pcretro', 1.0, 0.76, -4.7, 0);
    place(g, 'studychair', 1.0, 0, -4.05, 180);
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.336, 0.266), new THREE.MeshBasicMaterial({ map: canvasTex(64, 48, c => {
      c.fillStyle = '#0c2018'; c.fillRect(0, 0, 64, 48); c.fillStyle = '#8fe3c9'; c.font = '16px m5x7'; c.textBaseline = 'top';
      c.fillText('SHOP', 4, 6); c.fillText(L.coins + ' COINS', 4, 22);
    }), fog: false }));
    scr.position.set(-0.057, 0.243, 0.104); pc.add(scr);
    const glow = new THREE.PointLight(0x8fe3c9, 0.8, 3, 1.6); glow.position.set(1.0, 1.3, -4.1); g.add(glow);
    this.setupRig({ arms: false, flash: false, stepVol: 0.25, reach: 2.4 });
    // your things
    this.placed = [];
    L.home.forEach(h => this.spawnPlaced(h));
    const it = this.it;
    it.add(pc, 'Your computer: shop, notebook, your flat', () => this.computer());
    it.add(door, 'Front door: plan tonight and go out', () => this.goOut());
    it.add(mat, 'Mattress: sleep (back to Room 214)', () => this.quit());
    it.add(box, () => { const n = Object.values(L.inv).reduce((a, b) => a + b, 0); return n ? `Your things (doboz): ${n} to place` : 'The box: empty for now'; }, () => this.openBox());
  }

  /** Floors, ceilings and walls from the flat's rooms; walls between rooms except at their doorways. */
  buildRooms(g, F) {
    const col = this.col, block = this.block, rooms = F.rooms, doors = F.doors || [];
    rooms.forEach((r, i) => {
      plane(g, r.balcony ? 'rg_concrete' : 'wood_floor', r.x0, r.z0, r.x1, r.z1, 0, { tile: r.balcony ? 1.4 : 1.2 });
      if (!r.balcony) plane(g, 'rg_white', r.x0, r.z0, r.x1, r.z1, HH, { tile: 2, ceiling: true, color: 0xd8d4c8 });
      if (!r.balcony) { const lp = lamp(g, (r.x0 + r.x1) / 2, HH, (r.z0 + r.z1) / 2, { intensity: 3.0, dist: 8 }); lp.set(1); }
    });
    const roomAt = (x, z) => rooms.findIndex(r => x > r.x0 && x < r.x1 && z > r.z0 && z < r.z1);
    const inDoor = (vertical, line, a) => doors.some(d => vertical ? (d.x != null && Math.abs(d.x - line) < 1e-6 && a > d.z0 && a < d.z1) : (d.z != null && Math.abs(d.z - line) < 1e-6 && a > d.x0 && a < d.x1));
    const xs = rooms.flatMap(r => [r.x0, r.x1]), zs = rooms.flatMap(r => [r.z0, r.z1]);
    const bx0 = Math.min(...xs) - CELL, bx1 = Math.max(...xs) + CELL, bz0 = Math.min(...zs) - CELL, bz1 = Math.max(...zs) + CELL;
    const W = WALLS.find(w => w.id === this.R.life.wall) || WALLS[0];   // the wall finish you chose on the computer
    const seg = (x0, z0, x1, z1, low) => texBox(g, low ? null : W.tex, x0, 0, z0, x1, low ? 1.05 : HH, z1, { col, block, tile: 1.0, color: low ? 0x3a3e3a : W.color });
    const n = v => Math.round(v / CELL) * CELL;
    // walls along x (edges between z cells)
    for (let z = n(bz0); z <= bz1 + 1e-6; z = n(z + CELL)) {
      let run = null;
      for (let x = n(bx0); x <= bx1 + CELL + 1e-6; x = n(x + CELL)) {
        const a = roomAt(x + CELL / 2, z - CELL / 2), b = roomAt(x + CELL / 2, z + CELL / 2);
        let e = null;
        if (a !== b && !inDoor(false, z, x + CELL / 2)) { const low = (a >= 0 && rooms[a].balcony && b < 0) || (b >= 0 && rooms[b].balcony && a < 0); e = (a >= 0 ? 'n' : 's') + (low ? 'L' : ''); }
        if (e && run && run.e === e) run.x1 = x + CELL;
        else { if (run) seg(run.x0, run.e[0] === 'n' ? z : z - 0.12, run.x1, run.e[0] === 'n' ? z + 0.12 : z, run.e.endsWith('L')); run = e ? { e, x0: x, x1: x + CELL } : null; }
      }
    }
    for (let x = n(bx0); x <= bx1 + 1e-6; x = n(x + CELL)) {
      let run = null;
      for (let z = n(bz0); z <= bz1 + CELL + 1e-6; z = n(z + CELL)) {
        const a = roomAt(x - CELL / 2, z + CELL / 2), b = roomAt(x + CELL / 2, z + CELL / 2);
        let e = null;
        if (a !== b && !inDoor(true, x, z + CELL / 2)) { const low = (a >= 0 && rooms[a].balcony && b < 0) || (b >= 0 && rooms[b].balcony && a < 0); e = (a >= 0 ? 'w' : 'e') + (low ? 'L' : ''); }
        if (e && run && run.e === e) run.z1 = z + CELL;
        else { if (run) seg(run.e[0] === 'w' ? x : x - 0.12, run.z0, run.e[0] === 'w' ? x + 0.12 : x, run.z1, run.e.endsWith('L')); run = e ? { e, z0: z, z1: z + CELL } : null; }
      }
    }
    // windows: the first room looks out from its back wall; a second room has a side window
    const f = this.R.life.floor || 1, view = f >= 5 ? 'view_night_high' : 'view_night_flat';
    windowPane(g, 2.7, 1.5, -5 + 0.13, 1.6, 1.3, 0, { lights: true, view });
    texBox(g, null, 1.85, 0.82, -4.88, 3.55, 0.86, -4.66, { color: 0xe6e0d0 });
    if (rooms[1] && !rooms.some(r => r.balcony && r.x0 >= rooms[1].x0 && r.z1 <= rooms[1].z0 + 1e-6 && false)) windowPane(g, rooms[1].x1 - 0.13, 1.5, -2.8, 1.4, 1.2, -Math.PI / 2, { lights: true, view });
    // the balcony looks out over the estate
    const bal = rooms.find(r => r.balcony);
    if (bal && A.img[view]) {
      const im = new Image(); const t = new THREE.Texture(im); t.colorSpace = THREE.SRGBColorSpace; im.onload = () => { t.needsUpdate = true; }; im.src = A.img[view];
      const vp = new THREE.Mesh(new THREE.PlaneGeometry(34, 19), new THREE.MeshBasicMaterial({ map: t, fog: false, color: 0x9a9aa8 })); vp.position.set((bal.x0 + bal.x1) / 2, 5, bal.z0 - 14); g.add(vp);
    }
  }

  // ---------- your things ----------
  colFor(o, solid) {
    o.updateMatrixWorld(true);
    const b = new THREE.Box3().setFromObject(o);
    const c = { x0: b.min.x + 0.03, x1: b.max.x - 0.03, z0: b.min.z + 0.03, z1: b.max.z - 0.03 };
    if (solid) this.col.push(c);
    return c;
  }
  makeObj(id) {
    const it = ITEM[id];
    if (it.led) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.035, 0.02), new THREE.MeshBasicMaterial({ color: it.led === 'white' ? 0xf4f6ff : ledState(this.R.life).color }));
      m.userData.led = it.led; return m;
    }
    if (it.kind === 'wall') {
      // posters and stickers are lit by themselves (a lit material went black in a dim corner)
      const sz = it.size || 0.62, sticker = it.sticker;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(sz * (it.aspect || 1), sz), new THREE.MeshBasicMaterial({ map: imgTex(it.img), color: 0xd0ccc4, transparent: !!sticker, alphaTest: sticker ? 0.4 : 0, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
      if (!sticker) { const fr = new THREE.Mesh(new THREE.BoxGeometry(sz * (it.aspect || 1) + 0.08, sz + 0.08, 0.02), psxMat({ color: 0x2a2018 })); fr.position.z = -0.012; m.add(fr); }
      return m;
    }
    return inst(it.model);
  }
  spawnPlaced(h) {
    const it = ITEM[h.id]; if (!it) return;
    const o = this.makeObj(h.id);
    o.position.set(h.x, h.y || 0, h.z); o.rotation.y = h.ry != null ? h.ry : (h.r || 0) * Math.PI / 2;
    if (h.sc) o.scale.setScalar(h.sc);
    if (/carpet|rug/.test(it.model || '') || it.id === 'carpet' || it.id === 'gran_rug') { o.position.y += 0.012; o.traverse(m => { if (m.isMesh) { m.material = m.material.clone(); m.material.polygonOffset = true; m.material.polygonOffsetFactor = -1; m.material.polygonOffsetUnits = -4; } }); }   // rugs flickered against the floor   // posters, paintings and stickers can be made bigger or smaller
    this.root.add(o);
    const rec = { h, o, col: null, it: null, it0: it };
    if (it.led) {   // give the strip one of the two lights, just in front of it
      const l = this.ledLights.find(x => !x.userData.rec);
      if (l) { l.userData.rec = rec; rec.light = l; const n = new THREE.Vector3(Math.sin(o.rotation.y), 0, Math.cos(o.rotation.y)); l.position.copy(o.position).addScaledVector(n, 0.35); l.color.set(it.led === 'white' ? 0xf4f6ff : ledState(this.R.life).color); l.intensity = 1.3; }
      this.leds = (this.leds || []).concat(rec);
      if (it.led === 'rgb') { const st = ledState(this.R.life); if (st.since == null) st.since = (this.R.record.nights || []).length; }
    }
    if (it.kind === 'floor' && !it.walk && !(h.y > 0.05)) rec.col = this.colFor(o, true);
    const USE = { sit: 'E sit down', lie: 'E lie down', eat: 'E eat something', tv: 'E switch the TV on or off', view: 'E look at it', led: 'E switch or set it' };
    rec.it = this.it.add(o, () => `${it.name}: ${it.use ? USE[it.use] + ' · Q move it' : 'E move it'}`, () => it.use ? this.useItem(rec) : this.pickUp(rec), () => !this.placing && !this.resting);
    this.placed.push(rec);
  }
  // ---------- living in the flat ----------
  useItem(rec) {
    const it = rec.it0, L = this.R.life;
    if (it.use === 'tv') { this.toggleTv(rec); return; }
    if (it.use === 'view') { this.viewPicture(it); return; }
    if (it.use === 'led') {
      if (it.led === 'white') { rec.off = !rec.off; if (rec.light) rec.light.intensity = rec.off ? 0 : 1.3; rec.o.material.color.set(rec.off ? 0x2a2a2e : 0xf4f6ff); play('click', { vol: 0.4 }); return; }
      this.ledAppOpen(); return;
    }
    if (it.use === 'eat') {
      if (L.fed) { caption('You are not hungry. The fridge hums.', 'say', 2.5); return; }
      L.fed = true; persist(); play('fridgehum', { vol: 0.3 }); play('plastic', { vol: 0.4 });
      caption('Bread, butter, paprika. You eat standing at the counter, like everyone in this block. +5 nerve on the stairs tonight.', 'say', 5); this.refreshHud(); return;
    }
    // sit or lie: the view drops, you stay until you press E again or walk
    const b = new THREE.Box3().setFromObject(rec.o), c = b.getCenter(new THREE.Vector3());
    this.resting = { eye: this.player.eye, x: this.player.pos.x, z: this.player.pos.z, idle: 0, yaw: 0, pitch: 0, c, ry: rec.o.rotation.y };
    const P = this.player; P.pos.set(c.x, 0, c.z); P.eye = it.use === 'lie' ? 0.55 : 1.05; P.frozen = true;
    P.lookOnly = true; P.yaw = rec.o.rotation.y + Math.PI; P.lookCenter = P.yaw; P.lookRange = it.use === 'lie' ? 1.6 : 1.25; P.pitch = it.use === 'lie' ? 0.9 : 0; P.sync();
    this.resting.yaw = P.yaw; this.resting.pitch = P.pitch;
    if (it.use === 'lie') {
      if (!L.rested) { L.rested = true; persist(); }
      caption('You lie down for a while. Somewhere upstairs a TV murmurs. +5 nerve on the stairs tonight. (E or a step to get up)', 'say', 5);
    } else caption('You sit down. The flat is quiet. (E or a step to get up)', 'say', 3.5);
    this.refreshHud();
  }
  /** A picture on the wall, full screen and full resolution (the room itself is drawn at a low PSX resolution). */
  viewPicture(it) {
    const src = A.img[it.img]; if (!src) return;
    this.playing = false; this.G.unlock(); prompt(null);
    const el = document.createElement('div');
    el.style.cssText = 'position:fixed;inset:0;z-index:60;background:rgba(5,5,8,.94);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;cursor:pointer';
    el.innerHTML = `<img src="${src}" style="max-width:94vw;max-height:84vh;box-shadow:0 10px 40px #000;border:6px solid #2a2018"><div style="color:#cbbfa8;font-size:15px">${it.name.replace(/</g, '&lt;')} · click, E or Esc to step back</div>`;
    document.body.appendChild(el);
    const close = () => { removeEventListener('keydown', key, true); el.remove(); this.playing = true; lockPointer(); };
    const key = e => { if (e.code === 'Escape' || e.code === 'KeyE') { e.preventDefault(); e.stopImmediatePropagation(); close(); } };
    setTimeout(() => addEventListener('keydown', key, true), 150); el.onclick = close;
  }
  async ledAppOpen() {
    const L = this.R.life, s = ledState(L), was = ledSecure(s);
    if (s.since == null) s.since = (this.R.record.nights || []).length;
    this.playing = false; this.G.unlock(); prompt(null);
    await ledApp(L, S.nick);
    if (!was && ledSecure(s)) {
      this.R.record.xp += 10; const isNew = noteCard(this.R, 'h:leds');
      caption(s.hacked ? 'The light show stops. The strip is yours again. +10 XP' + (isNew ? ' · New notebook card.' : '') : 'Secured before anyone got in. +10 XP' + (isNew ? ' · New notebook card.' : ''), 'say', 5);
      s.hacked = false;
    }
    persist(); this.applyLeds(); this.playing = true; lockPointer();
  }
  /** After a night out, an unsecured smart strip has been found from the internet. */
  ledHack() {
    const L = this.R.life, s = L.leds; if (!s || s.hacked || ledSecure(s) || s.since == null) return;
    if (!L.home.some(h => h.id === 'led_rgb')) return;
    if ((this.R.record.nights || []).length - s.since >= 1) { s.hacked = true; persist(); this.hackNews = true; }
  }
  applyLeds() {
    const s = ledState(this.R.life);
    for (const r of this.leds || []) if (r.it0.led === 'rgb' && !s.hacked) { r.o.material.color.set(s.color); if (r.light) r.light.color.set(s.color); }
  }
  /** The visitor: made with the flat (so no model loads later), parked far away until needed. */
  makeVisitor() {
    if (!A.models.npc_mannequin2) return;
    const v = this.visitor = new NPC('npc_mannequin2');
    const m = new THREE.MeshBasicMaterial({ color: 0x050506 }); v.obj.traverse(o => { if (o.isMesh) o.material = m; });
    v.obj.scale.set(0.9, 1.1, 0.9); v.obj.position.set(0, -50, 0); this.root.add(v.obj);
  }
  showVisitor() {
    const v = this.visitor, r = this.resting; if (!v) return;
    const side = new THREE.Vector3(Math.cos(r.ry), 0, -Math.sin(r.ry));   // along the seat
    v.pose('Idle_Loop', 0.3); sitDown(v);
    v.obj.position.set(r.c.x + side.x * 0.75, 0.02, r.c.z + side.z * 0.75); this.visitorOn = true;
    play('presence', { vol: 0.18 });
  }
  hideVisitor() { if (!this.visitor) return; this.visitor.obj.position.set(0, -50, 0); this.visitorOn = false; }
  getUp() {
    const r = this.resting; if (!r) return;
    this.hideVisitor();
    this.player.eye = r.eye; this.player.pos.set(r.x, 0, r.z); this.player.frozen = false; this.player.lookOnly = false; this.player.lookCenter = null; this.player.sync(); this.resting = null;
  }
  toggleTv(rec) {
    if (rec.tvOn) { rec.tvOn = false; if (rec.screen) rec.o.remove(rec.screen); if (rec.tvMesh) rec.tvMesh.material = rec.tvMat; this.tvLight.intensity = 0; this.tvOn = null; play('click', { vol: 0.4 }); return; }
    if (this.tvOn) this.toggleTv(this.tvOn);   // one TV at a time (one light, made when the flat was built)
    if (!this.staticTex) { this.staticTex = canvasTex(64, 48, () => { }); this.staticTex.magFilter = THREE.LinearFilter; }
    const o = rec.o, rot = o.rotation.y;
    // the small TV: the static goes straight into the screen part of its own texture, so it fits the glass exactly
    let mesh = null; o.traverse(m => { if (!mesh && m.isMesh && m.material && m.material.map && m.material.map.image) mesh = m; });
    const SCREEN = { tv: [1, 91, 47, 36] }[rec.it0.id];   // x, y, w, h in the 128 px texture (found by looking at it)
    if (mesh && SCREEN) {
      const img = mesh.material.map.image, W = img.width, H = img.height, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
      const t = new THREE.CanvasTexture(cv); t.flipY = mesh.material.map.flipY; t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.NearestFilter;
      const ec = document.createElement('canvas'); ec.width = W; ec.height = H; const et = new THREE.CanvasTexture(ec); et.flipY = t.flipY; et.colorSpace = THREE.SRGBColorSpace; et.magFilter = THREE.NearestFilter;
      rec.tvMat = mesh.material; rec.tvMesh = mesh; const m2 = mesh.material.clone(); m2.onBeforeCompile = rec.tvMat.onBeforeCompile; m2.map = t; m2.emissive = new THREE.Color(0xffffff); m2.emissiveMap = et; mesh.material = m2;   // only the glass glows
      rec.tvCanvas = { cv, g: cv.getContext('2d'), img, t, eg: ec.getContext('2d'), et, r: SCREEN.map(v => v * W / 128) };
    } else {
      o.rotation.y = 0; o.updateMatrixWorld(true);
      const b = new THREE.Box3().setFromObject(o), sz = b.getSize(new THREE.Vector3()), c = b.getCenter(new THREE.Vector3()); o.rotation.y = rot; o.updateMatrixWorld(true);
      const scr = new THREE.Mesh(new THREE.PlaneGeometry(sz.x * 0.62, sz.y * 0.5), new THREE.MeshBasicMaterial({ map: this.staticTex, color: 0xd2b4ff }));
      scr.position.set(c.x - o.position.x, c.y - o.position.y + sz.y * 0.06, b.max.z - o.position.z + 0.012); o.add(scr); rec.screen = scr;
    }
    rec.tvOn = true; this.tvOn = rec;
    const wp = o.getWorldPosition(new THREE.Vector3()), fw = new THREE.Vector3(Math.sin(rot), 0, Math.cos(rot));
    this.tvLight.position.copy(wp).addScaledVector(fw, 0.6); this.tvLight.position.y += 0.35; this.tvLight.intensity = 1.8;
    play('tvon', { vol: 0.4 });
  }
  pickUp(rec) {
    if (this.placing) return;
    if (rec.tvOn) this.toggleTv(rec);
    if (rec.light) { rec.light.intensity = 0; rec.light.userData.rec = null; } if (this.leds) this.leds = this.leds.filter(r => r !== rec);
    const L = this.R.life, i = L.home.indexOf(rec.h); if (i < 0) return;
    lift(L, i); this.root.remove(rec.o); this.it.remove(rec.it);
    if (rec.col) this.col.splice(this.col.indexOf(rec.col), 1);
    this.placed.splice(this.placed.indexOf(rec), 1);
    // whatever stood on it goes back into the box
    if (!(rec.h.y > 0.05)) {
      const b = new THREE.Box3().setFromObject(rec.o);
      for (const r2 of this.placed.slice()) if (r2.h.y > 0.05 && r2.h.x > b.min.x && r2.h.x < b.max.x && r2.h.z > b.min.z && r2.h.z < b.max.z) {
        const j = L.home.indexOf(r2.h); if (j >= 0) lift(L, j); putBack(L, r2.h.id); this.root.remove(r2.o); this.it.remove(r2.it); this.placed.splice(this.placed.indexOf(r2), 1);
      }
    }
    this.startPlacing(rec.h.id, rec.h.r || 0);
  }
  async openBox() {
    this.playing = false; this.G.unlock(); prompt(null);
    const id = await boxPanel(this.R, thumb);
    this.playing = true; lockPointer();
    if (id && takeOut(this.R.life, id)) this.startPlacing(id, 0);
  }
  startPlacing(id, r) {
    const ghost = this.makeObj(id);
    ghost.traverse(o => { if (o.isMesh) { o.material = o.material.clone(); o.material.transparent = true; o.material.opacity = 0.6; } });
    this.root.add(ghost);
    this.placing = { id, item: ITEM[id], ghost, r, valid: false, sc: 1 };
    play('click', { vol: 0.4 });
    objective(ITEM[id].kind === 'wall' ? `Placing: ${ITEM[id].name}. Look at a wall. E puts it up · Z smaller · C bigger (or the mouse wheel) · X back in the box.` : `Placing: ${ITEM[id].name}. Look where you want it. E puts it down · R turns it · X back in the box. Small things go on tables too.`);
  }
  updatePlacing() {
    const P = this.placing, cam = this.G.camera, ray = new THREE.Raycaster();
    ray.setFromCamera({ x: 0, y: 0 }, cam);
    let ok = false, seen = false;
    if (P.item.kind === 'wall') {
      const hit = ray.intersectObjects(this.block, false).find(h => h.distance < 3.5 && h.face && Math.abs(h.face.normal.y) < 0.5);
      if (hit) {
        const nrm = hit.face.normal.clone().transformDirection(hit.object.matrixWorld);
        const y = Math.max(1.2, Math.min(1.95, hit.point.y));
        P.ghost.position.set(hit.point.x + nrm.x * 0.03, y, hit.point.z + nrm.z * 0.03);
        P.ghost.rotation.y = Math.atan2(nrm.x, nrm.z); P.ry = P.ghost.rotation.y; seen = true;
        ok = insideFlat(this.R.life, P.ghost.position.x + nrm.x * 0.3, P.ghost.position.z + nrm.z * 0.3) && !(Math.abs(P.ghost.position.z) < 0.2 && Math.abs(P.ghost.position.x - 0.9) < 0.7);
      }
    } else {
      const o = ray.ray.origin, d = ray.ray.direction;
      // small things can go on top of furniture: a TV on the table, a teddy on the bed
      const onTop = P.item.top ? ray.intersectObjects(this.placed.filter(r => r.it0 && r.it0.kind === 'floor' && !r.it0.top).map(r => r.o), true).find(h => h.distance < 3.5 && h.face && h.face.normal.clone().transformDirection(h.object.matrixWorld).y > 0.7) : null;
      if (onTop) {
        const x = Math.round(onTop.point.x / 0.05) * 0.05, z = Math.round(onTop.point.z / 0.05) * 0.05;
        P.ghost.position.set(x, onTop.point.y, z); P.ghost.rotation.y = P.r * Math.PI / 2; seen = true; ok = true; P.y = onTop.point.y;
      } else if (d.y < -0.05) {
        const t = -o.y / d.y; if (t < 4) {
          const x = Math.round((o.x + d.x * t) / 0.25) * 0.25, z = Math.round((o.z + d.z * t) / 0.25) * 0.25;
          P.ghost.position.set(x, 0, z); P.ghost.rotation.y = P.r * Math.PI / 2; P.ghost.updateMatrixWorld(true); seen = true; P.y = 0;
          const b = new THREE.Box3().setFromObject(P.ghost);
          const corners = [[b.min.x, b.min.z], [b.max.x, b.min.z], [b.min.x, b.max.z], [b.max.x, b.max.z]];
          const L = this.R.life;
          ok = corners.every(([cx, cz]) => insideFlat(L, cx, cz, -0.02)) && !(b.max.z > -1.2 && b.min.x < 1.5 && b.max.x > 0.3);   // keep the front door free
          if (ok && !P.item.walk) {
            const me = { x0: b.min.x, x1: b.max.x, z0: b.min.z, z1: b.max.z }, pp = this.player.pos;
            const hits = c => c.x0 < me.x1 && c.x1 > me.x0 && c.z0 < me.z1 && c.z1 > me.z0;
            ok = !this.col.some(c => !c.off && hits(c)) && !(pp.x > me.x0 - 0.3 && pp.x < me.x1 + 0.3 && pp.z > me.z0 - 0.3 && pp.z < me.z1 + 0.3);
          }
        }
      }
    }
    P.valid = ok; P.ghost.visible = seen;
    P.ghost.traverse(m => { if (m.isMesh) m.material.color.set(ok ? 0x9fffb0 : 0xff7a6a); });
    const keys = P.item.kind === 'wall' ? 'Z smaller · C bigger (or the mouse wheel) · X back in the box' : 'R turn · X back in the box';
    prompt(ok ? `${P.item.name}: E put it here · ${keys}` : `${P.item.name}: not here · ${keys}`);
    if (wasPressed('KeyR')) { P.r = (P.r + 1) % 4; play('click', { vol: 0.25, rate: 1.3 }); }
    if (P.item.kind === 'wall') {   // size: Z smaller, C bigger, or the mouse wheel
      const w = this.wheel || 0; this.wheel = 0;
      if (wasPressed('KeyZ') || w > 0) P.sc = Math.max(0.4, P.sc / 1.15);
      if (wasPressed('KeyC') || w < 0) P.sc = Math.min(3, P.sc * 1.15);
      P.ghost.scale.setScalar(P.sc);
    }
    if (wasPressed('KeyX')) { this.root.remove(P.ghost); putBack(this.R.life, P.id); this.placing = null; persist(); this.refreshHud(); this.setObjective(); play('box', { vol: 0.4 }); return; }
    if (wasPressed('KeyE') && ok) {
      const h = P.item.kind === 'wall' ? { id: P.id, x: P.ghost.position.x, y: P.ghost.position.y, z: P.ghost.position.z, ry: P.ry, sc: Math.round(P.sc * 100) / 100 } : { id: P.id, x: P.ghost.position.x, y: P.y || 0, z: P.ghost.position.z, r: P.r };
      this.root.remove(P.ghost); this.placing = null;
      placeItem(this.R.life, h); this.spawnPlaced(h); persist();
      play('drop', { vol: 0.4 }); this.refreshHud(); this.setObjective();
      caption(`Placed. Cosiness ${cosiness(this.R.life)}: you start the stairs with ${startNerve(this.R.life)} nerve.`, 'say', 3);
    }
  }

  // ---------- flow ----------
  async enter() {
    this._wh = e => { if (this.placing) this.wheel = e.deltaY; }; addEventListener('wheel', this._wh, { passive: true });
    this.playing = false; hud(false); music('mus_debrief', 0.25);
    loop('fh', 'hum', { vol: 0.05 }); this.loops.push('fh');
    this.player.set(0.9, -0.8, 0);
    await fade(false, '', 0.8);
    this.playing = true; hud(true); hudParts({ checklist: true, status: false, eye: false, batt: false });
    this.refreshHud(); this.setObjective();
    if (!this.R.record.descents && !this.R.record.deaths) caption('Your own flat. Nothing can hurt you in here.', 'say', 4);
    if (this.hackNews) { this.hackNews = false; setTimeout(() => caption('Your smart LED strip is flashing every colour at once, and the app will not let you change it. Someone else is in control. Open the app (E on the strip).', 'say', 7), 1200); }
    lockPointer();
  }
  setObjective() {
    const L = this.R.life, n = Object.values(L.inv).reduce((a, b) => a + b, 0);
    objective(n ? `You have ${n} thing${n > 1 ? 's' : ''} in the box by the door. Place them to make the flat cosy, then go out through the front door.`
      : 'Your flat is safe. Buy things on the computer to make it cosy. When you are ready, go out through the front door.');
  }
  refreshHud() {
    const L = this.R.life;
    checklist(`${flatOf(L).name} · ${L.floor}. emelet`, [
      { name: `Coins: ${L.coins}`, hu: 'zseton' }, { name: `Cosiness: ${cosiness(L)}/30`, hu: 'komfort' },
      { name: `Nerve on the stairs: ${startNerve(L)}`, hu: 'idegek' }, { name: `Life ${L.id} · XP ${this.R.record.xp}`, hu: 'élet' },
      { name: `Notebook: ${this.R.record.notebook.length} cards`, hu: 'jegyzetfüzet' },
    ]);
  }
  async computer() {
    this.playing = false; this.G.unlock(); prompt(null); play('click', { vol: 0.4 });
    const r = await homeComputer(this.R, S.nick || '', thumb);
    persist();
    if (this.R._rebuild) { this.R._rebuild = false; this.G.goRogue(); return; }   // new walls: build the flat again
    if (r.move) {
      const { moveUp } = await import('../logic/home.js');
      if (moveUp(this.R.life)) {
        await fade(true, 'Moving day. Everything goes into boxes.', 0.8);
        this.R.life.floor = await (async () => { await fade(false, '', 0.01); return floorPicker(this.R); })();
        persist(); this.G.goRogue(); return;
      }
    }
    this.refreshHud(); this.setObjective(); this.playing = true; lockPointer();
  }
  async goOut() {
    if (this.leaving || this.placing) return; this.leaving = true; this.playing = false; prompt(null); this.G.unlock();
    const going = await this.G.startNight();   // the night menu: topic, difficulty, scores
    if (!going) { this.leaving = false; this.playing = true; lockPointer(); }
  }
  quit() { if (this.placing) { putBack(this.R.life, this.placing.id); this.placing = null; } persist(); this.playing = false; this.G.goHub(); }
  exit() { if (this._wh) removeEventListener('wheel', this._wh); super.exit && super.exit(); }
  update(dt, t) {
    const ls = this.R.life.leds;
    if (ls && ls.hacked && this.leds) for (const r of this.leds) if (r.it0.led === 'rgb') {   // UNICORN PARTY MODE
      const c = new THREE.Color().setHSL((t * 0.9 + r.h.x * 0.1) % 1, 1, 0.55); r.o.material.color.copy(c);
      if (r.light) { r.light.color.copy(c); r.light.intensity = Math.sin(t * 13) > 0 ? 2.2 : 0.3; }
    }
    if (this.tvOn) {   // the TV: static and a purple glow that breathes
      this._tv = (this._tv || 0) - dt;
      if (this._tv <= 0) {
        this._tv = 0.07; const c = this.staticTex.userData.g;
        const im = c.createImageData(64, 48); for (let i = 0; i < im.data.length; i += 4) { const v = Math.random() * 255; im.data[i] = v * 0.85; im.data[i + 1] = v * 0.7; im.data[i + 2] = v; im.data[i + 3] = 255; }
        c.putImageData(im, 0, 0); c.fillStyle = 'rgba(170,90,255,.25)'; c.fillRect(0, (t * 40) % 48, 64, 5); this.staticTex.needsUpdate = true;
        const T = this.tvOn.tvCanvas;
        if (T) {
          T.g.drawImage(T.img, 0, 0); T.g.imageSmoothingEnabled = false; T.g.drawImage(this.staticTex.userData.canvas, T.r[0], T.r[1], T.r[2], T.r[3]); T.t.needsUpdate = true;
          T.eg.fillStyle = '#000'; T.eg.fillRect(0, 0, T.cv.width, T.cv.height); T.eg.imageSmoothingEnabled = false; T.eg.drawImage(this.staticTex.userData.canvas, T.r[0], T.r[1], T.r[2], T.r[3]); T.et.needsUpdate = true;
        }
        this.tvLight.intensity = 1.5 + Math.random() * 0.6;
      }
    }
    if (!this.playing) return;
    this.player.update(dt);
    if (this.resting) {
      if (['KeyE', 'KeyW', 'KeyA', 'KeyS', 'KeyD'].some(k => wasPressed(k))) { this.getUp(); return; }
      // sit still long enough and you are not alone: something sits down next to you and watches you, until you move
      const r = this.resting, P = this.player, moved = Math.abs(P.yaw - r.yaw) + Math.abs(P.pitch - r.pitch) > 0.004;
      r.yaw = P.yaw; r.pitch = P.pitch;
      if (moved) { r.idle = 0; if (this.visitorOn) this.hideVisitor(); }
      else if ((r.idle += dt) > 20 && !this.visitorOn) this.showVisitor();
      if (this.visitorOn) { const v = this.visitor; v.faceTo(P.pos.x, P.pos.z); v.obj.rotation.y = v.facing; }
      return;
    }
    if (!this.placing && wasPressed('KeyQ')) { const rec = this.placed.find(r => r.it === this.it.current); if (rec) { this.pickUp(rec); return; } }
    if (this.placing) this.updatePlacing(); else this.interact();
  }
}
