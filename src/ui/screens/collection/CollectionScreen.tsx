import type { RouteOf } from '../../router';
import { ScreenFrame } from '../../components/Layout';
import { useUi } from '../context';

export function CollectionScreen(_p: { route: RouteOf<'collection'> }) {
  const { router } = useUi();
  return (
    <ScreenFrame id="collection" title="collection" onBack={() => router.back()}>
      <div />
    </ScreenFrame>
  );
}
