/**
 * Fake `ArtProvider` (DESIGN C2/WP0 task 5, B5): every view is a coloured rectangle drawn with Pixi
 * `Graphics`, so render and capsule work (WP5, WP10) never wait on art.
 *
 * It also records every call in `calls`, so tests can assert what the view layer asked for.
 * Team colours: side 0 blue, side 1 orange (DESIGN A2.1).
 */
// Fakes are test and dev helpers; the real ArtProvider lives in `visuals`, which may import pixi.js (DESIGN B2).
// eslint-disable-next-line ageborn/layers
import { Container, Graphics } from 'pixi.js';
import type {
  Anchors,
  ArtProvider,
  BackdropView,
  BaseView,
  ClipName,
  EffectView,
  TurretView,
  UnitPose,
  UnitView,
} from '../art';
import type { AgeId, CardId, EffectId, Foil, Pt, Side, SkinId, TeamPreset, VisualId } from '../ids';

export const FAKE_TEAM_COLORS: Record<Side, number> = { 0: 0x3b82f6, 1: 0xf97316 };

const AGE_COLORS: Record<AgeId, number> = {
  stone: 0x8b7355,
  medieval: 0x6b7280,
  gunpowder: 0x7c5c3b,
  modern: 0x4b5f3a,
  future: 0x5b6fb0,
  bronze: 0xcdbe9e,
  industrial: 0x5b6168,
  cosmic: 0x1e1830,
};

export interface FakeArtCall {
  method: keyof ArtProvider;
  args: unknown[];
}

const FAKE_ANCHORS: Anchors = {
  feet: { x: 0, y: 0 },
  head: { x: 0, y: -40 },
  muzzle: { x: 12, y: -24 },
  hitCenter: { x: 0, y: -20 },
};

function rect(color: number, w: number, h: number, alpha = 1): Graphics {
  return new Graphics().rect(-w / 2, -h, w, h).fill({ color, alpha });
}

class FakeUnitView implements UnitView {
  readonly root = new Container();
  readonly anchors = FAKE_ANCHORS;
  readonly body: Graphics;
  lastPose: UnitPose | null = null;
  clip: string = 'idle';
  frozenMs = 0;
  flashMs = 0;
  destroyed = false;

  constructor(
    readonly visualId: VisualId,
    readonly side: Side,
  ) {
    this.body = rect(FAKE_TEAM_COLORS[side], 24, 40);
    this.root.label = visualId;
    this.root.addChild(this.body);
  }
  setPose(p: UnitPose): void {
    this.lastPose = p;
    this.root.position.set(p.x, p.y);
    this.root.scale.x = p.facing;
    this.root.alpha = p.alpha;
  }
  play(clip: ClipName | string): void {
    this.clip = clip;
  }
  freeze(ms: number): void {
    this.frozenMs = ms;
  }
  flash(ms: number): void {
    this.flashMs = ms;
  }
  update(dtMs: number): void {
    this.frozenMs = Math.max(0, this.frozenMs - dtMs);
    this.flashMs = Math.max(0, this.flashMs - dtMs);
  }
  destroy(): void {
    this.destroyed = true;
    this.root.destroy({ children: true });
  }
}

class FakeTurretView implements TurretView {
  readonly root = new Container();
  clip = 'idle';
  outdated = false;
  aimX = 0;
  constructor(side: Side) {
    this.root.addChild(rect(FAKE_TEAM_COLORS[side], 20, 20));
  }
  aimAt(x: number): void {
    this.aimX = x;
  }
  play(clip: 'build' | 'idle' | 'fire' | 'sell' | 'modernise'): void {
    this.clip = clip;
  }
  setOutdated(on: boolean): void {
    this.outdated = on;
  }
  update(): void {}
  destroy(): void {
    this.root.destroy({ children: true });
  }
}

class FakeBaseView implements BaseView {
  readonly root = new Container();
  crumble: 0 | 1 | 2 | 3 = 0;
  treasury = 0;
  age: AgeId;
  glow = false;
  hits = 0;
  collapsed = false;
  private readonly body: Graphics;
  constructor(age: AgeId, side: Side) {
    this.age = age;
    this.body = rect(AGE_COLORS[age], 100, 160);
    this.root.addChild(this.body, rect(FAKE_TEAM_COLORS[side], 100, 12));
  }
  mountPoints(): Pt[] {
    return [0, 1, 2, 3].map((i) => ({ x: 0, y: -40 - i * 30 }));
  }
  setCrumble(stage: 0 | 1 | 2 | 3): void {
    this.crumble = stage;
  }
  setTreasury(level: number): void {
    this.treasury = level;
  }
  morphTo(age: AgeId): void {
    this.age = age;
    this.body.clear().rect(-50, -160, 100, 160).fill(AGE_COLORS[age]);
  }
  lastStandGlow(on: boolean): void {
    this.glow = on;
  }
  hit(): void {
    this.hits++;
  }
  collapse(): void {
    this.collapsed = true;
  }
  update(): void {}
  destroy(): void {
    this.root.destroy({ children: true });
  }
}

class FakeBackdropView implements BackdropView {
  readonly root = new Container();
  seam = 600;
  constructor(left: AgeId, right: AgeId) {
    this.root.addChild(
      new Graphics().rect(0, -300, 600, 300).fill(AGE_COLORS[left]),
      new Graphics().rect(600, -300, 600, 300).fill(AGE_COLORS[right]),
    );
  }
  setSeam(x: number): void {
    this.seam = x;
  }
  wipe(): void {}
  update(): void {}
  destroy(): void {
    this.root.destroy({ children: true });
  }
}

class FakeEffectView implements EffectView {
  readonly root = new Container();
  private remainingMs = 0;
  private started = false;
  /** Where the last `fly` was headed. */
  target: Pt | null = null;
  constructor(
    readonly id: string,
    color: number,
  ) {
    this.root.label = id;
    this.root.addChild(rect(color, 8, 8));
  }
  get done(): boolean {
    return this.started && this.remainingMs <= 0;
  }
  fly(from: Pt, to: Pt, travelMs: number): void {
    this.started = true;
    this.remainingMs = travelMs;
    this.root.position.set(from.x, from.y);
    this.target = to;
  }
  playAt(at: Pt): void {
    this.started = true;
    this.remainingMs = 300;
    this.root.position.set(at.x, at.y);
  }
  update(dtMs: number): void {
    this.remainingMs -= dtMs;
  }
  destroy(): void {
    this.root.destroy({ children: true });
  }
}

/** A 1×1 blue PNG; portraits need no canvas in the fake. */
export const FAKE_PORTRAIT_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

export class FakeArtProvider implements ArtProvider {
  readonly calls: FakeArtCall[] = [];
  readonly preloaded = new Set<AgeId>();

  async preload(ages: AgeId[]): Promise<void> {
    this.calls.push({ method: 'preload', args: [ages] });
    for (const a of ages) this.preloaded.add(a);
  }
  createUnit(o: { visualId: VisualId; skin?: SkinId; side: Side; teamPreset: TeamPreset }): FakeUnitView {
    this.calls.push({ method: 'createUnit', args: [o] });
    return new FakeUnitView(o.skin ? `${o.visualId}@${o.skin}` : o.visualId, o.side);
  }
  createTurret(o: { visualId: VisualId; skin?: SkinId; side: Side; teamPreset: TeamPreset }): TurretView {
    this.calls.push({ method: 'createTurret', args: [o] });
    return new FakeTurretView(o.side);
  }
  createBase(o: { age: AgeId; skin?: SkinId; side: Side; teamPreset: TeamPreset }): BaseView {
    this.calls.push({ method: 'createBase', args: [o] });
    return new FakeBaseView(o.age, o.side);
  }
  createBackdrop(o: { left: AgeId; right: AgeId; arena: string }): BackdropView {
    this.calls.push({ method: 'createBackdrop', args: [o] });
    return new FakeBackdropView(o.left, o.right);
  }
  createProjectile(visualId: VisualId, side: Side): EffectView {
    this.calls.push({ method: 'createProjectile', args: [visualId, side] });
    return new FakeEffectView(visualId, FAKE_TEAM_COLORS[side]);
  }
  createEffect(effectId: EffectId, o?: Record<string, number>): EffectView {
    this.calls.push({ method: 'createEffect', args: [effectId, o] });
    return new FakeEffectView(effectId, 0xffffff);
  }
  async portrait(o: { card: CardId; skin?: SkinId; foil?: Foil; size: number; side?: Side }): Promise<string> {
    this.calls.push({ method: 'portrait', args: [o] });
    return FAKE_PORTRAIT_URL;
  }
}
