import type { RouteOf } from '../../router';
import { ScreenFrame } from '../../components/Layout';
import { useUi } from '../context';

export function TrophyRoadScreen(_p: { route: RouteOf<'trophyRoad'> }) {
  const { router } = useUi();
  return (
    <ScreenFrame id="trophyRoad" title="trophyRoad" onBack={() => router.back()}>
      <div />
    </ScreenFrame>
  );
}
