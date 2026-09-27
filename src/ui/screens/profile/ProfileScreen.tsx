import type { RouteOf } from '../../router';
import { ScreenFrame } from '../../components/Layout';
import { useUi } from '../context';

export function ProfileScreen(_p: { route: RouteOf<'profile'> }) {
  const { router } = useUi();
  return (
    <ScreenFrame id="profile" title="profile" onBack={() => router.back()}>
      <div />
    </ScreenFrame>
  );
}
