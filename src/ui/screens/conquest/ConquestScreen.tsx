import type { RouteOf } from '../../router';
import { ScreenFrame } from '../../components/Layout';
import { useUi } from '../context';

export function ConquestScreen(_p: { route: RouteOf<'conquest'> }) {
  const { router } = useUi();
  return (
    <ScreenFrame id="conquest" title="conquest" onBack={() => router.back()}>
      <div />
    </ScreenFrame>
  );
}
