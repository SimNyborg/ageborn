/**
 * Progress view models: arena, unlocks (A3, A8, A9 #3), capsule charges and the Supply Capsule
 * (A6.3), quests (A6.7), Trophy Road nodes (A6.3) and the Conquest board (A6.10).
 * Pure over (save, content, now); the screens only render them.
 */
import type { ArenaDef, DailyDifficulty, Difficulty, GeneralDef, LadderWin, QuestDef, RoadNode } from '@/content/types';
import type { Content } from '@/content/types';
import type { CapsuleTier, FormatId, SaveDoc } from '@/contracts';
import { byVisibleTier } from '../../components/capsuleLook';

/** The player's arena (`save.arenaIndex` is 0-based into `arenas.list`). */
export function arenaOf(save: SaveDoc, content: Content): ArenaDef {
  const list = content.arenas.list;
  return list[Math.max(0, Math.min(list.length - 1, save.arenaIndex))]!;
}

export function nextArena(save: SaveDoc, content: Content): ArenaDef | null {
  return content.arenas.list[save.arenaIndex + 1] ?? null;
}

/**
 * Matches before the War Plan screen, Customize and Skirmish open. A8 had "after match 3"; since the
 * owner feedback of 2026-09-28 they open right after the training match.
 */
export const WAR_PLAN_UNLOCK_MATCHES = 1;

/** `SaveDoc.tutorial.step` while onboarding match 2 (vs Pip) is next; it starts from Home's Battle. */
export const MATCH2_STEP = 2;

/** True while the next battle is onboarding match 2, suggested by Home's Battle button. */
export function match2Next(save: SaveDoc): boolean {
  return save.tutorial.step === MATCH2_STEP;
}

// ---------------------------------------------------------------------------------------------
// Difficulty (owner feedback 2026-09-28): Quick Battle and Skirmish pick Easy..Legendary
// ---------------------------------------------------------------------------------------------

const DIFFICULTY_FLAG = 'ui-difficulty.';

/** The i18n key of each difficulty's name. */
export const DIFFICULTY_NAME_KEYS: Record<Difficulty, string> = {
  easy: 'ui.difficulty.easy',
  normal: 'ui.difficulty.normal',
  hard: 'ui.difficulty.hard',
  expert: 'ui.difficulty.expert',
  legendary: 'ui.difficulty.legendary',
};

/** The difficulty last picked in Quick Battle or Skirmish (stored as a `ui-difficulty.<id>` flag), else the default (Normal). */
export function lastDifficulty(save: SaveDoc, content: Content): Difficulty {
  const table = content.generals.difficulty;
  return table.order.find((d) => save.flags[DIFFICULTY_FLAG + d]) ?? table.default;
}

/** The flag patch that remembers `d` as the last difficulty (and clears the others). */
export function difficultyFlags(d: Difficulty, content: Content): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const x of content.generals.difficulty.order) out[DIFFICULTY_FLAG + x] = x === d;
  return out;
}

// ---------------------------------------------------------------------------------------------
// First-time pointers on Home's entries (owner feedback 2026-09-28): a short line, shown once
// ---------------------------------------------------------------------------------------------

export type PointerEntry = 'warPlan' | 'collection' | 'capsules' | 'customize' | 'trophyRoad';

export const pointerFlag = (entry: PointerEntry): string => `ui-pointer.${entry}`;

/** Each pointer's line (at most 8 words). */
export const POINTER_KEYS: Record<PointerEntry, string> = {
  warPlan: 'ui.pointer.warPlan',
  collection: 'ui.pointer.collection',
  capsules: 'ui.pointer.capsules',
  customize: 'ui.pointer.customize',
  trophyRoad: 'ui.pointer.trophyRoad',
};

/** True while the entry's first-time pointer has not been dismissed (by opening the entry). */
export function pointerDue(save: SaveDoc, entry: PointerEntry): boolean {
  return !save.flags[pointerFlag(entry)];
}

export interface Unlocks {
  warPlan: boolean;
  skirmish: boolean;
  conquest: boolean;
  /** The ladder format picker appears from Arena 2 (A9 #3). */
  formatPicker: boolean;
  ladderFormats: FormatId[];
  conquestArena: number;
}

export function unlocks(save: SaveDoc, content: Content): Unlocks {
  const arena = arenaOf(save, content);
  const conquestArena = content.generals.conquest.unlockArena;
  const opened = save.matchesPlayed >= WAR_PLAN_UNLOCK_MATCHES;
  return {
    warPlan: opened,
    skirmish: opened,
    conquest: arena.index >= conquestArena,
    formatPicker: arena.ladderFormats.length > 1,
    ladderFormats: arena.ladderFormats,
    conquestArena,
  };
}

// ---------------------------------------------------------------------------------------------
// The Sundial and the Supply Capsule (A6.3, A15.4)
// ---------------------------------------------------------------------------------------------

/**
 * The Sundial (A6.3; capsule charges until 2026-09-30): one capsule ready every 5 h, holding up to 34.
 * The same integer rule as meta's `accrueCharges` (the UI may not import meta, B2); the Capsules tab
 * shows `nextAt` as a local clock time, never as a countdown (A15.3 rule 4).
 */
export interface ChargesView {
  /** Ready Sundial capsules at `now`. */
  charges: number;
  max: number;
  /** Time to the next capsule, or null when full (tests and the dev pages; never shown as a countdown). */
  nextInMs: number | null;
  /** The first capsules of a save need no Sundial. */
  free: number;
  /** The Sundial is full: it has stopped filling. */
  full: boolean;
  /** When the next capsule is ready (epoch ms), or null when full. */
  nextAt: number | null;
  /** Hours per capsule (5). */
  hours: number;
  /** How far the current period has run, in basis points (0-10000; 10000 when full). */
  periodBp: number;
}

export function chargesView(save: SaveDoc, content: Content, now: number): ChargesView {
  const c = content.capsules.charges;
  const period = Math.max(1, c.regenMs);
  const stored = Math.max(0, save.capsules.charges);
  let charges = Math.min(stored, c.max);
  let start = save.capsules.chargesUpdatedAt;
  if (charges < c.max) {
    // A clock moved backwards restarts the current period (A6.3).
    if (now < start) start = now;
    const n = Math.floor((now - start) / period);
    if (n > 0) {
      charges = Math.min(c.max, charges + n);
      start += n * period;
    }
  }
  const full = charges >= c.max;
  const nextAt = full ? null : start + period;
  return {
    charges,
    max: c.max,
    nextInMs: nextAt === null ? null : Math.max(0, nextAt - now),
    free: Math.max(0, save.capsules.freeCapsulesLeft),
    full,
    nextAt,
    hours: Math.max(1, Math.round(period / 3_600_000)),
    periodBp: full ? 10_000 : Math.max(0, Math.min(10_000, Math.floor(((now - start) * 10_000) / period))),
  };
}

export interface DailyCapsuleView {
  /** A6.3: the first Supply Capsule becomes available right after capsule 2 is opened. */
  unlocked: boolean;
  bank: number;
  max: number;
  nextInMs: number | null;
}

/** Capsules opened before the Supply Capsule unlocks (A6.3). */
export const DAILY_UNLOCK_OPENED = 2;

export function dailyCapsuleView(save: SaveDoc, content: Content, now: number): DailyCapsuleView {
  const max = content.capsules.daily.bankMax;
  const at = save.capsules.dailyNextAt;
  const bank = Math.min(max, save.capsules.dailyBank);
  return {
    unlocked: bank > 0 || at !== null || save.pity.opened >= DAILY_UNLOCK_OPENED,
    bank,
    max,
    nextInMs: at !== null && save.capsules.dailyBank < max ? Math.max(0, at - now) : null,
  };
}

/** A15.4 bank sizes and the Supply rule, from content where it has them (WP1), else the DESIGN values. */
export interface BankRules {
  chargesMax: number;
  chargeRegenMs: number;
  supplyMax: number;
  supplyEvery: number;
  dailyRewardsMax: number;
  questQueueMax: number;
}

export function bankRules(content: Content): BankRules {
  const supply = (content.capsules as { supply?: { matchesPerCapsule?: number; allowanceMax?: number } }).supply;
  const challenge = content.dailyModifiers.challenge as { bankMax?: number };
  const quests = content.quests as { queueMax?: number };
  return {
    chargesMax: content.capsules.charges.max,
    chargeRegenMs: content.capsules.charges.regenMs,
    supplyMax: supply?.allowanceMax ?? content.capsules.daily.bankMax,
    supplyEvery: supply?.matchesPerCapsule ?? 3,
    dailyRewardsMax: challenge.bankMax ?? 7,
    questQueueMax: quests.queueMax ?? 21,
  };
}

/**
 * The Supply Capsule line inside the capsule tray (A15.4, A9 #2): "Supply allowance left: 2 · 1 more
 * match" while an allowance banked before 2026-09-30 is left (the Supply Capsule retired into the
 * Sundial; no new allowance accrues). No timer (A15.13).
 */
export interface SupplyView {
  unlocked: boolean;
  /** Allowances banked (each turns into a Supply Capsule on every 3rd finished match). */
  bank: number;
  max: number;
  /** Finished matches until the next one turns into a capsule, or null when none is banked. */
  moreMatches: number | null;
}

export function supplyView(save: SaveDoc, content: Content): SupplyView {
  const r = bankRules(content);
  const bank = Math.max(0, Math.min(r.supplyMax, save.capsules.dailyBank));
  const unlocked = bank > 0 || save.capsules.dailyNextAt !== null || save.pity.opened >= DAILY_UNLOCK_OPENED;
  const rest = save.matchesPlayed % r.supplyEvery;
  return { unlocked, bank, max: r.supplyMax, moreMatches: bank > 0 ? r.supplyEvery - rest : null };
}

/** The War Chest bar on Home (A15.5): counting wins toward the next chest, never reset. */
export function warChestView(save: SaveDoc, content: Content): { wins: number; of: number } {
  const of = Math.max(1, content.quests.weekly.target);
  return { wins: Math.max(0, Math.min(of, save.quests.weekly.progress)), of };
}

/**
 * Pending capsules, best visible tier first (the tray shows the best one biggest), then oldest first.
 * A Win or Supply Capsule counts by its start tier: its rolled tier stays hidden until it is opened
 * (A10, A15.1 red line 7), so the order never hints at it.
 */
export function trayCapsules(save: SaveDoc, content: Content): SaveDoc['capsules']['pending'] {
  return byVisibleTier(content.capsules, save.capsules.pending);
}

// ---------------------------------------------------------------------------------------------
// Quests (A6.7)
// ---------------------------------------------------------------------------------------------

export interface QuestView {
  slot: number | 'weekly';
  def: QuestDef;
  progress: number;
  target: number;
  done: boolean;
  claimed: boolean;
}

function questDef(content: Content, id: string): QuestDef | null {
  if (content.quests.weekly.id === id) return content.quests.weekly;
  return content.quests.daily.find((q) => q.id === id) ?? null;
}

/** Quests that are active and progress: the first 3 of the queue (A6.7, A15.4). */
export const ACTIVE_QUESTS = 3;

export function questViews(save: SaveDoc, content: Content): { daily: QuestView[]; weekly: QuestView | null; rerollLeft: boolean } {
  const daily: QuestView[] = [];
  // Only the active quests show; the rest of the queue is never counted on screen (A15.13).
  save.quests.daily.slice(0, ACTIVE_QUESTS).forEach((q, i) => {
    const def = questDef(content, q.id);
    if (!def) return;
    daily.push({
      slot: i,
      def,
      progress: Math.min(q.progress, def.target),
      target: def.target,
      done: q.progress >= def.target,
      claimed: q.claimed,
    });
  });
  const w = save.quests.weekly;
  const wd = questDef(content, w.id);
  const weekly = wd
    ? {
        slot: 'weekly' as const,
        def: wd,
        progress: Math.min(w.progress, wd.target),
        target: wd.target,
        done: w.progress >= wd.target,
        claimed: w.claimed,
      }
    : null;
  return { daily, weekly, rerollLeft: !save.quests.rerollUsed };
}

// ---------------------------------------------------------------------------------------------
// Trophy Road (A6.3)
// ---------------------------------------------------------------------------------------------

export type RoadNodeState = 'claimed' | 'claimable' | 'locked';

export interface RoadNodeView {
  node: RoadNode;
  state: RoadNodeState;
  /** The arena whose gate this node is, if any. */
  gate: ArenaDef | null;
}

export function roadNodes(save: SaveDoc, content: Content): RoadNodeView[] {
  const claimed = new Set(save.trophies.roadClaimed);
  const best = save.trophies.best;
  return content.trophyRoad.nodes.map((node) => {
    const gateReward = node.rewards.find((r) => r.kind === 'gate');
    const gate = gateReward && gateReward.kind === 'gate' ? (content.arenas.list.find((a) => a.index === gateReward.arena) ?? null) : null;
    const state: RoadNodeState = claimed.has(node.trophies) ? 'claimed' : node.trophies <= best ? 'claimable' : 'locked';
    return { node, state, gate };
  });
}

export interface RoadProgress {
  trophies: number;
  best: number;
  /** The next node above the best trophies, or null at the end of the road. */
  next: RoadNode | null;
  /** Trophies of the node before `next` (0 at the start), for the bar. */
  from: number;
  claimable: number;
}

export function roadProgress(save: SaveDoc, content: Content): RoadProgress {
  const nodes = content.trophyRoad.nodes;
  const best = save.trophies.best;
  const next = nodes.find((n) => n.trophies > best) ?? null;
  const i = next ? nodes.indexOf(next) : nodes.length;
  const from = i > 0 ? nodes[i - 1]!.trophies : 0;
  const claimable = roadNodes(save, content).filter((n) => n.state === 'claimable').length;
  return { trophies: save.trophies.current, best, next, from, claimable };
}

// ---------------------------------------------------------------------------------------------
// Conquest (A6.10)
// ---------------------------------------------------------------------------------------------

export interface ConquestEntry {
  general: GeneralDef;
  tier: number;
  level: number;
  stars: [boolean, boolean, boolean];
  /** Opens after the previous General is beaten once. */
  open: boolean;
  beaten: boolean;
}

export interface ConquestView {
  unlocked: boolean;
  unlockArena: number;
  entries: ConquestEntry[];
  totalStars: number;
  maxStars: number;
  milestones: { stars: number; capsule: CapsuleTier; title: string | null; reached: boolean; claimed: boolean }[];
}

export function conquestView(save: SaveDoc, content: Content): ConquestView {
  const rules = content.generals.conquest;
  let prevBeaten = true;
  const entries = rules.board.map((b) => {
    const stars = save.conquest.stars[b.general] ?? [false, false, false];
    const beaten = stars[0];
    const entry: ConquestEntry = {
      general: content.generals.list[b.general],
      tier: b.tier,
      level: b.level,
      stars: [stars[0], stars[1], stars[2]],
      open: prevBeaten,
      beaten,
    };
    prevBeaten = beaten;
    return entry;
  });
  const totalStars = entries.reduce((n, e) => n + e.stars.filter(Boolean).length, 0);
  const claimed = new Set(save.conquest.milestonesClaimed);
  return {
    unlocked: arenaOf(save, content).index >= rules.unlockArena,
    unlockArena: rules.unlockArena,
    entries,
    totalStars,
    maxStars: entries.length * 3,
    milestones: rules.milestones.map((m) => ({ ...m, reached: totalStars >= m.stars, claimed: claimed.has(m.stars) })),
  };
}

// ---------------------------------------------------------------------------------------------
// Ladder rewards by format (A15.8) and the Daily difficulty (A9.1, A15.7)
// ---------------------------------------------------------------------------------------------

/** What a ladder win pays in a format: the A15.8 table from 400 trophies, the A6.3 row below. */
export function ladderWin(save: SaveDoc, content: Content, format: FormatId): LadderWin {
  const l = content.arenas.ladder;
  const by = l.winByFormat;
  return save.trophies.current >= by.fromTrophies ? (by.formats[format] ?? l.win) : l.win;
}

export const DAILY_DIFFICULTIES: readonly DailyDifficulty[] = ['recruit', 'veteran', 'warlord'];

/** The player's skill tier (A6.8, A15.9): clamp(round((MMR − 870) / 100), 0, max tier). Internal only. */
export function skillTier(save: SaveDoc, content: Content): number {
  const m = content.arenas.ladder.mmr;
  const raw = Math.round((save.mmr - m.tierOffset) / m.tierDivisor);
  return Math.max(0, Math.min(content.arenas.ladder.maxTier, raw));
}

/** The default Daily difficulty: the one whose tier is nearest the skill tier (A15.7). */
export function defaultDailyDifficulty(save: SaveDoc, content: Content): DailyDifficulty {
  const tiers = content.dailyModifiers.challenge.difficulties;
  const tier = skillTier(save, content);
  let best: DailyDifficulty = 'veteran';
  for (const d of DAILY_DIFFICULTIES) if (Math.abs(tiers[d] - tier) < Math.abs(tiers[best] - tier)) best = d;
  return best;
}
