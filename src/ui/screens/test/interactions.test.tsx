/**
 * Behaviour of the screens: keyboard navigation (DESIGN C2/WP9 DoD), the War Plan builder (A3),
 * staged result rewards (A9 #7), the VS timer (A9 #4), Pause (A9 #6) and the service calls each
 * screen makes.
 */
import { content } from '@/content';
import { i18n } from '@/i18n';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fixtureOpponent, fixturePause, fixtureRequest, fixtureResult } from '../fixtures/matches';
import { midGameSave, newPlayerSave } from '../fixtures/saves';
import { VS_MS } from '../vs/VsScreen';
import { REWARD_STEP_MS } from '../model/result';
import { input, keydown, text, type FakeElement } from './dom';
import { flush, mount, type Mounted } from './harness';
import { act } from 'preact/test-utils';
import { primeWarPathSeen } from '../warPath/WarPathScreen';
import { nodeKind } from '../model/warPath';

let m: Mounted | null = null;
afterEach(() => {
  m?.unmount();
  m = null;
  vi.useRealTimers();
});

const calls = (name: string) => m!.log.calls.filter((c) => c.name === name);
const i18nText = (key: string) => i18n.t(key);

describe('keyboard navigation', () => {
  it('focuses Play on Home and the title elsewhere', () => {
    m = mount({ state: 'mid' });
    expect(m.document.activeElement?.getAttribute('data-testid')).toBe('play');
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
    // A17.8: Bronze follows Stone
    expect(m.q('[data-testid="age-tab-bronze"]')!.getAttribute('aria-selected')).toBe('true');
    expect(m.document.activeElement).toBe(m.q('[data-testid="age-tab-bronze"]'));
    flush(() => keydown(m!.q('[data-testid="age-tab-bronze"]')!, 'End'));
    // Army shows the reached ages only (ui-plan 4.2): the mid save's longest format ends at Future.
    expect(m.q('[data-testid="age-tab-future"]')!.getAttribute('aria-selected')).toBe('true');
    expect(m.q('[data-testid="age-tab-cosmic"]')).toBeNull();
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
    m = mount({ state: 'mid', routes: [{ id: 'capsules' }] });
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
    expect(m.router.current.value.id).toBe('capsules');
    expect(m.document.activeElement).toBe(info);
  });

  it('segmented controls work with the arrow keys', () => {
    m = mount({ state: 'mid', routes: [{ id: 'home' }, { id: 'settings' }] });
    const on = m.q('[data-testid="set-preset"] [aria-checked="true"]')!;
    flush(() => keydown(on, 'ArrowRight'));
    expect(m.save.value.settings.graphics).toBe('high');
  });
});

/** A save on its very first launch: the training match next, nothing earned (ui-plan 2.6). */
function firstLaunch() {
  const n = newPlayerSave(content);
  return {
    ...n,
    currencies: { amber: 0, dust: 0 },
    matchesPlayed: 0,
    stats: { ...n.stats, wins: 0, losses: 0, matches: 0 },
    tutorial: { step: 0, hintsShown: {} },
    warPath: { ...n.warPath, stars: {}, crowns: {} },
    flags: {},
  };
}

/** Right after match 1 (one win; match 2 vs Pip is next). */
function afterMatch1() {
  const n = firstLaunch();
  return { ...n, matchesPlayed: 1, stats: { ...n.stats, wins: 1, matches: 1 }, tutorial: { step: 2, hintsShown: {} }, warPath: { ...n.warPath, stars: { 'wp.stone.l01': 1 } } };
}

describe('Home: the Battle hub (owner decision 2026-09-30, ui-plan 2.3)', () => {
  beforeEach(() => primeWarPathSeen(null));

  it('Battle is the one primary and starts a Ladder match through VS, in one tap (U2)', () => {
    vi.useFakeTimers();
    m = mount({ state: 'mid', shell: true });
    expect(m.qa('[data-primary]')).toHaveLength(1);
    expect(text(m.q('[data-testid="play"]')!)).toBe('Battle');
    expect(m.q('[data-testid="home-opponent"] [data-testid="ai-badge"]')).not.toBeNull();
    expect(m.q('[data-testid="home-trophies"]')).not.toBeNull();
    expect(m.q('[data-testid="home-campaign"]')).not.toBeNull();
    m.click('[data-testid="play"]');
    flush(() => vi.advanceTimersByTime(300));
    const req = calls('prepareMatch')[0]!.args[0] as { mode: string; format: string };
    expect(req.mode).toBe('ladder');
    expect(m.router.current.value.id).toBe('vs');
  });

  it('the format picker sets the format Battle plays and remembers it', () => {
    vi.useFakeTimers();
    m = mount({ state: 'mid', shell: true });
    const opts = m.qa('[data-testid="home-format"] [role="radio"]');
    expect(opts.length).toBeGreaterThan(1);
    const std = opts.find((el) => text(el) === 'Standard')!;
    act(() => std.click());
    expect(m.save.value.flags['ui-ladderFormat.standard']).toBe(true);
    // The picker names the format; the line under it says what it means (never cut off at 844).
    expect(text(m.q('[data-testid="home-format-desc"]')!)).toBe('5 ages, about 10 min.');
    expect(calls('previewOpponent').some((c) => c.args[0] === 'standard')).toBe(true);
    m.click('[data-testid="play"]');
    flush(() => vi.advanceTimersByTime(300));
    expect(calls('prepareMatch')[0]!.args[0]).toEqual({ mode: 'ladder', format: 'standard' });
  });

  it('first launch shows only the arena, Battle and the gear; Battle starts the training match vs an AI', () => {
    vi.useFakeTimers();
    m = mount({ save: firstLaunch(), shell: true });
    expect(m.q('[data-testid="tabbar"]')).toBeNull();
    expect(m.q('[data-testid="home-amber"]')).toBeNull();
    expect(m.q('[data-testid="home-modes"]')).toBeNull();
    expect(m.q('[data-testid="home-profile"]')).toBeNull();
    expect(m.q('[data-testid="home-campaign"]')).toBeNull();
    expect(m.q('[data-testid="home-trophies"]')).toBeNull();
    expect(m.q('[data-testid="nav-settings"]')).not.toBeNull();
    expect(text(m.q('[data-testid="wp-start"]')!)).toBe('Win your first battle');
    expect(text(m.q('[data-testid="home-opponent"]')!)).toContain('Old Grogg');
    expect(m.q('[data-testid="home-opponent"] [data-testid="ai-badge"]')).not.toBeNull();
    m.click('[data-testid="play"]');
    flush(() => vi.advanceTimersByTime(300));
    expect(calls('prepareMatch')[0]!.args[0]).toEqual({ mode: 'tutorial', match: 1 });
  });

  it('while match 2 is next, Battle starts the onboarding match vs Pip', () => {
    vi.useFakeTimers();
    m = mount({ save: afterMatch1() });
    expect(text(m.q('[data-testid="home-opponent"]')!)).toContain('Pip');
    m.click('[data-testid="play"]');
    flush(() => vi.advanceTimersByTime(300));
    expect(calls('prepareMatch')[0]!.args[0]).toEqual({ mode: 'tutorial', match: 2 });
  });

  it('the Campaign card opens the War Path map; Back returns Home', () => {
    m = mount({ state: 'mid', shell: true });
    // One name for it everywhere: the War Path (a solo campaign).
    expect(text(m.q('[data-testid="home-campaign"]')!)).toContain('War Path');
    expect(text(m.q('[data-testid="home-campaign"]')!)).toContain('Solo campaign vs AI');
    m.click('[data-testid="home-campaign"]');
    expect(m.router.current.value.id).toBe('warPath');
    expect(m.q('[data-testid="tabbar"]')).toBeNull();
    m.click('[data-testid="back"]');
    expect(m.router.current.value.id).toBe('home');
  });

  it('a capsule slot opens its capsule in one tap', () => {
    m = mount({ state: 'mid', shell: true });
    const slot = m.q('[data-testid="capsule-tray"] [data-testid^="drum-"]')!;
    expect(slot).not.toBeNull();
    act(() => slot.click());
    expect(calls('openCapsule')).toHaveLength(1);
  });

  it('Modes opens the panel; its Play starts Quick Battle at the picked difficulty', () => {
    m = mount({ state: 'mid' });
    m.click('[data-testid="home-modes"]');
    expect(m.q('[data-testid="modes-sheet"]')).not.toBeNull();
    expect(m.q('[data-testid="mode-ladder"]')).toBeNull();
    m.click('[data-testid="modes-play"]');
    const req = calls('prepareMatch')[0]!.args[0] as { mode: string; options: { format: string } };
    expect(req.mode).toBe('skirmish');
    expect(req.options.format).toBe('short');
    expect(m.router.current.value.id).toBe('vs');
  });

  it('tabs: locked tabs say when they open, open ones switch, at most 2 ready badges (2.2, 2.6)', () => {
    m = mount({ state: 'new', shell: true });
    expect(m.q('[data-testid="tab-progress"]')!.getAttribute('aria-disabled')).toBe('true');
    m.click('[data-testid="tab-progress"]');
    expect(m.router.current.value.id).toBe('home');
    m.click('[data-testid="tab-capsules"]');
    expect(m.router.current.value.id).toBe('capsules');
    expect(m.router.tab.value).toBe('capsules');
    flush(() => keydown(m!.document.body, 'Escape'));
    expect(m.router.current.value.id).toBe('home');
    m.unmount();
    m = mount({ state: 'maxed', shell: true });
    expect(m.qa('[data-badge="ready"]').length).toBeLessThanOrEqual(2);
  });

  it('a feature that just opened plays its unlock pointer once (MR-40)', () => {
    m = mount({ save: afterMatch1(), shell: true });
    expect(m.q('[data-testid="unlock-army"]')).not.toBeNull();
    expect(m.save.value.flags['ui-unlock.army']).toBe(true);
    expect(text(m.q('[data-testid="unlock-army"]')!).split(/\s+/).length).toBeLessThanOrEqual(9);
  });

  it('when the onboarding ends, the Ladder and the War Path open in one moment, after the first upgrade (U8, U13)', () => {
    const n = afterMatch1();
    const ended = { ...n, matchesPlayed: 2, stats: { ...n.stats, wins: 2, matches: 2 }, tutorial: { step: 4, hintsShown: {} }, flags: { 'ui-unlock.army': true } };
    // The forced first upgrade is still to come (the app shows it over Home): no unlock moment is used up.
    if (ended.collection['bonker']?.level === 1) {
      m = mount({ save: ended, shell: true });
      expect(m.q('.wp-unlock')).toBeNull();
      expect(m.save.value.flags['ui-unlock.ladder']).toBeUndefined();
      m.unmount();
    }
    const done = { ...ended, flags: { ...ended.flags, 'tutorial.firstUpgrade': true } };
    m = mount({ save: done, shell: true });
    const moment = m.q('[data-testid="unlock-ladder"]');
    expect(moment).not.toBeNull();
    expect(moment!.getAttribute('data-also')).toBe('campaign');
    expect(text(moment!)).toContain('Ladder and War Path');
    expect(m.save.value.flags['ui-unlock.ladder']).toBe(true);
    expect(m.save.value.flags['ui-unlock.campaign']).toBe(true);
    m.unmount();
    // A save that already saw the Ladder moment gets the War Path's own.
    m = mount({ save: { ...done, flags: { ...done.flags, 'ui-unlock.ladder': true, 'ui-unlock.capsules': true } }, shell: true });
    expect(m.q('[data-testid="unlock-campaign"]')).not.toBeNull();
    expect(text(m.q('[data-testid="unlock-campaign"]')!)).toContain('War Path: solo battles, earn cards');
  });

  it('Amber and Dust info panels say they cannot be bought (A15.3)', () => {
    m = mount({ state: 'mid' });
    m.click('[data-testid="home-amber"]');
    expect(text(m.q('[data-testid="currency-info-amber"]')!)).toContain("Amber can't be bought. It has no money value.");
  });
});

describe('the War Path map (S2c, ui-plan 4.1, 6.4)', () => {
  beforeEach(() => primeWarPathSeen(null));
  const wp = () => [{ id: 'home' as const }, { id: 'warPath' as const }];

  it('Play is the one primary and starts the next level through VS, in one tap (U2)', () => {
    vi.useFakeTimers();
    m = mount({ state: 'mid', routes: wp() });
    expect(m.qa('[data-primary]')).toHaveLength(1);
    expect(text(m.q('[data-testid="wp-play"]')!)).toBe('Play level 7');
    expect(text(m.q('.wp-top__long')!)).toBe('Bronze Age: Hellas · Level 7 of 10');
    m.click('[data-testid="wp-play"]');
    flush(() => vi.advanceTimersByTime(300));
    expect(calls('prepareMatch')[0]!.args[0]).toEqual({ mode: 'warPath', level: 'wp.bronze.l07', difficulty: 'normal' });
    expect(m.router.current.value.id).toBe('vs');
  });

  it('nodes come in kinds: battle, elite, treasure, story and boss', () => {
    m = mount({ state: 'new', routes: wp() });
    const kind = (id: string) => m!.q(`[data-testid="wp-node-${id}"]`)!.getAttribute('data-kind');
    expect(kind('wp.stone.l03')).toBe('treasure');
    expect(kind('wp.stone.l04')).toBe('story');
    expect(kind('wp.stone.l05')).toBe('elite');
    // Nodes far off screen are not drawn; the model names their kinds.
    expect(nodeKind(content.warPath.levels['wp.stone.l10']!)).toBe('boss');
    expect(nodeKind(content.warPath.levels['wp.bronze.l02']!)).toBe('battle');
  });

  it('a node opens the Level preview; a locked node says what to beat and has no primary', () => {
    m = mount({ state: 'mid', routes: wp() });
    m.click('[data-testid="wp-node-wp.bronze.l09"]');
    expect(m.q('[data-testid="level-sheet"]')).not.toBeNull();
    expect(text(m.q('[data-testid="level-locked"]')!)).toContain('Beat level 8 first');
    expect(m.q('[data-testid="level-play"]')).toBeNull();
    m.unmount();
    m = mount({ state: 'mid', routes: wp() });
    m.click('[data-testid="level-plate"]');
    expect(text(m.q('[data-testid="level-play"]')!)).toBe('Play level 7');
    expect(text(m.q('[data-testid="level-preview"]')!)).toContain('AI');
  });

  it('a boss node discloses its base, and a beaten level offers Replay and the difficulty', () => {
    m = mount({ state: 'mid', routes: wp() });
    m.click('[data-testid="wp-node-wp.bronze.l10"]');
    expect(text(m.q('[data-testid="level-boss"]')!)).toContain('+50% HP');
    m.unmount();
    m = mount({ state: 'mid', routes: wp() });
    m.click('[data-testid="wp-node-wp.bronze.l03"]');
    expect(text(m.q('[data-testid="level-play"]')!)).toBe('Replay level 3');
    const hard = m.qa('[data-testid="level-difficulty"] [role="radio"]').find((el) => text(el) === 'Hard')!;
    act(() => hard.click());
    expect(calls('setWarPathDifficulty')[0]!.args).toEqual(['hard']);
    expect(m.save.value.warPath.difficulty).toBe('hard');
  });

  it('the level-complete ceremony plays once after a clear and Play finishes it at once (MR-41)', () => {
    vi.useFakeTimers();
    const mid = midGameSave(content);
    const before = { ...mid.warPath.stars };
    delete before['wp.bronze.l06'];
    primeWarPathSeen(before);
    m = mount({ save: mid, routes: wp() });
    expect(m.q('.wp-home.is-ceremony')).not.toBeNull();
    // The next node waits locked until it drops in.
    expect(m.q('[data-testid="wp-node-wp.bronze.l07"]')!.getAttribute('data-state')).toBe('locked');
    m.click('[data-testid="wp-play"]');
    expect(m.q('.wp-home.is-ceremony')).toBeNull();
    flush(() => vi.advanceTimersByTime(300));
    expect(calls('prepareMatch')[0]!.args[0]).toMatchObject({ mode: 'warPath', level: 'wp.bronze.l07' });
    m.unmount();
    m = mount({ save: mid, routes: wp() });
    expect(m.q('.wp-home.is-ceremony')).toBeNull();
  });
});

describe('Capsules and Progress tabs (ui-plan 2.2, 4.1b, 4.6)', () => {
  it('opens the best capsule and opens all', () => {
    m = mount({ state: 'mid', routes: [{ id: 'capsules' }] });
    m.click('[data-testid="open-one"]');
    expect(calls('openCapsule')[0]!.args).toEqual(['cap-mid-5']);
    m.click('[data-testid="open-all"]');
    expect(calls('openAllCapsules')).toHaveLength(1);
  });

  it('claims a finished quest and rerolls another', () => {
    m = mount({ state: 'mid', routes: [{ id: 'progress' }] });
    m.click('[data-testid="quest-claim-0"]');
    expect(m.save.value.quests.daily[0]!.claimed).toBe(true);
    m.click('[data-testid="quest-reroll-1"]');
    expect(m.save.value.quests.rerollUsed).toBe(true);
    expect(m.q('[data-testid="quest-reroll-1"]')).toBeNull();
  });

  it('the Trophy Road bar shows the next reward (A9 #2)', () => {
    m = mount({ state: 'mid', routes: [{ id: 'progress' }] });
    // Mid-game best is 1,080: the next node is 1,100, which pays 100 Dust (A6.3 road table) and the
    // War Path fallback power Boarding Nets (A2.9.8).
    expect(content.trophyRoad.nodes.find((n) => n.trophies === 1100)!.rewards).toEqual([
      { kind: 'dust', amount: 100 },
      { kind: 'power', card: 'boarding_nets' },
    ]);
    expect(text(m.q('[data-testid="home-road"]')!)).toContain('Next reward at 1,100');
    expect(text(m.q('[data-testid="home-road-next"]')!)).toBe('100Boarding Nets');
  });

  it('charges show "n/max" with no timer (A15.13)', () => {
    m = mount({ state: 'mid', routes: [{ id: 'capsules' }] });
    const row = text(m.q('[data-testid="charges"]')!);
    expect(row).toMatch(/Charges \d+\/\d+/);
    expect(row).not.toContain('+1 in');
  });

  it('shows the Supply line only while an allowance is banked (A15.4)', () => {
    const n = newPlayerSave(content);
    m = mount({ save: { ...n, pity: { ...n.pity, opened: 3 }, matchesPlayed: 4, capsules: { ...n.capsules, dailyBank: 2 } }, routes: [{ id: 'capsules' }] });
    expect(text(m.q('[data-testid="supply"]')!)).toContain('Supply Capsule: 2 more matches');
    m.unmount();
    m = mount({ save: { ...n, pity: { ...n.pity, opened: 3 }, capsules: { ...n.capsules, dailyBank: 0 } }, routes: [{ id: 'capsules' }] });
    expect(m.q('[data-testid="supply"]')).toBeNull();
  });

  it('shows the War Chest bar where the weekly quest was, and only 3 active quests (A15.5, A15.13)', () => {
    const mid = midGameSave(content);
    const extra = [...mid.quests.daily, ...mid.quests.daily].map((q) => ({ ...q, claimed: false }));
    m = mount({ save: { ...mid, quests: { ...mid.quests, daily: extra, weekly: { ...mid.quests.weekly, progress: 13 } } }, routes: [{ id: 'progress' }] });
    expect(text(m.q('[data-testid="war-chest"]')!)).toContain(`War Chest 13/${content.quests.weekly.target}`);
    expect(m.qa('[data-testid^="quest-"][data-testid$="0"], [data-testid="quest-1"], [data-testid="quest-2"]').length).toBeGreaterThan(0);
    expect(m.q('[data-testid="quest-3"]')).toBeNull();
    expect(text(m.q('[data-testid="home-quests"]')!)).toContain('Holds up to 21. When full, it stops filling.');
  });

  it('the capsule info panel states each bank cap and that nothing earned is taken away (A15.3)', () => {
    m = mount({ state: 'mid', routes: [{ id: 'capsules' }] });
    m.click('[data-testid="odds-open"]');
    const info = text(m.q('[data-testid="capsule-info"]')!);
    expect(info).toContain('When full, it stops filling.');
    expect(text(m.q('[data-testid="odds-modal"]')!)).toContain('Nothing you have earned is ever taken away.');
  });
});

describe('Mode select', () => {
  it('offers only the arena formats and locks Conquest and Skirmish for a new player', () => {
    m = mount({ save: { ...newPlayerSave(content), matchesPlayed: 0 }, routes: [{ id: 'home' }, { id: 'modeSelect' }] });
    expect(m.q('[data-testid="ladder-format"]')).toBeNull();
    expect(m.q('[data-testid="conquest-open"]')).toBeNull();
    expect(m.q('[data-testid="skirmish-open"]')).toBeNull();
    expect(text(m.q('[data-testid="mode-conquest"]')!)).toContain('Unlocks in Arena 3');
  });

  it('sets up a Skirmish with Echo, difficulty, format, speed and standard levels', () => {
    m = mount({ state: 'mid', routes: [{ id: 'home' }, { id: 'modeSelect' }] });
    m.click('[data-testid="skirmish-open"]');
    m.click('[data-testid="skirmish-general-echo"]');
    const expert = m.qa('[data-testid="skirmish-difficulty"] [role="radio"]').find((el) => text(el).startsWith('Expert'))!;
    flush(() => expert.click());
    m.click('[data-testid="skirmish-standard"]');
    m.click('[data-testid="skirmish-start"]');
    expect(calls('prepareMatch')[0]!.args[0]).toEqual({
      mode: 'skirmish',
      options: { generalId: 'echo', tier: 8, format: 'short', standardLevels: true },
      speed: 1,
    });
    // The pick is remembered for the next visit (Quick Battle and Skirmish share it).
    expect(m.save.value.flags['ui-difficulty.expert']).toBe(true);
  });

  it('Quick Battle: five difficulties with their AI tier, Normal by default (owner feedback 2026-09-28)', () => {
    m = mount({ save: { ...newPlayerSave(content), matchesPlayed: 1, flags: {} }, routes: [{ id: 'home' }, { id: 'modeSelect' }] });
    const radios = m.qa('[data-testid="quick-difficulty"] [role="radio"]');
    expect(radios.map((el) => text(el).split(/\s|Tier/)[0])).toEqual(['Easy', 'Normal', 'Hard', 'Expert', 'Legendary']);
    expect(text(m.q('[data-testid="quick-difficulty"] [aria-checked="true"]')!)).toContain('Normal');
    expect(text(m.q('[data-testid="quick-opponent"]')!)).toContain('Tier IV');
    const legendary = radios.find((el) => text(el).startsWith('Legendary'))!;
    flush(() => legendary.click());
    expect(text(m.q('[data-testid="quick-opponent"]')!)).toContain('Tier X');
    m.click('[data-testid="quick-start"]');
    expect(calls('prepareMatch')[0]!.args[0]).toMatchObject({ mode: 'skirmish', options: { tier: 10, format: 'short', standardLevels: false } });
  });

  it('notes the ages that still wait for their Anti-armor card (A3)', () => {
    const n = { ...newPlayerSave(content), matchesPlayed: 3 };
    m = mount({ save: n, routes: [{ id: 'home' }, { id: 'modeSelect' }] });
    m.click('[data-testid="skirmish-open"]');
    expect(m.q('[data-testid^="skirmish-note-"]')).toBeNull();
    const full = m.qa('[data-testid="skirmish-setup"] [role="radio"]').find((el) => text(el) === 'Full War')!;
    flush(() => full.click());
    expect(m.qa('[data-testid^="skirmish-note-"]').map((el) => el.getAttribute('data-testid'))).toEqual([
      'skirmish-note-industrial',
      'skirmish-note-modern',
      'skirmish-note-future',
    ]);
  });

  it('refuses to start with a War Plan below the minimum to play and opens the builder (A3)', () => {
    const save = midGameSave(content);
    const plan = save.warPlans[0]!;
    save.warPlans[0] = { ...plan, loadouts: { ...plan.loadouts, medieval: { ...plan.loadouts.medieval, turrets: [null, null] } } };
    m = mount({ save, routes: [{ id: 'home' }, { id: 'modeSelect' }] });
    m.click('[data-testid="ladder-start"]');
    expect(calls('prepareMatch')).toHaveLength(0);
    expect(m.router.current.value.id).toBe('modeSelect');
    const dialog = m.q('[data-testid="plan-blocked"]')!;
    expect(text(dialog)).toContain("Your War Plan can't play Full War yet:");
    expect(text(dialog)).toContain('Medieval Age needs a turret.');
    m.click('[data-testid="plan-blocked-fix"]');
    expect(m.router.current.value).toEqual({ id: 'warPlan', age: 'medieval' });
  });

  it('warnings never block a match (A3)', () => {
    const save = midGameSave(content);
    const plan = save.warPlans[0]!;
    const medieval = { ...plan.loadouts.medieval, units: [plan.loadouts.medieval.units[0]!, plan.loadouts.medieval.units[1]!, plan.loadouts.medieval.units[2]!, null, null] };
    save.warPlans[0] = { ...plan, loadouts: { ...plan.loadouts, medieval } };
    m = mount({ save, routes: [{ id: 'home' }, { id: 'modeSelect' }] });
    m.click('[data-testid="ladder-start"]');
    expect(m.q('[data-testid="plan-blocked"]')).toBeNull();
    expect(m.router.current.value.id).toBe('vs');
  });

  it('starts the Daily Challenge', () => {
    m = mount({ state: 'mid', routes: [{ id: 'home' }, { id: 'modeSelect' }] });
    expect(text(m.q('[data-testid="daily-modifier"]')!)).toContain('Gold Rush');
    m.click('[data-testid="daily-difficulty"] [aria-checked="false"]');
    m.click('[data-testid="daily-start"]');
    const req = calls('prepareMatch')[0]!.args[0] as { mode: string; difficulty: string };
    expect(req.mode).toBe('daily');
    expect(['recruit', 'veteran', 'warlord']).toContain(req.difficulty);
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

describe('VS personality', () => {
  it("shows a procedural commander's personality", () => {
    m = mount({
      routes: [{ id: 'home' }, { id: 'vs', request: fixtureRequest('commander'), opponent: fixtureOpponent(content, 'commander') }],
    });
    const foe = text(m.q('[data-testid="vs-foe"]')!);
    expect(foe).toContain(i18nText(content.generals.list.kettle.personalityKey));
    // The quote line belongs to the named General, not to a commander.
    expect(m.q('[data-testid="vs-line"]')).toBeNull();
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
    // A15.13: trophies, the main reward and one progress bar; the rest in one summary row.
    expect(m.qa('.result-reward').length).toBe(3);
    expect(m.q('[data-testid="result-skip"]')).toBeNull();
    expect(m.q('[data-testid="result-summary"]')).not.toBeNull();
    m.click('[data-testid="result-summary-toggle"]');
    expect(m.qa('.result-reward').length).toBe(6);
  });

  it('shows everything at once with reduce motion', () => {
    const first = mount({ state: 'mid' });
    const save = first.save.value;
    first.unmount();
    m = mount({ save: { ...save, settings: { ...save.settings, reduceMotion: true } }, routes: route() });
    expect(m.qa('.result-reward').length).toBe(3);
    expect(m.q('[data-testid="ui-root"]')!.getAttribute('data-reduce-motion')).toBe('true');
  });

  it('hides "Open capsule" once the earned capsule has been opened', () => {
    const save = midGameSave(content);
    save.capsules.pending = save.capsules.pending.filter((c) => c.id !== 'cap-mid-1');
    m = mount({ save, routes: route() });
    expect(m.q('[data-testid="result-open"]')).toBeNull();
    expect(m.q('[data-testid="result-next"]')).not.toBeNull();
  });

  it('replays and starts the next battle of the same mode', () => {
    m = mount({ routes: route() });
    // A ladder win with a capsule: Open capsule is the primary, Next battle one tap away (4.9).
    expect(m.q('[data-testid="result-open"]')!.getAttribute('data-primary')).toBe('');
    expect(m.q('[data-testid="result-next"]')!.getAttribute('data-primary')).toBeNull();
    m.click('[data-testid="result-replay"]');
    expect(calls('watchReplay')[0]!.args).toEqual([0]);
    m.click('[data-testid="result-next"]');
    expect(calls('prepareMatch')[0]!.args[0]).toEqual({ mode: 'ladder', format: 'standard' });
    expect(m.router.stack.value.map((e) => e.route.id)).toEqual(['home', 'vs']);
  });

  it('opens the earned capsule, and after it the Result continues its path instead of coming back (2.5)', () => {
    m = mount({ routes: route() });
    m.click('[data-testid="result-open"]');
    expect(calls('openCapsule')[0]!.args).toEqual(['cap-mid-1']);
    // The capsule is opened; the Result goes on to the next battle of the same mode.
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

describe('Army: the deck builder (ui-plan 4.2, 6.6; owner request 2026-09-30)', () => {
  const stone = () => m!.save.value.warPlans[m!.save.value.activePlan]!.loadouts.stone;
  const army = (): Mounted => mount({ state: 'mid', routes: [{ id: 'home' }, { id: 'warPlan', age: 'stone' }] });
  /** The section a card sits in: 'battle' (a slot), 'free' (Available), 'locked', or ''. */
  const sectionOf = (id: string): string => {
    if (m!.q(`[data-testid="army-battle"] [data-card-id="${id}"]`)) return 'battle';
    if (m!.q(`[data-testid="army-group-free"] [data-army-cell="${id}"]`)) return 'free';
    if (m!.q(`[data-testid="army-group-locked"] [data-army-cell="${id}"]`)) return 'locked';
    return '';
  };

  it('equips with a card and Use (2 taps); a filled slot is removed from its own bar', () => {
    m = army();
    expect(stone().units[4]).toBe('drum_shaman');
    m.click('[data-testid="slot-unit-4"] .ui-card');
    expect(m.q('[data-testid="slot-actions"]')).not.toBeNull();
    m.click('[data-testid="remove-unit-4"]');
    expect(stone().units[4]).toBeNull();
    // Tap a card: it lifts and its bar offers Use and Info; Use takes the first empty slot.
    m.click('[data-testid="cand-mammoth_matriarch"]');
    expect(m.q('[data-testid="card-actions"]')).not.toBeNull();
    expect(m.q('[data-testid="card-info"]')).not.toBeNull();
    m.click('[data-testid="card-use"]');
    expect(stone().units[4]).toBe('mammoth_matriarch');
    expect(m.q('[data-testid="card-actions"]')).toBeNull();
    // The card left Available and sits in the In battle band (U4).
    expect(sectionOf('mammoth_matriarch')).toBe('battle');
    expect(m.q('[data-testid="cand-mammoth_matriarch"]')).toBeNull();
  });

  it('shows three sections top to bottom: In battle, Available, Locked; an equip moves a card between them', () => {
    m = army();
    const band = m.q('[data-testid="army-battle"]')!;
    const free = m.q('[data-testid="army-group-free"]')!;
    const locked = m.q('[data-testid="army-group-locked"]')!;
    expect(band).not.toBeNull();
    expect(free).not.toBeNull();
    expect(locked).not.toBeNull();
    // Every card in the Stone loadout is in the band and nowhere else; the pool holds the rest.
    const inArmy = [...stone().units, ...stone().turrets, stone().powers.home].filter((c): c is string => !!c);
    for (const id of inArmy) expect(sectionOf(id), id).toBe('battle');
    for (const id of inArmy) expect(m.q(`[data-army-cell="${id}"]`), id).toBeNull();
    expect(sectionOf('mammoth_matriarch')).toBe('free');
    // Counts per section (recognition over recall).
    const troops = stone().units.filter((u) => !!u).length;
    expect(text(m.q('[data-testid="band-unit"]')!)).toBe(`Troops ${troops}/6`);
    expect(text(free.querySelector('.army-sec-title') as FakeElement)).toMatch(/^Available · \d+$/);
    expect(text(m.q('[data-testid="army-owned-count"]')!)).toMatch(/All 17 Stone cards found!|You own \d+ of 17 Stone cards/);
    m.click('[data-testid="slot-unit-4"] .ui-card');
    m.click('[data-testid="remove-unit-4"]');
    expect(sectionOf('drum_shaman')).toBe('free');
    expect(text(m.q('[data-testid="band-unit"]')!)).toBe(`Troops ${troops - 1}/6`);
    m.click('[data-testid="cand-mammoth_matriarch"]');
    m.click('[data-testid="card-use"]');
    expect(sectionOf('mammoth_matriarch')).toBe('battle');
    expect(sectionOf('drum_shaman')).toBe('free');
  });

  it('shows the cards not found yet as locked silhouettes with where they come from', () => {
    m = mount({
      state: 'new',
      routes: [{ id: 'home' }, { id: 'warPlan', age: 'stone' }],
    });
    expect(sectionOf('mammoth_matriarch')).toBe('locked');
    expect(m.q('[data-testid="cand-mammoth_matriarch"]')!.getAttribute('class')).toContain('is-locked');
    expect(text(m.q('[data-testid="src-mammoth_matriarch"]')!)).toBe('Time Capsules');
    expect(text(m.q('[data-testid="army-owned-count"]')!)).toMatch(/You own \d+ of 17 Stone cards/);
    // A locked card says so and offers Info; it cannot be used.
    m.click('[data-testid="cand-mammoth_matriarch"]');
    expect(m.q('[data-testid="card-use"]')).toBeNull();
    expect(text(m.q('[data-testid="card-actions"]')!)).toContain('Not found yet');
  });

  it('tap-tap both ways: a selected card goes into the tapped slot, a selected slot takes the tapped card', () => {
    m = army();
    m.click('[data-testid="cand-mammoth_matriarch"]');
    // The slots it fits light up green (U5).
    expect(m.q('[data-drop="unit-0"]')!.getAttribute('class')).toContain('is-drop-valid');
    expect(m.q('[data-drop="turret-0"]')!.getAttribute('class')).not.toContain('is-drop-valid');
    const was = stone().units[0]!;
    m.click('[data-testid="slot-unit-0"] .ui-card');
    expect(stone().units[0]).toBe('mammoth_matriarch');
    // The card it replaced goes back to Available.
    expect(sectionOf(was)).toBe('free');
    // Select a slot first: the pool narrows to what fits, and the tapped card goes in.
    m.click('[data-testid="slot-turret-1"] .ui-card');
    expect(m.q('[data-testid="chip-slot"]')).not.toBeNull();
    expect(m.q('[data-testid="cand-bonker"]')).toBeNull();
    m.click('[data-testid="cand-log_roller"]');
    expect(stone().turrets[1]).toBe('log_roller');
    // Moving a card inside the band swaps two slots: never a duplicate.
    m.click('[data-testid="slot-unit-0"] .ui-card');
    m.click('[data-testid="slot-unit-5"] .ui-card');
    expect(stone().units[5]).toBe('mammoth_matriarch');
    expect(stone().units.filter((u) => u === 'mammoth_matriarch')).toHaveLength(1);
  });

  it('the header Undo reverses every change of this visit, one at a time', () => {
    m = army();
    const before = stone();
    expect(m.q('[data-testid="army-undo"]')!.getAttribute('aria-disabled')).toBe('true');
    m.click('[data-testid="slot-unit-0"] .ui-card');
    m.click('[data-testid="remove-unit-0"]');
    m.click('[data-testid="cand-mammoth_matriarch"]');
    m.click('[data-testid="card-use"]');
    expect(stone().units[0]).toBe('mammoth_matriarch');
    m.click('[data-testid="army-undo"]');
    expect(stone().units[0]).toBeNull();
    m.click('[data-testid="army-undo"]');
    expect(stone()).toEqual(before);
    expect(m.q('[data-testid="army-undo"]')!.getAttribute('aria-disabled')).toBe('true');
  });

  it('shows advisor warnings for the selected age and marks ages with issues', () => {
    const save = midGameSave(content);
    const plan = save.warPlans[0]!;
    const modern = { ...plan.loadouts.modern, units: ['trench_raider', 'rifleman', 'tankette', null, null] };
    save.warPlans[0] = { ...plan, loadouts: { ...plan.loadouts, modern } };
    m = mount({ save, routes: [{ id: 'home' }, { id: 'warPlan', age: 'modern' }] });
    expect(m.q('[data-testid="issue-onlyThreeUnits"]')).not.toBeNull();
    expect(m.q('[data-testid="issue-noAntiArmor"]')).not.toBeNull();
    // The band's chip is short (the age is the selected tab); the full sentence is its label (review 3).
    expect(text(m.q('[data-testid="issue-noAntiArmor"]')!)).toBe('No anti-heavy');
    expect(m.q('[data-testid="issue-noAntiArmor"] button')!.getAttribute('aria-label')).toBe('Modern Age has no anti-heavy.');
    // The In battle mark agrees with the age tab: "!" while the advisor flags something.
    expect(m.q('[data-testid="army-band-mark"]')!.getAttribute('data-mark')).toBe('warn');
    expect(m.q('[data-testid="age-tab-modern"] .ui-warndot')).not.toBeNull();
    expect(m.q('[data-testid="age-tab-stone"] .ui-warndot')).toBeNull();
    m.click('[data-testid="issue-onlyThreeUnits"] button');
    expect(m.q('[data-testid="army-advice-sheet"]')).not.toBeNull();
  });

  it('auto-fills with one short line, and switches the army in use from the presets panel', () => {
    m = army();
    m.click('[data-testid="auto-fill"]');
    expect(calls('autoFill')).toHaveLength(1);
    expect(m.save.value.warPlans[0]!.name).toBe('Rush');
    expect(m.qa('[data-testid="toast"]')).toHaveLength(1);
    m.click('[data-testid="army-presets"]');
    m.click('[data-testid="preset-1"]');
    expect(m.save.value.activePlan).toBe(1);
    expect(m.q('[data-testid="plan-in-use"]')).not.toBeNull();
  });

  it('presets are added in order: choosing C first stores B too (meta.setWarPlan)', () => {
    const save = { ...midGameSave(content) };
    save.warPlans = [save.warPlans[0]!];
    m = mount({ save, routes: [{ id: 'home' }, { id: 'warPlan', age: 'stone' }] });
    m.click('[data-testid="army-presets"]');
    m.click('[data-testid="preset-2"]');
    expect(calls('setWarPlan:rejected')).toHaveLength(0);
    expect(m.save.value.warPlans.map((p) => p.name)).toEqual(['Rush', 'B', 'C']);
    expect(m.save.value.activePlan).toBe(2);
  });

  it('renames the army in use', () => {
    m = army();
    m.click('[data-testid="army-presets"]');
    m.click('[data-testid="rename"]');
    const field = m.q('[data-testid="rename-plan"] input')!;
    flush(() => input(field, 'Blitz'));
    m.click('[data-testid="rename-save"]');
    expect(m.save.value.warPlans[0]!.name).toBe('Blitz');
  });

  it('Info opens Card detail; Upgrade opens it with the upgrade already armed', () => {
    m = army();
    // An owned Stone card in Available whose copies are ready for the next level.
    const ready = Array.from(m.qa('[data-testid="army-group-free"] [data-army-cell]'))
      .map((el) => el.getAttribute('data-army-cell')!)
      .find((id) => m!.q(`[data-army-cell="${id}"] .ui-card.is-ready`));
    expect(ready).toBeTruthy();
    m.click(`[data-testid="cand-${ready}"]`);
    m.click('[data-testid="card-upgrade"]');
    expect(m.router.current.value).toEqual({ id: 'cardDetail', card: ready, upgrade: true });
    expect(text(m.q('[data-testid="card-upgrade-btn"]')!)).toContain('Confirm');
    flush(() => m!.router.back());
    // Info from a slot in the band.
    const first = stone().units[0]!;
    m.click('[data-testid="slot-unit-0"] .ui-card');
    m.click('[data-testid="slot-info"]');
    expect(m.router.current.value).toEqual({ id: 'cardDetail', card: first });
  });

  it('opens the Card Album at the age from the header (with its count) and from Locked (review 2)', () => {
    m = army();
    const head = m.q('[data-testid="army-album-head"]')!;
    expect(text(head)).toMatch(/^\d+\/\d+$/);
    expect(head.getAttribute('aria-label')).toMatch(/Card Album \d+\/\d+/);
    m.click('[data-testid="army-album-head"]');
    expect(m.router.current.value).toEqual({ id: 'collection', tab: 'cards', age: 'stone' });
    m = mount({ state: 'new', routes: [{ id: 'home' }, { id: 'warPlan', age: 'stone' }] });
    m.click('[data-testid="army-album"]');
    expect(m.router.current.value).toEqual({ id: 'collection', tab: 'cards', age: 'stone', own: 'missing' });
  });

  it('marks In battle with a check only when every slot is filled and nothing is flagged (review 3)', () => {
    m = army();
    const full = stone().units.every((u) => !!u) && stone().turrets.every((u) => !!u);
    expect(m.q('[data-testid="army-band-mark"]')!.getAttribute('data-mark')).toBe(full ? 'ok' : 'open');
    m.click('[data-testid="slot-unit-0"] .ui-card');
    m.click('[data-testid="remove-unit-0"]');
    expect(m.q('[data-testid="army-band-mark"]')!.getAttribute('data-mark')).not.toBe('ok');
  });

  it('shows only reached ages and says how the rest unlock', () => {
    const save = newPlayerSave(content);
    m = mount({ save, routes: [{ id: 'home' }, { id: 'warPlan' }] });
    const tabs = m.qa('[data-testid="age-picker"] [role="tab"]');
    expect(tabs.length).toBeLessThan(content.order.ages.length);
    expect(m.q('[data-testid="army-more-ages"]')).not.toBeNull();
  });
});

describe('Collection and card detail', () => {
  it('the Card Album lists every card by age, numbered, and filters by Have / Missing, rarity and class', () => {
    m = mount({ state: 'mid', routes: [{ id: 'home' }, { id: 'collection' }] });
    const cards = () => m!.qa('[data-testid="dex"] .dex-tile').length;
    expect(cards()).toBe(136);
    expect(m.qa('[data-testid="dex"] .dex-age')).toHaveLength(content.order.ages.length);
    expect(text(m.q('[data-testid="dex-bonker"] .dex-tile__no')!)).toBe('No. 001');
    const missing = m.qa('[data-testid="dex"] .dex-tile.is-missing').length;
    expect(missing).toBeGreaterThan(0);
    expect(text(m.q('[data-testid="dex-total"]')!)).toContain(`${136 - missing}/136 found`);
    // Missing only: every tile left is a "?" silhouette with its source.
    flush(() => (m!.qa('[data-testid="dex-own"] [role="radio"]')[2] as FakeElement).click());
    expect(cards()).toBe(missing);
    expect(m.qa('[data-testid="dex"] .dex-tile__src').length).toBe(missing);
    // Every card again, then Legendary only (the Filters sheet).
    flush(() => (m!.qa('[data-testid="dex-own"] [role="radio"]')[0] as FakeElement).click());
    m.click('[data-testid="dex-filters"]');
    flush(() => (m!.qa('[data-testid="dex-rarity"] [role="radio"]')[4] as FakeElement).click());
    expect(cards()).toBe(8);
    m.click('[data-testid="dex-filter-clear"]');
    m.click('[data-testid="dex-class-turret"]');
    expect(cards()).toBe(content.order.turrets.length);
  });

  it('the Progress tab has a Card Album row with the found count (review 2)', () => {
    m = mount({ state: 'mid', routes: [{ id: 'progress' }] });
    expect(text(m.q('[data-testid="progress-album"]')!)).toMatch(/Card Album\s*\d+\/136/);
    m.click('[data-testid="progress-album"]');
    expect(m.router.current.value).toEqual({ id: 'collection', tab: 'cards' });
  });

  it('the Card Album opens at an age, on Missing, when Army asks (review 2)', () => {
    m = mount({ state: 'mid', routes: [{ id: 'home' }, { id: 'collection', tab: 'cards', age: 'bronze', own: 'missing' }] });
    const missing = m.qa('[data-testid="dex"] .dex-tile.is-missing').length;
    expect(m.qa('[data-testid="dex"] .dex-tile').length).toBe(missing);
    expect(m.q('[data-testid="dex-chip-bronze"]')!.getAttribute('aria-current')).toBe('true');
  });

  it('the Card Album shows each age with its completion and a jump chip', () => {
    m = mount({ state: 'new', routes: [{ id: 'home' }, { id: 'collection' }] });
    for (const age of content.order.ages) {
      expect(m.q(`[data-testid="dex-age-${age}"]`), age).not.toBeNull();
      expect(text(m.q(`[data-testid="dex-count-${age}"]`)!)).toMatch(/\d+\/17/);
    expect(m.q(`[data-testid="dex-chip-${age}"]`), age).not.toBeNull();
    }
    expect(m.q('[data-testid="dex-mammoth_matriarch"]')!.getAttribute('class')).toContain('is-missing');
    expect(text(m.q('[data-testid="dex-src-mammoth_matriarch"]')!)).toBe('Time Capsules');
  });

  it('shows silhouettes for unowned cards', () => {
    m = mount({ state: 'new', routes: [{ id: 'home' }, { id: 'collection' }] });
    expect(m.q('[data-testid="card-mammoth_matriarch"]')!.getAttribute('class')).toContain('is-locked');
    expect(m.q('[data-testid="card-mammoth_matriarch"] .ui-art.is-silhouette')).not.toBeNull();
  });

  it('upgrades a ready card in two taps (confirm, then spend) and crafts a missing one the same way', () => {
    m = mount({ state: 'mid', routes: [{ id: 'home' }, { id: 'cardDetail', card: 'pikeman' }] });
    const before = m.save.value.collection['pikeman']!.level;
    const btn = '[data-testid="card-upgrade-btn"]';
    // The Upgrade button lives in the fixed action bar and is the screen's one primary.
    expect(m.q(`[data-testid="action-bar"] ${btn}`)).not.toBeNull();
    expect(m.q(btn)!.getAttribute('data-primary')).toBe('');
    expect(text(m.q(btn)!)).toContain('Upgrade');
    m.click(btn);
    // First tap: the confirm state, nothing spent yet (U10, MR-38b).
    expect(m.save.value.collection['pikeman']!.level).toBe(before);
    expect(text(m.q(btn)!)).toContain('Confirm');
    m.click(btn);
    expect(m.save.value.collection['pikeman']!.level).toBe(before + 1);
    // The ceremony plays on the card (MR-39), not in a toast across the screen.
    expect(m.q('[data-testid="card-stage"]')!.getAttribute('class')).toContain('is-charge');
    // A third fast tap cannot spend again: the button re-arms only after 600 ms (UA-08).
    m.click(btn);
    m.click(btn);
    expect(m.save.value.collection['pikeman']!.level).toBe(before + 1);
    m.unmount();
    m = mount({ state: 'mid', routes: [{ id: 'home' }, { id: 'cardDetail', card: 'friar' }] });
    m.click('[data-testid="card-craft"]');
    expect(m.save.value.currencies.dust).toBe(820);
    m.click('[data-testid="card-craft"]');
    expect(m.save.value.currencies.dust).toBe(820 - content.rarities.cards.rare.craftCopyDust);
  });

  it('opening a NEW card clears its badge', () => {
    m = mount({ state: 'mid', routes: [{ id: 'home' }, { id: 'cardDetail', card: 'gyrocopter' }] });
    expect(calls('markSeen')[0]!.args).toEqual(['gyrocopter']);
    expect(m.save.value.collection['gyrocopter']!.isNew).toBe(false);
  });

  it('a failed craft names the real reason', () => {
    m = mount({
      state: 'mid',
      routes: [{ id: 'home' }, { id: 'cardDetail', card: 'friar' }],
      patch: { craft: () => ({ ok: false, reason: 'maxLevel' }) },
    });
    m.click('[data-testid="card-craft"]');
    m.click('[data-testid="card-craft"]');
    expect(text(m.q('[data-testid="toast"]')!)).toBe("That didn't work. Try again.");
  });

  it('shows the max level for maxed cards and the road source of a locked power', () => {
    m = mount({ state: 'maxed', routes: [{ id: 'home' }, { id: 'cardDetail', card: 'bonker' }] });
    expect(m.q('[data-testid="card-max"]')).not.toBeNull();
    m.unmount();
    m = mount({ state: 'new', routes: [{ id: 'home' }, { id: 'cardDetail', card: 'meteor_shower' }] });
    expect(text(m.q('[data-testid="action-bar"]')!)).toBe('Unlocks on the Trophy Road at 100');
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
    expect(text(sheet.querySelector('[data-testid="odds-aeon-line"]')!)).toBe('Exactly 1 Aeon, 2 Platinum, and 4 Gold in every 200 Win Capsules.');
    expect(text(sheet.querySelector('[data-testid="odds-bag-jade"]')!)).toContain('10 left');
    expect(text(sheet.querySelector('[data-testid="odds-pity-legendary"]')!)).toContain('Next capsule you earn: 45%');
  });
});
