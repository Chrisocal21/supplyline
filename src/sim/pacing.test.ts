// Pacing report. Plays a scripted player through the real sim and prints how long each milestone takes in game minutes.
// Skipped in normal runs. Use:  PACING=1 PACING_SEED=11 PACING_HOURS=4 npx vitest run src/sim/pacing.test.ts
import { it } from 'vitest';

declare const process: { env: Record<string, string | undefined>; stdout: { write(s: string): void } };
import map1 from '../maps/map1.json';
import map2 from '../maps/map2.json';
import map3 from '../maps/map3.json';
import { playBot } from './bot';
import { createWorldFromMap, type MapData } from './world';
import { SITE_DEFS, SITE_UPKEEP, TIERS, VEHICLE_DEFS, VEHICLE_UPKEEP } from './defs';
import { questState } from './quests';
import { upkeepPerMinute } from './town';

const run = process.env.PACING ? it : it.skip;
const min = (tick: number): string => `${(tick / 600).toFixed(1)} min`;

run('pacing report', () => {
  const seed = Number(process.env.PACING_SEED ?? 11);
  const hours = Number(process.env.PACING_HOURS ?? 4);
  const verbose = !!process.env.PACING_NOTES;
  const t0 = Date.now();
  const style = process.env.PACING_STYLE === 'quest' ? 'quest' : 'skilled';
  // PACING_MAP=map1, map2 or map3 plays the hand-made maps, with their own towns and resources; the default is a random world.
  const mapName = process.env.PACING_MAP;
  const start = mapName === 'map1' ? createWorldFromMap(map1 as unknown as MapData) : mapName === 'map2' ? createWorldFromMap(map2 as unknown as MapData) : mapName === 'map3' ? createWorldFromMap(map3 as unknown as MapData) : undefined;
  const r = playBot(seed, Math.round(hours * 36000), verbose ? (n) => process.stdout.write(`${min(n.tick).padStart(10)}  ${n.text}
`) : undefined, style, start);
  const w = r.world;
  const lines: string[] = [];
  lines.push(`seed ${seed}: ${hours} game hours in ${((Date.now() - t0) / 1000).toFixed(1)} s (sim ${(r.stepMs / 1000).toFixed(1)} s, bot ${(r.decideMs / 1000).toFixed(1)} s)`);
  lines.push(`tiers reached: ${r.tierAt.map((t, i) => `T${i} ${min(t)}`).join(', ')}`);
  lines.push(`town levels reached: ${r.levelAt.map((t, i) => (i >= 2 && t ? `L${i} ${min(t)}` : '')).filter(Boolean).join(', ')}`);
  lines.push(`money ${Math.floor(w.money).toLocaleString()}  earned ${Math.floor(w.earned).toLocaleString()}  upkeep ${Math.floor(w.upkeep ?? 0).toLocaleString()}/min now ${Math.floor(upkeepPerMinute(w))}  districts income ${Math.floor(w.districtIncome ?? 0).toLocaleString()}`);
  lines.push(`sites ${w.sites.length}  routes ${w.routes.length}  vehicles ${w.vehicles.length}  town levels ${w.places.slice(0, 6).map((p) => p.level).join(',')}`);
  const vk: Record<string, number> = {};
  for (const v of w.vehicles) vk[v.kind] = (vk[v.kind] ?? 0) + 1;
  lines.push(`vehicles by kind ${JSON.stringify(vk)}  upkeep/min: sites ${Math.round(w.sites.reduce((n, s) => n + SITE_DEFS[s.kind].cost * s.level * SITE_UPKEEP, 0))} vehicles ${Math.round(w.vehicles.reduce((n, v) => n + VEHICLE_DEFS[v.kind].cost * VEHICLE_UPKEEP, 0))}`);
  lines.push(`towns: ${w.places.slice(0, 5).map((p) => `${p.name} L${p.level} growth ${Math.round(p.growth)} kinds ${Object.keys(p.delivered).length} sites ${w.sites.filter((s) => s.placeId === null && Math.hypot(s.x - p.x, s.y - p.y) < 6).length}`).join(' | ')}`);
  lines.push(`fuel spent ${Math.floor(w.fuel ?? 0).toLocaleString()}  wear avg ${(w.vehicles.reduce((n, v) => n + (v.wear ?? 0), 0) / Math.max(1, w.vehicles.length)).toFixed(2)}`);
  const tier = TIERS[w.tier];
  if (tier) lines.push(`open quests in tier ${w.tier}: ${tier.quests.filter((q) => !questState(w, tier, q).done).map((q) => q.label).join('; ')}`);
  process.stdout.write(lines.join('\n') + '\n');
}, 600000);
