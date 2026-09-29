/**
 * The 2026-09-29 capsule ladder on the meta screens (docs/requests/capsule-tiers-wp9.md): an unopened
 * Win or Supply Capsule never names, draws or sorts by its rolled tier; fixed-tier capsules show
 * their tier and crests; the one-time notice card closes for good; tier-exclusive items craft only
 * after the first capsule of their tier.
 */
import { content } from '@/content';
import type { CosmeticItemDef } from '@/content/types';
import type { PendingCapsule, SaveDoc } from '@/contracts';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fixtureResult } from '../fixtures/matches';
import { FIXTURE_NOW, maxedSave, midGameSave } from '../fixtures/saves';
import { craftLocked, craftPrice, sourceHint } from '../model/cosmetics';
import { text, type FakeElement } from './dom';
import { flush, mount, type Mounted } from './harness';

let m: Mounted | null = null;
afterEach(() => {
  m?.unmount();
  m = null;
  vi.useRealTimers();
});

/** A save whose only Win Capsule rolled an Aeon (it must look like any other Win Capsule). */
function hiddenAeonSave(): SaveDoc {
  const s = midGameSave(content);
  const win: PendingCapsule = {
    id: 'cap-hidden-aeon',
    kind: 'win',
    tier: 'aeon',
    startTier: 'clay',
    scriptIndex: null,
    age: null,
    contents: { stacks: [], amber: 0, dust: 0, skin: null },
    createdAt: FIXTURE_NOW - 1000,
  };
  return { ...s, capsules: { ...s.capsules, pending: [win] } };
}

const tierOf = (el: FakeElement) => el.querySelector('svg[data-tier]')?.getAttribute('data-tier') ?? null;

describe('unopened capsules show only what is already true', () => {
  it('the Capsules tab shows a Win Capsule by its start tier and kind name, with no crests', () => {
    m = mount({ save: hiddenAeonSave(), routes: [{ id: 'capsules' }] });
    const stage = m.q('[data-testid="caps-stage"]')!;
    expect(text(stage)).toContain('Win Capsule');
    expect(text(stage)).not.toContain('Aeon');
    expect(stage.getAttribute('aria-label')).toBe('Win Capsule');
    expect(tierOf(stage)).toBe('clay');
    expect(stage.querySelectorAll('.ui-capicon__crestmark').length).toBe(0);
    expect(stage.querySelectorAll('.ui-capicon__summit').length).toBe(0);
    expect(m.qa('svg[data-tier="aeon"]')).toEqual([]);
  });

  it('fixed-tier capsules show their tier, name and Legendary crests; Win Capsules stay hidden', () => {
    m = mount({ save: maxedSave(content), routes: [{ id: 'capsules' }] });
    const tile = (id: string) => m!.q(`[data-testid="drum-${id}"]`)!;
    expect(text(tile('cap-max-1'))).toContain('Aeon Capsule');
    expect(tile('cap-max-1').querySelectorAll('.ui-capicon__crestmark').length).toBe(3);
    expect(text(tile('cap-max-2'))).toContain('Platinum Capsule');
    expect(tile('cap-max-2').querySelectorAll('.ui-capicon__crestmark').length).toBe(2);
    expect(text(tile('cap-max-3'))).toContain('Gold Capsule');
    // cap-max-10 is a Win Capsule that rolled Gold: shown as a Clay "Win Capsule", after the fixed ones.
    expect(text(tile('cap-max-10'))).toContain('Win Capsule');
    expect(tierOf(tile('cap-max-10'))).toBe('clay');
    expect(tile('cap-max-10').querySelectorAll('.ui-capicon__crestmark').length).toBe(0);
    const order = m.qa('[data-testid^="drum-cap-max-"]').map((x) => x.getAttribute('data-testid'));
    expect(order.slice(0, 3)).toEqual(['drum-cap-max-1', 'drum-cap-max-2', 'drum-cap-max-3']);
    expect(order.slice(3)).toEqual(['drum-cap-max-4', 'drum-cap-max-5', 'drum-cap-max-6', 'drum-cap-max-7', 'drum-cap-max-8', 'drum-cap-max-9', 'drum-cap-max-10']);
  });

  it('the Result names a Win Capsule reward by its kind and draws its start tier', () => {
    vi.useFakeTimers();
    const s = midGameSave(content);
    const save = { ...s, capsules: { ...s.capsules, pending: s.capsules.pending.map((c) => (c.id === 'cap-mid-1' ? { ...c, tier: 'aeon' as const } : c)) } };
    m = mount({ save, routes: [{ id: 'home' }, { id: 'result', info: fixtureResult(content, 'win') }] });
    m.click('[data-testid="result-skip"]');
    flush();
    const row = m.q('[data-testid="reward-capsule"]')!;
    expect(text(row)).toContain('Win Capsule');
    expect(text(row)).not.toContain('Aeon');
    expect(tierOf(row)).toBe('clay');
  });
});

describe('the one-time "Two new capsule tiers" card (B8 step 4)', () => {
  it('shows at the top of the Capsules tab until closed, then never again', () => {
    const s = midGameSave(content);
    m = mount({ save: { ...s, flags: { ...s.flags, 'notice.capsuleLadder': true } }, routes: [{ id: 'capsules' }] });
    const card = m.q('[data-testid="capsule-ladder-notice"]')!;
    expect(text(card)).toContain('Two new capsule tiers');
    expect(card.querySelector('[data-testid="capsule-ladder-legacy"]')).toBeNull();
    m.click('[data-testid="capsule-ladder-notice-close"]');
    expect(m.save.value.flags['notice.capsuleLadder']).toBeUndefined();
    expect(m.q('[data-testid="capsule-ladder-notice"]')).toBeNull();
  });

  it('names the skill Aeons granted again to a veteran', () => {
    const s = midGameSave(content);
    const flags = { ...s.flags, 'notice.capsuleLadder': true, 'capsule.legacySkillAeon.road': true };
    m = mount({ save: { ...s, flags }, routes: [{ id: 'capsules' }], patch: { legacySkillAeons: () => 1 } });
    expect(text(m.q('[data-testid="capsule-ladder-legacy"]')!)).toContain('a new Aeon Capsule is on your shelf');
  });

  it('is not shown without the flag', () => {
    m = mount({ state: 'mid', routes: [{ id: 'capsules' }] });
    expect(m.q('[data-testid="capsule-ladder-notice"]')).toBeNull();
  });
});

describe('tier-exclusive items (the Aeon Collection)', () => {
  const item = { id: 'aeon_hourglass', collection: 'decoration', rarity: 'legendary', source: { kind: 'capsuleTier', tier: 'aeon' } } as unknown as CosmeticItemDef;

  it('cost the exclusive craft price and unlock after the first capsule of their tier', () => {
    const s = midGameSave(content);
    expect(craftPrice(content, item)).toBe(content.capsules.exclusiveCraftDust);
    expect(craftLocked(s, item)).toBe(true);
    expect(craftLocked({ ...s, flags: { ...s.flags, 'capsule.first.aeon': true } }, item)).toBe(false);
    expect(sourceHint(item)).toEqual({ key: 'cosmetic.ui.source.capsuleTier', params: { tier: 'aeon' } });
  });
});
