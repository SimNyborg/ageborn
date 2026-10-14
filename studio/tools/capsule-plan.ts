// Prints the capsule show plan of a bench case (steps, durations and sound cues) - studio helper.
import { createCatalog } from '@/capsule/catalog';
import { planOpenAll } from '@/capsule/plan';
import { content } from '@/content';
import { BENCH_CASES } from '@/dev/capsuleBench/cases';

const id = process.argv[2] ?? 'legendary-first';
const bench = BENCH_CASES.find((c) => c.id === id);
if (!bench) throw new Error(`no case ${id}`);
const plan = planOpenAll(bench.reveals ?? [], { catalog: createCatalog(content), quickReveal: bench.quickReveal === true, ...(bench.progress ? { progress: bench.progress } : {}) });
let t = 0;
for (const s of plan.steps) {
  const card = (s as { card?: { card: string; rarity: string } }).card;
  console.log(`${(t / 1000).toFixed(2).padStart(6)}s ${s.kind.padEnd(13)} ${String(s.durationMs).padStart(6)}ms ${s.id.padEnd(28)} ${card ? `${card.card}/${card.rarity}` : ''} cues: ${s.cues.map((c) => `${c.sound}@${c.atMs}`).join(' ')}`);
  if (Number.isFinite(s.durationMs)) t += s.durationMs;
}
