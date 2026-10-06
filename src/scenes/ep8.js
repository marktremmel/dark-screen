// Episode 6 in play order (internal id 8): "Zárolva" (Locked).
// Platán School at night. One phishing click, ransomware spreads through the building's network.
import * as THREE from 'three';
import { A, inst } from '../core/assets.js';
import { psxMat } from '../core/render.js';
import { texBox, plane, wall, canvasTex, place, colliderFor, pxText, windowPane } from '../core/world.js';
import { wasPressed, lockPointer } from '../core/player.js';
import { hud, hudParts, objective, prompt, caption, toast, fade, flash, checklist, eye, wait } from '../core/hud.js';
import { music, loop, stopLoop, play } from '../core/audio.js';
import { S, epData, persist } from '../core/state.js';
import { DEBRIEF_EP8, rich, epPos } from '../text.js';
import { openScreen, closeScreen, debriefScreen } from '../ui/screens.js';
import { NPC } from '../core/npc.js';
import { Walker } from './walker.js';

const D2R = Math.PI / 180;
const ZU = -40, ZB = 40;           // the upper floor and the basement are built away from the ground floor
const T_BACKUP = 600;              // seconds until the always-plugged-in backup disk is encrypted
const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const mmss = s => { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
// rooms on the network map, with the second they get encrypted (library first)
const ROOMS = [['lib', 'Library', 2], ['c104', 'Room 104', 40], ['off', 'Office', 75], ['c214', 'Room 214 (lab)', 4], ['gym', 'Gym (scoreboard)', 140], ['bms', 'Lights & doors', 60], ['can', 'Canteen tills', 210], ['srv', 'Server room', 330], ['nas', 'Backup disk', T_BACKUP]];
const ZONES = {
  upper: { spawn: [-8.6, ZU + 4.9, -90], name: 'Upper floor' },
  ground: { spawn: [-21, 0, -90], name: 'Ground floor' },
  basement: { spawn: [-4.5, ZB + 2.5, 180], name: 'Basement' },
};

export class Ep8 extends Walker {
  constructor(G) { super(G); this.epN = 8; }

  async build() {
    const g = this.newScene(0x040509, 3, 15);
    this.doors = [];
    // each floor is its own group; only the floor you are on is drawn and lit
    this.zg = { upper: new THREE.Group(), ground: new THREE.Group(), basement: new THREE.Group() };
    for (const k in this.zg) g.add(this.zg[k]);
    this.buildUpper(this.zg.upper); this.buildGround(this.zg.ground); this.buildBasement(this.zg.basement);
    // lights shared by all zones
    this.amb = new THREE.AmbientLight(0x3a4460, 0.42); this.scene.add(this.amb);
    this.hemi = new THREE.HemisphereLight(0x4a5878, 0x100c0a, 0.35); this.scene.add(this.hemi);
    // Feri bácsi, the caretaker
    this.feri = new NPC('npc_caretaker', { idle: 'Idle_Torch_Loop', speed: 1.1 }); this.feri.obj.visible = false; this.zg.ground.add(this.feri.obj);
    this.feriTorch = new THREE.SpotLight(0xfff1d6, 0, 12, 0.4, 0.5, 1.3); this.feriTorch.position.set(0.15, 1.35, 0.25); this.feri.obj.add(this.feriTorch); this.feriTorch.target.position.set(0, 0.6, 4); this.feri.obj.add(this.feriTorch.target);
    this.setupRig({ arms: true, flash: true, stepVol: 0.3, reach: 2.4 });
    this.flashOn = true;
    this.setupInteractions();
    const sv = epData(8).state;
    this.st = { phase: 'intro', el: 0, zone: 'upper', mapSeen: false, flags: {}, libCable: false, key: false, note: false, uplink: false, backup: false, backupLost: false, paid: false, feriMet: false,
      wrongKeys: 0, scare1: false, scare2: false, hints: 0, ev: {}, bonus: 0, start: Date.now() };
    if (sv) { Object.assign(this.st, sv, { start: Date.now() - (sv.elapsed || 0) }); if (this.st.phase === 'intro') this.st.phase = 'play'; }
    this.watch = { t: 25, on: false };
  }

  // ---------------- doors ----------------
  door(g, name, x, z, rotY, o = {}) {
    const d = place(g, 'sk_' + name, x, 0, z, rotY);
    const mixer = new THREE.AnimationMixer(d); const clip = (A.anims['sk_' + name] || [])[0];
    const rec = { obj: d, mixer, clip, open: false, locked: !!o.locked, name: o.label || name, x, z, rotY, col: null };
    // a closed door blocks: a thin collider over the gap
    const w = name === 'door_gym' ? 1.7 : 1.1;
    rec.col = Math.abs(Math.sin(rotY * D2R)) > 0.5 ? { x0: x - 0.12, x1: x + 0.12, z0: z - w / 2, z1: z + w / 2 } : { x0: x - w / 2, x1: x + w / 2, z0: z - 0.12, z1: z + 0.12 };
    if (!o.open) this.col.push(rec.col); else this.openDoor(rec, true);
    this.doors.push(rec); return rec;
  }
  openDoor(rec, silent) {
    if (rec.open) return; rec.open = true; rec.col.off = true;
    if (rec.clip) { const a = rec.mixer.clipAction(rec.clip); a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true; a.play(); const half = rec.clip.duration / 2; this._doorStops = this._doorStops || []; this._doorStops.push({ a, half }); if (silent) { rec.mixer.update(half); a.paused = true; } }
    if (!silent) play('door_open', { vol: 0.5, pos: [rec.x, 1, rec.z] });
  }

  // ---------------- the upper floor: Room 214 ----------------
  buildUpper(g) {
    const col = this.col, block = this.block, W = { col, block, h: 3, tile: 2 };
    const z0 = ZU;
    plane(g, 'vct', -10, z0 - 4, 6, z0 + 7, 0, { tile: 2 });
    plane(g, 'ceil_tile', -10, z0 - 4, 6, z0 + 7, 3, { tile: 2, ceiling: true, color: 0x6a6e76 });
    // lab walls (x -6..6, z -4..4), corridor z 4..7, x -10..6
    wall(g, 'lab_wall', -6, z0 - 4, 6, z0 - 4, W); wall(g, 'lab_wall', -6, z0 - 4, -6, z0 + 4, W); wall(g, 'lab_wall', 6, z0 - 4, 6, z0 + 7, W);
    wall(g, 'lab_wall', -6, z0 + 4, 6, z0 + 4, { ...W, gaps: [[-5.6, -4.4, 2.3]] });
    wall(g, 'corridor', -10, z0 + 4, -6, z0 + 4, W); wall(g, 'corridor', -10, z0 + 7, 6, z0 + 7, W); wall(g, 'corridor', -10, z0 + 4, -10, z0 + 7, { ...W, gaps: [[z0 + 4.9, z0 + 6.1, 2.3]] });
    for (const z of [-2.5, 0.5]) windowPane(g, 5.93, 1.7, z0 + z, 1.6, 1.2, -Math.PI / 2, { lights: true, view: 'view_night_school' });
    this.labDoor = this.door(g, 'door_classroom', -5, z0 + 4, 0, { open: true });
    this.stairUp = this.door(g, 'door_exit', -10, z0 + 5.5, 90, { label: 'stairs' });
    // desks with retro PCs; their screens go red at 23:00
    this.labScreens = [];
    this.labTex = canvasTex(64, 48, () => { });
    const smat = new THREE.MeshBasicMaterial({ map: this.labTex, fog: false });
    for (const [x, z] of [[-3.5, -2.5], [0, -2.5], [3.5, -2.5], [-3.5, 0.5], [0, 0.5], [3.5, 0.5]]) {
      place(g, 'labdesk', x, 0, z0 + z, 0, { col });
      const pc = place(g, 'pcretro', x - 0.25, 0.75, z0 + z - 0.12, 0, {});
      const s = new THREE.Mesh(new THREE.PlaneGeometry(0.336, 0.266), smat); s.position.set(-0.057, 0.243, 0.104); pc.add(s);
      if (x === 0) { const L = new THREE.PointLight(0xff3020, 0, 6, 1.4); L.position.set(x, 1.3, z0 + z + 0.6); g.add(L); this.labScreens.push(L); }
    }
    // teacher PC at the front
    place(g, 'labdesk', -3.5, 0, z0 - 3.2, 0, { col });
    this.teacherPC = place(g, 'pcretro', -3.75, 0.75, z0 - 3.32, 0, {});
    const ts = new THREE.Mesh(new THREE.PlaneGeometry(0.336, 0.266), smat); ts.position.set(-0.057, 0.243, 0.104); this.teacherPC.add(ts);
    // sleeping bags and sleeping classmates
    const bagCols = [0x3a5a8a, 0x8a3a3a, 0x3a7a5a, 0x7a6a2a, 0x5a3a7a];
    [[-4.5, 2.6, 10], [-2.2, 3.0, -8], [1.0, 2.7, 4], [3.6, 2.9, -12], [4.8, -1.0, 80]].forEach(([x, z, r], i) => {
      const bag = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.22, 1.9), psxMat({ color: bagCols[i] })); bag.position.set(x, 0.11, z0 + z); bag.rotation.y = r * D2R; g.add(bag);
      const pil = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 0.35), psxMat({ color: 0xd8d4c8 })); pil.position.set(x + Math.sin(r * D2R) * -0.75, 0.26, z0 + z - Math.cos(r * D2R) * 0.75); pil.rotation.y = r * D2R; g.add(pil);
    });
    // the blackboard of the hub, here at night
    const bb = canvasTex(256, 96, (c, w, h) => { c.fillStyle = '#1f3a2c'; c.fillRect(0, 0, w, h); c.fillStyle = '#e8efe9'; c.font = '16px m5x7'; c.textBaseline = 'top'; c.fillText('DIGITAL CULTURE NIGHT  ·  ROOM 214', 10, 8); pxText(c, 'Pizza: 19:00 ✓   Film: 21:00 ✓', 10, 32, 16); c.fillText('Lights out: 23:00', 10, 56); c.fillText('Ms Varga\'s mobile on the door', 10, 72); });
    const board = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 1.35), new THREE.MeshLambertMaterial({ map: bb })); board.position.set(0.5, 1.65, z0 - 3.93); g.add(board);
    this.upLamp = new THREE.PointLight(0xdfe8ff, 0.5, 9, 1.6); this.upLamp.position.set(0, 2.7, z0); g.add(this.upLamp);
  }

  // ---------------- the ground floor ----------------
  buildGround(g) {
    const col = this.col, block = this.block, W = { col, block, h: 3, tile: 2 };
    plane(g, 'vct', -24, -9.5, 20.5, 9.5, 0, { tile: 2 });
    plane(g, 'ceil_tile', -24, -9.5, 20.5, 9.5, 3, { tile: 2, ceiling: true, color: 0x5e626a });
    // corridor walls with doorways
    wall(g, 'glazed', -20, -1.5, 20, -1.5, { ...W, gaps: [[-14.55, -13.45, 2.3], [-6.55, -5.45, 2.3]] });
    wall(g, 'glazed', -20, 1.5, 20, 1.5, { ...W, gaps: [[-4.55, -3.45, 2.3], [0.5, 7.5, 2.6], [13.1, 14.9, 2.5]] });
    wall(g, 'glazed', 20, -1.5, 20, 1.5, { ...W, gaps: [[-0.55, 0.55, 2.3]] });
    // stairwell (west end)
    wall(g, 'corridor', -24, -3, -20, -3, W); wall(g, 'corridor', -24, 3, -20, 3, W); wall(g, 'corridor', -24, -3, -24, 3, W);
    wall(g, 'corridor', -20, -3, -20, -1.5, W); wall(g, 'corridor', -20, 1.5, -20, 3, W);
    this.stairDown = this.door(g, 'door_exit', -23.88, 1.6, 90, { label: 'stairs' });
    // library (north, x -18..-10)
    wall(g, 'class_paint', -18, -9.5, -10, -9.5, W); wall(g, 'class_paint', -18, -9.5, -18, -1.5, W);
    wall(g, 'class_paint', -10, -9.5, -10, -1.5, { ...W, gaps: [[-6.6, -5.4, 2.3]] });
    wall(g, 'class_paint', -20, -1.5, -18, -1.5, W);
    this.libDoor = this.door(g, 'door_library', -14, -1.5, 0, { locked: true });
    this.libInner = this.door(g, 'door_classroom', -10, -6, 90, { open: true });
    for (const x of [-17, -15.2]) for (const z of [-9.1]) place(g, 'sk_library_shelf', x, 0, z, 0, { col });
    place(g, 'sk_library_shelf', -17.6, 0, -6, 90, { col }); place(g, 'sk_library_shelf', -17.6, 0, -4, 90, { col });
    place(g, 'sk_card_catalogue', -11, 0, -8.6, 0, { col }); place(g, 'sk_circulation_desk', -13, 0, -3, 180, { col });
    place(g, 'sk_bookshelf', -12.6, 0, -9.12, 0, { col });
    // PC-3 on a library table: patient zero
    texBox(g, 'wood_dark', -16.2, 0, -7.0, -14.6, 0.74, -6.2, { col, block });
    this.pc3 = place(g, 'sk_crt_monitor', -15.4, 0.74, -6.9, 0);
    this.pc3Tex = canvasTex(64, 48, () => { });
    const p3s = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.225), new THREE.MeshBasicMaterial({ map: this.pc3Tex, fog: false })); p3s.position.set(-15.4, 0.74 + 0.21, -6.9 + 0.072); g.add(p3s);
    this.pc3Light = new THREE.PointLight(0xff3020, 0.9, 4, 1.6); this.pc3Light.position.set(-15.4, 1.2, -6.2); g.add(this.pc3Light);
    // the network cable: a grey wire from the PC down to a wall socket
    this.cable = new THREE.Group(); const cm = psxMat({ color: 0x9aa0a8 });
    { const a = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.74, 4), cm); a.position.set(-15.95, 0.37, -6.95); this.cable.add(a);
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.0, 4), cm); b.rotation.x = Math.PI / 2; b.position.set(-15.95, 0.015, -7.45); this.cable.add(b);
      const sock = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.05, 0.16), psxMat({ color: 0xe8e4d8 })); sock.position.set(-15.95, 0.025, -8.0); this.cable.add(sock);
      const plug = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.04, 0.07), psxMat({ color: 0x3a8a3a })); plug.position.set(-15.95, 0.06, -7.97); this.cable.add(plug); this.plug = plug; }
    g.add(this.cable);
    // classroom 104 (north, x -10..-2)
    wall(g, 'class_paint', -10, -9.5, -2, -9.5, W); wall(g, 'class_paint', -2, -9.5, -2, -1.5, W);
    this.c104Door = this.door(g, 'door_classroom', -6, -1.5, 0, { open: true });
    place(g, 'sk_chalkboard', -6, 0, -9.48, 0);
    this.c104Screens = [];
    for (const x of [-8.5, -6.5, -4.5]) for (const z of [-7.2, -5.2, -3.6]) { place(g, 'sk_student_desk', x, 0, z, 180, { col, shrink: 0.05 }); place(g, 'sk_student_chair', x, 0, z + 0.5, 180); }
    place(g, 'sk_teacher_desk', -4.2, 0, -8.6, 180, { col });
    this.c104pc = place(g, 'sk_crt_monitor', -4.2, 0.86, -8.5, 0);
    this.c104Tex = canvasTex(64, 48, c => { c.fillStyle = '#000'; c.fillRect(0, 0, 64, 48); });
    const c4s = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.225), new THREE.MeshBasicMaterial({ map: this.c104Tex, fog: false })); c4s.position.set(-4.2, 1.07, -8.5 + 0.072); g.add(c4s);
    this.c104Light = new THREE.PointLight(0xff3020, 0, 4, 1.6); this.c104Light.position.set(-4.2, 1.3, -7.6); g.add(this.c104Light);
    // north side further east: lockers
    for (let x = 0; x < 19; x += 2) place(g, 'sk_lockers', x + 1, 0, -1.5, 0, { col, shrink: 0 });
    // office (south, x -8..0): the caretaker's and reception
    wall(g, 'class_paint', -8, 1.5, -8, 9.5, W); wall(g, 'class_paint', 0, 1.5, 0, 9.5, W); wall(g, 'class_paint', -8, 9.5, 0, 9.5, W);
    this.offDoor = this.door(g, 'door_office', -4, 1.5, 180, { open: true });
    place(g, 'sk_reception_desk', -4.5, 0, 4.2, 180, { col });
    this.keyCab = place(g, 'sk_key_cabinet', -7.95, -0.45, 6, 90); this.keyCab.scale.multiplyScalar(1.4); { const kb = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.9, 0.8), psxMat({ color: 0x5a4632 })); kb.position.set(-7.97, 1.52, 6); g.add(kb); }
    place(g, 'sk_filing_cabinet', -1, 0, 9.1, 180, { col }); place(g, 'sk_pigeonholes', -0.05, 0.8, 5, -90);
    place(g, 'sk_teacher_desk', -3, 0, 7.6, 0, { col });
    this.offPC = place(g, 'sk_crt_monitor', -3, 0.86, 7.5, 180);
    this.noteObj = new THREE.Mesh(new THREE.PlaneGeometry(0.075, 0.075), new THREE.MeshBasicMaterial({ color: 0xf2e86a })); this.noteObj.position.set(-3.13, 0.95, 7.42); this.noteObj.rotation.y = Math.PI; g.add(this.noteObj);
    place(g, 'sk_phone_beige', -2.4, 0.86, 7.4, 160); place(g, 'sk_mug_coffee', -3.6, 0.86, 7.3, 0); place(g, 'sk_calendar', -7.95, 0, 3, 90);
    this.offTex = canvasTex(64, 48, c => { c.fillStyle = '#000'; c.fillRect(0, 0, 64, 48); });
    const ofs = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.225), new THREE.MeshBasicMaterial({ map: this.offTex, fog: false })); ofs.position.set(-3, 1.07, 7.5 - 0.072); ofs.rotation.y = Math.PI; g.add(ofs);
    this.offLight = new THREE.PointLight(0xff3020, 0, 3.5, 1.6); this.offLight.position.set(-3, 1.3, 6.8); g.add(this.offLight);
    // entrance hall (south, x 0..8): front doors, locked
    wall(g, 'glazed', 8, 1.5, 8, 9.5, W); wall(g, 'glazed', 0, 9.5, 8, 9.5, { ...W, gaps: [[3.1, 4.9, 2.5]] });
    this.front = this.door(g, 'door_front', 4, 9.5, 0, { locked: true, label: 'front doors' });
    place(g, 'sk_trophy_case', 0.05, 0, 5, 90, { col }); place(g, 'sk_notice_board', 7.95, 0, 5, -90);
    // gym (south, x 8..20)
    wall(g, 'class_paint', 8, 9.5, 20, 9.5, W); wall(g, 'class_paint', 20, 1.5, 20, 9.5, W);
    this.gymDoor = this.door(g, 'door_gym', 14, 1.5, 180, {}); { const sb = new THREE.PointLight(0x30ff70, 0.5, 9, 1.4); sb.position.set(14, 2.6, 9); g.add(sb); const board = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.6), new THREE.MeshBasicMaterial({ color: 0x0c3a1a, fog: false })); board.position.set(14, 2.4, 9.45); board.rotation.y = Math.PI; g.add(board); }
    // east end: boiler room door
    this.boilerDoor = this.door(g, 'door_boiler', 20, 0, -90, { locked: true, label: 'boiler room' });
    place(g, 'sk_sign_boiler', 19.9, 0, -1.2, -90);
    // dressing
    place(g, 'sk_sign_library', -14, 0, -1.4, 180); place(g, 'sk_sign_gym', 14, 0, 1.4, 0);
    for (const x of [-16, -8, 3, 11, 17]) place(g, 'sk_radiator', x, 0.1, 1.48, 180);
    place(g, 'sk_fire_alarm', 9.5, 0, 1.48, 180); place(g, 'sk_waste_bin', -1.5, 0, 1.2, 0);
    // emergency lights: dim green pools
    this.emerg = [];
    for (const x of [-19, 1, 18]) { const L = new THREE.PointLight(0x5fff9a, 0.45, 5.5, 1.6); L.position.set(x, 2.5, 0); g.add(L); this.emerg.push(L); }
    place(g, 'sk_exit_sign', -21, 0, 0, 90); place(g, 'sk_exit_sign', 4, 0, 1.3, 0);
    // corridor ceiling lights that die when the building system is hit
    this.corrLights = [];
    for (const x of [-10, 10]) { const L = new THREE.PointLight(0xdfe8ff, 1.2, 7, 1.6); L.position.set(x, 2.8, 0); g.add(L); this.corrLights.push(L); place(g, 'sk_ceiling_light', x, 0, 0, 0); }
  }

  // ---------------- the basement: boiler room and server room ----------------
  buildBasement(g) {
    const col = this.col, block = this.block, W = { col, block, h: 3, tile: 2 };
    const z0 = ZB;
    plane(g, 'concrete', -8, z0, 8, z0 + 8, 0, { tile: 2 });
    plane(g, 'concrete', -8, z0, 8, z0 + 8, 3, { tile: 2, ceiling: true, color: 0x55585e });
    wall(g, 'brick', -8, z0, 8, z0, W); wall(g, 'brick', -8, z0 + 8, 8, z0 + 8, W); wall(g, 'brick', -8, z0, -8, z0 + 8, { ...W, gaps: [[z0 + 1.9, z0 + 3.1, 2.3]] }); wall(g, 'brick', 8, z0, 8, z0 + 8, W);
    wall(g, 'brick', 2, z0, 2, z0 + 8, { ...W, gaps: [[z0 + 5.4, z0 + 6.6, 2.3]] });
    this.stairBack = this.door(g, 'door_exit', -8, z0 + 2.5, 90, { label: 'stairs' });
    const boiler = place(g, 'sk_boiler', -4, 0, z0 + 6.5, 0); colliderFor(boiler, col, 0.1);
    place(g, 'sk_workbench', -6.9, 0, z0 + 5, 90, { col }); place(g, 'sk_toolbox', -6.9, 0.92, z0 + 5.2, 20); place(g, 'sk_fuse_box', -7.9, 1.1, z0 + 6.5, 90);
    this.boilerLight = new THREE.PointLight(0xff8a3a, 0.9, 6, 1.6); this.boilerLight.position.set(-4, 0.8, z0 + 5.5); g.add(this.boilerLight);
    this.serverDoor = this.door(g, 'door_boiler', 2, z0 + 6, 90, { open: true, label: 'server room' });
    // server rack
    const rack = new THREE.Group(); rack.position.set(6.5, 0, z0 + 3); g.add(rack);
    const rb = new THREE.Mesh(new THREE.BoxGeometry(0.8, 2.0, 0.9), psxMat({ color: 0x1a1c22 })); rb.position.y = 1.0; rack.add(rb); col.push({ x0: 6.1, x1: 6.9, z0: z0 + 2.55, z1: z0 + 3.45 }); block.push(rb);
    this.rackLeds = [];
    for (let i = 0; i < 6; i++) { const u = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.12, 0.78), psxMat({ color: 0x2a2d34 })); u.position.set(-0.41, 0.5 + i * 0.22, 0); rack.add(u);
      for (let j = 0; j < 8; j++) { const m = new THREE.MeshBasicMaterial({ color: 0x20ff60, fog: false }); const l = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.015, 0.015), m); l.position.set(-0.42, 0.5 + i * 0.22, -0.3 + j * 0.08); rack.add(l); this.rackLeds.push(m); } }
    // the switch with its internet uplink (WAN) cable, and the backup disk next to it
    this.uplink = new THREE.Group(); { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.2, 4), psxMat({ color: 0x2a62d9 })); c.position.set(6.05, 1.75, z0 + 3.2); this.uplink.add(c); const p = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.08), psxMat({ color: 0x2a62d9 })); p.position.set(6.08, 1.15, z0 + 3.2); this.uplink.add(p); const lab = canvasTex(32, 12, c2 => { c2.fillStyle = '#f2d24b'; c2.fillRect(0, 0, 32, 12); c2.fillStyle = '#111'; c2.font = '16px m5x7'; c2.textBaseline = 'top'; c2.fillText('WAN', 4, -2); }); const t = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.045), new THREE.MeshBasicMaterial({ map: lab })); t.position.set(6.04, 1.3, z0 + 3.2); t.rotation.y = -Math.PI / 2; this.uplink.add(t); }
    g.add(this.uplink);
    this.nas = new THREE.Group(); this.nas.position.set(5.0, 0.86, z0 + 1.0); g.add(this.nas);
    { const tb = place(g, 'sk_teacher_desk', 5.0, 0, z0 + 0.7, 0, { col }); const box = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.3, 0.35), psxMat({ color: 0x2b2e36 })); box.position.y = 0.15; this.nas.add(box);
      this.nasTex = canvasTex(48, 24, () => { }); const sc = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.08), new THREE.MeshBasicMaterial({ map: this.nasTex, fog: false })); sc.position.set(0, 0.2, 0.176); this.nas.add(sc);
      const cab = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 1.4, 4), psxMat({ color: 0x111 })); cab.rotation.z = Math.PI / 2.4; cab.position.set(0.6, 0.4, 0); this.nas.add(cab); this.nasCable = cab; }
    // rack screen with the ransom note
    this.rackTex = canvasTex(96, 64, () => { });
    const rs = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.34), new THREE.MeshBasicMaterial({ map: this.rackTex, fog: false })); rs.position.set(6.08, 1.55, z0 + 4.3); rs.rotation.y = -Math.PI / 2; g.add(rs); this.rackScreen = rs;
    { const bm = psxMat({ color: 0x1b1d22 }); const bz = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.44, 0.6), bm); bz.position.set(6.13, 1.55, z0 + 4.3); g.add(bz);
      const pole = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.33, 0.05), bm); pole.position.set(6.2, 0.665, z0 + 4.3); g.add(pole);
      const base = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.04, 0.45), bm); base.position.set(6.2, 0.02, z0 + 4.3); g.add(base);
      const kb = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.025, 0.45), psxMat({ color: 0x2a2d34 })); kb.position.set(6.0, 1.08, z0 + 4.3); g.add(kb);
      const sh = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.03, 0.5), bm); sh.position.set(6.08, 1.05, z0 + 4.3); g.add(sh);
      col.push({ x0: 5.95, x1: 6.45, z0: z0 + 4.0, z1: z0 + 4.6 }); }
    this.rackLight = new THREE.PointLight(0xff2020, 0.6, 4, 1.6); this.rackLight.position.set(5.5, 1.6, z0 + 4); g.add(this.rackLight);
  }

  setupInteractions() {
    const it = this.it, st = () => this.st;
    it.add(this.teacherPC, 'Teacher\'s PC: the school network map', () => this.openMap());
    it.add(this.stairUp.obj, 'Stairs down to the ground floor', () => this.goZone('ground'));
    it.add(this.stairDown.obj, 'Stairs up to Room 214', () => this.goZone('upper'));
    it.add(this.libDoor.obj, 'Library door', () => { play('denied', { vol: 0.4 }); this.armPush(); caption('The electronic lock blinks red. It runs on the network, and the network is infected. There must be another way in.', 'say', 5); });
    it.add(this.pc3, () => this.st.libCable ? 'Library PC-3 (unplugged)' : 'Library PC-3: the email that started it', () => this.openEmail());
    it.add(this.cable, () => this.st.libCable ? 'Network cable (unplugged)' : 'Pull PC-3\'s network cable out of the wall', () => this.pullCable(), () => !this.st.libCable && this.st.flagsDone);
    it.add(this.keyCab, 'Key cabinet', () => this.openKeys(), () => !this.st.key);
    it.add(this.noteObj, 'A yellow sticky note on the monitor', () => this.takeNote(), () => !this.st.note);
    it.add(this.boilerDoor.obj, () => this.st.key ? 'Boiler room: stairs to the basement' : 'Boiler room door (locked)', () => this.useBoiler());
    it.add(this.stairBack.obj, 'Stairs up to the ground floor', () => this.goZone('ground'));
    it.add(this.uplink, () => this.st.uplink ? 'WAN cable (unplugged)' : 'Pull the WAN cable: the school\'s link to the internet', () => this.pullUplink(), () => !this.st.uplink);
    it.add(this.nas, () => this.st.backup ? 'Backup disk (safe, unplugged)' : this.st.backupLost ? 'Backup disk (encrypted)' : 'Unplug the backup disk', () => this.pullBackup(), () => !this.st.backup && !this.st.backupLost);
    it.add(this.rackScreen, 'Server console: the ransom note', () => this.openRansom());
    it.add(this.front.obj, 'Front doors (maglocked)', () => { play('denied', { vol: 0.4 }); caption('The magnetic locks hold. They are run by the building system, and that is encrypted too.', 'say', 4); });
    it.add(this.gymDoor.obj, 'Gym door', () => { play('knob', { vol: 0.4 }); caption('Locked for the night. Something inside hums: the scoreboard, still on.', 'say', 3.5); });
  }

  // ---------------- flow ----------------
  async enter() {
    this.playing = false; hud(false); music(null);
    loop('amb8', 'amb_distant', { vol: 0.45 }); this.loops.push('amb8');
    if (this.st.phase === 'intro') {
      this.place('upper', [-1.5, ZU + 2.2, 0]);
      await fade(true, 'Friday, 22:58. Platán School, Room 214.\n\nDigital Culture Night: pizza, a film, sleeping bags on the lab floor.\nMs Varga has gone down to the car park for the spare sleeping bags. Everyone else is asleep.', 0.01);
      await wait(5);
      this.st.phase = 'play'; this.begin(false);
      await fade(false, '', 1.2);
    } else { this.place(this.st.zone); this.begin(true); await fade(false, '', 0.8); }
  }
  place(zone, at) {
    this.st.zone = zone; const s = at || ZONES[zone].spawn; this.player.set(s[0], s[1], s[2]);
    for (const k in this.zg) this.zg[k].visible = k === zone;
  }
  begin(resumed) {
    this.playing = true; hud(true); hudParts({ checklist: true, status: true, eye: false, batt: false });
    music('mus_dark', 0.16); this.updateGoals(); this.setObjective();
    if (resumed) caption('Back in the dark school. The countdown kept its place.', 'say', 4);
    lockPointer();
  }
  timeLeft() { return T_BACKUP + this.st.bonus - this.st.el; }
  clockStr() { const m = Math.floor((this.st.el + 120) / 60); return (m < 2 ? '22:5' + (8 + m) : '23:' + String(m - 2).padStart(2, '0')); }
  updateGoals() {
    const s = this.st, left = this.timeLeft();
    checklist(`${this.clockStr()} · backup encrypted in ${s.backup ? '—' : s.backupLost ? '0:00' : mmss(Math.max(0, left))}`, [
      { name: 'Find where it started', hu: 'network map', cls: s.mapSeen ? 'done' : '' },
      { name: 'Unplug library PC-3', hu: 'hálózati kábel', cls: s.libCable ? 'done' : '' },
      { name: 'Boiler room key', hu: 'kulcs: KAZÁN', cls: s.key ? 'done' : '' },
      { name: 'Cut the internet link', hu: 'WAN', cls: s.uplink ? 'done' : '' },
      { name: 'Save the backup disk', hu: 'biztonsági mentés', cls: s.backup ? 'done' : s.backupLost ? 'bad' : '' },
    ]);
  }
  setObjective() {
    const s = this.st;
    if (s.el < 3) objective('It\'s nearly midnight. Your classmates are asleep. Look around Room 214.');
    else if (!s.mapSeen) objective('Every screen is red. Check the teacher\'s PC at the front of Room 214 (E).');
    else if (!s.libCable) objective('Library PC-3 started it. Get to the library on the ground floor (stairs at the end of the corridor) and unplug it. Read the email first: what gave it away?');
    else if (!s.key) objective('Cut the whole network in the basement server room. The boiler room key is in the caretaker\'s office: key cabinet, tag "KAZÁN".');
    else if (!s.uplink || (!s.backup && !s.backupLost)) objective('Boiler room door at the east end of the corridor, then the server room: pull the WAN cable and unplug the backup disk.');
  }
  goZone(z) {
    if (this._moving) return; this._moving = true; this.playing = false;
    play('door_open', { vol: 0.5 });
    fade(true, z === 'basement' ? 'Down the narrow stairs, past the coal chute, into the warm dark.' : z === 'upper' ? 'Up the stairs to Room 214.' : 'Down the stairwell. Every step echoes.', 0.6).then(async () => {
      this.place(z); await wait(0.8); play('door_close', { vol: 0.4 });
      this.save(); await fade(false, '', 0.6); this.playing = true; this._moving = false;
      if (z === 'ground' && !this.st.ev.ground) { this.st.ev.ground = true; caption('The corridor lights are dead. Only the green emergency lights. Somewhere, keys jingle.', 'say', 5); play('heavy2', { vol: 0.35, pos: [18, 0.2, 0] }); }
      if (z === 'basement' && !this.st.ev.basement) { this.st.ev.basement = true; this.serverScare(); }
      this.setObjective();
    });
  }

  // ---------------- overlays ----------------
  openMap() {
    this.playing = false; this.G.unlock(); prompt(null);
    const s = this.st; s.mapSeen = true;
    const room = (k, x, y, w, h, label) => { const r = ROOMS.find(q => q[0] === k); const inf = s.el >= r[2] && !(k === 'nas' && s.backup) && !(k === 'lib' && false); const safe = (k === 'nas' && s.backup); return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${safe ? '#1f5a3c' : inf ? '#7a1414' : '#1d2a3a'}" stroke="#6a7a8a"/><text x="${x + 4}" y="${y + 14}" font-size="11" fill="#e6eef6" font-family="monospace">${label}</text><text x="${x + 4}" y="${y + 28}" font-size="9" fill="${inf ? '#ffb0a0' : '#9fc8b0'}" font-family="monospace">${safe ? 'SAFE (offline)' : inf ? 'ENCRYPTED' : 'ok'}</text>`; };
    const el = openScreen(`<div class="tablet fur"><div class="tbar"><b>Platán School · network map</b><span>${this.clockStr()}</span><span><button class="btn small" id="x">Close</button></span></div>
      <div class="tbody" style="display:block;padding:12px;overflow:auto">
      <svg viewBox="0 0 560 250" style="width:100%;max-height:44vh;background:#0b1510;border-radius:8px">
        <text x="10" y="18" font-size="12" fill="#7fe0b0" font-family="monospace">GROUND FLOOR</text>
        ${room('lib', 10, 26, 110, 70, 'Library · PC-3')}${room('c104', 124, 26, 110, 70, 'Room 104')}${room('off', 124, 150, 110, 70, 'Office')}${room('gym', 340, 150, 140, 70, 'Gym')}${room('can', 340, 26, 140, 70, 'Canteen')}${room('bms', 238, 26, 98, 70, 'Lights/doors')}
        <rect x="10" y="100" width="470" height="46" fill="#121c18" stroke="#3a4a42"/><text x="200" y="128" font-size="11" fill="#5f8a76" font-family="monospace">corridor</text>
        <text x="490" y="18" font-size="12" fill="#7fe0b0" font-family="monospace">2nd</text>${room('c214', 488, 26, 66, 70, 'Lab 214')}
        <text x="490" y="140" font-size="12" fill="#7fe0b0" font-family="monospace">base</text>${room('srv', 488, 150, 66, 44, 'Server')}${room('nas', 488, 198, 66, 44, 'Backup')}
      </svg>
      <table class="tlog" style="margin-top:8px">
        <tr><td>23:00:41</td><td><b>LIBRARY-PC3</b> opened <b>"Fizetésemelés_2026.pdf.exe"</b> from igazgato@platan-iskola.co</td></tr>
        <tr><td>23:00:44</td><td>New program "zarolva.exe" started · spreading through the shared drive</td></tr>
        <tr><td>23:00:52</td><td>SERVER: <b>2.3 GB uploaded to an unknown address</b> (staff files, grades, parents_contacts.xlsx)</td></tr>
        <tr><td>23:01:02</td><td>ROOM214-* files renamed to *.zarolva</td></tr>
        <tr><td>${s.el > 60 ? '23:01:58' : '…'}</td><td>${s.el > 60 ? 'BUILDING-SYSTEM (lights, door locks) encrypted' : ''}</td></tr>
        <tr><td>always</td><td>BACKUP-DISK connected to the server: <b>${s.backup ? 'unplugged · safe' : 'online · reachable'}</b></td></tr>
      </table>
      <p class="sub" style="font-size:.85em">${rich('This is [[ransomware]]: a program that locks files and demands money. It spreads to every computer and disk it can reach on the network.')}</p></div></div>`);
    el.querySelector('#x').onclick = () => {
      closeScreen(el); this.playing = true; lockPointer();
      if (!s.ev.vargaPlan) { s.ev.vargaPlan = true; this.after(2, () => toast('Ms Varga', 'ok, deep breath. can you be my hands? the map says it started in the library, PC-3. unplug ITS network cable. don\'t pay, don\'t click anything 🙏', 10)); }
      this.setObjective(); this.updateGoals(); this.save();
    };
  }
  openEmail() {
    this.playing = false; this.G.unlock(); prompt(null);
    const s = this.st, F = s.flags;
    const el = openScreen(`<div class="tablet fur mail8"><div class="tbar"><b>PC-3 · Platán Mail</b><span>library</span><span><button class="btn small" id="x">Close</button></span></div><div class="tbody" style="display:block;padding:14px;overflow:auto" id="m"></div></div>`);
    const render = () => {
      const n = Object.keys(F).length;
      el.querySelector('#m').innerHTML = `<p class="sub" style="font-size:.85em">Somebody opened this email at 23:00. Click the three things that should have stopped them.</p>
        <div class="mail"><div><b>From:</b> Igazgató <span class="flag ${F.from ? 'got' : ''}" data-flag="from">&lt;igazgato@platan-iskola.co&gt;</span></div>
        <div><b>To:</b> all-staff@platan.hu</div><div><b>Subject:</b> Fizetésemelés 2026 · pay rise list</div>
        <div class="body">Dear colleagues,<br><br>attached is the confidential list of 2026 pay rises. <span class="flag ${F.urgent ? 'got' : ''}" data-flag="urgent">Please confirm within 1 hour or your rise will be cancelled.</span><br><br>Regards,<br>The Principal</div>
        <div class="att">📎 <span class="flag ${F.exe ? 'got' : ''}" data-flag="exe">Fizetésemelés_2026.pdf.exe</span> · 412 KB</div></div>
        <div class="tips">${F.from ? '<div>✓ The real school address ends in <b>platan.hu</b>. This one is "platan-iskola.co": a look-alike.</div>' : ''}${F.urgent ? '<div>✓ Pressure and a deadline: "within 1 hour or…" is there to stop you thinking.</div>' : ''}${F.exe ? '<div>✓ ".pdf.exe" is a program pretending to be a document. Opening it runs it.</div>' : ''}</div>
        ${n >= 3 || s.flagsDone ? `<button class="btn primary" id="go">${s.libCable ? 'Close' : 'Now: pull the network cable (on the floor by the table)'}</button>` : `<p class="sub">${n}/3 found</p>`}`;
      el.querySelectorAll('[data-flag]').forEach(b => b.onclick = () => { if (!F[b.dataset.flag]) { F[b.dataset.flag] = true; play('paper', { vol: 0.45 }); this.save(); render(); } });
      const go = el.querySelector('#go'); if (go) go.onclick = () => { s.flagsDone = true; close(); };
    };
    const close = () => { closeScreen(el); this.playing = true; lockPointer(); this.setObjective(); this.save(); };
    el.querySelector('#x').onclick = close;
    render();
  }
  pullCable() {
    const s = this.st; s.libCable = true; s.bonus += 120; this.armPush();
    play('plastic', { vol: 0.6, pos: [-15.95, 0.1, -8.0] }); this.plug.visible = false; this.pc3Light.color.set(0x404858); this.pc3Light.intensity = 0.2;
    caption('Click. The plug comes out. PC-3 is off the network: it can\'t reach any other computer now.', 'say', 5);
    this.after(3, () => toast('Ms Varga', 'good!! it\'s still spreading on the others though. we need to cut the whole network: SERVER ROOM, basement, behind the boiler room. key: caretaker\'s office, key cabinet, tag KAZÁN', 11));
    this.after(5, () => this.setObjective());
    this.updateGoals(); this.save();
  }
  openKeys() {
    this.playing = false; this.G.unlock(); prompt(null);
    const keys = [['tornaterem', 'TORNATEREM · gym'], ['konyvtar', 'KÖNYVTÁR · library'], ['kazan', 'KAZÁN · boiler room'], ['igazgato', 'IGAZGATÓ · principal'], ['ebedlo', 'EBÉDLŐ · canteen'], ['padlas', 'PADLÁS · attic']];
    const el = openScreen(`<div class="panel" style="width:min(560px,94vw)"><h2 style="margin-top:0">Key cabinet</h2><p class="sub">Twenty hooks, six keys left. Which one opens the way to the server room?</p>
      <div class="btns" style="flex-direction:column;align-items:stretch">${keys.map(([k, l]) => `<button class="btn" data-k="${k}">🔑 ${l}</button>`).join('')}<button class="btn" id="x">Close</button></div><p class="sub" id="msg"></p></div>`);
    el.querySelectorAll('[data-k]').forEach(b => b.onclick = () => {
      if (b.dataset.k === 'kazan') { closeScreen(el); this.st.key = true; play('pickup', { vol: 0.6 }); this.armPush(); caption('The boiler room key. Heavy, with a red tag.', 'say', 3); this.playing = true; lockPointer(); this.setObjective(); this.updateGoals(); this.save(); return; }
      if (b.dataset.k === 'konyvtar') { el.querySelector('#msg').textContent = 'The library door is electronic now. A key won\'t help, and you are past the library anyway.'; }
      else el.querySelector('#msg').textContent = 'Not that one. The server room is behind the boiler room, in the basement.';
      this.st.wrongKeys++; play('denied', { vol: 0.3 });
    });
    el.querySelector('#x').onclick = () => { closeScreen(el); this.playing = true; lockPointer(); };
  }
  takeNote() {
    this.st.note = true; this.noteObj.visible = false; play('paper', { vol: 0.5 }); this.armPush();
    caption('A sticky note on the office monitor: "server admin / Platan2026!". The password to everything, on the screen, for anyone to read.', 'say', 6);
    this.save();
  }
  useBoiler() {
    if (!this.st.key) { play('denied', { vol: 0.4 }); caption('Locked. STAFF ONLY. The key must be in the caretaker\'s office.', 'say', 3.5); return; }
    play('latch', { vol: 0.6, pos: [20, 1, 0] }); this.goZone('basement');
  }
  pullUplink() {
    this.st.uplink = true; this.armPush(); this.uplink.children[0].visible = false; this.uplink.children[1].position.y = 0.2;
    play('plastic', { vol: 0.6 }); caption('The blue WAN cable is out. The school is cut off from the internet: nothing more can get in or out.', 'say', 5);
    this.updateGoals(); this.save(); this.checkEnd();
  }
  pullBackup() {
    if (this.st.backupLost) return;
    this.st.backup = true; this.armPush(); this.nasCable.visible = false; play('plastic', { vol: 0.6 });
    caption(`Unplugged at ${mmss(this.timeLeft())} left. The backup disk spins down. Whatever the program has not reached yet is safe now.`, 'say', 5);
    this.updateGoals(); this.save(); this.checkEnd();
  }
  openRansom() {
    this.playing = false; this.G.unlock(); prompt(null);
    const el = openScreen(`<div class="panel ransom8" style="width:min(620px,94vw)"><h2 style="margin-top:0">🔒 ZÁROLVA</h2><p>Your files are encrypted. To get them back, send <b>2 BTC</b> to the address below within 60 minutes. After that, the key is deleted and the price doubles.</p><p>We have also <b>copied</b> your files. If you don't pay, we publish them.</p><p class="mono">bc1q-…-zarolva</p>
      <div class="btns"><button class="btn" id="pay">Pay</button><button class="btn primary" id="x">Close</button></div><p class="sub" id="msg"></p></div>`);
    el.querySelector('#pay').onclick = () => { this.st.paid = true; play('denied', { vol: 0.4 }); el.querySelector('#msg').innerHTML = rich('You can\'t pay from here, and you shouldn\'t: paying funds the criminals, marks the school as a target that pays, and there is no guarantee the files come back. A clean backup is the real way back.'); this.save(); };
    el.querySelector('#x').onclick = () => { closeScreen(el); this.playing = true; lockPointer(); };
  }

  // ---------------- scares ----------------
  feriScare() {
    if (this.st.feriMet) return; this.st.feriMet = true;
    const quiet = this.G.quiet(), f = this.feri, p = this.player.pos;
    this.playing = false; this.G.unlock(); prompt(null);
    // the gym door opens from the inside and he steps out with his torch
    play('knob', { vol: 0.6, pos: [14, 1, 1.5] }); this.openDoor(this.gymDoor);
    this.player.yaw = Math.atan2(-(14 - p.x), -(1.5 - p.z)); this.player.pitch = 0; this.player.sync();
    f.obj.visible = true; f.obj.position.set(14, 0, 3.2); f.faceTo(14, 0); f.obj.rotation.y = f.facing; this.feriTorch.intensity = 6;
    const side = new THREE.Vector3(p.x > 14 ? 15.1 : 12.9, 0, 0.3), pts = [new THREE.Vector3(14, 0, 0.3)];
    if (Math.hypot(p.x - side.x, p.z - side.z) > 1.4) pts.push(side);
    f.walkTo(pts, () => {
      f.faceTo(p.x, p.z); f.obj.rotation.y = f.facing; f.play('Idle_Torch_Loop', 0.2);
      this.player.yaw = Math.atan2(-(f.obj.position.x - p.x), -(f.obj.position.z - p.z)); this.player.pitch = 0.05; this.player.sync();
      if (!quiet) { play('stinger', { vol: 0.9 }); flash(0.25, 140); } else play('heavy3', { vol: 0.6, pos: [14, 0.2, 1] });
      caption('Feri bácsi (the caretaker): "Mit keresel te itt?!" (What are you doing here?!)', 'say', 4);
      this.feriTalk();
    });
  }
  feriTalk() {
    const f = this.feri;
    setTimeout(() => {
      this.G.unlock();
      const el = openScreen(`<div class="panel" style="width:min(600px,94vw);margin-top:40vh"><p><b>Feri bácsi:</b> Every light in the building just died and the doors won't open. What are you doing down here?</p>
        <div class="btns" style="flex-direction:column;align-items:stretch"><button class="btn" data-k="a">Ms Varga sent me. A virus is locking every computer. I need the server room.</button><button class="btn" data-k="b">Nothing! Sorry!</button></div></div>`);
      el.querySelectorAll('[data-k]').forEach(b => b.onclick = () => {
        const a = b.dataset.k;
        el.querySelector('.panel').innerHTML = a === 'a' ? `<p><b>Feri bácsi:</b> A virus? On the computers? …I don't know computers, kid. I know boilers. The basement door sticks: push hard. I'll go and get Ms Varga out of that lift.</p><div class="btns"><button class="btn primary" id="ok">OK</button></div>`
          : `<p><b>Feri bácsi:</b> Nothing? With every screen in the school screaming red? …Go on, tell Ms Varga. I'll be at the lift.</p><div class="btns"><button class="btn primary" id="ok">OK</button></div>`;
        el.querySelector('#ok').onclick = () => {
          closeScreen(el); this.playing = true; lockPointer();
          f.walkTo([new THREE.Vector3(14, 0, 0), new THREE.Vector3(-6, 0, 0), new THREE.Vector3(-19, 0, 0)], () => { f.obj.visible = false; this.feriTorch.intensity = 0; });
        };
      });
    }, 1200);
  }
  serverScare() {
    const quiet = this.G.quiet();
    this.after(4, () => {
      if (this.st.zone !== 'basement') return;
      loop('fans8', 'fan', { vol: quiet ? 0.25 : 0.7, rate: 1.4 }); this.loops.push('fans8');
      if (!quiet) { play('stinger', { vol: 0.8 }); play('rumble', { vol: 0.8, rate: 1.6 }); flash(0.2, 120); this.rackFlash = 2.5; }
      caption('[through the server room door: every fan spins up at once, a roar, and a red screen lights the dark]', 'sfx', 5);
      this.after(6, () => { if (!this.st.backup) toast('Ms Varga', 'are you there? the backup disk is plugged in ALL the time. if it gets encrypted too, there is nothing to restore. unplug it!', 10); });
    });
  }
  // Feri glimpsed with his torch at the far end of the corridor, then gone
  updateWatch(dt) {
    const W = this.watch, f = this.feri, p = this.player.pos;
    if (this.st.feriMet || this.st.zone !== 'ground' || f.path.length) return;
    if (W.on) { W.life -= dt; if (W.life <= 0) { W.on = false; f.obj.visible = false; this.feriTorch.intensity = 0; } return; }
    W.t -= dt; if (W.t > 0) return; W.t = 22 + Math.random() * 25;
    const spot = p.x < 0 ? [19.2, 0] : [-19.2, 0];
    if (Math.abs(p.z) > 1.6 || Math.abs(spot[0] - p.x) < 12) { W.t = 5; return; }
    f.obj.position.set(spot[0], 0, spot[1]); f.faceTo(p.x, p.z); f.obj.rotation.y = f.facing; f.obj.visible = true; this.feriTorch.intensity = 5; f.play('Idle_Torch_Loop', 0);
    W.on = true; W.life = 2.4; play('heavy1', { vol: 0.3, pos: [spot[0], 0.2, 0] });
    if (!this.st.ev.glimpse) { this.st.ev.glimpse = true; setTimeout(() => caption('A torch at the end of the corridor. Someone is down here.', 'say', 4), 900); }
  }

  // ---------------- timeline ----------------
  timeline() {
    const s = this.st, t = s.el, E = s.ev;
    const once = (k, at, f) => { if (t >= at && !E[k]) { E[k] = true; f(); } };
    once('hello', 1.5, () => caption('Pizza boxes. Sleeping bags. Bence snoring. Ms Varga said she\'d be back in five minutes.', 'say', 5));
    once('red', 4, () => {
      this.labRed = true; play('crton', { vol: 0.7 }); play('crton', { vol: 0.5, rate: 0.8 }); play('presence', { vol: 0.3 }); this.upLamp.intensity = 0;
      caption('[23:00. Every monitor in the room switches on at once. All of them red]', 'sfx', 5);
      if (A.img.ep8_lab_night) {
        const el = openScreen(`<div class="cut8"><img src="${A.img.ep8_lab_night}" alt=""><div class="cap">23:00</div></div>`, 'solid');
        this.playing = false; this.G.unlock();
        setTimeout(() => { el.classList.add('out'); }, 2600);
        setTimeout(() => { closeScreen(el); this.playing = true; lockPointer(); }, 3400);
      }
      this.after(4, () => { this.setObjective(); caption('"ZÁROLVA"? Locked? …The teacher\'s PC at the front has the network map.', 'say', 5); });
    });
    once('varga1', 12, () => toast('Ms Varga', 'the lift just stopped between floors 😬 it runs on the school network too. are you ok? what do the screens say?', 9));
    once('lights', 60, () => { for (const L of this.corrLights) L.intensity = 0; play('switch_off', { vol: 0.5 }); if (s.zone === 'ground') caption('[the corridor lights die, one after the other]', 'sfx', 4); });
    once('c104', 40, () => { this.c104On = true; });
    once('office', 75, () => { this.offOn = true; });
    once('warn3', T_BACKUP + s.bonus - 180, () => { if (!s.backup) toast('Ms Varga', '3 minutes until it reaches the backup disk, if the map is right 😟', 8); });
    if (this.timeLeft() <= 0 && !s.backup && !s.backupLost) {
      s.backupLost = true; play('distort', { vol: 0.5 }); caption('[somewhere below you, a disk clicks. The backup disk is encrypted]', 'sfx', 5);
      this.after(2, () => toast('Ms Varga', 'the backup is gone too… ok. we\'ll deal with it. cut the WAN cable at least, so it stops here.', 10));
      this.updateGoals(); this.save(); this.checkEnd();
    }
  }
  after(sec, f) { (this.q = this.q || []).push({ at: this.st.el + sec, f }); }
  checkEnd() { if (this.st.uplink && (this.st.backup || this.st.backupLost) && this.st.phase === 'play') { this.st.phase = 'end'; this.after(2.5, () => this.finale()); } }

  // ---------------- screens ----------------
  drawScreens(t) {
    this._dt = (this._dt || 0) + 1; if (this._dt % 3) return;
    const ransom = (c, w, h, big) => {
      c.fillStyle = Math.sin(t * 2) > 0.95 ? '#5a0000' : '#3a0000'; c.fillRect(0, 0, w, h); c.fillStyle = '#ff5a4a'; c.font = '16px m5x7'; c.textBaseline = 'top';
      pxText(c, 'ZÁROLVA', 4, 2, 16); c.fillStyle = '#ffc0b0'; c.fillText(big ? 'files encrypted' : 'locked', 4, 18); c.fillText(mmss(3600 - this.st.el), 4, h - 16);
      if (big) { c.fillText('pay 2 BTC', 4, 32); c.fillText('within 60 min', 4, 44); }
    };
    if (this.labRed) { ransom(this.labTex.userData.g, 64, 48); this.labTex.needsUpdate = true; for (const L of this.labScreens) L.intensity = 0.55 + Math.random() * 0.1; }
    else { const c = this.labTex.userData.g; c.fillStyle = '#050608'; c.fillRect(0, 0, 64, 48); this.labTex.needsUpdate = true; }
    { const c = this.pc3Tex.userData.g; if (this.st.libCable) { c.fillStyle = '#05070b'; c.fillRect(0, 0, 64, 48); c.fillStyle = '#6a7a8a'; c.font = '16px m5x7'; c.textBaseline = 'top'; c.fillText('no network', 4, 16); } else ransom(c, 64, 48); this.pc3Tex.needsUpdate = true; }
    if (this.c104On) { ransom(this.c104Tex.userData.g, 64, 48); this.c104Tex.needsUpdate = true; this.c104Light.intensity = 0.7; }
    if (this.offOn) { ransom(this.offTex.userData.g, 64, 48); this.offTex.needsUpdate = true; this.offLight.intensity = 0.6; }
    ransom(this.rackTex.userData.g, 96, 64, true); this.rackTex.needsUpdate = true;
    if (this.rackFlash > 0) this.rackLight.intensity = Math.random() < 0.5 ? 3 : 0.3; else this.rackLight.intensity = 0.6;
    { const c = this.nasTex.userData.g, s = this.st; c.fillStyle = '#020403'; c.fillRect(0, 0, 48, 24); c.font = '16px m5x7'; c.textBaseline = 'top';
      if (s.backup) { c.fillStyle = '#7fe0b0'; c.fillText('OFFLINE', 3, 4); } else if (s.backupLost) { c.fillStyle = '#ff5a4a'; c.fillText('LOCKED', 3, 4); }
      else { const pct = Math.max(0, Math.min(99, Math.floor(100 - this.timeLeft() / (T_BACKUP + s.bonus) * 100))); c.fillStyle = pct > 0 && s.uplink === false && s.el > 330 ? '#ffb469' : '#7fe0b0'; c.fillText(s.el > 330 ? 'SYNC ' + pct + '%' : 'ONLINE', 3, 4); }
      this.nasTex.needsUpdate = true; }
    for (let i = 0; i < this.rackLeds.length; i++) this.rackLeds[i].color.setHex(this.st.uplink && i % 8 === 0 ? 0x200808 : Math.random() < 0.5 ? 0x20ff60 : 0x064018);
  }

  // ---------------- ending ----------------
  async finale() {
    this.playing = false; this.G.unlock(); prompt(null); objective(null);
    play('door_open', { vol: 0.6 }); play('heavy2', { vol: 0.5 });
    await wait(1.2);
    const s = this.st;
    const el = openScreen(`<div class="panel" style="width:min(640px,94vw);margin-top:36vh"><div id="dlg"></div></div>`);
    const show = (who, text, opts) => new Promise(r => {
      el.querySelector('#dlg').innerHTML = `<p><b>${who}:</b> ${esc(text)}</p><div class="btns" style="flex-direction:column;align-items:stretch">${opts.map(([k, l]) => `<button class="btn" data-k="${k}">${esc(l)}</button>`).join('')}</div>`;
      el.querySelectorAll('[data-k]').forEach(b => b.onclick = () => { play('uiclick', { vol: 0.4 }); r(b.dataset.k); });
    });
    await show('Ms Varga (out of breath, Feri bácsi behind her)', s.backup ? 'You pulled the internet AND the backup? …You saved the school\'s files. Every single one we backed up.' : 'You cut the internet. The backup is gone, but it stops here. That matters.', [['ok', 'It was PC-3 in the library. A fake pay-rise email.']]);
    const k = await show('Ms Varga', 'The note on the screen says we should pay. What do you think?', [['no', 'Don\'t pay. Report it, and restore from the backup.'], ['yes', 'Pay, so we get the files back tonight.']]);
    await show('Ms Varga', k === 'no' ? 'Exactly. Paying tells them we\'re a school that pays, and there\'s no guarantee anyway. I\'m calling the head and the police, and on Monday we report it to the national cyber security centre.' : 'I understand why, but no. Paying funds them, marks us as a school that pays, and there\'s no guarantee the files come back. We report it and rebuild.', [['ok2', 'And the password on the sticky note?']]);
    await show('Feri bácsi', s.note ? '…That was mine. The man from the IT company wrote it there for me. I\'ll take it down.' : 'What note? …Oh. In my office? That was the IT man\'s idea.', [['end', 'OK.']]);
    closeScreen(el);
    for (const id of this.loops) stopLoop(id, 0.8);
    hud(false);
    await fade(true, s.backup ? `End of episode ${epPos(8)}.\n\nOn Monday the school restores everything from the backup disk you unplugged.\nThe sticky note is gone. The staff get a new rule: no ".exe" in emails.` : `End of episode ${epPos(8)}.\n\nThe files from that night are gone, and the school rebuilds from older copies.\nNobody pays. The sticky note is gone.`, 1.5);
    await wait(5);
    const secs = Math.round((Date.now() - s.start) / 1000);
    const d = epData(8); d.done = true; d.state = null; d.best = d.best ? Math.min(d.best, secs) : secs; persist();
    music('mus_debrief', 0.45);
    await fade(false, '', 0.5);
    const stats = [`Backup: ${s.backup ? 'saved with ' + mmss(this.timeLeft()) + ' left' : 'encrypted'}`, `Red flags found: ${Object.keys(s.flags).length}/3`, `Library PC unplugged: ${s.libCable ? 'yes' : 'no'}`, `Password note found: ${s.note ? 'yes' : 'no'}`, `Would pay: ${k === 'yes' || s.paid ? 'yes' : 'no'}`, `Wrong keys tried: ${s.wrongKeys}`];
    const nx = await debriefScreen(DEBRIEF_EP8, stats, this.G.nextLabel(8));
    await fade(true, '', 0.6);
    if (nx === 'next') { await this.G.goNext(8); await fade(false, '', 0.8); return; }
    await this.G.goHub(); await fade(false, '', 0.8);
  }
  save() {
    const st = this.st; if (st.phase === 'intro' || st.phase === 'end') return;
    const { start, ...rest } = st; epData(8).state = { ...rest, elapsed: Date.now() - start }; persist();
  }

  // ---------------- loop ----------------
  update(dt, t) {
    this.drawScreens(t);
    if (this.feri.obj.visible) this.feri.update(dt);
    for (const d of this.doors) { d.mixer.update(dt); }
    for (const ds of this._doorStops || []) if (!ds.a.paused && ds.a.time >= ds.half) ds.a.paused = true;
    if (!this.playing) return;
    const s = this.st;
    if (s.phase === 'play' || s.phase === 'end') {
      s.el += dt;
      const q = this.q || []; for (const j of q.filter(j => s.el >= j.at)) { q.splice(q.indexOf(j), 1); j.f(); }
      if (s.phase === 'play') this.timeline();
    }
    if (this.rackFlash > 0) this.rackFlash -= dt;
    this.player.update(dt);
    this.updateFlash(dt); this.updateArms(dt, t);
    this.updateWatch(dt);
    // Feri steps out of the gym once you have the key and walk towards the boiler room
    if (s.key && !s.feriMet && s.zone === 'ground' && Math.hypot(this.player.pos.x - 14, this.player.pos.z - 0) < 3.2) this.feriScare();
    this.fill.intensity = 0.25;
    this._g = (this._g || 0) + dt; if (this._g > 0.5) { this._g = 0; this.updateGoals(); }
    this._sv = (this._sv || 0) + dt; if (this._sv > 8) { this._sv = 0; this.save(); }
    this.interact();
  }
  exit() { super.exit(); stopLoop('fans8'); }
}
