/**
 * Match fixtures for the VS, Pause, Result and Profile screens (tests and the dev page only):
 * opponents for every disclosure case (A7.1, A6.3 warm-up, A7.4 Grogg and The Warden), results
 * with staged rewards (A6.3), pause snapshots and a replay ring for the match history.
 */
import type { Content } from '@/content/types';
import type { FormatId, MatchResultInput, MatchStats, OpponentSpec, ReplayDoc, RewardStep, SideConfig } from '@/contracts';
import { fakeSideConfig } from '@/contracts/fakes/content';
import type { MatchRequest, PauseInfo, ResultInfo } from '../../router';

function side(label: string, isBot: boolean): SideConfig {
  // A18.9.4: an AI's base look (a base flag and decorations; AIs never fly a national flag)
  return { ...fakeSideConfig({ label, isBot }), look: { baseFlag: 'baseFlag.cogwheel', nationalFlag: null, baseSkins: {}, decorations: ['decoration.iron_brazier', null, 'decoration.shield_rack'] } };
}

function opponent(o: Partial<OpponentSpec> & Pick<OpponentSpec, 'generalId' | 'displayName' | 'tier' | 'level' | 'format'>): OpponentSpec {
  return {
    isAI: true,
    side: side(o.displayName, true),
    modifiers: [],
    seed: 1234,
    warmUp: false,
    disclosures: [],
    ...o,
  };
}

export type OpponentFixture = 'general' | 'commander' | 'warmUp' | 'warden' | 'grogg' | 'daily' | 'echo';

export function fixtureOpponent(content: Content, which: OpponentFixture): OpponentSpec {
  const name = (id: string) => content.generals.list[id as 'pip']?.nameKey ?? id;
  switch (which) {
    case 'general':
      return opponent({ generalId: 'kettle', displayName: name('kettle'), tier: 3, level: 4, format: 'standard' });
    case 'commander':
      // Procedural commanders carry `commander:<personality General>:<favourite card>` (meta, A7.4).
      return opponent({
        generalId: 'commander:kettle:bonker',
        displayName: `${content.names.aiPrefix}Brakka Stonejaw`,
        tier: 2,
        level: 3,
        format: 'short',
      });
    case 'warmUp':
      return opponent({
        generalId: 'commander:moss:rock_tosser',
        displayName: `${content.names.aiPrefix}Mossa Flintfist`,
        tier: 1,
        level: 3,
        format: 'short',
        warmUp: true,
      });
    case 'warden':
      return opponent({
        generalId: 'warden',
        displayName: name('warden'),
        tier: 10,
        level: 8,
        format: 'full',
        disclosures: content.generals.list.warden.disclosureKeys,
      });
    case 'grogg':
      return opponent({
        generalId: 'grogg',
        displayName: name('grogg'),
        tier: 0,
        level: 1,
        format: 'tutorial',
        disclosures: content.generals.list.grogg.disclosureKeys,
      });
    case 'daily':
      // A15.7: the Daily is a Standard War with every card on both sides at L7.
      return opponent({ generalId: 'moss', displayName: name('moss'), tier: 4, level: 7, format: 'standard', modifiers: ['gold_rush'], standardLevels: true });
    case 'echo':
      return opponent({ generalId: 'echo', displayName: name('echo'), tier: 5, level: 7, format: 'short' });
  }
}

export function fixtureRequest(which: OpponentFixture): MatchRequest {
  switch (which) {
    case 'daily':
      return { mode: 'daily' };
    case 'warden':
      return { mode: 'conquest', general: 'warden' };
    case 'echo':
      return { mode: 'skirmish', options: { generalId: 'echo', tier: 5, format: 'short', standardLevels: false }, speed: 1 };
    case 'grogg':
      return { mode: 'tutorial', match: 1 };
    default:
      return { mode: 'ladder', format: 'standard' };
  }
}

export const fixtureStats: MatchStats = {
  trained: 42,
  kills: 37,
  turretKills: 9,
  evolves: 3,
  reachedFinalAgeAtMs: 208000,
  powerMaxHits: 6,
  baseDamage: 18400,
  heavyKillsByAA: 4,
  usedTreasury: true,
  usedLastStand: false,
  ownBaseHpBpAtEnd: 6200,
  durationMs: 331000,
  mvpCard: 'pikeman',
};

export type ResultFixture = 'win' | 'loss' | 'draw' | 'conquest' | 'noCapsule' | 'warPath' | 'warPathLoss';

export function fixtureResult(content: Content, which: ResultFixture): ResultInfo {
  const opp = fixtureOpponent(content, which === 'conquest' ? 'warden' : 'general');
  const winner = which === 'win' || which === 'conquest' || which === 'noCapsule' || which === 'warPath' ? 0 : which === 'loss' || which === 'warPathLoss' ? 1 : null;
  const path = which === 'warPath' ? 'wp.bronze.l03' : which === 'warPathLoss' ? 'wp.bronze.l07' : null;
  const input: MatchResultInput = {
    mode: which === 'conquest' ? 'conquest' : path ? 'warPath' : 'ladder',
    ...(path ? { warPath: { level: path, difficulty: 'normal' as const } } : {}),
    outcome: {
      winner,
      reason: which === 'draw' ? 'finalBell' : 'baseDestroyed',
      tick: 6620,
      baseHpBp: winner === 0 ? [6200, 0] : winner === 1 ? [0, 4100] : [3100, 3080],
    },
    mySide: 0,
    opponent: opp,
    stats: which === 'warPath' ? { ...fixtureStats, usedLastStand: true } : which === 'loss' || which === 'warPathLoss' ? { ...fixtureStats, mvpCard: 'longbowman', ownBaseHpBpAtEnd: 0, baseDamage: 9100 } : fixtureStats,
  };
  let rewards: RewardStep[];
  switch (which) {
    case 'win':
      rewards = [
        { kind: 'trophies', delta: 30 },
        { kind: 'amber', amount: 20 },
        { kind: 'capsule', capsuleId: 'cap-mid-1' },
        { kind: 'codex', points: 0, levelUp: false },
        { kind: 'quest', questId: 'win_2', progress: 2, done: true },
        { kind: 'quest', questId: 'train_30', progress: 30, done: true },
      ];
      break;
    case 'noCapsule':
      rewards = [
        { kind: 'trophies', delta: 30 },
        { kind: 'amber', amount: 40 },
        { kind: 'clayPip', meter: 3 },
        { kind: 'arena', arenaIndex: 4 },
      ];
      break;
    case 'loss':
      rewards = [
        { kind: 'trophies', delta: -20 },
        { kind: 'amber', amount: 15 },
        { kind: 'clayPip', meter: 2 },
        { kind: 'quest', questId: 'play_3', progress: 2, done: false },
      ];
      break;
    case 'draw':
      rewards = [
        { kind: 'trophies', delta: 0 },
        { kind: 'amber', amount: 15 },
        { kind: 'clayPip', meter: 1 },
      ];
      break;
    case 'warPath':
      rewards = [
        { kind: 'pathStar', level: 'wp.bronze.l03', star: 1 },
        { kind: 'amber', amount: 40 },
        { kind: 'card', card: 'standard_bearer', copies: 0 },
        { kind: 'quest', questId: 'win_2', progress: 2, done: true },
      ];
      break;
    case 'warPathLoss':
      rewards = [{ kind: 'quest', questId: 'play_3', progress: 2, done: false }];
      break;
    case 'conquest':
      rewards = [
        { kind: 'star', generalId: 'warden', star: 1 },
        { kind: 'amber', amount: 200 },
        { kind: 'star', generalId: 'warden', star: 2 },
        { kind: 'dust', amount: 100 },
        { kind: 'star', generalId: 'warden', star: 3 },
        { kind: 'capsule', capsuleId: 'cap-mid-5' },
        { kind: 'title', title: 'conqueror' },
      ];
      break;
  }
  return {
    input,
    rewards,
    replayIndex: 0,
    request: which === 'conquest' ? { mode: 'conquest', general: 'warden' } : path ? { mode: 'warPath', level: path, difficulty: 'normal' } : { mode: 'ladder', format: 'standard' },
  };
}

export function fixturePause(which: 'early' | 'late' | 'skirmish' | 'tutorial'): PauseInfo {
  return {
    mode: which === 'skirmish' ? 'skirmish' : which === 'tutorial' ? 'tutorial' : 'ladder',
    scouted: which === 'early' || which === 'tutorial' ? [] : ['footman', 'longbowman', 'crossbow_nest', 'pikeman', 'arrow_storm'],
    clockMs: which === 'early' ? 42000 : 187000,
    canRetreat: which === 'late' || which === 'skirmish',
    retreatAfterMs: which === 'tutorial' ? null : 60000,
  };
}

/** A replay ring (newest first) for the Profile history. */
export function fixtureReplays(content: Content, count: number): ReplayDoc[] {
  const names = [
    'Captain Kettle',
    `${content.names.aiPrefix}Brakka Stonejaw`,
    'Mama Moss',
    `${content.names.aiPrefix}Ula Ironhide`,
    'Pip Quickstep',
  ];
  const formats: FormatId[] = ['short', 'standard', 'full'];
  return Array.from({ length: count }, (_, i) => {
    const winner = i % 5 === 3 ? null : i % 3 === 1 ? 1 : 0;
    return {
      v: 1,
      simVersion: 'fixture',
      contentHash: i === count - 1 && count > 5 ? 'older-content' : content.hash,
      seed: 1000 + i,
      format: formats[i % 3]!,
      sides: [side('You', false), side(names[i % names.length]!, true)],
      modifiers: [],
      training: null,
      commands: [],
      result: { winner, reason: winner === null ? 'finalBell' : 'baseDestroyed', tick: 3600 + i * 431, baseHpBp: [5000, 0] },
      finalHash: 0,
      hashes: [],
    } satisfies ReplayDoc;
  });
}
