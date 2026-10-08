/**
 * Save version 14: scenes per age, and one base skin per age (PLAN 2e "Save migration v14"; owner
 * requests 2026-10-08, items 20 and 21). Additive and idempotent; nothing is taken away.
 *
 * - `cosmetics.equipped.scenes` joins the equipped look: `{}`, so every age keeps its classic scene and
 *   nothing looks different. A doc that already has the field (a re-run) keeps it. Every other equip
 *   keeps its key: the base skin keys now resolve to models (the tint until a model ships), `backdrop`
 *   stays and is shown as the "Sky" for every age, and the national flag keeps its id.
 * - One base skin per age across both skin systems: when a base's troop-system skin is equipped
 *   (`skins.equipped['base.<age>']`, today only Crystal Spire on `base.future`) and a cosmetic base skin
 *   is equipped on the same age (`cosmetics.equipped.baseSkins[age]`), the cosmetic equip is dropped.
 *   The troop skin is what the battle drew, and the cosmetic skin stays owned.
 * - A missing or broken `equipped` is left to the schema (v3 creates it; this step never invents a
 *   whole look). The save package may not read the content (B2), so the step goes by key shape only.
 *
 * Never edit this step; a later change needs a new version.
 */
import type { SaveVersion } from './types';

type Equipped = Record<string, unknown>;
type Doc = Record<string, unknown> & {
  v: number;
  skins?: { equipped?: unknown } | null;
  cosmetics?: { owned?: unknown; equipped?: Equipped | null };
};

const isRecord = (x: unknown): x is Record<string, unknown> => x !== null && typeof x === 'object' && !Array.isArray(x);

/** The ages that wear a troop-system base skin (`skins.equipped['base.<age>']`). */
function troopSkinnedAges(doc: Doc): Set<string> {
  const out = new Set<string>();
  const equipped = doc.skins?.equipped;
  if (!isRecord(equipped)) return out;
  for (const [target, skin] of Object.entries(equipped)) {
    if (target.startsWith('base.') && typeof skin === 'string' && skin !== '') out.add(target.slice(5));
  }
  return out;
}

export const v14: SaveVersion = {
  v: 14,
  summary: 'Scenes per age: cosmetics.equipped.scenes ({} = classic scenes); one base skin per age (the troop skin wins a double equip)',
  up: (input) => {
    const doc = input as Doc;
    const cos = doc.cosmetics;
    const eq = cos?.equipped;
    if (cos && isRecord(eq)) {
      const scenes = isRecord(eq['scenes']) ? eq['scenes'] : {};
      let baseSkins = eq['baseSkins'];
      const troop = troopSkinnedAges(doc);
      if (isRecord(baseSkins) && Object.keys(baseSkins).some((age) => troop.has(age))) {
        const kept: Record<string, unknown> = {};
        for (const [age, key] of Object.entries(baseSkins)) if (!troop.has(age)) kept[age] = key;
        baseSkins = kept;
      }
      doc.cosmetics = { ...cos, equipped: { ...eq, ...(baseSkins !== undefined ? { baseSkins } : {}), scenes } };
    }
    return { ...doc, v: 14 };
  },
};
