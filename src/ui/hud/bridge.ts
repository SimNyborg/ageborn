/**
 * What the HUD needs from the battle view (DESIGN B6 HUD: "turret mount hit areas (canvas pointer
 * events mapped to mounts) and power drag targeting (a canvas overlay that shows the zone)").
 *
 * `ui` may not import `render` (DESIGN B2), so this is a structural interface; `render/BattleView`
 * satisfies it and the app (WP11) passes the view in. `HudViewEvent` mirrors `render/types.ts`
 * `ViewEvent`.
 */
import type { AgeId, CardId, Command, EmoteId, MatchOutcome, Pt, Side } from '@/contracts';

export type HudViewEvent =
  | { t: 'emote'; side: Side; emote: EmoteId }
  | { t: 'denied'; command: Command['t']; reason: string }
  | { t: 'evolved'; side: Side; age: AgeId }
  | { t: 'ascending'; side: Side; age: AgeId }
  | { t: 'lastStandArmed'; side: Side }
  | { t: 'coins'; count: number }
  /** A unit or turret hit a base (not the Siege decay): that side's HP panel flashes and shakes. */
  | { t: 'baseHit'; side: Side }
  /** Your unit came out of the base door (the tray card that trained it can pop). */
  | { t: 'trained'; card: string }
  | { t: 'matchEnded'; outcome: MatchOutcome }
  | { t: 'mountTap'; mount: number; kind: 'mount' | 'buy'; screen: Pt; shift: boolean };

/** One unit dot (A17.5): size 0 = Infantry, Ranged, Anti-armor, Support; 1 = Heavy, Epic; 2 = Legendary. */
export interface HudMinimapUnit {
  x: number;
  side: Side;
  air: boolean;
  size: 0 | 1 | 2;
}

export interface HudMinimapZone {
  x: number;
  width: number;
  side: Side;
  kind: 'telegraph' | 'effect' | 'preview';
}

/** An off-screen indicator (A17.5). Mirrors `render/types.ts` `EdgeBadge`. */
export interface HudEdgeBadge {
  id: string;
  kind: 'base' | 'power' | 'legendary';
  edge: 'left' | 'right';
  x: number;
  side: Side;
  card?: CardId;
  countdown: number | null;
  ageMs: number;
}

export interface HudMinimapBase {
  hpBp: number;
  age: AgeId;
  hitAgoMs: number | null;
  evolveAgoMs: number | null;
}

/** What the minimap strip and the edge badges draw (A17.5). Mirrors `render/types.ts` `MinimapSnapshot`. */
export interface HudMinimap {
  worldLeft: number;
  worldRight: number;
  lane: number;
  mySide: Side;
  view: { left: number; right: number };
  following: boolean;
  autoCamera: boolean;
  units: HudMinimapUnit[];
  fronts: [number | null, number | null];
  bases: [HudMinimapBase, HudMinimapBase];
  cover: [boolean, boolean];
  coverLu: number;
  zones: HudMinimapZone[];
  badges: HudEdgeBadge[];
  band: { y: number; h: number };
}

export type HudCameraCommand = { t: 'base' } | { t: 'front' } | { t: 'center'; x: number } | { t: 'scrub'; x: number };

/** What blocks the auto camera from resuming (A17.4). */
export type HudCameraHold = 'popover' | 'powerDrag' | 'minimap' | 'tutorial';

export interface HudViewBridge {
  /** Own-side progress p (lu) under a client point, clamped to the power band; null off the lane. */
  laneP(clientX: number, clientY: number): number | null;
  /**
   * Shows (p) or hides (null) the power's drag ghost. `valid` false tints it as a cancel (the pointer
   * is over the HUD). Default true.
   */
  previewPower(p: number | null, valid?: boolean): void;
  /** True when the current power can be placed by dragging. */
  powerAimable(): boolean;
  on(listener: (ev: HudViewEvent) => void): () => void;
  /**
   * Where the fighting is: your and their front unit as progress 0..1 from your gate (the top bar's
   * front-line strip). Optional so plain test bridges need not implement it.
   */
  frontLine?(): { mine: number | null; theirs: number | null } | null;
  /** Screen points (relative to the canvas) that coins and XP sparkles fly to. */
  setHudAnchors(a: { gold?: Pt | null; xp?: Pt | null }): void;
  /** The minimap strip and edge badges (A17.5); optional so plain test bridges need not implement it. */
  minimap?(): HudMinimap | null;
  /** Camera commands: the base and front buttons, minimap taps and drags, badge taps (A17.4). */
  cameraCommand?(c: HudCameraCommand): void;
  /** Holds the auto camera while something is open or dragged (A17.4). */
  cameraHold?(key: HudCameraHold, on: boolean): void;
  /** Own-side p for a world x (a power dropped on the minimap), clamped to the power band. */
  powerPAtWorld?(x: number): number;
  /** The p the power preview shows now (it moves while a drag edge-scrolls the camera). */
  previewedP?(): number | null;
  /**
   * Starts tap-to-aim: holds the camera and returns the p where the ghost starts (the enemy front), or
   * null when the power ignores the aim.
   */
  powerAimStart?(): number | null;
  /** Your mount's screen point (view-local CSS px), for keeping the popover on it while scrolling. */
  mountScreenPoint?(mount: number): Pt | null;
  /** Mutes (or unmutes) the opponent's emotes and quotes for this match: no bubble, no sound (A18.9.4). */
  muteEmotes?(on: boolean): void;
  /** True while the opponent's emotes are muted (the Settings default or the per-match mute). */
  emotesMuted?(): boolean;
}
