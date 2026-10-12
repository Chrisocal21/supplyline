// Test helpers. Processing buildings normally need a town plot; tests that are about roads and logistics put them anywhere.
import { GOOD_LIST, SITE_DEFS, type SiteKind } from './defs';
import { placeSite, type World } from './world';

export function put(w: World, kind: SiteKind, x: number, y: number): void {
  if (!SITE_DEFS[kind].inTown) {
    placeSite(w, kind, x, y);
    return;
  }
  w.money -= SITE_DEFS[kind].cost;
  w.sites.push({ id: w.nextId++, kind, name: `Test ${kind} ${x}`, x, y, stock: {}, timer: 0, level: 1, nodeId: null, placeId: null, pull: SITE_DEFS[kind].hub ? [...GOOD_LIST] : [] });
}
