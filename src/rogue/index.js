// Lépcsőház entry point: loads the mode's assets and moves between your flat and the stairwell.
// main.js gives G.switchScene; this file adds G.goRogue (to your flat) and G.goStairs (out of your front door).
import { ingestPack } from '../core/assets.js';
import { AU } from '../core/audio.js';
import { hud, loading, fade } from '../core/hud.js';
import { S, persist } from '../core/state.js';
import { ensureRogue } from './save/rogueSave.js';
import { floorPicker } from './ui/panels.js';
import { HomeScene } from './home/HomeScene.js';
import { Stairwell } from './mission/stairwell.js';
import { School } from './mission/school.js';

export function installRogue(G) {
  G.goRogue = async () => {
    G.unlock(); hud(false); loading(true, 0, 'Lépcsőház…');
    await ingestPack('ep1', AU.ctx, f => loading(true, f * 0.85));
    await ingestPack('rogue', AU.ctx, f => loading(true, 0.85 + f * 0.15));
    loading(false);
    const R = ensureRogue(S.save); persist();
    if (!R.life.floor) { await fade(false, '', 0.01); R.life.floor = await floorPicker(R); persist(); await fade(true, '', 0.01); }
    await G.switchScene(new HomeScene(G, R));
  };
  G.goSchool = async run => {
    hud(false); loading(true, 0, 'The school…');
    await ingestPack('kit_school', AU.ctx, f => loading(true, f * 0.6));
    await ingestPack('npc', AU.ctx, f => loading(true, 0.6 + f * 0.4));
    loading(false);
    await G.switchScene(new School(G, ensureRogue(S.save), run));
  };
  G.goStairs = async () => {
    const R = ensureRogue(S.save);
    await G.switchScene(new Stairwell(G, R));
  };
}
