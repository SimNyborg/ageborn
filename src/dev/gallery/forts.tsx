/**
 * Forts section (DESIGN A16.14.8): every fort of an age, for both teams, in every state: scaffold,
 * built (idle), hit, crumble stages 1-3, decay, tower wind-up and jam, camp spawn, collapse, and the
 * trap's unarmed, armed, sprung and spent states; plus the age's levy beside its camp. `mode=life`
 * plays each fort's whole life in a loop instead (place, scaffold, build, fights, crumble, collapse).
 */
import { Container, Graphics, Text } from 'pixi.js';
import type { FortPose, FortView, UnitView } from '@/contracts/art';
import type { AgeId, Side, TeamPreset } from '@/contracts/ids';
import { AGES } from '@/visuals/ages';
import { FORT_VISUALS, LEVY_VISUALS } from '@/visuals/forts';
import type { Scene, StageContext } from './stage';

export interface FortsOptions {
  age: AgeId | 'all';
  preset: TeamPreset;
  zoom: number;
  mode: 'states' | 'life';
  sides: Side[];
}

type Kind = 'wall' | 'tower' | 'camp' | 'trap';

interface Cell {
  view: FortView;
  make: () => FortView;
  kind: Kind;
  state: string;
  t: number;
  x: number;
  y: number;
  started: boolean;
}

const STATES: Record<Kind, readonly string[]> = {
  wall: ['scaffold', 'built', 'hit', 'crumble1', 'crumble2', 'crumble3', 'decay', 'collapse'],
  tower: ['scaffold', 'built', 'fire', 'jammed', 'crumble1', 'crumble2', 'crumble3', 'collapse'],
  camp: ['scaffold', 'built', 'spawn', 'crumble1', 'crumble2', 'crumble3', 'decay', 'collapse'],
  trap: ['unarmed', 'armed', 'sprung', 'spent'],
};

function basePose(x: number, y: number): FortPose {
  return { x, y, hpBp: 10000, scaffoldBp: 10000, decayBp: 0, crumbleStage: 0, silenced: false };
}

/** The pose of a state cell at time t (ms). */
function statePose(c: Cell): FortPose {
  const p = basePose(c.x, c.y);
  const loop = c.t % 2400;
  switch (c.state) {
    case 'scaffold':
      p.scaffoldBp = Math.min(9999, Math.floor(((c.t % 5000) / 5000) * 10000));
      p.hpBp = 5000;
      break;
    case 'unarmed':
      p.scaffoldBp = 4000;
      p.charges = 3;
      break;
    case 'crumble1':
      p.hpBp = 6000;
      p.crumbleStage = 1;
      break;
    case 'crumble2':
      p.hpBp = 3000;
      p.crumbleStage = 2;
      break;
    case 'crumble3':
    case 'collapse':
      p.hpBp = 1000;
      p.crumbleStage = 3;
      break;
    case 'decay':
      p.decayBp = 5200;
      p.hpBp = 5000;
      p.crumbleStage = 1;
      break;
    case 'fire':
      p.nextAttackInMs = 1400 - (loop % 1400);
      break;
    case 'jammed':
      p.silenced = true;
      break;
    case 'armed':
    case 'sprung':
    case 'spent':
      p.charges = c.state === 'armed' ? 3 : c.state === 'sprung' ? 2 : 0;
      break;
    default:
      break;
  }
  return p;
}

function label(text: string, x: number, y: number, size = 11, color = 0xe8e2d4): Text {
  const t = new Text({ text, style: { fontFamily: 'system-ui, sans-serif', fontSize: size, fill: color } });
  t.anchor.set(0.5, 0);
  t.position.set(x, y);
  return t;
}

export function buildForts(ctx: StageContext, o: FortsOptions): Scene {
  const { root, art, width } = ctx;
  const ages: AgeId[] = o.age === 'all' ? [...AGES] : [o.age];
  const forts = FORT_VISUALS.filter((f) => ages.includes(f.age));
  const world = new Container();
  world.scale.set(o.zoom);
  root.addChild(world);
  const cells: Cell[] = [];
  const levies: { view: UnitView; x: number; y: number; t: number; side: Side }[] = [];
  const colW = 150;
  const rowH = 150;
  let y = 30;
  const ground = new Graphics();
  world.addChild(ground);
  const layer = new Container();
  layer.sortableChildren = true;
  world.addChild(layer);
  const cols = o.mode === 'life' ? 3 : 8;
  for (const f of forts) {
    for (const side of o.sides) {
      y += rowH;
      const states = o.mode === 'life' ? ['life', 'life', 'life'] : STATES[f.kind];
      ground.rect(0, y, colW * (cols + 1.4), 36).fill({ color: 0x6d6450, alpha: 1 });
      ground.rect(0, y, colW * (cols + 1.4), 3).fill({ color: 0x847a62, alpha: 1 });
      world.addChild(label(`${f.id} (${f.kind}) ${side === 0 ? 'you' : 'foe'}`, 70, y - rowH + 18, 12, 0xffe8b0));
      states.forEach((s, i) => {
        const x = 70 + i * colW + (side === 1 ? 20 : 0);
        const make = (): FortView => {
          const v = art.createFort({ visualId: `fort.${f.id}`, side, teamPreset: o.preset, kind: f.kind });
          layer.addChild(v.root);
          return v;
        };
        cells.push({ view: make(), make, kind: f.kind, state: s, t: o.mode === 'life' ? i * 5300 : 0, x, y, started: false });
        world.addChild(label(s, x, y + 8));
      });
      if (f.kind === 'camp') {
        const lv = LEVY_VISUALS.find((l) => l.age === f.age);
        if (lv) {
          const x = 70 + states.length * colW;
          const view = art.createUnit({ visualId: `unit.${lv.id}`, side, teamPreset: o.preset });
          layer.addChild(view.root);
          view.play('idle', { loop: true });
          levies.push({ view, x, y, t: 0, side });
          world.addChild(label(`${lv.id} (levy)`, x, y + 8));
        }
      }
    }
  }
  y += 60;
  void width;
  return {
    update(dt: number): void {
      for (const c of cells) {
        c.t += dt;
        if (o.mode === 'life') {
          if (c.t % 16000 < (c.t - dt) % 16000) {
            c.view.destroy();
            c.view = c.make();
          }
          lifeStep(c, dt);
        } else {
          const p = statePose(c);
          c.view.setPose(p);
          if (!c.started) {
            c.started = true;
            if (c.state === 'sprung') c.view.play('trigger');
            if (c.state === 'spent') c.view.play('trigger');
          }
          const loop = c.t % 2400;
          const prev = (c.t - dt) % 2400;
          if (loop < prev) {
            if (c.state === 'hit') c.view.play('hit');
            if (c.state === 'spawn') c.view.play('spawn');
            if (c.state === 'sprung') c.view.play('trigger');
          }
          if (c.state === 'fire') {
            const a = c.t % 1400;
            const b = (c.t - dt) % 1400;
            if (a < b) c.view.play('attack');
          }
          // the collapse replays every 3.2 s on a fresh view
          if (c.state === 'collapse') {
            const a = c.t % 3200;
            if (a < (c.t - dt) % 3200) {
              c.view.destroy();
              c.view = c.make();
              c.view.setPose(statePose(c));
            }
            if (a >= 600 && a - dt < 600) c.view.play('collapse');
          }
        }
        c.view.update(dt);
        c.view.root.zIndex = c.y;
      }
      for (const l of levies) {
        l.t += dt;
        l.view.setPose({ x: l.x, y: l.y, facing: l.side === 0 ? 1 : -1, hpBp: 10000, shieldBp: 0, stunned: false, frozen: false, alpha: 1, levelTrim: 'none', roleGlyph: 'infantry' });
        l.view.update(dt);
      }
    },
    destroy(): void {
      for (const c of cells) c.view.destroy();
      for (const l of levies) l.view.destroy();
      world.destroy({ children: true });
    },
  };
}

/** One fort's life in a loop: placed, 5 s scaffold, fights (hits, a crumble per stage, shots, levies), collapse. */
function lifeStep(c: Cell, dt: number): void {
  const T = 16000;
  const t = c.t % T;
  const prev = (c.t - dt) % T;
  const p = basePose(c.x, c.y);
  if (c.kind === 'trap') {
    p.scaffoldBp = t < 2000 ? Math.floor((t / 2000) * 9999) : 10000;
    p.charges = t < 5000 ? 3 : t < 8000 ? 2 : t < 11000 ? 1 : 0;
    c.view.setPose(p);
    for (const at of [5000, 8000, 11000]) if (prev < at && t >= at) c.view.play('trigger');
    if (prev < 11800 && t >= 11800) c.view.play('spent');
    return;
  }
  p.scaffoldBp = t < 5000 ? Math.floor((t / 5000) * 9999) : 10000;
  p.hpBp = t < 5000 ? 5000 : t < 8000 ? 10000 : t < 10000 ? 6000 : t < 12000 ? 3000 : 1000;
  p.crumbleStage = t < 8000 ? 0 : t < 10000 ? 1 : t < 12000 ? 2 : 3;
  p.decayBp = t > 9000 ? Math.min(6000, (t - 9000) * 2) : 0;
  if (c.kind === 'tower' && t > 5000) p.nextAttackInMs = 1400 - ((t - 5000) % 1400);
  c.view.setPose(p);
  for (const at of [6500, 7300, 9000, 11000, 12500]) if (prev < at && t >= at) c.view.play('hit');
  if (c.kind === 'camp') for (const at of [7000, 10000]) if (prev < at && t >= at) c.view.play('spawn');
  if (c.kind === 'tower' && t > 5000 && (t - 5000) % 1400 < (prev - 5000) % 1400) c.view.play('attack');
  if (prev < 13500 && t >= 13500) c.view.play('collapse');
}
