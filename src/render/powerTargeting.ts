/**
 * Age Power targeting and zone display (DESIGN A2.9 Casting, B6 HUD "power drag targeting").
 *
 * - Drag = place (owner decision "Age Power targeting"); a tap enters aiming mode, Space auto-aims
 *   (the sim's `densest` scan). The HUD reports the pointer, the view converts it to own-side
 *   progress p, clamped to the power zone band p ∈ [150, 1,050].
 * - While dragging (or aiming after a tap), a large ghost of the power's area follows the pointer at
 *   world scale: team colour when a drop there fires, red when it would cancel (over the HUD). The
 *   enemy units it would hit get a gold ring and a chevron.
 * - Every cast shows a 1.0 s telegraph to both sides: a pulsing zone outline in the caster's team
 *   colour (drawn here; the art adds its `fx.telegraph_zone` decoration).
 * - Reach (A2.9.10 targeting): on pick-up the legal area of the slot's power is washed in your team
 *   colour with a 2 px edge line, three chevrons and a label plate ("Your half", "Near your army"); the
 *   rest of the lane dims. Past the band the ghost sticks to the edge for 120 lu (a small bump on first
 *   contact), beyond that it turns red and hatched with "Only in your half". The eligible enemies (the
 *   first N nearest your gate) carry number pips 1..N; the ones the zone covers get the gold ring,
 *   enemies in the zone the cap leaves alone a faint "not hit" outline. A strike shows a crosshair and a
 *   lock ring on the unit it would lock. A committed cast contracts the ghost (MR-70b).
 */
import type { PowerDef } from '@/contracts';
import { Container, Graphics, Text } from 'pixi.js';
import { shade, tint } from './teamColors';

/** Pointer travel (CSS px) that turns a press on the power button into a drag. */
export const DRAG_THRESHOLD_PX = 12;

/**
 * Width in lu of the area a power covers when aimed, or null when the power ignores the aim
 * (Stampede starts at your front, Royal Decree and Nanite Surge affect all your units, Paratroopers
 * land beyond the enemy front; decisions WP2 "abilities and powers").
 */
/** A strike's aim ghost width, lu: twice `economy.power.strikePickLu` (A2.9.7). */
const STRIKE_GHOST_LU = 160;

export function powerZoneLu(def: PowerDef | undefined): number | null {
  if (!def) return null;
  const e = def.effect;
  switch (e.kind) {
    case 'barrage':
    case 'sweep':
    case 'field':
      return e.zone;
    case 'cloud':
      return e.width;
    case 'strike':
      // A strike locks the eligible enemy nearest the aim within 80 lu (A2.9.7): the ghost covers that.
      return STRIKE_GHOST_LU;
    default:
      return null;
  }
}

/** Clamps own-side progress p (lu) to the power zone band. */
export function clampPowerP(p: number, band: readonly [number, number]): number {
  return Math.round(Math.min(band[1], Math.max(band[0], p)));
}

interface Zone {
  /** Centre world x (lu). */
  x: number;
  width: number;
  color: number;
  leftMs: number;
  totalMs: number;
  preview: boolean;
}

/** How the drag ghost decorates its area: falling strikes, a sweeping line or a drifting cloud. */
export type GhostStyle = 'barrage' | 'sweep' | 'cloud' | 'field' | 'strike' | 'plain';

export function ghostStyle(def: PowerDef | undefined): GhostStyle {
  const k = def?.effect.kind;
  // A stampede reads as a charge sweeping across its run.
  if (k === 'stampede') return 'sweep';
  return k === 'barrage' || k === 'sweep' || k === 'cloud' || k === 'field' || k === 'strike' ? k : 'plain';
}

/**
 * The reach band of the power being aimed (A2.9.10 step 1), world x. `gateX` is the caster's gate (the
 * wash starts there), `edgeX` the reach area's far bound (null: the whole lane, no edge), `farX` the
 * other gate (the dim runs to it). `dir` +1 when the caster's units walk toward +x.
 */
export interface ReachBandView {
  gateX: number;
  edgeX: number | null;
  farX: number;
  dir: 1 | -1;
  color: number;
  label: string | null;
}

/** A numbered pip over an eligible enemy (1 = nearest your gate). */
export interface GhostPip {
  x: number;
  y: number;
  size: number;
  n: number;
  covered: boolean;
}

/** A unit the dragged power would hit: world x, depth y and its size (lu). */
export interface GhostTarget {
  x: number;
  y: number;
  size: number;
}

/** Whether a unit at `x` (size `size`) is inside a zone of `width` centred on `cx` (lu). */
export function inZone(x: number, size: number, cx: number, width: number): boolean {
  return Math.abs(x - cx) <= width / 2 + size * 0.25;
}

interface Ghost {
  x: number;
  width: number;
  color: number;
  valid: boolean;
  style: GhostStyle;
  /** +1 when the caster's units walk toward +x. */
  dir: 1 | -1;
  /** Real ms since the ghost appeared (the pop-in) and since it last changed validity. */
  ageMs: number;
  flipMs: number;
  /** Invalid because it is beyond the power's reach (hatched, labelled), not over the HUD. */
  outOfReach: boolean;
  /** Stuck to the band's edge (the magnetic edge) and real ms since it first touched it. */
  edge: boolean;
  edgeMs: number;
  /** The label an out-of-reach ghost carries ("Only in your half"). */
  invalidLabel: string | null;
  /** World x beyond which nothing is hit (the Home line), for clipping the blast fringe; null = none. */
  clipX: number | null;
  /** Barrage blast radius (lu): the fringe drawn past the zone, clipped at `clipX`. */
  fringe: number;
}

/** Options of {@link ZoneOverlay.showPreview}. */
export interface GhostOptions {
  valid?: boolean;
  style?: GhostStyle;
  dir?: 1 | -1;
  outOfReach?: boolean;
  edge?: boolean;
  invalidLabel?: string | null;
  clipX?: number | null;
  fringe?: number;
}

/** The colour an invalid drop shows (a drop there cancels). */
export const GHOST_INVALID = 0xe0525a;
/** The ring under units the power would hit. */
export const GHOST_TARGET = 0xffd447;
/** Height of the ghost's light curtain (lu): tall enough to read at a glance on a phone. */
const CURTAIN_LU = 115;

/** How long the band fades in on pick-up (A2.9.10: 150 ms, `out`). */
const BAND_IN_MS = 150;
/** MR-70b: the ghost contracts to 0.9 (80 ms, `anticipate`), then fades. */
const COMMIT_SHRINK_MS = 80;
const COMMIT_FADE_MS = 140;
/** The magnetic edge's bump: 1.04 → 1 over 80 ms (`back`). */
const EDGE_BUMP_MS = 80;
/** Pip radius in CSS px. */
const PIP_PX = 10;

/** Draws active telegraphs, the reach band, the drag ghost, its pips and lock (one Graphics each layer). */
export class ZoneOverlay {
  /** Over the units: telegraphs, the ghost, pips, rings, labels and the dim beyond the band. */
  readonly root = new Container();
  /** Under the units (the ground decals layer): the band's team-colour wash. */
  readonly groundRoot = new Graphics();
  private readonly g = new Graphics();
  private readonly texts = new Container();
  private readonly pipTexts: Text[] = [];
  private bandText: Text | null = null;
  private invalidText: Text | null = null;
  private zones: Zone[] = [];
  private ghost: Ghost | null = null;
  private targets: GhostTarget[] = [];
  private pips: GhostPip[] = [];
  private notHit: GhostTarget[] = [];
  private lock: GhostTarget | null = null;
  private band: (ReachBandView & { ageMs: number }) | null = null;
  /** A committed ghost playing its exit (MR-70b); real ms since the commit. */
  private leaving: { ghost: Ghost; ms: number } | null = null;
  private reduceMotion = false;
  private t = 0;
  private rt = 0;

  constructor() {
    this.root.label = 'zones';
    this.root.eventMode = 'none';
    this.groundRoot.label = 'reachBand';
    this.groundRoot.eventMode = 'none';
    this.root.addChild(this.g, this.texts);
  }

  /** Reduce motion (U14): no pop, no bump, no chevron march; the band still fades in. */
  setReduceMotion(on: boolean): void {
    this.reduceMotion = on;
  }

  /** Shows (or with null hides) the reach band of the power being aimed. */
  setBand(b: ReachBandView | null): void {
    if (!b) {
      this.band = null;
      return;
    }
    this.band = { ...b, ageMs: this.band?.ageMs ?? 0 };
  }

  get bandShown(): ReachBandView | null {
    return this.band;
  }

  /** Number pips over the eligible enemies (A2.9.10 step 2); only drawn while the ghost is valid. */
  setPips(p: readonly GhostPip[]): void {
    this.pips = p.slice();
  }

  /** Enemies in the zone the cap or the mask leave untouched: a faint "not hit" outline. */
  setNotHit(t: readonly GhostTarget[]): void {
    this.notHit = t.slice();
  }

  /** A strike's locked unit (the lock ring), or null. */
  setLock(t: GhostTarget | null): void {
    this.lock = t;
  }

  /** The pips shown now (tests and dev hooks). */
  get pipCount(): number {
    return this.ghost?.valid ? this.pips.length : 0;
  }

  /** A cast was sent: the ghost contracts to 0.9 and fades (MR-70b); the band goes with it. */
  commit(): void {
    const g = this.ghost;
    this.hidePreview();
    if (g && g.valid && !this.reduceMotion) this.leaving = { ghost: g, ms: 0 };
  }

  telegraph(x: number, width: number, color: number, ms: number): void {
    this.zones.push({ x, width, color, leftMs: ms, totalMs: ms, preview: false });
  }

  /**
   * Shows the drag ghost of the power's area centred on world x. `valid` false tints it as a cancel
   * (the pointer is over the HUD). The ghost pops in when it first appears.
   */
  showPreview(x: number, width: number, color: number, o: GhostOptions = {}): void {
    const valid = o.valid !== false;
    const g = this.ghost;
    const edge = valid && o.edge === true;
    this.ghost = {
      x,
      width,
      color,
      valid,
      style: o.style ?? g?.style ?? 'plain',
      dir: o.dir ?? g?.dir ?? 1,
      ageMs: g?.ageMs ?? 0,
      flipMs: g && g.valid !== valid ? 0 : (g?.flipMs ?? 1000),
      outOfReach: !valid && o.outOfReach === true,
      edge,
      edgeMs: edge && !g?.edge ? 0 : (g?.edgeMs ?? 1000),
      invalidLabel: o.invalidLabel ?? null,
      clipX: o.clipX ?? null,
      fringe: o.fringe ?? 0,
    };
  }

  /** True on the frame the ghost first touched the band's edge (for the tick haptic). */
  get edgeJustHit(): boolean {
    return !!this.ghost?.edge && this.ghost.edgeMs === 0;
  }

  hidePreview(): void {
    this.ghost = null;
    this.targets = [];
    this.pips = [];
    this.notHit = [];
    this.lock = null;
    this.band = null;
  }

  /** Units the ghost would hit (highlighted with a ring and a chevron); only drawn while valid. */
  setTargets(t: readonly GhostTarget[]): void {
    this.targets = t.slice();
  }

  get previewing(): boolean {
    return this.ghost !== null;
  }

  /** The ghost's centre x (lu), validity and highlighted unit count, for tests and the dev hooks. */
  get preview(): { x: number; width: number; valid: boolean; targets: number } | null {
    const g = this.ghost;
    return g ? { x: g.x, width: g.width, valid: g.valid, targets: g.valid ? this.targets.length : 0 } : null;
  }

  /** Whether the ghost is out of reach (hatched) rather than over the HUD. */
  get outOfReach(): boolean {
    return !!this.ghost?.outOfReach;
  }

  get activeCount(): number {
    return this.zones.length;
  }

  /** `dtMs` is game time; `scale` px per lu; `realMs` wall time (the ghost animates while paused). */
  update(dtMs: number, scale: number, realMs: number = dtMs): void {
    this.t += dtMs;
    this.rt += realMs;
    for (const z of this.zones) z.leftMs -= dtMs;
    this.zones = this.zones.filter((z) => z.leftMs > 0);
    if (this.ghost) {
      this.ghost.ageMs += realMs;
      this.ghost.flipMs += realMs;
      this.ghost.edgeMs += realMs;
    }
    if (this.band) this.band.ageMs += realMs;
    const g = this.g;
    g.clear();
    this.groundRoot.clear();
    const px = 1 / Math.max(0.0001, scale);
    for (const z of this.zones) this.drawZone(g, z, px);
    this.drawBand(px);
    let pipsUsed = 0;
    if (this.ghost) {
      if (!this.ghost.valid || this.ghost.style !== 'strike') this.drawGhost(g, this.ghost, px);
      else this.drawStrike(g, this.ghost, px);
      if (this.ghost.valid) pipsUsed = this.drawPips(g, px);
    }
    if (this.leaving) {
      this.leaving.ms += realMs;
      if (this.leaving.ms >= COMMIT_SHRINK_MS + COMMIT_FADE_MS) this.leaving = null;
      else this.drawLeaving(g, this.leaving.ghost, this.leaving.ms, px);
    }
    for (let i = 0; i < this.pipTexts.length; i++) this.pipTexts[i]!.visible = i < pipsUsed;
    this.drawLabels(px);
  }

  clear(): void {
    this.zones = [];
    this.hidePreview();
    this.leaving = null;
    this.g.clear();
    this.groundRoot.clear();
    for (const t of this.pipTexts) t.visible = false;
    if (this.bandText) this.bandText.visible = false;
    if (this.invalidText) this.invalidText.visible = false;
  }

  private text(size: number): Text {
    const t = new Text({
      text: '',
      resolution: 2,
      style: {
        fontFamily: 'system-ui, "Segoe UI", Roboto, Arial, sans-serif',
        fontSize: size,
        fontWeight: '900',
        fill: 0xffffff,
        stroke: { color: 0x1b1330, width: 4, join: 'round' },
      },
    });
    t.anchor.set(0.5, 0.5);
    this.texts.addChild(t);
    return t;
  }

  /**
   * The reach band (A2.9.10 step 1): the legal area washed in team colour (under the units), a 2 px
   * edge line with a glow, three chevrons marching toward the enemy just inside the edge, and the rest
   * of the lane dimmed 15%. Fades in over 150 ms (`out`).
   */
  private drawBand(px: number): void {
    const b = this.band;
    if (!b) return;
    const k = Math.min(1, b.ageMs / BAND_IN_MS);
    const fade = 1 - Math.pow(1 - k, 3);
    const top = -150;
    const bottom = 46;
    const edge = b.edgeX ?? b.farX;
    const x0 = Math.min(b.gateX, edge);
    const x1 = Math.max(b.gateX, edge);
    const wash = this.groundRoot;
    // The wash: brighter near the ground, fading up.
    const bands = 5;
    for (let i = 0; i < bands; i++) {
      const y0 = bottom - ((bottom - top) * (i + 1)) / bands;
      const h = (bottom - top) / bands;
      wash.rect(x0, y0, x1 - x0, h).fill({ color: b.color, alpha: 0.18 * fade * (1 - i * 0.14) });
    }
    if (b.edgeX === null) return;
    const g = this.g;
    // The rest of the lane dims 15%.
    const d0 = Math.min(b.edgeX, b.farX);
    const d1 = Math.max(b.edgeX, b.farX);
    g.rect(d0, top - 400, d1 - d0, bottom - top + 400).fill({ color: 0x05070c, alpha: 0.15 * fade });
    // The edge line: a glow and a crisp 2 px line with a bright foot.
    const light = tint(b.color, 0.55);
    g.moveTo(b.edgeX, bottom).lineTo(b.edgeX, top).stroke({ color: b.color, width: 9 * px, alpha: 0.28 * fade });
    g.moveTo(b.edgeX, bottom).lineTo(b.edgeX, top).stroke({ color: light, width: 2 * px, alpha: 0.95 * fade });
    g.ellipse(b.edgeX, 0, 14 * px, 5 * px).fill({ color: 0xffffff, alpha: 0.8 * fade });
    // Three chevrons inside the edge, pointing toward the enemy; they march gently unless reduced.
    const march = this.reduceMotion ? 0 : ((this.rt / 900) % 1) * 10;
    for (let i = 0; i < 3; i++) {
      const cx = b.edgeX - b.dir * (22 + i * 16 - march) * px * 1.6;
      const a = (0.9 - i * 0.25) * fade;
      const w = 8 * px * 1.4;
      const h = 12 * px * 1.4;
      const cy = -58;
      g.moveTo(cx - b.dir * w, cy - h)
        .lineTo(cx, cy)
        .lineTo(cx - b.dir * w, cy + h)
        .stroke({ color: light, width: 3.5 * px, alpha: a, cap: 'round', join: 'round' });
    }
  }

  /** Number pips 1..N over the eligible enemies; covered ones gold, the rest pale. Returns texts used. */
  private drawPips(g: Graphics, px: number): number {
    // Enemies in the zone that the cap or the Home line leave alone: a faint dashed outline.
    for (const u of this.notHit) {
      const r = Math.max(16, u.size * 0.55);
      g.ellipse(u.x, u.y, r, r * 0.38).stroke({ color: 0xffffff, width: 1.5 * px, alpha: 0.4 });
    }
    let used = 0;
    for (const p of this.pips) {
      const hy = p.y - Math.max(40, p.size * 1.35) - 32 * px;
      const r = PIP_PX * px;
      g.circle(p.x, hy, r + 2 * px).fill({ color: 0x1b1330, alpha: 0.85 });
      g.circle(p.x, hy, r).fill({ color: p.covered ? GHOST_TARGET : 0xf4efe4, alpha: p.covered ? 1 : 0.82 });
      let t = this.pipTexts[used];
      if (!t) {
        t = this.text(13);
        this.pipTexts.push(t);
      }
      t.text = String(p.n);
      t.style.stroke = { color: p.covered ? 0xffe9a0 : 0xf4efe4, width: 0 };
      t.style.fill = 0x1b1330;
      t.position.set(p.x, hy + 0.5 * px);
      t.scale.set(px);
      t.visible = true;
      used += 1;
    }
    return used;
  }

  /** The band's label plate and an out-of-reach ghost's label, in screen-constant size. */
  private drawLabels(px: number): void {
    const b = this.band;
    const show = b && b.label && b.edgeX !== null ? b : null;
    if (show) {
      if (!this.bandText) this.bandText = this.text(14);
      const t = this.bandText;
      t.text = show.label!;
      t.style.stroke = { color: 0x0b0e14, width: 0 };
      t.style.fill = 0xffffff;
      const fade = Math.min(1, show.ageMs / BAND_IN_MS);
      const w = t.width / Math.max(0.0001, t.scale.x);
      const plateW = (w + 20) * px;
      const plateH = 24 * px;
      const cx = show.edgeX! - show.dir * (plateW / 2 + 8 * px);
      const cy = -150 - plateH / 2 - 4 * px;
      this.g.roundRect(cx - plateW / 2, cy - plateH / 2, plateW, plateH, 12 * px).fill({ color: shade(show.color, 0.45), alpha: 0.92 * fade });
      this.g.roundRect(cx - plateW / 2, cy - plateH / 2, plateW, plateH, 12 * px).stroke({ color: tint(show.color, 0.55), width: 1.5 * px, alpha: fade });
      t.position.set(cx, cy);
      t.scale.set(px);
      t.alpha = fade;
      t.visible = true;
    } else if (this.bandText) this.bandText.visible = false;
    const gh = this.ghost;
    if (gh && gh.outOfReach && gh.invalidLabel) {
      if (!this.invalidText) this.invalidText = this.text(15);
      const t = this.invalidText;
      t.text = gh.invalidLabel;
      t.style.fill = 0xffffff;
      t.style.stroke = { color: 0x0b0e14, width: 0 };
      const w = t.width / Math.max(0.0001, t.scale.x);
      const plateW = (w + 22) * px;
      const plateH = 26 * px;
      const cy = -CURTAIN_LU - 70;
      this.g.roundRect(gh.x - plateW / 2, cy - plateH / 2, plateW, plateH, 13 * px).fill({ color: 0x8e1f1a, alpha: 0.95 });
      this.g.roundRect(gh.x - plateW / 2, cy - plateH / 2, plateW, plateH, 13 * px).stroke({ color: 0xffb3a8, width: 1.5 * px, alpha: 1 });
      t.position.set(gh.x, cy);
      t.scale.set(px);
      t.alpha = 1;
      t.visible = true;
    } else if (this.invalidText) this.invalidText.visible = false;
  }

  /**
   * A strike's ghost (A2.9.10 step 2): a crosshair at the aim with its pick range, and a lock ring on
   * the unit it would lock (brackets closing in, a line to it), or a pale "no target" crosshair.
   */
  private drawStrike(g: Graphics, z: Ghost, px: number): void {
    const t = this.rt;
    const pop = this.reduceMotion ? 1 : Math.min(1, z.ageMs / 160);
    const s = 1 - Math.pow(1 - pop, 3);
    const x = z.x;
    const color = z.color;
    const light = tint(color, 0.5);
    const r = (z.width / 2) * s;
    const locked = this.lock;
    g.ellipse(x, 0, r, 30 * s).fill({ color, alpha: 0.16 });
    g.ellipse(x, 0, r, 30 * s).stroke({ color: light, width: 2 * px, alpha: 0.8 });
    // Crosshair over the ground point.
    const cy = -46;
    const cr = 20 * px * 1.3;
    g.circle(x, cy, cr).stroke({ color: 0xffffff, width: 2.5 * px, alpha: locked ? 0.95 : 0.55 });
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const) {
      g.moveTo(x + dx * cr * 0.45, cy + dy * cr * 0.45)
        .lineTo(x + dx * cr * 1.5, cy + dy * cr * 1.5)
        .stroke({ color: 0xffffff, width: 2.5 * px, alpha: locked ? 0.95 : 0.55 });
    }
    g.moveTo(x, cy + cr * 1.5).lineTo(x, 0).stroke({ color: 0xffffff, width: 1.5 * px, alpha: 0.35 });
    if (!locked) return;
    // The lock ring: four brackets that close in and turn slowly, and a line from the crosshair.
    const lr = Math.max(22, locked.size * 0.75);
    const ly = locked.y - Math.max(18, locked.size * 0.6);
    const spin = this.reduceMotion ? 0 : t / 1400;
    const close = this.reduceMotion ? 1 : 1 + 0.18 * Math.max(0, 1 - Math.min(1, z.ageMs / 220));
    g.moveTo(x, cy).lineTo(locked.x, ly).stroke({ color: GHOST_TARGET, width: 2 * px, alpha: 0.6 });
    g.circle(locked.x, ly, lr * close + 3 * px).stroke({ color: 0x1b1330, width: 5 * px, alpha: 0.45 });
    for (let i = 0; i < 4; i++) {
      const a0 = spin + (i * Math.PI) / 2 - 0.45;
      const a1 = a0 + 0.9;
      const steps = 6;
      g.moveTo(locked.x + Math.cos(a0) * lr * close, ly + Math.sin(a0) * lr * close);
      for (let k = 1; k <= steps; k++) {
        const a = a0 + ((a1 - a0) * k) / steps;
        g.lineTo(locked.x + Math.cos(a) * lr * close, ly + Math.sin(a) * lr * close);
      }
      g.stroke({ color: GHOST_TARGET, width: 3.5 * px, alpha: 1 });
    }
    g.circle(locked.x, ly, 3.5 * px).fill({ color: GHOST_TARGET, alpha: 1 });
  }

  /** MR-70b: the committed ghost contracts to 0.9 (`anticipate`) and fades. */
  private drawLeaving(g: Graphics, z: Ghost, ms: number, px: number): void {
    const k = Math.min(1, ms / COMMIT_SHRINK_MS);
    // `anticipate`: a small swell before the pull-in to 0.9.
    const scale = k < 0.3 ? 1 + 0.02 * (k / 0.3) : 1.02 - 0.12 * ((k - 0.3) / 0.7);
    const fade = ms <= COMMIT_SHRINK_MS ? 1 : 1 - (ms - COMMIT_SHRINK_MS) / COMMIT_FADE_MS;
    const half = (z.width / 2) * scale;
    const light = tint(z.color, 0.6);
    g.ellipse(z.x, 0, half, 36 * scale).fill({ color: z.color, alpha: 0.4 * fade });
    g.ellipse(z.x, 0, half, 36 * scale).stroke({ color: light, width: 4 * px, alpha: 0.95 * fade });
    g.rect(z.x - half, -CURTAIN_LU * scale, half * 2, CURTAIN_LU * scale).fill({ color: light, alpha: 0.18 * fade });
  }

  private drawZone(g: Graphics, z: Zone, px: number): void {
    const half = z.width / 2;
    const depth = 26;
    const pulse = 0.5 + 0.5 * Math.sin(this.t / 90);
    const fade = Math.min(1, z.leftMs / 180) * Math.min(1, (z.totalMs - z.leftMs + 60) / 120);
    const fillA = (0.12 + 0.1 * pulse) * fade;
    const lineA = (0.55 + 0.4 * pulse) * fade;
    const light = tint(z.color, 0.35);
    g.ellipse(z.x, 0, half, depth).fill({ color: z.color, alpha: fillA });
    g.ellipse(z.x, 0, half, depth).stroke({ color: light, width: 3 * px, alpha: lineA });
    g.ellipse(z.x, 0, half * 0.62, depth * 0.62).stroke({ color: light, width: 1.5 * px, alpha: lineA * 0.6 });
    // Centre marker and edge posts.
    g.moveTo(z.x, -8).lineTo(z.x, 8).stroke({ color: 0xffffff, width: 2 * px, alpha: lineA * 0.8 });
    for (const sx of [-1, 1]) {
      g.moveTo(z.x + sx * half, 0).lineTo(z.x + sx * half, -34).stroke({ color: light, width: 3 * px, alpha: lineA * 0.8 });
    }
  }

  /**
   * The drag ghost at world scale: a glowing ground disc with marching dashes, a light curtain rising
   * over the whole area, edge pillars, the power's motif (falling strikes, a sweeping line, drifting
   * puffs) and a bobbing drop arrow. Units it would hit get a gold ring and a chevron. Invalid: red,
   * no motif, a cross instead of the arrow.
   */
  private drawGhost(g: Graphics, z: Ghost, px: number): void {
    const t = this.rt;
    // Pop in (overshoot) when it appears; a quick squash when it turns valid or invalid.
    const pop = this.reduceMotion ? 1 : Math.min(1, z.ageMs / 180);
    const flip = this.reduceMotion ? 1 : Math.min(1, z.flipMs / 160);
    // The magnetic edge: a 1.04 → 1 bump (80 ms, `back`) on first contact.
    const eb = this.reduceMotion ? 1 : Math.min(1, z.edgeMs / EDGE_BUMP_MS);
    const bump = z.edge ? 1 + 0.04 * (1 - eb) * (1 - eb) : 1;
    const s = (1 - Math.pow(1 - pop, 3)) * (1 + 0.08 * Math.sin(pop * Math.PI)) * (1 + 0.06 * Math.sin(flip * Math.PI)) * bump;
    const half = (z.width / 2) * s;
    const depth = 36 * s;
    const color = z.valid ? z.color : GHOST_INVALID;
    const light = tint(color, 0.45);
    const glow = tint(color, 0.7);
    const breathe = 0.5 + 0.5 * Math.sin(t / 220);
    const x = z.x;

    // Light curtain: stacked bands fading upward, brighter at the ground.
    const bands = 7;
    for (let i = 0; i < bands; i++) {
      const y0 = -(CURTAIN_LU * s * i) / bands;
      const h = (CURTAIN_LU * s) / bands;
      const a = (z.valid ? 0.24 : 0.16) * Math.pow(1 - i / bands, 1.4) * (0.85 + 0.15 * breathe);
      g.rect(x - half, y0 - h, half * 2, h).fill({ color, alpha: a });
    }
    // Ground disc: soft outer glow, fill, bright rim, inner ring.
    g.ellipse(x, 0, half + 10 * px, depth + 6 * px).fill({ color: glow, alpha: 0.12 + 0.08 * breathe });
    g.ellipse(x, 0, half, depth).fill({ color, alpha: z.valid ? 0.32 : 0.26 });
    g.ellipse(x, 0, half * 0.66, depth * 0.66).fill({ color: glow, alpha: 0.1 });
    g.ellipse(x, 0, half, depth).stroke({ color: 0x1b1330, width: 6 * px, alpha: 0.35 });
    // Marching dashes around the rim (clockwise when valid, still when invalid).
    const dashes = Math.max(14, Math.round(half / 14));
    const phase = z.valid ? (t / 900) % 1 : 0;
    for (let i = 0; i < dashes; i++) {
      const a0 = ((i + phase) / dashes) * Math.PI * 2;
      const a1 = a0 + (Math.PI * 2) / dashes / 1.9;
      const steps = 4;
      g.moveTo(x + Math.cos(a0) * half, Math.sin(a0) * depth);
      for (let k = 1; k <= steps; k++) {
        const a = a0 + ((a1 - a0) * k) / steps;
        g.lineTo(x + Math.cos(a) * half, Math.sin(a) * depth);
      }
    }
    g.stroke({ color: light, width: 3.5 * px, alpha: 0.95 });
    g.ellipse(x, 0, half * 0.66, depth * 0.66).stroke({ color: light, width: 1.5 * px, alpha: 0.55 });

    // Edge pillars with a bright cap.
    for (const sx of [-1, 1]) {
      const ex = x + sx * half;
      g.moveTo(ex, 0)
        .lineTo(ex, -CURTAIN_LU * s * 0.72)
        .stroke({ color: glow, width: 7 * px, alpha: 0.22 });
      g.moveTo(ex, 0)
        .lineTo(ex, -CURTAIN_LU * s * 0.72)
        .stroke({ color: light, width: 2.5 * px, alpha: 0.9 });
      g.circle(ex, -CURTAIN_LU * s * 0.72, 4 * px).fill({ color: 0xffffff, alpha: 0.9 });
    }

    if (z.valid) this.drawMotif(g, z, half, px, t);
    // A barrage's blasts reach past the zone by their radius: a thin fringe, clipped at the Home line
    // (the reach area is a hard mask, A2.9.4).
    if (z.valid && z.fringe > 0) {
      for (const sx of [-1, 1]) {
        const a = x + sx * half;
        let b = a + sx * z.fringe * s;
        if (z.clipX !== null) b = sx > 0 ? Math.min(b, Math.max(a, z.clipX)) : Math.max(b, Math.min(a, z.clipX));
        if (Math.abs(b - a) < 1) continue;
        g.rect(Math.min(a, b), -8 * px, Math.abs(b - a), 16 * px).fill({ color: light, alpha: 0.28 });
      }
    }
    // Out of reach: red diagonal hatching over the area (never colour alone, A2.9.10 step 4).
    if (z.outOfReach) {
      const h = CURTAIN_LU * s;
      const step = 14 * px * 1.6;
      const x0 = x - half;
      const x1 = x + half;
      for (let k = x0 - h; k < x1; k += step) {
        // The line from (k, 0) to (k + h, -h), clipped to [x0, x1].
        const sx0 = Math.max(x0, k);
        const sx1 = Math.min(x1, k + h);
        if (sx1 <= sx0) continue;
        g.moveTo(sx0, -(sx0 - k)).lineTo(sx1, -(sx1 - k));
      }
      g.stroke({ color: 0xffd0c8, width: 2.5 * px, alpha: 0.55 });
      g.rect(x - half, -h, half * 2, h).stroke({ color: GHOST_INVALID, width: 3 * px, alpha: 1 });
    }

    // Units it would hit: a pulsing gold ring on the ground and a chevron over the head.
    if (z.valid) {
      const pulse = 0.5 + 0.5 * Math.sin(t / 140);
      for (const u of this.targets) {
        const r = Math.max(16, u.size * 0.55) * (1 + 0.08 * pulse);
        g.ellipse(u.x, u.y, r + 4 * px, r * 0.38 + 3 * px).stroke({ color: 0x1b1330, width: 5 * px, alpha: 0.5 });
        g.ellipse(u.x, u.y, r, r * 0.38).stroke({ color: GHOST_TARGET, width: 3 * px, alpha: 0.95 });
        const hy = u.y - Math.max(40, u.size * 1.35) - 10 - 6 * pulse;
        const cw = 9;
        g.poly([u.x - cw, hy - 10, u.x + cw, hy - 10, u.x, hy]).fill({ color: GHOST_TARGET, alpha: 1 });
        g.poly([u.x - cw, hy - 10, u.x + cw, hy - 10, u.x, hy]).stroke({ color: 0x1b1330, width: 2 * px, alpha: 0.9 });
      }
    }

    // Centre: a bobbing drop arrow (valid) or a cross (invalid).
    const top = -CURTAIN_LU * s - 14;
    if (z.valid) {
      const bob = 8 * Math.sin(t / 180);
      const ay = top + bob;
      const arrow = [x - 16, ay - 22, x + 16, ay - 22, x + 16, ay - 4, x + 28, ay - 4, x, ay + 22, x - 28, ay - 4, x - 16, ay - 4];
      g.poly(arrow).fill({ color: 0xffffff, alpha: 0.97 });
      g.poly(arrow).stroke({ color, width: 3 * px, alpha: 1 });
      g.moveTo(x, ay + 26)
        .lineTo(x, -6)
        .stroke({ color: 0xffffff, width: 2 * px, alpha: 0.5 });
    } else {
      const c = 16;
      const cy = top;
      g.circle(x, cy, 26).fill({ color: 0x1b1330, alpha: 0.75 });
      g.circle(x, cy, 26).stroke({ color: light, width: 3 * px, alpha: 1 });
      g.moveTo(x - c * 0.6, cy - c * 0.6)
        .lineTo(x + c * 0.6, cy + c * 0.6)
        .moveTo(x + c * 0.6, cy - c * 0.6)
        .lineTo(x - c * 0.6, cy + c * 0.6)
        .stroke({ color: 0xffffff, width: 5 * px, alpha: 1 });
    }
  }

  /** The power's motif inside the ghost, looping on wall time. */
  private drawMotif(g: Graphics, z: Ghost, half: number, px: number, t: number): void {
    const x = z.x;
    const white = 0xffffff;
    switch (z.style) {
      case 'barrage': {
        // Strikes falling in a staggered loop, each ending in a small impact ring.
        const n = Math.max(4, Math.min(9, Math.round(half / 40)));
        for (let i = 0; i < n; i++) {
          const k = ((t / 700 + i * 0.37) % 1 + 1) % 1;
          const sx = x - half + ((i + 0.5) / n) * half * 2;
          const y = -CURTAIN_LU * 0.95 + k * CURTAIN_LU * 0.95;
          const len = 26;
          g.moveTo(sx + 6, y - len)
            .lineTo(sx, y)
            .stroke({ color: white, width: 3 * px, alpha: 0.55 * (1 - k * 0.4) });
          g.circle(sx, y, 3.5).fill({ color: white, alpha: 0.85 });
          if (k > 0.82) {
            const r = 6 + (k - 0.82) * 90;
            g.ellipse(sx, 0, r, r * 0.35).stroke({ color: white, width: 2 * px, alpha: (1 - k) * 4 });
          }
        }
        return;
      }
      case 'sweep': {
        // A bright line sweeping across the zone in the casting direction, with trailing chevrons.
        const k = (t / 1100) % 1;
        const from = x - z.dir * half;
        const lx = from + z.dir * k * half * 2;
        g.moveTo(lx, 8)
          .lineTo(lx, -CURTAIN_LU * 0.6)
          .stroke({ color: white, width: 4 * px, alpha: 0.8 * Math.sin(k * Math.PI) });
        for (let i = 1; i <= 3; i++) {
          const cx = lx - z.dir * i * 22;
          if ((cx - (x - half)) * (cx - (x + half)) > 0) continue;
          const a = 0.6 - i * 0.15;
          g.moveTo(cx - z.dir * 8, -60)
            .lineTo(cx + z.dir * 4, -46)
            .lineTo(cx - z.dir * 8, -32)
            .stroke({ color: white, width: 3 * px, alpha: a * Math.sin(k * Math.PI) });
        }
        return;
      }
      case 'field': {
        // A ground field: rings pulsing outward from the centre, and a soft ground glow.
        for (let i = 0; i < 3; i++) {
          const k = ((t / 1200 + i / 3) % 1 + 1) % 1;
          const r = half * (0.25 + 0.75 * k);
          g.ellipse(x, 0, r, r * 0.3).stroke({ color: white, width: 3 * px, alpha: 0.6 * (1 - k) });
        }
        return;
      }
      case 'cloud': {
        // Soft puffs drifting and breathing over the zone.
        const n = Math.max(4, Math.round(half / 45));
        for (let i = 0; i < n; i++) {
          const sx = x - half * 0.85 + ((i + 0.5) / n) * half * 1.7 + 10 * Math.sin(t / 900 + i);
          const sy = -48 - 18 * Math.sin(t / 700 + i * 1.7);
          const r = 24 + 6 * Math.sin(t / 500 + i * 2.1);
          g.circle(sx, sy, r).fill({ color: white, alpha: 0.16 });
          g.circle(sx - r * 0.3, sy - r * 0.3, r * 0.45).fill({ color: white, alpha: 0.14 });
        }
        return;
      }
      default:
        return;
    }
  }
}
