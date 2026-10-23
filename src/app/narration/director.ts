/**
 * The narrator's director (queue item 39), loaded lazily by `./index.ts` with the narrator and the voice
 * manifest: it turns what the player sees into lines, plays them through the narrator (`@/audio/narrator`) and
 * shows a moment's subtitle.
 *
 * - A line plays only while its string still reads what was rendered (`VoiceFile.text`), in the current
 *   language: a changed string or another language shows its subtitle silently, as before.
 * - The tutorial prompt (`BattleHandle.prompt`, both onboarding matches and the hints of matches 2-5): a new
 *   prompt's line cuts the one before; a prompt that goes (done, skipped, timed out, tapped away), a pause, the
 *   end or leaving the battle stops it. Each prompt is voiced once a match (the stall guard re-arms; its line
 *   does not). The script's next one or two lines are fetched ahead, and let go when the battle is left.
 * - A line a screen asks for (`voice`): it plays while the screen shows it; the screen's stop ends it.
 * - A hidden page stops the line playing; it does not come back with the page.
 * - Live (online) matches are never narrated.
 * - Moments play once per profile (`flags['narrator.<id>']`, set when the line starts) and show the line as a
 *   subtitle while it plays. The first evolve's stops with a pause or the end like a prompt's.
 */
import { effect } from '@preact/signals';
import type { CompiledContent, SaveDoc } from '@/contracts';
import type { Cue, RunnerState, ShowStep } from '@/capsule';
import { Narrator, type NarratorEvent, type NarratorHost, type VoiceOut } from '@/audio/narrator';
import { VOICE_LINES, type VoiceFile } from '@/audio/voice.gen';
import { voiceLineId } from '@/audio/voiceLine';
import type { TutorialPrompt } from '@/tutorial';
import type { BattleHandle } from '../battle';
import type { ShowRecord } from '../capsules/capsuleFlow';
import type { AppController } from '../controller';
import { documentVisibility, type VisibilitySource } from '../session';
import type { Services } from '../services';
import './narration.css';

export type MomentId = 'firstEvolve' | 'firstVictory' | 'firstLegendary';

/** The save flag that records a moment as said. */
export const momentFlag = (id: MomentId): string => `narrator.${id}`;
/** The moment's line (an i18n key in `narrator.en.json`). */
export const momentKey = (id: MomentId): string => `narrator.${id}`;

/** The first evolve's line comes this long after the age changes: past the fanfare's opening (it lasts 2 s). */
export const FIRST_EVOLVE_DELAY_MS = 1100;
/** A prompt's line that is not loaded this long after the prompt appears stays silent. */
export const PROMPT_MAX_DELAY_MS = 3000;
/** The pause between the lines of one `voiceAll`. */
export const SEQUENCE_GAP_MS = 250;
/**
 * A `voiceAll` line skipped for these reasons is passed over (its file failed or came late, audio not running
 * yet): the next line follows. A cut, a newer line (`replaced`) or Narrator off ends the row.
 */
const ROW_GOES_ON: ReadonlySet<string> = new Set(['failed', 'late', 'missing', 'locked']);
/**
 * The first Legendary's line starts this long after the walkout's bass drop (A10 step 6: at 4.0 s the unit bursts
 * into colour), over its signature move, and ends before the name banner slams down at 7.8 s. Mixed offline at the
 * game's gains it sits 6.7 dB over everything else there; during the flare's fanfare (0.7-3.3 s) it would only
 * match it.
 */
export const FIRST_LEGENDARY_DELAY_MS = 800;

/** A capsule show's narration (`NarrationDirector.capsule`). */
export interface CapsuleVoice {
  state(s: RunnerState): void;
  cue(cue: Cue, step: ShowStep): void;
  end(): void;
}

/** True when no Legendary card was owned before this show (the ones it reveals as NEW are new). */
export function firstLegendaryEver(save: SaveDoc, content: CompiledContent, record: ShowRecord): boolean {
  if (record.kind !== 'capsules') return false;
  const fresh = new Set(record.reveals.flatMap((r) => r.capsule.contents.stacks.filter((x) => x.rarity === 'legendary' && x.isNew).map((x) => x.card)));
  return Object.keys(save.collection).every((card) => content.units[card]?.rarity !== 'legendary' || fresh.has(card));
}
/** Lines fetched after each onboarding match, for the steps that follow it (capsule, General, upgrade, Home). */
export const AFTER_MATCH: Readonly<Record<number, readonly string[]>> = {
  1: ['narrator.firstVictory', 'capsule.tapStarter', 'avatar.ui.make', 'warPath.ui.unlock.army'],
  2: ['capsule.tapStarter', 'tutorial.upgrade.title', 'tutorial.upgrade.gain', 'tutorial.upgrade.done'],
};
const LOG_KEEP = 400;

export interface NarrationLogEntry {
  /** ms on the page clock. */
  t: number;
  kind: 'prompt' | 'voice' | 'moment' | 'start' | 'end' | 'skip' | 'stop' | 'prefetch';
  id: string;
  detail?: string;
}

export interface DirectorOptions {
  services: Pick<Services, 'audio' | 'i18n' | 'content'>;
  controller: Pick<AppController, 'save' | 'route' | 'setSave'>;
  /** The narrator's host (default: the audio service's voice bus and duck). */
  host?: NarratorHost;
  /** Its file loader (default fetch; tests pass one). */
  fetchFile?: (src: string) => Promise<ArrayBuffer>;
  now?: () => number;
  /** The moment subtitle (default `domCaption()`, an element in the app root; tests record the calls). */
  caption?: CaptionView;
  /** The page's visibility (default the document's; null: none, as in tests): hiding it stops the line. */
  visibility?: Pick<VisibilitySource, 'subscribe'> | null;
}

/** Shows a moment's subtitle while its line plays. */
export interface CaptionView {
  /** `battle`: above the card tray; `result`: in the Result's action bar, left of its primary; `screen`: bottom centre. */
  show(text: string, place: CaptionPlace): void;
  hide(): void;
}

export type CaptionPlace = 'battle' | 'result' | 'screen';

/** Where a moment's subtitle goes on the screen showing now. */
export function captionPlace(route: string): CaptionPlace {
  return route === 'battle' ? 'battle' : route === 'result' ? 'result' : 'screen';
}

/**
 * The subtitle as an element in the app root (`narration.css`): it fades and rises in a frame after it is
 * added, and fades out (removed 400 ms later). It never takes input.
 */
export function domCaption(host: () => HTMLElement | null = () => document.querySelector<HTMLElement>('.ab-root') ?? document.body): CaptionView {
  let el: HTMLElement | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  return {
    show(text, place) {
      if (timer !== null) clearTimeout(timer);
      timer = null;
      const root = host();
      if (!root) return;
      if (!el || !el.isConnected) {
        el = document.createElement('div');
        el.className = 'nar-caption';
        el.setAttribute('role', 'status');
        el.dataset['testid'] = 'narrator-caption';
        const wave = document.createElement('span');
        wave.className = 'nar-caption__wave';
        wave.setAttribute('aria-hidden', 'true');
        wave.append(document.createElement('i'), document.createElement('i'), document.createElement('i'));
        const words = document.createElement('span');
        words.className = 'nar-caption__text';
        el.append(wave, words);
        root.append(el);
      }
      el.dataset['place'] = place;
      const words = el.querySelector('.nar-caption__text');
      if (words) words.textContent = text;
      const shown = el;
      // a frame later, so the entrance transition runs
      if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => shown.classList.add('is-on'));
      else shown.classList.add('is-on');
    },
    hide() {
      const gone = el;
      if (!gone) return;
      gone.classList.remove('is-on');
      if (timer !== null) clearTimeout(timer);
      timer = setTimeout(() => {
        gone.remove();
        if (el === gone) el = null;
      }, 400);
    },
  };
}

const noop = (): void => undefined;

/** Every language's lines in one table, keyed `<locale>/<id>`. */
function allLines(): Record<string, VoiceFile> {
  const out: Record<string, VoiceFile> = {};
  for (const [lang, lines] of Object.entries(VOICE_LINES)) for (const [id, f] of Object.entries(lines)) out[`${lang}/${id}`] = f;
  return out;
}

/** The audio service's voice bus (`WebAudioService.voiceOut`, duck-typed: a stand-in service has none). */
export function serviceHost(audio: Services['audio']): NarratorHost {
  const withVoice = audio as Services['audio'] & { voiceOut?: () => VoiceOut | null };
  return {
    voiceOut: () => (typeof withVoice.voiceOut === 'function' ? withVoice.voiceOut() : null),
    duck: (db, ms) => audio.music.duck(db, ms),
  };
}

export class NarrationDirector {
  readonly narrator: Narrator;
  private readonly battles = new Map<BattleHandle, () => void>();
  private readonly entries: NarrationLogEntry[] = [];
  private readonly now: () => number;
  private readonly stopSettings: () => void;
  private readonly unsubscribe: () => void;
  private readonly stopVisibility: () => void;
  /** The moment line playing (its subtitle shows), by line id. */
  private moments = new Map<string, MomentId>();
  private ducks = 0;
  private readonly caption: CaptionView;

  constructor(private readonly o: DirectorOptions) {
    this.now = o.now ?? (() => (typeof performance !== 'undefined' ? performance.now() : Date.now()));
    this.caption = o.caption ?? domCaption();
    const host = o.host ?? serviceHost(o.services.audio);
    this.narrator = new Narrator({
      host: {
        voiceOut: () => host.voiceOut(),
        duck: (db, ms) => {
          this.ducks += 1;
          host.duck(db, ms);
        },
      },
      files: allLinesCache(),
      ...(o.fetchFile ? { fetchFile: o.fetchFile } : {}),
      now: this.now,
    });
    this.unsubscribe = this.narrator.subscribe((e) => this.onEvent(e));
    // Settings › Narrator applies at once: off stops the line playing (the volume is the voice bus's).
    this.stopSettings = effect(() => {
      this.narrator.enabled = o.controller.save.value?.settings.narrator !== false;
    });
    // A hidden page (another tab, the phone locked) stops the line at once, so it does not play on when the page
    // comes back: a battle pauses there anyway, and a menu's line has had its moment. No fade: the audio context
    // is being suspended, and a fade would finish audibly on the return.
    const visibility = o.visibility === undefined ? (typeof document !== 'undefined' ? documentVisibility(document) : null) : o.visibility;
    this.stopVisibility =
      visibility?.subscribe((hidden) => {
        if (!hidden) return;
        const id = this.narrator.current;
        if (id) this.record('stop', id, 'hidden');
        this.narrator.stop(undefined, { fade: false });
      }) ?? noop;
  }

  /** The event log (dev page, e2e checks), oldest first. */
  log(): readonly NarrationLogEntry[] {
    return this.entries;
  }

  /** The line id for an on-screen string, or null when it is not voiced (unknown, stale or another language). */
  lineId(key: string, vars?: Readonly<Record<string, string>> | null): string | null {
    const { i18n } = this.o.services;
    const id = `${i18n.locale}/${voiceLineId(key, vars)}`;
    const f = this.narrator.has(id) ? allLinesCache()[id] : undefined;
    if (!f) return null;
    const params = vars ? Object.fromEntries(Object.entries(vars).map(([k, v]) => [k, i18n.t(v)])) : undefined;
    return f.text === i18n.t(key, params) ? id : null;
  }

  /** Fetches the lines of these strings ahead (nothing for unvoiced ones). */
  prefetch(keys: readonly string[]): void {
    const ids = keys.map((k) => this.lineId(k)).filter((x): x is string => x !== null);
    if (ids.length === 0 || !this.narrator.enabled) return;
    this.record('prefetch', ids.join(' '));
    this.narrator.prefetch(ids);
  }

  /** Fetches the lines of the steps after an onboarding match (its capsule, Make your General, the upgrade). */
  afterMatch(match: number): void {
    this.prefetch(AFTER_MATCH[match] ?? []);
  }

  /** Reads an on-screen string aloud; returns its stop. */
  voice(key: string, vars?: Readonly<Record<string, string>>): () => void {
    const id = this.lineId(key, vars);
    this.record('voice', key, id ? undefined : 'not voiced');
    if (!id) return noop;
    void this.narrator.say(id, { maxDelayMs: PROMPT_MAX_DELAY_MS });
    return () => {
      this.record('stop', id);
      this.narrator.stop(id);
    };
  }

  /**
   * Lines in a row, each after the one before ends (or could not play: a failed or late file does not hold up
   * the rest); a cut or a newer line ends the row, and so does the stop.
   */
  voiceAll(keys: readonly string[]): () => void {
    const ids = keys.map((k) => this.lineId(k)).filter((x): x is string => x !== null);
    this.record('voice', keys.join(' + '), ids.length === keys.length ? undefined : `${keys.length - ids.length} not voiced`);
    if (ids.length === 0) return noop;
    this.narrator.prefetch(ids.slice(1));
    let k = 0;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const off = this.narrator.subscribe((e) => {
      if (stopped || e.id !== ids[k] || e.kind === 'start') return;
      if ((e.kind === 'end' && e.cut) || (e.kind === 'skip' && !ROW_GOES_ON.has(e.reason))) {
        stopped = true;
        off();
        return;
      }
      k += 1;
      if (k < ids.length) timer = setTimeout(() => void this.narrator.say(ids[k]!, { maxDelayMs: PROMPT_MAX_DELAY_MS }), SEQUENCE_GAP_MS);
      else off();
    });
    void this.narrator.say(ids[0]!, { maxDelayMs: PROMPT_MAX_DELAY_MS });
    return () => {
      stopped = true;
      off();
      if (timer !== null) clearTimeout(timer);
      const cur = ids[k];
      if (cur) {
        this.record('stop', cur);
        this.narrator.stop(cur);
      }
    };
  }

  /**
   * A first-time moment: its line `delayMs` from now, once per profile, while `when` still holds, with a
   * subtitle. Returns a stop (cancels it, or ends the line).
   */
  moment(id: MomentId, delayMs = 0, when: () => boolean = () => true): () => void {
    if (!this.momentDue(id)) return noop;
    const line = this.lineId(momentKey(id));
    this.record('moment', id, line ? `in ${delayMs} ms` : 'not voiced');
    if (!line) return noop;
    this.narrator.prefetch([line]);
    let started = false;
    const timer = setTimeout(() => {
      if (!this.momentDue(id) || !when()) return;
      started = true;
      this.moments.set(line, id);
      void this.narrator.say(line);
    }, delayMs);
    return () => {
      clearTimeout(timer);
      if (started) this.narrator.stop(line);
    };
  }

  /**
   * A capsule show: "Tap to crack it!" while a Starter Capsule (scripted, capsules 1-5) asks for the tap (once a
   * show, stopped by the tap), and a player's first Legendary after its walkout's drop. `end` stops both.
   */
  capsule(record: ShowRecord, save: SaveDoc): CapsuleVoice {
    const scripted = record.kind === 'capsules' && record.reveals.length > 0 && record.reveals.every((x) => x.capsule.scriptIndex !== null);
    const first = firstLegendaryEver(save, this.o.services.content, record);
    const hasNewLegendary = record.kind === 'capsules' && record.reveals.some((x) => x.capsule.contents.stacks.some((s) => s.rarity === 'legendary' && s.isNew));
    this.prefetch([...(scripted ? ['capsule.tapStarter'] : []), ...(first && hasNewLegendary && this.momentDue('firstLegendary') ? [momentKey('firstLegendary')] : [])]);
    let tap: (() => void) | null = null;
    let tapSaid = false;
    let legendary: () => void = noop;
    return {
      state: (s) => {
        if (s.prompt === 'tap' && scripted && !tapSaid) {
          tapSaid = true;
          tap = this.voice('capsule.tapStarter');
        } else if (s.prompt !== 'tap' && tap) {
          tap();
          tap = null;
        }
      },
      cue: (cue, step) => {
        if (cue.sound === 'walkout_bass' && step.kind === 'walkout' && step.first && first) legendary = this.moment('firstLegendary', FIRST_LEGENDARY_DELAY_MS);
      },
      end: () => {
        tap?.();
        tap = null;
        legendary();
      },
    };
  }

  /** Narrates a battle: its tutorial prompts, and the first evolve in the first match. */
  attach(b: BattleHandle): void {
    if (b.live || this.battles.has(b)) return;
    const said = new Set<string>();
    const order = (b.setup.script?.beats ?? []).filter((x) => x.textKey !== null).map((x) => ({ id: x.id, key: x.textKey as string }));
    this.prefetch(order.slice(0, 2).map((x) => x.key));
    let line: string | null = null;
    const stopLine = (why: string): void => {
      if (!line) return;
      this.record('stop', line, why);
      this.narrator.stop(line);
      line = null;
    };
    const onPrompt = (p: TutorialPrompt | null): void => {
      stopLine(p ? 'next prompt' : 'prompt over');
      if (!p) return;
      this.record('prompt', p.id);
      if (said.has(p.id)) return;
      said.add(p.id);
      const id = this.lineId(p.textKey, p.varKeys);
      if (id) {
        line = id;
        void this.narrator.say(id, { maxDelayMs: PROMPT_MAX_DELAY_MS });
      }
      const at = order.findIndex((x) => x.id === p.id);
      this.prefetch(
        (at >= 0 ? order.slice(at + 1) : order)
          .filter((x) => !said.has(x.id))
          .slice(0, 2)
          .map((x) => x.key),
      );
    };
    const offPrompt = b.prompt.subscribe(onPrompt);
    // The first evolve (A8 match 1, ~0:56): a moment over the new age's banner, once per profile.
    let offTick: (() => void) | null = null;
    let stopMoment: () => void = noop;
    // A pause (the button, a hidden tab) or the end stops the line and the moment (said or still to come);
    // nothing plays over the pause menu or the end banner.
    const offStatus = b.session.status.subscribe((s) => {
      if (s !== 'paused' && s !== 'ended') return;
      stopLine(s);
      stopMoment();
      stopMoment = noop;
    });
    const save = this.o.controller.save.peek();
    if (b.setup.mode === 'tutorial' && b.setup.matchNumber === 1 && (save?.matchesPlayed ?? 0) === 0 && this.momentDue('firstEvolve')) {
      // this match's moments: the first evolve, and the first win on its Result
      this.prefetch([momentKey('firstEvolve'), ...(this.momentDue('firstVictory') ? [momentKey('firstVictory')] : [])]);
      offTick = b.session.onTick((events) => {
        if (!events.some((e) => e.e === 'ageUp' && e.side === b.session.mySide)) return;
        offTick?.();
        offTick = null;
        stopMoment = this.moment('firstEvolve', FIRST_EVOLVE_DELAY_MS, () => b.session.status.peek() === 'running');
      });
    }
    this.battles.set(b, () => {
      offPrompt();
      offStatus();
      offTick?.();
      stopMoment();
      stopLine('left');
    });
  }

  /** The battle is no longer on screen: its line stops, and the lines fetched ahead for it are let go. */
  detach(b: BattleHandle): void {
    const off = this.battles.get(b);
    if (!off) return;
    off();
    this.battles.delete(b);
    this.narrator.release();
  }

  dispose(): void {
    for (const off of this.battles.values()) off();
    this.battles.clear();
    this.stopSettings();
    this.stopVisibility();
    this.unsubscribe();
    this.narrator.dispose();
    this.caption.hide();
  }

  private momentDue(id: MomentId): boolean {
    const s = this.o.controller.save.peek();
    return !!s && s.flags[momentFlag(id)] !== true && s.settings.narrator !== false;
  }

  private onEvent(e: NarratorEvent): void {
    if (e.kind === 'start') {
      this.ducks = 0;
      this.record('start', e.id, `${e.seconds.toFixed(2)} s`);
      const m = this.moments.get(e.id);
      if (m) {
        const s = this.o.controller.save.peek();
        if (s) this.o.controller.setSave({ ...s, flags: { ...s.flags, [momentFlag(m)]: true } });
        const text = allLinesCache()[e.id]?.text;
        if (text) this.caption.show(text, captionPlace(this.o.controller.route.peek().id));
      }
    } else if (e.kind === 'end') {
      this.record('end', e.id, `${e.cut ? 'cut' : 'ended'}, ducks ${this.ducks}`);
      if (this.moments.delete(e.id)) this.caption.hide();
    } else {
      this.record('skip', e.id, e.reason);
      if (this.moments.delete(e.id)) this.caption.hide();
    }
  }

  private record(kind: NarrationLogEntry['kind'], id: string, detail?: string): void {
    this.entries.push({ t: Math.round(this.now()), kind, id, ...(detail ? { detail } : {}) });
    if (this.entries.length > LOG_KEEP) this.entries.splice(0, this.entries.length - LOG_KEEP);
  }
}

let linesCache: Record<string, VoiceFile> | null = null;
function allLinesCache(): Record<string, VoiceFile> {
  return (linesCache ??= allLines());
}

export function createDirector(o: DirectorOptions): NarrationDirector {
  return new NarrationDirector(o);
}
