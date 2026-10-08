# Request (Track D → Track B): fly the vendored national flag on the base pole

**From:** Track D (national flags, Flag Atlas), round 1, 2026-10-08. **To:** Track B (owner of `src/visuals/cosmetics/dressing.ts`, the Home diorama and VS).

`nationalFlagTexture(id)` in `src/visuals/cosmetics/nationalFlags.ts` is in (PLAN 2f interface 5). All 200 national flags have it (the 195, Faroe Islands, Greenland, England, Scotland and Wales).

## The texture

- `nationalFlagTexture(id): { texture: Texture; ready: Promise<void> } | null`; null only without a DOM (unit tests) or for an unknown id. Then keep today's fallback (`drawFlag(ctx, 'nationalFlag', …)`, the 50 hand-drawn designs).
- **Layout = `drawNationalFlag(ctx, id, 5)`**: 320 x 220 px, 5 px per view-box unit, the 60 x 40 field with a 2-unit margin, so it drops into `flagTexture()` at `TEX_PX = 5` with the same `FlagCloth` size and hoist offset. The design keeps the vendored 4:3: it fills the field's height from the hoist (53.3 of the 60 units); the rest of the field is clear.
- **The cloth** (AUDIT §3.1): the design, two hard fold shadow bands and a light band, a sheen from the top left, a darker hoist hem and lower edge, and an outline inside the edge in the flag's own dark (black at 62% over its colours, never ink black). Until the SVG arrives it shows a neutral parchment cloth with the same finish; when `ready` resolves, the **same** texture shows the design (its source is updated in place), so nothing needs swapping. `ready` also resolves when the SVG fails (the neutral cloth stays).
- **Cached and shared per flag: never destroy it** (both sides and the Home diorama may show the same one).

## Suggested change in `dressing.ts`

```ts
import { nationalFlagTexture } from './nationalFlags';

private flagTexture(kind: FlagKind, id: string): Texture {
  if (kind === 'nationalFlag') {
    const cloth = nationalFlagTexture(id);
    if (cloth) return cloth.texture;
  }
  const w = (FLAG_W + 4) * TEX_PX;
  …unchanged
}
```

`FlagCloth` keeps its size: the clear part of the field ripples unseen. (If you prefer the mesh to end at the fly, its width is `(FLAG_H * 4 / 3 + 4) * f.lu` with the texture's frame cut to `(FLAG_H * 4 / 3 + 4) * 5` px.)

## Please also

- **Home diorama base pole** (PLAN 2d "Where the chosen flag shows", new, B): the same texture.
- **Collapse:** a national flag is lowered intact with its pole, never torn (PLAN 2d licence and respect note); the torn scraps are for the base flag only.
- **VS:** `LookFlags` shows the national flag through `CosmeticImage`; once Track C's router change (`docs/requests/custom-d-flag-pictures.md`) is in, VS shows the vendored SVG, which also warms the browser cache for the lane bake about 3 s before the battle.

**Resolved (Track B, round 1, 2026-10-08):** the lane, the Home base pole and the respectful collapse use `nationalFlagTexture` (see `custom-b-shared-edits.md`).
