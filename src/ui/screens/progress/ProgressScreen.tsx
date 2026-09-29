/**
 * The Progress tab (S13, ui-plan 4.1b): every long-term goal in one home. Interim for UI-2: Goals
 * (the quests with their Claim and the War Chest) on the left, and on the right the other long-term
 * records as rows that open their screens: War Path stars, Trophy Road (from Ladder, War Path level
 * 6), Feats and the Record (Profile). The top tabs of 4.1b follow with UI-5.
 */
import '../home/home.css';
import './progress.css';
import type { ComponentChildren } from 'preact';
import { ScreenFrame } from '../../components/Layout';
import { ProfileIcon, RoadIcon, StarIcon, TrophyIcon } from '../../components/icons';
import { formatInt } from '../../components/format';
import type { RouteOf } from '../../router';
import { useUi } from '../context';
import { QuestsPanel, RoadBar } from '../home/parts';
import { featureOpen, mapRegions } from '../model/warPath';

function Row(p: { icon: ComponentChildren; title: string; value?: string; onClick: () => void; testid: string }) {
  return (
    <button type="button" class="prog-row" data-testid={p.testid} onClick={p.onClick}>
      <span class="prog-row__icon">{p.icon}</span>
      <span class="prog-row__title">{p.title}</span>
      {p.value ? <span class="prog-row__value ui-num">{p.value}</span> : null}
      <svg class="prog-row__chev" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </button>
  );
}

export function ProgressScreen(_p: { route: RouteOf<'progress'> }) {
  const { t, router, save, content, locale } = useUi();
  const s = save.value;
  const regions = mapRegions(s, content);
  const stars = regions.reduce((n, r) => n + r.stars, 0);
  const max = regions.reduce((n, r) => n + r.max, 0);
  return (
    <ScreenFrame id="progress" title={t('warPath.ui.progressTitle')} onBack={() => router.back()}>
      <div class="prog" data-testid="progress-tab">
        <div class="prog__goals">
          <QuestsPanel />
        </div>
        <div class="prog__side">
          <Row
            testid="progress-warpath"
            icon={<StarIcon size={26} />}
            title={t('warPath.ui.warPathStars')}
            value={`${formatInt(stars, locale)}/${formatInt(max, locale)}`}
            onClick={() => router.switchTab('warPath', { id: 'home' })}
          />
          {featureOpen(s, content, 'ladder') ? <RoadBar /> : null}
          <Row testid="progress-feats" icon={<TrophyIcon size={26} />} title={t('warPath.ui.feats')} onClick={() => router.go({ id: 'collection', tab: 'feats' })} />
          <Row testid="progress-record" icon={<ProfileIcon size={26} />} title={t('warPath.ui.record')} onClick={() => router.go({ id: 'profile' })} />
          {featureOpen(s, content, 'ladder') ? null : (
            <Row testid="progress-road" icon={<RoadIcon size={26} />} title={t('warPath.ui.trophyRoad')} onClick={() => router.go({ id: 'trophyRoad' })} />
          )}
        </div>
      </div>
    </ScreenFrame>
  );
}
