/**
 * Damage kit section (queue item 40): every mark and strip of the damage kit on swatches of the materials it lands on,
 * baked like the runtime bakes them, at the drawn size of a stage-2 mark (8 lu across), so the kit can be judged at game
 * scale (`zoom=0.92`, a phone's 0.915 CSS px per lu) and enlarged. Dev only (exempt from the i18n rule).
 */
import { Container, Graphics, Sprite, Text } from 'pixi.js';
import { DAMAGE_STRIP_PARTS } from '@/visuals/damage/kit';
import { markParts } from '@/visuals/damage/marks';
import { FX_ZONES } from '@/visuals/effects/sprites';
import { getPart } from '@/visuals/parts/registry';
import type { Scene, StageContext } from './stage';

/** Swatch colours by surface: what the kit has to read on (A11 age palettes, team orange and blue for cloth). */
const SWATCHES: Readonly<Record<string, readonly number[]>> = {
  cloth: [0xf28a1e, 0x2f7df6, 0xd8cbb0, 0x6b7547],
  hide: [0x8a6a4a, 0xc9b08a, 0x5a4636],
  metal: [0x9aa0a6, 0x5b5f66, 0x5e6b45, 0xb09c78],
  wood: [0x9c7448, 0x6e5034],
  stone: [0xa8a196, 0xd8d0c0, 0x6c665e],
  glass: [0x2f3a44, 0xafc6cf],
  energy: [0xcfeff0, 0x3a3550],
  strip: [0x9aa0a6, 0x6b7547],
};

/** The mark's drawn size (lu) and the swatch's size around it. */
const MARK_LU = 8;
const CELL_LU = 15;

export function buildDamageKit(ctx: StageContext, o: { zoom: number }): Scene {
  const z = o.zoom;
  const baker = ctx.art.procedural.baker;
  const root = new Container();
  ctx.root.addChild(root);
  const byMat = new Map<string, string[]>();
  for (const id of [...markParts(), ...DAMAGE_STRIP_PARTS]) {
    const mat = id.startsWith('dmg.strip.') ? 'strip' : (id.split('.')[1] ?? '');
    const list = byMat.get(mat) ?? [];
    list.push(id);
    byMat.set(mat, list);
  }
  const cell = CELL_LU * z;
  const gap = Math.max(2, 2 * z);
  let y = 8;
  for (const [mat, ids] of byMat) {
    const colours = SWATCHES[mat] ?? [0x888888];
    const label = new Text({ text: mat, style: { fill: 0xf4ebd8, fontSize: 12, fontFamily: 'monospace' } });
    label.position.set(8, y);
    root.addChild(label);
    y += 16;
    for (const c of colours) {
      let x = 8;
      for (const id of ids) {
        const g = new Graphics().roundRect(x, y, cell, cell, Math.max(2, 2 * z)).fill(c);
        root.addChild(g);
        const p = getPart(id);
        if (p) {
          const b = baker.get(p, FX_ZONES);
          baker.flush();
          const holder = new Container();
          const s = new Sprite(b.main);
          s.position.set(b.origin.x, b.origin.y);
          holder.addChild(s);
          // marks are drawn about 8 lu across from an 8 lu part (`UnitDamage.placeMark`: size / 8); strips hang from the top
          const k = (MARK_LU / 8) * z;
          holder.scale.set(k);
          holder.position.set(x + cell / 2, mat === 'strip' ? y + cell * 0.12 : y + cell / 2);
          if (mat === 'strip' && id.startsWith('dmg.strip.cloth')) s.tint = 0xa7774a;
          root.addChild(holder);
        }
        x += cell + gap;
      }
      y += cell + gap;
    }
    y += 6;
  }
  return {
    update: () => {},
    destroy: () => root.destroy({ children: true }),
  };
}
