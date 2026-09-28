/**
 * The Age Capsule dialog (DESIGN A6.4 "all from one age picked in a dialog when granted", A15.5,
 * A15.7, A6.10 star 3). Meta rolls a capsule the moment it is granted (B8), so the app asks for the
 * age first and then applies the result with it.
 *
 * `AgePicker.ask` resolves with the picked age. While no dialog is mounted (tests, the dev
 * autopilot) it resolves at once with the suggested age, so a match end never waits on a dialog
 * nobody can see.
 */
import { signal, type ReadonlySignal, type Signal } from '@preact/signals';
import type { AgeId } from '@/contracts';

export interface AgeRequest {
  ages: readonly AgeId[];
  suggested: AgeId;
  pick(age: AgeId): void;
}

export class AgePicker {
  readonly request: ReadonlySignal<AgeRequest | null>;
  private readonly sig: Signal<AgeRequest | null> = signal(null);
  private mounted = 0;
  /** True: answer with the suggested age without asking (dev autopilot). */
  auto = false;

  constructor() {
    this.request = this.sig;
  }

  /** The dialog component calls this while it is on screen; the result detaches it. */
  attach(): () => void {
    this.mounted += 1;
    return () => {
      this.mounted = Math.max(0, this.mounted - 1);
    };
  }

  ask(choices: { ages: readonly AgeId[]; suggested: AgeId }): Promise<AgeId> {
    if (choices.ages.length === 1) return Promise.resolve(choices.ages[0]!);
    if (this.auto || this.mounted === 0 || choices.ages.length === 0) return Promise.resolve(choices.suggested);
    // A second request while one is open answers the first with its suggestion.
    this.sig.peek()?.pick(this.sig.peek()!.suggested);
    return new Promise<AgeId>((resolve) => {
      const req: AgeRequest = {
        ages: choices.ages,
        suggested: choices.suggested,
        pick: (age) => {
          if (this.sig.peek() === req) this.sig.value = null;
          resolve(choices.ages.includes(age) ? age : choices.suggested);
        },
      };
      this.sig.value = req;
    });
  }
}
