import type { RouteOf } from '../../router';
import { ScreenFrame } from '../../components/Layout';
import { useUi } from '../context';

export function ResultScreen(_p: { route: RouteOf<'result'> }) {
  const { router } = useUi();
  return (
    <ScreenFrame id="result" title="result" onBack={() => router.back()}>
      <div />
    </ScreenFrame>
  );
}
