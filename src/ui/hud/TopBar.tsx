/**
 * The HUD top bar (DESIGN A9.2, 12% of the height):
 * - left: your base HP, age icon and XP bar with the Evolve button attached (steady glow when ready,
 *   never flashing, A2.4);
 * - centre: match clock with the Overdrive / Siege marks on the timeline, and the emote button;
 * - right: the AI opponent's nameplate (robot icon and "AI" chip, A7.1), base HP, XP, age icon with
 *   its power charge ring, a horn while their Last Stand is armed, the "Scouted (n)" chip with its
 *   drop-down (collapses after 3 s), pause and speed.
 */
import type { AgeId, CardId, EmoteId } from '@/contracts';
import { useEffect, useState } from 'preact/hooks';
import type { HudCtx } from './context';
import { AgeGlyph, EmoteGlyph, HornIcon, PauseIcon, PlayIcon, RobotIcon, SmileIcon, SpeedIcon } from './icons';
import { ageIds, clockView, evolveIntent, powerFraction } from './model';
import { usePortrait } from './usePortrait';

export const EMOTES: readonly EmoteId[] = ['laugh', 'salute', 'cry', 'angry', 'thumbsUp', 'gg'];
export const SCOUTED_COLLAPSE_MS = 3000;

function pct(bp: number): number {
  return Math.max(0, Math.min(100, bp / 100));
}

function HpBar(p: { bp: number; team: 'me' | 'foe'; label: string }) {
  const w = pct(p.bp);
  return (
    <div class={`hud-hp hud-hp-${p.team}`} role="meter" aria-label={p.label} aria-valuenow={Math.round(w)} aria-valuemin={0} aria-valuemax={100}>
      <i class="hud-hp-ghost" style={{ width: `${w}%` }} />
      <i class="hud-hp-fill" style={{ width: `${w}%` }} />
      <span class="hud-hp-text">{Math.ceil(w)}%</span>
    </div>
  );
}

function XpBar(p: { bp: number; team: 'me' | 'foe'; ready: boolean; label: string }) {
  const w = pct(p.bp);
  return (
    <div class={`hud-xp hud-xp-${p.team}${p.ready ? ' is-ready' : ''}`} role="meter" aria-label={p.label} aria-valuenow={Math.round(w)}>
      <i class="hud-xp-fill" style={{ width: `${w}%` }} />
    </div>
  );
}

function Medallion(p: { age: AgeId; team: 'me' | 'foe'; ring?: number; horn?: boolean; hornLabel?: string }) {
  const ring = p.ring;
  return (
    <div class={`hud-medal hud-medal-${p.team} age-${p.age}${ring !== undefined && ring >= 1 ? ' is-charged' : ''}`}>
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
        class={`hud-round hud-emote-btn${cooling ? ' is-cooling' : ''}${c.denied('emote') ? ' is-denied' : ''}`}
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
        <SmileIcon size={22} />
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
  const banner = (side: 0 | 1) => p.banners.filter((b) => b.side === side).slice(-1)[0];
  const myBubble = bubble(mySide);
  const foeBubble = bubble(foeSide);
  const myBanner = banner(mySide);
  const foeBanner = banner(foeSide);
  const phaseKey = m.phase === 'regulation' ? null : `hud.phase.${m.phase}`;

  return (
    <div class="hud-top">
      <div class="hud-panel hud-side hud-me" data-testid="hud-me">
        <Medallion age={myAge} team="me" />
        <div class="hud-bars">
          <div class="hud-name">
            <span class="hud-name-text">{t('hud.you')}</span>
          </div>
          <HpBar bp={m.me.baseHpBp} team="me" label={t('hud.baseHp')} />
          <div class="hud-xp-row" ref={p.xpRef}>
            <XpBar bp={m.me.xpBp} team="me" ready={m.me.evolveReady} label={t('hud.xp')} />
            {finalAge ? (
              <span class="hud-overcharge">{t('hud.overcharge')}</span>
            ) : (
              <button
                class={`hud-evolve${m.me.evolveReady ? ' is-ready' : ''}${m.me.ascending ? ' is-ascending' : ''}${c.denied('evolve') ? ' is-denied' : ''}`}
                data-testid="hud-evolve"
                data-ready={m.me.evolveReady}
                aria-disabled={!m.me.evolveReady}
                disabled={c.readOnly}
                onClick={() => c.act(evolveIntent(m, c.side))}
              >
                {nextAge ? <AgeGlyph age={nextAge} size={18} /> : null}
                <span>{m.me.ascending ? t('hud.evolving') : t('hud.evolve')}</span>
                {c.compact ? null : <kbd class="hud-key">E</kbd>}
              </button>
            )}
          </div>
          {myBanner ? (
            <div key={myBanner.id} class="hud-banner hud-banner-me">
              {t(`age.${myBanner.age}.name`)}
            </div>
          ) : null}
        </div>
        {myBubble ? (
          <div key={myBubble.id} class="hud-bubble hud-bubble-me" data-testid="hud-bubble-me">
            <EmoteGlyph emote={myBubble.emote} size={34} />
          </div>
        ) : null}
      </div>

      <div class="hud-center">
        <div class={`hud-clock phase-${m.phase}`} data-testid="hud-clock" aria-label={t('hud.clockLabel')}>
          <div class="hud-clock-text">{clock.text}</div>
          {clock.progress !== null ? (
            <div class="hud-timeline">
              <i class="hud-timeline-fill" style={{ width: `${clock.progress * 100}%` }} />
              {clock.marks.map((mk) => (
                <i key={mk.kind} class={`hud-mark hud-mark-${mk.kind}`} style={{ left: `${mk.at * 100}%` }} title={t(`hud.phase.${mk.kind}`)} />
              ))}
            </div>
          ) : null}
          {phaseKey ? <div class="hud-phase-tag">{t(phaseKey)}</div> : null}
        </div>
        <EmoteButton c={c} onEmote={(emote) => c.act({ k: 'command', cmd: { t: 'emote', side: c.side, emote }, target: 'emote' })} />
      </div>

      <div class="hud-right">
        <div class="hud-panel hud-side hud-foe" data-testid="hud-foe">
          <div class="hud-bars">
            <div class="hud-name hud-name-foe">
              <span class="hud-ai-chip" data-testid="hud-ai-chip">
                <RobotIcon size={14} />
                {t('hud.ai')}
              </span>
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
          <Scouted c={c} />
          {p.controls ? (
            <div class="hud-buttons">
              <button class="hud-round" data-testid="hud-pause" aria-label={m.paused ? t('hud.resume') : t('hud.pause')} disabled={c.readOnly} onClick={p.onPause}>
                {m.paused ? <PlayIcon size={20} /> : <PauseIcon size={20} />}
              </button>
              <button class="hud-round hud-speed" data-testid="hud-speed" aria-label={t('hud.speedLabel')} data-speed={m.speed} disabled={c.readOnly} onClick={p.onSpeed}>
                <SpeedIcon size={16} />
                <span>{t('hud.speed', { s: m.speed })}</span>
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
