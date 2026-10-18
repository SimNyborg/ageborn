/**
 * The live match layer (owner request 2026-10-13, queue item 34): everything an online match adds on top
 * of the battle session, for the HUD (`LiveHud`, `src/ui/hud/live.ts`).
 *
 * - **The flag.** A match is live when the opponent is an online player (`SideConfig.online`): today the
 *   simulated player Ranked finds, later a real one (real online sets the same field, so one flag covers
 *   both). The session then never pauses, ignores the player's speed button and catches up missed time
 *   (`session.ts`); War Path, Conquest, Daily, Skirmish and training stay offline and keep pause and tempo.
 * - **Tempo** is a proposal (`tempo.ts`): `propose` and `answer` from the HUD, the opponent's proposals and
 *   answers through the link; an agreed speed goes to `session.setAgreedSpeed`.
 * - **Talk.** Both players' emotes and quick chat travel through the link and come back to the HUD
 *   through `onSay` (the opponent's are dropped while muted). The AI General's own sim emotes stay out of a
 *   live match (`withoutEmotes`): the opponent's person speaks for it.
 * - **The opponent.** An `OpponentLink`: by default the simulated player of this match
 *   (`SimulatedOpponent` over `personaFor(seed)`), driven by the session's frames and ticks, so it keeps
 *   pace with the match, pauses with the page and stays quiet during a catch-up.
 *
 * Dev hooks (`dev`, reached through `window.__agebornDev` with `?dev=1`): force the opponent's answers,
 * make it propose or say something, and simulate an absence (e2e and captures).
 */
import { computed, signal, type ReadonlySignal, type Signal } from '@preact/signals';
import type { BotController, CompiledContent, EmoteId, MatchConfig, Side } from '@/contracts';
import type { LiveCatchUp, LiveHud, LiveRefusal, LiveSay, LiveSpeed, LiveTempo } from '@/ui/hud/live';
import type { BattleSessionImpl } from '../session';
import { personaFor, type Persona, type PersonaForce } from './persona';
import { CHAT_GAP_MS, glanceOf, isQuickChat, QUICK_CHAT, SAY_GAP_MS, type LiveMessage, type OpponentLink, type TempoSpeed } from './protocol';
import { SimulatedOpponent } from './simOpponent';
import { initialTempo, tempoStep, type TempoEffect, type TempoInput, type TempoState } from './tempo';

/**
 * A match is live (online) when the opponent is shown as an online player: the simulated player of Ranked
 * now, a real player when real online ships. Live matches have no pause and no tempo of their own.
 */
export function isLiveMatch(config: Readonly<Pick<MatchConfig, 'sides'>>, mySide: Side = 0): boolean {
  return !!config.sides[mySide === 0 ? 1 : 0]?.online;
}

/** A bot whose own emotes stay out of the match (in a live match the opponent's person speaks instead). */
export function withoutEmotes(inner: BotController): BotController {
  return {
    get snapshotDelayTicks() {
      return inner.snapshotDelayTicks;
    },
    onTick: (obs) => inner.onTick(obs).filter((c) => c.t !== 'emote'),
  };
}

/** The emote ids the content lists (`quote.*`, `emote.*`), as the sim reads them (A18.9.4). */
export function contentEmoteIds(content: CompiledContent): Set<string> {
  const out = new Set<string>();
  const items = (content.cosmetics as { collections?: { items?: unknown } } | null | undefined)?.collections?.items;
  if (Array.isArray(items)) {
    for (const x of items as { id?: unknown; collection?: unknown }[]) {
      if (typeof x.id === 'string' && (x.collection === 'emote' || x.collection === 'quote')) out.add(`${x.collection}.${x.id}`);
    }
  }
  return out;
}

export interface LiveMatchOptions {
  session: BattleSessionImpl;
  config: Readonly<MatchConfig>;
  /** The opponent's end; default the simulated player of this match's seed. */
  link?: OpponentLink;
  /** The opponent's emotes and chat start muted (Settings › Mute opponents, the default for every match). */
  muted?: boolean;
}

export class LiveMatch implements LiveHud {
  readonly tempo: ReadonlySignal<LiveTempo>;
  readonly muted: ReadonlySignal<boolean>;
  readonly catchUp: ReadonlySignal<LiveCatchUp | null>;
  readonly away: ReadonlySignal<boolean>;
  readonly quickChat: readonly string[] = QUICK_CHAT;
  readonly foeName: string;
  readonly link: OpponentLink;
  /** The simulated opponent, or null over a real link. */
  readonly simulated: SimulatedOpponent | null;
  private readonly session: BattleSessionImpl;
  private state: TempoState;
  private readonly tempoSig: Signal<LiveTempo>;
  private readonly mutedSig: Signal<boolean>;
  private readonly sayListeners = new Set<(s: LiveSay) => void>();
  private readonly offs: (() => void)[] = [];
  private lastSayAt = -Infinity;
  private lastChatAt = -Infinity;
  private disposed = false;

  constructor(o: LiveMatchOptions) {
    const s = o.session;
    this.session = s;
    const foe = o.config.sides[1];
    this.foeName = foe.online?.name ?? foe.label;
    this.state = initialTempo(s.currentSpeed);
    this.tempoSig = signal(this.view());
    this.tempo = this.tempoSig;
    this.mutedSig = signal(o.muted === true);
    this.muted = this.mutedSig;
    this.catchUp = computed(() => {
      const c = s.catchUp.value;
      return c ? { behindMs: c.behindMs, doneBp: c.doneBp } : null;
    });
    this.away = s.awayForfeit;
    if (o.link) {
      this.link = o.link;
      this.simulated = null;
    } else {
      const persona = personaFor(o.config.seed, { trophies: foe.online?.trophies ?? 0, known: contentEmoteIds(o.config.content) });
      const simulated = new SimulatedOpponent(persona, o.config.seed);
      this.link = simulated;
      this.simulated = simulated;
    }
    this.offs.push(this.link.onMessage((m) => this.receive(m)));
    this.offs.push(s.onFrame((now) => this.frame(now)));
    this.offs.push(s.onTick((_events, sim) => this.link.observe?.(glanceOf(sim.state), s.now(), s.catchingUp)));
    s.onEnd(() => {
      if (!this.disposed) this.step({ k: 'end', now: s.now() });
    });
  }

  /** The persona of the simulated opponent (dev and tests), or null over a real link. */
  get persona(): Persona | null {
    return this.simulated?.brain.persona ?? null;
  }

  now(): number {
    return this.session.now();
  }

  propose(speed: LiveSpeed): LiveRefusal | null {
    // while the battle catches up the opponent's side waits too: a proposal now would run out unseen (review O nit 2)
    if (this.session.catchingUp) return 'busy';
    const fx = this.step({ k: 'propose', speed, now: this.now() });
    for (const f of fx) if (f.k === 'refused') return f.why;
    return null;
  }

  answer(accept: boolean): void {
    this.step({ k: 'answer', accept, now: this.now() });
  }

  sendEmote(e: EmoteId): void {
    const now = this.now();
    if (!this.canSay(now)) return;
    this.lastSayAt = now;
    this.link.send({ k: 'emote', emote: e }, now);
    this.emit({ side: 0, emote: e });
  }

  sendChat(id: string): void {
    const now = this.now();
    if (!isQuickChat(id) || !this.canSay(now) || now - this.lastChatAt < CHAT_GAP_MS) return;
    this.lastSayAt = now;
    this.lastChatAt = now;
    this.link.send({ k: 'chat', line: id }, now);
    this.emit({ side: 0, chat: id });
  }

  setMuted(on: boolean): void {
    this.mutedSig.value = on;
  }

  onSay(cb: (s: LiveSay) => void): () => void {
    this.sayListeners.add(cb);
    return () => this.sayListeners.delete(cb);
  }

  /** Dev and e2e hooks (reached through `window.__agebornDev` with `?dev=1`). */
  readonly dev = {
    /** How the simulated opponent answers your next proposals (null: its own way). */
    answers: (f: PersonaForce | null): void => this.simulated?.forceAnswers(f),
    /** The simulated opponent proposes `speed` now. */
    propose: (speed: TempoSpeed): void => this.simulated?.forcePropose(speed, this.now()),
    /** Whether the simulated opponent proposes a speed on its own (false: only `propose` makes it; e2e). */
    ownProposals: (on: boolean): void => this.simulated?.setOwnProposals(on),
    /** The simulated opponent says this now. */
    say: (msg: Extract<LiveMessage, { k: 'emote' | 'chat' }>): void => this.simulated?.forceSay(msg, this.now()),
    /** As if the page had been hidden for `ms`: the battle catches up (or, past the limit, is left). */
    away: (ms: number): void => this.session.owe(ms),
  };

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const off of this.offs) off();
    this.offs.length = 0;
    this.sayListeners.clear();
    this.link.dispose();
  }

  private canSay(now: number): boolean {
    return !this.disposed && this.session.status.peek() === 'running' && now - this.lastSayAt >= SAY_GAP_MS;
  }

  private frame(now: number): void {
    if (this.disposed) return;
    this.step({ k: 'tick', now });
    // the opponent waits while the battle catches up (nothing pops up over the cue); its timers resume after.
    // A match left by being away too long ends in silence: you were not there for its GG (review O nit 5).
    if (this.session.catchingUp || this.session.awayForfeit.peek()) return;
    this.link.update(now, { speed: this.state.speed, tempoBusy: this.state.pending !== null });
  }

  private receive(msg: LiveMessage): void {
    if (this.disposed) return;
    const now = this.now();
    if (msg.k === 'tempoPropose' || msg.k === 'tempoAnswer') {
      this.step({ k: 'receive', msg, now });
      return;
    }
    if (this.mutedSig.peek()) return;
    if (msg.k === 'emote') this.emit({ side: 1, emote: msg.emote });
    else if (isQuickChat(msg.line)) this.emit({ side: 1, chat: msg.line });
  }

  private step(input: TempoInput): TempoEffect[] {
    const { s, fx } = tempoStep(this.state, input);
    const changed = s !== this.state;
    this.state = s;
    for (const f of fx) {
      if (f.k === 'send') this.link.send(f.msg, input.now);
      else if (f.k === 'apply') this.session.setAgreedSpeed(f.speed);
    }
    if (changed) this.tempoSig.value = this.view();
    return fx;
  }

  private view(): LiveTempo {
    const s = this.state;
    return { speed: s.speed, pending: s.pending, last: s.last, readyAt: s.readyAt, ended: s.ended };
  }

  private emit(s: LiveSay): void {
    for (const cb of [...this.sayListeners]) cb(s);
  }
}
