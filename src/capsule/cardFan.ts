/**
 * Cards of the capsule show (DESIGN A10 steps 5 and 7): the face-down fan, the honest rarity
 * pre-signal, flips by rarity (Common snap, Rare cyan shimmer, Epic violet lightning), foil sweeps,
 * the NEW stamp with a silhouette-fill reveal, and the copies bars that fill with ticks.
 */
import { Container, Graphics, Sprite, Texture, type Text } from 'pixi.js';
import type { AgeId, ArtProvider, I18n } from '@/contracts';
import { mulberry32, type CosmeticRng } from '@/core';
import { clamp01, easeInOutCubic, easeOutBack, easeOutCubic, easeOutElastic, hump, lerp, span } from './ease';
import { classBadge } from './classBadge';
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

const portraitCache = new Map<string, Promise<Texture | null>>();

/**
 * Loads a portrait data URL as a texture; null for failures and 1-pixel stand-ins (the fake
 * provider). Textures are cached by URL (the art provider caches URLs by card, skin and size), so
 * repeated openings reuse them instead of piling up GPU textures.
 */
export function portraitTexture(url: string): Promise<Texture | null> {
  if (!url || typeof Image === 'undefined') return Promise.resolve(null);
  const hit = portraitCache.get(url);
  if (hit) return hit;
  const p = (async () => {
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      if (img.naturalWidth < 8 || img.naturalHeight < 8) return null;
      return Texture.from(img);
    } catch {
      return null;
    }
  })();
  portraitCache.set(url, p);
  return p;
}

/**
 * The portrait without its age plate (transparent background). WP4's provider supports the optional
 * `plate` flag (docs/requests/wp4-portrait-plate-contract.md); a provider without it returns the
 * plated portrait, which only makes the NEW silhouette a plain dark window.
 */
function barePortrait(art: ArtProvider, req: Parameters<ArtProvider['portrait']>[0]): Promise<string> {
  const portrait = art.portrait.bind(art) as (o: Parameters<ArtProvider['portrait']>[0] & { plate?: boolean }) => Promise<string>;
  return portrait({ ...req, plate: false });
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
  private readonly fillEdge = new Graphics();
  private readonly foilLayer = new Container();
  private readonly foilSweep: Sprite;
  private readonly foilTint = new Graphics();
  private readonly stamp = new Container();
  private readonly bolts = new Graphics();
  /** Light leaking from the face-down card's edges and cracks (the rarity burst's anticipation). */
  private readonly leakG = new Graphics();
  private leakK = 0;
  /** Cracks of light across the back: polylines from the medallion out to the edge (Rare 3 … Legendary 7). */
  private readonly cracks: [number, number][][] = [];
  /** The burst's squash and stretch (anticipation compress, blast, slam, bounce), set by the stage. */
  private burstSx = 1;
  private burstSy = 1;
  private readonly barRoot = new Container();
  private readonly barFill = new Graphics();
  private readonly barText: Text;
  private readonly readyBadge = new Container();
  private readonly chip: Text;
  private readonly copiesBadge = new Container();
  private copiesText: Text | null = null;
  private shownCount = -1;
  /** White flash over the card as its face lands. */
  private readonly flashG = new Graphics();
  private flashA = 0;
  /** Scale pop (the snap as the face lands, the landing of the deal), decaying spring. */
  private popT = 1e6;
  private popA = 0;
  private countBumpT = 1e6;
  private liftK = 0;
  /** Wobble while the pre-signal builds (0..1, set by the stage). */
  wobble = 0;
  private time = 0;
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
    this.fillEdge.blendMode = 'add';

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

    cardShape(this.flashG).fill(0xffffff);
    this.flashG.alpha = 0;
    this.leakG.blendMode = 'add';
    this.buildCracks();
    this.body.addChild(this.rays, this.glow, this.back, this.leakG, this.front, this.flashG, this.bolts);
    this.root.addChild(this.body, this.barRoot, this.chip);
  }

  /**
   * The card back (AUDIT §2.6): a deep plum field with a fine diamond lattice, a double brass frame with
   * filigree corner scrolls, and an embossed hourglass-and-swords emblem on a sunburst; a bevel light on
   * the top edge and a shadow band on the lower edge, as every card front has.
   */
  private buildBack(): void {
    const g = new Graphics();
    const hw = CARD_W / 2;
    const hh = CARD_H / 2;
    cardShape(g).fill({ color: 0x241d36 });
    // Fine diamond lattice.
    const L = -hw + 8;
    const R = hw - 8;
    const T = -hh + 8;
    const B = hh - 8;
    for (let k = -8; k <= 8; k++) {
      const x0 = k * 22;
      // x = x0 - hh + t, y = -hh + t, clipped to the inner frame
      const a0 = Math.max(0, L - x0 + hh, T + hh);
      const a1 = Math.min(2 * hh, R - x0 + hh, B + hh);
      if (a1 > a0) g.moveTo(x0 - hh + a0, -hh + a0).lineTo(x0 - hh + a1, -hh + a1).stroke({ width: 1.2, color: 0x3a2f55, alpha: 0.8 });
      // x = x0 + hh - t, y = -hh + t
      const b0 = Math.max(0, x0 + hh - R, T + hh);
      const b1 = Math.min(2 * hh, x0 + hh - L, B + hh);
      if (b1 > b0) g.moveTo(x0 + hh - b0, -hh + b0).lineTo(x0 + hh - b1, -hh + b1).stroke({ width: 1.2, color: 0x3a2f55, alpha: 0.8 });
    }
    // The cel shadow band on the lower edge and the bevel light on the top edge.
    g.rect(-hw + 4, hh - 34, CARD_W - 8, 30).fill({ color: 0x000000, alpha: 0.22 });
    g.roundRect(-hw + 10, -hh + 6, CARD_W - 20, 5, 2.5).fill({ color: 0xffffff, alpha: 0.14 });
    cardShape(g).stroke({ width: 4, color: ROOM.brass });
    cardShape(g, 9).stroke({ width: 2, color: ROOM.brassDark });
    // Filigree scrolls in each corner.
    for (const [sx, sy] of [
      [-1, -1],
      [1, -1],
      [-1, 1],
      [1, 1],
    ] as const) {
      const cx = sx * (hw - 18);
      const cy = sy * (hh - 18);
      g.moveTo(cx, cy - sy * 0)
        .bezierCurveTo(cx - sx * 4, cy - sy * 26, cx - sx * 22, cy - sy * 30, cx - sx * 30, cy - sy * 18)
        .stroke({ width: 2.6, color: ROOM.brass, alpha: 0.9 });
      g.moveTo(cx, cy)
        .bezierCurveTo(cx - sx * 26, cy - sy * 4, cx - sx * 30, cy - sy * 22, cx - sx * 18, cy - sy * 30)
        .stroke({ width: 2.6, color: ROOM.brass, alpha: 0.9 });
      g.circle(cx, cy, 5).fill(ROOM.brass).stroke({ width: 2, color: ROOM.brassDark });
      g.circle(cx - sx * 1.4, cy - sy * 1.6, 1.6).fill({ color: ROOM.brassLight, alpha: 0.9 });
    }
    // Sunburst.
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const r1 = i % 2 ? 40 : 46;
      g.moveTo(Math.cos(a) * 28, Math.sin(a) * 28).lineTo(Math.cos(a) * r1, Math.sin(a) * r1).stroke({ width: 3, color: ROOM.brassDark, alpha: 0.75 });
    }
    // Embossed medallion: crossed swords behind an hourglass.
    g.circle(0, 0, 28).fill(0x302646).stroke({ width: 4, color: ROOM.brass });
    g.circle(0, 2, 24).stroke({ width: 2, color: ROOM.brassDark, alpha: 0.8 });
    for (const sx of [-1, 1]) {
      g.moveTo(sx * -17, -17).lineTo(sx * 17, 17).stroke({ width: 4, color: 0xc7d0da });
      g.moveTo(sx * -17, -17).lineTo(sx * 17, 17).stroke({ width: 1.4, color: 0xe9ecf0 });
      g.moveTo(sx * 11, 19).lineTo(sx * 19, 11).stroke({ width: 3.4, color: ROOM.brass });
    }
    g.poly([-11, -15, 11, -15, 2, -1, 2, 1, 11, 15, -11, 15, -2, 1, -2, -1]).fill(ROOM.brass).stroke({ width: 2, color: ROOM.brassDark });
    g.poly([-6, 11, 6, 11, 0, 4]).fill({ color: ROOM.brassLight, alpha: 0.9 });
    g.roundRect(-13, -18, 26, 4, 2).fill(ROOM.brassDark);
    g.roundRect(-13, 14, 26, 4, 2).fill(ROOM.brassDark);
    g.circle(-8, -9, 2).fill({ color: 0xffffff, alpha: 0.5 });
    this.back.addChild(g);
  }

  /** Seeded from the card key, so a replay draws the same cracks (cosmetic only). */
  private buildCracks(): void {
    const n = this.card.rarity === 'legendary' ? 7 : this.card.rarity === 'epic' ? 5 : this.card.rarity === 'rare' ? 3 : 0;
    let h = 17;
    for (const ch of this.card.key) h = (h * 31 + ch.charCodeAt(0)) | 0;
    const r = mulberry32(h >>> 0);
    const hw = CARD_W / 2 - 6;
    const hh = CARD_H / 2 - 6;
    for (let i = 0; i < n; i++) {
      const a = ((i + 0.3 + r.next() * 0.4) / n) * Math.PI * 2;
      const dx = Math.cos(a);
      const dy = Math.sin(a);
      // Out to the frame: the nearer of the side and the top/bottom edge.
      const reach = Math.min(Math.abs(dx) > 1e-3 ? hw / Math.abs(dx) : 1e9, Math.abs(dy) > 1e-3 ? hh / Math.abs(dy) : 1e9);
      const pts: [number, number][] = [];
      const steps = 5;
      for (let k = 0; k <= steps; k++) {
        const d = 30 + (reach - 30) * (k / steps);
        const jag = k === 0 || k === steps ? 0 : (r.next() - 0.5) * 16;
        pts.push([dx * d - dy * jag, dy * d + dx * jag]);
      }
      this.cracks.push(pts);
    }
  }

  /** Light leaking from the back's edges and cracks, 0..1 (rarity colour, honest: the pre-signal shows it). */
  setLeak(u: number): void {
    this.leakK = clamp01(u);
    if (this.leakK <= 0.001) this.leakG.clear();
  }

  private drawLeak(): void {
    const g = this.leakG;
    g.clear();
    const k = this.leakK;
    if (k <= 0.001 || !this.back.visible) return;
    const c = RARITY_COLORS[this.card.rarity];
    const flick = this.d.reduceMotion ? 1 : 0.82 + 0.18 * Math.sin(this.time / 37) * Math.sin(this.time / 23 + 1.1);
    // The rim: light spilling round the frame.
    cardShape(g, -2).stroke({ width: 4 + 12 * k, color: c, alpha: 0.45 * k * flick });
    cardShape(g, 1).stroke({ width: 1.5 + 2.5 * k, color: 0xffffff, alpha: 0.75 * k * flick });
    // Cracks grow out from the medallion as the build rises.
    const len = clamp01(k * 1.25);
    this.cracks.forEach((pts, i) => {
      const segs = (pts.length - 1) * clamp01(len - i * 0.04);
      if (segs <= 0) return;
      const draw = (w: number, col: number, a: number) => {
        const p0 = pts[0];
        if (!p0) return;
        g.moveTo(p0[0], p0[1]);
        for (let j = 1; j <= Math.ceil(segs); j++) {
          const p = pts[j];
          const q = pts[j - 1];
          if (!p || !q) break;
          const f = Math.min(1, segs - (j - 1));
          g.lineTo(q[0] + (p[0] - q[0]) * f, q[1] + (p[1] - q[1]) * f);
        }
        g.stroke({ width: w, color: col, alpha: a, join: 'round', cap: 'round' });
      };
      const pulse = this.d.reduceMotion ? 1 : 0.85 + 0.15 * Math.sin(this.time / 45 + i * 1.7);
      draw(3 + 7 * k, c, 0.55 * k * pulse);
      draw(1 + 1.8 * k, 0xffffff, 0.95 * k * pulse);
    });
    // The medallion glows from inside.
    g.circle(0, 0, 26 + 8 * k).fill({ color: c, alpha: 0.35 * k * flick });
    g.circle(0, 0, 12 + 6 * k).fill({ color: 0xffffff, alpha: 0.5 * k * flick });
  }

  /** The burst's squash and stretch on top of the lift and the pop spring (1, 1 = none). */
  setBurstShape(sx: number, sy: number): void {
    this.burstSx = sx;
    this.burstSy = sy;
    this.applyScale();
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
      this.copiesText = t;
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
    // Class badge on the portrait's bottom-left corner (owner feedback 2026-09-28).
    const info = this.card.kind === 'card' ? this.d.catalog.card(this.card.card) : null;
    if (info?.cls) {
      const badge = classBadge(info.cls, 15);
      badge.position.set(-50, 30);
      this.front.addChild(badge);
      if (info.legendary) {
        const crown = classBadge('legendary', 11);
        crown.position.set(-30, 34);
        this.front.addChild(crown);
      }
    }
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

  /**
   * Swaps in the real portrait (async from the art provider). `bare` is the same portrait without
   * its age plate: its silhouette is the unit's shape against the card's own sky, so the NEW
   * silhouette reads as "who is it?" rather than a black box.
   */
  setPortraitTexture(tex: Texture, bare?: Texture | null): void {
    const coloured = new Sprite(tex);
    coloured.anchor.set(0.5);
    const scale = Math.max(112 / tex.width, 116 / tex.height);
    coloured.scale.set(scale);
    coloured.position.set(0, -24);
    let shape: Sprite | undefined;
    if (bare) {
      shape = new Sprite(bare);
      shape.anchor.set(0.5);
      shape.scale.set(Math.max(112 / bare.width, 116 / bare.height));
      shape.position.set(0, -24);
    }
    this.setPortraitContent([coloured], shape);
  }

  /** Sets the portrait: a black silhouette underneath, the coloured copy on top behind `fillMask`. */
  private setPortraitContent(nodes: Container[], shape?: Sprite): void {
    this.fillMask.removeFromParent();
    this.fillEdge.removeFromParent();
    this.colourLayer.removeChildren().forEach((c) => c.destroy({ children: true }));
    const silhouette = new Container();
    const colour = new Container();
    if (shape) {
      shape.tint = 0x0d0b16;
      silhouette.addChild(shape);
    }
    for (const n of nodes) {
      const copy = n instanceof Sprite && !shape ? new Sprite(n.texture) : null;
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
    this.colourLayer.addChild(silhouette, colour, this.fillEdge);
    this.setFill(this.card.isNew ? (this.flipped ? this.fillAmount : 0) : 1);
  }

  private fillAmount = 0;
  /** Silhouette fill 0..1, bottom to top (NEW cards), with a bright line riding the fill front. */
  setFill(u: number): void {
    this.fillAmount = clamp01(u);
    const h = 116 * this.fillAmount;
    this.fillMask.clear().rect(-60, 34 - h, 120, h + 2).fill(0xffffff);
    const e = this.fillEdge;
    e.clear();
    if (this.fillAmount > 0 && this.fillAmount < 1) {
      const y = 34 - h;
      const c = RARITY_COLORS[this.card.rarity];
      e.rect(-60, y - 9, 120, 18).fill({ color: shade(c, 0.4), alpha: 0.35 });
      e.rect(-60, y - 3.5, 120, 7).fill({ color: shade(c, 0.6), alpha: 0.85 });
      e.rect(-60, y - 1.2, 120, 2.4).fill({ color: 0xffffff, alpha: 1 });
    }
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
    this.leakG.visible = !showFront;
    this.front.visible = showFront;
    this.flipped = showFront;
    const sx = Math.abs(Math.cos(Math.PI * easeInOutCubic(k)));
    this.back.scale.x = this.front.scale.x = this.leakG.scale.x = Math.max(0.02, sx);
    this.body.skew.y = (showFront ? -1 : 1) * 0.12 * (1 - sx);
  }

  get isFlipped(): boolean {
    return this.flipped;
  }

  /** Lift 0..1 while the card is in focus. */
  setLift(u: number): void {
    const k = clamp01(u);
    this.liftK = k;
    this.body.y = -26 * k;
    this.applyScale();
    this.root.zIndex = k > 0 ? 100 : this.card.slot;
  }

  private applyScale(): void {
    const sq = this.popA * Math.exp(-this.popT / 120) * Math.cos(this.popT / 38);
    this.body.scale.set((1 + 0.16 * this.liftK) * (1 + sq) * this.burstSx, (1 + 0.16 * this.liftK) * (1 + sq * 0.7) * this.burstSy);
  }

  /** A springy scale pop (landing, snap). */
  pop(amount: number): void {
    this.popT = 0;
    this.popA = this.d.reduceMotion ? amount * 0.4 : amount;
  }

  /** The face lands: a white flash over the card and a big springy pop. */
  snap(strength: number): void {
    this.flashA = Math.min(1, 0.7 + 0.3 * strength);
    this.pop(0.14 + 0.16 * strength);
  }

  /** A white flare over the card alone (the rarity burst's pop); no scale pop. */
  flare(alpha: number): void {
    this.flashA = Math.max(this.flashA, Math.min(1, alpha));
  }

  /** The copies badge counts up from 0 to its copies, 0..1 (bumps on every new number). */
  setCount(u: number): void {
    const t = this.copiesText;
    if (!t || this.card.kind !== 'card') return;
    const n = Math.round(this.card.copies * easeOutCubic(clamp01(u)));
    if (n === this.shownCount) return;
    this.shownCount = n;
    t.text = this.d.i18n.t('capsule.copiesTimes', { n: Math.max(1, n) });
    this.countBumpT = 0;
  }

  /** Per-frame springs and flashes. */
  tick(dtMs: number): void {
    this.time += dtMs;
    this.popT += dtMs;
    this.countBumpT += dtMs;
    this.flashA = Math.max(0, this.flashA - dtMs / 220);
    this.flashG.alpha = this.flashA;
    this.applyScale();
    const b = Math.exp(-this.countBumpT / 90);
    this.copiesBadge.scale.set(1 + 0.35 * b);
    // The pre-signal: the card trembles harder as the build grows.
    const w = this.d.reduceMotion ? 0 : this.wobble;
    this.body.rotation = w > 0 ? Math.sin(this.time / 26) * 0.035 * w * w : 0;
    this.body.x = w > 0 ? Math.sin(this.time / 19 + 1.3) * 3.5 * w * w : 0;
    this.drawLeak();
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
    // A short beat of silhouette first ("who is it?"), then the colour pours up.
    if (this.card.isNew) this.setFill(span(k, 0.12, 0.62));
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
    // A6.6 surplus rule: a stack can keep some copies and turn the spare ones into Dust.
    const kept = p && p.need !== null ? Math.max(0, p.after - p.before) : 0;
    this.chip.visible = fly > 0 && fly < 1;
    this.chip.text = dust
      ? kept > 0
        ? t('capsule.copiesAndDust', { n: kept, dust: this.card.dust })
        : t('capsule.dustPlus', { n: this.card.dust })
      : t('capsule.copiesPlus', { n: this.card.copies });
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
    this.setCount(1);
    this.wobble = 0;
    this.glow.alpha = 0;
    this.rays.alpha = 0;
    this.setLeak(0);
    this.setBurstShape(1, 1);
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
  const scale = rows === 1 ? (n <= 3 ? 1.2 : n <= 5 ? 1.08 : 0.94) : rows === 2 ? 0.74 : 0.58;
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
      const req = { card: v.card.card, ...(v.card.skin ? { skin: v.card.skin } : {}), foil: v.card.foil, size: 256 };
      // NEW cards also load the bare portrait (no age plate) for their silhouette.
      const [url, bareUrl] = await Promise.all([this.d.art.portrait(req), v.card.isNew ? barePortrait(this.d.art, req).catch(() => '') : Promise.resolve('')]);
      const [tex, bare] = await Promise.all([portraitTexture(url), bareUrl ? portraitTexture(bareUrl) : Promise.resolve(null)]);
      if (tex && !v.root.destroyed) v.setPortraitTexture(tex, bare);
    } catch {
      // Keep the drawn fallback portrait.
    }
  }

  view(slot: number): CardView | undefined {
    return this.views[slot];
  }

  private readonly landed = new Set<number>();

  /**
   * Deal face down from the burst point, staggered, 0..1 over the fan step. Each card flies up out
   * of the capsule on an arc, spinning, and lands with a snap. Returns the cards that landed now.
   */
  deal(u: number): CardView[] {
    const n = this.views.length;
    const out: CardView[] = [];
    this.views.forEach((v, i) => {
      const start = n > 1 ? (i / n) * 0.55 : 0;
      const k = span(u, start, start + 0.45);
      v.root.visible = k > 0;
      const e = easeOutCubic(k);
      const side = v.home.x < this.origin.x - 1 ? -1 : v.home.x > this.origin.x + 1 ? 1 : i % 2 === 0 ? -1 : 1;
      v.root.position.set(lerp(this.origin.x, v.home.x, e), lerp(this.origin.y, v.home.y, e) - 150 * hump(k));
      // A full spin on the way, finishing square to its slot.
      v.root.rotation = v.home.rot + side * (1 - e) * Math.PI * 2 * (this.d.reduceMotion ? 0 : 1);
      v.root.scale.set(lerp(0.2, v.home.scale, easeOutBack(k, 1.6)));
      if (k >= 1 && !this.landed.has(i)) {
        this.landed.add(i);
        out.push(v);
      }
    });
    return out;
  }

  /** All cards at home, face down. */
  settleDealt(): void {
    this.deal(1);
  }

  /** Per-frame springs of every card. */
  tick(dtMs: number): void {
    for (const v of this.views) v.tick(dtMs);
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
        x: v.root.x + Math.cos(a) * 40 * v.root.scale.x,
        y: v.root.y + Math.sin(a) * 60 * v.root.scale.x,
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
      x: v.root.x + (this.rng.next() - 0.5) * CARD_W * v.root.scale.x,
      y: v.root.y + (CARD_H / 2) * v.root.scale.x - this.rng.next() * 40,
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
