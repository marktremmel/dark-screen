// The close-up "fit the part" screen: an SVG view into the open PC case.
import { openScreen, closeScreen } from './screens.js';
import { rich, PARTS, SUCCESS_LINES, plain } from '../text.js';
import { play } from '../core/audio.js';

const HOT = {
  socket: [196, 66, 88, 88], cpu8: [86, 26, 42, 24], atx24: [414, 146, 28, 78],
  A1: [306, 46, 11, 158], A2: [321, 46, 11, 158], B1: [336, 46, 11, 158], B2: [351, 46, 11, 158],
  m2: [166, 186, 118, 22], x16: [96, 220, 238, 22], x1: [96, 270, 68, 20], bay: [56, 336, 208, 76], gpu8: [318, 238, 28, 22],
};
const NAMES = { socket: 'CPU socket', cpu8: 'CPU power socket (8-pin)', atx24: 'Motherboard power socket (24-pin)', A1: 'RAM slot A1', A2: 'RAM slot A2', B1: 'RAM slot B1', B2: 'RAM slot B2', m2: 'M.2 slot', x16: 'Long PCIe x16 slot', x1: 'Short PCIe x1 slot', bay: 'Power supply bay', gpu8: 'Graphics card power socket' };

function caseSVG(st, fitted, active) {
  const f = k => fitted.includes(k);
  const hot = (id, extra = '') => { const [x, y, w, h] = HOT[id]; return `<g class="hot ${st.sel && st.sel.includes(id) ? 'sel' : ''} ${st.hint && st.hintIds && st.hintIds.includes(id) ? 'hint' : ''}" data-id="${id}" ${extra}><rect class="h" x="${x - 3}" y="${y - 3}" width="${w + 6}" height="${h + 6}" rx="3" fill="rgba(0,0,0,0)" stroke-width="2"/></g>`; };
  let s = `<svg viewBox="0 0 600 420" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">
  <rect width="600" height="420" fill="#101318"/><rect x="40" y="8" width="420" height="320" fill="#181c22" stroke="#2b3038"/>
  <rect x="60" y="20" width="390" height="300" fill="#1e4a35" stroke="#2f6b50"/>
  ${Array.from({ length: 14 }, (_, i) => `<line x1="${70 + i * 26}" y1="24" x2="${70 + i * 26}" y2="316" stroke="#235a40" stroke-width="1"/>`).join('')}
  <text x="66" y="314" fill="#5fa884" font-family="m5x7,monospace" font-size="16">MOTHERBOARD (alaplap)</text>
  <!-- socket -->
  <rect x="196" y="66" width="88" height="88" fill="#4b4f55" stroke="#9aa0a8"/><rect x="204" y="74" width="72" height="72" fill="#2c3036"/>
  <path d="M204 146 L214 146 L204 136 Z" fill="#e8c35a"/>
  <!-- ram slots -->
  ${['A1', 'A2', 'B1', 'B2'].map((k, i) => `<rect x="${306 + i * 15}" y="46" width="11" height="158" fill="${i % 2 ? '#333' : '#555'}" stroke="#888"/><rect x="${306 + i * 15}" y="96" width="11" height="4" fill="#1e4a35"/><text x="${305 + i * 15}" y="42" fill="#9fd" font-family="m5x7,monospace" font-size="14">${k}</text>`).join('')}
  <!-- 24 pin, 8 pin -->
  <rect x="414" y="146" width="28" height="78" fill="#222" stroke="#777"/>${Array.from({ length: 12 }, (_, i) => `<rect x="418" y="${150 + i * 6}" width="6" height="4" fill="#555"/><rect x="430" y="${150 + i * 6}" width="6" height="4" fill="#555"/>`).join('')}
  <rect x="86" y="26" width="42" height="24" fill="#222" stroke="#777"/>${Array.from({ length: 4 }, (_, i) => `<rect x="${90 + i * 9}" y="30" width="6" height="6" fill="#555"/><rect x="${90 + i * 9}" y="40" width="6" height="6" fill="#555"/>`).join('')}
  <!-- m2 -->
  <rect x="166" y="190" width="118" height="14" fill="#2a2a2a" stroke="#8a8a8a"/><circle cx="292" cy="197" r="4" fill="#c9c9c9"/><text x="168" y="186" fill="#9fd" font-family="m5x7,monospace" font-size="14">M.2</text>
  <!-- pcie -->
  <rect x="96" y="224" width="238" height="14" fill="#222" stroke="#999"/><text x="98" y="218" fill="#9fd" font-family="m5x7,monospace" font-size="14">PCIe x16</text>
  <rect x="96" y="274" width="68" height="12" fill="#222" stroke="#999"/><text x="98" y="268" fill="#9fd" font-family="m5x7,monospace" font-size="14">PCIe x1</text>
  <!-- psu bay -->
  <rect x="56" y="336" width="208" height="76" fill="#0c0e12" stroke="#3a3f48" stroke-dasharray="6 4"/><text x="64" y="360" fill="#6b7480" font-family="m5x7,monospace" font-size="16">PSU BAY</text>
  <rect x="270" y="400" width="190" height="8" fill="#20252c"/>${Array.from({ length: 10 }, (_, i) => `<rect x="${274 + i * 18}" y="401" width="10" height="6" fill="#0a0c0f"/>`).join('')}`;
  // fitted parts
  if (f('cpu')) s += `<rect x="208" y="78" width="64" height="64" fill="#b9bec6" stroke="#eee"/><path d="M210 140 L218 140 L210 132 Z" fill="#e8c35a"/><text x="222" y="114" font-family="m5x7,monospace" font-size="16" fill="#333">CPU</text>`;
  if (f('cooler')) s += `<circle cx="240" cy="110" r="52" fill="#2b2e33" stroke="#777" stroke-width="3"/><circle cx="240" cy="110" r="40" fill="#15171a"/>${[0, 72, 144, 216, 288].map(a => `<path d="M240 110 L${240 + 36 * Math.cos(a * Math.PI / 180)} ${110 + 36 * Math.sin(a * Math.PI / 180)} L${240 + 30 * Math.cos((a + 30) * Math.PI / 180)} ${110 + 30 * Math.sin((a + 30) * Math.PI / 180)} Z" fill="#555"/>`).join('')}<circle cx="240" cy="110" r="9" fill="#888"/>`;
  if (f('ram')) s += ['A2', 'B2'].map(k => { const x = HOT[k][0]; return `<rect x="${x - 1}" y="44" width="13" height="162" fill="#2f6dbd" stroke="#9cc4ff"/>`; }).join('');
  if (f('ssd')) s += `<rect x="168" y="191" width="120" height="12" fill="#151515" stroke="#ddd"/><rect x="200" y="193" width="26" height="8" fill="#333"/><text x="234" y="201" font-family="m5x7,monospace" font-size="12" fill="#ddd">SSD</text>`;
  if (f('gpu')) s += `<rect x="92" y="226" width="256" height="40" fill="#24262b" stroke="#aaa"/><circle cx="150" cy="246" r="16" fill="#111" stroke="#666"/><circle cx="210" cy="246" r="16" fill="#111" stroke="#666"/><text x="250" y="252" font-family="m5x7,monospace" font-size="14" fill="#ddd">GPU</text><rect x="318" y="238" width="28" height="22" fill="#222" stroke="#999"/>`;
  if (f('psu')) s += `<rect x="60" y="342" width="200" height="66" fill="#2a2d33" stroke="#999"/><circle cx="160" cy="400" r="22" fill="#15171a" stroke="#666"/><text x="70" y="364" font-family="m5x7,monospace" font-size="16" fill="#ddd">PSU 650W</text>`;
  const c = st.cables || {};
  if (c.atx24 || f('cables')) s += `<path d="M260 376 C 360 360, 470 300, 428 224" stroke="#d8d8d8" stroke-width="10" fill="none" opacity=".9"/>`;
  if (c.cpu8 || f('cables')) s += `<path d="M200 370 C 40 300, 30 100, 106 50" stroke="#e6e6e6" stroke-width="6" fill="none" opacity=".9"/>`;
  if (c.gpu8 || f('cables')) s += `<path d="M240 372 C 300 330, 330 300, 332 260" stroke="#cfcfcf" stroke-width="6" fill="none" opacity=".9"/>`;
  // hotspots (only the ones that make sense to click for the active part)
  const ids = { cpu: ['socket', 'A1', 'A2', 'B1', 'B2', 'm2', 'x16', 'x1'], cooler: ['socket', 'm2', 'x16'], ram: ['A1', 'A2', 'B1', 'B2', 'm2', 'x1'], ssd: ['m2', 'A1', 'A2', 'x1', 'x16'], gpu: ['x16', 'x1', 'm2'], psu: ['bay', 'x16'], cables: ['atx24', 'cpu8', 'gpu8', 'socket'] }[active] || [];
  for (const id of ids) { if (id === 'gpu8' && !f('gpu')) continue; s += hot(id); }
  return s + '</svg>';
}

function partIcon(part, st) {
  const r = (st.rot || 0) * 90;
  const ic = {
    cpu: `<svg viewBox="0 0 60 60" width="64"><g transform="rotate(${r} 30 30)"><rect x="8" y="8" width="44" height="44" fill="#b9bec6" stroke="#eee"/><path d="M10 50 L20 50 L10 40 Z" fill="#e8c35a"/></g></svg>`,
    cooler: `<svg viewBox="0 0 60 60" width="64"><circle cx="30" cy="30" r="26" fill="#2b2e33" stroke="#999" stroke-width="2"/><circle cx="30" cy="30" r="6" fill="#999"/></svg>`,
    ram: `<svg viewBox="0 0 60 60" width="64"><rect x="4" y="22" width="52" height="16" fill="#2f6dbd" stroke="#9cc4ff"/><rect x="${st.flip ? 40 : 16}" y="34" width="4" height="5" fill="#0c1712"/></svg>`,
    ssd: `<svg viewBox="0 0 60 60" width="64"><rect x="4" y="24" width="52" height="12" fill="#151515" stroke="#ddd"/><rect x="14" y="26" width="12" height="8" fill="#444"/></svg>`,
    gpu: `<svg viewBox="0 0 60 60" width="64"><rect x="2" y="18" width="56" height="24" fill="#24262b" stroke="#aaa"/><circle cx="18" cy="30" r="8" fill="#111"/><circle cx="40" cy="30" r="8" fill="#111"/></svg>`,
    psu: `<svg viewBox="0 0 60 60" width="64"><rect x="6" y="14" width="48" height="32" fill="#2a2d33" stroke="#999"/><circle cx="30" cy="${st.fanDown === false ? 18 : 42}" r="9" fill="#15171a" stroke="#666"/><text x="8" y="12" font-size="8" fill="#9fd">${st.fanDown === false ? 'fan up' : 'fan down'}</text></svg>`,
    cables: `<svg viewBox="0 0 60 60" width="64"><path d="M6 50 C 20 10, 40 10, 54 50" stroke="#ddd" stroke-width="5" fill="none"/></svg>`,
  };
  return ic[part];
}

// opens the fit screen. cb: { fitted:[...], mistake(kind,msg), done(part) , close() }
export function openFit(part, cb) {
  const st = { grounded: false, rot: 2, flip: true, fanDown: false, paste: null, picks: [], cables: {}, cableSel: null, sel: [] };
  const P = PARTS[part];
  const el = openScreen(`<div class="panel" style="width:min(1180px,96vw)"><div class="fit">
    <div style="position:relative" id="svgwrap"></div>
    <div>
      <h2 style="margin-bottom:6px">Fit the ${P.fit} <span class="sub" style="font-size:.55em">(${P.hu})</span></h2>
      <div class="partcard"><div class="ic" id="icon"></div><div id="desc"></div></div>
      <ol class="todo" id="todo"></ol>
      <div id="steps"></div>
      <div class="msgbox" id="msg"></div>
      <div class="btns"><button class="btn" id="manual">Read the manual</button><button class="btn" id="ground">Touch the metal case</button><button class="btn" id="cancel">Not now</button></div>
    </div></div></div>`);
  const $ = q => el.querySelector(q);
  const say = (html, cls = '') => { const m = $('#msg'); m.className = 'msgbox ' + cls; m.innerHTML = rich(html); };
  const descs = {
    cpu: 'Put the [[cpu]] in its place on the [[motherboard]]. It only goes in one way round.',
    cooler: 'The [[cooler]] needs [[paste]] first. How much?',
    ram: 'Two [[ram]] sticks. Which slots, and which way round?',
    ssd: 'The [[ssd]] is small and flat. Where does it go?',
    gpu: 'The [[gpu]] is long and heavy. Find its slot.',
    psu: 'The [[psu]] lives somewhere in the case. Which way should its fan face?',
    cables: 'Three [[cables]]. Pick a plug, then the socket it belongs to.',
  };

  $('#desc').innerHTML = rich(descs[part]);
  // what to do, step by step (ticked off as you go)
  const TODO = {
    cpu: [['Touch the metal case', () => st.grounded], ['Turn the chip (R) until its gold ▲ is in the same corner as the ▲ on the board', () => st.rot === 0], ['Click the place where it belongs (the outlined areas can be clicked)', () => false]],
    cooler: [['Touch the metal case', () => st.grounded], ['Choose how much thermal paste', () => st.paste === 'pea'], ['Click where the cooler goes: right on top of the CPU', () => false]],
    ram: [['Touch the metal case', () => st.grounded], ['Turn the sticks so the notch lines up with the slot', () => !st.flip], ['Click two slots: the manual says which pair', () => st.picks.length >= 2]],
    ssd: [['Touch the metal case', () => st.grounded], ['Click the small, flat slot it fits in', () => false]],
    gpu: [['Touch the metal case', () => st.grounded], ['Click the slot that is long enough for the card', () => false]],
    psu: [['Touch the metal case', () => st.grounded], ['Flip it so the fan faces the vent in the floor of the case', () => st.fanDown], ['Click the empty bay at the bottom', () => false]],
    cables: [['Touch the metal case', () => st.grounded], ['Pick a plug on the right', () => !!st.cableSel || Object.keys(st.cables).length > 0], ['Click the socket with the same shape (3 plugs in total)', () => Object.keys(st.cables).length >= 3]],
  }[part];
  st.hintIds = { cpu: ['socket'], cooler: ['socket'], ram: ['A2', 'B2'], ssd: ['m2'], gpu: ['x16'], psu: ['bay'] }[part] || [];
  st.miss = 0;
  // the part follows your mouse over the case, and each slot shows its name
  const ghost = document.createElement('div'); ghost.className = 'fitghost'; const tag = document.createElement('div'); tag.className = 'fittag';
  const render = () => {
    if (part === 'cables') st.hintIds = st.cableSel ? [st.cableSel] : [];
    $('#todo').innerHTML = TODO.map(([t, done], i) => { const d = done(); const first = !d && TODO.slice(0, i).every(x => x[1]()); return `<li class="${d ? 'done' : first ? 'now' : ''}">${d ? '✓ ' : ''}${t}</li>`; }).join('');
    $('#svgwrap').innerHTML = caseSVG(st, cb.fitted, part);
    $('#svgwrap').appendChild(ghost); $('#svgwrap').appendChild(tag); ghost.innerHTML = partIcon(part, st);
    $('#svgwrap').querySelectorAll('.hot').forEach(h => { h.addEventListener('mouseenter', () => { tag.textContent = NAMES[h.dataset.id]; tag.style.display = 'block'; }); h.addEventListener('mouseleave', () => { tag.style.display = 'none'; }); });
    $('#icon').innerHTML = partIcon(part, st);
    $('#svgwrap').querySelectorAll('.hot').forEach(h => h.addEventListener('click', ev => click(h.dataset.id, ev)));
    $('#ground').textContent = st.grounded ? 'Discharged ✓' : 'Touch the metal case';
    $('#ground').classList.toggle('primary', !st.grounded);
  };
  const steps = () => {
    let h = '';
    if (part === 'cpu') h = `<div class="choice"><button class="btn" id="rot">Rotate ↻ (R)</button></div>`;
    if (part === 'cooler') h = `<div class="sub" style="margin-top:8px">How much ${rich('[[paste]]')}?</div><div class="choice">${[['none', 'None'], ['pea', 'A pea-sized dot'], ['tube', 'The whole tube']].map(([k, l]) => `<button class="btn ${st.paste === k ? 'on' : ''}" data-paste="${k}">${l}</button>`).join('')}</div>`;
    if (part === 'ram') h = `<div class="choice"><button class="btn" id="flip">Turn the sticks around ⇄</button></div><div class="sub" style="font-size:.8em">Picked: ${st.picks.join(', ') || 'none yet'}</div>`;
    if (part === 'psu') h = `<div class="choice"><button class="btn" id="fan">Flip it: ${st.fanDown ? 'fan down' : 'fan up'} ⇅</button></div>`;
    if (part === 'cables') h = `<div class="choice">${[['atx24', '24-pin (motherboard)'], ['cpu8', '8-pin (CPU)'], ['gpu8', '8-pin PCIe (graphics card)']].map(([k, l]) => `<button class="btn ${st.cableSel === k ? 'on' : ''}" data-cable="${k}" ${st.cables[k] ? 'disabled' : ''}>${st.cables[k] ? '✓ ' : ''}${l}</button>`).join('')}</div>`;
    $('#steps').innerHTML = h;
    const b = (q, f) => { const x = $(q); if (x) x.onclick = () => { play('click', { vol: 0.35 }); f(); steps(); render(); }; };
    b('#rot', () => { st.rot = (st.rot + 1) % 4; });
    b('#flip', () => { st.flip = !st.flip; });
    b('#fan', () => { st.fanDown = !st.fanDown; });
    el.querySelectorAll('[data-paste]').forEach(x => x.onclick = () => { if (!guard(x)) return; st.paste = x.dataset.paste; play('plastic', { vol: 0.5 });
      if (st.paste === 'none') say('Without [[paste]], tiny air gaps trap the heat. Choose again.', 'bad');
      else if (st.paste === 'tube') { cb.mistake('mess', 'Way too much! The paste oozes over the edges and you drop the tube. Clean it up and use a pea-sized dot.'); spark(x, false); st.paste = null; }
      else say('Good: a pea-sized dot spreads out by itself under the cooler. Now place the cooler.', 'good');
      steps(); render(); });
    el.querySelectorAll('[data-cable]').forEach(x => x.onclick = () => { st.cableSel = x.dataset.cable; st.sel = []; play('click', { vol: 0.35 }); steps(); render(); say('Now click the socket for the ' + x.textContent.trim() + '.'); });
  };
  const guard = (srcEl) => {
    if (st.grounded) return true;
    const m = 'Zap! A spark of [[static]] jumped from your finger to the board. Touch the metal case first, every time.';
    cb.mistake('static', m); spark(srcEl, true, lastEv); say(m, 'bad'); st.grounded = true; render(); return false;
  };
  const spark = (srcEl, electric, ev) => {
    const wrap = $('#svgwrap'); const r = wrap.getBoundingClientRect();
    let x = r.width / 2, y = r.height / 2;
    if (ev) { x = ev.clientX - r.left; y = ev.clientY - r.top; }
    const s = document.createElement('div'); s.className = 'sparkfx'; s.style.left = x + 'px'; s.style.top = y + 'px';
    if (!electric) s.style.background = 'radial-gradient(circle,#ddd 0,#999 30%,transparent 60%)';
    wrap.appendChild(s); setTimeout(() => s.remove(), 500);
    el.querySelector('.panel').classList.remove('shake'); void el.offsetWidth; el.querySelector('.panel').classList.add('shake');
  };
  const success = () => {
    play('latch', { vol: 0.7 }); play('screw', { vol: 0.4 });
    cb.fitted.push(part); render();
    say('✓ ' + SUCCESS_LINES[part], 'good');
    $('#steps').innerHTML = '';
    const bt = el.querySelector('.btns'); bt.innerHTML = `<button class="btn primary" id="ok" autofocus>Continue</button>`;
    bt.querySelector('#ok').onclick = () => { play('uiclick', { vol: 0.4 }); close(); cb.done(part); };
    setTimeout(() => bt.querySelector('#ok') && bt.querySelector('#ok').focus(), 50);
    cb.fitted.pop(); // ep1 adds it for real in done()
    finished = true;
  };
  let finished = false; let lastEv = null;
  const bad = (msg, ev, electric = true) => {
    cb.mistake(electric ? 'spark' : 'clatter', msg); spark(null, electric, ev);
    st.miss++; if (st.miss >= 2) st.hint = true;
    say(msg + (st.hint && st.hintIds.length ? ' Hint: the yellow outline shows where it goes.' : ''), 'bad'); render();
  };
  const click = (id, ev) => {
    if (finished) return;
    lastEv = ev; if (!guard(null)) return;
    if (part === 'cpu') {
      if (id !== 'socket') return bad(`That is the ${NAMES[id]}. The [[cpu]] goes into the square [[socket]].`, ev);
      if (st.rot !== 0) return bad('It doesn\'t drop in: the gold triangle is in the wrong corner. Never push! Rotate it to match the socket.', ev, false);
      return success();
    }
    if (part === 'cooler') {
      if (st.paste !== 'pea') return say('Choose the amount of [[paste]] first.', 'bad');
      if (id !== 'socket') return bad('The [[cooler]] has to sit right on top of the CPU, or it cools nothing.', ev, false);
      return success();
    }
    if (part === 'ram') {
      if (!['A1', 'A2', 'B1', 'B2'].includes(id)) return bad(`That's the ${NAMES[id]}. RAM goes in the long slots next to the CPU.`, ev);
      if (!st.flip) { /* correct orientation is flip=false */ }
      if (st.flip) return bad('The notch on the stick doesn\'t line up with the key in the slot. Forcing it could crack the slot. Turn the sticks around.', ev, false);
      if (st.picks.includes(id)) return;
      st.picks.push(id); st.sel = st.picks.slice(); play('click', { vol: 0.5 }); steps(); render();
      if (st.picks.length === 2) {
        const ok = st.picks.includes('A2') && st.picks.includes('B2');
        if (ok) return success();
        say('That would work, but the motherboard manual says: for two sticks use A2 and B2. Then they run in [[dual]], which is faster. Try again.', 'bad');
        st.picks = []; st.sel = []; st.hint = true; steps(); render(); play('denied', { vol: 0.3 });
      } else say('One stick in. Where does the second one go?');
      return;
    }
    if (part === 'ssd') {
      if (id === 'm2') return success();
      return bad(`Not the ${NAMES[id]}. The [[ssd]] lies flat in the [[m2]].`, ev);
    }
    if (part === 'gpu') {
      if (id === 'x16') return success();
      if (id === 'x1') return bad('Clunk. The card is far too long for the short slot. It needs the [[pcie]].', ev, false);
      return bad(`That's the ${NAMES[id]}. The [[gpu]] needs the long slot.`, ev);
    }
    if (part === 'psu') {
      if (id !== 'bay') return bad('The [[psu]] doesn\'t go on the motherboard: it lives in the bay at the bottom.', ev, false);
      if (!st.fanDown) return bad('Fan up, against the hot motherboard? There\'s a vent in the case floor: turn it so the fan faces down and breathes fresh air.', ev, false);
      return success();
    }
    if (part === 'cables') {
      if (!st.cableSel) return say('First pick one of the three plugs on the right.', 'bad');
      if (id !== st.cableSel) { const was = st.cableSel; st.cableSel = null; steps(); return bad(`Wrong socket for that plug${was === 'atx24' ? ': the wide 24-pin plug only fits the long socket on the right edge' : ''}. Look at the shapes.`, ev); }
      st.cables[id] = true; st.cableSel = null; play('latch', { vol: 0.6 }); steps(); render();
      if (st.cables.atx24 && st.cables.cpu8 && st.cables.gpu8) return success();
      say('Click. That one is in. ' + (3 - Object.keys(st.cables).length) + ' to go.', 'good');
      return;
    }
  };
  $('#ground').onclick = () => { if (!st.grounded) { st.grounded = true; play('clang', { vol: 0.25, rate: 1.6 }); say('You touch the bare metal of the case. Any [[static]] on your body drains away safely.', 'good'); render(); } };
  $('#cancel').onclick = () => { close(); cb.close && cb.close(); };
  $('#manual').onclick = () => {
    play('paper', { vol: 0.6 });
    const m = openScreen(`<div class="panel" style="width:min(640px,94vw);background:#ece7da;color:#222;font-family:monospace;font-size:.82em">
      <b>NIMBUS B650 · QUICK INSTALLATION GUIDE</b><br><br>
      ⚠ Unplug the computer. Touch bare metal before handling parts.<br><br>
      1. CPU ........ match ▲ on chip to ▲ on socket. No force.<br>
      2. COOLER ..... thermal paste: one pea-sized dot. Mount on CPU.<br>
      3. MEMORY ..... 2 modules: DIMM_A2 + DIMM_B2. Align the notch.<br>
      4. M.2 SSD .... slot below the CPU socket.<br>
      5. GRAPHICS ... top PCIe x16 slot (long).<br>
      6. PSU ........ bottom bay. Fan faces the vent.<br>
      7. POWER ...... 24-pin ATX: right edge · 8-pin CPU: top left ·<br>
      &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;8-pin PCIe: graphics card.<br>
      <div class="btns"><button class="btn" id="mx" autofocus>Close the manual</button></div></div>`);
    m.querySelector('#mx').onclick = () => closeScreen(m);
  };
  const keyH = e => { if (e.code === 'KeyR' && part === 'cpu' && !finished) { st.rot = (st.rot + 1) % 4; play('click', { vol: 0.35 }); render(); } if (e.code === 'Escape' && !finished) { close(); cb.close && cb.close(); } };
  addEventListener('keydown', keyH);
  const close = () => { removeEventListener('keydown', keyH); closeScreen(el); };
  const wrapEl = $('#svgwrap');
  wrapEl.addEventListener('mousemove', e => { const r = wrapEl.getBoundingClientRect(); ghost.style.display = 'block'; ghost.style.left = (e.clientX - r.left + 14) + 'px'; ghost.style.top = (e.clientY - r.top + 14) + 'px'; tag.style.left = (e.clientX - r.left + 14) + 'px'; tag.style.top = (e.clientY - r.top - 30) + 'px'; });
  wrapEl.addEventListener('mouseleave', () => { ghost.style.display = 'none'; tag.style.display = 'none'; });
  steps(); render();
  say(part === 'cables' ? 'Last step.' : 'Every mistake makes noise. If you\'re not sure, read the manual.');
  return el;
}
