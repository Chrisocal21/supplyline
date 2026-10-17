// The 3D game: owns the Three.js scene, runs the simulation, and turns pointer input into player actions.
// The Phaser HUD sits on top and calls into this class.
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import {
  GOODS,
  SITE_DEFS,
  DISTRICT_ORDER,
  TICKS_PER_SECOND,
  VEHICLE_DEFS,
  VEHICLE_ORDER,
  BUILD_ORDER,
  type DistrictId,
  type NodeKind,
  type SiteKind,
  type VehicleKind,
} from '../sim/defs';
import { townGeometry, type TownLandmark } from './townmodel';
import { GROW_MS, growMaterial } from './grow';
import { tileLonLat } from '../sim/mapgen';
import { findPath } from '../sim/path';
import {
  buyVehicle,
  buildRoadTo,
  relayoutNodes,
  homesNow,
  upgradeVehicle,
  sellVehicle,
  setVehicleDest,
  setSendTo,
  setMaking,
  onNetwork,
  removeRoute,
  removeRouteError,
  roadEndError,
  routeRefund,
  createAirRoute,
  createRoute,
  createWorld,
  createWorldFromMap,
  type MapData,
  demolishSite,
  nodeAt,
  plotFacing,
  layoutOf,
  plotTiles,
  terrainAt,
  placeAt,
  plotAt,
  isHomePlot,
  radiusOf,
  placeError,
  placeSite,
  planRoute,
  routeAt,
  routeTicks,
  vehicleRoute,
  ensureDistrictSites,
  linkNetwork,
  sendToDistricts,
  setHubPull,
  siteAt,
  siteById,
  step,
  wrapDx,
  wrapX,
  townStreets,
  upgradeSite,
  upgradeError,
  type Place,
  type Region,
  type ResourceNode,
  type Route,
  type RoutePlan,
  type Site,
  type Tile,
  type World,
} from '../sim/world';
import { GlobeCamera, pickGround, maxDist } from './camera';
import { HeightField, LAT_SPAN, R, basisMatrix, lonLatToTile, lonLatToVec, setGlobeSize, vecToLonLat } from './geo';
import { buildGlobe, type Globe } from './globeMesh';
import { siteGeometry, siteGeometryAt, trainUnits, vehicleGeometry } from './models';
import { BUILD_MS, Construction } from './construction';
import { buildDistrict } from '../sim/town';
import map1 from '../maps/map1.json';
import { paintGlobe, paintRoughness } from './paint';
import { Smoke } from './smoke';
import { RoadNet, makeHighwayTexture, makeRailTexture, makeRoadTexture } from './roads';
import { Scenery } from './scenery';
import { buildDemo, demoSpots } from './demo';
import type { Good } from '../sim/defs';

export const SAVE_KEY = 'supplyline.save.v10';

/** The summary shown for a save slot. */
export interface SlotInfo {
  savedAt: number;
  town: string;
  tier: number;
  money: number;
  earned: number;
  minutes: number;
  /** Towns grown past a Hamlet. */
  towns: number;
}
const TICK_MS = 1000 / TICKS_PER_SECOND;

/** Where the load shows on each vehicle: height and distance along its length. */
const CARGO_AT: Record<VehicleKind, [number, number]> = {
  boxtruck: [0.58, -0.14],
  bigtruck: [0.62, -0.2],
  rig: [0.62, -0.3],
  convoy: [0.62, -0.1],
  train: [0.58, -0.14],
  heavytrain: [0.58, 0.2],
  plane: [0.58, -0.14],
  jet: [0.58, -0.14],
};

export type Tool = 'select' | 'route' | 'highway' | 'rail' | 'air' | 'demolish' | SiteKind;
export type Selection = { kind: 'site'; id: number } | { kind: 'place'; id: number } | null;

export interface HoverInfo {
  tile: Tile;
  site?: Site;
  place?: Place;
  node?: ResourceNode;
  region?: Region;
  route?: Route;
  /** Why the active build tool cannot be used here. */
  error?: string | null;
}

export interface OverlayItem {
  kind: 'region' | 'town' | 'ring';
  id: number;
  text: string;
  x: number;
  y: number;
  /** Region: tile count. Town: level. Ring: fill ratio 0..1. */
  value: number;
  tag: string;
}

export const siteMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.82, metalness: 0.05 });
siteMaterial.onBeforeCompile = (sh) => {
  sh.vertexShader = sh.vertexShader
    .replace('#include <common>', '#include <common>\nattribute float mid;\nvarying float vMid;\nvarying vec3 vOP;\nvarying vec3 vON;')
    .replace('#include <begin_vertex>', '#include <begin_vertex>\nvMid = mid; vOP = position; vON = normal;');
  sh.fragmentShader = sh.fragmentShader
    .replace(
      '#include <common>',
      `#include <common>
varying float vMid;
varying vec3 vOP;
varying vec3 vON;
float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vn(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1.0, 0.0)), f.x), mix(h21(i + vec2(0.0, 1.0)), h21(i + vec2(1.0, 1.0)), f.x), f.y);
}`,
    )
    .replace(
      '#include <color_fragment>',
      `#include <color_fragment>
{
  vec3 n = normalize(vON);
  bool top = abs(n.y) > 0.6;
  float along = abs(n.x) > abs(n.z) ? vOP.z : vOP.x;
  vec2 uvw = top ? vOP.xz : vec2(along, vOP.y);
  float m = floor(vMid + 0.5);
  float shade = 0.9 + 0.2 * (vn(uvw * 26.0) * 0.6 + vn(uvw * 83.0) * 0.4);
  if (m == 1.0) {
    vec2 b = uvw * vec2(4.4, 9.5);
    float row = floor(b.y);
    b.x += mod(row, 2.0) * 0.5;
    vec2 f = fract(b);
    float mortar = clamp(step(f.x, 0.07) + step(f.y, 0.13), 0.0, 1.0);
    shade *= mix(0.86 + 0.28 * h21(floor(b)), 0.6, mortar);
  } else if (m == 2.0) {
    float rows = uvw.y * 8.0;
    float f = fract(rows);
    shade *= (0.78 + 0.22 * smoothstep(0.0, 0.25, f)) * (0.94 + 0.06 * h21(vec2(floor(rows), 3.0)));
  } else if (m == 3.0) {
    shade *= 0.9 + 0.2 * vn(uvw * 38.0);
  } else if (m == 4.0) {
    float rows = top ? vOP.z * 9.0 : vOP.y * 15.0;
    float col = (top ? vOP.x : along) * 8.0 + mod(floor(rows), 2.0) * 0.5;
    shade *= (0.74 + 0.26 * smoothstep(0.0, 0.4, fract(rows))) * (0.9 + 0.1 * step(0.08, fract(col))) * (0.92 + 0.12 * h21(vec2(floor(col), floor(rows))));
  } else if (m == 5.0) {
    float rib = top ? vOP.x : along;
    shade *= 0.8 + 0.2 * (0.5 + 0.5 * sin(rib * 64.0));
  } else if (m == 6.0) {
    vec2 p = uvw / vec2(0.9, 0.7);
    vec2 f = fract(p);
    shade *= (1.0 - 0.2 * clamp(step(f.x, 0.025) + step(f.y, 0.035), 0.0, 1.0)) * (0.88 + 0.2 * vn(uvw * 11.0));
  } else if (m == 7.0 && !top) {
    vec2 p = uvw * vec2(5.2, 3.0);
    vec2 f = fract(p);
    vec2 cell = floor(p);
    float win = step(0.14, f.x) * step(f.x, 0.86) * step(0.2, f.y) * step(f.y, 0.8);
    float lit = step(0.78, h21(cell));
    vec3 glass = mix(vec3(0.15, 0.23, 0.31), vec3(0.96, 0.84, 0.52), lit) * (0.85 + 0.35 * h21(cell + 7.0));
    diffuseColor.rgb = mix(diffuseColor.rgb * 0.82, glass, win);
    shade = 1.0;
  }
  // Dirt and damp collect where a wall meets the ground, and the sun bleaches the top of it.
  if (!top) shade *= mix(0.74, 1.0, smoothstep(0.0, 0.32, vOP.y)) * (0.96 + 0.08 * vn(vec2(along * 5.0, vOP.y * 2.0)));
  else shade *= 0.97 + 0.05 * vn(uvw * 7.0);
  diffuseColor.rgb *= shade;
}`,
    );
};

export class Game3D {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(45, 1, 1, 4000);
  world!: World;
  hf!: HeightField;
  cam!: GlobeCamera;

  tool: Tool = 'select';
  /** True while the player is on touch input: taps preview a build first and moves need a bigger slop. */
  touch = false;
  /** The tile a touch player has tapped to build or demolish on, waiting for the confirm button. */
  pending: Tile | null = null;
  /** The airport picked first while drawing an air route. */
  airFrom: number | null = null;
  private airGroup: THREE.Group | null = null;
  selection: Selection = null;
  hover: HoverInfo | null = null;
  draft: Tile[] | null = null;
  draftPlan: RoutePlan | null = null;
  private draftTarget: Tile | null = null;
  /** The part of the road already fixed by earlier drags and clicks. Waypoints are added until it ends on a site. */
  private committed: Tile[] | null = null;
  private draftHistory: number[] = [];
  /** 0 paused, then 1, 2 or 4 times speed. */
  speed = 1;
  onToast: (text: string) => void = () => {};
  /** How long the last world took to build, for performance checks. */
  loadStats = { paintMs: 0, totalMs: 0 };

  private globe: Globe | null = null;
  private readonly smoke = new Smoke();
  /** Building work on screen. Created on first use, since the shared material is defined further down this module. */
  private construction: Construction | null = null;
  /** Each building's level when last drawn, so an upgrade can be spotted; and whether the first world sync is done. */
  private readonly siteLevels = new Map<number, number>();
  private readonly siteDepots = new Set<number>();
  private sitesShown = false;
  /** The time of the current frame, for animations started from inside a sync. */
  private nowMs = 0;
  private roads!: RoadNet;
  private rails!: RoadNet;
  private scenery!: Scenery;
  private readonly roadTexture = makeRoadTexture();
  private readonly railTexture = makeRailTexture();
  private readonly highwayTexture = makeHighwayTexture();
  private readonly hemi = new THREE.HemisphereLight(0xcfe0f7, 0x66714c, 1.2);
  private readonly sun = new THREE.DirectionalLight(0xffe8c2, 2.6);
  private readonly siteMeshes = new Map<number, THREE.Mesh>();
  private readonly townMeshes = new Map<number, { mesh: THREE.Mesh; sig: string; level: number; districts: Record<string, number>; path: string }>();
  /** Stand-ins for the building work on a district's landmark, so the scaffolding and lorries have something to stand at. */
  private readonly dummies = new Map<number, THREE.Mesh>();
  private readonly districtWork = new Map<number, { start: number; old: THREE.Mesh; mesh: THREE.Mesh; jobs: { id: number }[]; mats: THREE.MeshStandardMaterial[][] }>();
  /** Towns playing their growth: the old model sinking as the new one rises. */
  private readonly growing = new Map<number, { start: number; old: THREE.Mesh; mesh: THREE.Mesh; reach: number }>();
  private townsShown = false;
  /** For screenshots: hold every growing town at this point of its growth (0 to 1). */
  debugGrowT: number | null = null;
  private readonly vehicleMeshes = new Map<number, THREE.Mesh>();
  private readonly cargoMeshes = new Map<number, THREE.Mesh>();
  private readonly siteGeoCache = new Map<string, THREE.BufferGeometry>();
  private readonly cargoMats = new Map<Good, THREE.MeshStandardMaterial>();
  private ghost: THREE.Mesh | null = null;
  private ghostKind: SiteKind | null = null;
  private readonly ring: THREE.Mesh;
  private readonly selRing: THREE.Mesh;
  private draftMesh: THREE.Mesh | null = null;
  private signature = '';
  private readonly skyTexture = (() => {
    const c = document.createElement('canvas');
    c.width = 2;
    c.height = 256;
    const ctx = c.getContext('2d')!;
    const g = ctx.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, '#3a6aaa');
    g.addColorStop(0.35, '#6f9fd2');
    g.addColorStop(0.6, '#a9c6e2');
    g.addColorStop(0.78, '#e6e3d6');
    g.addColorStop(1, '#d6e0e8');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 2, 256);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  })();

  private acc = 0;
  private last = 0;
  private running = false;
  private frames = 0;
  private lastSave = 0;
  private logSeen = 0;
  private w = 1;
  private h = 1;
  private keys = { right: 0, forward: 0, turn: 0 };
  private drag: { mode: 'pan' | 'rotate' | 'draft' | null; x: number; y: number; startX: number; startY: number; moved: boolean; button: number } = {
    mode: null,
    x: 0,
    y: 0,
    startX: 0,
    startY: 0,
    moved: false,
    button: 0,
  };
  private hoverBlocked = false;
  private readonly shot = location.hash.includes('shot');
  /** URL flags (#demo, #fresh, #seed=N) start a throwaway world that is neither loaded nor saved. */
  readonly demo = /demo|fresh|seed=/.test(location.hash);

  constructor(host: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: this.shot });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    const el = this.renderer.domElement;
    el.style.position = 'absolute';
    el.style.left = '0';
    el.style.top = '0';
    host.appendChild(el);

    this.scene.background = new THREE.Color(0x03060b);
    this.scene.add(this.hemi, this.sun, this.sun.target);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.12;
    this.sun.shadow.camera.near = 1;
    this.sun.shadow.camera.far = 700;

    const ringGeo = new THREE.RingGeometry(1.3, 1.5, 40);
    ringGeo.rotateX(-Math.PI / 2);
    this.ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, depthTest: false }));
    this.ring.renderOrder = 10;
    this.ring.matrixAutoUpdate = false;
    this.ring.visible = false;
    const selGeo = new THREE.RingGeometry(1.55, 1.75, 40);
    selGeo.rotateX(-Math.PI / 2);
    this.selRing = new THREE.Mesh(selGeo, new THREE.MeshBasicMaterial({ color: 0xf0a030, transparent: true, opacity: 0.95, depthTest: false }));
    this.selRing.renderOrder = 11;
    this.selRing.matrixAutoUpdate = false;
    this.selRing.visible = false;
    this.scene.add(this.ring, this.selRing);

    window.addEventListener('resize', () => this.resize());
    this.resize();
  }

  // ---- world lifecycle ----

  /** Build everything for a world. `view` places the camera; by default it looks at the largest town. */
  loadWorld(world: World): void {
    const t0 = performance.now();
    this.disposeWorld();
    this.world = world;
    // Districts from before they were buildings get their lots, and everything joined by road gets its routes.
    ensureDistrictSites(world);
    linkNetwork(world, 'road');
    linkNetwork(world, 'rail');
    sendToDistricts(world);
    setGlobeSize(world);
    this.hf = new HeightField(world);
    this.logSeen = world.logSeq;

    // Texel density drops on a bigger planet so the globe texture stays within what phones can load (4096 wide).
    const color = paintGlobe(world, Math.min(16, Math.floor(4096 / world.width)));
    const rough = paintRoughness(world, 4);
    const t1 = performance.now();
    this.globe = buildGlobe(world, this.hf, color, rough, this.renderer.capabilities.getMaxAnisotropy());
    this.scene.add(this.globe.terrain, this.globe.atmosphere, this.globe.stars);

    this.roads = new RoadNet(world, this.hf, this.roadTexture, 'road', this.highwayTexture);
    this.scene.add(this.roads.group);
    if (!this.smoke.group.parent) this.scene.add(this.smoke.group);
    this.construction ??= new Construction(siteMaterial);
    if (!this.construction.group.parent) this.scene.add(this.construction.group);
    this.construction.clear();
    this.siteLevels.clear();
    this.siteDepots.clear();
    this.sitesShown = false;
    this.rails = new RoadNet(world, this.hf, this.railTexture, 'rail');
    this.scene.add(this.rails.group);
    this.scenery = new Scenery(world, this.hf);
    this.scene.add(this.scenery.group);

    this.cam = new GlobeCamera(this.camera, this.hf);
    const start = world.places[0];
    if (start) {
      const { lon, lat } = tileLonLat(world.width, world.height, start.x, start.y);
      this.cam.set(lon, lat, 300);
    }
    this.signature = '';
    this.selection = null;
    this.draft = null;
    this.committed = null;
    this.syncWorld();
    this.loadStats = { paintMs: Math.round(t1 - t0), totalMs: Math.round(performance.now() - t0) };
  }

  private disposeWorld(): void {
    if (this.globe) {
      this.scene.remove(this.globe.terrain, this.globe.atmosphere, this.globe.stars);
      this.globe.dispose();
      this.globe = null;
    }
    if (this.roads) {
      this.roads.clear();
      this.scene.remove(this.roads.group);
    }
    if (this.rails) {
      this.rails.clear();
      this.scene.remove(this.rails.group);
    }
    if (this.scenery) {
      this.scene.remove(this.scenery.group);
      this.scenery.group.traverse((o) => {
        if (o instanceof THREE.InstancedMesh) o.dispose();
      });
    }
    for (const m of this.siteMeshes.values()) this.scene.remove(m);
    for (const t of this.townMeshes.values()) this.scene.remove(t.mesh);
    for (const id of [...this.growing.keys()]) this.endGrowth(id);
    for (const id of [...this.districtWork.keys()]) this.endDistrictWork(id);
    this.townsShown = false;
    for (const m of this.vehicleMeshes.values()) this.dropVehicle(m);
    for (const l of this.leaving) for (const { mesh } of l.meshes) this.scene.remove(mesh);
    this.leaving.length = 0;
    this.siteMeshes.clear();
    this.townMeshes.clear();
    this.vehicleMeshes.clear();
    this.cargoMeshes.clear();
  }

  /** A new game on Map 1, or (given a seed, for tests and screenshots) on a generated world. */
  newWorld(seed?: number): void {
    this.loadWorld(seed === undefined ? createWorldFromMap(map1 as MapData) : createWorld(seed));
  }

  save(): boolean {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.world));
      this.lastSave = performance.now();
      return true;
    } catch {
      return false;
    }
  }

  // ---- save slots: five named saves beside the autosave ----

  static readonly SLOTS = 5;

  private slotKey(i: number): string {
    return `supplyline.slot${i}.v9`;
  }

  /** What a slot holds, read from its small summary so the list does not parse whole worlds. */
  slotInfo(i: number): SlotInfo | null {
    try {
      const raw = localStorage.getItem(`${this.slotKey(i)}.meta`);
      return raw ? (JSON.parse(raw) as SlotInfo) : null;
    } catch {
      return null;
    }
  }

  saveSlot(i: number): boolean {
    const w = this.world;
    const info: SlotInfo = { savedAt: Date.now(), town: w.places[0]?.name ?? 'World', tier: w.tier, money: Math.floor(w.money), earned: Math.floor(w.earned), minutes: Math.floor(w.tick / (TICKS_PER_SECOND * 60)), towns: w.places.filter((p) => p.level >= 2).length };
    try {
      localStorage.setItem(this.slotKey(i), JSON.stringify(w));
      localStorage.setItem(`${this.slotKey(i)}.meta`, JSON.stringify(info));
      return true;
    } catch {
      return false;
    }
  }

  loadSlot(i: number): boolean {
    return this.load(this.slotKey(i));
  }

  deleteSlot(i: number): void {
    try {
      localStorage.removeItem(this.slotKey(i));
      localStorage.removeItem(`${this.slotKey(i)}.meta`);
    } catch {
      // Nothing to remove.
    }
  }

  /** Load the autosaved game, or a slot by its key. */
  load(key = SAVE_KEY): boolean {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return false;
      const w = JSON.parse(raw) as World;
      if (w.version !== 4) return false;
      // Saves from before the quests.
      w.questsDone ??= [];
      // Spots from an older layout move to level, spaced-out ground (ones with a building stay put).
      relayoutNodes(w);
      this.loadWorld(w);
      return true;
    } catch {
      return false;
    }
  }

  // ---- main loop ----

  start(): void {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    this.lastSave = this.last;
    requestAnimationFrame((t) => this.frame(t));
  }

  private frame(now: number): void {
    if (!this.running) return;
    const dt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    this.frames += 1;
    this.nowMs = now;

    this.acc += dt * 1000 * this.speed;
    let ticks = 0;
    while (this.acc >= TICK_MS && ticks < 40) {
      step(this.world);
      this.acc -= TICK_MS;
      ticks += 1;
    }
    if (this.speed === 0) this.acc = 0;

    if (this.showcase) this.updateShowcase(dt);
    else if (now < this.orbitUntil) this.updateShots(dt);
    else if (this.restoreView) {
      // The show is over: cut back to where the player was looking.
      const v = this.restoreView;
      this.restoreView = null;
      this.cam.set(v.lon, v.lat, v.dist, v.heading, v.pitch);
    }
    this.cam.panKeys(this.keys.right, this.keys.forward, dt);
    if (this.keys.turn) this.cam.rotate(this.keys.turn * dt * 1.4, 0);
    this.cam.update(dt);
    this.cam.apply();
    this.syncWorld();
    this.updateGrowth();
    const dust = this.updateConstruction();
    this.updateVehicles();
    this.updateLeaving();
    this.updateSmoke(dt, dust);
    this.updateLighting();
    this.scenery.update(now / 1000);
    this.updateRings();
    this.drainLog();
    this.draw();

    if (!this.demo && !this.showcase && now - this.lastSave > 20000) this.save();

    if (this.shot && this.frames > 24) {
      (window as unknown as { __frozen?: boolean }).__frozen = true;
      this.running = false;
      return;
    }
    requestAnimationFrame((t) => this.frame(t));
  }

  /** Move building work on. Returns where dust is rising. */
  private updateConstruction(): Map<number, { pos: THREE.Vector3; up: THREE.Vector3; every: number }> {
    if (!this.construction) return new Map();
    const along = (path: Tile[], f: number, mode: 'road' | 'rail') => (mode === 'rail' ? this.rails : this.roads).pointOnPath(path, f, 1, mode === 'road' ? undefined : 0);
    // Towns build their own stations and docks quietly; only the player's buildings announce themselves.
    const dust = this.construction.update(this.nowMs, (id) => this.siteMeshes.get(id) ?? this.dummies.get(id), along, (text) => text && this.onToast(text));
    for (const [k, v] of this.popDust) dust.set(k, v);
    this.popDust.clear();
    return dust;
  }

  /** Dust from vehicles that have just been upgraded, gathered while they are drawn. */
  private readonly popDust = new Map<number, { pos: THREE.Vector3; up: THREE.Vector3; every: number }>();
  /** While building work plays, the camera cuts between two clear views of it; any drag or click hands it back. */
  private orbitUntil = 0;
  private shotList: { at: number; x: number; y: number; dist: number; heading: number; pitch: number }[] = [];
  private shotOn = -1;

  /**
   * Watch something happen on a tile: a low view from one side, then a cut to a higher view from another, each picked
   * so no trees, homes or buildings stand between the camera and the work. The camera drifts slowly in on each.
   */
  /** Where the view was before a town's growth was shown, to glide back to when it ends. */
  private restoreView: { lon: number; lat: number; dist: number; heading: number; pitch: number } | null = null;

  private watch(x: number, y: number, dist: number, ms: number, back = false): void {
    if (this.showcase) return;
    const keep = { lon: this.cam.lon, lat: this.cam.lat, dist: this.cam.dist, heading: this.cam.heading, pitch: this.cam.pitchManual };
    this.restoreView = back ? keep : null;
    const tries = (pitch: number) =>
      Array.from({ length: 8 }, (_, k) => {
        const heading = keep.heading + (k * Math.PI) / 4;
        return { heading, pitch, block: this.blocked(x, y, dist, heading, pitch) };
      });
    const pick = (list: { heading: number; pitch: number; block: number }[], away?: number) =>
      list
        .map((c) => ({ ...c, score: c.block * 10 + (away === undefined ? 0 : Math.max(0, Math.PI / 2 - Math.abs(Math.atan2(Math.sin(c.heading - away), Math.cos(c.heading - away))))) }))
        .sort((a, b) => a.score - b.score)[0];
    // The low view drops to a steeper angle when nothing low is clear.
    let a = pick(tries(0.55));
    if (a.block > 0) a = pick([...tries(0.35), ...tries(0.15)].map((c) => ({ ...c, block: c.block + (c.pitch < 0.3 ? 0.01 : 0) })));
    const b = pick([...tries(0.1), ...tries(-0.15)], a.heading);
    this.cam.set(keep.lon, keep.lat, keep.dist, keep.heading, keep.pitch);
    this.shotList = [
      { at: this.nowMs, x, y, dist, heading: a.heading, pitch: a.pitch },
      { at: this.nowMs + ms * 0.48, x, y, dist: dist * 1.15, heading: b.heading, pitch: b.pitch },
    ];
    this.shotOn = -1;
    this.orbitUntil = this.nowMs + ms;
    this.updateShots(0);
  }

  /** Cut to the next view when its time comes, and creep in a little meanwhile. */
  private updateShots(dt: number): void {
    let i = -1;
    this.shotList.forEach((s, k) => {
      if (this.nowMs >= s.at) i = k;
    });
    if (i < 0) return;
    if (i !== this.shotOn) {
      this.shotOn = i;
      const s = this.shotList[i];
      this.lookAt(s.x, s.y, s.dist, s.heading, s.pitch);
      return;
    }
    this.cam.target.dist *= 1 - dt * 0.035;
  }

  /** How much stands in the way of a view of a tile: the most that a tree, home or building rises above the sight line. */
  private blocked(x: number, y: number, dist: number, heading: number, pitch: number): number {
    const w = this.world;
    this.lookAt(x, y, dist, heading, pitch);
    const eye = this.camera.position.clone();
    const { lon, lat } = tileLonLat(w.width, w.height, x, y);
    const target = lonLatToVec(lon, lat, R + this.hf.surface(lon, lat) + 0.8);
    const towns = new Map<number, number>();
    let worst = 0;
    const p = new THREE.Vector3();
    for (let k = 1; k < 40; k++) {
      p.lerpVectors(target, eye, k / 40);
      const ll = vecToLonLat(p);
      const t = lonLatToTile(w, ll.lon, ll.lat);
      if (!t || (t.x === x && t.y === y)) continue;
      const above = p.length() - R - this.hf.surface(ll.lon, ll.lat);
      let tall = 0;
      if (siteAt(w, t.x, t.y)) tall = 1.8;
      const town = placeAt(w, t.x, t.y);
      if (town) {
        if (!towns.has(town.id)) towns.set(town.id, town.level >= 4 ? (radiusOf(town) > 3 ? 8 : 3) : town.level >= 3 ? 2 : 1.1);
        tall = Math.max(tall, towns.get(town.id)!);
      } else if (terrainAt(w, t.x, t.y) === 'forest') tall = Math.max(tall, 1.9);
      else if (terrainAt(w, t.x, t.y) === 'grass') tall = Math.max(tall, 0.9);
      worst = Math.max(worst, tall - above);
    }
    return Math.max(0, worst);
  }

  /** Smoke rises from the chimneys of processing buildings that are running. */

  private updateSmoke(dt: number, dust: Map<number, { pos: THREE.Vector3; up: THREE.Vector3; every: number }> = new Map()): void {
    const sources = new Map<number, { pos: THREE.Vector3; up: THREE.Vector3; every?: number }>(dust);
    if (this.speed > 0 && this.cam.dist < 170) {
      const local = new THREE.Vector3(0.45, 1.2, -0.55);
      for (const s of this.world.sites) {
        const def = SITE_DEFS[s.kind];
        if (!def.recipe) continue;
        const ok = Object.entries(def.recipe.inputs).every(([g, n]) => (s.stock[g as Good] ?? 0) >= (n ?? 0));
        const m = this.siteMeshes.get(s.id);
        if (!ok || !m) continue;
        const pos = local.clone().applyMatrix4(m.matrix);
        sources.set(s.id, { pos, up: pos.clone().normalize() });
      }
    }
    this.smoke.update(dt * Math.max(1, Math.min(this.speed, 2)), sources);
  }

  private drainLog(): void {
    for (const e of this.world.log) {
      if (e.seq > this.logSeen) {
        this.logSeen = e.seq;
        this.onToast(e.text);
      }
    }
  }

  // ---- post-processing: ambient occlusion up close, so buildings sit on the ground and crevices darken ----

  private composer: EffectComposer | null = null;
  private ao: GTAOPass | null = null;

  /** Draw the frame: with ambient occlusion when close to the ground, straight to the screen from space. */
  private draw(): void {
    if (this.cam.dist > 150) {
      this.renderer.render(this.scene, this.camera);
      return;
    }
    if (!this.composer) {
      const target = new THREE.WebGLRenderTarget(this.w, this.h, { type: THREE.HalfFloatType, samples: 4 });
      const c = new EffectComposer(this.renderer, target);
      c.setPixelRatio(this.renderer.getPixelRatio());
      c.setSize(this.w, this.h);
      c.addPass(new RenderPass(this.scene, this.camera));
      const ao = new GTAOPass(this.scene, this.camera, this.w, this.h);
      ao.output = GTAOPass.OUTPUT.Default;
      ao.blendIntensity = 1;
      ao.updateGtaoMaterial({ radius: 1.1, distanceExponent: 1.4, thickness: 1.5, scale: 1.3, samples: 12, distanceFallOff: 1, screenSpaceRadius: false });
      ao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 5, radiusExponent: 1, rings: 2, samples: 12 });
      c.addPass(ao);
      c.addPass(new OutputPass());
      this.composer = c;
      this.ao = ao;
    }
    // Reach and strength follow the view height, so a wide view is not smeared dark.
    this.ao!.updateGtaoMaterial({ radius: THREE.MathUtils.clamp(this.cam.dist * 0.05, 0.7, 3) });
    this.composer.render();
  }

  resize(): void {
    this.w = window.innerWidth;
    this.h = window.innerHeight;
    this.renderer.setSize(this.w, this.h);
    this.composer?.setSize(this.w, this.h);
    this.camera.aspect = this.w / this.h;
    this.camera.updateProjectionMatrix();
  }

  get viewW(): number {
    return this.w;
  }
  get viewH(): number {
    return this.h;
  }

  // ---- scene sync ----

  private siteGeometryFor(kind: SiteKind, level = 1, withDepot = false): THREE.BufferGeometry {
    const key = `${kind}@${level}${withDepot ? 'd' : ''}`;
    let g = this.siteGeoCache.get(key);
    if (!g) {
      g = siteGeometryAt(kind, level, withDepot);
      this.siteGeoCache.set(key, g);
    }
    return g;
  }

  /** Matrix that stands something on the tile, front facing south (toward a north-up camera). */
  private tileMatrix(tile: Tile, lift = 0): THREE.Matrix4 {
    const { lon, lat } = tileLonLat(this.world.width, this.world.height, tile.x, tile.y);
    const pos = lonLatToVec(lon, lat, R + this.hf.surface(lon, lat) + lift);
    const up = pos.clone().normalize();
    const east = new THREE.Vector3(Math.cos(lon), 0, -Math.sin(lon));
    const south = new THREE.Vector3().crossVectors(east, up).normalize();
    return basisMatrix(pos, up, south);
  }

  private syncWorld(): void {
    const w = this.world;
    // Roads change with the routes, and when a town grows its streets reach further.
    const roadSig = `${w.routes.length}:${w.places.map((p) => p.level).join('')}`;
    const sig = [
      w.sites.map((s) => `${s.id}.${s.level}${s.depot ? 'd' : ''}`).join(','),
      roadSig,
      w.places.map((p) => `${p.level}${Object.values(p.districts ?? {}).join('')}${p.path ?? ''}`).join(''),
      w.vehicles.length,
      w.vehicles.reduce((n, v) => n + VEHICLE_ORDER.indexOf(v.kind), 0),
    ].join('|');
    if (sig !== this.signature) {
      const routesChanged = !this.signature || this.signature.split('|')[1] !== roadSig;
      this.signature = sig;
      if (routesChanged) {
        // Roads regrade the ground first, so everything else is placed on the ground as it will be.
        const regraded = this.hf.setRoads();
        this.globe?.regrade(regraded);
        this.scenery.reseat(regraded);
      }
      this.syncSites();
      this.syncTowns();
      this.syncVehicles();
      if (routesChanged) {
        this.roads.rebuild();
        this.rails.rebuild(this.roads.tiles, this.roads.wideTiles);
        this.rebuildAir();
        this.scenery.clearTiles(this.roads.tiles);
        this.scenery.clearTiles(this.rails.tiles);
      }
      this.scenery.clearTiles(w.sites.map((s) => s.y * w.width + s.x));
    }
    const townTool = this.isBuildTool() && !SITE_DEFS[this.tool as SiteKind].node;
    this.scenery.showPlots(townTool, (placeId, index) => {
      const pl = w.places.find((p) => p.id === placeId)!;
      const t = plotTiles(w, pl)[index];
      const ter = terrainAt(w, t.x, t.y);
      return !siteAt(w, t.x, t.y) && !isHomePlot(pl, index) && (ter === 'grass' || ter === 'forest');
    });
    const usedNodes = new Set(w.sites.map((s) => s.nodeId).filter((n): n is number => n !== null));
    this.scenery.showMarkers(this.activeNodeKind(), usedNodes);
    this.scenery.setNodesUsed(usedNodes);
  }

  private activeNodeKind(): NodeKind | null {
    if (this.isRouteTool() || this.tool === 'select' || this.tool === 'air' || this.tool === 'demolish') return null;
    return SITE_DEFS[this.tool as SiteKind].node ?? null;
  }

  /** The yaw that turns a station to face the town street beside it, or null when none is. */
  private stationStreetSide(s: { x: number; y: number; placeId: number | null }): number | null {
    const w = this.world;
    const town = w.places.find((p) => p.id === s.placeId);
    if (!town) return null;
    const streets = townStreets(w, town);
    const side = ([[0, 1, 0], [0, -1, Math.PI], [1, 0, Math.PI / 2], [-1, 0, -Math.PI / 2]] as const).find(([dx, dy]) => streets.has((s.y + dy) * w.width + wrapX(w, s.x + dx)));
    return side ? side[2] : null;
  }

  private syncSites(): void {
    const live = new Set(this.world.sites.map((s) => s.id));
    for (const [id, m] of this.siteMeshes) {
      if (!live.has(id)) {
        if (this.sitesShown) this.leave(id, 1700, [m]);
        else this.scene.remove(m);
        this.siteMeshes.delete(id);
      }
    }
    for (const s of this.world.sites) {
      // A district is drawn with its town (a landmark on its lot), not as a building of its own.
      if (SITE_DEFS[s.kind].dock === 'civic') continue;
      let m = this.siteMeshes.get(s.id);
      const before = this.siteLevels.get(s.id);
      this.siteLevels.set(s.id, s.level);
      // Built since the world was first shown, or upgraded: it goes up behind scaffolding.
      const isNew = !m && this.sitesShown;
      const hadDepot = this.siteDepots.has(s.id);
      if (s.depot) this.siteDepots.add(s.id);
      const upgraded = before !== undefined && (s.level > before || (!!s.depot && !hadDepot));
      if ((isNew || upgraded) && this.construction) {
        const oldGeo = upgraded ? this.siteGeometryFor(s.kind, before, hadDepot) : null;
        const text = upgraded && s.depot && !hadDepot ? `${s.name} now has a Rail Depot` : upgraded ? `${s.name} is now level ${s.level}` : SITE_DEFS[s.kind].dock || SITE_DEFS[s.kind].station ? '' : `${s.name} is open`;
        this.construction.start(s.id, this.nowMs, text, oldGeo, this.siteGeometryFor(s.kind, s.level, !!s.depot));
      }
      if (!m) {
        m = new THREE.Mesh(this.siteGeometryFor(s.kind, s.level, !!s.depot), siteMaterial);
        m.castShadow = true;
        m.receiveShadow = true;
        m.matrixAutoUpdate = false;
        this.scene.add(m);
        this.siteMeshes.set(s.id, m);
      }
      // An upgraded building gets its bigger model.
      const geo = this.siteGeometryFor(s.kind, s.level, !!s.depot);
      if (m.geometry !== geo) m.geometry = geo;
      // Buildings in a town face the street they front.
      let yaw = 0;
      const plot = plotAt(this.world, s.x, s.y);
      if (plot) {
        const face = plotFacing(this.world, plot.place, plot.index);
        yaw = face === 'N' ? Math.PI : face === 'W' ? -Math.PI / 2 : face === 'E' ? Math.PI / 2 : 0;
      } else if (SITE_DEFS[s.kind].station && this.stationStreetSide(s) !== null) {
        // A rail station fronts the town street beside it, not the track that comes in behind.
        yaw = this.stationStreetSide(s)!;
      } else {
        // Outside a town, turn the front to face the road that serves the site (roads win over rail).
        const rt = this.world.routes.filter((r) => r.fromSiteId === s.id || r.toSiteId === s.id).filter((r) => r.mode !== 'air').sort((p, q) => (p.mode === 'road' ? 0 : 1) - (q.mode === 'road' ? 0 : 1))[0];
        if (rt) {
          const nb = rt.fromSiteId === s.id ? rt.path[1] : rt.path[rt.path.length - 2];
          if (nb) {
            const dx = wrapDx(this.world, s.x, nb.x);
            const dy = nb.y - s.y;
            yaw = Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? Math.PI / 2 : -Math.PI / 2) : dy < 0 ? Math.PI : 0;
          }
        } else {
          // No road of its own yet: face one that passes the door, if there is one.
          const W = this.world.width;
          const side = ([[0, 1, 0], [0, -1, Math.PI], [1, 0, Math.PI / 2], [-1, 0, -Math.PI / 2]] as const).find(([dx, dy]) => this.roads.tiles.has((s.y + dy) * W + ((s.x + dx + W) % W)));
          if (side) yaw = side[2];
        }
      }
      m.matrix.copy(this.tileMatrix(s)).multiply(new THREE.Matrix4().makeRotationY(yaw));
      m.userData.base = m.matrix.clone();
      m.matrixWorldNeedsUpdate = true;
    }
    for (const id of [...this.siteLevels.keys()]) if (!live.has(id)) this.siteLevels.delete(id);
    this.sitesShown = true;
  }

  private syncTowns(): void {
    const w = this.world;
    for (const p of w.places) {
      const have = this.townMeshes.get(p.id);
      const layout = layoutOf(w, p);
      const landOk = (x: number, y: number): boolean => {
        const ter = terrainAt(w, x, y);
        return ter === 'grass' || ter === 'forest';
      };
      const built = townStreets(w, p);
      const streets = layout.streets
        .filter((s) => built.has((p.y + s.y) * w.width + wrapX(w, p.x + s.x)))
        .map((s) => ({ x: s.x, y: s.y, main: s.main }));
      const homePlots = homesNow(p);
      const plots = layout.plots.map((t, i) => ({
        x: t.x,
        y: t.y,
        ex: t.entry.x,
        ey: t.entry.y,
        ok: landOk(p.x + t.x, p.y + t.y),
        occupied: !!siteAt(w, p.x + t.x, p.y + t.y),
        home: homePlots.includes(i),
      }));
      // A district lot no district has taken yet is homes like the rest.
      const taken = new Set(Object.values(p.districtLots ?? {}));
      const homes = [...layout.homes, ...layout.civic.filter((_, i) => !taken.has(i))]
        .filter((h) => h.level <= p.level)
        .map((h) => ({ x: h.x, y: h.y, ok: landOk(p.x + h.x, p.y + h.y) && !routeAt(w, p.x + h.x, p.y + h.y) && !siteAt(w, p.x + h.x, p.y + h.y) }));
      const districts = Object.entries(p.districts ?? {})
        .filter(([id, lv]) => (lv ?? 0) > 0 && p.districtLots?.[id as DistrictId] !== undefined)
        .map(([id, level]) => {
          const lot = layout.civic[p.districtLots![id as DistrictId]!];
          return { id: id as DistrictId, level: level as number, x: lot.x, y: lot.y, ex: lot.entry.x, ey: lot.entry.y };
        });
      const bits = (list: boolean[]): string => list.map((o) => (o ? 1 : 0)).join('');
      const sig = `${streets.length}.${p.level}.${p.path ?? ''}.${bits(plots.map((t) => t.occupied))}.${bits(plots.map((t) => t.home))}.${bits(homes.map((h) => h.ok))}.${districts.map((d) => `${d.id}${d.level}`).join(',')}`;
      if (have && have.sig === sig) continue;
      // A town that has just grown plays it out: the old model stays up to sink away as the new one rises.
      const grew = !!have && this.townsShown && p.level > have.level;
      const dist: Record<string, number> = Object.fromEntries(districts.map((d) => [d.id, d.level]));
      const fresh = have && this.townsShown && !grew ? districts.filter((d) => d.level > (have.districts[d.id] ?? 0)) : [];
      const respec = !!have && this.townsShown && !grew && fresh.length === 0 && (p.path ?? '') !== have.path;
      const play = grew || respec;
      if (this.growing.has(p.id)) this.endGrowth(p.id);
      if (this.districtWork.has(p.id)) this.endDistrictWork(p.id);
      if (have && !play && fresh.length === 0) {
        this.scene.remove(have.mesh);
        have.mesh.geometry.dispose();
      }
      const { lat } = tileLonLat(w.width, w.height, p.x, p.y);
      const squeeze = THREE.MathUtils.clamp(Math.cos(lat), 0.55, 1);
      const mesh = new THREE.Mesh(
        townGeometry({ level: p.level, seed: p.id + w.seed, squeeze, city: radiusOf(p) > 3, style: p.style, streets, plots, homes, districts }),
        siteMaterial,
      );
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.matrixAutoUpdate = false;
      mesh.matrix.copy(this.tileMatrix(p));
      mesh.matrixWorldNeedsUpdate = true;
      this.scene.add(mesh);
      this.townMeshes.set(p.id, { mesh, sig, level: p.level, districts: dist, path: p.path ?? '' });
      if (play) this.startGrowth(p, have!.mesh, mesh, streets, grew);
      else if (fresh.length > 0) this.startDistrictWork(p, have!.mesh, mesh, fresh.map((d) => d.id));
    }
    this.townsShown = true;
  }

  /** A district goes up or is improved: scaffolding, a crane and lorries at its tile while the old landmark sinks and the new one rises. */
  private startDistrictWork(p: Place, old: THREE.Mesh, mesh: THREE.Mesh, ids: DistrictId[]): void {
    const marks = (mesh.geometry.userData.landmarks ?? []) as TownLandmark[];
    const here = marks.filter((m) => ids.includes(m.id));
    if (here.length === 0) {
      this.scene.remove(old);
      old.geometry.dispose();
      return;
    }
    const jobs = here.map((m, i) => ({ m, id: 1e6 + p.id * 100 + i }));
    // Only the first landmark gets the sink-and-rise; if several change at once (rare) the rest simply appear.
    const first = here[0];
    const mats = [[growMaterial(siteMaterial, true, { cx: first.x, cz: first.z, r: 0.3 }), growMaterial(siteMaterial, false, { cx: first.x, cz: first.z, r: 0.3 })]];
    old.material = mats[0][0];
    mesh.material = mats[0][1];
    old.castShadow = mesh.castShadow = false;
    this.districtWork.set(p.id, { start: this.nowMs, old, mesh, jobs, mats });
    const drop = (x: number, z: number): number => -(x * x + z * z) / (2 * (R + 0.3));
    for (const { m, id } of jobs) {
      const dummy = new THREE.Mesh(new THREE.BufferGeometry());
      dummy.matrix.copy(this.tileMatrix(p));
      dummy.userData.base = dummy.matrix.clone().multiply(new THREE.Matrix4().makeTranslation(m.x, drop(m.x, m.z), m.z));
      this.dummies.set(id, dummy);
      this.construction?.start(id, this.nowMs, '', null, dummy.geometry);
    }
    this.watch(wrapX(this.world, p.x + first.tx), p.y + first.ty, 15, BUILD_MS, true);
  }

  private endDistrictWork(placeId: number): void {
    const g = this.districtWork.get(placeId);
    if (!g) return;
    this.districtWork.delete(placeId);
    for (const { id } of g.jobs) this.dummies.delete(id);
    this.scene.remove(g.old);
    g.old.geometry.dispose();
    for (const [a, b] of g.mats) {
      a.dispose();
      b.dispose();
    }
    g.mesh.material = siteMaterial;
    g.mesh.castShadow = true;
  }

  private startGrowth(p: Place, old: THREE.Mesh, mesh: THREE.Mesh, streets: { x: number; y: number }[], withRoads = true): void {
    const w = this.world;
    const anc = mesh.geometry.getAttribute('anc') as THREE.BufferAttribute;
    let reach = 0;
    for (let i = 0; i < anc.count; i += 3) reach = Math.max(reach, Math.hypot(anc.getX(i), anc.getY(i)));
    old.material = growMaterial(siteMaterial, true);
    mesh.material = growMaterial(siteMaterial, false);
    // Shadows would show the finished town at once, so they wait for the end.
    old.castShadow = mesh.castShadow = false;
    this.growing.set(p.id, { start: this.nowMs, old, mesh, reach: reach + 3 });
    // Rollers lay each new stretch of street, starting from the street it grows out of.
    const key = (t: { x: number; y: number }): string => t.x + ',' + t.y;
    const built = new Set(streets.map(key));
    const fresh = withRoads ? layoutOf(w, p).streets.filter((s) => s.level === p.level && built.has(key(s))) : [];
    const freshKeys = new Set(fresh.map(key));
    const near = (a: { x: number; y: number }, b: { x: number; y: number }): boolean => Math.abs(a.x - b.x) + Math.abs(a.y - b.y) === 1;
    const chains: { x: number; y: number }[][] = [];
    for (const s of fresh) {
      const last = chains[chains.length - 1];
      if (last && near(last[last.length - 1], s)) {
        last.push(s);
        continue;
      }
      const from = streets.find((o) => !freshKeys.has(key(o)) && near(o, s));
      chains.push(from ? [from, s] : [s]);
    }
    for (const c of chains) this.construction?.startRoad(c.map((t) => ({ x: wrapX(w, p.x + t.x), y: p.y + t.y })), 'road', this.nowMs + 600);
    this.watch(p.x, p.y, radiusOf(p) > 3 ? 46 : 34, GROW_MS, true);
  }

  /** Move town growth on, with dust along the wave. */
  private updateGrowth(): void {
    for (const [id, g] of this.districtWork) {
      const t = (this.nowMs - g.start) / BUILD_MS;
      if (t >= 1) {
        this.endDistrictWork(id);
        continue;
      }
      (g.old.material as THREE.Material).userData.wave.value = t;
      (g.mesh.material as THREE.Material).userData.wave.value = t;
    }
    for (const [id, g] of this.growing) {
      const t = this.debugGrowT ?? (this.nowMs - g.start) / GROW_MS;
      if (t >= 1) {
        this.endGrowth(id);
        continue;
      }
      const wave = -1 + (g.reach + 1) * THREE.MathUtils.smootherstep(t, 0, 0.92);
      (g.old.material as THREE.Material).userData.wave.value = wave;
      (g.mesh.material as THREE.Material).userData.wave.value = wave;
      for (let k = 0; k < 3; k++) {
        const a = Math.random() * Math.PI * 2;
        const pos = new THREE.Vector3(Math.cos(a) * wave, 0.3, Math.sin(a) * wave).applyMatrix4(g.mesh.matrix);
        this.popDust.set(-2e6 - id * 10 - k, { pos, up: pos.clone().normalize(), every: 0.06 });
      }
    }
  }

  private endGrowth(id: number): void {
    const g = this.growing.get(id);
    if (!g) return;
    this.growing.delete(id);
    this.scene.remove(g.old);
    g.old.geometry.dispose();
    (g.old.material as THREE.Material).dispose();
    (g.mesh.material as THREE.Material).dispose();
    g.mesh.material = siteMaterial;
    g.mesh.castShadow = true;
  }

  private vehicleGeo = new Map<VehicleKind, THREE.BufferGeometry>();
  private trainGeo = new Map<VehicleKind, ReturnType<typeof trainUnits>>();

  /** Buildings and vehicles on their way out: the model stays a moment, shrinking away in a cloud of dust. */
  private readonly leaving: { id: number; start: number; ms: number; meshes: { mesh: THREE.Mesh; base: THREE.Matrix4 }[]; pos: THREE.Vector3; up: THREE.Vector3 }[] = [];

  private leave(id: number, ms: number, meshes: THREE.Mesh[]): void {
    const pos = new THREE.Vector3().setFromMatrixPosition(meshes[0].matrix);
    this.leaving.push({ id, start: this.nowMs, ms, meshes: meshes.map((mesh) => ({ mesh, base: mesh.matrix.clone() })), pos, up: pos.clone().normalize() });
  }

  private updateLeaving(): void {
    for (let i = this.leaving.length - 1; i >= 0; i--) {
      const l = this.leaving[i];
      const k = (this.nowMs - l.start) / l.ms;
      if (k >= 1) {
        for (const { mesh } of l.meshes) this.scene.remove(mesh);
        this.leaving.splice(i, 1);
        continue;
      }
      const building = l.ms > 1000;
      let sx = 1;
      let sy = 1;
      if (building) {
        // It shudders, then folds down into the ground.
        const e = THREE.MathUtils.smoothstep(k, 0.12, 1);
        sy = Math.max(0.02, 1 - e);
        sx = 1 + 0.04 * Math.sin(k * 60) * (1 - Math.min(1, k * 2.5)) + 0.08 * e;
      } else {
        sx = sy = Math.max(0.02, 1 - k * k);
      }
      const scale = new THREE.Matrix4().makeScale(sx, sy, sx);
      for (const { mesh, base } of l.meshes) {
        mesh.matrix.copy(base).multiply(scale);
        mesh.matrixWorldNeedsUpdate = true;
      }
      if (k < 0.85) this.popDust.set(-4e6 - l.id, { pos: l.pos.clone().addScaledVector(l.up, (building ? 0.7 : 0.3) * sy), up: l.up, every: building ? 0.035 : 0.05 });
    }
  }

  /** Take a vehicle, and any wagons it pulls, out of the scene. */
  private dropVehicle(m: THREE.Mesh): void {
    for (const c of (m.userData.cars ?? []) as THREE.Mesh[]) this.scene.remove(c);
    this.scene.remove(m);
  }

  /**
   * A train is its locomotive (the vehicle's own mesh) and a separate mesh for each wagon, so each unit can turn on its
   * own round a curve. The load shows in the first wagon.
   */
  private makeCars(m: THREE.Mesh, kind: VehicleKind, cargo: THREE.Mesh): void {
    for (const c of (m.userData.cars ?? []) as THREE.Mesh[]) this.scene.remove(c);
    m.userData.cars = [];
    m.userData.units = null;
    if (VEHICLE_DEFS[kind].mode !== 'rail') return;
    let units = this.trainGeo.get(kind);
    if (!units) {
      units = trainUnits(kind);
      this.trainGeo.set(kind, units);
    }
    m.geometry = units[0].geo;
    m.userData.units = units.map((u) => ({ z: u.z, len: u.len }));
    const cars = units.slice(1).map((u) => {
      const c = new THREE.Mesh(u.geo, siteMaterial);
      c.castShadow = true;
      c.matrixAutoUpdate = false;
      this.scene.add(c);
      return c;
    });
    m.userData.cars = cars;
    if (cars[0]) {
      m.remove(cargo);
      cargo.position.set(0, 0.5, 0);
      cars[0].add(cargo);
    }
  }

  private syncVehicles(): void {
    const live = new Set(this.world.vehicles.map((v) => v.id));
    for (const [id, m] of this.vehicleMeshes) {
      if (!live.has(id)) {
        if (m.visible) this.leave(id, 550, [m, ...((m.userData.cars ?? []) as THREE.Mesh[])]);
        else this.dropVehicle(m);
        this.vehicleMeshes.delete(id);
        this.cargoMeshes.delete(id);
      }
    }
    const cargoGeo = new THREE.BoxGeometry(0.16, 0.1, 0.16);
    for (const v of this.world.vehicles) {
      let g = this.vehicleGeo.get(v.kind);
      if (!g) {
        g = vehicleGeometry(v.kind);
        this.vehicleGeo.set(v.kind, g);
      }
      const have = this.vehicleMeshes.get(v.id);
      if (have) {
        // Traded up: the same vehicle, a bigger body.
        if (have.userData.kind !== v.kind) {
          have.userData.pop = this.nowMs;
          have.geometry = g;
          have.userData.kind = v.kind;
          this.cargoMeshes.get(v.id)?.position.set(0, CARGO_AT[v.kind][0], CARGO_AT[v.kind][1]);
          this.makeCars(have, v.kind, this.cargoMeshes.get(v.id)!);
        }
        continue;
      }
      const m = new THREE.Mesh(g, siteMaterial);
      m.userData.kind = v.kind;
      m.castShadow = true;
      m.matrixAutoUpdate = false;
      const cargo = new THREE.Mesh(cargoGeo, this.cargoMat('logs'));
      cargo.position.set(0, CARGO_AT[v.kind][0], CARGO_AT[v.kind][1]);
      cargo.visible = false;
      m.add(cargo);
      this.makeCars(m, v.kind, cargo);
      this.scene.add(m);
      this.vehicleMeshes.set(v.id, m);
      this.cargoMeshes.set(v.id, cargo);
    }
  }

  private cargoMat(good: Good): THREE.MeshStandardMaterial {
    let m = this.cargoMats.get(good);
    if (!m) {
      m = new THREE.MeshStandardMaterial({ color: GOODS[good].color, roughness: 0.7 });
      this.cargoMats.set(good, m);
    }
    return m;
  }

  /** How high a plane flies, a fraction of the way along its route: low at the airports, high over the middle. */
  private airAlt(f: number, last: number): number {
    return 0.5 + 13 * Math.sqrt(Math.max(0, Math.sin((Math.PI * f) / Math.max(1, last))));
  }

  /** Draw each air route as a faint arc over the globe. */
  private rebuildAir(): void {
    if (!this.airGroup) {
      this.airGroup = new THREE.Group();
      this.scene.add(this.airGroup);
    }
    for (const c of [...this.airGroup.children]) {
      this.airGroup.remove(c);
      (c as THREE.Line).geometry.dispose();
    }
    const mat = new THREE.LineBasicMaterial({ color: 0xf2ecc8, transparent: true, opacity: 0.55 });
    for (const r of this.world.routes) {
      if (r.mode !== 'air') continue;
      const last = r.path.length - 1;
      const pts: THREE.Vector3[] = [];
      for (let f = 0; f <= last + 1e-6; f += 0.5) {
        const pt = this.roads.pointOnPath(r.path, Math.min(last, f), 1, 0);
        pts.push(pt.pos.clone().addScaledVector(pt.up, this.airAlt(f, last)));
      }
      // The path steps from tile to tile; smooth it so the arc reads as a flight line.
      for (let pass = 0; pass < 4; pass++) {
        const prev = pts.map((p) => p.clone());
        for (let i = 1; i < pts.length - 1; i++) pts[i].copy(prev[i - 1]).add(prev[i]).add(prev[i + 1]).divideScalar(3);
      }
      this.airGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat));
    }
  }

  private updateVehicles(): void {
    const alpha = Math.min(this.acc / TICK_MS, 1);
    for (const v of this.world.vehicles) {
      const m = this.vehicleMeshes.get(v.id);
      const route = vehicleRoute(this.world, v);
      if (!m) continue;
      // Waiting at home with nowhere to go: out of sight until a route opens.
      if (!route) {
        m.visible = false;
        for (const c of (m.userData.cars ?? []) as THREE.Mesh[]) c.visible = false;
        continue;
      }
      const vd = VEHICLE_DEFS[v.kind];
      const last = route.path.length - 1;
      let f = v.idx;
      if (v.state === 'moving') f += (v.dir * (v.moveTimer + (this.speed > 0 ? alpha : 0))) / routeTicks(route, vd.ticksPerTile);
      // Pull up at the door, not in the middle of the building. A train is long and its engine is at one end, so where it
      // stops depends on which way it faces: turning round at the end of the line leaves the wagons where they stood.
      const stop = Math.min(route.mode === 'rail' ? 0.87 : 0.5, last / 2);
      const tail = route.mode === 'rail' ? Math.min(v.kind === 'heavytrain' ? 1.6 : 1.33, last / 2) : stop;
      const dir: 1 | -1 = v.state === 'moving' ? v.dir : v.idx === 0 ? 1 : -1;
      f = Math.max(dir === 1 ? tail : stop, Math.min(last - (dir === -1 ? tail : stop), f));
      const pt = (route.mode === 'rail' ? this.rails : this.roads).pointOnPath(route.path, f, dir, route.mode === 'road' ? undefined : 0);
      const air = route.mode === 'air';
      if (air) pt.pos.addScaledVector(pt.up, this.airAlt(f, last));
      m.visible = !pt.hidden;
      // Just upgraded: it swells, overshoots and settles, in a puff of dust.
      const pop = m.userData.pop as number | undefined;
      const k = pop === undefined ? 1 : (this.nowMs - pop) / 1200;
      const bounce = k < 1 ? 1 + 0.6 * Math.sin(k * Math.PI * 2.5) * (1 - k) : 1;
      if (k < 0.7) this.popDust.set(-2e6 - v.id, { pos: pt.pos.clone().addScaledVector(pt.up, 0.3), up: pt.up.clone(), every: 0.06 });
      const sc = (air ? 2.1 : 1.35) * bounce;
      const units = m.userData.units as { z: number; len: number }[] | null;
      if (units && route.mode === 'rail') {
        // Each unit sits where its own centre falls along the track and points along the chord between its ends, so
        // a train bends round a corner one unit at a time.
        const cars = m.userData.cars as THREE.Mesh[];
        const tileLen = 3.27;
        const scale = new THREE.Matrix4().makeScale(sc, sc, sc);
        units.forEach((u, i) => {
          const unit = i === 0 ? m : cars[i - 1];
          const fu = f + (dir * u.z * 1.35) / tileLen;
          const half = (u.len * 1.35) / 2 / tileLen;
          const a = this.rails.pointOnPath(route.path, fu + dir * half, dir, 0);
          const b = this.rails.pointOnPath(route.path, fu - dir * half, dir, 0);
          const pos = a.pos.clone().add(b.pos).multiplyScalar(0.5);
          const up = a.up.clone().add(b.up).normalize();
          const fwd = a.pos.clone().sub(b.pos);
          if (fwd.lengthSq() < 1e-6) fwd.copy(a.forward);
          fwd.normalize();
          unit.matrix.copy(basisMatrix(pos, up, fwd)).multiply(scale);
          unit.matrixWorldNeedsUpdate = true;
          unit.visible = !(a.hidden && b.hidden);
        });
      } else {
        m.matrix.copy(basisMatrix(pt.pos, pt.up, pt.forward)).multiply(new THREE.Matrix4().makeScale(sc, sc, sc));
        m.matrixWorldNeedsUpdate = true;
      }
      const cargo = this.cargoMeshes.get(v.id);
      if (cargo) {
        cargo.visible = v.cargo > 0 && vd.mode !== 'air';
        if (v.good) cargo.material = this.cargoMat(v.good);
      }
    }
  }

  // ---- lighting, fog and sky ----

  private updateLighting(): void {
    const dist = this.cam.dist;
    const F = this.cam.focusPoint();
    const n = F.clone().normalize();
    const east = new THREE.Vector3(Math.cos(this.cam.lon), 0, -Math.sin(this.cam.lon));
    const north = new THREE.Vector3().crossVectors(n, east).normalize();
    // Up close the sun is a high afternoon sun from the west, relative to where you are looking; from space it is fixed.
    const local = n.clone().multiplyScalar(0.78).addScaledVector(east, -0.5).addScaledVector(north, 0.28).normalize();
    const world = new THREE.Vector3(0.55, 0.3, 0.78).normalize();
    const k = R / 100;
    const t = THREE.MathUtils.smoothstep(dist, 170 * k, 360 * k);
    const dir = local.lerp(world, t).normalize();
    this.sun.position.copy(F).addScaledVector(dir, 300);
    this.sun.target.position.copy(F);
    this.sun.castShadow = dist < 190;
    const ext = THREE.MathUtils.clamp(dist * 0.95, 22, 150);
    const sc = this.sun.shadow.camera;
    if (sc.right !== ext) {
      sc.left = -ext;
      sc.right = ext;
      sc.top = ext;
      sc.bottom = -ext;
      sc.updateProjectionMatrix();
    }

    const close = 1 - THREE.MathUtils.smoothstep(dist, 70, 260 * k);
    if (close > 0.3) {
      this.scene.background = this.skyTexture;
      this.scene.backgroundIntensity = Math.min(1, close * 1.1);
    } else {
      this.scene.background = new THREE.Color(0x03060b).lerp(new THREE.Color(0x4f7bb3), close / 0.3);
      this.scene.backgroundIntensity = 1;
    }
    if (dist < 230) {
      const fog = this.scene.fog as THREE.Fog | null;
      const color = new THREE.Color(0xc4d3e0);
      if (!fog) this.scene.fog = new THREE.Fog(color, 10, 400);
      const f = this.scene.fog as THREE.Fog;
      f.color.copy(color);
      f.near = dist * 0.9 + 25;
      f.far = dist * 3.4 + 220;
    } else {
      this.scene.fog = null;
    }
    if (this.globe) (this.globe.stars.material as THREE.PointsMaterial).opacity = THREE.MathUtils.smoothstep(dist, 120 * k, 300 * k) * 0.9;
    this.hemi.intensity = 1.15 + 0.3 * t;
  }

  // ---- picking ----

  /** Which tile is under a screen point, and where on the globe. */
  pickTile(sx: number, sy: number): { tile: Tile; lon: number; lat: number } | null {
    const ndc = new THREE.Vector2((sx / this.w) * 2 - 1, -(sy / this.h) * 2 + 1);
    this.camera.updateMatrixWorld();
    const origin = this.camera.position.clone();
    const dir = new THREE.Vector3(ndc.x, ndc.y, 0.5).unproject(this.camera).sub(origin).normalize();
    const hit = pickGround(origin, dir, this.hf);
    if (!hit) return null;
    const tile = lonLatToTile(this.world, hit.lon, hit.lat);
    return tile ? { tile, lon: hit.lon, lat: hit.lat } : null;
  }

  private describe(tile: Tile): HoverInfo {
    const w = this.world;
    const info: HoverInfo = { tile };
    info.site = siteAt(w, tile.x, tile.y);
    info.place = placeAt(w, tile.x, tile.y);
    info.node = nodeAt(w, tile.x, tile.y);
    info.route = routeAt(w, tile.x, tile.y, this.tool === 'rail' ? 'rail' : undefined);
    info.region = w.regions.find((r) => r.id === w.regionMap[tile.y * w.width + tile.x]);
    if (this.isBuildTool()) info.error = placeError(w, this.tool as SiteKind, tile.x, tile.y);
    if (this.tool === 'demolish') {
      info.route = routeAt(w, tile.x, tile.y, undefined, { newest: true });
      info.error = info.site ? null : info.route ? removeRouteError(w, info.route.id) : 'Click a building or a road to remove it';
    }
    return info;
  }

  // ---- input from the HUD ----

  setHoverBlocked(blocked: boolean): void {
    this.hoverBlocked = blocked;
    if (blocked) this.setHover(null);
  }

  setKeys(right: number, forward: number, turn: number): void {
    this.keys = { right, forward, turn };
  }

  setTool(tool: Tool): void {
    if (tool !== 'air') this.airFrom = null;
    this.tool = tool;
    this.pending = null;
    this.draft = null;
    this.committed = null;
    this.draftHistory = [];
    this.draftPlan = null;
    this.updateDraftMesh();
    this.signature += '!'; // refresh node markers on the next frame
    this.ghostKind = null;
    if (this.ghost) this.ghost.visible = false;
    if (this.hover) this.setHover(this.hover.tile);
  }

  select(sel: Selection): void {
    this.selection = sel;
    const tile = sel ? (sel.kind === 'site' ? siteById(this.world, sel.id) : this.world.places.find((p) => p.id === sel.id)) : null;
    if (tile) {
      this.selRing.matrix.copy(this.tileMatrix(tile, 0.15));
      this.selRing.matrixWorldNeedsUpdate = true;
      this.selRing.visible = true;
    } else {
      this.selRing.visible = false;
    }
  }

  /** True while a building tool (not select, road, vehicle or demolish) is active. */
  /** Tools that draw a road, highway or rail. */
  private isRouteTool(): boolean {
    return this.tool === 'route' || this.tool === 'highway' || this.tool === 'rail';
  }

  private isBuildTool(): boolean {
    return this.tool !== 'select' && !this.isRouteTool() && this.tool !== 'air' && this.tool !== 'demolish';
  }

  /** The stretch of road or track the demolish tool is pointing at, shown in red. */
  private removeMesh: THREE.Mesh | null = null;
  private removeId = 0;

  private showRemoval(route: Route | undefined): void {
    const id = route && !route.over ? route.id : 0;
    if (id === this.removeId) return;
    this.removeId = id;
    if (this.removeMesh) {
      this.scene.remove(this.removeMesh);
      this.removeMesh.geometry.dispose();
      this.removeMesh = null;
    }
    if (!route || id === 0 || route.path.length < 2 || route.mode === 'air') return;
    const net = route.mode === 'rail' ? this.rails : this.roads;
    const mat = new THREE.MeshBasicMaterial({ color: 0xff5e50, transparent: true, opacity: 0.55, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -5, polygonOffsetUnits: -5 });
    this.removeMesh = new THREE.Mesh(net.ribbonGeometry(route.path, route.mode === 'rail' ? 0.3 : route.grade === 'highway' ? 0.7 : 0.45, 0.16), mat);
    this.removeMesh.frustumCulled = false;
    this.scene.add(this.removeMesh);
  }

  private setHover(tile: Tile | null): void {
    if (!tile || this.hoverBlocked) {
      this.showRemoval(undefined);
      this.hover = null;
      this.ring.visible = false;
      if (this.ghost) this.ghost.visible = false;
      return;
    }
    this.hover = this.describe(tile);
    this.showRemoval(this.tool === 'demolish' && !this.hover.site ? this.hover.route : undefined);
    this.ring.matrix.copy(this.tileMatrix(tile, 0.18));
    this.ring.matrixWorldNeedsUpdate = true;
    this.ring.visible = true;
    const buildTool = this.isBuildTool();
    const ok = !buildTool && this.tool !== 'demolish' ? true : !this.hover.error;
    (this.ring.material as THREE.MeshBasicMaterial).color.set(ok ? 0xffffff : 0xff6b5e);
    if (buildTool) this.showGhost(this.tool as SiteKind, tile, ok);
    else if (this.ghost) this.ghost.visible = false;
  }

  private showGhost(kind: SiteKind, tile: Tile, ok: boolean): void {
    if (!this.ghost || this.ghostKind !== kind) {
      if (this.ghost) this.scene.remove(this.ghost);
      const mat = new THREE.MeshStandardMaterial({ vertexColors: true, transparent: true, opacity: 0.7, roughness: 0.9, depthWrite: false });
      this.ghost = new THREE.Mesh(this.siteGeometryFor(kind), mat);
      this.ghost.matrixAutoUpdate = false;
      this.scene.add(this.ghost);
      this.ghostKind = kind;
    }
    (this.ghost.material as THREE.MeshStandardMaterial).color.set(ok ? 0xb8ffc8 : 0xff9a90);
    this.ghost.matrix.copy(this.tileMatrix(tile, 0.02));
    this.ghost.matrixWorldNeedsUpdate = true;
    this.ghost.visible = true;
  }

  pointerDown(x: number, y: number, button: number): void {
    this.orbitUntil = 0;
    this.restoreView = null;
    const d = this.drag;
    d.x = d.startX = x;
    d.y = d.startY = y;
    d.moved = false;
    d.button = button;
    if (button === 2 || button === 1) {
      d.mode = button === 2 ? 'rotate' : 'pan';
      return;
    }
    if (this.isRouteTool()) {
      const pick = this.pickTile(x, y);
      if (pick) pick.tile = this.railTarget(pick.tile);
      if (this.committed) {
        // Carry on from where the last drag ended.
        this.draft = [...this.committed];
        this.draftTarget = null;
        d.mode = 'draft';
      } else if (pick && !this.startError(pick.tile)) {
        this.committed = [{ ...pick.tile }];
        this.draftHistory = [];
        this.draft = [...this.committed];
        this.draftTarget = null;
        d.mode = 'draft';
        this.updateDraft();
      } else {
        if (pick) this.onToast(this.startError(pick.tile)!);
        d.mode = 'pan';
      }
      return;
    }
    d.mode = 'pan';
  }

  pointerMove(x: number, y: number): void {
    const d = this.drag;
    const dx = x - d.x;
    const dy = y - d.y;
    if (d.mode && Math.hypot(x - d.startX, y - d.startY) > (this.touch ? 12 : 5)) d.moved = true;
    if (d.mode === 'pan' && d.moved) {
      this.cam.panPixels(dx, dy, this.h);
    } else if (d.mode === 'rotate') {
      this.cam.rotate(-dx * 0.006, dy * 0.004);
    } else if (d.mode === 'draft' && this.committed) {
      const pick = this.pickTile(x, y);
      if (pick) this.autoDraft(pick.tile);
    }
    d.x = x;
    d.y = y;
    if (!d.mode || d.mode === 'draft') {
      const pick = this.pickTile(x, y);
      this.setHover(pick ? pick.tile : null);
    }
  }

  pointerUp(x: number, y: number): void {
    const d = this.drag;
    const mode = d.mode;
    d.mode = null;
    if (mode === 'draft' && this.committed) {
      // A click with no drag is a waypoint too.
      if (!d.moved) {
        const pick = this.pickTile(x, y);
        if (pick) this.autoDraft(pick.tile);
      }
      const path = this.draft ?? this.committed;
      if (path.length > 1 && this.endsHere(path)) {
        if (this.buildDraft(path)) return;
        // Keep what was steered so far and let the player try another way in.
        this.draft = [...this.committed];
      } else if (path.length > this.committed.length) {
        this.draftHistory.push(this.committed.length);
        this.committed = [...path];
        this.draft = [...path];
      }
      this.draftPlan = null;
      this.updateDraftMesh();
      return;
    }
    if (d.button !== 0 || d.moved) return;
    const pick = this.pickTile(x, y);
    if (!pick) return;
    if (this.touch && (this.isBuildTool() || this.tool === 'demolish')) {
      // A tap only previews. The confirm button builds.
      this.pending = pick.tile;
      this.hoverBlocked = false;
      this.setHover(pick.tile);
      return;
    }
    this.click(pick.tile);
  }

  /** What would happen at the pending tile, for the confirm bar. */
  pendingInfo(): HoverInfo | null {
    return this.pending ? this.describe(this.pending) : null;
  }

  confirmPending(): void {
    const t = this.pending;
    if (!t) return;
    const err = this.describe(t).error;
    if (err) {
      this.onToast(err);
      return;
    }
    this.pending = null;
    this.click(t);
    this.setHover(null);
  }

  cancelPending(): void {
    this.pending = null;
    this.setHover(null);
  }

  /** Two fingers: spread zooms, a twist turns, and moving them up or down tilts. */
  pinch(zoomFactor: number, dHeading: number, dPitch: number): void {
    this.cam.zoom(zoomFactor);
    this.cam.rotate(dHeading, dPitch);
  }

  /** Drop whatever one-finger drag was going, when a second finger lands. */
  cancelPointer(): void {
    this.drag.mode = null;
  }

  private click(tile: Tile): void {
    const w = this.world;
    if (this.tool === 'select') {
      const site = siteAt(w, tile.x, tile.y);
      const place = placeAt(w, tile.x, tile.y);
      this.select(site ? { kind: 'site', id: site.id } : place ? { kind: 'place', id: place.id } : null);
      return;
    }
    if (this.tool === 'air') {
      const site = siteAt(w, tile.x, tile.y);
      if (!site || !SITE_DEFS[site.kind].airport) {
        this.onToast('Click an airport');
        return;
      }
      if (this.airFrom === null || this.airFrom === site.id) {
        this.airFrom = this.airFrom === site.id ? null : site.id;
        if (this.airFrom !== null) this.onToast('Now click the airport to fly to');
        return;
      }
      const err = createAirRoute(w, this.airFrom, site.id);
      this.onToast(err ?? 'Air route opened. Buy a cargo plane at either airport');
      if (!err) this.airFrom = null;
      return;
    }
    if (this.isRouteTool()) return;
    if (this.tool === 'demolish') {
      const site = siteAt(w, tile.x, tile.y);
      if (site) {
        this.demolish(site.id);
        return;
      }
      const route = routeAt(w, tile.x, tile.y, undefined, { newest: true });
      if (!route) {
        this.onToast('Click a building or a road to remove it');
        return;
      }
      const refund = routeRefund(w, route);
      const err = removeRoute(w, route.id);
      this.showRemoval(undefined);
      this.onToast(err ?? `Removed for $${refund.toLocaleString('en-US')} back`);
      return;
    }
    const err = placeSite(w, this.tool as SiteKind, tile.x, tile.y);
    if (err) this.onToast(err);
    else {
      const s = w.sites[w.sites.length - 1];
      this.onToast(`${s.name} built`);
      this.select({ kind: 'site', id: s.id });
      this.setHover(tile);
    }
  }

  wheel(x: number, y: number, deltaY: number): void {
    const factor = deltaY > 0 ? 1.12 : 1 / 1.12;
    if (factor < 1) {
      // Zooming in drifts the view toward whatever is under the cursor.
      const pick = this.pickTile(x, y);
      if (pick) {
        const k = 0.22;
        this.cam.focusOn(
          this.cam.target.lon + (pick.lon - this.cam.target.lon) * k,
          this.cam.target.lat + (pick.lat - this.cam.target.lat) * k,
        );
      }
    }
    this.cam.zoom(factor);
  }

  private get routeMode(): 'rail' | 'road' {
    return this.tool === 'rail' ? 'rail' : 'road';
  }

  /** Why a road cannot start on this tile, or null. */
  private startError(t: Tile): string | null {
    return roadEndError(this.world, t.x, t.y, this.routeMode);
  }

  /** A drag that reaches a building or an existing road of the same kind is finished: it joins them. */
  private endsHere(path: Tile[]): boolean {
    const end = path[path.length - 1];
    if (siteAt(this.world, end.x, end.y)) return true;
    return path.length > 1 && onNetwork(this.world, end.x, end.y, this.routeMode);
  }

  /** Whether lifting the pointer now would build the draft. */
  get draftFinishes(): boolean {
    const path = this.draft;
    return !!path && path.length > 1 && this.endsHere(path);
  }

  private buildDraft(path: Tile[]): boolean {
    const rail = this.tool === 'rail';
    const grade = this.tool === 'highway' ? 'highway' : 'street';
    const plan = planRoute(this.world, path, this.routeMode, grade);
    if (!plan.error && !path.some((t) => !onNetwork(this.world, t.x, t.y, this.routeMode))) {
      this.onToast('That is already built');
      return false;
    }
    const idBefore = this.world.nextId;
    const err = createRoute(this.world, path, this.routeMode, grade);
    if (!err) this.construction?.startRoad(path, this.routeMode, this.nowMs);
    const what = rail ? 'Track' : this.tool === 'highway' ? 'Highway' : 'Road';
    this.onToast(err ?? `${what} ${plan.free ? 'laid' : 'built'}`);
    if (err) return false;
    // Every pair of buildings the new road joins to the network now has a route; say which.
    const lanes = this.world.routes.filter((r) => r.over && r.id >= idBefore).slice(plan.free ? 0 : 1);
    if (lanes.length) {
      const name = (id: number): string => siteById(this.world, id)?.name ?? 'a building';
      const shown = lanes.slice(0, 3).map((r) => `${name(r.fromSiteId)} to ${name(r.toSiteId)}`);
      this.onToast(`Route open: ${shown.join(', ')}${lanes.length > 3 ? ` and ${lanes.length - 3} more` : ''}. Trucks waiting there start running`);
    }
    this.cancelDraft();
    return true;
  }

  /** Build what has been drawn so far, wherever it ends. */
  finishDraft(): void {
    const path = this.draft ?? this.committed;
    if (!path || path.length < 2) {
      this.onToast('Drag or click to draw first');
      return;
    }
    this.buildDraft(path);
  }

  /** Take back the last waypoint. */
  undoDraft(): void {
    if (!this.committed || this.draftHistory.length === 0) return;
    const len = this.draftHistory.pop()!;
    this.committed = this.committed.slice(0, len);
    this.draft = [...this.committed];
    this.draftPlan = null;
    this.draftTarget = null;
    this.updateDraftMesh();
  }

  cancelDraft(): void {
    this.committed = null;
    this.draftHistory = [];
    this.draft = null;
    this.draftPlan = null;
    this.drag.mode = null;
    this.updateDraftMesh();
  }

  // ---- route drawing ----

  /** The draft follows the cheapest buildable road from the end of the fixed part to the tile under the cursor. */
  /** With the rail tool, pointing at a town's Market or Freight Yard means its Rail Station. */
  private railTarget(t: Tile): Tile {
    if (this.tool !== 'rail') return t;
    const here = siteAt(this.world, t.x, t.y);
    if (!here || !SITE_DEFS[here.kind].dock) return t;
    const st = this.world.sites.find((s) => s.placeId === here.placeId && SITE_DEFS[s.kind].station);
    return st ? { x: st.x, y: st.y } : t;
  }

  private autoDraft(target: Tile): void {
    target = this.railTarget(target);
    const fixed = this.committed!;
    const anchor = fixed[fixed.length - 1];
    if (this.draftTarget && this.draftTarget.x === target.x && this.draftTarget.y === target.y) return;
    this.draftTarget = { ...target };
    if (anchor.x === target.x && anchor.y === target.y) {
      this.draft = [...fixed];
      this.draftPlan = null;
      this.updateDraftMesh();
      return;
    }
    const mode = this.tool === 'rail' ? 'rail' : 'road';
    const W = this.world.width;
    const avoid = new Set(fixed.slice(0, -1).map((t) => t.y * W + t.x));
    const path = findPath(this.world, anchor, target, 120000, mode, avoid);
    if (!path) {
      this.draft = [...fixed];
      // Track cannot run along streets or over lots: in a town, trains call at its station.
      const inTown = mode === 'rail' && placeAt(this.world, target.x, target.y);
      const error = inTown ? 'Track cannot run through the middle of a town: end it at the Rail Station on the edge of town' : 'No buildable way through there';
      this.draftPlan = { mode, grade: 'street', error, path: [], cost: 0, bridgeTiles: 0, tunnelTiles: 0, crossings: 0, free: true };
      this.updateDraftMesh();
      return;
    }
    this.draft = [...fixed, ...path.slice(1)];
    this.updateDraft();
  }

  private updateDraft(): void {
    const path = this.draft;
    if (!path) return;
    const end = path[path.length - 1];
    void end;
    this.draftPlan = path.length > 1 ? planRoute(this.world, path, this.routeMode, this.tool === 'highway' ? 'highway' : 'street') : null;
    this.updateDraftMesh();
  }

  private updateDraftMesh(): void {
    if (this.draftMesh) {
      this.scene.remove(this.draftMesh);
      this.draftMesh.geometry.dispose();
      this.draftMesh = null;
    }
    if (!this.draft || this.draft.length < 2) return;
    const bad = this.draftPlan?.error;
    const good = this.draftPlan && !this.draftPlan.error;
    const mat = new THREE.MeshBasicMaterial({
      color: bad ? 0xff5e50 : good ? 0x62e08a : 0xffffff,
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -4,
      polygonOffsetUnits: -4,
    });
    this.draftMesh = new THREE.Mesh(this.roads.ribbonGeometry(this.draft, 0.36, 0.14), mat);
    this.draftMesh.frustumCulled = false;
    this.scene.add(this.draftMesh);
  }

  // ---- actions used by the HUD panels ----

  demolish(siteId: number): void {
    const name = siteById(this.world, siteId)?.name ?? 'Building';
    const err = demolishSite(this.world, siteId);
    if (!err && this.selection?.kind === 'site' && this.selection.id === siteId) this.select(null);
    this.onToast(err ?? `${name} demolished`);
    this.signature += '#';
  }


  upgrade(siteId: number): void {
    const err = upgradeSite(this.world, siteId);
    this.onToast(err ?? 'Construction started');
    const s = siteById(this.world, siteId);
    if (!err && s) this.watch(s.x, s.y, 17, BUILD_MS);
  }

  togglePull(siteId: number, good: Good, on: boolean): void {
    setHubPull(this.world, siteId, good, on);
  }

  buy(siteId: number, kind: VehicleKind): void {
    const err = buyVehicle(this.world, siteId, kind);
    this.onToast(err ?? `${VEHICLE_DEFS[kind].label} bought`);
  }

  upgradeVeh(id: number): void {
    const err = upgradeVehicle(this.world, id);
    const v = this.world.vehicles.find((x) => x.id === id);
    this.onToast(err ?? (v ? `Upgraded to a ${VEHICLE_DEFS[v.kind].label}` : 'Vehicle upgraded'));
    if (err || !v) return;
    const route = vehicleRoute(this.world, v);
    const at = route?.path[Math.max(0, Math.min(route.path.length - 1, v.idx))] ?? siteById(this.world, v.homeId);
    if (at) this.watch(at.x, at.y, 12, 1800);
  }

  sellVeh(id: number): void {
    const err = sellVehicle(this.world, id);
    this.onToast(err ?? 'Vehicle sold');
  }

  sendTo(siteId: number, destId: number, on: boolean): void {
    setSendTo(this.world, siteId, destId, on);
  }

  making(siteId: number, on: boolean): void {
    setMaking(this.world, siteId, on);
  }

  roadTo(fromId: number, toId: number): void {
    const name = siteById(this.world, toId)?.name ?? 'there';
    const err = buildRoadTo(this.world, fromId, toId);
    this.onToast(err ?? `Road built. Now selling to ${name}`);
    if (!err) {
      const r = this.world.routes.filter((x) => x.mode === 'road').pop();
      if (r) this.construction?.startRoad(r.path, 'road', this.nowMs);
    }
  }

  vehicleDest(id: number, destId: number): void {
    setVehicleDest(this.world, id, destId);
  }

  // ---- overlay data for the HUD ----

  private project(v: THREE.Vector3): { x: number; y: number } | null {
    const p = v.clone();
    const facing = p.clone().normalize().dot(this.camera.position.clone().sub(p).normalize());
    if (facing < 0.12) return null;
    p.project(this.camera);
    if (p.z > 1 || p.z < -1) return null;
    return { x: ((p.x + 1) / 2) * this.w, y: ((1 - p.y) / 2) * this.h };
  }

  private tilePoint(x: number, y: number, lift: number): THREE.Vector3 {
    const { lon, lat } = tileLonLat(this.world.width, this.world.height, x, y);
    return lonLatToVec(lon, lat, R + this.hf.surface(lon, lat) + lift);
  }

  /** Where a tile appears on screen right now. For debugging and tests. */
  screenOf(x: number, y: number, lift = 1): [number, number] | null {
    const p = this.project(this.tilePoint(x, y, lift));
    return p ? [Math.round(p.x), Math.round(p.y)] : null;
  }

  /** Screen positions of everything the HUD labels or marks. */
  overlay(): OverlayItem[] {
    const w = this.world;
    const out: OverlayItem[] = [];
    const dist = this.cam.dist;
    if (dist > 70) {
      for (const r of w.regions) {
        const lat = r.kind === 'ice' ? (r.y < w.height / 2 ? 1 : -1) * 1.38 : (0.5 - r.y / w.height) * 2 * LAT_SPAN;
        const lon = ((r.x / w.width) * 2 - 1) * Math.PI;
        const p = this.project(lonLatToVec(lon, lat, R + 1.5));
        if (p) out.push({ kind: 'region', id: r.id, text: r.name, x: p.x, y: p.y, value: r.size, tag: r.kind });
      }
    }
    if (dist < 330) {
      for (const pl of w.places) {
        const p = this.project(this.tilePoint(pl.x, pl.y, 2.2 + pl.level * 0.5));
        if (p) out.push({ kind: 'town', id: pl.id, text: pl.name, x: p.x, y: p.y, value: pl.level, tag: 'town' });
      }
    }
    if (dist < 150) {
      for (const s of w.sites) {
        const def = SITE_DEFS[s.kind];
        const p = this.project(this.tilePoint(s.x, s.y, 2.0));
        if (!p) continue;
        out.push({ kind: 'ring', id: s.id, text: s.name, x: p.x, y: p.y, value: this.fill(s), tag: def.dock ? 'dock' : s.kind });
      }
    }
    return out;
  }

  /** How full a site is, 0..1, for its status ring. */
  fill(s: Site): number {
    const def = SITE_DEFS[s.kind];
    const cap = def.cap * (def.dock ? (this.world.places.find((p) => p.id === s.placeId)?.level ?? 1) : [1, 2, 4][s.level - 1]);
    let hi = 0;
    for (const v of Object.values(s.stock)) hi = Math.max(hi, v ?? 0);
    return Math.min(1, hi / cap);
  }

  private updateRings(): void {
    // Keep rings in step if the selected thing is rebuilt.
    if (this.selection) this.select(this.selection);
  }

  // ---- thumbnails for the HUD ----

  /** Render each building and vehicle to a small image for the build menu. */
  makeThumbnails(size = 128): Map<string, HTMLCanvasElement> {
    const out = new Map<string, HTMLCanvasElement>();
    const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    r.setSize(size, size);
    r.setPixelRatio(1);
    r.toneMapping = THREE.ACESFilmicToneMapping;
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xdfeaff, 0x55524a, 1.1));
    const light = new THREE.DirectionalLight(0xfff0dc, 2.8);
    light.position.set(-3, 5, 4);
    scene.add(light);
    const cam = new THREE.PerspectiveCamera(32, 1, 0.1, 100);

    const shoot = (key: string, geo: THREE.BufferGeometry, yaw = 0.7): void => {
      const mesh = new THREE.Mesh(geo, siteMaterial);
      mesh.rotation.y = yaw;
      scene.add(mesh);
      geo.computeBoundingSphere();
      const bs = geo.boundingSphere!;
      const dist = (bs.radius / Math.sin((cam.fov * Math.PI) / 360)) * 1.02;
      cam.position.set(bs.center.x + dist * 0.55, bs.center.y + dist * 0.62, bs.center.z + dist * 0.56);
      cam.lookAt(bs.center.x, bs.center.y - bs.radius * 0.12, bs.center.z);
      r.render(scene, cam);
      const c = document.createElement('canvas');
      c.width = c.height = size;
      c.getContext('2d')!.drawImage(r.domElement, 0, 0);
      out.set(key, c);
      scene.remove(mesh);
    };
    for (const kind of BUILD_ORDER) shoot(kind, siteGeometry(kind), 0);
    for (const kind of VEHICLE_ORDER) shoot(kind, vehicleGeometry(kind), 0.9);
    r.dispose();
    r.forceContextLoss();
    return out;
  }

  /** Set up a sample base near the first town. For the #demo link and screenshots. */
  buildDemoBase(): void {
    const focus = buildDemo(this.world);
    this.signature = '';
    this.syncWorld();
    if (focus) {
      const { lon, lat } = tileLonLat(this.world.width, this.world.height, focus.x, focus.y);
      const hash = location.hash;
      const dist = hash.includes('far') ? 300 : hash.includes('mid') ? 90 : 38;
      this.cam.set(lon, lat, dist, 0, 0);
    }
  }

  // ---- the opening showcase: a base that builds and grows while a cinematic camera flies over it ----

  /** True while the opening screen is up: the world is a demo, never saved, and the camera flies itself. */
  showcase = false;
  private cine: { keys: { at: number; x: number; y: number; dist: number; h: number; p: number }[]; t: number; events: { at: number; run: () => void; done: boolean }[]; later: number } | null = null;

  /** Whether there is an autosave to continue from. */
  hasSave(): boolean {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      return !!raw && (JSON.parse(raw) as World).version === 4;
    } catch {
      return false;
    }
  }

  /** Fly over the demo base, and have things happen in it: upgrades, a district, towns growing. */
  startShowcase(): void {
    const w = this.world;
    const town = w.places[0];
    const next = w.places[1] ?? town;
    const at = (s: { x: number; y: number } | undefined, fallback: { x: number; y: number }): { x: number; y: number } => ({ x: (s ?? fallback).x, y: (s ?? fallback).y });
    const F = at(town, { x: 0, y: 0 });
    const farm = at(w.sites.find((q) => q.kind === 'farm'), F);
    const hub = at(w.sites.find((q) => q.kind === 'railyard' || q.depot) ?? w.sites.find((q) => q.kind === 'hub'), F);
    const sp = demoSpots;
    const ap = at(sp.airport, F);
    const ap2 = at(sp.airport2, F);
    const mid = { x: (ap.x + ap2.x) / 2, y: (ap.y + ap2.y) / 2 };
    const span = Math.hypot(ap.x - ap2.x, ap.y - ap2.y);
    const stad = at(sp.stadium, next);
    const amph = at(sp.amphitheatre, F);
    const keys = [
      { at: 0, x: F.x - 50, y: F.y - 22, dist: 290, h: -0.5, p: 0 },
      { at: 6, x: F.x - 8, y: F.y - 4, dist: 60, h: 0.1, p: 0.3 },
      { at: 10.5, x: farm.x, y: farm.y, dist: 14, h: 0.8, p: 0.45 },
      { at: 15.5, x: hub.x, y: hub.y, dist: 13, h: 2.0, p: 0.4 },
      { at: 20, x: ap.x, y: ap.y, dist: 22, h: 0.9, p: 0.55 },
      { at: 25, x: mid.x, y: mid.y, dist: Math.max(50, span * 2.6), h: 1.6, p: 0.5 },
      { at: 30, x: stad.x, y: stad.y, dist: 15, h: 2.7, p: 0.85 },
      { at: 35, x: amph.x, y: amph.y, dist: 14, h: 4.4, p: 0.4 },
      { at: 40, x: F.x + 3, y: F.y + 2, dist: 16, h: 5.2, p: 0.5 },
      { at: 46, x: next.x, y: next.y, dist: 40, h: 6.0, p: 0.35 },
    ];
    const upgradeAny = (kind: string): void => {
      const site = w.sites.find((q) => q.kind === kind);
      if (site) upgradeSite(w, site.id);
    };
    const growAny = (): void => {
      const p = w.places.find((q) => q.level < 5 && q !== town) ?? w.places.find((q) => q.level < 5);
      if (p) p.level += 1;
    };
    this.cine = {
      keys,
      t: 0,
      later: 0,
      events: [
        { at: 11, run: () => upgradeAny('farm'), done: false },
        { at: 17, run: () => upgradeAny('railyard'), done: false },
        { at: 38, run: () => { if (town && town.level < 5) town.level += 1; }, done: false },
        { at: 41, run: () => { if (town) buildDistrict(w, town, DISTRICT_ORDER[0]); }, done: false },
        { at: 47, run: growAny, done: false },
      ],
    };
    this.showcase = true;
    this.speed = 1;
  }

  /** Hand the world back: the opening is over. */
  endShowcase(): void {
    this.showcase = false;
    this.cine = null;
  }

  private updateShowcase(dt: number): void {
    const c = this.cine;
    if (!c) return;
    c.t += Math.min(dt, 0.1);
    for (const e of c.events) {
      if (!e.done && c.t >= e.at) {
        e.done = true;
        e.run();
      }
    }
    const k = c.keys;
    const last = k[k.length - 1];
    let x: number, y: number, dist: number, h: number, p: number;
    if (c.t >= last.at) {
      // Past the last shot: drift slowly round it, with something new happening now and then.
      const over = c.t - last.at;
      [x, y, dist, p] = [last.x, last.y, last.dist, last.p];
      h = last.h + over * 0.05;
      if (over > c.later + 13) {
        c.later = over;
        const w = this.world;
        const site = w.sites.find((q) => !SITE_DEFS[q.kind].dock && !SITE_DEFS[q.kind].station && upgradeError(w, q.id) === null);
        if (site) upgradeSite(w, site.id);
        else {
          const town = w.places.find((q) => q.level < 5);
          if (town) town.level += 1;
        }
      }
    } else {
      let i = 0;
      while (i < k.length - 2 && c.t >= k[i + 1].at) i++;
      const u = (c.t - k[i].at) / (k[i + 1].at - k[i].at);
      const a = k[Math.max(0, i - 1)];
      const b = k[i];
      const cc = k[i + 1];
      const d = k[Math.min(k.length - 1, i + 2)];
      const cr = (p0: number, p1: number, p2: number, p3: number): number =>
        0.5 * (2 * p1 + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u * u + (-p0 + 3 * p1 - 3 * p2 + p3) * u * u * u);
      x = cr(a.x, b.x, cc.x, d.x);
      y = cr(a.y, b.y, cc.y, d.y);
      dist = Math.exp(cr(Math.log(a.dist), Math.log(b.dist), Math.log(cc.dist), Math.log(d.dist)));
      h = cr(a.h, b.h, cc.h, d.h);
      p = cr(a.p, b.p, cc.p, d.p);
    }
    const { lon, lat } = tileLonLat(this.world.width, this.world.height, x, y);
    this.cam.set(lon, lat, dist, h, p);
  }

  /** Debug and screenshot helper: put the camera on a tile. */
  lookAt(x: number, y: number, dist = 40, heading = 0, pitchManual = 0): void {
    const { lon, lat } = tileLonLat(this.world.width, this.world.height, x, y);
    this.cam.set(lon, lat, dist, heading, pitchManual);
    this.cam.apply();
  }

  /** Look at the biggest region of a kind. */
  lookAtRegion(kind: string, dist = 60, heading = 0, pitchManual = 0): string {
    const r = this.world.regions.filter((q) => q.kind === kind).sort((a, b) => b.size - a.size)[0];
    if (!r) return 'none';
    this.lookAt(Math.round(r.x), Math.round(r.y), dist, heading, pitchManual);
    return r.name;
  }

  /** Let the loop run a few more frames, then freeze again (screenshots). */
  freezeAfter(frames = 24): void {
    this.frames = 24 - frames;
    (window as unknown as { __frozen?: boolean }).__frozen = false;
    if (!this.running) {
      this.running = true;
      requestAnimationFrame((t) => this.frame(t));
    }
  }

  get maxDist(): number {
    return maxDist();
  }

  /** Region under the camera focus, for debugging. */
  regionAt(tile: Tile): Region | undefined {
    return this.world.regions.find((r) => r.id === this.world.regionMap[tile.y * this.world.width + tile.x]);
  }
}
