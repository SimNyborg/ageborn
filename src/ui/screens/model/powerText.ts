/**
 * The words of a power card on the Army screens (A2.9.10, A5.7): slot, family, reach, counter line and
 * source, as whole `ui.*` keys (the strings check reads literal keys), plus the source line's values.
 */
import type { PowerDef, PowerFamily, PowerSlot } from "@/contracts";
import type { ReachLabel } from "../../components/powerInfo";

export const POWER_SLOT_KEY: Readonly<Record<PowerSlot, string>> = {
  home: "ui.power.slot.home",
  field: "ui.power.slot.field",
};

export const POWER_SLOT_LONG_KEY: Readonly<Record<PowerSlot, string>> = {
  home: "ui.power.slotLong.home",
  field: "ui.power.slotLong.field",
};

export const POWER_WRONG_SLOT_KEY: Readonly<Record<PowerSlot, string>> = {
  home: "ui.power.wrongSlot.home",
  field: "ui.power.wrongSlot.field",
};

export const POWER_FAMILY_KEY: Readonly<Record<PowerFamily, string>> = {
  bombard: "ui.power.family.bombard",
  sweep: "ui.power.family.sweep",
  snare: "ui.power.family.snare",
  pull: "ui.power.family.pull",
  stun: "ui.power.family.stun",
  flak: "ui.power.family.flak",
  charge: "ui.power.family.charge",
  frontBarrage: "ui.power.family.frontBarrage",
  strike: "ui.power.family.strike",
  suppress: "ui.power.family.suppress",
  rally: "ui.power.family.rally",
  ward: "ui.power.family.ward",
  mend: "ui.power.family.mend",
  cloud: "ui.power.family.cloud",
  drop: "ui.power.family.drop",
};

/** What each family is for ("Counters: a wave pushing into your half"). */
export const POWER_COUNTERS_KEY: Readonly<Record<PowerFamily, string>> = {
  bombard: "ui.power.counters.bombard",
  sweep: "ui.power.counters.sweep",
  snare: "ui.power.counters.snare",
  pull: "ui.power.counters.pull",
  stun: "ui.power.counters.stun",
  flak: "ui.power.counters.flak",
  charge: "ui.power.counters.charge",
  frontBarrage: "ui.power.counters.frontBarrage",
  strike: "ui.power.counters.strike",
  suppress: "ui.power.counters.suppress",
  rally: "ui.power.counters.rally",
  ward: "ui.power.counters.ward",
  mend: "ui.power.counters.mend",
  cloud: "ui.power.counters.cloud",
  drop: "ui.power.counters.drop",
};

export const POWER_REACH_KEY: Readonly<Record<ReachLabel, string>> = {
  home: "ui.power.reach.home",
  front: "ui.power.reach.front",
  fromFront: "ui.power.reach.fromFront",
  anywhere: "ui.power.reach.anywhere",
  army: "ui.power.reach.army",
  drop: "ui.power.reach.drop",
};

export const POWER_REACH_WHY_KEY: Readonly<Record<ReachLabel, string>> = {
  home: "ui.power.reachWhy.home",
  front: "ui.power.reachWhy.front",
  fromFront: "ui.power.reachWhy.fromFront",
  anywhere: "ui.power.reachWhy.anywhere",
  army: "ui.power.reachWhy.army",
  drop: "ui.power.reachWhy.drop",
};

type T = (key: string, params?: Record<string, string | number>) => string;

/**
 * Where a power comes from (A2.9.8): "Starter power", "Trophy Road 200", or "War Path · Bronze 7, or
 * Trophy Road 750" (a War Path power's Trophy Road fallback).
 */
export function powerSourceText(def: PowerDef, t: T): string {
  if (def.source === "starter") return t("ui.power.source.starter");
  if (def.source === "road" && def.road !== undefined)
    return t("ui.power.source.road", { n: def.road });
  if (def.source === "warPath" && def.warPathLevel !== undefined) {
    const region = t(`warPath.regionShort.${def.age}`);
    return def.road !== undefined
      ? t("ui.power.source.warPathOr", {
          region,
          level: def.warPathLevel,
          n: def.road,
        })
      : t("ui.power.source.warPath", { region, level: def.warPathLevel });
  }
  return t("ui.power.source.starter");
}
