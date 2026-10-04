"""Walk check (ANIM_SPEC P6): measures installed unit sheets at phone scale and fails the
section 2.1 thresholds for each sheet's gait.

  .venv-blender/bin/python art/blender/check_walk.py [--age stone] [--units bonker,pebbler] [--all]

Only sheets made to the animation standard (with `meta.ageborn.gait`) are gated; older sheets
are reported with `--all`. Phone scale: 844 x 390 CSS px, 0.9145 px per lu. Measured per walk:

  step      body advance per footfall = natural speed x cycle / 2 (px)
  speed     natural speed / ground speed (card speed x 1.25 from src/content/raw)
  drift     planted-foot drift per frame (lu, from the sheet's `plantedDriftLu`)
  bob       range of the centroid height of the upper 55% of the silhouette (px)
  apart     walk frames with two separate shapes in the 2 px sole band above the ground line
  gap       widest ground gap between those shapes on the contact frames (px)
  energy    share of changed pixels (alpha or luma > 30) between frames in the bottom 30% (vehicles)
"""
import argparse
import json
import os
import re
import sys

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
UNITS = os.path.join(ROOT, "public", "art", "units")
RAW = os.path.join(ROOT, "src", "content", "raw")
PHONE = 265.2 / 290.0          # CSS px per lu at 844 x 390
MARCH = 1.25                   # economy.marchSpeedBp 12500
DEPTH_PX = 3                   # 2 x hip spread (6 lu) x sin(16 deg camera tilt) at phone scale
AGES = ["stone", "bronze", "medieval", "gunpowder", "industrial", "modern", "future", "cosmic"]

# ANIM_SPEC 2.1 thresholds per class (px at phone scale unless noted)
CLASS_OF_GAIT = {"biped": "G1", "heavy": "G3", "quad": "G4", "rider": "G5", "wheeled": "G6",
                 "tracked": "G6", "walker": "G7", "hover": "G8", "fly": "G8"}
BIG_BEASTS = {"mammoth_matriarch", "war_elephant"}
CLASS_OVERRIDE = {"drum_shaman": "G2", "friar": "G2", "starwarden": "G2", "standard_bearer": "G2",
                  "aulos_piper": "G2", "tragic_chorus": "G2",
                  "herbalist": "G2", "rockfall_shaman": "G2",
                  "bio_weaver": "G2", "void_whisperer": "G2"}
LIMITS = {
    "G1": {"step": 20.0, "bob": 5.0, "apart": 4, "gap": 5.0},
    "G2": {"step": 16.5, "bob": 4.0},
    "G3": {"step": 20.0, "bob": 4.0},
    "G4": {"bob": 3.0},
    "G5": {"bob": 3.0},
    "G6": {"energy": 0.30},
    "G7": {"step": 20.0, "bob": 3.5},
    "G8": {},
}


def card_speeds():
    out = {}
    for f in os.listdir(RAW):
        if not f.endswith(".ts"):
            continue
        txt = open(os.path.join(RAW, f)).read()
        for m in re.finditer(r"id: '([a-z0-9_]+)',(?: released: (?:true|false),)? kind: 'unit'", txt):
            sp = re.search(r"speed: (\d+)", txt[m.end():m.end() + 600])
            if sp:
                out[m.group(1)] = int(sp.group(1))
    return out


def frame(j, im, name, tint=(47, 125, 246)):
    fr = j["frames"][name]
    f, sss, src = fr["frame"], fr["spriteSourceSize"], fr["sourceSize"]
    canvas = np.zeros((src["h"], src["w"], 4), np.float32)
    tn = name + "_team"
    if tn in j["frames"]:
        t = j["frames"][tn]
        tf, ts = t["frame"], t["spriteSourceSize"]
        a = np.asarray(im.crop((tf["x"], tf["y"], tf["x"] + tf["w"], tf["y"] + tf["h"])), np.float32) / 255
        a[..., :3] *= np.array(tint, np.float32) / 255
        canvas[ts["y"]:ts["y"] + tf["h"], ts["x"]:ts["x"] + tf["w"]] = a
    b = np.asarray(im.crop((f["x"], f["y"], f["x"] + f["w"], f["y"] + f["h"])), np.float32) / 255
    reg = canvas[sss["y"]:sss["y"] + f["h"], sss["x"]:sss["x"] + f["w"]]
    al = b[..., 3:4]
    reg[..., :3] = b[..., :3] * al + reg[..., :3] * (1 - al)
    reg[..., 3:4] = al + reg[..., 3:4] * (1 - al)
    return canvas, fr["anchor"]["x"] * src["w"], fr["anchor"]["y"] * src["h"]


def to_phone(arr, ax, ay, ppl):
    k = PHONE / ppl
    h, w = arr.shape[:2]
    img = Image.fromarray((arr * 255).astype(np.uint8), "RGBA")
    img = img.resize((max(1, round(w * k)), max(1, round(h * k))), Image.Resampling.BOX)
    return np.asarray(img, np.float32) / 255, ax * k, ay * k


def runs(row):
    """Separate runs of opaque pixels along x (start, end)."""
    out, start = [], None
    for x, v in enumerate(row):
        if v and start is None:
            start = x
        elif not v and start is not None:
            out.append((start, x))
            start = None
    if start is not None:
        out.append((start, len(row)))
    return out


def measure(path, slug, speeds):
    j = json.load(open(path))
    im = Image.open(os.path.join(os.path.dirname(path), j["meta"]["image"])).convert("RGBA")
    meta = j["meta"]["ageborn"]
    walk = meta["clips"].get("walk")
    if not walk:
        return None
    ppl = meta["pxPerLu"]
    names = j["animations"]["walk"]
    frames = [to_phone(*frame(j, im, n), ppl) for n in names]
    # common canvas aligned on the feet anchor
    L = max(ax for _, ax, _ in frames) + 2
    U = max(ay for _, _, ay in frames) + 2
    R = max(a.shape[1] - ax for a, ax, _ in frames) + 2
    D = max(a.shape[0] - ay for a, _, ay in frames) + 2
    W, H = int(L + R), int(U + D)
    stack, lumas = [], []
    for a, ax, ay in frames:
        c = np.zeros((H, W), np.float32)
        lu = np.zeros((H, W), np.float32)
        x0, y0 = int(round(L - ax)), int(round(U - ay))
        c[y0:y0 + a.shape[0], x0:x0 + a.shape[1]] = a[..., 3]
        lu[y0:y0 + a.shape[0], x0:x0 + a.shape[1]] = a[..., :3] @ np.array([0.299, 0.587, 0.114], np.float32)
        stack.append(c)
        lumas.append(lu)
    gy = int(round(U))     # ground line row
    alpha = [s > 0.5 for s in stack]
    rows = np.where(np.any(np.stack(alpha), axis=(0, 2)))[0]
    top = rows.min() if len(rows) else 0
    height_px = gy - top
    bob_y = []
    for a in alpha:
        # centroid of each frame's own upper 55% (a band fixed on the canvas under-reads the bob
        # of big sprites: the body leaves the band as it drops)
        r = np.where(a.any(axis=1))[0]
        t = r.min() if len(r) else 0
        ys, xs = np.nonzero(a[t:t + int(0.55 * (gy - t))])
        bob_y.append(t + ys.mean() if len(ys) else 0.0)
    bob = float(max(bob_y) - min(bob_y))
    # the sole band: 2 px above each frame's lowest pixel, plus the near/far depth offset (the camera
    # looks down 16 degrees, so a far foot on the ground sits about 3 px higher than a near one)
    band = []
    for a in alpha:
        r = np.where(a.any(axis=1))[0]
        b = r.max() if len(r) else gy
        band.append(a[b - 2 - DEPTH_PX:b + 1].any(axis=0))
    clusters = [runs(b) for b in band]
    apart = sum(1 for c in clusters if len(c) >= 2)
    contact_steps = sorted({c["step"] for c in walk.get("contacts", [])})
    gaps = []
    for k in (contact_steps or range(len(clusters))):
        cl = clusters[k % len(clusters)]
        if len(cl) >= 2:
            gaps.append(max(b[0] - a[1] for a, b in zip(cl, cl[1:])))
    gap = float(max(gaps)) if gaps else 0.0
    nat = walk.get("naturalSpeedLuPerS")
    cyc = walk.get("durationMs") or sum(walk.get("durationsMs", []))
    step = (nat or 0) * cyc / 1000.0 / 2 * PHONE
    card = speeds.get(slug)
    ratio = (nat / (card * MARCH)) if (nat and card) else None
    low = int(top + 0.7 * height_px)
    # changed pixels (section 1 of ANIM_SPEC: alpha or luma > 30): a rolling spoked wheel or a scrolling
    # tread keeps its silhouette, so the silhouette alone under-reads a vehicle's motion
    def changed(i):
        a0, a1 = alpha[i - 1][low:gy + 1], alpha[i][low:gy + 1]
        dl = np.abs(lumas[i][low:gy + 1] - lumas[i - 1][low:gy + 1]) > 30 / 255
        return np.mean((a0 != a1) | (a0 & a1 & dl))
    diffs = [changed(i) for i in range(len(alpha))]
    occ = np.mean([a[low:gy + 1].mean() for a in alpha]) or 1.0
    energy = float(np.mean(diffs) / occ)
    return {"slug": slug, "gait": meta.get("gait"), "height": round(height_px, 1), "step": round(step, 1),
            "speed": round(ratio, 3) if ratio else None, "drift": walk.get("plantedDriftLu"),
            "bob": round(bob, 1), "apart": apart, "frames": len(names), "gap": round(gap, 1),
            "energy": round(energy, 2), "cycleMs": cyc}


def gate(r):
    errs = []
    cls = CLASS_OVERRIDE.get(r["slug"], CLASS_OF_GAIT.get(r["gait"], "G1"))
    lim = LIMITS[cls]
    if r["speed"] is not None and abs(r["speed"] - 1.0) > 0.10:
        errs.append(f"natural speed {r['speed']:.2f}x ground speed (limit +-10%)")
    if r["drift"] is not None and r["drift"] > 1.0:
        errs.append(f"planted drift {r['drift']} lu per frame (limit 1)")
    for k in ("step", "bob", "apart", "gap", "energy"):
        if k in lim and r[k] < lim[k]:
            errs.append(f"{k} {r[k]} < {lim[k]}")
    if r["slug"] in BIG_BEASTS:     # ANIM_SPEC G4: "mammoth >= 5 px" replaces the 3% rule
        if r["bob"] < 5.0:
            errs.append(f"bob {r['bob']} < 5.0 (big beast)")
    elif cls in ("G4", "G5") and r["bob"] < 0.03 * r["height"]:
        errs.append(f"bob {r['bob']} < 3% of height {r['height']}")
    return cls, errs


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--age")
    ap.add_argument("--units")
    ap.add_argument("--all", action="store_true", help="also report sheets made before the standard")
    ap.add_argument("--dir", action="append", help="check the sheets in this folder instead (repeatable)")
    args = ap.parse_args()
    speeds = card_speeds()
    want = set(args.units.split(",")) if args.units else None
    failed = 0
    print(f"{'unit':20s} {'cls':3s} {'h':>5s} {'step':>5s} {'speed':>6s} {'drift':>5s} {'bob':>5s} "
          f"{'apart':>5s} {'gap':>5s} {'energy':>6s}  result")
    dirs = args.dir or [os.path.join(UNITS, a) for a in AGES if not args.age or a == args.age]
    for d in dirs:
        if not os.path.isdir(d):
            continue
        for f in sorted(os.listdir(d)):
            if not f.endswith(".hd.json") or f.endswith(".x.hd.json"):
                continue
            slug = f[:-len(".hd.json")]
            if want and slug not in want:
                continue
            r = measure(os.path.join(d, f), slug, speeds)
            if r is None or (r["gait"] is None and not args.all):
                continue
            cls, errs = gate(r)
            if r["gait"] is None:
                cls, res = "-", "(old sheet) " + "; ".join(errs)
            else:
                res = "ok" if not errs else "FAIL: " + "; ".join(errs)
                failed += bool(errs)
            sp = f"{r['speed']:.2f}" if r["speed"] else "-"
            print(f"{slug:20s} {cls:3s} {r['height']:5.1f} {r['step']:5.1f} {sp:>6s} {str(r['drift']):>5s} "
                  f"{r['bob']:5.1f} {r['apart']:>3d}/{r['frames']:<2d}{r['gap']:5.1f} {r['energy']:6.2f}  {res}")
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
