# Track B → app owner (orchestrator): warm both sides' decoration props during VS (round 3, 2026-10-25)

Status: **open** (one line in a file Track B does not own; the game works without it).

## Why

Round 3 turns the 24 decorations into Blender props (`public/art/cosmetics/decorations/<id>.{png,json}`, 2-6 KB each,
loaded only when a side shows them). `VisualsArtProvider.prefetchMatch` (Track B) now warms each side's decoration
props when its `sides[]` entries carry `decorations` (the look's `decorations`, `decoration.<id>` keys or null), so the
first battle frame already shows the props. Without the field the battle still draws them: the dressing shows the SVG
bake and cross-fades each prop in when its sheet arrives (well under a second on a normal connection), which is the
stand-in the brief allows, but a found player's props would then fade in on the first frames of every match.

## The change (src/app/metaUi.ts, `warmMatchArt`)

```ts
const sides = setup.config.sides.map((sd) => ({
  skins: baseSkinsOf(sd) as Partial<Record<AgeId, SkinId>>,
  ...(sd.look?.scenes ? { scenes: sd.look.scenes } : {}),
  ...(sd.look?.decorations ? { decorations: sd.look.decorations } : {}),
}));
```

and the `PrefetchMatch` type's side gains `decorations?: readonly (CosmeticKey | null)[]`.

## Check

On VS, the network log shows the six decoration files (three a side, fewer when a spot is empty) before the battle's
first frame; the battle shows no SVG-to-prop fade at its start. Nothing else changes (the props stay loaded for the
session: all 24 decode to under 2 MB; `beginMatch` keeps them).
