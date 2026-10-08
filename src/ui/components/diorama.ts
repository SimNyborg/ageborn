/**
 * The Customize diorama in the UI (PLAN 2a "Backdrop and base-skin previews", ui-plan 4.5
 * PreviewStage): a live half of the lane with the side's scene, sky, base model, flags, decorations and
 * two idle turrets. The UI may not import render or Pixi (B2), so the app provides a `DioramaMount`
 * (render's `dioramaMount(art)`, Track B) through this context, the way it provides the card showcase
 * (`ShowcaseContext`). Without one (tests, dev pages, or while the mount is not built) the screens keep
 * their still picture (the scene thumbnail and `BaseLook`).
 */
import type { DioramaMount } from '@/contracts';
import { createContext } from 'preact';
import { useContext } from 'preact/hooks';

export const DioramaContext = createContext<DioramaMount | null>(null);

export function useDiorama(): DioramaMount | null {
  return useContext(DioramaContext);
}
