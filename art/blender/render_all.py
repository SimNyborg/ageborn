"""Render the shared death effects, every unit's sprite sheet and previews, the lane
mockups and the review sheets.

Usage (from the repo root, with the bpy venv):
  <venv>/bin/python art/blender/render_all.py --out <output dir> [--units bonker,pulse_trooper]
      [--scale 1.5] [--no-mockup] [--no-review] [--before <v1 output dir>]
"""
import argparse
import importlib
import json
import os
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.dont_write_bytecode = True  # keep __pycache__ out of the repo

FX = ["fx_dust_poof", "fx_ko_stars"]
UNITS = ["bonker", "destrier_knight", "pulse_trooper"]


AGE_OF = {
    "stone": ["bonker", "drum_shaman", "mammoth_matriarch", "pebbler", "sabertooth", "spear_hunter",
              "training_dummy", "tuskback",
              # content expansion, Stone wave (CONTENT_PLAN 5.1)
              "hunting_wolves", "cave_pup", "hide_shield", "torch_runner", "bolas_thrower", "woolly_rhino",
              "atlatl_thrower", "boulder_hurler", "herbalist", "pelt_rager", "beast_caller", "cave_bear",
              "rockfall_shaman", "elk_chieftain"],
    "bronze": ["bronze_colossus", "hoplite", "javelineer", "phalangite", "scorpion", "standard_bearer",
               "war_chariot",
               # W2 Bronze wave (CONTENT_PLAN 5.2)
               "shield_bearer", "thracian_raider", "rhodian_slingers", "discus_thrower", "war_elephant",
               "cretan_archer", "belly_bowman", "aulos_piper", "tragic_chorus", "wooden_horse", "amazon_rider",
               "minotaur", "hydra"],
    "medieval": ["battering_ram", "destrier_knight", "footman", "friar", "longbowman", "pikeman",
                 "ursa_paladin",
                 # W3 Medieval wave (CONTENT_PLAN 5.3)
                 "squire_pair", "flailman", "brigand", "crossbowman", "greatsword_knight", "yeoman_archer",
                 "warhammer_sergeant", "herald", "kennel_master", "war_hound", "mangonel_cart", "siege_belfry",
                 "alchemist", "lindworm"],
    "gunpowder": ["balloon_admiral", "bronze_cannon", "corsair", "cuirassier", "field_surgeon",
                  "fusilier", "grenadier",
                  # W4 Gunpowder wave (CONTENT_PLAN 5.4)
                  "highlander", "powder_monkey", "voltigeurs", "blunderbuss", "dragoon", "coehorn_crew",
                  "wall_gunner", "drummer_boy", "bagpiper", "rocket_cart", "hussar", "mesmerist",
                  "grand_marshal"],
    "modern": ["bazooka_trooper", "behemoth_tank", "gyrocopter", "radio_operator", "rifleman",
               "tankette", "trench_raider"],
    "future": ["chrono_titan", "emp_saboteur", "photon_knight", "pulse_trooper", "rail_gunner",
               "repair_drone", "walker_mech"],
    "cosmic": ["graviton_halberdier", "hover_tank", "ion_ranger", "mothership", "star_legionnaire",
               "starwarden", "warp_stalker"],
}
ALL_UNITS = [u for us in AGE_OF.values() for u in us]


def install(slug, out):
    import shutil
    age = next(a for a, us in AGE_OF.items() if slug in us)
    dst = os.path.join(HERE, "..", "..", "public", "art", "units", age)
    os.makedirs(dst, exist_ok=True)
    for f in (f"{slug}.json", f"{slug}.png", f"{slug}.hd.json", f"{slug}.hd.png"):
        shutil.copyfile(os.path.join(out, f), os.path.join(dst, f))
    # the extras sheet (attack variants, attack_alt; ANIM_SPEC P4): installed when rendered,
    # removed when the unit no longer has one
    for f in (f"{slug}.x.json", f"{slug}.x.png", f"{slug}.x.hd.json", f"{slug}.x.hd.png"):
        src, d = os.path.join(out, f), os.path.join(dst, f)
        if os.path.exists(src):
            shutil.copyfile(src, d)
        elif os.path.exists(d):
            os.remove(d)
    print(f"  installed {age}/{slug}", flush=True)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", required=True, help="output directory for sheets and previews")
    ap.add_argument("--units", default=",".join(UNITS))
    ap.add_argument("--no-fx", action="store_true", help="reuse the FX sheets already in --out")
    ap.add_argument("--no-mockup", action="store_true")
    ap.add_argument("--no-review", action="store_true")
    ap.add_argument("--before", help="v1 output dir, for the before/after review sheet")
    ap.add_argument("--scale", type=float, default=2.0, help="sheet scale vs 1280 px (default 2)")
    ap.add_argument("--v3", action="store_true",
                    help="shipping unit sheets: retimed clips, @2x + @1x sheets (see pipeline.run_unit)")
    ap.add_argument("--no-previews", action="store_true", help="skip GIFs and contact sheets")
    ap.add_argument("--install", action="store_true",
                    help="with --v3: copy the sheets to public/art/units/<age>/ (age from the unit module)")
    args = ap.parse_args()
    from ageborn_art import config, pipeline  # imports bpy
    config.set_render_scale(args.scale)

    out = os.path.abspath(args.out)
    frames = os.path.join(out, "_frames")
    os.makedirs(out, exist_ok=True)
    t0 = time.time()
    all_stats = []
    units = ALL_UNITS if args.units == "all" else args.units.split(",")
    todo = ([] if args.no_fx else FX) + units
    for slug in todo:
        print(f"[{slug}]", flush=True)
        mod = importlib.import_module(f"units.{slug}")
        is_fx = slug in FX
        st = pipeline.run_unit(mod, out, frames, previews=not args.no_previews,
                               v3=args.v3 and not is_fx)
        all_stats.append(st)
        if args.install and args.v3 and not is_fx:
            install(slug, out)
    if not args.no_mockup:
        import mockup
        # every unit that has an atlas in the output folder, not only the ones just rendered
        mockup.make(out, [u for u in UNITS if os.path.exists(os.path.join(out, f"{u}.json"))])
        if not args.no_review:
            import review
            sys.argv = ["review.py", out] + (["--before", args.before] if args.before else [])
            review.main()
    with open(os.path.join(out, "stats.json"), "w") as fh:
        json.dump({"units": all_stats, "seconds": round(time.time() - t0, 1)}, fh, indent=1)
    print(f"done in {time.time() - t0:.1f} s -> {out}")


if __name__ == "__main__":
    main()
