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
};

/** Reward multiplier for living on a given floor. @param {number} floor */
export const floorMult = floor => 1 + Math.max(0, floor - 1) * CFG.floorBonus;
