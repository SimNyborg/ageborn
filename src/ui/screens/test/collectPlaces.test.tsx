/**
 * Queue item 48: every place that pays or spends Amber or Dust plays the shared collect moment
 * (`components/collect.ts`) with exactly what the save gained or lost. Without a browser a moment ends at once
 * and marks its end with the chime (earning) or the spend sound, which the capture hook hears here.
 */
import { content } from '@/content';
import type { RewardStep } from '@/contracts';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { COLLECT_SOUND, setCollectSoundTap } from '../../components/collect';
import { counterOverride } from '../../components/counter';
import { fixtureResult } from '../fixtures/matches';
import { RESULT_COLLECT_DELAY_MS, resultCurrency } from '../result/ResultScreen';
import { flush, mount, type Mounted } from './harness';

let m: Mounted | null = null;
let heard: string[] = [];
beforeEach(() => {
  heard = [];
  setCollectSoundTap((id) => heard.push(id));
});
afterEach(() => {
  m?.unmount();
  m = null;
  setCollectSoundTap(null);
  vi.useRealTimers();
});

const A = COLLECT_SOUND.amber;
const D = COLLECT_SOUND.dust;

describe('the Result (queue item 48)', () => {
  it('counts what the Result shows as earned: Amber and Dust steps and each found feat', () => {
    const featId = Object.keys(content.feats.list)[0]!;
    const steps: RewardStep[] = [
      { kind: 'trophies', delta: 30 },
      { kind: 'amber', amount: 20 },
      { kind: 'amber', amount: 7 },
      { kind: 'dust', amount: 5 },
      { kind: 'feat', featId },
      { kind: 'capsule', capsuleId: 'cap-mid-1' },
    ];
    expect(resultCurrency(steps, content)).toEqual({ amber: 27, dust: 5 + content.feats.list[featId]!.dust });
    expect(resultCurrency([{ kind: 'trophies', delta: -20 }], content)).toEqual({ amber: 0, dust: 0 });
  });

  it('flies the Amber into the wallet once every reward is in, and only once per result', () => {
    vi.useFakeTimers();
    const info = fixtureResult(content, 'win');
    m = mount({ state: 'mid', routes: [{ id: 'home' }, { id: 'result', info }] });
    flush(() => vi.advanceTimersByTime(RESULT_COLLECT_DELAY_MS + 50));
    // the rewards are still coming in: nothing has flown yet
    expect(heard).toEqual([]);
    m.click('[data-testid="result-skip"]');
    flush(() => vi.advanceTimersByTime(RESULT_COLLECT_DELAY_MS + 50));
    // the win pays 20 Amber and no Dust
    expect(heard).toEqual([A.chime]);
    expect(counterOverride.value).toEqual({ amber: null, dust: null });
    m.unmount();
    m = mount({ state: 'mid', routes: [{ id: 'home' }, { id: 'result', info }] });
    m.click('[data-testid="result-skip"]');
    flush(() => vi.advanceTimersByTime(RESULT_COLLECT_DELAY_MS + 50));
    expect(heard).toEqual([A.chime]);
  });

  it('a Retreat pays nothing, so nothing flies', () => {
    vi.useFakeTimers();
    m = mount({ state: 'mid', routes: [{ id: 'home' }, { id: 'result', info: fixtureResult(content, 'retreat') }] });
    m.click('[data-testid="result-skip"]');
    flush(() => vi.advanceTimersByTime(RESULT_COLLECT_DELAY_MS + 50));
    expect(heard).toEqual([]);
  });
});

describe('claims and spends (queue item 48)', () => {
  it('a quest claim flies its Amber and Dust into the wallet; the moment replaces the toast', () => {
    m = mount({ state: 'mid', routes: [{ id: 'progress' }] });
    const kinds = m.qa('[data-testid="quest-0"] [data-currency]').map((e) => e.getAttribute('data-currency'));
    expect(kinds.length).toBeGreaterThan(0);
    const others = m.qa('[data-testid="quest-0"] .home-quest__rw').length - kinds.length;
    m.click('[data-testid="quest-claim-0"]');
    expect(m.save.value.quests.daily[0]!.claimed).toBe(true);
    expect(heard).toEqual(kinds.map((k) => (k === 'amber' ? A.chime : D.chime)));
    if (others === 0) expect(m.q('[data-testid="toast"]')).toBeNull();
  });

  it('a Trophy Road claim flies the node\'s Amber and Dust', () => {
    const node = content.trophyRoad.nodes.find((n) => n.trophies === 950)!;
    const amber = node.rewards.some((r) => r.kind === 'amber');
    const dust = node.rewards.some((r) => r.kind === 'dust');
    m = mount({ state: 'mid', routes: [{ id: 'home' }, { id: 'trophyRoad' }] });
    m.click('[data-testid="road-claim-950"]');
    expect(m.save.value.trophies.roadClaimed).toContain(950);
    expect(heard).toEqual([...(amber ? [A.chime] : []), ...(dust ? [D.chime] : [])]);
    if (amber || dust) expect(m.q('[data-testid="toast"]')).toBeNull();
  });

  it('an upgrade sends its Amber to the card; crafting sends Dust', () => {
    m = mount({ state: 'mid', routes: [{ id: 'home' }, { id: 'cardDetail', card: 'pikeman' }] });
    const before = m.save.value.currencies.amber;
    m.click('[data-testid="card-upgrade-btn"]');
    expect(heard).toEqual([]);
    m.click('[data-testid="card-upgrade-btn"]');
    expect(m.save.value.currencies.amber).toBeLessThan(before);
    expect(heard[0]).toBe(A.spend);
    m.unmount();
    heard = [];
    m = mount({ state: 'mid', routes: [{ id: 'home' }, { id: 'cardDetail', card: 'friar' }] });
    m.click('[data-testid="card-craft"]');
    m.click('[data-testid="card-craft"]');
    expect(heard).toEqual([D.spend]);
  });
});
