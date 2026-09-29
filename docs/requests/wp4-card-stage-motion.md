# Request to WP4: a portrait in motion for the Card detail stage

From: UI-4 Army and Card detail (WP9), 2026-09-29. ui-plan 4.4 ("the lane stage with the unit in motion: idle, walk, attack on a 3 s loop", B-rank 19) and 6.6 ("the unit loop needs a portrait-in-motion from the art service").

Today the Card detail stage (`src/ui/screens/cardDetail/CardDetailScreen.tsx`, `StageArt`) shows the plate-free portrait from `ArtProvider.portrait({ plate: false })` and moves it with CSS only (a breath, a wind-up lean and a strike step every 3 s; turrets recoil, powers hover). The UI may not import visuals or Pixi (B2), so it cannot play the unit's real animation.

Please add an optional, duck-typed method on the art provider, for example:

```ts
/** A short looping clip of the unit for UI stages: frames as data URLs (or one strip), with timing. */
portraitClip?(o: { card: CardId; skin?: SkinId; size: number; clip: 'idle' | 'walk' | 'attack' }): Promise<{ frames: string[]; frameMs: number } | null>;
```

Frames baked from the same atlases as the battle (transparent background, feet on the bottom edge, the portrait's framing). The stage would play idle 1.2 s, walk 0.6 s in place, attack once, on the view clock, and fall back to today's CSS motion when the method is missing or returns null. Turrets: an attack clip with the muzzle flash; powers: none needed.
