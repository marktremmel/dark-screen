// Lépcsőház entry point: loads the mode's assets and moves through a night.
// A night: your flat -> the night menu (topic, difficulty, scores) -> the stairwell -> the walk (park or a liminal place)
// -> the school or home -> the night's debrief. main.js gives G.switchScene; this file adds the rest.
import { ingestPack } from '../core/assets.js';
import { AU } from '../core/audio.js';
import { hud, loading, fade } from '../core/hud.js';
import { S, persist } from '../core/state.js';
import { ensureRogue, die } from './save/rogueSave.js';
import { rng, freshSeed } from './logic/rng.js';
import { newRun, pickTopic, pickWalk, recordNight, runWpm, runAcc, DIFFS } from './logic/night.js';
import { TOPICS } from './content/walks.js';
import { floorPicker, nightMenu, deathPanel } from './ui/panels.js';
import { missionDebrief } from './ui/missionPanels.js';
import { HomeScene } from './home/HomeScene.js';
import { Stairwell } from './mission/stairwell.js';
import { School } from './mission/school.js';
import { Walk } from './mission/walk.js';

const WALK_NAME = { park: 'the park', backrooms: 'the yellow rooms', hotel: 'the hotel corridor', pool: 'the empty pool' };

export function installRogue(G) {
  const R = () => ensureRogue(S.save);
  G.goRogue = async () => {
    G.unlock(); hud(false); loading(true, 0, 'Lépcsőház…');
    await ingestPack('ep1', AU.ctx, f => loading(true, f * 0.85));
    await ingestPack('rogue', AU.ctx, f => loading(true, 0.85 + f * 0.15));
    loading(false);
    const r = R(); persist();
    if (!r.life.floor) { await fade(false, '', 0.01); r.life.floor = await floorPicker(r); persist(); await fade(true, '', 0.01); }
    await G.switchScene(new HomeScene(G, r));
  };
  /** From the front door: the night menu, then the stairwell. Resolves false if you stay in. */
  G.startNight = async () => {
    const r = R(), rr = rng(freshSeed());
    const choice = await nightMenu(r, { topic: pickTopic(rr, r.record) });
    if (!choice) return false;
    G.run = newRun(choice.topic, choice.diff, pickWalk(rr, r.record)); persist();
    await G.goStairs(G.run);
    return true;
  };
  G.goStairs = async run => { await G.switchScene(new Stairwell(G, R(), run || G.run)); };
  G.goWalk = async run => {
    hud(false); loading(true, 0, 'Outside…');
    if (run.walk === 'park') await ingestPack('park', AU.ctx, f => loading(true, f * 0.5));
    await ingestPack('npc', AU.ctx, f => loading(true, 0.5 + f * 0.5));
    loading(false);
    await G.switchScene(new Walk(G, R(), run));
  };
  G.goSchool = async run => {
    hud(false); loading(true, 0, 'The school…');
    await ingestPack('kit_school', AU.ctx, f => loading(true, f * 0.6));
    await ingestPack('npc', AU.ctx, f => loading(true, 0.6 + f * 0.4));
    loading(false);
    await G.switchScene(new School(G, R(), run));
  };
  /** The end of a night that you survived: the debrief, the scores, home. */
  G.endNight = async (run, outcome) => {
    const r = R(); G.unlock(); hud(false);
    if (!run || (!run.stages.length && !run.xp && outcome === 'home')) { G.run = null; return G.goRogue(); }   // you never really left
    recordNight(r.record, run, outcome); persist();
    await fade(false, '', 0.01);
    const seen = new Set(), lessons = run.lessons.filter(l => !seen.has(l.title) && seen.add(l.title));
    await missionDebrief({
      title: `Tonight: ${TOPICS[run.topic].title}`,
      body: outcome === 'school' ? 'You made it through the stairwell, ' + WALK_NAME[run.walk] + ' and the school. That was a full night.'
        : outcome === 'walk' ? `You made it down the stairwell and through ${WALK_NAME[run.walk]}, and went home with what you had.`
          : 'You turned back and went home early. What you earned is yours.',
      stats: [`${DIFFS[run.diff].label}`, `Stairwell: caught ${run.spot}, missed ${run.miss}, wrong turn-backs ${run.fals}`, `+${run.xp} XP`, `+${run.coins} coins`,
        `Typing: ${runWpm(run)} wpm, ${runAcc(run)}% accurate`, `New cards: ${run.cards}`, `Nerve left: ${r.life.nerve}`],
      lessons: lessons.slice(0, 9),
    });
    await fade(true, '', 0.5); G.run = null; G.goRogue();
  };
  /** Nerve ran out: the life is lost (the record and the notebook stay). */
  G.loseLife = async run => {
    const r = R(); G.unlock(); hud(false);
    await fade(true, '', 1.2);
    if (run) recordNight(r.record, run, 'death');
    await fade(false, '', 0.01);
    await deathPanel(r, null);
    die(r, null); persist(); G.run = null; G.goRogue();
  };
}
