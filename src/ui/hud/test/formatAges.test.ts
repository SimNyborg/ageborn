import type { AgeId, Loadout, MatchConfig } from '@/contracts';
import { content } from '@/content';
import { fakeMatchConfig } from '@/contracts/fakes/sim';
import { ageOrder, xpThreshold } from '@/render/hudModel';
import { describe, expect, it } from 'vitest';
import { ageIds, turretSlots, xpNeeded } from '../model';
import { sampleHudModel } from '../samples';

/**
 * `SideState.ageIndex` is a position in the format's age list (A17.15 rule 4), not `AgeDef.index`.
 * The tutorial skips Bronze, so its position 1 is Medieval (review fix: the tray was empty after the
 * first evolve because the HUD read position 1 as Bronze).
 */
function loadout(age: AgeId): Loadout {
  const units = Object.values(content.units)
    .filter((u) => u.age === age && !u.hidden)
    .slice(0, 2)
    .map((u) => u.id);
  const turrets = Object.values(content.turrets)
    .filter((t) => t.age === age)
    .slice(0, 2)
    .map((t) => t.id);
  const power = Object.values(content.powers).find((p) => p.age === age)?.id ?? '';
  return { units: [units[0] ?? null, units[1] ?? null, null, null, null], turrets: [turrets[0] ?? null, turrets[1] ?? null], power };
}

function tutorialConfig(): MatchConfig {
  const base = fakeMatchConfig();
  const loadouts: Partial<Record<AgeId, Loadout>> = { stone: loadout('stone'), medieval: loadout('medieval') };
  return {
    ...base,
    format: 'tutorial',
    content,
    sides: [
      { ...base.sides[0], loadouts },
      { ...base.sides[1], loadouts },
    ] as MatchConfig['sides'],
  };
}

describe('format age order (A17.15 rule 4)', () => {
  const config = tutorialConfig();
  const fmtAges = content.formats.tutorial?.ages ?? [];

  it('follows the format, not the global age index', () => {
    expect(fmtAges[1]).toBe('medieval');
    expect(ageIds(config)).toEqual(fmtAges);
    expect(ageOrder(config)).toEqual(fmtAges);
  });

  it('shows the Medieval loadout at tutorial position 1', () => {
    const m = sampleHudModel(config, 0, { me: { ageIndex: 1 } });
    const cards = m.me.cards.filter((c) => c.card).map((c) => c.card);
    expect(cards.length).toBeGreaterThan(0);
    for (const c of cards) expect(content.units[c ?? '']?.age).toBe('medieval');
    const turrets = turretSlots(m, config, 0).filter(Boolean);
    expect(turrets.length).toBeGreaterThan(0);
    for (const t of turrets) expect(content.turrets[t ?? '']?.age).toBe('medieval');
  });

  it('reads XP thresholds for the format position', () => {
    const med = content.ages.medieval.xpToNext;
    const want = content.formats.tutorial?.xpToNextOverride?.[1] ?? med;
    expect(xpNeeded(config, 1)).toBe(want);
    expect(xpThreshold(config, 1)).toBe(want);
  });
});
