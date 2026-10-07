/**
 * Customize › General (owner request 2026-10-07, "Make your General", AUDIT §6.6): the player designs
 * a cartoon General and picks the profile frame, banner and title, all as picture tiles.
 *
 * - Left: the live preview (blinks and breathes) on the chosen banner, with the name and title ribbon.
 * - Right: slot tabs (icon plus label), a colour row for tinted slots and a grid of tiles. An owned
 *   part shows on the General and equips at once (U14: Undo puts the last look back). A locked
 *   wearable shows its rarity and how it is earned; tapping it tries it on in the preview only. No
 *   price, no buy: wearables are earned in play, never sold.
 * - The same panel opens from Profile's pencil (a cross-tab jump; Back returns to Profile, U4).
 */
import './general.css';
import { bannerNameKey, frameNameKey, rarityNameKey, titleNameKey } from '@/content/keys';
import type { AvatarPartDef, Content } from '@/content/types';
import type { AvatarSlot, AvatarTint, CardId } from '@/contracts';
import type { ComponentChildren } from 'preact';
import { useEffect, useMemo, useState } from 'preact/hooks';
import { AvatarLookView, loadWearableArt, randomStarterLook, resolveLook, type AvatarCrop, type ResolvedLook } from '../../components/Avatar';
import { BannerArt, FRAME_COLORS, TitleRibbon } from '../../components/avatar/ProfileArt';
import { TINTS } from '../../components/avatar/palette';
import { IconButton } from '../../components/Button';
import { CardArt } from '../../components/CardTile';
import { CheckIcon, LockIcon, RARITY_COLOR, RarityGem, RefreshIcon, UndoIcon } from '../../components/icons';
import { useUi } from '../context';
import { cardTile, isOwned } from '../model/cards';
import { findItem, sourceText } from '../model/cosmetics';
import { SlotIcon } from './icons';

export type GeneralTab = AvatarSlot | 'frame' | 'banner' | 'title' | 'portrait';

const LOOK_TABS: AvatarSlot[] = ['face', 'hair', 'eyes', 'brows', 'nose', 'mouth', 'facialHair', 'headwear', 'top', 'accessory', 'background'];
const PROFILE_TABS: GeneralTab[] = ['frame', 'banner', 'title', 'portrait'];

/** How a slot's tiles are cropped: features up close, hair and hats as heads, tops and backdrops as busts. */
const TILE_CROP: Record<AvatarSlot, AvatarCrop> = {
  face: 'head',
  eyes: 'face',
  brows: 'face',
  nose: 'face',
  mouth: 'face',
  hair: 'head',
  facialHair: 'head',
  headwear: 'head',
  top: 'bust',
  accessory: 'bust',
  background: 'bust',
};

const TINT_OF: Partial<Record<AvatarSlot, AvatarTint>> = { face: 'skin', hair: 'hair', brows: 'hair', facialHair: 'hair', eyes: 'eyes', top: 'cloth' };

const withPart = (l: ResolvedLook, slot: AvatarSlot, id: string): ResolvedLook => ({ ...l, parts: { ...l.parts, [slot]: id } });

function avatarTables(content: Content): Content['cosmetics']['avatar'] | null {
  return (content.cosmetics as Partial<Content['cosmetics']> | null)?.avatar ?? null;
}

/** The General creator and profile look (Customize › General). */
export function GeneralPanel(p: { initialTab?: GeneralTab }) {
  const { save, content, t, services, sound } = useUi();
  const s = save.value;
  const tables = avatarTables(content);
  const [tab, setTab] = useState<GeneralTab>(p.initialTab ?? 'face');
  const [trying, setTrying] = useState<string | null>(null);
  const [history, setHistory] = useState<ResolvedLook[]>([]);
  const [pop, setPop] = useState(0);
  useEffect(() => {
    void loadWearableArt();
  }, []);
  const current = resolveLook(s.profile.avatar);
  const owned = new Set(s.cosmetics.owned);
  const parts = tables?.parts ?? [];
  const tryPart = trying ? parts.find((x) => x.id === trying) : undefined;
  const preview = tryPart ? withPart(current, tryPart.slot, tryPart.id) : current;
  const ownsPart = (x: AvatarPartDef) => x.rarity === 'starter' || owned.has(`avatar.${x.id}`);
  const wear = parts.filter((x) => x.rarity !== 'starter');
  const wearOwned = wear.filter(ownsPart).length;

  const apply = (look: ResolvedLook['parts'], tints?: Partial<ResolvedLook['tints']>) => {
    setHistory((h) => [...h, current].slice(-20));
    const r = services.equipCosmetic({ slot: 'avatar', look, ...(tints ? { tints } : {}) });
    if (r.ok) {
      setPop((n) => n + 1);
      sound?.('ui_pop');
    } else sound?.('ui_deny');
  };
  const undo = () => {
    const last = history[history.length - 1];
    if (!last) return;
    setHistory((h) => h.slice(0, -1));
    services.equipCosmetic({ slot: 'avatar', look: last.parts, tints: last.tints });
    setPop((n) => n + 1);
    sound?.('ui_toggle');
  };
  const shuffle = () => {
    const next = randomStarterLook((Math.random() * 0x7fffffff) | 0);
    // Shuffle rerolls starter parts only: earned wearables stay on.
    const keep: ResolvedLook['parts'] = {};
    for (const [slot, id] of Object.entries(current.parts) as [AvatarSlot, string][]) {
      const def = parts.find((x) => x.id === id);
      if (def && def.rarity !== 'starter') keep[slot] = id;
    }
    setTrying(null);
    apply({ ...next.parts, ...keep }, next.tints);
  };

  const frame = s.profile.frame;
  const tryItem = tryPart ? findItem(content, `avatar.${tryPart.id}`) : undefined;
  return (
    <div class="gen" data-testid="cust-general">
      <div class="gen-stage">
        <div class="gen-stage__plate">
          <BannerArt id={s.profile.banner} width={84} class="gen-stage__banner" />
          <AvatarLookView look={preview} size={220} crop="bust" pop={pop} frameColor={FRAME_COLORS[frame] ?? FRAME_COLORS.none} class="gen-stage__avatar" testid="gen-preview" label={s.profile.name} />
          {tryPart ? (
            <span class="gen-stage__trying" style={{ '--rar': RARITY_COLOR[tryPart.rarity as 'common'] }} data-testid="gen-trying">
              {t('avatar.ui.tryingOn')}
            </span>
          ) : null}
        </div>
        <div class="gen-stage__id">
          <b class="gen-stage__name">{s.profile.name}</b>
          {s.profile.title ? <TitleRibbon text={t(titleNameKey(s.profile.title))} /> : null}
        </div>
        {tryPart && tryItem ? (
          <p class="gen-stage__source" data-testid="gen-source">
            <b>{t(tryPart.nameKey)}</b> · {t(rarityNameKey(tryItem.rarity))}
            <br />
            {sourceText(t, tryItem)}
            <br />
            <small>{t('avatar.ui.earned')}</small>
          </p>
        ) : (
          <p class="gen-stage__found" data-testid="gen-found">
            {t('avatar.ui.wardrobe')}: {t('avatar.ui.wardrobeFound', { n: wearOwned, total: wear.length })}
          </p>
        )}
        <div class="gen-stage__tools">
          <IconButton icon={<UndoIcon size={22} />} label={t('avatar.ui.undo')} onClick={undo} disabled={history.length === 0} testid="gen-undo" />
          <IconButton icon={<RefreshIcon size={22} />} label={t('avatar.ui.shuffle')} onClick={shuffle} testid="gen-shuffle" />
        </div>
      </div>
      <div class="gen-edit">
        <div class="gen-tabs" role="tablist" aria-label={t('avatar.ui.look')}>
          {[...LOOK_TABS, ...PROFILE_TABS].map((x) => (
            <button
              key={x}
              type="button"
              role="tab"
              aria-selected={tab === x}
              class={`gen-tab${tab === x ? ' is-on' : ''}${PROFILE_TABS.includes(x) && x === 'frame' ? ' gen-tab--split' : ''}`}
              data-testid={`gen-tab-${x}`}
              onClick={() => {
                setTab(x);
                setTrying(null);
                sound?.('ui_tab');
              }}
            >
              <SlotIcon slot={x} size={22} />
              <span>{t(`avatar.slot.${x}`)}</span>
            </button>
          ))}
        </div>
        {tab === 'frame' ? (
          <FrameGrid look={current} />
        ) : tab === 'banner' ? (
          <BannerGrid />
        ) : tab === 'title' ? (
          <TitleGrid />
        ) : tab === 'portrait' ? (
          <PortraitGrid look={current} />
        ) : (
          <PartGrid
            slot={tab}
            look={current}
            parts={parts.filter((x) => x.slot === tab)}
            owns={ownsPart}
            trying={trying}
            onPick={(x) => {
              if (!ownsPart(x)) {
                setTrying(trying === x.id ? null : x.id);
                sound?.('ui_toggle');
                return;
              }
              setTrying(null);
              if (current.parts[x.slot] !== x.id) apply({ [x.slot]: x.id });
            }}
            onTint={(tint, n) => apply({}, { [tint]: n })}
          />
        )}
      </div>
    </div>
  );
}

function Tile(p: { on: boolean; locked: boolean; trying?: boolean; label: string; rarity?: string; onClick: () => void; testid: string; children: ComponentChildren; wide?: boolean }) {
  return (
    <button
      type="button"
      class={`gen-tile${p.on ? ' is-on' : ''}${p.locked ? ' is-locked' : ''}${p.trying ? ' is-trying' : ''}${p.wide ? ' gen-tile--wide' : ''}`}
      style={p.rarity ? { '--rar': RARITY_COLOR[p.rarity as 'common'] } : undefined}
      aria-pressed={p.on}
      aria-label={p.label}
      title={p.label}
      data-testid={p.testid}
      onClick={p.onClick}
    >
      <span class="gen-tile__art">{p.children}</span>
      {p.rarity ? (
        <span class="gen-tile__gem" aria-hidden="true">
          <RarityGem rarity={p.rarity as 'common'} size={14} />
        </span>
      ) : null}
      {p.on ? (
        <span class="gen-tile__mark" aria-hidden="true">
          <CheckIcon size={14} />
        </span>
      ) : p.locked ? (
        <span class="gen-tile__mark gen-tile__mark--lock" aria-hidden="true">
          <LockIcon size={14} />
        </span>
      ) : null}
    </button>
  );
}

function PartGrid(p: {
  slot: AvatarSlot;
  look: ResolvedLook;
  parts: AvatarPartDef[];
  owns: (x: AvatarPartDef) => boolean;
  trying: string | null;
  onPick: (x: AvatarPartDef) => void;
  onTint: (tint: AvatarTint, n: number) => void;
}) {
  const { t, content } = useUi();
  const tint = TINT_OF[p.slot];
  // Starters first, then owned wearables, then the locked ones (each in content order).
  const sorted = useMemo(() => {
    const st = p.parts.filter((x) => x.rarity === 'starter');
    const ow = p.parts.filter((x) => x.rarity !== 'starter' && p.owns(x));
    const lk = p.parts.filter((x) => x.rarity !== 'starter' && !p.owns(x));
    return [...st, ...ow, ...lk];
  }, [p.parts, p.owns]);
  const crop = TILE_CROP[p.slot];
  return (
    <div class="gen-body">
      {tint ? (
        <div class="gen-swatches" role="radiogroup" aria-label={t(`avatar.tint.${tint}`)} data-testid="gen-swatches">
          {TINTS[tint].map((hex, i) => (
            <button
              key={hex}
              type="button"
              role="radio"
              aria-checked={p.look.tints[tint] === i}
              aria-label={`${t(`avatar.tint.${tint}`)} ${i + 1}`}
              class={`gen-swatch${p.look.tints[tint] === i ? ' is-on' : ''}`}
              style={{ '--sw': hex }}
              data-testid={`gen-swatch-${tint}-${i}`}
              onClick={() => {
                if (p.look.tints[tint] !== i) p.onTint(tint, i);
              }}
            />
          ))}
        </div>
      ) : null}
      <div class={`gen-grid gen-grid--${crop}`} data-testid="gen-grid">
        {sorted.map((x) => {
          const have = p.owns(x);
          const item = x.rarity === 'starter' ? undefined : findItem(content, `avatar.${x.id}`);
          const label = `${t(x.nameKey)}${have ? '' : `. ${t('avatar.ui.locked')}: ${item ? sourceText(t, item) : ''}`}`;
          return (
            <Tile
              key={x.id}
              on={p.look.parts[p.slot] === x.id}
              locked={!have}
              trying={p.trying === x.id}
              label={label}
              {...(x.rarity !== 'starter' ? { rarity: x.rarity } : {})}
              onClick={() => p.onPick(x)}
              testid={`gen-part-${x.id}`}
            >
              <AvatarLookView look={withPart(p.look, p.slot, x.id)} size={72} crop={crop} detail="full" />
            </Tile>
          );
        })}
      </div>
      <p class="gen-note">{t('avatar.ui.earned')}</p>
    </div>
  );
}

function FrameGrid(p: { look: ResolvedLook }) {
  const { save, content, t, services } = useUi();
  const s = save.value;
  const frames = [{ id: 'none', codexLevel: 0, nameKey: '' }, ...content.cosmetics.frames];
  return (
    <div class="gen-body">
      <div class="gen-grid gen-grid--head" data-testid="gen-frames">
        {frames.map((f) => {
          const locked = f.codexLevel > s.codexLevel;
          const name = f.id === 'none' ? t('avatar.ui.frameNone') : t(frameNameKey(f.id));
          return (
            <Tile
              key={f.id}
              on={s.profile.frame === f.id}
              locked={locked}
              label={locked ? `${name}. ${t('avatar.ui.frameLocked', { n: f.codexLevel })}` : name}
              onClick={() => {
                if (!locked && s.profile.frame !== f.id) services.setProfile({ frame: f.id });
              }}
              testid={`frame-${f.id}`}
            >
              <span class={`gen-frame gen-frame--${f.id}`} style={{ '--frame': FRAME_COLORS[f.id] ?? FRAME_COLORS.none }}>
                <AvatarLookView look={p.look} size={56} crop="head" frameColor={FRAME_COLORS[f.id] ?? FRAME_COLORS.none} />
              </span>
              {locked ? <small class="gen-tile__hint">{t('avatar.ui.frameLocked', { n: f.codexLevel })}</small> : null}
            </Tile>
          );
        })}
      </div>
    </div>
  );
}

function BannerGrid() {
  const { save, content, t, services } = useUi();
  const s = save.value;
  const c = content.cosmetics;
  const owns = (id: string) => id === c.defaults.banner || s.cosmetics.owned.includes(id);
  return (
    <div class="gen-body">
      <div class="gen-grid gen-grid--banner" data-testid="gen-banners">
        {c.banners.map((b) => {
          const locked = !owns(b.id);
          const name = t(bannerNameKey(b.id));
          return (
            <Tile
              key={b.id}
              on={s.profile.banner === b.id}
              locked={locked}
              label={locked ? `${name}. ${t('avatar.ui.bannerLocked', { n: b.arena })}` : name}
              onClick={() => {
                if (!locked && s.profile.banner !== b.id) services.setProfile({ banner: b.id });
              }}
              testid={`banner-${b.id}`}
            >
              <BannerArt id={b.id} width={40} />
              <small class="gen-tile__hint">{locked ? t('avatar.ui.bannerLocked', { n: b.arena }) : name}</small>
            </Tile>
          );
        })}
      </div>
    </div>
  );
}

function TitleGrid() {
  const { save, content, t, services } = useUi();
  const s = save.value;
  const c = content.cosmetics;
  const owns = (id: string) => id === c.defaults.title || s.cosmetics.owned.includes(id);
  return (
    <div class="gen-body">
      <div class="gen-titles" data-testid="gen-titles">
        {c.titles.map((x) => {
          const locked = !owns(x.id);
          const on = s.profile.title === x.id;
          return (
            <button
              key={x.id}
              type="button"
              class={`gen-title${on ? ' is-on' : ''}${locked ? ' is-locked' : ''}`}
              aria-pressed={on}
              aria-disabled={locked ? 'true' : undefined}
              aria-label={locked ? `${t(titleNameKey(x.id))}. ${t('avatar.ui.titleLocked')}` : t(titleNameKey(x.id))}
              data-testid={`title-${x.id}`}
              onClick={() => {
                if (!locked && !on) services.setProfile({ title: x.id });
              }}
            >
              <TitleRibbon text={t(titleNameKey(x.id))} />
              {on ? <CheckIcon size={16} /> : locked ? <LockIcon size={16} /> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PortraitGrid(p: { look: ResolvedLook }) {
  const { save, content, t, services } = useUi();
  const s = save.value;
  const units = content.order.units.filter((id) => isOwned(s, id as CardId, content)).slice(0, 60);
  return (
    <div class="gen-body">
      <p class="gen-note gen-note--top">{t('avatar.ui.portraitHint')}</p>
      <div class="gen-grid gen-grid--head" data-testid="gen-portraits">
        <Tile on={!s.profile.avatar.portraitCard} locked={false} label={t('avatar.ui.general')} onClick={() => services.setProfile({ portraitCard: null })} testid="portrait-face">
          <AvatarLookView look={p.look} size={56} crop="head" />
        </Tile>
        {units.map((id) => {
          const tile = cardTile(s, content, id as CardId, t);
          if (!tile) return null;
          return (
            <Tile key={id} on={s.profile.avatar.portraitCard === id} locked={false} label={tile.name} onClick={() => services.setProfile({ portraitCard: id as CardId })} testid={`portrait-${id}`}>
              <CardArt card={id as CardId} age={tile.age} glyph={tile.glyph} size={56} />
            </Tile>
          );
        })}
      </div>
    </div>
  );
}
