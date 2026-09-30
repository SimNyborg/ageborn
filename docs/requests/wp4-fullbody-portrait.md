# WP4 request: a full-body portrait option (from WP9, 2026-09-30)

**What:** an additive `pose: 'full'` option on `ArtProvider.portrait` that returns the unit's idle frame, full body and feet included, on a transparent background. It would come from the atlas `idle` clip, or the procedural puppet with `fit: 'full'` where no atlas exists.

**Why:** Home's arena scene now shows each side's frontline troops standing in the lane (the `Diorama` in `src/ui/screens/home`). It uses `usePortrait(card, { plate: false, side })`. Some card stills are framed as busts (the Footman, for example), so their lower edge is cut. The UI fades that edge into the lane's dust for now, but a full-body pose would make the troops stand on the lane properly.

**Contract impact:** additive and optional, like `plate`. The UI would pass `pose: 'full'` through `usePortrait`, and the cache key would include it.
