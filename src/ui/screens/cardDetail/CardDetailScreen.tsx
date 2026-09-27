import type { RouteOf } from '../../router';
import { ScreenFrame } from '../../components/Layout';
import { useUi } from '../context';

export function CardDetailScreen(_p: { route: RouteOf<'cardDetail'> }) {
  const { router } = useUi();
  return (
    <ScreenFrame id="cardDetail" title="cardDetail" onBack={() => router.back()}>
      <div />
    </ScreenFrame>
  );
}
