/**
 * The biped rig (DESIGN A11 Rigs): head, torso, pelvis, upper/lower arm x2, weapon, off-hand,
 * upper/lower leg x2. Proportions are chunky cartoon: the head is about a third of the height and
 * the legs are short. Everything scales with the height (68 lu infantry) while outlines stay 3.7 lu.
 *
 * Bone layout at 68 lu (puppet space, y up is negative):
 *   root (feet) > spin (-30) > pelvis (-17) > torso (-19) > head (neck, -39) > eyes
 *   torso > armB/armF (shoulders, -36) > foreB/foreF > handB/handF > muzzle
 *   pelvis > legB/legF (hips, -16) > shinB/shinF (knees, -8.4) ; soles at 0
 *
 * The near arm (armF) holds the weapon and is drawn in front; the far arm and far leg are drawn
 * behind the body and a little darker.
 */
import type { AgeId, RoleGroup } from '@/contracts/ids';
import { getClip } from '../clips';
import { strideFor } from '../clips/procedural';
import type { Palette } from '../palette';
import { sized } from '../parts/registry';
import { STYLE } from '../style';
import type { BoneDef, PuppetDef, SlotDef } from '../types';
import { anchorsFrom, rootBones } from './common';

export interface Held {
  part: string;
  x?: number;
  y?: number;
  rot?: number;
  z?: number;
  tag?: SlotDef['tag'];
  tone?: 'back';
  /** Keep the authored size (default: scaled with the body). */
  noScale?: boolean;
  alpha?: number;
  /** Bone to attach to (defaults depend on the slot kind). */
  bone?: string;
  id?: string;
}

export interface BipedSpec {
  id: string;
  age: AgeId;
  /** Standing height, lu (default 68, DESIGN A11 infantry). */
  height?: number;
  palette: Palette;
  head: string;
  eyes?: string | null;
  /** Hats, helmets, hair on top of the head (on the head bone). */
  hat?: Held[];
  /** Hair or hoods behind the head. */
  hairBack?: Held[];
  torso: string;
  /** Tabards, armour, sashes over the torso. */
  torsoOver?: Held[];
  /** Quivers, capes, packs behind the torso. */
  back?: Held[];
  pelvis: string;
  arm?: { upper?: string; lower?: string; hand?: string };
  armBack?: { upper?: string; lower?: string; hand?: string };
  leg?: { upper?: string; lower?: string };
  /** On the near hand. `muzzle` is where projectiles leave, in hand-local lu (before scaling). */
  weapon?: Held & { muzzle?: { x: number; y: number } };
  /** On the far hand (shields, drums, lanterns). */
  offhand?: Held;
  extras?: SlotDef[];
  /** Extra bones (bow strings, antennas, devices); parents must be biped bones or listed earlier. */
  extraBones?: BoneDef[];
  /** Rest rotations in degrees per bone. */
  pose?: Partial<Record<'torso' | 'head' | 'armF' | 'foreF' | 'handF' | 'armB' | 'foreB' | 'handB' | 'legF' | 'legB' | 'shinF' | 'shinB', number>>;
  attack: string;
  ability?: string;
  twirl?: boolean;
  group: RoleGroup;
  size: 'small' | 'medium' | 'large' | 'huge';
  legendary?: boolean;
  aura?: PuppetDef['aura'];
  /** Bone offsets of the whole upper body (lets hunched or tall builds share parts). */
  torsoLift?: number;
}

/** Default arm and leg zones for bipeds (overridable in each palette). */
export const BIPED_ZONE_DEFAULTS = (p: Palette): Palette => ({
  sleeve: p['cloth'] ?? 0x888888,
  forearm: p['skin'] ?? 0xcccccc,
  glove: p['skin'] ?? 0xcccccc,
  pants: p['leather'] ?? 0x777777,
  shin: p['leather'] ?? 0x777777,
  boot: p['leather'] ?? 0x666666,
  ...p,
});

export function biped(s: BipedSpec): PuppetDef {
  const h = s.height ?? STYLE.heightInfantryLu;
  const k = h / STYLE.heightInfantryLu;
  const P = s.pose ?? {};
  const lift = s.torsoLift ?? 0;
  const bones: BoneDef[] = [
    ...rootBones(-30 * k),
    { id: 'pelvis', parent: 'spin', x: 0, y: 13 * k },
    { id: 'torso', parent: 'pelvis', x: 0, y: (-2 - lift) * k, rot: P.torso ?? 0 },
    { id: 'head', parent: 'torso', x: 1.5 * k, y: -20 * k, rot: P.head ?? 0 },
    { id: 'eyes', parent: 'head', x: 5.4 * k, y: -12.6 * k },
    { id: 'armB', parent: 'torso', x: -2.4 * k, y: -16.6 * k, rot: P.armB ?? 8 },
    { id: 'foreB', parent: 'armB', x: 0, y: 8.8 * k, rot: P.foreB ?? -10 },
    { id: 'handB', parent: 'foreB', x: 0, y: 8.2 * k, rot: P.handB ?? 0 },
    { id: 'armF', parent: 'torso', x: 2.6 * k, y: -16.6 * k, rot: P.armF ?? -8 },
    { id: 'foreF', parent: 'armF', x: 0, y: 8.8 * k, rot: P.foreF ?? -12 },
    { id: 'handF', parent: 'foreF', x: 0, y: 8.2 * k, rot: P.handF ?? 0 },
    { id: 'legB', parent: 'pelvis', x: -3.4 * k, y: 1 * k, rot: P.legB ?? 4 },
    { id: 'shinB', parent: 'legB', x: 0, y: 7.6 * k, rot: P.shinB ?? 0 },
    { id: 'legF', parent: 'pelvis', x: 3.4 * k, y: 1 * k, rot: P.legF ?? -4 },
    { id: 'shinF', parent: 'legF', x: 0, y: 7.6 * k, rot: P.shinF ?? 0 },
  ];
  bones.push(...(s.extraBones ?? []).map((b) => ({ ...b, x: b.x * k, y: b.y * k })));
  const w = s.weapon;
  if (w?.muzzle) bones.push({ id: 'muzzle', parent: 'handF', x: 0, y: 0 });
  const z = (p: string): string => sized(p, k);
  const held = (hh: Held, bone: string, zDefault: number): SlotDef => ({
    id: hh.id,
    part: hh.noScale ? hh.part : z(hh.part),
    bone: hh.bone ?? bone,
    z: hh.z ?? zDefault,
    x: (hh.x ?? 0) * k,
    y: (hh.y ?? 0) * k,
    rot: hh.rot,
    tag: hh.tag,
    tone: hh.tone,
    alpha: hh.alpha,
  });
  const arm = { upper: 'shared.arm.upper', lower: 'shared.arm.lower', hand: 'shared.hand', ...s.arm };
  const armB = { ...arm, ...s.armBack };
  const leg = { upper: 'shared.leg.upper', lower: 'shared.leg.lower', ...s.leg };
  const slots: SlotDef[] = [
    ...(s.back ?? []).map((b, i) => held(b, 'torso', 2 + i * 0.1)),
    ...(s.hairBack ?? []).map((b, i) => held(b, 'head', 3 + i * 0.1)),
    { id: 'armB', part: z(armB.upper), bone: 'armB', z: 5, tone: 'back' },
    { id: 'foreB', part: z(armB.lower), bone: 'foreB', z: 6, tone: 'back' },
    ...(s.offhand ? [{ ...held({ tone: 'back', ...s.offhand }, 'handB', 6.5), noWidth: true }] : []),
    { id: 'handB', part: z(armB.hand), bone: 'handB', z: 7, tone: 'back' },
    { id: 'legB', part: z(leg.upper), bone: 'legB', z: 10, tone: 'back' },
    { id: 'shinB', part: z(leg.lower), bone: 'shinB', z: 11, tone: 'back' },
    { id: 'legF', part: z(leg.upper), bone: 'legF', z: 12 },
    { id: 'shinF', part: z(leg.lower), bone: 'shinF', z: 13 },
    { id: 'pelvis', part: z(s.pelvis), bone: 'pelvis', z: 20 },
    { id: 'torso', part: z(s.torso), bone: 'torso', z: 30 },
    ...(s.torsoOver ?? []).map((b, i) => held(b, 'torso', 31 + i * 0.1)),
    { id: 'head', part: z(s.head), bone: 'head', z: 40 },
    ...(s.eyes === null ? [] : [{ id: 'eyes', part: z(s.eyes ?? 'shared.eyes'), bone: 'eyes', z: 41 }]),
    ...(s.hat ?? []).map((b, i) => held(b, 'head', 42 + i * 0.1)),
    { id: 'armF', part: z(arm.upper), bone: 'armF', z: 50 },
    { id: 'foreF', part: z(arm.lower), bone: 'foreF', z: 51 },
    ...(w ? [{ ...held({ tag: 'weapon', ...w }, 'handF', 52), noWidth: true }] : []),
    { id: 'handF', part: z(arm.hand), bone: 'handF', z: 53 },
    ...(s.extras ?? []),
  ];
  if (w?.muzzle) {
    // muzzle bone position in hand space, following the weapon slot transform
    const mb = bones[bones.length - 1];
    if (mb) {
      const r = ((w.rot ?? 0) * Math.PI) / 180;
      mb.x = ((w.x ?? 0) + w.muzzle.x * Math.cos(r) - w.muzzle.y * Math.sin(r)) * k;
      mb.y = ((w.y ?? 0) + w.muzzle.x * Math.sin(r) + w.muzzle.y * Math.cos(r)) * k;
    }
  }
  const legLu = 15.8 * k;
  const legDeg = 25;
  const attackClip = getClip(s.attack);
  return {
    id: s.id,
    kind: 'unit',
    rig: 'biped',
    age: s.age,
    bones,
    slots,
    palette: BIPED_ZONE_DEFAULTS(s.palette),
    heightLu: h,
    anchors: anchorsFrom(bones, { heightLu: h, headTop: { x: 1.5 * k, y: -h }, muzzleBone: w?.muzzle ? 'muzzle' : undefined, center: h * 0.5 }),
    motion: {
      family: 'biped',
      attack: s.attack,
      ability: s.ability ?? 'ability.flourish',
      twirlBone: s.twirl === false ? undefined : 'handF',
      legLu,
      legDeg,
      strideLu: strideFor(legLu, legDeg),
      speedLuPerSec: 70,
    },
    impactAt: attackClip?.impactAt ?? 0.55,
    group: s.group,
    size: s.size,
    legendary: s.legendary,
    aura: s.aura ?? (s.legendary ? 'legendary' : null),
  };
}
