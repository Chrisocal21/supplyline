import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { TrackDistance } from './trainMotion';

describe('train track distance', () => {
  const straight = (scale: number) => new TrackDistance(10, (f, dir) => ({
    pos: new Vector3(f * scale, 0, 0),
    up: new Vector3(0, 1, 0),
    forward: new Vector3(dir, 0, 0),
    hidden: f > 8,
  }));

  it.each([1.6, 3.27, 4])('keeps wagon spacing in world units at tile scale %s', (scale) => {
    const track = straight(scale);
    const centre = track.distance(5);
    for (const dir of [1, -1] as const) {
      const a = track.point(centre, dir);
      const b = track.point(centre - dir * 0.92, dir);
      expect(a.pos.distanceTo(b.pos)).toBeCloseTo(0.92, 6);
      expect(a.forward.x).toBe(dir);
    }
  });

  it('turns successive carriages independently around a curved track', () => {
    const track = new TrackDistance(10, (f, dir) => {
      const angle = f * f / 100;
      return {
        pos: new Vector3(10 * Math.sin(angle), 0, 10 * Math.cos(angle)),
        up: new Vector3(0, 1, 0),
        forward: new Vector3(Math.cos(angle) * dir, 0, -Math.sin(angle) * dir),
        hidden: false,
      };
    });
    const heading = (d: number, dir: 1 | -1) => track.point(d + dir * 0.26, dir).pos
      .sub(track.point(d - dir * 0.26, dir).pos).normalize();
    for (const dir of [1, -1] as const) {
      const a = track.point(5, dir);
      const b = track.point(5 - dir * 0.92, dir);
      expect(a.pos.distanceTo(b.pos)).toBeCloseTo(0.92, 2);
      expect(heading(5, dir).angleTo(heading(5 - dir * 0.92, dir))).toBeCloseTo(0.092, 2);
    }
    expect(track.distance(5)).toBeCloseTo(2.5, 3);
  });

  it('clamps endpoints and retains tunnel visibility', () => {
    const track = straight(3);
    expect(track.point(-5, 1).pos.x).toBe(0);
    expect(track.point(100, -1).pos.x).toBe(30);
    expect(track.point(27, 1).hidden).toBe(true);
    expect(track.distance(-1)).toBe(0);
    expect(track.distance(11)).toBe(30);
  });
});
