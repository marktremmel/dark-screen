// Mission screens: the found phone (inbox triage), the exit intercom (typed answer), the mission debrief.
import { openScreen, closeScreen } from '../../ui/screens.js';
import { play } from '../../core/audio.js';
import { rushed } from '../logic/reading.js';
import { scoreAnswer } from '../logic/answer.js';
import { THEMES } from '../content/themes.js';

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/**
 * The phone you found. Each message: Trust or Report as a scam. Answers are timed (anti-rush).
 * onAnswer(msg, {right, rushed}) is called for each answer, while the panel stays open, so the world can react.
 * Resolves when the phone is put away; state.done holds the ids already answered (kept between openings).
 */
export function phonePanel(msgs, state, expose, onAnswer) {
  return new Promise(res => {
    const el = openScreen(`<div class="phone"><div class="bar"><span>23:47</span><span>▮▮▯ 12%</span></div>
      <div class="appbar">Mail (levelek) · not your phone</div><div class="msgs" id="pm"></div>
      <div class="foot"><button class="btn small" id="px">Put the phone away (Esc)</button></div></div>`);
    const box = el.querySelector('#pm');
    const close = () => { removeEventListener('keydown', key, true); closeScreen(el); res(); };
    const key = e => { if (e.code === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); close(); } };
    setTimeout(() => addEventListener('keydown', key, true), 150);
    el.querySelector('#px').onclick = close; expose(close);
    const list = () => {
      const left = msgs.filter(m => !state.done[m.id]).length;
      box.innerHTML = `<div class="msg sys">${left ? `${left} message${left > 1 ? 's' : ''} to sort. Trust it, or report it as a scam (csalás).` : 'All sorted. The fire exit is at the far end of the gym.'}</div>` +
        msgs.map(m => `<button class="btn" data-id="${m.id}" style="text-align:left;${state.done[m.id] ? 'opacity:.55' : ''}"><b>${esc(m.from)}</b>${state.done[m.id] ? ` · ${state.done[m.id] === 'right' ? '✓' : '✗'}` : ''}<br><span class="sub">${esc(m.subject)}</span></button>`).join('');
      box.querySelectorAll('[data-id]').forEach(b => b.onclick = () => open(msgs.find(m => m.id === b.dataset.id)));
    };
    const open = m => {
      const shown = performance.now(), text = m.subject + ' ' + m.body;
      box.innerHTML = `<div class="msg" style="max-width:100%"><span class="who">${esc(m.from)} &lt;${esc(m.addr)}&gt;</span><b>${esc(m.subject)}</b><br><br>${esc(m.body)}</div>
        <div id="fb"></div>
        <div class="btns" id="ab" style="justify-content:center">${state.done[m.id] ? '' : '<button class="btn" id="tr">Trust it</button><button class="btn" id="sc">Report as a scam</button>'}<button class="btn small" id="bk">Back</button></div>`;
      box.querySelector('#bk').onclick = list;
      const answer = sayScam => {
        const right = sayScam === m.scam, r = rushed(text, performance.now() - shown);
        state.done[m.id] = right ? 'right' : 'wrong';
        onAnswer(m, { right, rushed: r });
        box.querySelector('#ab').innerHTML = '<button class="btn primary" id="bk2">Back to the inbox</button>';
        box.querySelector('#bk2').onclick = list;
        box.querySelector('#fb').innerHTML = `<div class="msg sys" style="max-width:100%;text-align:left">${r ? '<b>Too fast.</b> You answered before you could have read it. Somewhere in the dark, something heard you.<br><br>' : ''}${right ? '<b>Right.</b> ' : '<b>Not quite.</b> '}${m.scam ? 'This was a scam. ' : 'This one was real. '}${esc(m.why)}</div>`;
      };
      const tr = box.querySelector('#tr'), sc = box.querySelector('#sc');
      if (tr) { tr.onclick = () => answer(false); sc.onclick = () => answer(true); }
    };
    list();
  });
}

/** The intercom at the fire exit. Resolves with {score, hits} or null if closed. */
export function gatePanel(gate) {
  return new Promise(res => {
    const el = openScreen(`<div class="panel" style="width:min(560px,94vw)"><h2>The intercom (kaputelefon)</h2>
      <p>A crackle, then a calm voice: <i>"${esc(gate.question)}"</i></p>
      <p class="sub">Type it in your own words. English or Hungarian, or both.</p>
      <textarea id="ans" rows="4" style="width:100%;box-sizing:border-box;font-size:1em;padding:8px;border-radius:8px;background:#0e0d14;color:#eee;border:1px solid #514b62" spellcheck="false"></textarea>
      <div class="btns"><button class="btn primary" id="ok">Say it</button><button class="btn" id="x">Not yet</button></div></div>`);
    const ta = el.querySelector('#ans'); setTimeout(() => ta.focus(), 60);
    ta.addEventListener('keydown', e => e.stopPropagation());
    el.querySelector('#x').onclick = () => { closeScreen(el); res(null); };
    el.querySelector('#ok').onclick = () => { const r = scoreAnswer(ta.value, gate); closeScreen(el); res({ ...r, text: ta.value }); };
  });
}

/** End of the mission. lessons: [{theme, title, text}] */
export function missionDebrief(d) {
  return new Promise(res => {
    const el = openScreen(`<div class="panel debrief" style="width:min(860px,94vw)"><h2>${esc(d.title || 'The school, tonight')}</h2>
      <p>${esc(d.body || 'You came out through the fire exit into the cold. Behind you the corridor screens are dark, the classroom is empty, and the phone is back on the gym floor where you found it.')}</p>
      <h3>What you did</h3>
      <div>${d.stats.map(s => `<span class="stat">${esc(s)}</span>`).join('')}</div>
      <h3>What you can do for real</h3><ol>${d.lessons.map(l => `<li><b>${esc(l.title)}</b> <span class="sub">(${esc(THEMES[l.theme].title)})</span>: ${esc(l.text)}</li>`).join('')}</ol>
      <div class="help"><h3 style="margin-top:0">If something online worries you</h3><p>Talk to an adult you trust. The Kék Vonal child helpline (116-111) is free and anonymous. Scams and harmful content can be reported to the NMHH Internet Hotline.</p></div>
      <div class="btns"><button class="btn primary" id="x" autofocus>Walk home</button></div></div>`, 'solid');
    el.querySelector('#x').onclick = () => { play('uiclick', { vol: 0.4 }); closeScreen(el); res(); };
  });
}

/** A fuse box in the school corridor: one app permission. Resolves 'on', 'off' or null (stepped back). */
export function fusePanel(f) {
  return new Promise(res => {
    const el = openScreen(`<div class="panel" style="width:min(520px,94vw);text-align:center"><h2>Fuse box (biztosítéktábla)</h2>
      <p style="font-size:1.15em">${esc(f.app)} wants: <b>${esc(f.perm)}</b></p>
      <p class="sub">Does the app need this for what you use it for?</p>
      <div class="btns" style="justify-content:center"><button class="btn" data-c="on">Leave it ON (1)</button><button class="btn" data-c="off">Switch it OFF (2)</button><button class="btn" data-c="x">Step back (Esc)</button></div></div>`);
    let gone = false;
    const done = c => { if (gone) return; gone = true; removeEventListener('keydown', key, true); closeScreen(el); res(c === 'x' ? null : c); };
    const key = e => { if (e.key === '1') done('on'); else if (e.key === '2') done('off'); else if (e.key === 'Escape') done('x'); else return; e.preventDefault(); e.stopPropagation(); };
    setTimeout(() => addEventListener('keydown', key, true), 150);
    el.querySelectorAll('[data-c]').forEach(b => b.onclick = () => done(b.dataset.c));
  });
}

/** The payphone: a familiar voice in a hurry. Resolves 'callback' | 'question' | 'gave' | 'hangup'. typeFn(text, title) types against the clock. */
export function callPanel(call, typeFn) {
  return new Promise(res => {
    const el = openScreen(`<div class="panel" style="width:min(600px,94vw)"><h2>The payphone (telefonfülke)</h2><div id="b"></div></div>`);
    const b = el.querySelector('#b');
    const end = r => { closeScreen(el); res(r); };
    b.innerHTML = `<p class="sub">A voice that sounds exactly like <b>${esc(call.who)}</b>:</p>
      <div style="background:#16141f;border-left:3px solid #ff9a8a;padding:8px 12px;border-radius:6px">${esc(call.say)}</div>
      <div style="display:grid;gap:8px;margin-top:12px">
        <button class="btn" data-c="gave" style="text-align:left">${esc(call.wants)}</button>
        <button class="btn" data-c="question" style="text-align:left">Ask: "${esc(call.question)}"</button>
        <button class="btn primary" data-c="callback" style="text-align:left">Hang up, and call ${esc(call.who === 'Mum' ? 'Mum' : call.who.startsWith('Your bank') ? 'the bank' : call.who)} back on the number you already have</button>
        <button class="btn" data-c="hangup" style="text-align:left">Just hang up</button></div>`;
    b.querySelectorAll('[data-c]').forEach(x => x.onclick = async () => {
      const c = x.dataset.c;
      if (c === 'gave') { b.innerHTML = `<p>The line goes dead the moment you finish. Somewhere, someone has exactly what they wanted.</p><p class="sub">${esc(call.lesson)}</p><div class="btns"><button class="btn" id="ok">Hang up</button></div>`; play('hangup', { vol: 0.5 }); b.querySelector('#ok').onclick = () => end('gave'); return; }
      if (c === 'hangup') { end('hangup'); return; }
      if (c === 'question') { b.innerHTML = `<p>A pause. "What? I... I don\'t have time for this!" The line goes dead.</p><p class="sub">A question only the real person could answer is a good test. Calling back on the number you know is even better.</p><div class="btns"><button class="btn" id="ok">Hang up</button></div>`; play('hangup', { vol: 0.5 }); b.querySelector('#ok').onclick = () => end('question'); return; }
      closeScreen(el);
      const digits = call.number.replace(/\+/g, '').trim();
      const r = await typeFn(digits, `Dial ${call.who === 'Mum' ? 'Mum' : call.who}'s number from your contacts: ${call.number}`);
      const el2 = openScreen(`<div class="panel" style="width:min(560px,94vw)"><h2>The payphone</h2>${r.ok ? `<p>It rings twice. Then the real ${esc(call.who === 'Your bank (security team)' ? 'bank' : call.who)}:</p><div style="background:#16141f;border-left:3px solid #8fe3c9;padding:8px 12px;border-radius:6px">${esc(call.real)}</div><p class="sub">${esc(call.lesson)}</p>` : '<p>You fumble the number and the line clicks dead. You still did not give them anything.</p>'}<div class="btns"><button class="btn primary" id="ok">Hang up</button></div></div>`);
      el2.querySelector('#ok').onclick = () => { closeScreen(el2); res(r.ok ? 'callback' : 'hangup'); };
    });
  });
}
