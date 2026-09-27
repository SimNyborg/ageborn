import type { RouteOf } from '../../router';
import { ScreenFrame } from '../../components/Layout';
import { useUi } from '../context';

export function SettingsScreen(_p: { route: RouteOf<'settings'> }) {
  const { router } = useUi();
  return (
    <ScreenFrame id="settings" title="settings" onBack={() => router.back()}>
      <div />
    </ScreenFrame>
  );
}
