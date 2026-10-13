/**
 * The collection items a capsule or crate held, as the summary's picture tiles (PLAN 2a "Found items in
 * the capsule and crate summary"; they replace the "Also found" toast). The capsule layer may not import
 * the UI (B2), so the app hands the summary a lookup ({@link FoundItemsContext}): the item's name, what
 * it is ("Sky", "Base skin · Stone Age"), NEW (save v15 `cosmetics.fresh`: it joined the collection with
 * this opening) or the Dust a duplicate paid, and its picture drawn by the same art components as its
 * Customize card, with the art provider's portraits so a base skin shows its model.
 */
import type { FoundItemsEnv } from '@/capsule/summary';
import type { Content } from '@/content';
import { ageNameKey } from '@/content/keys';
import type { AgeId, ArtProvider, SaveDoc } from '@/contracts';
import { CosmeticTileArt } from '@/ui/components/cosmeticArt';
import { UiKitContext, type Translate, type UiKit } from '@/ui/components/kit';
import { playLevelId } from '@/ui/screens/model/warPath';

/** Landscape pictures span two columns of the summary grid. */
const WIDE = new Set(['backdrop', 'scene', 'baseSkin']);

export interface FoundItemsDeps {
  content: Content;
  t: Translate;
  /** The save after the opening (it already owns the items; `fresh` says which are NEW). */
  save: () => SaveDoc | null;
  art: ArtProvider;
  /** The audio service's `play` (the burst's pop). */
  sound?: (id: string) => void;
}

/** The age the player plays now: a sky is shown over that age's classic scene, as in Customize. */
function currentAge(s: SaveDoc | null, content: Content): AgeId {
  if (!s) return content.order.ages[0] ?? 'stone';
  return content.warPath?.levels[playLevelId(s, content)]?.region ?? content.order.ages[0] ?? 'stone';
}

export function foundItemsEnv(d: FoundItemsDeps): FoundItemsEnv {
  const items = new Map(d.content.cosmetics.collections.items.map((x) => [`${x.collection}.${x.id}`, x]));
  const portrait = d.art.portrait.bind(d.art);
  return {
    view(key) {
      const x = items.get(key);
      if (!x) return null;
      const s = d.save();
      const isNew = (s?.cosmetics.fresh ?? []).includes(key);
      const reduce = s?.settings.reduceMotion === true;
      const kit: UiKit = { t: d.t, locale: 'en', portrait, reduceMotion: reduce };
      const kind = d.t(`cosmetic.ui.kind.${x.collection}`);
      return {
        name: d.t(x.nameKey),
        kind: x.age ? `${kind} · ${d.t(ageNameKey(x.age))}` : kind,
        rarity: x.rarity,
        isNew,
        dust: isNew ? 0 : d.content.cosmetics.collections.drops.duplicateDust[x.rarity],
        wide: WIDE.has(x.collection),
        art: (
          <UiKitContext.Provider value={kit}>
            <CosmeticTileArt item={key} age={x.age ?? currentAge(s, d.content)} rarity={x.rarity} {...(x.collection === 'quote' ? { text: d.t(x.textKey ?? x.nameKey) } : {})} animate={!reduce} />
          </UiKitContext.Provider>
        ),
      };
    },
    ...(d.sound ? { sound: d.sound } : {}),
  };
}
