"""Base decorations as Blender props (PLAN 2a "Decorations", round 3; owner item 18: "the Customize items are very
coarse"): the 24 props a side stands in the three anchor spots before its base (DESIGN A18.9.4), modelled on the
base pipeline so they read as one family with the base behind them: the same toon light and shadow band, the
colour-matched outer line and rim light, the same view (BASE_YAW) and the shipped sheet at 1.23 px/lu.

Sheet contract (`public/art/cosmetics/decorations/<id>.{png,json}`, frame names `deco_<id>_...`):

| Clip | Frames | Content |
|---|---|---|
| `body` | 1 | the prop at rest (the moving part hidden) |
| `loop` | 4, loop (optional) | only the moving part, drawn over `body` at the same anchor: a banner's cloth (the sway, baked like the base flags), a brazier's flame, the plasma orb's swirl |

Each clip has a `_team` twin where the prop has team parts (banners, a shield, a plume, a chest panel).
`meta.ageborn` adds `kind: 'decoration'`, `id`, `motion` (what the code adds: `sway` for plants, `flicker` for
fire and lamps, `pulse` for the plasma brazier, `glint` for the crystal flower and the star), `glowLu` (the light
the code flickers: screen lu from the foot, y up, radius, colour), `glintsLu`, `shadowLu` (the contact shadow's
half width) and `mirror` (false for banners: their cloth flies with the lane's one wind on both sides).

Run (from the repo root, with the bpy venv): render_world.py --only decoration.fire_bowl (or `decoration.*`), then
render_world.py --deco-thumbs to rebuild the Customize HD thumbnail atlas (`thumbs.webp`, 2.46 px/lu) from the
HD sheets the renders left in --out.
"""
import math
import random
from types import SimpleNamespace

from mathutils import Matrix, Vector

from ageborn_art.anim import Clip, merge
from ageborn_art.geometry import Geo, _euler

from world.base_skins_kit import leaf
from world.common import BASE_YAW, _jitter, box, chipped_cracks, cyl, project, rock

DECO_YAW = BASE_YAW
LOOP_MS = 120
# the bases' and units' colour-matched outer line (config.UNIT_OUTLINE_V3: 2.5 px at 1x, fill x 0.55, value
# <= 0.50), a touch thinner for props a sixth of a base's height (small parts are not swallowed by it) and a touch
# darker: many props are pale (marble, bone, gold, a white suit), whose x 0.55 line read as a khaki halo
PROP_OUTLINE = (2.1, 0.46, 0.42)
# a flame's own edge: thin and warm (fill x 0.82), never the body's dark line
FIRE_LINE = (1.0, 0.82, 1.0)

# -- shared palette (A11 age palettes; large areas stay out of the saturated team bands) ----------
STONE = "#8C7B68"        # Stone age stone brown
STONE_LT = "#A4927D"
STONE_DK = "#6E6052"
GREY = "#A59D8F"         # carved grey stone
GREY_LT = "#BDB6AA"
GREY_DK = "#857D71"
MOSS = "#6E8B3D"
MOSS_DK = "#58713A"
EARTH = "#6B5440"
EARTH_DK = "#54412F"
SOOT = "#3A322B"
CHAR = "#3B2E26"
WOOD = "#7A5A3C"
WOOD_DK = "#5C4330"
WOOD_LT = "#957255"
IRON = "#4A4F58"
IRON_DK = "#353941"
IRON_LT = "#6A707B"
BONE = "#EDE3C8"
BONE_DK = "#CFC3A2"
FIRE_OUT = "#EE9A5C"     # the bases' cartoon fire (base_skins_kit.flames)
FIRE = "#FFC47A"
FIRE_CORE = "#FFF0CC"
EMBER = "#FF9A4D"
FERN = "#66973E"         # foliage ramp (uiart AUDIT 3.3), a little brighter: the base's moss caps beside it
FERN_DK = "#527E34"
FERN_LT = "#7CAB4A"
FERN_STEM = "#4E6B2E"


def deco_module(slug, name, build, height, canvas=(150, 160), feet=(75, 140), team=False, loop=None, glow=None,
                motion=None, glints=(), mirror=True, shadow=16.0, loop_ms=LOOP_MS, loop_outline="body",
                outline=PROP_OUTLINE):
    """A pipeline module for `decoration.<slug>`.

    build(rig): adds parts under the joint `body` (static) and, when `loop` is given, under the joint `loop`
    (the moving part, hidden in the body frame). loop: (frames, pose(f) -> dict) for the `loop` clip, which
    hides the body. glow: (character-space point, radius lu, '#RRGGBB'); glints: [(point, radius)];
    shadow: the contact shadow's half width (lu). loop_outline: "body" outlines the loop like the body (a
    banner's cloth), else a pipeline outline spec or None for the loop alone (a flame: FIRE_LINE).
    outline: the outer line (px at 1x, fill factor, value cap)."""

    def _build(rig):
        rig.joint("body", "root", (0, 0, 0))
        if loop:
            rig.joint("loop", "root", (0, 0, 0))
        build(rig)

    def clips():
        out = [Clip("body", 1, lambda f: {"loop": {"hide": True}} if loop else {}, durations=[1000])]
        if loop:
            n, pose = loop
            out.append(Clip("loop", n, lambda f: merge({"body": {"hide": True}}, pose(f)), loop=True,
                            durations=loop_ms))
        return out

    meta = {"kind": "decoration", "id": slug, "motion": motion, "mirror": mirror, "shadowLu": round(shadow, 1)}
    if glow:
        p, r, color = glow
        x, y = project(p, DECO_YAW)
        meta["glowLu"] = {"x": x, "y": y, "r": round(r, 1), "color": color}
    if glints:
        meta["glintsLu"] = [dict(zip(("x", "y"), project(p, DECO_YAW)), r=round(r, 1)) for p, r in glints]
    mod = SimpleNamespace(
        SLUG=f"deco_{slug}", FILE_SLUG=slug, VISUAL_ID=f"decoration.{slug}", NAME=name, HEIGHT_LU=height,
        CANVAS=canvas, FEET=feet, YAW_DEG=DECO_YAW, TEAM=team, OUTER_OUTLINE=outline,
        ANCHORS={"head": (0, height), "hitCenter": (0, height * 0.5)},
        EXTRA_META=meta, build=_build, clips=clips, AGE="decorations", DECO=slug,
    )
    if loop and loop_outline != "body":
        mod.LOOP_OUTLINE = loop_outline
    return mod


# -- helpers --------------------------------------------------------------------------------------
def rough(g, n0, center, amount=0.06, seed=0, freq=0.18):
    """Hand-carved unevenness on the vertices added since n0 (stone bowls, plinths)."""
    return _jitter(g, n0, center, amount, seed, freq)


def nverts(g):
    g.bm.verts.ensure_lookup_table()
    return len(g.bm.verts)


def front_arc(r, a0=205.0, a1=335.0, n=7):
    """Angles (degrees) across the camera-facing half of a round object (y < 0), for bands and carvings."""
    return [math.radians(a0 + (a1 - a0) * i / max(1, n - 1)) for i in range(n)]


def orient(d):
    """Euler (rx, ry, rz) degrees turning the local +X axis onto direction d (for blobs laid along a line)."""
    dx, dy, dz = d
    return (0.0, -math.degrees(math.atan2(dz, math.hypot(dx, dy))), math.degrees(math.atan2(dy, dx)))


def torus(g, center, R, r, segs=32, rsegs=8, rot=(0.0, 0.0, 0.0)):
    """A ring (no caps, unlike a lathe of a ring profile, which closes its ends into discs): radius R about the
    local z axis, tube radius r, turned by `rot` (degrees) about its centre."""
    verts, faces = [], []
    for i in range(segs):
        a = 2 * math.pi * i / segs
        for j in range(rsegs):
            b = 2 * math.pi * j / rsegs
            rr = R + r * math.cos(b)
            verts.append((rr * math.cos(a), rr * math.sin(a), r * math.sin(b)))
    for i in range(segs):
        for j in range(rsegs):
            i2, j2 = (i + 1) % segs, (j + 1) % rsegs
            faces.append([i * rsegs + j, i2 * rsegs + j, i2 * rsegs + j2, i * rsegs + j2])
    return g._add(verts, faces, Matrix.Translation(Vector(center)) @ _euler(rot))


def flame_variants(rig, parent, base, k=1.0, n=4, seed=0, name="flame"):
    """`n` hidden flame joints under `parent` (show one per loop frame): the bases' cartoon fire in tongues that
    lick up and lean differently on every frame (outer, body, hot core; no outline on the core)."""
    rnd = random.Random(seed)
    x, y, z = base
    # every tongue keeps its place and changes its height and lean from frame to frame, so the fire flickers
    # in place instead of jumping: (x offset, half width, height, phase)
    tongues = [(0.0, 5.0, 22.0, 0.0), (-5.6, 3.6, 14.5, 2.1), (5.4, 3.4, 13.5, 4.0), (-2.4, 2.6, 10.0, 1.2),
               (2.8, 2.4, 11.0, 3.3)]
    for f in range(n):
        jn = f"{name}{f}"
        rig.joint(jn, parent, base, hidden=True)
        o, g, c = Geo(), Geo(), Geo()
        u = 2 * math.pi * f / n
        for i, (dx, r, h, ph) in enumerate(tongues):
            hh = h * (1.0 + 0.18 * math.sin(u + ph) + rnd.uniform(-0.04, 0.04))
            lean = 0.34 * math.sin(u + ph + 1.3) + 0.12 * (1 if dx > 0 else -1 if dx < 0 else 0)
            cx, cz = x + dx * k, z + hh * 0.36 * k
            # a teardrop: a round foot down in the logs, the point licking up and leaning
            o.blob((cx, y + 1.2, cz), (r * k, r * 0.8 * k, hh * 0.64 * k), p=2.0, cuts=4, taper=(1.0, 0.04),
                   shift=(lean * 1.3, 0.0))
            g.blob((cx, y - 0.4, cz - 0.6 * k), (r * 0.7 * k, r * 0.6 * k, hh * 0.5 * k), p=2.0, cuts=4,
                   taper=(1.0, 0.06), shift=(lean * 1.1, 0.0))
            if i < 3:
                c.blob((cx, y - 2.0, cz - 2.2 * k), (r * 0.42 * k, r * 0.36 * k, hh * 0.27 * k), p=2.0, cuts=3,
                       taper=(1.0, 0.18), shift=(lean * 0.6, 0.0))
        rig.part(jn, o, glow=FIRE_OUT, outline=0)
        rig.part(jn, g, glow=FIRE, outline=0)
        rig.part(jn, c, glow=FIRE_CORE, outline=0)
    return lambda f: {f"{name}{i}": {"show": i == f} for i in range(n)}


# =================================================================================================
# Braziers
# =================================================================================================
def build_fire_bowl(rig):
    """Every player's first prop: a hand-carved stone fire bowl on a rough stone stem and a flat foot stone,
    a zig-zag band carved round its belly, soot licking up over the rim, charred logs and embers inside."""
    # the foot: a flat field stone, a pebble or two beside it, a tuft of moss
    g = Geo()
    rock(g, (0.0, 2.0, 2.0), (12.5, 9.5, 2.6), seed=3, jag=0.12, p=3.0)
    rock(g, (-12.5, -2.0, 1.4), (3.2, 2.6, 1.8), seed=4, jag=0.2)
    rock(g, (11.0, -4.0, 1.1), (2.4, 2.0, 1.4), seed=5, jag=0.2)
    rig.part("body", g, STONE_DK, outline=0.6)
    g = Geo()
    g.blob((-6.5, -5.5, 4.4), (4.6, 2.6, 1.6), p=2.2, cuts=3)
    g.blob((7.0, -4.8, 4.2), (3.2, 2.2, 1.3), p=2.2, cuts=3)
    rig.part("body", g, MOSS, finish="hair", outline=0.4)
    # the stem: a rough tapered column, a lashing of sinew round its waist
    g = Geo()
    n0 = nverts(g)
    g.lathe([(0, 0), (6.4, 0), (6.2, 2.0), (5.0, 6.0), (4.5, 10.0), (5.4, 13.6), (6.6, 15.0), (0, 15.4)],
            (0.0, 1.0, 3.6), segs=14)
    rough(g, n0, (0.0, 1.0, 10.0), 0.07, seed=11, freq=0.32)
    rig.part("body", g, STONE, outline=0.6)
    g = Geo()
    for dz in (8.2, 9.8):
        g.lathe([(4.65, -0.5), (5.15, -0.3), (5.15, 0.3), (4.65, 0.5)], (0.0, 1.0, 3.6 + dz), segs=14)
    rig.part("body", g, "#A88F6E", finish="hair", outline=0.3)
    # the bowl: a thick-walled stone basin, the inside a little darker (and sooty) than the outside
    z0 = 17.0
    g = Geo()
    n0 = nverts(g)
    g.lathe([(0, 0), (5.5, 0), (9.6, 1.6), (13.0, 4.6), (14.6, 8.2), (14.4, 9.6), (13.2, 10.4), (11.8, 9.2),
             (8.8, 6.6), (0, 5.6)], (0.0, 1.0, z0), segs=22)
    rough(g, n0, (0.0, 1.0, z0 + 5.0), 0.05, seed=13, freq=0.25)
    rig.part("body", g, STONE, outline=0.7)
    # a lighter rim where the stone was rubbed smooth
    g = Geo()
    g.lathe([(12.0, -0.6), (14.2, -0.4), (14.9, 0.4), (14.2, 1.1), (12.2, 1.0)], (0.0, 1.0, z0 + 9.2), segs=22)
    rig.part("body", g, STONE_LT, outline=0.4)
    # a raised band round the belly with carved notches (the camera-facing half): a hand-made pot
    g = Geo()
    g.lathe([(12.4, -1.3), (13.6, -1.1), (13.9, 0.0), (13.6, 1.1), (12.4, 1.3)], (0.0, 1.0, z0 + 4.4), segs=22)
    rig.part("body", g, STONE_LT, outline=0.4)
    g = Geo()
    for a in front_arc(13.9, 212, 328, 6):
        g.blob((math.cos(a) * 13.9, 1.0 + math.sin(a) * 13.9, z0 + 4.4), (1.3, 0.9, 1.0), p=2.0, cuts=2,
               rot=(0, 45, math.degrees(a) + 90))
    rig.part("body", g, STONE_DK, outline=0, highlight=False)
    # soot: dark streaks licking up the bowl's wall to the rim (none above it), and the scorched inside
    g = Geo()
    for a_deg, w, h in ((236, 2.6, 2.2), (268, 3.4, 2.6), (304, 2.4, 2.0)):
        a = math.radians(a_deg)
        r = 14.45
        g.blob((math.cos(a) * r, 1.0 + math.sin(a) * r, z0 + 7.2), (w, 0.8, h), p=2.0, cuts=3,
               taper=(1.0, 0.4), rot=(0, 0, a_deg + 90))
    rig.part("body", g, "#54493F", outline=0, highlight=False)
    g = Geo().lathe([(0, 0), (8.6, 0.1), (11.6, 3.2), (12.2, 3.9), (0, 3.6)], (0.0, 1.0, z0 + 5.7), segs=22)
    rig.part("body", g, "#4C4036", outline=0, highlight=False)
    # charred logs crossed in the bowl, glowing at the cracks, and a bed of embers
    g = Geo()
    for (ax, ay), (bx, by) in (((-8.5, -2.0), (7.5, 3.5)), ((7.8, -3.0), (-6.5, 4.5)), ((-1.0, -6.5), (1.5, 6.5))):
        g.capsule((ax, ay + 1.0, z0 + 8.4), (bx, by + 1.0, z0 + 10.6), 1.9, 1.6, segs=10, rings=2)
    rig.part("body", g, CHAR, outline=0.5)
    g = Geo()
    for x, y, r in ((-4.6, -1.6, 1.4), (3.6, -2.2, 1.2), (0.4, -3.6, 1.6), (-1.8, 2.4, 1.1), (5.6, 1.0, 1.0)):
        g.blob((x, y + 1.0 - 1.4, z0 + 9.8), (r, r * 0.8, r * 0.6), p=2.0, cuts=2)
    rig.part("body", g, glow=EMBER, outline=0)
    g = Geo()
    for x, y in ((-6.5, -1.0), (6.0, -0.8), (2.0, -4.6)):
        g.blob((x, y, z0 + 9.2), (2.2, 1.6, 0.8), p=2.0, cuts=2)
    rig.part("body", g, glow="#C9653A", outline=0)


FIRE_BOWL_FLAME = (0.0, -0.5, 27.5)


def fire_bowl():
    def build(rig):
        build_fire_bowl(rig)
        _pose[0] = flame_variants(rig, "loop", FIRE_BOWL_FLAME, k=1.0, seed=7)

    _pose = [lambda f: {}]
    return deco_module("fire_bowl", "Fire Bowl", build, height=52, canvas=(130, 150), feet=(65, 132),
                       loop=(4, lambda f: _pose[0](f)), glow=((0.0, -2.0, 36.0), 17.0, "#FFA040"), motion="flicker",
                       shadow=15.0, loop_outline=FIRE_LINE)


# =================================================================================================
# Plants
# =================================================================================================
def frond(gs, gl, base, azim, length, rise, width, seed=0, droop=2.0, n=11):
    """One fern frond from `base`: a rachis (gs) that rises and arches over, lined with broad leaflets (gl) that
    overlap into one serrated feather and shorten toward the tip (no gaps for the outer line to fill in).
    azim: degrees in the ground plane (0 toward the lane, 90 away from the camera, 270 toward it)."""
    rnd = random.Random(seed)
    a = math.radians(azim)
    ux, uy = math.cos(a), math.sin(a)

    def p(t):
        d = length * t
        return (base[0] + ux * d, base[1] + uy * d * 0.8, base[2] + rise * (2.0 * t - 1.25 * t * t) - droop * t ** 3)

    def unit(v):
        L = math.sqrt(sum(c * c for c in v)) or 1.0
        return tuple(c / L for c in v)

    pts = [p(i / 9) for i in range(10)]
    for i, (q0, q1) in enumerate(zip(pts, pts[1:])):
        gs.capsule(q0, q1, 0.9 - 0.05 * i, 0.85 - 0.05 * (i + 1), segs=6, rings=1)
    side = unit((-uy, ux, 0.0))
    for i in range(n):
        t = 0.08 + 0.86 * i / (n - 1)
        q = p(t)
        fwd = unit(tuple(b - c for b, c in zip(p(min(1.0, t + 0.03)), q)))
        ll = width * (1.0 - 0.66 * t) * rnd.uniform(0.92, 1.08)
        ww = 2.3 * (1.0 - 0.45 * t)
        for s in (-1, 1):
            d = unit((side[0] * s * 0.8 + fwd[0] * 0.62, side[1] * s * 0.8 + fwd[1] * 0.62, -0.1 + fwd[2] * 0.4))
            c = (q[0] + d[0] * ll * 0.48, q[1] + d[1] * ll * 0.48, q[2] + d[2] * ll * 0.48)
            gl.blob(c, (ll * 0.52, ww, 0.7), p=2.0, cuts=3, rot=orient(d))
    tip = pts[-1]
    gl.blob(tip, (2.6, 1.8, 0.7), p=2.0, cuts=3, rot=orient(unit((ux, uy * 0.8, -0.5))))


def build_fern(rig):
    """Every player's other first prop: a lush fern clump, a fan of arching fronds (taller at the back) on a
    little mound of earth, a fiddlehead uncurling in its heart, two mossy stones at its foot."""
    g = Geo()
    rock(g, (0.0, 2.0, 1.2), (12.0, 8.5, 3.4), seed=21, jag=0.1, p=2.6)
    rig.part("body", g, EARTH, outline=0.6)
    g = Geo()
    rock(g, (-11.5, -4.5, 2.0), (4.2, 3.4, 3.0), seed=22, jag=0.18)
    rock(g, (12.0, -3.0, 1.7), (3.4, 2.8, 2.4), seed=23, jag=0.18)
    rig.part("body", g, GREY, outline=0.5)
    g = Geo()
    g.blob((-11.5, -5.8, 4.3), (3.2, 2.4, 1.2), p=2.2, cuts=3)
    g.blob((11.8, -4.2, 3.8), (2.6, 2.0, 1.0), p=2.2, cuts=3)
    rig.part("body", g, MOSS, finish="hair", outline=0.3)
    # back fronds rise tallest, side fronds spread, front fronds arch toward the camera: azimuth, length, rise
    crown = (0.0, 1.0, 4.0)
    # (azimuth, length, rise, droop, colour): alternate greens so overlapping fronds stay apart
    fronds = [(56, 19, 31, 2.0, FERN_DK), (90, 15, 36, 1.0, FERN), (124, 19, 31, 2.0, FERN_DK),
              (6, 19.5, 21, 6.0, FERN), (174, 19.5, 21, 6.0, FERN), (218, 18, 18, 3.0, FERN_LT),
              (322, 18, 18, 3.0, FERN_LT), (270, 12, 15, 1.0, FERN)]
    for color in (FERN_DK, FERN, FERN_LT):
        gs, gl = Geo(), Geo()
        for i, (az, L, rise, droop, c) in enumerate(fronds):
            if c == color:
                frond(gs, gl, crown, az, L, rise, 7.6, seed=31 + i, droop=droop)
        rig.part("body", gs, FERN_STEM, outline=0.4)
        rig.part("body", gl, color, finish="hair", outline=0.5)
    front = [(218, 18, 18), (322, 18, 18)]
    # fresh light tips on the front fronds (new growth)
    gl = Geo()
    for az, L, rise in front:
        a = math.radians(az)
        t = 0.97
        tip = (crown[0] + math.cos(a) * L * t, crown[1] + math.sin(a) * L * t * 0.8, crown[2] + rise * (2 * t - 1.25 * t * t) - 3.0 * t ** 3)
        gl.blob(tip, (3.0, 2.2, 0.8), p=2.0, cuts=3, rot=orient((math.cos(a), math.sin(a) * 0.8, -0.5)))
    rig.part("body", gl, "#8DBA5A", finish="hair", outline=0.4)
    # the fiddlehead: a stalk curling into a spiral at its top
    g = Geo()
    stalk = [(1.2, -1.6, 4.0), (1.8, -2.0, 12.0), (2.2, -2.4, 17.0)]
    for a, b in zip(stalk, stalk[1:]):
        g.capsule(a, b, 1.05, 0.95, segs=8, rings=1)
    cx, cy, cz = 2.2, -2.6, 20.0
    prev = stalk[-1]
    for i in range(1, 14):
        t = i / 13
        ang = math.radians(-90 + 330 * t)
        r = 3.2 * (1.0 - 0.72 * t)
        q = (cx + math.cos(ang) * r, cy - 0.2 * t, cz + math.sin(ang) * r)
        g.capsule(prev, q, 1.0 - 0.35 * t, 0.95 - 0.35 * t, segs=8, rings=1)
        prev = q
    rig.part("body", g, "#8DBA5A", finish="hair", outline=0.5)


def fern():
    return deco_module("fern", "Fern", build_fern, height=40, canvas=(140, 120), feet=(70, 104), motion="sway",
                       shadow=16.0)



# =================================================================================================
# Statues
# =================================================================================================
MARBLE = "#C9C1B3"
MARBLE_LT = "#DAD3C7"
MARBLE_DK = "#A69E90"
INK = "#4E4740"
GOLD = "#E2C46E"         # pale gold (the `bronze` finish keeps its shadow grey and its highlight cream)
GOLD_LT = "#F0DDA0"


def plinth(rig, joint, hw, hd, h, color, light, dark, panel=None, chips=()):
    """A moulded plinth with its top at z = h: a wide base step, the shaft (with a recessed panel on its face when
    `panel` names a colour), a cornice cap; `chips` knocks pieces off its front [(x, z, size)]."""
    g = Geo()
    box(g, (0.0, 1.0, 1.7), (hw + 2.4, hd + 2.2, 1.7), p=6)
    rig.part(joint, g, dark, outline=0.5)
    g = Geo()
    box(g, (0.0, 1.0, (h + 0.6) / 2), (hw, hd, (h - 5.4) / 2), p=7)
    rig.part(joint, g, color, outline=0.6)
    g = Geo()
    box(g, (0.0, 1.0, h - 1.3), (hw + 2.0, hd + 1.8, 1.3), p=6)
    rig.part(joint, g, light, outline=0.5)
    if panel:
        g = Geo()
        box(g, (0.0, 1.0 - hd - 0.1, (h + 0.6) / 2), (hw - 2.4, 0.6, (h - 5.4) / 2 - 1.4), p=5, cuts=2)
        rig.part(joint, g, panel, outline=0.3)
    if chips:
        g = Geo()
        for x, z, k in chips:
            g.blob((x, 1.0 - hd - 0.5, z), (k, 1.3, k * 0.8), p=2.0, cuts=2, rot=(0, 30, 0))
        rig.part(joint, g, dark, outline=0, highlight=False)


def build_stone_idol(rig):
    """A carved stone head on a chipped block: a heavy brow over deep eye sockets, a long flat nose, a slot mouth
    with square teeth, ear lugs and a crown of stacked stones; moss on the crown, the brow and in the cracks."""
    g = Geo()
    rock(g, (0.0, 2.0, 2.4), (13.0, 10.0, 2.8), seed=51, jag=0.1, p=3.0)
    rig.part("body", g, GREY_DK, outline=0.6)
    g = Geo()
    n0 = nverts(g)
    box(g, (0.0, 1.5, 7.4), (10.4, 8.0, 3.0), p=5)
    rough(g, n0, (0.0, 1.5, 7.4), 0.06, seed=52, freq=0.3)
    rig.part("body", g, GREY, outline=0.6)
    g = Geo()
    for x, z, k in ((-9.2, 9.6, 2.2), (8.6, 5.6, 1.7), (3.6, 10.2, 1.4)):
        g.blob((x, -6.7, z), (k, 1.4, k * 0.8), p=2.0, cuts=2, rot=(0, 35, 0))
    rig.part("body", g, GREY_DK, outline=0, highlight=False)
    z0 = 10.2
    g = Geo()
    n0 = nverts(g)
    box(g, (0.0, 1.0, z0 + 14.5), (8.4, 7.0, 14.5), p=3.4, taper=(1.0, 0.9))
    rough(g, n0, (0.0, 1.0, z0 + 14.5), 0.035, seed=53, freq=0.2)
    rig.part("body", g, GREY, outline=0.7)
    # the crown of stacked flat stones
    g = Geo()
    rock(g, (0.0, 1.0, z0 + 30.2), (7.6, 6.0, 2.2), seed=54, jag=0.08, p=3.0)
    rock(g, (0.6, 1.0, z0 + 33.6), (4.6, 3.8, 1.9), seed=55, jag=0.1, p=2.6)
    rig.part("body", g, GREY_LT, outline=0.5)
    # the brow ridge, the eye sockets with stone pupils, the nose, the mouth and teeth, the ear lugs
    g = Geo()
    box(g, (0.0, -6.2, z0 + 21.4), (8.0, 1.9, 1.7), p=3.0)
    rig.part("body", g, GREY_LT, outline=0.5)
    g = Geo()
    for sx in (-3.9, 3.9):
        g.blob((sx, -6.1, z0 + 17.8), (2.6, 1.0, 2.3), p=2.0, cuts=3)
    rig.part("body", g, INK, outline=0, highlight=False)
    g = Geo()
    for sx in (-3.9, 3.9):
        g.sphere((sx + 0.5, -6.9, z0 + 17.5), 1.05, cuts=2)
    rig.part("body", g, GREY_LT, outline=0.3)
    g = Geo()
    box(g, (0.0, -7.0, z0 + 13.4), (1.9, 1.7, 4.6), p=3.0, taper=(1.3, 0.7))
    rig.part("body", g, GREY, outline=0.5)
    g = Geo()
    box(g, (0.0, -6.2, z0 + 7.2), (5.4, 0.8, 1.8), p=4)
    rig.part("body", g, INK, outline=0, highlight=False)
    g = Geo()
    for tx in (-3.4, -1.1, 1.1, 3.4):
        box(g, (tx, -6.7, z0 + 8.1), (0.85, 0.5, 0.8), p=4, cuts=2)
    rig.part("body", g, BONE_DK, outline=0.2)
    g = Geo()
    for sx in (-1, 1):
        g.blob((sx * 8.8, 0.4, z0 + 16.4), (1.9, 3.0, 4.2), p=2.4, cuts=3)
    rig.part("body", g, GREY_DK, outline=0.5)
    chipped_cracks(rig, "body", [[(-6.0, -6.6, z0 + 26.0), (-4.4, -6.7, z0 + 23.4)],
                                 [(6.4, -6.4, z0 + 6.0), (5.0, -6.5, z0 + 2.6), (5.8, -6.5, z0 + 0.6)]],
                   "#5A534A", GREY_LT, y_push=-0.6, w=0.8)
    # moss: a cap on the crown, a pad on the brow, drips in the right crack, tufts on the block
    g = Geo()
    g.blob((-2.4, -1.6, z0 + 31.8), (5.4, 4.4, 1.5), p=2.2, cuts=3)
    g.blob((-4.6, -7.2, z0 + 23.0), (3.0, 1.3, 1.1), p=2.2, cuts=3)
    for dz, L in ((3.8, 3.4), (1.4, 2.6)):
        g.blob((6.2, -6.9, z0 + dz), (1.0, 0.9, L), p=2.0, cuts=2, taper=(0.5, 1.0))
    g.blob((-7.6, -6.4, 10.4), (3.6, 1.6, 1.2), p=2.2, cuts=3)
    g.blob((7.0, -5.0, 10.6), (2.4, 2.0, 1.0), p=2.2, cuts=3)
    rig.part("body", g, MOSS, finish="hair", outline=0.4)


def stone_idol():
    return deco_module("stone_idol", "Stone Idol", build_stone_idol, height=46, canvas=(120, 140), feet=(60, 124),
                       shadow=15.0)


LION = "#E2D4B0"         # pale limestone, polished (sat < 40%: never the orange team)
LION_DK = "#C7B58C"
MANE = "#B39A70"         # the mane a shade darker, so the face reads inside it
MANE_DK = "#977F58"


class Turned:
    """A rig stand-in that turns every part's geometry about the vertical axis through `pivot` by `deg` (negative
    turns a prop authored facing the lane, +x, toward the camera): a statue shown three-quarters."""

    def __init__(self, rig, pivot, deg):
        self._rig = rig
        self._pivot = pivot
        self._c = math.cos(math.radians(deg))
        self._s = math.sin(math.radians(deg))

    def part(self, joint, geo, *a, **kw):
        px, py, _ = self._pivot
        for v in geo.bm.verts:
            x, y = v.co.x - px, v.co.y - py
            v.co.x = px + x * self._c - y * self._s
            v.co.y = py + x * self._s + y * self._c
        return self._rig.part(joint, geo, *a, **kw)

    def __getattr__(self, name):
        return getattr(self._rig, name)


def build_lion_statue(rig):
    """A seated limestone lion on a moulded plinth, turned three-quarters toward the camera from the lane: a big
    round mane carved in rows of curls, a polished body with straight front legs and big paws, a broad muzzle,
    its tail curled round to the front."""
    plinth(rig, "body", 11.0, 8.0, 13.0, MARBLE, MARBLE_LT, MARBLE_DK, panel="#BCB4A5")
    z = 13.0
    r = Turned(rig, (0.0, 1.0, 0.0), -34.0)
    body = Geo()
    body.blob((-4.2, 2.0, z + 6.2), (6.6, 6.6, 6.0), p=2.2, cuts=4)                          # haunch
    body.blob((-1.0, 1.2, z + 12.6), (6.6, 6.2, 9.0), p=2.2, cuts=4, rot=(0, 16, 0))         # seated body
    body.blob((2.8, 0.6, z + 14.0), (5.0, 5.8, 6.0), p=2.2, cuts=4)                          # chest
    for dy in (-3.2, 3.2):
        body.capsule((4.4, dy + 0.6, z + 14.0), (5.2, dy + 0.6, z + 2.0), 2.3, 2.1, segs=10, rings=2)
    r.part("body", body, LION, finish="gloss", outline=0.6)
    g = Geo()
    for dy in (-3.2, 3.2):
        g.blob((6.6, dy + 0.2, z + 1.6), (3.2, 2.4, 1.6), p=2.2, cuts=3)
    r.part("body", g, LION, finish="gloss", outline=0.5)
    g = Geo()
    for dy in (-3.2, 3.2):
        for t in (-0.95, 0.0, 0.95):
            g.capsule((8.6, dy + 0.2 + t, z + 2.4), (9.4, dy + 0.2 + t, z + 0.8), 0.32, segs=6, rings=1)
    r.part("body", g, LION_DK, outline=0, highlight=False)
    # the tail curled round the near side to the front, its tuft by the paws
    g = Geo()
    tail = [(-9.6, -1.0, z + 1.4), (-8.6, -5.6, z + 1.6), (-3.0, -7.6, z + 1.5), (2.6, -6.6, z + 1.6)]
    for a, b in zip(tail, tail[1:]):
        g.capsule(a, b, 1.25, 1.15, segs=8, rings=1)
    r.part("body", g, LION, finish="gloss", outline=0.4)
    # the mane: one big round mass behind and round the head, then rows of carved curls over it
    hx, hz = 4.6, z + 23.0
    g = Geo()
    g.blob((hx - 1.0, 1.0, hz - 0.2), (8.2, 7.2, 8.4), p=2.15, cuts=5)
    g.blob((hx - 0.2, 0.2, hz - 5.6), (6.4, 6.0, 4.2), p=2.2, cuts=4)                        # down the chest
    r.part("body", g, MANE, finish="gloss", outline=0.6)
    curls = Geo()
    for ring, (rad, n, k, yy) in enumerate(((7.0, 14, 1.9, -1.0), (5.0, 11, 1.7, -3.0))):
        for i in range(n):
            ang = math.radians(-110 + 360 * i / n + ring * 14)
            curls.sphere((hx - 1.4 + math.cos(ang) * rad * 0.18, 1.2 + yy + math.sin(ang) * rad * 0.2 - rad * 0.62,
                          hz + 0.2 + math.sin(ang) * rad * 0.95), k, cuts=2)
    for cx, cz in ((-2.6, -1.2), (2.6, -1.4), (0.0, -3.6), (-3.8, -4.4), (3.8, -4.6), (0.0, -6.2)):
        curls.sphere((hx - 0.4 + cx * 0.3, -4.6 - abs(cx) * 0.25, hz + cz), 1.7, cuts=2)
    r.part("body", curls, MANE, finish="gloss", outline=0.3)
    # the face: skull, a broad muzzle, the nose, eyes under the brow, the mouth's line, ears in the mane
    g = Geo()
    g.blob((hx + 1.4, -2.2, hz + 0.6), (4.4, 4.2, 4.4), p=2.2, cuts=4)
    g.blob((hx + 4.6, -3.0, hz - 1.4), (2.8, 3.2, 2.4), p=2.2, cuts=3)
    for sy in (-1, 1):
        g.blob((hx - 0.4, -1.6 + sy * 3.4, hz + 5.2), (1.4, 1.1, 1.7), p=2.2, cuts=3)
    r.part("body", g, LION, finish="gloss", outline=0.5)
    g = Geo()
    g.blob((hx + 7.0, -3.2, hz - 0.6), (1.1, 1.5, 0.9), p=2.0, cuts=2)
    for sy in (-1, 1):
        g.sphere((hx + 4.0, -2.6 + sy * 2.3, hz + 2.2), 0.75, cuts=2)
    g.capsule((hx + 6.6, -4.8, hz - 3.0), (hx + 6.6, -1.4, hz - 3.0), 0.38, segs=6, rings=1)
    r.part("body", g, "#5E4E3A", outline=0, highlight=False)
    g = Geo()
    for sy in (-1, 1):
        g.blob((hx + 4.0, -2.6 + sy * 2.4, hz + 3.4), (1.5, 1.0, 0.5), p=2.0, cuts=2)
    r.part("body", g, LION_DK, outline=0.3)


def lion_statue():
    return deco_module("lion_statue", "Lion Statue", build_lion_statue, height=46, canvas=(130, 140), feet=(62, 124),
                       shadow=16.0)


KST = "#A9B0BC"          # blue-grey statue stone (sat 10%)
KST_DK = "#8E95A2"
KST_LT = "#C3C8D1"


def build_knight_statue(rig):
    """A stone knight on a plinth, both hands on the pommel of a sword held point down, a great helm with a slit
    visor, pauldrons, a belted tabard and a heater shield painted in the side's colour."""
    plinth(rig, "body", 9.0, 7.0, 9.0, "#A7ADB8", "#BCC1CA", "#8A909B")
    z = 9.0
    g = Geo()
    for sx in (-2.7, 2.7):
        g.capsule((sx, 1.0, z + 1.2), (sx * 0.9, 1.0, z + 13.0), 2.5, 2.7, segs=10, rings=2)
        g.blob((sx + 0.8, 0.2, z + 1.2), (3.0, 2.6, 1.4), p=2.4, cuts=3)
    rig.part("body", g, KST_DK, outline=0.5)
    g = Geo()
    box(g, (0.0, 1.0, z + 20.6), (5.8, 4.4, 7.6), p=3.0, taper=(0.92, 1.12))
    box(g, (0.0, 0.6, z + 13.2), (6.2, 4.6, 3.6), p=3.2, taper=(1.12, 1.0))
    rig.part("body", g, KST, outline=0.6)
    g = Geo()
    g.lathe([(5.0, -0.8), (6.1, -0.7), (6.3, 0.0), (6.1, 0.7), (5.0, 0.8)], (0.0, 1.0, z + 15.6), segs=20,
            squash=(1.0, 0.78))
    rig.part("body", g, KST_DK, outline=0.3)
    g = Geo()
    for sx in (-1, 1):
        g.blob((sx * 6.4, 1.0, z + 27.4), (3.4, 3.8, 2.6), p=2.4, cuts=3)
    rig.part("body", g, KST_LT, outline=0.5)
    # the arms come down to the pommel in front of the belt
    g = Geo()
    for sx in (-1, 1):
        g.capsule((sx * 6.6, 0.2, z + 26.0), (sx * 4.4, -3.6, z + 19.6), 2.0, 1.8, segs=8, rings=2)
        g.capsule((sx * 4.4, -3.6, z + 19.6), (sx * 1.4, -5.6, z + 18.4), 1.8, 1.7, segs=8, rings=2)
    g.blob((0.0, -6.0, z + 18.6), (2.6, 1.8, 1.8), p=2.4, cuts=3)
    rig.part("body", g, KST, outline=0.5)
    # the great helm: a flat-topped barrel, the slit and the breaths, a ridge down its face
    g = Geo()
    box(g, (0.0, 0.8, z + 33.6), (4.6, 4.4, 4.9), p=3.0, taper=(1.0, 0.94))
    rig.part("body", g, KST_LT, finish="metal", outline=0.5)
    g = Geo()
    box(g, (0.0, -3.7, z + 34.4), (3.9, 0.6, 0.55), p=4, cuts=2)
    for dx, dz in ((1.6, 31.6), (2.6, 31.2), (1.6, 30.4), (2.6, 30.0)):
        g.sphere((dx, -3.75, z + dz), 0.35, cuts=1)
    rig.part("body", g, INK, outline=0, highlight=False)
    g = Geo()
    box(g, (0.0, -3.9, z + 32.6), (0.5, 0.5, 4.2), p=3.0, cuts=2)
    rig.part("body", g, KST, finish="metal", outline=0.3)
    # the sword, point down in front: blade, cross-guard, grip and pommel
    g = Geo()
    box(g, (0.0, -6.6, z + 9.4), (0.95, 0.4, 7.4), p=4, cuts=2, taper=(0.45, 1.0))
    box(g, (0.0, -6.6, z + 17.2), (3.6, 0.8, 0.8), p=4, cuts=2)
    rig.part("body", g, KST_LT, finish="metal", outline=0.4)
    g = Geo()
    g.sphere((0.0, -6.7, z + 21.4), 1.1, cuts=2)
    rig.part("body", g, KST_DK, finish="metal", outline=0.3)
    # the heater shield on its left forearm, painted in the side's colour, with a stone rim
    rim = [(-0.2, 7.0), (4.6, 6.4), (4.5, 1.0), (2.8, -3.6), (0.0, -6.8), (-2.8, -3.6), (-4.5, 1.0), (-4.6, 6.4)]
    sx0, sz0 = 6.8, z + 17.8
    g = Geo().slab([(sx0 + px * 1.06, sz0 + pz * 1.06) for px, pz in rim], -5.4, 1.4)
    rig.part("body", g, KST_DK, outline=0.5)
    g = Geo().slab([(sx0 + px * 0.86, sz0 + pz * 0.86 + 0.2) for px, pz in rim], -6.3, 0.8)
    rig.part("body", g, team=True, outline=0.3)
    g = Geo()
    g.sphere((sx0, -6.9, sz0 + 1.2), 1.2, cuts=2)
    rig.part("body", g, KST_LT, finish="metal", outline=0.3)


def knight_statue():
    return deco_module("knight_statue", "Knight Statue", build_knight_statue, height=48, canvas=(110, 150), feet=(55, 134),
                       team=True, shadow=13.0)


VERD = "#6F8F7A"         # bronze gone green (verdigris): never a team hue
VERD_DK = "#58735F"
VERD_LT = "#8FAF96"
AMBER = "#F4C55A"        # the glass eyes (a small area)


def build_owl_statue(rig):
    """A wise owl of green-patinated bronze on a dark marble plinth with a gold band: rows of feather scales on
    its chest, folded wings, ear tufts, a face disc and big amber glass eyes that catch the light."""
    plinth(rig, "body", 9.0, 7.0, 11.0, "#5A5564", "#6E6878", "#45414E")
    g = Geo()
    box(g, (0.0, 1.0, 9.0), (9.2, 7.2, 0.45), p=6, cuts=2)
    rig.part("body", g, GOLD, finish="bronze", outline=0.3)
    z = 11.0
    g = Geo()
    g.blob((0.0, 1.0, z + 12.0), (8.0, 7.0, 11.0), p=2.1, cuts=5, taper=(1.05, 0.86))
    rig.part("body", g, VERD, finish="metal", outline=0.6)
    # the chest: a lighter bib with rows of scale feathers (each a lip and a dark crescent under it)
    g = Geo()
    g.blob((0.0, -4.4, z + 10.0), (5.6, 2.6, 7.6), p=2.1, cuts=4)
    rig.part("body", g, VERD_LT, finish="metal", outline=0.3)
    sc, dk = Geo(), Geo()
    for row in range(4):
        zz = z + 5.0 + row * 3.1
        n = 4 if row % 2 == 0 else 3
        for i in range(n):
            xx = (i - (n - 1) / 2) * 2.6
            yy = -6.6 + abs(xx) * 0.32
            sc.blob((xx, yy, zz), (1.35, 0.7, 1.05), p=2.0, cuts=2)
            dk.blob((xx, yy + 0.25, zz - 1.15), (1.15, 0.45, 0.35), p=2.0, cuts=2)
    rig.part("body", sc, VERD_LT, finish="metal", outline=0)
    rig.part("body", dk, VERD_DK, outline=0, highlight=False)
    # the folded wings with their long feathers' tips
    g = Geo()
    for sx in (-1, 1):
        g.blob((sx * 6.6, 1.6, z + 11.6), (3.0, 5.8, 9.0), p=2.1, cuts=4, rot=(0, sx * 6, 0))
    rig.part("body", g, VERD_DK, finish="metal", outline=0.5)
    g = Geo()
    for sx in (-1, 1):
        for k in range(3):
            g.blob((sx * (6.8 - k * 0.6), -1.6 + k * 1.4, z + 3.4 - k * 0.6), (1.2, 1.2, 2.2), p=2.0, cuts=2,
                   taper=(1.0, 0.5))
    rig.part("body", g, VERD, finish="metal", outline=0.3)
    # the head, the face disc, the ear tufts
    hz = z + 26.0
    g = Geo()
    g.blob((0.0, 0.6, hz), (7.4, 6.6, 6.2), p=2.2, cuts=4)
    for sx in (-1, 1):
        g.blob((sx * 5.0, 0.6, hz + 6.4), (1.9, 1.6, 3.4), p=2.0, cuts=3, taper=(1.0, 0.25), rot=(0, sx * -22, 0))
    rig.part("body", g, VERD, finish="metal", outline=0.6)
    g = Geo()
    for sx in (-1, 1):
        g.blob((sx * 2.9, -4.9, hz - 0.2), (3.4, 1.4, 3.6), p=2.1, cuts=3)
    rig.part("body", g, VERD_LT, finish="metal", outline=0.3)
    # glass eyes: amber, a dark pupil, the gloss catching the light; a bronze beak
    g = Geo()
    for sx in (-1, 1):
        g.sphere((sx * 2.9, -5.7, hz + 0.4), 2.35, cuts=3)
    rig.part("body", g, AMBER, finish="gloss", outline=0.4)
    g = Geo()
    for sx in (-1, 1):
        g.sphere((sx * 2.7, -7.6, hz + 0.2), 1.05, cuts=2)
    rig.part("body", g, "#2A2420", finish="gloss", outline=0, highlight=False)
    g = Geo()
    for sx in (-1, 1):
        g.sphere((sx * 2.2, -8.3, hz + 1.1), 0.5, cuts=1)
    rig.part("body", g, glow="#FFFBEA", outline=0)
    g = Geo()
    g.blob((0.0, -6.8, hz - 2.8), (1.1, 1.2, 1.8), p=2.0, cuts=3, taper=(1.0, 0.3), rot=(180, 0, 0))
    rig.part("body", g, "#B88A4A", finish="bronze", outline=0.3)
    # talons over the plinth's edge
    g = Geo()
    for sx in (-2.4, 2.4):
        for t in (-1.0, 0.0, 1.0):
            g.capsule((sx + t, -5.0, z + 1.2), (sx + t * 1.3, -6.4, z + 0.2), 0.55, 0.4, segs=6, rings=1)
    rig.part("body", g, "#B88A4A", finish="bronze", outline=0.2)


def owl_statue():
    return deco_module("owl_statue", "Wise Owl", build_owl_statue, height=46, canvas=(110, 140), feet=(55, 124),
                       glow=((0.0, -6.0, 37.4), 7.0, "#FFE9A8"), shadow=13.0)


SUIT = "#EEF0F6"
SUIT_DK = "#CFD3DE"
VISOR = "#2E2A4A"


def build_astro_statue(rig):
    """The Star Walker: an astronaut stepping onto a moon rock on a violet plinth inlaid with gold stars: a round
    helmet with a dark visor and its curved reflection, a backpack, a chest badge in the side's colour, ring
    folds at the joints and a tiny flag with a gold star on its pole."""
    plinth(rig, "body", 9.0, 7.0, 9.0, "#4E4870", "#625C86", "#3C3758")
    g = Geo()
    for x, zz in ((-5.2, 4.8), (0.0, 5.4), (5.2, 4.8)):
        g.star((x, -6.4, zz), 1.3, 0.55, 0.6)
    rig.part("body", g, GOLD, finish="bronze", outline=0.2)
    z = 9.0
    g = Geo()
    rock(g, (3.6, 0.0, z + 1.6), (5.4, 4.6, 2.2), seed=61, jag=0.14)
    rig.part("body", g, "#9C98A8", outline=0.5)
    # legs and boots (the right foot up on the rock), ring folds at the knees
    g = Geo()
    g.capsule((-2.8, 1.0, z + 1.8), (-2.2, 1.0, z + 12.4), 2.7, 2.9, segs=10, rings=2)
    g.capsule((3.4, 0.4, z + 5.0), (2.4, 1.0, z + 12.8), 2.7, 2.9, segs=10, rings=2)
    rig.part("body", g, SUIT, finish="gloss", outline=0.5)
    g = Geo()
    g.blob((-2.4, 0.2, z + 1.5), (3.2, 3.0, 1.6), p=2.4, cuts=3)
    g.blob((4.0, -0.4, z + 4.4), (3.2, 3.0, 1.6), p=2.4, cuts=3)
    for (x, y, zz) in ((-2.5, 1.0, z + 7.6), (2.9, 0.7, z + 9.2)):
        g.lathe([(2.6, -0.5), (3.2, -0.3), (3.2, 0.3), (2.6, 0.5)], (x, y, zz), segs=14)
    rig.part("body", g, "#8C90A0", outline=0.4)
    # the backpack, the torso, the chest badge and its two buttons
    g = Geo()
    box(g, (0.0, 5.8, z + 20.0), (5.4, 2.6, 6.2), p=4)
    rig.part("body", g, "#C4C8D3", outline=0.5)
    g = Geo()
    box(g, (0.0, 1.0, z + 19.0), (5.8, 4.8, 6.8), p=3.0, taper=(0.95, 1.05))
    rig.part("body", g, SUIT, finish="gloss", outline=0.6)
    g = Geo()
    box(g, (0.6, -3.9, z + 20.4), (2.6, 0.6, 2.2), p=4, cuts=2)
    rig.part("body", g, team=True, outline=0.3)
    g = Geo()
    for dx in (-3.4, -3.4):
        g.sphere((dx, -4.0, z + 21.4), 0.55, cuts=1)
    g.sphere((-3.4, -4.0, z + 19.6), 0.55, cuts=1)
    rig.part("body", g, "#F03AA8", outline=0)
    # the arms: the near one holds the flag's pole, the far one rests
    g = Geo()
    g.capsule((-6.2, 0.6, z + 24.0), (-7.6, -1.4, z + 18.0), 2.0, 2.1, segs=8, rings=2)
    g.capsule((6.2, 1.2, z + 24.0), (7.2, 0.8, z + 16.0), 2.0, 2.1, segs=8, rings=2)
    rig.part("body", g, SUIT, finish="gloss", outline=0.5)
    g = Geo()
    g.sphere((-7.8, -2.0, z + 17.2), 1.7, cuts=2)
    g.sphere((7.3, 0.6, z + 15.2), 1.7, cuts=2)
    rig.part("body", g, "#8C90A0", outline=0.3)
    # the helmet with its dark visor, the visor's curved reflection and a spark of light
    hz = z + 30.0
    g = Geo()
    g.sphere((0.0, 0.8, hz), 6.1, cuts=4)
    rig.part("body", g, SUIT, finish="gloss", outline=0.6)
    g = Geo()
    g.blob((0.4, -3.6, hz - 0.2), (4.6, 2.6, 3.7), p=2.3, cuts=4)
    rig.part("body", g, VISOR, finish="gloss", outline=0.3)
    g = Geo()
    prev = None
    for i in range(6):
        a = math.radians(150 - i * 18)
        q = (0.4 + math.cos(a) * 3.2, -6.2, hz + 0.6 + math.sin(a) * 2.4)
        if prev:
            g.capsule(prev, q, 0.42, 0.42, segs=6, rings=1)
        prev = q
    g.sphere((2.6, -6.1, hz - 1.6), 0.5, cuts=1)
    rig.part("body", g, glow="#E8F4FF", outline=0)
    # the tiny flag: a pole in the near hand, a pennant in the side's colour, a gold star on top
    g = Geo()
    g.capsule((-7.9, -2.2, z + 9.0), (-7.9, -2.2, z + 38.0), 0.55, segs=8, rings=1)
    rig.part("body", g, "#9C98A8", finish="metal", outline=0.3)
    g = Geo().slab([(-7.7, z + 37.0), (1.0, z + 35.4), (-1.6, z + 33.0), (1.0, z + 30.6), (-7.7, z + 30.0)], -2.2, 0.9)
    rig.part("body", g, team=True, outline=0.4)
    g = Geo()
    g.star((-7.9, -2.4, z + 40.2), 2.2, 0.95, 1.2)
    rig.part("body", g, GOLD, finish="bronze", outline=0.3)


def astro_statue():
    return deco_module("astro_statue", "Star Walker", build_astro_statue, height=50, canvas=(110, 150), feet=(60, 134),
                       team=True, glow=((-7.9, -2.4, 49.2), 7.0, "#FFF3B0"), glints=(((0.0, -5.6, 40.0), 1.6),),
                       motion="glint", shadow=13.0)


# =================================================================================================
# Banners (a 4-frame loop of the cloth only, baked like the base flags; `mirror: false`, the lane's one wind)
# =================================================================================================
def hanging_cloth(rig, parent, name, x0, x1, ztop, length, y, n=4, bottom="point", team=True, color=None,
                  outline=0.5, thick=1.2):
    """A banner hanging from a bar at `ztop` between x0 and x1: n horizontal strips chained downward (joints
    name0..), each hinged at its top edge, the last cut to a point or a swallowtail. Returns the strips' rects
    (x0, x1, z top, z bottom) so emblems and trim can go on the right strip."""
    seg = length / n
    prev = parent
    rects = []
    xm = (x0 + x1) / 2
    for k in range(n):
        za = ztop - seg * k
        jn = f"{name}{k}"
        rig.joint(jn, prev, (xm, y, za))
        zb = za - seg - 0.25
        if k == n - 1 and bottom == "point":
            pts = [(x0, za), (x1, za), (x1, zb + seg * 0.35), (xm, zb - seg * 0.45), (x0, zb + seg * 0.35)]
        elif k == n - 1 and bottom == "swallow":
            pts = [(x0, za), (x1, za), (x1, zb - seg * 0.3), (xm, zb + seg * 0.5), (x0, zb - seg * 0.3)]
        else:
            pts = [(x0, za), (x1, za), (x1, zb), (x0, zb)]
        g = Geo().slab(pts, y, thick)
        if team:
            rig.part(jn, g, team=True, outline=outline)
        else:
            rig.part(jn, g, color, outline=outline)
        rects.append((x0, x1, za, zb))
        prev = jn
    return rects


def hanging_pose(name, n=4, amp=11.0, sway=3.0, phase=0.0):
    """The hanging banner's sway at loop frame f of 4: a billow travelling down the cloth (toward and away from
    the camera) on a small side swing about the bar."""
    def pose(f):
        a = 2 * math.pi * f / 4 + phase
        out = {}
        for k in range(n):
            out[f"{name}{k}"] = {"rx": amp * math.sin(a - k * 1.15) * (0.55 if k == 0 else 1.0),
                                 "r": (sway if k == 0 else sway * 0.35) * math.sin(a + 0.6)}
        return out
    return pose


def flying_cloth(rig, parent, name, hoist_x, ztop, zbot, length, y, n=4, tail="swallow", team=True, color=None,
                 outline=0.5):
    """A flag flying from a pole at `hoist_x` toward +x: n strips chained from the hoist (joints name0..), each
    hinged at its hoist-side edge, the fly end cut to a swallowtail (or straight). Returns the strips' rects."""
    seg = length / n
    prev = parent
    rects = []
    for k in range(n):
        xa = hoist_x + seg * k
        jn = f"{name}{k}"
        rig.joint(jn, prev, (xa, y, ztop))
        xb = xa + seg + 0.25
        if k == n - 1 and tail == "swallow":
            pts = [(xa, ztop), (xb, ztop + 0.3), (xb - seg * 0.55, (ztop + zbot) / 2), (xb, zbot - 0.3), (xa, zbot)]
        else:
            pts = [(xa, ztop), (xb, ztop), (xb, zbot), (xa, zbot)]
        g = Geo().slab(pts, y, 1.2)
        if team:
            rig.part(jn, g, team=True, outline=outline)
        else:
            rig.part(jn, g, color, outline=outline)
        rects.append((xa, xb, ztop, zbot))
        prev = jn
    return rects


def flying_pose(name, n=4, amp=17.0, droop=4.0, phase=0.0):
    """The flying flag's wave at loop frame f of 4 (the base flags' travelling fold, toward +x)."""
    def pose(f):
        a = 2 * math.pi * f / 4 + phase
        return {f"{name}{k}": {"rz": amp * math.sin(a - k * 1.25) * (0.6 if k == 0 else 1.0),
                               "r": -droop * 0.25 * (1.0 + math.cos(a - k * 1.25))} for k in range(n)}
    return pose


HIDE = "#C2A47E"         # tanned hide (sat < 40%)
HIDE_DK = "#A38660"
OCHRE = "#C98A3D"


def build_hide_banner(rig):
    """A tribe's standard: a gnarled pole with a small horned skull on top and a crossbar lashed to it, a tanned
    hide hanging from the bar with lacing at its top, ochre marks and a sun circle painted in the side's colour,
    tassels of hair at its corners, two feathers tied at the bar's end."""
    g = Geo()
    pts = [(-10.6, 1.0, 0.0), (-11.2, 1.0, 14.0), (-10.4, 1.0, 30.0), (-11.0, 1.0, 46.0), (-10.6, 1.0, 54.0)]
    for a, b in zip(pts, pts[1:]):
        g.capsule(a, b, 1.6, 1.45, segs=10, rings=1)
    g.capsule((-12.4, 0.0, 50.0), (12.6, 0.0, 50.6), 1.05, 0.95, segs=8, rings=1)
    rig.part("body", g, WOOD, outline=0.5)
    g = Geo()
    rock(g, (-10.6, 1.0, 1.4), (4.0, 3.4, 1.8), seed=71, jag=0.15)
    rig.part("body", g, GREY_DK, outline=0.4)
    g = Geo()
    for dz in (48.6, 50.0, 51.4):
        g.lathe([(1.5, -0.4), (1.95, -0.2), (1.95, 0.2), (1.5, 0.4)], (-10.7, 1.0, dz), segs=10)
    for x in (-6.0, 1.0, 8.0):
        g.capsule((x, -0.4, 51.4), (x + 0.4, -1.4, 48.4), 0.42, segs=6, rings=1)
    rig.part("body", g, "#9C8462", finish="hair", outline=0.2)
    # the skull on the pole's top, its horns
    g = Geo()
    g.blob((-10.6, 0.4, 57.2), (3.0, 2.6, 2.8), p=2.2, cuts=3)
    g.blob((-10.6, -0.8, 54.8), (1.8, 1.8, 1.3), p=2.2, cuts=2)
    rig.part("body", g, BONE, outline=0.4)
    g = Geo()
    for sx in (-1, 1):
        g.capsule((-10.6 + sx * 2.4, 0.6, 58.6), (-10.6 + sx * 5.2, 0.4, 61.0), 0.9, 0.5, segs=6, rings=1)
    rig.part("body", g, BONE_DK, outline=0.3)
    g = Geo()
    for sx in (-1, 1):
        g.sphere((-10.6 + sx * 1.2, -1.9, 57.0), 0.65, cuts=1)
    rig.part("body", g, INK, outline=0, highlight=False)
    # two feathers tied at the bar's far end
    g = Geo().slab([(12.0, 50.2), (13.4, 46.0), (12.8, 41.0), (11.8, 44.6)], -0.6, 0.8)
    g2 = Geo().slab([(12.8, 50.0), (15.6, 46.8), (15.4, 42.4), (13.8, 46.2)], -0.2, 0.8)
    rig.part("body", g, "#EDE3C8", outline=0.3)
    rig.part("body", g2, "#8E6A4A", outline=0.3)
    # the hide (the loop)
    rects = hanging_cloth(rig, "loop", "hide", -8.6, 10.4, 49.2, 24.0, -1.4, bottom="swallow", team=False,
                          color=HIDE, outline=0.5, thick=1.4)
    x0, x1, za, zb = rects[1]
    g = Geo().slab([(0.9 + math.cos(math.radians(a)) * 4.6, 36.6 + math.sin(math.radians(a)) * 4.6)
                    for a in range(0, 360, 30)], -2.2, 0.6)
    rig.part("hide1", g, team=True, outline=0.3)
    g = Geo()
    for a in range(0, 360, 45):
        ca, sa = math.cos(math.radians(a)), math.sin(math.radians(a))
        g.capsule((0.9 + ca * 1.6, -2.7, 36.6 + sa * 1.6), (0.9 + ca * 2.8, -2.7, 36.6 + sa * 2.8), 0.4, segs=6, rings=1)
    g.sphere((0.9, -2.7, 36.6), 1.1, cuts=2)
    rig.part("hide1", g, BONE, outline=0)
    g = Geo()
    for x, zz in ((-5.6, 46.2), (7.6, 46.0), (-5.0, 41.0), (7.0, 41.4)):
        g.blob((x, -2.3, zz), (0.9, 0.4, 0.9), p=2.0, cuts=2)
    rig.part("hide0", g, OCHRE, outline=0)
    g = Geo()
    for x in (-6.4, -1.6, 3.4, 8.2):
        g.sphere((x, -2.2, 48.0), 0.5, cuts=1)
    rig.part("hide0", g, HIDE_DK, outline=0, highlight=False)
    g = Geo()
    _, _, za3, zb3 = rects[3]
    for x in (-8.0, 9.8):
        g.capsule((x, -1.8, zb3 - 2.0), (x - 0.4, -1.8, zb3 - 7.0), 0.75, 0.5, segs=6, rings=1)
    rig.part("hide3", g, "#5C4330", finish="hair", outline=0.3)


def hide_banner():
    return deco_module("hide_banner", "Hide Banner", build_hide_banner, height=62, canvas=(130, 170), feet=(70, 152),
                       team=True, loop=(4, hanging_pose("hide", amp=8.0, sway=2.4)), loop_ms=170, mirror=False,
                       shadow=10.0)


def build_royal_standard(rig):
    """A royal standard: a tall dark pole with a gold spear tip, a gold crossbar with ball ends and tasselled
    cords, and a long banner in the side's colour hanging from it: a gold border, a gold crown, a pointed foot
    with a gold fringe."""
    g = Geo()
    g.capsule((0.0, 1.6, 0.0), (0.0, 1.6, 58.0), 1.25, 1.1, segs=10, rings=1)
    rig.part("body", g, WOOD_DK, outline=0.5)
    g = Geo()
    box(g, (0.0, 1.6, 1.4), (3.6, 3.0, 1.4), p=5)
    rig.part("body", g, GREY_DK, outline=0.4)
    g = Geo()
    g.capsule((-10.4, 0.6, 50.4), (10.4, 0.6, 50.4), 0.95, segs=10, rings=1)
    g.sphere((-11.0, 0.6, 50.4), 1.25, cuts=2)
    g.sphere((11.0, 0.6, 50.4), 1.25, cuts=2)
    g.lathe([(0, 0), (1.6, 0.4), (2.0, 2.0), (0.9, 4.6), (0, 7.2)], (0.0, 1.6, 58.0), segs=10)
    rig.part("body", g, GOLD, finish="bronze", outline=0.4)
    rects = hanging_cloth(rig, "loop", "std", -10.0, 10.0, 49.6, 27.0, -1.0, bottom="point", team=True)
    # the gold border down each strip's sides and across the top, the crown, the fringe at the point
    for k, (x0, x1, za, zb) in enumerate(rects):
        g = Geo()
        for xx in (x0 + 1.1, x1 - 1.1):
            box(g, (xx, -1.75, (za + zb) / 2 + (2.0 if k == 3 else 0.0)), (0.55, 0.35, (za - zb) / 2 - (2.6 if k == 3 else 0.0)), p=4, cuts=2)
        if k == 0:
            box(g, (0.0, -1.75, za - 1.1), (8.9, 0.35, 0.55), p=4, cuts=2)
        rig.part(f"std{k}", g, GOLD, finish="bronze", outline=0)
    g = Geo()
    cz = 36.8
    box(g, (0.0, -2.0, cz - 1.6), (4.4, 0.45, 1.1), p=4, cuts=2)
    for dx, h in ((-3.6, 4.6), (0.0, 6.0), (3.6, 4.6)):
        g.blob((dx, -2.0, cz + h * 0.35), (1.2, 0.45, h * 0.55), p=2.0, cuts=2, taper=(1.0, 0.35))
    rig.part("std1", g, GOLD, finish="bronze", outline=0.3)
    g = Geo()
    for dx in (-3.6, 0.0, 3.6):
        g.sphere((dx, -2.4, cz + (5.2 if dx == 0 else 4.2)), 0.7, cuts=1)
    rig.part("std1", g, GOLD_LT, outline=0)
    x0, x1, za, zb = rects[3]
    g = Geo()
    for k in range(9):
        t = k / 8
        x = x0 + (x1 - x0) * t
        zz = zb + (za - zb) * 0.35 - abs(t - 0.5) * 2 * ((za - zb) * 0.35) - (1.0 - abs(t - 0.5) * 2) * (za - zb) * 0.45
        g.capsule((x, -1.6, zz + 0.4), (x, -1.6, zz - 2.2), 0.45, 0.35, segs=6, rings=1)
    rig.part("std3", g, GOLD_LT, finish="bronze", outline=0.2)


def royal_standard():
    return deco_module("royal_standard", "Royal Standard", build_royal_standard, height=65, canvas=(120, 170),
                       feet=(60, 154), team=True, loop=(4, hanging_pose("std", amp=10.0, sway=2.8, phase=0.7)),
                       loop_ms=160, mirror=False, shadow=9.0)


def build_regiment_colors(rig):
    """A regiment's colours: a pole with a gold spearhead, a gold cord with a tassel, and a flag in the side's
    colour flying from it: a cream band across, a gold laurel disc, a gold fringe on the fly."""
    g = Geo()
    g.capsule((-12.0, 1.0, 0.0), (-12.0, 1.0, 55.0), 1.2, 1.05, segs=10, rings=1)
    rig.part("body", g, WOOD_DK, outline=0.5)
    g = Geo()
    box(g, (-12.0, 1.0, 1.3), (3.4, 3.0, 1.3), p=5)
    rig.part("body", g, GREY_DK, outline=0.4)
    g = Geo()
    g.lathe([(0, 0), (1.5, 0.5), (2.2, 2.4), (0.8, 5.4), (0, 8.4)], (-12.0, 1.0, 55.0), segs=10)
    g.lathe([(1.2, -0.6), (1.7, -0.3), (1.7, 0.3), (1.2, 0.6)], (-12.0, 1.0, 54.4), segs=10)
    rig.part("body", g, GOLD, finish="bronze", outline=0.4)
    g = Geo()
    cord = [(-12.0, -0.4, 54.0), (-11.0, -1.2, 50.0), (-12.4, -1.4, 45.0)]
    for a, b in zip(cord, cord[1:]):
        g.capsule(a, b, 0.4, segs=6, rings=1)
    g.blob((-12.4, -1.4, 43.2), (1.2, 1.0, 2.2), p=2.0, cuts=2, taper=(1.3, 0.5))
    rig.part("body", g, GOLD_LT, finish="bronze", outline=0.3)
    rects = flying_cloth(rig, "loop", "col", -11.2, 53.0, 36.0, 26.0, -0.4, tail="straight")
    for k, (xa, xb, zt, zb) in enumerate(rects):
        g = Geo().slab([(xa, 46.4), (xb, 46.4), (xb, 42.6), (xa, 42.6)], -1.1, 0.5)
        rig.part(f"col{k}", g, "#EFE6CF", outline=0)
    xa, xb, zt, zb = rects[1]
    g = Geo().slab([((xa + xb) / 2 + math.cos(math.radians(a)) * 4.2, 44.5 + math.sin(math.radians(a)) * 4.2)
                    for a in range(0, 360, 30)], -1.5, 0.5)
    rig.part("col1", g, GOLD, finish="bronze", outline=0.3)
    g = Geo()
    for a in range(200, 520, 40):
        ca, sa = math.cos(math.radians(a)), math.sin(math.radians(a))
        g.blob(((xa + xb) / 2 + ca * 2.6, -1.9, 44.5 + sa * 2.6), (0.9, 0.35, 0.55), p=2.0, cuts=2, rot=(0, -a + 90, 0))
    rig.part("col1", g, "#9C7A2E", outline=0)
    xa, xb, zt, zb = rects[3]
    g = Geo()
    for k in range(7):
        zz = zt - 0.8 - k * (zt - zb - 1.6) / 6
        g.capsule((xb, -0.6, zz), (xb + 2.0, -0.6, zz - 0.4), 0.45, 0.35, segs=6, rings=1)
    rig.part("col3", g, GOLD_LT, finish="bronze", outline=0.2)


def regiment_colors():
    return deco_module("regiment_colors", "Regiment Colours", build_regiment_colors, height=63, canvas=(130, 170),
                       feet=(50, 154), team=True, loop=(4, flying_pose("col", amp=15.0, droop=3.0)), loop_ms=120,
                       mirror=False, shadow=9.0)


MINT = "#3AF0B4"
MAGENTA = "#F03AA8"
POST = "#2E3340"
POST_LT = "#454B5A"


def build_neon_banner(rig):
    """A holo-banner: a slim charcoal post on a heavy hexagonal foot with mint seams and blinking lights, a mint
    neon bar on top, and a banner in the side's colour hanging from it with mint light along its edges and a
    pale chevron, its foot cut to a point."""
    g = Geo()
    cyl(g, (0.0, 1.0, 0.0), (0.0, 1.0, 4.0), 5.6, 4.8, bevel=0.8, segs=6)
    rig.part("body", g, POST_LT, finish="metal", outline=0.5)
    g = Geo()
    box(g, (0.0, 1.0, 28.0), (1.4, 1.4, 24.0), p=5)
    rig.part("body", g, POST, finish="metal", outline=0.5)
    g = Geo()
    g.lathe([(4.9, -0.3), (5.3, -0.2), (5.3, 0.2), (4.9, 0.3)], (0.0, 1.0, 2.6), segs=6)
    box(g, (0.0, -0.5, 18.0), (0.35, 0.2, 9.0), p=4, cuts=2)
    rig.part("body", g, glow=MINT, outline=0)
    g = Geo()
    for zz in (8.0, 31.0, 40.0):
        g.sphere((0.0, -0.6, zz), 0.55, cuts=1)
    rig.part("body", g, glow=MAGENTA, outline=0)
    g = Geo()
    box(g, (0.0, 0.0, 51.6), (11.6, 1.3, 1.1), p=5)
    box(g, (0.0, 1.0, 53.4), (2.4, 2.0, 1.6), p=4)
    rig.part("body", g, POST_LT, finish="metal", outline=0.4)
    g = Geo()
    box(g, (0.0, -1.2, 50.6), (11.0, 0.5, 0.45), p=4, cuts=2)
    rig.part("body", g, glow=MINT, outline=0)
    rects = hanging_cloth(rig, "loop", "holo", -10.0, 10.0, 50.0, 26.0, -1.6, bottom="point", team=True,
                          outline=0.4, thick=1.0)
    for k, (x0, x1, za, zb) in enumerate(rects):
        g = Geo()
        for xx in (x0 + 0.5, x1 - 0.5):
            box(g, (xx, -2.2, (za + zb) / 2 + (2.0 if k == 3 else 0.0)), (0.4, 0.3, (za - zb) / 2 - (2.6 if k == 3 else 0.0)), p=4, cuts=2)
        rig.part(f"holo{k}", g, glow=MINT, outline=0)
    for k, cz in ((1, 38.6), (2, 32.0)):
        g = Geo()
        for sx in (-1, 1):
            g.capsule((0.0, -2.4, cz - 2.2), (sx * 4.8, -2.4, cz + 1.6), 0.8, segs=6, rings=1)
        rig.part(f"holo{k}", g, glow="#E6FFF6", outline=0)


def neon_banner():
    return deco_module("neon_banner", "Neon Banner", build_neon_banner, height=58, canvas=(120, 160), feet=(60, 144),
                       team=True, loop=(4, hanging_pose("holo", amp=7.0, sway=1.8, phase=1.4)), loop_ms=150,
                       mirror=False, glow=((0.0, -2.0, 46.0), 16.0, "#3AF0B4"), shadow=8.0)


# =================================================================================================
# More braziers
# =================================================================================================
def build_iron_brazier(rig):
    """A wrought-iron brazier: a riveted basket bowl with banded rims and straps on three curved legs with scroll
    feet, a tie ring between the legs, soot over the rim, coals glowing inside."""
    g = Geo()
    for a_deg in (90, 210, 330):
        a = math.radians(a_deg)
        ca, sa = math.cos(a), math.sin(a)
        pts = [(ca * 6.0, 1.0 + sa * 6.0, 22.0), (ca * 8.6, 1.0 + sa * 8.6, 14.0), (ca * 9.6, 1.0 + sa * 9.6, 6.0),
               (ca * 10.6, 1.0 + sa * 10.6, 1.4)]
        for p0, p1 in zip(pts, pts[1:]):
            g.capsule(p0, p1, 1.05, 0.95, segs=8, rings=1)
        # the scroll foot: a curl turning outward
        cx, cy = ca * 11.8, 1.0 + sa * 11.8
        prev = pts[-1]
        for k in range(1, 7):
            t = k / 6
            ang = math.radians(180 + 300 * t)
            q = (cx + ca * math.cos(ang) * 1.4, cy + sa * math.cos(ang) * 1.4, 1.6 + math.sin(ang) * 1.4)
            g.capsule(prev, q, 0.85, 0.75, segs=6, rings=1)
            prev = q
    torus(g, (0.0, 1.0, 9.0), 8.6, 0.5, segs=28, rsegs=6)
    rig.part("body", g, IRON, finish="metal", outline=0.5)
    z0 = 21.0
    g = Geo()
    g.lathe([(0, 0), (4.0, 0), (8.0, 1.4), (10.4, 4.6), (11.4, 8.4), (11.0, 9.0), (10.0, 8.4), (7.0, 5.0),
             (0, 4.0)], (0.0, 1.0, z0), segs=24)
    rig.part("body", g, IRON, finish="metal", outline=0.6)
    g = Geo()
    for dz, r in ((3.8, 10.2), (8.2, 11.4)):
        g.lathe([(r - 0.6, -0.7), (r + 0.4, -0.5), (r + 0.55, 0.0), (r + 0.4, 0.5), (r - 0.6, 0.7)], (0.0, 1.0, z0 + dz),
                segs=24)
    for a in front_arc(10.6, 214, 326, 4):
        g.blob((math.cos(a) * 10.0, 1.0 + math.sin(a) * 10.0, z0 + 5.6), (0.7, 0.5, 2.6), p=3.0, cuts=2,
               rot=(0, 0, math.degrees(a) + 90))
    rig.part("body", g, IRON_LT, finish="metal", outline=0.4)
    g = Geo()
    for dz, r in ((3.8, 10.75), (8.2, 11.95)):
        for a in front_arc(r, 200, 340, 7):
            g.sphere((math.cos(a) * r, 1.0 + math.sin(a) * r, z0 + dz), 0.55, cuts=1)
    rig.part("body", g, "#8C929C", finish="metal", outline=0)
    g = Geo()
    for a_deg, w in ((238, 2.6), (276, 3.2), (312, 2.4)):
        a = math.radians(a_deg)
        g.blob((math.cos(a) * 11.5, 1.0 + math.sin(a) * 11.5, z0 + 7.4), (w, 0.6, 1.6), p=2.0, cuts=2,
               taper=(1.0, 0.4), rot=(0, 0, a_deg + 90))
    rig.part("body", g, SOOT, outline=0, highlight=False)
    g = Geo()
    for x, y, r in ((-5.0, -1.0, 2.4), (3.6, -2.0, 2.6), (0.0, 2.6, 2.4), (-1.6, -4.6, 2.0), (5.4, 2.2, 2.0)):
        rock(g, (x, 1.0 + y, z0 + 8.0), (r, r * 0.9, r * 0.7), seed=int(x * 7 + y * 3) + 80, jag=0.2)
    rig.part("body", g, CHAR, outline=0.4)
    g = Geo()
    for x, y in ((-2.6, -2.6), (2.0, -4.0), (4.4, 0.0), (-4.4, 1.4), (0.6, 0.4)):
        g.blob((x, 1.0 + y, z0 + 9.0), (1.4, 1.1, 0.7), p=2.0, cuts=2)
    rig.part("body", g, glow=EMBER, outline=0)


def iron_brazier():
    def build(rig):
        build_iron_brazier(rig)
        _pose[0] = flame_variants(rig, "loop", (0.0, -0.5, 30.4), k=0.95, seed=17)

    _pose = [lambda f: {}]
    return deco_module("iron_brazier", "Iron Brazier", build, height=53, canvas=(130, 150), feet=(65, 134),
                       loop=(4, lambda f: _pose[0](f)), glow=((0.0, -2.0, 39.0), 16.0, "#FF9A3C"), motion="flicker",
                       shadow=14.0, loop_outline=FIRE_LINE)


LAMP = "#2F3A33"         # dark green-black cast iron
LAMP_LT = "#46534A"
GASLIGHT = "#FFE08A"


def build_gas_lamp(rig):
    """A cast-iron gas street lamp: a stepped foot, a fluted post with moulded collars, a ladder bar with ball ends,
    a lantern of warm glass panes in an iron frame under a pyramid cap and a finial, the mantle glowing inside."""
    g = Geo()
    cyl(g, (0.0, 1.0, 0.0), (0.0, 1.0, 2.4), 5.4, 5.0, bevel=0.6, segs=8)
    cyl(g, (0.0, 1.0, 2.4), (0.0, 1.0, 5.2), 3.8, 3.2, bevel=0.6, segs=8)
    rig.part("body", g, LAMP, finish="metal", outline=0.5)
    g = Geo()
    cyl(g, (0.0, 1.0, 5.0), (0.0, 1.0, 39.0), 1.75, 1.35, bevel=0.3, segs=12)
    rig.part("body", g, LAMP, finish="metal", outline=0.5)
    g = Geo()
    for a in front_arc(1.7, 215, 325, 4):
        g.capsule((math.cos(a) * 1.65, 1.0 + math.sin(a) * 1.65, 7.0), (math.cos(a) * 1.3, 1.0 + math.sin(a) * 1.3, 33.0),
                  0.28, segs=6, rings=1)
    for zz, r in ((13.0, 2.6), (34.0, 2.3), (39.4, 2.8)):
        g.lathe([(0.1, -0.9), (r, -0.6), (r + 0.3, 0.0), (r, 0.6), (0.1, 0.9)], (0.0, 1.0, zz), segs=12)
    rig.part("body", g, LAMP_LT, finish="metal", outline=0.4)
    g = Geo()
    g.capsule((-5.4, 1.0, 36.4), (5.4, 1.0, 36.4), 0.55, segs=8, rings=1)
    g.sphere((-5.8, 1.0, 36.4), 0.95, cuts=2)
    g.sphere((5.8, 1.0, 36.4), 0.95, cuts=2)
    rig.part("body", g, LAMP, finish="metal", outline=0.4)
    # the lantern: warm panes, the frame's corner bars, a bottom plate, the pyramid cap and finial
    z0 = 40.2
    # the glass: a lit frustum, wider at the top, the mantle's hot core inside it
    g = Geo()
    box(g, (0.0, 1.0, z0 + 6.0), (3.2, 3.2, 5.0), p=8, taper=(0.82, 1.0))
    rig.part("body", g, glow=GASLIGHT, outline=0)
    g = Geo()
    g.blob((0.0, -2.4, z0 + 5.4), (1.4, 0.8, 2.2), p=2.0, cuts=2)
    rig.part("body", g, glow="#FFFBEA", outline=0)
    # the frame round the glass: corner bars outside it, a bottom tray, a band under the cap
    g = Geo()
    for sx in (-1, 1):
        for sy in (-1, 1):
            g.capsule((sx * 2.9, 1.0 + sy * 2.9, z0 + 0.9), (sx * 3.6, 1.0 + sy * 3.6, z0 + 11.0), 0.5, segs=6, rings=1)
    box(g, (0.0, 1.0, z0 + 0.4), (3.4, 3.4, 0.7), p=5, cuts=2)
    box(g, (0.0, 1.0, z0 + 11.2), (4.0, 4.0, 0.5), p=5, cuts=2)
    rig.part("body", g, LAMP, finish="metal", outline=0.3)
    # the cap: a four-sided roof with eaves, a vent and a ball finial
    g = Geo()
    g.lathe([(0.0, 0.0), (6.4, 0.0), (6.8, 0.7), (2.4, 4.2), (1.2, 4.8), (1.4, 5.8), (0.0, 7.0)], (0.0, 1.0, z0 + 11.4),
            segs=4, rot=(0, 0, 45))
    g.sphere((0.0, 1.0, z0 + 19.0), 1.0, cuts=2)
    rig.part("body", g, LAMP_LT, finish="metal", outline=0.4)


def gas_lamp():
    return deco_module("gas_lamp", "Gas Lamp", build_gas_lamp, height=60, canvas=(100, 160), feet=(50, 144),
                       glow=((0.0, -1.0, 45.8), 15.0, "#FFE08A"), shadow=8.0)


PLASMA = "#B064FF"       # violet plasma (hue 272: outside the team blue band)
PLASMA_LT = "#E2B8FF"
PLASMA_CORE = "#FBF0FF"


def build_plasma_brazier(rig):
    """A future brazier: a hexagonal pedestal with mint light seams, three claws rising from it holding a ring,
    and in the ring a floating ball of violet plasma whose bands swirl (the loop)."""
    g = Geo()
    cyl(g, (0.0, 1.0, 0.0), (0.0, 1.0, 4.4), 6.4, 5.6, bevel=0.8, segs=6)
    cyl(g, (0.0, 1.0, 4.4), (0.0, 1.0, 21.0), 3.8, 2.6, bevel=0.5, segs=6)
    rig.part("body", g, POST_LT, finish="metal", outline=0.6)
    g = Geo()
    cyl(g, (0.0, 1.0, 20.6), (0.0, 1.0, 23.6), 4.4, 3.6, bevel=0.6, segs=6)
    rig.part("body", g, POST, finish="metal", outline=0.5)
    g = Geo()
    for a in front_arc(3.4, 240, 300, 2):
        g.blob((math.cos(a) * 3.15, 1.0 + math.sin(a) * 3.15, 12.6), (0.3, 0.2, 6.4), p=4, cuts=2,
               rot=(0, 0, math.degrees(a) + 90))
    g.lathe([(5.7, -0.25), (6.0, -0.15), (6.0, 0.15), (5.7, 0.25)], (0.0, 1.0, 3.6), segs=6)
    rig.part("body", g, glow=MINT, outline=0)
    # three claws curving up and out to the ring
    g = Geo()
    for a_deg in (90, 210, 330):
        a = math.radians(a_deg)
        ca, sa = math.cos(a), math.sin(a)
        pts = [(ca * 2.6, 1.0 + sa * 2.6, 22.6), (ca * 7.2, 1.0 + sa * 7.2, 24.6), (ca * 9.4, 1.0 + sa * 9.4, 28.6),
               (ca * 9.0, 1.0 + sa * 9.0, 31.6)]
        for p0, p1 in zip(pts, pts[1:]):
            g.capsule(p0, p1, 0.95, 0.75, segs=8, rings=1)
    rig.part("body", g, POST_LT, finish="metal", outline=0.4)
    g = Geo()
    torus(g, (0.0, 1.0, 30.2), 9.0, 0.95, segs=36, rsegs=8, rot=(14, 0, 0))
    rig.part("body", g, "#5A6178", finish="metal", outline=0.4)
    g = Geo()
    torus(g, (0.0, 1.0, 30.2), 8.0, 0.35, segs=36, rsegs=6, rot=(14, 0, 0))
    rig.part("body", g, glow=MINT, outline=0)


def plasma_orb(rig, parent, center, r=5.0, n=4):
    """The plasma ball's loop: a violet sphere with a bright core and two pale bands that wind round it a little
    further on every frame (each frame its own hidden joint)."""
    x, y, z = center
    for f in range(n):
        jn = f"orb{f}"
        rig.joint(jn, parent, center, hidden=True)
        g = Geo()
        g.sphere((x, y, z), r * (1.0 + 0.04 * math.sin(2 * math.pi * f / n)), cuts=4)
        rig.part(jn, g, glow=PLASMA, outline=0)
        g = Geo()
        g.sphere((x, y - r * 0.35, z + r * 0.1), r * 0.5, cuts=3)
        rig.part(jn, g, glow=PLASMA_CORE, outline=0)
        g = Geo()
        for band, (tilt, ph) in enumerate(((28.0, 0.0), (-34.0, math.pi))):
            prev = None
            for k in range(9):
                t = k / 8
                a = ph + 2 * math.pi * f / n * 0.5 + t * math.pi * 1.1
                q = (x + math.cos(a) * r * 0.92, y - abs(math.sin(a)) * r * 0.5 - r * 0.42,
                     z + math.sin(a) * r * 0.92 * math.sin(math.radians(tilt)) + (t - 0.5) * r * 0.5)
                if prev:
                    g.capsule(prev, q, 0.55, 0.45, segs=6, rings=1)
                prev = q
        rig.part(jn, g, glow=PLASMA_LT, outline=0)
    return lambda f: {f"orb{i}": {"show": i == f} for i in range(n)}


def plasma_brazier():
    def build(rig):
        build_plasma_brazier(rig)
        _pose[0] = plasma_orb(rig, "loop", (0.0, 1.0, 31.8), r=6.6)

    _pose = [lambda f: {}]
    return deco_module("plasma_brazier", "Plasma Brazier", build, height=40, canvas=(110, 130), feet=(55, 114),
                       loop=(4, lambda f: _pose[0](f)), loop_ms=140, glow=((0.0, -1.0, 31.8), 17.0, "#C08CFF"),
                       motion="pulse", shadow=12.0, loop_outline=(1.2, 0.7, 1.0))


# =================================================================================================
# Trophies
# =================================================================================================
def build_mammoth_tusks(rig):
    """A hunter's trophy: two great mammoth tusks rising from a rough stone and meeting overhead, carved bands
    round them, leather lashings at their roots, a round hide shield painted in the side's colour between them."""
    g = Geo()
    n0 = nverts(g)
    box(g, (0.0, 1.5, 4.0), (12.0, 8.0, 4.0), p=4)
    rough(g, n0, (0.0, 1.5, 4.0), 0.07, seed=91, freq=0.3)
    rig.part("body", g, STONE, outline=0.6)
    g = Geo()
    for x, z, k in ((-10.4, 6.6, 1.8), (9.8, 3.0, 1.5)):
        g.blob((x, -6.6, z), (k, 1.3, k * 0.8), p=2.0, cuts=2, rot=(0, 30, 0))
    rig.part("body", g, STONE_DK, outline=0, highlight=False)
    tusk, bands = Geo(), Geo()
    for sx, sy in ((1, -1.4), (-1, 2.0)):
        pts = [(sx * 5.4, sy, 7.6), (sx * 10.2, sy - 0.6, 17.0), (sx * 11.6, sy - 1.0, 28.0), (sx * 8.6, sy - 0.8, 38.6),
               (sx * 3.2, sy - 0.2, 45.0), (sx * -1.2, sy, 47.0)]
        radii = [2.9, 2.6, 2.2, 1.7, 1.1, 0.55]
        for k, (p0, p1) in enumerate(zip(pts, pts[1:])):
            tusk.capsule(p0, p1, radii[k], radii[k + 1], segs=12, rings=2)
        for k in (1, 2, 3):
            p0, p1 = pts[k], pts[k + 1]
            m = tuple(a + (b - a) * 0.25 for a, b in zip(p0, p1))
            d = tuple(b - a for a, b in zip(p0, p1))
            L = math.sqrt(sum(c * c for c in d))
            d = tuple(c / L for c in d)
            rr = radii[k] * 0.92 + 0.35
            bands.capsule(tuple(c - dd * 0.5 for c, dd in zip(m, d)), tuple(c + dd * 0.5 for c, dd in zip(m, d)), rr, rr,
                          segs=12, rings=1)
    rig.part("body", tusk, BONE, finish="gloss", outline=0.6)
    rig.part("body", bands, BONE_DK, outline=0.2)
    g = Geo()
    for sx, sy in ((1, -1.4), (-1, 2.0)):
        for dz in (8.6, 10.2):
            g.capsule((sx * 5.6 - 1.6, sy - 3.0, dz), (sx * 5.8 + 1.8, sy - 3.0, dz + 0.8), 0.7, segs=6, rings=1)
    rig.part("body", g, "#7A5A3C", finish="hair", outline=0.3)
    # the hide shield between the tusks, painted in the side's colour, a bone rim and crossed lashings
    sz = 24.0
    g = Geo()
    cyl(g, (0.0, -1.6, sz), (0.0, -3.0, sz), 6.4, 6.4, bevel=0.5, segs=20)
    rig.part("body", g, "#B59A74", outline=0.5)
    g = Geo()
    cyl(g, (0.0, -2.9, sz), (0.0, -3.5, sz), 5.2, 5.2, bevel=0.2, segs=20)
    rig.part("body", g, team=True, outline=0.2)
    g = Geo()
    for a in (45, 135):
        ca, sa = math.cos(math.radians(a)), math.sin(math.radians(a))
        g.capsule((ca * 5.4, -3.8, sz + sa * 5.4), (-ca * 5.4, -3.8, sz - sa * 5.4), 0.45, segs=6, rings=1)
    g.sphere((0.0, -3.9, sz), 1.2, cuts=2)
    rig.part("body", g, BONE, outline=0.2)


def mammoth_tusks():
    return deco_module("mammoth_tusks", "Mammoth Tusks", build_mammoth_tusks, height=50, canvas=(130, 140),
                       feet=(65, 124), team=True, shadow=15.0)


STEEL = "#B9C0CC"
STEEL_DK = "#8F97A4"


def build_knight_helm(rig):
    """A knight's great helm on a wooden display stand: eye slits and breathing holes, a raised ridge and a gilt
    cross on its face, rivets round its flared rim, and a plume of feathers in the side's colour on top."""
    g = Geo()
    for a in (0.0, 90.0):
        box(g, (0.0, 1.0, 1.4), (10.0, 1.6, 1.4), p=5, rot=(0, 0, a + 30))
    g.capsule((0.0, 1.0, 2.0), (0.0, 1.0, 28.0), 1.7, 1.5, segs=10, rings=1)
    g.capsule((-5.0, 1.0, 26.4), (5.0, 1.0, 26.4), 1.1, segs=8, rings=1)
    rig.part("body", g, WOOD, outline=0.5)
    z0 = 27.4
    g = Geo()
    box(g, (0.0, 1.0, z0 + 8.6), (6.4, 6.0, 8.4), p=3.2, taper=(1.08, 0.92))
    rig.part("body", g, STEEL, finish="metal", outline=0.6)
    g = Geo()
    g.lathe([(6.6, -0.8), (7.6, -0.6), (7.7, 0.0), (7.4, 0.7), (6.6, 0.9)], (0.0, 1.0, z0 + 0.8), segs=20,
            squash=(1.0, 0.94))
    rig.part("body", g, STEEL_DK, finish="metal", outline=0.4)
    g = Geo()
    for a in front_arc(7.4, 205, 335, 7):
        g.sphere((math.cos(a) * 7.35, 1.0 + math.sin(a) * 6.95, z0 + 1.0), 0.5, cuts=1)
    rig.part("body", g, "#D7DCE4", finish="metal", outline=0)
    g = Geo()
    box(g, (-2.6, -5.0, z0 + 10.8), (2.2, 0.6, 0.55), p=4, cuts=2)
    box(g, (2.6, -5.0, z0 + 10.8), (2.2, 0.6, 0.55), p=4, cuts=2)
    for dx, dz in ((2.2, 6.8), (3.6, 6.4), (2.2, 5.2), (3.6, 4.8), (-2.2, 6.8), (-3.6, 6.4)):
        g.sphere((dx, -5.0, z0 + dz), 0.4, cuts=1)
    rig.part("body", g, INK, outline=0, highlight=False)
    g = Geo()
    box(g, (0.0, -5.3, z0 + 8.0), (0.6, 0.5, 7.0), p=3.0, cuts=2)
    box(g, (0.0, -5.3, z0 + 12.2), (4.6, 0.5, 0.55), p=3.0, cuts=2)
    rig.part("body", g, GOLD, finish="bronze", outline=0.3)
    # the plume: feathers fanning up and back from a socket on the crown
    g = Geo()
    g.capsule((0.0, 1.2, z0 + 16.6), (0.0, 1.2, z0 + 18.4), 1.2, segs=8, rings=1)
    rig.part("body", g, GOLD, finish="bronze", outline=0.3)
    g = Geo()
    for k, (ang, L) in enumerate(((-28, 10.0), (-8, 11.6), (14, 10.4), (34, 8.6))):
        a = math.radians(90 + ang)
        tip = (math.cos(a) * L * -1.0 - 1.0, 1.4 + k * 0.4, z0 + 18.0 + math.sin(a) * L)
        mid = ((tip[0] - 1.0) / 2, 1.3 + k * 0.4, (z0 + 18.0 + tip[2]) / 2 + 0.6)
        d = (tip[0] - mid[0], 0.0, tip[2] - mid[2])
        g.blob(mid, (L * 0.55, 1.6, 1.9), p=2.0, cuts=3, taper=(1.0, 1.0), rot=orient(d))
    rig.part("body", g, team=True, outline=0.4)


def knight_helm():
    return deco_module("knight_helm", "Knight Helm", build_knight_helm, height=56, canvas=(110, 160), feet=(55, 144),
                       team=True, shadow=11.0)


def build_golden_cup(rig):
    """A champion's cup on a violet plinth with a gilt plaque: a stepped foot, a tall stem with a knop, a deep bowl
    with an engraved band and a star, a moulded lip and two big loop handles."""
    plinth(rig, "body", 8.0, 6.2, 8.0, "#5E4C78", "#72608C", "#4A3B60")
    g = Geo()
    box(g, (0.0, -5.3, 4.6), (4.0, 0.4, 1.6), p=4, cuts=2)
    rig.part("body", g, GOLD, finish="bronze", outline=0.3)
    z = 8.0
    g = Geo()
    g.lathe([(0, 0), (5.0, 0), (5.2, 1.0), (4.0, 1.6), (3.8, 2.6), (1.8, 3.6), (1.3, 7.0), (2.4, 8.0), (2.6, 8.8),
             (1.4, 9.6), (1.5, 12.0), (3.6, 13.0), (5.8, 15.6), (6.8, 20.0), (7.0, 25.0), (7.8, 25.8), (7.6, 26.6),
             (6.2, 26.2), (0, 24.6)], (0.0, 1.0, z), segs=28)
    rig.part("body", g, GOLD, finish="bronze", outline=0.6)
    g = Geo()
    g.lathe([(6.2, -1.2), (6.95, -1.0), (7.05, 0.0), (6.95, 1.0), (6.2, 1.2)], (0.0, 1.0, z + 20.6), segs=28)
    rig.part("body", g, "#C9A84E", finish="bronze", outline=0.2)
    g = Geo()
    for a in front_arc(7.0, 205, 335, 9):
        g.sphere((math.cos(a) * 7.05, 1.0 + math.sin(a) * 7.05, z + 20.6), 0.42, cuts=1)
    rig.part("body", g, "#9C7A2E", outline=0, highlight=False)
    g = Geo()
    g.star((0.0, 1.0 - 7.2, z + 16.6), 2.6, 1.1, 0.8)
    rig.part("body", g, GOLD_LT, finish="bronze", outline=0.2)
    # the handles: C loops from under the lip out and down to the bowl's waist
    g = Geo()
    for sx in (-1, 1):
        pts = [(sx * 6.6, 1.0, z + 23.6), (sx * 10.0, 1.0, z + 24.0), (sx * 12.2, 1.0, z + 21.4), (sx * 11.6, 1.0, z + 17.6),
               (sx * 9.4, 1.0, z + 15.2), (sx * 6.2, 1.0, z + 15.0)]
        for a, b in zip(pts, pts[1:]):
            g.capsule(a, b, 1.0, 1.0, segs=8, rings=1)
    rig.part("body", g, GOLD, finish="bronze", outline=0.4)


def golden_cup():
    return deco_module("golden_cup", "Golden Cup", build_golden_cup, height=46, canvas=(110, 130), feet=(55, 116),
                       glow=((0.0, -2.0, 30.0), 11.0, "#FFE7A0"), shadow=11.0)


def build_star_trophy(rig):
    """A legendary trophy: a big golden star on a slim stem inside a tilted pale orbit ring, on a dark violet plinth
    with a gold band and small stars."""
    plinth(rig, "body", 8.4, 6.4, 9.0, "#3A2E50", "#4C3E66", "#2C2340")
    g = Geo()
    box(g, (0.0, 1.0, 7.5), (8.6, 6.6, 0.45), p=6, cuts=2)
    for x in (-4.6, 4.6):
        g.star((x, -5.6, 4.4), 1.2, 0.5, 0.5)
    rig.part("body", g, GOLD, finish="bronze", outline=0.2)
    g = Geo()
    cyl(g, (0.0, 1.0, 9.0), (0.0, 1.0, 11.0), 3.6, 3.0, bevel=0.5, segs=16)
    cyl(g, (0.0, 1.0, 11.0), (0.0, 1.0, 22.0), 1.0, 0.8, bevel=0.2, segs=10)
    g.sphere((0.0, 1.0, 22.6), 1.7, cuts=2)
    rig.part("body", g, "#B8B0D0", finish="metal", outline=0.4)
    g = Geo()
    g.star((0.0, 0.0, 33.0), 11.0, 4.7, 3.6)
    rig.part("body", g, GOLD, finish="bronze", outline=0.6)
    g = Geo()
    g.star((0.0, -1.9, 33.4), 6.0, 2.6, 0.8)
    rig.part("body", g, GOLD_LT, finish="bronze", outline=0)
    g = Geo()
    torus(g, (0.0, 0.0, 33.0), 18.0, 0.85, segs=44, rsegs=6, rot=(12, 0, 12))
    rig.part("body", g, "#C7B8F2", finish="gloss", outline=0.3)


def star_trophy():
    return deco_module("star_trophy", "Star Trophy", build_star_trophy, height=48, canvas=(130, 140), feet=(65, 124),
                       glow=((0.0, -2.0, 33.0), 14.0, "#FFF0A0"), motion="glint",
                       glints=(((0.0, -2.0, 44.0), 1.8), ((-10.4, -2.0, 36.4), 1.4), ((7.0, -2.0, 24.6), 1.2)),
                       shadow=12.0)


def build_shield_rack(rig):
    """An armoury rack: two posts on feet with a crossbar and pegs, two spears crossed behind, a kite shield in the
    side's colour with an iron rim and a gold boss, and a round steel shield with rings of rivets."""
    g = Geo()
    for sx in (-1, 1):
        g.capsule((sx * 10.0, 2.0, 0.6), (sx * 10.0, 2.0, 30.0), 1.4, 1.3, segs=8, rings=1)
        box(g, (sx * 10.0, 2.0, 0.9), (2.0, 4.6, 0.9), p=5, cuts=2)
    g.capsule((-11.4, 1.6, 26.6), (11.4, 1.6, 26.6), 1.05, segs=8, rings=1)
    g.capsule((-11.4, 1.6, 9.0), (11.4, 1.6, 9.0), 0.9, segs=8, rings=1)
    rig.part("body", g, WOOD, outline=0.5)
    g = Geo()
    for sx in (-1, 1):
        g.capsule((sx * -10.4, 4.0, 1.0), (sx * 8.6, 4.0, 44.0), 0.7, segs=8, rings=1)
    rig.part("body", g, WOOD_LT, outline=0.4)
    g = Geo()
    for sx in (-1, 1):
        g.blob((sx * 9.5, 4.0, 47.4), (1.9, 0.7, 4.4), p=2.0, cuts=2, taper=(1.0, 0.05), rot=(0, sx * -24, 0))
        g.capsule((sx * 8.4, 4.0, 43.4), (sx * 8.9, 4.0, 44.6), 1.1, segs=8, rings=1)
    rig.part("body", g, STEEL, finish="metal", outline=0.3)
    # the kite shield on the left peg
    rim = [(0.0, 9.6), (5.0, 8.6), (5.2, 2.0), (3.2, -4.6), (0.0, -9.2), (-3.2, -4.6), (-5.2, 2.0), (-5.0, 8.6)]
    cx, cz = -5.2, 19.6
    g = Geo().slab([(cx + px * 1.05, cz + pz * 1.05) for px, pz in rim], -0.6, 1.6)
    rig.part("body", g, IRON, finish="metal", outline=0.5)
    g = Geo().slab([(cx + px * 0.86, cz + pz * 0.86 + 0.2) for px, pz in rim], -1.6, 0.8)
    rig.part("body", g, team=True, outline=0.3)
    g = Geo()
    g.sphere((cx, -2.0, cz + 2.0), 1.6, cuts=2)
    rig.part("body", g, GOLD, finish="bronze", outline=0.3)
    # the round shield on the right
    rx, rz = 6.0, 17.4
    g = Geo()
    cyl(g, (rx, 0.0, rz), (rx, -1.6, rz), 6.6, 6.6, bevel=0.6, segs=24)
    rig.part("body", g, STEEL_DK, finish="metal", outline=0.5)
    g = Geo()
    cyl(g, (rx, -1.5, rz), (rx, -2.1, rz), 5.2, 5.2, bevel=0.3, segs=24)
    rig.part("body", g, STEEL, finish="metal", outline=0.2)
    g = Geo()
    for k in range(10):
        a = 2 * math.pi * k / 10
        g.sphere((rx + math.cos(a) * 5.9, -1.8, rz + math.sin(a) * 5.9), 0.45, cuts=1)
    g.sphere((rx, -2.4, rz), 1.7, cuts=2)
    rig.part("body", g, "#D7DCE4", finish="metal", outline=0.2)


def shield_rack():
    return deco_module("shield_rack", "Shield Rack", build_shield_rack, height=52, canvas=(130, 150), feet=(65, 134),
                       team=True, shadow=15.0)


# =================================================================================================
# More plants (three-blob canopies, tapered trunks, rimmed pots)
# =================================================================================================
OLIVE_LEAF = "#8FAA74"   # silvery olive green
OLIVE_LEAF_LT = "#ABC394"
OLIVE_LEAF_DK = "#76925E"
BARK = "#7E6448"
BARK_DK = "#5E4934"


def canopy(g, center, radii, seed, lumps=5):
    """A lumpy leaf mass: one rounded blob with smaller blobs bulging from its top and sides (a tree's crown)."""
    rnd = random.Random(seed)
    cx, cy, cz = center
    rx, ry, rz = radii
    rock(g, center, radii, seed=seed, jag=0.07, p=2.2, cuts=4)
    for k in range(lumps):
        a = math.radians(rnd.uniform(10, 170))
        g.blob((cx + math.cos(a) * rx * 0.62, cy - ry * rnd.uniform(0.1, 0.45), cz + math.sin(a) * rz * 0.6),
               (rx * rnd.uniform(0.32, 0.46), ry * 0.5, rz * rnd.uniform(0.38, 0.5)), p=2.1, cuts=3)


def build_olive_tree(rig):
    """A young olive tree: a gnarled twin trunk twisting up from a mound of earth into three branches, each under a
    silvery-green crown (three blobs, lighter on top), dark olives hanging in the leaves."""
    g = Geo()
    rock(g, (0.0, 2.0, 1.2), (11.0, 8.0, 3.0), seed=101, jag=0.1, p=2.6)
    rig.part("body", g, EARTH, outline=0.5)
    g = Geo()
    rock(g, (-9.6, -4.2, 1.8), (3.2, 2.6, 2.2), seed=102, jag=0.18)
    rig.part("body", g, GREY, outline=0.4)
    g = Geo()
    for ph, sx in ((0.0, 1), (math.pi, -1)):
        prev = None
        for k in range(8):
            t = k / 7
            q = (sx * 1.6 * math.cos(ph + t * 3.4) * (1 - 0.3 * t) + t * 1.2, 1.0 + 1.4 * math.sin(ph + t * 3.4),
                 2.0 + t * 22.0)
            if prev:
                g.capsule(prev, q, 2.6 - 0.9 * t, 2.4 - 0.9 * t, segs=10, rings=1)
            prev = q
    for a, b, r0 in (((0.6, 1.0, 22.0), (-8.6, 0.0, 28.0), 1.5), ((1.0, 1.0, 23.0), (8.4, 1.4, 29.0), 1.5),
                     ((0.4, 1.4, 23.0), (0.0, 1.6, 32.0), 1.4)):
        g.capsule(a, b, r0, r0 * 0.6, segs=8, rings=1)
    rig.part("body", g, BARK, outline=0.5)
    g = Geo()
    for z0, dx in ((4.0, -1.0), (9.0, 1.2), (14.0, -0.6)):
        g.capsule((dx, -1.6, z0), (dx + 0.8, -1.4, z0 + 4.0), 0.35, segs=6, rings=1)
    rig.part("body", g, BARK_DK, outline=0, highlight=False)
    g = Geo()
    canopy(g, (0.0, 1.6, 36.6), (10.6, 7.8, 7.4), seed=103)
    canopy(g, (-11.0, 0.6, 29.6), (7.6, 6.6, 5.8), seed=104, lumps=4)
    canopy(g, (10.4, 1.4, 30.6), (7.8, 6.6, 6.0), seed=105, lumps=4)
    rig.part("body", g, OLIVE_LEAF, finish="hair", outline=0.6)
    g = Geo()
    for c, r in (((-1.6, -3.0, 41.4), (5.6, 3.0, 2.8)), ((-12.0, -3.0, 33.4), (3.6, 2.6, 2.0)), ((9.6, -3.4, 34.6), (3.8, 2.6, 2.2))):
        g.blob(c, r, p=2.1, cuts=3)
    rig.part("body", g, OLIVE_LEAF_LT, finish="hair", outline=0)
    g = Geo()
    for x, y, z in ((-4.4, -6.4, 33.4), (2.4, -6.6, 35.4), (6.0, -5.2, 30.8), (-12.6, -5.2, 28.4), (12.8, -5.0, 29.6),
                    (-8.0, -5.0, 30.0)):
        g.sphere((x, y, z), 0.95, cuts=2)
    rig.part("body", g, "#4E3B5C", finish="gloss", outline=0.2)


def olive_tree():
    return deco_module("olive_tree", "Olive Tree", build_olive_tree, height=46, canvas=(130, 130), feet=(65, 114),
                       motion="sway", shadow=14.0)


HEDGE = "#4F8A3E"
HEDGE_LT = "#6BA651"


def build_topiary(rig):
    """A clipped box tree in a stone garden urn: a moulded urn with a rim and two ring handles, a straight trunk and
    two clipped balls, their clipped faces catching the light on top."""
    g = Geo()
    g.lathe([(0, 0), (6.6, 0), (6.8, 1.4), (4.4, 2.6), (3.0, 4.4), (3.2, 6.0), (6.0, 7.6), (8.8, 11.6), (9.6, 15.2),
             (10.4, 15.8), (10.4, 17.2), (8.6, 17.4), (0, 16.6)], (0.0, 1.0, 0.0), segs=24)
    rig.part("body", g, GREY_LT, outline=0.6)
    g = Geo()
    g.lathe([(8.4, -0.9), (9.5, -0.7), (9.7, 0.0), (9.5, 0.7), (8.4, 0.9)], (0.0, 1.0, 12.2), segs=24)
    for sx in (-1, 1):
        torus(g, (sx * 10.2, 1.0, 13.0), 1.9, 0.55, segs=16, rsegs=6, rot=(90, 0, 0))
    rig.part("body", g, GREY, outline=0.4)
    g = Geo().lathe([(0, 0), (8.6, 0), (8.2, 0.8), (0, 1.0)], (0.0, 1.0, 16.6), segs=24)
    rig.part("body", g, EARTH_DK, outline=0, highlight=False)
    g = Geo()
    g.capsule((0.0, 1.0, 16.8), (0.0, 1.0, 39.0), 1.25, 1.0, segs=8, rings=1)
    rig.part("body", g, BARK, outline=0.4)
    g = Geo()
    n0 = nverts(g)
    g.sphere((0.0, 1.0, 29.0), 8.4, cuts=5)
    rough(g, n0, (0.0, 1.0, 29.0), 0.05, seed=111, freq=0.9)
    n0 = nverts(g)
    g.sphere((0.0, 1.0, 43.6), 5.6, cuts=5)
    rough(g, n0, (0.0, 1.0, 43.6), 0.05, seed=112, freq=1.1)
    rig.part("body", g, HEDGE, finish="hair", outline=0.6)
    g = Geo()
    for c, r in (((-1.4, -3.6, 33.6), (4.6, 2.4, 2.0)), ((-1.0, -2.0, 46.4), (3.0, 1.8, 1.4))):
        g.blob(c, r, p=2.1, cuts=3)
    rig.part("body", g, HEDGE_LT, finish="hair", outline=0)


def topiary():
    return deco_module("topiary", "Topiary", build_topiary, height=50, canvas=(110, 140), feet=(55, 124), shadow=12.0)


CLAY = "#C9A27E"         # sandy clay (sat < 40%)
CLAY_DK = "#A88565"
CACTUS = "#5F9A55"
CACTUS_DK = "#4C7F44"
CACTUS_LT = "#7DB66C"


def build_potted_cactus(rig):
    """A saguaro in a clay pot: a ribbed column with two raised arms, pale spines along its ribs, a pink flower on
    top; the pot has a rolled rim and a cream zig-zag painted round it."""
    g = Geo()
    g.lathe([(0, 0), (6.0, 0), (6.2, 0.6), (7.6, 9.6), (8.8, 10.2), (8.8, 12.8), (7.4, 13.0), (0, 12.4)], (0.0, 1.0, 0.0),
            segs=24)
    rig.part("body", g, CLAY, outline=0.6)
    g = Geo().lathe([(0, 0), (7.2, 0), (6.9, 0.7), (0, 0.9)], (0.0, 1.0, 12.4), segs=24)
    rig.part("body", g, EARTH_DK, outline=0, highlight=False)
    g = Geo()
    pts = []
    for k, a in enumerate(front_arc(7.0, 200, 340, 11)):
        r = 6.9 + (0.25 if k % 2 else 0.0)
        pts.append((math.cos(a) * r, 1.0 + math.sin(a) * r, 5.6 + (1.4 if k % 2 else -1.4)))
    for a, b in zip(pts, pts[1:]):
        g.capsule(a, b, 0.55, segs=6, rings=1)
    rig.part("body", g, "#EFE6CF", outline=0)
    # the cactus: the column, two arms (out, then up), ribs and spines on the camera side
    g = Geo()
    g.capsule((0.0, 1.0, 12.6), (0.0, 1.0, 40.0), 4.4, 4.0, segs=12, rings=3)
    for sx, z0, out, up in ((-1, 22.0, 7.4, 33.0), (1, 27.0, 6.8, 37.0)):
        g.capsule((sx * 2.6, 1.0, z0), (sx * out, 1.0, z0 + 1.2), 2.4, 2.4, segs=10, rings=2)
        g.capsule((sx * out, 1.0, z0 + 1.2), (sx * (out + 0.2), 1.0, up), 2.4, 2.1, segs=10, rings=2)
    rig.part("body", g, CACTUS, finish="gloss", outline=0.6)
    ribs, sp = Geo(), Geo()
    for a in front_arc(4.3, 230, 310, 3):
        x, y = math.cos(a) * 4.15, 1.0 + math.sin(a) * 4.15
        ribs.capsule((x, y, 15.0), (x * 0.95, y, 39.0), 0.5, segs=6, rings=1)
        for z in range(17, 40, 4):
            sp.sphere((x * 1.08, y - 0.5, z), 0.42, cuts=1)
    for sx, out, z0, up in ((-1, 7.6, 24.0, 33.0), (1, 7.0, 29.0, 37.0)):
        ribs.capsule((sx * out, -1.3, z0), (sx * out, -1.3, up), 0.4, segs=6, rings=1)
        for z in range(int(z0) + 2, int(up), 4):
            sp.sphere((sx * out, -1.9, z), 0.4, cuts=1)
    rig.part("body", ribs, CACTUS_LT, finish="gloss", outline=0)
    rig.part("body", sp, "#F4EFD8", outline=0)
    g = Geo()
    for k in range(5):
        a = math.radians(90 + 72 * k)
        g.blob((math.cos(a) * 1.6, -0.4, 42.6 + math.sin(a) * 1.2), (1.6, 1.1, 1.3), p=2.0, cuts=2, rot=(0, -math.degrees(a), 0))
    rig.part("body", g, "#F07AA8", outline=0.4)
    g = Geo()
    g.sphere((0.0, -1.2, 42.8), 0.9, cuts=2)
    rig.part("body", g, "#FFE48A", outline=0)


def potted_cactus():
    return deco_module("potted_cactus", "Potted Cactus", build_potted_cactus, height=46, canvas=(110, 130),
                       feet=(55, 114), shadow=11.0)


GLAZE = "#4F6B5A"        # a dark slate-green glaze (never the team blue)
PAD = "#4E7A3C"
PAD_LT = "#6C9A4E"


def build_bonsai(rig):
    """A bonsai in a shallow glazed tray on little feet: a trunk twisting left then up with a branch to the right,
    three cloud pads of foliage (darker under, lighter on top), a moss mound and a small rock in the soil."""
    g = Geo()
    box(g, (0.0, 1.0, 4.6), (13.0, 7.6, 2.6), p=5, taper=(0.9, 1.0))
    rig.part("body", g, GLAZE, finish="gloss", outline=0.6)
    g = Geo()
    box(g, (0.0, 1.0, 7.4), (13.6, 8.2, 0.7), p=5, cuts=2)
    for sx in (-1, 1):
        box(g, (sx * 10.0, -5.2, 1.0), (1.6, 1.2, 1.0), p=4, cuts=2)
    rig.part("body", g, "#3F5749", finish="gloss", outline=0.4)
    g = Geo()
    box(g, (0.0, 1.0, 7.9), (12.6, 7.2, 0.4), p=4, cuts=2)
    rig.part("body", g, EARTH_DK, outline=0, highlight=False)
    g = Geo()
    rock(g, (5.4, -1.0, 8.6), (2.6, 2.2, 1.8), seed=121, jag=0.15)
    rig.part("body", g, GREY, outline=0.4)
    g = Geo()
    g.blob((-3.0, 0.0, 8.4), (6.0, 4.6, 1.6), p=2.2, cuts=3)
    rig.part("body", g, MOSS, finish="hair", outline=0.4)
    g = Geo()
    trunk = [(-1.0, 1.0, 8.0), (-4.6, 1.0, 13.0), (-6.4, 0.8, 18.0), (-4.4, 1.0, 23.0), (-1.4, 1.0, 26.4), (-1.6, 1.0, 29.0)]
    radii = [2.6, 2.3, 2.0, 1.7, 1.4, 1.2]
    for k, (a, b) in enumerate(zip(trunk, trunk[1:])):
        g.capsule(a, b, radii[k], radii[k + 1], segs=10, rings=1)
    g.capsule((-4.8, 1.0, 20.6), (2.0, 1.0, 21.6), 1.3, 0.9, segs=8, rings=1)
    g.capsule((2.0, 1.0, 21.6), (6.8, 1.0, 22.4), 0.9, 0.7, segs=8, rings=1)
    g.capsule((-6.2, 1.0, 17.4), (-10.6, 0.6, 19.4), 1.0, 0.7, segs=8, rings=1)
    rig.part("body", g, BARK, outline=0.5)
    g = Geo()
    for c, r, sd in (((-2.0, 1.0, 31.4), (8.2, 6.0, 3.4), 122), ((-11.4, 0.4, 21.4), (5.8, 4.8, 2.8), 123),
                     ((8.0, 1.0, 24.2), (6.6, 5.0, 3.0), 124)):
        rock(g, c, r, seed=sd, jag=0.09, p=2.4, cuts=4)
    rig.part("body", g, PAD, finish="hair", outline=0.6)
    g = Geo()
    for c, r in (((-2.6, -1.4, 33.6), (6.0, 3.6, 1.4)), ((-11.6, -1.2, 23.2), (4.0, 3.0, 1.1)), ((7.6, -1.2, 26.2), (4.6, 3.2, 1.2))):
        g.blob(c, r, p=2.1, cuts=3)
    rig.part("body", g, PAD_LT, finish="hair", outline=0)


def bonsai():
    return deco_module("bonsai", "Bonsai", build_bonsai, height=38, canvas=(130, 110), feet=(65, 94), shadow=15.0)


CRYSTAL = "#D8C8FF"
CRYSTAL_LT = "#F4EEFF"
CRYSTAL_MINT = "#9FF0D2"
CRYSTAL_PINK = "#FFB4DE"


def build_crystal_flower(rig):
    """A crystal flower from another world: a dark pot with a glowing mint rim, a stem with two leaves and a
    blossom of faceted crystal petals (lilac, mint and pink) round a glowing heart."""
    g = Geo()
    g.lathe([(0, 0), (5.4, 0), (5.6, 0.8), (6.8, 7.6), (7.6, 8.2), (7.6, 10.0), (6.4, 10.2), (0, 9.6)], (0.0, 1.0, 0.0),
            segs=8, rot=(0, 0, 22.5))
    rig.part("body", g, "#3E3350", finish="gloss", outline=0.6)
    g = Geo()
    g.lathe([(7.0, -0.3), (7.75, -0.2), (7.75, 0.2), (7.0, 0.3)], (0.0, 1.0, 8.4), segs=8, rot=(0, 0, 22.5))
    rig.part("body", g, glow=MINT, outline=0)
    g = Geo()
    stem = [(0.0, 1.0, 9.6), (0.6, 0.8, 16.0), (-0.4, 0.4, 22.0), (0.0, 0.0, 26.0)]
    for a, b in zip(stem, stem[1:]):
        g.capsule(a, b, 0.9, 0.8, segs=8, rings=1)
    rig.part("body", g, "#5E9A55", outline=0.4)
    g = Geo()
    leaf(g, (0.2, 0.4, 15.0), 8.0, 4.0, 20.0, tilt=-20.0, thick=0.9)
    leaf(g, (0.0, 0.2, 19.0), 7.0, 3.6, 158.0, tilt=-20.0, thick=0.9)
    rig.part("body", g, "#6FAE5E", finish="hair", outline=0.4)
    from world.base_skins_kit import crystal_prism
    hz = 30.0
    for color, petals in ((CRYSTAL, ((90, -10, 13.0, 2.6), (30, -20, 11.0, 2.4), (150, -20, 11.0, 2.4))),
                          (CRYSTAL_MINT, ((-12, -30, 9.6, 2.2), (62, -55, 8.6, 2.0))),
                          (CRYSTAL_PINK, ((192, -30, 9.6, 2.2), (118, -55, 8.6, 2.0)))):
        g = Geo()
        for az, tilt, L, r in petals:
            a, t = math.radians(az), math.radians(tilt)
            d = (math.cos(a) * math.cos(t), math.sin(t) * 0.8, math.sin(a) * math.cos(t))
            crystal_prism(g, (0.0, -0.4, hz), (d[0] * L, -0.4 + d[1] * L, hz + d[2] * L), r, twist=az * 0.3)
        rig.part("body", g, color, finish="gloss", outline=0.5)
    g = Geo()
    g.sphere((0.0, -2.2, hz), 2.6, cuts=3)
    rig.part("body", g, glow="#FFF4FF", outline=0)


def crystal_flower():
    return deco_module("crystal_flower", "Crystal Flower", build_crystal_flower, height=44, canvas=(110, 130),
                       feet=(55, 114), glow=((0.0, -2.0, 30.0), 13.0, "#C9A8FF"), motion="glint",
                       glints=(((0.0, -2.0, 42.6), 1.6), ((-9.4, -3.0, 25.4), 1.3), ((9.0, -3.0, 36.0), 1.3)),
                       shadow=10.0)


DECORATIONS = [fire_bowl(), fern(), stone_idol(), lion_statue(), knight_statue(), owl_statue(), astro_statue(),
               hide_banner(), royal_standard(), regiment_colors(), neon_banner(), iron_brazier(), gas_lamp(),
               plasma_brazier(), mammoth_tusks(), knight_helm(), golden_cup(), star_trophy(), shield_rack(),
               olive_tree(), topiary(), potted_cactus(), bonsai(), crystal_flower()]
