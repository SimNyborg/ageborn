/**
 * The summary (DESIGN A10 step 8, ui-plan 4.6; fixes UA-18): a grid of everything, new items
 * highlighted, the Amber total, the updated pity counters (in the panel above), Equip now per new
 * card ("Equipped" is a flat state pill, not a grey button), copies bars that never read "5/2" (an
 * over-full bar caps and says "Upgrade ready"), and exactly one primary at the right
 * ({@link summaryButtons}): the Result's own path when the capsule was opened from the Result
 * (`doneLabel`: "Continue" or "Next battle"), else "Open next (N)" while more wait, else "Done".
 * Upgrade, Open all and Done (when it is not the primary) are secondary.
 *
 * Found collection items (A18.9.4, PLAN 2a) land after the cards as picture tiles: the item's art on
 * its rarity frame, its name, what it is ("Sky", "Base skin · Stone Age") and NEW, or the Dust a
 * duplicate paid. An Epic or Legendary item gets the rarity burst once its tile has landed and shows
 * what it is: the burst celebrates an item already on screen, rolled when the capsule was earned, and
 * never teases it (A15.1 red line 7). The app draws the art ({@link FoundItemsContext}).
 */
import { createContext, type ComponentChildren } from 'preact';
import { useContext, useEffect, useState } from 'preact/hooks';
import type { ArtProvider, CardId, I18n, Rarity, SkinId } from '@/contracts';
import css from './capsule.module.css';
import { RARITY_COLORS, cssHex, shade } from './palette';
import { RARITY_BURST, type BurstLevel } from './rarityBurst';
import type { FoundItem, SummaryItem, SummaryModel } from './summaryModel';
import type { CapsuleCatalog } from './types';

/** What the summary shows for a found collection item (the app fills it: the capsule layer may not import the UI, B2). */
export interface FoundItemView {
  /** The item's name ("Golden Dusk"). */
  name: string;
  /** What it is: "Sky", "Base skin · Stone Age". */
  kind: string;
  rarity: Rarity;
  /** NEW: it joined the collection with this opening (save v15 `cosmetics.fresh`); else a duplicate that turned into Dust. */
  isNew: boolean;
  /** The Dust a duplicate paid (0 when NEW). */
  dust: number;
  /** A landscape picture (a sky, a scene, a base skin on its scene): the tile spans two columns. */
  wide: boolean;
  /** The picture: the same art as the item's Customize card. */
  art: ComponentChildren;
}

export interface FoundItemsEnv {
  /** The tile of a found item, or null for a key this build does not know (the tile is left out). */
  view(key: string): FoundItemView | null;
  /** Plays a sound (the burst's pop); absent in tests. */
  sound?: (id: string) => void;
}

/** The app's lookup for found items; without one (tests, a renderer-less shell) no found tiles show. */
export const FoundItemsContext = createContext<FoundItemsEnv | null>(null);

/** Only Epic and Legendary found items burst (PLAN 2a); Common and Rare land like the cards. */
export function foundBurstLevel(r: Rarity): Exclude<BurstLevel, 'rare'> | null {
  return r === 'epic' || r === 'legendary' ? r : null;
}

/** A card's landing in the grid (`@keyframes land`), so the burst starts once the tile is in place. */
export const FOUND_LAND_MS = 560;
/** The beat between the landing and the burst's windup: the item is seen before it is celebrated. */
export const FOUND_SEEN_MS = 220;

/** When a found tile's burst pops, from the summary's start: its landing, the beat, then the windup. */
export function foundBurstAt(delayMs: number, level: Exclude<BurstLevel, 'rare'>): number {
  return delayMs + FOUND_LAND_MS + FOUND_SEEN_MS + RARITY_BURST[level].popMs;
}

export interface SummaryActions {
  onEquip?: (card: CardId) => void;
  onEquipSkin?: (skin: SkinId) => void;
  onUpgrade?: (card: CardId) => void;
  onOpenNext?: () => void;
  /** "Open all (N)": every waiting capsule at once (A10 Rules). Shown when 2 or more wait. */
  onOpenAll?: () => void;
  onDone: () => void;
  /** Capsules still waiting after this one ("Open next (N)"). */
  pendingCount?: number;
  /** Already in the active War Plan (the first Starter Capsule equips its NEW card, A8): shows "Equipped". */
  isEquipped?: (card: CardId) => boolean;
  /**
   * When an equipped card sits in the army of an age the player has not reached yet, the honest
   * label for it ("In the Bronze Age army"); null keeps "Equipped".
   */
  equippedNote?: (card: CardId) => string | null;
  /** False until upgrades have been taught (2.6): no "Upgrade ready" ribbons before that. Default true. */
  upgradesTaught?: boolean;
  /**
   * Set when the capsule was opened from the Result: the label of the Result's own path ("Continue",
   * "Next battle"). `onDone` then continues that path, and it is the primary (ui-plan 2.5).
   */
  doneLabel?: string;
  /**
   * Opened from the Result: the other way on, as a secondary (bug hunt 2026-10-01: Home was missing).
   * Normally "Home" beside "Next battle"; while a Home unlock waits the app swaps them (FTUE audit #3).
   */
  altLabel?: string;
  onAlt?: () => void;
}

export type SummaryButton = 'upgrade' | 'openNext' | 'openAll' | 'done' | 'alt';

/** The summary's buttons: exactly one primary (ui-plan 4.6, U1), the rest secondary. */
export function summaryButtons(o: { pending: number; openNext: boolean; openAll: boolean; upgrade: boolean; fromResult: boolean; alt?: boolean }): {
  primary: SummaryButton;
  secondary: SummaryButton[];
} {
  const canNext = o.pending > 0 && o.openNext && !o.fromResult;
  const primary: SummaryButton = canNext ? 'openNext' : 'done';
  const secondary: SummaryButton[] = [];
  if (o.upgrade) secondary.push('upgrade');
  if (o.pending > 1 && o.openAll && !o.fromResult) secondary.push('openAll');
  if (o.fromResult && o.alt) secondary.push('alt');
  if (primary !== 'done') secondary.push('done');
  return { primary, secondary };
}

/** Copies text that never over-fills: "8/10", or null when the bar is full (it then caps at "10/10" and "Upgrade ready" shows). */
export function copiesText(after: number, need: number): string | null {
  return after >= need ? null : `${after}/${need}`;
}

/** A portrait data URL from the art provider, or null while loading or on failure. */
function usePortrait(art: ArtProvider, card: CardId, skin: SkinId | null, foil: SummaryItem['foil']): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    art
      .portrait({ card, ...(skin ? { skin } : {}), foil, size: 168 })
      .then((u) => {
        if (live) setUrl(u || null);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [art, card, skin, foil]);
  return url;
}

/** "Skin for Bonker" or "Base skin: Stone Age". */
function skinTarget(catalog: CapsuleCatalog, skin: SkinId, t: (k: string, o?: Record<string, string | number>) => string): string {
  const target = catalog.skin(skin).target;
  if (target.startsWith('base.')) return t('capsule.baseSkinFor', { age: t(`age.${target.slice(5)}.name`) });
  return t('capsule.skinFor', { target: t(catalog.card(target).nameKey) });
}

function initials(name: string): string {
  const w = name.split(/\s+/).filter(Boolean);
  return ((w[0]?.[0] ?? '?') + (w[1]?.[0] ?? '')).toUpperCase();
}

function Item(p: { item: SummaryItem; index: number; art: ArtProvider; i18n: I18n; catalog: CapsuleCatalog; actions: SummaryActions }) {
  const { item, i18n, catalog } = p;
  const t = (k: string, o?: Record<string, string | number>) => i18n.t(k, o);
  const url = usePortrait(p.art, item.card, item.skin, item.foil);
  const [equipped, setEquipped] = useState(() => item.kind === 'card' && p.actions.isEquipped?.(item.card) === true);
  const name = item.kind === 'skin' && item.skin ? t(catalog.skin(item.skin).nameKey) : t(catalog.card(item.card).nameKey);
  const color = RARITY_COLORS[item.rarity];
  const pr = item.progress;
  const note = item.kind === 'card' ? (p.actions.equippedNote?.(item.card) ?? null) : null;
  const canEquip = item.isNew && ((item.kind === 'card' && p.actions.onEquip) || (item.kind === 'skin' && item.skin && p.actions.onEquipSkin));
  const style = {
    '--rarity': cssHex(color),
    '--rarity-dim': cssHex(shade(color, -0.55)),
    '--delay': `${Math.min(900, p.index * 45)}ms`,
  } as Record<string, string>;
  const equip = () => {
    if (item.kind === 'card') p.actions.onEquip?.(item.card);
    else if (item.skin) p.actions.onEquipSkin?.(item.skin);
    setEquipped(true);
  };
  return (
    <div class={`${css.item} ${item.isNew ? css.itemNew : ''}`} style={style} data-testid="capsule-summary-item" data-card={item.card}>
      <div class={css.badges}>
        {item.isNew ? (
          <span class={css.badge} data-tag="">
            {t('capsule.new')}
          </span>
        ) : item.kind === 'skin' ? (
          <span class={css.badgeSkin} data-tag="">
            {t('capsule.skinStamp')}
          </span>
        ) : (
          <span />
        )}
        {item.kind === 'card' && item.copies > 0 ? <span class={css.badgeCount} data-tag="">{t('capsule.copiesTimes', { n: item.copies })}</span> : null}
      </div>
      <div class={css.portrait}>{url ? <img src={url} alt="" draggable={false} /> : initials(name)}</div>
      <div class={css.itemName}>{name}</div>
      {item.kind === 'skin' && item.skin ? <div class={css.itemSub}>{skinTarget(catalog, item.skin, t)}</div> : null}
      {item.foil !== 'none' ? <span class={css.foil} data-tag="">{t('capsule.foilUnlocked', { foil: t(`foil.${item.foil}.name`) })}</span> : null}
      {item.dust > 0 ? (
        // A6.6 surplus rule: copies beyond what max level needs turned into Dust; the bar shows the copies kept.
        <span class={css.dust}>{t(item.kind === 'card' && pr && pr.need !== null ? 'capsule.dustSpare' : 'capsule.dustPlus', { n: item.dust })}</span>
      ) : null}
      {pr && pr.need !== null ? (
        <div class={`${css.bar} ${item.upgradeReady || pr.after >= pr.need ? css.barReady : ''}`}>
          <div class={css.barFill} style={{ width: `${Math.min(100, Math.round((pr.after / Math.max(1, pr.need)) * 100))}%` }} />
          <div class={css.barText} data-tag="">{t('capsule.copiesOf', { have: Math.min(pr.after, pr.need), need: pr.need })}</div>
        </div>
      ) : pr && pr.need === null ? (
        <div class={css.bar}>
          <div class={css.barText}>{t('capsule.max')}</div>
        </div>
      ) : null}
      {p.actions.upgradesTaught !== false && (item.upgradeReady || (pr && pr.need !== null && copiesText(pr.after, pr.need) === null)) ? (
        <span class={css.ready} data-tag="">
          {t('capsule.upgradeReady')}
        </span>
      ) : null}
      {canEquip && equipped ? (
        <span class={`${css.equippedPill} ${note ? css.equippedLater : ''}`} data-testid="capsule-equipped">
          {note ?? t('capsule.summary.equipped')}
        </span>
      ) : canEquip ? (
        <button class={css.equip} type="button" onClick={equip} data-testid="capsule-equip">
          {t('capsule.summary.equip')}
        </button>
      ) : null}
    </div>
  );
}

/** Sparks, rays and embers of a found tile's burst, spread evenly (no randomness in presentation either). */
function burstParts(level: Exclude<BurstLevel, 'rare'>): { sparks: number; rays: number; embers: number; rings: number } {
  const b = RARITY_BURST[level];
  return { sparks: Math.round(b.particles / 8), rays: level === 'legendary' ? 14 : 10, embers: Math.round(b.embers / 3), rings: b.rings };
}

/**
 * The rarity burst over a found tile (A12, the capsule show's burst in the summary's scale): a short
 * windup, then light, shockwave rings (2 Epic, 3 Legendary), rays, sparks flying out and embers lifting.
 * Reduce motion keeps only a calm glow (the CSS).
 */
function FoundBurst(p: { level: Exclude<BurstLevel, 'rare'> }) {
  const n = burstParts(p.level);
  return (
    <span class={`${css.burst} ${p.level === 'legendary' ? css.burstLegendary : ''}`} aria-hidden="true" data-burst={p.level}>
      <span class={css.burstLight} />
      <span class={css.burstRays} style={{ '--rays': n.rays } as Record<string, number>} />
      {Array.from({ length: n.rings }, (_, i) => (
        <span key={`r${i}`} class={css.burstRing} style={{ '--i': i } as Record<string, number>} />
      ))}
      {Array.from({ length: n.sparks }, (_, i) => {
        const a = Math.round((i * 360) / n.sparks + ((i * 37) % 23) - 11);
        const d = 58 + ((i * 53) % 46);
        return <span key={`s${i}`} class={i % 3 === 0 ? css.burstStar : css.burstSpark} style={{ '--a': `${a}deg`, '--d': `${d}px`, '--j': `${(i % 4) * 22}ms` } as Record<string, string>} />;
      })}
      {Array.from({ length: n.embers }, (_, i) => (
        <span key={`e${i}`} class={css.burstEmber} style={{ '--x': `${Math.round(((i + 0.5) / n.embers) * 100)}%`, '--j': `${(i * 97) % 700}ms` } as Record<string, string>} />
      ))}
    </span>
  );
}

/** A found collection item's picture tile (see the module note). */
function FoundTile(p: { found: FoundItem; view: FoundItemView; index: number; i18n: I18n; sound?: ((id: string) => void) | undefined }) {
  const { view } = p;
  const t = (k: string, o?: Record<string, string | number>) => p.i18n.t(k, o);
  const color = RARITY_COLORS[view.rarity];
  const delayMs = Math.min(900, p.index * 45);
  const level = foundBurstLevel(view.rarity);
  const at = level ? foundBurstAt(delayMs, level) : 0;
  useEffect(() => {
    if (!level || !p.sound) return undefined;
    const id = setTimeout(() => p.sound?.(`rarity_burst_${level}`), at);
    return () => clearTimeout(id);
  }, []);
  const style = {
    '--rarity': cssHex(color),
    '--rarity-dim': cssHex(shade(color, -0.55)),
    '--delay': `${delayMs}ms`,
    ...(level ? { '--burst-at': `${at - RARITY_BURST[level].popMs}ms`, '--pop': `${RARITY_BURST[level].popMs}ms`, '--burst-ms': `${RARITY_BURST[level].durationMs}ms` } : {}),
  } as Record<string, string>;
  return (
    <div
      class={`${css.item} ${css.found} ${view.isNew ? css.foundNew : ''} ${view.wide ? css.foundWide : ''} ${level ? css.foundBursting : ''}`}
      style={style}
      data-testid="capsule-found"
      data-key={p.found.key}
      data-rarity={view.rarity}
      data-new={view.isNew ? 'true' : 'false'}
      role="group"
      aria-label={t('capsule.found.label', { name: view.name, kind: view.kind, rarity: t(`rarity.${view.rarity}.name`) })}
    >
      {level ? <FoundBurst level={level} /> : null}
      <div class={css.badges}>
        {view.isNew ? (
          <span class={css.badge} data-tag="">
            {t('capsule.new')}
          </span>
        ) : (
          <span />
        )}
        <span class={css.foundGem} aria-hidden="true" />
      </div>
      <div class={css.foundArt}>{view.art}</div>
      <div class={css.itemName}>{view.name}</div>
      <div class={css.itemSub}>{view.kind}</div>
      {!view.isNew && view.dust > 0 ? <span class={css.dust}>{t('capsule.dustPlus', { n: view.dust })}</span> : null}
    </div>
  );
}

export function SummaryPanel(p: { model: SummaryModel; art: ArtProvider; i18n: I18n; catalog: CapsuleCatalog; actions: SummaryActions; title: string }) {
  const { model, i18n, actions } = p;
  const env = useContext(FoundItemsContext);
  const found = env ? model.found.map((f) => ({ f, view: env.view(f.key) })).filter((x): x is { f: FoundItem; view: FoundItemView } => x.view !== null) : [];
  const t = (k: string, o?: Record<string, string | number>) => i18n.t(k, o);
  const pending = actions.pendingCount ?? 0;
  const stop = (e: Event) => e.stopPropagation();
  return (
    <div class={css.summaryWrap} onPointerDown={stop} onPointerUp={stop} data-testid="capsule-summary">
      <div class={css.summary} role="dialog" aria-label={p.title}>
        <div class={css.summaryHead}>
          <h2 class={css.summaryTitle}>{p.title}</h2>
          <div class={css.totals}>
            {model.amber > 0 ? (
              <span class={css.total} title={t('capsule.amber')}>
                <span class={css.amberGem} />+{model.amber}
              </span>
            ) : null}
            {model.dust > 0 ? (
              <span class={css.total} title={t('capsule.dust')}>
                <span class={css.dustGem} />+{model.dust}
              </span>
            ) : null}
          </div>
        </div>
        <div class={css.grid}>
          {model.items.map((it, i) => (
            <Item key={it.key} item={it} index={i} art={p.art} i18n={i18n} catalog={p.catalog} actions={actions} />
          ))}
          {found.map(({ f, view }, i) => (
            <FoundTile key={`f:${f.key}`} found={f} view={view} index={model.items.length + i} i18n={i18n} sound={env?.sound} />
          ))}
        </div>
        <div class={css.actions}>
          {(() => {
            const b = summaryButtons({
              pending,
              openNext: !!actions.onOpenNext,
              openAll: !!actions.onOpenAll,
              upgrade: !!(model.bestUpgrade && actions.onUpgrade),
              fromResult: !!actions.doneLabel,
              alt: !!(actions.altLabel && actions.onAlt),
            });
            const one = (k: SummaryButton, primary: boolean) => {
              const cls = primary ? css.btn : css.btnGhost;
              const extra = primary ? { 'data-primary': '', autoFocus: true } : {};
              switch (k) {
                case 'upgrade':
                  return (
                    <button key={k} class={cls} type="button" onClick={() => model.bestUpgrade && actions.onUpgrade?.(model.bestUpgrade)} data-testid="capsule-upgrade" {...extra}>
                      {t('capsule.summary.upgrade')}
                    </button>
                  );
                case 'openNext':
                  return (
                    <button key={k} class={cls} type="button" onClick={() => actions.onOpenNext?.()} data-testid="capsule-open-next" {...extra}>
                      {t('capsule.summary.openNext', { n: pending })}
                    </button>
                  );
                case 'openAll':
                  return (
                    <button key={k} class={cls} type="button" onClick={() => actions.onOpenAll?.()} data-testid="capsule-open-all" {...extra}>
                      {t('capsule.summary.openAll', { n: pending })}
                    </button>
                  );
                case 'alt':
                  return (
                    <button key={k} class={cls} type="button" onClick={() => actions.onAlt?.()} data-testid="capsule-alt" {...extra}>
                      {actions.altLabel}
                    </button>
                  );
                case 'done':
                  return (
                    <button key={k} class={cls} type="button" onClick={() => actions.onDone()} data-testid="capsule-done" {...extra}>
                      {primary && actions.doneLabel ? actions.doneLabel : t('capsule.summary.done')}
                    </button>
                  );
              }
            };
            return (
              <>
                {b.secondary.map((k) => one(k, false))}
                {one(b.primary, true)}
              </>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
