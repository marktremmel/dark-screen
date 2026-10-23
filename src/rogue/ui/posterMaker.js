// The poster maker on your home computer: pick a picture, write a caption, stick stickers on it, print it.
// A poster is saved as a small recipe in the record (it survives losing a life), and drawn into an image when needed:
// { id, base: 'pt_...'|'sm_...', top, bottom, style: 'meme'|'zine', st: [{ k: 'st_...', x, y, s }] } (x, y, s are fractions).
import { A } from '../../core/assets.js';
import { PAINTINGS } from '../content/paintings.js';
import { STICKERS } from '../content/stickers.js';
import { ITEMS, ITEM } from '../content/furniture.js';

const imgCache = {};
const loadImg = key => imgCache[key] || (imgCache[key] = new Promise(res => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = A.img[key] || ''; }));

/** Pictures you can start from: Mark's paintings and the episode pictures. */
export function posterBases() {
  return [...PAINTINGS.map(p => p[0]), ...Object.keys(A.img).filter(k => k.startsWith('sm_'))];
}

function caption(c, text, y, w, style, bottom) {
  if (!text) return;
  const t = style === 'meme' ? text.toUpperCase() : text;
  let size = Math.round(w * (style === 'meme' ? 0.085 : 0.06));
  c.font = style === 'meme' ? `900 ${size}px Impact, "Arial Black", sans-serif` : `${size}px "Courier New", monospace`;
  while (c.measureText(t).width > w * 0.92 && size > 10) { size -= 2; c.font = c.font.replace(/\d+px/, size + 'px'); }
  c.textAlign = 'center'; c.textBaseline = bottom ? 'bottom' : 'top';
  if (style === 'meme') { c.lineWidth = Math.max(2, size / 7); c.strokeStyle = '#000'; c.strokeText(t, w / 2, y); c.fillStyle = '#fff'; c.fillText(t, w / 2, y); }
  else {
    const tw = c.measureText(t).width + size, th = size * 1.4, x0 = w / 2 - tw / 2, y0 = bottom ? y - th : y;
    c.fillStyle = '#f1ead8'; c.save(); c.translate(w / 2, y0 + th / 2); c.rotate(bottom ? 0.012 : -0.015); c.fillRect(-tw / 2, -th / 2, tw, th); c.restore();
    c.fillStyle = '#1b1712'; c.fillText(t, w / 2, bottom ? y - size * 0.2 : y + size * 0.2);
  }
}

/** Draw a recipe into a canvas `w` pixels wide. */
export async function renderPoster(r, w = 512, sel = -1) {
  const base = await loadImg(r.base), a = base ? base.width / base.height : 1.5, h = Math.round(w / a);
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const c = cv.getContext('2d');
  if (base) c.drawImage(base, 0, 0, w, h); else { c.fillStyle = '#222'; c.fillRect(0, 0, w, h); }
  for (let i = 0; i < r.st.length; i++) {
    const s = r.st[i], im = await loadImg(s.k); if (!im) continue;
    const sw = s.s * w, sh = sw * im.height / im.width;
    c.drawImage(im, s.x * w - sw / 2, s.y * h - sh / 2, sw, sh);
    if (i === sel) { c.strokeStyle = '#8fe3c9'; c.lineWidth = 2; c.setLineDash([6, 4]); c.strokeRect(s.x * w - sw / 2, s.y * h - sh / 2, sw, sh); c.setLineDash([]); }
  }
  caption(c, r.top, h * 0.04, w, r.style, false);
  caption(c, r.bottom, h * 0.96, w, r.style, true);
  return cv;
}

/** Make sure every poster in the record has its image and its shop item (call before the flat is built). */
export async function preparePosters(record) {
  for (const r of record.posters || []) {
    const key = 'cp_' + r.id;
    if (!A.img[key]) { const cv = await renderPoster(r, 512); A.img[key] = cv.toDataURL('image/jpeg', 0.85); r.aspect = cv.width / cv.height; }
    if (!ITEM[key]) {
      const it = { id: key, img: key, name: `Your poster${r.top ? ': "' + r.top + '"' : ''}`, hu: 'saját poszter', price: 0, cosy: 3, kind: 'wall', size: 0.55, aspect: r.aspect || 1.5, custom: true };
      ITEM[key] = it; ITEMS.push(it);
    }
  }
}

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export const PRINT_PRICE = 10;

/** The maker, drawn into `body`. onPrint(recipe) is called when the player prints (pays) a poster. */
export function mountMaker(body, R, onPrint) {
  const rec = R.record; rec.posters = rec.posters || [];
  const bases = posterBases();
  const r = { id: 'p' + Date.now().toString(36), base: bases[0], top: '', bottom: '', style: 'meme', st: [] };
  let sel = -1, drag = null;
  body.innerHTML = `<div style="display:grid;grid-template-columns:minmax(0,1.25fr) minmax(0,1fr);gap:12px;align-items:start">
    <div><canvas id="pv" style="width:100%;border-radius:6px;background:#000;cursor:grab;touch-action:none"></canvas>
      <div class="btns" style="margin-top:6px"><button class="btn small" id="sm">Smaller</button><button class="btn small" id="bg">Bigger</button><button class="btn small" id="rm">Remove sticker</button>
      <button class="btn small" id="sty">Text: meme</button></div>
      <p class="sub" style="font-size:.8em;margin:4px 0">Click a sticker on the right to add it, then drag it on the picture. Click a sticker on the picture to select it.</p></div>
    <div><input id="tt" maxlength="40" placeholder="Top text" style="width:100%;margin-bottom:6px"><input id="bt" maxlength="40" placeholder="Bottom text" style="width:100%">
      <h4 style="margin:8px 0 4px">Picture</h4><div id="bs" style="display:flex;flex-wrap:wrap;gap:4px;max-height:110px;overflow:auto"></div>
      <h4 style="margin:8px 0 4px">Stickers</h4><div id="ss" style="display:flex;flex-wrap:wrap;gap:3px;max-height:150px;overflow:auto"></div>
      <div class="btns"><button class="btn primary" id="pr">Print it (${PRINT_PRICE} coins)</button></div><div class="sub" id="msg"></div></div></div>
    ${rec.posters.length ? `<h4 style="margin:10px 0 4px">Your posters (they stay yours even if you lose a life)</h4><div id="gal" style="display:flex;flex-wrap:wrap;gap:6px"></div>` : ''}`;
  const pv = body.querySelector('#pv');
  const draw = async () => { const cv = await renderPoster(r, 640, sel); pv.width = cv.width; pv.height = cv.height; pv.getContext('2d').drawImage(cv, 0, 0); };
  body.querySelector('#bs').innerHTML = bases.map(k => `<img data-b="${k}" src="${A.img[k]}" style="height:44px;border-radius:3px;cursor:pointer;outline:${k === r.base ? '2px solid #8fe3c9' : 'none'}">`).join('');
  body.querySelector('#ss').innerHTML = STICKERS.map(([n]) => `<img data-s="st_${n}" src="${A.img['st_' + n] || ''}" style="height:34px;cursor:pointer">`).join('');
  body.querySelectorAll('[data-b]').forEach(im => im.onclick = () => { r.base = im.dataset.b; body.querySelectorAll('[data-b]').forEach(x => x.style.outline = x === im ? '2px solid #8fe3c9' : 'none'); draw(); });
  body.querySelectorAll('[data-s]').forEach(im => im.onclick = () => { r.st.push({ k: im.dataset.s, x: 0.5, y: 0.5, s: 0.22 }); sel = r.st.length - 1; draw(); });
  body.querySelector('#tt').oninput = e => { r.top = e.target.value; draw(); };
  body.querySelector('#bt').oninput = e => { r.bottom = e.target.value; draw(); };
  // typing in the boxes must not reach the game's keys
  for (const id of ['#tt', '#bt']) body.querySelector(id).addEventListener('keydown', e => e.stopPropagation());
  body.querySelector('#sm').onclick = () => { if (sel >= 0) { r.st[sel].s = Math.max(0.06, r.st[sel].s * 0.85); draw(); } };
  body.querySelector('#bg').onclick = () => { if (sel >= 0) { r.st[sel].s = Math.min(0.9, r.st[sel].s * 1.18); draw(); } };
  body.querySelector('#rm').onclick = () => { if (sel >= 0) { r.st.splice(sel, 1); sel = -1; draw(); } };
  body.querySelector('#sty').onclick = e => { r.style = r.style === 'meme' ? 'zine' : 'meme'; e.target.textContent = 'Text: ' + r.style; draw(); };
  const at = ev => { const b = pv.getBoundingClientRect(); return { x: (ev.clientX - b.left) / b.width, y: (ev.clientY - b.top) / b.height }; };
  pv.onpointerdown = ev => {
    const p = at(ev), asp = pv.width / pv.height; sel = -1;
    for (let i = r.st.length - 1; i >= 0; i--) { const s = r.st[i]; if (Math.abs(p.x - s.x) < s.s / 2 && Math.abs(p.y - s.y) < s.s * asp / 2) { sel = i; break; } }
    if (sel >= 0) { drag = { dx: r.st[sel].x - p.x, dy: r.st[sel].y - p.y }; pv.setPointerCapture(ev.pointerId); }
    draw();
  };
  pv.onpointermove = ev => { if (!drag || sel < 0) return; const p = at(ev); r.st[sel].x = Math.max(0, Math.min(1, p.x + drag.dx)); r.st[sel].y = Math.max(0, Math.min(1, p.y + drag.dy)); draw(); };
  pv.onpointerup = () => { drag = null; };
  body.querySelector('#pr').onclick = () => {
    if (R.life.coins < PRINT_PRICE) { body.querySelector('#msg').textContent = 'Not enough coins.'; return; }
    R.life.coins -= PRINT_PRICE; const copy = JSON.parse(JSON.stringify(r)); rec.posters.push(copy);
    onPrint(copy);
    body.querySelector('#msg').textContent = 'Printed. It is in the box by the door.';
    r.id = 'p' + Date.now().toString(36);
  };
  const gal = body.querySelector('#gal');
  if (gal) Promise.all(rec.posters.map(async p => { const cv = await renderPoster(p, 200); return `<div style="text-align:center"><img src="${cv.toDataURL()}" style="height:70px;border-radius:3px"><br><button class="btn small" data-again="${esc(p.id)}">Print again (${PRINT_PRICE})</button></div>`; }))
    .then(h => { gal.innerHTML = h.join(''); gal.querySelectorAll('[data-again]').forEach(b => b.onclick = () => { if (R.life.coins < PRINT_PRICE) return; R.life.coins -= PRINT_PRICE; onPrint(rec.posters.find(p => p.id === b.dataset.again)); b.textContent = 'Printed'; }); });
  draw();
}
