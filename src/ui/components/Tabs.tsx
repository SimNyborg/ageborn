/**
 * Tabs (WAI-ARIA tabs pattern with a roving tab index: arrows, Home and End move between tabs and
 * select them) and the age picker built on it (War Plan age tabs, collection filter).
 */
import { ageNameKey } from '@/content/keys';
import type { AgeId } from '@/contracts';
import type { ComponentChildren } from 'preact';
import { useRef } from 'preact/hooks';
import { AGE_COLOR, AgeGlyph } from './icons';
import { rovingNextIndex } from './keys';
import { useKit } from './kit';

export interface TabItem<V extends string> {
  value: V;
  label: string;
  icon?: ComponentChildren;
  /** Small marker, for example a warning dot or a count. */
  badge?: ComponentChildren;
  disabled?: boolean;
  testid?: string;
}

export function Tabs<V extends string>(p: {
  label: string;
  items: readonly TabItem<V>[];
  value: V;
  onChange: (v: V) => void;
  variant?: 'pill' | 'folder' | 'age';
  testid?: string;
  /** id prefix for aria-controls; the panel should use `${idPrefix}-panel`. */
  idPrefix?: string;
  /** Only the selected tab shows its label; the others show their icon (label stays for screen readers). */
  compact?: boolean;
}) {
  const kit = useKit();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const enabled = p.items.map((it, i) => (it.disabled ? -1 : i)).filter((i) => i >= 0);
  // MR-11: the underline slides in from the side of the previous tab.
  const index = p.items.findIndex((it) => it.value === p.value);
  const prev = useRef(index);
  const from = useRef<'left' | 'right' | null>(null);
  if (prev.current !== index) {
    from.current = prev.current < 0 ? null : prev.current < index ? 'left' : 'right';
    prev.current = index;
  }
  const change = (v: V) => {
    if (v !== p.value) kit.sound?.('ui_tab');
    p.onChange(v);
  };
  function onKey(e: KeyboardEvent, i: number) {
    const pos = Math.max(0, enabled.indexOf(i));
    const next = rovingNextIndex(e.key, pos, enabled.length, 'horizontal');
    if (next === null) return;
    e.preventDefault();
    const target = enabled[next]!;
    change(p.items[target]!.value);
    refs.current[target]?.focus();
  }
  return (
    <div class={`ui-tabs ui-tabs--${p.variant ?? 'pill'}`} role="tablist" aria-label={p.label} data-testid={p.testid}>
      {p.items.map((it, i) => {
        const on = it.value === p.value;
        return (
          <button
            key={it.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={p.idPrefix ? `${p.idPrefix}-tab-${it.value}` : undefined}
            aria-controls={p.idPrefix ? `${p.idPrefix}-panel` : undefined}
            aria-selected={on}
            tabIndex={on ? 0 : -1}
            disabled={it.disabled}
            class={`ui-tab${on ? ' is-on' : ''}`}
            title={p.compact && !on ? it.label : undefined}
            data-testid={it.testid}
            data-from={on && from.current ? from.current : undefined}
            onClick={() => change(it.value)}
            onKeyDown={(e) => onKey(e, i)}
          >
            {it.icon ? <span class="ui-tab__icon">{it.icon}</span> : null}
            <span class={`ui-tab__label${p.compact && !on ? ' ui-sr' : ''}`} data-clip-check="">{it.label}</span>
            {it.badge !== undefined && it.badge !== null && it.badge !== false ? <span class="ui-tab__badge">{it.badge}</span> : null}
          </button>
        );
      })}
    </div>
  );
}

/** Picks one of the given ages (A3: the War Plan has one loadout per age). */
export function AgePicker(p: {
  ages: readonly AgeId[];
  value: AgeId;
  onChange: (a: AgeId) => void;
  /** Ages with advisor warnings get a marker. */
  warn?: ReadonlySet<AgeId>;
  testid?: string;
  idPrefix?: string;
  compact?: boolean;
}) {
  const { t } = useKit();
  return (
    <Tabs
      label={t('ui.age.picker')}
      compact={p.compact ?? true}
      variant="age"
      value={p.value}
      onChange={p.onChange}
      testid={p.testid ?? 'age-picker'}
      idPrefix={p.idPrefix}
      items={p.ages.map((a) => ({
        value: a,
        label: t(ageNameKey(a)),
        icon: (
          <span class="ui-agechip" style={{ '--age': AGE_COLOR[a].accent }}>
            <AgeGlyph age={a} size={26} />
          </span>
        ),
        badge: p.warn?.has(a) ? <i class="ui-warndot" aria-label={t('ui.warplan.hasWarnings')} /> : undefined,
        testid: `age-tab-${a}`,
      }))}
    />
  );
}
