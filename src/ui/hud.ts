// The HUD: a transparent Phaser scene over the 3D view. Everything is drawn with the immediate-mode helper in imui.ts.
import Phaser from 'phaser';
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
  PATHS,
  AIR_COST_PER_TILE,
  DEPOT_COST,
  AIR_TIER,
  type Good,
  BUILD_ORDER,
  type SiteKind,
} from '../sim/defs';
import {
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
  depotError,
  wants,
  type Place,
  type Site,
  type Tile,
  type Vehicle,
} from '../sim/world';
import { nextQuest } from '../sim/quests';
import { Game3D, type HoverInfo, type OverlayItem, type Tool } from '../r3d/game3d';
import { COLORS, Im } from './imui';
import { Rates, Sheets, type SheetId } from './sheets';
import { byInput, inputMode, isTouch, onInputChange } from './inputmode';

const TOP = 72;
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
const GUIDE_KEY = 'supplyline.guide.v1';

interface Tab {
  id: string;
  label: string;
  icon: string;
  blurb: string;
  tools: Tool[];
}

const sitesIn = (category: string): Tool[] => BUILD_ORDER.filter((k) => SITE_DEFS[k].category === category);

const TABS: Tab[] = [
  { id: 'select', label: 'Select', icon: 'thumb-select', blurb: 'Inspect buildings and towns', tools: [] },
  { id: 'production', label: 'Production', icon: 'thumb-forestry', blurb: 'Extract raw goods from forests, farmland, pasture, clay, hills and mountains', tools: sitesIn('production') },
  { id: 'processing', label: 'Processing', icon: 'thumb-sawmill', blurb: 'Food and materials. Build these on a free plot in a town.', tools: sitesIn('processing') },
  { id: 'manufacturing', label: 'Manufacturing', icon: 'thumb-workshop', blurb: 'Paper, textiles, furniture. Build these on a free plot in a town.', tools: sitesIn('manufacturing') },
  { id: 'heavy', label: 'Heavy Industry', icon: 'thumb-smelter', blurb: 'Stone, metal, glass and machinery. Build these on a free plot in a town.', tools: sitesIn('heavy') },
  { id: 'logistics', label: 'Logistics', icon: 'thumb-route', blurb: 'Roads, highways, rails, hubs and clearing the way', tools: ['route', 'highway', 'rail', 'air', 'hub', 'airport', 'demolish'] },
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
  private readonly rates = new Rates();
  private sheets!: Sheets;
  private cim!: Im;
  private sheetCam!: Phaser.Cameras.Scene2D.Camera;
  /** Height of the bottom UI (dock plus the open tray), so labels and hints stay clear of it. */
  private bottomInset = DOCK_H + EDGE;

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
    this.textures.addCanvas('thumb-highway', this.highwayIcon());
    this.textures.addCanvas('thumb-select', this.cursorIcon());
    this.textures.addCanvas('thumb-demolish', this.demolishIcon());

    const kb = this.input.keyboard!;
    this.keys = kb.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,Q,E') as Record<string, Phaser.Input.Keyboard.Key>;
    kb.addCapture('TAB,SPACE,UP,DOWN,LEFT,RIGHT');
    kb.on('keydown-ESC', () => this.escape());
    kb.on('keydown-SPACE', () => (this.game3d.speed = this.game3d.speed === 0 ? 1 : 0));
    kb.on('keydown-TAB', () => this.cycleTab());
    kb.on('keydown-P', () => this.toggleSheet('production'));
    kb.on('keydown-BACKSPACE', () => this.game3d.undoDraft());
    kb.on('keydown-ENTER', () => {
      if (this.game3d.draft) this.game3d.finishDraft();
    });
    kb.on('keydown-T', () => this.toggleSheet('towns'));
    kb.on('keydown-G', () => this.toggleSheet('quests'));
    kb.on('keydown-H', () => this.toggleSheet('guide'));
    for (let i = 1; i <= 9; i++) kb.on(`keydown-${['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE'][i - 1]}`, () => this.pickByNumber(i - 1));

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (this.im.blocked(p.x, p.y)) return;
      this.menuOpen = false;
      this.dragging = true;
      this.game3d.pointerDown(p.x, p.y, (p.event as MouseEvent).button ?? 0);
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
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
      if (this.sheet) this.sheets.scrollBy(dy);
      else if (this.dash !== null) this.dashScroll += dy;
      else if (this.panelRect && p.x >= this.panelRect.x && p.x <= this.panelRect.x + this.panelRect.w && p.y >= this.panelRect.y && p.y <= this.panelRect.y + this.panelRect.h) this.panelScroll += dy;
      else if (!this.im.blocked(p.x, p.y)) this.game3d.wheel(p.x, p.y, dy);
    });

    this.game3d.onToast = (text) => this.toasts.push({ text, until: this.time.now + 3200 });
    onInputChange((m) => this.toasts.push({ text: m === 'touch' ? 'Touch controls' : 'Mouse and keyboard controls', until: this.time.now + 2200 }));

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

  // ---- input helpers ----

  /** Open the Towns sheet on one town's path and districts. */
  private openManage(id: number): void {
    this.sheets.manage = id;
    this.sheets.scroll = 0;
    this.sheet = 'towns';
    this.menuOpen = false;
  }

  private toggleSheet(id: SheetId): void {
    this.sheet = this.sheet === id ? null : id;
    this.sheets.scroll = 0;
    this.menuOpen = false;
    if (this.sheet) this.activeTab = 'select';
  }

  private escape(): void {
    const g = this.game3d;
    if (this.menuOpen) {
      this.menuOpen = false;
      return;
    }
    if (this.saves) {
      this.saves = null;
      return;
    }
    if (this.sheet) {
      this.sheet = null;
      return;
    }
    if (this.dash !== null) {
      this.dash = null;
      return;
    }
    if (g.draft) g.cancelDraft();
    else if (g.tool !== 'select') {
      const tab = this.activeTab;
      this.setTool('select');
      this.activeTab = tab;
    }
    else g.select(null);
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
    this.topBar(W);
    const growing = !this.sheet && !g.draft && !this.saves ? this.pendingGrowth() : undefined;
    if (this.saves) {
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
    this.toastsLayer(W, now);
    this.tooltip(W, H);
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
      const label = demolish ? `Demolish ${info.site?.name ?? ''}` : `${d?.label} $${fmt(d?.cost ?? 0)}`;
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

  private topBar(W: number): void {
    const im = this.im;
    const g = this.game3d;
    const w = g.world;
    const y = 10;
    const h = 52;
    const mid = y + h / 2;

    // Money, bottom left of the top edge.
    const mw = 214;
    this.pill(12, y, mw, h);
    im.circle(1, 40, mid, 17, 0xe8b23a);
    im.circle(1, 40, mid, 13, 0xc9951f);
    im.text('coin', '$', 40, mid - 9, { size: 16, bold: true, color: 0xf7e3a8, align: 'center', layer: 2 });
    im.text('money', fmt(w.money), 66, y + 5, { size: 23, bold: true, layer: 2 });
    const inc = this.income;
    im.text('income', `${inc >= 0 ? '+' : '-'}$${fmt(Math.abs(inc))} per min`, 66, y + 31, { size: 12, color: inc > 0 ? COLORS.good : COLORS.muted, layer: 2 });

    // Right cluster: speed, then the sheets and menu.
    const bw = 54;
    const btn = 26;
    const rx = W - 12;
    const menuX = rx - bw / 2;
    const helpX = menuX - bw - 6;
    const townX = helpX - bw - 6;
    const prodX = townX - bw - 6;
    const sp = [0, 1, 2, 4];
    const spW = sp.length * 46 + 10;
    const spX = prodX - bw / 2 - 10 - spW;
    this.pill(spX, y, spW, h);
    sp.forEach((v, i) => {
      const cx = spX + 5 + 23 + i * 46;
      const on = g.speed === v;
      this.roundButton(`speed${v}`, cx, mid, 20, on, () => (g.speed = v));
      const col = on ? 0x1b1204 : COLORS.text;
      if (v === 0) {
        im.rect(2, cx - 7, mid - 8, 4.5, 16, col, 1, 1);
        im.rect(2, cx + 2.5, mid - 8, 4.5, 16, col, 1, 1);
      } else {
        im.text(`speedT${v}`, `${v}x`, cx, mid - 9, { size: 15, bold: true, color: col, align: 'center', layer: 2 });
      }
    });
    void btn;

    this.roundButton('btnProd', prodX, mid, 26, this.sheet === 'production', () => this.toggleSheet('production'));
    this.pillRing(prodX, mid, this.sheet === 'production');
    this.factoryIcon(prodX, mid, this.sheet === 'production' ? 0x1b1204 : COLORS.text);
    this.roundButton('btnTown', townX, mid, 26, this.sheet === 'towns', () => this.toggleSheet('towns'));
    this.pillRing(townX, mid, this.sheet === 'towns');
    this.townIcon(townX, mid, this.sheet === 'towns' ? 0x1b1204 : COLORS.text);
    this.roundButton('btnHelp', helpX, mid, 26, this.sheet === 'guide', () => this.toggleSheet('guide'));
    this.pillRing(helpX, mid, this.sheet === 'guide');
    im.text('helpQ', '?', helpX, mid - 15, { size: 25, bold: true, color: this.sheet === 'guide' ? 0x1b1204 : COLORS.text, align: 'center', layer: 2 });
    this.roundButton('btnMenu', menuX, mid, 26, this.menuOpen, () => (this.menuOpen = !this.menuOpen));
    this.pillRing(menuX, mid, this.menuOpen);
    const mc = this.menuOpen ? 0x1b1204 : COLORS.text;
    for (const dy of [-8, 0, 8]) im.rect(2, menuX - 11, mid + dy - 1.5, 22, 3, mc, 1, 1.5);

    // The quest bar: tier and the next quest, in the space between the money and the buttons. Click it for the full list.
    const free0 = 12 + mw + 12;
    const free1 = spX - 12;
    const cw = Math.min(430, free1 - free0);
    if (cw >= 250) {
      const cx0 = Math.round(Math.max(free0, Math.min(free1 - cw, W / 2 - cw / 2)));
      const on = this.sheet === 'quests';
      const hov = im.hit('questPill', cx0, y, cw, h, () => this.toggleSheet('quests'), 1);
      im.rect(1, cx0, y, cw, h, hov ? 0x18212d : COLORS.panel, 0.94, h / 2, on || hov ? COLORS.accent : COLORS.line, on || hov ? 0.9 : 1);
      im.circle(1, cx0 + 28, mid, 20, COLORS.accent);
      im.text('tierN', String(w.tier), cx0 + 28, mid - 13, { size: 24, bold: true, color: 0x1b1204, align: 'center', layer: 2 });
      const bx = cx0 + 62;
      const next = nextQuest(w);
      if (next) {
        im.text('goal', next.quest.label, bx, y + 7, { size: cw < 330 ? 12 : 13, bold: true, layer: 2 });
        im.bar(1, bx, y + 34, cw - 62 - 98, 8, next.progress.have / next.progress.need, COLORS.accent);
        im.text('goalN', `${fmt(next.progress.have)} / ${fmt(next.progress.need)}`, cx0 + cw - 18, y + 27, { size: 13, bold: true, color: COLORS.warn, align: 'right', layer: 2 });
      } else {
        im.text('goal', 'All quests complete', bx, y + 16, { size: 14, bold: true, color: COLORS.good, layer: 2 });
      }
      if (hov) im.tip('questPill');
    }

    if (this.menuOpen) this.menuPanel(W, y + h + 8);
  }

  private pillRing(cx: number, cy: number, on: boolean): void {
    if (!on) this.im.ring(1, cx, cy, 25, 1.5, 1, COLORS.line);
  }

  private factoryIcon(cx: number, cy: number, c: number): void {
    const im = this.im;
    im.rect(2, cx - 12, cy - 1, 24, 12, c, 1, 2);
    im.rect(2, cx + 5, cy - 12, 6, 12, c, 1, 1);
    im.rect(2, cx - 12, cy - 7, 8, 6, c, 1, 1);
    im.rect(2, cx - 3, cy - 7, 8, 6, c, 1, 1);
  }

  private townIcon(cx: number, cy: number, c: number): void {
    const im = this.im;
    im.rect(2, cx - 13, cy - 1, 9, 12, c, 1, 2);
    im.rect(2, cx - 4, cy - 11, 10, 22, c, 1, 2);
    im.rect(2, cx + 7, cy + 2, 7, 9, c, 1, 2);
  }

  private menuPanel(W: number, y: number): void {
    const im = this.im;
    const w = 236;
    const x = W - w - 12;
    const items: [string, string, () => void][] = [
      ['Quests', 'G', () => this.toggleSheet('quests')],
      ['How to play', 'H', () => this.toggleSheet('guide')],
      ['Save / Load', 'S', () => this.openSaves('manage')],
      ['New world', 'N', () => this.openSaves('new')],
    ];
    const ph = items.length * 54 + 20 + 92;
    im.rect(3, x, y, w, ph, COLORS.panel, 0.98, 18, COLORS.line, 1);
    im.block({ x, y, w, h: ph });
    items.forEach(([label, , fn], i) => {
      const by = y + 10 + i * 54;
      const hov = im.hit(`menu${label}`, x + 10, by, w - 20, 46, () => { fn(); this.menuOpen = false; }, 3);
      im.rect(3, x + 10, by, w - 20, 46, hov ? 0x243142 : 0x172130, 1, 12, COLORS.line, 1);
      im.text(`menuT${label}`, label, x + w / 2, by + 13, { size: 15, bold: true, align: 'center', layer: 4 });
    });
    const cy = y + 10 + items.length * 54 + 6;
    im.line(3, x + 14, cy, x + w - 14, cy, COLORS.line, 1, 1);
    im.text('menuHelp', byInput('Drag to move. Right-drag to turn and tilt. Wheel to zoom. P, T, G and H open the sheets. Space pauses.', 'Drag to move. Pinch to zoom. Twist two fingers to turn, drag them up or down to tilt.'), x + 16, cy + 10, { size: 11, color: COLORS.muted, wrap: w - 32, layer: 4 });
    im.text('menuInput', `Controls: ${inputMode() === 'touch' ? 'touch' : 'mouse and keyboard'}`, x + 16, y + ph - 22, { size: 11, color: COLORS.accent, layer: 4 });
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
      if (info) im.text(`sv${i}d`, `Tier ${info.tier}  ·  $${fmt(info.money)}  ·  ${info.minutes} min played  ·  saved ${when(info.savedAt)}`, x + pad + 14, cy + 36, { size: 11, color: COLORS.muted, wrap: inner - 230, layer: 4 });
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
        detail: ['Rail is its own network, apart from roads.', 'Trains reach a town through a Rail Depot: build one on a Distribution Hub (Tier 2), then run track to it. Out in the country, track can join any two buildings.', 'Where track meets a road it makes a level crossing, at a right angle on a straight stretch.', `Bridges and tunnels: up to ${[2, 4, 8, 16][Math.min(3, w.tier)]} tiles at Tier ${w.tier}.`],
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

    // Dock: one compact floating bar of categories, centred at the bottom.
    const tabW = Math.max(60, Math.min(DOCK_TAB_W, Math.floor((W - 24 - DOCK_PAD * 2 - (TABS.length - 1) * 6) / TABS.length)));
    const dockW = TABS.length * tabW + (TABS.length - 1) * 6 + DOCK_PAD * 2;
    const dx = Math.round(W / 2 - dockW / 2);
    const dy = H - EDGE - DOCK_H;
    im.rect(1, dx, dy, dockW, DOCK_H, COLORS.panel, 0.95, 18, COLORS.line, 1);
    im.block({ x: dx, y: dy, w: dockW, h: DOCK_H });
    TABS.forEach((t, i) => {
      const x = dx + DOCK_PAD + i * (tabW + 6);
      const y = dy + DOCK_PAD;
      const on = this.activeTab === t.id;
      const hov = im.hit(`tab${t.id}`, x, y, tabW, DOCK_TAB_H, () => (on && t.id !== 'select' && g.tool === 'select' ? this.openTab('select') : this.openTab(t.id)));
      im.rect(1, x, y, tabW, DOCK_TAB_H, on ? 0x1f2c3a : hov ? 0x1a2431 : 0x131b25, 1, 12, on ? COLORS.accent : 0x131b25, 1, on ? 2 : 0);
      im.image(`tabImg${t.id}`, t.icon, x + (tabW - 36) / 2, y + 6, 36, 36, on ? 1 : 0.85, 2);
      im.text(`tabT${t.id}`, t.label, x + tabW / 2, y + 46, { size: tabW < 84 ? 10 : 12, bold: true, color: on ? COLORS.accent : COLORS.text, align: 'center', layer: 2 });
      if (!isTouch()) im.text(`tabK${t.id}`, String(i + 1), x + 7, y + 4, { size: 10, color: COLORS.muted, layer: 2 });
    });
    this.bottomInset = DOCK_H + EDGE;

    // Key hints sit in the corner beside the dock, in as much detail as there is room for.
    const room = W - 14 - (dx + dockW + 12);
    const keys = ['Tab: category   1-9: pick   P: production   T: towns   G: quests   H: guide   Esc: cancel   Space: pause', 'P: production   T: towns   G: quests   H: guide', 'G: quests   H: guide'].find((s) => s.length * 5.7 < room);
    if (keys && !isTouch()) im.text('keysHint', keys, W - 14, H - 22, { size: 11, color: COLORS.muted, align: 'right', alpha: 0.7 });

    if (!open) return;

    // Tray: the cards for the open category float above the dock, wrapping onto more rows when there are many.
    const n = tab.tools.length;
    const perRow = Math.max(1, Math.min(n, Math.floor((W - 48 - TRAY_PAD * 2 + 10) / (CARD_W + 10))));
    const rows = Math.ceil(n / perRow);
    const trayW = perRow * CARD_W + (perRow - 1) * 10 + TRAY_PAD * 2;
    const trayH = 24 + TRAY_PAD * 2 + rows * CARD_H + (rows - 1) * 10;
    const tx = Math.round(W / 2 - trayW / 2);
    const ty = dy - DOCK_GAP - trayH;
    im.rect(1, tx, ty, trayW, trayH, COLORS.panel, 0.95, 18, COLORS.line, 1);
    im.block({ x: tx, y: ty, w: trayW, h: trayH });
    im.text('trayTitle', tab.blurb, tx + TRAY_PAD + 4, ty + 9, { size: 12, color: COLORS.muted, layer: 2 });
    tab.tools.forEach((tool, i) => {
      const cx = tx + TRAY_PAD + (i % perRow) * (CARD_W + 10);
      const cy = ty + TRAY_PAD + 24 + Math.floor(i / perRow) * (CARD_H + 10);
      const info = this.cardInfo(tool);
      const on = g.tool === tool;
      const id = `card${tool}`;
      const hov = im.hit(id, cx, cy, CARD_W, CARD_H, () => this.setTool(tool));
      im.rect(1, cx, cy, CARD_W, CARD_H, on ? 0x1b3a36 : hov ? 0x1f2b3a : COLORS.panelAlt, 1, 12, on ? COLORS.good : hov ? 0x3a4a5e : COLORS.line, 1, on ? 2 : 1);
      im.image(`cardImg${tool}`, info.thumb, cx + (CARD_W - 68) / 2, cy + 6, 68, 68, info.locked ? 0.35 : 1, 2);
      im.text(`cardName${tool}`, info.name, cx + CARD_W / 2, cy + 78, { size: info.name.length > 14 ? 11 : 12, bold: true, align: 'center', layer: 2, alpha: info.locked ? 0.55 : 1 });
      im.text(`cardCost${tool}`, info.locked ?? info.cost, cx + CARD_W / 2, cy + 96, { size: 12, color: info.locked ? COLORS.muted : COLORS.warn, align: 'center', layer: 2 });
      if (i < 9 && !isTouch()) im.text(`cardKey${tool}`, String(i + 1), cx + 8, cy + 5, { size: 11, color: COLORS.muted, layer: 2 });
      if (hov) im.tip(id);
    });
    this.bottomInset = DOCK_H + EDGE + DOCK_GAP + trayH;
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
    else if (g.tool === 'demolish') text = h?.site ? `${byInput('Click', 'Tap')} to demolish ${h.site.name}` : h?.route ? (h.error ? h.error : `${byInput('Click', 'Tap')} to remove this stretch of ${h.route.mode === 'rail' ? 'track' : h.route.grade === 'highway' ? 'highway' : 'road'} for $${fmt(routeRefund(w, h.route))} back`) : `${byInput('Click', 'Tap')} a building or a road to remove it`;
    else if (g.tool !== 'select') {
      const d = SITE_DEFS[g.tool as SiteKind];
      text = h ? (h.error ? h.error : `${byInput('Click', 'Tap')} to build ${d.label} for $${fmt(d.cost)}`) : `${d.label} $${fmt(d.cost)}`;
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
      r.x0 > 8 && r.x1 < W - 8 && r.y0 > TOP + 4 && r.y1 < H - this.bottomInset - 4 && !placed.some((p) => r.x0 < p.x1 && r.x1 > p.x0 && r.y0 < p.y1 && r.y1 > p.y0);
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
      out.push({ text: s.name, bold: true, size: 14 }, { text: `${def.label}${def.dock || def.station ? '' : ` · Level ${s.level}`}`, color: COLORS.muted });
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
      return stockOf(s, def.produce.good) >= cap ? { text: 'Full: needs a truck to collect', color: COLORS.bad } : { text: 'Producing', color: COLORS.good };
    }
    if (def.recipe) {
      if (!s.making) return { text: 'Off: choose what to make below', color: COLORS.warn };
      const ok = Object.entries(def.recipe.inputs).every(([gd, n]) => stockOf(s, gd as Good) >= (n ?? 0));
      if (!ok) return { text: `Waiting for ${Object.keys(def.recipe.inputs).map((gd) => GOODS[gd as Good].label.toLowerCase()).join(' and ')}`, color: COLORS.warn };
      const full = Object.keys(def.recipe.outputs).some((gd) => stockOf(s, gd as Good) >= cap);
      return full ? { text: 'Full: needs a truck to collect', color: COLORS.bad } : { text: 'Running', color: COLORS.good };
    }
    if (def.hub) return { text: 'Storing and relaying goods', color: COLORS.info };
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
    const w = g.world;
    const x = W - PANEL_W - 12;
    const y = TOP + 12;
    const im = this.im;
    let cy = y + 14;
    const px = x + 16;
    const inner = PANEL_W - 32;

    const site = sel.kind === 'site' ? w.sites.find((s) => s.id === sel.id) : undefined;
    const place = sel.kind === 'place' ? w.places.find((p) => p.id === sel.id) : undefined;
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
    const maxH = Math.max(180, H - this.bottomInset - y - 10);
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
    im.text('spKind', `${def.label}${def.dock || def.station ? '' : `  ·  Level ${s.level}`}`, x, cy, { size: 12, color: COLORS.muted, layer: 2 });
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
      this.button('spOpen', def.dock ? 'Open market' : 'Open station', x, cy, w, 42, true, () => this.openDash(s.id), 'main');
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
    this.button('spOpen', 'Open building', x, cy, w, 42, true, () => this.openDash(s.id), 'main');
    cy += 50;
    return cy - y;
  }

  /** Everything about a building that is not its buyers or its trucks: the flow or what it holds, and upgrades. */
  private infoColumn(s: Site, x: number, y: number, w: number): number {
    const im = this.pim;
    const g = this.game3d;
    const world = g.world;
    const def = SITE_DEFS[s.kind];
    const maker = !!(def.produce || def.recipe);
    let cy = y;
    if (maker) cy += this.flowCard(s, x, cy, w) + 10;
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
      im.text('spPullN', 'A hub stores the overflow from your supply lines. Tick what it takes in, then pick who it sells to.', x, cy, { size: 11, color: COLORS.muted, wrap: w, layer: 2 });
      cy += 34;
    }

    if (def.hub && !def.airport) {
      cy += 4;
      const derr = depotError(world, s.id);
      const built = !!s.depot;
      const dcan = !derr;
      const dh = !built && im.hit('depot', x, cy, w, 34, () => {
        if (!dcan) return;
        // Close the menus so the work can be watched from start to finish.
        this.dash = null;
        g.select(null);
        g.buildDepot(s.id);
      });
      im.rect(2, x, cy, w, 34, built ? 0x15251c : dcan ? (dh ? 0x2a3b50 : 0x1b2735) : 0x151c26, 1, 10, built ? COLORS.good : dcan ? COLORS.accent : COLORS.line, 1);
      im.text('depT', built ? 'Rail Depot built' : `Build Rail Depot   $${fmt(DEPOT_COST)}`, x + w / 2, cy + 9, { size: 12, bold: true, color: built ? COLORS.good : dcan ? COLORS.accent : COLORS.muted, align: 'center', layer: 3 });
      cy += 40;
      const dtext = built
        ? 'Trains can reach this hub: lay track to it, then buy a train here. Trucks and trains work side by side.'
        : derr
          ? `${derr}. A depot lets trains bring goods to this hub and carry them away.`
          : 'Adds a rail yard so trains can serve this hub, alongside its trucks. Trains reach a town only through a depot.';
      im.text('depInfo', dtext, x, cy, { size: 11, color: derr && !built ? COLORS.warn : COLORS.muted, wrap: w, layer: 2 });
      cy += 40;
    }

    if (!def.dock && !def.station) {
      cy += 4;
      const err = upgradeError(world, s.id);
      const can = !err;
      const label = s.level >= 3 ? 'Max level' : `Upgrade building to level ${s.level + 1}   $${fmt(upgradeCost(s))}`;
      const hov = s.level < 3 && im.hit('upgrade', x, cy, w, 34, () => {
        if (!can) return;
        // Close the menus so the work can be watched from start to finish.
        this.dash = null;
        g.select(null);
        g.upgrade(s.id);
      });
      im.rect(2, x, cy, w, 34, can ? (hov ? 0x2a3b50 : 0x1b2735) : 0x151c26, 1, 10, can ? COLORS.accent : COLORS.line, 1);
      im.text('upgT', label, x + w / 2, cy + 9, { size: 12, bold: true, color: can ? COLORS.accent : COLORS.muted, align: 'center', layer: 3 });
      cy += 40;
      if (s.level < 3) {
        const nextBoost = `Level ${s.level + 1} makes ${[1, 1.8, 3.2][s.level]}x as much and stores ${LEVEL_CAP[s.level]}x more.`;
        im.text('upgInfo', err && !can ? `${err}. ${nextBoost}` : nextBoost, x, cy, { size: 11, color: err ? COLORS.warn : COLORS.muted, wrap: w, layer: 2 });
        cy += 34;
      }
      const dh = im.hit('demolish', x, cy, w, 30, () => {
        this.dash = null;
        g.demolish(s.id);
      });
      im.rect(2, x, cy, w, 30, dh ? 0x4a2420 : 0x2a1a1a, 1, 8, COLORS.bad, 0.6);
      im.text('demT', `Demolish   +$${fmt(demolishRefund(s))}`, x + w / 2, cy + 7, { size: 12, bold: true, color: COLORS.bad, align: 'center', layer: 3 });
      cy += 38;
    }
    return cy - y;
  }

  // ---- building dashboard: a full-page window for one building ----

  /** The building whose dashboard is open, or null. */
  private dash: number | null = null;
  private dashScroll = 0;
  private dashMax = 0;

  private openDash(id: number): void {
    this.dash = id;
    this.dashScroll = 0;
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
    const sub = [def.label, def.dock || def.station ? '' : `Level ${s.level}`, node ? `${NODE_QUALITY[node.quality].label} ${node.kind} spot` : '', town ? `in ${town.name}` : ''].filter(Boolean).join('  ·  ');
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

    // Body, scrolling: the next step across the top, then columns.
    const top = y + headH + 8;
    const bottom = y + h - 10;
    this.cim.clipBox = { x, y: top, w, h: bottom - top };
    this.sheetCam.setVisible(true).setViewport(x, top, w, bottom - top).setScroll(x, top);
    const pad = 22;
    const inner = w - pad * 2;
    let cy = top + 6 - this.dashScroll;
    if (def.dock || def.station) {
      const st = this.siteStatus(s);
      this.pim.circle(2, x + pad + 5, cy + 8, 4, st.color);
      this.pim.text('dsStatus', st.text, x + pad + 16, cy, { size: 14, color: st.color, layer: 2 });
      cy += 30;
    } else cy += this.nextStepCard(s, x + pad, cy, Math.min(inner, 760)) + 18;
    const cols = inner >= 960 ? 3 : inner >= 620 ? 2 : 1;
    const gap = 26;
    const cw = (inner - gap * (cols - 1)) / cols;
    const colX = (i: number): number => x + pad + i * (cw + gap);
    type Col = (cx: number, yy: number, ww: number) => number;
    const info: Col = (cx, yy, ww) => {
      const t = def.dock ? 'WHAT IT BUYS' : def.station ? 'THE STATION' : def.produce || def.recipe ? 'PRODUCTION' : 'STORAGE';
      const top2 = this.sectionHead('dcA', t, cx, yy + 6, ww);
      return top2 - yy + this.infoColumn(s, cx, top2, ww);
    };
    const parts: Col[] = def.dock || def.station
      ? [info, (cx, yy, ww) => this.suppliersSection(s, cx, yy + 6, ww) + 6, (cx, yy, ww) => this.townSection(s, cx, yy + 6, ww) + 6]
      : [info, (cx, yy, ww) => this.buyerSection(s, cx, yy + 6, ww) + 6, (cx, yy, ww) => this.truckSection(s, cx, yy + 6, ww) + 6];
    let hA = 0;
    let hB = 0;
    let hC = 0;
    if (cols === 3) {
      hA = parts[0](colX(0), cy, cw);
      hB = parts[1](colX(1), cy, cw);
      hC = parts[2](colX(2), cy, cw);
    } else if (cols === 2) {
      hA = parts[0](colX(0), cy, cw);
      hA += parts[2](colX(0), cy + hA + 6, cw) + 6;
      hB = parts[1](colX(1), cy, cw);
    } else {
      hA = parts[0](colX(0), cy, cw);
      hA += parts[1](colX(0), cy + hA + 6, cw) + 6;
      hA += parts[2](colX(0), cy + hA + 6, cw) + 6;
    }
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

  /** Your buildings that sell to this one: joined to it, with the sale switched on. */
  private suppliersOf(s: Site): Site[] {
    const world = this.game3d.world;
    return world.sites.filter((o) => o.id !== s.id && buyersFor(world, o, 0).some((b) => b.site.id === s.id && b.on));
  }

  private suppliersSection(s: Site, x: number, y: number, w: number): number {
    const im = this.pim;
    let cy = this.sectionHead('suH', 'WHO SELLS HERE', x, y, w);
    const list = this.suppliersOf(s);
    if (list.length === 0) {
      im.text('suN', 'None of your buildings sell here yet. Open a factory or a camp, and tap Sell here next to this one.', x, cy, { size: 11, color: COLORS.muted, wrap: w, layer: 2 });
      return cy + 40 - y;
    }
    for (const o of list) {
      const rec = o.sales?.[s.id];
      im.rect(2, x, cy, w, 50, 0x12261f, 1, 10, COLORS.good, 1);
      im.text(`su${o.id}n`, o.name, x + 10, cy + 8, { size: 12, bold: true, wrap: w - 100, layer: 3 });
      im.text(`su${o.id}s`, rec ? `Sold ${fmt(rec.units)} for $${fmt(rec.money)}` : 'Nothing sold yet', x + 10, cy + 28, { size: 11, color: rec ? COLORS.good : COLORS.muted, layer: 3 });
      this.button(`su${o.id}o`, 'Open', x + w - 80, cy + 9, 70, 32, true, () => this.openDash(o.id));
      cy += 56;
    }
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

  /** The single most useful thing to do next at this building. */
  private nextStep(s: Site): { text: string; color: number; label?: string; ok?: boolean; act?: () => void } {
    const g = this.game3d;
    const world = g.world;
    const def = SITE_DEFS[s.kind];
    const word = this.goodsWord(s);
    if (def.recipe && !s.making) return { text: `Press Start to make ${word}.`, color: COLORS.warn, label: 'Start', ok: true, act: () => g.making(s.id, true) };
    const fleet = fleetOf(world, s.id);
    const kind = buyOptions(world, s.id)[0];
    if (fleet.length === 0 && kind) {
      return { text: `Buy a ${VEHICLE_DEFS[kind].label.toLowerCase()} to carry your ${def.hub ? 'goods' : word}.`, color: COLORS.warn, label: `Buy  $${fmt(VEHICLE_DEFS[kind].cost)}`, ok: buyError(world, s.id, kind) === null, act: () => g.buy(s.id, kind) };
    }
    const buyers = buyersFor(world, s);
    const joined = buyers.filter((b) => b.connected);
    if (joined.length === 0) {
      const far = buyers.find((b) => !b.connected);
      if (!far) return { text: def.hub ? 'Join this hub to a buyer with a road.' : `Nobody nearby buys ${word} yet.`, color: COLORS.warn };
      const cost = this.roadCost(s.id, far.site.id);
      return { text: `No road to anyone who buys ${word}. ${far.site.name} would.`, color: COLORS.warn, label: cost === null ? 'No way' : `Road  $${cost === undefined ? '...' : fmt(cost)}`, ok: !!cost && world.money >= cost, act: () => g.roadTo(s.id, far.site.id) };
    }
    const selling = joined.filter((b) => b.on);
    if (selling.length === 0) {
      const b = joined[0];
      return { text: `Choose who buys your ${word}. ${b.site.name} is joined to you.`, color: COLORS.warn, label: 'Sell there', ok: true, act: () => g.sendTo(s.id, b.site.id, true) };
    }
    if (def.recipe) {
      const short = Object.keys(def.recipe.inputs).find((gd) => stockOf(s, gd as Good) < (def.recipe!.inputs[gd as Good] ?? 0)) as Good | undefined;
      if (short && !world.sites.some((o) => o.id !== s.id && produces(o).includes(short) && world.routes.some((r) => !r.free && ((r.fromSiteId === o.id && r.toSiteId === s.id) || (r.fromSiteId === s.id && r.toSiteId === o.id))))) {
        return { text: `Out of ${GOODS[short].label.toLowerCase()}. Build a road from something that makes it.`, color: COLORS.warn };
      }
    }
    if (selling.every((b) => b.goods.every((gd) => !wants(world, b.site).includes(gd) || this.demand(b.site, gd).want === 0))) {
      return { text: 'Your buyers are full. Goods wait here until they want more, or sell somewhere else too.', color: COLORS.warn };
    }
    return { text: 'All running.', color: COLORS.good };
  }

  private nextStepCard(s: Site, x: number, y: number, w: number): number {
    const im = this.pim;
    const step = this.nextStep(s);
    const bw = step.label ? 104 : 0;
    const t = im.text('nsT', step.text, x + 12, y + 10, { size: 12, bold: true, color: step.color === COLORS.good ? COLORS.good : COLORS.text, wrap: w - 24 - (bw ? bw + 8 : 0), layer: 3 });
    const h = Math.max(step.label ? 50 : 36, t.h + 20);
    im.rect(2, x, y, w, h, step.color === COLORS.good ? 0x12261f : 0x2a2312, 1, 12, step.color, 0.8);
    if (step.label) this.button('nsB', step.label, x + w - bw - 8, y + (h - 34) / 2, bw, 34, !!step.ok, () => step.act?.(), 'main');
    return h;
  }

  /** What goes in, the building, and what comes out, as one picture. */
  private flowCard(s: Site, x: number, y: number, w: number): number {
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
      const by = (Object.keys(def.recipe.outputs) as Good[]).slice(1);
      if (by.length) {
        im.text('flBy', `Also makes ${by.map((gd) => `${GOODS[gd].label.toLowerCase()} (${Math.floor(stockOf(s, gd))})`).join(', ')}`, x, cy, { size: 11, color: COLORS.muted, layer: 2 });
        cy += 20;
      }
      // Start lives in the next-step card above; once running, this is where you pause it.
      if (s.making) {
        this.button('flGo', 'Pause production', x, cy, w, 32, true, () => g.making(s.id, false));
        cy += 38;
      }
    }
    return cy - y;
  }

  /** Who buys this building's goods: those joined to it, and the nearest that could be with a road. */
  private buyerSection(s: Site, x: number, y: number, w: number): number {
    const im = this.pim;
    const g = this.game3d;
    const world = g.world;
    const def = SITE_DEFS[s.kind];
    if (def.dock || def.station) return 0;
    let cy = this.sectionHead('byH', `WHO BUYS YOUR ${def.hub ? 'GOODS' : this.goodsWord(s).toUpperCase()}`, x, y, w);
    const buyers = buyersFor(world, s);
    if (buyers.length === 0) {
      im.text('byN', def.hub ? 'Nobody yet. Build a road from this hub to a market or a factory.' : 'Nobody nearby buys this yet. Towns want more kinds of goods as they grow.', x, cy, { size: 11, color: COLORS.muted, wrap: w, layer: 2 });
      return cy + 40 - y;
    }
    for (const b of buyers) {
      const id = `by${b.site.id}`;
      const dock = SITE_DEFS[b.site.kind].dock;
      const asked = b.goods.filter((gd) => wants(world, b.site).includes(gd) || !b.connected);
      const gd = asked[0] ?? b.goods[0];
      const h = 70;
      im.rect(2, x, cy, w, h, b.on ? 0x12261f : 0x131a24, 1, 10, b.on ? COLORS.good : COLORS.line, 1);
      im.text(`${id}n`, b.site.name, x + 10, cy + 8, { size: 12, bold: true, wrap: w - 110, layer: 3 });
      im.text(`${id}p`, dock ? `$${unitPrice(world, b.site, gd).toFixed(1)} each` : `uses ${GOODS[gd].label.toLowerCase()}`, x + w - 10, cy + 8, { size: 12, bold: true, color: dock ? COLORS.warn : COLORS.muted, align: 'right', layer: 3 });
      const bx = x + w - 110;
      const by = cy + 30;
      if (!b.connected) {
        im.text(`${id}s`, 'Not joined by road yet', x + 10, cy + 30, { size: 11, color: COLORS.muted, layer: 3 });
        const cost = this.roadCost(s.id, b.site.id);
        this.button(`${id}b`, cost === null ? 'No way' : `Road  $${cost === undefined ? '...' : fmt(cost)}`, bx, by, 100, 32, !!cost && world.money >= cost, () => g.roadTo(s.id, b.site.id));
      } else {
        const wanted = wants(world, b.site).includes(gd);
        const dm = wanted ? this.demand(b.site, gd) : { label: 'Not buying right now', color: COLORS.muted, want: 0 };
        im.text(`${id}s`, dm.label, x + 10, cy + 28, { size: 11, color: dm.color, layer: 3 });
        im.bar(3, x + 10, cy + 46, w - 140, 6, dm.want, dm.color);
        this.button(`${id}b`, b.on ? 'Selling' : 'Sell here', bx, by, 100, 32, true, () => g.sendTo(s.id, b.site.id, !b.on), b.on ? 'on' : 'plain');
      }
      const rec = s.sales?.[b.site.id];
      if (rec && rec.units > 0) im.text(`${id}r`, `Sold ${fmt(rec.units)} for $${fmt(rec.money)}`, x + 10, cy + 54, { size: 10, color: COLORS.muted, layer: 3 });
      cy += h + 6;
    }
    im.text('byX', def.produce ? 'Tap Selling to stop selling somewhere.' : 'Tap Sell here to start selling. Tap again to stop.', x, cy, { size: 10, color: COLORS.muted, wrap: w, layer: 2 });
    return cy + 24 - y;
  }

  /** Which trucks have their extra buttons open. */
  private truckOpen = new Set<number>();

  private truckStatus(v: Vehicle): { text: string; color: number } {
    const world = this.game3d.world;
    const route = v.routeId ? world.routes.find((r) => r.id === v.routeId) : undefined;
    const home = siteById(world, v.homeId);
    if (!route || !home) {
      const joined = world.routes.some((r) => !r.free && (r.fromSiteId === v.homeId || r.toSiteId === v.homeId));
      return { text: joined ? 'Waiting: nobody you sell to wants anything yet' : 'Waiting for a road', color: COLORS.warn };
    }
    const other = siteById(world, route.fromSiteId === v.homeId ? route.toSiteId : route.fromSiteId);
    const name = other?.name ?? 'the buyer';
    const homeIdx = route.fromSiteId === v.homeId ? 0 : route.path.length - 1;
    if (v.state === 'unloading') return { text: `Unloading at ${v.idx === homeIdx ? 'home' : name}`, color: COLORS.good };
    if (v.state === 'loading') return v.idx === homeIdx ? { text: `Loading ${this.goodsWord(home)}`, color: COLORS.good } : { text: `At ${name}`, color: COLORS.good };
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
    const fleet = fleetOf(world, s.id);
    let cy = this.sectionHead('trH', `YOUR ${def.airport ? 'PLANES' : 'TRUCKS'} (${fleet.length})`, x, y, w);
    const options = buyOptions(world, s.id);
    const gap = 6;
    options.forEach((k, i) => {
      const bw = (w - gap * (options.length - 1)) / options.length;
      this.button(`tb${k}`, `+ ${VEHICLE_DEFS[k].label}  $${fmt(VEHICLE_DEFS[k].cost)}`, x + i * (bw + gap), cy, bw, 34, buyError(world, s.id, k) === null, () => g.buy(s.id, k), fleet.length === 0 ? 'main' : 'plain');
    });
    if (options.length) cy += 42;
    else {
      im.text('trN', 'Lay track from this building to run trains.', x, cy, { size: 11, color: COLORS.muted, wrap: w, layer: 2 });
      cy += 24;
    }
    fleet.forEach((v, n) => {
      const vd = VEHICLE_DEFS[v.kind];
      const st = this.truckStatus(v);
      const open = this.truckOpen.has(v.id);
      const h = open ? 112 : 64;
      im.rect(2, x, cy, w, h, 0x131a24, 1, 10, COLORS.line, 1);
      im.text(`tv${v.id}n`, `${vd.label} ${n + 1}`, x + 10, cy + 8, { size: 12, bold: true, layer: 3 });
      im.text(`tv${v.id}c`, `carries ${vd.capacity}`, x + 10, cy + 26, { size: 10, color: COLORS.muted, layer: 3 });
      im.text(`tv${v.id}s`, st.text, x + 10, cy + 42, { size: 11, color: st.color, wrap: w - 20, layer: 3 });
      const upErr = upgradeVehicleError(world, v.id);
      const next = vd.next ? VEHICLE_DEFS[vd.next] : null;
      this.button(`tv${v.id}u`, !next ? 'Top class' : next.tier > world.tier ? `Bigger at Tier ${next.tier}` : `Upgrade  $${fmt(upgradeVehicleCost(v.kind))}`, x + w - 170, cy + 8, 116, 28, upErr === null, () => {
        this.dash = null;
        g.select(null);
        g.upgradeVeh(v.id);
      });
      this.button(`tv${v.id}m`, open ? 'Less' : 'More', x + w - 48, cy + 8, 40, 28, true, () => (open ? this.truckOpen.delete(v.id) : this.truckOpen.add(v.id)));
      if (open) {
        const dests = destinationsOf(world, v);
        const pinned = dests.find((d) => d.id === v.destId);
        const label = pinned ? `Only to ${pinned.name}` : 'Goes to: any buyer';
        this.button(`tv${v.id}d`, label.length > 26 ? `${label.slice(0, 25)}…` : label, x + 10, cy + 68, w - 120, 32, dests.length > 0, () => {
          const ids = [0, ...dests.map((d) => d.id)];
          g.vehicleDest(v.id, ids[(ids.indexOf(v.destId) + 1) % ids.length]);
        });
        this.button(`tv${v.id}x`, `Sell  +$${fmt(sellVehicleValue(v))}`, x + w - 104, cy + 68, 94, 32, true, () => g.sellVeh(v.id));
      }
      cy += h + 6;
    });
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
    if (pv.freightOpens) extras.push({ title: 'Freight Yard opens', text: `Buys raw goods and by-products: ${pv.newFreight.slice(0, 6).map((gd) => GOODS[gd].label.toLowerCase()).join(', ')} and more` });
    else if (pv.newFreight.length) extras.push({ title: 'Freight Yard starts buying', text: pv.newFreight.map((gd) => GOODS[gd].label).join(', ') });
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
