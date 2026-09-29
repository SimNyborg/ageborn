/**
 * The 2026-09-29 capsule ladder in the UI components (DESIGN A6.4, A10; ui-plan 3.2, 3.5;
 * docs/requests/capsule-tiers-wp9.md): what an unopened capsule may show, the drum icon's rings,
 * summit gems and crests, and the odds sheet's ladder lines. Everything comes from the content tables.
 */
import { content } from '@/content';
import type { CapsuleTier, PendingCapsule } from '@/contracts';
import { render } from 'preact';
import { act } from 'preact/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import { midGameSave } from '../../screens/fixtures/saves';
import { installDom, text, type FakeElement } from '../../screens/test/dom';
import { byVisibleTier, climbsOnOpen, legendaryBagTiers, pendingCrests, pendingNameKey, tierCrests, visibleTier } from '../capsuleLook';
import { CapsuleIcon, DRUM_RINGS, TIER_COLOR, TIER_LADDER } from '../icons';
import { UiKitContext, defaultKit } from '../kit';
import { LadderNotice } from '../LadderNotice';
import { OddsSheet } from '../OddsSheet';
import { oddsModel } from '../oddsModel';

const caps = content.capsules;

let container: FakeElement | null = null;
function show(node: preact.ComponentChildren) {
  const dom = installDom();
  container = dom.container;
  act(() => render(<UiKitContext.Provider value={defaultKit}>{node}</UiKitContext.Provider>, container as unknown as HTMLElement));
  return dom.container;
}
afterEach(() => {
  if (container) act(() => render(null, container as unknown as HTMLElement));
  container = null;
});

function pending(kind: PendingCapsule['kind'], tier: CapsuleTier, startTier: CapsuleTier, createdAt = 0, scriptIndex: number | null = null): PendingCapsule {
  return { id: `${kind}-${tier}-${createdAt}`, kind, tier, startTier, scriptIndex, age: null, contents: { stacks: [], amber: 0, dust: 0, skin: null }, createdAt };
}

describe('the ladder the UI draws mirrors the content', () => {
  it('has the content tier order and the summit above the 5th ring', () => {
    expect([...TIER_LADDER]).toEqual(caps.tierOrder);
    expect(caps.tierOrder.indexOf(caps.summitAbove)).toBe(DRUM_RINGS - 1);
    expect(Object.keys(TIER_COLOR).sort()).toEqual([...caps.tierOrder].sort());
  });

  it('keeps every new tier colour off the rarity colours (tier colours are fills, never rarity)', () => {
    const rarity = ['#B8C0CC', '#22B8CF', '#A855F7', '#F5B82E'];
    for (const tier of caps.tierOrder) expect(rarity).not.toContain(TIER_COLOR[tier].toUpperCase());
    expect(TIER_COLOR.gold).toBe('#EFE0B0');
    expect(TIER_COLOR.platinum).toBe('#C4F2EA');
    expect(TIER_COLOR.aeon).toBe('#5D3DFF');
  });

  it('crests come from the Legendary guarantees: Gold 1, Platinum 2, Aeon 3, none below', () => {
    expect(caps.tierOrder.map((t) => tierCrests(caps, t))).toEqual([0, 0, 0, 0, 1, 2, 3]);
  });

  it('lists the Legendary tiers of the bag from the top with their exact counts', () => {
    expect(legendaryBagTiers(caps)).toEqual([
      { tier: 'aeon', n: 1 },
      { tier: 'platinum', n: 2 },
      { tier: 'gold', n: 4 },
    ]);
  });
});

describe('an unopened capsule shows only what is already true (A10, A15.1 red line 7)', () => {
  it('a climbing capsule shows its start tier and kind name, never its rolled tier or crests', () => {
    const win = pending('win', 'aeon', 'clay');
    const supply = pending('daily', 'platinum', 'bronze');
    const meter = pending('meter', 'gold', 'clay');
    for (const c of [win, supply, meter]) {
      expect(climbsOnOpen(caps, c.kind)).toBe(true);
      expect(visibleTier(caps, c)).toBe(c.startTier);
      expect(pendingCrests(caps, c)).toBe(0);
    }
    expect(pendingNameKey(caps, win)).toBe('capsuleKind.win.name');
    expect(pendingNameKey(caps, supply)).toBe('capsuleKind.daily.name');
    expect(pendingNameKey(caps, pending('win', 'gold', 'clay', 0, 4))).toBe('ui.capsules.starter');
  });

  it('a fixed-tier capsule shows its tier, name and crests', () => {
    const road = pending('road', 'aeon', 'aeon');
    expect(climbsOnOpen(caps, 'road')).toBe(false);
    expect(visibleTier(caps, road)).toBe('aeon');
    expect(pendingCrests(caps, road)).toBe(3);
    expect(pendingNameKey(caps, road)).toBe('capsuleTier.aeon.name');
  });

  it('orders by the visible tier, then oldest first; a hidden Aeon never jumps the queue', () => {
    const list = [pending('win', 'aeon', 'clay', 1), pending('road', 'jade', 'jade', 3), pending('win', 'bronze', 'clay', 0), pending('daily', 'bronze', 'bronze', 2)];
    expect(byVisibleTier(caps, list).map((c) => c.id)).toEqual(['road-jade-3', 'daily-bronze-2', 'win-bronze-0', 'win-aeon-1']);
  });
});

describe('CapsuleIcon (ui-plan 3.5)', () => {
  const parts = (el: FakeElement) => ({
    rings: el.querySelectorAll('.ui-capicon__ring').length,
    summit: el.querySelectorAll('.ui-capicon__summit').length,
    crests: el.querySelectorAll('.ui-capicon__crestmark').length,
  });

  it('from 32 px lights rings 1-5 up to Gold, then 1-2 summit gems; crests only when asked', () => {
    const expected = [
      [1, 0],
      [2, 0],
      [3, 0],
      [4, 0],
      [5, 0],
      [5, 1],
      [5, 2],
    ];
    caps.tierOrder.forEach((tier, i) => {
      const el = show(<CapsuleIcon tier={tier} size={48} />);
      expect(parts(el)).toEqual({ rings: expected[i]![0], summit: expected[i]![1], crests: 0 });
      expect(el.querySelector('svg')!.getAttribute('data-tier')).toBe(tier);
    });
    expect(parts(show(<CapsuleIcon tier="aeon" size={48} crests={tierCrests(caps, 'aeon')} />)).crests).toBe(3);
  });

  it('below 32 px is a flat silhouette with a "★n" badge for crests', () => {
    const el = show(<CapsuleIcon tier="platinum" size={18} crests={2} />);
    expect(parts(el)).toEqual({ rings: 0, summit: 0, crests: 0 });
    expect(text(el.querySelector('.ui-capicon__crest')!)).toBe('★2');
    expect(show(<CapsuleIcon tier="jade" size={18} />).querySelector('.ui-capicon__crest')).toBeNull();
  });
});

describe('the odds sheet for the longer ladder', () => {
  it('builds the ladder lines from data', () => {
    const m = oddsModel(content.capsules, content.rarities, midGameSave(content), true, content.cosmetics.collections);
    expect(m.bagSize).toBe(200);
    expect(m.bag.map((r) => r.tier)).toEqual(caps.tierOrder);
    expect(m.legendaryBag.map((x) => `${x.n} ${x.tier}`)).toEqual(['1 aeon', '2 platinum', '4 gold']);
    expect(m.tiers.map((r) => r.crests)).toEqual([0, 0, 0, 0, 1, 2, 3]);
    expect(m.dailyBp.map((d) => d.tier)).toEqual(['bronze', 'silver', 'jade', 'gold', 'platinum', 'aeon']);
    expect(m.legacyBag).toBe(false);
    expect(m.notice).toBe(false);
  });

  it('says so while a bag from before the ladder finishes (bagSize 100)', () => {
    const s = midGameSave(content);
    const legacy = { ...s, capsules: { ...s.capsules, bag: [0, 1, 1, 2, 6], bagSize: 100 } };
    const m = oddsModel(content.capsules, content.rarities, legacy, true);
    expect(m.bagTotal).toBe(100);
    expect(m.legacyBag).toBe(true);
    const el = show(<OddsSheet model={m} />);
    expect(text(el.querySelector('[data-testid="odds-bag-left"]')!)).toBe('5 of 100 left in your current bag');
    expect(text(el.querySelector('[data-testid="odds-bag-legacy"]')!)).toContain('finishes with its old mix');
  });

  it('shows the list bag line, the reveal note, crests, sure skins and the ladder rules; tier names are plain text', () => {
    const el = show(<OddsSheet model={oddsModel(content.capsules, content.rarities, midGameSave(content), true, content.cosmetics.collections)} />);
    expect(text(el.querySelector('[data-testid="odds-aeon-line"]')!)).toBe('Exactly 1 Aeon, 2 Platinum, and 4 Gold in every 200 Win Capsules.');
    expect(text(el.querySelector('[data-testid="odds-reveal-note"]')!)).toBe('Win and Supply Capsules show their tier when you open them.');
    expect(text(el.querySelector('[data-testid="odds-bag-platinum"]')!)).toContain('★2');
    expect(text(el.querySelector('[data-testid="odds-bag-jade"]')!)).not.toContain('★');
    const plat = text(el.querySelector('[data-testid="odds-extras-platinum"]')!);
    expect(plat).toContain('at least 2 Legendary');
    expect(plat).toContain('Second Legendary: 1 copy.');
    expect(plat).toContain('A skin, Rare or better.');
    const aeon = text(el.querySelector('[data-testid="odds-extras-aeon"]')!);
    expect(aeon).toContain('Second and third Legendary: 1 copy each.');
    expect(aeon).toContain('A skin, Epic or better.');
    expect(text(el.querySelector('[data-testid="odds-extras-gold"]')!)).toContain('30% chance of a skin.');
    expect(text(el.querySelector('[data-testid="odds-extras-jade"]')!)).not.toContain('Legendary');
    const rules = text(el.querySelector('[data-testid="odds-ladder-rules"]')!);
    expect(rules).toContain('Each Legendary crest');
    expect(rules).toContain('summit strikes');
    expect(rules).toContain('furthest from maxing');
    expect(text(el.querySelector('[data-testid="odds-supply-aeon"]')!)).toContain('0.15%');
    // Tier colours are fills only (ui-plan 3.2): no text is painted in a tier colour.
    const painted = el.querySelectorAll('[style]').filter((x) => /(^|;)\s*color:/i.test(x.getAttribute('style') ?? ''));
    expect(painted).toEqual([]);
  });

  it('the notice card names the change, adds the legacy line only when a skill Aeon was granted, and closes', () => {
    const tiers = caps.tierOrder.map((tier) => ({ tier, crests: tierCrests(caps, tier) })).filter((x) => x.crests > 0);
    let closed = 0;
    let el = show(<LadderNotice tiers={tiers} onClose={() => (closed += 1)} />);
    expect(text(el.querySelector('#cap-notice-title')!)).toBe('Two new capsule tiers');
    expect(text(el)).toContain('Jade no longer turns a Rare into a Legendary.');
    expect(el.querySelector('[data-testid="capsule-ladder-legacy"]')).toBeNull();
    act(() => (el.querySelector('[data-testid="capsule-ladder-notice-close"]') as FakeElement).click());
    expect(closed).toBe(1);
    el = show(<LadderNotice tiers={tiers} legacy={2} />);
    expect(text(el.querySelector('[data-testid="capsule-ladder-legacy"]')!)).toContain('so 2 new Aeon Capsules are on your shelf');
    el = show(<LadderNotice tiers={tiers} legacy={1} />);
    expect(text(el.querySelector('[data-testid="capsule-ladder-legacy"]')!)).toContain('so a new Aeon Capsule is on your shelf');
    expect(el.querySelector('[data-testid="capsule-ladder-notice-close"]')).toBeNull();
  });
});
