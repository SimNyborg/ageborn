# Request (Track B → Track C): show base skin models in `BaseLook`

**From:** Track B (base skins as real models), round 1, 2026-10-08. **To:** Track C (owner of `src/ui/components/cosmeticArt.tsx`).

## Why

Five base skins now have their own Blender model (`WORLD_BASE_SKINS` in `src/visuals/manifest.world.ts`): Rose Keep (medieval), Mossy Den (stone), Coral Fort (gunpowder), Copper Foundry (industrial) and Desert Bunker (modern). The lane, Home's diorama and VS show them. Customize still shows the standard base with the old tint multiplied over it, because `BaseLook` asks for the plain `base.<age>` portrait and lays the `layer: 'tint'` picture on top.

## What the provider does now

`ArtProvider.portrait({ card: 'base.<age>', skin, ... })` (PLAN 2f interface 1) takes the skin's art id (`rose_keep`, not `baseSkin.rose_keep`):

- **a skin with a model**: the model's own body frame (`base.<age>@<skin>`, its sheet loads on demand; the portrait resolves once it is in);
- **a skin still on its tint**: the standard base with the tint baked into the body only (never the team layer), the same look the lane draws;
- **no skin**: the standard base, as before.

`usePortrait(card, { skin })` in `src/ui/components/kit.ts` already passes `skin` through.

## Suggested change in `BaseLook`

```tsx
export function BaseLook(p: { age: AgeId; skin: string | null; animate?: boolean; testid?: string; side?: Side }) {
  const fn = useCosmeticImage();
  const skinId = p.skin && p.skin.startsWith('baseSkin.') ? p.skin.slice('baseSkin.'.length) : null;
  const body = usePortrait(`base.${p.age}` as CardId, { size: 256, plate: false, skin: skinId, ...(p.side ? { side: p.side } : {}) });
  if (!body) return <CosmeticImage item={p.skin ?? 'baseSkin.default'} {...(p.testid ? { testid: p.testid } : {})} />;
  const fx = p.skin && fn ? fn(p.skin, { layer: 'fx', animate: p.animate ?? true }) : null;
  // ...the body <img> and the fx <img>; drop the tint <img> and its mask (the provider bakes the tint now)
}
```

Keep the `fx` layer: it is the skin's code-drawn particle layer, which still moves over both kinds of skin. Drop the `layer: 'tint'` overlay: on a model it would recolour the model, on a tint skin it would tint twice.

`src/ui/screens/home/skinnedBase.tsx` (`SkinnedBase`, Track B) already does exactly this for Home and VS. You can also reuse it, but it lives under `screens/home`.

## Later rounds (Track B)

The Customize diorama mount (`render/showcase/diorama.ts`), the skin thumbnails (`layer: 'thumb'`) and the new skins come in later rounds. Nothing here blocks them.
