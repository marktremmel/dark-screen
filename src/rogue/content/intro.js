// v0.23: the intro cutscene. Plays the first time you enter Lépcsőház; replay it from the computer (Help).
// Each shot: a scene, a slow camera move, a few lines of text. Cameras: [x, y, z, yaw°, pitch°] (yaw 0 looks along -z).
// The flat in the intro is a furnished example (DEMO_HOME), so new players see what they can build.
import { cineMimic, mazeCam } from '../ui/cine.js';

export const DEMO_HOME = {
  coins: 140,
  home: [
    { id: 'carpet', x: 2.6, z: -2.8, r: 0 }, { id: 'armchair', x: 3.7, z: -3.6, r: 0 }, { id: 'armchair', x: 3.7, z: -2.0, r: 1 },
    { id: 'coffeetable', x: 2.6, z: -2.8, r: 0 }, { id: 'plant', x: 4.0, z: -4.6, r: 0 }, { id: 'lamp', x: 0.35, z: -3.4, r: 0 },
    { id: 'bookshelf', x: 0.3, z: -1.9, r: 1 },
  ],
};

export const INTRO_LOOPS = { home: ['hum', 0.06], stairs: ['rg_drone_stair', 0.3], school: ['rg_drone_stair', 0.25], metro: ['rg_drone_stair', 0.25], walk: ['rg_drone_stair', 0.18] };

const MIMIC = { who: 'A delivery text', say: 'Your parcel is stuck. Pay 390 Ft here to release it.', type: 'was i expecting a parcel' };

/** The walk shot: a figure walks up, says its line, the reply is typed, it dissolves. */
function mimicShot(base) {
  return {
    ...base,
    setup: (sc, C) => { C.data.m = cineMimic(sc, { id: 'cine' }, -2.4, -19.5, 0); C.data.gone = false; },
    tick: (sc, dt, k, C) => {
      const m = C.data.m, t = C.t;
      if (!C.data.gone && t > base.type.at + MIMIC.type.length / (base.type.cps || 11) + 0.4) { C.data.gone = true; m.dissolve(); }
      if (C.data.gone) m.tickFade(dt); else m.walkTo(dt, -1.0, -12.5, 2.2);
    },
  };
}

export const INTRO = [
  { card: true, dur: 4, kicker: 'Sötét Képernyő', title: 'Lépcsőház', text: 'How a night works.' },
  { at: 'home', dur: 8, kicker: '1 · Home (otthon)', title: 'Your flat', cam: [[3.9, 1.75, -0.4, 34, -12], [3.5, 1.65, -1.1, 40, -9]],
    text: 'You live in a small flat in a panel block in Budapest. In here, nothing can hurt you. Every night, you go out.' },
  { at: 'home', dur: 9, title: 'The computer', cam: [[1.3, 1.35, -3.5, 15, -15], [1.15, 1.25, -3.95, 10, -17]],
    text: 'The shop, your notebook, posters you make yourself, and your save. What you earn makes the flat cosy, and a cosy flat gives you more nerve (idegek) on the stairs.' },
  { at: 'home', dur: 7, title: 'The phone', cam: [[1.8, 1.2, -3.9, 26, -30], [1.7, 1.08, -4.1, 26, -36]],
    tick: (sc, dt, k, C) => { if (sc.phoneScr) sc.phoneScr.visible = Math.sin(C.t * 4) > -0.4; },
    text: 'After a night out, a message waits on your phone. Someone wants a photo, a secret, a favour. Choose your reply carefully.' },
  { at: 'home', dur: 7, title: 'The front door', cam: [[2.4, 1.6, -3.0, 153, -5], [1.7, 1.6, -1.8, 162, -4]],
    text: 'Plan the night here: tonight\'s topic, how hard it is, and your route. No two nights are the same.' },
  { at: 'stairs', dur: 8, kicker: '2 · The stairwell (lépcsőház)', title: 'Learn what normal looks like', cam: [[-2.6, 1.6, 0.5, -90, 0], [-1.9, 1.6, 0.8, -82, -3]],
    text: 'Three doors, the lift, the noticeboard, the plant by the window. If everything is normal, keep walking down to the ground floor.' },
  { at: 'stairs', dur: 8, title: 'Something is different', cam: [[-0.2, 1.6, 0.6, 172, 2], [-0.3, 1.6, 1.0, 168, 4]],
    setup: sc => { sc.d.cur.anomaly = 'bulb_red'; sc.dressAll(); },
    after: sc => { sc.d.cur.anomaly = null; sc.dressAll(); },
    text: 'A red bulb. A note on a door. A notice that asks for your password. If anything is wrong, turn back up the stairs.' },
  { at: 'stairs', dur: 8, title: 'The yellow rooms', cam: sc => mazeCam(sc),
    tick: (sc, dt, k, C) => { const p = C.cam || sc.G.camera.position; sc.yLight.position.set(p.x, 2.3, p.z); },
    text: 'Miss a sign and you wake up here. Find the EXIT and type the rule you missed. Something walks these rooms, and it only moves when you look away.' },
  mimicShot({ at: 'walk:park', dur: 10.5, torch: true, kicker: '3 · The walk (séta)', title: 'Read, then type', cam: [[-0.7, 1.45, -12.2, 25, 0], [-0.55, 1.45, -12.6, 22, 1]],
    say: { who: MIMIC.who, text: MIMIC.say, at: 1.6 }, type: { text: MIMIC.type, at: 4.6, cps: 11 },
    text: 'Figures with a phone for a face say what scammers and manipulators say. Read it, then type the safe reply before they reach you.' }),
  { at: 'school', dur: 8, kicker: '4 · The school', title: 'Screens that pull at your eyes', cam: [[2.5, 1.6, -1.2, 70, 0], [1.2, 1.6, -1.35, 64, 0]],
    tick: (sc, dt, k, C) => { if (sc.hooks) for (const h of sc.hooks) sc.drawHook(h, C.t); },
    text: 'Switch off the screens that grab your attention, and block the trackers while the Watcher closes in.' },
  { at: 'school', dur: 7, title: 'Be the one who helps', cam: [[3.2, 1.5, -34.6, 33, -6], [2.6, 1.5, -35.4, 33, -7]],
    tick: (sc, dt) => { if (sc.chorus) for (const c of sc.chorus.crowd) if (c.n) c.n.update(dt); },
    text: 'When a crowd is filming a classmate, save the evidence, stand next to them, and report it.' },
  { at: 'metro', dur: 8, kicker: '5 · The last train', title: 'Your old posts', cam: [[1.2, 1.6, -1.6, -90, 0], [2.0, 1.6, -1.7, -90, 0]],
    setup: sc => { if (sc.collector) sc.collector.obj.position.set(9, 0, -2.2); },
    text: 'They glow on the platform walls. Take down the ones that give away where you live or when you are alone, before the Collector gets them.' },
  { at: 'home', dur: 9, kicker: '6 · Home again', title: 'Keep what you learn', cam: [[2.3, 1.75, -4.6, 172, -12], [2.2, 1.7, -4.1, 168, -10]],
    text: 'Every answer becomes a card in your notebook. Run out of nerve and you lose the flat, but the notebook stays. Type fast and carefully: it keeps you safe.' },
  { card: true, dur: 4, kicker: 'Lépcsőház', title: 'Good luck tonight.', text: 'You can watch this again on your computer, under Help.' },
];
