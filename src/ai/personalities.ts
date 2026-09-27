/**
 * Personalities of the AI Generals (DESIGN A7.4) and the `BotProfile` builder.
 *
 * The numbers (weights, counter weight, signature cards, which personality a General has) are content
 * (`content.generals`, WP1). This module holds the rules each personality adds on top of the shared
 * utility brain (A7.2): its opening build, group leanings and signature behaviours. The AI layer may
 * not import `src/content` (DESIGN B2), so it reads the General table through the contract's untyped
 * `CompiledContent.generals` slot with a runtime shape check, and falls back to the Balanced brain.
 */
import type { BotProfile, CardId, CompiledContent, RoleGroup } from '@/contracts';
import { BP } from '@/core';

export type PersonalityId =
  | 'tutorial'
  | 'balanced'
  | 'rusher'
  | 'turtle'
  | 'greedy'
  | 'artillery'
  | 'counters'
  | 'counterPicker'
  | 'powerTiming'
  | 'boss'
  | 'mirror';

export type Weights = BotProfile['weights'];

/** Rules a personality adds to the shared utility brain (DESIGN A7.4 "Signature"). */
export interface Personality {
  id: PersonalityId;
  /** Multiplier on the counter term of train scores in bp (Rook ×1.5). */
  counterWeightBp: number;
  /** Added to train scores per role group, in bp of score (Kettle leans on Infantry, Pip on Heavies). */
  groupBiasBp: Partial<Record<RoleGroup, number>>;
  /** Signature cards get `signatureBiasBp` on train and turret scores (Boomsworth's artillery). */
  signatureCards: readonly CardId[];
  signatureBiasBp: number;
  /** Kettle: an all-in push before each evolve. */
  allInBeforeEvolve: boolean;
  /** Ledger: Treasury to this level by `treasuryRushByMs`, overriding the tier's Treasury max. */
  treasuryRushLevel: number;
  treasuryRushByMs: number;
  /** Push gate factor before Overdrive in bp (A7.2 default 1.3; Moss holds out until Overdrive). */
  pushGateBp: number;
  /** Tempest: banks the power for evolve moments (the foe's and its own). */
  powerForEvolveMoments: boolean;
  /** Old Grogg: never evolves. */
  neverEvolves: boolean;
  /** Old Grogg: scripted brain instead of the utility AI. */
  scripted: boolean;
  /** The default opening build (DESIGN A7.2 Openings), in the `openings.ts` step language. */
  opening: readonly string[];
}

/** A7.2: "The bot Charges past mid-lane only when myArmy ≥ 1.3 × D". */
export const DEFAULT_PUSH_GATE_BP = 13000;

const BASE: Personality = {
  id: 'balanced',
  counterWeightBp: BP,
  groupBiasBp: {},
  signatureCards: [],
  signatureBiasBp: 0,
  allInBeforeEvolve: false,
  treasuryRushLevel: 0,
  treasuryRushByMs: 0,
  pushGateBp: DEFAULT_PUSH_GATE_BP,
  powerForEvolveMoments: false,
  neverEvolves: false,
  scripted: false,
  opening: ['train:infantry', 'train:ranged', 'train:infantry|train:ranged'],
};

/** Personality rules by id. Content supplies the weights, counter weight and signature cards. */
const RULES: Record<PersonalityId, Omit<Personality, 'counterWeightBp' | 'signatureCards' | 'neverEvolves' | 'scripted'>> = {
  // Old Grogg: the brain is scripted.ts; these only matter if a script is missing.
  tutorial: { ...BASE, id: 'tutorial', opening: [] },
  // Pip Quickstep: "Opens Ranged then Infantry, then leans on Heavies". Pip is the only General with
  // this personality; the plain Balanced brain is `mirror`.
  balanced: { ...BASE, groupBiasBp: { heavy: 1500 }, opening: ['train:ranged', 'train:infantry', 'train:infantry|train:ranged'] },
  // Captain Kettle: "Infantry spam, all-in before each evolve".
  rusher: {
    ...BASE,
    id: 'rusher',
    groupBiasBp: { infantry: 2500 },
    allInBeforeEvolve: true,
    opening: ['train:infantry', 'train:infantry', 'train:infantry|train:ranged', 'train:infantry'],
  },
  // Mama Moss: "Early turrets, Hold, pushes in Overdrive".
  turtle: { ...BASE, id: 'turtle', pushGateBp: 20000, opening: ['turret', 'train:ranged', 'train:infantry', 'mount|train:ranged'] },
  // Baroness Ledger: "Treasury 3 by 2:30, evolves first, weak before 1:00".
  greedy: {
    ...BASE,
    id: 'greedy',
    treasuryRushLevel: 3,
    treasuryRushByMs: 150000,
    opening: ['train:infantry', 'treasury', 'train:ranged', 'treasury|train:infantry'],
  },
  // Sgt. Boomsworth: "Trebuchet, Bronze Cannon, Howitzer, Grenadier".
  artillery: { ...BASE, id: 'artillery', signatureBiasBp: 2500, opening: ['train:infantry', 'train:ranged', 'turret', 'train:ranged|train:infantry'] },
  // Ada & Ivo: balanced counters.
  counters: { ...BASE, id: 'counters', opening: ['train:infantry', 'train:ranged', 'train:antiArmor|train:heavy'] },
  // Rook: "Counter weight ×1.5, switches within seconds" (the weight comes from content).
  counterPicker: { ...BASE, id: 'counterPicker', opening: ['train:ranged', 'train:infantry', 'train:infantry|train:antiArmor'] },
  // Madame Tempest: "Banks powers for evolve moments and clumps".
  powerTiming: {
    ...BASE,
    id: 'powerTiming',
    powerForEvolveMoments: true,
    opening: ['train:infantry', 'train:ranged', 'train:ranged|train:infantry', 'turret'],
  },
  // The Warden: all-round boss with Legendaries.
  boss: { ...BASE, id: 'boss', opening: ['train:infantry', 'train:ranged', 'train:heavy', 'turret|treasury'] },
  // Echo of You: "Plays your own active War Plan with the Balanced brain".
  mirror: { ...BASE, id: 'mirror' },
};

const PERSONALITY_IDS = Object.keys(RULES) as PersonalityId[];

function isPersonalityId(v: unknown): v is PersonalityId {
  return typeof v === 'string' && (PERSONALITY_IDS as string[]).includes(v);
}

/** The fields of a content `GeneralDef` (src/content/types.ts) the AI reads. */
export interface GeneralInfo {
  id: string;
  personality: PersonalityId;
  weights: Weights;
  counterWeightBp: number;
  signatureCards: CardId[];
  neverEvolves: boolean;
  scripted: boolean;
}

const WEIGHT_KEYS: readonly (keyof Weights)[] = ['aggr', 'turret', 'economy', 'greed', 'patience', 'legendary', 'hold'];

/** The Balanced weights (all 50), used when content has no General table (the fakes). */
export const BALANCED_WEIGHTS: Weights = { aggr: 50, turret: 50, economy: 50, greed: 50, patience: 50, legendary: 50, hold: 50 };

function readWeights(v: unknown): Weights | null {
  if (typeof v !== 'object' || v === null) return null;
  const o = v as Record<string, unknown>;
  const out = { ...BALANCED_WEIGHTS };
  for (const k of WEIGHT_KEYS) {
    const w = o[k];
    if (typeof w !== 'number' || !Number.isFinite(w)) return null;
    out[k] = w;
  }
  return out;
}

/**
 * Reads one General from `content.generals` (typed as `unknown` in the contract). Returns null when
 * the content has no General table (the fakes) or no such General.
 */
export function readGeneral(content: CompiledContent, id: string): GeneralInfo | null {
  const tables = content.generals as { list?: Record<string, unknown> } | null | undefined;
  const list = tables && typeof tables === 'object' ? tables.list : undefined;
  if (!list || typeof list !== 'object' || !Object.hasOwn(list, id)) return null;
  const g = list[id] as Record<string, unknown> | null;
  if (!g || typeof g !== 'object') return null;
  const personality = isPersonalityId(g.personality) ? g.personality : 'balanced';
  const cards = Array.isArray(g.signatureCards) ? g.signatureCards.filter((c): c is string => typeof c === 'string') : [];
  return {
    id,
    personality,
    weights: readWeights(g.weights) ?? { ...BALANCED_WEIGHTS },
    counterWeightBp: typeof g.counterWeightBp === 'number' && g.counterWeightBp > 0 ? Math.trunc(g.counterWeightBp) : BP,
    signatureCards: cards,
    neverEvolves: g.neverEvolves === true,
    scripted: g.scripted === true,
  };
}

/**
 * The General id whose brain is the plain Balanced brain (all weights 50, no signature): Echo of You
 * (A7.4). The A2.14 balance runs and the tier tests use it.
 */
export const BALANCED_BRAIN_ID = 'echo';

/**
 * The personality rules for a General id, with the content-owned numbers filled in. Unknown ids (and
 * content without a General table) get the plain Balanced brain; `grogg` stays scripted.
 */
export function personalityFor(content: CompiledContent, generalId: string): Personality {
  const g = readGeneral(content, generalId);
  const id: PersonalityId = g?.personality ?? (generalId === 'grogg' ? 'tutorial' : 'mirror');
  const rules = RULES[id];
  return {
    ...rules,
    counterWeightBp: g?.counterWeightBp ?? BP,
    signatureCards: g?.signatureCards ?? [],
    neverEvolves: g?.neverEvolves ?? id === 'tutorial',
    scripted: g?.scripted ?? id === 'tutorial',
  };
}

/** Personality multiplier m = 0.5 + w / 100, in bp (DESIGN A7.2 "Weights"). */
export function weightBp(w: number): number {
  const c = w < 0 ? 0 : w > 100 ? 100 : Math.trunc(w);
  return 5000 + c * 100;
}

export interface BotProfileOptions {
  /** The General shown to the player (or `echo`). */
  generalId: string;
  tier: number;
  /** Extra mistake rate in bp (warm-up matches, A6.8). */
  mistakeBonusBp?: number;
  /**
   * Procedural AI Commanders copy a ladder General's personality (A7.4): pass that General's id. The
   * profile then carries its weights and rules; the display name stays the session's business.
   */
  personalityOf?: string;
  /** A Commander's favourite card: it gets a small train bonus (A7.4). */
  favoriteCard?: CardId;
  /** Replaces the personality's default opening (for example the tutorial's Old Grogg script). */
  openings?: string[];
}

/**
 * Builds the `BotProfile` for a General at a tier from content (weights) and the personality rules
 * (opening). The session (WP11) and the headless tools (WP12) call this; `createBot` accepts any
 * profile, so tests may also build one by hand.
 */
export function botProfile(content: CompiledContent, o: BotProfileOptions): BotProfile {
  const source = o.personalityOf ?? o.generalId;
  const g = readGeneral(content, source);
  const p = personalityFor(content, source);
  const openings = [...(o.openings ?? p.opening)];
  if (o.favoriteCard) openings.push(`favorite:${o.favoriteCard}`);
  return {
    generalId: source,
    tier: o.tier,
    mistakeBonusBp: Math.max(0, Math.trunc(o.mistakeBonusBp ?? 0)),
    weights: g ? { ...g.weights } : { ...BALANCED_WEIGHTS },
    openings,
  };
}
