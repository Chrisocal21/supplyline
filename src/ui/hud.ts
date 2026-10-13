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
  VEHICLE_ORDER,
  PATHS,
  AIR_COST_PER_TILE,
  AIR_TIER,
  type Good,
  BUILD_ORDER,
  type SiteKind,
  type VehicleKind,
} from '../sim/defs';
import {
  demolishRefund,
  dockDemand,
  produces,
  siteCap,
  siteSpeed,
  stockOf,
  tradeUpPreview,
  unitPrice,
  upgradeCost,
  addVehicle,
  linkableSites,
  startRoute,
  routeRefund,
  siteById,
  tradeUp,
  tradeUpError,
  vehicleError,
  upgradeError,
  wants,
  type Place,
  type Site,
} from '../sim/world';
import { nextQuest } from '../sim/quests';
import type { Game3D, HoverInfo, OverlayItem, Tool } from '../r3d/game3d';
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
    this.textures.addCanvas('thumb-tradeup', this.tradeIcon());

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
      else if (this.panelRect && p.x >= this.panelRect.x && p.x <= this.panelRect.x + this.panelRect.w && p.y >= this.panelRect.y && p.y <= this.panelRect.y + this.panelRect.h) this.panelScroll += dy;
      else if (!this.im.blocked(p.x, p.y)) this.game3d.wheel(p.x, p.y, dy);
    });

    this.game3d.onToast = (text) => this.toasts.push({ text, until: this.time.now + 3200 });
    onInputChange((m) => this.toasts.push({ text: m === 'touch' ? 'Touch controls' : 'Mouse and keyboard controls', until: this.time.now + 2200 }));

    // A first-time player gets the guide straight away. Screenshot and demo links skip it.
    try {
      if (!this.game3d.demo && !localStorage.getItem(GUIDE_KEY)) {
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
    if (this.sheet) {
      this.sheet = null;
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
    if (this.sheet) {
      this.panelRect = null;
      this.sheetLayer(W, H);
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
    const g = this.game3d;
    const w = 236;
    const x = W - w - 12;
    const items: [string, string, () => void][] = [
      ['Quests', 'G', () => this.toggleSheet('quests')],
      ['How to play', 'H', () => this.toggleSheet('guide')],
      ['Save game', 'S', () => this.act(g.save() ? 'Game saved' : 'Could not save')],
      ['Load game', 'L', () => this.act(g.load() ? 'Game loaded' : 'No saved game found')],
      ['New world', 'N', () => this.newWorld()],
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

  private confirmNew = 0;
  private newWorld(): void {
    if (this.time.now < this.confirmNew) {
      this.confirmNew = 0;
      this.game3d.newWorld();
      this.activeTab = 'select';
      this.toasts.push({ text: 'New world generated', until: this.time.now + 2500 });
    } else {
      this.confirmNew = this.time.now + 3000;
      this.toasts.push({ text: 'Click New again to discard this game', until: this.time.now + 3000 });
    }
  }

  private act(text: string): void {
    this.toasts.push({ text, until: this.time.now + 2400 });
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
        blurb: 'Drag from anywhere. Between two buildings that trade, a box truck comes with it.',
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
        blurb: 'Drag from anywhere. Between two buildings that trade, a freight train comes with it.',
        detail: ['Rail is its own network, apart from roads.', 'Every town has a Rail Station on its edge. Run track to it (or just point at the Market) and whatever the train unloads is sold on to the town.', 'Where track meets a road it makes a level crossing, at a right angle on a straight stretch.', `Bridges and tunnels: up to ${[2, 4, 8, 16][Math.min(3, w.tier)]} tiles at Tier ${w.tier}.`],
      };
    }
    if (tool === 'air') {
      return {
        name: 'Air Route',
        cost: `$${AIR_COST_PER_TILE}/tile`,
        locked: w.tier < AIR_TIER ? `Tier ${AIR_TIER}` : null,
        thumb: 'thumb-air',
        blurb: 'Click one airport, then another. A cargo plane comes with it.',
        detail: ['Planes fly in a straight line over water and mountains.', 'Airports store goods like hubs: tick what they should pull, and connect them to factories by road or rail.', 'Add more planes with the Cargo Plane card.'],
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
    if (tool === 'tradeup') {
      return {
        name: 'Trade up',
        cost: 'less your old one',
        locked: null,
        thumb: 'thumb-tradeup',
        blurb: 'Swap the smallest vehicle on a route for the next class up.',
        detail: ['Box Truck, Big Box Truck, Big Rig, Truck Fleet. Freight Train, Heavy Haul Train. Cargo Plane, Cargo Jet.', 'You get half of the old vehicle back. Bigger classes unlock with the tiers.', 'Click a road, a rail line or an airport on an air route.'],
      };
    }
    if (tool in VEHICLE_DEFS) {
      const d = VEHICLE_DEFS[tool as VehicleKind];
      return {
        name: d.label,
        cost: `$${fmt(d.cost)}`,
        locked: !d.implemented ? 'Coming soon' : d.tier > w.tier ? `Tier ${d.tier}` : null,
        thumb: `thumb-${tool}`,
        blurb: d.blurb,
        detail: [`Carries ${d.capacity} units`, `${d.mode === 'road' ? 'Roads' : d.mode === 'rail' ? 'Rails' : 'Air routes'}`, d.mode === 'rail' ? 'Click a rail line to add one.' : d.mode === 'air' ? 'Click an airport on an air route to add one.' : 'Click a road to add one.'],
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
    else if (g.tool === 'demolish') text = h?.site ? `${byInput('Click', 'Tap')} to demolish ${h.site.name}` : h?.route ? (h.error ? h.error : `${byInput('Click', 'Tap')} to remove this ${h.route.mode === 'rail' ? 'track' : h.route.grade === 'highway' ? 'highway' : 'road'} for $${fmt(routeRefund(w, h.route))} back`) : `${byInput('Click', 'Tap')} a building or a road to remove it`;
    else if (g.tool === 'tradeup') {
      const pv = h?.route ? tradeUpPreview(w, h.route.id) : null;
      text = pv ? `${VEHICLE_DEFS[pv.from].label} to ${VEHICLE_DEFS[pv.to].label} for $${fmt(pv.cost)}` : `${byInput('Click', 'Tap')} a road, rail line or airport to trade up its smallest vehicle`;
    } else if (g.tool in VEHICLE_DEFS) {
      const d = VEHICLE_DEFS[g.tool as VehicleKind];
      text = `${byInput('Click', 'Tap')} ${d.mode === 'air' ? 'an airport on an air route' : d.mode === 'rail' ? 'a rail line' : 'a road'} to add a ${d.label} ($${fmt(d.cost)}, carries ${d.capacity})`;
    } else if (g.tool !== 'select') {
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
  private sitePanel(s: Site, x: number, y: number, w: number): number {
    const im = this.pim;
    const g = this.game3d;
    const world = g.world;
    const def = SITE_DEFS[s.kind];
    let cy = y;
    im.text('spName', s.name, x, cy, { size: 17, bold: true, wrap: w - 36, layer: 2 });
    cy += 24;
    im.text('spKind', `${def.label}${def.dock || def.station ? '' : `  ·  Level ${s.level}`}`, x, cy, { size: 12, color: COLORS.muted, layer: 2 });
    cy += 22;
    const st = this.siteStatus(s);
    im.circle(2, x + 5, cy + 8, 4, st.color);
    im.text('spStatus', st.text, x + 16, cy, { size: 13, color: st.color, wrap: w - 16, layer: 2 });
    cy += 26;

    if (s.nodeId !== null) {
      const node = world.nodes.find((n) => n.id === s.nodeId);
      if (node) {
        const q = NODE_QUALITY[node.quality];
        im.text('spNode', `${q.label} ${node.kind} node  ·  ${q.mult >= 1 ? '+' : ''}${Math.round((q.mult - 1) * 100)}% output`, x, cy, { size: 12, color: COLORS.muted, layer: 2 });
        cy += 22;
      }
    }

    im.line(2, x, cy, x + w, cy, COLORS.line, 1);
    cy += 10;
    im.text('spStoreH', 'STORAGE', x, cy, { size: 11, bold: true, color: COLORS.muted, layer: 2 });
    cy += 20;
    const cap = siteCap(world, s);
    const waiting = (gd: Good): number => (def.station ? (s.out?.[gd] ?? 0) : stockOf(s, gd));
    const goods = Array.from(new Set([...(def.hub ? GOOD_LIST : produces(s)), ...wants(world, s)])).filter((gd) => !def.station || waiting(gd) >= 1);
    if (def.station && goods.length === 0) {
      im.text('spEmpty', 'Nothing waiting for a train', x, cy, { size: 12, color: COLORS.muted, layer: 2 });
      cy += 22;
    }
    goods.forEach((gd) => {
      const n = waiting(gd);
      im.text(`spG${gd}`, GOODS[gd].label, x, cy, { size: 12, layer: 2 });
      im.bar(2, x + 78, cy + 5, w - 78 - 70, 7, n / cap, n / cap > 0.85 ? COLORS.bad : COLORS.good);
      im.text(`spN${gd}`, `${Math.floor(n)} / ${cap}`, x + w, cy, { size: 12, color: COLORS.muted, align: 'right', layer: 2 });
      cy += 22;
    });

    if (def.produce || def.recipe) {
      const per = def.produce ? 1 : Object.values(def.recipe!.outputs)[0] ?? 1;
      const every = def.produce ? def.produce.every : def.recipe!.every;
      const rate = ((TICKS_PER_SECOND * 60) / every) * siteSpeed(world, s) * per;
      const outGood = def.produce ? def.produce.good : (Object.keys(def.recipe!.outputs)[0] as Good);
      cy += 4;
      im.text('spRate', `Makes about ${rate.toFixed(1)} ${GOODS[outGood].label.toLowerCase()} per minute`, x, cy, { size: 12, color: COLORS.muted, wrap: w, layer: 2 });
      cy += 24;
    }

    if (def.dock) {
      cy += 6;
      im.text('spWantH', 'PAYS PER UNIT', x, cy, { size: 11, bold: true, color: COLORS.muted, layer: 2 });
      cy += 20;
      for (const gd of dockDemand(world, s)) {
        im.text(`spP${gd}`, GOODS[gd].label, x, cy, { size: 12, layer: 2 });
        im.text(`spPv${gd}`, `$${unitPrice(world, s, gd).toFixed(1)}`, x + w, cy, { size: 12, bold: true, color: COLORS.warn, align: 'right', layer: 2 });
        cy += 20;
      }
    }

    if (def.station) {
      cy += 6;
      im.text('spStN', 'Factories in this town send their goods here once a track serves the station, and trains carry them away. Lay track with the Rail tool. The station sells goods on to the Market and Freight Yard as they have room, at their prices.', x, cy, { size: 11, color: COLORS.muted, wrap: w, layer: 2 });
      cy += 52;
    }

    if (def.hub) {
      cy += 6;
      im.text('spPullH', 'PULLS FROM SUPPLIERS', x, cy, { size: 11, bold: true, color: COLORS.muted, layer: 2 });
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
      im.text('spPullN', 'A hub takes in what you tick and passes it on to anything that needs it.', x, cy, { size: 11, color: COLORS.muted, wrap: w, layer: 2 });
      cy += 34;
    }

    cy += this.vehicleSection(s, x, cy + 6, w) + 6;

    if (!def.dock && !def.station) {
      cy += 4;
      const err = upgradeError(world, s.id);
      const can = !err;
      const label = s.level >= 3 ? 'Max level' : `Upgrade to level ${s.level + 1}   $${fmt(upgradeCost(s))}`;
      const hov = s.level < 3 && im.hit('upgrade', x, cy, w, 36, () => can && g.upgrade(s.id));
      im.rect(2, x, cy, w, 36, can ? (hov ? 0xf2b04c : COLORS.accent) : 0x202a37, 1, 10);
      im.text('upgT', label, x + w / 2, cy + 10, { size: 13, bold: true, color: can ? 0x1b1204 : COLORS.muted, align: 'center', layer: 3 });
      cy += 44;
      if (s.level < 3) {
        const nextBoost = `Level ${s.level + 1}: output x${[1, 1.8, 3.2][s.level]}, storage x${LEVEL_CAP[s.level]}`;
        im.text('upgInfo', err && !can ? `${err}. ${nextBoost}` : nextBoost, x, cy, { size: 11, color: err ? COLORS.warn : COLORS.muted, wrap: w, layer: 2 });
        cy += 34;
      }
      const dh = im.hit('demolish', x, cy, w, 30, () => g.demolish(s.id));
      im.rect(2, x, cy, w, 30, dh ? 0x4a2420 : 0x2a1a1a, 1, 8, COLORS.bad, 0.6);
      im.text('demT', `Demolish   +$${fmt(demolishRefund(s))}`, x + w / 2, cy + 7, { size: 12, bold: true, color: COLORS.bad, align: 'center', layer: 3 });
      cy += 38;
    }
    return cy - y;
  }

  /** Which class each route's Buy button buys. */
  private buyKind = new Map<number, VehicleKind>();

  /** The vehicles that serve a building: for each route it is on, what runs there, with Buy and Trade up. */
  private vehicleSection(s: Site, x: number, y: number, w: number): number {
    const im = this.pim;
    const world = this.game3d.world;
    const SHORT: Record<VehicleKind, string> = { boxtruck: 'Box', bigtruck: 'Big box', rig: 'Rig', convoy: 'Fleet', train: 'Train', heavytrain: 'Heavy', plane: 'Plane', jet: 'Jet' };
    const say = (text: string): void => {
      this.toasts.push({ text, until: this.time.now + 3200 });
    };
    let cy = y;
    im.line(2, x, cy - 6, x + w, cy - 6, COLORS.line, 1);
    im.text('spVehH', 'VEHICLES', x, cy, { size: 11, bold: true, color: COLORS.muted, layer: 2 });
    cy += 20;
    const routes = world.routes.filter((r) => !r.free && (r.fromSiteId === s.id || r.toSiteId === s.id));
    const links = linkableSites(world, s.id);
    if (routes.length === 0 && links.length === 0) {
      im.text('spVehN', 'No routes yet. Lay a road from this building to a building that trades with it (or onto a road that reaches one), and a truck comes with it. Then buy more here, or trade them up.', x, cy, { size: 11, color: COLORS.muted, wrap: w, layer: 2 });
      return cy + 64 - y;
    }
    for (const r of routes.slice(0, 8)) {
      const other = siteById(world, r.fromSiteId === s.id ? r.toSiteId : r.fromSiteId);
      const vs = world.vehicles.filter((v) => v.routeId === r.id);
      const counts = new Map<VehicleKind, number>();
      for (const v of vs) counts.set(v.kind, (counts.get(v.kind) ?? 0) + 1);
      const carries = vs.reduce((n, v) => n + VEHICLE_DEFS[v.kind].capacity, 0);
      im.rect(2, x, cy, w, 128, 0x131a24, 1, 10, COLORS.line, 1);
      im.text(`vr${r.id}n`, `To ${other?.name ?? 'a building'}`, x + 10, cy + 8, { size: 12, bold: true, wrap: w - 20, layer: 3 });
      const mix = [...counts.entries()].map(([k, n]) => `${n} ${VEHICLE_DEFS[k].label}${n > 1 ? 's' : ''}`).join(', ');
      im.text(`vr${r.id}m`, vs.length ? `${mix}  ·  carries ${carries} per trip` : 'No vehicles', x + 10, cy + 26, { size: 11, color: COLORS.muted, wrap: w - 20, layer: 3 });
      // Pick a class, then buy it.
      const classes = VEHICLE_ORDER.filter((k) => VEHICLE_DEFS[k].mode === r.mode && VEHICLE_DEFS[k].implemented);
      const chosen = this.buyKind.get(r.id) && classes.includes(this.buyKind.get(r.id)!) ? this.buyKind.get(r.id)! : classes[0];
      const gap = 4;
      const cw = (w - 20 - gap * (classes.length - 1)) / classes.length;
      classes.forEach((k, i) => {
        const cx = x + 10 + i * (cw + gap);
        const locked = VEHICLE_DEFS[k].tier > world.tier;
        const on = k === chosen;
        const hov = im.hit(`vr${r.id}c${k}`, cx, cy + 50, cw, 24, () => (locked ? say(`${VEHICLE_DEFS[k].label} unlocks at Tier ${VEHICLE_DEFS[k].tier}`) : this.buyKind.set(r.id, k)), 3);
        im.rect(3, cx, cy + 50, cw, 24, on ? 0x1f2c3a : hov ? 0x1a2431 : 0x10161e, 1, 8, on ? COLORS.accent : COLORS.line, 1);
        im.text(`vr${r.id}ct${k}`, SHORT[k], cx + cw / 2, cy + 56, { size: 10, bold: true, color: locked ? 0x566170 : on ? COLORS.accent : COLORS.text, align: 'center', layer: 4 });
      });
      const bw = (w - 20 - gap) / 2;
      const buyErr = vehicleError(world, r.id, chosen);
      const bx = x + 10;
      const by = cy + 84;
      const bh = im.hit(`vr${r.id}b`, bx, by, bw, 34, () => {
        const e = addVehicle(world, r.id, chosen);
        say(e ?? `${VEHICLE_DEFS[chosen].label} added`);
      }, 3);
      im.rect(3, bx, by, bw, 34, buyErr ? 0x151c26 : bh ? 0xf2b04c : COLORS.accent, 1, 10, buyErr ? COLORS.line : COLORS.accent, 1);
      im.text(`vr${r.id}bt`, `Buy ${SHORT[chosen]}  $${fmt(VEHICLE_DEFS[chosen].cost)}`, bx + bw / 2, by + 10, { size: 12, bold: true, color: buyErr ? COLORS.muted : 0x1b1204, align: 'center', layer: 4 });
      const pv = tradeUpPreview(world, r.id);
      const upErr = pv ? tradeUpError(world, r.id) : 'Already the top class';
      const ux = bx + bw + gap;
      const uh = im.hit(`vr${r.id}u`, ux, by, bw, 34, () => {
        const before = tradeUpPreview(world, r.id);
        const e = tradeUp(world, r.id);
        say(e ?? `${VEHICLE_DEFS[before!.from].label} traded up to a ${VEHICLE_DEFS[before!.to].label}`);
      }, 3);
      im.rect(3, ux, by, bw, 34, upErr ? 0x151c26 : uh ? 0x2a3b50 : 0x1b2735, 1, 10, upErr ? COLORS.line : COLORS.accent, 1);
      im.text(`vr${r.id}ut`, pv ? `Trade up  $${fmt(pv.cost)}` : 'Top class', ux + bw / 2, by + 10, { size: 12, bold: true, color: upErr ? COLORS.muted : COLORS.accent, align: 'center', layer: 4 });
      cy += 136;
    }
    // Buildings already reached by road or track, with no route yet: one button starts it.
    if (links.length) {
      im.text('spLinkH', 'CONNECTED, NO ROUTE YET', x, cy + 2, { size: 11, bold: true, color: COLORS.muted, layer: 2 });
      cy += 22;
      for (const l of links.slice(0, 8)) {
        const first: VehicleKind = l.mode === 'rail' ? 'train' : 'boxtruck';
        const err = world.money < VEHICLE_DEFS[first].cost ? 'Need money' : null;
        im.rect(2, x, cy, w, 44, 0x131a24, 1, 10, COLORS.line, 1);
        im.text(`lk${l.site.id}n`, l.site.name, x + 10, cy + 6, { size: 12, bold: true, wrap: w - 130, layer: 3 });
        im.text(`lk${l.site.id}d`, `${l.path.length - 1} tiles by ${l.mode === 'rail' ? 'rail' : 'road'}`, x + 10, cy + 24, { size: 10, color: COLORS.muted, layer: 3 });
        const bx = x + w - 118;
        const hov = im.hit(`lk${l.site.id}b`, bx, cy + 6, 108, 32, () => {
          const e = startRoute(world, s.id, l.site.id);
          say(e ?? `${VEHICLE_DEFS[first].label} on its way to ${l.site.name}`);
        }, 3);
        im.rect(3, bx, cy + 6, 108, 32, err ? 0x151c26 : hov ? 0xf2b04c : COLORS.accent, 1, 10);
        im.text(`lk${l.site.id}bt`, `Start  $${fmt(VEHICLE_DEFS[first].cost)}`, bx + 54, cy + 15, { size: 12, bold: true, color: err ? COLORS.muted : 0x1b1204, align: 'center', layer: 4 });
        cy += 50;
      }
    }
    return cy - y;
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

  private tradeIcon(): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.width = c.height = 160;
    const ctx = c.getContext('2d')!;
    // A small truck, an arrow, and a bigger truck.
    ctx.fillStyle = '#dfe1e3';
    ctx.fillRect(18, 98, 34, 22);
    ctx.fillStyle = '#3b6ea5';
    ctx.fillRect(52, 104, 14, 16);
    ctx.fillStyle = '#1f2124';
    ctx.beginPath();
    ctx.arc(28, 122, 6, 0, Math.PI * 2);
    ctx.arc(58, 122, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e8a23a';
    ctx.beginPath();
    ctx.moveTo(80, 30);
    ctx.lineTo(104, 58);
    ctx.lineTo(90, 58);
    ctx.lineTo(90, 78);
    ctx.lineTo(70, 78);
    ctx.lineTo(70, 58);
    ctx.lineTo(56, 58);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#dfe1e3';
    ctx.fillRect(86, 84, 56, 36);
    ctx.fillStyle = '#2f7a6a';
    ctx.fillRect(86, 84, 56, 6);
    ctx.fillRect(142, 92, 12, 28);
    ctx.fillStyle = '#1f2124';
    ctx.beginPath();
    ctx.arc(98, 124, 8, 0, Math.PI * 2);
    ctx.arc(126, 124, 8, 0, Math.PI * 2);
    ctx.arc(148, 124, 8, 0, Math.PI * 2);
    ctx.fill();
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
