/**
 * Behaviour of the screens: keyboard navigation (DESIGN C2/WP9 DoD), the War Plan builder (A3),
 * staged result rewards (A9 #7), the VS timer (A9 #4), Pause (A9 #6) and the service calls each
 * screen makes.
 */
import { content } from '@/content';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fixtureOpponent, fixturePause, fixtureRequest, fixtureResult } from '../fixtures/matches';
import { midGameSave } from '../fixtures/saves';
import { VS_MS } from '../vs/VsScreen';
import { REWARD_STEP_MS } from '../model/result';
import { input, keydown, text, type FakeElement } from './dom';
import { flush, mount, type Mounted } from './harness';

let m: Mounted | null = null;
afterEach(() => {
  m?.unmount();
  m = null;
  vi.useRealTimers();
});

const calls = (name: string) => m!.log.calls.filter((c) => c.name === name);

describe('keyboard navigation', () => {
  it('focuses the Battle button on Home and the title elsewhere', () => {
    m = mount({ state: 'mid' });
    expect(m.document.activeElement?.getAttribute('data-testid')).toBe('battle-button');
    flush(() => m!.router.go({ id: 'collection' }));
    expect(m.document.activeElement?.localName).toBe('h1');
  });

  it('Escape goes back from a screen and does nothing on Home', () => {
    m = mount({ state: 'mid', routes: [{ id: 'home' }, { id: 'collection' }] });
    flush(() => keydown(m!.document.body, 'Escape'));
    expect(m.router.current.value.id).toBe('home');
    flush(() => keydown(m!.document.body, 'Escape'));
    expect(m.router.current.value.id).toBe('home');
  });

  it('Escape on Pause resumes the battle', () => {
    m = mount({
      routes: [
        { id: 'battle', request: fixtureRequest('general'), opponent: fixtureOpponent(content, 'general') },
        { id: 'pause', info: fixturePause('late') },
      ],
    });
    expect(m.q('[data-testid="battle-slot"]')).not.toBeNull();
    flush(() => keydown(m!.document.body, 'Escape'));
    expect(m.router.current.value.id).toBe('battle');
    expect(calls('resume')).toHaveLength(1);
  });

  it('arrow keys move between tabs and select them', () => {
    m = mount({ state: 'mid', routes: [{ id: 'home' }, { id: 'warPlan' }] });
    const stone = m.q('[data-testid="age-tab-stone"]')!;
    flush(() => stone.focus());
    flush(() => keydown(stone, 'ArrowRight'));
    expect(m.q('[data-testid="age-tab-medieval"]')!.getAttribute('aria-selected')).toBe('true');
    expect(m.document.activeElement).toBe(m.q('[data-testid="age-tab-medieval"]'));
    flush(() => keydown(m!.q('[data-testid="age-tab-medieval"]')!, 'End'));
    expect(m.q('[data-testid="age-tab-future"]')!.getAttribute('aria-selected')).toBe('true');
    // Roving tab index: only the selected tab is in the Tab order.
    expect(m.qa('[role="tab"][tabindex="0"]').filter((el) => el.closest('[data-testid="age-picker"]'))).toHaveLength(1);
  });

  it('arrow keys move through a card grid', () => {
    m = mount({ state: 'mid', routes: [{ id: 'home' }, { id: 'collection' }] });
    const first = m.q('[data-testid="card-bonker"]')!;
    flush(() => first.focus());
    flush(() => keydown(first, 'ArrowRight'));
    expect(m.document.activeElement).toBe(m.q('[data-testid="card-pebbler"]'));
    flush(() => keydown(m!.document.activeElement as FakeElement, 'Home'));
    expect(m.document.activeElement).toBe(first);
  });

  it('a modal traps Tab, closes on Escape without leaving the screen, and restores focus', () => {
    m = mount({ state: 'mid' });
    const info = m.q('[data-testid="odds-open"]')!;
    flush(() => info.focus());
    m.click('[data-testid="odds-open"]');
    const modal = m.q('[data-testid="odds-modal"]')!;
    expect(modal).not.toBeNull();
    const close = modal.querySelector('.ui-modal__close')!;
    expect(m.document.activeElement).toBe(close);
    // Only one focusable element: Tab and Shift+Tab stay on it.
    const e = keydown(close, 'Tab');
    expect(e.defaultPrevented).toBe(true);
    expect(m.document.activeElement).toBe(close);
    flush(() => keydown(close, 'Escape'));
    expect(m.q('[data-testid="odds-modal"]')).toBeNull();
    expect(m.router.current.value.id).toBe('home');
    expect(m.document.activeElement).toBe(info);
  });

  it('segmented controls work with the arrow keys', () => {
    m = mount({ state: 'mid', routes: [{ id: 'home' }, { id: 'settings' }] });
    const on = m.q('[data-testid="set-preset"] [aria-checked="true"]')!;
    flush(() => keydown(on, 'ArrowRight'));
    expect(m.save.value.settings.graphics).toBe('high');
  });
});

describe('Home', () => {
  it('opens the best capsule, opens all, claims the daily capsule', () => {
    m = mount({ state: 'mid' });
    m.click('[data-testid="open-one"]');
    expect(calls('openCapsule')[0]!.args).toEqual(['cap-mid-5']);
    m.click('[data-testid="open-all"]');
    expect(calls('openAllCapsules')).toHaveLength(1);
  });

  it('locked nav items explain themselves instead of opening', () => {
    m = mount({ state: 'new' });
    m.click('[data-testid="nav-warPlan"]');
    expect(m.router.current.value.id).toBe('home');
    expect(text(m.q('[data-testid="toasts"]')!)).toBe('Unlocks after 3 matches');
    m.click('[data-testid="nav-collection"]');
    expect(m.router.current.value.id).toBe('collection');
  });

  it('claims a finished quest and rerolls another', () => {
    m = mount({ state: 'mid' });
    m.click('[data-testid="quest-claim-0"]');
    expect(m.save.value.quests.daily[0]!.claimed).toBe(true);
    m.click('[data-testid="quest-reroll-1"]');
    expect(m.save.value.quests.rerollUsed).toBe(true);
    expect(m.q('[data-testid="quest-reroll-1"]')).toBeNull();
  });

  it('Battle leads to mode select, then VS with the opponent the app picked', () => {
    m = mount({ state: 'mid' });
    m.click('[data-testid="battle-button"]');
    expect(m.router.current.value.id).toBe('modeSelect');
    m.click('[data-testid="ladder-start"]');
    expect(calls('prepareMatch')[0]!.args[0]).toEqual({ mode: 'ladder', format: 'full' });
    expect(m.router.current.value.id).toBe('vs');
  });
});

describe('Mode select', () => {
  it('offers only the arena formats and locks Conquest and Skirmish for a new player', () => {
    m = mount({ state: 'new', routes: [{ id: 'home' }, { id: 'modeSelect' }] });
    expect(m.q('[data-testid="ladder-format"]')).toBeNull();
    expect(m.q('[data-testid="conquest-open"]')).toBeNull();
    expect(m.q('[data-testid="skirmish-open"]')).toBeNull();
    expect(text(m.q('[data-testid="mode-conquest"]')!)).toContain('Unlocks in Arena 3');
  });

  it('sets up a Skirmish with Echo, tier, format, speed and standard levels', () => {
    m = mount({ state: 'mid', routes: [{ id: 'home' }, { id: 'modeSelect' }] });
    m.click('[data-testid="skirmish-open"]');
    m.click('[data-testid="skirmish-general-echo"]');
    const tier = m.q('[data-testid="skirmish-tier"] input')!;
    flush(() => input(tier, '7'));
    m.click('[data-testid="skirmish-standard"]');
    m.click('[data-testid="skirmish-start"]');
    expect(calls('prepareMatch')[0]!.args[0]).toEqual({
      mode: 'skirmish',
      options: { generalId: 'echo', tier: 7, format: 'short', standardLevels: true },
      speed: 1,
    });
  });

  it('starts the Daily Challenge', () => {
    m = mount({ state: 'mid', routes: [{ id: 'home' }, { id: 'modeSelect' }] });
    expect(text(m.q('[data-testid="daily-modifier"]')!)).toContain('Gold Rush');
    m.click('[data-testid="daily-start"]');
    expect(calls('prepareMatch')[0]!.args[0]).toEqual({ mode: 'daily' });
  });
});

describe('VS (2 s, skippable)', () => {
  beforeEach(() => vi.useFakeTimers());

  it('begins the battle after 2 s', () => {
    m = mount({
      routes: [{ id: 'home' }, { id: 'vs', request: fixtureRequest('general'), opponent: fixtureOpponent(content, 'general') }],
    });
    flush(() => vi.advanceTimersByTime(VS_MS - 10));
    expect(calls('beginBattle')).toHaveLength(0);
    flush(() => vi.advanceTimersByTime(20));
    expect(calls('beginBattle')).toHaveLength(1);
  });

  it('a tap skips, and only one battle starts', () => {
    m = mount({
      routes: [{ id: 'home' }, { id: 'vs', request: fixtureRequest('general'), opponent: fixtureOpponent(content, 'general') }],
    });
    m.click('[data-screen="vs"]');
    flush(() => vi.advanceTimersByTime(VS_MS * 2));
    expect(calls('beginBattle')).toHaveLength(1);
  });
});

describe('Result (rewards staged, each skippable)', () => {
  beforeEach(() => vi.useFakeTimers());
  const route = () => [{ id: 'home' as const }, { id: 'result' as const, info: fixtureResult(content, 'win') }];

  it('reveals rewards one at a time', () => {
    m = mount({ routes: route() });
    const count = () => m!.qa('.result-reward').length;
    expect(count()).toBe(0);
    flush(() => vi.advanceTimersByTime(REWARD_STEP_MS + 260));
    expect(count()).toBe(1);
    flush(() => vi.advanceTimersByTime(REWARD_STEP_MS + 10));
    expect(count()).toBe(2);
  });

  it('a tap reveals the next reward; Skip reveals all', () => {
    m = mount({ routes: route() });
    m.click('[data-testid="result-rewards"]');
    expect(m.qa('.result-reward').length).toBe(1);
    m.click('[data-testid="result-skip"]');
    expect(m.qa('.result-reward').length).toBe(5);
    expect(m.q('[data-testid="result-skip"]')).toBeNull();
  });

  it('shows everything at once with reduce motion', () => {
    const save = mount({ state: 'mid' }).save.value;
    m?.unmount();
    m = mount({ save: { ...save, settings: { ...save.settings, reduceMotion: true } }, routes: route() });
    expect(m.qa('.result-reward').length).toBe(5);
    expect(m.q('[data-testid="ui-root"]')!.getAttribute('data-reduce-motion')).toBe('true');
  });

  it('opens the earned capsule, replays, and starts the next battle of the same mode', () => {
    m = mount({ routes: route() });
    m.click('[data-testid="result-open"]');
    expect(calls('openCapsule')[0]!.args).toEqual(['cap-mid-1']);
    m.click('[data-testid="result-replay"]');
    expect(calls('watchReplay')[0]!.args).toEqual([0]);
    m.click('[data-testid="result-next"]');
    expect(calls('prepareMatch')[0]!.args[0]).toEqual({ mode: 'ladder', format: 'standard' });
    expect(m.router.stack.value.map((e) => e.route.id)).toEqual(['home', 'vs']);
  });
});

describe('Pause', () => {
  it('Retreat is locked before 1:00', () => {
    m = mount({
      routes: [
        { id: 'battle', request: fixtureRequest('general'), opponent: fixtureOpponent(content, 'general') },
        { id: 'pause', info: fixturePause('early') },
      ],
    });
    expect(m.q('[data-testid="pause-retreat"]')!.getAttribute('aria-disabled')).toBe('true');
    m.click('[data-testid="pause-retreat"]');
    expect(m.q('[data-testid="retreat-confirm"]')).toBeNull();
    expect(m.q('[data-testid="pause-quit"]')).toBeNull();
  });

  it('the Tutorial format has no Retreat at all', () => {
    m = mount({
      routes: [
        { id: 'battle', request: fixtureRequest('grogg'), opponent: fixtureOpponent(content, 'grogg') },
        { id: 'pause', info: fixturePause('tutorial') },
      ],
    });
    expect(m.q('[data-testid="pause-retreat"]')).toBeNull();
    expect(m.q('[data-testid="pause-retreat-locked"]')).toBeNull();
  });

  it('Retreat asks first and counts as a loss', () => {
    m = mount({
      routes: [
        { id: 'battle', request: fixtureRequest('general'), opponent: fixtureOpponent(content, 'general') },
        { id: 'pause', info: fixturePause('late') },
      ],
    });
    m.click('[data-testid="pause-retreat"]');
    expect(text(m.q('[data-testid="retreat-confirm"]')!)).toContain('Retreating counts as a loss.');
    m.click('[data-testid="retreat-yes"]');
    expect(calls('retreat')).toHaveLength(1);
  });

  it('Settings opens over the pause menu; Quit shows in Skirmish only', () => {
    m = mount({
      routes: [
        { id: 'battle', request: fixtureRequest('echo'), opponent: fixtureOpponent(content, 'echo') },
        { id: 'pause', info: fixturePause('skirmish') },
      ],
    });
    expect(m.q('[data-testid="pause-quit"]')).not.toBeNull();
    m.click('[data-testid="pause-settings"]');
    expect(m.q('[data-screen="settings"]')).not.toBeNull();
    expect(m.q('[data-testid="battle-slot"]')).not.toBeNull();
    expect(m.q('[data-screen="pause"]')).not.toBeNull();
  });

  it('lists the scouted cards without levels', () => {
    m = mount({
      routes: [
        { id: 'battle', request: fixtureRequest('general'), opponent: fixtureOpponent(content, 'general') },
        { id: 'pause', info: fixturePause('late') },
      ],
    });
    const scouted = m.q('[data-testid="pause-scouted"]')!;
    expect(text(scouted)).toContain('Scouted (5)');
    expect(scouted.querySelectorAll('.ui-card__level')).toHaveLength(0);
  });
});

describe('War Plan builder (A3)', () => {
  it('picks a slot, then a card, and saves the plan', () => {
    m = mount({ state: 'mid', routes: [{ id: 'home' }, { id: 'warPlan' }] });
    m.click('[data-testid="remove-unit-4"]');
    expect(m.save.value.warPlans[0]!.loadouts.stone.units[4]).toBeNull();
    m.click('[data-testid="slot-unit-4"]');
    m.click('[data-testid="cand-sabertooth"]');
    expect(m.save.value.warPlans[0]!.loadouts.stone.units[4]).toBe('sabertooth');
    // Picking a card already in the plan moves it (no duplicates).
    m.click('[data-testid="slot-unit-0"] .ui-card');
    m.click('[data-testid="cand-sabertooth"]');
    const units = m.save.value.warPlans[0]!.loadouts.stone.units;
    expect(units[0]).toBe('sabertooth');
    expect(units.filter((u) => u === 'sabertooth')).toHaveLength(1);
  });

  it('unowned cards cannot be picked', () => {
    m = mount({ state: 'new', routes: [{ id: 'home' }, { id: 'warPlan' }] });
    expect(m.q('[data-testid="cand-mammoth_matriarch"]')!.hasAttribute('disabled')).toBe(true);
  });

  it('shows advisor warnings for the selected age and marks ages with issues', () => {
    const save = midGameSave(content);
    const plan = save.warPlans[0]!;
    const modern = { ...plan.loadouts.modern, units: ['trench_raider', 'rifleman', 'tankette', null, null] };
    save.warPlans[0] = { ...plan, loadouts: { ...plan.loadouts, modern } };
    m = mount({ save, routes: [{ id: 'home' }, { id: 'warPlan', age: 'modern' }] });
    expect(m.q('[data-testid="issue-onlyThreeUnits"]')).not.toBeNull();
    expect(m.q('[data-testid="issue-noAntiArmor"]')).not.toBeNull();
    expect(text(m.q('[data-testid="issue-noAntiArmor"]')!)).toBe('Modern Age has no anti-armor.');
    expect(m.q('[data-testid="age-tab-modern"] .ui-warndot')).not.toBeNull();
  });

  it('auto-fills, switches presets and makes a preset the active plan', () => {
    m = mount({ state: 'mid', routes: [{ id: 'home' }, { id: 'warPlan' }] });
    m.click('[data-testid="auto-fill"]');
    expect(calls('autoFill')).toHaveLength(1);
    expect(m.save.value.warPlans[0]!.name).toBe('Rush');
    m.click('[data-testid="preset-1"]');
    m.click('[data-testid="use-plan"]');
    expect(m.save.value.activePlan).toBe(1);
    expect(m.q('[data-testid="plan-in-use"]')).not.toBeNull();
  });

  it('renames a preset', () => {
    m = mount({ state: 'mid', routes: [{ id: 'home' }, { id: 'warPlan' }] });
    m.click('[data-testid="rename"]');
    const field = m.q('[data-testid="rename-plan"] input')!;
    flush(() => input(field, 'Blitz'));
    m.click('[data-testid="rename-save"]');
    expect(m.save.value.warPlans[0]!.name).toBe('Blitz');
  });

  it('opens the skin picker for a card with skins and equips one', () => {
    m = mount({ state: 'mid', routes: [{ id: 'home' }, { id: 'warPlan' }] });
    m.click('[data-testid="skins-bonker"]');
    expect(m.q('[data-testid="skin-picker"]')).not.toBeNull();
    m.click('[data-testid="equip-default"]');
    expect(m.save.value.skins.equipped['bonker']).toBeUndefined();
  });
});

describe('Collection and card detail', () => {
  it('filters the grid', () => {
    m = mount({ state: 'mid', routes: [{ id: 'home' }, { id: 'collection' }] });
    const all = m.qa('[data-testid="col-grid"] .ui-card').length;
    expect(all).toBe(65);
    const legendary = m.q('[data-testid="filter-rarity"] [role="radio"]:not([aria-checked="true"])');
    expect(legendary).not.toBeNull();
    const radios = m.qa('[data-testid="filter-rarity"] [role="radio"]');
    flush(() => radios[4]!.click());
    expect(m.qa('[data-testid="col-grid"] .ui-card').length).toBe(5);
  });

  it('shows silhouettes for unowned cards', () => {
    m = mount({ state: 'new', routes: [{ id: 'home' }, { id: 'collection' }] });
    expect(m.q('[data-testid="card-mammoth_matriarch"]')!.getAttribute('class')).toContain('is-locked');
    expect(m.q('[data-testid="card-mammoth_matriarch"] .ui-art.is-silhouette')).not.toBeNull();
  });

  it('upgrades a ready card with a toast and crafts a missing one', () => {
    m = mount({ state: 'mid', routes: [{ id: 'home' }, { id: 'cardDetail', card: 'pikeman' }] });
    const before = m.save.value.collection['pikeman']!.level;
    m.click('[data-testid="card-upgrade-btn"]');
    expect(m.save.value.collection['pikeman']!.level).toBe(before + 1);
    expect(text(m.q('[data-testid="toasts"]')!)).toBe(`Level ${before + 1}!`);
    m.unmount();
    m = mount({ state: 'mid', routes: [{ id: 'home' }, { id: 'cardDetail', card: 'friar' }] });
    m.click('[data-testid="card-craft"]');
    expect(m.save.value.currencies.dust).toBe(820 - content.rarities.cards.rare.craftCopyDust);
  });

  it('shows the max level for maxed cards and the road source of a locked power', () => {
    m = mount({ state: 'maxed', routes: [{ id: 'home' }, { id: 'cardDetail', card: 'bonker' }] });
    expect(m.q('[data-testid="card-max"]')).not.toBeNull();
    m.unmount();
    m = mount({ state: 'new', routes: [{ id: 'home' }, { id: 'cardDetail', card: 'meteor_shower' }] });
    expect(text(m.q('[data-testid="card-upgrade"]')!)).toBe('Unlocks on the Trophy Road at 100');
  });
});

describe('Trophy Road, Conquest, Profile, Settings', () => {
  it('claims a road node', () => {
    m = mount({ state: 'mid', routes: [{ id: 'home' }, { id: 'trophyRoad' }] });
    m.click('[data-testid="road-claim-950"]');
    expect(m.save.value.trophies.roadClaimed).toContain(950);
    expect(m.q('[data-testid="road-node-950"]')!.getAttribute('class')).toContain('is-claimed');
    expect(m.q('[data-testid="road-marker"]')).not.toBeNull();
  });

  it('opens a General and starts a Full War conquest match', () => {
    m = mount({ state: 'mid', routes: [{ id: 'home' }, { id: 'conquest' }] });
    m.click('[data-testid="cq-gen-ledger"]');
    m.click('[data-testid="cq-fight"]');
    expect(calls('prepareMatch')[0]!.args[0]).toEqual({ mode: 'conquest', general: 'ledger' });
    expect(m.router.current.value.id).toBe('vs');
  });

  it('locked Generals cannot be fought', () => {
    m = mount({ state: 'mid', routes: [{ id: 'home' }, { id: 'conquest' }] });
    m.click('[data-testid="cq-gen-rook"]');
    expect(m.q('[data-testid="cq-fight"]')).toBeNull();
  });

  it('renames the profile', () => {
    m = mount({ state: 'mid', routes: [{ id: 'home' }, { id: 'profile' }] });
    m.click('[data-testid="edit-name-btn"]');
    flush(() => input(m!.q('[data-testid="edit-name"] input')!, 'Chief Bonk'));
    m.click('[data-testid="name-save"]');
    expect(text(m.q('[data-testid="profile-name"]')!)).toBe('Chief Bonk');
  });

  it('changes settings at once', () => {
    m = mount({ state: 'mid', routes: [{ id: 'home' }, { id: 'settings' }] });
    m.click('[data-testid="set-reduce-motion"]');
    expect(m.save.value.settings.reduceMotion).toBe(true);
    flush(() => input(m!.q('[data-testid="vol-music"] input')!, '40'));
    expect(m.save.value.settings.volume.music).toBeCloseTo(0.4, 5);
    m.click('[data-testid="set-hitstop"]');
    expect(m.save.value.settings.hitstop).toBe(false);
    expect(m.q('[data-testid="set-language"] [aria-checked="false"]')!.hasAttribute('disabled')).toBe(true);
  });

  it('shows the backup reminder and exports a code that imports again', () => {
    m = mount({ state: 'mid', routes: [{ id: 'home' }, { id: 'settings' }] });
    expect(m.q('[data-testid="backup-reminder"]')).not.toBeNull();
    m.click('[data-testid="export-code"]');
    const code = m.q('[data-testid="export-text"]')!.value;
    expect(code.length).toBeGreaterThan(20);
    flush(() => keydown(m!.q('[data-testid="export-modal"]')!, 'Escape'));
    m.click('[data-testid="import"]');
    flush(() => input(m!.q('[data-testid="import-text"]')!, code));
    m.click('[data-testid="import-go"]');
    expect(text(m.q('[data-testid="toasts"]')!)).toContain('Save imported!');
  });

  it('reset needs two confirmations', () => {
    m = mount({ state: 'mid', routes: [{ id: 'home' }, { id: 'settings' }] });
    m.click('[data-testid="reset"]');
    m.click('[data-testid="reset-next"]');
    expect(m.save.value.trophies.current).toBe(1020);
    m.click('[data-testid="reset-yes"]');
    expect(m.save.value.trophies.current).toBe(0);
  });

  it('shows the odds overview with the bag state and pity counters', () => {
    m = mount({ state: 'mid', routes: [{ id: 'home' }, { id: 'settings' }] });
    m.click('[data-testid="odds-overview"]');
    const sheet = m.q('[data-testid="odds-sheet"]')!;
    expect(text(sheet.querySelector('[data-testid="odds-aeon-line"]')!)).toBe('Exactly 3 Aeon in every 100 Win Capsules.');
    expect(text(sheet.querySelector('[data-testid="odds-bag-jade"]')!)).toContain('5 left');
    expect(text(sheet.querySelector('[data-testid="odds-pity-legendary"]')!)).toContain('Next capsule: 20%');
  });
});
