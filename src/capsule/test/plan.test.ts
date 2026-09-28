import { describe, expect, it } from 'vitest';
import {
  checkPlan,
  longestUnskippableMs,
  nominalDurationMs,
  planCapsuleShow,
  planOpenAll,
  planWardrobeShow,
  SHOW_TIMING,
  type ShowStep,
  type StrikeStep,
} from '../plan';
import { crate, reveal, stack, testCatalog } from './fixtures';

const catalog = testCatalog();

/** Sound ids a capsule show may use (DESIGN A13 "Capsules" plus UI and spawn sounds). */
const A13_SOUNDS = new Set([
  'cap_thud', 'cap_riser', 'cap_climb_1', 'cap_climb_2', 'cap_climb_3', 'cap_climb_4', 'cap_clunk', 'cap_burst',
  'card_flip', 'foil_shine', 'rarity_common', 'rarity_rare', 'rarity_epic', 'rarity_legendary', 'walkout_bass',
  'copy_tick', 'upgrade_ready', 'reel_tick', 'ui_confirm', 'spawn_pop', 'spawn_heavy', 'spawn_legendary', 'swing_whoosh',
  // Juice layered from the shared sheet: the landing thump, strike hits, the burst riser and
  // explosion, the card snap, count-up ticks and the name slam.
  'step_heavy', 'hit_heavy', 'evolve_riser', 'explosion_m', 'explosion_l', 'flare_pop', 'xp_tick', 'upgrade_slam',
]);

function kinds(steps: ShowStep[]): string[] {
  return steps.map((s) => s.kind);
}

const bronze = () =>
  reveal({
    tier: 'bronze',
    stacks: [stack('bonker', 'common', { copies: 3 }), stack('spear_hunter', 'rare', { isNew: true }), stack('pebbler', 'common', { copies: 3 })],
  });

describe('planCapsuleShow (DESIGN A10)', () => {
  it('follows the storyboard: arrival, charge, 4 strikes, burst, fan, reveals, duplicates, summary', () => {
    const plan = planCapsuleShow(bronze(), { catalog });
    expect(kinds(plan.steps)).toEqual([
      'arrival', 'charge', 'strike', 'strike', 'strike', 'strike', 'burst', 'fan',
      'signal', 'flip', 'signal', 'flip', 'signal', 'flip',
      'duplicates', 'duplicates', 'duplicates', 'summary',
    ]);
    expect(checkPlan(plan)).toEqual([]);
    expect(plan.startTier).toBe('clay');
    expect(plan.finalTier).toBe('bronze');
  });

  it('reveals cards rarest last', () => {
    const plan = planCapsuleShow(
      reveal({
        tier: 'aeon',
        stacks: [
          stack('matriarch', 'legendary'),
          stack('sabertooth', 'epic'),
          stack('bonker', 'common'),
          stack('spear_hunter', 'rare'),
          stack('pebbler', 'common'),
        ],
      }),
      { catalog },
    );
    expect(plan.cards.map((c) => c.rarity)).toEqual(['common', 'common', 'rare', 'epic', 'legendary']);
    expect(plan.cards.map((c) => c.slot)).toEqual([0, 1, 2, 3, 4]);
  });

  it('plays climb notes a step higher per tier and clunks on misses, never a penalty sound', () => {
    const plan = planCapsuleShow(reveal({ tier: 'jade', startTier: 'bronze', stacks: [] }), { catalog });
    const strikes = plan.steps.filter((s): s is StrikeStep => s.kind === 'strike');
    expect(strikes.map((s) => s.climb)).toEqual([false, false, true, true]);
    // cap_climb_N is the note of the tier reached: Silver = 2, Jade = 3.
    expect(strikes.map((s) => s.cues[0]?.sound)).toEqual(['cap_clunk', 'cap_clunk', 'cap_climb_2', 'cap_climb_3']);
    expect(strikes.map((s) => s.to)).toEqual(['bronze', 'bronze', 'silver', 'jade']);
    expect(strikes.every((s) => s.maxWaitMs === SHOW_TIMING.strikeIdleMs)).toBe(true);
  });

  it('starts fixed-tier capsules at the burst (A6.4 Trophy Road)', () => {
    const plan = planCapsuleShow(reveal({ tier: 'silver', startTier: 'silver', kind: 'road', stacks: [stack('bonker', 'common')] }), { catalog });
    expect(plan.steps[0]?.kind).toBe('burst');
    expect(plan.steps.some((s) => s.kind === 'strike')).toBe(false);
    expect(checkPlan(plan)).toEqual([]);
  });

  it('gives flips their rarity timing: Common 0.15 s, Rare 0.4 s, Epic 0.8 s, after a pre-signal that grows with the rarity', () => {
    const plan = planCapsuleShow(
      reveal({ tier: 'silver', stacks: [stack('a', 'common'), stack('b', 'rare'), stack('c', 'epic')] }),
      { catalog },
    );
    const flips = plan.steps.filter((s) => s.kind === 'flip');
    expect(flips.map((s) => (s.kind === 'flip' ? s.flipMs : 0))).toEqual([150, 400, 800]);
    const signals = plan.steps.filter((s) => s.kind === 'signal');
    expect(signals.map((s) => s.durationMs)).toEqual([SHOW_TIMING.signalMs.common, SHOW_TIMING.signalMs.rare, SHOW_TIMING.signalMs.epic]);
    expect(SHOW_TIMING.signalMs.common).toBeLessThan(SHOW_TIMING.signalMs.rare);
    expect(SHOW_TIMING.signalMs.rare).toBeLessThan(SHOW_TIMING.signalMs.epic);
    expect(signals.map((s) => s.cues[0]?.sound)).toEqual(['rarity_common', 'rarity_rare', 'rarity_epic']);
  });

  it('adds foil sweeps (0.5 s, Holo 1 s) and NEW stamps', () => {
    const plan = planCapsuleShow(
      reveal({
        tier: 'silver',
        stacks: [stack('a', 'common', { foil: 'bronze' }), stack('b', 'rare', { foil: 'silver', isNew: true }), stack('c', 'rare', { foil: 'holo' })],
      }),
      { catalog },
    );
    const flips = plan.steps.flatMap((s) => (s.kind === 'flip' ? [s] : []));
    expect(flips.map((f) => f.foilMs)).toEqual([500, 500, 1000]);
    expect(flips.map((f) => f.stampMs)).toEqual([0, SHOW_TIMING.stampMs, 0]);
    expect(flips.every((f) => f.cues.some((c) => c.sound === 'foil_shine'))).toBe(true);
    expect(checkPlan(plan)).toEqual([]);
  });

  it('gives a NEW Epic a 2 s mini-walkout, an owned Epic none', () => {
    const plan = planCapsuleShow(
      reveal({ tier: 'silver', stacks: [stack('sabertooth', 'epic', { isNew: true }), stack('knight', 'epic')] }),
      { catalog },
    );
    const minis = plan.steps.filter((s) => s.kind === 'miniWalkout');
    expect(minis).toHaveLength(1);
    expect(minis[0]?.durationMs).toBe(2000);
    expect(minis[0]?.kind === 'miniWalkout' && minis[0].card.card).toBe('sabertooth');
  });

  it('gives the NEW cards of onboarding capsule 1 the short walkout (A8 "Spear Hunter NEW (short walkout)")', () => {
    const stacks = () => [stack('bonker', 'common', { copies: 3 }), stack('spear_hunter', 'rare', { isNew: true }), stack('pebbler', 'common', { copies: 3 })];
    const intro = planCapsuleShow(reveal({ tier: 'bronze', stacks: stacks(), scriptIndex: 1 }), { catalog });
    const minis = intro.steps.flatMap((s) => (s.kind === 'miniWalkout' ? [s] : []));
    expect(minis.map((m) => m.card.card)).toEqual(['spear_hunter']);
    expect(minis[0]?.durationMs).toBe(2000);
    expect(minis[0]?.cues[0]?.sound).toBe('spawn_pop');
    // It follows the card's own flip and NEW stamp.
    const order = kinds(intro.steps).filter((k) => ['flip', 'miniWalkout'].includes(k));
    expect(order.slice(-2)).toEqual(['flip', 'miniWalkout']);
    expect(checkPlan(intro)).toEqual([]);
    // Other script capsules and ordinary capsules keep the A10 rule: NEW Epics only.
    for (const scriptIndex of [null, 2, 3]) {
      const plan = planCapsuleShow(reveal({ tier: 'bronze', stacks: stacks(), scriptIndex }), { catalog });
      expect(plan.steps.some((s) => s.kind === 'miniWalkout')).toBe(false);
    }
  });

  it('never gives a NEW Legendary the short repeat walkout, even if firstLegendaryReveal misses it', () => {
    const plan = planCapsuleShow(reveal({ tier: 'aeon', stacks: [stack('matriarch', 'legendary', { isNew: true })], firstLegendary: [] }), { catalog });
    const w = plan.steps.find((s) => s.kind === 'walkout');
    expect(w?.kind === 'walkout' && w.first).toBe(true);
    expect(w?.skippable).toBe(false);
    expect(w?.durationMs).toBe(SHOW_TIMING.walkoutFirstMs);
  });

  it('plays a first-ever Legendary walkout of 8-10 s that cannot be skipped, 3 s and skippable after', () => {
    const first = planCapsuleShow(
      reveal({ tier: 'aeon', stacks: [stack('matriarch', 'legendary', { isNew: true })], firstLegendary: ['matriarch'] }),
      { catalog },
    );
    const w1 = first.steps.find((s) => s.kind === 'walkout');
    expect(w1?.durationMs).toBeGreaterThanOrEqual(8000);
    expect(w1?.durationMs).toBeLessThanOrEqual(10000);
    expect(w1?.skippable).toBe(false);
    expect(w1?.fastForward).toBe(false);
    expect(w1?.cues.map((c) => c.sound)).toEqual(['rarity_legendary', 'walkout_bass', 'spawn_legendary', 'upgrade_slam']);
    // The gold pre-signal comes first, the card lands face up after the walkout.
    const order = kinds(first.steps).filter((k) => ['signal', 'walkout', 'flip'].includes(k));
    expect(order).toEqual(['signal', 'walkout', 'flip']);

    const repeat = planCapsuleShow(reveal({ tier: 'aeon', stacks: [stack('matriarch', 'legendary')] }), { catalog });
    const w2 = repeat.steps.find((s) => s.kind === 'walkout');
    expect(w2?.durationMs).toBe(3000);
    expect(w2?.skippable).toBe(true);
    expect(checkPlan(first)).toEqual([]);
    expect(checkPlan(repeat)).toEqual([]);
    expect(longestUnskippableMs(first)).toBeLessThanOrEqual(10000);
  });

  it('runs a duplicates step per stack and cues "upgrade ready" only when the bar fills', () => {
    const plan = planCapsuleShow(bronze(), {
      catalog,
      progress: (card) =>
        card === 'bonker' ? { level: 2, before: 1, after: 4, need: 3 } : { level: 1, before: 0, after: 1, need: 2 },
    });
    const dups = plan.steps.flatMap((s) => (s.kind === 'duplicates' ? [s] : []));
    expect(dups).toHaveLength(3);
    const bonker = dups.find((d) => d.card.card === 'bonker');
    expect(bonker?.cues.filter((c) => c.sound === 'copy_tick')).toHaveLength(3);
    expect(bonker?.cues.some((c) => c.sound === 'upgrade_ready')).toBe(true);
    expect(dups.filter((d) => d.cues.some((c) => c.sound === 'upgrade_ready'))).toHaveLength(1);
    expect(plan.summary.bestUpgrade).toBe('bonker');
  });

  it('only uses sound ids from the A13 list and keeps cues inside their steps', () => {
    const plan = planCapsuleShow(
      reveal({
        tier: 'aeon',
        stacks: [stack('a', 'common', { foil: 'holo' }), stack('b', 'epic', { isNew: true }), stack('m', 'legendary', { isNew: true })],
        firstLegendary: ['m'],
        skin: 'frost_matriarch',
      }),
      { catalog },
    );
    for (const s of plan.steps) for (const c of s.cues) expect(A13_SOUNDS.has(c.sound)).toBe(true);
    expect(checkPlan(plan)).toEqual([]);
  });

  it('shows an Aeon bonus skin as its own card with a SKIN stamp, never a walkout', () => {
    const plan = planCapsuleShow(reveal({ tier: 'aeon', stacks: [stack('a', 'common')], skin: 'woolly_tuskback' }), { catalog });
    const skin = plan.cards.find((c) => c.kind === 'skin');
    expect(skin?.rarity).toBe('epic');
    expect(skin?.isNew).toBe(false);
    const flip = plan.steps.find((s) => s.kind === 'flip' && s.card.kind === 'skin');
    expect(flip?.kind === 'flip' && flip.stampMs).toBe(SHOW_TIMING.stampMs);
    expect(plan.steps.some((s) => s.kind === 'miniWalkout' || s.kind === 'walkout')).toBe(false);
  });

  it('builds the burst longer for higher tiers, then pops inside the step', () => {
    const build = (tier: 'clay' | 'silver' | 'aeon') => {
      const b = planCapsuleShow(reveal({ tier, stacks: [stack('a', 'common')] }), { catalog }).steps.find((s) => s.kind === 'burst');
      return b?.kind === 'burst' ? b : null;
    };
    const clay = build('clay');
    const silver = build('silver');
    const aeon = build('aeon');
    expect(clay && silver && aeon).toBeTruthy();
    if (!clay || !silver || !aeon) return;
    expect(clay.buildMs).toBeLessThan(silver.buildMs);
    expect(silver.buildMs).toBeLessThan(aeon.buildMs);
    for (const b of [clay, silver, aeon]) {
      expect(b.buildMs).toBeLessThan(b.durationMs);
      expect(b.cues.find((c) => c.sound === 'cap_burst')?.atMs).toBe(b.buildMs);
    }
  });

  it('makes every strike build: non-climb clunks rise in pitch and are never a penalty sound', () => {
    const plan = planCapsuleShow(reveal({ tier: 'clay', stacks: [stack('a', 'common')] }), { catalog });
    const strikes = plan.steps.filter((s): s is StrikeStep => s.kind === 'strike');
    expect(strikes.every((s) => !s.climb)).toBe(true);
    const pitches = strikes.map((s) => s.cues.find((c) => c.sound === 'cap_clunk')?.pitchBp ?? 0);
    expect(pitches).toEqual([...pitches].sort((a, b) => a - b));
    expect(new Set(pitches).size).toBe(4);
  });

  it('counts the copies up after a flip, inside the flip step', () => {
    const plan = planCapsuleShow(reveal({ tier: 'bronze', stacks: [stack('a', 'common', { copies: 12 }), stack('b', 'rare', { copies: 1 })] }), { catalog });
    const flips = plan.steps.filter((s) => s.kind === 'flip');
    const many = flips.find((s) => s.kind === 'flip' && s.card.card === 'a');
    const one = flips.find((s) => s.kind === 'flip' && s.card.card === 'b');
    expect(many?.kind === 'flip' && many.countMs).toBeGreaterThan(0);
    expect(one?.kind === 'flip' && one.countMs).toBe(0);
    expect(many?.cues.some((c) => c.sound === 'xp_tick')).toBe(true);
    expect(checkPlan(plan)).toEqual([]);
  });

  it('flags a too-long step', () => {
    const plan = planCapsuleShow(bronze(), { catalog });
    const broken = { ...plan, steps: plan.steps.map((s) => (s.kind === 'burst' ? { ...s, durationMs: 1500 } : s)) };
    expect(checkPlan(broken).some((m) => m.includes('burst'))).toBe(true);
  });

  it('a Bronze capsule plays in a few seconds when the player taps at once', () => {
    const ms = nominalDurationMs(planCapsuleShow(bronze(), { catalog }));
    expect(ms).toBeGreaterThan(4000);
    expect(ms).toBeLessThan(10000);
  });
});

describe('planOpenAll (DESIGN A10 Rules)', () => {
  it('shows only Epic-or-better reveals, then one summary of everything', () => {
    const reveals = [
      reveal({ id: 'a', tier: 'bronze', stacks: [stack('bonker', 'common', { copies: 3 }), stack('spear_hunter', 'rare')] }),
      reveal({ id: 'b', tier: 'silver', stacks: [stack('bonker', 'common', { copies: 6 }), stack('sabertooth', 'epic', { isNew: true })] }),
      reveal({ id: 'c', tier: 'aeon', stacks: [stack('matriarch', 'legendary')], amber: 1500 }),
    ];
    const plan = planOpenAll(reveals, { catalog });
    expect(plan.mode).toBe('openAll');
    expect(plan.steps[0]?.kind).toBe('volley');
    expect(plan.cards.map((c) => c.card)).toEqual(['sabertooth', 'matriarch']);
    expect(plan.steps.some((s) => s.kind === 'strike' || s.kind === 'duplicates')).toBe(false);
    expect(plan.summary.items.map((i) => i.card)).toEqual(['matriarch', 'sabertooth', 'spear_hunter', 'bonker']);
    expect(plan.summary.items.find((i) => i.card === 'bonker')?.copies).toBe(9);
    expect(plan.summary.amber).toBe(120 + 120 + 1500);
    expect(plan.summary.capsuleCount).toBe(3);
    expect(checkPlan(plan)).toEqual([]);
  });

  it('keeps a 10-capsule volley within 2 s', () => {
    const reveals = Array.from({ length: 10 }, (_, i) => reveal({ id: `c${i}`, tier: 'clay', stacks: [stack(`x${i}`, 'common')] }));
    const plan = planOpenAll(reveals, { catalog });
    expect(plan.steps[0]?.durationMs).toBeLessThanOrEqual(2000);
    expect(plan.steps[0]?.cues).toHaveLength(10);
    expect(kinds(plan.steps)).toEqual(['volley', 'summary']);
  });
});

describe('planWardrobeShow (DESIGN A10, A15.3: card flip, no reel)', () => {
  for (const [skin, rarity] of [
    ['tin_can', 'rare'],
    ['ghost_corsair', 'epic'],
    ['frost_matriarch', 'legendary'],
  ] as const) {
    it(`reveals a ${rarity} skin with the card flip: arrival, crate open, pre-signal, flip`, () => {
      const plan = planWardrobeShow(crate(skin, rarity), { catalog });
      expect(kinds(plan.steps)).toEqual(['crateArrival', 'crateOpen', 'signal', 'flip', 'summary']);
      expect(plan.steps.some((x) => (x.kind as string).startsWith('reel'))).toBe(false);
      expect(plan.steps.flatMap((x) => x.cues).some((c) => c.sound === 'reel_tick')).toBe(false);
      expect(plan.steps[2]?.cues[0]?.sound).toBe(`rarity_${rarity}`);
      expect(checkPlan(plan)).toEqual([]);
      expect(plan.summary.newSkins).toEqual([skin]);
    });
  }

  it('shows a duplicate crate skin as Dust, not NEW', () => {
    const plan = planWardrobeShow(crate('tin_can', 'rare', { duplicateDust: 50 }), { catalog });
    expect(plan.cards[0]?.isNew).toBe(false);
    expect(plan.summary.dust).toBe(50);
    expect(plan.summary.newSkins).toEqual([]);
  });
});

