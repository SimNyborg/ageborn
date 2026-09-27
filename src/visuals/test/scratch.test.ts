import { it } from 'vitest';
import { allPuppets } from '../library';
import { getPart } from '../parts/registry';
import { bodyWidth, colorRule, heightBand, maxBodyWidth, restHeight, structuralProblems, silhouetteIoU } from '../checks';
import { SKIN_PUPPETS } from '../skins';
import { puppetById } from '../library';
it('report', () => {
  const lines: string[] = [];
  for (const p of allPuppets()) {
    const probs = structuralProblems(p, getPart);
    if (probs.length) lines.push(...probs);
    if (p.kind !== 'unit' && p.kind !== 'turret' && p.kind !== 'projectile') continue;
    const cr = p.kind === 'projectile' ? colorRule(p, getPart, 4) : colorRule(p, getPart, 1.5);
    const w = p.kind === 'unit' ? bodyWidth(p, getPart) : 0;
    const mw = maxBodyWidth(p);
    const h = restHeight(p, getPart);
    const band = heightBand(p);
    const flags = [
      !cr.pass ? `COLOR ${(cr.share * 100).toFixed(1)}% ${cr.offenders.map((o) => o.color.toString(16) + ':' + (o.share * 100).toFixed(1)).join(',')}` : '',
      p.kind === 'unit' && w > mw ? `WIDTH ${w.toFixed(0)}>${mw.toFixed(0)}` : '',
      band && (h < band[0] || h > band[1]) ? `HEIGHT ${h.toFixed(0)} not in ${band}` : '',
      p.kind === 'unit' && Math.abs(h - p.heightLu) / p.heightLu > 0.12 ? `DECL ${p.heightLu} vs ${h.toFixed(0)}` : '',
    ].filter(Boolean);
    lines.push(`${p.id.padEnd(34)} h=${h.toFixed(0).padStart(3)} w=${w.toFixed(0).padStart(3)}/${mw.toFixed(0)} color=${(cr.share * 100).toFixed(1)}% ${flags.join(' | ')}`);
  }
  for (const s of SKIN_PUPPETS) {
    const b = puppetById(s.skinOf ?? '');
    if (!b) continue;
    lines.push(`SKIN ${s.id} iou=${silhouetteIoU(s, b, getPart, { pxPerLu: 1.5 }).toFixed(3)}${s.kind === 'unit' ? ' color=' + (colorRule(s, getPart, 1.5).share * 100).toFixed(1) : ''}`);
  }
  console.log(lines.join('\n'));
}, 120000);
