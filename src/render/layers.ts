/**
 * Stage layers (DESIGN B6 Pixi Application): backdrop, ground decals, units (depth-sorted by y),
 * projectiles, VFX, floating text, telegraphs, screen flash. Bases and turrets sit in a structures
 * layer between the ground decals and the units; health bars sit between the VFX and the text.
 *
 * `shaker` carries the screen shake; `world` carries the camera transform (world units are lu).
 * Screen-space effects (Overdrive frame, Siege vignette) and the screen flash are not shaken.
 */
import { Container } from 'pixi.js';

export interface BattleLayers {
  root: Container;
  shaker: Container;
  world: Container;
  backdrop: Container;
  ground: Container;
  structures: Container;
  units: Container;
  projectiles: Container;
  vfx: Container;
  bars: Container;
  text: Container;
  telegraphs: Container;
  screenFx: Container;
  flash: Container;
}

function layer(label: string, parent: Container): Container {
  const c = new Container();
  c.label = label;
  parent.addChild(c);
  return c;
}

export function createLayers(): BattleLayers {
  const root = new Container();
  root.label = 'battleView';
  const shaker = layer('shaker', root);
  const world = layer('world', shaker);
  const backdrop = layer('backdrop', world);
  const ground = layer('groundDecals', world);
  const structures = layer('structures', world);
  const units = layer('units', world);
  units.sortableChildren = true;
  const projectiles = layer('projectiles', world);
  const vfx = layer('vfx', world);
  const bars = layer('healthBars', world);
  const text = layer('floatingText', world);
  const telegraphs = layer('telegraphs', world);
  const screenFx = layer('screenFx', root);
  const flash = layer('screenFlash', root);
  for (const c of [ground, bars, text, telegraphs, screenFx, flash]) c.eventMode = 'none';
  return { root, shaker, world, backdrop, ground, structures, units, projectiles, vfx, bars, text, telegraphs, screenFx, flash };
}
