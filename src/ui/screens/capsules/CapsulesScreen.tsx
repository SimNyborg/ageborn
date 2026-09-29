/**
 * The Capsules tab (S8, ui-plan 2.2, 4.6): everything that is opened, in one place. Interim for
 * UI-2: the Home capsule tray (drums, Open and Open all, crates, charges, Supply, Clay) on its own tab
 * screen, with the odds and bank rules one tap away behind "i" in the header (2.8: 2 taps); UI-5
 * gives it the full shelf of 4.6.
 */
import '../home/home.css';
import './capsules.css';
import { useState } from 'preact/hooks';
import { IconButton } from '../../components/Button';
import { InfoIcon } from '../../components/icons';
import { ScreenFrame } from '../../components/Layout';
import type { RouteOf } from '../../router';
import { useUi } from '../context';
import { CapsuleInfo, CapsuleTray } from '../home/parts';

export function CapsulesScreen(_p: { route: RouteOf<'capsules'> }) {
  const { t, router } = useUi();
  const [info, setInfo] = useState(false);
  return (
    <ScreenFrame
      id="capsules"
      title={t('warPath.ui.capsulesTitle')}
      onBack={() => router.back()}
      right={<IconButton icon={<InfoIcon size={24} />} label={t('ui.info.title')} onClick={() => setInfo(true)} testid="odds-open" />}
    >
      <div class="caps-tab" data-testid="capsules-tab">
        <CapsuleTray sheet />
      </div>
      {info ? <CapsuleInfo onClose={() => setInfo(false)} /> : null}
    </ScreenFrame>
  );
}
