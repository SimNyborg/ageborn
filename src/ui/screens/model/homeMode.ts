/**
 * The Battle hub's mode switcher (DESIGN A9 #2-3, A2.10, A2.10.1; spec "online-first Battle hub",
 * 2026-10-01). Battle plays the mode the switcher shows; the Modes panel only *selects* a mode. Pure
 * over (save, content) like the other UI view models; the choice lives in UI flags, so there is no
 * save change:
 *
 * - `ui-homeMode.<id>`: the selected mode (Ladder by default).
 * - `ui-ladderFormat.<id>`: the Ladder length (the shortest open timed length by default).
 * - `ui-dailyDiff.<d>`: the Daily difficulty picked on the plate (else the one nearest the skill tier).
 * - `ui-skirmish.*`: the last Skirmish setup that was played (`set`, `g.<general>`, `f.<format>`, `std`).
 */
import type { FormatId, SaveDoc } from '@/contracts';
import type { Content, Difficulty, GeneralId } from '@/content/types';
import type { DailyDifficulty, MatchRequest } from '../../router';
import { arenaOf, DAILY_DIFFICULTIES, defaultDailyDifficulty, lastDifficulty, unlocks } from './progress';
import { featureOpen } from './warPath';

/** The modes Battle can play today, vs labelled AI (the online modes join at M2/M4/M5). */
export type HomeMode = 'ladder' | 'quick' | 'daily' | 'skirmish';
export const HOME_MODES: readonly HomeMode[] = ['ladder', 'quick', 'daily', 'skirmish'];

export const HOME_MODE_FLAG = 'ui-homeMode.';
export const LADDER_FORMAT_FLAG = 'ui-ladderFormat.';
export const DAILY_DIFF_FLAG = 'ui-dailyDiff.';
const SK = 'ui-skirmish.';

/** The four battle lengths in picker order (A2.10: Short, Medium, Long, Last Base Standing). */
export const LENGTHS: readonly FormatId[] = ['short', 'standard', 'full', 'last'];

/** Whether a mode can be selected now (features open with wins, ui-plan 2.6). */
export function modeOpen(save: SaveDoc, content: Content, m: HomeMode): boolean {
  switch (m) {
    case 'ladder':
      return true;
    case 'quick':
      return featureOpen(save, content, 'modes');
    case 'daily':
      return featureOpen(save, content, 'modes') && featureOpen(save, content, 'daily');
    case 'skirmish':
      return featureOpen(save, content, 'modes') && unlocks(save, content).skirmish && skirmishSetup(save, content) !== null;
  }
}

/** The mode Battle plays: the remembered one while it is open, else the Ladder. */
export function homeMode(save: SaveDoc, content: Content): HomeMode {
  const m = HOME_MODES.find((x) => save.flags[HOME_MODE_FLAG + x]);
  return m && modeOpen(save, content, m) ? m : 'ladder';
}

/** The flag patch that selects `m` (and clears the others). */
export function homeModeFlags(m: HomeMode): Record<string, boolean> {
  return Object.fromEntries(HOME_MODES.map((x) => [HOME_MODE_FLAG + x, x === m]));
}

/** True for a format with no Final Bell (Last Base Standing, A2.10.1). */
export function untimed(content: Content, f: FormatId): boolean {
  return content.formats[f]?.kind === 'untimed';
}

/** The Ladder length Battle plays: the remembered open one, else the shortest open timed length. */
export function ladderFormat(save: SaveDoc, content: Content): FormatId {
  const open = arenaOf(save, content).ladderFormats;
  const picked = open.find((f) => save.flags[LADDER_FORMAT_FLAG + f]);
  if (picked) return picked;
  const timed = open.filter((f) => !untimed(content, f));
  // The shortest length is the default (task 2.8: a new Arena 2 player keeps the 7-minute war).
  return timed[0] ?? open[0] ?? 'short';
}

export function ladderFormatFlags(content: Content, f: FormatId): Record<string, boolean> {
  return Object.fromEntries(LENGTHS.filter((x) => content.formats[x]).map((x) => [LADDER_FORMAT_FLAG + x, x === f]));
}

/** One segment of the length picker: open, or locked with the arena (and its trophies) that opens it. */
export interface LengthOption {
  format: FormatId;
  open: boolean;
  /** The arena that opens it (1-based index) and its trophy gate; null when no arena offers it. */
  opensAt: { arena: number; trophies: number } | null;
}

/** The lengths the Ladder picker shows from Arena 2 (A2.10: locked ones name their arena). */
export function lengthOptions(save: SaveDoc, content: Content): LengthOption[] {
  const open = arenaOf(save, content).ladderFormats;
  return LENGTHS.filter((f) => content.formats[f]).map((format) => {
    const a = content.arenas.list.find((x) => x.ladderFormats.includes(format));
    return { format, open: open.includes(format), opensAt: a ? { arena: a.index, trophies: a.trophies } : null };
  });
}

/** "8½" for 510,000 ms: whole minutes, with ½ for a half (the plate's "up to" figure). */
export function minutesText(ms: number): string {
  const halves = Math.round(ms / 30_000);
  const whole = Math.floor(halves / 2);
  return halves % 2 ? `${whole}½` : `${whole}`;
}

/** The Daily difficulty Battle plays (picked on the plate, else the nearest to the skill tier). */
export function dailyDifficulty(save: SaveDoc, content: Content): DailyDifficulty {
  return DAILY_DIFFICULTIES.find((d) => save.flags[DAILY_DIFF_FLAG + d]) ?? defaultDailyDifficulty(save, content);
}

export function dailyDifficultyFlags(d: DailyDifficulty): Record<string, boolean> {
  return Object.fromEntries(DAILY_DIFFICULTIES.map((x) => [DAILY_DIFF_FLAG + x, x === d]));
}

/** The last Skirmish setup that was played, or null when none has been. */
export interface SkirmishSetupView {
  generalId: string;
  format: FormatId;
  standardLevels: boolean;
  difficulty: Difficulty;
}

export function skirmishSetup(save: SaveDoc, content: Content): SkirmishSetupView | null {
  if (!save.flags[SK + 'set']) return null;
  const g = [...content.generals.order, 'echo'].find((x) => save.flags[`${SK}g.${x}`]);
  const f = Object.keys(content.formats).find((x) => save.flags[`${SK}f.${x}`]);
  if (!g || !f) return null;
  return { generalId: g, format: f, standardLevels: !!save.flags[SK + 'std'], difficulty: lastDifficulty(save, content) };
}

/** The flag patch that remembers a Skirmish setup (and clears the old one's keys). */
export function skirmishSetupFlags(save: SaveDoc, o: { generalId: string; format: FormatId; standardLevels: boolean }): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const k of Object.keys(save.flags)) if (k.startsWith(`${SK}g.`) || k.startsWith(`${SK}f.`)) out[k] = false;
  out[`${SK}g.${o.generalId}`] = true;
  out[`${SK}f.${o.format}`] = true;
  out[SK + 'std'] = o.standardLevels;
  out[SK + 'set'] = true;
  return out;
}

/**
 * The Quick Battle opponent for a difficulty: the first ladder General (content order) whose tier
 * range holds the difficulty's tier (Easy: Pip, Normal: Kettle, ..., Legendary: the Warden).
 */
export function quickGeneralFor(content: Content, d: Difficulty): GeneralId {
  const tier = content.generals.difficulty.tiers[d];
  const list = content.generals.order.map((g) => content.generals.list[g]);
  const fit = list.find((g) => !g.scripted && !g.mirror && g.tiers && g.tiers[0] <= tier && tier <= g.tiers[1]);
  return fit?.id ?? 'kettle';
}

/** What Battle starts in the selected mode (the onboarding matches are the caller's). */
export function battleRequest(save: SaveDoc, content: Content, speed: 1 | 1.5 | 2): MatchRequest {
  const m = homeMode(save, content);
  switch (m) {
    case 'ladder':
      return { mode: 'ladder', format: ladderFormat(save, content) };
    case 'quick': {
      const d = lastDifficulty(save, content);
      return { mode: 'skirmish', options: { generalId: quickGeneralFor(content, d), tier: content.generals.difficulty.tiers[d], format: 'short', standardLevels: false }, speed, quick: true };
    }
    case 'daily':
      return { mode: 'daily', difficulty: dailyDifficulty(save, content) };
    case 'skirmish': {
      const k = skirmishSetup(save, content)!;
      return { mode: 'skirmish', options: { generalId: k.generalId, tier: content.generals.difficulty.tiers[k.difficulty], format: k.format, standardLevels: k.standardLevels }, speed };
    }
  }
}
