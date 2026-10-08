/**
 * The victory moment (owner request 2026-10-07; DESIGN A9 #7, A12, A13; ui-plan MR-129): the moves as
 * data, the deterministic pick that never repeats the previous move, every scripted scene, the beats
 * of a satisfying moment (anticipation before the impact, a hit-stop and a flash on it, residue after),
 * reduce motion's storyboard (opacity only, no shake, flash or hit-stop) and the timeline engine.
 */
import { SFX_FILES } from '@/audio/assets.gen';
import { sounds as SOUNDS } from '@/audio/sounds';
import { i18n } from '@/i18n';
import { describe, expect, it } from 'vitest';
import { generalLook, randomStarterLook } from '../../../../components/avatar/look';
import { STARTER_ART } from '../../../../components/avatar/starter';
import { WEARABLE_ART } from '../../../../components/avatar/wearables';
import { lastMove, momentFlags, MOMENT_FLAG, moveById, pickMove, VICTORY_MOVES, type MomentKind, type VictoryMoveDef } from '../moves';
import { buildMoment, SCRIPTED_MOVES, STORY, type MomentInput } from '../scenes';
import { actionTime, keyframesOf, poseAt, realTime, SceneBuilder, STAGE_H, STAGE_W, type Scene } from '../timeline';
import { fitStage } from '../VictoryMoment';

const LIB = { ...STARTER_ART, ...WEARABLE_ART };

function input(move: string, o: Partial<MomentInput> = {}): MomentInput {
  const def = moveById(move)!;
  return {
    move,
    kind: def.kind,
    seed: 1234,
    me: randomStarterLook(7),
    foe: generalLook('kettle', 1),
    lib: LIB,
    team: { me: '#2F7DF6', foe: '#F28A1E' },
    reduce: false,
    hitstop: true,
    shake: 1,
    lite: false,
    t: (k, p) => i18n.t(k, p),
    ...o,
  };
}

const build = (move: string, o: Partial<MomentInput> = {}): Scene => {
  const s = buildMoment(input(move, o));
  if (!s) throw new Error(`no scene for ${move}`);
  return s;
};

describe('victory moves are data', () => {
  it('has the five owner moves for a win, gentle ones for a loss, a stand-off for a draw', () => {
    const ids = (k: MomentKind) => VICTORY_MOVES.filter((m) => m.kind === k).map((m) => m.id);
    expect(ids('win')).toEqual(['mallet', 'pie', 'tarFeathers', 'launch', 'scuffle']);
    expect(ids('loss')).toEqual(['rainCloud', 'piedYou']);
    expect(ids('draw')).toEqual(['standoff']);
  });

  it('gives every move a unique id, i18n name and line, props, sounds, a weight and a length', () => {
    const seen = new Set<string>();
    for (const m of VICTORY_MOVES) {
      expect(seen.has(m.id), m.id).toBe(false);
      seen.add(m.id);
      expect(i18n.has(m.nameKey), m.nameKey).toBe(true);
      expect(i18n.has(m.lineKey), m.lineKey).toBe(true);
      expect(i18n.t(m.lineKey, { foe: 'Kenji_77' })).not.toContain('{');
      expect(m.props.length, m.id).toBeGreaterThan(0);
      expect(m.sounds.length, m.id).toBeGreaterThan(0);
      expect(Number.isInteger(m.weight) && m.weight > 0, m.id).toBe(true);
      expect(m.starter, m.id).toBe(true);
    }
  });

  it('scripts every move, and only those', () => {
    expect([...SCRIPTED_MOVES].sort()).toEqual(VICTORY_MOVES.map((m) => m.id).sort());
  });

  it('keeps each scene near its stated length; a win runs 2-3.5 s, a loss or a draw at most 2.5 s', () => {
    for (const m of VICTORY_MOVES) {
      const s = build(m.id);
      expect(Math.abs(s.duration - m.durationMs), `${m.id} ${s.duration}`).toBeLessThanOrEqual(m.durationMs * 0.08);
      if (m.kind === 'win') {
        expect(s.duration, m.id).toBeGreaterThanOrEqual(2000);
        expect(s.duration, m.id).toBeLessThanOrEqual(3500);
      } else expect(s.duration, m.id).toBeLessThanOrEqual(2500);
    }
  });

  it('every sound a move plays exists in the audio manifest, with a recorded file and a ZzFX fallback (A13)', () => {
    for (const m of VICTORY_MOVES) {
      for (const id of m.sounds) {
        expect(Object.hasOwn(SOUNDS, id), `${m.id}: ${id}`).toBe(true);
        expect(Object.hasOwn(SFX_FILES, id), `${m.id}: ${id} file`).toBe(true);
      }
    }
  });

  it('plays exactly the sounds the data lists', () => {
    for (const m of VICTORY_MOVES) {
      const played = new Set(build(m.id).cues.flatMap((c) => (c.sound ? [c.sound] : [])));
      expect([...played].sort(), m.id).toEqual([...m.sounds].sort());
    }
  });
});

describe('picking a move', () => {
  it('is deterministic: the same match seed always gives the same move', () => {
    for (let seed = 0; seed < 200; seed++) {
      for (const k of ['win', 'loss', 'draw'] as const) expect(pickMove(k, seed, null)?.id).toBe(pickMove(k, seed, null)?.id);
    }
  });

  it('never repeats the previous match move while the pool has another', () => {
    for (let seed = 0; seed < 400; seed++) {
      for (const prev of VICTORY_MOVES.filter((m) => m.kind === 'win').map((m) => m.id)) expect(pickMove('win', seed, prev)?.id).not.toBe(prev);
      expect(pickMove('loss', seed, 'rainCloud')?.id).toBe('piedYou');
      expect(pickMove('loss', seed, 'piedYou')?.id).toBe('rainCloud');
    }
    // A pool of one keeps its only move.
    expect(pickMove('draw', 5, 'standoff')?.id).toBe('standoff');
  });

  it('spreads the wins over all five moves', () => {
    const count = new Map<string, number>();
    for (let seed = 0; seed < 1000; seed++) {
      const id = pickMove('win', seed * 7919 + 13, null)!.id;
      count.set(id, (count.get(id) ?? 0) + 1);
    }
    expect(count.size).toBe(5);
    for (const n of count.values()) expect(n).toBeGreaterThan(120);
  });

  it('a chain of matches never shows the same move twice in a row', () => {
    let prev: string | null = null;
    for (let seed = 0; seed < 300; seed++) {
      const m: VictoryMoveDef = pickMove('win', seed * 2654435761, prev)!;
      expect(m.id).not.toBe(prev);
      prev = m.id;
    }
  });

  it('picks only from owned moves when a collection passes them (later versions)', () => {
    for (let seed = 0; seed < 50; seed++) expect(['pie', 'launch']).toContain(pickMove('win', seed, null, ['pie', 'launch'])!.id);
    expect(pickMove('win', 3, null, [])).toBeNull();
  });

  it('remembers the last move in one UI flag', () => {
    const patch = momentFlags('launch');
    expect(Object.keys(patch).every((k) => k.startsWith(MOMENT_FLAG) && k.startsWith('ui-'))).toBe(true);
    expect(Object.entries(patch).filter(([, v]) => v)).toEqual([[`${MOMENT_FLAG}launch`, true]]);
    const flags = Object.fromEntries(Object.entries(patch).filter(([, v]) => v));
    expect(lastMove(flags)).toBe('launch');
    expect(lastMove({})).toBeNull();
  });
});

describe('the scenes', () => {
  it('build the same frames for the same match (deterministic) and differ by seed only in particles', () => {
    for (const id of SCRIPTED_MOVES) {
      const a = build(id);
      const b = build(id);
      expect(a.duration).toBe(b.duration);
      expect(a.nodes.map((n) => n.id)).toEqual(b.nodes.map((n) => n.id));
      for (const t of [0, 400, 1300, a.duration - 1]) for (const n of a.nodes) expect(poseAt(a, n.id, t), `${id} ${n.id} ${t}`).toEqual(poseAt(b, n.id, t));
    }
  });

  it('fit inside the stage box and keep every pose finite', () => {
    for (const id of SCRIPTED_MOVES) {
      const s = build(id);
      expect(s.w).toBe(STAGE_W);
      expect(s.h).toBe(STAGE_H);
      for (const n of s.nodes) {
        for (let t = 0; t <= s.duration; t += 100) {
          const p = poseAt(s, n.id, t);
          for (const v of Object.values(p)) expect(Number.isFinite(v), `${id} ${n.id}`).toBe(true);
          expect(p.o).toBeGreaterThanOrEqual(0);
          expect(p.o).toBeLessThanOrEqual(1);
        }
      }
    }
  });

  it('a win has a wind-up before the impact, a hit-stop and a camera kick on it, and a celebration after', () => {
    for (const m of VICTORY_MOVES.filter((x) => x.kind === 'win')) {
      const s = build(m.id);
      expect(s.stops.length, m.id).toBeGreaterThan(0);
      const first = realTime(s.stops, s.stops[0]!.at);
      expect(first, `${m.id}: anticipation first`).toBeGreaterThan(600);
      for (const st of s.stops) expect(st.ms).toBeLessThanOrEqual(120);
      const kicks = s.keys.get('cam');
      expect(kicks?.x?.length, `${m.id}: the camera kicks`).toBeGreaterThan(2);
      const celebrate = s.cues.find((c) => c.celebrate);
      expect(celebrate, m.id).toBeDefined();
      expect(celebrate!.t, `${m.id}: residue after the impact`).toBeGreaterThan(first);
      expect(s.cues.some((c) => c.haptic === 'heavy' || c.haptic === 'thump'), m.id).toBe(true);
    }
  });

  it('a loss is gentle: no hit-stop, no camera kick, no flash, no confetti', () => {
    for (const m of VICTORY_MOVES.filter((x) => x.kind !== 'win')) {
      const s = build(m.id);
      expect(s.stops, m.id).toEqual([]);
      expect(s.keys.get('cam')?.x ?? [], m.id).toEqual([]);
      expect(s.nodes.some((n) => n.id.startsWith('flash')), m.id).toBe(false);
      expect(s.cues.some((c) => c.celebrate), m.id).toBe(false);
    }
  });

  it('settings: hit-stop off removes the freezes, shake 0 removes the camera kick', () => {
    const s = build('mallet', { hitstop: false, shake: 0 });
    expect(s.stops).toEqual([]);
    expect(s.keys.get('cam')?.x ?? []).toEqual([]);
    expect(build('mallet').duration - s.duration).toBe(110);
  });

  it('lite graphics use fewer particles', () => {
    for (const id of ['mallet', 'tarFeathers']) expect(build(id, { lite: true }).nodes.length).toBeLessThan(build(id).nodes.length);
  });

  it('turns into Web Animation keyframes that only move transform and opacity, from 0 to 1', () => {
    const s = build('launch');
    let animated = 0;
    for (const n of s.nodes) {
      const kf = keyframesOf(s, n.id, 1.5);
      if (!kf) continue;
      animated++;
      expect(kf[0]!.offset).toBe(0);
      expect(kf[kf.length - 1]!.offset).toBe(1);
      for (const k of kf) expect(Object.keys(k).sort()).toEqual(['offset', 'opacity', 'transform']);
      for (let i = 1; i < kf.length; i++) expect(kf[i]!.offset as number).toBeGreaterThanOrEqual(kf[i - 1]!.offset as number);
    }
    expect(animated).toBeGreaterThan(20);
  });
});

describe('reduce motion', () => {
  it('replaces every move with a two-frame storyboard: opacity only, no shake, flash or hit-stop', () => {
    for (const m of VICTORY_MOVES) {
      const s = build(m.id, { reduce: true });
      expect(s.stops, m.id).toEqual([]);
      expect(s.duration, m.id).toBe(STORY.end);
      expect(s.nodes.some((n) => n.id.startsWith('flash')), m.id).toBe(false);
      for (const [id, tr] of s.keys) {
        expect(Object.keys(tr), `${m.id} ${id}`).toEqual(['o']);
        expect(id.startsWith('frame'), `${m.id} ${id}`).toBe(true);
      }
      // The outcome is the last thing on screen; the set-up is gone.
      expect(poseAt(s, 'frame1', s.duration).o).toBe(1);
      expect(poseAt(s, 'frame0', s.duration).o).toBe(0);
      // Its sounds still play, through the player's volume settings.
      expect(s.cues.filter((c) => c.sound).length, m.id).toBe(2);
    }
  });

  it('shows the outcome: the mallet storyboard ends with the dizzy opponent and the cheer', () => {
    const s = build('mallet', { reduce: true });
    const end = s.duration;
    expect(poseAt(s, '1:foe.f.dizzy', end).o).toBe(1);
    expect(poseAt(s, '1:me.f.cheer', end).o).toBe(1);
    expect(poseAt(s, '0:foe.f.nervous', end).o).toBe(1);
  });
});

describe('timeline engine', () => {
  it('freezes the scene during a hit-stop and shifts what follows', () => {
    const b = new SceneBuilder(100, 100);
    b.add({ id: 'a', x: 0, y: 0, w: 10, h: 10 });
    b.to('a', 1000, { x: 100 }, 'linear', 0);
    b.hitstop(500, 100);
    const s = b.build();
    expect(s.duration).toBe(1100);
    expect(actionTime(s.stops, 450)).toBe(450);
    expect(actionTime(s.stops, 550)).toBe(500);
    expect(actionTime(s.stops, 700)).toBe(600);
    expect(poseAt(s, 'a', 520).x).toBeCloseTo(50);
    expect(poseAt(s, 'a', 590).x).toBeCloseTo(50);
    expect(poseAt(s, 'a', 1100).x).toBeCloseTo(100);
  });

  it('fires a cue on an impact frame at the start of its hit-stop', () => {
    const b = new SceneBuilder(10, 10);
    b.cue(500, { sound: 'x' }).cue(800, { sound: 'y' }).hitstop(500, 100).until(1000);
    expect(b.build().cues.map((c) => c.t)).toEqual([500, 900]);
  });

  it('refuses keys out of order, so a mistimed beat fails a test', () => {
    const b = new SceneBuilder(10, 10);
    b.add({ id: 'a', x: 0, y: 0, w: 1, h: 1 });
    b.to('a', 500, { x: 1 });
    expect(() => b.to('a', 400, { x: 2 })).toThrow();
  });

  it('fits the stage in a slot: scaled to fit, centred, standing on the bottom edge', () => {
    expect(fitStage(680, 330, 340, 165)).toEqual({ k: 2, left: 0, top: 0 });
    const tall = fitStage(340, 400, 340, 165);
    expect(tall.k).toBe(1);
    expect(tall.top).toBe(235);
    const wide = fitStage(500, 165, 340, 165);
    expect(wide.left).toBe(80);
  });
});
