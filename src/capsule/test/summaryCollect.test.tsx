/**
 * Queue item 48: the summary's Amber and Dust totals fly into the wallet once the panel has risen, through the
 * app's `CurrencyContext` (the capsule layer may not import the UI), once per opening, from the totals.
 */
import type { ArtProvider } from '@/contracts';
import { i18n } from '@/i18n';
import { render, type ComponentChildren } from 'preact';
import { act } from 'preact/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { installDom, type FakeElement } from '../../ui/screens/test/dom';
import { CurrencyContext, SUMMARY_COLLECT_MS, SummaryPanel, type CurrencyCollect, type CurrencyEnv } from '../summary';
import { buildSummary, revealCards } from '../summaryModel';
import { reveal, stack, testCatalog } from './fixtures';

const catalog = testCatalog();
const art = { portrait: () => Promise.resolve('') } as unknown as ArtProvider;

function model(dust: number) {
  const reveals = [
    reveal({ tier: 'bronze', id: 'c0', amber: 120, dust, stacks: [stack('bonker', 'common')] }),
    reveal({ tier: 'silver', id: 'c1', amber: 80, stacks: [stack('card1', 'common')] }),
  ];
  return buildSummary(reveals, revealCards(reveals, catalog));
}

let container: FakeElement;
beforeEach(() => {
  vi.useFakeTimers();
  container = installDom().container;
});
afterEach(() => {
  act(() => render(null, container as unknown as HTMLElement));
  vi.useRealTimers();
});
const show = (el: ComponentChildren): void => {
  act(() => {
    render(el, container as unknown as HTMLElement);
  });
};

function Panel(p: { m: ReturnType<typeof model>; env: CurrencyEnv | null }) {
  return (
    <CurrencyContext.Provider value={p.env}>
      <SummaryPanel model={p.m} art={art} i18n={i18n} catalog={catalog} title="Capsules opened" actions={{ onDone: () => undefined }} />
    </CurrencyContext.Provider>
  );
}

describe('the summary\'s totals fly into the wallet (queue item 48)', () => {
  it('once the panel has risen, from the totals, with exactly the summary\'s Amber and Dust', () => {
    const calls: (readonly CurrencyCollect[])[] = [];
    const env: CurrencyEnv = { icon: () => null, collect: (items) => calls.push(items) };
    const m = model(25);
    show(<Panel m={m} env={env} />);
    act(() => void vi.advanceTimersByTime(SUMMARY_COLLECT_MS - 20));
    expect(calls).toEqual([]);
    act(() => void vi.advanceTimersByTime(40));
    expect(calls).toHaveLength(1);
    expect(calls[0]!.map((c) => [c.kind, c.amount])).toEqual([
      ['amber', m.amber],
      ['dust', 25],
    ]);
    expect(m.amber).toBe(200);
    expect((calls[0]![0]!.from as unknown as FakeElement).getAttribute('data-testid')).toBe('capsule-total-amber');
    expect((calls[0]![1]!.from as unknown as FakeElement).getAttribute('data-testid')).toBe('capsule-total-dust');
    // the same opening's panel again (a re-mount): nothing flies twice
    show(null);
    show(<Panel m={m} env={env} />);
    act(() => void vi.advanceTimersByTime(SUMMARY_COLLECT_MS + 40));
    expect(calls).toHaveLength(1);
  });

  it('without the app (tests, the bench without a save) nothing flies and the plain gems stay', () => {
    show(<Panel m={model(0)} env={null} />);
    act(() => void vi.advanceTimersByTime(SUMMARY_COLLECT_MS + 40));
    expect(container.querySelector('[data-testid="capsule-total-amber"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="capsule-total-dust"]')).toBeNull();
  });
});
