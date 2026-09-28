"""Frame post-processing, sprite sheet packing and previews (Pillow + numpy; no Blender).

Outer outline (`outline`): after rendering, the combined silhouette of the base and team
frames is widened by 3 px at 1x (6 px at 2x) with an antialiased disk. Each new pixel takes
the nearest fill colour (propagated from a few pixels inside the silhouette, so interior
lines do not darken it further) x 0.40, capped at HSV value 0.38. Outline pixels next to
team surfaces go into the team frame as grey 0.40 instead, so the tint still gives the
exact team colour. This is the line that keeps units readable at 56 px.

Atlas format: the PixiJS Spritesheet JSON (hash of frames, `animations`, `meta.scale`).
Each frame is trimmed to its alpha bounds and keeps its full `sourceSize`, so base and
team frames line up and `anchor` (the feet) is the same for every frame. `animations`
list frames in playback order (holds and ping-pong repeat names); per-step durations are
in `meta.ageborn.clips.<clip>.durationsMs` (Pixi AnimatedSprite takes {texture, time}).

Team layer: frame `<slug>_<clip>_<nn>_team` is a greyscale render of the team-coloured
surfaces only. The game draws it tinted with the team colour UNDER the base frame, whose
team surfaces are holes (plus a faint white highlight). See materials.py and README.md.
"""
import json
import math
import os

import numpy as np
from PIL import Image

from .colors import hex_to_rgb

PAD = 2  # transparent gutter around each packed frame (linear filtering, mipmaps)


def load(path):
    return np.asarray(Image.open(path).convert("RGBA"), dtype=np.float32) / 255.0


def save(arr, path):
    to_image(arr).save(path)


def to_image(arr):
    return Image.fromarray(np.clip(arr * 255 + 0.5, 0, 255).astype(np.uint8), "RGBA")


def over(top, bottom):
    """Straight-alpha 'top over bottom'."""
    ta, ba = top[..., 3:4], bottom[..., 3:4]
    a = ta + ba * (1 - ta)
    p = top[..., :3] * ta + bottom[..., :3] * ba * (1 - ta)
    rgb = np.where(a > 1e-6, p / np.maximum(a, 1e-6), 0)
    return np.concatenate([rgb, a], axis=-1)


def composite(base, team, tint_hex):
    """Tinted team layer underneath, base frame over it (what the game draws)."""
    if team is None:
        return base.copy()
    tint = np.array(hex_to_rgb(tint_hex), dtype=np.float32)
    t = team.copy()
    t[..., :3] = t[..., :3] * tint
    return over(base, t)


# -- outer outline --------------------------------------------------------------------------
def _shift(a, dx, dy):
    """out[y, x] = a[y - dy, x - dx], zero outside."""
    h, w = a.shape[:2]
    out = np.zeros_like(a)
    if abs(dx) >= w or abs(dy) >= h:
        return out
    out[max(0, dy):h + min(0, dy), max(0, dx):w + min(0, dx)] = \
        a[max(0, -dy):h - max(0, dy), max(0, -dx):w - max(0, dx)]
    return out


def _disk(r):
    R = int(math.ceil(r + 0.5))
    offs = []
    for dy in range(-R, R + 1):
        for dx in range(-R, R + 1):
            wgt = min(1.0, max(0.0, r + 0.5 - math.hypot(dx, dy)))
            if wgt > 0:
                offs.append((dx, dy, wgt))
    return offs, R


_N8 = [(-1, -1), (0, -1), (1, -1), (-1, 0), (1, 0), (-1, 1), (0, 1), (1, 1)]


def outline(base, team, width_px, factor=0.40, max_v=0.38, seed_inset_px=3, team_grey=0.40,
            inner_px=0.0, under=None):
    """Adds the outer outline to a (base, team) frame pair. Returns (base, team).

    width_px: how far the line reaches outside the silhouette. inner_px: how far it also
    covers the silhouette's own edge band (where the interior hull line would otherwise
    make a soft double edge). under: an RGBA layer (the smear) placed under the unit and
    left without an outline."""
    h, w = base.shape[:2]
    ta = team[..., 3] if team is not None else np.zeros((h, w), np.float32)
    ba = base[..., 3]
    A = ba + ta * (1 - ba)
    offs, R = _disk(width_px)
    ys, xs = np.nonzero(A > 0.002)
    if len(xs) == 0 or width_px <= 0:
        return base, team
    m = R + seed_inset_px + 2
    y0, y1 = max(0, ys.min() - m), min(h, ys.max() + m + 1)
    x0, x1 = max(0, xs.min() - m), min(w, xs.max() + m + 1)
    Ac = A[y0:y1, x0:x1]
    D = np.zeros_like(Ac)
    for dx, dy, wgt in offs:
        np.maximum(D, _shift(Ac, dx, dy) * wgt, out=D)
    # seeds: pixels at least `seed_inset_px` inside the silhouette (clear of interior lines)
    solid = Ac > 0.5
    seed = solid.copy()
    for dx, dy, _ in _disk(seed_inset_px)[0]:
        seed &= _shift(solid, dx, dy)
    if not seed.any():
        seed = solid
    bc = base[y0:y1, x0:x1]
    is_team = (bc[..., 3] < 0.5) & (ta[y0:y1, x0:x1] > 0.5)
    col = np.where(seed[..., None], bc[..., :3], 0).astype(np.float32)
    tm = np.where(seed, is_team.astype(np.float32), 0)
    known = seed.copy()
    target = D > 0.002
    for _ in range(96):
        need = target & ~known
        if not need.any():
            break
        kf = known.astype(np.float32)
        s = np.zeros_like(col)
        ts = np.zeros_like(tm)
        c = np.zeros_like(tm)
        for dx, dy in _N8:
            k = _shift(kf, dx, dy)
            s += _shift(col, dx, dy) * k[..., None]
            ts += _shift(tm, dx, dy) * k
            c += k
        new = need & (c > 0)
        if not new.any():
            break
        col[new] = s[new] / c[new][:, None]
        tm[new] = ts[new] / c[new]
        known |= new
    # outline colours: nearest fill x factor, value capped
    oc = col * factor
    v = oc.max(-1, keepdims=True)
    oc = np.where(v > max_v, oc * (max_v / np.maximum(v, 1e-6)), oc)
    T = np.clip((tm - 0.35) / 0.3, 0, 1)
    T = T * T * (3 - 2 * T)
    ab = D * (1 - T)
    at = np.where(T > 1e-3, D * T / np.maximum(1 - D + D * T, 1e-6), 0)
    b_ol = np.concatenate([oc, ab[..., None]], -1)
    # the sprite goes on top, faded out over its outermost `inner_px` so the line covers it
    E = np.ones_like(Ac)
    if inner_px > 0:
        grow = np.zeros_like(Ac)
        for dx, dy, wgt in _disk(inner_px)[0]:
            np.maximum(grow, _shift(1 - Ac, dx, dy) * wgt, out=grow)
        E = 1 - grow
    bm = bc.copy()
    bm[..., 3] *= E
    out_b = base.copy()
    out_b[y0:y1, x0:x1] = over(bm, b_ol)
    if under is not None:
        out_b = over(out_b, under)
    out_t = team
    if team is not None:
        t_ol = np.concatenate([np.full(oc.shape, team_grey, np.float32), at[..., None]], -1)
        tm_ = team[y0:y1, x0:x1].copy()
        tm_[..., 3] *= E
        out_t = team.copy()
        out_t[y0:y1, x0:x1] = over(tm_, t_ol)
    return out_b, out_t


# -- checks -----------------------------------------------------------------------------------
def _rule_pct(base, team):
    sil = base[..., 3] > 0.5
    if team is not None:
        sil |= team[..., 3] > 0.5
    opaque = base[..., 3] > 0.5
    rgb = base[..., :3]
    mx, mn = rgb.max(-1), rgb.min(-1)
    sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0)
    d = np.maximum(mx - mn, 1e-6)
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    hue = np.where(mx == r, ((g - b) / d) % 6, np.where(mx == g, (b - r) / d + 2, (r - g) / d + 4)) * 60
    band = (hue >= 350) | (hue <= 81) | ((hue >= 182) & (hue <= 254))
    bad = opaque & band & (sat > 0.40)
    return 100.0 * bad.sum() / max(1, sil.sum())


def team_share(base, team):
    """Share of the silhouette (in %) where the visible surface is team-coloured."""
    if team is None:
        return 0.0
    sil = (base[..., 3] > 0.5) | (team[..., 3] > 0.5)
    vis = (team[..., 3] > 0.5) & (base[..., 3] < 0.5)
    return 100.0 * vis.sum() / max(1, sil.sum())


def checks(clip_frames, raw_frames=None, min_team_pct=None):
    """DESIGN A11 colour rule (non-team pixels in the team hue bands above 40% saturation,
    limit 10% of the silhouette) and team-colour coverage (share of the silhouette that is
    team-coloured; `fill` is measured before the outer outline, `withOutline` after)."""
    worst = (0.0, None)
    cov = []
    for clip, frames in clip_frames.items():
        for i, (bp, tp) in enumerate(frames):
            base = load(bp)
            team = load(tp) if tp else None
            pct = _rule_pct(base, team)
            if pct > worst[0]:
                worst = (pct, f"{clip}_{i:02d}")
            if raw_frames is not None:
                rb, rt = raw_frames[clip][i]
                fill = team_share(load(rb), load(rt) if rt else None)
            else:
                fill = team_share(base, team)
            cov.append((fill, team_share(base, team), f"{clip}_{i:02d}"))
    out = {"colourRule": {"worstPct": round(worst[0], 2), "worstFrame": worst[1], "limitPct": 10.0}}
    if min_team_pct is not None and cov:
        lo = min(cov)
        out["teamCoverage"] = {
            "minFillPct": round(lo[0], 1), "minFrame": lo[2],
            "meanFillPct": round(sum(c[0] for c in cov) / len(cov), 1),
            "minWithOutlinePct": round(min(c[1] for c in cov), 1),
            "limitPct": min_team_pct,
            "failingFrames": [c[2] for c in cov if c[0] < min_team_pct],
        }
    return out


# -- packing ----------------------------------------------------------------------------------
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
    for width in (128, 192, 256, 320, 384, 448, 512, 640, 768, 896, 1024, 1280, 1536, 2048, 2560,
                  3072, 3584, 4096):  # the widest only for HD Legendary sheets
        if max(s[0] for s in sizes) + PAD * 2 > width:
            continue
        pos, height = _shelf_pack(sizes, width)
        height = (height + 3) // 4 * 4
        # prefer squarish sheets: tall strips waste mobile texture limits
        area = width * height * (1.0 + 0.25 * max(0.0, height / width - 1.5))
        if height <= 4096 and (best is None or area < best[0]):
            best = (area, width, height, pos)
    if best is None:
        raise ValueError(f"frames do not fit a 4096 x 4096 sheet ({len(images)} frames)")
    _, width, height, pos = best
    sheet = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    for im, p in zip(images, pos):
        sheet.paste(im, p)
    return sheet, pos


def build_atlas(slug, clip_frames, clip_meta, extra_meta, out_dir, scale, file_slug=None,
                variants=True):
    """clip_frames: {clip: [(base_path, team_path|None)] per unique frame}.
    Writes <file_slug>.png/.json (+ .rgba.png and WebP variants for size comparison)."""
    file_slug = file_slug or slug
    names, images, trims, source = [], [], [], None
    animations = {}
    has_team = any(tp for frames in clip_frames.values() for _, tp in frames)
    for clip, frames in clip_frames.items():
        uniq = {}
        for i, (bp, tp) in enumerate(frames):
            for path, suffix in ((bp, ""), (tp, "_team")):
                if suffix and not has_team:
                    continue
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
                uniq[(i, suffix)] = name
        seq = clip_meta[clip]["sequence"]
        animations[clip] = [uniq[(i, "")] for i in seq]
        if has_team:
            animations[f"{clip}_team"] = [uniq[(i, "_team")] for i in seq]
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
    pal = sheet.quantize(256, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE)
    pal.save(os.path.join(out_dir, f"{file_slug}.png"), optimize=True)
    if variants:
        sheet.save(os.path.join(out_dir, f"{file_slug}.rgba.png"), optimize=True)
        sheet.save(os.path.join(out_dir, f"{file_slug}.webp"), lossless=True, quality=100, method=6)
        sheet.save(os.path.join(out_dir, f"{file_slug}.q90.webp"), quality=90, method=6,
                   alpha_quality=90)
    ageborn = dict(extra_meta, clips=clip_meta)
    if has_team:
        ageborn["team"] = {
            "mode": "tint-underlay",
            "frameSuffix": "_team",
            "howTo": "draw <frame>_team tinted with the team colour, then <frame> on top",
        }
    atlas = {
        "frames": frames,
        "animations": animations,
        "meta": {
            "app": "ageborn art/blender pipeline",
            "version": "2",
            "image": f"{file_slug}.png",
            "format": "RGBA8888",
            "size": {"w": sheet.size[0], "h": sheet.size[1]},
            "scale": f"{scale:g}",
            "ageborn": ageborn,
        },
    }
    with open(os.path.join(out_dir, f"{file_slug}.json"), "w") as fh:
        json.dump(atlas, fh, indent=1)
    return sheet.size


# -- previews ---------------------------------------------------------------------------------
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


def fx_layers(out_dir, fx_list, unit_feet_px, px_per_lu):
    """Loads shared FX frames for a unit's death preview. Returns a list of timed layers:
    {"start": ms, "frames": [(img, durations)], "at": (x, y) px in the unit frame}."""
    layers = []
    for spec in fx_list:
        slug = spec["id"].split(".", 1)[1]
        path = os.path.join(out_dir, f"fx_{slug}.json")
        if not os.path.exists(path):
            continue
        with open(path) as fh:
            data = json.load(fh)
        clip = data["meta"]["ageborn"]["clips"]["play"]
        feet = data["meta"]["ageborn"]["feetPx"]
        raw = os.path.join(out_dir, "_frames", f"fx_{slug}", "final")
        imgs = [Image.open(os.path.join(raw, f"play_{i:02d}.png")).convert("RGBA")
                for i in range(clip["frames"])]
        k = spec["scale"]
        imgs = [im.resize((max(1, round(im.width * k)), max(1, round(im.height * k))),
                          Image.Resampling.LANCZOS) for im in imgs]
        seq = clip["sequence"] * spec.get("loops", 1)
        durs = clip["durationsMs"] * spec.get("loops", 1)
        ox = unit_feet_px[0] + spec["offsetLu"][0] * px_per_lu - feet[0] * k
        oy = unit_feet_px[1] - spec["offsetLu"][1] * px_per_lu - feet[1] * k
        layers.append({"start": spec["atMs"], "steps": [(imgs[i], d) for i, d in zip(seq, durs)],
                       "at": (int(round(ox)), int(round(oy)))})
    return layers


def timeline(clip, frames_img, layers=None):
    """[(image, ms)] for a clip played once, with FX layers composited at their times."""
    events = []
    t = 0
    for idx, d in zip(clip["sequence"], clip["durationsMs"]):
        events.append((t, t + d, frames_img[idx]))
        t += d
    end = t
    for L in layers or []:
        tt = L["start"]
        for _, d in L["steps"]:
            tt += d
        end = max(end, tt)
    cuts = {0, end}
    for a, b, _ in events:
        cuts |= {a, b}
    for L in layers or []:
        tt = L["start"]
        for _, d in L["steps"]:
            cuts |= {tt, tt + d}
            tt += d
    cuts = sorted(c for c in cuts if c <= end)
    out = []
    size = frames_img[0].size
    for a, b in zip(cuts, cuts[1:]):
        canvas = Image.new("RGBA", size, (0, 0, 0, 0))
        for s, e, im in events:
            if s <= a < e:
                canvas.alpha_composite(im)
        for L in layers or []:
            tt = L["start"]
            for im, d in L["steps"]:
                if tt <= a < tt + d:
                    layer = Image.new("RGBA", size, (0, 0, 0, 0))
                    layer.paste(im, L["at"], im)
                    canvas.alpha_composite(layer)
                tt += d
        out.append((canvas, b - a))
    return out


def previews(slug, clip_frames, clip_meta, out_dir, render_scale, bg_hex, tints, fx=None,
             feet_px=None, px_per_lu=None, pad=None):
    """Animated GIFs at in-game size (1x) and 3x, per clip, played with the real sequence
    and frame durations on a flat background, plus a contact sheet of every unique frame
    in two team colours. The die GIF includes the shared dust poof and KO stars."""
    bg = tuple(int(c * 255) for c in hex_to_rgb(bg_hex))
    first = list(tints)[0]
    comps = {}
    for clip, frames in clip_frames.items():
        comps[clip] = {t: [] for t in tints}
        for bp, tp in frames:
            base = load(bp)
            team = load(tp) if tp else None
            for t in tints:
                comps[clip][t].append(to_image(composite(base, team, tints[t])))
    # every clip as a timeline of (image, ms); FX layers are added to the die clip
    lines = {}
    for clip in comps:
        layers = None
        if fx and clip_meta[clip].get("fx"):
            layers = fx_layers(out_dir, clip_meta[clip]["fx"], feet_px, px_per_lu)
        lines[clip] = timeline(clip_meta[clip], comps[clip][first], layers)
    # common crop box over all frames so every GIF shares the frame
    boxes = [bbox(im) for c in lines.values() for im, _ in c]
    m = pad if pad is not None else 6
    W, H = comps[next(iter(comps))][first][0].size
    x0 = max(0, min(b[0] for b in boxes) - m)
    y0 = max(0, min(b[1] for b in boxes) - m)
    x1 = min(W, max(b[2] for b in boxes) + m)
    y1 = min(H, max(b[3] for b in boxes) + m)
    for clip, line in lines.items():
        for label, factor in (("1x", 1.0 / render_scale), ("3x", 3.0 / render_scale)):
            gif_frames, durs = [], []
            for im, ms in line:
                crop = im.crop((x0, y0, x1, y1))
                size = (max(1, round(crop.size[0] * factor)), max(1, round(crop.size[1] * factor)))
                # Downscale with a box filter (what a mipmapped/linear GPU sampler approximates);
                # upscale the render for the 3x view.
                crop = crop.resize(size, Image.Resampling.BOX if factor < 1 else Image.Resampling.LANCZOS)
                canvas = Image.new("RGBA", size, bg + (255,))
                canvas.alpha_composite(crop)
                gif_frames.append(canvas.convert("RGB"))
                durs.append(max(20, int(round(ms / 10.0)) * 10))
            if not clip_meta[clip].get("loop"):
                durs[-1] += 400  # hold the last frame so one-shots read in a looping GIF
            gif_frames[0].save(os.path.join(out_dir, f"{slug}_{clip}_{label}.gif"), save_all=True,
                               append_images=gif_frames[1:], duration=durs,
                               loop=0, disposal=1, optimize=False)
    # contact sheet: unique frames
    cw, ch = x1 - x0, y1 - y0
    cols = max(len(v[first]) for v in comps.values())
    rows = [(clip, t) for clip in comps for t in tints]
    sheet = Image.new("RGBA", (cols * cw, len(rows) * ch), bg + (255,))
    for r, (clip, t) in enumerate(rows):
        for c, im in enumerate(comps[clip][t]):
            sheet.alpha_composite(im.crop((x0, y0, x1, y1)), (c * cw, r * ch))
    sheet.convert("RGB").save(os.path.join(out_dir, f"{slug}_contact.png"))
    return comps, (x0, y0, x1, y1)


def silhouette_width_lu(base_path, team_path, px_per_lu):
    base = load(base_path)
    a = base[..., 3]
    if team_path:
        a = np.maximum(a, load(team_path)[..., 3])
    xs = np.nonzero((a > 0.5).any(0))[0]
    return round((xs.max() - xs.min() + 1) / px_per_lu, 1) if len(xs) else 0.0

