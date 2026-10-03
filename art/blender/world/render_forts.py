"""Render the cartoon forts (`world/forts_<age>.py`, built on `world/fort_toon.py`) and install them.

  <venv>/bin/python art/blender/world/render_forts.py --age stone --out <scratch> [--only palisade,spike_pit]
      [--install] [--no-previews]

Each fort goes through `ageborn_art.pipeline.run_unit` with the unit v3 settings (the same cel look,
outline and @2x/@1x sheets as the units), then `fort_toon.finish_meta` copies the crew, muzzle, light
and smoke points into the sheet meta. `--install` copies `<slug>(.hd).png/.json` to
`public/art/forts/<age>/` and writes the card stills `<slug>.portrait.png` / `.portrait_team.png`
(towers get their crew composited on the platform; the realistic runner's `portrait()` is reused).
"""
import argparse
import importlib
import importlib.util
import os
import shutil
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
BLENDER = os.path.dirname(HERE)
REPO = os.path.dirname(os.path.dirname(BLENDER))
sys.path.insert(0, BLENDER)
sys.dont_write_bytecode = True


def _realistic_runner():
    p = os.path.join(BLENDER, "styles", "realistic", "forts", "run.py")
    spec = importlib.util.spec_from_file_location("realistic_forts_run", p)
    m = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m)
    return m


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--age", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--only", default="")
    ap.add_argument("--install", action="store_true")
    ap.add_argument("--no-previews", action="store_true")
    args = ap.parse_args()
    from ageborn_art import config, pipeline, retime
    from world.fort_toon import finish_meta
    retime.retime = lambda mod, clips: clips
    forts = importlib.import_module(f"world.forts_{args.age}").FORTS
    only = [s for s in args.only.split(",") if s]
    out = os.path.abspath(args.out)
    frames = os.path.join(out, "_frames")
    os.makedirs(out, exist_ok=True)
    runner = _realistic_runner() if args.install else None
    t0 = time.time()
    for mod in forts:
        if only and mod.SLUG not in only:
            continue
        print(f"[{mod.SLUG}]", flush=True)
        if not hasattr(mod, "OUTER_OUTLINE"):
            mod.OUTER_OUTLINE = config.UNIT_OUTLINE_V3
        pipeline.run_unit(mod, out, frames, previews=not args.no_previews, v3=True)
        finish_meta(mod, out)
        if args.install:
            dst = os.path.join(REPO, "public", "art", "forts", mod.AGE)
            os.makedirs(dst, exist_ok=True)
            for ext in (".png", ".json", ".hd.png", ".hd.json"):
                shutil.copyfile(os.path.join(out, mod.SLUG + ext), os.path.join(dst, mod.SLUG + ext))
            mod.FILE = mod.SLUG
            mod.FORT_KIND = mod.EXTRA_META["fortKind"]
            runner.portrait(mod, out)
            print(f"  installed {mod.AGE}/{mod.SLUG}", flush=True)
    print(f"done in {time.time() - t0:.1f} s -> {out}")


if __name__ == "__main__":
    main()
