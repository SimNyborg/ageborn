# Request to the app owner (`src/app/capsules/CapsuleHost.tsx`): pass the Lite preset to the capsule show

From: WP10 (capsule show), 2026-09-29, capsule ladder (DESIGN A10 step 4: "Lite preset: half the
particles, a static starfield and a static sheen").

`ShowSettings` (`src/capsule/types.ts`) has a new optional field `lite?: boolean` (default false). The
show already honours it; the app only needs to pass it. In `showSettings(s: SaveDoc)` add:

```ts
lite: s.settings.graphics === 'lite',
```

Nothing else changes. Until then the capsule show runs its full preset everywhere (it stays within
the A12 particle caps either way).

**Status (review fixes, 2026-09-29): applied.** `showSettings` in `src/app/capsules/CapsuleHost.tsx` passes `lite: s.settings.graphics === 'lite'` (tested in `src/app/test/resultCapsuleLook.test.ts`).
