// Episode 9 in play order (internal id 6): "Tükörkép" (Reflection). The finale.
// Monday 7:10. A deepfake video of you is everywhere. Take it apart, piece by piece, using everything from the year.
import * as THREE from 'three';
import { A } from '../core/assets.js';
import { hud, fade, flash, wait } from '../core/hud.js';
import { music, play, loop, stopLoop } from '../core/audio.js';
import { S, epData, persist } from '../core/state.js';
import { DEBRIEF_EP6, rich, epPos } from '../text.js';
import { openScreen, closeScreen, debriefScreen, cutIn } from '../ui/screens.js';

const START = 7 * 60 + 10;
const SPM = 15;   // real seconds per game minute
const TELLS = {
  crest: { name: 'The badge is on the wrong side', why: 'In the video the green badge is on your right. On your real T-shirt it is on the left (Bence\'s photo from Friday). The face and clothes were taken from a mirror selfie.' },
  jaw: { name: 'The jaw shimmers', why: 'When the head turns, the edge of the jaw wobbles and smears: the pasted face doesn\'t quite fit the head underneath.' },
  teeth: { name: 'The teeth are one white band', why: 'Zoom in on the mouth: no separate teeth, just a white smear. Face-swap apps are bad at mouths.' },
};
const SOUNDS = {
  cirmi: { name: '"Lili" is really "Cirmi"', why: 'Slowed down, the name isn\'t "Lili". It\'s "Cirmi", the name of your cat. The voice was stitched together from an old recording.' },
  meow: { name: 'A cat under the voice', why: 'Behind one sentence there is a faint meow. Nobody had a cat in front of the school this morning.' },
};
const SRC = {
  voice: { name: 'The voice: Bubu\'s clip', why: 'BubuCloud history, the night of the power cut, 23:05: "I\'m scared of the dark, OK? Don\'t tell anyone, Cirmi." 0:12 of your voice, shared by a public link.' },
  face: { name: 'The face: your mirror selfie', why: 'n1ghtwatch posted a "dossier" of you in September. Your mirror selfie is in it. The fake uses that face and that mirrored hoodie.' },
  bg: { name: 'The background: a street-view picture', why: 'PanoMap street view of Platán School, photographed in 2025. Nobody filmed you there this morning.' },
  mall: { name: 'The "thief" part: the mall clip', why: 'The SUSPECT screens were filmed on Saturday night, 21:52, through the glass. Fürkész itself marked that match as false.' },
};
const LINES = [
  { t: 'Honestly? Lili sings like a dying cat.', w: [['Honestly?', ''], ['Lili', 'cirmi'], ['sings like a dying cat.', '']] },
  { t: 'And yeah, the cameras were right. I took the headphones. 😂', w: [['And yeah,', ''], ['the cameras were right.', 'meow'], ['I took the headphones.', '']] },
  { t: 'Seven B, you\'re all so easy to fool.', w: [['Seven B,', ''], ['you\'re all so easy to fool.', '']] },
];
const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const hm = m => Math.floor(m / 60) + ':' + String(Math.floor(m) % 60).padStart(2, '0');

export class Ep6 {
  constructor(G) { this.G = G; this.epN = 6; this.updateWhileOverlay = true; this.playing = false; this.quitLabel = 'Back to the lab (progress saved)'; this.q = []; }

  async build() {
    this.scene = new THREE.Scene(); this.scene.background = new THREE.Color(0x020203);
    this.nick = (S.nick || 'Me').replace(/[<>]/g, '');
    const c4 = epData(4).choices || {}, c7 = epData(7).choices || {};
    this.past = { lili: c4.lili || 'none', reported: !!c4.reported, request: !!c7.request };
    const sv = epData(6).state;
    this.st = { phase: 'intro', el: 0, ev: {}, tells: {}, snd: {}, src: {}, frame: 1, views: 18400, reported: false, takenDown: false, toldVarga: false, mumOK: false, reqSent: this.past.request,
      chat: [], mail: [], unread: {}, hints: 0, blinked: false, start: Date.now() };
    if (sv) { Object.assign(this.st, sv, { start: Date.now() - (sv.elapsedMs || 0) }); if (this.st.phase === 'intro') this.st.phase = 'play'; }
    this.win = 'loopa'; this.modal = null; this.tip = '';
  }

  // ---------------- flow ----------------
  async enter() {
    hud(false); this.G.unlock(); music(null);
    const resumed = this.st.phase !== 'intro';
    if (!resumed) {
      await fade(true, 'Monday, 7:10.', 0.01); await wait(1.5);
      if (A.img.ep6_morning) { const q = this.G.quiet(); for (let i = 0; i < (q ? 3 : 10); i++) setTimeout(() => play('beep', { vol: q ? 0.2 : 0.5, rate: 1 + Math.random() }), 400 + i * 120); if (!q) setTimeout(() => play('stinger', { vol: 0.4 }), 500); await cutIn(A.img.ep6_morning, '63 notifications', 3800); }
      await fade(true, 'Monday, 7:10. School starts at 8.\n\nYour phone has 63 notifications. Bence: "is this real??"\nOvernight a video of you went up on Loopa.\nYou never made it.', 0.01); await wait(5);
      this.seed();
    } else await fade(true, '', 0.01);
    this.open();
    loop('fan6', 'hum', { vol: 0.05, rate: 0.9 });
    music('mus_tense', 0.12);
    await fade(false, '', 1.2);
    if (!resumed) { this.st.phase = 'play'; this.setTip('It isn\'t you. Prove it: take the video apart (Frames, Sound), find where every piece came from (Search, Mail), then report it and tell Ms Varga. School starts at 8.'); }
    else this.setTip('Welcome back. The video kept spreading while you were away.');
    this.playing = true; this.render();
  }
  seed() {
    const st = this.st;
    st.chat = [
      { w: 'Bence', x: 'is this real?? 😳', t: '6:58' },
      { w: 'Bence', x: 'bro whats going on. thats u right? the hoodie', t: '7:02' },
      { w: '7.B 💬', x: 'Dani: 💀💀💀', t: '7:04' },
      { w: '7.B 💬', x: 'Réka: thats so mean about lili wtf', t: '7:05' },
      { w: '7.B 💬', x: '⚠️ Lili left the group', t: '7:06', sys: true },
    ];
    st.mail = [
      { id: 'varga1', from: 'Ms Varga', subj: 'Please come and see me', t: '7:08', body: 'I\'ve seen the video. Before you say anything: I know what you\'re like, and I also know what can be faked. Come to Room 214 before first lesson. Bring anything that helps. – Varga' },
      this.past.request
        ? { id: 'fur', from: 'Fürkész · data protection officer', subj: 'Your access request (Pláza Platán)', t: 'Sun 10:14', body: 'Attached: all data held about you. Saturday 18:40 match against the electronics shop incident: 91 %. Operator review 21:49: FALSE MATCH (different shoes, no backpack, cinema ticket 18:30–20:45). Case closed. Your face template will be deleted in 30 days.', src: 'mall' }
        : { id: 'furask', from: 'Fürkész · Pláza Platán', subj: 'How to request your data', t: 'Sat 22:31', body: 'You can ask for every recording and face template we hold about you. Reply to this email to send an access request.', ask: true },
    ];
    st.unread = { chat: 5, mail: 2 };
  }
  resume() { }
  quit() { this.save(); this.playing = false; this.G.goHub(); }
  exit() { this.playing = false; removeEventListener('keydown', this._key, true); closeScreen(this.el); stopLoop('fan6'); }
  save() { const st = this.st; if (st.phase === 'intro' || st.phase === 'end') return; const { start, ...rest } = st; epData(6).state = { ...rest, elapsedMs: Date.now() - start }; persist(); }
  after(sec, f) { this.q.push({ at: this.st.el + sec, f }); }
  clock() { return hm(START + this.st.el / SPM); }
  setTip(t, kind = '') { this.tip = t; this.tipKind = kind; this.renderNotes(); }
  n(o) { return Object.keys(o).length; }
  have() { const s = this.st; return { vis: this.n(s.tells), aud: this.n(s.snd), src: this.n(s.src) }; }

  open() {
    const dock = [['loopa', '▶️', '#c2417a', 'Loopa'], ['frames', '🎞️', '#3a5a9a', 'Frames'], ['sound', '🎧', '#7a4a9a', 'Sound'], ['search', '🔍', '#2c7a5a', 'Visszakereső'], ['mail', '✉️', '#9a6a2a', 'Mail'], ['chat', '💬', '#2b62d9', 'Chatr']];
    const el = this.el = openScreen(`<div class="ep4 ep6">
      <div class="laptop4" id="lap"><div class="cam4"></div><div class="lscr" id="lscr">
        <div class="mbar4"><span>◉ Monday</span><span id="lclock"></span></div>
        <div class="desk4" id="desk"></div><div id="win4"></div><div id="modal4" class="hidden"></div><div id="toast4"></div>
        <div class="dock4">${dock.map(([k, e, c, n]) => `<button data-act="win" data-arg="${k}" title="${n}"><span style="background:${c}">${e}</span><i id="b_${k}" style="display:none"></i></button>`).join('')}</div>
        <div id="dark6"><div class="refl"></div></div>
      </div></div>
      <div class="notes3" id="notes"></div></div>`, 'solid');
    el.addEventListener('click', e => {
      if (this.st.phase === 'end') return;
      const a = e.target.closest('[data-act]'); if (!a) return;
      this.act(a.dataset.act, a.dataset.arg, a);
    });
    el.addEventListener('input', e => { if (e.target.id === 'scrub') { this.st.frame = +e.target.value; this.renderFrames(); } });
    this._key = e => {
      if (e.code !== 'Escape' || S.paused) return;
      e.preventDefault(); e.stopImmediatePropagation();
      if (this.modal) { this.modal = null; this.render(); return; }
      if (this.playing && this.st.phase !== 'end') { this.save(); this.G.openPause(); }
    };
    addEventListener('keydown', this._key, true);
  }
  toast(from, text, win) {
    const n = this.el.querySelector('#toast4'); const d = document.createElement('div'); d.className = 'nt'; d.dataset.act = 'win'; d.dataset.arg = win;
    d.innerHTML = `<b>${esc(from)}</b><span>${esc(text)}</span>`; n.appendChild(d); play('beep', { vol: 0.3, rate: 1.3 }); setTimeout(() => d.remove(), 5500);
    if (this.win !== win) { this.st.unread[win] = (this.st.unread[win] || 0) + 1; this.renderDock(); }
  }
  chatMsg(w, x, sys) { this.st.chat.push({ w, x, t: this.clock(), sys }); this.toast(w, x, 'chat'); if (this.win === 'chat') this.render(); }
  mailMsg(m) { this.st.mail.unshift({ t: this.clock(), ...m }); this.toast(m.from, m.subj, 'mail'); if (this.win === 'mail') this.render(); }

  // ---------------- input ----------------
  act(a, arg, node) {
    const st = this.st;
    play('click', { vol: 0.2 });
    switch (a) {
      case 'win': this.win = arg; st.unread[arg] = 0; this.modal = null; break;
      case 'x': this.modal = null; break;
      case 'frame': st.frame = Math.max(1, Math.min(6, st.frame + (+arg))); this.render(); this.checkBlink(); return;
      case 'tell': this.found('tells', arg, TELLS); break;
      case 'notell': this.setTip('Nothing wrong there. Look at the badge, the mouth and the jaw, frame by frame.'); return;
      case 'word': this.listen(arg, node); return;
      case 'bubu': this.found('src', 'voice', SRC); this.modal = 'bubu'; break;
      case 'search': this.search(arg); return;
      case 'mail': this.modal = 'mail:' + arg; this.openMail(arg); break;
      case 'ask': this.sendRequest(); break;
      case 'report': this.modal = 'report'; break;
      case 'sendreport': this.sendReport(); break;
      case 'varga': this.modal = 'varga'; break;
      case 'sendvarga': this.sendVarga(); break;
      case 'room': this.finale(); return;
      case 'hint': this.hint(); return;
      case 'pause': this.save(); this.G.openPause(); return;
    }
    this.save(); this.render();
  }
  found(group, k, DEF) {
    const st = this.st;
    if (!st[group][k]) { st[group][k] = true; play('paper', { vol: 0.4 }); this.setTip(`✓ ${DEF[k].name}. ${DEF[k].why}`, 'ok'); }
    const h = this.have();
    if (h.vis && h.aud && h.src && !st.ev.canReport) { st.ev.canReport = true; this.after(3, () => this.setTip('You have proof from the picture, the sound and the sources. Report the video on Loopa, and send Ms Varga what you found.')); }
  }
  checkBlink() {
    const st = this.st;
    if (st.frame === 5 && !st.blinked) {
      st.blinked = true; this.blinkNow = true; this.renderFrames();
      if (!this.G.quiet()) { play('stinger', { vol: 0.45 }); flash(0.12, 90); } else play('presence', { vol: 0.3 });
      setTimeout(() => { this.blinkNow = false; this.renderFrames(); this.setTip('…The paused frame just blinked? No. Your eyes did, staring at it. But the fake does blink wrong: count the blinks in a real video and in this one.'); }, 700);
    }
  }
  listen(i, node) {
    const [li, wi] = i.split('.').map(Number); const w = LINES[li].w[wi]; const st = this.st;
    play('distort', { vol: 0.12, rate: 0.7 });
    let heard = `"${w[0]}"`;
    if (w[1] === 'cirmi') { heard = 'slowed down: "…Cirm-i…"'; this.found('snd', 'cirmi', SOUNDS); }
    else if (w[1] === 'meow') { heard = '"the cameras were right" … and underneath, very quietly: mrrau.'; play('meow', { vol: 0.15 }); this.found('snd', 'meow', SOUNDS); }
    this.heard = { i, heard }; this.save(); this.render();
  }
  search(k) {
    const st = this.st; this.searchK = k;
    if (k === 'face') this.found('src', 'face', SRC);
    if (k === 'bg') this.found('src', 'bg', SRC);
    if (k === 'mall') { if (!st.src.mall && (st.reqSent && st.ev.furOK || this.past.request)) this.found('src', 'mall', SRC); else this.setTip('Found the original mall clip: Saturday 21:52, @budapest.spotted. To prove the "SUSPECT" match was false, you need Fürkész\'s own answer: check Mail.'); }
    play('typing', { vol: 0.2 }); this.save(); this.render();
  }
  openMail(id) { const m = this.st.mail.find(x => x.id === id); if (m && m.src) this.found('src', m.src, SRC); }
  sendRequest() {
    const st = this.st; if (st.reqSent) return; st.reqSent = true; this.modal = null;
    this.setTip('Request sent. Organisations usually have a month to answer; Fürkész\'s officer is up early today.');
    this.after(20, () => { st.ev.furOK = true; this.mailMsg({ id: 'fur', from: 'Fürkész · data protection officer', subj: 'Re: access request', body: 'Here is what we hold. Saturday 18:40 match against the electronics shop incident: 91 %. Operator review 21:49: FALSE MATCH. Case closed. Your face template will be deleted in 30 days.', src: 'mall' }); });
  }
  sendReport() {
    const st = this.st, h = this.have();
    if (!(h.vis && h.aud && h.src)) { this.setTip('Loopa needs evidence: at least one thing from the picture, one from the sound, and one source.', 'warn'); return; }
    st.reported = true; this.modal = null; play('latch', { vol: 0.4 });
    this.setTip('Reported as a deepfake impersonating you. Now tell Ms Varga, with the proof.');
    this.after(14, () => { st.takenDown = true; this.mailMsg({ id: 'loopa', from: 'Loopa Trust & Safety', subj: 'Content removed', body: 'Thank you for your report. The video you reported broke our rules on impersonation and manipulated media and has been removed. 3 accounts that re-posted it have been suspended.' }); this.chatMsg('Bence', 'the video is GONE. it says "removed" 🙏'); this.checkEnd(); });
  }
  sendVarga() {
    const st = this.st; if (st.toldVarga) return; st.toldVarga = true; this.modal = null; play('latch', { vol: 0.4 });
    this.setTip('Sent. Ms Varga will want to talk in person.');
    this.after(10, () => {
      const motive = this.past.reported ? 'He says it was "payback" for being reported over the szellem_7b group.' : 'He says it was "just a joke, like the meme".';
      this.mailMsg({ id: 'varga2', from: 'Ms Varga', subj: 'Re: the video', body: `Thank you. That is exactly the proof I needed. The upload came from Máté's phone; he used a free face-swap app and "stuff that was online anyway". ${motive} The head and I are talking to him and his parents this morning. None of this is on you. Come up to 214 when you're ready.` });
      this.liliMsg(); this.checkEnd();
    });
  }
  liliMsg() {
    if (this.st.ev.lili) return; this.st.ev.lili = true;
    if (this.past.lili === 'kind') { this.chatMsg('7.B 💬', '⚠️ Lili joined the group', true); setTimeout(() => this.chatMsg('7.B 💬', 'Lili: it\'s fake. I know them. they texted me on Friday when nobody else did. stop sharing it.'), 1500); }
    else setTimeout(() => this.chatMsg('Lili', 'now you know how it felt. …the cat thing gave it away btw. I told everyone it\'s fake.'), 800);
  }
  checkEnd() {
    const st = this.st;
    if (st.reported && st.toldVarga && !st.ev.readyEnd) { st.ev.readyEnd = true; this.after(6, () => { this.chatMsg('Bence', 'come up to 214, I saved you a seat 🫶'); this.setTip('That\'s it. Go to Room 214.'); st.ev.canGo = true; this.render(); }); }
  }
  hint() {
    const st = this.st, h = this.have(); st.hints++;
    let t;
    if (!h.vis) t = 'Frames: step through the video. Click the badge on the T-shirt, the mouth (frame 3), the jaw (frame 4).';
    else if (!h.aud) t = 'Sound: click the words one by one. Listen to Lili\'s name, slowed down.';
    else if (!st.src.voice) t = 'Sound: where could an old recording of your voice come from? The bear. Open BubuCloud.';
    else if (!st.src.face) t = 'Visszakereső: search with your face from the video.';
    else if (!st.reported) t = 'Loopa: Report the video. You have enough proof.';
    else if (!st.toldVarga) t = 'Mail: reply to Ms Varga with what you found.';
    else t = 'Wait a moment for the replies, then go to Room 214.';
    this.setTip('💡 ' + t);
  }

  // ---------------- ending ----------------
  async finale() {
    const st = this.st; if (st.phase === 'end') return; st.phase = 'end';
    this.win = null; this.render();
    const d = this.el.querySelector('#dark6'); if (A.img.refl_a) d.querySelector('.refl').style.backgroundImage = `url(${A.img.refl_a})`;
    d.classList.add('on'); play('click', { vol: 0.4 });
    await wait(2.5);
    stopLoop('fan6');
    if (A.img.ep6_lab_morning) { closeScreen(this.el); this.el = null; await cutIn(A.img.ep6_lab_morning, '7:58 · Room 214', 4500); }
    await fade(true, `End of episode ${epPos(6)}.\n\nRoom 214 in the morning. Bence has saved you a seat. Ms Varga nods at you, once.\nOn the desk, your phone lies face down. You turn it over.\nThe screen is dark, and in it is your own face. Just you.`, 1.5);
    await wait(7);
    this.playing = false; if (this.el) { closeScreen(this.el); this.el = null; } removeEventListener('keydown', this._key, true);
    const secs = Math.round((Date.now() - st.start) / 1000);
    const dd = epData(6); dd.done = true; dd.state = null; dd.best = dd.best ? Math.min(dd.best, secs) : secs; dd.choices = { proofs: this.n(st.tells) + this.n(st.snd) + this.n(st.src) }; persist();
    music('mus_debrief', 0.45);
    await fade(false, '', 0.5);
    const stats = [`Done by: ${this.clock()} (school starts at 8:00)`, `In the picture: ${this.n(st.tells)}/3`, `In the sound: ${this.n(st.snd)}/2`, `Sources traced: ${this.n(st.src)}/4`, `Reported: ${st.reported ? 'yes' : 'no'} · Told Ms Varga: ${st.toldVarga ? 'yes' : 'no'}`, `Lili: ${this.past.lili === 'kind' ? 'stood up for you in the group' : 'helped, privately'}`];
    const nx = await debriefScreen(DEBRIEF_EP6, stats, null);
    await fade(true, '', 0.6);
    await this.G.goField();
  }

  // ---------------- loop ----------------
  timeline() {
    const st = this.st, E = st.ev, t = st.el;
    const once = (k, c, f) => { if (!E[k] && c) { E[k] = true; f(); } };
    once('b1', t > 20, () => this.chatMsg('Bence', 'here\'s a real pic of u from friday, for comparison. look at ur shirt'));
    once('mum', t > 70, () => this.mailMsg({ id: 'mum', from: 'Mum', subj: 'Are you OK?', body: 'Bence\'s mum called me. I saw it. I know it isn\'t you, sweetheart. Nobody who knows you would believe it. Do what Ms Varga says, and call me at break. ❤️' }));
    once('c2', t > 110, () => this.chatMsg('7.B 💬', 'Dani: wait the voice sounds weird tho'));
    once('views', t > 160, () => this.toast('Loopa', 'Your video has 40,000 views', 'loopa'));
    once('late', START + t / SPM >= 7 * 60 + 50, () => this.mailMsg({ id: 'varga3', from: 'Ms Varga', subj: '10 minutes', body: 'I\'m in 214. Bring what you have, even if it isn\'t finished.' }));
    if (!st.takenDown) st.views = Math.floor(18400 + t * 140);
  }
  update(dt) {
    if (!this.playing || !this.el) return;
    const st = this.st;
    if (st.phase === 'play') {
      st.el += dt;
      for (const j of this.q.filter(j => st.el >= j.at)) { this.q.splice(this.q.indexOf(j), 1); j.f(); }
      this.timeline();
    }
    this._t = (this._t || 0) + dt; if (this._t > 0.5) { this._t = 0; this.renderBar(); }
    this._sv = (this._sv || 0) + dt; if (this._sv > 5) { this._sv = 0; this.save(); }
  }

  // ---------------- rendering ----------------
  renderBar() { if (!this.el) return; this.el.querySelector('#lclock').textContent = this.clock(); const v = this.el.querySelector('#views6'); if (v) v.textContent = this.st.takenDown ? 'removed' : this.st.views.toLocaleString('en') + ' views'; }
  renderDock() { if (!this.el) return; for (const k of ['loopa', 'frames', 'sound', 'search', 'mail', 'chat']) { const b = this.el.querySelector('#b_' + k); const n = this.st.unread[k] || 0; b.textContent = n || ''; b.style.display = n ? '' : 'none'; } }
  render() {
    if (!this.el) return;
    const w = this.el.querySelector('#win4');
    const R = { loopa: () => this.rLoopa(), frames: () => this.rFrames(), sound: () => this.rSound(), search: () => this.rSearch(), mail: () => this.rMail(), chat: () => this.rChat() };
    w.innerHTML = this.win && R[this.win] ? `<div class="win4 w6">${R[this.win]()}</div>` : '';
    const cm = w.querySelector('.cmsgs'); if (cm) cm.scrollTop = cm.scrollHeight;
    const md = this.el.querySelector('#modal4'); md.classList.toggle('hidden', !this.modal); md.innerHTML = this.modal ? this.rModal() : '';
    this.renderDock(); this.renderBar(); this.renderNotes();
  }
  renderFrames() { if (this.win === 'frames') this.render(); }
  fake(extra = '', flip = true, zoom = null) {
    const img = A.img.ep6_fake_frame;
    const st = zoom ? `background-size:${zoom[0]}%;background-position:${zoom[1]}% ${zoom[2]}%` : 'background-size:cover;background-position:center';
    return `<div class="vid6" style="background-image:url(${img});${st};${flip ? 'transform:scaleX(-1)' : ''}">${extra}</div>`;
  }
  rLoopa() {
    const st = this.st;
    if (st.takenDown) return `<div class="wt">▶️ Loopa</div><div class="wb6 center6"><div class="gone6">This video has been removed for breaking Loopa's rules on impersonation and manipulated media.</div></div>`;
    return `<div class="wt">▶️ Loopa · @7b.exposed</div><div class="wb6 loopa6">
      <div class="player6">${this.fake()}<div class="subs6">${LINES.map(l => esc(l.t)).join('<br>')}</div><div class="tag6">🔁 + mall clip "SUSPECT 91%"</div></div>
      <div class="meta6"><b>@7b.exposed</b> <span id="views6">${st.views.toLocaleString('en')} views</span><p>"7.B's finest 🤡 the thief has opinions" · reposted from <u>n1ghtwatch</u></p>
      <div class="cm6"><b>dani.k</b> no way 💀<br><b>reka_</b> poor lili<br><b>anon_88</b> ban this kid</div>
      <button class="btn ${st.reported ? '' : 'primary'}" data-act="report">${st.reported ? '⚑ Reported' : '⚑ Report this video'}</button></div></div>`;
  }
  rFrames() {
    const st = this.st, f = st.frame, T = st.tells;
    // the shown video is mirrored, so the badge sits on the left of the picture
    const hot = (k, x, y, r) => `<button class="hot6 ${T[k] ? 'got' : ''}" data-act="tell" data-arg="${k}" style="left:${x}%;top:${y}%;width:${r}%;height:${r * 1.7}%"></button>`;
    let inner = '';
    if (f === 1) inner = this.fake(`${hot('crest', 50.5, 73, 9)}`);
    if (f === 2) inner = this.fake(`<button class="hot6 none" data-act="notell" style="left:38%;top:5%;width:30%;height:50%"></button>`);
    if (f === 3) inner = this.fake(`<div class="smear6"></div>${hot('teeth', 38, 34, 24)}`, true, [320, 50, 34]);
    if (f === 4) inner = this.fake(`<div class="jaw6"></div>${hot('jaw', 39, 30, 24)}`);
    if (f === 5) inner = this.fake(this.blinkNow ? '<div class="eyes6"></div>' : '');
    if (f === 6) inner = this.fake(`${hot('crest', 50.5, 73, 9)}`);
    const real = `<div class="vid6 small" style="background-image:url(${A.img.ep6_fake_frame});background-size:cover;background-position:center"></div>`;
    return `<div class="wt">🎞️ Frames · frame ${f}/6</div><div class="wb6 frames6">
      <div class="fl6"><div class="player6">${inner}</div>
        <div class="ctl6"><button class="btn small" data-act="frame" data-arg="-1">◀</button><input type="range" id="scrub" min="1" max="6" value="${f}"><button class="btn small" data-act="frame" data-arg="1">▶</button></div>
        <p class="sm6">Step through the video and click anything that looks wrong.</p></div>
      ${st.ev.b1 ? `<div class="fr6"><b>Bence's photo, Friday</b>${real}<small>The real you, not mirrored.</small></div>` : ''}
      <div class="found6">${Object.keys(TELLS).map(k => `<div class="${T[k] ? 'y' : ''}">${T[k] ? '✓ ' + TELLS[k].name : '· ?'}</div>`).join('')}</div></div>`;
  }
  rSound() {
    const st = this.st;
    const bars = Array.from({ length: 64 }, (_, i) => { const h = 6 + Math.abs(Math.sin(i * 1.7) * 18 + Math.sin(i * 0.37) * 12); return `<rect x="${i * 6}" y="${40 - h / 2}" width="4" height="${h}" fill="${i > 18 && i < 26 ? '#c98a4a' : '#6a5a8a'}"/>`; }).join('');
    return `<div class="wt">🎧 Sound · slow playback</div><div class="wb6 sound6">
      <svg viewBox="0 0 384 80" class="wave6">${bars}</svg>
      <p class="sm6">Click a word or phrase to hear it slowed down.</p>
      ${LINES.map((l, li) => `<div class="ln6">${l.w.map((w, wi) => `<button class="wd6 ${this.heard && this.heard.i === li + '.' + wi ? 'on' : ''}" data-act="word" data-arg="${li}.${wi}">${esc(w[0])}</button>`).join(' ')}</div>`).join('')}
      <div class="heard6">${this.heard ? '🎧 ' + esc(this.heard.heard) : ''}</div>
      ${st.snd.cirmi ? `<button class="btn ${st.src.voice ? '' : 'primary'}" data-act="bubu">☁️ Open BubuCloud history: who ever recorded "Cirmi"?</button>` : ''}
      <div class="found6">${Object.keys(SOUNDS).map(k => `<div class="${st.snd[k] ? 'y' : ''}">${st.snd[k] ? '✓ ' + SOUNDS[k].name : '· ?'}</div>`).join('')}</div></div>`;
  }
  rSearch() {
    const st = this.st, k = this.searchK;
    const res = {
      face: [`<div class="res6"><div class="th6" style="background-image:url(${A.img.ep3_selfie || ''})"></div><div><b>n1ghtwatch · "dossier: 7.B"</b><br>posted 12 Sept · your mirror selfie, your class, your school, your rink<br><span class="ok6">Same face, same mirrored badge.</span></div></div>`],
      bg: [`<div class="res6"><div class="th6" style="background-image:url(${A.img.ep6_school_front || ''})"></div><div><b>PanoMap street view · Platán School</b><br>photo taken: November 2025<br><span class="ok6">The exact background. Not filmed this morning.</span></div></div>`],
      mall: [`<div class="res6"><div class="th6 tall" style="background-image:url(${A.img.ep5_mall_screens || ''})"></div><div><b>@budapest.spotted</b><br>Saturday 21:52, filmed through the glass of Pláza Platán<br>${st.src.mall ? '<span class="ok6">And Fürkész itself marked the match FALSE.</span>' : 'The original clip. Is the "SUSPECT" match true?'}</div></div>`],
    };
    return `<div class="wt">🔍 Visszakereső · reverse image search</div><div class="wb6 search6">
      <p class="sm6">Search the web with a piece of the video:</p>
      <div class="sbtn6"><button class="btn" data-act="search" data-arg="face">🙂 The face</button><button class="btn" data-act="search" data-arg="bg">🏫 The background</button><button class="btn" data-act="search" data-arg="mall">📺 The mall part</button></div>
      <div class="results6">${k ? res[k].join('') : '<p class="sm6">No search yet.</p>'}</div>
      <div class="found6">${Object.keys(SRC).map(s => `<div class="${st.src[s] ? 'y' : ''}">${st.src[s] ? '✓ ' + SRC[s].name : '· ?'}</div>`).join('')}</div></div>`;
  }
  rMail() {
    const st = this.st;
    return `<div class="wt">✉️ Mail</div><div class="wb6 mail6">${st.mail.map(m => `<button class="mi6" data-act="mail" data-arg="${m.id}"><b>${esc(m.from)}</b><span>${esc(m.subj)}</span><small>${esc(m.t)}</small></button>`).join('')}
      <button class="btn ${st.toldVarga ? '' : 'primary'}" data-act="varga" style="margin-top:10px">${st.toldVarga ? '✓ Sent to Ms Varga' : '↩ Reply to Ms Varga with your proof'}</button>
      ${st.ev.canGo ? '<button class="btn primary" data-act="room" style="margin-top:8px">Close the laptop and go to Room 214</button>' : ''}</div>`;
  }
  rChat() {
    const st = this.st;
    return `<div class="wt">💬 Chatr</div><div class="wb6"><div class="cmsgs">${st.chat.map(m => m.sys ? `<div class="msg sys">${esc(m.x)}</div>` : `<div class="msg"><span class="who">${esc(m.w)} · ${esc(m.t)}</span>${esc(m.x)}</div>`).join('')}</div>
      ${st.canGo || st.ev.canGo ? '<button class="btn primary" data-act="room" style="margin:8px">Go to Room 214</button>' : ''}</div>`;
  }
  rModal() {
    const st = this.st, m = this.modal, h = this.have();
    if (m === 'bubu') return `<div class="mdl"><h4>☁️ BubuCloud · history</h4>${A.img.ep2_bear_view ? `<img src="${A.img.ep2_bear_view}" style="width:100%;border-radius:8px">` : ''}<p>23:05, the night of the power cut · 0:12 · shared by link (closed, 214 views)<br><i>"…I'm scared of the dark, OK? Don't tell anyone, Cirmi."</i></p><p class="sm">Twelve seconds of your voice. Enough for a free app to make it say anything.</p><button class="b3" data-act="x">Close</button></div>`;
    if (m && m.startsWith('mail:')) {
      const x = st.mail.find(y => y.id === m.slice(5)); if (!x) return '';
      return `<div class="mdl"><h4>${esc(x.subj)}</h4><p class="sm">${esc(x.from)} · ${esc(x.t)}</p><p>${esc(x.body)}</p>${x.ask && !st.reqSent ? '<button class="b3" data-act="ask">Reply: send my access request</button>' : ''}<button class="b3 ghost" data-act="x">Close</button></div>`;
    }
    const list = () => [...Object.keys(st.tells).map(k => '🎞️ ' + TELLS[k].name), ...Object.keys(st.snd).map(k => '🎧 ' + SOUNDS[k].name), ...Object.keys(st.src).map(k => '🔍 ' + SRC[k].name)].map(t => `<li>${esc(t)}</li>`).join('');
    if (m === 'report') return `<div class="mdl"><h4>Report: this is a deepfake of me</h4><p class="sm">Impersonation / manipulated media. Loopa reviews reports with evidence first.</p><ul class="ev6">${list() || '<li>No evidence yet.</li>'}</ul>
      <p class="sm">${h.vis ? '✓' : '✗'} picture · ${h.aud ? '✓' : '✗'} sound · ${h.src ? '✓' : '✗'} source</p><button class="b3" data-act="sendreport">Send report</button><button class="b3 ghost" data-act="x">Cancel</button></div>`;
    if (m === 'varga') return `<div class="mdl"><h4>To: Ms Varga</h4><p>It isn't me. Here is what I found:</p><ul class="ev6">${list() || '<li>(nothing yet)</li>'}</ul><p class="sm">${st.reported ? 'I reported it on Loopa too.' : 'I haven\'t reported it on Loopa yet.'}</p><button class="b3" data-act="sendvarga">Send</button><button class="b3 ghost" data-act="x">Cancel</button></div>`;
    return '';
  }
  renderNotes() {
    if (!this.el) return;
    const st = this.st, nt = this.el.querySelector('#notes'), h = this.have();
    const g = (ok, t) => `<div class="claim ${ok ? 'ok' : ''}"><b>${ok ? '✓' : '·'} ${t}</b></div>`;
    nt.innerHTML = `<div class="nh"><span class="cd">🕖 ${this.clock()}</span><small>school starts at 8:00</small></div>
      <div class="lk">Views: <b>${st.takenDown ? 'removed' : st.views.toLocaleString('en')}</b></div>
      <h4>Take it apart</h4>${g(h.vis, `In the picture (${h.vis}/3)`)}${g(h.aud, `In the sound (${h.aud}/2)`)}${g(h.src >= 2, `Where it came from (${h.src}/4)`)}
      <h4>Then</h4>${g(st.reported, 'Report it on Loopa')}${g(st.toldVarga, 'Send Ms Varga your proof')}${g(st.phase === 'end', 'Go to Room 214')}
      <div class="tip3 ${this.tipKind || ''}">${rich(this.tip || '')}</div>
      <div class="nbtns"><button class="btn small" data-act="hint">💡 Hint</button><button class="btn small" data-act="pause">⏸ Pause</button></div>`;
  }
}
