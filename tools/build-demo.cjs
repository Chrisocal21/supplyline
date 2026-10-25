// Builds the free demo: the same app with slDemo set in its packaged package.json, its own name and app id, no updates.
// Run after `vite build`. Windows: release-demo/Supplyline-Demo-Setup.exe. With --mac (on a Mac): release-demo/Supplyline-Demo-arm64.dmg and -x64.dmg.
const path = require('path');
const { spawnSync } = require('child_process');

const mac = process.argv.includes('--mac');
const common = ['--publish', 'never', '-c.extraMetadata.slDemo=true', '-c.appId=com.probablyfinestudios.supplyline.demo', '-c.productName=Supplyline Demo', '-c.directories.output=release-demo'];
const args = mac ? ['--mac', 'dmg', '--arm64', '--x64', ...common, '-c.mac.artifactName=Supplyline-Demo-${arch}.${ext}'] : ['--win', ...common, '-c.nsis.artifactName=Supplyline-Demo-Setup.exe'];
const r = spawnSync(process.execPath, [path.join(__dirname, '..', 'node_modules', 'electron-builder', 'cli.js'), ...args], { stdio: 'inherit', cwd: path.join(__dirname, '..'), env: mac ? { ...process.env, CSC_IDENTITY_AUTO_DISCOVERY: 'false' } : process.env });
process.exitCode = r.status ?? 1;
