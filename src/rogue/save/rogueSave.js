// The Lépcsőház part of a player's save. PURE: works on a plain save object, so it can be tested in Node.
// Shape (schema v1):
// rogue: { v, life: { id, floor, coins, kept, home, stickers, gadgets, hard, nerve },
//          record: { xp, missions, descents, runs, deaths, spotted: {id: n}, missed: {id: n}, notebook: [] },
//          options: { t8 } }
import { CFG } from '../config.js';

export const SCHEMA = 1;

/** A fresh, empty life. The floor is chosen in the game (null until then). @param {number} id @param {string|null} kept */
export function newLife(id, kept = null) {
  return { id, floor: null, coins: 0, kept, home: [], stickers: [], gadgets: { torch: 0, lens: 0, phone: 0 }, hard: false, nerve: CFG.nerveStart };
}
export function newRecord() { return { xp: 0, missions: 0, descents: 0, runs: 1, deaths: 0, spotted: {}, missed: {}, notebook: [] }; }

/** Make sure save.rogue exists and is on the current schema. Returns it. @param {any} save */
export function ensureRogue(save) {
  if (!save.rogue) save.rogue = { v: SCHEMA, life: newLife(1), record: newRecord(), options: { t8: true } };
  const R = save.rogue;
  // migrations go here, one step per schema version: if (R.v === 1) { ...; R.v = 2; }
  R.life = { ...newLife(R.life ? R.life.id : 1), ...(R.life || {}) };
  R.record = { ...newRecord(), ...(R.record || {}) };
  R.options = { t8: true, ...(R.options || {}) };
  return R;
}

/**
 * Death: the flat, coins, floor and gadgets are gone. The record, the notebook and one kept item survive.
 * @param {any} R save.rogue @param {string|null} keep id of the item the player keeps (or null)
 */
export function die(R, keep = null) {
  R.record.deaths++; R.record.runs++;
  R.life = newLife(R.life.id + 1, keep);
  return R.life;
}

/** Add XP and coins earned on the stairs. */
export function earn(R, xp, coins) { R.record.xp += xp; R.life.coins += coins; }

/** Change nerve, clamped 0..start. Returns true if this kills you. */
export function nerve(R, delta) {
  R.life.nerve = Math.max(0, Math.min(CFG.nerveStart, R.life.nerve + delta));
  return R.life.nerve <= 0;
}

/** Remember a caught or missed anomaly, and unlock its notebook card when caught. */
export function noteAnomaly(R, id, caught) {
  const m = caught ? R.record.spotted : R.record.missed; m[id] = (m[id] || 0) + 1;
  if (caught && !R.record.notebook.includes(id)) { R.record.notebook.push(id); return true; }
  return false;
}
