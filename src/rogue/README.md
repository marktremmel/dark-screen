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
- `mission/school.js`: the first mission (corridor ring with the Feed, classroom with the Watcher and the Badger lens, gym with the found phone, the exit intercom).
- `entities/watcher.js`: moves only while unseen, sized and sped up by active trackers, will not enter a safe light.
- `content/school.js`: attention hooks, trackers, inbox messages, the exit-gate rubric. `logic/reading.js`: minimum reading time and the noise meter.
- `ui/missionPanels.js`: the phone, the mission debrief, the mission choice at the street door is in `ui/panels.js`.
- `logic/typing.js` + `ui/typing.js`: typing practice. One phrase against the clock (`typeOne`), or several targets at once
  where the first letter picks the nearest (`Targets` + `LabelLayer`). Case and accents don't matter. While typing,
  letters never reach the movement keys.
- A night (`logic/night.js`, `index.js`): the night menu at your front door (tonight's topic, difficulty Calm/Normal/Hard,
  your scores) -> the stairwell -> the walk -> the school or home -> the night's debrief. `G.run` carries the night.
- `mission/walk.js`, `entities/mimic.js`, `content/walks.js`: the walk. One topic per night (6 lines each for T1, T2, T5,
  T6, T9, T10, T11), one of four places: the park (from your block's front door), the yellow rooms, the hotel corridor,
  the empty pool (indoor corridors are generated each night). Three waves; the speech goes in a box, the labels show only
  what to type. Every answered line is a notebook card (`content/cards.js`).
- `ui/panels.js`: notices, house rules, computer, floor picker, death, ground floor.
- `index.js`: `G.goRogue()` (to your flat) and `G.goStairs()` (out of the front door). Installed from `main.js`.

## How the stairwell works

Five copies of one storey are stacked (two above, two below). Your height comes from `groundY()`: on the stairs the floor
surfaces overlap in plan, so it picks the surface closest to where you were. When you step onto the next landing, the world
shifts by one storey so you are always on copy 0, `descent.advance()` decides if the call was right, and the landings are
re-dressed. The copies above and below always show the next landing (`d.next`), so peeking down the stairwell gives nothing away.
A wrong call drops you into the yellow rooms: a 4 x 4 maze generated each time, with the Watcher walking the corridors
(it only moves while you look away), two old screens that make it lose you if you type their line, and an EXIT door that opens
for the rule of the anomaly you missed. You come back out a few floors up (one on Calm, two on Normal, your own floor on Hard).

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
- Phase 1, session 2 done: the street door leads to the school. Zone 1 the Feed (six attention hooks that pull your view, laps cost nerve),
  zone 2 the Watcher and the Badger lens (Q; six trackers), zone 3 the gym with the found phone (four of eight messages, timed:
  rushed answers make noise; safe to read only in the light), the exit intercom (typed answer, EN/HU rubric), the mission debrief.
  Being caught sends you back to the zone's door. Running and rushed answers make noise; the Watcher hears noise.
- Not yet: resuming a mission after a reload (you are sent home and keep what you earned), the mission generator (one fixed school
  for now), the other locations and monsters.
- Session 3 (after Mark's play-test, 23 Oct): typing practice is now the core skill. Screens in the corridor are switched off
  by typing the setting, trackers are blocked by typing while the Watcher closes in, and the exit gates ask you to type
  three of tonight's rules (one per zone) against the clock instead of a free answer. New mission: the park walk, chosen
  at the street door. The stairwell got painted UP/DOWN signs, the house rules open by themselves on the first descent,
  and every landing says what happened.
- Performance rule: never add or remove lights during play (every material recompiles; seconds of freeze on slow GPUs).
  Plants in the park are drawn in 16 m chunks near the player only.
- Session 4 (23 Oct, second play-test): a night is now one run with stages and one topic; difficulty and scores in the
  night menu; walks in four places; the park starts in front of your own panel block; the stairwell says which floor
  each verdict is about; tracker blocking in the classroom is one key again (typing there made you look away).
- Session 5 (23 Oct): the home computer has a shop, the notebook and the flat tab; furniture and posters are placed in the
  flat (E place, R rotate, X back in the box) and add cosiness, which raises your starting nerve. Three flats to move up to.
  Fourth stage: the metro platform, where the Collector takes down posts that give away too much before you can. 21
  stairwell anomalies. A lost life lets you keep one thing.
- Session 6 (23 Oct, third play-test): the yellow room became the maze; the soft reset per difficulty; the Free Wi-Fi note is
  bigger; in the walk the nearest figure shows what it says above the reply you type, so you read the question first;
  the phone screens sit in front of the figures' faces.
- v0.8 / v0.9 (23 Oct, fourth play-test): the build number shows in the corner (src/rogue/config.js VERSION, raise it with every
  build). The Watcher's camera sits on its face. Topic T3 (tracking and fingerprinting) and four more upstander lines in T6;
  two new anomalies (a mocking photo on the noticeboard, a "smart building" that fingerprints phones). The school is assembled
  per night: zone 1 is the Feed or the permission fuse boxes, zone 3 the found phone or the Chorus (four upstander actions),
  and the classroom trackers are five from a larger set including two fingerprinting scripts.
- v0.10 (23 Oct, after the v0.9 play-test): teacher test menu ("Test a stage" in the night menu when the teacher key is on:
  any stage and version, topic, difficulty, +500 coins); 76 stickers (Urban Grunge, filtered: `content/stickers.js`, packed as
  `st_*` images, own shop tab); 18 more shop items and posters; small things (`top: true`) go on top of furniture; posters
  are self-lit (they were black); the Watcher's camera has a flare; the maze figure hurries when far and you hear its steps;
  the maze door and screens say what you are answering; a miss names where the anomaly was (`WHERE` in anomalies.js); a
  bigger QR sticker; the gym crowd are faceless mannequins with phone lights; the Collector swats you away when you get close.
- v0.11 (23 Oct): Mark's sticker sheets (`tools/stickers.py`) and paintings (`content/paintings.js`, `ui/titleCard.js`); the poster
  maker (`ui/posterMaker.js`, recipes in `record.posters`); save to a file (`saveToFile` in ui/screens.js, `#load=` on the title
  screen, the save code now includes the rogue save); monsters reworked after the paintings (`entities/rig.js`: attach, hideBone,
  sitDown); kit collider meshes are no longer drawn; topic T7 (kindness). Doc 04 has the details and the open list.
- v0.12 (24 Oct): T4 and T12 lines; gentle figures on the kindness night; flicker fixes (texture filtering in core/assets.js,
  z-fighting in the park); sharper posters; a real QR code (content/qr.js); fog and glare; the flat is lived in (sit, lie, eat,
  TV, walls, LED strips with the hack in ui/ledApp.js); poster sizing; the Metro_PSX subway car. Doc 04 has the details.
- v0.13 (24 Oct): the underpass walk (heyheythere kits), the payphone on every walk (content/calls.js), gym glare overlay.
- v0.14 (24 Oct): gallery pack and picture viewer, TV static in the screen texture, look around while seated and the visitor, faster ambushing maze figure, sticker folders, Sharper picture setting.
- v0.15 (24 Oct): the design detective arcade in the underpass (content/arcade.js, `arcadePanel`), Hard typing (`strictKey`, `hardText` in logic/typing.js), skip intro (ui/skip.js), the red bulb made obvious.
- v0.16 (24 Oct): the endless labyrinth (`run.mode === 'labyrinth'`, built inside mission/stairwell.js: `enterEndless`, `setupRoom`, `nextRoom`; `G.goLabyrinth`; `record.best.rooms`); T8 home jobs on the phone in the flat (content/homejobs.js, `homeJobPanel`, `record.jobs` and `record.jobAt`: one new message per night out).
- Next: see doc 05 section 0 (new shapes of night, new places, thin topics, the Tenant, look and feel, classroom).

## Codes

The classroom build asks for a code at the Lépcsőház door: PANELHAZ (accents and case don't matter). The teacher key opens it too.
