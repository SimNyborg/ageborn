/**
 * The 12 v1 skins (DESIGN A5.8). A skin never changes silhouette, size, weapon type, team-colour
 * zones, facing or stats; each is its own visual manifest entry `<target visualId>@<skin>` (B5, A14.1).
 *
 * The Wardrobe Crate pool holds the first 11. Crystal Spire is the Arena 8 reward only: not in the
 * crate pool and not craftable (A5.8).
 */
import type { SkinDef } from '@/contracts/content';
import type { AgeId, CardId, SkinRarity } from '@/contracts/ids';
import { skinnedVisualId } from '@/core/ids';

function skin(id: string, target: CardId | `base.${AgeId}`, rarity: SkinRarity, inCratePool = true): SkinDef {
  const baseVisual = target.startsWith('base.') ? target : `unit.${target}`;
  return {
    id,
    target,
    rarity,
    visualId: skinnedVisualId(baseVisual, id),
    inCratePool,
    craftable: inCratePool,
    nameKey: `skin.${id}.name`,
  };
}

/** DESIGN A5.8 table order: 4 Rare, 4 Epic, 4 Legendary. */
export const skinList: readonly SkinDef[] = [
  skin('pumpkin_head', 'bonker', 'rare'),
  skin('woolly_tuskback', 'tuskback', 'epic'),
  skin('frost_matriarch', 'mammoth_matriarch', 'legendary'),
  skin('tin_can', 'footman', 'rare'),
  skin('panda_paladin', 'ursa_paladin', 'legendary'),
  skin('toy_soldier', 'fusilier', 'rare'),
  skin('ghost_corsair', 'corsair', 'epic'),
  skin('arctic_rifleman', 'rifleman', 'rare'),
  skin('shark_mouth', 'gyrocopter', 'epic'),
  skin('synthwave', 'photon_knight', 'epic'),
  skin('kaiju_walker', 'walker_mech', 'legendary'),
  skin('crystal_spire', 'base.future', 'legendary', false),
];
