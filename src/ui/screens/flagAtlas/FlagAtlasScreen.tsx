/**
 * The Flag Atlas (PLAN 2d, owner requests 2026-10-08 items 19/19b): every national flag, bought with
 * Dust at one price, browsed by region with search, with region rewards that are earned and never sold.
 *
 * Owned by Track D. C0 (2026-10-08) landed this stub with the route (`flagAtlas: { flag?, region? }`),
 * the lazy load in `ScreenHost` (this module is its own chunk) and the services it needs:
 * `services.flagAtlasProgress()`, `services.searchFlags(query)` and `services.buyNationalFlag(key)`
 * (meta's `flagAtlas.ts`), plus `services.equipCosmetic({ slot: 'nationalFlag', key })` to fly one.
 * Strings live in `src/i18n/flags.en.json` (`cosmetic.flagAtlas.*`, so the screen tests' raw-key check sees a missing one; the region names
 * `cosmetic.flagRegion.*`).
 * No string may claim anything is "free" (the copy review's Pillar 4 check).
 */
import { ScreenFrame } from '../../components/Layout';
import type { RouteOf } from '../../router';
import { useUi } from '../context';

export function FlagAtlasScreen(p: { route: RouteOf<'flagAtlas'> }) {
  const { t, router, services } = useUi();
  const atlas = services.flagAtlasProgress();
  return (
    <ScreenFrame id="flagAtlas" title={t('cosmetic.flagAtlas.title')} onBack={() => router.back()} subtitle={`${atlas.owned}/${atlas.total}`}>
      <div class="col" data-testid="flag-atlas" data-flag={p.route.flag ?? ''} data-region={p.route.region ?? ''} />
    </ScreenFrame>
  );
}
