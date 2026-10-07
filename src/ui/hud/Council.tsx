/**
 * The War Council in the battle HUD (DESIGN A18.5.7).
 *
 * - **Button.** Round, right of the gold counter. While research runs it shows the pick's badge with a
 *   progress ring and the seconds left; a green dot when something can start now. G opens and closes
 *   the sheet (T is free). A tap on the gold counter opens it on the Economy track.
 * - **Sheet.** A bottom sheet over the tray, never over the lane band; the game keeps running. The
 *   overview shows the four tracks with their next item (Troops: the five class lines with rank pips,
 *   "Not in this tray" for a class the current tray lacks). A tap on a track flips to its two picks:
 *   badge, name, one-line effect, cost (the underdog price with the list price struck out) and time,
 *   with "or" between them, since the other pick is gone for the match. At most two decisions show.
 * - **Spends take two taps** (A15 U14): the first tap on a pick selects it and says "Tap again to
 *   research"; the second starts it. The chosen badge stamps into the button.
 * - **Completion** (in `Hud.tsx`): the button bursts and a card with the badge pops above it.
 *
 * Motion: the sheet slides up in 180 ms ease-out and leaves in 130 ms; pick cards flip in; Reduce
 * motion uses fades (hud.css).
 */
import { useEffect, useRef, useState } from 'preact/hooks';
import { ClassIcon, CLASS_NAME_KEY } from '../components/ClassIcon';
import type { HudCtx } from './context';
import {
  cancelResearchIntent,
  lineOf,
  secondsLeft,
  troopLines,
  type CouncilLine,
  type CouncilPick,
  type CouncilView,
} from './council';
import { CouncilBadge, PickBadge, TRACK_COLOR, TRACK_GLYPH } from './councilIcons';
import { CoinIcon } from './icons';
import { useFitLabel } from './fit';
import './council.css';

function cls(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ');
}

const DENY_FRAMES: Keyframe[] = [
  { transform: 'translateX(0)' },
  { transform: 'translateX(-6px) rotate(-1.5deg)' },
  { transform: 'translateX(6px) rotate(1.5deg)' },
  { transform: 'translateX(-3px)' },
  { transform: 'translateX(0)' },
];

function kick(el: Element | null, frames: Keyframe[], ms: number): void {
  if (el && typeof (el as HTMLElement).animate === 'function') (el as HTMLElement).animate(frames, { duration: ms, easing: 'ease-out' });
}

/** The pick's name. */
export function pickName(c: HudCtx, id: string): string {
  const def = c.config.content.research.picks.find((p) => p.id === id);
  return def ? c.t(def.nameKey) : id;
}

function trackName(c: HudCtx, track: CouncilLine['track']): string {
  switch (track) {
    case 'troops':
      return c.t('hud.council.track.troops');
    case 'defences':
      return c.t('hud.council.track.defences');
    case 'economy':
      return c.t('hud.council.track.economy');
    case 'command':
      return c.t('hud.council.track.command');
  }
}

function lineName(c: HudCtx, l: CouncilLine): string {
  return l.group ? c.t(CLASS_NAME_KEY[l.group]) : trackName(c, l.track);
}

const ROMAN = ['', 'I', 'II', 'III'];

/** Rank pips: filled for owned ranks, a ring for the rest that exist. */
function Pips(p: { owned: number; max: number }) {
  const out = [];
  for (let i = 1; i <= Math.max(1, p.max); i++) out.push(<i key={i} class={cls('hud-pip', i <= p.owned && 'is-on')} />);
  return <span class="hud-pips">{out}</span>;
}

// ---------------------------------------------------------------------------------------------
// Button
// ---------------------------------------------------------------------------------------------

export function CouncilButton(p: { c: HudCtx; v: CouncilView; open: boolean; onToggle: () => void; burst: number; stamp: number; btnRef: (el: HTMLElement | null) => void }) {
  const { c, v } = p;
  const cur = v.current;
  const self = useRef<HTMLButtonElement | null>(null);
  const labelEl = useRef<HTMLSpanElement>(null);
  // The pill's padding (3 px a side on phones) and outline stay inside the button's width, so the
  // Council and Evolve labels never overlap in the tight tray (A18.9 seven cards).
  useFitLabel(labelEl, () => (self.current ? self.current.clientWidth - 8 : 0), [c.compact, c.t('hud.council.buttonShort')]);
  // Completion: a springy pop (the sparks are CSS, keyed by `burst`).
  const lastBurst = useRef(p.burst);
  useEffect(() => {
    if (p.burst === lastBurst.current) return;
    lastBurst.current = p.burst;
    kick(self.current, [{ transform: 'scale(1)' }, { transform: 'scale(0.86)', offset: 0.18 }, { transform: 'scale(1.22)', offset: 0.5 }, { transform: 'scale(0.97)', offset: 0.78 }, { transform: 'scale(1)' }], 520);
  }, [p.burst]);
  const lastStamp = useRef(p.stamp);
  useEffect(() => {
    if (p.stamp === lastStamp.current) return;
    lastStamp.current = p.stamp;
    kick(self.current, [{ transform: 'scale(1)' }, { transform: 'scale(0.84, 0.9)', offset: 0.3 }, { transform: 'scale(1.08)', offset: 0.65 }, { transform: 'scale(1)' }], 300);
  }, [p.stamp]);
  const label = cur ? c.t('hud.council.buttonBusy', { name: c.t(cur.def.nameKey), s: secondsLeft(cur.leftMs) }) : c.t('hud.council.buttonLabel');
  return (
    <div class="hud-cbtn-wrap">
      <button
        ref={(el) => {
          self.current = el;
          p.btnRef(el);
        }}
        class={cls('hud-cbtn', p.open && 'is-open', cur && 'is-busy', !cur && v.anyReady && 'is-ready', c.denied('council') && 'is-denied')}
        data-testid="hud-council"
        data-busy={cur !== null}
        aria-label={label}
        aria-expanded={p.open}
        disabled={c.readOnly}
        style={{ '--prog': cur ? cur.progressBp / 10000 : 0 }}
        onClick={() => {
          // A13 planned Council sounds (audit 2026-10-01): a parchment unrolls on open
          c.audio?.play(p.open ? 'ui_click' : 'council_open');
          p.onToggle();
        }}
      >
        <i class="hud-cbtn-ring" />
        <span class="hud-cbtn-core">
          {cur ? (
            <PickBadge key={cur.def.id} def={cur.def} size={c.compact ? 30 : 36} corner={false} class="hud-cbtn-badge" />
          ) : (
            <CouncilBadge glyph="anvil" color={{ main: '#6a58a8', dark: '#2e2450' }} size={c.compact ? 30 : 36} class="hud-cbtn-badge" />
          )}
        </span>
        {cur ? (
          <span class="hud-cbtn-time" data-tag>
            {c.t('hud.council.seconds', { s: secondsLeft(cur.leftMs) })}
          </span>
        ) : null}
        {!cur && v.anyReady ? <i class="hud-cbtn-dot" data-testid="hud-council-dot" /> : null}
        {v.discount ? (
          <span class="hud-cbtn-sale" data-tag>
            {c.t('hud.council.saleShort', { pct: v.discountBp / 100 })}
          </span>
        ) : null}
        {p.burst > 0 ? (
          <span key={p.burst} class="hud-cbtn-burst" aria-hidden="true">
            {Array.from({ length: 10 }, (_, i) => (
              <i key={i} style={{ '--a': `${i * 36}deg` }} />
            ))}
          </span>
        ) : null}
        {c.keys ? <kbd class="hud-key">G</kbd> : null}
      </button>
      <span class="hud-cbtn-label" data-tag>
        <span ref={labelEl} class="hud-fit">
          {c.t('hud.council.buttonShort')}
        </span>
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// Sheet
// ---------------------------------------------------------------------------------------------

function Price(p: { c: HudCtx; pick: CouncilPick; short?: boolean }) {
  const { pick } = p;
  const sale = pick.price < pick.listPrice;
  return (
    <span class={cls('hud-price', sale && 'is-sale')}>
      <CoinIcon size={p.c.compact ? 13 : 15} />
      {sale && !p.short ? <s>{pick.listPrice}</s> : null}
      <b>{pick.price}</b>
    </span>
  );
}

function stateNote(c: HudCtx, pick: CouncilPick, gold: number): string | null {
  switch (pick.state) {
    case 'owned':
      return c.t('hud.council.owned');
    case 'excluded':
      return c.t('hud.council.notChosen');
    case 'locked':
      return pick.opensAt ? c.t('hud.council.opensIn', { age: c.t(`age.${pick.opensAt}.name`) }) : c.t('hud.council.notThisWar');
    case 'busy':
      return c.t('hud.council.busy');
    case 'researching':
      return c.t('hud.council.inProgress');
    case 'poor':
      return c.t('hud.council.need', { n: Math.max(1, Math.ceil(pick.price - gold)) });
    case 'ready':
      return null;
  }
}

function PickCard(p: {
  c: HudCtx;
  pick: CouncilPick;
  selected: boolean;
  onPress: (pick: CouncilPick, el: HTMLElement) => void;
  i: number;
}) {
  const { c, pick } = p;
  const def = pick.def;
  const note = stateNote(c, pick, c.m.me.gold);
  const done = pick.state === 'owned';
  return (
    <button
      class={cls('hud-pick', `is-${pick.state}`, p.selected && 'is-selected')}
      data-testid={`hud-pick-${def.id}`}
      data-state={pick.state}
      style={{ '--i': p.i }}
      aria-pressed={p.selected}
      aria-label={`${c.t(def.nameKey)}. ${c.t(def.descKey)}${note ? ` ${note}` : ''}`}
      disabled={c.readOnly}
      onClick={(e) => p.onPress(pick, e.currentTarget)}
    >
      <PickBadge def={def} size={c.compact ? 38 : 48} class="hud-pick-badge" />
      <span class="hud-pick-text">
        <b class="hud-pick-name">{c.t(def.nameKey)}</b>
        <span class="hud-pick-desc">{c.t(def.descKey)}</span>
      </span>
      <span class="hud-pick-foot">
        {done ? null : <Price c={c} pick={pick} />}
        {done ? null : <span class="hud-pick-time">{c.t('hud.council.seconds', { s: Math.round(pick.timeMs / 1000) })}</span>}
      </span>
      {note ? <span class={cls('hud-pick-note', `is-${pick.state}`)}>{note}</span> : null}
      {p.selected ? (
        <span class="hud-pick-cta" data-testid="hud-pick-confirm">
          {c.t('hud.council.tapAgain')}
        </span>
      ) : null}
      {done ? <i class="hud-pick-check" aria-hidden="true" /> : null}
    </button>
  );
}

function TrackCard(p: { c: HudCtx; line: CouncilLine; v: CouncilView; onOpen: (key: string) => void; i: number }) {
  const { c, line, v } = p;
  const pair = line.pair;
  const busy = v.current?.line === line.key;
  const locked = pair !== null && pair.every((x) => x.state === 'locked');
  const opens = locked ? pair?.[0]?.opensAt ?? null : null;
  let status: string;
  if (!pair) status = c.t('hud.council.allDone');
  else if (busy) status = c.t('hud.council.inProgress');
  else if (locked) status = opens ? c.t('hud.council.opensIn', { age: c.t(`age.${opens}.name`) }) : c.t('hud.council.notThisWar');
  else status = c.t('hud.council.pairOr', { a: c.t(pair[0].def.nameKey), b: c.t(pair[1].def.nameKey) });
  return (
    <button
      class={cls('hud-track', `track-${line.track}`, line.ready && 'is-ready', busy && 'is-busy', locked && 'is-locked', !pair && 'is-done')}
      data-testid={`hud-track-${line.key}`}
      style={{ '--i': p.i }}
      disabled={c.readOnly}
      onClick={() => {
        c.audio?.play('ui_click');
        p.onOpen(line.key);
      }}
    >
      <CouncilBadge glyph={TRACK_GLYPH[line.track]} color={TRACK_COLOR[line.track]} size={c.compact ? 32 : 40} class="hud-track-badge" />
      <span class="hud-track-text">
        <span class="hud-track-row">
          <b class="hud-track-name">
            {trackName(c, line.track)}
            <Pips owned={line.ownedRanks} max={line.maxRank} />
          </b>
          {pair && !locked && !busy ? <Price c={c} pick={pair[0]} short /> : null}
        </span>
        <span class="hud-track-next">{status}</span>
      </span>
      {line.ready ? <i class="hud-track-dot" /> : null}
    </button>
  );
}

function TroopsCard(p: { c: HudCtx; v: CouncilView; onOpen: (key: string) => void }) {
  const { c, v } = p;
  const lines = troopLines(v);
  // The cheapest item a class line offers now (rank I lines first).
  const open = lines.flatMap((l) => (l.pair && l.pair[0].state !== 'locked' ? [l.pair[0]] : []));
  const price = open.sort((a, b) => a.price - b.price)[0];
  return (
    <div class={cls('hud-track', 'hud-track-troops', 'track-troops', lines.some((l) => l.ready) && 'is-ready')} data-testid="hud-track-troops" style={{ '--i': 0 }}>
      <span class="hud-troops-head">
        <CouncilBadge glyph={TRACK_GLYPH.troops} color={TRACK_COLOR.troops} size={c.compact ? 24 : 28} class="hud-track-badge" />
        <b class="hud-track-name">{c.t('hud.council.track.troops')}</b>
        {price ? <Price c={c} pick={price} short /> : null}
      </span>
      <span class="hud-troops-row">
        {lines.map((l) => {
          const busy = v.current?.line === l.key;
          return (
            <button
              key={l.key}
              class={cls('hud-class-line', l.ready && 'is-ready', busy && 'is-busy', !l.inTray && 'is-absent', !l.pair && 'is-done')}
              data-testid={`hud-track-${l.key}`}
              aria-label={`${lineName(c, l)}${l.inTray ? '' : `. ${c.t('hud.council.notInTray')}`}`}
              title={l.inTray ? lineName(c, l) : `${lineName(c, l)}: ${c.t('hud.council.notInTray')}`}
              disabled={c.readOnly}
              onClick={() => {
                c.audio?.play('ui_click');
                p.onOpen(l.key);
              }}
            >
              {l.group ? <ClassIcon id={l.group} size={c.compact ? 28 : 34} /> : null}
              <Pips owned={l.ownedRanks} max={l.maxRank} />
              {!l.inTray ? <i class="hud-class-absent" aria-hidden="true" /> : null}
              {busy ? <i class="hud-class-busy" aria-hidden="true" /> : null}
            </button>
          );
        })}
      </span>
    </div>
  );
}

/** The four tracks (A18.5.7 overview). */
function Overview(p: { c: HudCtx; v: CouncilView; onOpen: (key: string) => void }) {
  const { c, v } = p;
  const others = v.lines.filter((l) => l.track !== 'troops');
  return (
    <div class="hud-council-tracks" data-testid="hud-council-tracks">
      {troopLines(v).length > 0 ? <TroopsCard c={c} v={v} onOpen={p.onOpen} /> : null}
      {others.map((l, i) => (
        <TrackCard key={l.key} c={c} line={l} v={v} onOpen={p.onOpen} i={i + 1} />
      ))}
    </div>
  );
}

/** One line's two picks, or its owned picks when complete. */
function PairView(p: {
  c: HudCtx;
  v: CouncilView;
  line: CouncilLine;
  onBack: () => void;
  onStart: (pick: CouncilPick, el: HTMLElement) => void;
}) {
  const { c, line } = p;
  const [sel, setSel] = useState<string | null>(null);
  // A selection that can no longer start (gold spent elsewhere, slot taken) is dropped.
  const selected = line.pair?.find((x) => x.def.id === sel && x.state === 'ready') ?? null;
  const press = (pick: CouncilPick, el: HTMLElement): void => {
    if (pick.state !== 'ready') {
      kick(el, DENY_FRAMES, 280);
      c.audio?.play('ui_deny');
      return;
    }
    if (selected?.def.id === pick.def.id) {
      setSel(null);
      p.onStart(pick, el);
      return;
    }
    c.audio?.play('ui_toggle');
    setSel(pick.def.id);
  };
  const rank = line.nextRank ?? line.ownedRanks;
  const troops = line.track === 'troops';
  return (
    <div class="hud-council-pair" data-testid={`hud-council-line-${line.key}`}>
      <button class="hud-council-back" data-testid="hud-council-back" aria-label={c.t('hud.council.back')} onClick={p.onBack}>
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
          <path d="M15 4.5 7.5 12l7.5 7.5" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>
      <div class="hud-council-lineinfo">
        <b class="hud-council-linename">
          {line.group ? <ClassIcon id={line.group} size={c.compact ? 18 : 22} /> : <CouncilBadge glyph={TRACK_GLYPH[line.track]} color={TRACK_COLOR[line.track]} size={c.compact ? 18 : 22} />}
          {lineName(c, line)}
        </b>
        <span class="hud-council-rank">{c.t('hud.council.rank', { n: ROMAN[rank] ?? String(rank) })}</span>
        {!line.inTray ? <span class="hud-council-warn">{c.t('hud.council.notInTray')}</span> : null}
        <span class="hud-council-rule">{line.pair ? (troops ? c.t('hud.council.spawnNote') : c.t('hud.council.choose')) : c.t('hud.council.allDone')}</span>
      </div>
      {line.pair ? (
        <div class="hud-council-picks" key={line.key}>
          <PickCard c={c} pick={line.pair[0]} selected={selected?.def.id === line.pair[0].def.id} onPress={press} i={0} />
          <span class="hud-council-or" aria-hidden="true">
            {c.t('hud.council.or')}
          </span>
          <PickCard c={c} pick={line.pair[1]} selected={selected?.def.id === line.pair[1].def.id} onPress={press} i={1} />
        </div>
      ) : (
        <div class="hud-council-owned">
          {line.owned.map((d) => (
            <span key={d.id} class="hud-council-ownedpick">
              <PickBadge def={d} size={30} corner={false} />
              {c.t(d.nameKey)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/** The research in the slot, with Cancel (two taps, 75% back). */
function Current(p: { c: HudCtx; v: CouncilView }) {
  const { c, v } = p;
  const [confirm, setConfirm] = useState(false);
  useEffect(() => {
    if (!confirm) return undefined;
    const id = setTimeout(() => setConfirm(false), 2500);
    return () => clearTimeout(id);
  }, [confirm]);
  const cur = v.current;
  if (!cur) return <span class="hud-council-hint">{c.t('hud.council.idle')}</span>;
  return (
    <span class="hud-council-cur" data-testid="hud-council-current">
      <span class="hud-council-curbar" style={{ '--prog': cur.progressBp / 10000 }}>
        <PickBadge def={cur.def} size={22} corner={false} />
        <span class="hud-council-curtext">{c.t('hud.council.researching', { name: c.t(cur.def.nameKey), s: secondsLeft(cur.leftMs) })}</span>
      </span>
      <button
        class={cls('hud-council-cancel', confirm && 'is-confirm')}
        data-testid="hud-council-cancel"
        disabled={c.readOnly}
        onClick={() => {
          if (!confirm) {
            c.audio?.play('ui_toggle');
            setConfirm(true);
            return;
          }
          setConfirm(false);
          c.act(cancelResearchIntent(v, c.side));
        }}
      >
        {confirm ? c.t('hud.council.cancelConfirm', { pct: v.cancelRefundBp / 100 }) : c.t('hud.council.cancel')}
      </button>
    </span>
  );
}

export function CouncilSheet(p: {
  c: HudCtx;
  v: CouncilView;
  line: string | null;
  onLine: (key: string | null) => void;
  onClose: () => void;
  /** A pick was confirmed: the HUD sends it and stamps the badge into the button. */
  onStart: (pick: CouncilPick, from: HTMLElement) => void;
  closing: boolean;
}) {
  const { c, v } = p;
  const line = p.line ? lineOf(v, p.line) : undefined;
  return (
    <div class={cls('hud-council', p.closing && 'is-closing')} role="dialog" aria-label={c.t('hud.council.title')} data-testid="hud-council-sheet">
      <div class="hud-council-head">
        <b class="hud-council-title">{c.t('hud.council.title')}</b>
        <Current c={c} v={v} />
        {v.discount ? (
          <span class="hud-council-sale" data-testid="hud-council-discount" title={c.t('hud.council.discountHint')}>
            {c.t('hud.council.discount', { pct: v.discountBp / 100 })}
          </span>
        ) : null}
        <button class="hud-council-close" data-testid="hud-council-close" aria-label={c.t('hud.council.close')} onClick={p.onClose}>
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" />
          </svg>
          {c.keys ? <kbd class="hud-key">G</kbd> : null}
        </button>
      </div>
      <div class="hud-council-body">
        {line ? (
          <PairView key={line.key} c={c} v={v} line={line} onBack={() => p.onLine(null)} onStart={p.onStart} />
        ) : (
          <Overview c={c} v={v} onOpen={(k) => p.onLine(k)} />
        )}
      </div>
    </div>
  );
}

/** The badge that flies from the chosen pick into the Council button (A18.5.7 "stamps into the slot"). */
export interface CouncilFly {
  id: number;
  pick: string;
  from: { x: number; y: number };
  to: { x: number; y: number };
}

export function FlyBadge(p: { c: HudCtx; fly: CouncilFly; onDone: (id: number) => void }) {
  const { c, fly } = p;
  const el = useRef<HTMLSpanElement>(null);
  const def = c.config.content.research.picks.find((x) => x.id === fly.pick);
  useEffect(() => {
    const node = el.current;
    const dx = fly.to.x - fly.from.x;
    const dy = fly.to.y - fly.from.y;
    const lift = -Math.max(40, Math.abs(dx) * 0.25);
    if (!node || typeof node.animate !== 'function') {
      p.onDone(fly.id);
      return;
    }
    const a = node.animate(
      [
        { transform: 'translate(0, 0) scale(1)', opacity: 1 },
        { transform: `translate(${dx * 0.5}px, ${dy * 0.5 + lift}px) scale(1.2)`, opacity: 1, offset: 0.45 },
        { transform: `translate(${dx}px, ${dy}px) scale(0.7)`, opacity: 1, offset: 0.9 },
        { transform: `translate(${dx}px, ${dy}px) scale(0.55)`, opacity: 0 },
      ],
      { duration: 420, easing: 'cubic-bezier(0.4, 0, 0.3, 1)' },
    );
    a.onfinish = () => p.onDone(fly.id);
    return () => a.cancel();
    // One flight per id.
  }, [fly.id]);
  if (!def) return null;
  return (
    <span ref={el} class="hud-cfly" style={{ left: `${fly.from.x - 24}px`, top: `${fly.from.y - 24}px` }} aria-hidden="true">
      <PickBadge def={def} size={48} />
    </span>
  );
}

/** The completion card: the badge pops in with squash and stretch, name and effect under it. */
export interface CouncilDone {
  id: number;
  pick: string;
}

export function DoneCard(p: { c: HudCtx; done: CouncilDone; onSkip: () => void }) {
  const { c, done } = p;
  const def = c.config.content.research.picks.find((x) => x.id === done.pick);
  if (!def) return null;
  const klass = def.group;
  return (
    <button key={done.id} class={cls('hud-cdone', klass && `cls-${klass}`)} data-testid="hud-council-done" role="status" onClick={p.onSkip}>
      <span class="hud-cdone-rays" aria-hidden="true" />
      <PickBadge def={def} size={c.compact ? 44 : 56} class="hud-cdone-badge" />
      <span class="hud-cdone-text">
        <span class="hud-cdone-kicker">{c.t('hud.council.complete')}</span>
        <b class="hud-cdone-name">
          {klass ? <ClassIcon id={klass} size={18} /> : null}
          {c.t(def.nameKey)}
        </b>
        <span class="hud-cdone-desc">{c.t(def.descKey)}</span>
      </span>
    </button>
  );
}
