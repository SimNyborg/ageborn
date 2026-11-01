"""Damage spot and body tracker preview (item 40 P0): draws a unit's bundle data over its shipped frames.

For every unique frame of the chosen clips it composites the HD sheet's frame (team layer tinted, base on top)
and draws the torso box (green), the head point (red cross) and each spot: a mark as a circle of its radius
times its scale (solid when the spot is fully visible, thin when partly, grey dashes when hidden or turned
away), with a tick for its rotation; a strip as a line hanging its length; an emitter as a small triangle.
Numbers under each frame give the spot's visibility. No Blender needed (numpy and Pillow, e.g. the bpy venv).

  .venv-blender/bin/python art/blender/spot_preview.py <slug> [--clips idle,attack] [--entry <slug>.damage.json] --out <png>
      [--scale 1.0] [--team orange]
"""
import argparse
import json
import math
import os
import sys

import numpy as np
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(HERE))
UNITS = os.path.join(REPO, "public", "art", "units")
DAMAGE = os.path.join(REPO, "public", "art", "damage")
TEAM = {"blue": (47, 125, 246), "orange": (242, 138, 30)}
BG = (201, 220, 230, 255)
KIND_COL = {"mark": (40, 30, 30), "strip": (120, 40, 140), "emit": (20, 110, 160)}


def find_sheet(slug):
    for age in sorted(os.listdir(UNITS)):
        if os.path.exists(os.path.join(UNITS, age, f"{slug}.hd.json")):
            return age
    raise SystemExit(f"no installed sheet for {slug}")


def load_frames(age, slug):
    """{frame name: RGBA image at sourceSize} for the HD core and extras sheets, plus the merged clip meta."""
    frames, clips, feet = {}, {}, None
    for stem in (f"{slug}.hd", f"{slug}.x.hd"):
        p = os.path.join(UNITS, age, f"{stem}.json")
        if not os.path.exists(p):
            continue
        with open(p) as fh:
            js = json.load(fh)
        img = Image.open(os.path.join(UNITS, age, js["meta"]["image"])).convert("RGBA")
        for name, f in js["frames"].items():
            fr, ss, src = f["frame"], f["spriteSourceSize"], f["sourceSize"]
            canvas = Image.new("RGBA", (src["w"], src["h"]), (0, 0, 0, 0))
            canvas.paste(img.crop((fr["x"], fr["y"], fr["x"] + fr["w"], fr["y"] + fr["h"])), (ss["x"], ss["y"]))
            frames[name] = canvas
        m = js["meta"]["ageborn"]
        for k, v in m["clips"].items():
            clips.setdefault(k, v)
        feet = feet or m["feetPx"]
        k_px = m["pxPerLu"]
        anims = js["animations"]
        for k in m["clips"]:
            clips[k]["_names"] = anims.get(k)
            clips[k]["_team"] = anims.get(f"{k}_team")
    return frames, clips, feet, k_px


def composite(frames, base, team, tint):
    """What the game draws: the team layer tinted with the team colour, the base frame on top."""
    out = Image.new("RGBA", frames[base].size, BG)
    if team and team in frames:
        t = np.asarray(frames[team]).astype(np.float32)
        t[..., :3] *= np.array(tint, np.float32) / 255.0
        out.alpha_composite(Image.fromarray(t.clip(0, 255).astype(np.uint8), "RGBA"))
    out.alpha_composite(frames[base])
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("slug")
    ap.add_argument("--clips", default=None, help="comma-separated (default: every clip)")
    ap.add_argument("--entry", help="a render's <slug>.damage.json (default: the age bundle's entry)")
    ap.add_argument("--out", required=True)
    ap.add_argument("--scale", type=float, default=1.0)
    ap.add_argument("--team", default="orange", choices=sorted(TEAM))
    args = ap.parse_args()
    age = find_sheet(args.slug)
    if args.entry:
        with open(args.entry) as fh:
            entry = json.load(fh)
    else:
        with open(os.path.join(DAMAGE, f"{age}.json")) as fh:
            entry = json.load(fh)["units"].get(args.slug)
        if entry is None:
            raise SystemExit(f"{args.slug} has no entry in public/art/damage/{age}.json")
    frames, clips, feet, k = load_frames(age, args.slug)
    names = args.clips.split(",") if args.clips else list(entry["torso"])
    spots = {s["id"]: s for s in entry.get("spots", [])}
    tiles, labels = [], []
    for clip in names:
        meta = clips[clip]
        seen = set()
        for step, idx in enumerate(meta["sequence"]):
            if idx in seen:
                continue
            seen.add(idx)
            base = meta["_names"][step]
            team = meta["_team"][step] if meta.get("_team") else None
            im = composite(frames, base, team, TEAM[args.team])
            d = ImageDraw.Draw(im)
            P = lambda x, y: (feet[0] + x * k, feet[1] - y * k)
            x0, y0, x1, y1 = entry["torso"][clip][idx]
            a, b = P(x0, y1), P(x1, y0)
            d.rectangle([a, b], outline=(0, 160, 60, 255), width=2)
            hx, hy = P(*entry["head"][clip][idx])
            d.line([(hx - 6, hy), (hx + 6, hy)], fill=(220, 20, 20, 255), width=2)
            d.line([(hx, hy - 6), (hx, hy + 6)], fill=(220, 20, 20, 255), width=2)
            vis_txt = []
            for sid, frs in entry.get("clips", {}).get(clip, {}).items():
                s = spots[sid]
                x, y, rot, sc, vis = frs[idx]
                cx, cy = P(x, y)
                col = KIND_COL[s["kind"]] + (255,)
                if vis == 0:
                    col = (150, 150, 150, 255)
                if s["kind"] == "mark":
                    r = s["r"] * sc / 100.0 * k
                    w = 3 if vis >= 80 else 1
                    d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=col, width=w)
                    t = math.radians(rot)
                    d.line([(cx, cy), (cx + math.cos(t) * r, cy - math.sin(t) * r)], fill=col, width=w)
                elif s["kind"] == "strip":
                    d.line([(cx, cy), (cx, cy + s["r"] * k)], fill=col, width=3)
                    d.ellipse([cx - 3, cy - 3, cx + 3, cy + 3], fill=col)
                else:
                    r = max(4, s["r"] * k * 0.5)
                    d.polygon([(cx, cy - r), (cx - r, cy + r), (cx + r, cy + r)], outline=col, width=2)
                vis_txt.append(f"{sid[:6]}:{vis}")
            tiles.append(im)
            labels.append(f"{clip}[{idx}] " + " ".join(vis_txt))
    if not tiles:
        raise SystemExit("nothing to draw")
    cols = 6
    w, h = tiles[0].size
    lab = 14
    rows = (len(tiles) + cols - 1) // cols
    sheet = Image.new("RGBA", (w * cols, (h + lab) * rows), (255, 255, 255, 255))
    d = ImageDraw.Draw(sheet)
    for n, (im, t) in enumerate(zip(tiles, labels)):
        x, y = (n % cols) * w, (n // cols) * (h + lab)
        sheet.paste(im, (x, y))
        d.text((x + 3, y + h + 1), t[:70], fill=(0, 0, 0, 255))
    if args.scale != 1.0:
        sheet = sheet.resize((round(sheet.size[0] * args.scale), round(sheet.size[1] * args.scale)), Image.Resampling.LANCZOS)
    sheet.convert("RGB").save(args.out)
    print(args.out, len(tiles), "frames")


if __name__ == "__main__":
    sys.exit(main())
