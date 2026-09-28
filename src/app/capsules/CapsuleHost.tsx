/**
 * Mounts the capsule show (WP10) for the app (docs/requests/wp10-app-wiring.md): the capsule
 * screen for one capsule or "Open all", the Wardrobe Crate screen, and the odds panel with WP9's
 * odds sheet (bag state, tier contents, pity counters) under the honesty line (A15.3).
 *
 * The show draws into the app's persistent Pixi canvas, so while it runs the app renders nothing
 * else over the canvas (AppRoot). The result was saved before this mounts (`capsuleFlow.ts`).
 */
import type { Application } from 'pixi.js';
import { useMemo } from 'preact/hooks';
import type { CardId, CompiledContent, SaveDoc, SkinId } from '@/contracts';
import { CapsuleScreen, WardrobeScreen, createCatalog, type ShowSettings } from '@/capsule';
import { asContent } from '@/content';
import { OddsSheet } from '@/ui/components/OddsSheet';
import { oddsModel } from '@/ui/components/oddsModel';
import { UiKitContext, type UiKit } from '@/ui/components/kit';
import type { ArtProvider, AudioService } from '@/contracts';
import '@/ui/theme.css';
import type { CapsuleShows, ShowRecord } from './capsuleFlow';

export interface CapsuleHostProps {
  shows: CapsuleShows;
  record: ShowRecord;
  pixi: Application;
  art: ArtProvider;
  audio: AudioService;
  content: CompiledContent;
  save: SaveDoc;
  t: (key: string, params?: Record<string, string | number>) => string;
  /** Equip now (A3): the card into its age's loadout of the active plan. */
  onEquip?: (card: CardId) => void;
  onEquipSkin?: (skin: SkinId) => void;
  /** Upgrade: opens the best ready upgrade (the card detail). Hidden when absent. */
  onUpgrade?: (card: CardId) => void;
  /** The summary was closed. */
  onDone: (record: ShowRecord) => void;
  /** Offer "Open next" and "Open all" (not during onboarding). */
  allowMore: boolean;
}

function showSettings(s: SaveDoc): Partial<ShowSettings> {
  return {
    reduceMotion: s.settings.reduceMotion,
    vibrate: s.settings.vibrate,
    teamPreset: s.settings.teamPreset,
    quickReveal: s.settings.quickReveal === true,
  };
}

export function CapsuleHost(p: CapsuleHostProps) {
  const catalog = useMemo(() => createCatalog(p.content), [p.content]);
  const c = asContent(p.content);
  const r = p.record;
  const kit: UiKit = useMemo(
    () => ({ t: p.t, locale: 'en', portrait: p.art.portrait.bind(p.art), reduceMotion: p.save.settings.reduceMotion }),
    [p.t, p.art, p.save.settings.reduceMotion],
  );
  const oddsSheet = () => (
    <UiKitContext.Provider value={kit}>
      <div class="ui-root ab-capsule-odds">
        <OddsSheet model={oddsModel(c.capsules, c.rarities, p.save, c.arenas.list[p.save.arenaIndex]?.randomLegendaries ?? true)} />
      </div>
    </UiKitContext.Provider>
  );
  const done = () => p.onDone(p.shows.done() ?? r);
  const pending = p.allowMore ? p.save.capsules.pending.length : 0;
  const common = {
    pixi: p.pixi,
    art: p.art,
    audio: p.audio,
    catalog,
    pityRules: c.capsules.pity,
    settings: showSettings(p.save),
    oddsSheet,
    onDone: done,
    ...(p.onEquip ? { onEquip: p.onEquip } : {}),
    ...(p.onEquipSkin ? { onEquipSkin: p.onEquipSkin } : {}),
    ...(p.onUpgrade ? { onUpgrade: p.onUpgrade } : {}),
  };
  if (r.kind === 'wardrobe') {
    return (
      <div class="ab-capsule" data-testid="capsule-host">
        <WardrobeScreen key={r.reveal.crate.id} {...common} reveal={r.reveal} pity={r.pity} />
      </div>
    );
  }
  const key = r.reveals.map((x) => x.capsule.id).join('|');
  return (
    <div class="ab-capsule" data-testid="capsule-host">
      <CapsuleScreen
        key={key}
        {...common}
        reveals={r.reveals}
        progress={(card) => r.progress[card] ?? null}
        newCardProtection={r.newCardProtection}
        pendingCount={pending}
        {...(pending > 0
          ? {
              onOpenNext: () => {
                p.shows.done();
                p.shows.openNext();
              },
              onOpenAll: () => {
                p.shows.done();
                p.shows.openAll();
              },
            }
          : {})}
      />
    </div>
  );
}
