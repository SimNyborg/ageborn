/**
 * National flags and the Flag Atlas (PLAN 2d; owner decisions 2026-10-08). Data only; owned by Track D.
 *
 * - Every flag is bought with Dust at the one price `drops.flagDust` (500; a save's first flag costs
 *   nothing while `drops.firstFlagFree` is on): source `{ kind: 'dust' }`. Flags are never in a capsule
 *   or crate pool and never on the odds panel; the Atlas shows the fixed price instead.
 * - Country flags only: the 193 UN members, the Holy See and Palestine (PLAN Appendix A), keyed by
 *   ISO 3166-1 alpha-2 (item id = lowercase code, `_` for `-`), plus the "Other flags" group
 *   (`region: 'other'`: Faroe Islands, Greenland, England, Scotland and Wales), which does not count
 *   toward the 195. No territories, no partially recognised states, no political or hate symbols. A
 *   player's flag is only ever their own pick, never inferred from location.
 * - `region` is a browsing group only ({@link FLAG_REGIONS}; UN M49 continents, the Americas split into
 *   North with Central America and the Caribbean, and South; Cyprus browsed under Europe). The search
 *   finds every flag from any region.
 * - The art is flag-icons 7.5.0 (MIT), vendored by `tools/flags/vendor.ts` from this list: one SVG and
 *   one atlas cell per row (`public/art/flags/`).
 * - The 50 flags of before 2026-10-08 keep their ids and rarities (a flag an unopened capsule still holds
 *   pays its old duplicate Dust if it arrives twice); the rarity is never shown for a national flag.
 *   Owners keep them: nothing is taken away.
 * - A new row ships with `released: false` until its art (the vendored SVG and its atlas cell) is in.
 */
import type { CosmeticItemDef, FlagRegion, TitleDef } from '../types';

/** The Atlas's browsing groups in chip order; `other` (the flags outside the 195) comes last and has no reward. */
export const FLAG_REGIONS: readonly FlagRegion[] = ['europe', 'asia', 'africa', 'northAmerica', 'southAmerica', 'oceania', 'other'];

/** The countries of each region (PLAN Appendix A, by English name), as item ids. */
const BY_REGION: Readonly<Record<FlagRegion, string>> = {
  europe: 'al ad at by be ba bg hr cy cz dk ee fi fr de gr hu is ie it lv li lt lu mt md mc me nl mk no pl pt ro ru sm rs sk si es se ch ua gb va',
  asia: 'af am az bh bd bt bn kh cn ge in id ir iq il jp jo kz kw kg la lb my mv mn mm np kp om pk ph qa sa sg kr lk sy tj th tl tr tm ae uz vn ye ps',
  africa: 'dz ao bj bw bf bi cv cm cf td km cg cd ci dj eg gq er sz et ga gm gh gn gw ke ls lr ly mg mw ml mr mu ma mz na ne ng rw st sn sc sl so za ss sd tz tg tn ug zm zw',
  northAmerica: 'ag bs bb bz ca cr cu dm do sv gd gt ht hn jm mx ni pa kn lc vc tt us',
  southAmerica: 'ar bo br cl co ec gy py pe sr uy ve',
  oceania: 'au fj ki mh fm nr nz pw pg ws sb to tv vu',
  other: 'fo gl gb_eng gb_sct gb_wls',
};

/** The flags that dropped as Rare before 2026-10-08 (kept for their old duplicate Dust; never shown). */
const WAS_RARE = new Set('gl gb gb_sct us ca kr in au nz br za jm'.split(' '));

const row = (id: string, region: FlagRegion): CosmeticItemDef => ({
  id,
  collection: 'nationalFlag',
  rarity: WAS_RARE.has(id) ? 'rare' : 'common',
  source: { kind: 'dust' },
  art: `cosmetic.nationalFlag.${id}`,
  nameKey: `cosmetic.nationalFlag.${id}.name`,
  country: id.replace('_', '-'),
  region,
});

/** Every national flag: the 195 by region, then the Other flags. */
export const nationalFlagItems: CosmeticItemDef[] = FLAG_REGIONS.flatMap((region) => BY_REGION[region].split(' ').map((id) => row(id, region)));

/** The Region Pennants (PLAN 2d): one Epic base flag per region of the 195, earned by owning all its flags (ids in snake case). */
const PENNANTS: readonly (readonly [FlagRegion, string])[] = [
  ['europe', 'pennant_europe'],
  ['asia', 'pennant_asia'],
  ['africa', 'pennant_africa'],
  ['northAmerica', 'pennant_north_america'],
  ['southAmerica', 'pennant_south_america'],
  ['oceania', 'pennant_oceania'],
];

/** All 195 flags: the World Compass base flag and the World Ambassador title (PLAN 2d). */
export const ATLAS_FLAG_COUNT = 195;

/**
 * The Atlas's rewards (PLAN 2d "Region completion rewards", earned and never sold): a Region Pennant
 * (a base flag with a continent and a compass star) per completed region, granted with the purchase
 * that completes it, and the Legendary World Compass for all 195. The Other flags have no reward.
 */
export const flagRewardItems: CosmeticItemDef[] = [
  ...PENNANTS.map(
    ([region, id]): CosmeticItemDef => ({
      id,
      collection: 'baseFlag',
      rarity: 'epic',
      source: { kind: 'flagRegion', region },
      art: `cosmetic.baseFlag.${id}`,
      nameKey: `cosmetic.baseFlag.${id}.name`,
    }),
  ),
  {
    id: 'world_compass',
    collection: 'baseFlag',
    rarity: 'legendary',
    source: { kind: 'flagsOwned', count: ATLAS_FLAG_COUNT },
    art: 'cosmetic.baseFlag.world_compass',
    nameKey: 'cosmetic.baseFlag.world_compass.name',
  },
];

/** The Atlas's title, "World Ambassador": every one of the 195 flags owned. */
export const flagTitles: TitleDef[] = [{ id: 'world_ambassador', unlock: { kind: 'flagsOwned', count: ATLAS_FLAG_COUNT }, nameKey: 'title.world_ambassador.name' }];
