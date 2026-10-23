// Shop pictures: each furniture model rendered once into a small image (cached), posters use their painting.
import * as THREE from 'three';
import { A, inst } from '../../core/assets.js';
import { R } from '../../core/render.js';

const cache = {};
let scene, cam, rt;
export function thumb(item) {
  if (item.img) return A.img[item.img] || '';
  if (cache[item.id]) return cache[item.id];
  if (!scene) {
    scene = new THREE.Scene(); scene.background = new THREE.Color(0x15131c);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x404040, 2.2)); const d = new THREE.DirectionalLight(0xffffff, 1.4); d.position.set(2, 3, 4); scene.add(d);
    cam = new THREE.PerspectiveCamera(32, 1, 0.01, 50); rt = new THREE.WebGLRenderTarget(96, 96); rt.texture.colorSpace = THREE.SRGBColorSpace;
  }
  const o = inst(item.model); if (!A.models[item.model]) return '';
  scene.add(o);
  const b = new THREE.Box3().setFromObject(o), s = b.getSize(new THREE.Vector3()), c = b.getCenter(new THREE.Vector3()), r = Math.max(s.x, s.y, s.z) || 1;
  cam.position.set(c.x + r * 1.1, c.y + r * 0.75, c.z + r * 1.5); cam.lookAt(c); cam.updateMatrixWorld();
  const rd = R.renderer, prev = rd.getRenderTarget();
  rd.setRenderTarget(rt); rd.render(scene, cam);
  const px = new Uint8Array(96 * 96 * 4); rd.readRenderTargetPixels(rt, 0, 0, 96, 96, px); rd.setRenderTarget(prev);
  scene.remove(o);
  const cv = document.createElement('canvas'); cv.width = cv.height = 96; const g = cv.getContext('2d'), im = g.createImageData(96, 96);
  for (let y = 0; y < 96; y++) im.data.set(px.subarray((95 - y) * 96 * 4, (96 - y) * 96 * 4), y * 96 * 4);   // flip: GL reads bottom-up
  g.putImageData(im, 0, 0);
  return (cache[item.id] = cv.toDataURL());
}
