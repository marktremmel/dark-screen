// Episode 3: "Valaki tudja" (Someone knows). A screenlife episode played on a fake phone.
import * as THREE from 'three';
import { A } from '../core/assets.js';
import { hud, fade, flash, wait } from '../core/hud.js';
import { music, play, loop, stopLoop } from '../core/audio.js';
import { S, epData, persist } from '../core/state.js';
import { DEBRIEF_EP3, rich } from '../text.js';
import { openScreen, closeScreen, debriefScreen } from '../ui/screens.js';
import * as ART from './ep3art.js';

const T_END = 600;                 // the last message arrives after 10 minutes
const LEAKS = ['selfie', 'live', 'profile', 'checkins', 'geotag'];
const L = {
  selfie: { claim: 'Knows your new hoodie and your tram stop', found: 'The mirror selfie: the school crest on your PE shirt and the tram 14 sign outside the window.', find: 'Open your newest post on Pixa (the selfie) and press "Zoom in". What could a stranger read in it?', fix: 'Archive the selfie on Pixa (button under the post).' },
  live: { claim: 'Knows you are at home right now', found: 'Chatr Map shares your live location dot with Everyone.', find: 'Chatr has a Map tab. Who can see your dot?', fix: 'In Chatr › Map, choose Close friends or Only me.' },
  profile: { claim: 'Knows your class, your school and your birthday', found: 'Your Pixa profile is public, and the bio says 7.B, Platán School and 14 March.', find: 'Open your Pixa profile and press "View as stranger".', fix: 'Make the account private, and edit the bio: take out your school/class and birthday. The bio stays visible even on private accounts.' },
  checkins: { claim: 'Knows where you go every Saturday at 6', found: 'Ice rink check-ins (bejelentkezés) with a time, every Saturday, plus "Sat 6pm" in your bio.', find: 'Look at your ice rink posts on Pixa.', fix: 'Archive both ice rink posts and take "Sat 6pm" out of your bio.' },
  geotag: { claim: 'Knows your street', found: 'The cat photo carries a geotag: GPS coordinates of Hársfa utca 12, your home.', find: 'Open the cat photo in the Photos app and press ⓘ Info.', fix: 'Turn off "Save location in photos" in Settings › Camera, and remove the location from the cat post on Pixa.' },
};
const POSTS = {
  selfie: { art: () => ART.selfie(false), cap: 'new hoodie 😎', loc: null, date: 'Today, 16:12', likes: 48, comment: ['n1ghtwatch', '🔥🔥'] },
  rink1: { art: () => ART.rink(1), cap: 'Saturday = skating ⛸️', loc: 'Jégpálya Platán', date: 'Last Saturday, 18:04', likes: 31 },
  cat: { art: () => ART.cat(), cap: 'my roommate 🐱 Cirmi', loc: 'Hársfa utca 12 (added from the photo)', date: '3 days ago', likes: 77 },
  cake: { art: () => ART.cake(), cap: 'thirteen 🎂', loc: null, date: '14 March 2025', likes: 64 },
  rink2: { art: () => ART.rink(2), cap: 'every Saturday 6pm, same place 😌', loc: 'Jégpálya Platán', date: '2 Saturdays ago, 18:04', likes: 27 },
  window: { art: () => ART.windowView(), cap: 'sunset from my room 🌇', loc: null, date: 'Yesterday', likes: 39 },
};
const POST_ORDER = ['selfie', 'window', 'cat', 'rink1', 'rink2', 'cake'];
const PHOTOS = {
  selfie: { loc: 'Hársfa utca 12', gps: '47.5124, 19.0418', date: 'Today 16:11' },
  window: { loc: 'Hársfa utca 12', gps: '47.5124, 19.0418', date: 'Yesterday 19:02' },
  cat: { loc: 'Hársfa utca 12', gps: '47.5124, 19.0418', date: 'Wednesday 17:40' },
  rink1: { loc: 'Jégpálya Platán', gps: '47.5101, 19.0466', date: 'Last Saturday 18:04' },
  cake: { loc: null, date: '14 March 2025' },
};
const BIO = [['school', '✨ 7.B @ Platán School'], ['bday', '🎂 14 March'], ['skate', '⛸️ Sat 6pm'], ['cat', '🐱 Cirmi\'s human']];
const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const mmss = s => { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };

export class Ep3 {
  constructor(G) { this.G = G; this.epN = 3; this.updateWhileOverlay = true; this.playing = false; this.quitLabel = 'Back to the lab (progress saved)'; this.q = []; }

  async build() {
    this.scene = new THREE.Scene(); this.scene.background = new THREE.Color(0x020203);
    const nick = (S.nick || 'Me').replace(/[<>]/g, '');
    this.nick = nick; this.handle = '@' + nick.toLowerCase().replace(/[^a-z0-9_.]/g, '') + (nick.length < 3 ? '_7b' : '');
    const sv = epData(3).state;
    this.st = {
      phase: 'intro', el: 0, ev: {}, found: {}, claims: [], fixedSeen: {},
      chats: { n1: [], n2: [], dori: [{ f: 'them', x: 'at Réka\'s till 10. mum\'s on nights again. don\'t eat all the cereal 😤', t: '19:58' }], bence: [{ f: 'them', x: 'ok see u monday', t: '17:20' }], group: [{ f: 'them', w: 'Lili', x: 'who has the maths homework 😭', t: '20:41' }] },
      unread: {}, posts: {}, priv: false, bio: { school: true, bday: true, skate: true, cat: true }, mapVis: 'everyone', camGeo: true, locOn: true, photoLoc: {}, clues: {},
      resp: { shot: false, report: false, reply: 0, told: false, toldFriend: false }, blocked: { n1: false, n2: false }, n2: false, n2At: null, finalAt: null, hints: 0, benchSeen: false, start: Date.now(), batt: 41,
    };
    for (const k of Object.keys(POSTS)) this.st.posts[k] = { arch: false, loc: !!POSTS[k].loc };
    for (const k of Object.keys(PHOTOS)) this.st.photoLoc[k] = !!PHOTOS[k].loc;
    if (sv) { Object.assign(this.st, sv, { start: Date.now() - (sv.elapsedMs || 0) }); if (this.st.phase === 'intro') this.st.phase = 'play'; }
    this.view = { app: 'home' }; this.modal = null; this.typing = null; this.dark = 0; this.tip = '';
  }

  // ---------------- flow ----------------
  async enter() {
    hud(false); this.G.unlock(); music(null);
    const resumed = this.st.phase !== 'intro';
    if (!resumed) {
      await fade(true, 'Saturday, 21:30.\n\nMum is on night shift at the hospital. Your big sister Dóri is at a friend\'s.\nYou\'re in your room, lights off, scrolling.', 0.01);
      await wait(4.5);
    } else await fade(true, '', 0.01);
    this.openPhone();
    loop('room', 'hum', { vol: 0.06, rate: 0.8 });
    music(this.st.el > 400 ? 'mus_tense' : 'mus_dark', 0.22);
    await fade(false, '', 1.2);
    if (!resumed) { this.st.phase = 'play'; this.setTip('Someone may message you tonight. If they seem to know too much, find out how, and lock it down. Hover over dotted words for explanations.'); }
    else this.setTip('Welcome back. The clock was paused while you were away.');
    this.playing = true; this.render();
  }
  resume() { }
  quit() { this.save(); this.playing = false; this.G.goHub(); }
  exit() { this.playing = false; removeEventListener('keydown', this._key, true); closeScreen(this.el); stopLoop('room'); }

  openPhone() {
    const el = this.el = openScreen(`<div class="ep3">
      <div class="phone3" id="ph"><div class="pbar"><span id="pclock"></span><span id="pbatt"></span></div>
        <div class="pscr"><div id="scr"></div><div id="modal3" class="hidden"></div><div id="notif3"></div><div id="full3" class="hidden"></div><div id="dark3"><div class="refl"></div></div><div id="sub3"></div></div>
        <div class="pnav"><button data-act="back" title="Back">◀</button><button data-act="home" title="Home">●</button></div></div>
      <div class="notes3" id="notes"></div></div>`, 'solid');
    el.addEventListener('click', e => {
      const c = e.target.closest('[data-clue]'); if (c) { this.clue(c.dataset.clue); return; }
      const a = e.target.closest('[data-act]'); if (!a || this.st.phase === 'end' && !['wake'].includes(a.dataset.act)) return;
      this.act(a.dataset.act, a.dataset.arg);
    });
    this._key = e => {
      if (e.code !== 'Escape' || S.paused) return;
      e.preventDefault(); e.stopImmediatePropagation();
      if (this.modal) { this.modal = null; this.render(); return; }
      if (this.full) { this.full = null; this.render(); return; }
      if (this.playing && this.st.phase !== 'end') { this.save(); this.G.openPause(); }
    };
    addEventListener('keydown', this._key, true);
  }

  // ---------------- state helpers ----------------
  clock() { const m = 30 + Math.floor(this.st.el / 60); return '21:' + String(Math.min(59, m)).padStart(2, '0'); }
  fixed(k) {
    const s = this.st, p = s.posts;
    switch (k) {
      case 'geotag': return (!s.camGeo || !s.locOn) && (!p.cat.loc || p.cat.arch);
      case 'profile': return s.priv && !s.bio.school && !s.bio.bday;
      case 'checkins': return p.rink1.arch && p.rink2.arch && !s.bio.skate;
      case 'selfie': return p.selfie.arch;
      case 'live': return s.mapVis !== 'everyone' || !s.locOn;
    }
  }
  fixedCount() { return LEAKS.filter(k => this.fixed(k)).length; }
  active() { return this.st.n2 ? 'n2' : 'n1'; }
  finalAt() { return this.st.finalAt != null ? this.st.finalAt : T_END; }
  setTip(t, kind = '') { this.tip = t; this.tipKind = kind; this.renderNotes(); }
  find(k, quiet) {
    if (this.st.found[k]) return;
    this.st.found[k] = true; if (!quiet) { play('paper', { vol: 0.5 }); this.setTip('🔍 Found it: ' + L[k].found + ' Fix: ' + L[k].fix, 'find'); }
    this.save();
  }
  changed() {
    for (const k of LEAKS) {
      const f = this.fixed(k);
      if (f && !this.st.fixedSeen[k]) {
        this.st.fixedSeen[k] = true; this.find(k, true);
        play('latch', { vol: 0.55 });
        const n = this.fixedCount();
        this.setTip(`🔒 Locked: ${L[k].claim.toLowerCase()}. ${n}/5 leaks closed.` + (n === 5 ? ' Everything is locked. Now wait for the last message.' : ''), 'fix');
      } else if (!f && this.st.fixedSeen[k]) this.st.fixedSeen[k] = false;
    }
    if (this.fixedCount() === 5 && this.st.phase === 'play' && this.st.finalAt == null && this.st.el < T_END - 25) this.st.finalAt = this.st.el + 20;
    this.save(); this.render();
  }
  after(sec, f) { this.q.push({ at: this.st.el + sec, f }); }
  say(chat, text, o = {}) {
    const deliver = () => {
      if (this.typing === chat) this.typing = null;
      if ((chat === 'n1' || chat === 'n2') && this.st.blocked[chat]) { return; }
      const m = { f: o.me ? 'me' : 'them', x: text, t: this.clock() }; if (o.img) m.img = o.img; if (o.w) m.w = o.w;
      this.st.chats[chat].push(m);
      if (o.claim && !this.fixed(o.claim) && !this.st.claims.includes(o.claim)) this.st.claims.push(o.claim);
      const viewing = this.view.app === 'chatr' && this.view.chat === chat && !this.dark;
      if (!o.me) {
        if (!viewing) { this.st.unread[chat] = (this.st.unread[chat] || 0) + 1; if (!o.silent) this.notify(chat, text); }
        if (!o.silent) play('beep', { vol: 0.35, rate: chat.startsWith('n') ? 0.82 : 1.25 });
      }
      this.save(); this.render();
    };
    if (o.typing) { this.typing = chat; this.render(); this.after(o.typing, deliver); } else deliver();
  }
  name(chat) { return { n1: 'n1ghtwatch', n2: 'n1ghtwatch_2', dori: 'Dóri 🧡', bence: 'Bence', group: '7.B 💬' }[chat]; }
  notify(chat, text) {
    const n = this.el.querySelector('#notif3'); const d = document.createElement('div');
    d.className = 'nt'; d.dataset.act = 'chat'; d.dataset.arg = chat;
    d.innerHTML = `<b>${esc(this.name(chat))}</b><span>${text.startsWith('[') ? esc(text) : esc(text)}</span>`;
    n.appendChild(d); while (n.children.length > 3) n.removeChild(n.firstChild);
    setTimeout(() => d.remove(), 4500);
  }
  sub(text, dur = 4) {
    const s = this.el.querySelector('#sub3'); s.innerHTML = rich(text); s.classList.add('on');
    clearTimeout(this._subT); this._subT = setTimeout(() => s.classList.remove('on'), dur * 1000);
  }
  save() {
    const st = this.st; if (st.phase === 'intro' || st.phase === 'end') return;
    const { start, ...rest } = st; epData(3).state = { ...rest, elapsedMs: Date.now() - start }; persist();
  }

  // ---------------- timeline ----------------
  timeline() {
    const st = this.st, E = st.ev, t = st.el;
    const once = (k, at, f) => { if (t >= at && !E[k]) { E[k] = true; f(); } };
    const n = this.active();
    if (st.phase === 'play') {
      once('m1', 14, () => this.say(n, 'nice hoodie today 🙂', { typing: 2, claim: 'selfie' }));
      once('m1b', 22, () => this.say(n, 'the bench by the tram stop again?', { typing: 2.5 }));
      once('b1', 45, () => this.say('bence', 'did u see the new 7.B group pic 💀', {}));
      once('m2', 75, () => this.fixed('live') ? this.say(n, 'where did your little dot go? 🙂', { typing: 2 }) : this.say(n, 'still at home? you haven\'t moved since 7 🙂', { typing: 2.5, claim: 'live' }));
      once('g1', 100, () => this.say('group', 'who is n1ghtwatch?? he followed me too', { w: 'Lili' }));
      once('g2', 106, () => this.say('group', 'just block lol', { w: 'Bence', silent: true }));
      once('r1', 112, () => this.reflect('refl_a'));
      once('m3', 140, () => this.fixed('profile') ? this.say(n, 'private now? cute.', { typing: 2 }) : this.say(n, `${this.nick}. 7.B at Platán. 14 on the 14th of March 🎂 almost your birthday 🙂`, { typing: 3, claim: 'profile' }));
      once('burst', 200, () => this.burst());
      once('r2', 245, () => this.reflect('refl_a'));
      once('m4', 262, () => this.fixed('checkins') ? this.say(n, 'no skating pics today? 🙂', { typing: 2 }) : this.say(n, 'skating at 6 again? every Saturday, same place 🙂', { typing: 2.5, claim: 'checkins' }));
      once('b2', 300, () => this.say('bence', 'u coming skating next sat? 6 like always?', {}));
      once('m5', 332, () => this.fixed('geotag') ? this.say(n, 'nice cat. where did your street go? 🙂', { typing: 2 }) : this.say(n, 'say hi to the ginger cat. Hársfa utca is a nice street 🙂', { typing: 3, claim: 'geotag' }));
      once('r3', 368, () => this.reflect('refl_b'));
      once('bench', 400, () => this.benchScare());
      once('r4', 465, () => this.reflect('refl_a'));
      once('dori', 480, () => this.st.resp.told ? this.say('dori', 'on the tram now, 10 min. stay inside, DON\'T reply to him 🧡', {}) : this.say('dori', 'coming home around 10. u ok? you\'re super quiet 🧡', {}));
      once('r5', 560, () => this.reflect('refl_c'));
      if (st.n2At != null && t >= st.n2At && !st.n2) {
        st.n2 = true; this.say('n2', 'new account 🙂 blocking doesn\'t work on me', { typing: 2 });
        this.setTip('A new account. Blocking alone is not enough: report the account, and tell someone you trust.', 'warn');
      }
      if (t >= this.finalAt()) this.finalMessage();
    }
    if (st.phase === 'final') {
      if (t >= st.finalT + 110) this.endSeq('timeout');
    }
  }
  finalMessage() {
    const st = this.st; st.phase = 'final'; st.finalT = st.el; music('mus_tense', 0.3);
    const n = this.active();
    if (st.blocked[n]) {
      this.st.chats[n].push({ f: 'sys', x: '1 message from a blocked account was hidden.', t: this.clock() });
      this.render(); setTimeout(() => this.endSeq('blocked'), 3500); return;
    }
    const open = ['checkins', 'geotag', 'live', 'selfie', 'profile'].filter(k => !this.fixed(k));
    const line = {
      checkins: '6pm at the rink then. see you there 🙂', geotag: 'Hársfa utca 12. the one with the ginger cat 🙂', live: 'your dot is still at home 🙂',
      selfie: 'wear the hoodie on Monday 🙂', profile: 'see you at Platán on Monday, 7.B 🙂',
    };
    if (!open.length) { this.say(n, '…where did you go?', { typing: 3 }); this.after(6, () => this.say(n, 'hello?', { typing: 1.5 })); }
    else { this.say(n, line[open[0]], { typing: 3 }); if (open.length > 1) this.after(6, () => this.say(n, 'you post a lot, you know', { typing: 2 })); }
    this.after(4, () => this.setTip('This was the last message. Now deal with the account: 📸 screenshot, ⚑ report, ⛔ block. And tell someone you trust.', 'warn'));
  }
  burst() {
    const quiet = this.G.quiet(), n = this.active();
    if (this.st.blocked[n]) return;
    const N = quiet ? 3 : 11;
    for (let i = 0; i < N; i++) setTimeout(() => this.say(n, i === N - 1 ? 'why aren\'t you answering' : '🙂', { silent: i < N - 1 && !quiet }), i * (quiet ? 700 : 110));
    if (!quiet) {
      const ph = this.el.querySelector('#ph'); ph.classList.remove('shake'); void ph.offsetWidth; ph.classList.add('shake');
      play('rumble', { vol: 0.9, rate: 2.4 }); play('stinger', { vol: 0.75 }); flash(0.18, 120);
    } else play('beep', { vol: 0.4, rate: 0.8 });
  }
  benchScare() {
    const n = this.active(); if (this.st.blocked[n]) return;
    this.say(n, 'this bench? 🙂', { img: 'bench' });
    if (!this.G.quiet()) {
      this.full = 'bench'; play('stinger', { vol: 0.8 }); play('distort', { vol: 0.5 }); flash(0.3, 160);
    }
    if (!this.st.claims.includes('bench')) this.st.claims.push('bench');
    music('mus_tense', 0.28); this.render();
  }
  reflect(img) {
    if (!A.img[img]) return;
    const d = this.el.querySelector('#dark3'); d.querySelector('.refl').style.backgroundImage = `url(${A.img[img]})`;
    d.classList.remove('lit'); d.classList.add('on'); this.dark = 2.8;
    play('presence', { vol: img === 'refl_a' ? 0.15 : 0.32 });
    if (img !== 'refl_a') play('hum', { vol: 0.2, rate: 0.5 });
  }
  wake() { this.dark = 0; this.el.querySelector('#dark3').classList.remove('on'); }

  // ---------------- input ----------------
  act(a, arg) {
    const st = this.st, v = this.view;
    if (this.dark && a !== 'wake') { this.wake(); }
    play('click', { vol: 0.25 });
    switch (a) {
      case 'wake': this.wake(); return;
      case 'home': this.view = { app: 'home' }; this.modal = null; this.full = null; break;
      case 'back':
        if (this.modal) this.modal = null;
        else if (this.full) this.full = null;
        else if (v.app === 'chatr' && v.chat) { v.chat = null; v.chips = null; }
        else if (v.app === 'pixa' && v.zoom) v.zoom = false;
        else if (v.app === 'pixa' && v.post) v.post = null;
        else if (v.app === 'pixa' && v.stranger) v.stranger = false;
        else if (v.app === 'photos' && v.photo) v.photo = null;
        else if (v.app === 'settings' && v.sub) v.sub = null;
        else this.view = { app: 'home' };
        break;
      case 'app': this.view = { app: arg }; break;
      case 'chat': this.view = { app: 'chatr', tab: 'chats', chat: arg }; st.unread[arg] = 0; break;
      case 'ctab': this.view = { app: 'chatr', tab: arg }; if (arg === 'map') this.find('live'); break;
      case 'vis': st.mapVis = arg; this.changed(); return;
      case 'post': v.post = arg; v.zoom = false; if (arg === 'rink1' || arg === 'rink2') this.find('checkins'); if (arg === 'cat') this.find('geotag'); break;
      case 'zoom': v.zoom = true; break;
      case 'stranger': v.stranger = !v.stranger; v.post = null; if (v.stranger) this.find('profile'); break;
      case 'unloc': st.posts[arg].loc = false; this.changed(); return;
      case 'arch': st.posts[arg].arch = true; v.post = null; v.zoom = false; this.changed(); return;
      case 'bio': this.modal = 'bio'; break;
      case 'biot': st.bio[arg] = !st.bio[arg]; this.changed(); return;
      case 'privacy': this.modal = 'privacy'; break;
      case 'privt': if (!st.priv) { st.priv = true; } else st.priv = false; this.changed(); return;
      case 'photo': v.photo = arg; v.info = false; break;
      case 'info': v.info = !v.info; if (v.info && v.photo === 'cat' || v.info && st.photoLoc[v.photo] && PHOTOS[v.photo].loc === 'Hársfa utca 12') this.find('geotag'); break;
      case 'phunloc': st.photoLoc[arg] = false; this.setTip('Location removed from the copy in your Photos. Careful: copies you already posted keep theirs. Check the post on Pixa too.', ''); this.changed(); return;
      case 'set': v.sub = arg; break;
      case 'tog': st[arg] = !st[arg]; this.changed(); return;
      case 'reply': v.chips = 'reply'; break;
      case 'chipsD': v.chips = 'dori'; break;
      case 'rq': this.reply(+arg); return;
      case 'shot': this.screenshot(); return;
      case 'report': this.modal = 'report'; break;
      case 'rr': this.report(+arg); return;
      case 'block': this.modal = 'block'; break;
      case 'blockyes': this.block(); return;
      case 'dq': this.toDori(+arg); return;
      case 'bq': this.toBence(+arg); return;
      case 'modalx': this.modal = null; break;
      case 'fullx': this.full = null; break;
      case 'img': this.full = arg; break;
      case 'closer': st.benchSeen = true; play('paper', { vol: 0.5 }); this.setTip('Look at the corner: "PanoMap · street view · 2026". It\'s a picture from an online map that anyone can open. He wasn\'t at your stop. He only knows which stop it is.', 'find'); this.save(); break;
      case 'hint': this.hint(); return;
      case 'pause': if (this.playing && st.phase !== 'end') { this.save(); this.G.openPause(); } return;
    }
    this.render();
  }
  clue(id) {
    if (this.st.clues[id]) return;
    this.st.clues[id] = true; play('paper', { vol: 0.4 });
    this.setTip(id === 'crest' ? 'The crest on your PE shirt: PLATÁN SCHOOL. Now they know your school.' : 'Through the window: the tram 14 sign, Platán tér. Your stop is right outside.', 'find');
    if (this.st.clues.crest && this.st.clues.tram) this.find('selfie');
    this.render();
  }
  reply(i) {
    const n = this.active(), st = this.st;
    const opts = ['who is this??', 'leave me alone!!', 'how do you know that'];
    const ans = ['there you are 🙂', 'but you answered 🙂', 'you told me. you tell everyone 🙂'];
    st.resp.reply++; this.view.chips = null;
    this.say(n, opts[i], { me: true });
    this.say(n, ans[i], { typing: 2.5 });
    this.after(3, () => this.setTip('Replying shows them they reached you, and they will keep going. Don\'t reply: screenshot, report, block.', 'warn'));
  }
  screenshot() {
    const st = this.st; st.resp.shot = true;
    play('press', { vol: 0.6, rate: 1.6 });
    const s = this.el.querySelector('.pscr'); s.classList.remove('snap'); void s.offsetWidth; s.classList.add('snap');
    this.setTip('📸 Screenshot saved. If you report it or tell an adult, this is your evidence.', 'fix'); this.save(); this.render();
  }
  report(i) {
    const st = this.st; st.resp.report = true; st.resp.reason = i; this.modal = 'reported'; play('latch', { vol: 0.4 });
    this.save(); this.render();
  }
  block() {
    const st = this.st, n = this.active(); st.blocked[n] = true; this.modal = null;
    if (n === 'n1' && !st.savedMsg) { st.savedMsg = true; st.chats[n].push({ f: 'them', x: 'no problem. I saved everything already 🙂 nice crest btw', t: this.clock() }); }
    st.chats[n].push({ f: 'sys', x: `You blocked ${this.name(n)}.`, t: this.clock() });
    play('denied', { vol: 0.4 });
    if (!st.resp.shot) this.setTip('Blocked. Next time, take a screenshot first: blocking can hide the messages you need as evidence.', 'warn');
    if (st.phase === 'final') { this.save(); this.render(); setTimeout(() => this.endSeq('blocked'), 2500); return; }
    if (n === 'n1' && st.n2At == null) st.n2At = st.el + 40;
    else if (st.resp.shot) this.setTip('Blocked. Keep your screenshots. Did you report the account and tell someone?', '');
    this.save(); this.render();
  }
  toDori(i) {
    const st = this.st; this.view.chips = null;
    if (i === 0) {
      st.resp.told = true;
      this.say('dori', 'someone I don\'t know is sending me creepy stuff 😟 they know where I live', { me: true });
      this.say('dori', 'ok. DON\'T reply to them. screenshot everything, report, block.', { typing: 3 });
      this.after(6, () => this.say('dori', 'I\'m leaving Réka\'s now, home in 15 min. texting mum too. you did the right thing telling me 🧡', { typing: 2.5 }));
      this.after(10, () => this.setTip('Telling someone you trust was the right call. You don\'t have to handle this alone.', 'fix'));
    } else {
      this.say('dori', 'nothing, all good', { me: true });
      this.say('dori', 'ok 👍', { typing: 2 });
    }
  }
  toBence(i) {
    const st = this.st; this.view.chips = null; st.resp.toldFriend = true;
    this.say('bence', 'some n1ghtwatch account keeps messaging me. creepy', { me: true });
    this.say('bence', 'same guy who followed Lili?? just block him lol', { typing: 2 });
    this.after(5, () => this.say('bence', 'or tell ur sister maybe. my brother reported one like that once', { typing: 2 }));
  }
  hint() {
    const st = this.st; st.hints++; play('paper', { vol: 0.4 });
    if (st.phase === 'final') {
      const n = this.active();
      const miss = !st.resp.shot ? '📸 Take a screenshot (in the chat).' : !st.resp.report ? '⚑ Report the account (in the chat).' : !st.resp.told ? '🧡 Tell Dóri (Chatr › Dóri).' : !st.blocked[n] ? '⛔ Block the account.' : 'You did everything. Wait a moment.';
      this.setTip('Hint: ' + miss, 'hint'); return;
    }
    const order = st.claims.filter(k => LEAKS.includes(k)).concat(LEAKS.filter(k => !st.claims.includes(k)));
    const k = order.find(x => !this.fixed(x));
    if (!k) { this.setTip('Hint: all five leaks are locked. Wait for the last message, then screenshot, report and block.', 'hint'); return; }
    const pre = st.claims.includes(k) ? '' : 'He hasn\'t mentioned this one yet, but it\'s there: ';
    this.setTip('Hint: ' + pre + (st.found[k] ? L[k].fix : L[k].find), 'hint');
  }

  // ---------------- rendering ----------------
  render() {
    if (!this.el) return;
    const st = this.st, v = this.view;
    const scr = this.el.querySelector('#scr');
    let html = '';
    if (v.app === 'home') html = this.rHome();
    if (v.app === 'chatr') html = this.rChatr();
    if (v.app === 'pixa') html = this.rPixa();
    if (v.app === 'photos') html = this.rPhotos();
    if (v.app === 'settings') html = this.rSettings();
    scr.innerHTML = html;
    const m = scr.querySelector('.cmsgs'); if (m) m.scrollTop = m.scrollHeight;
    const md = this.el.querySelector('#modal3'); md.classList.toggle('hidden', !this.modal); md.innerHTML = this.modal ? this.rModal() : '';
    const fl = this.el.querySelector('#full3'); fl.classList.toggle('hidden', !this.full);
    if (this.full) fl.innerHTML = `<div class="fimg">${ART.bench()}</div>${st.benchSeen ? '<div class="fnote">PanoMap street view: a public map photo. Not taken tonight.</div>' : '<button class="b3" data-act="closer">🔍 Look closer</button>'}<button class="b3 ghost" data-act="fullx">Close</button>`;
    this.renderNotes(); this.renderBar();
  }
  renderBar() {
    if (!this.el) return;
    this.el.querySelector('#pclock').textContent = this.clock();
    this.el.querySelector('#pbatt').textContent = '▮▮▮ ' + Math.round(this.st.batt) + '%';
  }
  rHome() {
    const un = ['n1', 'n2', 'dori', 'bence', 'group'].reduce((a, k) => a + (this.st.unread[k] || 0), 0);
    const icon = (id, e, n, c, b) => `<button class="app3" data-act="app" data-arg="${id}"><span class="ic" style="background:${c}">${e}${b ? `<i>${b}</i>` : ''}</span><span>${n}</span></button>`;
    return `<div class="home3"><div class="hclock">${this.clock()}</div><div class="hdate">Saturday</div>
      <div class="apps3">${icon('chatr', '💬', 'Chatr', '#2b62d9', un)}${icon('pixa', '📷', 'Pixa', '#c2417a')}${icon('photos', '🖼️', 'Photos', '#d9902b')}${icon('settings', '⚙️', 'Settings', '#555a66')}</div></div>`;
  }
  rChatr() {
    const st = this.st, v = this.view;
    if (v.chat) return this.rChat(v.chat);
    const tabs = `<div class="tabs3"><button data-act="ctab" data-arg="chats" class="${v.tab !== 'map' ? 'on' : ''}">Chats</button><button data-act="ctab" data-arg="map" class="${v.tab === 'map' ? 'on' : ''}">Map</button></div>`;
    if (v.tab === 'map') {
      const opt = (k, l) => `<button class="vis ${st.mapVis === k ? 'on' : ''}" data-act="vis" data-arg="${k}">${l}</button>`;
      const off = !st.locOn;
      return `<div class="ahead">Chatr</div>${tabs}<div class="mapwrap">${ART.map(off ? 'me' : st.mapVis, this.nick)}</div>
        <div class="mapctl"><div class="sm">${off ? 'Location services are off. Nobody can see you.' : st.mapVis === 'everyone' ? '🌍 Your live location is visible to <b>Everyone</b> (anyone on Chatr, 312 people near you).' : st.mapVis === 'close' ? '💚 Visible to your <b>Close friends</b> (3 people).' : '👻 <b>Only me</b>: nobody can see your dot.'}</div>
        <div class="visrow">${opt('everyone', 'Everyone')}${opt('close', 'Close friends')}${opt('me', 'Only me')}</div></div>`;
    }
    const chats = ['n2', 'n1', 'dori', 'bence', 'group'].filter(k => k !== 'n2' || st.n2);
    const row = k => {
      const m = st.chats[k][st.chats[k].length - 1]; const u = st.unread[k] || 0;
      const prev = this.typing === k ? '<i>typing…</i>' : m ? esc((m.f === 'me' ? 'You: ' : m.w ? m.w + ': ' : '') + (m.img ? '📷 Photo' : m.x)) : '';
      const av = k.startsWith('n') ? '<span class="av3 unk">?</span>' : `<span class="av3" style="background:${{ dori: '#c96a2b', bence: '#2b8ac9', group: '#6a4bc4' }[k]}">${this.name(k)[0]}</span>`;
      return `<button class="crow" data-act="chat" data-arg="${k}">${av}<span class="cmid"><b>${esc(this.name(k))}${st.blocked[k] ? ' <small>(blocked)</small>' : ''}</b><small>${prev}</small></span>${u ? `<i class="bd">${u}</i>` : ''}</button>`;
    };
    return `<div class="ahead">Chatr</div>${tabs}<div class="clist">${chats.filter(k => st.chats[k].length || k === 'n1').map(row).join('')}</div>`;
  }
  rChat(k) {
    const st = this.st, v = this.view;
    const last = st.chats[k].length - 1;
    const ms = st.chats[k].map((m, i) => {
      if (m.f === 'sys') return `<div class="bub sys">${esc(m.x)}</div>`;
      const body = m.img ? `<div class="bimg" data-act="img" data-arg="${m.img}">${ART.bench()}</div>${esc(m.x)}` : esc(m.x);
      return `<div class="bub ${m.f}${i === last && this._lastAnim !== k + last ? ' new' : ''}">${m.w ? `<b>${esc(m.w)}</b>` : ''}${body}<small>${m.t}</small></div>`;
    }).join('') + ((this._lastAnim = k + last), '') + (this.typing === k ? '<div class="bub them typing"><span>•</span><span>•</span><span>•</span></div>' : '');
    let foot = '';
    if (k === 'n1' || k === 'n2') {
      if (st.blocked[k]) foot = `<div class="cfoot sm">You blocked this account.</div>`;
      else if (v.chips === 'reply') foot = `<div class="cfoot chips">${['who is this??', 'leave me alone!!', 'how do you know that'].map((t, i) => `<button data-act="rq" data-arg="${i}">${t}</button>`).join('')}<button class="ghost" data-act="back">Cancel</button></div>`;
      else foot = `<div class="cfoot acts"><button data-act="reply">💬 Reply</button><button data-act="shot">📸 Screenshot</button><button data-act="report">⚑ Report</button><button data-act="block" class="red">⛔ Block</button></div>`;
    } else if (k === 'dori' && !st.resp.told) {
      foot = v.chips === 'dori' ? `<div class="cfoot chips"><button data-act="dq" data-arg="0">someone I don't know is sending me creepy stuff 😟</button><button data-act="dq" data-arg="1">nothing, all good</button></div>`
        : `<div class="cfoot"><button class="wide" data-act="chipsD">Write to Dóri…</button></div>`;
    } else if (k === 'bence' && !st.resp.toldFriend) {
      foot = `<div class="cfoot chips"><button data-act="bq" data-arg="0">some n1ghtwatch account keeps messaging me</button></div>`;
    } else foot = `<div class="cfoot sm">…</div>`;
    const sub = k.startsWith('n') ? 'Not in your contacts · account created 3 weeks ago' : k === 'dori' ? 'your sister' : k === 'group' ? '27 members' : 'classmate';
    return `<div class="chead"><button data-act="back">◀</button><span><b>${esc(this.name(k))}</b><small>${this.typing === k ? 'typing…' : sub}</small></span></div><div class="cmsgs">${ms}</div>${foot}`;
  }
  rPixa() {
    const st = this.st, v = this.view;
    if (v.post) return this.rPost(v.post);
    const bio = BIO.filter(([k]) => st.bio[k]).map(([, t]) => esc(t)).join('<br>') || '<span class="sm">(no bio)</span>';
    const visible = POST_ORDER.filter(k => !st.posts[k].arch);
    const grid = (st.priv && v.stranger) ? `<div class="lockmsg">🔒 This account is private.<br><small>Follow to see their photos.</small></div>`
      : `<div class="grid3">${visible.map(k => `<button class="gcell" data-act="post" data-arg="${k}">${POSTS[k].art()}${st.posts[k].loc && POSTS[k].loc ? '<i>📍</i>' : ''}</button>`).join('')}${visible.length ? '' : '<p class="sm">No posts.</p>'}</div>`;
    return `<div class="ahead pixa">Pixa</div>
      ${v.stranger ? '<div class="strbar">👁 Viewing as a stranger: this is what <b>anyone</b> can see.</div>' : ''}
      <div class="pxhead"><span class="av3 big" style="background:#c2417a">${esc(this.nick[0].toUpperCase())}</span><div><b>${esc(this.handle)}</b><div class="sm">${visible.length} posts · 312 followers · ${st.priv ? '🔒 Private' : '🌐 Public'}</div></div></div>
      <div class="bio3"><b>${esc(this.nick)}</b><br>${bio}</div>
      <div class="pxbtns"><button data-act="stranger" class="${v.stranger ? 'on' : ''}">👁 ${v.stranger ? 'Back to my view' : 'View as stranger'}</button>${v.stranger ? '' : '<button data-act="bio">✏️ Edit bio</button><button data-act="privacy">⚙️ Privacy</button>'}</div>
      ${grid}`;
  }
  rPost(k) {
    const st = this.st, v = this.view, P = POSTS[k], p = st.posts[k];
    if (v.zoom) {
      let s = ART.selfie(true);
      for (const id of ['crest', 'tram']) if (st.clues[id]) s = s.replace(`class="clue" data-clue="${id}"`, `class="clue got" data-clue="${id}"`);
      return `<div class="chead"><button data-act="back">◀</button><span><b>Zoom</b><small>Tap anything a stranger could use to find you.</small></span></div>
        <div class="zoom3">${s}</div><div class="sm pad">Clues found: ${['crest', 'tram'].filter(c => st.clues[c]).length}/2</div>`;
    }
    return `<div class="chead"><button data-act="back">◀</button><span><b>${esc(this.handle)}</b><small>${p.loc && P.loc ? '📍 ' + esc(P.loc) : '&nbsp;'}</small></span></div>
      <div class="pimg">${P.art()}</div>
      <div class="pmeta">♥ ${P.likes} · ${esc(P.date)}<br><b>${esc(this.handle)}</b> ${esc(P.cap)}${P.comment ? `<br><span class="cm"><b>${P.comment[0]}</b> ${P.comment[1]}</span>` : ''}</div>
      <div class="pacts">${k === 'selfie' ? '<button data-act="zoom">🔍 Zoom in</button>' : ''}${p.loc && P.loc ? `<button data-act="unloc" data-arg="${k}">📍 Remove location</button>` : ''}<button data-act="arch" data-arg="${k}">🗄️ Archive post <small>(hide from profile)</small></button></div>`;
  }
  rPhotos() {
    const st = this.st, v = this.view, ids = Object.keys(PHOTOS);
    if (v.photo) {
      const ph = PHOTOS[v.photo], has = st.photoLoc[v.photo];
      const info = v.info ? `<div class="pinfo"><div>📅 ${esc(ph.date)}</div><div>📱 Phone camera, back</div>${has ? `<div>📍 <b>${esc(ph.loc)}</b><br><small>GPS ${ph.gps}</small></div><div class="minimap">${ART.map('everyone', this.nick)}</div><button data-act="phunloc" data-arg="${v.photo}">Remove location from this photo</button>` : '<div>📍 No location saved</div>'}</div>` : '';
      return `<div class="chead"><button data-act="back">◀</button><span><b>Photo</b><small>${esc(ph.date)}</small></span><button data-act="info" class="ibtn ${v.info ? 'on' : ''}">ⓘ Info</button></div><div class="pimg">${POSTS[v.photo].art()}</div>${info}`;
    }
    return `<div class="ahead">Photos</div><div class="grid3">${ids.map(k => `<button class="gcell" data-act="photo" data-arg="${k}">${POSTS[k].art()}</button>`).join('')}</div><p class="sm pad">Tap a photo, then ⓘ to see its details.</p>`;
  }
  rSettings() {
    const st = this.st, v = this.view;
    const tog = (k, l, d) => `<div class="srow"><span>${l}${d ? `<small>${d}</small>` : ''}</span><div class="toggle ${st[k] ? 'on' : ''}" data-act="tog" data-arg="${k}" role="switch"></div></div>`;
    if (v.sub === 'cam') return `<div class="chead"><button data-act="back">◀</button><span><b>Camera</b></span></div>${tog('camGeo', rich('Save location in photos ([[geotag]])'), 'Adds GPS coordinates to every photo you take. Apps that post the photo can read them.')}<p class="sm pad">Photos you already took keep their location. Remove it in Photos (ⓘ) and on every post.</p>`;
    if (v.sub === 'loc') return `<div class="chead"><button data-act="back">◀</button><span><b>Location</b></span></div>${tog('locOn', 'Location services', 'Lets apps use GPS. Turning this off stops all of them.')}
      <div class="srow col"><b>Apps using your location</b><small>📷 Camera: while using · saves it in photos</small><small>💬 Chatr: always · shown on Chatr Map</small><small>📷 Pixa: while using · adds 📍 to posts</small></div><p class="sm pad">Who sees your dot on the map is set in Chatr › Map.</p>`;
    return `<div class="ahead">Settings</div><button class="srow link" data-act="set" data-arg="loc"><span>📍 Location</span><span>›</span></button><button class="srow link" data-act="set" data-arg="cam"><span>📷 Camera</span><span>›</span></button><div class="srow"><span>🔔 Notifications</span><span class="sm">On</span></div><div class="srow"><span>🌙 Dark mode</span><span class="sm">On</span></div>`;
  }
  rModal() {
    const st = this.st, m = this.modal, n = this.active();
    if (m === 'bio') return `<div class="mdl"><h4>Edit bio</h4><p class="sm">Tap a line to remove it or put it back. Your bio is visible to everyone, even on a private account.</p>${BIO.map(([k, t]) => `<button class="chip ${st.bio[k] ? 'on' : 'off'}" data-act="biot" data-arg="${k}">${st.bio[k] ? '✓' : '✗'} ${esc(t)}</button>`).join('')}<button class="b3" data-act="modalx">Save</button></div>`;
    if (m === 'privacy') return `<div class="mdl"><h4>Account privacy</h4><div class="srow"><span>${rich('[[privateacc|Private account]]')}<small>Only followers you approve can see your posts.</small></span><div class="toggle ${st.priv ? 'on' : ''}" data-act="privt" role="switch"></div></div><p class="sm">Your name, photo and bio are still public.</p><button class="b3" data-act="modalx">Done</button></div>`;
    if (m === 'report') return `<div class="mdl"><h4>Report ${esc(this.name(n))}</h4><p class="sm">Why are you reporting this account?</p>${['Spam', 'Pretending to be someone else', 'Creepy or threatening messages (harassment)', 'I just don\'t like them'].map((t, i) => `<button class="chip" data-act="rr" data-arg="${i}">${t}</button>`).join('')}<button class="b3 ghost" data-act="modalx">Cancel</button></div>`;
    if (m === 'reported') return `<div class="mdl"><h4>Thanks for reporting</h4><p>${st.resp.reason === 2 ? 'Chatr will review the account.' : 'Chatr will review the account. (The best reason here was "Creepy or threatening messages": it gets reviewed faster.)'} ${esc(this.name(n))} won't know who reported them.</p><p class="sm">Keep your screenshots. You can block them now too.</p><button class="b3" data-act="modalx">OK</button></div>`;
    if (m === 'block') return `<div class="mdl"><h4>Block ${esc(this.name(n))}?</h4><p class="sm">They won't be able to message you or see your profile. ${st.resp.shot ? '' : 'Tip: take a screenshot first, so you keep the evidence.'}</p><button class="b3 red" data-act="blockyes">Block</button><button class="b3 ghost" data-act="modalx">Cancel</button></div>`;
    return '';
  }
  renderNotes() {
    if (!this.el) return;
    const st = this.st, nt = this.el.querySelector('#notes');
    const left = this.finalAt() - st.el;
    const rows = [];
    for (const k of st.claims) {
      if (k === 'bench') { rows.push(`<div class="claim ${st.benchSeen ? 'ok' : ''}"><b>Sent a photo of your tram stop</b><small>${st.benchSeen ? '🔍 A street-view picture from an online map. He wasn\'t there.' : '❓ Did he really take it? Look closer.'}</small></div>`); continue; }
      rows.push(this.claimRow(k));
    }
    for (const k of LEAKS) if (!st.claims.includes(k) && (st.found[k] || this.fixed(k))) rows.push(this.claimRow(k, true));
    const shown = LEAKS.filter(k => st.claims.includes(k) || st.found[k] || this.fixed(k)).length;
    const n = this.active();
    const resp = (st.phase === 'final' || st.blocked.n1 || st.resp.shot || st.resp.report) ? `<h4>Dealing with the account</h4><div class="resp">
      <span class="${st.resp.shot ? 'y' : ''}">📸 Screenshot</span><span class="${st.resp.report ? 'y' : ''}">⚑ Report</span><span class="${st.blocked[n] ? 'y' : ''}">⛔ Block</span><span class="${st.resp.told ? 'y' : ''}">🧡 Tell someone</span><span class="${st.resp.reply ? 'x' : 'y'}">🤐 Don't reply</span></div>` : '';
    nt.innerHTML = `<div class="nh"><span class="cd">${st.phase === 'play' ? '⏳ ' + mmss(left) : st.phase === 'final' ? '⌛ 0:00' : '⏳ ' + mmss(left)}</span><small>${st.phase === 'play' ? 'until the last message' : 'the last message is here'}</small></div>
      <div class="lk">Leaks locked: <b>${this.fixedCount()}/5</b></div>
      <h4>What do they know?</h4>${rows.join('') || '<p class="sm">Nothing yet. Just a normal Saturday.</p>'}
      ${shown < 5 && st.phase === 'play' ? `<div class="claim unk"><b>${5 - shown} more leak${5 - shown > 1 ? 's' : ''} hidden in your accounts</b><small>Check before he finds them.</small></div>` : ''}
      ${resp}
      <div class="tip3 ${this.tipKind || ''}">${rich(this.tip || '')}</div>
      <div class="nbtns"><button class="btn small" data-act="hint">💡 Hint</button><button class="btn small" data-act="pause">⏸ Pause</button></div>`;
  }
  claimRow(k, unsaid) {
    const st = this.st, f = this.fixed(k), fd = st.found[k];
    return `<div class="claim ${f ? 'ok' : fd ? 'fd' : ''}"><b>${unsaid ? '(not mentioned) ' : ''}${L[k].claim}</b><small>${f ? '🔒 Locked.' : fd ? '🔍 ' + esc(L[k].found) + '<br><u>Fix:</u> ' + esc(L[k].fix) : '❓ How? Check your apps.'}</small></div>`;
  }

  // ---------------- ending ----------------
  async endSeq(why) {
    if (this.st.phase === 'end') return;
    const st = this.st; st.phase = 'end'; this.modal = null; this.full = null; this.render();
    const quiet = this.G.quiet();
    await wait(2);
    play('latch', { vol: 0.6 }); this.sub('[the front door of the flat opens and closes]', 3.5);
    await wait(2.5);
    this.reflect('refl_b'); this.dark = 999;
    await wait(1.4);
    play('knock', { vol: quiet ? 0.5 : 0.9 }); this.sub('[knock knock, on your bedroom door]', 3);
    await wait(2.6);
    this.sub('"It\'s me! Can I come in?" (Dóri)', 3.2);
    await wait(2.6);
    play('switch_on', { vol: 0.7 });
    const d = this.el.querySelector('#dark3'); d.querySelector('.refl').style.backgroundImage = `url(${A.img.refl_a})`; d.classList.add('lit');
    this.sub('The light comes on. The doorway is empty except for Dóri, and your hoodie on the door hook.', 5);
    await wait(4.5);
    this.sub(st.resp.told ? 'Dóri: "Show me everything. We\'ll check it all together, and call Mum."' : 'Dóri: "Why are you sitting in the dark? …Wait. Who\'s that? Show me."', 5);
    await wait(4.5);
    const good = this.fixedCount() === 5 && st.resp.report && st.resp.told;
    stopLoop('room');
    await fade(true, good ? 'End of episode 3.\n\nThe account is reported and blocked. Your dot is grey. Your posts say a lot less.' : 'End of episode 3.\n\nSome of your posts still say too much. You know how to fix them now, and you are not alone with it.', 1.5);
    await wait(2.6);
    this.playing = false; closeScreen(this.el); this.el = null; removeEventListener('keydown', this._key, true);
    const secs = Math.round((Date.now() - st.start) / 1000);
    const dd = epData(3); dd.done = true; dd.state = null; dd.best = dd.best ? Math.min(dd.best, secs) : secs; persist();
    music('mus_debrief', 0.45);
    await fade(false, '', 0.5);
    const stats = [`Leaks locked: ${this.fixedCount()}/5`, `Screenshot: ${st.resp.shot ? 'yes' : 'no'}`, `Reported: ${st.resp.report ? 'yes' : 'no'}`, `Blocked: ${st.blocked.n1 || st.blocked.n2 ? 'yes' : 'no'}`, `Replied to him: ${st.resp.reply ? st.resp.reply + '×' : 'no, well done'}`, `Told Dóri: ${st.resp.told ? 'yes' : 'no'}`, `Hints: ${st.hints}`];
    const nx = await debriefScreen(DEBRIEF_EP3, stats, this.G.nextLabel(3));
    await fade(true, '', 0.6);
    if (nx === 'next') { await this.G.goNext(3); await fade(false, '', 0.8); return; }
    await this.G.goHub();
    await fade(false, '', 0.8);
  }

  // ---------------- loop ----------------
  update(dt) {
    if (!this.playing || !this.el) return;
    const st = this.st;
    if (st.phase === 'play' || st.phase === 'final') {
      st.el += dt; st.batt = Math.max(9, st.batt - dt * 0.012);
      for (const j of this.q.filter(j => st.el >= j.at)) { this.q.splice(this.q.indexOf(j), 1); j.f(); }
      this.timeline();
    }
    if (this.dark > 0 && this.dark < 900) { this.dark -= dt; if (this.dark <= 0) this.wake(); }
    this._t = (this._t || 0) + dt;
    if (this._t > 0.5) { this._t = 0; this.renderBar(); const cd = this.el && this.el.querySelector('#notes .cd'); if (cd && st.phase === 'play') cd.textContent = '⏳ ' + mmss(this.finalAt() - st.el); }
    this._sv = (this._sv || 0) + dt; if (this._sv > 5) { this._sv = 0; this.save(); }
  }
}
