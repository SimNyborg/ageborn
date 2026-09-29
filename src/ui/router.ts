/**
 * Signal-based screen router for the meta UI (DESIGN B11 Router, A9 flow).
 *
 * - Screens have ids (the A9 table); browser history is not used (only `?dev` routes use the URL).
 * - The router keeps a stack of entries. `go` pushes, `back` pops, `reset` returns to one root.
 * - An entry can be an **overlay**: it renders above the entry below it instead of replacing it,
 *   so the battle stays mounted under Pause, and Settings can open over Pause (A9 #6).
 * - Route params are typed per screen id ({@link RouteParams}); screens owned by other packages
 *   (boot, battle, capsule, replay) are routed here too and rendered by the app through slots.
 *
 * - **Tabs** (docs/ui-plan.md 2.2): five destinations, one per verb (Army, Capsules, War Path,
 *   Progress, Customize). The router keeps one stack per tab, so returning to a tab shows where the
 *   player left it; `back()` on a tab root other than War Path goes to War Path (Home). A
 *   **cross-tab jump** (`jump`) remembers where it came from, and Back returns there in the state it
 *   was left; tapping a tab instead clears the origin.
 *
 * The app (WP11) creates one router and passes it to the `ScreenHost`; screens reach it through the
 * UI context. Pure apart from its signals, so it is unit-tested in Node.
 */
import { computed, signal, type ReadonlySignal } from '@preact/signals';
import type { AgeId, CardId, FormatId, MatchResultInput, OpponentSpec, RewardStep, SkirmishOptions, WarPathDifficulty } from '@/contracts';

/**
 * How a match is started (A9 Mode select, A9.1 Daily, A6.10 Conquest, A8 onboarding). The onboarding
 * matches 1 and 2 are built by the app, not picked by meta (docs/requests/wp11-router-tutorial-route.md).
 */
export type MatchRequest =
  | { mode: 'ladder'; format: FormatId }
  | { mode: 'conquest'; general: string }
  | { mode: 'skirmish'; options: SkirmishOptions; speed: 1 | 1.5 | 2 }
  | { mode: 'daily'; difficulty?: DailyDifficulty }
  | { mode: 'tutorial'; match: 1 | 2 }
  /** A War Path level (A18.7) on the chosen difficulty. */
  | { mode: 'warPath'; level: string; difficulty: WarPathDifficulty };

export type MatchMode = MatchResultInput['mode'];

/** Daily Challenge difficulty (A9.1, A15.7): Recruit (tier II), Veteran (V) or Warlord (VIII). */
export type DailyDifficulty = 'recruit' | 'veteran' | 'warlord';

/** What the Pause overlay shows (A9 #6). The app snapshots it from the HUD model when pausing. */
export interface PauseInfo {
  mode: MatchMode;
  /** Opponent cards seen so far (A3 Scouted list). */
  scouted: CardId[];
  clockMs: number;
  /** Retreat unlocks after 1:00 and counts as a loss (A2.10, C5 #19). */
  canRetreat: boolean;
  /** When Retreat unlocks in this format (1:00), or null when the format has no Retreat (Tutorial). */
  retreatAfterMs: number | null;
}

/** What the Result screen shows (A9 #7). `rewards` come from `meta.applyMatchResult`. */
export interface ResultInfo {
  input: MatchResultInput;
  rewards: RewardStep[];
  /** Index into the replay ring for "Watch replay", or null when no replay was kept. */
  replayIndex: number | null;
  /**
   * What "Next battle" starts: normally the request that started this match (same mode again); after
   * onboarding match 1 the app passes the match 2 request. Null opens Mode select.
   */
  request: MatchRequest | null;
  /** At most one stopping card after the staged rewards (A15.6); the app's session counters pick it. */
  card?: ResultCard | null;
  /** Local hour the match ended; 22:00-06:00 adds the night line and makes Home primary (A15.6). */
  endedHour?: number;
  /** Daily Challenge: what the "Copy result" line needs (A9.1, A15.7). */
  daily?: { dateKey: string; modifier: string; difficulty: DailyDifficulty } | null;
  /** One result or loss tip (A15.12, A16.6) as an i18n key, shown in the summary row. */
  tipKey?: string | null;
}

/**
 * The stopping cards (A15.6), in priority tilt, break, wrap. None blocks input, starts a timer or
 * advances by itself; Home is the primary button on each.
 */
export type ResultCard =
  | { kind: 'tilt'; watchIndex: number | null }
  | { kind: 'break' }
  | { kind: 'wrap'; wins: number; losses: number; newCards: number; chargesOut: boolean };

/** The Customize screen's tabs. */
export type CustomizeTab = 'troops' | 'bases' | 'flags' | 'decorations' | 'emotes' | 'quotes' | 'look';

/** Screens without parameters. */
export type NoParams = object;

/** Route parameters per screen id. Numbers in comments are the A9 screen numbers. */
export interface RouteParams {
  /** 1, app (WP11). */
  boot: NoParams;
  /** 2. */
  home: NoParams;
  /** 3. */
  modeSelect: { focus?: MatchRequest['mode'] };
  /** 4. */
  vs: { request: MatchRequest; opponent: OpponentSpec };
  /** 5, app + HUD (WP11, WP5). */
  battle: { request: MatchRequest; opponent: OpponentSpec };
  /** 6, overlay above the battle. */
  pause: { info: PauseInfo };
  /** 7. */
  result: { info: ResultInfo };
  /** 8, capsule show (WP10). */
  capsule: { ids: string[] };
  /** 9. */
  warPlan: { age?: AgeId; plan?: number };
  /** 10. */
  collection: { tab?: 'cards' | 'skins' | 'feats' };
  /** 11. */
  cardDetail: { card: CardId };
  /** 12. */
  trophyRoad: NoParams;
  /** 13. */
  profile: NoParams;
  /** 14, replay viewer (WP11). */
  replay: { index: number };
  /** 15. */
  settings: NoParams;
  /** 17. */
  conquest: NoParams;
  /** Customize (owner feedback 2026-09-28): troop and base skins, banner, frame, title, emotes. */
  customize: { tab?: CustomizeTab };
}

export type ScreenId = keyof RouteParams;

/** A route: a screen id plus that screen's params. */
export type Route = { [K in ScreenId]: { id: K } & RouteParams[K] }[ScreenId];

/** The route of one screen id. */
export type RouteOf<K extends ScreenId> = Extract<Route, { id: K }>;

/** Which package renders a screen, and its A9 number (for docs, the dev page and tests). */
export interface ScreenInfo {
  a9: number;
  owner: 'WP5' | 'WP9' | 'WP10' | 'WP11';
  /** Opens as an overlay unless the caller says otherwise. */
  overlay: boolean;
}

export const SCREENS: Readonly<Record<ScreenId, ScreenInfo>> = {
  boot: { a9: 1, owner: 'WP11', overlay: false },
  home: { a9: 2, owner: 'WP9', overlay: false },
  modeSelect: { a9: 3, owner: 'WP9', overlay: false },
  vs: { a9: 4, owner: 'WP9', overlay: false },
  battle: { a9: 5, owner: 'WP11', overlay: false },
  pause: { a9: 6, owner: 'WP9', overlay: true },
  result: { a9: 7, owner: 'WP9', overlay: false },
  capsule: { a9: 8, owner: 'WP10', overlay: false },
  warPlan: { a9: 9, owner: 'WP9', overlay: false },
  collection: { a9: 10, owner: 'WP9', overlay: false },
  cardDetail: { a9: 11, owner: 'WP9', overlay: false },
  trophyRoad: { a9: 12, owner: 'WP9', overlay: false },
  profile: { a9: 13, owner: 'WP9', overlay: false },
  replay: { a9: 14, owner: 'WP11', overlay: false },
  settings: { a9: 15, owner: 'WP9', overlay: false },
  conquest: { a9: 17, owner: 'WP9', overlay: false },
  /** Not in the A9 table (owner feedback 2026-09-28); numbered after it. */
  customize: { a9: 19, owner: 'WP9', overlay: false },
};

/** Screen ids rendered by this package (WP9). */
export const WP9_SCREENS: readonly ScreenId[] = (Object.keys(SCREENS) as ScreenId[]).filter((id) => SCREENS[id].owner === 'WP9');

export interface RouteEntry {
  readonly route: Route;
  readonly overlay: boolean;
  /** Unique per push, so a screen re-mounts when the same id is pushed again. */
  readonly key: number;
  /** Set on the entry a cross-tab jump pushed: where Back returns to. */
  readonly origin?: JumpOrigin;
}

/** The five bottom tabs, left to right (ui-plan 2.2). War Path is Home, in the centre. */
export type TabId = 'army' | 'capsules' | 'warPath' | 'progress' | 'customize';
export const TABS: readonly TabId[] = ['army', 'capsules', 'warPath', 'progress', 'customize'];
/** The Home tab. */
export const HOME_TAB: TabId = 'warPath';

/** Where a cross-tab jump came from: the tab and its whole stack, restored by Back. */
export interface JumpOrigin {
  readonly tab: TabId | null;
  readonly stack: readonly RouteEntry[];
}

export interface Router {
  /** Bottom to top. Never empty. */
  readonly stack: ReadonlySignal<readonly RouteEntry[]>;
  /** The top route. */
  readonly current: ReadonlySignal<Route>;
  readonly canGoBack: ReadonlySignal<boolean>;
  /** Pushes a route. Overlay by default only for screens marked so in {@link SCREENS}. */
  go(route: Route, o?: { overlay?: boolean }): void;
  /** Replaces the top entry, keeping its overlay flag unless given. */
  replace(route: Route, o?: { overlay?: boolean }): void;
  /** Pops the top entry. Returns false (and does nothing) at the root. */
  back(): boolean;
  /** Clears the stack to a single root route (for example Home after a match). */
  reset(route: Route): void;
  /** The active bottom tab, or null outside the tab shell (flows such as VS, battle, Result). */
  readonly tab: ReadonlySignal<TabId | null>;
  /**
   * Switches to a tab. The current tab's stack is kept; the target tab shows its kept stack, or
   * `root` when it has none. Tapping the active tab returns it to its root. Clears jump origins.
   */
  switchTab(tab: TabId, root: Route): void;
  /**
   * A cross-tab jump (Level preview "Edit army" to Army, Result "Upgrade" to Card detail, "Try it
   * on" to Customize): pushes `route` on `tab` (or on the current stack when null) and records the
   * origin, so Back, Esc and the back gesture return to it in the state it was left.
   */
  jump(route: Route, tab?: TabId | null): void;
  /** Leaves the tab shell for a flow (VS, battle, Result): clears the kept tab stacks. */
  leaveTabs(): void;
}

/** Deep stacks are trimmed from the bottom (keeping the root) so they cannot grow without end. */
export const MAX_STACK = 16;

/**
 * Splits a stack into what is visible: the top non-overlay entry (the base) and the overlays above
 * it, bottom to top. Entries below the base stay in the stack but are not rendered.
 */
export function visibleEntries(stack: readonly RouteEntry[]): { base: RouteEntry; overlays: RouteEntry[] } {
  let i = stack.length - 1;
  while (i > 0 && stack[i]!.overlay) i--;
  return { base: stack[i]!, overlays: stack.slice(i + 1) };
}

export function createRouter(initial: Route = { id: 'home' }): Router {
  let nextKey = 1;
  const entry = (route: Route, overlay: boolean): RouteEntry => ({ route, overlay, key: nextKey++ });
  const stack = signal<readonly RouteEntry[]>([entry(initial, false)]);
  const current = computed(() => stack.value[stack.value.length - 1]!.route);
  const tab = signal<TabId | null>(null);
  const kept = new Map<TabId, readonly RouteEntry[]>();
  const canGoBack = computed(() => stack.value.length > 1 || (tab.value !== null && tab.value !== HOME_TAB));

  function trim(list: RouteEntry[]): RouteEntry[] {
    if (list.length <= MAX_STACK) return list;
    return [list[0]!, ...list.slice(list.length - (MAX_STACK - 1))];
  }

  return {
    stack,
    current,
    canGoBack,
    go(route, o) {
      const overlay = o?.overlay ?? SCREENS[route.id].overlay;
      stack.value = trim([...stack.value, entry(route, overlay)]);
    },
    replace(route, o) {
      const list = stack.value;
      const top = list[list.length - 1]!;
      const overlay = list.length === 1 ? false : (o?.overlay ?? top.overlay);
      stack.value = [...list.slice(0, -1), entry(route, overlay)];
    },
    back() {
      const list = stack.value;
      const top = list[list.length - 1]!;
      if (top.origin) {
        // A cross-tab jump: return to the origin exactly as it was left.
        if (tab.value && tab.value !== top.origin.tab) {
          const rest = list.slice(0, -1).filter((e) => !e.origin);
          if (rest.length) kept.set(tab.value, rest);
          else kept.delete(tab.value);
        }
        tab.value = top.origin.tab;
        stack.value = top.origin.stack;
        return true;
      }
      if (list.length <= 1) {
        // Back on a tab root goes to Home (2.2); Home itself is the root.
        if (tab.value !== null && tab.value !== HOME_TAB) {
          kept.set(tab.value, list);
          const home = kept.get(HOME_TAB);
          tab.value = HOME_TAB;
          stack.value = home ? [home[0]!] : [entry({ id: 'home' }, false)];
          return true;
        }
        return false;
      }
      stack.value = list.slice(0, -1);
      return true;
    },
    reset(route) {
      stack.value = [entry(route, false)];
    },
    tab,
    switchTab(next, root) {
      const cur = tab.value;
      const clean = (list: readonly RouteEntry[]) => list.filter((e) => !e.origin);
      if (cur === next) {
        // Tapping the active tab returns it to its root.
        const list = stack.value;
        stack.value = list.length > 1 ? [clean(list)[0] ?? entry(root, false)] : list;
        return;
      }
      if (cur) kept.set(cur, clean(stack.value));
      tab.value = next;
      const saved = kept.get(next);
      stack.value = saved && saved.length ? saved : [entry(root, false)];
    },
    jump(route, target) {
      const origin: JumpOrigin = { tab: tab.value, stack: stack.value };
      const e: RouteEntry = { route, overlay: false, key: nextKey++, origin };
      if (target && target !== tab.value) {
        if (tab.value) kept.set(tab.value, stack.value);
        const saved = kept.get(target);
        tab.value = target;
        stack.value = trim([...(saved ?? []), e]);
      } else {
        stack.value = trim([...stack.value, e]);
      }
    },
    leaveTabs() {
      kept.clear();
      tab.value = null;
    },
  };
}
