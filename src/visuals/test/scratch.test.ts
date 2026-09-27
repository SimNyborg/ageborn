import { it } from 'vitest';
import { MANIFEST } from '../manifest';
import { content } from '@/content';
it('list', () => {
  const keys = Object.keys(MANIFEST);
  const need = new Set<string>();
  for (const u of Object.values(content.units)) need.add(u.visualId);
  for (const t of Object.values(content.turrets)) need.add(t.visualId);
  for (const p of Object.values(content.powers)) need.add(p.visualId);
  for (const s of Object.values(content.skins)) need.add(s.visualId);
  const missing = [...need].filter((k) => !MANIFEST[k]);
  console.log('manifest', keys.length, 'missing', missing.length, missing.join(' '));
  console.log(keys.filter((k) => k.startsWith('fx.') || k.startsWith('proj.')).length);
  console.log(Object.keys(content).join(','));
});
