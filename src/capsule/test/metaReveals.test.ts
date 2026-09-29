/**
 * The show planned from real meta reveals (WP7): the A8 onboarding beats, and every plan within the
 * A10 limits with no data issues. Tests may cross layers; the capsule package itself never imports
 * the meta.
 */
import { describe, expect, it } from 'vitest';
import type { CapsuleReveal, SaveDoc } from '@/contracts';
import { content } from '@/content';
import { createMeta, strikeCounts } from '@/meta';
import { createCatalog } from '../catalog';
import { resolveStrikes, strikePattern, SUMMIT_ABOVE, TIER_ORDER } from '../tiers';
import { checkPlan, longestUnskippableMs, planCapsuleShow, planOpenAll, SHOW_LIMITS } from '../plan';
import { pityLines } from '../summaryModel';

const M = createMeta(content);
const catalog = createCatalog(content);
const clock = { now: () => Date.UTC(2026, 2, 2, 12), offsetMs: () => 0 };

/** Opens the oldest waiting capsule (the first Supply Capsule arrives after capsule 2), else a new one. */
function openNext(s: SaveDoc, kind: 'win' | 'daily' | 'meter' = 'win'): { save: SaveDoc; reveal: CapsuleReveal } {
  const g = s.capsules.pending.length > 0 ? s : M.grantCapsule(s, kind, content, clock);
  const cap = g.capsules.pending[0];
  if (!cap) throw new Error('no capsule granted');
  return M.openCapsule(g, cap.id);
}

describe('the show and the meta agree on the ladder (A6.4, A10)', () => {
  it('mirrors the content tier order and summit tier', () => {
    expect(TIER_ORDER).toEqual(content.capsules.tierOrder);
    expect(SUMMIT_ABOVE).toBe(content.capsules.summitAbove);
  });

  it('meta strikes and resolveStrikes agree for every start and final pair', () => {
    for (const start of TIER_ORDER) {
      for (const tier of TIER_ORDER.slice(TIER_ORDER.indexOf(start))) {
        const { main, summit } = strikeCounts(content, start, tier);
        const r = resolveStrikes({
          capsule: { id: 'x', kind: 'win', tier, startTier: start, scriptIndex: null, age: null, createdAt: 0, contents: { stacks: [], amber: 0, dust: 0, skin: null } },
          climbs: main + summit,
          strikeClimbs: strikePattern(main),
        });
        expect(r.issues, `${start}>${tier}`).toEqual([]);
        expect(r.summitTiers, `${start}>${tier}`).toHaveLength(summit);
      }
    }
  });
});

describe('shows planned from meta reveals', () => {
  it('plays the onboarding script as A8 describes it', () => {
    let s = M.newSave(content, clock, 7);
    const plans = [];
    for (let i = 0; i < 5; i++) {
      const o = openNext(s);
      s = o.save;
      plans.push(planCapsuleShow(o.reveal, { catalog }));
    }
    const [one, , , four, five] = plans;
    // Capsule 1: a scripted climb to Bronze, Spear Hunter and Phalangite NEW (A17.13) with short walkouts.
    expect(one?.finalTier).toBe('bronze');
    expect(one?.steps.filter((x) => x.kind === 'strike' && x.climb)).toHaveLength(1);
    expect(one?.steps.flatMap((x) => (x.kind === 'miniWalkout' ? [x.card.card] : []))).toEqual(['spear_hunter', 'phalangite']);
    // Capsule 4: the first Epic, NEW, with its mini-walkout.
    expect(four?.steps.some((x) => x.kind === 'miniWalkout' && x.card.rarity === 'epic')).toBe(true);
    // Capsule 5: Mammoth Matriarch, the full walkout, which cannot be skipped.
    const walkout = five?.steps.find((x) => x.kind === 'walkout');
    expect(walkout?.kind === 'walkout' && walkout.card.card).toBe('mammoth_matriarch');
    expect(walkout?.kind === 'walkout' && walkout.first).toBe(true);
    expect(walkout?.skippable).toBe(false);
    for (const p of plans) {
      expect(p.issues).toEqual([]);
      expect(checkPlan(p)).toEqual([]);
    }
  });

  it('only promises what the meta keeps: "Epic within N" and "Legendary within N" always come true (A6.5)', () => {
    let s = M.newSave(content, clock, 23);
    const reveals: CapsuleReveal[] = [];
    for (let i = 0; i < 300; i++) {
      const o = openNext(s);
      s = o.save;
      reveals.push(o.reveal);
    }
    const has = (r: CapsuleReveal | undefined, rarity: 'epic' | 'legendary') => r?.capsule.contents.stacks.some((x) => x.rarity === rarity) ?? false;
    let checked = 0;
    reveals.forEach((r, i) => {
      // The panel during capsule i's show reads its `pityBefore`; "within N" counts capsule i as the first.
      const [epic, legendary] = pityLines(r.pityBefore, content.capsules.pity);
      for (const [line, rarity] of [[epic, 'epic'], [legendary, 'legendary']] as const) {
        if (!line || i + line.n > reveals.length) continue;
        expect(reveals.slice(i, i + line.n).some((x) => has(x, rarity)), `capsule ${i}: ${line.key} ${line.n}`).toBe(true);
        checked++;
      }
    });
    expect(checked).toBeGreaterThan(400);
  });

  it('keeps every show from 150 opened capsules within the A10 limits, one by one and as Open all', () => {
    let s = M.newSave(content, clock, 11);
    const batch: CapsuleReveal[] = [];
    for (let i = 0; i < 150; i++) {
      const o = openNext(s, i % 7 === 0 ? 'daily' : i % 5 === 0 ? 'meter' : 'win');
      s = o.save;
      const plan = planCapsuleShow(o.reveal, { catalog });
      expect(plan.issues).toEqual([]);
      expect(checkPlan(plan)).toEqual([]);
      expect(longestUnskippableMs(plan)).toBeLessThanOrEqual(SHOW_LIMITS.unskippable);
      batch.push(o.reveal);
      if (batch.length === 10) {
        expect(checkPlan(planOpenAll(batch, { catalog }))).toEqual([]);
        batch.length = 0;
      }
    }
  });
});
