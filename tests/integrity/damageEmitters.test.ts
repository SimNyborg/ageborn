/**
 * A damaged machine's smoke, sparks and fire stay on its hull (item 40, design 3.3 and 3.6; W0 review B1): never on a
 * crew's face or a humanoid robot's head. Over every vehicle and mech in the shipped damage bundles
 * (`public/art/damage/<age>.json`), on every frame of every clip with a tracked head, at stages 2 and 3:
 *
 * - no body (fallback) emitter within `headClearLu` of the tracked head, none above the torso box's upper fifth;
 * - no fire within `headClearLu` of the head, not even at an authored emit spot;
 * - only vehicles burn (mechs spark, flyers trail smoke).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { frameOf, parseDamageBundle } from '@/visuals/damage/bundle';
import { emitterPoint, emittersFor, headClearLu } from '@/visuals/damage/emitters';
import type { DamageUnitData } from '@/visuals/damage/types';
import { MANIFEST } from '@/visuals/manifest';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const DAMAGE = path.join(ROOT, 'public/art/damage');

function shippedMachines(): { slug: string; u: DamageUnitData }[] {
  const out: { slug: string; u: DamageUnitData }[] = [];
  for (const f of fs.readdirSync(DAMAGE).filter((n) => n.endsWith('.json'))) {
    const b = parseDamageBundle(JSON.parse(fs.readFileSync(path.join(DAMAGE, f), 'utf8')));
    if (!b) throw new Error(`${f}: not a damage bundle`);
    for (const [slug, u] of Object.entries(b.units)) if (u.family === 'vehicle' || u.family === 'mech') out.push({ slug, u });
  }
  return out;
}

describe('damaged machines keep their smoke and fire off their crews and heads (review B1)', () => {
  it('no body emitter near a tracked head or above the torso box, no fire near a head at all, over the shipped bundles', () => {
    const machines = shippedMachines();
    expect(machines.length).toBeGreaterThan(25);
    const bad: string[] = [];
    let checked = 0;
    const p: [number, number] = [0, 0];
    for (const { slug, u } of machines) {
      const def = MANIFEST[`unit.${slug.split('@')[0]}`];
      if (!def) continue;
      const clear = headClearLu(def.heightLu);
      for (const stage of [2, 3] as const) {
        const specs = emittersFor(u.family, stage, u.spots, def.heightLu);
        for (const [clip, heads] of Object.entries(u.head ?? {})) {
          heads.forEach((h, frame) => {
            if (!h) return;
            const torso = frameOf(u.torso?.[clip], frame);
            for (const s of specs) {
              if (!emitterPoint(s, u, clip, frame, def.anchors, def.heightLu, p)) continue;
              checked++;
              const body = typeof s.at !== 'object';
              const d = Math.hypot(p[0] - h[0], p[1] - h[1]);
              const where = `${slug} ${clip}[${frame}] stage ${stage} ${s.kind}@${typeof s.at === 'object' ? s.at.spot : s.at}`;
              if ((body || s.kind === 'fire') && d < clear - 1e-6) bad.push(`${where}: ${d.toFixed(1)} lu from the head (clearance ${clear.toFixed(1)})`);
              if (body && torso && p[1] > torso[1] + 0.8 * (torso[3] - torso[1]) + 1e-6) bad.push(`${where}: above the torso box's upper fifth`);
            }
          });
        }
      }
    }
    expect(checked).toBeGreaterThan(5000);
    expect(bad).toEqual([]);
  });

  it('only vehicles burn: mechs spark, flyers trail smoke, with or without emit spots', () => {
    const fire = (family: 'vehicle' | 'mech' | 'flyer', spots?: Parameters<typeof emittersFor>[2]): boolean => emittersFor(family, 3, spots, 60).some((e) => e.kind === 'fire');
    const smokeSpot = [{ id: 'exhaust', kind: 'emit', mat: 'smoke', r: 6 }] as Parameters<typeof emittersFor>[2];
    expect([fire('vehicle'), fire('vehicle', smokeSpot)]).toEqual([true, true]);
    expect([fire('mech'), fire('mech', smokeSpot), fire('flyer'), fire('flyer', smokeSpot)]).toEqual([false, false, false, false]);
    expect(emittersFor('mech', 3, undefined, 60).map((e) => e.kind)).toEqual(['smokeDark', 'spark']);
  });
});
