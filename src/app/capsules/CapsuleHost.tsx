/**
 * Mounts the capsule show (WP10) for the app (docs/requests/wp10-app-wiring.md): the capsule
 * screen for one capsule or "Open all", the Wardrobe Crate screen, and the odds panel with WP9's
 * odds sheet (bag state, tier contents, pity counters) under the honesty line (A15.3).
 *
 * The show draws into the app's persistent Pixi canvas, so while it runs the app renders nothing
 * else over the canvas (AppRoot). The result was saved before this mounts (`capsuleFlow.ts`).
 */
import type { Application } from 'pixi.js';
import { useEffect, useMemo, useRef } from 'preact/hooks';
import type { CardId, CompiledContent, SaveDoc, SkinId } from '@/contracts';
import { CapsuleScreen, WardrobeScreen, createCatalog, type Cue, type RunnerState, type ShowSettings, type ShowStep } from '@/capsule';
import { asContent } from '@/content';
import { OddsSheet } from '@/ui/components/OddsSheet';
import { oddsModel } from '@/ui/components/oddsModel';
import { UiKitContext, type UiKit } from '@/ui/components/kit';
import { reachedAges } from '@/ui/screens/model/plan';
import { upgradesTaught } from '@/ui/screens/model/warPath';
import type { ArtProvider, AudioService } from '@/contracts';
import '@/ui/theme.css';
import './capsuleHost.css';
import type { Narration } from '../narration';
import type { CapsuleShows, ShowRecord } from './capsuleFlow';

/** The first Legendary's line starts this long after the walkout's flare: as the silhouette grows, before the drop. */
export const FIRST_LEGENDARY_DELAY_MS = 600;

/** True when no Legendary card was owned before this show (the ones it reveals as NEW are new). */
export function firstLegendaryEver(save: SaveDoc, content: CompiledContent, record: ShowRecord): boolean {
  if (record.kind !== 'capsules') return false;
  const fresh = new Set(record.reveals.flatMap((r) => r.capsule.contents.stacks.filter((x) => x.rarity === 'legendary' && x.isNew).map((x) => x.card)));
  return Object.keys(save.collection).every((card) => content.units[card]?.rarity !== 'legendary' || fresh.has(card));
}

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
  /**
   * Opened from the Result: the label of the Result's own path ("Continue", "Next battle"); the
   * summary's primary then continues that path instead of returning to the Result (ui-plan 2.5).
   */
  doneLabel?: string;
  /** Opened from the Result: the secondary way on ("Home", or the Result's path while Home waits). */
  altLabel?: string;
  /** Runs before the show closes; the host then closes it like Done. */
  onAlt?: () => void;
  /** The narrator (queue item 39): the onboarding capsule's guided tap and the first Legendary's moment. */
  narration?: Narration;
}

/** The show's settings from the save; `lite` is the Lite graphics preset (A10 step 4: half the particles, static starfield and sheen). */
export function showSettings(s: SaveDoc): Partial<ShowSettings> {
  return {
    reduceMotion: s.settings.reduceMotion,
    vibrate: s.settings.vibrate,
    teamPreset: s.settings.teamPreset,
    quickReveal: s.settings.quickReveal === true,
    lite: s.settings.graphics === 'lite',
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
        <OddsSheet hideHonest model={oddsModel(c.capsules, c.rarities, p.save, c.arenas.list[p.save.arenaIndex]?.randomLegendaries ?? true, c.cosmetics.collections)} />
      </div>
    </UiKitContext.Provider>
  );
  const done = () => p.onDone(p.shows.done() ?? r);
  // The narrator (queue item 39): "Tap to crack it!" while a Starter Capsule asks for the tap (once a show), and
  // the moment of a player's first Legendary as its walkout's silhouette grows. Both stop with the show.
  const narration = p.narration;
  const scripted = r.kind === 'capsules' && r.reveals.length > 0 && r.reveals.every((x) => x.capsule.scriptIndex !== null);
  const voice = useRef<{ tap: (() => void) | null; tapSaid: boolean; legendary: () => void }>({ tap: null, tapSaid: false, legendary: () => undefined });
  useEffect(() => {
    if (scripted) narration?.prefetch(['capsule.tapStarter']);
    const v = voice.current;
    return () => {
      v.tap?.();
      v.legendary();
    };
  }, []);
  const onState = (s: RunnerState): void => {
    const v = voice.current;
    if (s.prompt === 'tap' && scripted && narration && !v.tapSaid) {
      v.tapSaid = true;
      v.tap = narration.voice('capsule.tapStarter');
    } else if (s.prompt !== 'tap' && v.tap) {
      v.tap();
      v.tap = null;
    }
  };
  const onCue = (cue: Cue, step: ShowStep): void => {
    if (!narration || cue.sound !== 'rarity_legendary' || step.kind !== 'walkout' || !step.first) return;
    if (firstLegendaryEver(p.save, p.content, r)) voice.current.legendary = narration.moment('firstLegendary', FIRST_LEGENDARY_DELAY_MS);
  };
  const plan = p.save.warPlans[p.save.activePlan];
  const isEquipped = (card: CardId) =>
    !!plan && Object.values(plan.loadouts).some((l) => l.units.includes(card) || l.turrets.includes(card) || l.powers.home === card || l.powers.field === card);
  // Equipped into the army of an age not reached yet: say where, never a plain "Equipped" (U15).
  const reached = new Set(reachedAges(p.save, c));
  const equippedNote = (card: CardId): string | null => {
    const age = (c.units[card] ?? c.turrets[card])?.age;
    return age && !reached.has(age) ? p.t('app.equippedFor', { age: p.t(`warPath.regionShort.${age}`) }) : null;
  };
  // 2.6: "Upgrade ready" appears once the onboarding's forced upgrade has taught upgrades.
  const taught = upgradesTaught(p.save);
  const pending = p.allowMore ? p.save.capsules.pending.length : 0;
  const common = {
    pixi: p.pixi,
    art: p.art,
    audio: p.audio,
    catalog,
    pityRules: c.capsules.pity,
    settings: showSettings(p.save),
    oddsSheet,
    ...(narration ? { onState, onCue } : {}),
    isEquipped,
    equippedNote,
    upgradesTaught: taught,
    onDone: done,
    ...(p.doneLabel ? { doneLabel: p.doneLabel } : {}),
    ...(p.altLabel && p.onAlt
      ? {
          altLabel: p.altLabel,
          onAlt: () => {
            p.onAlt?.();
            done();
          },
        }
      : {}),
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
        pendingCount={p.doneLabel ? 0 : pending}
        {...(pending > 0 && !p.doneLabel
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
