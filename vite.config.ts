import { resolve } from 'path';
import { defineConfig } from 'vite';

// Two pages: the game's website at / and the game itself at /play/.
export default defineConfig({
  server: { port: 3000, strictPort: true, open: false, host: true },
  build: { rollupOptions: { input: { site: resolve(__dirname, 'index.html'), play: resolve(__dirname, 'play/index.html') } } },
});
