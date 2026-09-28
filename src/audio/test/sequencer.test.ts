import { describe, expect, it } from 'vitest';
import { scoreSeconds, Sequencer, stepSeconds, type Score } from '../sequencer';

const tiny: Score = {
  bpm: 120,
  stepsPerBeat: 4,
  lengthSteps: 8,
  loop: true,
  tracks: [
    { name: 'a', instrument: 'lead', layer: 'base', notes: [{ step: 0, len: 2, midi: 60, vel: 1 }, { step: 4, len: 4, midi: 64, vel: 0.5 }] },
    { name: 'b', instrument: 'hat', layer: 'overdrive', pitched: false, notes: [{ step: 1, len: 1, midi: 60, vel: 1 }] },
  ],
};

describe('sequencer', () => {
  it('computes step and score lengths', () => {
    expect(stepSeconds(120, 4)).toBe(0.125);
    expect(scoreSeconds(tiny)).toBe(1);
  });

  it('schedules notes at their step times with lengths at the tempo', () => {
    const s = new Sequencer(tiny, 10);
    const b = s.advance(10.5, 120);
    expect(b.notes.map((n) => [n.time, n.dur, n.midi, n.track])).toEqual([
      [10, 0.25, 60, 0],
      [10.125, 0.125, 60, 1],
    ]);
    expect(b.beats.map((x) => x.time)).toEqual([10]);
    expect(s.step).toBe(4);
    const b2 = s.advance(11, 120);
    expect(b2.notes.map((n) => [n.time, n.dur, n.midi])).toEqual([[10.5, 0.5, 64]]);
    expect(b2.beats.map((x) => x.time)).toEqual([10.5]);
  });

  it('never schedules a step twice and loops back to step 0', () => {
    const s = new Sequencer(tiny, 0);
    const times: number[] = [];
    for (let t = 0.05; t < 3; t += 0.05) for (const n of s.advance(t, 120).notes) times.push(n.time);
    expect(new Set(times).size).toBe(times.length);
    // 3 notes per 1 s pass; three passes complete before t = 3.
    expect(times.length).toBe(9);
    expect(s.passes).toBe(3);
    expect(s.step).toBe(0);
  });

  it('ends a one-shot score', () => {
    const s = new Sequencer({ ...tiny, loop: false }, 0);
    s.advance(5, 120);
    expect(s.done).toBe(true);
    expect(s.advance(10, 120).notes).toHaveLength(0);
  });

  it('changes tempo between steps (the Overdrive feel)', () => {
    const s = new Sequencer(tiny, 0);
    s.advance(0.5, 120);
    expect(s.nextTime).toBeCloseTo(0.5, 9);
    expect(s.step).toBe(4);
    // At 240 BPM a step is 1/16 s: from 0.5 to 1.0 eight steps play (4..7, then 0..3 of the next pass).
    const b = s.advance(1.0, 240);
    expect(b.notes.map((n) => n.time)).toEqual([0.5, 0.75, 0.8125]);
    expect(b.notes[0]!.dur).toBe(0.25);
    expect(s.step).toBe(4);
    expect(s.passes).toBe(1);
  });

  it('skips silent tracks through the include filter', () => {
    const s = new Sequencer(tiny, 0);
    const b = s.advance(1, 120, (k) => k === 0);
    expect(b.notes.every((n) => n.track === 0)).toBe(true);
    expect(b.notes).toHaveLength(2);
  });

  it('can start mid-score and catch up silently after a stall', () => {
    const s = new Sequencer(tiny, 0, 4);
    expect(s.advance(0.01, 120).notes.map((n) => n.midi)).toEqual([64]);
    const skipped = s.catchUp(10.02, 120);
    expect(skipped).toBeGreaterThan(70);
    expect(s.nextTime).toBeGreaterThanOrEqual(10.02);
    expect(s.nextTime - 10.02).toBeLessThan(0.125);
  });
});
