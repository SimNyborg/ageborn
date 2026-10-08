/**
 * A base as the lane draws it, with its base skin (A18.9.4; PLAN 2c "base skins as real models"), for
 * Home's diorama and VS: the ArtProvider portrait `base.<age>` with the skin, which is the skin's own
 * model (`base.<age>@<skin>`, its Blender sheet) or, for a skin still on its tint, the standard base
 * with the tint baked into the body (never the team layer); the skin's ambient particle layer moves
 * over it (still when `animate` is off). While the portrait renders, the slot stays empty (never the
 * wrong base for a frame); without a portrait provider (tests, some dev pages) the shared `BaseLook`
 * stands in.
 */
import type { AgeId, CardId, Side } from '@/contracts';
import { BaseLook, useCosmeticImage } from '../../components/cosmeticArt';
import { useKit, usePortrait } from '../../components/kit';

export function SkinnedBase(p: { age: AgeId; skin: string | null; animate?: boolean; testid?: string; side?: Side }) {
  const fn = useCosmeticImage();
  const { portrait } = useKit();
  const skinId = p.skin && p.skin.startsWith('baseSkin.') ? p.skin.slice('baseSkin.'.length) : null;
  const body = usePortrait(`base.${p.age}` as CardId, { size: 256, plate: false, skin: skinId, ...(p.side ? { side: p.side } : {}) });
  if (!portrait) return <BaseLook age={p.age} skin={p.skin} {...(p.animate !== undefined ? { animate: p.animate } : {})} {...(p.testid ? { testid: p.testid } : {})} {...(p.side ? { side: p.side } : {})} />;
  const fx = body && p.skin && fn ? fn(p.skin, { layer: 'fx', animate: p.animate ?? true }) : null;
  return (
    <span class="cos-base" data-testid={p.testid} data-age={p.age} data-skin={p.skin ?? ''} aria-hidden="true">
      {body ? <img class="cos-base__img" src={body} alt="" draggable={false} /> : null}
      {fx ? <img class="cos-base__img cos-base__fx" src={fx} alt="" draggable={false} /> : null}
    </span>
  );
}
