/** Pack tileable stone colour/height into the unused red/blue channels of the existing detail texture.
 * Green remains the original fine ground grain. Generated once on the CPU, not per fragment. */
export function packRockDetail(data: Uint8ClampedArray, size: number): void {
  const cells = 6;
  const hash = (x: number, y: number, salt: number): number => {
    let n = Math.imul((x + cells) % cells, 374761393) ^ Math.imul((y + cells) % cells, 668265263) ^ salt;
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
  };
  const smooth = (lo: number, hi: number, value: number): number => {
    const t = Math.max(0, Math.min(1, (value - lo) / (hi - lo)));
    return t * t * (3 - 2 * t);
  };
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const u = x / size * cells;
    const v = y / size * cells;
    const ix = Math.floor(u);
    const iy = Math.floor(v);
    let first = Infinity, second = Infinity, tone = 0, plane = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const cx = ix + dx, cy = iy + dy;
      const sx = cx + 0.2 + hash(cx, cy, 71) * 0.6;
      const sy = cy + 0.2 + hash(cx, cy, 193) * 0.6;
      const du = u - sx, dv = v - sy;
      const distance = du * du + dv * dv;
      if (distance < first) {
        second = first;
        first = distance;
        tone = hash(cx, cy, 997);
        plane = du * (tone - 0.5) * 0.22 + dv * 0.08;
      } else second = Math.min(second, distance);
    }
    const edge = smooth(0.015, 0.13, second - first);
    const i = (y * size + x) * 4;
    data[i] = (0.66 + tone * 0.23 + edge * 0.15) * 255;
    data[i + 2] = (0.25 + tone * 0.30 + plane + edge * 0.16) * 255;
  }
}
