/**
 * Profile (A9 #13, A6.1): the editable auto name, the look (face avatar or a unit portrait, banner,
 * frame, title), stats (trophies and arena, wins and losses by AI tier, favourite card, collection,
 * foils, Codex Level, Conquest stars, fastest win, Future Age reached, Legendaries) and the history
 * of the last 20 matches, each with a replay and an "AI" marker (A7.1). No login, no account.
 */
import './profile.css';
import { formatNameKey, titleNameKey, titleUnlockKey } from '@/content/keys';
import type { ComponentChildren } from 'preact';
import { useState } from 'preact/hooks';
import { avatar as avatarTables } from '@/content/raw/avatar';
import { Avatar } from '../../components/Avatar';
import { AvatarItemArt, useCosmeticImage } from '../../components/cosmeticArt';
import { BannerArt, FRAME_COLORS, TitleRibbon, titleTier } from '../../components/avatar/ProfileArt';
import { Button, IconButton } from '../../components/Button';
import { CardTile } from '../../components/CardTile';
import { AiBadge, Pill } from '../../components/Chips';
import { formatClock, formatInt, tierNumeral, withoutAiPrefix } from '../../components/format';
import { CardsIcon, CastleIcon, CheckIcon, CrownIcon, PencilIcon, ReplayIcon, RobotIcon, StarIcon, SwordsIcon, TrophyIcon } from '../../components/icons';
import { Empty, Panel, ScreenFrame } from '../../components/Layout';
import { ProgressBar } from '../../components/Meters';
import { Modal } from '../../components/Modal';
import type { RouteOf } from '../../router';
import { useUi } from '../context';
import { cardTile } from '../model/cards';
import { findItem } from '../model/cosmetics';
import { collectionMilestones, historyRows, profileView } from '../model/profile';
import { isTesterProfile } from '../model/tester';

const RESULT_KEYS = { win: 'ui.profile.win', loss: 'ui.profile.loss', draw: 'ui.profile.draw' } as const;

/** The named Legendary wearable a collection milestone's title also earns (AUDIT §6.5). */
function milestoneWearable(title: string): { id: string; nameKey: string } | undefined {
  return avatarTables.parts.find((x) => x.source.kind === 'title' && x.source.title === title);
}

function NameModal(p: { name: string; onSave: (n: string) => void; onClose: () => void }) {
  const { t } = useUi();
  const [v, setV] = useState(p.name);
  const trimmed = v.trim();
  return (
    <Modal
      title={t('ui.profile.editName')}
      size="sm"
      onClose={p.onClose}
      testid="edit-name"
      footer={
        <Button kind="progress" disabled={trimmed.length === 0} testid="name-save" onClick={() => p.onSave(trimmed)}>
          {t('ui.common.done')}
        </Button>
      }
    >
      <label class="ui-field">
        <span>{t('ui.profile.name')}</span>
        <input
          class="ui-input"
          value={v}
          maxLength={20}
          data-autofocus=""
          onInput={(e) => setV((e.currentTarget as HTMLInputElement).value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && trimmed.length > 0) p.onSave(trimmed);
          }}
        />
      </label>
    </Modal>
  );
}

/**
 * The flag the player flies, waving on a small pole at the corner of the profile card, with the Flag
 * Atlas count under it (PLAN 2d "Profile header"). A tap opens the Atlas on that flag; with no flag yet
 * an empty dashed cloth invites the first pick.
 */
function ProfileFlag(p: { reduce: boolean }) {
  const { t, locale, router, services, content } = useUi();
  const art = useCosmeticImage();
  const atlas = services.flagAtlasProgress();
  const key = atlas.equipped;
  const item = key ? findItem(content, key) : undefined;
  const url = key && art ? art(key, { size: 'big' }) : null;
  const name = item ? t(item.nameKey) : t('cosmetic.flagAtlas.profileNone');
  const count = t('cosmetic.flagAtlas.profileAtlas', { n: formatInt(atlas.owned, locale), max: formatInt(atlas.total, locale) });
  return (
    <button
      type="button"
      class={`prof-flag${url ? '' : ' is-empty'}${p.reduce ? ' is-still' : ''}`}
      data-testid="profile-flag"
      data-flag={key ?? ''}
      aria-label={`${name}, ${count}`}
      onClick={() => router.go(key ? { id: 'flagAtlas', flag: key } : { id: 'flagAtlas' })}
    >
      <span class="prof-flag__pole" aria-hidden="true" />
      <span class="prof-flag__cloth" aria-hidden="true">
        {url ? <img src={url} alt="" draggable={false} /> : <span class="prof-flag__plus">+</span>}
      </span>
      <span class="prof-flag__count ui-num" aria-hidden="true">
        {formatInt(atlas.owned, locale)}/{formatInt(atlas.total, locale)}
      </span>
    </button>
  );
}

function Stat(p: { label: string; value: string; icon?: ComponentChildren; testid?: string }) {
  return (
    <div class="prof-stat" data-testid={p.testid}>
      {p.icon ? <span class="prof-stat__icon">{p.icon}</span> : null}
      <span class="prof-stat__value ui-num">{p.value}</span>
      <span class="prof-stat__label">{p.label}</span>
    </div>
  );
}

export function ProfileScreen(_p: { route: RouteOf<'profile'> }) {
  const { save, content, t, locale, router, services } = useUi();
  const s = save.value;
  const v = profileView(s, content);
  const rows = historyRows(services.matchHistory(), content.hash);
  const [editName, setEditName] = useState(false);
  const fav = v.favourite ? cardTile(s, content, v.favourite, t) : null;
  const winRate = v.matches > 0 ? Math.round((v.wins * 100) / v.matches) : 0;
  const frame = content.cosmetics.frames.find((f) => f.id === s.profile.frame);
  const maxTier = Math.max(1, ...v.byTier.map((r) => r.wins + r.losses));
  const milestones = collectionMilestones(s, content);

  return (
    <ScreenFrame id="profile" title={t('ui.nav.profile')} onBack={() => router.back()}>
      <div class="prof">
        <div class="prof-left">
          <Panel class="prof-card" tone="default">
            <ProfileFlag reduce={s.settings.reduceMotion} />
            <div class="prof-id">
              <button
                type="button"
                class="prof-avatar"
                onClick={() => router.go({ id: 'customize', tab: 'general' })}
                aria-label={t('avatar.ui.edit')}
                data-testid="edit-look"
              >
                <BannerArt id={s.profile.banner} backer class="prof-avatar__banner" />
                <Avatar spec={s.profile.avatar} size={104} crop="bust" ring={frame?.id ?? 'none'} frameColor={FRAME_COLORS[frame?.id ?? 'none'] ?? 'var(--ui-gold)'} />
                <span class="prof-avatar__edit">
                  <PencilIcon size={18} />
                </span>
              </button>
              <div class="prof-id__text">
                <div class="prof-id__name">
                  <span data-testid="profile-name">{s.profile.name}</span>
                  <IconButton
                    icon={<PencilIcon size={20} />}
                    label={t('ui.profile.editName')}
                    onClick={() => setEditName(true)}
                    testid="edit-name-btn"
                  />
                </div>
                {/* the ribbon shows how the title was earned (PLAN 2a: parchment, metal caps, wax seal, gold leaf) */}
                {s.profile.title ? (
                  <TitleRibbon
                    class="prof-id__title"
                    text={t(titleNameKey(s.profile.title))}
                    tier={titleTier(content.cosmetics.titles.find((x) => x.id === s.profile.title))}
                    testid="profile-title"
                  />
                ) : null}
                <span class="prof-id__pills">
                  <Pill tone="gold" icon={<TrophyIcon size={16} />}>
                    {formatInt(v.trophies, locale)}
                  </Pill>
                  <Pill tone="blue">{t(v.arenaNameKey)}</Pill>
                  {isTesterProfile(s) ? (
                    <Pill tone="violet" testid="tester-chip" title={t('tester.chipNote')}>
                      {t('tester.chip')}
                    </Pill>
                  ) : null}
                </span>
              </div>
            </div>
          </Panel>
          <div class="prof-stats" data-testid="profile-stats">
            <Stat testid="stat-best" icon={<TrophyIcon size={26} />} label={t('ui.profile.best')} value={formatInt(v.best, locale)} />
            <Stat
              testid="stat-peak"
              icon={<RobotIcon size={26} />}
              label={t('ui.profile.highestTier')}
              value={v.highestTierBeaten === null ? t('ui.profile.none') : tierNumeral(v.highestTierBeaten)}
            />
            <Stat
              icon={<SwordsIcon size={26} />}
              label={t('ui.profile.record')}
              value={t('ui.profile.recordValue', {
                w: formatInt(v.wins, locale),
                l: formatInt(v.losses, locale),
                d: formatInt(v.draws, locale),
              })}
            />
            <Stat label={t('ui.profile.winRate')} value={t('ui.profile.percent', { n: winRate })} />
            <Stat icon={<StarIcon size={26} />} label={t('ui.profile.codex')} value={formatInt(v.codexLevel, locale)} />
            <Stat
              testid="stat-collection"
              icon={<CardsIcon size={26} />}
              label={t('ui.profile.collection')}
              value={t('ui.profile.percent', { n: v.collection.total ? Math.round((v.collection.owned * 100) / v.collection.total) : 0 })}
            />
            <Stat label={t('ui.profile.foils')} value={formatInt(v.foils, locale)} />
            <Stat
              icon={<CrownIcon size={26} />}
              label={t('ui.profile.legendaries')}
              value={t('ui.common.progress', { n: v.legendaries, max: v.legendariesTotal })}
            />
            <Stat
              icon={<CastleIcon size={26} />}
              label={t('ui.profile.conquestStars')}
              value={t('ui.common.progress', { n: v.conquestStars, max: v.conquestMax })}
            />
            <Stat label={t('ui.profile.fastestWin')} value={v.fastestWinMs === null ? '-' : formatClock(v.fastestWinMs)} />
            <Stat label={t('ui.profile.futureReached')} value={formatInt(v.futureReached, locale)} />
          </div>
          <div class="prof-row">
            {fav ? (
              <div class="prof-fav" data-testid="profile-favourite">
                <span class="prof-sub">{t('ui.profile.favourite')}</span>
                <CardTile card={fav} size="sm" onClick={() => router.go({ id: 'cardDetail', card: fav.id })} />
              </div>
            ) : null}
            <div class="prof-tiers" data-testid="profile-tiers">
              <span class="prof-sub">{t('ui.profile.byTier')}</span>
              {v.byTier.length === 0 ? <p class="ui-muted">{t('ui.profile.noMatches')}</p> : null}
              {v.byTier.map((r) => (
                <div key={r.tier} class="prof-tier">
                  <span class="prof-tier__name">
                    <AiBadge size="sm" /> {r.tier <= 0 ? t('ui.vs.tierRookie') : t('ui.vs.tier', { tier: tierNumeral(r.tier) })}
                  </span>
                  <ProgressBar
                    value={r.wins}
                    max={Math.max(1, r.wins + r.losses)}
                    tone="green"
                    thin
                    label={t('ui.vs.tier', { tier: tierNumeral(r.tier) })}
                  />
                  <span class="prof-tier__wl ui-num" style={{ opacity: 0.6 + (0.4 * (r.wins + r.losses)) / maxTier }}>
                    {t('ui.profile.wl', { w: r.wins, l: r.losses })}
                  </span>
                </div>
              ))}
            </div>
          </div>
          {milestones.length > 0 ? (
            <div class="prof-goals" data-testid="profile-milestones">
              <span class="prof-sub">{t('ui.profile.milestones')}</span>
              {milestones.map((m) => (
                <div key={m.id} class={`prof-goal${m.done ? ' is-done' : ''}`} data-testid={`milestone-${m.id}`}>
                  <span class="prof-goal__mark" aria-hidden="true">
                    {m.done ? <CheckIcon size={16} /> : <CardsIcon size={18} />}
                  </span>
                  <span class="prof-goal__text">
                    <b>{t(titleNameKey(m.id))}</b>
                    <small>{t(titleUnlockKey(m.id))}</small>
                  </span>
                  <ProgressBar value={m.n} max={m.max} tone={m.done ? 'green' : 'gold'} thin label={t(titleNameKey(m.id))} />
                  {milestoneWearable(m.id) ? (
                    <span class={`prof-goal__reward${m.done ? ' is-done' : ''}`} title={t(milestoneWearable(m.id)!.nameKey)}>
                      <AvatarItemArt item={`avatar.${milestoneWearable(m.id)!.id}`} size={40} />
                    </span>
                  ) : null}
                  <span class="prof-goal__n ui-num">{t('ui.common.progress', { n: formatInt(m.n, locale), max: formatInt(m.max, locale) })}</span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
        <Panel title={t('ui.profile.history')} class="prof-history" testid="profile-history" labelledBy="prof-history-title">
          {rows.length === 0 ? <Empty>{t('ui.profile.noMatches')}</Empty> : null}
          <ol class="prof-matches">
            {rows.map((r) => (
              <li key={r.index} class={`prof-match prof-match--${r.result}`} data-testid={`history-${r.index}`}>
                <span class="prof-match__result">{t(RESULT_KEYS[r.result])}</span>
                <span class="prof-match__main">
                  <span class="prof-match__opp">
                    {r.isAI ? withoutAiPrefix(t(r.opponent)) : t(r.opponent)} {r.isAI ? <AiBadge size="sm" /> : null}
                  </span>
                  <span class="prof-match__meta">
                    {t(formatNameKey(r.format))} · {formatClock(r.durationMs)}
                  </span>
                </span>
                {r.playable ? (
                  <IconButton
                    icon={<ReplayIcon size={26} />}
                    label={t('ui.profile.watch')}
                    onClick={() => services.watchReplay(r.index)}
                    testid={`replay-${r.index}`}
                  />
                ) : (
                  <span class="prof-match__old" title={t('ui.profile.oldReplay')}>
                    {t('ui.profile.oldReplayShort')}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </Panel>
      </div>
      {editName ? (
        <NameModal
          name={s.profile.name}
          onClose={() => setEditName(false)}
          onSave={(name) => {
            services.setProfile({ name });
            setEditName(false);
          }}
        />
      ) : null}
    </ScreenFrame>
  );
}
