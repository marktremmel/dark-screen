// One night out (a run): difficulty, tonight's topic, the scores. PURE.
// A night goes: stairwell -> a walk on tonight's topic (park, backrooms, hotel or pool) -> choice: the school or home.
import { TOPIC_IDS } from '../content/walks.js';

export const DIFFS = {
  calm: { id: 'calm', label: 'Calm', hu: 'nyugis', desc: 'Fewer anomalies, a wrong call costs one floor, more time to type. Smaller rewards.',
    anomaly: 0.35, back: 1, nerveLoss: 0.6, speed: 0.8, typeTime: 1.4, light: 45, reward: 0.8 },
  normal: { id: 'normal', label: 'Normal', hu: 'normál', desc: 'A wrong call on the stairs costs two floors.',
    anomaly: 0.45, back: 2, nerveLoss: 1, speed: 1, typeTime: 1, light: 30, reward: 1 },
  hard: { id: 'hard', label: 'Hard', hu: 'nehéz', desc: 'A wrong call sends you back to your own floor. Less light, faster figures. Rewards x1.5.',
    anomaly: 0.55, back: Infinity, nerveLoss: 1.4, speed: 1.25, typeTime: 0.8, light: 20, reward: 1.5 },
};

export const WALKS = ['park', 'backrooms', 'hotel', 'pool', 'underpass'];

/** Pick tonight's topic: themes you have met least come first, never the same as last night. */
export function pickTopic(r, record) {
  const seen = record.topics || {}, last = (record.nights || [])[0];
  const pool = TOPIC_IDS.filter(t => !last || last.topic !== t);
  const min = Math.min(...pool.map(t => seen[t] || 0));
  const least = pool.filter(t => (seen[t] || 0) <= min + 1);
  return least[Math.floor(r() * least.length)];
}
/** Pick tonight's walk: the park often, the liminal places sometimes, not the same twice in a row. */
export function pickWalk(r, record) {
  const last = (record.nights || [])[0];
  const pool = WALKS.flatMap(w => w === 'park' ? [w, w] : [w]).filter(w => !last || last.walk !== w);
  return pool[Math.floor(r() * pool.length)];
}

export function newRun(topic, diff, walk) {
  return { topic, diff, walk, xp: 0, coins: 0, spot: 0, miss: 0, fals: 0, stages: [], lessons: [], typedChars: 0, typeMs: 0, keys: 0, errors: 0, cards: 0 };
}
export const runWpm = run => run.typeMs > 0 ? Math.min(250, Math.round(run.typedChars / 5 / (run.typeMs / 60000))) : 0;
export const runAcc = run => run.keys ? Math.round((run.keys - run.errors) / run.keys * 100) : 100;

/** Write a finished night into the record (newest first, last 12 kept) and update the bests. */
export function recordNight(record, run, outcome, date = Date.now()) {
  const n = { t: date, topic: run.topic, walk: run.walk, diff: run.diff, xp: run.xp, coins: run.coins, stages: run.stages.length, wpm: runWpm(run), acc: runAcc(run), outcome };
  record.nights = [n, ...(record.nights || [])].slice(0, 12);
  record.topics = record.topics || {}; record.topics[run.topic] = (record.topics[run.topic] || 0) + 1;
  const b = record.best = record.best || { xp: 0, wpm: 0, stages: 0 };
  if (n.xp > b.xp) b.xp = n.xp; if (n.wpm > b.wpm) b.wpm = n.wpm; if (n.stages > b.stages) b.stages = n.stages;
  return n;
}
