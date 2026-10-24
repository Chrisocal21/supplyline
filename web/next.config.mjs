import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const version = readFileSync(resolve(here, '../src/version.ts'), 'utf8');
const pick = (name) => new RegExp(`${name} = '([^']*)'`).exec(version)?.[1] ?? '';

/** The website: a static export, merged into dist beside the game by the Vite build (see vite.config.ts). */
export default {
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
  env: { NEXT_PUBLIC_BUILD: pick('VERSION'), NEXT_PUBLIC_BUILD_NOTE: pick('VERSION_NOTE') },
};
