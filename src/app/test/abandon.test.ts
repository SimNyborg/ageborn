import { afterEach, describe, expect, it, vi } from 'vitest';
import type { MatchResultInput, OpponentSpec, SaveDoc } from '@/contracts';
import { content } from '@/content';
import { createMeta } from '@/meta';
import { abandonedResult, clearOpenMatch, markOpenMatch, settleAbandoned, takeAbandonNotice } from '../abandon';

function memoryStorage(): Storage {
  const m = new Map<string, string>();
  return {
    get length() {
      return m.size;
    },
    clear: () => m.clear(),
    getItem: (k: string) => m.get(k) ?? null,
    key: (i: number) => [...m.keys()][i] ?? null,
    removeItem: (k: string) => void m.delete(k),
    setItem: (k: string, v: string) => void m.set(k, v),
  };
}

const opponent = { generalId: 'kettle', displayName: 'Kettle', isAI: true, tier: 1 } as unknown as OpponentSpec;

describe('a Ladder battle left by a reload (bug hunt 2026-10-01 #9)', () => {
  afterEach(() => {
    clearOpenMatch();
    vi.unstubAllGlobals();
  });

  it('is applied once at boot as a Retreat loss, with a notice', async () => {
    vi.stubGlobal('localStorage', memoryStorage());
    markOpenMatch({ mode: 'ladder', mySide: 0, opponent, durationMs: 61000 });
    const applied: MatchResultInput[] = [];
    const save = { matchesPlayed: 5 } as unknown as SaveDoc;
    const saved: SaveDoc[] = [];
    const services = {
      meta: { applyMatchResult: (s: SaveDoc, r: MatchResultInput) => (applied.push(r), { save: { ...s, matchesPlayed: s.matchesPlayed + 1 }, rewards: [] }) },
      content: {},
      clock: { now: () => 0 },
      saveStore: { save: async (d: SaveDoc) => void saved.push(d) },
      eventLog: { record: () => undefined },
    } as unknown as Parameters<typeof settleAbandoned>[0];
    const next = await settleAbandoned(services, save);
    expect(applied).toHaveLength(1);
    expect(applied[0]!.outcome).toMatchObject({ winner: 1, reason: 'retreat' });
    expect(applied[0]!.mode).toBe('ladder');
    expect(next?.matchesPlayed).toBe(6);
    expect(saved).toHaveLength(1);
    expect(takeAbandonNotice()).toBe(true);
    expect(takeAbandonNotice()).toBe(false);
    // Only once: the record is gone.
    expect(await settleAbandoned(services, next)).toBe(next);
    expect(applied).toHaveLength(1);
  });

  it('a cleared record (the battle ended normally) costs nothing', async () => {
    vi.stubGlobal('localStorage', memoryStorage());
    markOpenMatch({ mode: 'ladder', mySide: 0, opponent, durationMs: 90000 });
    clearOpenMatch();
    const save = { matchesPlayed: 2 } as unknown as SaveDoc;
    const services = { meta: { applyMatchResult: () => { throw new Error('not expected'); } } } as unknown as Parameters<typeof settleAbandoned>[0];
    expect(await settleAbandoned(services, save)).toBe(save);
  });

  it('pays nothing, like a chosen Retreat (owner decision 2026-10-03): only the loss\'s trophies move', () => {
    const M = createMeta(content);
    const clock = { now: () => Date.UTC(2026, 2, 2, 12), offsetMs: () => 0 };
    const fresh = M.newSave(content, clock, 4);
    const s: SaveDoc = { ...fresh, trophies: { current: 600, best: 600, roadClaimed: [] }, arenaIndex: 2, matchesPlayed: 12, flags: { ...fresh.flags, 'meta.ladderPlayed': true } };
    const foe = M.pickOpponent(s, 'ladder', content, clock, { format: 'standard' });
    const r = M.applyMatchResult(s, abandonedResult({ mode: 'ladder', mySide: 0, opponent: foe, durationMs: 75000 }), content, clock);
    expect(r.rewards).toEqual([{ kind: 'trophies', delta: -20 }]);
    expect(r.save.currencies).toEqual(s.currencies);
    expect(r.save.capsules.pending).toEqual(s.capsules.pending);
    expect(r.save.quests).toEqual(s.quests);
  });

  it('the Retreat result names the other side as the winner', () => {
    expect(abandonedResult({ mode: 'ladder', mySide: 1, opponent, durationMs: 60000 }).outcome.winner).toBe(0);
  });
});
