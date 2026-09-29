import type { MatchConfig, PowerDef, SimEvent, UnitDef } from '@/contracts';
import { FakeArtProvider } from '@/contracts/fakes/art';
import { FakeAudio } from '@/contracts/fakes/audio';
import { FakeSim, cannedBattleEvents, fakeMatchConfig } from '@/contracts/fakes/sim';
import { Container } from 'pixi.js';
import { describe, expect, it } from 'vitest';
import { BattleView, type BattleViewOptions } from '../battleView';
import { EVOLVE_CUE_FADE_MS } from '../eventMapper';
import type { LabelFactory } from '../feel/numbers';
import { FixedStepClock } from '../loop';
import type { ViewEvent } from '../types';

type FakeUnit = ReturnType<FakeArtProvider['createUnit']>;

class SpyArt extends FakeArtProvider {
  readonly unitViews: FakeUnit[] = [];
  override createUnit(o: Parameters<FakeArtProvider['createUnit']>[0]): FakeUnit {
    const v = super.createUnit(o);
    this.unitViews.push(v);
    return v;
  }
}

const labels: LabelFactory = () => {
  const root = new Container();
  return { root, setText: (s) => (root.label = s), setStyle: () => {} };
};

function setup(o: Partial<BattleViewOptions> = {}, events?: readonly SimEvent[]) {
  const sim = new FakeSim(events ? { events } : {});
  const art = new SpyArt();
  const audio = new FakeAudio();
  const view = new BattleView({ sim, art, audio, labelFactory: labels, ...o });
  view.resize(1280, 720);
  const seen: ViewEvent[] = [];
  view.on((e) => seen.push(e));
  return { sim, art, audio, view, seen };
}

/** Runs the B6 loop at 60 fps until the stream ends plus `extraMs`. */
function play(s: ReturnType<typeof setup>, extraMs = 2000): { frozenFrames: number } {
  const clock = new FixedStepClock();
  let frozenFrames = 0;
  let after = 0;
  for (let frame = 0; frame < 5000 && after < extraMs; frame++) {
    clock.add(1000 / 60, 1, s.view.simFrozen);
    if (s.view.simFrozen) frozenFrames++;
    while (!s.view.simFrozen && !s.sim.done && clock.consume()) s.view.onEvents(s.sim.step([]));
    s.view.render(clock.alpha, 1000 / 60);
    if (s.sim.done) after += 1000 / 60;
  }
  return { frozenFrames };
}

describe('BattleView on the fake stream (C2/WP5 Phase 1)', () => {
  it('builds the scene: backdrop, both bases, then units as they spawn', () => {
    const s = setup();
    expect(s.art.calls.map((c) => c.method).slice(0, 3)).toEqual(['createBackdrop', 'createBase', 'createBase']);
    s.view.onEvents(s.sim.step([]));
    expect(s.art.unitViews.map((u) => u.visualId)).toEqual(['unit.bonker', 'unit.pebbler']);
    expect(s.art.unitViews[0]?.clip).toBe('spawn');
    s.view.render(0, 16);
    const pose = s.art.unitViews[1]?.lastPose;
    expect(pose?.x).toBe(700);
    expect(pose?.facing).toBe(-1);
    expect(Math.abs(pose?.y ?? 0)).toBe(12);
    expect(s.audio.played()).toContain('spawn_pop');
  });

  it('maps the whole stream: clips, projectile, flashes, sounds, music, evolve, turret and end', () => {
    const s = setup();
    play(s);
    const played = s.audio.played();
    for (const id of ['spawn_pop', 'shot_sling', 'hit_blunt', 'pw_stampede', 'power_telegraph', 'die_bio', 'turret_build', 'shot_catapult', 'base_hit', 'evolve_riser', 'evolve_fanfare_medieval', 'overdrive_horn', 'emote_pop']) {
      expect(played, id).toContain(id);
    }
    const methods = s.audio.calls.map((c) => c.method);
    expect(methods).toContain('music.duck');
    expect(s.audio.calls).toContainEqual({ method: 'music.transpose', semitones: 2 });
    expect(s.audio.calls).toContainEqual({ method: 'music.setCue', cue: 'music.medieval', o: { fadeMs: EVOLVE_CUE_FADE_MS } });
    expect(s.audio.calls).toContainEqual({ method: 'music.setLayer', layer: 'overdrive', v01: 1 });
    const art = s.art.calls.map((c) => c.method);
    expect(art).toContain('createProjectile');
    expect(art).toContain('createTurret');
    expect(s.art.calls.filter((c) => c.method === 'createEffect').map((c) => c.args[0])).toEqual(
      expect.arrayContaining(['fx.spark_blunt', 'fx.dust_poof', 'fx.ko_stars', 'fx.evolve_pillar', 'fx.telegraph_zone', 'fx.aurochs', 'fx.muzzle', 'fx.overdrive_frame']),
    );
    expect(s.seen.map((e) => e.t)).toEqual(expect.arrayContaining(['ascending', 'evolved', 'emote', 'matchEnded']));
    // The retreat win cheers the winner; Vanguard footmen were spawned by the evolve.
    expect(s.art.unitViews.filter((u) => u.visualId === 'unit.footman')).toHaveLength(2);
  });

  it('time-scales the attack clip to the sim impact tick and flashes the victim', () => {
    const s = setup();
    const played: { clip: string; o: unknown }[] = [];
    for (let i = 0; i < 5; i++) s.view.onEvents(s.sim.step([]));
    const pebbler = s.art.unitViews[1];
    if (!pebbler) throw new Error('no pebbler');
    const orig = pebbler.play.bind(pebbler);
    pebbler.play = (clip: string, o?: unknown) => {
      played.push({ clip, o });
      orig(clip);
    };
    s.sim.step([]);
    // Tick 5 carried the pebbler's attackStarted with 14 windup ticks; replay it through the view.
    s.view.onEvents([{ tick: 5, e: 'attackStarted', id: 2, targetId: 1, windupTicks: 14, attackIndex: 0 }]);
    expect(played).toContainEqual({ clip: 'attack', o: { impactAtMs: 700 } });
    s.view.onEvents([cannedBattleEvents[5] as SimEvent]);
    expect(s.art.unitViews[0]?.flashMs).toBe(60);
  });

  it('holds the sim during global freezes and respects the 150 ms cap', () => {
    const s = setup();
    const { frozenFrames } = play(s);
    // The power (120 ms) and the evolve (100 ms) freeze globally; the stream has no other freezes.
    expect(frozenFrames).toBeGreaterThanOrEqual(12);
    expect(frozenFrames).toBeLessThanOrEqual(16);
  });

  it('turns global and local hitstop off with the hitstop setting', () => {
    const s = setup({ settings: { hitstop: false } });
    const { frozenFrames } = play(s);
    expect(frozenFrames).toBe(0);
  });

  it('disables shake with reduce motion and the shake slider', () => {
    const s = setup({ settings: { reduceMotion: true } });
    play(s, 16);
    expect(s.view.layers.shaker.position.x).toBeCloseTo(640);
    const t = setup({ settings: { shake: 0 } });
    t.view.director.addTrauma(1);
    t.view.render(0, 16);
    expect(t.view.layers.shaker.position.x).toBeCloseTo(640);
    const u = setup();
    u.view.director.addTrauma(1);
    u.view.render(0, 16);
    u.view.render(0, 16);
    expect(Math.abs(u.view.layers.shaker.position.x - 640) + Math.abs(u.view.layers.shaker.position.y - 360)).toBeGreaterThan(0);
  });

  it('keeps a dead unit for its death clip, then removes it', () => {
    const s = setup();
    for (let i = 0; i < 71; i++) s.view.onEvents(s.sim.step([]));
    const pebbler = s.art.unitViews[1];
    expect(pebbler?.clip).toBe('die');
    s.view.render(0, 16);
    expect(pebbler?.destroyed).toBe(false);
    // MR-105: the body falls, lies and fades (the death linger, 1.7 s), then goes.
    for (let i = 0; i < 90; i++) s.view.render(0, 16);
    expect(pebbler?.destroyed).toBe(false);
    for (let i = 0; i < 30; i++) s.view.render(0, 16);
    expect(pebbler?.destroyed).toBe(true);
  });

  it('stands your Hold flag on the lane only while you Hold, where the sim put it (A18.4.2)', () => {
    const s = setup();
    s.view.render(0, 16);
    expect(s.view.holdFlagScreen()).toBeNull();
    s.sim.state.sides[0].stance = 'hold';
    s.sim.state.sides[0].holdP = 320_000;
    s.view.render(0, 16);
    const a = s.view.holdFlagScreen();
    s.sim.state.sides[0].holdP = 560_000;
    s.view.render(0, 16);
    const b = s.view.holdFlagScreen();
    if (!a || !b) throw new Error('no flag');
    expect(b.x).toBeGreaterThan(a.x);
    expect(a.top).toBeLessThan(a.y);
    // The drag preview holds the camera and clears.
    s.view.previewHoldFlag(700);
    s.view.render(0, 16);
    s.view.previewHoldFlag(null);
    expect(() => s.view.render(0, 16)).not.toThrow();
    // A replay (spectator) shows no flag grip.
    const r = setup({ spectator: true });
    r.sim.state.sides[0].stance = 'hold';
    expect(r.view.holdFlagScreen()).toBeNull();
  });

  it('reports taps on your mounts and the "+" mount, not on empty lane', () => {
    const s = setup();
    s.view.render(0, 16);
    const p0 = s.view.mountScreenPoint(0);
    const p1 = s.view.mountScreenPoint(1);
    if (!p0 || !p1) throw new Error('no mounts');
    expect(s.view.tap(p0, false)).toBe(true);
    expect(s.view.tap(p1, true)).toBe(true);
    expect(s.view.tap({ x: 640, y: 300 }, false)).toBe(false);
    const taps = s.seen.filter((e) => e.t === 'mountTap');
    expect(taps).toMatchObject([
      { t: 'mountTap', mount: 0, kind: 'mount', shift: false },
      { t: 'mountTap', mount: 1, kind: 'buy', shift: true },
    ]);
  });

  it('converts pointer positions to power zone progress and previews aimable powers only', () => {
    const s = setup();
    s.view.render(0, 16);
    const rockslide = s.view.powerAimable();
    const mid = s.view.camera.worldToScreen(600, -20);
    expect(s.view.laneP(mid.x, mid.y)).toBe(600);
    const edge = s.view.camera.worldToScreen(20, -20);
    expect(s.view.laneP(edge.x, edge.y)).toBe(150);
    expect(s.view.laneP(mid.x, 5)).toBeNull();
    // The Home slot (Rockslide, a barrage) is placed by dragging; Stampede ignores the aim.
    expect(rockslide).toBe(true);
    const c = fakeMatchConfig();
    const sides = structuredClone(c.sides) as [MatchConfig['sides'][0], MatchConfig['sides'][1]];
    const stone = sides[0].loadouts['stone'];
    if (stone) stone.powers = { home: 'stampede', field: null };
    const st = new BattleView({ sim: new FakeSim({ config: { ...c, sides } }), art: new SpyArt(), audio: new FakeAudio(), labelFactory: labels });
    expect(st.powerAimable()).toBe(false);
  });

  it('lets muted emotes through only for your own side', () => {
    const s = setup({ settings: { mutedEmotes: true } }, [
      { tick: 1, e: 'emote', side: 1, emote: 'gg' },
      { tick: 1, e: 'emote', side: 0, emote: 'salute' },
    ]);
    s.view.onEvents(s.sim.step([]));
    expect(s.seen.filter((e) => e.t === 'emote')).toEqual([{ t: 'emote', side: 0, emote: 'salute' }]);
  });

  it('reports stats and destroys cleanly', () => {
    const s = setup();
    play(s, 100);
    const st = s.view.stats();
    expect(st.particleCap).toBe(1500);
    expect(st.preset).toBe('high');
    expect(st.seam).toBeGreaterThanOrEqual(450);
    s.view.destroy();
    expect(s.view.root.destroyed).toBe(true);
  });

  it('uses the Lite particle cap on mobile under Auto', () => {
    const s = setup({ isMobile: true });
    expect(s.view.stats().particleCap).toBe(300);
    expect(s.view.resolution(3)).toBe(1);
  });
});

/** Fake art that also records the options every effect was played with. */
class FxSpyArt extends SpyArt {
  readonly played: { id: string; at: { x: number; y: number }; o: Record<string, number> | undefined; view: ReturnType<FakeArtProvider['createEffect']> }[] = [];
  override createEffect(id: string, o?: Record<string, number>): ReturnType<FakeArtProvider['createEffect']> {
    const v = super.createEffect(id, o);
    const orig = v.playAt.bind(v);
    v.playAt = (at, opts) => {
      this.played.push({ id, at: { ...at }, o: opts, view: v });
      orig(at, opts);
    };
    return v;
  }
}

/** The fake match config plus extra cards (a Legendary and Royal Decree with the real numbers). */
function extendedConfig(): MatchConfig {
  const cfg = fakeMatchConfig(1);
  const tusk = cfg.content.units['tuskback'];
  if (!tusk) throw new Error('fake content changed');
  const legend: UnitDef = { ...tusk, id: 'big_legend', group: 'legendary', rarity: 'legendary' };
  const decree: PowerDef = {
    id: 'royal_decree', kind: 'power', age: 'stone', slot: 'field', reach: 'army', family: 'rally', rarity: 'rare', source: 'road',
    cost: 125, reloadMs: 45000, telegraphMs: 1000, maxTargets: 8,
    effect: { kind: 'buffAll', maxTargets: 8, statuses: [{ kind: 'damageBuff', magnitudeBp: 3000, durationMs: 8000 }] },
    visualId: 'power.royal_decree', sfx: 'pw_decree', nameKey: 'card.royal_decree.name', descKey: 'card.royal_decree.desc',
  };
  return {
    ...cfg,
    content: { ...cfg.content, units: { ...cfg.content.units, big_legend: legend }, powers: { ...cfg.content.powers, royal_decree: decree } },
  };
}

function setupFx(events: readonly SimEvent[], o: Partial<BattleViewOptions> = {}) {
  const sim = new FakeSim({ events, config: extendedConfig() });
  const art = new FxSpyArt();
  const audio = new FakeAudio();
  const view = new BattleView({ sim, art, audio, labelFactory: labels, ...o });
  view.resize(1280, 720);
  return { sim, art, audio, view };
}

const spawn = (id: number, side: 0 | 1, card: string, x: number, tick = 1): SimEvent => ({ tick, e: 'unitSpawned', id, side, card, x, summoned: false, level: 1 });

describe('BattleView effects: art options, following and settings', () => {
  it('sizes the telegraph decoration by the zone and fits screen effects to the screen (WP4 option names)', () => {
    const s = setupFx([
      { tick: 1, e: 'powerTelegraph', side: 1, slot: 'home', power: 'arrow_storm', castId: 7, x: 600_000, zone: 450_000, cost: 100, targetId: -1, telegraphMs: 1000 },
      { tick: 1, e: 'phaseChanged', phase: 'siege' },
    ]);
    s.view.onEvents(s.sim.step([]));
    const tele = s.art.played.find((p) => p.id === 'fx.telegraph_zone');
    expect(tele?.o).toMatchObject({ zone: 450, side: 1, durationMs: 1000 });
    const siege = s.art.played.find((p) => p.id === 'fx.siege_vignette');
    expect(siege?.o).toMatchObject({ width: 1280, height: 720 });
    expect(siege?.at).toEqual({ x: 0, y: 0 });
    s.view.resize(800, 400);
    expect(s.art.played.filter((p) => p.id === 'fx.siege_vignette').at(-1)?.o).toMatchObject({ width: 800, height: 400 });
  });

  it('keeps a status effect on its moving unit and ends it when the unit dies (A12 checklist 10)', () => {
    const s = setupFx([
      spawn(1, 1, 'pebbler', 700_000),
      { tick: 2, e: 'statusApplied', id: 1, kind: 'mark', ms: 4000, frozen: false },
      { tick: 12, e: 'died', id: 1, side: 1, card: 'pebbler', killerId: null, killerCard: null, killerKind: null, killerSide: null, bountyGold: 0, bountyXp: 0, x: 700_000 },
    ]);
    s.view.onEvents(s.sim.step([]));
    s.view.onEvents(s.sim.step([]));
    const mark = s.art.played.find((p) => p.id === 'fx.mark_reticle');
    expect(mark?.o).toMatchObject({ durationMs: 4000 });
    const start = mark?.view.root.x ?? 0;
    // Walk the unit 30 lu toward the player; the reticle goes with it.
    const u = s.sim.state.units[0] as { x: number; prevX: number };
    u.prevX = 670_000;
    u.x = 670_000;
    s.view.render(1, 16);
    expect(mark?.view.root.x).toBeCloseTo(start - 30, 5);
    expect(mark?.view.root.parent).not.toBeNull();
    for (let i = 0; i < 10; i++) s.view.onEvents(s.sim.step([]));
    s.view.render(1, 16);
    expect(mark?.view.root.parent).toBeNull();
  });

  it('puts Royal Decree on every unit of the caster, and only theirs', () => {
    const s = setupFx([
      spawn(1, 0, 'bonker', 400_000),
      spawn(2, 0, 'pebbler', 380_000),
      spawn(3, 1, 'bonker', 800_000),
      { tick: 1, e: 'powerTelegraph', side: 0, slot: 'field', power: 'royal_decree', castId: 9, x: 400_000, zone: 0, cost: 125, targetId: -1, telegraphMs: 1000 },
      { tick: 1, e: 'powerImpact', side: 0, power: 'royal_decree', castId: 9, x: 400_000, index: 0 },
    ]);
    s.view.onEvents(s.sim.step([]));
    const glows = s.art.played.filter((p) => p.id === 'fx.decree_glow');
    expect(glows).toHaveLength(2);
    expect(glows.map((g) => Math.round(g.at.x)).sort()).toEqual([380, 400]);
    expect(glows[0]?.o).toMatchObject({ durationMs: 8000, side: 0 });
    // A zone-less power shows no zone decoration.
    expect(s.art.played.some((p) => p.id === 'fx.telegraph_zone')).toBe(false);
  });

  it('silences muted AI emotes completely (no bubble, no sound)', () => {
    const s = setupFx([{ tick: 1, e: 'emote', side: 1, emote: 'gg' }], { settings: { mutedEmotes: true } });
    s.view.onEvents(s.sim.step([]));
    expect(s.audio.played()).not.toContain('emote_pop');
    const t = setupFx([{ tick: 1, e: 'emote', side: 1, emote: 'gg' }]);
    t.view.onEvents(t.sim.step([]));
    expect(t.audio.played()).toContain('emote_pop');
  });

  it('chimes evolve_ready once when your Evolve becomes available, never for the opponent (A13)', () => {
    const s = setupFx([
      { tick: 1, e: 'xpEarned', side: 0, amount: 100_000, reason: 'passive' },
      { tick: 2, e: 'xpEarned', side: 1, amount: 3_000_000, reason: 'kill' },
      { tick: 3, e: 'xpEarned', side: 0, amount: 2_000_000, reason: 'kill' },
      { tick: 4, e: 'xpEarned', side: 0, amount: 100_000, reason: 'passive' },
    ]);
    const chimes: number[] = [];
    for (let i = 0; i < 4; i++) {
      s.view.onEvents(s.sim.step([]));
      chimes.push(s.audio.played().filter((id) => id === 'evolve_ready').length);
    }
    expect(chimes).toEqual([0, 0, 1, 1]);
  });

  it('gives Legendary auras a size and centres them on the figure', () => {
    const s = setupFx([spawn(1, 0, 'big_legend', 300_000)]);
    s.view.onEvents(s.sim.step([]));
    s.view.render(1, 16);
    const aura = s.art.played.find((p) => p.id === 'fx.legendary_aura');
    expect(aura?.o?.['radius']).toBeGreaterThanOrEqual(24);
    const unit = s.art.unitViews[0];
    if (!unit) throw new Error('no unit');
    expect(aura?.view.root.y).toBeCloseTo((s.art.unitViews[0]?.lastPose?.y ?? 0) + unit.anchors.hitCenter.y, 5);
    // Lite has no Legendary auras (B6).
    const lite = setupFx([spawn(1, 0, 'big_legend', 300_000)], { settings: { graphics: 'lite' } });
    lite.view.onEvents(lite.sim.step([]));
    expect(lite.art.played.some((p) => p.id === 'fx.legendary_aura')).toBe(false);
  });
});
