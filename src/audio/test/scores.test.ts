import type { MusicLayer } from '@/contracts';
import { describe, expect, it } from 'vitest';
import { INSTRUMENTS } from '../instruments';
import { continuesBattle, EVOLVE_TRANSPOSE_STEPS, evolveTranspose, MUSIC_CUES, music } from '../music';
import { OVERDRIVE_BPM } from '../scores/arrangements';
import { CHORDS, chordVoicing, diatonicBelow, HARMONY, MELODY, STEPS_PER_BAR, THEME_BARS, THEME_BPM, themeMelody } from '../scores/dawnMarch';
import { LEAD_OCTAVE_DROP_ABOVE, scoreSeconds, transposedMidi, type Score } from '../sequencer';
import { midi } from '../soundKit';

/** A14.3 with the A17.12 music cues (`music.bronze`, `music.industrial`, `music.cosmic`). */
const BATTLE = ['music.stone', 'music.bronze', 'music.medieval', 'music.gunpowder', 'music.industrial', 'music.modern', 'music.future', 'music.cosmic'];
const A14_3 = ['music.menu', 'music.capsule', ...BATTLE, 'stinger.victory', 'stinger.defeat'];
const LAYERS: MusicLayer[] = ['intensity', 'overdrive', 'siege'];

function score(cue: string): Score {
  const d = music[cue];
  if (!d || d.kind !== 'seq') throw new Error(cue);
  return d.score;
}

describe('"Dawn March" theme (A13)', () => {
  it('is 16 bars at 110 BPM', () => {
    expect(THEME_BPM).toBe(110);
    expect(THEME_BARS).toBe(16);
    expect(MELODY).toHaveLength(16);
    expect(HARMONY).toHaveLength(16);
  });

  it('fills every bar exactly', () => {
    MELODY.forEach((bar, k) => expect(bar.reduce((s, [, len]) => s + len, 0), `bar ${k + 1}`).toBe(STEPS_PER_BAR));
  });

  it('is singable: within a voice range and no leap over an octave', () => {
    const notes = themeMelody();
    const pitches = notes.map((n) => n.midi);
    expect(Math.max(...pitches) - Math.min(...pitches)).toBeLessThanOrEqual(19);
    for (let k = 1; k < pitches.length; k++) expect(Math.abs(pitches[k]! - pitches[k - 1]!)).toBeLessThanOrEqual(12);
    // Starts on the motif and comes home to the tonic.
    expect(pitches.slice(0, 4)).toEqual([midi('C5'), midi('G4'), midi('C5'), midi('E5')]);
    expect(pitches[pitches.length - 1]! % 12).toBe(0);
  });

  it('builds harmony a diatonic third below and chord voicings inside one octave', () => {
    expect(diatonicBelow(midi('E5'), 2)).toBe(midi('C5'));
    expect(diatonicBelow(midi('C5'), 2)).toBe(midi('A4'));
    expect(diatonicBelow(midi('F5'), 2)).toBe(midi('D5'));
    for (const c of Object.keys(CHORDS) as (keyof typeof CHORDS)[]) {
      const v = chordVoicing(c, 55);
      expect(v).toHaveLength(3);
      for (const m of v) expect(m >= 55 && m < 67).toBe(true);
    }
  });
});

describe('music manifest (A14.3)', () => {
  it('has exactly the A14.3 cues', () => {
    expect([...MUSIC_CUES].sort()).toEqual([...A14_3].sort());
  });

  it('every score is valid: known instruments, notes inside the score, sane velocities', () => {
    for (const cue of MUSIC_CUES) {
      const s = score(cue);
      expect(s.tracks.length, cue).toBeGreaterThan(0);
      for (const t of s.tracks) {
        expect(INSTRUMENTS[t.instrument], `${cue} ${t.name}`).toBeDefined();
        expect(['base', ...LAYERS]).toContain(t.layer);
        for (const n of t.notes) {
          expect(n.step >= 0 && n.step < s.lengthSteps, `${cue} ${t.name} step ${n.step}`).toBe(true);
          expect(n.len).toBeGreaterThan(0);
          expect(n.vel > 0 && n.vel <= 1).toBe(true);
          expect(n.midi >= 24 && n.midi <= 100, `${cue} ${t.name} midi ${n.midi}`).toBe(true);
        }
      }
    }
  });

  it('battle arrangements share the theme length and tempo, loop, and have all three layers', () => {
    const lengths = new Set(BATTLE.map((c) => score(c).lengthSteps));
    expect([...lengths]).toEqual([THEME_BARS * STEPS_PER_BAR]);
    for (const cue of BATTLE) {
      const s = score(cue);
      expect(s.bpm, cue).toBe(110);
      expect(s.loop, cue).toBe(true);
      expect(s.overdriveBpm, cue).toBe(OVERDRIVE_BPM);
      expect(OVERDRIVE_BPM).toBe(8);
      for (const l of LAYERS) expect(s.tracks.some((t) => t.layer === l), `${cue} ${l}`).toBe(true);
      // The siege layer is a heartbeat bass; overdrive is percussion.
      expect(s.tracks.filter((t) => t.layer === 'siege').every((t) => t.instrument === 'heartbeat')).toBe(true);
      expect(s.tracks.filter((t) => t.layer === 'overdrive').every((t) => t.pitched === false)).toBe(true);
      expect(music[cue]!.role).toBe('battle');
    }
  });

  it('Overdrive brings double-time percussion (A13 Layers)', () => {
    const hitsInBar = (t: { notes: readonly { step: number }[] }): number => new Set(t.notes.filter((n) => n.step < STEPS_PER_BAR).map((n) => n.step)).size;
    for (const cue of BATTLE) {
      const s = score(cue);
      const basePerc = s.tracks.filter((t) => t.layer === 'base' && t.pitched === false).map(hitsInBar);
      const overdrivePerc = s.tracks.filter((t) => t.layer === 'overdrive' && t.pitched === false).map(hitsInBar);
      // Straight 16ths on top of a base kit that never plays that densely.
      expect(Math.max(...overdrivePerc), cue).toBe(STEPS_PER_BAR);
      expect(Math.max(...basePerc), cue).toBeLessThan(STEPS_PER_BAR);
    }
  });

  it('each age plays the theme melody with its own instruments (A13 table)', () => {
    const lead: Record<string, string> = {
      'music.stone': 'flute',
      'music.medieval': 'horn',
      'music.gunpowder': 'fife',
      'music.modern': 'brass',
      'music.future': 'lead',
      'music.bronze': 'reedPipe',
      'music.industrial': 'cornet',
      'music.cosmic': 'choir',
    };
    const theme = themeMelody().map((n) => n.midi % 12);
    for (const [cue, inst] of Object.entries(lead)) {
      const t = score(cue).tracks.find((x) => x.name === `${inst} melody`);
      expect(t, cue).toBeDefined();
      expect(t!.notes.map((n) => n.midi % 12), cue).toEqual(theme);
    }
    const inst = (cue: string): Set<string> => new Set(score(cue).tracks.map((t) => t.instrument));
    expect(inst('music.stone')).toEqual(expect.objectContaining({}));
    expect(inst('music.stone').has('hideDrum')).toBe(true);
    expect(inst('music.medieval').has('lute')).toBe(true);
    expect(inst('music.gunpowder').has('snare')).toBe(true);
    expect(inst('music.modern').has('brassStab')).toBe(true);
    expect(inst('music.modern').has('synthBass')).toBe(true);
    expect(inst('music.future').has('arp')).toBe(true);
    expect(score('music.future').pump).toBeDefined();
    expect(score('music.future').tracks.some((t) => t.pump)).toBe(true);
    // A17.12: lyre and frame drum; brass band with anvil and pistons; choir, sub pulse and bells
    expect(inst('music.bronze').has('lyre')).toBe(true);
    expect(inst('music.bronze').has('frameDrum')).toBe(true);
    expect(inst('music.industrial').has('tuba')).toBe(true);
    expect(inst('music.industrial').has('anvil')).toBe(true);
    expect(inst('music.industrial').has('piston')).toBe(true);
    expect(inst('music.cosmic').has('subPulse')).toBe(true);
    expect(inst('music.cosmic').has('bell')).toBe(true);
  });

  it('the menu is the slow version and the capsule room a loop', () => {
    const menu = score('music.menu');
    expect(menu.bpm).toBeLessThan(THEME_BPM);
    expect(menu.loop).toBe(true);
    expect(menu.overdriveBpm ?? 0).toBe(0);
    expect(menu.tracks.find((t) => t.name === 'softFlute melody')!.notes.map((n) => n.midi)).toEqual(themeMelody().map((n) => n.midi));
    const cap = score('music.capsule');
    expect(cap.loop).toBe(true);
    expect(music['music.capsule']!.role).toBe('menu');
  });

  it('stingers are one-shots on the motif, a few seconds long', () => {
    for (const cue of ['stinger.victory', 'stinger.defeat']) {
      const s = score(cue);
      expect(s.loop).toBe(false);
      expect(music[cue]!.role).toBe('stinger');
      expect(scoreSeconds(s)).toBeGreaterThan(2);
      expect(scoreSeconds(s)).toBeLessThan(6);
    }
    const motif = themeMelody().slice(0, 3);
    const v = score('stinger.victory').tracks[0]!.notes;
    expect(v.slice(0, 4).map((n) => n.midi)).toEqual([midi('C5'), midi('G4'), midi('C5'), midi('E5')]);
    // Both stingers open with the motif (C - G C, in the theme's rhythm).
    const d = score('stinger.defeat').tracks[0]!.notes;
    for (const s of [v, d]) {
      expect(s.slice(0, 3).map((n) => [n.step, n.len, n.midi])).toEqual(motif.map((n) => [n.step, n.len, n.midi]));
    }
    // The defeat stinger falls where the theme rises, moves only by small steps and comes home to C
    // (gentle, not mocking).
    expect(d[3]!.midi).toBeLessThan(d[2]!.midi);
    for (let k = 1; k < d.length; k++) expect(Math.abs(d[k]!.midi - d[k - 1]!.midi), `step ${k}`).toBeLessThanOrEqual(5);
    expect(d[d.length - 1]!.midi % 12).toBe(0);
  });
});

describe('key changes (A13)', () => {
  it('transposes +2, +2, +1, +1, +1, +1, +1 on own evolves (+9 at Cosmic, A17.8)', () => {
    expect(EVOLVE_TRANSPOSE_STEPS).toEqual([2, 2, 1, 1, 1, 1, 1]);
    expect([0, 1, 2, 3, 4, 5, 6, 7].map(evolveTranspose)).toEqual([0, 2, 4, 5, 6, 7, 8, 9]);
  });

  it('drops the lead lines an octave once the total passes +6; drums never transpose (A17.8)', () => {
    expect(LEAD_OCTAVE_DROP_ABOVE).toBe(6);
    const c5 = midi('C5');
    expect(transposedMidi({ lead: true }, c5, 6)).toBe(c5 + 6);
    expect(transposedMidi({ lead: true }, c5, 7)).toBe(c5 + 7 - 12);
    expect(transposedMidi({ lead: true }, c5, 9)).toBe(c5 - 3);
    expect(transposedMidi({}, c5, 9)).toBe(c5 + 9);
    expect(transposedMidi({ pitched: false }, 60, 9)).toBe(60);
    // every battle arrangement marks its theme melody and harmony as lead lines, and nothing else
    for (const cue of BATTLE) {
      for (const t of score(cue).tracks) expect(t.lead === true, `${cue} ${t.name}`).toBe(/ (melody|harmony)$/.test(t.name));
    }
  });

  it('carries battle state only into the next battle cue or a stinger', () => {
    expect(continuesBattle('battle', 'battle')).toBe(true);
    expect(continuesBattle('battle', 'stinger')).toBe(true);
    expect(continuesBattle('battle', 'menu')).toBe(false);
    expect(continuesBattle('stinger', 'battle')).toBe(false);
    expect(continuesBattle('menu', 'battle')).toBe(false);
    expect(continuesBattle(null, 'battle')).toBe(false);
  });
});
