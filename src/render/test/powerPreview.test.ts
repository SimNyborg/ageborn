import { content } from "@/content";
import type { PowerDef } from "@/contracts";
import { describe, expect, it } from "vitest";
import {
  EDGE_STICK_LU,
  previewBand,
  previewFront,
  previewTargets,
  powerTakesAim,
  reachRulesLu,
  resolveAim,
  type PreviewUnit,
} from "../powerPreview";

const rules = reachRulesLu(content.economy);
const def = (id: string): PowerDef => {
  const d = content.powers[id];
  if (!d) throw new Error(`no power ${id}`);
  return d;
};
let nextId = 1;
const foe = (p: number, o: Partial<PreviewUnit> = {}): PreviewUnit => ({
  id: nextId++,
  own: false,
  p,
  air: false,
  summoned: false,
  leaping: false,
  cost: 50,
  half: 12,
  ...o,
});
const mine = (p: number, o: Partial<PreviewUnit> = {}): PreviewUnit => ({
  ...foe(p, o),
  own: true,
  ...o,
});

describe("power preview (A2.9.4-A2.9.7 as the ghost shows them)", () => {
  it("bands a Home power at your half and a Front power at your front plus its reach", () => {
    // Rockslide: a Home sweep with a 450 lu zone.
    expect(previewBand(def("rockslide"), null, rules)).toEqual([150, 775]);
    // Horse Artillery: a Front barrage (zone 300): F 700 → centres up to 850; F none → the 480 floor.
    expect(previewBand(def("horse_artillery"), 700, rules)).toEqual([150, 850]);
    expect(previewBand(def("horse_artillery"), null, rules)).toEqual([
      150, 630,
    ]);
    // Strikes may land anywhere; charges and buffs take no aim.
    expect(previewBand(def("hunters_spear"), null, rules)).toEqual([150, 1850]);
    expect(powerTakesAim(def("stampede"))).toBe(false);
    expect(previewBand(def("stampede"), 500, rules)).toBeNull();
  });

  it("finds the front F from trained ground units only", () => {
    const units = [
      mine(900, { air: true }),
      mine(820, { summoned: true }),
      mine(600),
      mine(400),
      foe(1000),
    ];
    expect(previewFront(units, rules)).toBe(600);
  });

  it("numbers the first N enemies nearest your gate and covers only those in the zone (the screen)", () => {
    nextId = 1;
    const cap = def("rockslide").maxTargets ?? 0;
    const units = [
      foe(300),
      foe(420),
      foe(520),
      foe(640),
      foe(700),
      foe(760),
      foe(800),
      foe(990),
      foe(1100),
    ];
    const t = previewTargets(def("rockslide"), units, 600, null, rules);
    // Cap order: lowest own-frame p first; the Home line (1,000) is a hard mask.
    expect(t.eligible).toHaveLength(cap);
    expect(t.eligible).toEqual(units.slice(0, cap).map((u) => u.id));
    // The zone (600 ± 225) covers 420-800; of those only the eligible ones are hit.
    const covered = [...t.covered].sort((a, b) => a - b);
    expect(covered).toEqual(
      units
        .filter((u) => Math.abs(u.p - 600) <= 225 && t.eligible.includes(u.id))
        .map((u) => u.id),
    );
    expect(t.notHit).toEqual(
      units
        .filter((u) => Math.abs(u.p - 600) <= 225 && !t.eligible.includes(u.id))
        .map((u) => u.id),
    );
    expect(t.areaMax).toBe(1000);
    expect(t.eligible).not.toContain(units[8]!.id);
  });

  it("locks a strike on the enemy nearest the aim within 80 lu, or nothing", () => {
    nextId = 1;
    const units = [foe(900), foe(1010), foe(1060)];
    expect(
      previewTargets(def("hunters_spear"), units, 1040, null, rules).lock,
    ).toBe(units[2]!.id);
    expect(
      previewTargets(def("hunters_spear"), units, 1300, null, rules).lock,
    ).toBeNull();
  });

  it("resolves the magnetic edge like the HUD", () => {
    expect(resolveAim(775 + EDGE_STICK_LU, [150, 775])).toEqual({
      p: 775,
      inReach: true,
      edge: true,
    });
    expect(resolveAim(776 + EDGE_STICK_LU, [150, 775]).inReach).toBe(false);
  });
});
