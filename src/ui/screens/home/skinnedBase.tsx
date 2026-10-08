/**
 * A base as the lane draws it, with its base skin (A18.9.4; PLAN 2c "base skins as real models"), for
 * Home's diorama and VS. Since round 1 of the Customize build the shared `BaseLook` draws exactly this
 * (the ArtProvider portrait `base.<age>` with the skin: the skin's own model, or the standard base with
 * the tint baked into the body; the particle layer over it; an empty slot while the portrait renders),
 * so Customize, Home and VS show the same base. Kept as a name for the screens that import it.
 */
import type { AgeId, Side } from '@/contracts';
import { BaseLook } from '../../components/cosmeticArt';

export function SkinnedBase(p: { age: AgeId; skin: string | null; animate?: boolean; testid?: string; side?: Side }) {
  return <BaseLook {...p} />;
}
