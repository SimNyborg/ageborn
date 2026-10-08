/**
 * The HUD top band (DESIGN A9.2; docs/ui-plan.md 4.7: 44 px on phones, 56 on desktops). Status
 * along the top, actions along the bottom:
 * - left: your block, the age icon at its outer end, the base HP bar (14 px, the percentage at 12 px)
 *   and under it the XP bar with "XP 180/250" beside it. Evolve moved to the tray's left cluster
 *   (UA-05) and the "You" tag is gone (the lowest-value label, 6.5);
 * - centre: the match clock (16 px bold) with the Overdrive / Siege marks and "Overdrive in 0:45",
 *   and the emote button. Under the band hangs the minimap strip with the base and front buttons
 *   (A17.5; `Minimap.tsx`); without a view that draws one (tests, the state gallery) the front-line
 *   strip shows instead. The training match has no clock;
 * - right: the AI opponent's block (the "AI" chip and robot, A7.1, their name, base HP, XP, their two
 *   power rings (A2.9.10: the reload arc is public, "?" until that power is first cast, a steady orange
 *   rim when reloaded, a drain when they cast), the age icon, a horn while their Last Stand is armed,
 *   their research ring; A18.5.1: research is public), then the "Scouted (n)" chip (from match 3),
 *   pause and speed (36 px faces with 44 px hit areas, top-right as rare actions, T3).
 *
 * Every hit on a base kicks that side's block (flash and shake), so it is clear who is winning.
 */
import { unitClass, type ClassGlyphId } from '@/core/cardClass';
import { FortKindBadge, FortKindGlyph } from '../components/FortGlyphs';
import { ClassIcon, CLASS_NAME_KEY } from '../components/ClassIcon';
import type { AgeId, CardId, EmoteId, HudFoePowerSlot, PowerSlot } from '@/contracts';
import { SlotGlyph } from '../components/PowerGlyphs';
import { reachLabel } from '../components/powerInfo';
import { useEffect, useRef, useState } from 'preact/hooks';
import type { HudCtx } from './context';
import { EmoteBubble, EmoteButton } from './EmoteWheel';
import { AgeGlyph, EyeIcon, HornIcon, PauseIcon, PlayIcon, RobotIcon } from './icons';
import { Minimap } from './Minimap';
import { ageIds, clockView, escalationView, formatClock, frontStrip, powerFraction, ropeView, xpProgress, type ClockView, type EscalationView, type FrontLine, type RopeView } from './model';
import { CoinIcon } from './icons';
import { usePortrait } from './usePortrait';
import { PickBadge } from './councilIcons';
import { secondsLeft } from './council';
import { useFitLabel } from './fit';
import { withoutAiPrefix } from '../components/format';

export const EMOTES: readonly EmoteId[] = ['laugh', 'salute', 'cry', 'angry', 'thumbsUp', 'gg'];
export const SCOUTED_COLLAPSE_MS = 3000;

function pct(bp: number): number {
  return Math.max(0, Math.min(100, bp / 100));
}

/** Plays a short Web Animation on `ref` every time `seq` grows (base hit kick, evolve pop). */
export function useKick(ref: { current: HTMLElement | null }, seq: number, frames: Keyframe[], ms: number): void {
  const last = useRef(seq);
  useEffect(() => {
    if (seq === last.current) return;
    last.current = seq;
    const el = ref.current;
    if (el && typeof el.animate === 'function') el.animate(frames, { duration: ms, easing: 'ease-out' });
    // The keyframes and duration are constant per call site.
  }, [seq]);
}

const HIT_FRAMES: Keyframe[] = [
  { transform: 'translate(0, 0)', filter: 'brightness(1)' },
  { transform: 'translate(-4px, 1px)', filter: 'brightness(1.7)' },
  { transform: 'translate(4px, -1px)', filter: 'brightness(1.4)' },
  { transform: 'translate(-2px, 0)', filter: 'brightness(1.15)' },
  { transform: 'translate(0, 0)', filter: 'brightness(1)' },
];

function HpBar(p: { bp: number; team: 'me' | 'foe'; label: string }) {
  const w = pct(p.bp);
  return (
    <div
      class={`hud-hp hud-hp-${p.team}${w < 25 ? ' is-low' : ''}`}
      role="meter"
      aria-label={p.label}
      aria-valuenow={Math.round(w)}
      aria-valuemin={0}
      aria-valuemax={100}
      data-testid={`hud-hp-${p.team}`}
    >
      <i class="hud-hp-ghost" style={{ width: `${w}%` }} />
      <i class="hud-hp-fill" style={{ width: `${w}%` }} />
      <span class="hud-hp-text">{Math.ceil(w)}%</span>
    </div>
  );
}

function XpBar(p: { bp: number; team: 'me' | 'foe'; ready: boolean; label: string; text?: string | null }) {
  const w = pct(p.bp);
  return (
    <div class={`hud-xp hud-xp-${p.team}${p.ready ? ' is-ready' : ''}${p.text ? ' has-text' : ''}`} role="meter" aria-label={p.label} aria-valuenow={Math.round(w)}>
      <i class="hud-xp-fill" style={{ width: `${w}%` }} />
      {p.text ? <span class="hud-xp-text">{p.text}</span> : null}
    </div>
  );
}

function Medallion(p: { age: AgeId; team: 'me' | 'foe'; ring?: number; horn?: boolean; hornLabel?: string; label: string }) {
  const ring = p.ring;
  return (
    <div class={`hud-medal hud-medal-${p.team} age-${p.age}${ring !== undefined && ring >= 1 ? ' is-charged' : ''}`} role="img" aria-label={p.label} title={p.label}>
      {ring !== undefined ? <i class="hud-medal-ring" style={{ '--charge': ring }} /> : null}
      <span class="hud-medal-core">
        <AgeGlyph age={p.age} size={26} />
      </span>
      {p.horn ? (
        <span class="hud-horn" data-testid="hud-foe-horn" title={p.hornLabel}>
          <HornIcon size={18} />
        </span>
      ) : null}
    </div>
  );
}

function ScoutedItem(p: { c: HudCtx; card: CardId }) {
  // A fort shares its id with its hidden twin unit (A16.14.8): read the fort first.
  const fort = p.c.config.content.forts?.[p.card];
  const url = usePortrait(p.c.portrait, fort ? null : p.card, 'none', 40);
  const def = fort ?? p.c.config.content.units[p.card] ?? p.c.config.content.turrets[p.card] ?? p.c.config.content.powers[p.card];
  const cls: ClassGlyphId | null = !def ? null : def.kind === 'unit' ? unitClass(def) : def.kind;
  return (
    <li class="hud-scouted-item">
      <span class="hud-scouted-pic">{fort ? <FortKindBadge kind={fort.fortKind} size={26} /> : url ? <img src={url} alt="" /> : null}</span>
      <span>{def ? p.c.t(def.nameKey) : p.card}</span>
      {cls ? (
        <span class="hud-scouted-class" data-class={cls}>
          <ClassIcon id={cls} size={20} title={p.c.t(CLASS_NAME_KEY[cls])} />
        </span>
      ) : null}
    </li>
  );
}

/**
 * Their fort recharge (A16.14.7: public, like their power rings): once their fort is scouted, a small
 * fort glyph with its recharge ring sits on the Scouted chip's corner (the band's width does not
 * change); a steady orange rim when ready, never a pulse. A long-press or hover shows the card and the
 * seconds left.
 */
function FoeFortRing(p: { c: HudCtx }) {
  const { c } = p;
  const ring = c.m.fort?.foeRing ?? null;
  const def = ring?.card ? c.config.content.forts?.[ring.card] : undefined;
  const [tip, setTip] = useState(false);
  useEffect(() => {
    if (!tip) return undefined;
    const id = setTimeout(() => setTip(false), 2600);
    return () => clearTimeout(id);
  }, [tip]);
  if (!ring || !def) return null;
  const total = Math.max(1, Math.round((c.m.fort?.rechargeMs ?? 25_000) / 1000));
  const frac = ring.secondsLeft <= 0 ? 1 : Math.max(0, Math.min(1, 1 - ring.secondsLeft / total));
  const ready = ring.secondsLeft <= 0;
  const state = ready ? c.t('hud.fort.foe.ready') : c.t('hud.fort.foe.secs', { s: ring.secondsLeft });
  const label = c.t('hud.fort.foe.label', { name: c.t(def.nameKey), state });
  let press: ReturnType<typeof setTimeout> | null = null;
  return (
    <span
      class={`hud-foe-fort${ready ? ' is-ready' : ''}`}
      data-testid="hud-foe-fort"
      data-ready={ready}
      role="img"
      aria-label={label}
      title={label}
      onPointerDown={() => {
        press = setTimeout(() => setTip(true), 450);
      }}
      onPointerUp={() => {
        if (press) clearTimeout(press);
      }}
      onPointerLeave={() => {
        if (press) clearTimeout(press);
      }}
    >
      <svg class="hud-foe-ring-arc" viewBox="0 0 32 32" aria-hidden="true">
        <circle class="hud-foe-ring-track" cx="16" cy="16" r="13.5" pathLength="100" />
        <circle class="hud-foe-ring-fill" cx="16" cy="16" r="13.5" pathLength="100" style={{ strokeDashoffset: Math.max(0, Math.min(100, 100 - frac * 100)) }} />
      </svg>
      <span class="hud-foe-fort-core">
        <FortKindGlyph kind={def.fortKind} size={12} />
      </span>
      {tip ? (
        <span class="hud-foe-ring-tip" role="tooltip" data-testid="hud-foe-fort-tip">
          <b>{c.t(def.nameKey)}</b>
          <span>
            <CoinIcon size={12} /> {def.cost}
          </span>
          <span>{state}</span>
        </span>
      ) : null}
    </span>
  );
}

function Scouted(p: { c: HudCtx }) {
  const { c } = p;
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const id = setTimeout(() => setOpen(false), SCOUTED_COLLAPSE_MS);
    return () => clearTimeout(id);
  }, [open]);
  const list = c.m.foe.scouted;
  const picks = c.config.content.research.picks;
  const research = (c.m.foe.research?.owned ?? []).flatMap((id) => picks.filter((x) => x.id === id));
  return (
    <div class="hud-scouted">
      <button
        class="hud-chip hud-scouted-chip"
        data-testid="hud-scouted"
        aria-expanded={open}
        aria-label={c.t('hud.scouted', { n: list.length })}
        onClick={() => {
          c.audio?.play('ui_toggle');
          setOpen(!open);
        }}
      >
        <EyeIcon size={18} />
        <span class="hud-scouted-text">{c.t('hud.scoutedShort')}</span>
        <b class="hud-scouted-n">{list.length}</b>
      </button>
      <FoeFortRing c={c} />
      {open ? (
        <div class="hud-dropdown" data-testid="hud-scouted-list">
          {/* "Cards the AI has played"; "Cards they have played" for the online player of Home's Battle. */}
          <div class="hud-dropdown-title">{c.t(c.config.sides[c.side === 0 ? 1 : 0].online ? 'hud.scoutedTitleOnline' : 'hud.scoutedTitle')}</div>
          {list.length === 0 ? <div class="hud-dropdown-empty">{c.t('hud.scoutedNone')}</div> : <ul>{list.map((card) => <ScoutedItem key={card} c={c} card={card} />)}</ul>}
          {research.length > 0 ? (
            <>
              <div class="hud-dropdown-title">{c.t('hud.council.foeTitle')}</div>
              <ul data-testid="hud-scouted-research">
                {research.map((d) => (
                  <li key={d.id} class="hud-scouted-item">
                    <PickBadge def={d} size={28} />
                    <span>{c.t(d.nameKey)}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/** Their research in progress (A18.5.1 public, A18.5.7 "the enemy's research icon and ring"). */
function FoeResearch(p: { c: HudCtx }) {
  const { c } = p;
  const r = c.m.foe.research;
  const def = r?.current ? c.config.content.research.picks.find((x) => x.id === r.current) : undefined;
  if (!r || !def) return null;
  const label = c.t('hud.council.foeResearching', { name: c.t(def.nameKey), s: secondsLeft(r.leftMs) });
  return (
    <span key={def.id} class="hud-foe-research" data-testid="hud-foe-research" style={{ '--prog': r.progressBp / 10000 }} role="img" aria-label={label} title={label}>
      <i class="hud-foe-research-ring" />
      <PickBadge def={def} size={c.compact ? 18 : 22} corner={false} />
    </span>
  );
}

/**
 * One of the opponent's power rings (A2.9.10): the reload arc (its speed is public), "?" until that
 * power's first cast, then its icon; a steady orange rim when reloaded (enemy events never pulse); the
 * ring drains (200 ms) when they cast. A long-press or hover shows name, cost, reach and seconds left.
 */
function FoeRing(p: { c: HudCtx; slot: PowerSlot; s: HudFoePowerSlot }) {
  const { c, slot, s } = p;
  const def = s.card ? c.config.content.powers[s.card] : undefined;
  const url = usePortrait(c.portrait, def ? s.card : null, 'none', 40);
  const frac = powerFraction(s.ppm);
  const ready = frac >= 1;
  const [drain, setDrain] = useState(0);
  const [tip, setTip] = useState(false);
  const last = useRef(s.ppm);
  useEffect(() => {
    const prev = last.current;
    last.current = s.ppm;
    if (prev >= 1_000_000 && s.ppm < prev) setDrain((n) => n + 1);
  }, [s.ppm]);
  useEffect(() => {
    if (!tip) return undefined;
    const id = setTimeout(() => setTip(false), 2600);
    return () => clearTimeout(id);
  }, [tip]);
  const secs = def ? Math.max(0, Math.ceil(((1 - frac) * def.reloadMs) / 1000)) : null;
  const slotName = c.t(`hud.power.slot.${slot}`);
  const state = ready ? c.t('hud.foeRing.ready') : secs !== null ? c.t('hud.foeRing.secs', { s: secs }) : c.t('hud.foeRing.pct', { pct: Math.floor(frac * 100) });
  const label = def ? c.t('hud.foeRing.label', { slot: slotName, name: c.t(def.nameKey), state }) : c.t('hud.foeRing.unknown', { slot: slotName, state });
  const off = Math.max(0, Math.min(100, 100 - frac * 100));
  let press: ReturnType<typeof setTimeout> | null = null;
  return (
    <span
      class={`hud-foe-ring is-${slot}${ready ? ' is-ready' : ''}${def ? ' is-scouted' : ''}`}
      data-testid={`hud-foe-ring-${slot}`}
      data-ready={ready}
      role="img"
      aria-label={label}
      title={label}
      onPointerDown={() => {
        press = setTimeout(() => setTip(true), 450);
      }}
      onPointerUp={() => {
        if (press) clearTimeout(press);
      }}
      onPointerLeave={() => {
        if (press) clearTimeout(press);
      }}
    >
      <svg class="hud-foe-ring-arc" viewBox="0 0 32 32" aria-hidden="true">
        <circle class="hud-foe-ring-track" cx="16" cy="16" r="13.5" pathLength="100" />
        <circle class="hud-foe-ring-fill" cx="16" cy="16" r="13.5" pathLength="100" style={{ strokeDashoffset: off }} />
        {drain > 0 ? <circle key={drain} class="hud-foe-ring-drain" cx="16" cy="16" r="13.5" pathLength="100" /> : null}
      </svg>
      <span class="hud-foe-ring-core">{def ? url ? <img src={url} alt="" draggable={false} /> : <SlotGlyph slot={slot} size={14} /> : <b>?</b>}</span>
      {tip ? (
        <span class="hud-foe-ring-tip" role="tooltip" data-testid={`hud-foe-ring-tip-${slot}`}>
          <b>{def ? c.t(def.nameKey) : c.t('hud.foeRing.unseen')}</b>
          {def ? (
            <span>
              <CoinIcon size={12} /> {def.cost} · {c.t(`hud.power.reach.${reachLabel(def)}`)}
            </span>
          ) : null}
          <span>{state}</span>
        </span>
      ) : null}
    </span>
  );
}

/** Their two rings (Home, Field) inside the enemy block; one ring for older models. */
function FoeRings(p: { c: HudCtx }) {
  const f = p.c.m.foe;
  const rings: { slot: PowerSlot; s: HudFoePowerSlot }[] = f.powers
    ? (['home', 'field'] as const).flatMap((slot) => {
        const s = f.powers?.[slot];
        return s ? [{ slot, s }] : [];
      })
    : [{ slot: 'home', s: { card: null, ppm: f.powerPpm } }];
  if (rings.length === 0) return null;
  return (
    <span class="hud-foe-rings" data-testid="hud-foe-rings">
      {rings.map((r) => (
        <FoeRing key={r.slot} c={p.c} slot={r.slot} s={r.s} />
      ))}
    </span>
  );
}

/** Where the fighting is: your colour from the left, theirs from the right, a spark at the clash. */
function FrontStripView(p: { front: FrontLine | null; label: string }) {
  const s = frontStrip(p.front);
  return (
    <div class="hud-front" data-testid="hud-front" role="img" aria-label={p.label} data-clash={s.clash.toFixed(2)}>
      <i class="hud-front-me" style={{ width: `${s.mine * 100}%` }} />
      <i class="hud-front-foe" style={{ width: `${s.theirs * 100}%` }} />
      <i class="hud-front-clash" style={{ left: `${s.clash * 100}%` }} />
    </div>
  );
}

/**
 * Last Base Standing's clock (A2.10.1, A9.2): it counts up; under it a 6-pip escalation meter (gold
 * Overdrive, red Siege I-III, cracked stone Crumble I-II) and the step's name. A tap drops the public
 * schedule down (like Scouted, it folds away after 3 s and never pauses). No countdown anywhere.
 */
function EscalationClock(p: { c: HudCtx; v: EscalationView }) {
  const { t, m } = p.c;
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const id = setTimeout(() => setOpen(false), SCOUTED_COLLAPSE_MS);
    return () => clearTimeout(id);
  }, [open]);
  const what = (x: EscalationView['pips'][number]) =>
    x.tone === 'overdrive'
      ? t('hud.esc.overdriveWhat')
      : x.tone === 'siege'
        ? t('hud.esc.siegeWhat', { base: x.base, turret: x.turretCut })
        : t('hud.esc.crumbleWhat', { pct: x.crumblePct });
  const tone = [...p.v.pips].reverse().find((x) => x.reached)?.tone ?? 'none';
  return (
    <div class="hud-esc-wrap">
      <button
        type="button"
        class={`hud-clock hud-esc phase-${m.phase} tone-${tone}`}
        data-testid="hud-clock"
        aria-label={t('hud.esc.meterLabel', { step: t(p.v.stepKey) })}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span class="hud-clock-text">{p.v.text}</span>
        <span class="hud-esc-pips" data-testid="hud-esc-pips" aria-hidden="true">
          {p.v.pips.map((x) => (
            <i key={x.key} class={`hud-esc-pip is-${x.tone}${x.reached ? ' is-on' : ''}`} />
          ))}
        </span>
        <span class={`hud-phase-tag hud-esc-tag tone-${tone}`} data-tag data-testid="hud-esc-step" key={p.v.stepKey}>
          {t(p.v.stepKey)}
        </span>
      </button>
      {open ? (
        <div class="hud-esc-drop" role="note" data-testid="hud-esc-schedule">
          <b class="hud-esc-title">{t('hud.esc.title')}</b>
          {p.v.pips.map((x) => (
            <div key={x.key} class={`hud-esc-row is-${x.tone}${x.reached ? ' is-on' : ''}`}>
              <span class="hud-esc-at">{formatClock(x.atMs)}</span>
              <b>{t(`hud.esc.step.${x.key}`)}</b>
              <span>{what(x)}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/**
 * The timed clock of a Short, Medium or Long War with the Siege rope (A2.10.2, A9.2): the countdown and
 * timeline as always, plus a mark where the rope tightens; in Siege the tag names the step ("Siege",
 * "Siege II"). A tap drops the schedule down (Overdrive, Siege with its rope, the tightening, the Final
 * Bell); like Scouted it folds after 3 s and never pauses.
 */
function RopeClock(p: { c: HudCtx; clock: ClockView; rope: RopeView; next: ClockView['nextPhase'] }) {
  const { t, m } = p.c;
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const id = setTimeout(() => setOpen(false), SCOUTED_COLLAPSE_MS);
    return () => clearTimeout(id);
  }, [open]);
  const what = (x: RopeView['rows'][number]) => {
    if (x.key === 'overdrive') return t('hud.esc.overdriveWhat');
    if (x.key === 'bell') return t('hud.rope.bellWhat');
    if (x.key === 'r1') return t('hud.rope.siegeWhat', { base: x.base, turret: x.turretCut, pct: x.crumblePct });
    return x.base > 2 ? t('hud.rope.tightenBaseWhat', { base: x.base, pct: x.crumblePct }) : t('hud.rope.tightenWhat', { pct: x.crumblePct });
  };
  const tag = m.phase === 'siege' && p.rope.stepKey ? p.rope.stepKey : m.phase === 'regulation' || m.phase === 'ended' ? null : `hud.phase.${m.phase}`;
  return (
    <div class="hud-esc-wrap">
      <button
        type="button"
        class={`hud-clock hud-rope phase-${m.phase}${p.rope.step > 1 ? ' is-tight' : ''}`}
        data-testid="hud-clock"
        aria-label={t('hud.rope.clockLabel', { time: p.clock.text })}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span class="hud-clock-text">{p.clock.text}</span>
        <span class="hud-timeline">
          <i class="hud-timeline-fill" style={{ width: `${(p.clock.progress ?? 0) * 100}%` }} />
          {p.clock.marks.map((mk, i) => (
            <i key={`${mk.kind}${i}`} class={`hud-mark hud-mark-${mk.kind}`} style={{ left: `${mk.at * 100}%` }} />
          ))}
        </span>
        {tag ? (
          <span class="hud-phase-tag" data-tag data-testid="hud-rope-step" key={tag}>
            {t(tag)}
          </span>
        ) : p.next ? (
          <span class={`hud-next-phase is-${p.next.kind}`} data-testid="hud-next-phase">
            {t(`hud.nextPhase.${p.next.kind}`, { time: formatClock(p.next.inMs) })}
          </span>
        ) : null}
      </button>
      {open ? (
        <div class="hud-esc-drop" role="note" data-testid="hud-rope-schedule">
          <b class="hud-esc-title">{t('hud.rope.title')}</b>
          {p.rope.rows.map((x) => (
            <div key={x.key} class={`hud-esc-row is-${x.key === 'overdrive' ? 'overdrive' : x.key === 'bell' ? 'bell' : 'crumble'}${x.reached ? ' is-on' : ''}`}>
              <span class="hud-esc-at">{formatClock(x.atMs)}</span>
              <b>{t(`hud.rope.step.${x.key === 'overdrive' ? 'overdrive' : x.key === 'bell' ? 'bell' : x.key === 'r1' ? 'r1' : 'r2'}`)}</b>
              <span>{what(x)}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/** The "Crumbling" chip on a side whose base the Crumble rope takes now (A2.10.1; MR-126 in the HUD). */
function Crumbling(p: { t: HudCtx['t'] }) {
  return (
    <span class="hud-crumbling" data-tag data-testid="hud-crumbling">
      {p.t('hud.esc.crumbling')}
    </span>
  );
}

export interface Bubble {
  id: number;
  side: 0 | 1;
  emote: EmoteId;
}

export interface Banner {
  id: number;
  side: 0 | 1;
  age: AgeId;
}

export function TopBar(p: {
  c: HudCtx;
  bubbles: Bubble[];
  banners: Banner[];
  xpRef: (el: HTMLElement | null) => void;
  /** Shows the pause and speed buttons. */
  controls: boolean;
  onPause: () => void;
  onSpeed: () => void;
  /** Base hits so far per side (each one kicks that side's panel). */
  hits: readonly [number, number];
  front: FrontLine | null;
  /** The "Scouted (n)" chip (hidden for new players, audit #11). */
  scouted: boolean;
  topRef?: (el: HTMLElement | null) => void;
}) {
  const { c } = p;
  const { m, t } = c;
  const ages = ageIds(c.config);
  const myAge = ages[m.me.ageIndex] ?? 'stone';
  const foeAge = ages[m.foe.ageIndex] ?? 'stone';
  const clock = clockView(m);
  const esc = escalationView(m, c.config, c.side);
  const rope = ropeView(m, c.config, c.side);
  // Who the rope takes now: Last Base Standing's Crumble steps or a timed war's Siege rope (A2.10.2).
  const crumbling = esc?.crumbling ?? rope?.crumbling ?? null;
  const mySide = c.side;
  const foeSide = mySide === 0 ? 1 : 0;
  const bubble = (side: 0 | 1) => p.bubbles.filter((b) => b.side === side).slice(-1)[0];
  const foeBanner = p.banners.filter((b) => b.side === foeSide).slice(-1)[0];
  const myBubble = bubble(mySide);
  const foeBubble = bubble(foeSide);
  const phaseKey = m.phase === 'regulation' ? null : `hud.phase.${m.phase}`;
  const xp = xpProgress(m, c.config);
  const meEl = useRef<HTMLDivElement>(null);
  const foeEl = useRef<HTMLDivElement>(null);
  // The foe's name fits its box on phones (condensed, never cut; bug hunt 2026-10-01 #14).
  // A bot shown as the online player of Home's Battle (owner decision 2026-10-07) carries no AI chip.
  const foeConfig = c.config.sides[c.side === 0 ? 1 : 0];
  const foeIsBot = foeConfig.isBot && !foeConfig.online;
  const foeNameBox = useRef<HTMLSpanElement>(null);
  const foeNameEl = useRef<HTMLSpanElement>(null);
  // When even the condensed name does not fit (a long procedural name beside the AI chip and the
  // research rings on a phone), the nameplate shows the given name only: whole words, never cut.
  // The full name stays on the VS screen, Pause and Result.
  const foeFull = foeIsBot ? withoutAiPrefix(m.foe.label) : m.foe.label;
  const [foeShortFor, setFoeShortFor] = useState<string | null>(null);
  const foeShort = foeShortFor === `${foeFull}|${c.compact}`;
  const foeShown = foeShort ? (foeFull.split(' ')[0] ?? foeFull) : foeFull;
  useFitLabel(foeNameEl, () => foeNameBox.current?.clientWidth ?? 0, [foeShown, c.compact], (fits) => {
    if (!fits && !foeShort && foeFull.includes(' ')) setFoeShortFor(`${foeFull}|${c.compact}`);
  });
  useKick(meEl, p.hits[mySide], HIT_FRAMES, 280);
  useKick(foeEl, p.hits[foeSide], HIT_FRAMES, 280);
  const next = clock.nextPhase && clock.nextPhase.kind !== 'finalBell' ? clock.nextPhase : null;

  return (
    <div class="hud-top" ref={p.topRef}>
      <div ref={meEl} class={`hud-panel hud-side hud-me${crumbling?.me ? ' is-crumbling' : ''}`} data-testid="hud-me">
        {crumbling?.me ? <Crumbling t={t} /> : null}
        <Medallion age={myAge} team="me" label={t(`age.${myAge}.name`)} />
        <div class="hud-bars">
          <HpBar bp={m.me.baseHpBp} team="me" label={t('hud.baseHp')} />
          <div class="hud-xp-row" ref={p.xpRef}>
            <XpBar bp={m.me.xpBp} team="me" ready={m.me.evolveReady} label={t('hud.xp')} />
            <span class={`hud-xp-label${m.me.evolveReady ? ' is-ready' : ''}`} data-testid="hud-xp-text">
              {xp ? t('hud.xpText', { xp: xp.xp, need: xp.need }) : t('hud.finalAge')}
            </span>
          </div>
        </div>
        {myBubble ? <EmoteBubble key={myBubble.id} id={myBubble.id} emote={myBubble.emote} side="me" t={t} c={c} /> : null}
      </div>

      <div class="hud-center">
        {esc ? <EscalationClock c={c} v={esc} /> : null}
        {rope && clock.progress !== null ? <RopeClock c={c} clock={clock} rope={rope} next={next} /> : null}
        {!rope && clock.progress !== null ? (
          <div class={`hud-clock phase-${m.phase}`} data-testid="hud-clock" aria-label={t('hud.clockLabel')}>
            <div class="hud-clock-text">{clock.text}</div>
            <div class="hud-timeline">
              <i class="hud-timeline-fill" style={{ width: `${clock.progress * 100}%` }} />
              {clock.marks.map((mk) => (
                <i key={mk.kind} class={`hud-mark hud-mark-${mk.kind}`} style={{ left: `${mk.at * 100}%` }} title={t(`hud.phase.${mk.kind}`)} />
              ))}
            </div>
            {phaseKey ? (
              <div class="hud-phase-tag" data-tag>
                {t(phaseKey)}
              </div>
            ) : next ? (
              <div class={`hud-next-phase is-${next.kind}`} data-testid="hud-next-phase">
                {t(`hud.nextPhase.${next.kind}`, { time: formatClock(next.inMs) })}
              </div>
            ) : null}
          </div>
        ) : null}
        {p.controls ? <EmoteButton c={c} onEmote={(emote) => c.act({ k: 'command', cmd: { t: 'emote', side: c.side, emote }, target: 'emote' })} /> : null}
        {c.view?.minimap ? null : <FrontStripView front={p.front} label={t('hud.frontLabel')} />}
      </div>
      {c.view?.minimap ? <Minimap c={c} /> : null}

      <div ref={foeEl} class={`hud-panel hud-side hud-foe${crumbling?.foe ? ' is-crumbling' : ''}`} data-testid="hud-foe">
        {crumbling?.foe ? <Crumbling t={t} /> : null}
        <div class="hud-bars">
          <div class="hud-name hud-name-foe">
            {/* The foe is an AI in a live battle (A7.1), labelled so unless it is shown as the online
                player of Home's Battle; in a replay shown from the AI's side the "foe" is the human
                player, who gets no chip. */}
            {foeIsBot ? (
              <span class="hud-ai-chip" data-testid="hud-ai-chip" data-tag>
                <RobotIcon size={13} />
                {t('hud.ai')}
              </span>
            ) : null}
            <span class="hud-name-text" ref={foeNameBox}>
              <span class="hud-name-fit" ref={foeNameEl}>
                {foeShown}
              </span>
            </span>
          </div>
          <HpBar bp={m.foe.baseHpBp} team="foe" label={t('hud.baseHp')} />
          <XpBar bp={m.foe.xpBp} team="foe" ready={false} label={t('hud.xp')} />
          {foeBanner ? (
            <div key={foeBanner.id} class="hud-banner hud-banner-foe">
              {t(`age.${foeBanner.age}.name`)}
            </div>
          ) : null}
        </div>
        <FoeRings c={c} />
        <Medallion age={foeAge} team="foe" horn={m.foe.lastStandArmed} hornLabel={t('hud.lastStand')} label={t(`age.${foeAge}.name`)} />
        <FoeResearch c={c} />
        {foeBubble ? <EmoteBubble key={foeBubble.id} id={foeBubble.id} emote={foeBubble.emote} side="foe" t={t} c={c} /> : null}
      </div>
      <div class="hud-controls">
        {p.scouted ? <Scouted c={c} /> : null}
        {p.controls ? (
          <>
            <button class="hud-round" data-testid="hud-pause" aria-label={m.paused ? t('hud.resume') : t('hud.pause')} disabled={c.readOnly} onClick={p.onPause}>
              {m.paused ? <PlayIcon size={18} /> : <PauseIcon size={18} />}
            </button>
            <button class="hud-round hud-speed" data-testid="hud-speed" aria-label={t('hud.speedLabel')} data-speed={m.speed} disabled={c.readOnly} onClick={p.onSpeed}>
              <span>{t('hud.speed', { s: m.speed })}</span>
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}
