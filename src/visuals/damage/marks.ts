/**
 * Which mark a step lays, and where (queue item 40, design 3.2 "Variety and keying"). Pure and deterministic: the
 * order of a unit's spots and the variant of each mark come from its view seed (unit id ^ match seed, `setIdentity`),
 * the mark's kind from the blow that crossed the step (the sim's damage type), so two Footmen never look identical and a
 * replay draws the same marks.
 *
 * Kit part ids are `dmg.<mat>.<mark><n>` (`kit.ts`), e.g. `dmg.metal.dent1`.
 */
import { mulberry32 } from '@/core/rng';
import { smallBody } from './stage';
import type { BlowKind, DamageFamily, DamageSpot, DamageStage, MarkMat } from './types';
import { MARK_MATS } from './types';

/** The marks of the kit by surface; each kind has one to three drawn variants. */
export type MarkKind = 'soot' | 'tear' | 'hole' | 'scuff' | 'dust' | 'dent' | 'scratch' | 'crack' | 'plate' | 'splinter' | 'chip' | 'char' | 'shatter';

export const MARK_KIT: Readonly<Record<MarkMat, Partial<Record<MarkKind, number>>>> = {
  cloth: { soot: 2, tear: 2, hole: 1 },
  hide: { scuff: 2, dust: 1, tear: 1 },
  metal: { dent: 2, scratch: 1, crack: 1, hole: 2, plate: 1, soot: 1 },
  wood: { crack: 1, splinter: 2, hole: 1, chip: 1, char: 1 },
  stone: { chip: 2, crack: 1, shatter: 1 },
  glass: { crack: 2, shatter: 1 },
  energy: { crack: 2, shatter: 1 },
};

/** Every mark part of the kit (tests, the bake warm-up). */
export function markParts(): string[] {
  const out: string[] = [];
  for (const mat of MARK_MATS) for (const [kind, n] of Object.entries(MARK_KIT[mat])) for (let i = 1; i <= (n ?? 0); i++) out.push(`dmg.${mat}.${kind}${i}`);
  return out;
}

/** The mark a blow leaves on a surface (design 3.2: slash tears, blunt dents or cracks, a shot holes, a blast scorches). */
const KEYED: Readonly<Record<MarkMat, Readonly<Record<BlowKind, MarkKind>>>> = {
  cloth: { blunt: 'soot', slash: 'tear', pierce: 'hole', bullet: 'hole', laser: 'soot', blast: 'soot' },
  // no soot on hide and fur (a beast's coat is its skin): pale scuffs and dust, a tear in barding
  hide: { blunt: 'scuff', slash: 'tear', pierce: 'scuff', bullet: 'scuff', laser: 'dust', blast: 'dust' },
  metal: { blunt: 'dent', slash: 'scratch', pierce: 'hole', bullet: 'hole', laser: 'soot', blast: 'soot' },
  wood: { blunt: 'crack', slash: 'splinter', pierce: 'hole', bullet: 'hole', laser: 'char', blast: 'char' },
  stone: { blunt: 'crack', slash: 'chip', pierce: 'chip', bullet: 'chip', laser: 'crack', blast: 'shatter' },
  glass: { blunt: 'crack', slash: 'crack', pierce: 'crack', bullet: 'crack', laser: 'crack', blast: 'shatter' },
  energy: { blunt: 'crack', slash: 'crack', pierce: 'crack', bullet: 'crack', laser: 'crack', blast: 'shatter' },
};

/** A surface's own marks by stage when no blow is known (or none fits): light wear first, breakage last. */
const BY_STAGE: Readonly<Record<MarkMat, readonly [MarkKind, MarkKind, MarkKind]>> = {
  cloth: ['soot', 'tear', 'tear'],
  hide: ['dust', 'scuff', 'tear'],
  metal: ['dent', 'crack', 'hole'],
  wood: ['chip', 'splinter', 'splinter'],
  stone: ['chip', 'crack', 'shatter'],
  glass: ['crack', 'crack', 'shatter'],
  energy: ['crack', 'crack', 'shatter'],
};

export interface MarkChoice {
  part: string;
  kind: MarkKind;
  /** Drawn larger (an effective counter hit, x1.5 or more, design 3.2). */
  big: boolean;
}

/**
 * The mark a step lays on `mat`: the blow's own mark where the surface has it, else the surface's mark for the stage.
 * Armoured troops and machines lose a plate at their last stage (design 3.3: "armour that loses plates"); a machine
 * already shows a missing plate from stage 2.
 */
export function chooseMark(mat: MarkMat, stage: DamageStage, kind: BlowKind | null, family: DamageFamily, variantSeed: number, effective = false): MarkChoice {
  const kit = MARK_KIT[mat];
  const s = Math.max(1, Math.min(3, stage)) as 1 | 2 | 3;
  let mk: MarkKind = BY_STAGE[mat][s - 1] ?? 'scuff';
  if (kind && kit[KEYED[mat][kind]]) mk = KEYED[mat][kind];
  const plateAt = family === 'vehicle' || family === 'mech' ? 2 : family === 'armoured' ? 3 : 4;
  if (mat === 'metal' && s >= plateAt && (kind === null || kind === 'blunt' || kind === 'blast' || s === 3)) mk = 'plate';
  // a foot soldier's pelt or tunic is clothing, not a coat: it tears where a beast's would only scuff, and a dark-cored
  // tear reads on a small body at phone scale where pale scuffs, dust and soft soot wash out (W0 art review A-S2); a
  // blast or a laser still scorches
  const scorch = kind === 'blast' || kind === 'laser';
  if (smallBody(family) && (mat === 'cloth' || mat === 'hide') && (mk === 'scuff' || mk === 'dust' || (mk === 'soot' && !scorch))) mk = 'tear';
  const n = kit[mk] ?? 1;
  const variant = 1 + ((variantSeed >>> 0) % Math.max(1, n));
  return { part: `dmg.${mat}.${mk}${variant}`, kind: mk, big: effective };
}

/** A place a mark can go: one of a spot's patches (big spots hold more than one mark). */
export interface MarkSlot {
  spot: string;
  /** 0 the patch's middle; 1 and 2 off-centre (seeded side). */
  slot: number;
  mat: MarkMat;
  r: number;
  team: boolean;
  /** Offset in the spot's own frame (lu, before its rotation and scale), and the mark's own extra turn (deg). */
  dx: number;
  dy: number;
  turn: number;
  /** How much bigger than the standard the mark is drawn (`markSizeLu`): 1, or a small body's 1.2 and its bold 1.45. */
  scale: number;
}

/** A small body's marks (soldiers, armoured troops) are drawn bigger, its first, on its biggest team surface, boldest. */
export const SMALL_MARK_SCALE = 1.2;
export const BOLD_MARK_SCALE = 1.45;

/** How many marks a spot of radius `r` holds (a 6-9 lu mark kept within about 70% of r). */
export function spotCapacity(r: number): number {
  if (!(r >= 5)) return r > 0 ? 1 : 0;
  return Math.min(3, 1 + Math.floor((r - 5) / 4));
}

/** A spot's surface as a mark material (an emitter's medium is no surface). */
export function markMat(s: DamageSpot): MarkMat | null {
  return s.kind === 'mark' && (MARK_MATS as readonly string[]).includes(s.mat) ? (s.mat as MarkMat) : null;
}

/**
 * The order a unit's marks fill its spots: every spot's middle first in a seeded order, then the second patches of
 * big spots, then the third. The largest surface (shield face, tunic, hull side) is always among the first two, so a
 * stage-2 unit shows a mark on its biggest camera-facing part (design 3.6). A small body (`small`: foot troops) takes
 * its first mark on its biggest team surface, drawn boldest, and its other marks bigger (W0 art review A-S2).
 */
export function markSlots(spots: readonly DamageSpot[] | undefined, seed: number, small = false): MarkSlot[] {
  const marks = (spots ?? []).filter((s) => markMat(s) !== null);
  if (marks.length === 0) return [];
  const r = mulberry32((seed ^ 0x6d2b79f5) >>> 0 || 1);
  // a seeded Fisher-Yates over the bundle's order (stable input, deterministic output)
  const order = [...marks];
  for (let i = order.length - 1; i > 0; i--) {
    const j = r.int(i + 1);
    const t = order[i] as DamageSpot;
    order[i] = order[j] as DamageSpot;
    order[j] = t;
  }
  let big = 0;
  for (let i = 1; i < order.length; i++) if ((order[i]?.r ?? 0) > (order[big]?.r ?? 0)) big = i;
  if (small) {
    // the first mark on the biggest team surface (the colour that names the side), else the biggest surface
    let team = -1;
    for (let i = 0; i < order.length; i++) if (order[i]?.team === true && (team < 0 || (order[i]?.r ?? 0) > (order[team]?.r ?? 0))) team = i;
    const first = team >= 0 ? team : big;
    if (first > 0) {
      const t = order[0] as DamageSpot;
      order[0] = order[first] as DamageSpot;
      order[first] = t;
    }
  } else if (big > 1) {
    const at = r.int(2);
    const t = order[at] as DamageSpot;
    order[at] = order[big] as DamageSpot;
    order[big] = t;
  }
  const bold = small ? order[0] : undefined;
  const out: MarkSlot[] = [];
  for (let pass = 0; pass < 3; pass++) {
    for (const s of order) {
      if (spotCapacity(s.r) <= pass) continue;
      const a = r.next() * Math.PI * 2;
      const off = pass === 0 ? 0.12 * s.r * r.next() : 0.42 * s.r;
      out.push({
        spot: s.id,
        slot: pass,
        mat: markMat(s) as MarkMat,
        r: s.r,
        team: s.team === true,
        dx: Math.cos(a) * off,
        dy: Math.sin(a) * off,
        turn: Math.round((r.next() - 0.5) * 60),
        scale: small ? (pass === 0 && s === bold ? BOLD_MARK_SCALE : SMALL_MARK_SCALE) : 1,
      });
    }
  }
  return out;
}

/**
 * The size a mark is drawn at on its spot (lu across): 6-9 lu, never past about 70% of the patch, bigger when big; a
 * small body's (`scale` > 1) bigger still, within about 85% of the patch so it stays on its surface.
 */
export function markSizeLu(r: number, big: boolean, scale = 1): number {
  const fit = Math.max(6, Math.min(9, 1.3 * r));
  const base = Math.min(fit * (big ? 1.18 : 1), Math.max(6, 1.4 * r) * (big ? 1.1 : 1));
  return scale === 1 ? base : Math.min(base * scale, Math.max(base, 1.75 * r));
}

/** The strip a step hangs from a strip spot: cloth and hide hang a torn strip, metal a cable, wood a rope. */
export function stripPart(mat: string, variantSeed: number): string {
  if (mat === 'metal' || mat === 'energy') return 'dmg.strip.cable1';
  if (mat === 'wood') return 'dmg.strip.rope1';
  return `dmg.strip.cloth${1 + ((variantSeed >>> 0) % 3)}`;
}

/** The stage from which a family hangs its strip (design 3.3: a torn tabard, barding or envelope at stage 2). */
export function stripFrom(family: DamageFamily): DamageStage {
  return family === 'vehicle' || family === 'energy' ? 3 : 2;
}
