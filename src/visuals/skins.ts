/**
 * Skins (DESIGN A5.8): each skin is its own manifest entry `<target visualId>@<skin>` built from the
 * base puppet with a palette outside team zones, overlays, filters (alpha), an aura, an idle
 * flourish and optionally a projectile visual.
 *
 * Clarity parity (MUST): a skin never changes silhouette, size, weapon type, team zones or facing.
 * So a skin keeps the base's bones, anchors, motion and clips; replacement parts keep the outline of
 * the part they replace; the silhouette test holds every skin to IoU >= 0.85 against its base and
 * the colour-rule test applies to its palette too.
 */
import { skinnedVisualId } from '@/core/ids';
import { isTeamZone, type Palette } from './palette';
import './parts/skins';
import { AGE_PUPPETS } from './puppets';
import { slot } from './rigs/common';
import type { BoneDef, PuppetDef, SlotDef } from './types';

export interface SkinSpec {
  /** Skin slug (the `SkinDef.id`). */
  skin: string;
  /** Base visual id (`unit.bonker`, `base.future`). */
  target: string;
  /** Non-team zone colours to override (team zones are rejected). */
  palette?: Palette;
  /** Slot id (or unsized part id) → replacement part id; the size variant of the slot is kept. */
  replace?: Readonly<Record<string, string>>;
  /** Overlay slots (tagged 'overlay' unless tagged otherwise). */
  add?: readonly SlotDef[];
  /** Extra bones (keys, antennas) for overlays and flourishes. */
  bones?: readonly BoneDef[];
  /** Whole-body translucency, at least 0.7 (A5.8). */
  alpha?: number;
  aura?: PuppetDef['aura'];
  /** Bone that the idle flourish twirls (A5.8 "the idle flourish"). */
  twirlBone?: string;
  projectileVisualId?: string;
}

const BASES = new Map<string, PuppetDef>();
for (const set of Object.values(AGE_PUPPETS)) {
  for (const p of [...set.units, ...set.turrets, ...(set.base ? [set.base] : [])]) BASES.set(p.id, p);
}

function unsized(partId: string): { id: string; suffix: string } {
  const i = partId.indexOf('*');
  return i < 0 ? { id: partId, suffix: '' } : { id: partId.slice(0, i), suffix: partId.slice(i) };
}

/** Builds a skin puppet from its base (keeps any extra fields such as base mounts). */
export function skinPuppet(s: SkinSpec): PuppetDef {
  const base = BASES.get(s.target);
  if (!base) throw new Error(`Skin "${s.skin}" targets unknown visual "${s.target}"`);
  for (const z of Object.keys(s.palette ?? {})) if (isTeamZone(z)) throw new Error(`Skin "${s.skin}" may not recolour team zone "${z}"`);
  if (s.alpha !== undefined && (s.alpha < 0.7 || s.alpha > 1)) throw new Error(`Skin "${s.skin}" alpha must be within [0.7, 1]`);
  const used = new Set<string>();
  const slots = base.slots.map((sl) => {
    const { id, suffix } = unsized(sl.part);
    const key = [sl.id, sl.part, id].find((k) => k !== undefined && s.replace?.[k] !== undefined);
    if (key === undefined) return sl;
    used.add(key);
    return { ...sl, id: sl.id ?? sl.part, part: `${s.replace?.[key] ?? sl.part}${suffix}` };
  });
  for (const k of Object.keys(s.replace ?? {})) if (!used.has(k)) throw new Error(`Skin "${s.skin}": no slot "${k}" on "${s.target}"`);
  const add = (s.add ?? []).map((a) => ({ tag: 'overlay' as const, ...a }));
  const motion = s.twirlBone ? { ...base.motion, twirlBone: s.twirlBone } : base.motion;
  const out: PuppetDef = {
    ...base,
    id: skinnedVisualId(s.target, s.skin),
    bones: [...base.bones, ...(s.bones ?? [])],
    slots: [...slots, ...add],
    palette: { ...base.palette, ...s.palette },
    motion,
    skinOf: base.id,
  };
  if (s.alpha !== undefined) out.alpha = s.alpha;
  if (s.aura !== undefined) out.aura = s.aura;
  if (s.projectileVisualId) out.projectileVisualId = s.projectileVisualId;
  return out;
}

/** The 12 v1 skins, in DESIGN A5.8 table order, then the content waves' skins. */
export const SKIN_SPECS: readonly SkinSpec[] = [
  {
    skin: 'pumpkin_head',
    target: 'unit.bonker',
    palette: { gourd: 0xc8a07c, gourd2: 0xa0805e, candle: 0xf2e0a8, stem: 0x6e7a4a },
    replace: { 'stone.hair.shaggy': 'skin.pumpkin.gourd' },
  },
  {
    skin: 'woolly_tuskback',
    target: 'unit.tuskback',
    palette: { fur: 0x9a8878, fur2: 0x7a6a5c, hair: 0xe6ddd0, wool: 0xddd4c6, wool2: 0xb8ae9e },
    add: [slot('skin.woolly.coat', 'body', 20.5)],
    aura: 'snow',
  },
  {
    skin: 'frost_matriarch',
    target: 'unit.mammoth_matriarch',
    palette: { fur: 0xc4c8cc, fur2: 0x9aa2aa, hair: 0xe6eaee, ice: 0xd2eef0 },
    replace: { 'stone.mammoth.tusk': 'skin.frost.tusk' },
    aura: 'snow',
  },
  {
    skin: 'tin_can',
    target: 'unit.footman',
    palette: { tin: 0xb8bec4, tin2: 0x949ca4 },
    replace: { 'medieval.helm.nasal': 'skin.tin_can.bucket' },
  },
  {
    skin: 'panda_paladin',
    target: 'unit.ursa_paladin',
    palette: { fur: 0xeeeae2, fur2: 0x2e2c2c, snout: 0xe0dcd4, bamboo: 0x8aa86a, bamboo2: 0x6a8450, silk: 0xefe6cf },
    replace: { 'medieval.bear.head': 'skin.panda.head', legFN: 'skin.panda.leg.front', legFF: 'skin.panda.leg.front', legBN: 'skin.panda.leg.back', legBF: 'skin.panda.leg.back' },
    add: [slot('skin.panda.banner', 'torso', 69.5, { x: -12, y: -6 })],
  },
  {
    skin: 'toy_soldier',
    target: 'unit.fusilier',
    palette: { skin: 0xf2e2d4, glove: 0xf2e2d4, cheek: 0xe8a8a0, hair: 0x3a332e, brass: 0xd8c08a },
    bones: [{ id: 'key', parent: 'torso', x: -8, y: -11 }],
    add: [slot('skin.toy.key*0.8', 'key', 2, { noWidth: true }), slot('skin.toy.cheeks', 'head', 41.5)],
    twirlBone: 'key',
  },
  {
    skin: 'ghost_corsair',
    target: 'unit.corsair',
    palette: {
      skin: 0xc8dcd6,
      forearm: 0xc8dcd6,
      glove: 0xc8dcd6,
      hair: 0x9ab0aa,
      cloth: 0x9fbab2,
      cloth2: 0xe4ecea,
      sleeve: 0xe4ecea,
      cloth3: 0x7a8e8a,
      pants: 0x7a8e8a,
      shin: 0x7a8e8a,
      leather: 0x6e807c,
      boot: 0x5a6a66,
      metal: 0xd6e2e0,
      accent: 0xc8d8b8,
    },
    alpha: 0.7,
    aura: 'ghost',
  },
  {
    skin: 'arctic_rifleman',
    target: 'unit.rifleman',
    palette: { cloth: 0xe4e6e6, sleeve: 0xe4e6e6, forearm: 0xe4e6e6, pants: 0xd6dada, shin: 0xc4caca, boot: 0x6a6e70, leather: 0x9a9e9e, cloth3: 0xb0b6b8, wool: 0xf2f0ea },
    add: [slot('skin.arctic.collar', 'torso', 31.5)],
  },
  {
    skin: 'shark_mouth',
    target: 'unit.gyrocopter',
    palette: { mouth: 0x4a3036 },
    add: [slot('skin.shark.nose', 'body', 10.5)],
  },
  {
    skin: 'synthwave',
    target: 'unit.photon_knight',
    palette: { cloth2: 0x3a3450, sleeve: 0x3a3450, forearm: 0x3a3450, shin: 0x3a3450, glow: 0xf03aa8 },
    replace: { 'future.helmet.knight': 'skin.synthwave.helm' },
    aura: 'neon',
  },
  {
    skin: 'kaiju_walker',
    target: 'unit.walker_mech',
    palette: { cloth2: 0x7d9a7a, metal2: 0x4e5e52, metal: 0xa8b8a0, glass: 0xd8e8c0, plate: 0x6a8468, eyeglow: 0xf2e6a0 },
    add: [slot('skin.kaiju.head*1.16', 'hull', 10.5), slot('skin.kaiju.spikes*1.16', 'hull', 9.5)],
  },
  {
    skin: 'crystal_spire',
    target: 'base.future',
    palette: { cloth: 0x6a5a8a, cloth2: 0xe8e0f6, metal2: 0x9a8ab8, glow: 0xf6dcf0, crystal: 0xf0e8ff },
    add: [slot('skin.crystal.facets', 'body', 1.05), slot('skin.crystal.glints', 'body', 14.5)],
  },
  // X0 Stone wave (released with the wave): procedural puppets like the 12 above.
  {
    skin: 'snowball_pebbler',
    target: 'unit.pebbler',
    palette: { wool: 0xeef0f2, wool2: 0xa9b8c4 },
    replace: { 'stone.hair.topknot': 'skin.snowball.cap' },
    aura: 'snow',
    projectileVisualId: 'proj.snowball',
  },
  {
    skin: 'fossil_sabertooth',
    target: 'unit.sabertooth',
    palette: { fur: 0xe2d8c0, fur2: 0x8a7c66, hair: 0xb8ab90, eye: 0xe0a23a },
    add: [slot('skin.fossil.ribs', 'body', 20.5)],
  },
  {
    skin: 'aurora_elk',
    target: 'unit.elk_chieftain',
    // Green and violet only (CONTENT_PLAN 5.1): a night-violet pelt, star speckles, mint and violet antlers.
    palette: { fur: 0x4f4766, fur2: 0x383150, hair: 0x6a5a8a, snout: 0xbdb4d0, aurora: 0x3af0b4, aurora2: 0xc8a8f0, starwhite: 0xf2f0ff },
    add: [slot('skin.aurora.speckles', 'body', 40.5), slot('skin.aurora.antlers', 'snout', 29.5)],
  },
  // Bronze wave (CONTENT_PLAN 5.2, released with the wave): procedural puppets like the ones above.
  {
    skin: 'marble_hoplite',
    target: 'unit.hoplite',
    // A living marble statue: white stone skin and linen, pale gold trim (kept under 40% saturation).
    palette: { skin: 0xeceae4, sleeve: 0xeceae4, forearm: 0xeceae4, glove: 0xeceae4, hair: 0xd6d2ca, cloth: 0xf2f0ea, linen: 0xf2f0ea, linen2: 0xd8d4cc, leather: 0xc9c2b6, pants: 0xc9c2b6, boot: 0xc9c2b6, metal: 0xe2d4a8, metal2: 0xb8ab88, shin: 0xe2d4a8 },
  },
  {
    skin: 'sun_chariot',
    target: 'unit.war_chariot',
    // White horses and a pale gold sunburst car.
    palette: { fur: 0xf2efe8, fur2: 0xd8d2c6, hair: 0xe8e0cc, metal: 0xe2d4a8, metal2: 0xc2b28a, wood: 0xd8c9a4, wood2: 0xb8a884, leather: 0xc9b89a },
  },
  {
    skin: 'obsidian_colossus',
    target: 'unit.bronze_colossus',
    // Black volcanic glass; its glow is lilac, never ember orange (A11).
    palette: { metal: 0x3a3440, metal2: 0x241f2a, stone: 0x3a3440, stone2: 0x2a2530, accent: 0xc9b8f0, glow: 0xe7dcff, fire: 0xc9b8f0 },
  },
  // Medieval wave (CONTENT_PLAN 5.3, released with the wave): procedural puppets like the ones above.
  {
    skin: 'greenwood_archer',
    target: 'unit.longbowman',
    // A forest outlaw: moss and leaf greens, a russet hood, a pale yew bow (all under 40% saturation).
    palette: { leather: 0x5e6b4a, sleeve: 0x5e6b4a, glove: 0x6e5a44, cloth: 0x4f5e40, pants: 0x4f5e40, shin: 0x4f5e40, boot: 0x5a4a3a, hair: 0x7a5a3e, wood: 0xc8b48c },
  },
  {
    skin: 'chess_knight',
    target: 'unit.destrier_knight',
    // A chess-set knight: an ebony horse and ivory plate, checker-white trim.
    palette: { fur: 0x2e2a2c, fur2: 0x1f1c1e, hair: 0xe8e2d4, hoof: 0x1f1c1e, metal: 0xeeeae0, metal2: 0xc9c3b6, leather: 0x3a3436 },
  },
  {
    skin: 'bone_wyrm',
    target: 'unit.lindworm',
    // A skeletal dragon: bleached bone hide, grey-brown sockets, ghost-green fire stays non-orange (A11).
    palette: { fur: 0xe2d8c0, fur2: 0xb8ab90, snout: 0xf2ecdc, hair: 0x8a7c66 },
  },
  // Gunpowder wave (CONTENT_PLAN 5.4, released with the wave): palette puppets like the ones above.
  {
    skin: 'parade_cuirassier',
    target: 'unit.cuirassier',
    // Parade dress: a white charger, a mirror-bright cuirass and a pale horsehair crest.
    palette: { fur: 0xefe6cf, fur2: 0xd2c6ae, hair: 0xe8e2d4, metal: 0xe6e8ea, metal2: 0xb8bcc0 },
  },
  {
    skin: 'fireworks_grenadier',
    target: 'unit.grenadier',
    // Firework bombs: a night-violet shell with a pink-white spark (violet is outside the colour rule's bands).
    palette: { iron: 0x5a4a7a, spark: 0xf6dcf0 },
  },
  {
    skin: 'pufferfish_balloon',
    target: 'unit.balloon_admiral',
    // A pufferfish envelope: pale sand belly and soft olive-grey back, with rope kept pale.
    palette: { cloth2: 0xe8dcb8, metal2: 0x8a8a6e, rope: 0xd8ccb4 },
  },
  // Industrial wave (CONTENT_PLAN 5.5, released with the wave): palette puppets like the ones above.
  {
    skin: 'chimney_sweep',
    target: 'unit.riveter',
    // A chimney sweep: soot-black shirt and trousers, sooty hands, a dusty charcoal cap.
    palette: { cloth2: 0x4a4746, sleeve: 0x4a4746, pants: 0x34322f, shin: 0x34322f, hair: 0x221e1c, glove: 0x2e2b29, boot: 0x2a2725, metal: 0x5a5a5c },
  },
  {
    skin: 'teapot_golem',
    target: 'unit.steam_golem',
    // A porcelain teapot: glazed white body, a soft blue floral trim (under 40% saturation), a gilt lid.
    palette: { metal: 0xf2efe8, metal2: 0xd8d2c6, cloth: 0xe8e4dc, cloth3: 0x8a9ab8, stone: 0xe8e4dc, brick: 0x8a9ab8, leather: 0xd8c08a },
  },
  {
    skin: 'circus_train',
    target: 'unit.armoured_train',
    // A circus train: cream and raspberry wagons (outside the team hue bands), gilt trim, pale bunting.
    palette: { cloth: 0x8a4a66, cloth2: 0xefe6cf, cloth3: 0xefe6cf, metal: 0xd8c08a, metal2: 0x4a3e48, stripe: 0xefe6cf, brick: 0x8a4a66, stone: 0xefe6cf, copper: 0xd8c08a },
  },
  // Modern wave (CONTENT_PLAN 5.6, released with the wave): palette puppets like the ones above.
  {
    skin: 'desert_raider',
    target: 'unit.trench_raider',
    // Desert kit: a sand drill tunic and trousers, a pale sun-bleached helmet, a dark scarf.
    palette: { cloth: 0xc8b48a, cloth2: 0xd8c8a0, sleeve: 0xd8c8a0, forearm: 0xd8c8a0, pants: 0xc8b48a, shin: 0xb8a67a, metal: 0xd2c6a8, metal2: 0x8a7c62, hair: 0x2e2826 },
  },
  {
    skin: 'tin_tankette',
    target: 'unit.tankette',
    // A wind-up tin toy: bright tinplate, cream lithographed panels, a brass key (under 40% saturation).
    palette: { cloth: 0xc8ccd0, cloth2: 0xefe6cf, cloth3: 0x9aa0a6, metal: 0xd8dce0, metal2: 0x8a9096, wood: 0xd8c08a, wood2: 0xb89a62 },
  },
  {
    skin: 'origami_fortress',
    target: 'unit.sky_fortress',
    // A folded-paper bomber: cream paper planes and pale grey creases.
    palette: { cloth: 0xf2ece0, cloth2: 0xe6dfd0, cloth3: 0xc8c2b6, metal: 0xefe9dc, metal2: 0xb8b2a6, wood: 0xe6dfd0, wood2: 0xc8c2b6 },
  },
];

export const SKIN_PUPPETS: readonly PuppetDef[] = SKIN_SPECS.map(skinPuppet);
