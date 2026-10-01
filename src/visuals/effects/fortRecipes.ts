/**
 * Fort effects (DESIGN A16.14.8, A12): the placing dust, the build pop, debris per material, the trap
 * snap, the levy's spawn puff, and the pad, ghost and reach markers of the placement drag. Pure data,
 * played by `adapters/procedural/effectView.ts` like every recipe. The sim owns all timing (B5).
 *
 * Colours follow A11: pale warm dust and wood, grey stone and metal, mint and lilac energy (energy is
 * the only saturated tone, and stays small). `radius` sizes the footprint effects.
 */
import type { FxKit } from './powerRecipes';
import type { FxRecipe, ParticleSpec } from './recipes';

const debris = (sprite: string, tint: number, count: number, scale = 1.3): ParticleSpec => ({
  sprite,
  count,
  life: [700, 1100],
  speed: [90, 230],
  angle: [-160, -20],
  spread: 12,
  gravity: 720,
  drag: 0.3,
  scale: [scale, scale * 0.85],
  alpha: [1, 0.2],
  spin: [-420, 420],
  tint,
});

export function fortFxRecipes(k: FxKit): FxRecipe[] {
  const puffs = (count: number, scale: number): ParticleSpec => ({ ...k.dust(count, scale), box: [18, 2], sizeWith: 'radius', tint: 0xd8ccb4 });
  return [
    {
      id: 'fx.fort_scaffold_dust',
      durationMs: 800,
      sprites: [{ ...k.ring(3.2, 420, 0xf2e8d6, 0.3), sizeWith: 'radius' }],
      particles: [puffs(9, 1.3), { ...k.chunks(4, 'fx.p.chunk'), tint: 0x8c8074, speed: [60, 140] }],
    },
    {
      id: 'fx.fort_build_pop',
      durationMs: 620,
      sprites: [k.bloom(3.4, 380, 0xfff1d8, 0.55), { ...k.ring(3.6, 460, 0xfff6e6, 0.32), sizeWith: 'radius' }],
      particles: [
        { sprite: 'fx.p.star', count: 5, life: [380, 560], speed: [50, 110], angle: [-160, -20], spread: 16, gravity: 60, drag: 1.4, scale: [0.9, 0.3], alpha: [1, 0], tint: 0xfff4dc, blendAdd: true },
        puffs(6, 1.1),
      ],
    },
    {
      id: 'fx.fort_debris_wood',
      durationMs: 1300,
      maxInstances: 4,
      particles: [debris('fx.p.chunk', 0x8a7e70, 7, 1.5), debris('fx.p.chunk', 0x5e544a, 5, 1.2), puffs(8, 1.8), k.smoke(3, 1.4)],
    },
    {
      id: 'fx.fort_debris_stone',
      durationMs: 1300,
      maxInstances: 4,
      particles: [debris('fx.p.rock', 0x9a8e7e, 6, 1.7), debris('fx.p.rock2', 0x7a7064, 6, 1.4), puffs(9, 2.0), k.smoke(3, 1.5)],
    },
    {
      id: 'fx.fort_debris_metal',
      durationMs: 1200,
      maxInstances: 4,
      particles: [debris('fx.p.chunk', 0x6e7278, 7, 1.4), debris('fx.p.chunk', 0x3c3e42, 4, 1.2), k.sparks(10, [120, 260], 'fx.p.sparkHot'), puffs(6, 1.6), k.smoke(4, 1.4)],
    },
    {
      id: 'fx.fort_debris_energy',
      durationMs: 1100,
      maxInstances: 4,
      sprites: [k.bloom(4, 480, 0xc8fff0, 0.7), { ...k.ring(4, 520, 0xd8ccff, 0.35), blendAdd: true }],
      particles: [{ ...debris('fx.p.spark', 0x9ff5d8, 12, 1.3), blendAdd: true, gravity: 120 }, { ...debris('fx.p.nanite', 0xd8ccff, 8, 1.1), blendAdd: true, gravity: -40 }],
    },
    {
      id: 'fx.trap_snap',
      durationMs: 640,
      sprites: [k.ring(2.2, 260, 0xf4ecdc, 0.35)],
      particles: [{ ...k.chunks(5, 'fx.p.chunk'), tint: 0x8c8074, speed: [70, 160] }, { ...k.dust(6, 1.0), box: [12, 1], tint: 0xd8ccb4 }],
    },
    {
      id: 'fx.levy_spawn',
      durationMs: 520,
      particles: [{ ...k.dust(5, 0.9), angle: [-120, -20], tint: 0xd8ccb4 }],
    },
    {
      id: 'fx.fort_pad',
      durationMs: 1400,
      loops: true,
      sprites: [
        { sprite: 'fx.p.ringThick', life: 0, tint: 'team', sizeWith: 'radius', keys: [{ t: 0, sx: 2.2, sy: 0.7, a: 0.55 }, { t: 0.5, sx: 2.35, sy: 0.75, a: 0.8 }, { t: 1, sx: 2.2, sy: 0.7, a: 0.55 }], loop: 1400 },
        { sprite: 'fx.p.disc', life: 0, tint: 'team', sizeWith: 'radius', keys: [{ t: 0, sx: 2.1, sy: 0.64, a: 0.16 }, { t: 1, sx: 2.1, sy: 0.64, a: 0.16 }] },
      ],
    },
    {
      id: 'fx.fort_ghost',
      durationMs: 900,
      loops: true,
      sprites: [{ sprite: 'fx.p.glow', life: 0, tint: 0xf4f0e6, blendAdd: true, sizeWith: 'radius', keys: [{ t: 0, sx: 2.2, sy: 0.9, a: 0.25 }, { t: 0.5, sx: 2.4, sy: 1, a: 0.4 }, { t: 1, sx: 2.2, sy: 0.9, a: 0.25 }], loop: 900 }],
    },
    {
      id: 'fx.fort_reach',
      durationMs: 1200,
      loops: true,
      sprites: [
        { sprite: 'fx.p.zone', life: 0, tint: 'team', sizeWith: 'width', keys: [{ t: 0, sx: 1, sy: 0.3, a: 0.22 }, { t: 1, sx: 1, sy: 0.3, a: 0.22 }] },
        { sprite: 'fx.p.zoneEdge', life: 0, tint: 'team', sizeWith: 'width', keys: [{ t: 0, sx: 1, sy: 0.3, a: 0.6 }, { t: 0.5, sx: 1, sy: 0.3, a: 0.85 }, { t: 1, sx: 1, sy: 0.3, a: 0.6 }], loop: 1200 },
      ],
    },
  ];
}
