// Usage: node drive.cjs <url> <steps.json> [width] [height]
// Drives the game with real mouse and keyboard events over the DevTools protocol.
// Steps: {js}, {eval: "expr" -> stored as $name via "as"}, {click: "expr -> [x,y]"}, {drag: "expr -> [[x,y],...]"},
//        {key: "Escape"}, {wait: ms}, {shot: "file.png"}, {log: "expr"}
// Expressions may use `vars.name` for earlier results. A page is "ready" when window.__frozen is true.
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const [, , url, stepsFile, w = '1400', h = '900'] = process.argv;
const steps = JSON.parse(fs.readFileSync(stepsFile, 'utf8'));
const CH = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const port = 9300 + Math.floor(Math.random() * 600);
const outDir = path.dirname(stepsFile);
const chrome = spawn(
  CH,
  [
    '--headless=new',
    '--disable-gpu',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    `--user-data-dir=${path.join(outDir, 'cdp-' + port)}`,
    `--remote-debugging-port=${port}`,
    `--window-size=${w},${h}`,
    'about:blank',
  ],
  { stdio: 'ignore' },
);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
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
      logs.push('EXC ' + String((ex.exception && ex.exception.description) || ex.text).slice(0, 500));
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
    if (r.result && r.result.exceptionDetails) {
      logs.push('EVAL-ERR ' + JSON.stringify(r.result.exceptionDetails.exception && r.result.exceptionDetails.exception.description).slice(0, 300));
    }
    return r.result && r.result.result ? r.result.result.value : undefined;
  };
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: +w, height: +h, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url });
  const waitFrozen = async () => {
    for (let i = 0; i < 300; i++) {
      if ((await evalJs('window.__frozen === true')) === true) return true;
      await sleep(400);
    }
    return false;
  };
  await waitFrozen();
  // Keep the game running while we drive it; we freeze only to take pictures.
  await evalJs('__game.shotMode = false; __game.freezeAfter(100000)');
  const vars = {};
  const mouse = (type, x, y, extra = {}) => send('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons: type === 'mouseReleased' ? 0 : 1, clickCount: 1, ...extra });
  const ev = async (expr) => evalJs(`(function(vars){ return (${expr}); })(${JSON.stringify(vars)})`);
  for (const [i, s] of steps.entries()) {
    if (s.eval) {
      const r = await ev(s.eval);
      if (s.as) vars[s.as] = r;
      if (s.print) console.log(`[${i}] ${s.as || 'eval'} ->`, JSON.stringify(r));
    } else if (s.js) {
      await ev(s.js);
    } else if (s.click) {
      const p = await ev(s.click);
      if (!p) {
        console.log(`[${i}] click: no point`, s.click);
        continue;
      }
      await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: p[0], y: p[1] });
      await sleep(120);
      await mouse('mousePressed', p[0], p[1]);
      await sleep(60);
      await mouse('mouseReleased', p[0], p[1]);
      await sleep(250);
    } else if (s.hover) {
      const p = await ev(s.hover);
      await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: p[0], y: p[1] });
      await sleep(250);
    } else if (s.drag) {
      const pts = await ev(s.drag);
      await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: pts[0][0], y: pts[0][1] });
      await sleep(100);
      await mouse('mousePressed', pts[0][0], pts[0][1]);
      for (const p of pts.slice(1)) {
        await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: p[0], y: p[1], button: 'left', buttons: 1 });
        await sleep(120);
      }
      const last = pts[pts.length - 1];
      await mouse('mouseReleased', last[0], last[1]);
      await sleep(300);
    } else if (s.key) {
      await send('Input.dispatchKeyEvent', { type: 'keyDown', key: s.key, code: s.code || s.key, windowsVirtualKeyCode: s.vk || 0 });
      await send('Input.dispatchKeyEvent', { type: 'keyUp', key: s.key, code: s.code || s.key, windowsVirtualKeyCode: s.vk || 0 });
      await sleep(200);
    } else if (s.wait) {
      await sleep(s.wait);
    } else if (s.shot) {
      await evalJs('__game.freezeAfter(10)');
      await sleep(300);
      await waitFrozen();
      const shot = await send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(path.join(outDir, s.shot), Buffer.from(shot.result.data, 'base64'));
      console.log(`[${i}] shot ${s.shot}`);
      await evalJs('__game.freezeAfter(100000)');
    }
  }
  for (const l of logs.slice(0, 10)) console.log(l);
  ws.close();
  chrome.kill();
  process.exit(0);
})().catch((e) => {
  console.error(e);
  chrome.kill();
  process.exit(1);
});
