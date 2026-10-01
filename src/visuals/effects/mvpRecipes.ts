/**
 * MVP pass effects (audio and effects audit 2026-10-01): the stance cues on the troops, the slow and
 * snare marks a unit carries after a trap or power lets go, the Brace plant when a Heavy hits a braced
 * line, the War Council completion glints for Defences and Command, the levy pennant, and the crumbling
 * base's pulse. Pure data, played by `adapters/procedural/effectView.ts` like every recipe; the sim owns
 * all timing (B5).
 *
 * Colours follow A11: warm cream and dust for the line, steel for Hold, a cool grey-blue for Fall back,
 * a dull tar brown for slows (never a saturated glow: a slow is a burden, not a buff).
 */
import type { FxKit } from './powerRecipes';
import type { FxRecipe } from './recipes';

export function mvpFxRecipes(k: FxKit): FxRecipe[] {
  return [
    // Stance cues, on each of the side's frontmost units (fxUnits, `max` 8)
    {
      id: 'fx.stance_charge',
      durationMs: 640,
      sprites: [
        k.bloom(2.2, 380, 0xffd9a8, 0.6),
        // a forward chevron (the wedge points back at rest: r 180 turns it to the front) that swells and flies ahead
        { sprite: 'fx.p.wedge', life: 460, keys: [{ t: 0, x: 2, y: -30, sx: 0.5, sy: 0.5, a: 0, r: 180 }, { t: 0.22, x: 12, sx: 1.6, sy: 1.6, a: 0.95 }, { t: 1, x: 40, sx: 1.9, sy: 1.9, a: 0 }], tint: 0xffe2b8 },
      ],
      particles: [
        { ...k.dust(6, 1), angle: [-175, -125], speed: [60, 130] },
        { ...k.sparks(5, [150, 240], 'fx.p.spark', [-14, 6]), tint: 0xfff0d6 },
      ],
    },
    {
      id: 'fx.stance_hold',
      durationMs: 640,
      sprites: [
        { ...k.ring(2.4, 440, 0xdfe6ee, 0.32) },
        { sprite: 'fx.p.glint', life: 440, keys: [{ t: 0, y: -40, sx: 0.4, sy: 0.4, a: 0, r: 0 }, { t: 0.28, sx: 1.5, sy: 1.5, a: 1, r: 45 }, { t: 1, sx: 0.6, sy: 0.6, a: 0, r: 90 }], tint: 0xf4f8ff, blendAdd: true },
      ],
      particles: [{ ...k.dust(5, 0.9), angle: [-175, -5], speed: [20, 60] }],
    },
    {
      id: 'fx.stance_fallback',
      durationMs: 620,
      sprites: [
        { ...k.ring(2, 420, 0xcfdcea, 0.3) },
        // a chevron pointing back, drifting back
        { sprite: 'fx.p.wedge', life: 440, keys: [{ t: 0, x: -2, y: -30, sx: 0.5, sy: 0.5, a: 0 }, { t: 0.25, x: -10, sx: 1.3, sy: 1.3, a: 0.85 }, { t: 1, x: -30, sx: 1.5, sy: 1.5, a: 0 }], tint: 0xd8e2ee },
      ],
      particles: [{ ...k.dust(6, 0.9), angle: [-60, -10], speed: [50, 110], tint: 0xd8dee6 }],
    },
    // A slow or snare that outlasts its trap or zone: a tar pool under the feet with slow drips, as long
    // as the status (`durationMs`, loops)
    {
      id: 'fx.status_slow',
      durationMs: 2500,
      loops: true,
      sprites: [
        // a dark, dull puddle under the feet (low saturation: a burden, not a team colour)
        { sprite: 'fx.p.disc', life: 0, loop: 1400, sizeWith: 'radius', keys: [{ t: 0, y: 2, sx: 0.9, sy: 0.26, a: 0.55 }, { t: 0.5, sx: 1, sy: 0.29, a: 0.65 }, { t: 1, sx: 0.9, sy: 0.26, a: 0.55 }], tint: 0x403c38 },
        { sprite: 'fx.p.ring', life: 0, loop: 1400, sizeWith: 'radius', keys: [{ t: 0, y: 2, sx: 0.95, sy: 0.3, a: 0.35 }, { t: 0.5, sx: 1.05, sy: 0.33, a: 0.5 }, { t: 1, sx: 0.95, sy: 0.3, a: 0.35 }], tint: 0x8e8a84 },
      ],
      particles: [{ sprite: 'fx.p.drop', rate: 4, life: [450, 700], box: [8, 1], sizeWith: 'radius', speed: [3, 8], angle: [-100, -80], gravity: -6, scale: [0.6, 1], alpha: [0.8, 0], tint: 0x55514c }],
    },
    {
      id: 'fx.status_snare',
      durationMs: 2500,
      loops: true,
      sprites: [
        // two pale bands binding the shins, pulsing a little
        { sprite: 'fx.p.ringThick', life: 0, loop: 900, sizeWith: 'radius', keys: [{ t: 0, y: -6, sx: 0.7, sy: 0.24, a: 0.85 }, { t: 0.5, sx: 0.76, sy: 0.26, a: 1 }, { t: 1, sx: 0.7, sy: 0.24, a: 0.85 }], tint: 0xd8d2c4 },
        { sprite: 'fx.p.ringThick', life: 0, loop: 900, sizeWith: 'radius', keys: [{ t: 0, y: -16, sx: 0.6, sy: 0.2, a: 0.75 }, { t: 0.5, sx: 0.56, sy: 0.19, a: 0.9 }, { t: 1, sx: 0.6, sy: 0.2, a: 0.75 }], tint: 0xd8d2c4 },
      ],
    },
    // Brace (Anti-heavy): the braced unit plants its feet as the Heavy hits
    {
      id: 'fx.brace_plant',
      durationMs: 560,
      sprites: [{ ...k.ring(2, 380, 0xece2cc, 0.25) }, { sprite: 'fx.p.glint', life: 300, keys: [{ t: 0, y: -34, sx: 0.4, sy: 0.4, a: 0 }, { t: 0.3, sx: 1, sy: 1, a: 1, r: 30 }, { t: 1, sx: 0.4, sy: 0.4, a: 0, r: 60 }], tint: 0xffffff, blendAdd: true }],
      particles: [{ ...k.dust(7, 1.1), angle: [-175, -110], speed: [40, 120] }, { sprite: 'fx.p.clod', count: 3, life: [400, 600], speed: [60, 140], angle: [-170, -120], gravity: 600, scale: [0.8, 0.7], alpha: [1, 0.3], spin: [-300, 300], tint: 0x8a7a64 }],
    },
    // A Council research done (A18.5.1): Defences glint over the turrets and gate, Command over the base
    {
      id: 'fx.research_done',
      durationMs: 900,
      sprites: [k.bloom(2.6, 520, 0xfff0cc, 0.6), { ...k.ring(3, 560, 0xfff4dc, 0.35), blendAdd: true }],
      particles: [{ sprite: 'fx.p.glint', count: 6, life: [500, 800], box: [22, 10], speed: [20, 60], angle: [-110, -70], scale: [1, 0.4], alpha: [1, 0], spin: [-120, 120], tint: 0xfff6e0, blendAdd: true }],
    },
    // A levy wears a small team pennant over its head, so it never reads as a trained Infantry
    {
      id: 'fx.levy_marker',
      durationMs: 1600,
      loops: true,
      sprites: [{ sprite: 'fx.p.pennant', life: 0, loop: 1600, keys: [{ t: 0, y: -10, sx: 1.1, sy: 1.1, r: -5 }, { t: 0.5, y: -14, sx: 1.1, sy: 1.1, r: 5 }, { t: 1, y: -10, sx: 1.1, sy: 1.1, r: -5 }], tint: 'team' }],
    },
  ];
}
