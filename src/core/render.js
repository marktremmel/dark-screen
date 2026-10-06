import * as THREE from 'three';

export const R = { renderer: null, canvas: null, H: 270, W: 480 };
export const psxUniforms = { uSnap: { value: new THREE.Vector2(240, 135) } };

// Lambert material with PS1-style vertex snapping (wobble).
export function psxMat(opts = {}) {
  const o = { ...opts }; delete o.skinning;
  const m = new THREE.MeshLambertMaterial(o);
  m.onBeforeCompile = sh => {
    sh.uniforms.uSnap = psxUniforms.uSnap;
    sh.vertexShader = 'uniform vec2 uSnap;\n' + sh.vertexShader.replace(
      '#include <project_vertex>',
      '#include <project_vertex>\n  { vec4 sp = gl_Position; sp.xyz /= sp.w; sp.xy = floor(sp.xy * uSnap + 0.5) / uSnap; sp.xyz *= sp.w; gl_Position = sp; }'
    );
  };
  m.customProgramCacheKey = () => 'psx1';
  return m;
}

export function initRenderer() {
  const canvas = document.getElementById('view');
  const r = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'default', preserveDrawingBuffer: false });
  r.setPixelRatio(1);
  r.outputColorSpace = THREE.SRGBColorSpace;
  R.renderer = r; R.canvas = canvas;
  addEventListener('resize', resize);
  resize();
  return r;
}

export function resize(cam) {
  const aspect = innerWidth / Math.max(1, innerHeight);
  R.H = 270; R.W = Math.round(R.H * aspect);
  R.renderer.setSize(R.W, R.H, false);
  psxUniforms.uSnap.value.set(R.W / 2, R.H / 2);
  if (R.camera) { R.camera.aspect = aspect; R.camera.updateProjectionMatrix(); }
}

export function setBrightness(b, projector) {
  const v = b * (projector ? 1.25 : 1);
  R.canvas.style.filter = `brightness(${v.toFixed(2)})` + (projector ? ' contrast(1.08)' : '');
}
