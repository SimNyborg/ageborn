/**
 * The simulated online player's end of a live match (queue item 34): an `OpponentLink` whose messages come
 * from a persona (`persona.ts`) watching the match through `moments.ts`. The AI General plays the match in
 * the sim as before; this only talks: emotes, quick chat, speed proposals and answers.
 *
 * It runs on the live match's clock (`update` every frame, `observe` every sim tick), so it says nothing
 * while the page is hidden, stays quiet while the battle catches up (a person who looked away would have
 * nothing to react to either), and still says GG when the match ends during a catch-up.
 */
import { MomentDetector } from './moments';
import { PersonaBrain, type Persona, type PersonaContext, type PersonaForce } from './persona';
import type { LinkContext, LiveMessage, MatchGlance, OpponentLink, TempoSpeed } from './protocol';

export class SimulatedOpponent implements OpponentLink {
  readonly brain: PersonaBrain;
  private readonly detector = new MomentDetector();
  private readonly listeners = new Set<(m: LiveMessage) => void>();
  private ctx: PersonaContext = { speed: 1, tempoBusy: false, hpBp: [10_000, 10_000], tick: 0, ended: false };
  private disposed = false;

  constructor(persona: Persona, seed: number, o: { windowMs?: number } = {}) {
    this.brain = new PersonaBrain(persona, seed, o);
  }

  send(msg: LiveMessage, nowMs: number): void {
    if (this.disposed) return;
    this.brain.hear(msg, nowMs, this.ctx);
  }

  onMessage(cb: (msg: LiveMessage) => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  observe(glance: MatchGlance, nowMs: number, catchingUp: boolean): void {
    if (this.disposed) return;
    this.ctx = { ...this.ctx, hpBp: glance.hpBp, tick: glance.tick, ended: glance.winner !== undefined };
    for (const m of this.detector.push(glance)) {
      if (catchingUp && m.kind !== 'end') continue;
      this.brain.see(m, nowMs, this.ctx);
    }
  }

  update(nowMs: number, link: LinkContext): void {
    if (this.disposed) return;
    this.ctx = { ...this.ctx, speed: link.speed, tempoBusy: link.tempoBusy };
    this.brain.think(nowMs, this.ctx);
    for (const msg of this.brain.due(nowMs)) for (const cb of [...this.listeners]) cb(msg);
  }

  /** Dev and e2e: how it answers your next proposals. */
  forceAnswers(f: PersonaForce | null): void {
    this.brain.force = f;
  }

  /** Dev and e2e: whether it proposes a speed on its own (forced proposals still go). */
  setOwnProposals(on: boolean): void {
    this.brain.ownProposals = on;
  }

  /** Dev and e2e: it proposes `speed` now. */
  forcePropose(speed: TempoSpeed, nowMs: number): void {
    this.brain.forcePropose(speed, nowMs);
  }

  /** Dev and e2e: it says this now. */
  forceSay(msg: Extract<LiveMessage, { k: 'emote' | 'chat' }>, nowMs: number): void {
    this.brain.forceSay(msg, nowMs);
  }

  dispose(): void {
    this.disposed = true;
    this.listeners.clear();
  }
}
