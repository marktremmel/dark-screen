// Screens in your flat: the computer (notebook, shop, moving), the box of your things, and choosing what to keep.
import { openScreen, closeScreen } from '../../ui/screens.js';
import { play } from '../../core/audio.js';
import { ITEMS, ITEM, FLATS } from '../content/furniture.js';
import { CARDS, CARD_COUNT } from '../content/cards.js';
import { THEMES } from '../content/themes.js';
import { buy, cosiness, startNerve, flatOf, owned } from '../logic/home.js';

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const PAPER = 'background:#ece6d6;color:#1d1a14;border-radius:3px;padding:10px 12px;margin:8px 0;box-shadow:0 3px 12px rgba(0,0,0,.5);font-family:Georgia,serif;line-height:1.4';
const CARD = 'background:#1a1822;border:1px solid #2e2a3a;border-radius:10px;padding:8px;display:flex;flex-direction:column;gap:4px;align-items:center;text-align:center';

/**
 * The computer on your desk. Tabs: notebook, shop, flat. Resolves with { move: true } if you decided to move flats.
 * @param {(item) => string} thumb returns an image URL for an item
 */
export function homeComputer(R, nick, thumb, tab0 = 'shop') {
  return new Promise(res => {
    const L = R.life, rec = R.record;
    const el = openScreen(`<div class="panel" style="width:min(900px,95vw)"><h2>Your computer</h2>
      <p class="sub" id="hd"></p>
      <div class="btns" style="margin:4px 0 10px"><button class="btn" data-t="shop">Shop (bolt)</button><button class="btn" data-t="notebook">Notebook (jegyzetfüzet)</button><button class="btn" data-t="flat">Your flat (lakás)</button><button class="btn" id="x" style="margin-left:auto">Close (Esc)</button></div>
      <div id="body"></div></div>`);
    const body = el.querySelector('#body');
    let tab = tab0;
    const head = () => { el.querySelector('#hd').textContent = `${nick} · life ${L.id} · ${L.floor}. emelet · ${flatOf(L).name} · ${L.coins} coins · cosiness ${cosiness(L)} (nerve on the stairs: ${startNerve(L)})`; };
    const draw = () => {
      head();
      el.querySelectorAll('[data-t]').forEach(b => b.classList.toggle('primary', b.dataset.t === tab));
      if (tab === 'shop') {
        body.innerHTML = `<p class="sub" style="margin-top:0">What you buy goes into the box by the door. Take it out of the box to place it. Cosiness (komfort) adds to your nerve on the stairs, up to +30.</p>
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:8px">${ITEMS.map(it => `<div style="${CARD}">
          <img src="${thumb(it)}" style="width:96px;height:96px;image-rendering:pixelated;border-radius:6px;background:#0c0b12">
          <b style="font-size:.85em">${esc(it.name)}</b><span class="sub" style="font-size:.72em">${esc(it.hu)} · +${it.cosy} cosy${L.inv[it.id] ? ` · ${L.inv[it.id]} in the box` : ''}</span>
          <button class="btn small ${L.coins >= it.price ? 'primary' : ''}" data-buy="${it.id}" ${L.coins >= it.price ? '' : 'disabled style="opacity:.45"'}>${it.price} coins</button></div>`).join('')}</div>`;
        body.querySelectorAll('[data-buy]').forEach(b => b.onclick = () => { if (buy(L, b.dataset.buy)) { play('beep', { vol: 0.3, rate: 1.4 }); R._dirty = true; draw(); } });
      } else if (tab === 'notebook') {
        const cards = rec.notebook.map(id => CARDS[id]).filter(Boolean);
        body.innerHTML = `<p class="sub" style="margin-top:0">${cards.length} of ${CARD_COUNT} cards. Every anomaly you catch and every reply you type on a walk adds one. Cards survive death.</p>` +
          (cards.length ? cards.map(a => `<div style="${PAPER}"><b>${esc(a.title)}</b> <span style="color:#7a6a50;font-size:.85em">· ${esc(THEMES[a.theme].title)}</span><br>${esc(a.text)}</div>`).join('') : '<p class="sub">Empty for now.</p>');
      } else {
        const cur = flatOf(L), next = FLATS[cur.level];
        body.innerHTML = `<div style="${PAPER}"><b>${esc(cur.name)}</b> (${esc(cur.hu)}) on the ${L.floor}. emelet<br>Nerve bonus from the flat: +${cur.nerve}. Cosiness: ${cosiness(L)} of 30.</div>
          ${next ? `<h3>Move to a bigger flat</h3><p><b>${esc(next.name)}</b> (${esc(next.hu)}): ${next.rooms.length} rooms${next.rooms.some(r => r.balcony) ? ' with a balcony' : ''}, nerve +${next.nerve} on the stairs. Costs <b>${next.price} coins</b>.</p>
          <p class="sub">Moving puts all your furniture into boxes, and you choose your floor again (higher floors pay more and take longer). If you lose this life, the bigger flat goes too.</p>
          <button class="btn ${L.coins >= next.price ? 'primary' : ''}" id="mv" ${L.coins >= next.price ? '' : 'disabled style="opacity:.45"'}>Move (${next.price} coins)</button>` : '<p>This is the biggest flat in the block.</p>'}`;
        const mv = body.querySelector('#mv'); if (mv) mv.onclick = () => { done({ move: true }); };
      }
    };
    const key = e => { if (e.code === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); done({}); } };
    const done = r => { removeEventListener('keydown', key, true); closeScreen(el); res(r); };
    setTimeout(() => addEventListener('keydown', key, true), 150);
    el.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { tab = b.dataset.t; draw(); });
    el.querySelector('#x').onclick = () => done({});
    draw();
  });
}

/** The box by the door: your things that are not placed yet. Resolves with an item id to place, or null. */
export function boxPanel(R, thumb) {
  return new Promise(res => {
    const inv = R.life.inv || {}, ids = Object.keys(inv).filter(id => ITEM[id] && inv[id] > 0);
    const el = openScreen(`<div class="panel" style="width:min(760px,94vw)"><h2>Your things (doboz)</h2>
      ${ids.length ? `<p class="sub">Choose something to place. Then look where you want it: E puts it down, R turns it, X puts it back in the box.</p>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:8px">${ids.map(id => `<button class="btn" data-id="${id}" style="${CARD}">
        <img src="${thumb(ITEM[id])}" style="width:96px;height:96px;image-rendering:pixelated;border-radius:6px;background:#0c0b12"><b style="font-size:.85em">${esc(ITEM[id].name)}</b><span class="sub" style="font-size:.72em">x${inv[id]} · +${ITEM[id].cosy} cosy</span></button>`).join('')}</div>`
      : '<p>The box is empty. Buy things on your computer; they arrive here.</p>'}
      <div class="btns"><button class="btn" id="x">Close (Esc)</button></div></div>`);
    const key = e => { if (e.code === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); done(null); } };
    const done = r => { removeEventListener('keydown', key, true); closeScreen(el); res(r); };
    setTimeout(() => addEventListener('keydown', key, true), 150);
    el.querySelectorAll('[data-id]').forEach(b => b.onclick = () => done(b.dataset.id));
    el.querySelector('#x').onclick = () => done(null);
  });
}

/** When a life ends: choose one thing to take into the next life. Resolves with an id or null. */
export function keepPanel(R, thumb) {
  return new Promise(res => {
    const ids = owned(R.life);
    if (!ids.length) { res(null); return; }
    const el = openScreen(`<div class="panel" style="width:min(760px,94vw);text-align:center"><h2>Keep one thing</h2>
      <p>Everything else stays behind. Choose one thing to carry into your next flat.</p>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:8px">${ids.map(id => `<button class="btn" data-id="${id}" style="${CARD}">
        <img src="${thumb(ITEM[id])}" style="width:96px;height:96px;image-rendering:pixelated;border-radius:6px;background:#0c0b12"><b style="font-size:.85em">${esc(ITEM[id].name)}</b></button>`).join('')}</div>
      <div class="btns" style="justify-content:center"><button class="btn" id="x">Keep nothing</button></div></div>`, 'solid');
    el.querySelectorAll('[data-id]').forEach(b => b.onclick = () => { closeScreen(el); res(b.dataset.id); });
    el.querySelector('#x').onclick = () => { closeScreen(el); res(null); };
  });
}
