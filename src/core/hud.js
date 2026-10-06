import { A } from './assets.js';
import { S } from './state.js';
import { rich, plain } from '../text.js';
import { play, babble, voiceFor } from './audio.js';

const $ = id => document.getElementById(id);
export const H = {};

export function initHUD() {
  $('eyeimg').src = A.img.ui_eye; $('ekey').src = A.img.ui_e; $('saveimg').src = A.img.ui_save;
  // global tooltip for .term spans (hover or keyboard focus)
  const tt = $('tooltip');
  const show = el => {
    tt.textContent = el.dataset.tip; tt.classList.add('on');
    const r = el.getBoundingClientRect();
    let x = r.left, y = r.bottom + 8;
    tt.style.left = '0px'; tt.style.top = '0px';
    const w = tt.offsetWidth, h = tt.offsetHeight;
    if (x + w > innerWidth - 10) x = innerWidth - w - 10;
    if (y + h > innerHeight - 10) y = r.top - h - 8;
    tt.style.left = Math.max(10, x) + 'px'; tt.style.top = y + 'px';
  };
  const hide = () => tt.classList.remove('on');
  document.addEventListener('mouseover', e => { const t = e.target.closest && e.target.closest('.term'); if (t) show(t); });
  document.addEventListener('mouseout', e => { const t = e.target.closest && e.target.closest('.term'); if (t) hide(); });
  document.addEventListener('focusin', e => { if (e.target.classList && e.target.classList.contains('term')) show(e.target); });
  document.addEventListener('focusout', hide);
}
export function hud(on) { $('hud').classList.toggle('hidden', !on); }
export function hudParts(o) {
  $('checklist').style.display = o.checklist ? '' : 'none';
  $('status').style.display = o.status ? '' : 'none';
  $('eyebox').style.display = o.eye === false ? 'none' : '';
  $('battbox').style.display = o.batt === false ? 'none' : '';
}
export function objective(s) { $('objective').innerHTML = s ? rich(s) : ''; }
export function carry(s) { $('carry').innerHTML = s ? rich(s) : ''; }
export function prompt(label) {
  const p = $('prompt');
  if (!label) { p.classList.remove('on'); return; }
  $('prompttext').textContent = plain(label); p.classList.add('on');
}
export function checklist(title, rows) {
  $('checklist').innerHTML = `<div class="h">${title}</div>` + rows.map(r => `<div class="row ${r.cls || ''}"><span class="b">${r.cls === 'done' ? '✓' : r.cls === 'got' ? '•' : '·'}</span><span>${r.name} ${r.hu ? `<span class="hu">(${r.hu})</span>` : ""}</span></div>`).join('');
}
export function eye(v, alert) { $('eyefill').firstElementChild.style.width = Math.round(Math.max(0, Math.min(1, v)) * 100) + '%'; $('eyebox').classList.toggle('alert', !!alert); }
export function battery(v) { $('battfill').style.width = Math.round(Math.max(0, Math.min(1, v)) * 100) + '%'; }

// captions: kind 'sfx' for sound descriptions (shown only if subtitles on), 'say' for thoughts
export function caption(text, kind = 'say', dur = 4) {
  if (kind === 'sfx' && !S.settings.subs) return;
  if (kind === 'say' || kind === 'call') { const m = String(text).match(/^([^:]{2,48}):\s*(.+)$/s); if (m) { const v = voiceFor(m[1]); if (v) babble(m[2], v, { phone: kind === 'call' || /phone|📞/.test(m[1]) }); } }
  const el = document.createElement('div'); el.className = 'cap ' + kind; el.innerHTML = rich(text);
  const c = $('captions'); c.appendChild(el);
  while (c.children.length > 3) c.removeChild(c.firstChild);
  setTimeout(() => el.remove(), dur * 1000);
}
export function toast(from, text, dur = 7, sound = true) {
  const el = document.createElement('div'); el.className = 'toast';
  el.innerHTML = `<div class="from">${from}</div><div>${rich(text)}</div>`;
  const t = $('toasts'); t.appendChild(el); while (t.children.length > 3) t.removeChild(t.firstChild);
  if (sound) play('beep', { vol: 0.35 });
  setTimeout(() => el.remove(), dur * 1000);
}
export function clearHUDText() { $('captions').innerHTML = ''; $('toasts').innerHTML = ''; objective(''); prompt(null); carry(''); }

export function fade(on, text = '', secs = 1) {
  const f = $('fade'); f.style.transitionDuration = secs + 's';
  $('fadetext').innerHTML = text ? rich(text) : '';
  f.classList.toggle('on', on);
  return new Promise(r => setTimeout(r, secs * 1000));
}
export function flash(strength = 0.9, ms = 180) {
  const f = $('flash'); f.style.transition = 'none'; f.style.opacity = strength;
  requestAnimationFrame(() => { f.style.transition = `opacity ${ms}ms`; f.style.opacity = 0; });
}
export function loading(on, frac, msg) {
  const l = $('loading'); l.classList.toggle('hidden', !on);
  if (frac != null) $('lfill').style.width = Math.round(frac * 100) + '%';
  if (msg) $('lmsg').textContent = msg;
}
export const wait = s => new Promise(r => setTimeout(r, s * 1000));
