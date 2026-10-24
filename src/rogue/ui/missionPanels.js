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

/** The design detective arcade: three screens of a tricky free game; click every trick before the timer runs out.
 *  Resolves { found: [ids], missed: [ids], mistakes }. */
export function arcadePanel(TRICKS, FINE, secs = 22, rand = Math.random) {
  return new Promise(res => {
    const pool = [...TRICKS].sort(() => rand() - 0.5), out = { found: [], missed: [], mistakes: 0 };
    const el = openScreen(`<div class="panel" style="width:min(720px,96vw);max-height:96vh;overflow:auto;background:#0b0816;border:3px solid #5a2a8a;box-shadow:0 0 40px rgba(160,80,255,.35)">
      <div style="display:flex;justify-content:space-between;align-items:baseline"><h2 style="margin:0;color:#ff7ad9;letter-spacing:3px;text-shadow:0 0 12px #ff3ab0">LOOT LEGENDS</h2><span class="sub" id="arcRd"></span></div>
      <p class="sub" style="margin:4px 0 8px">Design detective (sötét minták): click every trick on this screen before the time runs out. Leave the honest parts alone.</p>
      <div style="height:6px;background:#221a33;border-radius:3px;margin-bottom:10px"><i id="arcBar" style="display:block;height:100%;width:100%;background:#ff7ad9;border-radius:3px"></i></div>
      <div id="arcScr"></div><div id="arcMsg" class="sub" style="min-height:1.4em;margin-top:6px"></div></div>`, 'solid');
    const scr = el.querySelector('#arcScr'), bar = el.querySelector('#arcBar'), msg = el.querySelector('#arcMsg');
    let round = 0, timer = null;
    const COLORS = ['#ffcf3a', '#3ad1ff', '#ff5a6a', '#7dff8a', '#c08aff', '#ff9a3a'];
    const next = () => {
      if (round === 3) { closeScreen(el); res(out); return; }
      const tricks = pool.slice(round * 3, round * 3 + 3), fine = [...FINE].sort(() => rand() - 0.5).slice(0, 3);
      const items = [...tricks.map(t => ({ ...t, trick: true })), ...fine].sort(() => rand() - 0.5);
      round++; el.querySelector('#arcRd').textContent = `Screen ${round} of 3`;
      scr.innerHTML = `<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;background:radial-gradient(#2a1050,#0b0816);padding:12px;border-radius:12px">${items.map((it, i) => `<button class="btn" data-i="${i}" style="min-height:58px;font-weight:700;letter-spacing:1px;background:#140c24;border:2px solid ${COLORS[i % COLORS.length]};color:${COLORS[i % COLORS.length]};text-align:center">${esc(it.ui)}</button>`).join('')}</div>`;
      const left = new Set(tricks.map(t => t.id)); let t0 = performance.now(), done = false;
      const finish = () => {
        if (done) return; done = true; clearInterval(timer);
        for (const t of tricks) (left.has(t.id) ? out.missed : out.found).push(t.id);
        scr.innerHTML = `<div style="display:grid;gap:6px">${tricks.map(t => `<div style="background:#16101f;border-left:3px solid ${left.has(t.id) ? '#ff5a6a' : '#7dff8a'};padding:6px 10px;border-radius:6px"><b>${left.has(t.id) ? 'Missed' : 'Found'}: ${esc(t.name)}</b> <span class="sub">("${esc(t.ui)}")</span><br><span style="font-size:.9em">${esc(t.why)}</span></div>`).join('')}</div>
          <div class="btns"><button class="btn primary" id="arcNx">${round === 3 ? 'Done' : 'Next screen'}</button></div>`;
        msg.textContent = ''; el.querySelector('#arcNx').onclick = next;
      };
      scr.querySelectorAll('[data-i]').forEach(b => b.onclick = () => {
        const it = items[+b.dataset.i]; if (done || b.disabled) return;
        if (it.trick) { left.delete(it.id); b.disabled = true; b.style.background = '#123a1a'; b.style.borderColor = '#7dff8a'; b.style.color = '#c8ffd0'; b.textContent = '✓ ' + it.name; play('beep', { vol: 0.3, rate: 1.4 }); if (!left.size) setTimeout(finish, 500); }
        else { out.mistakes++; b.style.borderColor = '#666'; b.style.color = '#888'; msg.textContent = `"${it.ui}" is just part of the game. Nothing wrong with it.`; play('denied', { vol: 0.3 }); }
      });
      timer = setInterval(() => { const f = 1 - (performance.now() - t0) / (secs * 1000); bar.style.width = Math.max(0, f * 100) + '%'; if (f <= 0) finish(); }, 100);
    };
    next();
  });
}

/**
 * T8 home jobs (v0.16): a chat on your own phone. The chat plays in, you pick a reply; a risky reply shows what could
 * happen next and you pick again; the safe reply is then typed out on the phone's keyboard.
 * Resolves {done, tries, chars, ms, keys, errors} (done false if the phone was put away first).
 */
export function homeJobPanel(job, Phrase, rand = Math.random) {
  return new Promise(res => {
    const el = openScreen(`<div class="phone"><div class="bar"><span>${new Date().getHours()}:${String(new Date().getMinutes()).padStart(2, '0')}</span><span>▮▮▮ 64%</span></div>
      <div class="appbar">${esc(job.from)}</div><div class="msgs" id="hm"></div>
      <div class="foot" id="hf" style="flex-direction:column;gap:8px"></div></div>`);
    const box = el.querySelector('#hm'), foot = el.querySelector('#hf');
    let tries = 0, closed = false, typing = null, timers = [];
    const later = (f, ms) => timers.push(setTimeout(() => { if (!closed) f(); }, ms));
    const bubble = (who, text, sys) => {
      const d = document.createElement('div'); d.className = 'msg' + (sys ? ' sys' : '');
      if (who === 'you') d.style.cssText = 'align-self:flex-end;background:#1f4a3c';
      d.innerHTML = sys ? esc(text) : `${who !== 'you' && who !== 'them' ? `<span class="who">${esc(who)}</span>` : ''}${esc(text)}`;
      box.appendChild(d); box.scrollTop = box.scrollHeight; setTimeout(() => { box.scrollTop = box.scrollHeight; }, 350); play('click', { vol: 0.25 });
    };
    const close = done => { if (closed) return; closed = true; timers.forEach(clearTimeout); removeEventListener('keydown', key, true); closeScreen(el); res({ done, tries, ...(typing ? typing.stats() : { chars: 0, ms: 0, keys: 0, errors: 0 }) }); };
    const key = e => {
      if (e.code === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); close(false); return; }
      if (!typing || e.key.length !== 1) return;
      e.preventDefault(); e.stopImmediatePropagation(); typing.input(e.key);
    };
    setTimeout(() => addEventListener('keydown', key, true), 150);
    const choose = () => {
      const opts = job.replies.slice().sort(() => rand() - 0.5);
      foot.innerHTML = `<div class="sub" style="font-size:.75em">Your reply (válasz):</div>` + opts.map((o, i) => `<button class="btn small" data-i="${i}" style="text-align:left;width:100%">${esc(o.text)}</button>`).join('');
      foot.querySelectorAll('[data-i]').forEach(b => b.onclick = () => {
        const o = opts[+b.dataset.i]; tries++;
        if (!o.safe) { foot.innerHTML = ''; bubble('sys', 'What could happen next: ' + o.next, true); later(() => { bubble('sys', 'Choose again.', true); choose(); }, 1600); return; }
        type(o.text);
      });
    };
    const type = text => {
      const p = new Phrase(text), t0 = performance.now();
      foot.innerHTML = `<div class="sub" style="font-size:.75em">Type it (gépeld be):</div><div id="ht" style="font:18px m5x7,monospace;letter-spacing:1px;padding:8px 10px;background:#15141c;border-radius:10px;width:100%;box-sizing:border-box"></div>`;
      const ht = foot.querySelector('#ht');
      const draw = () => { ht.innerHTML = `<span style="color:#8fe3c9">${esc(text.slice(0, p.pos))}</span><span style="text-decoration:underline">${esc(text.slice(p.pos, p.pos + 1))}</span><span style="color:#8a8598">${esc(text.slice(p.pos + 1))}</span>`; };
      typing = {
        input: ch => { const r = p.input(ch); draw(); if (r === 'miss') play('click', { vol: 0.15, rate: 0.6 }); if (r === 'done') sent(); },
        stats: () => ({ chars: p.pos, ms: performance.now() - t0, keys: p.keys, errors: p.errors }),
      };
      draw();
      const sent = () => {
        const st = typing.stats(); typing = { input: () => {}, stats: () => st };
        foot.innerHTML = ''; bubble('you', text);
        job.after.forEach(([who, t], i) => later(() => bubble(who === 'you' ? 'you' : who, t), 900 + i * 1100));
        later(() => {
          const c = document.createElement('div'); c.className = 'msg sys'; c.style.cssText = 'max-width:100%;text-align:left';
          c.innerHTML = `<b>Notebook card: ${esc(job.card.title)}</b><br>${esc(job.card.text)}`; box.appendChild(c); box.scrollTop = box.scrollHeight; setTimeout(() => { box.scrollTop = box.scrollHeight; }, 350);
          foot.innerHTML = '<button class="btn primary" id="hd">Put the phone down</button>'; foot.querySelector('#hd').onclick = () => close(true);
        }, 1000 + job.after.length * 1100);
      };
    };
    foot.innerHTML = '<button class="btn small" id="hx">Not now (Esc)</button>'; foot.querySelector('#hx').onclick = () => close(false);
    job.chat.forEach(([who, t], i) => later(() => bubble(who, t), 300 + i * 900));
    later(choose, 400 + job.chat.length * 900);
  });
}
