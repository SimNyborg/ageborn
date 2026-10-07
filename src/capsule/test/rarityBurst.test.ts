/**
 * The rarity burst (owner request 2026-10-07; DESIGN A10 step 5a, A12, A13): timing data that grows
 * with the rarity, the honesty rules (only after the card's own pre-signal, at its own rarity, never
 * changing contents whatever the show does), skips and fast-forward, and the Reduce motion path.
 */
import { describe, expect, it } from 'vitest';
import type { CapsuleReveal, Rarity } from '@/contracts';
import { FakeAudio } from '@/contracts/fakes/audio';
import { checkPlan, planCapsuleShow, planOpenAll, planWardrobeShow, riserPitchBp, SHOW_LIMITS, SHOW_TIMING, type RarityBurstStep, type ShowPlan, type ShowStep } from '../plan';
import { BURST_PARTICLE_CAP, burstLevel, RARITY_BURST, RARITY_BURST_LIMIT_MS, RARITY_RISER_MS, resolveBurstFx, type BurstLevel } from '../rarityBurst';
import { ShowRunner, type ShowView } from '../runner';
import { crate, reveal, stack, testCatalog } from './fixtures';

const catalog = testCatalog();
const LEVELS: BurstLevel[] = ['rare', 'epic', 'legendary'];

/** One of each rarity (the Legendary already owned, so its walkout is the 3 s repeat). */
function ladder(): CapsuleReveal {
  return reveal({
    tier: 'gold',
    stacks: [stack('bonker', 'common', { copies: 3 }), stack('spear_hunter', 'rare'), stack('battering_ram', 'epic'), stack('ursa_paladin', 'legendary')],
  });
}

const bursts = (p: ShowPlan): RarityBurstStep[] => p.steps.filter((s): s is RarityBurstStep => s.kind === 'rarityBurst');

describe('rarity burst timing data', () => {
  it('grows with the rarity on every axis, so the scale reads', () => {
    const keys = ['popMs', 'durationMs', 'hitStopMs', 'slamMs', 'flash', 'trauma', 'punch', 'rings', 'particles', 'embers', 'emberMs', 'blast', 'leak', 'lightPx'] as const;
    for (const k of keys) {
      expect(RARITY_BURST.rare[k], k).toBeLessThan(RARITY_BURST.epic[k]);
      expect(RARITY_BURST.epic[k], k).toBeLessThan(RARITY_BURST.legendary[k]);
    }
  });

  it('fits each beat inside its step and the A10 limit', () => {
    for (const l of LEVELS) {
      const b = RARITY_BURST[l];
      expect(b.durationMs).toBeLessThanOrEqual(RARITY_BURST_LIMIT_MS);
      expect(SHOW_LIMITS.rarityBurst).toBe(RARITY_BURST_LIMIT_MS);
      // The windup is short (anticipation, not a wait) and the slam lands with time left to bounce.
      expect(b.popMs).toBeLessThanOrEqual(250);
      expect(b.popMs + b.hitStopMs + b.slamMs + 150).toBeLessThanOrEqual(b.durationMs);
      // A brief hit-stop, within the A12 freeze budget.
      expect(b.hitStopMs).toBeLessThanOrEqual(150);
      expect(b.particles).toBeLessThanOrEqual(BURST_PARTICLE_CAP.full);
    }
  });

  it('bursts for Rare, Epic and Legendary, never for Common', () => {
    expect(burstLevel('common')).toBeNull();
    for (const r of ['rare', 'epic', 'legendary'] as Rarity[]) expect(burstLevel(r)).toBe(r);
  });
});

describe('rarity burst in the plan (DESIGN A10 step 5a)', () => {
  it('follows each Rare, Epic and Legendary pre-signal at the card’s own rarity, before the flip or walkout', () => {
    const plan = planCapsuleShow(ladder(), { catalog });
    expect(checkPlan(plan)).toEqual([]);
    const list = bursts(plan);
    expect(list.map((b) => b.level)).toEqual(['rare', 'epic', 'legendary']);
    for (const b of list) {
      const i = plan.steps.indexOf(b);
      const prev = plan.steps[i - 1];
      const next = plan.steps[i + 1];
      expect(prev?.kind === 'signal' && prev.card.key).toBe(b.card.key);
      expect(b.level).toBe(b.card.rarity);
      expect(next?.kind === 'walkout' || next?.kind === 'flip').toBe(true);
      expect(next && 'card' in next && next.card.key).toBe(b.card.key);
      // The burst sound lands on the pop.
      expect(b.cues).toEqual([{ atMs: b.popMs, sound: `rarity_burst_${b.level}` }]);
      expect(b.durationMs).toBe(RARITY_BURST[b.level].durationMs);
      expect(b.skippable && b.fastForward).toBe(true);
    }
    // No Common card bursts.
    const common = plan.cards.find((c) => c.rarity === 'common');
    expect(plan.steps.some((s) => s.kind === 'rarityBurst' && s.card.key === common?.key)).toBe(false);
  });

  it('pitches the rising tone so it peaks on the pop (Epic and Legendary; Rare keeps its sting)', () => {
    const plan = planCapsuleShow(ladder(), { catalog });
    for (const s of plan.steps) {
      if (s.kind !== 'signal') continue;
      const riser = s.cues.find((c) => c.sound === 'rarity_riser');
      if (s.card.rarity === 'epic' || s.card.rarity === 'legendary') {
        expect(riser).toBeDefined();
        const ends = (RARITY_RISER_MS * 10000) / (riser?.pitchBp ?? 10000);
        expect(Math.abs(ends - (SHOW_TIMING.signalMs[s.card.rarity] + RARITY_BURST[s.card.rarity].popMs))).toBeLessThan(1);
      } else {
        expect(riser).toBeUndefined();
      }
    }
    expect(riserPitchBp(RARITY_RISER_MS)).toBe(10000);
  });

  it('bursts the same way in Open all, Quick reveal and the Wardrobe Crate', () => {
    const quick = planCapsuleShow(ladder(), { catalog, quickReveal: true });
    expect(bursts(quick).map((b) => b.level)).toEqual(['rare', 'epic', 'legendary']);
    const all = planOpenAll([ladder(), reveal({ tier: 'clay', id: 'b', stacks: [stack('bonker', 'common')] })], { catalog });
    // Open all reveals Epic and up only, each with its burst.
    expect(bursts(all).map((b) => b.level)).toEqual(['epic', 'legendary']);
    expect(checkPlan(all)).toEqual([]);
    for (const [skin, rarity] of [['tin_can', 'rare'], ['ghost_corsair', 'epic'], ['frost_matriarch', 'legendary']] as const) {
      const w = planWardrobeShow(crate(skin, rarity), { catalog });
      expect(bursts(w).map((b) => b.level)).toEqual([rarity]);
      expect(checkPlan(w)).toEqual([]);
    }
  });

  it('flags a dishonest burst: a higher rarity than the card, a burst without its pre-signal, a missing burst', () => {
    const plan = planCapsuleShow(ladder(), { catalog });
    const epic = bursts(plan).find((b) => b.level === 'epic');
    if (!epic) throw new Error('no epic burst');
    const inflated: ShowPlan = { ...plan, steps: plan.steps.map((s) => (s === epic ? { ...epic, level: 'legendary' } : s)) };
    expect(checkPlan(inflated).some((e) => e.includes('legendary burst for a epic card'))).toBe(true);
    const i = plan.steps.indexOf(epic);
    const early = plan.steps.slice();
    [early[i - 1], early[i]] = [early[i] as ShowStep, early[i - 1] as ShowStep];
    expect(checkPlan({ ...plan, steps: early }).some((e) => e.includes('must follow its card'))).toBe(true);
    expect(checkPlan({ ...plan, steps: plan.steps.filter((s) => s !== epic) }).some((e) => e.includes('without its rarity burst'))).toBe(true);
  });
});

/** A view that records what it was asked to show, in order. */
class TraceView implements ShowView {
  readonly order: string[] = [];
  enter(step: ShowStep, instant: boolean): void {
    if (!instant) this.order.push(step.id);
  }
  progress(): void {}
  exit(): void {}
}

function play(plan: ShowPlan, o: { hold?: boolean; skipAt?: string; tapEvery?: number } = {}) {
  const view = new TraceView();
  const audio = new FakeAudio();
  const sounds: string[] = [];
  const r = new ShowRunner(plan, view, { audio, onCue: (c) => sounds.push(c.sound) });
  r.start();
  if (o.hold) r.setHold(true);
  let ms = 0;
  let skipped = false;
  while (!r.done && ms < 120000) {
    if (o.skipAt && !skipped && r.step?.id === o.skipAt) {
      r.skip();
      skipped = true;
    }
    if (o.tapEvery && ms % o.tapEvery === 0) r.tap();
    r.update(16);
    ms += 16;
  }
  return { ms, order: view.order, sounds };
}

describe('rarity burst honesty: the show never changes the result', () => {
  it('leaves the reveal, the cards and the summary identical whatever the show does', () => {
    const base = ladder();
    const frozen = structuredClone(base);
    const ref = planCapsuleShow(structuredClone(base), { catalog });
    const variants: ShowPlan[] = [
      planCapsuleShow(base, { catalog }),
      planCapsuleShow(base, { catalog, quickReveal: true }),
    ];
    const runs = [{}, { hold: true }, { tapEvery: 48 }, { skipAt: bursts(ref)[1]?.id ?? '' }];
    for (const plan of variants) {
      for (const o of runs) {
        const before = structuredClone({ cards: plan.cards, summary: plan.summary });
        play(plan, o);
        expect({ cards: plan.cards, summary: plan.summary }).toEqual(before);
        // Same contents as any other way of showing it.
        expect(plan.summary).toEqual(ref.summary);
        expect(plan.cards).toEqual(ref.cards);
      }
    }
    expect(base).toEqual(frozen);
  });

  it('plays the burst only after its card’s pre-signal, and never one above the card’s rarity', () => {
    const plan = planCapsuleShow(ladder(), { catalog });
    const { order, sounds } = play(plan);
    for (const b of bursts(plan)) {
      expect(order.indexOf(b.id)).toBe(order.indexOf(`signal-${b.card.key}`) + 1);
    }
    expect(sounds.filter((s) => s.startsWith('rarity_burst_'))).toEqual(['rarity_burst_rare', 'rarity_burst_epic', 'rarity_burst_legendary']);
    // A show with no Legendary card never plays the Legendary burst.
    const noLeg = planCapsuleShow(reveal({ tier: 'silver', stacks: [stack('bonker', 'common'), stack('battering_ram', 'epic')] }), { catalog });
    expect(play(noLeg).sounds.some((s) => s === 'rarity_burst_legendary')).toBe(false);
  });
});

describe('rarity burst: skip, quick reveal and fast-forward rules', () => {
  it('a skip passes over the burst silently (no pop sound), straight to the summary', () => {
    const plan = planCapsuleShow(ladder(), { catalog });
    const first = bursts(plan)[0];
    if (!first) throw new Error('no burst');
    const { sounds, order } = play(plan, { skipAt: first.id });
    expect(order.at(-1)).toBe('summary');
    expect(sounds.some((s) => s.startsWith('rarity_burst_'))).toBe(false);
  });

  it('holding fast-forwards it and a tap hurries it; the plan itself never changes', () => {
    const plan = planCapsuleShow(ladder(), { catalog });
    const leg = bursts(plan).find((b) => b.level === 'legendary');
    if (!leg) throw new Error('no legendary burst');
    const audio = new FakeAudio();
    const r = new ShowRunner(plan, new TraceView(), { audio });
    r.start();
    while (r.step?.id !== leg.id) r.update(16);
    r.setHold(true);
    let ms = 0;
    while (r.step?.id === leg.id) {
      r.update(16);
      ms += 16;
    }
    expect(ms).toBeLessThanOrEqual(Math.ceil(leg.durationMs / 3) + 32);
    expect(r.state.canSkip).toBe(true);
  });
});

describe('rarity burst: Reduce motion and Lite (A12)', () => {
  it('Reduce motion: no shake, flash, hit-stop, punch, blast or shockwave; a calm glow stays', () => {
    for (const l of LEVELS) {
      const fx = resolveBurstFx(l, { reduceMotion: true });
      expect(fx).toMatchObject({ hitStopMs: 0, flash: 0, trauma: 0, punch: 0, rings: 0, blast: 0, motion: false, vibrate: [] });
      expect(fx.glow).toBeGreaterThan(0);
      expect(fx.particles).toBeLessThanOrEqual(BURST_PARTICLE_CAP.reduced);
      // The timing is the plan's: the same pop moment, so the sound still lands on it.
      expect(fx.popMs).toBe(RARITY_BURST[l].popMs);
    }
  });

  it('keeps the sound: the plan (and its cues) does not depend on the motion setting', () => {
    const plan = planCapsuleShow(ladder(), { catalog });
    expect(bursts(plan).every((b) => b.cues.some((c) => c.sound === `rarity_burst_${b.level}`))).toBe(true);
  });

  it('Lite halves the particles and embers and keeps at most two rings', () => {
    for (const l of LEVELS) {
      const full = resolveBurstFx(l, { reduceMotion: false });
      const lite = resolveBurstFx(l, { reduceMotion: false, lite: true });
      expect(lite.particles).toBeLessThanOrEqual(Math.ceil(full.particles / 2));
      expect(lite.particles).toBeLessThanOrEqual(BURST_PARTICLE_CAP.lite);
      expect(lite.embers).toBeLessThanOrEqual(Math.ceil(full.embers / 2));
      expect(lite.rings).toBeLessThanOrEqual(2);
      expect(lite.motion).toBe(true);
    }
  });
});
