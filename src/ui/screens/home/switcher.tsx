/**
 * The mode switcher (spec "online-first Battle hub" 1.3, 2026-10-01): the Modes tile left of Battle
 * now *shows* the mode Battle plays ("Ranked · Online", "Quick · vs AI") and opens the chooser. Same
 * box as the Modes tile (88 × 64 phone, 112 × 80 desktop), slate, never a second primary. Opens at 3
 * wins. The Ladder reads "Ranked · Online": online ranked play (owner decision 2026-10-07).
 */
import type { ComponentChildren } from 'preact';
import { Button } from '../../components/Button';
import { CalendarIcon, CaretIcon, FriendsIcon, GlobeIcon, LockIcon, SwordsIcon, TrophyIcon } from '../../components/icons';
import { useUi } from '../context';
import type { HomeMode } from '../model/homeMode';

/** Every mode the switcher can show: the AI modes now, the online ones when they work (M2, M4). */
export type SwitcherMode = HomeMode | 'online' | 'friend';

export const MODE_LOOK: Readonly<Record<SwitcherMode, { icon: (size: number) => ComponentChildren; nameKey: string; tagKey: string }>> = {
  ladder: { icon: (s) => <TrophyIcon size={s} />, nameKey: 'ui.switcher.ladder', tagKey: 'ui.switcher.tagOnline' },
  quick: { icon: (s) => <SwordsIcon size={s} />, nameKey: 'ui.switcher.quick', tagKey: 'ui.switcher.tagAi' },
  daily: { icon: (s) => <CalendarIcon size={s} />, nameKey: 'ui.switcher.daily', tagKey: 'ui.switcher.tagAi' },
  skirmish: { icon: (s) => <SwordsIcon size={s} />, nameKey: 'ui.switcher.skirmish', tagKey: 'ui.switcher.tagAi' },
  online: { icon: (s) => <GlobeIcon size={s} />, nameKey: 'ui.switcher.online', tagKey: 'ui.switcher.tagPlayers' },
  friend: { icon: (s) => <FriendsIcon size={s} />, nameKey: 'ui.switcher.friend', tagKey: 'ui.switcher.tagFriend' },
};

export function ModeSwitcher(p: { mode: SwitcherMode; onOpen(): void; disabled?: boolean; reason?: string }) {
  const { t } = useUi();
  const look = MODE_LOOK[p.mode];
  const name = t(look.nameKey);
  return (
    <Button
      kind="secondary"
      size="xl"
      class="wp-modes hub-switch"
      icon={
        <span class="hub-switch__icon" key={p.mode} data-mode={p.mode}>
          {look.icon(24)}
        </span>
      }
      testid="home-modes"
      label={t('ui.switcher.label', { mode: `${name} · ${t(look.tagKey)}` })}
      disabled={p.disabled}
      reason={p.reason}
      onClick={p.onOpen}
    >
      <span class="hub-switch__name" key={p.mode}>
        {name}
      </span>
      <span class="hub-switch__tag" data-tag="" data-mode={p.mode}>
        {t(look.tagKey)}
      </span>
      <span class="hub-switch__caret" aria-hidden="true">
        <CaretIcon size={14} />
      </span>
    </Button>
  );
}

/**
 * The one online entry Home shows before online play works (owner decision 2026-10-01: "Home keeps
 * the online-ready layout, with the friend entry shown as coming later"). A quiet, locked chip left of
 * the switcher: it never starts anything and never looks like a primary. A tap opens the Modes panel
 * with the Friend Duel card (first, under "vs players") explaining what it will be.
 */
export function FriendSoonChip(p: { onOpen(): void }) {
  const { t } = useUi();
  return (
    <button type="button" class="hub-friend" data-testid="home-friend-soon" aria-label={t('ui.hub.friendSoonAria')} onClick={p.onOpen}>
      <span class="hub-friend__icon" aria-hidden="true">
        <FriendsIcon size={22} />
        <span class="hub-friend__lock">
          <LockIcon size={12} />
        </span>
      </span>
      <span class="hub-friend__name" data-clip-check="">
        {t('ui.modesPanel.friend')}
      </span>
      <span class="hub-friend__tag" data-clip-check="" data-tag="">
        <span class="hub-friend__short">{t('ui.hub.friendSoon')}</span>
        <span class="hub-friend__long">{t('ui.modesPanel.friendSoon')}</span>
      </span>
    </button>
  );
}
