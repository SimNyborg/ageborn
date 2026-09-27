/**
 * Stone Age puppets (DESIGN A5.2 units, A11 art direction). Each entry is a procedural visual source
 * keyed like its manifest id.
 */
import { AGE_ZONES } from '../palette';
import '../parts/stone';
import { biped } from '../rigs/biped';
import type { PuppetDef } from '../types';

const Z = AGE_ZONES.stone;

/** Bare-limbed cave folk: arms and legs are skin, feet bare. */
const caveBody = { sleeve: Z['skin'] ?? 0, forearm: Z['skin'] ?? 0, shin: Z['skin'] ?? 0, pants: Z['skin'] ?? 0, glove: Z['skin'] ?? 0 };

export const STONE_PUPPETS: PuppetDef[] = [
  biped({
    id: 'unit.bonker',
    age: 'stone',
    palette: { ...Z, ...caveBody },
    head: 'stone.head.brute',
    eyes: 'shared.eyes.angry',
    hat: [{ part: 'stone.hair.shaggy' }],
    torso: 'stone.torso.tunic',
    pelvis: 'stone.pelvis.loin',
    leg: { lower: 'shared.leg.lower.bare' },
    weapon: { part: 'stone.club', rot: 118, y: 0, tag: 'prop' },
    pose: { armF: -12, foreF: -78, armB: 16, foreB: -24 },
    attack: 'biped.attack.swing',
    group: 'infantry',
    size: 'small',
  }),
];
