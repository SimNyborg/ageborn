/**
 * A damaged machine's smoke, sparks and fire stay on its hull (item 40, design 3.3 and 3.6; W0 review B1 and S3): never
 * on a crew's face or a humanoid robot's head. Over every vehicle and mech in the shipped damage bundles
 * (`public/art/damage/<age>.json`), on every frame of every clip, with the tracked head (else the anchor):
 *
 * - no smoke or spark (fallback body point) within `headClearLu` of the head, none above the torso box's upper fifth;
 * - a burning unit's fire, its ignite flare and the flare's embers start at one place (`fireAt`), and on every frame of
 *   every clip it lives through (all but `die`) that place is below the head's middle and beside the head by its radius
 *   and a flame's room (`fireClear`); where no such place exists the unit has no fire and plays no flare;
 * - the place the re-check caught (the hull's middle band, under the crewman's face on the Scorpion, the Bulldozer and
 *   the Battering Ram) fails that rule, so the test would have caught it;
 * - only vehicles burn (mechs spark, flyers trail smoke).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Container } from 'pixi.js';
import { describe, expect, it } from 'vitest';
import type { PartBaker } from '@/visuals/bake';
import { DamageBundles, frameOf, parseDamageBundle } from '@/visuals/damage/bundle';
import { emitterPoint, emittersFor, fireAt, fireClear, headClearLu, type EmitterAt } from '@/visuals/damage/emitters';
import type { DamageStepEvent, DamageUnitData } from '@/visuals/damage/types';
import { UnitDamage } from '@/visuals/damage/unitDamage';
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

const defOf = (slug: string) => MANIFEST[`unit.${slug.split('@')[0]}`];

/** Every frame of every clip but `die`, with the head drawn on it (the tracked one, else the anchor; lu, y up). */
function* liveFrames(u: DamageUnitData, anchorHead: { x: number; y: number }): Generator<{ clip: string; frame: number; hx: number; hy: number }> {
  const clips = new Set([...Object.keys(u.head ?? {}), ...Object.keys(u.torso ?? {}), ...Object.keys(u.clips ?? {})]);
  clips.delete('die');
  for (const clip of clips) {
    let n = Math.max(u.head?.[clip]?.length ?? 0, u.torso?.[clip]?.length ?? 0);
    for (const frames of Object.values(u.clips?.[clip] ?? {})) n = Math.max(n, frames.length);
    for (let frame = 0; frame < n; frame++) {
      const h = frameOf(u.head?.[clip], frame);
      yield { clip, frame, hx: h ? h[0] : anchorHead.x, hy: h ? h[1] : -anchorHead.y };
    }
  }
}

/** The frames of `u` on which a fire at `at` would break the rule (none: the place is clear). */
function fireBreaks(u: DamageUnitData, at: EmitterAt, slug: string): string[] {
  const def = defOf(slug);
  if (!def) return [];
  const r = headClearLu(def.heightLu);
  const p: [number, number] = [0, 0];
  const bad: string[] = [];
  for (const { clip, frame, hx, hy } of liveFrames(u, def.anchors.head)) {
    if (!emitterPoint({ kind: 'fire', at, rate: 0, size: 0 }, u, clip, frame, def.anchors, def.heightLu, p)) continue;
    if (!fireClear(p[0], p[1], hx, hy, r)) bad.push(`${slug} ${clip}[${frame}]: fire at (${p[0].toFixed(1)}, ${p[1].toFixed(1)}), head (${hx.toFixed(1)}, ${hy.toFixed(1)}), radius ${r.toFixed(1)}`);
  }
  return bad;
}

describe('damaged machines keep their smoke and fire off their crews and heads (review B1, the re-check on e3fbcd3)', () => {
  it('no smoke or spark point near a tracked head or above the torso box, over the shipped bundles', () => {
    const machines = shippedMachines();
    expect(machines.length).toBeGreaterThan(25);
    const bad: string[] = [];
    let checked = 0;
    const p: [number, number] = [0, 0];
    for (const { slug, u } of machines) {
      const def = defOf(slug);
      if (!def) continue;
      const clear = headClearLu(def.heightLu);
      const fire = u.family === 'vehicle' ? fireAt(u, def.anchors, def.heightLu) : null;
      for (const stage of [2, 3] as const) {
        const specs = emittersFor(u.family, stage, u.spots, def.heightLu, fire).filter((s) => s.kind !== 'fire');
        for (const [clip, heads] of Object.entries(u.head ?? {})) {
          heads.forEach((h, frame) => {
            if (!h) return;
            const torso = frameOf(u.torso?.[clip], frame);
            for (const s of specs) {
              if (!emitterPoint(s, u, clip, frame, def.anchors, def.heightLu, p)) continue;
              checked++;
              const body = typeof s.at !== 'object' || 'box' in s.at;
              const d = Math.hypot(p[0] - h[0], p[1] - h[1]);
              const where = `${slug} ${clip}[${frame}] stage ${stage} ${s.kind}@${typeof s.at === 'object' ? JSON.stringify(s.at) : s.at}`;
              if (body && d < clear - 1e-6) bad.push(`${where}: ${d.toFixed(1)} lu from the head (clearance ${clear.toFixed(1)})`);
              if (body && torso && p[1] > torso[1] + 0.8 * (torso[3] - torso[1]) + 1e-6) bad.push(`${where}: above the torso box's upper fifth`);
            }
          });
        }
      }
    }
    expect(checked).toBeGreaterThan(4500);
    expect(bad).toEqual([]);
  });

  it("a vehicle's fire, ignite flare and embers start below the head and beside it on every frame; no clear place, no fire", () => {
    const vehicles = shippedMachines().filter(({ u }) => u.family === 'vehicle');
    expect(vehicles.length).toBeGreaterThan(15);
    const bad: string[] = [];
    const burning: string[] = [];
    const smokeOnly: string[] = [];
    for (const { slug, u } of vehicles) {
      const def = defOf(slug);
      if (!def) continue;
      const at = fireAt(u, def.anchors, def.heightLu);
      const fires = emittersFor('vehicle', 3, u.spots, def.heightLu, at).filter((s) => s.kind === 'fire');
      if (!at) {
        smokeOnly.push(slug);
        expect(fires, slug).toEqual([]);
        continue;
      }
      burning.push(slug);
      expect(fires.map((s) => s.at), slug).toEqual([at]);
      bad.push(...fireBreaks(u, at, slug));
    }
    expect(bad).toEqual([]);
    // most vehicles keep a place to burn; the rest smoke and spark
    expect(burning.length).toBeGreaterThan(12);
    expect(burning.length + smokeOnly.length).toBe(vehicles.filter(({ slug }) => defOf(slug)).length);
  });

  it('the place the re-check caught (the hull\'s middle band) breaks the rule on the crewed carts: the rule would have caught it', () => {
    const old: EmitterAt = { box: [0.55, 0.45] };
    const caught = shippedMachines()
      .filter(({ u }) => u.family === 'vehicle')
      .filter(({ slug, u }) => fireBreaks(u, old, slug).length > 0)
      .map(({ slug }) => slug);
    expect(caught).toEqual(expect.arrayContaining(['scorpion', 'bulldozer', 'battering_ram']));
  });

  it("the ignite flare plays where the fire burns, not at the step's mark (the War Chariot's driver, review S3)", () => {
    const vehicles = shippedMachines().filter(({ u }) => u.family === 'vehicle');
    const bundles = new DamageBundles(() => Promise.reject(new Error('404')), () => '/');
    bundles.add('modern', { v: 1, units: Object.fromEntries(vehicles.map(({ slug, u }) => [slug, u])) });
    const bad: string[] = [];
    let flares = 0;
    for (const { slug, u } of vehicles) {
      const def = defOf(slug);
      if (!def) continue;
      const r = headClearLu(def.heightLu);
      for (const { clip, frame, hx, hy } of liveFrames(u, def.anchors.head)) {
        const d = new UnitDamage({ body: new Container(), after: null, baker: {} as PartBaker, slug, heightLu: def.heightLu, anchors: def.anchors, team: 0x3a7bd5, seed: 11, bundles });
        const steps: DamageStepEvent[] = [];
        d.onStep((e) => steps.push(e));
        d.setFrame(clip, frame);
        d.setHp(10000);
        d.setHp(2000);
        const e = steps[0];
        if (!e) {
          bad.push(`${slug} ${clip}[${frame}]: no step`);
          continue;
        }
        const at = fireAt(u, def.anchors, def.heightLu);
        if (!at) {
          if (e.ignite) bad.push(`${slug} ${clip}[${frame}]: a flare with no place to burn`);
          continue;
        }
        if (!e.ignite || e.igniteX === undefined || e.igniteY === undefined) continue; // a hidden smoke spot on this frame: no flare
        flares++;
        // root space (y down) back to sheet lu (y up): the view applies no body transform here (hk 1)
        if (!fireClear(e.igniteX, -e.igniteY, hx, hy, r)) bad.push(`${slug} ${clip}[${frame}]: flare at (${e.igniteX.toFixed(1)}, ${(-e.igniteY).toFixed(1)}), head (${hx.toFixed(1)}, ${hy.toFixed(1)})`);
      }
    }
    expect(flares).toBeGreaterThan(500);
    expect(bad).toEqual([]);
  });

  it('only vehicles burn: mechs spark, flyers trail smoke, with or without emit spots', () => {
    const hull: EmitterAt = { box: [0.55, 0.45] };
    const fire = (family: 'vehicle' | 'mech' | 'flyer', spots?: Parameters<typeof emittersFor>[2]): boolean => emittersFor(family, 3, spots, 60, hull).some((e) => e.kind === 'fire');
    const smokeSpot = [{ id: 'exhaust', kind: 'emit', mat: 'smoke', r: 6 }] as Parameters<typeof emittersFor>[2];
    expect([fire('vehicle'), fire('vehicle', smokeSpot)]).toEqual([true, true]);
    expect([fire('mech'), fire('mech', smokeSpot), fire('flyer'), fire('flyer', smokeSpot)]).toEqual([false, false, false, false]);
    expect(emittersFor('mech', 3, undefined, 60, hull).map((e) => e.kind)).toEqual(['smokeDark', 'spark']);
  });
});
