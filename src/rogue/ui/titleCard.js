// A painted title card before a stage: Mark's painting full screen, a title, then it fades into the scene.
import { A } from '../../core/assets.js';
import { skipWait } from './skip.js';

/** Show the card; resolves after `secs`, then fades out by itself (the scene builds underneath meanwhile). */
export function titleCard(img, title, sub = '', secs = 2.6) {
  const src = A.img[img]; if (!src) return Promise.resolve();
  const el = document.createElement('div');
  el.style.cssText = 'position:fixed;inset:0;z-index:60;background:#000 center/cover no-repeat;opacity:0;transition:opacity .6s;display:flex;flex-direction:column;justify-content:flex-end;padding:0 6vw 9vh;pointer-events:none';
  el.style.backgroundImage = `linear-gradient(to top, rgba(0,0,0,.85), rgba(0,0,0,0) 45%), url(${src})`;
  el.innerHTML = `<div style="font-family:m5x7,monospace;font-size:clamp(34px,5vw,64px);color:#f2e6cf;letter-spacing:2px;text-shadow:0 2px 12px #000">${title}</div>${sub ? `<div style="font-size:clamp(15px,1.6vw,20px);color:#cbbfa8;margin-top:6px;max-width:60ch;text-shadow:0 1px 8px #000">${sub}</div>` : ''}`;
  document.body.appendChild(el);
  requestAnimationFrame(() => { el.style.opacity = '1'; });
  return skipWait(secs).then(() => { el.style.transition = 'opacity .9s'; el.style.opacity = '0'; setTimeout(() => el.remove(), 1000); });
}
