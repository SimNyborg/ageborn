/**
 * The screens against the real meta rules (WP7) instead of the preview fixtures: a real new save,
 * real advisor findings, real opponents for every mode and real reward lists. This catches drift
 * between what meta writes (save encodings, message keys, opponent ids and disclosure keys, reward
 * steps) and what the screens read, which the fixture tests alone cannot see.
 *
 * Tests may import meta (test files are exempt from the layer rule); the screens themselves never do.
 */
import { content } from '@/content';
import type { Clock, MatchResultInput, OpponentSpec, SaveDoc } from '@/contracts';
import { flattenStrings } from '@/i18n';
import { createMeta, META_FLAGS, type WarPlan } from '@/meta';
import { afterEach, describe, expect, it } from 'vitest';
import uiStrings from '../../../i18n/ui.en.json';
import type { MatchRequest, Route } from '../../router';
import { fixtureStats } from '../fixtures/matches';
import { FIXTURE_NOW } from '../fixtures/saves';
import type { UiServices } from '../services';
import { text } from './dom';
import { mount, rawKeyIn, type Mounted } from './harness';

const meta = createMeta(content);
const clock: Clock = { now: () => FIXTURE_NOW };
const table = flattenStrings(uiStrings);

let m: Mounted | null = null;
afterEach(() => {
  m?.unmount();
  m = null;
});

/** A save after the onboarding: Home is open, the ladder has been played once. */
function playedSave(): SaveDoc {
  const s = meta.newSave(content, clock, 4821);
  return { ...s, matchesPlayed: 3, flags: { ...s.flags, [META_FLAGS.ladderPlayed]: true } };
}

/** `UiServices` queries answered by the real meta rules (actions stay the preview ones). */
function metaQueries(save: () => SaveDoc): Partial<UiServices> {
  const request = (req: MatchRequest): OpponentSpec => {
    const s = save();
    switch (req.mode) {
      case 'ladder':
        return meta.pickOpponent(s, 'ladder', content, clock, { format: req.format });
      case 'conquest':
        return meta.pickOpponent(s, 'conquest', content, clock, { conquestGeneral: req.general });
      case 'skirmish':
        return meta.pickOpponent(s, 'skirmish', content, clock, { skirmish: req.options });
      case 'daily':
        return meta.pickOpponent(s, 'daily', content, clock);
      case 'tutorial':
        return meta.pickOpponent(req.match === 1 ? s : { ...s, matchesPlayed: 1 }, 'tutorial', content, clock);
      case 'warPath':
        return meta.pickOpponent(s, 'warPath', content, clock, { warPath: { level: req.level, difficulty: req.difficulty } });
    }
  };
  return {
    previewOpponent: (format) => meta.pickOpponent(save(), 'ladder', content, clock, format ? { format } : {}),
    dailyModifier: () => meta.dailyModifier(content, clock),
    validatePlan: (plan, format) => meta.validatePlan(plan, save(), content, format),
    autoFill: () => meta.autoFill(save(), content),
    prepareMatch: request,
  };
}

function mountWithMeta(save: SaveDoc, routes: Route[]): Mounted {
  let current = save;
  const mounted = mount({ save, routes, patch: metaQueries(() => current) });
  current = mounted.save.value;
  return mounted;
}

describe('screens render a real meta save without raw keys', () => {
  const routes: Route[][] = [
    [{ id: 'home' }],
    [{ id: 'home' }, { id: 'modeSelect' }],
    [{ id: 'home' }, { id: 'warPlan' }],
    [{ id: 'home' }, { id: 'collection' }],
    [{ id: 'home' }, { id: 'collection', tab: 'skins' }],
    [{ id: 'home' }, { id: 'cardDetail', card: 'spear_hunter' }],
    [{ id: 'home' }, { id: 'trophyRoad' }],
    [{ id: 'home' }, { id: 'profile' }],
    [{ id: 'home' }, { id: 'settings' }],
    [{ id: 'home' }, { id: 'conquest' }],
  ];
  for (const r of routes) {
    const name = r[r.length - 1]!.id;
    it(`${name} (new meta save)`, () => {
      m = mountWithMeta(meta.newSave(content, clock, 7), r);
      expect(m.q(`[data-screen="${name}"]`)).not.toBeNull();
      expect(rawKeyIn(m.container)).toBeNull();
    });
    it(`${name} (after onboarding)`, () => {
      m = mountWithMeta(playedSave(), r);
      expect(rawKeyIn(m.container)).toBeNull();
    });
  }
});

describe('War Plan advisor findings from meta (A3)', () => {
  /** Plans that trigger every finding `meta.validatePlan` can report. */
  function brokenPlans(s: SaveDoc): WarPlan[] {
    const base = s.warPlans[0]!;
    const stone = base.loadouts.stone;
    const med = base.loadouts.medieval;
    const gun = base.loadouts.gunpowder;
    return [
      // duplicate, wrongAge, unknownCard, badPower, tooFewUnits, noTurret
      {
        ...base,
        loadouts: {
          ...base.loadouts,
          stone: { units: ['bonker', 'bonker', 'footman', 'no_such_card', null], turrets: [null, null], powers: { home: 'arrow_storm', field: null } },
        },
      },
      // badShape, notOwned (Stone), onlyThreeUnits and noAntiArmor (Medieval), noAir (Gunpowder)
      {
        ...base,
        loadouts: {
          ...base.loadouts,
          stone: { ...stone, units: [...stone.units.slice(0, 3), 'mammoth_matriarch'] },
          medieval: { ...med, units: [med.units[0]!, med.units[1]!, med.units[2]!, null, null] },
          gunpowder: { ...gun, units: gun.units.map((u) => (u && content.units[u]?.attacks.some((a) => a.hitsAir) ? null : u)), turrets: [null, null] },
        },
      },
      // noSplash: only single-target cards
      {
        ...base,
        loadouts: Object.fromEntries(
          Object.entries(base.loadouts).map(([age, l]) => [age, { ...l, units: l.units.map(() => null), turrets: l.turrets.map(() => null) }]),
        ) as WarPlan['loadouts'],
      },
    ];
  }

  it('every finding has a UI string', () => {
    const s = playedSave();
    const found = new Map<string, string>();
    for (const plan of brokenPlans(s)) {
      for (const f of ['short', 'standard', 'full'] as const) {
        for (const i of meta.validatePlan(plan, s, content, f)) found.set(i.code, i.messageKey);
      }
    }
    expect([...found.keys()].sort()).toEqual(
      [
        'badPower',
        'badShape',
        'duplicate',
        'noAir',
        'noAntiArmor',
        'noSplash',
        'noTurret',
        'notOwned',
        'onlyThreeUnits',
        'tooFewUnits',
        'unknownCard',
        'wrongAge',
      ].sort(),
    );
    const missing = [...found.values()].filter((k) => !(k in table));
    expect(missing).toEqual([]);
  });

  // The advisor's warnings arrive with War Path level 3 (ui-plan 2.6); these saves are past it.
  const seasoned = (s: SaveDoc): SaveDoc => ({ ...s, warPath: { ...s.warPath, legacy: true } });

  it('the builder shows them as text', () => {
    const s = seasoned(playedSave());
    const broken = brokenPlans(s)[0]!;
    m = mountWithMeta({ ...s, warPlans: [broken] }, [{ id: 'home' }, { id: 'warPlan', age: 'stone' }]);
    const advisor = m.q('[data-testid="advisor"]')!;
    expect(advisor.querySelectorAll('li').length).toBeGreaterThanOrEqual(4);
    expect(rawKeyIn(advisor)).toBeNull();
    expect(text(m.q('[data-testid="issue-duplicate"]')!)).toBe('Same card twice');
    expect(m.q('[data-testid="issue-duplicate"] button')!.getAttribute('aria-label')).toBe('Stone Age holds the same card twice.');
  });

  it('an unknown future finding still reads as text', () => {
    const s = seasoned(playedSave());
    m = mount({
      save: s,
      routes: [{ id: 'home' }, { id: 'warPlan' }],
      patch: { validatePlan: () => [{ age: 'stone', severity: 'warning', code: 'brandNew', messageKey: 'ui.advisor.brandNew' }] },
    });
    expect(text(m.q('[data-testid="issue-brandNew"]')!)).toBe('Stone Age loadout needs a look.');
  });
});

describe('VS with real opponents (A7.1 labels, disclosures)', () => {
  const requests: [string, MatchRequest, (s: SaveDoc) => SaveDoc][] = [
    ['tutorial 1', { mode: 'tutorial', match: 1 }, (s) => ({ ...s, matchesPlayed: 0 })],
    ['tutorial 2', { mode: 'tutorial', match: 2 }, (s) => s],
    ['first ladder (Kettle)', { mode: 'ladder', format: 'short' }, (s) => ({ ...s, flags: {} })],
    ['ladder', { mode: 'ladder', format: 'short' }, (s) => s],
    ['warm-up', { mode: 'ladder', format: 'short' }, (s) => ({ ...s, lossStreak: 3 })],
    ['daily', { mode: 'daily' }, (s) => s],
    ['skirmish echo', { mode: 'skirmish', options: { generalId: 'echo', tier: 4, format: 'full', standardLevels: false }, speed: 1 }, (s) => s],
    ['skirmish warden', { mode: 'skirmish', options: { generalId: 'warden', tier: 10, format: 'full', standardLevels: false }, speed: 2 }, (s) => s],
    ...content.generals.conquest.board.map(
      (b): [string, MatchRequest, (s: SaveDoc) => SaveDoc] => [`conquest ${b.general}`, { mode: 'conquest', general: b.general }, (s) => ({ ...s, arenaIndex: 2 })],
    ),
  ];
  for (const [name, req, prep] of requests) {
    it(name, () => {
      const s = prep(playedSave());
      const opponent = metaQueries(() => s).prepareMatch!(req);
      m = mount({ save: s, routes: [{ id: 'home' }, { id: 'vs', request: req, opponent }] });
      const foe = m.q('[data-testid="vs-foe"]')!;
      expect(foe.querySelector('[data-testid="ai-badge"]')).not.toBeNull();
      expect(text(foe)).toContain('AI General');
      expect(rawKeyIn(m.container)).toBeNull();
      if (opponent.warmUp) expect(m.q('[data-testid="vs-warmup"]')).not.toBeNull();
      for (const mod of opponent.modifiers) expect(m.q(`[data-testid="vs-mod-${mod}"]`)).not.toBeNull();
      if (opponent.disclosures.length > 0) expect(m.q('[data-testid="vs-disclosures"]')).not.toBeNull();
    });
  }

  it('procedural commanders keep their "AI · " name and show a personality', () => {
    let s = playedSave();
    let o: OpponentSpec | null = null;
    for (let i = 0; i < 40 && !o; i++) {
      s = { ...s, matchesPlayed: 3 + i };
      const pick = meta.pickOpponent(s, 'ladder', content, clock);
      if (!content.generals.list[pick.generalId as 'pip']) o = pick;
    }
    expect(o).not.toBeNull();
    m = mount({ save: s, routes: [{ id: 'home' }, { id: 'vs', request: { mode: 'ladder', format: 'short' }, opponent: o! }] });
    const foe = text(m.q('[data-testid="vs-foe"]')!);
    expect(foe).toContain(content.names.aiPrefix);
    expect(m.q('.vs__personality')).not.toBeNull();
  });
});

describe('Result with real rewards (A6.3, A9 #7)', () => {
  function result(s: SaveDoc, mode: MatchResultInput['mode'], winner: 0 | 1 | null, opponent: OpponentSpec) {
    const input: MatchResultInput = {
      mode,
      outcome: { winner, reason: winner === null ? 'finalBell' : 'baseDestroyed', tick: 6000, baseHpBp: [8000, 0] },
      mySide: 0,
      opponent,
      stats: { ...fixtureStats, durationMs: 300000, ownBaseHpBpAtEnd: 8000 },
    };
    return { input, ...meta.applyMatchResult(s, input, content, clock) };
  }

  const cases: [string, (s: SaveDoc) => { s: SaveDoc; mode: MatchResultInput['mode']; winner: 0 | 1 | null; req: MatchRequest }][] = [
    ['tutorial win', (s) => ({ s: { ...s, matchesPlayed: 0 }, mode: 'tutorial', winner: 0, req: { mode: 'tutorial', match: 1 } })],
    ['ladder win', (s) => ({ s, mode: 'ladder', winner: 0, req: { mode: 'ladder', format: 'short' } })],
    ['ladder loss', (s) => ({ s, mode: 'ladder', winner: 1, req: { mode: 'ladder', format: 'short' } })],
    ['ladder draw', (s) => ({ s, mode: 'ladder', winner: null, req: { mode: 'ladder', format: 'short' } })],
    ['daily win', (s) => ({ s, mode: 'daily', winner: 0, req: { mode: 'daily' } })],
    [
      'conquest win',
      (s) => ({ s: { ...s, arenaIndex: 2 }, mode: 'conquest', winner: 0, req: { mode: 'conquest', general: content.generals.conquest.board[0]!.general } }),
    ],
    [
      'skirmish win',
      (s) => ({ s, mode: 'skirmish', winner: 0, req: { mode: 'skirmish', options: { generalId: 'pip', tier: 2, format: 'short', standardLevels: true }, speed: 1 } }),
    ],
  ];
  for (const [name, make] of cases) {
    it(name, () => {
      const c = make(playedSave());
      const opponent = metaQueries(() => c.s).prepareMatch!(c.req);
      const r = result(c.s, c.mode, c.winner, opponent);
      m = mount({
        save: r.save,
        routes: [{ id: 'home' }, { id: 'result', info: { input: r.input, rewards: r.rewards, replayIndex: 0, request: c.req } }],
      });
      m.click('[data-testid="result-skip"]');
      expect(m.qa('.result-reward').length).toBeGreaterThan(0);
      expect(rawKeyIn(m.container)).toBeNull();
      if (r.rewards.some((x) => x.kind === 'capsule')) expect(m.q('[data-testid="result-open"]')).not.toBeNull();
    });
  }
});
