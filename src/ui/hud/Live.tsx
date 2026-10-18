/**
 * The live match HUD (owner request 2026-10-13, queue item 34): "When you play online/live, it makes no
 * sense that you can set the tempo yourself and pause ... you should be able to propose raising the tempo
 * and then the opponent must accept or decline it."
 *
 * - **Menu** (top right, where Pause sits offline; P and the back button open it too): a drop-down that
 *   never pauses, with a red live dot. Mute opponent, Settings (over the running battle) and Retreat (asks
 *   once more: a loss with no rewards).
 * - **Tempo** (where the speed button sits offline; F too): the current speed with an ask badge. A tap
 *   drops down the three speeds; picking one sends the proposal. While it waits the button wears a
 *   draining ring and "2x?", and a tag under it says who it waits for and the seconds left; then
 *   "2x agreed" (the label pops), "<name> said no" or "No answer". Your next proposal waits a cooldown
 *   (a slate sweep; a tap says how long).
 * - **Their proposal**: a small card under the top band with their head, "2x speed?", Accept and Decline
 *   (Y / N) and a draining bar. It never blocks the battle; no answer is a decline.
 * - **Catching up**: when a hidden tab comes back, a cue over the lane while the battle fast-forwards.
 * - **Away too long**: the banner that says the match counted as a Retreat.
 *
 * Motion follows the tokens (presses on pointerdown, small things overshoot, exits about 0.7 × entrances);
 * Reduce motion keeps fades, the rings and bars (counters stay) and drops the movement (`live.css`).
 */
import './live.css';
import { useEffect, useRef, useState } from 'preact/hooks';
import { Avatar } from '../components/Avatar';
import { haptic } from '../components/haptics';
import { CheckIcon, CloseIcon, FlagIcon, GearIcon } from '../components/icons';
import type { HudCtx } from './context';
import { AskIcon, MenuIcon, MutedIcon, SoundIcon, SpeedIcon } from './icons';
import { LIVE_SPEEDS, type LiveHud, type LiveMenuActions, type LiveProposal, type LiveSpeed, type LiveTempo } from './live';
import { formatClock } from './model';

/** Which live drop-down is open. */
export type LiveOpen = 'menu' | 'tempo' | null;

/** How long an ended proposal's outcome stays on the tempo tag. */
export const OUTCOME_MS = 2400;
/** A refused tap's reason stays this long. */
const REFUSAL_MS = 1800;
/** The proposal card leaves in 160 ms (0.7 × its 220 ms entrance). */
const PROMPT_EXIT_MS = 160;
/** A catch-up shows its cue once it has run this long (a short one never flashes) and keeps it at least `CUE_MIN_MS`. */
const CUE_DELAY_MS = 150;
const CUE_MIN_MS = 700;
const CUE_EXIT_MS = 180;

const secs = (ms: number): number => Math.max(0, Math.ceil(ms / 1000));

/** Closes a drop-down on Escape (without pausing) and on any press outside `root`. */
function useDismiss(open: boolean, root: { current: HTMLElement | null }, onClose: () => void): void {
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      e.stopPropagation();
      close.current();
    };
    const onDown = (e: PointerEvent): void => {
      if (root.current && e.target instanceof Node && root.current.contains(e.target)) return;
      close.current();
    };
    window.addEventListener('keydown', onKey, { capture: true });
    window.addEventListener('pointerdown', onDown, { capture: true });
    return () => {
      window.removeEventListener('keydown', onKey, { capture: true });
      window.removeEventListener('pointerdown', onDown, { capture: true });
    };
  }, [open]);
}

/** Keeps the last value on screen for `exitMs` after it goes away, so it can play its exit. */
function usePresence<T>(value: T | null, exitMs: number): { value: T | null; leaving: boolean } {
  const [kept, setKept] = useState<T | null>(value);
  useEffect(() => {
    if (value !== null) {
      setKept(value);
      return undefined;
    }
    const id = setTimeout(() => setKept(null), exitMs);
    return () => clearTimeout(id);
  }, [value, exitMs]);
  if (value !== null) return { value, leaving: false };
  return { value: kept, leaving: kept !== null };
}

/** A ring that drains from `left0` to 0 over the time left (CSS, timed once at mount so re-renders never re-time it). */
function DrainRing(p: { total: number; left: number; tone: 'gold' | 'slate' }) {
  const start = useRef({ total: Math.max(1, p.total), left: Math.max(0, p.left) });
  const s = start.current;
  return (
    <svg class={`hud-tempo-ring is-${p.tone}`} viewBox="0 0 40 40" aria-hidden="true">
      <circle class="hud-tempo-ring-track" cx="20" cy="20" r="17" pathLength="100" />
      <circle
        class="hud-tempo-ring-fill"
        cx="20"
        cy="20"
        r="17"
        pathLength="100"
        style={{ animationDuration: `${s.total}ms`, animationDelay: `${-(s.total - s.left)}ms` }}
      />
    </svg>
  );
}

/** A bar that drains over the time left (timed once at mount). */
function DrainBar(p: { total: number; left: number; class: string }) {
  const start = useRef({ total: Math.max(1, p.total), left: Math.max(0, p.left) });
  const s = start.current;
  return <i class={p.class} style={{ animationDuration: `${s.total}ms`, animationDelay: `${-(s.total - s.left)}ms` }} aria-hidden="true" />;
}

/**
 * The live controls in the top band's right corner: the menu (no pause) and the tempo proposal. `open` is
 * kept by the HUD (P and F toggle it, the back button opens the menu).
 */
export function LiveControls(p: { c: HudCtx; live: LiveHud; open: LiveOpen; setOpen: (o: LiveOpen) => void; menu?: LiveMenuActions }) {
  const { c, live } = p;
  const tempo = live.tempo.value;
  const now = live.now();
  const root = useRef<HTMLDivElement>(null);
  useDismiss(p.open !== null, root, () => p.setOpen(null));
  const [refusal, setRefusal] = useState<{ id: number; text: string } | null>(null);
  const refusalSeq = useRef(0);
  useEffect(() => {
    if (!refusal) return undefined;
    const id = setTimeout(() => setRefusal((r) => (r?.id === refusal.id ? null : r)), REFUSAL_MS);
    return () => clearTimeout(id);
  }, [refusal]);
  const refuse = (text: string): void => {
    c.act({ k: 'deny', target: 'tempo' });
    setRefusal({ id: ++refusalSeq.current, text });
  };
  const ended = c.m.phase === 'ended' || tempo.ended;
  const tapTempo = (): void => {
    if (c.readOnly || ended) return;
    const pending = tempo.pending;
    if (pending?.by === 'foe') return refuse(c.t('hud.live.answerFirst', { name: live.foeName }));
    if (pending?.by === 'me') return refuse(c.t('hud.live.waiting', { name: live.foeName }));
    if (now < tempo.readyAt) return refuse(c.t('hud.live.cooldown', { s: secs(tempo.readyAt - now) }));
    c.audio?.play('ui_click');
    p.setOpen(p.open === 'tempo' ? null : 'tempo');
  };
  const pick = (s: LiveSpeed): void => {
    p.setOpen(null);
    const why = live.propose(s);
    if (why === null) {
      c.audio?.play('ui_confirm');
      haptic('tick');
    } else if (why === 'cooldown') refuse(c.t('hud.live.cooldown', { s: secs(tempo.readyAt - live.now()) }));
    else if (why === 'pending') refuse(c.t('hud.live.answerFirst', { name: live.foeName }));
  };
  // an ended proposal sounds once: agreed (a bright unlock), said no or ran out (a soft toggle)
  const lastKey = tempo.last ? `${tempo.last.by}${tempo.last.id}${tempo.last.result}` : '';
  const heard = useRef(lastKey);
  useEffect(() => {
    if (lastKey === heard.current) return;
    heard.current = lastKey;
    const l = tempo.last;
    if (!l) return;
    if (l.result === 'accepted') {
      c.audio?.play('ui_unlock');
      haptic('thump');
    } else if (l.by === 'me') c.audio?.play('ui_toggle');
  }, [lastKey]);
  return (
    <div class="hud-live" ref={root}>
      <button
        class={`hud-round hud-live-menu${p.open === 'menu' ? ' is-open' : ''}`}
        data-testid="hud-live-menu"
        aria-label={c.t('hud.live.menu')}
        aria-haspopup="menu"
        aria-expanded={p.open === 'menu'}
        disabled={c.readOnly}
        onClick={() => {
          c.audio?.play('ui_click');
          p.setOpen(p.open === 'menu' ? null : 'menu');
        }}
      >
        <MenuIcon size={18} />
        <i class="hud-live-dot" aria-hidden="true" />
      </button>
      <TempoButton c={c} live={live} tempo={tempo} now={now} open={p.open === 'tempo'} ended={ended} onTap={tapTempo} />
      {p.open === 'menu' ? <LiveMenu c={c} live={live} {...(p.menu ? { actions: p.menu } : {})} onClose={() => p.setOpen(null)} /> : null}
      {p.open === 'tempo' ? <TempoMenu c={c} live={live} tempo={tempo} onPick={pick} /> : null}
      <TempoTag c={c} live={live} tempo={tempo} now={now} refusal={refusal} />
    </div>
  );
}

function TempoButton(p: { c: HudCtx; live: LiveHud; tempo: LiveTempo; now: number; open: boolean; ended: boolean; onTap: () => void }) {
  const { c, tempo, now } = p;
  const asking = tempo.pending?.by === 'me' ? tempo.pending : null;
  const cooling = !tempo.pending && !p.ended && now < tempo.readyAt;
  const last = tempo.last;
  const agreed = last?.result === 'accepted' && now - last.at < 900;
  return (
    <button
      class={`hud-round hud-speed hud-tempo${asking ? ' is-asking' : ''}${cooling ? ' is-cooling' : ''}${p.open ? ' is-open' : ''}${c.denied('tempo') ? ' is-denied' : ''}`}
      data-testid="hud-tempo"
      data-speed={tempo.speed}
      {...(asking ? { 'data-asking': String(asking.speed) } : {})}
      aria-label={c.t('hud.live.tempoLabel', { s: tempo.speed, name: p.live.foeName })}
      aria-haspopup="menu"
      aria-expanded={p.open}
      disabled={c.readOnly}
      onClick={p.onTap}
    >
      {asking ? <DrainRing key={`a${asking.id}`} total={asking.until - asking.at} left={asking.until - now} tone="gold" /> : null}
      {cooling ? <DrainRing key={`c${tempo.readyAt}`} total={Math.max(1, tempo.readyAt - (last?.at ?? now))} left={tempo.readyAt - now} tone="slate" /> : null}
      {agreed ? <i key={`b${last?.id ?? 0}${last?.by ?? ''}`} class="hud-tempo-burst" aria-hidden="true" /> : null}
      <span key={`l${tempo.speed}${asking ? 'q' : ''}`} class={`hud-tempo-label${agreed ? ' is-pop' : ''}`}>
        {asking ? c.t('hud.live.asking', { s: asking.speed }) : c.t('hud.speed', { s: tempo.speed })}
      </span>
      {asking ? null : (
        <i class="hud-tempo-ask" aria-hidden="true">
          <AskIcon size={14} />
        </i>
      )}
    </button>
  );
}

/** Under the controls: who you wait for and the seconds left, then how it ended, or why a tap was refused. */
function TempoTag(p: { c: HudCtx; live: LiveHud; tempo: LiveTempo; now: number; refusal: { id: number; text: string } | null }) {
  const { c, tempo, now } = p;
  const name = p.live.foeName;
  let tag: { key: string; tone: 'wait' | 'good' | 'bad' | 'dim' | 'deny'; text: string; secs?: number } | null = null;
  const pending = tempo.pending;
  const last = tempo.last;
  if (p.refusal) tag = { key: `r${p.refusal.id}`, tone: 'deny', text: p.refusal.text };
  else if (pending?.by === 'me') tag = { key: `w${pending.id}`, tone: 'wait', text: c.t('hud.live.waiting', { name }), secs: secs(pending.until - now) };
  else if (last && now - last.at < OUTCOME_MS) {
    const key = `o${last.by}${last.id}`;
    if (last.result === 'accepted') tag = { key, tone: 'good', text: c.t('hud.live.agreed', { s: last.speed }) };
    else if (last.by === 'me') tag = last.result === 'declined' ? { key, tone: 'bad', text: c.t('hud.live.declined', { name }) } : { key, tone: 'dim', text: c.t('hud.live.noAnswer') };
    else tag = last.result === 'declined' ? { key, tone: 'dim', text: c.t('hud.live.youDeclined') } : { key, tone: 'dim', text: c.t('hud.live.missed', { s: last.speed }) };
  }
  if (!tag) return null;
  return (
    <div key={tag.key} class={`hud-tempo-tag is-${tag.tone}`} role="status" aria-live="polite" data-testid="hud-tempo-tag" data-tone={tag.tone}>
      {tag.tone === 'wait' ? (
        <span class="hud-tempo-dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
      ) : tag.tone === 'good' ? (
        <CheckIcon size={14} />
      ) : tag.tone === 'bad' ? (
        <CloseIcon size={12} />
      ) : null}
      <span class="hud-tempo-tag-text">{tag.text}</span>
      {tag.secs !== undefined ? <b class="hud-tempo-secs">{tag.secs}</b> : null}
    </div>
  );
}

function TempoMenu(p: { c: HudCtx; live: LiveHud; tempo: LiveTempo; onPick: (s: LiveSpeed) => void }) {
  const { c, tempo } = p;
  return (
    <div class="hud-live-drop hud-tempo-menu" role="menu" aria-label={c.t('hud.live.tempoTitle')} data-testid="hud-tempo-menu">
      <div class="hud-live-drop-title">{c.t('hud.live.tempoTitle')}</div>
      <div class="hud-tempo-opts">
        {LIVE_SPEEDS.map((s, i) => {
          const current = s === tempo.speed;
          return (
            <button
              key={s}
              role="menuitem"
              class={`hud-tempo-opt${current ? ' is-now' : ''}${s > tempo.speed ? ' is-up' : s < tempo.speed ? ' is-down' : ''}`}
              style={{ animationDelay: `${i * 30}ms` }}
              disabled={current}
              aria-current={current ? 'true' : undefined}
              data-testid={`hud-tempo-${s}`}
              onClick={() => p.onPick(s)}
            >
              <b>{c.t('hud.speed', { s })}</b>
              {current ? <small>{c.t('hud.live.now')}</small> : <i class="hud-tempo-arrow" aria-hidden="true" />}
            </button>
          );
        })}
      </div>
      <div class="hud-live-drop-hint">{c.t('hud.live.tempoHint', { name: p.live.foeName })}</div>
    </div>
  );
}

function LiveMenu(p: { c: HudCtx; live: LiveHud; actions?: LiveMenuActions; onClose: () => void }) {
  const { c, live } = p;
  const [confirm, setConfirm] = useState(false);
  const muted = live.muted.value;
  return (
    <div class="hud-live-drop hud-live-menu-drop" role="menu" aria-label={c.t('hud.live.menuTitle')} data-testid="hud-live-menu-drop">
      {confirm ? (
        <div class="hud-live-confirm" data-testid="hud-live-retreat-confirm">
          <b class="hud-live-confirm-title">{c.t('hud.live.retreatAsk')}</b>
          <span class="hud-live-confirm-body">{c.t('hud.live.retreatBody')}</span>
          <div class="hud-live-confirm-row">
            <button class="hud-live-btn" data-testid="hud-live-retreat-no" onClick={() => setConfirm(false)}>
              {c.t('hud.live.cancel')}
            </button>
            <button
              class="hud-live-btn is-danger"
              data-testid="hud-live-retreat-yes"
              onClick={() => {
                p.onClose();
                p.actions?.retreat();
              }}
            >
              {c.t('hud.live.retreat')}
            </button>
          </div>
        </div>
      ) : (
        <>
          <div class="hud-live-head">
            <i class="hud-live-dot is-big" aria-hidden="true" />
            <b>{c.t('hud.live.menuTitle')}</b>
          </div>
          <div class="hud-live-sub">{c.t('hud.live.menuSub')}</div>
          <button
            role="menuitemcheckbox"
            aria-checked={muted}
            class={`hud-live-item${muted ? ' is-on' : ''}`}
            data-testid="hud-live-mute"
            onClick={() => {
              live.setMuted(!muted);
              c.audio?.play('ui_toggle');
            }}
          >
            {muted ? <MutedIcon size={20} /> : <SoundIcon size={20} />}
            <span class="hud-live-item-text">{c.t('hud.live.mute')}</span>
            <i class={`hud-live-switch${muted ? ' is-on' : ''}`} aria-hidden="true" />
          </button>
          {p.actions?.settings ? (
            <button
              role="menuitem"
              class="hud-live-item"
              data-testid="hud-live-settings"
              onClick={() => {
                p.onClose();
                p.actions?.settings?.();
              }}
            >
              <GearIcon size={20} />
              <span class="hud-live-item-text">{c.t('hud.live.settings')}</span>
            </button>
          ) : null}
          {p.actions ? (
            <button role="menuitem" class="hud-live-item is-danger" data-testid="hud-live-retreat" onClick={() => setConfirm(true)}>
              <FlagIcon size={20} />
              <span class="hud-live-item-text">{c.t('hud.live.retreat')}</span>
            </button>
          ) : null}
        </>
      )}
    </div>
  );
}

/**
 * The opponent's speed proposal: a card under the top band with their head, the speed, Accept and Decline
 * (Y / N) and a bar that drains over the window. It arrives with a soft pop and never blocks the battle.
 */
export function TempoPrompt(p: { c: HudCtx; live: LiveHud }) {
  const { c, live } = p;
  const tempo = live.tempo.value;
  const pending: LiveProposal | null = tempo.pending?.by === 'foe' && c.m.phase !== 'ended' ? tempo.pending : null;
  const shown = usePresence(pending, PROMPT_EXIT_MS);
  const arrived = useRef<number | null>(null);
  useEffect(() => {
    if (!pending || arrived.current === pending.id) return;
    arrived.current = pending.id;
    c.audio?.play('ui_pop');
    haptic('tick');
  }, [pending?.id]);
  const pr = shown.value;
  if (!pr) return null;
  const now = live.now();
  const foe = c.config.sides[c.side === 0 ? 1 : 0];
  const avatar = foe?.online?.avatar;
  const name = live.foeName;
  const answer = (yes: boolean): void => {
    if (shown.leaving) return;
    live.answer(yes);
    c.audio?.play(yes ? 'ui_confirm' : 'ui_toggle');
  };
  return (
    <div
      key={pr.id}
      class={`hud-tempo-prompt${shown.leaving ? ' is-leaving' : ''}`}
      role="alertdialog"
      aria-label={c.t('hud.live.promptLabel', { name, s: pr.speed })}
      data-testid="hud-tempo-prompt"
      data-speed={pr.speed}
    >
      <span class="hud-tp-who">
        {avatar ? <Avatar spec={avatar} size={34} crop="head" detail="low" /> : <AskIcon size={26} />}
        <i class="hud-tp-badge" aria-hidden="true">
          <SpeedIcon size={11} />
        </i>
      </span>
      <span class="hud-tp-text">
        <span class="hud-tp-name">{c.t('hud.live.asks', { name })}</span>
        <b class="hud-tp-q">{c.t('hud.live.speedQ', { s: pr.speed })}</b>
      </span>
      <button class="hud-tp-btn is-yes" data-testid="hud-tempo-accept" onClick={() => answer(true)}>
        <CheckIcon size={16} />
        <span>{c.t('hud.live.accept')}</span>
      </button>
      <button class="hud-tp-btn is-no" data-testid="hud-tempo-decline" onClick={() => answer(false)}>
        <CloseIcon size={14} />
        <span>{c.t('hud.live.decline')}</span>
      </button>
      <DrainBar key={`bar${pr.id}`} class="hud-tp-bar" total={pr.until - pr.at} left={pr.until - now} />
    </div>
  );
}

/**
 * The battle fast-forwarding through the time the page was hidden: a cue over the lane once it has run
 * `CUE_DELAY_MS` (a short catch-up never flashes), with the progress and how far behind it still is.
 */
export function CatchUpCue(p: { c: HudCtx; live: LiveHud }) {
  const cu = p.live.catchUp.value;
  const active = cu !== null;
  const [shown, setShown] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const shownAt = useRef(0);
  const last = useRef(cu);
  if (cu) last.current = cu;
  useEffect(() => {
    if (active) {
      setLeaving(false);
      if (shown) return undefined;
      const id = setTimeout(() => {
        shownAt.current = Date.now();
        setShown(true);
      }, CUE_DELAY_MS);
      return () => clearTimeout(id);
    }
    if (!shown) return undefined;
    const hold = Math.max(0, CUE_MIN_MS - (Date.now() - shownAt.current));
    const id = setTimeout(() => {
      setLeaving(true);
      setTimeout(() => {
        setShown(false);
        setLeaving(false);
      }, CUE_EXIT_MS);
    }, hold);
    return () => clearTimeout(id);
  }, [active, shown]);
  if (!shown) return null;
  const view = cu ?? last.current;
  const done = view ? view.doneBp / 10_000 : 1;
  return (
    <div class={`hud-catchup${leaving || !active ? ' is-leaving' : ''}`} role="status" aria-live="polite" data-testid="hud-catchup">
      <div class="hud-catchup-card">
        <span class="hud-catchup-icon" aria-hidden="true">
          <SpeedIcon size={22} />
        </span>
        <b class="hud-catchup-title">{p.c.t('hud.live.catchingUp')}</b>
        <span class="hud-catchup-bar" aria-hidden="true">
          <i style={{ transform: `scaleX(${active ? done : 1})` }} />
        </span>
        {view && active ? <span class="hud-catchup-behind">{p.c.t('hud.live.behind', { time: formatClock(view.behindMs) })}</span> : null}
      </div>
    </div>
  );
}

/** The match ended because you were away too long: a Retreat, as a reload is. */
export function AwayNotice(p: { c: HudCtx; live: LiveHud }) {
  if (!p.live.away.value) return null;
  return (
    <div class="hud-moment hud-moment-away" data-testid="hud-away" role="status">
      <div class="hud-moment-title">{p.c.t('hud.live.away')}</div>
      <div class="hud-moment-sub">{p.c.t('hud.live.awaySub')}</div>
    </div>
  );
}
