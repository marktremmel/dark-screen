// Episode 7 in play order (internal id 5): "Végtelen hírfolyam" (Endless feed).
// A screenlife episode on the phone: Loopa, a short-video app that learns what you fear and won't let you sleep.
import * as THREE from 'three';
import { A } from '../core/assets.js';
import { hud, fade, flash, wait } from '../core/hud.js';
import { music, play, loop, stopLoop } from '../core/audio.js';
import { S, epData, persist } from '../core/state.js';
import { DEBRIEF_EP5, rich, epPos } from '../text.js';
import { openScreen, closeScreen, debriefScreen } from '../ui/screens.js';

const START = 21 * 60 + 30;   // 21:30, Sunday
const HOOKS = {
  infinite: { name: 'Infinite scroll', hu: 'végtelen görgetés', why: 'There is no bottom. "1,284 more for you" just keeps refilling, so there is never a natural moment to stop.' },
  autoplay: { name: 'Autoplay', hu: 'automatikus lejátszás', why: 'The next clip starts before you decide. Stopping takes effort; carrying on takes none.' },
  refresh: { name: 'Pull to refresh (slot machine)', hu: 'változó jutalom', why: 'Sometimes something great, mostly nothing. Not knowing what you\'ll get is exactly how slot machines keep people pulling.' },
  streak: { name: 'Streak', hu: 'sorozat', why: '41 days "with Bence" that die at midnight. It turns a friendship into a chore and makes you open the app every day.' },
  notif: { name: 'Fake-urgent notification', hu: 'hamis sürgető értesítés', why: '"Bence is LIVE!" But he isn\'t. The notification exists to pull you back in, not to tell you something true.' },
  shame: { name: 'Confirmshaming', hu: 'bűntudatkeltés', why: 'The "no" button is written to make you feel bad: "No, I don\'t care about my friends". You can say no anyway.' },
};
const HOOK_ORDER = ['infinite', 'autoplay', 'refresh', 'streak', 'notif', 'shame'];
// the feed: harmless first, then it learns. g = the blurry figure in a red hoodie somewhere in the background
const CLIPS = {
  cat: { img: 'ep5_cat_fail', who: '@cicavilag', cap: 'he really thought he could make that jump 😭🐈', likes: '1.2M', dark: 0 },
  skate: { img: 'ep5_skate', who: '@ollie.bp', cap: 'first try?? no. 47th try 🛹', likes: '340K', dark: 0 },
  noodles: { img: 'ep5_noodles', who: '@asmr.konyha', cap: 'rainy night ramen asmr 🍜 (sound on)', likes: '2.1M', dark: 0 },
  test: { txt: 'POV: it\'s Sunday night and the test is at 8 💀', bg: 'linear-gradient(160deg,#4a3a8a,#1a1430)', who: '@studytok', cap: 'who else is studying rn (no one)', likes: '88K', dark: 0 },
  teddy: { img: 'ep2_bubu', who: '@creepyfacts', cap: 'your old smart toy might still be listening. part 3 🧸', likes: '903K', dark: 1 },
  mann: { img: 'ep5_mannequins', who: '@nightwalks', cap: 'did that one just turn its head??', likes: '1.7M', dark: 2, g: [72, 58] },
  cctv: { img: 'ep5_cctv', who: '@cctv.files', cap: 'school camera 3:12 AM. who is that at the end of the corridor', likes: '2.4M', dark: 2, g: [50, 30] },
  red: { img: 'ep8_lab_night', who: '@hackstories', cap: 'a school got hacked DURING A SLEEPOVER 💀 every screen went red', likes: '1.1M', dark: 2, g: [18, 62] },
  quiet: { txt: 'everyone you know is asleep. you are still here.', bg: 'linear-gradient(180deg,#0a0a10,#000)', who: '@3am.thoughts', cap: '', likes: '4.4M', dark: 3 },
  bedroom: { img: 'ep5_bedroom', who: '@live_now', cap: '🔴 LIVE · 1 watching', likes: '1', dark: 3, live: true },
  mall: { img: 'ep5_mall_screens', who: '@budapest.spotted', cap: 'which 7.B kid is this?? the mall screens said SUSPECT 👀 #pláza', likes: '48K', dark: 3, last: true },
};
const PLAY = ['cat', 'skate', 'noodles', 'test', 'teddy', 'mann', 'cctv', 'red', 'quiet', 'mann', 'cctv', 'bedroom', 'red', 'cctv', 'mann'];
const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const hm = m => String(Math.floor(m / 60) % 24).padStart(2, '0') + ':' + String(Math.floor(m) % 60).padStart(2, '0');

export class Ep5 {
  constructor(G) { this.G = G; this.epN = 5; this.updateWhileOverlay = true; this.playing = false; this.quitLabel = 'Back to the lab (progress saved)'; this.q = []; }

  async build() {
    this.scene = new THREE.Scene(); this.scene.background = new THREE.Color(0x020203);
    const sv = epData(5).state;
    this.st = { phase: 'intro', el: 0, min: START, ev: {}, idx: 0, seen: {}, hooks: {}, fell: {}, why: false, set: { autoplay: true, notif: true, limit: false, fewer: false, streakRem: true },
      swipes: 0, liked: 0, hints: 0, streakKept: false, start: Date.now() };
    if (sv) { Object.assign(this.st, sv, { start: Date.now() - (sv.elapsedMs || 0) }); if (this.st.phase === 'intro') this.st.phase = 'play'; }
    this.view = 'feed'; this.flagMode = false; this.modal = null; this.auto = 0; this.dark = 0; this.tip = '';
  }

  // ---------------- flow ----------------
  async enter() {
    hud(false); this.G.unlock(); music(null);
    const resumed = this.st.phase !== 'intro';
    if (!resumed) { await fade(true, 'Sunday, 21:30.\n\nHistory test tomorrow at 8. You\'ve studied. Mostly.\nYou open Loopa "for five minutes" to see what Bence posted.', 0.01); await wait(4.5); }
    else await fade(true, '', 0.01);
    this.openPhone();
    loop('room5', 'hum', { vol: 0.05, rate: 0.7 });
    music('mus_dark', 0.14);
    await fade(false, '', 1.2);
    if (!resumed) { this.st.phase = 'play'; this.setTip('Loopa is built to keep you watching. Find its tricks: press 🔎 Spot a trick, then tap the trick on the phone. Tapping things normally does what the app wants.'); }
    else this.setTip('Welcome back. The night kept going without you.');
    this.playing = true; this.auto = 7; this.render();
  }
  resume() { }
  quit() { this.save(); this.playing = false; this.G.goHub(); }
  exit() { this.playing = false; removeEventListener('keydown', this._key, true); closeScreen(this.el); stopLoop('room5'); }
  save() { const st = this.st; if (st.phase === 'intro' || st.phase === 'end') return; const { start, ...rest } = st; epData(5).state = { ...rest, elapsedMs: Date.now() - start }; persist(); }
  after(sec, f) { this.q.push({ at: this.st.el + sec, f }); }

  openPhone() {
    const el = this.el = openScreen(`<div class="ep3 ep5">
      <div class="phone3" id="ph"><div class="pbar"><span id="pclock"></span><span id="pbatt">▮▮▮ 72%</span></div>
        <div class="pscr"><div id="scr"></div><div id="modal3" class="hidden"></div><div id="notif3"></div><div id="dark3"><div class="refl"></div></div><div id="sub3"></div></div>
        <div class="pnav"><button data-act="feed" title="Feed">🏠</button><button data-act="profile" title="You">👤</button></div></div>
      <div class="notes3" id="notes"></div></div>`, 'solid');
    el.addEventListener('click', e => {
      const h = e.target.closest('[data-hook]');
      if (this.flagMode && h) { this.spot(h.dataset.hook); return; }
      if (this.flagMode && e.target.closest('#ph') && !e.target.closest('[data-act=flag]')) { this.spot(null); return; }
      const a = e.target.closest('[data-act]'); if (!a) return;
      if (this.st.phase === 'end' && a.dataset.act !== 'wake') return;
      this.act(a.dataset.act, a.dataset.arg);
    });
    this._key = e => {
      if (e.code !== 'Escape' || S.paused) return;
      e.preventDefault(); e.stopImmediatePropagation();
      if (this.modal) { this.modal = null; this.render(); return; }
      if (this.flagMode) { this.flagMode = false; this.render(); return; }
      if (this.playing && this.st.phase !== 'end') { this.save(); this.G.openPause(); }
    };
    addEventListener('keydown', this._key, true);
  }

  // ---------------- helpers ----------------
  clip() { const k = PLAY[this.st.idx % PLAY.length]; return [k, CLIPS[k]]; }
  cost(m, why) { this.st.min += m; if (why) this.sub(why, 3.5); this.renderBar(); }
  setTip(t, kind = '') { this.tip = t; this.tipKind = kind; this.renderNotes(); }
  sub(text, dur = 4) { const s = this.el && this.el.querySelector('#sub3'); if (!s) return; s.textContent = text; s.classList.add('on'); clearTimeout(this._subT); this._subT = setTimeout(() => s.classList.remove('on'), dur * 1000); }
  notify(text, hook) {
    const n = this.el.querySelector('#notif3'); const d = document.createElement('div'); d.className = 'nt'; if (hook) d.dataset.hook = hook; d.dataset.act = 'notif';
    d.innerHTML = `<b>Loopa</b><span>${esc(text)}</span>`; n.appendChild(d); play('beep', { vol: 0.35, rate: 1.4 });
    setTimeout(() => d.remove(), 6500);
  }
  hooksN() { return Object.keys(this.st.hooks).length; }
  setDone() { const s = this.st.set; return !s.autoplay && !s.notif && s.limit; }

  // ---------------- input ----------------
  act(a, arg) {
    const st = this.st;
    if (this.dark && a !== 'wake') return;
    play('click', { vol: 0.2 });
    switch (a) {
      case 'wake': return;
      case 'flag': this.flagMode = !this.flagMode; break;
      case 'feed': this.view = 'feed'; this.modal = null; break;
      case 'profile': this.view = 'profile'; this.modal = null; break;
      case 'next': this.next(false); return;
      case 'like': st.liked++; this.cost(1); break;
      case 'more': this.modal = 'more'; break;
      case 'why': st.why = true; this.modal = 'why'; play('presence', { vol: 0.15 }); this.setTip('Loopa never asked what you like. It measured how long you watched each clip, and built this from that.'); break;
      case 'fewer': st.set.fewer = true; this.modal = null; this.sub('OK. You\'ll see fewer clips like this.', 2.5); break;
      case 'refresh': this.fall('refresh'); return;
      case 'streak': this.fall('streak'); return;
      case 'notif': this.fall('notif'); return;
      case 'set': this.toggle(arg); break;
      case 'shame-yes': this.modal = null; this.st.streakKept = true; this.fall('shame'); return;
      case 'shame-no': this.modal = null; this.st.set.streakRem = false; this.sub('The streak will end at midnight. Bence won\'t care. You can just text him.', 4); break;
      case 'close': this.tryClose(); return;
      case 'down': this.putDown(); return;
      case 'x': this.modal = null; break;
      case 'hint': this.hint(); return;
      case 'pause': this.save(); this.G.openPause(); return;
    }
    this.save(); this.render();
  }
  next(auto) {
    const st = this.st;
    st.idx++; st.swipes++; this.auto = st.set.autoplay ? 7 : 0;
    this.cost(auto ? 3 : 2);
    const [k, c] = this.clip(); st.seen[k] = true;
    if (c.dark >= 2 && !st.ev.learned) { st.ev.learned = true; this.setTip('Notice what the feed is showing you now? You stopped a little longer on one dark clip. Open ⋯ → "Why am I seeing this?"'); }
    if (k === 'bedroom' && !st.ev.mirror) this.after(3.5, () => this.mirrorScare());
    play('click', { vol: 0.15, rate: 1.6 });
    this.save(); this.render();
  }
  // tapping a trick normally: it works on you
  fall(k) {
    const st = this.st; st.fell[k] = (st.fell[k] || 0) + 1;
    if (k === 'refresh') { const win = Math.random() < 0.25; this.cost(10, win ? '↻ 🎁 3 new clips from people you follow! …and twenty more after that.' : '↻ Nothing new. Just one more pull…'); }
    if (k === 'streak') { this.cost(10, '🔥 You send Bence a random photo to keep the streak. He sends one back. Ten minutes gone.'); }
    if (k === 'notif') { this.cost(10, '"Bence is LIVE!" …The live has already ended. Or never started. You keep scrolling anyway.'); }
    if (k === 'shame') { this.cost(10, '"Great, your streak is safe!" You open the app every day now, for a number.'); }
    this.setTip(`That one worked on you: +10 minutes. Next time press 🔎 first and tap it to name it.`, 'warn');
    this.save(); this.render();
  }
  spot(k) {
    const st = this.st;
    if (!k) { this.setTip('That part is just content. Look for the part of the screen that is trying to keep you here.', ''); play('denied', { vol: 0.25 }); return; }
    if (!st.hooks[k]) { st.hooks[k] = true; play('paper', { vol: 0.4 }); this.setTip(`🚩 ${HOOKS[k].name} (${HOOKS[k].hu}). ${HOOKS[k].why}`, 'ok'); }
    else this.setTip(`Already spotted: ${HOOKS[k].name}.`);
    this.flagMode = false; this.save(); this.render();
    if (this.hooksN() >= 4 && !st.ev.goSet) { st.ev.goSet = true; this.after(3, () => this.setTip('You see the tricks now. Take control: 👤 → ⚙️ Settings. Switch off autoplay and notifications, and set a limit.')); }
  }
  toggle(k) {
    const s = this.st.set;
    if (k === 'streakRem' && s.streakRem) { this.modal = 'shame'; return; }
    s[k] = !s[k];
    if (k === 'autoplay') this.auto = s.autoplay ? 7 : 0;
    if (this.setDone() && !this.st.ev.setOK) { this.st.ev.setOK = true; this.setTip('Settings done. Now the hardest part: put the phone down (👤 → "Close Loopa for tonight").'); }
  }
  tryClose() {
    const st = this.st;
    if (!st.ev.lastClip) { st.ev.lastClip = true; this.view = 'feed'; st.idx = PLAY.length * 10 + 0; this.forceClip = 'mall'; this.render(); this.sub('One more clip slides in before the app closes…', 3.5); play('beep', { vol: 0.3, rate: 0.7 }); this.after(9, () => { if (this.st.phase === 'play') this.putDown(); }); return; }
    this.putDown();
  }
  async putDown() {
    const st = this.st; if (st.phase === 'end') return; st.phase = 'end';
    const d = this.el.querySelector('#dark3'); if (A.img.refl_b) d.querySelector('.refl').style.backgroundImage = `url(${A.img.refl_b})`;
    d.classList.add('on'); this.dark = 999; play('click', { vol: 0.4 });
    this.sub('The screen goes black. For a second you see your own face in it.', 4.5);
    await wait(5);
    const sleep = st.min, late = sleep > 24 * 60 + 15;
    stopLoop('room5');
    await fade(true, `End of episode ${epPos(5)}.\n\nYou put the phone face down at ${hm(sleep)}.\n` + (late ? 'At 7:40 the alarm is a cruel joke. In the test, the dates swim on the page.' : 'You sleep. In the morning the dates in the test are where you left them.') + '\n\nSomewhere, the mall clip has 48,000 views. Then 90,000.', 1.5);
    await wait(6);
    this.playing = false; closeScreen(this.el); this.el = null; removeEventListener('keydown', this._key, true);
    const secs = Math.round((Date.now() - st.start) / 1000);
    const dd = epData(5); dd.done = true; dd.state = null; dd.best = dd.best ? Math.min(dd.best, secs) : secs; dd.choices = { sleep: hm(sleep), hooks: this.hooksN(), settings: this.setDone() }; persist();
    music('mus_debrief', 0.45);
    await fade(false, '', 0.5);
    const fell = Object.values(st.fell).reduce((a, b) => a + b, 0);
    const stats = [`Phone down at: ${hm(sleep)}`, `Tricks spotted: ${this.hooksN()}/6`, `Times a trick worked on you: ${fell}`, `Clips watched: ${st.swipes + 1}`, `Looked at "Why am I seeing this?": ${st.why ? 'yes' : 'no'}`, `Autoplay off: ${st.set.autoplay ? 'no' : 'yes'} · Notifications off: ${st.set.notif ? 'no' : 'yes'} · Limit: ${st.set.limit ? 'yes' : 'no'}`];
    const nx = await debriefScreen(DEBRIEF_EP5, stats, this.G.nextLabel(5));
    await fade(true, '', 0.6);
    if (nx === 'next') { await this.G.goNext(5); await fade(false, '', 0.8); return; }
    await this.G.goHub(); await fade(false, '', 0.8);
  }
  hint() {
    const st = this.st; st.hints++;
    const missing = HOOK_ORDER.filter(k => !st.hooks[k]);
    let t;
    if (!st.why && st.swipes > 4) t = 'Tap ⋯ on a clip, then "Why am I seeing this?".';
    else if (missing.includes('infinite')) t = 'Look at the very bottom of the feed: does it ever end?';
    else if (missing.includes('autoplay')) t = 'Watch the corner of a clip for a few seconds without touching anything.';
    else if (missing.includes('refresh')) t = 'At the top of the feed there is something that wants to be pulled.';
    else if (missing.includes('streak')) t = 'A flame at the top. Whose streak is it, and when does it "die"?';
    else if (missing.includes('notif')) t = 'Wait for the next notification banner, then spot it instead of tapping it.';
    else if (missing.includes('shame')) t = '👤 → ⚙️ Settings → try to switch off streak reminders. Read the buttons carefully.';
    else if (!this.setDone()) t = '👤 → ⚙️ Settings: autoplay off, notifications off, daily limit on.';
    else t = '👤 → "Close Loopa for tonight".';
    this.setTip('💡 ' + t);
  }

  // ---------------- scares ----------------
  burst() {
    const q = this.G.quiet();
    for (let i = 0; i < (q ? 3 : 9); i++) setTimeout(() => play('beep', { vol: q ? 0.25 : 0.6, rate: 1.2 + Math.random() }), i * 110);
    if (!q) { play('stinger', { vol: 0.55 }); flash(0.25, 100); }
    ['Bence is LIVE now! 🔴', 'You have 14 new followers', '🔥 Your streak ends in 60 minutes!', 'Someone mentioned you in a comment'].forEach((t, i) => setTimeout(() => this.notify(t, i === 0 ? 'notif' : i === 2 ? 'streak' : null), i * 300));
    this.sub('[23:00. The phone erupts: every notification at once, at full volume]', 4);
  }
  mirrorScare() {
    const st = this.st; if (st.ev.mirror) return; st.ev.mirror = true;
    const d = this.el.querySelector('#dark3'); if (A.img.refl_b) d.querySelector('.refl').style.backgroundImage = `url(${A.img.refl_b})`;
    if (!this.G.quiet()) play('presence', { vol: 0.5 });
    this.sub('"1 watching." Someone is sitting in a dark room, lit by a phone… the room looks like yours.', 4.5);
    setTimeout(() => { d.classList.add('on'); this.dark = 999; setTimeout(() => { if (this.st.phase === 'end') return; this.dark = 0; d.classList.remove('on'); }, 3200); play('hum', { vol: 0.25, rate: 0.5 }); this.sub('…It\'s a reflection. The screen went dark for a second, and that was you.', 4); }, 4200);
  }

  // ---------------- timeline + loop ----------------
  timeline() {
    const st = this.st, E = st.ev, t = st.el;
    const once = (k, at, f) => { if (!E[k] && at) { E[k] = true; f(); } };
    once('n1', t > 40, () => this.notify('Bence is LIVE now! 🔴 Join before it ends', 'notif'));
    once('n2', t > 160, () => this.notify('Bence and 3 others posted. Don\'t miss out 👀', 'notif'));
    once('n3', t > 300, () => this.notify('Bence is LIVE now! 🔴 (again)', 'notif'));
    once('burst', st.min >= 23 * 60, () => this.burst());
    once('late', st.min >= 24 * 60, () => this.setTip('Midnight. The streak just died. Nothing happened.', 'warn'));
    if (st.min >= 25 * 60 + 30 && st.phase === 'play') { this.sub('You fall asleep with the phone in your hand.', 4); this.putDown(); }
  }
  update(dt) {
    if (!this.playing || !this.el) return;
    const st = this.st;
    if (st.phase === 'play') {
      st.el += dt; st.min += dt / 12;
      for (const j of this.q.filter(j => st.el >= j.at)) { this.q.splice(this.q.indexOf(j), 1); j.f(); }
      this.timeline();
      if (st.set.autoplay && this.view === 'feed' && !this.modal && !this.flagMode && !this.dark && !this.forceClip) {
        this.auto -= dt; const c = this.el.querySelector('#auto5'); if (c) c.textContent = Math.max(0, Math.ceil(this.auto));
        if (this.auto <= 0) { this.st.fell.autoplay = (this.st.fell.autoplay || 0) + 1; this.next(true); }
      }
    }
    if (this.dark > 0 && this.dark < 900) { this.dark -= dt; if (this.dark <= 0) { this.el.querySelector('#dark3').classList.remove('on'); } }
    this._t = (this._t || 0) + dt; if (this._t > 0.5) { this._t = 0; this.renderBar(); }
    this._sv = (this._sv || 0) + dt; if (this._sv > 5) { this._sv = 0; this.save(); }
  }

  // ---------------- rendering ----------------
  renderBar() { if (!this.el) return; this.el.querySelector('#pclock').textContent = hm(this.st.min); const cd = this.el.querySelector('#notes .cd'); if (cd) cd.textContent = '🕘 ' + hm(this.st.min); }
  render() {
    if (!this.el) return;
    const scr = this.el.querySelector('#scr');
    scr.innerHTML = this.view === 'profile' ? this.rProfile() : this.rFeed();
    this.el.querySelector('#ph').classList.toggle('flagging', this.flagMode);
    const md = this.el.querySelector('#modal3'); md.classList.toggle('hidden', !this.modal); md.innerHTML = this.modal ? this.rModal() : '';
    this.renderNotes(); this.renderBar();
  }
  rFeed() {
    const st = this.st; const k = this.forceClip || PLAY[st.idx % PLAY.length]; const c = CLIPS[k];
    const bg = c.img && A.img[c.img] ? `background-image:url(${A.img[c.img]})` : `background:${c.bg || '#111'}`;
    const ghost = c.g ? `<div class="ghost5" style="left:${c.g[0]}%;top:${c.g[1]}%"></div>` : '';
    return `<div class="feed5">
      <div class="top5"><button data-act="refresh" data-hook="refresh" class="pill5">↻ pull for new</button><span class="fy">For you</span><button data-act="streak" data-hook="streak" class="pill5 fire">🔥 41 · Bence</button></div>
      <div class="clip5 ${c.live ? 'live' : ''}" style="${bg}">${c.txt ? `<div class="txt5">${esc(c.txt)}</div>` : ''}${ghost}
        <div class="side5"><button data-act="like">❤️<small>${c.likes}</small></button><button data-act="more">⋯</button></div>
        <div class="cap5"><b>${esc(c.who)}</b> ${esc(c.cap)}</div>
        ${st.set.autoplay && !c.last ? `<div class="auto5" data-hook="autoplay">▶ next in <span id="auto5">${Math.ceil(this.auto)}</span></div>` : ''}
      </div>
      <div class="bot5"><button data-act="next" class="swipe5">↑ swipe</button><span data-hook="infinite" class="inf5">∞ ${(1284 + st.swipes * 37).toLocaleString('en')} more for you</span></div>
      ${this.flagMode ? '<div class="flagbar5">🔎 Tap the trick</div>' : ''}</div>`;
  }
  rProfile() {
    const st = this.st, s = st.set;
    const row = (k, l, sub) => `<div class="set5"><span>${l}${sub ? `<small>${sub}</small>` : ''}</span><button data-act="set" data-arg="${k}" class="tg5 ${s[k] ? 'on' : ''}">${s[k] ? 'ON' : 'OFF'}</button></div>`;
    const watched = Math.round((st.min - START));
    return `<div class="prof5"><h3>@${esc((S.nick || 'you').toLowerCase())} · Loopa</h3>
      <div class="stat5">Watched tonight: <b>${watched} min</b> · ${st.swipes + 1} clips</div>
      <h4>⚙️ Settings</h4>
      ${row('autoplay', 'Autoplay next clip')}${row('notif', 'Push notifications', '"so you never miss out"')}${row('streakRem', 'Streak reminders')}
      ${row('limit', 'Daily limit: 30 minutes', 'Loopa asks you to stop')}${row('fewer', 'Show fewer dark clips')}
      <button class="b3" data-act="close" style="margin-top:12px;width:100%">Close Loopa for tonight</button></div>`;
  }
  rModal() {
    const st = this.st;
    if (this.modal === 'more') return `<div class="mdl"><button class="b3 ghost" data-act="why">Why am I seeing this?</button><button class="b3 ghost" data-act="fewer">Not interested</button><button class="b3 ghost" data-act="x">Cancel</button></div>`;
    if (this.modal === 'why') {
      const seen = Object.keys(st.seen);
      const tags = [['security cameras', seen.includes('cctv')], ['smart toys', seen.includes('teddy')], ['mannequins', seen.includes('mann')], ['ransomware', seen.includes('red')], ['being watched', true], ['skateboarding', true], ['cats', true]];
      return `<div class="mdl why5"><h4>Why am I seeing this?</h4><p>Loopa thinks you are <b>13–15</b>, in <b>Budapest</b>, and awake late on school nights.</p>
        <p>Interested in: ${tags.filter(t => t[1]).map(t => `<span class="tag5">${t[0]}</span>`).join(' ')}</p>
        <p>Responds most to: <span class="tag5 r">fear 87%</span> <span class="tag5 r">outrage 64%</span> <span class="tag5">cute animals 41%</span></p>
        <p class="sm">Based on: how long you watched each clip, what you rewatched, the time of night. You never typed any of this.</p>
        <button class="b3" data-act="x">OK</button></div>`;
    }
    if (this.modal === 'shame') return `<div class="mdl"><h4>Turn off streak reminders?</h4><p>Your 41-day streak with Bence will end at midnight. 😢</p>
      <button class="b3" data-act="shame-yes">Keep my streak! 🔥</button><button class="b3 ghost small5" data-act="shame-no" data-hook="shame">No, I don't care about my friends</button></div>`;
    return '';
  }
  renderNotes() {
    if (!this.el) return;
    const st = this.st, nt = this.el.querySelector('#notes');
    const rows = HOOK_ORDER.map(k => st.hooks[k] ? `<div class="claim ok"><b>🚩 ${HOOKS[k].name}</b><small>${HOOKS[k].hu}</small></div>` : '').join('');
    const g = (ok, t) => `<div class="claim ${ok ? 'ok' : ''}"><b>${ok ? '✓' : '·'} ${t}</b></div>`;
    nt.innerHTML = `<div class="nh"><span class="cd">🕘 ${hm(st.min)}</span><small>test at 8:00</small></div>
      <div class="lk">Tricks spotted: <b>${this.hooksN()}/6</b></div>
      <button class="btn ${this.flagMode ? 'primary' : ''}" data-act="flag" style="width:100%;margin:6px 0">🔎 Spot a trick${this.flagMode ? ' (on)' : ''}</button>
      ${rows}
      <h4>Take back control</h4>${g(st.why, 'Find out why you see these clips')}${g(!st.set.autoplay && !st.set.notif, 'Autoplay and notifications off')}${g(st.set.limit, 'A daily limit')}${g(st.phase === 'end', 'Put the phone down')}
      <div class="tip3 ${this.tipKind || ''}">${rich(this.tip || '')}</div>
      <div class="nbtns"><button class="btn small" data-act="hint">💡 Hint</button><button class="btn small" data-act="pause">⏸ Pause</button></div>`;
  }
}
