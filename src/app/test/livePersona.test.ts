/**
 * The simulated online player's person (queue item 34, `live/persona.ts`): determinism from the seed,
 * temperaments, the vocabulary it owns, rate limits (never spammy, GG excepted), human answer delays,
 * declines and timeouts, nagging, its own proposals, and the dev overrides.
 */
import { describe, expect, it } from 'vitest';
import type { EmoteId } from '@/contracts';
import { content } from '@/content';
import { contentEmoteIds } from '../live/match';
import type { Moment } from '../live/moments';
import { PersonaBrain, personaFor, TEMPERAMENTS, TRAITS, type Persona, type PersonaContext, type Temperament } from '../live/persona';
import { PROPOSAL_WINDOW_MS, type LiveMessage, type TempoSpeed } from '../live/protocol';

const KNOWN = contentEmoteIds(content);

function ctx(o: Partial<PersonaContext> = {}): PersonaContext {
  return { speed: 1, tempoBusy: false, hpBp: [10_000, 10_000], tick: 1000, ended: false, ...o };
}

/** A persona of a given temperament (the first seed from `from` that has it). */
function personaOf(t: Temperament, from = 1): { persona: Persona; seed: number } {
  for (let seed = from; seed < from + 2000; seed += 1) {
    const persona = personaFor(seed, { trophies: 1200, known: KNOWN });
    if (persona.temperament === t) return { persona, seed };
  }
  throw new Error(`no ${t} persona`);
}

interface Said {
  at: number;
  msg: LiveMessage;
}

/** Runs the brain's clock from `from` to `to` in `step` ms, with moments and your messages at their times. */
function drive(
  brain: PersonaBrain,
  o: { from?: number; to: number; step?: number; ctx?: (now: number) => PersonaContext; moments?: [number, Moment][]; heard?: [number, LiveMessage][] },
): Said[] {
  const out: Said[] = [];
  const step = o.step ?? 100;
  const moments = [...(o.moments ?? [])];
  const heard = [...(o.heard ?? [])];
  for (let now = o.from ?? 0; now <= o.to; now += step) {
    const c = o.ctx ? o.ctx(now) : ctx();
    while (moments.length > 0 && moments[0]![0] <= now) brain.see(moments.shift()![1], now, c);
    while (heard.length > 0 && heard[0]![0] <= now) brain.hear(heard.shift()![1], now, c);
    brain.think(now, c);
    for (const msg of brain.due(now)) out.push({ at: now, msg });
  }
  return out;
}

const social = (s: Said[]): Said[] => s.filter((x) => x.msg.k === 'emote' || x.msg.k === 'chat');
const bigHitOnIt = (tick: number): Moment => ({ kind: 'bigHit', side: 1, tick });

describe('the simulated player (queue item 34)', () => {
  it('is deterministic: the same seed and the same inputs give the same messages at the same times', () => {
    const run = (): Said[] => {
      const persona = personaFor(4242, { trophies: 900, known: KNOWN });
      const brain = new PersonaBrain(persona, 4242);
      return drive(brain, {
        to: 240_000,
        moments: [
          [20_000, bigHitOnIt(400)],
          [60_000, { kind: 'low', side: 0, tick: 1200 }],
          [120_000, { kind: 'comeback', side: 1, tick: 2400 }],
          [200_000, { kind: 'end', side: 1, tick: 4000 }],
        ],
        heard: [
          [5000, { k: 'chat', line: 'glhf' }],
          [30_000, { k: 'tempoPropose', id: 1, speed: 2 }],
          [90_000, { k: 'emote', emote: 'laugh' }],
        ],
      });
    };
    const a = run();
    expect(a.length).toBeGreaterThan(0);
    expect(run()).toEqual(a);
    expect(personaFor(4242)).toEqual(personaFor(4242));
  });

  it('every temperament occurs, by its weight (friendly most, cocky least)', () => {
    const n: Record<Temperament, number> = { friendly: 0, sporting: 0, quiet: 0, cocky: 0 };
    for (let seed = 1; seed <= 2000; seed += 1) n[personaFor(seed).temperament] += 1;
    for (const t of TEMPERAMENTS) expect(n[t]).toBeGreaterThan(150);
    expect(n.friendly).toBeGreaterThan(n.cocky);
    expect(n.friendly / 2000).toBeGreaterThan(0.28);
    expect(n.cocky / 2000).toBeLessThan(0.22);
  });

  it('owns a plausible wheel: the six faces, up to 4 quotes, collected items only from the content and its trophies', () => {
    for (let seed = 1; seed <= 300; seed += 1) {
      const low = personaFor(seed, { trophies: 0, known: KNOWN });
      expect(low.vocabulary.emotes.slice(0, 6)).toEqual(['laugh', 'salute', 'cry', 'angry', 'thumbsUp', 'gg']);
      expect(low.vocabulary.quotes.length).toBeLessThanOrEqual(4);
      expect(low.vocabulary.quotes.length).toBeGreaterThan(0);
      for (const e of [...low.vocabulary.emotes.slice(6), ...low.vocabulary.quotes]) expect(KNOWN.has(e)).toBe(true);
      // Trophy Road items need their trophies
      expect(low.vocabulary.emotes).not.toContain('emote.clap');
      expect(low.vocabulary.emotes).not.toContain('emote.party');
      expect(low.vocabulary.quotes).not.toContain('quote.time_flies');
    }
    // with trophies, Trophy Road items show up sometimes
    const rich = Array.from({ length: 300 }, (_, i) => personaFor(i + 1, { trophies: 3000, known: KNOWN }));
    expect(rich.some((p) => p.vocabulary.emotes.includes('emote.clap'))).toBe(true);
  });

  it('only says what it owns (and quick chat)', () => {
    for (let seed = 1; seed <= 60; seed += 1) {
      const persona = personaFor(seed, { trophies: 1500, known: KNOWN });
      const owned = new Set<string>([...persona.vocabulary.emotes, ...persona.vocabulary.quotes]);
      const brain = new PersonaBrain(persona, seed);
      const said = drive(brain, {
        to: 400_000,
        step: 250,
        moments: Array.from({ length: 30 }, (_, i): [number, Moment] => [10_000 + i * 12_000, i % 3 === 0 ? bigHitOnIt(i) : i % 3 === 1 ? { kind: 'bigHit', side: 0, tick: i } : { kind: 'stalemate', side: null, tick: i }]),
      });
      for (const s of social(said)) if (s.msg.k === 'emote') expect(owned.has(s.msg.emote)).toBe(true);
    }
  });

  it('is never spammy: the gap, the per-minute cap and the per-match cap hold under a flood of moments; GG still comes', () => {
    for (const t of TEMPERAMENTS) {
      const { persona, seed } = personaOf(t);
      const brain = new PersonaBrain(persona, seed);
      const flood: [number, Moment][] = [];
      for (let at = 1000; at < 590_000; at += 500) flood.push([at, at % 1500 === 0 ? bigHitOnIt(at) : { kind: 'bigHit', side: 0, tick: at }]);
      flood.push([600_000, { kind: 'end', side: 0, tick: 12_000 }]);
      const said = social(drive(brain, { to: 610_000, step: 100, moments: flood }));
      const tr = TRAITS[t];
      const beforeEnd = said.filter((s) => s.at < 600_000);
      expect(beforeEnd.length).toBeLessThanOrEqual(tr.perMatch);
      for (let i = 1; i < beforeEnd.length; i += 1) expect(beforeEnd[i]!.at - beforeEnd[i - 1]!.at).toBeGreaterThanOrEqual(tr.gapMs);
      for (const s of beforeEnd) expect(beforeEnd.filter((x) => x.at > s.at - 60_000 && x.at <= s.at).length).toBeLessThanOrEqual(tr.perMinute);
      // the end's GG is not held back by the caps (when this persona says one)
      void said.filter((s) => s.at >= 600_000);
    }
  });

  it('says GG at the end most of the time, and only once', () => {
    let gg = 0;
    for (let seed = 1; seed <= 200; seed += 1) {
      const persona = personaFor(seed, { trophies: 800, known: KNOWN });
      const brain = new PersonaBrain(persona, seed);
      const said = social(drive(brain, { from: 0, to: 6000, moments: [[1000, { kind: 'end', side: seed % 2 === 0 ? 0 : 1, tick: 5000 }]], ctx: () => ctx({ tick: 5000 }) }));
      const after = said.filter((s) => s.at >= 1000);
      expect(after.length).toBeLessThanOrEqual(1);
      if (after.length === 1) {
        gg += 1;
        // within the 2.5 s before the Result shows
        expect(after[0]!.at - 1000).toBeLessThan(2500);
      }
    }
    expect(gg / 200).toBeGreaterThan(0.55);
  });

  it('answers your proposal after a human delay, sometimes no, sometimes not at all', () => {
    const delays: number[] = [];
    let yes = 0;
    let no = 0;
    let silent = 0;
    for (let seed = 1; seed <= 400; seed += 1) {
      const persona = personaFor(seed, { trophies: 800, known: KNOWN });
      const brain = new PersonaBrain(persona, seed);
      const said = drive(brain, { from: 0, to: 20_000, step: 50, heard: [[1000, { k: 'tempoPropose', id: 1, speed: 2 }]] });
      const ans = said.find((s) => s.msg.k === 'tempoAnswer');
      if (!ans || ans.msg.k !== 'tempoAnswer') {
        silent += 1;
        continue;
      }
      const d = ans.at - 1000;
      delays.push(d);
      const t = persona.traits;
      expect(d).toBeGreaterThanOrEqual(Math.floor((t.answerMs[0] * persona.answerScalePct) / 100) - 50);
      expect(d).toBeLessThanOrEqual(Math.floor((t.answerMs[1] * persona.answerScalePct) / 100) + 4000 + 50);
      if (ans.msg.accept) yes += 1;
      else no += 1;
    }
    expect(Math.min(...delays)).toBeGreaterThanOrEqual(400);
    expect(yes).toBeGreaterThan(no);
    expect(no).toBeGreaterThan(20);
    expect(silent).toBeGreaterThan(5);
    // some answers come too late for the window: a timeout on your side
    expect(delays.some((d) => d >= PROPOSAL_WINDOW_MS)).toBe(true);
    // never instant, rarely more than the window
    expect(delays.filter((d) => d >= PROPOSAL_WINDOW_MS).length / delays.length).toBeLessThan(0.2);
  });

  it('temperaments differ: friendly talks more than quiet; cocky likes faster and refuses slower; quiet answers slowest', () => {
    const count = (t: Temperament): number => {
      let total = 0;
      for (let k = 0; k < 40; k += 1) {
        const { persona, seed } = personaOf(t, 1 + k * 50);
        const brain = new PersonaBrain(persona, seed);
        const moments: [number, Moment][] = [
          [8000, bigHitOnIt(200)],
          [40_000, { kind: 'bigHit', side: 0, tick: 900 }],
          [80_000, { kind: 'low', side: 1, tick: 1800 }],
          [120_000, { kind: 'comeback', side: 0, tick: 2500 }],
          [170_000, { kind: 'end', side: 0, tick: 3500 }],
        ];
        total += social(drive(brain, { to: 175_000, step: 200, moments })).length;
      }
      return total;
    };
    expect(count('friendly')).toBeGreaterThan(count('quiet') * 2);
    const accept = (t: Temperament, speed: TempoSpeed): number => {
      let n = 0;
      for (let k = 0; k < 60; k += 1) {
        const { persona, seed } = personaOf(t, 1 + k * 40);
        const brain = new PersonaBrain(persona, seed);
        const said = drive(brain, { to: 15_000, step: 50, ctx: () => ctx({ speed: 1.5 }), heard: [[500, { k: 'tempoPropose', id: 1, speed }]] });
        if (said.some((s) => s.msg.k === 'tempoAnswer' && s.msg.accept)) n += 1;
      }
      return n;
    };
    expect(accept('cocky', 2)).toBeGreaterThan(accept('cocky', 1) * 2);
    expect(TRAITS.quiet.answerMs[1]).toBeGreaterThan(TRAITS.friendly.answerMs[1]);
  });

  it('nagging makes it less patient: a second ask right after a no is accepted less often', () => {
    let first = 0;
    let again = 0;
    for (let seed = 1; seed <= 400; seed += 1) {
      const persona = personaFor(seed, { known: KNOWN });
      const brain = new PersonaBrain(persona, seed);
      brain.force = { answer: 'decline' };
      drive(brain, { to: 4000, step: 50, heard: [[100, { k: 'tempoPropose', id: 1, speed: 2 }]] });
      brain.force = null;
      const said = drive(brain, { from: 4050, to: 30_000, step: 50, heard: [[20_000, { k: 'tempoPropose', id: 2, speed: 2 }]] });
      if (said.some((s) => s.msg.k === 'tempoAnswer' && s.msg.id === 2 && s.msg.accept)) again += 1;
      const fresh = new PersonaBrain(persona, seed);
      if (drive(fresh, { to: 15_000, step: 50, heard: [[100, { k: 'tempoPropose', id: 1, speed: 2 }]] }).some((s) => s.msg.k === 'tempoAnswer' && s.msg.accept)) first += 1;
    }
    expect(again).toBeLessThan(first);
  });

  it('proposes a speed itself now and then: after the opening, never while one is open, at most 3, well apart', () => {
    let proposers = 0;
    for (let seed = 1; seed <= 120; seed += 1) {
      const persona = personaFor(seed, { known: KNOWN });
      const brain = new PersonaBrain(persona, seed);
      let busyUntil = -1;
      let speed: TempoSpeed = 1;
      const props: Said[] = [];
      for (let now = 0; now <= 600_000; now += 100) {
        const tick = Math.floor(now / 50);
        const c = ctx({ tick, speed, tempoBusy: now < busyUntil });
        brain.think(now, c);
        for (const msg of brain.due(now)) {
          if (msg.k !== 'tempoPropose') continue;
          expect(c.tempoBusy).toBe(false);
          expect(tick).toBeGreaterThanOrEqual(500);
          props.push({ at: now, msg });
          busyUntil = now + PROPOSAL_WINDOW_MS;
          // you say yes to every other one
          const yes = props.length % 2 === 1;
          brain.hear({ k: 'tempoAnswer', id: msg.id, accept: yes }, now + 2000, c);
          if (yes) speed = msg.speed;
        }
      }
      expect(props.length).toBeLessThanOrEqual(3);
      for (let i = 1; i < props.length; i += 1) expect(props[i]!.at - props[i - 1]!.at).toBeGreaterThanOrEqual(50_000);
      if (props.length > 0) proposers += 1;
    }
    // some players ask for speed, many never do
    expect(proposers).toBeGreaterThan(10);
    expect(proposers).toBeLessThan(115);
  });

  it('with its own proposals off (the e2e hook) it never asks by itself, but a forced proposal still goes', () => {
    for (let seed = 1; seed <= 60; seed += 1) {
      const brain = new PersonaBrain(personaFor(seed, { known: KNOWN }), seed);
      brain.ownProposals = false;
      for (let now = 0; now <= 400_000; now += 100) {
        const c = ctx({ tick: Math.floor(now / 50), speed: 1, tempoBusy: false });
        brain.think(now, c);
        expect(brain.due(now).some((m) => m.k === 'tempoPropose')).toBe(false);
      }
      brain.forcePropose(2, 400_100);
      expect(brain.due(400_100).filter((m) => m.k === 'tempoPropose')).toHaveLength(1);
    }
  });

  it('replies to your emotes and chat sometimes, at most once per 20 s', () => {
    let replies = 0;
    for (let seed = 1; seed <= 100; seed += 1) {
      const persona = personaFor(seed, { known: KNOWN });
      const brain = new PersonaBrain(persona, seed);
      const heard: [number, LiveMessage][] = [];
      for (let at = 1000; at < 60_000; at += 3000) heard.push([at, { k: 'emote', emote: 'thumbsUp' as EmoteId }]);
      const said = social(drive(brain, { to: 62_000, heard, ctx: () => ctx({ tick: 300 }) }));
      replies += said.length > 0 ? 1 : 0;
      // greeting aside, replies stay at least 20 s apart
      expect(said.length).toBeLessThanOrEqual(4);
    }
    expect(replies).toBeGreaterThan(20);
  });

  it('drops a reaction whose moment has passed instead of sending it late', () => {
    const { persona, seed } = personaOf('friendly');
    const brain = new PersonaBrain(persona, seed);
    // a forced message blocks the gap; a reaction queued meanwhile is stale by the time the gap ends
    brain.forceSay({ k: 'chat', line: 'wow' }, 0);
    expect(brain.due(0)).toEqual([{ k: 'chat', line: 'wow' }]);
    let late = 0;
    for (let i = 0; i < 20; i += 1) {
      brain.see(bigHitOnIt(i), 100 + i, ctx());
      late += brain.due(100 + i + 4500).length;
    }
    expect(late).toBe(0);
  });

  it('is never mean: no laugh or sleepy face at your misfortune, from any temperament (review O S1)', () => {
    let cocky = 0;
    for (let seed = 1; seed <= 500; seed += 1) {
      const persona = personaFor(seed, { trophies: 2600, known: KNOWN });
      if (persona.temperament === 'cocky') cocky += 1;
      const brain = new PersonaBrain(persona, seed);
      // your base low, your cry, anger and oops (chat and quote), your slower speed (often declined) and its
      // win; none of its own good moments, so any laugh would be at you
      const said = drive(brain, {
        to: 200_000,
        step: 100,
        moments: [
          [30_000, { kind: 'low', side: 0, tick: 600 }],
          [190_000, { kind: 'end', side: 1, tick: 3800 }],
        ],
        heard: [
          [50_000, { k: 'emote', emote: 'cry' }],
          [75_000, { k: 'emote', emote: 'angry' }],
          [100_000, { k: 'chat', line: 'oops' }],
          [125_000, { k: 'emote', emote: 'quote.oops_mine' }],
          [150_000, { k: 'tempoPropose', id: 1, speed: 1 }],
        ],
        ctx: (now) => ctx({ speed: 2, tempoBusy: true, hpBp: [2000, 9000], tick: Math.floor(now / 50) + 1, ended: now >= 190_000 }),
      });
      // and its own proposal, which you decline (forced, so every persona has one)
      const brain2 = new PersonaBrain(persona, seed);
      brain2.forcePropose(2, 0);
      const declined = drive(brain2, { from: 0, to: 9000, step: 100, heard: [[2000, { k: 'tempoAnswer', id: 1, accept: false }]], ctx: () => ctx({ tick: 400, tempoBusy: true }) });
      for (const s of [...social(said), ...social(declined)]) {
        expect(s.msg.k === 'emote' && (s.msg.emote === 'laugh' || s.msg.emote === 'emote.sleepy')).toBe(false);
      }
    }
    expect(cocky).toBeGreaterThan(40);
  });

  it('laughs at most once a match, only for its own good moments, in every temperament (review O S1)', () => {
    let cockyLaughs = 0;
    for (const t of TEMPERAMENTS) {
      for (let k = 0; k < 25; k += 1) {
        const { persona, seed } = personaOf(t, 1 + k * 37);
        const brain = new PersonaBrain(persona, seed);
        // a flood of its own good moments: big hits on your base and its comebacks
        const moments: [number, Moment][] = [];
        for (let at = 5000; at < 400_000; at += 9000) moments.push([at, at % 2 === 0 ? { kind: 'bigHit', side: 0, tick: at / 50 } : { kind: 'comeback', side: 1, tick: at / 50 }]);
        const laughs = social(drive(brain, { to: 410_000, step: 100, moments, ctx: (now) => ctx({ tick: Math.floor(now / 50) + 1, tempoBusy: true }) })).filter(
          (s) => s.msg.k === 'emote' && s.msg.emote === 'laugh',
        ).length;
        expect(laughs).toBeLessThanOrEqual(1);
        if (t === 'cocky') cockyLaughs += laughs;
      }
    }
    // cocky still enjoys its own big moments
    expect(cockyLaughs).toBeGreaterThan(5);
  });

  it('drops a greeting that would come long after the opening: you were away at the start (review O nit 1)', () => {
    let late = 0;
    let onTime = 0;
    const c = (now: number): PersonaContext => ctx({ tick: Math.floor(now / 50) + 1, tempoBusy: true });
    for (let seed = 1; seed <= 300; seed += 1) {
      const persona = personaFor(seed, { known: KNOWN });
      // away from 1 s to 61 s: nothing runs meanwhile (the live layer holds the link during a catch-up)
      const brain = new PersonaBrain(persona, seed);
      drive(brain, { to: 1000, step: 50, ctx: c });
      late += social(drive(brain, { from: 61_000, to: 75_000, step: 50, ctx: c })).length;
      onTime += social(drive(new PersonaBrain(persona, seed), { to: 8000, step: 50, ctx: c })).length > 0 ? 1 : 0;
    }
    expect(late).toBe(0);
    expect(onTime).toBeGreaterThan(100);
  });

  it('notices your evolve, Overdrive and the Siege now and then (friendly and sporting most; review O nit 11)', () => {
    const count = (t: Temperament, m: Moment): number => {
      let n = 0;
      for (let k = 0; k < 60; k += 1) {
        const { persona, seed } = personaOf(t, 1 + k * 31);
        const brain = new PersonaBrain(persona, seed);
        const c = (): PersonaContext => ctx({ tempoBusy: true });
        // past its greeting first
        drive(brain, { to: 20_000, step: 100, ctx: c });
        n += social(drive(brain, { from: 40_000, to: 46_000, step: 100, moments: [[40_000, m]], ctx: c })).length;
      }
      return n;
    };
    const evolve: Moment = { kind: 'evolve', side: 0, tick: 800 };
    expect(count('friendly', evolve)).toBeGreaterThan(5);
    expect(count('sporting', evolve)).toBeGreaterThan(5);
    expect(count('quiet', evolve)).toBeLessThan(count('friendly', evolve));
    const siege: Moment = { kind: 'phase', side: null, tick: 4000, phase: 'siege' };
    expect(count('friendly', siege) + count('sporting', siege)).toBeGreaterThan(5);
    expect(count('quiet', siege)).toBe(0);
  });

  it('answers your quote by what it says: no "Nice!" or laugh to "That was close!", your greeting with its own (review O nit 10)', () => {
    let glhfBack = 0;
    for (let seed = 1; seed <= 400; seed += 1) {
      const persona = personaFor(seed, { trophies: 900, known: KNOWN });
      const c = (): PersonaContext => ctx({ tick: 2000, tempoBusy: true });
      const close = new PersonaBrain(persona, seed);
      drive(close, { to: 20_000, step: 100, ctx: c });
      for (const s of social(drive(close, { from: 30_000, to: 40_000, step: 100, heard: [[30_000, { k: 'emote', emote: 'quote.so_close' }]], ctx: c }))) {
        expect(s.msg).not.toEqual({ k: 'chat', line: 'nice' });
        expect(s.msg).not.toEqual({ k: 'emote', emote: 'laugh' });
      }
      const hi = new PersonaBrain(persona, seed);
      const said = social(drive(hi, { to: 6000, step: 100, heard: [[100, { k: 'emote', emote: 'quote.glhf' }]], ctx: () => ctx({ tick: 2, tempoBusy: true }) }));
      if (said.some((s) => s.msg.k === 'chat' && s.msg.line === 'glhf')) glhfBack += 1;
    }
    expect(glhfBack).toBeGreaterThan(60);
  });

  it('the dev overrides force its answer and its proposal', () => {
    const { persona, seed } = personaOf('quiet');
    const brain = new PersonaBrain(persona, seed);
    brain.force = { answer: 'accept', delayMs: 1200 };
    const said = drive(brain, { to: 5000, step: 100, heard: [[1000, { k: 'tempoPropose', id: 3, speed: 1.5 }]] });
    expect(said.find((s) => s.msg.k === 'tempoAnswer')).toEqual({ at: 2200, msg: { k: 'tempoAnswer', id: 3, accept: true } });
    brain.forcePropose(2, 6000);
    expect(brain.due(6000)).toEqual([{ k: 'tempoPropose', id: 1, speed: 2 }]);
  });
});
