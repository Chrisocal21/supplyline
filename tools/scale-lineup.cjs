// Usage: node tools/scale-lineup.cjs [out.png]
// Draws the game's scale as a side view, every height in real metres (1 world unit = 10 m, one tile = 32.7 m):
// panel A people, vehicles and low buildings up close; panel B the skyline and the mountains at a quarter of that zoom.
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const out = path.resolve(process.argv[2] || path.join(__dirname, '..', 'docs', 'scale-lineup.png'));
const W = 2400;
const H = 1500;
const ink = '#e9eef3';
const dim = '#8fa0b0';
let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="Segoe UI, Arial, sans-serif">`;
s += `<rect width="${W}" height="${H}" fill="#0e1318"/>`;
const text = (x, y, t, size = 22, fill = ink, anchor = 'start', weight = 400) => {
  s += `<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" text-anchor="${anchor}" font-weight="${weight}">${t}</text>`;
};
const rect = (x, y, w, h, fill, stroke) => {
  s += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"${stroke ? ` stroke="${stroke}" stroke-width="1.5"` : ''}/>`;
};

// ---- Panel A: 30 px per metre ----
{
  const k = 30;
  const base = 470;
  text(40, 50, 'A. Up close: 1 metre = 30 px', 30, ink, 'start', 700);
  text(40, 82, 'People, vehicles and low buildings, at the sizes the game uses today', 20, dim);
  rect(0, base, W, 4, '#3a4652');
  for (let m = 0; m <= 12; m += 2) {
    rect(40, base - m * k, 10, 2, dim);
    text(58, base - m * k + 6, `${m} m`, 16, dim);
  }
  let x = 170;
  const item = (label, w, h, fill, floors, note) => {
    rect(x, base - h * k, w * k, h * k, fill, '#0e1318');
    if (floors) for (let f = 1; f < floors; f++) rect(x, base - f * 3.2 * k, w * k, 1.5, 'rgba(0,0,0,0.35)');
    text(x + (w * k) / 2, base + 30, label, 18, ink, 'middle', 600);
    text(x + (w * k) / 2, base + 52, note, 16, dim, 'middle');
    x += w * k + 28;
  };
  item('Person', 0.5, 1.8, '#e0b079', 0, '1.8 m');
  item('Car', 4.5, 1.5, '#6c8fb0', 0, '4.5 m long');
  item('Box truck', 8, 4, '#c0504d', 0, '8 m, 4 m high');
  item('Big box truck', 10, 4, '#d08a3c', 0, '10 m');
  item('Big rig', 18, 4, '#7a9a5b', 0, '18 m');
  item('Cottage', 8, 7, '#c9a27a', 2, '2 floors, 7 m');
  item('Terrace', 12, 12, '#b87358', 4, '4 floors, 12 m');
  text(40, 560, 'One tile is 32.7 m wide: a lot holds one of these (a rig is more than half a tile long, a cottage a quarter).', 18, dim);
}

// ---- Panel B: 4 px per metre ----
{
  const k = 3.2;
  const base = 1440;
  const y0 = 640;
  text(40, y0, 'B. The skyline and the mountains: 1 metre = 3.2 px', 30, ink, 'start', 700);
  text(40, y0 + 32, 'Every floor is 3.2 m (the lines). The person at the left is 1.8 m: the thin mark.', 20, dim);
  rect(0, base, W, 4, '#3a4652');
  for (const m of [50, 100, 150, 200]) {
    s += `<line x1="0" y1="${base - m * k}" x2="${W}" y2="${base - m * k}" stroke="#2a3440" stroke-dasharray="6 8"/>`;
    text(40, base - m * k - 6, `${m} m`, 18, dim);
  }
  rect(100, base - 1.8 * k, 2, 1.8 * k, '#e0b079');
  let x = 170;
  const tower = (label, w, h, fill, note) => {
    rect(x, base - h * k, w * k, h * k, fill, '#0e1318');
    for (let f = 1; f < h / 3.2; f++) rect(x, base - f * 3.2 * k, w * k, 1, 'rgba(0,0,0,0.3)');
    text(x + (w * k) / 2, base + 26, label, 17, ink, 'middle', 600);
    text(x + (w * k) / 2, base + 46, note, 15, dim, 'middle');
    x += w * k + 22;
  };
  tower('Cottage', 8, 7, '#c9a27a', '7 m');
  tower('Terrace', 12, 12, '#b87358', '12 m');
  tower('Low block', 25, 27, '#a8826a', '8 floors');
  tower('Mid-rise', 30, 54, '#8d98a5', '17 floors');
  tower('Tower', 32, 115, '#7f93a8', '36 floors');
  tower('Core cap', 32, 150, '#6f88a3', '47 floors');
  tower('Game today', 32, 95, '#9aa7b3', '30 floors (95 m)');
  // tile ruler
  rect(x + 10, base - 8, 32.7 * k, 8, '#f2b04c');
  text(x + 10 + (32.7 * k) / 2, base + 26, 'One tile', 17, ink, 'middle', 600);
  text(x + 10 + (32.7 * k) / 2, base + 46, '32.7 m', 15, dim, 'middle');
  // mountains: same footprint, today's 65 m peak and a 200 m peak
  const mount = (cx, h, fill, label, note, dx) => {
    const half = 130 * k * 1.25;
    s += `<polygon points="${cx - half * 2},${base} ${cx - half * 0.55},${base - h * k * 0.62} ${cx},${base - h * k} ${cx + half * 0.6},${base - h * k * 0.6} ${cx + half * 2},${base}" fill="${fill}" opacity="0.92"/>`;
    text(cx + dx, base - h * k - 12, label, 20, ink, 'middle', 700);
    text(cx + dx, base - h * k + 10, note, 16, ink, 'middle');
  };
  mount(1700, 200, '#4d5e48', 'Peak raised to 200 m', 'same footprint, 3 times the rise', -330);
  mount(1700, 65, '#7d9170', 'Mountain today: 65 m', 'lower than the 95 m tower', 0);
}

s += '</svg>';
const svg = out.replace(/\.png$/, '.svg');
fs.writeFileSync(svg, s);
const chrome = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const r = spawnSync(chrome, ['--headless=new', '--disable-gpu', `--screenshot=${out}`, `--window-size=${W},${H}`, '--hide-scrollbars', 'file:///' + svg.replace(/\\/g, '/')], { stdio: 'ignore' });
fs.rmSync(svg, { force: true });
console.log(r.status === 0 ? 'wrote ' + out : 'chrome failed');
