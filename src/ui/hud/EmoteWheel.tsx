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
import type { AvatarSpec, BaseEmoteId, EmoteId, Rarity } from '@/contracts';
import { fnv1a32 } from '@/core';
import { useEffect, useRef, useState } from 'preact/hooks';
import { Avatar, generalLook, type ResolvedLook } from '../components/Avatar';
import { EmoteHead } from '../components/avatar/EmoteHead';
import { CosmeticImage, QuoteBubble } from '../components/cosmeticArt';
import type { EmoteWheel, HudCtx } from './context';
import { EmoteGlyph, SmileIcon } from './icons';

export const STARTER_EMOTES: readonly BaseEmoteId[] = ['laugh', 'salute', 'cry', 'angry', 'thumbsUp', 'gg'];

const DEFAULT_WHEEL: EmoteWheel = { emotes: STARTER_EMOTES, quotes: [], quoteCooldownMs: 8000 };

const isStarter = (e: EmoteId): e is BaseEmoteId => (STARTER_EMOTES as readonly string[]).includes(e);
const isQuote = (e: EmoteId): boolean => e.startsWith('quote.');

/** Who performs a starter emote: a saved General (yours, an online player's) or a look (an AI General's). */
export type EmoteSpeaker = { spec: AvatarSpec } | { look: ResolvedLook } | null;

/**
 * What a bubble or a wheel button shows for an emote id. A starter emote is the speaker's General
 * performing it (PLAN 2a; the same `EmoteHead` as Customize), or the plain face where nobody is known
 * (a replay, the dev gallery). A collected emote plays its own art; `still` (Reduce motion) shows key poses.
 */
export function EmoteArt(p: { emote: EmoteId; size: number; t: HudCtx['t']; speaker?: EmoteSpeaker; still?: boolean }) {
  if (isStarter(p.emote)) {
    const who = p.speaker ?? null;
    if (!who) return <EmoteGlyph emote={p.emote} size={p.size} />;
    return <EmoteHead emote={p.emote} size={p.size} still={!!p.still} {...('spec' in who ? { spec: who.spec } : { look: who.look })} />;
  }
  if (isQuote(p.emote)) return <span class="hud-quote-text">{p.t(emoteLabelKey(p.emote))}</span>;
  return (
    <span class="hud-emote-art" style={{ width: `${p.size}px`, height: `${p.size}px` }}>
      <CosmeticImage item={p.emote} animate={!p.still} />
    </span>
  );
}

/**
 * True when motion is off for this HUD: the Settings switch (the HUD mirrors the app root's
 * `data-reduce-motion`) or the OS preference. Read once the element is on the page.
 */
function useStill(el: { current: Element | null }): boolean {
  const [still, setStill] = useState(false);
  useEffect(() => {
    const host = el.current?.closest('[data-reduce-motion]');
    const os = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    setStill(os || (!!host && host.getAttribute('data-reduce-motion') !== 'false'));
  }, []);
  return still;
}

/**
 * The opponent's General, whose head performs the opponent's emotes: an online player's own look, else
 * the AI General's fixed look (`foeGeneral`, given by the app with the wheel; the seed matches
 * `GeneralPortrait`), else nobody (the plain face).
 */
function foeSpeaker(c: HudCtx | undefined): EmoteSpeaker {
  if (!c) return null;
  const foe = c.config.sides[c.side === 0 ? 1 : 0];
  if (foe?.online?.avatar) return { spec: foe.online.avatar };
  const general = (c.wheel as (EmoteWheel & { foeGeneral?: string }) | undefined)?.foeGeneral;
  return general ? { look: generalLook(general, fnv1a32(`${general}|${foe?.label ?? ''}`)) } : null;
}

/** A quote's rarity from the content (Common when unknown). */
export function quoteRarity(c: Pick<HudCtx, 'config'> | undefined, id: EmoteId): Rarity {
  const items = (c?.config.content.cosmetics as { collections?: { items?: readonly { collection: string; id: string; rarity: Rarity }[] } } | null | undefined)?.collections?.items;
  return items?.find((x) => `${x.collection}.${x.id}` === id)?.rarity ?? 'common';
}

/**
 * Who says a quote (PLAN 2a: the bubble shows the speaker's General head): your own General (the app
 * passes it with the wheel), an online player's General, and no head for a labelled AI opponent.
 */
function speakerOf(c: HudCtx | undefined, side: 'me' | 'foe'): AvatarSpec | undefined {
  if (!c) return undefined;
  if (side === 'me') return c.wheel?.speaker;
  return c.config.sides[c.side === 0 ? 1 : 0]?.online?.avatar;
}

/**
 * A side's bubble over its panel. A quote shows in the battle speech bubble (PLAN 2a "Quotes") with the
 * speaker's General head and its rarity edge; a Legendary line glows gold. `c` gives both (optional so
 * the replay viewer and tests can show a plain bubble).
 */
export function EmoteBubble(p: { id: number; emote: EmoteId; side: 'me' | 'foe'; t: HudCtx['t']; c?: HudCtx }) {
  const quote = isQuote(p.emote);
  const root = useRef<HTMLDivElement>(null);
  const still = useStill(root);
  if (quote) {
    const rarity = quoteRarity(p.c, p.emote);
    const speaker = speakerOf(p.c, p.side);
    return (
      <div key={p.id} class={`hud-bubble hud-bubble-${p.side} hud-bubble--quote`} data-testid={`hud-bubble-${p.side}`} data-rarity={rarity}>
        <QuoteBubble
          text={p.t(emoteLabelKey(p.emote))}
          rarity={rarity}
          tail={p.side === 'me' ? 'tl' : 'tr'}
          head={speaker ? <Avatar spec={speaker} size={30} crop="head" detail="low" /> : undefined}
          aura={rarity === 'legendary'}
          pop
          small
        />
      </div>
    );
  }
  // a starter emote is the speaker's General performing it (yours, or the opponent's look)
  const who: EmoteSpeaker = p.side === 'me' ? (p.c?.wheel?.speaker ? { spec: p.c.wheel.speaker } : null) : foeSpeaker(p.c);
  const head = isStarter(p.emote) && who !== null;
  return (
    <div key={p.id} ref={root} class={`hud-bubble hud-bubble-${p.side}${head ? ' hud-bubble--head' : ''}`} data-testid={`hud-bubble-${p.side}`} data-emote={p.emote}>
      <EmoteArt emote={p.emote} size={head ? 48 : 34} t={p.t} speaker={who} still={still} />
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
  const still = useStill(root);
  // your starter emotes are your General performing them (PLAN 2a)
  const me: EmoteSpeaker = wheel.speaker ? { spec: wheel.speaker } : null;
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
                class={`hud-emote-pick${isStarter(e) && me ? ' is-head' : ''}`}
                style={{ animationDelay: `${i * 22}ms` }}
                title={c.t(emoteLabelKey(e))}
                aria-label={c.t(emoteLabelKey(e))}
                data-testid={`hud-pick-${e}`}
                onClick={() => send(e)}
              >
                <EmoteArt emote={e} size={isStarter(e) && me ? 36 : 30} t={c.t} speaker={me} still={still} />
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
