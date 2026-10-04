import { bodyWidth, maxBodyWidth, pennantSlots, restHeight, heightBand } from '../src/visuals/checks';
import { UNIT_PUPPETS } from '../src/visuals/library';
import { getPart } from '../src/visuals/parts/registry';
import { rasterizePuppet } from '../src/visuals/checks';
const ids = process.argv.slice(2);
for (const p of UNIT_PUPPETS) {
  if (!ids.includes(p.id.replace('unit.', ''))) continue;
  const h = restHeight(p, getPart);
  console.log(p.id, 'h', h.toFixed(1), 'heightLu', p.heightLu, 'band', heightBand(p), 'w', bodyWidth(p, getPart).toFixed(1), 'max', maxBodyWidth(p).toFixed(1), 'pennant', pennantSlots(p, getPart).length, 'muzzle', !!p.bones.find((b) => b.id === 'muzzle'));
}
