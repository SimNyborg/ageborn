/**
 * Form controls styled as game widgets (Settings, Skirmish setup): an on/off switch, a slider and a
 * segmented choice. Each wraps a native element or the WAI-ARIA radio-group pattern, so keyboard
 * control works: Space toggles, arrows move the slider and the segmented choice.
 */
import type { ComponentChildren } from 'preact';
import { useRef } from 'preact/hooks';
import { rovingNextIndex } from './keys';

let uid = 0;
/** Stable-per-mount ids for label wiring. */
export function useId(prefix: string): string {
  const ref = useRef<string | null>(null);
  if (ref.current === null) ref.current = `${prefix}-${++uid}`;
  return ref.current;
}

export function Toggle(p: { label: string; checked: boolean; onChange: (v: boolean) => void; testid?: string; disabled?: boolean; hint?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={p.checked}
      class={`ui-toggle${p.checked ? ' is-on' : ''}`}
      data-testid={p.testid}
      disabled={p.disabled}
      onClick={() => p.onChange(!p.checked)}
    >
      <span class="ui-toggle__label">
        {p.label}
        {p.hint ? <small class="ui-toggle__hint">{p.hint}</small> : null}
      </span>
      <span class="ui-toggle__track" aria-hidden="true">
        <i class="ui-toggle__knob" />
      </span>
    </button>
  );
}

export function Slider(p: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
  icon?: ComponentChildren;
  testid?: string;
}) {
  const id = useId('slider');
  const frac = p.max > p.min ? (p.value - p.min) / (p.max - p.min) : 0;
  const text = p.format ? p.format(p.value) : String(p.value);
  return (
    <div class="ui-slider" data-testid={p.testid}>
      <label class="ui-slider__label" for={id}>
        {p.icon ? <span class="ui-slider__icon">{p.icon}</span> : null}
        {p.label}
      </label>
      <input
        id={id}
        class="ui-slider__input"
        type="range"
        min={p.min}
        max={p.max}
        step={p.step}
        value={p.value}
        aria-valuetext={text}
        style={{ '--fill': `${frac * 100}%` }}
        onInput={(e) => p.onChange(Number((e.currentTarget as HTMLInputElement).value))}
      />
      <output class="ui-slider__value" for={id}>
        {text}
      </output>
    </div>
  );
}

export interface SegmentOption<V extends string | number> {
  value: V;
  label: string;
  icon?: ComponentChildren;
  disabled?: boolean;
  hint?: string;
}

/**
 * One-of-n choice as a radio group with a roving tab index (arrow keys move and select, like native
 * radio buttons).
 */
export function Segmented<V extends string | number>(p: {
  label: string;
  value: V;
  options: readonly SegmentOption<V>[];
  onChange: (v: V) => void;
  testid?: string;
  size?: 'sm' | 'md';
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const enabled = p.options.map((o, i) => (o.disabled ? -1 : i)).filter((i) => i >= 0);
  const current = p.options.findIndex((o) => o.value === p.value);
  const focusIndex = current >= 0 && !p.options[current]!.disabled ? current : (enabled[0] ?? 0);
  function onKey(e: KeyboardEvent, i: number) {
    const pos = enabled.indexOf(i);
    const next = rovingNextIndex(e.key, pos < 0 ? 0 : pos, enabled.length, 'both');
    if (next === null) return;
    e.preventDefault();
    const target = enabled[next]!;
    p.onChange(p.options[target]!.value);
    refs.current[target]?.focus();
  }
  return (
    <div class={`ui-seg ui-seg--${p.size ?? 'md'}`} role="radiogroup" aria-label={p.label} data-testid={p.testid}>
      {p.options.map((o, i) => {
        const on = o.value === p.value;
        return (
          <button
            key={String(o.value)}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={i === focusIndex ? 0 : -1}
            disabled={o.disabled}
            title={o.hint}
            class={`ui-seg__opt${on ? ' is-on' : ''}`}
            onClick={() => p.onChange(o.value)}
            onKeyDown={(e) => onKey(e, i)}
          >
            {o.icon ? <span class="ui-seg__icon">{o.icon}</span> : null}
            <span>{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
