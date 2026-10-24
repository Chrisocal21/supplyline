// The site shares the game's pictures (public/site, public/title). Copy them in so the site runs on its own in dev.
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..', '..');
for (const d of ['site', 'title']) fs.cpSync(path.join(root, 'public', d), path.join(root, 'web', 'public', d), { recursive: true });
// The model pictures the wiki shows (made by tools/model-gallery.cjs).
const gallery = path.join(root, 'docs', 'model-previews');
if (fs.existsSync(gallery)) fs.cpSync(gallery, path.join(root, 'web', 'public', 'wiki', 'models'), { recursive: true });
