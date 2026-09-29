/**
 * The scripted brain of Old Grogg, the tutorial trainer (DESIGN A7.4, A8, B10): "Sends Training
 * Dummies, never evolves". The script is data: `tutorial/scripts.ts` (WP11) passes it as
 * `BotProfile.openings`; without one the default below runs. Grogg issues ordinary commands through
 * the same API as every bot, sees only the delayed observation, and never evolves.
 *
 * Script lines (times in ms from the match start):
 *
 * | Line | Meaning |
 * |---|---|
 * | `at <ms> <action>` | once, at that time |
 * | `every <ms> [from <ms>] [until <ms>] <action>` | repeatedly |
 * | `max-alive <n> <card>` | a due send of that card is dropped while n of Grogg's units are alive |
 *
 * Actions: `train <card>`, `turret <card>`, `power`, `emote <id>`. A due action waits until it is
 * legal and affordable (at most one pending occurrence per line), so Grogg never issues an illegal
 * command. Unknown lines are ignored.
 *
 * The A7 bot rules hold for scripts too: due actions wait while the tier's action cap (A7.3, B10) is
 * full, and a scripted emote must be GG, Salute or Thumbs up and spends the bot's one own emote of the
 * match (A7.2), so later emote lines are dropped.
 */
import type { BotProfile, CardId, Command, CompiledContent, EmoteId, Observation, Side } from '@/contracts';
import { msToTicks } from '@/core';
import { toCommand, type BotAction } from './actions';
import { cardBook, type CardBook } from './book';
import { botSeed, type AiBotController } from './controller';
import type { DecisionTrace } from './brain';
import { BOT_EMOTES, EmotePolicy } from './emotes';
import { Ledger } from './ledger';
import { BotMemory } from './memory';
import { personalityFor, type Personality } from './personalities';
import { tierParams, type TierParams } from './tiers';
import { powerOption, type PowerContext } from './scoring';
import { buildView, type View } from './view';

export type ScriptAction = { kind: 'train'; card: CardId } | { kind: 'turret'; card: CardId } | { kind: 'power' } | { kind: 'emote'; emote: EmoteId };

export interface ScriptLine {
  /** First time the line fires, ticks. */
  from: number;
  /** Repeat period in ticks, or null for a one-shot line. */
  every: number | null;
  /** Last tick an occurrence may start (inclusive), or null. */
  until: number | null;
  action: ScriptAction;
}

/**
 * Old Grogg's default tutorial script (A8), kept in line with the retimed match 1 schedule of
 * `src/tutorial/scripts.ts` (WP11, `GROGG_SCRIPT`): Dummies at 0:02 and 0:12, the Tuskback at 0:19,
 * then a Dummy every 8 s, skipped while 3 of his units are alive. The app plays match 1 with WP11's
 * own `GroggBrain`; this script makes `createBot` give the same Grogg anywhere else (tools, dev pages).
 */
export const GROGG_SCRIPT: readonly string[] = [
  'max-alive 3 training_dummy',
  'at 2000 train training_dummy',
  'at 12000 train training_dummy',
  'at 19000 train tuskback',
  'every 8000 from 28000 until 600000 train training_dummy',
];

function parseAction(words: string[]): ScriptAction | null {
  const [verb, arg] = words;
  if (verb === 'train' && arg) return { kind: 'train', card: arg };
  if (verb === 'turret' && arg) return { kind: 'turret', card: arg };
  if (verb === 'power') return { kind: 'power' };
  // Bots use only GG, Salute and Thumbs up (A7.2); other emote lines are ignored.
  if (verb === 'emote' && arg && (BOT_EMOTES as readonly string[]).includes(arg)) return { kind: 'emote', emote: arg as EmoteId };
  return null;
}

function ms(word: string | undefined): number | null {
  if (word === undefined || !/^\d+$/.test(word)) return null;
  return msToTicks(Number(word));
}

export interface Script {
  lines: ScriptLine[];
  /** Sends of a card are dropped while this many of Grogg's units are alive. */
  maxAlive: Record<CardId, number>;
}

/** Parses script lines. Unknown or malformed lines are skipped. */
export function parseScript(lines: readonly string[]): ScriptLine[] {
  return parseScriptFull(lines).lines;
}

/** Parses script lines and rules. */
export function parseScriptFull(lines: readonly string[]): Script {
  const out: ScriptLine[] = [];
  const maxAlive: Record<CardId, number> = {};
  for (const line of lines) {
    const w = line.trim().split(/\s+/);
    if (w[0] === 'max-alive') {
      const n = Number(w[1]);
      if (Number.isInteger(n) && n > 0 && w[2]) maxAlive[w[2]] = n;
    } else if (w[0] === 'at') {
      const at = ms(w[1]);
      const action = parseAction(w.slice(2));
      if (at !== null && action) out.push({ from: at, every: null, until: null, action });
    } else if (w[0] === 'every') {
      const every = ms(w[1]);
      let i = 2;
      let from = 0;
      let until: number | null = null;
      if (w[i] === 'from') {
        from = ms(w[i + 1]) ?? 0;
        i += 2;
      }
      if (w[i] === 'until') {
        until = ms(w[i + 1]);
        i += 2;
      }
      const action = parseAction(w.slice(i));
      if (every !== null && action) out.push({ from, every, until, action });
    }
  }
  return { lines: out, maxAlive };
}

interface LineState {
  line: ScriptLine;
  /** Next occurrence tick, or null when finished. */
  next: number | null;
  /** An occurrence is due and waiting to become legal. */
  due: boolean;
}

export class ScriptedController implements AiBotController {
  readonly snapshotDelayTicks: number;
  readonly tier: TierParams;
  readonly personality: Personality;
  readonly traces: DecisionTrace[] = [];
  private readonly book: CardBook;
  private readonly memory: BotMemory;
  private readonly ledger: Ledger;
  private readonly emotes: EmotePolicy;
  private readonly lines: LineState[];
  private readonly maxAlive: Record<CardId, number>;

  constructor(
    readonly profile: BotProfile,
    readonly side: Side,
    seed: number,
    content: CompiledContent,
  ) {
    this.book = cardBook(content);
    this.tier = tierParams(profile.tier);
    this.personality = personalityFor(content, profile.generalId);
    this.snapshotDelayTicks = this.tier.snapshotDelayTicks;
    this.memory = new BotMemory(this.book);
    this.ledger = new Ledger(this.book);
    this.emotes = new EmotePolicy(botSeed(seed, side, 'emote'));
    const script = parseScriptFull(profile.openings.length > 0 ? profile.openings : GROGG_SCRIPT);
    this.lines = script.lines.map((line) => ({ line, next: line.from, due: false }));
    this.maxAlive = script.maxAlive;
  }

  get foeGoldEstimate(): number {
    return this.memory.estimator.gold;
  }

  hearEmote(emote: EmoteId, tick: number): void {
    this.emotes.hear(emote, tick);
  }

  onTick(obs: Observation): Command[] {
    if (obs.side !== this.side || obs.phase === 'ended') return [];
    this.memory.observe(obs);
    this.ledger.sync(obs);
    const now = obs.tick + this.snapshotDelayTicks;
    const out: Command[] = [];
    let view: View | null = null;
    for (const s of this.lines) {
      if (s.next !== null && now >= s.next) {
        s.due = true;
        const every = s.line.every;
        s.next = every === null ? null : s.next + every;
        if (s.next !== null && s.line.until !== null && s.next > s.line.until) s.next = null;
      }
      if (!s.due) continue;
      if (s.line.action.kind === 'emote' && !this.emotes.ownAvailable) {
        // The one own emote of the match is spent (A7.2).
        s.due = false;
        continue;
      }
      view ??= buildView(obs, now, this.book, this.ledger);
      const alive = s.line.action.kind === 'train' ? this.maxAlive[s.line.action.card] : undefined;
      if (alive !== undefined && view.mine.length + view.queue.length >= alive) {
        // A dropped send: the lane already holds enough of Grogg's units (an idle player is not swamped).
        s.due = false;
        continue;
      }
      // The action cap (A7.3): a due action waits for room in the 10 s window.
      if (!this.canAct(now)) continue;
      const a = this.resolve(s.line.action, view, now);
      if (!a) continue;
      s.due = false;
      if (a.kind === 'emote') this.emotes.useOwn();
      this.ledger.record(a, now, now + 1);
      out.push(toCommand(a, this.side));
      view = null;
    }
    const canEmote = this.canAct(now) && now >= this.ledger.lastEmoteTick + this.book.econ.emoteCooldownTicks + 1;
    const emote = this.emotes.next(obs, now, canEmote);
    if (emote) {
      this.ledger.record({ kind: 'emote', emote }, now, now + 1);
      out.push({ t: 'emote', side: this.side, emote });
    }
    return out;
  }

  /** The action cap (A7.3 "Max actions / 10 s") has room for one more command. */
  private canAct(now: number): boolean {
    return this.ledger.actionsInWindow(now) < this.tier.maxActionsPer10s;
  }

  /** The legal action for a script action right now, or null to keep waiting. */
  private resolve(sa: ScriptAction, v: View, now: number): BotAction | null {
    const e = this.book.econ;
    switch (sa.kind) {
      case 'train': {
        const slot = v.tray.find((s) => s.card.id === sa.card);
        if (!slot || v.ageUncertain) return null;
        if (v.gold < slot.card.cost || v.queue.length >= e.queueMax) return null;
        if (slot.card.legendary && v.legendaryInField) return null;
        return { kind: 'train', slot: slot.slot, card: slot.card.id, cost: slot.card.cost };
      }
      case 'turret': {
        const slot = v.turretCards.indexOf(sa.card);
        const def = this.book.turrets[sa.card];
        const mount = v.turrets.findIndex((x, m) => m < v.mountsOwned && x === null && !v.mountBusy[m]);
        if (slot < 0 || !def || mount < 0 || v.gold < def.cost || v.ageUncertain) return null;
        return { kind: 'build', mount, slot, card: sa.card, cost: def.cost };
      }
      case 'power': {
        // Scripted casts auto-aim the first ready slot (Home first) that has something to act on, so an
        // auto-aim never meets `powerNoTarget` or `powerOutOfReach` (A2.9.4); its price is booked so no
        // gold is spent twice.
        if (!v.powerReady) return null;
        const ctx: PowerContext = {
          reach: e.powerReach,
          turretCover: e.turretCover,
          legendaryPowerDamageBp: e.legendaryPowerDamageBp,
          strikeEpicBp: e.strikeEpicBp,
          strikeK: 1,
          rng: null,
        };
        for (const sv of v.powerSlots) {
          if (!sv.reloaded || !sv.affordable) continue;
          if (powerOption(v, sv.slot, sv.info, ctx).value <= 0) continue;
          return { kind: 'power', p: null, slot: sv.slot, cost: sv.cost };
        }
        return null;
      }
      case 'emote':
        return now >= this.ledger.lastEmoteTick + e.emoteCooldownTicks + 1 ? { kind: 'emote', emote: sa.emote } : null;
    }
  }
}
