// Scratch (Gunpowder wave, deleted after use): paired fort rows in w1.gunpowder. Each new fort plays the
// card row (forced fort AI, the fort vs the age's wall) in place of the original fort of its kind; the delta
// is new minus original on the same seeds.
import { content } from '../src/content';
import type { CompiledContent } from '../src/contracts';
import { playFortJobSafe, type FortJob, type FortSeat } from './lib/fortMatch';

const n = Number(process.argv[2] ?? 400);
const seat: FortSeat = { kind: 'bot', tier: 7, generalId: 'echo', rules: ['rule:fortForce:safe'] };
const withFirst = (id: string): CompiledContent => {
  const f = content.forts as Record<string, unknown>;
  return { ...content, forts: { [id]: f[id], ...Object.fromEntries(Object.entries(f).filter(([k]) => k !== id)) } } as CompiledContent;
};
const rate = (c: CompiledContent, kind: 'camp' | 'trap'): number => {
  let w = 0, m = 0;
  for (let i = 0; i < n / 2; i += 1) {
    for (const subject of [0, 1] as const) {
      const job: FortJob = { id: 0, tag: kind, seed: 5001 + i, format: 'w1.gunpowder', level: 7, seats: [seat, seat], forts: subject === 0 ? [kind, 'wall'] : ['wall', kind], subject };
      const r = playFortJobSafe(job, c);
      if (r.error) { console.log('error', r.error.slice(0, 200)); continue; }
      m += 1; if (r.winner === subject) w += 1; else if (r.winner === null) w += 0.5;
    }
  }
  return (100 * w) / m;
};
for (const [kind, neu, old] of [['camp', 'cavalry_picket', 'militia_muster'], ['trap', 'fougasse', 'powder_keg']] as const) {
  const a = rate(withFirst(neu), kind);
  const b = rate(withFirst(old), kind);
  console.log(`${neu} vs wall ${a.toFixed(1)}%, ${old} vs wall ${b.toFixed(1)}%, delta ${(a - b).toFixed(1)} (n=${n} each)`);
}
