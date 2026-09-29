/**
 * UI kit components and helpers: keyboard helpers, formatting, the odds model (A6.4, A6.5),
 * avatars, toasts, and the card tile states (copies bar, foils, silhouettes, NEW).
 */
import { content } from '@/content';
import { i18n } from '@/i18n';
import { render } from 'preact';
import { act } from 'preact/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import { midGameSave, newPlayerSave } from '../../screens/fixtures/saves';
import { installDom, keydown, text, type FakeElement } from '../../screens/test/dom';
import { avatarLook, AVATAR_PARTS } from '../Avatar';
import { Button } from '../Button';
import { CardTile, type CardTileData } from '../CardTile';
import { AiBadge, CurrencyChip } from '../Chips';
import { Segmented, Toggle } from '../Controls';
import { formatClock, formatCountdown, formatSigned, tierNumeral } from '../format';
import { columnsOf, gridNextIndex, rovingNextIndex } from '../keys';
import { UiKitContext, defaultKit } from '../kit';
import { ClayMeter, CopiesBar } from '../Meters';
import { Modal } from '../Modal';
import { bagLeft, formatBp, legendaryPityBp, oddsModel } from '../oddsModel';
import { createToastStore, MAX_TOASTS } from '../Toasts';

let container: FakeElement | null = null;
function show(node: preact.ComponentChildren) {
  const dom = installDom();
  container = dom.container;
  act(() => render(<UiKitContext.Provider value={defaultKit}>{node}</UiKitContext.Provider>, container as unknown as HTMLElement));
  return dom;
}
afterEach(() => {
  if (container) act(() => render(null, container as unknown as HTMLElement));
  container = null;
});

describe('keyboard helpers', () => {
  it('roving index wraps and supports Home/End', () => {
    expect(rovingNextIndex('ArrowRight', 0, 3)).toBe(1);
    expect(rovingNextIndex('ArrowRight', 2, 3)).toBe(0);
    expect(rovingNextIndex('ArrowLeft', 0, 3)).toBe(2);
    expect(rovingNextIndex('ArrowDown', 0, 3)).toBeNull();
    expect(rovingNextIndex('ArrowDown', 0, 3, 'vertical')).toBe(1);
    expect(rovingNextIndex('ArrowUp', 1, 3, 'both')).toBe(0);
    expect(rovingNextIndex('End', 0, 5)).toBe(4);
    expect(rovingNextIndex('Home', 3, 5)).toBe(0);
    expect(rovingNextIndex('a', 0, 5)).toBeNull();
    expect(rovingNextIndex('ArrowRight', 0, 0)).toBeNull();
  });

  it('grid index moves by rows and clamps', () => {
    expect(gridNextIndex('ArrowDown', 1, 10, 4)).toBe(5);
    expect(gridNextIndex('ArrowDown', 7, 10, 4)).toBe(7);
    expect(gridNextIndex('ArrowUp', 5, 10, 4)).toBe(1);
    expect(gridNextIndex('ArrowUp', 2, 10, 4)).toBe(2);
    expect(gridNextIndex('ArrowLeft', 0, 10, 4)).toBe(0);
    expect(gridNextIndex('ArrowRight', 9, 10, 4)).toBe(9);
    expect(gridNextIndex('End', 3, 10, 4)).toBe(9);
    expect(gridNextIndex('x', 3, 10, 4)).toBeNull();
  });

  it('counts grid columns from layout', () => {
    expect(columnsOf([{ offsetTop: 0 }, { offsetTop: 0 }, { offsetTop: 0 }, { offsetTop: 90 }])).toBe(3);
    expect(columnsOf([])).toBe(1);
  });
});

describe('formatting', () => {
  const t = (k: string, p?: Record<string, string | number>) => i18n.t(k, p);
  it('formats clocks, signs, tiers and countdowns', () => {
    expect(formatClock(125000)).toBe('2:05');
    expect(formatClock(-5)).toBe('0:00');
    expect(formatSigned(30)).toBe('+30');
    expect(formatSigned(-20)).toBe('−20');
    expect(formatSigned(0)).toBe('0');
    expect(tierNumeral(0)).toBe('0');
    expect(tierNumeral(4)).toBe('IV');
    expect(tierNumeral(10)).toBe('X');
    expect(formatCountdown(4 * 3600 * 1000 + 12 * 60 * 1000, t)).toBe('4h 12m');
    expect(formatCountdown(26 * 3600 * 1000, t)).toBe('1d 2h');
    expect(formatCountdown(65 * 1000, t)).toBe('1m 5s');
    expect(formatCountdown(0, t)).toBe('0s');
  });
});

describe('odds model (A6.4, A6.5)', () => {
  it('shows a fresh bag of 30/40/20/7/3 when the bag is empty', () => {
    expect(bagLeft(content.capsules, [])).toEqual({ clay: 30, bronze: 40, silver: 20, jade: 7, aeon: 3 });
    expect(bagLeft(content.capsules, [0, 0, 4, 3])).toEqual({ clay: 2, bronze: 0, silver: 0, jade: 1, aeon: 1 });
  });

  it('follows the Legendary pity curve: none to 25, +5% from 26, sure at 40', () => {
    expect(legendaryPityBp(content.capsules, 25)).toBe(0);
    expect(legendaryPityBp(content.capsules, 26)).toBe(500);
    expect(legendaryPityBp(content.capsules, 39)).toBe(7000);
    expect(legendaryPityBp(content.capsules, 40)).toBe(10000);
  });

  it('reports the counters from the save', () => {
    const m = oddsModel(content.capsules, content.rarities, midGameSave(content), true);
    const byId = Object.fromEntries(m.pity.map((p) => [p.id, p]));
    expect(byId['epic']).toMatchObject({ since: 6, every: 10, guaranteedIn: 4 });
    // 28 since the last Legendary plus 5 pre-rolled pending capsules: the next one earned is n = 34.
    expect(byId['legendary']).toMatchObject({ since: 28, guaranteedIn: 12, nextChanceBp: 4500 });
    expect(byId['newCard']).toMatchObject({ guaranteedIn: 3 });
    expect(m.bagSize).toBe(100);
    expect(m.bagLeftTotal).toBe(64);
    expect(m.stackBp.map((s) => s.bp)).toEqual([7200, 2200, 500, 100]);
    expect(m.dailyBp.map((d) => [d.tier, d.bp])).toEqual([
      ['bronze', 7800],
      ['silver', 1500],
      ['jade', 500],
      ['aeon', 200],
    ]);
    expect(m.foils.map((f) => [f.foil, f.bp])).toEqual([
      ['holo', 25],
      ['silver', 100],
      ['bronze', 400],
    ]);
    expect(m.wardrobeBp.map((w) => w.bp)).toEqual([7800, 1800, 400]);
  });

  it('the Legendary "next capsule you earn" chance counts pre-rolled pending capsules (A6.4, A6.5)', () => {
    const base = midGameSave(content);
    const none = { ...base, capsules: { ...base.capsules, pending: [] } };
    const two = { ...base, capsules: { ...base.capsules, pending: [{ kind: 'win' }, { kind: 'ageUnlock' }, { kind: 'daily' }] as never } };
    const leg = (s: typeof base) => oddsModel(content.capsules, content.rarities, s, true).pity.find((p) => p.id === 'legendary')!;
    expect(leg(none).nextChanceBp).toBe(legendaryPityBp(content.capsules, base.pity.sinceLegendary + 1));
    // Two pending capsules count for pity (the Age Unlock Capsule does not), so the next one earned is n + 3.
    expect(leg(two).nextChanceBp).toBe(legendaryPityBp(content.capsules, base.pity.sinceLegendary + 3));
  });

  it('formats basis points as percentages', () => {
    expect(formatBp(7200)).toBe('72%');
    expect(formatBp(25)).toBe('0.25%');
    expect(formatBp(250)).toBe('2.5%');
  });
});

describe('avatars (A6.1)', () => {
  it('is deterministic per seed and honours explicit parts', () => {
    expect(avatarLook(4821)).toEqual(avatarLook(4821));
    expect(avatarLook(1)).not.toEqual(avatarLook(2));
    expect(avatarLook(4821, { hat: 3 }).hat).toBe(3);
    expect(avatarLook(4821, { hat: AVATAR_PARTS.hat + 1 }).hat).toBe(1);
    expect(avatarLook(4821, { skin: -1 }).skin).toBe(AVATAR_PARTS.skin.length - 1);
  });
});

describe('toasts', () => {
  it('keeps at most two (ui-plan 3.6) and dismisses on schedule', () => {
    const timers: (() => void)[] = [];
    const store = createToastStore((fn) => timers.push(fn));
    for (let i = 0; i < 5; i++) store.show(`t${i}`);
    expect(store.list.value.map((x) => x.text)).toEqual(['t3', 't4']);
    expect(store.list.value.length).toBe(MAX_TOASTS);
    timers[4]!();
    expect(store.list.value.map((x) => x.text)).toEqual(['t3']);
  });

  it('anchors a toast near its source and gives reversible actions a longer stay with Undo', () => {
    const waits: number[] = [];
    const store = createToastStore((_fn, ms) => waits.push(ms));
    let undone = 0;
    store.show('Equipped', { anchor: { x: 200, y: 120 }, undo: () => undone++ });
    store.show('Saved');
    const [a, b] = store.list.value;
    expect(a!.anchor).toEqual({ x: 200, y: 120 });
    expect(b!.anchor).toBeUndefined();
    expect(waits).toEqual([4000, 2600]);
    a!.undo!();
    expect(undone).toBe(1);
  });
});

function tile(o: Partial<CardTileData> = {}): CardTileData {
  return {
    id: 'bonker',
    kind: 'unit',
    name: 'Bonker',
    age: 'stone',
    rarity: 'common',
    glyph: 'infantry',
    owned: true,
    level: 3,
    copies: 4,
    needed: 5,
    upgradeReady: false,
    foil: 'none',
    isNew: false,
    skin: null,
    cost: 50,
    ...o,
  };
}

describe('card tile', () => {
  it('shows level, cost, copies and the NEW stamp', () => {
    show(<CardTile card={tile({ isNew: true })} showCopies showCost />);
    const el = container!.querySelector('.ui-card')!;
    expect(text(el.querySelector('.ui-card__level')!)).toBe('Lv 3');
    expect(text(el.querySelector('.ui-card__cost')!)).toBe('50');
    expect(text(el.querySelector('.ui-card__new')!)).toBe('NEW');
    expect(text(el.querySelector('[data-testid="copies-bar"]')!)).toBe('4/5');
  });

  it('marks ready upgrades, foils and max level', () => {
    show(
      <>
        <CardTile card={tile({ copies: 6, upgradeReady: true, foil: 'holo' })} showCopies />
        <CardTile card={tile({ id: 'pebbler', needed: null, level: 10 })} showCopies />
      </>,
    );
    const [ready, maxed] = container!.querySelectorAll('.ui-card');
    expect(ready!.getAttribute('class')).toContain('is-ready');
    expect(ready!.querySelector('.ui-foil--holo')).not.toBeNull();
    expect(ready!.querySelector('.ui-copies.is-ready')).not.toBeNull();
    expect(text(maxed!.querySelector('[data-testid="copies-bar"]')!)).toBe('MAX');
  });

  it('shows unowned cards as locked silhouettes without a level', () => {
    show(<CardTile card={tile({ owned: false })} onClick={() => undefined} />);
    const el = container!.querySelector('.ui-card')!;
    expect(el.getAttribute('class')).toContain('is-locked');
    expect(el.querySelector('.is-silhouette')).not.toBeNull();
    expect(el.querySelector('.ui-card__level')).toBeNull();
    expect(el.getAttribute('aria-label')).toContain('Not owned');
    expect(el.localName).toBe('button');
  });
});

describe('controls', () => {
  it('buttons: inert buttons stay focusable but do nothing', () => {
    let clicks = 0;
    show(
      <>
        <Button testid="a" onClick={() => clicks++}>
          A
        </Button>
        <Button testid="b" inert onClick={() => clicks++}>
          B
        </Button>
      </>,
    );
    act(() => container!.querySelector('[data-testid="a"]')!.click());
    act(() => container!.querySelector('[data-testid="b"]')!.click());
    expect(clicks).toBe(1);
    expect(container!.querySelector('[data-testid="b"]')!.getAttribute('aria-disabled')).toBe('true');
    expect(container!.querySelector('[data-testid="b"]')!.hasAttribute('disabled')).toBe(false);
  });

  it('toggle is a switch', () => {
    let v = false;
    show(<Toggle label="X" checked={false} onChange={(n) => (v = n)} testid="t" />);
    const sw = container!.querySelector('[data-testid="t"]')!;
    expect(sw.getAttribute('role')).toBe('switch');
    act(() => sw.click());
    expect(v).toBe(true);
  });

  it('segmented skips disabled options with the arrow keys', () => {
    let v = 'a';
    show(
      <Segmented
        label="L"
        value="a"
        onChange={(n: string) => (v = n)}
        options={[
          { value: 'a', label: 'A' },
          { value: 'b', label: 'B', disabled: true },
          { value: 'c', label: 'C' },
        ]}
      />,
    );
    const first = container!.querySelector('[role="radio"]')!;
    act(() => {
      keydown(first, 'ArrowRight');
    });
    expect(v).toBe('c');
  });

  it('modal closes on Escape and on the backdrop', () => {
    let closed = 0;
    show(
      <Modal title="T" onClose={() => closed++}>
        <button type="button">inside</button>
      </Modal>,
    );
    const panel = container!.querySelector('[role="dialog"]')!;
    expect(panel.getAttribute('aria-modal')).toBe('true');
    act(() => {
      keydown(panel, 'Escape');
    });
    act(() => container!.querySelector('.ui-modal__backdrop')!.click());
    expect(closed).toBe(2);
  });

  it('chips, AI badge and Clay meter', () => {
    show(
      <>
        <CurrencyChip kind="amber" value={3450} />
        <AiBadge general />
        <ClayMeter pips={2} max={3} />
        <CopiesBar copies={1} needed={2} ready={false} />
      </>,
    );
    expect(text(container!.querySelector('.ui-chip')!)).toBe('3,450');
    expect(text(container!.querySelector('[data-testid="ai-badge"]')!)).toBe('AI General');
    expect(container!.querySelectorAll('.ui-clay__pip.is-on')).toHaveLength(2);
  });
});

describe('fixtures sanity', () => {
  it('new player owns the starter kit and the scripted rares', () => {
    const s = newPlayerSave(content);
    for (const id of ['bonker', 'pebbler', 'tuskback', 'spear_hunter', 'pikeman', 'grenadier', 'rock_tosser', 'angry_beehive']) {
      expect(s.collection[id], id).toBeDefined();
    }
    expect(s.collection['bonker']!.level).toBe(2);
    expect(s.matchesPlayed).toBe(2);
  });
});
