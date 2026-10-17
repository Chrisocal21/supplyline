// The town model's material while a town grows: a wave runs out from the centre (uWave, in model units). The old
// town's buildings sink as it reaches them and the new town's rise behind it, each building as one piece (the `anc`
// anchor every part carries, see Parts.anchor), with a little overshoot as it lands.
import * as THREE from 'three';
import { R } from './geo';

/** How long a town takes to grow on screen, in milliseconds. */
export const GROW_MS = 8500;

/**
 * `local` limits the change to the parts standing at one spot (a district's landmark): the rest of the model stays as it
 * is, and uWave runs 0..1 on the same timeline as building work: the old one sinks, then the new one rises.
 */
export function growMaterial(base: THREE.Material, old: boolean, local?: { cx: number; cz: number; r: number }): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.82, metalness: 0.05 });
  const wave = { value: -1 };
  m.userData.wave = wave;
  // The model is bent to follow the globe (see bendToGlobe in townmodel.ts): this is the ground under each point.
  const bend = (2 * (R + 0.3)).toFixed(4);
  const f = (n: number): string => n.toFixed(4);
  const near = local ? `length(anc - vec2(${f(local.cx)}, ${f(local.cz)})) < ${f(local.r)}` : 'false';
  const scale = local
    ? old
      ? `float s = ${near} ? 1.0 - smoothstep(0.32, 0.42, uWave) : 1.0;`
      : `float k = clamp((uWave - 0.42) / 0.38, 0.0, 1.0); float s = ${near} ? max(0.0, 1.0 - 2.6 * pow(1.0 - k, 3.0) + 1.6 * pow(1.0 - k, 2.0)) * step(0.42, uWave) : 0.0;`
    : old
    ? 'float s = smoothstep(uWave - 1.0, uWave, d);'
    : 'float k = clamp((uWave - d - 0.4) / 2.4, 0.0, 1.0); float s = 1.0 - 2.6 * pow(1.0 - k, 3.0) + 1.6 * pow(1.0 - k, 2.0);';
  m.onBeforeCompile = (sh, renderer) => {
    base.onBeforeCompile(sh, renderer);
    sh.uniforms.uWave = wave;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec2 anc;\nuniform float uWave;').replace(
      '#include <project_vertex>',
      `{
  float d = length(anc);
  float g0 = -(transformed.x * transformed.x + transformed.z * transformed.z) / ${bend};
  ${scale}
  // Fully down, a building is buried out of sight rather than left lying flat on the grass.
  transformed.y = s < 0.01 ? g0 - 4.0 : g0 + (transformed.y - g0) * s;
}
#include <project_vertex>`,
    );
  };
  m.customProgramCacheKey = () => (old ? 'grow-old' : 'grow-new') + bend + (local ? `${f(local.cx)}:${f(local.cz)}` : '');
  return m;
}
