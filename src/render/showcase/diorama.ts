/**
 * The Customize diorama (PLAN 2a "Backdrop and base-skin previews", 2f interface 3; ui-plan 4.5
 * PreviewStage): a small Pixi stage with one half of the lane, the side's scene and sky (the art
 * provider's `createBackdrop` with `scenes`), its base model (`createBase` with the per-age `skins`), its
 * dressing (`createBaseDressing`) and two idle turrets on the mounts. Presentation only, like the card
 * showcase (`stage.ts`): lazy, paused off screen, and the UI keeps its still picture until `ready`
 * resolves true.
 *
 * Owned by Track B. C0 (2026-10-08) landed the factory with the contract types (`DioramaMount`,
 * `DioramaRequest`, `DioramaHandle` in `contracts/art.ts`) and the app wiring: `AppRoot` provides
 * whatever this returns through the UI's `DioramaContext`. It returns null until Track B builds the stage,
 * so Customize shows its stills; once it returns a mount, no other file needs to change.
 */
import type { ArtProvider, CompiledContent, DioramaMount } from '@/contracts';

export interface DioramaDeps {
  /** The compiled content (the age's turrets for the mounts); absent: the stage picks none. */
  content?: CompiledContent;
}

/** The diorama mount for this art provider, or null while there is none (the screens keep their stills). */
export function dioramaMount(art: ArtProvider, o: DioramaDeps = {}): DioramaMount | null {
  void art;
  void o;
  return null;
}
