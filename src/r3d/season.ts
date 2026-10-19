// How the seasons look: a tint over the ground and the leaves, and snow that comes in over the winter. The ground and tree
// materials read these every frame; the game eases them toward the current season (see updateLighting).
import * as THREE from 'three';
import type { Season } from '../sim/seasons';

export const seasonLook = {
  snow: { value: 0 },
  tint: { value: new THREE.Color(1, 1, 1) },
  leaf: new THREE.Color(1, 1, 1),
};

const c = (r: number, g: number, b: number): THREE.Color => new THREE.Color(r, g, b);

export const SEASON_LOOK: Record<Season['id'], { tint: THREE.Color; leaf: THREE.Color; snow: number }> = {
  summer: { tint: c(1, 1, 1), leaf: c(1, 1, 1), snow: 0 },
  autumn: { tint: c(1.1, 0.93, 0.78), leaf: c(1.22, 0.86, 0.55), snow: 0 },
  winter: { tint: c(0.96, 0.99, 1.04), leaf: c(0.8, 0.88, 0.9), snow: 1 },
  spring: { tint: c(0.95, 1.07, 0.93), leaf: c(0.92, 1.1, 0.9), snow: 0 },
};

/** Ease the look toward a season. Called once a frame. */
export function easeSeason(id: Season['id']): void {
  const t = SEASON_LOOK[id];
  seasonLook.tint.value.lerp(t.tint, 0.03);
  seasonLook.leaf.lerp(t.leaf, 0.03);
  seasonLook.snow.value += (t.snow - seasonLook.snow.value) * 0.02;
}
