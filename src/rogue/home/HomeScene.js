// Your flat: the safe place. Nothing can hurt you here.
// For now (Phase 1) it is the nearly empty flat of a new life: mattress, box, desk and computer, a window onto the estate.
// The shop and furniture editor arrive in Phase 2.
import * as THREE from 'three';
import { Walker } from '../../scenes/walker.js';
import { texBox, plane, windowPane, lamp, place, colliderFor, canvasTex } from '../../core/world.js';
import { psxMat } from '../../core/render.js';
import { tex } from '../../core/assets.js';
import { lockPointer } from '../../core/player.js';
import { hud, hudParts, objective, prompt, caption, fade, checklist, wait } from '../../core/hud.js';
import { loop, play, music } from '../../core/audio.js';
import { S, persist } from '../../core/state.js';
import { computerPanel } from '../ui/panels.js';

const X1 = 4.4, Z0 = -5, HH = 2.65;

export class HomeScene extends Walker {
  constructor(G, R) { super(G); this.R = R; this.quitLabel = 'Back to Room 214 (your flat is saved)'; }

  async build() {
    const g = this.newScene(0x07080c, 4, 18);
    const col = this.col, block = this.block, W = { col, block, h: HH, tile: 1.0 };
    plane(g, 'wood_floor', 0, Z0, X1, 0, 0, { tile: 1.2 });
    plane(g, 'rg_white', 0, Z0, X1, 0, HH, { tile: 2, ceiling: true, color: 0xd8d4c8 });
    texBox(g, 'rg_wallpaper', -0.15, 0, Z0, 0, HH, 0, W);
    texBox(g, 'rg_wallpaper', X1, 0, Z0, X1 + 0.15, HH, 0, W);
    texBox(g, 'rg_wallpaper', 0, 0, 0, X1, HH, 0.15, W);
    texBox(g, 'rg_wallpaper', 0, 0, Z0 - 0.15, X1, HH, Z0, W);
    // skirting
    texBox(g, null, 0, 0, Z0, X1, 0.08, Z0 + 0.02, { color: 0x5a4632 }); texBox(g, null, 0, 0, -0.02, X1, 0.08, 0, { color: 0x5a4632 });
    // the window and its view (higher floors see further)
    const f = this.R.life.floor || 1;
    windowPane(g, 2.7, 1.5, Z0 + 0.012, 1.6, 1.3, 0, { lights: true, view: f >= 5 ? 'view_night_high' : 'view_night_flat' });
    texBox(g, null, 1.85, 0.82, Z0, 3.55, 0.86, Z0 + 0.22, { color: 0xe6e0d0 });
    // the front door (inside)
    const door = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 2.05), psxMat({ map: tex('rg_flatdoor'), color: 0xd8c8b0 }));
    door.position.set(0.9, 1.025, -0.012); door.rotation.y = Math.PI; g.add(door);
    // a new life: almost nothing
    const mat = place(g, 'mattress', 3.55, 0, -1.4, 90, { col });
    const box = place(g, 'box', 1.9, 0, -0.9, 20, { col });
    const desk = place(g, 'studydesk', 1.0, 0, Z0 + 0.32, 0, { col });
    const pc = place(g, 'pcretro', 1.0, 0.76, Z0 + 0.3, 0);
    place(g, 'studychair', 1.0, 0, Z0 + 0.95, 180);
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.336, 0.266), new THREE.MeshBasicMaterial({ map: canvasTex(64, 48, c => {
      c.fillStyle = '#0c2018'; c.fillRect(0, 0, 64, 48); c.fillStyle = '#8fe3c9'; c.font = '16px m5x7'; c.textBaseline = 'top';
      c.fillText('NOTEBOOK', 4, 6); c.fillText(this.R.life.coins + ' COINS', 4, 22);
    }), fog: false }));
    scr.position.set(-0.057, 0.243, 0.104); pc.add(scr);
    const glow = new THREE.PointLight(0x8fe3c9, 0.8, 3, 1.6); glow.position.set(1.0, 1.3, Z0 + 0.9); g.add(glow);
    // light: one warm bulb and the window
    this.lamp = lamp(g, 2.2, HH, -2.4, { intensity: 3.2, dist: 8 }); this.lamp.set(1);
    this.scene.add(new THREE.AmbientLight(0x6e6a80, 0.32));
    this.scene.add(new THREE.HemisphereLight(0x8090c0, 0x302820, 0.18));
    this.setupRig({ arms: false, flash: false, stepVol: 0.25, reach: 2.2 });
    const it = this.it;
    it.add(pc, 'Your computer: notebook and record', () => this.computer());
    it.add(door, 'Front door: go out into the stairwell (lépcsőház)', () => this.goOut());
    it.add(mat, 'Mattress: sleep (back to Room 214)', () => this.quit());
    it.add(box, () => this.R.life.kept ? `A box. Inside: ${this.R.life.kept}, from your last life.` : 'A box: everything you own fits in it, for now', () => caption('One day this will be a home. Coins from the stairs will buy furniture once the shop opens.', 'say', 4));
    void desk;
  }
  async enter() {
    this.playing = false; hud(false); music('mus_debrief', 0.25);
    loop('fh', 'hum', { vol: 0.05 }); this.loops.push('fh');
    this.player.set(0.9, -0.8, 0);
    await fade(false, '', 0.8);
    this.playing = true; hud(true); hudParts({ checklist: true, status: false, eye: false, batt: false });
    const L = this.R.life;
    checklist(`Your flat · ${L.floor}. emelet`, [
      { name: `Life ${L.id}`, hu: 'élet' }, { name: `Coins: ${L.coins}`, hu: 'zseton' }, { name: `XP: ${this.R.record.xp}`, hu: 'tapasztalat' },
      { name: `Notebook: ${this.R.record.notebook.length} cards`, hu: 'jegyzetfüzet' },
    ]);
    objective('Your flat is safe. When you are ready, go out through the front door and get down to the ground floor.');
    if (!this.R.record.descents && !this.R.record.deaths) caption('Your own flat. Nothing can hurt you in here.', 'say', 4);
    lockPointer();
  }
  async computer() { this.playing = false; this.G.unlock(); prompt(null); play('click', { vol: 0.4 }); await computerPanel(this.R, S.nick || ''); this.playing = true; lockPointer(); }
  async goOut() {
    if (this.leaving) return; this.leaving = true; this.playing = false; prompt(null);
    play('door_open', { vol: 0.5 }); persist();
    await fade(true, '', 0.8);
    this.G.goStairs();
  }
  quit() { persist(); this.playing = false; this.G.goHub(); }
  update(dt, t) {
    if (!this.playing) return;
    this.player.update(dt);
    this.interact();
  }
}
