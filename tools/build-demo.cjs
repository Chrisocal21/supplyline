// Builds the free demo installer: the same app with slDemo set in its packaged package.json, its own name and app id, no updates.
// Run after `vite build`. The installer lands in release-demo/Supplyline-Demo-Setup.exe.
const path = require('path');
const { spawnSync } = require('child_process');

const r = spawnSync(process.execPath, [path.join(__dirname, '..', 'node_modules', 'electron-builder', 'cli.js'), '--win', '--publish', 'never', '-c.extraMetadata.slDemo=true', '-c.appId=com.probablyfinestudios.supplyline.demo', '-c.productName=Supplyline Demo', '-c.directories.output=release-demo', '-c.nsis.artifactName=Supplyline-Demo-Setup.exe'], { stdio: 'inherit', cwd: path.join(__dirname, '..') });
process.exitCode = r.status ?? 1;
