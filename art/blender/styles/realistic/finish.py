"""Post-process a rendered unit: layers at 3x/2x/1x, sprite sheets, GIFs, contact sheet, stats."""
import colorsys
import json
import os
import pickle

import numpy as np
from PIL import Image

from lib import pipe

TEAMS = {"blue": "#2F7DF6", "orange": "#F28A1E"}


def load_all(unit, r):
    tmp = r["tmp"]
    lref = pipe.lref_for(tmp, r["jobs"])
    frames = {}
    for c, i in r["jobs"]:
        L = pipe.load_layers(tmp, c, i)
        tm, bs, ob = pipe.build_layers(L, lref, r["fx"].get((c, i)), r["feet_px"])
        for s in (1, 2, 3):
            frames[(c, i, s)] = pipe.finish(tm, bs, ob, s, sharpen=0.25 if s == 1 else 0.0)
    return frames, lref


def colour_rule(team, base, obj):
    """Share of the object silhouette where non-team pixels are saturated team hues (A11)."""
    a = base[..., 3]
    sel = (obj > 0.5) & (team[..., 3] < 0.3) & (a > 0.5)
    rgb = base[..., :3][sel] / np.maximum(a[sel][:, None], 1e-4)
    if len(rgb) == 0:
        return 0.0
    mx, mn = rgb.max(1), rgb.min(1)
    sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0)
    hsv = np.array([colorsys.rgb_to_hsv(*p)[0] * 360 for p in rgb[sat > 0.4]]) if (sat > 0.4).any() else np.array([])
    bad = ((hsv >= 350) | (hsv <= 81) | ((hsv >= 182) & (hsv <= 254))).sum() if len(hsv) else 0
    return float(bad) / max(1, (obj > 0.5).sum())


def unit_outputs(unit, r, out):
    os.makedirs(out, exist_ok=True)
    frames, lref = load_all(unit, r)
    slug = unit.SLUG
    fx, fy = r["feet_px"]
    stats = {"slug": slug, "renderSeconds": round(r["secs"], 1), "frames": len(r["jobs"]),
             "lref": lref, "clips": {}}
    # --- sheets at 2x (hd) and 1x
    for s, tag in ((2, ".hd"), (1, "")):
        items = []
        for c, i in r["jobs"]:
            tm, bs, _ = frames[(c, i, s)]
            anc = (fx * s / 3, fy * s / 3)
            items.append((f"{c}_{i:02d}", pipe.to_img(bs), anc))
            items.append((f"{c}_{i:02d}_team", pipe.to_img(tm), anc))
        sheet, meta = pipe.pack(items, max_w=2048 if s == 2 else 1024)
        png = os.path.join(out, f"{slug}{tag}.png")
        sheet.save(png, optimize=True)
        p8 = os.path.join(out, f"{slug}{tag}.png8.png")
        n8 = pipe.save_png8(sheet, p8)
        anims = {}
        clipmeta = {}
        for clip in r["clips"]:
            n = len(clip.times)
            anims[clip.name] = [f"{clip.name}_{i:02d}" for i in range(n)]
            anims[clip.name + "_team"] = [f"{clip.name}_{i:02d}_team" for i in range(n)]
            clipmeta[clip.name] = {"frames": n, "durationsMs": clip.durations, "loop": clip.loop,
                                   "impactAt": (sum(clip.durations[:clip.impact]) / sum(clip.durations)
                                                if clip.impact is not None else None)}
        js = {"frames": meta, "animations": anims,
              "meta": {"image": os.path.basename(png), "size": {"w": sheet.width, "h": sheet.height},
                       "scale": s, "ageborn": {"visualId": "unit." + slug, "style": "realistic",
                                               "pxPerLu": 0.9 * s, "clips": clipmeta}}}
        with open(os.path.join(out, f"{slug}{tag}.json"), "w") as f:
            json.dump(js, f, indent=1)
        stats["sheet" + tag] = {"w": sheet.width, "h": sheet.height,
                                "rgbaKB": round(os.path.getsize(png) / 1024),
                                "png8KB": round(n8 / 1024)}
    # --- GIFs per clip at 1x and 3x, blue; and a contact sheet with both teams
    for clip in r["clips"]:
        for s in (1, 3):
            ims = []
            for i in range(len(clip.times)):
                tm, bs, _ = frames[(clip.name, i, s)]
                h, w = bs.shape[:2]
                bg = pipe.preview_bg(w, h, fy * s / 3)
                ims.append(pipe.to_rgb(pipe.composite(tm, bs, TEAMS["blue"], bg)))
            pal = [im.quantize(colors=255, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.FLOYDSTEINBERG) for im in ims]
            pal[0].save(os.path.join(out, f"{slug}_{clip.name}_{s}x.gif"), save_all=True,
                        append_images=pal[1:], duration=clip.durations, loop=0, disposal=1)
        cov = []
        rule = []
        for i in range(len(clip.times)):
            tm, bs, ob = frames[(clip.name, i, 3)]
            o = (ob > 0.5).sum()
            cov.append(float(tm[..., 3].sum() / max(1, ob.sum())))
            rule.append(colour_rule(tm, bs, ob))
        stats["clips"][clip.name] = {"teamCoverageMin": round(min(cov), 3),
                                     "colourRuleMax": round(max(rule), 4)}
    # contact sheet (2x): rows per clip, blue then orange
    rows = []
    for clip in r["clips"]:
        for team in ("blue", "orange"):
            row = []
            for i in range(len(clip.times)):
                tm, bs, _ = frames[(clip.name, i, 2)]
                h, w = bs.shape[:2]
                row.append(pipe.composite(tm, bs, TEAMS[team], pipe.preview_bg(w, h, fy * 2 / 3)))
            rows.append(np.hstack(row))
    W = max(x.shape[1] for x in rows)
    rows = [np.pad(x, ((0, 0), (0, W - x.shape[1]), (0, 0)), constant_values=0.16) for x in rows]
    pipe.to_rgb(np.vstack(rows)).save(os.path.join(out, f"{slug}_contact.png"))
    with open(os.path.join(out, f"{slug}.stats.json"), "w") as f:
        json.dump(stats, f, indent=1)
    # cache the finished layers for the mockup and the style sheet
    with open(os.path.join(out, "_frames", f"{slug}.layers.pkl"), "wb") as f:
        pickle.dump({"feet_px": r["feet_px"], "size": r["size"],
                     "clips": {c.name: {"durations": c.durations, "n": len(c.times), "loop": c.loop}
                               for c in r["clips"]},
                     "frames": {f"{c}|{i}|{s}": (tm.astype(np.float16), bs.astype(np.float16))
                                for (c, i, s), (tm, bs, ob) in frames.items() if s in (1, 2, 3)}}, f)
    print(json.dumps(stats, indent=1))
    return stats
