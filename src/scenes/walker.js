// Shared base for the walking (3D) episodes made after Episode 2:
// player + collisions, optional flashlight with first-person arms, interaction prompt,
// line-of-sight checks, pause/quit/exit plumbing. Each episode builds its own map and story.
import * as THREE from 'three';
import { A, inst } from '../core/assets.js';
import { Player, Interactor, wasPressed, lockPointer } from '../core/player.js';
import { prompt, battery } from '../core/hud.js';
import { play, stopLoop, AU } from '../core/audio.js';

// The torch floats in the lower right of the view (no visible hands). Shared with Episode 1.
export function floatTorch(o) {
  const fl = inst('flashlight'); fl.name = 'heldFlash'; fl.scale.setScalar(0.62);
  fl.updateMatrixWorld(true); const box = new THREE.Box3().setFromObject(fl);
  fl.position.z = -box.max.z;                        // the model's head is at its -Z end: tail at the pivot, head forward
  const torch = new THREE.Group(); torch.add(fl);
  o.lens = new THREE.Mesh(new THREE.CircleGeometry(Math.max(0.012, (box.max.x - box.min.x) * 0.42), 10), new THREE.MeshBasicMaterial({ color: 0xfff6d8, fog: false }));
  o.lens.position.z = box.min.z - box.max.z - 0.002; o.lens.rotation.y = Math.PI; torch.add(o.lens);
  torch.traverse(m => { if (m.isMesh) { m.frustumCulled = false; if (m.material) m.material.fog = false; } });
  o.torch = torch; o.torchBase = new THREE.Vector3(0.155, -0.125, -0.27); torch.position.copy(o.torchBase); torch.rotation.set(0.1, 0.24, 0);
  o.vmCam.add(torch);
}
// follow the (invisible) arms' sway and bob
export function swayTorch(o) {
  if (!o.torch) return;
  const r = o.armsRoot, b = o.armsBase;
  o.torch.position.set(o.torchBase.x + (r.position.x - b.x), o.torchBase.y + (r.position.y - b.y), o.torchBase.z);
  o.torch.rotation.set(0.1 + r.rotation.x, 0.24 + (r.rotation.y - Math.PI), 0);
}

export class Walker {
  constructor(G) { this.G = G; this.playing = false; this.quitLabel = 'Back to the lab (progress is saved)'; this.loops = []; this.npcs = []; }

  newScene(bg = 0x050608, fogNear = 3, fogFar = 16) {
    const sc = this.scene = new THREE.Scene();
    sc.background = new THREE.Color(bg); sc.fog = new THREE.Fog(bg, fogNear, fogFar);
    const g = this.root = new THREE.Group(); sc.add(g);
    this.col = []; this.block = [];
    return g;
  }
  // player, optional flashlight + arms, interactor
  setupRig(o = {}) {
    const cam = this.G.camera; this.scene.add(cam);
    this.player = new Player(cam); this.player.boxes = this.col; this.player.stepVol = o.stepVol ?? 0.3;
    this.player.onBump = () => { };
    this.flash = new THREE.SpotLight(0xfff1d6, 0, 16, 0.5, 0.55, 1.2);
    this.flash.position.set(0.1, -0.1, -0.42); cam.add(this.flash); cam.add(this.flash.target); this.flash.target.position.set(-0.1, -0.25, -5);
    this.fill = new THREE.PointLight(0xc8d0ff, 0, 2.2, 1.5); cam.add(this.fill);
    this.hasArms = !!o.arms;
    if (this.hasArms) this.buildViewmodel();
    this.it = new Interactor(cam); this.it.blockers = this.block; this.it.ray.far = o.reach || 2.3;
    this.flashOn = false; this.hasFlash = !!o.flash; this.batt = 1; this.drain = o.drain || 0;
  }
  buildViewmodel() {
    const vm = this.vmScene = new THREE.Scene();
    this.vmCam = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.01, 5); vm.add(this.vmCam);
    this.vmAmb = new THREE.AmbientLight(0xffffff, 0.3); vm.add(this.vmAmb);
    this.vmKey = new THREE.DirectionalLight(0xfff1d6, 0.0); this.vmKey.position.set(0.3, 0.5, 1); vm.add(this.vmKey);
    const arms = A.models.arms;
    this.armsRoot = new THREE.Group(); this.armsRoot.add(arms);
    this.armsRoot.rotation.y = Math.PI; this.armsBase = new THREE.Vector3(-0.12, -1.64, 0.04); this.armsRoot.position.copy(this.armsBase);
    this.vmCam.add(this.armsRoot);
    this.mixer = new THREE.AnimationMixer(arms);
    const anims = A.anims.arms || [];
    const sub = (name, side) => { const c = anims.find(a => a.name === name); if (!c) return null; return new THREE.AnimationClip(name + '_' + side, c.duration, c.tracks.filter(t => { const b = t.name.split('.')[0]; return side === 'R' ? /R$/.test(b) : /L$/.test(b); })); };
    const hold = (clip, frac) => { if (!clip) return null; const a = this.mixer.clipAction(clip); a.play(); a.paused = true; a.time = clip.duration * frac; return a; };
    hold(sub('knife_idle', 'R'), 0.5); this.restL = hold(sub('rest', 'L'), 0);
    const gc = sub('grab.L', 'L');
    if (gc) { this.grabL = this.mixer.clipAction(gc); this.grabL.setLoop(THREE.LoopOnce, 1); }
    this.mixer.addEventListener('finished', e => { if (e.action === this.grabL) { this.grabL.stop(); if (this.restL) { this.restL.play(); this.restL.paused = true; } this.grabT = 0; } });
    this.lArm = arms.getObjectByName('upper_armL'); this.grabT = 0;
    this.mixer.update(0);
    arms.traverse(o => { if (o.isMesh) { o.frustumCulled = false; if (o.material) o.material.fog = false; } });
    // no visible hands: only the torch floats in view (the skinned arms still drive its sway)
    arms.traverse(o => { if (o.isSkinnedMesh) o.visible = false; });
    floatTorch(this);
    this.sway = { x: 0, y: 0, ly: 0, lp: 0 };
  }
  armPush() { if (!this.grabL) return; if (this.restL) this.restL.stop(); this.grabL.reset(); this.grabL.timeScale = 1.6; this.grabL.play(); this.grabT = this.grabL.getClip().duration / 1.6 + 0.05; }
  updateArms(dt, t) {
    if (!this.hasArms) return;
    const P = this.player, sw = this.sway;
    let dy = P.yaw - sw.ly; if (dy > Math.PI) dy -= Math.PI * 2; if (dy < -Math.PI) dy += Math.PI * 2;
    const dp = P.pitch - sw.lp; sw.ly = P.yaw; sw.lp = P.pitch;
    sw.x += (Math.max(-0.12, Math.min(0.12, dy * 2.2)) - sw.x) * Math.min(1, dt * 8);
    sw.y += (Math.max(-0.1, Math.min(0.1, dp * 2.2)) - sw.y) * Math.min(1, dt * 8);
    const bx = P.moving ? Math.cos(P.bob * 0.5) * 0.012 : 0, by = P.moving ? Math.abs(Math.sin(P.bob * 0.5)) * 0.014 : Math.sin(t * 1.3) * 0.004;
    this.armsRoot.position.set(this.armsBase.x + bx + sw.x * 0.25, this.armsBase.y - by - sw.y * 0.2, this.armsBase.z);
    this.armsRoot.rotation.set(-sw.y * 0.6, Math.PI + sw.x * 0.6, 0);
    if (this.grabT > 0) { this.armsRoot.position.y -= 0.035; this.armsRoot.rotation.x += 0.12; }
    swayTorch(this);
    this.mixer.update(dt);
    if (this.grabT > 0) this.grabT -= dt;
    if (this.lArm) this.lArm.scale.setScalar(this.grabT > 0 ? 1 : 0.001);
    this.lens.material.color.setScalar(this.flash.intensity > 0.5 ? 1 : 0.15);
  }
  // flashlight: F toggles; battery drains if this.drain > 0
  updateFlash(dt) {
    if (this.hasFlash && wasPressed('KeyF')) { this.flashOn = !this.flashOn; play('click', { vol: 0.4 }); }
    if (this.flashOn && this.drain) this.batt = Math.max(0.15, this.batt - dt * this.drain);
    let fI = this.flashOn ? 9 * (0.35 + 0.65 * Math.min(1, this.batt * 2.5)) : 0;
    if (this.flickerT > 0) { this.flickerT -= dt; fI *= Math.random() < 0.5 ? 0.15 : 1; }
    if (this.forceDark > 0) { this.forceDark -= dt; fI = 0; }
    this.flash.intensity = fI;
    if (this.hasArms) { this.vmKey.intensity = fI > 0 ? 1.2 : 0; this.vmAmb.intensity = 0.14 + (fI > 0 ? 0.2 : 0); }
    if (this.drain) battery(this.batt);
  }
  lineOfSight(from, to) {
    const d = to.clone().sub(from); const dist = d.length(); d.normalize();
    const rc = this._los || (this._los = new THREE.Raycaster()); rc.set(from, d); rc.far = dist;
    return rc.intersectObjects(this.block, false).length === 0;
  }
  interact() {
    const cur = this.it.update();
    prompt(cur ? this.it.label() : null);
    if (cur && wasPressed('KeyE')) cur.use();
  }
  vmRender(renderer) {
    if (!this.hasArms || !this.armsRoot.visible || !this.playing) return;
    this.vmCam.aspect = this.G.camera.aspect; this.vmCam.updateProjectionMatrix();
    renderer.autoClear = false; renderer.clearDepth(); renderer.render(this.vmScene, this.vmCam); renderer.autoClear = true;
  }
  resume() { lockPointer(); }
  quit() { this.save && this.save(); this.playing = false; this.G.goHub(); }
  exit() {
    this.playing = false; prompt(null);
    for (const id of this.loops) stopLoop(id);
    const cam = this.G.camera; cam.remove(this.flash); cam.remove(this.fill); cam.remove(this.flash.target);
  }
}
