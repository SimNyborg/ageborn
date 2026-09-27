/**
 * Profile (A9 #13, A6.1): the editable auto name, the look (face avatar or a unit portrait, banner,
 * frame, title), stats (trophies and arena, wins and losses by AI tier, favourite card, collection,
 * foils, Codex Level, Conquest stars, fastest win, Future Age reached, Legendaries) and the history
 * of the last 20 matches, each with a replay and an "AI" marker (A7.1). No login, no account.
 */
import './profile.css';
import { bannerNameKey, formatNameKey, frameNameKey, titleNameKey } from '@/content/keys';
import type { CardId } from '@/contracts';
import type { ComponentChildren } from 'preact';
import { useState } from 'preact/hooks';
import { Avatar } from '../../components/Avatar';
import { Button, IconButton } from '../../components/Button';
import { CardTile } from '../../components/CardTile';
import { AiBadge, Pill } from '../../components/Chips';
import { formatClock, formatInt, tierNumeral } from '../../components/format';
import { CardsIcon, CastleIcon, CrownIcon, PencilIcon, ReplayIcon, StarIcon, SwordsIcon, TrophyIcon } from '../../components/icons';
import { Empty, Panel, ScreenFrame } from '../../components/Layout';
import { ProgressBar } from '../../components/Meters';
import { Modal } from '../../components/Modal';
import type { RouteOf } from '../../router';
import { useUi } from '../context';
import { cardTile, isOwned } from '../model/cards';
import { historyRows, profileView } from '../model/profile';

const RESULT_KEYS = { win: 'ui.profile.win', loss: 'ui.profile.loss', draw: 'ui.profile.draw' } as const;

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
        <Button variant="green" disabled={trimmed.length === 0} testid="name-save" onClick={() => p.onSave(trimmed)}>
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
      <p class="prof-hint">{t('ui.profile.nameHint')}</p>
    </Modal>
  );
}

function LookModal(p: { onClose: () => void }) {
  const { save, content, t, services } = useUi();
  const s = save.value;
  const frames = content.cosmetics.frames.filter((f) => f.codexLevel <= s.codexLevel);
  const banners = content.cosmetics.banners.filter(
    (b) => b.id === s.profile.banner || s.cosmetics.owned.includes(b.id) || b.id === content.cosmetics.defaults.banner,
  );
  const titles = content.cosmetics.titles.filter(
    (x) => x.id === s.profile.title || s.cosmetics.owned.includes(x.id) || x.id === content.cosmetics.defaults.title,
  );
  const portraits = content.order.units.filter((id) => isOwned(s, id, content)).slice(0, 40);
  return (
    <Modal title={t('ui.profile.look')} size="lg" onClose={p.onClose} testid="look-modal">
      <div class="prof-look">
        <section>
          <h3>{t('ui.profile.portrait')}</h3>
          <div class="prof-look__grid">
            <button
              type="button"
              class={`prof-look__opt${s.profile.avatar.portraitCard ? '' : ' is-on'}`}
              onClick={() => services.setProfile({ portraitCard: null })}
              data-testid="look-face"
            >
              <Avatar spec={{ ...s.profile.avatar, portraitCard: undefined }} size={56} />
              <span>{t('ui.profile.face')}</span>
            </button>
            {portraits.map((id: CardId) => {
              const tile = cardTile(s, content, id, t)!;
              return (
                <button
                  key={id}
                  type="button"
                  class={`prof-look__opt${s.profile.avatar.portraitCard === id ? ' is-on' : ''}`}
                  onClick={() => services.setProfile({ portraitCard: id })}
                >
                  <CardTile card={{ ...tile, isNew: false, upgradeReady: false }} size="xs" hideLevel />
                  <span>{tile.name}</span>
                </button>
              );
            })}
          </div>
        </section>
        <section>
          <h3>{t('ui.profile.frame')}</h3>
          <div class="prof-look__chips">
            <button
              type="button"
              class={`prof-chipbtn${s.profile.frame === 'none' ? ' is-on' : ''}`}
              onClick={() => services.setProfile({ frame: 'none' })}
            >
              {t('ui.profile.noFrame')}
            </button>
            {frames.map((f) => (
              <button
                key={f.id}
                type="button"
                class={`prof-chipbtn${s.profile.frame === f.id ? ' is-on' : ''}`}
                onClick={() => services.setProfile({ frame: f.id })}
              >
                {t(frameNameKey(f.id))}
              </button>
            ))}
          </div>
          <h3>{t('ui.profile.banner')}</h3>
          <div class="prof-look__chips">
            {banners.map((b) => (
              <button
                key={b.id}
                type="button"
                class={`prof-chipbtn${s.profile.banner === b.id ? ' is-on' : ''}`}
                onClick={() => services.setProfile({ banner: b.id })}
              >
                {t(bannerNameKey(b.id))}
              </button>
            ))}
          </div>
          <h3>{t('ui.profile.title')}</h3>
          <div class="prof-look__chips">
            {titles.map((x) => (
              <button
                key={x.id}
                type="button"
                class={`prof-chipbtn${s.profile.title === x.id ? ' is-on' : ''}`}
                onClick={() => services.setProfile({ title: x.id })}
              >
                {t(titleNameKey(x.id))}
              </button>
            ))}
          </div>
        </section>
      </div>
    </Modal>
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
  const [look, setLook] = useState(false);
  const fav = v.favourite ? cardTile(s, content, v.favourite, t) : null;
  const winRate = v.matches > 0 ? Math.round((v.wins * 100) / v.matches) : 0;
  const frame = content.cosmetics.frames.find((f) => f.id === s.profile.frame);
  const maxTier = Math.max(1, ...v.byTier.map((r) => r.wins + r.losses));

  return (
    <ScreenFrame id="profile" title={t('ui.nav.profile')} onBack={() => router.back()}>
      <div class="prof">
        <div class="prof-left">
          <Panel class="prof-card" tone="default">
            <div class="prof-id">
              <button
                type="button"
                class="prof-avatar"
                onClick={() => setLook(true)}
                aria-label={t('ui.profile.look')}
                data-testid="edit-look"
              >
                <Avatar spec={s.profile.avatar} size={104} frameColor={frame ? 'var(--ui-gold)' : 'var(--ui-team-me)'} />
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
                {s.profile.title ? <span class="prof-id__title">{t(titleNameKey(s.profile.title))}</span> : null}
                <span class="prof-id__pills">
                  <Pill tone="gold" icon={<TrophyIcon size={16} />}>
                    {formatInt(v.trophies, locale)}
                  </Pill>
                  <Pill tone="blue">{t(v.arenaNameKey)}</Pill>
                  {s.profile.banner ? <Pill tone="red">{t(bannerNameKey(s.profile.banner))}</Pill> : null}
                </span>
              </div>
            </div>
          </Panel>
          <div class="prof-stats" data-testid="profile-stats">
            <Stat testid="stat-best" icon={<TrophyIcon size={26} />} label={t('ui.profile.best')} value={formatInt(v.best, locale)} />
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
                    <AiBadge size="sm" /> {t('ui.vs.tier', { tier: tierNumeral(r.tier) })}
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
        </div>
        <Panel title={t('ui.profile.history')} class="prof-history" testid="profile-history" labelledBy="prof-history-title">
          {rows.length === 0 ? <Empty>{t('ui.profile.noMatches')}</Empty> : null}
          <ol class="prof-matches">
            {rows.map((r) => (
              <li key={r.index} class={`prof-match prof-match--${r.result}`} data-testid={`history-${r.index}`}>
                <span class="prof-match__result">{t(RESULT_KEYS[r.result])}</span>
                <span class="prof-match__main">
                  <span class="prof-match__opp">
                    {t(r.opponent)} {r.isAI ? <AiBadge size="sm" /> : null}
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
          <p class="prof-hint">{t('ui.ai.allAi')}</p>
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
      {look ? <LookModal onClose={() => setLook(false)} /> : null}
    </ScreenFrame>
  );
}
