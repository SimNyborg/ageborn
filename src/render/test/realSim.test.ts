/**
 * The battle view on the real simulation and content (C2/WP5 Phase 2 preparation): a whole Full War
 * between two scripted players, fed through the B6 loop into the view with the fake art and audio.
 * Checks that every event the real sim emits maps cleanly and the feel budgets hold over a match.
 */
import type { AgeId, CardId, Command, Loadout, MatchConfig, SideConfig, SimEvent, TimedCommand } from '@/contracts';
import { content } from '@/content';
import { FakeArtProvider } from '@/contracts/fakes/art';
import { FakeAudio } from '@/contracts/fakes/audio';
import { createSim } from '@/sim';
import { Container } from 'pixi.js';
import { describe, expect, it } from 'vitest';
import { BattleView } from '../battleView';
import type { LabelFactory } from '../feel/numbers';
import { ageOrder, canEvolve } from '../hudModel';
import { FixedStepClock } from '../loop';
import type { ViewEvent } from '../types';
import { A13_SOUND_IDS, A14_EFFECT_IDS, A14_MUSIC_CUES, A14_PROJECTILE_IDS } from './designIds';

const AGES: AgeId[] = ['stone', 'medieval', 'gunpowder', 'modern', 'future'];

function plan(age: AgeId): Loadout {
  const units = Object.values(content.units).filter((u) => u.age === age && !u.hidden);
  const pick = (f: (u: (typeof units)[number]) => boolean): CardId | null => units.find(f)?.id ?? null;
  const turrets = Object.values(content.turrets).filter((t) => t.age === age);
  const power = Object.values(content.powers).find((p) => p.age === age && p.slot === 'default');
  return {
    units: [
      pick((u) => u.group === 'infantry'),
      pick((u) => u.group === 'ranged'),
      pick((u) => u.group === 'heavy'),
      pick((u) => u.group === 'epic'),
      pick((u) => u.group === 'legendary'),
    ],
    turrets: [turrets[0]?.id ?? null, turrets[1]?.id ?? null],
    power: power?.id ?? '',
  };
}

function side(label: string, isBot: boolean): SideConfig {
  const levels: Record<CardId, number> = {};
  for (const id of [...Object.keys(content.units), ...Object.keys(content.turrets)]) levels[id] = 5;
  const loadouts: Partial<Record<AgeId, Loadout>> = {};
  for (const a of AGES) loadouts[a] = plan(a);
  return { label, isBot, loadouts, levels, skins: {} };
}

/** A plain scripted player: evolves, casts, fires Last Stand, builds turrets and keeps training. */
function orders(sim: ReturnType<typeof createSim>, s: 0 | 1, turn: number): Command[] {
  const st = sim.state;
  const me = st.sides[s];
  const cfg = sim.config;
  const lo = cfg.sides[s].loadouts[ageOrder(cfg)[me.ageIndex] ?? 'stone'];
  if (canEvolve(st, cfg, s)) return [{ t: 'evolve', side: s }];
  const out: Command[] = [];
  if (me.powerPpm >= 1_000_000) out.push({ t: 'power', side: s });
  if (me.lastStand === 'armed') out.push({ t: 'lastStand', side: s });
  const free = me.turrets.findIndex((t, i) => t === null && i < me.mountsOwned);
  const turret = lo?.turrets[0] ? cfg.content.turrets[lo.turrets[0]] : undefined;
  if (free >= 0 && turret && me.gold >= turret.cost * 1000 && turn % 3 === 0) return [...out, { t: 'buildTurret', side: s, mount: free as 0, slot: 0 }];
  if (me.queue.length < 3 && lo) {
    const slot = (turn + s) % 5;
    if (lo.units[slot]) out.push({ t: 'train', side: s, slot: slot as 0 | 1 | 2 | 3 | 4 });
  }
  return out;
}

const labels: LabelFactory = () => {
  const root = new Container();
  return { root, setText: (t) => (root.label = t), setStyle: () => {} };
};

type FakeUnit = ReturnType<FakeArtProvider['createUnit']>;

class SpyArt extends FakeArtProvider {
  readonly unitViews: FakeUnit[] = [];
  /** Every effect play with its options (pooled views get their options at `playAt`). */
  readonly plays: { id: string; o: Record<string, number> }[] = [];
  override createUnit(o: Parameters<FakeArtProvider['createUnit']>[0]): FakeUnit {
    const v = super.createUnit(o);
    this.unitViews.push(v);
    return v;
  }
  override createEffect(id: string, o?: Record<string, number>): ReturnType<FakeArtProvider['createEffect']> {
    const v = super.createEffect(id, o);
    const orig = v.playAt.bind(v);
    v.playAt = (at, opts) => {
      this.plays.push({ id, o: { ...o, ...opts } });
      orig(at, opts);
    };
    return v;
  }
}

/**
 * Effects the art sizes from an option (the art's option names, WP4 `effects/recipes.ts`): without it
 * they fall back to a 10 lu / 100 lu default and look wrong.
 */
const SIZED_EFFECTS: Record<string, string[]> = {
  'fx.splash_ring': ['radius'],
  'fx.gravity_swirl': ['radius'],
  'fx.emp_ring': ['radius'],
  'fx.time_ripple': ['radius'],
  'fx.roar_ring': ['radius'],
  'fx.last_stand_wave': ['radius'],
  'fx.legendary_aura': ['radius'],
  'fx.telegraph_zone': ['zone', 'durationMs'],
  'fx.plane_bomber': ['zone'],
  'fx.orbital_beam': ['zone', 'durationMs'],
  'fx.smoke_cloud': ['width', 'durationMs'],
  'fx.aurochs': ['distance', 'dir'],
  'fx.overdrive_frame': ['width', 'height'],
  'fx.siege_vignette': ['width', 'height'],
  'fx.mark_reticle': ['durationMs'],
  'fx.dizzy': ['durationMs'],
};

describe('BattleView on the real sim (Full War, scripted players)', () => {
  it('maps a whole match: every event kind, finite poses, particle cap, freeze budget, DESIGN ids', () => {
    const cfg: MatchConfig = { seed: 11, format: 'full', content, sides: [side('Player', false), side('AI Test', true)] };
    const sim = createSim(cfg);
    const art = new SpyArt();
    const audio = new FakeAudio();
    const view = new BattleView({ sim, art, audio, labelFactory: labels });
    view.resize(1280, 720);
    const seen: ViewEvent[] = [];
    view.on((e) => seen.push(e));
    const clock = new FixedStepClock();
    const kinds = new Set<SimEvent['e']>();
    const seq: [number, number] = [0, 0];
    let turn = 0;
    let maxFreeze = 0;
    let maxParticles = 0;
    let badPose = 0;

    for (let frame = 0; frame < 40_000 && !sim.state.outcome; frame++) {
      clock.add(50, 1, view.simFrozen);
      while (!view.simFrozen && !sim.state.outcome && clock.consume()) {
        const cmds: TimedCommand[] = [];
        if (sim.state.tick % 10 === 0) {
          turn++;
          for (const s of [0, 1] as const) {
            for (const c of orders(sim, s, turn)) cmds.push({ ...c, tick: sim.state.tick + 1, seq: ++seq[s] });
          }
        }
        const events = sim.step(cmds);
        for (const e of events) kinds.add(e.e);
        view.onEvents(events);
      }
      view.render(clock.alpha, 50);
      const st = view.stats();
      maxFreeze = Math.max(maxFreeze, st.freezeUsedMs);
      maxParticles = Math.max(maxParticles, st.particles);
      expect(st.particles).toBeLessThanOrEqual(st.particleCap);
      if (frame % 20 === 0) {
        for (const v of art.unitViews) {
          const p = v.lastPose;
          if (p && !v.destroyed && !(Number.isFinite(p.x) && Number.isFinite(p.y) && p.x > -200 && p.x < 1400 && p.y > -200 && p.y < 40)) badPose++;
        }
      }
    }
    // A few frames after the end for the collapse and slow motion.
    for (let i = 0; i < 60; i++) view.render(1, 50);

    expect(sim.state.outcome).not.toBeNull();
    expect(seen.some((e) => e.t === 'matchEnded')).toBe(true);
    // The real sim's everyday events all showed up and were mapped.
    for (const k of ['unitSpawned', 'attackStarted', 'projectileFired', 'hit', 'died', 'turretBuilt', 'turretFired', 'baseDamaged', 'ageUp', 'powerTelegraph', 'powerImpact', 'phaseChanged', 'matchEnded'] as const) {
      expect(kinds.has(k), k).toBe(true);
    }
    // Global freezes stay within 150 ms per rolling 3 s (A12).
    expect(maxFreeze).toBeLessThanOrEqual(150);
    expect(maxParticles).toBeGreaterThan(0);

    for (const c of art.calls) {
      if (c.method === 'createEffect') {
        const id = c.args[0] as string;
        expect(A14_EFFECT_IDS.has(id), `effect ${id}`).toBe(true);
      }
      if (c.method === 'createProjectile') expect(A14_PROJECTILE_IDS.has(c.args[0] as string), `projectile ${String(c.args[0])}`).toBe(true);
    }
    for (const c of audio.calls) {
      if (c.method === 'play') expect(A13_SOUND_IDS.has(c.id), `sound ${c.id}`).toBe(true);
      if (c.method === 'music.setCue') expect(A14_MUSIC_CUES.has(c.cue), `cue ${c.cue}`).toBe(true);
    }
    expect(badPose).toBe(0);
    // Every sized effect got its size, and powers never play their HUD icon as an effect.
    const sizedSeen = new Set<string>();
    for (const p of art.plays) {
      const need = SIZED_EFFECTS[p.id];
      if (!need) continue;
      sizedSeen.add(p.id);
      for (const k of need) expect(typeof p.o[k], `${p.id} needs ${k}`).toBe('number');
    }
    for (const id of ['fx.telegraph_zone', 'fx.overdrive_frame']) expect(sizedSeen.has(id), id).toBe(true);
    view.destroy();
  });
});
