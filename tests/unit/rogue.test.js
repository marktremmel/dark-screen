// Unit tests for the Lépcsőház pure modules. Run: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rng } from '../../src/rogue/logic/rng.js';
import { normalise, scoreAnswer } from '../../src/rogue/logic/answer.js';
import { newDescent, prepare, resolve, advance, rollLanding } from '../../src/rogue/logic/descent.js';
import { ensureRogue, die, earn, nerve, noteAnomaly } from '../../src/rogue/save/rogueSave.js';
import { ANOMALIES, ANOMALY, NOTICES } from '../../src/rogue/content/anomalies.js';
import { THEMES } from '../../src/rogue/content/themes.js';
import { CFG } from '../../src/rogue/config.js';

test('rng is deterministic and in range', () => {
  const a = rng(42), b = rng(42);
  for (let i = 0; i < 1000; i++) { const x = a(); assert.equal(x, b()); assert.ok(x >= 0 && x < 1); }
  assert.notEqual(rng(1)(), rng(2)());
});

test('normalise strips accents, case and punctuation', () => {
  assert.equal(normalise('  Engedélyt KÉRT!! '), 'engedelyt kert');
  assert.equal(normalise('Hasonmás-cím: k0zös'), 'hasonmas cim k0zos');
});

const RUB = { rubric: [['letter', 'spelling', 'betu', 'helyesiras'], ['users', 'reviews', 'felhasznalo'], ['permission', 'all your data', 'engedely']], need: 2, question: 'What gave the fake away?' };
test('rubric scoring: English, Hungarian, mixed, typos at word ends', () => {
  const cases = [
    ['It had a different letter in the name and only 12 users', 1],
    ['egy betű más volt és csak 12 felhasználója volt', 1],
    ['the betu was wrong and it wanted engedélyt for all your data', 1],
    ['the permissions were way too much for an extension', 0.5],
    ['What gave the fake away?', 0],
    ['users', 0.5],
    ['spelling', 0.5],
    ['I do not know, it just looked weird to me', 0],
  ];
  for (const [ans, want] of cases) assert.equal(scoreAnswer(ans, RUB).score, want, ans);
});

test('content: every anomaly is complete and its notice exists', () => {
  const ids = new Set();
  for (const a of ANOMALIES) {
    assert.ok(a.id && !ids.has(a.id), 'unique id ' + a.id); ids.add(a.id);
    assert.ok(THEMES[a.theme], 'theme ' + a.id);
    assert.ok(a.where, 'where ' + a.id);
    assert.ok(a.lesson && a.lesson.length > 20, 'lesson ' + a.id);
    assert.ok(a.card && a.card.title && a.card.text, 'card ' + a.id);
    if (a.notice) assert.ok(NOTICES[a.notice], 'notice ' + a.id);
    assert.ok(!/—/.test(a.lesson + a.card.text), 'no em dashes ' + a.id);
  }
  assert.ok(ANOMALIES.filter(a => a.theme !== 'OBS').length >= 6, 'mostly digital literacy');
});

test('descent: right calls reach the lobby, wrong calls reset', () => {
  const r = rng(7);
  for (let floor = 1; floor <= 10; floor++) {
    const d = newDescent(floor); prepare(r, d);
    let steps = 0;
    while (d.cur.kind !== 'lobby') {
      const dir = d.cur.anomaly ? 'up' : 'down';           // a perfect player
      const out = resolve(d, dir); assert.ok(out.result === 'pass' || out.result === 'spot');
      advance(r, d, out); steps++;
      assert.equal(d.cur.number, d.floor - d.progress);
    }
    assert.equal(steps, floor, 'one landing per floor');
  }
  const d = newDescent(5); prepare(r, d); advance(r, d, resolve(d, 'down'));
  d.cur = { kind: 'normal', number: 4, anomaly: 'bulb_red' };
  const miss = resolve(d, 'down'); assert.equal(miss.result, 'miss'); assert.equal(miss.nerve, -CFG.nerveMiss);
  advance(r, d, miss); assert.equal(d.cur.kind, 'start'); assert.equal(d.progress, 0); assert.equal(d.cur.number, 5);
  const fa = resolve({ ...d, cur: { kind: 'normal', number: 3, anomaly: null } }, 'up'); assert.equal(fa.result, 'false');
});

test('descent: anomalies appear at a sensible rate and never twice in a row', () => {
  const r = rng(99); const d = newDescent(10); d.last = null;
  let n = 0, an = 0, prev = null;
  for (let i = 0; i < 4000; i++) {
    const l = rollLanding(r, d, 1 + (i % 9), false); n++;
    if (l.anomaly) { an++; assert.ok(ANOMALY[l.anomaly]); assert.notEqual(l.anomaly, d.last); }
    d.last = l.anomaly || d.last; prev = l;
  }
  const rate = an / n; assert.ok(rate > 0.35 && rate < 0.55, 'rate ' + rate);
});

test('save: death wipes the life but keeps the record, notebook and one item', () => {
  const save = {}; const R = ensureRogue(save);
  R.life.floor = 7; earn(R, 120, 40); noteAnomaly(R, 'flyer_lookalike', true); noteAnomaly(R, 'bulb_red', false);
  assert.equal(nerve(R, -60), false); assert.equal(nerve(R, -60), true);
  die(R, 'sticker_cat');
  assert.equal(R.life.floor, null); assert.equal(R.life.coins, 0); assert.equal(R.life.kept, 'sticker_cat'); assert.equal(R.life.id, 2);
  assert.equal(R.life.nerve, CFG.nerveStart);
  assert.equal(R.record.xp, 120); assert.equal(R.record.deaths, 1); assert.deepEqual(R.record.notebook, ['flyer_lookalike']);
  assert.equal(R.record.missed.bulb_red, 1);
  // older saves without the rogue part load cleanly
  const old = { nick: 'x', eps: {} }; ensureRogue(old); assert.equal(old.rogue.v, 1);
});

import { minReadMs, rushed, Noise } from '../../src/rogue/logic/reading.js';
import { FEED_LIGHTS, TRACKERS, INBOX, GATE } from '../../src/rogue/content/school.js';

test('reading time and rush detection', () => {
  assert.equal(minReadMs(''), CFG.readBaseMs);
  assert.equal(minReadMs('one two three four five'), CFG.readBaseMs + 5 * CFG.readPerWordMs);
  assert.equal(minReadMs('w '.repeat(1000)), CFG.readCapMs);
  assert.ok(rushed('a fairly long message with many words in it', 900));
  assert.ok(!rushed('short', 3000));
  const n = new Noise(); n.add(50); n.tick(1, false); assert.equal(n.v, 50 - CFG.noiseDecay); n.tick(100, true); assert.equal(n.v, 100);
});

test('school content is complete', () => {
  for (const f of FEED_LIGHTS) assert.ok(f.id && THEMES[f.theme] && f.off && f.lesson && !/—/.test(f.lesson), f.id);
  for (const t of TRACKERS) assert.ok(t.id && t.at.length === 3 && t.label && t.lesson, t.id);
  assert.ok(INBOX.filter(m => m.scam).length >= 3 && INBOX.filter(m => !m.scam).length >= 3);
  for (const m of INBOX) assert.ok(m.from && m.subject && m.body && m.why && THEMES[m.theme], m.id);
  const ok = ['I will turn off autoplay and notifications at night', 'blokkolom a követőket és a sütiket', 'check the sender address before I click a link'];
  for (const a of ok) assert.ok(scoreAnswer(a, GATE).score >= 1, a);
  assert.ok(scoreAnswer('idk', GATE).score < 1);
});
