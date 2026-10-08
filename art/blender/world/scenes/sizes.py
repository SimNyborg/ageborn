"""Size and colour-rule report for every installed backdrop scene (PLAN 2b "Size and loading budget",
"Colour rule test"). No Blender needed: it reads `public/art/backdrops/**` with Pillow.

  python3 art/blender/world/scenes/sizes.py           # the table
  python3 art/blender/world/scenes/sizes.py --write   # also writes scenes/checks.json for the unit test

Per scene (format 2, `<age>/<scene>/`): each file against its budget (far 38 KB, mid 48 KB, back 14 KB,
props 14 KB, thumb 8 KB, layers.json 3 KB) and the total against 110 KB; the share of opaque far, mid and
back pixels (and of the thumbnail) that break the colour rule: a hue in a team band (350-81 or 182-254
degrees) with saturation and value both above 40% (A11: backdrops stay desaturated; small accents such as
a brazier or a lamp are fine, so the limit is a share, 2% per strip and 3% for the thumbnail). Format 1
classics (`<age>/`) are listed for their sizes only.
"""
import json
import os
import sys

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(HERE))))
ROOT = os.path.join(REPO, "public", "art", "backdrops")
AGES = ["stone", "bronze", "medieval", "gunpowder", "industrial", "modern", "future", "cosmic"]
BUDGET = {"back.webp": 14 * 1024, "far.webp": 38 * 1024, "mid.webp": 48 * 1024, "props.webp": 14 * 1024,
          "thumb.webp": 8 * 1024, "layers.json": 3 * 1024}
TOTAL = 110 * 1024
RULE_LIMIT = {"strip": 0.02, "thumb": 0.03}


def rule_share(path, min_alpha=0.5):
    a = np.asarray(Image.open(path).convert("RGBA"), dtype=np.float32) / 255.0
    rgb, al = a[..., :3], a[..., 3]
    mx, mn = rgb.max(-1), rgb.min(-1)
    d = np.maximum(mx - mn, 1e-6)
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    h = np.where(mx == r, ((g - b) / d) % 6, np.where(mx == g, (b - r) / d + 2, (r - g) / d + 4)) * 60.0
    s = np.where(mx > 1e-6, (mx - mn) / np.maximum(mx, 1e-6), 0)
    band = (h >= 350) | (h <= 81) | ((h >= 182) & (h <= 254))
    op = al > min_alpha
    bad = band & (s > 0.40) & (mx > 0.40) & op
    return float(bad.sum()) / max(1, int(op.sum()))


def scenes():
    for age in AGES:
        d = os.path.join(ROOT, age)
        if not os.path.isdir(d):
            continue
        if os.path.exists(os.path.join(d, "layers.json")):
            yield age, "classic", d, 1
        for sid in sorted(os.listdir(d)):
            sd = os.path.join(d, sid)
            if os.path.isdir(sd) and os.path.exists(os.path.join(sd, "layers.json")):
                yield age, sid, sd, 2


def main():
    write = "--write" in sys.argv
    checks = {}
    fails = []
    print(f"{'scene':28s} {'back':>7s} {'far':>7s} {'mid':>7s} {'props':>7s} {'thumb':>7s} {'json':>6s} {'total':>8s}  colour rule (far/mid/back/thumb)")
    for age, sid, d, fmt in scenes():
        key = f"{age}.{sid}"
        sizes = {}
        for name in BUDGET:
            p = os.path.join(d, name)
            if os.path.exists(p):
                sizes[name] = os.path.getsize(p)
        total = sum(sizes.values()) if fmt == 2 else sum(v for k, v in sizes.items() if k in ("far.webp", "mid.webp", "layers.json"))
        rule = {}
        if fmt == 2:
            for name, kind in (("far.webp", "strip"), ("mid.webp", "strip"), ("back.webp", "strip"), ("thumb.webp", "thumb")):
                if name in sizes:
                    rule[name] = round(rule_share(os.path.join(d, name)), 4)
                    if rule[name] > RULE_LIMIT[kind]:
                        fails.append(f"{key} {name} colour rule {rule[name] * 100:.2f}%")
            for name, b in BUDGET.items():
                if name in sizes and sizes[name] > b:
                    fails.append(f"{key} {name} {sizes[name]} B > {b} B")
            if total > TOTAL:
                fails.append(f"{key} total {total} B > {TOTAL} B")
            checks[key] = {"sizes": sizes, "total": total, "rule": rule}
        cell = lambda n: f"{sizes[n] / 1024:6.1f}K" if n in sizes else "      -"  # noqa: E731
        rr = "/".join(f"{rule[n] * 100:.2f}" if n in rule else "-" for n in ("far.webp", "mid.webp", "back.webp", "thumb.webp"))
        tag = f"{key} (f{fmt})"
        print(f"{tag:28s} {cell('back.webp')} {cell('far.webp')} {cell('mid.webp')} {cell('props.webp')} {cell('thumb.webp')} "
              f"{sizes.get('layers.json', 0):6d} {total / 1024:7.1f}K  {rr if fmt == 2 else '(format 1)'}")
    print(f"budget: far 38K, mid 48K, back 14K, props 14K, thumb 8K, json 3K, total 110K; colour rule <= 2% per strip, 3% thumb")
    if write:
        with open(os.path.join(HERE, "checks.json"), "w") as fh:
            json.dump(checks, fh, indent=1, sort_keys=True)
            fh.write("\n")
        print("wrote", os.path.join(HERE, "checks.json"))
    if fails:
        print("FAIL:\n  " + "\n  ".join(fails))
        sys.exit(1)
    print("sizes: OK")


if __name__ == "__main__":
    main()
