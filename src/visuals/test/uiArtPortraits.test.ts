/** World-source portraits and sprite strips for the menus (UI art audit #1, #2, #6). */
import { describe, expect, it } from 'vitest';
import type { VisualDef } from '@/contracts/art';
import { AtlasAdapter } from '../adapters/atlas';
import { stripRequest } from '../adapters/spriteStrip';
import { worldPortraitFrames } from '../adapters/worldPortrait';
import { MANIFEST } from '../manifest';

describe('world-source portraits', () => {
  it('lets the atlas tier draw base and turret portraits from their sheets', () => {
    const a = new AtlasAdapter({ entries: () => Object.values(MANIFEST), decor: null as never, quality: 'high', hd: false });
    const base = MANIFEST['base.stone'] as VisualDef;
    const turret = Object.values(MANIFEST).find((d) => d.kind === 'atlas' && d.source.startsWith('art/turrets/')) as VisualDef;
    expect(base.kind).toBe('atlas');
    expect(a.canDraw('portrait', base)).toBe(true);
    expect(a.canDraw('portrait', turret)).toBe(true);
    // the lane views still wait for the sheet
    expect(a.canDraw('unit', base)).toBe(false);
  });

  it('composites a base back flag, body and front flag, and a turret mount under its head', () => {
    const base = {
      animations: { body: ['b_00'], flagA: ['fa_00'], flagB: ['fb_00'] },
      meta: { image: 'x.png', ageborn: { kind: 'base' as const, flags: [{ clip: 'flagA', z: 'front' as const }, { clip: 'flagB', z: 'back' as const }] } },
    };
    expect(worldPortraitFrames(base)).toEqual(['fb_00', 'b_00', 'fa_00']);
    const turret = { animations: { mount: ['m_00'], idle: ['i_00', 'i_01'] }, meta: { image: 'x.png', ageborn: { kind: 'turret' as const } } };
    expect(worldPortraitFrames(turret)).toEqual(['m_00', 'i_00']);
  });
});

describe('sprite strips', () => {
  it('reads the strip request from the portrait card id', () => {
    expect(stripRequest('strip:walk:standard_bearer')).toEqual({ clip: 'walk', card: 'standard_bearer' });
    expect(stripRequest('standard_bearer')).toBeNull();
  });
});
