/**
 * Drum gallery for the capsule bench (`?dev=1#capsuleBench/drums`): every tier's drum at rest with
 * everything it has earned (lit rings, crests, summit gems), side by side on the room backdrop, so
 * the seven materials can be compared and screenshotted in one frame (DESIGN A10 "Beauty").
 *
 * `bodySamplePoints()` names the body pixels the colour check samples (drum coordinates): the
 * highlight and mid-tone columns of the body gradient, between two carved rings, away from the
 * brass fittings every drum shares.
 */
import { Container, Sprite, Text, type Application } from 'pixi.js';
import type { CapsuleTier } from '@/contracts';
import { TIER_ORDER } from '@/capsule';
import { bodyStops, CapsuleDrum, ornamentScaleFor, ringGemSamplePoint } from '@/capsule/climb';
import { TIER_RAMPS } from '@/capsule/palette';
import { roomTexture } from '@/capsule/textures';

/**
 * Drum-space x of the body gradient's highlight and mid-tone stops of `tier` (0.17 and 0.64 on most
 * drums; Gold's polished-metal gradient puts them at 0.18 and 0.46), and a y between rings 1 and 2.
 */
export function bodySamplePoints(tier: CapsuleTier = 'clay'): { highlight: [number, number]; mid: [number, number] } {
  const hw = 90;
  const stops = bodyStops(tier);
  const ramp = TIER_RAMPS[tier];
  const at = (c: number, fallback: number) => stops.find((s) => s.color === c)?.offset ?? fallback;
  return { highlight: [-hw + 2 * hw * at(ramp.highlight, 0.17) + 4, -70], mid: [-hw + 2 * hw * at(ramp.mid, 0.64), -70] };
}

/** Drum-space points on the face of each lit ring gem, bottom-up (the bench's gem colour check). */
export function gemSamplePoints(): [number, number][] {
  return [0, 1, 2, 3, 4].map((i) => ringGemSamplePoint(i));
}

export interface DrumGallery {
  /** Screen position of a drum-space point of tier `tier`'s drum. */
  toScreen(tier: CapsuleTier, x: number, y: number): [number, number];
  destroy(): void;
}

export function mountDrumGallery(app: Application, tiers: readonly CapsuleTier[] = TIER_ORDER): DrumGallery {
  const root = new Container();
  const bg = new Sprite(roomTexture());
  root.addChild(bg);
  const drums = tiers.map((t, i) => {
    const d = new CapsuleDrum(17 + i);
    d.setTier(t);
    const label = new Text({ text: t, style: { fill: 0xf4ecd8, fontSize: 18, fontWeight: '800', fontFamily: 'system-ui, sans-serif' } });
    label.anchor.set(0.5, 0);
    root.addChild(d.root, label);
    return { t, d, label };
  });
  app.stage.addChild(root);
  let scale = 1;
  let x0 = 0;
  let base = 0;
  let gap = 0;
  const layout = () => {
    const w = app.screen.width;
    const h = app.screen.height;
    bg.width = w;
    bg.height = h;
    gap = w / drums.length;
    scale = Math.min(gap / 210, (h - 60) / 290);
    x0 = gap / 2;
    base = h / 2 + 150 * scale;
    drums.forEach(({ d, label }, i) => {
      d.root.scale.set(scale);
      d.setOrnamentScale(ornamentScaleFor(scale));
      d.root.position.set(x0 + i * gap, base);
      label.position.set(x0 + i * gap, base + 6);
      label.scale.set(Math.max(0.6, scale));
    });
  };
  layout();
  app.renderer.on('resize', layout);
  const tick = () => drums.forEach(({ d }) => d.update(app.ticker.deltaMS));
  app.ticker.add(tick);
  return {
    toScreen(tier, x, y) {
      const i = drums.findIndex((e) => e.t === tier);
      return [x0 + i * gap + x * scale, base + y * scale];
    },
    destroy() {
      app.renderer.off('resize', layout);
      app.ticker.remove(tick);
      app.stage.removeChild(root);
      drums.forEach(({ d }) => d.destroy());
      root.destroy({ children: true });
    },
  };
}
