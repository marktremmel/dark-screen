// The shape of a night (v0.17, Mark's list item 2). Until v0.16 every night ran stairs -> walk -> school -> metro.
// Now a night has a route, picked when you go out and shown on the night menu, so two nights feel different before
// anything has happened. PURE: no DOM, no three.js.

export const WALK_NAME = { park: 'the park', backrooms: 'the yellow rooms', hotel: 'the hotel corridor', pool: 'the empty pool', underpass: 'the underpass',
  courtyard: 'the courtyard', alley: 'the alley', bus: 'the bus station' };

/** The shapes. `walk2` is a second walk on the way home (always a different place from the first). */
export const SHAPES = {
  usual: { id: 'usual', name: 'The usual night', hu: 'a szokásos', w: 3, route: ['stairs', 'walk', 'school', 'metro'],
    desc: 'Down the stairs, out through {walk}, the school, then the last train home.' },
  short: { id: 'short', name: 'A short night', hu: 'rövid éjszaka', w: 1.5, route: ['stairs', 'walk'],
    desc: 'The school is locked tonight. Only the stairs and {walk}: a quick one.' },
  train: { id: 'train', name: 'The train first', hu: 'előbb a metró', w: 1.5, route: ['stairs', 'walk', 'metro', 'school'],
    desc: 'The last train is early tonight. After {walk}, the metro, and the school at the end of the line.' },
  shortcut: { id: 'shortcut', name: 'The shortcut', hu: 'rövidítés', w: 1.5, route: ['stairs', 'metro', 'school'],
    desc: 'The basement door is open: straight from the ground floor into the metro, then the school.' },
  long: { id: 'long', name: 'The long night', hu: 'hosszú éjszaka', w: 2, route: ['stairs', 'walk', 'school', 'metro', 'walk2'],
    desc: 'The last train stops early. After the school and the metro, one more walk home, through {walk2}. Rewards x1.2.' },
};
export const SHAPE_IDS = Object.keys(SHAPES);

/** Pick a shape at random by weight, never the same as last night's. */
export function pickShape(r, record) {
  const last = (record.nights || [])[0], pool = SHAPE_IDS.filter(s => !last || last.shape !== s);
  const total = pool.reduce((a, s) => a + SHAPES[s].w, 0); let x = r() * total;
  for (const s of pool) { x -= SHAPES[s].w; if (x <= 0) return s; }
  return pool[pool.length - 1];
}
/** A second place for the walk home, different from the first. */
export function pickWalk2(r, walks, first) {
  const pool = walks.filter(w => w !== first);
  return pool[Math.floor(r() * pool.length)];
}
/** The stage after `from` on this run's route, or null at the end. */
export function nextStage(run, from) {
  const route = run.route || SHAPES.usual.route, i = route.indexOf(from);
  return i >= 0 && i < route.length - 1 ? route[i + 1] : null;
}
/** Which place a walk stage uses. */
export const walkOf = (run, stage) => stage === 'walk2' ? run.walk2 : run.walk;
/** Human names for the route, for the menu and the debrief. */
export function stageName(run, st) {
  return st === 'stairs' ? 'the stairwell' : st === 'walk' ? WALK_NAME[run.walk] : st === 'walk2' ? WALK_NAME[run.walk2] : st === 'school' ? 'the school' : st === 'metro' ? 'the last train' : st === 'labyrinth' ? 'the labyrinth' : st;
}
export const fillDesc = (run, s) => s.replace('{walk}', WALK_NAME[run.walk] || 'a walk').replace('{walk2}', WALK_NAME[run.walk2] || 'another place');
/** "a, b and c" */
export const andList = xs => xs.length < 2 ? xs.join('') : xs.slice(0, -1).join(', ') + ' and ' + xs[xs.length - 1];
