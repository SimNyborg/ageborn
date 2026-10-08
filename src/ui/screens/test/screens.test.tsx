/**
 * DoD (DESIGN C2/WP9): every screen renders with the fake save in the states new player, mid-game
 * and maxed (plus the raw WP0 fake save), with complete EN strings, AI labels where A7.1 asks for
 * them, and no hard-coded UI text.
 */
import { content } from '@/content';
import { i18n } from '@/i18n';
import { afterEach, describe, expect, it } from 'vitest';
import type { Route } from '../../router';
import {
  FIXTURE_PLAYER,
  fixtureOpponent,
  fixturePause,
  fixtureRequest,
  fixtureResult,
  type OpponentFixture,
  type ResultFixture,
} from '../fixtures/matches';
import { SCREEN_COMPONENTS } from '../ScreenHost';
import { text, textNodes } from './dom';
import { mount, PSEUDO, RAW_KEY, saveFor, type HarnessState, type Mounted } from './harness';

const STATES: HarnessState[] = ['new', 'mid', 'maxed', 'raw'];

interface Case {
  name: string;
  screen: string;
  routes: () => Route[];
}

const vs = (o: OpponentFixture): Case => ({
  name: `vs-${o}`,
  screen: 'vs',
  routes: () => [{ id: 'home' }, { id: 'vs', request: fixtureRequest(o), opponent: fixtureOpponent(content, o) }],
});
const result = (r: ResultFixture): Case => ({
  name: `result-${r}`,
  screen: 'result',
  routes: () => [{ id: 'home' }, { id: 'result', info: fixtureResult(content, r) }],
});

export const CASES: Case[] = [
  { name: 'home', screen: 'home', routes: () => [{ id: 'home' }] },
  { name: 'capsules', screen: 'capsules', routes: () => [{ id: 'capsules' }] },
  { name: 'progress', screen: 'progress', routes: () => [{ id: 'progress' }] },
  { name: 'modeSelect', screen: 'modeSelect', routes: () => [{ id: 'home' }, { id: 'modeSelect' }] },
  vs('general'),
  vs('commander'),
  vs('warmUp'),
  vs('warden'),
  vs('grogg'),
  vs('daily'),
  vs('echo'),
  // The ranked Ladder from Home's Battle: the bot shown as the online player it found (owner decision 2026-10-07).
  vs('player'),
  {
    name: 'pause-early',
    screen: 'pause',
    routes: () => [
      { id: 'battle', request: fixtureRequest('general'), opponent: fixtureOpponent(content, 'general') },
      { id: 'pause', info: fixturePause('early') },
    ],
  },
  {
    name: 'pause-skirmish',
    screen: 'pause',
    routes: () => [
      { id: 'battle', request: fixtureRequest('echo'), opponent: fixtureOpponent(content, 'echo') },
      { id: 'pause', info: fixturePause('skirmish') },
    ],
  },
  {
    name: 'pause-tutorial',
    screen: 'pause',
    routes: () => [
      { id: 'battle', request: fixtureRequest('grogg'), opponent: fixtureOpponent(content, 'grogg') },
      { id: 'pause', info: fixturePause('tutorial') },
    ],
  },
  result('win'),
  result('player'),
  result('loss'),
  result('draw'),
  result('conquest'),
  result('noCapsule'),
  { name: 'warPath', screen: 'warPath', routes: () => [{ id: 'home' }, { id: 'warPath' }] },
  { name: 'warPlan', screen: 'warPlan', routes: () => [{ id: 'home' }, { id: 'warPlan' }] },
  { name: 'warPlan-future', screen: 'warPlan', routes: () => [{ id: 'home' }, { id: 'warPlan', age: 'future', plan: 2 }] },
  { name: 'collection', screen: 'collection', routes: () => [{ id: 'home' }, { id: 'collection' }] },
  { name: 'collection-skins', screen: 'collection', routes: () => [{ id: 'home' }, { id: 'collection', tab: 'skins' }] },
  { name: 'card-unit', screen: 'cardDetail', routes: () => [{ id: 'home' }, { id: 'cardDetail', card: 'bonker' }] },
  { name: 'card-legendary', screen: 'cardDetail', routes: () => [{ id: 'home' }, { id: 'cardDetail', card: 'chrono_titan' }] },
  { name: 'card-turret', screen: 'cardDetail', routes: () => [{ id: 'home' }, { id: 'cardDetail', card: 'gravity_well' }] },
  { name: 'card-power', screen: 'cardDetail', routes: () => [{ id: 'home' }, { id: 'cardDetail', card: 'meteor_shower' }] },
  { name: 'trophyRoad', screen: 'trophyRoad', routes: () => [{ id: 'home' }, { id: 'trophyRoad' }] },
  { name: 'profile', screen: 'profile', routes: () => [{ id: 'home' }, { id: 'profile' }] },
  { name: 'settings', screen: 'settings', routes: () => [{ id: 'home' }, { id: 'settings' }] },
  { name: 'conquest', screen: 'conquest', routes: () => [{ id: 'home' }, { id: 'conquest' }] },
  { name: 'customize', screen: 'customize', routes: () => [{ id: 'home' }, { id: 'customize' }] },
  { name: 'customize-look', screen: 'customize', routes: () => [{ id: 'home' }, { id: 'customize', tab: 'look' }] },
  { name: 'customize-emotes', screen: 'customize', routes: () => [{ id: 'home' }, { id: 'customize', tab: 'emotes' }] },
  { name: 'customize-bases', screen: 'customize', routes: () => [{ id: 'home' }, { id: 'customize', tab: 'bases' }] },
  { name: 'customize-flags', screen: 'customize', routes: () => [{ id: 'home' }, { id: 'customize', tab: 'flags' }] },
  { name: 'customize-decorations', screen: 'customize', routes: () => [{ id: 'home' }, { id: 'customize', tab: 'decorations' }] },
  { name: 'customize-quotes', screen: 'customize', routes: () => [{ id: 'home' }, { id: 'customize', tab: 'quotes' }] },
  // PLAN 2d: the Flag Atlas (a lazy chunk: its frame shows at once)
  { name: 'flagAtlas', screen: 'flagAtlas', routes: () => [{ id: 'home' }, { id: 'flagAtlas' }] },
];


let m: Mounted | null = null;
afterEach(() => {
  m?.unmount();
  m = null;
});

describe('every WP9 screen renders in every fixture state', () => {
  it('covers all 17 WP9 screens', () => {
    const covered = new Set(CASES.map((c) => c.screen));
    expect([...covered].sort()).toEqual(Object.keys(SCREEN_COMPONENTS).sort());
  });

  for (const state of STATES) {
    for (const c of CASES) {
      it(`${c.name} (${state})`, () => {
        m = mount({ state, routes: c.routes() });
        const root = m.q('[data-testid="ui-root"]');
        expect(root).not.toBeNull();
        expect(m.q(`[data-screen="${c.screen}"]`)).not.toBeNull();
        const all = text(m.container);
        expect(all.length).toBeGreaterThan(0);
        const raw = RAW_KEY.exec(all);
        expect(raw?.[0] ?? null).toBeNull();
        for (const el of m.qa('[aria-label]')) {
          const label = el.getAttribute('aria-label') ?? '';
          expect(RAW_KEY.exec(label)?.[0] ?? null).toBeNull();
        }
      });
    }
  }
});

describe('no hard-coded UI text (pseudo-locale)', () => {
  /** Text that may appear untranslated: player and plan names from the save, AI commander names,
   * card-free digits and punctuation. Everything with letters must come from i18n. */
  const allowed = (s: string, extra: readonly string[]) => {
    let stripped = s;
    while (/‹[^‹›]*›/.test(stripped)) stripped = stripped.replace(/‹[^‹›]*›/g, '');
    const rest = extra.reduce((acc, x) => acc.split(x).join(''), stripped);
    return !/[A-Za-z]/.test(rest);
  };
  for (const c of CASES) {
    it(c.name, () => {
      m = mount({ state: 'mid', routes: c.routes(), t: PSEUDO });
      const s = m.save.value;
      const extra = [
        s.profile.name,
        ...s.warPlans.map((p) => p.name),
        ...[
          'Brakka Stonejaw',
          'Mossa Flintfist',
          'Ula Ironhide',
          content.names.aiPrefix,
          'Captain Kettle',
          'Mama Moss',
          'Pip Quickstep',
          'You',
          // The ranked Ladder's found online player (owner decision 2026-10-07).
          FIXTURE_PLAYER.name,
        ],
        // Tier numerals (A7.3) are symbols, not words.
        'VIII',
        'VII',
        'III',
        'II',
        'IV',
        'VI',
        'IX',
        'X',
        'V',
        'I',
      ];
      const offenders = textNodes(m.container).filter((node) => !allowed(node, extra));
      expect(offenders).toEqual([]);
    });
  }
});

describe('AI labeling on every surface (A7.1)', () => {
  it('VS shows the AI badge and "AI General"', () => {
    m = mount({ routes: CASES.find((c) => c.name === 'vs-general')!.routes() });
    const foe = m.q('[data-testid="vs-foe"]')!;
    expect(foe.querySelector('[data-testid="ai-badge"]')).not.toBeNull();
    expect(text(foe)).toContain('AI General');
    expect(text(foe)).toContain('Plays by the same rules as you');
  });

  it('VS for a procedural commander still shows the AI badge', () => {
    m = mount({ routes: CASES.find((c) => c.name === 'vs-commander')!.routes() });
    expect(m.q('[data-testid="vs-foe"] [data-testid="ai-badge"]')).not.toBeNull();
    expect(text(m.q('[data-testid="vs-foe"]')!)).toContain('AI · Brakka Stonejaw');
  });

  it('Result shows the AI badge next to the opponent', () => {
    m = mount({ routes: CASES.find((c) => c.name === 'result-win')!.routes() });
    expect(m.q('.result__vs [data-testid="ai-badge"]')).not.toBeNull();
  });

  it('match history marks every AI opponent as AI; a ranked match keeps the online player it showed (owner decision 2026-10-07)', () => {
    m = mount({ state: 'mid', routes: [{ id: 'home' }, { id: 'profile' }] });
    const rows = m.qa('[data-testid^="history-"]');
    expect(rows.length).toBe(20);
    let online = 0;
    for (const r of rows) {
      if (text(r).includes(FIXTURE_PLAYER.name)) {
        online += 1;
        expect(r.querySelector('[data-testid="ai-badge"]')).toBeNull();
      } else expect(r.querySelector('[data-testid="ai-badge"]')).not.toBeNull();
    }
    expect(online).toBe(5);
  });

  it("the level plate, the Level preview, the Conquest board and Home's plate in an AI mode carry the AI badge; the ranked Ladder's plate does not", () => {
    m = mount({ state: 'mid' });
    // The Ladder is online ranked play (owner decision 2026-10-07): a neutral silhouette, no AI label.
    expect(m.q('[data-testid="home-opponent"] [data-testid="ai-badge"]')).toBeNull();
    expect(text(m.q('[data-testid="home-opponent"]')!)).toContain('A player');
    m.unmount();
    const s = saveFor('mid');
    m = mount({ save: { ...s, flags: { ...s.flags, 'ui-homeMode.quick': true } } });
    expect(m.q('[data-testid="home-opponent"] [data-testid="ai-badge"]')).not.toBeNull();
    m.unmount();
    m = mount({ state: 'mid', routes: [{ id: 'home' }, { id: 'warPath' }] });
    expect(m.q('[data-testid="level-plate"] [data-testid="ai-badge"]')).not.toBeNull();
    m.click('[data-testid="level-plate"]');
    expect(m.q('[data-testid="level-preview"] [data-testid="ai-badge"]')).not.toBeNull();
    m.unmount();
    m = mount({ state: 'mid', routes: [{ id: 'home' }, { id: 'conquest' }] });
    for (const g of m.qa('[data-testid^="cq-gen-"]')) expect(g.querySelector('[data-testid="ai-badge"]')).not.toBeNull();
  });

  it('every General in the Skirmish picker carries the AI badge', () => {
    m = mount({ state: 'mid', routes: [{ id: 'home' }, { id: 'modeSelect', focus: 'skirmish' }] });
    const gens = m.qa('[data-testid^="skirmish-general-"]');
    expect(gens.length).toBeGreaterThan(8);
    for (const g of gens) expect(g.querySelector('[data-testid="ai-badge"]')).not.toBeNull();
  });

  it('Settings > About says all opponents are AI', () => {
    m = mount({ routes: [{ id: 'home' }, { id: 'settings' }] });
    expect(text(m.q('[data-testid="about-ai"]')!)).toBe('All opponents in this version are AI.');
  });

  it('Mode select carries the difficulty help text', () => {
    m = mount({ routes: [{ id: 'home' }, { id: 'modeSelect' }] });
    expect(text(m.q('[data-testid="mode-ladder"]')!)).toContain('Opponent difficulty adapts to your recent results.');
  });
});

describe('the ranked Ladder shown as online play (owner decision 2026-10-07)', () => {
  it('VS shows the found player like the player: banner, avatar, Player chip, trophies, arena, bars and flag; no AI label', () => {
    m = mount({ routes: CASES.find((c) => c.name === 'vs-player')!.routes() });
    const foe = m.q('[data-testid="vs-foe"]')!;
    expect(text(foe)).toContain(FIXTURE_PLAYER.name);
    expect(foe.querySelector('[data-testid="player-chip"]')).not.toBeNull();
    expect(foe.querySelector('[data-testid="ai-badge"]')).toBeNull();
    expect(text(foe)).not.toContain('AI General');
    expect(text(foe)).not.toContain('Plays by the same rules as you');
    expect(foe.querySelector('.vs__personality')).toBeNull();
    expect(foe.querySelector('[data-testid="vs-line"]')).toBeNull();
    expect(text(foe)).toContain('1,064');
    expect(text(foe)).toContain('Arena 4');
    expect(m.q('[data-testid="vs-bars-foe"]')).not.toBeNull();
    expect(m.q('[data-testid="vs-flags-foe"]')).not.toBeNull();
    // The mode reads Ranked, and the VS starts by itself (no "Tap to start now").
    expect(text(m.q('.vs__strip')!)).toContain('Ranked');
    expect(text(m.q('.vs__strip')!)).not.toContain('Tap to start now');
  });

  it('the Result names the found player with the Player chip, no AI label', () => {
    m = mount({ routes: CASES.find((c) => c.name === 'result-player')!.routes() });
    const vs = m.q('.result__vs')!;
    expect(text(vs)).toContain(`vs ${FIXTURE_PLAYER.name}`);
    expect(vs.querySelector('[data-testid="player-chip"]')).not.toBeNull();
    expect(vs.querySelector('[data-testid="ai-badge"]')).toBeNull();
  });

  it('every other mode keeps its AI labels exactly as before', () => {
    for (const o of ['general', 'commander', 'warmUp', 'warden', 'grogg', 'daily', 'echo'] as const) {
      m = mount({ routes: CASES.find((c) => c.name === `vs-${o}`)!.routes() });
      expect(m.q('[data-testid="vs-foe"] [data-testid="ai-badge"]'), o).not.toBeNull();
      expect(m.q('[data-testid="vs-foe"] [data-testid="player-chip"]'), o).toBeNull();
      m.unmount();
    }
    for (const r of ['win', 'loss', 'conquest'] as const) {
      m = mount({ routes: CASES.find((c) => c.name === `result-${r}`)!.routes() });
      expect(m.q('.result__vs [data-testid="ai-badge"]'), r).not.toBeNull();
      m.unmount();
    }
    m = null;
  });
});

describe('VS disclosures (A7.1, A6.3, A7.4)', () => {
  it('shows warm-up, boss and training disclosures and daily modifiers', () => {
    m = mount({ routes: CASES.find((c) => c.name === 'vs-warmUp')!.routes() });
    expect(m.q('[data-testid="vs-warmup"]')).not.toBeNull();
    m.unmount();
    m = mount({ routes: CASES.find((c) => c.name === 'vs-warden')!.routes() });
    expect(text(m.q('[data-testid="vs-disclosures"]')!)).toBe(i18n.t('general.warden.disclosure'));
    m.unmount();
    m = mount({ routes: CASES.find((c) => c.name === 'vs-grogg')!.routes() });
    expect(text(m.q('[data-testid="vs-disclosures"]')!)).toBe(i18n.t('general.grogg.disclosure'));
    m.unmount();
    m = mount({ routes: CASES.find((c) => c.name === 'vs-daily')!.routes() });
    expect(m.q('[data-testid="vs-mod-gold_rush"]')).not.toBeNull();
  });

  it('shows the plan level against the AI level', () => {
    m = mount({ state: 'maxed', routes: CASES.find((c) => c.name === 'vs-general')!.routes() });
    expect(text(m.q('[data-testid="vs-plan-level"]')!)).toBe('Plan Lv 10.0');
    expect(text(m.q('[data-testid="vs-ai-level"]')!)).toBe('Lv 4');
  });

  it('the Daily Challenge shows both sides at L7, not the owned plan level (A9.1)', () => {
    m = mount({ state: 'new', routes: CASES.find((c) => c.name === 'vs-daily')!.routes() });
    expect(text(m.q('[data-testid="vs-plan-level"]')!)).toBe('Plan Lv 7.0');
    expect(text(m.q('[data-testid="vs-ai-level"]')!)).toBe('Lv 7');
    expect(m.q('[data-testid="vs-standard"]')).not.toBeNull();
  });
});
