// Usage: node shots.cjs <url> <outDir> <width> <height> <steps.js> [frames]
// Loads the game once, then takes one screenshot per step. steps.js runs in the page and must set
// window.__steps = [() => info, ...]. Each step sets up the view (camera, world edits) and may return a value to print.
// After each step the game runs a few frames, freezes, and the frame is saved as <outDir>/<index>.png.
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const [, , url, outDir, w = '1200', h = '760', stepsFile, frames = '8'] = process.argv;
const CH = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const port = 9300 + Math.floor(Math.random() * 600);
fs.mkdirSync(outDir, { recursive: true });
const dir = path.join(outDir, 'cdp-' + port);
const chrome = spawn(
  CH,
  ['--headless=new', '--disable-gpu', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', `--user-data-dir=${dir}`, `--remote-debugging-port=${port}`, `--window-size=${w},${h}`, 'about:blank'],
  { stdio: 'ignore' },
);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const done = (code) => {
  chrome.kill();
  try {
    fs.rmSync(dir, { recursive: true, force: true });
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
  const target = list.find((t) => t.type === 'page');
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  let id = 0;
  const pending = new Map();
  const logs = [];
  ws.onmessage = (m) => {
    const d = JSON.parse(m.data);
    if (d.id && pending.has(d.id)) {
      pending.get(d.id)(d);
      pending.delete(d.id);
    }
    if (d.method === 'Runtime.exceptionThrown') {
      const ex = d.params.exceptionDetails;
      logs.push('EXC ' + String((ex.exception && ex.exception.description) || ex.text).slice(0, 600));
    }
    if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') {
      logs.push('ERR ' + d.params.args.map((a) => a.value || a.description).join(' ').slice(0, 300));
    }
  };
  const send = (method, params = {}) =>
    new Promise((res) => {
      const i = ++id;
      pending.set(i, res);
      ws.send(JSON.stringify({ id: i, method, params }));
    });
  const evalJs = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, returnByValue: true });
    if (r.result && r.result.exceptionDetails) return 'THROW ' + String(r.result.exceptionDetails.exception && r.result.exceptionDetails.exception.description).slice(0, 600);
    return r.result && r.result.result ? r.result.result.value : undefined;
  };
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: +w, height: +h, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url });
  const waitFrozen = async () => {
    for (let i = 0; i < 400; i++) {
      if ((await evalJs('window.__frozen === true')) === true) return true;
      await sleep(300);
    }
    return false;
  };
  if (!(await waitFrozen())) console.log('TIMEOUT waiting for first freeze');
  const setup = await evalJs(fs.readFileSync(stepsFile, 'utf8') + '\n;window.__steps.length');
  console.log('steps:', setup);
  const n = typeof setup === 'number' ? setup : 0;
  for (let i = 0; i < n; i++) {
    const r = await evalJs(`(() => { const r = window.__steps[${i}](); __game.freezeAfter(${+frames}); return r; })()`);
    await sleep(150);
    const ok = await waitFrozen();
    const shot = await send('Page.captureScreenshot', { format: 'png' });
    const file = path.join(outDir, i + '.png');
    fs.writeFileSync(file, Buffer.from(shot.result.data, 'base64'));
    console.log(i, ok ? 'ok' : 'TIMEOUT', r === undefined ? '' : JSON.stringify(r));
  }
  for (const l of logs.slice(0, 8)) console.log(l);
  ws.close();
  done(0);
})().catch((e) => {
  console.error(e);
  done(1);
});
