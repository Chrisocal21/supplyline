// Usage: node tools/shots.cjs "http://localhost:3000/play/#demo-shot" <outDir> 1100 750 tools/town-steps.js 14
// Takes one picture per town style and level (step 0 is setup, steps 1 to 25 are nordic L1..L5, temperate, mediterranean, tropical, arid); docs/town-previews holds them renamed.
const styles = ['nordic', 'temperate', 'mediterranean', 'tropical', 'arid'];
const dists = [30, 38, 50, 68, 92];
window.__list = [];
window.__steps = [];
window.__steps.push(() => { __game.debugGrowT = 1; __phaser.canvas.style.display = 'none'; return 'setup'; });
for (const st of styles) for (let L = 1; L <= 5; L++) {
  window.__list.push(`town-${st}-L${L}`);
  window.__steps.push(() => {
    const g = __game, w = g.world, p = w.places.find((q) => q.name === 'Nettleridge');
    p.stage = 2; p.style = st; p.level = L;
    const m = g.townMeshes.get(p.id); if (m) m.sig = '';
    g.lookAt(p.x, p.y, dists[L - 1], 0.6, 0.55);
    return `${st} ${L}`;
  });
}
