/**
 * Online play on the Battle hub, designed now and built at M2 (Friend Duel) and M4 (Online Battle):
 * spec "online-first Battle hub" 1.4-1.8 (2026-10-01).
 *
 * **Nothing here is reachable in the shipped game.** Every piece renders only while `onlineMock` is
 * set, and only the dev screens page (`?dev=1#screens/home-online-*`) sets it, so the owner can see
 * the screens before the server exists (spec 1.8: no online control is shown before it works). When
 * M2/M4 land, the relay client drives the same states instead of the mock.
 *
 * Honesty rules kept in every state (A7.1, A16.21):
 * - a human is never shown before they are found; the idle and searching opponent is a neutral
 *   silhouette with no face, name or avatar;
 * - the Player chip comes only from a found human; an AI keeps the AI chip and is offered as a choice
 *   after 25 s of searching, never swapped in;
 * - the search time counts up (a status, never a countdown); no player counts; Cancel is instant.
 */
import type { AvatarSpec, FormatId } from '@/contracts';
import { signal } from '@preact/signals';
import type { ComponentChildren } from 'preact';
import { createPortal } from 'preact/compat';
import { useContext, useEffect, useRef, useState } from 'preact/hooks';
import { PortalContext } from '../../components/kit';
import { Avatar } from '../../components/Avatar';
import { Button } from '../../components/Button';
import { AiBadge } from '../../components/Chips';
import { formatInt } from '../../components/format';
import { CompassIcon, CopyIcon, FriendsIcon, PlayerIcon, ShareIcon, SignalIcon, TrophyIcon } from '../../components/icons';
import { Sheet } from '../../components/Modal';
import { useUi } from '../context';
import { lengthOptions, LENGTHS } from '../model/homeMode';
import { formatName } from '../model/plan';
import { LengthPicker, lengthLine, PlateFrame } from './plate';

export type OnlineState = 'idle' | 'searching' | 'found' | 'noConnection' | 'full' | 'update';

/** A found player, as the relay will send it (the mock passes one in). */
export interface OnlinePlayer {
  name: string;
  avatar: AvatarSpec;
  trophies: number;
  arena: number;
  bars: 1 | 2 | 3;
}

export interface OnlineMock {
  mode: 'online' | 'friend';
  state: OnlineState;
  /** Search time already gone (for a screenshot at 0:12 or after 25 s). */
  elapsedMs?: number;
  /** The mock finds `foe` this long after Battle; null keeps searching. */
  foundAfterMs?: number | null;
  foe: OnlinePlayer;
  /** Friend Duel: the room panel opens as host, or the code entry. */
  room?: 'host' | 'join' | null;
  /** The friend has joined the room. */
  friendJoined?: boolean;
  /** The room code the server would hand out (6 characters, no look-alikes). */
  code: string;
  /** Shows the online VS (frozen, for a screenshot). */
  vs?: boolean;
}

/** Set only by the dev screens page; null in the shipped game. */
export const onlineMock = signal<OnlineMock | null>(null);

/** The room-code alphabet: no O/0, I/1/L, S/5 or B/8 look-alikes (spec 1.7). */
export const CODE_ALPHABET = 'ACDEFGHJKMNPQRTUVWXY2345679';

/** The lengths online offers per mode: Online Battle has no Last Base Standing (capacity, 3.2). */
export function onlineLengths(mode: 'online' | 'friend'): FormatId[] {
  return mode === 'online' ? LENGTHS.filter((f) => f !== 'last') : [...LENGTHS];
}

function clock(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** The search's own clock (counts up; 4 Hz while searching). */
export function useElapsed(running: boolean, offsetMs: number): number {
  const [start, setStart] = useState(0);
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!running) return;
    setStart(Date.now() - offsetMs);
    const id = setInterval(() => setTick((n) => n + 1), 250);
    return () => clearInterval(id);
  }, [running]);
  return running && start ? Date.now() - start : offsetMs;
}

const AI_CHOICE_MS = 25_000;
const TIPS = ['ui.online.tip1', 'ui.online.tip2', 'ui.online.tip3'];

function Silhouette(p: { dim?: boolean }) {
  return (
    <span class={`hub-plate__glyph is-unknown${p.dim ? ' is-dim' : ''}`} aria-hidden="true">
      <svg viewBox="0 0 44 44" width="44" height="44">
        <circle cx="22" cy="16" r="8" fill="#5b6478" />
        <path d="M8 42a14 14 0 0 1 28 0z" fill="#5b6478" />
        <text x="22" y="20" text-anchor="middle" font-size="12" font-weight="900" fill="#c9d1dc">
          ?
        </text>
      </svg>
    </span>
  );
}

/** The Player chip: on a found human only, never on a bot (A16.21). */
export function PlayerChip() {
  const { t } = useUi();
  return (
    <span class="ui-player" data-testid="player-chip">
      <PlayerIcon size={16} />
      <span class="ui-player__chip" data-tag="">
        {t('ui.online.player')}
      </span>
    </span>
  );
}

function Connected() {
  const { t } = useUi();
  return (
    <span class="hub-conn" data-testid="online-connected">
      <i />
      {t('ui.online.connected')}
    </span>
  );
}

/**
 * The plate's online states P8-P14. `elapsed` is the search time; `onAi` plays an AI General (the
 * labelled AI choice after 25 s, or "Play vs AI" when online is not available).
 */
export function OnlinePlate(p: {
  mock: OnlineMock;
  state: OnlineState;
  elapsed: number;
  format: FormatId;
  onFormat(f: FormatId): void;
  onAi(): void;
  onJoin(): void;
  aside?: boolean;
}) {
  const { t, content, save, locale } = useUi();
  const m = p.mock;
  const all = lengthOptions(save.value, content);
  const options = onlineLengths(m.mode).map((f) => ({ ...(all.find((o) => o.format === f) ?? { format: f, opensAt: null }), open: true }));
  const picker = <LengthPicker value={p.format} options={options} onChange={p.onFormat} testid="home-format" />;
  const unavailable = p.state === 'noConnection' || p.state === 'full' || p.state === 'update';
  if (unavailable) {
    const title = p.state === 'noConnection' ? t('ui.online.noConnection') : p.state === 'full' ? t('ui.online.full') : t('ui.online.update');
    const line = p.state === 'noConnection' ? t('ui.online.noConnectionLine') : p.state === 'full' ? t('ui.online.fullLine') : t('ui.online.updateLine');
    return (
      <PlateFrame
        state={`online-${p.state}`}
        swapKey={p.state}
        aside={p.aside}
        class="is-online is-unavailable"
        portrait={<Silhouette dim />}
        over={t('ui.online.opponent')}
        name={title}
        line={
          <span class="hub-plate__line is-stack">
            <span class="hub-plate__desc" data-testid="home-format-desc">
              {line}
            </span>
            <Button kind="secondary" size="s" testid="online-fallback" onClick={p.state === 'update' ? () => window.location.reload() : p.onAi}>
              {p.state === 'update' ? t('ui.online.reload') : t('ui.online.playVsAi')}
            </Button>
          </span>
        }
      />
    );
  }
  if (m.mode === 'friend') {
    return (
      <PlateFrame
        state="friend"
        swapKey="friend"
        aside={p.aside}
        class="is-online"
        portrait={
          <span class="hub-plate__glyph is-friend">
            <FriendsIcon size={32} />
          </span>
        }
        over={
          <>
            {t('ui.modesPanel.friend')}
            <Connected />
          </>
        }
        name={t('ui.online.friendTitle')}
        choice={picker}
        line={
          <span class="hub-plate__line is-stack">
            <span class="hub-plate__desc" data-testid="home-format-desc">
              {t('ui.online.friendLine')}
            </span>
            <Button kind="secondary" size="s" wide testid="online-enter-code" onClick={p.onJoin}>
              {t('ui.online.enterCode')}
            </Button>
          </span>
        }
      />
    );
  }
  if (p.state === 'searching') {
    const late = p.elapsed >= AI_CHOICE_MS;
    const tip = TIPS[Math.floor(p.elapsed / 6000) % TIPS.length]!;
    return (
      <PlateFrame
        state="online-searching"
        swapKey="searching"
        aside={p.aside}
        class="is-online is-searching"
        portrait={
          <span class="hub-plate__glyph is-compass">
            <CompassIcon size={36} />
          </span>
        }
        over={
          <>
            {t('ui.online.opponent')}
            <b class="hub-plate__tier is-time ui-num" data-testid="online-elapsed">
              {clock(p.elapsed)}
            </b>
          </>
        }
        name={t('ui.online.searching')}
        choice={
          <span class="hub-plate__chip" data-testid="online-length">
            {formatName(content, t, p.format)}
          </span>
        }
        line={
          late ? (
            <span class="hub-plate__line is-stack">
              <span class="hub-plate__desc">{t('ui.online.noPlayerYet')}</span>
              <Button kind="secondary" size="s" wide testid="online-play-ai" icon={<AiBadge size="sm" />} onClick={p.onAi}>
                {t('ui.online.playAi')}
              </Button>
            </span>
          ) : (
            <span class="hub-plate__desc hub-plate__tip" key={tip}>
              {t(tip)}
            </span>
          )
        }
      />
    );
  }
  if (p.state === 'found') {
    return (
      <PlateFrame
        state="online-found"
        swapKey="found"
        aside={p.aside}
        class="is-online is-found"
        portrait={<Avatar spec={m.foe.avatar} size={44} label={m.foe.name} />}
        over={
          <>
            {t('ui.online.found')}
            <PlayerChip />
          </>
        }
        name={m.foe.name}
        line={
          <span class="hub-plate__desc" data-testid="home-format-desc">
            <TrophyIcon size={14} /> {formatInt(m.foe.trophies, locale)} · {t('ui.home.arenaN', { n: m.foe.arena })}
          </span>
        }
      />
    );
  }
  return (
    <PlateFrame
      state="online-idle"
      swapKey="idle"
      aside={p.aside}
      class="is-online"
      portrait={<Silhouette />}
      over={
        <>
          {t('ui.online.opponent')}
          <Connected />
        </>
      }
      name={t('ui.online.unknown')}
      choice={picker}
      line={
        <span class="hub-plate__desc is-two" data-testid="home-format-desc">
          <span>{t('ui.online.unknownSub')}</span>
          <span>{t('ui.online.casualLine')}</span>
        </span>
      }
    />
  );
}

// ---------------------------------------------------------------------------------------------
// Friend Duel: the room panel (S22) and the code entry
// ---------------------------------------------------------------------------------------------

/** The room code, its letters flipping in one by one (MR-124). */
function RoomCode(p: { code: string }) {
  return (
    <span class="room-code" data-testid="room-code" aria-label={p.code.split('').join(' ')}>
      {p.code.split('').map((c, i) => (
        <b key={`${p.code}${i}`} style={{ '--i': i }} aria-hidden="true">
          {c}
        </b>
      ))}
    </span>
  );
}

export function RoomPanel(p: { mock: OnlineMock; format: FormatId; onFormat(f: FormatId): void; onClose(): void }) {
  const { t, save, content } = useUi();
  const s = save.value;
  const [copied, setCopied] = useState(false);
  const [ready, setReady] = useState(false);
  const joined = !!p.mock.friendJoined;
  const elapsed = useElapsed(!joined, 0);
  const all = lengthOptions(s, content);
  const options = LENGTHS.map((f) => ({ ...(all.find((o) => o.format === f) ?? { format: f, opensAt: null }), open: true }));
  const nav = typeof navigator !== 'undefined' ? (navigator as Navigator & { share?: (d: { text: string }) => Promise<void> }) : null;
  return (
    <Sheet
      title={t('ui.online.room.title')}
      onClose={p.onClose}
      testid="room-panel"
      icon={<FriendsIcon size={26} />}
      actions={{
        primary: (
          <Button kind="primary" size="l" testid="room-ready" disabled={!joined} reason={t('ui.online.room.waiting', { time: clock(elapsed) })} done={ready} onClick={() => setReady(true)}>
            {t('ui.online.room.ready')}
          </Button>
        ),
        secondary: (
          <Button kind="secondary" size="m" testid="room-leave" onClick={p.onClose}>
            {t('ui.online.room.leave')}
          </Button>
        ),
      }}
    >
      <div class="room">
        <div class="room__codeBox">
          <span class="room__label" data-tag="">
            {t('ui.online.room.code')}
          </span>
          <RoomCode code={p.mock.code} />
          <span class="room__codeActions">
            <Button
              kind="secondary"
              size="s"
              icon={<CopyIcon size={20} />}
              testid="room-copy"
              done={copied}
              onClick={() => {
                void navigator.clipboard?.writeText(p.mock.code).catch(() => undefined);
                setCopied(true);
                setTimeout(() => setCopied(false), 1400);
              }}
            >
              {copied ? t('ui.online.room.copied') : t('ui.online.room.copy')}
            </Button>
            {nav?.share ? (
              <Button kind="secondary" size="s" icon={<ShareIcon size={20} />} testid="room-share" onClick={() => void nav.share?.({ text: p.mock.code }).catch(() => undefined)}>
                {t('ui.online.room.share')}
              </Button>
            ) : null}
          </span>
        </div>
        <div class="room__row">
          <span class="room__label" data-tag="">
            {t('ui.online.room.length')}
          </span>
          <LengthPicker value={p.format} options={options} onChange={(f) => (setReady(false), p.onFormat(f))} testid="room-length" />
          <span class="room__line">{lengthLine(content, t, p.format)}</span>
        </div>
        <div class="room__people">
          <span class="room__person is-me">
            <Avatar spec={s.profile.avatar} size={40} />
            <span class="room__who">
              <b data-clip-check="">{s.profile.name}</b>
              <small>{t('ui.online.room.host')}</small>
            </span>
          </span>
          <span class="room__vs" aria-hidden="true">
            {t('ui.vs.vs')}
          </span>
          {joined ? (
            <span class="room__person is-friend" data-testid="room-friend">
              <Avatar spec={p.mock.foe.avatar} size={40} />
              <span class="room__who">
                <b data-clip-check="">{p.mock.foe.name}</b>
                <PlayerChip />
              </span>
            </span>
          ) : (
            <span class="room__person is-waiting" data-testid="room-waiting">
              <span class="room__ghost">
                <span class="room__dots" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                </span>
              </span>
              <span class="room__who">
                <small>{t('ui.online.room.waiting', { time: clock(elapsed) })}</small>
              </span>
            </span>
          )}
        </div>
      </div>
    </Sheet>
  );
}

export function JoinPanel(p: { onClose(): void }) {
  const { t } = useUi();
  const [code, setCode] = useState('');
  const [bad, setBad] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const clean = (v: string) =>
    v
      .toUpperCase()
      .split('')
      .filter((c) => CODE_ALPHABET.includes(c))
      .join('')
      .slice(0, 6);
  return (
    <Sheet
      title={t('ui.online.enterCode')}
      onClose={p.onClose}
      testid="join-panel"
      icon={<FriendsIcon size={26} />}
      actions={{
        primary: (
          <Button kind="primary" size="l" testid="join-go" disabled={code.length < 6} reason={t('ui.online.room.codeHint')} onClick={() => setBad(true)}>
            {t('ui.online.room.join')}
          </Button>
        ),
      }}
    >
      <label class="join" onClick={() => input.current?.focus()}>
        <span class="room__label" data-tag="">
          {t('ui.online.room.code')}
        </span>
        <span class="join__boxes" aria-hidden="true">
          {Array.from({ length: 6 }, (_, i) => (
            <b key={i} class={i === code.length ? 'is-next' : code[i] ? 'is-set' : ''}>
              {code[i] ?? ''}
            </b>
          ))}
        </span>
        <input
          ref={input}
          class="join__input"
          inputMode="text"
          autoComplete="off"
          aria-label={t('ui.online.room.code')}
          value={code}
          data-testid="join-code"
          onInput={(e) => {
            setBad(false);
            setCode(clean((e.currentTarget as HTMLInputElement).value));
          }}
        />
        <small class={`join__hint${bad ? ' is-bad' : ''}`} role={bad ? 'alert' : undefined}>
          {bad ? t('ui.online.room.noRoom') : t('ui.online.room.codeHint')}
        </small>
      </label>
    </Sheet>
  );
}

// ---------------------------------------------------------------------------------------------
// VS online (S3 at M2/M4): Player or AI chip on each side, the length, the level rule, connection
// ---------------------------------------------------------------------------------------------

function Nameplate(p: { side: 'me' | 'foe'; name: string; avatar: AvatarSpec; trophies: number; arena: number; bars: 1 | 2 | 3; chip: ComponentChildren; actions?: ComponentChildren }) {
  const { t, locale } = useUi();
  return (
    <div class={`ovs__plate is-${p.side}`} data-testid={`ovs-${p.side}`}>
      <span class="ovs__avatar">
        <Avatar spec={p.avatar} size={72} label={p.name} />
      </span>
      <span class="ovs__name" data-clip-check="">
        {p.name}
      </span>
      {p.chip}
      <span class="ovs__meta">
        <TrophyIcon size={16} /> {formatInt(p.trophies, locale)} · {t('ui.home.arenaN', { n: p.arena })}
      </span>
      <span class="ovs__bars" title={t('ui.online.vs.connection', { n: p.bars })}>
        <SignalIcon size={20} bars={p.bars} />
      </span>
      {/* Both plates keep the same rows, so they line up (only the opponent's has Block and Report). */}
      {p.actions ?? <span class="ovs__actions is-spacer" aria-hidden="true" />}
    </div>
  );
}

/** VS for a match between two people: 3 s, cannot be skipped (tick 0 starts when it ends). */
export function OnlineVs(p: { mock: OnlineMock; format: FormatId; frozen?: boolean; onDone(): void }) {
  const { t, save, content } = useUi();
  const s = save.value;
  useEffect(() => {
    if (p.frozen) return;
    const id = setTimeout(p.onDone, 3000);
    return () => clearTimeout(id);
  }, []);
  const portal = useContext(PortalContext);
  // The portal host mounts with the screen; render once more after mount so VS lands in it.
  const [, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const view = (
    <div class={`ovs${p.frozen ? ' is-frozen' : ''}`} data-testid="online-vs" role="dialog" aria-label={t('ui.vs.title', { name: p.mock.foe.name })}>
      <Nameplate side="me" name={s.profile.name} avatar={s.profile.avatar} trophies={s.trophies.current} arena={s.arenaIndex + 1} bars={3} chip={<PlayerChip />} />
      <div class="ovs__mid">
        <b class="ovs__vs">{t('ui.vs.vs')}</b>
        <span class="ovs__len">
          {formatName(content, t, p.format)} · {lengthLine(content, t, p.format)}
        </span>
        <span class="ovs__rule">{t('ui.online.vs.levels')}</span>
        <i class="ovs__timer" aria-hidden="true" />
      </div>
      <Nameplate
        side="foe"
        name={p.mock.foe.name}
        avatar={p.mock.foe.avatar}
        trophies={p.mock.foe.trophies}
        arena={p.mock.foe.arena}
        bars={p.mock.foe.bars}
        chip={<PlayerChip />}
        actions={
          <span class="ovs__actions">
            <Button kind="tertiary" size="s" testid="ovs-block">
              {t('ui.online.vs.block')}
            </Button>
            <Button kind="tertiary" size="s" testid="ovs-report">
              {t('ui.online.vs.report')}
            </Button>
          </span>
        }
      />
    </div>
  );
  return portal.current ? createPortal(view, portal.current) : view;
}
