/**
 * The avatar creator's rules ("Make your General", owner request 2026-10-07, AUDIT §6.8).
 *
 * - Starter parts belong to everyone. Wearables are earned only, as items of the `avatar` cosmetic
 *   collection (`avatar.<id>` in `cosmetics.owned`): the Time Capsule and Wardrobe Crate pools (rolled
 *   from the cosmetic stream, so cards never change), Trophy Road nodes, hidden feats, each age's War
 *   Path boss (Normal or harder) and star chest, and the collection milestone titles (granted by state,
 *   `syncEarnedCosmetics`). Duplicates and Dust crafting follow the collection rules. Nothing is sold.
 * - A look is equipped through `equipCosmetic({ slot: 'avatar', look, tints })`: every part must exist,
 *   fill its own slot and be owned; every tint must be in range. The look is cosmetic only.
 *
 * Pure and deterministic (B2).
 */
import type { AvatarSlot, AvatarTint, Result, SaveDoc } from '@/contracts';
import type { AvatarPartDef, Content } from '@/content';

const index = new WeakMap<Content, Map<string, AvatarPartDef>>();

/** The avatar part with this id, or undefined. */
export function avatarPart(t: Content, id: string): AvatarPartDef | undefined {
  let m = index.get(t);
  if (!m) {
    m = new Map(t.cosmetics.avatar.parts.map((p) => [p.id, p]));
    index.set(t, m);
  }
  return m.get(id);
}

/** True when the save may wear the part: a starter, or an owned wearable (`avatar.<id>`). */
export function ownsAvatarPart(s: SaveDoc, t: Content, id: string): boolean {
  const p = avatarPart(t, id);
  if (!p) return false;
  return p.rarity === 'starter' || s.cosmetics.owned.includes(`avatar.${id}`);
}

const TINTS: readonly AvatarTint[] = ['skin', 'hair', 'eyes', 'cloth'];

/**
 * Sets the profile's look. Reasons: `unknownPart`, `wrongSlot`, `notOwned`, `badTint`. Slots left out
 * keep their current part; `seed`, `parts` and `portraitCard` are kept.
 */
export function setAvatarLook(
  s: SaveDoc,
  t: Content,
  look: Partial<Record<AvatarSlot, string>>,
  tints: Partial<Record<AvatarTint, number>> = {},
): Result<SaveDoc> {
  const slots = new Set<string>(t.cosmetics.avatar.slots);
  for (const slot of Object.keys(look).sort()) {
    const id = look[slot as AvatarSlot];
    if (!slots.has(slot) || id === undefined) return { ok: false, reason: 'wrongSlot' };
    const p = avatarPart(t, id);
    if (!p) return { ok: false, reason: 'unknownPart' };
    if (p.slot !== slot) return { ok: false, reason: 'wrongSlot' };
    if (!ownsAvatarPart(s, t, id)) return { ok: false, reason: 'notOwned' };
  }
  for (const k of TINTS) {
    const n = tints[k];
    if (n !== undefined && (!Number.isInteger(n) || n < 0 || n >= t.cosmetics.avatar.tints[k])) return { ok: false, reason: 'badTint' };
  }
  const cur = s.profile.avatar;
  const avatar = { ...cur, look: { ...(cur.look ?? {}), ...look }, tints: { ...(cur.tints ?? {}), ...tints } };
  return { ok: true, value: { ...s, profile: { ...s.profile, avatar } } };
}

/** The wearables of one slot, in content order (the creator's grid). */
export function wearablesOf(t: Content, slot: AvatarSlot): AvatarPartDef[] {
  return t.cosmetics.avatar.parts.filter((p) => p.slot === slot && p.rarity !== 'starter');
}
