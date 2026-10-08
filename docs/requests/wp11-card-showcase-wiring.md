# Request to WP11 (app): provide the card showcase to the screens

From: the card detail live showcase (owner request 2026-10-07, docs/decisions.md "the live card
showcase").

Card detail's stage (and the onboarding's first forced upgrade, which uses the same `CardStage`) now
plays the card's real battle art when the app injects a showcase: the unit idles, walks in, shows
every attack variant against a sparring dummy, takes a hit and a KO, and loops; turrets fire, forts
build and act, powers cast. The UI reads it from `ShowcaseContext` (`src/ui/components/showcase.ts`,
like `CosmeticArtContext`); render provides the mount (`showcaseMount` from `@/render`). Without the
provider the UI keeps the still portrait, so nothing breaks before this lands, but players see no
live stage until it does. The dev screens page (`?dev=1#screens`) already provides it.

## The change (src/app/ui/AppRoot.tsx only)

```tsx
import { showcaseMount } from '@/render';
import { ShowcaseContext } from '@/ui/components/showcase';

// in AppRoot, next to `const reduceMotion = ...`:
const showcase = useMemo(() => showcaseMount(p.ui.art, { content: p.ui.services.content }), [p.ui.art, p.ui.services.content]);

// wrap the root inside the CosmeticArtContext provider, so both MetaHost (Card detail) and
// FirstUpgrade see it:
<CosmeticArtContext.Provider value={cosmeticImageUrl}>
  <ShowcaseContext.Provider value={showcase}>
    <div class="ab-root" data-testid="app" ...>
      ...
    </div>
  </ShowcaseContext.Provider>
</CosmeticArtContext.Provider>
```

`useMemo` is already imported in AppRoot. Nothing else is needed: the stage leases its sheets from
the provider (`showcaseLease`), creates its own small transparent canvas inside the stage box after
the screen's entrance, and destroys it (with its WebGL context) when the player leaves the card.

## Checks

- Unit and app tests: no change expected (in Node there is no canvas, so the stage resolves "not
  live" and the still stays; the app's fake art has no `showcaseLease`).
- e2e: Card detail at 844 × 390 and 1280 × 720 shows `[data-testid="card-stage"][data-live="true"]`
  a moment after it opens; `ui-budget.spec.ts` card pages still pass (the controls are 44 px).


**Resolved 2026-10-08** by the orchestrator: the provider is wired in `src/app/ui/AppRoot.tsx` exactly as above.
