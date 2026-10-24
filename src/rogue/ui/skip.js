// v0.15 "skip intro": the black text screens and the painted title cards between stages can be skipped with
// Space, Enter or a click. Repeat nights were slow (Mark's list, item 6); first-time players still see everything,
// because nothing is skipped unless they press.
let hint = null;
function showHint(on) {
  if (!hint) { hint = document.createElement('div'); hint.style.cssText = 'position:fixed;right:18px;bottom:30px;z-index:70;font:14px m5x7,monospace;color:#cbbfa8;opacity:.75;pointer-events:none;letter-spacing:1px'; hint.textContent = 'Space: skip (átugrás)'; document.body.appendChild(hint); }
  hint.style.display = on ? 'block' : 'none';
}
/** Wait `secs`, or less if the player presses Space / Enter or clicks. */
export function skipWait(secs) {
  return new Promise(res => {
    let done = false;
    const end = () => { if (done) return; done = true; clearTimeout(t); removeEventListener('keydown', key, true); removeEventListener('mousedown', end, true); showHint(false); res(); };
    const key = e => { if (e.code === 'Space' || e.key === 'Enter' || e.key === 'Escape') { e.preventDefault(); end(); } };
    const t = setTimeout(end, secs * 1000);
    setTimeout(() => { if (!done) { addEventListener('keydown', key, true); addEventListener('mousedown', end, true); showHint(true); } }, 250);   // a key still held from the last screen does not skip this one
  });
}
