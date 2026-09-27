"""Sprite sheet packing and previews (Pillow + numpy; no Blender needed).

Atlas format: the PixiJS Spritesheet JSON (hash of frames, `animations`, `meta.scale`).
Each frame is trimmed to its alpha bounds and keeps its full `sourceSize`, so base and
team frames line up and `anchor` (the feet) is the same for every frame.

Team layer: frame `<slug>_<clip>_<nn>_team` is a greyscale render of the team-coloured
surfaces only. The game draws it tinted with the team colour UNDER the base frame, whose
team surfaces are holes (plus a faint white highlight). See materials.py and README.md.
"""
import json
import os

import numpy as np
from PIL import Image

from .colors import hex_to_rgb

PAD = 2  # transparent gutter around each packed frame (linear filtering, mipmaps)


def load(path):
    return np.asarray(Image.open(path).convert("RGBA"), dtype=np.float32) / 255.0


def composite(base, team, tint_hex):
    """Straight-alpha RGBA: tinted team layer underneath, base frame over it."""
    if team is None:
        return base.copy()
    tint = np.array(hex_to_rgb(tint_hex), dtype=np.float32)
    ta = team[..., 3:4]
    tp = team[..., :3] * tint * ta
    ba = base[..., 3:4]
    bp = base[..., :3] * ba
    out_a = ba + ta * (1 - ba)
    out_p = bp + tp * (1 - ba)
    rgb = np.where(out_a > 1e-6, out_p / np.maximum(out_a, 1e-6), 0)
    return np.concatenate([rgb, out_a], axis=-1)


def colour_rule(clip_frames):
    """DESIGN A11 colour rule: non-team pixels may not sit within +-35 deg of a team hue
    (bands 350-81 and 182-254 deg) at HSV saturation > 40% for more than 10% of the
    silhouette. Returns the worst frame's percentage. Base frames hold only non-team
    pixels (team surfaces are holes), so they are measured directly."""
    worst = (0.0, None)
    for clip, frames in clip_frames.items():
        for i, (bp, tp) in enumerate(frames):
            base = load(bp)
            sil = base[..., 3] > 0.5
            if tp:
                sil |= load(tp)[..., 3] > 0.5
            opaque = base[..., 3] > 0.5
            rgb = base[..., :3]
            mx, mn = rgb.max(-1), rgb.min(-1)
            sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0)
            d = np.maximum(mx - mn, 1e-6)
            r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
            hue = np.where(mx == r, ((g - b) / d) % 6, np.where(mx == g, (b - r) / d + 2, (r - g) / d + 4)) * 60
            band = (hue >= 350) | (hue <= 81) | ((hue >= 182) & (hue <= 254))
            bad = opaque & band & (sat > 0.40)
            pct = 100.0 * bad.sum() / max(1, sil.sum())
            if pct > worst[0]:
                worst = (pct, f"{clip}_{i:02d}")
    return {"worstPct": round(worst[0], 2), "worstFrame": worst[1], "limitPct": 10.0}


def to_image(arr):
    return Image.fromarray(np.clip(arr * 255 + 0.5, 0, 255).astype(np.uint8), "RGBA")


def bbox(img):
    a = np.asarray(img)[..., 3]
    ys, xs = np.nonzero(a > 0)
    if len(xs) == 0:
        return (0, 0, 1, 1)
    return (int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1)


def _shelf_pack(sizes, width):
    x = y = shelf_h = 0
    pos = [None] * len(sizes)
    order = sorted(range(len(sizes)), key=lambda i: (-sizes[i][1], -sizes[i][0]))
    for i in order:
        w, h = sizes[i][0] + PAD * 2, sizes[i][1] + PAD * 2
        if x + w > width:
            x, y, shelf_h = 0, y + shelf_h, 0
        pos[i] = (x + PAD, y + PAD)
        x += w
        shelf_h = max(shelf_h, h)
    return pos, y + shelf_h


def pack(images):
    """Shelf-pack trimmed images; picks the width with the smallest area."""
    sizes = [im.size for im in images]
    best = None
    for width in (256, 384, 512, 640, 768, 896, 1024, 1280, 1536, 2048):
        if max(s[0] for s in sizes) + PAD * 2 > width:
            continue
        pos, height = _shelf_pack(sizes, width)
        height = (height + 3) // 4 * 4
        # prefer squarish sheets: tall strips waste mobile texture limits
        area = width * height * (1.0 + 0.25 * max(0.0, height / width - 1.5))
        if height <= 4096 and (best is None or area < best[0]):
            best = (area, width, height, pos)
    _, width, height, pos = best
    sheet = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    for im, p in zip(images, pos):
        sheet.paste(im, p)
    return sheet, pos


def build_atlas(slug, clip_frames, clip_meta, extra_meta, out_dir, scale):
    """clip_frames: {clip: [(base_path, team_path|None)]}. Writes <slug>.png/.json/.webp."""
    names, images, trims, source = [], [], [], None
    animations = {}
    for clip, frames in clip_frames.items():
        animations[clip], animations[f"{clip}_team"] = [], []
        for i, (bp, tp) in enumerate(frames):
            for path, suffix in ((bp, ""), (tp, "_team")):
                name = f"{slug}_{clip}_{i:02d}{suffix}"
                if path is None:  # no team surface visible: an empty 1x1 frame keeps indices aligned
                    im = Image.new("RGBA", (1, 1), (0, 0, 0, 0))
                    box = (0, 0, 1, 1)
                else:
                    full = Image.open(path).convert("RGBA")
                    source = full.size
                    box = bbox(full)
                    im = full.crop(box)
                names.append(name)
                images.append(im)
                trims.append(box)
                animations[f"{clip}{suffix}"].append(name)
    sheet, pos = pack(images)
    feet = extra_meta["feetPx"]
    frames = {}
    for name, im, box, p in zip(names, images, trims, pos):
        w, h = im.size
        frames[name] = {
            "frame": {"x": p[0], "y": p[1], "w": w, "h": h},
            "rotated": False,
            "trimmed": True,
            "spriteSourceSize": {"x": box[0], "y": box[1], "w": w, "h": h},
            "sourceSize": {"w": source[0], "h": source[1]},
            "anchor": {"x": round(feet[0] / source[0], 5), "y": round(feet[1] / source[1], 5)},
        }
    # Shipping image: 256-colour palette PNG (toon shading has few distinct colours, so this
    # is ~4-5x smaller than RGBA with no visible loss at game size). The RGBA master and
    # WebP variants are written alongside for comparison.
    sheet.save(os.path.join(out_dir, f"{slug}.rgba.png"), optimize=True)
    pal = sheet.quantize(256, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE)
    pal.save(os.path.join(out_dir, f"{slug}.png"), optimize=True)
    sheet.save(os.path.join(out_dir, f"{slug}.webp"), lossless=True, quality=100, method=6)
    sheet.save(os.path.join(out_dir, f"{slug}.q90.webp"), quality=90, method=6, alpha_quality=90)
    atlas = {
        "frames": frames,
        "animations": animations,
        "meta": {
            "app": "ageborn art/blender pipeline",
            "version": "1",
            "image": f"{slug}.png",
            "format": "RGBA8888",
            "size": {"w": sheet.size[0], "h": sheet.size[1]},
            "scale": f"{scale:g}",
            "ageborn": dict(extra_meta, clips=clip_meta, team={
                "mode": "tint-underlay",
                "frameSuffix": "_team",
                "howTo": "draw <frame>_team tinted with the team colour, then <frame> on top",
            }),
        },
    }
    with open(os.path.join(out_dir, f"{slug}.json"), "w") as fh:
        json.dump(atlas, fh, indent=1)
    return sheet.size


def team_breakdown(slug, base_path, team_path, out_dir, tints, bg_hex):
    """One frame shown as: base frame (team surfaces are holes), grey team layer, and the
    composite in every team colour/preset. Explains the tint-underlay scheme at a glance."""
    base, team = load(base_path), load(team_path)
    tiles = [to_image(base), to_image(team)] + [to_image(composite(base, team, t)) for t in tints]
    w, h = tiles[0].size
    bg = tuple(int(c * 255) for c in hex_to_rgb(bg_hex)) + (255,)
    out = Image.new("RGBA", (w * len(tiles), h), bg)
    for i, t in enumerate(tiles):
        out.alpha_composite(t, (i * w, 0))
    out.convert("RGB").save(os.path.join(out_dir, f"{slug}_team_layer.png"))


def previews(slug, clip_frames, clip_meta, out_dir, render_scale, bg_hex, tints):
    """Animated GIFs at in-game size (1x) and 3x, per clip, on a flat background, plus a
    contact sheet of every frame in two team colours."""
    bg = tuple(int(c * 255) for c in hex_to_rgb(bg_hex))
    comps = {}
    for clip, frames in clip_frames.items():
        comps[clip] = {t: [] for t in tints}
        for bp, tp in frames:
            base = load(bp)
            team = load(tp) if tp else None
            for t in tints:
                comps[clip][t].append(to_image(composite(base, team, tints[t])))
    # common crop box over all frames so every GIF shares the frame
    boxes = [bbox(im) for c in comps.values() for im in c[list(tints)[0]]]
    x0 = max(0, min(b[0] for b in boxes) - 6)
    y0 = max(0, min(b[1] for b in boxes) - 6)
    x1 = max(b[2] for b in boxes) + 6
    y1 = max(b[3] for b in boxes) + 6
    first = list(tints)[0]
    for clip, per_tint in comps.items():
        dur = round(1000 / clip_meta[clip]["fps"])
        for label, factor in (("1x", 1.0 / render_scale), ("3x", 3.0 / render_scale)):
            gif_frames = []
            for im in per_tint[first]:
                crop = im.crop((x0, y0, x1, y1))
                size = (max(1, round(crop.size[0] * factor)), max(1, round(crop.size[1] * factor)))
                # Downscale with a box filter (what a mipmapped/linear GPU sampler approximates);
                # upscale the 2x render for the 3x view.
                crop = crop.resize(size, Image.Resampling.BOX if factor < 1 else Image.Resampling.LANCZOS)
                canvas = Image.new("RGBA", size, bg + (255,))
                canvas.alpha_composite(crop)
                gif_frames.append(canvas.convert("RGB"))
            gif_frames[0].save(os.path.join(out_dir, f"{slug}_{clip}_{label}.gif"), save_all=True,
                               append_images=gif_frames[1:], duration=dur,
                               loop=0, disposal=1, optimize=False)
    # contact sheet
    cw, ch = x1 - x0, y1 - y0
    cols = max(len(v[first]) for v in comps.values())
    rows = [(clip, t) for clip in comps for t in tints]
    sheet = Image.new("RGBA", (cols * cw, len(rows) * ch), bg + (255,))
    for r, (clip, t) in enumerate(rows):
        for c, im in enumerate(comps[clip][t]):
            sheet.alpha_composite(im.crop((x0, y0, x1, y1)), (c * cw, r * ch))
    sheet.convert("RGB").save(os.path.join(out_dir, f"{slug}_contact.png"))
    return comps, (x0, y0, x1, y1)
