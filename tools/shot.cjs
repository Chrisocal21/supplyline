// Usage: node shot.cjs <url> <out.png> [width] [height] [jsExpression]
// Waits for the game to freeze, optionally runs a JS expression (which should end with __game.freezeAfter()),
// waits again, then captures. Prints any page errors.
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const [, , url, out, w = '1400', h = '900', expr] = process.argv;
const CH = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const port = 9300 + Math.floor(Math.random() * 600);
const dir = path.join(path.dirname(out), 'cdp-' + port);
const chrome = spawn(
  CH,
  [
    '--headless=new',
    '--disable-gpu',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    `--user-data-dir=${dir}`,
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
    return r.result && r.result.result ? r.result.result.value : undefined;
  };
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: +w, height: +h, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url });
  const waitFrozen = async () => {
    for (let i = 0; i < 300; i++) {
      if ((await evalJs('window.__frozen === true')) === true) return true;
      await sleep(500);
    }
    return false;
  };
  let ok = await waitFrozen();
  if (process.env.MOUSE) {
    const [mx, my] = process.env.MOUSE.split(',').map(Number);
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: mx, y: my });
    await sleep(200);
  }
  if (expr && ok) {
    const r = await evalJs(expr);
    if (r !== undefined) console.log('eval ->', JSON.stringify(r));
    await sleep(300);
    if (r && r.mouse) {
      // The expression asked for a mouse position (and has not refrozen the game itself).
      await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: r.mouse[0], y: r.mouse[1] });
      await sleep(200);
      if (r.click) {
        await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: r.mouse[0], y: r.mouse[1], button: 'left', clickCount: 1 });
        await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: r.mouse[0], y: r.mouse[1], button: 'left', clickCount: 1 });
        await sleep(200);
      }
      await evalJs('__game.freezeAfter(24)');
      await sleep(300);
    }
    ok = await waitFrozen();
  }
  if (process.env.AFTER) console.log('after ->', JSON.stringify(await evalJs(process.env.AFTER)));
    const shot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(out, Buffer.from(shot.result.data, 'base64'));
  console.log(ok ? 'frozen' : 'TIMEOUT-captured-anyway', out);
  for (const l of logs.slice(0, 6)) console.log(l);
  ws.close();
  chrome.kill();
  process.exit(0);
})().catch((e) => {
  console.error(e);
  chrome.kill();
  process.exit(1);
});
