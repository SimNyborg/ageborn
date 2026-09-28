/**
 * Future Age puppets (DESIGN A5.6 units and turrets, A11 art direction, the Spire base).
 * Each entry is a procedural visual source keyed like its manifest id.
 */
import { AGE_ZONES } from '../palette';
import '../parts/future';
import { sized } from '../parts/registry';
import { base, type BasePuppet } from '../rigs/base';
import { biped } from '../rigs/biped';
import { slot } from '../rigs/common';
import { flyer, walker } from '../rigs/machines';
import { turret, type TurretPuppet } from '../rigs/turret';
import type { BoneDef, PuppetDef, SlotDef } from '../types';

const Z = AGE_ZONES.future;
const zone = (k: string): number => Z[k] ?? 0x888888;

/** Extra future zones. Magenta and mint are outside the team hue bands; cyan stays an accent. */
const X = {
  ...Z,
  glass: 0xbfe8e0,
  clockface: 0xf4f6f8,
  void: 0x5a3f7a,
  void2: 0x3e2a58,
  lilac: 0xc9b8f0,
  crystal: 0xd8c8f0,
  smoke: 0x8a8d96,
};

const white = zone('cloth2');
const charcoal = zone('cloth');
/** Armoured troops: white plates on the arms and shins over a charcoal suit. */
const armored = { ...X, sleeve: white, forearm: white, glove: zone('metal2'), pants: charcoal, shin: white, boot: zone('metal2') };

function scaleBones(bones: BoneDef[], k: number): BoneDef[] {
  return bones.map((b) => ({ ...b, x: b.x * k, y: b.y * k }));
}
function scaleSlots(slots: SlotDef[], k: number): SlotDef[] {
  return slots.map((s) => ({ ...s, part: sized(s.part, k), x: (s.x ?? 0) * k, y: (s.y ?? 0) * k }));
}

const MECH_K = 1.16;
const TITAN_K = 1.06;

export const FUTURE_UNITS: PuppetDef[] = [
  biped({
    id: 'unit.photon_knight',
    age: 'future',
    palette: armored,
    head: 'future.head.plain',
    eyes: null,
    hat: [{ part: 'future.helmet.knight', tag: 'prop' }],
    torso: 'future.torso.armor',
    pelvis: 'future.pelvis.armor',
    weapon: { part: 'future.photonblade', rot: 100 },
    extras: [slot('future.skirt', 'pelvis', 21)],
    pose: { armF: -30, foreF: -50, armB: 10, foreB: -30 },
    attack: 'biped.attack.swing',
    group: 'infantry',
    size: 'small',
  }),
  biped({
    id: 'unit.pulse_trooper',
    age: 'future',
    palette: armored,
    head: 'future.head.plain',
    eyes: null,
    hat: [{ part: 'future.helmet.trooper', tag: 'prop' }],
    torso: 'future.torso.armor',
    pelvis: 'future.pelvis.armor',
    weapon: { part: 'future.plasmarifle', rot: 180, y: 2, muzzle: { x: 0, y: -38 } },
    pose: { armF: -78, foreF: -12, armB: -64, foreB: -46 },
    attack: 'biped.attack.shoot',
    group: 'ranged',
    size: 'small',
    twirl: false,
  }),
  walker({
    id: 'unit.walker_mech',
    age: 'future',
    palette: { ...X, skin: 0xcfa98c },
    height: 106,
    center: 50 * MECH_K,
    bones: scaleBones(
      [
        { id: 'hull', parent: 'spin', x: 0, y: 0 },
        { id: 'pilot', parent: 'hull', x: 10, y: -22 },
        { id: 'legB', parent: 'hull', x: -6, y: 6 },
        { id: 'shinB', parent: 'legB', x: 0, y: 20 },
        { id: 'footB', parent: 'shinB', x: 0, y: 20 },
        { id: 'legF', parent: 'hull', x: 6, y: 6 },
        { id: 'shinF', parent: 'legF', x: 0, y: 20 },
        { id: 'footF', parent: 'shinF', x: 0, y: 20 },
        { id: 'armB', parent: 'hull', x: -16, y: -22, rot: 12 },
        { id: 'foreB', parent: 'armB', x: 0, y: 16, rot: -30 },
        { id: 'armF', parent: 'hull', x: 18, y: -20, rot: -26 },
        { id: 'foreF', parent: 'armF', x: 0, y: 16, rot: -44 },
      ],
      MECH_K,
    ),
    slots: scaleSlots(
      [
        slot('future.mech.upperarm', 'armB', 3, { tone: 'back', noWidth: true }),
        slot('future.mech.forearm', 'foreB', 4, { tone: 'back', noWidth: true }),
        slot('future.mech.thigh', 'legB', 5, { tone: 'back' }),
        slot('future.mech.shin', 'shinB', 6, { tone: 'back' }),
        slot('future.mech.foot', 'footB', 7, { tone: 'back' }),
        slot('future.mech.pilot', 'pilot', 9, { tag: 'prop' }),
        // A11 redundant team cue: a pennant on every heavy
        slot('future.turret.flag', 'hull', 9.5, { x: -16, y: -20, id: 'pennant', noWidth: true }),
        slot('future.mech.hull', 'hull', 10),
        slot('future.mech.thigh', 'legF', 12, { id: 'thighF' }),
        slot('future.mech.shin', 'shinF', 13, { id: 'shinFs' }),
        slot('future.mech.foot', 'footF', 14, { id: 'footFs' }),
        slot('future.mech.upperarm', 'armF', 15, { id: 'upperF', noWidth: true }),
        slot('future.mech.claw', 'foreF', 16, { tag: 'weapon', noWidth: true }),
      ],
      MECH_K,
    ),
    attack: 'walker.attack.punch',
    group: 'heavy',
    size: 'large',
    legLen: 40 * MECH_K,
    legDeg: 20,
    speed: 50,
  }),
  biped({
    id: 'unit.rail_gunner',
    age: 'future',
    height: 70,
    palette: { ...armored, skin: 0xa8876f },
    head: 'future.head.grin',
    eyes: 'shared.eyes.angry',
    hat: [{ part: 'future.helmet.rail', tag: 'prop' }],
    torso: 'future.torso.armor',
    back: [{ part: 'future.capacitor', x: -10, y: -10 }],
    pelvis: 'future.pelvis.armor',
    weapon: { part: 'future.railgun', rot: 180, y: 3, muzzle: { x: 0, y: -56 } },
    pose: { armF: -78, foreF: -12, armB: -64, foreB: -46 },
    attack: 'biped.attack.heavyShot',
    group: 'antiArmor',
    size: 'medium',
    twirl: false,
  }),
  flyer({
    id: 'unit.repair_drone',
    age: 'future',
    palette: X,
    height: 38,
    center: 17,
    bones: [
      { id: 'body', parent: 'spin', x: 0, y: 0 },
      { id: 'rotor', parent: 'body', x: -13, y: -12 },
      { id: 'rotorB', parent: 'body', x: 13, y: -12 },
      { id: 'emitter', parent: 'body', x: 0, y: 10 },
      { id: 'muzzle', parent: 'emitter', x: 0, y: 5 },
    ],
    slots: [
      slot('future.drone.pod', 'body', 8, { x: -13, y: -12, noWidth: true }),
      slot('future.drone.pod', 'body', 8, { x: 13, y: -12, id: 'podB', noWidth: true }),
      slot('future.drone.emitter', 'emitter', 9),
      slot('future.drone.body', 'body', 10),
      slot('future.drone.blade', 'rotor', 11, { y: -3, noWidth: true }),
      slot('future.drone.blade', 'rotorB', 11, { y: -3, id: 'bladeB', noWidth: true }),
    ],
    muzzleBone: 'muzzle',
    attack: 'flyer.attack.beam',
    ability: 'ability.repair_beam',
    group: 'support',
    size: 'small',
    speed: 70,
  }),
  biped({
    id: 'unit.emp_saboteur',
    age: 'future',
    height: 70,
    palette: { ...X, skin: 0xcfa98c, sleeve: charcoal, forearm: charcoal, glove: zone('metal2'), pants: charcoal, shin: charcoal, boot: zone('metal2') },
    head: 'future.head.grin',
    eyes: null,
    hat: [{ part: 'future.hood', tag: 'prop' }],
    torso: 'future.torso.suit',
    pelvis: 'future.pelvis.suit',
    weapon: { part: 'future.baton', rot: 100 },
    extraBones: [{ id: 'device', parent: 'torso', x: -11, y: -12 }],
    extras: [slot(sized('future.emp.device', 70 / 68), 'device', 2)],
    pose: { armF: -30, foreF: -50, armB: 14, foreB: -30, torso: 6 },
    attack: 'biped.attack.swing',
    ability: 'ability.emp',
    group: 'epic',
    size: 'medium',
  }),
  walker({
    id: 'unit.chrono_titan',
    age: 'future',
    palette: X,
    height: 200,
    center: 80 * TITAN_K,
    bones: scaleBones(
      [
        { id: 'hull', parent: 'spin', x: 0, y: 0 },
        { id: 'head', parent: 'hull', x: 2, y: -64 },
        { id: 'clock', parent: 'hull', x: 1, y: -30 },
        { id: 'legB', parent: 'hull', x: -12, y: 14 },
        { id: 'shinB', parent: 'legB', x: 0, y: 30 },
        { id: 'footB', parent: 'shinB', x: 0, y: 30 },
        { id: 'legF', parent: 'hull', x: 12, y: 14 },
        { id: 'shinF', parent: 'legF', x: 0, y: 30 },
        { id: 'footF', parent: 'shinF', x: 0, y: 30 },
        { id: 'armB', parent: 'hull', x: -32, y: -48, rot: 10 },
        { id: 'foreB', parent: 'armB', x: 0, y: 26, rot: -14 },
        { id: 'armF', parent: 'hull', x: 32, y: -48, rot: -12 },
        { id: 'foreF', parent: 'armF', x: 0, y: 26, rot: -18 },
      ],
      TITAN_K,
    ),
    slots: scaleSlots(
      [
        slot('future.titan.upperarm', 'armB', 3, { tone: 'back', noWidth: true }),
        slot('future.titan.fist', 'foreB', 4, { tone: 'back', noWidth: true }),
        slot('future.titan.thigh', 'legB', 5, { tone: 'back' }),
        slot('future.titan.shin', 'shinB', 6, { tone: 'back' }),
        slot('future.titan.foot', 'footB', 7, { tone: 'back' }),
        // A11 redundant team cue: a pennant on every heavy
        slot(sized('future.turret.flag', 1.5), 'hull', 9.5, { x: -24, y: -56, id: 'pennant', noWidth: true }),
        slot('future.titan.hull', 'hull', 10),
        slot('future.titan.clock', 'clock', 11),
        slot('future.titan.head', 'head', 11.5),
        slot('future.titan.thigh', 'legF', 12, { id: 'thighF' }),
        slot('future.titan.shin', 'shinF', 13, { id: 'shinFs' }),
        slot('future.titan.foot', 'footF', 14, { id: 'footFs' }),
        slot('future.titan.upperarm', 'armF', 15, { id: 'upperF', noWidth: true }),
        slot('future.titan.fist', 'foreF', 16, { tag: 'weapon', id: 'fistF' }),
      ],
      TITAN_K,
    ),
    attack: 'walker.attack.slam',
    ability: 'ability.time_stop',
    group: 'legendary',
    size: 'huge',
    legendary: true,
    legLen: 60 * TITAN_K,
    legDeg: 16,
    speed: 35,
  }),
];

export const FUTURE_TURRETS: TurretPuppet[] = [
  turret({
    id: 'turret.pulse_laser',
    age: 'future',
    palette: X,
    height: 34,
    bones: [
      { id: 'pivot', parent: 'root', x: 0, y: -26 },
      { id: 'barrel', parent: 'pivot', x: 0, y: 0 },
      { id: 'muzzle', parent: 'pivot', x: 19, y: 0 },
    ],
    slots: [slot('future.turret.flag', 'root', 5, { x: -14, y: -6 }), slot('future.turret.pylon', 'root', 10), slot('future.turret.laser', 'barrel', 12)],
    aim: [-35, 25],
  }),
  turret({
    id: 'turret.arc_coil',
    age: 'future',
    palette: X,
    height: 46,
    bones: [
      { id: 'pivot', parent: 'root', x: 0, y: 0 },
      { id: 'muzzle', parent: 'pivot', x: 0, y: -37 },
    ],
    slots: [slot('future.turret.flag', 'root', 5, { x: -16, y: -6 }), slot('future.turret.coil', 'pivot', 10)],
    aim: [0, 0],
  }),
  turret({
    id: 'turret.plasma_mortar',
    age: 'future',
    palette: X,
    height: 34,
    bones: [
      { id: 'pivot', parent: 'root', x: 0, y: -10, rot: -55 },
      { id: 'barrel', parent: 'pivot', x: 0, y: 0 },
      { id: 'muzzle', parent: 'pivot', x: 27, y: 0 },
    ],
    slots: [slot('future.turret.flag', 'root', 5, { x: -16, y: -6 }), slot('future.turret.mortar', 'barrel', 11), slot('future.turret.mortarBase', 'root', 12)],
    aim: [0, 0],
  }),
  turret({
    id: 'turret.gravity_well',
    age: 'future',
    palette: X,
    height: 48,
    bones: [
      { id: 'pivot', parent: 'root', x: 0, y: 0 },
      { id: 'orb', parent: 'pivot', x: 0, y: -26 },
      { id: 'muzzle', parent: 'pivot', x: 0, y: -26 },
    ],
    slots: [slot('future.turret.flag', 'root', 5, { x: -18, y: -6 }), slot('future.turret.orb', 'orb', 9), slot('future.turret.ring', 'pivot', 10)],
    aim: [0, 0],
  }),
];

export const FUTURE_BASE: BasePuppet = base({
  id: 'base.future',
  age: 'future',
  palette: X,
  height: 300,
  width: 150,
  bones: [
    { id: 'body', parent: 'root', x: 0, y: 0 },
    { id: 'flag1', parent: 'body', x: -66, y: -150 },
    { id: 'flag2', parent: 'body', x: -140, y: -120 },
    { id: 'torch1', parent: 'body', x: -60, y: -52 },
    { id: 'torch2', parent: 'body', x: -16, y: -52 },
    { id: 'smoke', parent: 'body', x: -90, y: -220 },
  ],
  slots: [
    slot('future.base.antenna', 'body', 0.5, { x: -100, y: -296 }),
    slot('future.base.spire', 'body', 1),
    slot('future.base.chunk', 'body', 1.1, { when: { crumbleMax: 1 } }),
    slot('future.base.holo', 'flag2', 1.5, { when: { crumbleMax: 2 } }),
    slot('future.base.wing', 'body', 2),
    slot('future.base.gate', 'body', 3),
    slot('future.base.crack1', 'body', 4, { when: { crumbleMin: 1 } }),
    slot('future.base.crack2', 'body', 4.1, { when: { crumbleMin: 2 } }),
    slot('future.base.holo', 'flag1', 5, { when: { crumbleMax: 2 }, id: 'holo1' }),
    slot('future.base.light', 'torch1', 9),
    slot('future.base.light', 'torch2', 9),
    slot('future.base.ledge', 'body', 10, { x: -8, y: -40 }),
    slot('future.base.ledge', 'body', 10, { x: -10, y: -84, id: 'ledge2' }),
    slot('future.base.ledge', 'body', 10, { x: -14, y: -128, id: 'ledge3' }),
    slot('future.base.ledge', 'body', 10, { x: -56, y: -186, id: 'ledge4' }),
    slot('future.base.treasury1', 'body', 12, { x: -140, y: 0, when: { treasuryMin: 1 } }),
    slot('future.base.treasury2', 'body', 12, { x: -122, y: 0, when: { treasuryMin: 2 } }),
    slot('future.base.treasury3', 'body', 12.1, { x: -100, y: 0, when: { treasuryMin: 3 } }),
    slot('future.base.rubble', 'body', 13, { when: { crumbleMin: 2 } }),
    slot('future.base.smoke', 'smoke', 14, { when: { crumbleMin: 3 } }),
  ],
  mounts: [
    { x: -8, y: -45 },
    { x: -10, y: -89 },
    { x: -14, y: -133 },
    { x: -56, y: -191 },
  ],
  hornAt: { x: -100, y: -330 },
  flags: ['flag1', 'flag2'],
  flickers: ['torch1', 'torch2'],
});
