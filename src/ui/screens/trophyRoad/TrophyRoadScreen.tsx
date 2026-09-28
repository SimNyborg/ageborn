/**
 * Trophy Road (A9 #12, A6.3): a vertical path from the start at the bottom to 4,000 at the top,
 * with arena gates as banners and 60 claimable nodes. Your best trophies place the marker; nodes at
 * or below it can be claimed. Scrolls to your position on open.
 */
import './trophyRoad.css';
import { arenaNameKey, bannerNameKey, capsuleTierNameKey, formatNameKey, skinNameKey } from '@/content/keys';
import type { ArenaDef, GateReward } from '@/content/types';
import type { JSX } from 'preact';
import { useEffect, useRef } from 'preact/hooks';
import { Avatar } from '../../components/Avatar';
import { Button } from '../../components/Button';
import { Pill } from '../../components/Chips';
import { formatInt } from '../../components/format';
import { CapsuleIcon, CastleIcon, CheckIcon, CrateIcon, FlagIcon, LockIcon, RobotIcon, ScrollIcon, TrophyIcon } from '../../components/icons';
import { ScreenFrame } from '../../components/Layout';
import type { RouteOf } from '../../router';
import { useUi } from '../context';
import { roadNodes, roadProgress, type RoadNodeView } from '../model/progress';
import { RoadRewardView } from '../shared/RoadReward';

function GateLines(p: { arena: ArenaDef; prev: ArenaDef | null }) {
  const { t, content } = useUi();
  const newFormats = p.arena.ladderFormats.filter((f) => !(p.prev?.ladderFormats ?? []).includes(f));
  const line = (g: GateReward, i: number) => {
    switch (g.kind) {
      case 'starterPlan':
        return (
          <li key={i}>
            <ScrollIcon size={18} /> {t('ui.road.gate.starterPlan')}
          </li>
        );
      case 'banner':
        return (
          <li key={i}>
            <FlagIcon size={18} /> {t('ui.road.gate.banner', { name: t(bannerNameKey(g.banner)) })}
          </li>
        );
      case 'capsule':
        return (
          <li key={i}>
            <CapsuleIcon tier={g.tier} size={20} /> {t(capsuleTierNameKey(g.tier))}
          </li>
        );
      case 'ageUnlock':
        return (
          <li key={i}>
            <CapsuleIcon tier="silver" size={20} /> {t('ui.road.gate.ageUnlock', { n: g.ages.length })}
          </li>
        );
      case 'conquestUnlock':
        return (
          <li key={i}>
            <CastleIcon size={18} /> {t('ui.road.gate.conquest')}
          </li>
        );
      case 'skin':
        return (
          <li key={i}>
            <CrateIcon size={20} /> {t('ui.road.gate.skin', { name: t(skinNameKey(g.skin)) })}
          </li>
        );
      case 'wardenJoins':
        return (
          <li key={i}>
            <RobotIcon size={18} /> {t('ui.road.gate.warden', { name: t(content.generals.list.warden.nameKey) })}
          </li>
        );
    }
  };
  return (
    <ul class="road-gate__list">
      {newFormats.map((f) => (
        <li key={f}>
          <TrophyIcon size={18} /> {t('ui.road.gate.format', { name: t(formatNameKey(f)) })}
        </li>
      ))}
      {p.arena.gateRewards.map(line)}
    </ul>
  );
}

function Node(p: { v: RoadNodeView; side: 'l' | 'r' }) {
  const { t, locale, services, toasts } = useUi();
  const { v } = p;
  return (
    <li class={`road-node road-node--${p.side} is-${v.state}`} data-testid={`road-node-${v.node.trophies}`}>
      <span class="road-node__dot" aria-hidden="true">
        {v.state === 'claimed' ? <CheckIcon size={18} /> : v.state === 'locked' ? <LockIcon size={16} /> : <TrophyIcon size={18} />}
      </span>
      <div class="road-node__card">
        <span class="road-node__trophies">
          <TrophyIcon size={16} /> {formatInt(v.node.trophies, locale)}
        </span>
        <span class="road-node__rewards">
          {v.node.rewards.map((r, i) => (
            <RoadRewardView key={i} r={r} />
          ))}
        </span>
        {v.state === 'claimable' ? (
          <Button
            variant="green"
            size="sm"
            testid={`road-claim-${v.node.trophies}`}
            onClick={() => {
              const r = services.claimRoadNode(v.node.trophies);
              toasts.show(r.ok ? t('ui.road.claimed') : t('ui.error.generic'), { tone: r.ok ? 'good' : 'bad' });
            }}
          >
            {t('ui.home.claim')}
          </Button>
        ) : v.state === 'claimed' ? (
          <span class="road-node__done">{t('ui.quest.claimed')}</span>
        ) : null}
      </div>
    </li>
  );
}

export function TrophyRoadScreen(_p: { route: RouteOf<'trophyRoad'> }) {
  const { save, content, t, locale, router } = useUi();
  const s = save.value;
  const nodes = roadNodes(s, content);
  const rp = roadProgress(s, content);
  const marker = useRef<HTMLLIElement>(null);
  useEffect(() => {
    const el = marker.current;
    if (el && typeof el.scrollIntoView === 'function') el.scrollIntoView({ block: 'center' });
  }, []);

  const arenas = content.arenas.list;
  const items: JSX.Element[] = [];
  const desc = [...nodes].reverse();
  let markerPlaced = false;
  const placeMarker = () => {
    markerPlaced = true;
    items.push(
      <li key="marker" ref={marker} class="road-marker" data-testid="road-marker">
        <Avatar spec={s.profile.avatar} size={44} frameColor="var(--ui-gold)" />
        <span class="road-marker__text">
          <b>{t('ui.road.you')}</b>
          <span>
            <TrophyIcon size={16} /> {formatInt(s.trophies.best, locale)}
          </span>
        </span>
      </li>,
    );
  };
  desc.forEach((v, i) => {
    if (!markerPlaced && v.node.trophies <= s.trophies.best) placeMarker();
    if (v.gate) {
      const prev = arenas.find((a) => a.index === v.gate!.index - 1) ?? null;
      items.push(
        <li
          key={`gate-${v.gate.id}`}
          class={`road-gate${v.node.trophies <= s.trophies.best ? ' is-open' : ''}`}
          data-testid={`road-gate-${v.gate.index}`}
        >
          <span class="road-gate__num">{t('ui.home.arenaN', { n: v.gate.index })}</span>
          <span class="road-gate__name">{t(arenaNameKey(v.gate.id))}</span>
          <GateLines arena={v.gate} prev={prev} />
        </li>,
      );
    }
    items.push(<Node key={v.node.trophies} v={v} side={i % 2 === 0 ? 'l' : 'r'} />);
  });
  if (!markerPlaced) placeMarker();
  const first = arenas[0]!;
  items.push(
    <li key="start" class="road-gate is-open road-gate--start" data-testid="road-gate-1">
      <span class="road-gate__num">{t('ui.home.arenaN', { n: first.index })}</span>
      <span class="road-gate__name">{t(arenaNameKey(first.id))}</span>
      <GateLines arena={first} prev={null} />
    </li>,
  );

  return (
    <ScreenFrame
      id="trophyRoad"
      title={t('ui.nav.trophyRoad')}
      onBack={() => router.back()}
      subtitle={
        <span class="road-sub">
          <Pill tone="gold" icon={<TrophyIcon size={16} />}>
            {t('ui.road.best', { n: formatInt(rp.best, locale) })}
          </Pill>
          {rp.claimable > 0 ? <Pill tone="green">{t('ui.road.claimable', { n: rp.claimable })}</Pill> : null}
        </span>
      }
    >
      <ol class="road" data-testid="road">
        {items}
      </ol>
    </ScreenFrame>
  );
}
