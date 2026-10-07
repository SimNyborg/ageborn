/**
 * The Modes panel (S2b, ui-plan 4.1), reworked on 2026-10-01 into the **mode switcher's chooser**
 * (spec "online-first Battle hub" 1.3): one card per row (icon, name, one plain line, the reward and a
 * check on the selected card). A tap **selects** the mode and closes the panel; it never starts a
 * match: Battle on Home plays the selected mode (MR-120: the card's icon flies into the switcher).
 *
 * - **vs AI**: Ladder (the default), Quick Battle, Daily Challenge (opens at 6 wins), Skirmish ("Set
 *   up" opens its setup; once a setup has been played the card selects it), Conquest (opens its
 *   board, until A18.7.10 folds it into the map).
 * - **vs players** (first): Friend Duel, shown now as a locked card that says it arrives with online play and
 *   what it will be (owner request 2026-10-01: Home should lead towards 2-player online battles).
 *   Online Battle and Ranked join when they work (M4, M5); the dev mock shows them.
 *
 * No timers, no countdowns, no player counts. Mode cards use neutral surfaces (U5).
 */
import type { ComponentChildren } from 'preact';
import { useRef, useState } from 'preact/hooks';
import { Button } from '../../components/Button';
import { AmberIcon, CalendarIcon, CapsuleIcon, CastleIcon, CheckIcon, FriendsIcon, GlobeIcon, LockIcon, QuickBattleIcon, SkirmishIcon, SwordsIcon, TrophyIcon } from '../../components/icons';
import { Sheet } from '../../components/Modal';
import { useUi } from '../context';
import type { SwitcherMode } from '../home/switcher';
import { skirmishSetup } from '../model/homeMode';
import { unlocks } from '../model/progress';
import { featureOpen } from '../model/warPath';

interface Card {
  id: SwitcherMode | 'conquest';
  icon: ComponentChildren;
  title: string;
  desc: string;
  reward?: ComponentChildren;
  /** Why it cannot be picked yet (its line replaces the description). */
  lock?: string | null;
  /** A side action on the card (Skirmish's Set up). */
  side?: ComponentChildren;
  /** More words that a tap on a locked card reveals (Friend Duel). */
  more?: string;
}

export function ModesSheet(p: {
  selected: SwitcherMode;
  onSelect(mode: SwitcherMode, icon: Element | null): void;
  onClose(): void;
  /** The dev mock of online play (spec 1.8): Online Battle and Friend Duel are pickable. */
  online?: boolean;
  /** A card whose note opens with the panel (Home's Friend Duel chip opens it on Friend Duel). */
  focus?: SwitcherMode | null;
}) {
  const { save, content, t, router } = useUi();
  const s = save.value;
  const u = unlocks(s, content);
  const dailyOpen = featureOpen(s, content, 'daily');
  const hasSetup = skirmishSetup(s, content) !== null;
  const close = useRef<(() => void) | null>(null);
  const [more, setMore] = useState<string | null>(p.focus ?? null);

  const setUp = () => {
    p.onClose();
    router.go({ id: 'modeSelect', focus: 'skirmish' });
  };

  const ai: Card[] = [
    {
      id: 'ladder',
      icon: <TrophyIcon size={30} />,
      title: t('warPath.ui.ladder'),
      desc: t('ui.modesPanel.ladderDesc'),
      reward: (
        <>
          <TrophyIcon size={16} /> {t('ui.modesPanel.ladderReward')}
        </>
      ),
    },
    {
      id: 'quick',
      icon: <QuickBattleIcon size={30} />,
      title: t('warPath.ui.quick'),
      desc: t('warPath.ui.quickDesc'),
      reward: (
        <>
          <AmberIcon size={16} /> {t('warPath.ui.quickReward')}
        </>
      ),
    },
    {
      id: 'daily',
      icon: <CalendarIcon size={28} />,
      title: t('warPath.ui.daily'),
      desc: t('warPath.ui.dailyDesc'),
      reward: (
        <>
          <CapsuleIcon tier="silver" size={18} /> {t('warPath.ui.dailyReward')}
        </>
      ),
      lock: dailyOpen ? null : t('warPath.ui.modeLocked', { n: content.warPath.unlocks.daily }),
    },
    {
      id: 'skirmish',
      icon: <SkirmishIcon size={30} />,
      title: t('warPath.ui.skirmish'),
      desc: t('warPath.ui.skirmishDesc'),
      side: (
        <Button kind="secondary" size="s" testid="skirmish-open" onClick={setUp}>
          {t('warPath.ui.skirmishSetUp')}
        </Button>
      ),
    },
    ...(u.conquest
      ? [
          {
            id: 'conquest' as const,
            icon: <CastleIcon size={28} />,
            title: t('warPath.ui.conquest'),
            desc: t('warPath.ui.conquestDesc'),
            side: (
              <Button
                kind="secondary"
                size="s"
                testid="conquest-open"
                onClick={() => {
                  p.onClose();
                  router.go({ id: 'conquest' });
                }}
              >
                {t('warPath.ui.conquestOpen')}
              </Button>
            ),
          },
        ]
      : []),
  ];
  const players: Card[] = [
    ...(p.online
      ? [
          {
            id: 'online' as const,
            icon: <GlobeIcon size={30} />,
            title: t('ui.modesPanel.online'),
            desc: t('ui.modesPanel.onlineDesc'),
            reward: (
              <>
                <AmberIcon size={16} /> {t('ui.modesPanel.onlineReward')}
              </>
            ),
          },
        ]
      : []),
    {
      id: 'friend',
      icon: <FriendsIcon size={30} />,
      title: t('ui.modesPanel.friend'),
      desc: t('ui.modesPanel.friendDesc'),
      lock: p.online ? null : t('ui.modesPanel.friendSoon'),
      more: t('ui.modesPanel.friendInfo'),
    },
  ];

  function tap(c: Card, el: HTMLElement) {
    if (c.lock) {
      setMore((m) => (m === c.id ? null : c.id));
      return;
    }
    if (c.id === 'conquest') {
      p.onClose();
      router.go({ id: 'conquest' });
      return;
    }
    if (c.id === 'skirmish' && !hasSetup) {
      setUp();
      return;
    }
    p.onSelect(c.id, el.querySelector('.md-card__icon svg'));
    close.current?.();
  }

  const row = (c: Card) => {
    const on = c.id === p.selected;
    const open = more === c.id;
    return (
      <li key={c.id} class="md-row">
        <button
          type="button"
          aria-pressed={c.lock ? undefined : on}
          aria-disabled={c.lock ? 'true' : undefined}
          aria-expanded={c.lock && c.more ? open : undefined}
          class={`md-card${on ? ' is-on' : ''}${c.lock ? ' is-locked' : ''}${c.side ? ' has-side' : ''}`}
          data-testid={`mode-${c.id}`}
          onClick={(e) => tap(c, e.currentTarget)}
        >
          <span class="md-card__icon">
            {c.icon}
            {c.lock ? (
              <span class="md-card__lock">
                <LockIcon size={16} />
              </span>
            ) : null}
          </span>
          <span class="md-card__text">
            <span class="md-card__title">{c.title}</span>
            <span class={`md-card__desc${c.lock ? ' is-lock' : ''}`}>{c.lock ?? c.desc}</span>
            {c.reward && !c.lock ? <span class="md-card__reward">{c.reward}</span> : null}
            {c.lock && c.more && !open ? <span class="md-card__desc">{c.desc}</span> : null}
          </span>
          {on ? (
            <span class="md-card__check" aria-hidden="true">
              <CheckIcon size={20} />
            </span>
          ) : null}
        </button>
        {c.side ? <span class="md-card__side">{c.side}</span> : null}
        {open && c.more ? (
          <p class="md-card__more" role="note" data-testid={`mode-${c.id}-more`} ref={(el) => el?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' })}>
            {c.more}
          </p>
        ) : null}
      </li>
    );
  };

  return (
    <Sheet
      title={t('warPath.ui.modesTitle')}
      onClose={p.onClose}
      closeRef={close}
      testid="modes-sheet"
      icon={<SwordsIcon size={24} />}
      actions={{
        tertiary: (
          <Button
            kind="tertiary"
            size="s"
            testid="modes-all"
            onClick={() => {
              p.onClose();
              router.go({ id: 'modeSelect' });
            }}
          >
            {t('warPath.ui.moreOptions')}
          </Button>
        ),
      }}
    >
      <p class="md-hint">{t('ui.modesPanel.selectHint')}</p>
      {/* vs players leads: the game is built for 2-player online battles (owner request 2026-10-01). */}
      {(['players', 'ai'] as const).map((g) => (
        <div key={g}>
          <h3 class="md-group" data-tag="">
            {t(g === 'ai' ? 'ui.modesPanel.groupAi' : 'ui.modesPanel.groupPlayers')}
          </h3>
          <ul class="md-list" aria-label={t(g === 'ai' ? 'ui.modesPanel.groupAi' : 'ui.modesPanel.groupPlayers')}>
            {(g === 'ai' ? ai : players).map(row)}
          </ul>
        </div>
      ))}
    </Sheet>
  );
}
