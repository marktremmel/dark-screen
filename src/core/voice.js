// v0.25: voice acting. Every voiced line is found by its words: when a line appears on screen (caption, chat bubble,
// dialogue panel, toast, cutscene text, an opened email...), the matching clip plays. No line ids in the scenes:
// change a line's text and it simply falls back to the old babble until the next render.
// Clips live in game/data/vo_*.js and are fetched together with their part of the game (see VO_PRELOAD).
import { AU, babble } from './audio.js';
import { b64ToBuf, loadPackScript } from './assets.js';
import { S } from './state.js';
import { norm } from './voicenorm.js';
import { VO_INDEX, VO_PRELOAD } from '../voice_index.js';

const bufs = {};            // clip id → AudioBuffer
const seen = new Set();     // lines already spoken (or already on screen) in this scene
let bus = null, cur = null, queue = [], musicVol = null, token = 0;

export const voiceOn = () => S.settings.voice !== false;

function lookup(text) {
  const t = String(text || ''); let k = norm(t);
  if (VO_INDEX[k]) return k;
  const m = t.match(/^([^:]{2,60}):\s*([\s\S]+)$/);       // "Who: text"
  if (m && VO_INDEX[(k = norm(m[2]))]) return k;
  return null;
}
/** Is there a recorded clip for this line? (callers skip the babble then) */
export const hasVO = text => voiceOn() && !!lookup(text);
/** Length of the clip in seconds (0 if none): captions and cutscene shots stay up while the line is spoken. */
export function voDur(text) { if (!voiceOn()) return 0; const k = lookup(text); return k ? VO_INDEX[k][2] : 0; }

export function voPreload(packName) { for (const p of VO_PRELOAD[packName] || []) loadPackScript(p).catch(() => { }); }
export function voReset() { seen.clear(); voStop(); }
export function voStop() { token++; queue = []; if (cur) { try { cur.stop(); } catch (e) { } cur = null; } unduck(); }
export function setVoiceVolume(v) { if (bus) bus.gain.value = v; }

function ensureBus() {
  if (!bus && AU.ctx) { bus = AU.ctx.createGain(); bus.gain.value = S.settings.voiceVol ?? 1; bus.connect(AU.master); }
  return bus;
}
function duck() { if (!AU.mus || musicVol !== null) return; musicVol = AU.mus.gain.value; const t = AU.ctx.currentTime; AU.mus.gain.setTargetAtTime(musicVol * 0.45, t, 0.15); }
function unduck() { if (musicVol === null || !AU.mus) return; const t = AU.ctx.currentTime; AU.mus.gain.setTargetAtTime(musicVol, t, 0.4); musicVol = null; }

async function getBuf(key) {
  const [pack, id] = VO_INDEX[key];
  if (bufs[id]) return bufs[id];
  let P = window.SK_DATA && window.SK_DATA[pack];
  if (!P) { try { P = await loadPackScript(pack); } catch (e) { return null; } }
  const b64 = P && P.vo && P.vo[id]; if (!b64) return null;
  try { bufs[id] = await AU.ctx.decodeAudioData(b64ToBuf(b64)); } catch (e) { console.warn('voice decode failed', id); return null; }
  return bufs[id];
}

async function playKey(key) {
  const asked = performance.now(), my = ++token;
  const buf = await getBuf(key);
  if (my !== token) return;                                // a newer line was asked for meanwhile
  if (!buf || !ensureBus()) return next();
  if (performance.now() - asked > 2500) return next();    // the pack arrived too late: the moment has passed
  if (cur) { try { cur.onended = null; cur.stop(); } catch (e) { } }
  const src = AU.ctx.createBufferSource(); src.buffer = buf; src.connect(bus);
  src.onended = () => { if (cur === src) { cur = null; next(); } };
  cur = src; duck(); src.start();
}
function next() { const k = queue.shift(); if (k) playKey(k); else if (!cur) unduck(); }

/**
 * Speak a line if it has a clip. Returns true if it did (or already had in this scene), so the caller skips the babble.
 * force: say it again even if it was spoken before (captions). queue: wait for the current line instead of cutting it.
 */
export function speak(text, o = {}) {
  if (!voiceOn() || !AU.ctx) return false;
  const key = lookup(text); if (!key) return false;
  if (seen.has(key) && !o.force) return true;
  seen.add(key);
  if (o.queue && cur) { if (queue.length < 2) queue.push(key); } else { queue = []; playKey(key); }
  return true;
}

// Anything that appears on screen and matches a voiced line is spoken. A whole list appearing at once
// (an inbox, a chat history) is only marked as seen; afterwards each new bubble or opened email is spoken.
const SKIP = new Set(['SCRIPT', 'STYLE', 'CANVAS', 'INPUT', 'TEXTAREA', 'BUTTON']);
function scan(muts) {
  if (!voiceOn() || !AU.ctx) return;
  const keys = [];
  const look = el => {
    if (!el || el.nodeType !== 1 || SKIP.has(el.tagName)) return;
    const t = el.textContent; if (!t || t.length < 2 || t.length > 900) return;
    const k = lookup(t); if (k && !keys.includes(k)) keys.push(k);
  };
  let budget = 400;
  for (const m of muts) {
    if (m.type === 'characterData') { look(m.target.parentElement); continue; }
    for (const n of m.addedNodes) {
      if (n.nodeType === 3) { look(n.parentElement); continue; }
      if (n.nodeType !== 1) continue;
      look(n);
      const all = n.getElementsByTagName('*');
      for (let i = 0; i < all.length && budget > 0; i++, budget--) look(all[i]);
    }
  }
  const fresh = keys.filter(k => !seen.has(k)); if (!fresh.length) return;
  fresh.forEach(k => seen.add(k));
  if (fresh.length > 2) return;                               // a list, not a line
  queue = []; playKey(fresh[0]); if (fresh[1]) queue.push(fresh[1]);
}
export function initVoice() {
  window.SK_VO_PRELOAD = voPreload;
  window.SK_VOICE = { speak, hasVO, voDur, stop: voStop, playing: () => !!cur, seen: () => seen.size };   // for testing in the console                         // core/assets.js calls this when a part of the game loads
  new MutationObserver(scan).observe(document.body, { childList: true, subtree: true, characterData: true });
}
export { babble };
