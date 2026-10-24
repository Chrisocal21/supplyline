// Temporary models for the newer production sites: crop fields, animal pens, vines and hives, the water pump, the salt pan and the
// fishing harbor. Each is a small hand-built scene on the same footprint as the older farms, so it sits on its node like them.
// Upgrade levels add fences, sheds and stock on top of these through levelParts in models.ts.
import type * as THREE from 'three';
import type { SiteKind } from '../sim/defs';
import { Parts } from './parts';
import { addTree } from './vegetation';
import { addCow } from './livestock';
import { coffeeFarmGeometry, mangoGroveGeometry } from './specialty';

const METAL = 0x8a9aa7;
const METAL_DARK = 0x65727e;
const TIMBER = 0x7a5a3c;

/** The ground slab every field and pen stands on, with the earth under it. */
function ground(p: Parts, top: number, under: number): void {
  p.box(2.6, 0.03, 2.2, top);
  p.box(2.55, 1.5, 2.15, under, { y: -1.5 });
}

function farmhouse(p: Parts, x: number, z: number, wall: number, roof: number): void {
  p.box(0.62, 0.4, 0.5, wall, { x, y: 0.03, z });
  p.gable(0.74, 0.28, 0.62, roof, { x, y: 0.43, z });
  p.box(0.12, 0.2, 0.02, 0x3a2a20, { x, y: 0.03, z: z + 0.26 });
}

interface CropLook {
  soil: number;
  /** Colour of the plants. */
  leaf: number;
  /** A second colour for the flowers or fruit. */
  fruit?: number;
  /** Plant style: low rows, tall poles (hops), tall stalks (sunflower, barley) or mounded rows (potatoes). */
  style: 'rows' | 'poles' | 'stalks' | 'mounds' | 'grain';
  wall: number;
  roof: number;
  silo?: number;
}

function cropField(l: CropLook): THREE.BufferGeometry {
  const p = new Parts();
  ground(p, 0xa89a6a, 0x8a7d52);
  for (let i = 0; i < 6; i++) {
    const z = -0.9 + i * 0.23;
    p.box(1.55, 0.02, 0.13, l.soil, { x: -0.35, y: 0.03, z });
    for (let j = 0; j < 9; j++) {
      const x = -1.0 + j * 0.17;
      if (l.style === 'poles') {
        p.box(0.012, 0.42, 0.012, TIMBER, { x, y: 0.03, z });
        p.ellipsoid(0.05, 0.16, 0.05, l.leaf, { x, y: 0.24, z }, 0);
      } else if (l.style === 'stalks') {
        p.box(0.012, 0.3, 0.012, 0x5a7a3a, { x, y: 0.03, z });
        p.sphere(0.055, l.fruit ?? l.leaf, { x, y: 0.34, z }, 1);
      } else if (l.style === 'mounds') {
        p.ellipsoid(0.07, 0.04, 0.05, l.leaf, { x, y: 0.04, z }, 0);
      } else if (l.style === 'grain') {
        p.box(0.03, 0.2, 0.02, l.leaf, { x, y: 0.03, z });
        p.ellipsoid(0.02, 0.05, 0.02, l.fruit ?? l.leaf, { x, y: 0.23, z }, 0);
      } else {
        p.ellipsoid(0.07, 0.06, 0.06, l.leaf, { x, y: 0.07, z }, 0);
      }
    }
  }
  farmhouse(p, 0.85, 0.5, l.wall, l.roof);
  if (l.silo !== undefined) {
    p.cyl(0.2, 0.2, 1.0, l.silo, { x: 0.95, y: 0.03, z: -0.55 });
    p.dome(0.2, METAL_DARK, { x: 0.95, y: 1.03, z: -0.55 });
  }
  for (let i = 0; i < 3; i++) p.box(0.3, 0.14, 0.22, l.fruit ?? l.leaf, { x: -0.7 + i * 0.34, y: 0.03, z: 1.0 });
  return p.build();
}

type Beast = 'hen' | 'pig' | 'sheep' | 'cow';

function penFarm(beast: Beast, barn: number, roof: number): THREE.BufferGeometry {
  const p = new Parts();
  ground(p, 0x7aa05a, 0x5f7a46);
  p.box(1.1, 0.7, 0.8, barn, { x: -0.5, y: 0.03, z: -0.6, t: 2 });
  p.gable(1.2, 0.4, 0.9, roof, { x: -0.5, y: 0.73, z: -0.6, t: 5 });
  p.box(0.3, 0.4, 0.02, 0x3a2a20, { x: -0.5, y: 0.03, z: -0.19 });
  for (let i = 0; i <= 6; i++) {
    p.box(0.014, 0.14, 0.014, TIMBER, { x: -1.1 + i * 0.37, y: 0.03, z: 0.95, t: 2 });
    p.box(0.014, 0.14, 0.014, TIMBER, { x: -1.1 + i * 0.37, y: 0.03, z: 0.12, t: 2 });
  }
  for (const y of [0.09, 0.15]) {
    for (const z of [0.12, 0.95]) p.box(2.23, 0.012, 0.012, 0x9a7a52, { x: 0.01, y, z, t: 2 });
    for (const x of [-1.1, 1.12]) p.box(0.012, 0.012, 0.83, 0x9a7a52, { x, y, z: 0.535, t: 2 });
  }
  const spots: [number, number][] = [[-0.8, 0.35], [-0.3, 0.45], [0.2, 0.3], [0.7, 0.4], [-0.6, 0.78], [-0.05, 0.72], [0.5, 0.8], [0.9, 0.7]];
  spots.forEach(([x, z], i) => {
    if (beast === 'cow') {
      addCow(p, x, 0.03, z, i, i % 2 ? Math.PI - 0.25 : 0.2);
    } else if (beast === 'hen') {
      p.ellipsoid(0.06, 0.05, 0.045, 0xf4f0e6, { x, y: 0.08, z }, 0);
      p.sphere(0.026, 0xf4f0e6, { x: x + 0.05, y: 0.12, z }, 0);
      p.box(0.025, 0.015, 0.02, 0xd8403a, { x: x + 0.05, y: 0.15, z });
    } else if (beast === 'pig') {
      p.ellipsoid(0.12, 0.075, 0.07, 0xe8a8a8, { x, y: 0.1, z }, 0);
      p.sphere(0.05, 0xe8a8a8, { x: x + 0.12, y: 0.11, z }, 0);
    } else {
      p.ellipsoid(0.11, 0.08, 0.08, 0xf2eee4, { x, y: 0.11, z }, 0);
      p.sphere(0.045, 0x3a3a3a, { x: x + 0.12, y: 0.11, z }, 0);
    }
  });
  p.cyl(0.075, 0.075, 0.12, 0xb4a16d, { x: 1.0, y: 0.105, z: 0.55, rz: Math.PI / 2 }, 16);
  return p.build();
}

function vineyard(): THREE.BufferGeometry {
  const p = new Parts();
  ground(p, 0x8aa052, 0x6a7a42);
  for (let r = 0; r < 5; r++) {
    const z = -0.85 + r * 0.38;
    p.box(1.9, 0.012, 0.012, 0x6a5a3a, { x: -0.3, y: 0.3, z });
    p.box(1.9, 0.012, 0.012, 0x6a5a3a, { x: -0.3, y: 0.16, z });
    for (let j = 0; j < 8; j++) {
      const x = -1.15 + j * 0.27;
      p.box(0.02, 0.36, 0.02, TIMBER, { x, y: 0.03, z });
      p.ellipsoid(0.1, 0.12, 0.07, 0x4f7a3a, { x, y: 0.2, z }, 0);
      p.sphere(0.03, 0x5a2a6a, { x: x + 0.04, y: 0.12, z: z + 0.05 }, 0);
    }
  }
  p.box(0.62, 0.42, 0.5, 0xe6d8b8, { x: 1.0, y: 0.03, z: 0.7 });
  p.gable(0.74, 0.28, 0.62, 0x9a4a35, { x: 1.0, y: 0.45, z: 0.7 });
  p.cyl(0.18, 0.18, 0.4, 0x7a5a3c, { x: 0.55, y: 0.03, z: 0.9, rx: Math.PI / 2 }, 12);
  return p.build();
}

function apiary(): THREE.BufferGeometry {
  const p = new Parts();
  ground(p, 0x7fa65a, 0x587a42);
  for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) addTree(p, 'orchard', -0.9 + i * 0.5, 0.03, -0.75 + j * 0.55, 0.55, i * 2 + j);
  const cols = [0xf2e6a0, 0xe0b040, 0xf2e6a0, 0xe8c860];
  for (let i = 0; i < 8; i++) {
    const x = -0.9 + (i % 4) * 0.42;
    const z = 0.3 + Math.floor(i / 4) * 0.45;
    p.box(0.22, 0.16, 0.2, cols[i % 4], { x, y: 0.06, z });
    p.box(0.24, 0.03, 0.22, 0x9a7a52, { x, y: 0.22, z });
    p.box(0.1, 0.03, 0.02, 0x3a2a20, { x, y: 0.08, z: z + 0.11 });
  }
  p.box(0.5, 0.36, 0.4, 0xd8c7a5, { x: 0.95, y: 0.03, z: -0.2 });
  p.gable(0.6, 0.2, 0.5, 0x7a3f35, { x: 0.95, y: 0.39, z: -0.2 });
  return p.build();
}

function waterPump(): THREE.BufferGeometry {
  const p = new Parts();
  p.cyl(1.3, 1.34, 0.05, 0x8b877d);
  p.cyl(1.27, 1.27, 1.5, 0x6d6b66, { y: -1.5 });
  p.cyl(0.75, 0.8, 0.04, 0x3a82b8, { x: -0.3, y: 0.05, z: 0.3 }, 18);
  p.cyl(0.2, 0.2, 1.1, 0xc7cdd2, { x: 0.65, y: 0.05, z: -0.5 });
  p.dome(0.2, 0x3a82b8, { x: 0.65, y: 1.15, z: -0.5 });
  p.box(0.08, 0.7, 0.08, METAL_DARK, { x: -0.5, y: 0.05, z: -0.3 });
  p.box(0.5, 0.06, 0.06, METAL_DARK, { x: -0.3, y: 0.72, z: -0.3 });
  p.box(0.06, 0.34, 0.06, METAL, { x: -0.06, y: 0.4, z: -0.3 });
  p.box(0.5, 0.3, 0.4, 0x6a7a88, { x: 0.1, y: 0.05, z: -1.0 });
  p.cyl(0.04, 0.04, 0.9, METAL, { x: 0.3, y: 0.15, z: -0.1, rz: Math.PI / 2 }, 8);
  return p.build();
}

function saltPan(): THREE.BufferGeometry {
  const p = new Parts();
  p.cyl(1.3, 1.34, 0.05, 0xd8d2c0);
  p.cyl(1.27, 1.27, 1.5, 0x8a8678, { y: -1.5 });
  for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
    const x = -0.55 + i * 0.85;
    const z = -0.45 + j * 0.8;
    p.box(0.75, 0.05, 0.65, 0xf4f4f0, { x, y: 0.05, z });
    p.box(0.8, 0.07, 0.03, 0xb8b0a0, { x, y: 0.05, z: z - 0.34 });
    p.box(0.8, 0.07, 0.03, 0xb8b0a0, { x, y: 0.05, z: z + 0.34 });
  }
  p.cone(0.4, 0.4, 0xf4f4f0, { x: 0.9, y: 0.05, z: 0.85 }, 9);
  p.cone(0.28, 0.28, 0xe8e8e4, { x: 0.55, y: 0.05, z: 0.95 }, 9);
  p.box(0.5, 0.36, 0.4, 0xb8b0a0, { x: -0.9, y: 0.05, z: 0.9 });
  p.gable(0.6, 0.2, 0.5, 0x6a6a68, { x: -0.9, y: 0.41, z: 0.9 });
  return p.build();
}

/** The Fishing Harbor: a concrete quay with a shed, crates and nets, and a boat tied up at the edge. */
function harbor(): THREE.BufferGeometry {
  const p = new Parts();
  p.slab(3.0, 2.6, 0x8f8e89);
  p.box(1.2, 0.55, 0.8, 0xc8d4dc, { x: -0.6, y: 0.04, z: -0.6 });
  p.gable(1.32, 0.3, 0.92, 0x3a5a78, { x: -0.6, y: 0.59, z: -0.6 });
  p.box(0.32, 0.4, 0.02, 0x3a2a20, { x: -0.6, y: 0.04, z: -0.19 });
  for (let i = 0; i < 6; i++) p.box(0.3, 0.14, 0.22, 0xb8905a, { x: 0.45 + (i % 3) * 0.34, y: 0.04 + Math.floor(i / 3) * 0.14, z: -0.7 });
  p.cyl(0.03, 0.03, 0.9, 0x6a5a3a, { x: 1.2, y: 0.04, z: 0.2 }, 6);
  p.box(0.5, 0.012, 0.012, 0x6a5a3a, { x: 1.0, y: 0.9, z: 0.2 });
  p.box(0.4, 0.3, 0.012, 0xa8c0a0, { x: 1.0, y: 0.6, z: 0.2 });
  // the boat: a hull, a cabin and a mast, tied up at the front edge
  p.box(1.1, 0.18, 0.4, 0x2f5f8a, { x: 0.0, y: 0.0, z: 1.05 });
  p.box(1.0, 0.04, 0.34, 0xe8e6de, { x: 0.0, y: 0.18, z: 1.05 });
  p.box(0.34, 0.26, 0.3, 0xe8e6de, { x: -0.2, y: 0.2, z: 1.05 });
  p.box(0.34, 0.04, 0.34, 0xc04a3a, { x: -0.2, y: 0.46, z: 1.05 });
  p.box(0.025, 0.7, 0.025, METAL_DARK, { x: 0.25, y: 0.2, z: 1.05 });
  for (const x of [-0.9, 0.9]) p.cyl(0.04, 0.05, 0.16, 0x3a3d40, { x, y: 0.04, z: 1.2 }, 6);
  return p.build();
}

const FIELDS: Partial<Record<SiteKind, CropLook>> = {
  vegfarm: { soil: 0x5a4a2e, leaf: 0x4f9a3a, fruit: 0xc8453b, style: 'rows', wall: 0xe9e6dc, roof: 0x6a7a4a },
  potatofarm: { soil: 0x6a5230, leaf: 0x5f7a3a, fruit: 0xb89a60, style: 'mounds', wall: 0xdcd2b8, roof: 0x7a4a3a },
  barleyfarm: { soil: 0x8a7a42, leaf: 0xd8c070, fruit: 0xe6d080, style: 'grain', wall: 0xe9e2c8, roof: 0x7a3a2e, silo: 0xc9cdcf },
  hopfarm: { soil: 0x5a4a2e, leaf: 0x7ab04a, style: 'poles', wall: 0xdad6c4, roof: 0x5a6a3a },
  sugarfarm: { soil: 0x5a4a30, leaf: 0x4a8a4a, fruit: 0xd8c8b8, style: 'rows', wall: 0xe6e2d6, roof: 0x6a4a3a, silo: 0xe8e4e0 },
  oilseedfarm: { soil: 0x6a5a30, leaf: 0x4a7a30, fruit: 0xf0c020, style: 'stalks', wall: 0xe9e6dc, roof: 0x8a4a2e },
};

const PENS: Partial<Record<SiteKind, [Beast, number, number]>> = {
  chickenfarm: ['hen', 0xe0c890, 0x9a4a35],
  pigfarm: ['pig', 0xb87a6a, 0x6a4a3a],
  sheepfarm: ['sheep', 0xc8c0a8, 0x5a6a4a],
};

/** The model for a production site that has no hand-built scene of its own, or null. */
export function newSiteGeometry(kind: SiteKind): THREE.BufferGeometry | null {
  const f = FIELDS[kind];
  if (f) return cropField(f);
  const pen = PENS[kind];
  if (pen) return penFarm(...pen);
  switch (kind) {
    case 'vineyard':
      return vineyard();
    case 'apiary':
      return apiary();
    case 'waterpump':
      return waterPump();
    case 'saltpan':
      return saltPan();
    case 'harbor':
      return harbor();
    case 'spicefarm':
      return mangoGroveGeometry();
    case 'cocoafarm':
      return coffeeFarmGeometry();
    default:
      return null;
  }
}
