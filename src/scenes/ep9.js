// Episode 8 in play order (internal id 9): "Anya hangja" (Mum's voice).
// Nagyi's flat on the 7th floor of an Újpest panel block. A cloned voice of Mum asks for bail money;
// a "lawyer" will collect it at midnight. Check, call back on a number you already know, keep the door shut.
import * as THREE from 'three';
import { A, inst } from '../core/assets.js';
import { psxMat } from '../core/render.js';
import { texBox, plane, wall, canvasTex, place, colliderFor, windowPane, lamp } from '../core/world.js';
import { lockPointer } from '../core/player.js';
import { hud, hudParts, objective, prompt, caption, toast, fade, flash, checklist, wait } from '../core/hud.js';
import { music, loop, stopLoop, play } from '../core/audio.js';
import { S, epData, persist } from '../core/state.js';
import { DEBRIEF_EP9, rich, epPos } from '../text.js';
import { openScreen, closeScreen, debriefScreen, cutIn } from '../ui/screens.js';
import { NPC, Graph } from '../core/npc.js';
import { Walker } from './walker.js';

const D2R = Math.PI / 180;
const START = 22 * 60 + 38;          // the clock starts at 22:38
const SPM = 7.5;                     // real seconds per game minute
const MIDNIGHT = (24 * 60 - START) * SPM;
const NUM = { police: '112', ward: '3507712', mum: '06304182275', scam: '06205550193' };
const SHOW = { ward: '350-7712', mum: '06 30 418 2275', scam: '06 20 555 0193' };
const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const nick = () => (S.nick || 'kicsim').replace(/[<>]/g, '');

export class Ep9 extends Walker {
  constructor(G) { super(G); this.epN = 9; }

  async build() {
    const g = this.newScene(0x050407, 2.5, 13);
    this.buildFlat(g);
    this.amb = new THREE.AmbientLight(0x404a66, 0.2); this.scene.add(this.amb);
    this.hemi = new THREE.HemisphereLight(0x4a5878, 0x140e0a, 0.18); this.scene.add(this.hemi);
    // Nagyi
    this.nagyi = new NPC('npc_nagyi', { idle: 'Idle_Loop', speed: 0.75 }); g.add(this.nagyi.obj);
    const hit = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 1.6, 6), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })); hit.position.y = 0.8; this.nagyi.obj.add(hit); this.nagyiHit = hit;
    this.graph = new Graph({
      chair: [3.75, 5.3], liv: [3.0, 4.65], hallS: [1.0, 4.65], hallN: [1.0, 2.35], phone: [1.2, 1.3], kd: [2.6, 2.35], ktable: [3.4, 1.45],
      bd: [0.5, 5.45], bed: [-0.55, 5.45], front: [1.05, 0.75],
    }, [['chair', 'liv'], ['liv', 'hallS'], ['hallS', 'hallN'], ['hallN', 'phone'], ['hallN', 'kd'], ['kd', 'ktable'], ['hallS', 'bd'], ['bd', 'bed'], ['phone', 'front'], ['hallN', 'front']]);
    this.setupRig({ arms: true, flash: true, stepVol: 0.25, reach: 2.3 });
    this.flashOn = false;
    this.setupInteractions();
    const sv = epData(9).state;
    this.st = { phase: 'intro', el: 0, ev: {}, kind: 0, blunt: 0, tells: {}, callerSeen: false, mobSeen: false, bookSeen: false, cardSeen: false,
      mumOK: false, wardTried: false, mumMobTried: false, scamCalled: false, police: false, verifiedEarly: false, codeword: null, start: Date.now() };
    if (sv) { Object.assign(this.st, sv, { start: Date.now() - (sv.elapsed || 0) }); }
  }

  // ---------------- the flat ----------------
  buildFlat(g) {
    const col = this.col, block = this.block, W = { col, block, h: 2.6, tile: 2.6 };
    // floors and ceiling
    plane(g, 'sv_floor', -3, 2.5, 0, 8, 0, { tile: 1.2 });       // bedroom
    plane(g, 'tiles', -3, 0, 0, 2.5, 0, { tile: 0.6 });           // bathroom
    plane(g, 'sv_floor', 0, 0, 2, 8, 0, { tile: 1.2 });           // hall
    plane(g, 'tiles', 2, 0, 7, 3, 0, { tile: 0.7, color: 0xd8cfc0 }); // kitchen
    plane(g, 'sv_floor', 2, 3, 7, 8, 0, { tile: 1.2 });           // living room
    plane(g, 'sv_ceiling', -3, 0, 7, 8, 2.6, { tile: 1.5, ceiling: true, color: 0xb8b2a6 });
    // outer walls
    wall(g, 'sv_wallpaper', -3, 0, 7, 0, { ...W, gaps: [[0.6, 1.5, 2.05]] });
    wall(g, 'sv_wallpaper', -3, 8, 7, 8, W);
    wall(g, 'sv_wallpaper', -3, 0, -3, 8, W);
    wall(g, 'sv_wallpaper', 7, 0, 7, 8, W);
    // inner walls
    wall(g, 'sv_wallpaper', 0, 0, 0, 8, { ...W, gaps: [[1.5, 2.3, 2.05], [5.0, 5.9, 2.05]] });
    wall(g, 'sv_wallpaper', 2, 0, 2, 8, { ...W, gaps: [[1.9, 2.8, 2.05], [4.2, 5.1, 2.05]] });
    wall(g, 'sv_wallpaper', -3, 2.5, 0, 2.5, W);
    wall(g, 'wall2', 2, 3, 7, 3, W);
    wall(g, 'sv_wallpaper', 0, 7.2, 2, 7.2, W);
    // door frames
    for (const [x, z] of [[0, 1.9], [0, 5.45], [2, 2.35], [2, 4.65]]) place(g, 'sv_door_1', x, 0, z, 90, { scale: 0.92 });
    // front door, always shut
    this.frontDoor = place(g, 'sv_door', 1.05, 0, 0.1, 0, { scale: 1.06 });
    { const pe = new THREE.Mesh(new THREE.CircleGeometry(0.018, 8), new THREE.MeshBasicMaterial({ color: 0xd8c890, fog: false })); pe.position.set(1.05, 1.55, 0.16); g.add(pe); this.peepGlow = pe.material; }
    // ----- hall -----
    texBox(g, 'wood_dark', 1.6, 0, 0.85, 1.94, 0.72, 1.75, { col, block });
    const doily = place(g, 'sv_napkin', 1.77, 0.725, 1.3, 0, { scale: 0.42 });
    this.phone = place(g, 'sv_phone', 1.78, 0.73, 1.08, -90, { scale: 0.75 });
    this.machine = new THREE.Group(); this.machine.position.set(1.78, 0.73, 1.52); g.add(this.machine);
    { const b = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.06, 0.22), psxMat({ color: 0x1c1b1e })); b.position.y = 0.03; this.machine.add(b);
      const tape = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.005, 0.06), psxMat({ color: 0x5a5048 })); tape.position.set(-0.02, 0.062, 0.02); this.machine.add(tape);
      this.ledM = new THREE.MeshBasicMaterial({ color: 0x300000, fog: false }); const led = new THREE.Mesh(new THREE.SphereGeometry(0.011, 5, 4), this.ledM); led.position.set(-0.07, 0.064, -0.08); this.machine.add(led);
      this.ledL = new THREE.PointLight(0xff2010, 0, 1.1, 1.6); this.ledL.position.set(-0.07, 0.12, -0.08); this.machine.add(this.ledL); }
    this.callerId = new THREE.Group(); this.callerId.position.set(1.8, 0.73, 0.94); g.add(this.callerId);
    { const b = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.05, 0.1), psxMat({ color: 0xd8d2c4 })); b.position.y = 0.025; this.callerId.add(b);
      this.cidTex = canvasTex(32, 12, (c, w, h) => { c.fillStyle = '#9fb48a'; c.fillRect(0, 0, w, h); c.fillStyle = '#1a2a12'; c.font = '16px m5x7'; c.textBaseline = 'top'; c.fillText('22:40', 2, -3); });
      const s = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.026), new THREE.MeshBasicMaterial({ map: this.cidTex, fog: false })); s.position.set(-0.051, 0.03, 0); s.rotation.y = -Math.PI / 2; this.callerId.add(s); }
    // coat stand with Nagyi's coat
    this.coat = new THREE.Group(); this.coat.position.set(0.28, 0, 1.0); g.add(this.coat); col.push({ x0: 0.08, x1: 0.48, z0: 0.8, z1: 1.2 });
    { const m = psxMat({ color: 0x5a3e2a }); const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 1.8, 5), psxMat({ color: 0x3a2a1e })); pole.position.y = 0.9; this.coat.add(pole);
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.26, 1.15, 7), m); c.position.y = 0.95; this.coat.add(c);
      const sh = new THREE.Mesh(new THREE.SphereGeometry(0.2, 7, 4, 0, Math.PI * 2, 0, Math.PI / 2), m); sh.scale.set(1.1, 0.45, 0.75); sh.position.y = 1.5; this.coat.add(sh);
      const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.13, 0.12, 8), psxMat({ color: 0x3a3048 })); hat.position.set(0, 1.86, 0); this.coat.add(hat); }
    texBox(g, 'wood_dark', 0.06, 0, 3.0, 0.42, 0.5, 4.0, { col, block });  // shoe cabinet
    { const mir = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.8), new THREE.MeshBasicMaterial({ color: 0x2a3038 })); mir.position.set(0.07, 1.4, 3.5); mir.rotation.y = Math.PI / 2; g.add(mir); }
    place(g, 'cupboard', 1.0, 0, 6.85, 180, { col });
    this.hallLamp = lamp(g, 1.0, 2.6, 3.0, { intensity: 2.2, dist: 5 }); this.hallLamp.set(0.6);
    // ----- kitchen -----
    for (const x of [2.55, 3.45]) place(g, 'kcabinet', x, 0, 0.35, 0, { col });
    place(g, 'ksink', 4.35, 0, 0.35, 0, { col });
    for (const x of [2.55, 3.45, 4.35]) place(g, 'kupper', x, 1.55, 0.2, 0);
    this.fridge = place(g, 'fridge', 6.4, 0, 0.45, 0, { col });
    windowPane(g, 5.3, 1.5, 0.08, 1.1, 1.0, 0, { lights: true, view: 'view_night_high' });
    place(g, 'diningtable', 3.9, 0, 1.75, 90, { col });
    place(g, 'diningchair', 3.0, 0, 1.75, 90); place(g, 'diningchair', 4.8, 0, 1.75, -90);
    // biscuit tins and the money Nagyi is counting
    this.tins = new THREE.Group(); this.tins.position.set(3.9, 0.76, 1.75); g.add(this.tins);
    [[0x8a2020, -0.25, -0.1], [0x24406a, 0.05, 0.12], [0x6a5a20, 0.3, -0.05]].forEach(([c, x, z]) => { const t = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.09, 10), psxMat({ color: c })); t.position.set(x, 0.045, z); this.tins.add(t); });
    for (let i = 0; i < 5; i++) { const n = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.012, 0.07), psxMat({ color: 0x7a9a8a })); n.position.set(-0.05 + i * 0.03, 0.006 + i * 0.012, 0.25); n.rotation.y = i * 0.3; n.visible = false; this.tins.add(n); }
    this.cash = this.tins.children.slice(3);
    // birthday card on the fridge door
    { const t = canvasTex(64, 48, (c, w, h) => { c.fillStyle = '#f4e6d0'; c.fillRect(0, 0, w, h); c.fillStyle = '#c0304a'; c.font = '16px m5x7'; c.textBaseline = 'top'; c.fillText('Boldog', 4, 2); c.fillText('szülinapot,', 4, 14); c.fillText('Anyu!', 4, 26); c.fillStyle = '#2a6a3a'; c.fillText('- Kati', 30, 36); });
      this.card = new THREE.Mesh(new THREE.PlaneGeometry(0.17, 0.13), new THREE.MeshBasicMaterial({ map: t })); this.card.position.set(6.35, 1.35, 0.79); g.add(this.card); }
    this.kitchenLight = new THREE.PointLight(0xfff0d0, 0, 6, 1.6); this.kitchenLight.position.set(3.9, 2.3, 1.6); g.add(this.kitchenLight);
    // ----- living room -----
    place(g, 'sv_closet', 4.5, 0, 3.36, 0, { col });
    place(g, 'sv_carpet', 4.6, 0.01, 5.9, 0, { scale: 0.75 });
    this.chair = place(g, 'sv_cube010', 3.35, 0, 5.3, 90, { col, shrink: 0.12 });
    place(g, 'sv_sofa', 4.6, 0, 7.5, 180, { col });
    place(g, 'sv_cube012', 4.6, 0, 6.15, 0, { col, scale: 0.8 });
    place(g, 'sv_napkin', 4.6, 0.49, 6.15, 0, { scale: 0.45 });
    this.photo = place(g, 'photoframe', 4.4, 0.495, 6.05, 20, { scale: 0.8 });
    place(g, 'sv_vase', 4.85, 0.495, 6.25, 0, { scale: 0.8 });
    texBox(g, 'wood_dark', 6.25, 0, 4.85, 6.9, 0.5, 5.75, { col, block });
    this.tv = place(g, 'sv_tv', 6.6, 0.5, 5.3, -90, { scale: 0.7 });
    this.tvTex = canvasTex(96, 72, (c, w, h) => { c.fillStyle = '#000'; c.fillRect(0, 0, w, h); });
    this.tvScr = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.32), new THREE.MeshBasicMaterial({ map: this.tvTex, fog: false })); this.tvScr.position.set(6.37, 0.74, 5.27); this.tvScr.rotation.y = -Math.PI / 2; g.add(this.tvScr);
    this.tvLight = new THREE.PointLight(0x9ab8ff, 0, 4, 1.6); this.tvLight.position.set(5.9, 0.9, 5.3); g.add(this.tvLight);
    if (A.img.ep9_mum_cooking) { this.mumImg = new Image(); this.mumImg.src = A.img.ep9_mum_cooking; }
    place(g, 'sv_piano', 6.58, 0, 6.85, -90, { col });
    place(g, 'sv_lamp', 2.45, 0, 7.55, 0, { col, scale: 0.85 });
    this.livLamp = new THREE.PointLight(0xffc880, 1.1, 5, 1.6); this.livLamp.position.set(2.5, 1.6, 7.4); g.add(this.livLamp);
    place(g, 'sv_painting001', 2.08, 1.55, 6.3, 90);
    place(g, 'sv_painting003', 5.6, 1.6, 7.92, 180, { scale: 0.8 });
    place(g, 'sv_plant', 2.55, 0, 3.55, 0, { scale: 0.8 });
    windowPane(g, 3.6, 1.5, 7.92, 1.2, 1.2, Math.PI, { lights: true, view: 'view_night_high' });
    this.winLiv = windowPane(g, 6.6, 1.5, 3.08, 0.01, 0.01, 0); this.winLiv.visible = false;
    // police lights later come through this window
    this.blue = new THREE.PointLight(0x3060ff, 0, 7, 1.4); this.blue.position.set(3.6, 1.6, 7.4); g.add(this.blue);
    // ----- bedroom -----
    place(g, 'bigbed', -1.6, 0, 6.85, 180, { col });
    place(g, 'bigmattress', -1.6, 0.25, 6.85, 180);
    this.bedside = place(g, 'bedside', -0.42, 0, 7.55, 180, { col });
    place(g, 'wardrobe', -2.65, 0, 3.6, 90, { col });
    windowPane(g, -2.93, 1.5, 5.6, 1.1, 1.1, Math.PI / 2, { lights: true, view: 'view_night_high' });
    { const gown = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.22, 1.0, 6), psxMat({ color: 0xc8c0d0 })); gown.position.set(-0.3, 1.0, 2.75); g.add(gown); }
    // ----- bathroom -----
    place(g, 'ksink', -1.5, 0, 0.35, 0, { col });
  }

  setupInteractions() {
    const it = this.it;
    it.add(this.phone, () => this.ringing ? (this.st.phase === 'end' ? 'Answer the phone' : 'The phone is ringing') : 'Landline phone (vezetékes telefon): call someone', () => this.usePhone());
    it.add(this.machine, () => this.st.ev.msg2 ? 'Answering machine (üzenetrögzítő): play the tape' : 'Answering machine (üzenetrögzítő)', () => this.openMachine(), () => this.st.ev.call1Done);
    it.add(this.callerId, 'Caller ID display (hívószám-kijelző)', () => this.openCallerId(), () => this.st.ev.call1Done);
    it.add(this.coat, 'Nagyi\'s coat: her mobile is in the pocket', () => this.openMobile(), () => this.st.ev.call1Done);
    it.add(this.bedside, 'Bedside table drawer: Nagyi\'s address book', () => this.openBook(), () => this.st.ev.call1Done);
    it.add(this.card, 'A birthday card on the fridge', () => { this.st.cardSeen = true; play('paper', { vol: 0.4 }); caption('"Boldog szülinapot, Anyu! - Kati". Mum always calls Nagyi "Anyu". Never anything else.', 'say', 5); this.save(); });
    it.add(this.photo, 'A family photo on the lace doily', () => this.showPhoto());
    it.add(this.tv, 'Nagyi\'s TV', () => caption(this.st.ev.call1Done ? 'Mum\'s cooking channel, paused. 31 videos. In every one she talks for ten minutes.' : 'Nagyi watches Mum\'s cooking videos every evening. "So I can hear her voice."', 'say', 4.5));
    it.add(this.frontDoor, () => this.st.phase === 'midnight' ? 'Look through the peephole (kémlelő)' : 'Front door', () => this.useDoor());
    it.add(this.nagyiHit, 'Nagyi', () => this.talkNagyi(), () => this.st.ev.call1Done && !this.nagyiBusy && this.st.phase !== 'end');
  }

  // ---------------- flow ----------------
  async enter() {
    this.playing = false; hud(false); music(null);
    loop('amb9', 'amb_still', { vol: 0.35 }); this.loops.push('amb9');
    loop('tick9', 'click', { vol: 0.06, rate: 0.6, pos: [4.5, 1.8, 3.4] }); this.loops.push('tick9');
    if (this.st.phase === 'intro') {
      this.player.set(5.4, 6.7, 60);
      this.nagyi.obj.position.set(3.75, 0, 5.3); this.nagyi.obj.rotation.y = Math.PI / 2; this.nagyi.facing = Math.PI / 2; this.nagyi.play('Sitting_Idle_Loop', 0);
      this.kitchenLight.intensity = 0;
      if (A.img.ep9_courtyard) await cutIn(A.img.ep9_courtyard, '22:38', 3800, 'tall');
      await fade(true, 'Thursday, 22:38. Nagyi\'s flat, 7th floor, Újpest.\n\nMum is on night shift at the hospital, so you are sleeping over.\nNagyi is watching Mum\'s cooking videos again, "so I can hear her voice".', 0.01);
      await wait(5);
      this.st.phase = 'play'; this.begin(false);
      await fade(false, '', 1.2);
    } else {
      if (!this.st.ev.call1Done) { this.st = { ...this.st, phase: 'play', el: 0, ev: {} }; this.enterFresh = true; }
      this.placeNagyiKitchen(); this.player.set(1.0, 3.6, 180);
      this.begin(true); await fade(false, '', 0.8);
    }
  }
  begin(resumed) {
    this.playing = true; hud(true); hudParts({ checklist: true, status: false, eye: false, batt: false });
    music('mus_dark', 0.12); this.updateGoals(); this.setObjective();
    if (resumed) caption('Back in Nagyi\'s flat. The clock kept going.', 'say', 4);
    lockPointer();
  }
  placeNagyiKitchen() {
    const n = this.nagyi; n.stop(); n.obj.visible = true; n.obj.position.set(3.4, 0, 1.45); n.faceTo(3.9, 1.75); n.obj.rotation.y = n.facing; n.play('Interact', 0.2);
    this.kitchenLight.intensity = 1.6; this.cash.forEach(c => c.visible = true); this.nagyiAt = 'kitchen';
  }
  clock(el = this.st.el) { const m = Math.floor(START + el / SPM); return String(Math.floor(m / 60) % 24).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); }
  walkNagyi(to, then) {
    const n = this.nagyi, p = n.obj.position, T = this.graph.n[to];
    n.walkTo(this.graph.route(p.x, p.z, T[0], T[1]), then);
  }
  after(sec, f) { (this.q = this.q || []).push({ at: this.st.el + sec, f }); }

  updateGoals() {
    const s = this.st, n = Object.keys(s.tells).length;
    if (!s.ev.call1Done) { checklist(this.clock(), [{ name: 'Nagyi is on the phone', hu: '', cls: 'got' }]); return; }
    checklist(`${this.clock()} · the "lawyer" comes at midnight`, [
      { name: `Listen to the tape again (${n}/3)`, hu: 'üzenetrögzítő', cls: n >= 3 ? 'done' : n ? 'got' : '' },
      { name: 'Whose number called?', hu: 'hívószám-kijelző', cls: s.callerSeen ? 'done' : '' },
      { name: 'Nagyi\'s mobile: Mum\'s last text', hu: 'mobil', cls: s.mobSeen ? 'done' : '' },
      { name: 'A number you already trust', hu: 'címjegyzék', cls: s.bookSeen ? 'done' : '' },
      { name: 'Call back on that number', hu: 'visszahívás', cls: s.mumOK ? 'done' : '' },
      { name: 'Midnight: keep the door shut', hu: 'ajtó', cls: s.phase === 'end' ? 'done' : '' },
    ]);
  }
  setObjective() {
    const s = this.st;
    if (!s.ev.call1Done) return objective('Nagyi is answering the phone in the hall.');
    if (s.phase === 'midnight') return objective(s.police ? 'Keep the door shut. The police are on the way.' : 'Don\'t open the door. Call [[112]] on the landline.'.replace('[[112]]', '112'));
    if (s.mumOK) return objective('Mum is safe at work. Don\'t open the door to anyone.');
    const n = Object.keys(s.tells).length;
    if (n < 3) return objective('Was that really Mum? Play the tape on the answering machine in the hall.');
    if (!s.bookSeen) return objective('Find a number for Mum you can trust: Nagyi\'s address book, by her bed.');
    return objective('Call back on that number: the landline in the hall.');
  }
  save() {
    const st = this.st; if (st.phase === 'intro' || st.phase === 'end') return;
    const { start, ...rest } = st; epData(9).state = { ...rest, elapsed: Date.now() - start }; persist();
  }

  // ---------------- the calls ----------------
  // a short scripted exchange in a panel; returns the key of the chosen option
  talk(steps) {
    return new Promise(async res => {
      this.playing = false; this.G.unlock(); prompt(null);
      const el = openScreen(`<div class="panel" style="width:min(640px,94vw);margin-top:34vh"><div id="dlg"></div></div>`);
      const show = s => new Promise(r => {
        el.querySelector('#dlg').innerHTML = `<p${s.call ? ' style="color:#ffd2c4"' : ''}><b>${esc(s.who)}${s.call ? ' 📞' : ''}:</b> ${rich(esc(s.text))}</p><div class="btns" style="flex-direction:column;align-items:stretch">${(s.opts || [['ok', '…']]).map(([k, l]) => `<button class="btn" data-k="${k}">${esc(l)}</button>`).join('')}</div>`;
        el.querySelectorAll('[data-k]').forEach(b => b.onclick = () => { play('uiclick', { vol: 0.4 }); r(b.dataset.k); });
      });
      let last = null;
      for (const s of steps) { if (s.sfx) play(s.sfx, { vol: 0.5 }); last = await show(typeof s === 'function' ? s(last) : s); if (s.then) { const more = s.then(last); if (more) for (const m of more) last = await show(m); } }
      closeScreen(el); this.playing = true; lockPointer(); res(last);
    });
  }
  async firstCall() {
    const n = this.nagyi;
    stopLoop('ring9'); this.ringing = false; play('pickup', { vol: 0.6, pos: [1.78, 0.8, 1.08] }); n.play('Idle_Talking_Loop', 0.3);
    loop('line9', 'hum', { vol: 0.12, rate: 1.7, pos: [1.6, 1, 1.2] });
    const lines = [
      ['Nagyi', 'Halló? …Kati? Kati, is that you?', 'say'],
      ['"Mum" (on the phone)', '…Mama? Mama, it\'s me… [crying] I hit a woman on the crossing. She\'s in hospital. The police are here…', 'call'],
      ['Nagyi', 'Jesus Mary. Kati, which hospital? Where are you?', 'say'],
      ['"Mum" (on the phone)', 'Mama, please, there\'s no time. Don\'t tell anyone. Not even the kid.', 'call'],
      ['A man (on the phone)', 'Good evening, madam. Dr. Halmi, your daughter\'s lawyer. If the bail is paid tonight, she sleeps at home. Nine hundred thousand forints, in cash. My colleague will come to your flat at midnight.', 'call'],
      ['A man (on the phone)', 'Don\'t call anyone. It would make things much worse for her.', 'call'],
      ['Nagyi', 'Yes… yes. I\'ll have it ready.', 'say'],
    ];
    for (const [w, t, k] of lines) { caption(`${w}: ${t}`, k, 5.2); if (k === 'call') play('distort', { vol: 0.12, rate: 1.5 }); await wait(5.4); }
    stopLoop('line9'); play('hangup', { vol: 0.6, pos: [1.78, 0.8, 1.08] });
    this.st.ev.call1Done = true;
    this.cidDraw(1);
    await wait(1.2);
    // Nagyi comes to you
    const p = this.player.pos; n.walkTo([new THREE.Vector3(1.0, 0, 2.6), new THREE.Vector3(Math.max(1.0, Math.min(p.x, 2.6)), 0, Math.max(2.6, Math.min(p.z - 0.8, 4.6)))], () => this.afterCallTalk());
    this.nagyiBusy = true;
  }
  async afterCallTalk() {
    const n = this.nagyi, p = this.player.pos; n.faceTo(p.x, p.z); n.obj.rotation.y = n.facing; n.play('Idle_Talking_Loop', 0.3);
    const k = await this.talk([
      { who: 'Nagyi', text: 'That was your mother. She… she had an accident with the car. A woman is hurt. The police want bail tonight, 900,000, or she goes to prison. A lawyer is coming at midnight for the money.', opts: [['kind', 'Nagyi, sit down for a second. Let\'s check it together before we do anything.'], ['blunt', 'That\'s obviously a scam, Nagyi.'], ['go', 'OK. What can I do?']] },
    ]);
    let k2;
    if (k === 'kind') { this.st.kind++; k2 = await this.talk([{ who: 'Nagyi', text: 'Check what? It was her, I know my own daughter\'s voice! …She was crying. I can\'t sit down, I have to find the money. The biscuit tins. Your grandfather never trusted banks.', opts: [['ok', 'Then I\'ll check, and you count. Deal?']] }]); }
    else if (k === 'blunt') { this.st.blunt++; k2 = await this.talk([{ who: 'Nagyi', text: 'A scam? You didn\'t hear her crying. Don\'t you dare. …I have to find the money.', opts: [['sorry', 'Sorry, Nagyi. I just want to be sure it\'s really her.']] }]); this.st.kind++; }
    else k2 = await this.talk([{ who: 'Nagyi', text: 'Nothing, darling. Don\'t tell anyone, she said. I have to find the money. The biscuit tins.', opts: [['ok', '…OK.']] }]);
    caption('Nagyi recorded the call. Her answering machine records every call "since Grandpa\'s doctor visits". You could listen to it again.', 'say', 6);
    this.walkNagyi('ktable', () => { this.placeNagyiKitchen(); this.nagyiBusy = false; });
    this.updateGoals(); this.setObjective(); this.save();
    this.after(25, () => this.secondCall());
  }
  async secondCall() {
    if (this.st.ev.msg2) return; this.st.ev.msg2 = true;
    this.ringT = 5; this.ringing = true; loop('ring9', 'phonering', { vol: 0.7, pos: [1.78, 0.9, 1.08] });
    caption('[the phone rings again. In the kitchen the tap is running: Nagyi doesn\'t hear it]', 'sfx', 4);
    await wait(6); stopLoop('ring9'); this.ringing = false;
    play('click', { vol: 0.5, pos: [1.78, 0.8, 1.5] }); caption('[click. The answering machine takes the call: "…Mama? Mama, it\'s me. Please pick up…"]', 'sfx', 5);
    this.blinkLed = true; this.cidDraw(2); this.save();
  }
  cidDraw(n) {
    const c = this.cidTex.userData.g; c.fillStyle = '#9fb48a'; c.fillRect(0, 0, 32, 12); c.fillStyle = '#1a2a12'; c.font = '16px m5x7'; c.textBaseline = 'top'; c.fillText(n > 1 ? '22:51' : '22:40', 2, -3); this.cidTex.needsUpdate = true;
  }

  // ---------------- overlays ----------------
  openMachine() {
    this.playing = false; this.G.unlock(); prompt(null); this.blinkLed = false; this.ledM.color.setHex(0x300000);
    const s = this.st, T = s.tells;
    play('click', { vol: 0.5 }); loop('line9', 'hum', { vol: 0.08, rate: 1.7 });
    const el = openScreen(`<div class="panel am9" style="max-height:92vh;overflow:auto"><div class="head">${A.img.ep9_answering_machine ? `<img src="${A.img.ep9_answering_machine}" alt="">` : ''}<div><h2 style="margin:0">Answering machine</h2><p class="sub">Tape 1 · call recorded 22:40 · 2:12. Click the three things a real Mum would not do.</p></div></div><div id="m"></div></div>`);
    const blocks = [3, 6, 4, 9, 5, 7, 3, 6, 4, 8, 2, 7, 3, 6, 4, 9];  // the pattern 3-6-4 comes back again and again
    const render = () => {
      const n = Object.keys(T).length;
      const bars = blocks.map((h, i) => { const rep = (i % 6 === 0 || i % 6 === 1 || i % 6 === 2) && [0, 6, 12].includes(i - (i % 6)); return `<rect class="blk ${T.loop && rep ? 'got' : ''}" data-rep="${rep ? 1 : 0}" x="${i * 22 + 4}" y="${50 - h * 5}" width="16" height="${h * 10}" fill="#6a4a3a"/>`; }).join('');
      el.querySelector('#m').innerHTML = `
        <div class="line"><b>Nagyi:</b> Halló? …Kati? Kati, is that you?</div>
        <div class="line"><b>The voice:</b> …<span class="flag ${T.mama ? 'got' : ''}" data-f="mama">Mama</span>? <span class="flag ${T.mama ? 'got' : ''}" data-f="mama">Mama</span>, it's me… I hit a woman on the crossing. The police are here…</div>
        <div class="line"><b>Nagyi:</b> Kati, which hospital? Where are you?</div>
        <div class="line"><b>The voice:</b> <span class="flag ${T.noanswer ? 'got' : ''}" data-f="noanswer">Mama, please, there's no time.</span> Don't tell anyone. Not even the kid.</div>
        <p class="sub" style="margin:8px 0 2px">The noise behind the voice (hospital beeps, a trolley, a door):</p>
        <svg viewBox="0 0 360 100" style="width:100%;max-width:420px;background:#120c0c;border-radius:6px">${bars}</svg>
        <div class="tips" style="margin-top:8px;display:flex;flex-direction:column;gap:6px">
          ${T.mama ? `<div style="background:#2a1a12;border-left:4px solid #e8b04a;padding:6px 10px">✓ Mum calls Nagyi "Anyu", always${s.cardSeen ? ' (the card on the fridge)' : ''}. The voice says "Mama": it learned the words, not the family.</div>` : ''}
          ${T.noanswer ? '<div style="background:#2a1a12;border-left:4px solid #e8b04a;padding:6px 10px">✓ Nagyi asked a real question, "which hospital?", and the voice didn\'t answer it. A recording can\'t think; it only pushes: no time, don\'t tell.</div>' : ''}
          ${T.loop ? '<div style="background:#2a1a12;border-left:4px solid #e8b04a;padding:6px 10px">✓ The same three sounds come back every eight seconds: a short loop of "hospital noise" pasted behind the voice.</div>' : ''}
        </div>
        <div class="btns" style="margin-top:8px"><span class="sub">${n}/3 found${!s.cardSeen && !T.mama ? ' · how does Mum usually address Nagyi? Look around the kitchen.' : ''}</span><button class="btn primary" id="x">Stop the tape</button></div>`;
      el.querySelectorAll('[data-f]').forEach(b => b.onclick = () => { if (!T[b.dataset.f]) { T[b.dataset.f] = true; play('paper', { vol: 0.4 }); this.save(); render(); } });
      el.querySelectorAll('.blk').forEach(b => b.onclick = () => { if (b.dataset.rep === '1') { if (!T.loop) { T.loop = true; play('paper', { vol: 0.4 }); this.save(); render(); } } else { play('denied', { vol: 0.25 }); } });
      el.querySelector('#x').onclick = () => { closeScreen(el); stopLoop('line9'); this.playing = true; lockPointer(); this.updateGoals(); this.setObjective(); if (Object.keys(T).length >= 2 && !s.mumOK) this.after(7, () => { this.st.ev.scare2Due = true; }); };
    };
    render();
  }
  openCallerId() {
    this.playing = false; this.G.unlock(); prompt(null); play('click', { vol: 0.4 });
    const s = this.st; s.callerSeen = true;
    const el = openScreen(`<div class="panel" style="width:min(460px,94vw)"><h2 style="margin-top:0">Caller ID (hívószám-kijelző)</h2>
      <div style="background:#9fb48a;color:#1a2a12;font-family:monospace;font-size:1.2em;padding:10px 14px;border-radius:6px;line-height:1.7">22:40 · ${SHOW.scam}<br>${s.ev.msg2 ? '22:51 · ' + SHOW.scam + '<br>' : ''}${s.ev.msg3 ? '23:1x · ' + SHOW.scam + '<br>' : ''}</div>
      <p>${s.mobSeen || s.bookSeen ? `Mum's mobile is <b>${SHOW.mum}</b>. This isn't it.` : 'Whose number is that? Not one you recognise.'}</p>
      <p class="sub">${rich('A strange number is a warning sign. But a familiar number would not prove anything either: the number on a display can be faked ([[spoof]]).')}</p>
      <div class="btns"><button class="btn primary" id="x">OK</button></div></div>`);
    el.querySelector('#x').onclick = () => { closeScreen(el); this.playing = true; lockPointer(); this.updateGoals(); this.setObjective(); this.save(); };
  }
  openMobile() {
    this.playing = false; this.G.unlock(); prompt(null); play('closet', { vol: 0.3 }); this.armPush();
    const s = this.st, first = !s.mobSeen; s.mobSeen = true;
    const el = openScreen(`<div class="phone mob9"><div class="bar"><span>${this.clock()}</span><span>▮▮ 38%</span></div><div class="appbar">Messages · Kati 🌷</div>
      <div class="msgs"><div class="msg sys">Kati 🌷 · ${SHOW.mum}</div>
      <div class="msg"><span class="who">Kati 🌷 · 21:12</span>Starting my night shift 🌷 Ward 3 is quiet so far. Phone goes in the locker as always. Kisses to you and ${esc(nick())}!</div>
      <div class="msg sys">No calls from Kati 🌷 today.</div></div>
      <div class="foot"><button class="btn primary" id="x">Put it back</button></div></div>`, 'solid');
    el.querySelector('#x').onclick = () => {
      closeScreen(el); this.playing = true; lockPointer();
      if (first) caption('Mum texted at 21:12: night shift, Ward 3, phone in the locker. So how was she driving at 22:30?', 'say', 6);
      this.updateGoals(); this.setObjective(); this.save();
    };
  }
  openBook() {
    this.playing = false; this.G.unlock(); prompt(null); play('drawer', { vol: 0.6 }); this.armPush();
    const s = this.st;
    // first time: the phone rings right next door while you read (scare 1)
    if (!s.ev.scare1) {
      s.ev.scare1 = true;
      setTimeout(() => {
        const q = this.G.quiet(); this.ringing = true; loop('ring9', 'phonering', { vol: q ? 0.5 : 1.0, rate: 1.0, pos: [1.78, 0.9, 1.08] });
        if (!q) { play('stinger', { vol: 0.5 }); }
        setTimeout(() => { stopLoop('ring9'); this.ringing = false; play('click', { vol: 0.5, pos: [1.78, 0.8, 1.5] }); s.ev.msg3 = true; this.blinkLed = true; caption('[the answering machine takes it. Nobody speaks. Just breathing, then the line goes dead]', 'sfx', 5); this.save(); }, 6500);
      }, 2200);
    }
    const rows = [
      ['a', 'Dr. Fekete (háziorvos)', '369-2210'],
      ['b', 'Erzsi néni', '06 1 380 4455'],
      ['mum', 'Kati 🌷 mobil', SHOW.mum + ' <span class="hand">(éjjel a szekrényben!)</span>'],
      ['ward', 'Kati munkahely: Platán Kórház, 3-as osztály, nővérpult', SHOW.ward],
      ['c', 'Gázművek hibabejelentő', '06 80 300 300'],
      ['d', 'Piroska (fodrász)', '06 30 211 7788'],
    ];
    const el = openScreen(`<div class="book9"><h3>Címjegyzék</h3><p style="margin:0 0 8px;font-size:.85em">Nagyi's address book. Click the number you'd trust for Mum tonight.</p>
      ${rows.map(([k, n, v]) => `<div class="row ${s.bookSeen && k === 'ward' ? 'got' : ''}" data-k="${k}"><span>${n}</span><span>${v}</span></div>`).join('')}
      <p id="msg" style="min-height:2.4em;font-size:.9em;margin:8px 0 4px"></p><div class="btns"><button class="btn" id="x">Close the book</button></div></div>`, 'solid');
    el.querySelectorAll('[data-k]').forEach(r => r.onclick = () => {
      const k = r.dataset.k, m = el.querySelector('#msg');
      if (k === 'ward') { s.bookSeen = true; r.classList.add('got'); play('paper', { vol: 0.4 }); m.innerHTML = `The ward's own number, written by Nagyi years ago. Nobody tonight gave it to you, so you can trust it. <b>${SHOW.ward}</b>`; }
      else if (k === 'mum') { m.innerHTML = `Mum's mobile: <b>${SHOW.mum}</b>. Nagyi's note says "at night, in the locker!" You can try, but she probably won't answer.`; s.mumNum = true; }
      else m.textContent = 'Not tonight.';
      this.save();
    });
    el.querySelector('#x').onclick = () => { closeScreen(el); this.playing = true; lockPointer(); this.updateGoals(); this.setObjective(); };
  }
  showPhoto() {
    if (A.img.ep9_family_photo) { this.playing = false; this.G.unlock(); cutIn(A.img.ep9_family_photo, '', 3600).then(() => { this.playing = true; lockPointer(); caption('Nagyi, Mum and you on the balcony, three summers ago.', 'say', 4); }); }
    else caption('Nagyi, Mum and you on the balcony, three summers ago.', 'say', 4);
  }

  // ---------------- the rotary phone ----------------
  usePhone() {
    const s = this.st;
    if (this.ringing && s.phase === 'end') return this.mumCallsBack();
    if (this.ringing) { caption('Let the machine take it. Then you can listen to it as many times as you need.', 'say', 4); return; }
    if (!s.ev.call1Done) return;
    this.openDial();
  }
  openDial() {
    this.playing = false; this.G.unlock(); prompt(null); play('pickup', { vol: 0.5 });
    loop('tone9', 'hum', { vol: 0.07, rate: 2.2 });
    const s = this.st; let num = '';
    const notes = [s.bookSeen ? `Ward 3: ${SHOW.ward}` : null, s.mumNum || s.mobSeen ? `Mum's mobile: ${SHOW.mum}` : null, s.callerSeen ? `The caller: ${SHOW.scam}` : null, 'Emergency: 112'].filter(Boolean);
    const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
    const el = openScreen(`<div class="panel dial9"><h2 style="margin:0">Landline</h2><div class="num" id="n"></div>
      <div class="wheel">${digits.map((d, i) => { const a = (-60 + i * 30) * D2R; return `<button data-d="${d}" style="left:${130 + Math.cos(a) * 98 - 22}px;top:${130 + Math.sin(a) * 98 - 22}px">${d}</button>`; }).join('')}</div>
      <p class="sub" style="font-size:.85em">${notes.map(esc).join(' · ')}</p>
      <div class="btns"><button class="btn" id="clr">Start again</button><button class="btn" id="x">Hang up</button></div></div>`);
    const show = () => { el.querySelector('#n').textContent = num || ' '; };
    const done = async key => { closeScreen(el); stopLoop('tone9'); await this.placeCall(key); };
    let busy = false;
    el.querySelectorAll('[data-d]').forEach(b => b.onclick = () => {
      if (busy) return; const d = b.dataset.d; num += d; show();
      const n = d === '0' ? 10 : +d; busy = true; for (let i = 0; i < n; i++) setTimeout(() => play('click', { vol: 0.25, rate: 1.4 }), 60 + i * 55); setTimeout(() => { busy = false; check(); }, 80 + n * 55);
    });
    const check = () => {
      for (const [k, v] of Object.entries(NUM)) if (num === v) return done(k);
      if ((num.length >= 11) || (num.length >= 7 && !num.startsWith('0') && !num.startsWith('1'))) { play('denied', { vol: 0.3 }); el.querySelector('#n').textContent = 'number not in use'; num = ''; }
    };
    el.querySelector('#clr').onclick = () => { num = ''; show(); };
    el.querySelector('#x').onclick = () => { closeScreen(el); stopLoop('tone9'); play('hangup', { vol: 0.5 }); this.playing = true; lockPointer(); };
    show();
  }
  async placeCall(key) {
    const s = this.st;
    play('beep', { vol: 0.3, rate: 0.6 }); await wait(1.2);
    if (key === 'mum') {
      s.mumMobTried = true;
      await this.talk([{ who: 'Recorded voice', text: 'A hívott szám jelenleg nem kapcsolható. The number you are calling is switched off.', call: true, opts: [['ok', 'Of course: her phone is in the locker. Try the ward.']] }]);
    } else if (key === 'scam') {
      s.scamCalled = true;
      await this.talk([{ who: 'A man', text: 'Yes? Is the money ready, madam?', call: true, opts: [['hang', 'Hang up.']] }]);
      caption('Calling back the number THEY gave you only reaches THEM. Use a number you already had.', 'say', 5);
    } else if (key === 'police') {
      await this.callPolice();
    } else if (key === 'ward') {
      s.wardTried = true;
      await this.talk([
        { who: 'Nurse (Ward 3)', text: 'Platán Kórház, Ward 3, Erika speaking.', call: true, opts: [['ask', 'Hello, I\'m Kati Szabó\'s child. Is my mum there? It\'s urgent.']] },
        { who: 'Nurse (Ward 3)', text: 'Kati? She\'s right here, doing the eleven o\'clock round. One moment, sweetheart.', call: true, opts: [['wait', '…']] },
        { who: 'Mum (the real one)', text: `Hello? ${nick()}? What happened, are you OK? …An accident? I haven't left the ward since nine. I haven't driven anywhere.`, call: true, opts: [['tell', 'Someone called Nagyi with your voice. A "lawyer" is coming for 900,000 at midnight.']] },
        { who: 'Mum (the real one)', text: 'Oh God. My poor Anyu. Listen: nobody opens that door. Not for anyone. Don\'t give anybody any money. If someone comes, call 112. Put Nagyi on, please.', call: true, opts: [['nagyi', 'Nagyi! It\'s Mum. The real one.']] },
      ]);
      s.mumOK = true; s.verifiedEarly = s.phase !== 'midnight';
      await this.reunionCall();
    }
    this.updateGoals(); this.setObjective(); this.save();
    if (this.st.phase !== 'end') { this.playing = true; lockPointer(); }
  }
  async reunionCall() {
    const n = this.nagyi;
    n.stop(); n.obj.position.set(1.2, 0, 1.3); n.faceTo(1.78, 1.08); n.obj.rotation.y = n.facing; n.play('Idle_Talking_Loop', 0.2); this.nagyiAt = 'phone';
    this.cash.forEach(c => c.visible = false);
    await this.talk([{ who: 'Nagyi', text: 'Kati? Katikám… Oh, thank God. Thank God. …No, I\'m not crying. Yes. Yes. Nobody. I promise.', opts: [['ok', '…']] }]);
    await fade(true, `${this.clock()}. Nagyi puts the money back in the tins, one note at a time.\nShe makes tea for both of you. Nobody goes to bed.`, 1);
    await wait(3.5);
    this.st.el = Math.max(this.st.el, MIDNIGHT - 40);
    this.placeNagyiKitchen(); n.play('Idle_Loop', 0.2); this.cash.forEach(c => c.visible = false);
    await fade(false, '', 1);
  }
  async callPolice() {
    const s = this.st;
    await this.talk([
      { who: '112', text: 'Emergency services, 112. What is your emergency?', call: true, opts: [['tell', 'Someone called my grandma pretending to be my mum and asked for money. A man is coming to collect it.']] },
      { who: '112', text: 'Are you safe right now? Don\'t open the door and don\'t hand over any money. Give me the address.', call: true, opts: [['addr', 'Újpest, Platán utca 12, 7th floor, door 41.']] },
      { who: '112', text: 'A patrol car is close by. Stay inside, keep the lights as they are, and don\'t talk to him through the door. You did the right thing calling.', call: true, opts: [['ok', 'Thank you.']] },
    ]);
    s.police = true;
    if (s.phase === 'midnight') this.after(10, () => this.policeArrive());
  }

  // ---------------- midnight ----------------
  async midnight() {
    const s = this.st; s.phase = 'midnight'; this.setObjective(); this.updateGoals();
    const q = this.G.quiet();
    for (let i = 0; i < 2; i++) { play('feedback', { vol: q ? 0.2 : 0.4, rate: 2.2, pos: [0.5, 1.6, 0.3] }); await wait(1.4); }
    caption('[the intercom buzzes. Twice. 00:00 exactly]', 'sfx', 4);
    const n = this.nagyi;
    if (!s.mumOK) {
      this.walkNagyi('front', () => { n.faceTo(1.05, 0); n.obj.rotation.y = n.facing; n.play('Idle_Loop', 0.2); });
      this.nagyiBusy = true;
      await wait(3);
      const k = await this.talk([{ who: 'Nagyi', text: 'That\'s him. The lawyer. I\'ll let him up, I have the money ready…', opts: [['wait', 'Nagyi, wait. Mum\'s ward has a number in your book. One call. Please.'], ['no', 'Don\'t open it!']] }]);
      if (k === 'wait') s.kind++;
      await this.talk([{ who: 'Nagyi', text: k === 'wait' ? '…One call. Quickly, then.' : 'Don\'t shout at me! …Fine. Prove it to me. Quickly.', opts: [['ok', 'OK.']] }]);
      this.nagyiBusy = false;
    }
    this.after(6, () => this.stairsSeq());
  }
  async stairsSeq() {
    const s = this.st; if (s.ev.stairs) return; s.ev.stairs = true;
    play('lightsw', { vol: 0.5, pos: [1, 1.8, -1.5] });
    for (let i = 0; i < 9; i++) setTimeout(() => play('heavy' + (1 + (i % 4)), { vol: 0.35 + i * 0.05, rate: 0.85, pos: [1 + (i % 2) * 0.4, 0.2, -4 + i * 0.4] }), i * 750);
    caption('[footsteps on the stairs. The lift has been broken for years]', 'sfx', 5);
    this.peepGlow.color.setHex(0xfff0b0);
    await wait(7.5);
    play('knock', { vol: 0.9, pos: [1.05, 1.2, -0.2] });
    caption('A man (behind the door): "Mrs Szabó? Dr. Halmi sent me. For your daughter\'s bail."', 'say', 6);
    s.ev.knocked = true;
    if (s.police) this.after(10, () => this.policeArrive());
    else this.after(30, () => { if (!this.st.police && this.st.phase === 'midnight') { play('knock', { vol: 1.0, pos: [1.05, 1.2, -0.2] }); caption('A man (behind the door): "Madam? I can hear you. Your daughter is waiting."', 'say', 5); } });
  }
  async useDoor() {
    const s = this.st;
    if (s.phase !== 'midnight') { play('knob', { vol: 0.3 }); caption(s.ev.call1Done ? 'Locked, with the chain on. It stays that way tonight.' : 'The front door. Locked, with the chain on.', 'say', 3.5); return; }
    this.playing = false; this.G.unlock();
    const src = A.img.ep9_stairwell ? await this.stairwellWithMan() : null;
    if (src) await cutIn(src, '', 3800, 'peep');
    caption(s.ev.knocked ? 'Through the peephole: a man in a dark coat, a little to the side, so you can\'t see his face. He looks at his phone.' : 'Through the peephole: the landing, the timed light, the mailboxes. Nobody… yet.', 'say', 5);
    this.playing = true; lockPointer();
  }
  stairwellWithMan() {
    return new Promise(res => {
      const im = new Image(); im.onload = () => {
        const c = document.createElement('canvas'); c.width = 640; c.height = 640; const g = c.getContext('2d');
        const sc = Math.max(640 / im.width, 640 / im.height); g.drawImage(im, (640 - im.width * sc) / 2, (640 - im.height * sc) / 2, im.width * sc, im.height * sc);
        if (this.st.ev.knocked) { g.fillStyle = 'rgba(8,8,10,.92)'; g.beginPath(); g.ellipse(470, 470, 70, 190, 0, 0, Math.PI * 2); g.fill(); g.beginPath(); g.arc(470, 265, 44, 0, Math.PI * 2); g.fill(); g.fillStyle = 'rgba(160,200,255,.6)'; g.fillRect(440, 380, 26, 40); }
        res(c.toDataURL('image/jpeg', 0.85));
      }; im.onerror = () => res(null); im.src = A.img.ep9_stairwell;
    });
  }
  async policeArrive() {
    const s = this.st; if (s.ev.police || s.phase !== 'midnight') return; s.ev.police = true;
    this.policeT = 9;
    caption('[blue light flickers on the living room ceiling. A car door slams in the courtyard]', 'sfx', 5);
    await wait(3);
    for (let i = 0; i < 8; i++) setTimeout(() => play('heavy' + (1 + (i % 4)), { vol: 0.7 - i * 0.07, rate: 1.2, pos: [1, 0.2, -1 - i * 0.6] }), i * 380);
    caption('[running footsteps, going down. The stairwell door bangs]', 'sfx', 5);
    await wait(5);
    caption('A police officer (through the door): "Police. Is everyone OK in there? He ran off, but we\'ve got his car number. We\'ll need you to make a statement in the morning."', 'say', 7);
    await wait(7.5);
    s.phase = 'end'; this.updateGoals(); this.setObjective();
    this.after(4, () => { this.ringing = true; loop('ring9', 'phonering', { vol: 0.7, pos: [1.78, 0.9, 1.08] }); caption('[the phone rings. 00:24]', 'sfx', 4); objective('The phone is ringing. Answer it.'); });
  }
  async mumCallsBack() {
    stopLoop('ring9'); this.ringing = false; play('pickup', { vol: 0.6 });
    const s = this.st;
    const k = await this.talk([
      { who: 'Mum', text: 'It\'s me. The real me. The police called the ward. Are you both OK? …I\'m so proud of you. And of Nagyi.', call: true, opts: [['ok', 'We\'re OK. Nagyi made tea.']] },
      { who: 'Mum', text: 'Let\'s make a family code word. If anyone ever calls as me, or as you, and doesn\'t know it, you hang up and call back. You choose.', call: true, opts: [['palacsinta', '"Palacsinta"'], ['cirmi', '"Cirmi"'], ['balaton', '"Balaton 2023"']] },
    ]);
    s.codeword = k;
    await this.talk([{ who: 'Mum', text: `${k === 'cirmi' ? 'Cirmi' : k === 'palacsinta' ? 'Palacsinta' : 'Balaton 2023'}. Nobody else knows it. Not even the internet. …And I think I'll stop posting videos where I talk for ten minutes.`, call: true, opts: [['bye', 'Night, Mum.']] }]);
    play('hangup', { vol: 0.5 });
    this.finale();
  }
  async finale() {
    this.playing = false; this.G.unlock(); prompt(null); hud(false);
    for (const id of this.loops) stopLoop(id, 0.8);
    const s = this.st;
    await fade(true, `End of episode ${epPos(9)}.\n\nIn the morning Nagyi tapes a note next to her phone, in big letters:\n"HANGOS SÍRÁS + PÉNZ + SIETNI KELL = TEDD LE, HÍVD VISSZA KATIT."\n(Crying + money + hurry = hang up, call Kati back.)`, 1.5);
    await wait(6);
    const secs = Math.round((Date.now() - s.start) / 1000);
    const d = epData(9); d.done = true; d.state = null; d.best = d.best ? Math.min(d.best, secs) : secs;
    d.choices = { codeword: s.codeword, kind: s.kind, verifiedEarly: !!s.verifiedEarly, police: !!s.police }; persist();
    music('mus_debrief', 0.45);
    await fade(false, '', 0.5);
    const stats = [`Clues on the tape: ${Object.keys(s.tells).length}/3`, `Checked the caller's number: ${s.callerSeen ? 'yes' : 'no'}`, `Called back on a trusted number: ${s.mumOK ? 'yes' : 'no'}${s.verifiedEarly ? ' (before midnight)' : ''}`, `Called the scammer's number: ${s.scamCalled ? 'yes' : 'no'}`, `Police called: ${s.police ? 'yes' : 'no'}`, `Kind to Nagyi: ${s.kind > s.blunt ? 'yes' : 'mostly'}`, `Family code word: ${s.codeword || '-'}`];
    const nx = await debriefScreen(DEBRIEF_EP9, stats, this.G.nextLabel(9));
    await fade(true, '', 0.6);
    if (nx === 'next') { await this.G.goNext(9); await fade(false, '', 0.8); return; }
    await this.G.goHub(); await fade(false, '', 0.8);
  }

  // ---------------- talking to Nagyi ----------------
  async talkNagyi() {
    const s = this.st, n = this.nagyi;
    if (s.mumOK) { await this.talk([{ who: 'Nagyi', text: 'Your grandfather would have liked you. He never trusted the phone either.', opts: [['ok', '🫶']] }]); return; }
    const k = await this.talk([{ who: 'Nagyi', text: `${Math.floor((this.st.el / SPM))} minutes since she called… I've got 640,000 so far. Where did your grandfather put the rest…`, opts: [['tea', 'Nagyi, I\'m here. Want me to put the kettle on?'], ['check', 'I\'m still checking. Give me a few minutes.'], ['stop', 'Stop counting, it\'s fake.']] }]);
    if (k === 'tea') { s.kind++; play('drip', { vol: 0.4 }); caption('Nagyi squeezes your hand. "You\'re a good kid. Just like her."', 'say', 4); }
    else if (k === 'stop') { s.blunt++; caption('Nagyi doesn\'t look up. "Then prove it."', 'say', 3.5); }
    this.save();
  }

  // ---------------- timeline + loop ----------------
  timeline() {
    const s = this.st, E = s.ev, t = s.el;
    const once = (k, at, f) => { if (t >= at && !E[k]) { E[k] = true; f(); } };
    once('hello', 1.5, () => caption('Nagyi\'s flat smells of paprika and floor polish. The clock in the wall unit ticks louder than it should.', 'say', 5));
    once('ring1', 7, () => {
      this.ringing = true; loop('ring9', 'phonering', { vol: 0.8, pos: [1.78, 0.9, 1.08] });
      caption('[the old phone in the hall rings. At this hour]', 'sfx', 4);
      const n = this.nagyi; n.play('Idle_Loop', 0.3);
      setTimeout(() => { this.walkNagyi('phone', () => { n.faceTo(1.78, 1.08); n.obj.rotation.y = n.facing; this.firstCall(); }); }, 1200);
      objective('Nagyi is answering the phone in the hall.');
    });
    // scare 2: the machine plays a new message out loud, with your name
    if (E.call1Done && !E.scare2 && (E.scare2Due || t > 330) && !s.mumOK) {
      E.scare2 = true; const q = this.G.quiet();
      play('click', { vol: 0.6, pos: [1.78, 0.8, 1.5] }); this.blinkLed = true;
      setTimeout(() => { if (!q) { play('stinger', { vol: 0.7 }); flash(0.15, 120); } play('distort', { vol: q ? 0.15 : 0.4, rate: 1.3, pos: [1.78, 0.8, 1.5] });
        caption(`The answering machine (out loud, by itself): "…${nick()}… sweetheart. It's Mama. Open the door for the man at midnight, OK? Do it for Mama."`, 'call', 7); }, 900);
      setTimeout(() => caption(`It knows your name. How does it know your name?`, 'say', 5), 8500);
    }
    // the ghost: Nagyi standing in the dark bedroom doorway
    const p = this.player.pos;
    if (E.call1Done && !E.ghost && p.x < -0.5 && p.z > 3 && !this.nagyiBusy && this.nagyiAt === 'kitchen' && !s.mumOK) {
      const fwd = new THREE.Vector3(); this.G.camera.getWorldDirection(fwd);
      if (fwd.x < -0.5) {
        E.ghost = true; const n = this.nagyi; this.nagyiBusy = true; n.stop(); n.obj.position.set(0.15, 0, 5.45); n.faceTo(p.x, p.z); n.obj.rotation.y = n.facing; n.play('Idle_Loop', 0); this.nagyiAt = 'door';
        this.ghostWait = 1;
      }
    }
    if (this.ghostWait) {
      const fwd = new THREE.Vector3(); this.G.camera.getWorldDirection(fwd);
      const to = this.nagyi.obj.position.clone().setY(1.5).sub(this.G.camera.position).normalize();
      if (fwd.dot(to) > 0.85) {
        this.ghostWait = 0; if (!this.G.quiet()) play('presence', { vol: 0.5 });
        caption('Nagyi is standing in the dark doorway, very still. "…I\'m sorry. I just can\'t sit in the kitchen. I keep hearing her crying."', 'say', 6);
        setTimeout(() => this.walkNagyi('ktable', () => { this.placeNagyiKitchen(); this.nagyiBusy = false; }), 6500);
      }
    }
    if (t >= MIDNIGHT && s.phase === 'play') this.midnight();
  }
  update(dt, t) {
    this.nagyi.update(dt);
    this.drawTV(t);
    if (this.blinkLed) { const on = (t % 1) < 0.5; this.ledM.color.setHex(on ? 0xff2010 : 0x300000); this.ledL.intensity = on ? 0.5 : 0; } else this.ledL.intensity = 0;
    if (this.policeT > 0) { this.policeT -= dt; this.blue.intensity = (t * 4 % 1) < 0.5 ? 2.2 : 0; } else this.blue.intensity = 0;
    if (!this.playing) return;
    const s = this.st;
    if (s.phase !== 'intro' && s.phase !== 'end') {
      s.el += dt;
      const q = this.q || []; for (const j of q.filter(j => s.el >= j.at)) { q.splice(q.indexOf(j), 1); j.f(); }
      this.timeline();
    } else if (s.phase === 'end') { const q = this.q || []; s.el += dt; for (const j of q.filter(j => s.el >= j.at)) { q.splice(q.indexOf(j), 1); j.f(); } }
    this.player.update(dt);
    this.updateFlash(dt); this.updateArms(dt, t);
    this._g = (this._g || 0) + dt; if (this._g > 0.5) { this._g = 0; this.updateGoals(); }
    this._sv = (this._sv || 0) + dt; if (this._sv > 8) { this._sv = 0; this.save(); }
    this.interact();
  }
  drawTV(t) {
    this._tv = (this._tv || 0) + 1; if (this._tv % 4) return;
    const c = this.tvTex.userData.g;
    if (this.st.phase === 'end') { c.fillStyle = '#000'; c.fillRect(0, 0, 96, 72); this.tvLight.intensity = 0; }
    else if (this.mumImg && this.mumImg.complete) {
      c.drawImage(this.mumImg, 0, 0, 96, 72); c.fillStyle = 'rgba(0,0,0,.6)'; c.fillRect(0, 58, 96, 14); c.fillStyle = '#ffd27a'; c.font = '16px m5x7'; c.textBaseline = 'top'; c.fillText(this.st.ev.call1Done ? '❚❚ Anya konyhája' : '▶ Anya konyhája', 2, 56);
      this.tvLight.intensity = 0.6 + (this.st.ev.call1Done ? 0 : Math.sin(t * 7) * 0.08);
    } else { c.fillStyle = '#1a2440'; c.fillRect(0, 0, 96, 72); for (let i = 0; i < 30; i++) { c.fillStyle = `rgba(255,255,255,${Math.random() * 0.3})`; c.fillRect(Math.random() * 96, Math.random() * 72, 2, 1); } this.tvLight.intensity = 0.5; }
    this.tvTex.needsUpdate = true;
  }
  exit() { super.exit(); for (const k of ['ring9', 'line9', 'tone9']) stopLoop(k); }
}
