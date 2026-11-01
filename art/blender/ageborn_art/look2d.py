"""The 2D half of the detail standard (art round W0; item 47 audit sections 5 and 6): numpy and Pillow only,
so the checks and review tools run without Blender.

  top_rim        L3: a light band just inside the silhouette's upper edges (light from above), wide enough
                 to survive the outline's inner cover; on team surfaces a white overlay in the base frame
  sharpen_luma   L4: an unsharp mask on luminance only, applied as one gain per pixel (RGB x Y'/Y), so hue
                 and HSV saturation are unchanged and the A11 colour rule cannot get worse
  maxrects       an opt-in MaxRects packer (tighter than the shelf packer) for opted-in units
  frames_of      unpack every frame of a shipped sheet (PNG8 or RGBA) back to full-size RGBA arrays
  rule_pct       the A11 colour rule of one frame (sheet._rule_pct, here without the sheet import)
  game_metrics   the audit's game-scale metrics: flat share, micro, edge density, highlight share
  parity         DESIGN A5.8 clarity parity of a skin sheet against its unit's sheet (IoU, team zones,
                 weapon anchors), used by skin_parity.py and by the pipeline after a skin render
"""
import json
import math
import os

import numpy as np
from PIL import Image

# -- small array helpers ------------------------------------------------------------------------------
def shift(a, dx, dy):
    """out[y, x] = a[y - dy, x - dx], zero outside."""
    h, w = a.shape[:2]
    out = np.zeros_like(a)
    if abs(dx) >= w or abs(dy) >= h:
        return out
    out[max(0, dy):h + min(0, dy), max(0, dx):w + min(0, dx)] = \
        a[max(0, -dy):h - max(0, dy), max(0, -dx):w - max(0, dx)]
    return out


def erode(mask, r):
    out = mask.copy()
    for dy in range(-r, r + 1):
        for dx in range(-r, r + 1):
            if dx * dx + dy * dy <= r * r + r:
                out &= shift(mask, dx, dy)
    return out


def luma(rgb):
    return 0.2126 * rgb[..., 0] + 0.7152 * rgb[..., 1] + 0.0722 * rgb[..., 2]


def over(top, bottom):
    ta, ba = top[..., 3:4], bottom[..., 3:4]
    a = ta + ba * (1 - ta)
    p = top[..., :3] * ta + bottom[..., :3] * ba * (1 - ta)
    rgb = np.where(a > 1e-6, p / np.maximum(a, 1e-6), 0)
    return np.concatenate([rgb, a], axis=-1)


_N8 = [(-1, -1), (0, -1), (1, -1), (-1, 0), (1, 0), (-1, 1), (0, 1), (1, 1)]


def propagate(col, known, target, steps):
    """Fills `target` pixels with the mean colour of known neighbours, growing outward `steps` times."""
    col = col.copy()
    known = known.copy()
    for _ in range(steps):
        need = target & ~known
        if not need.any():
            break
        kf = known.astype(np.float32)
        s = np.zeros_like(col)
        c = np.zeros(known.shape, np.float32)
        for dx, dy in _N8:
            k = shift(kf, dx, dy)
            s += shift(col, dx, dy) * k[..., None]
            c += k
        new = need & (c > 0)
        if not new.any():
            break
        col[new] = s[new] / c[new][:, None]
        known |= new
    return col, known


# -- L3: top rim ------------------------------------------------------------------------------------
RIM = {
    "cover_lu": 0.35,    # the outline v4's inner cover (the rim starts under it and must outlast it)
    "full_lu": 0.50,     # full strength this far beyond the cover (>= 0.4 lu visible after the outline)
    "fade_lu": 0.40,     # then fades out over this distance
    "cone_deg": 42.0,    # full strength where the edge faces within this angle of straight up...
    "cone_fade_deg": 26.0,   # ...fading to nothing this much further round
    "lift": 0.42,        # rim colour: the part's lit colour with its HSV value raised this far toward 1
    "white": 0.10,       # ...then mixed this little toward white
    "team_white": 0.30,  # on team surfaces: a white overlay of this alpha over the tinted layer
}


def _edge_dir(A, radius):
    """For each pixel: the distance (px) to the nearest pixel outside the silhouette (A < 0.5) and the angle
    (deg, 0 = straight up) of the direction toward it; inf / nan where none is within `radius`."""
    out = A < 0.5
    dist = np.full(A.shape, np.inf, np.float32)
    ang = np.full(A.shape, np.nan, np.float32)
    offs = sorted(((math.hypot(dx, dy), dx, dy) for dy in range(-radius, radius + 1)
                   for dx in range(-radius, radius + 1) if 0 < math.hypot(dx, dy) <= radius))
    found = np.zeros(A.shape, bool)
    for d, dx, dy in offs:
        # dy < 0 is up in image rows: val[y, x] = out[y + dy, x + dx]
        hit = shift(out, -dx, -dy) & ~found & ~out
        if hit.any():
            dist[hit] = d
            ang[hit] = math.degrees(math.atan2(abs(dx), -dy))
            found |= hit
    return dist, ang


def top_rim(base, team, px_per_lu, spec=None):
    """Returns (base, team) with a light band inside the silhouette's upper edges (where the nearest pixel
    outside lies above: light from above). The band takes the lit colour of the part it sits on (propagated
    from deeper inside, so it also replaces the dark interior hull line there) with its value raised (hue and
    saturation kept); team surfaces get the lit team grey plus a white overlay in the base frame."""
    S = dict(RIM, **(spec or {}))
    h, w = base.shape[:2]
    ba = base[..., 3]
    ta = team[..., 3] if team is not None else np.zeros((h, w), np.float32)
    A = ba + ta * (1 - ba)
    ys, xs = np.nonzero(A > 0.002)
    if len(xs) == 0:
        return base, team
    d1 = (S["cover_lu"] + S["full_lu"]) * px_per_lu
    d2 = d1 + S["fade_lu"] * px_per_lu
    R_ = int(math.ceil(d2 + 1))
    m = R_ + 8
    y0, y1 = max(0, ys.min() - m), min(h, ys.max() + m + 1)
    x0, x1 = max(0, xs.min() - m), min(w, xs.max() + m + 1)
    Ac = A[y0:y1, x0:x1]
    dist, _ = _edge_dir(Ac, R_)
    wd = np.clip((d2 + 0.5 - dist) / max(0.5, d2 - d1), 0, 1)
    # the edge's facing from the gradient of the blurred silhouette (smooth along sloped edges)
    gy, gx = np.gradient(_blur(Ac, max(1.5, d2 * 0.9)))
    gm = np.hypot(gx, gy)
    ang = np.degrees(np.arccos(np.clip(np.where(gm > 1e-4, gy / np.maximum(gm, 1e-4), -1.0), -1, 1)))
    wa = np.clip((S["cone_deg"] + S["cone_fade_deg"] - ang) / S["cone_fade_deg"], 0, 1)
    rim = np.where(np.isfinite(dist), wd * wa, 0.0).astype(np.float32) * np.clip(Ac * 2 - 0.5, 0, 1)
    if rim.max() <= 0:
        return base, team
    band = rim > 0.01
    # the lit colour of each part, propagated outward from pixels clear of the edge band and its hull line
    solid = Ac > 0.5
    deep = erode(solid, int(math.ceil(d2)) + 3)
    bc = base[y0:y1, x0:x1].copy()
    is_base = bc[..., 3] > 0.5
    seed_b = deep & is_base
    # grows from the deep pixels through the part's own (non-deep) pixels up to the band
    col_b, known_b = propagate(np.where(seed_b[..., None], bc[..., :3], 0).astype(np.float32), seed_b,
                               (band | solid) & is_base, R_ + 8)
    v = col_b.max(-1, keepdims=True)
    gain = np.where(v > 1e-3, (v + (1 - v) * S["lift"]) / np.maximum(v, 1e-3), 1.0)
    rimcol = np.clip(col_b * gain, 0, 1)
    rimcol = rimcol + (1.0 - rimcol) * S["white"]
    use_b = band & is_base & known_b
    k = rim[..., None] * use_b[..., None]
    bc[..., :3] = bc[..., :3] * (1 - k) + rimcol * k
    out_b = base.copy()
    out_t = team
    if team is not None:
        tc = team[y0:y1, x0:x1].copy()
        is_team = (bc[..., 3] < 0.5) & (tc[..., 3] > 0.5)
        seed_t = deep & is_team
        col_t, known_t = propagate(np.where(seed_t[..., None], tc[..., :3], 0).astype(np.float32), seed_t,
                                   (band | solid) & is_team, R_ + 8)
        use_t = band & is_team & known_t
        kt = rim[..., None] * use_t[..., None]
        tc[..., :3] = tc[..., :3] * (1 - kt) + np.maximum(tc[..., :3], col_t) * kt
        out_t = team.copy()
        out_t[y0:y1, x0:x1] = tc
        # white overlay over the tinted team layer (the team pass cannot go above its lit grey of 1.0)
        a = (rim * use_t * S["team_white"]).astype(np.float32)
        white = np.concatenate([np.ones(a.shape + (3,), np.float32), a[..., None]], -1)
        bc = over(white, bc)
    out_b[y0:y1, x0:x1] = bc
    return out_b, out_t


# -- L4: luminance-only sharpening ---------------------------------------------------------------------
def _gauss_kernel(radius):
    sigma = max(0.3, radius / 2.0)
    r = int(math.ceil(3 * sigma))
    xs = np.arange(-r, r + 1, dtype=np.float32)
    k = np.exp(-xs * xs / (2 * sigma * sigma))
    return k / k.sum(), r


def _blur(a, radius):
    k, r = _gauss_kernel(radius)
    out = np.zeros_like(a)
    for i, wt in enumerate(k):
        out += shift(a, i - r, 0) * wt
    tmp = out
    out = np.zeros_like(a)
    for i, wt in enumerate(k):
        out += shift(tmp, 0, i - r) * wt
    return out


def sharpen_luma(arr, radius=1.1, amount=0.55, threshold=1.0 / 255):
    """Unsharp mask on luminance, applied to opaque pixels as a gain RGB x Y'/Y (hue and saturation kept)."""
    a = arr[..., 3]
    Y = luma(arr[..., :3]) * a
    blur = _blur(Y, radius)
    d = Y - blur
    d = np.where(np.abs(d) > threshold, d, 0)
    Ys = np.clip(Y + amount * d, 0, None)
    gain = np.where(Y > 1e-4, Ys / np.maximum(Y, 1e-4), 1.0)
    gain = np.where(a > 0.98, gain, 1.0)
    out = arr.copy()
    rgb = arr[..., :3] * gain[..., None]
    # keep the gain where no channel clips; scale down where one would (still hue- and saturation-safe)
    mx = rgb.max(-1, keepdims=True)
    rgb = np.where(mx > 1.0, rgb / np.maximum(mx, 1e-6), rgb)
    out[..., :3] = rgb
    return out


# -- packing ----------------------------------------------------------------------------------------
ORDERS = (lambda s: (-(s[0] * s[1]), -s[1]), lambda s: (-s[1], -s[0]), lambda s: (-max(s), -min(s)))


def _maxrects(sizes, width, height, pad, order_key=ORDERS[0]):
    """MaxRects, best short side fit, no rotation. Returns positions (x + pad, y + pad) or None."""
    free = [(0, 0, width, height)]
    pos = [None] * len(sizes)
    order = sorted(range(len(sizes)), key=lambda i: (order_key(sizes[i]), i))
    for i in order:
        w, h = sizes[i][0] + 2 * pad, sizes[i][1] + 2 * pad
        best = None
        for fx, fy, fw, fh in free:
            if w <= fw and h <= fh:
                ss = min(fw - w, fh - h)
                ls = max(fw - w, fh - h)
                key = (ss, ls, fy, fx)
                if best is None or key < best[0]:
                    best = (key, fx, fy)
        if best is None:
            return None
        _, x, y = best
        pos[i] = (x + pad, y + pad)
        used = (x, y, w, h)
        nf = []
        for fr in free:
            nf.extend(_split(fr, used))
        free = _prune(nf)
    return pos


def _split(fr, used):
    fx, fy, fw, fh = fr
    ux, uy, uw, uh = used
    if ux >= fx + fw or ux + uw <= fx or uy >= fy + fh or uy + uh <= fy:
        return [fr]
    out = []
    if ux > fx:
        out.append((fx, fy, ux - fx, fh))
    if ux + uw < fx + fw:
        out.append((ux + uw, fy, fx + fw - ux - uw, fh))
    if uy > fy:
        out.append((fx, fy, fw, uy - fy))
    if uy + uh < fy + fh:
        out.append((fx, uy + uh, fw, fy + fh - uy - uh))
    return out


def _prune(rects):
    rects = [r for r in rects if r[2] > 0 and r[3] > 0]
    keep = []
    for i, a in enumerate(rects):
        contained = False
        for j, b in enumerate(rects):
            if i != j and a[0] >= b[0] and a[1] >= b[1] and a[0] + a[2] <= b[0] + b[2] and \
                    a[1] + a[3] <= b[1] + b[3] and (a != b or j < i):
                contained = True
                break
        if not contained:
            keep.append(a)
    return keep


WIDTHS = (128, 192, 256, 320, 384, 448, 512, 640, 768, 896, 1024, 1280, 1536, 2048, 2560, 3072, 3584, 4096)


def maxrects(images, pad=2, shelf=None):
    """Same contract as sheet.pack (images -> (sheet, positions)), packed with MaxRects: for every candidate
    width and three sort orders the smallest height that fits (a multiple of 4, at most 4096; searched by
    bisection, then confirmed a few steps lower, since MaxRects is not strictly monotonic in height), then the
    smallest area, with the shelf packer's preference for squarish sheets. `shelf` (sheet.pack) is tried too
    and wins when it is smaller, so the result is never larger than the shipped packer's."""
    sizes = [im.size for im in images]
    best = None
    area_px = sum((w + 2 * pad) * (h + 2 * pad) for w, h in sizes)

    def score(width, height):
        return width * height * (1.0 + 0.25 * max(0.0, height / width - 1.5))
    for width in WIDTHS:
        if max(s[0] for s in sizes) + pad * 2 > width:
            continue
        for key in ORDERS:
            lo = max(max(s[1] for s in sizes) + 2 * pad, int(area_px / width))
            lo = (lo + 3) // 4 * 4
            hi = 4096
            if _maxrects(sizes, width, hi, pad, key) is None:
                continue
            while lo < hi:
                mid = max(lo, (lo + hi) // 2 // 4 * 4)
                if _maxrects(sizes, width, mid, pad, key) is not None:
                    hi = mid
                else:
                    lo = mid + 4
            height = lo
            for k in range(1, 6):            # a few smaller heights that bisection may have skipped
                h2 = height - 4 * k
                if h2 >= max(s[1] for s in sizes) + 2 * pad and _maxrects(sizes, width, h2, pad, key) is not None:
                    height = h2
            if best is None or score(width, height) < best[0]:
                best = (score(width, height), width, height, _maxrects(sizes, width, height, pad, key))
    if shelf is not None:
        sh, spos = shelf(images)
        if best is None or score(*sh.size) <= best[0]:
            return sh, spos
    if best is None:
        raise ValueError(f"frames do not fit a 4096 x 4096 sheet ({len(images)} frames)")
    _, width, height, pos = best
    sheet = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    for im, p in zip(images, pos):
        sheet.paste(im, p)
    return sheet, pos


# -- reading shipped sheets ---------------------------------------------------------------------------
def frames_of(sheet_json):
    """{frame name: full-size float RGBA array} for every frame of a sheet (as the game sees it)."""
    with open(sheet_json) as fh:
        d = json.load(fh)
    img = np.asarray(Image.open(os.path.join(os.path.dirname(sheet_json), d["meta"]["image"])).convert("RGBA"),
                     np.float32) / 255.0
    out = {}
    for name, f in d["frames"].items():
        fr, ss, so = f["frame"], f["spriteSourceSize"], f["sourceSize"]
        a = np.zeros((so["h"], so["w"], 4), np.float32)
        a[ss["y"]:ss["y"] + fr["h"], ss["x"]:ss["x"] + fr["w"]] = img[fr["y"]:fr["y"] + fr["h"], fr["x"]:fr["x"] + fr["w"]]
        out[name] = a
    return out, d


def rule_pct(base, team):
    """DESIGN A11 colour rule: non-team pixels in the team hue bands above 40% saturation, % of the silhouette."""
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
    if team is None:
        return 0.0
    sil = (base[..., 3] > 0.5) | (team[..., 3] > 0.5)
    vis = (team[..., 3] > 0.5) & (base[..., 3] < 0.5)
    return 100.0 * vis.sum() / max(1, sil.sum())


def sheet_rule(sheet_json):
    """Worst colour-rule % over every frame of a shipped (encoded) sheet: (pct, frame)."""
    fr, _ = frames_of(sheet_json)
    worst = (0.0, None)
    for name, base in fr.items():
        if name.endswith("_team"):
            continue
        p = rule_pct(base, fr.get(name + "_team"))
        if p > worst[0]:
            worst = (p, name)
    return worst


def silhouette(fr, name):
    a = fr[name][..., 3] > 0.5
    t = fr.get(name + "_team")
    if t is not None:
        a = a | (t[..., 3] > 0.5)
    return a


# -- composites at game scale -------------------------------------------------------------------------
TEAM_BLUE = (0x2F / 255, 0x7D / 255, 0xF6 / 255)
GAME_PX_PER_LU = 1.83      # device px per lu on a DPR 2 phone in battle (audit 5.1)


def composite(base, team, tint=TEAM_BLUE):
    if team is None:
        return base.copy()
    t = team.copy()
    t[..., :3] *= np.array(tint, np.float32)
    return over(base, t)


def resize(arr, k, flt=Image.Resampling.BOX):
    h, w = arr.shape[:2]
    size = (max(1, round(w * k)), max(1, round(h * k)))
    pm = arr.copy()
    pm[..., :3] *= pm[..., 3:4]
    ch = [np.asarray(Image.fromarray(np.ascontiguousarray(pm[..., i])).resize(size, flt)) for i in range(4)]
    out = np.stack(ch, -1)
    a = out[..., 3:4]
    out[..., :3] = np.where(a > 1e-4, out[..., :3] / np.maximum(a, 1e-4), 0)
    return np.clip(out, 0, 1)


def gpu_bilinear(arr, k):
    """What the game does with an HD sheet at DPR 2: Pixi samples the texture bilinearly at k (0.74x) without
    mipmaps (premultiplied alpha)."""
    h, w = arr.shape[:2]
    oh, ow = max(1, round(h * k)), max(1, round(w * k))
    ys = (np.arange(oh) + 0.5) / k - 0.5
    xs = (np.arange(ow) + 0.5) / k - 0.5
    y0 = np.clip(np.floor(ys).astype(int), 0, h - 1)
    x0 = np.clip(np.floor(xs).astype(int), 0, w - 1)
    y1, x1 = np.clip(y0 + 1, 0, h - 1), np.clip(x0 + 1, 0, w - 1)
    fy = (ys - np.floor(ys))[:, None, None]
    fx = (xs - np.floor(xs))[None, :, None]
    pm = arr.copy()
    pm[..., :3] *= pm[..., 3:4]
    top = pm[y0][:, x0] * (1 - fx) + pm[y0][:, x1] * fx
    bot = pm[y1][:, x0] * (1 - fx) + pm[y1][:, x1] * fx
    out = top * (1 - fy) + bot * fy
    al = out[..., 3:4]
    out[..., :3] = np.where(al > 1e-4, out[..., :3] / np.maximum(al, 1e-4), 0)
    return out


def game_metrics(arr, px_per_lu):
    """The audit's game-scale metrics (reconstructed; its code was lost): the frame sampled as the game draws
    it at 1.83 device px per lu (gpu_bilinear), luminance in levels (0-255), gradients by central differences.
      flat_share       interior pixels (1 px in) with a gradient under 1 level per px
      micro            mean gradient of interior pixels (2 px in) that are not edges (<= 12 levels per px)
      edge_density     interior pixels (1 px in) with a gradient above 8 levels per px
      highlight_share  interior pixels (1 px in) more than 28 levels above their 5 x 5 mean
    On the shipped Bonker, Javelineer and War Chariot (idle 0, blue) these give flat 0.326 / 0.227 / 0.338,
    micro 3.23 / 3.80 / 3.02, edge 0.426 / 0.542 / 0.410 and highlight 0.038 / 0.063 / 0.033 against the
    audit's 0.303 / 0.227 / 0.339, 3.46 / 4.12 / 3.04, 0.425 / 0.524 / 0.410 and 0.039 / 0.067 / 0.033."""
    g = gpu_bilinear(arr, GAME_PX_PER_LU / px_per_lu)
    a = g[..., 3]
    L = luma(g[..., :3] * a[..., None]) * 255
    gy, gx = np.gradient(L)
    gm = np.hypot(gx, gy)
    sil = a > 0.99
    in1, in2 = erode(sil, 1), erode(sil, 2)
    nb = np.stack([shift(L, dx, dy) for dy in range(-2, 3) for dx in range(-2, 3)], 0)
    mean5 = nb.mean(0)
    tex = in2 & (gm <= 12)
    return {
        "flat": round(float((gm < 1)[in1].mean()), 3),
        "micro": round(float(gm[tex].mean()) if tex.any() else 0.0, 2),
        "edge": round(float((gm > 8)[in1].mean()), 3),
        "highlight": round(float(((L - mean5) > 28)[in1].mean()), 3),
    }


def sheet_metrics(sheet_json, frame=None, tint=TEAM_BLUE):
    fr, d = frames_of(sheet_json)
    a = d["meta"]["ageborn"]
    slug = a["visualId"].split(".", 1)[1]
    name = frame or f"{slug}_idle_00"
    return game_metrics(composite(fr[name], fr.get(name + "_team"), tint), a["pxPerLu"])


# -- DESIGN A5.8 clarity parity of a skin -------------------------------------------------------------
def _aligned(mask, feet, ref_shape, ref_feet):
    """`mask` placed so its feet pixel lands on `ref_feet` in a canvas of `ref_shape`."""
    out = np.zeros(ref_shape, bool)
    dx, dy = int(round(ref_feet[0] - feet[0])), int(round(ref_feet[1] - feet[1]))
    h, w = mask.shape
    H, W = ref_shape
    ys0, xs0 = max(0, dy), max(0, dx)
    ys1, xs1 = min(H, h + dy), min(W, w + dx)
    if ys1 > ys0 and xs1 > xs0:
        out[ys0:ys1, xs0:xs1] = mask[ys0 - dy:ys1 - dy, xs0 - dx:xs1 - dx]
    return out


def parity(base_json, skin_json, min_iou=0.85, weapon_lu=12.0, min_team_pct=18.0):
    """Checks a skin sheet against its unit's sheet (DESIGN A5.8): the same clips, frame counts, timing and
    anchors; silhouette IoU >= min_iou on every frame (feet aligned); the weapon region (a disc of `weapon_lu`
    around every non-static anchor tracker) IoU >= min_iou; team zones present on every frame where the unit
    has them, with at least `min_team_pct` of the silhouette. Returns a dict with `ok` and `problems`."""
    bf, bd = frames_of(base_json)
    sf, sd = frames_of(skin_json)
    ba, sa = bd["meta"]["ageborn"], sd["meta"]["ageborn"]
    bslug = ba["visualId"].split(".", 1)[1]
    sslug = sa["visualId"].split(".", 1)[1]
    problems = []
    if sa.get("skinOf") != ba["visualId"]:
        problems.append(f"skinOf {sa.get('skinOf')} != {ba['visualId']}")
    ppl = ba["pxPerLu"]
    ious, w_ious, teams = [], [], []
    for clip, bm in ba["clips"].items():
        sm = sa["clips"].get(clip)
        if sm is None:
            problems.append(f"clip {clip} missing")
            continue
        for key in ("frames", "sequence", "durationsMs", "durationMs", "impactAt", "impactFrame", "impactStep",
                    "holdStep", "holdLoop", "loop", "smearFrame"):
            if bm.get(key) != sm.get(key):
                problems.append(f"{clip}.{key} {sm.get(key)} != {bm.get(key)}")
        ban, san = bm.get("anchorsLu", {}), sm.get("anchorsLu", {})
        if set(ban) != set(san):
            problems.append(f"{clip} anchors {sorted(san)} != {sorted(ban)}")
        for k in ban:
            for i, (p, q) in enumerate(zip(ban[k], san.get(k, []))):
                if math.hypot(p[0] - q[0], p[1] - q[1]) > 0.5:
                    problems.append(f"{clip}.{k}[{i}] moved {q} vs {p}")
                    break
        for i in range(bm["frames"]):
            bn, sn = f"{bslug}_{clip}_{i:02d}", f"{sslug}_{clip}_{i:02d}"
            if bn not in bf or sn not in sf:
                continue        # a reused frame (in the core sheet), or a frame the unit does not have
            A = silhouette(bf, bn)
            B = _aligned(silhouette(sf, sn), sa["feetPx"], A.shape, ba["feetPx"])
            inter, union = (A & B).sum(), (A | B).sum()
            iou = inter / max(1, union)
            ious.append((iou, f"{clip}_{i:02d}"))
            # the weapon region: discs around the moving anchors (club head, blade tip, muzzle)
            W = np.zeros(A.shape, bool)
            yy, xx = np.mgrid[0:A.shape[0], 0:A.shape[1]]
            for k, pts in ban.items():
                if i < len(pts):
                    cx = ba["feetPx"][0] + pts[i][0] * ppl
                    cy = ba["feetPx"][1] - pts[i][1] * ppl
                    W |= (xx - cx) ** 2 + (yy - cy) ** 2 <= (weapon_lu * ppl) ** 2
            # not in the death (the weapon is thrown away and its tracker follows the hidden copy) and only where
            # the unit draws something
            if clip != "die" and (A & W).sum() >= 0.5 * (ppl * 3) ** 2:
                wi = (A & B & W).sum() / max(1, ((A | B) & W).sum())
                w_ious.append((wi, f"{clip}_{i:02d}"))
            bt = team_share(bf[bn], bf.get(bn + "_team"))
            st = team_share(sf[sn], _team_aligned(sf, sn))
            teams.append((st, f"{clip}_{i:02d}"))
            if bt > 0 and st < min(min_team_pct, bt * 0.6):
                problems.append(f"{clip}_{i:02d} team {st:.1f}% (unit {bt:.1f}%)")
    worst = min(ious) if ious else (0.0, None)
    wworst = min(w_ious) if w_ious else (1.0, None)
    if worst[0] < min_iou:
        problems.append(f"silhouette IoU {worst[0]:.3f} < {min_iou} at {worst[1]}")
    if wworst[0] < min_iou:
        problems.append(f"weapon IoU {wworst[0]:.3f} < {min_iou} at {wworst[1]}")
    return {
        "ok": not problems, "problems": problems,
        "iouMean": round(float(np.mean([v for v, _ in ious])), 3) if ious else None,
        "iouMin": round(float(worst[0]), 3), "iouMinFrame": worst[1],
        "weaponIouMin": round(float(wworst[0]), 3), "weaponIouMinFrame": wworst[1],
        "teamMinPct": round(float(min(teams)[0]), 1) if teams else None,
        "frames": len(ious),
    }


def _team_aligned(fr, name):
    return fr.get(name + "_team")
