import { it } from 'vitest';
import { C } from './helpers';
const PREF: Record<string, string[]> = {
  pip: ['infantry', 'ranged'], kettle: ['infantry', 'ranged'], moss: ['ranged', 'support', 'antiArmor'], ledger: ['heavy', 'epic', 'ranged'],
  boomsworth: ['ranged', 'epic'], twins: ['antiArmor', 'ranged', 'epic'], rook: ['antiArmor', 'heavy', 'ranged'], tempest: ['support', 'epic', 'ranged'], warden: ['epic', 'heavy', 'ranged'],
};
it('probe', () => {
  for (const g of Object.keys(PREF)) {
    const plan = C.generals.list[g]!.warPlan!;
    const out: string[] = [];
    for (const age of C.order.ages) {
      const units = [...plan[age]!.units];
      const want = 7 - units.filter((_, i) => i !== 3 || g !== 'pip').length;
      const picks: string[] = [];
      for (const grp of PREF[g]!) for (const id of C.order.units) {
        const u = C.units[id]!;
        if (picks.length >= want) break;
        if (u.age !== age || u.group !== grp || u.hidden || u.rarity === 'legendary' || units.includes(id) || picks.includes(id)) continue;
        if (g === 'pip' && u.rarity !== 'common') continue;
        picks.push(id);
      }
      out.push(`${age}: ${picks.map((p) => `'${p}'`).join(', ')}`);
    }
    console.log(g + '\n  ' + out.join('\n  '));
  }
});
