import { it } from 'vitest';
import { puppetById } from '../library';
import { getPart } from '../parts/registry';
import { puppetBounds, partBounds } from '../draw';
import { boneWorld, slotLocal } from '../pose';
import { matMul } from '../svg';
it('bounds', () => {
  for (const id of ['unit.destrier_knight', 'unit.ursa_paladin', 'unit.gyrocopter', 'unit.mammoth_matriarch', 'unit.longbowman']) {
    const p = puppetById(id)!;
    const world = boneWorld(p.bones);
    const rows: string[] = [];
    for (const s of p.slots) {
      if (s.noWidth || s.tag === 'weapon') continue;
      const part = getPart(s.part)!;
      const pb = partBounds(part);
      const m = matMul(world.get(s.bone)!, slotLocal(s));
      const xs = [[pb.minX, pb.minY], [pb.maxX, pb.minY], [pb.minX, pb.maxY], [pb.maxX, pb.maxY]].map(([x, y]) => m[0] * x! + m[2] * y! + m[4]);
      rows.push(`${(s.id ?? s.part).padEnd(30)} ${Math.min(...xs).toFixed(1)}..${Math.max(...xs).toFixed(1)}`);
    }
    rows.sort((a, b) => parseFloat(a.split(' ').pop()!) - parseFloat(b.split(' ').pop()!));
    console.log(id, JSON.stringify(puppetBounds(p, getPart)), '\n' + rows.slice(0, 3).join('\n') + '\n...\n' + rows.map((r) => r).sort((a, b) => parseFloat(b.split('..')[1]!) - parseFloat(a.split('..')[1]!)).slice(0, 3).join('\n'));
  }
});
