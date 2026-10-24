// Builds the free demo installer: the same app with electron/demo.flag packed in, its own name and app id, no updates.
// Run after `vite build`. The installer lands in release-demo/Supplyline-Demo-Setup.exe.
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const flag = path.join(__dirname, '..', 'electron', 'demo.flag');
fs.writeFileSync(flag, 'demo');
try {
  const r = spawnSync(process.execPath, [path.join(__dirname, '..', 'node_modules', 'electron-builder', 'cli.js'), '--win', '--publish', 'never', '-c.appId=com.probablyfinestudios.supplyline.demo', '-c.productName=Supplyline Demo', '-c.directories.output=release-demo', '-c.nsis.artifactName=Supplyline-Demo-Setup.exe'], { stdio: 'inherit', cwd: path.join(__dirname, '..') });
  process.exitCode = r.status ?? 1;
} finally {
  fs.rmSync(flag, { force: true });
}
