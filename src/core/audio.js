import { A } from './assets.js';

export const AU = { ctx: null, master: null, sfx: null, mus: null, cur: null, curName: null, loops: {} };

export function initAudio() {
  const C = window.AudioContext || window.webkitAudioContext;
  AU.ctx = new C();
  AU.master = AU.ctx.createGain(); AU.master.connect(AU.ctx.destination);
  AU.sfx = AU.ctx.createGain(); AU.sfx.connect(AU.master);
  AU.mus = AU.ctx.createGain(); AU.mus.connect(AU.master);
  return AU.ctx;
}
export function resumeAudio() { if (AU.ctx && AU.ctx.state !== 'running') AU.ctx.resume(); }
export function setVolumes(master, music) {
  if (!AU.ctx) return;
  AU.master.gain.value = master; AU.mus.gain.value = music;
}

// play a one-shot (or loop). pos = [x,y,z] makes it positional.
export function play(name, o = {}) {
  const buf = A.audio[name]; if (!buf || !AU.ctx) return null;
  const src = AU.ctx.createBufferSource(); src.buffer = buf;
  src.loop = !!o.loop; src.playbackRate.value = o.rate || 1;
  const g = AU.ctx.createGain(); g.gain.value = o.vol == null ? 1 : o.vol;
  let node = g;
  if (o.pos) {
    const p = AU.ctx.createPanner();
    p.panningModel = 'equalpower'; p.distanceModel = 'inverse'; p.refDistance = 1.2; p.rolloffFactor = 1.2; p.maxDistance = 30;
    p.positionX.value = o.pos[0]; p.positionY.value = o.pos[1]; p.positionZ.value = o.pos[2];
    g.connect(p); node = p; src._panner = p;
  }
  node.connect(o.bus || AU.sfx);
  src.connect(g);
  src.start(0, o.offset || 0);
  const h = { src, gain: g, stop(fade = 0.05) { try { const t = AU.ctx.currentTime; g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(g.gain.value, t); g.gain.linearRampToValueAtTime(0, t + fade); src.stop(t + fade + 0.02); } catch (e) { } },
    setPos(x, y, z) { if (src._panner) { src._panner.positionX.value = x; src._panner.positionY.value = y; src._panner.positionZ.value = z; } } };
  return h;
}

export function loop(id, name, o = {}) {
  if (AU.loops[id]) return AU.loops[id];
  const h = play(name, { ...o, loop: true });
  if (h) AU.loops[id] = h;
  return h;
}
export function stopLoop(id, fade = 0.3) { const h = AU.loops[id]; if (h) { h.stop(fade); delete AU.loops[id]; } }
export function stopAllLoops() { for (const k of Object.keys(AU.loops)) stopLoop(k, 0.2); }

export function music(name, vol = 0.6, fade = 1.5) {
  if (AU.curName === name) return;
  if (AU.cur) { AU.cur.stop(fade); AU.cur = null; }
  AU.curName = name;
  if (!name) return;
  const h = play(name, { loop: true, vol: 0, bus: AU.mus });
  if (!h) return;
  const t = AU.ctx.currentTime; h.gain.gain.setValueAtTime(0, t); h.gain.gain.linearRampToValueAtTime(vol, t + fade);
  AU.cur = h;
}

export function updateListener(cam) {
  if (!AU.ctx) return;
  const L = AU.ctx.listener; const p = cam.getWorldPosition(_v); const d = cam.getWorldDirection(_d);
  if (L.positionX) {
    L.positionX.value = p.x; L.positionY.value = p.y; L.positionZ.value = p.z;
    L.forwardX.value = d.x; L.forwardY.value = d.y; L.forwardZ.value = d.z;
    L.upX.value = 0; L.upY.value = 1; L.upZ.value = 0;
  } else { L.setPosition(p.x, p.y, p.z); L.setOrientation(d.x, d.y, d.z, 0, 1, 0); }
}
import * as THREE from 'three';
const _v = new THREE.Vector3(), _d = new THREE.Vector3();

// ---------------- babble: a made-up "voice" for characters (no real words) ----------------
// Each speaker gets a pitch and a timbre; phone calls go through a narrow, crackly band.
const VOICES = {
  nagyi: { f: 225, v: 70, type: 'triangle', form: 1100, rate: 0.085, wob: 7 },
  mum: { f: 245, v: 60, type: 'triangle', form: 1300, rate: 0.075, wob: 3 },
  clone: { f: 245, v: 25, type: 'square', form: 1300, rate: 0.07, wob: 0, robot: true },
  woman: { f: 230, v: 55, type: 'triangle', form: 1250, rate: 0.075, wob: 2 },
  girl: { f: 300, v: 70, type: 'triangle', form: 1500, rate: 0.065, wob: 2 },
  boy: { f: 190, v: 55, type: 'sawtooth', form: 1150, rate: 0.065, wob: 2 },
  man: { f: 115, v: 35, type: 'sawtooth', form: 850, rate: 0.085, wob: 2 },
  oldman: { f: 120, v: 40, type: 'sawtooth', form: 800, rate: 0.095, wob: 6 },
};
export function voiceFor(who) {
  const w = (who || '').toLowerCase();
  if (/"mum"|the voice|answering machine/.test(w)) return 'clone';
  if (/nagyi/.test(w)) return 'nagyi';
  if (/mum|anya|kati/.test(w)) return 'mum';
  if (/feri|laci/.test(w)) return 'oldman';
  if (/a man|halmi|lawyer|officer|police|112|dispatcher/.test(w)) return 'man';
  if (/varga|nurse|erika|teacher|recorded voice/.test(w)) return 'woman';
  if (/bence|máté|mate|dani/.test(w)) return 'boy';
  if (/lili|zsófi|réka|reka|dóri|dori/.test(w)) return 'girl';
  return null;
}
let _bab = [];
export function babble(text, voice, o = {}) {
  if (!AU.ctx || !voice || !VOICES[voice]) return 0;
  const V = VOICES[voice], c = AU.ctx, t0 = c.currentTime + 0.03;
  for (const n of _bab) { try { n.stop(); } catch (e) { } } _bab = [];
  const words = String(text).replace(/\[[^\]]*\]|<[^>]+>/g, '').split(/\s+/).filter(Boolean);
  const syl = Math.min(34, Math.max(3, Math.round(words.join('').length / 3.1)));
  const out = c.createGain(); out.gain.value = o.vol ?? 0.16;
  let chain = out;
  if (o.phone) {
    const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 420;
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2600;
    out.connect(hp); hp.connect(lp); lp.connect(AU.sfx); out.gain.value *= 1.4;
    // line hiss
    const len = Math.ceil(c.sampleRate * (syl * V.rate * 1.5 + 0.4)); const buf = c.createBuffer(1, len, c.sampleRate); const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * 0.06;
    const ns = c.createBufferSource(); ns.buffer = buf; const ng = c.createGain(); ng.gain.value = 0.35; ns.connect(ng); ng.connect(hp); ns.start(t0); _bab.push(ns);
  } else out.connect(AU.sfx);
  let t = t0, wi = 0;
  for (let i = 0; i < syl; i++) {
    const dur = V.rate * (0.7 + Math.random() * 0.6);
    const osc = c.createOscillator(); osc.type = V.type;
    const f = V.f + (Math.random() - 0.4) * V.v * (V.robot ? 0.3 : 1);
    osc.frequency.setValueAtTime(f, t); osc.frequency.linearRampToValueAtTime(f * (0.9 + Math.random() * 0.2), t + dur);
    if (V.wob) { const lfo = c.createOscillator(); lfo.frequency.value = 7; const lg = c.createGain(); lg.gain.value = V.wob; lfo.connect(lg); lg.connect(osc.frequency); lfo.start(t); lfo.stop(t + dur + 0.02); _bab.push(lfo); }
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = V.form * (0.7 + Math.random() * 0.7); bp.Q.value = 3;
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(1, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(bp); bp.connect(g); g.connect(out); osc.start(t); osc.stop(t + dur + 0.02); _bab.push(osc);
    t += dur + 0.018;
    if (V.robot && i % 5 === 4) t += 0.0;                       // the clone never pauses for breath
    else if (Math.random() < 0.22) t += 0.09 + Math.random() * 0.08; // word gaps
    wi++;
  }
  return t - t0;
}
