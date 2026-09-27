import type { RouteOf } from '../../router';
import { ScreenFrame } from '../../components/Layout';
import { useUi } from '../context';

export function WarPlanScreen(_p: { route: RouteOf<'warPlan'> }) {
  const { router } = useUi();
  return (
    <ScreenFrame id="warPlan" title="warPlan" onBack={() => router.back()}>
      <div />
    </ScreenFrame>
  );
}
