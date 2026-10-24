// v0.23: the trailer. The same cutscene engine as the intro, cut faster, with sounds on the beat (`cues`).
// Rendered frame by frame (tools/ccap.py trailer), then mixed with the music (tools/trailer_mix.py). About 70 seconds.
// Captured from the PUBLIC data (no Ikarus at the bus station).
import { cineMimic, mazeCam } from '../ui/cine.js';
import { DEMO_HOME } from './intro.js';

/** Key clicks for a typed line. */
const keys = (at, text, cps = 12) => [...text].map((c, i) => [at + i / cps, 'press', c === ' ' ? 0.12 : 0.22]);

/** A figure walking up; the reply is typed; it dissolves. */
function figures(list, stopAt = 1.9) {
  return {
    setup: (sc, C) => { C.data.ms = list.map(([x, z, tx, tz], i) => ({ m: cineMimic(sc, { id: 't' + i }, x, z, i, 1.5), tx, tz })); C.data.gone = false; },
    tick: (sc, dt, k, C) => {
      const s = C.shot, end = s.type ? s.type.at + s.type.text.length / (s.type.cps || 12) + 0.3 : 1e9;
      if (!C.data.gone && C.t > end) { C.data.gone = true; for (const f of C.data.ms) f.m.dissolve(); }
      for (const f of C.data.ms) if (C.data.gone) f.m.tickFade(dt); else f.m.walkTo(dt, f.tx, f.tz, stopAt);
    },
  };
}
const arcadeCam = sc => {
  const a = sc.arcade; if (!a) return [[0, 1.6, 0, 0, 0]];
  let best = null; for (const p of sc.route) { const d = p.distanceTo(a.pos); if (!best || d < best.d) best = { p, d }; }
  const dx = a.pos.x - best.p.x, dz = a.pos.z - best.p.z, yaw = Math.atan2(-dx, -dz) * 180 / Math.PI;
  return [[best.p.x - dx * 0.6, 1.55, best.p.z - dz * 0.6, yaw - 4, -4], [best.p.x - dx * 0.25, 1.5, best.p.z - dz * 0.25, yaw, -6]];
};

const ALLEY = { who: 'Your bank', say: 'Someone is using your card right now. Read me the code we just sent you.', type: 'my bank never asks that' };

export const TRAILER = [
  { card: true, dur: 3, title: '', kicker: '', text: 'A panel block in Budapest. A small flat. Every night, you go out.', cues: [[0.2, 'rg_signal1', 0.3]] },
  { at: 'stairs', dur: 4, title: 'Down the stairs.', cam: [[-2.6, 1.6, 0.5, -90, 0], [-1.6, 1.6, 0.85, -80, -3]], cues: [[0.4, 'lightsw', 0.5]] },
  { at: 'stairs', dur: 3.2, title: 'Learn what normal looks like.', cam: [[0.6, 1.5, -1.0, 0, -10], [0.6, 1.3, -1.5, 0, -18]] },
  { at: 'stairs', dur: 3.4, title: 'Then notice what changed.', cam: [[-0.2, 1.6, 0.6, 172, 2], [-0.3, 1.6, 1.0, 168, 4]],
    setup: sc => { sc.d.cur.anomaly = 'bulb_red'; sc.dressAll(); }, cues: [[0.15, 'stinger', 0.35]] },
  { at: 'stairs', dur: 3, title: '', cam: [[-0.5, 1.6, 1.0, 12, 0], [-0.5, 1.6, 0.6, 10, 0]],
    setup: sc => { sc.d.cur.anomaly = 'lift_streak'; sc.dressAll(); } },
  { at: 'stairs', dur: 3.6, title: 'Miss it, and you wake up here.', cam: sc => mazeCam(sc),
    setup: sc => { sc.d.cur.anomaly = null; sc.dressAll(); },
    tick: sc => { const p = sc.G.camera.position; sc.yLight.position.set(p.x, 2.3, p.z); }, cues: [[0.05, 'rg_signal2', 0.5]] },
  { card: true, dur: 2.2, title: '', text: 'Outside, they walk towards you.' },
  { at: 'walk:alley', dur: 7.2, torch: true, title: 'They say what scammers say.', cam: [[0.6, 1.4, -8.6, 12, 3], [0.8, 1.35, -9.0, 14, 4]],
    say: { who: ALLEY.who, text: ALLEY.say, at: 1.2 }, type: { text: ALLEY.type, at: 3.6, cps: 12 },
    ...figures([[0.2, -14.5, 0.6, -8.6]]), cues: [[1.2, 'phonering', 0.25], ...keys(3.6, ALLEY.type), [5.8, 'rg_signal1', 0.4]] },
  { at: 'walk:courtyard', dur: 3.6, torch: true, title: 'You type the safe reply.', cam: [[-2, 1.7, -4, -25, -2], [-1.6, 1.65, -4.6, -22, -2]],
    ...figures([[-1.2, -13, 0, -6], [1.3, -14.5, 0.4, -6.5]]) },
  { at: 'walk:bus', dur: 3.2, torch: true, title: 'The last bus is waiting.', cam: [[2.5, 1.6, -10, -30, 0], [2.2, 1.6, -10.8, -32, 0]] },
  { at: 'walk:underpass', dur: 3.4, torch: true, title: 'Spot the tricks.', cam: arcadeCam },
  { at: 'school', dur: 3.2, title: 'Switch off what pulls at your eyes.', cam: [[2.5, 1.6, -1.2, 70, 0], [1.4, 1.6, -1.3, 65, 0]],
    tick: (sc, dt, k, C) => { if (sc.hooks) for (const h of sc.hooks) sc.drawHook(h, C.t); } },
  { at: 'school', dur: 3.2, title: 'Something moves when you look away.', cam: [[0, 1.6, -17.5, 0, -3], [0, 1.6, -18.3, -4, -3]],
    setup: sc => { sc.watcher.place(-1.5, -22.5, { x0: -5.6, x1: 5.6, z0: -25.6, z1: -16.4 }); }, cues: [[0.3, 'presence', 0.4]] },
  { at: 'school', dur: 3.6, title: 'Be the one who helps.', cam: [[3.2, 1.5, -34.6, 33, -6], [2.6, 1.5, -35.4, 33, -7]],
    tick: (sc, dt) => { if (sc.chorus) for (const c of sc.chorus.crowd) if (c.n) c.n.update(dt); } },
  { at: 'metro', dur: 3.6, title: 'Your old posts are glowing.', cam: [[1.2, 1.6, -1.6, -90, 0], [2.2, 1.6, -1.7, -90, 0]],
    setup: sc => { if (sc.collector) sc.collector.obj.position.set(9, 0, -2.2); }, cues: [[0.2, 'rg_station_bell', 0.3]] },
  { at: 'home', dur: 4, title: 'Come home. Make it yours.', cam: [[3.9, 1.75, -0.4, 34, -12], [3.5, 1.65, -1.1, 40, -9]] },
  { card: true, dur: 3.2, kicker: 'Every night is different', title: '12 topics · 8 places', text: 'Scams, voice clones, tracking, pressure, your digital footprint, your rights. 214 notebook cards to collect.' },
  { card: true, dur: 2.6, title: 'The faster you type,', text: 'the safer you are.', cues: [[0.1, 'press', 0.2], [0.2, 'press', 0.2], [0.33, 'press', 0.2]] },
  { card: true, dur: 4.8, kicker: 'Sötét Képernyő', title: 'Lépcsőház', text: 'Free in your browser. For 13 and up. Headphones on.', cues: [[0.1, 'stinger', 0.4]] },
];

export const TRAILER_OPTS = { home: DEMO_HOME, skippable: true, hint: ' ', topic: 'T1' };
