import { bodyWidth, colorRule, heightBand, maxBodyWidth, rasterizePuppet, restHeight } from '@/visuals/checks';
import { puppetById } from '@/visuals/library';
import { getPart } from '@/visuals/parts/registry';
const ids = process.argv.slice(2);
for (const id of ids) {
  const p = puppetById(id)!;
  const ras = rasterizePuppet(p, getPart, { pxPerLu: 1.5, teamColor: 0x2f7df6 });
  let area = 0, t = 0;
  for (let i = 0; i < ras.color.length; i++) { if ((ras.color[i] ?? -1) < 0) continue; area++; if (ras.team[i] === 1) t++; }
  console.log(id, 'h', restHeight(p, getPart).toFixed(1), 'lu', p.heightLu, 'band', JSON.stringify(heightBand(p)), 'w', bodyWidth(p, getPart).toFixed(1), '/', maxBodyWidth(p).toFixed(1), 'team', (t / area).toFixed(3), 'cr', colorRule(p, getPart, 1.5).share.toFixed(3));
}
