import { readFileSync } from 'fs';
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

/** Fills the build number on the website from src/version.ts, so it never goes out of date. */
const siteVersion = (): Plugin => ({
  name: 'site-version',
  transformIndexHtml: (html) => html.replace('<strong id="build">0.16</strong>', `<strong id="build">${builtVersion()}</strong>`),
});

// Three pages: the game's website at /, the goods catalogue at /goods/ and the game itself at /play/.
export default defineConfig({
  plugins: [versionFile(), siteVersion()],
  server: { port: 3000, strictPort: true, open: false, host: true },
  build: { rollupOptions: { input: { site: resolve(__dirname, 'index.html'), play: resolve(__dirname, 'play/index.html'), goods: resolve(__dirname, 'goods/index.html'), dockside: resolve(__dirname, 'dockside/index.html'), steam: resolve(__dirname, 'steam/index.html') } } },
});
