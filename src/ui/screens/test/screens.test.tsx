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
  fixtureOpponent,
  fixturePause,
  fixtureRequest,
  fixtureResult,
  type OpponentFixture,
  type ResultFixture,
} from '../fixtures/matches';
import { SCREEN_COMPONENTS } from '../ScreenHost';
import { text, textNodes } from './dom';
import { mount, PSEUDO, RAW_KEY, type HarnessState, type Mounted } from './harness';

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
  { name: 'modeSelect', screen: 'modeSelect', routes: () => [{ id: 'home' }, { id: 'modeSelect' }] },
  vs('general'),
  vs('commander'),
  vs('warmUp'),
  vs('warden'),
  vs('grogg'),
  vs('daily'),
  vs('echo'),
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
  result('loss'),
  result('draw'),
  result('conquest'),
  result('noCapsule'),
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
];


let m: Mounted | null = null;
afterEach(() => {
  m?.unmount();
  m = null;
});

describe('every WP9 screen renders in every fixture state', () => {
  it('covers all 12 WP9 screens', () => {
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

  it('match history marks every opponent as AI', () => {
    m = mount({ state: 'mid', routes: [{ id: 'home' }, { id: 'profile' }] });
    const rows = m.qa('[data-testid^="history-"]');
    expect(rows.length).toBe(20);
    for (const r of rows) expect(r.querySelector('[data-testid="ai-badge"]')).not.toBeNull();
  });

  it('Home opponent preview and the Conquest board carry the AI badge', () => {
    m = mount({ state: 'mid' });
    expect(m.q('[data-testid="home-opponent"] [data-testid="ai-badge"]')).not.toBeNull();
    m.unmount();
    m = mount({ state: 'mid', routes: [{ id: 'home' }, { id: 'conquest' }] });
    for (const g of m.qa('[data-testid^="cq-gen-"]')) expect(g.querySelector('[data-testid="ai-badge"]')).not.toBeNull();
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
});
