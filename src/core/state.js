// Global state + saving (localStorage per nickname, plus export/import codes).
import { EPISODES, epPos, BUILT, LOCKS_ON, UNLOCK_HASH, TEACHER_HASH, codeHash, normCode } from '../text.js';
const KEY = 'sotetkepernyo.v1';
export const DEFAULT_SETTINGS = { quiet: false, brightness: 1.0, projector: false, master: 0.9, music: 0.6, mouse: 1.0, bigText: false, bob: true, subs: true, calibrated: false, sharp: false };

export const S = {
  nick: null,
  save: null,        // { nick, settings, eps: {1:{done,best,state}}, created }
  settings: { ...DEFAULT_SETTINGS },
  onUnlock: null,
  paused: false,
};

function readAll() { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { return {}; } }
function writeAll(all) { try { localStorage.setItem(KEY, JSON.stringify(all)); return true; } catch (e) { return false; } }

export function listPlayers() { const a = readAll(); return Object.keys(a.players || {}).sort(); }
export function lastPlayer() { return readAll().last || null; }

export function loadPlayer(nick) {
  const all = readAll(); all.players = all.players || {};
  let sv = all.players[nick];
  if (!sv) sv = { nick, settings: { ...DEFAULT_SETTINGS }, eps: {}, created: Date.now() };
  sv.settings = { ...DEFAULT_SETTINGS, ...(sv.settings || {}) };
  S.nick = nick; S.save = sv; S.settings = sv.settings;
  all.players[nick] = sv; all.last = nick; writeAll(all);
  return sv;
}
export function persist() {
  if (!S.save) return;
  const all = readAll(); all.players = all.players || {};
  S.save.settings = S.settings; S.save.updated = Date.now();
  all.players[S.nick] = S.save; all.last = S.nick; writeAll(all);
  flashSaveIcon();
}
let saveIconT = null;
function flashSaveIcon() {
  const el = document.getElementById('saveicon'); if (!el) return;
  el.classList.add('on'); clearTimeout(saveIconT); saveIconT = setTimeout(() => el.classList.remove('on'), 1200);
}
export function epData(n) { S.save.eps[n] = S.save.eps[n] || {}; return S.save.eps[n]; }
export function isDone(n) { return !!(S.save && S.save.eps[n] && S.save.eps[n].done); }
// unlocked when the nearest earlier episode that exists is done (episodes not built yet are skipped)
export function orderOK(id) { if (S.save && S.save.teacher) return true; for (let i = epPos(id) - 2; i >= 0; i--) if (BUILT[EPISODES[i].id]) return isDone(EPISODES[i].id); return true; }
// the lesson code for this episode was entered (or locks are off, or teacher mode, or it was already played)
export function keyOK(id) { return !LOCKS_ON || !UNLOCK_HASH[id] || !!(S.save && (S.save.teacher || (S.save.keys && S.save.keys[id]) || isDone(id) || (S.save.eps[id] && S.save.eps[id].state))); }
export function isUnlocked(id) { return orderOK(id) && keyOK(id); }
// returns 'ok', 'teacher' or null
export function tryCode(id, code) {
  const c = normCode(code);
  if (c && codeHash(c) === TEACHER_HASH) { S.save.teacher = true; persist(); return 'teacher'; }
  if (c && UNLOCK_HASH[id] && [].concat(UNLOCK_HASH[id]).includes(codeHash(c))) { S.save.keys = S.save.keys || {}; S.save.keys[id] = true; persist(); return 'ok'; }
  return null;
}

// --- save codes: SK1-<base64url json>-<checksum> ---
function crc(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36).slice(0, 5).toUpperCase(); }
export function exportCode() {
  const data = { n: S.nick, e: {} };
  for (const [k, v] of Object.entries(S.save.eps)) { data.e[k] = { d: v.done ? 1 : 0, b: v.best || 0, s: v.state || null }; if (v.choices) data.e[k].c = v.choices; if (v.stats) data.e[k].t = v.stats; if (v.at) data.e[k].a = v.at; }
  if (S.save.keys) data.k = Object.keys(S.save.keys).map(Number);
  if (S.save.rogue) data.r = S.save.rogue;            // Lépcsőház: the flat, the record, the notebook
  data.u = S.save.updated || Date.now();
  const json = JSON.stringify(data);
  const b = btoa(unescape(encodeURIComponent(json))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return 'SK1-' + b + '-' + crc(b);
}
/** What a code holds, without loading it: { nick, updated }. Throws like importCode. */
export function peekCode(code) {
  code = (code || '').trim().replace(/\s+/g, '');
  const m = code.match(/^SK1-([A-Za-z0-9_-]+)-([A-Z0-9]+)$/);
  if (!m || crc(m[1]) !== m[2]) throw new Error('The save is damaged.');
  let b = m[1].replace(/-/g, '+').replace(/_/g, '/'); while (b.length % 4) b += '=';
  const data = JSON.parse(decodeURIComponent(escape(atob(b))));
  const local = readAll().players || {};
  return { nick: data.n, updated: data.u || 0, localUpdated: local[data.n] ? (local[data.n].updated || 0) : 0 };
}
export function importCode(code) {
  code = (code || '').trim().replace(/\s+/g, '');
  const m = code.match(/^SK1-([A-Za-z0-9_-]+)-([A-Z0-9]+)$/);
  if (!m) throw new Error('This does not look like a save code. It should start with SK1-');
  if (crc(m[1]) !== m[2]) throw new Error('The code is damaged: a character is missing or wrong.');
  let b = m[1].replace(/-/g, '+').replace(/_/g, '/'); while (b.length % 4) b += '=';
  const data = JSON.parse(decodeURIComponent(escape(atob(b))));
  const sv = loadPlayer(data.n);
  for (const [k, v] of Object.entries(data.e || {})) sv.eps[k] = { done: !!v.d, best: v.b || 0, state: v.s || null, choices: v.c || undefined, stats: v.t || undefined, at: v.a || undefined };
  if (data.k) { sv.keys = sv.keys || {}; for (const k of data.k) sv.keys[k] = true; }
  if (data.r) sv.rogue = data.r;
  persist();
  return data.n;
}
