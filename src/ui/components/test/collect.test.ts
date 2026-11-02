/**
 * The collect moment (queue item 48, `collect.ts`): the pure plan (timings, piece counts, the count-up that
 * ends on the true total, sounds, Reduce motion, the spend's reverse) and the DOM player on the tests' small
 * DOM with a manual clock (the counter's shown value, the wallet chip, the "+N", skipping, the hand-back).
 */
import { afterEach, describe, expect, it } from 'vitest';
import { installDom } from '../../screens/test/dom';
import {
  COLLECT_MAX_MS,
  COLLECT_SOUND,
  collectCurrency,
  collectTier,
  collectsRunning,
  finishAllCollects,
  pieceCount,
  planCollect,
  setCollectScheduler,
  type CollectPlanInput,
} from '../collect';
import { counterOverride, counterValue } from '../counter';

const base: CollectPlanInput = { kind: 'amber', mode: 'earn', amount: 350, before: 3100, reduce: false, from: { x: 300, y: 260 }, to: { x: 760, y: 24 }, seed: 7 };
const AMOUNTS = [1, 2, 5, 10, 11, 20, 47, 99, 100, 101, 310, 350, 999, 1000, 1001, 3000, 25000, 1_000_000];

describe('the collect plan (pure)', () => {
  it('sends more pieces for more, capped, and Dust more and smaller than Amber', () => {
    let last = 0;
    for (const a of AMOUNTS) {
      const n = pieceCount('amber', 'earn', a);
      expect(n).toBeGreaterThanOrEqual(last);
      expect(n).toBeGreaterThanOrEqual(3);
      expect(n).toBeLessThanOrEqual(12);
      expect(pieceCount('dust', 'earn', a)).toBeGreaterThanOrEqual(n);
      expect(pieceCount('dust', 'earn', a)).toBeLessThanOrEqual(14);
      last = n;
    }
    expect(pieceCount('amber', 'earn', 1_000_000)).toBe(12);
    // a spend is a short reverse: a few pieces, never more than 7
    expect([1, 100, 350, 1_000_000].map((a) => pieceCount('amber', 'spend', a))).toEqual([3, 5, 6, 7]);
  });

  it('tiers by the count-up tokens (<= 10, <= 100, <= 1,000, more)', () => {
    expect([10, 11, 100, 101, 1000, 1001].map(collectTier)).toEqual([0, 1, 1, 2, 2, 3]);
  });

  for (const kind of ['amber', 'dust'] as const) {
    for (const mode of ['earn', 'spend'] as const) {
      for (const reduce of [false, true]) {
        it(`${kind} ${mode}${reduce ? ' (Reduce motion)' : ''}: ends on the exact total within ${COLLECT_MAX_MS} ms for every amount`, () => {
          for (const amount of AMOUNTS) {
            const before = mode === 'earn' ? 820 : amount + 820;
            const p = planCollect({ ...base, kind, mode, reduce, amount, before });
            const want = mode === 'earn' ? before + amount : before - amount;
            expect(p.after).toBe(want);
            expect(p.counts[p.counts.length - 1]!.value).toBe(want);
            // the count never runs past the total and only moves one way
            for (let i = 1; i < p.counts.length; i++) {
              const d = p.counts[i]!.value - p.counts[i - 1]!.value;
              expect(mode === 'earn' ? d >= 0 : d <= 0).toBe(true);
              expect(p.counts[i]!.at).toBeGreaterThanOrEqual(p.counts[i - 1]!.at);
            }
            expect(p.end).toBeLessThanOrEqual(COLLECT_MAX_MS);
            for (const x of p.sounds) expect(x.at).toBeLessThanOrEqual(p.end);
            for (const pc of p.pieces) {
              expect(pc.launch).toBeLessThanOrEqual(pc.burstEnd);
              expect(pc.burstEnd).toBeLessThanOrEqual(pc.flight);
              expect(pc.flight).toBeLessThan(pc.land);
              expect(pc.land).toBeLessThanOrEqual(p.end);
            }
            if (reduce) expect(p.pieces).toHaveLength(0);
            else expect(p.pieces).toHaveLength(pieceCount(kind, mode, amount));
          }
        });
      }
    }
  }

  it('earning: a pickup at the burst, a rising tick per landing (not the last) and a chime after the last', () => {
    const p = planCollect(base);
    const ids = p.sounds.map((x) => x.id);
    expect(ids[0]).toBe(COLLECT_SOUND.amber.pickup);
    expect(ids[ids.length - 1]).toBe(COLLECT_SOUND.amber.chime);
    const ticks = p.sounds.filter((x) => x.id === COLLECT_SOUND.amber.tick);
    expect(ticks.length).toBeGreaterThan(2);
    for (let i = 1; i < ticks.length; i++) {
      expect(ticks[i]!.at - ticks[i - 1]!.at).toBeGreaterThanOrEqual(45);
      expect(ticks[i]!.pitchBp!).toBeGreaterThan(ticks[i - 1]!.pitchBp!);
    }
    const lastLand = Math.max(...p.pieces.map((x) => x.land));
    expect(p.sounds[p.sounds.length - 1]!.at).toBeGreaterThan(lastLand);
    expect(p.landings.filter((l) => l.last)).toHaveLength(1);
  });

  it('Dust is the rarer one: slower landings and its own sounds', () => {
    const a = planCollect(base);
    const d = planCollect({ ...base, kind: 'dust' });
    const lastA = Math.max(...a.pieces.map((x) => x.land));
    const lastD = Math.max(...d.pieces.map((x) => x.land));
    expect(lastD).toBeGreaterThan(lastA);
    expect(d.anticipation).toBeGreaterThan(a.anticipation);
    expect(d.sounds.map((x) => x.id)).toContain(COLLECT_SOUND.dust.chime);
    expect(d.sounds.map((x) => x.id)).not.toContain(COLLECT_SOUND.amber.chime);
  });

  it('bigger amounts land bigger', () => {
    const peaks = [5, 50, 500, 5000].map((amount) => planCollect({ ...base, amount }).peak);
    expect(peaks).toEqual([...peaks].sort((x, y) => x - y));
    expect(new Set(peaks).size).toBe(4);
  });

  it('spending: a short reverse with one whoosh, no chime and a quick count down', () => {
    const p = planCollect({ ...base, mode: 'spend', before: 3450 });
    expect(p.sounds.map((x) => x.id)).toEqual([COLLECT_SOUND.amber.spend]);
    expect(p.counts[p.counts.length - 1]!.value).toBe(3100);
    expect(p.counts[p.counts.length - 1]!.at).toBeLessThanOrEqual(400);
    expect(p.end).toBeLessThanOrEqual(900);
  });

  it('Reduce motion keeps the count, the "+N" and the sounds, and drops the flight', () => {
    const p = planCollect({ ...base, reduce: true });
    expect(p.pieces).toEqual([]);
    expect(p.counts.length).toBeGreaterThan(1);
    expect(p.sounds.map((x) => x.id)).toContain(COLLECT_SOUND.amber.chime);
    expect(p.labelOut).toBeGreaterThan(p.labelIn);
  });

  it('bursts upwards, and downwards from a source by the top of the screen (the capsule summary\'s totals)', () => {
    const ups = planCollect(base).pieces.filter((p) => p.by < 0).length;
    expect(ups).toBe(planCollect(base).pieces.length);
    const top = planCollect({ ...base, from: { x: 760, y: 24 }, to: { x: 640, y: 24 } });
    expect(top.pieces.filter((p) => p.by > 0).length).toBe(top.pieces.length);
  });

  it('is seeded: the same seed gives the same moment, another seed another jitter', () => {
    expect(planCollect(base)).toEqual(planCollect(base));
    expect(planCollect({ ...base, seed: 8 }).pieces).not.toEqual(planCollect(base).pieces);
  });
});

/** A manual clock and frame queue for the player. */
function manualClock() {
  let now = 0;
  let id = 1;
  const queue = new Map<number, (t: number) => void>();
  return {
    scheduler: {
      now: () => now,
      frame: (cb: (t: number) => void) => {
        queue.set(id, cb);
        return id++;
      },
      cancel: (n: number) => void queue.delete(n),
    },
    step(ms: number) {
      now += ms;
      const due = [...queue.values()];
      queue.clear();
      for (const cb of due) cb(now);
    },
    run(ms: number, dt = 16) {
      for (let t = 0; t < ms; t += dt) this.step(dt);
    },
  };
}

describe('the collect player (small DOM, manual clock)', () => {
  afterEach(() => {
    finishAllCollects();
    setCollectScheduler(null);
    counterOverride.value = { amber: null, dust: null };
    delete (globalThis as { document?: unknown }).document;
  });

  it('without a browser it ends at once: the counter is the save\'s again and the chime marks it', () => {
    const sounds: string[] = [];
    const h = collectCurrency({ kind: 'amber', amount: 50, from: { left: 0, top: 0, width: 10, height: 10 } as DOMRect, total: 150, sound: (id) => sounds.push(id) });
    expect(collectsRunning()).toBe(0);
    expect(counterOverride.value.amber).toBeNull();
    expect(sounds).toEqual([COLLECT_SOUND.amber.chime]);
    return h.done;
  });

  it('plays nothing for nothing earned', () => {
    collectCurrency({ kind: 'dust', amount: 0, from: { left: 0, top: 0, width: 1, height: 1 } as DOMRect, total: 10 });
    expect(collectsRunning()).toBe(0);
    expect(counterOverride.value.dust).toBeNull();
  });

  it('holds the counter at the old total, counts up to the save\'s new one with ticks, then hands it back', async () => {
    const { document, container } = installDom();
    container.setAttribute('class', 'ui-root');
    const src = document.createElement('span');
    container.appendChild(src);
    const clock = manualClock();
    setCollectScheduler(clock.scheduler);
    const sounds: { id: string; pitchBp?: number }[] = [];
    const h = collectCurrency({ kind: 'amber', amount: 350, from: src as unknown as Element, total: 3450, sound: (id, o) => sounds.push({ id, ...o }), label: 'Amber' });
    // the save already says 3,450; the counter shows 3,100 until the pieces land
    expect(counterValue('amber', 3450)).toBe(3100);
    expect(collectsRunning()).toBe(1);
    // it starts a frame after the one that asked for it
    clock.step(0);
    expect(container.querySelector('[data-testid="collect-delta-amber"]')).toBeNull();
    clock.step(0);
    // the small DOM has no counter chip on screen: the wallet chip dropped in with the old total
    const wallet = container.querySelector('[data-testid="collect-wallet-amber"]');
    expect(wallet).not.toBeNull();
    expect(wallet!.textContent).toBe('3,100');
    expect(container.querySelector('[data-testid="collect-delta-amber"]')!.textContent).toBe('+350');
    clock.run(COLLECT_MAX_MS + 40);
    expect(collectsRunning()).toBe(0);
    expect(wallet!.textContent).toBe('3,450');
    expect(sounds[0]!.id).toBe(COLLECT_SOUND.amber.pickup);
    expect(sounds.filter((x) => x.id === COLLECT_SOUND.amber.tick).length).toBeGreaterThan(2);
    expect(sounds[sounds.length - 1]!.id).toBe(COLLECT_SOUND.amber.chime);
    // the moment's pieces are gone; the counter goes back to the save's value a task later
    expect(container.querySelector('.ui-collect__moment')).toBeNull();
    await h.done;
    await new Promise((r) => setTimeout(r, 0));
    expect(counterOverride.value.amber).toBeNull();
  });

  it('a tap finishes it at once: the true total, no more sounds, nothing left flying', async () => {
    const { document, container } = installDom();
    container.setAttribute('class', 'ui-root');
    const src = document.createElement('span');
    container.appendChild(src);
    const clock = manualClock();
    setCollectScheduler(clock.scheduler);
    const sounds: string[] = [];
    const h = collectCurrency({ kind: 'dust', amount: 25, from: src as unknown as Element, total: 845, sound: (id) => sounds.push(id) });
    clock.step(0);
    clock.run(200);
    const heard = sounds.length;
    finishAllCollects();
    await h.done;
    expect(collectsRunning()).toBe(0);
    expect(container.querySelector('[data-testid="collect-wallet-dust"]')!.textContent).toBe('845');
    expect(container.querySelector('.ui-collect__moment')).toBeNull();
    clock.run(400);
    expect(sounds.length).toBe(heard);
  });

  it('a second moment of the same currency finishes the first; Amber and Dust may play together', () => {
    const { document, container } = installDom();
    container.setAttribute('class', 'ui-root');
    const src = document.createElement('span');
    container.appendChild(src);
    setCollectScheduler(manualClock().scheduler);
    collectCurrency({ kind: 'amber', amount: 20, from: src as unknown as Element, total: 120 });
    collectCurrency({ kind: 'dust', amount: 5, from: src as unknown as Element, total: 30 });
    expect(collectsRunning()).toBe(2);
    collectCurrency({ kind: 'amber', amount: 30, from: src as unknown as Element, total: 150 });
    expect(collectsRunning()).toBe(2);
    expect(counterValue('amber', 150)).toBe(120);
  });

  it('Amber and Dust asked for together share one wallet at once, each chip in its own slot (Amber, then Dust)', () => {
    const { document, container } = installDom();
    container.setAttribute('class', 'ui-root');
    const src = document.createElement('span');
    container.appendChild(src);
    setCollectScheduler(manualClock().scheduler);
    collectCurrency({ kind: 'amber', amount: 310, from: src as unknown as Element, total: 3760 });
    collectCurrency({ kind: 'dust', amount: 100, from: src as unknown as Element, total: 920, delay: 260 });
    // both chips are there before either moment's first frame, so neither moves under the other's flight
    const slots = container.querySelectorAll('.ui-collect__slot');
    expect(slots.map((x) => x.getAttribute('data-slot'))).toEqual(['amber', 'dust']);
    expect(slots[0]!.querySelector('[data-testid="collect-wallet-amber"]')!.textContent).toBe('3,450');
    expect(slots[1]!.querySelector('[data-testid="collect-wallet-dust"]')!.textContent).toBe('820');
  });

  it('a moment finished while it waits for its delay shows the true total and lets its wallet chip go', async () => {
    const { document, container } = installDom();
    container.setAttribute('class', 'ui-root');
    const src = document.createElement('span');
    container.appendChild(src);
    setCollectScheduler(manualClock().scheduler);
    const h = collectCurrency({ kind: 'dust', amount: 100, from: src as unknown as Element, total: 920, delay: 400 });
    expect(container.querySelector('[data-testid="collect-wallet-dust"]')!.textContent).toBe('820');
    finishAllCollects();
    await h.done;
    expect(container.querySelector('[data-testid="collect-wallet-dust"]')!.textContent).toBe('920');
    // the chip leaves after a short hold (no animation in the small DOM: at once)
    await new Promise((r) => setTimeout(r, 450));
    expect(container.querySelector('[data-testid="collect-wallet-dust"]')).toBeNull();
    expect(container.querySelector('.ui-collect__wallet')).toBeNull();
  });

  it('spending counts the counter down from the old total to the save\'s and calls back when the pieces arrive', () => {
    const { document, container } = installDom();
    container.setAttribute('class', 'ui-root');
    const card = document.createElement('div');
    container.appendChild(card);
    const clock = manualClock();
    setCollectScheduler(clock.scheduler);
    let arrived = 0;
    collectCurrency({ kind: 'amber', mode: 'spend', amount: 350, from: card as unknown as Element, total: 3100, onArrive: () => arrived++ });
    expect(counterValue('amber', 3100)).toBe(3450);
    clock.step(0);
    clock.step(0);
    expect(container.querySelector('[data-testid="collect-delta-amber"]')!.textContent).toBe('−350');
    clock.run(COLLECT_MAX_MS);
    expect(arrived).toBe(1);
    expect(container.querySelector('[data-testid="collect-wallet-amber"]')!.textContent).toBe('3,100');
  });
});
