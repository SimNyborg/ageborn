/**
 * Modern Age puppets (DESIGN A5.5 units and turrets, A11 art direction, the Bunker base).
 * Each entry is a procedural visual source keyed like its manifest id.
 */
import { AGE_ZONES } from '../palette';
import '../parts/modern';
import { sized } from '../parts/registry';
import { base, type BasePuppet } from '../rigs/base';
import { biped } from '../rigs/biped';
import { slot } from '../rigs/common';
import { flyer, vehicle } from '../rigs/machines';
import { turret, type TurretPuppet } from '../rigs/turret';
import type { BoneDef, PuppetDef, SlotDef } from '../types';

const Z = AGE_ZONES.modern;
const zone = (k: string): number => Z[k] ?? 0x888888;

/** Extra modern zones (under the colour rule's 40% saturation in the team hue bands). */
const X = {
  ...Z,
  sand: 0xb8a67a,
  sand2: 0x9a8a62,
  lens: 0x9fb4b0,
  glass: 0xd6e2e0,
  lamp: 0xf6efc8,
  concrete: 0x8f8f88,
  concrete2: 0x6f706a,
  coin: 0xe6c45c,
  coin2: 0xb89235,
  smoke: 0x9a948c,
  puttee: 0x8a8060,
};

const khaki = zone('cloth2');
const soldier = { ...X, sleeve: khaki, forearm: khaki, glove: zone('skin'), pants: khaki, shin: X.puttee, boot: 0x3a332e };
const olive = { ...soldier, sleeve: zone('cloth'), forearm: zone('cloth') };

/** Scales a list of bones' positions (machine rigs authored at one size, shipped at another). */
function scaleBones(bones: BoneDef[], k: number): BoneDef[] {
  return bones.map((b) => ({ ...b, x: b.x * k, y: b.y * k }));
}
function scaleSlots(slots: SlotDef[], k: number): SlotDef[] {
  return slots.map((s) => ({ ...s, part: sized(s.part, k), x: (s.x ?? 0) * k, y: (s.y ?? 0) * k }));
}

const BEHEMOTH_K = 1;
const GYRO_K = 0.84;

export const MODERN_UNITS: PuppetDef[] = [
  biped({
    id: 'unit.trench_raider',
    age: 'modern',
    palette: { ...soldier, skin: 0xcfa98c, glove: 0xcfa98c, hair: 0x5a4a3e },
    head: 'modern.head.tommy',
    eyes: 'shared.eyes.angry',
    hat: [{ part: 'modern.helmet.brodie', tag: 'prop' }],
    torso: 'modern.torso.tunic',
    pelvis: 'modern.pelvis.trousers',
    weapon: { part: 'modern.club', rot: 100 },
    pose: { armF: -30, foreF: -50, armB: 12, foreB: -30 },
    attack: 'biped.attack.swing',
    group: 'infantry',
    size: 'small',
  }),
  biped({
    id: 'unit.rifleman',
    age: 'modern',
    palette: olive,
    head: 'modern.head.rifle',
    hat: [{ part: 'modern.helmet.net', tag: 'prop' }],
    torso: 'modern.torso.jacket',
    pelvis: 'modern.pelvis.trousers',
    weapon: { part: 'modern.rifle', rot: 180, y: 2, muzzle: { x: 0, y: -41 } },
    pose: { armF: -78, foreF: -12, armB: -64, foreB: -46 },
    attack: 'biped.attack.shoot',
    group: 'ranged',
    size: 'small',
    twirl: false,
  }),
  vehicle({
    id: 'unit.tankette',
    age: 'modern',
    palette: { ...X, skin: 0xcfa98c },
    height: 98,
    center: 30,
    bones: [
      { id: 'hull', parent: 'spin', x: 0, y: 30 },
      { id: 'treadTeeth', parent: 'hull', x: 0, y: 0 },
      { id: 'wheel1', parent: 'hull', x: -18, y: -8.6 },
      { id: 'wheel2', parent: 'hull', x: -6, y: -8.6 },
      { id: 'wheel3', parent: 'hull', x: 6, y: -8.6 },
      { id: 'wheel4', parent: 'hull', x: 18, y: -8.6 },
      { id: 'turret', parent: 'hull', x: 0, y: -44 },
      { id: 'barrel', parent: 'turret', x: 14, y: -9 },
      { id: 'muzzle', parent: 'barrel', x: 28, y: 0 },
      { id: 'commander', parent: 'turret', x: -2, y: -18 },
      { id: 'flag1', parent: 'turret', x: -12, y: -19 },
    ],
    slots: [
      slot('modern.tank.flag', 'flag1', 4, { noWidth: true }),
      slot('modern.tank.tread', 'hull', 10),
      slot('modern.tank.teeth', 'treadTeeth', 11, { y: -1.6 }),
      slot('modern.tank.roadwheel', 'wheel1', 12),
      slot('modern.tank.roadwheel', 'wheel2', 12, { id: 'rw2' }),
      slot('modern.tank.roadwheel', 'wheel3', 12, { id: 'rw3' }),
      slot('modern.tank.roadwheel', 'wheel4', 12, { id: 'rw4' }),
      slot('modern.tank.hull', 'hull', 14),
      slot('modern.tank.gun', 'barrel', 15, { tag: 'weapon', noWidth: true }),
      slot('modern.tank.commander', 'commander', 15.5, { tag: 'prop' }),
      slot('modern.tank.turret', 'turret', 16),
    ],
    muzzleBone: 'muzzle',
    attack: 'vehicle.attack.recoil',
    ability: 'ability.recoil',
    group: 'heavy',
    size: 'large',
    wheelRadius: 5.4,
    speed: 50,
  }),
  biped({
    id: 'unit.bazooka_trooper',
    age: 'modern',
    height: 70,
    palette: { ...olive, skin: 0x86695a, glove: 0x86695a, hair: 0x2e2826 },
    head: 'modern.head.bazooka',
    eyes: 'shared.eyes.angry',
    hat: [{ part: 'modern.helmet.goggles', tag: 'prop' }],
    torso: 'modern.torso.jacket',
    pelvis: 'modern.pelvis.trousers',
    weapon: { part: 'modern.bazooka', rot: 170, x: 0, y: 6, muzzle: { x: 0, y: -32 } },
    pose: { armF: -120, foreF: 40, armB: -60, foreB: -50 },
    attack: 'biped.attack.heavyShot',
    group: 'antiArmor',
    size: 'medium',
    twirl: false,
  }),
  biped({
    id: 'unit.radio_operator',
    age: 'modern',
    palette: { ...olive, skin: 0xe8c9ad, glove: 0xe8c9ad, hair: 0x8a6a50 },
    head: 'modern.head.radio',
    hat: [{ part: 'modern.cap.radio', tag: 'prop' }],
    torso: 'modern.torso.radio',
    back: [{ part: 'modern.radio.pack', x: -10, y: -10 }],
    pelvis: 'modern.pelvis.trousers',
    weapon: { part: 'modern.carbine', rot: 180, y: 1, muzzle: { x: 0, y: -26 } },
    offhand: { part: 'modern.radio.handset', rot: 10 },
    extraBones: [{ id: 'antenna', parent: 'torso', x: -12, y: -18 }],
    extras: [slot('modern.radio.antenna', 'antenna', 1.9)],
    pose: { armF: -78, foreF: -12, armB: 10, foreB: -20 },
    attack: 'biped.attack.shoot',
    ability: 'ability.radio_call',
    group: 'support',
    size: 'small',
    twirl: false,
  }),
  flyer({
    id: 'unit.gyrocopter',
    age: 'modern',
    palette: { ...X, skin: 0xcfa98c },
    height: 56,
    center: 22 * GYRO_K,
    bones: scaleBones(
      [
        { id: 'body', parent: 'spin', x: 0, y: 4.6 },
        { id: 'mast', parent: 'body', x: 0, y: -12 },
        { id: 'rotor', parent: 'mast', x: 0, y: -19 },
        { id: 'prop', parent: 'body', x: -31, y: -4 },
        { id: 'pilot', parent: 'body', x: 2, y: -8 },
        { id: 'barrel', parent: 'body', x: 24, y: 2 },
        { id: 'muzzle', parent: 'barrel', x: 14, y: 0 },
      ],
      GYRO_K,
    ),
    slots: scaleSlots(
      [
        slot('modern.gyro.mast', 'mast', 7),
        slot('modern.gyro.prop', 'prop', 8, { noWidth: true }),
        slot('modern.gyro.pilot', 'pilot', 9, { tag: 'prop' }),
        slot('modern.gyro.body', 'body', 10),
        slot('modern.gyro.windshield', 'body', 11),
        slot('modern.gyro.gun', 'barrel', 12, { tag: 'weapon', noWidth: true }),
        slot('modern.gyro.rotor', 'rotor', 13, { noWidth: true }),
      ],
      GYRO_K,
    ),
    muzzleBone: 'muzzle',
    attack: 'flyer.attack.gun',
    ability: 'ability.rotor_tilt',
    group: 'epic',
    size: 'medium',
    speed: 80,
  }),
  vehicle({
    id: 'unit.behemoth_tank',
    age: 'modern',
    palette: { ...X, skin: 0xa8876f },
    height: 186,
    center: 60,
    bones: [
      { id: 'hull', parent: 'spin', x: 0, y: 60 },
      ...scaleBones(
        [
          { id: 'treadTeeth', parent: 'hull', x: 0, y: 0 },
          { id: 'wheel1', parent: 'hull', x: -30, y: -8 },
          { id: 'mg', parent: 'hull', x: 40, y: -28 },
          { id: 'deck', parent: 'hull', x: 0, y: -60 },
          { id: 'turret', parent: 'deck', x: 2, y: -34 },
          { id: 'barrel', parent: 'turret', x: 18, y: -13 },
          { id: 'muzzle', parent: 'barrel', x: 58, y: 0 },
          { id: 'commander', parent: 'turret', x: -6, y: -26 },
          { id: 'flag1', parent: 'turret', x: -20, y: -24 },
          { id: 'stack', parent: 'deck', x: -24, y: -26 },
        ],
        BEHEMOTH_K,
      ),
    ],
    slots: scaleSlots(
      [
        slot('modern.behemoth.flag', 'flag1', 4, { noWidth: true }),
        slot('modern.behemoth.stack', 'stack', 5),
        slot('modern.behemoth.tracks', 'hull', 10),
        slot('modern.behemoth.teeth', 'treadTeeth', 11, { y: -1.6 }),
        slot('modern.behemoth.hull', 'hull', 14),
        slot('modern.behemoth.deck', 'deck', 14.5),
        slot('modern.behemoth.mgun', 'mg', 14.8, { x: 8, y: -2, tag: 'weapon', noWidth: true }),
        slot('modern.behemoth.sponson', 'mg', 15),
        slot('modern.behemoth.gun', 'barrel', 16, { tag: 'weapon', noWidth: true }),
        slot('modern.tank.commander', 'commander', 16.5, { tag: 'prop' }),
        slot('modern.behemoth.turret', 'turret', 17),
      ],
      BEHEMOTH_K,
    ),
    muzzleBone: 'muzzle',
    attack: 'vehicle.attack.recoil',
    ability: 'ability.recoil',
    group: 'legendary',
    size: 'huge',
    legendary: true,
    wheelRadius: 8,
    speed: 35,
  }),
];

export const MODERN_TURRETS: TurretPuppet[] = [
  turret({
    id: 'turret.mg_nest',
    age: 'modern',
    palette: X,
    height: 34,
    bones: [
      { id: 'pivot', parent: 'root', x: 0, y: -18 },
      { id: 'barrel', parent: 'pivot', x: 0, y: 0 },
      { id: 'muzzle', parent: 'pivot', x: 25, y: 0 },
    ],
    slots: [
      slot('modern.turret.flag', 'root', 5, { x: -16, y: -8 }),
      slot('modern.turret.tripod', 'root', 9, { y: -14 }),
      slot('modern.turret.mg', 'barrel', 11),
      slot('modern.turret.sandbags', 'root', 12),
    ],
    aim: [-30, 25],
  }),
  turret({
    id: 'turret.flak_gun',
    age: 'modern',
    palette: X,
    height: 46,
    bones: [
      { id: 'pivot', parent: 'root', x: 0, y: -20, rot: -38 },
      { id: 'barrel', parent: 'pivot', x: 0, y: 0 },
      { id: 'muzzle', parent: 'pivot', x: 31, y: 0 },
    ],
    slots: [slot('modern.turret.flag', 'root', 5, { x: -16, y: -8 }), slot('modern.turret.flakBase', 'root', 10), slot('modern.turret.flak', 'barrel', 12)],
    aim: [-35, 10],
  }),
  turret({
    id: 'turret.howitzer',
    age: 'modern',
    palette: X,
    height: 44,
    bones: [
      { id: 'pivot', parent: 'root', x: 0, y: -8, rot: -24 },
      { id: 'barrel', parent: 'pivot', x: 0, y: 0 },
      { id: 'muzzle', parent: 'pivot', x: 40, y: 0 },
    ],
    slots: [slot('modern.turret.flag', 'root', 5, { x: -18, y: -6 }), slot('modern.turret.howitzerBase', 'root', 10), slot('modern.turret.howitzer', 'barrel', 12)],
    aim: [-20, 5],
  }),
  turret({
    id: 'turret.searchlight_sniper',
    age: 'modern',
    palette: X,
    height: 52,
    bones: [
      { id: 'pivot', parent: 'root', x: 0, y: -38 },
      { id: 'barrel', parent: 'pivot', x: 0, y: 0 },
      { id: 'muzzle', parent: 'pivot', x: 24, y: -13 },
    ],
    slots: [
      slot('modern.turret.flag', 'root', 5, { x: -14, y: -28 }),
      slot('modern.turret.lightTower', 'root', 10),
      slot('modern.turret.searchlight', 'barrel', 12),
      slot('modern.glint', 'barrel', 13, { x: 9, y: -2 }),
    ],
    aim: [-30, 20],
  }),
];

export const MODERN_BASE: BasePuppet = base({
  id: 'base.modern',
  age: 'modern',
  palette: X,
  height: 280,
  width: 158,
  bones: [
    { id: 'body', parent: 'root', x: 0, y: 0 },
    { id: 'flag1', parent: 'body', x: -100, y: -200 },
    { id: 'torch1', parent: 'body', x: -66, y: -52 },
    { id: 'torch2', parent: 'body', x: -118, y: -112 },
    { id: 'smoke', parent: 'body', x: -80, y: -140 },
  ],
  slots: [
    slot('modern.base.mast', 'flag1', 0.5, { when: { crumbleMax: 2 } }),
    slot('modern.base.tower', 'body', 1),
    slot('modern.base.chunk', 'body', 1.1, { when: { crumbleMax: 1 } }),
    slot('modern.base.bunker', 'body', 2),
    slot('modern.base.camo', 'body', 2.5),
    slot('modern.plate', 'body', 2.6, { x: -130, y: -40 }),
    slot('modern.plate', 'body', 2.6, { x: -100, y: -44, id: 'plate2' }),
    slot('modern.base.door', 'body', 3),
    slot('modern.base.crack1', 'body', 4, { when: { crumbleMin: 1 } }),
    slot('modern.base.crack2', 'body', 4.1, { when: { crumbleMin: 2 } }),
    slot('modern.base.sandbags', 'body', 5, { x: -86 }),
    slot('modern.base.wire', 'body', 5.5, { x: -140 }),
    slot('modern.base.lamp', 'torch1', 9),
    slot('modern.base.lamp', 'torch2', 9),
    slot('modern.base.ledge', 'body', 10, { x: -8, y: -38 }),
    slot('modern.base.ledge', 'body', 10, { x: -12, y: -80, id: 'ledge2' }),
    slot('modern.base.ledge', 'body', 10, { x: -26, y: -120, id: 'ledge3' }),
    slot('modern.base.ledge', 'body', 10, { x: -56, y: -164, id: 'ledge4' }),
    slot('modern.base.treasury1', 'body', 12, { x: -140, y: -2, when: { treasuryMin: 1 } }),
    slot('modern.base.treasury2', 'body', 12, { x: -116, y: 0, when: { treasuryMin: 2 } }),
    slot('modern.base.treasury3', 'body', 12.1, { x: -140, y: -14, when: { treasuryMin: 3 } }),
    slot('modern.base.rubble', 'body', 13, { when: { crumbleMin: 2 } }),
    slot('modern.base.smoke', 'smoke', 14, { when: { crumbleMin: 3 } }),
  ],
  mounts: [
    { x: -8, y: -44 },
    { x: -12, y: -86 },
    { x: -26, y: -126 },
    { x: -56, y: -170 },
  ],
  hornAt: { x: -87, y: -226 },
  flags: ['flag1'],
  flickers: ['torch1', 'torch2'],
});
