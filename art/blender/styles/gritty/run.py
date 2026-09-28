"""Gritty Epic style runner.

  <venv>/bin/python art/blender/styles/gritty/run.py preview bonker attack:4 attack:6 --out strip.png
  <venv>/bin/python art/blender/styles/gritty/run.py full bonker --out <dir>
"""
import argparse
import importlib
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "lib"))
sys.path.insert(0, HERE)
sys.dont_write_bytecode = True

import gritty  # noqa: E402  (sets up paths, scale and materials)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("mode", choices=["preview", "full"])
    ap.add_argument("unit")
    ap.add_argument("frames", nargs="*")
    ap.add_argument("--out", required=True)
    ap.add_argument("--only", default=None)
    a = ap.parse_args()
    import importlib.util
    spec = importlib.util.spec_from_file_location(f"gritty_{a.unit}", os.path.join(HERE, "units", f"{a.unit}.py"))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    if a.mode == "preview":
        print(gritty.preview(mod, a.frames, a.out))
    else:
        gritty.run(mod, a.out, only=a.only.split(",") if a.only else None)


if __name__ == "__main__":
    main()
