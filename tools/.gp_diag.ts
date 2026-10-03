// Scratch diagnostic (Gunpowder wave tuning; deleted after use): trained counts and damage per card.
import { content } from '../src/content';
import { cardTest, baselinePlan } from './lib/plans';
import { playJob, BALANCED_GENERAL, type MatchJob } from './lib/jobs';
import { loadBots } from './lib/modules';

const cards = (process.argv[2] ?? '').split(',');
const fmt = (process.argv[3] ?? 'w1.gunpowder') as MatchJob['format'];
const pairs = Number(process.argv[4] ?? 20);
const bots = await loadBots();
const base = baselinePlan(content);
const seat = { kind: 'bot', generalId: BALANCED_GENERAL, tier: 5 } as const;
for (const card of cards) {
  const t = cardTest(content, card);
  let wins = 0, n = 0;
  const trained: Record<string, number> = {};
  const dmg: Record<string, number> = {};
  for (let k = 0; k < pairs; k += 1) {
    for (const subject of [0, 1] as const) {
      const plans: MatchJob['plans'] = subject === 0 ? [t.plan, base] : [base, t.plan];
      const r = playJob({ id: 0, tag: card, seed: 1 + k, format: fmt, level: 7, plans, seats: [seat, seat], subject }, bots, content);
      const s = r.summary.sides[subject];
      n += 1;
      if (r.summary.winner === subject) wins += 1;
      for (const [c, v] of Object.entries(s.trained)) trained[c] = (trained[c] ?? 0) + v;
      for (const [c, v] of Object.entries(s.damage)) dmg[c] = (dmg[c] ?? 0) + v;
    }
  }
  const top = Object.entries(trained).sort((a, b) => b[1] - a[1]).map(([c, v]) => `${c}:${(v / n).toFixed(1)}/${Math.round((dmg[c] ?? 0) / n / 100)}`);
  console.log(`${card} (replaces ${t.replaces}) win ${((100 * wins) / n).toFixed(0)}% | ${top.join(' ')}`);
}
