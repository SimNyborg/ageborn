/**
 * Artist handoff sheets (DESIGN B5): one SVG per visual with the assembled pose, the zones and every
 * part at its pivot.
 */
import { describe, expect, it } from 'vitest';
import { handoffSheet, sheetParts, sheetZones } from '../handoff';
import { allPuppets, puppetById } from '../library';
import { getPart } from '../parts/registry';

describe('handoff sheets', () => {
  it('list every part and zone of a visual', () => {
    const p = puppetById('unit.destrier_knight');
    expect(p).toBeDefined();
    if (!p) return;
    const parts = sheetParts(p, getPart).map((e) => e.part.id);
    for (const s of p.slots) expect(parts).toContain(getPart(s.part)?.id);
    const zones = sheetZones(p, getPart);
    expect(zones.find((z) => z.zone === 'team')?.team).toBe(true);
    expect(zones.every((z) => z.team || z.color !== null)).toBe(true);
  });

  it('are well-formed SVG with unique clip ids', () => {
    for (const p of allPuppets().filter((x) => x.kind === 'unit').slice(0, 12)) {
      const svg = handoffSheet(p, getPart);
      expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"')).toBe(true);
      expect(svg.endsWith('</svg>')).toBe(true);
      const ids = [...svg.matchAll(/<clipPath id="([^"]+)"/g)].map((m) => m[1]);
      expect(new Set(ids).size).toBe(ids.length);
      for (const ref of svg.matchAll(/url\(#([^)]+)\)/g)) expect(ids).toContain(ref[1]);
      expect(svg).toContain(p.id);
    }
  });
});
