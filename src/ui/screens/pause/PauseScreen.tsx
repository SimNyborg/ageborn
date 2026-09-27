/**
 * Pause (A9 #6), an overlay above the battle: Resume, the Scouted list (A3), Settings, Retreat
 * (after 1:00; counts as a loss, A2.10) and Quit Skirmish (Skirmish only). Escape resumes.
 */
import './pause.css';
import type { CardId } from '@/contracts';
import { useState } from 'preact/hooks';
import { Button } from '../../components/Button';
import { CardTile } from '../../components/CardTile';
import { formatClock } from '../../components/format';
import { EyeIcon, FlagIcon, GearIcon, HomeIcon, PlayIcon } from '../../components/icons';
import { Empty } from '../../components/Layout';
import { Modal } from '../../components/Modal';
import type { RouteOf } from '../../router';
import { useUi } from '../context';
import { cardTile } from '../model/cards';

export function PauseScreen(p: { route: RouteOf<'pause'> }) {
  const { t, router, services, save, content } = useUi();
  const info = p.route.info;
  const [confirm, setConfirm] = useState<'retreat' | 'quit' | null>(null);
  const resume = () => {
    router.back();
    services.resume();
  };
  const tiles = info.scouted
    .map((id: CardId) => cardTile(save.value, content, id, t))
    .filter((c): c is NonNullable<typeof c> => c !== null)
    .map((c) => ({ ...c, owned: true, upgradeReady: false, isNew: false, foil: 'none' as const, skin: null }));
  return (
    <section class="ui-screen pause" data-screen="pause" data-overlay="" aria-labelledby="pause-title">
      <div class="pause__panel">
        <header class="pause__head">
          <h1 id="pause-title" class="pause__title">
            {t('ui.pause.title')}
          </h1>
          <span class="pause__clock">{formatClock(info.clockMs)}</span>
        </header>
        <div class="pause__body">
          <div class="pause__actions">
            <Button variant="green" size="lg" wide autofocus testid="pause-resume" icon={<PlayIcon size={26} />} onClick={resume}>
              {t('ui.pause.resume')}
            </Button>
            <Button
              variant="blue"
              size="md"
              wide
              testid="pause-settings"
              icon={<GearIcon size={24} />}
              onClick={() => router.go({ id: 'settings' }, { overlay: true })}
            >
              {t('ui.nav.settings')}
            </Button>
            {info.mode === 'skirmish' ? (
              <Button variant="plain" size="md" wide testid="pause-quit" icon={<HomeIcon size={24} />} onClick={() => setConfirm('quit')}>
                {t('ui.pause.quitSkirmish')}
              </Button>
            ) : null}
            {info.retreatAfterMs !== null ? (
              <Button
                variant="red"
                size="md"
                wide
                testid="pause-retreat"
                inert={!info.canRetreat}
                icon={<FlagIcon size={24} />}
                onClick={() => setConfirm('retreat')}
                title={info.canRetreat ? undefined : t('ui.pause.retreatLocked', { time: formatClock(info.retreatAfterMs) })}
              >
                {t('ui.pause.retreat')}
              </Button>
            ) : null}
            {info.retreatAfterMs !== null && !info.canRetreat ? (
              <p class="pause__note" data-testid="pause-retreat-locked">
                {t('ui.pause.retreatLocked', { time: formatClock(info.retreatAfterMs) })}
              </p>
            ) : null}
          </div>
          <div class="pause__scouted" data-testid="pause-scouted">
            <h2 class="pause__sub">
              <EyeIcon size={22} /> {t('ui.pause.scouted', { n: tiles.length })}
            </h2>
            {tiles.length === 0 ? (
              <Empty>{t('ui.pause.scoutedNone')}</Empty>
            ) : (
              <div class="pause__cards">
                {tiles.map((c) => (
                  <CardTile key={c.id} card={c} size="sm" hideLevel />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      {confirm === 'retreat' ? (
        <Modal
          title={t('ui.pause.retreatTitle')}
          tone="danger"
          size="sm"
          onClose={() => setConfirm(null)}
          testid="retreat-confirm"
          footer={
            <>
              <Button variant="plain" onClick={() => setConfirm(null)} autofocus>
                {t('ui.common.cancel')}
              </Button>
              <Button
                variant="red"
                testid="retreat-yes"
                onClick={() => {
                  setConfirm(null);
                  router.back();
                  services.retreat();
                }}
              >
                {t('ui.pause.retreat')}
              </Button>
            </>
          }
        >
          <p>{t('ui.pause.retreatBody')}</p>
        </Modal>
      ) : null}
      {confirm === 'quit' ? (
        <Modal
          title={t('ui.pause.quitSkirmish')}
          size="sm"
          onClose={() => setConfirm(null)}
          testid="quit-confirm"
          footer={
            <>
              <Button variant="plain" onClick={() => setConfirm(null)} autofocus>
                {t('ui.common.cancel')}
              </Button>
              <Button
                variant="red"
                testid="quit-yes"
                onClick={() => {
                  setConfirm(null);
                  router.back();
                  services.quitSkirmish();
                }}
              >
                {t('ui.pause.quitSkirmish')}
              </Button>
            </>
          }
        >
          <p>{t('ui.pause.quitBody')}</p>
        </Modal>
      ) : null}
    </section>
  );
}
