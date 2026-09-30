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
 * - Look: banner, frame and title (owned ones pick; locked ones say how they unlock).
 *
 * Base tabs show a live mock-up of the base; every collection shows "12/40 found". Everything shown
 * exists in the content; nothing here can be bought (A15 red lines).
 */
import './customize.css';
import { bannerNameKey, frameNameKey, titleNameKey } from '@/content/keys';
import type { SkinDef } from '@/contracts';
import type { ComponentChildren } from 'preact';
import { useState } from 'preact/hooks';
import { Pill } from '../../components/Chips';
import { BrushIcon, CastleIcon, CheckIcon, CrownIcon, FlagIcon, LockIcon } from '../../components/icons';
import { ScreenFrame } from '../../components/Layout';
import { Tabs } from '../../components/Tabs';
import type { CustomizeTab, RouteOf } from '../../router';
import { SkinTile } from '../collection/CollectionScreen';
import { useUi } from '../context';
import { COLLECTIONS, progressOf } from '../model/cosmetics';
import { BackdropsPanel, BasesPanel, DecorationsPanel, EmotesPanel, FlagsPanel, QuotesPanel } from './CollectionPanels';
import { BackdropTabIcon, FlagsTabIcon, QuoteTabIcon, SmileTabIcon, StatueTabIcon } from './icons';

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

function Choice(p: { on: boolean; locked: boolean; label: string; hint?: string; onPick: () => void; testid: string; icon?: ComponentChildren }) {
  return (
    <button
      type="button"
      class={`cust-choice${p.on ? ' is-on' : ''}${p.locked ? ' is-locked' : ''}`}
      aria-pressed={p.on}
      aria-disabled={p.locked ? 'true' : undefined}
      data-testid={p.testid}
      onClick={() => {
        if (!p.locked && !p.on) p.onPick();
      }}
    >
      <span class="cust-choice__icon" aria-hidden="true">
        {p.locked ? <LockIcon size={22} /> : p.on ? <CheckIcon size={22} /> : p.icon}
      </span>
      <span class="cust-choice__text">
        <b>{p.label}</b>
        {p.hint ? <small>{p.hint}</small> : null}
      </span>
    </button>
  );
}

function LookPanel() {
  const { save, content, t, services } = useUi();
  const s = save.value;
  const c = content.cosmetics;
  const ownsBanner = (id: string) => id === c.defaults.banner || s.cosmetics.owned.includes(id);
  const ownsTitle = (id: string) => id === c.defaults.title || s.cosmetics.owned.includes(id);
  return (
    <div class="cust-look" data-testid="cust-look">
      <section>
        <h3 class="cust-h">
          <FlagIcon size={22} /> {t('ui.profile.banner')}
        </h3>
        <div class="cust-choices">
          {c.banners.map((b) => (
            <Choice
              key={b.id}
              on={s.profile.banner === b.id}
              locked={!ownsBanner(b.id)}
              label={t(bannerNameKey(b.id))}
              {...(ownsBanner(b.id) ? {} : { hint: t('ui.lock.arena', { n: b.arena }) })}
              onPick={() => services.setProfile({ banner: b.id })}
              testid={`banner-${b.id}`}
              icon={<FlagIcon size={22} />}
            />
          ))}
        </div>
      </section>
      <section>
        <h3 class="cust-h">
          <CrownIcon size={22} /> {t('ui.profile.frame')}
        </h3>
        <div class="cust-choices">
          <Choice on={s.profile.frame === 'none'} locked={false} label={t('ui.profile.noFrame')} onPick={() => services.setProfile({ frame: 'none' })} testid="frame-none" />
          {c.frames.map((f) => (
            <Choice
              key={f.id}
              on={s.profile.frame === f.id}
              locked={f.codexLevel > s.codexLevel}
              label={t(frameNameKey(f.id))}
              {...(f.codexLevel > s.codexLevel ? { hint: t('ui.customize.codexLevel', { n: f.codexLevel }) } : {})}
              onPick={() => services.setProfile({ frame: f.id })}
              testid={`frame-${f.id}`}
              icon={<CrownIcon size={22} />}
            />
          ))}
        </div>
      </section>
      <section>
        <h3 class="cust-h">{t('ui.profile.title')}</h3>
        <div class="cust-choices">
          {c.titles.map((x) => (
            <Choice
              key={x.id}
              on={s.profile.title === x.id}
              locked={!ownsTitle(x.id)}
              label={t(titleNameKey(x.id))}
              {...(ownsTitle(x.id) ? {} : { hint: t('ui.customize.titleLocked') })}
              onPick={() => services.setProfile({ title: x.id })}
              testid={`title-${x.id}`}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

export function CustomizeScreen(p: { route: RouteOf<'customize'> }) {
  const { save, content, t, router } = useUi();
  const s = save.value;
  const [tab, setTab] = useState<CustomizeTab>(p.route.tab ?? 'troops');
  const all = content.order.skins.map((id) => content.skins[id]!);
  const troops = all.filter((k) => !isBaseSkin(k));
  const bases = all.filter(isBaseSkin);
  // "N/M found" over every skin and every cosmetic collection
  const skinsOwned = all.filter((k) => s.skins.owned.includes(k.id)).length;
  const cos = COLLECTIONS.map((c) => progressOf(s, content, c));
  const owned = skinsOwned + cos.reduce((n, g) => n + g.owned, 0);
  const total = all.length + cos.reduce((n, g) => n + g.total, 0);
  const tabs = [
    { value: 'troops', label: t('ui.customize.troops'), icon: <BrushIcon size={20} />, testid: 'tab-troops' },
    { value: 'bases', label: t('ui.customize.bases'), icon: <CastleIcon size={20} />, testid: 'tab-bases' },
    { value: 'backdrops', label: t('cosmetic.ui.tab.backdrops'), icon: <BackdropTabIcon size={20} />, testid: 'tab-backdrops' },
    { value: 'flags', label: t('cosmetic.ui.tab.flags'), icon: <FlagsTabIcon size={20} />, testid: 'tab-flags' },
    { value: 'decorations', label: t('cosmetic.ui.tab.decorations'), icon: <StatueTabIcon size={20} />, testid: 'tab-decorations' },
    { value: 'emotes', label: t('ui.customize.emotes'), icon: <SmileTabIcon size={20} />, testid: 'tab-emotes' },
    { value: 'quotes', label: t('cosmetic.ui.tab.quotes'), icon: <QuoteTabIcon size={20} />, testid: 'tab-quotes' },
    { value: 'look', label: t('ui.customize.look'), icon: <CrownIcon size={20} />, testid: 'tab-look' },
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
          {tab === 'troops' ? (
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
          ) : tab === 'quotes' ? (
            <QuotesPanel />
          ) : (
            <LookPanel />
          )}
        </div>
      </div>
    </ScreenFrame>
  );
}
