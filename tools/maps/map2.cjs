// Map 2: "The Continental", a Large made world (384 wide) that is mostly land. One great belt of country runs all the way round
// the globe: a western cordillera, a coast range, broad plains with a great river system running south to a gulf, a chain of
// great lakes, low eastern highlands, an eastern seaboard, and a far-eastern range. About 85% of it is land.
// Run `node tools/maps/map2.cjs [preview.png]` to bake src/maps/map2.json (and draw a flat preview).
//
// Real geography decides where things go, not chance: rivers rise in the foothills of a range and run to the sea, their valleys
// are flat flood plains with woods along the banks, cities stand at river mouths, lake shores and on the coast, coal and ore lie
// at the foot of the old eastern highlands, oil on the gulf coast and in the south-western basin, coffee on the warm south-western
// slopes, mangoes in the south-east. The only randomness is a fixed noise that roughens coastlines and hills.
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const W = 384;
const H = 128;
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

// ---- the geography, placed by hand ----
// The polar seas: land begins this many rows from each pole (plus a little noise), so the belt of country has a coast.
const NORTH_SEA = 6;
const SOUTH_SEA = 6;
// The gulf: a bay of the southern sea cutting up into the middle of the continent.
const GULF = [[146, 120], [148, 112], [156, 102], [170, 96], [186, 93], [204, 96], [216, 104], [222, 112], [226, 121]];
const LAKES = [[272, 28, 10, 4.5], [288, 36, 8, 3.6], [302, 26, 6, 3], [264, 38, 5, 3], [283, 20, 5, 2.5], [70, 62, 4, 2.2], [140, 92, 3, 2], [205, 30, 4, 2.2], [350, 70, 3.5, 2], [108, 76, 3, 1.8]];
// Rivers: [name, points, width]. Each rises in foothills and ends in the sea, a lake or another river.
const RIVERS = [
  ['Great River', [[205, 32], [198, 44], [196, 56], [190, 68], [192, 80], [189, 93]], 1.8],
  ['Missouri', [[68, 36], [86, 39], [110, 44], [140, 50], [168, 56], [196, 58]], 1.6],
  ['Ohio', [[246, 62], [232, 64], [214, 68], [196, 69]], 1.5],
  ['Lake outflow', [[262, 40], [256, 52], [246, 62]], 1.3],
  ['Northern River', [[120, 16], [118, 28], [112, 41]], 1.2],
  ['Western River', [[44, 82], [40, 96], [36, 112], [38, 120]], 1.4],
  ['Eastern River', [[322, 40], [320, 64], [326, 90], [322, 120]], 1.6],
  ['Southern River', [[100, 80], [110, 96], [120, 112], [124, 120]], 1.3],
  ['Seaboard River', [[300, 56], [304, 80], [308, 104], [310, 120]], 1.3],
  ['Highland River', [[236, 80], [214, 84], [196, 86]], 1.2],
];
// Mountain ranges: a line, its half-width and its peak height.
const RANGES = [
  [[[52, 14], [48, 30], [56, 46], [50, 62], [58, 78], [52, 96], [60, 112]], 3.6, 255],
  [[[30, 20], [26, 44], [32, 70], [28, 98]], 2.0, 215],
  [[[270, 40], [262, 48], [250, 60], [240, 74], [232, 88], [226, 104]], 2.6, 222],
  [[[96, 108], [118, 106], [140, 110]], 2.2, 238],
  [[[330, 16], [326, 36], [332, 58], [326, 82], [330, 104]], 3.0, 248],
  [[[168, 62], [180, 66]], 1.6, 200],
  [[[150, 14], [176, 12], [204, 14]], 2.0, 204],
  [[[356, 24], [362, 44]], 1.6, 206],
  [[[78, 92], [86, 100]], 1.4, 200],
];
// Dry country: no woods, a little tough grass. [polygon]
const DRY = [[[62, 52], [112, 52], [112, 100], [62, 100]], [[90, 100], [150, 100], [150, 112], [90, 112]]];
// Cities (radius 5) and the towns placed by hand (radius 3). Each is moved to the nearest spot where it fits on flat, dry land.
// The first town is where a new game starts.
const PLACES = [
  ['Millbrook', 128, 47, 3],
  ['Midway', 156, 46, 5],
  ['Gulfport', 176, 88, 5],
  ['Lakeside', 254, 30, 5],
  ['Highgate', 190, 20, 5],
  ['Seaboard', 302, 62, 5],
  ['Pacifica', 14, 56, 5],
  ['Sundown', 32, 104, 5],
  ['Eastgate', 342, 50, 5],
  ['Riverton', 196, 62, 3],
  ['Ford Cross', 172, 56, 3],
  ['Highwater', 110, 41, 3],
  ['Coalbrook', 236, 70, 3],
  ['Ironvale', 246, 58, 3],
  ['Tidewater', 189, 90, 3],
];
// Oil, coffee and mangoes cannot be grown or dug everywhere: the gulf coast and the south-western basin hold oil, the warm
// south-western slopes coffee, and the south-eastern lowlands mangoes. [kind, x0, y0, x1, y1, count]
const SPECIAL_ZONES = [
  ['oil', 150, 84, 224, 100, 5],
  ['oil', 86, 98, 126, 110, 3],
  ['coffee', 56, 98, 86, 112, 4],
  ['mango', 300, 98, 346, 114, 4],
  ['mango', 224, 98, 262, 112, 3],
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
const lineDist = (line, x, y) => {
  let md = Infinity;
  for (let k = 1; k < line.length; k++) md = Math.min(md, segDist(x, y, line[k - 1], line[k]));
  return md;
};

const terrain = new Array(W * H);
const elev = new Array(W * H).fill(0);
const river = new Array(W * H).fill(false);
const at = (x, y) => y * W + (((x % W) + W) % W);
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const wx = x + 0.5 + (fbm(x, y, 9, 11) - 0.5) * 4;
    const wy = y + 0.5 + (fbm(x, y, 9, 12) - 0.5) * 3;
    const north = NORTH_SEA + (fbm(x, 0, 14, 13) - 0.5) * 5;
    const south = H - 1 - SOUTH_SEA + (fbm(x, 0, 14, 14) - 0.5) * 5;
    let land = wy >= north && wy <= south;
    if (LAKES.some((e) => inEllipse(e, wx, wy)) || inPoly(GULF, wx, wy)) land = false;
    terrain[at(x, y)] = y < ICE_ROWS || y >= H - ICE_ROWS ? 'ice' : land ? 'grass' : 'water';
  }
}
// Rivers: water a tile or two wide, with a little wander.
for (const [, pts, w] of RIVERS) {
  for (let y = ICE_ROWS + 1; y < H - ICE_ROWS - 1; y++) {
    for (let x = 0; x < W; x++) {
      const wx = x + 0.5 + (fbm(x, y, 6, 15) - 0.5) * 1.6;
      const wy = y + 0.5 + (fbm(x, y, 6, 16) - 0.5) * 1.6;
      if (lineDist(pts, wx, wy) < w / 2 + 0.4 && terrain[at(x, y)] !== 'ice') {
        terrain[at(x, y)] = 'water';
        river[at(x, y)] = true;
      }
    }
  }
}
// Drop specks: single tiles of land or water that the noise left behind (not river tiles).
for (let pass = 0; pass < 2; pass++) {
  for (let y = ICE_ROWS; y < H - ICE_ROWS; y++) {
    for (let x = 0; x < W; x++) {
      if (river[at(x, y)]) continue;
      const t = terrain[at(x, y)];
      const same = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => terrain[at(x + dx, y + dy)] === t).length;
      if (same <= 1) terrain[at(x, y)] = t === 'water' ? 'grass' : 'water';
    }
  }
}

// Distance to the nearest water of any kind, and to the sea or a lake only (not a river).
const waterDist = new Array(W * H).fill(Infinity);
const seaDist = new Array(W * H).fill(Infinity);
const spread = (dist, isSource) => {
  const queue = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (isSource(at(x, y))) {
    dist[at(x, y)] = 0;
    queue.push(at(x, y));
  }
  for (let q = 0; q < queue.length; q++) {
    const i = queue[q];
    const x = i % W;
    const y = (i - x) / W;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const ny = y + dy;
      if (ny < 0 || ny >= H) continue;
      const j = at(x + dx, ny);
      if (dist[j] > dist[i] + 1) {
        dist[j] = dist[i] + 1;
        queue.push(j);
      }
    }
  }
};
spread(waterDist, (i) => terrain[i] === 'water' || terrain[i] === 'ice');
spread(seaDist, (i) => (terrain[i] === 'water' && !river[i]) || terrain[i] === 'ice');

// Heights: low plains near the water rising gently inland, rolling hills, the ranges, and flat flood plains along every river.
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const i = at(x, y);
    if (terrain[i] === 'ice') {
      elev[i] = SEA + 4;
      continue;
    }
    if (terrain[i] === 'water') {
      elev[i] = river[i] ? SEA - 3 : Math.round(Math.max(14, SEA - 6 - Math.min(seaDist[i], 6) * 5 - fbm(x, y, 14, 21) * 30));
      continue;
    }
    let e = SEA + 4 + Math.min(seaDist[i], 14) * 1.6 + fbm(x, y, 7, 31) * 22;
    for (const [line, w, peak] of RANGES) {
      const md = lineDist(line, x + 0.5, y + 0.5);
      const reach = w * 1.5 * (0.75 + fbm(x, y, 5, 41) * 0.6);
      if (md < reach * 1.8) {
        const k = Math.max(0, 1 - md / (reach * 1.8));
        e = Math.max(e, SEA + (peak - SEA) * Math.pow(k, 1.3) * (0.82 + fbm(x, y, 3, 43) * 0.3));
      }
    }
    // A river valley: the ground drops to a flat flood plain beside the water, wider on the plains, narrow in the hills.
    if (waterDist[i] <= 4) {
      let nearRiver = false;
      for (let dy = -4; dy <= 4 && !nearRiver; dy++) for (let dx = -4; dx <= 4; dx++) if (river[at(x + dx, y + dy)] && Math.hypot(dx, dy) <= 4) { nearRiver = true; break; }
      if (nearRiver && e < MOUNTAIN - 20) e = Math.min(e, SEA + 3 + waterDist[i] * 4 + fbm(x, y, 5, 33) * 6);
    }
    elev[i] = Math.round(Math.min(255, e));
    terrain[i] = elev[i] >= MOUNTAIN ? 'mountain' : 'grass';
  }
}

// Woods by climate: a dark northern belt, woods on the eastern and western slopes, woods along every river bank, and open
// plains and dry country between.
for (let y = ICE_ROWS; y < H - ICE_ROWS; y++) {
  for (let x = 0; x < W; x++) {
    const i = at(x, y);
    if (terrain[i] !== 'grass') continue;
    if (DRY.some((p) => inPoly(p, x + 0.5, y + 0.5))) continue;
    const lat = Math.abs(y + 0.5 - H / 2) / (H / 2);
    // Woods thicken toward the poles and in the wetter east and west, and thin on the central plains (x 70 to 235).
    const plains = x > 70 && x < 235;
    let want = lat > 0.62 ? 0.46 : plains ? 0.7 : 0.55;
    // Along a river bank the woods run on through the plains.
    let bank = false;
    for (let dy = -3; dy <= 3 && !bank; dy++) for (let dx = -3; dx <= 3; dx++) if (river[at(x + dx, y + dy)]) { bank = true; break; }
    if (bank) want = 0.3;
    if (fbm(x, y, 8, 51) > want && elev[i] < MOUNTAIN - 14) terrain[i] = 'forest';
  }
}

// ---- towns ----
const placed = [];
const report = [];
const fits = (cx, cy, R) => {
  if (cy - R - 1 < NORTH_SEA + 2 || cy + R + 1 >= H - SOUTH_SEA - 2) return false;
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
    const gap = p.radius + R + 9;
    return dx >= gap || Math.abs(p.y - cy) >= gap;
  });
};
const claim = (name, x0, y0, R, reach = 8) => {
  let best = null;
  for (let r = 0; r <= reach && !best; r++) {
    const ring = [];
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (Math.max(Math.abs(dx), Math.abs(dy)) === r) ring.push([dx, dy]);
    ring.sort((a, b) => Math.hypot(...a) - Math.hypot(...b));
    for (const [dx, dy] of ring) if (fits(x0 + dx, y0 + dy, R)) {
      best = [x0 + dx, y0 + dy];
      break;
    }
  }
  if (!best) return false;
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
  return true;
};
for (const [name, x, y, R] of PLACES) if (!claim(name, x, y, R)) report.push(`NO ROOM: ${name}`);

// More towns, spread over the country the way real ones are: the open ground farthest from any town, favouring the
// banks of rivers and the shores of lakes and the sea, where towns grow.
const SYL1 = ['Ash', 'Bran', 'Cal', 'Dun', 'El', 'Fair', 'Glen', 'Har', 'Iron', 'Kel', 'Lin', 'Mar', 'North', 'Oak', 'Pine', 'Red', 'Stone', 'Tor', 'Vale', 'West', 'Win', 'Wood', 'Black', 'Clear', 'Green', 'High', 'Low', 'Rock', 'Silver', 'Sun'];
const SYL2 = ['ford', 'ton', 'ville', 'ham', 'bury', 'field', 'wick', 'port', 'dale', 'mouth', 'bridge', 'haven', 'stead', 'ridge', 'brook', 'crest', 'moor', 'gate', 'worth', 'holm'];
const used = new Set(PLACES.map((p) => p[0]));
let seq = 0;
const nextName = () => {
  for (;;) {
    const n = SYL1[Math.floor(hash(seq, 3, 7) * SYL1.length)] + SYL2[Math.floor(hash(seq, 5, 9) * SYL2.length)];
    seq++;
    if (!used.has(n)) {
      used.add(n);
      return n;
    }
  }
};
const TARGET_TOWNS = 50;
for (let guard = 0; placed.length < PLACES.length + TARGET_TOWNS && guard < 4000; guard++) {
  let best = null;
  let bestScore = -1;
  for (let y = NORTH_SEA + 6; y < H - SOUTH_SEA - 6; y += 2) {
    for (let x = 0; x < W; x += 2) {
      if (terrain[at(x, y)] === 'water' || terrain[at(x, y)] === 'mountain') continue;
      let d = Infinity;
      for (const p of placed) {
        let dx = Math.abs(p.x - x);
        dx = Math.min(dx, W - dx);
        d = Math.min(d, Math.hypot(dx, p.y - y));
      }
      // Towns like water: nearer a river or shore scores a little better.
      const score = d * (waterDist[at(x, y)] <= 6 ? 1.25 : 1) + hash(x, y, 77) * 2;
      if (score > bestScore && fits(x, y, 3)) {
        bestScore = score;
        best = [x, y];
      }
    }
  }
  if (!best || bestScore < 16) break;
  claim(nextName(), best[0], best[1], 3, 0);
}

// ---- island goods ----
const specials = [];
for (const [kind, x0, y0, x1, y1, count] of SPECIAL_ZONES) {
  const cands = [];
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const i = at(x, y);
      if (terrain[i] !== 'grass' && terrain[i] !== 'forest') continue;
      if (waterDist[i] < 2) continue;
      if (placed.some((q) => Math.hypot(((q.x - x + W * 1.5) % W) - W / 2, q.y - y) < q.radius + 9)) continue;
      cands.push({ x, y, e: elev[i], h: hash(x, y, 91), coast: seaDist[i] });
    }
  }
  // Coffee on the highest ground, oil and mangoes on the lowland nearest the shore.
  cands.sort((a, b) => (kind === 'coffee' ? b.e - a.e : a.coast - b.coast + (a.h - b.h) * 3));
  let got = 0;
  for (const c of cands) {
    if (got >= count) break;
    if (specials.some((q) => Math.hypot(((q.x - c.x + W * 1.5) % W) - W / 2, q.y - c.y) < 6)) continue;
    specials.push({ kind, x: c.x, y: c.y, quality: got % 3 === 1 ? 2 : 1 });
    got++;
  }
  if (got < count) report.push(`only ${got} of ${count} ${kind} in zone ${x0},${y0}`);
}

// ---- write ----
const CH = { water: '~', grass: '.', forest: 'f', mountain: '^', ice: '*' };
const rows = [];
const erows = [];
for (let y = 0; y < H; y++) {
  let r = '';
  let e = '';
  for (let x = 0; x < W; x++) {
    const t = terrain[at(x, y)];
    r += CH[t];
    e += (t === 'ice' ? 0x2e : elev[at(x, y)]).toString(16).padStart(2, '0');
  }
  rows.push(r);
  erows.push(e);
}
const map = { id: 'map2', name: 'The Continental', seed: 2202, width: W, height: H, terrain: rows, elev: erows, places: placed, nodes: [], specials, islands: [] };
const out = path.join(__dirname, '../../src/maps/map2.json');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(map));
let land = 0;
let water = 0;
let forest = 0;
let mountain = 0;
for (let y = ICE_ROWS; y < H - ICE_ROWS; y++) for (let x = 0; x < W; x++) {
  const t = terrain[at(x, y)];
  if (t === 'water') water++;
  else {
    land++;
    if (t === 'forest') forest++;
    if (t === 'mountain') mountain++;
  }
}
const total = land + water;
console.log(`land ${((land / total) * 100).toFixed(1)}%, water ${((water / total) * 100).toFixed(1)}%, forest ${((forest / land) * 100).toFixed(0)}% of land, mountain ${((mountain / land) * 100).toFixed(0)}% of land`);
console.log(`places ${placed.length} (${placed.filter((p) => p.radius === 5).length} cities), specials ${specials.length}`);
for (const r of report) console.log(r);

// ---- flat preview ----
const png = process.argv[2];
if (png) {
  const S = 3;
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
    for (let X = x0; X <= x1; X++) for (const Y of [y0, y1]) set(X, Y, c);
    for (let Y = y0; Y <= y1; Y++) for (const X of [x0, x1]) set(X, Y, c);
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
  console.log('preview', png);
}
