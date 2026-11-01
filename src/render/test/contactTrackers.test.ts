/**
 * Item 38 B0: the combat staging with the art pipeline's per-frame torso and head trackers (the damage bundle, contract
 * C1) in place of the team-colour layer's estimate. Numbers from the trackers the pipeline measured on the shipped
 * Bonker (stone) and Destrier Knight (medieval) rigs.
 */
import type { MatchConfig, SimState, UnitState } from '@/contracts';
import { FakeArtProvider } from '@/contracts/fakes/art';
import { FakeAudio } from '@/contracts/fakes/audio';
import { fakeMatchConfig } from '@/contracts/fakes/sim';
import { Container } from 'pixi.js';
import { describe, expect, it } from 'vitest';
import { BattleView } from '../battleView';
import { CONTACT_DEFAULTS, stage, type Reach, type StageBody, type StageUnit } from '../contact';

/** The Bonker's attack A as the view reads it from its sheet alone (the team layer's torso). */
const BONKER: Reach = { tipLu: 67.2, lungeLu: 12.7, frontLu: 60.2, backLu: 19.5, torsoFrontLu: 25.1, torsoBackLu: 19.1 };
/** The same with the trackers: the torso at idle and on the impact frame, the head on the impact frame (a deep crouch). */
const BONKER_T: Reach = { ...BONKER, torsoFrontLu: 14.7, torsoBackLu: 12.8, torsoImpactLu: 32.5, headLu: 25.2, headYLu: 37.7, torsoBottomLu: 17, torsoTopLu: 43.9, headIdleLu: 2.1, headIdleYLu: 47.7 };
const BONKER_BODY: StageBody = { front: 60.2, back: 19.5, torsoFront: 14.7, torsoBack: 12.8, torsoBottom: 17, torsoTop: 43.9, headX: 2.1, headY: 47.7 };

const unit = (o: Partial<StageUnit> & Pick<StageUnit, 'id' | 'side' | 'x'>): StageUnit => ({ air: false, sizeLu: 24, target: null, reach: BONKER, body: null, ...o });

/** Drawn separation of a hitting b, along a's facing. */
function drawnGap(r: ReturnType<typeof stage>, a: StageUnit, b: StageUnit): number {
  const ax = a.x + (r.offset.get(a.id) ?? 0);
  const bx = b.x + (r.offset.get(b.id) ?? 0);
  return (bx - ax) * (a.side === 0 ? 1 : -1);
}

const c = CONTACT_DEFAULTS.compMutual;
/** A head's half size for a small body (`headRadiusOf`: 0.12 x 24 + 2). */
const HEAD_R = 0.12 * 24 + 2;

describe('tracked torsos and heads in the staging (item 38 B0)', () => {
  it('a mirror exchange keeps both tracked heads and the leaning torsos apart on the impact frame', () => {
    const a = unit({ id: 1, side: 0, x: 980, target: 2, impactTick: 20, reach: BONKER_T, body: BONKER_BODY });
    const b = unit({ id: 2, side: 1, x: 1017, target: 1, impactTick: 20, reach: BONKER_T, body: BONKER_BODY });
    const r = stage([a, b]);
    const gap = drawnGap(r, a, b);
    // the heads (each at 25.2 lu on the impact frame, less the compensation drawn back) do not touch
    const head = 25.2 - c * 12.7 + HEAD_R;
    expect(gap - 2 * head).toBeGreaterThanOrEqual(CONTACT_DEFAULTS.clearLu - 1e-6);
    // the torsos as they lean in on the impact frame (32.5 lu out, less the compensation) do not touch either
    const torso = 32.5 - c * 12.7;
    expect(gap - 2 * torso).toBeGreaterThanOrEqual(CONTACT_DEFAULTS.clearLu - 1e-6);
    // the long clubs decide the rest: each lands at the ideal depth in the other's torso as it leans into its own swing
    // on the same frame (14.7 lu at idle, 32.5 on the impact frame, less the compensation), not in the air in front of
    // it; the estimate (the team layer's torso) stood the pair further apart
    const tip = 67.2 - c * 12.7;
    const leaning = 14.7 + (32.5 - 14.7 - c * 12.7);
    const ideal = tip + (1 - CONTACT_DEFAULTS.depth) * leaning;
    expect(gap).toBeCloseTo(ideal, 6);
    const est = stage([{ ...a, reach: BONKER, body: null }, { ...b, reach: BONKER, body: null }]);
    expect(drawnGap(est, a, b)).toBeGreaterThan(gap + 3);
  });

  it('short weapons in a mirror exchange: the tracked heads set the room (no more grazing heads)', () => {
    // short clubs that reach only 30 lu: the windows would put the pair close, the heads and torsos keep it apart
    const SHORT: Reach = { ...BONKER_T, tipLu: 45 };
    const a = unit({ id: 1, side: 0, x: 980, target: 2, impactTick: 20, reach: SHORT, body: BONKER_BODY });
    const b = unit({ id: 2, side: 1, x: 1017, target: 1, impactTick: 20, reach: SHORT, body: BONKER_BODY });
    const gap = drawnGap(stage([a, b]), a, b);
    const head = 25.2 - c * 12.7 + HEAD_R;
    const torso = 32.5 - c * 12.7;
    // the room both bodies need, as far as both clubs still reach
    const need = Math.max(2 * head, 2 * torso, head + torso) + CONTACT_DEFAULTS.clearLu;
    const reach = 45 - c * 12.7 + (1 - CONTACT_DEFAULTS.depthMin) * (14.7 + (32.5 - 14.7 - c * 12.7));
    // past the clubs' reach by at most the head slack: two faces pressed together read worse than a blow a little short
    expect(gap).toBeCloseTo(Math.min(need, reach + CONTACT_DEFAULTS.mirrorHeadSlackLu), 6);
  });

  it('heads at different heights need no head room: the torsos decide', () => {
    // a tall foe whose head on the impact frame is far above the Bonker's head and torso
    const TALL: Reach = { ...BONKER_T, headLu: 40, headYLu: 110, torsoImpactLu: 20, torsoFrontLu: 14.7 };
    const a = unit({ id: 1, side: 0, x: 980, target: 2, impactTick: 20, reach: BONKER_T, body: BONKER_BODY });
    const b = unit({ id: 2, side: 1, x: 1017, target: 1, impactTick: 20, reach: TALL, body: { ...BONKER_BODY, torsoBottom: 70, torsoTop: 100 } });
    const r = stage([a, b]);
    const gap = drawnGap(r, a, b);
    const torsos = 32.5 - c * 12.7 + Math.max(0, 20 - 14.7 - c * 12.7) + 14.7;
    // a's head (37.7 high) meets b's torso? b's torso is 70-100 lu high: no. b's head (110 high) meets a's torso? no
    expect(gap).toBeCloseTo(Math.max(torsos + CONTACT_DEFAULTS.clearLu, gap), 6);
    expect(gap).toBeLessThan(2 * (40 + HEAD_R));
  });

  it('a head at the height of the foe torso clears that torso', () => {
    // a long-necked attacker: its head on the impact frame leads its torso by far, at the foe's chest height (both with
    // short weapons, so the bodies' room and not the windows set the separation)
    const SHORT: Reach = { ...BONKER_T, tipLu: 48 };
    const NECK: Reach = { ...SHORT, headLu: 48, headYLu: 30 };
    const a = unit({ id: 1, side: 0, x: 980, target: 2, impactTick: 20, reach: NECK, body: BONKER_BODY });
    const b = unit({ id: 2, side: 1, x: 1017, target: 1, impactTick: 20, reach: SHORT, body: BONKER_BODY });
    const r = stage([a, b]);
    const gap = drawnGap(r, a, b);
    const headA = 48 - c * 12.7 + HEAD_R;
    const torsoB = 32.5 - c * 12.7;
    // within both weapons' reach the head clears the foe's leaning torso
    expect(gap - headA - torsoB).toBeGreaterThanOrEqual(Math.min(CONTACT_DEFAULTS.clearLu, gap - headA - torsoB) - 1e-6);
    expect(gap).toBeGreaterThan(drawnGap(stage([{ ...a, reach: SHORT }, b]), a, b));
  });

  it("a lancer's body reaches its horse's tracked head, not the lance (mount torsos no longer span the barding)", () => {
    // the Destrier Knight: the team layer (barding and pennant) put its torso 82.8 lu out; the frame front is the lance
    const LANCE: Reach = { tipLu: 120, lungeLu: 14, frontLu: 118, backLu: 34, torsoFrontLu: 82.8, torsoBackLu: 34 };
    const knight = (body: StageBody | null, reach: Reach): StageUnit => ({ id: 2, side: 1, x: 1080, air: false, sizeLu: 48, target: null, reach, body });
    const footman = unit({ id: 1, side: 0, x: 980, target: 2, reach: { tipLu: 67.3, lungeLu: 14.4, frontLu: 40, backLu: 20, torsoFrontLu: 16.8 } });
    const before = knight({ front: 118, back: 34, torsoFront: 82.8, torsoBack: 34, headLead: true }, LANCE);
    const after = knight({ front: 118, back: 34, torsoFront: 29.9, torsoBack: 28.9, headLead: true, torsoBottom: 22.9, torsoTop: 59.6, headX: 42.4, headY: 56.7 }, { ...LANCE, torsoFrontLu: 29.9, torsoBackLu: 28.9 });
    const gapBefore = drawnGap(stage([footman, before]), footman, after);
    const gapAfter = drawnGap(stage([footman, after]), footman, after);
    // the footman closes in to the horse's chest and head instead of standing a lance length off
    expect(gapAfter).toBeLessThan(gapBefore - 10);
    // its blade lands between the horse's chest (29.9) and the head's front (42.4 + its half size), not short of it
    const tip = 67.3 - CONTACT_DEFAULTS.compSingle * 14.4;
    expect(gapAfter - tip).toBeGreaterThan(0);
    expect(gapAfter - tip).toBeLessThan(42.4 + (0.12 * 48 + 2));
  });

  it('keeps the estimate where a unit has no trackers (the fallback)', () => {
    const a = unit({ id: 1, side: 0, x: 980, target: 2, impactTick: 20 });
    const b = unit({ id: 2, side: 1, x: 1017, target: 1, impactTick: 20 });
    const mixed = stage([a, { ...b, reach: BONKER_T, body: BONKER_BODY }]);
    const plain = stage([a, b]);
    // one side without a tracked head: the mirror estimate holds (no head room from one head)
    expect(drawnGap(mixed, a, b)).toBeGreaterThan(0);
    expect(drawnGap(plain, a, b)).toBeGreaterThan(70);
  });
});

describe('the battle view reads the trackers when they arrive (item 38 B0)', () => {
  it("asks a view again for its reach and body when its contactRevision changes (a bundle that came in late)", () => {
    const labels = (): { root: Container; setText: (s: string) => void; setStyle: () => void } => {
      const root = new Container();
      return { root, setText: (t) => (root.label = t), setStyle: () => {} };
    };
    let rev = 0;
    let reads = 0;
    class Art extends FakeArtProvider {
      override createUnit(o: Parameters<FakeArtProvider['createUnit']>[0]): ReturnType<FakeArtProvider['createUnit']> {
        const v = super.createUnit(o) as ReturnType<FakeArtProvider['createUnit']> & Record<string, unknown>;
        Object.defineProperty(v, 'contactRevision', { get: () => rev });
        v['reach'] = (): Reach => {
          reads++;
          return rev === 0 ? BONKER : BONKER_T;
        };
        return v;
      }
    }
    const config: MatchConfig = fakeMatchConfig();
    const state = { tick: 10, phase: 'regulation', sides: [], units: [], projectiles: [], casts: [], traps: [], rng: [1, 2, 3, 4], nextId: 1, outcome: null, hashes: [] } as unknown as SimState;
    (state as unknown as { sides: unknown[] }).sides = [0, 1].map(() => ({ ageIndex: 0, gold: 0, xp: 0, baseHp: 1_000_000, baseMaxHp: 1_000_000, turrets: [null, null, null, null], mountsOwned: 1, treasury: 0, lastStand: 'idle', stance: 'charge', holdP: 0, queue: [], pop: 0, research: { owned: [], cur: -1, startTick: 0, endTick: 0, paid: 0 }, powerPpm: [0, 0], ascendUntil: 0 }));
    const view = new BattleView({ sim: { state, config }, art: new Art(), audio: new FakeAudio(), labelFactory: labels });
    view.resize(1280, 720);
    view.setPaused(false);
    const u: UnitState = {
      id: 1, side: 0, card: 'bonker', level: 1, x: 500_000, prevX: 500_000, hp: 40_000, maxHp: 40_000, shield: 0, innateShield: 0,
      mode: 'walk', attacks: [{ targetId: -1, impactTick: 0, nextAttackTick: 0, lastAttackTick: 0 }], statuses: [], air: false, summoned: false, timers: [], lastDamageTick: 0,
    };
    state.units.push(u);
    for (let i = 0; i < 5; i++) view.render(1, 1000 / 60);
    const body = (): StageBody | null => view.stagingDebug().find((d) => d.id === 1)?.body ?? null;
    expect(reads).toBeGreaterThan(0);
    expect(body()?.torsoFront).toBe(25.1);
    rev = 1;
    for (let i = 0; i < 2; i++) view.render(1, 1000 / 60);
    expect(body()).toMatchObject({ torsoFront: 14.7, torsoBottom: 17, torsoTop: 43.9, headX: 2.1, headY: 47.7 });
    view.destroy();
  });
});
