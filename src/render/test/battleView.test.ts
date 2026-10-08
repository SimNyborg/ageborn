import type { MatchConfig, PowerDef, SimEvent, UnitDef } from '@/contracts';
import { FakeArtProvider } from '@/contracts/fakes/art';
import { FakeAudio } from '@/contracts/fakes/audio';
import { FakeSim, cannedBattleEvents, fakeMatchConfig } from '@/contracts/fakes/sim';
import { Container } from 'pixi.js';
import { describe, expect, it } from 'vitest';
import { BattleView, baseSkinsOf, collapseSeed, type BattleViewOptions } from '../battleView';
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

describe('the side looks reach the art (save v14: scenes per age, one base skin per age)', () => {
  it('passes each half its scenes and each base its skin per age, the troop skin over a cosmetic one', () => {
    const base = fakeMatchConfig();
    const config: MatchConfig = {
      ...base,
      sides: [
        { ...base.sides[0], skins: { 'base.future': 'crystal_spire', bonker: 'pumpkin_head' }, look: { baseSkins: { stone: 'baseSkin.frost_cave', future: 'baseSkin.midnight_neon' }, scenes: { stone: 'scene.glacier_valley' } } },
        { ...base.sides[1], skins: {}, look: { baseSkins: {}, scenes: {} } },
      ],
    };
    const sim = new FakeSim({ config });
    const art = new SpyArt();
    new BattleView({ sim, art, audio: new FakeAudio(), labelFactory: labels });
    const backdrop = art.calls.find((c) => c.method === 'createBackdrop')!.args[0] as { scenes: unknown };
    expect(backdrop.scenes).toEqual({ left: { stone: 'scene.glacier_valley' }, right: {} });
    const bases = art.calls.filter((c) => c.method === 'createBase').map((c) => (c.args[0] as { skins: unknown }).skins);
    expect(bases).toEqual([{ stone: 'frost_cave', future: 'crystal_spire' }, {}]);
    expect(baseSkinsOf({ skins: {}, look: { baseSkins: { cosmic: 'baseSkin.nebula_ark' } } })).toEqual({ cosmic: 'nebula_ark' });
    expect(baseSkinsOf({ skins: { 'base.future': 'crystal_spire' } })).toEqual({ future: 'crystal_spire' });
  });
});

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
    // The power (Stampede, a charge: 60 ms, A2.9.10) and the evolve (100 ms) freeze globally; the stream
    // has no other freezes.
    expect(frozenFrames).toBeGreaterThanOrEqual(9);
    expect(frozenFrames).toBeLessThanOrEqual(13);
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

  it('starts High on mobile under Auto, with the mobile particle cap (owner feedback 2026-10-03)', () => {
    const s = setup({ isMobile: true });
    expect(s.view.stats().particleCap).toBe(600);
    expect(s.view.resolution(3)).toBe(2);
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

  it('puts a capped buff on the caster\'s 8 frontmost units only (A2.9.6)', () => {
    const units = Array.from({ length: 10 }, (_, i) => spawn(i + 1, 0, 'bonker', 200_000 + i * 40_000));
    const s = setupFx([
      ...units,
      spawn(20, 1, 'bonker', 1_200_000),
      { tick: 1, e: 'powerTelegraph', side: 0, slot: 'field', power: 'royal_decree', castId: 9, x: 400_000, zone: 0, cost: 125, targetId: -1, telegraphMs: 500 },
      { tick: 1, e: 'powerImpact', side: 0, power: 'royal_decree', castId: 9, x: 400_000, index: 0 },
    ]);
    s.view.onEvents(s.sim.step([]));
    const glows = s.art.played.filter((p) => p.id === 'fx.decree_glow');
    // The two rearmost (x 200 and 240) get nothing.
    expect(glows.map((g) => Math.round(g.at.x)).sort((a, b) => a - b)).toEqual([280, 320, 360, 400, 440, 480, 520, 560]);
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

describe('a destroyed base collapses on its beats (A11, A12)', () => {
  const END: SimEvent[] = [
    { tick: 3, e: 'baseDamaged', side: 1, sourceId: 1, damage: 1_000_000, hp: 0, maxHp: 1_000_000 },
    { tick: 3, e: 'matchEnded', result: { winner: 0, reason: 'baseDestroyed', tick: 3, baseHpBp: [10_000, 0] } },
  ];
  const BEATS = { breakMs: 400, landMs: 900, settleMs: 1800, material: 'iron' };

  /** Base views with the collapse hooks of the atlas art: they record the seed and report fixed beats. */
  class CollapseArt extends SpyArt {
    readonly seeds: number[] = [];
    override createBase(o: Parameters<FakeArtProvider['createBase']>[0]): ReturnType<FakeArtProvider['createBase']> {
      const v = super.createBase(o);
      return Object.assign(v, {
        collapseWith: ({ seed }: { seed: number }) => {
          this.seeds.push(seed);
          return BEATS;
        },
      });
    }
  }

  /** Plays the end at 60 fps and notes when each sound and music cue starts (real ms after the end). */
  function runEnd(o: Partial<BattleViewOptions> = {}, speed = 1) {
    const sim = new FakeSim({ events: END });
    const art = new CollapseArt();
    const audio = new FakeAudio();
    const view = new BattleView({ sim, art, audio, labelFactory: labels, ...o });
    view.resize(844, 390);
    view.setSpeed(speed);
    const at = new Map<string, number>();
    const clock = new FixedStepClock();
    let t = -1;
    let frozen = 0;
    let slowest = 1;
    let punch = 1;
    for (let frame = 0; frame < 300; frame++) {
      clock.add(1000 / 60, speed, view.simFrozen);
      while (!view.simFrozen && !sim.done && clock.consume()) view.onEvents(sim.step([]));
      view.render(clock.alpha, 1000 / 60);
      if (t >= 0) t += 1000 / 60;
      else if (sim.state.outcome) t = 0;
      if (t < 0) continue;
      for (const c of audio.calls) {
        const key = c.method === 'play' ? c.id : c.method === 'music.setCue' ? c.cue : null;
        if (key !== null && !at.has(key)) at.set(key, Math.round(t));
      }
      // after the end the sim no longer runs, so the view's own freeze is what holds the collapse
      if (view.director.frozen) frozen++;
      slowest = Math.min(slowest, view.director.slowMo.timeScale);
      punch = Math.max(punch, view.camera.punchScale);
    }
    return { sim, art, at, frozen, slowest, punch };
  }

  it('seeds the art from match data and fires the break, the stinger and the landing in that order', () => {
    const r = runEnd();
    expect(r.art.seeds).toEqual([collapseSeed(r.sim.config.seed, 1, 3)]);
    expect(collapseSeed(r.sim.config.seed, 1, 3)).toBe(collapseSeed(r.sim.config.seed, 1, 3));
    expect(collapseSeed(r.sim.config.seed, 0, 3)).not.toBe(collapseSeed(r.sim.config.seed, 1, 3));
    const t = (id: string): number => r.at.get(id) ?? Number.NaN;
    // the build-up starts with the end; nothing crashes before the break
    expect(t('base_doom_rumble')).toBe(0);
    expect(t('base_destroyed')).toBeGreaterThanOrEqual(BEATS.breakMs - 20);
    expect(t('base_destroyed')).toBeLessThanOrEqual(BEATS.breakMs + 40);
    expect(t('base_break_iron')).toBe(t('base_destroyed'));
    expect(t('base_debris_iron')).toBeGreaterThan(t('base_break_iron'));
    // the stinger follows the crash; the thud lands later, slowed by the slow motion
    expect(t('stinger.victory')).toBeGreaterThan(t('base_destroyed'));
    expect(t('base_settle_thud')).toBeGreaterThan(t('stinger.victory'));
    expect(t('base_settle_thud')).toBeGreaterThan(BEATS.landMs);
    // and the whole sequence fits before the Result shows (2.5 s after the end)
    expect(t('base_settle_thud')).toBeLessThan(2500);
    // the break's hit-stop (130 ms, exempt from the cap), slow motion and camera punch
    expect(r.frozen).toBeGreaterThanOrEqual(7);
    expect(r.frozen).toBeLessThanOrEqual(10);
    expect(r.slowest).toBeCloseTo(0.38, 2);
    expect(r.punch).toBeGreaterThan(1.05);
  });

  it('reduce motion: no hit-stop, slow motion or camera punch; the sounds and the stinger still play', () => {
    const r = runEnd({ settings: { reduceMotion: true } });
    expect(r.frozen).toBe(0);
    expect(r.slowest).toBe(1);
    expect(r.punch).toBe(1);
    for (const id of ['base_doom_rumble', 'base_destroyed', 'base_break_iron', 'base_debris_iron', 'stinger.victory', 'base_settle_thud']) {
      expect(r.at.has(id), id).toBe(true);
    }
    expect(r.at.get('base_settle_thud')).toBeLessThan(1200);
  });

  it('follows the game speed: at 2x the break comes twice as soon', () => {
    const r = runEnd({}, 2);
    expect(r.at.get('base_destroyed')).toBeLessThanOrEqual(BEATS.breakMs / 2 + 40);
    expect(r.at.get('base_settle_thud')).toBeLessThan(1500);
  });
});
