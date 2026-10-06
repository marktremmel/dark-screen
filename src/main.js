import { babble, voiceFor } from './core/audio.js';
import * as THREE from 'three';
import { initRenderer, R } from './core/render.js';
import { initAudio, updateListener, resumeAudio, stopAllLoops, music, AU } from './core/audio.js';
import { ingestPack } from './core/assets.js';
import { initHUD, loading, hud, clearHUDText, caption } from './core/hud.js';
import { S, persist } from './core/state.js';
import { IN, clearPressed, lockPointer, unlockPointer } from './core/player.js';
import { titleScreen, calibrationScreen, applySettings, anyScreenOpen, pauseScreen } from './ui/screens.js';
import { Hub } from './scenes/hub.js';
import { Ep1 } from './scenes/ep1.js';
import { Ep2 } from './scenes/ep2.js';
import { Ep3 } from './scenes/ep3.js';
import { Ep4 } from './scenes/ep4.js';
import { Ep7 } from './scenes/ep7.js';
import { Ep6 } from './scenes/ep6.js';
import { Field } from './scenes/field.js';
import { Ep5 } from './scenes/ep5.js';
import { Ep9 } from './scenes/ep9.js';
import { Ep8 } from './scenes/ep8.js';
import { nextEp, epPos } from './text.js';

export const G = { scene: null, camera: null, t: 0, quiet: () => !!S.settings.quiet, expectUnlock: false, pauseEl: null };
window.SK_GAME = G; G.R = R; // for testing / teacher debugging

async function boot() {
  try {
    initRenderer();
    const ctx = initAudio();
    G.camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.04, 80); R.camera = G.camera;
    loading(true, 0, 'Loading the lab…');
    await ingestPack('core', ctx, f => loading(true, f * 0.5));
    await ingestPack('hub', ctx, f => loading(true, 0.5 + f * 0.5));
    initHUD(); applySettings();
    loading(false);
    requestAnimationFrame(frame);
    G.camera.position.set(0, 1.6, 3); // title backdrop
    await goHub(true);
    await titleScreen();
    if (!S.settings.calibrated) await calibrationScreen();
    G.scene.startPlaying && G.scene.startPlaying();
  } catch (e) {
    console.error(e);
    loading(true, 0, 'Something went wrong: ' + e.message + '. Make sure the "data" folder is next to index.html.');
  }
}

export async function switchScene(sc) {
  if (G.scene) { G.scene.exit && G.scene.exit(); }
  stopAllLoops(); clearHUDText();
  G.scene = sc; await sc.build(); sc.enter && sc.enter();
}
export async function goField() {
  unlock(); hud(false); loading(true, 0, 'Opening the door…');
  await ingestPack('field', AU.ctx, f => loading(true, f));
  loading(false); await switchScene(new Field(G));
}
export async function goHub(titleMode = false) { unlock(); await switchScene(new Hub(G, { titleMode })); }
export async function goEpisode(n) {
  unlock();
  hud(false); loading(true, 0, 'Loading episode ' + n + '…');
  await ingestPack('ep1', AU.ctx, f => loading(true, n === 1 ? f : f * 0.8));
  if (n === 2) await ingestPack('ep2', AU.ctx, f => loading(true, 0.8 + f * 0.2));
  if (n === 3) await ingestPack('ep3', AU.ctx, f => loading(true, 0.8 + f * 0.2));
  if (n === 4) await ingestPack('ep4', AU.ctx, f => loading(true, 0.8 + f * 0.2));
  if (n === 8) { for (const [k, i] of [['npc', 0], ['kit_school', 1], ['ep8', 2]]) await ingestPack(k, AU.ctx, f => loading(true, 0.8 + (i + f) * 0.066)); }
  if (n === 6) await ingestPack('ep6', AU.ctx, f => loading(true, 0.8 + f * 0.2));
  if (n === 5) await ingestPack('ep5', AU.ctx, f => loading(true, 0.8 + f * 0.2));
  if (n === 9) { for (const [k, i] of [['npc', 0], ['ep9', 1]]) await ingestPack(k, AU.ctx, f => loading(true, 0.8 + (i + f) * 0.1)); }
  if (n === 7) { for (const [k, i] of [['npc', 0], ['kit_school', 1], ['ep7', 2]]) await ingestPack(k, AU.ctx, f => loading(true, 0.8 + (i + f) * 0.066)); }
  loading(false);
  await switchScene(n === 6 ? new Ep6(G) : n === 5 ? new Ep5(G) : n === 9 ? new Ep9(G) : n === 8 ? new Ep8(G) : n === 7 ? new Ep7(G) : n === 4 ? new Ep4(G) : n === 3 ? new Ep3(G) : n === 2 ? new Ep2(G) : new Ep1(G));
}
G.goHub = goHub; G.goField = goField; G.goEpisode = goEpisode;
// "Play the next episode" buttons follow the play order, not the internal numbers
G.nextLabel = id => { const e = nextEp(id); return e ? `Play episode ${epPos(e.id)} now` : null; };
G.goNext = async id => { const e = nextEp(id); G.returnFrom = e.id; await goEpisode(e.id); };

export function unlock() { G.expectUnlock = true; unlockPointer(); setTimeout(() => { G.expectUnlock = false; }, 300); }
G.unlock = unlock;

// pause when the pointer is released (Esc) during play
S.onUnlock = () => { if (!G.expectUnlock && G.scene && G.scene.playing && !anyScreenOpen()) openPause(); };
addEventListener('keydown', e => {
  if (e.code === 'Escape' && G.scene && G.scene.playing && !anyScreenOpen()) { G.expectUnlock = true; unlockPointer(); openPause(); setTimeout(() => { G.expectUnlock = false; }, 300); }
});
function openPause() {
  S.paused = true; persist();
  G.pauseEl = pauseScreen({
    onResume: () => { S.paused = false; G.pauseEl = null; G.scene.resume ? G.scene.resume() : lockPointer(); },
    onQuit: () => { S.paused = false; G.pauseEl = null; G.scene.quit ? G.scene.quit() : goHub(); },
    quitLabel: G.scene.quitLabel,
  });
}
G.openPause = openPause;

// click the 3D view to capture the mouse
document.getElementById('view').addEventListener('click', () => {
  resumeAudio();
  if (G.scene && G.scene.playing && !anyScreenOpen() && !IN.locked) lockPointer();
});

let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000); last = now; G.t += dt;
  const sc = G.scene;
  if (sc) {
    if (!S.paused && !anyScreenOpen() || (sc.updateWhileOverlay && !S.paused)) sc.update(dt, G.t);
    else if (sc.idle) sc.idle(dt, G.t);
    R.renderer.render(sc.scene, G.camera);
    if (sc.vmRender) sc.vmRender(R.renderer);
    updateListener(G.camera);
  }
  clearPressed();
}

// dialogue panels (<p><b>Who:</b> text</p>) get a babble voice when they appear
new MutationObserver(muts => {
  for (const m of muts) for (const n of m.addedNodes) {
    if (n.nodeType !== 1) continue;
    const ps = n.matches && n.matches('p') ? [n] : [...n.querySelectorAll('.panel p')];
    const p = ps.find(x => x.firstElementChild && x.firstElementChild.tagName === 'B' && /:\s*$/.test(x.firstElementChild.textContent));
    if (!p) continue;
    const who = p.firstElementChild.textContent.replace(/[:📞]/g, '').trim(); const v = voiceFor(who);
    if (v) babble(p.textContent.slice(p.firstElementChild.textContent.length), v, { phone: /📞|phone/.test(p.firstElementChild.textContent) || p.style.color !== '' });
    return;
  }
}).observe(document.getElementById('overlay'), { childList: true, subtree: true });

boot();
