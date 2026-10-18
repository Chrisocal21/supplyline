// Test helpers. Processing buildings normally need a town plot; tests that are about roads and logistics put them anywhere.
import { GOOD_LIST, SITE_DEFS, type SiteKind } from './defs';
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
  w.sites.push({ id: w.nextId++, kind, name: `Test ${kind} ${x}`, x, y, stock: {}, timer: 0, level: 1, nodeId: null, placeId: null, pull: SITE_DEFS[kind].hub ? [...GOOD_LIST] : [], making: false, sendTo: [] });
}
