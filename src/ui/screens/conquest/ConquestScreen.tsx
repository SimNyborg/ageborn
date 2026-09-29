/**
 * Conquest (A9 #17, A6.10): the board of 9 AI Generals in a fixed order, each opening after the
 * previous one is beaten once; three one-time stars per General (win; win above 50% base HP; win
 * before 6:00) with their rewards; milestones at 9, 18 and 27 stars. Full War at a fixed tier and
 * level; no charges, no trophies, no MMR. Opens at Arena 3.
 */
import './conquest.css';
import { arenaNameKey, capsuleKindNameKey, capsuleTierNameKey, formatNameKey, titleNameKey } from '@/content/keys';
import type { ConquestRules } from '@/content/types';
import { Fragment } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { Avatar, GeneralPortrait } from '../../components/Avatar';
import { Button } from '../../components/Button';
import { AiBadge, Pill } from '../../components/Chips';
import { formatClock, formatInt, tierNumeral } from '../../components/format';
import { AmberIcon, CapsuleIcon, CheckIcon, DustIcon, LockIcon, StarIcon, SwordsIcon } from '../../components/icons';
import { ScreenFrame } from '../../components/Layout';
import { Stars } from '../../components/Meters';
import { Modal } from '../../components/Modal';
import type { MatchRequest, RouteOf } from '../../router';
import { useUi } from '../context';
import { conquestView, type ConquestEntry } from '../model/progress';
import { useMatchStarter } from '../shared/MatchStarter';

type StarRule = ConquestRules['stars'][number];

function StarRow(p: { rule: StarRule; earned: boolean }) {
  const { t, locale } = useUi();
  const c = p.rule.condition;
  const cond =
    c.kind === 'win'
      ? t('ui.conquest.cond.win')
      : c.kind === 'winBaseAbove'
        ? t('ui.conquest.cond.base', { n: Math.round(c.bp / 100) })
        : t('ui.conquest.cond.time', { time: formatClock(c.ms) });
  const r = p.rule.reward;
  const reward =
    r.kind === 'amber' ? (
      <>
        <AmberIcon size={20} /> {formatInt(r.amount, locale)}
      </>
    ) : r.kind === 'dust' ? (
      <>
        <DustIcon size={20} /> {formatInt(r.amount, locale)}
      </>
    ) : (
      <>
        <CapsuleIcon tier="silver" size={22} /> {t(capsuleKindNameKey('age'))}
      </>
    );
  return (
    <li class={`cq-star${p.earned ? ' is-on' : ''}`} data-testid={`cq-star-${p.rule.star}`}>
      <StarIcon filled={p.earned} size={26} />
      <span class="ui-grow">{cond}</span>
      <span class="cq-star__reward">{reward}</span>
      {p.earned ? <CheckIcon size={20} /> : null}
    </li>
  );
}

function GeneralModal(p: { e: ConquestEntry; onClose: () => void; onFight: () => void }) {
  const { t, content } = useUi();
  const g = p.e.general;
  const rules = content.generals.conquest;
  return (
    <Modal
      title={t(g.nameKey)}
      onClose={p.onClose}
      testid="cq-general"
      footer={
        p.e.open ? (
          <Button kind="primary" size="lg" icon={<SwordsIcon size={26} />} onClick={p.onFight} testid="cq-fight" autofocus>
            {t('ui.conquest.fight')}
          </Button>
        ) : undefined
      }
    >
      <div class="cq-detail">
        <GeneralPortrait generalId={g.id} size={110} />
        <div class="cq-detail__text">
          <AiBadge general />
          <span class="cq-detail__pers">{t(g.personalityKey)}</span>
          <q class="cq-detail__line">{t(g.lineKey)}</q>
          <span class="ui-muted">{t(g.signatureKey)}</span>
          <span class="cq-detail__pills">
            <Pill tone="violet">{t('ui.vs.tier', { tier: tierNumeral(p.e.tier) })}</Pill>
            <Pill tone="blue">{t('ui.vs.aiLevel', { n: p.e.level })}</Pill>
            <Pill tone="gold">{t(formatNameKey(rules.format))}</Pill>
          </span>
          <span class="cq-detail__rules">{t('ui.ai.sameRules')}</span>
          {g.disclosureKeys.map((k) => (
            <span key={k} class="cq-detail__disc">
              {t(k)}
            </span>
          ))}
        </div>
      </div>
      <ul class="cq-stars">
        {rules.stars.map((r, i) => (
          <StarRow key={r.star} rule={r} earned={p.e.stars[i] ?? false} />
        ))}
      </ul>
      <p class="ui-muted cq-note">{t('ui.conquest.noCost')}</p>
    </Modal>
  );
}

export function ConquestScreen(_p: { route: RouteOf<'conquest'> }) {
  const { save, content, t, locale, router } = useUi();
  const v = conquestView(save.value, content);
  const s = save.value;
  const [open, setOpen] = useState<ConquestEntry | null>(null);
  const unlockArena = content.arenas.list.find((a) => a.index === v.unlockArena);

  const starter = useMatchStarter();
  // A15.9: a vertical ladder ordered by tier, hardest on top; the player's portrait sits just above
  // the highest General beaten.
  const ladder = v.entries.map((e, i) => ({ e, i })).sort((a, b) => b.e.tier - a.e.tier || b.i - a.i);
  const topBeaten = ladder.find(({ e }) => e.beaten)?.e.general.id ?? null;
  const youRef = useRef<HTMLLIElement>(null);
  // Open the ladder where the player stands.
  useEffect(() => {
    const el = youRef.current as (HTMLLIElement & { scrollIntoView?: (o: ScrollIntoViewOptions) => void }) | null;
    el?.scrollIntoView?.({ block: 'center' });
  }, []);

  function fight(e: ConquestEntry) {
    const req: MatchRequest = { mode: 'conquest', general: e.general.id };
    setOpen(null);
    starter.start(req);
  }

  return (
    <ScreenFrame
      id="conquest"
      title={t('ui.nav.conquest')}
      onBack={() => router.back()}
      subtitle={
        <Pill tone="gold" icon={<StarIcon size={16} />}>
          {t('ui.conquest.starsOf', { n: v.totalStars, max: v.maxStars })}
        </Pill>
      }
    >
      <div class={`cq${v.unlocked ? '' : ' is-locked'}`}>
        <div class="cq-track" data-testid="cq-milestones">
          <div class="cq-track__bar">
            <i style={{ width: `${(v.totalStars / v.maxStars) * 100}%` }} />
          </div>
          {v.milestones.map((m) => (
            <div
              key={m.stars}
              class={`cq-mile${m.reached ? ' is-on' : ''}`}
              style={{ left: `${(m.stars / v.maxStars) * 100}%` }}
              data-testid={`cq-mile-${m.stars}`}
            >
              <span class="cq-mile__cap">
                <CapsuleIcon tier={m.capsule} size={40} />
                {m.claimed ? (
                  <span class="cq-mile__check">
                    <CheckIcon size={16} />
                  </span>
                ) : null}
              </span>
              <span class="cq-mile__label">
                <StarIcon size={14} /> {m.stars}
              </span>
              <span class="cq-mile__reward">
                {t(capsuleTierNameKey(m.capsule))}
                {m.title ? ` + ${t(titleNameKey(m.title))}` : ''}
              </span>
            </div>
          ))}
        </div>
        <ol class="cq-board cq-board--ladder" data-testid="cq-board">
          {ladder.map(({ e, i }, row) => {
            const state = !e.open ? 'locked' : e.beaten ? 'beaten' : 'next';
            return (
              <Fragment key={e.general.id}>
                {e.general.id === topBeaten ? (
                  <li class="cq-you" ref={youRef} data-testid="cq-you" aria-label={t('ui.conquest.youAreHere')}>
                    <Avatar spec={s.profile.avatar} size={46} />
                    <span class="cq-you__label">{t('ui.conquest.youAreHere')}</span>
                  </li>
                ) : null}
                <li class="cq-rung">
                  <button
                    type="button"
                    class={`cq-gen is-${state}`}
                    style={{ animationDelay: `${row * 50}ms` }}
                    data-testid={`cq-gen-${e.general.id}`}
                    disabled={!v.unlocked}
                    onClick={() => setOpen(e)}
                    aria-label={t('ui.conquest.generalLabel', { name: t(e.general.nameKey), n: e.stars.filter(Boolean).length })}
                  >
                    <span class="cq-gen__num">{i + 1}</span>
                    <GeneralPortrait generalId={e.general.id} size={64} />
                    <span class="cq-gen__text">
                      <span class="cq-gen__name">{t(e.general.nameKey)}</span>
                      <span class="cq-gen__meta">
                        <AiBadge size="sm" /> {t('ui.vs.tier', { tier: tierNumeral(e.tier) })}
                      </span>
                    </span>
                    <Stars earned={e.stars} size={22} label={t('ui.conquest.starsOf', { n: e.stars.filter(Boolean).length, max: 3 })} />
                    {state === 'locked' ? (
                      <span class="cq-gen__lock">
                        <LockIcon size={28} />
                      </span>
                    ) : null}
                    {state === 'next' ? <span class="cq-gen__next">{t('ui.conquest.next')}</span> : null}
                  </button>
                </li>
              </Fragment>
            );
          })}
        </ol>
        {!v.unlocked ? (
          <div class="cq-lock" data-testid="cq-locked">
            <LockIcon size={54} />
            <p>
              {t('ui.conquest.locked', {
                arena: unlockArena ? t(arenaNameKey(unlockArena.id)) : String(v.unlockArena),
                n: formatInt(unlockArena?.trophies ?? 0, locale),
              })}
            </p>
          </div>
        ) : null}
      </div>
      {open ? <GeneralModal e={open} onClose={() => setOpen(null)} onFight={() => fight(open)} /> : null}
      {starter.dialog}
    </ScreenFrame>
  );
}
