// Typing practice: PURE. Phrases are typed letter by letter (Typing of the Dead style).
// Case and accents don't matter (á = a). A wrong key is a mistake; the cursor does not move until the right key comes.

/** The typable form of one character: lower case, no accent. */
export const keyOf = ch => String(ch).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/** One phrase being typed. */
export class Phrase {
  /** @param {string} text */
  constructor(text) { this.text = text; this.pos = 0; this.errors = 0; this.keys = 0; }
  get done() { return this.pos >= this.text.length; }
  get next() { return this.text[this.pos]; }
  /** Feed one typed character. @returns {'hit'|'miss'|'done'} */
  input(ch) {
    if (this.done) return 'done';
    this.keys++;
    if (keyOf(ch) === keyOf(this.next)) { this.pos++; while (!this.done && /[^\p{L}\p{N} ]/u.test(this.next)) this.pos++; return this.done ? 'done' : 'hit'; }
    this.errors++; return 'miss';
  }
  /** Accuracy 0..1 */
  get accuracy() { return this.keys ? (this.keys - this.errors) / this.keys : 1; }
}

/** Words per minute (5 characters = 1 word). */
export const wpm = (chars, ms) => ms > 0 ? Math.min(250, Math.round(chars / 5 / (ms / 60000))) : 0;   // capped: nobody types faster

/** Time allowed for a phrase (seconds): a base plus a little per character. */
export const timeFor = (text, base = 3, perChar = 0.32) => base + perChar * text.length;

/**
 * Several targets at once (the park): the first key you type picks the target (the nearest whose phrase starts with it),
 * then you stay on it until it is finished.
 */
export class Targets {
  constructor() { this.list = []; this.lock = null; }
  /** @param {string|number} id @param {string} text @param {number} dist */
  add(id, text, dist = 0) { const t = { id, p: new Phrase(text), dist }; this.list.push(t); return t; }
  remove(id) { this.list = this.list.filter(t => t.id !== id); if (this.lock && this.lock.id === id) this.lock = null; }
  /** @returns {{id: any, result: 'hit'|'miss'|'done'}|null} */
  input(ch) {
    if (!this.lock) {
      const cands = this.list.filter(t => keyOf(t.p.next) === keyOf(ch)).sort((a, b) => a.dist - b.dist);
      if (!cands.length) return { id: null, result: 'miss' };
      this.lock = cands[0];
    }
    const t = this.lock, r = t.p.input(ch);
    if (r === 'done') { this.remove(t.id); }
    return { id: t.id, result: r };
  }
}
