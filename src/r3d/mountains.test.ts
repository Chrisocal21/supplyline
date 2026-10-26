import { describe, expect, it } from 'vitest';
import { createBlankWorld } from '../sim/world';
import { tileLonLat } from '../sim/mapgen';
import { HeightField, setGlobeSize, CAP_ROWS } from './geo';
import { packRockDetail } from './rockTexture';
import { paintRoughness } from './paint';

describe('mountain rock treatment', () => {
  it('packs stone without changing the existing ground grain or alpha', () => {
    const data = new Uint8ClampedArray(64 * 64 * 4).fill(127);
    packRockDetail(data, 64);
    const again = new Uint8ClampedArray(data.length).fill(127);
    packRockDetail(again, 64);
    expect(data).toEqual(again);
    const colors = new Set<number>();
    const heights = new Set<number>();
    for (let i = 0; i < data.length; i += 4) {
      expect(data[i + 1]).toBe(127);
      expect(data[i + 3]).toBe(127);
      colors.add(data[i]); heights.add(data[i + 2]);
    }
    expect(colors.size).toBeGreaterThan(20);
    expect(heights.size).toBeGreaterThan(20);
  });

  it('keeps stone masked off water and grass while preserving roughness', () => {
    for (const terrain of ['water', 'grass', 'mountain'] as const) {
      const world = createBlankWorld(32, 16, new Array(512).fill(terrain));
      setGlobeSize(world);
      const texture = paintRoughness(world, 1);
      const i = ((CAP_ROWS + 8) * texture.width + 16) * 4;
      expect(texture.data[i]).toBe(terrain === 'mountain' ? 255 : 0);
      expect(texture.data[i + 1]).toBe(Math.round((terrain === 'water' ? 0.42 : 0.93) * 255));
    }
  });

  it('builds mountains from rock slabs: bounded by the smooth ground, repeatable, continuous across the longitude seam', () => {
    const elevations = Array.from({ length: 512 }, (_, i) => 145 + Math.floor(i / 32) * 6);
    const world = createBlankWorld(32, 16, new Array(512).fill('mountain'), 11, elevations);
    const plain = createBlankWorld(32, 16, new Array(512).fill('grass'), 11, elevations);
    setGlobeSize(world);
    const hf = new HeightField(world), baseline = new HeightField(plain);
    let changed = 0;
    for (let y = 1; y < 15; y++) {
      const { lon, lat } = tileLonLat(32, 16, 8, y);
      const delta = Math.abs(hf.natural(lon, lat) - baseline.natural(lon, lat));
      expect(delta).toBeLessThan(0.75 * baseline.natural(lon, lat) + 1.5);
      if (delta > 0.01) changed++;
      expect(hf.natural(-Math.PI, lat)).toBeCloseTo(hf.natural(Math.PI, lat), 6);
      expect(Number.isFinite(hf.surface(lon, lat))).toBe(true);
    }
    expect(changed).toBeGreaterThan(5);
    const again = new HeightField(world);
    for (let y = 1; y < 15; y++) {
      const { lon, lat } = tileLonLat(32, 16, 8, y);
      expect(again.natural(lon, lat)).toBe(hf.natural(lon, lat));
    }
  });

  it('preserves sea level', () => {
    const world = createBlankWorld(32, 16, new Array(512).fill('water'), 11, new Array(512).fill(0));
    setGlobeSize(world);
    const hf = new HeightField(world);
    expect(hf.natural(0, 0)).toBe(0);
    expect(hf.surface(0, 0)).toBe(0);
  });

  it('regrades and removes a road through the shaped mountain without leaving stale cuts', () => {
    const world = createBlankWorld(32, 16, new Array(512).fill('grass'), 11, new Array(512).fill(100));
    for (let y = 5; y <= 11; y++) for (let x = 13; x <= 18; x++) {
      world.terrain[y * 32 + x] = 'mountain';
      world.elev[y * 32 + x] = 200;
    }
    setGlobeSize(world);
    const hf = new HeightField(world);
    const p = tileLonLat(32, 16, 13, 8);
    const original = hf.surface(p.lon, p.lat);
    world.routes.push({ id: 1, mode: 'road', fromSiteId: 0, toSiteId: 0,
      path: Array.from({ length: 10 }, (_, i) => ({ x: i + 11, y: 8 })) });
    expect(hf.setRoads().size).toBeGreaterThan(0);
    for (const t of world.routes[0].path) expect(Number.isFinite(hf.tileHeight(t.x, t.y))).toBe(true);
    world.routes = [];
    expect(hf.setRoads().size).toBeGreaterThan(0);
    expect(hf.surface(p.lon, p.lat)).toBeCloseTo(original, 6);
  });
});
