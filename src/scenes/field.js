// The easter egg after the finale: a grassy field at sunset, the panel blocks far away, and an old computer
// that links to "Still Alive". Reached after Tükörkép, and from the lab door once the series is finished.
import * as THREE from 'three';
import { A, inst, tex } from '../core/assets.js';
import { psxMat } from '../core/render.js';
import { canvasTex, place } from '../core/world.js';
import { lockPointer } from '../core/player.js';
import { hud, hudParts, objective, caption, fade } from '../core/hud.js';
import { music, loop, play, stopLoop } from '../core/audio.js';
import { openScreen, closeScreen } from '../ui/screens.js';
import { Walker } from './walker.js';

const SONG_ID = 'Y6ljFaKRTrI', SONG = 'https://www.youtube.com/watch?v=' + SONG_ID;

export class Field extends Walker {
  async build() {
    const g = this.newScene(0xe8a088, 45, 230);
    // sky: a dome for the zenith, then the painted sunset (Craftpix "Clouds 7") on cylinders: background, glow, two cloud bands
    const sky = new THREE.Mesh(new THREE.SphereGeometry(300, 24, 12), new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `varying vec3 vD;
        void main(){ float h = clamp(vD.y, -0.2, 1.0);
          vec3 c = mix(vec3(0.84, 0.26, 0.17), vec3(0.406, 0.209, 0.387), smoothstep(-0.05, 0.1, h));   // linear values that match the painted sky's top edge
          c = mix(c, vec3(0.16, 0.10, 0.24), smoothstep(0.5, 1.0, h));
          gl_FragColor = vec4(c, 1.0);
          #include <colorspace_fragment>
        }`,
    }));
    sky.renderOrder = -10; this.scene.add(sky);
    this.skyRings = [];
    const ring = (key, r, y0, hgt, rep, speed, transparent) => {
      const t = tex(key, rep, 1); if (!t) return; t.wrapT = THREE.ClampToEdgeWrapping;
      const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, hgt, 64, 1, true), new THREE.MeshBasicMaterial({ map: t, side: THREE.BackSide, fog: false, transparent, depthWrite: false, alphaTest: transparent ? 0.02 : 0 }));
      m.position.y = y0 + hgt / 2; m.renderOrder = -9 + this.skyRings.length; this.scene.add(m); this.skyRings.push({ m, speed });
    };
    ring('sky_1', 270, -24, 150, 5, 0, false);
    ring('sky_2', 262, -24, 150, 5, 0, true);
    ring('sky_3', 255, -24, 150, 4, 0.004, true);
    ring('sky_4', 248, -30, 150, 3, -0.007, true);
    this.scene.add(new THREE.HemisphereLight(0xffd6b8, 0x8a8a5a, 2.1));
    const sunL = new THREE.DirectionalLight(0xffb27a, 1.5); sunL.position.set(-10, 9, -60); this.scene.add(sunL);
    // ground
    const gt = tex('grass', 90, 90);
    gt.minFilter = THREE.LinearMipmapLinearFilter; gt.anisotropy = 4;
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400, 40, 40), new THREE.MeshLambertMaterial({ map: gt, color: 0xe0e894 })); ground.rotation.x = -Math.PI / 2; g.add(ground);
    // plants from the Quaternius Stylized Nature kit, instanced so thousands of them stay cheap
    const rnd = (a, b) => a + Math.random() * (b - a);
    const calmCache = new Map();
    const calm = m => { if (!calmCache.has(m)) { if (m.map) { m.map.minFilter = THREE.LinearMipmapLinearFilter; m.map.needsUpdate = true; } calmCache.set(m, new THREE.MeshLambertMaterial({ map: m.map, color: m.color, alphaTest: m.alphaTest, side: THREE.DoubleSide })); } return calmCache.get(m); };
    const scatter = (key, n, pick, sMin, sMax) => {
      const src = A.models[key]; if (!src) return [];
      const pts = []; for (let i = 0; i < n; i++) { const p = pick(i); if (p) pts.push({ x: p[0], z: p[1], s: rnd(sMin, sMax), r: Math.random() * Math.PI * 2 }); }
      src.updateMatrixWorld(true);
      src.traverse(c => {
        if (!c.isMesh) return;
        const im = new THREE.InstancedMesh(c.geometry, calm(c.material), pts.length); const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
        pts.forEach((p, i) => { q.setFromAxisAngle(up, p.r); m4.compose(new THREE.Vector3(p.x, 0, p.z), q, new THREE.Vector3(p.s, p.s, p.s)).multiply(c.matrixWorld); im.setMatrixAt(i, m4); });
        im.frustumCulled = false; g.add(im);
      });
      return pts;
    };
    const clear = (x, z) => Math.hypot(x - 0, z + 1) < 3.2 || Math.hypot(x - 2.2, z + 4) < 1.6 || Math.hypot(x + 3, z - 2) < 1.6; // spawn, computer, door
    const disc = (r0, r1, f) => () => { for (let k = 0; k < 20; k++) { const a = Math.random() * Math.PI * 2, r = Math.sqrt(rnd(r0 * r0, r1 * r1)), x = Math.cos(a) * r, z = Math.sin(a) * r; if (!clear(x, z) && (!f || f(x, z))) return [x, z]; } return null; };
    const sunView = (x, z) => !(z < -8 && Math.abs(x) < z * -0.35);          // keep a wedge open towards the sunset
    scatter('nat_grass_wispy_tall', 520, disc(1, 45), 0.22, 0.42);
    scatter('nat_grass_common_tall', 320, disc(1, 45), 0.2, 0.36);
    scatter('nat_clover_1', 120, disc(1, 30), 0.35, 0.6);
    scatter('nat_plant_7_big', 70, disc(2, 35), 0.5, 0.9);
    // flower meadows in patches
    for (let k = 0; k < 11; k++) { const a = Math.random() * Math.PI * 2, r = rnd(4, 26), cx = Math.cos(a) * r, cz = Math.sin(a) * r;
      scatter(k % 2 ? 'nat_flower_3_group' : 'nat_flower_4_group', 14, () => { const x = cx + rnd(-3, 3), z = cz + rnd(-3, 3); return clear(x, z) ? null : [x, z]; }, 0.28, 0.45); }
    scatter('nat_bush_common_flowers', 26, disc(7, 45, sunView), 0.7, 1.2);
    scatter('nat_bush_common', 30, disc(8, 60, sunView), 0.8, 1.4);
    const rocks = [...scatter('nat_rock_medium_1', 8, disc(6, 40, sunView), 0.4, 0.8), ...scatter('nat_rock_medium_2', 8, disc(6, 40, sunView), 0.4, 0.8)];
    // trees: loose groves around the meadow, pines further back, the sunset left open
    const groves = [];
    for (let k = 0; k < 9; k++) { const a = Math.PI * 0.25 + k * (Math.PI * 1.5 / 8) + rnd(-0.2, 0.2), r = rnd(16, 38); groves.push([Math.cos(a) * r, Math.sin(a) * r]); }
    const inGrove = () => { const c = groves[Math.floor(Math.random() * groves.length)]; return [c[0] + rnd(-7, 7), c[1] + rnd(-7, 7)]; };
    const trees = [...scatter('nat_commontree_1', 14, inGrove, 0.8, 1.15), ...scatter('nat_commontree_2', 14, inGrove, 0.8, 1.15), ...scatter('nat_commontree_3', 10, inGrove, 0.75, 1.1),
      ...scatter('nat_pine_2', 22, disc(45, 85, sunView), 1.0, 1.5)];
    for (const t of [...trees, ...rocks]) { const w = 0.35 * t.s + (rocks.includes(t) ? 0.6 * t.s : 0); this.col.push({ x0: t.x - w, x1: t.x + w, z0: t.z - w, z1: t.z + w }); }
    // a stepping-stone path from where you arrive to the computer and to the door
    const path = (x0, z0, x1, z1, n) => { for (let i = 1; i <= n; i++) { const f = i / (n + 1), m = inst(i % 2 ? 'nat_rockpath_round_small_1' : 'nat_rockpath_round_wide'); m.position.set(x0 + (x1 - x0) * f + rnd(-0.15, 0.15), 0.01, z0 + (z1 - z0) * f + rnd(-0.15, 0.15)); m.rotation.y = Math.random() * 6; m.scale.setScalar(0.45); g.add(m); } };
    path(0, 0, 2.2, -4, 4); path(0, 0, -3, 2, 3);
    // the panel blocks on the horizon, with a few lit windows
    const facade = canvasTex(64, 96, (c, w, h) => { c.fillStyle = '#4a3444'; c.fillRect(0, 0, w, h); for (let y = 4; y < h - 4; y += 8) for (let x = 3; x < w - 3; x += 7) { const lit = Math.random() < 0.18; c.fillStyle = lit ? (Math.random() < 0.5 ? '#ffd890' : '#ffb870') : '#2e2230'; c.fillRect(x, y, 4, 4); } });
    facade.magFilter = THREE.NearestFilter;
    for (let i = 0; i < 9; i++) {
      const a = Math.PI * 1.75 + i * (Math.PI * 1.5 / 8), r = 125 + Math.random() * 25, x = Math.cos(a) * r, z = Math.sin(a) * r;
      const h = 24 + Math.random() * 14, w = 26 + Math.random() * 14;
      const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, 12), new THREE.MeshBasicMaterial({ map: facade, color: 0xd8b8c0, fog: true })); b.position.set(x, h / 2, z); b.lookAt(0, h / 2, 0); g.add(b);
    }
    // fireflies
    const n = 80, pos = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, r = 4 + Math.random() * 18; pos[i * 3] = Math.cos(a) * r; pos[i * 3 + 1] = 0.3 + Math.random() * 1.6; pos[i * 3 + 2] = Math.sin(a) * r; }
    const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const dot = canvasTex(8, 8, (c) => { c.fillStyle = '#fff6c0'; c.beginPath(); c.arc(4, 4, 3, 0, Math.PI * 2); c.fill(); });
    this.flies = new THREE.Points(pg, new THREE.PointsMaterial({ color: 0xfff0a0, map: dot, alphaTest: 0.5, size: 0.06, fog: false, transparent: true, opacity: 0.9, depthWrite: false })); g.add(this.flies);
    // an old computer on a stool, playing a song, and the lab door, standing alone in the grass
    const stool = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.5), psxMat({ color: 0x6a4a32 })); stool.position.set(2.2, 0.3, -4); g.add(stool); this.col.push({ x0: 1.9, x1: 2.5, z0: -4.25, z1: -3.75 });
    this.pc = place(g, 'pcretro', 2.25, 0.6, -4, -20);
    this.pcTex = canvasTex(64, 48, (c, w, h) => { c.fillStyle = '#0a1a10'; c.fillRect(0, 0, w, h); c.fillStyle = '#ffb000'; c.font = '16px m5x7'; c.textBaseline = 'top'; c.fillText('STILL', 6, 6); c.fillText('ALIVE ♪', 6, 22); });
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.336, 0.266), new THREE.MeshBasicMaterial({ map: this.pcTex, fog: false })); scr.position.set(-0.057, 0.243, 0.104); this.pc.add(scr);
    this.door = place(g, 'door', -3, 0, 2, 160);
    { const fr = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.25, 0.08), psxMat({ color: 0x2a3a2a })); fr.position.set(-3, 2.2, 2); fr.rotation.y = 160 * Math.PI / 180; g.add(fr);
      const sign = canvasTex(64, 16, (c, w, h) => { c.fillStyle = '#1f3a2c'; c.fillRect(0, 0, w, h); c.fillStyle = '#e8efe9'; c.font = '16px m5x7'; c.textBaseline = 'top'; c.fillText('ROOM 214', 6, -1); });
      const sp = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.22), new THREE.MeshBasicMaterial({ map: sign })); sp.position.set(-3, 2.2, 2); sp.rotation.y = 160 * Math.PI / 180; sp.translateZ(0.05); g.add(sp); }
    this.setupRig({ arms: false, flash: false, stepVol: 0.35, reach: 2.6 });
    this.player.stepSounds = ['gstep1', 'gstep2', 'gstep3', 'gstep4'];
    this.it.add(this.pc, 'An old computer: "Still Alive" ♪', () => this.song());
    this.it.add(this.door, 'The door of Room 214: back to the lab', () => this.back());
  }
  async enter() {
    this.playing = false; hud(false);
    this.G.camera.far = 400; this.G.camera.updateProjectionMatrix();
    this.player.set(0, 1, 0);
    loop('woods', 'amb_woods', { vol: 0.4 }); this.loops.push('woods');
    music('mus_field', 0.32); this.birdT = 4;
    await fade(false, '', 2.5);
    this.playing = true; hud(true); hudParts({ checklist: false, status: false, eye: false, batt: false });
    objective('');
    caption('Outside. Warm air, birds, the blocks far away in the sunset. Somewhere, a computer is playing a song.', 'say', 6);
    lockPointer();
  }
  song() {
    this.playing = false; this.G.unlock();
    // Played from the web (e.g. GitHub Pages) the song plays right here in a YouTube player. From a local file
    // YouTube refuses embeds, so the button opens it in a new tab instead. The song itself is never bundled.
    const web = /^https?:$/.test(location.protocol);
    if (web) { music(null); this.loops.forEach(id => stopLoop(id)); }
    const el = openScreen(`<div class="panel" style="width:min(640px,94vw);max-height:94vh;overflow:auto;text-align:center"><h2 style="margin:0 0 8px">♪ Still Alive</h2>
      ${web ? `<div style="position:relative;width:min(100%,calc((94vh - 220px)*16/9));margin:0 auto;aspect-ratio:16/9;border-radius:10px;overflow:hidden;background:#000"><iframe src="https://www.youtube-nocookie.com/embed/${SONG_ID}?autoplay=1&rel=0" title="Still Alive" style="position:absolute;inset:0;width:100%;height:100%;border:0" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe></div>` : ''}
      <p>Thank you for playing <b>Sötét Képernyő</b>.</p><p class="sub">Jonathan Coulton's "Still Alive" from the game Portal (Valve, 2007)${web ? '' : ', on YouTube in a new tab (needs internet)'}.</p>
      <div class="btns" style="justify-content:center">${web ? '' : '<button class="btn primary" id="yt">Play the song</button>'}<button class="btn ${web ? 'primary' : ''}" id="x">Back to the field</button></div></div>`);
    const yt = el.querySelector('#yt'); if (yt) yt.onclick = () => { window.open(SONG, '_blank', 'noopener'); };
    el.querySelector('#x').onclick = () => {
      closeScreen(el); this.playing = true; lockPointer();
      if (web) { loop('woods', 'amb_woods', { vol: 0.4 }); music('mus_field', 0.32); }
    };
  }
  async back() { this.playing = false; play('door_open', { vol: 0.5 }); await fade(true, '', 1.2); await this.G.goHub(); await fade(false, '', 1); }
  exit() { super.exit(); this.G.camera.far = 80; this.G.camera.updateProjectionMatrix(); }
  update(dt, t) {
    if (this.flies) { const p = this.flies.geometry.attributes.position; for (let i = 0; i < p.count; i++) p.setY(i, p.getY(i) + Math.sin(t * 1.3 + i) * 0.003); p.needsUpdate = true; this.flies.material.opacity = 0.6 + Math.sin(t * 3) * 0.3; }
    for (const r of this.skyRings || []) r.m.rotation.y += r.speed * dt;
    this.birdT -= dt; if (this.birdT < 0) { this.birdT = 9 + Math.random() * 14; play('bird', { vol: 0.12 + Math.random() * 0.12, rate: 0.85 + Math.random() * 0.3 }); }
    if (!this.playing) return;
    this.player.update(dt);
    this.interact();
  }
}
