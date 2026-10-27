// Fresh gameplay stills for the public site. Run with tools/shots.cjs against /play/#demo&shot.
const site = (kind) => __game.world.sites.find((s) => s.kind === kind);
const look = (kind, dist, heading, pitch) => {
  const s = site(kind);
  if (!s) return `missing ${kind}`;
  __game.lookAt(s.x, s.y, dist, heading, pitch);
  return kind;
};
window.__steps = [
  () => look('forestry', 48, 0.9, 0.48),
  () => look('sawmill', 38, -0.75, 0.42),
  () => look('railyard', 85, 1.45, 0.65),
  () => look('airport', 95, -1.1, 0.57),
  () => look('port', 110, 0.35, 0.67),
];
