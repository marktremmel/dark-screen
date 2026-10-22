// The stairwell descent: from your front door to the ground floor, with Exit 8 rules.
// One module = one landing, the flight down to the half landing (with a window), and the flight on to the next landing.
// Five modules are stacked (two above, two below). When you reach the next landing the whole world shifts by one storey,
// so you are always standing on module 0, and the landings are re-dressed for what comes next.
import * as THREE from 'three';
import { Walker } from '../../scenes/walker.js';
import { texBox, plane, windowPane } from '../../core/world.js';
import { psxMat } from '../../core/render.js';
import { tex } from '../../core/assets.js';
import { lockPointer, wasPressed } from '../../core/player.js';
import { hud, hudParts, objective, prompt, caption, fade, flash, checklist, wait } from '../../core/hud.js';
import { loop, stopLoop, play, music, babble } from '../../core/audio.js';
import { S, persist } from '../../core/state.js';
import { CFG } from '../config.js';
import { rng, freshSeed } from '../logic/rng.js';
import { newDescent, prepare, resolve, advance, groundReward } from '../logic/descent.js';
import { earn, nerve, noteAnomaly, die } from '../save/rogueSave.js';
import { ANOMALY } from '../content/anomalies.js';
import { dressLanding, L } from './landing.js';
import { readPanel, rulesPanel, deathPanel, groundPanel } from '../ui/panels.js';

const H = CFG.floorH, HALF = H / 2, RUN = 3.0, STEPS = 8;
const KS = [-2, -1, 0, 1, 2];
const FA = [0, 1.2], FB = [1.45, L.XR - L.WT];      // flight A (down from a landing) and flight B (on to the next one)
const ZW = -4.5;                                    // window wall
const YX = 60;                                      // the yellow rooms are built far away along x

export class Stairwell extends Walker {
  constructor(G, R) { super(G); this.R = R; this.quitLabel = 'Go home (the night ends here)'; }

  async build() {
    const g = this.newScene(0x040506, 2.2, 12.5);
    this.r = rng(freshSeed());
    this.d = newDescent(this.R.life.floor); prepare(this.r, this.d);
    this.R.life.nerve = CFG.nerveStart;
    this.run = { xp: 0, coins: 0, spot: 0, miss: 0, fals: 0 };
    this.mods = {};
    this.buildShaft(g);
    for (const k of KS) this.buildModule(g, k);
    this.buildYellow(g);
    this.scene.add(new THREE.AmbientLight(0x3a4456, 0.16));
    this.scene.add(new THREE.HemisphereLight(0x7a8aa0, 0x201810, 0.1));
    this.setupRig({ arms: true, flash: true, stepVol: 0.3, reach: 2.2 });
    this.gate = {
      up: { x0: FB[0], x1: FB[1], z0: -0.32, z1: -0.04, y0: -0.7, y1: 0.7 },
      down: { x0: FA[0], x1: FA[1], z0: -0.32, z1: -0.04, y0: -0.7, y1: 0.7 },
    };
    this.col.push(this.gate.up, this.gate.down);
    this.y = 0; this.lightT = CFG.lightTimer; this.lightsOn = true; this.voiceT = 0; this.busy = false;
    this.items = [];
    this.dressAll();
  }

  // ---------- geometry ----------
  buildShaft(g) {
    const W = { col: this.col, block: this.block, tile: H }, y0 = -3 * H, y1 = 3 * H;
    texBox(g, 'rg_wall', L.XL - 0.2, y0, L.ZB, L.XR + 0.2, y1, L.ZB + 0.2, W);                  // back wall (flat doors)
    texBox(g, 'rg_wall', L.XL - 0.2, y0, ZW, L.XL, y1, L.ZB, W);                                // left wall
    texBox(g, 'rg_wall', L.XR - L.WT, y0, ZW - 0.2, L.XR + 0.1, y1, L.ZB, W);                     // right wall
    texBox(g, 'rg_wall', 0, y0, ZW - 0.2, L.XR, y1, ZW, W);                                      // window wall
    texBox(g, 'rg_wall', L.XL, y0, -0.2, 0, y1, 0, W);                                          // lift wall
    texBox(g, 'rg_wall', -0.2, y0, ZW, 0, y1, -0.2, W);                                         // side of flight A
    this.col.push({ x0: L.XL, x1: 0, z0: ZW, z1: 0 });                                          // the lift shaft is solid
    this.col.push({ x0: FA[1], x1: FB[0], z0: -3, z1: 0 });                                     // the railing between the flights
  }
  buildModule(g, k) {
    const y0 = k * H, m = { k, g: new THREE.Group(), dg: new THREE.Group(), lamps: [] };
    m.g.position.y = y0; m.dg.position.y = y0; g.add(m.g); g.add(m.dg);
    const G = m.g, xR = L.XR - L.WT;
    // landing and half landing (terrazzo on top, whitewash underneath)
    texBox(G, 'rg_white', L.XL, -0.24, 0, xR, 0, L.ZB - L.WT, { tile: 2 });
    plane(G, 'rg_terrazzo', L.XL, 0, xR, L.ZB - L.WT, 0.003, { tile: 1.1 });
    texBox(G, 'rg_white', 0, -HALF - 0.24, ZW, xR, -HALF, -3, { tile: 2 });
    plane(G, 'rg_terrazzo', 0, ZW, xR, -3, -HALF + 0.003, { tile: 1.1 });
    // steps: flight A goes down from the landing towards the window, flight B comes back to the next landing
    const rise = HALF / STEPS, tread = RUN / STEPS;
    for (let i = 0; i < STEPS; i++) {
      const ta = -(i + 1) * rise; texBox(G, 'rg_concrete', FA[0], ta - 0.2, -(i + 1) * tread, FA[1], ta, -i * tread, { tile: 0.8 });
      const tb = -HALF - (i + 1) * rise; texBox(G, 'rg_concrete', FB[0], tb - 0.2, -3 + i * tread, FB[1], tb, -3 + (i + 1) * tread, { tile: 0.8 });
    }
    const ang = Math.atan2(HALF, RUN), len = Math.hypot(HALF, RUN), sm = psxMat({ color: 0xc9c3b4 });
    const soffit = (x0, x1, yTop, sign) => { const s = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, 0.1, len), sm); s.rotation.x = sign * ang; s.position.set((x0 + x1) / 2, yTop - HALF / 2 - 0.22, -1.5); G.add(s); };
    soffit(FA[0], FA[1], 0, -1); soffit(FB[0], FB[1], -HALF, 1);   // rotation.x > 0 tips the +z end down
    // railings: wooden handrail and green-painted bars along both flights
    const rm = psxMat({ color: 0x2f4a3a }), hm = psxMat({ color: 0x5a3a22 });
    const rail = (x, flightA) => {
      const hr = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.05, len), hm);
      hr.rotation.x = flightA ? -ang : ang; hr.position.set(x, (flightA ? -HALF / 2 : -HALF - HALF / 2) + 0.92, -1.5); G.add(hr);
      for (let i = 0; i <= STEPS; i++) {
        const z = flightA ? -i * tread : -3 + i * tread, y = flightA ? z / RUN * HALF : -HALF - (i * tread) / RUN * HALF;
        const bar = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.92, 0.025), rm); bar.position.set(x, y + 0.46, z); G.add(bar);
      }
    };
    rail(1.26, true); rail(1.39, false);
    // lights: a bulb on the landing ceiling and one on the half landing wall (only near modules carry real lights)
    const bulb = (x, y, z) => {
      const bm = new THREE.MeshBasicMaterial({ color: 0xffe0a8, fog: false });
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 6), bm); b.position.set(x, y, z); G.add(b);
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.03, 10), psxMat({ color: 0xd8d2c4 })); cap.position.set(x, y + 0.08, z); G.add(cap);
      const light = Math.abs(k) <= 1 ? new THREE.PointLight(0xffd9a0, 0, 7.5, 1.5) : null;
      if (light) { light.position.set(x, y - 0.15, z); G.add(light); }
      m.lamps.push({ bm, light, base: 4.2 });
    };
    bulb(-0.7, H - 0.36, 1.05);
    bulb(1.3, -HALF + 2.25, ZW + 0.2);
    if (Math.abs(k) <= 1) windowPane(G, 1.3, -HALF + 1.45, ZW + 0.012, 1.1, 1.0, 0, { lights: true, view: k === 0 ? 'view_night_high' : 'view_night_flat' });
    this.mods[k] = m;
  }
  buildYellow(g) {
    // a room that should not be in a panel block: yellow wallpaper, damp carpet, humming lights
    const Y = this.yellow = new THREE.Group(); g.add(Y);
    const W = { col: this.col, block: this.block, tile: 1.4 }, h = 2.6;
    plane(Y, 'rg_y_carpet', YX - 5, -5, YX + 5, 5, 0, { tile: 1.2 });
    plane(Y, 'rg_y_ceil', YX - 5, -5, YX + 5, 5, h, { tile: 1.2, ceiling: true });
    texBox(Y, 'rg_y_wall', YX - 5.2, 0, -5.2, YX + 5.2, h, -5, W); texBox(Y, 'rg_y_wall', YX - 5.2, 0, 5, YX + 5.2, h, 5.2, W);
    texBox(Y, 'rg_y_wall', YX - 5.2, 0, -5, YX - 5, h, 5, W); texBox(Y, 'rg_y_wall', YX + 5, 0, -5, YX + 5.2, h, 5, W);
    for (const [x, z] of [[-2, -2], [2, -2], [-2, 2], [2, 2], [0, 0.2]]) texBox(Y, 'rg_y_wall', YX + x - 0.3, 0, z - 0.3, YX + x + 0.3, h, z + 0.3, W);
    texBox(Y, 'rg_y_wall', YX - 1, 0, -3.6, YX + 3.4, h, -3.4, W);
    for (const [x, z] of [[-3, -3], [3, -3], [-3, 3], [3, 3], [0, -1.6], [0, 1.8]]) {
      const p = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.6), new THREE.MeshBasicMaterial({ color: 0xfff6d0, fog: false })); p.rotation.x = Math.PI / 2; p.position.set(YX + x, h - 0.01, z); Y.add(p);
    }
    const yl = new THREE.PointLight(0xfff0b0, 0, 16, 0.9); yl.position.set(YX, h - 0.3, 0); Y.add(yl); this.yLight = yl;
    const ya = new THREE.AmbientLight(0xe8d890, 0); Y.add(ya); this.yAmb = ya;
    const door = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 2.05), psxMat({ map: tex('rg_flatdoor'), color: 0xd8c890 }));
    door.position.set(YX + 2.2, 1.025, -4.98); Y.add(door);
    this.yDoor = door;
  }

  // ---------- dressing ----------
  dressAll() {
    const d = this.d, nick = S.nick || 'you';
    const filler = n => ({ kind: 'normal', number: Math.max(1, n), anomaly: null });
    const next = d.next || filler(d.cur.number - 1);
    const specs = { 0: d.cur, 1: next, '-1': next, 2: filler(next.number - 1), '-2': filler(next.number - 1) };
    for (const it of this.items) this.it.remove(it);
    this.items = [];
    for (const k of KS) {
      const m = this.mods[k];
      while (m.dg.children.length) m.dg.remove(m.dg.children[0]);
      const res = dressLanding(m.dg, specs[k], { nick, floor: d.floor, live: k === 0 });
      m.res = res;
      const l0 = m.lamps[0]; l0.bm.color.set(res.lampColor); if (l0.light) l0.light.color.set(res.lampColor);  // only the landing bulb; the half-landing bulbs stay normal
      if (k === 0) for (const item of res.items) this.items.push(this.it.add(item.obj, () => this.label(item), () => this.use(item)));
    }
    this.gate.up.off = d.cur.kind !== 'start';
    this.gate.down.off = d.cur.kind !== 'lobby';
    this.applyLights();
  }
  label(item) {
    switch (item.kind) {
      case 'notice': return 'Read: ' + item.data.title;
      case 'door': return item.data.name ? `Flat ${item.data.no}: ${item.data.name}` : 'A door';
      case 'yourdoor': return 'Your flat: go home (ends the night)';
      case 'switch': return 'Light switch (villanykapcsoló)';
      case 'lift': return 'The lift (lift)';
      case 'rules': return 'Read the house rules (házirend)';
      case 'street': return 'The street door: go outside';
      case 'postbox': return 'Post boxes (postaládák)';
    }
    return '';
  }
  async use(item) {
    switch (item.kind) {
      case 'notice': await this.panel(() => readPanel(item.data.title, item.data.notices)); break;
      case 'rules': await this.panel(() => rulesPanel()); break;
      case 'door': play('knock', { vol: 0.5 }); caption(item.data.name ? 'You knock. Nobody opens. A television is on somewhere inside.' : 'There is no handle. There is no flat number.', 'say', 3.5); break;
      case 'yourdoor': this.goHome(); break;
      case 'switch': this.lightT = CFG.lightTimer; play('lightsw', { vol: 0.6 }); if (!this.lightsOn) { this.lightsOn = true; this.applyLights(); } break;
      case 'lift': play('denied', { vol: 0.3 }); caption('You press the button. Nothing. The lift never works at night.', 'say', 3); break;
      case 'postbox': caption('Rows of post boxes. Flyers stick out of most of them.', 'say', 3); break;
      case 'street': this.ground(); break;
    }
  }
  async panel(open) { this.playing = false; this.G.unlock(); prompt(null); await open(); this.playing = true; lockPointer(); }

  applyLights() {
    for (const k of KS) this.mods[k].lamps.forEach((l, i) => {
      const c = i === 0 && this.mods[k].res ? this.mods[k].res.lampColor : 0xffd9a0;
      if (!this.lightsOn) l.bm.color.setRGB(0.1, 0.09, 0.08); else l.bm.color.set(c);
      if (l.light) l.light.intensity = this.lightsOn ? l.base : 0;
    });
  }

  // ---------- flow ----------
  async enter() {
    this.playing = false; hud(false); music(null);
    loop('rgst', 'rg_drone_stair', { vol: 0.32 }); this.loops.push('rgst');
    this.player.set(-0.95, 1.35, 0);
    const first = !this.R.record.descents && !this.R.record.deaths && !Object.keys(this.R.record.missed).length && !this.R.record.notebook.length;
    await fade(true, first ? 'You lock your door. The stairwell light is ticking.\n\nRead the house rules next to your door before you go down.' : 'You lock your door. The stairwell light is ticking.', 0.01);
    await wait(first ? 3.2 : 1.6);
    this.playing = true; hud(true); hudParts({ checklist: true, status: false, eye: false, batt: false });
    this.setObjective(); this.updateHud(); lockPointer();
    await fade(false, '', 1.0);
  }
  setObjective() {
    const c = this.d.cur;
    if (c.kind === 'lobby') objective('Ground floor (földszint). The street door is in front of you.');
    else objective('Reach the ground floor (földszint). Something wrong on a landing? Go back up. All normal? Keep going down.');
  }
  updateHud() {
    const c = this.d.cur, L = this.R.life;
    checklist(`Lépcsőház · ${c.kind === 'lobby' ? 'ground floor' : c.number + '. emelet'}`, [
      { name: `Nerve: ${L.nerve}${L.nerve <= 30 ? '  (shaking)' : ''}`, hu: 'idegek' },
      { name: `Floors to go: ${this.d.floor - this.d.progress}`, hu: 'hátravan' },
      { name: `Coins tonight: ${this.run.coins}`, hu: 'zseton' },
      { name: this.lightsOn ? `Light: ${Math.ceil(this.lightT)} s` : 'Light: off (F = torch)', hu: 'villany' },
    ]);
  }

  /** Height of the floor under you: the surface closest to where you were (stairs overlap in plan). */
  groundY(x, z, prev) {
    let b;
    if (z >= 0) b = 0; else if (z < -3) b = -HALF; else if (x < 1.33) b = z / RUN * HALF; else b = -HALF - (z + 3) / RUN * HALF;
    let best = b, bd = 1e9;
    for (let k = -3; k <= 3; k++) { const y = b + k * H, dd = Math.abs(y - prev); if (dd < bd) { bd = dd; best = y; } }
    return best;
  }

  arrive(dir, lv) {
    // shift the world so the landing you reached is module 0 again
    this.y -= lv * H; this.player.yOff = this.y; this.player.sync();
    const d = this.d, from = d.cur, out = resolve(d, dir), R = this.R;
    advance(this.r, d, out);
    const dead = nerve(R, out.nerve);
    if (out.result === 'pass' || out.result === 'spot') {
      earn(R, out.xp, out.coins); this.run.xp += out.xp; this.run.coins += out.coins;
      this.dressAll(); this.setObjective();
      if (out.result === 'spot') {
        this.run.spot++; const a = ANOMALY[out.anomaly], isNew = noteAnomaly(R, out.anomaly, true);
        play('rg_signal1', { vol: 0.5 });
        caption(`You turned back, and you were right. ${a.lesson}`, 'say', 11);
        if (isNew) setTimeout(() => caption(`New notebook card: "${a.card.title}"`, 'say', 4), 1500);
      } else if (d.cur.kind === 'lobby') caption('Ground floor. The street door is right there.', 'say', 3);
      persist(); this.updateHud();
      return;
    }
    // a wrong call: the yellow room, then back to your own floor
    if (out.result === 'miss') { this.run.miss++; noteAnomaly(R, out.anomaly, false); } else this.run.fals++;
    persist();
    this.toYellow(out, from, dead);
  }

  async toYellow(out, from, dead) {
    this.playing = false; this.busy = true; prompt(null);
    play('rg_signal2', { vol: 0.6 }); flash(0.7, 400);
    await fade(true, '', 0.5);
    stopLoop('rgst'); loop('rgy', 'rg_drone_yellow', { vol: 0.4 }); this.loops.push('rgy');
    this.inYellow = true; this.y = 0; this.player.yOff = 0; this.yLight.intensity = 5; this.yAmb.intensity = 0.55;
    this.player.set(YX - 3.4, 3.6, -45);
    this.flashOn = false;
    this.yDoorIt = this.it.add(this.yDoor, 'A door. It should not be here, but it is the only way out.', () => this.leaveYellow());
    await fade(false, '', 0.8);
    const n = from.kind === 'lobby' ? 'the ground floor' : `floor ${from.number}`;
    if (out.result === 'miss') caption(`Something was wrong on ${n} and you kept going. ${ANOMALY[out.anomaly].lesson}`, 'say', 12);
    else caption(`Nothing was wrong on ${n}. Turning back on a normal landing costs nerve too.`, 'say', 7);
    setTimeout(() => caption(`Nerve −${-out.nerve}. Find the door.`, 'say', 4), 2500);
    this.updateHud();
    this.playing = true; this.busy = false; lockPointer();
    if (dead) { await wait(3.5); this.death(); }
  }
  async leaveYellow() {
    if (this.busy) return; this.busy = true; this.playing = false;
    play('door_close', { vol: 0.5 });
    await fade(true, '', 0.6);
    this.it.remove(this.yDoorIt); this.inYellow = false; this.yLight.intensity = 0; this.yAmb.intensity = 0;
    stopLoop('rgy'); loop('rgst', 'rg_drone_stair', { vol: 0.32 });
    this.y = 0; this.player.yOff = 0; this.dressAll(); this.setObjective();
    this.player.set(-0.95, 1.35, 0);
    this.lightT = CFG.lightTimer; this.lightsOn = true; this.applyLights();
    await fade(false, '', 0.8);
    caption(`Back outside your own door, floor ${this.d.floor}. Start again.`, 'say', 4);
    this.playing = true; this.busy = false; lockPointer();
  }
  async death() {
    this.playing = false; this.busy = true; this.G.unlock(); prompt(null);
    play('stinger', { vol: 0.4 }); this.yLight.intensity = 0; this.yAmb.intensity = 0;
    await fade(true, '', 1.5);
    await fade(false, '', 0.01);      // the death panel is opaque; the fade layer would block its button
    await deathPanel(this.R, null);
    die(this.R, null); persist();
    this.G.goRogue();
  }
  async ground() {
    if (this.busy) return; this.busy = true; this.playing = false; this.G.unlock(); prompt(null);
    const rw = groundReward(this.d.floor);
    earn(this.R, rw.xp, rw.coins); this.R.record.descents++; persist();
    play('door_open', { vol: 0.5 });
    await groundPanel(rw, this.run);
    this.goHome(true);
  }
  async goHome() {
    this.playing = false; this.busy = true; this.G.unlock(); prompt(null);
    await fade(true, '', 0.8);
    this.G.goRogue();
  }
  quit() { this.goHome(); }

  update(dt, t) {
    for (const k of KS) { const b = this.mods[k].res && this.mods[k].res.blink; if (b) b.visible = Math.sin(t * 6) > 0; }
    if (!this.playing) return;
    this.player.update(dt);
    if (!this.inYellow) {
      const p = this.player.pos;
      this.y = this.groundY(p.x, p.z, this.y); this.player.yOff = this.y; this.player.sync();
      if (p.z >= 0.05) { const lv = Math.round(this.y / H); if (lv !== 0 && Math.abs(this.y - lv * H) < 0.06) { this.arrive(lv > 0 ? 'up' : 'down', lv); return; } }
      // the light timer
      if (this.lightsOn) { this.lightT -= dt; if (this.lightT <= 0) { this.lightsOn = false; play('lightsw', { vol: 0.5, rate: 0.8 }); this.applyLights(); caption('Click. The light went out. Press F for your torch, or find a switch.', 'say', 4); } }
      // a phone rings behind a door, and someone answers in your voice
      if (this.d.cur.anomaly === 'phone_voice' && t > this.voiceT) {
        const d3 = this.mods[0].res.door3, dist = Math.hypot(p.x - d3.x, p.z - d3.z);
        if (dist < 3.4) {
          this.voiceT = t + 16;
          play('phonering', { vol: 0.35, pos: [d3.x, this.y + 1.2, d3.z + 0.6] });
          setTimeout(() => { if (this.d.cur.anomaly !== 'phone_voice') return; babble('Hello? Yes, it is me. I need that code, quickly.', 'you', { vol: 0.09 }); caption('(behind the door of flat ' + (this.d.cur.number * 3 + 3) + ', someone answers the phone in your voice)', 'sfx', 5); }, 2600);
        }
      }
    }
    this.updateFlash(dt); this.updateArms(dt, t);
    this.fill.intensity = this.flashOn ? 0.3 : 0.05;
    this._h = (this._h || 0) + dt; if (this._h > 0.25) { this._h = 0; this.updateHud(); }
    this.interact();
  }
}
