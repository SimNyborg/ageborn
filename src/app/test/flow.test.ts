import { describe, expect, it } from 'vitest';
import type { MatchResultInput, ReplayDoc, RewardStep } from '@/contracts';
import { content } from '@/content';
import { FixedClock } from '@/contracts/fakes/clock';
import { InMemorySaveStore, fakeSaveDoc } from '@/contracts/fakes/saveStore';
import { RewardStager, finishMatch } from '../flow';
import { generalOpponent } from '../matchSetup';
import { fakeMeta, type FakeMetaCall } from './helpers';

const opponent = generalOpponent(content, { generalId: 'kettle', displayName: 'Captain Kettle', tier: 1, level: 1, format: 'short', seed: 1 });

function result(mode: MatchResultInput['mode'], winner: 0 | 1 | null): MatchResultInput {
  return {
    mode,
    outcome: { winner, reason: 'baseDestroyed', tick: 3000, baseHpBp: [5000, 0] },
    mySide: 0,
    opponent,
    stats: { trained: 10, kills: 5, turretKills: 1, evolves: 2, reachedFinalAgeAtMs: null, powerMaxHits: 3, baseDamage: 100, heavyKillsByAA: 0, usedTreasury: false, usedLastStand: false, ownBaseHpBpAtEnd: 5000, durationMs: 150000, mvpCard: 'bonker' },
  };
}

const replay = { v: 1, seed: 1 } as unknown as ReplayDoc;

describe('finishMatch: result → meta → save (B11)', () => {
  it('applies meta, stores hints and replay, and writes the save immediately', async () => {
    const calls: FakeMetaCall[] = [];
    const store = new InMemorySaveStore();
    const save = fakeSaveDoc({ matchesPlayed: 5, tutorial: { step: 4, hintsShown: { powerReady: 1 } } });
    const out = await finishMatch({ meta: fakeMeta(content, calls), saveStore: store, content, clock: new FixedClock() }, save, { mode: 'ladder' }, result('ladder', 0), replay, { evolveFirst: 2, powerReady: 2 });
    expect(calls.map((c) => c.method)).toEqual(['applyMatchResult']);
    expect(out.rewards).toEqual([{ kind: 'trophies', delta: 30 }, { kind: 'amber', amount: 20 }]);
    expect(out.save?.matchesPlayed).toBe(6);
    expect(out.save?.tutorial.hintsShown).toEqual({ powerReady: 2, evolveFirst: 2 });
    expect(out.onboarding).toBeNull();
    expect(store.immediateSaves).toBe(1);
    expect(await store.load()).toEqual(out.save);
    expect(store.loadReplays()).toHaveLength(1);
  });

  it('without meta (Phase 1) still counts the match so staged unlocks progress', async () => {
    const store = new InMemorySaveStore();
    const out = await finishMatch({ meta: null, saveStore: store, content, clock: new FixedClock() }, fakeSaveDoc(), { mode: 'skirmish' }, result('skirmish', 1), replay);
    expect(out.save?.matchesPlayed).toBe(1);
    expect(out.rewards).toEqual([]);
  });

  it('without a save only keeps the replay', async () => {
    const store = new InMemorySaveStore();
    const out = await finishMatch({ meta: null, saveStore: store, content, clock: new FixedClock() }, null, { mode: 'skirmish' }, result('skirmish', 0), replay);
    expect(out).toEqual({ save: null, rewards: [], onboarding: null });
    expect(store.loadReplays()).toHaveLength(1);
    expect(store.saves).toBe(0);
  });

  it('moves the onboarding on after match 1 (win) and match 2 (win or loss)', async () => {
    const svc = { meta: null, saveStore: new InMemorySaveStore(), content, clock: new FixedClock() };
    const won1 = await finishMatch(svc, fakeSaveDoc(), { mode: 'tutorial' }, result('tutorial', 0), replay);
    expect(won1.onboarding).toBe('capsule1');
    expect(won1.save?.tutorial.step).toBe(1);
    const lost1 = await finishMatch(svc, fakeSaveDoc(), { mode: 'tutorial' }, result('tutorial', 1), replay);
    expect(lost1.onboarding).toBe('match1');
    expect(lost1.save?.tutorial.step).toBe(0);
    const lost2 = await finishMatch(svc, fakeSaveDoc({ tutorial: { step: 2, hintsShown: {} } }), { mode: 'tutorial' }, result('tutorial', 1), replay);
    expect(lost2.onboarding).toBe('capsule2');
    expect(lost2.save?.tutorial.step).toBe(3);
  });
});

describe('RewardStager (A9 Result: staged, each skippable with a tap)', () => {
  const steps: RewardStep[] = [
    { kind: 'trophies', delta: 30 },
    { kind: 'amber', amount: 20 },
    { kind: 'capsule', capsuleId: 'c1' },
  ];

  it('reveals one step at a time on its own', () => {
    const r = new RewardStager(steps, 1000);
    expect(r.revealed.value).toBe(1);
    r.update(999);
    expect(r.revealed.value).toBe(1);
    r.update(1);
    expect(r.revealed.value).toBe(2);
    r.update(5000);
    expect(r.revealed.value).toBe(3);
    expect(r.done).toBe(true);
  });

  it('a tap skips to the next step; skipAll shows everything', () => {
    const r = new RewardStager(steps, 1000);
    r.update(600);
    r.tap();
    expect(r.revealed.value).toBe(2);
    // The timer restarts after a tap.
    r.update(600);
    expect(r.revealed.value).toBe(2);
    r.skipAll();
    expect(r.revealed.value).toBe(3);
    r.tap();
    expect(r.revealed.value).toBe(3);
    expect(new RewardStager([]).done).toBe(true);
  });
});
