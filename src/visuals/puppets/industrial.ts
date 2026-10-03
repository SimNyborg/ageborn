/**
 * Industrial Age puppets (DESIGN A17.10 units and turrets, A17.12 art notes, the Foundry base).
 * Each entry is a procedural visual source keyed like its manifest id; the 3D sprite sheets
 * (`public/art/units/industrial`) replace the units once loaded, and these stay the fallback.
 */
import { AGE_ZONES } from '../palette';
import '../parts/industrial';
import { sized } from '../parts/registry';
import { base, type BasePuppet } from '../rigs/base';
import { biped } from '../rigs/biped';
import { slot } from '../rigs/common';
import { vehicle, walker } from '../rigs/machines';
import { turret, type TurretPuppet } from '../rigs/turret';
import type { BoneDef, PuppetDef, SlotDef } from '../types';

const Z = AGE_ZONES.industrial;
const zone = (k: string): number => Z[k] ?? 0x888888;

/** Extra Industrial zones (all under the colour rule's 40% saturation in the team hue bands). */
const X = {
  ...Z,
  brick: 0x8a6a63,
  glass: 0xd6e2de,
  glow: 0xfff4dc,
  fire: 0xf4d2a4,
  lamp: 0xf6e8c4,
  sand: 0xc8b890,
  stripe: 0xe8e0cc,
  coin: 0xe6c45c,
  smoke: 0x9a948c,
};

/** Workers and soldiers: cream shirtsleeves, iron trousers, leather boots. */
const worker = { ...X, sleeve: zone('cloth2'), forearm: zone('skin'), glove: zone('leather'), pants: zone('cloth'), shin: zone('cloth'), boot: zone('leather') };

function scaleBones(bones: BoneDef[], k: number): BoneDef[] {
  return bones.map((b) => ({ ...b, x: b.x * k, y: b.y * k }));
}
function scaleSlots(slots: SlotDef[], k: number): SlotDef[] {
  return slots.map((s) => ({ ...s, part: sized(s.part, k), x: (s.x ?? 0) * k, y: (s.y ?? 0) * k }));
}

const GOLEM_K = 1.02;

export const INDUSTRIAL_UNITS: PuppetDef[] = [
  biped({
    id: 'unit.riveter',
    age: 'industrial',
    palette: { ...worker, skin: 0xcfa98c, hair: 0x3f3530, pants: zone('cloth') },
    head: 'industrial.head.worker',
    eyes: 'shared.eyes.angry',
    hat: [{ part: 'industrial.cap', tag: 'prop' }, { part: 'industrial.moustache' }],
    torso: 'industrial.torso.overalls',
    pelvis: 'industrial.pelvis.overalls',
    weapon: { part: 'industrial.wrench', rot: 100 },
    pose: { armF: -30, foreF: -50, armB: 10, foreB: -30 },
    attack: 'biped.attack.swing',
    group: 'infantry',
    size: 'small',
  }),
  biped({
    id: 'unit.carbineer',
    age: 'industrial',
    palette: { ...worker, skin: 0xa8876f, hair: 0x2e2826, sleeve: zone('cloth'), forearm: zone('cloth') },
    head: 'industrial.head.soldier',
    hat: [{ part: 'industrial.hat.brim', tag: 'prop' }],
    torso: 'industrial.torso.greatcoat',
    pelvis: 'industrial.pelvis.coat',
    weapon: { part: 'industrial.carbine', rot: 180, y: 2, muzzle: { x: 0, y: -30 } },
    pose: { armF: -78, foreF: -12, armB: -64, foreB: -46 },
    attack: 'biped.attack.shoot',
    group: 'ranged',
    size: 'small',
    twirl: false,
  }),
  walker({
    id: 'unit.steam_golem',
    age: 'industrial',
    palette: X,
    height: 108,
    center: 44 * GOLEM_K,
    bones: scaleBones(
      [
        { id: 'hull', parent: 'spin', x: 0, y: 0 },
        { id: 'head', parent: 'hull', x: 4, y: -40 },
        { id: 'chimney', parent: 'hull', x: -16, y: -36 },
        { id: 'legB', parent: 'hull', x: -8, y: 8 },
        { id: 'shinB', parent: 'legB', x: 0, y: 17 },
        { id: 'footB', parent: 'shinB', x: 0, y: 17 },
        { id: 'legF', parent: 'hull', x: 8, y: 8 },
        { id: 'shinF', parent: 'legF', x: 0, y: 17 },
        { id: 'footF', parent: 'shinF', x: 0, y: 17 },
        { id: 'armB', parent: 'hull', x: -20, y: -30, rot: 12 },
        { id: 'foreB', parent: 'armB', x: 0, y: 15, rot: -30 },
        { id: 'armF', parent: 'hull', x: 20, y: -30, rot: -26 },
        { id: 'foreF', parent: 'armF', x: 0, y: 15, rot: -44 },
      ],
      GOLEM_K,
    ),
    slots: scaleSlots(
      [
        slot('industrial.golem.upperarm', 'armB', 3, { tone: 'back', noWidth: true }),
        slot('industrial.golem.fist', 'foreB', 4, { tone: 'back', noWidth: true, id: 'fistB' }),
        slot('industrial.golem.thigh', 'legB', 5, { tone: 'back' }),
        slot('industrial.golem.shin', 'shinB', 6, { tone: 'back' }),
        slot('industrial.golem.foot', 'footB', 7, { tone: 'back' }),
        slot('industrial.golem.chimney', 'chimney', 8),
        // A11 redundant team cue: a pennant on every heavy
        slot('industrial.golem.flag', 'hull', 9.5, { x: -18, y: -34, id: 'pennant', noWidth: true }),
        slot('industrial.golem.hull', 'hull', 10),
        slot('industrial.golem.head', 'head', 11),
        slot('industrial.golem.thigh', 'legF', 12, { id: 'thighF' }),
        slot('industrial.golem.shin', 'shinF', 13, { id: 'shinFs' }),
        slot('industrial.golem.foot', 'footF', 14, { id: 'footFs' }),
        slot('industrial.golem.upperarm', 'armF', 15, { id: 'upperF', noWidth: true }),
        slot('industrial.golem.fist', 'foreF', 16, { tag: 'weapon', noWidth: true }),
      ],
      GOLEM_K,
    ),
    attack: 'walker.attack.punch',
    ability: 'ability.stomp',
    group: 'heavy',
    size: 'large',
    legLen: 34 * GOLEM_K,
    legDeg: 20,
    speed: 55,
  }),
  biped({
    id: 'unit.harpoon_gunner',
    age: 'industrial',
    height: 70,
    palette: { ...worker, skin: 0xe8c9ad, hair: 0x5a4a3e, sleeve: zone('cloth'), forearm: zone('skin') },
    head: 'industrial.head.worker',
    eyes: 'shared.eyes.angry',
    hat: [{ part: 'industrial.goggles', tag: 'prop' }],
    torso: 'industrial.torso.vest',
    arm: { upper: 'industrial.arm.band' },
    back: [{ part: 'industrial.ropecoil', x: -9, y: -10 }],
    pelvis: 'industrial.pelvis.trousers',
    weapon: { part: 'industrial.harpoongun', rot: 170, x: 0, y: 6, muzzle: { x: 0, y: -42 } },
    pose: { armF: -120, foreF: 40, armB: -60, foreB: -50 },
    attack: 'biped.attack.heavyShot',
    ability: 'ability.reel',
    group: 'antiArmor',
    size: 'medium',
    twirl: false,
  }),
  biped({
    id: 'unit.flare_spotter',
    age: 'industrial',
    height: 66,
    palette: { ...worker, skin: 0x86695a, hair: 0x2a2530, sleeve: zone('cloth'), forearm: zone('cloth') },
    head: 'industrial.head.scout',
    hat: [{ part: 'industrial.kepi', tag: 'prop' }],
    torso: 'industrial.torso.jacket',
    torsoOver: [{ part: 'industrial.binoculars', x: 3, y: -12 }],
    arm: { upper: 'industrial.arm.band' },
    pelvis: 'industrial.pelvis.trousers',
    weapon: { part: 'industrial.flarepistol', rot: 180, y: 1, muzzle: { x: 0, y: -18 } },
    pose: { armF: -78, foreF: -12, armB: 10, foreB: -30 },
    attack: 'biped.attack.shoot',
    ability: 'ability.radio_call',
    group: 'support',
    size: 'small',
    twirl: false,
  }),
  biped({
    id: 'unit.sapper',
    age: 'industrial',
    height: 64,
    palette: { ...worker, skin: 0xcfa98c, hair: 0x3f3530 },
    head: 'industrial.head.worker',
    eyes: 'shared.eyes.angry',
    hat: [{ part: 'industrial.helmet.sapper', tag: 'prop' }],
    torso: 'industrial.torso.vest',
    back: [{ part: 'industrial.chargebox', x: -10, y: -10, rot: -8 }],
    pelvis: 'industrial.pelvis.trousers',
    weapon: { part: 'industrial.pick', rot: 100 },
    pose: { armF: -30, foreF: -50, armB: 20, foreB: -30, torso: 14, legF: -18, legB: 12 },
    attack: 'biped.attack.swing',
    ability: 'ability.charge_lean',
    group: 'epic',
    size: 'medium',
  }),
  vehicle({
    id: 'unit.land_dreadnought',
    age: 'industrial',
    palette: { ...X, skin: 0xcfa98c },
    height: 178,
    center: 34,
    bones: [
      { id: 'hull', parent: 'spin', x: 0, y: 34 },
      { id: 'treadTeeth', parent: 'hull', x: 0, y: 0 },
      { id: 'wheel1', parent: 'hull', x: -36, y: -8 },
      { id: 'wheel2', parent: 'hull', x: -12, y: -8 },
      { id: 'wheel3', parent: 'hull', x: 12, y: -8 },
      { id: 'wheel4', parent: 'hull', x: 36, y: -8 },
      { id: 'sponsonB', parent: 'hull', x: 14, y: -26 },
      { id: 'sponsonF', parent: 'hull', x: 24, y: -18 },
      { id: 'turret', parent: 'hull', x: 0, y: -62 },
      { id: 'barrel', parent: 'sponsonF', x: 14, y: -10 },
      { id: 'muzzle', parent: 'barrel', x: 38, y: 0 },
      { id: 'stack', parent: 'hull', x: -24, y: -60 },
      { id: 'flag1', parent: 'turret', x: -12, y: -28 },
    ],
    slots: [
      slot('industrial.landship.flag', 'flag1', 4, { noWidth: true }),
      slot('industrial.landship.stack', 'stack', 5),
      slot('industrial.landship.sponson', 'sponsonB', 6, { tone: 'back', id: 'sponsonFar', noWidth: true }),
      slot('industrial.landship.cab', 'turret', 7),
      slot('industrial.landship.tread', 'hull', 10),
      slot('industrial.landship.teeth', 'treadTeeth', 11, { y: -2 }),
      slot('industrial.landship.roadwheel', 'wheel1', 12),
      slot('industrial.landship.roadwheel', 'wheel2', 12, { id: 'rw2' }),
      slot('industrial.landship.roadwheel', 'wheel3', 12, { id: 'rw3' }),
      slot('industrial.landship.roadwheel', 'wheel4', 12, { id: 'rw4' }),
      slot('industrial.landship.hull', 'hull', 14),
      slot('industrial.landship.gun', 'barrel', 15, { tag: 'weapon', noWidth: true }),
      slot('industrial.landship.sponson', 'sponsonF', 16, { noWidth: true }),
    ],
    muzzleBone: 'muzzle',
    attack: 'vehicle.attack.recoil',
    ability: 'ability.recoil',
    group: 'legendary',
    size: 'huge',
    legendary: true,
    wheelRadius: 6,
    speed: 35,
  }),
];

/** W5 Industrial wave (CONTENT_PLAN 5.5): a vehicle fallback built from the landship parts at scale k. */
function machine(id: string, height: number, k: number, group: 'heavy' | 'epic' | 'legendary', size: 'large' | 'huge', speed: number, legendary = false): PuppetDef {
  const bones: BoneDef[] = [
    { id: 'hull', parent: 'spin', x: 0, y: 34 },
    { id: 'treadTeeth', parent: 'hull', x: 0, y: 0 },
    { id: 'wheel1', parent: 'hull', x: -36, y: -8 },
    { id: 'wheel4', parent: 'hull', x: 36, y: -8 },
    { id: 'turret', parent: 'hull', x: 0, y: -62 },
    { id: 'barrel', parent: 'turret', x: 14, y: -10 },
    { id: 'muzzle', parent: 'barrel', x: 38, y: 0 },
    { id: 'stack', parent: 'hull', x: -24, y: -60 },
    { id: 'flag1', parent: 'turret', x: -12, y: -28 },
    { id: 'sponsonF', parent: 'hull', x: 24, y: -18 },
  ];
  return vehicle({
    id,
    age: 'industrial',
    palette: { ...X, skin: 0xcfa98c },
    height,
    center: 34 * k,
    bones: scaleBones(bones, k),
    slots: scaleSlots([
      slot('industrial.landship.flag', 'flag1', 4, { noWidth: true }),
      slot('industrial.landship.stack', 'stack', 5),
      slot('industrial.landship.cab', 'turret', 7),
      slot('industrial.landship.tread', 'hull', 10),
      slot('industrial.landship.roadwheel', 'wheel1', 12),
      slot('industrial.landship.roadwheel', 'wheel4', 12, { id: 'rw4' }),
      slot('industrial.landship.hull', 'hull', 14),
      slot('industrial.landship.gun', 'barrel', 15, { tag: 'weapon', noWidth: true }),
      slot('industrial.landship.sponson', 'sponsonF', 16, { noWidth: true }),
    ], k),
    muzzleBone: 'muzzle',
    attack: 'vehicle.attack.recoil',
    ability: 'ability.recoil',
    group,
    size,
    legendary,
    wheelRadius: 6 * k,
    speed,
  });
}

/** W5 Industrial wave: a biped fallback with the age's worker look. */
function worker2(id: string, height: number, o: Partial<Parameters<typeof biped>[0]>): PuppetDef {
  return biped({
    id,
    age: 'industrial',
    height,
    palette: { ...worker, skin: 0xcfa98c, hair: 0x3f3530 },
    head: 'industrial.head.worker',
    eyes: 'shared.eyes.angry',
    torso: 'industrial.torso.vest',
    pelvis: 'industrial.pelvis.trousers',
    pose: { armF: -30, foreF: -50, armB: 10, foreB: -30 },
    attack: 'biped.attack.swing',
    group: 'infantry',
    size: 'small',
    ...o,
  } as Parameters<typeof biped>[0]);
}

export const INDUSTRIAL_WAVE_UNITS: PuppetDef[] = [
  worker2('unit.coal_miners', 66, { hat: [{ part: 'industrial.helmet.sapper', tag: 'prop' }], weapon: { part: 'industrial.pick', rot: 100 } }),
  worker2('unit.iron_mantlet', 66, {
    hat: [{ part: 'industrial.kepi', tag: 'prop' }], torso: 'industrial.torso.jacket',
    weapon: { part: 'industrial.carbine', rot: 180, y: 2, muzzle: { x: 0, y: -30 } },
    offhand: { part: sized('industrial.chargebox', 1.6), rot: 0, y: 2 },
  }),
  worker2('unit.dispatch_rider', 74, { hat: [{ part: 'industrial.goggles', tag: 'prop' }], torso: 'industrial.torso.overalls', pelvis: 'industrial.pelvis.overalls', weapon: { part: 'industrial.wrench', rot: 100 }, size: 'medium' }),
  worker2('unit.bomb_bowler', 66, {
    hat: [{ part: 'industrial.cap', tag: 'prop' }], weapon: { part: 'industrial.chargebox', rot: 20, muzzle: { x: 0, y: -4 } },
    attack: 'biped.attack.throw', group: 'ranged',
  }),
  machine('unit.steam_tractor', 104, 0.6, 'heavy', 'large', 50),
  worker2('unit.trench_mortar', 66, {
    hat: [{ part: 'industrial.helmet.sapper', tag: 'prop' }], torso: 'industrial.torso.overalls', pelvis: 'industrial.pelvis.overalls',
    weapon: { part: 'industrial.flarepistol', rot: 120, y: 1, muzzle: { x: 0, y: -18 } },
    attack: 'biped.attack.shoot', group: 'ranged',
  }),
  worker2('unit.steam_driller', 68, {
    hat: [{ part: 'industrial.goggles', tag: 'prop' }], torso: 'industrial.torso.overalls', pelvis: 'industrial.pelvis.overalls',
    weapon: { part: 'industrial.harpoongun', rot: 170, x: 0, y: 6, muzzle: { x: 0, y: -42 } },
    pose: { armF: -120, foreF: 40, armB: -60, foreB: -50 }, group: 'antiArmor', size: 'medium',
  }),
  worker2('unit.bandmaster', 70, {
    hat: [{ part: 'industrial.kepi', tag: 'prop' }, { part: 'industrial.moustache' }], torso: 'industrial.torso.greatcoat', pelvis: 'industrial.pelvis.coat',
    weapon: { part: 'industrial.flarepistol', rot: 180, y: 1, muzzle: { x: 0, y: -18 } },
    attack: 'biped.attack.shoot', group: 'support',
  }),
  worker2('unit.clockwork_tinker', 64, {
    hat: [{ part: 'industrial.goggles', tag: 'prop' }, { part: 'industrial.moustache' }], torso: 'industrial.torso.overalls', pelvis: 'industrial.pelvis.overalls',
    weapon: { part: 'industrial.wrench', rot: 100 }, group: 'support',
  }),
  worker2('unit.clockwork_soldier', 58, { hat: [{ part: 'industrial.kepi', tag: 'prop' }], torso: 'industrial.torso.jacket', weapon: { part: 'industrial.carbine', rot: 160, y: 2, muzzle: { x: 0, y: -30 } } }),
  machine('unit.armoured_car', 74, 0.45, 'epic', 'large', 55),
  worker2('unit.alpine_climber', 66, {
    hat: [{ part: 'industrial.hat.brim', tag: 'prop' }], back: [{ part: 'industrial.ropecoil', x: -9, y: -10 }],
    weapon: { part: 'industrial.pick', rot: 100 }, group: 'epic', size: 'medium',
  }),
  worker2('unit.spark_scientist', 68, {
    hat: [{ part: 'industrial.goggles', tag: 'prop' }], torso: 'industrial.torso.greatcoat', pelvis: 'industrial.pelvis.coat',
    weapon: { part: 'industrial.carbine', rot: 180, y: 2, muzzle: { x: 0, y: -30 } },
    attack: 'biped.attack.shoot', group: 'epic',
  }),
  machine('unit.armoured_train', 174, 1.0, 'legendary', 'huge', 40, true),
];

export const INDUSTRIAL_TURRETS: TurretPuppet[] = [
  turret({
    id: 'turret.gatling_gun',
    age: 'industrial',
    palette: X,
    height: 32,
    bones: [
      { id: 'pivot', parent: 'root', x: 0, y: -18 },
      { id: 'barrel', parent: 'pivot', x: 0, y: 0 },
      { id: 'muzzle', parent: 'pivot', x: 30, y: 0 },
    ],
    slots: [slot('industrial.turret.flag', 'root', 5, { x: -14, y: -4 }), slot('industrial.turret.tripod', 'root', 10), slot('industrial.turret.gatling', 'barrel', 12)],
    aim: [-40, 25],
  }),
  turret({
    id: 'turret.mortar_pit',
    age: 'industrial',
    palette: X,
    height: 30,
    bones: [
      { id: 'pivot', parent: 'root', x: 0, y: -10, rot: -60 },
      { id: 'barrel', parent: 'pivot', x: 0, y: 0 },
      { id: 'muzzle', parent: 'pivot', x: 19, y: 0 },
    ],
    slots: [slot('industrial.turret.flag', 'root', 5, { x: -16, y: -6 }), slot('industrial.turret.tube', 'barrel', 9), slot('industrial.turret.sandbags', 'root', 12)],
    aim: [0, 0],
  }),
  turret({
    id: 'turret.boiler_mortar',
    age: 'industrial',
    palette: X,
    height: 44,
    bones: [
      { id: 'pivot', parent: 'root', x: 2, y: -22, rot: -55 },
      { id: 'barrel', parent: 'pivot', x: 0, y: 0 },
      { id: 'muzzle', parent: 'pivot', x: 26, y: 0 },
    ],
    slots: [slot('industrial.turret.flag', 'root', 5, { x: -18, y: -18 }), slot('industrial.turret.heavyMortar', 'barrel', 9), slot('industrial.turret.boiler', 'root', 12)],
    aim: [0, 0],
  }),
  turret({
    id: 'turret.tesla_tower',
    age: 'industrial',
    palette: X,
    height: 48,
    bones: [
      { id: 'pivot', parent: 'root', x: 0, y: 0 },
      { id: 'orb', parent: 'pivot', x: 0, y: -40 },
      { id: 'muzzle', parent: 'pivot', x: 0, y: -40 },
    ],
    slots: [slot('industrial.turret.flag', 'root', 5, { x: -16, y: -4 }), slot('industrial.turret.teslaTower', 'pivot', 10), slot('industrial.turret.globe', 'orb', 12)],
    aim: [0, 0],
  }),
  // W5 Industrial wave (CONTENT_PLAN 5.5)
  turret({
    id: 'turret.rivet_spitter',
    age: 'industrial',
    palette: X,
    height: 32,
    bones: [
      { id: 'pivot', parent: 'root', x: 0, y: -18 },
      { id: 'barrel', parent: 'pivot', x: 0, y: 0 },
      { id: 'muzzle', parent: 'pivot', x: 26, y: 0 },
    ],
    slots: [slot('industrial.turret.flag', 'root', 5, { x: -14, y: -4 }), slot('industrial.turret.tripod', 'root', 10), slot('industrial.turret.gatling', 'barrel', 12)],
    aim: [-40, 40],
  }),
  turret({
    id: 'turret.steam_hammer',
    age: 'industrial',
    palette: X,
    height: 48,
    bones: [
      { id: 'pivot', parent: 'root', x: 0, y: 0 },
      { id: 'orb', parent: 'pivot', x: 0, y: -16 },
      { id: 'muzzle', parent: 'pivot', x: 0, y: -6 },
    ],
    slots: [slot('industrial.turret.flag', 'root', 5, { x: -16, y: -4 }), slot('industrial.turret.boiler', 'root', 10)],
    aim: [0, 0],
  }),
];

export const INDUSTRIAL_BASE: BasePuppet = base({
  id: 'base.industrial',
  age: 'industrial',
  palette: X,
  height: 300,
  width: 156,
  bones: [
    { id: 'body', parent: 'root', x: 0, y: 0 },
    { id: 'flag1', parent: 'body', x: -38, y: -286 },
    { id: 'flag2', parent: 'body', x: -154, y: -120 },
    { id: 'torch1', parent: 'body', x: -66, y: -58 },
    { id: 'torch2', parent: 'body', x: -12, y: -58 },
    { id: 'smoke', parent: 'body', x: -126, y: -306 },
  ],
  slots: [
    slot('industrial.base.gantry', 'body', 0.3, { x: -150 }),
    slot('industrial.base.chimney', 'body', 0.5),
    slot('industrial.base.chunk', 'body', 0.6, { when: { crumbleMax: 1 } }),
    slot('industrial.base.flag', 'flag1', 0.8, { when: { crumbleMax: 2 } }),
    slot('industrial.base.tower', 'body', 1),
    slot('industrial.base.works', 'body', 2),
    slot('industrial.base.banner', 'body', 2.5, { when: { crumbleMax: 2 } }),
    slot('industrial.base.door', 'body', 3),
    slot('industrial.base.crack1', 'body', 4, { when: { crumbleMin: 1 } }),
    slot('industrial.base.crack2', 'body', 4.1, { when: { crumbleMin: 2 } }),
    slot('industrial.base.flag', 'flag2', 5, { when: { crumbleMax: 2 }, id: 'flagSide' }),
    slot('industrial.base.lamp', 'torch1', 9),
    slot('industrial.base.lamp', 'torch2', 9),
    slot('industrial.base.ledge', 'body', 10, { x: -8, y: -40 }),
    slot('industrial.base.ledge', 'body', 10, { x: -12, y: -84, id: 'ledge2' }),
    slot('industrial.base.ledge', 'body', 10, { x: -20, y: -126, id: 'ledge3' }),
    slot('industrial.base.ledge', 'body', 10, { x: -38, y: -192, id: 'ledge4' }),
    slot('industrial.base.treasury1', 'body', 12, { x: -144, y: 0, when: { treasuryMin: 1 } }),
    slot('industrial.base.treasury2', 'body', 12, { x: -120, y: 0, when: { treasuryMin: 2 } }),
    slot('industrial.base.treasury3', 'body', 12.1, { x: -96, y: 0, when: { treasuryMin: 3 } }),
    slot('industrial.base.rubble', 'body', 13, { when: { crumbleMin: 2 } }),
    slot('industrial.base.smoke', 'smoke', 14, { when: { crumbleMin: 3 } }),
  ],
  mounts: [
    { x: -8, y: -45 },
    { x: -12, y: -89 },
    { x: -20, y: -131 },
    { x: -38, y: -197 },
  ],
  hornAt: { x: -80, y: -330 },
  flags: ['flag1', 'flag2'],
  flickers: ['torch1', 'torch2'],
});
