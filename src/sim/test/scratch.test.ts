import { writeFileSync } from 'node:fs';
import { it } from 'vitest';
import { replayMatch } from '../replay';
import { fixture } from './helpers';
import { recordStress } from './stress';

it('stress', () => {
  const doc = recordStress();
  writeFileSync('/tmp/claude-0/-home-user-ageborn/e9e6071d-3409-58a6-a28d-0aba492052fd/scratchpad/stress.json', JSON.stringify(doc));
  console.log('result', JSON.stringify(doc.result), doc.commands.length);
  for (let k = 0; k < 3; k += 1) {
    const t0 = performance.now();
    let maxUnits = 0;
    const sim = replayMatch(doc, fixture);
    const ms = performance.now() - t0;
    maxUnits = sim.state.units.length;
    console.log('stress', sim.state.tick, 'ticks', ms.toFixed(1), 'ms', maxUnits, 'units at end', sim.state.sides[0].pop, sim.state.sides[1].pop);
  }
});
