"""Battering Ram: Medieval Age siege heavy (swinging ram), realistic style. heightLu 92.

A wheeled siege "sow": a heavy oak frame on four iron-shod spoked wheels under a steep gabled
roof of team-dyed ox hides (wet hides against fire arrows), lashed over the rafters with rawhide
thongs and hemmed with dark leather at the eaves. Under the roof a whole oak trunk, iron-banded,
hangs from two tie beams on hemp ropes; its business end is a cast-iron ram's head with curled
horns. A team swallow-tailed pennant flies from the rear gable. Walk: the wheels roll exactly with
the ground, the hull pitches over the ruts and the log swings a little behind. Attack: the log is
hauled back (held), it swings (smear) and slams (held impact, the hull lurches back), then rocks
to rest. Hit: the hull rocks back, the log swings. Die: the near front wheel breaks away, the
frame lurches forward and down, the roof caves in and the log drops; dust.
"""
import math

import bmesh

from lib import biped as B
from lib import core as C
from lib import game as G
from lib import mats as M
from lib import medieval as MD
from lib import motion as MO

SLUG = "battering_ram"
NAME = "Battering Ram"
AGE = "medieval"
KIND = "unit"
HEIGHT_LU = 92
PX1 = 1.23
SCALE1 = 1.5
CANVAS = (200, 118)
FEET = (104, 9)
YAW = -12.0
ANCHORS = {"head": (0, 80), "hitCenter": (0, 40)}

R_WHEEL = 12.5
AXLES = (-30.0, 24.0)
WY = (-17.5, 17.5)
SILL_Z = 19.0
EAVE_Z = 50.0
RIDGE_Z = 76.0
HULL = (-46.0, 42.0)
TIE_X = (-19.0, 17.0)
LOG_Z = 32.0
ROPE_L = EAVE_Z - 1.0 - (LOG_Z + 5.0)
HEAD_X = 46.0
TRACKERS = {"ramHead": ("log", (HEAD_X + 12.0, 0.0, LOG_Z + 0.5))}

STRIDE = 36.0
WALK_MS = [100] * 8
WALK = {"strideLu": STRIDE}
ATK_T = [0, 170, 340, 548, 570, 750, 840, 1020, 1120]
SMEAR_COLOR = "#b8b2a6"
SMEAR_ALPHA = 0.5
SMEAR_N = 26

BONES = {
    "root": ((0, 0, 0), (0, 0, 4), None),
    "body": ((0, 0, SILL_Z), (0, 0, SILL_Z + 6), "root"),
    "roof": ((0, 0, EAVE_Z), (0, 0, RIDGE_Z), "body"),
    "log": ((0, 0, EAVE_Z - 1.0), (0, 0, LOG_Z), "body"),
    "pole": ((HULL[0] + 2, 0, RIDGE_Z - 4), (HULL[0] + 2, 0, RIDGE_Z + 16), "roof"),
    "flag": ((HULL[0] + 1.5, 0, RIDGE_Z + 15), (HULL[0] - 14, 0, RIDGE_Z + 13), "pole"),
}
for _n, _x in (("b", AXLES[0]), ("f", AXLES[1])):
    for _s, _y in (("F", WY[0]), ("B", WY[1])):
        BONES[f"wheel_{_n}{_s}"] = ((_x, _y, R_WHEEL), (_x, _y, R_WHEEL + 4), "body")


def _wheel(rig, bone, x, y, oak, oak_dk, iron):
    """A spoked cart wheel: hub, eight spokes, a felloe rim and an iron tyre with nails."""
    sg = -1 if y < 0 else 1
    parts = []
    hub = C.lathe("hub", [(0.0, -3.4), (2.6, -3.4), (3.2, -1.8), (3.2, 1.8), (2.6, 3.4), (0.0, 3.4)], oak_dk, seg=16,
                  loc=(x, y, R_WHEEL), rot=(math.pi / 2, 0, 0))
    parts.append(hub)
    parts.append(C.lathe("hubband", [(3.25, -0.6), (3.5, 0.0), (3.25, 0.6)], iron, seg=16, loc=(x, y - sg * 1.6, R_WHEEL),
                         rot=(math.pi / 2, 0, 0)))
    for k in range(8):
        a = 2 * math.pi * (k + 0.5) / 8
        parts.append(C.tube("spoke", [(x + 2.8 * math.cos(a), y, R_WHEEL + 2.8 * math.sin(a)),
                                      (x + (R_WHEEL - 2.6) * math.cos(a), y, R_WHEEL + (R_WHEEL - 2.6) * math.sin(a))],
                            [0.95, 0.75], oak, seg=7))
    n = 32
    ring = [(x + (R_WHEEL - 1.6) * math.cos(2 * math.pi * i / n), y, R_WHEEL + (R_WHEEL - 1.6) * math.sin(2 * math.pi * i / n))
            for i in range(n + 1)]
    fel = C.tube("felloe", ring, [1.5] * len(ring), oak_dk, seg=8, caps=False)
    parts.append(fel)
    tyre = [(x + (R_WHEEL - 0.35) * math.cos(2 * math.pi * i / n), y, R_WHEEL + (R_WHEEL - 0.35) * math.sin(2 * math.pi * i / n))
            for i in range(n + 1)]
    parts.append(C.tube("tyre", tyre, [0.55] * len(tyre), iron, seg=6, flat=2.6, caps=False))
    for k in range(10):
        a = 2 * math.pi * k / 10
        parts.append(C.sphere("nail", 0.55, iron, seg=8, ring=6,
                              loc=(x + (R_WHEEL - 0.3) * math.cos(a), y - sg * 1.3, R_WHEEL + (R_WHEEL - 0.3) * math.sin(a))))
    for o in parts:
        rig.rigid(o, bone)


def _roof_hide(hide, skirt=45.0):
    """The hide covering: one sheet over both slopes (u along the hull, v across the ridge), sagging
    between the rafters, the free edges ragged, hanging to `skirt` below the eaves."""
    bm = bmesh.new()
    nu, nv = 44, 30
    x0, x1 = HULL[0] - 2.0, HULL[1] + 1.0
    rafters = [HULL[0] + i * (HULL[1] - HULL[0]) / 6 for i in range(7)]
    verts = {}
    for j in range(nv + 1):
        v = -1 + 2 * j / nv                     # -1 near eave skirt .. +1 far
        for i in range(nu + 1):
            u = i / nu
            x = x0 + (x1 - x0) * u
            # cross profile: ridge at v = 0, eaves at |v| = 0.78, then the skirt hangs steeper
            av = abs(v)
            if av <= 0.78:
                t = av / 0.78
                y = 20.5 * t
                z = RIDGE_Z + 1.4 - (RIDGE_Z + 1.4 - EAVE_Z - 0.6) * t
            else:
                t = (av - 0.78) / 0.22
                y = 20.5 + 2.2 * t
                z = EAVE_Z + 0.6 - (EAVE_Z + 0.6 - skirt) * t
            y *= 1 if v > 0 else -1
            # sag between rafters and a ragged hem
            d = min(abs(x - r) for r in rafters)
            sag = 1.1 * min(1.0, d / 7.0) ** 1.5 * (1.0 if av < 0.78 else 0.4)
            n = math.sin(x * 0.9 + v * 7.0) * 0.35 + math.sin(x * 2.3 - v * 3.0) * 0.2
            if av > 0.9:
                z += n * 0.6
            nx, nz = (0.0, 1.0) if av < 0.02 else ((1.0 if v > 0 else -1.0) * 0.8, 0.6)
            verts[(i, j)] = bm.verts.new((x, y - sag * nx * 0.6, z - sag * nz))
    for j in range(nv):
        for i in range(nu):
            bm.faces.new((verts[(i, j)], verts[(i + 1, j)], verts[(i + 1, j + 1)], verts[(i, j + 1)]))
    o = C.from_bm("roofhide", bm, hide)
    so = o.modifiers.new("so", "SOLIDIFY")
    so.thickness = 0.8
    so.offset = 1.0
    C.displace(o, 0.5, 1.6)
    C.apply_mods(o)
    return o


def build():
    oak = M.wood("#6b5847", "#4e4035", name="oak", stripes=1.2)
    oak_dk = M.wood("#56473a", "#40352b", name="oak_dk", stripes=1.2)
    trunk = M.bark("#5e5042", "#40362c", name="trunk")
    endgrain = M.wood("#9c8264", "#7e6850", name="endgrain", stripes=9.0)
    iron = MD.iron()
    dst = MD.dark_steel()
    rope = M.rope("#9c8866")
    thong = M.rawhide("#8c7658", name="thong")
    hem = M.leather("#3a2e26", name="hem")
    hide = C.mat("roofhide", "#9a8266", rough=0.7, noise=0.2, nscale=0.25, bump=0.5, sheen=0.25, ramp2="#7a6450")
    paint = MD.team_paint()
    charge = MD.linen("#d6cbb0", name="charge")
    cloth = MD.team_wool(name="pennant")
    ramiron = C.mat("ramiron", "#676461", rough=0.45, metal=1.0, noise=0.22, nscale=1.4, bump=0.35, ramp2="#3c3834")

    rig = C.Rig("ram_rig", BONES, yaw_deg=YAW)

    # ---------------- chassis and frame (body)
    B_ = []
    for y in WY:
        B_.append(C.box("sill", HULL[1] - HULL[0] + 4, 4.2, 4.6, oak_dk, bevel=0.6, loc=((HULL[0] + HULL[1]) / 2, y * 0.8, SILL_Z)))
        for x in (HULL[0] + 2, (HULL[0] + HULL[1]) / 2 - 2, HULL[1] - 2):
            B_.append(C.box("post", 3.6, 3.6, EAVE_Z - SILL_Z, oak, bevel=0.5, loc=(x, y * 0.95, (EAVE_Z + SILL_Z) / 2)))
        B_.append(C.box("plate", HULL[1] - HULL[0] + 2, 3.8, 3.4, oak, bevel=0.5, loc=((HULL[0] + HULL[1]) / 2, y * 0.95, EAVE_Z - 1.0)))
        B_.append(C.box("rail", HULL[1] - HULL[0], 2.4, 2.6, oak, bevel=0.4, loc=((HULL[0] + HULL[1]) / 2, y * 0.97, 33.0)))
        for x0 in (HULL[0] + 2, (HULL[0] + HULL[1]) / 2 - 2):
            B_.append(C.tube("brace", [(x0 + 2, y * 0.97, SILL_Z + 2), (x0 + 20, y * 0.97, EAVE_Z - 3)], [1.1, 1.0], oak, seg=6))
    for x in (HULL[0] + 2, HULL[1] - 2):
        B_.append(C.box("crossbeam", 3.4, 2 * WY[1] + 2, 3.2, oak_dk, bevel=0.5, loc=(x, 0, SILL_Z)))
    for x in TIE_X:
        B_.append(C.box("tie", 3.6, 2 * WY[1] * 0.95 + 3, 3.4, oak, bevel=0.5, loc=(x, 0, EAVE_Z - 1.0)))
        B_.append(C.box("tieiron", 4.0, 3.0, 4.0, iron, bevel=0.3, loc=(x, 0, EAVE_Z - 1.2)))
    for x in AXLES:
        B_.append(C.cyl("axle", 1.8, 1.8, 2 * WY[1] + 4, iron, seg=12, loc=(x, -WY[1] - 2, R_WHEEL), rot=(-math.pi / 2, 0, 0)))
        B_.append(C.box("axlebed", 5.0, 2 * WY[1] - 2, 3.0, oak_dk, bevel=0.5, loc=(x, 0, R_WHEEL + 3.6)))
    for o in B_:
        if o is not None:
            rig.rigid(o, "body")

    # ---------------- wheels
    for n, x in (("b", AXLES[0]), ("f", AXLES[1])):
        for s, y in (("F", WY[0]), ("B", WY[1])):
            _wheel(rig, f"wheel_{n}{s}", x, y + (-2.4 if s == "F" else 2.4), oak, oak_dk, iron)

    # ---------------- roof: rafters, ridge, the team hides, thongs, the leather hem
    R_ = []
    R_.append(C.box("ridge", HULL[1] - HULL[0] + 6, 3.0, 3.2, oak, bevel=0.5, loc=((HULL[0] + HULL[1]) / 2 - 1, 0, RIDGE_Z - 1.4)))
    for i in range(7):
        x = HULL[0] + i * (HULL[1] - HULL[0]) / 6
        for sg in (-1, 1):
            R_.append(C.tube("rafter", [(x, 0, RIDGE_Z - 0.5), (x, sg * 21.0, EAVE_Z - 0.2)], [1.2, 1.2], oak, seg=6))
    hd = _roof_hide(hide)
    R_.append(hd)
    # the leather hem along both skirts: the hide's lower edge copied down a little
    for sg in (-1, 1):
        pts = []
        for i in range(23):
            x = HULL[0] - 2 + (HULL[1] - HULL[0] + 3) * i / 22
            pts.append((x, sg * 22.95, 44.7 + 0.45 * math.sin(x * 0.9 + sg * 7.0)))
        R_.append(C.tube("hem", pts, [0.9] * len(pts), hem, seg=6, flat=0.55))
    # rawhide thongs over the ridge at each rafter, lashing the hides down
    for i in range(1, 6):
        x = HULL[0] + i * (HULL[1] - HULL[0]) / 6 + 0.3
        pts = [(x, -23.3, 45.8), (x, -21.4, EAVE_Z + 1.5), (x, -10.6, RIDGE_Z - 11.8), (x, 0, RIDGE_Z + 2.4),
               (x, 10.6, RIDGE_Z - 11.8), (x, 21.4, EAVE_Z + 1.5), (x, 23.3, 45.8)]
        R_.append(C.tube("thong", pts, [0.45] * len(pts), thong, seg=5))
    # gable ends: triangular frames (collar and king post), the front one with a hide-lined hood over the ram
    for x in (HULL[0] - 0.5, HULL[1] + 0.5):
        R_.append(C.tube("collar", [(x, -14, EAVE_Z + 9), (x, 14, EAVE_Z + 9)], [1.1, 1.1], oak, seg=6))
        R_.append(C.tube("kingpost", [(x, 0, EAVE_Z - 1), (x, 0, RIDGE_Z - 1)], [1.2, 1.2], oak, seg=6))
    for o in R_:
        rig.rigid(o, "roof")

    # ---------------- a row of team pavises hung along both sides (the ram crew's shields)
    for sg in (-1, 1):
        for i, x in enumerate((-33.0, -12.5, 8.0, 28.5)):
            pv = MD.pavise(1.0, paint, iron, charge_mat=charge, height=17.5, width=15.0)
            for o in pv:
                if sg > 0:
                    C.xform(o, rot=(0, 0, math.pi))
                C.xform(o, rot=(math.radians(-6 * sg), 0, 0))
                C.xform(o, loc=(x, sg * 20.2, 34.8))
                rig.rigid(o, "body")
            rig.rigid(C.tube("pavhook", [(x, sg * 18.4, 45.0), (x, sg * 20.4, 43.6)], [0.4, 0.4], iron, seg=6), "body")

    # ---------------- the ram log with its iron head, hung on two ropes
    L_ = []
    lx0, lx1 = -40.0, HEAD_X
    L_.append(C.tube("log", [(lx0, 0, LOG_Z), (0, 0, LOG_Z + 0.4), (lx1, 0, LOG_Z)], [5.6, 5.4, 5.0], trunk, seg=18))
    L_.append(C.cyl("logend", 5.3, 5.3, 0.6, endgrain, seg=18, loc=(lx0 - 0.3, 0, LOG_Z), rot=(0, -math.pi / 2, 0)))
    for x in (-30.0, -2.0, 30.0, HEAD_X - 3.0):
        L_.append(C.lathe("logband", [(5.5, -1.1), (5.95, 0.0), (5.5, 1.1)], iron, seg=18, loc=(x, 0, LOG_Z), rot=(0, math.pi / 2, 0)))
    for x in TIE_X:
        L_.append(C.lathe("sling", [(5.6, -1.4), (6.2, 0.0), (5.6, 1.4)], rope, seg=18, loc=(x, 0, LOG_Z), rot=(0, math.pi / 2, 0)))
    # the cast-iron ram's head: a muzzle, a heavy brow, two horns curling back and down
    hx = HEAD_X
    head = C.blobs("ramhead", [((hx + 3.0, 0, LOG_Z + 0.6), (5.8, 5.2, 5.4)), ((hx + 7.6, 0, LOG_Z - 0.8), (3.2, 3.4, 3.6)),
                               ((hx + 3.4, 0, LOG_Z + 4.4), (3.8, 4.2, 2.2)), ((hx + 9.4, 0, LOG_Z - 1.6), (1.6, 2.4, 2.4))],
                   ramiron, res=0.4)
    C.displace(head, 0.35, 1.2)
    L_.append(head)
    for sg in (-1, 1):
        pts, rad = [], []
        for i in range(15):
            a = 1.2 * math.pi * i / 14
            r = 4.6 - 2.6 * i / 14
            pts.append((hx + 2.6 - r * math.sin(a) * 0.9, sg * (4.4 + 1.4 * i / 14), LOG_Z + 3.8 + r * math.cos(a) - 1.4 * i / 14))
            rad.append(1.8 - 1.1 * i / 14)
        L_.append(C.tube("ramhorn", pts, rad, ramiron, seg=10))
        L_.append(C.sphere("rameye", 0.7, M.dark("#1c1a18", name="rameye"), loc=(hx + 6.4, sg * 3.2, LOG_Z + 1.4)))
    # scale the ram's head up about the log end so it reads at game size
    from mathutils import Matrix
    Mx = Matrix.Translation((hx, 0, LOG_Z)) @ Matrix.Diagonal((1.3, 1.3, 1.3, 1.0)) @ Matrix.Translation((-hx, 0, -LOG_Z))
    for o in L_:
        if o.name.startswith(("ramhead", "ramhorn", "rameye")):
            o.data.transform(Mx)
    for o in L_:
        o["weapon"] = 1
        rig.rigid(o, "log")
    # ropes: tie beam (body) to the log (log bone), weighted by height
    for x in TIE_X:
        for sg in (-1, 1):
            rp = C.tube("rope", [(x + sg * 0.8, sg * 1.2, EAVE_Z - 2.6), (x + sg * 1.6, sg * 3.8, LOG_Z + 4.6)], [0.5, 0.5], rope, seg=6)
            MD.skin_fn(rig, rp, lambda p: {"log": min(1.0, max(0.0, (EAVE_Z - 2.6 - p[2]) / (EAVE_Z - LOG_Z - 7.0))),
                                           "body": 1.0 - min(1.0, max(0.0, (EAVE_Z - 2.6 - p[2]) / (EAVE_Z - LOG_Z - 7.0)))})

    # ---------------- the rear pennant
    rig.rigid(C.tube("pole", [(HULL[0] + 2, 0, RIDGE_Z - 4), (HULL[0] + 2, 0, RIDGE_Z + 16)], [0.8, 0.65], oak, seg=8), "pole")
    rig.rigid(C.lathe("finial", [(0.0, 0.0), (1.0, 0.4), (0.8, 1.8), (0.0, 3.6)], iron, seg=10, loc=(HULL[0] + 2, 0, RIDGE_Z + 16)), "pole")
    pts = [(HULL[0] + 1.5 - 16.0 * u, 0.5 * math.sin(4 * u), RIDGE_Z + 13.0 - 2.0 * u * u) for u in (0.0, 0.25, 0.5, 0.75, 1.0)]
    pen = C.tube("pennant", pts, [3.2, 3.0, 2.6, 2.2, 1.6], cloth, seg=12, flat=0.12)
    for v in pen.data.vertices:
        if v.co.x < HULL[0] + 1.5 - 12.0 and abs(v.co.z - (RIDGE_Z + 11.0)) < 1.3:
            v.co.x += 3.0 * (1 - abs(v.co.z - (RIDGE_Z + 11.0)) / 1.3)
    C.team(pen)
    rig.skin(pen, ["pole", "flag"], soft=2.5, bias={"pole": 3.0})
    return dict(rig=rig)


# ------------------------------------------------------------------------------ poses
def _log(theta, extra=0.0):
    """Log displacement for a pendulum swing of `theta` degrees (+ = hauled back): parallel ropes,
    so the log translates on an arc without rotating."""
    a = math.radians(theta)
    return dict(loc=(-ROPE_L * math.sin(a) + extra, 0.0, ROPE_L * (1 - math.cos(a))))


def _apply(rig, P):
    rig.rest()
    rx, rz = P.get("root", (0.0, 0.0))
    rig.set("root", loc=(rx, 0, rz))
    rig.set("body", r=math.radians(P.get("pitch", 0.0)), loc=P.get("body_loc"))
    rig.set("roof", r=math.radians(P.get("roof", 0.0)), loc=P.get("roof_loc"))
    lg = _log(P.get("log", 0.0))
    if "log_loc" in P:
        lg["loc"] = tuple(a + b for a, b in zip(lg["loc"], P["log_loc"]))
    rig.set("log", r=math.radians(P.get("log_r", 0.0)), loc=lg["loc"])
    for n in ("bF", "bB", "fF", "fB"):
        w = P.get("w_" + n, {})
        rig.set("wheel_" + n, r=math.radians(P.get("wheel", 0.0) + w.get("r", 0.0)), rz=math.radians(w.get("rz", 0.0)),
                loc=w.get("loc"))
    rig.set("pole", r=math.radians(P.get("pole", 0.0)))
    f = P.get("flag", (0.0, 0.0))
    rig.set("flag", r=math.radians(f[0]), rz=math.radians(f[1]))


def idle(t):
    a = 2 * math.pi * t / 900.0
    return dict(log=1.2 * math.sin(a), pitch=0.2 * math.sin(a + 0.6), flag=(4 * math.sin(a - 0.8), 12 * math.sin(a - 0.4)))


def walk(t):
    ph = (t / 800.0) % 1.0
    roll = -math.degrees(STRIDE * ph / R_WHEEL)
    s = math.sin(2 * math.pi * ph)
    s2 = math.sin(4 * math.pi * ph + 0.6)
    return dict(wheel=roll, root=(0.0, 0.35 + 0.35 * s2), pitch=0.9 * s, log=-2.5 * math.sin(2 * math.pi * ph - 0.9),
                pole=-2 - 1.5 * s, flag=(-6 - 3 * s, 14 * math.sin(2 * math.pi * ph - 1.2)))


def attack(t):
    keys = [(0, dict(log=0.0, pitch=0.0, root=(0.0, 0.0), flag=(0.0, 0.0))),
            (170, dict(log=24.0, pitch=0.8, root=(-0.6, 0.0), flag=(6.0, 6.0))),
            (340, dict(log=44.0, pitch=1.4, root=(-1.2, 0.0), flag=(10.0, 8.0))),
            (520, dict(log=46.0, pitch=1.5, root=(-1.3, 0.0), flag=(10.0, 8.0))),
            (548, dict(log=6.0, pitch=0.0, root=(0.0, 0.0), flag=(0.0, 4.0))),
            (570, dict(log=-36.0, pitch=-2.2, root=(1.6, 0.0), flag=(-14.0, -8.0))),
            (600, dict(log=-37.0, pitch=-2.0, root=(1.4, 0.0), flag=(-16.0, -10.0))),
            (750, dict(log=-30.0, pitch=1.6, root=(-1.4, 0.0), flag=(-6.0, 6.0))),
            (840, dict(log=12.0, pitch=0.6, root=(-0.8, 0.0), flag=(8.0, 10.0))),
            (1020, dict(log=-5.0, pitch=-0.3, root=(-0.2, 0.0), flag=(-4.0, -2.0))),
            (1120, dict(log=2.0, pitch=0.1, root=(0.0, 0.0), flag=(2.0, 2.0))),
            (1250, dict(log=0.0, pitch=0.0, root=(0.0, 0.0), flag=(0.0, 0.0)))]
    return B.keyed(keys, t)


def hit(t):
    keys = [(0, dict(log=0.0, pitch=0.0, root=(0.0, 0.0), flag=(0.0, 0.0))),
            (55, dict(log=-10.0, pitch=3.2, root=(-3.4, 0.0), flag=(10.0, 8.0))),
            (140, dict(log=8.0, pitch=-1.4, root=(-2.6, 0.0), flag=(-6.0, -4.0))),
            (310, dict(log=0.0, pitch=0.0, root=(0.0, 0.0), flag=(0.0, 0.0)))]
    return B.keyed(keys, t)


def die(t):
    z = {"r": 0.0, "rz": 0.0, "loc": (0.0, 0.0, 0.0)}
    base = dict(log=0.0, pitch=0.0, root=(0.0, 0.0), roof=0.0, roof_loc=(0.0, 0.0, 0.0), body_loc=(0.0, 0.0, 0.0),
                log_loc=(0.0, 0.0, 0.0), log_r=0.0, w_fF=dict(z), w_bF=dict(z), flag=(0.0, 0.0), pole=0.0)
    jolt = dict(base, pitch=3.0, root=(-3.0, 0.0), log=-12.0, flag=(10.0, 10.0))
    buckle = dict(base, pitch=-7.0, body_loc=(1.0, 0.0, -2.0), log=-18.0, roof=-2.0,
                  w_fF=dict(r=-18.0, rz=-22.0, loc=(2.0, -3.0, -3.0)), flag=(-10.0, 4.0), pole=-6.0)
    down = dict(base, pitch=-13.0, body_loc=(2.0, 0.0, -6.5), log=-6.0, log_loc=(2.0, 0.0, -9.0), roof=-4.0, roof_loc=(0.0, 0.0, -3.0),
                w_fF=dict(r=-40.0, rz=-60.0, loc=(4.0, -9.0, -7.5)), w_bF=dict(r=0.0, rz=-6.0, loc=(0.0, -1.0, 0.0)),
                flag=(-18.0, 10.0), pole=-12.0)
    cave = dict(down, pitch=-11.0, body_loc=(2.0, 0.0, -7.2), log_loc=(2.5, 0.0, -13.5), log_r=-4.0, roof=-7.0,
                roof_loc=(0.0, 0.0, -9.0), w_fF=dict(r=-60.0, rz=-82.0, loc=(6.0, -12.0, -9.5)), flag=(-24.0, 14.0), pole=-20.0)
    bounce = dict(cave, pitch=-9.5, body_loc=(2.0, 0.0, -6.4), roof_loc=(0.0, 0.0, -7.8), flag=(-10.0, -6.0))
    rest = dict(cave, pitch=-10.5, body_loc=(2.0, 0.0, -7.0), roof_loc=(0.0, 0.0, -9.4), roof=-7.5, flag=(-20.0, 4.0))
    keys = [(0, base), (60, jolt), (210, buckle), (290, down), (350, cave), (500, bounce), (680, rest), (990, rest)]
    return B.keyed(keys, t)


def pose(ctx, clip, t):
    P = {"idle": idle, "walk": walk, "attack": attack, "hit": hit, "die": die}[clip](t)
    _apply(ctx["rig"], P)


def clips():
    atk = G.Clip("attack", MO.HEAVY_ATTACK_MS, sequence=MO.HEAVY_ATTACK_SEQ, impact=4, smear=3, times=ATK_T, blur={3: 26})
    for i, s in ((4, 0.04), (5, 0.3), (6, 0.55)):
        atk.fx[i] = {"s": s, "origin": (62, 0), "spread": 10, "n": 9, "size": 5.0, "seed": 7}
    die_c = G.Clip("die", MO.HEAVY_DIE_MS, sequence=MO.HEAVY_DIE_SEQ, extra={
        "fx": [{"id": "fx.dust_poof", "atMs": 880, "offsetLu": [0, 10], "scale": 1.3}], "hideUnitAtMs": 990})
    die_c.fx = MO.dust_frames(die_c, 290, span=600, origin=(4, 0), spread=38, size=8.5, seed=13)
    return [
        G.Clip("idle", MO.HEAVY_IDLE_MS, loop=True),
        G.Clip("walk", WALK_MS, loop=True),
        atk,
        G.Clip("hit", MO.HIT_MS, times=MO.HIT_TIMES),
        die_c,
    ]
