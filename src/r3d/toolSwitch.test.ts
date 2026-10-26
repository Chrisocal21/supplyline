import { describe, expect, it, vi } from 'vitest';
import { Game3D, type Tool } from './game3d';

describe('tool switching', () => {
  it.each<Tool>(['select', 'route', 'highway', 'rail', 'forestry'])('%s preserves the world cache while clearing the previous preview', tool => {
    // Exercise the real tool transition without constructing a WebGL renderer.
    const state = {
      signature: 'sites|roads|towns|vehicles',
      airFrom: 42,
      pending: {}, draft: [], committed: [], draftHistory: [[]], draftPlan: {},
      ghostKind: 'forestry', placeRot: 1,
      ghost: { visible: true }, ghostArrow: { visible: true },
      hover: { tile: { x: 3, y: 4 } },
      updateDraftMesh: vi.fn(), showHoldRings: vi.fn(), setHover: vi.fn(),
    };
    Game3D.prototype.setTool.call(state as unknown as Game3D, tool);
    expect(state.signature).toBe('sites|roads|towns|vehicles');
    expect(state.pending).toBeNull();
    expect(state.draft).toBeNull();
    expect(state.draftPlan).toBeNull();
    expect(state.committed).toBeNull();
    expect(state.draftHistory).toEqual([]);
    expect(state.ghost.visible).toBe(false);
    expect(state.ghostArrow.visible).toBe(false);
    expect(state.updateDraftMesh).toHaveBeenCalledOnce();
    expect(state.setHover).toHaveBeenCalledWith(state.hover.tile);
  });
});
