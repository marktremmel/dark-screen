// v0.24: night codes. A teacher writes one on the board (e.g. T1-4K7QM) and every student gets the same night:
// the topic, the route, the places, the difficulty, and the seed that decides the landings, the lines, the school and
// the metro. PURE, tested in Node.
// The 5 characters hold 25 bits: shape (3), walk (3), second walk (3), difficulty (2), seed (11), check (3).
import { freshSeed } from './rng.js';

const ALPH = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';   // Crockford-style: no I, L, O, U (they look like 1, 1, 0, V)
export const CODE_SHAPES = ['usual', 'short', 'train', 'shortcut', 'long'];
export const CODE_WALKS = ['park', 'backrooms', 'hotel', 'pool', 'underpass', 'courtyard', 'alley', 'bus'];
export const CODE_DIFFS = ['calm', 'normal', 'hard'];
const TOPIC_RE = /^T(1[0-2]|[1-9])$/;

const check = (topicN, v) => { let h = topicN * 7; for (let i = 0; i < 22; i++) h += ((v >>> i) & 1) * (i + 3); return h & 7; };

/** @param {{topic:string, shape:string, walk:string, walk2?:string, diff:string, seed:number}} n @returns {string} */
export function encodeNight(n) {
  const topicN = +n.topic.slice(1);
  const sh = Math.max(0, CODE_SHAPES.indexOf(n.shape)), w = Math.max(0, CODE_WALKS.indexOf(n.walk)), w2 = Math.max(0, CODE_WALKS.indexOf(n.walk2 || 'park')), d = Math.max(0, CODE_DIFFS.indexOf(n.diff));
  const v = (sh) | (w << 3) | (w2 << 6) | (d << 9) | ((n.seed & 2047) << 11);
  let all = v | (check(topicN, v) << 22), s = '';
  for (let i = 0; i < 5; i++) { s = ALPH[all & 31] + s; all >>>= 5; }
  return `${n.topic}-${s}`;
}

/** Read a code; tolerant of spaces, lower case and O/I/L typed for 0/1. Returns null if it is not a valid code. */
export function decodeNight(code) {
  const m = String(code || '').toUpperCase().replace(/\s+/g, '').replace(/[–—_]/g, '-').match(/^(T\d{1,2})-?([0-9A-Z]{5})$/);
  if (!m || !TOPIC_RE.test(m[1])) return null;
  let all = 0;
  for (const ch of m[2].replace(/O/g, '0').replace(/[IL]/g, '1').replace(/U/g, 'V')) { const k = ALPH.indexOf(ch); if (k < 0) return null; all = all * 32 + k; }
  const v = all & 0x3fffff, topicN = +m[1].slice(1);
  if ((all >>> 22) !== check(topicN, v)) return null;
  const n = { topic: m[1], shape: CODE_SHAPES[v & 7], walk: CODE_WALKS[(v >>> 3) & 7], walk2: CODE_WALKS[(v >>> 6) & 7], diff: CODE_DIFFS[(v >>> 9) & 3], seed: (v >>> 11) & 2047 };
  if (!n.shape || !n.diff || n.walk2 === n.walk && n.shape === 'long') return null;
  return n;
}

/** The seed for one stage of a night: fixed when the night came from a code, fresh otherwise. */
export function stageSeed(run, stage) {
  if (!run || run.seed == null) return freshSeed();
  let h = (run.seed * 2654435761) >>> 0;
  for (const ch of String(stage)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  return h;
}
