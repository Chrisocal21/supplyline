// The 3D game: owns the Three.js scene, runs the simulation, and turns pointer input into player actions.
// The Phaser HUD sits on top and calls into this class.
import * as THREE from 'three';
import {
  GOODS,
  SITE_DEFS,
  TICKS_PER_SECOND,
  VEHICLE_DEFS,
  VEHICLE_ORDER,
  BUILD_ORDER,
  type DistrictId,
  type NodeKind,
  type SiteKind,
  type VehicleKind,
} from '../sim/defs';
import { homeTiles } from '../sim/features';
import { townGeometry } from './townmodel';
import { tileLonLat } from '../sim/mapgen';
import { findPath } from '../sim/path';
import {
  addVehicle,
  tradeUp,
  tradeUpPreview,
  onNetwork,
  connectSites,
  removeRoute,
  removeRouteError,
  roadEndError,
  routeRefund,
  createAirRoute,
  createRoute,
  createWorld,
  demolishSite,
  nodeAt,
  plotFacing,
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
  setHubPull,
  siteAt,
  siteById,
  step,
  wrapDx,
  upgradeSite,
  type Place,
  type Region,
  type ResourceNode,
  type Route,
  type RoutePlan,
  type Site,
  type Tile,
  type World,
} from '../sim/world';
import { GlobeCamera, pickGround, MAX_DIST } from './camera';
import { HeightField, LAT_SPAN, R, basisMatrix, lonLatToTile, lonLatToVec } from './geo';
import { buildGlobe, type Globe } from './globeMesh';
import { siteGeometry, vehicleGeometry } from './models';
import { paintGlobe, paintRoughness } from './paint';
import { Smoke } from './smoke';
import { RoadNet, makeHighwayTexture, makeRailTexture, makeRoadTexture } from './roads';
import { Scenery } from './scenery';
import { buildDemo } from './demo';
import type { Good } from '../sim/defs';

export const SAVE_KEY = 'supplyline.save.v8';
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

export type Tool = 'select' | 'route' | 'highway' | 'rail' | 'air' | 'demolish' | 'tradeup' | SiteKind | VehicleKind;
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
  private roads!: RoadNet;
  private rails!: RoadNet;
  private scenery!: Scenery;
  private readonly roadTexture = makeRoadTexture();
  private readonly railTexture = makeRailTexture();
  private readonly highwayTexture = makeHighwayTexture();
  private readonly hemi = new THREE.HemisphereLight(0xd6e4f7, 0x6a6a5c, 1.25);
  private readonly sun = new THREE.DirectionalLight(0xfff1dc, 2.3);
  private readonly siteMeshes = new Map<number, THREE.Mesh>();
  private readonly townMeshes = new Map<number, { mesh: THREE.Mesh; sig: string }>();
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
    g.addColorStop(0, '#4f7bb3');
    g.addColorStop(0.55, '#8fb2d8');
    g.addColorStop(1, '#cfdeee');
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
    this.renderer.toneMappingExposure = 1.2;
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
    this.hf = new HeightField(world);
    this.logSeen = world.logSeq;

    const color = paintGlobe(world, 16);
    const rough = paintRoughness(world, 4);
    const t1 = performance.now();
    this.globe = buildGlobe(world, this.hf, color, rough, this.renderer.capabilities.getMaxAnisotropy());
    this.scene.add(this.globe.terrain, this.globe.atmosphere, this.globe.stars);

    this.roads = new RoadNet(world, this.hf, this.roadTexture, 'road', this.highwayTexture);
    this.scene.add(this.roads.group);
    if (!this.smoke.group.parent) this.scene.add(this.smoke.group);
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
    for (const m of this.vehicleMeshes.values()) this.scene.remove(m);
    this.siteMeshes.clear();
    this.townMeshes.clear();
    this.vehicleMeshes.clear();
    this.cargoMeshes.clear();
  }

  newWorld(seed?: number): void {
    this.loadWorld(createWorld(seed));
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

  /** Load the saved game if there is one. */
  load(): boolean {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      const w = JSON.parse(raw) as World;
      if (w.version !== 4) return false;
      // Saves from before the quests.
      w.questsDone ??= [];
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

    this.acc += dt * 1000 * this.speed;
    let ticks = 0;
    while (this.acc >= TICK_MS && ticks < 40) {
      step(this.world);
      this.acc -= TICK_MS;
      ticks += 1;
    }
    if (this.speed === 0) this.acc = 0;

    this.cam.panKeys(this.keys.right, this.keys.forward, dt);
    if (this.keys.turn) this.cam.rotate(this.keys.turn * dt * 1.4, 0);
    this.cam.update(dt);
    this.cam.apply();
    this.syncWorld();
    this.updateVehicles();
    this.updateSmoke(dt);
    this.updateLighting();
    this.scenery.update(now / 1000);
    this.updateRings();
    this.drainLog();
    this.renderer.render(this.scene, this.camera);

    if (!this.demo && now - this.lastSave > 20000) this.save();

    if (this.shot && this.frames > 24) {
      (window as unknown as { __frozen?: boolean }).__frozen = true;
      this.running = false;
      return;
    }
    requestAnimationFrame((t) => this.frame(t));
  }

  /** Smoke rises from the chimneys of processing buildings that are running. */
  private updateSmoke(dt: number): void {
    const sources = new Map<number, { pos: THREE.Vector3; up: THREE.Vector3 }>();
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

  resize(): void {
    this.w = window.innerWidth;
    this.h = window.innerHeight;
    this.renderer.setSize(this.w, this.h);
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

  private siteGeometryFor(kind: SiteKind): THREE.BufferGeometry {
    let g = this.siteGeoCache.get(kind);
    if (!g) {
      g = siteGeometry(kind);
      this.siteGeoCache.set(kind, g);
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
    const sig = [
      w.sites.map((s) => `${s.id}.${s.level}`).join(','),
      w.routes.length,
      w.places.map((p) => `${p.level}${Object.values(p.districts ?? {}).join('')}`).join(''),
      w.vehicles.length,
      w.vehicles.reduce((n, v) => n + VEHICLE_ORDER.indexOf(v.kind), 0),
    ].join('|');
    if (sig !== this.signature) {
      const routesChanged = !this.signature || this.signature.split('|')[1] !== String(w.routes.length);
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
        this.rails.rebuild(this.roads.tiles);
        this.rebuildAir();
        this.scenery.clearTiles(this.roads.tiles);
        this.scenery.clearTiles(this.rails.tiles);
      }
      this.scenery.clearTiles(w.sites.map((s) => s.y * w.width + s.x));
    }
    const townTool = this.isBuildTool() && !SITE_DEFS[this.tool as SiteKind].node;
    this.scenery.showPlots(townTool, (placeId, index) => {
      const pl = w.places.find((p) => p.id === placeId)!;
      const t = plotTiles(pl.x, pl.y, radiusOf(pl))[index];
      const ter = terrainAt(w, t.x, t.y);
      return !siteAt(w, t.x, t.y) && !isHomePlot(pl, index) && (ter === 'grass' || ter === 'forest');
    });
    const usedNodes = new Set(w.sites.map((s) => s.nodeId).filter((n): n is number => n !== null));
    this.scenery.showMarkers(this.activeNodeKind(), usedNodes);
    this.scenery.setNodesUsed(usedNodes);
  }

  private activeNodeKind(): NodeKind | null {
    if (this.isRouteTool() || this.tool === 'select' || this.tool === 'air' || this.tool === 'demolish' || this.tool === 'tradeup') return null;
    if ((VEHICLE_ORDER as string[]).includes(this.tool)) return null;
    return SITE_DEFS[this.tool as SiteKind].node ?? null;
  }

  private syncSites(): void {
    const live = new Set(this.world.sites.map((s) => s.id));
    for (const [id, m] of this.siteMeshes) {
      if (!live.has(id)) {
        this.scene.remove(m);
        this.siteMeshes.delete(id);
      }
    }
    for (const s of this.world.sites) {
      let m = this.siteMeshes.get(s.id);
      if (!m) {
        m = new THREE.Mesh(this.siteGeometryFor(s.kind), siteMaterial);
        m.castShadow = true;
        m.receiveShadow = true;
        m.matrixAutoUpdate = false;
        this.scene.add(m);
        this.siteMeshes.set(s.id, m);
      }
      const scale = 1 + 0.07 * (s.level - 1);
      // Buildings in a town face the street they front.
      let yaw = 0;
      const plot = plotAt(this.world, s.x, s.y);
      if (plot) {
        const face = plotFacing(wrapDx(this.world, plot.place.x, s.x), s.y - plot.place.y);
        yaw = face === 'N' ? Math.PI : face === 'W' ? -Math.PI / 2 : face === 'E' ? Math.PI / 2 : 0;
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
      m.matrix.copy(this.tileMatrix(s)).multiply(new THREE.Matrix4().makeRotationY(yaw)).multiply(new THREE.Matrix4().makeScale(scale, scale, scale));
      m.matrixWorldNeedsUpdate = true;
    }
  }

  private syncTowns(): void {
    const w = this.world;
    for (const p of w.places) {
      const have = this.townMeshes.get(p.id);
      const R = radiusOf(p);
      const plots = plotTiles(p.x, p.y, R);
      const occupied = plots.map((t) => !!siteAt(w, t.x, t.y));
      const landOk = (t: Tile): boolean => {
        const ter = terrainAt(w, t.x, t.y);
        return ter === 'grass' || ter === 'forest';
      };
      const plotOk = plots.map(landOk);
      const homeOk = homeTiles(p.x, p.y, R).map((t) => landOk(t) && !routeAt(w, t.x, t.y, 'rail') && !siteAt(w, t.x, t.y));
      const districts = Object.entries(p.districts ?? {}).filter(([, lv]) => (lv ?? 0) > 0).map(([id, level]) => ({ id: id as DistrictId, level: level as number }));
      const sig = `${p.level}.${occupied.map((o) => (o ? 1 : 0)).join('')}.${homeOk.map((o) => (o ? 1 : 0)).join('')}.${districts.map((d) => `${d.id}${d.level}`).join(',')}`;
      if (have && have.sig === sig) continue;
      if (have) {
        this.scene.remove(have.mesh);
        have.mesh.geometry.dispose();
      }
      const { lat } = tileLonLat(w.width, w.height, p.x, p.y);
      const squeeze = THREE.MathUtils.clamp(Math.cos(lat), 0.55, 1);
      const mesh = new THREE.Mesh(
        townGeometry({ level: p.level, seed: p.id + w.seed, squeeze, radius: R, style: p.style, occupied, homePlots: p.homePlots ?? [], plotOk, homeOk, districts }),
        siteMaterial,
      );
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.matrixAutoUpdate = false;
      mesh.matrix.copy(this.tileMatrix(p));
      mesh.matrixWorldNeedsUpdate = true;
      this.scene.add(mesh);
      this.townMeshes.set(p.id, { mesh, sig });
    }
  }

  private vehicleGeo = new Map<VehicleKind, THREE.BufferGeometry>();

  private syncVehicles(): void {
    const live = new Set(this.world.vehicles.map((v) => v.id));
    for (const [id, m] of this.vehicleMeshes) {
      if (!live.has(id)) {
        this.scene.remove(m);
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
      const route = this.world.routes.find((r) => r.id === v.routeId);
      if (!m || !route) continue;
      const vd = VEHICLE_DEFS[v.kind];
      const last = route.path.length - 1;
      let f = v.idx;
      if (v.state === 'moving') f += (v.dir * (v.moveTimer + (this.speed > 0 ? alpha : 0))) / routeTicks(route, vd.ticksPerTile);
      // Pull up at the door, not in the middle of the building. A train is long and its engine is at one end, so where it
      // stops depends on which way it faces: turning round at the end of the line leaves the wagons where they stood.
      const stop = Math.min(route.mode === 'rail' ? 0.87 : 0.5, last / 2);
      const tail = route.mode === 'rail' ? Math.min(1.33, last / 2) : stop;
      const dir: 1 | -1 = v.state === 'moving' ? v.dir : v.idx === 0 ? 1 : -1;
      f = Math.max(dir === 1 ? tail : stop, Math.min(last - (dir === -1 ? tail : stop), f));
      const pt = (route.mode === 'rail' ? this.rails : this.roads).pointOnPath(route.path, f, dir, route.mode === 'road' ? undefined : 0);
      const air = route.mode === 'air';
      if (air) pt.pos.addScaledVector(pt.up, this.airAlt(f, last));
      m.visible = !pt.hidden;
      const sc = air ? 2.1 : 1.35;
      m.matrix.copy(basisMatrix(pt.pos, pt.up, pt.forward)).multiply(new THREE.Matrix4().makeScale(sc, sc, sc));
      m.matrixWorldNeedsUpdate = true;
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
    const t = THREE.MathUtils.smoothstep(dist, 170, 360);
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

    const close = 1 - THREE.MathUtils.smoothstep(dist, 70, 260);
    if (close > 0.3) {
      this.scene.background = this.skyTexture;
      this.scene.backgroundIntensity = Math.min(1, close * 1.1);
    } else {
      this.scene.background = new THREE.Color(0x03060b).lerp(new THREE.Color(0x4f7bb3), close / 0.3);
      this.scene.backgroundIntensity = 1;
    }
    if (dist < 230) {
      const fog = this.scene.fog as THREE.Fog | null;
      const color = new THREE.Color(0xa9c0da);
      if (!fog) this.scene.fog = new THREE.Fog(color, 10, 400);
      const f = this.scene.fog as THREE.Fog;
      f.color.copy(color);
      f.near = dist * 0.9 + 25;
      f.far = dist * 3.4 + 220;
    } else {
      this.scene.fog = null;
    }
    if (this.globe) (this.globe.stars.material as THREE.PointsMaterial).opacity = THREE.MathUtils.smoothstep(dist, 120, 300) * 0.9;
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
    info.route = routeAt(w, tile.x, tile.y, this.tool === 'rail' || this.tool === 'train' ? 'rail' : undefined);
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
    return this.tool !== 'select' && !this.isRouteTool() && this.tool !== 'air' && this.tool !== 'demolish' && this.tool !== 'tradeup' && !(VEHICLE_ORDER as string[]).includes(this.tool);
  }

  private setHover(tile: Tile | null): void {
    if (!tile || this.hoverBlocked) {
      this.hover = null;
      this.ring.visible = false;
      if (this.ghost) this.ghost.visible = false;
      return;
    }
    this.hover = this.describe(tile);
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
    if ((VEHICLE_ORDER as string[]).includes(this.tool)) {
      const mode = VEHICLE_DEFS[this.tool as VehicleKind].mode as 'road' | 'rail' | 'air';
      const here = siteAt(w, tile.x, tile.y);
      const route = mode === 'air' ? w.routes.find((r) => r.mode === 'air' && here && (r.fromSiteId === here.id || r.toSiteId === here.id)) : routeAt(w, tile.x, tile.y, mode, { vehicles: true });
      const err = addVehicle(w, route?.id ?? -1, this.tool as VehicleKind);
      this.onToast(err ?? `${VEHICLE_DEFS[this.tool as VehicleKind].label} added`);
      return;
    }
    if (this.tool === 'tradeup') {
      const here = siteAt(w, tile.x, tile.y);
      const route = routeAt(w, tile.x, tile.y, undefined, { vehicles: true }) ?? w.routes.find((r) => r.mode === 'air' && here && (r.fromSiteId === here.id || r.toSiteId === here.id));
      const before = route ? tradeUpPreview(w, route.id) : null;
      const err = tradeUp(w, route?.id ?? -1);
      this.onToast(err ?? `${VEHICLE_DEFS[before!.from].label} traded up to a ${VEHICLE_DEFS[before!.to].label}`);
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
      this.onToast(err ?? 'Air route opened, cargo plane assigned');
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
    const err = createRoute(this.world, path, this.routeMode, grade);
    const what = rail ? 'Track' : this.tool === 'highway' ? 'Highway' : 'Road';
    this.onToast(err ?? (plan.free ? `${what} laid` : rail ? 'Track laid, freight train assigned' : `${what} built, box truck assigned`));
    if (err) return false;
    // Buildings the new road joins to the network get their routes started.
    const ends = [path[0], path[path.length - 1]].map((t) => siteAt(this.world, t.x, t.y)).filter((s): s is NonNullable<typeof s> => !!s);
    const made = connectSites(this.world, ends.map((s) => s.id));
    if (made.length) this.onToast(`Routes started: ${made.join(', ')}`);
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
    this.onToast(err ?? 'Upgraded');
  }

  togglePull(siteId: number, good: Good, on: boolean): void {
    setHubPull(this.world, siteId, good, on);
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
    return MAX_DIST;
  }

  /** Region under the camera focus, for debugging. */
  regionAt(tile: Tile): Region | undefined {
    return this.world.regions.find((r) => r.id === this.world.regionMap[tile.y * this.world.width + tile.x]);
  }
}
