/**
 * The HUD top bar (DESIGN A9.2, 12% of the height):
 * - left: your base HP, age medallion with a "You" tag, the XP bar ("XP 180/250") and the round
 *   Evolve button at its end (56 px, 48 px on phones). When ready it turns gold with a steady glow,
 *   shows the next age's icon and says "Evolve!" (A2.4: it never flashes);
 * - centre: match clock with the Overdrive / Siege marks, "Overdrive in 0:45" under it, and the
 *   front-line strip (your colour against theirs, showing where the fighting is). The training match
 *   has no clock, only the strip;
 * - right: the AI opponent's nameplate (robot icon and "AI" chip, A7.1), base HP, XP, age icon with
 *   its power charge ring, a horn while their Last Stand is armed, the "Scouted (n)" chip (from
 *   match 3), emotes, pause and speed.
 *
 * Every hit on a base kicks that side's panel (flash and shake), so it is clear who is winning.
 */
import type { AgeId, CardId, EmoteId } from '@/contracts';
import { useEffect, useRef, useState } from 'preact/hooks';
import type { HudCtx } from './context';
import { AgeGlyph, EmoteGlyph, HornIcon, PauseIcon, PlayIcon, RobotIcon, SmileIcon, SpeedIcon } from './icons';
import { ageIds, clockView, evolveIntent, formatClock, frontStrip, powerFraction, xpProgress, type FrontLine } from './model';
import { usePortrait } from './usePortrait';

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

function Medallion(p: { age: AgeId; team: 'me' | 'foe'; ring?: number; horn?: boolean; hornLabel?: string; tag?: string }) {
  const ring = p.ring;
  return (
    <div class={`hud-medal hud-medal-${p.team} age-${p.age}${ring !== undefined && ring >= 1 ? ' is-charged' : ''}`}>
      {ring !== undefined ? <i class="hud-medal-ring" style={{ '--charge': ring }} /> : null}
      <span class="hud-medal-core">
        <AgeGlyph age={p.age} size={26} />
      </span>
      {p.tag ? <span class="hud-medal-tag">{p.tag}</span> : null}
      {p.horn ? (
        <span class="hud-horn" data-testid="hud-foe-horn" title={p.hornLabel}>
          <HornIcon size={18} />
        </span>
      ) : null}
    </div>
  );
}

function ScoutedItem(p: { c: HudCtx; card: CardId }) {
  const url = usePortrait(p.c.portrait, p.card, 'none', 40);
  const def = p.c.config.content.units[p.card] ?? p.c.config.content.turrets[p.card] ?? p.c.config.content.powers[p.card];
  return (
    <li class="hud-scouted-item">
      <span class="hud-scouted-pic">{url ? <img src={url} alt="" /> : null}</span>
      <span>{def ? p.c.t(def.nameKey) : p.card}</span>
    </li>
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
  return (
    <div class="hud-scouted">
      <button
        class="hud-chip hud-scouted-chip"
        data-testid="hud-scouted"
        aria-expanded={open}
        onClick={() => {
          c.audio?.play('ui_click');
          setOpen(!open);
        }}
      >
        {c.t('hud.scouted', { n: list.length })}
      </button>
      {open ? (
        <div class="hud-dropdown" data-testid="hud-scouted-list">
          <div class="hud-dropdown-title">{c.t('hud.scoutedTitle')}</div>
          {list.length === 0 ? <div class="hud-dropdown-empty">{c.t('hud.scoutedNone')}</div> : <ul>{list.map((card) => <ScoutedItem key={card} c={c} card={card} />)}</ul>}
        </div>
      ) : null}
    </div>
  );
}

function EmoteButton(p: { c: HudCtx; onEmote: (e: EmoteId) => void }) {
  const { c } = p;
  const [open, setOpen] = useState(false);
  const [cooling, setCooling] = useState(false);
  const cooldownMs = c.config.content.economy.emoteCooldownMs;
  useEffect(() => {
    if (!cooling) return;
    const id = setTimeout(() => setCooling(false), cooldownMs);
    return () => clearTimeout(id);
  }, [cooling, cooldownMs]);
  const off = c.readOnly || c.m.phase === 'ended';
  return (
    <div class="hud-emote">
      <button
        class={`hud-round hud-round--small hud-emote-btn${cooling ? ' is-cooling' : ''}${c.denied('emote') ? ' is-denied' : ''}`}
        data-testid="hud-emote"
        aria-label={c.t('hud.emote')}
        aria-expanded={open}
        disabled={off}
        onClick={() => {
          if (cooling) {
            c.act({ k: 'deny', target: 'emote' });
            return;
          }
          c.audio?.play('ui_click');
          setOpen(!open);
        }}
      >
        <SmileIcon size={18} />
      </button>
      {open && !off ? (
        <div class="hud-emote-picker" role="menu" data-testid="hud-emote-picker">
          {EMOTES.map((e) => (
            <button
              key={e}
              role="menuitem"
              class="hud-emote-pick"
              title={c.t(`emote.${e}.name`)}
              aria-label={c.t(`emote.${e}.name`)}
              onClick={() => {
                setOpen(false);
                setCooling(true);
                p.onEmote(e);
              }}
            >
              <EmoteGlyph emote={e} size={30} />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/** The round Evolve button at the end of your XP bar (audit #4). */
function EvolveButton(p: { c: HudCtx; nextAge: AgeId | undefined; progress: number }) {
  const { c } = p;
  const { m, t } = c;
  const ready = m.me.evolveReady;
  const label = m.me.ascending ? t('hud.evolving') : ready ? t('hud.evolveReady') : t('hud.evolve');
  return (
    <button
      class={`hud-evolve${ready ? ' is-ready' : ''}${m.me.ascending ? ' is-ascending' : ''}${c.denied('evolve') ? ' is-denied' : ''}`}
      data-testid="hud-evolve"
      data-ready={ready}
      aria-disabled={!ready}
      aria-label={label}
      disabled={c.readOnly}
      style={{ '--xp': Math.max(0, Math.min(1, p.progress)) }}
      onClick={() => c.act(evolveIntent(m, c.side))}
    >
      <i class="hud-evolve-ring" />
      <span class="hud-evolve-disc">{p.nextAge ? <AgeGlyph age={p.nextAge} size={c.compact ? 26 : 32} /> : null}</span>
      <span class="hud-evolve-label">{label}</span>
      {c.keys ? <kbd class="hud-key">E</kbd> : null}
    </button>
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
}) {
  const { c } = p;
  const { m, t } = c;
  const ages = ageIds(c.config.content);
  const myAge = ages[m.me.ageIndex] ?? 'stone';
  const foeAge = ages[m.foe.ageIndex] ?? 'stone';
  const nextAge = ages[m.me.ageIndex + 1];
  const fmt = c.config.content.formats[c.config.format];
  const finalAge = !fmt || m.me.ageIndex >= fmt.ages.length - 1;
  const clock = clockView(m);
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
  useKick(meEl, p.hits[mySide], HIT_FRAMES, 280);
  useKick(foeEl, p.hits[foeSide], HIT_FRAMES, 280);
  const next = clock.nextPhase && clock.nextPhase.kind !== 'finalBell' ? clock.nextPhase : null;

  return (
    <div class="hud-top">
      <div ref={meEl} class="hud-panel hud-side hud-me" data-testid="hud-me">
        <Medallion age={myAge} team="me" tag={t('hud.you')} />
        <div class="hud-bars">
          <HpBar bp={m.me.baseHpBp} team="me" label={t('hud.baseHp')} />
          <div class="hud-xp-row" ref={p.xpRef}>
            <XpBar
              bp={m.me.xpBp}
              team="me"
              ready={m.me.evolveReady}
              label={t('hud.xp')}
              text={xp ? t('hud.xpText', { xp: xp.xp, need: xp.need }) : t('hud.finalAge')}
            />
          </div>
        </div>
        {finalAge ? null : <EvolveButton c={c} nextAge={nextAge} progress={m.me.xpBp / 10000} />}
        {myBubble ? (
          <div key={myBubble.id} class="hud-bubble hud-bubble-me" data-testid="hud-bubble-me">
            <EmoteGlyph emote={myBubble.emote} size={34} />
          </div>
        ) : null}
      </div>

      <div class="hud-center">
        {clock.progress !== null ? (
          <div class={`hud-clock phase-${m.phase}`} data-testid="hud-clock" aria-label={t('hud.clockLabel')}>
            <div class="hud-clock-text">{clock.text}</div>
            <div class="hud-timeline">
              <i class="hud-timeline-fill" style={{ width: `${clock.progress * 100}%` }} />
              {clock.marks.map((mk) => (
                <i key={mk.kind} class={`hud-mark hud-mark-${mk.kind}`} style={{ left: `${mk.at * 100}%` }} title={t(`hud.phase.${mk.kind}`)} />
              ))}
            </div>
            {phaseKey ? (
              <div class="hud-phase-tag">{t(phaseKey)}</div>
            ) : next ? (
              <div class={`hud-next-phase is-${next.kind}`} data-testid="hud-next-phase">
                {t(`hud.nextPhase.${next.kind}`, { time: formatClock(next.inMs) })}
              </div>
            ) : null}
          </div>
        ) : null}
        <FrontStripView front={p.front} label={t('hud.frontLabel')} />
      </div>

      <div class="hud-right">
        <div ref={foeEl} class="hud-panel hud-side hud-foe" data-testid="hud-foe">
          <div class="hud-bars">
            <div class="hud-name hud-name-foe">
              {/* The foe is always an AI in a live battle (A7.1); in a replay shown from the AI's side
                  the "foe" is the human player, who gets no chip. */}
              {c.config.sides[c.side === 0 ? 1 : 0].isBot ? (
                <span class="hud-ai-chip" data-testid="hud-ai-chip">
                  <RobotIcon size={14} />
                  {t('hud.ai')}
                </span>
              ) : null}
              <span class="hud-name-text">{m.foe.label}</span>
            </div>
            <HpBar bp={m.foe.baseHpBp} team="foe" label={t('hud.baseHp')} />
            <XpBar bp={m.foe.xpBp} team="foe" ready={false} label={t('hud.xp')} />
            {foeBanner ? (
              <div key={foeBanner.id} class="hud-banner hud-banner-foe">
                {t(`age.${foeBanner.age}.name`)}
              </div>
            ) : null}
          </div>
          <Medallion age={foeAge} team="foe" ring={powerFraction(m.foe.powerPpm)} horn={m.foe.lastStandArmed} hornLabel={t('hud.lastStand')} />
          {foeBubble ? (
            <div key={foeBubble.id} class="hud-bubble hud-bubble-foe" data-testid="hud-bubble-foe">
              <EmoteGlyph emote={foeBubble.emote} size={34} />
            </div>
          ) : null}
        </div>
        <div class="hud-controls">
          {p.controls ? (
            <div class="hud-buttons">
              {c.compact ? null : <EmoteButton c={c} onEmote={(emote) => c.act({ k: 'command', cmd: { t: 'emote', side: c.side, emote }, target: 'emote' })} />}
              <button class="hud-round" data-testid="hud-pause" aria-label={m.paused ? t('hud.resume') : t('hud.pause')} disabled={c.readOnly} onClick={p.onPause}>
                {m.paused ? <PlayIcon size={20} /> : <PauseIcon size={20} />}
              </button>
              <button class="hud-round hud-speed" data-testid="hud-speed" aria-label={t('hud.speedLabel')} data-speed={m.speed} disabled={c.readOnly} onClick={p.onSpeed}>
                <SpeedIcon size={16} />
                <span>{t('hud.speed', { s: m.speed })}</span>
              </button>
            </div>
          ) : null}
          {p.scouted ? <Scouted c={c} /> : null}
        </div>
      </div>
    </div>
  );
}
