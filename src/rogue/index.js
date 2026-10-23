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
import { floorPicker, nightMenu, deathPanel, testPanel } from './ui/panels.js';
import { keepPanel } from './ui/homePanels.js';
import { thumb } from './ui/thumbs.js';
import { ITEM } from './content/furniture.js';
import { missionDebrief } from './ui/missionPanels.js';
import { HomeScene } from './home/HomeScene.js';
import { Stairwell } from './mission/stairwell.js';
import { School } from './mission/school.js';
import { Walk } from './mission/walk.js';
import { Metro } from './mission/metro.js';
import { VERSION } from './config.js';
import { titleCard } from './ui/titleCard.js';
import { CARDS_FOR } from './content/paintings.js';

const WALK_NAME = { park: 'the park', backrooms: 'the yellow rooms', hotel: 'the hotel corridor', pool: 'the empty pool' };

export function installRogue(G) {
  const R = () => ensureRogue(S.save);
  // the build number in the corner, so you always know which version you are playing
  const tag = document.createElement('div'); tag.textContent = 'Lépcsőház v' + VERSION;
  tag.style.cssText = 'position:fixed;right:8px;bottom:6px;z-index:40;font:12px m5x7,monospace;color:#9a95b0;opacity:.75;pointer-events:none;display:none';
  document.body.appendChild(tag);
  const ROGUE = [HomeScene, Stairwell, Walk, School, Metro];
  G.onScene = sc => { tag.style.display = ROGUE.some(C => sc instanceof C) ? '' : 'none'; };
  G.goRogue = async () => {
    G.unlock(); hud(false); loading(true, 0, 'Lépcsőház v' + VERSION + '…');
    await ingestPack('ep1', AU.ctx, f => loading(true, f * 0.6));
    await ingestPack('ep9', AU.ctx, f => loading(true, 0.6 + f * 0.25));     // grandma's furniture for the shop
    await ingestPack('rogue', AU.ctx, f => loading(true, 0.85 + f * 0.15));
    loading(false);
    const r = R(); persist();
    if (!r.life.floor) { await fade(false, '', 0.01); r.life.floor = await floorPicker(r); persist(); await fade(true, '', 0.01); }
    await G.switchScene(new HomeScene(G, r));
  };
  /** From the front door: the night menu, then the stairwell. Resolves false if you stay in. */
  G.startNight = async () => {
    const r = R(), rr = rng(freshSeed());
    const choice = await nightMenu(r, { topic: pickTopic(rr, r.record), teacher: !!(S.save && S.save.teacher) });
    if (!choice) return false;
    if (choice.test) return G.testStage(choice);
    G.run = newRun(choice.topic, choice.diff, pickWalk(rr, r.record)); persist();
    await G.goStairs(G.run);
    return true;
  };
  /** Teacher test menu: jump to one stage and version. */
  G.testStage = async o => {
    const r = R(), t = await testPanel(r, o);
    if (!t) return false;
    const [stage, a, b] = t.stage.split(':');
    if (stage === 'coins') { r.life.coins += 500; persist(); return false; }
    G.run = newRun(t.topic, t.diff, stage === 'walk' ? a : 'park'); G.run.test = true; persist();
    if (stage === 'stairs') await G.goStairs(G.run);
    else if (stage === 'maze') { G.testStart = 'maze'; await G.goStairs(G.run); }
    else if (stage === 'walk') await G.goWalk(G.run);
    else if (stage === 'school') { G.forceSchool = { ring: a, gym: b }; G.run.stages = ['stairs', 'walk']; await G.goSchool(G.run); G.forceSchool = null; }
    else if (stage === 'metro') { G.run.stages = ['stairs', 'walk', 'school']; await G.goMetro(G.run); }
    return true;
  };
  G.goStairs = async run => {
    hud(false); loading(true, 0, 'The stairwell…');
    await ingestPack('npc', AU.ctx, f => loading(true, f));        // the figure in the yellow rooms
    loading(false);
    if (G.testStart !== 'maze') await titleCard(CARDS_FOR.stairs, 'Lépcsőház', `Tonight: ${TOPICS[(run || G.run).topic].title}. Down to the ground floor.`);
    await G.switchScene(new Stairwell(G, R(), run || G.run));
  };
  G.goWalk = async run => {
    hud(false); loading(true, 0, 'Outside…');
    if (run.walk === 'park') await ingestPack('park', AU.ctx, f => loading(true, f * 0.5));
    await ingestPack('npc', AU.ctx, f => loading(true, 0.5 + f * 0.5));
    loading(false);
    if (CARDS_FOR[run.walk]) await titleCard(CARDS_FOR[run.walk], WALK_NAME[run.walk][0].toUpperCase() + WALK_NAME[run.walk].slice(1), TOPICS[run.topic].title);
    await G.switchScene(new Walk(G, R(), run));
  };
  G.goSchool = async run => {
    hud(false); loading(true, 0, 'The school…');
    await ingestPack('kit_school', AU.ctx, f => loading(true, f * 0.6));
    await ingestPack('npc', AU.ctx, f => loading(true, 0.6 + f * 0.4));
    loading(false);
    await titleCard(CARDS_FOR.school, 'The school', 'The front door is open. It should not be.');
    await G.switchScene(new School(G, R(), run));
  };
  G.goMetro = async run => {
    hud(false); loading(true, 0, 'The metro…');
    await ingestPack('metro', AU.ctx, f => loading(true, f * 0.4));
    await ingestPack('npc', AU.ctx, f => loading(true, 0.4 + f * 0.6));
    loading(false);
    await titleCard(CARDS_FOR.metro, 'The last train', 'Your old posts are glowing all over the platform.');
    await G.switchScene(new Metro(G, R(), run));
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
      body: outcome === 'metro' ? `The stairwell, ${WALK_NAME[run.walk]}, the school and the last train: the whole night. Not many people make it that far.`
        : outcome === 'school' ? 'You made it through the stairwell, ' + WALK_NAME[run.walk] + ' and the school. That was a full night.'
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
    let keep = null; try { keep = await keepPanel(r, thumb); } catch (e) { keep = null; }
    await deathPanel(r, keep ? ITEM[keep].name : null);
    die(r, keep); persist(); G.run = null; G.goRogue();
  };
}
