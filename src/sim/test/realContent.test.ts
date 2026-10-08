import { describe, expect, it } from 'vitest';
import { content } from '@/content';
import { raw } from '@/content/raw';
import { createSim } from '../createSim';
import { rulesFor } from '../rules';
import { compileForSim } from '../shim';
import { STRATEGIES, matchConfig, ofKind, runMatch, scriptedPlayer, sideConfig, Stamper } from './helpers';

/**
 * Integration with WP1's compiler (`@/content`): the sim reads the same numbers from the real
 * compiled content as from its local shim, and whole matches run on it.
 */
describe('real content (WP1 compiler)', () => {
  it('compiles to the same sim rules as the local shim', () => {
    const real = rulesFor(content);
    const shim = rulesFor(compileForSim(raw));
    expect(real.econ).toEqual(shim.econ);
    expect(real.formats).toEqual(shim.formats);
    expect(Object.keys(real.units).sort()).toEqual(Object.keys(shim.units).sort());
    for (const id of Object.keys(shim.units)) {
      const a = real.units[id];
      const b = shim.units[id];
      expect({ ...a, def: null, idx: 0 }, id).toEqual({ ...b, def: null, idx: 0 });
    }
    for (const id of Object.keys(shim.turrets)) expect({ ...real.turrets[id], def: null }, id).toEqual({ ...shim.turrets[id], def: null });
    for (const id of Object.keys(shim.powers)) expect({ ...real.powers[id], def: null }, id).toEqual({ ...shim.powers[id], def: null });
  });

  it('live rules (owner decision 2026-10-07): stances switch on consecutive ticks and Retreat is open from the start', () => {
    const sim = createSim(matchConfig({ content, format: 'short', sides: [sideConfig(content), sideConfig(content, { label: 'AI Test', isBot: true })] }));
    const st = new Stamper(sim);
    const ev = [
      ...st.step({ t: 'stance', side: 0, mode: 'hold' }),
      ...st.step({ t: 'stance', side: 0, mode: 'fallback' }),
      ...st.step({ t: 'stance', side: 0, mode: 'charge' }),
    ];
    expect(ofKind(ev, 'stanceChanged').map((e) => e.stance)).toEqual(['hold', 'fallback', 'charge']);
    expect(ofKind(ev, 'commandRejected')).toEqual([]);
    const end = ofKind(st.step({ t: 'retreat', side: 0 }), 'matchEnded')[0];
    expect(end?.result).toMatchObject({ winner: 1, reason: 'retreat' });
  });

  it('plays a Full War on the real content', () => {
    const cfg = matchConfig({
      content,
      seed: 99,
      sides: [sideConfig(content, { plan: { epic: true } }), sideConfig(content, { isBot: true, plan: { legendary: true } })],
    });
    const res = runMatch(cfg, [scriptedPlayer(content, 0, 1, STRATEGIES.balanced!), scriptedPlayer(content, 1, 2, STRATEGIES.heavy!)]);
    expect(res.sim.state.outcome).not.toBeNull();
  });
});
