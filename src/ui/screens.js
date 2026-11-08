import { S, DEFAULT_SETTINGS, persist, listPlayers, lastPlayer, loadPlayer, exportCode, importCode, peekCode, epData, isDone } from '../core/state.js';
import { rich, CREDITS, CONTENT_NOTE, LOCKS_ON, EPISODES } from '../text.js';
import { play, setVolumes, resumeAudio } from '../core/audio.js';
import { setVoiceVolume, voStop, voDur, speak, voPreload } from '../core/voice.js';
import { setBrightness, setLines } from '../core/render.js';
import { pxCanvas } from '../core/world.js';
import { prompt } from '../core/hud.js';

const ov = () => document.getElementById('overlay');
export function openScreen(html, cls = '') {
  const el = document.createElement('div'); el.className = 'screen ' + cls; el.innerHTML = html; ov().appendChild(el);
  prompt(null); document.body.classList.add('has-screen-overlay', 'in-menu');
  el.querySelectorAll('.btn').forEach(b => b.addEventListener('click', () => play('uiclick', { vol: 0.4 })));
  const first = el.querySelector('[autofocus]'); if (first) setTimeout(() => first.focus({ preventScroll: true }), 30);
  return el;
}
export function closeScreen(el) {
  if (el && el.parentNode) el.parentNode.removeChild(el);
  if (!anyScreenOpen()) document.body.classList.remove('has-screen-overlay', 'in-menu');
}
// a painted picture shown full-screen for a moment (click to skip)
export function cutIn(src, cap = '', ms = 3200, cls = '') {
  return new Promise(res => {
    if (!src) { res(); return; }
    const el = openScreen(`<div class="cut8 ${cls}"><img src="${src}" alt="">${cap ? `<div class="cap">${cap}</div>` : ''}</div>`, 'solid');
    let done = false; const end = () => { if (done) return; done = true; el.querySelector('.cut8').classList.add('out'); setTimeout(() => { closeScreen(el); res(); }, 700); };
    el.addEventListener('click', end); setTimeout(end, ms);
  });
}
// a screen counts only if it is actually visible (some scenes keep hidden panels in the overlay)
export function anyScreenOpen() {
  for (const c of ov().children) { if (c.nodeType !== 1) continue; const s = getComputedStyle(c); if (s.display !== 'none' && s.visibility !== 'hidden' && (c.offsetWidth > 0 || c.offsetHeight > 0 || c.children.length > 0)) return true; }
  return false;
}
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function applySettings() {
  setBrightness(S.settings.brightness, S.settings.projector);
  setLines(S.settings.sharp ? 405 : 270);
  setVolumes(S.settings.master, S.settings.music); setVoiceVolume(S.settings.voiceVol ?? 1); if (S.settings.voice === false) voStop();
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
            <div class="logo"><div id="logoc"></div><small>Dark Screen · a digital culture horror anthology · v1.4</small></div>
            <p class="sub" style="margin-top:22px">Nine short stories. Each one starts at an old computer in an empty school lab, at night.</p>
            <div class="note">${esc(CONTENT_NOTE)}</div>
          </div>
          <div>
            <h3>Your nickname</h3>
            <div class="row2"><input type="text" id="nick" maxlength="20" placeholder="e.g. Panna_7B" value="${esc(last || '')}" ${window.SK_TOUCH && window.SK_TOUCH.active ? '' : 'autofocus'}><button class="btn primary" id="go">Start</button></div>
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
    // opened from a save file: offer to load it straight away
    const hm = (location.hash || '').match(/^#load=(SK1-[A-Za-z0-9_-]+-[A-Z0-9]+)/);
    if (hm) {
      try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { }
      let info = null; try { info = peekCode(hm[1]); } catch (e) { }
      if (info) {
        const d = t => t ? new Date(t).toLocaleString() : 'unknown';
        const newer = info.localUpdated > info.updated + 60000;
        const p = openScreen(`<div class="panel" style="width:min(560px,94vw);text-align:center"><h2>Welcome back, ${esc(info.nick)}</h2>
          <p>Your save file is from <b>${d(info.updated)}</b>.</p>
          ${newer ? `<p class="err">This computer already has a newer save for ${esc(info.nick)} (${d(info.localUpdated)}). Loading the file replaces it.</p>` : ''}
          <div class="btns" style="justify-content:center"><button class="btn primary" id="ld" autofocus>Load my save and play</button><button class="btn" id="no">Not now</button></div></div>`);
        p.querySelector('#no').onclick = () => closeScreen(p);
        p.querySelector('#ld').onclick = () => { try { const n = importCode(hm[1]); resumeAudio(); applySettings(); closeScreen(p); closeScreen(el); resolve(n); } catch (e) { closeScreen(p); } };
      }
    }
  });
}

/** Download the save as a small web page: double-clicking it opens the game with this save (and shows the code too). */
export function saveToFile() {
  const code = exportCode(), nick = S.nick || 'player', when = new Date().toLocaleString();
  const game = location.href.split('#')[0];
  const page = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Sötét Képernyő: ${esc(nick)}'s save</title>
<meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="background:#0b0a10;color:#e8e2d6;font-family:system-ui,sans-serif;max-width:720px;margin:40px auto;padding:0 20px;line-height:1.5">
<h1 style="font-weight:600">Opening Sötét Képernyő…</h1>
<p>This is <b>${esc(nick)}</b>'s save from ${esc(when)}. The game should open by itself in a moment.</p>
<p><a id="go" style="color:#8fe3c9" href="#">Open the game with this save</a></p>
<p style="color:#a49fb4">If it does not open (for example on a different computer): start the game, choose <b>Load a save code</b> on the title screen and paste this code (mentési kód):</p>
<textarea readonly style="width:100%;height:120px;background:#16141f;color:#e8e2d6;border:1px solid #3a3550;border-radius:8px;padding:8px" onclick="this.select()">${code}</textarea>
<script>
var code=${JSON.stringify(code)}, game=${JSON.stringify(game)};
document.getElementById('go').href = game + '#load=' + code;
setTimeout(function(){ location.href = game + '#load=' + code; }, 900);
</script></body></html>`;
  const blob = new Blob([page], { type: 'text/html' }), a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = nick.replace(/[^\w\u00C0-\u017F-]+/g, '_') + '_Sotet_Kepernyo_save.html';
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
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
    <div class="btns"><button class="btn primary" id="cp">Copy</button><button class="btn" id="sf">Save to a file</button><button class="btn" id="x">Close</button></div><div class="sub" id="m"></div>
    <p class="sub" style="font-size:.85em">A save file opens the game with your save when you double-click it.</p></div>`);
  el.querySelector('#x').onclick = () => closeScreen(el);
  el.querySelector('#sf').onclick = () => { saveToFile(); el.querySelector('#m').textContent = 'Saved to your Downloads folder.'; };
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
    ${tg('voice', 'Voice acting (szinkron)', 'The narrator and the characters read their lines aloud. Off: the old mumbling sounds, and you read everything yourself.')}
    ${sl('voiceVol', 'Voice volume', '', 0, 1.5, 0.05)}
    ${sl('mouse', 'Mouse speed', '', 0.3, 2.5, 0.05)}
    ${tg('subs', 'Sound subtitles', 'Shows what you hear, like [footsteps in the hallway].')}
    ${tg('sharp', 'Sharper picture', 'Draws the game at a higher resolution. Still pixelated, just finer. Turn off on slow computers.')}
    ${tg('post', 'Camera effects', 'Lépcsőház only: a little motion blur when you turn, the background softens when something is close, darker corners. Turn off on slow computers.')}
    ${sl('dof', 'Depth of field', 'How much the background softens when something is close in front of you. 0 turns it off.', 0, 2, 0.1)}
    ${sl('blur', 'Motion blur', 'How much the picture smears while you turn. 0 turns it off.', 0, 2, 0.1)}
    ${tg('grain', 'Film grain', 'A very faint grain on top of the camera effects.')}
    ${tg('bigText', 'Large text', '')}
    ${tg('bob', 'Head bobbing', 'Turn off if walking makes you feel dizzy.')}
    <div class="btns"><button class="btn" id="cal">Setup again</button><button class="btn primary" id="x">Done</button></div></div>`);
  el.querySelectorAll('.toggle').forEach(t => {
    const flip = () => { const k = t.dataset.k; st[k] = !st[k]; t.classList.toggle('on', st[k]); t.setAttribute('aria-checked', st[k]); applySettings(); play('click', { vol: 0.4 }); };
    t.onclick = flip; t.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flip(); } };
  });
  el.querySelectorAll('input[type=range]').forEach(r => r.oninput = () => { st[r.dataset.k] = parseFloat(r.value); applySettings(); });
  el.querySelector('#cal').onclick = () => calibrationScreen();
  el.querySelector('#x').onclick = () => { if (S.save) persist(); closeScreen(el); onClose && onClose(); };
  return el;
}

// v1.4: the first-start setup, in up to four short steps (it began as a brightness check; the app version
// grew it into a wizard for phones). Orientation and the gyroscope only show on touch devices.
export function calibrationScreen() {
  return new Promise(res => {
    const st = S.settings, touch = !!(window.SK_TOUCH && window.SK_TOUCH.active), gyro = touch && window.SK_GYRO;
    const steps = ['bright', ...(touch ? ['view'] : []), 'text', 'voice'];
    let i = 0, el = null;
    const tg = (k, label, d, on = !!st[k]) => `<div class="setting" style="text-align:left"><div>${label}<div class="d">${d}</div></div><div><div class="toggle ${on ? 'on' : ''}" data-k="${k}" role="switch" tabindex="0" aria-checked="${on}"></div></div></div>`;
    const head = (t, hu) => `<div style="display:flex;justify-content:space-between;align-items:baseline;gap:10px;border-bottom:1px solid var(--line);padding-bottom:8px;margin-bottom:12px"><h2 style="margin:0">${steps.length > 1 ? `${i + 1} / ${steps.length}: ` : ''}${t}</h2><span class="sub" style="font-size:.85em">${hu}</span></div>`;
    const body = {
      bright: () => head('Brightness', 'fényerő') + `<p>Move the slider until the <b>middle</b> eye is <b>just barely</b> visible. The left one should stay invisible.</p>
        <div class="calib"><div style="color:#030303">◉</div><div style="color:#121212">◉</div><div style="color:#2a2a2a">◉</div></div>
        <input type="range" id="b" min="0.7" max="1.9" step="0.05" value="${st.brightness}">
        ${tg('projector', 'Projector mode', 'Extra brightness and contrast for washed-out classroom projectors.')}`,
      view: () => head('Screen', 'tájolás és kép') + `<p style="text-align:left">Hold the phone the way you like. Auto turns with it.</p>
        <div class="btns" style="justify-content:center;flex-wrap:wrap">${[['auto', 'Auto'], ['landscape', 'Landscape (fekvő)'], ['portrait', 'Portrait (álló)']].map(([m, l]) => `<button class="btn ${(st.orientationMode || 'auto') === m ? 'primary' : ''}" data-o="${m}">${l}</button>`).join('')}</div>
        ${tg('sharp', 'Sharper picture', 'Draws the game at a higher resolution. Turn off if the phone gets hot or slow.')}
        ${tg('grain', 'Film grain', 'A very faint grain on top of the picture.')}`,
      text: () => head('Text', 'szöveg') + `${tg('bigText', 'Large text', 'Bigger captions, notes and messages.')}
        <div id="pv" style="background:#09090f;border:1px dashed var(--line);border-radius:8px;padding:12px;margin:8px 0 12px">
          <div style="color:#ffe7a8;font-style:italic">[footsteps in the hallway]</div><div>Mrs Kovács from the third floor, in her dressing gown, with a torch.</div></div>
        ${tg('subs', 'Sound subtitles', 'Shows what you hear, like [footsteps in the hallway].')}
        ${tg('quiet', 'Quiet mode (csendes mód)', 'Removes the jump scares. The story stays the same.')}`,
      voice: () => head('Voices' + (gyro ? ' and motion' : ''), gyro ? 'szinkron és giroszkóp' : 'szinkron') +
        `${tg('voice', 'Voice acting (szinkron)', 'The narrator and the characters read their lines aloud. Off: the old mumbling sounds.', st.voice !== false)}
        <div class="btns" style="justify-content:flex-start;margin:4px 0 10px"><button class="btn small" id="tv">Play a line</button></div>
        ${gyro ? tg('gyro', 'Look around by tilting the phone', 'Uses the gyroscope in the 3D episodes. You can still drag to look.', !!window.SK_GYRO.enabled) + '<div id="gs" class="sub" style="font-size:.8em;text-align:left"></div>' : ''}`,
    };
    const finish = () => { st.calibrated = true; if (S.save) persist(); applySettings(); if (el) closeScreen(el); res(); };
    const draw = () => {
      if (el) closeScreen(el);
      const last = i === steps.length - 1;
      el = openScreen(`<div class="panel" style="width:min(720px,94vw);text-align:center">${body[steps[i]]()}
        <div class="btns" style="justify-content:space-between;margin-top:18px">${i ? '<button class="btn" id="bk">Back</button>' : (steps.length > 1 ? '<button class="btn" id="sk">Skip</button>' : '<span></span>')}
        <button class="btn primary" id="nx">${last ? 'Start' : 'Next'}</button></div></div>`);
      const calib = el.querySelector('.calib');
      const ap = () => { if (calib) calib.style.filter = `brightness(${st.brightness * (st.projector ? 1.25 : 1)})`; const pv = el.querySelector('#pv'); if (pv) pv.style.fontSize = st.bigText ? '27px' : '22px'; };
      ap();
      const b = el.querySelector('#b'); if (b) b.oninput = e => { st.brightness = parseFloat(e.target.value); applySettings(); ap(); };
      el.querySelectorAll('.toggle').forEach(t => t.onclick = async () => {
        const k = t.dataset.k;
        if (k === 'gyro') {
          const G = window.SK_GYRO, on = !G.enabled, gs = el.querySelector('#gs');
          if (on && G.needsExplicitPermission && G.needsExplicitPermission()) { const ok = await G.requestPermission(); if (!ok) { gs.textContent = 'The phone did not allow motion sensors. You can try again in Settings.'; return; } }
          G.setEnabled(on); t.classList.toggle('on', on); gs.textContent = on ? 'Tilt the phone a little: the view follows.' : ''; return;
        }
        st[k] = k === 'voice' ? st.voice === false : !st[k]; t.classList.toggle('on', k === 'voice' ? st.voice !== false : st[k]); applySettings(); ap(); play('click', { vol: 0.4 });
      });
      el.querySelectorAll('[data-o]').forEach(bt => bt.onclick = () => {
        st.orientationMode = bt.dataset.o; el.querySelectorAll('[data-o]').forEach(x => x.classList.toggle('primary', x === bt));
        if (window.SK_TOUCH && window.SK_TOUCH.setOrientationMode) window.SK_TOUCH.setOrientationMode(bt.dataset.o);
      });
      const tv = el.querySelector('#tv'); if (tv) tv.onclick = () => { resumeAudio(); if (!speak('Outside. Warm air, birds, the blocks far away in the sunset. Somewhere, a computer is playing a song.', { force: true })) play('beep', { vol: 0.4 }); };
      el.querySelector('#nx').onclick = () => { if (i === steps.length - 1) finish(); else { i++; draw(); } };
      const bk = el.querySelector('#bk'); if (bk) bk.onclick = () => { i--; draw(); };
      const sk = el.querySelector('#sk'); if (sk) sk.onclick = finish;
    };
    draw();
  });
}

export function creditsScreen() {
  const el = openScreen(`<div class="panel" style="width:min(860px,94vw)"><h2>Credits</h2>
    ${CREDITS.map(([h, t]) => `<h3>${esc(h)}</h3><p>${esc(t)}</p>`).join('')}
    <div class="btns"><button class="btn primary" id="x" autofocus>Close</button></div></div>`);
  el.querySelector('#x').onclick = () => closeScreen(el);
}

// ---------- Pause ----------
/** v1.4: how far this player is: stories finished and Lépcsőház descents (pause menu, teacher's computer, Lépcsőház results). */
export function progressBox() {
  const done = EPISODES.filter(e => isDone(e.id)).length, total = EPISODES.length, pct = Math.round(done / total * 100);
  const desc = (S.save && S.save.rogue && S.save.rogue.record && S.save.rogue.record.descents) || 0;
  return `<div style="margin:8px 0 14px;background:#151320;border:1px solid #2e2a3a;border-radius:12px;padding:10px 14px;text-align:left">
    <div style="display:flex;justify-content:space-between;font-size:.9em;margin-bottom:6px"><span style="color:#cbbfa8">Player: <b>${esc(S.nick || '')}</b></span><span style="color:#8fe3c9;font-weight:bold">${pct}%</span></div>
    <div style="height:8px;background:#252033;border-radius:4px;overflow:hidden"><div style="height:100%;width:${pct}%;background:linear-gradient(90deg,#8fe3c9,#ffd23a)"></div></div>
    <div class="sub" style="font-size:.78em;margin-top:5px;display:flex;justify-content:space-between"><span>${done}/${total} stories finished</span><span>${desc} times down the stairs</span></div>
    ${done === total ? '<div style="margin-top:8px;padding:6px 10px;background:#2a2010;border:1px solid #ffd23a;border-radius:8px;color:#ffe27a;font-weight:bold;font-size:.85em;text-align:center">KIBER-MESTER: every story finished</div>' : ''}</div>`;
}

export function pauseScreen({ onResume, onQuit, quitLabel }) {
  const el = openScreen(`<div class="panel" style="width:min(520px,94vw);text-align:center"><h2>Paused</h2>
    <p class="sub">Your progress is saved.</p>${progressBox()}
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
      ${code ? `<div class="savebox"><h3 style="margin:0 0 4px">Your save code (mentési kód)</h3><p class="sub" style="margin:0 0 6px">${LOCKS_ON ? 'Copy it into your reflection sheet. Your teacher uses it to see that you finished.' : 'Keep it to carry your progress to another computer or browser (title screen, Load a save code).'}</p><textarea readonly>${esc(code)}</textarea><div class="btns" style="margin-top:6px"><button class="btn" id="cp">Copy the code</button><button class="btn" id="sf">Save to a file</button><span class="sub copied"></span></div></div>` : ''}
      <p class="sub" style="font-size:.78em">Tip: hover over the <span class="term" tabindex="0" data-tip="Like this one! Underlined words have a short explanation.">dotted words</span> to see what they mean.</p>
      <div class="btns">${nextLabel ? `<button class="btn primary" id="nx">${esc(nextLabel)}</button>` : ''}<button class="btn ${nextLabel ? '' : 'primary'}" id="x" autofocus>Back to the lab</button></div></div>`, 'solid');
    el.querySelector('#x').onclick = () => { closeScreen(el); res('lab'); };
    const cp = el.querySelector('#cp'); if (cp) cp.onclick = () => copyText(el, code);
    const sf = el.querySelector('#sf'); if (sf) sf.onclick = () => { saveToFile(); const c = el.querySelector('.copied'); if (c) c.textContent = 'Saved to your Downloads folder.'; };
    const nx = el.querySelector('#nx'); if (nx) nx.onclick = () => { closeScreen(el); res('next'); };
  });
}
