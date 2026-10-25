// Lépcsőház entry point: loads the mode's assets and moves through a night.
// A night: your flat -> the night menu (topic, difficulty, scores) -> the stairwell -> the walk (park or a liminal place)
// -> the school or home -> the night's debrief. main.js gives G.switchScene; this file adds the rest.
import { ingestPack } from '../core/assets.js';
import { AU, music } from '../core/audio.js';
import { hud, loading, fade } from '../core/hud.js';
import { S, persist } from '../core/state.js';
import { ensureRogue, die, earn } from './save/rogueSave.js';
import { rng, freshSeed } from './logic/rng.js';
import { newRun, pickTopic, pickWalk, recordNight, runWpm, runAcc, DIFFS, WALKS } from './logic/night.js';
import { SHAPES, pickShape, pickWalk2, nextStage, walkOf, stageName, andList, WALK_NAME } from './logic/routes.js';
import { TOPICS } from './content/walks.js';
import { floorPicker, nightMenu, deathPanel, testPanel, nextChoice, reflectPanel } from './ui/panels.js';
import { REFLECT } from './content/reflect.js';
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
import { routeStrip, hideRouteStrip } from './ui/fx.js';
import { postRender } from './ui/post.js';
import { R as RR } from '../core/render.js';
import { playCine, cineMimic, previewNight } from './ui/cine.js';
import { decodeNight } from './logic/nightcode.js';
import { INTRO, DEMO_HOME, INTRO_LOOPS } from './content/intro.js';
import { TRAILER, TRAILER_OPTS } from './content/trailer.js';


export function installRogue(G) {
  const R = () => ensureRogue(S.save);
  // the build number in the corner, so you always know which version you are playing
  const tag = document.createElement('div'); tag.textContent = 'Lépcsőház v' + VERSION;
  tag.style.cssText = 'position:fixed;right:8px;bottom:6px;z-index:40;font:12px m5x7,monospace;color:#9a95b0;opacity:.75;pointer-events:none;display:none';
  document.body.appendChild(tag);
  const ROGUE = [HomeScene, Stairwell, Walk, School, Metro];
  G.playCine = (shots, o) => playCine(G, shots, o); G.cineMimic = cineMimic;   // v0.23: cutscenes (the intro, the trailer)
  /** v0.23: the intro cutscene (first start, and Help on the computer). Leaves the scene empty: the caller goes home after. */
  G.playIntro = async () => {
    hud(false); loading(false); await fade(false, '', 0.01);
    try { await playCine(G, INTRO, { home: DEMO_HOME, loops: INTRO_LOOPS, music: 'mus_dark', musicVol: 0.25 }); }
    catch (e) { console.error('intro', e); }
    music(null);
    const r = R(); r.record.intro = 1; persist();
  };
  G.previewNight = code => { const n = decodeNight(code); return n ? previewNight(G, { ...n, code }) : null; };   // tools/codes.py: what a night code holds
  G.playTrailer = () => playCine(G, TRAILER, { ...TRAILER_OPTS, loops: INTRO_LOOPS });   // tools/ccap.py renders it
  G.post = (sc, dt) => ROGUE.some(C => sc instanceof C) && postRender(RR.renderer, sc.scene, G.camera, dt);   // v0.19: camera effects (a setting)
  G.onScene = sc => {
    const rogue = ROGUE.some(C => sc instanceof C); tag.style.display = rogue && !G.cine ? '' : 'none';
    if (rogue && !(sc instanceof HomeScene) && G.run) routeStrip(G.run, stageName); else hideRouteStrip();
  };
  G.goRogue = async () => {
    G.unlock(); hud(false); loading(true, 0, 'Lépcsőház v' + VERSION + '…');
    await ingestPack('ep1', AU.ctx, f => loading(true, f * 0.6));
    await ingestPack('ep9', AU.ctx, f => loading(true, 0.6 + f * 0.25));     // grandma's furniture for the shop
    await ingestPack('rogue', AU.ctx, f => loading(true, 0.85 + f * 0.1));
    await ingestPack('gallery', AU.ctx, f => loading(true, 0.95 + f * 0.03));
    await ingestPack('npc', AU.ctx, f => loading(true, 0.98 + f * 0.02));   // the visitor in the flat   // Mark's paintings at full size, for the flat
    loading(false);
    const r = R(); persist();
    if (!r.life.floor) { await fade(false, '', 0.01); r.life.floor = await floorPicker(r); persist(); await fade(true, '', 0.01); }
    if (!r.record.intro && !(r.record.nights || []).length && !G.noIntro) await G.playIntro();   // v0.23: the very first time: how a night works
    await G.switchScene(new HomeScene(G, r));
  };
  /** From the front door: the night menu, then the stairwell. Resolves false if you stay in. */
  G.startNight = async () => {
    const r = R(), rr = rng(freshSeed());
    const walk = pickWalk(rr, r.record), walk2 = pickWalk2(rr, WALKS, walk);   // v0.17: tonight's route is picked here and shown on the menu
    const choice = await nightMenu(r, { topic: pickTopic(rr, r.record), shape: pickShape(rr, r.record), walk, walk2, teacher: !!(S.save && S.save.teacher) });
    if (!choice) return false;
    if (choice.test) return G.testStage(choice);
    const sh = SHAPES[choice.shape] || SHAPES.usual;
    G.run = newRun(choice.topic, choice.diff, choice.walk || walk, !!choice.hard, sh.id, sh.route.slice(), choice.walk2 || walk2, !!choice.tenant); G.run.cur = 'stairs';
    if (choice.seed != null) { G.run.seed = choice.seed; G.run.code = choice.code || null; }   // v0.24: a night code (or the teacher's own night) fixes the details
    if (choice.mode === 'labyrinth') { G.run.mode = 'labyrinth'; persist(); await G.goLabyrinth(G.run); return true; }
    persist();
    await G.goStairs(G.run);
    return true;
  };
  /** Teacher test menu: jump to one stage and version. */
  G.testStage = async o => {
    const r = R(), t = await testPanel(r, o);
    if (!t) return false;
    const [stage, a, b] = t.stage.split(':');
    if (stage === 'coins') { r.life.coins += 500; persist(); return false; }
    G.run = newRun(t.topic, t.diff, stage === 'walk' ? a : 'park', !!o.hard, 'usual', null, null, !!o.tenant); G.run.test = true; persist();
    if (stage === 'stairs') await G.goStairs(G.run);
    else if (stage === 'maze') { G.testStart = 'maze'; await G.goStairs(G.run); }
    else if (stage === 'labyrinth') { G.run.mode = 'labyrinth'; await G.goLabyrinth(G.run); }
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
  /** The endless labyrinth: the yellow maze as a night of its own (built inside the stairwell scene). */
  G.goLabyrinth = async run => {
    hud(false); loading(true, 0, 'The yellow rooms…');
    await ingestPack('npc', AU.ctx, f => loading(true, f));
    loading(false);
    await titleCard(CARDS_FOR.labyrinth, 'The labyrinth', `Tonight: ${TOPICS[run.topic].title}. As many rooms as you can.`);
    await G.switchScene(new Stairwell(G, R(), run));
  };
  /** v0.17: after a stage, the route decides what comes next. Between stages (not after the stairs) you may go home. */
  G.rogueNext = async (run, from) => {
    const nx = nextStage(run, from);
    if (!nx) { await fade(true, '', 0.6); return G.endNight(run, 'full'); }
    if (from !== 'stairs') {
      G.unlock(); await fade(false, '', 0.3);   // the metro ends on a black screen: the choice must not sit under it (v0.19 fix: the long night got stuck here)
      const c = await nextChoice(run, nx);
      await fade(true, '', 0.6);
      if (c === 'home') return G.endNight(run, from);
    }
    run.cur = nx; persist();
    if (nx === 'walk' || nx === 'walk2') return G.goWalk(run);
    if (nx === 'school') return G.goSchool(run);
    if (nx === 'metro') return G.goMetro(run);
  };
  G.goWalk = async run => {
    hud(false); loading(true, 0, 'Outside…');
    const place = walkOf(run, run.cur === 'walk2' ? 'walk2' : 'walk');
    const street = ['courtyard', 'alley', 'bus'].includes(place);
    if (place === 'park' || street) await ingestPack('park', AU.ctx, f => loading(true, f * 0.3));
    if (street) await ingestPack('street', AU.ctx, f => loading(true, 0.3 + f * 0.2));
    if (place === 'underpass') await ingestPack('underpass', AU.ctx, f => loading(true, f * 0.5));
    await ingestPack('npc', AU.ctx, f => loading(true, 0.5 + f * 0.5));
    loading(false);
    if (CARDS_FOR[place]) await titleCard(CARDS_FOR[place], WALK_NAME[place][0].toUpperCase() + WALK_NAME[place].slice(1), run.cur === 'walk2' ? 'The way home. ' + TOPICS[run.topic].title : TOPICS[run.topic].title);
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
    let bonus = 0;
    if (outcome === 'full' && run.shape === 'long') { bonus = Math.round(run.xp * 0.2); earn(r, bonus, 0); run.xp += bonus; }   // the long night pays 20% more
    let tb = null;
    if (run.tenant && run.stages.length && run.mode !== 'labyrinth') { tb = { xp: run.xp, coins: run.coins }; earn(r, tb.xp, tb.coins); run.xp += tb.xp; run.coins += tb.coins; }   // v0.20: home alive with the Tenant out: double
    const night = recordNight(r.record, run, outcome); persist();
    await fade(false, '', 0.01);
    if (outcome !== 'home' || run.stages.length) await titleCard(CARDS_FOR.morning, 'Morning', 'You made it home. The first tram is running.', 2.2);   // v0.17: Mark's dawn painting before the debrief
    const seen = new Set(), lessons = run.lessons.filter(l => !seen.has(l.title) && seen.add(l.title));
    await missionDebrief({
      title: `Tonight: ${TOPICS[run.topic].title}`,
      body: outcome === 'labyrinth' ? (run.rooms ? `${run.rooms} room${run.rooms > 1 ? 's' : ''} of the yellow labyrinth${run.labyrinthEnd === 'caught' ? ', until it caught you a third time' : ', and then you found your way home'}.${run.rooms >= ((r.record.best && r.record.best.rooms) || 0) ? ' Your best yet.' : ''}` : 'You did not get through a single room this time. The next one will go better.')
        : !run.stages.length ? 'You turned back and went home early. What you earned is yours.'
        : outcome === 'full' ? `${SHAPES[run.shape] ? SHAPES[run.shape].name : 'The night'}, all of it: ${andList(run.stages.map(st => stageName(run, st)))}.${bonus ? ` Finishing the long night: +${bonus} XP.` : ''} Not many people make it that far.${tb ? ` With the Tenant out: everything doubled.` : ''}`
        : `You made it through ${andList(run.stages.map(st => stageName(run, st)))}, and went home with what you had.${tb ? ' With the Tenant out, it all counts double.' : ''}`,
      stats: run.mode === 'labyrinth' ? [`${DIFFS[run.diff].label}`, `Rooms: ${run.rooms || 0} (best ${(r.record.best && r.record.best.rooms) || 0})`, `Screens typed: ${run.screens || 0}`, `+${run.xp} XP`, `+${run.coins} coins`,
        `Typing: ${runWpm(run)} wpm, ${runAcc(run)}% accurate`, `New cards: ${run.cards}`] : [`${DIFFS[run.diff].label}`, `${(SHAPES[run.shape] || SHAPES.usual).name}`, `Stairwell: caught ${run.spot}, missed ${run.miss}, wrong turn-backs ${run.fals}`, `+${run.xp} XP`, `+${run.coins} coins`,
        `Typing: ${runWpm(run)} wpm, ${runAcc(run)}% accurate`, `New cards: ${run.cards}`, `Nerve left: ${r.life.nerve}`],
      lessons: lessons.slice(0, 9),
    });
    // v0.24: one question in your own words (with a night code, everyone gets the same one about the same line)
    if (run.stages.length && run.mode !== 'labyrinth' && REFLECT[run.topic]) {
      const qs = REFLECT[run.topic], qi = run.seed != null ? run.seed % qs.length : Math.floor(Math.random() * qs.length);
      const a = run.anchor ? `${run.anchor.who}: "${run.anchor.say}" You typed: "${run.anchor.type}".` : null;
      const ans = await reflectPanel(qs[qi], a);
      if (ans) { night.rq = run.topic + ':' + qi; night.ra = ans; persist(); }
    }
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
