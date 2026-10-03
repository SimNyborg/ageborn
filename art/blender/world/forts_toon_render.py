"""Render the cartoon fort sheets of an age (`world/forts_<age>.py`, built with `world/fort_toon.make`) and
install them where the realistic forts were: `public/art/forts/<age>/<slug>(.hd).png/.json` plus the card
stills `<slug>.portrait.png` / `<slug>.portrait_team.png` (towers get their crew composited on the platform).

  <venv>/bin/python art/blender/world/forts_toon_render.py bronze --out <dir> [--only a,b] [--no-install]

One Blender process; keep at most two running (config.THREADS = 2 each).
"""
import argparse
import importlib
import os
import shutil
import sys
import time
from types import SimpleNamespace

HERE = os.path.dirname(os.path.abspath(__file__))
BLENDER = os.path.dirname(HERE)
REPO = os.path.dirname(os.path.dirname(BLENDER))
sys.path.insert(0, BLENDER)
sys.dont_write_bytecode = True


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("age")
    ap.add_argument("--out", required=True)
    ap.add_argument("--only", default="")
    ap.add_argument("--no-install", action="store_true")
    ap.add_argument("--previews", action="store_true")
    a = ap.parse_args()
    from ageborn_art import config, pipeline, retime
    from world import fort_toon
    retime.retime = lambda mod, clips: clips          # fort clips keep their authored timing
    sys.path.insert(0, os.path.join(BLENDER, "styles", "realistic", "forts"))
    sys.path.insert(0, os.path.join(BLENDER, "styles", "realistic"))
    import run as realistic_run                        # its portrait() composites the card still
    forts = importlib.import_module(f"world.forts_{a.age}").FORTS
    only = [s for s in a.only.split(",") if s]
    out = os.path.abspath(a.out)
    frames = os.path.join(out, "_frames")
    os.makedirs(out, exist_ok=True)
    t0 = time.time()
    for mod in forts:
        if only and mod.SLUG not in only:
            continue
        print(f"[{mod.SLUG}]", flush=True)
        if not hasattr(mod, "OUTER_OUTLINE"):
            mod.OUTER_OUTLINE = config.UNIT_OUTLINE_V3
        pipeline.run_unit(mod, out, frames, previews=a.previews, v3=True)
        fort_toon.finish_meta(mod, out)
        if not a.no_install:
            d = os.path.join(REPO, "public", "art", "forts", mod.AGE)
            os.makedirs(d, exist_ok=True)
            for ext in (".png", ".json", ".hd.png", ".hd.json"):
                shutil.copyfile(os.path.join(out, mod.SLUG + ext), os.path.join(d, mod.SLUG + ext))
            u = SimpleNamespace(FILE=mod.SLUG, AGE=mod.AGE, FORT_KIND=mod.FORT["kind"])
            realistic_run.portrait(u, out)
            print(f"  installed {mod.AGE}/{mod.SLUG}", flush=True)
    print(f"done in {time.time() - t0:.1f} s", flush=True)


if __name__ == "__main__":
    main()
