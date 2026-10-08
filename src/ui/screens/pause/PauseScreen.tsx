/**
 * Pause (A9 #6, ui-plan 4.7 and UA-21), an overlay above the battle: the Scouted list (A3), then the
 * action bar: Resume (gold, the primary, 56 tall on phones) bottom-right, Settings beside it, and the
 * small red Retreat (open from the start since 2026-10-07; a loss with no rewards, A2.10, A6.3) and
 * Quit Skirmish at the far left, well away from Resume. Escape resumes.
 */
import './pause.css';
import type { CardId } from '@/contracts';
import { useState } from 'preact/hooks';
import { Button } from '../../components/Button';
import { CardTile } from '../../components/CardTile';
import { formatClock } from '../../components/format';
import { EyeIcon, FlagIcon, GearIcon, HomeIcon, PlayIcon } from '../../components/icons';
import { ActionBar, Empty } from '../../components/Layout';
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
          <span class="pause__clock">{t('ui.pause.clock', { time: formatClock(info.clockMs) })}</span>
        </header>
        <div class="pause__body" data-scroll="">
          <div class="pause__scouted" data-testid="pause-scouted">
            <h2 class="pause__sub pause__sub--enemy">
              <EyeIcon size={22} /> {t('ui.pause.scouted', { n: tiles.length })}
            </h2>
            {tiles.length === 0 ? (
              <Empty>{t('ui.pause.scoutedNone')}</Empty>
            ) : (
              <div class="pause__cards">
                {tiles.map((c) => (
                  <CardTile key={c.id} card={c} size="xs" hideLevel enemy />
                ))}
              </div>
            )}
          </div>
        </div>
        <ActionBar
          testid="pause-actions"
          tertiary={
            <>
              {info.retreatAfterMs !== null ? (
                <Button kind="destructive" size="s" testid="pause-retreat" icon={<FlagIcon size={20} />} onClick={() => setConfirm('retreat')}>
                  {t('ui.pause.retreat')}
                </Button>
              ) : null}
              {info.mode === 'skirmish' ? (
                <Button kind="secondary" size="s" testid="pause-quit" icon={<HomeIcon size={20} />} onClick={() => setConfirm('quit')}>
                  {t('ui.pause.quitSkirmish')}
                </Button>
              ) : null}
            </>
          }
          secondary={
            <Button kind="secondary" size="m" testid="pause-settings" icon={<GearIcon size={22} />} onClick={() => router.go({ id: 'settings' }, { overlay: true })}>
              {t('ui.nav.settings')}
            </Button>
          }
          primary={
            <Button kind="primary" size="l" autofocus testid="pause-resume" icon={<PlayIcon size={26} />} onClick={resume}>
              {t('ui.pause.resume')}
            </Button>
          }
        />
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
              <Button kind="secondary" onClick={() => setConfirm(null)} autofocus>
                {t('ui.common.cancel')}
              </Button>
              <Button
                kind="destructive"
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
              <Button kind="secondary" onClick={() => setConfirm(null)} autofocus>
                {t('ui.common.cancel')}
              </Button>
              <Button
                kind="destructive"
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
