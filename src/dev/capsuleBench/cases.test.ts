/**
 * WP10 Definition of Done over every capsule bench case (DESIGN C2/WP10):
 * - the bench covers every tier and start tier, a first-time and a repeat Legendary, a NEW Epic,
 *   each foil and a 10-capsule "Open all";
 * - a climb is never followed by a non-climb in any bench case;
 * - no step exceeds the time limits, and skip and fast-forward work.
 */
import { describe, expect, it } from 'vitest';
import { content } from '@/content';
import { createCatalog } from '@/capsule/catalog';
import { checkPlan, longestUnskippableMs, planOpenAll, planWardrobeShow, SHOW_LIMITS, type ShowPlan, type ShowStep } from '@/capsule/plan';
import { ShowRunner, type ShowView } from '@/capsule/runner';
import { isBackLoaded, TIER_ORDER } from '@/capsule/tiers';
import { BENCH_CASES, type BenchCase } from './cases';

const catalog = createCatalog(content);

function planFor(c: BenchCase): ShowPlan {
  if (c.crate) return planWardrobeShow(c.crate, { catalog });
  return planOpenAll(c.reveals ?? [], { catalog, quickReveal: c.quickReveal === true, ...(c.progress ? { progress: c.progress } : {}) });
}

const nullView: ShowView = { enter() {}, progress() {}, exit() {} };

/** Plays a case to its summary; `skipEvery` presses Skip on every frame, `hold` fast-forwards. */
function play(plan: ShowPlan, o: { hold?: boolean; skip?: boolean }): { ms: number; kinds: string[] } {
  const kinds: string[] = [];
  const r = new ShowRunner(plan, { ...nullView, enter: (s: ShowStep, instant: boolean) => void (!instant && kinds.push(s.kind)) });
  r.start();
  if (o.hold) r.setHold(true);
  let ms = 0;
  while (!r.done && ms < 180000) {
    if (o.skip) r.skip();
    r.update(16);
    ms += 16;
  }
  expect(r.done).toBe(true);
  expect(r.state.kind).toBe('summary');
  return { ms, kinds };
}

describe('capsule bench cases (WP10 DoD)', () => {
  it('covers every tier and start tier', () => {
    const pairs = new Set<string>();
    for (const c of BENCH_CASES) for (const r of c.reveals ?? []) pairs.add(`${r.capsule.startTier}>${r.capsule.tier}`);
    for (const s of TIER_ORDER) for (const t of TIER_ORDER.slice(TIER_ORDER.indexOf(s))) expect(pairs.has(`${s}>${t}`)).toBe(true);
  });

  it('covers a first-time and a repeat Legendary, a NEW Epic, each foil, and a 10-capsule Open all', () => {
    const plans = BENCH_CASES.map(planFor);
    const steps = plans.flatMap((p) => p.steps);
    expect(steps.some((s) => s.kind === 'walkout' && s.first)).toBe(true);
    expect(steps.some((s) => s.kind === 'walkout' && !s.first)).toBe(true);
    expect(steps.some((s) => s.kind === 'miniWalkout')).toBe(true);
    for (const foil of ['bronze', 'silver', 'holo']) expect(steps.some((s) => s.kind === 'flip' && s.card.foil === foil)).toBe(true);
    expect(BENCH_CASES.some((c) => (c.reveals?.length ?? 0) === 10)).toBe(true);
    // A card-flip Wardrobe Crate for each skin rarity (A15.3), and a quick-reveal capsule (A15.6).
    for (const r of ['rare', 'epic', 'legendary']) expect(BENCH_CASES.some((c) => c.crate?.crate.rarity === r)).toBe(true);
    const quick = BENCH_CASES.find((c) => c.quickReveal);
    expect(quick).toBeDefined();
    if (quick) expect(planFor(quick).steps[0]?.kind).toBe('burst');
  });

  it('plays the onboarding script beats: capsule 1 climbs to Bronze with a short Spear Hunter walkout, capsule 5 the full Matriarch walkout (A8)', () => {
    const byId = (id: string) => {
      const c = BENCH_CASES.find((x) => x.id === id);
      if (!c) throw new Error(`no bench case ${id}`);
      return planFor(c);
    };
    const one = byId('script-1');
    expect(one.finalTier).toBe('bronze');
    expect(one.steps.filter((s) => s.kind === 'strike' && s.climb)).toHaveLength(1);
    expect(one.steps.flatMap((s) => (s.kind === 'miniWalkout' ? [s.card.card] : []))).toEqual(['spear_hunter']);
    const five = byId('script-5');
    expect(five.steps.some((s) => s.kind === 'walkout' && s.first && s.card.card === 'mammoth_matriarch')).toBe(true);
  });

  for (const c of BENCH_CASES) {
    describe(c.id, () => {
      const plan = planFor(c);

      it('never follows a climb with a non-climb', () => {
        const strikes = plan.steps.flatMap((s) => (s.kind === 'strike' ? [s.climb] : []));
        expect(isBackLoaded(strikes)).toBe(true);
        for (const r of c.reveals ?? []) expect(isBackLoaded(r.strikeClimbs)).toBe(true);
        expect(plan.issues).toEqual([]);
      });

      it('keeps every step within its time limit', () => {
        expect(checkPlan(plan)).toEqual([]);
        expect(longestUnskippableMs(plan)).toBeLessThanOrEqual(SHOW_LIMITS.unskippable);
      });

      it('skips and fast-forwards to the summary', () => {
        const normal = play(plan, {});
        const held = play(plan, { hold: true });
        const skipped = play(plan, { skip: true });
        expect(held.ms).toBeLessThanOrEqual(normal.ms);
        expect(skipped.ms).toBeLessThanOrEqual(held.ms);
        // Skipping never passes over a first-ever Legendary walkout.
        const firsts = plan.steps.filter((s) => s.kind === 'walkout' && s.first).length;
        expect(skipped.kinds.filter((k) => k === 'walkout').length).toBe(firsts);
        if (firsts === 0) expect(skipped.ms).toBeLessThanOrEqual(64);
      });

      if (c.crate) {
        it('reveals the crate with the card flip, never a reel (A15.3)', () => {
          expect(plan.steps.map((s) => s.kind)).toEqual(['crateArrival', 'crateOpen', 'signal', 'flip', 'summary']);
        });
      }
    });
  }
});
