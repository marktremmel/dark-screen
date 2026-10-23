// Typing on screen: a bar at the bottom of the view for one phrase, and floating labels for several targets (the park).
// While typing, the keyboard belongs to the phrase: letters never reach the player's movement keys.
import { Phrase, wpm } from '../logic/typing.js';
import { play } from '../../core/audio.js';

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const CSS = `
.tyb{position:fixed;left:50%;bottom:9%;transform:translateX(-50%);z-index:5;pointer-events:none;background:rgba(8,8,12,.86);border:1px solid #3a3550;border-radius:12px;padding:12px 20px 14px;min-width:min(560px,90vw);text-align:center;box-shadow:0 10px 40px rgba(0,0,0,.6)}
.tyb .t{font-size:.8em;color:#b9b3c9;margin-bottom:6px}
.tyb .p{font-family:m5x7,monospace;font-size:34px;letter-spacing:1px;line-height:1}
.ty-done{color:#8fe3c9}.ty-cur{color:#fff;text-decoration:underline;text-underline-offset:5px}.ty-rest{color:#c8c2d8}
.tyb.err{border-color:#ff6a5a;animation:tyshake .15s}
@keyframes tyshake{0%{transform:translateX(calc(-50% - 4px))}50%{transform:translateX(calc(-50% + 4px))}100%{transform:translateX(-50%)}}
.tyb .bar{height:5px;border-radius:3px;background:#2a2636;margin-top:10px;overflow:hidden}.tyb .bar i{display:block;height:100%;background:#e8b04a}
.tyl{position:fixed;z-index:5;pointer-events:none;transform:translate(-50%,-100%);text-align:center;white-space:nowrap}
.tyl .say{font-size:.72em;color:#ffd1c9;background:rgba(40,8,8,.75);padding:3px 8px;border-radius:6px;margin-bottom:4px;max-width:340px;white-space:normal}
.tyl .p{font-family:m5x7,monospace;font-size:26px;background:rgba(8,8,12,.85);padding:2px 10px;border-radius:6px;border:1px solid #3a3550}
.tyl.lock .p{border-color:#8fe3c9;box-shadow:0 0 12px rgba(143,227,201,.4)}`;
function ensureCss() { if (document.getElementById('tycss')) return; const s = document.createElement('style'); s.id = 'tycss'; s.textContent = CSS; document.head.appendChild(s); }
export const phraseHTML = p => `<span class="ty-done">${esc(p.text.slice(0, p.pos))}</span><span class="ty-cur">${esc(p.text.slice(p.pos, p.pos + 1)).replace(' ', '&nbsp;')}</span><span class="ty-rest">${esc(p.text.slice(p.pos + 1))}</span>`;

/** Listen to typed characters until stop() is called. onChar(ch), onEsc(). */
export function captureKeys(onChar, onEsc) {
  const key = e => {
    if (e.code === 'Escape') { if (onEsc) { e.preventDefault(); e.stopImmediatePropagation(); onEsc(); } return; }
    if (e.key && e.key.length === 1 && !e.ctrlKey && !e.metaKey) { e.preventDefault(); e.stopImmediatePropagation(); onChar(e.key); }
  };
  addEventListener('keydown', key, true);
  return () => removeEventListener('keydown', key, true);
}

/**
 * Type one phrase against the clock.
 * @param {{text: string, title?: string, time: number}} o time in seconds
 * @returns {Promise<{ok: boolean, cancelled?: boolean, accuracy: number, wpm: number}>}
 */
export function typeOne(o) {
  ensureCss();
  return new Promise(res => {
    const p = new Phrase(o.text), el = document.createElement('div'); el.className = 'tyb';
    el.innerHTML = `<div class="t">${esc(o.title || 'Type it')}</div><div class="p"></div><div class="bar"><i></i></div>`;
    document.body.appendChild(el);
    const pe = el.querySelector('.p'), bar = el.querySelector('.bar i'), t0 = performance.now();
    let first = 0, over = false;
    const draw = () => { pe.innerHTML = phraseHTML(p); };
    const end = r => { if (over) return; over = true; stop(); cancelAnimationFrame(raf); el.remove(); res(r); };
    const stop = captureKeys(ch => {
      if (!first) first = performance.now();
      const r = p.input(ch);
      if (r === 'miss') { play('click', { vol: 0.25, rate: 0.5 }); el.classList.remove('err'); void el.offsetWidth; el.classList.add('err'); }
      else play('click', { vol: 0.12, rate: 1.4 });
      draw();
      if (p.done) end({ ok: true, accuracy: p.accuracy, wpm: wpm(p.text.length, performance.now() - (first || t0)) });
    }, () => end({ ok: false, cancelled: true, accuracy: p.accuracy, wpm: 0 }));
    let raf;
    if (o.handle) o.handle.cancel = () => end({ ok: false, cancelled: true, accuracy: p.accuracy, wpm: 0 });
    const tick = () => {
      const left = 1 - (performance.now() - t0) / (o.time * 1000);
      bar.style.width = Math.max(0, left * 100) + '%'; bar.style.background = left < 0.3 ? '#ff6a5a' : '#e8b04a';
      if (left <= 0) { end({ ok: false, accuracy: p.accuracy, wpm: 0 }); return; }
      raf = requestAnimationFrame(tick);
    };
    draw(); raf = requestAnimationFrame(tick);
  });
}

/** Floating labels for several targets (positions given in screen pixels each frame). */
export class LabelLayer {
  constructor() { ensureCss(); this.els = new Map(); }
  set(id, x, y, say, phrase, locked, visible = true) {
    let el = this.els.get(id);
    if (!el) { el = document.createElement('div'); el.className = 'tyl'; el.innerHTML = '<div class="say"></div><div class="p"></div>'; document.body.appendChild(el); this.els.set(id, el); el._say = null; }
    el.style.display = visible ? '' : 'none'; if (!visible) return;
    el.style.left = x + 'px'; el.style.top = y + 'px'; el.classList.toggle('lock', !!locked);
    if (el._say !== say) { el._say = say; el.firstChild.textContent = say; }
    const html = phraseHTML(phrase); if (el._p !== html) { el._p = html; el.lastChild.innerHTML = html; }
  }
  remove(id) { const el = this.els.get(id); if (el) { el.remove(); this.els.delete(id); } }
  clear() { for (const el of this.els.values()) el.remove(); this.els.clear(); }
}
