import { Parts } from './parts';
import { ROAD_VEHICLE, meters } from '../scale';

export type RoadTruck = 'boxtruck' | 'bigtruck' | 'rig' | 'convoy';

/** Authored in metres; no display-only enlargement is applied at runtime. */
export function truckGeometry(kind: RoadTruck) {
  const p = new Parts();
  const count = kind === 'convoy' ? 3 : 1;
  const semi = kind === 'rig' || kind === 'convoy';
  const length = semi ? ROAD_VEHICLE.semiLength : kind === 'bigtruck' ? ROAD_VEHICLE.rigidLength : ROAD_VEHICLE.boxLength;
  const w = ROAD_VEHICLE.width;
  const h = ROAD_VEHICLE.height;
  for (let unit = 0; unit < count; unit++) {
    const offset = (count - 1) * meters(10) - unit * meters(20);
    const paint = [0x496879, 0x8a5045, 0x566c5e][unit % 3];
    const cabZ = offset + length / 2 - meters(1.4);
    const cabLength = meters(semi ? 2.8 : 2.1);
    const cargoLength = length - cabLength - meters(semi ? 0.8 : 0.25);
    const cargoZ = offset - cabLength / 2 - meters(semi ? 0.25 : 0.05);
    p.box(w * 0.8, meters(0.25), length * 0.94, 0x30373b, { y: meters(0.65), z: offset, t: 5 });
    p.box(w * 0.98, h - meters(1.0), cabLength, paint, { y: meters(0.85), z: cabZ, t: 5 });
    p.box(w, meters(0.22), cabLength * 1.03, 0x83928f, { y: h - meters(0.15), z: cabZ, t: 5 });
    const front = cabZ + cabLength / 2 + meters(0.025);
    p.box(w * 0.85, meters(0.82), meters(0.025), 0x35515e, { y: meters(2.55), z: front, t: 8 });
    p.box(meters(0.055), meters(0.82), meters(0.04), 0x4b565a, { y: meters(2.55), z: front + meters(0.02), t: 5 });
    p.box(w * 0.65, meters(0.72), meters(0.04), 0x202b30, { y: meters(1.05), z: front, t: 0 });
    for (let rib = 0; rib < 5; rib++) p.box(w * 0.61, meters(0.035), meters(0.055), 0x8d9696, { y: meters(1.14 + rib * 0.12), z: front + meters(0.025), t: 5 });
    p.box(w, meters(0.2), meters(0.16), 0x7b8485, { y: meters(0.8), z: front, t: 5 });
    for (const side of [-1, 1]) {
      p.box(meters(0.4), meters(0.18), meters(0.06), 0xe4e3c7, { x: side * w * 0.36, y: meters(1.8), z: front, t: 9 });
      p.box(meters(0.035), meters(0.7), cabLength * 0.65, 0x35515e, { x: side * w * 0.5, y: meters(2.55), z: cabZ, t: 8 });
      p.box(meters(0.03), meters(0.5), meters(0.17), 0x333d40, { x: side * w * 0.53, y: meters(2.5), z: cabZ + cabLength * 0.32, t: 5 });
      p.box(meters(0.06), meters(0.04), meters(0.23), 0xc0c5bf, { x: side * w * 0.5, y: meters(2.05), z: cabZ - cabLength * 0.25, t: 5 });
      for (let step = 0; step < 2; step++) p.box(meters(0.08), meters(0.06), meters(0.5), 0x868f8c, { x: side * w * 0.48, y: meters(0.6 + step * 0.28), z: cabZ, t: 5 });
    }
    p.box(w, h - meters(1.05), cargoLength, 0xc6c9c2, { y: meters(1.05), z: cargoZ, t: 5 });
    p.box(w * 1.01, meters(0.07), cargoLength, 0x69777b, { y: h, z: cargoZ, t: 5 });
    for (const side of [-1, 1]) {
      p.box(meters(0.025), meters(0.17), cargoLength, paint, { x: side * w * 0.503, y: meters(2.05), z: cargoZ, t: 0 });
      for (let rib = 0; rib < 9; rib++) {
        p.box(meters(0.025), h - meters(1.2), meters(0.035), 0x939c9a, {
          // Stand the ribs clear of the painted stripe: their outer faces previously occupied the same plane.
          x: side * (w * 0.503 + meters(0.035)), y: meters(1.12), z: cargoZ - cargoLength * 0.44 + rib * cargoLength * 0.11, t: 5,
        });
      }
    }
    const axles = semi ? [length / 2 - meters(1.3), length / 2 - meters(4.1), -length / 2 + meters(1.1), -length / 2 + meters(2.5)]
      : [length / 2 - meters(1.15), -length / 2 + meters(1.5)];
    for (const z of axles) for (const side of [-1, 1]) {
      p.cyl(meters(0.48), meters(0.48), meters(0.27), 0x212628, { x: side * (w / 2 - meters(0.27)), y: meters(0.48), z: offset + z, rz: side * -Math.PI / 2, t: 0 }, 16);
      p.cyl(meters(0.23), meters(0.23), meters(0.025), 0xa0a7a4, { x: side * (w / 2 + meters(0.002)), y: meters(0.48), z: offset + z, rz: side * -Math.PI / 2, t: 5 }, 12);
    }
    const rear = cargoZ - cargoLength / 2 - meters(0.03);
    for (const side of [-1, 1]) {
      p.box(w * 0.45, h - meters(1.25), meters(0.035), 0xaab2ae, { x: side * w * 0.24, y: meters(1.15), z: rear, t: 5 });
      p.box(meters(0.04), h - meters(1.65), meters(0.055), 0x646f72, { x: side * w * 0.17, y: meters(1.35), z: rear, t: 5 });
      p.box(meters(0.32), meters(0.13), meters(0.04), 0xb44a39, { x: side * w * 0.35, y: meters(0.95), z: rear, t: 9 });
    }
  }
  return p.build();
}
