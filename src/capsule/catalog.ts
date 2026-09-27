/**
 * Presentation catalog for the capsule show. Built by the app from `CompiledContent` (a contract
 * type, so this package never imports `content`, DESIGN B2) and injected into the screens.
 * Unknown ids fall back to the A14.1 naming conventions, so a missing entry never breaks a reveal.
 */
import type { AgeId, CardId, CompiledContent, SkinId } from '@/contracts';
import type { CapsuleCatalog, CapsuleKind, CardInfo, SkinInfo } from './types';

/** Kinds shown with a climb when content says nothing (A6.4 "Other capsule types"; WP1 decision). */
const CLIMB_KINDS: ReadonlySet<CapsuleKind> = new Set<CapsuleKind>(['win', 'daily', 'meter']);

export function fallbackCardInfo(id: CardId): CardInfo {
  return { age: null, visualId: `unit.${id}`, nameKey: `card.${id}.name` };
}

export function fallbackSkinInfo(id: SkinId): SkinInfo {
  return { rarity: 'rare', target: id, visualId: id, nameKey: `skin.${id}.name` };
}

/** Reads `content.capsules.kinds[kind].climbFrom` when the (typed-as-unknown) table has it. */
function climbTable(content: CompiledContent | undefined): Partial<Record<CapsuleKind, boolean>> {
  const out: Partial<Record<CapsuleKind, boolean>> = {};
  const caps = content?.capsules;
  if (caps === null || typeof caps !== 'object' || !('kinds' in caps)) return out;
  const kinds = (caps as { kinds: unknown }).kinds;
  if (kinds === null || typeof kinds !== 'object') return out;
  for (const [kind, def] of Object.entries(kinds as Record<string, unknown>)) {
    if (def !== null && typeof def === 'object' && 'climbFrom' in def) {
      out[kind as CapsuleKind] = (def as { climbFrom: unknown }).climbFrom !== null;
    }
  }
  return out;
}

export function createCatalog(content?: CompiledContent): CapsuleCatalog {
  const climbs = climbTable(content);
  return {
    card(id) {
      const def = content?.units[id] ?? content?.turrets[id] ?? content?.powers[id];
      if (!def) return fallbackCardInfo(id);
      return { age: def.age as AgeId, visualId: def.visualId, nameKey: def.nameKey };
    },
    skin(id) {
      const def = content?.skins[id];
      if (!def) return fallbackSkinInfo(id);
      return { rarity: def.rarity, target: def.target, visualId: def.visualId, nameKey: def.nameKey };
    },
    hasClimb(kind) {
      return climbs[kind] ?? CLIMB_KINDS.has(kind);
    },
  };
}
