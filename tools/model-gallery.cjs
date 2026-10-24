// Usage: node tools/model-gallery.cjs [outDir] [size]
// Opens the game in headless Chrome and renders every building (levels 1, 3 and 10), vehicle, district landmark and tree to a
// transparent PNG, plus a manifest.json that lists them. The default folder is docs/model-previews.
// GALLERY_ONLY=vehicle- redraws just the pictures whose name starts with that. Rerun it after any model changes, then `node web/scripts/assets.cjs` copies the pictures into the website.
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const outDir = path.resolve(process.argv[2] || path.join(root, 'docs', 'model-previews'));
const size = +(process.argv[3] || 512);
const url = process.env.GALLERY_URL || 'http://localhost:3000/play/#seed=11-shot';
const CH = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const port = 9300 + Math.floor(Math.random() * 600);
const profile = path.join(require('os').tmpdir(), 'sl-gallery-' + port);
const chrome = spawn(CH, ['--headless=new', '--disable-gpu', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', `--user-data-dir=${profile}`, `--remote-debugging-port=${port}`, '--window-size=900,700', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const done = (code) => {
  chrome.kill();
  try {
    fs.rmSync(profile, { recursive: true, force: true });
  } catch {}
  process.exit(code);
};
(async () => {
  let list;
  for (let i = 0; i < 60; i++) {
    try {
      list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      if (list.length) break;
    } catch {}
    await sleep(250);
  }
  const ws = new WebSocket(list.find((t) => t.type === 'page').webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  let id = 0;
  const pending = new Map();
  ws.onmessage = (m) => {
    const d = JSON.parse(m.data);
    if (d.id && pending.has(d.id)) {
      pending.get(d.id)(d);
      pending.delete(d.id);
    }
  };
  const send = (method, params = {}) => new Promise((res) => {
    const i = ++id;
    pending.set(i, res);
    ws.send(JSON.stringify({ id: i, method, params }));
  });
  const evalJs = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, returnByValue: true });
    if (r.result && r.result.exceptionDetails) throw new Error(String(r.result.exceptionDetails.exception && r.result.exceptionDetails.exception.description));
    return r.result.result.value;
  };
  await send('Runtime.enable');
  await send('Page.navigate', { url });
  for (let i = 0; i < 400; i++) {
    if ((await evalJs('window.__frozen === true')) === true) break;
    await sleep(300);
  }
  const specs = await evalJs('__game.galleryList()');
  fs.mkdirSync(outDir, { recursive: true });
  const only = process.env.GALLERY_ONLY || '';
  for (let i = 0; i < specs.length; i++) {
    if (only && !specs[i].key.startsWith(only)) continue;
    const data = await evalJs(`__game.galleryImage(${i}, ${size})`);
    fs.writeFileSync(path.join(outDir, specs[i].key + '.png'), Buffer.from(data.split(',')[1], 'base64'));
    if (i % 25 === 0) console.log(i + ' / ' + specs.length);
  }
  fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(specs.map((s) => ({ ...s, file: s.key + '.png' })), null, 1));
  console.log('wrote ' + specs.length + ' pictures to ' + outDir);
  ws.close();
  done(0);
})().catch((e) => {
  console.error(e);
  done(1);
});
