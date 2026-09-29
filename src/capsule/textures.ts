/**
 * Soft textures for the capsule show, drawn once on a 2D canvas and cached (glows, god rays,
 * sparks, shards, confetti, the room backdrop). Canvas-made textures do not depend on the Pixi
 * renderer, so any stage can use them. Browser only.
 */
import { Texture } from 'pixi.js';
import { ROOM, cssHex } from './palette';

const cache = new Map<string, Texture>();

function canvasTexture(key: string, w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void): Texture {
  const hit = cache.get(key);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  if (ctx) draw(ctx);
  const tex = Texture.from(c);
  cache.set(key, tex);
  return tex;
}

/** White radial glow, soft falloff. */
export function glowTexture(): Texture {
  return canvasTexture('glow', 128, 128, (ctx) => {
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.25, 'rgba(255,255,255,0.55)');
    g.addColorStop(0.6, 'rgba(255,255,255,0.14)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
  });
}

/** Small hard dot with a soft edge (sparks, dust). */
export function dotTexture(): Texture {
  return canvasTexture('dot', 32, 32, (ctx) => {
    const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.5, 'rgba(255,255,255,0.8)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 32, 32);
  });
}

/** God rays: `n` soft wedges from the centre. */
export function raysTexture(n = 14): Texture {
  return canvasTexture(`rays${n}`, 512, 512, (ctx) => {
    ctx.translate(256, 256);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const w = (i % 2 === 0 ? 0.11 : 0.06) * Math.PI;
      const g = ctx.createRadialGradient(0, 0, 10, 0, 0, 256);
      g.addColorStop(0, 'rgba(255,255,255,0.85)');
      g.addColorStop(0.45, 'rgba(255,255,255,0.28)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, 256, a - w / 2, a + w / 2);
      ctx.closePath();
      ctx.fill();
    }
  });
}

/** A streak for fast sparks (drawn along +x). */
export function streakTexture(): Texture {
  return canvasTexture('streak', 64, 12, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 64, 0);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.7, 'rgba(255,255,255,0.9)');
    g.addColorStop(1, 'rgba(255,255,255,1)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, 6);
    ctx.quadraticCurveTo(40, 0, 64, 6);
    ctx.quadraticCurveTo(40, 12, 0, 6);
    ctx.fill();
  });
}

/** A chunky shard (capsule fragments). */
export function shardTexture(): Texture {
  return canvasTexture('shard', 24, 24, (ctx) => {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(3, 20);
    ctx.lineTo(12, 2);
    ctx.lineTo(22, 15);
    ctx.lineTo(13, 22);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.moveTo(12, 2);
    ctx.lineTo(22, 15);
    ctx.lineTo(13, 22);
    ctx.closePath();
    ctx.fill();
  });
}

/** A confetti chip. */
export function confettiTexture(): Texture {
  return canvasTexture('confetti', 12, 8, (ctx) => {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 12, 8);
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fillRect(0, 5, 12, 3);
  });
}

/** A four-point star twinkle. */
export function starTexture(): Texture {
  return canvasTexture('star', 64, 64, (ctx) => {
    ctx.translate(32, 32);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    for (const r of [0, Math.PI / 2]) {
      ctx.save();
      ctx.rotate(r);
      ctx.beginPath();
      ctx.moveTo(-32, 0);
      ctx.quadraticCurveTo(0, -3, 32, 0);
      ctx.quadraticCurveTo(0, 3, -32, 0);
      ctx.fill();
      ctx.restore();
    }
    ctx.beginPath();
    ctx.arc(0, 0, 7, 0, Math.PI * 2);
    ctx.fill();
  });
}

/** The capsule room backdrop: warm dusk centre, deep edges. */
export function roomTexture(): Texture {
  return canvasTexture('room', 512, 512, (ctx) => {
    const g = ctx.createRadialGradient(256, 230, 20, 256, 280, 360);
    g.addColorStop(0, cssHex(ROOM.bgInner));
    g.addColorStop(0.55, '#231a33');
    g.addColorStop(1, cssHex(ROOM.bgOuter));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 512, 512);
  });
}

/** A top-down light cone (spotlight on the pedestal). */
export function coneTexture(): Texture {
  return canvasTexture('cone', 256, 512, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 0, 512);
    g.addColorStop(0, 'rgba(255,240,210,0.0)');
    g.addColorStop(0.25, 'rgba(255,236,200,0.35)');
    g.addColorStop(1, 'rgba(255,230,190,0.05)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(98, 0);
    ctx.lineTo(158, 0);
    ctx.lineTo(256, 512);
    ctx.lineTo(0, 512);
    ctx.closePath();
    ctx.fill();
  });
}

/** Horizontal edge fade: opaque at x = 0, clear at the right. */
export function edgeFadeTexture(color: number): Texture {
  return canvasTexture(`edge${color}`, 128, 8, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 128, 0);
    const c = cssHex(color);
    g.addColorStop(0, c);
    g.addColorStop(1, `${c}00`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 8);
  });
}

/** A diagonal light band for foil sweeps (white core, clear edges). */
export function sweepTexture(): Texture {
  return canvasTexture('sweep', 128, 32, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 128, 0);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.42, 'rgba(255,255,255,0.35)');
    g.addColorStop(0.5, 'rgba(255,255,255,0.95)');
    g.addColorStop(0.58, 'rgba(255,255,255,0.35)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 32);
  });
}

/** Rainbow band for Holo sweeps. */
export function holoTexture(): Texture {
  return canvasTexture('holo', 256, 32, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 256, 0);
    const hues = ['rgba(255,95,143,0)', 'rgba(255,95,143,0.8)', 'rgba(255,201,77,0.9)', 'rgba(125,255,154,0.9)', 'rgba(77,216,255,0.9)', 'rgba(181,123,255,0.8)', 'rgba(181,123,255,0)'];
    hues.forEach((h, i) => g.addColorStop(i / (hues.length - 1), h));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 32);
  });
}

/** Sunlight shafts falling from above (the Gold burst): soft beams fanning down from the top centre. */
export function shaftsTexture(): Texture {
  return canvasTexture('shafts', 512, 512, (ctx) => {
    const beams: [number, number, number][] = [
      [-0.34, 0.05, 0.5],
      [-0.2, 0.08, 0.8],
      [-0.08, 0.05, 0.6],
      [0.03, 0.09, 1],
      [0.15, 0.05, 0.65],
      [0.27, 0.07, 0.8],
      [0.38, 0.04, 0.45],
    ];
    for (const [a, w, k] of beams) {
      const g = ctx.createLinearGradient(256, 0, 256, 512);
      g.addColorStop(0, `rgba(255,255,255,${0.75 * k})`);
      g.addColorStop(0.55, `rgba(255,255,255,${0.25 * k})`);
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(256 + Math.sin(a - w * 0.2) * 20, 0);
      ctx.lineTo(256 + Math.sin(a + w * 0.2) * 20, 0);
      ctx.lineTo(256 + Math.tan(a + w) * 512, 512);
      ctx.lineTo(256 + Math.tan(a - w) * 512, 512);
      ctx.closePath();
      ctx.fill();
    }
  });
}

/** A crinkled leaf of gold (the Gold burst's residue): an irregular flake with a fold line. */
export function leafTexture(): Texture {
  return canvasTexture('leaf', 20, 16, (ctx) => {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(2, 7);
    ctx.lineTo(7, 1);
    ctx.lineTo(13, 3);
    ctx.lineTo(19, 1);
    ctx.lineTo(17, 9);
    ctx.lineTo(12, 15);
    ctx.lineTo(5, 13);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.beginPath();
    ctx.moveTo(7, 1);
    ctx.lineTo(13, 3);
    ctx.lineTo(12, 15);
    ctx.lineTo(9, 8);
    ctx.closePath();
    ctx.fill();
  });
}

/** A long ice splinter (the Platinum burst): a thin diamond with a bright spine. */
export function splinterTexture(): Texture {
  return canvasTexture('splinter', 48, 12, (ctx) => {
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    ctx.moveTo(0, 6);
    ctx.lineTo(30, 1);
    ctx.lineTo(48, 6);
    ctx.lineTo(30, 11);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(6, 5, 38, 2);
  });
}
