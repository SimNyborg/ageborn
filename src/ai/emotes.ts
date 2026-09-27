/**
 * The bot emote rule (DESIGN A7.2 "Emotes"): bots use only GG, Salute and Thumbs up, at most once per
 * match on their own. If the player emotes first, the bot may reply with those three at most once per
 * 20 s. All bot emotes are muteable (the UI's `mutedEmotes` setting hides them).
 *
 * The own emote marks a moment a person would: a Salute when the bot is clearly winning, a GG when its
 * base is about to fall. Replies come after a human delay of 1-2 s and mirror a friendly emote.
 */
import type { EmoteId, Observation } from '@/contracts';
import { TICKS_PER_SECOND, chanceBp, pick, randRange, type Sfc32State } from '@/core';

/** The emotes a bot may use (A7.2). */
export const BOT_EMOTES: readonly EmoteId[] = ['gg', 'salute', 'thumbsUp'];
/** At most one reply per 20 s (A7.2). */
export const REPLY_GAP_TICKS = 20 * TICKS_PER_SECOND;
/** Chance to reply to a player emote, bp. */
const REPLY_BP = 5000;
/** Chance to use the one own emote when its moment comes, bp. */
const OWN_BP = 5000;
const REPLY_DELAY_MIN = TICKS_PER_SECOND;
const REPLY_DELAY_MAX = 2 * TICKS_PER_SECOND;
/** GG when the own base is at or below 10%; Salute when the foe base is at or below 20% and the own is higher. */
const GG_BASE_BP = 1000;
const SALUTE_FOE_BP = 2000;

export class EmotePolicy {
  private ownUsed = false;
  private ownConsidered = { gg: false, salute: false };
  private lastReplyTick = -1000000;
  private reply: { tick: number; emote: EmoteId } | null = null;
  private lastHeardTick = -1;

  constructor(private readonly rng: Sfc32State) {}

  /** The player emoted at `tick` (the session relays emotes the bot's side can see). */
  hear(emote: EmoteId, tick: number): void {
    if (tick <= this.lastHeardTick) return;
    this.lastHeardTick = tick;
    if (this.reply || tick - this.lastReplyTick < REPLY_GAP_TICKS) return;
    if (!chanceBp(this.rng, REPLY_BP)) return;
    const answer: EmoteId = BOT_EMOTES.includes(emote) ? emote : pick(this.rng, ['salute', 'thumbsUp'] as const);
    this.reply = { tick: tick + randRange(this.rng, REPLY_DELAY_MIN, REPLY_DELAY_MAX), emote: answer };
  }

  /**
   * The emote to send now, if any. `canEmote` says whether the emote cooldown and the action cap allow
   * one; a due reply or own emote waits until they do.
   */
  next(obs: Observation, now: number, canEmote: boolean): EmoteId | null {
    const r = this.reply;
    if (r && now >= r.tick) {
      if (!canEmote) return null;
      this.reply = null;
      this.lastReplyTick = now;
      return r.emote;
    }
    if (this.ownUsed) return null;
    let moment: 'gg' | 'salute' | null = null;
    if (!this.ownConsidered.gg && obs.me.baseHpBp <= GG_BASE_BP) moment = 'gg';
    else if (!this.ownConsidered.salute && obs.foe.baseHpBp <= SALUTE_FOE_BP && obs.me.baseHpBp > obs.foe.baseHpBp) moment = 'salute';
    if (!moment || !canEmote) return null;
    this.ownConsidered[moment] = true;
    if (!chanceBp(this.rng, OWN_BP)) return null;
    this.ownUsed = true;
    return moment;
  }
}
