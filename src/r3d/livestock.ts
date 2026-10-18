import { Parts } from './parts';

/** Adult dairy cattle at the shared 10-metres-per-unit scale. */
export function addCow(p: Parts, x: number, y: number, z: number, variant = 0, yaw = 0): void {
  const c = Math.cos(yaw), s = Math.sin(yaw);
  const at = (dx: number, dy: number, dz: number) => ({ x: x + dx * c + dz * s, y: y + dy, z: z - dx * s + dz * c, ry: yaw, t: 0 });
  const coat = variant % 3 === 1 ? 0xb99b74 : 0xe1ded0;
  const patch = variant % 3 === 1 ? 0x644a37 : 0x30332e;
  const grazing = variant % 2 === 1;
  p.ellipsoid(0.22, 0.094, 0.083, coat, at(0, 0.101, 0), 2);
  p.ellipsoid(0.073, 0.097, 0.078, coat, at(-0.077, 0.103, 0), 2);
  p.ellipsoid(0.068, 0.096, 0.067, patch, at(0.075, 0.103, 0), 2);
  p.ellipsoid(0.07, 0.086, 0.055, coat, { ...at(0.112, grazing ? 0.079 : 0.118, 0), rz: grazing ? 0.55 : -0.3 }, 2);
  const headY = grazing ? 0.043 : 0.113;
  p.ellipsoid(0.067, 0.057, 0.047, patch, at(0.148, headY, 0), 2);
  p.ellipsoid(0.032, 0.027, 0.05, 0xac9182, at(0.174, headY - 0.017, 0), 2);
  for (const side of [-1, 1]) {
    for (let i = 0; i < 3; i++) p.ellipsoid(0.043 + i * 0.009, 0.047, 0.015, patch,
      { ...at(-0.064 + i * 0.058, 0.106 + (i % 2) * 0.015, side * 0.037), rz: (variant + i) * 0.4 }, 1);
    p.ellipsoid(0.03, 0.012, 0.04, coat, at(0.129, headY + 0.024, side * 0.033), 1);
    p.box(0.01, 0.012, 0.003, 0xc8a34e, at(0.137, headY + 0.017, side * 0.046));
    p.sphere(0.004, 0x181d18, at(0.158, headY + 0.01, side * 0.023), 1);
    p.sphere(0.003, 0x584a40, at(0.186, headY - 0.014, side * 0.012), 0);
    for (const dx of [-0.072, 0.069]) {
      const step = grazing && side === 1 ? 0.012 : 0;
      p.cyl(0.012, 0.008, 0.05, coat, at(dx, 0.035, side * 0.028), 8);
      p.ellipsoid(0.019, 0.025, 0.019, coat, at(dx, 0.038, side * 0.028), 1);
      p.cyl(0.007, 0.006, 0.034, coat, at(dx + step, 0.009, side * 0.028), 8);
      p.box(0.02, 0.012, 0.016, 0x3c3c34, at(dx + step + 0.003, 0, side * 0.028));
      p.box(0.012, 0.003, 0.002, 0x191d19, at(dx + step + 0.008, 0.005, side * 0.028));
    }
  }
  p.ellipsoid(0.05, 0.027, 0.042, 0xb69b88, at(-0.048, 0.052, 0), 1);
  for (const dx of [-0.058, -0.038]) for (const dz of [-0.01, 0.01]) p.cyl(0.003, 0.002, 0.013, 0xb69b88, at(dx, 0.026, dz), 5);
  p.cyl(0.003, 0.004, 0.09, coat, at(-0.11, 0.03, 0.006), 6);
  p.ellipsoid(0.012, 0.025, 0.013, patch, at(-0.11, 0.029, 0.006), 1);
}
