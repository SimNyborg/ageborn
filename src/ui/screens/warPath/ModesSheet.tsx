/**
 * The Modes panel (S2b, ui-plan 4.1): other ways to play, one card per row. Tapping a card selects
 * it; the panel's one primary (gold, bottom-right, where Play is on Home) starts the selected mode.
 * Quick Battle keeps its difficulty picker inline; Skirmish opens its setup screen ("Set up"); the
 * Conquest board opens as before until A18.7.10 folds it into the map. Modes that are not open yet
 * say when they open (Ladder at War Path level 6, Daily at level 7, ui-plan 2.6). Mode cards use
 * neutral surfaces, not coloured headers (U5).
 */
import type { Difficulty } from '@/content/types';
import type { ComponentChildren } from 'preact';
import { useState } from 'preact/hooks';
import { Button } from '../../components/Button';
import { AiBadge } from '../../components/Chips';
import { formatInt, tierNumeral } from '../../components/format';
import { AmberIcon, CalendarIcon, CapsuleIcon, CastleIcon, LockIcon, SwordsIcon, TrophyIcon } from '../../components/icons';
import { Sheet } from '../../components/Modal';
import type { MatchRequest } from '../../router';
import { useUi } from '../context';
import { DifficultyPicker, quickGeneral } from '../modeSelect/ModeSelectScreen';
import { difficultyFlags, lastDifficulty, unlocks } from '../model/progress';
import { featureOpen } from '../model/warPath';

type ModeId = 'quick' | 'ladder' | 'daily' | 'skirmish' | 'conquest';

export function ModesSheet(p: { onClose(): void; onStart(req: MatchRequest): void }) {
  const { save, content, t, locale, services, router } = useUi();
  const s = save.value;
  const u = unlocks(s, content);
  const ladderOpen = featureOpen(s, content, 'ladder');
  const dailyOpen = featureOpen(s, content, 'daily');
  const [pick, setPick] = useState<Difficulty>(() => lastDifficulty(s, content));
  const [sel, setSel] = useState<ModeId>('quick');
  const quickGen = quickGeneral(content, pick);
  const quickTier = content.generals.difficulty.tiers[pick];

  const cards: { id: ModeId; icon: ComponentChildren; title: string; desc: string; reward?: ComponentChildren; lock?: string | null }[] = [
    {
      id: 'quick',
      icon: <SwordsIcon size={30} />,
      title: t('warPath.ui.quick'),
      desc: t('warPath.ui.quickDesc'),
      reward: (
        <>
          <AmberIcon size={16} /> {t('warPath.ui.quickReward')}
        </>
      ),
    },
    {
      id: 'ladder',
      icon: <TrophyIcon size={30} />,
      title: t('warPath.ui.ladder'),
      desc: t('warPath.ui.ladderDesc'),
      reward: (
        <>
          <CapsuleIcon tier="bronze" size={18} /> {t('warPath.ui.ladderReward')}
        </>
      ),
      lock: ladderOpen ? null : t('warPath.ui.modeLocked', { n: content.warPath.unlocks.ladder }),
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
    { id: 'skirmish', icon: <SwordsIcon size={28} />, title: t('warPath.ui.skirmish'), desc: t('warPath.ui.skirmishDesc') },
    ...(u.conquest ? [{ id: 'conquest' as const, icon: <CastleIcon size={28} />, title: t('warPath.ui.conquest'), desc: t('warPath.ui.conquestDesc') }] : []),
  ];

  function start(id: ModeId) {
    switch (id) {
      case 'quick':
        p.onStart({ mode: 'skirmish', options: { generalId: quickGen, tier: quickTier, format: 'short', standardLevels: false }, speed: s.settings.defaultSpeed });
        return;
      case 'ladder':
        p.onStart({ mode: 'ladder', format: u.ladderFormats[0] ?? 'short' });
        return;
      case 'daily':
        p.onStart({ mode: 'daily' });
        return;
      case 'skirmish':
        p.onClose();
        router.go({ id: 'modeSelect', focus: 'skirmish' });
        return;
      case 'conquest':
        p.onClose();
        router.go({ id: 'conquest' });
        return;
    }
  }

  const selected = cards.find((c) => c.id === sel) ?? cards[0]!;
  const primaryLabel = sel === 'skirmish' ? t('warPath.ui.skirmishSetUp') : sel === 'conquest' ? t('warPath.ui.conquestOpen') : t('warPath.ui.playMode');

  return (
    <Sheet
      title={t('warPath.ui.modesTitle')}
      onClose={p.onClose}
      testid="modes-sheet"
      icon={<SwordsIcon size={24} />}
      actions={{
        primary: selected.lock ? undefined : (
          <Button kind="primary" size="l" icon={<SwordsIcon size={22} />} testid="modes-play" autofocus onClick={() => start(sel)}>
            {primaryLabel}
          </Button>
        ),
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
      <ul class="md-list" role="listbox" aria-label={t('warPath.ui.modesTitle')}>
        {cards.map((c) => {
          const on = c.id === sel;
          return (
            <li key={c.id}>
              <button
                type="button"
                role="option"
                aria-selected={on}
                class={`md-card${on ? ' is-on' : ''}${c.lock ? ' is-locked' : ''}`}
                data-testid={`mode-${c.id}`}
                onClick={() => setSel(c.id)}
              >
                <span class="md-card__icon">{c.lock ? <LockIcon size={24} /> : c.icon}</span>
                <span class="md-card__text">
                  <span class="md-card__title">{c.title}</span>
                  <span class="md-card__desc">{c.lock ?? c.desc}</span>
                  {c.reward && !c.lock ? <span class="md-card__reward">{c.reward}</span> : null}
                </span>
              </button>
              {on && c.id === 'quick' ? (
                <div class="md-card__extra">
                  <DifficultyPicker
                    value={pick}
                    onChange={(d) => {
                      setPick(d);
                      services.setUiFlags(difficultyFlags(d, content));
                    }}
                    testid="modes-difficulty"
                  />
                  <p class="md-card__meta">
                    <AiBadge size="sm" />
                    <b>{t(content.generals.list[quickGen].nameKey)}</b>
                    <span>{t('ui.vs.tier', { tier: tierNumeral(quickTier) })}</span>
                    <span>· {formatInt(content.arenas.ladder.skirmishWinAmber, locale)}</span>
                    <AmberIcon size={14} />
                  </p>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </Sheet>
  );
}
