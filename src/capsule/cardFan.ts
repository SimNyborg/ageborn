/**
 * Cards of the capsule show (DESIGN A10 steps 5 and 7): the face-down fan, the honest rarity
 * pre-signal, flips by rarity (Common snap, Rare cyan shimmer, Epic violet lightning), foil sweeps,
 * the NEW stamp with a silhouette-fill reveal, and the copies bars that fill with ticks.
 */
import { Container, Graphics, Sprite, Texture, type Text } from 'pixi.js';
import type { AgeId, ArtProvider, I18n } from '@/contracts';
import { mulberry32, type CosmeticRng } from '@/core';
import { clamp01, easeInOutCubic, easeOutBack, easeOutCubic, easeOutElastic, hump, lerp, span } from './ease';
import { drawBolt, glowSprite, label, type Particles } from './fx';
import { AGE_COLORS, FOIL_COLORS, RARITY_COLORS, ROOM, shade } from './palette';
import type { RevealCard } from './summaryModel';
import { dotTexture, glowTexture, holoTexture, raysTexture, starTexture, sweepTexture } from './textures';
import type { CapsuleCatalog, CardProgress } from './types';

export const CARD_W = 132;
export const CARD_H = 184;
const R = 14;

export interface CardDeps {
  art: ArtProvider;
  i18n: I18n;
  catalog: CapsuleCatalog;
  particles: Particles;
  rng: CosmeticRng;
  reduceMotion: boolean;
}

/** Loads a portrait data URL as a texture; null for failures and 1-pixel stand-ins (the fake provider). */
export async function portraitTexture(url: string): Promise<Texture | null> {
  if (!url || typeof Image === 'undefined') return null;
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    if (img.naturalWidth < 8 || img.naturalHeight < 8) return null;
    return Texture.from(img);
  } catch {
    return null;
  }
}

function cardShape(g: Graphics, inset = 0): Graphics {
  return g.roundRect(-CARD_W / 2 + inset, -CARD_H / 2 + inset, CARD_W - inset * 2, CARD_H - inset * 2, Math.max(4, R - inset));
}

/** Initials for the fallback portrait. */
function initials(name: string): string {
  const w = name.split(/\s+/).filter(Boolean);
  return ((w[0]?.[0] ?? '?') + (w[1]?.[0] ?? '')).toUpperCase();
}

export class CardView {
  readonly root = new Container();
  /** Lift and scale for focus live here, so layout and flips never fight. */
  readonly body = new Container();
  private readonly glow: Sprite;
  private readonly rays: Sprite;
  private readonly back = new Container();
  private readonly front = new Container();
  private readonly portrait = new Container();
  private readonly colourLayer = new Container();
  private readonly fillMask = new Graphics();
  private readonly foilLayer = new Container();
  private readonly foilSweep: Sprite;
  private readonly foilTint = new Graphics();
  private readonly stamp = new Container();
  private readonly bolts = new Graphics();
  private readonly barRoot = new Container();
  private readonly barFill = new Graphics();
  private readonly barText: Text;
  private readonly readyBadge = new Container();
  private readonly chip: Text;
  private readonly copiesBadge = new Container();
  readonly name: string;
  private flipped = false;
  private barShown = false;
  home = { x: 0, y: 0, rot: 0, scale: 1 };

  constructor(
    readonly card: RevealCard,
    private readonly d: CardDeps,
  ) {
    const color = RARITY_COLORS[card.rarity];
    const info = card.kind === 'skin' && card.skin ? d.catalog.skin(card.skin) : d.catalog.card(card.card);
    this.name = d.i18n.t(info.nameKey);
    const age: AgeId | null = card.kind === 'card' ? d.catalog.card(card.card).age : null;

    this.rays = new Sprite(raysTexture(12));
    this.rays.anchor.set(0.5);
    this.rays.tint = color;
    this.rays.blendMode = 'add';
    this.rays.alpha = 0;
    this.rays.width = this.rays.height = 420;
    this.glow = glowSprite(glowTexture(), color, 300, 0);

    this.buildBack();
    this.buildFront(color, age);
    this.front.visible = false;

    this.foilSweep = new Sprite(card.foil === 'holo' ? holoTexture() : sweepTexture());
    this.foilSweep.anchor.set(0.5);
    this.foilSweep.rotation = -0.5;
    this.foilSweep.width = CARD_W * 0.9;
    this.foilSweep.height = CARD_H * 2.2;
    this.foilSweep.blendMode = 'add';
    this.foilSweep.visible = false;
    if (card.foil !== 'none') this.foilSweep.tint = FOIL_COLORS[card.foil];
    const foilMask = cardShape(new Graphics()).fill(0xffffff);
    this.foilLayer.addChild(this.foilTint, this.foilSweep, foilMask);
    this.foilLayer.mask = foilMask;
    this.front.addChild(this.foilLayer);

    this.bolts.blendMode = 'add';

    // Copies bar (A10 step 7), hidden until the duplicates step.
    const bar = new Graphics().roundRect(-60, 0, 120, 18, 9).fill(0x14121f).stroke({ width: 3, color: ROOM.brassDark });
    this.barText = label('', 13, 0xffffff, { outline: 3 });
    this.barText.position.set(0, 9);
    this.readyBadge.visible = false;
    const pill = new Graphics().roundRect(-62, -13, 124, 26, 13).fill(ROOM.ready).stroke({ width: 3, color: shade(ROOM.ready, -0.55) });
    const ready = label(d.i18n.t('capsule.upgradeReady'), 12, 0xffffff, { outline: 3, outlineColor: shade(ROOM.ready, -0.6) });
    this.readyBadge.addChild(pill, ready);
    this.readyBadge.position.set(0, -18);
    this.barRoot.addChild(bar, this.barFill, this.barText, this.readyBadge);
    this.barRoot.position.set(0, CARD_H / 2 + 14);
    this.barRoot.visible = false;
    this.chip = label('', 22, 0xffffff);
    this.chip.visible = false;

    this.body.addChild(this.rays, this.glow, this.back, this.front, this.bolts);
    this.root.addChild(this.body, this.barRoot, this.chip);
  }

  private buildBack(): void {
    const g = new Graphics();
    cardShape(g).fill({ color: 0x241d36 }).stroke({ width: 4, color: ROOM.brass });
    cardShape(g, 9).stroke({ width: 2, color: ROOM.brassDark });
    // Carved sunburst emblem.
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      g.moveTo(Math.cos(a) * 24, Math.sin(a) * 24).lineTo(Math.cos(a) * 44, Math.sin(a) * 44).stroke({ width: 3, color: ROOM.brassDark, alpha: 0.7 });
    }
    g.circle(0, 0, 26).fill(0x302646).stroke({ width: 4, color: ROOM.brass });
    g.poly([-11, -14, 11, -14, 0, 0, 11, 14, -11, 14, 0, 0]).fill(ROOM.brass);
    for (const [x, y] of [
      [-50, -72],
      [50, -72],
      [-50, 72],
      [50, 72],
    ] as const) {
      g.circle(x, y, 5).fill(ROOM.brass).stroke({ width: 2, color: ROOM.brassDark });
    }
    g.roundRect(-CARD_W / 2 + 12, -CARD_H / 2 + 14, 10, CARD_H - 40, 5).fill({ color: 0xffffff, alpha: 0.06 });
    this.back.addChild(g);
  }

  private buildFront(color: number, age: AgeId | null): void {
    const frame = new Graphics();
    cardShape(frame).fill(shade(color, -0.1)).stroke({ width: 4, color: shade(color, -0.6) });
    cardShape(frame, 5).stroke({ width: 3, color: shade(color, 0.45), alpha: 0.9 });
    const bg = AGE_COLORS[age ?? 'stone'];
    const win = new Graphics().roundRect(-56, -82, 112, 116, 10).fill(age ? shade(bg.sky, 0.15) : 0x3a3350);
    win.roundRect(-56, -2, 112, 36, 0).fill({ color: age ? bg.ground : 0x2a243c, alpha: 0.55 });
    const winMask = new Graphics().roundRect(-56, -82, 112, 116, 10).fill(0xffffff);
    this.portrait.addChild(win, this.colourLayer, winMask);
    this.portrait.mask = winMask;
    const winLine = new Graphics().roundRect(-56, -82, 112, 116, 10).stroke({ width: 3, color: shade(color, -0.6) });
    // Name ribbon.
    const ribbon = new Graphics().roundRect(-62, 40, 124, 34, 8).fill(ROOM.ink).stroke({ width: 2.5, color: shade(color, 0.3) });
    const nameText = label(this.name, 15, 0xffffff, { outline: 3, wordWrap: true, wordWrapWidth: 200 });
    nameText.position.set(0, 57);
    if (nameText.width > 112) nameText.scale.set(112 / nameText.width);
    // Rarity gem.
    const gem = new Graphics().poly([0, 74, 9, 84, 0, 94, -9, 84]).fill(color).stroke({ width: 2.5, color: shade(color, -0.6) });
    gem.poly([0, 78, 3, 83, 0, 85, -3, 83]).fill({ color: 0xffffff, alpha: 0.8 });
    // Copies badge.
    const copies = this.card.kind === 'card' ? this.card.copies : 0;
    if (copies > 0) {
      const b = new Graphics().circle(0, 0, 18).fill(ROOM.ink).stroke({ width: 3, color: shade(color, 0.3) });
      const t = label(this.d.i18n.t('capsule.copiesTimes', { n: copies }), copies > 99 ? 11 : 14, 0xffffff, { outline: 3 });
      this.copiesBadge.addChild(b, t);
      this.copiesBadge.position.set(48, -74);
    }
    // NEW (or SKIN) stamp.
    const stampText = this.card.kind === 'skin' ? this.d.i18n.t('capsule.skinStamp') : this.d.i18n.t('capsule.new');
    const stampColor = this.card.kind === 'skin' ? RARITY_COLORS[this.card.rarity] : ROOM.newStamp;
    const st = new Graphics().roundRect(-38, -16, 76, 32, 7).fill(stampColor).stroke({ width: 3.5, color: 0xffffff });
    const stl = label(stampText, 18, 0xffffff, { outline: 4, outlineColor: shade(stampColor, -0.6) });
    this.stamp.addChild(st, stl);
    this.stamp.position.set(-30, -66);
    this.stamp.rotation = -0.22;
    this.stamp.visible = false;
    this.front.addChild(frame, this.portrait, winLine, ribbon, nameText, gem, this.copiesBadge, this.stamp);
    this.drawFallbackPortrait(age);
  }

  private drawFallbackPortrait(age: AgeId | null): void {
    const c = age ? AGE_COLORS[age] : { sky: 0x4a4466, accent: 0x9a8fc0, light: 0xe0d8ff, ground: 0x2a243c };
    const g = new Graphics();
    g.circle(0, -18, 36).fill(shade(c.accent, -0.1)).stroke({ width: 4, color: shade(c.accent, -0.55) });
    g.ellipse(0, 36, 44, 24).fill(shade(c.accent, -0.25));
    g.circle(-12, -30, 9).fill({ color: 0xffffff, alpha: 0.25 });
    const t = label(initials(this.name), 26, c.light, { outline: 4 });
    t.position.set(0, -18);
    this.setPortraitContent([g, t]);
  }

  /** Swaps in the real portrait (async from the art provider). */
  setPortraitTexture(tex: Texture): void {
    const coloured = new Sprite(tex);
    coloured.anchor.set(0.5);
    const scale = Math.max(112 / tex.width, 116 / tex.height);
    coloured.scale.set(scale);
    coloured.position.set(0, -24);
    this.setPortraitContent([coloured]);
  }

  /** Sets the portrait: a black silhouette underneath, the coloured copy on top behind `fillMask`. */
  private setPortraitContent(nodes: Container[]): void {
    this.fillMask.removeFromParent();
    this.colourLayer.removeChildren().forEach((c) => c.destroy({ children: true }));
    const silhouette = new Container();
    const colour = new Container();
    for (const n of nodes) {
      const copy = n instanceof Sprite ? new Sprite(n.texture) : null;
      if (copy && n instanceof Sprite) {
        copy.anchor.copyFrom(n.anchor);
        copy.scale.copyFrom(n.scale);
        copy.position.copyFrom(n.position);
        copy.tint = 0x0d0b16;
        silhouette.addChild(copy);
      }
      colour.addChild(n);
    }
    if (silhouette.children.length === 0) {
      const g = new Graphics().circle(0, -18, 36).fill(0x0d0b16).ellipse(0, 36, 44, 24).fill(0x0d0b16);
      silhouette.addChild(g);
    }
    colour.addChild(this.fillMask);
    colour.mask = this.fillMask;
    this.colourLayer.addChild(silhouette, colour);
    this.setFill(this.card.isNew ? (this.flipped ? this.fillAmount : 0) : 1);
  }

  private fillAmount = 0;
  /** Silhouette fill 0..1, bottom to top (NEW cards). */
  setFill(u: number): void {
    this.fillAmount = clamp01(u);
    const h = 116 * this.fillAmount;
    this.fillMask.clear().rect(-60, 34 - h, 120, h + 2).fill(0xffffff);
  }

  /** 0..1 pre-signal glow in the rarity colour (A10 step 5: honest). */
  setSignal(u: number, t: number): void {
    const legendary = this.card.rarity === 'legendary';
    this.glow.alpha = u * (legendary ? 1 : 0.85);
    this.glow.width = this.glow.height = 250 + 40 * Math.sin(t / 70) * u;
    this.rays.alpha = legendary ? u * 0.9 : this.card.rarity === 'epic' ? u * 0.45 : 0;
    this.rays.rotation += 0.01;
  }

  /**
   * Flip progress 0..1: the back turns away, the front turns in. Squash: the card thins and lifts.
   * Before 0.5 the back shows, from 0.5 the front.
   */
  setFlip(u: number): void {
    const k = clamp01(u);
    const showFront = k >= 0.5;
    this.back.visible = !showFront;
    this.front.visible = showFront;
    this.flipped = showFront;
    const sx = Math.abs(Math.cos(Math.PI * easeInOutCubic(k)));
    this.back.scale.x = this.front.scale.x = Math.max(0.02, sx);
    this.body.skew.y = (showFront ? -1 : 1) * 0.12 * (1 - sx);
  }

  get isFlipped(): boolean {
    return this.flipped;
  }

  /** Lift 0..1 while the card is in focus. */
  setLift(u: number): void {
    const k = clamp01(u);
    this.body.y = -26 * k;
    this.body.scale.set(1 + 0.16 * k);
    this.root.zIndex = k > 0 ? 100 : this.card.slot;
  }

  /** Foil sweep across the card, 0..1; afterwards a lasting soft sheen. */
  setFoil(u: number): void {
    if (this.card.foil === 'none') return;
    const k = clamp01(u);
    this.foilSweep.visible = k > 0 && k < 1;
    this.foilSweep.x = lerp(-CARD_W, CARD_W, easeInOutCubic(k));
    this.foilSweep.alpha = hump(k);
    this.foilTint.clear();
    const c = FOIL_COLORS[this.card.foil];
    cardShape(this.foilTint, 4).stroke({ width: 3, color: c, alpha: 0.35 + 0.5 * k });
    if (this.card.foil === 'holo' && k > 0) {
      this.foilTint.rect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H).fill({ color: 0xb57bff, alpha: 0.06 * k });
    }
  }

  /** NEW stamp slam and silhouette fill, 0..1. */
  setStamp(u: number): void {
    const k = clamp01(u);
    if (this.card.isNew) this.setFill(span(k, 0, 0.55));
    const s = span(k, 0.35, 0.8);
    this.stamp.visible = s > 0;
    this.stamp.scale.set(lerp(2.4, 1, easeOutBack(s, 2.2)));
    this.stamp.alpha = Math.min(1, s * 3);
  }

  /** Crackling bolts around the card (Epic flips, mini-walkouts). */
  drawBolts(on: boolean, color: number): void {
    const g = this.bolts;
    g.clear();
    if (!on) return;
    const r = this.d.rng;
    for (let i = 0; i < 3; i++) {
      const a = r.next() * Math.PI * 2;
      const x0 = Math.cos(a) * 110;
      const y0 = Math.sin(a) * 140;
      drawBolt(g, r, x0, y0, (r.next() - 0.5) * 60, (r.next() - 0.5) * 80, color, 3.5, 16);
    }
  }

  /** Copies bar: `u` 0..1 through the duplicates step. */
  setBar(u: number, p: CardProgress | null, t: (k: string, o?: Record<string, string | number>) => string): void {
    this.barShown = true;
    this.barRoot.visible = true;
    const k = clamp01(u);
    const fly = span(k, 0, 0.3);
    const fill = span(k, 0.24, 0.8);
    // "+N" (or "+N Dust") flies from the card into its bar.
    const dust = this.card.dust > 0;
    this.chip.visible = fly > 0 && fly < 1;
    this.chip.text = dust ? t('capsule.dustPlus', { n: this.card.dust }) : t('capsule.copiesPlus', { n: this.card.copies });
    this.chip.position.set(0, lerp(-10, CARD_H / 2 + 24, easeInOutCubic(fly)));
    this.chip.scale.set(lerp(1.4, 0.7, fly));
    this.barRoot.scale.set(1 + 0.12 * hump(fill));
    const g = this.barFill;
    g.clear();
    if (!p || p.need === null) {
      g.roundRect(-58, 2, 116, 14, 7).fill({ color: dust ? 0x9b7bff : ROOM.amber, alpha: fill > 0 ? 1 : 0 });
      this.barText.text = p && p.need === null ? `${t('capsule.max')}  ${dust ? t('capsule.dustPlus', { n: this.card.dust }) : ''}` : t('capsule.copiesPlus', { n: this.card.copies });
      return;
    }
    const now = Math.round(lerp(p.before, p.after, easeOutCubic(fill)));
    const ratio = clamp01(now / Math.max(1, p.need));
    const ready = p.after >= p.need;
    const colour = ready && fill >= 1 ? ROOM.ready : ROOM.amber;
    if (ratio > 0) g.roundRect(-58, 2, Math.max(10, 116 * ratio), 14, 7).fill(colour);
    // Ticks along the bar, one per copy needed (up to 12).
    const ticks = Math.min(12, p.need);
    for (let i = 1; i < ticks; i++) g.rect(-58 + (116 * i) / ticks - 1, 3, 2, 12).fill({ color: 0x000000, alpha: 0.35 });
    this.barText.text = t('capsule.copiesOf', { have: now, need: p.need });
    const b = span(k, 0.78, 1);
    this.readyBadge.visible = ready && b > 0;
    this.readyBadge.scale.set(easeOutElastic(b));
  }

  get hasBar(): boolean {
    return this.barShown;
  }

  /** Jumps to the face-up end state. */
  settleFaceUp(): void {
    this.setFlip(1);
    this.setFill(1);
    this.setFoil(1);
    this.stamp.visible = this.card.isNew || this.card.kind === 'skin';
    this.stamp.scale.set(1);
    this.stamp.alpha = 1;
    this.glow.alpha = 0;
    this.rays.alpha = 0;
    this.drawBolts(false, 0);
    this.setLift(0);
  }

  destroy(): void {
    this.root.destroy({ children: true });
  }
}

/** Where each slot sits: one arc up to 7 cards, then extra rows, scaled to fit (design px). */
export function fanLayout(n: number, cx = 640, cy = 318): { x: number; y: number; rot: number; scale: number }[] {
  const out: { x: number; y: number; rot: number; scale: number }[] = [];
  if (n <= 0) return out;
  const perRow = n <= 7 ? n : Math.ceil(n / Math.ceil(n / 7));
  const rows = Math.ceil(n / perRow);
  const scale = rows === 1 ? (n <= 5 ? 1 : 0.92) : rows === 2 ? 0.74 : 0.58;
  const gapX = (CARD_W + 22) * scale;
  const gapY = (CARD_H + 46) * scale;
  for (let i = 0; i < n; i++) {
    const row = Math.floor(i / perRow);
    const inRow = Math.min(perRow, n - row * perRow);
    const col = i - row * perRow;
    const mid = (inRow - 1) / 2;
    const off = col - mid;
    const y0 = cy - ((rows - 1) * gapY) / 2 + row * gapY;
    out.push({ x: cx + off * gapX, y: y0 + off * off * 4 * scale, rot: off * 0.035, scale });
  }
  return out;
}

export class CardFan {
  readonly root = new Container();
  readonly views: CardView[];
  private readonly rng: CosmeticRng;

  constructor(
    cards: RevealCard[],
    private readonly d: CardDeps,
    private readonly origin = { x: 640, y: 380 },
  ) {
    this.root.sortableChildren = true;
    this.rng = mulberry32(cards.length * 7919 + 17);
    const layout = fanLayout(cards.length);
    this.views = cards.map((c, i) => {
      const v = new CardView(c, d);
      const L = layout[i] ?? { x: 640, y: 330, rot: 0, scale: 1 };
      v.home = L;
      v.root.zIndex = i;
      v.root.visible = false;
      this.root.addChild(v.root);
      void this.loadPortrait(v);
      return v;
    });
  }

  private async loadPortrait(v: CardView): Promise<void> {
    try {
      const url = await this.d.art.portrait({ card: v.card.card, ...(v.card.skin ? { skin: v.card.skin } : {}), foil: v.card.foil, size: 256 });
      const tex = await portraitTexture(url);
      if (tex && !v.root.destroyed) v.setPortraitTexture(tex);
    } catch {
      // Keep the drawn fallback portrait.
    }
  }

  view(slot: number): CardView | undefined {
    return this.views[slot];
  }

  /** Deal face down from the burst point, staggered, 0..1 over the fan step. */
  deal(u: number): void {
    const n = this.views.length;
    this.views.forEach((v, i) => {
      const start = n > 1 ? (i / n) * 0.55 : 0;
      const k = span(u, start, start + 0.45);
      v.root.visible = k > 0;
      const e = easeOutBack(k, 1.3);
      v.root.position.set(lerp(this.origin.x, v.home.x, e), lerp(this.origin.y, v.home.y, e) - 60 * hump(k));
      v.root.rotation = lerp(-0.6 + i * 0.2, v.home.rot, e);
      v.root.scale.set(lerp(0.25, v.home.scale, easeOutCubic(k)));
    });
  }

  /** All cards at home, face down. */
  settleDealt(): void {
    this.deal(1);
  }

  /** Sparkle bursts when a card's flip completes. */
  flipBurst(v: CardView, strong: boolean): void {
    const color = RARITY_COLORS[v.card.rarity];
    const p = this.d.particles;
    const n = this.d.reduceMotion ? 8 : strong ? 26 : 12;
    for (let i = 0; i < n; i++) {
      const a = this.rng.next() * Math.PI * 2;
      const sp = 140 + this.rng.next() * (strong ? 360 : 200);
      p.spawn({
        tex: this.rng.next() < 0.3 ? starTexture() : dotTexture(),
        x: v.root.x + Math.cos(a) * 40,
        y: v.root.y + Math.sin(a) * 60,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 60,
        life: 500 + this.rng.next() * 400,
        drag: 0.08,
        gravity: 200,
        scale: [0.6 + this.rng.next() * 0.6, 0],
        alpha: [1, 0],
        tint: this.rng.next() < 0.3 ? 0xffffff : color,
        add: true,
      });
    }
  }

  /** Rare shimmer: cyan motes rising around the card. */
  shimmer(v: CardView, amount: number): void {
    if (this.rng.next() > amount) return;
    this.d.particles.spawn({
      tex: dotTexture(),
      x: v.root.x + (this.rng.next() - 0.5) * CARD_W,
      y: v.root.y + CARD_H / 2 - this.rng.next() * 40,
      vx: (this.rng.next() - 0.5) * 30,
      vy: -120 - this.rng.next() * 120,
      life: 700,
      scale: [0.5, 0.1],
      alpha: [0.9, 0],
      tint: RARITY_COLORS.rare,
      add: true,
    });
  }

  /** Dims everything except `keep` (summary, walkouts). */
  dim(alpha: number, keep?: CardView): void {
    for (const v of this.views) v.root.alpha = v === keep ? 1 : alpha;
  }

  destroy(): void {
    this.root.destroy({ children: true });
  }
}
