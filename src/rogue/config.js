// The Lépcsőház build number, shown in the corner during the mode. Raise it with every build that goes to Mark.
export const VERSION = '0.16';

// Lépcsőház: every tuning number in one place. Change numbers here, never in the code.
export const CFG = {
  // the panel block
  floors: 10,               // you can live on floor 1..10
  floorH: 2.8,              // storey height in metres (landing to landing)
  lightTimer: 30,           // seconds the stairwell light stays on after pressing the switch

  // the descent (Exit 8 rules): one landing per floor between your flat and the ground floor
  anomalyChance: 0.45,      // chance that a landing has something wrong with it
  firstAfterResetNormal: 0.6, // after a reset, the first landing is normal this often (you get to see the baseline again)

  // nerve (idegek)
  nerveStart: 100,
  nerveMiss: 15,            // walked past something wrong
  nerveFalse: 10,           // turned back when nothing was wrong
  nerveSpot: 3,             // turning back on a real anomaly calms you a little

  // rewards
  xpPass: 10, xpSpot: 15, xpGround: 40,
  coinsPass: 3, coinsSpot: 5, coinsGround: 15,
  floorBonus: 0.05,         // reward multiplier per floor above the first (floor 10 = x1.45)

  // reading (anti-rush): answering faster than this is a rushed answer
  readBaseMs: 1500, readPerWordMs: 60, readCapMs: 12000,

  // noise (zaj): 0..100. Monsters hear it.
  noiseRun: 14,             // per second while sprinting
  noiseRushed: 30, noiseWrong: 15, noiseDoor: 8,
  noiseDecay: 9,            // per second standing still or walking

  // the school mission
  feedPull: 0.55,           // radians per second a lit attention hook drags your view
  feedLapNerve: 4,          // nerve lost each time you go round the corridor with hooks still on
  watcherSpeed: 0.9,        // metres per second, plus watcherPerTracker for every tracker still active
  watcherPerTracker: 0.15,
  watcherNoise: 0.012,      // extra speed per point of noise
  caughtNerve: 20,
  xpHook: 6, xpTracker: 8, xpMsg: 10, xpGate: 20, xpGateExtra: 10,
  coinsZone: 8, coinsMission: 20,
  nerveWrongMsg: 10, nerveGateFail: 3, feedFailNerve: 5,

  // the park walk
  mimicSpeed: 0.55,         // metres per second (a little faster each stretch)
  mimicNerve: 12,           // nerve lost when one reaches you
  xpMimic: 10,
};

/** Reward multiplier for living on a given floor. @param {number} floor */
export const floorMult = floor => 1 + Math.max(0, floor - 1) * CFG.floorBonus;
