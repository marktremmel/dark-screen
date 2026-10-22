// Anti-rush and noise: PURE.
import { CFG } from '../config.js';

/** Words in a piece of text. @param {string} s */
export const wordCount = s => String(s || '').trim().split(/\s+/).filter(Boolean).length;

/** Minimum time to read something before answering (ms). @param {string} text */
export function minReadMs(text) { return Math.min(CFG.readCapMs, CFG.readBaseMs + CFG.readPerWordMs * wordCount(text)); }

/** Was this answer rushed? @param {string} text @param {number} ms time from showing to answering */
export const rushed = (text, ms) => ms < minReadMs(text);

/** One noise meter, 0..100. */
export class Noise {
  constructor() { this.v = 0; }
  add(n) { this.v = Math.min(100, this.v + n); return this.v; }
  /** @param {number} dt @param {boolean} running */
  tick(dt, running) { this.v = running ? Math.min(100, this.v + CFG.noiseRun * dt) : Math.max(0, this.v - CFG.noiseDecay * dt); return this.v; }
}
