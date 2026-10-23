// Small helpers for dressing the Mixamo-rigged NPC models (bones are named mixamorigHead, mixamorigNeck, ...).
import * as THREE from 'three';

export function bone(obj, name) { let b = null; obj.traverse(o => { if (!b && o.isBone && o.name === 'mixamorig' + name) b = o; }); return b; }

/** Hang `child` on a bone so it sits `offset` metres (in the model's own axes) from the bone's rest position,
 *  facing the way the model faces, at the model's scale. It then moves with that bone. Call in the rest pose. */
export function attach(obj, b, child, offset) {
  obj.updateMatrixWorld(true);
  const ow = new THREE.Vector3(), bw = new THREE.Vector3(); obj.getWorldScale(ow); b.getWorldScale(bw);
  const local = obj.worldToLocal(b.getWorldPosition(new THREE.Vector3())).add(offset);
  b.add(child); child.position.copy(b.worldToLocal(obj.localToWorld(local)));
  child.scale.set(ow.x / bw.x, ow.y / bw.y, ow.z / bw.z);
  child.quaternion.copy(b.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(obj.getWorldQuaternion(new THREE.Quaternion())));
  return child;
}

/** Hide a bone's part of the mesh (the head) by shrinking it; NPC.update keeps it shrunk after every animation frame. */
export function hideBone(npc, name) { const b = bone(npc.obj, name); if (b) { (npc.hidden = npc.hidden || []).push(b); b.scale.setScalar(0.001); } return b; }

/** Sit a model down by bending its legs (for models whose clips have no sitting pose). Call after npc.pose(...). */
export function sitDown(npc) {
  const o = npc.obj;
  for (const s of ['Left', 'Right']) {
    const up = bone(o, s + 'UpLeg'), leg = bone(o, s + 'Leg');
    if (up) up.rotation.x -= Math.PI / 2 * 0.95;
    if (leg) leg.rotation.x += Math.PI / 2 * 0.95;
  }
  const hips = bone(o, 'Hips'); if (hips) hips.position.y *= 0.62;
}
