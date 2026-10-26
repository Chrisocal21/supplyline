// Weathered stone for rocks, boulders and the heaps on resource nodes.
import * as THREE from 'three';

/**
 * A weathered stone in broad planes: an uneven lump, flattened and a little squared off, painted in vertex colour with a dark
 * damp foot, a warm face and a pale sun-bleached top, and each plane a touch different so the light breaks it into a few big
 * masses instead of one smooth egg. Tinted per instance, so one model serves grey stone, sandstone and dark coal.
 */
export function stoneLump(radius: number, flatten: number, seed: number, detail = 0): THREE.BufferGeometry {
  const g = detail > 0 ? new THREE.IcosahedronGeometry(radius, detail) : new THREE.DodecahedronGeometry(radius, 0);
  const pos = g.getAttribute('position');
  // The same corner must move the same way in every triangle that shares it, so the noise is read from the corner's position.
  const bump = (x: number, y: number, z: number): number => {
    let a = (Math.imul(Math.round(x * 997) + seed, 374761393) + Math.imul(Math.round(y * 991), 668265263) + Math.imul(Math.round(z * 983), 2147483647)) >>> 0;
    a = Math.imul(a ^ (a >>> 13), 1274126177) >>> 0;
    return ((a ^ (a >>> 16)) >>> 0) / 4294967296;
  };
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const k = 0.8 + bump(x, y, z) * 0.4;
    // Squared off at the top, so it reads as a slab with a ledge and not a pebble.
    pos.setXYZ(i, x * k * 1.08, Math.min(y * k * flatten, radius * flatten * 0.78), z * k);
  }
  const lowest = -radius * flatten;
  const span = radius * flatten * 1.78;
  const colors = new Float32Array(pos.count * 3);
  for (let t = 0; t < pos.count; t += 3) {
    const jitter = (bump(pos.getX(t) + 3.1, pos.getY(t), pos.getZ(t) + t) - 0.5) * 0.16;
    for (let k = 0; k < 3; k++) {
      const up = Math.min(1, Math.max(0, (pos.getY(t + k) - lowest) / span));
      // Foot 0.62, face 0.9, top 1.1, with a warm shift toward the top and a cool damp tone at the foot.
      const v = 0.62 + up * 0.5 + jitter;
      // The lowest third is dusted with the earth it sits in, so the stone seems bedded in the ground, not set on it.
      const dust = 1 - Math.min(1, Math.max(0, (up - 0.1) / 0.3));
      colors[(t + k) * 3] = v * (1.0 + up * 0.04) * (1 - dust * 0.22) + dust * 0.06;
      colors[(t + k) * 3 + 1] = v * (0.98 + up * 0.01) * (1 - dust * 0.3) + dust * 0.04;
      colors[(t + k) * 3 + 2] = v * (0.96 - up * 0.05) * (1 - dust * 0.4) + dust * 0.01;
    }
  }
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  g.computeVertexNormals();
  return g;
}
