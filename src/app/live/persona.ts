/**
 * The person behind the simulated online player (owner request 2026-10-13, queue item 34): "When you play
 * against a 'fake human', it should now and then send emojis and comments, propose higher/lower speed,
 * and have a random delay on how fast it accepts a change in speed or similar. It must seem realistic."
 *
 * The AI General still plays the match (the sim and the bot are untouched); this layer only talks. Each
 * generated player gets a temperament from the match seed (friendly, sporting, quiet or cocky) with its
 * own chattiness, reaction and answer times and tempo taste, and a small vocabulary of what such a player
 * owns: the six starter faces, the quick chat every player has, and a few collected quotes and emotes
 * plausible for its trophies. It reacts to what a player notices (`moments.ts`: big hits, low bases,
 * comebacks, a stalemate, the end), answers your emotes and chat sometimes, answers your speed proposals
 * after a human delay (sometimes declining, sometimes letting them run out, less patient when nagged),
 * and now and then proposes a speed itself.
 *
 * Never spammy: one message queued at a time, a minimum gap, a cap per minute and per match (GG is the
 * one exception), and a reaction that comes too late for its moment is dropped instead of sent.
 *
 * Pure and deterministic: seeded sfc32 streams (`persona:<seed>` and three sub-streams), integer chances
 * in basis points and times from the caller's clock. The same match and the same inputs at the same times
 * give the same messages (tests). It lives in the app layer because it only drives presentation; it reads
 * nothing hidden (no gold, no plans), only what both players see.
 */
import type { EmoteId, Side } from '@/contracts';
import { chanceBp, pickWeighted, randRange, seedSfc32, type Sfc32State } from '@/core';
import type { Moment } from './moments';
import { PROPOSAL_WINDOW_MS, type LiveMessage, type QuickChatId, type TempoSpeed } from './protocol';

export type Temperament = 'friendly' | 'sporting' | 'quiet' | 'cocky';
export const TEMPERAMENTS: readonly Temperament[] = ['friendly', 'sporting', 'quiet', 'cocky'];
/** How often each temperament is generated (weights, in `TEMPERAMENTS` order). */
const TEMPERAMENT_WEIGHTS = [35, 25, 25, 15];

/** The simulated player always plays side 1 (the player is side 0). */
const SELF: Side = 1;
const FOE: Side = 0;

export interface Traits {
  /** Reaction chances are scaled by this (bp; 10,000 = the temperament's table). */
  chatBp: number;
  /** How long it takes to answer a speed proposal (ms, before the per-player scale). */
  answerMs: readonly [number, number];
  /** How long a reaction to a moment takes (ms). */
  reactMs: readonly [number, number];
  /** At least this long between two of its messages (ms). */
  gapMs: number;
  /** At most this many messages in any 60 s. */
  perMinute: number;
  /** At most this many messages in a match (GG excepted). */
  perMatch: number;
  acceptFasterBp: number;
  acceptSlowerBp: number;
  /** Chance to let your proposal run out without an answer (bp). */
  ignoreBp: number;
  /** Chance to propose a faster game when it thinks about it (bp). */
  fasterBp: number;
  /** Chance to ask for the normal speed when its base is in trouble (bp). */
  slowerBp: number;
  /** Chance to answer your emote or chat (bp). */
  replyBp: number;
}

export const TRAITS: Readonly<Record<Temperament, Traits>> = {
  friendly: { chatBp: 10000, answerMs: [900, 2800], reactMs: [700, 2200], gapMs: 7000, perMinute: 3, perMatch: 10, acceptFasterBp: 7500, acceptSlowerBp: 6500, ignoreBp: 600, fasterBp: 2200, slowerBp: 1500, replyBp: 6000 },
  sporting: { chatBp: 9000, answerMs: [1200, 3600], reactMs: [800, 2600], gapMs: 9000, perMinute: 2, perMatch: 8, acceptFasterBp: 6500, acceptSlowerBp: 6500, ignoreBp: 500, fasterBp: 1400, slowerBp: 1500, replyBp: 5000 },
  quiet: { chatBp: 4000, answerMs: [2200, 7600], reactMs: [1500, 4000], gapMs: 18000, perMinute: 1, perMatch: 4, acceptFasterBp: 5500, acceptSlowerBp: 5000, ignoreBp: 3000, fasterBp: 500, slowerBp: 800, replyBp: 1500 },
  cocky: { chatBp: 9500, answerMs: [500, 1800], reactMs: [400, 1500], gapMs: 8000, perMinute: 3, perMatch: 9, acceptFasterBp: 8500, acceptSlowerBp: 2500, ignoreBp: 1000, fasterBp: 3200, slowerBp: 300, replyBp: 3500 },
};

type Intent =
  | 'greet'
  | 'praise'
  | 'ouch'
  | 'gloat'
  | 'lowSelf'
  | 'lowFoe'
  | 'comebackSelf'
  | 'comebackFoe'
  | 'evolveSelf'
  | 'bored'
  | 'ggWin'
  | 'ggLoss'
  | 'ggDraw'
  | 'tempoYes'
  | 'tempoNo'
  | 'declined';

/** The chance (bp) that a moment makes it say something, by temperament (before `chatBp`). */
const CHANCE: Readonly<Record<Intent, Readonly<Record<Temperament, number>>>> = {
  greet: { friendly: 7000, sporting: 5500, quiet: 1500, cocky: 4000 },
  praise: { friendly: 3500, sporting: 4000, quiet: 600, cocky: 1000 },
  ouch: { friendly: 2500, sporting: 1500, quiet: 800, cocky: 4500 },
  gloat: { friendly: 1800, sporting: 600, quiet: 400, cocky: 5500 },
  lowSelf: { friendly: 3000, sporting: 2500, quiet: 1000, cocky: 3000 },
  lowFoe: { friendly: 600, sporting: 0, quiet: 0, cocky: 4000 },
  comebackSelf: { friendly: 3000, sporting: 2500, quiet: 800, cocky: 6000 },
  comebackFoe: { friendly: 4000, sporting: 5000, quiet: 1000, cocky: 3000 },
  evolveSelf: { friendly: 1200, sporting: 600, quiet: 0, cocky: 2500 },
  bored: { friendly: 1500, sporting: 800, quiet: 500, cocky: 3500 },
  ggWin: { friendly: 8500, sporting: 9500, quiet: 4500, cocky: 5500 },
  ggLoss: { friendly: 8500, sporting: 9500, quiet: 4500, cocky: 4000 },
  ggDraw: { friendly: 8000, sporting: 9000, quiet: 4000, cocky: 5000 },
  tempoYes: { friendly: 2500, sporting: 1500, quiet: 300, cocky: 2000 },
  tempoNo: { friendly: 1200, sporting: 800, quiet: 0, cocky: 2500 },
  declined: { friendly: 1500, sporting: 800, quiet: 0, cocky: 2500 },
};

/** A line: `chat:<id>` is quick chat, anything else an emote id (starter face, `quote.*`, `emote.*`). */
type Line = readonly [weight: number, say: string];

/** What it says for each intent, by temperament (weights). Lines it does not own are left out. */
const LINES: Readonly<Record<Intent, Readonly<Record<Temperament, readonly Line[]>>>> = {
  greet: {
    friendly: [[4, 'chat:glhf'], [3, 'quote.glhf'], [1, 'thumbsUp'], [1, 'salute'], [1, 'emote.heart']],
    sporting: [[3, 'salute'], [2, 'chat:glhf'], [2, 'quote.glhf']],
    quiet: [[1, 'thumbsUp'], [1, 'chat:glhf']],
    cocky: [[2, 'laugh'], [1, 'chat:glhf'], [2, 'emote.cool_shades']],
  },
  praise: {
    friendly: [[3, 'chat:nice'], [3, 'chat:wow'], [2, 'quote.nice_move'], [1, 'thumbsUp'], [2, 'emote.wow'], [1, 'emote.clap']],
    sporting: [[2, 'chat:wp'], [2, 'salute'], [2, 'quote.well_played'], [2, 'emote.clap'], [1, 'quote.nice_move']],
    quiet: [[1, 'chat:wow'], [1, 'cry']],
    cocky: [[1, 'chat:wow'], [1, 'quote.did_not_see']],
  },
  ouch: {
    friendly: [[3, 'cry'], [2, 'chat:oops'], [1, 'quote.so_close'], [2, 'emote.oops']],
    sporting: [[1, 'cry'], [2, 'quote.so_close']],
    quiet: [[1, 'cry']],
    cocky: [[4, 'angry'], [1, 'chat:oops']],
  },
  gloat: {
    friendly: [[2, 'thumbsUp'], [1, 'laugh'], [1, 'quote.one_more_wave']],
    sporting: [[1, 'thumbsUp']],
    quiet: [[1, 'laugh']],
    cocky: [[4, 'laugh'], [2, 'emote.cool_shades'], [1, 'quote.plot_twist']],
  },
  lowSelf: {
    friendly: [[2, 'chat:oops'], [2, 'cry'], [1, 'quote.so_close']],
    sporting: [[2, 'quote.so_close'], [1, 'quote.hold_the_line'], [1, 'salute']],
    quiet: [[1, 'cry']],
    cocky: [[2, 'angry'], [1, 'quote.hold_the_line']],
  },
  lowFoe: {
    friendly: [[1, 'thumbsUp']],
    sporting: [],
    quiet: [],
    cocky: [[3, 'laugh'], [1, 'emote.cool_shades'], [1, 'emote.sleepy']],
  },
  comebackSelf: {
    friendly: [[2, 'thumbsUp'], [1, 'quote.plot_twist']],
    sporting: [[1, 'quote.plot_twist'], [1, 'thumbsUp']],
    quiet: [[1, 'thumbsUp']],
    cocky: [[3, 'laugh'], [2, 'quote.plot_twist'], [2, 'quote.comeback']],
  },
  comebackFoe: {
    friendly: [[3, 'chat:wow'], [2, 'emote.wow'], [2, 'quote.did_not_see']],
    sporting: [[3, 'salute'], [2, 'chat:wp'], [2, 'emote.clap']],
    quiet: [[1, 'chat:wow']],
    cocky: [[2, 'angry'], [1, 'chat:wow'], [1, 'quote.did_not_see']],
  },
  evolveSelf: {
    friendly: [[2, 'quote.next_age'], [1, 'thumbsUp'], [1, 'quote.time_flies']],
    sporting: [[1, 'thumbsUp']],
    quiet: [],
    cocky: [[1, 'laugh'], [1, 'quote.next_age'], [1, 'emote.cool_shades']],
  },
  bored: {
    friendly: [[2, 'emote.thinking'], [1, 'quote.thinking']],
    sporting: [[1, 'quote.thinking']],
    quiet: [[1, 'emote.sleepy']],
    cocky: [[3, 'emote.sleepy'], [1, 'quote.thinking']],
  },
  ggWin: {
    friendly: [[4, 'chat:gg'], [3, 'gg'], [2, 'quote.gg_wp'], [1, 'emote.heart']],
    sporting: [[3, 'chat:wp'], [2, 'quote.well_played'], [2, 'gg'], [2, 'salute'], [1, 'quote.respect']],
    quiet: [[2, 'chat:gg'], [1, 'gg']],
    cocky: [[3, 'laugh'], [2, 'gg'], [1, 'emote.party'], [1, 'chat:gg']],
  },
  ggLoss: {
    friendly: [[3, 'chat:gg'], [3, 'chat:wp'], [2, 'gg'], [1, 'emote.clap']],
    sporting: [[4, 'chat:wp'], [2, 'quote.well_played'], [2, 'salute'], [1, 'quote.respect']],
    quiet: [[1, 'gg'], [1, 'chat:gg']],
    cocky: [[2, 'gg'], [1, 'angry'], [1, 'quote.rematch']],
  },
  ggDraw: {
    friendly: [[2, 'chat:gg'], [2, 'gg'], [1, 'quote.so_close']],
    sporting: [[2, 'chat:gg'], [2, 'salute'], [1, 'quote.so_close']],
    quiet: [[1, 'gg']],
    cocky: [[2, 'gg'], [1, 'chat:gg']],
  },
  tempoYes: {
    friendly: [[2, 'thumbsUp']],
    sporting: [[1, 'thumbsUp']],
    quiet: [[1, 'thumbsUp']],
    cocky: [[1, 'laugh'], [1, 'emote.cool_shades']],
  },
  tempoNo: {
    friendly: [[1, 'emote.thinking'], [1, 'quote.thinking']],
    sporting: [[1, 'emote.thinking']],
    quiet: [],
    cocky: [[2, 'laugh']],
  },
  declined: {
    friendly: [[1, 'chat:oops'], [1, 'thumbsUp']],
    sporting: [[1, 'thumbsUp']],
    quiet: [],
    cocky: [[2, 'laugh'], [1, 'emote.sleepy']],
  },
};

/** The four quotes every player starts with (A18.9.4, source `start`). */
const STARTER_QUOTES: readonly EmoteId[] = ['quote.glhf', 'quote.well_played', 'quote.nice_move', 'quote.so_close'];
const STARTER_FACES: readonly EmoteId[] = ['laugh', 'salute', 'cry', 'angry', 'thumbsUp', 'gg'];

/** Collected quotes and emotes a generated player may have equipped: from capsules, or the Trophy Road at `trophies`. */
interface Collectible {
  id: EmoteId;
  trophies?: number;
  /** A rare item (an Epic, a feat): only this often. */
  rareBp?: number;
}

const EXTRA_QUOTES: readonly Collectible[] = [
  { id: 'quote.plot_twist' },
  { id: 'quote.did_not_see' },
  { id: 'quote.oops_mine' },
  { id: 'quote.thinking' },
  { id: 'quote.gg_wp' },
  { id: 'quote.hold_the_line' },
  { id: 'quote.respect' },
  { id: 'quote.rematch' },
  { id: 'quote.next_age', rareBp: 5000 },
  { id: 'quote.one_more_wave', trophies: 900 },
  { id: 'quote.time_flies', trophies: 1500 },
  { id: 'quote.comeback', rareBp: 1500 },
];

const EXTRA_EMOTES: readonly Collectible[] = [
  { id: 'emote.clap', trophies: 250 },
  { id: 'emote.heart' },
  { id: 'emote.wow' },
  { id: 'emote.thinking' },
  { id: 'emote.oops', trophies: 600 },
  { id: 'emote.sleepy', rareBp: 5000 },
  { id: 'emote.cool_shades', rareBp: 4000 },
  { id: 'emote.party', trophies: 2400 },
];

/** What the generated player has in its battle wheel. */
export interface Vocabulary {
  emotes: readonly EmoteId[];
  quotes: readonly EmoteId[];
}

export interface Persona {
  temperament: Temperament;
  traits: Traits;
  /** Its answer times are scaled by this (percent). */
  answerScalePct: number;
  vocabulary: Vocabulary;
}

export interface PersonaOptions {
  /** The found player's trophies (Trophy Road items it can own). */
  trophies?: number;
  /** The emote ids the content knows (`quote.*`, `emote.*`); items outside it are never used. */
  known?: ReadonlySet<string>;
}

function pickDistinct(rng: Sfc32State, items: readonly Collectible[], n: number): EmoteId[] {
  const pool = [...items];
  const out: EmoteId[] = [];
  while (out.length < n && pool.length > 0) {
    const i = randRange(rng, 0, pool.length - 1);
    const it = pool.splice(i, 1)[0]!;
    if (it.rareBp !== undefined && !chanceBp(rng, it.rareBp)) continue;
    out.push(it.id);
  }
  return out;
}

/** The persona of the player found for the match with this seed (deterministic). */
export function personaFor(seed: number, o: PersonaOptions = {}): Persona {
  const rng = seedSfc32(`persona:${seed}`);
  const temperament = TEMPERAMENTS[pickWeighted(rng, TEMPERAMENT_WEIGHTS)]!;
  const base = TRAITS[temperament];
  const traits: Traits = { ...base, chatBp: Math.round((base.chatBp * randRange(rng, 80, 120)) / 100) };
  const answerScalePct = randRange(rng, 85, 125);
  const trophies = o.trophies ?? 0;
  const owned = (c: Collectible): boolean => (c.trophies === undefined || trophies >= c.trophies) && (!o.known || o.known.has(c.id));
  const extraQuotes = pickDistinct(rng, EXTRA_QUOTES.filter(owned), randRange(rng, 0, 3));
  const quotes = [...extraQuotes, ...STARTER_QUOTES.filter((q) => !o.known || o.known.has(q))].slice(0, 4);
  const extraEmotes = pickDistinct(rng, EXTRA_EMOTES.filter(owned), randRange(rng, 0, trophies >= 400 ? 2 : 1));
  return { temperament, traits, answerScalePct, vocabulary: { emotes: [...STARTER_FACES, ...extraEmotes], quotes } };
}

/** What the persona knows of the match right now. */
export interface PersonaContext {
  speed: TempoSpeed;
  /** A proposal is open (either side's). */
  tempoBusy: boolean;
  /** Base HP by side, bp. */
  hpBp: readonly [number, number];
  /** The match clock (ticks). */
  tick: number;
  ended: boolean;
}

interface Queued {
  at: number;
  msg: LiveMessage;
  kind: 'social' | 'tempo';
  /** A social message not sent by then is dropped (its moment has passed). */
  staleAt: number;
  gg: boolean;
}

/** Dev and test overrides (e2e: force the answer to a proposal). */
export interface PersonaForce {
  answer?: 'accept' | 'decline' | 'ignore';
  /** The answer's delay (ms); default the persona's own. */
  delayMs?: number;
}

const REPLY_GAP_MS = 20_000;
/** GG comes this soon after the end (ms): the Result shows 2.5 s after it. */
const GG_MS: readonly [number, number] = [450, 1700];
const MINUTE_MS = 60_000;
const REACTION_STALE_MS = 4000;
/** From this match tick (25 s) it may think about the tempo. */
const PROPOSE_FROM_TICK = 500;
const MAX_PROPOSALS = 3;

export interface PersonaStats {
  sent: number;
  proposals: number;
}

/** The simulated player's social brain. Feed it what happens; take what it says with `due`. */
export class PersonaBrain {
  readonly persona: Persona;
  /** Dev and tests: overrides for the next proposals' answers. */
  force: PersonaForce | null = null;
  private readonly sayRng: Sfc32State;
  private readonly tempoRng: Sfc32State;
  private readonly thinkRng: Sfc32State;
  private readonly windowMs: number;
  private readonly owned: ReadonlySet<string>;
  private queue: Queued[] = [];
  private readonly sentAt: number[] = [];
  private sent = 0;
  private lastSaidAt = -Infinity;
  private lastReplyAt = -Infinity;
  private greeted = false;
  private greetAt: number | null = null;
  private ggDone = false;
  private bored = false;
  private asks: number[] = [];
  private lastAnswerDeclined = false;
  private ownPending: number | null = null;
  private nextProposalId = 1;
  private proposals = 0;
  private proposeReadyAt = 0;
  private nextThinkAt: number | null = null;
  private declinedByYou = 0;
  private ended = false;

  constructor(persona: Persona, seed: number, o: { windowMs?: number } = {}) {
    this.persona = persona;
    this.sayRng = seedSfc32(`persona:${seed}:say`);
    this.tempoRng = seedSfc32(`persona:${seed}:tempo`);
    this.thinkRng = seedSfc32(`persona:${seed}:think`);
    this.windowMs = o.windowMs ?? PROPOSAL_WINDOW_MS;
    this.owned = new Set<string>([...persona.vocabulary.emotes, ...persona.vocabulary.quotes]);
  }

  get temperament(): Temperament {
    return this.persona.temperament;
  }

  get stats(): PersonaStats {
    return { sent: this.sent, proposals: this.proposals };
  }

  /** A moment of the match it noticed at `now`. */
  see(m: Moment, now: number, ctx: PersonaContext): void {
    switch (m.kind) {
      case 'bigHit': {
        if (m.side === SELF) {
          // your hit on its base: some players praise it, most groan
          const w: Record<Temperament, readonly [number, number]> = { friendly: [5, 5], sporting: [7, 3], quiet: [4, 6], cocky: [15, 85] };
          const [praise, ouch] = w[this.persona.temperament];
          this.react(pickWeighted(this.sayRng, [praise, ouch]) === 0 ? 'praise' : 'ouch', now);
        } else this.react('gloat', now);
        return;
      }
      case 'low':
        this.react(m.side === SELF ? 'lowSelf' : 'lowFoe', now);
        return;
      case 'comeback':
        this.react(m.side === SELF ? 'comebackSelf' : 'comebackFoe', now);
        return;
      case 'evolve':
        if (m.side === SELF) this.react('evolveSelf', now);
        return;
      case 'stalemate':
        this.bored = true;
        this.react('bored', now);
        return;
      case 'end':
        this.ended = true;
        this.ownPending = null;
        if (!this.ggDone) {
          this.ggDone = true;
          // quickly: the Result comes 2.5 s after the end
          this.react(m.side === SELF ? 'ggWin' : m.side === null ? 'ggDraw' : 'ggLoss', now, { gg: true, delay: randRange(this.sayRng, GG_MS[0], GG_MS[1]) });
        }
        void ctx;
        return;
    }
  }

  /** You said something (an emote, quick chat, or a tempo message). */
  hear(msg: LiveMessage, now: number, ctx: PersonaContext): void {
    switch (msg.k) {
      case 'tempoPropose':
        this.onAsk(msg.id, msg.speed, now, ctx);
        return;
      case 'tempoAnswer':
        if (this.ownPending === msg.id) {
          this.ownPending = null;
          if (msg.accept) this.react('tempoYes', now);
          else {
            this.declinedByYou += 1;
            this.react('declined', now);
          }
        }
        return;
      case 'emote':
        this.onYourEmote(msg.emote, now, ctx);
        return;
      case 'chat':
        this.onYourChat(msg.line, now, ctx);
        return;
    }
  }

  /** Every frame: greets once, and now and then thinks about proposing a speed. */
  think(now: number, ctx: PersonaContext): void {
    if (ctx.ended || this.ended) return;
    if (this.greetAt === null && ctx.tick > 0) this.greetAt = now + randRange(this.thinkRng, 1200, 5200);
    if (!this.greeted && this.greetAt !== null && now >= this.greetAt) {
      this.greeted = true;
      this.react('greet', now, { delay: 0 });
    }
    if (this.nextThinkAt === null) {
      if (ctx.tick < PROPOSE_FROM_TICK) return;
      this.nextThinkAt = now + randRange(this.thinkRng, 2000, 14_000);
    }
    if (now < this.nextThinkAt) return;
    this.nextThinkAt = now + randRange(this.thinkRng, 18_000, 32_000);
    if (ctx.tempoBusy || now < this.proposeReadyAt || this.proposals >= MAX_PROPOSALS) return;
    const t = this.persona.traits;
    const lead = ctx.hpBp[SELF] - ctx.hpBp[FOE];
    if (ctx.speed > 1) {
      const trouble = ctx.hpBp[SELF] <= 4000 && lead <= -1000;
      if (chanceBp(this.thinkRng, trouble ? t.slowerBp * 2 : Math.floor(t.slowerBp / 4))) {
        this.propose(1, now);
        return;
      }
    }
    if (ctx.speed < 2) {
      let bp = t.fasterBp;
      if (this.bored) bp = Math.floor((bp * 18) / 10);
      if (lead >= 2000) bp = Math.floor((bp * 13) / 10);
      for (let i = 0; i < this.declinedByYou; i += 1) bp = Math.floor(bp / 2);
      if (chanceBp(this.thinkRng, bp)) this.propose(ctx.speed === 1 ? 1.5 : 2, now);
    }
  }

  /** Dev and tests: proposes `speed` now (when nothing is open). */
  forcePropose(speed: TempoSpeed, now: number): void {
    this.propose(speed, now);
  }

  /** Dev and tests: says something now, past every limit. */
  forceSay(msg: Extract<LiveMessage, { k: 'emote' | 'chat' }>, now: number): void {
    this.queue.push({ at: now, msg, kind: 'social', staleAt: now + REACTION_STALE_MS, gg: true });
  }

  /** What it says now, in order (tempo answers and proposals are never held back by the chat limits). */
  due(now: number): LiveMessage[] {
    if (this.queue.length === 0) return [];
    const out: LiveMessage[] = [];
    const keep: Queued[] = [];
    for (const q of [...this.queue].sort((a, b) => a.at - b.at)) {
      if (q.at > now) {
        keep.push(q);
        continue;
      }
      if (q.kind === 'tempo') {
        out.push(q.msg);
        continue;
      }
      if (now > q.staleAt) continue;
      if (!this.allowed(now, q.gg)) {
        keep.push(q);
        continue;
      }
      out.push(q.msg);
      this.sent += 1;
      this.lastSaidAt = now;
      this.sentAt.push(now);
    }
    this.queue = keep;
    while (this.sentAt.length > 0 && this.sentAt[0]! <= now - MINUTE_MS) this.sentAt.shift();
    return out;
  }

  private allowed(now: number, gg: boolean): boolean {
    const t = this.persona.traits;
    if (gg) return now - this.lastSaidAt >= 1200;
    if (this.sent >= t.perMatch) return false;
    if (now - this.lastSaidAt < t.gapMs) return false;
    return this.sentAt.filter((x) => x > now - MINUTE_MS).length < t.perMinute;
  }

  private propose(speed: TempoSpeed, now: number): void {
    if (this.ended || this.ownPending !== null) return;
    const id = this.nextProposalId++;
    this.ownPending = id;
    this.proposals += 1;
    this.bored = false;
    this.proposeReadyAt = now + randRange(this.thinkRng, 50_000, 90_000);
    this.queue.push({ at: now, msg: { k: 'tempoPropose', id, speed }, kind: 'tempo', staleAt: Infinity, gg: false });
  }

  private onAsk(id: number, speed: TempoSpeed, now: number, ctx: PersonaContext): void {
    const t = this.persona.traits;
    const faster = speed > ctx.speed;
    const recent = this.asks.filter((x) => now - x < MINUTE_MS).length;
    this.asks = [...this.asks.filter((x) => now - x < MINUTE_MS), now];
    const f = this.force;
    // nagging makes it less patient: more ignored, fewer yes
    const ignore = f?.answer ? f.answer === 'ignore' : chanceBp(this.tempoRng, Math.min(9000, Math.floor((t.ignoreBp * (2 + recent)) / 2)));
    if (ignore) return;
    let p = faster ? t.acceptFasterBp : t.acceptSlowerBp;
    if (recent > 0 && this.lastAnswerDeclined) p = Math.floor((p * 6) / 10);
    const lead = ctx.hpBp[SELF] - ctx.hpBp[FOE];
    if (faster && lead <= -2500) p = Math.floor((p * 3) / 4);
    if (!faster && lead >= 2500) p = Math.floor((p * 3) / 4);
    const accept = f?.answer ? f.answer === 'accept' : chanceBp(this.tempoRng, p);
    let delay = Math.floor((randRange(this.tempoRng, t.answerMs[0], t.answerMs[1]) * this.persona.answerScalePct) / 100);
    // now and then it is busy fighting and answers late (maybe too late)
    if (chanceBp(this.tempoRng, 1200)) delay += randRange(this.tempoRng, 1500, 4000);
    if (f?.delayMs !== undefined) delay = f.delayMs;
    this.lastAnswerDeclined = !accept;
    this.queue.push({ at: now + delay, msg: { k: 'tempoAnswer', id, accept }, kind: 'tempo', staleAt: Infinity, gg: false });
    // a little follow-up after an answer that arrived in time
    if (delay < this.windowMs - 300) this.react(accept ? 'tempoYes' : 'tempoNo', now + delay, { delay: randRange(this.sayRng, 500, 1400) });
  }

  private onYourEmote(e: EmoteId, now: number, ctx: PersonaContext): void {
    if (!this.canReply(now)) return;
    const temper = this.persona.temperament;
    let lines: readonly Line[];
    switch (e) {
      case 'laugh':
        lines = temper === 'cocky' ? [[3, 'laugh']] : temper === 'sporting' ? [[1, 'thumbsUp']] : [[2, 'laugh'], [1, 'thumbsUp']];
        break;
      case 'thumbsUp':
      case 'salute':
        lines = [[2, e], [1, e === 'salute' ? 'thumbsUp' : 'salute']];
        break;
      case 'cry':
      case 'angry':
        lines = temper === 'cocky' ? [[2, 'laugh']] : [[1, 'thumbsUp'], [1, 'salute']];
        break;
      case 'gg':
        lines = [[2, 'gg'], [1, 'chat:gg']];
        break;
      default:
        lines = temper === 'cocky' ? [[1, 'laugh']] : [[1, 'thumbsUp'], [1, 'chat:nice']];
    }
    // an early friendly face doubles as the greeting
    if (!this.greeted && ctx.tick < 400 && (e === 'salute' || e === 'thumbsUp')) this.greeted = true;
    this.reply(lines, now);
  }

  private onYourChat(line: QuickChatId, now: number, ctx: PersonaContext): void {
    const temper = this.persona.temperament;
    if (line === 'gg' && this.ended && !this.ggDone) {
      this.ggDone = true;
      this.react(ctx.hpBp[SELF] >= ctx.hpBp[FOE] ? 'ggWin' : 'ggLoss', now, { gg: true });
      return;
    }
    if (!this.canReply(now)) return;
    switch (line) {
      case 'glhf': {
        const greeted = this.greeted;
        this.greeted = true;
        const lines: readonly Line[] = greeted ? [[2, 'chat:thanks'], [1, 'thumbsUp']] : temper === 'cocky' ? [[1, 'laugh'], [1, 'chat:glhf']] : [[3, 'chat:glhf'], [1, 'thumbsUp'], [1, 'salute']];
        this.reply(lines, now);
        return;
      }
      case 'nice':
      case 'wow':
      case 'wp':
        this.reply(temper === 'cocky' ? [[2, 'laugh'], [1, 'chat:thanks'], [1, 'emote.cool_shades']] : [[3, 'chat:thanks'], [2, 'thumbsUp'], [1, 'salute']], now);
        return;
      case 'oops':
        this.reply(temper === 'cocky' ? [[2, 'laugh']] : [[1, 'thumbsUp']], now);
        return;
      case 'thanks':
        this.reply([[1, 'thumbsUp']], now, 4000);
        return;
      case 'gg':
        this.reply(temper === 'cocky' ? [[1, 'laugh']] : [[1, 'gg'], [1, 'chat:gg']], now);
        return;
    }
  }

  private canReply(now: number): boolean {
    return !this.ended && now - this.lastReplyAt >= REPLY_GAP_MS;
  }

  private reply(lines: readonly Line[], now: number, bp = this.persona.traits.replyBp): void {
    if (!chanceBp(this.sayRng, bp)) return;
    const say = this.choose(lines);
    if (!say) return;
    this.lastReplyAt = now;
    const t = this.persona.traits;
    this.enqueue(say, now + randRange(this.sayRng, t.reactMs[0], t.reactMs[1]), false);
  }

  private react(intent: Intent, now: number, o: { gg?: boolean; delay?: number } = {}): void {
    const temper = this.persona.temperament;
    const bp = Math.floor((CHANCE[intent][temper] * this.persona.traits.chatBp) / 10_000);
    if (!chanceBp(this.sayRng, bp)) return;
    const say = this.choose(LINES[intent][temper]);
    if (!say) return;
    const t = this.persona.traits;
    const delay = o.delay ?? randRange(this.sayRng, t.reactMs[0], t.reactMs[1]);
    this.enqueue(say, now + delay, o.gg === true);
  }

  private choose(lines: readonly Line[]): LiveMessage | null {
    const usable = lines.filter(([, s]) => s.startsWith('chat:') || this.owned.has(s));
    if (usable.length === 0) return null;
    const i = pickWeighted(
      this.sayRng,
      usable.map(([w]) => w),
    );
    const say = usable[i]![1];
    return say.startsWith('chat:') ? { k: 'chat', line: say.slice(5) as QuickChatId } : { k: 'emote', emote: say as EmoteId };
  }

  private enqueue(msg: LiveMessage, at: number, gg: boolean): void {
    // one message at a time: a GG replaces whatever is still waiting, anything else waits its turn
    const waiting = this.queue.some((q) => q.kind === 'social');
    if (waiting && !gg) return;
    if (gg) this.queue = this.queue.filter((q) => q.kind !== 'social');
    this.queue.push({ at, msg, kind: 'social', staleAt: at + REACTION_STALE_MS, gg });
  }
}
