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
import type { AgeId, ArtProvider, CapsuleTier, I18n } from '@/contracts';
import { mulberry32, type CosmeticRng } from '@/core';
import { CARD_H, CardFan, portraitTexture, type CardView } from './cardFan';
import { BLOW, HAMMER, blowPose, type BlowPose } from './blow';
import { CapsuleDrum, Hammer, Pedestal, Pips, drumState, ornamentScaleFor, type DrumState } from './climb';
import { clamp01, easeInCubic, easeInQuad, easeOutBack, easeOutCubic, hump, lerp, span } from './ease';
import { Particles, Trauma, glowSprite, label } from './fx';
import { AEON_FILIGREE, HOLO_BANDS, RARITY_COLORS, ROOM, TIER_COLORS, TIER_RAMPS, mixColor, shade } from './palette';
import { SHOW_TIMING } from './plan';
import type {
  BurstStep,
  FirstTierStep,
  FlipStep,
  MiniWalkoutStep,
  RarityBurstStep,
  ShowPlan,
  ShowStep,
  StrikeStep,
  SummitRiseStep,
  SummitStrikeStep,
  VolleyStep,
  WalkoutStep,
} from './plan';
import { CrateView } from './crate';
import type { ShowView, StrikeHit, TimedStrike } from './runner';
import type { RevealCard } from './summaryModel';
import { coneTexture, confettiTexture, dotTexture, glowTexture, leafTexture, raysTexture, roomTexture, shaftsTexture, shardTexture, splinterTexture, starTexture, streakTexture } from './textures';
import { burstLevel, resolveBurstFx, type BurstFx, type BurstLevel } from './rarityBurst';
import { crestCount, summitGemCount, tierIndex } from './tiers';
import type { CapsuleCatalog, ProgressLookup, ShowSettings } from './types';
import { Walkout, ageGlyph } from './walkout';

export const DESIGN_W = 1280;
export const DESIGN_H = 720;
/** Where the drum stands (top of the pedestal). */
const PED = { x: 640, y: 470 };
/** Where the Amber counter sits (the DOM overlay's top right), in design space. */
const AMBER_TARGET = { x: 1190, y: 40 };
/** How far the cracks have spread when the charge ends; the four strikes open the rest. */
const CRACKS = { charge: 0.3 } as const;
/**
 * Centre stage: the card being revealed comes forward, large, for its pre-signal and flip, then
 * flies back to its slot in the fan (the others dim meanwhile). Spring constants give a small
 * overshoot on arrival and on the landing back home.
 */
const PRESENT = { x: 640, y: 322, omega: 21, zeta: 0.6, dim: 0.5 } as const;
/** Rarer cards take centre stage a little larger (the payoff grows with the rarity). */
const PRESENT_SCALE: Readonly<Record<RevealCard['rarity'], number>> = { common: 1.6, rare: 1.72, epic: 1.88, legendary: 1.98 };

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

/** An expanding ring (shockwaves, landings, snaps); `squash` flattens it onto the floor. */
interface Ring {
  x: number;
  y: number;
  t: number;
  dur: number;
  r0: number;
  r1: number;
  width: number;
  color: number;
  alpha: number;
  squash: number;
}

/** The hammer meets the drum here (design space). */
const HIT = { x: PED.x + 78, y: PED.y - 138 };
/**
 * The timing cue (A10 step 3): a neutral warm-white ring closes on the hit point over the count-in
 * and meets the target ring on the beat; three beads on the target light with the ticks. Never a
 * tier colour, so it cannot hint at a climb.
 */
const CUE_RING = { r0: 150, r1: 30, color: 0xfff1cf, bead: 0xffd98a } as const;
/**
 * Where "Perfect!" pops: high above the hit, clear of the drum's silhouette and crest (so a grade
 * never sits on top of the result a climb shows) and of the hammer's raised head.
 */
const POP = { x: HIT.x + 110, y: HIT.y - 224 } as const;
/**
 * The graded hit's layers (A10 step 3): hit-stop, a local bloom at the hit point (never a
 * full-screen flash, which is a climb's), a short pulse of crack light that stays below a climb's
 * (+0.35) and fades within 250 ms, punch, sparks, haptics. Feel only.
 */
const GRADE_FX = {
  perfect: { hitstop: 110, bloom: 0.85, punch: 0.05, trauma: 0.22, sparks: 30, stars: 14, shards: 8, leakPulse: 0.25, vibrate: [30, 20, 45] as number[] },
  good: { hitstop: 60, bloom: 0.55, punch: 0.022, trauma: 0.08, sparks: 12, stars: 5, shards: 3, leakPulse: 0.12, vibrate: [18] as number[] },
} as const;
/** How long a grade's crack light takes to fade out once the hit-stop lets go. */
const GRADE_LEAK_MS = 250;
/** The neutral tap tick on the timing ring (any tap on a blow, no text, no penalty). */
const TAP_TICK_MS = 160;

/** A timed blow in progress (the hammer's pose is a pure function of its time, `blow.ts`). */
interface Blow extends BlowPose {
  id: string;
  index: number;
  t: number;
  landed: boolean;
  /** The grade given so far (before the hit it dresses the hit, after it adds a flourish). */
  hit: StrikeHit | null;
}

/** A "Perfect!" or "Good!" pop over the hit. */
interface Pop {
  c: Container;
  t: number;
  big: boolean;
}
/** Centre of the drum body. */
const CORE = { x: PED.x, y: PED.y - 125 };
/** The eight ages, for the Aeon glyph halo when the catalog has no age list. */
const DEFAULT_AGES: readonly AgeId[] = ['stone', 'bronze', 'medieval', 'gunpowder', 'industrial', 'modern', 'future', 'cosmic'];
/** The Aeon glyph halo appears within this long, whatever the number of ages (A10 step 4). */
const HALO_MS = 900;
/** Top-tier staging (A10 step 4): camera push per staging level (none, Gold, Platinum, Aeon). */
const STAGE_PUSH = [0, 0.02, 0.04, 0.08] as const;
/** The room's dim per staging level: Platinum to 60%, Aeon to 35%. */
const STAGE_DIM = [0, 0, 0.4, 0.65] as const;
const AEON_TILT = (1.5 * Math.PI) / 180;
const AEON_LIFT = 12;

/** A drum changing tier: the new material wipes down while a crest stamps (A10 steps 3 and 3b). */
interface Morph {
  to: DrumState;
  wipeMs: number;
  t: number;
  crest: boolean;
  crestDelay: number;
  crestMs: number;
  crestHit: boolean;
}

interface FieldStar {
  x: number;
  y: number;
  r: number;
  d: number;
  vx: number;
  vy: number;
  phase: number;
  tint: number;
}

/**
 * Staging level of a tier (A10 step 4): 0 as built (Clay to Jade), 1 for the first Legendary tier
 * (Gold), then one more per summit gem (Platinum 2, Aeon 3). Read from the crest and summit counts,
 * never from a tier name.
 */
export function stagingLevel(tier: CapsuleTier): number {
  return crestCount(tier) === 0 ? 0 : 1 + summitGemCount(tier);
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
  /** Darkens the room behind the stage for big moments (burst build of Jade and Aeon, Epic and Legendary signals). */
  private readonly dimG = new Graphics();
  private dimA = 0;
  private dimTarget = 0;
  /** The room tints towards this colour while `bgTintK` > 0. */
  private bgTintColor = 0xffffff;
  private bgTintK = 0;
  private bgTintTarget = 0;
  private readonly rings: Ring[] = [];
  private readonly ringG = new Graphics();
  /** Zoom punch (fraction of scale), decays fast. */
  private punch = 0;
  /** Freeze frame: particles, flyers and the shake hold still. */
  private hitstop = 0;
  /** Slow motion for effects (the walkout drop). */
  private slowmo = 0;
  /** Drum kick from a strike: rotation spring. */
  private kickT = 1e6;
  private kickA = 0;
  /** The drum swells during the burst build. */
  private swell = 0;
  private emberT = 0;
  private emberSpawnT = 0;
  private embersOn = false;
  private strikesDone = 0;
  /** The pedestal dips under the landing drum, 1 → 0. */
  private pedKick = 0;
  private confettiLeft = 0;
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
  /** Centre-stage spring per slot: k 0 (home) .. 1 (presented), its velocity, and whether it left home. */
  private readonly present = new Map<number, { k: number; v: number; away: boolean; peak: number }>();
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
  // Top-tier staging (A10 step 4).
  private readonly lite: boolean;
  private readonly godRays: Sprite;
  private godRaysLevel = 0;
  private readonly coldCone: Sprite;
  private coldLevel = 0;
  private readonly starfield = new Container();
  private readonly starG = new Graphics();
  private readonly nebula: Sprite[] = [];
  private readonly fieldStars: FieldStar[] = [];
  private starK = 0;
  private starKTarget = 0;
  private starSpread = 0;
  private readonly glyphHalo = new Container();
  private glyphs: { c: Container; x: number; y: number; at: number }[] = [];
  private glyphBurstT = -1;
  private readonly frostG = new Graphics();
  private frostT = -1;
  private camPush = 0;
  private camPushTarget = 0;
  private camTilt = 0;
  private camTiltTarget = 0;
  private drumLift = 0;
  private drumLiftTarget = 0;
  private morph: Morph | null = null;
  private lastFlashAt = -1e9;
  private heat = 0;
  private heatTarget = 0;
  private hammerRaise = 0;
  private hammerRaiseTarget = 0;
  /** The timed blow being played (A10 steps 3 and 3b); null between blows. */
  private blow: Blow | null = null;
  /** The closing timing ring and its beads. */
  private readonly cueG = new Graphics();
  /** The swing's motion smear. */
  private readonly smearG = new Graphics();
  /** The glint on the hammer head on the last count-in tick. */
  private readonly glint: Sprite;
  /** The graded hit's star burst and glow at the hit point. */
  private readonly impactStar: Sprite;
  private readonly impactGlow: Sprite;
  private impactT = -1;
  private impactBig = false;
  private impactBloom = 0;
  /** The neutral tap tick on the timing ring, 1 → 0. */
  private tapTick = 0;
  private readonly popLayer = new Container();
  private readonly pops: Pop[] = [];
  /** Per pip: a tick or a climb pops it, then it springs back. */
  private readonly pipPop = [0, 0, 0, 0];
  /** The target ring's beat pulse, 1 → 0. */
  private cuePulse = 0;
  private heatSparkT = 0;
  private glintT = 0;
  /**
   * The rarity burst's light (owner request 2026-10-07): a soft glow behind the card, a white core and
   * a star flare over it. They run on real time, so they flare at once and hold through the hit-stop.
   */
  private readonly burstGlow: Sprite;
  private readonly burstCore: Sprite;
  private readonly burstStar: Sprite;
  private burstT = -1;
  private burstFxNow: BurstFx | null = null;
  private burstAt = { x: 0, y: 0 };
  /** Epic bolts crackle round the card for a moment after its pop. */
  private boltsUntil = -1;

  constructor(
    readonly plan: ShowPlan,
    private readonly d: StageDeps,
  ) {
    const rm = d.settings.reduceMotion;
    this.rng = mulberry32(d.seed);
    this.lite = d.settings.lite === true;
    this.trauma = new Trauma(d.seed ^ 0x5eed, rm ? 0 : 1);
    this.particles = new Particles(rm ? 300 : this.lite ? 350 : 700);
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

    // Gold: faint sunlight shafts from above. Platinum: a cold top spotlight.
    this.godRays = new Sprite(shaftsTexture());
    this.godRays.anchor.set(0.5, 0);
    this.godRays.position.set(PED.x, -60);
    this.godRays.width = 980;
    this.godRays.height = PED.y + 120;
    this.godRays.blendMode = 'add';
    this.godRays.tint = 0xfff1cf;
    this.godRays.alpha = 0;
    this.coldCone = new Sprite(coneTexture());
    this.coldCone.anchor.set(0.5, 0);
    this.coldCone.position.set(PED.x, -80);
    this.coldCone.width = 620;
    this.coldCone.height = PED.y + 150;
    this.coldCone.blendMode = 'add';
    this.coldCone.tint = 0xc8fff4;
    this.coldCone.alpha = 0;
    // Aeon: the starfield that spills out behind the drum, with an indigo nebula.
    for (const [tint, w, h, dx, dy] of [
      [TIER_RAMPS.aeon.mid, 1300, 760, -120, 20],
      [TIER_RAMPS.aeon.key, 900, 560, 160, -40],
      [TIER_RAMPS.aeon.highlight, 420, 420, 0, -10],
    ] as const) {
      const n = glowSprite(glowTexture(), tint, 100, 0);
      n.width = w;
      n.height = h;
      n.position.set(CORE.x + dx, CORE.y + dy);
      this.nebula.push(n);
      this.starfield.addChild(n);
    }
    this.starfield.addChild(this.starG);
    this.starG.blendMode = 'add';
    this.starfield.visible = false;
    {
      const r = mulberry32(d.seed ^ 0x5a4f);
      const count = this.lite ? 70 : 140;
      const tints = [0xffffff, TIER_RAMPS.aeon.highlight, AEON_FILIGREE, 0xdcd6ff];
      for (let i = 0; i < count; i++) {
        const a = r.next() * Math.PI * 2;
        const d = Math.sqrt(r.next());
        this.fieldStars.push({
          x: CORE.x + Math.cos(a) * d * 660,
          y: CORE.y + Math.sin(a) * d * 380,
          r: 0.8 + r.next() * r.next() * 2.8,
          d,
          vx: (r.next() - 0.5) * 10,
          vy: -3 - r.next() * 8,
          phase: r.next() * 6.28,
          tint: tints[i % tints.length] ?? 0xffffff,
        });
      }
    }
    this.glyphHalo.position.set(CORE.x, CORE.y - 6);
    this.frostG.blendMode = 'add';
    this.cueG.blendMode = 'add';
    this.smearG.blendMode = 'add';
    this.glint = glowSprite(starTexture(), 0xffffff, 90, 0);
    this.impactStar = glowSprite(starTexture(), 0xffffff, 260, 0);
    this.impactStar.position.set(HIT.x - 6, HIT.y);
    this.impactGlow = glowSprite(glowTexture(), 0xffffff, 200, 0);
    this.impactGlow.position.set(HIT.x - 20, HIT.y);
    this.burstGlow = glowSprite(glowTexture(), 0xffffff, 100, 0);
    this.burstCore = glowSprite(glowTexture(), 0xffffff, 100, 0);
    this.burstStar = glowSprite(starTexture(), 0xffffff, 100, 0);

    this.shadow.ellipse(0, 0, 100, 16).fill({ color: 0x000000, alpha: 0.45 });
    this.shadow.position.set(PED.x, PED.y + 4);
    this.shadow.alpha = 0;

    this.drum = new CapsuleDrum(d.seed, { lite: this.lite });
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
    this.ringG.blendMode = 'add';
    this.crate.root.position.set(PED.x, PED.y);
    this.crate.root.visible = false;
    this.pedGroup.visible = plan.mode !== 'openAll';

    this.pedGroup.addChild(this.shadow, this.pedestal.root, this.frostG, this.pips.root, this.crate.root, this.drum.root);
    const usesFan = plan.steps.some((s) => s.kind === 'fan' || (s.kind === 'flip' && plan.mode === 'wardrobe'));
    this.fan = usesFan ? new CardFan(plan.cards, this.cardDeps(), { x: PED.x, y: PED.y - 120 }) : null;
    // The crate's one skin card rises high above the open crate, larger than a fan card.
    const crateCard = plan.mode === 'wardrobe' ? this.fan?.views[0] : undefined;
    if (crateCard) crateCard.home = { x: PED.x, y: 262, rot: 0, scale: 1.6 };

    this.world.pivot.set(DESIGN_W / 2, DESIGN_H / 2);
    this.world.addChild(
      this.cone,
      this.coldCone,
      this.godRays,
      this.starfield,
      this.motes.root,
      this.backRays,
      this.bigRays,
      this.halo,
      this.glyphHalo,
      this.pedGroup,
      this.smearG,
      this.hammer.root,
      this.impactGlow,
      this.glint,
      this.waves,
      this.ringG,
      this.cueG,
      this.impactStar,
      this.burstGlow,
      ...(this.fan ? [this.fan.root] : []),
      this.burstCore,
      this.burstStar,
      this.flightLayer,
      this.walkoutLayer,
      this.particles.root,
      this.popLayer,
    );
    this.dimG.alpha = 0;
    this.root.addChild(this.bg, this.dimG, this.world, this.flashG);
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
    // Crests and summit gems stay legible on a phone stage (a crest shield of at least 15 CSS px).
    this.drum.setOrnamentScale(ornamentScaleFor(this.scale));
    this.world.position.set(this.w / 2, this.h / 2);
    this.bg.width = this.w;
    this.bg.height = this.h;
    this.flashG.clear().rect(0, 0, this.w, this.h).fill(0xffffff);
    this.flashG.alpha = this.flashAlpha;
    this.dimG.clear().rect(0, 0, this.w, this.h).fill(0x05040a);
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
        if (!instant) this.beginBlow(step);
        break;
      case 'summitRise':
        // The same beat as a burst build after strike 4 (A10 step 3b): the hammer stays, heats neutral
        // white and rises; a clear gem grinds up out of the cap.
        this.hammerTarget = 1;
        this.hammerRaiseTarget = 1;
        this.heatTarget = 1;
        if (!instant) this.drum.beginGemRise(this.d.settings.reduceMotion);
        // The capsule calms for a beat: the light draws back into the cracks while the gem rises.
        this.drum.setLeak(0.35);
        this.dimTarget = Math.max(this.dimTarget, 0.2);
        break;
      case 'summitStrike':
        this.hammerTarget = 1;
        this.hammerRaiseTarget = 1;
        this.heatTarget = 1;
        if (!instant) this.beginBlow(step);
        break;
      case 'burst':
        this.enterBurst(step, instant);
        break;
      case 'firstTier':
        this.bigRaysLevel = Math.max(this.bigRaysLevel, 0.45);
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
        if (step.kind === 'signal' && !instant) this.signalMood(step.card.rarity, 1);
        break;
      case 'rarityBurst':
        this.focusSlot = step.card.slot;
        this.signal.set(step.card.slot, 1);
        if (this.plan.mode === 'wardrobe') this.riseFromCrate(1);
        if (!instant) this.signalMood(step.card.rarity, 1);
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
        this.burstT = -1;
        this.burstGlow.alpha = this.burstCore.alpha = this.burstStar.alpha = 0;
        this.confettiOn = false;
        this.embersOn = false;
        this.dimTarget = 0;
        this.bgTintTarget = 0;
        // The Aeon starfield stays behind the cards until the summary (A10 step 4).
        this.starKTarget = 0;
        this.coldLevel = 0;
        this.godRaysLevel = 0;
        break;
    }
  }

  /** Epic and Legendary pre-signals darken the room and tint it in the rarity colour (honest: the card's glow already shows it). */
  private signalMood(r: RevealCard['rarity'], on: number): void {
    const k = r === 'legendary' ? 1 : r === 'epic' ? 0.7 : r === 'rare' ? 0.25 : 0;
    this.dimTarget = 0.5 * k * on;
    this.bgTintColor = RARITY_COLORS[r];
    this.bgTintTarget = k * on;
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
      case 'summitRise':
        this.summitRise(step, t);
        break;
      case 'summitStrike':
        this.summitStrike(step, t);
        break;
      case 'burst':
        this.burst(step, t, dt);
        break;
      case 'firstTier':
        this.firstTierFx(step, t);
        break;
      case 'volley':
        this.volley(step, t);
        break;
      case 'fan':
        this.dealCards(t / step.durationMs, dt);
        break;
      case 'signal':
        this.preSignal(step.card, t / step.durationMs, dt);
        break;
      case 'rarityBurst':
        this.rarityBurst(step, t, dt);
        break;
      case 'flip':
        this.flip(step, t);
        break;
      case 'walkout':
      case 'miniWalkout':
        this.walkout?.update(t, dt);
        break;
      case 'duplicates': {
        const v = this.fan?.view(step.card.slot);
        const u = t / step.durationMs;
        v?.setBar(u, step.progress, (k, o) => this.d.i18n.t(k, o));
        const p = step.progress;
        if (v && p && p.need !== null && p.after >= p.need && p.before < p.need && u >= 0.8 && this.fire(`ready-${step.card.key}`)) {
          // UPGRADE READY pops with a green burst.
          const y = v.root.y + (CARD_H / 2) * v.home.scale;
          this.ring(v.root.x, y, 10, 120, ROOM.ready, 8, 380, 0.5);
          this.sparkBurst(v.root.x, y, ROOM.ready, this.d.settings.reduceMotion ? 6 : 18, 280);
          v.pop(0.12);
        }
        break;
      }
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
        this.drum.setCracks(CRACKS.charge);
        this.drum.setLeak(0.15);
        this.pips.root.alpha = 1;
        break;
      case 'strike':
        this.settleStrike(step);
        break;
      case 'summitRise':
        this.settleRise(step);
        break;
      case 'summitStrike':
        this.settleSummit(step);
        break;
      case 'firstTier':
        break;
      case 'burst':
        this.fire('burst-pop');
        this.fire('burst');
        this.settleMorph();
        this.drumLiftTarget = 0;
        this.camPushTarget = 0;
        this.camTiltTarget = 0;
        this.heatTarget = 0;
        this.hammerRaiseTarget = 0;
        this.drum.root.visible = false;
        this.hammerTarget = 0;
        this.swell = 0;
        this.pedestal.setGlow(0.4);
        this.dimTarget = 0;
        break;
      case 'volley':
        // Hidden, not destroyed: their halves may still be flying and share the drawing context.
        for (const m of this.miniDrums) m.drum.root.visible = false;
        break;
      case 'fan':
        this.fan?.settleDealt();
        break;
      case 'signal': {
        this.signal.set(step.card.slot, 1);
        if (this.plan.mode === 'wardrobe') this.riseFromCrate(1);
        const v = this.fan?.view(step.card.slot);
        if (v) v.wobble = 0;
        break;
      }
      case 'rarityBurst': {
        // Cut short or done: the pop and the slam never replay; the card rests in place, its back still lit.
        this.fire(`rb-pop-${step.card.key}`);
        this.fire(`rb-slam-${step.card.key}`);
        this.signal.set(step.card.slot, 1);
        const v = this.fan?.view(step.card.slot);
        if (v) {
          v.wobble = 0;
          v.setBurstShape(1, 1);
          v.setLeak(this.burstFxFor(step.level).leak * 0.4);
          v.drawBolts(false, 0);
        }
        this.boltsUntil = -1;
        break;
      }
      case 'flip':
        this.fire(`flipped-${step.card.key}`);
        this.fire(`stamp-${step.card.key}`);
        this.fan?.view(step.card.slot)?.settleFaceUp();
        this.signal.set(step.card.slot, 0);
        this.focusSlot = -1;
        this.bigRaysLevel = Math.min(this.bigRaysLevel, 0.35);
        this.signalMood(step.card.rarity, 0);
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

  /**
   * A tap on a hammer blow was graded (A10 step 3). Before the hit it dresses the coming hit (a
   * longer hit-stop, more light); after it the flourish plays at once. Feel only: nothing here
   * changes the tier, the climb or what the drum shows.
   */
  strikeHit(step: TimedStrike, hit: StrikeHit): void {
    const b = this.blow;
    if (!b || b.id !== step.id) return;
    b.hit = hit;
    if (hit.grade === 'miss') return;
    const pin = hit.grade === 'perfect' ? BLOW.pinMs.perfect : BLOW.pinMs.good;
    if (!b.landed) {
      b.pinMs = Math.max(b.pinMs, pin);
      return;
    }
    // A tap just after the hit: a hammer still on the drum stays down through the flourish that
    // starts now (one already bouncing back is never pulled down again).
    if (b.t < b.impactMs + b.pinMs) b.pinMs = Math.min(BLOW.pinMs.max, Math.max(b.pinMs, Math.round(b.t - b.impactMs) + GRADE_FX[hit.grade].hitstop));
    this.gradeFx(step, hit);
  }

  /**
   * Any tap on a hammer blow: a neutral tick on the timing ring (no text, no penalty, the same for
   * an early, a late and a graded tap), so the player can see where the tap fell against the ring.
   */
  strikeTap(step: TimedStrike): void {
    if (this.blow?.id !== step.id) return;
    this.tapTick = 1;
  }

  // ---------------------------------------------------------------------------------------------
  // The climb (A10 steps 1-4)
  // ---------------------------------------------------------------------------------------------

  private placeDrum(t: number): void {
    const fall = span(t, 0, 220);
    this.drum.root.y = PED.y - 560 * (1 - easeInQuad(fall));
    // Stretched along the fall, square again on touch-down (the squash spring takes over).
    const st = fall < 1 && !this.d.settings.reduceMotion ? 0.18 * fall : 0;
    this.drum.root.scale.set(1 - st * 0.5, 1 + st);
    this.shadow.scale.set(lerp(0.3, 1, fall));
    this.shadow.alpha = fall;
  }

  private arrival(t: number): void {
    this.placeDrum(t);
    this.pedestal.setGlow(span(t, 180, 500));
    this.halo.alpha = 0.25 * span(t, 180, 500);
    if (t >= 220 && this.fire('arrival-impact')) {
      // A heavy, physical landing: squash, shake, a punch, a dust cloud and stone chips.
      this.squash(0.36);
      this.trauma.add(0.42);
      this.addPunch(0.035);
      this.hitstop = Math.max(this.hitstop, 50);
      this.vibrate(35);
      this.dustRing(PED.x, PED.y, 40);
      this.dustCloud(PED.x, PED.y - 4, 12);
      this.ring(PED.x, PED.y + 2, 60, 330, ROOM.dust, 10, 520, 0.28, 0.6);
      this.chips(PED.x, PED.y - 6, ROOM.stoneLight, this.d.settings.reduceMotion ? 4 : 12);
      this.pedKick = 1;
    }
  }

  private charge(u: number, t: number, dt: number): void {
    const k = this.d.settings.reduceMotion ? 0.3 : 1;
    this.drum.body.x = Math.sin(t * 0.09) * (0.8 + 4.5 * u) * k;
    this.drum.body.rotation = Math.sin(t * 0.071) * 0.018 * u * k;
    // The first hairline cracks; every strike opens them further.
    this.drum.setCracks(u * CRACKS.charge);
    this.drum.setLeak(0.15 * u);
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
    this.countIn(s, t);
    if (t >= s.impactMs && this.fire(`strike-${s.index}`)) {
      if (this.blow?.id === s.id) this.blow.landed = true;
      this.strikeImpact(s);
      if (s.climb) this.climbImpact(s);
      else this.missImpact(s);
      const hit = this.blow?.id === s.id ? this.blow.hit : null;
      if (hit && hit.grade !== 'miss') this.gradeFx(s, hit);
    }
  }

  /** A timed blow starts: the hammer takes it from wherever it is (the charge's hover or the last rebound). */
  private beginBlow(s: TimedStrike): void {
    const next = this.plan.steps[this.plan.steps.indexOf(s) + 1];
    this.blow = {
      id: s.id,
      index: s.index,
      kind: s.kind,
      impactMs: s.impactMs,
      durationMs: s.durationMs,
      from: { a: this.hammer.root.rotation, lift: HAMMER.y - this.hammer.root.y },
      pinMs: s.kind === 'summitStrike' ? SHOW_TIMING.summitHoldMs : s.climb ? BLOW.pinMs.climb : BLOW.pinMs.none,
      last: next?.kind !== 'strike',
      holdMs: SHOW_TIMING.summitHoldMs,
      t: 0,
      landed: false,
      hit: null,
    };
  }

  /**
   * The count-in (A10 step 3): each tick notches the hammer up (its pose, `blow.ts`), lights a bead
   * on the target ring, pulses it and the strike's pip; the last tick glints on the hammer head.
   * The same for every strike, climb or not.
   */
  private countIn(s: TimedStrike, t: number): void {
    const b = this.blow;
    if (b?.id === s.id) b.t = t;
    for (let k = 0; k < SHOW_TIMING.strikeTicks; k++) {
      if (t < k * SHOW_TIMING.strikeBeatMs || !this.fire(`tick-${s.id}-${k}`)) continue;
      this.cuePulse = 1;
      if (s.kind === 'strike') this.pipPop[s.index] = 0.35 + 0.1 * k;
      const [bx, by] = this.beadPos(k);
      this.sparkBurst(bx, by, CUE_RING.bead, this.d.settings.reduceMotion ? 1 : 3, 90);
    }
  }

  /** The k-th bead on the target ring (top, then clockwise). */
  private beadPos(k: number): [number, number] {
    const a = -Math.PI / 2 + (k * Math.PI * 2) / 3;
    return [HIT.x - 6 + Math.cos(a) * CUE_RING.r1, HIT.y + Math.sin(a) * CUE_RING.r1];
  }

  /**
   * The graded hit's flourish (A10 step 3), on top of the strike's own impact: hit-stop, a local
   * bloom and a short pulse of crack light in the colour the drum already shows, rings at the hit
   * point, sparks and debris, a camera punch, a haptic pulse and a "Perfect!" pop high above the
   * drum; a Good gets a lighter version, a miss nothing. The same size on a climb and a non-climb,
   * and it borrows none of a climb's signals (no screen flash, no pip pop, no lasting crack light,
   * no back rays), so the grade never reads as a result, and never as a near miss.
   */
  private gradeFx(s: TimedStrike, hit: StrikeHit): void {
    if (hit.grade === 'miss' || !this.fire(`grade-${s.id}`)) return;
    const perfect = hit.grade === 'perfect';
    const G = GRADE_FX[hit.grade];
    const rm = this.d.settings.reduceMotion;
    // Summit strikes are white-hot at the hit (their colour comes after the hold).
    const c = s.kind === 'summitStrike' ? 0xfff6e8 : TIER_COLORS[this.tier];
    const combo = perfect ? hit.combo : 0;
    this.hitstop = Math.max(this.hitstop, G.hitstop);
    // Reduce motion: no shake and no punch; the bloom (dimmer), the pop, the crack light and the
    // sound stay. There is no screen flash at all: that is a climb's signal.
    this.addPunch(G.punch + 0.006 * Math.min(4, combo));
    this.trauma.add(G.trauma);
    this.vibrate(G.vibrate);
    // A short pulse of light from the cracks that fades within 250 ms, below a climb's own +0.35:
    // the capsule never looks more charged for a good tap.
    if (s.kind === 'strike') this.drum.pulseLeak(G.leakPulse, GRADE_LEAK_MS);
    this.impactT = 0;
    this.impactBig = perfect;
    this.impactBloom = G.bloom + 0.03 * Math.min(3, combo);
    this.impactStar.tint = perfect ? 0xffffff : 0xfff1cf;
    this.impactGlow.tint = mixColor(0xffffff, c, 0.5);
    // Two rings at the hit point (a white core and one in the drum's colour), inside the hit area,
    // never around the whole drum.
    this.ring(HIT.x - 6, HIT.y, 14, perfect ? 96 : 68, 0xffffff, perfect ? 10 : 6, perfect ? 260 : 210, 1);
    this.ring(HIT.x - 6, HIT.y, 22, perfect ? 124 : 86, c, perfect ? 12 : 7, perfect ? 360 : 280, 0.85);
    const k = rm ? 0.35 : this.lite ? 0.6 : 1;
    for (let i = 0; i < Math.round(G.sparks * k); i++) {
      const a = -Math.PI * 0.1 + (this.rng.next() - 0.5) * 2.6;
      const sp = (perfect ? 620 : 460) + this.rng.next() * (perfect ? 700 : 420);
      this.particles.spawn({
        tex: streakTexture(),
        x: HIT.x,
        y: HIT.y + (this.rng.next() - 0.5) * 24,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 160,
        life: 300 + this.rng.next() * 320,
        drag: 0.05,
        gravity: 1500,
        scale: [0.7 + this.rng.next() * 0.6, 0.1],
        alpha: [1, 0],
        tint: i % 3 === 0 ? 0xffffff : 0xffe7a8,
        add: true,
        align: true,
      });
    }
    this.sparkBurst(HIT.x, HIT.y, c, Math.round(G.stars * k), perfect ? 420 : 300);
    // Chips of the shell (its own material) knocked off the rim.
    for (let i = 0; i < Math.round(G.shards * k); i++) {
      this.particles.spawn({
        tex: shardTexture(),
        x: HIT.x - 10,
        y: HIT.y + (this.rng.next() - 0.5) * 40,
        vx: 80 + this.rng.next() * 320,
        vy: -200 - this.rng.next() * 260,
        life: 800,
        gravity: 1500,
        scale: [0.35 + this.rng.next() * 0.35, 0.3],
        alpha: [1, 0.7],
        rot: this.rng.next() * 6,
        vr: (this.rng.next() - 0.5) * 20,
        tint: shade(s.kind === 'summitStrike' ? TIER_COLORS[s.from] : c, -0.15),
      });
    }
    // The combo flourish: a ring of stars thrown out evenly from the hit point (more for a longer
    // run), released as the hit-stop lets go. The back rays stay the climb's: no flare here.
    if (combo >= 2) {
      const n = Math.min(12, 3 * combo) * (rm ? 0.5 : 1);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + this.rng.next() * 0.2;
        const r0 = 30;
        this.particles.spawn({ tex: starTexture(), x: HIT.x - 6 + Math.cos(a) * r0, y: HIT.y + Math.sin(a) * r0, vx: Math.cos(a) * 260, vy: Math.sin(a) * 260, life: 460, drag: 0.03, gravity: 0, scale: [0.9, 0], alpha: [1, 0], rot: a, vr: 6, tint: i % 2 ? 0xffffff : 0xffe7a8, add: true, delay: 40 });
      }
    }
    this.popText(perfect, combo);
  }

  /** "Perfect!" (with "×N" in a run) or "Good!" pops over the hit, then floats up and fades. */
  private popText(perfect: boolean, combo: number): void {
    const t = (k: string, o?: Record<string, string | number>) => this.d.i18n.t(k, o);
    const c = new Container();
    const main = label(t(perfect ? 'capsule.strike.perfect' : 'capsule.strike.good'), perfect ? 46 : 32, perfect ? 0xfff4d6 : 0xeef3ff, {
      outline: perfect ? 7 : 5,
      outlineColor: perfect ? 0x7a3e0e : 0x2a3350,
    });
    if (perfect) {
      const glow = glowSprite(glowTexture(), 0xffd98a, 230, 0.55);
      glow.height = 120;
      c.addChild(glow);
    }
    c.addChild(main);
    if (combo >= 2) {
      const x = label(t('capsule.strike.combo', { n: combo }), 36, 0xffe7a8, { outline: 6, outlineColor: 0x7a3e0e });
      x.position.set(0, 44);
      c.addChild(x);
    }
    c.position.set(POP.x, POP.y);
    c.rotation = perfect ? -0.06 : -0.03;
    c.scale.set(this.d.settings.reduceMotion ? 1 : 0.2);
    c.alpha = this.d.settings.reduceMotion ? 0 : 1;
    // One pop at a time: the last one leaves at once.
    for (const p of this.pops) p.t = Math.max(p.t, 900);
    this.pops.push({ c, t: 0, big: perfect });
    this.popLayer.addChild(c);
  }

  /**
   * The drum shows `tier` (A10): at once (`set`, also every skip and settle), or with the new
   * material wiping down from the top while the tier's crest stamps (`morph`, a climb).
   */
  private setShownTier(tier: CapsuleTier, mode: 'set' | 'morph' = 'set', wipeMs = 200): void {
    const c = TIER_COLORS[tier];
    this.tier = tier;
    if (mode === 'morph') this.startMorph(drumState(tier), wipeMs);
    else {
      this.settleMorph();
      this.drum.setTier(tier);
    }
    this.pedestal.setColor(c);
    this.halo.tint = c;
    this.backRays.tint = c;
    this.bigRays.tint = c;
    this.raysLevel = 0.25 + 0.14 * tierIndex(tier);
  }

  /** Cracks and light after `n` strikes (every strike cracks the capsule further, climb or not). */
  private crackAfter(n: number): { cracks: number; leak: number } {
    return { cracks: CRACKS.charge + ((1 - CRACKS.charge) * n) / 4, leak: 0.2 + 0.2 * n };
  }

  /** What every strike does: the hammer bites, the drum kicks, cracks spread and more light pours out. */
  private strikeImpact(s: StrikeStep): void {
    const n = s.index + 1;
    this.strikesDone = n;
    const after = this.crackAfter(n);
    this.drum.setCracks(after.cracks);
    this.drum.setLeak(after.leak + (s.climb ? 0.35 : 0));
    this.kickT = 0;
    this.kickA = this.d.settings.reduceMotion ? 0.02 : 0.05 + 0.012 * n;
    this.hitstop = Math.max(this.hitstop, s.climb ? 70 : 45);
    this.addPunch(0.01 + 0.006 * n + (s.climb ? 0.015 : 0));
    // Sparks fly off the hammer head: warm white (no tier colour, so a non-climb never teases one).
    const count = this.d.settings.reduceMotion ? 5 : 10 + 3 * n;
    for (let i = 0; i < count; i++) {
      const a = -Math.PI * 0.15 + (this.rng.next() - 0.5) * 1.9;
      const sp = 380 + this.rng.next() * 520;
      this.particles.spawn({
        tex: streakTexture(),
        x: HIT.x,
        y: HIT.y + (this.rng.next() - 0.5) * 30,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 120,
        life: 260 + this.rng.next() * 260,
        drag: 0.05,
        gravity: 1400,
        scale: [0.55 + this.rng.next() * 0.4, 0.1],
        alpha: [1, 0],
        tint: i % 3 === 0 ? 0xffffff : 0xffd98a,
        add: true,
        align: true,
      });
    }
    // Crumbs of the shell drop from the new cracks.
    for (const [x, y] of this.drum.crackTips().slice(0, this.d.settings.reduceMotion ? 1 : 2 + n)) {
      this.particles.spawn({
        tex: shardTexture(),
        x: PED.x + x,
        y: PED.y + y,
        vx: (x > 0 ? 1 : -1) * (40 + this.rng.next() * 120),
        vy: -80 - this.rng.next() * 140,
        life: 700,
        gravity: 1300,
        scale: [0.35 + this.rng.next() * 0.3, 0.3],
        alpha: [1, 0.6],
        rot: this.rng.next() * 6,
        vr: (this.rng.next() - 0.5) * 16,
        tint: shade(TIER_COLORS[this.tier], -0.2),
      });
    }
    this.ring(HIT.x - 6, HIT.y, 8, 70 + 10 * n, 0xffffff, 6, 220, 0.8);
  }

  private climbImpact(s: StrikeStep): void {
    const c = TIER_COLORS[s.to];
    this.setShownTier(s.to, 'morph', 200);
    this.whiteOut(1);
    this.drum.energy = 1.2;
    this.halo.alpha = 0.55 + 0.1 * tierIndex(s.to);
    this.pips.set(s.index, s.to);
    this.pipPop[s.index] = 0.7;
    this.squash(0.22);
    this.trauma.add(0.25);
    this.flash(0.32, shade(c, 0.6));
    this.waveT = 0;
    this.waveColor = c;
    this.ring(CORE.x, CORE.y, 60, 420, c, 14, 560, 0.9);
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
    this.squash(0.12 + 0.02 * s.index);
    this.trauma.add(0.1 + 0.04 * s.index);
    const n = this.d.settings.reduceMotion ? 5 : 14;
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
    this.endBlow(s.id);
    this.pips.set(s.index, s.climb ? s.to : 'miss');
    if (s.climb) this.setShownTier(s.to);
    const after = this.crackAfter(s.index + 1);
    this.strikesDone = s.index + 1;
    this.drum.setCracks(after.cracks);
    this.drum.setLeak(after.leak);
  }

  /** The blow is over (or skipped): the hammer holds its end pose and the cue ring clears. */
  private endBlow(id: string): void {
    const b = this.blow;
    if (!b || b.id !== id) return;
    const end = blowPose(b, b.durationMs);
    this.hammer.root.rotation = end.a;
    this.hammer.root.y = HAMMER.y - end.lift;
    this.blow = null;
  }

  private enterBurst(s: BurstStep, instant: boolean): void {
    if (this.tier !== s.tier || s.fixed || this.morph) this.setShownTier(s.tier);
    this.bigRaysLevel = 0.4;
    this.hammerTarget = 0;
    this.hammerRaiseTarget = 0;
    this.heatTarget = 0;
    this.blow = null;
    if (s.fixed) {
      // Fixed-tier capsules start here (A6.4): the drum is simply there, already cracked.
      this.drum.root.visible = true;
      this.pedestal.setGlow(1);
      this.placeDrum(1e6);
      this.drum.setCracks(0.7);
      this.drum.setLeak(0.6);
    }
    if (instant) {
      this.drum.root.visible = false;
      this.fire('burst-pop');
      this.fire('burst');
    }
  }

  /**
   * The burst (A10 step 4) in three beats: the build (the drum swells, rattles harder and harder and
   * pours light from every crack while motes are sucked in; longer for higher tiers), a freeze frame
   * with the drum held white, and the explosion.
   */
  private burst(s: BurstStep, t: number, dt: number): void {
    const B = s.buildMs;
    const hold = SHOW_TIMING.burstHoldMs;
    const idx = tierIndex(s.tier);
    const rm = this.d.settings.reduceMotion;
    if (t < B) {
      const u = t / B;
      const k = rm ? 0.25 : 1;
      this.drum.body.x = Math.sin(t * 0.13) * (2 + 12 * u * u) * k;
      this.drum.body.rotation = Math.sin(t * 0.097) * 0.045 * u * u * k;
      this.swell = 0.1 * u * u;
      // The build's white glow is a ramp, not a flash; reduce motion keeps it at 20% or less (A10).
      this.drumWhite = Math.max(this.drumWhite, Math.min(rm ? 0.2 : 1, 0.55 * u * u * u));
      // Staged tiers hold their light in at first, so the new material shows under its staging.
      this.drum.setLeak(stagingLevel(s.tier) > 0 ? 0.35 + 1.65 * u * u : 1 + u);
      this.drum.energy = 1 + u;
      this.raysLevel = 0.4 + 0.5 * u;
      this.halo.alpha = 0.5 + 0.5 * u;
      this.dimTarget = idx >= 3 ? 0.5 * u : idx === 2 ? 0.25 * u : 0;
      if (!rm) this.trauma.trauma = Math.max(this.trauma.trauma, (0.2 + 0.05 * idx) * u);
      this.suck(dt, u, TIER_COLORS[s.tier]);
      this.stageBuild(s, t, u, dt);
      return;
    }
    if (this.fire('burst-pop')) {
      // Freeze frame: everything holds still for a beat with the drum white-hot.
      this.whiteOut(1);
      this.swell = 0.16;
      this.drum.body.position.set(0, 0);
      this.drum.body.rotation = 0;
      this.hitstop = Math.max(this.hitstop, hold);
      this.flash(0.35, 0xffffff);
    }
    if (t >= B + hold && this.fire('burst')) this.explode(s);
    const u = span(t, B + hold, s.durationMs);
    this.bigRaysLevel = lerp(0.25, 0.55, easeOutCubic(u));
    this.bigRays.scale.set(lerp(0.4, 1.5, easeOutBack(u, 1.4)));
    this.halo.alpha = lerp(1, 0.4, u);
  }

  /** Motes of light sucked into the drum during the burst build. */
  private suck(dt: number, u: number, color: number): void {
    const rate = (this.d.settings.reduceMotion ? 0.2 : 1) * (0.6 + 2.4 * u);
    this.emberT += dt * rate;
    while (this.emberT > 16) {
      this.emberT -= 16;
      const a = this.rng.next() * Math.PI * 2;
      const r = 240 + this.rng.next() * 160;
      const life = 260 + this.rng.next() * 160;
      const sx = CORE.x + Math.cos(a) * r;
      const sy = CORE.y + Math.sin(a) * r * 0.8;
      this.particles.spawn({
        tex: streakTexture(),
        x: sx,
        y: sy,
        vx: ((CORE.x - sx) / life) * 1000,
        vy: ((CORE.y - sy) / life) * 1000,
        life,
        scale: [0.3, 0.8],
        alpha: [0, 1],
        tint: this.rng.next() < 0.4 ? 0xffffff : shade(color, 0.35),
        add: true,
        align: true,
      });
    }
  }

  /** The explosion: flash, shockwaves, the halves, shards, streaks, embers and Amber. */
  private explode(s: BurstStep): void {
    const c = TIER_COLORS[s.tier];
    const idx = tierIndex(s.tier);
    const rm = this.d.settings.reduceMotion;
    const level = stagingLevel(s.tier);
    this.flash(0.95, 0xffffff);
    this.trauma.add(0.55 + 0.08 * idx);
    this.addPunch(0.06 + 0.015 * idx);
    this.vibrate(idx >= 3 ? [50, 30, 80] : 40);
    this.whiteOut(1);
    this.swell = 0;
    this.dimTarget = 0;
    this.drum.shatter();
    this.bigRays.scale.set(0.3);
    this.throwHalves(this.drum, PED.x, PED.y, 1);
    this.shards(CORE.x, CORE.y, c, rm ? 18 : 56, 1);
    // Shockwaves: a wide ring in the tier colour, a fast white one, and one along the floor.
    this.ring(CORE.x, CORE.y, 40, 620, c, 26, 620, 1);
    this.ring(CORE.x, CORE.y, 30, 460, 0xffffff, 10, 380, 0.9);
    this.ring(PED.x, PED.y, 80, 700, shade(c, 0.3), 14, 700, 0.8, 0.28);
    // Legendary tiers: a second, slower ring in the crests' white-gold.
    if (level >= 1) this.ring(CORE.x, CORE.y, 60, 760, AEON_FILIGREE, 12, 820, 0.9);
    // Radial light streaks.
    const n = rm ? 12 : 40 + 10 * idx;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + this.rng.next() * 0.2;
      const sp = 700 + this.rng.next() * 900;
      this.particles.spawn({
        tex: streakTexture(),
        x: CORE.x + Math.cos(a) * 30,
        y: CORE.y + Math.sin(a) * 30,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: 380 + this.rng.next() * 260,
        drag: 0.04,
        scale: [1.4 + this.rng.next(), 0.3],
        alpha: [1, 0],
        tint: i % 2 === 0 ? 0xffffff : shade(c, 0.4),
        add: true,
        align: true,
      });
    }
    // Embers keep drifting up through the card reveal (Bronze and up); confetti for Jade; the
    // Legendary tiers leave their own residue instead (A10 step 4).
    this.embersOn = idx >= 1;
    if (idx >= 3 && level === 0) this.confettiBurst(CORE.x, CORE.y, rm ? 14 : 50);
    this.stagePop(level);
    if (s.amber > 0) this.pourAmber(CORE.x, CORE.y, 16);
  }

  // ---------------------------------------------------------------------------------------------
  // Summit strikes (A10 step 3b) and the drum's morph
  // ---------------------------------------------------------------------------------------------

  /** Where the hammer head is now (design space). */
  private hammerHead(): { x: number; y: number } {
    const r = this.hammer.root.rotation;
    const h = Hammer.HEAD.y;
    return { x: this.hammer.root.x - h * Math.sin(r), y: this.hammer.root.y + h * Math.cos(r) };
  }

  /** A clear gem grinds up out of the cap's top face and settles, unlit, in the cap band. */
  private summitRise(s: SummitRiseStep, t: number): void {
    const u = t / s.durationMs;
    const rm = this.d.settings.reduceMotion;
    // Reduce motion: the gem fades in where it settles, over 150 ms (A10).
    this.drum.setOrnament(rm ? t / 150 : u);
    const top = { x: PED.x, y: PED.y - 236 };
    if (this.fire(`rise-grit-${s.index}`)) {
      // The stone grinds open: grit and a puff of dust from the top face, a soft white light.
      this.dustRing(top.x, top.y + 4, rm ? 3 : 8);
      this.chips(top.x, top.y + 2, ROOM.stoneLight, rm ? 2 : 6);
      this.ring(top.x, top.y + 2, 10, 90, 0xffffff, 5, 360, 0.5, 0.35);
      this.drum.energy = Math.max(this.drum.energy, 0.8);
    }
    if (!rm) this.drum.body.x = Math.sin(t * 0.21) * 1.6 * (1 - u);
    if (u >= 0.92 && this.fire(`rise-land-${s.index}`)) {
      this.squash(0.06);
      const [gx, gy] = this.drum.gemPos(this.drum.state.gems.length, this.drum.state.gems.length + 1);
      this.sparkBurst(PED.x + gx, PED.y + gy, 0xffffff, rm ? 3 : 8, 200);
    }
  }

  private settleRise(s: SummitRiseStep): void {
    this.fire(`rise-grit-${s.index}`);
    this.fire(`rise-land-${s.index}`);
    this.drum.body.x = 0;
    const st = this.drum.state;
    if (st.gems.length > s.index) return;
    this.drum.setState({ ...st, gems: [...st.gems, null] });
  }

  /**
   * The summit strike (1,020 ms): the same count-in as a strike over the white-hot hammer (two
   * notches up, `blow.ts`), a slow descent over the last beat, the impact on the fourth beat and a
   * 120 ms hold, a shockwave, then the new material wipes down while the gem ignites in the new
   * tier's colour and one more crest stamps.
   */
  private summitStrike(s: SummitStrikeStep, t: number): void {
    const T = SHOW_TIMING;
    const impact = s.impactMs;
    const rm = this.d.settings.reduceMotion;
    this.countIn(s, t);
    // The room holds its breath.
    if (t < impact) this.dimTarget = Math.max(this.dimTarget, 0.18 * span(t, 0, impact));
    if (t >= impact && this.fire(`summit-impact-${s.index}`)) {
      if (this.blow?.id === s.id) this.blow.landed = true;
      const hit = this.blow?.id === s.id ? this.blow.hit : null;
      if (hit && hit.grade !== 'miss') this.gradeFx(s, hit);
      // Impact: a white-hot hit and a held frame (colour comes after the hold).
      this.hitstop = Math.max(this.hitstop, T.summitHoldMs);
      this.whiteOut(0.85);
      this.heatTarget = 0;
      this.heat = 0.6;
      this.kickT = 0;
      this.kickA = rm ? 0.02 : 0.09;
      this.squash(0.3);
      this.trauma.add(0.5);
      this.addPunch(0.05);
      this.flash(0.3, 0xffffff);
      this.vibrate([40, 40, 90]);
      this.drum.setLeak(1.1);
      this.drum.energy = 1.2;
      this.ring(HIT.x - 6, HIT.y, 10, 160, 0xffffff, 10, 300, 1);
      for (let i = 0; i < (rm ? 6 : 18); i++) {
        const a = -Math.PI * 0.15 + (this.rng.next() - 0.5) * 2.4;
        const sp = 500 + this.rng.next() * 700;
        this.particles.spawn({ tex: streakTexture(), x: HIT.x, y: HIT.y + (this.rng.next() - 0.5) * 30, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 160, life: 320 + this.rng.next() * 300, drag: 0.05, gravity: 1400, scale: [0.7 + this.rng.next() * 0.5, 0.1], alpha: [1, 0], tint: 0xffffff, add: true, align: true });
      }
    }
    if (t >= impact + T.summitHoldMs && this.fire(`summit-wave-${s.index}`)) {
      const c = TIER_COLORS[s.to];
      // The shockwave, then the transmutation into the new material (the gem ignites, a crest stamps).
      this.setShownTier(s.to, 'morph', T.summitTransmuteMs);
      this.halo.alpha = 1;
      this.flash(0.4, shade(c, 0.6));
      this.ring(CORE.x, CORE.y, 120, 600, c, 20, 700, 0.9);
      this.ring(PED.x, PED.y, 70, 560, shade(c, 0.3), 12, 700, 0.8, 0.28);
      this.waveT = 0;
      this.waveColor = c;
      this.pips.root.alpha = 1;
      const [gx, gy] = this.drum.gemPos(s.index, s.index + 1);
      this.sparkBurst(PED.x + gx, PED.y + gy, c, rm ? 8 : 26, 360);
      const n = rm ? 10 : this.lite ? 16 : 30;
      for (let i = 0; i < n; i++) {
        const a = this.rng.next() * Math.PI * 2;
        const sp = 300 + this.rng.next() * 600;
        this.particles.spawn({ tex: i % 3 === 0 ? starTexture() : dotTexture(), x: PED.x + Math.cos(a) * 40, y: PED.y - 130 + Math.sin(a) * 60, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 100, life: 500 + this.rng.next() * 500, drag: 0.06, gravity: 400, scale: [1 + this.rng.next() * 0.6, 0], alpha: [1, 0], tint: i % 4 === 0 ? 0xffffff : c, add: true });
      }
    }
  }

  private settleSummit(s: SummitStrikeStep): void {
    this.fire(`summit-impact-${s.index}`);
    this.fire(`summit-wave-${s.index}`);
    this.endBlow(s.id);
    this.drum.body.position.set(0, 0);
    this.setShownTier(s.to);
    // The next gem (if any) rises at once; otherwise the burst cools the hammer.
    this.heatTarget = 0.4;
  }

  /** "Your first Aeon Capsule" (the banner is DOM text): the room glows a moment longer. */
  private firstTierFx(s: FirstTierStep, t: number): void {
    const c = TIER_COLORS[s.tier];
    if (this.fire('first-tier')) {
      this.ring(640, 300, 30, 420, shade(c, 0.4), 10, 700, 0.8);
      this.sparkBurst(640, 300, AEON_FILIGREE, this.d.settings.reduceMotion ? 6 : 22, 380);
    }
    this.bigRaysLevel = 0.3 + 0.2 * hump(t / s.durationMs);
  }

  private startMorph(to: DrumState, wipeMs: number): void {
    this.settleMorph();
    const rm = this.d.settings.reduceMotion;
    const crest = to.crests > this.drum.state.crests;
    if (crest) this.drum.beginCrestStamp(rm);
    this.drum.beginTransmute(to, { crests: !crest });
    // The crest stamps once the strike's white-out has faded (220 ms), so the stamp is seen, not
    // hidden under the flash; reduce motion fades it in at once (its white-out is at most 20%).
    this.morph = { to, wipeMs, t: 0, crest, crestDelay: rm ? 0 : Math.max(Math.round(wipeMs * 0.3), 220), crestMs: rm ? 150 : 340, crestHit: false };
  }

  private updateMorph(dt: number): void {
    const m = this.morph;
    if (!m) return;
    m.t += dt;
    this.drum.setTransmute(m.t / m.wipeMs);
    if (m.crest) {
      const u = (m.t - m.crestDelay) / m.crestMs;
      this.drum.setOrnament(u);
      if (u >= 0.5 && !m.crestHit) {
        // The crest lands: a white-gold glint and a small punch.
        m.crestHit = true;
        const [x, y] = this.drum.crestPos(m.to.crests - 1, m.to.crests);
        this.ring(PED.x + x, PED.y + y, 6, 60, AEON_FILIGREE, 5, 280, 0.9);
        this.sparkBurst(PED.x + x, PED.y + y, AEON_FILIGREE, this.d.settings.reduceMotion ? 3 : 10, 220);
        this.addPunch(0.012);
      }
    }
    if (m.t >= m.wipeMs && (!m.crest || m.t >= m.crestDelay + m.crestMs)) this.settleMorph();
  }

  private settleMorph(): void {
    const m = this.morph;
    if (!m) return;
    this.morph = null;
    this.drum.endTransmute();
    this.drum.setState(m.to);
  }

  // ---------------------------------------------------------------------------------------------
  // Top-tier staging (A10 step 4: the room reacts only to the tier already shown)
  // ---------------------------------------------------------------------------------------------

  private stageBuild(s: BurstStep, t: number, u: number, dt: number): void {
    const level = stagingLevel(s.tier);
    if (level === 0) return;
    const rm = this.d.settings.reduceMotion;
    const e = easeOutCubic(u);
    this.camPushTarget = rm ? 0 : (STAGE_PUSH[level] ?? 0) * e;
    this.dimTarget = Math.max(this.dimTarget, (STAGE_DIM[level] ?? 0) * span(t, 0, 320));
    if (level === 1) {
      // Gold: faint sunlight falls from above.
      this.godRaysLevel = 0.75 * e;
    } else if (level === 2) {
      // Platinum: a cold top spotlight, and prismatic glints travel once around the drum.
      this.coldLevel = span(t, 0, 320);
      this.glints(t, dt);
    } else {
      // Aeon: the drum lifts, the starfield spills out behind it, the age glyphs gather in a halo.
      this.drumLiftTarget = AEON_LIFT;
      this.starfield.visible = true;
      this.starKTarget = 1;
      this.starSpread = Math.max(this.starSpread, easeOutCubic(span(t, 0, s.buildMs * 0.85)));
      this.camTiltTarget = rm ? 0 : AEON_TILT * e;
      this.haloGlyphs(t);
    }
  }

  private stagePop(level: number): void {
    const rm = this.d.settings.reduceMotion;
    const k = rm ? 0.35 : this.lite ? 0.5 : 1;
    this.camPushTarget = 0;
    this.camTiltTarget = 0;
    this.drumLiftTarget = 0;
    if (level === 1) {
      // Gold: 16 sparks and champagne gold leaf fluttering down for 1.5 s.
      this.sparkBurst(CORE.x, CORE.y, TIER_RAMPS.gold.highlight, 16, 620);
      this.goldLeaf(Math.round(48 * k));
      this.godRaysLevel = 0.5;
    } else if (level === 2) {
      // Platinum: ice-crystal splinters and a frost ring on the pedestal (3 s).
      this.splinters(CORE.x, CORE.y, Math.round(36 * k));
      this.frostT = 0;
      this.coldLevel = 0.7;
    } else if (level >= 3) {
      // Aeon: star dust from a pooled batch (≤ 160 sprites, Lite 80); the glyphs fly out; the
      // starfield stays behind the cards until the summary.
      this.starDust(CORE.x, CORE.y, rm ? 60 : this.lite ? 80 : 160);
      this.glyphBurstT = 0;
      this.starKTarget = 0.85;
      this.starSpread = 1;
    }
  }

  /** Prismatic glints travel once around the drum's outline (Platinum, 800 ms). */
  private glints(t: number, dt: number): void {
    const u = span(t, 100, 900);
    if (u <= 0 || u >= 1) return;
    this.glintT += dt;
    const every = this.lite ? 34 : 16;
    while (this.glintT >= every) {
      this.glintT -= every;
      const a = -Math.PI / 2 - u * Math.PI * 2;
      const cx = Math.cos(a);
      const sy = Math.sin(a);
      const x = CORE.x + Math.sign(cx) * Math.pow(Math.abs(cx), 0.45) * 104;
      const y = CORE.y - 14 + Math.sign(sy) * Math.pow(Math.abs(sy), 0.45) * 138;
      const tint = HOLO_BANDS[Math.floor(u * 20) % HOLO_BANDS.length] ?? 0xffffff;
      this.particles.spawn({ tex: starTexture(), x, y, vx: 0, vy: 0, life: 200, scale: [2.4, 0.4], alpha: [1, 0], tint: 0xffffff, add: true });
      this.particles.spawn({ tex: dotTexture(), x, y, vx: (this.rng.next() - 0.5) * 50, vy: (this.rng.next() - 0.5) * 50, life: 520, scale: [1.8, 0], alpha: [1, 0], tint, add: true });
    }
  }

  private haloGlyphs(t: number): void {
    if (this.glyphs.length === 0) {
      const ages = this.d.catalog.ages ?? DEFAULT_AGES;
      const n = Math.max(1, ages.length);
      ages.forEach((age, i) => {
        const a = -Math.PI / 2 + (i / n) * Math.PI * 2;
        const c = ageGlyph(age, 46, { rim: AEON_FILIGREE, face: TIER_RAMPS.aeon.shadow });
        const x = Math.cos(a) * 236;
        const y = Math.sin(a) * 196;
        c.position.set(x, y);
        c.scale.set(0);
        this.glyphHalo.addChild(c);
        // Staggered so the whole halo takes at most 900 ms (A10 step 4).
        this.glyphs.push({ c, x, y, at: (i * HALO_MS) / n });
      });
    }
    const pop = 260;
    for (const g of this.glyphs) {
      const u = span(t, g.at, g.at + pop);
      const sc = this.d.settings.reduceMotion ? (u > 0 ? 1 : 0) : easeOutBack(u, 2.2);
      g.c.scale.set(sc);
      g.c.alpha = this.d.settings.reduceMotion ? span(t, g.at, g.at + 150) : clamp01(u * 2);
      if (u > 0 && u < 0.2 && this.fire(`glyph-${g.at}`)) this.sparkBurst(CORE.x + g.x, CORE.y - 6 + g.y, TIER_RAMPS.aeon.highlight, this.d.settings.reduceMotion ? 2 : 6, 160);
    }
  }

  private goldLeaf(n: number): void {
    const tints = [TIER_RAMPS.gold.key, TIER_RAMPS.gold.mid, TIER_RAMPS.gold.highlight, TIER_RAMPS.gold.mid];
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (this.rng.next() - 0.5) * 2.6;
      const sp = 250 + this.rng.next() * 450;
      this.particles.spawn({
        tex: leafTexture(),
        x: CORE.x + (this.rng.next() - 0.5) * 80,
        y: CORE.y + (this.rng.next() - 0.5) * 80,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: 1500,
        drag: 0.12,
        gravity: 170,
        scale: [1.4 + this.rng.next() * 1.1, 1.1],
        alpha: [1, 0.5],
        rot: this.rng.next() * 6,
        vr: (this.rng.next() - 0.5) * 7,
        tint: tints[i % tints.length] ?? 0xffffff,
        flutter: true,
      });
    }
  }

  private splinters(x: number, y: number, n: number): void {
    const tints = [TIER_RAMPS.platinum.highlight, TIER_RAMPS.platinum.key, 0xffffff, TIER_RAMPS.platinum.mid];
    for (let i = 0; i < n; i++) {
      const a = this.rng.next() * Math.PI * 2;
      const sp = 520 + this.rng.next() * 760;
      this.particles.spawn({ tex: splinterTexture(), x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 120, life: 650 + this.rng.next() * 400, drag: 0.12, gravity: 520, scale: [0.8 + this.rng.next() * 0.9, 0.5], alpha: [1, 0], tint: tints[i % tints.length] ?? 0xffffff, align: true });
      if (i % 3 === 0) this.particles.spawn({ tex: starTexture(), x: x + Math.cos(a) * 60, y: y + Math.sin(a) * 60, vx: Math.cos(a) * sp * 0.4, vy: Math.sin(a) * sp * 0.4, life: 500, drag: 0.2, scale: [1.2, 0], alpha: [1, 0], tint: 0xe8fffb, add: true });
    }
  }

  private starDust(x: number, y: number, n: number): void {
    const tints = [0xffffff, TIER_RAMPS.aeon.highlight, TIER_RAMPS.aeon.key, AEON_FILIGREE];
    for (let i = 0; i < n; i++) {
      const a = this.rng.next() * Math.PI * 2;
      const sp = 60 + this.rng.next() * this.rng.next() * 620;
      this.particles.spawn({
        tex: i % 4 === 0 ? starTexture() : dotTexture(),
        x: x + Math.cos(a) * 20,
        y: y + Math.sin(a) * 20,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp * 0.8 - 30,
        life: 1600 + this.rng.next() * 1000,
        drag: 0.35,
        gravity: -12,
        scale: i % 4 === 0 ? [0.9 + this.rng.next() * 0.6, 0] : [0.5 + this.rng.next() * 0.6, 0.1],
        alpha: [1, 0],
        tint: tints[i % tints.length] ?? 0xffffff,
        add: true,
      });
    }
  }

  /** Staging layers that run on their own clocks (god rays, spotlight, starfield, halo, frost). */
  private updateStaging(dt: number): void {
    const ease = (cur: number, want: number, ms: number) => cur + (want - cur) * Math.min(1, dt / ms);
    const sink = 1 - 0.6 * this.pedSink;
    this.godRays.alpha = ease(this.godRays.alpha, this.godRaysLevel * (1 - 0.8 * this.summaryDim), 180);
    if (this.godRays.alpha > 0.01 && !this.lite) this.godRays.x = PED.x + Math.sin(this.time / 1400) * 18;
    this.coldCone.alpha = ease(this.coldCone.alpha, 0.85 * this.coldLevel * sink, 160);
    // The glyph halo: gathers during the build, flies out at the pop.
    if (this.glyphBurstT >= 0) {
      this.glyphBurstT += dt;
      const u = clamp01(this.glyphBurstT / 650);
      for (const g of this.glyphs) {
        const k = 1 + 0.9 * easeOutCubic(u);
        g.c.position.set(g.x * k, g.y * k);
        g.c.alpha = 1 - u;
        g.c.rotation = (this.d.settings.reduceMotion ? 0 : 0.6) * u * Math.sign(g.x || 1);
      }
      if (u >= 1) {
        this.glyphBurstT = -1;
        this.glyphHalo.visible = false;
      }
    }
    // The starfield: spills out from behind the drum and stays until the summary.
    const fanDim = this.fan && this.pedSink > 0.5 ? 0.75 : 1;
    this.starK = ease(this.starK, this.starKTarget * fanDim, this.starKTarget > this.starK ? 200 : 500);
    this.drawStarfield(dt);
    this.drawFrost(dt);
  }

  private drawStarfield(dt: number): void {
    const g = this.starG;
    g.clear();
    const k = this.starK;
    this.starfield.visible = k > 0.01;
    if (!this.starfield.visible) return;
    const still = this.lite;
    for (const n of this.nebula) n.alpha = 0.42 * k;
    const spread = this.starSpread;
    for (const st of this.fieldStars) {
      if (st.d > spread) continue;
      if (!still) {
        st.x += (st.vx * dt) / 1000;
        st.y += (st.vy * dt) / 1000;
        if (st.y < -20) st.y += 760;
      }
      const edge = clamp01((spread - st.d) / 0.12);
      const tw = still ? 0.85 : 0.55 + 0.45 * Math.sin(this.time / 380 + st.phase);
      const a = k * edge * tw;
      g.circle(st.x, st.y, st.r).fill({ color: st.tint, alpha: a });
      if (st.r > 2.4) g.circle(st.x, st.y, st.r * 3.2).fill({ color: TIER_RAMPS.aeon.key, alpha: 0.22 * a });
    }
  }

  /** The Platinum frost ring on the pedestal: rimes over, glitters, melts after 3 s. */
  private drawFrost(dt: number): void {
    const g = this.frostG;
    g.clear();
    if (this.frostT < 0) return;
    this.frostT += dt;
    const t = this.frostT;
    if (t >= 3000) {
      this.frostT = -1;
      return;
    }
    const a = span(t, 0, 180) * (1 - span(t, 2200, 3000));
    const r = TIER_RAMPS.platinum;
    const grow = easeOutCubic(span(t, 0, 420));
    g.ellipse(0, 1, 136 * grow, 19 * grow).stroke({ width: 7, color: r.key, alpha: 0.5 * a });
    g.ellipse(0, 1, 136 * grow, 19 * grow).stroke({ width: 2, color: r.highlight, alpha: 0.95 * a });
    g.ellipse(0, 1, 108 * grow, 14 * grow).stroke({ width: 1.5, color: r.highlight, alpha: 0.5 * a });
    for (let i = 0; i < 18; i++) {
      const th = (i / 18) * Math.PI * 2 + 0.2;
      const x = Math.cos(th) * 136 * grow;
      const y = 1 + Math.sin(th) * 19 * grow;
      const len = (i % 3 === 0 ? 11 : 6) * grow;
      const tw = this.lite ? 1 : 0.6 + 0.4 * Math.sin(this.time / 160 + i * 1.7);
      g.poly([x, y - len, x + 2.5, y, x, y + len * 0.4, x - 2.5, y]).fill({ color: 0xffffff, alpha: a * tw });
    }
    g.position.set(PED.x, PED.y);
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
    // A Platinum or Aeon in the batch: its stinger and a 600 ms flare end the volley (A10 Rules).
    const top = s.flare;
    if (top && t >= s.flareAtMs && this.fire('volley-flare')) {
      const c = TIER_COLORS[top];
      const level = stagingLevel(top);
      this.flash(0.55, shade(c, 0.55));
      this.trauma.add(0.35);
      this.addPunch(0.05);
      this.bigRays.tint = c;
      this.bigRays.scale.set(0.4);
      this.bigRaysLevel = 0.8;
      this.ring(640, 400, 40, 700, c, 22, 600, 1);
      this.ring(640, 400, 30, 480, 0xffffff, 8, 420, 0.9);
      if (level >= 3) {
        this.starSpread = 1;
        this.starKTarget = 0.8;
        this.starDust(640, 400, this.lite ? 40 : 80);
      } else {
        this.splinters(640, 400, this.lite ? 12 : 24);
      }
    }
    if (top && t >= s.flareAtMs) this.bigRaysLevel = lerp(0.8, 0.35, span(t, s.flareAtMs, s.flareAtMs + SHOW_TIMING.volleyFlareMs));
  }

  // ---------------------------------------------------------------------------------------------
  // Cards (A10 steps 5-7)
  // ---------------------------------------------------------------------------------------------

  /** Cards fly out of the burst on arcs with sparkle trails and land with a snap. */
  private dealCards(u: number, dt: number): void {
    if (!this.fan) return;
    const landed = this.fan.deal(u);
    const rm = this.d.settings.reduceMotion;
    for (const v of landed) {
      v.pop(0.12);
      this.ring(v.root.x, v.root.y + (CARD_H / 2) * v.home.scale, 20, 120 * v.home.scale, 0xfff0c8, 6, 300, 0.6, 0.3);
      this.sparkBurst(v.root.x, v.root.y + (CARD_H / 2) * v.home.scale, 0xfff0c8, rm ? 3 : 8, 200);
    }
    // Trails behind the cards still in flight.
    if (rm) return;
    this.moteT += dt;
    if (this.moteT < 24) return;
    this.moteT = 0;
    for (const v of this.fan.views) {
      if (!v.root.visible || this.dealtHome(v)) continue;
      this.particles.spawn({
        tex: this.rng.next() < 0.3 ? starTexture() : dotTexture(),
        x: v.root.x + (this.rng.next() - 0.5) * 30,
        y: v.root.y + (this.rng.next() - 0.5) * 30,
        vx: (this.rng.next() - 0.5) * 40,
        vy: 20 + this.rng.next() * 40,
        life: 380,
        scale: [0.8, 0],
        alpha: [0.9, 0],
        tint: this.rng.next() < 0.5 ? 0xffffff : shade(TIER_COLORS[this.tier], 0.4),
        add: true,
      });
    }
  }

  private dealtHome(v: CardView): boolean {
    return Math.abs(v.root.x - v.home.x) < 1 && Math.abs(v.root.y - v.home.y) < 1;
  }

  /**
   * The honest pre-signal (A10 step 5): the card lifts and glows in its rarity colour; Rare and up
   * tremble harder and harder while light is drawn in, and the room darkens for Epic and Legendary.
   */
  private preSignal(card: RevealCard, u: number, dt: number): void {
    const e = easeOutCubic(u);
    this.signal.set(card.slot, e);
    const r = card.rarity;
    const rank = r === 'legendary' ? 1 : r === 'epic' ? 0.8 : r === 'rare' ? 0.45 : 0;
    const v = this.fan?.view(card.slot);
    if (v) v.wobble = rank * u;
    // Light starts leaking from the back's edges and cracks (the rarity burst's anticipation).
    const level = burstLevel(r);
    if (v && level) v.setLeak(this.burstFxFor(level).leak * 0.6 * u * u);
    if (r === 'legendary') this.bigRaysLevel = lerp(0.35, 0.9, u);
    else if (r === 'epic') this.bigRaysLevel = lerp(0.35, 0.6, u);
    if (this.plan.mode === 'wardrobe') this.riseFromCrate(u);
    if (v && rank >= 0.8) this.drawIn(v, r, dt, 0.5 + 2 * u);
  }

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
    if (f >= 1 && this.fire(`flipped-${s.card.key}`)) this.snapCard(v, s);
    if (s.countMs > 0) v.setCount(span(t, s.flipMs + 40, s.flipMs + s.countMs));
    if (s.foilMs > 0) v.setFoil(span(t, s.flipMs, s.flipMs + s.foilMs));
    if (s.stampMs > 0) {
      const st = span(t, s.flipMs + s.foilMs, s.flipMs + s.foilMs + s.stampMs);
      v.setStamp(st);
      if (st >= 0.6 && this.fire(`stamp-${s.card.key}`)) {
        // The NEW stamp slams on with a burst of sparks.
        this.trauma.add(0.12);
        this.addPunch(0.012);
        const sx = v.root.x - 30 * v.root.scale.x * 1.16;
        const sy = v.root.y - 92 * v.root.scale.x * 1.16;
        this.ring(sx, sy, 10, 90, s.card.kind === 'skin' ? RARITY_COLORS[r] : ROOM.newStamp, 7, 300, 0.9);
        this.sparkBurst(sx, sy, s.card.kind === 'skin' ? RARITY_COLORS[r] : ROOM.newStamp, this.d.settings.reduceMotion ? 5 : 16, 320);
      }
    }
  }

  /** The face lands: flash, pop, a ring in the rarity colour and sparks, stronger for rarer cards. */
  private snapCard(v: CardView, s: FlipStep): void {
    const r = s.card.rarity;
    const strength = r === 'legendary' ? 1 : r === 'epic' ? 0.85 : r === 'rare' ? 0.5 : 0.2;
    const c = RARITY_COLORS[r];
    v.snap(strength);
    this.fan?.flipBurst(v, r === 'epic' || r === 'legendary');
    this.signal.set(s.card.slot, 0);
    const size = Math.max(1, v.root.scale.x / 1.2);
    this.ring(v.root.x, v.root.y - 26, 50 * size, (150 + 170 * strength) * size, c, 6 + 10 * strength, 320 + 260 * strength, 0.95);
    // A fast white inner ring sells the snap on every rarity.
    this.ring(v.root.x, v.root.y - 26, 40 * size, 120 * size, 0xffffff, 5, 200, 0.8);
    this.trauma.add(0.06 + 0.2 * strength);
    this.addPunch(0.008 + 0.03 * strength);
    if (r !== 'common') this.hitstop = Math.max(this.hitstop, 30 + 50 * strength);
    if (r === 'epic' || r === 'legendary') {
      this.flash(0.3, shade(c, 0.5));
      this.sparkBurst(v.root.x, v.root.y - 26, c, this.d.settings.reduceMotion ? 8 : 30, 520);
      this.vibrate(25);
    }
  }

  private burstFxFor(level: BurstLevel): BurstFx {
    return resolveBurstFx(level, { reduceMotion: this.d.settings.reduceMotion, lite: this.lite });
  }

  /** Where a presented card's centre is now (its body is lifted 26 px in card space). */
  private cardCentre(v: CardView): { x: number; y: number } {
    return { x: v.root.x, y: v.root.y - 26 * v.root.scale.y };
  }

  /**
   * The rarity burst (A10 step 5a): a short windup (the card compresses and trembles harder, the
   * leaks peak, light is drawn in), the pop, a hit-stop with the card blasted out, then it falls back
   * and slams into place with a bounce while embers drift up. Effects scale with the rarity; Reduce
   * motion keeps a calm glow (and the sound).
   */
  private rarityBurst(s: RarityBurstStep, t: number, dt: number): void {
    const v = this.fan?.view(s.card.slot);
    if (!v) return;
    const fx = this.burstFxFor(s.level);
    const rank = s.level === 'legendary' ? 1 : s.level === 'epic' ? 0.8 : 0.45;
    this.signal.set(s.card.slot, 1);
    if (t < s.popMs) {
      const u = t / s.popMs;
      v.wobble = fx.motion ? rank * (1 + 0.8 * u) : 0;
      v.setLeak(fx.leak * lerp(0.6, 1, u));
      if (fx.motion) {
        // Anticipation: the card gathers itself, wider and shorter, just before it goes.
        const e = easeInQuad(u);
        v.setBurstShape(1 + 0.3 * fx.blast * e, 1 - 0.45 * fx.blast * e);
      }
      if (s.level !== 'rare') this.bigRaysLevel = lerp(this.bigRaysLevel, s.level === 'legendary' ? 1 : 0.7, Math.min(1, dt / 120));
      this.drawIn(v, s.card.rarity, dt, 1.4);
      return;
    }
    if (this.fire(`rb-pop-${s.card.key}`)) this.rarityExplode(v, s, fx);
    v.wobble = 0;
    v.setLeak(fx.leak * lerp(1, 0.4, span(t, s.popMs, s.popMs + 320)));
    if (s.level === 'epic' && t < this.boltsUntil) {
      if (Math.floor(t / 50) !== Math.floor((t - dt) / 50)) v.drawBolts(true, RARITY_COLORS.epic);
    } else v.drawBolts(false, 0);
    if (!fx.motion) return;
    // After the freeze the card falls back, faster and faster, slams into place, squashes and bounces.
    const a = t - s.popMs - s.hitStopMs;
    const B = fx.blast;
    if (a <= 0) v.setBurstShape(1 + 0.85 * B, 1 + 1.1 * B);
    else if (a < s.slamMs) {
      const k = 1 - easeInCubic(a / s.slamMs);
      v.setBurstShape(1 + 0.85 * B * k, 1 + 1.1 * B * k);
    } else {
      if (this.fire(`rb-slam-${s.card.key}`)) this.burstSlam(v, s, fx);
      const b = a - s.slamMs;
      const q = 0.6 * B * Math.exp(-b / 95) * Math.cos(b / 30);
      v.setBurstShape(1 + 0.6 * q, 1 - q);
    }
  }

  /** Streaks of light drawn into the card (the pre-signal and the burst's windup). */
  private drawIn(v: CardView, r: RevealCard['rarity'], dt: number, rate: number): void {
    if (this.d.settings.reduceMotion) return;
    this.emberT += dt * rate * (this.lite ? 0.5 : 1);
    while (this.emberT > 16) {
      this.emberT -= 16;
      const a = this.rng.next() * Math.PI * 2;
      const rr = (170 + this.rng.next() * 120) * Math.max(1, v.root.scale.x / 1.2);
      const life = 240 + this.rng.next() * 140;
      const sx = v.root.x + Math.cos(a) * rr;
      const sy = v.root.y + Math.sin(a) * rr;
      this.particles.spawn({
        tex: streakTexture(),
        x: sx,
        y: sy,
        vx: ((v.root.x - sx) / life) * 1000,
        vy: ((v.root.y - sy) / life) * 1000,
        life,
        scale: [0.3, 0.7],
        alpha: [0, 1],
        tint: this.rng.next() < 0.35 ? 0xffffff : RARITY_COLORS[r],
        add: true,
        align: true,
      });
    }
  }

  /** The pop: light, shockwaves, particles, hit-stop, shake and embers, all in the rarity colour. */
  private rarityExplode(v: CardView, s: RarityBurstStep, fx: BurstFx): void {
    const c = RARITY_COLORS[s.card.rarity];
    const light = shade(c, 0.45);
    const { x, y } = this.cardCentre(v);
    const L = fx.lightPx;
    this.burstT = 0;
    this.burstFxNow = fx;
    this.burstAt = { x, y };
    this.burstGlow.tint = c;
    this.burstStar.tint = light;
    if (fx.flash > 0) this.flash(fx.flash, mixColor(0xffffff, c, 0.3));
    if (fx.motion) {
      this.hitstop = Math.max(this.hitstop, s.hitStopMs);
      v.flare(0.95);
    } else v.flare(0.25);
    this.trauma.add(fx.trauma);
    this.addPunch(fx.punch);
    if (fx.vibrate.length > 0) this.vibrate(fx.vibrate);
    // Shockwaves: a wide ring in the rarity colour, a fast white one, and for a Legendary a slow
    // second wave and a ring along the floor.
    if (fx.rings >= 1) this.ring(x, y, 50, L * 0.5, c, 26, 560, 1);
    if (fx.rings >= 2) this.ring(x, y, 40, L * 0.34, 0xffffff, 10, 320, 0.95);
    if (fx.rings >= 3) {
      this.ring(x, y, 70, L * 0.72, light, 14, 900, 0.85);
      this.ring(x, y + (CARD_H / 2) * v.root.scale.y, 60, L * 0.6, c, 12, 760, 0.7, 0.28);
    }
    if (s.level !== 'rare') {
      this.bigRays.tint = c;
      this.bigRays.scale.set(0.3);
      this.bigRaysLevel = s.level === 'legendary' ? 1 : 0.75;
    }
    if (s.level === 'epic') this.boltsUntil = s.popMs + s.hitStopMs + 360;
    const p = this.particles;
    const rng = this.rng;
    const n = fx.particles;
    if (!fx.motion) {
      // Reduce motion: a few soft motes lift away, slowly.
      for (let i = 0; i < n; i++) {
        const a = (i / Math.max(1, n)) * Math.PI * 2;
        p.spawn({ tex: glowTexture(), x: x + Math.cos(a) * 60, y: y + Math.sin(a) * 80, vx: Math.cos(a) * 20, vy: -25 - rng.next() * 20, life: 1400, scale: [0.25, 0.5], alpha: [0.5, 0], tint: c, add: true });
      }
    } else {
      const power = s.level === 'legendary' ? 1.25 : s.level === 'epic' ? 1 : 0.7;
      const streaks = Math.round(n * 0.38);
      const sparks = Math.round(n * 0.34);
      const puffs = Math.round(n * 0.1);
      const glints = n - streaks - sparks - puffs;
      for (let i = 0; i < streaks; i++) {
        const a = (i / streaks) * Math.PI * 2 + rng.next() * 0.25;
        const sp = (650 + rng.next() * 950) * power;
        p.spawn({
          tex: streakTexture(),
          x: x + Math.cos(a) * 40,
          y: y + Math.sin(a) * 50,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp,
          life: 360 + rng.next() * 280,
          drag: 0.04,
          scale: [1.3 + rng.next() * 1.1, 0.25],
          alpha: [1, 0],
          tint: i % 3 === 0 ? 0xffffff : i % 3 === 1 ? light : c,
          add: true,
          align: true,
        });
      }
      for (let i = 0; i < sparks; i++) {
        const a = rng.next() * Math.PI * 2;
        const sp = (220 + rng.next() * 620) * power;
        p.spawn({
          tex: i % 3 === 0 ? starTexture() : dotTexture(),
          x: x + Math.cos(a) * 30,
          y: y + Math.sin(a) * 40,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp - 160 * power,
          life: 600 + rng.next() * 600,
          drag: 0.12,
          gravity: 620,
          scale: [0.8 + rng.next() * 0.9, 0],
          alpha: [1, 0],
          tint: i % 4 === 0 ? 0xffffff : i % 2 === 0 ? light : c,
          add: true,
        });
      }
      for (let i = 0; i < puffs; i++) {
        const a = rng.next() * Math.PI * 2;
        const sp = (90 + rng.next() * 180) * power;
        p.spawn({ tex: glowTexture(), x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 700 + rng.next() * 400, drag: 0.2, scale: [0.6, 1.6 + rng.next()], alpha: [0.55, 0], tint: c, add: true });
      }
      for (let i = 0; i < glints; i++) {
        const a = rng.next() * Math.PI * 2;
        const sp = (300 + rng.next() * 500) * power;
        p.spawn({ tex: starTexture(), x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 80, life: 700 + rng.next() * 500, drag: 0.1, gravity: 260, scale: [1.2 + rng.next(), 0], alpha: [1, 0], rot: rng.next() * 6, vr: (rng.next() - 0.5) * 14, tint: 0xffffff, add: true });
      }
      // A Legendary leaves gold leaf drifting down through the rest of its reveal.
      if (s.level === 'legendary') {
        const leaves = this.lite ? 12 : 24;
        for (let i = 0; i < leaves; i++) {
          const a = -Math.PI / 2 + (rng.next() - 0.5) * 2.6;
          const sp = 380 + rng.next() * 520;
          p.spawn({ tex: leafTexture(), x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 1800 + rng.next() * 900, drag: 0.3, gravity: 380, scale: [0.9 + rng.next() * 0.6, 0.8], alpha: [1, 0], rot: rng.next() * 6, vr: (rng.next() - 0.5) * 9, tint: rng.next() < 0.5 ? c : 0xfff1c4, flutter: true });
        }
      }
    }
    // Embers drift up from the card for a while after the pop.
    const span0 = v.root.scale.x * 70;
    for (let i = 0; i < fx.embers; i++) {
      p.spawn({
        tex: dotTexture(),
        x: x + (rng.next() - 0.5) * span0 * 2.2,
        y: y + (rng.next() - 0.3) * span0 * 2,
        vx: (rng.next() - 0.5) * 50,
        vy: -45 - rng.next() * (fx.motion ? 110 : 40),
        life: 1500 + rng.next() * 900,
        drag: 0.7,
        scale: [0.45 + rng.next() * 0.55, 0.05],
        alpha: [0.95, 0],
        tint: rng.next() < 0.3 ? 0xffffff : rng.next() < 0.5 ? light : c,
        add: true,
        delay: (i / Math.max(1, fx.embers)) * fx.emberMs * (0.6 + 0.4 * rng.next()),
      });
    }
  }

  /** The card lands back in place: a small thump along its bottom edge. */
  private burstSlam(v: CardView, s: RarityBurstStep, fx: BurstFx): void {
    const c = RARITY_COLORS[s.card.rarity];
    const bottom = v.root.y + (CARD_H / 2 - 26) * v.root.scale.y;
    this.trauma.add(fx.trauma * 0.35);
    this.addPunch(fx.punch * 0.35);
    this.ring(v.root.x, bottom, 30, 150 * v.root.scale.x, 0xffffff, 6, 300, 0.7, 0.3);
    this.sparkBurst(v.root.x, bottom, shade(c, 0.4), s.level === 'legendary' ? 16 : s.level === 'epic' ? 10 : 5, 300);
  }

  /** The burst light over a few hundred ms (real time: it flares at once and holds through the freeze). */
  private updateBurstLight(dt: number): void {
    const fx = this.burstFxNow;
    if (this.burstT < 0 || !fx) return;
    this.burstT += dt;
    const t = this.burstT;
    const L = fx.lightPx;
    const { x, y } = this.burstAt;
    this.burstGlow.position.set(x, y);
    this.burstCore.position.set(x, y);
    this.burstStar.position.set(x, y);
    if (!fx.motion) {
      // Reduce motion: one calm glow that swells and fades; no core, no star.
      const u = span(t, 0, 1100);
      this.burstGlow.width = this.burstGlow.height = L * 0.7;
      this.burstGlow.alpha = fx.glow * hump(u);
      this.burstCore.alpha = 0;
      this.burstStar.alpha = 0;
      if (u >= 1) this.burstT = -1;
      return;
    }
    const grow = easeOutCubic(Math.min(1, t / 90));
    this.burstGlow.width = this.burstGlow.height = L * (0.35 + 0.75 * grow + 0.2 * span(t, 90, 800));
    this.burstGlow.alpha = 0.95 * (1 - span(t, 160, 800));
    this.burstCore.width = this.burstCore.height = L * (0.25 + 0.2 * grow);
    this.burstCore.alpha = 1 - span(t, 40, 300);
    const st = Math.min(1, t / 110);
    this.burstStar.width = this.burstStar.height = L * 0.85 * (0.3 + 0.7 * easeOutBack(st, 2));
    this.burstStar.rotation = 0.0009 * t;
    this.burstStar.alpha = 1 - span(t, 80, 460);
    if (t > 820) {
      this.burstT = -1;
      this.burstGlow.alpha = this.burstCore.alpha = this.burstStar.alpha = 0;
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
          this.trauma.add(0.7);
          this.addPunch(0.08);
          this.hitstop = Math.max(this.hitstop, 90);
          // A beat of slow motion as the unit bursts into colour (A12: never with Reduce motion).
          if (!this.d.settings.reduceMotion) this.slowmo = 650;
          this.vibrate([40, 30, 90]);
        } else if (kind === 'slam') {
          this.trauma.add(0.35);
          this.addPunch(0.03);
          this.vibrate(30);
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
    let a = alpha;
    if (this.d.settings.reduceMotion) {
      // Reduce motion (A10, A12): at most 3 flashes a second, each at most 20%. A screen flash and a
      // drum white-out in the same frame are one flash.
      if (!this.reduceMotionFlash()) return;
      a = Math.min(0.2, alpha * 0.4);
    }
    if (a >= this.flashAlpha) this.flashColor = color;
    this.flashAlpha = Math.max(this.flashAlpha, a);
  }

  /** Reduce motion's flash budget: true when a flash may start now (at most one every 334 ms). */
  private reduceMotionFlash(): boolean {
    if (this.time === this.lastFlashAt) return true;
    if (this.time - this.lastFlashAt < 334) return false;
    this.lastFlashAt = this.time;
    return true;
  }

  /**
   * The drum's white-out (its white silhouette, fading over 220 ms) is a flash too: reduce motion caps
   * it at 20% and counts it against the same 3-a-second budget as `flash` (A10, A12).
   */
  private whiteOut(alpha: number): void {
    let a = alpha;
    if (this.d.settings.reduceMotion) {
      if (!this.reduceMotionFlash()) return;
      a = Math.min(0.2, alpha);
    }
    this.drumWhite = Math.max(this.drumWhite, a);
  }

  private vibrate(pattern: number | number[]): void {
    if (!this.d.settings.vibrate || typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
    try {
      navigator.vibrate(pattern);
    } catch {
      // Some browsers refuse without a user gesture.
    }
  }

  /** A zoom punch towards the stage centre (none with Reduce motion). */
  private addPunch(a: number): void {
    if (this.d.settings.reduceMotion) return;
    this.punch = Math.min(0.12, this.punch + a);
  }

  /** An expanding ring; `squash` < 1 lays it on the floor. */
  private ring(x: number, y: number, r0: number, r1: number, color: number, width: number, dur: number, alpha: number, squash = 1): void {
    if (this.rings.length > 24) this.rings.shift();
    this.rings.push({ x, y, t: 0, dur, r0, r1, width, color, alpha: this.d.settings.reduceMotion ? alpha * 0.5 : alpha, squash });
  }

  private sparkBurst(x: number, y: number, color: number, n: number, speed: number): void {
    for (let i = 0; i < n; i++) {
      const a = this.rng.next() * Math.PI * 2;
      const sp = speed * (0.4 + this.rng.next() * 0.8);
      this.particles.spawn({
        tex: i % 3 === 0 ? starTexture() : dotTexture(),
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - speed * 0.3,
        life: 420 + this.rng.next() * 300,
        drag: 0.1,
        gravity: 500,
        scale: [0.7 + this.rng.next() * 0.6, 0],
        alpha: [1, 0],
        tint: i % 4 === 0 ? 0xffffff : color,
        add: true,
      });
    }
  }

  /** Slow, soft dust puffs rolling out from a landing. */
  private dustCloud(x: number, y: number, n: number): void {
    const count = this.d.settings.reduceMotion ? Math.ceil(n / 3) : n;
    for (let i = 0; i < count; i++) {
      const dir = i % 2 === 0 ? -1 : 1;
      this.particles.spawn({
        tex: glowTexture(),
        x: x + dir * (60 + this.rng.next() * 70),
        y: y - this.rng.next() * 16,
        vx: dir * (60 + this.rng.next() * 160),
        vy: -20 - this.rng.next() * 50,
        life: 900 + this.rng.next() * 500,
        drag: 0.25,
        scale: [0.35 + this.rng.next() * 0.2, 0.9 + this.rng.next() * 0.4],
        alpha: [0.45, 0],
        tint: ROOM.dust,
      });
    }
  }

  /** Stone chips knocked off the pedestal. */
  private chips(x: number, y: number, color: number, n: number): void {
    for (let i = 0; i < n; i++) {
      const dir = i % 2 === 0 ? -1 : 1;
      this.particles.spawn({
        tex: shardTexture(),
        x: x + dir * (80 + this.rng.next() * 60),
        y,
        vx: dir * (120 + this.rng.next() * 260),
        vy: -260 - this.rng.next() * 260,
        life: 800,
        gravity: 1600,
        scale: [0.4 + this.rng.next() * 0.4, 0.4],
        alpha: [1, 0.7],
        rot: this.rng.next() * 6,
        vr: (this.rng.next() - 0.5) * 20,
        tint: i % 3 === 0 ? shade(color, -0.3) : color,
      });
    }
  }

  /** A one-shot confetti fountain out of the burst (Jade and Aeon). */
  private confettiBurst(x: number, y: number, n: number): void {
    const colors = [0xffffff, RARITY_COLORS.legendary, RARITY_COLORS.epic, RARITY_COLORS.rare, 0xff8a5c, TIER_COLORS[this.tier]];
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (this.rng.next() - 0.5) * 2.2;
      const sp = 500 + this.rng.next() * 700;
      this.particles.spawn({
        tex: confettiTexture(),
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: 1800 + this.rng.next() * 800,
        drag: 0.35,
        gravity: 520,
        scale: [1.1 + this.rng.next() * 0.7, 1],
        alpha: [1, 0.6],
        rot: this.rng.next() * 6,
        vr: (this.rng.next() - 0.5) * 14,
        tint: colors[i % colors.length] ?? 0xffffff,
        flutter: true,
      });
    }
  }

  /** Glowing embers drifting up after the burst. */
  private embers(dt: number): void {
    if (!this.embersOn) return;
    this.emberSpawnT += dt;
    const every = this.d.settings.reduceMotion ? 260 : 90;
    while (this.emberSpawnT > every) {
      this.emberSpawnT -= every;
      this.particles.spawn({
        tex: dotTexture(),
        x: 200 + this.rng.next() * 880,
        y: 700,
        vx: (this.rng.next() - 0.5) * 30,
        vy: -60 - this.rng.next() * 80,
        life: 3200,
        scale: [0.5 + this.rng.next() * 0.5, 0.1],
        alpha: [0.9, 0],
        tint: this.rng.next() < 0.3 ? 0xffffff : shade(TIER_COLORS[this.tier], 0.35),
        add: true,
      });
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
    // Hitstop freezes effects for a beat; slow motion stretches them (view only, A12).
    const frozen = this.hitstop > 0;
    // Reduce motion halves every hitstop (A12).
    this.hitstop = Math.max(0, this.hitstop - dt * (this.d.settings.reduceMotion ? 2 : 1));
    const slow = this.slowmo > 0 ? 0.3 : 1;
    this.slowmo = Math.max(0, this.slowmo - dt);
    // Effects creep at 12% through a hit-stop instead of stopping dead, so a burst born on the frozen
    // frame reads as a burst (not a white clump) while the world holds.
    const fx = frozen ? dt * 0.12 : dt * slow;
    this.particles.update(fx);
    this.motes.update(dt);
    this.drum.update(fx);
    for (const m of this.miniDrums) if (m.drum.root.visible) m.drum.update(dt);
    this.confetti(dt);
    this.embers(fx);
    this.updateMotes(dt);
    this.updateDrumAndHammer(frozen ? 0 : dt);
    // The drum's white-out fades on real time: a hit-stop holds the pose, not the white, so a
    // climb's new colour shows through as soon as it would without a graded tap.
    this.drumWhite = Math.max(0, this.drumWhite - dt / 220);
    this.drum.setWhite(this.drumWhite);
    this.updateGrade(dt);
    this.updateBurstLight(dt);
    this.updateRays(dt);
    this.updatePedestal(dt);
    this.updateCards(dt);
    this.fan?.tick(frozen ? 0 : dt);
    this.updateFlyers(fx);
    this.updateRings(fx);
    // The climb's colour wipe runs on real time too: a graded hit-stop never holds it half done.
    this.updateMorph(dt);
    this.updateStaging(dt);

    // Room mood: dim and rarity tint.
    this.dimA += (this.dimTarget - this.dimA) * Math.min(1, dt / 180);
    this.dimG.alpha = this.dimA;
    this.bgTintK += (this.bgTintTarget - this.bgTintK) * Math.min(1, dt / 220);
    this.bg.tint = mixColor(0xffffff, shade(this.bgTintColor, 0.25), 0.55 * this.bgTintK);

    // Screen flash, shake and the zoom punch.
    this.flashAlpha = Math.max(0, this.flashAlpha - dt / 200);
    this.flashG.alpha = this.flashAlpha;
    this.flashG.tint = this.flashColor;
    const sh = frozen ? this.lastShake : this.trauma.update(dt);
    this.lastShake = sh;
    this.punch *= Math.exp(-dt / 110);
    // The top-tier camera push and tilt ease in through the build and back out after the pop.
    this.camPush += (this.camPushTarget - this.camPush) * Math.min(1, dt / 240);
    this.camTilt += (this.camTiltTarget - this.camTilt) * Math.min(1, dt / 240);
    this.world.scale.set(this.scale * (1 + this.punch + this.camPush));
    this.world.position.set(this.w / 2 + sh.x * this.scale, this.h / 2 + sh.y * this.scale);
    this.world.rotation = sh.rot + this.camTilt;
  }

  private lastShake = { x: 0, y: 0, rot: 0 };

  private updateRings(dt: number): void {
    const g = this.ringG;
    g.clear();
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i];
      if (!r) continue;
      r.t += dt;
      const u = r.t / r.dur;
      if (u >= 1) {
        this.rings.splice(i, 1);
        continue;
      }
      const e = easeOutCubic(u);
      const rad = r.r0 + (r.r1 - r.r0) * e;
      g.ellipse(r.x, r.y, rad, rad * r.squash).stroke({ width: Math.max(0.5, r.width * (1 - u)), color: r.color, alpha: r.alpha * (1 - u) });
    }
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
    this.drum.body.scale.set((1 + sq * 0.75) * (1 + this.swell), (1 - sq) * (1 + this.swell));
    // A strike kicks the drum away from the hammer; it rocks back on a spring.
    this.kickT += dt;
    if (this.kickA > 0) {
      const kk = this.kickA * Math.exp(-this.kickT / 110) * Math.cos(this.kickT / 45);
      this.drum.root.rotation = -kk;
      if (this.kickT > 700) {
        this.kickA = 0;
        this.drum.root.rotation = 0;
      }
    }
    const lifting = this.drumLift > 0.05 || this.drumLiftTarget > 0;
    this.drumLift += (this.drumLiftTarget - this.drumLift) * Math.min(1, dt / 260);
    if (this.pedKick > 0 || lifting) {
      this.pedKick = Math.max(0, this.pedKick - dt / 380);
      const pk = 9 * this.pedKick * Math.cos((1 - this.pedKick) * 12);
      this.pedestal.root.y = PED.y + pk;
      // The Aeon drum rises off the pedestal (A10 step 4) and hovers.
      const hover = this.drumLift > 0.5 && !this.d.settings.reduceMotion ? Math.sin(this.time / 210) * 1.5 : 0;
      this.drum.root.y = PED.y + pk - this.drumLift + hover;
      this.shadow.scale.set(1 - this.drumLift / 60);
      this.shadow.alpha = 1 - this.drumLift / 30;
    }
    if (this.crateSquash > 0) {
      this.crateSquash = Math.max(0, this.crateSquash - dt / 400);
      const c = 0.22 * this.crateSquash * Math.cos((1 - this.crateSquash) * 14);
      this.crate.box.scale.set(1 + c * 0.7, 1 - c);
    }

    // Hammer: fades in, hovers, swings on strikes; before a summit strike it rises and heats white.
    this.hammerShown += (this.hammerTarget - this.hammerShown) * Math.min(1, dt / 90);
    this.hammer.root.alpha = this.hammerShown;
    this.hammer.root.x = HAMMER.x + 40 * (1 - this.hammerShown);
    this.hammerRaise += (this.hammerRaiseTarget - this.hammerRaise) * Math.min(1, dt / 140);
    this.heat += (this.heatTarget - this.heat) * Math.min(1, dt / (this.heatTarget > this.heat ? 220 : 420));
    this.hammer.setHeat(this.heat * (0.88 + 0.12 * Math.sin(this.time / 55)));
    if (this.heat > 0.4 && this.hammerShown > 0.5) {
      this.heatSparkT += dt;
      while (this.heatSparkT > (this.lite ? 90 : 45)) {
        this.heatSparkT -= this.lite ? 90 : 45;
        const h = this.hammerHead();
        this.particles.spawn({ tex: dotTexture(), x: h.x + (this.rng.next() - 0.5) * 90, y: h.y + (this.rng.next() - 0.5) * 50, vx: (this.rng.next() - 0.5) * 40, vy: -70 - this.rng.next() * 90, life: 520, scale: [0.6, 0], alpha: [0.9 * this.heat, 0], tint: 0xfff6e8, add: true });
      }
    }
    this.updateBlow(dt);

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

  /**
   * The hammer over a timed blow (its pose from `blow.ts`: notches on the ticks, the swing, the pin
   * and the rebound), with squash and stretch, the swing's smear, the glint on the last tick, the
   * closing timing ring, the pips' pops and the graded hit's star; between blows it hovers.
   */
  private updateBlow(dt: number): void {
    const rm = this.d.settings.reduceMotion;
    const b = this.blow;
    const h = this.hammer.root;
    this.smearG.clear();
    if (b) {
      const pose = blowPose(b, b.t);
      const a = pose.a;
      h.rotation = a;
      // The hand lifts the hammer with the count-in, drives it down and dips into the hit.
      const since = b.t - b.impactMs;
      const dip = since >= 0 && since < 200 ? 7 * (1 - since / 200) : 0;
      h.y = HAMMER.y - pose.lift + dip;
      // Stretch along the swing, squash on the drum, a wobble back (none with Reduce motion).
      const down0 = b.impactMs - BLOW.downMs;
      let st = 0;
      if (!rm) {
        if (b.t >= down0 && b.t < b.impactMs) st = 0.07 * span(b.t, down0, b.impactMs);
        else if (since >= 0 && since < 220) st = -0.08 * (1 - since / 220) * Math.cos(since / 34);
      }
      h.scale.set(1 - st * 0.6, 1 + st);
      // The smear: a pale band swept behind the head through the swing and just after.
      if (!rm && b.t >= down0 && since < 50) {
        const a0 = blowPose(b, Math.max(down0, b.t - 55)).a;
        const a1 = Math.min(a, a0);
        const th0 = a1 - Math.PI / 2;
        const th1 = a0 - Math.PI / 2;
        if (th1 - th0 > 0.02) {
          const fade = since > 0 ? 1 - since / 50 : 1;
          const cx = h.x;
          const cy = h.y;
          for (const [r0, r1, al] of [
            [132, 206, 0.16],
            [150, 190, 0.22],
          ] as const) {
            this.smearG.arc(cx, cy, r1, th0, th1).arc(cx, cy, r0, th1, th0, true).closePath().fill({ color: 0xfff6e8, alpha: al * fade });
          }
        }
      }
      // The glint on the hammer head: the last tick says "now it comes".
      const g0 = (SHOW_TIMING.strikeTicks - 1) * SHOW_TIMING.strikeBeatMs;
      const gu = span(b.t, g0, g0 + 170);
      if (gu > 0 && gu < 1) {
        const head = this.hammerHead();
        this.glint.position.set(head.x - 26, head.y - 22);
        this.glint.alpha = hump(gu);
        const k = rm ? 1 : 0.4 + 1.1 * hump(gu);
        this.glint.scale.set(k * 0.5);
        this.glint.rotation = rm ? 0 : gu * 1.6;
      } else this.glint.alpha = 0;
    } else {
      // Between blows the hammer hovers (and is held up high over a rising summit gem), easing in
      // from its last pose.
      const idle = HAMMER.rest - 0.2 * this.hammerRaise + Math.sin(this.time / 240) * 0.05;
      h.rotation += (idle - h.rotation) * Math.min(1, dt / 90);
      h.y += (HAMMER.y - 60 * this.hammerRaise - h.y) * Math.min(1, dt / 90);
      h.scale.set(1);
      this.glint.alpha = 0;
    }
    this.updateCue(dt);
    // The pips pop on a tick or a climb (never on a graded hit: that would read as "it almost lit"),
    // then spring back.
    for (let i = 0; i < this.pipPop.length; i++) {
      const v = this.pipPop[i] ?? 0;
      this.pips.pip(i)?.scale.set(rm ? 1 : 1 + v);
      this.pipPop[i] = v * Math.exp(-dt / 120);
    }
  }

  /**
   * The graded hit's star and glow, and the "Perfect!" pop. They run on real time through the
   * hit-stop: the world freezes, the star flares at once and holds, the pop springs up.
   */
  private updateGrade(dt: number): void {
    const rm = this.d.settings.reduceMotion;
    if (this.impactT >= 0) {
      this.impactT += dt;
      const dur = this.impactBig ? 320 : 230;
      const u = this.impactT / dur;
      if (u >= 1) {
        this.impactT = -1;
        this.impactStar.alpha = 0;
        this.impactGlow.alpha = 0;
      } else {
        const k = this.impactBig ? 1 : 0.62;
        // Full size within 40 ms, then it holds bright and fades over the rest.
        const grow = easeOutCubic(Math.min(1, this.impactT / 40));
        const fade = 1 - span(u, 0.35, 1);
        this.impactStar.alpha = rm ? 0 : fade;
        this.impactStar.scale.set(k * (0.35 + 0.75 * grow + 0.15 * u));
        this.impactStar.rotation = 0.4 * u;
        // The local bloom: additive light at the hit point in place of a screen flash.
        this.impactGlow.alpha = Math.min(1, (rm ? 0.45 : 1) * this.impactBloom * fade);
        this.impactGlow.scale.set(k * (0.8 + 0.7 * grow));
      }
    }
    this.updatePops(dt);
  }

  /** The closing timing ring (A10 step 3): neutral warm white, the same for every blow. */
  private updateCue(dt: number): void {
    const g = this.cueG;
    g.clear();
    this.cuePulse = Math.max(0, this.cuePulse - dt / 150);
    const tick = this.tapTick;
    this.tapTick = Math.max(0, this.tapTick - dt / TAP_TICK_MS);
    const b = this.blow;
    if (!b) return;
    const rm = this.d.settings.reduceMotion;
    const t = b.t;
    const I = b.impactMs;
    const cx = HIT.x - 6;
    const cy = HIT.y;
    const R = CUE_RING;
    if (tick > 0) {
      // The tap tick: a thin ring that leaves the target and fades (neutral warm white).
      const e = 1 - tick;
      g.circle(cx, cy, R.r1 + (rm ? 4 : 4 + 16 * easeOutCubic(e))).stroke({ width: 2.5, color: R.color, alpha: 0.6 * tick });
    }
    if (t < I) {
      const fade = span(t, 0, 90);
      const u = t / I;
      const p = rm ? 0 : this.cuePulse;
      // The target: where the ring will close. It pulses on each tick.
      g.circle(cx, cy, R.r1 + 7 * p).stroke({ width: 3 + 2.5 * p, color: R.color, alpha: (0.4 + 0.45 * p) * fade });
      g.circle(cx, cy, R.r1 - 6).fill({ color: R.color, alpha: (0.05 + 0.1 * u) * fade });
      for (let k = 0; k < SHOW_TIMING.strikeTicks; k++) {
        const lit = t >= k * SHOW_TIMING.strikeBeatMs;
        const [bx, by] = this.beadPos(k);
        if (lit) g.circle(bx, by, 11).fill({ color: R.bead, alpha: 0.25 * fade });
        g.circle(bx, by, lit ? 6 : 4).fill({ color: lit ? R.bead : R.color, alpha: (lit ? 1 : 0.4) * fade });
      }
      // The closing ring: linear in time, so the eye can read the hit coming.
      const r = lerp(R.r0, R.r1, u);
      g.circle(cx, cy, r).stroke({ width: 3 + 4 * u, color: R.color, alpha: (0.3 + 0.65 * u) * fade });
      g.circle(cx, cy, r + 5).stroke({ width: 8 + 6 * u, color: R.color, alpha: 0.12 * u * fade });
    } else {
      // On the beat both rings meet and ring out.
      const v = span(t, I, I + 220);
      if (v < 1) {
        const e = easeOutCubic(v);
        g.circle(cx, cy, R.r1 + (rm ? 0 : 56 * e)).stroke({ width: 7 * (1 - v), color: R.color, alpha: 0.85 * (1 - v) });
      }
    }
  }

  private updatePops(dt: number): void {
    const rm = this.d.settings.reduceMotion;
    for (let i = this.pops.length - 1; i >= 0; i--) {
      const p = this.pops[i];
      if (!p) continue;
      p.t += dt;
      const out = span(p.t, 640, 900);
      if (rm) {
        p.c.alpha = span(p.t, 0, 150) * (1 - out);
      } else {
        const inU = span(p.t, 0, p.big ? 240 : 200);
        const sc = 0.2 + 0.8 * easeOutBack(inU, p.big ? 3.2 : 2);
        p.c.scale.set(Math.max(0.05, sc) * (1 - 0.12 * out));
        p.c.alpha = 1 - out;
      }
      p.c.y = POP.y - 12 * easeOutCubic(span(p.t, 0, 640)) - 28 * easeInQuad(out);
      if (p.t >= 900) {
        p.c.destroy({ children: true });
        this.pops.splice(i, 1);
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
      let spot = 0;
      for (const v of this.fan.views) {
        const slot = v.card.slot;
        const want = slot === this.focusSlot ? 1 : 0;
        const cur = this.lift.get(slot) ?? 0;
        const next = cur + (want - cur) * Math.min(1, dt / 70);
        this.lift.set(slot, next);
        v.setLift(next);
        v.setSignal(this.signal.get(slot) ?? 0, this.time);
        spot = Math.max(spot, this.presentCard(v, want, dt));
      }
      // The rest of the fan steps back while a card holds centre stage.
      for (const v of this.fan.views) {
        const k = this.present.get(v.card.slot)?.k ?? 0;
        v.root.alpha = 1 - PRESENT.dim * clamp01(spot - Math.max(0, k));
      }
      // Walkouts own the screen; the summary dims the fan behind its panel.
      const want = this.walkout ? 0.08 : 1 - 0.94 * this.summaryDim;
      this.fanAlpha += (want - this.fanAlpha) * Math.min(1, dt / (this.walkout ? 260 : 200));
      this.fan.root.alpha = this.fanAlpha;
    }
  }

  /**
   * Moves a dealt card between its fan slot and centre stage on a spring; returns how far it is
   * presented (0..1). The wardrobe card already stands large above its crate and stays there.
   */
  private presentCard(v: CardView, want: number, dt: number): number {
    if (this.plan.mode === 'wardrobe') return 0;
    const slot = v.card.slot;
    let s = this.present.get(slot);
    if (!s) {
      if (want === 0) return 0;
      s = { k: 0, v: 0, away: false, peak: 0 };
      this.present.set(slot, s);
    }
    if (want === 0 && !s.away) return 0;
    if (this.d.settings.reduceMotion) {
      s.k += (want - s.k) * Math.min(1, dt / 90);
      s.v = 0;
    } else {
      // Semi-implicit spring in small sub-steps (stable at any frame time).
      for (let left = dt; left > 0; left -= 8) {
        const h = Math.min(8, left) / 1000;
        s.v += (PRESENT.omega * PRESENT.omega * (want - s.k) - 2 * PRESENT.zeta * PRESENT.omega * s.v) * h;
        s.k += s.v * h;
      }
    }
    s.away = true;
    s.peak = Math.max(s.peak, s.k);
    const k = s.k;
    const home = v.home;
    v.root.position.set(lerp(home.x, PRESENT.x, k), lerp(home.y, PRESENT.y, k));
    v.root.scale.set(Math.max(0.2, lerp(home.scale, PRESENT_SCALE[v.card.rarity], k)));
    // Follow-through: the card leans into its flight.
    const lean = this.d.settings.reduceMotion ? 0 : Math.max(-0.22, Math.min(0.22, s.v * 0.0016 * Math.sign(PRESENT.x - home.x || 1)));
    v.root.rotation = lerp(home.rot, 0, clamp01(k)) + lean;
    v.root.zIndex = 150 + (want > 0 ? 50 : 0) + Math.round(10 * clamp01(k));
    if (want === 0 && Math.abs(k) < 0.004 && Math.abs(s.v) < 0.05) {
      // Home again: snap exactly into the slot with a little landing pop.
      s.away = false;
      s.k = 0;
      s.v = 0;
      v.root.position.set(home.x, home.y);
      v.root.scale.set(home.scale);
      v.root.rotation = home.rot;
      v.root.zIndex = slot;
    }
    if (want === 0 && s.peak > 0.5 && k < 0.15) {
      s.peak = 0;
      v.pop(0.1);
      this.ring(home.x, home.y + (CARD_H / 2) * home.scale, 16, 90 * home.scale, RARITY_COLORS[v.card.rarity], 5, 260, 0.55, 0.3);
    }
    return clamp01(k);
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
