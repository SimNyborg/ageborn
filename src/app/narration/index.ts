/**
 * The narrator's place in the app (queue item 39): the small, eager part. It decides when a line can be due (a
 * tutorial or early match, the first win, a line a screen shows) and only then loads the director, the narrator
 * and the voice manifest (`./director.ts`, one lazy chunk), so the first load keeps its size and no voice file
 * is fetched before a line is about to play. With Settings › Narrator off nothing loads.
 */
import { effect } from '@preact/signals';
import type { SaveDoc } from '@/contracts';
import { STAGES } from '@/tutorial';
import type { BattleHandle } from '../battle';
import type { ShowRecord } from '../capsules/capsuleFlow';
import type { AppController } from '../controller';
import { documentVisibility } from '../session';
import type { Services } from '../services';
import type { CapsuleVoice, MomentId, NarrationDirector, NarrationLogEntry } from './director';

export type { CapsuleVoice, MomentId, NarrationLogEntry };

export interface Narration {
  /** Reads an on-screen string aloud (an i18n key; placeholder values are i18n keys); returns its stop. */
  voice(key: string, vars?: Readonly<Record<string, string>>): () => void;
  /** Lines in a row, each after the one before ends; one stop ends them. */
  voiceAll(keys: readonly string[]): () => void;
  /** A first-time moment: once per profile, `delayMs` from now while `when` holds, with a subtitle; returns its stop. */
  moment(id: MomentId, delayMs?: number, when?: () => boolean): () => void;
  /** Fetches lines a coming step will say. */
  prefetch(keys: readonly string[]): void;
  /** A capsule show's narration: the runner's states and cues go in; `end` when the show goes. */
  capsule(record: ShowRecord, save: SaveDoc): CapsuleVoice;
  /** The director's event log (dev, e2e), or null before it loaded. */
  log(): readonly NarrationLogEntry[] | null;
  dispose(): void;
}

type DirectorModule = typeof import('./director');

export interface NarrationOptions {
  services: Pick<Services, 'audio' | 'i18n' | 'content'>;
  controller: Pick<AppController, 'save' | 'route' | 'setSave'>;
  /** Loads the director (default the lazy chunk; tests pass the module). */
  load?: () => Promise<DirectorModule>;
}

/** Battles a line can come in: the onboarding matches and the hint matches (A8), never a live one. */
export function mayNarrate(b: Pick<BattleHandle, 'live' | 'setup'>): boolean {
  return b.live === null && (b.setup.script !== null || b.setup.matchNumber <= STAGES.hintsUntilMatch);
}

export function createNarration(o: NarrationOptions): Narration {
  let director: NarrationDirector | null = null;
  let loading: Promise<NarrationDirector | null> | null = null;
  let disposed = false;
  const on = (): boolean => o.controller.save.peek()?.settings.narrator !== false;
  const get = (): Promise<NarrationDirector | null> => {
    if (director) return Promise.resolve(director);
    loading ??= (o.load ?? (() => import('./director')))().then(
      // the page's visibility comes from here (the entry has it), so a hidden page stops the line
      (m) => (disposed ? null : (director = m.createDirector({ services: o.services, controller: o.controller, visibility: typeof document !== 'undefined' ? documentVisibility(document) : null }))),
      (e: unknown) => {
        // offline before the chunk was fetched: the subtitles show as always; a later step tries again
        loading = null;
        console.warn('[narrator] not available', e);
        return null;
      },
    );
    return loading;
  };
  /** Runs `start` once the director is in; the stop works before and after. */
  const later = (start: (d: NarrationDirector) => () => void): (() => void) => {
    if (!on()) return () => undefined;
    let stop: (() => void) | null = null;
    let cancelled = false;
    void get().then((d) => {
      if (d && !cancelled) stop = start(d);
    });
    return () => {
      cancelled = true;
      stop?.();
    };
  };

  let attached: BattleHandle | null = null;
  // The Results already handled, held weakly: a Result holds its finished battle (the session, the sim), which
  // must be let go once the player leaves it.
  const resultsSeen = new WeakSet<object>();
  // The first win's moment belongs to its Result (held weakly too): it starts only while that Result shows,
  // and leaving it (Next, Home) stops the line or cancels it.
  const victoryOn = new WeakSet<object>();
  let stopVictory: (() => void) | null = null;
  const onVictoryResult = (): boolean => {
    const r = o.controller.route.peek();
    return r.id === 'result' && victoryOn.has(r.result);
  };
  const stopRoute = effect(() => {
    const r = o.controller.route.value;
    const battle = r.id === 'battle' ? r.battle : null;
    if (battle !== attached) {
      if (attached) director?.detach(attached);
      attached = battle;
      const b = battle;
      if (b && mayNarrate(b) && on())
        void get().then((d) => {
          if (d && attached === b) d.attach(b);
        });
    }
    if (stopVictory && !onVictoryResult()) {
      stopVictory();
      stopVictory = null;
    }
    if (r.id === 'result' && !resultsSeen.has(r.result)) {
      resultsSeen.add(r.result);
      const s = o.controller.save.peek();
      const input = r.result.input;
      const won = input.outcome.winner === input.mySide;
      // the first win (in practice the training match, War Path level 1): one moment, ever
      if (won && s && s.stats.wins === 1 && s.flags['narrator.firstVictory'] !== true) {
        victoryOn.add(r.result);
        stopVictory = later((d) => d.moment('firstVictory', 700, onVictoryResult));
      }
      // the steps after an onboarding match (its capsule, Make your General, the forced upgrade) speak next
      const match = r.result.setup.mode === 'tutorial' ? r.result.setup.matchNumber : 0;
      if (match > 0)
        later((d) => {
          d.afterMatch(match);
          return () => undefined;
        });
    }
  });

  return {
    voice: (key, vars) => later((d) => d.voice(key, vars)),
    voiceAll: (keys) => later((d) => d.voiceAll(keys)),
    moment: (id, delayMs = 0, when) => later((d) => d.moment(id, delayMs, when)),
    prefetch: (keys) => {
      later((d) => {
        d.prefetch(keys);
        return () => undefined;
      });
    },
    capsule: (record, save) => {
      // the show's events reach the director once it is in (it loads as the show starts); the latest state is
      // passed on then, so a tap prompt already up is still heard
      let real: CapsuleVoice | null = null;
      let ended = false;
      let last: Parameters<CapsuleVoice['state']>[0] | null = null;
      if (on())
        void get().then((d) => {
          if (!d || ended) return;
          real = d.capsule(record, save);
          if (last) real.state(last);
        });
      return {
        state: (s) => {
          last = s;
          real?.state(s);
        },
        cue: (c, step) => real?.cue(c, step),
        end: () => {
          ended = true;
          real?.end();
        },
      };
    },
    log: () => director?.log() ?? null,
    dispose: () => {
      disposed = true;
      stopRoute();
      director?.dispose();
      director = null;
    },
  };
}
