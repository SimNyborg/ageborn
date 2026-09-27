/**
 * The show plan: the A10 storyboard as data (DESIGN A10, A10.1).
 *
 * `planCapsuleShow`, `planOpenAll` and `planWardrobeShow` turn reveal data into an ordered list of
 * timed steps with their sound cues. The plan is pure, so the time limits, the back-loaded climb
 * and the skip rules are tested without a renderer (`checkPlan`), and the runner and the Pixi stage
 * only play it back. The result is rolled and saved before any of this runs (A6.4, B8).
 */
import type { CapsuleReveal, CapsuleTier, Foil, Rarity, SoundId, WardrobeReveal } from '@/contracts';
import { buildReelLayout, reelTicks, reelTilesForView, type ReelLayout } from './reelMath';
import {
  buildSummary,
  buildWardrobeSummary,
  crateCard,
  RARITY_RANK,
  revealCards,
  type RevealCard,
  type SummaryModel,
} from './summary';
import { isBackLoaded, resolveStrikes, STRIKES, tierIndex } from './tiers';
import type { CapsuleCatalog, CardProgress, ProgressLookup } from './types';

/** Step durations (A10 table). All in ms. */
export const SHOW_TIMING = {
  arrivalMs: 500,
  /** The capsule touches the pedestal (thud, dust ring). */
  arrivalImpactMs: 220,
  chargeMs: 1500,
  strikeMs: 600,
  /** The hammer lands this long after the tap. */
  strikeImpactMs: 90,
  /** A strike fires by itself after this much idle time (A10 step 3). */
  strikeIdleMs: 1500,
  burstMs: 300,
  fanBaseMs: 350,
  fanPerCardMs: 70,
  signalMs: 300,
  flipMs: { common: 150, rare: 400, epic: 800, legendary: 400 } as Readonly<Record<Rarity, number>>,
  foilMs: { none: 0, bronze: 500, silver: 500, holo: 1000 } as Readonly<Record<Foil, number>>,
  stampMs: 450,
  miniWalkoutMs: 2000,
  walkoutFirstMs: 9000,
  walkoutRepeatMs: 3000,
  duplicateMs: 500,
  volleyPerCapsuleMs: 150,
  volleyMinMs: 600,
  volleyMaxMs: 2000,
  crateArrivalMs: 500,
  reelWinnerMs: 1600,
} as const;

/** Upper bounds per step (A10). `checkPlan` enforces them for every plan. */
export const SHOW_LIMITS = {
  arrival: 500,
  charge: 1500,
  strike: 600,
  strikeIdle: 1500,
  burst: 300,
  fan: 1000,
  signal: 300,
  flip: 800,
  foil: 1000,
  stamp: 500,
  miniWalkout: 2000,
  walkoutFirstMin: 8000,
  walkoutFirstMax: 10000,
  walkoutRepeat: 3000,
  duplicates: 500,
  volley: 2000,
  crateArrival: 500,
  reel: 5500,
  reelWinner: 2000,
  /** A10 Rules: nothing runs longer than 10 s without a skip. */
  unskippable: 10000,
} as const;

/** Beats of a Legendary walkout, ms from its start (A10 step 6). */
export interface WalkoutBeats {
  /** Screen dims to a spotlight, rings spin. */
  dim: [number, number];
  /** Legendary rarity flare. */
  flare: [number, number];
  /** Gold-rimmed silhouette grows from 20% to full size. */
  grow: [number, number];
  /** Bass drop: the unit bursts into colour. */
  drop: number;
  /** Signature move across a lane backdrop. */
  move: [number, number];
  /** Victory pose. */
  pose: [number, number];
  /** Age glyph and name banner, "LEGENDARY", confetti, NEW or the copies bar. */
  banner: [number, number];
}

export const WALKOUT_BEATS: Readonly<{ first: WalkoutBeats; repeat: WalkoutBeats }> = {
  first: { dim: [0, 700], flare: [700, 1500], grow: [1500, 4000], drop: 4000, move: [4150, 6600], pose: [6600, 7500], banner: [7500, 9000] },
  repeat: { dim: [0, 150], flare: [150, 450], grow: [450, 1000], drop: 1000, move: [1080, 2000], pose: [2000, 2400], banner: [2150, 3000] },
};

/** Beats of the NEW Epic mini-walkout (A10 step 5). */
export const MINI_BEATS = { pop: [0, 450], act: [450, 1250], pose: [1250, 1600], out: [1600, 2000] } as const;

export interface Cue {
  atMs: number;
  sound: SoundId;
  /** Playback rate in bp, 10,000 = unchanged (same convention as the battle view). */
  pitchBp?: number;
  volumeDb?: number;
}

interface StepBase {
  /** Unique within a plan, e.g. `strike-2`, `flip-c:bonker`. */
  id: string;
  durationMs: number;
  /** The Skip button may pass over this step (A10: everything but a first-ever Legendary walkout). */
  skippable: boolean;
  /** Holding fast-forwards this step. */
  fastForward: boolean;
  cues: Cue[];
}

export type ArrivalStep = StepBase & { kind: 'arrival'; tier: CapsuleTier };
export type ChargeStep = StepBase & { kind: 'charge'; tier: CapsuleTier };
export type StrikeStep = StepBase & {
  kind: 'strike';
  /** 0..3 */
  index: number;
  climb: boolean;
  from: CapsuleTier;
  to: CapsuleTier;
  /** Waits for a tap, at most this long (A10 step 3: auto after 1.5 s idle). */
  maxWaitMs: number;
};
export type BurstStep = StepBase & { kind: 'burst'; tier: CapsuleTier; fixed: boolean; amber: number };
export type VolleyStep = StepBase & { kind: 'volley'; tiers: CapsuleTier[]; amber: number };
export type FanStep = StepBase & { kind: 'fan'; cards: RevealCard[] };
export type SignalStep = StepBase & { kind: 'signal'; card: RevealCard };
export type FlipStep = StepBase & { kind: 'flip'; card: RevealCard; flipMs: number; foilMs: number; stampMs: number };
export type WalkoutStep = StepBase & { kind: 'walkout'; card: RevealCard; first: boolean; beats: WalkoutBeats };
export type MiniWalkoutStep = StepBase & { kind: 'miniWalkout'; card: RevealCard };
export type DuplicatesStep = StepBase & { kind: 'duplicates'; card: RevealCard; progress: CardProgress | null; ticks: number };
export type CrateArrivalStep = StepBase & { kind: 'crateArrival' };
export type ReelStep = StepBase & { kind: 'reel'; reel: ReelLayout };
export type ReelWinnerStep = StepBase & { kind: 'reelWinner'; card: RevealCard };
export type SummaryStep = StepBase & { kind: 'summary' };

export type ShowStep =
  | ArrivalStep
  | ChargeStep
  | StrikeStep
  | BurstStep
  | VolleyStep
  | FanStep
  | SignalStep
  | FlipStep
  | WalkoutStep
  | MiniWalkoutStep
  | DuplicatesStep
  | CrateArrivalStep
  | ReelStep
  | ReelWinnerStep
  | SummaryStep;

export type StepKind = ShowStep['kind'];

export interface ShowPlan {
  mode: 'single' | 'openAll' | 'wardrobe';
  steps: ShowStep[];
  /** Cards in the fan, in reveal order (rarest last). */
  cards: RevealCard[];
  summary: SummaryModel;
  /** Tier the drum shows first; null without a drum (wardrobe). */
  startTier: CapsuleTier | null;
  finalTier: CapsuleTier | null;
  /** Data inconsistencies noticed while planning (dev log only; the show stays honest). */
  issues: string[];
}

export interface PlanOptions {
  catalog: CapsuleCatalog;
  progress?: ProgressLookup;
}

function step<T extends ShowStep>(s: Omit<T, 'skippable' | 'fastForward' | 'cues'> & Partial<StepBase>): T {
  const cues = (s.cues ?? []).slice().sort((a, b) => a.atMs - b.atMs);
  return { skippable: true, fastForward: true, ...s, cues } as T;
}

function signalSound(r: Rarity, kind: RevealCard['kind']): SoundId | null {
  // A Legendary card's sound belongs to its walkout flare; a Legendary skin has no walkout.
  if (r === 'legendary') return kind === 'skin' ? 'rarity_legendary' : null;
  return `rarity_${r}`;
}

function cardSteps(card: RevealCard): ShowStep[] {
  const T = SHOW_TIMING;
  const out: ShowStep[] = [];
  const sig = signalSound(card.rarity, card.kind);
  out.push(
    step<SignalStep>({
      kind: 'signal',
      id: `signal-${card.key}`,
      durationMs: T.signalMs,
      card,
      cues: sig ? [{ atMs: 0, sound: sig, ...(card.rarity === 'common' ? { volumeDb: -4 } : {}) }] : [],
    }),
  );
  const legendaryWalkout = card.kind === 'card' && card.rarity === 'legendary';
  if (legendaryWalkout) {
    const first = card.firstLegendary;
    const beats = first ? WALKOUT_BEATS.first : WALKOUT_BEATS.repeat;
    out.push(
      step<WalkoutStep>({
        kind: 'walkout',
        id: `walkout-${card.key}`,
        durationMs: first ? T.walkoutFirstMs : T.walkoutRepeatMs,
        card,
        first,
        beats,
        // A10 step 6: skippable only after the first time that card is revealed.
        skippable: !first,
        fastForward: !first,
        cues: [
          { atMs: beats.flare[0], sound: 'rarity_legendary' },
          { atMs: beats.drop, sound: 'walkout_bass' },
          { atMs: beats.drop + 60, sound: 'spawn_legendary' },
        ],
      }),
    );
  }
  const flipMs = card.kind === 'skin' && card.rarity === 'legendary' ? T.flipMs.epic : T.flipMs[card.rarity];
  const foilMs = T.foilMs[card.foil];
  const stamped = card.isNew || card.kind === 'skin';
  const stampMs = stamped ? T.stampMs : 0;
  const flipCues: Cue[] = [{ atMs: 0, sound: 'card_flip' }];
  if (foilMs > 0) flipCues.push({ atMs: flipMs, sound: 'foil_shine', ...(card.foil === 'holo' ? { pitchBp: 11000 } : {}) });
  if (stamped) flipCues.push({ atMs: flipMs + foilMs + 60, sound: 'ui_confirm' });
  out.push(
    step<FlipStep>({
      kind: 'flip',
      id: `flip-${card.key}`,
      durationMs: flipMs + foilMs + stampMs,
      card,
      flipMs,
      foilMs,
      stampMs,
      cues: flipCues,
    }),
  );
  if (card.kind === 'card' && card.rarity === 'epic' && card.isNew) {
    out.push(
      step<MiniWalkoutStep>({
        kind: 'miniWalkout',
        id: `mini-${card.key}`,
        durationMs: T.miniWalkoutMs,
        card,
        cues: [
          { atMs: 150, sound: 'spawn_heavy' },
          { atMs: 700, sound: 'swing_whoosh' },
        ],
      }),
    );
  }
  return out;
}

function duplicateStep(card: RevealCard, progress: ProgressLookup | undefined): DuplicatesStep {
  const p = card.kind === 'card' && progress ? progress(card.card, card.rarity) : null;
  const ticks = Math.max(1, Math.min(10, card.copies));
  const cues: Cue[] = [];
  const span = 280;
  for (let i = 0; i < ticks; i++) {
    cues.push({ atMs: 120 + Math.round((i * span) / ticks), sound: 'copy_tick', pitchBp: 10000 + i * 350 });
  }
  const becameReady = p !== null && p.need !== null && p.after >= p.need && p.before < p.need;
  if (becameReady) cues.push({ atMs: 420, sound: 'upgrade_ready' });
  return step<DuplicatesStep>({
    kind: 'duplicates',
    id: `dup-${card.key}`,
    durationMs: SHOW_TIMING.duplicateMs,
    card,
    progress: p,
    ticks,
    cues,
  });
}

function fanStep(cards: RevealCard[]): FanStep {
  const T = SHOW_TIMING;
  const durationMs = Math.min(SHOW_LIMITS.fan, T.fanBaseMs + T.fanPerCardMs * cards.length);
  const per = cards.length > 0 ? Math.min(T.fanPerCardMs, (durationMs - 200) / cards.length) : 0;
  return step<FanStep>({
    kind: 'fan',
    id: 'fan',
    durationMs,
    cards,
    cues: cards.map((_, i) => ({ atMs: Math.round(i * per), sound: 'card_flip', pitchBp: 8200 + i * 150, volumeDb: -9 })),
  });
}

function summaryStep(): SummaryStep {
  return step<SummaryStep>({ kind: 'summary', id: 'summary', durationMs: Infinity, fastForward: false });
}

function burstCues(tier: CapsuleTier): Cue[] {
  const idx = tierIndex(tier);
  const cues: Cue[] = [{ atMs: 0, sound: 'cap_burst' }];
  // The tier stinger reuses the climb note of the final tier (A13 has no separate stinger ids).
  if (idx > 0) cues.push({ atMs: 60, sound: `cap_climb_${idx}`, volumeDb: -3 });
  return cues;
}

/** The full A10 storyboard for one capsule. */
export function planCapsuleShow(reveal: CapsuleReveal, o: PlanOptions): ShowPlan {
  const T = SHOW_TIMING;
  const cap = reveal.capsule;
  const steps: ShowStep[] = [];
  const climbs = o.catalog.hasClimb(cap.kind);
  const strikes = resolveStrikes(reveal);
  const issues = strikes.issues.slice();
  if (climbs) {
    steps.push(
      step<ArrivalStep>({
        kind: 'arrival',
        id: 'arrival',
        durationMs: T.arrivalMs,
        tier: strikes.startShown,
        cues: [{ atMs: T.arrivalImpactMs, sound: 'cap_thud' }],
      }),
      step<ChargeStep>({
        kind: 'charge',
        id: 'charge',
        durationMs: T.chargeMs,
        tier: strikes.startShown,
        cues: [{ atMs: 0, sound: 'cap_riser' }],
      }),
    );
    let from = strikes.startShown;
    for (let i = 0; i < STRIKES; i++) {
      const climb = strikes.strikes[i] === true;
      const to = strikes.tiersAfter[i] ?? from;
      steps.push(
        step<StrikeStep>({
          kind: 'strike',
          id: `strike-${i}`,
          durationMs: T.strikeMs,
          index: i,
          climb,
          from,
          to,
          maxWaitMs: T.strikeIdleMs,
          // Each climb is a step higher: the note of the tier reached (cap_climb_1 = Bronze ... 4 = Aeon).
          cues: [{ atMs: T.strikeImpactMs, sound: climb ? `cap_climb_${tierIndex(to)}` : 'cap_clunk' }],
        }),
      );
      from = to;
    }
  } else if (cap.startTier !== cap.tier) {
    issues.push(`fixed-tier ${cap.kind} capsule has start tier ${cap.startTier} and tier ${cap.tier}; showing ${cap.tier}`);
  }
  steps.push(
    step<BurstStep>({
      kind: 'burst',
      id: 'burst',
      durationMs: T.burstMs,
      tier: cap.tier,
      fixed: !climbs,
      amber: cap.contents.amber,
      cues: burstCues(cap.tier),
    }),
  );
  const cards = revealCards([reveal], o.catalog);
  if (cards.length > 0) steps.push(fanStep(cards));
  for (const c of cards) steps.push(...cardSteps(c));
  for (const c of cards) if (c.kind === 'card' && (c.copies > 0 || c.dust > 0)) steps.push(duplicateStep(c, o.progress));
  steps.push(summaryStep());
  return {
    mode: 'single',
    steps,
    cards,
    summary: buildSummary([reveal], cards, o.progress),
    startTier: climbs ? strikes.startShown : cap.tier,
    finalTier: cap.tier,
    issues,
  };
}

/** "Open all": the summary plus any Epic-or-better reveals (A10 Rules). */
export function planOpenAll(reveals: readonly CapsuleReveal[], o: PlanOptions): ShowPlan {
  if (reveals.length === 1 && reveals[0]) return planCapsuleShow(reveals[0], o);
  const T = SHOW_TIMING;
  const all = revealCards(reveals, o.catalog);
  const shown = all.filter((c) => RARITY_RANK[c.rarity] >= RARITY_RANK.epic);
  shown.forEach((c, i) => (c.slot = i));
  const tiers = reveals.map((r) => r.capsule.tier);
  const amber = reveals.reduce((s, r) => s + r.capsule.contents.amber, 0);
  const per = Math.min(T.volleyPerCapsuleMs, (T.volleyMaxMs - 300) / Math.max(1, reveals.length));
  const volleyMs = Math.max(T.volleyMinMs, Math.min(T.volleyMaxMs, Math.round(300 + per * reveals.length)));
  const steps: ShowStep[] = [
    step<VolleyStep>({
      kind: 'volley',
      id: 'volley',
      durationMs: volleyMs,
      tiers,
      amber,
      cues: tiers.map((_, i) => ({ atMs: Math.round(i * per), sound: 'cap_burst', pitchBp: Math.min(12000, 9000 + i * 250), volumeDb: -2 })),
    }),
  ];
  if (shown.length > 0) steps.push(fanStep(shown));
  for (const c of shown) steps.push(...cardSteps(c));
  steps.push(summaryStep());
  const issues = reveals.flatMap((r, i) => resolveStrikes(r).issues.map((s) => `capsule ${i}: ${s}`));
  // Summary covers everything; its slots follow the full reveal order.
  const summaryCards = revealCards(reveals, o.catalog);
  return {
    mode: 'openAll',
    steps,
    cards: shown,
    summary: buildSummary(reveals, summaryCards, o.progress),
    startTier: null,
    finalTier: null,
    issues,
  };
}

export interface WardrobePlanOptions {
  catalog: CapsuleCatalog;
  /** `platform.features.reelReveal` (A10.1); off → a card-flip reveal replaces the reel. */
  reelReveal: boolean;
}

/** Wardrobe Crate: the CS-style reel, or a card flip when the flag is off (A10.1). */
export function planWardrobeShow(reveal: WardrobeReveal, o: WardrobePlanOptions): ShowPlan {
  const T = SHOW_TIMING;
  const card = crateCard(reveal, o.catalog);
  const steps: ShowStep[] = [
    step<CrateArrivalStep>({
      kind: 'crateArrival',
      id: 'crateArrival',
      durationMs: T.crateArrivalMs,
      cues: [{ atMs: T.arrivalImpactMs, sound: 'cap_thud' }],
    }),
  ];
  if (o.reelReveal) {
    const rarityOf = (s: string) => (s === reveal.crate.skin ? reveal.crate.rarity : o.catalog.skin(s).rarity);
    const reel = buildReelLayout(reelTilesForView(reveal, rarityOf), reveal.stopOffsetBp, reveal.winnerIndex);
    steps.push(
      step<ReelStep>({
        kind: 'reel',
        id: 'reel',
        durationMs: reel.durationMs,
        reel,
        cues: reelTicks(reel).map((t) => ({ atMs: t.atMs, sound: 'reel_tick', pitchBp: t.pitchBp })),
      }),
      step<ReelWinnerStep>({
        kind: 'reelWinner',
        id: 'reelWinner',
        durationMs: T.reelWinnerMs,
        card,
        cues: [
          { atMs: 0, sound: 'cap_burst' },
          { atMs: 80, sound: `rarity_${card.rarity}` },
        ],
      }),
    );
  } else {
    steps.push(...cardSteps(card));
  }
  steps.push(summaryStep());
  return {
    mode: 'wardrobe',
    steps,
    cards: [card],
    summary: buildWardrobeSummary(card),
    startTier: null,
    finalTier: null,
    issues: [],
  };
}

/** Every step's A10 limit; returns human-readable violations (empty = the plan is within the rules). */
export function checkPlan(plan: ShowPlan): string[] {
  const L = SHOW_LIMITS;
  const out: string[] = [];
  const over = (s: ShowStep, what: string, v: number, max: number) => {
    if (v > max) out.push(`${s.id}: ${what} ${v} ms exceeds ${max} ms`);
  };
  const strikes: boolean[] = [];
  for (const s of plan.steps) {
    if (!s.skippable && s.durationMs > L.unskippable) out.push(`${s.id}: ${s.durationMs} ms without a skip`);
    if (s.kind !== 'summary' && !Number.isFinite(s.durationMs)) out.push(`${s.id}: endless step`);
    for (const c of s.cues) if (c.atMs < 0 || c.atMs > s.durationMs) out.push(`${s.id}: cue ${c.sound} at ${c.atMs} ms is outside the step`);
    switch (s.kind) {
      case 'arrival':
        over(s, 'arrival', s.durationMs, L.arrival);
        break;
      case 'charge':
        over(s, 'charge', s.durationMs, L.charge);
        break;
      case 'strike':
        over(s, 'strike', s.durationMs, L.strike);
        over(s, 'idle wait', s.maxWaitMs, L.strikeIdle);
        strikes.push(s.climb);
        break;
      case 'burst':
        over(s, 'burst', s.durationMs, L.burst);
        break;
      case 'volley':
        over(s, 'volley', s.durationMs, L.volley);
        break;
      case 'fan':
        over(s, 'fan', s.durationMs, L.fan);
        break;
      case 'signal':
        over(s, 'pre-signal', s.durationMs, L.signal);
        break;
      case 'flip':
        over(s, 'flip', s.flipMs, L.flip);
        over(s, 'foil sweep', s.foilMs, L.foil);
        over(s, 'NEW stamp', s.stampMs, L.stamp);
        if (s.card.rarity === 'common' && s.card.kind === 'card' && s.flipMs !== SHOW_TIMING.flipMs.common) out.push(`${s.id}: common flip must be 150 ms`);
        break;
      case 'walkout':
        if (s.first) {
          if (s.durationMs < L.walkoutFirstMin || s.durationMs > L.walkoutFirstMax) out.push(`${s.id}: first walkout ${s.durationMs} ms is outside 8-10 s`);
          if (s.skippable) out.push(`${s.id}: a first-ever walkout is not skippable`);
        } else {
          over(s, 'repeat walkout', s.durationMs, L.walkoutRepeat);
          if (!s.skippable) out.push(`${s.id}: a repeat walkout must be skippable`);
        }
        break;
      case 'miniWalkout':
        over(s, 'mini-walkout', s.durationMs, L.miniWalkout);
        break;
      case 'duplicates':
        over(s, 'duplicates', s.durationMs, L.duplicates);
        break;
      case 'crateArrival':
        over(s, 'crate arrival', s.durationMs, L.crateArrival);
        break;
      case 'reel':
        over(s, 'reel', s.durationMs, L.reel);
        break;
      case 'reelWinner':
        over(s, 'winner', s.durationMs, L.reelWinner);
        break;
      case 'summary':
        break;
    }
  }
  if (!isBackLoaded(strikes)) out.push(`strikes [${strikes.join(',')}]: a climb is followed by a non-climb`);
  if (plan.steps[plan.steps.length - 1]?.kind !== 'summary') out.push('the plan does not end in the summary');
  return out;
}

/** Longest stretch of consecutive steps the player cannot skip (A10 Rules). */
export function longestUnskippableMs(plan: ShowPlan): number {
  let best = 0;
  let run = 0;
  for (const s of plan.steps) {
    if (s.skippable || s.kind === 'summary') run = 0;
    else run += s.durationMs;
    best = Math.max(best, run);
  }
  return best;
}

/** Nominal duration at 1× with instant taps (strikes do not wait), summary excluded. */
export function nominalDurationMs(plan: ShowPlan): number {
  return plan.steps.reduce((s, st) => (st.kind === 'summary' ? s : s + st.durationMs), 0);
}
