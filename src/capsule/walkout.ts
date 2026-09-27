/**
 * Legendary walkout and NEW Epic mini-walkout (DESIGN A10 steps 5 and 6).
 *
 * Legendary reveal order: the screen dims to a spotlight and rings spin; a Legendary rarity flare;
 * a gold-rimmed silhouette grows from 20% to full size; a bass drop as the unit bursts into colour
 * and performs its signature move across a lane backdrop; its victory pose; last the age glyph and
 * name banner with "LEGENDARY", confetti, and "NEW!" or the copies bar. Beats come from the plan.
 */
import { BlurFilter, ColorMatrixFilter, Container, FillGradient, Graphics, Sprite, type Text } from 'pixi.js';
import type { AgeId, ArtProvider, I18n, TeamPreset, UnitView } from '@/contracts';
import type { CosmeticRng } from '@/core';
import { clamp01, easeInCubic, easeInOutCubic, easeOutBack, easeOutCubic, easeOutElastic, hump, lerp, span } from './ease';
import { drawBolt, glowSprite, label, type Particles } from './fx';
import { AGE_COLORS, RARITY_COLORS, ROOM, shade } from './palette';
import { MINI_BEATS, type MiniWalkoutStep, type WalkoutBeats, type WalkoutStep } from './plan';
import type { RevealCard } from './summaryModel';
import { confettiTexture, coneTexture, dotTexture, glowTexture, raysTexture, starTexture } from './textures';
import type { CapsuleCatalog, CardProgress } from './types';

export interface WalkoutDeps {
  art: ArtProvider;
  i18n: I18n;
  catalog: CapsuleCatalog;
  particles: Particles;
  rng: CosmeticRng;
  teamPreset: TeamPreset;
  reduceMotion: boolean;
  progress: CardProgress | null;
  /** Screen-level punch at the bass drop: flash, trauma, vibration. */
  impact(kind: 'drop' | 'pop'): void;
}

const FLOOR_Y = 520;
const UNIT_H = 300;

function flatFilter(color: number): ColorMatrixFilter {
  const f = new ColorMatrixFilter();
  const r = ((color >> 16) & 0xff) / 255;
  const g = ((color >> 8) & 0xff) / 255;
  const b = (color & 0xff) / 255;
  f.matrix = [0, 0, 0, 0, r, 0, 0, 0, 0, g, 0, 0, 0, 0, b, 0, 0, 0, 1, 0];
  return f;
}

/** A small age glyph in a gold medallion (A10 step 6 "age glyph"). */
export function ageGlyph(age: AgeId | null, size = 60): Container {
  const root = new Container();
  const c = age ? AGE_COLORS[age] : { accent: ROOM.brass, light: ROOM.parchment, sky: 0x444444, ground: 0x333333 };
  const r = size / 2;
  const g = new Graphics();
  g.circle(0, 0, r).fill(shade(RARITY_COLORS.legendary, -0.1)).stroke({ width: 4, color: shade(RARITY_COLORS.legendary, -0.6) });
  g.circle(0, 0, r - 7).fill(shade(c.sky, -0.25));
  const k = r / 30;
  const ink = c.light;
  switch (age) {
    case 'stone':
      g.poly([-12 * k, 12 * k, 0, -16 * k, 12 * k, 12 * k, 0, 6 * k]).fill(ink);
      break;
    case 'medieval':
      g.poly([-13 * k, -13 * k, 13 * k, -13 * k, 13 * k, 2 * k, 0, 16 * k, -13 * k, 2 * k]).fill(ink);
      g.rect(-2 * k, -10 * k, 4 * k, 20 * k).fill(shade(c.sky, -0.25));
      break;
    case 'gunpowder':
      g.circle(-2 * k, 3 * k, 11 * k).fill(ink);
      g.moveTo(5 * k, -6 * k).lineTo(11 * k, -14 * k).stroke({ width: 3 * k, color: ink });
      g.circle(12 * k, -15 * k, 3 * k).fill(c.accent);
      break;
    case 'modern':
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        g.rect(Math.cos(a) * 12 * k - 3 * k, Math.sin(a) * 12 * k - 3 * k, 6 * k, 6 * k).fill(ink);
      }
      g.circle(0, 0, 10 * k).fill(ink);
      g.circle(0, 0, 4 * k).fill(shade(c.sky, -0.25));
      break;
    case 'future':
      g.circle(0, 0, 4 * k).fill(ink);
      g.ellipse(0, 0, 15 * k, 6 * k).stroke({ width: 2.5 * k, color: ink });
      g.ellipse(0, 0, 6 * k, 15 * k).stroke({ width: 2.5 * k, color: c.accent });
      break;
    default:
      g.circle(0, 0, 8 * k).fill(ink);
  }
  root.addChild(g);
  return root;
}

/** Spinning dashed rings on the floor, in perspective. */
class FloorRings {
  readonly root = new Container();
  private readonly spin = new Container();
  private readonly g = new Graphics();
  constructor(color: number) {
    this.root.scale.y = 0.3;
    this.spin.addChild(this.g);
    this.root.addChild(this.spin);
    const g = this.g;
    for (const [r, dashes, w] of [
      [150, 24, 4],
      [200, 36, 3],
      [250, 12, 6],
    ] as const) {
      for (let i = 0; i < dashes; i++) {
        const a0 = (i / dashes) * Math.PI * 2;
        const a1 = a0 + (Math.PI / dashes) * 1.1;
        g.moveTo(Math.cos(a0) * r, Math.sin(a0) * r);
        g.arc(0, 0, r, a0, a1);
        g.stroke({ width: w, color, alpha: 0.85 });
      }
    }
    this.g.blendMode = 'add';
  }
  update(dtMs: number, speed: number): void {
    this.spin.rotation += (dtMs / 1000) * speed;
  }
}

/** Two copies of the unit: the body (silhouette → colour) and a blurred gold rim behind it. */
class UnitPair {
  readonly root = new Container();
  readonly body: UnitView;
  readonly rim: UnitView;
  private readonly bodyFilter = flatFilter(0x0d0b16);
  private readonly rimFilter = flatFilter(RARITY_COLORS.legendary);
  readonly baseScale: number;

  constructor(art: ArtProvider, visualId: string, skin: string | null, teamPreset: TeamPreset, rimColor: number) {
    const o = { visualId, side: 0 as const, teamPreset, ...(skin ? { skin } : {}) };
    this.rim = art.createUnit(o);
    this.body = art.createUnit(o);
    this.rimFilter = flatFilter(rimColor);
    this.rim.root.filters = [this.rimFilter, new BlurFilter({ strength: 6, quality: 3 })];
    this.rim.root.blendMode = 'add';
    this.body.root.filters = [this.bodyFilter];
    this.root.addChild(this.rim.root, this.body.root);
    for (const u of [this.rim, this.body]) {
      u.setPose({ x: 0, y: 0, facing: 1, hpBp: 10000, shieldBp: 0, stunned: false, frozen: false, alpha: 1, levelTrim: 'none', roleGlyph: 'legendary' });
      u.play('idle', { loop: true });
    }
    const b = this.body.root.getLocalBounds();
    const h = Math.max(20, b.height || 40);
    this.baseScale = Math.max(0.5, Math.min(6, UNIT_H / h));
  }

  /** 1 = flat silhouette, 0 = full colour. */
  setSilhouette(k: number): void {
    const v = clamp01(k);
    this.bodyFilter.alpha = v;
    this.body.root.filters = v <= 0.001 ? [] : [this.bodyFilter];
  }

  setRim(alpha: number, scale: number): void {
    this.rim.root.alpha = alpha;
    this.rim.root.scale.set(scale);
    this.rim.root.visible = alpha > 0.01;
  }

  play(clip: string, loop = false): void {
    this.body.play(clip, { loop });
    this.rim.play(clip, { loop });
  }

  update(dtMs: number): void {
    this.body.update(dtMs);
    this.rim.update(dtMs);
  }

  destroy(): void {
    this.body.destroy();
    this.rim.destroy();
    this.root.destroy({ children: true });
  }
}

/** A lane strip in the unit's age colours, behind the signature move. */
function laneBackdrop(age: AgeId | null): Container {
  const c = age ? AGE_COLORS[age] : { sky: 0x3a3350, ground: 0x2a243c, accent: 0x9a8fc0, light: 0xe0d8ff };
  const root = new Container();
  const sky = new Graphics()
    .rect(-100, 150, 1480, 380)
    .fill(
      new FillGradient({
        type: 'linear',
        start: { x: 0, y: 0 },
        end: { x: 0, y: 1 },
        colorStops: [
          { offset: 0, color: `rgba(0,0,0,0)` },
          { offset: 0.3, color: shade(c.sky, -0.35) },
          { offset: 1, color: shade(c.sky, 0.05) },
        ],
      }),
    );
  const hills = new Graphics();
  hills.moveTo(-100, 470);
  for (let x = -100; x <= 1380; x += 80) hills.lineTo(x + 40, 420 + ((x * 37) % 60)).lineTo(x + 80, 455 + ((x * 13) % 30));
  hills.lineTo(1380, 530).lineTo(-100, 530).closePath().fill(shade(c.sky, -0.5));
  const ground = new Graphics()
    .rect(-100, FLOOR_Y, 1480, 90)
    .fill(
      new FillGradient({
        type: 'linear',
        start: { x: 0, y: 0 },
        end: { x: 0, y: 1 },
        colorStops: [
          { offset: 0, color: shade(c.ground, -0.15) },
          { offset: 1, color: 'rgba(0,0,0,0)' },
        ],
      }),
    );
  ground.rect(-100, FLOOR_Y - 3, 1480, 6).fill({ color: shade(c.ground, 0.25), alpha: 0.8 });
  root.addChild(sky, hills, ground);
  return root;
}

export class Walkout {
  readonly root = new Container();
  private readonly dim = new Graphics();
  private readonly cone: Sprite;
  private readonly floorGlow: Sprite;
  private readonly rings: FloorRings;
  private readonly lane: Container;
  private readonly flare = new Container();
  private readonly flareRays: Sprite;
  private readonly unitHolder = new Container();
  private readonly unit: UnitPair;
  private readonly shock = new Graphics();
  private readonly bannerTop: Text;
  private readonly bannerName = new Container();
  private readonly stampOrBar = new Container();
  private readonly bolts = new Graphics();
  private readonly beats: WalkoutBeats | null;
  private readonly mini: boolean;
  private readonly color: number;
  private dropped = false;
  private moved = { walk: false, attack: false, ability: false, pose: false, spawn: false };
  private confettiT = 0;
  private lastT = 0;

  constructor(
    readonly step: WalkoutStep | MiniWalkoutStep,
    private readonly d: WalkoutDeps,
  ) {
    const card: RevealCard = step.card;
    this.mini = step.kind === 'miniWalkout';
    this.beats = step.kind === 'walkout' ? step.beats : null;
    this.color = RARITY_COLORS[card.rarity];
    const info = d.catalog.card(card.card);

    this.dim.rect(-600, -600, 2480, 1920).fill(0x05040a);
    this.dim.alpha = 0;
    this.cone = new Sprite(coneTexture());
    this.cone.anchor.set(0.5, 0);
    this.cone.position.set(640, -40);
    this.cone.width = 620;
    this.cone.height = FLOOR_Y + 80;
    this.cone.tint = this.mini ? shade(this.color, 0.5) : 0xfff0c8;
    this.cone.blendMode = 'add';
    this.cone.alpha = 0;
    this.floorGlow = glowSprite(glowTexture(), this.color, 600, 0);
    this.floorGlow.position.set(640, FLOOR_Y);
    this.floorGlow.scale.y *= 0.28;
    this.rings = new FloorRings(this.color);
    this.rings.root.position.set(640, FLOOR_Y);
    this.rings.root.alpha = 0;
    this.lane = laneBackdrop(info.age);
    this.lane.alpha = 0;

    this.flareRays = new Sprite(raysTexture(18));
    this.flareRays.anchor.set(0.5);
    this.flareRays.tint = this.color;
    this.flareRays.blendMode = 'add';
    this.flareRays.width = this.flareRays.height = 900;
    const flareCore = glowSprite(glowTexture(), 0xffffff, 320, 1);
    const flareStar = new Sprite(starTexture());
    flareStar.anchor.set(0.5);
    flareStar.blendMode = 'add';
    flareStar.width = flareStar.height = 520;
    flareStar.tint = shade(this.color, 0.5);
    this.flare.addChild(this.flareRays, flareCore, flareStar);
    this.flare.position.set(640, 300);
    this.flare.alpha = 0;

    this.unit = new UnitPair(d.art, info.visualId, card.skin, d.teamPreset, this.color);
    this.unitHolder.addChild(this.unit.root);
    this.unitHolder.position.set(this.mini ? 640 : 560, this.mini ? 470 : FLOOR_Y);
    this.unitHolder.scale.set(0);

    this.shock.blendMode = 'add';
    this.bolts.blendMode = 'add';

    const top = this.mini ? d.i18n.t('capsule.newEpic') : d.i18n.t('capsule.legendary');
    this.bannerTop = label(top, this.mini ? 46 : 72, this.color, { outline: 8, letterSpacing: 6 });
    this.bannerTop.position.set(640, 112);
    this.bannerTop.alpha = 0;

    const name = label(d.i18n.t(info.nameKey), this.mini ? 30 : 40, 0xffffff, { outline: 7 });
    const glyph = ageGlyph(info.age, this.mini ? 46 : 62);
    glyph.position.set(-name.width / 2 - (this.mini ? 36 : 48), 0);
    this.bannerName.addChild(glyph, name);
    this.bannerName.position.set(640, this.mini ? 606 : 628);
    this.bannerName.alpha = 0;

    this.buildStampOrBar(card);
    this.stampOrBar.alpha = 0;

    this.root.addChild(this.dim, this.lane, this.cone, this.floorGlow, this.rings.root, this.flare, this.shock, this.unitHolder, this.bolts, this.bannerTop, this.bannerName, this.stampOrBar);
    if (this.mini) {
      this.unit.setSilhouette(0);
      this.unit.setRim(0, 1);
    } else {
      this.unit.setSilhouette(1);
    }
  }

  private buildStampOrBar(card: RevealCard): void {
    const t = this.d.i18n.t.bind(this.d.i18n);
    if (card.isNew) {
      const g = new Graphics().roundRect(-64, -22, 128, 44, 10).fill(ROOM.newStamp).stroke({ width: 4, color: 0xffffff });
      const l = label(t('capsule.newBang'), 26, 0xffffff, { outline: 5, outlineColor: shade(ROOM.newStamp, -0.6) });
      this.stampOrBar.addChild(g, l);
      this.stampOrBar.rotation = -0.12;
    } else {
      const p = this.d.progress;
      const g = new Graphics().roundRect(-110, -14, 220, 28, 14).fill(0x14121f).stroke({ width: 3, color: ROOM.brassDark });
      let text: string;
      if (p && p.need !== null) {
        const ratio = clamp01(p.after / Math.max(1, p.need));
        g.roundRect(-106, -10, Math.max(12, 212 * ratio), 20, 10).fill(p.after >= p.need ? ROOM.ready : ROOM.amber);
        text = p.after >= p.need ? t('capsule.upgradeReady') : t('capsule.copiesOf', { have: p.after, need: p.need });
      } else if (card.dust > 0) {
        g.roundRect(-106, -10, 212, 20, 10).fill(0x9b7bff);
        text = t('capsule.dustPlus', { n: card.dust });
      } else {
        g.roundRect(-106, -10, 212, 20, 10).fill(ROOM.amber);
        text = t('capsule.copiesPlus', { n: card.copies });
      }
      const l = label(text, 16, 0xffffff, { outline: 4 });
      this.stampOrBar.addChild(g, l);
    }
    this.stampOrBar.position.set(640, this.mini ? 660 : 684);
  }

  /** Advances to step time `t` (ms). */
  update(t: number, dtMs: number): void {
    this.rings.update(dtMs, this.mini ? 1.4 : 0.9 + (this.dropped ? 0.6 : 0));
    this.unit.update(dtMs);
    if (this.mini) this.updateMini(t);
    else if (this.beats) this.updateLegendary(this.beats, t, dtMs);
    this.lastT = t;
  }

  private updateLegendary(b: WalkoutBeats, t: number, dtMs: number): void {
    const end = this.step.durationMs;
    const outro = span(t, end - 260, end);
    const dim = span(t, b.dim[0], b.dim[1]);
    this.dim.alpha = 0.9 * easeOutCubic(dim) * (1 - outro);
    this.cone.alpha = (0.55 + 0.1 * Math.sin(t / 120)) * easeOutCubic(dim) * (1 - outro);
    this.floorGlow.alpha = 0.7 * dim * (1 - outro);
    this.rings.root.alpha = dim * (1 - outro);

    // Flare.
    const f = span(t, b.flare[0], b.flare[1]);
    this.flare.alpha = hump(f) * (1 - outro);
    this.flare.scale.set(lerp(0.2, 1.3, easeOutCubic(f)));
    this.flareRays.rotation += dtMs / 900;

    // Silhouette grows 20% → 100% with a slow anticipation, a hover bob and a gold rim.
    const g = span(t, b.grow[0], b.grow[1]);
    const growScale = lerp(0.2, 1, easeInOutCubic(g));
    const bob = this.dropped ? 0 : Math.sin(t / 180) * 6 * g;
    if (t >= b.grow[0]) {
      this.unitHolder.scale.set(this.unit.baseScale * (this.dropped ? 1 : growScale));
      this.unitHolder.y = FLOOR_Y + bob - (this.dropped ? 0 : 40 * (1 - g));
    }
    this.unit.setRim(this.dropped ? Math.max(0, 1 - span(t, b.drop, b.drop + 500)) : 0.85 * span(t, b.grow[0], b.grow[0] + 300), 1.06);

    // The drop: flash, shockwave, colour.
    if (!this.dropped && t >= b.drop) {
      this.dropped = true;
      this.d.impact('drop');
      this.burst(this.unitHolder.x, FLOOR_Y - 120, 70, [this.color, 0xffffff, shade(this.color, 0.4)]);
      this.unit.play('spawn');
    }
    const col = span(t, b.drop, b.drop + 260);
    this.unit.setSilhouette(1 - col);
    this.lane.alpha = easeOutCubic(span(t, b.drop, b.drop + 400)) * (1 - outro);
    const sw = span(t, b.drop, b.drop + 700);
    this.shock.clear();
    if (sw > 0 && sw < 1) {
      this.shock.ellipse(this.unitHolder.x, FLOOR_Y, 40 + 700 * easeOutCubic(sw), (40 + 700 * easeOutCubic(sw)) * 0.3).stroke({ width: 14 * (1 - sw), color: this.color, alpha: 1 - sw });
      this.shock.circle(this.unitHolder.x, FLOOR_Y - 140, 30 + 500 * easeOutCubic(sw)).stroke({ width: 8 * (1 - sw), color: 0xffffff, alpha: 0.7 * (1 - sw) });
    }

    // Signature move across the lane.
    const m = span(t, b.move[0], b.move[1]);
    if (m > 0 && !this.moved.walk) {
      this.moved.walk = true;
      this.unit.play('walk', true);
    }
    if (m > 0) this.unitHolder.x = lerp(560, 720, easeInOutCubic(span(m, 0, 0.45)));
    if (m >= 0.45 && !this.moved.attack) {
      this.moved.attack = true;
      this.unit.play('attack');
      this.dust(this.unitHolder.x + 120, FLOOR_Y, 18);
    }
    if (m >= 0.72 && !this.moved.ability) {
      this.moved.ability = true;
      this.unit.play('ability');
      this.d.impact('pop');
      this.dust(this.unitHolder.x + 60, FLOOR_Y, 26);
    }
    if (t >= b.pose[0] && !this.moved.pose) {
      this.moved.pose = true;
      this.unit.play('victory');
    }

    // Banner.
    const bn = span(t, b.banner[0], b.banner[0] + 450);
    this.bannerTop.alpha = Math.min(1, bn * 2) * (1 - outro);
    this.bannerTop.scale.set(lerp(1.8, 1, easeOutBack(bn, 2)));
    this.bannerTop.style.letterSpacing = lerp(40, 6, easeOutCubic(bn));
    const nm = span(t, b.banner[0] + 150, b.banner[0] + 550);
    this.bannerName.alpha = nm * (1 - outro);
    this.bannerName.y = 628 + 30 * (1 - easeOutCubic(nm));
    const sb = span(t, b.banner[0] + 300, b.banner[0] + 700);
    this.stampOrBar.alpha = sb * (1 - outro);
    this.stampOrBar.scale.set(easeOutElastic(sb));
    if (t >= b.banner[0] && outro < 1) this.confetti(dtMs);
  }

  private updateMini(t: number): void {
    const B = MINI_BEATS;
    const out = span(t, B.out[0], B.out[1]);
    const inn = span(t, 0, 200);
    this.dim.alpha = 0.62 * inn * (1 - out);
    this.cone.alpha = 0.4 * inn * (1 - out);
    this.floorGlow.alpha = 0.8 * inn * (1 - out);
    this.rings.root.alpha = 0.7 * inn * (1 - out);
    const pop = span(t, B.pop[0], B.pop[1]);
    if (pop > 0 && !this.moved.spawn) {
      this.moved.spawn = true;
      this.unit.play('spawn');
      this.d.impact('pop');
      this.burst(640, 400, 36, [this.color, 0xffffff]);
    }
    this.unitHolder.scale.set(this.unit.baseScale * 0.72 * easeOutElastic(pop) * (1 - easeInCubic(out)));
    const act = span(t, B.act[0], B.act[1]);
    if (act > 0 && !this.moved.attack) {
      this.moved.attack = true;
      this.unit.play('attack');
    }
    if (t >= B.pose[0] && !this.moved.pose) {
      this.moved.pose = true;
      this.unit.play('victory');
    }
    // Violet lightning while it performs.
    const crackle = t < B.pose[1] ? 1 : 0;
    this.bolts.clear();
    if (crackle && Math.floor(t / 70) !== Math.floor(this.lastT / 70)) {
      for (let i = 0; i < 2; i++) {
        const a = this.d.rng.next() * Math.PI * 2;
        drawBolt(this.bolts, this.d.rng, 640 + Math.cos(a) * 220, 360 + Math.sin(a) * 160, 640 + (this.d.rng.next() - 0.5) * 80, 380, this.color, 4, 22);
      }
    }
    const bn = span(t, 250, 650);
    this.bannerTop.alpha = bn * (1 - out);
    this.bannerTop.scale.set(lerp(1.6, 1, easeOutBack(bn, 2)));
    this.bannerName.alpha = span(t, 400, 750) * (1 - out);
    this.stampOrBar.alpha = span(t, 550, 900) * (1 - out);
    this.stampOrBar.scale.set(easeOutElastic(span(t, 550, 1100)));
  }

  private burst(x: number, y: number, n: number, colors: number[]): void {
    const count = this.d.reduceMotion ? Math.ceil(n / 3) : n;
    for (let i = 0; i < count; i++) {
      const a = this.d.rng.next() * Math.PI * 2;
      const sp = 250 + this.d.rng.next() * 650;
      this.d.particles.spawn({
        tex: this.d.rng.next() < 0.4 ? starTexture() : dotTexture(),
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 120,
        life: 600 + this.d.rng.next() * 700,
        drag: 0.1,
        gravity: 350,
        scale: [0.8 + this.d.rng.next(), 0],
        alpha: [1, 0],
        tint: colors[i % colors.length] ?? 0xffffff,
        add: true,
      });
    }
  }

  private dust(x: number, y: number, n: number): void {
    const count = this.d.reduceMotion ? Math.ceil(n / 3) : n;
    for (let i = 0; i < count; i++) {
      this.d.particles.spawn({
        tex: dotTexture(),
        x: x + (this.d.rng.next() - 0.5) * 80,
        y: y - this.d.rng.next() * 20,
        vx: (this.d.rng.next() - 0.3) * 260,
        vy: -80 - this.d.rng.next() * 180,
        life: 500 + this.d.rng.next() * 400,
        drag: 0.15,
        gravity: 300,
        scale: [1.6 + this.d.rng.next(), 2.6],
        alpha: [0.55, 0],
        tint: ROOM.dust,
      });
    }
  }

  private confetti(dtMs: number): void {
    this.confettiT += dtMs;
    const every = this.d.reduceMotion ? 90 : 22;
    const colors = [RARITY_COLORS.legendary, 0xffffff, 0xff8a5c, 0x7dd3fc, shade(RARITY_COLORS.legendary, 0.4)];
    while (this.confettiT >= every) {
      this.confettiT -= every;
      const x = 80 + this.d.rng.next() * 1120;
      this.d.particles.spawn({
        tex: confettiTexture(),
        x,
        y: -20,
        vx: (this.d.rng.next() - 0.5) * 120,
        vy: 160 + this.d.rng.next() * 160,
        life: 2600,
        drag: 0.6,
        gravity: 60,
        scale: [1 + this.d.rng.next() * 0.8, 1],
        alpha: [1, 0.8],
        rot: this.d.rng.next() * 6,
        vr: (this.d.rng.next() - 0.5) * 10,
        tint: colors[Math.floor(this.d.rng.next() * colors.length)] ?? 0xffffff,
        flutter: true,
      });
    }
  }

  destroy(): void {
    this.unit.destroy();
    this.root.destroy({ children: true });
  }
}
