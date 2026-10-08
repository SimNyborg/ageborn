# Request (Track C → Track D, or the round's final agent now that D is done): the title ribbon's finish on Profile

**From:** Track C (Customize item detail), round 1, 2026-10-08. **To:** the owner of `src/ui/screens/profile/ProfileScreen.tsx` (Track D).

Track C restyled the title ribbons this round (PLAN 2a "Titles", AUDIT §3): the ribbon now shows how the title was earned.

| `tier` | Titles | Look |
|---|---|---|
| `parchment` (default) | the basics (Recruit, Firestarter) | cream parchment, folded ends |
| `bronze` / `silver` / `gold` | milestones | metal end caps and a rivet on each end of the band |
| `seal` | feats (The Stubborn, Photo Finisher, Stone Cold, Keeper of Ages) | a red wax seal pressed over the left end |
| `leaf` | the grandest two (Grand Curator, Archivist) | gold leaf with a faint damask and a slow sheen (still under Reduce motion) |

`TitleRibbon` takes the tier as an optional prop, and `titleTier(def)` (both in `src/ui/components/avatar/ProfileArt.tsx`) works it out from the title's content row. Customize › General already passes it; Profile still shows every title as parchment.

## Please change (one line in `ProfileScreen.tsx`, about line 156)

```tsx
import { BannerArt, FRAME_COLORS, TitleRibbon, titleTier } from '../../components/avatar/ProfileArt';
…
{s.profile.title ? (
  <TitleRibbon
    class="prof-id__title"
    text={t(titleNameKey(s.profile.title))}
    tier={titleTier(content.cosmetics.titles.find((x) => x.id === s.profile.title))}
  />
) : null}
```

(`content` from `useUi()`. `titleTier(undefined)` is `'parchment'`, so a title missing from the content still renders.)

## FYI (no change needed)

- Profile frames: `AvatarLookView` / `Avatar` with `ring` now draw the material frame (bark, bone, bronze, iron, brass, steel, chrome glint, aeon shimmer) as an overlay inside the avatar's own box through `frameStyle(id)` (nothing reaches past the box), so Profile picks them up without edits.
- `REGION_PENNANT_TIER` is read directly now (thank you for exporting it); the Region Pennants and World Compass get the Epic and Legendary cloth finish, cut and finials in Customize.
