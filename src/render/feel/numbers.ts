/**
 * Floating numbers (DESIGN A12 Damage numbers).
 *
 * - Default "Important": powers, base damage chunks and your own turret kills. "All" shows every hit.
 *   "Off" shows none. Gold popups always show.
 * - Numbers near each other are spread 20-40 px apart.
 * - Hits from the same source on the same target within a short window merge into one number (a
 *   40-arrow barrage reads as a few totals, not a wall of digits). Gold popups within 300 ms and 60 lu
 *   of each other merge into one sum, so two bounties never overlap into "+3090".
 *
 * Labels live in the world container (they follow shake and camera) and are counter-scaled so their
 * size is constant in screen px. Text uses one shared bitmap font (one texture, batched draws).
 */
import type { Pt } from '@/contracts';
import type { CosmeticRng } from '@/core';
import { BitmapFontManager, BitmapText, Container } from 'pixi.js';
import { easeOutCubic } from '../interpolate';

export type NumberKind = 'damage' | 'power' | 'base' | 'kill' | 'heal' | 'gold' | 'income';
export type DamageNumberMode = 'off' | 'important' | 'all';

export interface NumberStyle {
  color: number;
  sizePx: number;
  prefix: string;
}

export const NUMBER_STYLES: Record<NumberKind, NumberStyle> = {
  damage: { color: 0xfff4e0, sizePx: 17, prefix: '' },
  power: { color: 0xffd23f, sizePx: 22, prefix: '' },
  base: { color: 0xff6b5e, sizePx: 24, prefix: '' },
  kill: { color: 0xffb347, sizePx: 20, prefix: '' },
  heal: { color: 0x7ef59a, sizePx: 17, prefix: '+' },
  gold: { color: 0xffd447, sizePx: 21, prefix: '+' },
  /** Treasury upgrade: "+1.5/s" gold per second (one decimal, a unit suffix, no words). */
  income: { color: 0xffe27a, sizePx: 24, prefix: '+' },
};

/** One label node; the default is a bitmap text, tests may pass their own factory. */
export interface LabelNode {
  readonly root: Container;
  setText(text: string): void;
  setStyle(color: number, sizePx: number): void;
}

export type LabelFactory = () => LabelNode;

export const NUMBER_FONT = 'ageborn-numbers';
/** Every character a number can show, in the groups `warmNumberFont` draws one at a time. */
const NUMBER_CHAR_GROUPS: readonly string[] = ['0123', '4567', '89+-', '.,kx', '!/s'];
/** The installed font (Pixi's dynamic bitmap font: it draws glyphs into its page on demand) and the groups drawn. */
let numberFont: { ensureCharacters(chars: string): void } | null = null;
let groupsDrawn = 0;

/**
 * Installs the shared number font and draws its glyphs (idempotent). The first install drew every glyph on the frame
 * of the battle's first gold bounty, the first kill's hitch (item 38 Phase A's open hot spot: about 18 ms at 1x for the
 * install alone). The battle view calls this in a quiet frame after the battle is on screen; `groups` limits how many
 * glyph groups this call draws, so the work can be spread over a few frames. Returns true once every glyph is drawn.
 */
export function warmNumberFont(groups = Infinity): boolean {
  let left = groups;
  if (!numberFont) {
    // (BitmapFontManager.install returns the dynamic font, whose `ensureCharacters` draws more glyphs later)
    numberFont = BitmapFontManager.install({
      name: NUMBER_FONT,
      style: {
        fontFamily: 'system-ui, "Segoe UI", Roboto, Arial, sans-serif',
        fontSize: 48,
        fontWeight: '900',
        fill: 0xffffff,
        stroke: { color: 0x1c1026, width: 8, join: 'round' },
      },
      chars: NUMBER_CHAR_GROUPS[0] ?? '0',
      resolution: 2,
      padding: 6,
    }) as unknown as { ensureCharacters(chars: string): void };
    groupsDrawn = 1;
    left--;
  }
  while (left > 0 && groupsDrawn < NUMBER_CHAR_GROUPS.length) {
    numberFont.ensureCharacters(NUMBER_CHAR_GROUPS[groupsDrawn] ?? '');
    groupsDrawn++;
    left--;
  }
  return groupsDrawn >= NUMBER_CHAR_GROUPS.length;
}

/** True once the number font is installed with all its glyphs (tests, the battle view's warm-up). */
export function numberFontWarm(): boolean {
  return numberFont !== null && groupsDrawn >= NUMBER_CHAR_GROUPS.length;
}

/** Default factory: a bitmap text in the shared number font (installed on first use, when nothing warmed it). */
export const bitmapLabelFactory: LabelFactory = () => {
  warmNumberFont();
  const root = new Container();
  const text = new BitmapText({ text: '', style: { fontFamily: NUMBER_FONT, fontSize: 18 } });
  text.anchor.set(0.5, 1);
  root.addChild(text);
  return {
    root,
    setText: (s) => {
      text.text = s;
    },
    setStyle: (color, sizePx) => {
      text.tint = color;
      text.style.fontSize = sizePx;
    },
  };
};

interface Live {
  node: LabelNode;
  kind: NumberKind;
  key: string | null;
  value: number;
  at: Pt;
  offsetPx: number;
  ageMs: number;
  lifeMs: number;
}

export interface NumbersTuning {
  numberSpreadPx: [number, number];
  numberLifeMs: number;
  numberRisePx: number;
  numberMergeMs: number;
  goldLifeMs: number;
}

/** True when a number of `kind` shows in `mode` (`important` marks the hit as Important). */
export function numberVisible(mode: DamageNumberMode, kind: NumberKind, important: boolean): boolean {
  if (kind === 'gold') return true;
  if (mode === 'off') return false;
  if (mode === 'all') return true;
  return important;
}

/** Formats a whole value: 1234 -> "1,234"; 12,500+ -> "12.5k". */
export function formatNumber(v: number): string {
  const n = Math.round(v);
  if (Math.abs(n) >= 12_500) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  return n.toLocaleString('en-US');
}

const MAX_LIVE = 60;
/** Gold popups closer than this (ms since the first, lu apart) merge into one sum. */
export const GOLD_MERGE_MS = 300;
export const GOLD_MERGE_LU = 60;

export class FloatingNumbers {
  mode: DamageNumberMode = 'important';
  private live: Live[] = [];
  private free: LabelNode[] = [];

  constructor(
    private readonly layer: Container,
    private tuning: NumbersTuning,
    private readonly rng: CosmeticRng,
    private readonly factory: LabelFactory = bitmapLabelFactory,
  ) {}

  setTuning(t: NumbersTuning): void {
    this.tuning = t;
  }

  get liveCount(): number {
    return this.live.length;
  }

  /** Values currently shown, oldest first (tests and the dev page). */
  shown(): { kind: NumberKind; value: number }[] {
    return this.live.map((l) => ({ kind: l.kind, value: l.value }));
  }

  /**
   * Shows `value` at world point `at` (lu) if the mode allows it. `key` merges repeated hits
   * (same source and target) into one label. `scale` is the camera's px per lu.
   */
  show(kind: NumberKind, value: number, at: Pt, o: { important?: boolean; key?: string; scale?: number; mergeMs?: number } = {}): boolean {
    if (!(value > 0) || !numberVisible(this.mode, kind, o.important ?? false)) return false;
    const key = o.key ?? null;
    if (kind === 'gold' && key === null) {
      const near = this.live.find((l) => l.kind === 'gold' && l.key === null && l.ageMs < GOLD_MERGE_MS && Math.abs(l.at.x - at.x) <= GOLD_MERGE_LU);
      if (near) {
        near.value += value;
        near.node.setText(this.text('gold', near.value));
        return true;
      }
    }
    if (key !== null) {
      const same = this.live.find((l) => l.key === key && l.ageMs < (o.mergeMs ?? this.tuning.numberMergeMs));
      if (same) {
        same.value += value;
        same.ageMs = Math.min(same.ageMs, 60);
        same.node.setText(this.text(same.kind, same.value));
        return true;
      }
    }
    if (this.live.length >= MAX_LIVE) this.recycle(this.live.shift());
    const scale = o.scale ?? 1;
    const offsetPx = this.spreadOffset(at, scale);
    const node = this.free.pop() ?? this.factory();
    const style = NUMBER_STYLES[kind];
    node.setStyle(style.color, style.sizePx);
    node.setText(this.text(kind, value));
    node.root.alpha = 1;
    this.layer.addChild(node.root);
    this.live.push({
      node,
      kind,
      key,
      value,
      at: { x: at.x, y: at.y },
      offsetPx,
      ageMs: 0,
      lifeMs: kind === 'gold' ? this.tuning.goldLifeMs : kind === 'income' ? this.tuning.numberLifeMs * 1.6 : this.tuning.numberLifeMs,
    });
    return true;
  }

  /** Advances and positions labels; `scale` is the camera's px per lu. */
  update(dtMs: number, scale: number): void {
    const inv = 1 / Math.max(0.0001, scale);
    let expired = false;
    for (const l of this.live) {
      l.ageMs += Math.max(0, dtMs);
      const t = l.ageMs / l.lifeMs;
      if (t >= 1) {
        expired = true;
        continue;
      }
      const risePx = this.tuning.numberRisePx * easeOutCubic(t) + l.offsetPx;
      const pop = l.ageMs < 110 ? 1 + 0.4 * (1 - l.ageMs / 110) : 1;
      l.node.root.position.set(l.at.x, l.at.y - risePx * inv);
      l.node.root.scale.set(inv * pop);
      l.node.root.alpha = t < 0.65 ? 1 : 1 - (t - 0.65) / 0.35;
    }
    if (expired) {
      const keep: Live[] = [];
      for (const l of this.live) {
        if (l.ageMs >= l.lifeMs) this.recycle(l);
        else keep.push(l);
      }
      this.live = keep;
    }
  }

  clear(): void {
    for (const l of this.live) this.recycle(l);
    this.live = [];
  }

  destroy(): void {
    this.clear();
    this.warmNode = null;
    for (const n of this.free) n.root.destroy({ children: true });
    this.free = [];
  }

  /** The label the warm-up drew (one frame, invisibly), until it goes to the free list. */
  private warmNode: LabelNode | null = null;

  /**
   * The first-kill warm-up (item 38 Phase A's open hot spot): makes one label and draws it once, invisibly (alpha 0.004
   * and a speck in size, in the text layer at `at`), so the text's first layout, its GPU set-up and the font page's
   * upload happen on a quiet frame instead of the first gold bounty's. `endWarmLabel()` (a frame later) hands the label to the
   * free list, where the first real number picks it up. Formatting a number once also builds the locale's number
   * formatter (`toLocaleString`: a few ms on its first call). Idempotent while a warm label is up.
   */
  warmLabel(at: Pt): void {
    if (this.warmNode) return;
    formatNumber(12_345);
    const node = this.free.pop() ?? this.factory();
    node.setStyle(NUMBER_STYLES.gold.color, NUMBER_STYLES.gold.sizePx);
    node.setText(`${NUMBER_STYLES.gold.prefix}${formatNumber(1_234)}`);
    node.root.position.set(at.x, at.y);
    node.root.scale.set(0.05);
    node.root.alpha = 0.004;
    this.layer.addChild(node.root);
    this.warmNode = node;
  }

  /** Ends the warm-up draw: the label leaves the layer for the free list (its alpha and scale are set again on use). */
  endWarmLabel(): void {
    const n = this.warmNode;
    if (!n) return;
    this.warmNode = null;
    n.root.parent?.removeChild(n.root);
    n.root.alpha = 1;
    n.root.scale.set(1);
    this.free.push(n);
  }

  private text(kind: NumberKind, value: number): string {
    if (kind === 'income') return `${NUMBER_STYLES[kind].prefix}${(Math.round(value * 10) / 10).toFixed(1).replace(/\.0$/, '')}/s`;
    return `${NUMBER_STYLES[kind].prefix}${formatNumber(value)}`;
  }

  /** Vertical px offset that keeps a new label 20-40 px from labels near the same spot. */
  private spreadOffset(at: Pt, scale: number): number {
    const [lo, hi] = this.tuning.numberSpreadPx;
    let offset = 0;
    for (let tries = 0; tries < 6; tries++) {
      const clash = this.live.some((l) => {
        if (l.ageMs > l.lifeMs * 0.6) return false;
        const dx = (l.at.x - at.x) * scale;
        const dy = (l.at.y - at.y) * scale - (l.offsetPx - offset);
        return Math.abs(dx) < lo && Math.abs(dy) < lo;
      });
      if (!clash) break;
      offset += lo + this.rng.next() * (hi - lo);
    }
    return offset;
  }

  private recycle(l: Live | undefined): void {
    if (!l) return;
    l.node.root.parent?.removeChild(l.node.root);
    this.free.push(l.node);
  }
}
