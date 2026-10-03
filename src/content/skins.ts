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
  // X0 content waves (CONTENT_PLAN 5, 6): every wave skin joins the Wardrobe Crate pool and the capsule skin
  // rolls, craftable with Dust. W1 Stone (2026-10-02):
  // released 2026-10-03 with their puppets (src/visuals/skins.ts).
  skin('snowball_pebbler', 'pebbler', 'rare'),
  skin('fossil_sabertooth', 'sabertooth', 'epic'),
  skin('aurora_elk', 'elk_chieftain', 'legendary'),
  // W2 Bronze (2026-10-03), released with their art:
  skin('marble_hoplite', 'hoplite', 'rare'),
  skin('sun_chariot', 'war_chariot', 'epic'),
  skin('obsidian_colossus', 'bronze_colossus', 'legendary'),
  // W3 Medieval (2026-10-03), released with their art:
  skin('greenwood_archer', 'longbowman', 'rare'),
  skin('chess_knight', 'destrier_knight', 'epic'),
  skin('bone_wyrm', 'lindworm', 'legendary'),
  // W4 Gunpowder (2026-10-03), released with their art:
  skin('parade_cuirassier', 'cuirassier', 'rare'),
  skin('fireworks_grenadier', 'grenadier', 'epic'),
  skin('pufferfish_balloon', 'balloon_admiral', 'legendary'),
  // W5 Industrial (2026-10-03), released with their art:
  skin('chimney_sweep', 'riveter', 'rare'),
  skin('teapot_golem', 'steam_golem', 'epic'),
  skin('circus_train', 'armoured_train', 'legendary'),
  // W6 Modern (2026-10-03), released with their art:
  skin('desert_raider', 'trench_raider', 'rare'),
  skin('tin_tankette', 'tankette', 'epic'),
  skin('origami_fortress', 'sky_fortress', 'legendary'),
  // W7 Future (2026-10-03), released with their art:
  skin('space_cadet', 'pulse_trooper', 'rare'),
  skin('chrome_rail', 'rail_gunner', 'epic'),
  skin('grandfather_clock', 'chrono_titan', 'legendary'),
];
