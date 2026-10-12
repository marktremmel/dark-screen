import { S, DEFAULT_SETTINGS, persist, listPlayers, lastPlayer, loadPlayer, exportCode, importCode, epData } from '../core/state.js';
import { rich, CREDITS, CONTENT_NOTE, LOCKS_ON } from '../text.js';
import { play, setVolumes, resumeAudio } from '../core/audio.js';
import { setBrightness } from '../core/render.js';
import { pxCanvas } from '../core/world.js';

const ov = () => document.getElementById('overlay');
export function openScreen(html, cls = '') {
  const el = document.createElement('div'); el.className = 'screen ' + cls; el.innerHTML = html; ov().appendChild(el);
  el.querySelectorAll('.btn').forEach(b => b.addEventListener('click', () => play('uiclick', { vol: 0.4 })));
  const first = el.querySelector('[autofocus]'); if (first) setTimeout(() => first.focus({ preventScroll: true }), 30);
  return el;
}
export function closeScreen(el) { if (el && el.parentNode) el.parentNode.removeChild(el); }
// a painted picture shown full-screen for a moment (click to skip)
export function cutIn(src, cap = '', ms = 3200, cls = '') {
  return new Promise(res => {
    if (!src) { res(); return; }
    const el = openScreen(`<div class="cut8 ${cls}"><img src="${src}" alt="">${cap ? `<div class="cap">${cap}</div>` : ''}</div>`, 'solid');
    let done = false; const end = () => { if (done) return; done = true; el.querySelector('.cut8').classList.add('out'); setTimeout(() => { closeScreen(el); res(); }, 700); };
    el.addEventListener('click', end); setTimeout(end, ms);
  });
}
export function anyScreenOpen() { return ov().children.length > 0; }
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function applySettings() {
  setBrightness(S.settings.brightness, S.settings.projector);
  setVolumes(S.settings.master, S.settings.music);
  document.body.classList.toggle('bigtext', !!S.settings.bigText);
}

// ---------- Title / player select ----------
export function titleScreen() {
  return new Promise(resolve => {
    const players = listPlayers(); const last = lastPlayer();
    const el = openScreen(`
      <div class="panel" style="width:min(1060px,94vw)">
        <div class="title-wrap">
          <div>
            <div class="logo"><div id="logoc"></div><small>Dark Screen · a digital culture horror anthology · v1.2</small></div>
            <p class="sub" style="margin-top:22px">Nine short stories. Each one starts at an old computer in an empty school lab, at night.</p>
            <div class="note">${esc(CONTENT_NOTE)}</div>
          </div>
          <div>
            <h3>Your nickname</h3>
            <div class="row2"><input type="text" id="nick" maxlength="20" placeholder="e.g. Panna_7B" value="${esc(last || '')}" autofocus><button class="btn primary" id="go">Start</button></div>
            <div class="err" id="err"></div>
            ${players.length ? `<div class="sub" style="font-size:.8em">Saved players on this computer:</div><div class="players">${players.map(p => `<button class="btn small pl" data-n="${esc(p)}">${esc(p)}</button>`).join('')}</div>` : ''}
            <div class="btns">
              <button class="btn" id="code">Load a save code</button>
              <button class="btn" id="set">Settings</button>
              <button class="btn" id="cred">Credits</button>
            </div>
            <p class="sub" style="font-size:.75em;margin-top:18px">Controls: mouse to look · W A S D to move · Shift to run · E to use · F for the flashlight · Esc to pause</p>
          </div>
        </div>
      </div>`, 'titlebg');
    const lc = pxCanvas(['SÖTÉT', 'KÉPERNYŐ'], 6); lc.style.maxWidth = '100%'; lc.style.height = 'auto'; el.querySelector('#logoc').appendChild(lc);
    const go = n => {
      n = (n || '').trim();
      if (!n) { el.querySelector('#err').textContent = 'Type a nickname first (no real full names needed).'; return; }
      resumeAudio(); loadPlayer(n); applySettings(); closeScreen(el); resolve(n);
    };
    el.querySelector('#go').onclick = () => go(el.querySelector('#nick').value);
    el.querySelector('#nick').addEventListener('keydown', e => { if (e.key === 'Enter') go(e.target.value); });
    el.querySelectorAll('.pl').forEach(b => b.onclick = () => go(b.dataset.n));
    el.querySelector('#set').onclick = () => { resumeAudio(); settingsScreen(); };
    el.querySelector('#cred').onclick = () => creditsScreen();
    el.querySelector('#code').onclick = () => importScreen(n => { closeScreen(el); resolve(n); });
  });
}

export function importScreen(done) {
  const el = openScreen(`<div class="panel" style="width:min(640px,94vw)"><h2>Load a save code</h2>
    <p class="sub">Paste the code you saved earlier (it starts with SK1-). This works on any computer.</p>
    <textarea id="c" placeholder="SK1-..."></textarea><div class="err" id="e"></div>
    <div class="btns"><button class="btn primary" id="ok">Load</button><button class="btn" id="x">Cancel</button></div></div>`);
  el.querySelector('#x').onclick = () => closeScreen(el);
  el.querySelector('#ok').onclick = () => {
    try { const n = importCode(el.querySelector('#c').value); resumeAudio(); applySettings(); closeScreen(el); done(n); }
    catch (e) { el.querySelector('#e').textContent = e.message; play('denied', { vol: 0.4 }); }
  };
}
export function exportScreen() {
  const code = exportCode();
  const el = openScreen(`<div class="panel" style="width:min(640px,94vw)"><h2>Your save code</h2>
    <p class="sub">Progress is saved automatically on this computer. To continue on another computer, copy this code (for example into your notes) and load it there.</p>
    <textarea id="c" readonly>${esc(code)}</textarea>
    <div class="btns"><button class="btn primary" id="cp">Copy</button><button class="btn" id="x">Close</button></div><div class="sub" id="m"></div></div>`);
  el.querySelector('#x').onclick = () => closeScreen(el);
  el.querySelector('#cp').onclick = () => { const t = el.querySelector('#c'); t.select(); try { navigator.clipboard.writeText(code).then(() => el.querySelector('#m').textContent = 'Copied.').catch(() => { document.execCommand('copy'); el.querySelector('#m').textContent = 'Copied.'; }); } catch (e) { document.execCommand('copy'); el.querySelector('#m').textContent = 'Copied.'; } };
  return el;
}

// ---------- Settings ----------
export function settingsScreen(onClose) {
  const st = S.settings;
  const tg = (k, label, d) => `<div class="setting"><div>${label}<div class="d">${d}</div></div><div><div class="toggle ${st[k] ? 'on' : ''}" data-k="${k}" role="switch" tabindex="0" aria-checked="${!!st[k]}"></div></div></div>`;
  const sl = (k, label, d, min, max, step) => `<div class="setting"><div>${label}<div class="d">${d}</div></div><div><input type="range" data-k="${k}" min="${min}" max="${max}" step="${step}" value="${st[k]}"></div></div>`;
  const el = openScreen(`<div class="panel" style="width:min(760px,94vw)"><h2>Settings</h2>
    ${tg('quiet', 'Quiet mode (csendes mód)', 'Removes the jump scares. The story stays the same.')}
    ${sl('brightness', 'Brightness', 'Turn it up if the picture looks too dark on the projector.', 0.7, 1.9, 0.05)}
    ${tg('projector', 'Projector mode', 'Extra brightness and contrast for washed-out classroom projectors.')}
    ${sl('master', 'Volume', 'All sounds.', 0, 1, 0.05)}
    ${sl('music', 'Music volume', '', 0, 1, 0.05)}
    ${sl('mouse', 'Mouse speed', '', 0.3, 2.5, 0.05)}
    ${tg('subs', 'Sound subtitles', 'Shows what you hear, like [footsteps in the hallway].')}
    ${tg('bigText', 'Large text', '')}
    ${tg('bob', 'Head bobbing', 'Turn off if walking makes you feel dizzy.')}
    <div class="btns"><button class="btn" id="cal">Calibrate brightness</button><button class="btn primary" id="x">Done</button></div></div>`);
  el.querySelectorAll('.toggle').forEach(t => {
    const flip = () => { const k = t.dataset.k; st[k] = !st[k]; t.classList.toggle('on', st[k]); t.setAttribute('aria-checked', st[k]); applySettings(); play('click', { vol: 0.4 }); };
    t.onclick = flip; t.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flip(); } };
  });
  el.querySelectorAll('input[type=range]').forEach(r => r.oninput = () => { st[r.dataset.k] = parseFloat(r.value); applySettings(); });
  el.querySelector('#cal').onclick = () => calibrationScreen();
  el.querySelector('#x').onclick = () => { if (S.save) persist(); closeScreen(el); onClose && onClose(); };
  return el;
}

export function calibrationScreen() {
  return new Promise(res => {
    const el = openScreen(`<div class="panel" style="width:min(720px,94vw);text-align:center"><h2>Brightness check</h2>
      <p>Move the slider until the <b>middle</b> eye is <b>just barely</b> visible. The left one should stay invisible.</p>
      <div class="calib"><div style="color:#030303">◉</div><div style="color:#121212">◉</div><div style="color:#2a2a2a">◉</div></div>
      <input type="range" id="b" min="0.7" max="1.9" step="0.05" value="${S.settings.brightness}">
      <p class="sub" style="font-size:.8em">This screen uses the same brightness as the game. You can change it later in Settings.</p>
      <div class="btns" style="justify-content:center"><button class="btn primary" id="ok">That looks right</button></div></div>`);
    const calib = el.querySelector('.calib');
    const ap = () => { const v = S.settings.brightness * (S.settings.projector ? 1.25 : 1); calib.style.filter = `brightness(${v})`; };
    ap();
    el.querySelector('#b').oninput = e => { S.settings.brightness = parseFloat(e.target.value); applySettings(); ap(); };
    el.querySelector('#ok').onclick = () => { S.settings.calibrated = true; if (S.save) persist(); closeScreen(el); res(); };
  });
}

export function creditsScreen() {
  const el = openScreen(`<div class="panel" style="width:min(860px,94vw)"><h2>Credits</h2>
    ${CREDITS.map(([h, t]) => `<h3>${esc(h)}</h3><p>${esc(t)}</p>`).join('')}
    <div class="btns"><button class="btn primary" id="x" autofocus>Close</button></div></div>`);
  el.querySelector('#x').onclick = () => closeScreen(el);
}

// ---------- Pause ----------
export function pauseScreen({ onResume, onQuit, quitLabel }) {
  const el = openScreen(`<div class="panel" style="width:min(520px,94vw);text-align:center"><h2>Paused</h2>
    <p class="sub">Your progress is saved.</p>
    <div class="btns" style="flex-direction:column;align-items:stretch">
      <button class="btn primary" id="r" autofocus>Continue</button>
      <button class="btn" id="s">Settings</button>
      <button class="btn" id="c">Save code</button>
      <button class="btn" id="q">${esc(quitLabel || 'Back to the lab')}</button>
    </div></div>`);
  el.querySelector('#r').onclick = () => { closeScreen(el); onResume(); };
  el.querySelector('#s').onclick = () => settingsScreen();
  el.querySelector('#c').onclick = () => exportScreen();
  el.querySelector('#q').onclick = () => { closeScreen(el); onQuit(); };
  return el;
}

// ---------- Debrief ----------
function copyText(el, code) {
  const t = el.querySelector('textarea'); t.select();
  const ok = () => { const m = el.querySelector('.copied'); if (m) m.textContent = 'Copied.'; };
  try { navigator.clipboard.writeText(code).then(ok).catch(() => { document.execCommand('copy'); ok(); }); } catch (e) { document.execCommand('copy'); ok(); }
}
export function debriefScreen(d, stats, nextLabel) {
  let code = '';
  if (d.id && S.save) { const e = epData(d.id); if (stats) e.stats = stats; e.at = Date.now(); persist(); try { code = exportCode(); } catch (e) { code = ''; } }
  return new Promise(res => {
    const el = openScreen(`<div class="panel debrief" style="width:min(980px,94vw)">
      <h2>${rich(d.title)}</h2><p>${rich(d.body)}</p>
      <h3>${rich(d.todoTitle)}</h3><ol>${d.todo.map(t => `<li>${rich(t)}</li>`).join('')}</ol>
      <div class="help"><h3 style="margin-top:0">${rich(d.helpTitle)}</h3><p>${rich(d.help)}</p></div>
      ${stats ? `<div style="margin-top:12px">${stats.map(s => `<span class="stat">${esc(s)}</span>`).join('')}</div>` : ''}
      <p class="sub" style="margin-top:14px">${rich(d.teaser)}</p>
      ${code ? `<div class="savebox"><h3 style="margin:0 0 4px">Your save code (mentési kód)</h3><p class="sub" style="margin:0 0 6px">${LOCKS_ON ? 'Copy it into your reflection sheet. Your teacher uses it to see that you finished.' : 'Keep it to carry your progress to another computer or browser (title screen, Load a save code).'}</p><textarea readonly>${esc(code)}</textarea><div class="btns" style="margin-top:6px"><button class="btn" id="cp">Copy the code</button><span class="sub copied"></span></div></div>` : ''}
      <p class="sub" style="font-size:.78em">Tip: hover over the <span class="term" tabindex="0" data-tip="Like this one! Underlined words have a short explanation.">dotted words</span> to see what they mean.</p>
      <div class="btns">${nextLabel ? `<button class="btn primary" id="nx">${esc(nextLabel)}</button>` : ''}<button class="btn ${nextLabel ? '' : 'primary'}" id="x" autofocus>Back to the lab</button></div></div>`, 'solid');
    el.querySelector('#x').onclick = () => { closeScreen(el); res('lab'); };
    const cp = el.querySelector('#cp'); if (cp) cp.onclick = () => copyText(el, code);
    const nx = el.querySelector('#nx'); if (nx) nx.onclick = () => { closeScreen(el); res('next'); };
  });
}
