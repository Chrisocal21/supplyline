// The HUD: a transparent Phaser scene over the 3D view. Everything is drawn with the immediate-mode helper in imui.ts.
import { diagnose, diagnoseAll, shortOf } from '../sim/diagnose';
import Phaser from 'phaser';
import { GRAPHICS, type GraphicsQuality, type LightingMode } from '../r3d/graphics';
import {
  GOODS,
  GOOD_LIST,
  LEVEL_CAP,
  NODE_QUALITY,
  SITE_DEFS,
  STYLE_LABEL,
  TICKS_PER_SECOND,
  TIERS,
  TOWN_LEVELS,
  VEHICLE_DEFS,
  vehicleLabel,
  PATHS,
  AIR_COST_PER_TILE,
  AIR_TIER,
  SEA_COST_PER_TILE,
  SEA_TIER,
  type Good,
  BUILD_ORDER,
  type SiteKind,
} from '../sim/defs';
import {
  buildCost,
  demolishRefund,
  dockDemand,
  produces,
  siteCap,
  siteSpeed,
  stockOf,
  unitPrice,
  upgradeCost,
  buyError,
  buyOptions,
  destinationsOf,
  fleetOf,
  inboundTo,
  HISTORY_JOBS,
  buyersFor,
  roadPlan,
  sellVehicleValue,
  upgradeVehicleCost,
  upgradeVehicleError,
  routeRefund,
  siteById,
  siteTown,
  growPreview,
  growTown,
  readyToGrow,
  upgradeError,
  PICK_LABEL,
  PICK_MODES,
  bodyForLine,
  depotsNear,
  hasByLine,
  sendAllowed,
  lineGoods,
  sellTargets,
  type Line,
  setHubOptions,
  HUB_TRIGGER,
  wants,
  type Place,
  type Site,
  type Tile,
  type Vehicle,
  vehicleRoute,
  wrapDx,
} from '../sim/world';
import { nextQuest } from '../sim/quests';
import { Game3D, type HoverInfo, type OverlayItem, type Tool } from '../r3d/game3d';
import { COLORS, Im } from './imui';
import { VERSION, VERSION_NOTE } from '../version';
import { Rates, Sheets, type SheetId } from './sheets';
import { Title, type TitleChoice } from './title';
import { byInput, isTouch, onInputChange } from './inputmode';
import { Minimap, viewSpan, viewTile } from './minimap';

let TOP = 72;
const DOCK_TAB_W = 96;
const DOCK_TAB_H = 66;
const DOCK_PAD = 8;
const DOCK_H = DOCK_TAB_H + DOCK_PAD * 2;
const CARD_W = 118;
const CARD_H = 118;
const TRAY_PAD = 10;
const DOCK_GAP = 8;
const EDGE = 14;
const PANEL_W = 322;
/** Set once the guide has been shown, so it only opens by itself on the very first visit. */
const GUIDE_KEY = 'supplyline.guide.v2';

interface Tab {
  id: string;
  label: string;
  icon: string;
  blurb: string;
  tools: Tool[];
}

const sitesIn = (category: string): Tool[] => BUILD_ORDER.filter((k) => SITE_DEFS[k].category === category);

/** The dashboard pages that have a filtered list. */
type FilterPage = 'supply' | 'sell';
interface ListFilter {
  q: string;
  status: string;
  type: string;
  good: string;
  sort: string;
}
const newFilter = (sort: string): ListFilter => ({ q: '', status: 'all', type: 'all', good: 'all', sort });
const isFiltered = (f: ListFilter): boolean => !!f.q.trim() || f.status !== 'all' || f.type !== 'all' || f.good !== 'all';
const TYPE_LABEL: Record<string, string> = {
  production: 'Producers',
  processing: 'Processing',
  manufacturing: 'Manufacturing',
  heavy: 'Heavy industry',
  storage: 'Warehouses & terminals',
  market: 'Markets',
  freight: 'Freight docks',
  civic: 'Civic',
  factory: 'Factories',
  station: 'Stations',
  other: 'Other',
};

const TABS: Tab[] = [
  { id: 'select', label: 'Select', icon: 'thumb-select', blurb: 'Inspect buildings and towns', tools: [] },
  { id: 'production', label: 'Production', icon: 'thumb-forestry', blurb: 'Extract raw goods from forests, farmland, pasture, clay, hills and mountains', tools: sitesIn('production') },
  { id: 'processing', label: 'Processing', icon: 'thumb-sawmill', blurb: 'Food and materials. Build these on a free plot in a town.', tools: sitesIn('processing') },
  { id: 'manufacturing', label: 'Manufacturing', icon: 'thumb-workshop', blurb: 'Paper, textiles, furniture. Build these on a free plot in a town.', tools: sitesIn('manufacturing') },
  { id: 'heavy', label: 'Heavy Industry', icon: 'thumb-smelter', blurb: 'Stone, metal, glass and machinery. Build these on a free plot in a town.', tools: sitesIn('heavy') },
  { id: 'logistics', label: 'Logistics', icon: 'thumb-route', blurb: 'Roads, highways, rails, air and sea routes, hubs, yards, airports, ports and clearing the way', tools: ['route', 'highway', 'rail', 'air', 'sea', 'hub', 'railyard', 'airport', 'port', 'demolish'] },
];

const REGION_COLOR: Record<string, number> = {
  ocean: 0xcfe9ff,
  sea: 0xcfe9ff,
  lake: 0xcfe9ff,
  forest: 0xdaf0c6,
  mountain: 0xf1efe9,
  land: 0xfff3d4,
  ice: 0xffffff,
};

const fmt = (n: number): string => Math.floor(n).toLocaleString('en-US');

interface Card {
  name: string;
  cost: string;
  locked: string | null;
  thumb: string;
  blurb: string;
  detail: string[];
}

export class HudScene extends Phaser.Scene {
  private im!: Im;
  private activeTab = 'select';
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private dragging = false;
  private toasts: { text: string; until: number }[] = [];
  private incomeSamples: { tick: number; earned: number }[] = [];
  private income = 0;
  private sheet: SheetId | null = null;
  private menuOpen = false;
  private graphicsOpen = false;
  /** The opening screen, while it is up; and when the game started, for the fade up from black. */
  private title: Title | null = null;
  private fadeIn = -1;
  private readonly rates = new Rates();
  private sheets!: Sheets;
  private cim!: Im;
  private sheetCam!: Phaser.Cameras.Scene2D.Camera;
  /** Height of the bottom UI (dock plus the open tray), so labels and hints stay clear of it. */
  private bottomInset = DOCK_H + EDGE;
  /** Height the minimap takes up from the bottom right corner, so the side panel stops above it. */
  private rightInset = 0;
  private minimap!: Minimap;
  private miniRect: { x: number; y: number; w: number; h: number } | null = null;
  private minimapOn = (() => {
    try {
      return !localStorage.getItem('sl-minimap-off');
    } catch {
      return true;
    }
  })();

  constructor(private readonly game3d: Game3D) {
    super('hud');
  }

  create(): void {
    // Sheet contents scroll, so they live in their own layer, seen only by a camera whose viewport is the sheet body.
    const mainLayer = this.add.layer();
    const sheetLayer = this.add.layer();
    this.im = new Im(this, 5, mainLayer);
    this.cim = new Im(this, 1, sheetLayer);
    this.sheetCam = this.cameras.add(0, 0, 10, 10);
    this.sheetCam.ignore(mainLayer);
    this.sheetCam.setVisible(false);
    this.cameras.main.ignore(sheetLayer);
    this.sheets = new Sheets(this.im, this.cim, this.rates, {
      clip: (x, y, w, hh) => {
        this.sheetCam.setVisible(true).setViewport(x, y, w, hh).setScroll(x, y);
      },
      status: (site) => this.siteStatus(site),
      hasTexture: (key) => this.textures.exists(key),
      focusSite: (site) => {
        this.sheet = null;
        this.game3d.select({ kind: 'site', id: site.id });
        this.game3d.lookAt(site.x, site.y, 45, this.game3d.cam.heading, this.game3d.cam.pitchManual);
      },
      focusPlace: (place) => {
        this.sheet = null;
        this.game3d.select({ kind: 'place', id: place.id });
        this.game3d.lookAt(place.x, place.y, 55, this.game3d.cam.heading, this.game3d.cam.pitchManual);
      },
      select: (id) => (this.sheet = id),
      toast: (text) => this.toasts.push({ text, until: this.time.now + 3200 }),
    });
    const el = this.game.canvas;
    el.style.position = 'absolute';
    el.style.left = '0';
    el.style.top = '0';
    el.style.zIndex = '5';
    this.input.mouse?.disableContextMenu();
    this.input.addPointer(1); // a second finger, for pinch and twist

    // 3D thumbnails and two drawn icons for the build menu.
    for (const [key, canvas] of this.game3d.makeThumbnails(160)) this.textures.addCanvas(`thumb-${key}`, canvas);
    this.textures.addCanvas('thumb-route', this.roadIcon());
    this.textures.addCanvas('thumb-rail', this.railIcon());
    this.textures.addCanvas('thumb-air', this.airIcon());
    this.textures.addCanvas('thumb-sea', this.seaIcon());
    this.textures.addCanvas('thumb-highway', this.highwayIcon());
    this.textures.addCanvas('thumb-select', this.cursorIcon());
    this.textures.addCanvas('thumb-demolish', this.demolishIcon());
    this.minimap = new Minimap(this);

    const kb = this.input.keyboard!;
    this.keys = kb.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,Q,E') as Record<string, Phaser.Input.Keyboard.Key>;
    kb.addCapture('TAB,SPACE,UP,DOWN,LEFT,RIGHT');
    kb.on('keydown-ESC', () => this.escape());
    kb.on('keydown-SPACE', () => (this.game3d.speed = this.game3d.speed === 0 ? 1 : 0));
    kb.on('keydown-TAB', () => this.cycleTab());
    kb.on('keydown-P', () => this.toggleSheet('production'));
    kb.on('keydown-BACKSPACE', () => this.game3d.undoDraft());
    kb.on('keydown-ENTER', () => {
      if (this.title) {
        this.title.primary();
        return;
      }
      if (this.game3d.draft) this.game3d.finishDraft();
    });
    kb.on('keydown-T', () => this.toggleSheet('towns'));
    kb.on('keydown-B', () => this.toggleSheet('bank'));
    kb.on('keydown-G', () => this.toggleSheet('quests'));
    kb.on('keydown-H', () => this.toggleSheet('guide'));
    kb.on('keydown-N', () => this.nextProblem());
    kb.on('keydown-R', () => this.game3d.rotatePlacement());
    kb.on('keydown-M', () => !this.title && this.toggleMinimap());
    kb.on('keydown-O', () => !this.title && this.openGraphics());
    kb.on('keydown-L', () => !this.title && this.openSavesFromKey());
    kb.on('keydown-C', () => !this.title && this.pickToolKey('route'));
    kb.on('keydown-X', () => !this.title && this.pickToolKey('demolish'));
    kb.on('keydown-U', () => !this.title && this.upgradeKey());
    for (let i = 1; i <= 9; i++) kb.on(`keydown-${['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE'][i - 1]}`, () => this.pickByNumber(i - 1));

    // Any other key, or a click on the picture, skips the opening film.
    kb.on('keydown', (e: KeyboardEvent) => {
      if (this.title) {
        if (e.key !== 'Enter') this.title.skip();
        return;
      }
      if (e.key === '-' || e.key === '_') this.stepSpeed(-1);
      else if (e.key === '=' || e.key === '+') this.stepSpeed(1);
    });
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (this.title) {
        this.title.skip();
        return;
      }
      if (this.im.blocked(p.x, p.y)) return;
      this.menuOpen = false;
      this.dragging = true;
      this.game3d.pointerDown(p.x, p.y, (p.event as MouseEvent).button ?? 0);
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (this.title) return;
      if (p.wasTouch && this.sheet) {
        // Drag a sheet to scroll it.
        if (p.isDown) this.sheets.scrollBy(p.prevPosition.y - p.y);
        return;
      }
      if (p.wasTouch && this.dash !== null) {
        if (p.isDown) this.dashScroll += p.prevPosition.y - p.y;
        return;
      }
      if (p.wasTouch && p.isDown && !this.dragging && this.panelRect && p.prevPosition.x >= this.panelRect.x && p.prevPosition.x <= this.panelRect.x + this.panelRect.w && p.prevPosition.y >= this.panelRect.y && p.prevPosition.y <= this.panelRect.y + this.panelRect.h) this.panelScroll += p.prevPosition.y - p.y;
      if (p.wasTouch && !this.dragging) return;
      const over = this.im.blocked(p.x, p.y) && !this.dragging;
      this.game3d.setHoverBlocked(over);
      if (!over) this.game3d.pointerMove(p.x, p.y);
    });
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (!this.dragging) return;
      this.dragging = false;
      this.game3d.pointerUp(p.x, p.y);
    });
    this.input.on('wheel', (p: Phaser.Input.Pointer, _o: unknown, _dx: number, dy: number) => {
      if (this.title) return;
      if (this.sheet) this.sheets.scrollBy(dy);
      else if (this.dash !== null) this.dashScroll += dy;
      else if (this.panelRect && p.x >= this.panelRect.x && p.x <= this.panelRect.x + this.panelRect.w && p.y >= this.panelRect.y && p.y <= this.panelRect.y + this.panelRect.h) this.panelScroll += dy;
      else if (!this.im.blocked(p.x, p.y)) this.game3d.wheel(p.x, p.y, dy);
    });

    this.game3d.onToast = (text) => this.toasts.push({ text, until: this.time.now + 3200 });
    onInputChange((m) => this.toasts.push({ text: m === 'touch' ? 'Touch controls' : 'Mouse and keyboard controls', until: this.time.now + 2200 }));

    // The opening screen: the showcase world flies by behind it until the player starts.
    if (this.game3d.showcase) {
      this.title = new Title(this.game3d.hasSave(), (c) => this.startGame(c), () => this.game3d.showcaseInfo(), () => this.game3d.skipShowcase());
      return;
    }
    // A first-time player gets the guide straight away. Screenshot and demo links skip it.
    try {
      if (!this.game3d.demo && !location.hash.includes('shot') && !localStorage.getItem(GUIDE_KEY)) {
        this.sheet = 'guide';
        localStorage.setItem(GUIDE_KEY, '1');
      }
    } catch {
      // No storage (private window): the guide is still in the menu.
    }
  }

  /** The opening is over: load the player's game (or a new one) behind the black, and fade up into it. */
  private startGame(choice: TitleChoice): void {
    const g = this.game3d;
    g.endShowcase();
    if (!(choice === 'continue' && g.load())) g.newWorld();
    g.speed = 1;
    this.title = null;
    this.fadeIn = this.time.now;
    this.sheet = null;
    this.incomeSamples = [];
    this.toasts = [];
    try {
      if (!localStorage.getItem(GUIDE_KEY)) {
        this.sheet = 'guide';
        localStorage.setItem(GUIDE_KEY, '1');
      }
    } catch {
      // No storage: the guide is still in the menu.
    }
  }

  // ---- input helpers ----

  /** Open the Towns sheet on one town's path and districts. */
  private openManage(id: number): void {
    this.graphicsOpen = false;
    this.sheets.manage = id;
    this.sheets.scroll = 0;
    this.sheet = 'towns';
    this.menuOpen = false;
  }

  private toggleSheet(id: SheetId): void {
    this.graphicsOpen = false;
    this.sheet = this.sheet === id ? null : id;
    this.sheets.scroll = 0;
    this.menuOpen = false;
    if (this.sheet) this.activeTab = 'select';
  }

  /** Esc: close every menu, sheet, build tool and selection at once and go back to plain play. With nothing open, it opens the menu. */
  private escape(): void {
    const g = this.game3d;
    if (this.title) return;
    if (this.menuOpen) {
      this.menuOpen = false;
      return;
    }
    const idle = !this.graphicsOpen && !this.saves && !this.sheet && this.dash === null && !this.confirm && !g.removal && !g.draft && g.tool === 'select' && !g.selection && this.activeTab === 'select' && !this.pendingGrowth();
    if (idle) {
      this.menuOpen = true;
      return;
    }
    this.graphicsOpen = false;
    g.removal = null;
    this.saves = null;
    this.sheet = null;
    this.dash = null;
    this.confirm = null;
    const grow = this.pendingGrowth();
    if (grow) this.growLater.add(`${grow.id}:${grow.level}`);
    if (g.draft) g.cancelDraft();
    if (g.tool !== 'select') this.setTool('select');
    this.activeTab = 'select';
    g.select(null);
  }

  private closeAll(): void {
    this.menuOpen = false;
    this.graphicsOpen = false;
    this.saves = null;
    this.sheet = null;
    this.dash = null;
  }

  private toggleMinimap(): void {
    this.minimapOn = !this.minimapOn;
    try {
      if (this.minimapOn) localStorage.removeItem('sl-minimap-off');
      else localStorage.setItem('sl-minimap-off', '1');
    } catch {
      /* ignore */
    }
    this.toasts.push({ text: this.minimapOn ? 'Minimap on' : 'Minimap off', until: this.time.now + 1600 });
  }

  private openGraphics(): void {
    const was = this.graphicsOpen;
    this.closeAll();
    this.graphicsOpen = !was;
  }

  private openSavesFromKey(): void {
    const was = this.saves === 'manage';
    this.closeAll();
    if (!was) this.openSaves('manage');
  }

  /** A build tool from its own key: C for roads, X for demolish. Pressing it again puts it away. */
  private pickToolKey(tool: Tool): void {
    const g = this.game3d;
    if (g.tool === tool) {
      if (g.draft) g.cancelDraft();
      this.setTool('select');
      return;
    }
    const info = this.cardInfo(tool);
    if (info.locked) {
      this.toasts.push({ text: `${info.name}: ${info.locked}`, until: this.time.now + 2400 });
      return;
    }
    this.closeAll();
    if (g.draft) g.cancelDraft();
    this.setTool(tool);
  }

  /** U: upgrade the building that is open or selected. */
  private upgradeKey(): void {
    const g = this.game3d;
    const id = this.dash ?? (g.selection?.kind === 'site' ? g.selection.id : null);
    if (id === null) {
      this.toasts.push({ text: 'Select a building to upgrade it', until: this.time.now + 2000 });
      return;
    }
    const s = siteById(g.world, id);
    if (!s) return;
    const err = s.level >= 3 ? 'Already at the top level' : upgradeError(g.world, id);
    if (err) {
      this.toasts.push({ text: `${s.name}: ${err}`, until: this.time.now + 2400 });
      return;
    }
    g.upgrade(id);
  }

  private stepSpeed(dir: number): void {
    const g = this.game3d;
    const sp = [0, 1, 2, 4];
    const i = Math.max(0, sp.indexOf(g.speed));
    g.speed = sp[Math.max(0, Math.min(sp.length - 1, i + dir))];
  }

  private setTool(tool: Tool): void {
    this.game3d.setTool(tool);
    const tab = TABS.find((t) => t.tools.includes(tool));
    this.activeTab = tab ? tab.id : 'select';
  }

  private cycleTab(): void {
    const i = TABS.findIndex((t) => t.id === this.activeTab);
    this.openTab(TABS[(i + 1) % TABS.length].id);
  }

  private openTab(id: string): void {
    this.graphicsOpen = false;
    this.activeTab = id;
    this.game3d.setTool('select');
  }

  private pickByNumber(i: number): void {
    const tab = TABS.find((t) => t.id === this.activeTab);
    const tool = tab?.tools[i];
    if (tool) this.setTool(tool);
  }

  // ---- frame ----

  update(): void {
    const g = this.game3d;
    const w = g.world;
    if (!w) return;
    const im = this.im;
    const W = this.scale.width;
    const H = this.scale.height;
    const now = this.time.now;

    if (this.title) {
      this.hideSearch();
      g.setKeys(0, 0, 0);
      im.begin();
      this.cim.begin();
      this.cim.clipBox = null;
      this.title.draw(im, W, H, now);
      im.block({ x: 0, y: 0, w: W, h: H });
      im.end();
      this.cim.end();
      this.sheetCam.setVisible(false);
      g.setHoverBlocked(true);
      return;
    }

    g.touch = isTouch();
    this.twoFingers();

    // Keyboard camera movement.
    const k = this.keys;
    g.setKeys((k.D.isDown || k.RIGHT.isDown ? 1 : 0) - (k.A.isDown || k.LEFT.isDown ? 1 : 0), (k.W.isDown || k.UP.isDown ? 1 : 0) - (k.S.isDown || k.DOWN.isDown ? 1 : 0), (k.E.isDown ? 1 : 0) - (k.Q.isDown ? 1 : 0));

    this.trackIncome();
    this.rates.update(w);
    im.begin();
    this.cim.begin();
    this.cim.clipBox = null;
    this.overlay(W, H);
    this.rightInset = 0;
    this.miniRect = null;
    TOP = this.topBarHeight(W);
    this.topBar(W);
    const growing = !this.sheet && !g.draft && !this.saves ? this.pendingGrowth() : undefined;
    if (g.canGoBack && !this.sheet && !this.saves && !this.graphicsOpen && this.dash === null) this.backButton(W, H);
    if (this.graphicsOpen) {
      g.setKeys(0, 0, 0);
      this.panelRect = null;
      this.sheetCam.setVisible(false);
      this.graphicsPanel(W, H);
    } else if (this.saves) {
      this.panelRect = null;
      this.sheetCam.setVisible(false);
      this.savesModal(W, H);
    } else if (this.sheet) {
      this.dash = null;
      this.panelRect = null;
      this.sheetLayer(W, H);
    } else if (growing) {
      this.panelRect = null;
      this.sheetCam.setVisible(false);
      this.growModal(W, H, growing);
    } else if (this.dash !== null) {
      this.panelRect = null;
      this.dashboard(W, H);
    } else {
      this.bottomBar(W, H);
      this.sheetCam.setVisible(false);
      this.sidePanel(W, H);
      this.hint(W, H);
    }
    if (g.removal) {
      this.sheetCam.setVisible(false);
      this.removalModal(W, H);
    }
    this.offersLayer(W, H);
    if (this.menuOpen) this.menuPanel(W, H);
    if (!this.searchSeen || this.menuOpen || g.removal) this.hideSearch();
    this.searchSeen = false;
    this.toastsLayer(W, now);
    this.tooltip(W, H);
    if (this.fadeIn >= 0) {
      const k = 1 - Math.min(1, (now - this.fadeIn) / 1000);
      if (k <= 0) this.fadeIn = -1;
      else im.rect(3, 0, 0, W, H, 0x000000, k * k);
    }
    im.end();
    this.cim.end();
    const p = this.input.activePointer;
    g.setHoverBlocked(im.blocked(p.x, p.y) && !this.dragging);
  }

  private gesture: { dist: number; angle: number; midY: number } | null = null;

  /** Pinch to zoom, twist to turn, and slide two fingers up or down to tilt. */
  private twoFingers(): void {
    const a = this.input.pointer1;
    const b = this.input.pointer2;
    if (!a || !b || !a.isDown || !b.isDown || this.sheet) {
      this.gesture = null;
      return;
    }
    const dist = Math.hypot(b.x - a.x, b.y - a.y);
    if (dist < 24) return;
    const angle = Math.atan2(b.y - a.y, b.x - a.x);
    const midY = (a.y + b.y) / 2;
    const gs = this.gesture;
    this.gesture = { dist, angle, midY };
    if (!gs) {
      this.dragging = false;
      this.game3d.cancelPointer();
      return;
    }
    let da = angle - gs.angle;
    if (da > Math.PI) da -= Math.PI * 2;
    if (da < -Math.PI) da += Math.PI * 2;
    this.game3d.pinch(gs.dist / dist, -da, (midY - gs.midY) * 0.004);
  }

  /** Touch only: the confirm bar for a tapped build or demolish, and Undo and Cancel while a road is drawn. Returns true when it replaces the hint. */
  private touchBar(W: number, H: number): boolean {
    const g = this.game3d;
    const im = this.im;
    if (!isTouch()) return false;
    const top = H - this.bottomInset - 56;
    const bh = 40;
    const button = (id: string, label: string, x: number, w: number, primary: boolean, fn: () => void): void => {
      const hov = im.hit(id, x, top + 8, w, bh, fn, 2);
      im.rect(2, x, top + 8, w, bh, primary ? COLORS.accent : hov ? 0x243142 : 0x172130, 1, 20, COLORS.line, 1);
      im.text(`${id}T`, label, x + w / 2, top + 8 + 11, { size: 15, bold: true, align: 'center', color: primary ? 0x0b121b : COLORS.text, layer: 3 });
    };
    const info = g.pendingInfo();
    if (info) {
      const demolish = g.tool === 'demolish';
      const d = demolish ? null : SITE_DEFS[g.tool as SiteKind];
      const label = demolish ? `Demolish ${info.site?.name ?? ''}` : `${d?.label} $${fmt(buildCost(g.world, g.tool as SiteKind, info.tile.x, info.tile.y))}`;
      const text = info.error ?? label;
      const tw = im.text('pendText', text, 0, -100, { size: 14, bold: true, layer: 3 }).w;
      const cancelW = 92;
      const okW = info.error ? 0 : 110;
      const total = 22 + tw + 14 + cancelW + (okW ? 8 + okW : 0) + 8;
      const x0 = Math.round((W - total) / 2);
      im.rect(1, x0, top, total, 56, COLORS.panel, 0.96, 28, COLORS.line, 1);
      im.block({ x: x0, y: top, w: total, h: 56 });
      im.text('pendText', text, x0 + 22, top + 19, { size: 14, bold: true, color: info.error ? COLORS.bad : COLORS.text, layer: 3 });
      let bx = x0 + 22 + tw + 14;
      button('pendCancel', 'Cancel', bx, cancelW, false, () => g.cancelPending());
      bx += cancelW + 8;
      if (okW) button('pendOk', demolish ? 'Demolish' : 'Build', bx, okW, true, () => g.confirmPending());
      return true;
    }
    if (g.draft) {
      const bw = 96;
      const x0 = Math.round(W / 2 - bw - 4);
      const y = top - 28;
      const small = (id: string, label: string, x: number, fn: () => void): void => {
        const h = im.hit(id, x, y, bw, bh, fn, 2);
        im.rect(2, x, y, bw, bh, h ? 0x243142 : COLORS.panel, 0.96, 20, COLORS.line, 1);
        im.text(`${id}T`, label, x + bw / 2, y + 11, { size: 15, bold: true, align: 'center', layer: 3 });
      };
      small('draftUndo', 'Undo', x0 - (bw + 8) / 2, () => g.undoDraft());
      small('draftCancel', 'Cancel', x0 + (bw + 8) / 2, () => g.cancelDraft());
      small('draftFinish', 'Finish', x0 + (bw + 8) * 1.5, () => g.finishDraft());
    }
    return false;
  }

  private trackIncome(): void {
    const w = this.game3d.world;
    const last = this.incomeSamples[this.incomeSamples.length - 1];
    if (!last || w.tick - last.tick >= 50 || w.tick < last.tick) {
      if (last && w.tick < last.tick) this.incomeSamples = [];
      this.incomeSamples.push({ tick: w.tick, earned: w.earned - (w.upkeep ?? 0) });
      if (this.incomeSamples.length > 12) this.incomeSamples.shift();
    }
    const a = this.incomeSamples[0];
    const b = this.incomeSamples[this.incomeSamples.length - 1];
    this.income = b.tick > a.tick ? ((b.earned - a.earned) / (b.tick - a.tick)) * TICKS_PER_SECOND * 60 : 0;
  }

  // ---- top bar ----

  private pill(x: number, y: number, w: number, h: number): void {
    this.im.rect(1, x, y, w, h, COLORS.panel, 0.94, h / 2, COLORS.line, 1);
    this.im.block({ x, y, w, h });
  }

  /** A round touch button. Returns whether the pointer is over it. */
  private roundButton(id: string, cx: number, cy: number, r: number, on: boolean, onClick: () => void): boolean {
    const im = this.im;
    const hov = im.hit(id, cx - r, cy - r, r * 2, r * 2, onClick, 1);
    im.circle(1, cx, cy, r, on ? COLORS.accent : hov ? 0x243142 : 0x172130);
    return hov;
  }

  /** How tall the top bar is: one row on a wide screen, two rows (and the stuck badges) on a phone. */
  private topBarHeight(W: number): number {
    if (W >= 640) return 72;
    const badges = this.dash === null && !this.sheet && !this.saves && this.game3d.world.sites.length > 0;
    return badges ? 154 : 114;
  }

  private topBar(W: number): void {
    const im = this.im;
    const g = this.game3d;
    const w = g.world;
    const narrow = W < 640;
    const y = 8;
    const h = 44;
    const mid = y + h / 2;
    const br = narrow ? 20 : 26;

    // The header: one dark strip across the top with a thin accent edge, like a game HUD.
    const headH = narrow ? y + h + 6 + 40 + 8 : y + h + 8;
    im.rect(1, 0, 0, W, headH, 0x0a0f14, 0.9);
    im.rect(1, 0, headH - 2, W, 2, COLORS.accent, 0.5);
    im.rect(1, 0, 0, W, 1, 0xffffff, 0.06);
    im.block({ x: 0, y: 0, w: W, h: headH });

    // Money, at the left. Click it for the bank.
    const mw = narrow ? W - 24 - (br * 2 + 4) - 8 : 214;
    this.pill(12, y, mw, h);
    const bankOn = this.sheet === 'bank';
    const bankHov = im.hit('btnBank', 12, y, mw, h, () => this.toggleSheet('bank'), 1);
    if (bankOn || bankHov) im.rect(1, 12, y, mw, h, bankOn ? COLORS.accent : 0x243142, bankOn ? 0.18 : 0.6, h / 2, bankOn ? COLORS.accent : COLORS.line, 1, bankOn ? 2 : 1);
    this.bankIcon(12 + mw - 26, mid, bankOn || bankHov ? COLORS.accent : COLORS.muted);
    im.circle(1, 36, mid, 15, 0xe8b23a);
    im.circle(1, 36, mid, 11, 0xc9951f);
    im.text('coin', '$', 36, mid - 8, { size: 14, bold: true, color: 0xf7e3a8, align: 'center', layer: 2 });
    im.text('money', fmt(w.money), 60, y + 3, { size: 21, bold: true, layer: 2 });
    const inc = this.income;
    im.text('income', `${inc >= 0 ? '+' : '-'}$${fmt(Math.abs(inc))} per min`, 60, y + 27, { size: 12, color: inc > 0 ? COLORS.good : COLORS.muted, layer: 2 });

    // Under the header: how many buildings are stuck. Tap it to jump to the first one, again for the next.
    if (this.dash === null && !this.sheet && !this.saves) this.stuckBadge(12, headH + 8, narrow ? Math.min(210, W / 2 - 18) : mw, narrow);

    // Right: the one Menu button that opens everything, with the speed control beside it.
    const menuW = narrow ? br * 2 + 4 : 134;
    const menuX = W - 12 - menuW;
    const menuHov = im.hit('btnMenu', menuX, y, menuW, h, () => (this.menuOpen = !this.menuOpen), 1);
    const menuOn = this.menuOpen;
    im.rect(1, menuX, y, menuW, h, menuOn ? COLORS.accent : menuHov ? 0x2a3646 : 0x1a2430, 1, 10, menuOn || menuHov ? COLORS.accent : COLORS.line, 1, menuOn ? 2 : 1);
    const mc = menuOn ? 0x1b1204 : COLORS.text;
    const gx = narrow ? menuX + menuW / 2 - 9 : menuX + 14;
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) im.rect(2, gx + c * 7, mid - 9 + r * 7, 5, 5, mc, 1, 1);
    if (!narrow) {
      im.text('menuLbl', 'MENU', menuX + 40, mid - 9, { size: 15, bold: true, color: mc, layer: 2 });
      if (!isTouch()) {
        im.rect(2, menuX + menuW - 40, mid - 10, 30, 20, menuOn ? 0x1b1204 : 0x0d1319, menuOn ? 0.25 : 1, 5, menuOn ? 0x1b1204 : COLORS.line, 1);
        im.text('menuKey', 'Esc', menuX + menuW - 25, mid - 7, { size: 11, bold: true, color: menuOn ? 0x1b1204 : COLORS.muted, align: 'center', layer: 2 });
      }
    }

    const sp = [0, 1, 2, 4];
    const sStep = narrow ? 36 : 44;
    const spW = sp.length * sStep + 10;
    const spX = narrow ? 12 : menuX - 10 - spW;
    const sy = narrow ? y + h + 6 : y;
    const sh = narrow ? 40 : h;
    const smid = sy + sh / 2;
    this.pill(spX, sy, spW, sh);
    sp.forEach((v, i) => {
      const cx = spX + 5 + sStep / 2 + i * sStep;
      const on = g.speed === v;
      this.roundButton(`speed${v}`, cx, smid, narrow ? 15 : 18, on, () => (g.speed = v));
      const col = on ? 0x1b1204 : COLORS.text;
      if (v === 0) {
        im.rect(2, cx - 6, smid - 7, 4, 14, col, 1, 1);
        im.rect(2, cx + 2, smid - 7, 4, 14, col, 1, 1);
      } else {
        im.text(`speedT${v}`, `${v}x`, cx, smid - 8, { size: narrow ? 13 : 14, bold: true, color: col, align: 'center', layer: 2 });
      }
    });

    // The quest bar: tier and the next quest, in the space between the money and the buttons. Click it for the full list.
    const free0 = narrow ? 12 + spW + 8 : 12 + mw + 12;
    const free1 = narrow ? W - 12 : spX - 12;
    const cw = narrow ? free1 - free0 : Math.min(430, free1 - free0);
    if (cw >= (narrow ? 150 : 250)) {
      const cx0 = narrow ? free0 : Math.round(Math.max(free0, Math.min(free1 - cw, W / 2 - cw / 2)));
      const qy = narrow ? sy : y;
      const qh = narrow ? sh : h;
      const qmid = qy + qh / 2;
      const on = this.sheet === 'quests';
      const hov = im.hit('questPill', cx0, qy, cw, qh, () => this.toggleSheet('quests'), 1);
      im.rect(1, cx0, qy, cw, qh, hov ? 0x18212d : COLORS.panel, 0.94, qh / 2, on || hov ? COLORS.accent : COLORS.line, on || hov ? 0.9 : 1);
      const tr = narrow ? 14 : 20;
      im.circle(1, cx0 + (narrow ? 20 : 28), qmid, tr, COLORS.accent);
      im.text('tierN', String(w.tier), cx0 + (narrow ? 20 : 28), qmid - (narrow ? 10 : 13), { size: narrow ? 18 : 24, bold: true, color: 0x1b1204, align: 'center', layer: 2 });
      const bx = cx0 + (narrow ? 42 : 62);
      const next = nextQuest(w);
      if (next) {
        im.text('goal', next.quest.label, bx, qy + (narrow ? 4 : 7), { size: narrow || cw < 330 ? 11 : 13, bold: true, wrap: narrow ? cw - 50 : undefined, layer: 2 });
        im.bar(1, bx, qy + (narrow ? 27 : 34), cw - (narrow ? 42 + 58 : 62 + 98), narrow ? 6 : 8, next.progress.have / next.progress.need, COLORS.accent);
        im.text('goalN', `${fmt(next.progress.have)} / ${fmt(next.progress.need)}`, cx0 + cw - (narrow ? 12 : 18), qy + (narrow ? 21 : 27), { size: narrow ? 11 : 13, bold: true, color: COLORS.warn, align: 'right', layer: 2 });
      } else {
        im.text('goal', 'All quests complete', bx, qy + (narrow ? 12 : 16), { size: 14, bold: true, color: COLORS.good, layer: 2 });
      }
      if (hov) im.tip('questPill');
    }
  }

  private factoryIcon(cx: number, cy: number, c: number, layer = 2): void {
    const im = this.im;
    im.rect(layer, cx - 12, cy - 1, 24, 12, c, 1, 2);
    im.rect(layer, cx + 5, cy - 12, 6, 12, c, 1, 1);
    im.rect(layer, cx - 12, cy - 7, 8, 6, c, 1, 1);
    im.rect(layer, cx - 3, cy - 7, 8, 6, c, 1, 1);
  }

  private bankIcon(cx: number, cy: number, c: number, layer = 2): void {
    const im = this.im;
    im.rect(layer, cx - 13, cy - 11, 26, 5, c, 1, 1);
    for (const dx of [-10, -3, 4]) im.rect(layer, cx + dx, cy - 5, 6, 12, c, 1, 1);
    im.rect(layer, cx - 14, cy + 8, 28, 4, c, 1, 1);
  }

  private townIcon(cx: number, cy: number, c: number, layer = 2): void {
    const im = this.im;
    im.rect(layer, cx - 13, cy - 1, 9, 12, c, 1, 2);
    im.rect(layer, cx - 4, cy - 11, 10, 22, c, 1, 2);
    im.rect(layer, cx + 7, cy + 2, 7, 9, c, 1, 2);
  }

  /** The menu: every sheet and setting in one place, as big tiles with their keys, and the full list of keys below. */
  private menuPanel(W: number, H: number): void {
    const im = this.im;
    const close = (): void => {
      this.menuOpen = false;
    };
    im.rect(3, 0, 0, W, H, 0x04070a, 0.6);
    im.hit('menuBack', 0, 0, W, H, close, 3);

    const narrow = W < 640;
    const cols = narrow ? 2 : 3;
    const w = Math.min(760, W - 24);
    const x = Math.round((W - w) / 2);
    const pad = 18;
    const gap = 10;
    const tileW = (w - pad * 2 - gap * (cols - 1)) / cols;
    const tileH = narrow ? 64 : 76;
    type Item = { id: string; label: string; key: string; note: string; on: boolean; icon: (cx: number, cy: number, c: number) => void; act: () => void };
    const glyph = (s: string) => (cx: number, cy: number, c: number) => im.text(`menuG${s}`, s, cx, cy - 13, { size: 22, bold: true, color: c, align: 'center', layer: 4 });
    const items: Item[] = [
      { id: 'prod', label: 'Production', key: 'P', note: 'What every building makes and uses', on: this.sheet === 'production', icon: (cx, cy, c) => this.factoryIcon(cx, cy, c, 4), act: () => this.toggleSheet('production') },
      { id: 'towns', label: 'Towns', key: 'T', note: 'Towns, their needs and districts', on: this.sheet === 'towns', icon: (cx, cy, c) => this.townIcon(cx, cy, c, 4), act: () => this.toggleSheet('towns') },
      { id: 'bank', label: 'Bank', key: 'B', note: 'Loans, savings and the market fund', on: this.sheet === 'bank', icon: (cx, cy, c) => this.bankIcon(cx, cy, c, 4), act: () => this.toggleSheet('bank') },
      { id: 'quests', label: 'Quests', key: 'G', note: 'Tiers, goals and rewards', on: this.sheet === 'quests', icon: glyph('!'), act: () => this.toggleSheet('quests') },
      { id: 'guide', label: 'How to play', key: 'H', note: 'The guide to every building', on: this.sheet === 'guide', icon: glyph('?'), act: () => this.toggleSheet('guide') },
      { id: 'saves', label: 'Save / Load', key: 'L', note: 'Save slots and files', on: this.saves === 'manage', icon: glyph('S'), act: () => this.openSavesFromKey() },
      { id: 'gfx', label: 'Graphics', key: 'O', note: 'Quality and lighting', on: this.graphicsOpen, icon: glyph('O'), act: () => this.openGraphics() },
      { id: 'mini', label: this.minimapOn ? 'Minimap: on' : 'Minimap: off', key: 'M', note: 'The world map in the corner', on: this.minimapOn, icon: glyph('M'), act: () => this.toggleMinimap() },
      { id: 'new', label: 'New world', key: '', note: 'Start again on a fresh map', on: false, icon: glyph('+'), act: () => this.openSaves('new') },
    ];
    const rows = Math.ceil(items.length / cols);
    const showKeys = !isTouch() && !narrow;
    const keysH = showKeys ? 150 : 0;
    const ph = Math.min(H - 24, 56 + rows * tileH + (rows - 1) * gap + pad + (showKeys ? 20 + keysH : 0) + 44);
    const y = Math.max(12, Math.round((H - ph) / 2));
    im.rect(3, x, y, w, ph, 0x0d141b, 0.98, 16, COLORS.accent, 0.6, 1.5);
    im.rect(3, x, y, w, 4, COLORS.accent, 0.9, 2);
    im.hit('menuPanel', x, y, w, ph, () => undefined, 3);
    im.text('menuTitle', 'MENU', x + pad, y + 18, { size: 20, bold: true, layer: 4 });
    im.text('menuVer', `Supplyline  ·  v${VERSION}`, x + pad + 76, y + 24, { size: 12, color: COLORS.muted, layer: 4 });
    const xh = im.hit('menuX', x + w - 48, y + 12, 34, 34, close, 4);
    im.rect(4, x + w - 48, y + 12, 34, 34, xh ? 0x2a3646 : 0x17202b, 1, 8, COLORS.line, 1);
    im.text('menuXT', 'x', x + w - 31, y + 19, { size: 16, bold: true, align: 'center', layer: 4 });

    const ty = y + 56;
    items.forEach((it, i) => {
      const tx = x + pad + (i % cols) * (tileW + gap);
      const tyy = ty + Math.floor(i / cols) * (tileH + gap);
      const hov = im.hit(`menu${it.id}`, tx, tyy, tileW, tileH, () => {
        this.menuOpen = false;
        it.act();
      }, 4);
      im.rect(4, tx, tyy, tileW, tileH, hov ? 0x223040 : 0x151e28, 1, 12, it.on ? COLORS.accent : hov ? 0x3d5066 : COLORS.line, 1, it.on ? 2 : 1);
      const ic = narrow ? 22 : 30;
      im.rect(4, tx + 10, tyy + (tileH - ic * 2) / 2, ic * 2, ic * 2, it.on ? COLORS.accent : 0x0c1218, 1, 10);
      it.icon(tx + 10 + ic, tyy + tileH / 2, it.on ? 0x1b1204 : COLORS.accent);
      const lx = tx + 20 + ic * 2;
      im.text(`menuT${it.id}`, it.label, lx, tyy + (narrow ? 12 : 16), { size: narrow ? 13 : 15, bold: true, layer: 4 });
      if (!narrow) im.text(`menuN${it.id}`, it.note, lx, tyy + 40, { size: 11, color: COLORS.muted, wrap: tileW - (lx - tx) - 40, layer: 4 });
      if (it.key && !isTouch()) {
        im.rect(4, tx + tileW - 32, tyy + 8, 24, 22, 0x0c1218, 1, 5, COLORS.line, 1);
        im.text(`menuK${it.id}`, it.key, tx + tileW - 20, tyy + 11, { size: 12, bold: true, color: COLORS.accent, align: 'center', layer: 4 });
      }
    });

    let by = ty + rows * tileH + (rows - 1) * gap + pad;
    if (showKeys) {
      im.line(4, x + pad, by, x + w - pad, by, COLORS.line, 1, 1);
      im.text('menuKeysT', 'KEYBOARD', x + pad, by + 10, { size: 11, bold: true, color: COLORS.accent, layer: 4 });
      const groups: [string, [string, string][]][] = [
        ['Camera', [['W A S D', 'Move'], ['Q / E', 'Turn'], ['Wheel', 'Zoom'], ['Right-drag', 'Tilt and turn'], ['M', 'Minimap']]],
        ['Build', [['Tab', 'Next category'], ['1 - 9', 'Pick a card'], ['R', 'Rotate building'], ['C / X', 'Road / Demolish'], ['Enter / Bksp', 'Finish / undo bend']]],
        ['Game', [['Space', 'Pause'], ['- / +', 'Slower / faster'], ['U', 'Upgrade selected'], ['N', 'Next problem'], ['Esc', 'Close / menu']]],
      ];
      const gw = (w - pad * 2) / groups.length;
      groups.forEach(([title, list], gi) => {
        const gx = x + pad + gi * gw;
        im.text(`menuKG${gi}`, title, gx, by + 30, { size: 12, bold: true, layer: 4 });
        list.forEach(([k, what], ki) => {
          const ly = by + 52 + ki * 19;
          im.text(`menuKK${gi}-${ki}`, k, gx, ly, { size: 11, bold: true, color: COLORS.warn, layer: 4 });
          im.text(`menuKW${gi}-${ki}`, what, gx + 88, ly, { size: 11, color: COLORS.muted, layer: 4 });
        });
      });
      by += 20 + keysH;
    }
    im.text('menuNote', `What is new: ${VERSION_NOTE}`, x + pad, by - 4, { size: 10, color: COLORS.muted, wrap: w - pad * 2, layer: 4, alpha: 0.8 });
  }

  private graphicsPanel(W: number, H: number): void {
    const im = this.im;
    const w = Math.min(620, W - 24);
    const x = (W - w) / 2;
    const y = TOP + 12;
    const h = Math.min(360, H - y - 12);
    const g = this.game3d;
    im.block({ x: 0, y: TOP, w: W, h: H - TOP });
    im.rect(3, x, y, w, h, COLORS.panel, 0.99, 12, COLORS.line);
    im.text('gfxTitle', 'GRAPHICS AND LIGHTING', x + 18, y + 18, { size: 16, bold: true, layer: 4 });
    const close = im.hit('gfxClose', x + w - 50, y + 8, 40, 36, () => this.graphicsOpen = false, 4);
    im.text('gfxCloseT', 'X', x + w - 30, y + 17, { size: 16, color: close ? COLORS.accent : COLORS.muted, align: 'center', layer: 4 });
    const bw = (w - 48) / 3;
    const choice = (id: string, label: string, index: number, cy: number, selected: boolean, run: () => void) => {
      const bx = x + 16 + index * (bw + 8);
      const hover = im.hit(id, bx, cy, bw, 40, run, 4);
      im.rect(3, bx, cy, bw, 40, selected ? COLORS.accent : COLORS.panelAlt, 1, 6, hover ? COLORS.accent : COLORS.line);
      im.text(`${id}T`, label, bx + bw / 2, cy + 12, { size: 13, bold: true, color: selected ? 0x182126 : COLORS.text, align: 'center', layer: 4 });
    };
    im.text('gfxQualityLabel', 'QUALITY', x + 18, y + 58, { size: 11, color: COLORS.muted, layer: 4 });
    (['balanced', 'high', 'ultra'] as GraphicsQuality[]).forEach((quality, i) =>
      choice(`gfx${quality}`, GRAPHICS[quality].label, i, y + 80, g.graphicsQuality === quality, () => g.setGraphics(quality)));
    const detail = g.graphicsQuality === 'ultra' ? 'High-end PC: 4K shadows, 32-sample contact shading, bloom, 16 local lights.'
      : g.graphicsQuality === 'high' ? 'Desktop: 2K shadows, contact shading, bloom, 8 local lights.'
      : 'Reduced GPU load: 1K shadows, native resolution, 4 local lights, no post-processing.';
    im.text('gfxDescription', detail, x + 18, y + 130, { size: 11, color: COLORS.muted, wrap: w - 36, layer: 4 });
    im.text('gfxLightLabel', 'LIGHTING', x + 18, y + 180, { size: 11, color: COLORS.muted, layer: 4 });
    (['day', 'dusk', 'night'] as LightingMode[]).forEach((light, i) =>
      choice(`gfx${light}`, light[0].toUpperCase() + light.slice(1), i, y + 202, g.lightingMode === light, () => g.setGraphics(g.graphicsQuality, light)));
    im.text('gfxCredits', 'Scanned materials: Poly Haven / CC0. Settings are saved on this device.', x + 18, y + h - 42, { size: 10, color: COLORS.muted, wrap: w - 36, layer: 4 });
  }

  /** The production and towns sheets. */
  private sheetLayer(W: number, H: number): void {
    // A full-screen window: the whole screen under the top bar, like a normal game menu.
    const w = W - 24;
    const x = 12;
    const y = TOP + 6;
    const h = H - y - 12;
    this.sheets.draw(this.game3d.world, this.sheet!, x, y, w, h, () => (this.sheet = null));
  }

  // ---- saves: five slots, and a new world that asks before it throws the current one away ----

  /** The saves window: 'new' asks whether to save before starting over, 'manage' saves and loads. */
  private saves: 'new' | 'manage' | null = null;
  /** A button that needs a second press to confirm, and until when it waits for it. */
  private confirm: { id: string; until: number } | null = null;

  private openSaves(mode: 'new' | 'manage'): void {
    this.graphicsOpen = false;
    this.saves = mode;
    this.confirm = null;
    this.sheet = null;
    this.dash = null;
    this.menuOpen = false;
  }

  /** True on the second press of a risky button within a few seconds; the first press arms it. */
  private confirmed(id: string): boolean {
    if (this.confirm && this.confirm.id === id && this.time.now < this.confirm.until) {
      this.confirm = null;
      return true;
    }
    this.confirm = { id, until: this.time.now + 3500 };
    return false;
  }

  private armed(id: string): boolean {
    return !!this.confirm && this.confirm.id === id && this.time.now < this.confirm.until;
  }

  private startNewWorld(): void {
    this.saves = null;
    this.game3d.newWorld();
    this.activeTab = 'select';
    this.toasts.push({ text: 'New game started', until: this.time.now + 2500 });
  }

  private savesModal(W: number, H: number): void {
    const im = this.im;
    const g = this.game3d;
    const mode = this.saves!;
    im.rect(3, 0, 0, W, H, 0x05080c, 0.62);
    im.block({ x: 0, y: 0, w: W, h: H });
    const w = Math.min(600, W - 24);
    const x = (W - w) / 2;
    const pad = 22;
    const inner = w - pad * 2;
    const rowH = 64;
    const h = 98 + Game3D.SLOTS * (rowH + 8) + 52 + pad;
    const y = Math.max(TOP + 6, (H - h) / 2);
    im.rect(4, x, y, w, h, COLORS.panel, 1, 18, COLORS.accent, 1, 2);
    let cy = y + pad;
    im.text('svT', mode === 'new' ? 'Start a new world?' : 'Saved games', x + w / 2, cy, { size: 21, bold: true, align: 'center', layer: 4 });
    cy += 32;
    im.text('svS', mode === 'new' ? 'Do you want to save this game first? Pick a slot to save it in, then a new world starts.' : 'Save this game in a slot, or load one. Your game also saves itself every few seconds.', x + w / 2, cy, { size: 12, color: COLORS.muted, align: 'center', wrap: inner, layer: 4 });
    cy += 44;
    const when = (t: number): string => {
      const mins = Math.floor((Date.now() - t) / 60000);
      return mins < 1 ? 'just now' : mins < 60 ? `${mins} min ago` : mins < 1440 ? `${Math.floor(mins / 60)} h ago` : new Date(t).toLocaleDateString();
    };
    for (let i = 1; i <= Game3D.SLOTS; i++) {
      const info = g.slotInfo(i);
      im.rect(4, x + pad, cy, inner, rowH, 0x131a24, 1, 12, COLORS.line, 1);
      im.text(`sv${i}n`, info ? `Slot ${i}: ${info.town}` : `Slot ${i}: empty`, x + pad + 14, cy + 12, { size: 14, bold: true, color: info ? COLORS.text : COLORS.muted, layer: 4 });
      if (info) im.text(`sv${i}d`, `Tier ${info.tier}  ·  $${fmt(info.money)}  ·  ${info.minutes} min played  ·  saved ${when(info.savedAt)}`, x + pad + 14, cy + 32, { size: 11, color: COLORS.muted, wrap: inner - (mode === 'manage' ? 350 : 230), layer: 4 });
      // Buttons on the right: save here (and start over, when making a new world), load, delete.
      const bh = 34;
      const by = cy + (rowH - bh) / 2;
      let bx = x + pad + inner - 10;
      const btn = (id: string, label: string, bw: number, style: 'main' | 'plain' | 'bad', fn: () => void): void => {
        bx -= bw;
        const hov = im.hit(id, bx, by, bw, bh, fn, 4);
        const fill = style === 'main' ? (hov ? 0xf2b04c : COLORS.accent) : style === 'bad' ? (hov ? 0x4a2420 : 0x2a1a1a) : hov ? 0x2a3b50 : 0x1b2735;
        im.rect(4, bx, by, bw, bh, fill, 1, 10, style === 'plain' ? COLORS.accent : style === 'bad' ? COLORS.bad : fill, 1);
        im.text(`${id}t`, label, bx + bw / 2, by + 9, { size: 12, bold: true, color: style === 'main' ? 0x1b1204 : style === 'bad' ? COLORS.bad : COLORS.accent, align: 'center', layer: 4 });
        bx -= 8;
      };
      const saveId = `svSave${i}`;
      const saveLabel = this.armed(saveId) ? 'Overwrite?' : mode === 'new' ? 'Save, then new' : 'Save here';
      btn(saveId, saveLabel, mode === 'new' ? 124 : 100, 'main', () => {
        if (info && !this.confirmed(saveId)) return;
        const ok = g.saveSlot(i);
        this.toasts.push({ text: ok ? `Saved in slot ${i}` : 'Could not save', until: this.time.now + 2500 });
        if (ok && mode === 'new') this.startNewWorld();
      });
      if (info && mode === 'manage') {
        const loadId = `svLoad${i}`;
        btn(loadId, this.armed(loadId) ? 'Sure?' : 'Load', 70, 'plain', () => {
          if (!this.confirmed(loadId)) return;
          const ok = g.loadSlot(i);
          this.toasts.push({ text: ok ? `Loaded slot ${i}` : 'Could not load that save', until: this.time.now + 2500 });
          if (ok) this.saves = null;
        });
        btn(`svExp${i}`, 'Export', 74, 'plain', () => this.downloadSave(i));
        const delId = `svDel${i}`;
        btn(delId, this.armed(delId) ? 'Delete?' : 'X', this.armed(delId) ? 70 : 34, 'bad', () => {
          if (this.confirmed(delId)) g.deleteSlot(i);
        });
      }
      cy += rowH + 8;
    }
    cy += 10;
    // Bottom row: start over without saving (new world only), and close.
    const cw = 120;
    if (mode === 'manage') {
      // Take a save out of the game as a file, or bring one back in.
      const fw = (inner - cw - 20) / 2;
      const fb = (id: string, label: string, fx: number, fn: () => void): void => {
        const hov = im.hit(id, fx, cy, fw, 42, fn, 4);
        im.rect(4, fx, cy, fw, 42, hov ? 0x2a3b50 : 0x1b2735, 1, 21, COLORS.accent, 1);
        im.text(`${id}t`, label, fx + fw / 2, cy + 12, { size: 14, bold: true, color: COLORS.accent, align: 'center', layer: 4 });
      };
      fb('svExport', 'Export this game', x + pad, () => this.downloadSave());
      const impId = 'svImport';
      fb(impId, this.armed(impId) ? 'Replaces this game: pick file' : 'Import from file', x + pad + fw + 10, () => {
        if (!this.confirmed(impId)) return;
        this.pickSaveFile();
      });
    }
    const ch = im.hit('svClose', x + w - pad - cw, cy, cw, 42, () => (this.saves = null), 4);
    im.rect(4, x + w - pad - cw, cy, cw, 42, ch ? 0x2a3646 : 0x1b2430, 1, 21, COLORS.line, 1);
    im.text('svCloseT', mode === 'new' ? 'Cancel' : 'Close', x + w - pad - cw / 2, cy + 12, { size: 14, bold: true, align: 'center', layer: 4 });
    if (mode === 'new') {
      const nw = inner - cw - 10;
      const armed = this.armed('svNoSave');
      const nh = im.hit('svNoSave', x + pad, cy, nw, 42, () => this.confirmed('svNoSave') && this.startNewWorld(), 4);
      im.rect(4, x + pad, cy, nw, 42, nh || armed ? 0x4a2420 : 0x2a1a1a, 1, 21, COLORS.bad, 0.8);
      im.text('svNoSaveT', armed ? 'Press again: this game will be lost' : 'Start new without saving', x + pad + nw / 2, cy + 12, { size: 14, bold: true, color: COLORS.bad, align: 'center', layer: 4 });
    }
  }

  /** Save the game (or one slot) as a file the player keeps: it goes to Downloads, or wherever the browser asks. */
  private downloadSave(slot?: number): void {
    const file = this.game3d.exportSave(slot);
    if (!file) {
      this.toasts.push({ text: 'Nothing to export', until: this.time.now + 2500 });
      return;
    }
    const url = URL.createObjectURL(new Blob([file.text], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    this.toasts.push({ text: `Saved a file: ${file.name}`, until: this.time.now + 4000 });
  }

  /** Ask for a save file, then play it. */
  private pickSaveFile(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = () => {
      const f = input.files?.[0];
      if (!f) return;
      f.text().then(
        (text) => {
          const err = this.game3d.importSave(text);
          this.toasts.push({ text: err ?? `Loaded ${f.name}`, until: this.time.now + 4000 });
          if (!err) this.saves = null;
        },
        () => this.toasts.push({ text: 'Could not read that file', until: this.time.now + 3000 }),
      );
    };
    input.click();
  }

  // ---- bottom menu ----

  private cardInfo(tool: Tool): Card {
    const w = this.game3d.world;
    if (tool === 'route') {
      return {
        name: 'Road',
        cost: 'from $2/tile',
        locked: null,
        thumb: 'thumb-route',
        blurb: 'Drag from anywhere. Roads only carry what trucks bought at a building haul along them.',
        detail: ['Lay roads first and connect buildings to them later: a road can start and end on open ground or on another road.', 'Roads cross water as bridges and mountains as tunnels, at a higher price.', `Bridges and tunnels: up to ${[2, 4, 8, 16][Math.min(3, w.tier)]} tiles at Tier ${w.tier}.`],
      };
    }
    if (tool === 'highway') {
      return {
        name: 'Highway',
        cost: 'from $5/tile',
        locked: w.tier < 1 ? 'Tier 1' : null,
        thumb: 'thumb-highway',
        blurb: 'Four lanes between towns. Trucks cover it about a third faster.',
        detail: ['Drag from a site, click or drag again to bend it, finish on another site.', 'Inside towns it joins the main street.', 'Costs about two and a half times a street.'],
      };
    }
    if (tool === 'rail') {
      return {
        name: 'Rail',
        cost: 'from $4/tile',
        locked: w.tier < 2 ? 'Tier 2' : null,
        thumb: 'thumb-rail',
        blurb: 'Drag from anywhere. Buy a freight train at a building or a station on the line.',
        detail: ['Rail is its own network, apart from roads.', 'Trains reach a town through a Rail Yard: place one at the edge of town (Logistics, Tier 2), bring goods to it by truck, then run track from yard to yard. Out in the country, track can join any two buildings.', 'Where track meets a road it makes a level crossing, at a right angle on a straight stretch.', `Bridges and tunnels: up to ${[2, 4, 8, 16][Math.min(3, w.tier)]} tiles at Tier ${w.tier}.`],
      };
    }
    if (tool === 'air') {
      return {
        name: 'Air Route',
        cost: `$${AIR_COST_PER_TILE}/tile`,
        locked: w.tier < AIR_TIER ? `Tier ${AIR_TIER}` : null,
        thumb: 'thumb-air',
        blurb: 'Click one airport, then another. Buy cargo planes at an airport.',
        detail: ['Planes fly in a straight line over water and mountains.', 'Airports store goods like hubs: tick what they should pull, and connect them to factories by road or rail.', 'Buy planes in the airport panel.'],
      };
    }
    if (tool === 'sea') {
      return {
        name: 'Sea Route',
        cost: `$${SEA_COST_PER_TILE}/tile`,
        locked: w.tier < SEA_TIER ? `Tier ${SEA_TIER}` : null,
        thumb: 'thumb-sea',
        blurb: 'Click one port, then another. Buy cargo boats at a port.',
        detail: ['Ships sail across open water. Islands grow coffee, mangoes and oil that grow nowhere else, and this is the only way to bring them home.', 'Ports store goods like hubs: bring goods to them by road, and tick what they should pull.', 'Buy ships in the port panel, and trade up to a freighter and a container ship.'],
      };
    }
    if (tool === 'demolish') {
      return {
        name: 'Demolish',
        cost: '50% refund',
        locked: null,
        thumb: 'thumb-demolish',
        blurb: 'Remove a building, or take out a road, highway or rail.',
        detail: ['Click a building, or click a road to remove it with its vehicles. You get half the cost back.', 'Town docks and town streets cannot be removed.'],
      };
    }
    const d = SITE_DEFS[tool as SiteKind];
    return {
      name: d.label,
      cost: `$${fmt(d.cost)}`,
      locked: d.tier > w.tier ? `Tier ${d.tier}` : null,
      thumb: `thumb-${tool}`,
      blurb: d.blurb,
      detail: [
        ...(d.node ? [`Build on a free ${d.node} node.`] : d.inTown ? ['Build on a free district plot in a town, then connect it to its Market with the street.'] : ['Build on open ground.']),
        ...(d.recipe
          ? [`Uses ${Object.entries(d.recipe.inputs).map(([g, n]) => `${n} ${GOODS[g as Good].label.toLowerCase()}`).join(' + ')}`, `Makes ${Object.entries(d.recipe.outputs).map(([g, n], i) => `${n} ${GOODS[g as Good].label.toLowerCase()}${i > 0 ? ' (by-product)' : ''}`).join(' + ')}`]
          : []),
      ],
    };
  }

  private trayOpen(): boolean {
    // Picking a card hides the tray so the map is clear; Esc or the tab brings it back.
    return this.activeTab !== 'select' && this.game3d.tool === 'select';
  }

  private bottomBar(W: number, H: number): void {
    const im = this.im;
    const g = this.game3d;
    const tab = TABS.find((t) => t.id === this.activeTab)!;
    const open = this.trayOpen() && !this.sheet;

    // Footer: a strip across the bottom with the category dock in the middle, key hints at the left and the minimap at the right.
    const tabW = Math.max(60, Math.min(DOCK_TAB_W, Math.floor((W - 24 - DOCK_PAD * 2 - (TABS.length - 1) * 6) / TABS.length)));
    const dockW = TABS.length * tabW + (TABS.length - 1) * 6 + DOCK_PAD * 2;
    const dx = Math.round(W / 2 - dockW / 2);
    const dy = H - DOCK_H - 2;
    const footY = dy - 6;
    im.rect(1, 0, footY, W, H - footY, 0x0a0f14, 0.9);
    im.rect(1, 0, footY, W, 2, COLORS.accent, 0.5);
    im.block({ x: 0, y: footY, w: W, h: H - footY });
    im.rect(1, dx, dy, dockW, DOCK_H, 0x111a22, 1, 14, COLORS.line, 1);
    // First-time help: a pulsing ring on the exact button the current quest needs.
    const coach = this.coachTarget();
    let coachRect = { x: 0, y: 0, w: 0, h: 0 };
    let coachText = '';
    TABS.forEach((t, i) => {
      const x = dx + DOCK_PAD + i * (tabW + 6);
      const y = dy + DOCK_PAD;
      const on = this.activeTab === t.id;
      if (coach && t.id === coach.tab && !(open && tab.id === coach.tab)) {
        coachRect = { x, y, w: tabW, h: DOCK_TAB_H };
        coachText = `Tap ${t.label}`;
      }
      const hov = im.hit(`tab${t.id}`, x, y, tabW, DOCK_TAB_H, () => (on && t.id !== 'select' && g.tool === 'select' ? this.openTab('select') : this.openTab(t.id)));
      im.rect(1, x, y, tabW, DOCK_TAB_H, on ? 0x1f2c3a : hov ? 0x1a2431 : 0x131b25, 1, 12, on ? COLORS.accent : 0x131b25, 1, on ? 2 : 0);
      im.image(`tabImg${t.id}`, t.icon, x + (tabW - 36) / 2, y + 6, 36, 36, on ? 1 : 0.85, 2);
      im.text(`tabT${t.id}`, t.label, x + tabW / 2, y + 46, { size: tabW < 84 ? 10 : 12, bold: true, color: on ? COLORS.accent : COLORS.text, align: 'center', layer: 2 });
      if (!isTouch()) im.text(`tabK${t.id}`, String(i + 1), x + 7, y + 4, { size: 10, color: COLORS.muted, layer: 2 });
    });
    if (!open && coach) this.coachRing(coachRect.x, coachRect.y, coachRect.w, coachRect.h, coachText);
    this.bottomInset = H - footY;

    // The minimap sits in the footer's right corner and rises above it.
    const mini = this.minimapBox(W, H, dx + dockW + 12);
    if (mini) this.drawMinimap(mini);

    // Key hints at the left of the footer, in as much detail as there is room for.
    const room = dx - 28;
    if (!isTouch() && room > 120) {
      const lines = [
        ['Esc  menu', 'Space  pause', '- / +  speed', 'Tab  category', '1-9  pick'],
        ['R  rotate', 'C  road', 'X  demolish', 'U  upgrade', 'M  map', 'N  next problem'],
      ];
      lines.forEach((parts, li) => {
        let s = '';
        for (const p of parts) {
          const next = s ? `${s}    ${p}` : p;
          if (next.length * 6 > room) break;
          s = next;
        }
        if (s) im.text(`keysHint${li}`, s, 16, dy + 20 + li * 22, { size: 11, color: COLORS.muted, alpha: 0.85, layer: 2 });
      });
    }

    if (!open) return;

    // Tray: the cards for the open category float above the dock, wrapping onto more rows when there are many.
    // On a phone the cards shrink to three across and only show what can be built now, so the tray stays short.
    const narrow = W < 640;
    const CW = narrow ? Math.floor((W - 24 - TRAY_PAD * 2 + 10) / 3) - 10 : CARD_W;
    const CH = narrow ? 96 : CARD_H;
    const IMG = narrow ? 50 : 68;
    const tools = narrow ? tab.tools.filter((t) => !this.cardInfo(t).locked || g.tool === t) : tab.tools;
    const n = tools.length;
    const avail = mini ? Math.max(CW + TRAY_PAD * 2, 2 * (mini.x - 12 - W / 2)) : W - (narrow ? 24 : 48);
    const perRow = Math.max(1, Math.min(n, Math.floor((avail - TRAY_PAD * 2 + 10) / (CW + 10))));
    const rows = Math.ceil(n / perRow);
    const trayW = perRow * CW + (perRow - 1) * 10 + TRAY_PAD * 2;
    const trayH = 24 + TRAY_PAD * 2 + rows * CH + (rows - 1) * 10;
    const tx = Math.round(W / 2 - trayW / 2);
    const ty = footY - DOCK_GAP - trayH;
    im.rect(1, tx, ty, trayW, trayH, COLORS.panel, 0.95, 18, COLORS.line, 1);
    im.block({ x: tx, y: ty, w: trayW, h: trayH });
    im.text('trayTitle', tab.blurb, tx + TRAY_PAD + 4, ty + 9, { size: 12, color: COLORS.muted, layer: 2, wrap: narrow ? trayW - 2 * TRAY_PAD - 8 : undefined });
    tools.forEach((tool, i) => {
      const cx = tx + TRAY_PAD + (i % perRow) * (CW + 10);
      const cy = ty + TRAY_PAD + 24 + Math.floor(i / perRow) * (CH + 10);
      const info = this.cardInfo(tool);
      const on = g.tool === tool;
      const id = `card${tool}`;
      if (coach && tool === coach.tool && tab.id === coach.tab && g.tool !== tool) {
        coachRect = { x: cx, y: cy, w: CW, h: CH };
        coachText = `Pick ${info.name}`;
      }
      const hov = im.hit(id, cx, cy, CW, CH, () => this.setTool(tool));
      im.rect(1, cx, cy, CW, CH, on ? 0x1b3a36 : hov ? 0x1f2b3a : COLORS.panelAlt, 1, 12, on ? COLORS.good : hov ? 0x3a4a5e : COLORS.line, 1, on ? 2 : 1);
      im.image(`cardImg${tool}`, info.thumb, cx + (CW - IMG) / 2, cy + 6, IMG, IMG, info.locked ? 0.35 : 1, 2);
      im.text(`cardName${tool}`, info.name, cx + CW / 2, cy + IMG + 10, { size: info.name.length > 14 ? 11 : 12, bold: true, align: 'center', layer: 2, alpha: info.locked ? 0.55 : 1 });
      im.text(`cardCost${tool}`, info.locked ?? info.cost, cx + CW / 2, cy + IMG + 28, { size: 12, color: info.locked ? COLORS.muted : COLORS.warn, align: 'center', layer: 2 });
      if (i < 9 && !isTouch()) im.text(`cardKey${tool}`, String(i + 1), cx + 8, cy + 5, { size: 11, color: COLORS.muted, layer: 2 });
      if (hov) im.tip(id);
    });
    if (coach) this.coachRing(coachRect.x, coachRect.y, coachRect.w, coachRect.h, coachText);
    this.bottomInset = H - footY + DOCK_GAP + trayH;
  }

  /** Where the minimap goes, or null when it is off or there is no room for it beside the dock. */
  private minimapBox(W: number, H: number, minX: number): { x: number; y: number; w: number; h: number; mw: number; mh: number } | null {
    if (!this.minimapOn || W < 900 || isTouch()) return null;
    const world = this.game3d.world;
    const mw = Math.min(300, Math.max(200, Math.round(W * 0.19)));
    const mh = Math.round((mw * world.height) / world.width);
    const w = mw + 16;
    const h = mh + 38;
    const x = W - w - 10;
    if (x < minX) return null;
    const y = H - h - 8;
    return { x, y, w, h, mw, mh };
  }

  private drawMinimap(b: { x: number; y: number; w: number; h: number; mw: number; mh: number }): void {
    const im = this.im;
    const g = this.game3d;
    const world = g.world;
    const at = viewTile(world, g.cam.lon, g.cam.lat);
    const aspect = this.scale.width / Math.max(1, this.scale.height);
    const key = this.minimap.draw(world, { x: at.x, y: at.y, span: viewSpan(world, g.cam.dist, aspect), heading: g.cam.heading }, b.mw, this.time.now);
    im.rect(1, b.x, b.y, b.w, b.h, 0x0a0f14, 0.97, 12, COLORS.accent, 0.55, 1.5);
    im.text('miniT', 'WORLD MAP', b.x + 10, b.y + 8, { size: 11, bold: true, color: COLORS.accent, layer: 2 });
    const mx = b.x + 8;
    const my = b.y + 28;
    im.image('miniImg', key, mx, my, b.mw, b.mh, 1, 2);
    im.rect(2, mx - 1, my - 1, b.mw + 2, b.mh + 2, 0x000000, 0, 2, COLORS.line, 1);
    const offH = im.hit('miniOff', b.x + b.w - 30, b.y + 4, 22, 20, () => this.toggleMinimap(), 2);
    im.text('miniOffT', 'M', b.x + b.w - 19, b.y + 7, { size: 11, bold: true, color: offH ? COLORS.text : COLORS.muted, align: 'center', layer: 3 });
    im.hit('miniMap', mx, my, b.mw, b.mh, () => {
      const p = this.input.activePointer;
      const t = this.minimap.tileAt(world, (p.x - mx) / b.mw, (p.y - my) / b.mh);
      g.lookAt(t.x, t.y, g.cam.dist, g.cam.heading, g.cam.pitchManual);
    }, 2);
    im.block({ x: b.x, y: b.y, w: b.w, h: b.h });
    this.miniRect = { x: b.x, y: b.y, w: b.w, h: b.h };
    this.rightInset = this.scale.height - b.y;
  }

  private coachOff = (() => {
    try {
      return !!localStorage.getItem('sl-coach-off');
    } catch {
      return false;
    }
  })();

  /** Which button the current quest needs, while the player is still new: its category tab and tool. */
  private coachTarget(): { tab: string; tool?: Tool } | null {
    const w = this.game3d.world;
    if (this.coachOff || w.tier > 0 || this.game3d.demo) return null;
    const next = nextQuest(w);
    if (!next || next.progress.done) return null;
    const goal = next.quest.goal;
    if (goal.kind === 'build') {
      const tab = TABS.find((t) => t.tools.includes(goal.site));
      return tab && this.game3d.tool !== goal.site ? { tab: tab.id, tool: goal.site } : null;
    }
    if (goal.kind === 'route') {
      const tool: Tool = goal.mode === 'rail' ? 'rail' : goal.grade === 'highway' ? 'highway' : 'route';
      return this.game3d.tool !== tool && !this.game3d.draft ? { tab: 'logistics', tool } : null;
    }
    return null;
  }

  /** A pulsing ring and a label around one button. The little X turns first-time help off for good. */
  private coachRing(x: number, y: number, w: number, h: number, text: string): void {
    if (w === 0 || !text) return;
    const im = this.im;
    const pulse = 0.5 + 0.5 * Math.sin(this.time.now / 260);
    im.rect(4, x - 4 - pulse * 3, y - 4 - pulse * 3, w + 8 + pulse * 6, h + 8 + pulse * 6, 0xffffff, 0, 16, COLORS.accent, 0.55 + pulse * 0.45, 3);
    const lw = text.length * 8 + 60;
    const lx = Math.max(8, Math.min(x + w / 2 - lw / 2, this.scale.width - lw - 8));
    const ly = y - 46 - pulse * 3;
    im.rect(5, lx, ly, lw, 30, COLORS.accent, 1, 15);
    im.text('coachT', text, lx + 14, ly + 7, { size: 13, bold: true, color: 0x1b1204, layer: 6 });
    const xh = im.hit('coachX', lx + lw - 28, ly + 3, 24, 24, () => {
      this.coachOff = true;
      try {
        localStorage.setItem('sl-coach-off', '1');
      } catch {
        /* ignore */
      }
    }, 7);
    im.text('coachXT', 'x', lx + lw - 16, ly + 6, { size: 14, bold: true, color: xh ? 0xffffff : 0x1b1204, align: 'center', layer: 6 });
  }

  // ---- hint line ----

  private hint(W: number, H: number): void {
    if (this.touchBar(W, H)) return;
    const g = this.game3d;
    const w = g.world;
    let text = '';
    const h = g.hover;
    if (g.draft) {
      const plan = g.draftPlan;
      if (plan) {
        const rail = plan.mode === 'rail';
        const first = rail ? VEHICLE_DEFS.train : VEHICLE_DEFS.boxtruck;
        const cost = plan.free ? `$${fmt(plan.cost)}` : `${fmt(plan.cost)} + ${first.label.toLowerCase()} ${first.cost}`;
        const end = g.draftFinishes ? byInput('release to build', 'lift to build') : byInput('Enter to finish here, or keep steering', 'tap Finish, or keep steering');
        text = plan.error ? plan.error : `${rail ? 'Track' : plan.grade === 'highway' ? 'Highway' : 'Road'} ${g.draft.length - 1} tiles · ${cost}${plan.bridgeTiles ? ` · ${plan.bridgeTiles} bridge` : ''}${plan.tunnelTiles ? ` · ${plan.tunnelTiles} tunnel` : ''}${plan.crossings ? ` · ${plan.crossings} level crossing${plan.crossings > 1 ? 's' : ''}` : ''} · ${end}`;
      } else text = `${g.tool === 'rail' ? 'Track' : 'Road'} ${g.draft.length - 1} tiles · ${byInput('drag or click to steer · Enter finishes · Backspace undoes a bend · Esc cancels', 'drag or tap to steer')}`;
    } else if (g.tool === 'route') text = `Drag to lay a road from anywhere. Finish on a building or on another road, or ${byInput('press Enter', 'tap Finish')}`;
    else if (g.tool === 'highway') text = `Drag to lay a highway from anywhere. Finish on a building or on another road, or ${byInput('press Enter', 'tap Finish')}`;
    else if (g.tool === 'rail') text = `Drag to lay track from anywhere. Finish on a building or on other track, or ${byInput('press Enter', 'tap Finish')}`;
    else if (g.tool === 'air') text = g.airFrom === null ? `${byInput('Click', 'Tap')} an airport, then ${byInput('click', 'tap')} the airport to fly to` : `Now ${byInput('click', 'tap')} the airport to fly to (${byInput('click', 'tap')} the same one to cancel)`;
    else if (g.tool === 'sea') text = g.airFrom === null ? `${byInput('Click', 'Tap')} a port, then ${byInput('click', 'tap')} the port to sail to` : `Now ${byInput('click', 'tap')} the port to sail to (${byInput('click', 'tap')} the same one to cancel)`;
    else if (g.tool === 'demolish') text = h?.site ? `${byInput('Click', 'Tap')} to demolish ${h.site.name}` : h?.route ? (h.error ? h.error : `${byInput('Click', 'Tap')} to remove this stretch of ${h.route.mode === 'rail' ? 'track' : h.route.grade === 'highway' ? 'highway' : 'road'} for $${fmt(routeRefund(w, h.route))} back`) : `${byInput('Click', 'Tap')} a building or a road to remove it`;
    else if (g.tool !== 'select') {
      const d = SITE_DEFS[g.tool as SiteKind];
      const turn = `  ·  R ${SITE_DEFS[g.tool as SiteKind].airport ? 'turns the runway' : 'to rotate'}`;
      const cost = h ? buildCost(w, g.tool as SiteKind, h.tile.x, h.tile.y) : d.cost;
      const cleared = cost > d.cost ? ` (incl. $${fmt(cost - d.cost)} to clear forest)` : '';
      const spots = g.tool === 'airport' ? '  ·  green tiles show where it can go, gold is ground kept for a town\'s airport' : '  ·  green tiles show where it can go';
      text = h ? (h.error ? h.error : `${byInput('Click', 'Tap')} to build ${d.label} for $${fmt(cost)}${cleared}${byInput(turn, '')}`) : `${d.label} $${fmt(d.cost)}${g.tool === 'railyard' || g.tool === 'airport' || g.tool === 'port' ? spots : ''}`;
    } else if (h) {
      text = h.site?.name ?? (h.place ? h.place.name : h.node ? `${h.node.kind} node` : (h.region?.name ?? ''));
    }
    void w;
    if (!text) return;
    const top = H - this.bottomInset - 44;
    const t = this.im.text('hint', text, Math.round(W / 2), top + 7, { size: 13, layer: 2, align: 'center' });
    this.im.rect(1, Math.round(W / 2 - t.w / 2 - 14), top, t.w + 28, 30, COLORS.panel, 0.92, 15, COLORS.line, 1);
  }

  // ---- toasts ----

  /** Trucks that buildings with Auto-buy are asking for. They sit on the right and never pause the game. */
  private offersLayer(W: number, H: number): void {
    // Menus draw on their own layer above the main one, so inside a menu the card is drawn there, at the bottom corner.
    const inMenu = this.dash !== null || !!this.sheet;
    const im = inMenu ? this.pim : this.im;
    const g = this.game3d;
    const world = g.world;
    const offers = (world.offers ?? []).slice(0, 3);
    const w = Math.min(330, W - 24);
    const x = inMenu ? W - w - 28 : 12;
    offers.forEach((o, i) => {
      const s = siteById(world, o.siteId);
      if (!s) return;
      const y = inMenu ? H - 140 - i * 120 : TOP + 130 + i * 120;
      const cost = VEHICLE_DEFS[o.kind].cost;
      const can = buyError(world, o.siteId, o.kind) === null;
      const label = vehicleLabel(o.kind, bodyForLine(s, o.line));
      const goods = lineGoods(s, o.line).map((gd) => GOODS[gd].label.toLowerCase()).join(' + ');
      im.rect(5, x, y, w, 112, COLORS.panel, 1, 14, COLORS.accent, 1.5);
      const th = im.text(`of${i}t`, `${s.name} needs another ${label.toLowerCase()}`, x + 14, y + 10, { size: 13, bold: true, wrap: w - 28, layer: 6 }).h;
      im.text(`of${i}s`, `Its ${goods} is piling up and all its trucks are busy.`, x + 14, y + 14 + th, { size: 11, color: COLORS.muted, wrap: w - 28, layer: 6 });
      const bw = (w - 28 - 8) / 2;
      const by = y + 74;
      const yh = im.hit(`of${i}y`, x + 14, by, bw, 30, () => can && g.answerOffer(o, true), 7);
      im.rect(6, x + 14, by, bw, 30, !can ? 0x151c26 : yh ? 0xf2b04c : COLORS.accent, 1, 15);
      im.text(`of${i}yT`, can ? `Buy  $${fmt(cost)}` : `Need $${fmt(cost)}`, x + 14 + bw / 2, by + 8, { size: 13, bold: true, color: can ? 0x1b1204 : COLORS.muted, align: 'center', layer: 7 });
      const nh = im.hit(`of${i}n`, x + 22 + bw, by, bw, 30, () => g.answerOffer(o, false), 7);
      im.rect(6, x + 22 + bw, by, bw, 30, nh ? 0x2a3646 : 0x1b2430, 1, 15, COLORS.line, 1);
      im.text(`of${i}nT`, 'Not now', x + 22 + bw + bw / 2, by + 8, { size: 13, bold: true, align: 'center', layer: 7 });
    });
  }

  private toastsLayer(W: number, now: number): void {
    this.toasts = this.toasts.filter((t) => t.until > now).slice(-3);
    this.toasts.forEach((t, i) => {
      const y = TOP + 14 + i * 40;
      const tw = this.im.text(`toast${i}`, t.text, W / 2, y + 8, { size: 14, bold: true, align: 'center', layer: 3 });
      this.im.rect(3, W / 2 - tw.w / 2 - 16, y, tw.w + 32, 32, COLORS.panel, 0.95, 16, COLORS.accent, 0.7);
    });
  }

  // ---- labels and gauges drawn over the 3D view ----

  private overlay(W: number, H: number): void {
    const im = this.im;
    const items = this.game3d.overlay();
    const placed: { x0: number; y0: number; x1: number; y1: number }[] = [];
    const free = (r: { x0: number; y0: number; x1: number; y1: number }): boolean =>
      r.x0 > 8 && r.x1 < W - 8 && r.y0 > TOP + 4 && r.y1 < H - this.bottomInset - 4 && !(this.miniRect && r.x1 > this.miniRect.x && r.y1 > this.miniRect.y) && !placed.some((p) => r.x0 < p.x1 && r.x1 > p.x0 && r.y0 < p.y1 && r.y1 > p.y0);
    const dist = this.game3d.cam.dist;

    // Status rings first: a gauge of how full each building is.
    for (const it of items.filter((i) => i.kind === 'ring')) {
      const color = it.value > 0.85 ? COLORS.bad : it.value > 0.5 ? COLORS.warn : COLORS.good;
      im.ring(0, it.x, it.y, 7, 3, it.value, color);
      placed.push({ x0: it.x - 12, y0: it.y - 12, x1: it.x + 12, y1: it.y + 12 });
    }

    this.buyerArrows();

    // Towns, largest first, then regions in whatever space is left.
    const towns = items.filter((i) => i.kind === 'town').sort((a, b) => b.value - a.value);
    for (const it of towns) {
      const size = 12 + it.value * 0.8;
      const t = im.text(`town${it.id}`, it.text, it.x, it.y - 24, { size, bold: true, stroke: 0x0b1118, align: 'center', layer: 0 });
      const r = { x0: it.x - t.w / 2 - 4, y0: it.y - 26, x1: it.x + t.w / 2 + 4, y1: it.y - 26 + t.h + 2 };
      if (free(r)) placed.push(r);
      else im.text(`town${it.id}`, '', -999, -999, { size, layer: 0 });
    }
    const fade = Math.min(1, Math.max(0, (dist - 60) / 90));
    const regions = items.filter((i) => i.kind === 'region').sort((a, b) => b.value - a.value);
    for (const it of regions) {
      if (fade <= 0.02) break;
      const size = Math.max(11, Math.min(20, 10 + Math.sqrt(it.value) * 0.45));
      const label = it.text.toUpperCase().split('').join(' ');
      const t = im.text(`reg${it.id}`, label, it.x, it.y - size / 2, { size, bold: true, color: REGION_COLOR[it.tag] ?? 0xffffff, stroke: 0x0a1118, align: 'center', alpha: 0.82 * fade, layer: 0 });
      const r = { x0: it.x - t.w / 2 - 6, y0: it.y - t.h / 2 - 2, x1: it.x + t.w / 2 + 6, y1: it.y + t.h / 2 + 2 };
      if (free(r)) placed.push(r);
      else im.text(`reg${it.id}`, '', -999, -999, { size, layer: 0 });
    }
  }

  /**
   * With a building selected, arrows on the map to everyone who could buy from it, each with a tag to tap:
   * green is selling, white could sell now, grey needs a road first.
   */
  /**
   * With a building selected, lines on the map along the roads to the buildings it can sell to: green where it is
   * selling, white where it could. Just lines; selling is switched in the building's panel.
   */
  private buyerArrows(): void {
    const g = this.game3d;
    const sel = g.selection;
    if (!sel || sel.kind !== 'site' || g.tool !== 'select' || g.cam.dist > 160 || this.sheet || this.dash !== null) return;
    const world = g.world;
    const s = siteById(world, sel.id);
    if (!s) return;
    const im = this.im;
    for (const b of buyersFor(world, s)) {
      if (!b.connected) continue;
      const r = world.routes.find((x) => !x.free && ((x.fromSiteId === s.id && x.toSiteId === b.site.id) || (x.fromSiteId === b.site.id && x.toSiteId === s.id)));
      if (!r || r.path.length < 2) continue;
      const tiles = r.fromSiteId === s.id ? r.path : [...r.path].reverse();
      const pts = tiles.map((t) => g.screenOf(t.x, t.y, 0.45));
      const color = b.on ? COLORS.good : 0xffffff;
      const alpha = b.on ? 0.85 : 0.45;
      for (let i = 0; i < pts.length - 1; i++) {
        const p = pts[i];
        const q = pts[i + 1];
        if (p && q) im.line(0, p[0], p[1], q[0], q[1], color, alpha, 3);
      }
      const end = pts[pts.length - 1];
      const prev = pts[pts.length - 2];
      if (end && prev) {
        const dx = end[0] - prev[0];
        const dy = end[1] - prev[1];
        const len = Math.hypot(dx, dy) || 1;
        const ux = dx / len;
        const uy = dy / len;
        im.line(0, end[0], end[1], end[0] - ux * 11 - uy * 6, end[1] - uy * 11 + ux * 6, color, alpha, 3);
        im.line(0, end[0], end[1], end[0] - ux * 11 + uy * 6, end[1] - uy * 11 - ux * 6, color, alpha, 3);
      }
    }
  }

  // ---- tooltip ----

  private tooltip(W: number, H: number): void {
    const im = this.im;
    const g = this.game3d;
    const p = this.input.activePointer;
    const lines: { text: string; color?: number; bold?: boolean; size?: number }[] = [];

    const tipId = im.tipTarget;
    if (tipId?.startsWith('card')) {
      const tool = tipId.slice(4) as Tool;
      const info = this.cardInfo(tool);
      lines.push({ text: info.name, bold: true, size: 14 }, { text: info.blurb, color: COLORS.muted });
      if (info.locked) lines.push({ text: info.locked === 'Coming soon' ? 'Designed, not built yet' : `Unlocks at ${info.locked}`, color: COLORS.warn });
      for (const d of info.detail) lines.push({ text: d, color: COLORS.muted });
    } else if (tipId === 'questPill') {
      const tier = TIERS[g.world.tier];
      const next = nextQuest(g.world);
      if (tier) lines.push({ text: `Tier ${tier.tier}: ${tier.name}`, bold: true, size: 14 });
      if (next) {
        lines.push({ text: next.quest.label, bold: true }, { text: next.quest.hint, color: COLORS.muted });
        if (next.quest.reward > 0) lines.push({ text: `Reward $${fmt(next.quest.reward)}`, color: COLORS.warn });
      }
      lines.push({ text: 'Click for all quests', color: COLORS.muted });
    } else if (g.hover && !this.dragging && !p.isDown && (!isTouch() || g.pending)) {
      lines.push(...this.hoverLines(g.hover));
    }
    if (lines.length === 0) return;

    const pad = 12;
    const width = 250;
    let h = pad;
    const sizes = lines.map((l, i) => {
      const t = im.text(`tt${i}`, l.text, 0, -999, { size: l.size ?? 12, bold: l.bold, color: l.color, wrap: width - pad * 2, layer: 3 });
      return t;
    });
    sizes.forEach((s) => (h += s.h + 3));
    h += pad - 3;
    let x = p.x + 18;
    let y = tipId && tipId !== 'questPill' ? p.y - h - 14 : p.y + 20;
    if (x + width > W - 8) x = p.x - width - 14;
    if (y + h > H - 8) y = H - h - 8;
    if (y < TOP + 6) y = TOP + 6;
    im.rect(3, x, y, width, h, COLORS.panel, 0.97, 10, COLORS.line, 1);
    let cy = y + pad;
    lines.forEach((l, i) => {
      im.text(`tt${i}`, l.text, x + pad, cy, { size: l.size ?? 12, bold: l.bold, color: l.color, wrap: width - pad * 2, layer: 3 });
      cy += sizes[i].h + 3;
    });
  }

  private hoverLines(h: HoverInfo): { text: string; color?: number; bold?: boolean; size?: number }[] {
    const g = this.game3d;
    const w = g.world;
    const out: { text: string; color?: number; bold?: boolean; size?: number }[] = [];
    if (h.site) {
      const s = h.site;
      const def = SITE_DEFS[s.kind];
      out.push({ text: s.name, bold: true, size: 14 }, { text: `${def.label}${(def.dock && def.dock !== 'civic') || def.station ? '' : ` · Level ${s.level}`}`, color: COLORS.muted });
      const st = this.siteStatus(s);
      out.push({ text: st.text, color: st.color });
      const goods = Array.from(new Set([...produces(s), ...wants(w, s)])).filter((gd) => stockOf(s, gd) > 0 || (def.dock || def.station ? false : true));
      for (const gd of goods.slice(0, 4)) out.push({ text: `${GOODS[gd].label}  ${Math.floor(stockOf(s, gd))} / ${siteCap(w, s)}` });
      out.push({ text: `${byInput('Click', 'Tap')} to inspect`, color: COLORS.muted });
    } else if (h.place) {
      const p = h.place;
      out.push({ text: p.name, bold: true, size: 14 }, { text: `${TOWN_LEVELS[p.level - 1].name} · population ${fmt(TOWN_LEVELS[p.level - 1].pop)}`, color: COLORS.muted });
      const next = TOWN_LEVELS[p.level];
      if (next) out.push({ text: `Growth ${fmt(p.growth)} / ${fmt(next.growth)}`, color: COLORS.good });
      out.push({ text: `${byInput('Click', 'Tap')} to inspect`, color: COLORS.muted });
    } else if (h.node) {
      const q = NODE_QUALITY[h.node.quality];
      const used = w.sites.some((s) => s.nodeId === h.node!.id);
      out.push({ text: `${h.node.kind[0].toUpperCase()}${h.node.kind.slice(1)} node`, bold: true, size: 14 });
      out.push({ text: `${q.label} · ${q.mult >= 1 ? '+' : ''}${Math.round((q.mult - 1) * 100)}% output`, color: h.node.quality === 2 ? COLORS.good : h.node.quality === 0 ? COLORS.warn : COLORS.text });
      out.push({ text: used ? 'In use' : 'Free to build on', color: used ? COLORS.muted : COLORS.good });
    } else if (h.route) {
      const n = w.vehicles.filter((v) => v.routeId === h.route!.id).length;
      out.push({ text: h.route.mode === 'rail' ? 'Rail line' : h.route.grade === 'highway' ? 'Highway' : 'Road', bold: true, size: 14 }, { text: `${n} vehicle${n === 1 ? '' : 's'} on this route`, color: COLORS.muted });
    } else if (h.region && g.tool === 'select') {
      out.push({ text: h.region.name, bold: true, size: 14 }, { text: h.region.kind === 'land' ? 'Region' : h.region.kind[0].toUpperCase() + h.region.kind.slice(1), color: COLORS.muted });
    }
    if (h.error && g.tool !== 'select') out.push({ text: h.error, color: COLORS.bad });
    return out;
  }

  private siteStatus(s: Site): { text: string; color: number } {
    const w = this.game3d.world;
    const def = SITE_DEFS[s.kind];
    const cap = siteCap(w, s);
    if (def.dock) return { text: 'Open for deliveries', color: COLORS.good };
    if (def.produce) {
      if (stockOf(s, def.produce.good) >= cap) {
        const d = diagnoseAll(w, s);
        return { text: d.level === 'ok' ? 'Full: needs a truck to collect' : `Full: ${shortOf(d).toLowerCase()}`, color: COLORS.bad };
      }
      const d = diagnoseAll(w, s);
      return d.level === 'ok' ? { text: 'Producing', color: COLORS.good } : { text: shortOf(d), color: COLORS.warn };
    }
    if (def.recipe) {
      if (!s.making) return { text: 'Off: choose what to make below', color: COLORS.warn };
      const ok = Object.entries(def.recipe.inputs).every(([gd, n]) => stockOf(s, gd as Good) >= (n ?? 0));
      if (!ok) return { text: `Waiting for ${Object.keys(def.recipe.inputs).map((gd) => GOODS[gd as Good].label.toLowerCase()).join(' and ')}`, color: COLORS.warn };
      const full = Object.keys(def.recipe.outputs).some((gd) => stockOf(s, gd as Good) >= cap);
      if (full) return { text: 'Full: needs a truck to collect', color: COLORS.bad };
      const d = diagnoseAll(w, s);
      return d.level === 'ok' ? { text: 'Running', color: COLORS.good } : { text: shortOf(d), color: COLORS.warn };
    }
    if (def.hub) {
      const d = diagnoseAll(w, s);
      return { text: d.level === 'ok' ? 'Holding goods for your buyers' : shortOf(d), color: d.level === 'ok' ? COLORS.info : d.level === 'bad' ? COLORS.bad : COLORS.warn };
    }
    if (def.station) return { text: 'Trains unload here', color: COLORS.good };
    return { text: '', color: COLORS.text };
  }

  // ---- selection panel ----

  /** Where the selection panel is on screen this frame (for scrolling), and how far it is scrolled. */
  private panelRect: { x: number; y: number; w: number; h: number } | null = null;
  private panelScroll = 0;
  private panelKey = '';
  /** The Im the selection panel draws into: the clipped one, so a long panel scrolls. */
  private get pim(): Im {
    return this.cim;
  }

  private sidePanel(W: number, H: number): void {
    const g = this.game3d;
    this.planBudget = 1;
    const sel = g.selection;
    if (!sel) return;
    // On a phone the build tray takes the width: the panel waits until it is closed.
    if (this.menuOpen || (W < 640 && this.trayOpen())) {
      this.panelRect = null;
      return;
    }
    const w = g.world;
    const x = W - PANEL_W - 12;
    const y = TOP + 12;
    const im = this.im;
    let cy = y + 14;
    const px = x + 16;
    const inner = PANEL_W - 32;

    const site = sel.kind === 'site' ? w.sites.find((s) => s.id === sel.id) : undefined;
    const place = sel.kind === 'place' ? w.places.find((p) => p.id === sel.id) : undefined;
    // A town opens as a full menu, like the other pop-ups, instead of a panel at the side.
    if (place) {
      g.select(null);
      this.openManage(place.id);
      return;
    }
    if (!site && !place) {
      g.select(null);
      return;
    }

    // Draw content first into a measured column, then the frame behind it. A long panel scrolls inside the space above the dock.
    const key = sel.kind + sel.id;
    if (key !== this.panelKey) {
      this.panelKey = key;
      this.panelScroll = 0;
    }
    const maxH = Math.max(180, H - Math.max(this.bottomInset, this.rightInset) - y - 10);
    this.cim.clipBox = { x, y, w: PANEL_W, h: maxH };
    const contentH = site ? this.sitePanel(site, px, cy - this.panelScroll, inner) : this.placePanel(place!, px, cy - this.panelScroll, inner);
    const full = contentH + 28;
    const frameH = Math.min(full, maxH);
    const maxScroll = Math.max(0, full - frameH);
    this.panelScroll = Math.max(0, Math.min(maxScroll, this.panelScroll));
    im.rect(1, x, y, PANEL_W, frameH, COLORS.panel, 0.96, 14, COLORS.line, 1);
    im.block({ x, y, w: PANEL_W, h: frameH });
    this.panelRect = { x, y, w: PANEL_W, h: frameH };
    this.sheetCam.setVisible(true).setViewport(x, y + 2, PANEL_W, frameH - 4).setScroll(x, y + 2);
    if (maxScroll > 0) {
      const barH = Math.max(30, ((frameH - 20) * frameH) / full);
      const by = y + 10 + ((frameH - 20 - barH) * this.panelScroll) / maxScroll;
      im.rect(2, x + PANEL_W - 8, y + 10, 4, frameH - 20, 0xffffff, 0.06, 2);
      im.rect(2, x + PANEL_W - 8, by, 4, barH, 0xffffff, 0.3, 2);
    }
    const hov = im.hit('closePanel', x + PANEL_W - 38, y + 10, 26, 26, () => g.select(null));
    im.rect(2, x + PANEL_W - 38, y + 10, 26, 26, hov ? 0x2a3646 : 0x1b2430, 1, 13);
    im.line(2, x + PANEL_W - 31, y + 17, x + PANEL_W - 19, y + 29, COLORS.text, 1, 2);
    im.line(2, x + PANEL_W - 19, y + 17, x + PANEL_W - 31, y + 29, COLORS.text, 1, 2);
  }

  /** Returns the content height. */
  /** The side card for a selected building: what to do next, the flow, and the way into its dashboard. */
  private sitePanel(s: Site, x: number, y: number, w: number): number {
    const im = this.pim;
    const g = this.game3d;
    const world = g.world;
    const def = SITE_DEFS[s.kind];
    let cy = y;
    im.text('spName', s.name, x, cy, { size: 17, bold: true, wrap: w - 36, layer: 2 });
    cy += 24;
    im.text('spKind', `${def.label}${(def.dock && def.dock !== 'civic') || def.station ? '' : `  ·  Level ${s.level}`}`, x, cy, { size: 12, color: COLORS.muted, layer: 2 });
    cy += 24;
    if (def.dock || def.station) {
      const st = this.siteStatus(s);
      im.circle(2, x + 5, cy + 8, 4, st.color);
      im.text('spStatus', st.text, x + 16, cy, { size: 13, color: st.color, wrap: w - 16, layer: 2 });
      cy += 26;
      const goods = def.dock ? dockDemand(world, s) : [];
      const sellers = this.suppliersOf(s).length;
      im.text('spSum', def.dock ? `Buys ${goods.length} kinds of goods  ·  ${sellers} of yours sell here` : `${sellers} of your buildings send goods here`, x, cy, { size: 12, color: COLORS.muted, wrap: w, layer: 2 });
      cy += 26;
      this.button('spOpen', def.dock === 'civic' ? 'See what it buys' : def.dock ? 'Open market' : 'Open station', x, cy, w, 42, true, () => this.openDash(s.id), 'main');
      return cy + 50 - y;
    }
    cy += this.nextStepCard(s, x, cy, w) + 10;
    if (def.produce || def.recipe) cy += this.flowCard(s, x, cy, w) + 6;
    // One line on how it is doing, then the dashboard.
    const buyers = buyersFor(world, s).filter((b) => b.on).length;
    const trucks = fleetOf(world, s.id);
    const moving = trucks.filter((v) => v.routeId !== 0).length;
    im.text('spSum', `Selling to ${buyers}  ·  ${trucks.length} truck${trucks.length === 1 ? '' : 's'}${trucks.length ? `, ${moving} working` : ''}`, x, cy, { size: 12, color: COLORS.muted, layer: 2 });
    cy += 24;
    // What is on the road to this building, and whether it is held up waiting for supply.
    const coming = inboundTo(world, s);
    const waiting = diagnoseAll(world, s).level === 'wait';
    if (coming.length > 0 || waiting) {
      const total: Partial<Record<Good, number>> = {};
      for (const o of coming) total[o.good] = (total[o.good] ?? 0) + o.amount;
      const txt = coming.length
        ? `Coming in: ${Object.entries(total).map(([gd, n]) => `${Math.floor(n ?? 0)} ${GOODS[gd as Good].label.toLowerCase()}`).join(', ')} (${coming.length} truck${coming.length === 1 ? '' : 's'})`
        : 'Waiting on supply: nothing is on the road yet';
      im.rect(2, x, cy, w, 30, 0x14202f, 1, 15, COLORS.info, 1);
      im.circle(3, x + 16, cy + 15, 5, COLORS.info);
      im.text('spIn', txt, x + 30, cy + 8, { size: 11, bold: true, wrap: w - 40, layer: 3 });
      cy += 38;
    }
    this.button('spOpen', 'Open building', x, cy, w, 42, true, () => this.openDash(s.id), 'main');
    cy += 50;
    return cy - y;
  }

  /** The upgrade: the biggest button on a building's page, at the top, so going up a level is always the easy thing to find. */
  private upgradeBanner(s: Site, x: number, y: number, w: number): number {
    const im = this.pim;
    const g = this.game3d;
    const world = g.world;
    const h = 72;
    if (s.level >= 3) {
      im.rect(2, x, y, w, h, 0x12261f, 1, 16, COLORS.good, 1);
      im.text('ugT', 'Top level', x + 24, y + 16, { size: 20, bold: true, color: COLORS.good, layer: 3 });
      im.text('ugS', 'This building cannot be upgraded any further.', x + 24, y + 44, { size: 12, color: COLORS.muted, layer: 3 });
      return h;
    }
    const err = upgradeError(world, s.id);
    const can = !err;
    const next = s.level + 1;
    const boost = `Makes ${[1, 1.8, 3.2][s.level]}x as much and stores ${LEVEL_CAP[s.level]}x more.`;
    const hov = im.hit('upgrade', x, y, w, h, () => can && g.upgrade(s.id), 3);
    im.rect(2, x, y, w, h, can ? (hov ? 0xf4b84f : COLORS.accent) : 0x161d27, 1, 16, can ? COLORS.accent : COLORS.line, 1);
    im.text('ugT', `Upgrade to level ${next}`, x + 24, y + 14, { size: 22, bold: true, color: can ? 0x1b1204 : COLORS.muted, layer: 4 });
    im.text('ugS', can ? boost : `${err}. ${boost}`, x + 24, y + 44, { size: 12, color: can ? 0x3a2a0c : COLORS.warn, wrap: w - 220, layer: 4 });
    im.text('ugP', `$${fmt(upgradeCost(s))}`, x + w - 24, y + 20, { size: 26, bold: true, color: can ? 0x1b1204 : COLORS.muted, align: 'right', layer: 4 });
    return h;
  }

  /** Everything about a building that is not its buyers or its trucks: the flow or what it holds, and upgrades. */
  private infoColumn(s: Site, x: number, y: number, w: number): number {
    const im = this.pim;
    const g = this.game3d;
    const world = g.world;
    const def = SITE_DEFS[s.kind];
    const maker = !!(def.produce || def.recipe);
    let cy = y;
    if (def.real) {
      const role = def.railyard || def.port || def.airport ? 'IN: from your warehouses and producers.  OUT: by train, ship or plane to another terminal, then into town.' : 'IN: extra goods from your producers, and goods shipped here.  OUT: to markets, terminals and the factories next to it.';
      const t1 = im.text('rlA', def.real, x, cy, { size: 12, bold: true, color: COLORS.text, wrap: w, layer: 2 });
      const t2 = im.text('rlB', role, x, cy + t1.h + 4, { size: 11, color: COLORS.info, wrap: w, layer: 2 });
      cy += t1.h + t2.h + 14;
    }
    if (maker) cy += this.flowCard(s, x, cy, w, false) + 10;
    else if (def.dock) cy += this.dockTable(s, x, cy, w);
    else {
      im.line(2, x, cy, x + w, cy, COLORS.line, 1);
      cy += 10;
      im.text('spStoreH', def.station ? 'WAITING FOR A TRAIN' : 'IN STORE', x, cy, { size: 11, bold: true, color: COLORS.muted, layer: 2 });
      cy += 20;
      const cap = siteCap(world, s);
      const waiting = (gd: Good): number => (def.station ? (s.out?.[gd] ?? 0) : stockOf(s, gd));
      const goods = (def.hub ? GOOD_LIST.filter((gd) => waiting(gd) >= 1 || s.pull.includes(gd)) : Array.from(new Set([...produces(s), ...wants(world, s)]))).filter((gd) => !def.station || waiting(gd) >= 1);
      if (goods.length === 0) {
        im.text('spEmpty', 'Empty', x, cy, { size: 12, color: COLORS.muted, layer: 2 });
        cy += 22;
      }
      goods.slice(0, 12).forEach((gd) => {
        const n = waiting(gd);
        im.text(`spG${gd}`, GOODS[gd].label, x, cy, { size: 12, layer: 2 });
        im.bar(2, x + 90, cy + 5, w - 90 - 70, 7, n / cap, n / cap > 0.85 ? COLORS.bad : COLORS.good);
        im.text(`spN${gd}`, `${Math.floor(n)} / ${cap}`, x + w, cy, { size: 12, color: COLORS.muted, align: 'right', layer: 2 });
        cy += 22;
      });
    }

    if (def.station) {
      cy += 6;
      im.text('spStN', 'Factories in this town send their goods here once a track serves the station, and trains carry them away. Whatever a train brings is sold on to the town.', x, cy, { size: 11, color: COLORS.muted, wrap: w, layer: 2 });
      cy += 52;
    }

    if (def.hub) {
      cy += 6;
      im.text('spPullH', 'TAKES IN', x, cy, { size: 11, bold: true, color: COLORS.muted, layer: 2 });
      cy += 20;
      GOOD_LIST.forEach((gd, i) => {
        const col = i % 3;
        const row = Math.floor(i / 3);
        const bx = x + col * (w / 3);
        const by = cy + row * 26;
        const on = s.pull.includes(gd);
        const hov = im.hit(`pull${gd}`, bx, by, w / 3 - 4, 22, () => g.togglePull(s.id, gd, !on));
        im.rect(2, bx, by, w / 3 - 4, 22, on ? 0x1b3a36 : hov ? 0x1e2a38 : 0x161d27, 1, 8, on ? COLORS.good : COLORS.line, 1);
        im.text(`pullT${gd}`, `${on ? '✔ ' : ''}${GOODS[gd].label}`, bx + 6, by + 5, { size: 10, color: on ? COLORS.text : COLORS.muted, layer: 2 });
      });
      cy += Math.ceil(GOOD_LIST.length / 3) * 26 + 6;
      im.text('spPullN', 'A warehouse keeps the extra. Tick the goods it may take. It always takes what the factories next to it need.', x, cy, { size: 11, color: COLORS.muted, wrap: w, layer: 2 });
      cy += 34;
      const bw = (w - 16) / 3;
      const step = (id: string, label: string, bx: number, ok: boolean, fn: () => void): void => this.button(id, label, bx, cy, bw, 30, ok, fn);
      if (s.kind === 'hub') {
        const mode = s.hubMode ?? 'overflow';
        const trig = Math.round((s.trigger ?? HUB_TRIGGER) * 100);
        im.text('hbH', 'WHEN IT TAKES GOODS', x, cy, { size: 11, bold: true, color: COLORS.muted, layer: 2 });
        cy += 20;
        step('hbM', mode === 'overflow' ? 'Overflow only' : 'Everything', x, true, () => setHubOptions(world, s.id, { hubMode: mode === 'overflow' ? 'all' : 'overflow' }));
        if (mode === 'overflow') {
          step('hbL', '- Earlier', x + bw + 8, trig > 20, () => setHubOptions(world, s.id, { trigger: (s.trigger ?? HUB_TRIGGER) - 0.1 }));
          step('hbU', 'Later +', x + (bw + 8) * 2, trig < 100, () => setHubOptions(world, s.id, { trigger: (s.trigger ?? HUB_TRIGGER) + 0.1 }));
        }
        cy += 36;
        im.text('hbN', mode === 'overflow' ? `Takes a supplier's goods once its store is ${trig}% full, so your buyers get first pick. Sell to buyers again when they have room.` : 'Takes everything its suppliers offer, whether their buyers are full or not.', x, cy, { size: 11, color: COLORS.muted, wrap: w, layer: 2 });
        cy += 40;
      } else if (def.railyard || def.port || def.airport) {
        const ml = Math.round((s.minLoad ?? 0) * 100);
        im.text('ydH', 'WHEN VEHICLES LEAVE', x, cy, { size: 11, bold: true, color: COLORS.muted, layer: 2 });
        cy += 20;
        step('ydL', '- Sooner', x, ml > 0, () => setHubOptions(world, s.id, { minLoad: (s.minLoad ?? 0) - 0.25 }));
        im.text('ydV', ml === 0 ? 'Any load' : `${ml}% full`, x + bw + 8 + bw / 2, cy + 8, { size: 12, bold: true, align: 'center', layer: 3 });
        step('ydU', 'Fuller +', x + (bw + 8) * 2, ml < 100, () => setHubOptions(world, s.id, { minLoad: (s.minLoad ?? 0) + 0.25 }));
        cy += 36;
        im.text('ydN', ml === 0 ? 'Vehicles leave with whatever is waiting. Raise this to save trips and wait for a full load.' : `Vehicles wait for ${ml}% of their capacity before leaving, unless the store is nearly full.`, x, cy, { size: 11, color: COLORS.muted, wrap: w, layer: 2 });
        cy += 40;
      }
    }

    if (!def.dock && !def.station) {
      cy += 4;
      const pause = !!def.recipe && !!s.making;
      const n = pause ? 2 : 1;
      const gap = 10;
      const bw = (w - gap * (n - 1)) / n;
      let bx = x;
      if (pause) {
        this.button('flGo', 'Pause production', bx, cy, bw, 36, true, () => g.making(s.id, false));
        bx += bw + gap;
      }
      const dh = im.hit('demolish', bx, cy, bw, 36, () => g.demolish(s.id));
      im.rect(2, bx, cy, bw, 36, dh ? 0x4a2420 : 0x2a1a1a, 1, 10, COLORS.bad, 0.6);
      im.text('demT', `Demolish   +$${fmt(demolishRefund(s))}`, bx + bw / 2, cy + 10, { size: 12, bold: true, color: COLORS.bad, align: 'center', layer: 3 });
      cy += 44;
    }
    return cy - y;
  }

  // ---- building dashboard: a full-page window for one building ----

  /** The building whose dashboard is open, or null. */
  private dash: number | null = null;
  private dashScroll = 0;
  private dashMax = 0;

  private dashPage = 'overview';
  private dashPageFor = -1;

  private openDash(id: number): void {
    this.graphicsOpen = false;
    this.dash = id;
    this.dashScroll = 0;
    this.dashPage = 'overview';
    this.sheet = null;
    this.menuOpen = false;
  }

  private dashboard(W: number, H: number): void {
    const g = this.game3d;
    const world = g.world;
    const s = this.dash === null ? undefined : siteById(world, this.dash);
    if (!s) {
      this.dash = null;
      return;
    }
    this.planBudget = 2;
    const im = this.im;
    const def = SITE_DEFS[s.kind];
    const x = 12;
    const y = TOP + 6;
    const w = W - 24;
    const h = H - y - 12;
    im.rect(1, x, y, w, h, COLORS.panel, 0.98, 18, COLORS.line, 1);
    im.block({ x, y, w, h });

    // Header, fixed: name, what it is, and the way out.
    const nameH = im.text('dhName', s.name, x + 22, y + 16, { size: 22, bold: true, wrap: w - 220, layer: 2 }).h;
    const subY = y + 20 + Math.max(26, nameH);
    const node = s.nodeId === null ? undefined : world.nodes.find((n) => n.id === s.nodeId);
    const town = siteTown(world, s);
    const sub = [def.label, (def.dock && def.dock !== 'civic') || def.station ? '' : `Level ${s.level}`, node ? `${NODE_QUALITY[node.quality].label} ${node.kind} spot` : '', town ? `in ${town.name}` : ''].filter(Boolean).join('  ·  ');
    const subH = im.text('dhSub', sub, x + 22, subY, { size: 13, color: COLORS.muted, wrap: w - 220, layer: 2 }).h;
    const headH = Math.max(72, subY - y + subH + 12);
    const mh = im.hit('dhMap', x + w - 168, y + 16, 108, 40, () => {
      this.dash = null;
      g.lookAt(s.x, s.y, 45, g.cam.heading, g.cam.pitchManual);
    }, 3);
    im.rect(3, x + w - 168, y + 16, 108, 40, mh ? 0x2a3646 : 0x1b2430, 1, 20, COLORS.line, 1);
    im.text('dhMapT', 'Show on map', x + w - 114, y + 28, { size: 12, bold: true, align: 'center', layer: 3 });
    const ch = im.hit('dhClose', x + w - 52, y + 16, 40, 40, () => (this.dash = null), 3);
    im.rect(3, x + w - 52, y + 16, 40, 40, ch ? 0x2a3646 : 0x1b2430, 1, 20);
    im.line(3, x + w - 38, y + 30, x + w - 26, y + 42, COLORS.text, 1, 2.5);
    im.line(3, x + w - 26, y + 30, x + w - 38, y + 42, COLORS.text, 1, 2.5);
    im.line(2, x + 14, y + headH, x + w - 14, y + headH, COLORS.line, 1);

    // Pages: one thing at a time, so nothing is crowded. The tab row stays put while the page scrolls.
    if (this.dashPageFor !== s.id) {
      this.dashPageFor = s.id;
      this.dashPage = def.dock && def.dock !== 'civic' ? 'buys' : 'overview';
      this.dashScroll = 0;
    }
    const maker = !def.dock && !def.station;
    const pages: [string, string][] = maker
      ? [
          ['overview', 'Overview'],
          ...(def.hub ? [['supply', `Businesses  ·  ${this.businessCount(s)}`] as [string, string]] : []),
          ['sell', `${def.hub ? 'Sells to' : 'Selling'}  ·  ${buyersFor(world, s, 0).filter((b) => b.on).length}`],
          ['trucks', `Trucks  ·  ${fleetOf(world, s.id).length}`],
        ]
      : def.dock
        ? [['buys', 'What it buys'], ['sellers', `Who sells here  ·  ${this.suppliersOf(s).length}`], ['town', 'The town']]
        : [];
    if (!pages.some(([id]) => id === this.dashPage) && pages.length) this.dashPage = pages[0][0];
    let tabsH = 0;
    if (pages.length) {
      const tw = Math.min(250, (w - 44 - 8 * (pages.length - 1)) / pages.length);
      pages.forEach(([id, label], i) => {
        const tx = x + 22 + i * (tw + 8);
        const on = this.dashPage === id;
        const hov = im.hit(`dp${id}`, tx, y + headH + 10, tw, 42, () => {
          this.dashPage = id;
          this.dashScroll = 0;
        }, 3);
        im.rect(3, tx, y + headH + 10, tw, 42, on ? 0x1f2c3a : hov ? 0x1a2431 : 0x131b25, 1, 14, on ? COLORS.accent : COLORS.line, 1, on ? 2 : 1);
        im.text(`dpT${id}`, label, tx + tw / 2, y + headH + 22, { size: 15, bold: true, color: on ? COLORS.accent : COLORS.text, align: 'center', layer: 4 });
      });
      tabsH = 56;
    }

    // Body, scrolling: one page at a time.
    const top = y + headH + 8 + tabsH;
    const bottom = y + h - 10;
    this.cim.clipBox = { x, y: top, w, h: bottom - top };
    this.sheetCam.setVisible(true).setViewport(x, top, w, bottom - top).setScroll(x, top);
    const pad = 22;
    const inner = w - pad * 2;
    let cy = top + 6 - this.dashScroll;
    type Col = (cx: number, yy: number, ww: number) => number;
    const info: Col = (cx, yy, ww) => {
      const t = def.dock ? 'WHAT IT BUYS' : def.station ? 'THE STATION' : def.produce || def.recipe ? 'PRODUCTION' : 'STORAGE';
      const top2 = this.sectionHead('dcA', t, cx, yy + 6, ww);
      return top2 - yy + this.infoColumn(s, cx, top2, ww);
    };
    const toggle: Col = (cx, yy, ww) => (hasByLine(s) ? this.lineToggle(s, cx, yy, ww) : 0);
    let used = 0;
    const add = (part: Col): void => {
      used += part(x + pad, cy + used, inner) + 12;
    };
    if (maker) {
      if (this.dashPage === 'overview') {
        add((cx, yy, ww) => this.upgradeBanner(s, cx, yy, ww));
        add((cx, yy, ww) => this.nextStepCard(s, cx, yy, ww));
        add((cx, yy, ww) => this.statStrip(s, cx, yy, ww));
        add((cx, yy, ww) => this.inventorySection(s, cx, yy, ww));
        add(info);
      } else if (this.dashPage === 'supply') {
        add((cx, yy, ww) => this.businessSection(s, cx, yy + 6, ww) + 6);
      } else if (this.dashPage === 'sell') {
        add(toggle);
        add((cx, yy, ww) => this.buyerSection(s, cx, yy + 6, ww) + 6);
        add((cx, yy, ww) => this.salesSection(s, cx, yy + 6, ww) + 6);
        add((cx, yy, ww) => this.historySection(s, cx, yy + 6, ww) + 6);
      } else {
        add(toggle);
        add((cx, yy, ww) => this.truckSection(s, cx, yy + 6, ww) + 6);
        add((cx, yy, ww) => this.inboundSection(s, cx, yy + 6, ww) + 6);
      }
    } else if (def.dock) {
      if (this.dashPage === 'buys') {
        add((cx, yy) => {
          const st = this.siteStatus(s);
          this.pim.circle(2, cx + 5, yy + 8, 4, st.color);
          this.pim.text('dsStatus', st.text, cx + 16, yy, { size: 14, color: st.color, layer: 2 });
          return 30;
        });
        add((cx, yy, ww) => this.dockStrip(s, cx, yy, ww));
        add(info);
      } else if (this.dashPage === 'sellers') {
        add((cx, yy, ww) => this.suppliersSection(s, cx, yy + 6, ww) + 6);
      } else {
        add((cx, yy, ww) => this.townSection(s, cx, yy + 6, ww) + 6);
      }
    } else {
      add((cx, yy) => {
        const st = this.siteStatus(s);
        this.pim.circle(2, cx + 5, yy + 8, 4, st.color);
        this.pim.text('dsStatus', st.text, cx + 16, yy, { size: 14, color: st.color, layer: 2 });
        return 30;
      });
      add(info);
      add((cx, yy, ww) => this.suppliersSection(s, cx, yy + 6, ww) + 6);
      add((cx, yy, ww) => this.townSection(s, cx, yy + 6, ww) + 6);
    }
    const hA = used;
    const hB = 0;
    const hC = 0;
    const contentH = cy + this.dashScroll - top + Math.max(hA, hB, hC) + 20;
    this.dashMax = Math.max(0, contentH - (bottom - top));
    this.dashScroll = Math.max(0, Math.min(this.dashMax, this.dashScroll));
    if (this.dashMax > 0) {
      const trackH = bottom - top - 8;
      const barH = Math.max(36, (trackH * (bottom - top)) / contentH);
      const by = top + 4 + (trackH - barH) * (this.dashScroll / this.dashMax);
      im.rect(3, x + w - 10, top + 4, 4, trackH, 0xffffff, 0.06, 2);
      im.rect(3, x + w - 10, by, 4, barH, 0xffffff, 0.3, 2);
    }
  }

  /** A market's goods in one table: how much it holds, how keen it is, and what it pays. */
  private dockTable(s: Site, x: number, y: number, w: number): number {
    const im = this.pim;
    const world = this.game3d.world;
    const cap = siteCap(world, s);
    let cy = y;
    const wide = w >= 380;
    for (const gd of dockDemand(world, s)) {
      const n = stockOf(s, gd);
      const dm = this.demand(s, gd);
      im.rect(2, x, cy, w, 30, 0x131a24, 1, 8);
      im.text(`dt${gd}n`, GOODS[gd].label, x + 10, cy + 8, { size: 12, bold: true, layer: 3 });
      const bx = x + 100;
      const bw = wide ? w - 100 - 210 : w - 100 - 76;
      im.bar(3, bx, cy + 12, bw, 6, n / cap, dm.color);
      if (wide) im.text(`dt${gd}d`, dm.label, bx + bw + 12, cy + 8, { size: 11, color: dm.color, layer: 3 });
      im.text(`dt${gd}p`, `$${unitPrice(world, s, gd).toFixed(1)}`, x + w - 10, cy + 8, { size: 12, bold: true, color: COLORS.warn, align: 'right', layer: 3 });
      cy += 34;
    }
    cy += 4;
    im.text('dtNote', 'The town uses up what it buys, so it keeps wanting more. A fuller stall pays less: sell it something else for a while.', x, cy, { size: 11, color: COLORS.muted, wrap: w, layer: 2 });
    return cy + 40 - y;
  }

  /** Four numbers across the top of a market or yard: what it buys, who sells to it, what it has paid you, and its town. */
  private dockStrip(s: Site, x: number, y: number, w: number): number {
    const im = this.pim;
    const world = this.game3d.world;
    const sellers = this.suppliersOf(s);
    const paid = sellers.reduce((n, o) => n + (o.sales?.[s.id]?.money ?? 0), 0);
    const town = siteTown(world, s);
    const tiles: [string, string, number][] = [
      ['KINDS IT BUYS', String(wants(world, s).length), COLORS.text],
      ['BUILDINGS SELLING HERE', String(sellers.length), sellers.length ? COLORS.good : COLORS.warn],
      ['PAID TO YOU', `$${fmt(paid)}`, COLORS.good],
      [town ? `${town.name.toUpperCase()}` : 'TOWN', town ? TOWN_LEVELS[town.level - 1].name : '', COLORS.text],
    ];
    const gap = 10;
    const cols = w < 560 ? 2 : tiles.length;
    const tw = (w - gap * (cols - 1)) / cols;
    tiles.forEach(([label, value, color], i) => {
      const tx = x + (i % cols) * (tw + gap);
      const ty = y + Math.floor(i / cols) * 66;
      im.rect(2, tx, ty, tw, 58, 0x131a24, 1, 10, COLORS.line, 1);
      im.text(`dk${i}v`, value, tx + 14, ty + 9, { size: 22, bold: true, color, layer: 3 });
      im.text(`dk${i}l`, label, tx + 14, ty + 38, { size: 10, bold: true, color: COLORS.muted, layer: 3 });
    });
    return 58 + (Math.ceil(tiles.length / cols) - 1) * 66;
  }

  /** Your buildings that sell to this one: joined to it, with the sale switched on. */
  private suppliersOf(s: Site): Site[] {
    const world = this.game3d.world;
    return world.sites.filter((o) => o.id !== s.id && buyersFor(world, o, 0).some((b) => b.site.id === s.id && b.on));
  }

  /** How many of your businesses are joined to a warehouse or terminal and switched on to send it goods. */
  private businessCount(s: Site): number {
    const world = this.game3d.world;
    return world.sites.filter((o) => o.id !== s.id && !SITE_DEFS[o.kind].dock && !SITE_DEFS[o.kind].station && (hasByLine(o) ? (['main', 'by'] as Line[]) : (['main'] as Line[])).some((ln) => sellTargets(world, o, ln).some((t) => t.site.id === s.id && t.on))).length;
  }

  private suppliersSection(s: Site, x: number, y: number, w: number): number {
    const im = this.pim;
    let cy = this.sectionHead('suH', 'WHO SELLS HERE', x, y, w);
    const list = this.suppliersOf(s);
    if (list.length === 0) {
      im.text('suN', 'None of your buildings sell here yet. Open a factory or a camp, and tap Sell here next to this one.', x, cy, { size: 11, color: COLORS.muted, wrap: w, layer: 2 });
      return cy + 40 - y;
    }
    const sGap = 12;
    const sCols = Math.max(1, Math.min(3, Math.floor((w + sGap) / (300 + sGap))));
    const sW = (w - sGap * (sCols - 1)) / sCols;
    list.forEach((o, k) => {
      const rec = o.sales?.[s.id];
      const sx = x + (k % sCols) * (sW + sGap);
      const sy = cy + Math.floor(k / sCols) * 58;
      im.rect(2, sx, sy, sW, 50, 0x12261f, 1, 10, COLORS.good, 1);
      im.text(`su${o.id}n`, o.name, sx + 10, sy + 8, { size: 12, bold: true, wrap: sW - 100, layer: 3 });
      im.text(`su${o.id}s`, rec ? `Sold ${fmt(rec.units)} for $${fmt(rec.money)}` : 'Nothing sold yet', sx + 10, sy + 28, { size: 11, color: rec ? COLORS.good : COLORS.muted, layer: 3 });
      this.button(`su${o.id}o`, 'Open', sx + sW - 80, sy + 9, 70, 32, true, () => this.openDash(o.id));
    });
    cy += Math.ceil(list.length / sCols) * 58;
    return cy - y;
  }

  // ---- list filters: search, status, type, goods and sort for the long lists in a building's dashboard ----

  private filters: Record<FilterPage, ListFilter> = { supply: newFilter('name'), sell: newFilter('best') };
  private searchEl: HTMLInputElement | null = null;
  private searchFor: FilterPage | null = null;
  private searchSeen = false;

  /** A real text box laid over the canvas, so typing works like any search field and never fires the game's hotkeys. */
  private searchBox(page: FilterPage, x: number, y: number, w: number, h: number): void {
    const im = this.pim;
    const f = this.filters[page];
    const focused = !!this.searchEl && document.activeElement === this.searchEl && this.searchFor === page;
    im.rect(2, x, y, w, h, 0x0d1118, 1, 10, focused ? COLORS.accent : COLORS.line, 1, focused ? 2 : 1);
    im.circle(3, x + 16, y + h / 2 - 1, 5, COLORS.muted, 0.9);
    im.circle(3, x + 16, y + h / 2 - 1, 3, 0x0d1118);
    im.line(3, x + 19, y + h / 2 + 2, x + 23, y + h / 2 + 6, COLORS.muted, 0.9, 2);
    const clip = this.cim.clipBox;
    if (clip && (y < clip.y || y + h > clip.y + clip.h)) return;
    if (!this.searchEl) {
      const el = document.createElement('input');
      el.type = 'search';
      el.placeholder = 'Search by name, kind, town or good';
      el.spellcheck = false;
      el.autocomplete = 'off';
      Object.assign(el.style, { position: 'fixed', zIndex: '20', background: 'transparent', border: 'none', outline: 'none', color: '#eeeae1', font: '13px system-ui, sans-serif', padding: '0', margin: '0' });
      el.addEventListener('input', () => {
        if (this.searchFor) this.filters[this.searchFor].q = el.value;
      });
      const stop = (e: KeyboardEvent): void => {
        e.stopPropagation();
        if (e.type === 'keydown' && (e.key === 'Escape' || e.key === 'Enter')) el.blur();
      };
      el.addEventListener('keydown', stop);
      el.addEventListener('keyup', stop);
      document.body.appendChild(el);
      this.searchEl = el;
    }
    const el = this.searchEl;
    if (this.searchFor !== page) {
      this.searchFor = page;
      el.value = f.q;
    }
    const r = this.game.canvas.getBoundingClientRect();
    const k = r.width / this.scale.width;
    Object.assign(el.style, { display: 'block', left: `${r.left + (x + 32) * k}px`, top: `${r.top + y * k}px`, width: `${(w - 40) * k}px`, height: `${h * k}px`, fontSize: `${13 * k}px` });
    this.searchSeen = true;
  }

  private hideSearch(): void {
    if (!this.searchEl || this.searchEl.style.display === 'none') return;
    this.searchEl.blur();
    this.searchEl.style.display = 'none';
  }

  /** A labelled row of chips, one of which is picked. Wraps onto more rows when it runs out of room. Returns its height. */
  private chipRow(id: string, label: string, opts: { v: string; label: string; n?: number; color?: number }[], cur: string, pick: (v: string) => void, x: number, y: number, w: number): number {
    const im = this.pim;
    const lw = 72;
    im.text(`${id}L`, label, x, y + 7, { size: 10, bold: true, color: COLORS.muted, layer: 2 });
    let cx = x + lw;
    let cy = y;
    opts.forEach((o) => {
      const on = o.v === cur;
      const txt = o.n === undefined ? o.label : `${o.label}  ${o.n}`;
      const cw = Math.ceil(txt.length * 5.9) + (o.color !== undefined ? 32 : 20);
      if (cx + cw > x + w && cx > x + lw) {
        cx = x + lw;
        cy += 30;
      }
      const hov = im.hit(`${id}${o.v}`, cx, cy, cw, 26, () => pick(on && o.v !== 'all' ? 'all' : o.v), 3);
      im.rect(3, cx, cy, cw, 26, on ? 0x2f9a69 : hov ? 0x243246 : 0x161d27, 1, 13, on ? 0x2f9a69 : COLORS.line, 1);
      let tx = cx + 11;
      if (o.color !== undefined) {
        im.circle(4, tx + 4, cy + 13, 5, o.color);
        tx += 13;
      }
      im.text(`${id}${o.v}T`, txt, tx, cy + 6, { size: 11, bold: on, color: on ? 0xffffff : o.n === 0 ? COLORS.muted : COLORS.text, layer: 4 });
      cx += cw + 6;
    });
    return cy + 30 - y;
  }

  /**
   * The filter bar over a list: search, the chip rows, a count of what is shown and a way to clear it all. Rows are
   * [id, label, options, current, setter]. Returns its height.
   */
  private filterBar(page: FilterPage, rows: [string, string, { v: string; label: string; n?: number; color?: number }[], string, (v: string) => void][], shown: number, total: number, x: number, y: number, w: number): number {
    const im = this.pim;
    const f = this.filters[page];
    let cy = y;
    const busy = isFiltered(f);
    const cw = busy ? 120 : 0;
    this.searchBox(page, x, cy, w - (busy ? cw + 8 : 0), 34);
    if (busy) {
      this.button(`fx${page}`, 'Clear filters', x + w - cw, cy + 1, cw, 32, true, () => {
        this.filters[page] = newFilter(f.sort);
        if (this.searchEl && this.searchFor === page) this.searchEl.value = '';
      });
    }
    cy += 42;
    for (const [id, label, opts, cur, set] of rows) {
      if (opts.length <= 1 && id !== 'sort') continue;
      cy += this.chipRow(`fl${page}${id}`, label, opts, cur, set, x, cy, w) + 2;
    }
    im.text(`fl${page}N`, shown === total ? `Showing all ${total}` : `Showing ${shown} of ${total}`, x, cy + 2, { size: 11, bold: true, color: shown ? COLORS.info : COLORS.warn, layer: 2 });
    return cy + 24 - y;
  }

  /** Tiles between two buildings, going round the globe the short way. */
  private tilesApart(a: Site, b: Site): number {
    return Math.hypot(wrapDx(this.game3d.world, a.x, b.x), a.y - b.y);
  }

  /**
   * A warehouse or terminal's own suppliers: every building of yours joined to it that could send it goods. Each card says
   * how that business is doing, and lets the player stop or start its deliveries here, run or pause a factory, or open it.
   */
  private businessSection(s: Site, x: number, y: number, w: number): number {
    const im = this.pim;
    const g = this.game3d;
    const world = g.world;
    let cy = this.sectionHead('bzH', 'YOUR BUSINESSES', x, y, w);
    const lines = (o: Site): Line[] => (hasByLine(o) ? ['main', 'by'] : ['main']);
    const all = world.sites
      .filter((o) => o.id !== s.id && !SITE_DEFS[o.kind].dock && !SITE_DEFS[o.kind].station)
      .map((o) => ({ o, ls: lines(o).filter((ln) => sellTargets(world, o, ln).some((t) => t.site.id === s.id)) }))
      .filter((e) => e.ls.length > 0);
    if (all.length === 0) {
      im.text('bzN', `No business of yours is joined to this ${SITE_DEFS[s.kind].label.toLowerCase()} yet. Build a road from a farm, camp or factory to it, and its goods can come here.`, x, cy, { size: 11, color: COLORS.muted, wrap: w, layer: 2 });
      return cy + 40 - y;
    }
    const sending = all.filter((e) => e.ls.some((ln) => sendAllowed(e.o, s, ln))).length;
    im.text('bzS', `${sending} of ${all.length} send goods here. Switch a business off to keep its goods for your other buyers.`, x, cy, { size: 11, color: COLORS.muted, wrap: w, layer: 2 });
    cy += 26;

    // Filters.
    const f = this.filters.supply;
    const rows = all.map((e) => {
      const d = SITE_DEFS[e.o.kind];
      const st = this.siteStatus(e.o);
      const goods = Array.from(new Set(e.ls.flatMap((ln) => lineGoods(e.o, ln))));
      return {
        ...e,
        on: e.ls.some((ln) => sendAllowed(e.o, s, ln)),
        issue: st.color === COLORS.warn || st.color === COLORS.bad,
        type: d.hub ? 'storage' : d.category ?? 'other',
        goods,
        sent: e.o.sales?.[s.id]?.units ?? 0,
        far: this.tilesApart(s, e.o),
        text: [e.o.name, d.label, siteTown(world, e.o)?.name ?? '', ...goods.map((gd) => GOODS[gd].label)].join(' ').toLowerCase(),
      };
    });
    type Row = (typeof rows)[number];
    const passes = (r: Row, skip: keyof ListFilter | null): boolean =>
      (skip === 'q' || !f.q.trim() || f.q.toLowerCase().trim().split(/\s+/).every((word) => r.text.includes(word))) &&
      (skip === 'status' || f.status === 'all' || (f.status === 'on' ? r.on : f.status === 'off' ? !r.on : r.issue)) &&
      (skip === 'type' || f.type === 'all' || r.type === f.type) &&
      (skip === 'good' || f.good === 'all' || r.goods.includes(f.good as Good));
    const count = (skip: keyof ListFilter, test: (r: Row) => boolean): number => rows.filter((r) => passes(r, skip) && test(r)).length;
    const types = (['production', 'processing', 'manufacturing', 'heavy', 'storage', 'other'] as const).filter((t) => rows.some((r) => r.type === t));
    const goodsHere = GOOD_LIST.filter((gd) => rows.some((r) => r.goods.includes(gd)));
    const set = (k: keyof ListFilter) => (v: string): void => void ((this.filters.supply as unknown as Record<string, string>)[k] = v);
    const list = rows.filter((r) => passes(r, null));
    const byName = (a: Row, b: Row): number => a.o.name.localeCompare(b.o.name);
    list.sort(f.sort === 'sent' ? (a, b) => b.sent - a.sent || byName(a, b) : f.sort === 'level' ? (a, b) => b.o.level - a.o.level || byName(a, b) : f.sort === 'near' ? (a, b) => a.far - b.far : f.sort === 'issue' ? (a, b) => Number(b.issue) - Number(a.issue) || byName(a, b) : byName);
    cy += this.filterBar('supply', [
      ['status', 'STATUS', [
        { v: 'all', label: 'All', n: count('status', () => true) },
        { v: 'on', label: 'Sending here', n: count('status', (r) => r.on) },
        { v: 'off', label: 'Switched off', n: count('status', (r) => !r.on) },
        { v: 'issue', label: 'Needs attention', n: count('status', (r) => r.issue) },
      ], f.status, set('status')],
      ['type', 'TYPE', [{ v: 'all', label: 'All', n: count('type', () => true) }, ...types.map((t) => ({ v: t, label: TYPE_LABEL[t], n: count('type', (r) => r.type === t) }))], f.type, set('type')],
      ['good', 'GOODS', [{ v: 'all', label: 'All' }, ...goodsHere.map((gd) => ({ v: gd, label: GOODS[gd].label, n: count('good', (r) => r.goods.includes(gd)), color: GOODS[gd].color })).filter((o) => o.n > 0 || o.v === f.good)], f.good, set('good')],
      ['sort', 'SORT BY', [{ v: 'name', label: 'Name' }, { v: 'sent', label: 'Most sent here' }, { v: 'near', label: 'Nearest' }, { v: 'level', label: 'Level' }, { v: 'issue', label: 'Problems first' }], f.sort, (v) => (f.sort = v === 'all' ? 'name' : v)],
    ], list.length, rows.length, x, cy, w);
    if (list.length) {
      const offN = list.filter((r) => !r.on).length;
      const onN = list.length - offN;
      const bw = Math.min(220, (w - 8) / 2);
      this.button('bzAllOn', `Send all shown  (${offN})`, x, cy, bw, 32, offN > 0, () => list.forEach((r) => !r.on && r.ls.forEach((ln) => g.sendTo(r.o.id, s.id, true, ln))), 'on');
      this.button('bzAllOff', `Stop all shown  (${onN})`, x + bw + 8, cy, bw, 32, onN > 0, () => list.forEach((r) => r.on && r.ls.forEach((ln) => g.sendTo(r.o.id, s.id, false, ln))));
      cy += 42;
    } else {
      im.text('bzNone', 'No business matches these filters.', x, cy + 4, { size: 12, color: COLORS.warn, layer: 2 });
      return cy + 34 - y;
    }
    const gap = 12;
    const cols = Math.max(1, Math.min(3, Math.floor((w + gap) / (380 + gap))));
    const cw = (w - gap * (cols - 1)) / cols;
    const ch = 104;
    list.forEach(({ o, ls }, k) => {
      const bx = x + (k % cols) * (cw + gap);
      const by = cy + Math.floor(k / cols) * (ch + gap);
      const d = SITE_DEFS[o.kind];
      const on = ls.some((ln) => sendAllowed(o, s, ln));
      const st = this.siteStatus(o);
      const id = `bz${o.id}`;
      im.rect(2, bx, by, cw, ch, on ? 0x12261f : 0x131a24, 1, 10, on ? COLORS.good : COLORS.line, 1);
      im.text(`${id}n`, o.name, bx + 10, by + 8, { size: 12, bold: true, wrap: cw - 120, layer: 3 });
      im.text(`${id}k`, `${d.label}  ·  Level ${o.level}`, bx + cw - 10, by + 8, { size: 11, color: COLORS.muted, align: 'right', layer: 3 });
      im.circle(3, bx + 15, by + 34, 4, st.color);
      im.text(`${id}s`, st.text, bx + 26, by + 27, { size: 11, color: st.color, wrap: cw - 36, layer: 3 });
      const goods = ls.flatMap((ln) => lineGoods(o, ln));
      const held = goods.filter((gd) => stockOf(o, gd) >= 1);
      const what = d.hub ? (held.length ? held.slice(0, 3).map((gd) => `${GOODS[gd].label.toLowerCase()} ${Math.floor(stockOf(o, gd))}`).join(', ') : 'nothing in store') : goods.slice(0, 2).map((gd) => `${GOODS[gd].label.toLowerCase()} ${Math.floor(stockOf(o, gd))}/${siteCap(world, o)}`).join(', ');
      const rec = o.sales?.[s.id];
      im.text(`${id}g`, `${d.hub ? 'Holds' : 'Makes'} ${what}${rec && rec.units > 0 ? `  ·  sent here ${fmt(rec.units)}` : ''}`, bx + 10, by + 46, { size: 11, color: COLORS.muted, wrap: cw - 20, layer: 3 });
      const ry = by + ch - 40;
      const nb = d.recipe ? 3 : 2;
      const bw = (cw - 20 - 8 * (nb - 1)) / nb;
      let tx = bx + 10;
      this.button(`${id}t`, on ? 'Sending here' : 'Send here', tx, ry, bw, 32, true, () => ls.forEach((ln) => g.sendTo(o.id, s.id, !on, ln)), on ? 'on' : 'plain');
      tx += bw + 8;
      if (d.recipe) {
        this.button(`${id}m`, o.making ? 'Pause' : 'Run', tx, ry, bw, 32, true, () => g.making(o.id, !o.making), o.making ? 'plain' : 'on');
        tx += bw + 8;
      }
      this.button(`${id}o`, 'Open', tx, ry, bw, 32, true, () => this.openDash(o.id));
    });
    cy += Math.ceil(list.length / cols) * (ch + gap);
    return cy - y;
  }

  /** The town a market or station belongs to: how big it is, how close to growing, and the way to manage it. */
  private townSection(s: Site, x: number, y: number, w: number): number {
    const im = this.pim;
    const world = this.game3d.world;
    const p = siteTown(world, s);
    if (!p) return 0;
    let cy = this.sectionHead('twH', 'THE TOWN', x, y, w);
    const lv = TOWN_LEVELS[p.level - 1];
    const next = TOWN_LEVELS[p.level];
    im.text('twN', p.name, x, cy, { size: 15, bold: true, layer: 2 });
    cy += 22;
    im.text('twL', `${lv.name}  ·  population ${fmt(lv.pop)}`, x, cy, { size: 12, color: COLORS.muted, layer: 2 });
    cy += 24;
    if (next) {
      const kinds = GOOD_LIST.filter((gd) => (p.delivered[gd] ?? 0) > 0).length;
      im.text('twG', `Growing into a ${next.name}`, x, cy, { size: 12, layer: 2 });
      cy += 20;
      im.bar(2, x, cy + 2, w - 90, 8, p.growth / next.growth, COLORS.good);
      im.text('twGv', `${fmt(p.growth)} / ${fmt(next.growth)}`, x + w, cy - 2, { size: 11, color: COLORS.muted, align: 'right', layer: 2 });
      cy += 20;
      im.text('twV', `Needs ${p.level} kind${p.level > 1 ? 's' : ''} of goods sold to it (${kinds} so far)`, x, cy, { size: 11, color: kinds >= p.level ? COLORS.good : COLORS.warn, wrap: w, layer: 2 });
      cy += 26;
    }
    if (readyToGrow(p)) {
      this.button('twGrow', `Ready: grow into a ${TOWN_LEVELS[p.level].name}`, x, cy, w, 40, true, () => this.showGrow(p), 'main');
      cy += 48;
    }
    this.button('twM', 'Manage town', x, cy, w, 36, true, () => this.openManage(p.id));
    return cy + 42 - y;
  }

  /** A section title with a rule above it. */
  private sectionHead(id: string, title: string, x: number, cy: number, w: number): number {
    const im = this.pim;
    im.line(2, x, cy - 6, x + w, cy - 6, COLORS.line, 1);
    im.text(id, title, x, cy, { size: 11, bold: true, color: COLORS.muted, layer: 2 });
    return cy + 20;
  }

  /** A flat button. `style`: 'main' is the orange call to action, 'on' is a lit green state, 'plain' is an outline. */
  private button(id: string, label: string, x: number, y: number, w: number, h: number, ok: boolean, onClick: () => void, style: 'main' | 'on' | 'plain' = 'plain'): void {
    const im = this.pim;
    const hov = im.hit(id, x, y, w, h, () => ok && onClick(), 3);
    const fill = !ok ? 0x151c26 : style === 'main' ? (hov ? 0xf2b04c : COLORS.accent) : style === 'on' ? (hov ? 0x3ba877 : 0x2f9a69) : hov ? 0x2a3b50 : 0x1b2735;
    const text = !ok ? COLORS.muted : style === 'main' ? 0x1b1204 : style === 'on' ? 0xffffff : COLORS.accent;
    im.rect(3, x, y, w, h, fill, 1, 8, !ok || style !== 'plain' ? fill : COLORS.accent, 1);
    im.text(`${id}t`, label, x + w / 2, y + h / 2 - 7, { size: 12, bold: true, color: text, align: 'center', layer: 4 });
  }

  /** The good a building is mainly about: what a camp digs up or a factory makes. */
  private mainGood(s: Site): Good | null {
    const def = SITE_DEFS[s.kind];
    return def.produce ? def.produce.good : def.recipe ? (Object.keys(def.recipe.outputs)[0] as Good) : null;
  }

  private goodsWord(s: Site): string {
    const gd = this.mainGood(s);
    return gd ? GOODS[gd].label.toLowerCase() : 'goods';
  }

  /** How much a buyer wants a good right now, in words. */
  private demand(buyer: Site, gd: Good): { label: string; color: number; want: number } {
    const world = this.game3d.world;
    const fill = stockOf(buyer, gd) / Math.max(1, siteCap(world, buyer));
    if (fill >= 0.99) return { label: 'Full, try later', color: COLORS.warn, want: 0 };
    if (fill >= 0.6) return { label: 'Nearly full', color: COLORS.warn, want: 1 - fill };
    return { label: 'Wants more', color: COLORS.good, want: 1 - fill };
  }

  /** Price of a "Build road" button to a buyer, worked out once and remembered while the roads stay the same. */
  private planCache = new Map<string, { cost: number; path: Tile[] } | null>();
  private roadCost(fromId: number, toId: number): number | null | undefined {
    const p = this.roadPlanCached(fromId, toId);
    return p === undefined ? undefined : p === null ? null : p.cost;
  }
  private roadPlanCached(fromId: number, toId: number): { cost: number; path: Tile[] } | null | undefined {
    const world = this.game3d.world;
    const key = `${fromId}-${toId}-${world.routes.length}-${world.sites.length}-${world.tier}`;
    if (this.planCache.has(key)) return this.planCache.get(key);
    // Path finding is costly: one new price per frame at most.
    if (this.planBudget <= 0) return undefined;
    this.planBudget -= 1;
    if (this.planCache.size > 200) this.planCache.clear();
    const plan = roadPlan(world, fromId, toId);
    const out = plan ? { cost: Math.ceil(plan.cost), path: plan.path } : null;
    this.planCache.set(key, out);
    return out;
  }
  private planBudget = 1;

  private stuckCount = 0;
  private stuckAt = 0;
  private waitCount = 0;

  /** A small pill under the money: green when everything runs, amber with a count when buildings are stuck. */
  private stuckBadge(x: number, y: number, w: number, narrow = false): void {
    const im = this.im;
    const world = this.game3d.world;
    // Working out why each building is stuck is not free, so look once a second.
    if (this.time.now - this.stuckAt > 1000) {
      this.stuckAt = this.time.now;
      const levels = world.sites.filter((s) => !SITE_DEFS[s.kind].dock && !SITE_DEFS[s.kind].station).map((s) => diagnoseAll(world, s).level);
      this.stuckCount = levels.filter((l) => l === 'warn' || l === 'bad').length;
      this.waitCount = levels.filter((l) => l === 'wait').length;
    }
    const n = this.stuckCount;
    if (world.sites.length === 0) return;
    const h = 32;
    const hov = im.hit('btnStuck', x, y, w, h, () => this.nextProblem(), 1);
    const col = n === 0 ? COLORS.good : COLORS.warn;
    im.rect(1, x, y, w, h, n === 0 ? 0x12261f : hov ? 0x3a2f14 : 0x2a2312, 0.95, h / 2, col, 1);
    im.circle(2, x + 18, y + h / 2, 6, col);
    im.text('stuckT', n === 0 ? 'All running' : `${n} stuck: tap to fix`, x + 34, y + 8, { size: 13, bold: true, color: n === 0 ? COLORS.good : COLORS.text, layer: 2 });
    // Held up but working: needs more supply, or buyers are full. Not a fault, so a quieter badge of its own.
    if (this.waitCount > 0) {
      const wx = narrow ? x + w + 8 : x;
      const ww = narrow ? this.scale.width - 12 - wx : w;
      const y2 = narrow ? y + 2 : y + h + 6;
      const h2 = 28;
      const wh = im.hit('btnWait', wx, y2, ww, h2, () => this.nextProblem('wait'), 1);
      im.rect(1, wx, y2, ww, h2, wh ? 0x1b2c40 : 0x14202f, 0.95, h2 / 2, COLORS.info, 1);
      im.circle(2, wx + 18, y2 + h2 / 2, 5, COLORS.info);
      im.text('waitT', narrow ? `${this.waitCount} waiting` : `${this.waitCount} waiting on supply`, wx + 34, y2 + 6, { size: 12, bold: true, color: COLORS.text, layer: 2 });
    }
  }

  private problemAt = -1;

  /** Jump to the next building that is stuck, and say why. Press N again for the one after. */
  private nextProblem(which: 'stuck' | 'wait' = 'stuck'): void {
    const g = this.game3d;
    const w = g.world;
    const list = w.sites.filter((s) => {
      if (SITE_DEFS[s.kind].dock || SITE_DEFS[s.kind].station) return false;
      const l = diagnoseAll(w, s).level;
      return which === 'wait' ? l === 'wait' : l === 'warn' || l === 'bad';
    });
    if (list.length === 0) {
      this.toasts.push({ text: 'Nothing is stuck. All running.', until: this.time.now + 2600 });
      return;
    }
    this.problemAt = (this.problemAt + 1) % list.length;
    const s = list[this.problemAt];
    this.sheet = null;
    g.select({ kind: 'site', id: s.id });
    g.lookAt(s.x, s.y, 45, g.cam.heading, g.cam.pitchManual);
    this.toasts.push({ text: `${s.name}: ${diagnoseAll(w, s).text}  (${this.problemAt + 1} of ${list.length}, N for next)`, until: this.time.now + 5200 });
  }

  /** After a town has grown: one button back to the view the player had before, in the same camera angle. */
  private backButton(W: number, H: number): void {
    const im = this.im;
    const g = this.game3d;
    const w = 300;
    const x = (W - w) / 2;
    const y = Math.min(H - 150, H - this.bottomInset - 60);
    const hov = im.hit('gbBack', x, y, w - 46, 48, () => g.goBack(), 6);
    im.rect(6, x, y, w - 46, 48, hov ? 0xf2b04c : COLORS.accent, 1, 24);
    im.text('gbBackT', 'Back to where you were', x + (w - 46) / 2, y + 14, { size: 16, bold: true, color: 0x1b1204, align: 'center', layer: 7 });
    const xh = im.hit('gbBackX', x + w - 40, y, 40, 48, () => g.dismissBack(), 6);
    im.rect(6, x + w - 40, y, 40, 48, xh ? 0x2a3646 : 0x1b2430, 1, 24, COLORS.line, 1);
    im.text('gbBackXT', 'X', x + w - 20, y + 14, { size: 15, bold: true, align: 'center', layer: 7 });
  }

  /** The single most useful thing to do next at this building: what is wrong, in plain words, and the button that fixes it. */
  private nextStep(s: Site): { text: string; color: number; label?: string; ok?: boolean; act?: () => void } {
    const g = this.game3d;
    const world = g.world;
    const d = this.lineOf(s) === 'by' ? diagnose(world, s, 'by') : diagnoseAll(world, s);
    const color = d.level === 'ok' ? COLORS.good : d.level === 'wait' ? COLORS.info : COLORS.warn;
    const f = d.fix;
    if (!f) return { text: d.text || 'Nothing to move on this line yet.', color };
    if (f.kind === 'start') return { text: d.text, color, label: 'Start', ok: true, act: () => g.making(s.id, true) };
    if (f.kind === 'buy') return { text: d.text, color, label: `Buy  $${fmt(VEHICLE_DEFS[f.vehicle].cost)}`, ok: buyError(world, s.id, f.vehicle) === null, act: () => g.buy(s.id, f.vehicle, f.line) };
    if (f.kind === 'sell') return { text: d.text, color, label: 'Sell there', ok: true, act: () => g.sendTo(s.id, f.to, true, f.line) };
    if (f.kind === 'upgrade') return { text: d.text, color, label: 'Upgrade', ok: true, act: () => g.upgrade(s.id) };
    const cost = this.roadCost(s.id, f.to);
    return { text: d.text, color, label: cost === null ? 'No way' : `Road  $${cost === undefined ? '...' : fmt(cost)}`, ok: !!cost && world.money >= cost, act: () => g.roadTo(s.id, f.to) };
  }

  private nextStepCard(s: Site, x: number, y: number, w: number): number {
    const im = this.pim;
    const step = this.nextStep(s);
    // Nothing to fix: just a small status line, not a box.
    if (!step.label && step.color === COLORS.good) {
      im.circle(2, x + 8, y + 10, 4, COLORS.good);
      im.text('nsT', step.text, x + 20, y + 2, { size: 12, color: COLORS.good, wrap: w - 24, layer: 3 });
      return 22;
    }
    const bw = step.label ? 104 : 0;
    const t = im.text('nsT', step.text, x + 12, y + 10, { size: 12, bold: true, color: step.color === COLORS.good ? COLORS.good : COLORS.text, wrap: w - 24 - (bw ? bw + 8 : 0), layer: 3 });
    const h = Math.max(step.label ? 50 : 36, t.h + 20);
    im.rect(2, x, y, w, h, step.color === COLORS.good ? 0x12261f : 0x2a2312, 1, 12, step.color, 0.8);
    if (step.label) this.button('nsB', step.label, x + w - bw - 8, y + (h - 34) / 2, bw, 34, !!step.ok, () => step.act?.(), 'main');
    return h;
  }

  /** What goes in, the building, and what comes out, as one picture. */
  private flowCard(s: Site, x: number, y: number, w: number, withPause = true): number {
    const im = this.pim;
    const g = this.game3d;
    const world = g.world;
    const def = SITE_DEFS[s.kind];
    const out = this.mainGood(s)!;
    const per = def.produce ? 1 : Object.values(def.recipe!.outputs)[0] ?? 1;
    const every = def.produce ? def.produce.every : def.recipe!.every;
    const running = !def.recipe || !!s.making;
    const rate = running ? ((TICKS_PER_SECOND * 60) / every) * siteSpeed(world, s) * per : 0;
    const node = s.nodeId === null ? undefined : world.nodes.find((n) => n.id === s.nodeId);
    const cw = (w - 40) / 3;
    const chip = (id: string, cx: number, title: string, sub: string, color: number, hi = false): void => {
      im.rect(3, cx, y, cw, 54, hi ? 0x1f2c3a : 0x131a24, 1, 10, hi ? COLORS.accent : COLORS.line, 1);
      im.text(`${id}a`, title, cx + cw / 2, y + 10, { size: 12, bold: true, color: COLORS.text, align: 'center', wrap: cw - 8, layer: 4 });
      im.text(`${id}b`, sub, cx + cw / 2, y + 31, { size: 10, color, align: 'center', wrap: cw - 8, layer: 4 });
    };
    const arrow = (ax: number): void => {
      im.line(3, ax + 4, y + 27, ax + 16, y + 27, COLORS.muted, 1, 2);
      im.line(3, ax + 11, y + 22, ax + 16, y + 27, COLORS.muted, 1, 2);
      im.line(3, ax + 11, y + 32, ax + 16, y + 27, COLORS.muted, 1, 2);
    };
    if (def.produce) {
      const q = node ? NODE_QUALITY[node.quality] : null;
      chip('fl0', x, (def.node ?? 'land').toUpperCase(), q ? `${q.label} spot` : '', q && q.mult > 1 ? COLORS.good : COLORS.muted);
    } else {
      const inputs = Object.keys(def.recipe!.inputs) as Good[];
      const low = inputs.some((gd) => stockOf(s, gd) < (def.recipe!.inputs[gd] ?? 0));
      chip('fl0', x, inputs.map((gd) => GOODS[gd].label.toUpperCase()).join(' + '), `${inputs.map((gd) => Math.floor(stockOf(s, gd))).join(' + ')} in stock`, low ? COLORS.warn : COLORS.good);
    }
    arrow(x + cw);
    const short = def.label.length > 10 ? def.label.split(' ').pop()! : def.label;
    chip('fl1', x + cw + 20, short.toUpperCase(), running ? `${rate.toFixed(0)} a minute` : 'Stopped', running ? COLORS.good : COLORS.warn, true);
    arrow(x + cw * 2 + 20);
    const ready = Math.floor(stockOf(s, out));
    const full = ready >= siteCap(world, s);
    chip('fl2', x + cw * 2 + 40, GOODS[out].label.toUpperCase(), full ? `${ready} ready, full` : `${ready} ready`, full ? COLORS.bad : COLORS.text);
    let cy = y + 62;
    if (def.recipe) {
      // Start lives in the next-step card above; once running, this is where you pause it.
      if (s.making && withPause) {
        this.button('flGo', 'Pause production', x, cy, w, 32, true, () => g.making(s.id, false));
        cy += 38;
      }
    }
    return cy - y;
  }

  /** Four numbers across the top of a building's dashboard: what it makes, what it holds, what it has earned, how its vehicles are doing. */
  private statStrip(s: Site, x: number, y: number, w: number): number {
    const im = this.pim;
    const world = this.game3d.world;
    const def = SITE_DEFS[s.kind];
    const maker = def.produce || def.recipe;
    const every = def.produce ? def.produce.every : def.recipe?.every;
    const per = def.produce ? 1 : def.recipe ? Object.values(def.recipe.outputs)[0] ?? 1 : 1;
    const rate = maker && every && (def.produce || s.making) ? ((TICKS_PER_SECOND * 60) / every) * siteSpeed(world, s) * per : 0;
    const held = GOOD_LIST.reduce((n, gd) => n + stockOf(s, gd), 0);
    const earned = Object.values(s.sales ?? {}).reduce((n, r) => n + r.money, 0);
    const fleet = fleetOf(world, s.id);
    const out = fleet.filter((v) => v.state === 'moving' && v.routeId !== 0).length;
    const tiles: [string, string, number][] = [
      [maker ? 'MAKING PER MINUTE' : 'GOODS HELD', maker ? rate.toFixed(0) : fmt(held), maker && rate === 0 ? COLORS.warn : COLORS.text],
      ['IN STORE', fmt(held), COLORS.text],
      ['EARNED FROM SALES', `$${fmt(earned)}`, COLORS.good],
      [def.airport ? 'PLANES OUT' : 'VEHICLES OUT', `${out} of ${fleet.length}`, fleet.length === 0 ? COLORS.warn : COLORS.text],
    ];
    const gap = 10;
    const cols = w < 560 ? 2 : tiles.length;
    const tw = (w - gap * (cols - 1)) / cols;
    tiles.forEach(([label, value, color], i) => {
      const tx = x + (i % cols) * (tw + gap);
      const ty = y + Math.floor(i / cols) * 66;
      im.rect(2, tx, ty, tw, 58, 0x131a24, 1, 10, COLORS.line, 1);
      im.text(`st${i}v`, value, tx + 14, ty + 9, { size: 22, bold: true, color, layer: 3 });
      im.text(`st${i}l`, label, tx + 14, ty + 38, { size: 10, bold: true, color: COLORS.muted, layer: 3 });
    });
    return 58 + (Math.ceil(tiles.length / cols) - 1) * 66;
  }

  /** The building's shelves across the full width: one card per good it takes in or makes, filled to how full its store is. */
  private inventorySection(s: Site, x: number, y: number, w: number): number {
    const im = this.pim;
    const world = this.game3d.world;
    const def = SITE_DEFS[s.kind];
    if (!(def.produce || def.recipe)) return 0;
    const ins = def.recipe ? (Object.keys(def.recipe.inputs) as Good[]) : [];
    const outs = produces(s);
    const goods = [...ins, ...outs.filter((gd) => !ins.includes(gd))];
    const cap = siteCap(world, s);
    const gap = 10;
    const per = Math.max(1, Math.min(goods.length, Math.floor((w + gap) / (170 + gap))));
    const cw = (w - gap * (per - 1)) / per;
    const ch = 74;
    const baseY = y;
    goods.forEach((gd, i) => {
      const cx = x + (i % per) * (cw + gap);
      const y = baseY + Math.floor(i / per) * (ch + 10);
      const n = stockOf(s, gd);
      const f = Math.max(0, Math.min(1, n / cap));
      const full = f >= 0.85;
      const kind = ins.includes(gd) ? 'TAKES IN' : gd === outs[0] ? 'MAIN PRODUCT' : 'BY-PRODUCT';
      im.rect(2, cx, y, cw, ch, 0x131a24, 1, 10, full ? COLORS.bad : COLORS.line, 1);
      // the fill: a coloured level behind the card, the way a tank shows its contents
      if (f > 0) im.rect(2, cx + 3, y + ch - 3 - (ch - 6) * f, cw - 6, (ch - 6) * f, GOODS[gd].color, 0.22, 8);
      im.circle(3, cx + 18, y + 22, 7, GOODS[gd].color);
      im.text(`iv${gd}l`, GOODS[gd].label, cx + 32, y + 12, { size: 14, bold: true, layer: 4 });
      im.text(`iv${gd}k`, kind, cx + 32, y + 32, { size: 9, bold: true, color: ins.includes(gd) ? COLORS.warn : COLORS.muted, layer: 4 });
      im.text(`iv${gd}n`, `${Math.floor(n)}`, cx + cw - 12, y + 10, { size: 22, bold: true, color: full ? COLORS.bad : COLORS.text, align: 'right', layer: 4 });
      im.bar(3, cx + 12, y + ch - 16, cw - 24, 6, f, full ? COLORS.bad : COLORS.good);
      im.text(`iv${gd}c`, `of ${cap}`, cx + cw - 12, y + 36, { size: 10, color: COLORS.muted, align: 'right', layer: 4 });
    });
    return Math.ceil(goods.length / per) * (ch + 10) + 4;
  }

  /** Where the money came from: sales to each buyer as bars, biggest first. */
  private salesSection(s: Site, x: number, y: number, w: number): number {
    const im = this.pim;
    const world = this.game3d.world;
    const def = SITE_DEFS[s.kind];
    if (def.dock || def.station) return 0;
    let cy = this.sectionHead('slH', 'WHERE YOUR MONEY COMES FROM', x, y, w);
    const rows = Object.entries(s.sales ?? {})
      .map(([id, r]) => ({ site: siteById(world, Number(id)), ...r }))
      .filter((r) => r.site && r.units > 0)
      .sort((a, b) => b.money - a.money)
      .slice(0, 6);
    if (rows.length === 0) {
      im.text('slN', 'No sales yet. Tap Sell here on a buyer, and buy a truck to carry the goods.', x, cy, { size: 11, color: COLORS.muted, wrap: w, layer: 2 });
      return cy + 40 - y;
    }
    const top = Math.max(1, ...rows.map((r) => r.money));
    const total = Object.values(s.sales ?? {}).reduce((n, r) => n + r.money, 0);
    const units = Object.values(s.sales ?? {}).reduce((n, r) => n + r.units, 0);
    im.text('slT', `Sold ${fmt(units)} for $${fmt(total)} in all`, x, cy, { size: 13, bold: true, color: COLORS.good, layer: 2 });
    cy += 24;
    const gap = 12;
    const cols = Math.max(1, Math.min(3, Math.floor((w + gap) / (340 + gap))));
    const cw = (w - gap * (cols - 1)) / cols;
    rows.forEach((r, i) => {
      const cx = x + (i % cols) * (cw + gap);
      const ry = cy + Math.floor(i / cols) * 54;
      im.rect(2, cx, ry, cw, 46, 0x131a24, 1, 10, COLORS.line, 1);
      im.text(`sl${i}n`, r.site!.name, cx + 12, ry + 7, { size: 12, bold: true, wrap: cw - 90, layer: 3 });
      im.text(`sl${i}m`, `$${fmt(r.money)}`, cx + cw - 12, ry + 7, { size: 13, bold: true, color: COLORS.warn, align: 'right', layer: 3 });
      im.bar(3, cx + 12, ry + 31, cw - 24, 6, r.money / top, COLORS.good);
    });
    cy += Math.ceil(rows.length / cols) * 54;
    return cy - y;
  }

  /** Trucks on their way here with a load: who sent it, what it is and how much. */
  private inboundSection(s: Site, x: number, y: number, w: number): number {
    const im = this.pim;
    const world = this.game3d.world;
    const def = SITE_DEFS[s.kind];
    if (def.dock || def.station) return 0;
    const list = inboundTo(world, s);
    let cy = this.sectionHead('inH', `COMING IN  (${list.length})`, x, y, w);
    if (list.length === 0) {
      const waiting = diagnoseAll(world, s).level === 'wait';
      im.text('inN', waiting ? 'Nothing on the road yet. This building is waiting on supply: build a route from something that makes what it needs, or buy more trucks there.' : 'No trucks are bringing anything here right now.', x, cy, { size: 11, color: waiting ? COLORS.info : COLORS.muted, wrap: w, layer: 2 });
      return cy + 30 - y;
    }
    const total: Partial<Record<Good, number>> = {};
    for (const o of list) total[o.good] = (total[o.good] ?? 0) + o.amount;
    im.text('inT', Object.entries(total).map(([gd, n]) => `${Math.floor(n!)} ${GOODS[gd as Good].label.toLowerCase()}`).join('  ·  ') + ' on the way', x, cy, { size: 13, bold: true, color: COLORS.info, layer: 2 });
    cy += 24;
    const gap = 12;
    const cols = Math.max(1, Math.min(4, Math.floor((w + gap) / (300 + gap))));
    const cw = (w - gap * (cols - 1)) / cols;
    list.forEach((o, i) => {
      const cx = x + (i % cols) * (cw + gap);
      const ry = cy + Math.floor(i / cols) * 58;
      const from = siteById(world, o.fromId);
      im.rect(2, cx, ry, cw, 50, 0x14202f, 1, 10, COLORS.info, 0.8);
      im.circle(3, cx + 18, ry + 17, 6, GOODS[o.good].color);
      im.text(`in${i}a`, `${Math.floor(o.amount)} ${GOODS[o.good].label.toLowerCase()}`, cx + 32, ry + 8, { size: 13, bold: true, layer: 3 });
      im.text(`in${i}b`, `from ${from?.name ?? 'somewhere'}`, cx + 12, ry + 30, { size: 11, color: COLORS.muted, wrap: cw - 24, layer: 3 });
      im.text(`in${i}c`, vehicleLabel(o.vehicle.kind, o.vehicle.body), cx + cw - 12, ry + 9, { size: 11, color: COLORS.muted, align: 'right', layer: 3 });
    });
    cy += Math.ceil(list.length / cols) * 58;
    return cy - y;
  }

  /** The last jobs that were sold from this building, with what each paid, so swings in price and volume show. */
  private historySection(s: Site, x: number, y: number, w: number): number {
    const im = this.pim;
    const world = this.game3d.world;
    const def = SITE_DEFS[s.kind];
    if (def.dock || def.station) return 0;
    const all = s.history ?? [];
    const jobs = [...all].reverse();
    let cy = this.sectionHead('hsH', `SELLING HISTORY  (last ${jobs.length} of ${HISTORY_JOBS} jobs)`, x, y, w);
    if (jobs.length === 0) {
      im.text('hsN', 'Nothing sold yet. Every delivery that is paid for is listed here, newest first.', x, cy, { size: 11, color: COLORS.muted, wrap: w, layer: 2 });
      return cy + 30 - y;
    }
    // A bar chart of what each job paid, oldest on the left, so the ups and downs are easy to see.
    const chartH = 64;
    const top = Math.max(1, ...all.map((j) => j.money / Math.max(1, j.units)));
    im.rect(2, x, cy, w, chartH, 0x131a24, 1, 10, COLORS.line, 1);
    const slot = (w - 24) / HISTORY_JOBS;
    all.forEach((j, i) => {
      const per = j.money / Math.max(1, j.units);
      const bh = Math.max(3, (per / top) * (chartH - 22));
      const bx = x + 12 + i * slot;
      im.rect(3, bx, cy + chartH - 8 - bh, Math.max(3, slot - 3), bh, GOODS[j.good].color, 1, 2);
    });
    im.text('hsC', `price per unit, highest $${top.toFixed(1)}`, x + 12, cy + 4, { size: 10, color: COLORS.muted, layer: 3 });
    cy += chartH + 10;
    const gap = 12;
    const cols = Math.max(1, Math.min(3, Math.floor((w + gap) / (380 + gap))));
    const cw = (w - gap * (cols - 1)) / cols;
    const now = world.tick;
    jobs.forEach((j, i) => {
      const cx = x + (i % cols) * (cw + gap);
      const ry = cy + Math.floor(i / cols) * 34;
      const to = siteById(world, j.toId);
      const mins = Math.max(0, Math.round((now - j.tick) / (TICKS_PER_SECOND * 60)));
      im.rect(2, cx, ry, cw, 30, 0x131a24, 1, 8);
      im.circle(3, cx + 14, ry + 15, 5, GOODS[j.good].color);
      im.text(`hs${i}a`, `${Math.floor(j.units)} ${GOODS[j.good].label.toLowerCase()}  to ${to?.name ?? 'a buyer'}`, cx + 26, ry + 8, { size: 11, wrap: cw - 150, layer: 3 });
      im.text(`hs${i}b`, `${mins === 0 ? 'just now' : `${mins} min ago`}`, cx + cw - 78, ry + 8, { size: 10, color: COLORS.muted, align: 'right', layer: 3 });
      im.text(`hs${i}c`, `$${fmt(j.money)}`, cx + cw - 10, ry + 7, { size: 12, bold: true, color: COLORS.warn, align: 'right', layer: 3 });
    });
    cy += Math.ceil(jobs.length / cols) * 34;
    return cy - y;
  }

  /** Who buys this building's goods: those joined to it, and the nearest that could be with a road. */
  private buyerSection(s: Site, x: number, y: number, w: number): number {
    const im = this.pim;
    const g = this.game3d;
    const world = g.world;
    const def = SITE_DEFS[s.kind];
    if (def.dock || def.station) return 0;
    const feeds = (yy: number): number => {
      let fy = this.sectionHead('byF', 'FACTORIES IT FEEDS', x, yy + 10, w);
      const near = world.sites.filter((o) => SITE_DEFS[o.kind].recipe && depotsNear(world, o).includes(s));
      if (near.length === 0) {
        im.text('byFN', 'No factory within 14 tiles. Build one next to this warehouse and it takes what it needs from the shelf.', x, fy, { size: 11, color: COLORS.muted, wrap: w, layer: 2 });
        return fy + 40 - yy;
      }
      for (const o of near) {
        const inputs = Object.keys(SITE_DEFS[o.kind].recipe!.inputs) as Good[];
        const low = inputs.find((gd) => stockOf(s, gd) < 1);
        im.rect(2, x, fy, w, 56, low ? 0x2a2312 : 0x12261f, 1, 10, low ? COLORS.warn : COLORS.good, 1);
        im.text(`fd${o.id}n`, o.name, x + 10, fy + 8, { size: 12, bold: true, wrap: w - 20, layer: 3 });
        im.text(`fd${o.id}s`, low ? `Waiting for ${GOODS[low].label.toLowerCase()}. Send it here.` : `Stocked: ${inputs.map((gd) => `${GOODS[gd].label.toLowerCase()} ${Math.floor(stockOf(s, gd))}`).join(', ')}`, x + 10, fy + 30, { size: 11, color: low ? COLORS.warn : COLORS.good, wrap: w - 20, layer: 3 });
        fy += 62;
      }
      return fy + 6 - yy;
    };
    const line = this.lineOf(s);
    let cy = this.sectionHead('byH', `WHO BUYS YOUR ${def.hub ? 'GOODS' : lineGoods(s, line).slice(0, 3).map((gd) => GOODS[gd].label.toUpperCase()).join(' + ')}`, x, y, w);
    const allBuyers = buyersFor(world, s, 3, line);
    if (allBuyers.length === 0) {
      im.text('byN', def.hub ? 'Nobody yet. Build a road from this warehouse to a market or a factory.' : 'Nobody nearby buys this yet. Towns want more kinds of goods as they grow.', x, cy, { size: 11, color: COLORS.muted, wrap: w, layer: 2 });
      return cy + 40 - y + (def.store ? feeds(cy + 40) : 0);
    }

    // Filters.
    const f = this.filters.sell;
    const rows = allBuyers.map((b, rank) => {
      const d = SITE_DEFS[b.site.kind];
      const type = d.hub ? 'storage' : d.dock ?? (d.station ? 'station' : d.recipe ? 'factory' : 'other');
      const asked = b.goods.filter((gd) => wants(world, b.site).includes(gd) || !b.connected);
      const gd = asked[0] ?? b.goods[0];
      return {
        b,
        rank,
        type,
        status: !b.connected ? 'unjoined' : b.on ? 'on' : 'off',
        price: d.dock && gd ? unitPrice(world, b.site, gd) : 0,
        sold: s.sales?.[b.site.id]?.units ?? 0,
        far: this.tilesApart(s, b.site),
        text: [b.site.name, d.label, siteTown(world, b.site)?.name ?? '', ...b.goods.map((g2) => GOODS[g2].label)].join(' ').toLowerCase(),
      };
    });
    type Row = (typeof rows)[number];
    const passes = (r: Row, skip: keyof ListFilter | null): boolean =>
      (skip === 'q' || !f.q.trim() || f.q.toLowerCase().trim().split(/\s+/).every((word) => r.text.includes(word))) &&
      (skip === 'status' || f.status === 'all' || r.status === f.status) &&
      (skip === 'type' || f.type === 'all' || r.type === f.type) &&
      (skip === 'good' || f.good === 'all' || r.b.goods.includes(f.good as Good));
    const count = (skip: keyof ListFilter, test: (r: Row) => boolean): number => rows.filter((r) => passes(r, skip) && test(r)).length;
    const types = (['market', 'freight', 'civic', 'storage', 'factory', 'station', 'other'] as const).filter((t) => rows.some((r) => r.type === t));
    const goodsHere = GOOD_LIST.filter((gd) => rows.some((r) => r.b.goods.includes(gd)));
    const set = (k: keyof ListFilter) => (v: string): void => void ((this.filters.sell as unknown as Record<string, string>)[k] = v);
    const shown = rows.filter((r) => passes(r, null));
    const byName = (a: Row, b: Row): number => a.b.site.name.localeCompare(b.b.site.name);
    shown.sort(f.sort === 'price' ? (a, b) => b.price - a.price || a.rank - b.rank : f.sort === 'near' ? (a, b) => a.far - b.far : f.sort === 'sold' ? (a, b) => b.sold - a.sold || a.rank - b.rank : f.sort === 'name' ? byName : (a, b) => a.rank - b.rank);
    const buyers = shown.map((r) => r.b);
    cy += this.filterBar('sell', [
      ['status', 'STATUS', [
        { v: 'all', label: 'All', n: count('status', () => true) },
        { v: 'on', label: def.hub ? 'Selling to' : 'Joined', n: count('status', (r) => r.status === 'on') },
        ...(def.hub ? [{ v: 'off', label: 'Switched off', n: count('status', (r) => r.status === 'off') }] : []),
        { v: 'unjoined', label: 'Not joined yet', n: count('status', (r) => r.status === 'unjoined') },
      ], f.status, set('status')],
      ['type', 'TYPE', [{ v: 'all', label: 'All', n: count('type', () => true) }, ...types.map((t) => ({ v: t, label: TYPE_LABEL[t], n: count('type', (r) => r.type === t) }))], f.type, set('type')],
      ['good', 'GOODS', [{ v: 'all', label: 'All' }, ...goodsHere.map((gd) => ({ v: gd, label: GOODS[gd].label, n: count('good', (r) => r.b.goods.includes(gd)), color: GOODS[gd].color })).filter((o) => o.n > 0 || o.v === f.good)], f.good, set('good')],
      ['sort', 'SORT BY', [{ v: 'best', label: 'Suggested' }, { v: 'price', label: 'Best price' }, { v: 'near', label: 'Nearest' }, { v: 'sold', label: 'Most sold' }, { v: 'name', label: 'Name' }], f.sort, (v) => (f.sort = v === 'all' ? 'best' : v)],
    ], buyers.length, allBuyers.length, x, cy, w);
    if (def.hub && buyers.length) {
      const joined = buyers.filter((b) => b.connected);
      const offN = joined.filter((b) => !b.on).length;
      const onN = joined.length - offN;
      const bw = Math.min(220, (w - 8) / 2);
      this.button('byAllOn', `Sell to all shown  (${offN})`, x, cy, bw, 32, offN > 0, () => joined.forEach((b) => !b.on && g.sendTo(s.id, b.site.id, true)), 'on');
      this.button('byAllOff', `Stop all shown  (${onN})`, x + bw + 8, cy, bw, 32, onN > 0, () => joined.forEach((b) => b.on && g.sendTo(s.id, b.site.id, false)));
      cy += 42;
    }
    if (!buyers.length) {
      im.text('byNone', 'No buyer matches these filters.', x, cy + 4, { size: 12, color: COLORS.warn, layer: 2 });
      return cy + 34 - y + (def.store ? feeds(cy + 34) : 0);
    }
    const gGap = 12;
    const gCols = Math.max(1, Math.min(3, Math.floor((w + gGap) / (380 + gGap))));
    const gW = (w - gGap * (gCols - 1)) / gCols;
    buyers.forEach((b, bi) => {
      const gx = x + (bi % gCols) * (gW + gGap);
      const gy = cy + Math.floor(bi / gCols) * 76;
      ((x: number, cy: number, w: number): void => {
      const id = `by${b.site.id}`;
      const dock = SITE_DEFS[b.site.kind].dock;
      const asked = b.goods.filter((gd) => wants(world, b.site).includes(gd) || !b.connected);
      const gd = asked[0] ?? b.goods[0];
      const h = 70;
      im.rect(2, x, cy, w, h, b.on ? 0x12261f : 0x131a24, 1, 10, b.on ? COLORS.good : COLORS.line, 1);
      im.text(`${id}n`, b.site.name, x + 10, cy + 8, { size: 12, bold: true, wrap: w - 110, layer: 3 });
      const store = !!SITE_DEFS[b.site.kind].hub;
      im.text(`${id}p`, dock ? `$${unitPrice(world, b.site, gd).toFixed(1)} each${asked.length > 1 ? `  +${asked.length - 1} more` : ''}` : store ? 'stores it  ·  pays $0' : `uses ${(asked.length ? asked : [gd]).slice(0, 2).map((g2) => GOODS[g2].label.toLowerCase()).join(' + ')}`, x + w - 10, cy + 8, { size: 12, bold: true, color: dock ? COLORS.warn : store ? COLORS.info : COLORS.muted, align: 'right', layer: 3 });
      const bx = x + w - 110;
      const by = cy + 30;
      if (!b.connected) {
        const best = allBuyers.find((o) => !o.connected) === b && (b.perMinute ?? 0) > 0;
        im.text(`${id}s`, best ? 'Best pick: not joined yet' : 'Not joined by road yet', x + 10, cy + 30, { size: 11, bold: best, color: best ? COLORS.good : COLORS.muted, layer: 3 });
        if (b.perMinute) im.text(`${id}e`, `about $${fmt(b.perMinute)}/min for each truck`, x + 10, cy + 46, { size: 10, color: COLORS.muted, layer: 3 });
        const cost = this.roadCost(s.id, b.site.id);
        this.button(`${id}b`, cost === null ? 'No way' : `Road  $${cost === undefined ? '...' : fmt(cost)}`, bx, by, 100, 32, !!cost && world.money >= cost, () => g.roadTo(s.id, b.site.id));
      } else {
        const wanted = wants(world, b.site).includes(gd);
        // A hub is storage, not a customer: say where the goods go next so it never looks like a giveaway.
        const onward = store ? sellTargets(world, b.site).filter((t) => t.on && t.site.id !== s.id) : [];
        const held = store ? Math.floor(stockOf(b.site, gd)) : 0;
        const hubCap = store ? siteCap(world, b.site) : 1;
        const dm = store
          ? onward.length
            ? { label: `Stores ${held}/${hubCap}. Sells on to ${onward[0].site.name}${onward.length > 1 ? ` +${onward.length - 1}` : ''}`, color: COLORS.info, want: held / hubCap }
            : { label: `Stores ${held}/${hubCap}. Paid only once it sells on`, color: COLORS.warn, want: held / hubCap }
          : wanted ? this.demand(b.site, gd) : { label: 'Not buying right now', color: COLORS.muted, want: 0 };
        im.text(`${id}s`, dm.label, x + 10, cy + 28, { size: 11, color: dm.color, wrap: w - 130, layer: 3 });
        im.bar(3, x + 10, cy + 46, w - 140, 6, dm.want, dm.color);
        if (def.hub) {
          // A warehouse or terminal picks who it sells to, like the old Distribution Hub: tap to start or stop.
          this.button(`${id}b`, b.on ? (store ? 'Storing' : 'Selling') : 'Sell here', bx, by, 100, 32, true, () => g.sendTo(s.id, b.site.id, !b.on), b.on ? 'on' : 'plain');
        } else {
          // No switch to flip: every joined buyer is a destination, and each truck's Settings pick who it goes to.
          im.rect(3, bx, by, 100, 32, 0x17382c, 1, 8, COLORS.good, 1);
          im.text(`${id}b`, store ? 'Storing here' : 'Selling here', bx + 50, by + 8, { size: 12, bold: true, color: COLORS.good, align: 'center', layer: 4 });
        }
      }
      const rec = s.sales?.[b.site.id];
      if (rec && rec.units > 0) im.text(`${id}r`, store ? `Stored ${fmt(rec.units)}. Paid when it sells on` : `Sold ${fmt(rec.units)} for $${fmt(rec.money)}`, x + 10, cy + 54, { size: 10, color: COLORS.muted, layer: 3 });
      })(gx, gy, gW);
    });
    cy += Math.ceil(buyers.length / gCols) * 76;
    im.text('byX', def.hub ? 'Tap Sell here to start selling to a buyer, and tap again to stop. Trucks only go to buyers that are switched on.' : 'Your trucks pick the buyer. Open a truck and tap Settings to send it to one place or choose what it prefers.', x, cy, { size: 10, color: COLORS.muted, wrap: w, layer: 2 });
    return cy + 24 - y + (def.store ? feeds(cy + 24) : 0);
  }

  /** Which line of a building is on show: its main good, or its by-product. Each has its own buyers and vehicles. */
  private lineTab = new Map<number, Line>();
  private lineOf(s: Site): Line {
    return hasByLine(s) ? this.lineTab.get(s.id) ?? 'main' : 'main';
  }

  /** The toggle between a building's main good and its by-product: two pages in one menu. */
  private lineToggle(s: Site, x: number, y: number, w: number): number {
    const im = this.pim;
    const world = this.game3d.world;
    const line = this.lineOf(s);
    const names = (l: Line): string => lineGoods(s, l).map((gd) => GOODS[gd].label).join(' + ');
    const bw = (w - 8) / 2;
    const th = 54;
    const count = (l: Line): number => fleetOf(world, s.id, l).length;
    // Page tabs: a bright line runs under both, and the open tab is solid and joins it, so it reads as the page you are on.
    im.rect(2, x, y + th - 2, w, 4, 0x2f9a69, 1, 2);
    ([['main', 'MAIN PRODUCT'], ['by', 'BY-PRODUCT']] as [Line, string][]).forEach(([l, title], i) => {
      const cx = x + i * (bw + 8);
      const on = line === l;
      const hov = im.hit(`ln${l}`, cx, y, bw, th, () => this.lineTab.set(s.id, l), 3);
      const top = on ? y : y + 8;
      const hh = th + 2 - (top - y);
      im.rect(3, cx, top, bw, hh, on ? 0x2f9a69 : hov ? 0x243246 : 0x0d1118, 1, 12, on ? 0x2f9a69 : COLORS.line, 1);
      // square off the bottom so the tab sits flat on the line
      im.rect(3, cx, top + hh - 14, bw, 14, on ? 0x2f9a69 : hov ? 0x243246 : 0x0d1118, 1, 0);
      const n = count(l);
      im.text(`ln${l}t`, title, cx + 16, top + (on ? 9 : 5), { size: 11, bold: true, color: on ? 0xd8f5e6 : COLORS.muted, layer: 4 });
      im.text(`ln${l}n`, names(l), cx + 16, top + (on ? 24 : 20), { size: on ? 19 : 16, bold: true, color: on ? 0xffffff : COLORS.text, layer: 4 });
      if (bw >= 200) im.text(`ln${l}c`, `${n} truck${n === 1 ? '' : 's'}`, cx + bw - 16, top + (on ? 12 : 8), { size: 12, bold: true, color: on ? 0xffffff : n === 0 ? COLORS.warn : COLORS.muted, align: 'right', layer: 4 });
    });
    return th + 14;
  }

  /** Which trucks have their extra buttons open. */
  private truckOpen = new Set<number>();

  private truckStatus(v: Vehicle): { text: string; color: number } {
    const world = this.game3d.world;
    const route = vehicleRoute(world, v);
    const home = siteById(world, v.homeId);
    if (v.back) return { text: 'The road was removed: heading home', color: COLORS.warn };
    if (!route || !home) {
      const joined = world.routes.some((r) => !r.free && (r.fromSiteId === v.homeId || r.toSiteId === v.homeId));
      return { text: joined ? 'Waiting: nobody you sell to wants anything yet' : 'Waiting for a road', color: COLORS.warn };
    }
    const other = siteById(world, route.fromSiteId === v.homeId ? route.toSiteId : route.fromSiteId);
    const name = other?.name ?? 'the buyer';
    const homeIdx = route.fromSiteId === v.homeId ? 0 : route.path.length - 1;
    if (v.state === 'unloading') return { text: `Unloading at ${v.idx === homeIdx ? 'home' : name}`, color: COLORS.good };
    if (v.state === 'loading') return v.idx === homeIdx ? { text: `Loading ${this.goodsWord(home)}`, color: COLORS.good } : { text: `At ${name}`, color: COLORS.good };
    if (v.cargo > 0 && v.good && v.fromId === v.homeId && (v.dir === 1) !== (homeIdx === 0)) return { text: `${Math.floor(v.cargo)} ${GOODS[v.good].label.toLowerCase()} left over: heading back to find another buyer`, color: COLORS.warn };
    if (v.cargo > 0 && v.good) return { text: `Carrying ${Math.floor(v.cargo)} ${GOODS[v.good].label.toLowerCase()} to ${(v.dir === 1) === (homeIdx === 0) ? name : home.name}`, color: COLORS.good };
    return { text: (v.dir === 1) === (homeIdx === 0) ? `Driving to ${name}` : 'Heading home', color: COLORS.good };
  }

  /** The vehicles that work for a building. */
  private truckSection(s: Site, x: number, y: number, w: number): number {
    const im = this.pim;
    const g = this.game3d;
    const world = g.world;
    const def = SITE_DEFS[s.kind];
    if (def.dock) return 0;
    const line = this.lineOf(s);
    const fleet = fleetOf(world, s.id, line);
    const forWhat = line === 'by' ? ` FOR ${lineGoods(s, 'by').map((gd) => GOODS[gd].label.toUpperCase()).join(' + ')}` : hasByLine(s) ? ` FOR ${lineGoods(s, 'main').map((gd) => GOODS[gd].label.toUpperCase()).join(' + ')}` : '';
    let cy = this.sectionHead('trH', `YOUR ${def.airport ? 'PLANES' : 'TRUCKS'}${def.port ? ' AND SHIPS' : ''}${forWhat} (${fleet.length})`, x, y, w);
    const options = buyOptions(world, s.id);
    const gap = 8;
    // The switch and the buy buttons share one row.
    const nBtn = options.length + (options.length && !def.hub ? 1 : 0);
    if (nBtn > 0) {
      const bw = (w - gap * (nBtn - 1)) / nBtn;
      let bx = x;
      if (options.length && !def.hub) {
        const on = !!s.autoBuy;
        this.button('trAuto', on ? 'Ask me about trucks: ON' : 'Ask me about trucks: off', bx, cy, bw, 38, true, () => g.autoBuy(s.id, !on), on ? 'on' : 'plain');
        bx += bw + gap;
      }
      options.forEach((k) => {
        this.button(`tb${k}`, `+ ${vehicleLabel(k, bodyForLine(s, line))}  $${fmt(VEHICLE_DEFS[k].cost)}`, bx, cy, bw, 38, buyError(world, s.id, k) === null, () => g.buy(s.id, k, line), fleet.length === 0 ? 'main' : 'plain');
        bx += bw + gap;
      });
      cy += 46;
    } else {
      im.text('trN', 'Lay track from this building to run trains.', x, cy, { size: 11, color: COLORS.muted, wrap: w, layer: 2 });
      cy += 24;
    }
    const tCols = Math.max(1, Math.min(3, Math.floor((w + 12) / (380 + 12))));
    const tW = (w - 12 * (tCols - 1)) / tCols;
    const cardH = (v: Vehicle): number => (this.truckOpen.has(v.id) ? 222 : 108);
    const rowH: number[] = [];
    fleet.forEach((v, k) => {
      const row = Math.floor(k / tCols);
      rowH[row] = Math.max(rowH[row] ?? 0, cardH(v));
    });
    const rowY = [0];
    rowH.forEach((hh, k) => rowY.push(rowY[k] + hh + 8));
    fleet.forEach((v, n) => {
      const gx = x + (n % tCols) * (tW + 12);
      const gy = cy + rowY[Math.floor(n / tCols)];
      ((x: number, cy: number, w: number): void => {
      const vd = VEHICLE_DEFS[v.kind];
      const st = this.truckStatus(v);
      const open = this.truckOpen.has(v.id);
      const h = open ? 222 : 108;
      im.rect(2, x, cy, w, h, 0x131a24, 1, 10, COLORS.line, 1);
      im.text(`tv${v.id}n`, `${vehicleLabel(v.kind, v.body)} ${n + 1}`, x + 12, cy + 10, { size: 15, bold: true, layer: 3 });
      im.text(`tv${v.id}c`, `carries ${vd.capacity} t`, x + w - 12, cy + 12, { size: 12, color: COLORS.muted, align: 'right', layer: 3 });
      im.text(`tv${v.id}s`, st.text, x + 12, cy + 34, { size: 12, color: st.color, wrap: w - 24, layer: 3 });
      const upErr = upgradeVehicleError(world, v.id);
      const next = vd.next ? VEHICLE_DEFS[vd.next] : null;
      const bw3 = (w - 24 - 12) / 3;
      const by = cy + 66;
      this.button(`tv${v.id}u`, !next ? 'Top class' : next.tier > world.tier ? `Tier ${next.tier} bigger` : `Upgrade $${fmt(upgradeVehicleCost(v.kind))}`, x + 12, by, bw3, 32, upErr === null, () => g.upgradeVeh(v.id));
      this.button(`tv${v.id}k`, `Copy $${fmt(vd.cost)}`, x + 12 + bw3 + 6, by, bw3, 32, buyError(world, s.id, v.kind) === null, () => g.duplicateVeh(v.id));
      this.button(`tv${v.id}m`, open ? 'Less' : 'Settings', x + 12 + (bw3 + 6) * 2, by, bw3, 32, true, () => (open ? this.truckOpen.delete(v.id) : this.truckOpen.add(v.id)));
      if (open) {
        const dests = destinationsOf(world, v);
        const pinned = dests.find((d) => d.id === v.destId);
        const label = pinned ? `Only to ${pinned.name}` : 'Goes to: any buyer';
        this.button(`tv${v.id}d`, label.length > 26 ? `${label.slice(0, 25)}…` : label, x + 12, cy + 108, w - 24, 32, dests.length > 0, () => {
          const ids = [0, ...dests.map((d) => d.id)];
          g.vehicleDest(v.id, ids[(ids.indexOf(v.destId) + 1) % ids.length]);
        });
        const mode = v.pick ?? 'any';
        this.button(`tv${v.id}p`, `Prefers: ${PICK_LABEL[mode]}`, x + 12, cy + 146, w - 24, 32, dests.length > 1 && !v.destId, () => g.vehiclePick(v.id, PICK_MODES[(PICK_MODES.indexOf(mode) + 1) % PICK_MODES.length]));
        const unit = vd.mode === 'rail' ? 'train' : vd.mode === 'air' ? 'plane' : vd.mode === 'sea' ? 'ship' : 'truck';
        this.button(`tv${v.id}x`, `Sell ${unit}  +$${fmt(sellVehicleValue(v))}`, x + 12, cy + 184, w - 24, 32, true, () => g.sellVeh(v.id));
      }
      })(gx, gy, tW);
    });
    cy += (rowY[rowH.length] ?? 0);
    return cy - y;
  }

  // ---- town growth: a town that has earned its next level waits for the player to finish it ----

  /** Towns the player put off with Later, by "id:level", so the popup does not come straight back. */
  private growLater = new Set<string>();

  private pendingGrowth(): Place | undefined {
    return this.game3d.world.places.find((p) => readyToGrow(p) && !this.growLater.has(`${p.id}:${p.level}`));
  }

  /** Bring a town's growth popup back after Later. */
  private showGrow(p: Place): void {
    this.growLater.delete(`${p.id}:${p.level}`);
    this.dash = null;
  }

  /** A pop-up that asks before anything is demolished or a road is removed. */
  private removalModal(W: number, H: number): void {
    const im = this.im;
    const g = this.game3d;
    const rm = g.removal!;
    im.rect(5, 0, 0, W, H, 0x05080c, 0.7);
    im.block({ x: 0, y: 0, w: W, h: H });
    const w = Math.min(440, W - 24);
    const h = 190;
    const x = (W - w) / 2;
    const y = (H - h) / 2;
    im.rect(6, x, y, w, h, COLORS.panel, 1, 18, COLORS.bad, 2);
    im.text('rmT', rm.title, x + w / 2, y + 22, { size: 20, bold: true, align: 'center', wrap: w - 40, layer: 7 });
    im.text('rmD', rm.detail, x + w / 2, y + 62, { size: 13, color: COLORS.muted, align: 'center', wrap: w - 48, layer: 7 });
    const bw = (w - 48 - 12) / 2;
    const by = y + h - 66;
    const ch = im.hit('rmNo', x + 24, by, bw, 46, () => (g.removal = null), 8);
    im.rect(7, x + 24, by, bw, 46, ch ? 0x2a3646 : 0x1b2430, 1, 23, COLORS.line, 1);
    im.text('rmNoT', 'Keep it', x + 24 + bw / 2, by + 14, { size: 15, bold: true, align: 'center', layer: 8 });
    const oh = im.hit('rmYes', x + 36 + bw, by, bw, 46, () => {
      const run = rm.run;
      g.removal = null;
      this.dash = null;
      run();
    }, 8);
    im.rect(7, x + 36 + bw, by, bw, 46, oh ? 0xd9534f : 0xb8433f, 1, 23);
    im.text('rmYesT', rm.verb, x + 36 + bw + bw / 2, by + 14, { size: 15, bold: true, align: 'center', layer: 8 });
  }

  private growModal(W: number, H: number, p: Place): void {
    const im = this.im;
    const g = this.game3d;
    const pv = growPreview(p);
    if (!pv) return;
    im.rect(3, 0, 0, W, H, 0x05080c, 0.62);
    im.block({ x: 0, y: 0, w: W, h: H });
    const w = Math.min(560, W - 24);
    const x = (W - w) / 2;
    const pad = 24;
    const inner = w - pad * 2;
    // Lay the window out first to know its height, then centre it.
    const rows: [string, string, string][] = [
      ['Population', fmt(pv.popFrom), fmt(pv.popTo)],
      ['Pays for goods', pv.priceFrom ? `+${pv.priceFrom}%` : 'base price', `+${pv.priceTo}%`],
      ['Stalls hold', `${fmt(pv.storeFrom)} each`, `${fmt(pv.storeTo)} each`],
      ['Uses up goods', `${p.level}x`, `${p.level + 1}x`],
      ...(pv.lotsTo > pv.lotsFrom ? [['Building lots', `${pv.lotsFrom}`, `${pv.lotsTo}`] as [string, string, string]] : []),
    ];
    const extras: { title: string; text: string }[] = [];
    if (pv.lotsTo > pv.lotsFrom) extras.push({ title: `${pv.lotsTo - pv.lotsFrom} new building lots`, text: 'Homes near the centre move out, and the lots open up for your factories and mills' });
    if (pv.newMarket.length) extras.push({ title: 'Market starts buying', text: pv.newMarket.map((gd) => GOODS[gd].label).join(', ') });
    if (pv.freightOpens) extras.push({ title: 'Supply Yard opens', text: `Buys raw goods and by-products: ${pv.newFreight.slice(0, 6).map((gd) => GOODS[gd].label.toLowerCase()).join(', ')} and more` });
    else if (pv.newFreight.length) extras.push({ title: 'Supply Yard starts buying', text: pv.newFreight.map((gd) => GOODS[gd].label).join(', ') });
    if (pv.districts.length) extras.push({ title: 'New districts to build', text: pv.districts.join(', ') });
    if (pv.pathOpens) extras.push({ title: 'Can specialise', text: 'Pick a path for the town: Breadbasket, The Forge, Trade Hub or The Boulevard' });
    // Wrapped lines push the next block down: about 6.3px per character at this size.
    // What is new goes in two columns on a wide window, so a big list still fits a short screen.
    const twoCol = inner >= 440 && extras.length > 1;
    const colW = twoCol ? (inner - 20) / 2 : inner;
    const lines = (t: string): number => Math.max(1, Math.ceil((t.length * 6.3) / colW));
    const extraH = (e: { title: string; text: string }): number => (e.title.length * 7.2 > colW ? 44 : 26) + lines(e.text) * 17 + 10;
    const pairs: { title: string; text: string }[][] = [];
    for (let i = 0; i < extras.length; i += twoCol ? 2 : 1) pairs.push(extras.slice(i, i + (twoCol ? 2 : 1)));
    const pairH = (pr: { title: string; text: string }[]): number => Math.max(...pr.map(extraH));
    const h = 132 + rows.length * 34 + 16 + pairs.reduce((n, pr) => n + pairH(pr), 0) + 82;
    const y = Math.max(TOP + 6, (H - h) / 2);
    im.rect(4, x, y, w, h, COLORS.panel, 1, 18, COLORS.accent, 1, 2);
    let cy = y + pad;
    im.text('grT', `${p.name} is ready to grow!`, x + w / 2, cy, { size: 22, bold: true, align: 'center', layer: 4 });
    cy += 34;
    im.text('grS', `${pv.from}  →  ${pv.to}`, x + w / 2, cy, { size: 16, bold: true, color: COLORS.accent, align: 'center', layer: 4 });
    cy += 30;
    im.text('grN', 'Your deliveries have grown this town. Here is what changes:', x + w / 2, cy, { size: 12, color: COLORS.muted, align: 'center', wrap: inner, layer: 4 });
    cy += 30;
    const c1 = x + pad;
    const c2 = x + pad + inner * 0.45;
    const c3 = x + pad + inner * 0.75;
    for (const [label, from, to] of rows) {
      im.rect(4, c1, cy, inner, 28, 0x131a24, 1, 8);
      im.text(`grR${label}`, label, c1 + 12, cy + 6, { size: 13, layer: 4 });
      im.text(`grF${label}`, from, c2, cy + 6, { size: 13, color: COLORS.muted, layer: 4 });
      im.text(`grA${label}`, '→', c3 - 26, cy + 6, { size: 13, color: COLORS.muted, layer: 4 });
      im.text(`grU${label}`, to, c3, cy + 6, { size: 13, bold: true, color: COLORS.good, layer: 4 });
      cy += 34;
    }
    cy += 10;
    for (const pr of pairs) {
      pr.forEach((e, k) => {
        const ex = c1 + k * (colW + 20);
        const th = im.text(`grE${e.title}`, e.title, ex, cy, { size: 13, bold: true, color: COLORS.accent, wrap: colW, layer: 4 }).h;
        im.text(`grX${e.title}`, e.text, ex, cy + th + 4, { size: 12, wrap: colW, layer: 4 });
      });
      cy += pairH(pr);
    }
    cy += 10;
    const bw = inner - 120 - 10;
    const gh = im.hit('grGo', c1, cy, bw, 46, () => {
      const err = growTown(g.world, p.id);
      this.toasts.push({ text: err ?? `${p.name} is now a ${pv.to}`, until: this.time.now + 3600 });
      if (!err) g.lookAt(p.x, p.y, 55, g.cam.heading, g.cam.pitchManual);
    }, 4);
    im.rect(4, c1, cy, bw, 46, gh ? 0xf2b04c : COLORS.accent, 1, 23);
    im.text('grGoT', `Grow into a ${pv.to}`, c1 + bw / 2, cy + 13, { size: 16, bold: true, color: 0x1b1204, align: 'center', layer: 4 });
    const lh = im.hit('grLater', c1 + bw + 10, cy, 120, 46, () => this.growLater.add(`${p.id}:${p.level}`), 4);
    im.rect(4, c1 + bw + 10, cy, 120, 46, lh ? 0x2a3646 : 0x1b2430, 1, 23, COLORS.line, 1);
    im.text('grLaterT', 'Later', c1 + bw + 70, cy + 14, { size: 14, bold: true, align: 'center', layer: 4 });
  }

  private placePanel(p: Place, x: number, y: number, w: number): number {
    const im = this.pim;
    const world = this.game3d.world;
    let cy = y;
    const lv = TOWN_LEVELS[p.level - 1];
    im.text('ppName', p.name, x, cy, { size: 17, bold: true, wrap: w - 36, layer: 2 });
    cy += 24;
    im.text('ppKind', `${lv.name}  ·  ${STYLE_LABEL[p.style]}  ·  Level ${p.level}  ·  population ${fmt(lv.pop)}`, x, cy, { size: 12, color: COLORS.muted, wrap: w, layer: 2 });
    cy += 22;
    if (readyToGrow(p)) {
      this.button('ppGrow', `Ready: grow into a ${TOWN_LEVELS[p.level].name}`, x, cy, w, 40, true, () => this.showGrow(p), 'main');
      cy += 48;
    }
    const path = p.path ? PATHS[p.path] : null;
    im.text('ppPath', path ? path.label : p.level >= 3 ? 'Ready to specialise' : 'No specialisation yet', x, cy, { size: 12, bold: true, color: path ? path.color : p.level >= 3 ? COLORS.accent : COLORS.muted, layer: 2 });
    cy += 24;

    const next = TOWN_LEVELS[p.level];
    im.line(2, x, cy, x + w, cy, COLORS.line, 1);
    cy += 10;
    if (next) {
      const kinds = GOOD_LIST.filter((gd) => (p.delivered[gd] ?? 0) > 0).length;
      im.text('ppGrowH', `GROWING INTO A ${next.name.toUpperCase()}`, x, cy, { size: 11, bold: true, color: COLORS.muted, layer: 2 });
      cy += 20;
      im.bar(2, x, cy + 2, w - 90, 8, p.growth / next.growth, COLORS.good);
      im.text('ppGrow', `${fmt(p.growth)} / ${fmt(next.growth)}`, x + w, cy - 2, { size: 12, color: COLORS.muted, align: 'right', layer: 2 });
      cy += 22;
      const ok = kinds >= p.level;
      im.text('ppVar', `Needs ${p.level} different goods delivered (${kinds} so far)`, x, cy, { size: 12, color: ok ? COLORS.good : COLORS.warn, wrap: w, layer: 2 });
      cy += 26;
    } else {
      im.text('ppMax', 'This town has reached its full size.', x, cy, { size: 12, color: COLORS.good, layer: 2 });
      cy += 26;
    }

    for (const dock of world.sites.filter((s) => s.placeId === p.id)) {
      cy += 4;
      im.text(`ppDock${dock.id}`, dock.name.toUpperCase(), x, cy, { size: 11, bold: true, color: COLORS.muted, layer: 2 });
      cy += 20;
      for (const gd of dockDemand(world, dock)) {
        const cap = siteCap(world, dock);
        const n = stockOf(dock, gd);
        im.text(`ppG${dock.id}${gd}`, GOODS[gd].label, x, cy, { size: 12, layer: 2 });
        im.bar(2, x + 70, cy + 5, w - 70 - 62, 7, n / cap, COLORS.info);
        im.text(`ppV${dock.id}${gd}`, `$${unitPrice(world, dock, gd).toFixed(1)}`, x + w, cy, { size: 12, bold: true, color: COLORS.warn, align: 'right', layer: 2 });
        cy += 21;
      }
    }
    cy += 10;
    im.text('ppNote', 'Towns use up what you deliver. Full docks pay less, so spread your deliveries around.', x, cy, { size: 11, color: COLORS.muted, wrap: w, layer: 2 });
    cy += 34;
    const mhov = im.hit('ppManage', x, cy, w, 42, () => this.openManage(p.id), 2);
    im.rect(2, x, cy, w, 42, mhov ? 0xf0b250 : COLORS.accent, 1, 21);
    im.text('ppManageT', 'Manage town', x + w / 2, cy + 12, { size: 15, bold: true, color: 0x1b1204, align: 'center', layer: 3 });
    cy += 54;
    return cy - y;
  }

  // ---- generated icons ----

  private roadIcon(): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.width = c.height = 160;
    const ctx = c.getContext('2d')!;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#2f3237';
    ctx.lineWidth = 30;
    ctx.beginPath();
    ctx.moveTo(30, 126);
    ctx.bezierCurveTo(70, 140, 50, 70, 90, 78);
    ctx.bezierCurveTo(124, 84, 110, 36, 134, 34);
    ctx.stroke();
    ctx.strokeStyle = '#5b5e64';
    ctx.lineWidth = 24;
    ctx.stroke();
    ctx.strokeStyle = '#e6c25a';
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 9]);
    ctx.stroke();
    ctx.setLineDash([]);
    for (const [x, y, col] of [[30, 126, '#4cc38a'], [134, 34, '#e8a23a']] as [number, number, string][]) {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(x, y, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 4;
      ctx.stroke();
    }
    return c;
  }

  private highwayIcon(): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.width = c.height = 160;
    const ctx = c.getContext('2d')!;
    ctx.lineCap = 'butt';
    const path = (): void => {
      ctx.beginPath();
      ctx.moveTo(24, 132);
      ctx.bezierCurveTo(70, 142, 52, 70, 92, 80);
      ctx.bezierCurveTo(124, 86, 110, 38, 138, 28);
    };
    ctx.strokeStyle = '#2f3237';
    ctx.lineWidth = 46;
    path();
    ctx.stroke();
    ctx.strokeStyle = '#575a60';
    ctx.lineWidth = 40;
    path();
    ctx.stroke();
    ctx.strokeStyle = '#e6c25a';
    ctx.lineWidth = 3;
    path();
    ctx.stroke();
    ctx.strokeStyle = '#e8e8e0';
    ctx.lineWidth = 2;
    ctx.setLineDash([9, 9]);
    ctx.save();
    for (const off of [-10, 10]) {
      ctx.translate(off * 0.7, 0);
      path();
      ctx.stroke();
      ctx.translate(-off * 0.7, 0);
    }
    ctx.restore();
    return c;
  }

  private seaIcon(): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.width = c.height = 160;
    const ctx = c.getContext('2d')!;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#bfe6ff';
    ctx.lineWidth = 6;
    ctx.setLineDash([2, 14]);
    ctx.beginPath();
    ctx.moveTo(26, 118);
    ctx.bezierCurveTo(60, 138, 100, 100, 134, 120);
    ctx.stroke();
    ctx.setLineDash([]);
    for (const [x, y, col] of [[26, 118, '#4cc38a'], [134, 120, '#e8a23a']] as [number, number, string][]) {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(x, y, 12, 0, Math.PI * 2);
      ctx.fill();
    }
    // A ship: hull, containers, bridge and funnel.
    ctx.fillStyle = '#26323e';
    ctx.beginPath();
    ctx.moveTo(40, 72);
    ctx.lineTo(124, 72);
    ctx.lineTo(112, 94);
    ctx.lineTo(54, 94);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#9a2f28';
    ctx.fillRect(54, 88, 58, 6);
    const cols = ['#b23a30', '#2f5f8a', '#d7a21f', '#3f7a55'];
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = cols[i];
      ctx.fillRect(52 + i * 14, 56, 12, 16);
    }
    ctx.fillStyle = '#e9eaeb';
    ctx.fillRect(108, 44, 14, 28);
    ctx.fillStyle = '#9a2f28';
    ctx.fillRect(112, 32, 7, 12);
    return c;
  }

  private airIcon(): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.width = c.height = 160;
    const ctx = c.getContext('2d')!;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#d9d4b4';
    ctx.lineWidth = 6;
    ctx.setLineDash([2, 14]);
    ctx.beginPath();
    ctx.moveTo(28, 124);
    ctx.quadraticCurveTo(70, 20, 132, 40);
    ctx.stroke();
    ctx.setLineDash([]);
    for (const [x, y, col] of [[28, 124, '#4cc38a'], [132, 40, '#e8a23a']] as [number, number, string][]) {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(x, y, 12, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#eceeef';
    ctx.save();
    ctx.translate(86, 52);
    ctx.rotate(-0.1);
    ctx.beginPath();
    ctx.ellipse(0, 0, 22, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(-4, -20, 8, 40);
    ctx.fillRect(-20, -4, 8, 8);
    ctx.restore();
    return c;
  }

  private railIcon(): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.width = c.height = 160;
    const ctx = c.getContext('2d')!;
    const path = (): void => {
      ctx.beginPath();
      ctx.moveTo(26, 130);
      ctx.bezierCurveTo(70, 140, 46, 70, 88, 80);
      ctx.bezierCurveTo(122, 86, 108, 38, 136, 30);
    };
    ctx.lineCap = 'butt';
    ctx.strokeStyle = '#6f6a62';
    ctx.lineWidth = 30;
    path();
    ctx.stroke();
    ctx.strokeStyle = '#4a3a2c';
    ctx.lineWidth = 26;
    ctx.setLineDash([5, 11]);
    path();
    ctx.stroke();
    ctx.setLineDash([]);
    for (const [w, col] of [[16, '#2b2d30'], [10, '#c3c8ce']] as [number, string][]) {
      ctx.strokeStyle = col;
      ctx.lineWidth = 3 + (w - 10) / 3;
      path();
      ctx.stroke();
    }
    return c;
  }

  private demolishIcon(): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.width = c.height = 160;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#e5604f';
    ctx.beginPath();
    ctx.arc(80, 80, 56, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 16;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(56, 56);
    ctx.lineTo(104, 104);
    ctx.moveTo(104, 56);
    ctx.lineTo(56, 104);
    ctx.stroke();
    return c;
  }

  private cursorIcon(): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.width = c.height = 160;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#e8edf2';
    ctx.strokeStyle = '#10151c';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(48, 28);
    ctx.lineTo(48, 122);
    ctx.lineTo(72, 100);
    ctx.lineTo(90, 138);
    ctx.lineTo(108, 130);
    ctx.lineTo(90, 94);
    ctx.lineTo(122, 92);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    return c;
  }

  /** Tools in a tab, for tests and the key hints. */
  static tabs(): Tab[] {
    return TABS;
  }
}

export type { OverlayItem };
