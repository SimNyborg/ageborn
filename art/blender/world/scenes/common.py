"""Shared building blocks for the backdrop scenes (PLAN 2b; DESIGN A11 Split-age lane, A17.7, B5).

A scene is the scenery of one age: its own daylight sky colours, an optional `back` strip, the `far`
and `mid` strips, a props atlas for ambient motion (sprites rendered with the same toon light), light
points that night skies switch on, and a 320 x 180 thumbnail. Every strip is rendered with the toon
shader and light of the units and bases, then desaturated and hazed toward the scene's horizon colour
(A11: backdrops stay desaturated and low contrast; far more than mid, back most).

Geometry is authored in lane lu (x = 0 at the left gate, z up, y depth away from the camera); the
camera looks along +y, tilted down a little (back 5, far 8, mid 12 degrees).

Format 2 (`public/art/backdrops/<age>/<scene>/`): `layers.json` + `back.webp` (optional), `far.webp`,
`mid.webp`, `props.webp` (optional) and `thumb.webp`. Format 1 (the classic strips of the first five
ages, `public/art/backdrops/<age>/{far,mid}.webp` + `layers.json`) keeps working until those ages get
their format 2 classic (round 3).
"""
import json
import math
import os
import random
import shutil

import numpy as np
from PIL import Image

from ageborn_art import config as C
from ageborn_art import render, scene, sheet
from ageborn_art.geometry import Geo
from ageborn_art.rig import Rig

from world.common import _jitter, box, cyl, rock  # noqa: F401  (re-exported for the age modules)

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(HERE))))

# layer frames in lane lu (must match src/visuals/backdrops: BACK_FRAME, FAR_FRAME, MID_FRAME, GROUND_FRAME)
X0, WIDTH = -260.0, 1720.0
FRAMES = {
    "back": {"yTop": -600.0, "height": 420.0, "ppl": 0.7, "elev": 5.0},
    "far": {"yTop": -560.0, "height": 580.0, "ppl": 0.9, "elev": 8.0},
    "mid": {"yTop": -300.0, "height": 320.0, "ppl": 1.2, "elev": 12.0},
    "ground": {"yTop": -40.0, "height": 290.0, "ppl": 1.3, "elev": 16.0},
}
# post-render look per layer: desaturation, haze toward the horizon colour (top, foot)
LOOK = {"back": (0.30, 0.30, 0.40), "far": (0.22, 0.14, 0.26), "mid": (0.14, 0.04, 0.12)}
# the mid strip's 2D outline (sheet.outline width px, fill factor, value cap)
MID_OUTLINE = (1.6, 0.62, 0.55)
# PLAN 2b size budget per scene (bytes)
BUDGET = {"back": 14 * 1024, "far": 38 * 1024, "mid": 48 * 1024, "props": 14 * 1024, "thumb": 8 * 1024,
          "json": 3 * 1024, "total": 110 * 1024}
# the lane multiplies the mid strip a little darker (backdropView MID_LAYER_TINT)
MID_LANE_TINT = 0xDCDAD6
THUMB = {"w": 320, "h": 180, "x0": 170.0, "x1": 1080.0, "y1": 36.0}


# -- colours ------------------------------------------------------------------------------------
def hx(v):
    return "#%06X" % v


def mixc(a, b, t):
    ar, ag, ab = (a >> 16) & 255, (a >> 8) & 255, a & 255
    br, bg, bb = (b >> 16) & 255, (b >> 8) & 255, b & 255
    return (round(ar + (br - ar) * t) << 16) | (round(ag + (bg - ag) * t) << 8) | round(ab + (bb - ab) * t)


def dk(a, p):
    return mixc(a, 0, p)


def lt(a, p):
    return mixc(a, 0xFFFFFF, p)


def rgb01(v):
    return np.array([(v >> 16) & 255, (v >> 8) & 255, v & 255], np.float32) / 255.0


def hexint(s):
    return int(s.lstrip("#"), 16)


# -- the stage ----------------------------------------------------------------------------------
class Stage:
    """A static scene: parts on the root joint of a rig, rendered once.

    `layer` picks the camera elevation, px per lu and post look; `frame` overrides the frame
    (x0, width, yTop, height in lu) for a prop canvas."""

    def __init__(self, layer, frame=None):
        f = dict(FRAMES[layer])
        f.update({"x0": X0, "width": WIDTH})
        if frame:
            f.update(frame)
        self.layer = layer
        self.f = f
        C.set_render_scale(f["ppl"] / C.PX_PER_LU_1X)
        C.FILTER_WIDTH = 1.0
        C.CAMERA_ELEVATION_DEG = f["elev"]
        scene.reset()
        self.w = int(round(f["width"] * f["ppl"]))
        self.h = int(round(f["height"] * f["ppl"]))
        self.feet = (-f["x0"] * f["ppl"], -f["yTop"] * f["ppl"])
        cam = scene.camera(self.w, self.h, self.feet)
        e = math.radians(f["elev"])
        from mathutils import Vector
        cam.location = cam.location - Vector((0.0, math.cos(e), -math.sin(e))) * 3000.0
        cam.data.clip_end = 12000.0
        self.rig = Rig("bd", yaw=0.0)
        self.rig.joint("all", "root", (0, 0, 0))
        self.ambient = []
        self.lights = []

    def part(self, g, color, outline=0.6, finish="matte", glow=None, highlight=True, joint="all"):
        if glow:
            self.rig.part(joint, g, glow=glow, outline=0)
        else:
            self.rig.part(joint, g, hx(color) if isinstance(color, int) else color, outline=outline, finish=finish,
                          highlight=highlight)

    def screen(self, p):
        """Screen lu (x right, y DOWN, lane space) of a 3D point."""
        e = math.radians(C.CAMERA_ELEVATION_DEG)
        x, y, z = p
        return (round(x, 1), round(-(z * math.cos(e) + y * math.sin(e)), 1))

    def amb(self, kind, part, p, layer=None, **k):
        """A code-drawn ambient spec (emit, blink, rotate, drift) at a 3D point."""
        x, y = self.screen(p)
        spec = {"kind": kind, "part": part, "x": x, "y": y, "layer": layer or self.layer}
        spec.update(k)
        self.ambient.append(spec)

    def light(self, p, r=5.0):
        """A window or lantern point that night skies light up (PLAN 2b `lights`)."""
        x, y = self.screen(p)
        self.lights.append({"layer": self.layer, "x": x, "y": y, "r": round(r, 1)})

    def render(self, path):
        self.rig.apply({})
        render._update()
        self.rig.set_pass(False)
        render.render_to(path)
        return path


# -- shared shapes (the first five ages' classic strips use these unchanged) ----------------------
def pine(g, x, y, h, r):
    for k in range(3):
        z0 = h * (0.22 + k * 0.24)
        g.lathe([(0, 0), (r * (1 - k * 0.22), 0), (r * 0.08, h * 0.42), (0, h * 0.44)], (x, y, z0), (x, y, z0 + h * 0.44), segs=9)
    return g


def round_tree(g, x, y, r, seed):
    rnd = random.Random(seed)
    for k in range(5):
        a = k * 1.3
        g.sphere((x + math.cos(a) * r * 0.45, y - 2, r * 1.3 + math.sin(a) * r * 0.35 + rnd.uniform(-2, 2)),
                 r * rnd.uniform(0.55, 0.75), cuts=3)
    return g


def ridge(st, color, x0, x1, base_z, height, depth, seed, lumps=9, jag=0.18, peaks=True, outline=0.0):
    """A mountain or hill ridge: overlapping peaks (lathed cones with a shoulder, lumpy) whose lit and
    shaded flanks give the toon light real form; `peaks=False` makes rounded hills."""
    g = Geo()
    rnd = random.Random(seed)
    n = lumps
    for i in range(n):
        x = x0 + (x1 - x0) * (i + rnd.uniform(0.1, 0.9)) / n
        h = height * rnd.uniform(0.6, 1.1)
        rx = (x1 - x0) / n * rnd.uniform(0.9, 1.4)
        if peaks:
            n0 = len(g.bm.verts)
            prof = [(0, 0), (rx, 0), (rx * 0.62, h * 0.42), (rx * rnd.uniform(0.18, 0.3), h * 0.9), (rx * 0.06, h), (0, h * 1.01)]
            g.lathe(prof, (x, depth + rnd.uniform(-30, 30), base_z), (x, depth, base_z + h), segs=10,
                    rot=(0, 0, rnd.uniform(0, 36)), squash=(1.0, 0.5))
            _jitter(g, n0, (x, depth, base_z + h * 0.4), jag * 0.6, seed + i, 2.2 / max(1.0, rx * 0.5))
        else:
            rock(g, (x, depth, base_z), (rx, 60, h), seed=seed + i, jag=jag, p=2.2, cuts=4)
    st.part(g, color, outline=outline)


def castle(g_body, g_roof, x, y, z, s):
    box(g_body, (x, y, z + 40 * s), (60 * s, 20, 40 * s), p=6)
    for dx in (-66, 66):
        cyl(g_body, (x + dx * s, y, z), (x + dx * s, y, z + 110 * s), 16 * s, bevel=1, segs=16)
        g_roof.lathe([(0, 0), (19 * s, 0), (0.5, 42 * s), (0, 44 * s)], (x + dx * s, y, z + 110 * s), (x + dx * s, y, z + 154 * s), segs=16)
    box(g_body, (x, y + 10, z + 90 * s), (22 * s, 18, 70 * s), p=6)
    g_roof.lathe([(0, 0), (30 * s, 0), (0.5, 56 * s), (0, 58 * s)], (x, y + 10, z + 160 * s), (x, y + 10, z + 218 * s), segs=4, rot=(0, 0, 45))
    for k in range(7):
        box(g_body, (x - 54 * s + k * 18 * s, y - 16, z + 84 * s), (5 * s, 4, 6 * s), p=5)


def ground_band(st, color, z=30, seed=1, depth=80):
    """A low band of soft hills under a mid strip (so its trees and houses never float)."""
    g = Geo()
    rnd = random.Random(seed)
    for i in range(14):
        x = -300 + i * 140
        rock(g, (x, depth, z - 30), (100, 60, 30 + rnd.uniform(0, 14)), seed=i, jag=0.05, p=2.4)
    st.part(g, color, outline=0.0)


# -- post-processing ------------------------------------------------------------------------------
def horizon_of(P):
    return rgb01(mixc(P["skyBottom"], P["light"], 0.35))


def haze_at(layer, y_lu, look=None):
    """The haze amount `finish_layer` gives a row at screen y (lu) of a layer."""
    desat, haze_top, haze_foot = look or LOOK[layer]
    f = FRAMES[layer]
    t = min(1.0, max(0.0, (y_lu - f["yTop"]) / max(1.0, -f["yTop"])))
    return haze_top + (haze_foot - haze_top) * t ** 2


def finish_layer(arr, P, layer, haze_y=None, look=None):
    """Desaturate and haze toward the horizon colour (more at the foot). `haze_y` fixes the haze at
    one row (a prop canvas, whose rows are not the layer's); `look` overrides the layer's LOOK (a scene
    without air, such as the moon, keeps more contrast)."""
    desat, haze_top, haze_foot = look or LOOK[layer]
    rgb, a = arr[..., :3], arr[..., 3:4]
    luma = (rgb * np.array([0.3, 0.59, 0.11], np.float32)).sum(-1, keepdims=True)
    rgb = rgb + (luma - rgb) * desat
    horizon = horizon_of(P)
    if haze_y is not None:
        haze = haze_at(layer, haze_y, look)
    else:
        h = arr.shape[0]
        f = FRAMES[layer]
        foot = (-f["yTop"]) * f["ppl"]            # the ground line's row
        rows = np.arange(h, dtype=np.float32)[:, None, None]
        t = np.clip(rows / max(1.0, foot), 0, 1)
        haze = haze_top + (haze_foot - haze_top) * t ** 2
    rgb = rgb + (horizon - rgb) * haze
    return np.concatenate([np.clip(rgb, 0, 1), a], -1)


def fade_bottom(arr, layer, lu):
    """Fades a strip's alpha out over its lowest `lu` (the back strip ends in the sky, never a cut edge)."""
    f = FRAMES[layer]
    h = arr.shape[0]
    n = max(1, int(round(lu * f["ppl"])))
    w = np.ones((h,), np.float32)
    ramp = np.linspace(1.0, 0.0, n, dtype=np.float32)
    w[h - n:] = ramp ** 1.6
    out = arr.copy()
    out[..., 3] *= w[:, None]
    return out


def save_webp(arr, path, alpha=True, q=86):
    im = Image.fromarray((np.clip(arr, 0, 1) * 255 + 0.5).astype(np.uint8), "RGBA")
    if not alpha:
        im = im.convert("RGB")
    im.save(path, "WEBP", quality=q, method=6)
    return os.path.getsize(path)


def save_webp_budget(arr, path, budget, q=86, q_min=60, alpha_q=None):
    """Saves at the highest quality (steps of 4) that fits `budget` bytes; returns (size, q)."""
    im = Image.fromarray((np.clip(arr, 0, 1) * 255 + 0.5).astype(np.uint8), "RGBA")
    size = 0
    while True:
        kw = {"quality": q, "method": 6}
        if alpha_q is not None:
            kw["alpha_quality"] = alpha_q
        im.save(path, "WEBP", **kw)
        size = os.path.getsize(path)
        if size <= budget or q <= q_min:
            return size, q
        q -= 4


# -- the colour rule (PLAN 2b, DESIGN A11) ---------------------------------------------------------
def hsv_arrays(rgb):
    mx = rgb.max(-1)
    mn = rgb.min(-1)
    d = np.maximum(mx - mn, 1e-6)
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    h = np.where(mx == r, ((g - b) / d) % 6, np.where(mx == g, (b - r) / d + 2, (r - g) / d + 4)) * 60.0
    s = np.where(mx > 1e-6, (mx - mn) / np.maximum(mx, 1e-6), 0)
    return h, s, mx


def color_rule_share(arr, min_alpha=0.5):
    """Share of opaque pixels in a team-hue band (350-81, 182-254 degrees) with saturation above 40%
    and value above 40% (A11: backdrops stay desaturated; dark pixels and small accents are fine)."""
    rgb, a = arr[..., :3], arr[..., 3]
    h, s, v = hsv_arrays(rgb)
    band = (h >= 350) | (h <= 81) | ((h >= 182) & (h <= 254))
    op = a > min_alpha
    bad = band & (s > 0.40) & (v > 0.40) & op
    return float(bad.sum()) / max(1, int(op.sum()))


# -- props: small rigs rendered with the layer's camera, packed into props.webp -------------------
class Prop:
    """A sprite for ambient motion on a layer: `build(rig)` adds parts to joints under `all`; `poses` is
    one pose dict per frame. `box` is the canvas (w, up, down) in lu around the anchor (the rig's
    origin, ax/ay); `haze_y` is the screen y (lu, layer space) the prop sits at, for its haze."""

    def __init__(self, name, layer, build, poses, box, haze_y, outline=None):
        self.name = name
        self.layer = layer
        self.build = build
        self.poses = poses
        self.box = box
        self.haze_y = haze_y
        self.outline = (layer == "mid") if outline is None else outline


def render_props(props, P, out_dir, log=print, looks=None):
    """Renders every prop frame, finishes it like its layer, trims and packs. Returns (atlas image,
    frames dict) or (None, {})."""
    if not props:
        return None, {}
    frames = []
    for pr in props:
        w, up, down = pr.box
        f = FRAMES[pr.layer]
        st = Stage(pr.layer, {"x0": -w / 2, "width": w, "yTop": -up, "height": up + down})
        rig = st.rig
        pr.build(rig)
        for i, pose in enumerate(pr.poses):
            rig.apply(pose)
            render._update()
            rig.set_pass(False)
            path = os.path.join(out_dir, f"prop_{pr.name}_{i}.png")
            render.render_to(path)
            arr = sheet.load(path)
            if pr.outline:
                arr, _ = sheet.outline(arr, None, *MID_OUTLINE, seed_inset_px=2)
            arr = finish_layer(arr, P, pr.layer, haze_y=pr.haze_y, look=(looks or {}).get(pr.layer))
            im = sheet.to_image(arr)
            x0, y0, x1, y1 = sheet.bbox(im)
            crop = im.crop((x0, y0, x1, y1))
            ax = (st.feet[0] - x0) / max(1, x1 - x0)
            ay = (st.feet[1] - y0) / max(1, y1 - y0)
            frames.append((f"{pr.name}_{i}", crop, round(ax, 4), round(ay, 4), f["ppl"]))
            os.remove(path)
        log(f"  prop {pr.name}: {len(pr.poses)} frames")
    atlas, pos = sheet.pack([fr[1] for fr in frames])
    # each frame as [x, y, w, h, ax, ay, ppl]: px in the atlas, the anchor as a fraction, px per lu
    meta = {}
    for (name, crop, ax, ay, ppl), (x, y) in zip(frames, pos):
        meta[name] = [x, y, crop.size[0], crop.size[1], round(ax, 3), round(ay, 3), ppl]
    return atlas, meta


# -- the thumbnail --------------------------------------------------------------------------------
def sky_strip(sky, w, h, y0, y1):
    """The scene's daylight sky as an RGBA array over screen rows y0..y1 (lu): zenith, mid band,
    horizon glow (the gradient the game paints from the same colours)."""
    top, bottom, horizon = rgb01(hexint(sky["top"])), rgb01(hexint(sky["bottom"])), rgb01(hexint(sky["horizon"]))
    ys = np.linspace(y0, y1, h, dtype=np.float32)
    t = np.clip((ys - (-780.0)) / 800.0, 0, 1)[:, None]
    zen = top * 0.82 + rgb01(0x1C2030) * 0.18 if sky.get("night") else top
    c = np.where(t < 0.35, zen + (top - zen) * (t / 0.35),
                 np.where(t < 0.72, top + ((top * 0.25 + bottom * 0.75) - top) * ((t - 0.35) / 0.37),
                          np.where(t < 0.9, (top * 0.25 + bottom * 0.75) + (bottom - (top * 0.25 + bottom * 0.75)) * ((t - 0.72) / 0.18),
                                   bottom + (horizon - bottom) * ((t - 0.9) / 0.1))))
    out = np.ones((h, w, 4), np.float32)
    out[..., :3] = np.repeat(c[:, None, :], w, axis=1)
    return out


def _resample(arr, layer, crop, k, w, h):
    """The part of a layer strip under the crop, at k px per lu, as an RGBA canvas w x h."""
    f = FRAMES[layer]
    ppl = f["ppl"]
    im = sheet.to_image(arr)
    sx0 = (crop["x0"] - X0) * ppl
    sx1 = (crop["x1"] - X0) * ppl
    sy0 = (crop["y0"] - f["yTop"]) * ppl
    sy1 = (crop["y1"] - f["yTop"]) * ppl
    # crop in source px (may extend past the strip: pad with transparency)
    pad = Image.new("RGBA", (im.size[0] + 2000, im.size[1] + 2000), (0, 0, 0, 0))
    pad.paste(im, (1000, 1000))
    box_ = (int(round(sx0 + 1000)), int(round(sy0 + 1000)), int(round(sx1 + 1000)), int(round(sy1 + 1000)))
    part = pad.crop(box_).resize((w, h), Image.LANCZOS)
    return np.asarray(part, dtype=np.float32) / 255.0


def thumbnail(sky, layers, ground, out_path, budget=BUDGET["thumb"]):
    """A 320 x 180 tile: sky gradient, back, far, mid (with the lane's mid tint) and a neutral ground strip."""
    w, h = THUMB["w"], THUMB["h"]
    k = w / (THUMB["x1"] - THUMB["x0"])
    y1 = THUMB["y1"]
    y0 = y1 - h / k
    crop = {"x0": THUMB["x0"], "x1": THUMB["x1"], "y0": y0, "y1": y1}
    canvas = sky_strip(sky, w, h, y0, y1)
    sun = sky.get("sunAt")
    if sun and sky.get("celestial") == "sun":
        sxp, syp, sr = (sun[0] - crop["x0"]) * k, (sun[1] - y0) * k, sun[2] * k
        yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
        d = np.sqrt((xx - sxp) ** 2 + (yy - syp) ** 2)
        glow = np.clip(1 - d / (sr * 6), 0, 1) ** 2 * 0.45
        disc = np.clip(sr + 0.8 - d, 0, 1)
        sc = rgb01(0xFFF6E2)
        canvas[..., :3] = canvas[..., :3] + (sc - canvas[..., :3]) * np.maximum(glow, disc)[..., None]
    for layer in ("back", "far", "mid"):
        if layer not in layers:
            continue
        part = _resample(layers[layer], layer, crop, k, w, h)
        if layer == "mid":
            part[..., :3] *= rgb01(MID_LANE_TINT)
        canvas = sheet.over(part, canvas)
    # the ground strip: the verge edge, a worn lane and a darker front lip
    gy = lambda y: int(round((y - y0) * k))  # noqa: E731
    g = ground
    canvas[gy(-30):gy(-24), :, :3] = rgb01(g["grass"])
    canvas[gy(-24):gy(26), :, :3] = rgb01(g["top"])
    canvas[gy(-10):gy(8), :, :3] = rgb01(g["path"])
    canvas[gy(26):, :, :3] = rgb01(g["face"])
    canvas[gy(26):gy(28), :, :3] = rgb01(dk(g["top"], 0.15))
    canvas[..., 3] = 1.0
    im = sheet.to_image(canvas).convert("RGB")
    q = 82
    while True:
        im.save(out_path, "WEBP", quality=q, method=6)
        size = os.path.getsize(out_path)
        if size <= budget or q <= 50:
            return size, canvas
        q -= 4


NEUTRAL_GROUND = {
    "earth": dict(top=0x9C9478, path=0xA89E80, grass=0x7E8A56, face=0x6C6252),
    "deck": dict(top=0x8E8CA0, path=0x9A98AA, grass=0x6E6A88, face=0x4A4660),
}


# -- the scene ------------------------------------------------------------------------------------
class Scene:
    """One age's scenery. `pal`: colours for the haze and builders (skyTop, skyBottom, light, ...);
    `sky`: the daylight sky the game paints (hex strings: top, bottom, horizon, cloudTint, celestial,
    sunAt [x, y, r], stars, smog, night); `far`, `mid`, `back`: builders `fn(st, P)`; `props()`:
    returns (list of Prop, list of sprite specs); `hints`: celestial keep|own, weather ground|space, and
    skyGrade 0..1 (how strongly a light sky theme may grade the scene; pale or dark scenes take less).
    `version=1` writes the first five ages' classic format (two strips, no sky, props or thumb)."""

    def __init__(self, age, sid, pal, far, mid, back=None, sky=None, props=None, hints=None, version=2,
                 ground="earth", back_fade=26.0, look=None):
        self.age = age
        self.sid = sid
        self.pal = pal
        self.far = far
        self.mid = mid
        self.back = back
        self.sky = sky
        self.props = props
        self.hints = hints or {"celestial": "keep", "weather": "ground"}
        self.version = version
        self.ground = ground
        self.back_fade = back_fade
        self.look = look or {}

    @property
    def key(self):
        return f"{self.age}.{self.sid}"


MAX_LIGHTS = 16


def compact_ambient(specs):
    """Ambient specs without their layer (the strip that holds them implies it), numbers rounded, and
    specs that differ only in position merged into one with `at: [[x, y], ...]`."""
    out, groups = [], {}
    for a in specs:
        b = {k: (round(v, 1) if isinstance(v, float) else v) for k, v in a.items() if k != "layer"}
        key = json.dumps({k: v for k, v in b.items() if k not in ("x", "y")}, sort_keys=True)
        if key in groups:
            g = groups[key]
            if "at" not in g:
                g["at"] = [[g.pop("x"), g.pop("y")]]
            g["at"].append([b["x"], b["y"]])
        else:
            groups[key] = b
            out.append(b)
    return out


def compact_sprites(sprites):
    """Path group members without zero offsets or phases (the loader's defaults)."""
    out = []
    for s in sprites:
        s = dict(s)
        if "group" in s:
            s["group"] = [{k: v for k, v in m.items() if not (k in ("dx", "dy", "phase") and v == 0)} for m in s["group"]]
        out.append(s)
    return out


def compact_lights(lights):
    """At most MAX_LIGHTS light points, spread evenly over the scene, grouped by strip as [x, y, r]."""
    if len(lights) > MAX_LIGHTS:
        lights = sorted(lights, key=lambda l: l["x"])
        step = len(lights) / MAX_LIGHTS
        lights = [lights[int(i * step)] for i in range(MAX_LIGHTS)]
    out = {}
    for l in lights:
        out.setdefault(l["layer"], []).append([round(l["x"]), round(l["y"]), round(l["r"], 1)])
    return out


def layer_meta(layer, image, ambient):
    f = FRAMES[layer]
    return {"image": image, "x0": X0, "width": WIDTH, "yTop": f["yTop"], "height": f["height"], "pxPerLu": f["ppl"],
            "ambient": ambient}


def render_scene(sc, out, install=True, log=print):
    """Renders, finishes, packs and (optionally) installs one scene. Returns a size report dict."""
    tag = sc.key
    work = os.path.join(out, tag)
    os.makedirs(work, exist_ok=True)
    P = sc.pal
    arrays, meta, sizes, lights = {}, {}, {}, []
    order = [("back", sc.back), ("far", sc.far), ("mid", sc.mid)]
    for layer, fn in order:
        if fn is None:
            continue
        st = Stage(layer)
        fn(st, P)
        raw = st.render(os.path.join(work, f"{layer}_raw.png"))
        arr = sheet.load(raw)
        os.remove(raw)
        if layer == "mid":
            arr, _ = sheet.outline(arr, None, *MID_OUTLINE, seed_inset_px=2)
        arr = finish_layer(arr, P, layer, look=sc.look.get(layer))
        if layer == "back":
            arr = fade_bottom(arr, layer, sc.back_fade)
        arrays[layer] = arr
        dst = os.path.join(work, f"{layer}.webp")
        if sc.version == 1:
            sizes[layer] = save_webp(arr, dst, alpha=True, q=88)
        else:
            sizes[layer], q = save_webp_budget(arr, dst, BUDGET[layer], q=88)
            log(f"[{tag}.{layer}] {sizes[layer] / 1024:.1f} KB (q{q}), {len(st.ambient)} ambient, {len(st.lights)} lights")
        meta[layer] = layer_meta(layer, f"{layer}.webp", st.ambient if sc.version == 1 else compact_ambient(st.ambient))
        lights += st.lights
    if sc.version == 1:
        with open(os.path.join(work, "layers.json"), "w") as fh:
            json.dump(meta, fh, separators=(",", ":"))
        if sc.sky:
            sizes["thumb"], _ = thumbnail(sc.sky, arrays, NEUTRAL_GROUND[sc.ground], os.path.join(work, "thumb.webp"))
        if install:
            dest = os.path.join(REPO, "public", "art", "backdrops", sc.age)
            os.makedirs(dest, exist_ok=True)
            names = ["far.webp", "mid.webp", "layers.json"] + (["thumb.webp"] if sc.sky else [])
            for name in names:
                shutil.copyfile(os.path.join(work, name), os.path.join(dest, name))
        return {"scene": tag, "version": 1, "sizes": sizes}
    doc = {"version": 2, "age": sc.age, "scene": sc.sid, "sky": sc.sky}
    for layer in ("back", "far", "mid"):
        if layer in meta:
            doc[layer] = meta[layer]
    if sc.props:
        props, sprites = sc.props()
        atlas, frames = render_props(props, P, work, log, looks=sc.look)
        if atlas is not None:
            p = os.path.join(work, "props.webp")
            arr = np.asarray(atlas, dtype=np.float32) / 255.0
            sizes["props"], q = save_webp_budget(arr, p, BUDGET["props"], q=90)
            log(f"[{tag}.props] {sizes['props'] / 1024:.1f} KB (q{q}), {len(frames)} frames")
            doc["props"] = {"image": "props.webp", "frames": frames, "sprites": compact_sprites(sprites)}
    if lights:
        doc["lights"] = compact_lights(lights)
    doc["hints"] = sc.hints
    doc["thumb"] = "thumb.webp"
    sizes["thumb"], _ = thumbnail(sc.sky, arrays, NEUTRAL_GROUND[sc.ground], os.path.join(work, "thumb.webp"))
    text = json.dumps(doc, separators=(",", ":"))
    with open(os.path.join(work, "layers.json"), "w") as fh:
        fh.write(text)
    sizes["json"] = len(text.encode())
    total = sum(sizes.values())
    rule = {layer: round(color_rule_share(arrays[layer]) * 100, 2) for layer in arrays}
    log(f"[{tag}] total {total / 1024:.1f} KB of {BUDGET['total'] // 1024} KB; colour rule {rule} %")
    if install:
        dest = os.path.join(REPO, "public", "art", "backdrops", sc.age, sc.sid)
        os.makedirs(dest, exist_ok=True)
        for name in os.listdir(work):
            if name.endswith(".webp") or name == "layers.json":
                shutil.copyfile(os.path.join(work, name), os.path.join(dest, name))
    return {"scene": tag, "version": 2, "sizes": sizes, "total": total, "rule": rule}


def thumb_from_installed(sc, out, install=True, log=print):
    """A format 1 classic's thumbnail from its installed strips (no render)."""
    src = os.path.join(REPO, "public", "art", "backdrops", sc.age)
    arrays = {layer: np.asarray(Image.open(os.path.join(src, f"{layer}.webp")).convert("RGBA"), dtype=np.float32) / 255.0
              for layer in ("far", "mid")}
    dst = os.path.join(src, "thumb.webp") if install else os.path.join(out, f"{sc.age}_thumb.webp")
    size, _ = thumbnail(sc.sky, arrays, NEUTRAL_GROUND[sc.ground], dst)
    log(f"[{sc.key}.thumb] {size} bytes")
    return size
