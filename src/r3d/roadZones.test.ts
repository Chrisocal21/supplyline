import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { createBlankWorld, siteAt, terrainAt, townBlocks } from '../sim/world';
import { Scenery } from './scenery';

function fixture(world = createBlankWorld(32, 16, new Array(32 * 16).fill('grass'))) {
  const group = new THREE.Group();
  const scenery: Scenery = Object.assign(Object.create(Scenery.prototype), {
    world, group, hf: { surface: () => 0 }, zoneGroup: null, zoneSig: '', zoneTodo: [], zoneFocus: '',
  });
  const overlay = () => group.children[0] as THREE.Group;
  const quads = () => overlay().children.filter((m) => m instanceof THREE.Mesh)
    .reduce((sum, m) => sum + (m as THREE.Mesh).geometry.getAttribute('position').count / 4, 0);
  return { scenery, group, overlay, quads, world };
}

describe('incremental road overlays', () => {
  it('bounds each frame to one chunk and reuses completed geometry when reopened', () => {
    const f = fixture();
    f.scenery.setRoadZones('road', 'a', 8, 8);
    expect(f.quads()).toBe(256);
    const first = f.overlay().children[0];
    f.scenery.setRoadZones(null, 'a');
    expect(f.overlay().visible).toBe(false);
    f.scenery.setRoadZones('road', 'a', 8, 8);
    expect(f.overlay().visible).toBe(true);
    expect(f.quads()).toBe(512);
    expect(f.overlay().children[0]).toBe(first);
    f.scenery.setRoadZones('road', 'a', 8, 8);
    expect(f.quads()).toBe(512);
    expect(f.overlay().children.every((mesh) => mesh.frustumCulled)).toBe(true);
  });

  it('prioritizes the camera and handles partial edge chunks', () => {
    const f = fixture(createBlankWorld(35, 17, new Array(35 * 17).fill('grass')));
    f.scenery.setRoadZones('road', 'a', 34, 16);
    expect(f.quads()).toBe(3);
    for (let i = 0; i < 5; i++) f.scenery.setRoadZones('road', 'a', 34, 16);
    expect(f.quads()).toBe(35 * 17);
  });

  it('does not add outlines at chunk borders or the longitude seam', () => {
    const f = fixture(createBlankWorld(32, 16, new Array(32 * 16).fill('ice')));
    f.scenery.setRoadZones('road', 'a');
    f.scenery.setRoadZones('road', 'a');
    const edgeVertices = f.overlay().children.filter((m) => m instanceof THREE.LineSegments)
      .reduce((sum, m) => sum + (m as THREE.LineSegments).geometry.getAttribute('position').count, 0);
    // Only the north and south boundaries: 32 edges each, two vertices per edge.
    expect(edgeVertices).toBe(128);
  });

  it('keeps water bare and classifies land using the existing route rules', () => {
    const f = fixture();
    f.world.terrain[0] = 'water';
    f.world.terrain[1] = 'ice';
    for (let i = 0; i < 2; i++) f.scenery.setRoadZones('rail', 'a');
    let expectedBlocked = 0;
    for (let y = 0; y < f.world.height; y++) for (let x = 0; x < f.world.width; x++) {
      const t = terrainAt(f.world, x, y);
      if (t !== 'water' && (t === 'ice' || siteAt(f.world, x, y) || townBlocks(f.world, x, y, 'rail'))) expectedBlocked++;
    }
    const blocked = f.overlay().children.filter((m) => m instanceof THREE.Mesh &&
      (m.material as THREE.MeshBasicMaterial).color.getHex() === 0xff8a45)
      .reduce((sum, m) => sum + (m as THREE.Mesh).geometry.getAttribute('position').count / 4, 0);
    expect(blocked).toBe(expectedBlocked);
    expect(f.quads()).toBe(511);
  });

  it.each(['mode', 'world'])('disposes stale chunks when the %s changes', reason => {
    const f = fixture();
    f.scenery.setRoadZones('road', 'a');
    const old = f.overlay();
    const geometry = (old.children[0] as THREE.Mesh).geometry;
    const disposed = vi.spyOn(geometry, 'dispose');
    f.scenery.setRoadZones(reason === 'mode' ? 'rail' : 'road', reason === 'world' ? 'b' : 'a');
    expect(disposed).toHaveBeenCalledOnce();
    expect(f.group.children).toHaveLength(1);
    expect(f.overlay()).not.toBe(old);
    expect(f.quads()).toBe(256);
  });
});
