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
import type { ComponentChildren } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import type { TabId } from '../router';
import { haptic } from './haptics';
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

/**
 * Tab glyphs: simple two-tone shapes that read at 28 px, slate when inactive and in colour when
 * active (`--tab-accent`). Distinct silhouettes, so colour is never the only cue.
 */
export function NavIcon(p: { id: TabId; size?: number }): ComponentChildren {
  const s = p.size ?? 28;
  const common = { class: 'ui-tabbar__glyph', width: s, height: s, viewBox: '0 0 32 32', 'aria-hidden': 'true' as const, focusable: 'false' as const };
  const edge = { stroke: '#0f1218', 'stroke-width': 1.8, 'stroke-linejoin': 'round' as const, 'stroke-linecap': 'round' as const };
  switch (p.id) {
    case 'army':
      // Two cards fanned with a sword emblem: "your troops".
      return (
        <svg {...common}>
          <rect x="5" y="7" width="14" height="19" rx="2.5" fill="var(--g2)" {...edge} transform="rotate(-10 12 16.5)" />
          <rect x="12" y="5" width="14" height="19" rx="2.5" fill="var(--g1)" {...edge} transform="rotate(8 19 14.5)" />
          <path d="M19.5 9.5l-4.2 7.4m0 0l-1.4-.8m1.4.8l.8 1.4m-.2-5.4l2.3 1.3" fill="none" stroke="#0f1218" stroke-width="2" transform="rotate(8 19 14.5)" />
        </svg>
      );
    case 'capsules':
      // A drum with lit ring pips.
      return (
        <svg {...common}>
          <ellipse cx="16" cy="9" rx="10" ry="4" fill="var(--g1)" {...edge} />
          <path d="M6 9v12c0 2.2 4.5 4 10 4s10-1.8 10-4V9" fill="var(--g2)" {...edge} />
          <path d="M6 15c0 2.2 4.5 4 10 4s10-1.8 10-4" fill="none" {...edge} />
          <circle cx="11" cy="20.5" r="1.3" fill="var(--g1)" />
          <circle cx="16" cy="21.3" r="1.3" fill="var(--g1)" />
          <circle cx="21" cy="20.5" r="1.3" fill="var(--g1)" />
        </svg>
      );
    case 'battle':
      // Two crossed swords over a round shield: "fight".
      return (
        <svg {...common}>
          <circle cx="16" cy="17" r="8.5" fill="var(--g2)" {...edge} />
          <path d="M5 5l15.5 15.5M27 5L11.5 20.5" fill="none" stroke="#0f1218" stroke-width="5" stroke-linecap="round" />
          <path d="M5 5l15.5 15.5M27 5L11.5 20.5" fill="none" stroke="var(--g1)" stroke-width="2.6" stroke-linecap="round" />
          <path d="M18 23l6 6M14 23l-6 6M20.5 20.5l3-3M11.5 20.5l-3-3" fill="none" stroke="#0f1218" stroke-width="3.2" stroke-linecap="round" />
          <path d="M18 23l6 6M14 23l-6 6" fill="none" stroke="var(--g2)" stroke-width="1.4" stroke-linecap="round" />
        </svg>
      );
    case 'progress':
      // A cup on a plinth.
      return (
        <svg {...common}>
          <path d="M9 5h14v5a7 7 0 0 1-14 0z" fill="var(--g1)" {...edge} />
          <path d="M9 7H5.5a3.5 3.5 0 0 0 4.2 5.4M23 7h3.5a3.5 3.5 0 0 1-4.2 5.4" fill="none" {...edge} />
          <path d="M14 17h4v4h-4z" fill="var(--g2)" {...edge} />
          <path d="M9.5 21h13l1 5h-15z" fill="var(--g2)" {...edge} />
        </svg>
      );
    case 'customize':
      // A banner flag with a brush: "how you look".
      return (
        <svg {...common}>
          <path d="M6 4v24" {...edge} fill="none" stroke-width="2.2" />
          <path d="M6.5 5h15l-3.5 5 3.5 5h-15z" fill="var(--g1)" {...edge} />
          <path d="M27 14l-8.5 8.5" stroke="#0f1218" stroke-width="4.4" stroke-linecap="round" />
          <path d="M27 14l-8.5 8.5" stroke="var(--g2)" stroke-width="2.4" stroke-linecap="round" />
          <path d="M18.5 22.5c-2 0-3.5 1.5-3.5 3.6 0 .6-.4 1.2-1 1.4 3 .9 6.2-.6 6.3-3.4z" fill="var(--g1)" {...edge} />
        </svg>
      );
  }
}
