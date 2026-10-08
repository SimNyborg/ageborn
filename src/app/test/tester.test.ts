/** Test profiles (`?tester=1`, owner request 2026-10-06): valid, playable saves built at the real time. */
import { describe, expect, it } from 'vitest';
import type { SaveDoc } from '@/contracts';
import { asContent, content, counterFile, metaTables, type Content } from '@/content';
import { compileContent } from '@/content/compile';
import { raw } from '@/content/raw';
import { skinList } from '@/content/skins';
import { createMeta } from '@/meta';
import { LocalSaveStore, MemoryStorage, SAVE_VERSION, validateSaveDoc } from '@/save';
import { featureOpen, firstUpgradePending, pendingUnlock, UNLOCK_ORDER } from '@/ui/screens/model/warPath';
import { isTesterProfile } from '@/ui/screens/model/tester';
import { bootRoute, onboardingStep } from '../onboarding';
import { TESTER_PROFILES, testerRequested, testerSave, urlWithoutTester, type TesterProfile } from '../tester';

const t = asContent(content);
const meta = createMeta();
/** 2026-10-06 15:30 UTC, an arbitrary real-looking "now". */
const NOW = Date.UTC(2026, 9, 6, 15, 30);
const clockAt = (now: number) => ({ now: () => now });

/**
 * Every content wave is released now, so the live content has no held-back id. The gate is checked on a
 * variant that holds back the W7 Future wave again (its 24 cards, forts, powers and skins, gated until
 * 2026-10-03): a profile built on it must leave every one of them out.
 */
const HELD_BACK: ReadonlySet<string> = new Set([
  'android_pair', 'barrier_trooper', 'hover_bike', 'needle_gunner', 'crab_mech', 'arc_lobber', 'plasma_lancer',
  'overclock_engineer', 'holo_projector', 'jetpack_trooper', 'particle_cannon', 'overload_android', 'drone_carrier',
  'holo_decoy', 'attack_drone', 'cryo_pod', 'tractor_beam', 'skyguard_pylon', 'mech_bay', 'target_painter', 'nano_mesh',
  'space_cadet', 'chrome_rail', 'grandfather_clock',
]);
function hold<T extends { id: string }>(x: T): T {
  return HELD_BACK.has(x.id) ? { ...x, released: false } : x;
}
const gatedContent: Content = compileContent({
  raw: {
    ...raw,
    ages: raw.ages.map((a) => ({ ...a, units: a.units.map(hold), turrets: a.turrets.map(hold), ...(a.forts ? { forts: a.forts.map(hold) } : {}) })),
    powers: raw.powers.map(hold),
  },
  meta: metaTables,
  skins: skinList.map(hold),
  counters: counterFile,
});

/** Every card, power, fort or skin id a save refers to. */
function idsIn(s: SaveDoc): string[] {
  const ids: (string | null)[] = [...Object.keys(s.collection), ...s.powersOwned, ...s.fortsOwned, ...s.skins.owned, ...Object.values(s.skins.equipped)];
  for (const p of s.warPlans) for (const l of Object.values(p.loadouts)) ids.push(...l.units, ...l.turrets, l.powers.home, l.powers.field, l.fort ?? null);
  for (const c of s.capsules.pending) ids.push(...c.contents.stacks.map((x) => x.card), c.contents.skin);
  for (const c of s.capsules.wardrobe) ids.push(c.skin);
  return ids.filter((x): x is string => typeof x === 'string');
}

describe.each(TESTER_PROFILES)('test profile %s', (kind: TesterProfile) => {
  const save = testerSave(kind, content, clockAt(NOW), 7);

  it('passes the save validator at the current version', () => {
    const v = validateSaveDoc(save);
    expect(v.ok ? [] : v.issues).toEqual([]);
    expect(save.v).toBe(SAVE_VERSION);
  });

  it('survives the real store: checksum, migrations and a reload', async () => {
    const storage = new MemoryStorage();
    const a = new LocalSaveStore({ storage });
    await a.save(save, { immediate: true });
    expect(a.problem).toBeNull();
    const b = new LocalSaveStore({ storage });
    expect(await b.load()).toEqual(save);
    expect(b.loadReport?.status).toBe('loaded');
  });

  it('is past the onboarding with every Home feature open and no unlock moment waiting', () => {
    expect(onboardingStep(save)).toBe('home');
    expect(bootRoute(save)).toBe('home');
    for (const f of UNLOCK_ORDER) expect(featureOpen(save, t, f), f).toBe(true);
    expect(pendingUnlock(save, t)).toBeNull();
    expect(firstUpgradePending(save)).toBe(false);
  });

  it('is marked as a test profile', () => {
    expect(isTesterProfile(save)).toBe(true);
  });

  it('holds no unreleased card, power, fort or skin', () => {
    // The live content: whatever is held back (nothing while every wave is released) stays out.
    const live = new Set(t.order.unreleased);
    expect(idsIn(save).filter((id) => live.has(id))).toEqual([]);
    // A content table with a held-back wave: the profile leaves every one of its ids out and stays valid.
    const g = asContent(gatedContent);
    expect([...HELD_BACK].filter((id) => !g.order.unreleased.includes(id))).toEqual([]);
    const gated = testerSave(kind, gatedContent, clockAt(NOW), 7);
    expect(idsIn(gated).filter((id) => HELD_BACK.has(id))).toEqual([]);
    const v = validateSaveDoc(gated);
    expect(v.ok ? [] : v.issues).toEqual([]);
  });

  it('sets every timer relative to now: nothing in the future, nothing expired', () => {
    expect(save.createdAt).toBeLessThan(NOW);
    expect(save.capsules.chargesUpdatedAt).toBeLessThanOrEqual(NOW);
    expect(NOW - save.capsules.chargesUpdatedAt).toBeLessThan(t.capsules.charges.regenMs);
    for (const c of save.capsules.pending) expect(c.createdAt).toBe(NOW);
    for (const c of save.capsules.wardrobe) expect(c.createdAt).toBe(NOW);
    // Ticking the timers now changes nothing: the quests, Daily day and Sundial are already current.
    expect(meta.tickTimers(save, clockAt(NOW))).toEqual(save);
    // The same profile built a day later moves with the clock.
    const later = testerSave(kind, content, clockAt(NOW + 86_400_000), 7);
    expect(later.createdAt - save.createdAt).toBe(86_400_000);
    expect(later.quests.dayKey).not.toBe(save.quests.dayKey);
  });

  it('plays: the active plan is valid for every length and a capsule opens', () => {
    const plan = save.warPlans[save.activePlan]!;
    for (const f of t.order.formats) {
      expect(meta.validatePlan(plan, save, content, f), f).toEqual([]);
    }
    const first = save.capsules.pending[0]!;
    const opened = meta.openCapsule(save, first.id);
    expect(opened.save.capsules.pending.length).toBe(save.capsules.pending.length - 1);
    expect(validateSaveDoc(opened.save).ok).toBe(true);
  });
});

describe('everything unlocked', () => {
  const save = testerSave('everything', content, clockAt(NOW), 7);
  const top = t.rarities.upgradeAmber.length + 1;

  it('owns every released card at a high level, with the copies for the last upgrade', () => {
    for (const id of [...t.order.units, ...t.order.turrets]) {
      expect(save.collection[id]?.level, id).toBe(top - 1);
      expect(save.collection[id]!.copies, id).toBeGreaterThan(0);
    }
    expect(Object.keys(save.collection).length).toBe(t.order.units.length + t.order.turrets.length);
  });

  it('owns every power, fort, skin and cosmetic, with both power slots and the Fort slot open', () => {
    expect([...save.powersOwned].sort()).toEqual([...t.order.powers].sort());
    expect([...save.fortsOwned].sort()).toEqual([...t.order.forts].sort());
    expect([...save.skins.owned].sort()).toEqual([...t.order.skins].sort());
    const owned = new Set(save.cosmetics.owned);
    // every released collection item; an item whose art is not finished stays out (PLAN 2e)
    for (const x of t.cosmetics.collections.items) expect(owned.has(`${x.collection}.${x.id}`), `${x.collection}.${x.id}`).toBe(x.released !== false);
    for (const b of t.cosmetics.banners) expect(owned.has(b.id)).toBe(true);
    expect(save.flags['power.field']).toBe(true);
    expect(save.flags['fort.slot']).toBe(true);
    for (const age of t.order.ages) expect(save.warPlans[0]!.loadouts[age].fort).not.toBeNull();
    expect(save.warPlans.length).toBe(3);
  });

  it('owns every released scene of every age, and an item held back stays out (save v14, PLAN 2e)', () => {
    for (const age of t.order.ages) {
      for (const x of t.cosmetics.collections.items.filter((i) => i.collection === 'scene' && i.age === age && i.released !== false)) {
        expect(save.cosmetics.owned, `${age}: ${x.id}`).toContain(`scene.${x.id}`);
      }
    }
    expect(save.cosmetics.equipped.scenes).toEqual({});
    // a content table with one scene per age held back and one released: only the released ones are owned
    const items = [
      ...t.cosmetics.collections.items,
      ...t.order.ages.flatMap((age) => [
        { id: `test_${age}_out`, collection: 'scene' as const, rarity: 'rare' as const, source: { kind: 'capsule' as const }, art: `cosmetic.scene.test_${age}_out`, nameKey: `cosmetic.scene.test_${age}_out.name`, age, released: false },
        { id: `test_${age}_in`, collection: 'scene' as const, rarity: 'rare' as const, source: { kind: 'capsule' as const }, art: `cosmetic.scene.test_${age}_in`, nameKey: `cosmetic.scene.test_${age}_in.name`, age },
      ]),
    ];
    const withScenes = { ...t, cosmetics: { ...t.cosmetics, collections: { ...t.cosmetics.collections, items } } } as Content;
    const s = testerSave('everything', withScenes, clockAt(NOW), 7);
    for (const age of t.order.ages) {
      expect(s.cosmetics.owned).toContain(`scene.test_${age}_in`);
      expect(s.cosmetics.owned).not.toContain(`scene.test_${age}_out`);
    }
    expect(validateSaveDoc(s).ok).toBe(true);
  });

  it('has the War Path beaten, every Conquest General open, a mid arena and plenty to spend', () => {
    for (const id of t.warPath.order) expect(save.warPath.stars[id], id).toBe(3);
    expect(meta.conquestBoard(save, content).every((e) => e.open)).toBe(true);
    expect(save.arenaIndex).toBeGreaterThan(1);
    expect(save.arenaIndex).toBeLessThan(t.arenas.list.length - 2);
    expect(save.trophies.current).toBeGreaterThanOrEqual(t.arenas.list[save.arenaIndex]!.trophies);
    expect(save.currencies.amber).toBeGreaterThanOrEqual(100_000);
    expect(save.currencies.dust).toBeGreaterThanOrEqual(50_000);
    // A road node is left to try a claim.
    expect(t.trophyRoad.nodes.some((n) => n.trophies <= save.trophies.best && !save.trophies.roadClaimed.includes(n.trophies))).toBe(true);
  });

  it('holds two capsules of every tier (one climbing from Clay) and Wardrobe Crates', () => {
    const tiers = [...t.capsules.tierOrder];
    expect(save.capsules.pending.map((c) => c.tier)).toEqual([...[...tiers].reverse(), ...tiers]);
    // The Sundial ones climb from Clay; the road ones show their tier.
    expect(save.capsules.pending.filter((c) => c.kind === 'win').every((c) => c.startTier === 'clay')).toBe(true);
    expect(save.capsules.pending.filter((c) => c.kind === 'road').every((c) => c.startTier === c.tier)).toBe(true);
    for (const c of save.capsules.pending) {
      expect(c.scriptIndex).toBeNull();
      expect(c.contents.stacks.length).toBeGreaterThan(0);
    }
    expect(save.capsules.wardrobe.length).toBe(2);
    expect(save.capsules.charges).toBe(t.capsules.charges.max);
  });
});

describe('mid-game', () => {
  const save = testerSave('midGame', content, clockAt(NOW), 7);

  it('is a player in progress: part of the collection, the War Path and the road', () => {
    const all = t.order.units.length + t.order.turrets.length;
    const n = Object.keys(save.collection).length;
    expect(n).toBeGreaterThan(20);
    expect(n).toBeLessThan(all);
    expect(Math.max(...Object.values(save.collection).map((e) => e.level))).toBeLessThan(t.rarities.upgradeAmber.length);
    const beaten = t.warPath.order.filter((id) => (save.warPath.stars[id] ?? 0) > 0).length;
    expect(beaten).toBe(16);
    expect(save.arenaIndex).toBe(2);
    expect(save.capsules.pending.length).toBe(4);
    expect(save.currencies.amber).toBeLessThan(10_000);
  });
});

describe('the URL flag', () => {
  it('asks for the dialog only with tester=1 and is removed without touching the rest', () => {
    expect(testerRequested('?tester=1')).toBe(true);
    expect(testerRequested('?dev=1&tester=1')).toBe(true);
    expect(testerRequested('')).toBe(false);
    expect(testerRequested('?tester=0')).toBe(false);
    expect(urlWithoutTester('https://x.io/ageborn/?tester=1')).toBe('https://x.io/ageborn/');
    expect(urlWithoutTester('https://x.io/ageborn/?a=2&tester=1#h')).toBe('https://x.io/ageborn/?a=2#h');
  });
});
