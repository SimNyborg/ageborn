/**
 * Level preview (S2a, ui-plan 4.1): everything about one level before you play it, in the side panel.
 *
 * Top: the General (portrait 72, AI badge, name, tier and "plays by the same rules as you"), the
 * level name and role. Then one row each: objective, ages, rules (modifiers), and a highlighted row
 * for a boss's disclosed base. Then the goals and reward strip (★ win, ★★ the goal, ★★★ the goal on
 * Hard; the ★★ and ★★★ captions once the level is beaten or from L5) with the first-clear reward at
 * its end, the difficulty control (same rule), a tip for what the level teaches, and "Edit army".
 *
 * Action bar: "Play level N" / "Replay level N" (gold). A locked level has no primary: a padlock line
 * "Beat level 4 first" and "Go to my level" (secondary). MR-46: the tier label flips when the
 * difficulty changes and the ★★★ line lights up on Hard or harder.
 */
import { ageNameKey, capsuleTierNameKey, modifierNameKey } from '@/content/keys';
import type { WarPathDifficulty } from '@/contracts';
import { GeneralPortrait } from '../../components/Avatar';
import { Button } from '../../components/Button';
import { AiBadge } from '../../components/Chips';
import { Segmented } from '../../components/Controls';
import { formatInt, tierNumeral } from '../../components/format';
import { AmberIcon, CapsuleIcon, CardsIcon, CastleIcon, CrownIcon, FlagIcon, InfoIcon, LockIcon, ScrollIcon, StarIcon, SwordsIcon } from '../../components/icons';
import { Sheet } from '../../components/Modal';
import { useUi } from '../context';
import { DIFFICULTY_NAME_KEYS } from '../model/progress';
import { goalsShown, goalText, hardMarked, levelNameKey, levelTier, progressOf, regionNameKey, type MapNode } from '../model/warPath';

export function LevelSheet(p: {
  node: MapNode;
  /** The current level's number, for the locked line and "Go to my level". */
  current: MapNode | null;
  onClose(): void;
  onPlay(difficulty: WarPathDifficulty): void;
  onGoMine(): void;
}) {
  const { save, content, t, locale, services, router } = useUi();
  const s = save.value;
  const n = p.node;
  const level = n.level;
  const g = content.generals.list[level.general];
  const diff = progressOf(s).difficulty;
  const tier = levelTier(content, level, diff);
  const shown = goalsShown(s, content, level);
  const locked = n.state === 'locked';
  const boss = level.role === 'boss';
  const fmt = content.formats[level.format];
  const ages = (fmt?.ages ?? [level.region]).map((a) => t(ageNameKey(a)));
  const goal = goalText(level.goal2);
  const hard = content.warPath.difficulty.order.indexOf(diff) >= content.warPath.difficulty.order.indexOf(content.warPath.threeStarFrom);
  const reward = level.reward;
  const card = reward.card ? (content.units[reward.card] ?? content.turrets[reward.card]) : null;
  const cleared = n.state === 'beaten';
  const prevRegionBoss = locked && level.index === 1 && n.i > 0;
  const lockLine = locked
    ? prevRegionBoss
      ? t('warPath.ui.lockedRegion', { region: t(regionNameKey(content.warPath.levels[content.warPath.order[n.i - 1]!]!.region)) })
      : t('warPath.ui.locked', { n: content.warPath.levels[content.warPath.order[n.i - 1] ?? '']?.index ?? 1 })
    : null;
  const roleKey = `warPath.role.${level.role}`;

  const primary = locked ? undefined : (
    <Button kind="primary" size="l" icon={<SwordsIcon size={24} />} testid="level-play" autofocus onClick={() => p.onPlay(diff)}>
      {cleared ? t('warPath.ui.replay', { n: level.index }) : t('warPath.ui.play', { n: level.index })}
    </Button>
  );

  return (
    <Sheet
      title={t(levelNameKey(level.id))}
      onClose={p.onClose}
      testid="level-sheet"
      icon={boss ? <CrownIcon size={24} /> : <FlagIcon size={22} />}
      actions={{
        primary,
        secondary: locked ? (
          <Button kind="secondary" size="m" testid="level-go-mine" onClick={p.onGoMine}>
            {t('warPath.ui.goMine')}
          </Button>
        ) : (
          <Button
            kind="secondary"
            size="m"
            icon={<ScrollIcon size={20} />}
            testid="level-edit-army"
            onClick={() => {
              p.onClose();
              router.jump({ id: 'warPlan', age: level.region }, 'army');
            }}
          >
            {t('warPath.ui.editArmy')}
          </Button>
        ),
        ...(lockLine
          ? {
              tertiary: (
                <span class="lv-lock" data-testid="level-locked">
                  <LockIcon size={18} /> {lockLine}
                </span>
              ),
            }
          : {}),
      }}
    >
      <div class={`lv${locked ? ' is-locked' : ''}`} data-testid="level-preview" data-level={level.id}>
        <header class="lv-head">
          <span class="lv-head__portrait">
            <GeneralPortrait generalId={level.general} size={72} label={g ? t(g.nameKey) : level.general} />
            <span class="lv-head__ai">
              <AiBadge size="sm" />
            </span>
          </span>
          <span class="lv-head__text">
            <span class="lv-head__role" data-clip-check="">
              {t('warPath.ui.levelN', { n: level.index })} · {t(roleKey)}
              {hardMarked(level) ? (
                <span class="lv-tag" data-tag="">
                  {t('warPath.ui.hard')}
                </span>
              ) : null}
            </span>
            <span class="lv-head__general">{g ? t(g.nameKey) : level.general}</span>
            <span class="lv-head__tier" key={tier} data-testid="level-tier">
              {t('warPath.ui.tierLine', { tier: tierNumeral(tier) })} · {t('warPath.ui.fairPlay')}
            </span>
          </span>
        </header>

        <ul class="lv-rows">
          <li class="lv-row">
            <CastleIcon size={20} />
            <span class="lv-row__label">{t('warPath.ui.objective')}</span>
            <span class="lv-row__value">{t('warPath.ui.objectiveBase')}</span>
          </li>
          <li class="lv-row">
            <FlagIcon size={20} />
            <span class="lv-row__label">{t('warPath.ui.window')}</span>
            <span class="lv-row__value">{ages.join(' · ')}</span>
          </li>
          <li class="lv-row" data-testid="level-modifiers">
            <InfoIcon size={20} />
            <span class="lv-row__label">{t('warPath.ui.modifiers')}</span>
            <span class="lv-row__value">{level.modifiers.length ? level.modifiers.map((m) => t(modifierNameKey(m))).join(', ') : t('warPath.ui.noModifiers')}</span>
          </li>
          {level.boss ? (
            <li class="lv-row lv-row--boss" data-testid="level-boss">
              <CrownIcon size={20} />
              <span class="lv-row__value">{t('warPath.disclosure.boss')}</span>
            </li>
          ) : null}
        </ul>

        <div class={`lv-goals${hard ? ' is-hard' : ''}`} data-testid="level-goals">
          <ol class="lv-goals__list">
            <li class={`lv-goal${n.stars >= 1 ? ' is-got' : ''}`}>
              <Stars n={1} />
              <span>{t('warPath.goal.win')}</span>
            </li>
            {shown ? (
              <>
                <li class={`lv-goal${n.stars >= 2 ? ' is-got' : ''}`}>
                  <Stars n={2} />
                  <span>{t(goal.key, goal.params)}</span>
                </li>
                <li class={`lv-goal lv-goal--hard${n.stars >= 3 ? ' is-got' : ''}`}>
                  <Stars n={3} />
                  <span>{t('warPath.goal.onHard')}</span>
                </li>
              </>
            ) : (
              <li class="lv-goal lv-goal--hidden">
                <Stars n={3} dim />
                <span>{t('warPath.goal.hidden')}</span>
              </li>
            )}
          </ol>
          <div class={`lv-reward${cleared ? ' is-done' : ''}`} data-testid="level-reward">
            <span class="lv-reward__label">{cleared ? t('warPath.ui.rewardDone') : t('warPath.ui.reward')}</span>
            <span class="lv-reward__items">
              {reward.amber > 0 ? (
                <span class="lv-reward__item">
                  <AmberIcon size={22} /> <b class="ui-num">{formatInt(reward.amber, locale)}</b>
                </span>
              ) : null}
              {reward.capsule ? (
                <span class="lv-reward__item" title={t(capsuleTierNameKey(reward.capsule))}>
                  <CapsuleIcon tier={reward.capsule} size={30} />
                </span>
              ) : null}
              {card ? (
                <span class={`lv-reward__item lv-reward__card lv-reward__card--${card.rarity}`} title={t(card.nameKey)}>
                  <CardsIcon size={22} />
                </span>
              ) : null}
              {reward.amber === 0 && !reward.capsule && !card ? <StarIcon size={20} /> : null}
            </span>
          </div>
        </div>

        {shown && !locked ? (
          <div class="lv-diff">
            <Segmented
              label={t('warPath.ui.difficulty')}
              value={diff}
              size="sm"
              testid="level-difficulty"
              onChange={(d) => services.setWarPathDifficulty(d)}
              options={content.warPath.difficulty.order.map((d) => ({ value: d, label: t(DIFFICULTY_NAME_KEYS[d]) }))}
            />
          </div>
        ) : null}

        {level.teaches ? (
          <p class="lv-tip" data-testid="level-tip">
            <b>{t('warPath.ui.tip')}</b> {t(`warPath.teach.${level.teaches}`)}
          </p>
        ) : null}
      </div>
    </Sheet>
  );
}

function Stars(p: { n: number; dim?: boolean }) {
  return (
    <span class={`lv-stars${p.dim ? ' is-dim' : ''}`} aria-hidden="true">
      {[1, 2, 3].map((k) => (
        <i key={k} class={k <= p.n ? 'is-on' : ''}>
          <StarIcon size={14} filled={k <= p.n && !p.dim} />
        </i>
      ))}
    </span>
  );
}
