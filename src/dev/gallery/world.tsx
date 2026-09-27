/**
 * World section: the split-age backdrop with the arena ground, both bases with their mounts and
 * turrets, and an optional parade of units, all at lane scale. Controls drive the seam, evolve
 * wipes, crumble stages, Treasury, the Last Stand horn, hits, morphs and the collapse.
 */
import { Container } from 'pixi.js';
import type { BackdropView, BaseView, TurretView, UnitView } from '@/contracts/art';
import type { AgeId, Side, TeamPreset } from '@/contracts/ids';
import { AGES } from '@/visuals/ages';
import { AGE_PUPPETS } from '@/visuals/puppets';
import { WORLD } from '@/visuals/style';
import type { Scene, StageContext } from './stage';

export interface WorldOptions {
  left: AgeId;
  right: AgeId;
  arena: string;
  preset: TeamPreset;
  seam: number;
  crumble: 0 | 1 | 2 | 3;
  treasury: number;
  horn: boolean;
  parade: boolean;
}

/** Imperative handles for the section's buttons. */
export interface WorldControls {
  hit(side: Side): void;
  morph(side: Side): void;
  collapse(side: Side): void;
  fire(): void;
  outdated(on: boolean): void;
}

export function buildWorld(ctx: StageContext, o: WorldOptions, controls: { current: WorldControls | null }): Scene {
  const { root, art, width, height } = ctx;
  const world = new Container();
  const k = width / WORLD.worldWidthLu;
  world.scale.set(k);
  world.position.set(-WORLD.worldLeftLu * k, height * 0.8);
  root.addChild(world);
  const ages: Record<Side, AgeId> = { 0: o.left, 1: o.right };
  const backdrop: BackdropView = art.createBackdrop({ left: o.left, right: o.right, arena: o.arena });
  backdrop.setSeam(o.seam);
  world.addChild(backdrop.root);
  const bases: Record<Side, BaseView> = {
    0: art.createBase({ age: o.left, side: 0, teamPreset: o.preset }),
    1: art.createBase({ age: o.right, side: 1, teamPreset: o.preset }),
  };
  bases[0].root.position.set(0, 0);
  bases[1].root.position.set(WORLD.laneLu, 0);
  const turrets: { view: TurretView; side: Side }[] = [];
  const units: { view: UnitView; side: Side; x: number; speed: number; t: number }[] = [];
  const unitLayer = new Container();
  for (const side of [0, 1] as const) {
    const b = bases[side];
    world.addChild(b.root);
    b.setCrumble(o.crumble);
    b.setTreasury(o.treasury);
    b.lastStandGlow(o.horn);
  }
  const placeTurrets = (side: Side): void => {
    for (const t of turrets.filter((x) => x.side === side)) t.view.destroy();
    for (let i = turrets.length - 1; i >= 0; i--) if (turrets[i]?.side === side) turrets.splice(i, 1);
    const set = AGE_PUPPETS[ages[side]].turrets;
    bases[side].mountPoints().forEach((m, i) => {
      const p = set[i % Math.max(1, set.length)];
      if (!p) return;
      const view = art.createTurret({ visualId: p.id, side, teamPreset: o.preset });
      view.root.position.set(m.x, m.y);
      view.play('build');
      world.addChild(view.root);
      turrets.push({ view, side });
    });
  };
  placeTurrets(0);
  placeTurrets(1);
  world.addChild(unitLayer);
  const spawnUnit = (side: Side): void => {
    const set = AGE_PUPPETS[ages[side]].units.filter((u) => !u.motion.air);
    const p = set[Math.floor(Math.random() * set.length)];
    if (!p) return;
    const view = art.createUnit({ visualId: p.id, side, teamPreset: o.preset });
    unitLayer.addChild(view.root);
    view.play('spawn');
    view.play('walk');
    units.push({ view, side, x: side === 0 ? 30 : WORLD.laneLu - 30, speed: p.motion.speedLuPerSec ?? 60, t: 0 });
  };
  let spawnT = 0;
  controls.current = {
    hit: (side) => bases[side].hit(),
    morph: (side) => {
      const next = AGES[(AGES.indexOf(ages[side]) + 1) % AGES.length] ?? 'stone';
      ages[side] = next;
      bases[side].morphTo(next, 1800);
      backdrop.wipe(side, next, WORLD.evolveWipeMs);
      placeTurrets(side);
    },
    collapse: (side) => bases[side].collapse(),
    fire: () => {
      for (const t of turrets) t.view.play('fire');
    },
    outdated: (on) => {
      for (const t of turrets) t.view.setOutdated(on);
    },
  };
  let clock = 0;
  return {
    update(dt) {
      clock += dt;
      backdrop.update(dt);
      for (const side of [0, 1] as const) bases[side].update(dt);
      for (const t of turrets) {
        t.view.aimAt(t.side === 0 ? 420 + 200 * Math.sin(clock / 1400) : 780 + 200 * Math.sin(clock / 1500));
        t.view.update(dt);
      }
      if (o.parade) {
        spawnT -= dt;
        if (spawnT <= 0 && units.length < 10) {
          spawnUnit(0);
          spawnUnit(1);
          spawnT = 1400;
        }
      }
      for (let i = units.length - 1; i >= 0; i--) {
        const u = units[i];
        if (!u) continue;
        u.t += dt;
        const dir = u.side === 0 ? 1 : -1;
        const stop = u.side === 0 ? 560 : 640;
        if ((u.side === 0 && u.x < stop) || (u.side === 1 && u.x > stop)) u.x += (dir * u.speed * dt) / 1000;
        else if (u.t > 0) {
          u.view.play('die');
          u.t = -2000;
        }
        u.view.setPose({ x: u.x, y: (i % 3) * 8 - 8, facing: dir as 1 | -1, hpBp: 10000, shieldBp: 0, stunned: false, frozen: false, alpha: 1, levelTrim: 'none', roleGlyph: 'infantry' });
        u.view.update(dt);
        if (u.t < 0 && u.t > -200) {
          u.view.destroy();
          units.splice(i, 1);
        }
      }
    },
    destroy() {
      controls.current = null;
      for (const u of units) u.view.destroy();
      for (const t of turrets) t.view.destroy();
      bases[0].destroy();
      bases[1].destroy();
      backdrop.destroy();
      world.destroy({ children: true });
    },
  };
}
