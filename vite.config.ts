import { spawnSync } from 'child_process';
import { cpSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { defineConfig, type Plugin } from 'vite';

/** The version the build was made at, read from src/version.ts. */
const builtVersion = (): string => /VERSION = '([^']+)'/.exec(readFileSync(resolve(__dirname, 'src/version.ts'), 'utf8'))?.[1] ?? '0';

/** Publishes /version.json so a game that is open can tell a newer build has gone out, and offer to sync to it. */
const versionFile = (): Plugin => ({
  name: 'version-file',
  generateBundle() {
    this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ version: builtVersion() }) });
  },
  configureServer(server) {
    server.middlewares.use('/version.json', (_req, res) => {
      res.setHeader('content-type', 'application/json');
      res.setHeader('cache-control', 'no-store');
      res.end(JSON.stringify({ version: builtVersion() }));
    });
  },
});

/**
 * The website (web/, a Next.js static export) is built and merged into dist beside the game, so one deploy serves both. It only runs on
 * Vercel, or when SL_SITE=1; the desktop installers skip it and ship just the game.
 */
const website = (): Plugin => ({
  name: 'website',
  apply: 'build',
  closeBundle: {
    order: 'post',
    handler() {
      if (!process.env.VERCEL && process.env.SL_SITE !== '1') return;
      const run = (args: string[]): void => {
        const r = spawnSync(process.execPath, args, { cwd: __dirname, stdio: 'inherit' });
        if (r.status !== 0) throw new Error(`website build failed: ${args.join(' ')}`);
      };
      run([resolve(__dirname, 'web/scripts/assets.cjs')]);
      run([resolve(__dirname, 'node_modules/next/dist/bin/next'), 'build', 'web']);
      cpSync(resolve(__dirname, 'web/out'), resolve(__dirname, 'dist'), { recursive: true, force: true });
    },
  },
});

// The game at /play/, the goods catalogue at /goods/ and the testers' page at /access/ (old /dockside/ links forward to it from public/dockside). The website at / and /steam/ comes from web/.
export default defineConfig({
  plugins: [versionFile(), website()],
  server: { port: 3000, strictPort: true, open: false, host: true },
  build: { rollupOptions: { input: { play: resolve(__dirname, 'play/index.html'), goods: resolve(__dirname, 'goods/index.html'), access: resolve(__dirname, 'access/index.html') } } },
});
