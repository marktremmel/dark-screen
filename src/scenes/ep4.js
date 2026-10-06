// Episode 4: "A csoportchat" (The group chat). Screenlife on a laptop desktop.
import * as THREE from 'three';
import { fade, flash, wait } from '../core/hud.js';
import { hud } from '../core/hud.js';
import { music, play, loop, stopLoop } from '../core/audio.js';
import { S, epData, persist } from '../core/state.js';
import { DEBRIEF_EP4, rich } from '../text.js';
import { openScreen, closeScreen, debriefScreen } from '../ui/screens.js';
import * as ART from './ep4art.js';

const T_END = 600;   // 21:00, "the video"
const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const mmss = s => { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
const EVID = { meme: 'The meme about Lili', lonely: '"add her friends… oh wait"', video: 'The 21:00 video threat', threat: 'szellem_7b\'s DM to you', turn: 'The edited photo of you' };
const CHATS = ['real', 'cls', 'lili', 'ghost', 'bence', 'mum'];
const NAMES = { real: '7.B (real) 🔥', cls: '7.B 💬', lili: 'Lili', ghost: 'szellem_7b', bence: 'Bence', mum: 'Mum 🧡' };
const COLS = { Lili: '#c96a9a', Bence: '#2b8ac9', Anna: '#3a9a6a', Dani: '#c9902b', Máté: '#5a7a5a', Zsófi: '#8a5ac4', Réka: '#c94a4a', Mum: '#c96a2b' };

export class Ep4 {
  constructor(G) { this.G = G; this.epN = 4; this.updateWhileOverlay = true; this.playing = false; this.quitLabel = 'Back to the lab (progress saved)'; this.q = []; }

  async build() {
    this.scene = new THREE.Scene(); this.scene.background = new THREE.Color(0x020203);
    this.nick = (S.nick || 'Me').replace(/[<>]/g, '');
    const sv = epData(4).state;
    this.st = {
      phase: 'intro', el: 0, ev: {}, mid: 1, unread: {}, shots: {}, evid: {}, joined: 0, spoke: false, lili: 'none', liliStage: 0,
      reported: { group: false, ghost: false, reason: null }, told: { teacher: false, teacherEv: 0, mum: false }, clues: {}, sawGhost: false, exposed: false,
      inGroup: true, muted: false, readRcpt: true, addAny: true, blockedGhost: false, bence: 'none', hints: 0, finalAt: null, outcome: null, start: Date.now(),
      chats: { real: [], cls: [], lili: [], ghost: [], bence: [], mum: [] },
    };
    const c = this.st.chats, m = (f, w, x, t, o = {}) => ({ id: this.st.mid++, f, w, x, t, ...o });
    c.cls.push(m('them', 'Máté', 'i\'m {definately} coming to the concert 🎸', 'Wed 18:02', { clue: 'mate' }), m('them', 'Lili', 'I\'m singing the second song, pls don\'t laugh 🙈', 'Wed 18:05'),
      m('them', 'Anna', 'you\'ll be great!!', 'Wed 18:06'), m('them', 'Réka', 'homework for monday = p. 47?', '20:31'));
    c.lili.push(m('them', 'Lili', 'thanks for saving me a seat today 🙂', '14:10'));
    c.bence.push(m('them', 'Bence', 'u done with maths?', '19:40'), m('me', '', 'almost', '19:52'));
    c.mum.push(m('them', 'Mum', 'night shift tonight 🏥 pizza in the freezer, don\'t stay up too late. love you', '18:30'));
    if (sv) { Object.assign(this.st, sv, { start: Date.now() - (sv.elapsedMs || 0) }); if (this.st.phase === 'intro') this.st.phase = 'play'; }
    this.win = null; this.chat = null; this.modal = null; this.full = null; this.typing = {}; this.tip = ''; this.chips = null;
  }

  // ---------------- flow ----------------
  async enter() {
    hud(false); this.G.unlock(); music(null);
    const resumed = this.st.phase !== 'intro';
    if (!resumed) {
      await fade(true, 'Friday, 20:50.\n\nMum is on night shift. Homework done.\nYour laptop keeps buzzing: the class chat is louder than usual tonight.', 0.01);
      await wait(4.5);
    } else await fade(true, '', 0.01);
    this.open();
    loop('fan4', 'fan', { vol: 0.07, rate: 1.3 });
    music(this.st.el > 330 ? 'mus_tense' : 'mus_dark', 0.2);
    await fade(false, '', 1.2);
    if (!resumed) { this.st.phase = 'play'; this.setTip('Use the mouse. Open Chatr on the laptop. Hover over dotted words for explanations.'); }
    else this.setTip('Welcome back. The clock was paused while you were away.');
    this.playing = true; this.render();
  }
  resume() { }
  quit() { this.save(); this.playing = false; this.G.goHub(); }
  exit() { this.playing = false; removeEventListener('keydown', this._key, true); closeScreen(this.el); stopLoop('fan4'); }

  open() {
    const el = this.el = openScreen(`<div class="ep4">
      <div class="laptop4" id="lap"><div class="cam4"></div><div class="lscr" id="lscr">
        <div class="mbar4"><span>◉ Files  Edit  View</span><span id="lclock"></span></div>
        <div class="desk4" id="desk"></div><div id="win4"></div><div id="modal4" class="hidden"></div><div id="full4" class="hidden"></div><div id="toast4"></div>
        <div class="dock4"><button data-act="open" data-arg="chatr" title="Chatr"><span style="background:#2b62d9">💬</span><i id="dockbadge"></i></button><button data-act="open" data-arg="portal" title="Iskolaportál"><span style="background:#2c7a5a">🏫</span></button></div>
      </div></div>
      <div class="notes3" id="notes"></div></div>`, 'solid');
    el.addEventListener('click', e => {
      if (this.st.phase === 'end') return;
      const c = e.target.closest('[data-clue]'); if (c) { this.clue(c.dataset.clue); return; }
      const a = e.target.closest('[data-act]'); if (!a) return;
      this.act(a.dataset.act, a.dataset.arg, a);
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

  // ---------------- helpers ----------------
  clock() { const m = 50 + Math.floor(this.st.el / 60); return m >= 60 ? 'Fri 21:' + String(Math.min(59, m - 60)).padStart(2, '0') : 'Fri 20:' + m; }
  hm() { return this.clock().slice(4); }
  finalAt() { return this.st.finalAt != null ? this.st.finalAt : T_END; }
  evCount() { return Object.keys(this.st.evid).length; }
  clueCount() { return Object.keys(this.st.clues).length; }
  setTip(t, kind = '') { this.tip = t; this.tipKind = kind; this.renderNotes(); }
  after(sec, f) { this.q.push({ at: this.st.el + sec, f }); }
  save() {
    const st = this.st; if (st.phase === 'intro' || st.phase === 'end') return;
    const { start, ...rest } = st; epData(4).state = { ...rest, elapsedMs: Date.now() - start }; persist();
  }
  // post a message; o.typing = seconds of "typing…" first
  say(chat, who, text, o = {}) {
    const deliver = () => {
      delete this.typing[chat];
      if (chat === 'real' && !this.st.inGroup && !o.force) return;
      if (chat === 'ghost' && this.st.blockedGhost) return;
      const m = { id: this.st.mid++, f: o.me ? 'me' : o.sys ? 'sys' : 'them', w: who, x: text, t: this.hm() };
      for (const k of ['img', 'ev', 'clue', 'react', 'seen']) if (o[k] != null) m[k] = o[k];
      this.st.chats[chat].push(m);
      const viewing = this.win === 'chatr' && this.chat === chat;
      if (!o.me && !o.sys) {
        if (!viewing) this.st.unread[chat] = (this.st.unread[chat] || 0) + 1;
        if (!o.silent && !(chat === 'real' && this.st.muted)) { play('beep', { vol: 0.3, rate: chat === 'ghost' ? 0.75 : 1.1 + Math.random() * 0.2 }); if (!viewing) this.toast(chat, who, text); }
      }
      this.save(); this.render();
    };
    if (o.typing) { this.typing[chat] = who; this.render(); this.after(o.typing, deliver); } else deliver();
  }
  toast(chat, who, text) {
    const n = this.el.querySelector('#toast4'); const d = document.createElement('div');
    d.className = 'nt'; d.dataset.act = 'chat'; d.dataset.arg = chat;
    d.innerHTML = `<b>${esc(NAMES[chat])}</b><span>${chat === 'real' || chat === 'cls' ? esc(who) + ': ' : ''}${esc(text.replace(/[{}]/g, ''))}</span>`;
    n.appendChild(d); while (n.children.length > 3) n.removeChild(n.firstChild);
    setTimeout(() => d.remove(), 4500);
  }

  // ---------------- timeline ----------------
  timeline() {
    const st = this.st, t = st.el, E = st.ev;
    const once = (k, at, f) => { if (t >= at && !E[k]) { E[k] = true; f(); } };
    const R = (who, x, o = {}) => this.say('real', who, x, o);
    if (st.phase !== 'play') return;
    once('add', 5, () => { this.st.chats.real.push({ id: st.mid++, f: 'sys', x: 'szellem_7b created the group "7.B (real) 🔥" and added you and 23 others. Lili is not in this group.', t: this.hm() }); this.toast('real', 'szellem_7b', 'added you to "7.B (real) 🔥"'); play('beep', { vol: 0.35 }); this.render(); });
    once('g1', 14, () => R('szellem_7b', 'ok now we can talk 😎 no Lili here', { typing: 2 }));
    once('g2', 22, () => R('szellem_7b', '', { img: 'meme', ev: 'meme', react: 11 }));
    once('g3', 27, () => R('Dani', '💀💀💀'));
    once('g4', 31, () => R('Zsófi', 'LMAOOO who made this'));
    once('g5', 36, () => R('szellem_7b', 'it\'s {definately} the best thing ive seen 💀 add her friends too… oh wait 🙃', { typing: 2, clue: 'spell', ev: 'lonely' }));
    once('g6', 46, () => R('szellem_7b', 'at 21:00 I post the concert video. sped up 🐿️ stay tuned', { typing: 2.5, ev: 'video' }));
    once('obj', 50, () => this.setTip('21:00: "the video". Lili doesn\'t even know. What can you do in 10 minutes? The notebook lists ideas.', 'warn'));
    once('b1', 62, () => this.say('bence', 'Bence', 'bro just put a 😂 everyone did lol', {}));
    once('g7', 80, () => R('Réka', `@${this.nick} you're quiet 👀`, { typing: 1.5 }));
    once('g8', 86, () => R('szellem_7b', `${this.nick} has seen it. ${this.st.readRcpt ? 'Seen by 24 ✓✓' : '…or hiding their ticks 🙂'}`, { typing: 2 }));
    once('l1', 110, () => { if (st.liliStage !== 0) return; st.liliStage = 1; this.say('lili', 'Lili', 'hey… is there a new 7.B group? everyone\'s acting weird and I\'m not in it', { typing: 2.5 }); });
    once('d1', 142, () => this.say('ghost', 'szellem_7b', this.st.readRcpt ? 'I see you read everything 👀 one 😂 in the group and you\'re safe' : 'hiding your read ticks? cute. one 😂 in the group and you\'re safe', { typing: 3, ev: 'threat' }));
    once('g9', 170, () => R('Máté', 'she\'s gonna cry on monday lol', { typing: 1.5 }));
    once('storm', 200, () => this.storm());
    once('d2', 252, () => { if (this.st.shots && Object.keys(this.st.shots).length) this.say('ghost', 'szellem_7b', 'taking screenshots? 🙂 I know.', { typing: 2.5 }); });
    once('g10', 285, () => { for (let i = 0; i < 3; i++) this.st.chats.real.push({ id: st.mid++, f: 'sys', x: 'This message was deleted.', t: this.hm() }); this.render(); });
    once('turn', 330, () => this.yourTurn());
    once('l2', 360, () => { if (st.lili === 'kind' || st.lili === 'cold') { st.liliStage = 2; this.say('lili', 'Lili', 'everyone has seen it, right?', { typing: 3 }); } });
    once('g11', 420, () => R('Zsófi', 'ok this is getting a bit much', { typing: 2 }));
    once('d3', 470, () => this.say('ghost', 'szellem_7b', '2 more minutes 🐿️', { typing: 1.5 }));
    once('up', 540, () => R('szellem_7b', 'uploading… ▓▓▓▓▓▓░░░ 63%', { typing: 1 }));
    if (t >= this.finalAt()) this.final();
  }
  storm() {
    const quiet = this.G.quiet(), chat = this.st.inGroup ? 'real' : 'ghost';
    const who = ['Dani', 'Réka', 'Zsófi', 'Máté', 'szellem_7b', 'Dani', 'Réka', 'Bence', 'Máté', 'szellem_7b', 'Zsófi', 'Dani'];
    const N = quiet ? 3 : who.length;
    for (let i = 0; i < N; i++) setTimeout(() => this.say(chat, chat === 'ghost' ? 'szellem_7b' : who[i], i === N - 1 ? `say something @${this.nick} 👀` : `@${this.nick}`, { silent: i < N - 1 && !quiet }), i * (quiet ? 600 : 120));
    if (!quiet) {
      const l = this.el.querySelector('#lap'); l.classList.remove('glitch'); void l.offsetWidth; l.classList.add('glitch');
      play('rumble', { vol: 0.9, rate: 2.2 }); play('stinger', { vol: 0.75 }); flash(0.18, 120);
    } else play('beep', { vol: 0.4, rate: 0.8 });
    setTimeout(() => { this.typing.real = 'Bence, Dani, Réka and 19 others'; this.render(); }, N * (quiet ? 600 : 120) + 200);
    this.after(7, () => { delete this.typing.real; this.render(); });
  }
  yourTurn() {
    const st = this.st, target = st.joined > 0 ? 'Bence' : this.nick;
    st.target = target;
    if (!st.inGroup) { this.say('ghost', 'szellem_7b', `left the group? doesn't matter. next one is about ${target === 'Bence' ? 'Bence' : 'you'} 🤡`, { typing: 2 }); return; }
    this.say('real', 'szellem_7b', `your turn @${target} 🤡`, { img: 'turn', ev: 'turn', react: 6 });
    if (!this.G.quiet()) { this.full = 'turn'; play('stinger', { vol: 0.8 }); play('distort', { vol: 0.45 }); flash(0.28, 150); }
    music('mus_tense', 0.26);
    if (target === 'Bence') this.after(8, () => { st.bence = 'target'; this.say('bence', 'Bence', 'wtf why me 😟 I just did what everyone did', { typing: 2 }); this.setTip('Joining in didn\'t keep anyone safe. Now Bence is the target.', 'warn'); });
    else this.after(5, () => this.setTip('Now it\'s you. This is how it feels, and why the person who is targeted needs people on their side.', 'warn'));
    this.render();
  }
  checkStop() {
    const st = this.st;
    if (st.phase === 'play' && st.finalAt == null && (st.reported.group || st.reported.ghost) && st.told.teacherEv >= 2 && st.el < T_END - 30) {
      st.finalAt = Math.max(st.el + 25, 400);
      this.setTip('Ms Varga and Chatr\'s safety team know, and they have your evidence. Reviewing a report takes a few minutes. Meanwhile: is anyone else in this who needs you?', 'fix');
    }
  }
  final() {
    const st = this.st; st.phase = 'final'; st.finalT = st.el;
    const stopped = (st.reported.group || st.reported.ghost) && st.told.teacherEv >= 2;
    st.outcome = stopped ? 'stopped' : st.reported.group || st.reported.ghost ? 'removed' : 'posted';
    const sys = (c, x) => { st.chats[c].push({ id: st.mid++, f: 'sys', x, t: this.hm() }); };
    if (stopped) {
      sys('real', 'This group has been suspended: it broke Chatr\'s rules on bullying.'); sys('ghost', 'This account is no longer available.');
      play('latch', { vol: 0.6 }); this.toast('real', 'Chatr', 'A group you were in has been suspended.');
    } else {
      st.inGroup ? this.say('real', 'szellem_7b', '🐿️🎤', { img: 'video', react: 14, force: true }) : sys('real', 'szellem_7b posted a video. (You left this group, but 23 people saw it.)');
      play('stinger', { vol: 0.5 });
      if (st.outcome === 'removed') this.after(12, () => { sys('real', 'The video was removed after reports. 19 people had already watched it.'); play('latch', { vol: 0.5 }); this.render(); });
    }
    this.render();
    this.after(stopped ? 6 : 16, () => this.endSeq());
  }

  // ---------------- input ----------------
  act(a, arg, node) {
    const st = this.st;
    play('click', { vol: 0.22 });
    switch (a) {
      case 'open': this.win = arg; this.chips = null; if (arg === 'portal') this.ptab = this.ptab || 'inbox'; break;
      case 'close': this.win = null; break;
      case 'chat': this.win = 'chatr'; this.chat = arg; this.chips = null; this.info = false; st.unread[arg] = 0; break;
      case 'csettings': this.chat = null; this.cset = !this.cset; break;
      case 'info': this.info = !this.info; break;
      case 'shot': this.shot(+arg); return;
      case 'react': this.react(+arg); return;
      case 'fwd': this.modal = 'fwd'; this.fwdId = +arg; break;
      case 'fwdyes': st.joined++; this.modal = null; this.say('bence', '', '↪ forwarded a photo', { me: true }); this.after(2, () => this.say('bence', 'Bence', '💀💀', {})); this.setTip('Forwarding spreads it further. Every share is another person who sees Lili like this.', 'warn'); return;
      case 'chips': this.chips = arg; break;
      case 'g': this.groupSay(+arg); return;
      case 'lq': this.liliSay(+arg); return;
      case 'bq': this.benceSay(+arg); return;
      case 'mq': this.mumSay(); return;
      case 'gq': this.ghostSay(+arg); return;
      case 'report': this.modal = 'report'; this.repWhat = arg; break;
      case 'rr': st.reported[this.repWhat] = true; st.reported.reason = +arg; this.modal = 'reported'; play('latch', { vol: 0.4 }); this.checkStop(); this.save(); break;
      case 'leave': this.modal = 'leave'; break;
      case 'leaveyes': st.inGroup = false; this.modal = null; st.chats.real.push({ id: st.mid++, f: 'sys', x: 'You left the group.', t: this.hm() }); this.setTip(this.evCount() < 2 ? 'You left. Fair enough, but the group still exists, and you didn\'t keep much evidence.' : 'You left the group, with your screenshots saved. The group still exists, though.', ''); this.save(); break;
      case 'mute': st.muted = !st.muted; break;
      case 'block': st.blockedGhost = true; st.chats.ghost.push({ id: st.mid++, f: 'sys', x: 'You blocked szellem_7b.', t: this.hm() }); if (!st.reported.ghost) this.setTip('Blocked. Blocking protects you, but report the account too, so Chatr can stop it for everyone.', ''); this.save(); break;
      case 'tog': st[arg] = !st[arg]; if (arg === 'readRcpt' && !st.readRcpt) this.setTip('Read receipts off: people can no longer see when you\'ve read their messages. Less pressure to answer.', 'fix'); this.save(); break;
      case 'prof': this.modal = 'prof'; this.profOf = arg; if (arg === 'szellem_7b') st.sawGhost = true; if (arg === 'Máté' && st.sawGhost) this.clue('sticker'); break;
      case 'ptab': this.ptab = arg; break;
      case 'pto': this.pTo = arg; break;
      case 'pb': this.pBody = this.pBody || {}; this.pBody[arg] = !this.pBody[arg]; break;
      case 'pa': this.pAtt = this.pAtt || {}; this.pAtt[arg] = !this.pAtt[arg]; break;
      case 'psend': this.sendTeacher(); return;
      case 'modalx': this.modal = null; break;
      case 'fullx': this.full = null; break;
      case 'img': this.full = arg; break;
      case 'hint': this.hint(); return;
      case 'pause': if (this.playing && st.phase !== 'end') { this.save(); this.G.openPause(); } return;
    }
    this.render();
  }
  findMsg(id) { for (const c of CHATS) { const m = this.st.chats[c].find(x => x.id === id); if (m) return m; } }
  shot(id) {
    const st = this.st, m = this.findMsg(id); if (!m || st.shots[id]) return;
    st.shots[id] = true; play('press', { vol: 0.6, rate: 1.6 });
    const s = this.el.querySelector('#lscr'); s.classList.remove('snap'); void s.offsetWidth; s.classList.add('snap');
    if (m.ev && !st.evid[m.ev]) { st.evid[m.ev] = true; this.setTip(`📸 Saved as evidence: ${EVID[m.ev]}. (${this.evCount()} so far)`, 'fix'); }
    else this.setTip('📸 Screenshot saved. This one isn\'t very useful as evidence, though.', '');
    this.save(); this.render();
  }
  react(id) {
    const st = this.st, m = this.findMsg(id); if (!m) return;
    st.joined++; m.react = (m.react || 0) + 1; m.mine = true;
    this.after(2, () => this.say('real', 'szellem_7b', `see, ${this.nick} gets it 😎`, { typing: 1.5 }));
    this.setTip(`You reacted 😂. Twenty-four people can see it, and Lili will see it on Monday.`, 'warn');
    this.save(); this.render();
  }
  groupSay(i) {
    const st = this.st; this.chips = null;
    if (i === 0) { st.joined++; this.say('real', '', '😂😂😂', { me: true }); this.say('real', 'szellem_7b', `see, ${this.nick} gets it 😎`, { typing: 2 }); this.setTip('Laughing along is joining in. It tells the person running this that it works.', 'warn'); }
    if (i === 1) {
      st.spoke = true; this.say('real', '', 'guys, this isn\'t funny. stop.', { me: true });
      this.say('real', 'szellem_7b', 'ok mum 🙄', { typing: 2 });
      this.after(6, () => this.say('real', 'Anna', '…yeah tbh it\'s kinda mean', { typing: 2 }));
      this.after(10, () => this.say('real', 'Dani', 'ya ok. not funny anymore', { typing: 2 }));
      this.after(12, () => this.setTip('Speaking up is hard. Often others were thinking the same, and once one person says it, they follow.', 'fix'));
    }
    if (i === 2) {
      st.exposed = true; this.say('real', '', 'it\'s Máté, isn\'t it? 👀', { me: true });
      this.say('real', 'Zsófi', 'MÁTÉ?? 💀💀', { typing: 1.5 }); this.after(4, () => this.say('real', 'Dani', 'lol get him 🔥', { typing: 1 }));
      this.after(7, () => this.say('real', 'Máté', 'it wasn\'t only me!!', { typing: 2 }));
      this.after(9, () => this.setTip('Now the pile-on has a new target. Names belong with an adult who can act, not in the group.', 'warn'));
    }
    this.save();
  }
  liliSay(i) {
    const st = this.st; this.chips = null;
    if (st.liliStage === 0) {
      st.lili = 'kind'; st.liliStage = 1.5;
      this.say('lili', '', 'hey… there\'s a new group without you. they\'re posting mean stuff. I\'m sorry. I\'m saving screenshots and telling Ms Varga', { me: true });
      this.say('lili', 'Lili', 'wait what?? …ok. thank you for telling me. please don\'t let them post the concert video 😢', { typing: 3 });
      this.after(6, () => this.setTip('Telling Lili the truth, kindly, means she isn\'t the last to know. And she knows someone is on her side.', 'fix'));
    } else if (st.liliStage <= 1) {
      const t = ['yes. they\'re posting mean stuff about you. I\'m so sorry. I\'m saving screenshots and telling Ms Varga', 'idk 🤷', 'it\'s just a joke lol, chill'][i];
      const r = ['…oh. thank you for telling me. please don\'t let them post the concert video 😢', 'ok…', 'wow. ok.'][i];
      st.lili = ['kind', 'cold', 'mean'][i]; if (i === 2) st.joined++;
      st.liliStage = 1.5; this.say('lili', '', t, { me: true }); this.say('lili', 'Lili', r, { typing: 2.5 });
      if (i === 2) this.after(4, () => { st.chats.lili.push({ id: st.mid++, f: 'sys', x: 'Lili is offline.', t: this.hm() }); this.render(); });
      if (i === 0) this.after(5, () => this.setTip('Telling Lili the truth, kindly, means she isn\'t the last to know. And she knows someone is on her side.', 'fix'));
    } else if (st.liliStage === 2) {
      const t = ['not everyone. lots of people think it\'s mean. you didn\'t do anything wrong 🧡', 'yeah pretty much'][i];
      st.liliStage = 3; if (i === 0) st.lili = 'kind'; else if (st.lili !== 'kind') st.lili = 'cold';
      this.say('lili', '', t, { me: true }); this.say('lili', 'Lili', i === 0 ? 'thank you. I\'m staying at my nan\'s this weekend. can I sit with you on monday?' : 'great.', { typing: 3 });
    }
    this.save();
  }
  benceSay(i) {
    const st = this.st; this.chips = null;
    if (st.bence === 'target') {
      st.bence = 'helped'; this.say('bence', '', 'I\'m sorry. it\'s not ok. I\'m reporting it and telling Ms Varga', { me: true }); this.say('bence', 'Bence', 'thx. I\'ll take mine back too. that was dumb', { typing: 2 }); return;
    }
    if (i === 0) { st.bence = 'no'; this.say('bence', '', 'nah, it\'s mean. not doing it', { me: true }); this.say('bence', 'Bence', 'ok fair… I kinda already did 😬', { typing: 2 }); }
    else { st.bence = 'yes'; st.joined++; this.say('bence', '', '😂 ok fine', { me: true }); this.say('real', '', '😂', { me: true }); this.setTip('Peer pressure works fast. One emoji, and you are part of the group doing it.', 'warn'); }
    this.save();
  }
  mumSay() {
    const st = this.st; this.chips = null; st.told.mum = true;
    this.say('mum', '', 'Mum, something bad is happening in my class group. they\'re bullying Lili', { me: true });
    this.say('mum', 'Mum', 'oh no. are you ok? I\'m at work till 6 and can\'t call now 😟', { typing: 3 });
    this.after(7, () => this.say('mum', 'Mum', 'write to Ms Varga in the school portal tonight, with screenshots. the school has to know. we\'ll talk at breakfast 🧡', { typing: 3 }));
    this.save();
  }
  ghostSay(i) {
    const st = this.st; this.chips = null; st.replied = (st.replied || 0) + 1;
    this.say('ghost', '', ['who are you??', 'leave Lili alone'][i], { me: true });
    this.say('ghost', 'szellem_7b', ['someone in your class 🙂 guess', 'make me 🙂'][i], { typing: 2.5 });
    this.after(4, () => this.setTip('Arguing with an anonymous account gives it what it wants: attention. Save it, report it, tell an adult.', 'warn'));
    this.save();
  }
  clue(id) {
    const st = this.st; if (st.clues[id]) return;
    st.clues[id] = true; play('paper', { vol: 0.45 });
    const tx = { spell: 'szellem_7b writes "definately", with an a. Who else spells it like that?', mate: 'Máté wrote "definately" in the class group on Wednesday. Same mistake.', sticker: 'Máté\'s profile picture: a skateboard with a yellow lightning sticker. Exactly like szellem_7b\'s picture.' }[id];
    this.setTip('🔍 ' + tx + (this.clueCount() >= 2 ? ' That\'s a good guess about who runs the account. Tell an adult, not the group.' : ''), 'find');
    this.save(); this.render();
  }
  sendTeacher() {
    const st = this.st, att = Object.keys(this.pAtt || {}).filter(k => this.pAtt[k] && st.evid[k]);
    const body = Object.keys(this.pBody || {}).filter(k => this.pBody[k]);
    if (!body.length && !att.length) { this.setTip('Choose at least one line or attach a screenshot first.', 'hint'); return; }
    st.told.teacher = true; st.told.to = this.pTo || 'varga';
    st.told.teacherEv = Math.max(st.told.teacherEv, att.length); st.told.named = st.told.named || body.includes('who');
    play('beep', { vol: 0.4, rate: 1.3 }); this.ptab = 'inbox'; this.pBody = {}; this.pAtt = {};
    st.portal = st.portal || [];
    st.portal.push({ me: true, t: this.hm(), x: `Sent with ${att.length} screenshot${att.length === 1 ? '' : 's'}.` });
    const who = st.told.to === 'szabo' ? 'Mr Szabó (school counsellor)' : 'Ms Varga (class teacher)';
    this.after(14, () => {
      st.portal.push({ me: false, w: who, t: this.hm(), x: att.length >= 2 ? 'Thank you for telling me. That was brave, and right. I\'m contacting Chatr\'s safety team and Lili\'s parents now. Please don\'t reply in the group, and don\'t delete your screenshots.' : 'Thank you for telling me. Can you send screenshots of the messages? Without them it\'s harder to act quickly.' });
      play('beep', { vol: 0.45, rate: 1.2 }); this.toastPortal(who); this.checkStop(); this.save(); this.render();
    });
    this.setTip('Sent. Adults can do what you can\'t: contact parents, the platform, the school.', 'fix');
    this.checkStop(); this.save(); this.render();
  }
  toastPortal(who) { const n = this.el.querySelector('#toast4'); const d = document.createElement('div'); d.className = 'nt'; d.dataset.act = 'open'; d.dataset.arg = 'portal'; d.innerHTML = `<b>🏫 Iskolaportál</b><span>New message from ${esc(who)}</span>`; n.appendChild(d); setTimeout(() => d.remove(), 5000); }
  hint() {
    const st = this.st; st.hints++; play('paper', { vol: 0.4 });
    let h;
    if (this.evCount() < 2) h = 'Hover over a message in "7.B (real)" and press 📸 to keep it as evidence. The meme and the video threat are the most important.';
    else if (st.lili === 'none' && st.liliStage >= 1) h = 'Lili messaged you. Answer her honestly and kindly.';
    else if (!st.reported.group && !st.reported.ghost) h = 'Report the group: open "7.B (real)", press ⓘ in the top right, then ⚑ Report.';
    else if (st.told.teacherEv < 2) h = 'Open Iskolaportál on the dock, write to Ms Varga and attach at least two screenshots.';
    else if (this.clueCount() < 2) h = 'Optional: who is szellem_7b? Look at how they spell, and at profile pictures (click a name).';
    else h = 'You\'ve done what you can. Wait for 21:00.';
    this.setTip('Hint: ' + h, 'hint');
  }

  // ---------------- rendering ----------------
  render() {
    if (!this.el) return;
    const st = this.st;
    this.el.querySelector('#desk').innerHTML = `<div class="dicons"><button data-act="open" data-arg="chatr"><span style="background:#2b62d9">💬</span>Chatr</button><button data-act="open" data-arg="portal"><span style="background:#2c7a5a">🏫</span>Iskolaportál</button></div>`;
    const w = this.el.querySelector('#win4');
    w.innerHTML = this.win === 'chatr' ? this.rChatr() : this.win === 'portal' ? this.rPortal() : '';
    const m = w.querySelector('.cmsgs'); if (m) m.scrollTop = m.scrollHeight;
    const md = this.el.querySelector('#modal4'); md.classList.toggle('hidden', !this.modal); md.innerHTML = this.modal ? this.rModal() : '';
    const fl = this.el.querySelector('#full4'); fl.classList.toggle('hidden', !this.full);
    if (this.full) fl.innerHTML = `<div class="fimg">${this.img(this.full)}</div><button class="b3 ghost" data-act="fullx">Close</button>`;
    const un = CHATS.reduce((a, k) => a + (st.unread[k] || 0), 0);
    this.el.querySelector('#dockbadge').textContent = un || ''; this.el.querySelector('#dockbadge').style.display = un ? '' : 'none';
    this.renderBar(); this.renderNotes();
  }
  renderBar() { if (this.el) this.el.querySelector('#lclock').textContent = '🔋 ' + Math.max(12, Math.round(68 - this.st.el / 30)) + '%   ' + this.clock(); }
  img(k) { return k === 'meme' ? ART.meme() : k === 'turn' ? ART.yourTurn(this.st.target || this.nick, this.st.target === 'Bence' ? '#2b5a8a' : '#7a1f2b') : k === 'video' ? ART.videoThumb(true) : ''; }
  av(w, small) {
    if (w === 'szellem_7b') return `<span class="av4 ${small ? 'sm' : ''}">${ART.ghostAvatar()}</span>`;
    if (w === 'Máté') return `<span class="av4 ${small ? 'sm' : ''}">${ART.mateAvatar()}</span>`;
    return `<span class="av4 ${small ? 'sm' : ''}" style="background:${COLS[w] || '#555'}">${esc((w || '?')[0])}</span>`;
  }
  txt(m) {
    let s = esc(m.x);
    if (m.clue) s = s.replace(/\{([^}]+)\}/, `<span class="clue4 ${this.st.clues[m.clue] ? 'got' : ''}" data-clue="${m.clue}">$1</span>`);
    return s.replace(/[{}]/g, '');
  }
  rChatr() {
    const st = this.st;
    const list = CHATS.map(k => {
      const ms = st.chats[k], last = ms[ms.length - 1], u = st.unread[k] || 0;
      const prev = this.typing[k] ? '<i>typing…</i>' : last ? esc((last.f === 'me' ? 'You: ' : last.f === 'sys' ? '' : (k === 'real' || k === 'cls') ? last.w + ': ' : '') + (last.img ? '📷 Photo' : last.x.replace(/[{}]/g, ''))) : '';
      const av = k === 'real' ? '<span class="av4" style="background:#a2321e">🔥</span>' : k === 'cls' ? '<span class="av4" style="background:#6a4bc4">7B</span>' : k === 'ghost' ? this.av('szellem_7b') : this.av(k === 'mum' ? 'Mum' : NAMES[k]);
      return `<button class="crow ${this.chat === k ? 'on' : ''}" data-act="chat" data-arg="${k}">${av}<span class="cmid"><b>${esc(NAMES[k])}</b><small>${prev}</small></span>${u ? `<i class="bd">${u}</i>` : ''}</button>`;
    }).join('');
    let right = '<div class="empty4">Choose a chat.</div>';
    if (this.cset && !this.chat) right = this.rSettings();
    else if (this.chat) right = this.rChat(this.chat);
    return `<div class="win4 chatr"><div class="wbar"><span>💬 Chatr</span><button data-act="close">✕</button></div><div class="wbody"><div class="clist4"><div class="lhead"><b>Chats</b><button data-act="csettings" title="Settings">⚙</button></div>${list}</div><div class="cpane">${right}</div></div></div>`;
  }
  rSettings() {
    const st = this.st;
    const tog = (k, l, d) => `<div class="srow"><span>${l}<small>${d}</small></span><div class="toggle ${st[k] ? 'on' : ''}" data-act="tog" data-arg="${k}" role="switch"></div></div>`;
    return `<div class="chead"><span><b>Settings</b><small>Privacy</small></span></div><div class="pad4">${tog('readRcpt', rich('[[readreceipt|Read receipts]]'), 'Others can see when you\'ve read their messages (✓✓).')}${tog('addAny', 'Anyone can add me to groups', 'Off: only your contacts can add you.')}</div>`;
  }
  rChat(k) {
    const st = this.st, ms = st.chats[k], grp = k === 'real' || k === 'cls';
    const rows = ms.map(m => {
      if (m.f === 'sys') return `<div class="bub sys">${esc(m.x)}</div>`;
      const body = (m.img ? `<div class="bimg4" data-act="img" data-arg="${m.img}">${this.img(m.img)}</div>` : '') + (m.x ? this.txt(m) : '');
      const tools = m.f === 'them' && (k === 'real' || k === 'ghost') ? `<span class="tools4"><button data-act="shot" data-arg="${m.id}" class="${st.shots[m.id] ? 'done' : ''}" title="Screenshot">📸</button>${m.img ? `<button data-act="react" data-arg="${m.id}" title="React">😂</button><button data-act="fwd" data-arg="${m.id}" title="Forward">↪</button>` : ''}</span>` : '';
      const react = m.react ? `<span class="rx4 ${m.mine ? 'mine' : ''}">😂 ${m.react}</span>` : '';
      return `<div class="mrow ${m.f}">${m.f === 'them' && grp ? `<button class="avb" data-act="prof" data-arg="${esc(m.w)}">${this.av(m.w, true)}</button>` : ''}<div class="bub ${m.f}">${m.f === 'them' && grp ? `<b data-act="prof" data-arg="${esc(m.w)}">${esc(m.w)}</b>` : ''}${body}<small>${m.t}${m.f === 'me' && st.readRcpt ? ' ✓✓' : ''}</small>${react}</div>${tools}</div>`;
    }).join('') + (this.typing[k] ? `<div class="bub them typing">${grp ? `<b>${esc(this.typing[k])}</b>` : ''}<span>•</span><span>•</span><span>•</span></div>` : '');
    const chip = (act, arg, l, cls = '') => `<button class="${cls}" data-act="${act}" data-arg="${arg}">${l}</button>`;
    let foot = '<div class="cfoot sm">…</div>';
    if (k === 'real') {
      if (!st.inGroup) foot = '<div class="cfoot sm">You left this group.</div>';
      else if (this.chips === 'g') foot = `<div class="cfoot chips">${chip('g', 0, '😂😂😂')}${st.spoke ? '' : chip('g', 1, 'guys, this isn\'t funny. stop.')}${this.clueCount() >= 2 && !st.exposed ? chip('g', 2, 'it\'s Máté, isn\'t it? 👀') : ''}${chip('chips', '', 'Cancel', 'ghost')}</div>`;
      else foot = `<div class="cfoot">${chip('chips', 'g', '💬 Write in the group…', 'wide')}</div>`;
    }
    if (k === 'lili') {
      if (st.liliStage === 1) foot = `<div class="cfoot chips">${chip('lq', 0, 'yes. they\'re posting mean stuff about you. I\'m so sorry. I\'m saving screenshots and telling Ms Varga')}${chip('lq', 1, 'idk 🤷')}${chip('lq', 2, 'it\'s just a joke lol, chill')}</div>`;
      else if (st.liliStage === 2) foot = `<div class="cfoot chips">${chip('lq', 0, 'not everyone. lots of people think it\'s mean. you didn\'t do anything wrong 🧡')}${chip('lq', 1, 'yeah pretty much')}</div>`;
      else if (st.liliStage === 0 && st.el > 50) foot = `<div class="cfoot chips">${chip('lq', 0, 'hey… there\'s a new group without you. they\'re posting mean stuff. I\'m sorry. I\'m saving screenshots and telling Ms Varga')}</div>`;
    }
    if (k === 'bence') {
      if (st.bence === 'target') foot = `<div class="cfoot chips">${chip('bq', 0, 'I\'m sorry. it\'s not ok. I\'m reporting it and telling Ms Varga')}</div>`;
      else if (st.bence === 'none' && st.ev.b1) foot = `<div class="cfoot chips">${chip('bq', 0, 'nah, it\'s mean. not doing it')}${chip('bq', 1, '😂 ok fine')}</div>`;
    }
    if (k === 'mum' && !st.told.mum) foot = `<div class="cfoot chips">${chip('mq', 0, 'Mum, something bad is happening in my class group. they\'re bullying Lili')}</div>`;
    if (k === 'ghost') {
      if (st.blockedGhost) foot = '<div class="cfoot sm">You blocked this account.</div>';
      else if (this.chips === 'gq') foot = `<div class="cfoot chips">${chip('gq', 0, 'who are you??')}${chip('gq', 1, 'leave Lili alone')}${chip('chips', '', 'Cancel', 'ghost')}</div>`;
      else if (ms.length) foot = `<div class="cfoot acts">${chip('chips', 'gq', '💬 Reply')}${chip('report', 'ghost', '⚑ Report')}${chip('block', '', '⛔ Block', 'red')}</div>`;
    }
    const sub = { real: `${st.inGroup ? 24 : 23} members · ${this.typing.real ? esc(this.typing.real) + ' typing…' : 'created today by szellem_7b'}`, cls: '27 members', lili: 'classmate', ghost: 'not in your contacts · joined 2 days ago', bence: 'classmate', mum: 'at work' }[k];
    const info = k === 'real' && this.info ? `<div class="ginfo"><b>Group info</b><small>24 members. Lili is not in this group.</small>${chip('report', 'group', st.reported.group ? '⚑ Reported ✓' : '⚑ Report group')}${chip('mute', '', st.muted ? '🔔 Unmute' : '🔕 Mute')}${st.inGroup ? chip('leave', '', '🚪 Leave group', 'red') : ''}</div>` : '';
    return `<div class="chead"><span><b>${esc(NAMES[k])}</b><small>${sub}</small></span>${k === 'real' ? `<button class="ibtn ${this.info ? 'on' : ''}" data-act="info">ⓘ</button>` : ''}${k === 'ghost' ? `<button class="ibtn" data-act="prof" data-arg="szellem_7b">Profile</button>` : ''}</div>${info}<div class="cmsgs">${rows}</div>${foot}`;
  }
  rPortal() {
    const st = this.st, tab = this.ptab || 'inbox';
    let body = '';
    if (tab === 'inbox') {
      const msgs = [{ w: 'Ms Varga (class teacher)', t: 'Thu 16:20', x: 'Concert rehearsal moves to Tuesday, 14:00. Well done everyone on Wednesday!' }].concat(st.portal || []);
      body = msgs.map(m => `<div class="pmsg ${m.me ? 'me' : ''}"><b>${m.me ? 'You' : esc(m.w)}</b> <small>${m.t}</small><div>${esc(m.x)}</div></div>`).join('');
    } else {
      const to = this.pTo || 'varga', pb = this.pBody || {}, pa = this.pAtt || {};
      const lines = [['group', 'There is a new group, "7.B (real)", without Lili. They post memes about her.'], ['video', 'An account says they will post a video of Lili at 21:00 tonight.'], ['acct', 'The account is called szellem_7b.']];
      if (this.clueCount() >= 2) lines.push(['who', 'I think it might be Máté: same spelling mistakes and the same sticker in the profile picture.']);
      const ev = Object.keys(EVID).filter(k => st.evid[k]);
      body = `<div class="pform"><label>To</label><div class="prow">${[['varga', 'Ms Varga (class teacher)'], ['szabo', 'Mr Szabó (school counsellor)']].map(([k, l]) => `<button class="chip ${to === k ? 'on' : 'off2'}" data-act="pto" data-arg="${k}">${l}</button>`).join('')}</div>
        <label>Subject</label><div class="pval">Something is happening in an online class group</div>
        <label>Message <small>(choose lines)</small></label>${lines.map(([k, l]) => `<button class="chip ${pb[k] ? 'on' : 'off2'}" data-act="pb" data-arg="${k}">${pb[k] ? '✓' : '+'} ${esc(l)}</button>`).join('')}
        <label>Attach screenshots</label>${ev.length ? ev.map(k => `<button class="chip ${pa[k] ? 'on' : 'off2'}" data-act="pa" data-arg="${k}">${pa[k] ? '📎' : '+'} ${esc(EVID[k])}</button>`).join('') : '<div class="sm">No evidence screenshots yet. Use 📸 on messages in Chatr.</div>'}
        <button class="b3" data-act="psend">Send</button></div>`;
    }
    return `<div class="win4 portal"><div class="wbar"><span>🏫 Iskolaportál · Platán School</span><button data-act="close">✕</button></div><div class="wbody"><div class="pnav4"><button data-act="ptab" data-arg="inbox" class="${tab === 'inbox' ? 'on' : ''}">📥 Inbox</button><button data-act="ptab" data-arg="new" class="${tab === 'new' ? 'on' : ''}">✏️ New message</button></div><div class="pmain">${body}</div></div></div>`;
  }
  rModal() {
    const st = this.st, m = this.modal;
    if (m === 'report') return `<div class="mdl"><h4>Report ${this.repWhat === 'group' ? 'the group "7.B (real) 🔥"' : 'szellem_7b'}</h4><p class="sm">What's wrong?</p>${['Spam', 'Bullying or harassment', 'Pretending to be someone', 'I just don\'t like it'].map((t, i) => `<button class="chip" data-act="rr" data-arg="${i}">${t}</button>`).join('')}<button class="b3 ghost" data-act="modalx">Cancel</button></div>`;
    if (m === 'reported') return `<div class="mdl"><h4>Thanks for reporting</h4><p>${st.reported.reason === 1 ? 'Chatr\'s safety team will review it.' : 'Chatr will review it. ("Bullying or harassment" is the best reason here: those reports are reviewed first.)'} Nobody will know who reported.</p><button class="b3" data-act="modalx">OK</button></div>`;
    if (m === 'leave') return `<div class="mdl"><h4>Leave "7.B (real) 🔥"?</h4><p class="sm">You won't get new messages. ${this.evCount() < 2 ? 'You haven\'t saved much evidence yet.' : ''} Leaving doesn't stop the group.</p><button class="b3 red" data-act="leaveyes">Leave</button><button class="b3 ghost" data-act="modalx">Cancel</button></div>`;
    if (m === 'fwd') return `<div class="mdl"><h4>Forward to…</h4><button class="chip" data-act="fwdyes">Bence</button><button class="b3 ghost" data-act="modalx">Cancel</button></div>`;
    if (m === 'prof') {
      const w = this.profOf, g = w === 'szellem_7b';
      const bio = g ? 'just for fun 👻 · joined 2 days ago · no real name' : w === 'Máté' ? 'skate or die 🛹 · 7.B · robotics club' : w === 'Lili' ? '🎤 · 7.B' : '7.B';
      return `<div class="mdl"><div class="pbig">${this.av(w)}</div><h4>${esc(w)}</h4><p class="sm">${esc(bio)}</p>${g ? '<p class="sm">Anonymous accounts feel untraceable, but the app knows which phone and email made them.</p>' : ''}<button class="b3" data-act="modalx">Close</button></div>`;
    }
    return '';
  }
  renderNotes() {
    if (!this.el) return;
    const st = this.st, nt = this.el.querySelector('#notes'), left = this.finalAt() - st.el;
    const row = (ok, bad, t, s) => `<div class="claim ${ok ? 'ok' : bad ? 'bad' : ''}"><b>${t}</b><small>${s}</small></div>`;
    const ev = this.evCount();
    const told = st.told.teacher ? (st.told.teacherEv >= 2 ? `Told ${st.told.to === 'szabo' ? 'Mr Szabó' : 'Ms Varga'}, with ${st.told.teacherEv} screenshots.` : 'Told the school, but without enough screenshots.') : st.told.mum ? 'Told Mum. She says: tell the school.' : 'Not yet.';
    const rows = st.ev.obj ? [
      row(ev >= 3, false, `📸 Evidence saved: ${ev}`, ev >= 3 ? 'Enough to show an adult.' : 'Aim for 3. Use 📸 on the worst messages.'),
      row(st.lili === 'kind', st.lili === 'mean', '🧡 Lili', { none: 'She doesn\'t know yet.', kind: 'She knows someone is on her side.', cold: 'You answered, but not really.', mean: 'You called it a joke.' }[st.lili]),
      row(st.joined === 0, st.joined > 0, `🙅 Joined in: ${st.joined}`, st.joined ? 'Reactions, laughs and forwards count.' : 'Not laughing along is a choice too.'),
      row(st.reported.group || st.reported.ghost, false, '⚑ Reported in Chatr', st.reported.group || st.reported.ghost ? 'Reported.' : 'The group or the account.'),
      row(st.told.teacherEv >= 2, false, '🏫 Told an adult', told),
      row(this.clueCount() >= 2, st.exposed, `🔍 Who is szellem_7b? ${this.clueCount()}/3`, st.exposed ? 'You named him in the group.' : 'Optional. Look at spelling and pictures.'),
      st.spoke ? row(true, false, '🗣 Spoke up', 'Others followed.') : '',
    ].join('') : '<p class="sm">Just a normal Friday night. For now.</p>';
    nt.innerHTML = `<div class="nh"><span class="cd">${st.phase === 'play' ? '⏳ ' + mmss(left) : '⌛ 0:00'}</span><small>${st.ev.obj ? (st.phase === 'play' ? 'until "the video" (21:00)' : '21:00') : ''}</small></div>
      <h4>What can you do?</h4>${rows}
      <div class="tip3 ${this.tipKind || ''}">${rich(this.tip || '')}</div>
      <div class="nbtns"><button class="btn small" data-act="hint">💡 Hint</button><button class="btn small" data-act="pause">⏸ Pause</button></div>`;
  }

  // ---------------- ending ----------------
  async endSeq() {
    if (this.st.phase === 'end') return;
    const st = this.st; st.phase = 'end'; this.modal = null; this.full = null; this.render();
    if (st.lili === 'kind') { this.say('lili', 'Lili', st.outcome === 'stopped' ? 'the group is gone?? was that you? 🧡 thank you' : 'I saw it. but thank you for being on my side 🧡', { typing: 0 }); await wait(4); }
    else await wait(2);
    stopLoop('fan4');
    const T = {
      stopped: 'Monday, 7:55.\n\nThe group is gone and the video was never posted. Ms Varga talks to the class, then to Máté and Zsófi with their parents.\nAt break, Lili sits with Anna and you.',
      removed: 'Monday, 7:55.\n\nThe video was up for a few minutes before Chatr removed it. Some people saw it. The school is dealing with it now,\nand it is not too late to be on Lili\'s side.',
      posted: 'Monday, 7:55.\n\nThe video is still going around. Nobody reported it.\nIt is not too late: screenshots, a report, and an adult can still stop it.',
    };
    await fade(true, T[st.outcome || 'posted'], 1.5);
    await wait(5);
    this.playing = false; closeScreen(this.el); this.el = null; removeEventListener('keydown', this._key, true);
    const secs = Math.round((Date.now() - st.start) / 1000);
    const dd = epData(4); dd.done = true; dd.state = null; dd.choices = { reported: !!(st.reported.group || st.reported.ghost), lili: st.lili, joined: st.joined, told: !!st.told.teacher }; dd.best = dd.best ? Math.min(dd.best, secs) : secs; persist();
    music('mus_debrief', 0.45);
    await fade(false, '', 0.5);
    const stats = [`Video: ${{ stopped: 'stopped', removed: 'removed after reports', posted: 'posted' }[st.outcome || 'posted']}`, `Evidence: ${this.evCount()}`, `Joined in: ${st.joined ? st.joined + '×' : 'never'}`, `Lili: ${{ none: 'not contacted', kind: 'supported', cold: 'talked', mean: 'hurt' }[st.lili]}`, `Reported: ${st.reported.group || st.reported.ghost ? 'yes' : 'no'}`, `Told an adult: ${st.told.teacher ? 'school' + (st.told.mum ? ' + Mum' : '') : st.told.mum ? 'Mum' : 'no'}`, `Spoke up: ${st.spoke ? 'yes' : 'no'}`, `Hints: ${st.hints}`];
    const nx = await debriefScreen(DEBRIEF_EP4, stats, this.G.nextLabel(4));
    await fade(true, '', 0.6);
    if (nx === 'next') { await this.G.goNext(4); await fade(false, '', 0.8); return; }
    await this.G.goHub();
    await fade(false, '', 0.8);
  }

  // ---------------- loop ----------------
  update(dt) {
    if (!this.playing || !this.el) return;
    const st = this.st;
    if (st.phase === 'play' || st.phase === 'final' || st.phase === 'end') {
      if (st.phase !== 'end') st.el += dt;
      for (const j of this.q.filter(j => st.el >= j.at)) { this.q.splice(this.q.indexOf(j), 1); j.f(); }
      this.timeline();
    }
    this._t = (this._t || 0) + dt;
    if (this._t > 0.5) { this._t = 0; this.renderBar(); const cd = this.el && this.el.querySelector('#notes .cd'); if (cd && st.phase === 'play') cd.textContent = '⏳ ' + mmss(this.finalAt() - st.el); }
    this._sv = (this._sv || 0) + dt; if (this._sv > 5) { this._sv = 0; this.save(); }
  }
}
