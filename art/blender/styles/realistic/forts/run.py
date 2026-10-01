"""Render the fort sheets (DESIGN A16.14.8) with the realistic pipeline and install them.

Run from the repository root with the bpy venv (Python 3.11, bpy 5.0.1, Cycles CPU, 2 threads):

  PY=<venv>/bin/python
  F=art/blender/styles/realistic/forts/run.py
  $PY $F preview palisade body:0 body:2 flag:0 --out /tmp/forts       # look-dev strip
  $PY $F render palisade --out /tmp/forts [--install]                 # one fort
  $PY $F render stone --out /tmp/forts --parallel 2 --install         # an age (or 'all')
  $PY $F install palisade,sling_perch --out /tmp/forts                # copy finished sheets
  $PY $F sheet stone --out /tmp/forts                                 # review sheet of an age's forts

Installs `public/art/forts/<age>/<slug>(.hd).png/.json` and the card still
`public/art/forts/<age>/<slug>.portrait.png` + `<slug>.portrait_team.png` (towers with a crew get the
crew's idle frame composited on the platform).
"""
import argparse
import glob
import importlib.util
import json
import os
import shutil
import subprocess
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
REAL = os.path.dirname(HERE)
sys.path.insert(0, REAL)
sys.path.insert(0, HERE)
REPO = os.path.abspath(os.path.join(REAL, "..", "..", "..", ".."))
AGES = ["stone", "bronze", "medieval", "gunpowder", "industrial", "modern", "future", "cosmic"]


def _load(path, name):
    spec = importlib.util.spec_from_file_location(name, path)
    m = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m)
    return m


def age_forts(age):
    p = os.path.join(HERE, age + ".py")
    if not os.path.exists(p):
        return []
    return list(_load(p, "forts_" + age).FORTS)


def find(slug):
    for age in AGES:
        for f in age_forts(age):
            if f.SLUG == slug:
                return f
    raise SystemExit(f"no fort {slug}")


def dst_dir(age):
    return os.path.join(REPO, "public", "art", "forts", age)


def install(u, out):
    d = dst_dir(u.AGE)
    os.makedirs(d, exist_ok=True)
    for ext in (".png", ".json", ".hd.png", ".hd.json"):
        shutil.copyfile(os.path.join(out, u.FILE + ext), os.path.join(d, u.FILE + ext))
    portrait(u, out)
    print(f"installed {u.FILE} -> {d}", flush=True)


def _crew_frame(age, slug):
    """The first idle frame of a unit's hd sheet (base, team) as float arrays, and its anchor px."""
    import numpy as np
    from PIL import Image
    base = os.path.join(REPO, "public", "art", "units", age, slug)
    js = json.load(open(base + ".hd.json"))
    img = Image.open(base + ".hd.png").convert("RGBA")
    out = []
    for name in (f"{slug}_idle_00", f"{slug}_idle_00_team"):
        fr = js["frames"][name]
        r = fr["frame"]
        crop = img.crop((r["x"], r["y"], r["x"] + r["w"], r["y"] + r["h"]))
        full = Image.new("RGBA", (fr["sourceSize"]["w"], fr["sourceSize"]["h"]), (0, 0, 0, 0))
        full.paste(crop, (fr["spriteSourceSize"]["x"], fr["spriteSourceSize"]["y"]))
        out.append(np.asarray(full, np.float32) / 255.0)
        anc = (fr["anchor"]["x"] * fr["sourceSize"]["w"], fr["anchor"]["y"] * fr["sourceSize"]["h"])
    return out[0], out[1], anc, js["meta"]["ageborn"]["pxPerLu"]


def portrait(u, out, size=256):
    """Card still: the intact body (stage 0) + flag, the crew on towers, padded to a square."""
    import numpy as np
    from PIL import Image
    js = json.load(open(os.path.join(out, u.FILE + ".hd.json")))
    img = Image.open(os.path.join(out, u.FILE + ".hd.png")).convert("RGBA")
    meta = js["meta"]["ageborn"]
    px = meta["pxPerLu"]

    def frame(name):
        fr = js["frames"][name]
        r = fr["frame"]
        crop = img.crop((r["x"], r["y"], r["x"] + r["w"], r["y"] + r["h"]))
        full = Image.new("RGBA", (fr["sourceSize"]["w"], fr["sourceSize"]["h"]), (0, 0, 0, 0))
        full.paste(crop, (fr["spriteSourceSize"]["x"], fr["spriteSourceSize"]["y"]))
        return np.asarray(full, np.float32) / 255.0, (fr["anchor"]["x"] * fr["sourceSize"]["w"], fr["anchor"]["y"] * fr["sourceSize"]["h"])

    first = "trap" if u.FORT_KIND == "trap" else "body"
    idx = 1 if first == "trap" else 0
    base, anc = frame(f"{u.FILE}_{first}_{idx:02d}")
    team, _ = frame(f"{u.FILE}_{first}_{idx:02d}_team")
    H, W = base.shape[:2]

    def over(dst, src, ox, oy):
        """Composite src (straight alpha) over dst at offset (ox, oy)."""
        h, w = src.shape[:2]
        x0, y0 = max(0, ox), max(0, oy)
        x1, y1 = min(dst.shape[1], ox + w), min(dst.shape[0], oy + h)
        if x1 <= x0 or y1 <= y0:
            return
        s = src[y0 - oy:y1 - oy, x0 - ox:x1 - ox]
        d = dst[y0:y1, x0:x1]
        a = s[..., 3:4]
        rgb = s[..., :3] * a + d[..., :3] * d[..., 3:4] * (1 - a)
        al = a + d[..., 3:4] * (1 - a)
        d[..., :3] = np.where(al > 1e-4, rgb / np.maximum(al, 1e-4), 0)
        d[..., 3:4] = al

    pad = 160
    canvas = np.zeros((H + 2 * pad, W + 2 * pad, 4), np.float32)
    tcanvas = np.zeros_like(canvas)
    if "flag" in js["animations"]:
        fb, _ = frame(f"{u.FILE}_flag_00")
        ft, _ = frame(f"{u.FILE}_flag_00_team")
        over(tcanvas, ft, pad, pad)
        over(canvas, fb, pad, pad)
    over(tcanvas, team, pad, pad)
    over(canvas, base, pad, pad)
    crew = meta.get("crew")
    if crew:
        age = meta["age"]
        slug = crew["visualId"].split(".", 1)[1]
        cb, ct, canc, cpx = _crew_frame(age, slug)
        k = crew["scale"] * px / cpx
        cw, ch = max(1, round(cb.shape[1] * k)), max(1, round(cb.shape[0] * k))

        def rs(a):
            pm = a.copy()
            pm[..., :3] *= pm[..., 3:4]
            ch_ = [np.asarray(Image.fromarray(pm[..., i]).resize((cw, ch), Image.LANCZOS)) for i in range(4)]
            o = np.clip(np.stack(ch_, -1), 0, 1)
            al = o[..., 3:4]
            o[..., :3] = np.where(al > 1e-4, o[..., :3] / np.maximum(al, 1e-4), 0)
            return o
        cb, ct = rs(cb), rs(ct)
        fx, fy = pad + anc[0] + crew["x"] * px, pad + anc[1] - crew["y"] * px
        ox, oy = round(fx - canc[0] * k), round(fy - canc[1] * k)
        over(tcanvas, ct, ox, oy)
        over(canvas, cb, ox, oy)
    a = np.maximum(canvas[..., 3], tcanvas[..., 3])
    ys, xs = np.nonzero(a > 0.05)
    x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
    side = max(x1 - x0, y1 - y0)
    side = int(side * 1.08)
    sx0, sy0 = int((x0 + x1) / 2 - side / 2), int((y0 + y1) / 2 - side / 2)

    def square(arr):
        out = np.zeros((side, side, 4), np.float32)
        over(out, arr, -sx0, -sy0)
        pm = out.copy()
        pm[..., :3] *= pm[..., 3:4]
        ch_ = [np.asarray(Image.fromarray(pm[..., i]).resize((size, size), Image.LANCZOS)) for i in range(4)]
        o = np.clip(np.stack(ch_, -1), 0, 1)
        al = o[..., 3:4]
        o[..., :3] = np.where(al > 1e-4, o[..., :3] / np.maximum(al, 1e-4), 0)
        return o
    d = dst_dir(u.AGE)
    os.makedirs(d, exist_ok=True)
    for arr, suffix in ((square(canvas), ".portrait.png"), (square(tcanvas), ".portrait_team.png")):
        im = Image.fromarray((np.clip(arr, 0, 1) * 255 + 0.5).astype(np.uint8), "RGBA")
        im.quantize(256, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE).save(os.path.join(d, u.FILE + suffix), optimize=True)


def review_sheet(age, out):
    """All forts of an age: every frame composited in blue and orange on a lane-coloured strip."""
    import numpy as np
    from PIL import Image
    from lib import pipe
    rows = []
    for u in age_forts(age):
        p = os.path.join(out, u.FILE + ".hd.json")
        if not os.path.exists(p):
            continue
        js = json.load(open(p))
        img = Image.open(os.path.join(out, u.FILE + ".hd.png")).convert("RGBA")
        for team in ("#2F7DF6", "#F28A1E"):
            cells = []
            for clip, names in js["animations"].items():
                if clip.endswith("_team"):
                    continue
                seen = []
                for n in names:
                    if n in seen:
                        continue
                    seen.append(n)
                    fr = js["frames"][n]
                    tf = js["frames"][n + "_team"]
                    W, H = fr["sourceSize"]["w"], fr["sourceSize"]["h"]
                    b = np.zeros((H, W, 4), np.float32)
                    t = np.zeros((H, W, 4), np.float32)
                    for src, dst in ((fr, b), (tf, t)):
                        r = src["frame"]
                        crop = np.asarray(img.crop((r["x"], r["y"], r["x"] + r["w"], r["y"] + r["h"])), np.float32) / 255.0
                        ox, oy = src["spriteSourceSize"]["x"], src["spriteSourceSize"]["y"]
                        dst[oy:oy + r["h"], ox:ox + r["w"]] = crop
                    bp = np.dstack([b[..., :3] * b[..., 3:4], b[..., 3]])
                    tp = np.dstack([t[..., :3] * t[..., 3:4], t[..., 3]])
                    fy = fr["anchor"]["y"] * H
                    cells.append(pipe.composite(tp, bp, team, pipe.preview_bg(W, H, fy)))
            h = max(c.shape[0] for c in cells)
            cells = [np.pad(c, ((h - c.shape[0], 0), (0, 4), (0, 0)), constant_values=0.16) for c in cells]
            rows.append(np.hstack(cells))
    if not rows:
        return None
    Wm = max(r.shape[1] for r in rows)
    rows = [np.pad(r, ((0, 4), (0, Wm - r.shape[1]), (0, 0)), constant_values=0.16) for r in rows]
    png = os.path.join(out, f"forts_{age}_review.png")
    pipe.to_rgb(np.vstack(rows)).save(png)
    return png


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("cmd")
    ap.add_argument("target")
    ap.add_argument("frames", nargs="*")
    ap.add_argument("--out", default="/tmp/ageborn-forts")
    ap.add_argument("--samples", type=int, default=14)
    ap.add_argument("--install", action="store_true")
    ap.add_argument("--parallel", type=int, default=2)
    a = ap.parse_args()
    from lib import game as G

    if a.cmd == "preview":
        u = find(a.target)
        jobs = {(f.split(":")[0], int(f.split(":")[1])) for f in a.frames} if a.frames else None
        look = os.path.join(a.out, "_look")
        r = G.render(u, look, samples=a.samples, only=jobs)
        png = os.path.join(look, f"{u.FILE}_strip.png")
        G.strip(u, r, png)
        print("wrote", png)
    elif a.cmd == "render" and a.target not in AGES and a.target != "all":
        u = find(a.target)
        r = G.render(u, a.out, samples=getattr(u, "SAMPLES", a.samples))
        G.write_outputs(u, r, a.out, previews=False)
        if a.install:
            install(u, a.out)
    elif a.cmd == "render":
        ages = AGES if a.target == "all" else [a.target]
        todo = [u.SLUG for age in ages for u in age_forts(age)]
        if a.frames:
            todo = [s for s in todo if s in a.frames]
        os.makedirs(os.path.join(a.out, "_logs"), exist_ok=True)
        running = []
        t0 = time.time()
        while todo or running:
            while todo and len(running) < a.parallel:
                slug = todo.pop(0)
                log = open(os.path.join(a.out, "_logs", slug + ".log"), "w")
                cmd = [sys.executable, __file__, "render", slug, "--out", a.out, "--samples", str(a.samples)]
                if a.install:
                    cmd.append("--install")
                running.append((slug, subprocess.Popen(cmd, stdout=log, stderr=subprocess.STDOUT), time.time()))
                print(f"start {slug}", flush=True)
            for item in list(running):
                slug, p, ts = item
                if p.poll() is not None:
                    running.remove(item)
                    print(f"done  {slug} rc={p.returncode} in {time.time() - ts:.0f}s", flush=True)
            time.sleep(2)
        print(f"{a.target}: done in {time.time() - t0:.0f}s", flush=True)
        for age in ages:
            png = review_sheet(age, a.out)
            if png:
                print("review", png)
    elif a.cmd == "install":
        for slug in a.target.split(","):
            install(find(slug), a.out)
    elif a.cmd == "sheet":
        print(review_sheet(a.target, a.out))
    else:
        raise SystemExit(f"unknown command {a.cmd}")


if __name__ == "__main__":
    main()
