// Map 3: "The Meridian Sea", a very large made world (768 wide, four times the land of Map 2) shaped to look nothing like Maps 1 and 2:
// no long straight strips, only coasts that bend and turn. A great crescent continent curls round an inland sea; a cold northern
// land lies across the top; a ring of broken coast circles a warm eastern basin; belts of islands trail south and west, and the
// warm south-east is a scatter of tropical islands where coffee, mangoes and oil lie, so ships and planes matter from the start.
// Run `node tools/maps/map3.cjs [preview.png]` to bake src/maps/map3.json (and draw a flat preview).
//
// Land comes from soft blobs bent by a warp of the ground, so every coast wanders; mountain ranges follow noise ridges, so they
// curve and fork; every river rises in the high ground and runs downhill to the sea; woods grow in big clumps, thicker in the cold
// north and the wet west, with dry country in between; towns fill the open ground the way real ones do.
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const W = 768;
const H = 256;
const SEA = 96;
const MOUNTAIN = 188;
const ICE_ROWS = 3;
const NORTH_SEA = 10;
const SOUTH_SEA = 10;

function hash(ix, iy, s) {
  let a = (Math.imul(ix, 374761393) + Math.imul(iy, 668265263) + Math.imul(s, 2246822519)) >>> 0;
  a = Math.imul(a ^ (a >>> 13), 1274126177) >>> 0;
  return ((a ^ (a >>> 16)) >>> 0) / 4294967296;
}
function noise(x, y, scale, s) {
  const period = Math.max(1, Math.round(W / scale));
  const fx = (x / W) * period;
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
const at = (x, y) => y * W + (((x % W) + W) % W);
const wdx = (a, b) => {
  let d = Math.abs(a - b);
  return Math.min(d, W - d);
};

// ---- the land: soft blobs [cx, cy, rx, ry, strength] ----
const BLOBS = [];
// The great crescent: a chain of blobs along an arc that curls round an inland sea (its centre near 250, 134).
for (let k = 0; k < 11; k++) {
  const a = -2.5 + (k / 10) * 3.9;
  const wob = 1 + (hash(k, 1, 5) - 0.5) * 0.22;
  const cx = 250 + Math.cos(a) * 92 * wob;
  const cy = 132 + Math.sin(a) * 74 * wob;
  BLOBS.push([cx, cy, 34 + hash(k, 2, 5) * 12, 26 + hash(k, 3, 5) * 10, 1]);
}
// The cold north: three lobes with fjord country between.
BLOBS.push([470, 42, 64, 22, 1], [546, 52, 48, 24, 1], [612, 38, 54, 18, 1], [420, 56, 30, 16, 0.9], [668, 56, 30, 18, 0.9]);
// A warm basin ringed by broken coast in the east.
for (let k = 0; k < 9; k++) {
  const a = 0.35 + (k / 9) * 5.3;
  BLOBS.push([566 + Math.cos(a) * 58, 150 + Math.sin(a) * 40, 26 + hash(k, 7, 9) * 10, 20 + hash(k, 8, 9) * 8, 0.95]);
}
// A broad highland west of the arc, and an island-continent in the far west.
BLOBS.push([700, 128, 40, 34, 1], [730, 160, 28, 26, 0.95], [60, 100, 38, 30, 1], [40, 146, 26, 24, 0.9], [92, 70, 22, 18, 0.9]);
// Island belts: south and west trails of medium islands, and the scatter of the warm south-east.
const seeded = (n, x0, x1, y0, y1, r0, r1, s) => {
  for (let k = 0; k < n; k++) BLOBS.push([x0 + hash(k, 1, s) * (x1 - x0), y0 + hash(k, 2, s) * (y1 - y0), r0 + hash(k, 3, s) * (r1 - r0), (r0 + hash(k, 4, s) * (r1 - r0)) * 0.75, 0.9]);
};
seeded(16, 120, 520, 214, 240, 7, 17, 31);
seeded(26, 300, 740, 190, 238, 4, 12, 32);
seeded(12, 4, 150, 176, 236, 6, 14, 33);
seeded(10, 330, 470, 108, 168, 6, 12, 34);

const landField = new Float32Array(W * H);
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    // The ground is read through a warp, so every coast wanders and the blobs lose their round shape.
    const wx = x + (fbm(x, y, 44, 201) - 0.5) * 46 + (fbm(x, y, 14, 203) - 0.5) * 12;
    const wy = y + (fbm(x, y, 44, 202) - 0.5) * 34 + (fbm(x, y, 14, 204) - 0.5) * 9;
    let v = 0;
    for (const [cx, cy, rx, ry, st] of BLOBS) {
      const dx = wdx(wx, cx) / rx;
      const dy = (wy - cy) / ry;
      const d2 = dx * dx + dy * dy;
      if (d2 < 4) v = Math.max(v, st * (1 - d2 / 4) ** 1.5);
    }
    landField[at(x, y)] = v + (fbm(x, y, 11, 205) - 0.5) * 0.34 + (fbm(x, y, 4, 206) - 0.5) * 0.12;
  }
}
// The threshold that makes about 54% of the world land.
const rowsOk = [];
for (let y = NORTH_SEA; y < H - SOUTH_SEA; y++) rowsOk.push(y);
const sorted = [];
for (const y of rowsOk) for (let x = 0; x < W; x += 2) sorted.push(landField[at(x, y)]);
sorted.sort((a, b) => a - b);
const THRESH = sorted[Math.floor(sorted.length * 0.46)];

const terrain = new Array(W * H);
const elev = new Array(W * H).fill(0);
const river = new Array(W * H).fill(false);
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const polar = y < ICE_ROWS || y >= H - ICE_ROWS;
    const sea = y < NORTH_SEA || y >= H - SOUTH_SEA;
    terrain[at(x, y)] = polar ? 'ice' : sea ? 'water' : landField[at(x, y)] > THRESH ? 'grass' : 'water';
  }
}
// Drop specks and fill pinholes the noise left behind.
for (let pass = 0; pass < 3; pass++) {
  for (let y = ICE_ROWS; y < H - ICE_ROWS; y++) {
    for (let x = 0; x < W; x++) {
      const t = terrain[at(x, y)];
      const same = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => terrain[at(x + dx, y + dy)] === t).length;
      if (same <= 1) terrain[at(x, y)] = t === 'water' ? 'grass' : 'water';
    }
  }
}
// Small ponds of sea inside land are lakes: keep them, but remove one-tile land specks.

// ---- distance to water ----
const spread = (dist, isSource) => {
  const queue = [];
  dist.fill(Infinity);
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
const seaDist = new Array(W * H);
spread(seaDist, (i) => terrain[i] === 'water' || terrain[i] === 'ice');

// ---- heights: lowland near the sea, rolling hills, curving ridges ----
const hill = new Array(W * H).fill(0);
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const i = at(x, y);
    if (terrain[i] !== 'grass') continue;
    const inland = Math.min(seaDist[i], 22) / 22;
    // Ridges: where a warped noise crosses its middle value, bent and forked by the second noise.
    const wx = x + (fbm(x, y, 30, 311) - 0.5) * 36;
    const wy = y + (fbm(x, y, 30, 312) - 0.5) * 28;
    const r1 = 1 - Math.abs(2 * fbm(wx, wy, 52, 301) - 1);
    const r2 = 1 - Math.abs(2 * fbm(wx, wy, 26, 303) - 1);
    const ridge = Math.max(r1 > 0.9 ? (r1 - 0.9) / 0.1 : 0, r2 > 0.955 && inland > 0.5 ? ((r2 - 0.955) / 0.045) * 0.8 : 0);
    hill[i] = ridge * Math.min(1, 0.25 + inland * 1.3);
  }
}
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const i = at(x, y);
    if (terrain[i] === 'ice') {
      elev[i] = SEA + 4;
      continue;
    }
    if (terrain[i] === 'water') {
      elev[i] = Math.round(Math.max(14, SEA - 6 - Math.min(seaDist[i], 6) * 5 - fbm(x, y, 14, 21) * 30));
      continue;
    }
    let e = SEA + 4 + Math.min(seaDist[i], 16) * 1.5 + fbm(x, y, 8, 31) * 24;
    if (hill[i] > 0) e = Math.max(e, SEA + 10 + (255 - SEA - 14) * Math.pow(Math.min(1, hill[i]), 0.8) * (0.8 + fbm(x, y, 4, 43) * 0.3));
    elev[i] = Math.round(Math.min(255, e));
  }
}

// ---- rivers: from the high ground downhill to the sea, a lake or a bigger river ----
const sources = [];
const high = [];
for (let y = ICE_ROWS + 6; y < H - ICE_ROWS - 6; y++) for (let x = 0; x < W; x++) {
  const i = at(x, y);
  if (terrain[i] === 'grass' && elev[i] >= MOUNTAIN - 52 && seaDist[i] >= 8) high.push([x, y, elev[i] + hash(x, y, 55) * 12]);
}
high.sort((a, b) => b[2] - a[2]);
for (const [x, y] of high) {
  if (sources.length >= 90) break;
  if (sources.some(([sx, sy]) => wdx(sx, x) < 26 && Math.abs(sy - y) < 26)) continue;
  sources.push([x, y]);
}
const smooth = (x, y) => {
  let s = 0;
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) s += elev[at(x + dx, y + dy)];
  return s / 9;
};
let riverCount = 0;
for (const [sx, sy] of sources) {
  let x = sx;
  let y = sy;
  const seen = new Set();
  const trail = [];
  let reached = false;
  for (let step = 0; step < 600; step++) {
    const i = at(x, y);
    if (terrain[i] === 'water' || terrain[i] === 'ice') {
      reached = true;
      break;
    }
    if (river[i] && trail.length > 4) {
      reached = true;
      break;
    }
    seen.add(i);
    trail.push([x, y]);
    let best = null;
    let bv = Infinity;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]]) {
      const nx = x + dx;
      const ny = y + dy;
      if (ny < ICE_ROWS || ny >= H - ICE_ROWS || seen.has(at(nx, ny))) continue;
      const v = smooth(nx, ny) + (dx !== 0 && dy !== 0 ? 0.7 : 0) + (hash(nx, ny, 66 + step) - 0.5) * 2.6;
      if (v < bv) {
        bv = v;
        best = [nx, ny];
      }
    }
    if (!best) break;
    [x, y] = best;
  }
  if (!reached || trail.length < 24) continue;
  riverCount++;
  trail.forEach(([tx, ty], k) => {
    const wide = k > trail.length * 0.55;
    for (const [dx, dy] of wide ? [[0, 0], [1, 0], [0, 1]] : [[0, 0]]) {
      const i = at(tx + dx, ty + dy);
      if (terrain[i] === 'ice') continue;
      terrain[i] = 'water';
      river[i] = true;
      elev[i] = SEA - 3;
    }
  });
}
spread(seaDist, (i) => (terrain[i] === 'water' && !river[i]) || terrain[i] === 'ice');
const waterDist = new Array(W * H);
spread(waterDist, (i) => terrain[i] === 'water' || terrain[i] === 'ice');
// Flat flood plains beside every river, and the final mountains.
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const i = at(x, y);
    if (terrain[i] === 'water' || terrain[i] === 'ice') continue;
    if (waterDist[i] <= 4 && elev[i] < MOUNTAIN - 20) {
      let nearRiver = false;
      for (let dy = -4; dy <= 4 && !nearRiver; dy++) for (let dx = -4; dx <= 4; dx++) if (river[at(x + dx, y + dy)] && Math.hypot(dx, dy) <= 4) { nearRiver = true; break; }
      if (nearRiver) elev[i] = Math.round(Math.min(elev[i], SEA + 3 + waterDist[i] * 4 + fbm(x, y, 5, 33) * 6));
    }
    terrain[i] = elev[i] >= MOUNTAIN ? 'mountain' : 'grass';
  }
}

// ---- climate and woods: big clumps, thickest in the cold north and wet west, none in dry country ----
const dry = (x, y) => {
  const lat = Math.abs(y + 0.5 - H / 2) / (H / 2);
  return lat < 0.62 && fbm(x, y, 70, 401) > 0.64;
};
for (let y = ICE_ROWS; y < H - ICE_ROWS; y++) {
  for (let x = 0; x < W; x++) {
    const i = at(x, y);
    if (terrain[i] !== 'grass') continue;
    if (dry(x, y)) continue;
    const lat = Math.abs(y + 0.5 - H / 2) / (H / 2);
    let want = lat > 0.66 ? 0.36 : lat > 0.4 ? 0.47 : 0.54;
    let bank = false;
    for (let dy = -3; dy <= 3 && !bank; dy++) for (let dx = -3; dx <= 3; dx++) if (river[at(x + dx, y + dy)]) { bank = true; break; }
    if (bank) want -= 0.12;
    if (fbm(x, y, 12, 51) > want && elev[i] < MOUNTAIN - 12) terrain[i] = 'forest';
  }
}

// ---- towns ----
const placed = [];
const report = [];
const dmin = new Float32Array(W * H).fill(1e9);
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
    const dx = wdx(p.x, cx);
    const gap = p.radius + R + 9;
    return dx >= gap || Math.abs(p.y - cy) >= gap;
  });
};
const claim = (name, x, y, R) => {
  placed.push({ name, x: ((x % W) + W) % W, y, radius: R });
  const e0 = elev[at(x, y)];
  for (let dy = -R - 1; dy <= R + 1; dy++) {
    for (let dx = -R - 1; dx <= R + 1; dx++) {
      const i = at(x + dx, y + dy);
      terrain[i] = 'grass';
      if (Math.max(Math.abs(dx), Math.abs(dy)) <= R) elev[i] = e0;
    }
  }
  for (let dy = -70; dy <= 70; dy++) {
    const yy = y + dy;
    if (yy < 0 || yy >= H) continue;
    for (let dx = -70; dx <= 70; dx++) {
      const j = at(x + dx, yy);
      const d = Math.hypot(dx, dy);
      if (d < dmin[j]) dmin[j] = d;
    }
  }
};
const SYL1 = ['Ash', 'Bran', 'Cal', 'Dun', 'El', 'Fair', 'Glen', 'Har', 'Iron', 'Kel', 'Lin', 'Mar', 'North', 'Oak', 'Pine', 'Red', 'Stone', 'Tor', 'Vale', 'West', 'Win', 'Wood', 'Black', 'Clear', 'Green', 'High', 'Low', 'Rock', 'Silver', 'Sun', 'Amber', 'Bright', 'Cedar', 'Dawn', 'East', 'Frost', 'Gold', 'Hazel', 'Ivy', 'Jade', 'Kings', 'Lake', 'Moss', 'Nor', 'Otter', 'Quill', 'Raven', 'Salt', 'Thorn', 'Under'];
const SYL2 = ['ford', 'ton', 'ville', 'ham', 'bury', 'field', 'wick', 'port', 'dale', 'mouth', 'bridge', 'haven', 'stead', 'ridge', 'brook', 'crest', 'moor', 'gate', 'worth', 'holm', 'ley', 'by', 'wood', 'cliff', 'shore'];
const used = new Set();
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
// Land components, so the start town can be on the great crescent and the far goods on the other lands.
const comp = new Int32Array(W * H).fill(-1);
const compSize = [];
for (let y = ICE_ROWS; y < H - ICE_ROWS; y++) for (let x = 0; x < W; x++) {
  const i = at(x, y);
  if (terrain[i] === 'water' || terrain[i] === 'ice' || comp[i] >= 0) continue;
  const id = compSize.length;
  let n = 0;
  const q = [i];
  comp[i] = id;
  for (let k = 0; k < q.length; k++) {
    const c = q[k];
    n++;
    const cx = c % W;
    const cy = (c - cx) / W;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const ny = cy + dy;
      if (ny < 0 || ny >= H) continue;
      const j = at(cx + dx, ny);
      if (comp[j] >= 0 || terrain[j] === 'water' || terrain[j] === 'ice') continue;
      comp[j] = id;
      q.push(j);
    }
  }
  compSize.push(n);
}
const biggest = compSize.indexOf(Math.max(...compSize));
// The start town: flat ground on the great crescent, on a river or the coast, with woods and fields close by.
let start = null;
let startScore = -1;
for (let y = NORTH_SEA + 8; y < H - SOUTH_SEA - 8; y += 2) for (let x = 0; x < W; x += 2) {
  if (comp[at(x, y)] !== biggest || !fits(x, y, 3)) continue;
  let woods = 0;
  for (let dy = -10; dy <= 10; dy += 2) for (let dx = -10; dx <= 10; dx += 2) if (terrain[at(x + dx, y + dy)] === 'forest') woods++;
  const lat = Math.abs(y - H / 2) / (H / 2);
  const score = woods * 2 + (waterDist[at(x, y)] <= 6 ? 14 : 0) + (lat < 0.55 ? 12 : 0) - Math.abs(wdx(x, 250)) * 0.05 + hash(x, y, 3) * 2;
  if (score > startScore) {
    startScore = score;
    start = [x, y];
  }
}
used.add('Hearthfield');
claim('Hearthfield', start[0], start[1], 3);
const CITIES = 18;
const TOWNS = 190;
for (let guard = 0; placed.length < CITIES + TOWNS && guard < 6000; guard++) {
  const R = placed.length < CITIES ? 5 : 3;
  let best = null;
  let bestScore = -1;
  for (let y = NORTH_SEA + 6; y < H - SOUTH_SEA - 6; y += 2) {
    for (let x = 0; x < W; x += 2) {
      const t = terrain[at(x, y)];
      if (t === 'water' || t === 'mountain') continue;
      const score = dmin[at(x, y)] * (waterDist[at(x, y)] <= 6 ? 1.25 : 1) + hash(x, y, 77) * 2;
      if (score > bestScore && fits(x, y, R)) {
        bestScore = score;
        best = [x, y];
      }
    }
  }
  if (!best || bestScore < 14) break;
  claim(nextName(), best[0], best[1], R);
}

// ---- island goods: coffee on warm highlands, mangoes on warm lowlands, oil on dry coasts, all away from the start continent ----
const specials = [];
const SPECIALS = [['coffee', 7], ['mango', 8], ['oil', 9]];
for (const [kind, count] of SPECIALS) {
  const cands = [];
  for (let y = NORTH_SEA + 6; y < H - SOUTH_SEA - 6; y++) {
    for (let x = 0; x < W; x++) {
      const i = at(x, y);
      if (terrain[i] !== 'grass' && terrain[i] !== 'forest') continue;
      if (comp[i] === biggest || compSize[comp[i]] < 60 || waterDist[i] < 2) continue;
      const lat = Math.abs(y - H / 2) / (H / 2);
      if (kind !== 'oil' && lat > 0.5) continue;
      if (kind === 'oil' && lat > 0.75) continue;
      if (placed.some((q) => Math.hypot(wdx(q.x, x), q.y - y) < q.radius + 9)) continue;
      cands.push({ x, y, e: elev[i], h: hash(x, y, 91), coast: seaDist[i] });
    }
  }
  cands.sort((a, b) => (kind === 'coffee' ? b.e - a.e : a.coast - b.coast + (a.h - b.h) * 3));
  let got = 0;
  for (const c of cands) {
    if (got >= count) break;
    if (specials.some((q) => Math.hypot(wdx(q.x, c.x), q.y - c.y) < 18)) continue;
    specials.push({ kind, x: c.x, y: c.y, quality: got % 3 === 1 ? 2 : 1 });
    got++;
  }
  if (got < count) report.push(`only ${got} of ${count} ${kind}`);
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
const map = { id: 'map3', name: 'The Meridian Sea', seed: 3303, width: W, height: H, terrain: rows, elev: erows, places: placed, nodes: [], specials, islands: [], forestNodes: true };
const out = path.join(__dirname, '../../src/maps/map3.json');
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
console.log(`land ${((land / total) * 100).toFixed(1)}%, forest ${((forest / land) * 100).toFixed(0)}% of land, mountain ${((mountain / land) * 100).toFixed(0)}% of land, rivers ${riverCount}`);
console.log(`places ${placed.length} (${placed.filter((p) => p.radius === 5).length} cities), specials ${specials.length}, land masses ${compSize.filter((n) => n >= 60).length}`);
for (const r of report) console.log(r);

// ---- flat preview ----
const png = process.argv[2];
if (png) {
  const S = 2;
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
      const c = river[i] ? [70, 130, 190] : COL[terrain[i]];
      const shade = terrain[i] === 'water' ? 0.6 + (elev[i] / SEA) * 0.4 : 0.8 + ((elev[i] - SEA) / (255 - SEA)) * 0.5;
      set(X, Y, c.map((v) => Math.min(255, Math.round(v * shade))));
    }
  }
  const SPEC = { coffee: [120, 70, 40], mango: [250, 160, 40], oil: [20, 20, 24] };
  specials.forEach((q) => {
    for (let a = 0; a < S * 3; a++) for (let b = 0; b < S * 3; b++) set(q.x * S + a, q.y * S + b, SPEC[q.kind]);
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
