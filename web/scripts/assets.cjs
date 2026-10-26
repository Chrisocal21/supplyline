// The site shares the game's pictures (public/site, public/title). Copy them in so the site runs on its own in dev.
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..', '..');
for (const d of ['site', 'title']) fs.cpSync(path.join(root, 'public', d), path.join(root, 'web', 'public', d), { recursive: true });
// The wiki pictures (docs/model-previews) are not shipped: the wiki is parked in docs/wiki-parked until it comes back.
fs.copyFileSync(path.join(root, 'public', 'favicon.svg'), path.join(root, 'web', 'public', 'favicon.svg'));
