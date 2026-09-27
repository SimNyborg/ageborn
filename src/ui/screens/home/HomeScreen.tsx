/**
 * Home (A9 #2): big Battle button with the next opponent preview, Trophy Road bar with the next
 * reward, the capsule tray ("Open (3)", "Open all") with the Clay meter, charges and the Daily
 * Capsule, daily quests, the profile chip and the settings gear.
 *
 * Self-contained on purpose: the owner plans to replace this layout with an illustrated village
 * whose buildings open the features. Everything here is composed from `./parts`, which read only the
 * UI environment and the view models, so a village can reuse them as building pop-ups and this file
 * can be swapped without touching the rest of the UI.
 */
import './home.css';
import type { RouteOf } from '../../router';
import { useUi } from '../context';
import { arenaOf } from '../model/progress';
import { ArenaScene } from './ArenaScene';
import { ArenaBanner, BattleButton, CapsuleTray, HomeNav, OpponentPreview, ProfileChip, QuestsPanel, RoadBar, TopRight } from './parts';

export function HomeScreen(_p: { route: RouteOf<'home'> }) {
  const { save, content, services, t } = useUi();
  const arena = arenaOf(save.value, content);
  const opponent = services.previewOpponent();
  return (
    <section class="ui-screen home" data-screen="home" data-arena={arena.id} aria-label={t('ui.home.title')}>
      <ArenaScene arena={arena.id} />
      <header class="home-top">
        <ProfileChip />
        <TopRight />
      </header>
      <div class="home-main">
        <aside class="home-col home-col--left">
          <QuestsPanel />
        </aside>
        <div class="home-center">
          <ArenaBanner />
          <BattleButton />
          <OpponentPreview opponent={opponent} />
          <RoadBar />
        </div>
        <aside class="home-col home-col--right">
          <CapsuleTray />
        </aside>
      </div>
      <HomeNav />
    </section>
  );
}
