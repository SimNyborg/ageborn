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
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const enabled = p.items.map((it, i) => (it.disabled ? -1 : i)).filter((i) => i >= 0);
  function onKey(e: KeyboardEvent, i: number) {
    const pos = Math.max(0, enabled.indexOf(i));
    const next = rovingNextIndex(e.key, pos, enabled.length, 'horizontal');
    if (next === null) return;
    e.preventDefault();
    const target = enabled[next]!;
    p.onChange(p.items[target]!.value);
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
            data-testid={it.testid}
            onClick={() => p.onChange(it.value)}
            onKeyDown={(e) => onKey(e, i)}
          >
            {it.icon ? <span class="ui-tab__icon">{it.icon}</span> : null}
            <span class="ui-tab__label">{it.label}</span>
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
}) {
  const { t } = useKit();
  return (
    <Tabs
      label={t('ui.age.picker')}
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
