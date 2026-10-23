// The descent from your flat to the ground floor, with Exit 8 rules. PURE: no three.js, no DOM.
// You stand on a landing. If something is wrong, turn back (go up). If nothing is wrong, keep going down.
// Either way you arrive at the next landing. A right call moves you one floor closer to the ground;
// a wrong call sends you back to your own floor.
import { CFG, floorMult } from '../config.js';
import { ANOMALIES } from '../content/anomalies.js';
import { pick } from './rng.js';

/**
 * @typedef {{kind: 'start'|'normal'|'lobby', number: number, anomaly: string|null}} Landing
 * @typedef {{floor: number, progress: number, cur: Landing, next: Landing|null, last: string|null, afterReset: boolean}} Descent
 */

/** A new descent from your own front door. @param {number} floor @returns {Descent} */
export function newDescent(floor, o = {}) {
  return { floor, progress: 0, cur: { kind: 'start', number: floor, anomaly: null }, next: null, last: null, afterReset: false,
    chance: o.chance ?? CFG.anomalyChance, topic: o.topic || null, back: o.back ?? Infinity };
}

/** Roll the landing a right call leads to, so the scene can build it before you arrive. Call after every arrival. @param {() => number} r @param {Descent} d */
export function prepare(r, d) { d.next = rollLanding(r, d, d.progress + 1, d.afterReset); return d.next; }

/** The landing an outcome leads to: the prepared next one, or your own floor after a wrong call. @param {Descent} d */
export function landingFor(d, out) {
  if (out.progress === 0) return { kind: 'start', number: d.floor, anomaly: null };
  if (out.result === 'miss' || out.result === 'false') return { kind: 'normal', number: d.floor - out.progress, anomaly: null };   // back a few floors, on a normal landing
  return d.next;
}

/** Choose what the next landing looks like. @param {() => number} r @param {Descent} d @param {number} progress @param {boolean} afterReset @returns {Landing} */
export function rollLanding(r, d, progress, afterReset) {
  const number = d.floor - progress;
  if (progress >= d.floor) return { kind: 'lobby', number: 0, anomaly: null };
  if (progress === 0) return { kind: 'start', number, anomaly: null };
  if (afterReset && r() < CFG.firstAfterResetNormal) return { kind: 'normal', number, anomaly: null };
  if (r() >= (d.chance ?? CFG.anomalyChance)) return { kind: 'normal', number, anomaly: null };
  // tonight's topic comes up three times as often
  const pool = ANOMALIES.filter(a => a.id !== d.last).flatMap(a => a.theme === d.topic ? [a, a, a] : [a]);
  return { kind: 'normal', number, anomaly: pick(r, pool).id };
}

/**
 * What happens if you leave the current landing in a direction. Does not change d.
 * @param {Descent} d @param {'up'|'down'} dir
 * @returns {{result: 'pass'|'spot'|'miss'|'false', progress: number, nerve: number, xp: number, coins: number, anomaly: string|null}}
 */
export function resolve(d, dir) {
  const a = d.cur.anomaly, m = floorMult(d.floor);
  if (a && dir === 'up') return { result: 'spot', progress: d.progress + 1, nerve: CFG.nerveSpot, xp: Math.round(CFG.xpSpot * m), coins: Math.round(CFG.coinsSpot * m), anomaly: a };
  if (a && dir === 'down') return { result: 'miss', progress: Math.max(0, d.progress - (d.back ?? Infinity)), nerve: -CFG.nerveMiss, xp: 0, coins: 0, anomaly: a };
  if (!a && dir === 'down') return { result: 'pass', progress: d.progress + 1, nerve: 0, xp: Math.round(CFG.xpPass * m), coins: Math.round(CFG.coinsPass * m), anomaly: null };
  return { result: 'false', progress: Math.max(0, d.progress - (d.back ?? Infinity)), nerve: -CFG.nerveFalse, xp: 0, coins: 0, anomaly: null };
}

/** Commit an outcome and roll the landing after it. Returns the landing you are now on. @param {() => number} r @param {Descent} d @param {ReturnType<typeof resolve>} out */
export function advance(r, d, out) {
  const reset = out.result === 'miss' || out.result === 'false';
  if (d.cur.anomaly) d.last = d.cur.anomaly;
  d.cur = landingFor(d, out);
  d.progress = out.progress; d.afterReset = reset;
  if (d.cur.kind !== 'lobby') prepare(r, d); else d.next = null;
  return d.cur;
}

/** Ground floor reward. @param {number} floor */
export function groundReward(floor) { const m = floorMult(floor); return { xp: Math.round(CFG.xpGround * m), coins: Math.round(CFG.coinsGround * m) }; }
