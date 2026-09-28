/**
 * Progress view models: arena, unlocks (A3, A8, A9 #3), capsule charges and the Daily Capsule
 * (A6.3), quests (A6.7), Trophy Road nodes (A6.3) and the Conquest board (A6.10).
 * Pure over (save, content, now); the screens only render them.
 */
import type { ArenaDef, GeneralDef, QuestDef, RoadNode } from '@/content/types';
import type { Content } from '@/content/types';
import type { CapsuleTier, FormatId, SaveDoc } from '@/contracts';

/** The player's arena (`save.arenaIndex` is 0-based into `arenas.list`). */
export function arenaOf(save: SaveDoc, content: Content): ArenaDef {
  const list = content.arenas.list;
  return list[Math.max(0, Math.min(list.length - 1, save.arenaIndex))]!;
}

export function nextArena(save: SaveDoc, content: Content): ArenaDef | null {
  return content.arenas.list[save.arenaIndex + 1] ?? null;
}

/** Matches before the War Plan screen and Skirmish open (A3, A8: "after match 3"). */
export const WAR_PLAN_UNLOCK_MATCHES = 3;

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
// Charges and the Daily Capsule (A6.3)
// ---------------------------------------------------------------------------------------------

export interface ChargesView {
  charges: number;
  max: number;
  /** Time to the next charge, or null when full. */
  nextInMs: number | null;
  /** The first capsules of a save use no charge. */
  free: number;
}

export function chargesView(save: SaveDoc, content: Content, now: number): ChargesView {
  const c = content.capsules.charges;
  const charges = Math.min(save.capsules.charges, c.max);
  let nextInMs: number | null = null;
  if (charges < c.max) {
    const since = Math.max(0, now - save.capsules.chargesUpdatedAt);
    nextInMs = c.regenMs - (since % c.regenMs);
  }
  return { charges, max: c.max, nextInMs, free: Math.max(0, save.capsules.freeCapsulesLeft) };
}

export interface DailyCapsuleView {
  /** A6.3: the first Daily Capsule becomes available right after capsule 2 is opened. */
  unlocked: boolean;
  bank: number;
  max: number;
  nextInMs: number | null;
}

/** Capsules opened before the Daily Capsule unlocks (A6.3). */
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

/** Pending capsules, best tier first (the tray shows the best one biggest). */
export function trayCapsules(save: SaveDoc, content: Content): SaveDoc['capsules']['pending'] {
  const rank = (t: CapsuleTier) => content.capsules.tierOrder.indexOf(t);
  return [...save.capsules.pending].sort((a, b) => rank(b.tier) - rank(a.tier) || a.createdAt - b.createdAt);
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

export function questViews(save: SaveDoc, content: Content): { daily: QuestView[]; weekly: QuestView | null; rerollLeft: boolean } {
  const daily: QuestView[] = [];
  save.quests.daily.forEach((q, i) => {
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
