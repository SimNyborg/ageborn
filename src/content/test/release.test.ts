/**
 * The release gate (docs/decisions.md, "Release gate for unfinished content"): cards with
 * `released: false` stay in the compiled records (sim, tests, dev tools) but in none of the player
 * lists, General plans, Trophy Road rewards, War Path nodes or counter hints. Released cards are
 * unaffected, and the gate is not a battle input, so it never changes the content hash.
 */
import { describe, expect, it } from 'vitest';
import type { CardId } from '@/contracts/ids';
import { contentAllReleased as full } from '../../../tests/fixtures/allReleased';
import { PAUSED_WAVE_IDS } from '../../../tests/fixtures/pausedWave';
import { content, isReleased, unreleasedIds } from '../index';
import { validateContent } from '../schema';

const GATED = [...PAUSED_WAVE_IDS].sort();
const gated = (id: string): boolean => PAUSED_WAVE_IDS.has(id);

/** Every card id a meta table of the content names. */
function metaCardIds(c: typeof content): { where: string; id: CardId }[] {
  const out: { where: string; id: CardId }[] = [];
  for (const g of Object.values(c.generals.list)) {
    for (const id of g.signatureCards) out.push({ where: `generals.${g.id}.signature`, id });
    for (const [age, l] of Object.entries(g.warPlan ?? {})) {
      for (const id of [...l.units, ...l.turrets, l.powers.home, l.powers.field, l.fort ?? null]) if (id) out.push({ where: `generals.${g.id}.${age}`, id });
    }
  }
  for (const n of c.trophyRoad.nodes) for (const r of n.rewards) if (r.kind === 'power' || r.kind === 'fort') out.push({ where: `trophyRoad.${n.trophies}`, id: r.card });
  for (const l of Object.values(c.warPath.levels)) {
    if (l.reward.card) out.push({ where: `warPath.${l.id}`, id: l.reward.card });
    if (l.boss) out.push({ where: `warPath.${l.id}.boss`, id: l.boss.extraTurret });
  }
  for (const u of Object.values(c.units)) if (isReleased(c, u.id)) for (const id of [...u.strongVs, ...u.weakVs]) out.push({ where: `units.${u.id}.hints`, id });
  for (const f of Object.values(c.forts)) if (isReleased(c, f.id)) for (const id of [...f.strongVs, ...f.weakVs]) out.push({ where: `forts.${f.id}.hints`, id });
  return out;
}

describe('the release gate (content)', () => {
  it('holds back exactly the gated wave (tests/fixtures/pausedWave.ts; the Stone wave shipped 2026-10-03)', () => {
    expect(content.order.unreleased).toEqual(GATED);
    expect(unreleasedIds(content)).toEqual(GATED);
    expect(full.order.unreleased).toEqual([]);
    for (const id of GATED) expect(isReleased(content, id), id).toBe(false);
  });

  it('keeps the X0 mechanics in the records (the shipped Stone wave: squad, summon, frenzy, lane reach)', () => {
    expect(content.units.hunting_wolves?.squad).toEqual({ count: 2 });
    expect(content.units.beast_caller?.abilities.some((a) => a.kind === 'summon')).toBe(true);
    expect(content.units.cave_pup?.summon).toBe(true);
    expect(content.units.pelt_rager?.abilities.some((a) => a.kind === 'frenzy')).toBe(true);
    expect(content.powers.pebble_hail?.reach).toBe('lane');
    expect(content.turrets.quill_porcupine).toBeDefined();
    expect(content.forts.thorn_hedge).toBeDefined();
    expect(content.units.bone_watchtower?.fort?.kind).toBe('tower');
    expect(content.skins.aurora_elk).toBeDefined();
    expect(content.int.units.hunting_wolves).toBeDefined();
    expect(validateContent(content)).toEqual([]);
  });

  it('lists no held-back id in any player list', () => {
    const o = content.order;
    for (const [k, list] of Object.entries({ units: o.units, hiddenUnits: o.hiddenUnits, turrets: o.turrets, powers: o.powers, forts: o.forts, fortUnits: o.fortUnits, skins: o.skins })) {
      for (const id of list) expect(gated(id), `order.${k}: ${id}`).toBe(false);
    }
  });

  it('names no held-back card in a General plan, signature, Trophy Road reward, War Path reward or counter hint', () => {
    const bad = metaCardIds(content).filter((x) => gated(x.id));
    expect(bad).toEqual([]);
    // With the gate open the same tables do name the wave (the check above is not vacuous).
    expect(metaCardIds(full).some((x) => gated(x.id))).toBe(true);
  });

  it('keeps the shipped Stone side nodes (s1 Tangle Vines, s2 Thorn Hedge) and drops only gated rewards', () => {
    expect(content.warPath.levels['wp.stone.s1']).toBeDefined();
    expect(content.warPath.levels['wp.stone.s2']).toBeDefined();
    expect(content.warPath.regions.find((r) => r.age === 'stone')?.sides).toEqual(['wp.stone.s1', 'wp.stone.s2']);
    for (const l of Object.values(content.warPath.levels)) expect(l.reward.card ? gated(l.reward.card) : false, l.id).toBe(false);
    // Main path unchanged.
    expect(content.warPath.order).toEqual(full.warPath.order);
  });

  it('refills a General plan from released cards: five troops, both turrets, starter powers', () => {
    const filled = (ids: readonly (CardId | null)[]): number => ids.filter((x) => x !== null).length;
    for (const g of Object.values(content.generals.list)) {
      for (const [age, l] of Object.entries(g.warPlan ?? {})) {
        const before = full.generals.list[g.id].warPlan?.[age as 'stone'];
        if (!before) continue;
        expect(filled(l.units), `${g.id}.${age} troops`).toBeGreaterThanOrEqual(Math.min(5, filled(before.units)));
        expect(filled(l.turrets), `${g.id}.${age} turrets`).toBe(filled(before.turrets));
      }
    }
    // The Stone wave shipped: Kettle's and Tempest's Stone plans carry their wave cards again.
    expect(content.generals.list.kettle.warPlan?.stone).toEqual(full.generals.list.kettle.warPlan?.stone);
    expect(content.generals.list.tempest.warPlan?.stone?.powers).toEqual({ home: 'tangle_vines', field: 'pebble_hail' });
  });

  it('leaves released cards unaffected', () => {
    const o = content.order;
    const f = full.order;
    expect(o.units).toEqual(f.units.filter((id) => !gated(id)));
    expect(o.turrets).toEqual(f.turrets.filter((id) => !gated(id)));
    expect(o.powers).toEqual(f.powers.filter((id) => !gated(id)));
    expect(o.forts).toEqual(f.forts.filter((id) => !gated(id)));
    expect(o.skins).toEqual(f.skins.filter((id) => !gated(id)));
    expect(o.hiddenUnits).toEqual(f.hiddenUnits.filter((id) => !gated(id)));
    // Every General plan of a later age is untouched; only plans that named a wave card change.
    for (const g of Object.values(content.generals.list)) {
      for (const [age, l] of Object.entries(g.warPlan ?? {})) {
        const before = full.generals.list[g.id].warPlan?.[age as 'stone'];
        const named = before ? [...before.units, ...before.turrets, before.powers.home, before.powers.field].some((id) => id !== null && gated(id)) : false;
        if (!named) expect(l, `${g.id}.${age}`).toEqual(before);
      }
    }
    // Battle numbers of every card are identical; only presentation hints may differ.
    const battle = (u: object): object => Object.fromEntries(Object.entries(u).filter(([k]) => k !== 'strongVs' && k !== 'weakVs' && k !== 'released'));
    for (const id of Object.keys(full.units)) expect(battle(content.units[id]!), id).toEqual(battle(full.units[id]!));
    expect(content.trophyRoad.nodes.map((n) => n.trophies)).toEqual(full.trophyRoad.nodes.map((n) => n.trophies));
  });

  it('is not a battle input: the content hash ignores the flag (flipping it later keeps replays valid)', () => {
    expect(content.hash).toBe(full.hash);
  });

  it('treats a skin of a held-back card as held back, and content without the flag as released', () => {
    const view = { units: { a: { released: false }, b: {} }, turrets: {}, powers: {}, skins: { s: { target: 'a' }, t: { target: 'b' } } };
    expect(isReleased(view, 's')).toBe(false);
    expect(isReleased(view, 't')).toBe(true);
    expect(isReleased(view, 'b')).toBe(true);
    expect(isReleased(view, 'unknown')).toBe(true);
  });
});
