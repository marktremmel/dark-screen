// Lépcsőház screens: reading notices, the house rules, your computer, the floor choice, death and the ground floor.
// Each returns a Promise that resolves when the panel closes. The scenes handle the mouse lock around them.
import { openScreen, closeScreen } from '../../ui/screens.js';
import { CFG, floorMult } from '../config.js';
import { ANOMALY, ANOMALIES } from '../content/anomalies.js';
import { THEMES } from '../content/themes.js';

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const PAPER = 'background:#ece6d6;color:#1d1a14;border-radius:3px;padding:14px 16px;margin:10px 0;box-shadow:0 3px 12px rgba(0,0,0,.5);font-family:Georgia,serif;line-height:1.45';

/** Close on the button, Escape or E. */
function closable(el, res, sel = '#x') {
  const done = () => { removeEventListener('keydown', key, true); closeScreen(el); res(); };
  const key = e => { if (e.code === 'Escape' || e.code === 'KeyE' || e.code === 'Enter') { e.preventDefault(); e.stopImmediatePropagation(); done(); } };
  setTimeout(() => addEventListener('keydown', key, true), 150);
  el.querySelector(sel).onclick = done;
}

export function readPanel(title, notices) {
  return new Promise(res => {
    const el = openScreen(`<div class="panel" style="width:min(560px,94vw)"><h2>${esc(title)}</h2>
      ${notices.map(n => `<div style="${PAPER}${/WARNING|FREE WI-FI/.test(n[0]) ? ';border-top:6px solid #c0392b' : ''}"><b>${esc(n[0])}</b><br>${n.slice(1).map(esc).join('<br>')}</div>`).join('')}
      <div class="btns"><button class="btn primary" id="x" autofocus>Done reading (E)</button></div></div>`);
    closable(el, res);
  });
}

export function rulesPanel() {
  return new Promise(res => {
    const el = openScreen(`<div class="panel" style="width:min(560px,94vw)"><h2>House rules (házirend)</h2>
      <div style="${PAPER};border-top:6px solid #7a1e1e">
      <b>HÁZIREND · for residents going down at night</b><br><br>
      1. Learn what a normal landing looks like: three doors, the lift, the noticeboard, the plant, the floor number.<br>
      2. If anything on a landing is wrong, <b>turn back: go up the stairs.</b><br>
      3. If nothing is wrong, <b>keep going down.</b><br>
      4. A wrong call sends you back to your own floor.<br>
      5. Press the light switch (villanykapcsoló). The light only lasts ${CFG.lightTimer} seconds. F is your torch.<br>
      6. Read the notices. Not everything wrong is something you can see from far away.</div>
      <div class="btns"><button class="btn primary" id="x" autofocus>Got it (E)</button></div></div>`);
    closable(el, res);
  });
}

/** Your desk computer at home: life, record, notebook. */
export function computerPanel(R, nick) {
  return new Promise(res => {
    const L = R.life, rec = R.record;
    const cards = rec.notebook.map(id => ANOMALY[id]).filter(Boolean);
    const caught = Object.values(rec.spotted).reduce((a, b) => a + b, 0), missed = Object.values(rec.missed).reduce((a, b) => a + b, 0);
    const el = openScreen(`<div class="panel" style="width:min(720px,94vw)"><h2>Your computer</h2>
      <p class="sub">${esc(nick)} · life ${L.id} · floor ${L.floor}</p>
      <div><span class="stat">Coins (zseton): ${L.coins}</span><span class="stat">XP (all lives): ${rec.xp}</span><span class="stat">Ground floor reached: ${rec.descents}</span><span class="stat">Caught: ${caught}</span><span class="stat">Missed: ${missed}</span><span class="stat">Deaths: ${rec.deaths}</span></div>
      <h3>Notebook (jegyzetfüzet): ${cards.length} of ${ANOMALIES.length} cards</h3>
      ${cards.length ? cards.map(a => `<div style="${PAPER};margin:8px 0"><b>${esc(a.card.title)}</b> <span style="color:#7a6a50;font-size:.85em">· ${esc(THEMES[a.theme].title)}</span><br>${esc(a.card.text)}</div>`).join('') : '<p class="sub">Empty for now. Every anomaly you catch on the stairs adds a card. Cards survive death.</p>'}
      <p class="sub">The shop (furniture, stickers, gadgets) opens in the next build. Save your coins.</p>
      <div class="btns"><button class="btn primary" id="x" autofocus>Close (E)</button></div></div>`);
    closable(el, res);
  });
}

/** Choose the floor for this life. Resolves with 1..10. */
export function floorPicker(R) {
  return new Promise(res => {
    const first = R.life.id === 1 && R.record.deaths === 0;
    const btns = Array.from({ length: CFG.floors }, (_, i) => CFG.floors - i).map(f =>
      `<button class="btn" data-f="${f}" style="display:flex;justify-content:space-between;gap:14px;text-align:left"><b>${f}. emelet</b><span class="sub">${f} landing${f > 1 ? 's' : ''} down · rewards x${floorMult(f).toFixed(2)}</span></button>`).join('');
    const el = openScreen(`<div class="panel" style="width:min(640px,94vw)">
      <h2>${first ? 'Your own flat' : `Life ${R.life.id}: a new flat`}</h2>
      <p>${first ? 'You have the keys to a one-room flat in a ten-storey panel block. It is nearly empty, but it is yours.' : 'You start again in an empty flat. What you learned is still in your notebook.'}</p>
      <p>Choose your floor (emelet). Every night you go down the stairwell to the ground floor, one landing per floor. Higher floors pay more and take longer. You keep this floor until you lose this life.</p>
      <div style="display:grid;grid-template-columns:1fr;gap:6px;max-height:48vh;overflow:auto;margin-top:10px">${btns}</div></div>`, 'solid');
    el.querySelectorAll('[data-f]').forEach(b => b.onclick = () => { closeScreen(el); res(+b.dataset.f); });
  });
}

export function deathPanel(R, kept) {
  return new Promise(res => {
    const el = openScreen(`<div class="panel" style="width:min(600px,94vw);text-align:center"><h2>Your nerve is gone</h2>
      <p>The stairwell goes quiet. When you can move again, you are standing outside a different door with a new key in your hand.</p>
      <p><b>Lost:</b> your flat on floor ${R.life.floor}, ${R.life.coins} coins, everything you placed.</p>
      <p><b>Kept:</b> your notebook (${R.record.notebook.length} cards), your XP (${R.record.xp})${kept ? ' and ' + esc(kept) : ''}.</p>
      <p class="sub">Next life you can choose a different floor.</p>
      <div class="btns" style="justify-content:center"><button class="btn primary" id="x" autofocus>Start a new life</button></div></div>`, 'solid');
    el.querySelector('#x').onclick = () => { closeScreen(el); res(); };
  });
}

export function groundPanel(rw, run) {
  return new Promise(res => {
    const el = openScreen(`<div class="panel" style="width:min(600px,94vw)"><h2>Ground floor (földszint)</h2>
      <p>You push the street door open. The courtyard is empty, one window lit in the block opposite. Tonight you just needed to get down here in one piece.</p>
      <p class="sub">The city (school, courtyard, park, underpass) opens in a later build. For now the stairwell is the mission.</p>
      <div><span class="stat">+${rw.xp + run.xp} XP</span><span class="stat">+${rw.coins + run.coins} coins</span><span class="stat">Caught: ${run.spot}</span><span class="stat">Missed: ${run.miss}</span><span class="stat">Wrong turn-backs: ${run.fals}</span></div>
      <div class="btns"><button class="btn primary" id="x" autofocus>Back up to your flat</button></div></div>`);
    el.querySelector('#x').onclick = () => { closeScreen(el); res(); };
  });
}

/** At the street door: where tonight? Resolves with 'school' or 'park'. */
export function missionChoice(R) {
  return new Promise(res => {
    const el = openScreen(`<div class="panel" style="width:min(620px,94vw)"><h2>The street door</h2>
      <p>The courtyard is empty. Two ways lead out into the night.</p>
      <div style="display:grid;gap:10px;margin-top:10px">
      <button class="btn" data-m="school" style="text-align:left"><b>The school</b> across the courtyard<br><span class="sub">Screens that pull at you, something in a classroom that moves when you look away, a phone in the gym.</span></button>
      <button class="btn" data-m="park" style="text-align:left"><b>The park walk</b> to the far gate<br><span class="sub">Voices step out of the trees. Type the safe reply before they reach you.</span></button>
      </div></div>`, 'solid');
    el.querySelectorAll('[data-m]').forEach(b => b.onclick = () => { closeScreen(el); res(b.dataset.m); });
  });
}
