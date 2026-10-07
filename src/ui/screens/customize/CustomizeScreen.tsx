/**
 * Customize (owner feedback 2026-09-28, DESIGN A18.9.4): one place for how your army, your base and
 * your profile look.
 *
 * - Troops: every unit and turret skin (owned ones equip at once; locked ones show their rarity and
 *   the Dust price when craftable), the same tiles as the Collection's Skins tab.
 * - Bases: the base skins per age (the collection's restyles and the A5.8 base skins).
 * - Backdrops: one battle background skin for your half of the lane in every age (live preview).
 * - Flags: the base flag and the national flag (only ever the player's own pick).
 * - Decorations: three fixed spots on the base.
 * - Emotes and Quotes: the battle wheel (fixed lines only; no text chat).
 * - General (first tab, owner request 2026-10-07): the avatar creator plus frame, banner and title as
 *   picture tiles ("Banner & title" moved here).
 *
 * Base tabs show a live mock-up of the base; every collection shows "12/40 found". Everything shown
 * exists in the content; nothing here can be bought (A15 red lines).
 */
import './customize.css';
import type { SkinDef } from '@/contracts';
import { useState } from 'preact/hooks';
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
  const { save, content, t, router } = useUi();
  const s = save.value;
  // "Banner & title" moved into General (owner request 2026-10-07); the old tab id opens General.
  const [tab, setTab] = useState<CustomizeTab>(p.route.tab === 'look' ? 'general' : (p.route.tab ?? 'general'));
  const all = content.order.skins.map((id) => content.skins[id]!);
  const troops = all.filter((k) => !isBaseSkin(k));
  const bases = all.filter(isBaseSkin);
  // "N/M found" over every skin and every cosmetic collection
  const skinsOwned = all.filter((k) => s.skins.owned.includes(k.id)).length;
  const cos = ALL_COLLECTIONS.map((c) => progressOf(s, content, c));
  const owned = skinsOwned + cos.reduce((n, g) => n + g.owned, 0);
  const total = all.length + cos.reduce((n, g) => n + g.total, 0);
  const tabs = [
    { value: 'general', label: t('avatar.ui.general'), icon: <SlotIcon slot="face" size={20} />, testid: 'tab-general' },
    { value: 'troops', label: t('ui.customize.troops'), icon: <BrushIcon size={20} />, testid: 'tab-troops' },
    { value: 'bases', label: t('ui.customize.bases'), icon: <CastleIcon size={20} />, testid: 'tab-bases' },
    { value: 'backdrops', label: t('cosmetic.ui.tab.backdrops'), icon: <BackdropTabIcon size={20} />, testid: 'tab-backdrops' },
    { value: 'flags', label: t('cosmetic.ui.tab.flags'), icon: <FlagsTabIcon size={20} />, testid: 'tab-flags' },
    { value: 'decorations', label: t('cosmetic.ui.tab.decorations'), icon: <StatueTabIcon size={20} />, testid: 'tab-decorations' },
    { value: 'emotes', label: t('ui.customize.emotes'), icon: <SmileTabIcon size={20} />, testid: 'tab-emotes' },
    { value: 'quotes', label: t('cosmetic.ui.tab.quotes'), icon: <QuoteTabIcon size={20} />, testid: 'tab-quotes' },
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
        <div class={`col-panel cust-panel cust-panel--${tab}`} role="tabpanel" id="cust-panel" aria-labelledby={`cust-tab-${tab}`} key={tab}>
          {tab === 'general' || tab === 'look' ? (
            <GeneralPanel {...(p.route.tab === 'look' ? { initialTab: 'banner' as const } : {})} />
          ) : tab === 'troops' ? (
            <SkinGrid skins={troops} testid="cust-troops" />
          ) : tab === 'bases' ? (
            <BasesPanel
              extra={(age) => {
                const list = bases.filter((k) => k.target === `base.${age}`);
                return list.length > 0 ? <SkinGrid skins={list} testid="cust-base-skins" /> : null;
              }}
            />
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
      </div>
    </ScreenFrame>
  );
}
