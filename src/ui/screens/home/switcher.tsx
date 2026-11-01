/**
 * The mode button (spec "online-first Battle hub" 1.3, 2026-10-01; queue item 50, 2026-11-01): the one
 * button left of Battle that *shows* the mode Battle plays ("Ranked · Online", "Quick · vs AI") and opens
 * the Modes panel, where every mode lives, Friend Duel's "coming with online play" card included (the
 * separate Friend Duel chip is gone: two buttons opened the same panel). Slate, never a second primary.
 * Where the row has room (800 px wide and up) it reads as a picker: the mode's icon, its name and tag and
 * a caret, 152 × 64 on phones and 200 × 80 on desktops; narrower it is the 88 × 64 tile. Opens at 3 wins.
 * The Ladder reads "Ranked · Online": online ranked play (owner decision 2026-10-07).
 */
import type { ComponentChildren } from 'preact';
import { Button } from '../../components/Button';
import { CalendarIcon, CaretIcon, FriendsIcon, GlobeIcon, SwordsIcon, TrophyIcon } from '../../components/icons';
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
      <span class="hub-switch__name" key={p.mode} data-clip-check="">
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
