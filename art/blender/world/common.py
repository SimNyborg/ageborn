"""Shared building blocks for the world art: turrets and bases (DESIGN A2.8, A5, A11).

Turrets and bases go through the same pipeline as the units (ageborn_art.pipeline.run_unit):
one module-like object per visual with SLUG, CANVAS, FEET, build(rig) and clips(). This file
adds what world art needs on top of the unit library, without changing it:

  * geometry helpers for buildings and machines (rounded boxes, bevelled cylinders, lumpy
    rocks, planks, rope, crenellations) in lu, character space (x forward, y away, z up);
  * a waving team flag (a chain of cloth segments),
  * the turret contract: a static `mount` frame plus a rotating head (`idle`, `fire` with a
    per-frame muzzle anchor), and whole-turret `build` and `destroyed` clips;
  * the base contract: `body` frames per crumble stage, flag loops, Treasury props, with mount
    ledges placed so their projected top lands exactly on the sim-view mount points.
"""
import math
import random
from types import SimpleNamespace

from mathutils import Vector

from ageborn_art import config as C
from ageborn_art.anim import Clip, merge
from ageborn_art.geometry import Geo

# -- shared colours -------------------------------------------------------------------------
FLASH = "#FFF1C8"        # effect flashes stay desaturated (A11 colour rule)
FLASH_CORE = "#FFFFFF"
FIRE = "#FFE3B0"
SMOKE = "#E9E6DE"
SMOKE_DK = "#A9A49A"
IRON = "#3C3F45"
ROPE = "#B8A47E"
SHADOW_DARK = "#2A2622"

TURRET_YAW = -12.0
BASE_YAW = -12.0


# -- geometry -------------------------------------------------------------------------------
def cyl(g, p0, p1, r, r1=None, bevel=0.6, segs=18, squash=(1, 1)):
    """Bevelled cylinder (or cone with r1) from p0 to p1."""
    r1 = r if r1 is None else r1
    L = (Vector(p1) - Vector(p0)).length
    b = min(bevel, L / 4, r * 0.5)
    prof = [(0, 0), (max(0.01, r - b), 0), (r, b), (r1, L - b), (max(0.01, r1 - b), L), (0, L)]
    return g.lathe(prof, p0, p1, segs, squash=squash)


def box(g, c, r, p=6.0, rot=(0, 0, 0), taper=(1.0, 1.0), cuts=3, shift=(0.0, 0.0)):
    """Rounded box: centre c, half sizes r (rx, ry, rz)."""
    return g.blob(c, r, p=p, cuts=cuts, rot=rot, taper=taper, shift=shift)


def _jitter(g, n0, center, amount, seed, freq=0.11):
    """Pushes the vertices added since n0 in and out with a smooth seeded noise (lumpy rocks)."""
    rnd = random.Random(seed)
    waves = [(Vector((rnd.uniform(-1, 1), rnd.uniform(-1, 1), rnd.uniform(-1, 1))).normalized(),
              rnd.uniform(0, 6.28), rnd.uniform(0.6, 1.4)) for _ in range(5)]
    g.bm.verts.ensure_lookup_table()
    c = Vector(center)
    for v in g.bm.verts[n0:]:
        d = v.co - c
        n = sum(math.sin(d.dot(w) * freq * k + ph) for w, ph, k in waves) / 5.0
        v.co = c + d * (1.0 + amount * n)
    return g


def rock(g, center, radii, seed=0, jag=0.16, p=2.3, cuts=4, rot=(0, 0, 0), freq=None):
    """A lumpy boulder."""
    g.bm.verts.ensure_lookup_table()
    n0 = len(g.bm.verts)
    g.blob(center, radii, p=p, cuts=cuts, rot=rot)
    f = freq if freq is not None else 2.2 / max(1.0, min(radii))
    return _jitter(g, n0, center, jag, seed, f)


def plank(g, p0, p1, w, t, up=(0, 0, 1)):
    """A flat board from p0 to p1, w wide (across, in the `up` normal plane), t thick."""
    a, b = Vector(p0), Vector(p1)
    L = (b - a).length
    mid = (a + b) / 2
    d = (b - a).normalized()
    ang_y = -math.degrees(math.atan2(d.z, math.hypot(d.x, d.y)))
    ang_z = math.degrees(math.atan2(d.y, d.x))
    return g.blob(tuple(mid), (L / 2, w / 2, t / 2), p=5.0, cuts=2, rot=(0, ang_y, ang_z)) if up == (0, 0, 1) \
        else g.blob(tuple(mid), (L / 2, t / 2, w / 2), p=5.0, cuts=2, rot=(0, ang_y, ang_z))


def rope(g, pts, r=0.7):
    for a, b in zip(pts, pts[1:]):
        g.capsule(a, b, r)
    return g


def ring_band(g, center, axis_to, r, thick, width, segs=20):
    """A band around an axis (barrel hoops): lathe of a thin rim."""
    cx, cy, cz = center
    return g.lathe([(r - thick, -width / 2), (r, -width / 2 + 0.3), (r, width / 2 - 0.3), (r - thick, width / 2)],
                   center, axis_to, segs)


def crenels(g, x0, x1, y, z, n, w, h, d):
    step = (x1 - x0) / n
    for i in range(n):
        if i % 2 == 0:
            cx = x0 + step * (i + 0.5)
            box(g, (cx, y, z + h / 2), (w / 2, d / 2, h / 2), p=5)
    return g


# -- a waving flag ----------------------------------------------------------------------------
def flag(rig, parent, name, top, length=26.0, height=16.0, segs=4, pole=None, pole_color="#6B5440",
         team=True, color=None, tail=True, finial="#C9A227"):
    """A cloth flag on a pole: `top` is the pole top (character space); the cloth trails toward
    -X in `segs` chained joints `<name>0..`. `pole` = pole bottom z (None: no pole)."""
    tx, ty, tz = top
    rig.joint(name, parent, top)
    if pole is not None:
        g = Geo().capsule((tx, ty, pole), (tx, ty, tz + 1.5), 1.3)
        rig.part(name, g, pole_color, outline=0.7)
        g = Geo().sphere((tx, ty, tz + 3.0), 2.2, cuts=3)
        rig.part(name, g, finial, finish="metal", outline=0.6)
    seg = length / segs
    prev = name
    for i in range(segs):
        x0 = tx - 1.0 - seg * i
        jn = f"{name}{i}"
        rig.joint(jn, prev, (x0, ty, tz))
        x1 = x0 - seg - 0.4
        z0, z1 = tz, tz - height
        if tail and i == segs - 1:
            pts = [(x0, z0), (x1, z0 + 0.5), (x1 + seg * 0.55, (z0 + z1) / 2), (x1, z1 - 0.5), (x0, z1)]
        else:
            pts = [(x0, z0), (x1, z0), (x1, z1), (x0, z1)]
        g = Geo().slab(pts, ty, 1.4)
        if team:
            rig.part(jn, g, team=True, outline=0.5)
        else:
            rig.part(jn, g, color, outline=0.5)
        prev = jn
    return name


def flag_wave(name, f, n=4, segs=4, amp=18.0, droop=4.0, phase=0.0):
    """Pose for a waving flag at loop frame f of n (a travelling fold)."""
    pose = {}
    for i in range(segs):
        a = 2 * math.pi * (f / n) - i * 1.25 + phase
        pose[f"{name}{i}"] = {"rz": amp * math.sin(a) * (0.6 if i == 0 else 1.0), "r": -droop * 0.25 * math.cos(a)}
    return pose


# -- projection helpers -----------------------------------------------------------------------
def place(mx, my, depth, yaw_deg):
    """Character-space point whose projection is the 2D point (mx, my) in lu (x right, y DOWN,
    view space of the game) at `depth` (character y after yaw, + away from the camera)."""
    psi = math.radians(yaw_deg)
    e = math.radians(C.CAMERA_ELEVATION_DEG)
    # view: x' = x cos psi - y sin psi; y' = x sin psi + y cos psi (rotation about z by psi)
    # screen up = z cos e + y' sin e
    xr = mx          # x' (after yaw)
    yr = depth       # y' (after yaw)
    x = xr * math.cos(psi) + yr * math.sin(psi)
    y = -xr * math.sin(psi) + yr * math.cos(psi)
    z = (-my - yr * math.sin(e)) / math.cos(e)
    return (x, y, z)


def project(p, yaw_deg):
    """Screen-plane lu (x right, y up) of a character-space point."""
    psi = math.radians(yaw_deg)
    e = math.radians(C.CAMERA_ELEVATION_DEG)
    x, y, z = p
    xr = x * math.cos(psi) - y * math.sin(psi)
    yr = x * math.sin(psi) + y * math.cos(psi)
    return (round(xr, 2), round(z * math.cos(e) + yr * math.sin(e), 2))


# -- turret contract --------------------------------------------------------------------------
# Unique frames: mount 1, idle 4 (ping-pong), fire 5, build 4, destroyed 3.
IDLE_SEQ = [0, 1, 2, 3, 2, 1]
IDLE_MS = 170
FIRE_MS = [60, 50, 80, 100, 130]   # frame 1 = the shot (impact), flash shows on it
BUILD_MS = [140, 80, 90, 120]
DESTROYED_MS = [80, 100, 160]


def muzzle_flash(rig, joint, muzzle, size=1.0, name="flash", direction=0.0):
    """A hidden flash joint at `muzzle` (a star-burst along +X, desaturated so it follows A11)."""
    mx, my, mz = muzzle
    k = size
    rig.joint(name, joint, muzzle, hidden=True)
    rot = (0, -direction, 0)
    g = Geo().blob((mx + 7.0 * k, my - 2, mz), (7.5 * k, 2.0 * k, 3.4 * k), p=2.0)
    g.blob((mx + 4.0 * k, my - 2, mz + 2.6 * k), (5.0 * k, 1.8 * k, 1.9 * k), p=2.0, rot=(0, -38, 0))
    g.blob((mx + 4.0 * k, my - 2, mz - 2.6 * k), (5.0 * k, 1.8 * k, 1.9 * k), p=2.0, rot=(0, 38, 0))
    rig.part(name, g, glow=FIRE, outline=0)
    g = Geo().blob((mx + 4.5 * k, my - 3, mz), (4.6 * k, 1.8 * k, 2.0 * k), p=2.0)
    rig.part(name, g, glow=FLASH, outline=0)
    g = Geo().blob((mx + 2.8 * k, my - 4, mz), (2.6 * k, 1.4 * k, 1.4 * k), p=2.0)
    rig.part(name, g, glow=FLASH_CORE, outline=0)
    return name


def smoke_puff(rig, joint, at, size=1.0, name="smoke"):
    x, y, z = at
    k = size
    rig.joint(name, joint, at, hidden=True)
    g = Geo()
    for dx, dz, r in ((0, 0, 4.2), (4.6, 1.4, 3.4), (-2.8, 3.4, 3.2), (2.4, 4.8, 2.8), (7.6, -0.4, 2.4)):
        g.sphere((x + dx * k, y - 3, z + dz * k), r * k, cuts=3)
    rig.part(name, g, SMOKE, finish="dust", outline=0.6)
    return name


def turret_module(slug, name, age, height, canvas, feet, pivot, muzzle, build, idle=None, fire=None,
                  yaw=TURRET_YAW, aim=(-55, 40), fire_kind="recoil"):
    """A pipeline module for turret.<slug>.

    build(rig): adds parts. Joints `mount` (static, origin) and `head` (rotates about `pivot`)
    are created before build is called; put static parts on `mount`, rotating parts on `head`
    or its children. idle(f) / fire(f): extra pose channels (dicts) per unique frame.
    """
    px_, pz_ = pivot

    def _build(rig):
        rig.joint("all", "root", (0, 0, 0))
        rig.joint("mount", "all", (0, 0, 0))
        rig.joint("head", "all", (px_, 0, pz_))
        build(rig)
        rig.track("muzzle", "head", muzzle)

    idle_fn = idle or (lambda f: {})
    fire_fn = fire or (lambda f: {})
    HIDE_HEAD = {"head": {"hide": True}}
    HIDE_MOUNT = {"mount": {"hide": True}}

    def build_pose(f):
        # 0 falling (stretched, head lifted), 1 landing squash, 2 rebound, 3 settle
        table = [
            {"all": {"sz": 1.14, "sx": 0.9, "sy": 0.9}, "head": {"z": 5.0}},
            {"all": {"sz": 0.76, "sx": 1.2, "sy": 1.2}, "head": {"z": -3.0}},
            {"all": {"sz": 1.07, "sx": 0.95, "sy": 0.95}, "head": {"z": 1.5}},
            {},
        ]
        return merge(table[f], idle_fn(0))

    def destroyed_pose(f):
        table = [
            {"all": {"r": -5.0, "sz": 0.95}, "head": {"r": 16.0, "x": -1.0, "z": 1.0}, "flash": {"hide": True}},
            {"all": {"r": -9.0, "sz": 0.88, "sx": 1.06}, "head": {"r": 38.0, "x": -5.0, "z": -5.0}},
            {"all": {"r": -12.0, "sz": 0.72, "sx": 1.12, "z": -2.0}, "head": {"r": 64.0, "x": -9.0, "z": -12.0}},
        ]
        return table[f]

    def clips():
        return [
            Clip("mount", 1, lambda f: HIDE_HEAD, durations=[1000]),
            Clip("idle", 4, lambda f: merge(HIDE_MOUNT, idle_fn(f)), loop=True, sequence=IDLE_SEQ, durations=IDLE_MS),
            Clip("fire", 5, lambda f: merge(HIDE_MOUNT, fire_fn(f), {"flash": {"show": f == 1}}), impact=1, durations=FIRE_MS),
            Clip("build", 4, build_pose, durations=BUILD_MS),
            Clip("destroyed", 3, destroyed_pose, durations=DESTROYED_MS),
        ]

    return SimpleNamespace(
        SLUG=slug, FILE_SLUG=slug, VISUAL_ID=f"turret.{slug}", NAME=name, HEIGHT_LU=height,
        CANVAS=canvas, FEET=feet, YAW_DEG=yaw,
        ANCHORS={"head": (0, height), "hitCenter": (0, pz_)},
        EXTRA_META={"kind": "turret", "age": age, "pivotLu": list(project((px_, 0, pz_), yaw)),
                    "aimLimits": list(aim), "fireKind": fire_kind},
        build=_build, clips=clips, AGE=age,
    )


# -- base contract ----------------------------------------------------------------------------
FLAG_MS = 110


def base_module(age, name, height, width, canvas, feet, mounts, build, crumble, flags, treasury_levels=3,
                lights=(), smoke=(), horn=(-80, 250), yaw=BASE_YAW, hit_center=None):
    """A pipeline module for base.<age>.

    mounts: the four sim-view mount points (x, y DOWN, lu) of BASE_PUPPETS; the build places
    ledges there with `place()`. build(rig, M) gets M = list of character-space mount points.
    crumble(stage) -> pose dict for the body at stages 0-3 (joints under `body`).
    flags: list of dicts {name, crumbleMax, z} whose joints build() created under root.
    Treasury joints are `treasury1..3` under root (hidden in the body frames).
    """
    M = [place(mx, my, -6.0, yaw) for mx, my in mounts]
    flag_names = [f["name"] for f in flags]

    def _build(rig):
        rig.joint("body", "root", (0, 0, 0))
        for i in range(1, treasury_levels + 1):
            rig.joint(f"treasury{i}", "root", (0, 0, 0))
        build(rig, M)
        for i, m in enumerate(M):
            rig.track(f"mount{i}", "body", m)

    hide_all_flags = {n: {"hide": True} for n in flag_names}
    hide_treasury = {f"treasury{i}": {"hide": True} for i in range(1, treasury_levels + 1)}

    def clips():
        out = [Clip("body", 4, lambda f: merge(hide_all_flags, hide_treasury, crumble(f)), durations=[1000] * 4)]
        for fl in flags:
            n = fl["name"]
            others = {o: {"hide": True} for o in flag_names if o != n}
            out.append(Clip(n, 4, lambda f, n=n, others=others, ph=fl.get("phase", 0.0): merge(
                {"body": {"hide": True}}, hide_treasury, others, flag_wave(n, f, phase=ph)),
                loop=True, durations=FLAG_MS))
        out.append(Clip("treasury", treasury_levels, lambda f: merge(
            {"body": {"hide": True}}, hide_all_flags,
            {f"treasury{i}": {"hide": i > f + 1} for i in range(1, treasury_levels + 1)}),
            durations=[1000] * treasury_levels))
        return out

    hc = hit_center or (-width * 0.4, height * 0.45)
    return SimpleNamespace(
        SLUG=age, FILE_SLUG=age, VISUAL_ID=f"base.{age}", NAME=name, HEIGHT_LU=height,
        CANVAS=canvas, FEET=feet, YAW_DEG=yaw,
        ANCHORS={"head": (-width / 2, height), "hitCenter": hc},
        EXTRA_META={
            "kind": "base", "age": age, "widthLu": width,
            "mountsLu": [[mx, -my] for mx, my in mounts],
            "flags": [{"clip": f["name"], "crumbleMax": f.get("crumbleMax", 3), "z": f.get("z", "front")} for f in flags],
            "lightsLu": [{"x": x, "y": y, "crumbleMax": cm, "r": r} for x, y, cm, r in lights],
            "smokeLu": [{"x": x, "y": y, "crumbleMin": cm} for x, y, cm in smoke],
            "hornLu": list(horn),
        },
        build=_build, clips=clips, AGE=age,
    )
