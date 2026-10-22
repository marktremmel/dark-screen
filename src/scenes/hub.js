import * as THREE from 'three';
import { inst } from '../core/assets.js';
import { psxMat } from '../core/render.js';
import { texBox, plane, wall, windowPane, lamp, canvasTex, place, colliderFor, pxText, clockFace } from '../core/world.js';
import { Player, Interactor, IN, wasPressed, lockPointer } from '../core/player.js';
import { hud, hudParts, objective, prompt, caption, fade } from '../core/hud.js';
import { music, loop, play } from '../core/audio.js';
import { S, isDone, isUnlocked, orderOK, keyOK, tryCode, persist } from '../core/state.js';
import { EPISODES, BUILT, epPos, epInfo, LOCKS_ON } from '../text.js';
import { openScreen, closeScreen, settingsScreen, exportScreen, importScreen, creditsScreen } from '../ui/screens.js';


export class Hub {
  constructor(G, o = {}) { this.G = G; this.titleMode = !!o.titleMode; this.playing = false; this.quitLabel = 'Quit to the title screen'; }
  async outside() { this.playing = false; play('door_open', { vol: 0.5 }); await fade(true, '', 1.2); await this.G.goField(); }
  async build() {
    const sc = this.scene = new THREE.Scene();
    // after the finale (Tükörkép, id 6) the lab is shown in morning light
    const day = this.day = !this.titleMode && isDone(6);
    sc.background = new THREE.Color(day ? 0x8a9ab0 : 0x0d1018);
    sc.fog = new THREE.Fog(day ? 0x9aa6b8 : 0x0d1018, day ? 12 : 7, day ? 40 : 24);
    const g = this.root = new THREE.Group(); sc.add(g);
    const col = this.col = []; const block = this.block = [];
    const X0 = -7, X1 = 7, Z0 = -4.5, Z1 = 4.5, HH = 3.0;
    plane(g, 'lab_floor', X0, Z0, X1, Z1, 0, { tile: 0.9 });
    plane(g, 'ceiling', X0, Z0, X1, Z1, HH, { tile: 0.6, ceiling: true, color: 0xb8b8b8 });
    const wo = { col, block, h: HH, tile: 1.4, skirt: 'skirt', skirtH: 0.9 };
    wall(g, 'lab_wall', X0, Z0, X1, Z0, wo);
    wall(g, 'lab_wall', X0, Z1, X1, Z1, { ...wo, gaps: [[-5.7, -4.3, 2.15], [4.6, 6.0, 2.15]] });
    wall(g, 'lab_wall', X0, Z0, X0, Z1, wo);
    wall(g, 'lab_wall', X1, Z0, X1, Z1, wo);
    // door (exit)
    const door = place(g, 'door', 5.3, 0, Z1 - 0.02, 180); door.scale.set(0.95, 1.02, 1);
    this.doorObj = door;
    col.push({ x0: 4.6, x1: 6.0, z0: Z1 - 0.1, z1: Z1 + 0.6 }); // the door is closed: you leave through it with E, not by walking (backwards) through the gap
    // Lépcsőház (13+): the stairwell mode, behind its own door with a sign
    const rdoor = place(g, 'door', -5.0, 0, Z1 - 0.02, 180); rdoor.scale.set(0.95, 1.02, 1); this.rogueDoor = rdoor;
    col.push({ x0: -5.7, x1: -4.3, z0: Z1 - 0.1, z1: Z1 + 0.6 });
    const rsign = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.34), new THREE.MeshBasicMaterial({ map: canvasTex(104, 28, (c, w, h) => { c.fillStyle = '#1d3a2c'; c.fillRect(0, 0, w, h); c.fillStyle = '#d6efe2'; pxText(c, 'LÉPCSŐHÁZ 13+', 6, 6, 16); }) }));
    rsign.position.set(-5.0, 2.45, Z1 - 0.08); rsign.rotation.y = Math.PI; g.add(rsign);
    // windows + moonlight
    for (const z of [-2.6, 0, 2.6]) windowPane(g, X0 + 0.07, 1.75, z, 1.7, 1.3, Math.PI / 2, day ? { day: true, view: 'view_morning_school', top: '#f6d9a8', bottom: '#b8c8d8' } : { lights: true, view: 'view_night_school' });
    const moon = new THREE.DirectionalLight(day ? 0xffd9a0 : 0x8ea6ff, day ? 1.6 : 0.2); moon.position.set(-10, day ? 4 : 6, 2); sc.add(moon);
    sc.add(new THREE.AmbientLight(day ? 0xfff0e0 : 0x6e7894, day ? 0.75 : 0.13));
    sc.add(new THREE.HemisphereLight(day ? 0xdfe8ff : 0x8090c0, 0x302820, day ? 0.5 : 0.1));
    // blackboard
    const bb = canvasTex(256, 96, (c, w, h) => {
      c.fillStyle = '#1f3a2c'; c.fillRect(0, 0, w, h);
      for (let i = 0; i < 300; i++) { c.fillStyle = `rgba(255,255,255,${Math.random() * 0.05})`; c.fillRect(Math.random() * w, Math.random() * h, 3, 1); }
      c.fillStyle = '#e8efe9'; c.font = '16px m5x7'; c.textBaseline = 'top';
      c.fillText('DIGITAL CULTURE  -  ROOM 214', 10, 8);
      pxText(c, 'SÖTÉT KÉPERNYŐ', 10, 26, 32);
      c.font = '16px m5x7'; c.fillStyle = '#cfe0d6';
      c.fillText(day ? 'Good morning, 7.B. All nine are done.' : 'Find the computer that is switched on.', 10, 62);
      c.fillText('One story per lesson.', 10, 76);
    });
    const board = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 1.35), new THREE.MeshLambertMaterial({ map: bb }));
    board.position.set(-0.8, 1.65, Z0 + 0.075); g.add(board);
    texBox(g, null, -2.7, 0.92, Z0 + 0.06, 1.1, 0.96, Z0 + 0.2, { color: 0x6b5a48 });
    // posters on the right wall
    const poster = (z, lines, color) => {
      const t = canvasTex(64, 90, (c, w, h) => { c.fillStyle = color; c.fillRect(0, 0, w, h); c.fillStyle = '#111'; c.font = '16px m5x7'; c.textBaseline = 'top'; lines.forEach((l, i) => c.fillText(l, 4, 6 + i * 13)); });
      const m = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.85), new THREE.MeshLambertMaterial({ map: t })); m.position.set(X1 - 0.07, 1.7, z); m.rotation.y = -Math.PI / 2; g.add(m);
    };
    poster(-2.2, ['PASSWORDS', 'are like', 'tooth-', 'brushes:', "don't", 'share!'], '#e8d56a');
    poster(-0.9, ['THINK', 'before', 'you', 'POST.'], '#8fd0e8');
    poster(1.6, ['NO FOOD', 'NEAR THE', 'KEY-', 'BOARDS'], '#e89a8f');
    clockFace(g, X1 - 0.07, 2.25, 3.0, -Math.PI / 2);
    // lamps
    this.lamps = [];
    [[-4, -2], [-4, 2], [0, -2], [0, 2], [4, -2], [4, 2]].forEach(([x, z], i) => {
      const L = lamp(g, x, HH, z, { intensity: 4, dist: 8, color: 0xdfe8ff });
      L.set(i === 3 ? 0.55 : i === 0 ? 0.3 : 0); if (i === 3) L.flicker = 1; this.lamps.push(L);
    });
    // student desks with retro PCs
    this.pcs = [];
    const cols = [-4.6, -1.2, 2.2], rows = [-1.7, 0.6, 2.9];
    rows.forEach((z, r) => cols.forEach((x, c) => {
      const pos = r * 3 + c + 1, n = EPISODES[pos - 1].id;
      const desk = place(g, 'labdesk', x, 0, z, 0, { col });
      const pc = place(g, 'pcretro', x - 0.25, 0.75, z - 0.12, 0, {});
      place(g, 'keyboard', x + 0.35, 0.755, z + 0.12, 0);
      const ch = place(g, 'labchair', x - 0.2 + (pos % 3) * 0.1, 0, z + 0.75, 180 + (pos * 13 % 25) - 12);
      colliderFor(ch, col, 0.08, true);
      // screen overlay
      const st = canvasTex(64, 48, () => { });
      const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.336, 0.266), new THREE.MeshBasicMaterial({ map: st, fog: false }));
      scr.position.set(-0.057, 0.243, 0.104); pc.add(scr);
      const glow = new THREE.PointLight(0x9fd8ff, 0, 3.2, 1.6); glow.position.set(-0.08, 0.3, 0.6); pc.add(glow);
      this.pcs.push({ n, pos, pc, scr, st, glow, x, z });
    }));
    // teacher desk + PC (menu)
    const tdesk = place(g, 'labdesk', 4.6, 0, -3.3, 0, { col });
    const tpc = place(g, 'pcretro', 4.4, 0.75, -3.42, 0);
    const tst = canvasTex(64, 48, (c, w, h) => { c.fillStyle = '#123'; c.fillRect(0, 0, w, h); c.fillStyle = '#ffd27a'; c.font = '16px m5x7'; c.textBaseline = 'top'; c.fillText('TEACHER', 4, 6); c.fillStyle = '#cde'; c.fillText('settings', 4, 20); c.fillText('save code', 4, 32); });
    const tscr = new THREE.Mesh(new THREE.PlaneGeometry(0.336, 0.266), new THREE.MeshBasicMaterial({ map: tst, fog: false })); tscr.position.set(-0.057, 0.243, 0.104); tpc.add(tscr);
    place(g, 'labchair', 4.5, 0, -4.0, 0);
    this.tpc = tpc;
    this.refreshScreens();
    // player + interaction
    this.player = new Player(this.G.camera); this.player.boxes = col;
    this.player.onBump = b => { if (!this._bumpT || this.G.t - this._bumpT > 1) { this._bumpT = this.G.t; play('click', { vol: 0.25, rate: 0.6 }); } };
    sc.add(this.G.camera);
    this.it = new Interactor(this.G.camera); this.it.blockers = block;
    for (const p of this.pcs) this.it.add(p.pc, () => this.pcLabel(p.n), () => this.usePC(p.n));
    this.it.add(tpc, "Teacher's computer: settings, save code, credits", () => this.teacherMenu());
    this.it.add(rdoor, () => keyOK('rogue') ? 'Lépcsőház (13+): go to your flat' : 'Lépcsőház (13+): locked. Type the code from your teacher.', () => this.useRogue());
    this.it.add(door, () => this.day ? 'Step outside' : 'Leave the lab (title screen)', () => this.day ? this.outside() : this.quit());
  }
  pcLabel(n) {
    const e = epInfo(n), p = epPos(n);
    if (!orderOK(n)) return `Computer ${p}: no power. Finish episode ${p - 1} first.`;
    if (!keyOK(n)) return `Episode ${p}: "${e.title}" is locked. Type today's code from your teacher.`;
    if (!BUILT[n]) return `Episode ${p}: "${e.title}" (${e.en}) arrives in a later lesson.`;
    return (isDone(n) ? 'Replay' : 'Play') + ` episode ${p}: "${e.title}" (${e.en})`;
  }
  refreshScreens() { for (const p of this.pcs) this.drawScreen(p, 0); }
  drawScreen(p, t) {
    const c = p.st.userData.g, w = 64, h = 48, n = p.n, e = epInfo(n), pn = p.pos;
    const playable = isUnlocked(n) && BUILT[n] && !isDone(n);
    if (orderOK(n) && !keyOK(n)) { c.fillStyle = '#1c0a0c'; c.fillRect(0, 0, w, h); c.fillStyle = '#ff8a7a'; c.font = '16px m5x7'; c.textBaseline = 'top'; c.fillText('EP ' + pn, 4, 4); c.fillText('LOCKED', 4, 18); c.fillStyle = '#a86a62'; c.fillText('CODE?', 4, 31); p.glow.intensity = 0.5; p.glow.color.set(0xff6a5a); }
    else if (!isUnlocked(n)) { c.fillStyle = '#050607'; c.fillRect(0, 0, w, h); c.fillStyle = 'rgba(120,140,160,.08)'; c.fillRect(6, 4, 20, 10); p.glow.intensity = 0; }
    else if (!BUILT[n]) { c.fillStyle = '#1a1406'; c.fillRect(0, 0, w, h); c.fillStyle = '#e8b04a'; c.font = '16px m5x7'; c.textBaseline = 'top'; c.fillText('EP ' + pn, 4, 4); c.fillText('SOON', 4, 20); p.glow.intensity = 0.3; p.glow.color.set(0xe8b04a); }
    else if (isDone(n)) { c.fillStyle = '#062016'; c.fillRect(0, 0, w, h); c.fillStyle = '#8fe3c9'; c.font = '16px m5x7'; c.textBaseline = 'top'; c.fillText('EP ' + pn + ' OK', 4, 4); pxText(c, e.title.split(' ')[0], 4, 18); pxText(c, e.title.split(' ').slice(1).join(' '), 4, 30); p.glow.intensity = 0.8; p.glow.color.set(0x8fe3c9); }
    else if (playable) {
      // a CRT waking up: dark blue, a slow rolling bar, faint scanlines, the episode name
      c.fillStyle = '#071226'; c.fillRect(0, 0, w, h);
      const bar = ((t * 14) % (h + 16)) - 8; const gr = c.createLinearGradient(0, bar - 8, 0, bar + 8);
      gr.addColorStop(0, 'rgba(120,170,255,0)'); gr.addColorStop(0.5, 'rgba(120,170,255,.22)'); gr.addColorStop(1, 'rgba(120,170,255,0)'); c.fillStyle = gr; c.fillRect(0, bar - 8, w, 16);
      c.fillStyle = 'rgba(0,0,0,.35)'; for (let y = 0; y < h; y += 2) c.fillRect(0, y, w, 1);
      c.font = '16px m5x7'; c.textBaseline = 'top'; c.fillStyle = '#9fd8ff'; c.fillText('EP ' + pn, 4, 3);
      pxText(c, e.title.split(' ')[0], 4, 17); if (e.title.includes(' ')) pxText(c, e.title.split(' ').slice(1).join(' '), 4, 29);
      if (Math.sin(t * 3) > 0) { c.fillStyle = '#ffd27a'; c.fillRect(54, 38, 6, 6); }
      p.glow.intensity = 1.5 + Math.sin(t * 2) * 0.25; p.glow.color.set(0x9fd8ff);
    }
    p.st.needsUpdate = true;
  }
  enter() {
    music('mus_hub', 0.45);
    loop('hum', 'hum', { vol: 0.12 });
    if (this.titleMode) { hud(false); this.camT = 0; }
    else this.startPlaying();
  }
  startPlaying() {
    this.titleMode = false; this.playing = true;
    const back = this.G.returnFrom;
    if (back) { const p = this.pcs.find(q => q.n === back); this.player.set(p.x - 0.2, p.z + 1.4, 0); this.G.returnFrom = null; }
    else this.player.set(5.3, 3.6, 0);
    hud(true); hudParts({ checklist: false, status: false });
    objective(this.day ? 'Morning. Every screen is green: replay any episode you like.' : 'Find the computer that is switched on.');
    caption('Click the screen to look around with the mouse. W A S D to walk, E to use.', 'say', 7);
    this.refreshScreens();
  }
  usePC(n) {
    const p = epPos(n);
    if (!orderOK(n)) { play('denied', { vol: 0.4 }); caption(`It won't turn on. Finish episode ${p - 1} first.`, 'say', 3); return; }
    if (!keyOK(n)) { this.codeDialog(n); return; }
    if (!BUILT[n]) { play('denied', { vol: 0.4 }); caption(`Episode ${p} is not installed yet. It arrives in a later lesson.`, 'say', 4); return; }
    this.playing = false; play('tvon', { vol: 0.6 }); this.G.unlock();
    fade(true, '', 0.8).then(() => { this.G.returnFrom = n; this.G.goEpisode(n).then(() => fade(false, '', 0.8)); });
  }
  useRogue() {
    if (!keyOK('rogue')) { this.rogueDialog(); return; }
    this.playing = false; play('door_open', { vol: 0.5 }); this.G.unlock();
    fade(true, '', 0.8).then(() => this.G.goRogue().then(() => fade(false, '', 0.6)));
  }
  rogueDialog() {
    this.playing = false; this.G.unlock(); play('denied', { vol: 0.3 });
    const el = openScreen(`<div class="panel" style="width:min(480px,92vw);text-align:center"><h2 style="margin-top:0">Lépcsőház (13+)</h2>
      <p>A separate, harder game: your own flat in a panel block, and the stairwell at night. Your teacher opens it with a code (kód).</p>
      <input type="text" id="k" autocomplete="off" spellcheck="false" style="text-align:center;letter-spacing:.12em;text-transform:uppercase">
      <p class="sub" id="m" style="min-height:1.3em"></p>
      <div class="btns" style="justify-content:center"><button class="btn primary" id="ok">Unlock</button><button class="btn" id="x">Not now</button></div></div>`);
    const inp = el.querySelector('#k'); setTimeout(() => inp.focus(), 50);
    const close = () => { closeScreen(el); this.playing = true; };
    const go = () => {
      const r = tryCode('rogue', inp.value);
      if (!r) { play('denied', { vol: 0.4 }); el.querySelector('#m').textContent = "That's not the code."; inp.select(); return; }
      play('click', { vol: 0.5 }); closeScreen(el); this.useRogue();
    };
    el.querySelector('#ok').onclick = go; el.querySelector('#x').onclick = close;
    inp.addEventListener('keydown', ev => { ev.stopPropagation(); if (ev.key === 'Enter') go(); if (ev.key === 'Escape') close(); });
  }
  codeDialog(n, teacher) {
    const e = epInfo(n), p = epPos(n);
    this.playing = false; this.G.unlock(); play('denied', { vol: 0.3 });
    const el = openScreen(`<div class="panel" style="width:min(480px,92vw);text-align:center"><h2 style="margin-top:0">${teacher ? 'Teacher key' : `Episode ${p} is locked`}</h2>
      <p>${teacher ? 'The teacher key opens every episode for this nickname. Use a teacher nickname, not a student\'s.' : `"${e.title}" (${e.en}) opens in class. Type today's code (kód) from your teacher.`}</p>
      <input type="text" id="k" autocomplete="off" spellcheck="false" style="text-align:center;letter-spacing:.12em;text-transform:uppercase">
      <p class="sub" id="m" style="min-height:1.3em"></p>
      <div class="btns" style="justify-content:center"><button class="btn primary" id="ok">Unlock</button><button class="btn" id="x">Not now</button></div></div>`);
    const inp = el.querySelector('#k'); setTimeout(() => inp.focus(), 50);
    const close = () => { closeScreen(el); this.playing = true; this.refreshScreens(); };
    const go = () => {
      const r = tryCode(n, inp.value);
      if (!r) { play('denied', { vol: 0.4 }); el.querySelector('#m').textContent = "That's not the code. Check the spelling with your teacher."; inp.select(); return; }
      play('click', { vol: 0.5 }); closeScreen(el); this.refreshScreens();
      caption(r === 'teacher' ? 'Teacher mode: every episode is open on this nickname.' : `Episode ${p} unlocked.`, 'say', 4);
      if (teacher) { this.playing = true; return; }
      this.usePC(n);
    };
    el.querySelector('#ok').onclick = go; el.querySelector('#x').onclick = close;
    inp.addEventListener('keydown', ev => { ev.stopPropagation(); if (ev.key === 'Enter') go(); if (ev.key === 'Escape') close(); });
  }
  teacherMenu() {
    this.G.unlock();
    const el = openScreen(`<div class="panel" style="width:min(560px,94vw);text-align:center"><h2>Teacher's computer</h2>
      <p class="sub">Player: <b>${(S.nick || '').replace(/</g, '')}</b></p>
      <div class="btns" style="flex-direction:column;align-items:stretch">
      <button class="btn" id="s">Settings</button><button class="btn" id="c">Show my save code</button><button class="btn" id="l">Load a save code</button>
      ${LOCKS_ON ? '<button class="btn" id="tk">Teacher key (open all episodes)</button>' : ''}<button class="btn" id="cr">Credits</button><button class="btn primary" id="x" autofocus>Close</button></div></div>`);
    el.querySelector('#s').onclick = () => settingsScreen();
    el.querySelector('#c').onclick = () => exportScreen();
    el.querySelector('#l').onclick = () => importScreen(() => { closeScreen(el); this.refreshScreens(); });
    el.querySelector('#cr').onclick = () => creditsScreen();
    if (LOCKS_ON) el.querySelector('#tk').onclick = () => { closeScreen(el); this.codeDialog(EPISODES[EPISODES.length - 1].id, true); };
    el.querySelector('#x').onclick = () => { closeScreen(el); };
  }
  quit() { persist(); this.G.unlock(); location.reload(); }
  resume() { lockPointer(); }
  update(dt, t) {
    for (const L of this.lamps) L.update(t);
    this._st = (this._st || 0) + dt; if (this._st > 0.08) { this._st = 0; for (const p of this.pcs) if (isUnlocked(p.n) && BUILT[p.n] && !isDone(p.n)) this.drawScreen(p, t); }
    if (this.titleMode || !this.playing) { this.idle(dt, t); return; }
    this.player.update(dt);
    const cur = this.it.update();
    prompt(cur ? this.it.label() : null);
    if (cur && wasPressed('KeyE')) cur.use();
  }
  idle(dt, t) {
    if (this.titleMode) {
      const a = t * 0.05; const cam = this.G.camera;
      cam.position.set(Math.sin(a) * 2.5 + 1, 1.7, 3.6 + Math.cos(a) * 0.5); cam.lookAt(-1, 1.2, -1);
    }
  }
  exit() { this.playing = false; prompt(null); }
}
