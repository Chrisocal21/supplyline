// The site shares the game's pictures (public/site, public/title). Copy them in so the site runs on its own in dev.
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..', '..');
for (const d of ['site', 'title']) fs.cpSync(path.join(root, 'public', d), path.join(root, 'web', 'public', d), { recursive: true });
