/**
 * The battle emote wheel (DESIGN A9.2, A18.9.4): the player's equipped emotes and fixed quotes, the
 * opponent mute, and the bubbles both sides see.
 *
 * - Emotes: up to 8 (starter faces and collected, animated emotes). Quotes: up to 4 fixed, friendly
 *   lines from the content; there is no free text chat anywhere (A5.8, A7.1).
 * - Cooldowns: the sim's emote cooldown (`economy.emoteCooldownMs`) covers every emote and quote;
 *   quotes also wait `quoteCooldownMs` locally so a match never turns into a wall of text.
 * - Mute: one tap mutes the opponent's emotes and quotes for the rest of the match (no bubble, no
 *   sound); the Settings switch mutes every opponent.
 */
import './emoteWheel.css';
import { emoteLabelKey } from '@/content/keys';
import type { BaseEmoteId, EmoteId } from '@/contracts';
import { useEffect, useRef, useState } from 'preact/hooks';
import { CosmeticImage } from '../components/cosmeticArt';
import type { EmoteWheel, HudCtx } from './context';
import { EmoteGlyph, SmileIcon } from './icons';

export const STARTER_EMOTES: readonly BaseEmoteId[] = ['laugh', 'salute', 'cry', 'angry', 'thumbsUp', 'gg'];

const DEFAULT_WHEEL: EmoteWheel = { emotes: STARTER_EMOTES, quotes: [], quoteCooldownMs: 8000 };

const isStarter = (e: EmoteId): e is BaseEmoteId => (STARTER_EMOTES as readonly string[]).includes(e);
const isQuote = (e: EmoteId): boolean => e.startsWith('quote.');

/** What a bubble or a wheel button shows for an emote id. */
export function EmoteArt(p: { emote: EmoteId; size: number; t: HudCtx['t'] }) {
  if (isStarter(p.emote)) return <EmoteGlyph emote={p.emote} size={p.size} />;
  if (isQuote(p.emote)) return <span class="hud-quote-text">{p.t(emoteLabelKey(p.emote))}</span>;
  return (
    <span class="hud-emote-art" style={{ width: `${p.size}px`, height: `${p.size}px` }}>
      <CosmeticImage item={p.emote} />
    </span>
  );
}

/** A side's bubble over its panel. */
export function EmoteBubble(p: { id: number; emote: EmoteId; side: 'me' | 'foe'; t: HudCtx['t'] }) {
  const quote = isQuote(p.emote);
  return (
    <div key={p.id} class={`hud-bubble hud-bubble-${p.side}${quote ? ' hud-bubble--quote' : ''}`} data-testid={`hud-bubble-${p.side}`}>
      <EmoteArt emote={p.emote} size={34} t={p.t} />
    </div>
  );
}

/** A flag that stays on for `ms` after `start()`. */
function useCooldown(ms: number): [boolean, () => void] {
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (!on) return;
    const id = setTimeout(() => setOn(false), ms);
    return () => clearTimeout(id);
  }, [on, ms]);
  return [on, () => setOn(true)];
}

export function EmoteButton(p: { c: HudCtx; onEmote: (e: EmoteId) => void }) {
  const { c } = p;
  const wheel = c.wheel ?? DEFAULT_WHEEL;
  const [open, setOpen] = useState(false);
  const [cooling, startCooling] = useCooldown(c.config.content.economy.emoteCooldownMs);
  const [quoteCooling, startQuoteCooling] = useCooldown(Math.max(c.config.content.economy.emoteCooldownMs, wheel.quoteCooldownMs));
  const [muted, setMuted] = useState(() => c.view?.emotesMuted?.() ?? false);
  const off = c.readOnly || c.m.phase === 'ended';
  const root = useRef<HTMLDivElement>(null);
  // Bug hunt 2026-10-01 #13: the picker closes on Esc (without also pausing), on any tap outside it
  // (the lane, the minimap, Pause) and when the battle pauses.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      e.stopPropagation();
      setOpen(false);
    };
    const onDown = (e: PointerEvent): void => {
      if (root.current && e.target instanceof Node && root.current.contains(e.target)) return;
      setOpen(false);
    };
    window.addEventListener('keydown', onKey, { capture: true });
    window.addEventListener('pointerdown', onDown, { capture: true });
    return () => {
      window.removeEventListener('keydown', onKey, { capture: true });
      window.removeEventListener('pointerdown', onDown, { capture: true });
    };
  }, [open]);
  useEffect(() => {
    if (c.m.paused) setOpen(false);
  }, [c.m.paused]);
  const send = (e: EmoteId) => {
    setOpen(false);
    startCooling();
    if (isQuote(e)) startQuoteCooling();
    p.onEmote(e);
  };
  const mute = () => {
    const next = !muted;
    setMuted(next);
    c.view?.muteEmotes?.(next);
    c.audio?.play('ui_click');
  };
  return (
    <div class="hud-emote" ref={root}>
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
        <div class="hud-emote-picker hud-wheel" role="menu" data-testid="hud-emote-picker">
          <div class="hud-wheel-emotes">
            {wheel.emotes.map((e, i) => (
              <button
                key={e}
                role="menuitem"
                class="hud-emote-pick"
                style={{ animationDelay: `${i * 22}ms` }}
                title={c.t(emoteLabelKey(e))}
                aria-label={c.t(emoteLabelKey(e))}
                data-testid={`hud-pick-${e}`}
                onClick={() => send(e)}
              >
                <EmoteArt emote={e} size={30} t={c.t} />
              </button>
            ))}
          </div>
          {wheel.quotes.length > 0 ? (
            <div class={`hud-wheel-quotes${quoteCooling ? ' is-cooling' : ''}`}>
              {wheel.quotes.map((q, i) => (
                <button
                  key={q}
                  role="menuitem"
                  class="hud-quote-pick"
                  style={{ animationDelay: `${80 + i * 30}ms` }}
                  disabled={quoteCooling}
                  data-testid={`hud-pick-${q}`}
                  onClick={() => send(q)}
                >
                  {c.t(emoteLabelKey(q))}
                </button>
              ))}
            </div>
          ) : null}
          <button role="menuitemcheckbox" aria-checked={muted} class={`hud-mute${muted ? ' is-on' : ''}`} data-testid="hud-mute" onClick={mute}>
            {muted ? c.t('cosmetic.hud.unmute') : c.t('cosmetic.hud.mute')}
          </button>
        </div>
      ) : null}
    </div>
  );
}
