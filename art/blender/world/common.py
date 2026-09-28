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

# Turret mounts shared by every base (screen lu from the gate: x right, y UP), bottom to top. A
# zig-zag between the front edge and a set-back ledge spreads the four turrets over the base's
# full height, each pair at least 1.4x a turret's height apart, and keeps tap targets in the same
# place in every age (so a base morph never moves a turret).
BASE_MOUNTS = [(-6, 46), (-50, 112), (-8, 178), (-56, 246)]
# Turrets render this much larger than their authored models (art review: they read as small bowls
# next to 56 px infantry), capped so the tallest stays about 72 lu (59 px at 720p).
TURRET_SCALE = 1.7
TURRET_MAX_LU = 72.0


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
                  yaw=TURRET_YAW, aim=(-55, 40), fire_kind="recoil", muzzle_joint="head"):
    """A pipeline module for turret.<slug>.

    build(rig): adds parts. Joints `mount` (static, origin) and `head` (rotates about `pivot`)
    are created before build is called; put static parts on `mount`, rotating parts on `head`
    or its children. idle(f) / fire(f): extra pose channels (dicts) per unique frame.
    """
    px_, pz_ = pivot
    S = min(TURRET_SCALE, TURRET_MAX_LU / height)

    def _build(rig):
        # the whole turret is scaled by S at the "all" joint; interior lines keep their lu width
        orig_part = rig.part

        def part(joint, geo, *a, outline=C.OUTLINE_LU, **k):
            return orig_part(joint, geo, *a, outline=min(outline, C.OUTLINE_LU) / S, **k)

        rig.part = part
        rig.joint("all", "root", (0, 0, 0), scale=S)
        rig.joint("mount", "all", (0, 0, 0))
        rig.joint("head", "all", (px_, 0, pz_))
        build(rig)
        rig.track("muzzle", muzzle_joint, muzzle)

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

    cw, ch = canvas
    fx_, fy_ = feet
    return SimpleNamespace(
        SLUG=slug, FILE_SLUG=slug, VISUAL_ID=f"turret.{slug}", NAME=name, HEIGHT_LU=round(height * S, 1),
        CANVAS=(round(cw * S), round(ch * S)), FEET=(round(fx_ * S), round(fy_ * S)), YAW_DEG=yaw,
        ANCHORS={"head": (0, round(height * S, 1)), "hitCenter": (0, round(pz_ * S, 1))},
        EXTRA_META={"kind": "turret", "age": age, "pivotLu": list(project((px_ * S, 0, pz_ * S), yaw)),
                    "aimLimits": list(aim), "fireKind": fire_kind, "modelScale": round(S, 3)},
        build=_build, clips=clips, AGE=age,
    )


# -- base contract ----------------------------------------------------------------------------
FLAG_MS = 110


def base_module(age, name, height, width, canvas, feet, build, crumble, flags, mounts=None, treasury_levels=3,
                lights=(), smoke=(), horn=(-80, 250), yaw=BASE_YAW, hit_center=None, mount_depth=-40.0):
    """A pipeline module for base.<age>.

    mounts: the four mount points (x, y DOWN, lu; default BASE_MOUNTS); the build models a real
    platform at each (`place()` at `mount_depth`, a number or one per mount), and the sheet exports
    them as `mountsLu`, which the game's base view returns from `mountPoints()`.
    lights / smoke: (character-space point, crumbleMax or crumbleMin[, radius lu]) for the
    code-drawn torch glow and damage smoke; exported projected to screen lu. build(rig, M) gets M = list of character-space mount points.
    crumble(stage) -> pose dict for the body at stages 0-3 (joints under `body`).
    flags: list of dicts {name, crumbleMax, z} whose joints build() created under root.
    Treasury joints are `treasury1..3` under root (hidden in the body frames).
    """
    if mounts is None:
        mounts = [(x, -y) for x, y in BASE_MOUNTS]
    depths = list(mount_depth) if isinstance(mount_depth, (list, tuple)) else [mount_depth] * len(mounts)
    M = [place(mx, my, d, yaw) for (mx, my), d in zip(mounts, depths)]
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
            "lightsLu": [dict(zip(("x", "y"), project(p, yaw)), crumbleMax=cm, r=r) for p, cm, r in lights],
            "smokeLu": [dict(zip(("x", "y"), project(p, yaw)), crumbleMin=cm) for p, cm in smoke],
            "hornLu": list(horn),
        },
        build=_build, clips=clips, AGE=age,
    )


# -- shared base details ----------------------------------------------------------------------
def cracks(rig, joint, specs, color=SHADOW_DARK):
    """Dark wedges half sunk into a surface: specs = [(x, y, z, angle_deg, length)]."""
    g = Geo()
    for x, y, z, rot, L in specs:
        g.blob((x, y, z), (2.0, 7, L), p=2.0, rot=(0, rot, 0))
        g.blob((x + 0.3 * L, y, z - 0.8 * L), (1.5, 7, L * 0.5), p=2.0, rot=(0, rot - 40, 0))
    rig.part(joint, g, color, outline=0, highlight=False)


def rubble(rig, joint, pts, color, seed=0, size=1.0):
    g = Geo()
    for k, (x, y) in enumerate(pts):
        rock(g, (x, y, 3 * size), (9 * size, 7 * size, 6 * size), seed=seed + k, jag=0.25, p=3.0)
        rock(g, (x + 8 * size, y - 2, 2 * size), (5 * size, 4 * size, 4 * size), seed=seed + 40 + k, jag=0.25, p=3.0)
    rig.part(joint, g, color)


def torch(rig, joint, x, y, z, wood="#5E4836", fire="#FFC47A", core="#FFF0CC", length=26):
    g = Geo().capsule((x, y, z - length), (x, y, z), 1.6)
    g.lathe([(0.1, 0), (3.6, 3), (3.2, 7), (0.1, 7.5)], (x, y, z - 1), (x, y, z + 6), segs=10)
    rig.part(joint, g, wood, outline=0.6)
    g = Geo().blob((x, y - 1, z + 11), (3.8, 3.0, 6.8), p=2.0, taper=(1.0, 0.25))
    rig.part(joint, g, glow=fire, outline=0)
    g = Geo().blob((x, y - 3, z + 9), (1.8, 1.5, 3.4), p=2.0, taper=(1.0, 0.3))
    rig.part(joint, g, glow=core, outline=0)


def window(rig, joint, x, y, z, w, h, glow_hex="#FFD89A", frame="#4A3B2E", arch=True):
    """A lit window on a wall facing the camera (-Y)."""
    pts = [(x - w / 2, z - h / 2), (x + w / 2, z - h / 2), (x + w / 2, z + h / 2 - (w / 2 if arch else 0))]
    if arch:
        for i in range(1, 6):
            a = math.pi * i / 6
            pts.append((x + w / 2 * math.cos(a), z + h / 2 - w / 2 + w / 2 * math.sin(a)))
    pts.append((x - w / 2, z + h / 2 - (w / 2 if arch else 0)))
    g = Geo().slab([(px_ + (0.9 if px_ > x else -0.9), pz_ + (0.9 if pz_ > z else -0.9)) for px_, pz_ in pts], y, 1.2)
    rig.part(joint, g, frame, outline=0)
    g = Geo().slab(pts, y - 0.8, 1.0)
    rig.part(joint, g, glow=glow_hex, outline=0)


def pennant(rig, joint, x, y, z0, h=30.0, length=16.0, width=9.0, pole="#6A5A4A", finial="#C8B488"):
    """A small static team pennant on a pole (turret mounts)."""
    g = Geo().capsule((x, y, z0), (x, y, z0 + h), 1.1)
    rig.part(joint, g, pole, outline=0.6)
    g = Geo().sphere((x, y, z0 + h + 1.5), 1.8, cuts=2)
    rig.part(joint, g, finial, finish="metal", outline=0.5)
    zt = z0 + h - 1
    g = Geo().slab([(x - 0.5, zt), (x - length, zt - width * 0.35), (x - length * 0.8, zt - width * 0.6),
                    (x - 0.5, zt - width)], y, 1.2)
    rig.part(joint, g, team=True, outline=0.5)


# -- turret platforms (art review: real mount ledges modelled into every base) ------------------
def platform(rig, joint, m, top, side, style="stone", r=(27.0, 21.0), t=4.0, seed=0, depth_to=None,
             accent=None):
    """A turret platform whose top surface is exactly at the mount point `m` (character space).

    style: rock (a cut rock shelf on a boulder), stone (a slab on stepped corbels), wood (a plank
    deck on braces), bastion (a slab on a battered block), sandbag (a concrete pad ringed by bags),
    disc (a hovering disc with a glow ring and a strut back to `depth_to`).
    """
    x, y, z = m
    rx, ry = r
    g = Geo()
    if style == "rock":
        rock(g, (x - 2, y + 4, z - t), (rx, ry, t + 0.6), seed=seed, jag=0.07, p=3.4)
        g.clip((0, 0, z), (0, 0, -1))
        rig.part(joint, g, top)
        g = Geo()
        rock(g, (x - 6, y + 10, z - t - 14), (rx * 0.7, ry * 0.8, 14), seed=seed + 7, jag=0.16)
        rig.part(joint, g, side)
    elif style == "stone":
        box(g, (x - 2, y + 5, z - t / 2), (rx, ry, t / 2), p=7)
        rig.part(joint, g, top)
        g = Geo()
        box(g, (x - 2, y + 5, z - t - 1.6), (rx - 2, ry - 1, 1.6), p=6)
        for dx in (-rx * 0.6, 0, rx * 0.6):
            for k in range(3):
                box(g, (x - 2 + dx, y + 3 - (2 - k) * 1.5, z - t - 5 - k * 5), (4.6 - k * 0.6, 5 + k * 2, 2.6), p=5)
        rig.part(joint, g, side)
    elif style == "wood":
        for k in range(4):
            box(g, (x - 2, y - ry * 0.7 + k * ry * 0.47, z - 1.4), (rx, ry * 0.22, 1.4), p=6, cuts=2)
        rig.part(joint, g, top)
        g = Geo()
        for dx in (-rx * 0.7, rx * 0.55):
            g.capsule((x + dx, y - ry * 0.6, z - 3), (x + dx - 8, y + ry * 0.6, z - 26), 2.0)
            g.capsule((x + dx, y + ry * 0.4, z - 3), (x + dx - 8, y + ry, z - 26), 2.0)
        box(g, (x - 2, y - ry * 0.75, z - 4.5), (rx + 1, 1.6, 1.6), p=4, cuts=2)
        rig.part(joint, g, side, outline=0.7)
    elif style == "bastion":
        box(g, (x - 2, y + 5, z - t / 2), (rx, ry, t / 2), p=7)
        rig.part(joint, g, top)
        g = Geo()
        box(g, (x - 4, y + 9, z - t - 11), (rx - 3, ry - 2, 11), p=7, taper=(0.82, 1.0))
        rig.part(joint, g, side)
    elif style == "sandbag":
        box(g, (x - 2, y + 5, z - t / 2), (rx, ry, t / 2), p=6)
        rig.part(joint, g, top)
        g = Geo()
        box(g, (x - 4, y + 9, z - t - 10), (rx - 4, ry - 3, 10), p=5, taper=(0.85, 1.0))
        rig.part(joint, g, side)
        g = Geo()
        n = 7
        for k in range(n):
            a = math.pi * (0.08 + 0.84 * k / (n - 1))
            bx, by = x - 2 + rx * 0.98 * math.cos(a), y + 5 - ry * 0.95 * math.sin(a)
            g.blob((bx, by, z - 1.0), (5.6, 4.0, 2.8), p=2.6, rot=(0, 0, math.degrees(-a) + 90))
        rig.part(joint, g, accent or "#B8A67A", finish="hair")
    elif style == "disc":
        cyl(g, (x - 1, y + 4, z - t), (x - 1, y + 4, z), rx, rx + 1.5, bevel=1.2, segs=32, squash=(1.0, 0.72))
        rig.part(joint, g, top)
        g = Geo()
        cyl(g, (x - 1, y + 4, z - t - 3), (x - 1, y + 4, z - t), rx * 0.78, bevel=0.4, segs=32, squash=(1.0, 0.72))
        rig.part(joint, g, glow=accent or "#3AF0B4", outline=0)
        if depth_to is not None:
            g = Geo().capsule((x - rx * 0.4, y + 8, z - t - 1), depth_to, 2.6, 1.8)
            rig.part(joint, g, side, finish="metal", outline=0.6)
    return joint


def chipped_cracks(rig, joint, lines, dark, chip, y_push=-1.5, w=2.2):
    """Chipped-edge cracks on a surface facing the camera: `lines` = [[(x, y, z), ...], ...].
    Each crack is a dark jagged groove with small lighter chips knocked out along its edges."""
    g = Geo()
    c = Geo()
    rnd = random.Random(len(lines) * 31 + int(lines[0][0][0]))
    for pts in lines:
        for i, (a, b) in enumerate(zip(pts, pts[1:])):
            wa = w * (1.0 - 0.25 * i / max(1, len(pts) - 1))
            g.capsule(a, b, wa, wa * 0.7, segs=8, rings=3)
            mx, my, mz = [(p + q) / 2 for p, q in zip(a, b)]
            for s in (-1, 1):
                if rnd.random() < 0.8:
                    dx, dz = b[2] - a[2], -(b[0] - a[0])
                    L = max(1e-3, math.hypot(dx, dz))
                    o = (wa + 1.6) * s
                    c.blob((mx + dx / L * o + rnd.uniform(-1.5, 1.5), my + y_push, mz + dz / L * o),
                           (rnd.uniform(1.6, 2.8), 1.2, rnd.uniform(1.2, 2.2)), p=1.8,
                           rot=(0, rnd.uniform(0, 90), 0))
    rig.part(joint, g, dark, outline=0, highlight=False)
    rig.part(joint, c, chip, outline=0.5)


def moss_drape(rig, joint, spots, color, seed=0):
    """Moss hanging over ledges: `spots` = [(x, y, z, width)]; tapered drips under a cap."""
    rnd = random.Random(seed)
    g = Geo()
    for x, y, z, w in spots:
        g.blob((x, y, z), (w / 2, 5, 2.6), p=2.4)
        n = max(2, int(w // 6))
        for k in range(n):
            dx = -w / 2 + (k + 0.5) * w / n + rnd.uniform(-1, 1)
            L = rnd.uniform(5, 13)
            g.blob((x + dx, y - 1, z - L / 2), (2.2, 2.4, L / 2 + 1), p=2.0, taper=(0.4, 1.0))
    rig.part(joint, g, color, finish="hair")
