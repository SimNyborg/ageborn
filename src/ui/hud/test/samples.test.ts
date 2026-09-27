import type { CardState } from '@/contracts';
import { content } from '@/content';
import { fakeMatchConfig } from '@/contracts/fakes/sim';
import hudStrings from '@/i18n/hud.en.json';
import { flattenStrings } from '@/i18n';
import { describe, expect, it } from 'vitest';
import { hudSamples, sampleHudModel } from '../samples';

const realConfig = {
  ...fakeMatchConfig(),
  format: 'full' as const,
  content,
  sides: [
    { ...fakeMatchConfig().sides[0], loadouts: {} },
    { ...fakeMatchConfig().sides[1], loadouts: {} },
  ] as ReturnType<typeof fakeMatchConfig>['sides'],
};

describe('HUD samples (C2/WP5 DoD: every HUD state)', () => {
  const samples = hudSamples(fakeMatchConfig());

  it('cover every card state, both Last Stand looks, phases, mounts, pause and the end', () => {
    const states = new Set<CardState>(samples.flatMap((s) => s.model.me.cards.map((c) => c.state)));
    expect([...states].sort()).toEqual(['armyFull', 'empty', 'legendaryInField', 'ready', 'unaffordable']);
    const ms = samples.map((s) => s.model);
    expect(ms.some((m) => m.me.evolveReady)).toBe(true);
    expect(ms.some((m) => m.me.ascending)).toBe(true);
    expect(ms.some((m) => m.me.lastStand === 'armed' && m.me.lastStandManual)).toBe(true);
    expect(ms.some((m) => m.me.lastStand === 'charging')).toBe(true);
    expect(ms.some((m) => m.foe.lastStandArmed)).toBe(true);
    expect(new Set(ms.map((m) => m.phase))).toEqual(new Set(['regulation', 'overdrive', 'siege', 'ended']));
    expect(ms.some((m) => m.phaseMarks.finalBellMs === null)).toBe(true);
    expect(ms.some((m) => !m.me.stanceVisible)).toBe(true);
    expect(ms.some((m) => m.me.stance === 'hold')).toBe(true);
    expect(ms.some((m) => m.me.baseHpBp < 2500)).toBe(true);
    expect(ms.some((m) => m.paused && m.speed === 2)).toBe(true);
    expect(new Set(ms.flatMap((m) => m.mounts.map((x) => x.state)))).toEqual(new Set(['empty', 'active', 'building']));
    expect(new Set(ms.flatMap((m) => m.me.cards.map((c) => c.foil)))).toEqual(new Set(['none', 'bronze', 'silver', 'holo']));
  });

  it('always label the opponent as an AI (A7.1)', () => {
    for (const s of samples) expect(s.model.foe.isAI).toBe(true);
  });

  it('build a model from any content without a loadout', () => {
    const m = sampleHudModel(realConfig, 0);
    expect(m.me.cards.every((c) => c.state === 'empty')).toBe(true);
    expect(m.me.popCap).toBe(content.economy.popCap);
  });
});

describe('HUD strings', () => {
  const sources = import.meta.glob<string>('../*.{ts,tsx}', { query: '?raw', import: 'default', eager: true });
  const keys = new Set(Object.keys(flattenStrings(hudStrings)));

  it('every hud.* key the HUD uses exists in hud.en.json, and every key there is used', () => {
    const used = new Set<string>();
    for (const src of Object.values(sources)) {
      for (const m of src.matchAll(/['`](hud\.[\w.]+)['`]/g)) if (m[1]) used.add(m[1]);
      // Template keys: `hud.phase.${...}` and `hud.stance.${...}`.
      for (const m of src.matchAll(/`(hud\.[\w.]+)\.\$\{/g)) if (m[1]) used.add(`${m[1]}.*`);
    }
    const missing = [...used].filter((k) => (k.endsWith('.*') ? ![...keys].some((x) => x.startsWith(k.slice(0, -1))) : !keys.has(k)));
    expect(missing).toEqual([]);
    const prefixes = [...used].filter((k) => k.endsWith('.*')).map((k) => k.slice(0, -1));
    const unused = [...keys].filter((k) => !used.has(k) && !prefixes.some((p) => k.startsWith(p)));
    expect(unused).toEqual([]);
  });

  it('keeps every HUD key under the hud namespace', () => {
    for (const k of keys) expect(k.startsWith('hud.')).toBe(true);
  });
});
