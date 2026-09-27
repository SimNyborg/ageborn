import { it } from 'vitest';
import { createSim } from '@/sim';
import { BotMatch, botProfile, createBot } from '@/ai';
import { fuzzCase } from './runs';
import { content } from './helpers';
it('debug 381', () => {
  const c = fuzzCase(381);
  const bots = [0, 1].map((s) => createBot(botProfile(content, { generalId: c.generals[s]!, tier: c.tiers[s]!, mistakeBonusBp: c.bonus[s]! }), s as 0 | 1, c.cfg.seed, content));
  const m = new BotMatch(createSim(c.cfg), bots.map((controller, side) => ({ side: side as 0 | 1, controller })));
  console.log(c.generals, c.tiers, c.cfg.format, c.cfg.modifiers);
  while (!m.ended && m.sim.state.tick < 5470) {
    const ev = m.tick();
    const t = m.sim.state.tick;
    if (t > 5400) {
      const s = m.sim.state.sides[0];
      const dmg = ev.filter((e) => e.e === 'baseDamaged' && e.side === 0).reduce((a, e) => a + (e as any).damage, 0);
      console.log(t, 'base', Math.round(s.baseHp * 10000 / s.baseMaxHp), s.lastStand, 'dmg', dmg, ev.filter((e) => e.e === 'commandRejected' || e.e.startsWith('lastStand')).map((e) => JSON.stringify(e)).join(' '), m.botCommands.filter((x) => x.tick === t && x.side === 0).map((x) => x.t).join(','));
    }
  }
}, 60000);
