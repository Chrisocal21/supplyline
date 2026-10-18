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

// Two pages: the game's website at / and the game itself at /play/.
export default defineConfig({
  plugins: [versionFile()],
  server: { port: 3000, strictPort: true, open: false, host: true },
  build: { rollupOptions: { input: { site: resolve(__dirname, 'index.html'), play: resolve(__dirname, 'play/index.html') } } },
});
