import type { PowerDef } from '@/contracts';
import { fakeContent } from '@/contracts/fakes/content';
import { describe, expect, it } from 'vitest';
import { TapTracker } from '../input';
import { hitTestMount, mountTapKind, mountWorldPoints } from '../mounts';
import { ZoneOverlay, clampPowerP, powerZoneLu } from '../powerTargeting';

const power = (effect: PowerDef['effect']): PowerDef => ({ ...(fakeContent.powers['stampede'] as PowerDef), effect });

describe('power targeting (A2.9)', () => {
  it('knows which powers use the aim and how wide their zone is', () => {
    expect(powerZoneLu(fakeContent.powers['arrow_storm'])).toBe(450);
    expect(powerZoneLu(fakeContent.powers['stampede'])).toBeNull();
    expect(powerZoneLu(power({ kind: 'sweep', zone: 600, durationMs: 2000, damage: 1, width: 40, hitsAir: true }))).toBe(600);
    expect(powerZoneLu(power({ kind: 'cloud', width: 350, durationMs: 1, enemyMissBp: 1, allyDamageBp: 1 }))).toBe(350);
    expect(powerZoneLu(power({ kind: 'buffAll', statuses: [] }))).toBeNull();
    expect(powerZoneLu(power({ kind: 'paradrop', card: 'x', count: 3, beyondFront: 150, fallbackP: 600 }))).toBeNull();
    expect(powerZoneLu(undefined)).toBeNull();
  });

  it('clamps placement to p in [150, 1,050]', () => {
    expect(clampPowerP(20, [150, 1050])).toBe(150);
    expect(clampPowerP(600.4, [150, 1050])).toBe(600);
    expect(clampPowerP(1400, [150, 1050])).toBe(1050);
  });

  it('shows telegraphs for their duration and the drag preview until hidden', () => {
    const z = new ZoneOverlay();
    z.telegraph(600, 450, 0xf28a1e, 1000);
    z.showPreview(500, 450, 0x2f7df6);
    z.update(500, 1);
    expect(z.activeCount).toBe(1);
    expect(z.previewing).toBe(true);
    z.update(600, 1);
    expect(z.activeCount).toBe(0);
    z.hidePreview();
    expect(z.previewing).toBe(false);
  });
});

describe('mounts (A2.8, A2.12)', () => {
  it('mirrors mount points for side 1 and hit-tests taps', () => {
    const local = [0, 1, 2, 3].map((i) => ({ x: 10, y: -40 - i * 30 }));
    const left = mountWorldPoints(local, -70, 0, 1);
    const right = mountWorldPoints(local, 1270, 0, -1);
    expect(left[0]).toEqual({ x: -60, y: -40 });
    expect(right[0]).toEqual({ x: 1260, y: -40 });
    expect(hitTestMount(left, { x: -58, y: -72 }, 20)).toBe(1);
    expect(hitTestMount(left, { x: 300, y: -40 }, 20)).toBeNull();
  });

  it('knows owned, buyable and hidden mounts', () => {
    expect(mountTapKind(0, 1)).toBe('mount');
    expect(mountTapKind(1, 1)).toBe('buy');
    expect(mountTapKind(2, 1)).toBeNull();
  });
});

describe('canvas taps', () => {
  it('classifies taps, double taps, drags and long presses', () => {
    const t = new TapTracker();
    expect(t.release({ x: 10, y: 10, t: 0, moved: 2 }, 100)).toBe('tap');
    expect(t.release({ x: 14, y: 12, t: 200, moved: 0 }, 250)).toBe('double');
    expect(t.release({ x: 10, y: 10, t: 1000, moved: 30 }, 1100)).toBeNull();
    expect(t.release({ x: 10, y: 10, t: 2000, moved: 0 }, 2600)).toBeNull();
    expect(t.release({ x: 10, y: 10, t: 3000, moved: 0 }, 3050)).toBe('tap');
    t.forget();
    expect(t.release({ x: 10, y: 10, t: 3100, moved: 0 }, 3150)).toBe('tap');
  });
});
