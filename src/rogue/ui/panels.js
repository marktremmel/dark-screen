// Lépcsőház screens: reading notices, the house rules, your computer, the floor choice, death and the ground floor.
// Each returns a Promise that resolves when the panel closes. The scenes handle the mouse lock around them.
import { openScreen, closeScreen } from '../../ui/screens.js';
import { CFG, floorMult } from '../config.js';
import { CARDS, CARD_COUNT } from '../content/cards.js';
import { TOPICS } from '../content/walks.js';
import { DIFFS } from '../logic/night.js';
import { THEMES } from '../content/themes.js';
import { WALK_NAME, SHAPES, SHAPE_IDS, fillDesc, stageName } from '../logic/routes.js';

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
      4. A wrong call drops you into the yellow rooms. Find the EXIT and you come out higher up: one floor on Calm, two on Normal, your own floor on Hard. Your own floor is always normal, and the way up from it is locked: start by going down.<br>
      5. Press the light switch (villanykapcsoló). The light does not last long. F is your torch.<br>
      6. Read the notices. Not everything wrong is something you can see from far away.</div>
      <div class="btns"><button class="btn primary" id="x" autofocus>Got it (E)</button></div></div>`);
    closable(el, res);
  });
}

/** Your desk computer at home: life, record, notebook. */
export function computerPanel(R, nick) {
  return new Promise(res => {
    const L = R.life, rec = R.record;
    const cards = rec.notebook.map(id => CARDS[id]).filter(Boolean);
    const caught = Object.values(rec.spotted).reduce((a, b) => a + b, 0), missed = Object.values(rec.missed).reduce((a, b) => a + b, 0);
    const el = openScreen(`<div class="panel" style="width:min(720px,94vw)"><h2>Your computer</h2>
      <p class="sub">${esc(nick)} · life ${L.id} · floor ${L.floor}</p>
      <div><span class="stat">Coins (zseton): ${L.coins}</span><span class="stat">XP (all lives): ${rec.xp}</span><span class="stat">Ground floor reached: ${rec.descents}</span><span class="stat">Caught: ${caught}</span><span class="stat">Missed: ${missed}</span><span class="stat">Deaths: ${rec.deaths}</span></div>
      <h3>Notebook (jegyzetfüzet): ${cards.length} of ${CARD_COUNT} cards</h3>
      ${cards.length ? cards.map(a => `<div style="${PAPER};margin:8px 0"><b>${esc(a.title)}</b> <span style="color:#7a6a50;font-size:.85em">· ${esc(THEMES[a.theme].title)}</span><br>${esc(a.text)}</div>`).join('') : '<p class="sub">Empty for now. Every anomaly you catch and every reply you type on a walk adds a card. Cards survive death.</p>'}
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

/** At the front door: tonight's topic, the difficulty, your scores. Resolves with {diff, topic} or null (stay in). */
export function nightMenu(R, o) {
  return new Promise(res => {
    const rec = R.record, best = rec.best || { xp: 0, wpm: 0, stages: 0 }, nights = rec.nights || [];
    let diff = (R.options && R.options.diff) || 'normal', topic = o.topic, hard = !!(R.options && R.options.hard), shape = o.shape || 'usual';
    const run0 = { walk: o.walk, walk2: o.walk2 };
    const WALK = WALK_NAME;
    const el = openScreen(`<div class="panel" style="width:min(760px,94vw)"><h2>Tonight</h2>
      <div style="${PAPER};margin:6px 0 12px"><span style="font-size:.8em;color:#7a6a50">TONIGHT'S TOPIC</span><br><b id="tt"></b> <span id="th" style="color:#7a6a50"></span>
        <br><span style="font-size:.85em">The stairwell, the walk and the cards tonight are mostly about this.</span></div>
      <div style="${PAPER};margin:0 0 12px"><span style="font-size:.8em;color:#7a6a50">TONIGHT'S ROUTE (útvonal)</span><br><b id="rt"></b> <span id="rh" style="color:#7a6a50"></span>
        <br><span id="rd" style="font-size:.85em"></span><div id="rc" style="margin-top:6px;display:flex;flex-wrap:wrap;gap:4px;align-items:center"></div></div>
      <h3 style="margin-top:0">Difficulty (nehézség)</h3>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px" id="dd">${Object.values(DIFFS).map(d => `<button class="btn" data-d="${d.id}" style="text-align:left"><b>${d.label}</b> <span class="sub">(${d.hu})</span><br><span class="sub" style="font-size:.8em">${esc(d.desc)}</span></button>`).join('')}</div>
      <h3>Typing (gépelés)</h3>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px"><button class="btn" data-h="0" style="text-align:left"><b>Normal</b><br><span class="sub" style="font-size:.8em">Short replies. Capitals and punctuation do not matter.</span></button><button class="btn" data-h="1" style="text-align:left"><b>Hard</b><br><span class="sub" style="font-size:.8em">Whole sentences. Capitals, commas and full stops count. The figures walk slower.</span></button></div>
      <h3>Your scores</h3>
      <div><span class="stat">Best night: ${best.xp} XP</span><span class="stat">Best typing: ${best.wpm} wpm</span><span class="stat">Most stages in a night: ${best.stages}</span>${best.rooms ? `<span class="stat">Labyrinth: ${best.rooms} rooms</span>` : ''}<span class="stat">Nights out: ${nights.length >= 12 ? '12+' : nights.length}</span><span class="stat">Cards: ${rec.notebook.length}/${CARD_COUNT}</span><span class="stat">Lives lost: ${rec.deaths}</span></div>
      ${nights.length ? `<table style="width:100%;margin-top:8px;font-size:.82em;border-collapse:collapse">${nights.slice(0, 5).map(n => `<tr style="border-top:1px solid #2a2636"><td>${esc((TOPICS[n.topic] || {}).title || n.topic)}</td><td class="sub">${n.mode === 'labyrinth' ? 'the labyrinth' : esc(WALK[n.walk] || '')}</td><td class="sub">${esc((DIFFS[n.diff] || {}).label || '')}</td><td>${n.xp} XP</td><td>${n.wpm} wpm</td><td class="sub">${n.mode === 'labyrinth' ? n.rooms + ' rooms' : n.outcome === 'full' ? 'the whole night' + (n.shape && SHAPES[n.shape] ? ' (' + SHAPES[n.shape].name.toLowerCase() + ')' : '') : n.outcome === 'death' ? 'lost the life' : n.outcome === 'metro' ? 'the whole night' : n.outcome === 'school' ? 'school done' : n.outcome === 'walk' ? 'walk done' : 'came home early'}</td></tr>`).join('')}</table>` : '<p class="sub">No nights yet.</p>'}
      <div class="btns"><button class="btn primary" id="go" autofocus>Go out</button><button class="btn" id="lb" title="The yellow rooms as a night of their own: room after room, no lives lost, a score to beat">The labyrinth${best.rooms ? ' (best ' + best.rooms + ')' : ''}</button><button class="btn" id="sh">Another topic</button><button class="btn" id="sr">Another route</button><button class="btn" id="x">Stay in</button>${o.teacher ? '<button class="btn" id="tm" style="margin-left:auto">Test a stage (teacher)</button>' : ''}</div></div>`);
    const draw = () => {
      el.querySelector('#tt').textContent = TOPICS[topic].title; el.querySelector('#th').textContent = '(' + TOPICS[topic].hu + ')';
      el.querySelectorAll('[data-d]').forEach(b => { b.classList.toggle('primary', b.dataset.d === diff); });
      el.querySelectorAll('[data-h]').forEach(b => { b.classList.toggle('primary', (b.dataset.h === '1') === hard); });
      const S0 = SHAPES[shape]; el.querySelector('#rt').textContent = S0.name; el.querySelector('#rh').textContent = '(' + S0.hu + ')';
      el.querySelector('#rd').textContent = fillDesc(run0, S0.desc);
      el.querySelector('#rc').innerHTML = S0.route.map(st => `<span style="background:#2b2636;color:#e8dcc4;border-radius:6px;padding:2px 7px;font-size:.78em">${esc(stageName(run0, st))}</span>`).join('<span style="color:#7a6a50">→</span>');
    };
    el.querySelector('#sr').onclick = () => { const ids = SHAPE_IDS.filter(x => x !== shape); shape = ids[Math.floor(Math.random() * ids.length)]; draw(); };
    el.querySelectorAll('[data-d]').forEach(b => b.onclick = () => { diff = b.dataset.d; draw(); });
    el.querySelectorAll('[data-h]').forEach(b => b.onclick = () => { hard = b.dataset.h === '1'; draw(); });
    el.querySelector('#sh').onclick = () => { const ids = Object.keys(TOPICS).filter(t => t !== topic); topic = ids[Math.floor(Math.random() * ids.length)]; draw(); };
    el.querySelector('#go').onclick = () => { closeScreen(el); R.options.diff = diff; R.options.hard = hard; res({ diff, topic, hard, shape }); };
    el.querySelector('#lb').onclick = () => { closeScreen(el); R.options.diff = diff; R.options.hard = hard; res({ diff, topic, hard, mode: 'labyrinth' }); };
    el.querySelector('#x').onclick = () => { closeScreen(el); res(null); };
    const tm = el.querySelector('#tm'); if (tm) tm.onclick = () => { closeScreen(el); R.options.diff = diff; R.options.hard = hard; res({ diff, topic, hard, test: true }); };
    draw();
  });
}

/** Teacher only: jump straight to one stage and version, for play-testing. Resolves the choice or null. */
export function testPanel(R, o) {
  return new Promise(res => {
    let topic = o.topic, diff = o.diff;
    const B = (k, label, sub) => `<button class="btn small" data-s="${k}" style="text-align:left;padding:6px 9px" title="${sub || ''}"><b style="font-size:.9em">${label}</b></button>`;
    const el = openScreen(`<div class="panel" style="width:min(860px,96vw);max-height:94vh;overflow:auto"><h2 style="margin:0 0 4px">Test a stage (teacher)</h2>
      <p class="sub">Jumps straight in. Rewards still count, so use a teacher nickname. Topic and difficulty apply to the stage.</p>
      <div class="btns" style="flex-wrap:wrap">${Object.entries(TOPICS).map(([id, t]) => `<button class="btn small" data-t="${id}">${esc(t.title)}</button>`).join('')}</div>
      <div class="btns">${Object.values(DIFFS).map(d => `<button class="btn small" data-d="${d.id}">${d.label}</button>`).join('')}</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:6px;margin-top:8px">
        ${B('stairs', 'Stairwell', 'from your floor')}${B('maze', 'The yellow maze', 'as after a wrong call')}${B('labyrinth', 'The endless labyrinth', 'room after room, a score')}
        ${B('walk:park', 'Walk: the park')}${B('walk:backrooms', 'Walk: the yellow rooms')}${B('walk:hotel', 'Walk: the hotel corridor')}${B('walk:pool', 'Walk: the empty pool')}${B('walk:underpass', 'Walk: the underpass')}${B('walk:courtyard', 'Walk: the courtyard')}${B('walk:alley', 'Walk: the alley')}${B('walk:bus', 'Walk: the bus station')}
        ${B('school:feed:phone', 'School: screens + phone', 'the Feed, the Watcher, the found phone')}${B('school:fuse:phone', 'School: fuses + phone', 'permissions, the Watcher, the phone')}
        ${B('school:feed:chorus', 'School: screens + Chorus', 'the Feed, the Watcher, Dani')}${B('school:fuse:chorus', 'School: fuses + Chorus', 'permissions, the Watcher, Dani')}
        ${B('metro', 'Metro', 'the posts and the Collector')}${B('coins', '+500 coins', 'for testing the shop')}
      </div>
      <div class="btns"><button class="btn" id="x">Back</button></div></div>`, 'solid');
    const draw = () => { el.querySelectorAll('[data-t]').forEach(b => b.classList.toggle('primary', b.dataset.t === topic)); el.querySelectorAll('[data-d]').forEach(b => b.classList.toggle('primary', b.dataset.d === diff)); };
    el.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { topic = b.dataset.t; draw(); });
    el.querySelectorAll('[data-d]').forEach(b => b.onclick = () => { diff = b.dataset.d; draw(); });
    el.querySelectorAll('[data-s]').forEach(b => b.onclick = () => { closeScreen(el); res({ stage: b.dataset.s, topic, diff }); });
    el.querySelector('#x').onclick = () => { closeScreen(el); res(null); };
    draw();
  });
}

/** Between stages (v0.17): what comes next on tonight's route, or home with what you have. */
export function nextChoice(run, next) {
  const W = n => WALK_NAME[n] || 'the street';
  const T = {
    school: ['Across the road, the school is dark. One window flickers.', 'Go on to the school', 'Three rooms, a figure that moves when you look away, and something different waiting each night.'],
    metro: ['The metro entrance glows at the end of the street. The last train leaves soon.', 'Catch the last train', 'Your old posts are glowing all over the platform, and something is collecting them.'],
    walk: [`The way on goes through ${W(run.walk)}.`, `Go through ${W(run.walk)}`, 'Three stretches of dark, and figures who want answers.'],
    walk2: [`The train stopped early. The way home goes through ${W(run.walk2)}.`, `Walk home through ${W(run.walk2)}`, 'The last stretch of a long night: finish it for a 20% bonus on everything tonight.'],
  }[next];
  const left = (run.route || []).slice((run.route || []).indexOf(next) + 1).length;
  return new Promise(res => {
    const el = openScreen(`<div class="panel" style="width:min(600px,94vw)"><h2>${next === 'walk2' ? 'Two stations early' : 'Out on the street'}</h2>
      <p>So far tonight: <b>${run.xp} XP</b> and <b>${run.coins} coins</b>. ${T[0]}</p>
      <p class="sub">${left ? `After this, ${left} more stage${left > 1 ? 's' : ''} tonight.` : 'This is the last stage tonight.'} If your nerve runs out, you lose this life.</p>
      <div style="display:grid;gap:10px;margin-top:10px">
      <button class="btn primary" data-m="go" style="text-align:left"><b>${T[1]}</b><br><span class="sub">${T[2]}</span></button>
      <button class="btn" data-m="home" style="text-align:left"><b>Go home</b><br><span class="sub">Keep everything you earned tonight.</span></button></div></div>`, 'solid');
    el.querySelectorAll('[data-m]').forEach(b => b.onclick = () => { closeScreen(el); res(b.dataset.m); });
  });
}
