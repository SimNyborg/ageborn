/**
 * Shared render types: view settings, view actions (the event mapper's output) and view events
 * (what the battle view tells the HUD).
 */
import type { AgeId, CardId, ClipName, Command, EffectId, EmoteId, MatchOutcome, MusicCueId, MusicLayer, PowerSlot, Pt, Side, SoundId, TeamPreset, VisualId } from '@/contracts';
import type { GraphicsSetting } from './presets';

/** The player settings the battle view reads (a subset of `Settings`, DESIGN A9 Settings, A12). */
export interface ViewSettings {
  graphics: GraphicsSetting;
  reduceMotion: boolean;
  /** Shake slider, 0..1. */
  shake: number;
  hitstop: boolean;
  damageNumbers: 'off' | 'important' | 'all';
  teamPreset: TeamPreset;
  mutedEmotes: boolean;
  /** A17.4 "Auto camera": follow the fight when you are not scrolling; Off never resumes by itself. */
  autoCamera: boolean;
  /** A17.4 edge scroll (desktop, fine pointer only). */
  edgeScroll: boolean;
}

export const DEFAULT_VIEW_SETTINGS: ViewSettings = {
  graphics: 'auto',
  reduceMotion: false,
  shake: 1,
  hitstop: true,
  damageNumbers: 'important',
  teamPreset: 'default',
  mutedEmotes: false,
  autoCamera: true,
  edgeScroll: true,
};

/** One unit dot on the minimap (A17.5): size 0 = Infantry, Ranged, Anti-armor, Support; 1 = Heavy, Epic; 2 = Legendary. */
export interface MinimapUnit {
  x: number;
  side: Side;
  air: boolean;
  size: 0 | 1 | 2;
}

/** A power zone on the minimap: its telegraph, its effect, or your drag preview. */
export interface MinimapZone {
  x: number;
  width: number;
  side: Side;
  kind: 'telegraph' | 'effect' | 'preview';
}

/** An off-screen indicator (A17.5): base under attack, power incoming, enemy Legendary. */
export interface EdgeBadge {
  /** Stable id (the HUD keys its elements by it). */
  id: string;
  kind: 'base' | 'power' | 'legendary';
  edge: 'left' | 'right';
  /** World x the badge points at (a tap jumps the camera there). */
  x: number;
  /** The side the thing belongs to (colours the badge). */
  side: Side;
  /** The power or the Legendary's card. */
  card?: CardId;
  /** 0..1 left of a power's telegraph (the countdown ring); null outside it. */
  countdown: number | null;
  /** Game ms since it appeared (newest on top). */
  ageMs: number;
}

/** Everything the HUD's minimap strip and edge badges draw (A17.5), in world lu unless named. */
export interface MinimapSnapshot {
  worldLeft: number;
  worldRight: number;
  lane: number;
  mySide: Side;
  /** The camera window. */
  view: { left: number; right: number };
  following: boolean;
  autoCamera: boolean;
  units: MinimapUnit[];
  /** Each side's front (world x), null without units. */
  fronts: [number | null, number | null];
  bases: [MinimapBase, MinimapBase];
  /** Each side owns at least one turret (the turret-cover bracket shows). */
  cover: [boolean, boolean];
  coverLu: number;
  zones: MinimapZone[];
  badges: EdgeBadge[];
  /** The lane band in CSS px (the badges sit at its edges). */
  band: { y: number; h: number };
  /** The reach band of the power being aimed (world x), or null (A2.9.10: the minimap shows the same tint). */
  reach: { from: number; to: number; side: Side; invalid: boolean } | null;
}

/** Options of a power preview (mirrors `ui/hud/bridge.ts` `HudPowerPreview`, A2.9.10 targeting). */
export interface PowerPreviewOpts {
  slot?: PowerSlot;
  invalid?: 'hud' | 'reach' | undefined;
  edge?: boolean;
  bandLabel?: string;
  invalidLabel?: string;
}

export interface MinimapBase {
  hpBp: number;
  age: AgeId;
  /** Real ms since the last hit by a unit or turret (the red flash), or null. */
  hitAgoMs: number | null;
  /** Real ms since an evolve whose push did not run because the base was off-screen, or null. */
  evolveAgoMs: number | null;
}

/** Camera commands from the HUD (minimap, jump buttons, badges). */
export type CameraCommand = { t: 'base' } | { t: 'front' } | { t: 'center'; x: number } | { t: 'scrub'; x: number };

/** Where an action happens. The view resolves anchors to world points at execution time. */
export type Anchor =
  | { k: 'unit'; id: number; part?: 'feet' | 'hit' | 'head' }
  | { k: 'world'; x: number; y: number }
  | { k: 'base'; side: Side; part?: 'center' | 'front' | 'top' }
  | { k: 'mount'; side: Side; mount: number };

/** Throttle for repeated sounds or trauma: at most once per `gapMs` for the same key. */
export interface Gap {
  key: string;
  gapMs: number;
}

/** A primitive view action produced by the event mapper and executed by the battle view. */
export type ViewAction =
  | { a: 'unitSpawn'; id: number; side: Side; card: CardId; x: number; summoned: boolean; level: number }
  | { a: 'unitClip'; id: number; clip: ClipName; impactAtMs?: number }
  | { a: 'unitDie'; id: number }
  | { a: 'unitFlash'; id: number; ms: number; color?: number }
  | { a: 'unitFreeze'; id: number; ms: number; jitterPx?: number }
  | { a: 'cheer'; side: Side }
  | {
      a: 'projectile';
      pid: number;
      from: number;
      side: Side | null;
      targetId: number;
      toX: number;
      travelMs: number;
      visualId: VisualId;
      arc: boolean;
    }
  /**
   * Particles at an anchor. `opts` use the art's effect option names (WP4 `effects/recipes.ts`: side,
   * dir, radius, zone, width, height, distance, speed, durationMs, ...). `follow` keeps the effect on
   * its unit while the unit lives and ends it when the unit dies (A12 checklist 10).
   */
  | { a: 'fx'; effectId: EffectId; at: Anchor; count: number; priority: number; spreadLu?: number; opts?: Record<string, number>; follow?: boolean }
  /** One effect on every live unit of `side`, following each unit (Royal Decree, Nanite Surge). */
  /** An effect on every visible unit of a side; `roles` limits it to units of those roles (a research shimmer). */
  | { a: 'fxUnits'; effectId: EffectId; side: Side; priority: number; opts?: Record<string, number>; roles?: readonly string[] }
  | { a: 'fxFly'; effectId: EffectId; from: Anchor; to: 'gold' | 'xp'; count: number; priority: number }
  | { a: 'sound'; id: SoundId; delayMs?: number; gap?: Gap; climb?: string; priority?: number }
  | { a: 'trauma'; amount: number; dir?: Pt; gap?: Gap }
  | { a: 'screenFlash'; ms: number; color: number; alpha: number }
  | { a: 'baseFlash'; side: Side; ms: number }
  | { a: 'freeze'; ms: number; exempt: boolean }
  | { a: 'slowMo'; scale: number; ms: number }
  /** A camera moment: push in on an anchor, hold, ease out (`outMs` 0 = hold until the end). */
  | { a: 'camera'; at: Anchor; zoom: number; inMs: number; holdMs: number; outMs: number }
  | { a: 'duck'; db: number; ms: number }
  | { a: 'musicCue'; cue: MusicCueId; fadeMs: number }
  | { a: 'musicTranspose'; semitones: number }
  | { a: 'musicLayer'; layer: MusicLayer; v: number }
  | { a: 'intensity'; amount: number }
  | { a: 'number'; kind: 'damage' | 'power' | 'base' | 'kill' | 'heal' | 'gold' | 'income'; value: number; at: Anchor; important: boolean; key?: string }
  | { a: 'turret'; side: Side; mount: number; op: 'buildStart' | 'built' | 'sell' | 'replace' | 'fire'; card: CardId; targetId?: number }
  | { a: 'base'; side: Side; op: 'hit' | 'collapse' }
  | { a: 'baseTreasury'; side: Side; level: number }
  | { a: 'baseGlow'; side: Side; on: boolean }
  | { a: 'baseMorph'; side: Side; age: AgeId; ms: number }
  /** The evolve build-up on the base during the Ascension (`ms` until `ageUp`). */
  | { a: 'baseAscend'; side: Side; ms: number }
  /** A new turret slot is built on the base. */
  | { a: 'baseMount'; side: Side; mount: number }
  | { a: 'backdropWipe'; side: Side; age: AgeId; ms: number }
  | { a: 'telegraph'; side: Side; castId: number; power: CardId; x: number; zone: number; ms: number; targetId?: number }
  /** Suppress (A2.9.7): a mount of `side` is silenced for `ms` (its jam mark shows). */
  | { a: 'jam'; side: Side; mount: number; ms: number }
  | { a: 'phase'; phase: 'regulation' | 'overdrive' | 'siege' }
  | { a: 'view'; ev: ViewEvent };

/** Events the battle view raises for the HUD and the session. */
export type ViewEvent =
  | { t: 'emote'; side: Side; emote: EmoteId }
  | { t: 'denied'; command: Command['t']; reason: string }
  | { t: 'evolved'; side: Side; age: AgeId }
  | { t: 'ascending'; side: Side; age: AgeId }
  | { t: 'lastStandArmed'; side: Side }
  | { t: 'coins'; count: number }
  | { t: 'baseHit'; side: Side }
  | { t: 'trained'; card: CardId }
  | { t: 'matchEnded'; outcome: MatchOutcome }
  | { t: 'mountTap'; mount: number; kind: 'mount' | 'buy'; screen: Pt; shift: boolean };

export type ViewEventListener = (ev: ViewEvent) => void;
