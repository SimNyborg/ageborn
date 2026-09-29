/**
 * The summary (DESIGN A10 step 8, ui-plan 4.6; fixes UA-18): a grid of everything, new items
 * highlighted, the Amber total, the updated pity counters (in the panel above), Equip now per new
 * card ("Equipped" is a flat state pill, not a grey button), copies bars that never read "5/2" (an
 * over-full bar caps and says "Upgrade ready"), and exactly one primary at the right
 * ({@link summaryButtons}): the Result's own path when the capsule was opened from the Result
 * (`doneLabel`: "Continue" or "Next battle"), else "Open next (N)" while more wait, else "Done".
 * Upgrade, Open all and Done (when it is not the primary) are secondary.
 */
import { useEffect, useState } from 'preact/hooks';
import type { ArtProvider, CardId, I18n, SkinId } from '@/contracts';
import css from './capsule.module.css';
import { RARITY_COLORS, cssHex, shade } from './palette';
import type { SummaryItem, SummaryModel } from './summaryModel';
import type { CapsuleCatalog } from './types';

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
   * Set when the capsule was opened from the Result: the label of the Result's own path ("Continue",
   * "Next battle"). `onDone` then continues that path, and it is the primary (ui-plan 2.5).
   */
  doneLabel?: string;
}

export type SummaryButton = 'upgrade' | 'openNext' | 'openAll' | 'done';

/** The summary's buttons: exactly one primary (ui-plan 4.6, U1), the rest secondary. */
export function summaryButtons(o: { pending: number; openNext: boolean; openAll: boolean; upgrade: boolean; fromResult: boolean }): {
  primary: SummaryButton;
  secondary: SummaryButton[];
} {
  const canNext = o.pending > 0 && o.openNext && !o.fromResult;
  const primary: SummaryButton = canNext ? 'openNext' : 'done';
  const secondary: SummaryButton[] = [];
  if (o.upgrade) secondary.push('upgrade');
  if (o.pending > 1 && o.openAll && !o.fromResult) secondary.push('openAll');
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
          <span class={css.badge}>{t('capsule.new')}</span>
        ) : item.kind === 'skin' ? (
          <span class={css.badgeSkin}>{t('capsule.skinStamp')}</span>
        ) : (
          <span />
        )}
        {item.kind === 'card' && item.copies > 0 ? <span class={css.badgeCount}>{t('capsule.copiesTimes', { n: item.copies })}</span> : null}
      </div>
      <div class={css.portrait}>{url ? <img src={url} alt="" draggable={false} /> : initials(name)}</div>
      <div class={css.itemName}>{name}</div>
      {item.kind === 'skin' && item.skin ? <div class={css.itemSub}>{skinTarget(catalog, item.skin, t)}</div> : null}
      {item.foil !== 'none' ? <span class={css.foil}>{t('capsule.foilUnlocked', { foil: t(`foil.${item.foil}.name`) })}</span> : null}
      {item.dust > 0 ? <span class={css.dust}>{t('capsule.dustPlus', { n: item.dust })}</span> : null}
      {pr && pr.need !== null ? (
        <div class={`${css.bar} ${item.upgradeReady || pr.after >= pr.need ? css.barReady : ''}`}>
          <div class={css.barFill} style={{ width: `${Math.min(100, Math.round((pr.after / Math.max(1, pr.need)) * 100))}%` }} />
          <div class={css.barText}>{t('capsule.copiesOf', { have: Math.min(pr.after, pr.need), need: pr.need })}</div>
        </div>
      ) : pr && pr.need === null ? (
        <div class={css.bar}>
          <div class={css.barText}>{t('capsule.max')}</div>
        </div>
      ) : null}
      {item.upgradeReady || (pr && pr.need !== null && copiesText(pr.after, pr.need) === null) ? <span class={css.ready}>{t('capsule.upgradeReady')}</span> : null}
      {canEquip && equipped ? (
        <span class={css.equippedPill} data-testid="capsule-equipped">
          {t('capsule.summary.equipped')}
        </span>
      ) : canEquip ? (
        <button class={css.equip} type="button" onClick={equip} data-testid="capsule-equip">
          {t('capsule.summary.equip')}
        </button>
      ) : null}
    </div>
  );
}

export function SummaryPanel(p: { model: SummaryModel; art: ArtProvider; i18n: I18n; catalog: CapsuleCatalog; actions: SummaryActions; title: string }) {
  const { model, i18n, actions } = p;
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
        </div>
        <div class={css.actions}>
          {(() => {
            const b = summaryButtons({
              pending,
              openNext: !!actions.onOpenNext,
              openAll: !!actions.onOpenAll,
              upgrade: !!(model.bestUpgrade && actions.onUpgrade),
              fromResult: !!actions.doneLabel,
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
