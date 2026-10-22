// Seeded random numbers (mulberry32), so a run can be replayed exactly in tests.

/** @param {number} seed @returns {() => number} a function returning floats in [0, 1) */
export function rng(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Pick one element. @template T @param {() => number} r @param {T[]} arr @returns {T} */
export const pick = (r, arr) => arr[Math.floor(r() * arr.length)];

/** A fresh seed from the clock (not for tests). */
export const freshSeed = () => (Date.now() ^ (Math.random() * 0x7fffffff)) >>> 0;
