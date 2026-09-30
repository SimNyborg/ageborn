/**
 * The Card detail stage (ui-plan 4.4, MR-38b, MR-39): a lane in the card's age where the unit stands
 * and moves, the lg card over its bottom-left corner with the level and copies beside it, and the
 * upgrade ceremony on the card (the charge tremble, then the burst, the hammer, the "Level 5!" banner
 * and the level flip). One component, so Card detail and the onboarding's first forced upgrade
 * (`src/app/ui/FirstUpgrade.tsx`, 6.6) play the same moment.
 *
 * The owner drives the phases: `phase` is null at rest, 'charge' for the anticipation beat and
 * 'impact' for the rest of MR-39; `armed` is the confirm state of MR-38b. A tap on the stage calls
 * `onSkip` (U13: anything over 1 s can be skipped).
 */
import './cardDetail.css';
import type { CardId, FortKind } from '@/contracts';
import { FORT_PORTRAITS, FortArt } from '../../components/FortGlyphs';
import type { Ref } from 'preact';
import { CardTile, type CardTileData } from '../../components/CardTile';
import { AGE_COLOR, HammerIcon, LockIcon, RoleGlyph } from '../../components/icons';
import { useKit, usePortrait } from '../../components/kit';
import { CopiesBar } from '../../components/Meters';
import type { cardGlyph } from '../model/cards';

/**
 * The unit on the stage: the plate-free portrait (DESIGN B5), or the role glyph without art. A fort
 * stands on its pad as its kind's illustration until F3's fort portraits ship (`FORT_PORTRAITS`).
 */
function StageArt(p: { card: CardId; glyph: ReturnType<typeof cardGlyph>; skin: string | null; silhouette: boolean; fortKind?: FortKind; age: CardStageProps['tile']['age'] }) {
  const fortArt = p.fortKind !== undefined && !FORT_PORTRAITS;
  const url = usePortrait(fortArt ? null : p.card, { skin: p.skin, size: 320, plate: false });
  return (
    <span class={`cd-stage__figure${p.silhouette ? ' is-silhouette' : ''}${fortArt ? ' is-fort' : ''}`} aria-hidden="true">
      {url ? (
        <img src={url} alt="" draggable={false} />
      ) : fortArt ? (
        <FortArt kind={p.fortKind!} age={p.age} size={170} />
      ) : (
        <RoleGlyph kind={p.glyph} size={120} color="#e8e1d2" />
      )}
    </span>
  );
}

export interface CardStageProps {
  tile: CardTileData;
  kind: 'unit' | 'turret' | 'power' | 'fort';
  glyph: ReturnType<typeof cardGlyph>;
  /** A Fort card's kind (A16.14.7): the stage shows the fort on its pad. */
  fortKind?: FortKind;
  owned: boolean;
  /** The copies row beside the card; null hides it (maxed, powers, unowned). */
  copies: { copies: number; needed: number | null; ready: boolean } | null;
  /** The ceremony: null at rest, then 'charge' and 'impact' (MR-39); `n` counts ceremonies. */
  ceremony: { phase: 'charge' | 'impact'; n: number } | null;
  /** MR-38b: the first tap of the two-tap upgrade lifts the card and starts its glow. */
  armed: boolean;
  onSkip?: () => void;
  stageRef?: Ref<HTMLDivElement>;
  testid?: string;
  levelTestid?: string;
}

export function CardStage(p: CardStageProps) {
  const { t } = useKit();
  const tile = p.tile;
  const age = AGE_COLOR[tile.age];
  const cer = p.ceremony;
  const showLevel = p.owned && p.kind !== 'power' && p.kind !== 'fort';
  return (
    <div
      ref={p.stageRef}
      class={`cd-stage cd-stage--${p.kind}${cer ? ` is-${cer.phase}` : ''}${p.armed ? ' is-armed' : ''}`}
      data-testid={p.testid ?? 'card-stage'}
      data-anim={cer ? '' : undefined}
      style={{
        '--age-main': age.main,
        '--age-accent': age.accent,
        '--age-light': age.light,
      }}
      onClick={() => cer && p.onSkip?.()}
    >
      <i class="cd-stage__sky" aria-hidden="true" />
      <i class="cd-stage__hills" aria-hidden="true" />
      <i class="cd-stage__ground" aria-hidden="true" />
      <i class="cd-stage__dust" aria-hidden="true" />
      <div class="cd-stage__actor">
        <i class="cd-stage__shadow" aria-hidden="true" />
        <StageArt card={tile.id} glyph={p.glyph} skin={tile.skin} silhouette={!p.owned} age={tile.age} {...(p.fortKind ? { fortKind: p.fortKind } : {})} />
      </div>
      <div class="cd-stage__card">
        <CardTile card={{ ...tile, isNew: false }} size="lg" showCost showName={false} tip={false} />
        {!p.owned ? (
          <span class="cd-stage__lock">
            <LockIcon size={28} />
          </span>
        ) : null}
      </div>
      <div class="cd-stage__meta">
        {showLevel ? (
          <span class="cd-stage__level" data-testid={p.levelTestid ?? 'card-level'} key={`lv${tile.level}-${cer?.phase === 'impact' ? cer.n : 0}`}>
            {t('ui.card.level', { n: tile.level })}
          </span>
        ) : null}
        {p.copies ? (
          <div class="cd-copies" data-testid="card-upgrade">
            <span class="cd-copies__label">{p.copies.ready ? t('ui.card.upgradeReady') : t('ui.card.copies')}</span>
            <CopiesBar copies={p.copies.copies} needed={p.copies.needed} ready={p.copies.ready} />
          </div>
        ) : null}
      </div>
      {cer?.phase === 'impact' ? (
        <>
          <i class="cd-stage__burst" aria-hidden="true" />
          <span class="cd-stage__hammer" aria-hidden="true">
            <HammerIcon size={72} />
          </span>
          <span class="cd-stage__levelup" aria-hidden="true">
            {t('ui.card.levelUp', { n: tile.level })}
          </span>
        </>
      ) : null}
    </div>
  );
}
