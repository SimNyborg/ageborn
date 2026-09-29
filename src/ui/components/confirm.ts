/**
 * The two-tap spend (docs/ui-plan.md U10, MR-38b): irreversible spends (upgrade, craft, reroll,
 * reset) take two taps. The first tap arms the button ("Confirm · price" in place, the result
 * previewed); the second spends. A tap anywhere else, Escape or leaving the screen disarms it.
 * After the spend the button stays disarmed and blocked for `rearmMs` (600), so a fast double tap
 * can never spend twice (UA-08).
 */
import { useEffect, useRef, useState } from 'preact/hooks';

export const CONFIRM_REARM_MS = 600;

export interface ConfirmSpend {
  /** True between the first and second tap. */
  armed: boolean;
  /** True for `rearmMs` after a spend: the button ignores taps. */
  cooling: boolean;
  /**
   * The button's click handler: arms on the first tap, spends on the second. `spend` returns
   * whether it spent (a failed spend disarms without cooling).
   */
  press(spend: () => boolean): void;
  disarm(): void;
  /** Put on the armed button so a tap on it does not count as "elsewhere". */
  ref: { current: HTMLElement | null };
}

export function useConfirmSpend(o?: { rearmMs?: number; onArm?: () => void; onDisarm?: () => void }): ConfirmSpend {
  const [armed, setArmed] = useState(false);
  const [cooling, setCooling] = useState(false);
  const ref = useRef<HTMLElement | null>(null);
  const opts = useRef(o);
  opts.current = o;

  useEffect(() => {
    if (!armed || typeof document === 'undefined') return;
    const outside = (e: Event) => {
      const el = ref.current;
      const target = e.target as Node | null;
      if (el && target && typeof el.contains === 'function' && el.contains(target)) return;
      setArmed(false);
      opts.current?.onDisarm?.();
    };
    const key = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      e.stopPropagation();
      setArmed(false);
      opts.current?.onDisarm?.();
    };
    document.addEventListener('pointerdown', outside, true);
    document.addEventListener('keydown', key, true);
    return () => {
      document.removeEventListener('pointerdown', outside, true);
      document.removeEventListener('keydown', key, true);
    };
  }, [armed]);

  useEffect(() => {
    if (!cooling) return;
    const id = setTimeout(() => setCooling(false), opts.current?.rearmMs ?? CONFIRM_REARM_MS);
    return () => clearTimeout(id);
  }, [cooling]);

  return {
    armed,
    cooling,
    ref,
    press(spend) {
      if (cooling) return;
      if (!armed) {
        setArmed(true);
        opts.current?.onArm?.();
        return;
      }
      setArmed(false);
      if (spend()) setCooling(true);
    },
    disarm() {
      if (!armed) return;
      setArmed(false);
      opts.current?.onDisarm?.();
    },
  };
}
