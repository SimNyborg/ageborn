/**
 * Units and turrets sections: every unit visual (and its skins) or every turret, on both sides, in
 * the chosen team preset, playing one clip or cycling through the whole clip contract.
 */
import { Container, Graphics, Text } from 'pixi.js';
import type { AgeId, Side, TeamPreset } from '@/contracts/ids';
import { content } from '@/content';
import { puppetBounds } from '@/visuals/draw';
import { puppetById } from '@/visuals/library';
import { MANIFEST } from '@/visuals/manifest';
import { getPart } from '@/visuals/parts/registry';
import { AGES } from '@/visuals/ages';
import type { PuppetDef } from '@/visuals/types';
import type { UnitPose } from '@/contracts/art';
import { TurretCell, UnitCell } from './cells';
import type { Scene, StageContext } from './stage';

export interface GridOptions {
  kind: 'unit' | 'turret';
  age: AgeId | 'all';
  skins: boolean;
  only: string | null;
  sides: Side[];
  preset: TeamPreset;
  clip: string;
  trim: UnitPose['levelTrim'];
  zoom: number;
}

/**
 * Puppet for a manifest key: its procedural source, or (for sheet-art entries, whose source is a
 * sheet URL) the procedural puppet with the same visual id, which the grid uses for layout, age and group.
 */
function puppetFor(k: string): PuppetDef | undefined {
  return puppetById(MANIFEST[k]?.source ?? '') ?? puppetById(k);
}

/** Visual ids shown by the grid, skins right after their base. */
export function gridVisuals(o: Pick<GridOptions, 'kind' | 'age' | 'skins' | 'only'>): { key: string; puppet: PuppetDef }[] {
  const prefix = o.kind === 'unit' ? 'unit.' : 'turret.';
  const out: { key: string; puppet: PuppetDef }[] = [];
  const keys = Object.keys(MANIFEST).filter((k) => k.startsWith(prefix));
  const bases = keys.filter((k) => !k.includes('@'));
  const order = (k: string): number => AGES.indexOf(puppetFor(k)?.age ?? 'stone');
  bases.sort((a, b) => order(a) - order(b));
  for (const k of bases) {
    const p = puppetFor(k);
    if (!p) continue;
    if (o.age !== 'all' && p.age !== o.age) continue;
    if (o.only && !o.only.split(',').some((s) => k.endsWith(s))) continue;
    out.push({ key: k, puppet: p });
    if (o.skins) {
      for (const sk of keys.filter((x) => x.startsWith(`${k}@`))) {
        const sp = puppetFor(sk);
        if (sp) out.push({ key: sk, puppet: sp });
      }
    }
  }
  return out;
}

const LABEL = { fontFamily: 'monospace', fontSize: 11, fill: 0x2a2530 };

export function buildGrid(ctx: StageContext, o: GridOptions): Scene {
  const { root, art, width } = ctx;
  const world = new Container();
  world.scale.set(o.zoom);
  root.addChild(world);
  const cells: { update(dt: number): void; destroy(): void }[] = [];
  const pad = 14;
  let x = pad;
  let y = pad;
  let rowH = 0;
  const maxW = width / o.zoom - pad;
  for (const { key, puppet } of gridVisuals(o)) {
    const b = puppetBounds(puppet, getPart);
    const bw = Math.max(70, b.maxX - b.minX + 30);
    const cellW = bw * o.sides.length + 10;
    const cellH = b.maxY - b.minY + 58;
    if (x + cellW > maxW && x > pad) {
      x = pad;
      y += rowH + 10;
      rowH = 0;
    }
    const plate = new Graphics().roundRect(x, y, cellW, cellH, 6).fill({ color: 0xffffff, alpha: 0.28 });
    world.addChild(plate);
    const title = new Text({ text: key.replace(/^(unit|turret)\./, ''), style: { ...LABEL, fontSize: 10, fontWeight: 'bold' } });
    title.position.set(x + 5, y + cellH - 30);
    const clipLabel = new Text({ text: '', style: { ...LABEL, fill: 0x6a6272 } });
    clipLabel.position.set(x + 5, y + cellH - 16);
    world.addChild(title, clipLabel);
    const [minX, maxX] = [b.minX, b.maxX];
    o.sides.forEach((side, i) => {
      const cx = x + 15 + bw * i + (side === 0 ? -minX : maxX);
      const cy = y + 8 - b.minY;
      const def = MANIFEST[key];
      if (!def) return;
      if (o.kind === 'unit') {
        const [visualId, skin] = key.split('@') as [string, string | undefined];
        // A12: a white idle aura on Legendary units and Legendary skins (the battle view adds it in a match)
        const legendary = puppet.group === 'legendary' || (skin !== undefined && content.skins[skin]?.rarity === 'legendary');
        cells.push(
          new UnitCell({
            make: () => art.createUnit({ visualId, skin, side, teamPreset: o.preset }),
            def,
            parent: world,
            x: cx,
            y: cy,
            side,
            group: puppet.group ?? 'infantry',
            trim: o.trim,
            mode: o.clip,
            label: i === 0 ? clipLabel : undefined,
            ...(legendary ? { aura: (radius: number) => art.createEffect('fx.legendary_aura', { radius, side }) } : {}),
          }),
        );
      } else {
        cells.push(new TurretCell(() => art.createTurret({ visualId: key, side, teamPreset: o.preset }), world, cx, cy, side, o.clip, i === 0 ? clipLabel : undefined));
      }
    });
    x += cellW + 10;
    rowH = Math.max(rowH, cellH);
  }
  const needed = (y + rowH + pad) * o.zoom;
  if (needed > ctx.app.screen.height) ctx.app.renderer.resize(ctx.app.screen.width, needed);
  return {
    update(dt) {
      for (const c of cells) c.update(dt);
    },
    destroy() {
      for (const c of cells) c.destroy();
      world.destroy({ children: true });
    },
  };
}
