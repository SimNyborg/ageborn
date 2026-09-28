/**
 * The Pixi capsule stage (DESIGN A10, A12): draws every step of a `ShowPlan` as the
 * `ShowRunner` plays it. Layout is authored in a 1280 × 720 design space and scaled to fit; the
 * room backdrop and the screen flash cover the whole screen.
 *
 * Effects follow A12: a trauma shake (+0.25 per climb), short flashes, pooled particles, and the
 * Reduce motion preset (no shake, softer flashes, fewer particles). One-shot effects are keyed with
 * `once`, and every `exit` settles its step's end state silently, so skips never replay effects.
 */
import { Container, Graphics, Sprite } from 'pixi.js';
import type { ArtProvider, CapsuleTier, I18n } from '@/contracts';
import { mulberry32, type CosmeticRng } from '@/core';
import { CardFan, CardView, portraitTexture } from './cardFan';
import { CapsuleDrum, Hammer, Pedestal, Pips } from './climb';
import { clamp01, easeInQuad, easeOutBack, easeOutCubic, lerp, span } from './ease';
import { Particles, Trauma, glowSprite, label } from './fx';
import { RARITY_COLORS, ROOM, TIER_COLORS, shade } from './palette';
import type {
  BurstStep,
  FlipStep,
  MiniWalkoutStep,
  ShowPlan,
  ShowStep,
  StrikeStep,
  VolleyStep,
  WalkoutStep,
} from './plan';
import { CrateView } from './crate';
import type { ShowView } from './runner';
import { coneTexture, confettiTexture, dotTexture, glowTexture, raysTexture, roomTexture, shardTexture, starTexture } from './textures';
import { tierIndex } from './tiers';
import type { CapsuleCatalog, ProgressLookup, ShowSettings } from './types';
import { Walkout } from './walkout';

export const DESIGN_W = 1280;
export const DESIGN_H = 720;
/** Where the drum stands (top of the pedestal). */
const PED = { x: 640, y: 470 };
/** Where the Amber counter sits (the DOM overlay's top right), in design space. */
const AMBER_TARGET = { x: 1190, y: 40 };
/** Hammer grip position and angles (rest, and the angle where the head meets the drum). */
const HAMMER = { x: 822, y: 474, rest: 0.38, hit: -0.74, impactMs: 90 };

export interface StageDeps {
  art: ArtProvider;
  i18n: I18n;
  catalog: CapsuleCatalog;
  progress?: ProgressLookup;
  settings: ShowSettings;
  seed: number;
}

interface Flyer {
  c: Container;
  vx: number;
  vy: number;
  vr: number;
  life: number;
}

interface MiniDrum {
  drum: CapsuleDrum;
  x: number;
  y: number;
  at: number;
  burst: boolean;
  tier: CapsuleTier;
}

export class CapsuleStage implements ShowView {
  readonly root = new Container();
  private readonly bg = new Sprite(roomTexture());
  private readonly world = new Container();
  private readonly flashG = new Graphics();
  private readonly particles: Particles;
  private readonly motes: Particles;
  private readonly rng: CosmeticRng;
  private readonly trauma: Trauma;
  private readonly cone: Sprite;
  private readonly halo: Sprite;
  private readonly backRays: Sprite;
  private readonly bigRays: Sprite;
  private readonly shadow = new Graphics();
  private readonly waves = new Graphics();
  private readonly pedestal = new Pedestal();
  /** Pedestal, pips, crate and drum: sinks as a unit once the cards take the stage. */
  private readonly pedGroup = new Container();
  private readonly drum: CapsuleDrum;
  private readonly hammer = new Hammer();
  private readonly pips = new Pips();
  private readonly fan: CardFan | null;
  private readonly walkoutLayer = new Container();
  private readonly flightLayer = new Container();
  private readonly crate = new CrateView();
  private walkout: Walkout | null = null;
  private miniDrums: MiniDrum[] = [];
  private readonly flyers: Flyer[] = [];
  private readonly fired = new Set<string>();
  private readonly lift = new Map<number, number>();
  private readonly signal = new Map<number, number>();
  private w = DESIGN_W;
  private h = DESIGN_H;
  private scale = 1;
  private time = 0;
  private tier: CapsuleTier;
  private flashAlpha = 0;
  private flashColor = 0xffffff;
  private squashT = 1e6;
  private squashA = 0;
  private crateSquash = 0;
  private drumWhite = 0;
  private hammerT = -1;
  private hammerShown = 0;
  private hammerTarget = 0;
  private raysLevel = 0;
  private bigRaysLevel = 0;
  private focusSlot = -1;
  private moteT = 0;
  private fanAlpha = 1;
  private waveT = -1;
  private waveColor = 0xffffff;
  private summaryDim = 0;
  /** 0..1: the pedestal sinks and dims once the cards take the stage. */
  private pedSink = 0;
  private pedSinkTarget = 0;
  private confettiOn = false;
  private confettiT = 0;

  constructor(
    readonly plan: ShowPlan,
    private readonly d: StageDeps,
  ) {
    const rm = d.settings.reduceMotion;
    this.rng = mulberry32(d.seed);
    this.trauma = new Trauma(d.seed ^ 0x5eed, rm ? 0 : 1);
    this.particles = new Particles(rm ? 300 : 700);
    this.motes = new Particles(80);
    this.tier = plan.startTier ?? 'clay';

    this.cone = new Sprite(coneTexture());
    this.cone.anchor.set(0.5, 0);
    this.cone.position.set(PED.x, -80);
    this.cone.width = 760;
    this.cone.height = PED.y + 140;
    this.cone.blendMode = 'add';
    this.cone.alpha = 0.3;

    this.backRays = new Sprite(raysTexture(14));
    this.backRays.anchor.set(0.5);
    this.backRays.position.set(PED.x, PED.y - 130);
    this.backRays.blendMode = 'add';
    this.backRays.alpha = 0;
    this.bigRays = new Sprite(raysTexture(18));
    this.bigRays.anchor.set(0.5);
    this.bigRays.position.set(640, 318);
    this.bigRays.blendMode = 'add';
    this.bigRays.alpha = 0;
    this.halo = glowSprite(glowTexture(), TIER_COLORS[this.tier], 560, 0);
    this.halo.position.set(PED.x, PED.y - 130);

    this.shadow.ellipse(0, 0, 100, 16).fill({ color: 0x000000, alpha: 0.45 });
    this.shadow.position.set(PED.x, PED.y + 4);
    this.shadow.alpha = 0;

    this.drum = new CapsuleDrum(d.seed);
    this.drum.root.position.set(PED.x, PED.y);
    this.drum.root.visible = false;
    this.drum.setTier(this.tier);
    this.pedestal.root.position.set(PED.x, PED.y);
    this.pedestal.setColor(TIER_COLORS[this.tier]);
    this.pedestal.setGlow(0);
    this.pips.root.position.set(PED.x, PED.y + 71);
    this.pips.root.visible = plan.steps.some((s) => s.kind === 'strike');
    this.pips.root.alpha = 0;
    this.hammer.root.position.set(HAMMER.x, HAMMER.y);
    this.hammer.root.rotation = HAMMER.rest;
    this.hammer.root.alpha = 0;
    this.waves.blendMode = 'add';
    this.crate.root.position.set(PED.x, PED.y);
    this.crate.root.visible = false;
    this.pedGroup.visible = plan.mode !== 'openAll';

    this.pedGroup.addChild(this.shadow, this.pedestal.root, this.pips.root, this.crate.root, this.drum.root);
    const usesFan = plan.steps.some((s) => s.kind === 'fan' || (s.kind === 'flip' && plan.mode === 'wardrobe'));
    this.fan = usesFan ? new CardFan(plan.cards, this.cardDeps(), { x: PED.x, y: PED.y - 120 }) : null;

    this.world.pivot.set(DESIGN_W / 2, DESIGN_H / 2);
    this.world.addChild(
      this.cone,
      this.motes.root,
      this.backRays,
      this.bigRays,
      this.halo,
      this.pedGroup,
      this.hammer.root,
      this.waves,
      ...(this.fan ? [this.fan.root] : []),
      this.flightLayer,
      this.walkoutLayer,
      this.particles.root,
    );
    this.root.addChild(this.bg, this.world, this.flashG);
    this.resize(DESIGN_W, DESIGN_H);
  }

  private cardDeps() {
    return { art: this.d.art, i18n: this.d.i18n, catalog: this.d.catalog, particles: this.particles, rng: this.rng, reduceMotion: this.d.settings.reduceMotion };
  }

  /** Fits the design space into the screen (contain), centred. */
  resize(w: number, h: number): void {
    this.w = Math.max(1, w);
    this.h = Math.max(1, h);
    this.scale = Math.min(this.w / DESIGN_W, this.h / DESIGN_H);
    this.world.scale.set(this.scale);
    this.world.position.set(this.w / 2, this.h / 2);
    this.bg.width = this.w;
    this.bg.height = this.h;
    this.flashG.clear().rect(0, 0, this.w, this.h).fill(0xffffff);
    this.flashG.alpha = this.flashAlpha;
  }

  /** Design-space point to screen pixels (for DOM overlays). */
  toScreen(x: number, y: number): { x: number; y: number } {
    return { x: this.w / 2 + (x - DESIGN_W / 2) * this.scale, y: this.h / 2 + (y - DESIGN_H / 2) * this.scale };
  }

  // ---------------------------------------------------------------------------------------------
  // ShowView
  // ---------------------------------------------------------------------------------------------

  enter(step: ShowStep, instant: boolean): void {
    switch (step.kind) {
      case 'arrival':
      case 'charge':
        this.drum.root.visible = true;
        this.pips.root.visible = true;
        break;
      case 'strike':
        this.hammerTarget = 1;
        break;
      case 'burst':
        this.enterBurst(step, instant);
        break;
      case 'volley':
        this.enterVolley(step, instant);
        break;
      case 'fan':
        this.bigRaysLevel = Math.max(this.bigRaysLevel, 0.35);
        this.pedSinkTarget = 1;
        break;
      case 'signal':
      case 'flip':
        this.focusSlot = step.card.slot;
        if (this.plan.mode === 'wardrobe') this.riseFromCrate(step.kind === 'signal' && !instant ? 0 : 1);
        break;
      case 'walkout':
      case 'miniWalkout':
        if (!instant) this.startWalkout(step);
        break;
      case 'duplicates':
        this.focusSlot = -1;
        break;
      case 'crateArrival':
        this.crate.root.visible = true;
        this.pedestal.setColor(ROOM.brassLight);
        break;
      case 'crateOpen':
        this.bigRays.tint = 0xffe7b0;
        break;
      case 'summary':
        this.focusSlot = -1;
        this.summaryDim = 1;
        this.confettiOn = false;
        break;
    }
  }

  progress(step: ShowStep, t: number, dt: number): void {
    switch (step.kind) {
      case 'arrival':
        this.arrival(t);
        break;
      case 'charge':
        this.charge(t / step.durationMs, t, dt);
        break;
      case 'strike':
        this.strike(step, t);
        break;
      case 'burst':
        this.burst(step, t);
        break;
      case 'volley':
        this.volley(step, t);
        break;
      case 'fan':
        this.fan?.deal(t / step.durationMs);
        break;
      case 'signal':
        this.signal.set(step.card.slot, easeOutCubic(t / step.durationMs));
        if (step.card.rarity === 'legendary') this.bigRaysLevel = lerp(0.35, 0.8, t / step.durationMs);
        if (this.plan.mode === 'wardrobe') this.riseFromCrate(t / step.durationMs);
        break;
      case 'flip':
        this.flip(step, t);
        break;
      case 'walkout':
      case 'miniWalkout':
        this.walkout?.update(t, dt);
        break;
      case 'duplicates':
        this.fan?.view(step.card.slot)?.setBar(t / step.durationMs, step.progress, (k, o) => this.d.i18n.t(k, o));
        break;
      case 'crateArrival':
        this.crateArrival(t);
        break;
      case 'crateOpen':
        this.crateOpen(t, step.durationMs);
        break;
      case 'summary':
        break;
    }
  }

  exit(step: ShowStep): void {
    switch (step.kind) {
      case 'arrival':
        this.fire('arrival-impact');
        this.placeDrum(1e6);
        this.pedestal.setGlow(1);
        break;
      case 'charge':
        this.drum.body.position.set(0, 0);
        this.drum.body.rotation = 0;
        this.drum.setCracks(0.85);
        this.pips.root.alpha = 1;
        break;
      case 'strike':
        this.settleStrike(step);
        break;
      case 'burst':
        this.fire('burst');
        this.drum.root.visible = false;
        this.hammerTarget = 0;
        this.pedestal.setGlow(0.4);
        break;
      case 'volley':
        // Hidden, not destroyed: their halves may still be flying and share the drawing context.
        for (const m of this.miniDrums) m.drum.root.visible = false;
        break;
      case 'fan':
        this.fan?.settleDealt();
        break;
      case 'signal':
        this.signal.set(step.card.slot, 1);
        if (this.plan.mode === 'wardrobe') this.riseFromCrate(1);
        break;
      case 'flip':
        this.fire(`flipped-${step.card.key}`);
        this.fire(`stamp-${step.card.key}`);
        this.fan?.view(step.card.slot)?.settleFaceUp();
        this.signal.set(step.card.slot, 0);
        this.focusSlot = -1;
        this.bigRaysLevel = Math.min(this.bigRaysLevel, 0.35);
        break;
      case 'walkout':
      case 'miniWalkout':
        this.walkout?.destroy();
        this.walkout = null;
        break;
      case 'duplicates':
        this.fan?.view(step.card.slot)?.setBar(1, step.progress, (k, o) => this.d.i18n.t(k, o));
        break;
      case 'crateArrival':
        this.fire('crate-impact');
        this.placeCrate(1e6);
        this.pedestal.setGlow(1);
        break;
      case 'crateOpen':
        this.fire('crate-burst');
        this.crate.box.position.set(0, 0);
        this.crate.box.rotation = 0;
        this.crate.glow.alpha = 0;
        this.setLid(1);
        break;
      case 'summary':
        break;
    }
  }

  waiting(step: StrikeStep, idleMs: number): void {
    // The next pip breathes and the hammer hovers, inviting the tap.
    this.pips.pip(step.index)?.scale.set(1 + 0.2 * Math.max(0, Math.sin(idleMs / 110)));
    this.hammerTarget = 1;
  }

  // ---------------------------------------------------------------------------------------------
  // The climb (A10 steps 1-4)
  // ---------------------------------------------------------------------------------------------

  private placeDrum(t: number): void {
    const fall = span(t, 0, 220);
    this.drum.root.y = PED.y - 520 * (1 - easeInQuad(fall));
    this.shadow.scale.set(lerp(0.4, 1, fall));
    this.shadow.alpha = fall;
  }

  private arrival(t: number): void {
    this.placeDrum(t);
    this.pedestal.setGlow(span(t, 180, 500));
    this.halo.alpha = 0.25 * span(t, 180, 500);
    if (t >= 220 && this.fire('arrival-impact')) {
      this.squash(0.28);
      this.trauma.add(0.18);
      this.dustRing(PED.x, PED.y, 30);
    }
  }

  private charge(u: number, t: number, dt: number): void {
    const k = this.d.settings.reduceMotion ? 0.3 : 1;
    this.drum.body.x = Math.sin(t * 0.09) * (0.8 + 4.5 * u) * k;
    this.drum.body.rotation = Math.sin(t * 0.071) * 0.018 * u * k;
    this.drum.setCracks(u * 0.85);
    this.drum.energy = Math.max(this.drum.energy, u * 0.8);
    this.halo.alpha = 0.25 + 0.35 * u;
    this.raysLevel = 0.15 * u;
    this.pips.root.alpha = span(u, 0, 0.3);
    if (u > 0.72) this.hammerTarget = 1;
    // Light leaks from the cracks.
    if (this.rng.next() < dt / 40) {
      this.particles.spawn({
        tex: dotTexture(),
        x: PED.x + (this.rng.next() - 0.5) * 150,
        y: PED.y - 60 - this.rng.next() * 140,
        vx: (this.rng.next() - 0.5) * 60,
        vy: -60 - this.rng.next() * 90,
        life: 700,
        scale: [0.7, 0.1],
        alpha: [0.9, 0],
        tint: shade(TIER_COLORS[this.tier], 0.4),
        add: true,
      });
    }
  }

  private strike(s: StrikeStep, t: number): void {
    this.drum.body.x *= 0.8;
    this.hammerT = t;
    this.pips.pip(s.index)?.scale.set(1);
    if (t >= HAMMER.impactMs && this.fire(`strike-${s.index}`)) {
      if (s.climb) this.climbImpact(s);
      else this.missImpact(s);
    }
  }

  private setShownTier(tier: CapsuleTier): void {
    const c = TIER_COLORS[tier];
    this.tier = tier;
    this.drum.setTier(tier);
    this.drum.setCracks(0.85);
    this.pedestal.setColor(c);
    this.halo.tint = c;
    this.backRays.tint = c;
    this.bigRays.tint = c;
    this.raysLevel = 0.25 + 0.14 * tierIndex(tier);
  }

  private climbImpact(s: StrikeStep): void {
    const c = TIER_COLORS[s.to];
    this.setShownTier(s.to);
    this.drumWhite = 1;
    this.drum.energy = 1.2;
    this.halo.alpha = 0.55 + 0.1 * tierIndex(s.to);
    this.pips.set(s.index, s.to);
    this.pips.pip(s.index)?.scale.set(1.7);
    this.squash(0.22);
    this.trauma.add(0.25);
    this.flash(0.32, shade(c, 0.6));
    this.waveT = 0;
    this.waveColor = c;
    this.vibrate(28);
    const n = this.d.settings.reduceMotion ? 14 : 44;
    for (let i = 0; i < n; i++) {
      const a = this.rng.next() * Math.PI * 2;
      const sp = 260 + this.rng.next() * 520;
      this.particles.spawn({
        tex: i % 3 === 0 ? starTexture() : dotTexture(),
        x: PED.x + Math.cos(a) * 40,
        y: PED.y - 130 + Math.sin(a) * 60,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 100,
        life: 450 + this.rng.next() * 450,
        drag: 0.06,
        gravity: 500,
        scale: [0.9 + this.rng.next() * 0.6, 0],
        alpha: [1, 0],
        tint: i % 4 === 0 ? 0xffffff : c,
        add: true,
      });
    }
  }

  private missImpact(s: StrikeStep): void {
    this.pips.set(s.index, 'miss');
    this.squash(0.1);
    this.trauma.add(0.06);
    const n = this.d.settings.reduceMotion ? 5 : 12;
    for (let i = 0; i < n; i++) {
      this.particles.spawn({
        tex: dotTexture(),
        x: PED.x + 70 + (this.rng.next() - 0.5) * 30,
        y: PED.y - 130 + (this.rng.next() - 0.5) * 50,
        vx: 60 + this.rng.next() * 160,
        vy: -60 - this.rng.next() * 120,
        life: 450 + this.rng.next() * 250,
        drag: 0.2,
        gravity: 260,
        scale: [1.2, 2.2],
        alpha: [0.5, 0],
        tint: ROOM.dust,
      });
    }
  }

  /** End state of a strike, whether it played or was skipped. */
  private settleStrike(s: StrikeStep): void {
    this.fire(`strike-${s.index}`);
    this.hammerT = -1;
    this.pips.set(s.index, s.climb ? s.to : 'miss');
    this.pips.pip(s.index)?.scale.set(1);
    if (s.climb && this.tier !== s.to) this.setShownTier(s.to);
  }

  private enterBurst(s: BurstStep, instant: boolean): void {
    if (this.tier !== s.tier || s.fixed) this.setShownTier(s.tier);
    this.bigRaysLevel = 0.4;
    this.hammerTarget = 0;
    if (s.fixed) {
      // Fixed-tier capsules start here (A6.4): the drum is simply there.
      this.drum.root.visible = true;
      this.pedestal.setGlow(1);
      this.placeDrum(1e6);
    }
    if (instant) {
      this.drum.root.visible = false;
      this.fire('burst');
      return;
    }
    this.fire('burst');
    const c = TIER_COLORS[s.tier];
    this.flash(0.95, 0xffffff);
    this.trauma.add(0.45);
    this.vibrate(40);
    this.drumWhite = 1;
    this.drum.shatter();
    this.bigRays.scale.set(0.3);
    this.throwHalves(this.drum, PED.x, PED.y, 1);
    this.shards(PED.x, PED.y - 130, c, this.d.settings.reduceMotion ? 18 : 56, 1);
    if (s.amber > 0) this.pourAmber(PED.x, PED.y - 130, 16);
  }

  private burst(s: BurstStep, t: number): void {
    const u = t / s.durationMs;
    this.bigRaysLevel = lerp(0.25, 0.55, easeOutCubic(u));
    this.bigRays.scale.set(lerp(0.4, 1.5, easeOutBack(u, 1.4)));
    this.halo.alpha = lerp(1, 0.4, u);
  }

  private enterVolley(s: VolleyStep, instant: boolean): void {
    this.pedGroup.visible = false;
    this.bigRays.tint = TIER_COLORS[s.tiers.reduce<CapsuleTier>((a, b) => (tierIndex(b) > tierIndex(a) ? b : a), 'clay')];
    if (instant) return;
    const n = s.tiers.length;
    const width = Math.min(1040, n * 125);
    const scale = n > 6 ? 0.42 : 0.55;
    this.miniDrums = s.tiers.map((tier, i) => {
      const drum = new CapsuleDrum(this.d.seed + i * 31);
      drum.setTier(tier);
      const off = n > 1 ? i / (n - 1) - 0.5 : 0;
      const x = 640 + off * width;
      const y = 440 + Math.abs(off) * 70;
      drum.root.position.set(x, y);
      drum.root.scale.set(scale);
      drum.root.alpha = 0;
      this.world.addChildAt(drum.root, this.world.getChildIndex(this.pedGroup) + 1);
      return { drum, x, y, at: s.cues[i]?.atMs ?? 0, burst: false, tier };
    });
  }

  private volley(s: VolleyStep, t: number): void {
    for (const m of this.miniDrums) {
      if (!m.burst) {
        const appear = span(t, m.at - 300, m.at - 40);
        m.drum.root.alpha = Math.min(1, appear * 2 + 0.25);
        m.drum.body.scale.set(0.8 + 0.2 * easeOutBack(appear), 0.8 + 0.2 * easeOutBack(appear));
        m.drum.body.x = Math.sin(t * 0.08 + m.x) * 2 * appear;
      }
      if (!m.burst && t >= m.at) {
        m.burst = true;
        const c = TIER_COLORS[m.tier];
        this.flash(tierIndex(m.tier) >= 3 ? 0.5 : 0.22, shade(c, 0.6));
        this.trauma.add(0.1 + 0.05 * tierIndex(m.tier));
        m.drum.setWhite(1);
        m.drum.shatter();
        this.throwHalves(m.drum, m.x, m.y, m.drum.root.scale.x);
        this.shards(m.x, m.y - 60, c, this.d.settings.reduceMotion ? 6 : 18, 0.6);
        this.pourAmber(m.x, m.y - 60, 4);
      }
      if (m.burst) m.drum.setWhite(Math.max(0, 1 - (t - m.at) / 200));
    }
    this.bigRaysLevel = 0.3 * span(t, 0, s.durationMs);
  }

  // ---------------------------------------------------------------------------------------------
  // Cards (A10 steps 5-7)
  // ---------------------------------------------------------------------------------------------

  private flip(s: FlipStep, t: number): void {
    const v = this.fan?.view(s.card.slot);
    if (!v) return;
    const f = span(t, 0, s.flipMs);
    v.setFlip(f);
    const r = s.card.rarity;
    const crackles = r === 'epic' || (s.card.kind === 'skin' && r === 'legendary');
    if (r === 'rare' && f < 1) this.fan?.shimmer(v, 0.6);
    if (crackles && f < 1) {
      if (Math.floor(t / 60) !== Math.floor((t - 17) / 60)) v.drawBolts(true, RARITY_COLORS[r]);
    } else {
      v.drawBolts(false, 0);
    }
    if (f >= 1 && this.fire(`flipped-${s.card.key}`)) {
      this.fan?.flipBurst(v, r === 'epic' || r === 'legendary');
      this.signal.set(s.card.slot, 0);
      if (r === 'epic' || r === 'legendary') {
        this.trauma.add(0.12);
        this.flash(0.18, shade(RARITY_COLORS[r], 0.5));
      }
    }
    if (s.foilMs > 0) v.setFoil(span(t, s.flipMs, s.flipMs + s.foilMs));
    if (s.stampMs > 0) {
      const st = span(t, s.flipMs + s.foilMs, s.flipMs + s.foilMs + s.stampMs);
      v.setStamp(st);
      if (st >= 0.6 && this.fire(`stamp-${s.card.key}`)) {
        this.trauma.add(0.08);
        this.dustRing(v.root.x - 30, v.root.y - 60, 8);
      }
    }
  }

  private startWalkout(step: WalkoutStep | MiniWalkoutStep): void {
    this.walkout?.destroy();
    const progress = step.card.kind === 'card' && this.d.progress ? this.d.progress(step.card.card, step.card.rarity) : null;
    this.walkout = new Walkout(step, {
      art: this.d.art,
      i18n: this.d.i18n,
      catalog: this.d.catalog,
      particles: this.particles,
      rng: this.rng,
      teamPreset: this.d.settings.teamPreset,
      reduceMotion: this.d.settings.reduceMotion,
      progress,
      impact: (kind) => {
        if (kind === 'drop') {
          this.flash(0.9, 0xffffff);
          this.trauma.add(0.6);
          this.vibrate([40, 30, 90]);
        } else {
          this.trauma.add(0.15);
        }
      },
    });
    this.walkoutLayer.addChild(this.walkout.root);
  }

  // ---------------------------------------------------------------------------------------------
  // Wardrobe Crate (A10, A15.3: the card flip, no reel)
  // ---------------------------------------------------------------------------------------------

  private placeCrate(t: number): void {
    const fall = span(t, 0, 220);
    this.crate.root.y = PED.y - 520 * (1 - easeInQuad(fall));
    this.shadow.scale.set(lerp(0.4, 1.15, fall));
    this.shadow.alpha = fall;
  }

  private crateArrival(t: number): void {
    this.placeCrate(t);
    this.pedestal.setGlow(span(t, 180, 500));
    if (t >= 220 && this.fire('crate-impact')) {
      this.crateSquash = 1;
      this.trauma.add(0.18);
      this.dustRing(PED.x, PED.y, 30);
    }
    if (this.fan && this.plan.mode === 'wardrobe') {
      const v = this.fan.views[0];
      if (v) v.root.visible = false;
    }
  }

  /** The lid flies off, 0..1. */
  private setLid(u: number): void {
    const k = clamp01(u);
    this.crate.lid.y = -150 - 300 * easeOutCubic(k);
    this.crate.lid.x = 90 * easeOutCubic(k);
    this.crate.lid.rotation = 0.9 * k;
    this.crate.lid.alpha = 1 - clamp01((k - 0.4) / 0.6);
  }

  /**
   * The crate rattles harder and harder while warm light leaks from its seams (no rarity colour: the
   * honest pre-signal belongs to the card), then the lid bursts off with a flash and golden rays.
   */
  private crateOpen(t: number, dur: number): void {
    const burstAt = dur - 80;
    const u = clamp01(t / burstAt);
    const k = this.d.settings.reduceMotion ? 0.3 : 1;
    if (t < burstAt) {
      const amp = (1 + 7 * u * u) * k;
      this.crate.box.x = Math.sin(t * 0.11) * amp;
      this.crate.box.rotation = Math.sin(t * 0.083) * 0.03 * u * k;
      this.crate.lid.y = -150 - Math.abs(Math.sin(t * 0.13)) * 6 * u * k;
      this.crate.glow.alpha = 0.15 + 0.85 * u * u;
      this.halo.tint = 0xffd98a;
      this.halo.alpha = 0.35 * u;
      this.bigRaysLevel = 0.15 * u;
      this.moteT += 1;
      if (u > 0.3 && this.moteT % 3 === 0) this.dustRing(PED.x + (this.rng.next() - 0.5) * 180, PED.y - 150, 2);
      return;
    }
    if (this.fire('crate-burst')) {
      this.crate.box.position.set(0, 0);
      this.crate.box.rotation = 0;
      this.flash(this.d.settings.reduceMotion ? 0.3 : 0.7, 0xfff1c8);
      this.trauma.add(0.3);
      this.crateSquash = 1;
      this.shards(PED.x, PED.y - 150, ROOM.brassLight, this.d.settings.reduceMotion ? 8 : 28, 0.7);
      this.bigRaysLevel = 0.55;
    }
    this.crate.glow.alpha = 1 - span(t, burstAt, dur);
    this.setLid(span(t, burstAt, dur));
  }

  /** The single skin card rises out of the open crate face down, 0..1. */
  private riseFromCrate(u: number): void {
    const v = this.fan?.views[0];
    if (!v) return;
    const e = easeOutBack(clamp01(u), 1.3);
    v.root.visible = true;
    v.root.position.set(v.home.x, lerp(PED.y - 90, v.home.y, e));
    v.root.scale.set(lerp(0.35, v.home.scale, easeOutCubic(clamp01(u))));
    v.root.rotation = 0.12 * (1 - e);
    this.setLid(1);
  }

  private async art(card: string, skin: string | null) {
    try {
      const url = await this.d.art.portrait({ card, ...(skin ? { skin } : {}), size: 256 });
      return await portraitTexture(url);
    } catch {
      return null;
    }
  }

  // ---------------------------------------------------------------------------------------------
  // Effects
  // ---------------------------------------------------------------------------------------------

  /** True the first time `key` fires; later calls (replays, skips) do nothing. */
  private fire(key: string): boolean {
    if (this.fired.has(key)) return false;
    this.fired.add(key);
    return true;
  }

  private squash(a: number): void {
    this.squashT = 0;
    this.squashA = this.d.settings.reduceMotion ? a * 0.4 : a;
  }

  private flash(alpha: number, color: number): void {
    const a = this.d.settings.reduceMotion ? alpha * 0.4 : alpha;
    if (a >= this.flashAlpha) this.flashColor = color;
    this.flashAlpha = Math.max(this.flashAlpha, a);
  }

  private vibrate(pattern: number | number[]): void {
    if (!this.d.settings.vibrate || typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
    try {
      navigator.vibrate(pattern);
    } catch {
      // Some browsers refuse without a user gesture.
    }
  }

  private dustRing(x: number, y: number, n: number): void {
    const count = this.d.settings.reduceMotion ? Math.ceil(n / 3) : n;
    for (let i = 0; i < count; i++) {
      const dir = i % 2 === 0 ? -1 : 1;
      const sp = 120 + this.rng.next() * 260;
      this.particles.spawn({
        tex: dotTexture(),
        x: x + dir * (40 + this.rng.next() * 60),
        y: y - this.rng.next() * 10,
        vx: dir * sp,
        vy: -40 - this.rng.next() * 90,
        life: 450 + this.rng.next() * 350,
        drag: 0.08,
        gravity: 200,
        scale: [1.4 + this.rng.next(), 2.8],
        alpha: [0.55, 0],
        tint: ROOM.dust,
      });
    }
  }

  private shards(x: number, y: number, color: number, n: number, power: number): void {
    for (let i = 0; i < n; i++) {
      const a = this.rng.next() * Math.PI * 2;
      const sp = (300 + this.rng.next() * 700) * power;
      const glint = i % 3 === 0;
      this.particles.spawn({
        tex: glint ? starTexture() : shardTexture(),
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 200 * power,
        life: 700 + this.rng.next() * 600,
        drag: 0.25,
        gravity: 900,
        scale: glint ? [1.2, 0] : [0.7 + this.rng.next() * 0.9, 0.5],
        alpha: [1, 0],
        rot: this.rng.next() * 6,
        vr: (this.rng.next() - 0.5) * 18,
        tint: glint ? 0xffffff : i % 2 === 0 ? color : shade(color, -0.3),
        add: glint,
      });
    }
  }

  /** Amber drops arc into the counter (A10 step 4: "Amber pours into the counter"). */
  private pourAmber(x: number, y: number, n: number): void {
    const g = 700;
    for (let i = 0; i < n; i++) {
      const tt = 0.7 + i * 0.03;
      const sx = x + (this.rng.next() - 0.5) * 60;
      const sy = y + (this.rng.next() - 0.5) * 60;
      this.particles.spawn({
        tex: dotTexture(),
        x: sx,
        y: sy,
        vx: (AMBER_TARGET.x - sx) / tt,
        vy: (AMBER_TARGET.y - sy) / tt - (g * tt) / 2,
        gravity: g,
        life: tt * 1000,
        scale: [1.2, 0.7],
        alpha: [1, 0.9],
        tint: ROOM.amber,
        add: true,
        delay: i * 18,
      });
    }
  }

  private throwHalves(drum: CapsuleDrum, x: number, y: number, k: number): void {
    for (const [half, dir] of [
      [drum.left, -1],
      [drum.right, 1],
    ] as const) {
      const c = new Container();
      half.removeFromParent();
      half.position.set(0, 0);
      c.addChild(half);
      c.position.set(x, y);
      c.scale.set(k);
      this.flightLayer.addChild(c);
      this.flyers.push({ c, vx: dir * (380 + this.rng.next() * 200) * k, vy: (-420 - this.rng.next() * 200) * k, vr: dir * (3 + this.rng.next() * 2), life: 1200 });
    }
  }

  private confetti(dt: number): void {
    if (!this.confettiOn) return;
    this.confettiT += dt;
    const every = this.d.settings.reduceMotion ? 100 : 30;
    const colors = [0xffffff, RARITY_COLORS.legendary, RARITY_COLORS.epic, RARITY_COLORS.rare, 0xff8a5c];
    while (this.confettiT >= every) {
      this.confettiT -= every;
      this.particles.spawn({
        tex: confettiTexture(),
        x: 100 + this.rng.next() * 1080,
        y: -10,
        vx: (this.rng.next() - 0.5) * 100,
        vy: 180 + this.rng.next() * 140,
        life: 2400,
        drag: 0.7,
        gravity: 40,
        scale: [1 + this.rng.next() * 0.6, 1],
        alpha: [1, 0.7],
        rot: this.rng.next() * 6,
        vr: (this.rng.next() - 0.5) * 10,
        tint: colors[Math.floor(this.rng.next() * colors.length)] ?? 0xffffff,
        flutter: true,
      });
    }
  }

  // ---------------------------------------------------------------------------------------------
  // Frame
  // ---------------------------------------------------------------------------------------------

  /** Ambient animation; call once per frame with the show's (scaled) frame time. */
  update(dtMs: number): void {
    const dt = Math.max(0, Math.min(100, dtMs));
    this.time += dt;
    this.particles.update(dt);
    this.motes.update(dt);
    this.drum.update(dt);
    for (const m of this.miniDrums) if (m.drum.root.visible) m.drum.update(dt);
    this.confetti(dt);
    this.updateMotes(dt);
    this.updateDrumAndHammer(dt);
    this.updateRays(dt);
    this.updatePedestal(dt);
    this.updateCards(dt);
    this.updateFlyers(dt);

    // Screen flash and shake.
    this.flashAlpha = Math.max(0, this.flashAlpha - dt / 200);
    this.flashG.alpha = this.flashAlpha;
    this.flashG.tint = this.flashColor;
    const sh = this.trauma.update(dt);
    this.world.position.set(this.w / 2 + sh.x * this.scale, this.h / 2 + sh.y * this.scale);
    this.world.rotation = sh.rot;
  }

  private updateMotes(dt: number): void {
    this.moteT += dt;
    while (this.moteT > 140) {
      this.moteT -= 140;
      this.motes.spawn({
        tex: dotTexture(),
        x: PED.x + (this.rng.next() - 0.5) * 520,
        y: PED.y + 40 - this.rng.next() * 380,
        vx: (this.rng.next() - 0.5) * 12,
        vy: -8 - this.rng.next() * 16,
        life: 4200,
        scale: [0.25 + this.rng.next() * 0.35, 0.2],
        alpha: [0, 0.35],
        tint: 0xfff0d0,
        add: true,
      });
    }
  }

  private updateDrumAndHammer(dt: number): void {
    // Squash and stretch (damped spring) at the drum's feet.
    this.squashT += dt;
    const sq = this.squashA * Math.exp(-this.squashT / 140) * Math.cos(this.squashT / 55);
    this.drum.body.scale.set(1 + sq * 0.75, 1 - sq);
    if (this.crateSquash > 0) {
      this.crateSquash = Math.max(0, this.crateSquash - dt / 400);
      const c = 0.22 * this.crateSquash * Math.cos((1 - this.crateSquash) * 14);
      this.crate.box.scale.set(1 + c * 0.7, 1 - c);
    }
    this.drumWhite = Math.max(0, this.drumWhite - dt / 220);
    this.drum.setWhite(this.drumWhite);

    // Hammer: fades in, hovers, swings on strikes.
    this.hammerShown += (this.hammerTarget - this.hammerShown) * Math.min(1, dt / 90);
    this.hammer.root.alpha = this.hammerShown;
    this.hammer.root.x = HAMMER.x + 40 * (1 - this.hammerShown);
    if (this.hammerT >= 0) {
      const t = this.hammerT;
      this.hammer.root.rotation =
        t < HAMMER.impactMs
          ? lerp(HAMMER.rest + 0.12, HAMMER.hit, easeInQuad(t / HAMMER.impactMs))
          : lerp(HAMMER.hit, HAMMER.rest, easeOutBack(span(t, HAMMER.impactMs, 520), 1.8));
    } else {
      this.hammer.root.rotation = HAMMER.rest + Math.sin(this.time / 240) * 0.05;
    }

    // Climb wave ring.
    this.waves.clear();
    if (this.waveT >= 0) {
      this.waveT += dt;
      const u = this.waveT / 520;
      if (u >= 1) this.waveT = -1;
      else {
        this.waves.circle(PED.x, PED.y - 130, 70 + 330 * easeOutCubic(u)).stroke({ width: 16 * (1 - u), color: this.waveColor, alpha: 0.9 * (1 - u) });
        this.waves.circle(PED.x, PED.y - 130, 50 + 220 * easeOutCubic(u)).stroke({ width: 6 * (1 - u), color: 0xffffff, alpha: 0.7 * (1 - u) });
      }
    }
  }

  private updatePedestal(dt: number): void {
    if (this.plan.mode === 'wardrobe') return;
    this.pedSink += (this.pedSinkTarget - this.pedSink) * Math.min(1, dt / 220);
    this.pedGroup.y = 170 * easeOutCubic(this.pedSink);
    this.pedGroup.alpha = 1 - 0.55 * this.pedSink;
  }

  private updateRays(dt: number): void {
    this.backRays.rotation += dt / 5200;
    this.backRays.alpha += (this.raysLevel * (this.drum.root.visible ? 1 : 0) - this.backRays.alpha) * Math.min(1, dt / 120);
    this.backRays.scale.set(0.95 + 0.05 * Math.sin(this.time / 600) + this.raysLevel * 0.6);
    this.bigRays.rotation -= dt / 7000;
    const target = this.bigRaysLevel * (1 - 0.7 * this.summaryDim);
    this.bigRays.alpha += (target - this.bigRays.alpha) * Math.min(1, dt / 160);
    if (this.bigRays.scale.x < 1.5) this.bigRays.scale.set(Math.min(1.5, this.bigRays.scale.x + dt / 400));
    if (!this.drum.root.visible) this.halo.alpha *= 1 - Math.min(1, dt / 600);
  }

  private updateCards(dt: number): void {
    if (this.fan) {
      for (const v of this.fan.views) {
        const slot = v.card.slot;
        const want = slot === this.focusSlot ? 1 : 0;
        const cur = this.lift.get(slot) ?? 0;
        const next = cur + (want - cur) * Math.min(1, dt / 70);
        this.lift.set(slot, next);
        v.setLift(next);
        v.setSignal(this.signal.get(slot) ?? 0, this.time);
      }
      // Walkouts own the screen; the summary dims the fan behind its panel.
      const want = this.walkout ? 0.08 : 1 - 0.75 * this.summaryDim;
      this.fanAlpha += (want - this.fanAlpha) * Math.min(1, dt / (this.walkout ? 260 : 200));
      this.fan.root.alpha = this.fanAlpha;
    }
  }

  private updateFlyers(dt: number): void {
    const s = dt / 1000;
    for (let i = this.flyers.length - 1; i >= 0; i--) {
      const f = this.flyers[i];
      if (!f) continue;
      f.life -= dt;
      f.vy += 1500 * s;
      f.c.x += f.vx * s;
      f.c.y += f.vy * s;
      f.c.rotation += f.vr * s;
      f.c.alpha = clamp01(f.life / 500);
      if (f.life <= 0) {
        f.c.destroy({ children: true });
        this.flyers.splice(i, 1);
      }
    }
  }

  destroy(): void {
    this.walkout?.destroy();
    // Flying halves first: they share the drums' drawing contexts.
    for (const f of this.flyers) f.c.destroy({ children: true });
    this.flyers.length = 0;
    for (const m of this.miniDrums) m.drum.destroy();
    this.particles.destroy();
    this.motes.destroy();
    this.fan?.destroy();
    this.drum.destroy();
    this.root.destroy({ children: true });
  }
}
