# Lépcsőház (the stairwell mode)

A separate first-person roguelite for 13+, inside Sötét Képernyő. Read this first in every build session and update it at the end.
The full design is in the planning documents (Lepcsohaz 01 Research, 02 Assets, 03 Design and implementation plan).

## Where things are

- `config.js`: every tuning number (light timer, anomaly chance, nerve, rewards).
- `logic/`: pure code, no three.js or DOM, tested in Node (`npm test`).
  - `rng.js` seeded random, `answer.js` typed-answer scoring (English and Hungarian), `descent.js` the Exit 8 rules.
- `save/rogueSave.js`: the `rogue` part of the player save (schema v1), death and the kept item.
- `content/`: data only. `themes.js` (T1 to T12 and OBS), `anomalies.js` (landing anomalies and the notices).
- `home/HomeScene.js`: your flat.
- `mission/stairwell.js`: the stairwell scene; `mission/landing.js` dresses one landing (normal or with one anomaly).
- `ui/panels.js`: notices, house rules, computer, floor picker, death, ground floor.
- `index.js`: `G.goRogue()` (to your flat) and `G.goStairs()` (out of the front door). Installed from `main.js`.

## How the stairwell works

Five copies of one storey are stacked (two above, two below). Your height comes from `groundY()`: on the stairs the floor
surfaces overlap in plan, so it picks the surface closest to where you were. When you step onto the next landing, the world
shifts by one storey so you are always on copy 0, `descent.advance()` decides if the call was right, and the landings are
re-dressed. The copies above and below always show the next landing (`d.next`), so peeking down the stairwell gives nothing away.
A wrong call goes through the yellow room and back to your own floor.

Engine additions this mode needed (safe for the episodes): `Player.yOff` (floor height) and colliders with an optional
`y0`/`y1` height range.

## Adding an anomaly

1. Add an entry to `content/anomalies.js` with a `where` that `landing.js` understands, a lesson and a notebook card.
2. If it needs a new `where`, add it to `dressLanding()`.
3. Run `npm test` (the content test checks every field) and look at it in a screenshot test (`tools/t84.py`).

## Status

- Phase 0 done: skeleton, config, rng, answer scoring, save schema v1, themes, content test, the `rogue` asset pack,
  the hub door with the teacher code.
- Phase 1, session 1 done: the flat (new life), floor picker, the stairwell descent with 12 anomalies, light timer and torch,
  nerve, the yellow room, death and a new life, the ground floor.
- Next: Phase 1, session 2 (the school: corridor, classroom, gym; Feed and Watcher; loop, Badger lens and found-phone encounters).

## Codes

The classroom build asks for a code at the Lépcsőház door: PANELHAZ (accents and case don't matter). The teacher key opens it too.
