/**
 * The visual manifest (DESIGN B5, the swap contract): `visualId` → `VisualDef`.
 *
 * Gameplay data references only visual ids. Every id in A14.1 has an entry here, including skins
 * (`unit.bonker@pumpkin_head`). The v1 entries are generated from the procedural library; to move
 * one visual to sprite sheets or Spine, add a hand-written entry to `OVERRIDES` (kind 'atlas' or
 * 'spine', same anchors and pivots) and nothing else changes. Tiers can mix in one match.
 */
import type { ClipRef, TeamSpec, VisualDef } from '@/contracts/art';
import { AGES } from './ages';
import { ARENAS } from './backdrops/ground';
import { turretClipSet, unitClipSet } from './clips';
import { FX_RECIPES } from './effects/recipes';
import { getPart } from './parts/registry';
import { BASE_PUPPETS, ICON_SPRITES, PROJECTILE_SPRITES, TURRET_PUPPETS, UNIT_PUPPETS } from './library';
import { isTeamZone } from './palette';
import { SKIN_PUPPETS } from './skins';
import { CLIP_TIMING, WORLD } from './style';
import { WORLD_OVERRIDES } from './manifest.world';
import { UNIT_OVERRIDES } from './manifest.units';
import type { PuppetDef } from './types';

export type VisualManifest = Readonly<Record<string, VisualDef>>;

/** Team zones a puppet actually uses (DESIGN B5: named part zones for the procedural tier). */
function teamSpec(p: PuppetDef): TeamSpec {
  const zones = new Set<string>();
  for (const s of p.slots) for (const l of getPart(s.part)?.layers ?? []) if (isTeamZone(l.zone)) zones.add(l.zone);
  return { kind: 'zones', zones: [...zones].sort() };
}

const ZERO_ANCHORS: VisualDef['anchors'] = { feet: { x: 0, y: 0 }, head: { x: 0, y: 0 }, muzzle: { x: 0, y: 0 }, hitCenter: { x: 0, y: 0 } };

function code(ref: string, durationMs: number, loop: boolean): ClipRef {
  return { kind: 'keyframes', ref: `code:${ref}`, durationMs, loop };
}

function unitDef(p: PuppetDef): VisualDef {
  const d: VisualDef = {
    kind: 'procedural',
    source: p.id,
    anchors: p.anchors,
    heightLu: p.heightLu,
    team: teamSpec(p),
    clips: unitClipSet(p.motion),
    events: { attack: { impactAt: p.impactAt } },
  };
  if (p.projectileVisualId) d.projectileVisualId = p.projectileVisualId;
  if (p.alpha !== undefined || (p.aura ?? null) !== null) d.filters = { ...(p.alpha !== undefined ? { alpha: p.alpha } : {}), ...(p.aura ? { glow: p.aura } : {}) };
  return d;
}

function turretDef(p: PuppetDef & { fireClip: string }): VisualDef {
  return {
    kind: 'procedural',
    source: p.id,
    anchors: p.anchors,
    heightLu: p.heightLu,
    team: teamSpec(p),
    clips: turretClipSet(p.fireClip),
    events: { attack: { impactAt: 0.1 } },
  };
}

function baseDef(p: PuppetDef): VisualDef {
  return {
    kind: 'procedural',
    source: p.id,
    anchors: p.anchors,
    heightLu: p.heightLu,
    team: teamSpec(p),
    clips: {
      idle: code('base.idle', 1000, true),
      hit: code('base.hit', 240, false),
      morph: code('base.morph', CLIP_TIMING.baseMorphMs, false),
      laststand: code('base.laststand', 1000, true),
      collapse: code('base.collapse', 1400, false),
    },
    events: { attack: { impactAt: 0 } },
  };
}

function spriteDef(source: string, heightLu: number, team: TeamSpec = { kind: 'zones', zones: [] }, clips: VisualDef['clips'] = {}): VisualDef {
  return { kind: 'procedural', source, anchors: ZERO_ANCHORS, heightLu, team, clips, events: { attack: { impactAt: 0 } } };
}

/**
 * Hand-written entries that replace generated ones (the swap point). Example of a later migration:
 *   'unit.bonker': { kind: 'atlas', source: 'units/bonker', ... }
 */
export const OVERRIDES: VisualManifest = {};

/** The generated procedural entries alone (the fallback while a sheet loads, and `?art=procedural`). */
export function buildProceduralManifest(): Record<string, VisualDef> {
  const m: Record<string, VisualDef> = {};
  for (const p of UNIT_PUPPETS) m[p.id] = unitDef(p);
  for (const p of SKIN_PUPPETS) m[p.id] = p.kind === 'base' ? baseDef(p) : unitDef(p);
  for (const p of TURRET_PUPPETS) m[p.id] = turretDef(p);
  for (const a of AGES) {
    const b = BASE_PUPPETS[a];
    if (b) m[b.id] = baseDef(b);
    m[`backdrop.${a}`] = spriteDef(`backdrop.${a}`, -WORLD.skyTopLu);
  }
  for (const a of ARENAS) m[`ground.${a}`] = spriteDef(`ground.${a}`, WORLD.groundBottomLu);
  for (const p of PROJECTILE_SPRITES) m[p.id] = spriteDef(p.id, p.heightLu, { kind: 'zones', zones: ['team'] });
  for (const r of FX_RECIPES) m[r.id] = spriteDef(r.id, 20, { kind: 'zones', zones: r.sprites?.some((s) => s.tint === 'team') ? ['team'] : [] }, { play: code(r.id, r.durationMs, r.loops ?? false) });
  for (const p of ICON_SPRITES) m[p.id] = spriteDef(p.id, p.heightLu, teamSpec(p));
  return m;
}

export function buildManifest(): Record<string, VisualDef> {
  return { ...PROCEDURAL_MANIFEST, ...WORLD_OVERRIDES, ...UNIT_OVERRIDES, ...OVERRIDES };
}

/** Procedural entries only (see `buildProceduralManifest`). */
export const PROCEDURAL_MANIFEST: VisualManifest = buildProceduralManifest();

export const MANIFEST: VisualManifest = buildManifest();
