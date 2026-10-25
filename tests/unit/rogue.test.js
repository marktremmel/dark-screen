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
    assert.ok(a.rule && /^[a-z ]+$/.test(a.rule), 'typable rule ' + a.id);
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
  for (const x of [...FEED_LIGHTS, ...TRACKERS, ...INBOX]) {
    assert.ok(x.rule && /^[a-z ]+$/.test(x.rule), 'typable rule ' + x.id);
    if (!INBOX.includes(x)) assert.ok(x.type && /^[a-z ]+$/.test(x.type) && x.type.length <= 28, 'typable setting ' + x.id);
  }
  assert.ok(GATE.lines >= 1);
});

import { Phrase, Targets, wpm, timeFor, keyOf } from '../../src/rogue/logic/typing.js';
test('typing: phrases, accents, punctuation skipped, accuracy', () => {
  const p = new Phrase('call back');
  for (const ch of 'cxall back') p.input(ch);
  assert.ok(p.done); assert.equal(p.errors, 1); assert.equal(p.keys, 10);
  const h = new Phrase('értesítés ki');
  for (const ch of 'ertesites ki') h.input(ch);
  assert.ok(h.done, 'accents optional');
  const q = new Phrase("don't click");
  for (const ch of 'dont click') q.input(ch);
  assert.ok(q.done, 'apostrophe skipped');
  assert.equal(keyOf('Ő'), 'o'); assert.equal(wpm(50, 60000), 10); assert.ok(timeFor('abc') > 3);
});
test('typing: several targets, first key picks the nearest', () => {
  const T = new Targets(); T.add('far', 'stop', 9); T.add('near', 'send', 3); T.add('other', 'no', 2);
  assert.equal(T.input('s').id, 'near');
  assert.equal(T.input('t').result, 'miss');               // locked on "send": t is wrong
  for (const ch of 'end') T.input(ch);
  assert.equal(T.list.length, 2); assert.equal(T.lock, null);
  assert.equal(T.input('x').result, 'miss');
});


import { TOPICS, TOPIC_IDS, WALK_LINE } from '../../src/rogue/content/walks.js';
import { CARDS, CARD_COUNT } from '../../src/rogue/content/cards.js';
import { DIFFS, pickTopic, pickWalk, newRun, recordNight } from '../../src/rogue/logic/night.js';
test('walk topics: at least six typable lines each, unique ids', () => {
  const ids = new Set();
  for (const [t, T] of Object.entries(TOPICS)) {
    assert.ok(THEMES[t] && T.title && T.lines.length >= 6, t);
    for (const l of T.lines) {
      assert.ok(!ids.has(l.id), 'unique ' + l.id); ids.add(l.id);
      assert.ok(/^[a-z ]+$/.test(l.type) && l.type.length <= 30, 'type ' + l.id);
      assert.ok(/^[a-z ]+$/.test(l.rule), 'rule ' + l.id);
      assert.ok(l.who && l.say && l.lesson && !/—/.test(l.say + l.lesson), l.id);
    }
  }
  assert.ok(CARD_COUNT >= 50); assert.ok(CARDS['w:bank'] && CARDS.flyer_lookalike);
});
test('night: topics rotate, records keep the bests', () => {
  const r = rng(3), rec = { nights: [], topics: {} };
  for (let i = 0; i < 30; i++) {
    const t = pickTopic(r, rec), w = pickWalk(r, rec);
    assert.ok(TOPIC_IDS.includes(t)); if (rec.nights[0]) { assert.notEqual(t, rec.nights[0].topic); assert.notEqual(w, rec.nights[0].walk); }
    const run = newRun(t, 'normal', w); run.xp = i; run.typedChars = 100; run.typeMs = 60000; run.stages = ['stairs'];
    recordNight(rec, run, 'home');
  }
  assert.equal(rec.nights.length, 12); assert.equal(rec.best.xp, 29); assert.equal(rec.best.wpm, 20);
  const counts = Object.values(rec.topics); assert.ok(Math.max(...counts) - Math.min(...counts) <= 3, 'topics spread evenly');
  assert.ok(DIFFS.hard.reward > DIFFS.calm.reward);
});

import { ITEMS, ITEM, FLATS } from '../../src/rogue/content/furniture.js';
import { POSTS } from '../../src/rogue/content/posts.js';
import { ensureHome, cosiness, startNerve, buy, takeOut, placeItem, lift, putBack, moveUp, owned, insideFlat } from '../../src/rogue/logic/home.js';
test('home: buy, place, cosiness, move up, keep one', () => {
  for (const i of ITEMS) assert.ok(i.id && (i.model || i.img || i.led) && i.price > 0 && i.cosy > 0 && ['floor', 'wall'].includes(i.kind), i.id);
  const R = ensureRogue({}); const L = R.life;
  assert.equal(buy(L, 'sofa'), false);                       // no money
  L.coins = 200; assert.ok(buy(L, 'sofa')); assert.equal(L.coins, 130); assert.equal(L.inv.sofa, 1);
  assert.equal(cosiness(L), 0);
  assert.ok(takeOut(L, 'sofa')); placeItem(L, { id: 'sofa', x: 2, y: 0, z: -2, r: 0 });
  assert.equal(cosiness(L), ITEM.sofa.cosy); assert.equal(startNerve(L), CFG.nerveStart + ITEM.sofa.cosy);
  const h = lift(L, 0); putBack(L, h.id); assert.equal(L.home.length, 0); assert.equal(L.inv.sofa, 1);
  takeOut(L, 'sofa'); placeItem(L, { id: 'sofa', x: 2, y: 0, z: -2, r: 0 });
  L.coins = 300; assert.ok(moveUp(L)); assert.equal(L.flat, 2); assert.equal(L.floor, null); assert.equal(L.inv.sofa, 1); assert.equal(L.home.length, 0);
  assert.ok(insideFlat(L, 6, -2)); assert.ok(!insideFlat(L, 10, -2));
  assert.deepEqual(owned(L), ['sofa']);
  die(R, 'sofa'); assert.equal(R.life.inv.sofa, 1); assert.equal(R.life.flat, 1); assert.equal(R.life.coins, 0);
  assert.equal(FLATS.length, 3);
});
test('posts: both kinds, explained', () => {
  assert.ok(POSTS.filter(p => p.reveals).length >= 5 && POSTS.filter(p => !p.reveals).length >= 5);
  for (const p of POSTS) assert.ok(/^(sm|gl)_/.test(p.img) && p.caption && p.why && !/—/.test(p.why), p.id);
});

test('descent: a wrong call costs a few floors when back is set', () => {
  const r = rng(11), d = newDescent(8, { back: 2 }); prepare(r, d);
  for (let i = 0; i < 4; i++) { d.cur = { kind: 'normal', number: d.floor - d.progress, anomaly: null }; advance(r, d, resolve(d, 'down')); }
  assert.equal(d.progress, 4);
  d.cur = { kind: 'normal', number: 4, anomaly: 'bulb_red' };
  const out = resolve(d, 'down'); assert.equal(out.result, 'miss'); assert.equal(out.progress, 2);
  advance(r, d, out); assert.equal(d.cur.kind, 'normal'); assert.equal(d.cur.anomaly, null); assert.equal(d.cur.number, 6);
  const d2 = newDescent(3, { back: 2 }); prepare(r, d2); d2.cur = { kind: 'normal', number: 2, anomaly: null }; d2.progress = 1;
  advance(r, d2, resolve(d2, 'up')); assert.equal(d2.cur.kind, 'start');
});

import { Phrase as HPhrase, hardText } from '../../src/rogue/logic/typing.js';
test('hard typing: strict phrase needs capitals and punctuation, forgives accents and curly quotes', () => {
  assert.equal(hardText('Never share a code (kód). Even with a friend.'), 'Never share a code.');
  const p = new HPhrase("Don't click.", true);
  for (const ch of "don") p.input(ch);
  assert.equal(p.pos, 0);                       // lower-case d is a miss
  const q = new HPhrase("Don't click.", true);
  for (const ch of "Don’t click.") q.input(ch);
  assert.ok(q.done); assert.equal(q.errors, 0);
  const r = new HPhrase('Kérj segítséget.', true);
  for (const ch of 'Kerj segitseget.') r.input(ch);
  assert.ok(r.done);
});

import { HOME_JOBS } from '../../src/rogue/content/homejobs.js';
import { CARDS as ALLCARDS } from '../../src/rogue/content/cards.js';
import { recordNight as recN, newRun as newR } from '../../src/rogue/logic/night.js';
test('home jobs: one safe reply each, every risky reply says what happens next, cards exist', () => {
  for (const j of HOME_JOBS) {
    assert.equal(j.replies.filter(r => r.safe).length, 1, j.id);
    for (const r of j.replies) if (!r.safe) assert.ok(r.next && r.next.length > 20, j.id);
    assert.ok(ALLCARDS['j:' + j.id], j.id);
  }
});
test('the labyrinth: rooms are recorded and the best is kept', () => {
  const rec = { nights: [], best: { xp: 0, wpm: 0, stages: 0 } };
  const run = newR('T1', 'normal', 'park'); run.mode = 'labyrinth'; run.rooms = 5; run.stages = ['labyrinth'];
  recN(rec, run, 'labyrinth'); assert.equal(rec.best.rooms, 5); assert.equal(rec.best.stages, 0);
  run.rooms = 3; recN(rec, run, 'labyrinth'); assert.equal(rec.best.rooms, 5); assert.equal(rec.nights[0].rooms, 3);
});

import { SHAPES, SHAPE_IDS, pickShape, pickWalk2, nextStage, andList } from '../../src/rogue/logic/routes.js';
test('routes: every shape starts on the stairs, next stage follows the route, shapes do not repeat', () => {
  for (const id of SHAPE_IDS) assert.equal(SHAPES[id].route[0], 'stairs');
  const run = { route: SHAPES.train.route };
  assert.equal(nextStage(run, 'stairs'), 'walk'); assert.equal(nextStage(run, 'walk'), 'metro'); assert.equal(nextStage(run, 'metro'), 'school'); assert.equal(nextStage(run, 'school'), null);
  assert.equal(nextStage({ route: SHAPES.shortcut.route }, 'stairs'), 'metro');
  const r = rng(7); for (let i = 0; i < 50; i++) { const s = pickShape(r, { nights: [{ shape: 'usual' }] }); assert.notEqual(s, 'usual'); }
  for (let i = 0; i < 20; i++) assert.notEqual(pickWalk2(r, ['park', 'pool', 'hotel'], 'pool'), 'pool');
  assert.equal(andList(['a', 'b', 'c']), 'a, b and c');
});

// v0.24: night codes, topic messages, hard typing, reflection questions
import { encodeNight, decodeNight, stageSeed, CODE_SHAPES, CODE_WALKS } from '../../src/rogue/logic/nightcode.js';
import { INBOX_TOPIC } from '../../src/rogue/content/school.js';
import { typed, sentence } from '../../src/rogue/logic/typing.js';
import { REFLECT } from '../../src/rogue/content/reflect.js';
test('night codes round-trip and reject typos', () => {
  for (let i = 0; i < 300; i++) {
    const n = { topic: 'T' + (1 + (i % 12)), shape: CODE_SHAPES[i % 5], walk: CODE_WALKS[i % 8], walk2: CODE_WALKS[(i + 3) % 8], diff: ['calm', 'normal', 'hard'][i % 3], seed: (i * 37) % 2048 };
    const c = encodeNight(n), d = decodeNight(c);
    assert.deepEqual(d, n, c);
    assert.deepEqual(decodeNight(c.toLowerCase().replace('-', ' ')), n);
  }
  let bad = 0; const c = encodeNight({ topic: 'T4', shape: 'short', walk: 'alley', walk2: 'park', diff: 'normal', seed: 1234 });
  for (const ch of '0123456789ABCDEFGHJKMNPQRSTVWXYZ') { const x = c.slice(0, -1) + ch; if (x !== c && decodeNight(x)) bad++; }
  assert.ok(bad <= 4, 'most one-letter typos are caught: ' + bad);
  assert.equal(stageSeed({ seed: 5 }, 'walk'), stageSeed({ seed: 5 }, 'walk'));
  assert.notEqual(stageSeed({ seed: 5 }, 'walk'), stageSeed({ seed: 5 }, 'walk2'));
  assert.equal(decodeNight('hello'), null);
});
test('every topic has messages for the found phone', () => {
  for (let t = 2; t <= 12; t++) {
    const ms = INBOX_TOPIC.filter(m => m.theme === 'T' + t);
    assert.ok(ms.length >= 3 && ms.some(m => m.scam) && ms.some(m => !m.scam), 'T' + t);
  }
  const ids = new Set(); for (const m of INBOX_TOPIC) { assert.ok(!ids.has(m.id), m.id); ids.add(m.id); assert.ok(m.from && m.subject && m.body && m.why && /^[a-z ]+$/.test(m.rule), m.id); assert.ok(!/—/.test(m.body + m.why), 'no em dash ' + m.id); }
});
test('hard typing is a sentence everywhere', () => {
  assert.equal(typed({ type: 'autoplay off' }, false), 'autoplay off');
  assert.equal(typed({ type: 'autoplay off' }, true), 'Autoplay off.');
  assert.equal(typed({ type: 'x y', lesson: 'One sentence (egy). Two.' }, true), 'One sentence.');
  assert.equal(sentence('done!'), 'Done!');
  for (const [t, qs] of Object.entries(REFLECT)) { assert.equal(qs.length, 3, t); for (const q of qs) assert.ok(!/—/.test(q) && q.endsWith('?') || q.endsWith('.'), q); }
});
