/** The minimap strip helpers and the base button's hammer badge (DESIGN A17.5, A17.6). */
import { fakeMatchConfig } from '@/contracts/fakes/sim';
import { describe, expect, it } from 'vitest';
import { hammerBadge, minimapWorldX, minimapX } from '../Minimap';
import { sampleHudModel } from '../samples';

const world = { worldLeft: -180, worldRight: 2180 };

describe('minimap strip (A17.5)', () => {
  it('maps the whole world, -180 to 2,180, linearly onto the strip and back', () => {
    expect(minimapX(-180, world, 400)).toBe(0);
    expect(minimapX(2180, world, 400)).toBe(400);
    expect(minimapX(1000, world, 400)).toBe(200);
    expect(minimapWorldX(200, world, 400)).toBe(1000);
    expect(minimapWorldX(-50, world, 400)).toBe(-180);
    expect(minimapWorldX(999, world, 400)).toBe(2180);
  });
});

describe('base button hammer badge (A17.6)', () => {
  it('shows while an owned mount is empty and the cheapest loadout turret is affordable', () => {
    const config = fakeMatchConfig();
    const rich = sampleHudModel(config, 0, { me: { gold: 5000 } });
    expect(hammerBadge({ m: rich, config, side: 0 })).toBe(true);
    const poor = sampleHudModel(config, 0, { me: { gold: 0 } });
    expect(hammerBadge({ m: poor, config, side: 0 })).toBe(false);
    // The sample owns only mount 0: once it is built, there is nothing to build on.
    const built = { ...rich, mounts: rich.mounts.map((mm) => (mm.index === 0 ? { ...mm, state: 'active' as const, card: 'x' } : mm)) };
    expect(hammerBadge({ m: built, config, side: 0 })).toBe(false);
  });
});
