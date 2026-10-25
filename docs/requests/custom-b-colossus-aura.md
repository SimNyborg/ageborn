# Track B → Track C: Colossus Lighthouse's aura shines round its torch in the menu pictures (round 3, 2026-10-25)

Status: **done** (Track C, round 3b, 2026-10-25). The router (`art.ts`, `layer: 'aura'`) now draws every aura in the
portrait square's frame plus a quarter of its side all round (`AURA_MARGIN`): the upright ellipse about the body, or a
round halo on `baseSkinAuraSpot` (Colossus Lighthouse's torch). `BaseLook` sizes that picture at 1.5 times the square,
centred on it (`cosmeticArt.css`). There is no `x -> 1 - x` for side 1: the screens mirror an opponent's base as a
whole (VS `.vs__base--foe .cos-base`, Home `.hd__base--foe > *`), aura included, and the portrait itself is not
mirrored, so mirroring the spot as well would put the halo on the wrong side. Tests: `src/visuals/test/cosmetics.test.ts`
(the spot), `src/ui/components/test/cosmeticArt.test.tsx` (one picture for both sides, inside the mirrored element).

## Why

Colossus Lighthouse (Bronze, Legendary, Wardrobe Crate; round 3b) is the first Legendary base model whose white aura
is not round the whole body: PLAN 2c asks for "a white Legendary aura on the torch". In battle its sheet carries
`meta.ageborn.auraLu` (the torch's centre in screen lu and a radius) and `atlasBaseView` draws a round halo there that
flickers with the fire. It is in `WORLD_BASE_SKIN_AURA`, so `BaseLook` (VS, Home, Customize) already draws the menu
aura under it, but as the standard upright ellipse about the body.

## The change (BaseLook)

`src/visuals/cosmetics/baseSkins.ts` exports `baseSkinAuraSpot(id): { x, y, r } | null` (Track B): the aura's centre
and radius as fractions of the square base picture's side (the portrait `usePortrait('base.<age>', { size: 256,
plate: false, skin })` draws, side 0). Null for every other skin. When it returns a spot, place the `cos-base__aura`
span on it instead of the body ellipse, for example with custom properties:

```tsx
const spot = skinId ? baseSkinAuraSpot(skinId) : null;
// side 1 pictures are mirrored: x -> 1 - x
const style = spot ? { '--aura-x': String(p.side === 1 ? 1 - spot.x : spot.x), '--aura-y': String(spot.y), '--aura-r': String(spot.r) } : {};
```

```css
.cos-base__aura.is-spot {
  left: calc(50% + (var(--aura-x) - 0.5) * var(--side));
  top: calc((100cqh - var(--side)) * var(--base-ay, 0.5) + var(--aura-y) * var(--side));
  width: calc(var(--side) * var(--aura-r) * 2);
  height: calc(var(--side) * var(--aura-r) * 2);
}
```

The breathing stays as it is (a placed halo may flicker a little faster, as the lane's does, but that is optional).
`BaseThumb` already takes the portrait path for aura models, so the Customize tile follows `BaseLook`.

## Check

Customize → Bases → Bronze → Colossus Lighthouse: the halo sits round the guardian's raised torch, not round the tower;
VS and Home with the skin equipped show the same; Crystal Spire and Nebula Ark keep the body halo. A Track B test holds
`baseSkinAuraSpot` equal to the sheet's `auraLu` through the portrait's framing (`cosmetics.bases.test.ts`).
