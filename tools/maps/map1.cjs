// Map 1: a made world in the style of a world map. Run `node tools/maps/map1.cjs [preview.png]` to bake
// src/maps/map1.json (and draw a flat preview). Every continent, island, range, lake and town is placed here by hand;
// the only randomness is a fixed noise that roughens coastlines and hills so they do not look ruled.
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const W = 288;
const H = 96;
const SEA = 96;
const MOUNTAIN = 188;
const ICE_ROWS = 2;

// ---- fixed noise (periodic east-west) ----
function hash(ix, iy, s) {
  let a = (Math.imul(ix, 374761393) + Math.imul(iy, 668265263) + Math.imul(s, 2246822519)) >>> 0;
  a = Math.imul(a ^ (a >>> 13), 1274126177) >>> 0;
  return ((a ^ (a >>> 16)) >>> 0) / 4294967296;
}
function noise(x, y, scale, s) {
  const period = Math.round(W / scale);
  const fx = x / scale;
  const fy = y / scale;
  const ix = Math.floor(fx);
  const iy = Math.floor(fy);
  const tx = fx - ix;
  const ty = fy - iy;
  const sx = tx * tx * (3 - 2 * tx);
  const sy = ty * ty * (3 - 2 * ty);
  const h = (a, b) => hash(((a % period) + period) % period, b, s);
  const top = h(ix, iy) * (1 - sx) + h(ix + 1, iy) * sx;
  const bot = h(ix, iy + 1) * (1 - sx) + h(ix + 1, iy + 1) * sx;
  return top * (1 - sy) + bot * sy;
}
const fbm = (x, y, scale, s) => noise(x, y, scale, s) * 0.55 + noise(x, y, scale / 2, s + 1) * 0.3 + noise(x, y, scale / 4, s + 2) * 0.15;

// ---- the land, drawn as outlines ----
const LAND = [
  // The western continents: a broad north, a narrow isthmus and a long south.
  [[18, 11], [40, 7], [70, 7], [88, 12], [92, 20], [84, 25], [80, 31], [74, 35], [70, 40], [62, 44], [56, 46], [52, 42], [44, 38], [34, 34], [24, 28], [16, 20]],
  [[53, 43], [58, 43], [67, 51], [62, 54]],
  [[60, 51], [72, 49], [84, 53], [91, 60], [87, 70], [79, 78], [71, 86], [64, 89], [61, 80], [57, 68], [56, 58]],
  // The great northern continent, from the western peninsulas to the far east coast.
  [[112, 16], [118, 10], [132, 7], [150, 9], [170, 6], [200, 5], [230, 6], [252, 9], [264, 14], [266, 22], [258, 28], [254, 36], [246, 40], [238, 44], [228, 42], [220, 46], [212, 44], [206, 38], [198, 42], [190, 44], [182, 38], [176, 34], [166, 32], [160, 29], [150, 31], [140, 29], [130, 31], [122, 29], [114, 24]],
  [[126, 11], [130, 3], [140, 3], [139, 11]],
  // Its southern peninsulas.
  [[192, 38], [207, 38], [206, 50], [200, 57], [193, 48]],
  [[219, 41], [231, 41], [229, 56], [221, 55]],
  [[166, 31], [180, 33], [187, 40], [179, 47], [170, 43]],
  // The southern continent across the inner sea.
  [[118, 36], [132, 33], [150, 34], [162, 36], [170, 42], [172, 50], [166, 58], [160, 68], [152, 78], [144, 82], [138, 76], [134, 64], [126, 56], [116, 50], [112, 42]],
  // The island continent of the south-east.
  [[220, 64], [234, 60], [250, 62], [258, 68], [254, 78], [240, 82], [226, 80], [218, 72]],
  // Large islands.
  [[95, 8], [108, 6], [111, 13], [101, 18], [94, 14]],
  [[101, 16], [111, 15], [113, 26], [103, 28]],
  [[263, 14], [276, 12], [279, 24], [274, 36], [265, 34], [266, 24]],
  // Specialty islands: coffee highlands in the south-west, a mango isle in the south, an oil island in the south-east sea,
  // twin isles far east and a small oil rock in the western gap.
  [[15, 62], [25, 56], [38, 58], [43, 66], [39, 76], [29, 80], [18, 75], [13, 68]],
  [[95, 66], [106, 60], [118, 62], [123, 71], [118, 81], [106, 84], [97, 78]],
  [[181, 70], [194, 65], [207, 68], [209, 78], [201, 86], [188, 85], [180, 78]],
  [[265, 43], [275, 40], [284, 45], [285, 54], [278, 61], [268, 58], [263, 50]],
  [[93, 33], [103, 30], [110, 35], [109, 45], [98, 48], [92, 41]],
];
// The specialty islands: [x, y, radius around them where the usual resources are held back].
const SPECIAL_ISLANDS = [
  { name: 'coffee', x: 28, y: 68, r: 14 },
  { name: 'mango', x: 108, y: 72, r: 14 },
  { name: 'oil', x: 194, y: 77, r: 14 },
  { name: 'twin', x: 274, y: 50, r: 13 },
  { name: 'rock', x: 101, y: 39, r: 10 },
];
const ISLANDS = [
  // [x, y, rx, ry]
  [176, 64, 2.6, 6], [232, 50, 5, 2], [242, 52, 4, 2], [250, 54, 4, 2.2], [260, 50, 3, 2], [236, 56, 3, 1.6],
  [78, 40, 3, 1.5], [86, 42, 2, 1.5], [272, 76, 2.2, 5], [276, 84, 2.2, 4], [8, 50, 2, 2], [20, 60, 1.6, 1.6], [284, 56, 1.6, 1.6],
  [44, 92 - 6, 3, 1.5],
  [50, 58, 2, 1.4], [10, 80, 2.4, 1.6], [40, 88, 2, 1.4], [64, 92, 2.2, 1.2], [120, 58, 1.6, 1.4], [126, 88, 2.2, 1.4],
  [94, 90, 2, 1.2], [166, 80, 2, 1.6], [216, 60, 2, 1.4], [212, 90, 2.4, 1.4], [268, 90, 2, 1.4], [250, 90, 2, 1.2],
  [284, 34, 1.6, 1.4], [204, 56, 2, 1.2], [4, 70, 1.6, 1.4], [134, 94, 2, 1.0], [150, 90, 1.8, 1.2], [232, 88, 2, 1.2],
];
const LAKES = [[40, 20, 2, 1.5], [66, 28, 3, 1.2], [70, 25, 2, 1], [150, 52, 2, 3], [210, 12, 2.5, 1.5], [172, 22, 3.5, 5.5]];
const BAYS = [[[58, 12], [68, 13], [70, 20], [62, 22], [56, 18]]];
// Mountain ranges: a line, its half-width and its peak height.
const RANGES = [
  [[[24, 14], [30, 24], [40, 33], [50, 41]], 3.2, 250],
  [[[77, 21], [73, 32]], 1.8, 205],
  [[[62, 55], [60, 66], [63, 79], [66, 86]], 2.6, 255],
  [[[127, 21], [139, 22]], 2.2, 232],
  [[[131, 5], [136, 9]], 1.5, 205],
  [[[177, 8], [178, 18]], 1.8, 208],
  [[[190, 34], [206, 32], [218, 36]], 3.4, 255],
  [[[200, 18], [222, 20]], 2.4, 222],
  [[[160, 46], [156, 62]], 1.8, 212],
  [[[121, 37], [132, 36]], 1.4, 200],
  [[[252, 66], [250, 76]], 1.5, 200],
  [[[276, 27], [274, 33]], 1.0, 200],
  [[[24, 67], [34, 69]], 1.8, 214],
  [[[103, 70], [112, 74]], 1.2, 196],
];
// Towns and cities, placed by hand; each is moved to the nearest spot where it fits on flat, dry land. The first is home.
const PLACES = [
  ['Ashford', 122, 15, 3],
  ['Kelmere', 143, 17, 3],
  ['Lindholm', 156, 20, 5],
  ['Calder', 168, 12, 3],
  ['Norvik', 132, 7, 3],
  ['Westhaven', 107, 21, 3],
  ['Sahra', 140, 40, 3],
  ['Port Amara', 124, 49, 5],
  ['Zembe', 150, 57, 3],
  ['Kaya', 142, 70, 3],
  ['Mbeli', 161, 50, 3],
  ['Qadir', 178, 40, 3],
  ['Tashk', 187, 26, 3],
  ['Hanlu', 232, 26, 5],
  ['Pinyao', 246, 32, 3],
  ['Karsk', 196, 12, 3],
  ['Irkov', 222, 11, 3],
  ['Delhan', 199, 45, 3],
  ['Siam', 225, 47, 3],
  ['Kyomi', 270, 20, 3],
  ['Sydra', 246, 71, 5],
  ['Perrin', 227, 71, 3],
  ['Vance', 58, 28, 5],
  ['Brookfield', 79, 21, 3],
  ['Elkton', 34, 18, 3],
  ['Marlow', 42, 25, 3],
  ['Rio Palma', 75, 61, 5],
  ['Varga', 79, 73, 3],
  ['Ventura', 26, 68, 3],
  ['Port Mango', 106, 72, 3],
  ['Oilport', 191, 76, 3],
  ['Kona', 273, 50, 3],
  ['Northholm', 100, 39, 3],
];

// ---- rasterise ----
const inPoly = (poly, x, y) => {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
};
const inEllipse = ([cx, cy, rx, ry], x, y) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;
const segDist = (px, py, [ax, ay], [bx, by]) => {
  const dx = bx - ax;
  const dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - ax - t * dx, py - ay - t * dy);
};

const terrain = new Array(W * H);
const elev = new Array(W * H).fill(0);
const at = (x, y) => y * W + (((x % W) + W) % W);
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    // Rough the coasts: sample the outlines at a point pushed about by noise.
    const wx = x + 0.5 + (fbm(x, y, 9, 11) - 0.5) * 5;
    const wy = y + 0.5 + (fbm(x, y, 9, 12) - 0.5) * 4;
    let land = LAND.some((p) => inPoly(p, wx, wy)) || ISLANDS.some((e) => inEllipse(e, wx, wy));
    if (LAKES.some((e) => inEllipse(e, wx, wy)) || BAYS.some((p) => inPoly(p, wx, wy))) land = false;
    terrain[at(x, y)] = y < ICE_ROWS || y >= H - ICE_ROWS ? 'ice' : land ? 'grass' : 'water';
  }
}
// Drop specks: single tiles of land or water that the noise left behind.
for (let pass = 0; pass < 2; pass++) {
  for (let y = ICE_ROWS; y < H - ICE_ROWS; y++) {
    for (let x = 0; x < W; x++) {
      const t = terrain[at(x, y)];
      const same = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => terrain[at(x + dx, y + dy)] === t).length;
      if (same <= 1) terrain[at(x, y)] = t === 'water' ? 'grass' : 'water';
    }
  }
}

// Distance to the coast, for heights that rise inland and seas that deepen offshore.
const coast = new Array(W * H).fill(Infinity);
const queue = [];
for (let y = ICE_ROWS; y < H - ICE_ROWS; y++) {
  for (let x = 0; x < W; x++) {
    const land = terrain[at(x, y)] !== 'water';
    if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => (terrain[at(x + dx, y + dy)] !== 'water') !== land && terrain[at(x + dx, y + dy)] !== 'ice')) {
      coast[at(x, y)] = 0;
      queue.push(at(x, y));
    }
  }
}
for (let q = 0; q < queue.length; q++) {
  const i = queue[q];
  const x = i % W;
  const y = (i - x) / W;
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const ny = y + dy;
    if (ny < 0 || ny >= H) continue;
    const j = at(x + dx, ny);
    if (coast[j] > coast[i] + 1) {
      coast[j] = coast[i] + 1;
      queue.push(j);
    }
  }
}

for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const i = at(x, y);
    const d = Math.min(coast[i], 30);
    if (terrain[i] === 'ice') {
      elev[i] = SEA + 4;
      continue;
    }
    if (terrain[i] === 'water') {
      elev[i] = Math.round(Math.max(14, SEA - 6 - Math.min(d, 6) * 5 - fbm(x, y, 14, 21) * 34));
      continue;
    }
    // Plains near the coast, rolling hills inland, then the ranges.
    let e = SEA + 3 + Math.min(d, 9) * 3.2 + fbm(x, y, 7, 31) * 26;
    for (const [line, w, peak] of RANGES) {
      let md = Infinity;
      for (let k = 1; k < line.length; k++) md = Math.min(md, segDist(x + 0.5, y + 0.5, line[k - 1], line[k]));
      const reach = w * 1.5 * (0.75 + fbm(x, y, 5, 41) * 0.6);
      if (md < reach * 1.8) {
        const k = Math.max(0, 1 - md / (reach * 1.8));
        e = Math.max(e, SEA + (peak - SEA) * Math.pow(k, 1.3) * (0.82 + fbm(x, y, 3, 43) * 0.3));
      }
    }
    elev[i] = Math.round(Math.min(255, e));
    terrain[i] = elev[i] >= MOUNTAIN ? 'mountain' : 'grass';
  }
}

// Forests by climate: dark northern pine belts, temperate woods, and rainforest near the equator; deserts stay open.
const DESERTS = [[[116, 34], [168, 34], [168, 46], [116, 46]], [[166, 31], [188, 31], [188, 47], [166, 47]], [[224, 64], [252, 64], [252, 78], [224, 78]], [[184, 18], [214, 18], [214, 30], [184, 30]], [[181, 67], [209, 67], [209, 87], [181, 87]]];
for (let y = ICE_ROWS; y < H - ICE_ROWS; y++) {
  for (let x = 0; x < W; x++) {
    const i = at(x, y);
    if (terrain[i] !== 'grass') continue;
    if (DESERTS.some((p) => inPoly(p, x + 0.5, y + 0.5))) continue;
    const lat = Math.abs(y + 0.5 - H / 2) / (H / 2);
    const want = lat > 0.62 ? 0.5 : lat < 0.22 ? 0.52 : 0.6;
    if (fbm(x, y, 8, 51) > want && elev[i] < MOUNTAIN - 14) terrain[i] = 'forest';
  }
}

// ---- towns ----
const placed = [];
const fits = (cx, cy, R) => {
  if (cy - R - 1 < ICE_ROWS + 1 || cy + R + 1 >= H - ICE_ROWS - 1) return false;
  let lo = 255;
  let hi = 0;
  for (let dy = -R - 1; dy <= R + 1; dy++) {
    for (let dx = -R - 1; dx <= R + 1; dx++) {
      const t = terrain[at(cx + dx, cy + dy)];
      if (t === 'water' || t === 'mountain' || t === 'ice') return false;
      lo = Math.min(lo, elev[at(cx + dx, cy + dy)]);
      hi = Math.max(hi, elev[at(cx + dx, cy + dy)]);
    }
  }
  if (hi - lo > (R === 5 ? 90 : 70)) return false;
  return placed.every((p) => {
    let dx = Math.abs(p.x - cx);
    dx = Math.min(dx, W - dx);
    const gap = p.radius + R + 4;
    return dx >= gap || Math.abs(p.y - cy) >= gap;
  });
};
const report = [];
for (const [name, x0, y0, R] of PLACES) {
  let best = null;
  for (let r = 0; r <= 8 && !best; r++) {
    const ring = [];
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (Math.max(Math.abs(dx), Math.abs(dy)) === r) ring.push([dx, dy]);
    ring.sort((a, b) => Math.hypot(...a) - Math.hypot(...b));
    for (const [dx, dy] of ring) if (fits(x0 + dx, y0 + dy, R)) {
      best = [x0 + dx, y0 + dy];
      break;
    }
  }
  if (!best) {
    const why = {};
    for (let dy = -R - 1; dy <= R + 1; dy++) for (let dx = -R - 1; dx <= R + 1; dx++) { const t = terrain[at(x0 + dx, y0 + dy)]; why[t] = (why[t] || 0) + 1; }
    const near = placed.filter((p) => Math.abs(p.x - x0) < p.radius + R + 4 + 8 && Math.abs(p.y - y0) < p.radius + R + 4 + 8).map((p) => p.name);
    report.push(`NO ROOM: ${name} ${JSON.stringify(why)} near ${near}`);
    continue;
  }
  const [x, y] = best;
  if (x !== x0 || y !== y0) report.push(`moved ${name} by ${x - x0},${y - y0}`);
  placed.push({ name, x: ((x % W) + W) % W, y, radius: R });
  // The town's ground is cleared and level.
  const e0 = elev[at(x, y)];
  for (let dy = -R - 1; dy <= R + 1; dy++) {
    for (let dx = -R - 1; dx <= R + 1; dx++) {
      const i = at(x + dx, y + dy);
      terrain[i] = 'grass';
      if (Math.max(Math.abs(dx), Math.abs(dy)) <= R) elev[i] = e0;
    }
  }
}

// ---- island specialties ----
// Coffee on the highest ground that is not rock, mangoes on low flat land, oil on open flat ground; each at least three tiles
// from the sea and clear of the towns and of each other.
const specials = [];
// Island goods keep clear of the island towns' grown streets (about radius + 7), except on the tiny twin island.
let GAP = 8;
const WANT = [
  { island: 'coffee', kind: 'coffee', count: 4, high: true },
  { island: 'mango', kind: 'mango', count: 4, high: false },
  { island: 'oil', kind: 'oil', count: 3, high: false },
  { island: 'twin', kind: 'coffee', count: 2, high: true },
  { island: 'twin', kind: 'mango', count: 2, high: false },
];
for (const w of WANT) {
  const isl = SPECIAL_ISLANDS.find((q) => q.name === w.island);
  const cands = [];
  for (let dy = -isl.r; dy <= isl.r; dy++) {
    for (let dx = -isl.r; dx <= isl.r; dx++) {
      const x = isl.x + dx;
      const y = isl.y + dy;
      const i = at(x, y);
      if (terrain[i] !== 'grass' && terrain[i] !== 'forest') continue;
      if (coast[i] < 3) continue;
      if (placed.some((q) => Math.hypot(((q.x - x + W * 1.5) % W) - W / 2, q.y - y) < q.radius + (isl.name === 'twin' ? 4 : GAP))) continue;
      cands.push({ x: ((x % W) + W) % W, y, e: elev[i], d: Math.hypot(dx, dy) });
    }
  }
  cands.sort((a, b) => (w.high ? b.e - a.e : a.d - b.d) || a.d - b.d);
  let got = 0;
  for (const c of cands) {
    if (got >= w.count) break;
    if (specials.some((q) => Math.hypot(((q.x - c.x + W * 1.5) % W) - W / 2, q.y - c.y) < 5)) continue;
    specials.push({ kind: w.kind, x: c.x, y: c.y, quality: got % 3 === 1 ? 2 : 1 });
    got++;
  }
  if (got < w.count) report.push('only ' + got + ' of ' + w.count + ' ' + w.kind + ' on ' + w.island);
}

// ---- write ----
const CH = { water: '~', grass: '.', forest: 'f', mountain: '^', ice: '*' };
// The land is drawn on a 96-row grid; open sea is added beyond both ends so the playable map reaches nearer the poles and
// the polar caps beyond it shrink. The pole itself is a thin band of sea ice, and the old ice rows become sea.
const PAD = 14;
const seaRow = '~'.repeat(W);
const iceRow = '*'.repeat(W);
const seaElev = '28'.repeat(W);
const iceElev = '64'.repeat(W);
const rows = [];
const erows = [];
for (let k = 0; k < PAD; k++) {
  const ice = k < ICE_ROWS;
  rows.push(ice ? iceRow : seaRow);
  erows.push(ice ? iceElev : seaElev);
}
for (let y = 0; y < H; y++) {
  let r = '';
  let e = '';
  for (let x = 0; x < W; x++) {
    const ice = terrain[at(x, y)] === 'ice';
    r += ice ? '~' : CH[terrain[at(x, y)]];
    e += (ice ? 0x2e : elev[at(x, y)]).toString(16).padStart(2, '0');
  }
  rows.push(r);
  erows.push(e);
}
for (let k = 0; k < PAD; k++) {
  const ice = k >= PAD - ICE_ROWS;
  rows.push(ice ? iceRow : seaRow);
  erows.push(ice ? iceElev : seaElev);
}
const map = { id: 'map1', name: 'The Known World', seed: 1101, width: W, height: H + 2 * PAD, terrain: rows, elev: erows, places: placed.map((q) => ({ ...q, y: q.y + PAD })), nodes: [], specials: specials.map((q) => ({ ...q, y: q.y + PAD })), islands: SPECIAL_ISLANDS.map((q) => [q.x, q.y + PAD, q.r]) };
const out = path.join(__dirname, '../../src/maps/map1.json');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(map));
const land = terrain.filter((t) => t !== 'water' && t !== 'ice').length;
console.log(`land ${((land / (W * (H - 4))) * 100).toFixed(1)}%, places ${placed.length}`);
for (const r of report) console.log(r);

// ---- flat preview ----
const png = process.argv[2];
if (png) {
  const S = 4;
  const pw = W * S;
  const ph = H * S;
  const px = Buffer.alloc((pw * 3 + 1) * ph);
  const COL = { water: [52, 108, 160], grass: [118, 158, 84], forest: [52, 104, 60], mountain: [140, 128, 116], ice: [232, 238, 242] };
  const set = (X, Y, c) => {
    if (X < 0 || Y < 0 || X >= pw || Y >= ph) return;
    const o = Y * (pw * 3 + 1) + 1 + X * 3;
    px[o] = c[0];
    px[o + 1] = c[1];
    px[o + 2] = c[2];
  };
  for (let Y = 0; Y < ph; Y++) {
    for (let X = 0; X < pw; X++) {
      const i = at(Math.floor(X / S), Math.floor(Y / S));
      const c = COL[terrain[i]];
      const shade = terrain[i] === 'water' ? 0.6 + (elev[i] / SEA) * 0.4 : 0.8 + ((elev[i] - SEA) / (255 - SEA)) * 0.5;
      set(X, Y, c.map((v) => Math.min(255, Math.round(v * shade))));
    }
  }
  const SPEC = { coffee: [120, 70, 40], mango: [250, 160, 40], oil: [20, 20, 24] };
  specials.forEach((q) => {
    for (let a = 0; a < S * 2; a++) for (let b = 0; b < S * 2; b++) set(q.x * S + a, q.y * S + b, SPEC[q.kind]);
  });
  placed.forEach((p, k) => {
    const c = k === 0 ? [230, 60, 50] : p.radius === 5 ? [250, 200, 60] : [255, 255, 255];
    const x0 = (p.x - p.radius) * S;
    const x1 = (p.x + p.radius + 1) * S - 1;
    const y0 = (p.y - p.radius) * S;
    const y1 = (p.y + p.radius + 1) * S - 1;
    for (let X = x0; X <= x1; X++) for (const Y of [y0, y0 + 1, y1 - 1, y1]) set(X, Y, c);
    for (let Y = y0; Y <= y1; Y++) for (const X of [x0, x0 + 1, x1 - 1, x1]) set(X, Y, c);
  });
  for (let Y = 0; Y < ph; Y++) px[Y * (pw * 3 + 1)] = 0;
  const crcT = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc = (b) => {
    let c = 0xffffffff;
    for (const v of b) c = crcT[(c ^ v) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const c = Buffer.alloc(4);
    c.writeUInt32BE(crc(td));
    return Buffer.concat([len, td, c]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(pw, 0);
  ihdr.writeUInt32BE(ph, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  fs.writeFileSync(png, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(px)), chunk('IEND', Buffer.alloc(0))]));
}
