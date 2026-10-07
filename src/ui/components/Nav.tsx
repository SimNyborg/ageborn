/**
 * The navigation shell's bottom bar (docs/ui-plan.md 2.2, 2.3 "Bottom nav", 3.6 tabs; MR-10, MR-25).
 *
 * Five labelled tabs, one per verb: Army, Capsules, **Battle** (Home, the 1v1 hub, centre, raised 6 px
 * with a gold rim when active), Progress, Customize. 88 x 56 per tab on compact phones (80 below 820 px
 * wide), 120 x 72 on regular screens; icon 28 over a 12 px label. The active tab sits on a lit plate
 * that slides under it (220, standard) and its icon pops (1.15 -> 1). Ready badges (at most 2 on
 * Home, by the priority in 2.2) and NEW dots come from the caller. A locked tab is greyed; the next
 * one to unlock shows "5 wins" on its icon and a tap shows "Unlocks at 5 wins" above it (U8; wins in
 * any mode count, owner decision 2026-09-30). Keys 1-5 switch tabs on desktop (the shell binds them).
 */
import { useEffect, useRef, useState } from 'preact/hooks';
import type { TabId } from '../router';
import { haptic } from './haptics';
import { NavIcon } from './navIcons';
import { useKit } from './kit';

export interface NavTab {
  id: TabId;
  /**
   * Ready badge: a number (capsules that can be opened now), 'ready' for a ready mark without a count
   * (an upgrade can be made now; a count would read as a backlog, U11), 'dot' for a NEW dot, or null.
   */
  badge?: number | 'ready' | 'dot' | null;
  /** Locked until this many wins (any mode); `showLevel` marks the next one to unlock ("5 wins"). */
  lockedUntil?: number | null;
  showLevel?: boolean;
  /** Not shown at all yet (first launch shows no tabs, 2.6). */
  hidden?: boolean;
}

export const NAV_LABEL_KEY: Readonly<Record<TabId, string>> = {
  army: 'ui.nav.army',
  capsules: 'ui.nav.capsules',
  battle: 'ui.nav.battle',
  progress: 'ui.nav.progress',
  customize: 'ui.nav.customize',
};

/** Picks the at most 2 ready badges Home may show (2.2: Capsules, then Army, then Progress). */
export function homeBadges(ready: Partial<Record<TabId, number | 'ready' | 'dot' | null>>): Partial<Record<TabId, number | 'ready' | 'dot'>> {
  const out: Partial<Record<TabId, number | 'ready' | 'dot'>> = {};
  let n = 0;
  for (const id of ['capsules', 'army', 'progress'] as const) {
    const v = ready[id];
    if (v === null || v === undefined || v === 0 || n >= 2) continue;
    out[id] = v;
    n++;
  }
  // Customize never carries a ready badge; NEW dots live inside it.
  return out;
}

export function TabBar(p: { tabs: readonly NavTab[]; active: TabId | null; onSelect: (tab: TabId) => void; testid?: string }) {
  const kit = useKit();
  const { t } = kit;
  const visible = p.tabs.filter((x) => !x.hidden);
  const idx = Math.max(0, visible.findIndex((x) => x.id === p.active));
  const [pointer, setPointer] = useState<{ id: TabId; n: number } | null>(null);
  const [popped, setPopped] = useState<TabId | null>(null);
  const prev = useRef(p.active);
  useEffect(() => {
    if (prev.current !== p.active && p.active) setPopped(p.active);
    prev.current = p.active;
  }, [p.active]);
  useEffect(() => {
    if (!pointer) return;
    const id = setTimeout(() => setPointer(null), 2000);
    return () => clearTimeout(id);
  }, [pointer]);

  return (
    <nav class="ui-tabbar" aria-label={t('ui.nav.label')} data-testid={p.testid ?? 'tabbar'} style={{ '--tab-count': visible.length, '--tab-i': idx }}>
      {p.active ? <i class="ui-tabbar__plate" aria-hidden="true" /> : null}
      {visible.map((tab) => {
        const on = tab.id === p.active;
        const locked = tab.lockedUntil !== null && tab.lockedUntil !== undefined;
        const label = t(NAV_LABEL_KEY[tab.id]);
        return (
          <button
            key={tab.id}
            type="button"
            class={`ui-tabbar__tab ui-tabbar__tab--${tab.id}${on ? ' is-on' : ''}${locked ? ' is-locked' : ''}`}
            aria-current={on ? 'page' : undefined}
            aria-disabled={locked ? 'true' : undefined}
            aria-label={locked ? `${label}. ${t('ui.nav.unlocksAt', { n: tab.lockedUntil! })}` : undefined}
            data-testid={`tab-${tab.id}`}
            onPointerDown={(e) => {
              (e.currentTarget as HTMLElement).setAttribute?.('data-pressed', '');
              if (!locked) haptic('tick');
            }}
            onPointerUp={(e) => (e.currentTarget as HTMLElement).removeAttribute?.('data-pressed')}
            onPointerLeave={(e) => (e.currentTarget as HTMLElement).removeAttribute?.('data-pressed')}
            onClick={() => {
              if (locked) {
                kit.sound?.('ui_deny');
                haptic('deny');
                setPointer((x) => ({ id: tab.id, n: (x?.n ?? 0) + 1 }));
                return;
              }
              kit.sound?.('ui_tab');
              p.onSelect(tab.id);
            }}
          >
            <span class={`ui-tabbar__icon${popped === tab.id ? ' is-pop' : ''}`} onAnimationEnd={() => setPopped(null)}>
              <NavIcon id={tab.id} />
              {tab.badge === 'dot' ? <i class="ui-badge ui-badge--dot ui-tabbar__badge" data-badge="new" /> : null}
              {tab.badge === 'ready' ? <i class="ui-badge ui-badge--green ui-badge--dot ui-tabbar__badge ui-tabbar__ready" data-badge="ready" /> : null}
              {typeof tab.badge === 'number' && tab.badge > 0 ? (
                <span class="ui-badge ui-badge--green ui-tabbar__badge" data-badge="ready">
                  {tab.badge}
                </span>
              ) : null}
              {locked ? <LockMark /> : null}
              {/* 2.6: the next tab to unlock keeps its name and adds "Lv N" as a tag on its icon. */}
              {locked && tab.showLevel ? (
                <span class="ui-tabbar__lv" data-tag="">
                  {t('ui.nav.lockedLv', { n: tab.lockedUntil! })}
                </span>
              ) : null}
            </span>
            <span class="ui-tabbar__label" data-clip-check="">
              {label}
            </span>
            {pointer && pointer.id === tab.id ? (
              <span class="ui-tabbar__pointer" role="status" key={pointer.n}>
                {t('ui.nav.unlocksAt', { n: tab.lockedUntil ?? 0 })}
              </span>
            ) : null}
          </button>
        );
      })}
    </nav>
  );
}

function LockMark() {
  return (
    <svg class="ui-tabbar__lock" viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
      <rect x="5" y="10.5" width="14" height="10" rx="2.5" fill="#c3bcae" stroke="#0f1218" stroke-width="1.6" />
      <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" fill="none" stroke="#0f1218" stroke-width="2.6" />
      <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" fill="none" stroke="#c3bcae" stroke-width="1.2" />
    </svg>
  );
}

export { NavIcon };
