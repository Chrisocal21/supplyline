// The 3D game: owns the Three.js scene, runs the simulation, and turns pointer input into player actions.
// The Phaser HUD sits on top and calls into this class.
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import {
  GOODS,
  SITE_DEFS,
  LEVEL_SPEED,
  TICKS_PER_SECOND,
  VEHICLE_DEFS,
  vehicleLabel,
  VEHICLE_ORDER,
  BUILD_ORDER,
  WORLD_SIZES,
  RANDOM_SIZES,
  type WorldSizeId,
  type DistrictId,
  type NodeKind,
  type SiteKind,
  type VehicleKind,
} from '../sim/defs';
import { townGeometry, type TownLandmark } from './townmodel';
import type { Setting } from './districts';
import { GROW_MS, growMaterial } from './grow';
import { tileLonLat } from '../sim/mapgen';
import { findPath } from '../sim/path';
import {
  buyVehicle,
  buildRoadTo,
  relayoutNodes,
  prepareRealisticWorld,
  homesNow,
  upgradeVehicle,
  duplicateVehicle,
  setAutoBuy,
  acceptOffer,
  declineOffer,
  type TruckOffer,
  sellVehicle,
  setVehicleDest,
  setVehiclePick,
  bodyForLine,
  type PickMode,
  type Line,
  setSendTo,
  setMaking,
  onNetwork,
  removeRoute,
  removeRouteError,
  roadEndError,
  routeRefund,
  createAirRoute,
  createSeaRoute,
  createRoute,
  createWorld,
  createWorldFromMap,
  type MapData,
  demolishSite,
  demolishRefund,
  nodeAt,
  plotFacing,
  layoutOf,
  plotTiles,
  townGround,
  terrainAt,
  elevAt,
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
  siteCenter,
  siteReach,
  siteTiles,
  airportRot,
  airportPad,
  type Rot,
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
import { packSave, saveFileName, unpackSave } from '../sim/saveio';
import { buildDistrict } from '../sim/town';
import map1 from '../maps/map1.json';
import map2 from '../maps/map2.json';
import { paintGlobe, paintRoughness } from './paint';
import { Smoke } from './smoke';
import { buildingSurfaces, loadSurfaces } from './surfaces';
import { GRAPHICS, nightLight, readGraphics, saveGraphics, type GraphicsQuality, type LightingMode } from './graphics';
import { TILE_UNITS, type LightAnchor } from '../scale';
import { LAND_PREFIX, buyParcel, enableLandRules, parcelAt, parcelPrice } from '../sim/land';
import { RoadNet, makeHighwayTexture, makeRailTexture, makeRoadTexture } from './roads';
import { Scenery } from './scenery';
import { buildDemo, demoSpots } from './demo';
import { cropCircleGeometry, placeEggs } from './eggs';
import { siteAnimParts, type AnimPart } from './anims';
import { OpeningProps, balloonGeometry, cargoShipGeometry, cowGeometry, duckGeometry, monsterGeometry, sailboatGeometry, tankerGeometry, tugGeometry, ufoGeometry, turntableGeometry } from './opening';
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
  boxtruck: [0.42, -0.14],
  bigtruck: [0.42, -0.2],
  rig: [0.42, -0.3],
  convoy: [0.42, -0.1],
  train: [0.58, -0.14],
  heavytrain: [0.58, 0.2],
  plane: [0.58, -0.14],
  jet: [0.58, -0.14],
  barge: [0.3, 0],
  boat: [0.3, 0],
  freighter: [0.3, 0],
  containership: [0.3, 0],
};

export type Tool = 'select' | 'route' | 'highway' | 'rail' | 'air' | 'sea' | 'demolish' | SiteKind;
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
  sh.uniforms.nightLight = nightLight;
  sh.vertexShader = sh.vertexShader
    .replace('#include <common>', '#include <common>\nattribute float mid;\nvarying float vMid;\nvarying vec3 vOP;\nvarying vec3 vON;')
    .replace('#include <begin_vertex>', '#include <begin_vertex>\nvMid = mid; vOP = position; vON = normal;');
  sh.fragmentShader = sh.fragmentShader
    .replace(
      '#include <common>',
      `#include <common>
uniform float nightLight;
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
    float blinds = step(0.88, h21(cell));
    vec3 glass = mix(vec3(0.12, 0.2, 0.25), vec3(0.28, 0.3, 0.28), blinds);
    glass *= 0.92 + 0.12 * h21(vec2(cell.x, 7.0));
    diffuseColor.rgb = mix(diffuseColor.rgb * 0.68, glass, win);
    shade = 1.0;
  } else if (m == 10.0) {
    shade *= 0.8 + 0.3 * vn(uvw * 150.0);
  } else if (m == 11.0) {
    shade *= mix(0.45, 1.0, step(0.09, fract(along * 20.0)));
  }
  // Dirt and damp collect where a wall meets the ground, and the sun bleaches the top of it.
  if (!top) shade *= mix(0.74, 1.0, smoothstep(0.0, 0.32, vOP.y)) * (0.96 + 0.08 * vn(vec2(along * 5.0, vOP.y * 2.0)));
  else shade *= 0.97 + 0.05 * vn(uvw * 7.0);
  diffuseColor.rgb *= shade;
}`,
    )
    .replace(
      '#include <roughnessmap_fragment>',
      `#include <roughnessmap_fragment>
  float surfaceKind = floor(vMid + 0.5);
  if (surfaceKind == 5.0) roughnessFactor = 0.48;
  else if (surfaceKind == 7.0) roughnessFactor = 0.3;
  else if (surfaceKind == 8.0) roughnessFactor = 0.18;
  else if (surfaceKind == 3.0 || surfaceKind == 6.0) roughnessFactor = 0.94;`,
    )
    .replace(
      '#include <metalnessmap_fragment>',
      `#include <metalnessmap_fragment>
  if (floor(vMid + 0.5) == 5.0) metalnessFactor = 0.45;`,
    )
    .replace(
      '#include <emissivemap_fragment>',
      `#include <emissivemap_fragment>
      float fixture = floor(vMid + 0.5);
      if (fixture == 9.0) totalEmissiveRadiance += diffuseColor.rgb * (0.15 + nightLight * 3.0);
      if (fixture == 8.0 || fixture == 7.0) {
        float occupied = step(0.55, h21(floor(vOP.xz * 2.0) + floor(vOP.y * 3.0)));
        totalEmissiveRadiance += vec3(1.0, 0.72, 0.4) * nightLight * occupied * 0.35;
      }`,
    );
  buildingSurfaces(sh);
};

/** What the caption says for a stretch of the opening, and whether a camera flash marks its start. */
interface Cue {
  at: number;
  end: number;
  head: string;
  sub: string;
  flash?: boolean;
}

/** A panel drawn over the opening: the menu being shown, and when. */
interface Ui {
  at: number;
  end: number;
  kind: 'sell' | 'bank' | 'town';
}

/** One film shot of the opening: how long it runs and where the camera is at each moment (u runs 0 to 1). */
interface Shot {
  dur: number;
  view: (u: number, t: number, dt: number) => { x: number; y: number; dist: number; h: number; p: number };
}

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
  /** A demolish waiting for the player to confirm it in a pop-up. */
  removal: { title: string; detail: string; verb: string; run: () => void } | null = null;
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
  graphicsQuality: GraphicsQuality = 'ultra';
  lightingMode: LightingMode = 'day';
  private readonly localLights: THREE.PointLight[] = [];
  private nextLights = 0;
  onToast: (text: string) => void = () => {};
  /** How long the last world took to build, for performance checks. */
  loadStats = { paintMs: 0, totalMs: 0 };

  private globe: Globe | null = null;
  private readonly smoke = new Smoke();
  /** Building work on screen. Created on first use, since the shared material is defined further down this module. */
  private construction: Construction | null = null;
  /** Each building's level when last drawn, so an upgrade can be spotted; and whether the first world sync is done. */
  private readonly siteLevels = new Map<number, number>();
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
  private readonly growing = new Map<number, { start: number; old: THREE.Mesh; mesh: THREE.Mesh; reach: number; fell: { tile: number; d: number }[] }>();
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
  /** How the game is running, for the on-screen readout (F3): worked out from the last couple of seconds of frames. */
  readonly perf = { fps: 0, avgMs: 0, p95Ms: 0, simMs: 0, drawMs: 0, workMs: 0 };
  private perfGaps: number[] = [];
  private perfSim = 0;
  private perfDraw = 0;
  private perfWork = 0;
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
    this.renderer.toneMappingExposure = 1.0;
    const el = this.renderer.domElement;
    el.style.position = 'absolute';
    el.style.left = '0';
    el.style.top = '0';
    host.appendChild(el);

    this.scene.background = new THREE.Color(0x03060b);
    const environment = this.skyTexture.clone();
    environment.mapping = THREE.EquirectangularReflectionMapping;
    this.scene.environment = environment;
    this.scene.environmentIntensity = 0.28;
    void loadSurfaces(this.renderer.capabilities.getMaxAnisotropy()).catch(error => {
      console.error('PBR materials failed to load', error);
      this.onToast('Detailed materials could not load. Reload to retry.');
    });
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
    const preferences = readGraphics();
    this.lightingMode = preferences.lighting;
    this.applyGraphics(preferences.quality);
    this.resize();
  }

  setGraphics(quality: GraphicsQuality, lighting = this.lightingMode): void {
    this.lightingMode = lighting;
    this.applyGraphics(quality);
    try {
      saveGraphics(quality, lighting);
    } catch (error) {
      console.warn('Graphics preferences could not be saved.', error);
      this.onToast('Graphics changed, but preferences could not be saved.');
    }
  }

  private applyGraphics(quality: GraphicsQuality): void {
    this.graphicsQuality = quality;
    const settings = GRAPHICS[quality];
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, settings.pixelRatio));
    this.sun.shadow.mapSize.set(settings.shadows, settings.shadows);
    this.sun.shadow.map?.dispose();
    this.sun.shadow.map = null;
    if (this.composer) {
      for (const pass of this.composer.passes) pass.dispose();
      this.composer.dispose();
      this.composer = null;
      this.ao = null;
    }
    for (const light of this.localLights) {
      this.scene.remove(light);
      light.dispose();
    }
    this.localLights.length = 0;
    for (let i = 0; i < settings.lights; i++) {
      const light = new THREE.PointLight(0xffdfac, 0, 2.5, 2);
      this.localLights.push(light);
      this.scene.add(light);
    }
    this.nextLights = 0;
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
    // No "back to where you were" carries over from the title scene or an earlier world.
    this.backView = null;
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

  /** A new game on Map 1, or (given a seed, for tests and screenshots) on a generated world. `size` picks one of WORLD_SIZES: a random world of that size when it is not Map 1. */
  newWorld(seed?: number, size?: WorldSizeId): void {
    const def = [...WORLD_SIZES, ...RANDOM_SIZES].find((q) => q.id === size);
    const world = def?.id === 'map2' ? createWorldFromMap(map2 as MapData) : def && !def.made ? createWorld(seed ?? Math.floor(Math.random() * 1e9), def.width, def.height) : seed === undefined ? createWorldFromMap(map1 as MapData) : createWorld(seed);
    prepareRealisticWorld(world);
    enableLandRules(world);
    this.loadWorld(world);
  }

  /** Take a world that has been made elsewhere (in steps, with a progress bar) and show it. */
  adoptWorld(world: World): void {
    prepareRealisticWorld(world);
    enableLandRules(world);
    this.loadWorld(world);
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

  /** Bring an older save up to date and make it the game being played. */
  private adopt(w: World): void {
    // Saves from before the quests.
    w.questsDone ??= [];
    // Spots from an older layout move to level, spaced-out ground (ones with a building stay put).
    relayoutNodes(w);
    this.loadWorld(w);
  }

  /** The text of a save file for the game being played now, or for one slot. */
  exportSave(slot?: number): { name: string; text: string } | null {
    try {
      if (slot === undefined) return { name: saveFileName(this.world), text: packSave(this.world) };
      const raw = localStorage.getItem(this.slotKey(slot));
      if (!raw) return null;
      const w = JSON.parse(raw) as World;
      return { name: saveFileName(w), text: packSave(w) };
    } catch {
      return null;
    }
  }

  /** Play a game from a save file's text. Returns null when it worked, or what was wrong with the file. */
  importSave(text: string): string | null {
    const out = unpackSave(text);
    if ('error' in out) return out.error;
    try {
      this.adopt(out.world);
      this.save();
      return null;
    } catch {
      return 'That save could not be loaded.';
    }
  }

  /** Load the autosaved game, or a slot by its key. */
  load(key = SAVE_KEY): boolean {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return false;
      const w = JSON.parse(raw) as World;
      if (w.version !== 4) return false;
      this.adopt(w);
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
    const frameStart = performance.now();
    if (this.last > 0) {
      this.perfGaps.push(now - this.last);
      if (this.perfGaps.length > 120) this.perfGaps.shift();
    }
    const dt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    this.frames += 1;
    this.nowMs = now;

    this.acc += dt * 1000 * this.speed;
    let ticks = 0;
    const simStart = performance.now();
    while (this.acc >= TICK_MS && ticks < 40) {
      step(this.world);
      this.acc -= TICK_MS;
      ticks += 1;
    }
    this.perfSim += performance.now() - simStart;
    if (this.speed === 0) this.acc = 0;

    if (this.showcase) this.updateShowcase(dt);
    else if (now < this.orbitUntil) this.updateShots(dt);
    this.cam.panKeys(this.keys.right, this.keys.forward, dt);
    if (this.keys.turn) this.cam.rotate(this.keys.turn * dt * 1.4, 0);
    this.cam.update(dt);
    this.cam.apply();
    this.syncWorld();
    this.updateGrowth();
    const dust = this.updateConstruction();
    this.updateVehicles();
    this.updateSiteAnims(now / 1000);
    this.updateLeaving();
    this.updateSmoke(dt, dust);
    this.updateLighting();
    this.scenery.treeDetailDistance = GRAPHICS[this.graphicsQuality].treeDetail;
    this.scenery.update(now / 1000, this.camera);
    this.globe?.update(now / 1000);
    this.updateRings();
    this.updateSpots();
    this.drainLog();
    const drawStart = performance.now();
    this.draw();
    this.perfDraw += performance.now() - drawStart;
    this.perfWork += performance.now() - frameStart;
    if (this.frames % 30 === 0 && this.perfGaps.length > 10) {
      const gaps = [...this.perfGaps].sort((a, b) => a - b);
      const avg = gaps.reduce((a, b) => a + b, 0) / gaps.length;
      this.perf.avgMs = avg;
      this.perf.fps = 1000 / avg;
      this.perf.p95Ms = gaps[Math.min(gaps.length - 1, Math.floor(gaps.length * 0.95))];
      this.perf.simMs = this.perfSim / 30;
      this.perf.drawMs = this.perfDraw / 30;
      this.perf.workMs = this.perfWork / 30;
      this.perfSim = 0;
      this.perfDraw = 0;
      this.perfWork = 0;
    }

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
  private backView: { lon: number; lat: number; dist: number; heading: number; pitch: number } | null = null;

  /** A town just grew and the show is over: the Back button can take the player to where they were looking. */
  get canGoBack(): boolean {
    return this.backView !== null && this.growing.size === 0 && this.districtWork.size === 0 && this.nowMs >= this.orbitUntil;
  }

  /** Back to the view from before the town grew, in the same camera angle. */
  goBack(): void {
    const v = this.backView;
    this.backView = null;
    if (!v) return;
    // The angle comes back at once and the camera glides home along the ground.
    this.cam.heading = this.cam.target.heading = v.heading;
    this.cam.pitchManual = this.cam.target.pitch = v.pitch;
    this.cam.target.lon = v.lon;
    this.cam.target.lat = v.lat;
    this.cam.target.dist = v.dist;
    this.orbitUntil = 0;
    this.shotList = [];
  }

  dismissBack(): void {
    this.backView = null;
  }

  private watch(x: number, y: number, dist: number, ms: number, back = false): void {
    if (this.showcase) return;
    const keep = { lon: this.cam.lon, lat: this.cam.lat, dist: this.cam.dist, heading: this.cam.heading, pitch: this.cam.pitchManual };
    // Where the player was looking is kept once. A second growth while the first is still being shown must not replace it with a camera cut.
    if (back && (this.backView === null || this.nowMs >= this.orbitUntil)) this.backView = keep;
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
    const settings = GRAPHICS[this.graphicsQuality];
    if (this.cam.dist > 150 || !settings.aoSamples) {
      this.renderer.render(this.scene, this.camera);
      return;
    }
    if (!this.composer) {
      const target = new THREE.WebGLRenderTarget(this.w, this.h, { type: THREE.HalfFloatType, samples: settings.msaa });
      const c = new EffectComposer(this.renderer, target);
      c.setPixelRatio(this.renderer.getPixelRatio());
      c.setSize(this.w, this.h);
      c.addPass(new RenderPass(this.scene, this.camera));
      const ao = new GTAOPass(this.scene, this.camera, this.w, this.h);
      // Ambient occlusion is soft, so it is worked out on a smaller buffer measured in CSS pixels, never in device
      // pixels: a high-DPI screen would otherwise multiply its cost by four.
      const fullSize = ao.setSize.bind(ao);
      ao.setSize = () => fullSize(Math.max(1, Math.round(this.w * settings.aoScale)), Math.max(1, Math.round(this.h * settings.aoScale)));
      // The amber reserved-ground wash is blended over the ground; if the occlusion pass saw it as a solid sheet it would
      // black out the ground under it at close range.
      const aoRender = ao.render.bind(ao);
      ao.render = (...args: Parameters<GTAOPass['render']>) => {
        this.scenery.hideOverlays(true);
        aoRender(...args);
        this.scenery.hideOverlays(false);
      };
      ao.output = GTAOPass.OUTPUT.Default;
      ao.blendIntensity = 1;
      ao.updateGtaoMaterial({ radius: 0.2, distanceExponent: 1.4, thickness: 0.3, scale: 1.1, samples: settings.aoSamples, distanceFallOff: 1, screenSpaceRadius: false });
      ao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 5, radiusExponent: 1, rings: 2, samples: 12 });
      c.addPass(ao);
      if (settings.bloom) c.addPass(new UnrealBloomPass(new THREE.Vector2(this.w, this.h), 0.18, 0.4, 1.0));
      c.addPass(new OutputPass());
      this.composer = c;
      this.ao = ao;
    }
    // Reach and strength follow the view height, so a wide view is not smeared dark.
    this.ao!.updateGtaoMaterial({ radius: THREE.MathUtils.clamp(this.cam.dist * 0.012, 0.12, 0.5) });
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
      w.sites.map((s) => `${s.id}.${s.level}`).join(','),
      roadSig,
      w.places.map((p) => `${p.level}${Object.values(p.districts ?? {}).join('')}${p.path ?? ''}`).join(''),
      w.vehicles.length,
      w.vehicles.reduce((n, v) => n + VEHICLE_ORDER.indexOf(v.kind), 0),
    ].join('|');
    if (sig !== this.signature) {
      const routesChanged = !this.signature || this.signature.split('|')[1] !== roadSig;
      this.signature = sig;
      const levelled = this.hf.levelAirfields();
      if (routesChanged || levelled.size) {
        // Roads regrade the ground first, so everything else is placed on the ground as it will be. A new airport levels
        // its field first, and the roads are then graded over that.
        const regraded = this.hf.setRoads();
        for (const t of levelled) regraded.add(t);
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
      this.scenery.clearTiles(w.sites.flatMap((s) => siteTiles(w, s)).map((t) => t.y * w.width + t.x));
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
    this.scenery.showGates(this.isRouteTool());
    this.scenery.setParcels(this.isBuildTool() && !!w.landRules, String((w.owned ?? []).length));
    this.scenery.setReserved(this.isRouteTool() || this.isBuildTool(), w.places.map((p) => `${p.level}.${Object.values(p.districtLots ?? {}).join('_')}`).join(',') + (this.growing.size > 0 ? 'g' : ''));
    this.scenery.setNodesUsed(usedNodes);
  }

  private activeNodeKind(): NodeKind | null {
    if (this.isRouteTool() || this.tool === 'select' || this.tool === 'air' || this.tool === 'sea' || this.tool === 'demolish') return null;
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

  /** Moving parts riding on buildings: a nodding pumpjack, a turning radar, a crane trolley, a windmill. */
  private readonly siteAnims = new Map<number, { key: string; parts: { mesh: THREE.Mesh; part: AnimPart }[] }>();

  private syncSiteAnims(id: number, kind: SiteKind, level: number, m: THREE.Mesh): void {
    const key = kind + level;
    const have = this.siteAnims.get(id);
    if (have && have.key === key) return;
    if (have) for (const p of have.parts) m.remove(p.mesh);
    const parts = siteAnimParts(kind, level).map((part) => {
      const mesh = new THREE.Mesh(part.geo, siteMaterial);
      mesh.matrixAutoUpdate = false;
      mesh.castShadow = true;
      m.add(mesh);
      return { mesh, part };
    });
    this.siteAnims.set(id, { key, parts });
  }

  private updateSiteAnims(seconds: number): void {
    for (const a of this.siteAnims.values()) {
      for (const p of a.parts) {
        p.part.tick(seconds, p.mesh.matrix, p.part.base);
        p.mesh.matrixWorldNeedsUpdate = true;
      }
    }
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
      const isNew = !m && this.sitesShown;
      // A building going up a level shows its scaffolding, but never moves the camera or interrupts play.
      if (before !== undefined && s.level > before && m && this.construction) this.construction.start(s.id, this.nowMs, '', null, this.siteGeometryFor(s.kind, s.level));
      if (isNew && !SITE_DEFS[s.kind].dock && !SITE_DEFS[s.kind].station) this.onToast(`${s.name} is open`);
      if (!m) {
        m = new THREE.Mesh(this.siteGeometryFor(s.kind, s.level), siteMaterial);
        m.castShadow = true;
        m.receiveShadow = true;
        m.matrixAutoUpdate = false;
        this.scene.add(m);
        this.siteMeshes.set(s.id, m);
      }
      // An upgraded building gets its bigger model.
      const geo = this.siteGeometryFor(s.kind, s.level);
      if (m.geometry !== geo) m.geometry = geo;
      this.syncSiteAnims(s.id, s.kind, s.level, m);
      // Buildings in a town face the street they front.
      let yaw = 0;
      const plot = plotAt(this.world, s.x, s.y);
      const def = SITE_DEFS[s.kind];
      if (s.rot !== undefined && !def.port && !def.station) {
        // The player turned it while placing it.
        yaw = (s.rot * Math.PI) / 2;
      } else if (plot) {
        const face = plotFacing(this.world, plot.place, plot.index);
        yaw = face === 'N' ? Math.PI : face === 'W' ? -Math.PI / 2 : face === 'E' ? Math.PI / 2 : 0;
      } else if (SITE_DEFS[s.kind].port) {
        // A port turns its quay to the water beside it.
        const wet = ([[0, 1, 0], [0, -1, Math.PI], [1, 0, Math.PI / 2], [-1, 0, -Math.PI / 2]] as const).find(([dx, dy]) => terrainAt(this.world, wrapX(this.world, s.x + dx), s.y + dy) === 'water');
        if (wet) yaw = wet[2];
      } else if (SITE_DEFS[s.kind].station && this.stationStreetSide(s) !== null) {
        // A rail station fronts the town street beside it, not the track that comes in behind.
        yaw = this.stationStreetSide(s)!;
      } else {
        // Outside a town, turn the front to face the road that serves the site (roads win over rail).
        const rt = this.world.routes.filter((r) => r.fromSiteId === s.id || r.toSiteId === s.id).filter((r) => r.mode !== 'air' && r.mode !== 'sea').sort((p, q) => (p.mode === 'road' ? 0 : 1) - (q.mode === 'road' ? 0 : 1))[0];
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
      m.matrix.copy(this.tileMatrix(siteCenter(this.world, s))).multiply(new THREE.Matrix4().makeRotationY(yaw));
      m.userData.base = m.matrix.clone();
      m.matrixWorldNeedsUpdate = true;
    }
    for (const id of [...this.siteLevels.keys()]) if (!live.has(id)) this.siteLevels.delete(id);
    for (const id of [...this.siteAnims.keys()]) if (!live.has(id)) this.siteAnims.delete(id);
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
      const wanted = [...layout.homes, ...layout.civic.filter((c, i) => !c.campus && !taken.has(i))].filter((h) => h.level <= p.level);
      const clear = (x: number, y: number): boolean => landOk(p.x + x, p.y + y) && !routeAt(w, p.x + x, p.y + y) && !siteAt(w, p.x + x, p.y + y);
      // A home whose ground a road or building has taken is not lost: it shifts to the nearest free tile on a street.
      const used = new Set<string>([...wanted, ...layout.plots, ...layout.streets, ...layout.civic].map((t) => `${t.x},${t.y}`));
      const onStreet = new Set(streets.map((s) => `${s.x},${s.y}`));
      const fronts = (x: number, y: number): boolean => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => onStreet.has(`${x + a},${y + b}`));
      const homes = wanted.map((h) => {
        if (clear(h.x, h.y)) return { x: h.x, y: h.y, ok: true };
        let best: { x: number; y: number } | null = null;
        let bd = Infinity;
        for (let dy = -4; dy <= 4; dy++) {
          for (let dx = -4; dx <= 4; dx++) {
            const x = h.x + dx;
            const y = h.y + dy;
            const d = dx * dx + dy * dy;
            if (d >= bd || used.has(`${x},${y}`) || !clear(x, y) || !fronts(x, y)) continue;
            best = { x, y };
            bd = d;
          }
        }
        if (!best) return { x: h.x, y: h.y, ok: false };
        used.add(`${best.x},${best.y}`);
        return { ...best, ok: true };
      });
      const districts = Object.entries(p.districts ?? {})
        .filter(([id, lv]) => (lv ?? 0) > 0 && p.districtLots?.[id as DistrictId] !== undefined)
        .map(([id, level]) => {
          const lot = layout.civic[p.districtLots![id as DistrictId]!];
          // What the lot sits among: hills, shore, woods or open ground.
          let rock = 0;
          let wet = 0;
          let wood = 0;
          const e0 = elevAt(w, wrapX(w, p.x + lot.x), p.y + lot.y);
          for (let dy = -3; dy <= 3; dy++) {
            for (let dx = -3; dx <= 3; dx++) {
              const tx = wrapX(w, p.x + lot.x + dx);
              const ty = p.y + lot.y + dy;
              const ter = terrainAt(w, tx, ty);
              if (ter === 'water') wet += 1;
              else if (ter === 'forest') wood += 1;
              if (ter === 'mountain' || (ter && elevAt(w, tx, ty) - e0 > 22)) rock += 1;
            }
          }
          const setting: Setting = rock >= 7 ? 'rock' : wet >= 6 ? 'water' : wood >= 10 ? 'forest' : 'plain';
          return { id: id as DistrictId, level: level as number, x: lot.x, y: lot.y, ex: lot.entry.x, ey: lot.entry.y, setting, campus: !!lot.campus };
        });
      const bits = (list: boolean[]): string => list.map((o) => (o ? 1 : 0)).join('');
      const sig = `${streets.length}.${p.level}.${p.path ?? ''}.${bits(plots.map((t) => t.occupied))}.${bits(plots.map((t) => t.home))}.${homes.map((h) => (h.ok ? `${h.x}_${h.y}` : "x")).join("")}.${districts.map((d) => `${d.id}${d.level}`).join(',')}`;
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
      const squeeze = THREE.MathUtils.clamp(Math.cos(lat), w.realisticLots ? 0.15 : 0.55, 1);
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
      if (!grew) this.scenery.clearTiles(townGround(w, p).map((t) => t.y * w.width + wrapX(w, t.x)));
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
    this.watch(wrapX(this.world, p.x + first.tx), p.y + first.ty, 15, BUILD_MS);
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
    // The trees and bushes on ground the town is growing over come down as the wave reaches them.
    const fell: { tile: number; d: number }[] = [];
    if (withRoads) {
      const before = new Set(townGround(w, p, p.level - 1).map((t) => t.y * w.width + wrapX(w, t.x)));
      for (const t of townGround(w, p)) {
        const k = t.y * w.width + wrapX(w, t.x);
        if (before.has(k)) continue;
        const dx = ((t.x - p.x + w.width * 1.5) % w.width) - w.width / 2;
        fell.push({ tile: k, d: Math.hypot(dx, t.y - p.y) * TILE_UNITS });
      }
    } else this.scenery.clearTiles(townGround(w, p).map((t) => t.y * w.width + wrapX(w, t.x)));
    this.growing.set(p.id, { start: this.nowMs, old, mesh, reach: reach + 3, fell });
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
    // Every building in the town goes up behind scaffolding with the town.
    if (withRoads) {
      for (const st of this.world.sites) {
        if (SITE_DEFS[st.kind].dock === 'civic' || SITE_DEFS[st.kind].station || placeAt(this.world, st.x, st.y)?.id !== p.id) continue;
        const geo = this.siteGeometryFor(st.kind, st.level);
        this.construction?.start(st.id, this.nowMs, '', geo, geo);
      }
    }
    // Only a town or city growing hands the player a way back to where they were working.
    this.watch(p.x, p.y, radiusOf(p) > 3 ? 46 : 34, GROW_MS, withRoads);
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
      if (g.fell.length > 0) {
        const down = g.fell.filter((f) => f.d <= wave + 2);
        if (down.length > 0) {
          this.scenery.clearTiles(down.map((f) => f.tile));
          g.fell = g.fell.filter((f) => f.d > wave + 2);
        }
      }
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
    if (g.fell.length > 0) this.scenery.clearTiles(g.fell.map((f) => f.tile));
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
    const seaMat = new THREE.LineBasicMaterial({ color: 0xbfe6ff, transparent: true, opacity: 0.6 });
    const canalMat = new THREE.LineBasicMaterial({ color: 0x4fc3ff, transparent: true, opacity: 0.95 });
    for (const r of this.world.routes) {
      if (r.mode === 'sea') {
        const lane: THREE.Vector3[] = [];
        for (let f = 0; f <= r.path.length - 1 + 1e-6; f += 0.5) {
          const pt = this.roads.pointOnPath(r.path, Math.min(r.path.length - 1, f), 1, 0);
          lane.push(pt.pos.clone().addScaledVector(pt.up, 0.18));
        }
        for (let pass = 0; pass < 3; pass++) {
          const prev = lane.map((q) => q.clone());
          for (let i = 1; i < lane.length - 1; i++) lane[i].copy(prev[i - 1]).add(prev[i]).add(prev[i + 1]).divideScalar(3);
        }
        this.airGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(lane), r.canal ? canalMat : seaMat));
        continue;
      }
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
      // Pull up at the door. Rail stops are fitted to the full consist below.
      const stop = Math.min(0.5, last / 2);
      const dir: 1 | -1 = v.state === 'moving' ? v.dir : v.idx === 0 ? 1 : -1;
      if (route.mode !== 'rail') f = Math.max(stop, Math.min(last - stop, f));
      const pt = (route.mode === 'rail' ? this.rails : this.roads).pointOnPath(route.path, f, dir, route.mode === 'road' ? undefined : 0);
      const air = route.mode === 'air';
      const sea = route.mode === 'sea';
      if (air) pt.pos.addScaledVector(pt.up, this.airAlt(f, last));
      // Ships ride the swell a little.
      if (sea) pt.pos.addScaledVector(pt.up, 0.05 * Math.sin(this.nowMs / 650 + v.id));
      m.visible = !pt.hidden;
      const sc = air ? 2.1 : sea ? 1.7 : 1;
      const units = m.userData.units as { z: number; len: number }[] | null;
      if (units && route.mode === 'rail') {
        // Each unit sits where its own centre falls along the track and points along the chord between its ends, so
        // a train bends round a corner one unit at a time.
        const cars = m.userData.cars as THREE.Mesh[];
        const track = this.rails.trackDistance(route.path);
        const front = units[0].z + units[0].len / 2;
        const rear = units[units.length - 1].z - units[units.length - 1].len / 2;
        const low = dir === 1 ? -rear : front;
        const high = track.length - (dir === 1 ? front : -rear);
        const distance = low <= high
          ? Math.max(low, Math.min(high, track.distance(f)))
          : track.length / 2 - dir * (front + rear) / 2;
        const scale = new THREE.Matrix4().makeScale(sc, sc, sc);
        units.forEach((u, i) => {
          const unit = i === 0 ? m : cars[i - 1];
          const centre = distance + dir * u.z;
          const half = i === 0 ? 0.3 : 0.26;
          const a = track.point(centre + dir * half, dir);
          const b = track.point(centre - dir * half, dir);
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
        const body = basisMatrix(pt.pos, pt.up, pt.forward);
        if (air) {
          // A plane noses up as it climbs and down as it lands, and leans into its turns.
          const f1 = Math.max(0, Math.min(last, f + 0.35 * dir));
          const pitch = Math.atan2(this.airAlt(f1, last) - this.airAlt(f, last), 0.35 * 3.27);
          const next = this.roads.pointOnPath(route.path, Math.max(0, Math.min(last, f + 0.7 * dir)), dir, 0);
          const turn = new THREE.Vector3().crossVectors(pt.forward, next.forward).dot(pt.up);
          body.multiply(new THREE.Matrix4().makeRotationX(-Math.max(-0.5, Math.min(0.5, pitch * 1.6)))).multiply(new THREE.Matrix4().makeRotationZ(-Math.max(-0.45, Math.min(0.45, turn * 5))));
        } else if (sea) {
          // A ship pitches and rolls a little on the swell.
          body.multiply(new THREE.Matrix4().makeRotationX(0.025 * Math.sin(this.nowMs / 900 + v.id))).multiply(new THREE.Matrix4().makeRotationZ(0.04 * Math.sin(this.nowMs / 700 + v.id * 2)));
        }
        m.matrix.copy(body).multiply(new THREE.Matrix4().makeScale(sc, sc, sc));
        m.matrixWorldNeedsUpdate = true;
      }
      // A train under way trails smoke from its engine.
      if (route.mode === 'rail' && v.state === 'moving' && m.visible) this.popDust.set(-3e6 - v.id, { pos: new THREE.Vector3(0, 0.48, 0.3).applyMatrix4(m.matrix), up: new THREE.Vector3().setFromMatrixColumn(m.matrix, 1).normalize(), every: 0.28 });
      const cargo = this.cargoMeshes.get(v.id);
      if (cargo) {
        cargo.visible = v.cargo > 0 && vd.mode !== 'air' && vd.mode !== 'sea';
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
    const dusk = this.lightingMode === 'dusk';
    const night = this.lightingMode === 'night';
    nightLight.value = night ? 1 : dusk ? 0.6 : 0;
    const local = n.clone().multiplyScalar(dusk ? 0.22 : 0.65).addScaledVector(east, -0.65).addScaledVector(north, 0.28).normalize();
    const world = new THREE.Vector3(0.55, 0.3, 0.78).normalize();
    const k = R / 100;
    const t = THREE.MathUtils.smoothstep(dist, 170 * k, 360 * k);
    const dir = local.lerp(world, t).normalize();
    this.sun.position.copy(F).addScaledVector(dir, 300);
    this.sun.target.position.copy(F);
    this.sun.intensity = night ? 0.16 : dusk ? 1.3 : 2.6;
    this.sun.color.set(night ? 0x9cb8df : dusk ? 0xffb576 : 0xffe8c2);
    this.scene.environmentIntensity = night ? 0.05 : dusk ? 0.18 : 0.28;
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
    if (night || dusk) {
      this.scene.background = new THREE.Color(night ? 0x080f1e : 0x61545a);
    } else if (close > 0.3) {
      this.scene.background = this.skyTexture;
      this.scene.backgroundIntensity = Math.min(1, close * 1.1);
    } else {
      this.scene.background = new THREE.Color(0x03060b).lerp(new THREE.Color(0x4f7bb3), close / 0.3);
      this.scene.backgroundIntensity = 1;
    }
    if (dist < 230) {
      const fog = this.scene.fog as THREE.Fog | null;
      const color = new THREE.Color(night ? 0x101c30 : dusk ? 0xa18b7b : 0xc4d3e0);
      if (!fog) this.scene.fog = new THREE.Fog(color, 10, 400);
      const f = this.scene.fog as THREE.Fog;
      f.color.copy(color);
      f.near = dist * 0.9 + 25;
      f.far = dist * 3.4 + 220;
    } else {
      this.scene.fog = null;
    }
    if (this.globe) (this.globe.stars.material as THREE.PointsMaterial).opacity = night ? 0.75 : THREE.MathUtils.smoothstep(dist, 120 * k, 300 * k) * 0.9;
    this.hemi.intensity = night ? 0.18 : dusk ? 0.55 : 0.85 + 0.3 * t;
    if (nightLight.value === 0) {
      for (const light of this.localLights) light.intensity = 0;
      this.nextLights = 0;
    } else if (this.nowMs >= this.nextLights) {
      this.nextLights = this.nowMs + 500;
      const nearby: { position: THREE.Vector3; light: LightAnchor; distance: number }[] = [];
      for (const [id, town] of this.townMeshes) {
        if (this.growing.has(id)) continue;
        const anchors: LightAnchor[] = town.mesh.geometry.userData.lights ?? [];
        for (const light of anchors) {
          const position = new THREE.Vector3(light.x, light.y, light.z).applyMatrix4(town.mesh.matrix);
          const distance = position.distanceToSquared(F);
          if (distance < 1600) nearby.push({ position, light, distance });
        }
      }
      nearby.sort((a, b) => a.distance - b.distance);
      this.localLights.forEach((light, i) => {
        const source = nearby[i];
        light.intensity = source ? source.light.power * nightLight.value : 0;
        if (source) {
          light.position.copy(source.position);
          light.distance = source.light.range;
        }
      });
    }
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
    if (this.isBuildTool()) info.error = placeError(w, this.tool as SiteKind, tile.x, tile.y, this.placeRot ?? undefined);
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
    if (tool !== 'air' && tool !== 'sea') this.airFrom = null;
    this.tool = tool;
    this.pending = null;
    this.draft = null;
    this.committed = null;
    this.draftHistory = [];
    this.draftPlan = null;
    this.updateDraftMesh();
    this.signature += '!'; // refresh node markers on the next frame
    this.ghostKind = null;
    this.placeRot = null;
    if (this.ghost) this.ghost.visible = false;
    if (this.hover) this.setHover(this.hover.tile);
  }

  /** Which way the building being placed will face, as the player turned it; null lets the game pick. */
  private placeRot: Rot | null = null;

  /** Turn the building being placed a quarter turn clockwise (as seen from above, north up). */
  rotatePlacement(): void {
    if (!this.isBuildTool()) return;
    const kind = this.tool as SiteKind;
    const from = this.placeRot ?? (siteReach(kind) && this.hover ? (airportRot(this.world, this.hover.tile.x, this.hover.tile.y) ?? 0) : 0);
    // South, west, north, east: clockwise seen from above.
    this.placeRot = ((from + 3) % 4) as Rot;
    if (this.hover) this.setHover(this.hover.tile);
  }

  /** The facing the ghost shows and placing will use, for a building on this tile. */
  private ghostRot(kind: SiteKind, tile: Tile): Rot {
    if (this.placeRot !== null) return this.placeRot;
    return siteReach(kind) ? (airportRot(this.world, tile.x, tile.y) ?? 0) : 0;
  }

  select(sel: Selection): void {
    this.selection = sel;
    const site = sel?.kind === 'site' ? siteById(this.world, sel.id) : undefined;
    const tile = sel ? (site ? siteCenter(this.world, site) : this.world.places.find((p) => p.id === sel.id)) : null;
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
    return this.tool !== 'select' && !this.isRouteTool() && this.tool !== 'air' && this.tool !== 'sea' && this.tool !== 'demolish';
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

  // ---- valid spots: while placing a rail yard, airport or port, every tile it can go on is lit green ----

  private spotMesh: THREE.InstancedMesh | null = null;
  private spotBuilt = '';
  private spotSig = '';
  private spotScan: { next: number; found: Tile[] } | null = null;

  private updateSpots(): void {
    const t = this.tool;
    const want = t === 'railyard' || t === 'airport' || t === 'port' ? t : null;
    if (!want) {
      if (this.spotMesh) this.spotMesh.visible = false;
      this.spotScan = null;
      this.spotSig = '';
      return;
    }
    const w = this.world;
    const sig = `${want}:${w.sites.length}:${w.routes.length}:${w.tier}:${w.places.map((p) => p.level).join('')}`;
    if (sig !== this.spotSig) {
      this.spotSig = sig;
      this.spotScan = { next: 0, found: [] };
    }
    const scan = this.spotScan;
    if (scan) {
      // A slice of the map each frame (a few milliseconds' worth), so the game never stalls while it looks.
      const total = w.width * w.height;
      const start = performance.now();
      let i = scan.next;
      for (; i < total; i++) {
        if ((i & 63) === 0 && performance.now() - start > 4) break;
        const x = i % w.width;
        const y = Math.floor(i / w.width);
        const ter = w.terrain[i];
        if (ter === 'water' || ter === 'ice' || ter === 'mountain') continue;
        const err = placeError(w, want, x, y);
        if (err === null || err.startsWith('Need $')) scan.found.push({ x, y });
      }
      const end = i;
      scan.next = end;
      if (end >= total) {
        // Each town's kept airport ground shows gold, all nine tiles of it.
        const kept: Tile[] = [];
        if (want === 'airport') {
          for (const p of w.places) {
            const pad = airportPad(w, p);
            if (pad) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) kept.push({ x: wrapX(w, pad.x + dx), y: pad.y + dy });
          }
        }
        const gold = new Set(kept.map((k) => k.y * w.width + k.x));
        this.buildSpotMesh(scan.found.filter((k) => !gold.has(k.y * w.width + k.x)), kept);
        this.spotBuilt = sig;
        this.spotScan = null;
      }
    }
    if (this.spotMesh) this.spotMesh.visible = this.spotBuilt.startsWith(`${want}:`);
  }

  private buildSpotMesh(tiles: Tile[], kept: Tile[] = []): void {
    if (this.spotMesh) {
      this.scene.remove(this.spotMesh);
      this.spotMesh.geometry.dispose();
      this.spotMesh.dispose();
      this.spotMesh = null;
    }
    const all = [...tiles, ...kept];
    if (all.length === 0) return;
    const geo = new THREE.PlaneGeometry(2.9, 2.9);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.38, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
    const mesh = new THREE.InstancedMesh(geo, mat, all.length);
    const green = new THREE.Color(0x5be58c);
    const gold = new THREE.Color(0xffc94a);
    all.forEach((tile, i) => {
      mesh.setMatrixAt(i, this.tileMatrix(tile, 0.1));
      mesh.setColorAt(i, i < tiles.length ? green : gold);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.frustumCulled = false;
    mesh.renderOrder = 6;
    this.scene.add(mesh);
    this.spotMesh = mesh;
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
    this.ghost.matrix.copy(this.tileMatrix(tile, 0.02)).multiply(new THREE.Matrix4().makeRotationY((this.ghostRot(kind, tile) * Math.PI) / 2));
    this.ghost.matrixWorldNeedsUpdate = true;
    this.ghost.visible = true;
  }

  pointerDown(x: number, y: number, button: number): void {
    this.orbitUntil = 0;
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
    if (this.tool === 'sea') {
      const site = siteAt(w, tile.x, tile.y);
      if (!site || !SITE_DEFS[site.kind].port) {
        this.onToast('Click a port');
        return;
      }
      if (this.airFrom === null || this.airFrom === site.id) {
        this.airFrom = this.airFrom === site.id ? null : site.id;
        if (this.airFrom !== null) this.onToast('Now click the port to sail to');
        return;
      }
      const err = createSeaRoute(w, this.airFrom, site.id);
      this.onToast(err ?? (w.routes[w.routes.length - 1].canal ? 'Canal dug and sea route opened. Buy a barge or cargo boat at either port' : 'Sea route opened. Buy a barge or cargo boat at either port'));
      if (!err) this.airFrom = null;
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
      const what = route.mode === 'rail' ? 'track' : route.grade === 'highway' ? 'highway' : route.mode === 'road' ? 'road' : 'line';
      this.removal = {
        title: `Remove this stretch of ${what}?`,
        detail: `Vehicles using it will have to find another way. You get $${refund.toLocaleString('en-US')} back.`,
        verb: 'Remove',
        run: () => {
          const err = removeRoute(w, route.id);
          this.showRemoval(undefined);
          this.onToast(err ?? `Removed for $${refund.toLocaleString('en-US')} back`);
        },
      };
      return;
    }
    // A plot for sale is bought with a click; the next click builds on it.
    const landMsg = placeError(w, this.tool as SiteKind, tile.x, tile.y, this.placeRot ?? undefined);
    if (landMsg?.startsWith(LAND_PREFIX)) {
      const plot = parcelAt(w, tile.x, tile.y);
      const price = plot ? parcelPrice(plot) : 0;
      const bought = plot ? buyParcel(w, plot.id) : 'No plot here';
      this.onToast(bought ?? `Plot bought for ${price.toLocaleString('en-US')}. Click again to build`);
      if (!bought) this.setHover(tile);
      return;
    }
    const err = placeSite(w, this.tool as SiteKind, tile.x, tile.y, this.placeRot ?? undefined);
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
    if (!plan.error && !(grade === 'highway' && plan.cost > 0) && !path.some((t) => !onNetwork(this.world, t.x, t.y, this.routeMode))) {
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
  /**
   * With the rail tool, pointing at a town's Market or Supply Yard means its Rail Station; with any route tool, pointing
   * anywhere on an airport means its gate, where roads join it.
   */
  private railTarget(t: Tile): Tile {
    const here = siteAt(this.world, t.x, t.y);
    if (here && siteReach(here.kind) && this.isRouteTool()) return { x: here.x, y: here.y };
    if (this.tool !== 'rail') return t;
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

  /** Ask first: the pop-up runs the demolish once the player confirms. */
  demolish(siteId: number): void {
    const s = siteById(this.world, siteId);
    if (!s) return;
    const n = this.world.vehicles.filter((v) => v.homeId === siteId).length;
    this.removal = {
      title: `Demolish ${s.name}?`,
      detail: `The roads that join it go too${n ? `, and its ${n} vehicle${n === 1 ? ' is' : 's are'} sold` : ''}. You get $${demolishRefund(s).toLocaleString('en-US')} back.`,
      verb: 'Demolish',
      run: () => this.demolishNow(siteId),
    };
  }

  private demolishNow(siteId: number): void {
    const name = siteById(this.world, siteId)?.name ?? 'Building';
    const err = demolishSite(this.world, siteId);
    if (!err && this.selection?.kind === 'site' && this.selection.id === siteId) this.select(null);
    this.onToast(err ?? `${name} demolished`);
    this.signature += '#';
  }


  upgrade(siteId: number): void {
    const err = upgradeSite(this.world, siteId);
    const s = siteById(this.world, siteId);
    this.onToast(err ?? (s ? `${s.name} is now level ${s.level}` : 'Upgraded'));
  }

  togglePull(siteId: number, good: Good, on: boolean): void {
    setHubPull(this.world, siteId, good, on);
  }

  buy(siteId: number, kind: VehicleKind, line: Line = 'main'): void {
    const err = buyVehicle(this.world, siteId, kind, line);
    const site = siteById(this.world, siteId);
    this.onToast(err ?? `${vehicleLabel(kind, site ? bodyForLine(site, line) : 'box')} bought`);
  }

  autoBuy(siteId: number, on: boolean): void {
    setAutoBuy(this.world, siteId, on);
    this.onToast(on ? 'Auto-buy on: it will ask before buying' : 'Auto-buy off');
  }

  answerOffer(offer: TruckOffer, yes: boolean): void {
    if (!yes) return declineOffer(this.world, offer);
    const site = siteById(this.world, offer.siteId);
    const err = acceptOffer(this.world, offer);
    this.onToast(err ?? `${vehicleLabel(offer.kind, site ? bodyForLine(site, offer.line) : 'box')} bought`);
  }

  duplicateVeh(id: number): void {
    const err = duplicateVehicle(this.world, id);
    this.onToast(err ?? 'Bought another just like it');
  }

  upgradeVeh(id: number): void {
    // Quiet on success: the card in the menu simply shows the bigger vehicle. Only a problem is announced.
    const err = upgradeVehicle(this.world, id);
    if (err) this.onToast(err);
  }

  sellVeh(id: number): void {
    const err = sellVehicle(this.world, id);
    this.onToast(err ?? 'Vehicle sold');
  }

  sendTo(siteId: number, destId: number, on: boolean, line: Line = 'main'): void {
    setSendTo(this.world, siteId, destId, on, line);
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

  vehiclePick(id: number, pick: PickMode): void {
    setVehiclePick(this.world, id, pick);
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
    for (const kind of BUILD_ORDER) shoot(kind, SITE_DEFS[kind].produce ? siteGeometryAt(kind, 1) : siteGeometry(kind), 0);
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
  private cine: { shots: Shot[]; starts: number[]; film: number; total: number; t: number; events: { at: number; run: () => void; done: boolean }[]; later: number; cues: Cue[]; uis: Ui[]; cutAt: number[] } | null = null;

  /** Whether there is an autosave to continue from. */
  hasSave(): boolean {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      return !!raw && (JSON.parse(raw) as World).version === 4;
    } catch {
      return false;
    }
  }

  /** Ships, boats, the vehicle showroom and the conspiracies, for the opening only. */
  private props: OpeningProps | null = null;
  /** The middle of the nearest open water to the harbour, where the ships sail. */
  private seaMid: Tile | null = null;

  /** Straight stretches of open water near a spot, nearest first, each in its own row. */
  private waterRuns(c: Tile, reach: number, want: number): Tile[][] {
    const w = this.world;
    const wet = (x: number, y: number): boolean => terrainAt(w, wrapX(w, x), y) === 'water';
    const found: { tiles: Tile[]; d: number }[] = [];
    for (let dy = -reach; dy <= reach; dy++) {
      const y = c.y + dy;
      if (y < 2 || y >= w.height - 2) continue;
      let x = -reach * 2;
      while (x <= reach * 2) {
        if (wet(c.x + x, y) && wet(c.x + x, y - 1) && wet(c.x + x, y + 1)) {
          let len = 0;
          while (x + len <= reach * 2 && wet(c.x + x + len, y) && wet(c.x + x + len, y - 1) && wet(c.x + x + len, y + 1)) len++;
          if (len >= 12) {
            const mid = x + len / 2;
            const half = Math.min(len, 26) / 2;
            const tiles: Tile[] = [];
            for (let k = 0; k < half * 2; k++) tiles.push({ x: wrapX(w, Math.round(c.x + mid - half + k)), y });
            found.push({ tiles, d: Math.hypot(mid, dy) });
          }
          x += len;
        } else x++;
      }
    }
    found.sort((a, b) => a.d - b.d);
    const out: Tile[][] = [];
    for (const f of found) {
      if (out.every((o) => Math.abs(o[0].y - f.tiles[0].y) >= 3)) out.push(f.tiles);
      if (out.length >= want) break;
    }
    return out;
  }

  /** An open patch of grass near a tile: no building, road, town, resource or shore within a tile, and clear of anything already placed. */
  private freeSpot(near: Tile, rmin: number, rmax: number, taken: Tile[], clear = 1): Tile | null {
    const w = this.world;
    for (let r = rmin; r <= rmax; r++) {
      for (let k = 0; k < 20; k++) {
        const a = (k / 20) * Math.PI * 2 + r * 1.3;
        const x = wrapX(w, Math.round(near.x + Math.cos(a) * r));
        const y = Math.round(near.y + Math.sin(a) * r * 0.8);
        let ok = true;
        for (let dy = -clear; dy <= clear && ok; dy++) {
          for (let dx = -clear; dx <= clear && ok; dx++) {
            const tx = wrapX(w, x + dx);
            const ty = y + dy;
            if (terrainAt(w, tx, ty) !== 'grass' || siteAt(w, tx, ty) || routeAt(w, tx, ty) || placeAt(w, tx, ty) || nodeAt(w, tx, ty)) ok = false;
          }
        }
        if (!ok || taken.some((t) => Math.hypot(wrapDx(w, t.x, x), t.y - y) < 3)) continue;
        taken.push({ x, y });
        return { x, y };
      }
    }
    return null;
  }

  /** The vehicles shown on the showroom turntable, in the order of the ladder. */
  private static readonly SHOWROOM: VehicleKind[] = ['boxtruck', 'bigtruck', 'rig', 'convoy', 'train', 'heavytrain', 'plane', 'jet', 'barge', 'boat', 'freighter', 'containership'];

  /**
   * Set out the ships, the showroom and the conspiracies. `film` is where the vehicle showroom shot starts, in seconds, so the
   * turntable can show each vehicle in turn; `monsterAt` is when the lake monster should be up.
   */
  private buildOpeningProps(F: Tile, harbour: Tile, farm: Tile, showroom: { tile: Tile | null; start: number; each: number }, monsterAt: number, reserved: Tile[]): void {
    this.props?.dispose();
    const w = this.world;
    const props = new OpeningProps(this.scene, siteMaterial, (path, f) => {
      const p = this.roads.pointOnPath(path, f, 1, 0);
      return { pos: p.pos, up: p.up, forward: p.forward };
    });
    this.props = props;
    const taken: Tile[] = [...reserved];
    const runs = this.waterRuns(harbour, 26, 5);
    this.seaMid = runs[0] ? runs[0][Math.floor(runs[0].length / 2)] : null;
    const geos = [cargoShipGeometry(), tankerGeometry(), tugGeometry(), sailboatGeometry()];
    const specs: { g: number; scale: number; speed: number; phase: number }[] = [
      { g: 0, scale: 2.7, speed: 0.4, phase: 3 },
      { g: 1, scale: 2.5, speed: 0.32, phase: 9 },
      { g: 2, scale: 2.2, speed: 0.55, phase: 1 },
      { g: 3, scale: 2.1, speed: 0.45, phase: 6 },
    ];
    specs.forEach((s, i) => {
      const run = runs[i % Math.max(1, runs.length)];
      if (run) props.addMover(geos[s.g], run, s.speed, s.scale, { phase: s.phase, bob: 0.05 });
    });
    if (runs[0]) {
      // The monster in a quiet corner of the same water, up for a look at the time the film wants it, and a duck as big as a house.
      const run = runs[Math.min(runs.length - 1, 4)] ?? runs[0];
      props.addMover(monsterGeometry(), run.slice(0, 14), 0.08, 2.4, { dive: 26, bob: 0.03, divePhase: 6.5 - monsterAt });
      const wide = runs[1] ?? runs[0];
      props.addMover(duckGeometry(), wide.slice(Math.max(0, wide.length - 6)), 0.05, 2.0, { bob: 0.06, phase: 2 });
    }
    // A hot air balloon drifting over the first town.
    const drift: Tile[] = [];
    for (let k = 0; k <= 30; k++) drift.push({ x: wrapX(w, Math.round(F.x - 16 + k)), y: Math.round(F.y - 12 + k * 0.5) });
    props.addMover(balloonGeometry(), drift, 0.12, 2.6, { alt: 9, bob: 0.2, phase: 4 });
    // A flying saucer over a crop circle at the farm, with a cow on its beam.
    const cropAt = this.freeSpot(farm, 4, 8, taken) ?? { x: farm.x + 4, y: farm.y + 3 };
    props.addStatic(cropCircleGeometry(), cropAt, 0.3, 1.0);
    const spot = { x: cropAt.x, y: cropAt.y };
    const hover: Tile[] = [spot, { x: spot.x, y: spot.y + 1 }];
    const beamMat = new THREE.MeshBasicMaterial({ color: 0xbff7ff, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide });
    const beam = new THREE.ConeGeometry(1.5, 9, 20, 1, true);
    beam.translate(0, -4.5, 0);
    const ufo = props.addCustom(ufoGeometry(), null, () => {});
    const beamMesh = props.addCustom(beam, beamMat, () => {});
    const cow = props.addCustom(cowGeometry(), null, () => {});
    props.addCustom(null, null, (t) => {
      const p = this.roads.pointOnPath(hover, 0, 1, 0);
      const alt = 11 + 0.5 * Math.sin(t * 0.8);
      const pos = p.pos.clone().addScaledVector(p.up, alt);
      const base = basisMatrix(pos, p.up, p.forward);
      ufo.matrix.copy(base).multiply(new THREE.Matrix4().makeRotationY(t * 0.6)).multiply(new THREE.Matrix4().makeScale(2.6, 2.6, 2.6));
      beamMesh.matrix.copy(base).multiply(new THREE.Matrix4().makeScale(1.3, alt / 9, 1.3));
      // The cow rides up the beam, slowly turning, and is let down again now and then.
      const rise = (t % 30) / 30;
      const h = alt * (rise < 0.8 ? rise / 0.8 : 1 - (rise - 0.8) / 0.2);
      const cp = p.pos.clone().addScaledVector(p.up, 0.2 + h * 0.92);
      cow.matrix.copy(basisMatrix(cp, p.up, p.forward)).multiply(new THREE.Matrix4().makeRotationY(t * 1.1)).multiply(new THREE.Matrix4().makeScale(2.6, 2.6, 2.6));
      for (const m of [ufo, beamMesh, cow]) m.matrixWorldNeedsUpdate = true;
    });
    // The vehicle showroom: a turntable, and each vehicle in turn.
    if (showroom.tile) {
      const tile = showroom.tile;
      props.addStatic(turntableGeometry(), tile, 0, 1.0);
      const shown = Game3D.SHOWROOM.map((k) => {
        const g = vehicleGeometry(k);
        g.computeBoundingSphere();
        return { g, k, scale: 2.1 / Math.max(0.4, g.boundingSphere!.radius) };
      });
      const stage = props.addCustom(null, null, (t, m) => {
        const i = Math.floor((t - showroom.start) / showroom.each);
        m.visible = i >= 0 && i < shown.length;
        if (!m.visible) return;
        const s = shown[i];
        if (m.geometry !== s.g) m.geometry = s.g;
        m.matrix.copy(props.placeMatrix(tile, (t - showroom.start) * 0.9 + i, s.scale, 0.2));
        m.matrixWorldNeedsUpdate = true;
      });
      stage.castShadow = true;
      stage.material = siteMaterial;
    }
    // The conspiracies, each where it makes the most sense.
    let hill: Tile | null = null;
    let hd = 99;
    for (let dy = -40; dy <= 40; dy++) {
      for (let dx = -60; dx <= 60; dx++) {
        const x = wrapX(w, F.x + dx);
        const y = F.y + dy;
        const d = Math.hypot(dx, dy);
        if (d > 12 && d < hd && terrainAt(w, x, y) === 'mountain') {
          hd = d;
          hill = { x, y };
        }
      }
    }
    const sp = demoSpots;
    placeEggs(props, {
      spot: (near, rmin, rmax) => this.freeSpot(near, rmin, rmax, taken),
      at: { town: F, airport: sp.airport, farm, forest: sp.forestry, hill: hill ?? undefined, dock: harbour },
    });
  }

  /** The opening: a long film of shots over the demo base, with a cue line for each stretch, cuts through black, and a finale. */
  startShowcase(): void {
    const w = this.world;
    const sp = demoSpots;
    const town = w.places[0];
    const big = w.places[1] ?? town;
    const city = w.places[3] ?? w.places[2] ?? town;
    const at = (s: { x: number; y: number } | undefined, fallback: { x: number; y: number }): Tile => ({ x: (s ?? fallback).x, y: (s ?? fallback).y });
    const F = at(town, { x: 0, y: 0 });
    const C = at(city, F);
    const farm = at(sp.farm, F);
    const yard = at(sp.yard, F);
    const ap = at(sp.airport, F);
    const stad = at(sp.stadium, big);
    const park = at(sp.ballpark, big);
    const arena = at(sp.arena, big);
    const amph = at(sp.bigAmphitheatre ?? sp.amphitheatre, F);
    const saw = at(sp.sawmill, F);
    const portT = at(sp.port, big);
    const dock = at(w.sites.find((q) => SITE_DEFS[q.kind].dock === 'freight' && q.placeId === big.id), big);

    const ease = (u: number): number => u * u * (3 - 2 * u);
    const lerp = (a: number, b: number, u: number): number => a + (b - a) * u;
    type V = { x: number; y: number; dist: number; h: number; p: number };
    const move = (a: V, b: V) => (u: number): V => {
      const e = ease(u);
      return { x: lerp(a.x, b.x, e), y: lerp(a.y, b.y, e), dist: Math.exp(lerp(Math.log(a.dist), Math.log(b.dist), e)), h: lerp(a.h, b.h, e), p: lerp(a.p, b.p, e) };
    };
    const orbit = (c: Tile, d0: number, d1: number, p0: number, p1: number, h0: number, h1: number) => (u: number): V => {
      const e = ease(u);
      return { x: c.x, y: c.y, dist: lerp(d0, d1, e), h: lerp(h0, h1, u), p: lerp(p0, p1, e) };
    };
    /** Keep on something that moves, easing toward it so the camera never jerks. */
    const follow = (get: () => Tile | null, fallback: Tile, d0: number, d1: number, p0: number, p1: number, h0: number, h1: number) => {
      let s: Tile | null = null;
      return (u: number, _t: number, dt: number): V => {
        const g = get() ?? fallback;
        if (!s) s = { x: g.x, y: g.y };
        else {
          const k = 1 - Math.exp(-dt * 2.2);
          s = { x: wrapX(w, s.x + wrapDx(w, s.x, g.x) * k), y: s.y + (g.y - s.y) * k };
        }
        return { x: s.x, y: s.y, dist: lerp(d0, d1, ease(u)), h: lerp(h0, h1, u), p: lerp(p0, p1, ease(u)) };
      };
    };
    /** A vehicle of one of these kinds, kept once picked, as a tile. */
    const tracker = (kinds: string[]): (() => Tile | null) => {
      let id = -1;
      return () => {
        let v = w.vehicles.find((q) => q.id === id);
        if (!v || !vehicleRoute(w, v)) {
          v = w.vehicles.find((q) => kinds.includes(q.kind) && vehicleRoute(w, q) !== undefined && q.state === 'moving');
          if (!v) return null;
          id = v.id;
        }
        const route = vehicleRoute(w, v);
        if (!route) return null;
        const i = Math.max(0, Math.min(route.path.length - 1, v.idx));
        const j = Math.max(0, Math.min(route.path.length - 1, v.idx + v.dir));
        const k = v.state === 'moving' ? Math.min(1, v.moveTimer / Math.max(1, routeTicks(route, VEHICLE_DEFS[v.kind].ticksPerTile))) : 0;
        const a = route.path[i];
        const b = route.path[j];
        return { x: wrapX(w, a.x + wrapDx(w, a.x, b.x) * k), y: lerp(a.y, b.y, k) };
      };
    };

    // The showroom stands on open ground near the first town.
    const probe: Tile[] = [];
    const roomTile = this.freeSpot(F, 8, 22, probe, 2) ?? this.freeSpot(F, 6, 34, probe, 1) ?? this.freeSpot(farm, 3, 16, probe, 1);

    // The shot list. Each has a length and a camera move; the cues, panels and events below are placed against it.
    const EACH = 2.4;
    const plan: { name: string; dur: number; view: Shot['view'] }[] = [
      { name: 'open', dur: 14, view: move({ x: F.x - 70, y: F.y - 30, dist: 330, h: -0.6, p: 0 }, { x: F.x - 20, y: F.y - 8, dist: 110, h: 0.1, p: 0.25 }) },
      { name: 'city', dur: 48, view: orbit(C, 15, 50, 0.3, -0.05, 0.3, 2.9) },
      { name: 'bldg', dur: 16, view: orbit(saw, 9, 7, 0.1, -0.1, 0.6, 2.0) },
      { name: 'farm', dur: 10, view: orbit(farm, 17, 12, 0.35, 0.5, 0.4, 1.7) },
      { name: 'room', dur: Game3D.SHOWROOM.length * EACH, view: roomTile ? orbit(roomTile, 9, 7, 0.1, 0.0, 0.4, 1.0) : orbit(F, 20, 20, 0.3, 0.3, 0, 1) },
      { name: 'trucks', dur: 12, view: follow(tracker(['rig', 'convoy', 'bigtruck']), F, 12, 9, 0.2, 0.3, 0.6, 1.3) },
      { name: 'rail', dur: 12, view: follow(tracker(['train', 'heavytrain']), yard, 16, 12, 0.25, 0.3, 2.2, 3.0) },
      { name: 'monster', dur: 8, view: follow(() => this.props?.tileOf(4) ?? null, dock, 20, 16, 0.2, 0.25, 0.5, 1.1) },
      { name: 'ship', dur: 10, view: follow(() => this.props?.tileOf(0) ?? null, dock, 24, 17, 0.2, 0.25, 1.2, 2.3) },
      { name: 'port', dur: 14, view: orbit(portT, 13, 9, 0.2, 0.1, 3.4, 4.8) },
      { name: 'air', dur: 16, view: orbit(ap, 24, 17, 0.3, 0.2, 0.2, 1.9) },
      { name: 'plane', dur: 12, view: follow(tracker(['plane', 'jet']), ap, 22, 28, 0.2, 0.3, 0.8, 1.6) },
      { name: 'football', dur: 7, view: orbit(stad, 12, 8, -0.1, -0.2, 2.4, 3.1) },
      { name: 'baseball', dur: 7, view: orbit(park, 10, 8, -0.1, -0.25, 0.4, 1.2) },
      { name: 'hockey', dur: 7, view: orbit(arena, 10, 8, -0.1, -0.2, 0.2, 0.9) },
      { name: 'amph', dur: 7, view: orbit(amph, 10, 8, 0.0, -0.1, 0.4, 1.4) },
      { name: 'finale', dur: 14, view: move({ x: C.x, y: C.y, dist: 24, h: 5.2, p: 0.35 }, { x: C.x - 10, y: C.y - 6, dist: 190, h: 6.6, p: 0.1 }) },
    ];
    const starts: number[] = [];
    let film = 0;
    for (const s of plan) {
      starts.push(film);
      film += s.dur;
    }
    const T = (name: string, off = 0): number => starts[plan.findIndex((q) => q.name === name)] + off;
    const D = (name: string): number => plan.find((q) => q.name === name)!.dur;

    this.buildOpeningProps(F, dock, farm, { tile: roomTile, start: T('room'), each: EACH }, T('monster', 3.5), probe);
    const sea = this.seaMid ?? dock;
    void sea;

    // Cues: what the lower-left caption says, and when.
    const cues: Cue[] = [];
    const cue = (at0: number, end: number, head: string, sub: string, flash = false): void => void cues.push({ at: at0, end, head, sub, flash });
    cue(2.5, 13.5, 'ONE WORLD', 'A hand-made globe of continents, islands and open sea.');
    const town5 = ['HAMLET', 'VILLAGE', 'TOWN', 'CITY', 'METROPOLIS'];
    const townSub = [
      'Every town starts small: a street and a few homes.',
      'Sell it goods and it grows. Each level wants more kinds of goods.',
      'Level 3 can choose a path: Breadbasket, The Forge, Trade Hub or The Boulevard.',
      'Level 4: hotels, resorts, ballparks and stadiums.',
      'Level 5: skyscrapers and the capstone districts.',
    ];
    const cityAt = [0.8, 8.8, 16.8, 32.6, 40.4];
    cityAt.forEach((o, i) => cue(T('city', o), T('city', i < 4 ? cityAt[i + 1] - 0.4 : 47.6), town5[i], townSub[i]));
    cue(T('city', 24.6), T('city', 32.2), 'DISTRICTS', 'Coffee houses, community centres, restaurants and more: each is a place to sell what you make.');
    cue(T('bldg', 0.8), T('bldg', 5.6), 'LEVEL 1', `A camp, mill or factory starts small: x${LEVEL_SPEED[0]} speed.`);
    cue(T('bldg', 5.8), T('bldg', 10.6), 'LEVEL 2', `Faster, and it holds more: x${LEVEL_SPEED[1]} speed.`);
    cue(T('bldg', 10.8), T('bldg', 15.6), 'LEVEL 3', `The most it can be: x${LEVEL_SPEED[2]} speed and four times the storage.`);
    cue(T('farm', 0.8), T('farm', 9.4), 'HARVEST', 'Camps, farms and quarries feed the chain. Something is going on in the wheat.');
    const road = ['boxtruck', 'bigtruck', 'rig', 'convoy'];
    Game3D.SHOWROOM.forEach((k, i) => {
      const d = VEHICLE_DEFS[k];
      const mode = d.mode === 'road' ? 'Road' : d.mode === 'rail' ? 'Rail' : d.mode === 'air' ? 'Air' : 'Sea';
      const next = d.next ? `  ·  trades up to ${VEHICLE_DEFS[d.next].label}` : `  ·  the top of the ${mode.toLowerCase()} ladder`;
      cue(T('room', i * EACH), T('room', (i + 1) * EACH - 0.05), d.label.toUpperCase(), `${mode}  ·  tier ${d.tier}  ·  carries ${d.capacity}${next}`, true);
    });
    void road;
    cue(T('trucks', 0.8), T('trucks', 11.4), 'CHOOSE WHO BUYS', 'Pick where each building sells. Roads join up on their own.');
    cue(T('rail', 0.8), T('rail', 11.4), 'RAIL', 'Freight trains run from yard to yard.');
    cue(T('monster', 0.8), T('monster', 7.6), 'THE DEEP', 'Something lives out there. Probably.');
    cue(T('ship', 0.8), T('ship', 9.4), 'SEA ROUTES', 'Islands grow coffee, mangoes and oil that grow nowhere else. Ships bring them home.');
    cue(T('port', 0.8), T('port', 4.6), 'PORT: LEVEL 1', 'A quay and a crane.');
    cue(T('port', 4.8), T('port', 9.0), 'PORT: LEVEL 2', 'More cranes, more sheds, more stacks.');
    cue(T('port', 9.2), T('port', 13.6), 'PORT: LEVEL 3', 'A container terminal.');
    cue(T('air', 0.8), T('air', 5.0), 'AIRSTRIP', 'An airport grows with the town it serves: first a strip and a small plane.');
    cue(T('air', 5.2), T('air', 10.0), 'REGIONAL FIELD', 'A town can have a regional field, with jets.');
    cue(T('air', 10.2), T('air', 15.6), 'INTERNATIONAL HUB', 'A city gets the lot: two runways, piers and a tower.');
    cue(T('plane', 0.8), T('plane', 11.4), 'TAKE OFF', 'Planes cross any terrain, ocean or mountain.');
    cue(T('football', 0.4), T('football', 6.8), 'FOOTBALL', 'A bowl round a field, with end zones and floodlights.');
    cue(T('baseball', 0.4), T('baseball', 6.8), 'BASEBALL', 'A true diamond, a curved wall and a grandstand.');
    cue(T('hockey', 0.4), T('hockey', 6.8), 'HOCKEY', 'An arena with the rink painted on the roof.');
    cue(T('amph', 0.4), T('amph', 6.8), 'AMPHITHEATRE', 'Built into the hills, on the water or in the woods, wherever the town stands.');
    cue(T('finale', 1.0), T('finale', 7.0), 'BUILD', 'Upgrade, specialise, and watch it all rise.');

    // Panels drawn over the film: the menus where you choose who buys, take a loan, and see what a town needs.
    const uis: Ui[] = [
      { at: T('trucks', 1.0), end: T('trucks', 11.6), kind: 'sell' },
      { at: T('ship', 0.8), end: T('ship', 9.8), kind: 'bank' },
      { at: T('city', 26.0), end: T('city', 38.0), kind: 'town' },
    ];

    const upgradeAny = (kind: string): void => {
      const site = w.sites.find((q) => q.kind === kind);
      if (site) upgradeSite(w, site.id);
    };
    const setLevel = (kind: string, n: number): void => {
      const site = w.sites.find((q) => q.kind === kind && (kind !== 'airport' || (q.x === ap.x && q.y === ap.y)));
      if (site) site.level = n;
    };
    const growAny = (): void => {
      const p = w.places.find((q) => q.level < 5 && q !== city) ?? w.places.find((q) => q.level < 5);
      if (p) p.level += 1;
    };
    const build = (p: (typeof w.places)[number] | undefined, id: DistrictId): void => {
      if (p) buildDistrict(w, p, id);
    };
    const events: { at: number; run: () => void; done: boolean }[] = [
      // A town from nothing: back to a hamlet at the cut, then a level and a few districts at a time.
      { at: T('city', -0.3), run: () => { city.level = 1; w.money = Math.max(w.money, 400000); }, done: false },
      { at: T('city', 8), run: () => { city.level = 2; }, done: false },
      { at: T('city', 16), run: () => { city.level = 3; }, done: false },
      { at: T('city', 18), run: () => build(city, 'cafe'), done: false },
      { at: T('city', 20), run: () => build(city, 'community'), done: false },
      { at: T('city', 22), run: () => build(city, 'restaurants'), done: false },
      { at: T('city', 24), run: () => build(city, 'amphitheatre'), done: false },
      { at: T('city', 26), run: () => build(city, 'resort'), done: false },
      { at: T('city', 32), run: () => { city.level = 4; }, done: false },
      { at: T('city', 34), run: () => build(city, 'hotels'), done: false },
      { at: T('city', 36), run: () => build(city, 'ballpark'), done: false },
      { at: T('city', 40), run: () => { city.level = 5; }, done: false },
      { at: T('city', 42), run: () => build(city, 'stadium'), done: false },
      { at: T('city', 44), run: () => build(city, 'arena'), done: false },
      // Buildings grow level by level.
      { at: T('bldg', -0.3), run: () => setLevel('sawmill', 1), done: false },
      { at: T('bldg', 5.6), run: () => setLevel('sawmill', 2), done: false },
      { at: T('bldg', 10.6), run: () => setLevel('sawmill', 3), done: false },
      { at: T('farm', 3), run: () => upgradeAny('farm'), done: false },
      { at: T('rail', 3), run: () => upgradeAny('railyard'), done: false },
      { at: T('port', -0.3), run: () => setLevel('port', 1), done: false },
      { at: T('port', 4.6), run: () => setLevel('port', 2), done: false },
      { at: T('port', 9.0), run: () => setLevel('port', 3), done: false },
      { at: T('air', -0.3), run: () => setLevel('airport', 1), done: false },
      { at: T('air', 5.0), run: () => setLevel('airport', 2), done: false },
      { at: T('air', 10.0), run: () => setLevel('airport', 3), done: false },
      { at: T('finale', 4), run: growAny, done: false },
    ];

    this.cine = {
      shots: plan.map((s) => ({ dur: s.dur, view: s.view })),
      starts,
      film,
      total: film + 7,
      t: 0,
      later: 0,
      events,
      cues,
      uis,
      cutAt: starts.slice(1),
    };
    this.showcase = true;
    this.speed = 1;
    void D;
    void amph;
    void growAny;
  }

  /** What the title layer needs to know: the film's clock, the caption and panel that belong to now, and how dark a cut is. */
  showcaseInfo(): { t: number; film: number; total: number; cue: { head: string; sub: string; at: number; end: number } | null; ui: { kind: Ui['kind']; u: number } | null; dip: number; flash: number } | null {
    const c = this.cine;
    if (!c) return null;
    const cue = c.cues.find((q) => c.t >= q.at && c.t < q.end) ?? null;
    const ui = c.uis.find((q) => c.t >= q.at && c.t < q.end);
    let dip = 0;
    for (const b of c.cutAt) dip = Math.max(dip, 1 - Math.abs(c.t - b) / 0.4);
    let flash = 0;
    for (const q of c.cues) if (q.flash && c.t >= q.at) flash = Math.max(flash, 1 - (c.t - q.at) / 0.22);
    return {
      t: c.t,
      film: c.film,
      total: c.total,
      cue: cue ? { head: cue.head, sub: cue.sub, at: cue.at, end: cue.end } : null,
      ui: ui ? { kind: ui.kind, u: (c.t - ui.at) / (ui.end - ui.at) } : null,
      dip: Math.max(0, dip),
      flash: Math.max(0, flash),
    };
  }

  /** Jump to the end of the film: the logo and the buttons. Everything that was due to happen on the way happens now. */
  skipShowcase(): void {
    const c = this.cine;
    if (c) c.t = Math.max(c.t, c.film - 0.5);
  }

  /** Hand the world back: the opening is over. */
  endShowcase(): void {
    this.showcase = false;
    this.backView = null;
    this.cine = null;
    this.props?.dispose();
    this.props = null;
  }

  private updateShowcase(dt: number): void {
    const c = this.cine;
    if (!c) return;
    const step = Math.min(dt, 0.1);
    c.t += step;
    this.props?.update(c.t);
    for (const e of c.events) {
      if (!e.done && c.t >= e.at) {
        e.done = true;
        e.run();
      }
    }
    let i = 0;
    while (i < c.shots.length - 1 && c.t >= c.starts[i + 1]) i++;
    const over = c.t - c.film;
    const shot = c.shots[i];
    let u = Math.min(1, (c.t - c.starts[i]) / shot.dur);
    if (over > 0) {
      // Past the last shot: the camera keeps drifting out over the world while things go on happening.
      u = 1;
      if (over > c.later + 14) {
        c.later = over;
        const wl = this.world;
        const site = wl.sites.find((q) => !SITE_DEFS[q.kind].dock && !SITE_DEFS[q.kind].station && upgradeError(wl, q.id) === null);
        if (site) upgradeSite(wl, site.id);
        else {
          const town = this.world.places.find((q) => q.level < 5);
          if (town) town.level += 1;
        }
      }
    }
    const v = shot.view(u, c.t, step);
    // Handheld: a slow breath of movement, never enough to notice as shake.
    const sway = 1 + Math.min(1, v.dist / 40) * 0.5;
    const h = v.h + (over > 0 ? over * 0.04 : 0) + (0.012 * Math.sin(c.t * 0.7) + 0.006 * Math.sin(c.t * 1.9 + 1)) * sway;
    const p = v.p + (0.01 * Math.sin(c.t * 0.9 + 2) + 0.005 * Math.sin(c.t * 2.3)) * sway;
    const { lon, lat } = tileLonLat(this.world.width, this.world.height, v.x, v.y);
    this.cam.set(lon, lat, v.dist, h, p);
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
