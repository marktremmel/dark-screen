// Your flat as data: buying, placing, cosiness, moving to a bigger flat. PURE.
// life.inv = { itemId: count } (things in the box), life.home = [{ id, x, y, z, r }] (placed), life.flat = 1..3.
import { ITEM, FLATS, COSY_MAX } from '../content/furniture.js';
import { CFG } from '../config.js';

export function ensureHome(life) { life.inv = life.inv || {}; life.home = life.home || []; life.flat = life.flat || 1; return life; }
export const flatOf = life => FLATS[(life.flat || 1) - 1];

/** Cosiness of what is placed (things in the box don't count). */
export function cosiness(life) { return Math.min(COSY_MAX, (life.home || []).reduce((s, h) => s + ((ITEM[h.id] || {}).cosy || 0), 0)); }
/** Nerve you start a night with: the base, the flat's bonus, and the cosiness. */
export const startNerve = life => CFG.nerveStart + flatOf(ensureHome(life)).nerve + cosiness(life);

export function buy(life, id) {
  const it = ITEM[id]; ensureHome(life);
  if (!it || life.coins < it.price) return false;
  life.coins -= it.price; life.inv[id] = (life.inv[id] || 0) + 1; return true;
}
/** Take one out of the box to place it. */
export function takeOut(life, id) { ensureHome(life); if (!life.inv[id]) return false; life.inv[id]--; if (!life.inv[id]) delete life.inv[id]; return true; }
export function putBack(life, id) { ensureHome(life); life.inv[id] = (life.inv[id] || 0) + 1; }
export function placeItem(life, h) { ensureHome(life); life.home.push(h); }
/** Lift a placed thing (by index); it goes nowhere until you place it again or put it back. */
export function lift(life, index) { return life.home.splice(index, 1)[0]; }

/** Move to a bigger flat: pay, everything goes into boxes, choose a floor again. */
export function moveUp(life) {
  ensureHome(life); const next = FLATS[life.flat];
  if (!next || life.coins < next.price) return false;
  life.coins -= next.price; life.flat = next.level;
  for (const h of life.home) putBack(life, h.id);
  life.home = []; life.floor = null; return true;
}
/** Everything you own, for choosing the one thing to keep when a life ends. */
export function owned(life) {
  ensureHome(life); const ids = new Set(Object.keys(life.inv)); for (const h of life.home) ids.add(h.id);
  return [...ids].filter(id => ITEM[id]);
}
/** Is a point inside the flat (with a margin)? */
export function insideFlat(life, x, z, m = 0) { return flatOf(life).rooms.some(r => x > r.x0 + m && x < r.x1 - m && z > r.z0 + m && z < r.z1 - m); }
