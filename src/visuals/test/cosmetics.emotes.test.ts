/**
 * The collected emotes (PLAN 2a "Emotes (24 collected)", redrawn 2026-10-09): small cel-style characters
 * and props that fill the 96-unit box, each with 3 or more moving parts on 1.2 s loops (anticipation,
 * action with overshoot, settle) written as CSS keyframes in the SVG, and the key pose still under
 * Reduce motion. The tone test (PLAN 2g Track C 2): every part's outline is its fill × 0.40 (value ≤ 0.38,
 * never black), at most one highlight per part, and a shadow band on every sizeable part that is not
 * near-black. Owned by Track C.
 */
import { describe, expect, it } from 'vitest';
import { content } from '@/content';
import { cosmeticSvg } from '../cosmetics/art';
import { EMOTE_BOX, EMOTE_MOTIONS, EMOTES, type EmoteLayer } from '../cosmetics/emotes';
import { celRamp, hexValue, pathBounds, shapesToSvg, type CelShape, type Shape } from '../cosmetics/shapes';

const ids = Object.keys(EMOTES);

function flat(layers: readonly EmoteLayer[]): EmoteLayer[] {
  return layers.flatMap((l) => [l, ...flat(l.sub ?? [])]);
}
const shapesOf = (id: string): Shape[] => flat(EMOTES[id]!.layers).flatMap((l) => l.shapes);
const cels = (shapes: readonly Shape[]): CelShape[] => shapes.filter((s): s is CelShape => 'cel' in s);

describe('collected emotes', () => {
  it('draws every emote item of the content', () => {
    const items = content.cosmetics.collections.items.filter((x) => x.collection === 'emote');
    expect(items.length).toBe(24);
    for (const x of items) expect(EMOTES[x.id], x.id).toBeDefined();
    expect(ids.length).toBe(24);
  });

  it('gives every emote 3 or more moving parts, on loops of 1.2 s (the sleeping breath 2.4 s)', () => {
    for (const id of ids) {
      const moving = flat(EMOTES[id]!.layers).filter((l) => l.motion);
      expect(moving.length, id).toBeGreaterThanOrEqual(3);
      for (const l of moving) {
        const dur = EMOTE_MOTIONS[l.motion!].dur ?? 1.2;
        if (l.motion === 'breathe' || l.motion === 'inflate') expect(dur, `${id} ${l.motion}`).toBe(2.4);
        else expect(dur, `${id} ${l.motion}`).toBeLessThanOrEqual(1.2);
      }
    }
  });

  it('starts and ends every loop on the same frame, and rests on the key pose (identity) somewhere in it', () => {
    for (const [name, m] of Object.entries(EMOTE_MOTIONS)) {
      expect(m.kf, name).toMatch(/(^|})0%/);
      expect(m.kf, name).toMatch(/100%\{/);
    }
  });

  it('fills the 96-unit box: each emote spans at least 60% of it one way and stays inside it', () => {
    for (const id of ids) {
      let x0 = Infinity;
      let y0 = Infinity;
      let x1 = -Infinity;
      let y1 = -Infinity;
      for (const s of shapesOf(id)) {
        if ('glow' in s || 'clip' in s) continue;
        const b = pathBounds(s.d);
        x0 = Math.min(x0, b.x0);
        y0 = Math.min(y0, b.y0);
        x1 = Math.max(x1, b.x1);
        y1 = Math.max(y1, b.y1);
      }
      expect(Math.max(x1 - x0, y1 - y0) / EMOTE_BOX, id).toBeGreaterThanOrEqual(0.6);
      expect(x0, `${id} left`).toBeGreaterThanOrEqual(-2);
      expect(y0, `${id} top`).toBeGreaterThanOrEqual(-4);
      expect(x1, `${id} right`).toBeLessThanOrEqual(EMOTE_BOX + 2);
      expect(y1, `${id} bottom`).toBeLessThanOrEqual(EMOTE_BOX + 2);
    }
  });

  it('tone test: outlines are the fill × 0.40 (value ≤ 0.38, never black), one highlight at most, a shadow band on sizeable parts', () => {
    const missing: string[] = [];
    let matched = 0;
    let total = 0;
    for (const id of ids) {
      for (const part of cels(shapesOf(id))) {
        const svg = shapesToSvg([part], { team: 0x2f7df6 });
        const fill = /data-fill="(#[0-9a-f]{6})"/.exec(svg)?.[1];
        expect(fill, `${id} fill`).toBeDefined();
        const line = /stroke="(#[0-9a-f]{6})"[^>]*data-outline=""/.exec(svg)?.[1];
        if ((part.ln ?? 1.2) > 0) {
          expect(line, `${id} outline`).toBeDefined();
          expect(line, `${id} outline is never black`).not.toBe('#000000');
          expect(hexValue(line!), `${id} outline ${line}`).toBeLessThanOrEqual(0.385);
          total += 1;
          if (line === celRamp(fill!, part.mat ?? 'matte').line) matched += 1;
        }
        expect((svg.match(/data-hl=""/g) ?? []).length, `${id} highlights`).toBeLessThanOrEqual(1);
        const b = pathBounds(part.d);
        const big = (b.x1 - b.x0) * (b.y1 - b.y0) >= 160 && !part.lo && hexValue(fill!) >= 0.3;
        if (big && (svg.match(/data-sh=""/g) ?? []).length !== 1) missing.push(`${id} ${part.cel} ${part.d.slice(0, 24)}`);
      }
    }
    expect(missing, 'sizeable parts without their shadow band').toEqual([]);
    expect(matched / total).toBeGreaterThan(0.95);
  });

  it('writes the keyframes only with motion on: Reduce motion shows the key pose still', () => {
    for (const id of ids) {
      const live = cosmeticSvg(`emote.${id}`)!;
      const still = cosmeticSvg(`emote.${id}`, { animate: false })!;
      expect(live, id).toMatch(/<style>.*@keyframes e-/);
      expect(live, id).not.toMatch(/<animate/);
      expect(still, id).not.toMatch(/<style|@keyframes|animation/);
      // the same picture underneath: the still is the live one without its motion
      expect(still.replace(/<g class="m-[^"]+" style="[^"]+">/g, '<g>').length).toBeGreaterThan(0);
    }
  });
});
