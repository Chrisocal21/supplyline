// Test helpers. Processing buildings normally need a town plot; tests that are about roads and logistics put them anywhere.
import { GOOD_LIST, LEVEL_MATERIALS, SITE_DEFS, WAREHOUSE_GOODS, type SiteKind } from './defs';
import { placeSite, type World } from './world';

export function put(w: World, kind: SiteKind, x: number, y: number): void {
  if (!SITE_DEFS[kind].inTown) {
    // Ground kept clear for a town's growth (or its airport) does not matter to these tests: set the towns aside to build.
    if (/Kept clear|grow out to here/.test(placeSite(w, kind, x, y) ?? '')) {
      const towns = w.places;
      w.places = [];
      placeSite(w, kind, x, y);
      w.places = towns;
    }
    return;
  }
  w.money -= SITE_DEFS[kind].cost;
  w.sites.push({ id: w.nextId++, kind, name: `Test ${kind} ${x}`, x, y, stock: {}, timer: 0, level: 1, nodeId: null, placeId: null, pull: SITE_DEFS[kind].store ? [...WAREHOUSE_GOODS] : SITE_DEFS[kind].hub ? [...GOOD_LIST] : [], making: false, sendTo: [] });
}

/** Tests about growth: the town stands complete and has been sent everything its next level asks for. */
export function stockLevelMats(p: { stage?: number; level: number; style: keyof typeof LEVEL_MATERIALS; mats?: Record<string, number> }): void {
  p.stage = 2;
  p.mats = { ...(LEVEL_MATERIALS[p.style][p.level - 1] ?? {}) };
}
