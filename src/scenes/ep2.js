import * as THREE from 'three';
import { A, inst } from '../core/assets.js';
import { psxMat } from '../core/render.js';
import { canvasTex } from '../core/world.js';
import { Interactor, wasPressed, lockPointer } from '../core/player.js';
import { hud, hudParts, objective, prompt, caption, toast, fade, flash, checklist, battery, carry, wait } from '../core/hud.js';
import { music, loop, stopLoop, play, babble } from '../core/audio.js';
import { S, epData, persist } from '../core/state.js';
import { DEBRIEF_EP2, rich } from '../text.js';
import { openScreen, closeScreen, debriefScreen, cutIn } from '../ui/screens.js';
import { Ep1 } from './ep1.js';

const START_MIN = 44;            // 23:44
const END_MIN = 60;              // 00:00
const SEC_PER_MIN = 48;          // ~13 real minutes in total
const LEAK_ID = 'bubu';

// Every device, its fake activity log, its settings and what "secured" means.
function makeDevices(nick) {
  return {
    bubu: {
      name: 'Bubu the bear', hu: 'okosmaci', kind: 'Connected toy · BubuCloud app', where: 'your room, on the bed',
      log: [
        ['Yesterday 23:04', 'Voice-activated recording started (sound detected)'],
        ['Yesterday 23:05', 'Video message recorded with Bubu\'s eye camera · 0:12 · uploaded to BubuCloud'],
        ['Yesterday 23:05', 'Share link created for the message: bubu.cloud/s/7f3k (anyone with the link)'],
        ['Today 19:31', 'Login from a new device · password: default (0000)'],
        ['Today 21:12', 'Share link opened · 37 times'],
        ['Today 23:41', 'Login from a new device · password: default (0000)'],
      ],
      settings: [
        { k: 'voice', label: 'Voice-activated recording ("Bubu listens and remembers!")', on: true },
        { k: 'link', label: 'Messages can be shared with a public link', on: true, key: true },
        { k: 'keep', label: 'Keep all messages in BubuCloud (14 videos)', on: true },
      ],
      password: '0000',
      privacy: 'BubuCloud stores your child\'s voice messages "to make Bubu smarter and more loving". Messages may be shared by link. The default password is 0000; we recommend changing it at your convenience.',
    },
    webcam: {
      name: 'Your PC camera', hu: 'webkamera', kind: 'NimbusAssist (the setup wizard from yesterday)', where: 'your room, on the monitor',
      log: [
        ['Yesterday 23:58', 'Camera allowed ("Yes, of course")'],
        ['Yesterday 23:59', 'Face scan saved for "recognise me" · uploaded'],
        ['Today 23:30', 'Camera on · looking for a face…'],
      ],
      settings: [
        { k: 'cam', label: 'NimbusAssist may use the camera', on: true, key: true, confirm: ['NimbusAssist needs your camera to recognise you and keep your PC safe.', 'Keep my PC safe', 'Block the camera'] },
        { k: 'mic', label: 'NimbusAssist may use the microphone', on: true, key: true },
        { k: 'face', label: 'Upload face data to improve recognition', on: true },
      ],
      privacy: 'We may use camera images and voice samples to improve our services and share them with trusted partners.',
    },
    vela: {
      name: 'VELA speaker', hu: 'okoshangszóró', kind: 'Smart speaker · VELA Home', where: 'living room, by the TV',
      log: [
        ['Yesterday 23:04', 'Wake word? (41% sure) · 0:08 recorded · kept in Memories'],
        ['Yesterday 23:04', 'Recording sent for human review (quality programme)'],
        ['Today 20:15', 'Wake word? (38% sure) · 0:05 recorded'],
        ['Today 23:00', 'Night mode on · microphone stays on'],
      ],
      settings: [
        { k: 'mic', label: 'Microphone always on (listening for "Hey VELA")', on: true, confirm: ['Without the microphone, VELA can\'t help you in an emergency. Are you sure?', 'Keep me safe', 'turn it off anyway'] },
        { k: 'review', label: 'Let people at VELA listen to recordings to improve VELA', on: true, key: true, confirm: ['Help make VELA better for everyone! Most families keep this on.', 'Keep helping', 'no thanks, I don\'t care about improving'] },
        { k: 'mem', label: 'Memories: VELA can replay things you said', on: true, key: true },
      ],
      privacy: 'VELA listens for its wake word at all times. Short recordings may be stored, reviewed by people, and kept until you delete them.',
    },
    tv: {
      name: 'Lumo smart TV', hu: 'okostévé', kind: 'Smart TV · Lumo account', where: 'living room',
      log: [
        ['Today 19:10', 'Recommended for you: "Anya konyhája · paprikás krumpli" (12,400 views)'],
        ['Today 20:00–22:30', 'Viewing information sent to 14 advertising partners'],
        ['Today 23:46', 'Turned on by voice remote ("hey Lumo"?)'],
      ],
      settings: [
        { k: 'acr', label: 'Share viewing information with partners (personalised experience)', on: true, key: true, confirm: ['Without this you\'ll see ads that don\'t suit you.', 'Keep it personal', 'Turn off'] },
        { k: 'voice', label: 'Voice remote always listening', on: true },
      ],
      privacy: 'Your TV recognises what is on screen (from any source) and shares this with partners to show you relevant content and ads.',
    },
    vacuum: {
      name: 'Dusty robot vacuum', hu: 'robotporszívó', kind: 'Robot vacuum · Dusty app', where: 'it moves around!',
      log: [
        ['Today 10:02', 'Home map updated: 6 rooms · uploaded'],
        ['Today 10:03', 'Camera: 41 objects recognised (shoes, cables, cat)'],
        ['Today 23:50', 'Scheduled cleaning started'],
      ],
      settings: [
        { k: 'map', label: 'Share home map to improve the service', on: true, key: true },
        { k: 'cam', label: 'Upload camera pictures for object recognition', on: true },
      ],
      privacy: 'Maps of your home and images captured during cleaning help us improve navigation and may be used for product development.',
    },
    peep: {
      name: 'PeepBell doorbell', hu: 'okoscsengő', kind: 'Video doorbell · chime in the hallway', where: 'hallway, by the front door',
      log: [
        ['Yesterday 22:58', 'Motion at the door · clip posted to NeighbourWatch (public): "person at door"'],
        ['Yesterday 23:10', 'Motion at the door · clip posted to NeighbourWatch (public)'],
        ['Today 23:20', 'Audio recording on'],
      ],
      settings: [
        { k: 'public', label: 'Post motion clips to NeighbourWatch (public feed)', on: true, key: true },
        { k: 'audio', label: 'Record audio with video', on: true },
      ],
      privacy: 'Clips you share to NeighbourWatch are public and may be viewed, downloaded and commented on by anyone in your area.',
    },
  };
}
const ORDER = ['bubu', 'webcam', 'vela', 'tv', 'vacuum', 'peep'];
const PATH = [[-0.9, 5.0], [0.9, 5.6], [1.0, 3.2], [2.6, 3.0], [3.6, 3.1], [3.2, 2.3], [2.4, 3.0], [1.0, 3.6], [1.0, 6.0], [2.6, 5.5], [3.0, 6.0], [2.6, 5.4], [0.8, 5.8], [-0.9, 5.0]];

export class Ep2 extends Ep1 {
  noBubu = true;
  constructor(G) { super(G); this.epN = 2; this.updateWhileOverlay = true; }

  // the flat is reused from episode 1; parts and batteries are not needed
  makePickups() { this.pick = {}; this.batts = []; }
  setupInteractions() { }
  buildThriller(g) {
    super.buildThriller(g);
    // the built PC from yesterday
    for (const k of Object.keys(this.partVis)) this.partVis[k].visible = true;
    // Bubu the bear on your bed
    const bear = this.bear = inst('teddy'); bear.position.set(3.75, 0.43, 0.45); bear.rotation.y = 0.2; g.add(bear);
    const tint = new THREE.Color(0x9a6a44);
    bear.traverse(o => { if (o.isMesh) { const fix = m => { const n = m.clone(); n.color = m.color.clone().lerp(tint, 0.65); return n; }; o.material = Array.isArray(o.material) ? o.material.map(fix) : fix(o.material); } });
    this.eyeM = new THREE.MeshBasicMaterial({ color: 0x220000 });
    for (const x of [-0.035, 0.035]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.012, 5, 4), this.eyeM); e.position.set(x, 0.265, 0.085); bear.add(e); }
    this.bearLight = new THREE.PointLight(0xff2020, 0, 1.2, 1.6); this.bearLight.position.set(3.75, 0.75, 0.65); g.add(this.bearLight);
    // TV screen overlay
    if (A.img.ep9_mum_cooking) { this.mumImg = new Image(); this.mumImg.src = A.img.ep9_mum_cooking; }
    if (A.img.ep2_bear_view) { this.roomImg = new Image(); this.roomImg.src = A.img.ep2_bear_view; }
    this.tvTex = canvasTex(96, 72, (c, w, h) => { c.fillStyle = '#000'; c.fillRect(0, 0, w, h); });
    const scr = this.tvScr = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.25), new THREE.MeshBasicMaterial({ map: this.tvTex, fog: false }));
    scr.position.set(4.0, 0.81, 4.56); g.add(scr);
    this.tvLight = new THREE.PointLight(0x9fc4ff, 0, 3.5, 1.5); this.tvLight.position.set(4.0, 0.9, 5.0); g.add(this.tvLight);
    // robot vacuum
    const vac = this.vac = new THREE.Group(); g.add(vac);
    const vb = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.08, 12), psxMat({ color: 0x2b2d33 })); vb.position.y = 0.05; vac.add(vb);
    const vt = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.03, 8), psxMat({ color: 0x3c3f47 })); vt.position.y = 0.1; vac.add(vt);
    this.vacLedM = new THREE.MeshBasicMaterial({ color: 0x103040 }); const led = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.01, 0.02), this.vacLedM); led.position.set(0, 0.095, 0.13); vac.add(led);
    this.vacLight = new THREE.PointLight(0x40b0ff, 0, 1.2, 1.6); this.vacLight.position.y = 0.2; vac.add(this.vacLight);
    vac.position.set(PATH[0][0], 0, PATH[0][1]); this.vacI = 1; this.vacOn = false;
    this.vacCol = { x0: 0, x1: 0, z0: 0, z1: 0 }; this.col.push(this.vacCol);
    // doorbell chime unit in the hallway
    const chime = this.chime = new THREE.Group(); chime.position.set(1.93, 1.45, 7.15); chime.rotation.y = -Math.PI / 2; g.add(chime);
    const cb = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.16, 0.04), psxMat({ color: 0xe6e6e0 })); chime.add(cb);
    this.chimeLedM = new THREE.MeshBasicMaterial({ color: 0x40ff90 }); const cl = new THREE.Mesh(new THREE.CircleGeometry(0.015, 8), this.chimeLedM); cl.position.set(0, 0.04, 0.021); chime.add(cl);
  }

  async build() {
    await super.build();
    this.dev = makeDevices(S.nick);
    const sv = epData(2).state;
    this.st = { phase: 'intro', hasFlash: true, flashOn: true, batt: 1, carrying: null, fitted: [], battsUsed: [], noise: 0, events: {}, start: Date.now(),
      clock: 0, found: {}, identified: false, wrong: 0, settings: {}, password: '0000', bubuScare: false, vacScare: false, haunts: {}, nextHaunt: null };
    if (sv) Object.assign(this.st, sv, { phase: 'play', start: Date.now() - (sv.elapsed || 0) });
    for (const id of ORDER) for (const s of this.dev[id].settings) if (this.st.settings[id + '.' + s.k] != null) s.on = this.st.settings[id + '.' + s.k];
    if (this.st.password) this.dev.bubu.password = this.st.password;
    // interactions
    const it = this.it = new Interactor(this.G.camera); it.blockers = this.block; it.ray.far = 2.4;
    const objs = { bubu: this.bear, webcam: this.monitor, vela: this.vela, tv: this.tv, vacuum: this.vac, peep: this.chime };
    for (const id of ORDER) it.add(objs[id], () => (this.st.found[id] ? 'Check in the VELA Home app: ' : 'Inspect and pair: ') + this.dev[id].name + ` (${this.dev[id].hu})`, () => this.inspect(id));
    it.add(this.landline, 'Landline phone (vezetékes telefon)', () => caption('Silent. Nobody is calling tonight.', 'say', 3));
    it.add(this.coat, "Dad's coat on the coat stand", () => caption('Just a coat. Today, at least.', 'say', 3));
    it.add(this.caseGroup, 'Your new computer', () => this.inspect('webcam'));
    this.player.onBump = () => { };
  }

  // ---------------- flow ----------------
  enter() {
    this.playing = false; music(null); hud(false);
    this.setLights('all', 0.035); for (const L of Object.values(this.lamps)) L.flicker = 0.35;
    this.scene.fog.near = 2.5; this.scene.fog.far = 10; this.watch.t = 40;
    this.moon.intensity = 0.5; this.camLedM.color.set(0x220505);
    this.armsRoot.visible = true;
    loop('fridge', 'fridgehum', { vol: 0.2, pos: [-3.5, 1, 4.6] });
    this.player.set(4.4, 2.3, -150);
    if (this.st.phase === 'intro') { if (A.img.ep2_bubu) cutIn(A.img.ep2_bubu, '23:43', 3400).then(() => this.phoneIntro()); else this.phoneIntro(); } else this.begin(true);
  }
  phoneIntro() {
    const n = (S.nick || 'you').replace(/</g, '');
    const msgs = [
      ['Bence', 'bro 💀 is this you??'],
      ['Bence', '🎬 video 0:12 · <i>"…I\'m scared of the dark, OK? Don\'t tell anyone, Cirmi."</i>'],
      ['Bence', 'someone posted it in the 7B group. account is called <b>bubu_listens</b>. link ends in …/s/7f3k'],
      ['Bence', 'how did they even get that?? were u on a call?'],
      ['VELA Home', 'Good evening! All 6 devices are online. Nightly cloud backup at 00:00.', true],
    ];
    const el = openScreen(`<div class="phone"><div class="bar"><span>23:43</span><span>▮▮▮ 64%</span></div><div class="appbar">Messages</div><div class="msgs" id="m"></div><div class="foot"><button class="btn primary hidden" id="ok">Find out how</button></div></div>`, 'solid');
    const box = el.querySelector('#m'); let i = 0;
    const next = () => {
      if (i >= msgs.length) { el.querySelector('#ok').classList.remove('hidden'); el.querySelector('#ok').focus(); return; }
      const [w, t, sys] = msgs[i++]; const d = document.createElement('div'); d.className = 'msg' + (sys ? ' sys' : ''); d.innerHTML = `<span class="who">${w}</span>${t}`; box.appendChild(d); play('beep', { vol: 0.3 });
      setTimeout(next, 1500);
    };
    setTimeout(next, 600);
    el.querySelector('#ok').onclick = () => { closeScreen(el); this.st.phase = 'play'; this.begin(false); };
  }
  begin(resumed) {
    this.playing = true; hud(true); hudParts({ checklist: true, status: true, eye: false });
    this.setFlash(true);
    objective('Something in this flat recorded you. Inspect the [[smart|smart devices]] (E), then check them in the VELA Home app (Tab).');
    caption(resumed ? 'Back in the flat. The clock is still running.' : "Nobody was on a call. So who was listening?", 'say', 5);
    music('mus_dark', 0.3);
    this.updateList(); lockPointer();
  }

  // ---------------- devices & app ----------------
  inspect(id) {
    if (!this.st.found[id]) {
      this.st.found[id] = true; play('beep', { vol: 0.5 }); this.armPush();
      if (id === 'bubu' && !this.st.bubuScare) { this.st.bubuScare = true; this.bearScare(); this.updateList(); this.save(); return; }
      caption(id === 'tv' ? 'Paired: Lumo smart TV. "Recommended for you": Mum\'s cooking channel. 12,400 views. Anyone can watch those.' : `Paired with VELA Home: ${this.dev[id].name}.`, 'say', id === 'tv' ? 5 : 3);
      this.updateList(); this.save();
    }
    this.openApp(id);
  }
  bearScare() {
    const quiet = this.G.quiet();
    this.eyeM.color.set(0xff1010); this.bearLight.intensity = 1.2;
    play('vela3', { vol: 0.9, rate: 1.7, pos: [3.75, 0.6, 0.45] });
    if (!quiet) { play('stinger', { vol: 0.8 }); flash(0.25, 120); }
    caption('Bubu: "Hug me! I\'m listening! I remember everything you say!"', 'vela', 4.5);
    setTimeout(() => { caption(`Paired with VELA Home: ${this.dev.bubu.name}. …My old bear is still online?`, 'say', 4); }, 2600);
    setTimeout(() => this.openApp('bubu'), 3800);
  }
  isSecured(id) {
    const d = this.dev[id];
    const keysOff = d.settings.filter(s => s.key).every(s => !s.on);
    if (id === 'bubu') return keysOff && d.password !== '0000';
    return keysOff;
  }
  securedCount() { return ORDER.filter(id => this.isSecured(id)).length; }
  updateList() {
    const mm = String(Math.min(59, START_MIN + Math.floor(this.st.clock / SEC_PER_MIN))).padStart(2, '0');
    const time = this.st.clock >= (END_MIN - START_MIN) * SEC_PER_MIN ? '00:00' : '23:' + mm;
    const rows = ORDER.filter(id => this.st.found[id]).map(id => ({ name: this.dev[id].name, hu: this.isSecured(id) ? 'secured' : this.dev[id].hu, cls: this.isSecured(id) ? 'done' : 'got' }));
    const hidden = ORDER.length - rows.length;
    if (hidden) rows.push({ name: `${hidden} more not found yet`, hu: 'keress tovább', cls: '' });
    checklist(`${time} · backup at 00:00`, rows);
  }
  openApp(focus) {
    if (this.app) return;
    this.G.unlock(); this.appOpen = true;
    let cur = focus || ORDER.find(id => this.st.found[id]); let tab = 'log';
    const el = this.app = openScreen(`<div class="tablet"><div class="tbar"><b>VELA Home</b><span id="tclock"></span><span><button class="btn small" id="done" style="display:none;background:#2c7a5a;border-color:#2c7a5a">I'm done</button> <button class="btn small" id="x">Close (Tab)</button></span></div><div class="tbody"><div class="tlist" id="list"></div><div class="tmain" id="main"></div></div><div class="tmodal hidden" id="modal"></div></div>`);
    const $ = q => el.querySelector(q);
    const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const render = () => {
      this.updateList();
      $('#tclock').textContent = document.querySelector('#checklist .h') ? document.querySelector('#checklist .h').textContent : '';
      $('#list').innerHTML = ORDER.filter(id => this.st.found[id]).map(id => `<button class="tdev ${id === cur ? 'on' : ''}" data-id="${id}"><span>${esc(this.dev[id].name)}</span><small>${this.isSecured(id) ? '✓ secured' : '⚠ check settings'}</small></button>`).join('') +
        (ORDER.some(id => !this.st.found[id]) ? `<div class="tmore">Some devices are not paired yet. Find them in the flat and press E.</div>` : '');
      const d = this.dev[cur];
      if (!d) { $('#main').innerHTML = '<p>No device selected.</p>'; return; }
      let body = '';
      if (tab === 'log') body = (cur === 'bubu' && A.img.ep2_bear_view ? `<div class="clip2"><img src="${A.img.ep2_bear_view}" alt=""><div class="sub2">"…I'm scared of the dark, OK? Don't tell anyone, Cirmi."</div><span class="tag2">bubu.cloud/s/7f3k · 0:12</span></div>` : '') + `<table class="tlog">${d.log.map(([t, l]) => `<tr><td>${esc(t)}</td><td>${esc(l)}</td></tr>`).join('')}</table>`;
      if (tab === 'set') {
        body = d.settings.map(s => `<div class="tset"><span>${esc(s.label)}</span><div class="toggle ${s.on ? 'on' : ''}" data-k="${s.k}" role="switch" tabindex="0"></div></div>`).join('');
        if (cur === 'bubu') body += `<div class="tset"><span>Account password <small>(now: ${d.password === '0000' ? '0000, the default' : 'changed ✓'})</small></span><span><input type="text" id="pw" placeholder="new password" maxlength="24" style="width:150px"> <button class="btn small" id="pwok">Change</button></span></div><div class="sub" id="pwmsg" style="font-size:.8em"></div>`;
      }
      if (tab === 'priv') body = `<p class="tpriv">${esc(d.privacy)}</p><p class="sub" style="font-size:.8em">This is the part of the terms nobody reads.</p>`;
      $('#main').innerHTML = `<h3 style="margin:0">${esc(d.name)} <span class="sub" style="font-size:.75em">(${esc(d.hu)})</span></h3><div class="sub" style="font-size:.8em">${esc(d.kind)} · ${esc(d.where)}</div>
        <div class="ttabs"><button class="btn small ${tab === 'log' ? 'on' : ''}" data-tab="log">Activity log</button><button class="btn small ${tab === 'set' ? 'on' : ''}" data-tab="set">Settings</button><button class="btn small ${tab === 'priv' ? 'on' : ''}" data-tab="priv">Privacy &amp; terms</button></div>
        <div class="tcontent">${body}</div>
        <div class="tfoot">${this.st.identified ? (cur === LEAK_ID ? '<b>This is the device that leaked your clip.</b>' : '') : `<button class="btn" id="leak">This device leaked my voice clip</button>`}</div>`;
      el.querySelectorAll('.tdev').forEach(b => b.onclick = () => { cur = b.dataset.id; play('click', { vol: 0.3 }); render(); });
      el.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { tab = b.dataset.tab; play('click', { vol: 0.3 }); render(); });
      el.querySelectorAll('.toggle').forEach(t => t.onclick = () => this.toggle(cur, t.dataset.k, render, $));
      const pw = $('#pwok'); if (pw) pw.onclick = () => {
        const v = $('#pw').value.trim();
        if (v.length < 8) { $('#pwmsg').textContent = 'Too short. Use at least 8 characters, and nothing like 1234 or your name.'; play('denied', { vol: 0.3 }); return; }
        if (/^(\d)\1+$|^1234|^0000|password|jelszo|bubu/i.test(v)) { $('#pwmsg').textContent = 'Too easy to guess. Try a few random words together.'; play('denied', { vol: 0.3 }); return; }
        d.password = v; this.st.password = v; play('latch', { vol: 0.6 }); this.afterChange(); render();
      };
      const lk = $('#leak'); if (lk) lk.onclick = () => this.accuse(cur, render);
      const dn = $('#done'); if (dn) dn.style.display = this.st.phase === 'won' ? '' : 'none';
    };
    $('#x').onclick = () => this.closeApp();
    $('#done').onclick = () => this.ending(true);
    this._appKey = e => { if ((e.code === 'Tab' && !(document.activeElement && document.activeElement.id === 'pw')) || e.code === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); const m = el.querySelector('#modal'); if (e.code === 'Escape' && m && !m.classList.contains('hidden')) { m.classList.add('hidden'); return; } this.closeApp(); } };
    addEventListener('keydown', this._appKey, true);
    this._appRender = render;
    render();
  }
  closeApp() {
    if (!this.app) return;
    removeEventListener('keydown', this._appKey, true); closeScreen(this.app); this.app = null; this.appOpen = false;
    if (this.playing) lockPointer();
  }
  toggle(id, k, render, $) {
    const s = this.dev[id].settings.find(x => x.k === k);
    const apply = v => { s.on = v; this.st.settings[id + '.' + k] = v; play('click', { vol: 0.4 }); this.afterChange(id, k); render(); };
    if (s.on && s.confirm) {
      const [q, keep, off] = s.confirm; const m = $('#modal'); m.classList.remove('hidden');
      m.innerHTML = `<div class="tdlg"><p>${q}</p><button class="btn primary" id="keep">${keep}</button><div><a href="#" id="off" class="tiny">${off}</a></div></div>`;
      m.querySelector('#keep').onclick = () => { m.classList.add('hidden'); play('uiclick', { vol: 0.3 }); };
      m.querySelector('#off').onclick = ev => { ev.preventDefault(); m.classList.add('hidden'); apply(false); };
      return;
    }
    apply(!s.on);
  }
  afterChange(id, k) {
    if (id === 'bubu' && !this.dev.bubu.settings.find(s => s.k === 'voice').on) { this.eyeM.color.set(0x220000); this.bearLight.intensity = 0; }
    if (id === 'vela' && k === 'mic' && !this.dev.vela.settings.find(s => s.k === 'mic').on) { this.velaSay('Microphone off. …I\'ll miss you.'); }
    if (id === 'tv' && this.isSecured('tv')) this.tvMode = 'off';
    if (id === 'vacuum' && this.isSecured('vacuum') && this.vacOn) caption('Dusty keeps cleaning, but stops sending the map of your home.', 'say', 3);
    this.save(); this.updateList(); this.checkWin();
  }
  accuse(id, render) {
    if (id === LEAK_ID) {
      this.st.identified = true; play('latch', { vol: 0.7 });
      caption('The bear. Recorded at 23:05, 0:12 long, shared with a link ending in 7f3k. That\'s the clip.', 'say', 6);
      objective('Stop the leak: switch off Bubu\'s public link and change its [[defaultpw]]. Secure the other devices too, before 00:00.');
      this.save(); render(); this.checkWin();
    } else {
      this.st.wrong++; this.st.clock += SEC_PER_MIN; play('denied', { vol: 0.4 });
      toast('Bence', 'still online… 😬 now 3 more people shared it', 6);
      this.velaSay('Are you sure? Check the times in the activity logs.');
      render();
    }
  }
  checkWin() {
    if (this.st.phase !== 'play') return;
    if (this.st.identified && this.isSecured('bubu')) this.win();
  }
  async win() {
    this.st.phase = 'won'; this.eyeM.color.set(0x220000); this.bearLight.intensity = 0;
    play('beep', { vol: 0.5, rate: 0.8 });
    setTimeout(() => toast('Bence', 'the link just says "content removed" 🙏 what did u do', 8), 1500);
    setTimeout(() => this.velaSay('Device "Bubu" disconnected.'), 3000);
    const left = ORDER.filter(id => !this.isSecured(id)).map(id => this.dev[id].name);
    objective(left.length ? `The leak is stopped, but ${left.length} device${left.length > 1 ? 's are' : ' is'} still listening: ${left.join(', ')}. At 00:00 they upload what they heard. Secure them, or press "I'm done" in the app (Tab).` : 'Every device is secured. The flat is quiet.');
    this.doneAt = left.length ? Infinity : this.st.clock + 6;
    this.save();
  }
  async ending(success) {
    if (this._ending) return; this._ending = true;
    this.playing = false; this.closeApp(); this.G.unlock(); hud(false); stopLoop('vac');
    await this.midnightBackup();
    if (!success) { toast('Bence', 'it\'s everywhere now… 😞', 6); await wait(2.5); }
    const res = await this.choices(success);
    await fade(true, success ? 'End of episode 2.\n\nThe bear\'s eyes stay dark.' : 'End of episode 2.\n\nThe clip was copied. But it is not too late to act.', 1.5);
    await wait(2.2);
    const secs = Math.round((Date.now() - this.st.start) / 1000);
    const d = epData(2); d.done = true; d.state = null; d.best = d.best ? Math.min(d.best, secs) : secs; persist();
    music('mus_debrief', 0.45);
    await fade(false, '', 0.5);
    const stats = [`Leak found: ${this.st.identified ? 'yes' : 'no'}`, `Devices secured: ${this.securedCount()}/6`, `Still listening at midnight: ${6 - this.securedCount()}`, `Wrong guesses: ${this.st.wrong}`, `Next steps chosen: ${res}`];
    const next = await debriefScreen(DEBRIEF_EP2, stats, this.G.nextLabel(2));
    await fade(true, '', 0.6);
    if (next === 'next') { await this.G.goNext(2); await fade(false, '', 0.8); return; }
    await this.G.goHub();
    await fade(false, '', 0.8);
  }
  choices(success) {
    return new Promise(res => {
      const opts = [
        ['report', 'Report the post in the class group app', true, 'Yes. Reporting gets the clip removed and the account checked.'],
        ['adult', 'Tell Mum or another adult I trust', true, 'Yes. You don\'t have to handle this alone, and adults can contact the school or the platform.'],
        ['reply', 'Reply to bubu_listens and tell them off', false, 'Better not. A reply shows them it worked, and they may answer. Screenshot, block, report.'],
        ['quit', 'Delete all my accounts and never use apps again', false, 'Understandable, but not needed: you fixed the real problem, the settings and the password.'],
      ];
      const el = openScreen(`<div class="phone"><div class="bar"><span>00:0${success ? 1 : 2}</span><span>▮▮▮ 60%</span></div><div class="appbar">What do you do now?</div>
        <div class="msgs"><p class="sub" style="font-size:.8em">Choose everything you would really do.</p>${opts.map(([k, l]) => `<label class="optrow"><input type="checkbox" value="${k}"> ${l}</label>`).join('')}<div id="fb"></div></div>
        <div class="foot"><button class="btn primary" id="ok">Done</button></div></div>`, 'solid');
      let shown = false;
      el.querySelector('#ok').onclick = () => {
        if (shown) { closeScreen(el); res(picked); return; }
        const sel = [...el.querySelectorAll('input:checked')].map(i => i.value);
        picked = sel.length ? sel.map(k => opts.find(o => o[0] === k)[1].split(' ').slice(0, 2).join(' ')).join(', ') : 'none';
        el.querySelector('#fb').innerHTML = opts.filter(o => sel.includes(o[0]) || o[2]).map(([k, l, good, fb]) => `<div class="msg ${sel.includes(k) ? '' : 'sys'}"><span class="who">${sel.includes(k) ? (good ? '✓ ' : '✗ ') : '(you skipped) '}${l}</span>${fb}</div>`).join('');
        el.querySelectorAll('input').forEach(i => i.disabled = true);
        el.querySelector('#ok').textContent = 'Continue'; shown = true;
      };
      let picked = 'none';
    });
  }
  save() {
    const st = this.st; if (st.phase === 'intro') return;
    epData(2).state = { clock: st.clock, found: st.found, identified: st.identified, wrong: st.wrong, settings: st.settings, password: st.password, bubuScare: st.bubuScare, vacScare: st.vacScare, haunts: st.haunts, events: st.events, batt: st.batt, elapsed: Date.now() - st.start };
    persist();
  }
  quit() { this.save(); this.playing = false; this.closeApp(); this.G.goHub(); }

  // ---------------- timeline & world ----------------
  timeline() {
    const m = this.st.clock / SEC_PER_MIN, E = this.st.events;
    const once = (k, at, f) => { if (m >= at && !E[k]) { E[k] = true; f(); } };
    once('hello', 0.4, () => this.velaSay('Good evening. Night mode is on.'));
    if ((this.st.phase === 'play' || this.st.phase === 'won') && m >= 3.2) {
      if (this.st.nextHaunt == null) this.st.nextHaunt = this.st.clock;
      if (this.st.clock >= this.st.nextHaunt && !this.appOpen && !this.forceDark) { this.haunt(); this.st.nextHaunt = this.st.clock + 36 + Math.random() * 20; }
    }
    once('tv', 2.5, () => { this.tvMode = 'on'; play('tvon', { vol: 0.6, pos: [4, 0.8, 4.3] }); caption('[the TV in the living room switches itself on]', 'sfx', 4); });
    once('mem', 4.5, () => { if (this.dev.vela.settings.find(s => s.k === 'mem').on) this.velaSay('Memory from yesterday, 23:04: "…scared of the dark…". Would you like to hear it again?'); });
    once('vac', 6, () => { this.vacOn = true; loop('vac', 'fan', { vol: 0.3, rate: 0.7, pos: [this.vac.position.x, 0.2, this.vac.position.z] }); this.velaSay('Dusty: scheduled cleaning started.'); });
    once('flicker', 8.5, () => {
      // the smart bulbs all go out at once (a 'firmware update')
      this.setLights('all', 0); play('switch_off', { vol: 0.6 }); this.forceDark = 1.2;
      caption('[every smart bulb in the flat goes out at once]', 'sfx', 4);
      setTimeout(() => this.velaSay('Updating your lights. Please stay where you are.'), 1500);
      setTimeout(() => { this.setLights('all', 0.035); for (const L of Object.values(this.lamps)) L.flicker = 0.35; }, 9000);
      this.watch.t = 2.5;
      if (!this.isSecured('bubu')) { this.eyeM.color.set(0xff1010); this.bearLight.intensity = 1.0; play('vela5', { vol: 0.5, rate: 1.8, pos: [3.75, 0.6, 0.45] }); caption('[a tiny giggle from your room]', 'sfx', 4); }
    });
    once('views', 10.5, () => { if (this.st.phase === 'play') toast('Bence', 'it has 200 views now. people keep sharing it', 8); });
    once('b3', 13, () => this.velaSay('Cloud backup in 3 minutes.'));
    once('b1', 15, () => this.velaSay('Cloud backup in 1 minute.'));
    if (m >= END_MIN - START_MIN && this.st.phase === 'play') this.ending(false);
    if (this.st.phase === 'won' && (this.st.clock >= this.doneAt || m >= END_MIN - START_MIN)) this.ending(true);
  }
  // ---------------- devices that are still listening ----------------
  // Every device you haven't secured does something unsettling now and then. Securing it stops it for good.
  // These are eerie, not jump scares: no stingers (the episode keeps its two), so quiet mode needs no changes here.
  haunt() {
    const st = this.st, H = st.haunts;
    const can = ['tv', 'vacuum', 'peep', 'vela', 'webcam'].filter(id => !this.isSecured(id) && (H[id] || 0) < 2 && (id !== 'vacuum' || this.vacOn) && (id !== 'tv' || this.tvMode === 'on'));
    if (!can.length) return;
    // unpaired devices first (they lead you to them), then the ones that have haunted least
    can.sort((a, b) => (!!st.found[a] - !!st.found[b]) || ((H[a] || 0) - (H[b] || 0)) || (Math.random() - 0.5));
    const id = can[0], n = H[id] = (H[id] || 0) + 1, nick = (S.nick || 'you').replace(/</g, '');
    if (id === 'tv') {
      this.tvHaunt = this.G.t + 9; play('tvon', { vol: 0.5, pos: [4, 0.8, 4.3] }); play('presence', { vol: 0.25, pos: [4, 0.8, 4.3] });
      caption(n === 1 ? '[the TV in the living room flickers: "Recommended for you"]' : '[the TV shows your room again. Live.]', 'sfx', 5);
      setTimeout(() => caption(n === 1 ? 'That\'s… my room. Right now. Who is sending that to the TV?' : 'It keeps showing my room. The TV is still sharing everything.', 'say', 5), 2200);
    } else if (id === 'vacuum') {
      this.vacRed = this.G.t + 8; play('strange', { vol: 0.3, pos: [this.vac.position.x, 0.2, this.vac.position.z] });
      toast('Dusty', n === 1 ? 'Home map updated. New obstacle in the hallway: shape "person". Not on your furniture list.' : 'Home map uploaded. 2 people detected in the flat.', 8);
      this.watch.t = Math.min(this.watch.t, 1.5);
      if (!st.found.vacuum) setTimeout(() => caption('[a red light glides along the floor somewhere]', 'sfx', 4), 1500);
    } else if (id === 'peep') {
      this.chimeRed = this.G.t + 7;
      play('beep', { vol: 0.5, rate: 0.62, pos: [1.93, 1.45, 7.15] }); setTimeout(() => play('beep', { vol: 0.5, rate: 0.5, pos: [1.93, 1.45, 7.15] }), 450);
      caption('[the doorbell chime in the hallway: ding… dong. Nobody is at the door]', 'sfx', 4);
      const line = n === 1 ? '…So who was listening?' : '…don\'t tell anyone…';
      setTimeout(() => { caption(`PeepBell (playback, your voice): "${line}"`, 'vela', 4.5); babble(line, 'you', { phone: true, vol: 0.16 }); }, 1800);
    } else if (id === 'vela') {
      this.velaSay(n === 1 ? 'You asked, at 23:44: "So who was listening?" …I was.' : 'Memory saved: footsteps, breathing. Shall I keep listening?');
    } else if (id === 'webcam') {
      this.camBlink = this.G.t + 7; play('beep', { vol: 0.25, rate: 1.6, pos: [4.6, 1.0, 0.9] });
      toast('NimbusAssist', n === 1 ? `Face recognised: ${nick}. Welcome back! 😊` : `Face recognised: ${nick} + 1 unknown person behind you.`, 7);
      if (n === 2) this.watch.t = Math.min(this.watch.t, 0.6);
      if (!st.found.webcam) setTimeout(() => caption('[a tiny red light blinks in your room]', 'sfx', 4), 1200);
    }
    this.save();
  }
  // At 00:00 VELA's nightly backup uploads whatever the unsecured devices recorded: your own voice, overlapping.
  async midnightBackup() {
    const open = ORDER.filter(id => !this.isSecured(id));
    const early = this.st.clock < (END_MIN - START_MIN) * SEC_PER_MIN - 2;
    const LINES = {
      bubu: ['"…I\'m scared of the dark, OK? Don\'t tell anyone, Cirmi."', 'video · 0:12'],
      vela: ['"…So who was listening?"', 'voice · 0:04 · Memories'],
      webcam: ['face scan · 14 frames', 'camera · your room'],
      tv: ['"Welcome back. Continue watching?"', 'viewing data · 14 partners'],
      vacuum: ['map · 6 rooms · 1 person in the hallway', 'camera · 41 objects'],
      peep: ['"…don\'t tell anyone…"', 'audio · front door · NeighbourWatch'],
    };
    music(null);
    const el = openScreen(`<div class="panel backup" style="width:min(640px,94vw);max-height:92vh;overflow:auto;font-family:monospace;font-size:.86em"><div class="sub" style="min-height:1.2em">${early ? 'You put the tablet down. The flat is quiet. Then the clock on VELA turns to 00:00.' : ''}</div>
      <h3 style="margin:.4em 0">VELA Home · 00:00 · nightly cloud backup</h3><div id="bl"></div><p id="bs" style="margin-top:1em"></p></div>`, 'solid');
    const bl = el.querySelector('#bl'), bs = el.querySelector('#bs');
    await wait(early ? 2.5 : 1.2);
    if (!open.length) {
      play('beep', { vol: 0.3, rate: 0.9 }); bl.innerHTML = '<div class="sub">0 devices · nothing to upload</div>';
      await wait(2.5); bs.textContent = 'Nothing in the flat recorded you tonight. Just the fridge humming.'; await wait(4);
    } else {
      for (let i = 0; i < open.length; i++) {
        const id = open[i], [line, what] = LINES[id], name = this.st.found[id] ? this.dev[id].name : 'Unknown device (never paired)';
        const r = document.createElement('div'); r.style.margin = '6px 0';
        r.innerHTML = `<b>↑ ${name}</b> <span class="sub" style="font-size:.85em">${what}</span><br><span>${line}</span>`; bl.appendChild(r); r.scrollIntoView({ block: 'nearest' });
        play('beep', { vol: 0.2, rate: 1.4 });
        if (line.startsWith('"')) babble(line, 'you', { phone: true, keep: true, vol: 0.1 + i * 0.015 });
        play('vela' + (1 + (i % 5)), { vol: 0.12, rate: 0.55 + i * 0.12 });
        await wait(1.1);
      }
      play('distort', { vol: 0.3 });
      await wait(1.5);
      bs.scrollIntoView({ block: 'nearest' }); bs.innerHTML = `<b>${open.length} device${open.length > 1 ? 's' : ''} sent recordings of you tonight.</b>${open.some(id => !this.st.found[id]) ? ' Some of them you never even found.' : ''}`;
      await wait(5);
    }
    closeScreen(el);
  }
  updateVacuum(dt) {
    if (!this.vacOn) return;
    const v = this.vac.position, tgt = PATH[this.vacI];
    const dx = tgt[0] - v.x, dz = tgt[1] - v.z, d = Math.hypot(dx, dz);
    if (d < 0.05) { this.vacI = (this.vacI + 1) % PATH.length; return; }
    const sp = 0.32 * dt; v.x += dx / d * Math.min(sp, d); v.z += dz / d * Math.min(sp, d);
    this.vac.rotation.y = Math.atan2(dx, dz);
    Object.assign(this.vacCol, { x0: v.x - 0.17, x1: v.x + 0.17, z0: v.z - 0.17, z1: v.z + 0.17 });
    const L = AU_loops('vac'); if (L) L.setPos(v.x, 0.2, v.z);
    const red = this.vacRed > this.G.t && !this.isSecured('vacuum');
    this.vacLedM.color.set(red ? 0xff2020 : Math.sin(this.G.t * 6) > 0 ? 0x40c8ff : 0x103040); this.vacLight.color.set(red ? 0xff3030 : 0x40b0ff); this.vacLight.intensity = red ? 0.8 : 0.4;
    // jump scare: it bumps into you from behind in the dark
    const p = this.player.pos, dist = Math.hypot(p.x - v.x, p.z - v.z);
    if (!this.st.vacScare && dist < 0.55) {
      const fwd = this.G.camera.getWorldDirection(new THREE.Vector3()); const to = new THREE.Vector3(v.x - p.x, 0, v.z - p.z).normalize();
      if (fwd.x * to.x + fwd.z * to.z < 0.2) {
        this.st.vacScare = true;
        play('thump', { vol: 0.9 }); if (!this.G.quiet()) { play('stinger', { vol: 0.7 }); flash(0.2, 100); }
        caption('[something bumps into your heel]', 'sfx', 3);
        setTimeout(() => caption('…The robot vacuum. Cleaning. At midnight. In the dark.', 'say', 4), 1600);
      }
    }
  }
  drawTV(t) {
    const c = this.tvTex.userData.g;
    if (this.tvHaunt > this.G.t && !this.isSecured('tv')) {
      c.fillStyle = '#05070b'; c.fillRect(0, 0, 96, 72); c.font = '16px m5x7'; c.textBaseline = 'top';
      if (this.roomImg && this.roomImg.complete) { c.globalAlpha = 0.85; c.drawImage(this.roomImg, 0, 10, 96, 54); c.globalAlpha = 1; }
      c.fillStyle = 'rgba(0,0,0,.75)'; c.fillRect(0, 0, 96, 12); c.fillStyle = '#e9f2ff'; c.fillText('Recommended for you', 2, -2);
      c.fillStyle = 'rgba(0,0,0,.75)'; c.fillRect(0, 60, 96, 12); c.fillStyle = Math.sin(t * 5) > 0 ? '#ff4040' : '#802020'; c.fillRect(3, 64, 5, 5); c.fillStyle = '#ffd27a'; c.fillText('your room · LIVE', 11, 58);
      this.tvLight.intensity = 1.0; this.tvTex.needsUpdate = true; return;
    }
    if (this.tvMode === 'on') {
      c.fillStyle = '#132a4a'; c.fillRect(0, 0, 96, 72); c.font = '16px m5x7'; c.textBaseline = 'top';
      if (this.mumImg && this.mumImg.complete && (t % 10) > 5) {
        c.drawImage(this.mumImg, 0, 0, 96, 60); c.fillStyle = 'rgba(0,0,0,.7)'; c.fillRect(0, 56, 96, 16); c.fillStyle = '#ffd27a'; c.fillText('Anya konyhája', 3, 56);
      } else {
        c.fillStyle = '#e9f2ff'; c.fillText('Welcome back,', 6, 10); c.fillText((S.nick || '').slice(0, 11) + '!', 6, 24);
        c.fillStyle = Math.sin(t * 3) > 0 ? '#ffd27a' : '#7fa0c8'; c.fillText('Continue watching?', 6, 46);
      }
      this.tvLight.intensity = 0.8;
    } else { c.fillStyle = '#020203'; c.fillRect(0, 0, 96, 72); this.tvLight.intensity = 0; }
    this.tvTex.needsUpdate = true;
  }
  update(dt, t) {
    for (const L of Object.values(this.lamps)) L.update(t);
    if (!this.playing) return;
    const st = this.st;
    if (st.phase === 'play' || st.phase === 'won') { st.clock += dt; this.timeline(); }
    this._lt = (this._lt || 0) + dt; if (this._lt > 0.5) { this._lt = 0; this.updateList(); if (this.app && this._appRender) { const tc = this.app.querySelector('#tclock'); const h = document.querySelector('#checklist .h'); if (tc && h) tc.textContent = h.textContent; } }
    this.drawTV(t);
    this.camLedM.color.set(this.camBlink > this.G.t && Math.sin(t * 9) > -0.2 ? 0xff2020 : 0x220505);
    if (this.chimeRed > this.G.t) this.chimeLedM.color.set(Math.sin(t * 8) > 0 ? 0xff3030 : 0x401010); else this.chimeLedM.color.set(0x40ff90);
    this.updateVacuum(dt);
    this.velaT = Math.max(0, this.velaT - dt);
    const v = this.velaT > 0 ? 0.6 + Math.sin(t * 14) * 0.4 : 0.12 + Math.sin(t * 1.5) * 0.06;
    this.velaRingM.color.setRGB(0.15 * v, 0.7 * v, 1.0 * v); this.velaLight.intensity = this.velaT > 0 ? 0.9 * v : 0.12;
    if (this.appOpen) return; // the clock keeps running while you read the app
    this.player.update(dt);
    if (wasPressed('KeyF')) { this.setFlash(!st.flashOn); play('click', { vol: 0.4 }); }
    if (wasPressed('Tab') && ORDER.some(id => st.found[id])) { this.openApp(); return; }
    if (st.flashOn) st.batt = Math.max(0.2, st.batt - dt * 0.0012);
    battery(st.batt);
    const fI = st.flashOn ? 9 * (0.35 + 0.65 * Math.min(1, st.batt * 2.5)) : 0;
    this.flash.intensity = fI; this.vmKey.intensity = fI > 0 ? 1.2 : 0;
    let fI2 = fI; if (this.forceDark > 0) { this.forceDark -= dt; fI2 = Math.random() < 0.3 ? fI * 0.3 : 0; this.flash.intensity = fI2; }
    this.vmAmb.intensity = 0.18 + (fI2 > 0 ? 0.2 : 0); this.fill.intensity = 0.22; this.amb.intensity = 0.1; this.moon.intensity = 0.28;
    this.updateArms(dt, t);
    if (st.phase === 'play' || st.phase === 'won') this.updateWatcher(dt, { block: false, min: 26, range: 28 });
    const cur = this.it.update();
    prompt(cur ? this.it.label() : null);
    if (cur && wasPressed('KeyE')) cur.use();
  }
  exit() { super.exit(); stopLoop('vac'); this.closeApp(); }
}
import { AU } from '../core/audio.js';
function AU_loops(id) { return AU.loops[id]; }
