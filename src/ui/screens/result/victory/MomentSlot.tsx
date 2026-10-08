/**
 * Where the victory moment plays on the Result (owner request 2026-10-07; DESIGN A9 #7, ui-plan
 * MR-129): a framed stage in the left column, in place of the recap, while the rewards stage in on the
 * right and the action bar stays live. This part is eager and tiny; the scene, the art and the player
 * load lazily ({@link loadMoment}, prefetched on VS) and the stage simply waits for them a moment.
 *
 * A tap on the stage (or Enter) skips to the end; the stage fades out and the recap comes back.
 */
import './slot.css';
import { useEffect, useRef, useState } from 'preact/hooks';
import type { ResolvedLook } from '../../../components/avatar/render';
import { useKit } from '../../../components/kit';
import type { MomentKind } from './moves';

type MomentModule = typeof import('./VictoryMoment');

let loading: Promise<MomentModule> | null = null;
let loaded: MomentModule | null = null;

/** Loads the moment's player, scenes and art (once). VS calls it so the Result never waits. */
export function loadMoment(): Promise<MomentModule> {
  if (!loading) {
    loading = import('./VictoryMoment').then(
      (m) => {
        loaded = m;
        return m;
      },
      (e: unknown) => {
        loading = null;
        throw e;
      },
    );
  }
  return loading;
}

/** How long the stage waits for the lazy module before the Result goes on without the moment. */
export const MOMENT_LOAD_WAIT_MS = 900;
/** The stage's fade-out after the moment (ui-plan 5.2 `mediumOut`). */
const CLOSE_MS = 200;

export interface MomentSlotProps {
  move: string;
  kind: MomentKind;
  seed: number;
  me: ResolvedLook;
  foe: ResolvedLook;
  team: { me: string; foe: string };
  hitstop: boolean;
  shake: number;
  lite: boolean;
  /** What a screen reader hears ("You bonk Kenji_77 with a giant mallet"). */
  label: string;
  /** Dev preview: never ends by itself. */
  hold?: boolean;
  onCelebrate?: () => void;
  /** The moment is over (played, skipped, or it could not play); the recap comes back. */
  onDone: () => void;
}

export function MomentSlot(p: MomentSlotProps) {
  const kit = useKit();
  const [mod, setMod] = useState<MomentModule | null>(loaded);
  const [closing, setClosing] = useState(false);
  const ended = useRef(false);
  const end = (fade: boolean): void => {
    if (ended.current) return;
    ended.current = true;
    if (!fade) {
      p.onDone();
      return;
    }
    setClosing(true);
    setTimeout(() => p.onDone(), CLOSE_MS);
  };

  useEffect(() => {
    if (mod) return undefined;
    let live = true;
    const give = setTimeout(() => live && end(false), MOMENT_LOAD_WAIT_MS);
    loadMoment().then(
      (m) => {
        if (!live || ended.current) return;
        clearTimeout(give);
        setMod(m);
      },
      () => live && end(false),
    );
    return () => {
      live = false;
      clearTimeout(give);
    };
  }, []);

  const Moment = mod?.VictoryMoment;
  return (
    <div
      class={`result-moment result-moment--${p.kind} ui-rm-own${closing ? ' is-closing' : ''}`}
      data-testid="result-moment"
      data-move={p.move}
      data-kind={p.kind}
      data-anim={closing ? undefined : ''}
      role="button"
      tabIndex={0}
      aria-label={`${p.label}. ${kit.t('ui.result.tapToSkip')}`}
      onClick={(e) => {
        e.stopPropagation();
        end(true);
      }}
      onKeyDown={(e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        e.preventDefault();
        end(true);
      }}
    >
      {Moment ? (
        <Moment
          move={p.move}
          kind={p.kind}
          seed={p.seed}
          me={p.me}
          foe={p.foe}
          team={p.team}
          hitstop={p.hitstop}
          shake={p.shake}
          lite={p.lite}
          {...(p.hold ? { hold: true } : {})}
          {...(p.onCelebrate ? { onCelebrate: p.onCelebrate } : {})}
          onDone={() => end(true)}
        />
      ) : null}
    </div>
  );
}
