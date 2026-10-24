// v0.23: cutscenes. The intro at the first start (replayable from the computer) and the trailer use the same engine:
// a list of shots, each in one of the mode's scenes, with a camera that glides between two or more keyframes and text
// that explains what you are seeing (like the cutscenes in the old PSX games). The scenes are built but never entered,
// so nothing in them starts: no notices, no waves, no timers. Only what a shot asks for moves.
// The main loop calls G.cine.tick(dt) instead of the scene's update while a cutscene runs. For the trailer, the capture
// script steps the frames one by one (G.stepFrame), so the timing is exact even on a slow machine.
import * as THREE from 'three';
import { ingestPack } from '../../core/assets.js';
import { AU, loop, stopAllLoops, music, play } from '../../core/audio.js';
import { hud, clearHUDText, loading } from '../../core/hud.js';
import { S } from '../../core/state.js';
import { ensureRogue } from '../save/rogueSave.js';
import { newRun } from '../logic/night.js';
import { HomeScene } from '../home/HomeScene.js';
import { Stairwell } from '../mission/stairwell.js';
import { School } from '../mission/school.js';
import { Walk } from '../mission/walk.js';
import { Metro } from '../mission/metro.js';
import { Mimic } from '../entities/mimic.js';

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const smooth = k => k * k * (3 - 2 * k);
const lerp = (a, b, k) => a + (b - a) * k;
const D2R = Math.PI / 180;

/** The packs each scene needs (the flat's packs are loaded when you enter Lépcsőház). */
const PACKS = {
  home: [], stairs: ['npc'], school: ['kit_school', 'npc'], metro: ['metro', 'npc'],
  'walk:park': ['park', 'npc'], 'walk:courtyard': ['park', 'street', 'npc'], 'walk:alley': ['park', 'street', 'npc'], 'walk:bus': ['park', 'street', 'npc'],
  'walk:underpass': ['underpass', 'npc'], 'walk:backrooms': ['npc'], 'walk:hotel': ['npc'], 'walk:pool': ['npc'],
};

/** A copy of the save to build scenes from: a cutscene never changes the real one. */
function sandbox(o) {
  o = o || {};
  const R = JSON.parse(JSON.stringify(ensureRogue(S.save)));
  if (!R.life.floor) R.life.floor = 6;
  if (o.life) Object.assign(R.life, o.life);
  return R;
}

function makeScene(G, key, o) {
  const R = sandbox(key === 'home' && o.home ? { life: o.home } : null);
  const run = newRun(o.topic || 'T1', 'normal', 'park'); run.test = true; run.cur = 'walk';
  if (key === 'home') return new HomeScene(G, R);
  if (key === 'stairs') return new Stairwell(G, R, run);
  if (key === 'school') { run.stages = ['stairs', 'walk']; G.forceSchool = o.school || { ring: 'feed', gym: 'chorus' }; const sc = new School(G, R, run); sc._cineForce = true; return sc; }
  if (key === 'metro') { run.stages = ['stairs', 'walk', 'school']; return new Metro(G, R, run); }
  if (key.startsWith('walk:')) { run.walk = key.slice(5); return new Walk(G, R, run); }
  throw new Error('cine: no scene ' + key);
}

function overlay() {
  const el = document.createElement('div'); el.id = 'cine';
  el.innerHTML = `<style>
    #cine{position:fixed;inset:0;z-index:70;pointer-events:none;font-family:Inter,system-ui,sans-serif}
    #cine .bar{position:absolute;left:0;right:0;height:9vh;background:#000}
    #cine .blk{position:absolute;inset:0;background:#000}
    #cine .cap{position:absolute;left:6vw;bottom:13vh;max-width:min(62ch,60vw);text-shadow:0 2px 10px #000,0 0 3px #000}
    #cine .kick{font:clamp(15px,1.5vw,20px) m5x7,monospace;letter-spacing:3px;color:#9fd8c0;text-transform:uppercase}
    #cine .ttl{font:clamp(30px,4.2vw,56px) m5x7,monospace;color:#f2e6cf;letter-spacing:1px;line-height:1}
    #cine .txt{font-size:clamp(15px,1.45vw,20px);color:#e4dccb;line-height:1.45;margin-top:8px}
    #cine .top{position:absolute;left:0;right:0;top:12vh;display:flex;flex-direction:column;align-items:center;gap:10px}
    #cine .say{max-width:min(56ch,70vw);background:rgba(10,10,16,.82);border:1px solid #3a3550;border-radius:10px;padding:10px 14px;color:#f2eee6;font-size:clamp(15px,1.4vw,19px);line-height:1.4}
    #cine .say b{color:#ff9a8a;font-weight:600}
    #cine .typ{font:clamp(22px,2.4vw,32px) m5x7,monospace;color:#7a7590;letter-spacing:1px;background:rgba(0,0,0,.55);padding:4px 12px;border-radius:6px}
    #cine .typ i{font-style:normal;color:#9fffc8}
    #cine .big{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:10px}
    #cine .big .ttl{font-size:clamp(48px,8vw,110px)}
    #cine .big .txt{font-size:clamp(20px,2.1vw,30px);max-width:40ch}
    #cine .hint{position:absolute;right:2vw;bottom:2.6vh;font:16px m5x7,monospace;color:#77728a;letter-spacing:1px}
  </style>
  <div class="blk"></div><div class="bar" style="top:0"></div><div class="bar" style="bottom:0"></div>
  <div class="top"><div class="say"></div><div class="typ"></div></div><div class="cap"><div class="kick"></div><div class="ttl"></div><div class="txt"></div></div>
  <div class="big"><div class="kick"></div><div class="ttl"></div><div class="txt"></div></div><div class="hint"></div>`;
  document.body.appendChild(el);
  const q = s => el.querySelector(s);
  return { el, blk: q('.blk'), bars: [...el.querySelectorAll('.bar')], say: q('.say'), typ: q('.typ'), cap: q('.cap'), kick: q('.cap .kick'), ttl: q('.cap .ttl'), txt: q('.cap .txt'), big: q('.big'), bk: q('.big .kick'), bt: q('.big .ttl'), bx: q('.big .txt'), hint: q('.hint') };
}

/**
 * Play a list of shots. Resolves when they are over (or skipped with Esc).
 * A shot: { at: scene key, dur, cam: [[x,y,z,yawDeg,pitchDeg], ...], kicker, title, text, say: {who, text, at}, type: {text, at, cps},
 *           card: true (a big centred title on black, no scene), torch, fadeIn, fadeOut, setup(sc, C), tick(sc, dt, k, C) }
 * @param {object} o { topic, home: life overrides for the flat, skippable, music, hint }
 */
export async function playCine(G, shots, o = {}) {
  const prevRun = G.run; G.run = null; G.unlock && G.unlock(); hud(false); clearHUDText();
  const ui = overlay(); let stopAll = false, skip = false;
  ui.hint.textContent = o.skippable === false ? '' : (o.hint || 'Space: next  ·  Esc: skip all');
  const key = e => { if (o.skippable === false) return; if (e.code === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); stopAll = skip = true; } else if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); e.stopImmediatePropagation(); skip = true; } };
  addEventListener('keydown', key, true);
  const C = G.cine = { t: 0, shot: null, loading: false, tick: null, data: {} };
  const tmpQ = new THREE.Quaternion();
  let curKey = null;
  const setText = (s, t) => {
    const big = !!s.card;
    ui.cap.style.display = big ? 'none' : ''; ui.big.style.display = big ? '' : 'none';
    const [K, T, X] = big ? [ui.bk, ui.bt, ui.bx] : [ui.kick, ui.ttl, ui.txt];
    K.textContent = s.kicker || ''; T.textContent = s.title || '';
    const a = Math.max(0, Math.min(1, (t - 0.25) / 0.5)), out = s.dur - t < 0.5 ? Math.max(0, (s.dur - t) / 0.5) : 1;
    (big ? ui.big : ui.cap).style.opacity = String(a * out);
    const n = Math.max(0, Math.floor((t - 0.7) * (s.cps || 55)));
    const body = s.text || ''; X.innerHTML = esc(body.slice(0, n)).replace(/\n/g, '<br>') + (n < body.length ? '<span style="opacity:0">' + esc(body.slice(n)).replace(/\n/g, '<br>') + '</span>' : '');
    if (s.say && t >= (s.say.at || 0)) { ui.say.style.display = ''; ui.say.style.opacity = String(Math.min(1, (t - (s.say.at || 0)) / 0.4) * out); ui.say.innerHTML = `<b>${esc(s.say.who)}:</b> ${esc(s.say.text)}`; } else ui.say.style.display = 'none';
    if (s.type && t >= (s.type.at || 0)) {
      const m = Math.min(s.type.text.length, Math.floor((t - s.type.at) * (s.type.cps || 11)));
      ui.typ.style.display = ''; ui.typ.style.opacity = String(out);
      ui.typ.innerHTML = `<i>${esc(s.type.text.slice(0, m))}</i>${esc(s.type.text.slice(m))}`;
    } else ui.typ.style.display = 'none';
  };
  const camAt = (s, k) => {
    const ks = s.cam; if (!ks || !ks.length) return;
    const n = ks.length - 1, f = smooth(k) * n, i = Math.min(n - 1, Math.floor(f)), u = n ? f - i : 0;
    const A0 = ks[Math.max(0, i)], B0 = ks[Math.min(n, i + 1)] || A0;
    const cam = G.camera;
    cam.position.set(lerp(A0[0], B0[0], u), lerp(A0[1], B0[1], u), lerp(A0[2], B0[2], u));
    cam.rotation.set(lerp(A0[4] || 0, B0[4] || 0, u) * D2R, lerp(A0[3], B0[3], u) * D2R, 0, 'YXZ');
    const sc = G.scene;
    if (sc && sc.player) { sc.player.pos.set(cam.position.x, 0, cam.position.z); }   // chunked scenery (park plants) follows the camera
  };
  C.tick = (dt, time) => {
    const s = C.shot, sc = G.scene; if (!s || C.loading) return;
    const t0 = C.t; C.t += dt; const t = C.t, k = Math.min(1, t / s.dur);
    for (const [ct, snd, vol] of s.cues || []) if (t0 < ct && t >= ct) { play(snd, { vol: vol || 0.5 }); G._cue = (G._cue ? G._cue + ',' : '') + snd + '@' + (vol || 0.5); }   // sounds on the beat; the trailer capture writes them down for the mix
    camAt(s, k);
    if (sc && !s.card) {
      if (sc.flash) sc.flash.intensity = s.torch ? 7 : 0;
      if (sc.fill) sc.fill.intensity = s.torch ? 0.25 : 0;
      if (sc.rain) sc.rain(dt, G.camera.position);
      if (sc.dust) sc.dust(dt, !!s.torch);
      if (sc.cullChunks && (C._cull = (C._cull || 0) - dt) <= 0) { C._cull = 0.5; sc.cullChunks(); }
      if (s.tick) s.tick(sc, dt, k, C);
    }
    const fin = s.fadeIn ? Math.max(0, 1 - t / 0.7) : 0, fout = s.fadeOut ? Math.max(0, 1 - (s.dur - t) / 0.7) : 0;
    ui.blk.style.opacity = s.card ? '1' : String(Math.max(fin, fout));
    setText(s, t);
    if (t >= s.dur || skip) { skip = false; const d = C.done; C.shot = null; d && d(); }
  };
  try {
    if (o.music) music(o.music, o.musicVol || 0.4);
    for (let i = 0; i < shots.length && !stopAll; i++) {
      const s = shots[i], prev = shots[i - 1], next = shots[i + 1];
      if (!s.card && s.at !== curKey) {
        C.loading = true; ui.blk.style.opacity = '1'; const hint0 = ui.hint.textContent; ui.hint.textContent = 'Loading the next place…'; ui.cap.style.opacity = '0'; ui.say.style.display = ui.typ.style.display = 'none'; ui.big.style.display = 'none';
        for (const p of PACKS[s.at] || []) await ingestPack(p, AU.ctx, () => { });
        if (G.scene && G.scene.exit) G.scene.exit();
        stopAllLoops(); clearHUDText();
        const sc = makeScene(G, s.at, o);
        G.scene = sc; G.onScene && G.onScene(sc); await sc.build(); G.afterBuild && G.afterBuild(sc);
        sc.playing = false; hud(false); clearHUDText(); if (sc._cineForce) G.forceSchool = null;
        if (sc.armsRoot) sc.armsRoot.visible = false;
        curKey = s.at; C.data = {}; C.loading = false; ui.hint.textContent = hint0;
        const lp = (o.loops || {})[s.at.split(':')[0]];
        if (lp) loop('cine', lp[0], { vol: lp[1] });
        if (sc.amb) loop('cine2', sc.amb, { vol: 0.22 });
      }
      if (s.fadeIn == null) s.fadeIn = !s.card && (!prev || prev.card || prev.at !== s.at);
      if (s.fadeOut == null) s.fadeOut = !s.card && (!next || next.card || next.at !== s.at);
      if (s.setup && G.scene && !s.card) await s.setup(G.scene, C);
      if (typeof s.cam === 'function') s.cam = s.cam(G.scene, C);
      C.t = 0; C.shot = s;
      await new Promise(res => { C.done = res; });
      if (s.after && G.scene) s.after(G.scene, C);
    }
  } finally {
    removeEventListener('keydown', key, true);
    if (C.cleanup) C.cleanup();
    G.cine = null; ui.blk.style.opacity = '1';
    setTimeout(() => ui.el.remove(), 50);
    stopAllLoops();
    G.run = prevRun;
  }
  return !stopAll;
}

/** A figure with a phone for a face, for a shot: walks towards (tx, tz) and dissolves when asked. */
export function cineMimic(sc, data, x, z, i = 0, speed = 0.9) {
  const m = new Mimic(sc.root || sc.scene, i, data, x, z, speed);
  m.walkTo = (dt, tx, tz, stopAt = 1.6) => {
    const p = m.pos, dx = tx - p.x, dz = tz - p.z, d = Math.hypot(dx, dz);
    m.npc.facing = Math.atan2(dx, dz);
    if (d > stopAt) { const s = Math.min(d - stopAt, m.speed * dt); p.x += dx / d * s; p.z += dz / d * s; } else if (!m._idle) { m._idle = true; m.npc.play('Idle_Loop', 0.3); }
    m.npc.update(dt);
  };
  m.tickFade = dt => m.update(dt, m.pos);
  return m;
}

export { PACKS };

/** The yellow maze for a shot: a fresh maze, lit, and the camera where the game puts you (looking into the first corridor). */
export function mazeCam(sc, push = 0.8) {
  sc.genMaze(); sc.yLight.intensity = 4; sc.yAmb.intensity = 0.4;
  const [x, z] = sc.mazeStart, at = new THREE.Vector3(x, 1.5, z);
  if (sc.watcher && sc.mazeWatch) { sc.watcher.place(sc.mazeWatch[0], sc.mazeWatch[1], sc.mazeBounds); sc.watcher.setSize(1); }
  // the first cell has an opening to the next cell along -z or along +x: look down the longer clear one
  const clear = (dx, dz) => { let d = 0; while (d < 11 && sc.lineOfSight(at, new THREE.Vector3(x + dx * (d + 1), 1.5, z + dz * (d + 1)))) d++; return d; };
  const north = clear(0, -1), east = clear(1, 0), yaw = north >= east ? 0 : -90, dx = yaw ? 1 : 0, dz = yaw ? 0 : -1;
  const bx = x - dx * 1.4, bz = z - dz * 1.4;   // start a little behind the centre, against the back wall
  return [[bx, 1.6, bz, yaw, 0], [bx + dx * push, 1.6, bz + dz * push, yaw, 0]];
}
