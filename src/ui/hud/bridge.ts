/**
 * What the HUD needs from the battle view (DESIGN B6 HUD: "turret mount hit areas (canvas pointer
 * events mapped to mounts) and power drag targeting (a canvas overlay that shows the zone)").
 *
 * `ui` may not import `render` (DESIGN B2), so this is a structural interface; `render/BattleView`
 * satisfies it and the app (WP11) passes the view in. `HudViewEvent` mirrors `render/types.ts`
 * `ViewEvent`.
 */
import type { AgeId, CardId, Command, EmoteId, MatchOutcome, PowerReach, PowerSlot, Pt, Side } from '@/contracts';

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

/**
 * The reach band of the power being aimed (A2.9.10 step 1): world x from and to (lu). The minimap washes
 * it in your colour; `invalid` tints the rest while the aim is out of reach.
 */
export interface HudMinimapReach {
  from: number;
  to: number;
  side: Side;
  invalid: boolean;
}

/** Options of a power preview (A2.9.10 targeting). */
export interface HudPowerPreview {
  /** Which slot's power is shown (default Home). */
  slot?: PowerSlot;
  /** Why the ghost is invalid: over the HUD (a drop puts it back) or beyond the power's reach. */
  invalid?: 'hud' | 'reach';
  /** The aim sticks to the band's edge (the magnetic edge: a small bump on first contact). */
  edge?: boolean;
  /** The label plate on the band ("Your half", "Near your army"). */
  bandLabel?: string;
  /** The label on an out-of-reach ghost ("Only in your half"). */
  invalidLabel?: string;
}

/** What the ghost would do now (A2.9.10 step 2): for the token "Hits 4 of 5". */
export interface HudPowerGhost {
  /** Eligible enemies the zone covers now. */
  covered: number;
  /** Eligible enemies (the first N nearest your gate in the reach area). */
  eligible: number;
  /** A strike's lock (true when a unit is locked), null for other powers. */
  locked: boolean | null;
  valid: boolean;
}

/** A power slot's reach for aiming: the legal zone centres now (own-side lu), or null without an aim. */
export interface HudPowerReach {
  reach: PowerReach;
  band: [number, number] | null;
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
  /** The reach band of the power being aimed; absent or null when nothing is aimed. */
  reach?: HudMinimapReach | null;
}

export type HudCameraCommand = { t: 'base' } | { t: 'front' } | { t: 'center'; x: number } | { t: 'scrub'; x: number };

/** What blocks the auto camera from resuming (A17.4). */
export type HudCameraHold = 'popover' | 'powerDrag' | 'minimap' | 'tutorial';

export interface HudViewBridge {
  /** Own-side progress p (lu) under a client point, clamped to the power band; null off the lane. */
  laneP(clientX: number, clientY: number): number | null;
  /**
   * Shows (p) or hides (null) a power's drag ghost. `valid` false tints it red: over the HUD (a drop
   * puts it back) or beyond the power's reach (`o.invalid`). Default true, the Home slot.
   */
  previewPower(p: number | null, valid?: boolean, o?: HudPowerPreview): void;
  /** True when the slot's power (default Home) can be placed by dragging. */
  powerAimable(slot?: PowerSlot): boolean;
  /** The slot's reach band now (it follows your front live), or null without a power. */
  powerReach?(slot: PowerSlot): HudPowerReach | null;
  /** Own-side p (lu, not clamped to any band) under a client point, or null off the lane: power aiming. */
  laneRawP?(clientX: number, clientY: number): number | null;
  /** Own-side p for a world x, not clamped (a power dragged over the minimap). */
  pAtWorld?(x: number): number;
  /** What the ghost would hit now ("Hits 4 of 5"), or null without a ghost. */
  powerGhostInfo?(): HudPowerGhost | null;
  /** A cast was sent: the ghost contracts and fades (MR-70b) instead of vanishing. */
  powerCommit?(): void;
  on(listener: (ev: HudViewEvent) => void): () => void;
  /**
   * Where the fighting is: your and their front unit as progress 0..1 from your gate (the top bar's
   * front-line strip). Optional so plain test bridges need not implement it.
   */
  frontLine?(): { mine: number | null; theirs: number | null } | null;
  /** Screen points (relative to the canvas) that coins and XP sparkles fly to. */
  setHudAnchors(a: { gold?: Pt | null; xp?: Pt | null }): void;
  /**
   * The HUD chrome's insets in CSS px (ui-plan 3.1 world framing): `top` is the bottom of the top band
   * and minimap, `bottom` the height from the tray's top edge to the screen bottom. The camera keeps
   * the ground line 12 px above the tray and the tallest unit's HP pips under the top inset.
   */
  setHudInsets?(insets: { top: number; bottom: number }): void;
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
  powerAimStart?(slot?: PowerSlot): number | null;
  /** Your mount's screen point (view-local CSS px), for keeping the popover on it while scrolling. */
  mountScreenPoint?(mount: number): Pt | null;
  /** Mutes (or unmutes) the opponent's emotes and quotes for this match: no bubble, no sound (A18.9.4). */
  muteEmotes?(on: boolean): void;
  /** True while the opponent's emotes are muted (the Settings default or the per-match mute). */
  emotesMuted?(): boolean;
  /**
   * Your Hold flag on the lane (A18.4.2): its foot and pole top in view-local CSS px, or null while it
   * is not standing. The HUD puts its drag grip there.
   */
  holdFlagScreen?(): { x: number; y: number; top: number } | null;
  /** Own-side p (lu, not clamped) under a client point, or null off the lane: the flag drag. */
  flagPAt?(clientX: number, clientY: number): number | null;
  /** Shows the flag drag's ghost at own-side p (lu), or hides it with null. */
  previewHoldFlag?(p: number | null): void;
}
