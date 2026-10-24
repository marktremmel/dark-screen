// Camera effects for Lépcsőház (v0.19, after Mark's v0.18 feedback: "grain way too strong ... made me think of a little
// motion blur, depth of field especially when peeking behind corners, vignette, chromatic").
// The picture is drawn at 270 lines into a render target, then one small shader pass adds:
//  - motion blur: the last frames linger a little while you turn (more the faster you turn)
//  - depth of field: when something is close in front of you (a wall edge, a door frame), the far background softens
//  - chromatic aberration: colour fringes towards the edges, very slight
//  - vignette and a faint film grain (centred, so it does not lighten the dark)
// The torch and arms are drawn afterwards, on top, so they stay sharp. A setting turns all of it off.
// Cost: two full-screen passes at 480 x 270, which is nothing next to the scene itself.
import * as THREE from 'three';
import { S } from '../../core/state.js';

let rtScene = null, accA = null, accB = null, quadScene, quadCam, blendMat, finalMat, quad, lastQ = null, blur = 0;
const FS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy * 2.0, 0.0, 1.0); }';

function setup(w, h) {
  [rtScene, accA, accB].forEach(r => r && r.dispose());
  const opt = { type: THREE.HalfFloatType, magFilter: THREE.LinearFilter, minFilter: THREE.LinearFilter };   // half float: no banding in the dark
  rtScene = new THREE.WebGLRenderTarget(w, h, { ...opt, magFilter: THREE.NearestFilter, minFilter: THREE.NearestFilter, depthTexture: new THREE.DepthTexture(w, h) });
  accA = new THREE.WebGLRenderTarget(w, h, opt); accB = new THREE.WebGLRenderTarget(w, h, opt);
  if (quadScene) return;
  quadScene = new THREE.Scene(); quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  quad = new THREE.Mesh(new THREE.PlaneGeometry(1, 1)); quad.frustumCulled = false; quadScene.add(quad);
  blendMat = new THREE.ShaderMaterial({
    uniforms: { tCur: { value: null }, tPrev: { value: null }, uK: { value: 0 } }, vertexShader: FS, depthTest: false, depthWrite: false,
    fragmentShader: 'uniform sampler2D tCur; uniform sampler2D tPrev; uniform float uK; varying vec2 vUv; void main(){ gl_FragColor = mix(texture2D(tCur, vUv), texture2D(tPrev, vUv), uK); }',
  });
  finalMat = new THREE.ShaderMaterial({
    uniforms: { tCol: { value: null }, tDepth: { value: null }, uNear: { value: 0.05 }, uFar: { value: 100 }, uRes: { value: new THREE.Vector2(w, h) }, uT: { value: 0 },
      uGrain: { value: 0.022 }, uVig: { value: 0.5 }, uCA: { value: 0.0005 }, uDof: { value: 1 } },
    vertexShader: FS, depthTest: false, depthWrite: false,
    fragmentShader: `
      uniform sampler2D tCol; uniform sampler2D tDepth; uniform float uNear; uniform float uFar; uniform vec2 uRes; uniform float uT;
      uniform float uGrain; uniform float uVig; uniform float uCA; uniform float uDof; varying vec2 vUv;
      float lin(vec2 uv){ float z = texture2D(tDepth, uv).x * 2.0 - 1.0; return 2.0 * uNear * uFar / (uFar + uNear - z * (uFar - uNear)); }
      vec3 col(vec2 uv, vec2 d){ return vec3(texture2D(tCol, uv + d).r, texture2D(tCol, uv).g, texture2D(tCol, uv - d).b); }
      float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233)) + uT) * 43758.5453); }
      void main(){
        vec2 c = vUv - 0.5, ca = c * dot(c, c) * uCA * 40.0;
        // depth of field: focus on what is in the middle of the view; only when it is close does the rest soften
        float f = (lin(vec2(0.5)) + lin(vec2(0.47, 0.5)) + lin(vec2(0.53, 0.5)) + lin(vec2(0.5, 0.46)) + lin(vec2(0.5, 0.54))) / 5.0;
        float near = smoothstep(3.2, 1.0, f) * uDof, d = lin(vUv);
        float r = clamp(abs(d - f) / max(f, 0.3) - 0.35, 0.0, 1.0) * near * 2.2;
        vec3 o = col(vUv, ca);
        if (r > 0.05) {
          vec2 px = r / uRes; vec3 acc = o;
          acc += col(vUv + vec2( 1.0, 0.0) * px, ca); acc += col(vUv + vec2(-1.0, 0.0) * px, ca);
          acc += col(vUv + vec2( 0.0, 1.0) * px, ca); acc += col(vUv + vec2( 0.0,-1.0) * px, ca);
          acc += col(vUv + vec2( 0.7, 0.7) * px, ca); acc += col(vUv + vec2(-0.7, 0.7) * px, ca);
          acc += col(vUv + vec2( 0.7,-0.7) * px, ca); acc += col(vUv + vec2(-0.7,-0.7) * px, ca);
          o = acc / 9.0;
        }
        float v = smoothstep(0.35, 0.85, length(c * vec2(1.3, 1.0)));
        o *= 1.0 - v * uVig;
        gl_FragColor = vec4(max(o, 0.0), 1.0);
        #include <colorspace_fragment>
        gl_FragColor.rgb += (h(floor(gl_FragCoord.xy) + floor(uT * 12.0)) - 0.5) * uGrain;   // after the sRGB step: in linear the dark parts blew the grain up
      }`,
  });
}

/** Draw the scene with the effects. Returns false when the effects are off (the caller then draws normally). */
export function postRender(renderer, scene, camera, dt) {
  if (S.settings.post === false) return false;
  const size = renderer.getDrawingBufferSize(new THREE.Vector2()), w = size.x, h = size.y;
  if (!rtScene || rtScene.width !== w || rtScene.height !== h) setup(w, h);
  // how fast the view is turning: that sets the motion blur
  const q = camera.quaternion; let turn = 0;
  if (lastQ) turn = 2 * Math.acos(Math.min(1, Math.abs(lastQ.dot(q)))) / Math.max(dt, 1 / 120);
  lastQ = (lastQ || new THREE.Quaternion()).copy(q);
  const bs = S.settings.blur == null ? 1 : S.settings.blur;   // v0.22: strength sliders in Settings (0 to 2, 1 is the v0.19 look)
  blur += (Math.min(0.85, turn * 0.09 * bs) - blur) * Math.min(1, dt * 12);
  renderer.setRenderTarget(rtScene); renderer.render(scene, camera);
  quad.material = blendMat; blendMat.uniforms.tCur.value = rtScene.texture; blendMat.uniforms.tPrev.value = accB.texture; blendMat.uniforms.uK.value = blur;
  renderer.setRenderTarget(accA); renderer.render(quadScene, quadCam);
  quad.material = finalMat; const U = finalMat.uniforms;
  U.tCol.value = accA.texture; U.tDepth.value = rtScene.depthTexture; U.uNear.value = camera.near; U.uFar.value = camera.far; U.uRes.value.set(w, h); U.uT.value = (performance.now() / 1000) % 100;
  U.uGrain.value = S.settings.grain === false ? 0 : 0.03; U.uDof.value = S.settings.dof == null ? 1 : S.settings.dof;
  renderer.setRenderTarget(null); renderer.render(quadScene, quadCam);
  const t = accA; accA = accB; accB = t;
  return true;
}
export function resetPost() { lastQ = null; blur = 0; }
