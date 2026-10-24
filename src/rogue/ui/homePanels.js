// Screens in your flat: the computer (notebook, shop, moving), the box of your things, and choosing what to keep.
import { openScreen, closeScreen, saveToFile, settingsScreen } from '../../ui/screens.js';
import { exportCode } from '../../core/state.js';
import { TOPICS } from '../content/walks.js';
import { WALK_NAME } from '../logic/routes.js';
import { mountMaker, preparePosters } from './posterMaker.js';
import { play } from '../../core/audio.js';
import { ITEMS, ITEM, FLATS, WALLS } from '../content/furniture.js';
import { CARDS, CARD_COUNT } from '../content/cards.js';
import { THEMES } from '../content/themes.js';
import { buy, cosiness, startNerve, flatOf, owned } from '../logic/home.js';

let stickerFolder = 'cozy';   // the open sticker folder in the shop (not saved)
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
    // v0.23: the computer as a small desktop. The apps sit in three groups down the left; the status strip on top.
    const APPS = [
      ['Your flat', [['shop', 'Shop', 'bolt'], ['stickers', 'Stickers', 'matricák'], ['maker', 'Posters', 'poszter'], ['flat', 'The flat', 'lakás: falak, költözés']]],
      ['You', [['notebook', 'Notebook', 'jegyzetfüzet'], ['record', 'Your nights', 'eredmények'], ['save', 'Save', 'mentés']]],
      ['Help', [['help', 'How to play', 'súgó'], ['intro', 'Intro', 'bevezető']]],
    ];
    const el = openScreen(`<div class="panel" style="width:min(1000px,96vw);height:min(680px,94vh);display:flex;flex-direction:column;padding:0;overflow:hidden">
      <div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:#121019;border-bottom:1px solid #2e2a3a">
        <b style="font-family:m5x7,monospace;font-size:1.5em;letter-spacing:1px;color:#8fe3c9">PANEL·OS</b><span id="hd" style="display:flex;flex-wrap:wrap;gap:6px;flex:1"></span>
        <button class="btn small" id="x">Close (Esc)</button></div>
      <div style="display:flex;flex:1;min-height:0">
        <nav id="nav" style="width:170px;flex:none;background:#0e0d14;border-right:1px solid #2e2a3a;padding:8px;overflow:auto">${APPS.map(([g, list]) => `<div style="font:12px m5x7,monospace;letter-spacing:2px;color:#77728a;text-transform:uppercase;margin:8px 6px 3px">${g}</div>` +
          list.map(([id, name, hu]) => `<button class="btn" data-t="${id}" title="${hu}" style="display:block;width:100%;text-align:left;margin:2px 0;padding:5px 10px;font-size:.9em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${name}</button>`).join('')).join('')}</nav>
        <div id="body" style="flex:1;overflow:auto;padding:12px 16px"></div></div></div>`);
    const body = el.querySelector('#body');
    let tab = tab0;
    const chip = (a, b) => `<span style="background:#1c1a26;border:1px solid #2e2a3a;border-radius:20px;padding:2px 9px;font-size:.8em">${a}${b ? ` <span style="opacity:.55">${b}</span>` : ''}</span>`;
    const head = () => { el.querySelector('#hd').innerHTML = [chip(esc(nick || 'you')), chip(`${L.floor}. emelet`, esc(flatOf(L).name)), chip(`${L.coins} coins`, 'zseton'), chip(`cosiness ${cosiness(L)}/30`, 'komfort'), chip(`nerve ${startNerve(L)}`, 'idegek'), chip(`${rec.notebook.length}/${CARD_COUNT} cards`)].join(''); };
    const draw = () => {
      head();
      el.querySelectorAll('[data-t]').forEach(b => b.classList.toggle('primary', b.dataset.t === tab));
      if (tab === 'record') return drawRecord();
      if (tab === 'save') return drawSave();
      if (tab === 'help') return drawHelp();
      if (tab === 'intro') { done({ intro: true }); return; }
      if (tab === 'shop' || tab === 'stickers') {
        const FOLDERS = [['cozy', 'Cosy (Mark\'s sheet)'], ['retro', 'Retro city'], ['cartoon', 'Cartoon'], ['sticker', 'Street stickers'], ['sign', 'Signs']];
        const fold = it => FOLDERS.find(([k]) => it.id.startsWith('s_' + k))?.[0];
        let list = ITEMS.filter(it => !it.custom && !!it.sticker === (tab === 'stickers'));
        if (tab === 'stickers') { list = list.filter(it => fold(it) === stickerFolder); }
        body.innerHTML = `<p class="sub" style="margin-top:0">${tab === 'stickers' ? 'Stick them on any wall. Two stickers add one cosiness point.' : 'What you buy goes into the box by the door. Take it out of the box to place it. Small things (a TV, a vase, a frame) can go on top of tables and shelves. Cosiness (komfort) adds to your nerve on the stairs, up to +30.'}</p>
          ${tab === 'stickers' ? `<div class="btns" style="margin:0 0 8px;flex-wrap:wrap">${FOLDERS.map(([k, n]) => `<button class="btn small ${stickerFolder === k ? 'primary' : ''}" data-sf="${k}">${n} (${ITEMS.filter(it => it.sticker && fold(it) === k).length})</button>`).join('')}</div>` : ''}
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(${tab === 'stickers' ? 100 : 130}px,1fr));gap:8px">${list.map(it => `<div style="${CARD}">
          <img src="${thumb(it)}" style="width:${it.sticker ? 76 : 96}px;height:${it.sticker ? 76 : 96}px;object-fit:contain;image-rendering:${it.sticker ? 'auto' : 'pixelated'};border-radius:6px;background:#0c0b12">
          <b style="font-size:.85em">${esc(it.name)}</b><span class="sub" style="font-size:.72em">${esc(it.hu)} · +${it.cosy < 1 ? '½' : it.cosy} cosy${L.inv[it.id] ? ` · ${L.inv[it.id]} in the box` : ''}</span>
          <button class="btn small ${L.coins >= it.price ? 'primary' : ''}" data-buy="${it.id}" ${L.coins >= it.price ? '' : 'disabled style="opacity:.45"'}>${it.price} coins</button></div>`).join('')}</div>`;
        body.querySelectorAll('[data-sf]').forEach(b => b.onclick = () => { stickerFolder = b.dataset.sf; draw(); });
        body.querySelectorAll('[data-buy]').forEach(b => b.onclick = () => { if (buy(L, b.dataset.buy)) { play('beep', { vol: 0.3, rate: 1.4 }); R._dirty = true; draw(); } });
      } else if (tab === 'maker') {
        mountMaker(body, R, async r => { await preparePosters(rec); L.inv['cp_' + r.id] = (L.inv['cp_' + r.id] || 0) + 1; R._dirty = true; head(); play('beep', { vol: 0.3, rate: 1.2 }); });
      } else if (tab === 'notebook') {
        const cards = rec.notebook.map(id => CARDS[id]).filter(Boolean);
        body.innerHTML = `<p class="sub" style="margin-top:0">${cards.length} of ${CARD_COUNT} cards. Every anomaly you catch and every reply you type on a walk adds one. Cards survive death.</p>` +
          (cards.length ? cards.map(a => `<div style="${PAPER}"><b>${esc(a.title)}</b> <span style="color:#7a6a50;font-size:.85em">· ${esc(THEMES[a.theme].title)}</span><br>${esc(a.text)}</div>`).join('') : '<p class="sub">Empty for now.</p>');
      } else {
        const cur = flatOf(L), next = FLATS[cur.level];
        body.innerHTML = `<div style="${PAPER}"><b>${esc(cur.name)}</b> (${esc(cur.hu)}) on the ${L.floor}. emelet<br>Nerve bonus from the flat: +${cur.nerve}. Cosiness: ${cosiness(L)} of 30.${L.fed || L.rested ? ` Tonight: ${L.fed ? 'you ate (+5)' : ''}${L.fed && L.rested ? ', ' : ''}${L.rested ? 'you rested (+5)' : ''}.` : ''}</div>
          <h3>Walls (fal)</h3><div style="display:flex;flex-wrap:wrap;gap:6px">${WALLS.map(w => `<button class="btn small ${(L.wall || 'paper') === w.id ? 'primary' : ''}" data-wall="${w.id}">${esc(w.name)}</button>`).join('')}</div>
          <p class="sub" style="font-size:.8em">Free. The flat is repainted when you close the computer.</p>
          ${next ? `<h3>Move to a bigger flat</h3><p><b>${esc(next.name)}</b> (${esc(next.hu)}): ${next.rooms.length} rooms${next.rooms.some(r => r.balcony) ? ' with a balcony' : ''}, nerve +${next.nerve} on the stairs. Costs <b>${next.price} coins</b>.</p>
          <p class="sub">Moving puts all your furniture into boxes, and you choose your floor again (higher floors pay more and take longer). If you lose this life, the bigger flat goes too.</p>
          <button class="btn ${L.coins >= next.price ? 'primary' : ''}" id="mv" ${L.coins >= next.price ? '' : 'disabled style="opacity:.45"'}>Move (${next.price} coins)</button>` : '<p>This is the biggest flat in the block.</p>'}`;
        const mv = body.querySelector('#mv'); if (mv) mv.onclick = () => { done({ move: true }); };
        body.querySelectorAll('[data-wall]').forEach(b => b.onclick = () => { L.wall = b.dataset.wall; R._rebuild = true; draw(); });
      }
    };
    const drawRecord = () => {
      const ns = rec.nights || [], b = rec.best || {}, tp = rec.topics || {};
      const stat = (n, l) => `<div style="background:#1a1822;border:1px solid #2e2a3a;border-radius:10px;padding:10px 12px;min-width:120px"><div style="font:28px m5x7,monospace;color:#f2e6cf">${n}</div><div class="sub" style="font-size:.78em">${l}</div></div>`;
      const OUT = { full: 'the whole night', home: 'went home early', death: 'lost the flat', labyrinth: 'the labyrinth' };
      body.innerHTML = `<h3 style="margin-top:0">Your nights (eredmények)</h3><div style="display:flex;flex-wrap:wrap;gap:8px">
        ${stat(Object.values(tp).reduce((a, c) => a + c, 0), 'nights out')}${stat(rec.xp, 'XP, all lives')}${stat(b.wpm || 0, 'best typing (wpm)')}${stat(b.xp || 0, 'best night (XP)')}${stat(b.rooms || 0, 'labyrinth rooms')}${stat(rec.descents, 'ground floor reached')}${stat(rec.deaths, 'flats lost')}</div>
        <h3>The last nights</h3>${ns.length ? `<table style="width:100%;border-collapse:collapse;font-size:.88em">${ns.slice(0, 12).map(n => `<tr style="border-bottom:1px solid #2a2636"><td style="padding:5px 4px">${esc((TOPICS[n.topic] || {}).title || n.topic)}</td><td style="opacity:.75">${esc(WALK_NAME[n.walk] || '')}</td><td>${esc(OUT[n.outcome] || n.outcome || '')}</td><td style="text-align:right">+${n.xp} XP</td><td style="text-align:right;opacity:.75">${n.wpm} wpm</td></tr>`).join('')}</table>` : '<p class="sub">No nights yet. The front door is waiting.</p>'}
        <h3>Topics you have met</h3><div style="display:flex;flex-wrap:wrap;gap:6px">${Object.entries(TOPICS).map(([id, T]) => chip(esc(T.title), tp[id] ? '×' + tp[id] : 'not yet')).join('')}</div>`;
    };
    const drawSave = () => {
      const code = exportCode();
      body.innerHTML = `<h3 style="margin-top:0">Save (mentés)</h3><p>Your flat and your notebook save by themselves on this computer. To take them to another computer, or to hand them in to your teacher, use one of these.</p>
        <div style="${PAPER}"><b>A save file.</b> It goes to your Downloads folder. Double-click it later and the game opens with your save.<div class="btns" style="margin-top:8px"><button class="btn primary" id="sf">Save to a file</button></div></div>
        <div style="${PAPER}"><b>A save code (mentési kód).</b> Paste it into your reflection sheet, or load it on the title screen of another computer.<textarea id="cd" readonly style="width:100%;height:80px;margin-top:6px">${esc(code)}</textarea><div class="btns" style="margin-top:6px"><button class="btn" id="cp">Copy the code</button></div></div>
        <p class="sub" id="m"></p><div class="btns"><button class="btn" id="st">Settings (beállítások)</button></div>`;
      const msg = t => { body.querySelector('#m').textContent = t; };
      body.querySelector('#sf').onclick = () => { saveToFile(); msg('Saved to your Downloads folder.'); };
      body.querySelector('#cp').onclick = () => { const t = body.querySelector('#cd'); t.select(); try { navigator.clipboard.writeText(code).then(() => msg('Copied.')).catch(() => { document.execCommand('copy'); msg('Copied.'); }); } catch (e) { document.execCommand('copy'); msg('Copied.'); } };
      body.querySelector('#st').onclick = () => { removeEventListener('keydown', key, true); el.style.visibility = 'hidden'; settingsScreen(() => { el.style.visibility = ''; addEventListener('keydown', key, true); }); };
    };
    const drawHelp = () => {
      const row = (k, t) => `<div style="${PAPER}"><b>${k}</b><br>${t}</div>`;
      body.innerHTML = `<h3 style="margin-top:0">How to play (súgó)</h3>
        ${row('A night', 'Go out through the front door. Choose tonight\'s topic and how hard it is; the route is picked for you. You can come home after any stage and keep what you earned.')}
        ${row('The stairwell', 'Learn what a normal landing looks like. Something different (a red bulb, a note, a strange notice)? Go back up. All normal? Go down. A wrong call sends you to the yellow rooms.')}
        ${row('The walk', 'Stand still and read what the figures say, then type the safe reply before they reach you. At the exit, type tonight\'s rules back.')}
        ${row('Nerve (idegek)', 'Mistakes cost nerve. A cosy flat, a meal and a rest give you more. Run out and you lose the flat, but the notebook stays.')}
        ${row('Keys', 'Mouse to look, W A S D to walk, Shift to run (it is loud), E to use, F for the torch, Esc to pause.')}
        <div class="btns"><button class="btn primary" id="iv">Watch the intro again</button></div>`;
      body.querySelector('#iv').onclick = () => done({ intro: true });
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
        <img src="${thumb(ITEM[id])}" style="width:96px;height:96px;object-fit:contain;image-rendering:pixelated;border-radius:6px;background:#0c0b12"><b style="font-size:.85em">${esc(ITEM[id].name)}</b><span class="sub" style="font-size:.72em">x${inv[id]} · +${ITEM[id].cosy} cosy</span></button>`).join('')}</div>`
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
        <img src="${thumb(ITEM[id])}" style="width:96px;height:96px;object-fit:contain;image-rendering:pixelated;border-radius:6px;background:#0c0b12"><b style="font-size:.85em">${esc(ITEM[id].name)}</b></button>`).join('')}</div>
      <div class="btns" style="justify-content:center"><button class="btn" id="x">Keep nothing</button></div></div>`, 'solid');
    el.querySelectorAll('[data-id]').forEach(b => b.onclick = () => { closeScreen(el); res(b.dataset.id); });
    el.querySelector('#x').onclick = () => { closeScreen(el); res(null); };
  });
}
