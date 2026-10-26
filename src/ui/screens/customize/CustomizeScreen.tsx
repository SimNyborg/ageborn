/**
 * Customize (owner feedback 2026-09-28, DESIGN A18.9.4): one place for how your army, your base and
 * your profile look.
 *
 * - Troops: every unit and turret skin (owned ones equip at once; locked ones show their rarity and
 *   the Dust price when craftable), the same tiles as the Collection's Skins tab.
 * - Bases: the base skins per age in one grid (the collection's models and the A5.8 troop-system base
 *   skin, Crystal Spire), with the live diorama and a Damage toggle.
 * - Backdrops: the scene of each age and one sky for every age (PLAN 2b), with the live diorama.
 * - Flags: the base flag and the national flag (only ever the player's own pick).
 * - Decorations: three fixed spots on the base.
 * - Emotes and Quotes: the battle wheel (fixed lines only; no text chat).
 * - General (first tab, owner request 2026-10-07): the avatar creator plus frame, banner and title as
 *   picture tiles ("Banner & title" moved here).
 *
 * Base tabs show a live mock-up of the base; every collection shows "12/40 found". Everything shown
 * exists in the content; nothing here can be bought (A15 red lines). Items that arrived from a capsule,
 * a crate or a reward wear a NEW pip until seen, and their tab a dot (save v15, `fresh.ts`).
 */
import './customize.css';
import type { SkinDef } from '@/contracts';
import { useEffect, useState } from 'preact/hooks';
import { Pill } from '../../components/Chips';
import { BrushIcon, CastleIcon } from '../../components/icons';
import { ScreenFrame } from '../../components/Layout';
import { Tabs } from '../../components/Tabs';
import type { CustomizeTab, RouteOf } from '../../router';
import { SkinTile } from '../collection/CollectionScreen';
import { useUi } from '../context';
import { ALL_COLLECTIONS, progressOf } from '../model/cosmetics';
import { GeneralPanel } from './GeneralPanel';
import { BackdropsPanel, BasesPanel, DecorationsPanel, EmotesPanel, FlagsPanel, QuotesPanel } from './CollectionPanels';
import { AGE_PAGED, FreshContext, freshKeys, TAB_COLLECTIONS } from './fresh';
import { BackdropTabIcon, FlagsTabIcon, QuoteTabIcon, SlotIcon, SmileTabIcon, StatueTabIcon } from './icons';

const isBaseSkin = (k: SkinDef): boolean => k.target.startsWith('base.');

/** Owned skins first, then the rest in content order. */
function ownedFirst(list: SkinDef[], owned: readonly string[]): SkinDef[] {
  return [...list.filter((k) => owned.includes(k.id)), ...list.filter((k) => !owned.includes(k.id))];
}

function SkinGrid(p: { skins: SkinDef[]; testid: string }) {
  const { save, t } = useUi();
  const owned = save.value.skins.owned;
  const have = p.skins.filter((k) => owned.includes(k.id)).length;
  return (
    <>
      <p class="cust-count" data-testid={`${p.testid}-count`}>
        {t('ui.customize.owned', { n: have, max: p.skins.length })}
      </p>
      {have === 0 ? <p class="cust-hint">{t('ui.customize.howToGet')}</p> : null}
      <div class="col-skins cust-skins" data-testid={p.testid}>
        {ownedFirst(p.skins, owned).map((k) => (
          <SkinTile key={k.id} skin={k} />
        ))}
      </div>
    </>
  );
}

export function CustomizeScreen(p: { route: RouteOf<'customize'> }) {
  const { save, content, t, router, services } = useUi();
  const s = save.value;
  // "Banner & title" moved into General (owner request 2026-10-07); the old tab id opens General.
  const [tab, setTab] = useState<CustomizeTab>(p.route.tab === 'look' ? 'general' : (p.route.tab ?? 'general'));
  // NEW until seen (save v15): the cards keep this visit's pips, and opening a tab marks its items seen;
  // base skins and scenes are marked by their panel, one age page at a time (`AGE_PAGED`, review 3b)
  const [fresh] = useState<ReadonlySet<string>>(() => new Set(s.cosmetics.fresh ?? []));
  useEffect(() => {
    const keys = freshKeys(save.peek(), content, (TAB_COLLECTIONS[tab] ?? []).filter((c) => !AGE_PAGED.includes(c)));
    if (keys.length > 0) services.markCosmeticsSeen(keys);
  }, [tab]);
  const dot = (v: CustomizeTab) =>
    freshKeys(s, content, TAB_COLLECTIONS[v] ?? []).length > 0 ? <i class="cust-newdot" role="img" aria-label={t('cosmetic.ui.newItems')} data-testid={`tab-new-${v}`} /> : undefined;
  const all = content.order.skins.map((id) => content.skins[id]!);
  const troops = all.filter((k) => !isBaseSkin(k));
  // "N/M found" over every skin and every cosmetic collection
  const skinsOwned = all.filter((k) => s.skins.owned.includes(k.id)).length;
  const cos = ALL_COLLECTIONS.map((c) => progressOf(s, content, c));
  const owned = skinsOwned + cos.reduce((n, g) => n + g.owned, 0);
  const total = all.length + cos.reduce((n, g) => n + g.total, 0);
  const tabs = [
    { value: 'general', label: t('avatar.ui.general'), icon: <SlotIcon slot="face" size={20} />, testid: 'tab-general', badge: dot('general') },
    { value: 'troops', label: t('ui.customize.troops'), icon: <BrushIcon size={20} />, testid: 'tab-troops' },
    { value: 'bases', label: t('ui.customize.bases'), icon: <CastleIcon size={20} />, testid: 'tab-bases', badge: dot('bases') },
    { value: 'backdrops', label: t('cosmetic.ui.tab.backdrops'), icon: <BackdropTabIcon size={20} />, testid: 'tab-backdrops', badge: dot('backdrops') },
    { value: 'flags', label: t('cosmetic.ui.tab.flags'), icon: <FlagsTabIcon size={20} />, testid: 'tab-flags', badge: dot('flags') },
    { value: 'decorations', label: t('cosmetic.ui.tab.decorations'), icon: <StatueTabIcon size={20} />, testid: 'tab-decorations', badge: dot('decorations') },
    { value: 'emotes', label: t('ui.customize.emotes'), icon: <SmileTabIcon size={20} />, testid: 'tab-emotes', badge: dot('emotes') },
    { value: 'quotes', label: t('cosmetic.ui.tab.quotes'), icon: <QuoteTabIcon size={20} />, testid: 'tab-quotes', badge: dot('quotes') },
  ] as const;
  return (
    <ScreenFrame
      id="customize"
      title={t('ui.nav.customize')}
      onBack={() => router.back()}
      subtitle={
        <Pill tone="violet" icon={<BrushIcon size={16} />} testid="cust-total">
          {t('cosmetic.ui.found', { n: owned, max: total })}
        </Pill>
      }
    >
      <div class="col cust">
        {/* Every tab keeps its label (U9: icon plus label). */}
        <Tabs label={t('ui.nav.customize')} value={tab} onChange={setTab} variant="folder" idPrefix="cust" items={tabs} />
        <FreshContext.Provider value={fresh}>
          <div class={`col-panel cust-panel cust-panel--${tab}`} role="tabpanel" id="cust-panel" aria-labelledby={`cust-tab-${tab}`} key={tab}>
            {tab === 'general' || tab === 'look' ? (
              <GeneralPanel {...(p.route.tab === 'look' ? { initialTab: 'banner' as const } : {})} />
            ) : tab === 'troops' ? (
              <SkinGrid skins={troops} testid="cust-troops" />
            ) : tab === 'bases' ? (
              // the troop-system base skin (Crystal Spire) sits in the same grid (PLAN 2f interface 7)
              <BasesPanel />
            ) : tab === 'backdrops' ? (
              <BackdropsPanel />
            ) : tab === 'flags' ? (
              <FlagsPanel />
            ) : tab === 'decorations' ? (
              <DecorationsPanel />
            ) : tab === 'emotes' ? (
              <EmotesPanel />
            ) : (
              <QuotesPanel />
            )}
          </div>
        </FreshContext.Provider>
      </div>
    </ScreenFrame>
  );
}
