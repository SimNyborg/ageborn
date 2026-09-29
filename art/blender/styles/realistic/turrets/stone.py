"""Stone Age turrets, realistic style: Rock Tosser, Angry Beehive, Log Roller, Grumpy Toad.

Each turret is a module-like object for `lib/game.py` (KIND 'turret'): a static footing (group
'mount') and a head that turns about its pivot (group 'head'), with the turret clip contract of
`lib/world.py`. Every turret carries a small team pennant on its footing and a team-painted part
on its head. Build: dropped in from above, it lands in a burst of dust and settles. Destroyed: the
head tips off backwards, the footing sags, dust.
"""
import math
from types import SimpleNamespace

from lib import biped as B
from lib import core as C
from lib import mats as M
from lib import world as W

AGE = "stone"
YAW = -12.0
CANVAS = (132, 100)
FEET = (70, 9)


# ------------------------------------------------------------------------------ shared parts
def _mats():
    return dict(stone=M.stone("#8a7e70", "#6c6258", name="tstone", bump=1.2), stone_dk=M.stone("#6e6458", "#58504a", name="tstone_dk"),
                wood=M.wood("#7a6450", "#5a4a3c", name="twood"), bark=M.bark(), rope=M.rope("#9a8664"),
                hide=M.rawhide("#8f7a5c", name="thide"), moss=M.moss(), team=M.team_paint(), cloth=M.team_cloth(name="tcloth"),
                leather=M.leather("#4e3e33"), bone=M.bone())


def footing(rig, m, r=17.0, h=8.0, seed=1):
    """A low platform of stacked, mossy rocks (the static mount)."""
    rocks = [((0, 2, h * 0.45), (r, r * 0.8, h * 0.6)), ((-r * 0.75, -r * 0.45, 2.8), (6, 5, 3.6)),
             ((r * 0.8, -r * 0.35, 2.4), (5, 4, 3.2)), ((r * 0.2, -r * 0.7, 2.0), (4, 3, 2.6))]
    for i, (c, a) in enumerate(rocks):
        o = C.blobs(f"foot{seed}_{i}", [(c, a)], m["stone"] if i == 0 else m["stone_dk"], res=0.6)
        C.displace(o, 1.4, 0.35)
        rig.rigid(W.grp(o, "mount"), "root")
    mo = C.blobs(f"footmoss{seed}", [((-r * 0.3, 0, h * 0.95), (r * 0.6, r * 0.55, 1.4)), ((r * 0.5, 3, h * 0.9), (5, 5, 1.2))],
                 m["moss"], res=0.5)
    C.displace(mo, 0.8, 0.8)
    rig.rigid(W.grp(mo, "mount"), "root")


def pennant(rig, m, x, y, z0, h=30.0):
    """A small team pennant on a pole (static, on the footing)."""
    rig.rigid(W.grp(C.tube("ppole", [(x, y, z0), (x, y, z0 + h)], [0.8, 0.7], m["wood"], seg=8), "mount"), "root")
    rig.rigid(W.grp(C.sphere("pfin", 1.1, m["bone"], loc=(x, y, z0 + h + 0.8)), "mount"), "root")
    fl = C.tube("pflag", [(x - 0.6, y, z0 + h - 2.6), (x - 6, y, z0 + h - 3.4), (x - 11, y, z0 + h - 4.4), (x - 16, y, z0 + h - 5.6)],
                [3.4, 2.9, 2.1, 0.5], m["cloth"], seg=8, flat=0.2)
    C.team(fl)
    rig.rigid(W.grp(fl, "mount"), "root")


def turret(slug, name, height, pivot, bones, build, idle, fire, muzzle, aim=(0, 0), fire_kind="recoil", hit_z=27.0,
           fire_fx=None):
    """A turret module. `bones` extra {name: (head, tail, parent)} under 'head'; `idle(t)`/`fire(t)`
    return {bone: r or (r, rz) or dict(r=, loc=, s=)} and may set ctx visibility via 'hide' keys."""
    all_bones = {"root": ((0, 0, 0), (0, 0, 4), None),
                 "head": (pivot, (pivot[0], pivot[1], pivot[2] + 4), "root")}
    all_bones.update(bones)
    clips_ = W.turret_clips(
        dust_build={i: {"s": s, "origin": (0, 0), "spread": 18, "size": 7.0, "seed": 21} for i, s in ((1, 0.05), (2, 0.35), (3, 0.7))},
        dust_destroyed={i: {"s": s, "origin": (-6, 0), "spread": 20, "size": 8.0, "seed": 23} for i, s in ((0, 0.05), (1, 0.3), (2, 0.65))},
        fire_fx=fire_fx)

    def _build():
        m = _mats()
        rig = C.Rig(slug + "_rig", all_bones, yaw_deg=YAW)
        ctx = dict(rig=rig, m=m)
        build(rig, m, ctx)
        return ctx

    def _set(rig, table):
        for bn, v in table.items():
            if bn.startswith("_"):
                continue
            if isinstance(v, dict):
                rig.set(bn, r=math.radians(v.get("r", 0.0)), rz=math.radians(v.get("rz", 0.0)), loc=v.get("loc"),
                        s=v.get("s"))
            elif isinstance(v, tuple):
                rig.set(bn, r=math.radians(v[0]), rz=math.radians(v[1]))
            else:
                rig.set(bn, r=math.radians(v))

    def _pose(ctx, clip, t):
        rig = ctx["rig"]
        rig.rest()
        W.turret_visibility(ctx, clip)
        if clip in ("mount", "idle", "build"):
            tab = idle(ctx, t if clip == "idle" else 0.0)
        elif clip == "fire":
            tab = fire(ctx, t)
        else:
            tab = idle(ctx, 0.0)
        _set(rig, tab)
        if clip == "build":
            # dropped in: in the air, lands (dust), rebounds 2 lu, settles
            z = B.keyed([(0, {"z": 26.0, "r": 4.0}), (140, {"z": 0.0, "r": 0.0}), (220, {"z": 2.0, "r": -1.0}),
                         (310, {"z": 0.0, "r": 0.0}), (430, {"z": 0.0, "r": 0.0})], t)
            rig.set("root", r=math.radians(z["r"]), loc=(0, 0, z["z"]))
        elif clip == "destroyed":
            k = B.keyed([(0, {"hr": 14.0, "hx": -1.0, "hz": 1.0, "rr": 3.0, "rz": -0.5}),
                         (80, {"hr": 38.0, "hx": -5.0, "hz": -4.0, "rr": 6.0, "rz": -1.5}),
                         (180, {"hr": 70.0, "hx": -10.0, "hz": -14.0, "rr": 9.0, "rz": -2.5}),
                         (340, {"hr": 72.0, "hx": -10.5, "hz": -15.0, "rr": 9.0, "rz": -2.6})], t)
            rig.set("root", r=math.radians(k["rr"]), loc=(0, 0, k["rz"]))
            rig.set("head", r=math.radians(k["hr"]), loc=(k["hx"], 0, k["hz"]))

    return SimpleNamespace(
        SLUG=slug, NAME=name, AGE=AGE, KIND="turret", VISUAL_ID="turret." + slug, HEIGHT_LU=height, PX1=1.23, SCALE1=1.5,
        CANVAS=CANVAS, FEET=FEET, YAW=YAW, ANCHORS={"head": (0, height), "hitCenter": (0, hit_z)},
        TRACKERS={"muzzle": muzzle},
        EXTRA_META={"kind": "turret", "age": AGE, "pivotLu": W.pivot_lu(pivot, YAW), "aimLimits": list(aim),
                    "fireKind": fire_kind, "modelScale": 1.0},
        build=_build, pose=_pose, clips=lambda: clips_, LREF=None)


# ------------------------------------------------------------------------------ Rock Tosser
def rock_tosser_build(rig, m, ctx):
    footing(rig, m, r=18, h=8, seed=2)
    for y in (-9, 9):
        for x0 in (-13, 13):
            rig.rigid(W.grp(C.tube("leg", [(x0, y, 6), (0, y * 0.9, 30)], [2.6, 2.2], m["bark"], seg=10), "mount"), "root")
    rig.rigid(W.grp(C.tube("axle", [(0, -11, 29), (0, 11, 29)], [2.0, 2.0], m["wood"], seg=10), "mount"), "root")
    for y in (-9, 9):
        rig.rigid(W.grp(C.lathe("lash", [(2.9, 27.4), (3.2, 29), (2.9, 30.6)], m["rope"], seg=12, loc=(0, y * 0.9, 0)), "mount"), "root")
    rig.rigid(W.grp(C.tube("brace", [(-10, -9.5, 15), (10, -9.5, 15)], [1.3, 1.3], m["wood"], seg=8), "mount"), "root")
    pennant(rig, m, -15, 8, 7, h=34)
    # the throwing arm with a hide cup and a boulder
    arm = [C.tube("arm", [(0, 0, 29), (-1.0, 0, 44), (-2.0, 0, 60)], [2.4, 2.1, 1.8], m["wood"], seg=10),
           C.lathe("cup", [(0, 0), (5.4, 1.0), (6.6, 4.0), (6.0, 5.4), (0, 3.0)], m["hide"], seg=16, loc=(-2.4, 0, 58)),
           C.lathe("band", [(2.3, 39.5), (2.6, 41), (2.3, 42.5)], m["team"], seg=12)]
    C.team(arm[2])
    for o in arm:
        rig.rigid(W.grp(o, "head"), "arm")
    b = C.blobs("boulder", [((-2.4, 0, 65.4), (5.4, 5.0, 5.0))], m["stone"], res=0.4)
    C.displace(b, 0.9, 0.5)
    rig.rigid(W.grp(b, "head"), "arm")
    ctx["boulder"] = b


def rock_tosser_idle(ctx, t):
    ctx["boulder"].hide_render = False
    return {"arm": 40.0 + 2.0 * math.sin(2 * math.pi * t / 680.0)}


def rock_tosser_fire(ctx, t):
    k = B.keyed([(0, {"a": 58.0}), (60, {"a": -30.0}), (110, {"a": -48.0}), (190, {"a": -12.0}), (290, {"a": 30.0}),
                 (420, {"a": 40.0})], t)
    ctx["boulder"].hide_render = 55 <= t < 280
    return {"arm": k["a"]}


# ------------------------------------------------------------------------------ Angry Beehive
def beehive_build(rig, m, ctx):
    # a gnarled dead stump with a side branch; a straw skep hangs from it
    st = C.blobs("stump", [((0, 0, 8), (12, 11, 9)), ((-1, 0, 20), (8.5, 8, 9)), ((-2, 0, 34), (6, 6, 9)),
                           ((-3, 0, 46), (4.4, 4.4, 6))], m["bark"], res=0.6)
    C.displace(st, 1.2, 0.4)
    rig.rigid(W.grp(st, "mount"), "root")
    br = C.tube("branch", [(-3, 0, 48), (5, 0, 55), (14, 0, 57), (20, 0, 55)], [3.0, 2.4, 1.8, 1.2], m["bark"], seg=10)
    rig.rigid(W.grp(br, "mount"), "root")
    for i in range(3):
        rt = C.tube("root", [(0, 0, 3), (9 * math.cos(i * 2.1 + 0.4), 9 * math.sin(i * 2.1 + 0.4), 0.8)], [3.0, 1.0], m["bark"], seg=8)
        rig.rigid(W.grp(rt, "mount"), "root")
    mo = C.blobs("moss", [((4, -6, 14), (5, 2, 4)), ((-5, -5, 28), (3, 2, 4))], m["moss"], res=0.4)
    C.displace(mo, 0.6, 1.0)
    rig.rigid(W.grp(mo, "mount"), "root")
    pennant(rig, m, -10, 6, 10, h=34)
    # the skep: coiled straw rings, a team-painted band, an entrance hole; hangs on a cord
    straw = M.straw("#b39a6a", name="skep")
    prof = [(0, 0), (8.5, 0.6), (11.5, 4.0), (12.2, 9.0), (11.2, 14.5), (8.6, 19.0), (4.6, 22.0), (0, 23.0)]
    sk = C.lathe("skep", prof, straw, seg=32, loc=(14, 0, 24))
    rig.rigid(W.grp(sk, "head"), "head")
    for z in (27.0, 31.5, 36.0, 40.5):
        rr = [r for r, zz in [(11.5, 27), (12.2, 31.5), (11.4, 36), (9.2, 40.5)] if zz == z][0]
        ring = C.lathe("coil", [(rr - 0.3, z - 0.8), (rr + 0.25, z), (rr - 0.3, z + 0.8)], straw, seg=32, loc=(14, 0, 0))
        rig.rigid(W.grp(ring, "head"), "head")
    band = C.lathe("skepband", [(12.1, 33.0), (12.5, 34.2), (12.0, 35.4)], m["team"], seg=32, loc=(14, 0, 0))
    C.team(band)
    rig.rigid(W.grp(band, "head"), "head")
    rig.rigid(W.grp(C.sphere("hole", 2.4, M.dark(), loc=(20, -8.4, 27.5), scale=(0.9, 0.5, 0.7)), "head"), "head")
    rig.rigid(W.grp(C.tube("cord", [(14, 0, 46.5), (14, 0, 55.5)], [0.5, 0.5], m["rope"], seg=6), "head"), "head")
    # bees: small dark-banded bodies with pale wings
    bee_mat = C.mat("bee", "#6a5530", rough=0.5, noise=0.2, nscale=3, bump=0.2)
    wing = C.mat("wing", "#d8d6cc", rough=0.3, noise=0.05, bump=0)
    ctx["bees"] = []
    for i in range(9):
        bn = f"bee{i}"
        o = C.blobs(bn, [((0, 0, 0), (1.1, 0.8, 0.8))], bee_mat, res=0.2)
        w = C.blobs(bn + "w", [((0, 0, 0.9), (0.9, 0.3, 0.6))], wing, res=0.15)
        for q in (o, w):
            q["bee"] = i
            rig.rigid(W.grp(q, "head"), "head")
        ctx["bees"].append((o, w))


BEE_HOME = [(24, -9, 44), (4, -10, 38), (27, -9, 30), (8, -12, 24), (22, -12, 20), (30, -8, 40), (1, -8, 30), (18, -13, 50),
            (33, -10, 26)]


def _bees(ctx, t, burst=0.0):
    for i, (o, w) in enumerate(ctx["bees"]):
        hx, hy, hz = BEE_HOME[i]
        a = 2 * math.pi * t / 680.0 + i * 1.7
        x = hx + 2.2 * math.sin(a) + burst * (10 + 3 * (i % 3))
        z = hz + 1.8 * math.cos(a * 1.3) + burst * (i % 4 - 1.5) * 2.5
        for q in (o, w):
            q.location = (x, hy, z)
            q.hide_render = False


def beehive_idle(ctx, t):
    _bees(ctx, t)
    return {"head": 3.0 * math.sin(2 * math.pi * t / 680.0)}


def beehive_fire(ctx, t):
    burst = B.keyed([(0, {"b": 0.0}), (60, {"b": 0.8}), (110, {"b": 1.3}), (190, {"b": 0.8}), (320, {"b": 0.2}), (420, {"b": 0.0})], t)["b"]
    _bees(ctx, t, burst)
    swing = B.keyed([(0, {"r": -3.0}), (60, {"r": 6.0}), (110, {"r": 4.0}), (190, {"r": -2.0}), (420, {"r": 0.0})], t)["r"]
    return {"head": swing}


# ------------------------------------------------------------------------------ Log Roller
def log_roller_build(rig, m, ctx):
    footing(rig, m, r=19, h=7, seed=4)
    for y in (-10, 10):
        rig.rigid(W.grp(C.tube("rail", [(-18, y, 36), (18, y, 9)], [2.5, 2.3], m["bark"], seg=10), "mount"), "root")
        rig.rigid(W.grp(C.tube("post", [(-16, y, 6), (-16, y, 36)], [2.4, 2.2], m["bark"], seg=10), "mount"), "root")
        rig.rigid(W.grp(C.tube("post2", [(2, y, 6), (2, y, 22)], [2.0, 1.9], m["bark"], seg=10), "mount"), "root")
    for k in range(4):
        x = -12 + k * 8.0
        z = 32.5 - k * 6.0
        rig.rigid(W.grp(C.tube("slat", [(x, -11, z), (x, 11, z)], [1.3, 1.3], m["wood"], seg=8), "mount"), "root")
    pennant(rig, m, -20, 8, 36, h=24)
    lg = [C.tube("log", [(-8, -13, 42), (-8, 13, 42)], [6.6, 6.6], m["bark"], seg=18),
          C.cyl("end", 5.9, 5.9, 0.5, M.wood("#b89a78", "#9c8062", name="endgrain", stripes=8), seg=20, loc=(-8, -13.2, 42),
                rot=(math.pi / 2, 0, 0)),
          C.lathe("logband", [(6.7, -2.0), (7.0, 0.0), (6.7, 2.0)], m["team"], seg=20, loc=(-8, 0, 42), rot=(math.pi / 2, 0, 0))]
    C.team(lg[2])
    for o in lg:
        rig.rigid(W.grp(o, "head"), "log")
    ctx["log"] = lg
    rig.rigid(W.grp(C.tube("lever", [(3, -12, 30), (7, -12, 47)], [1.4, 1.2], m["wood"], seg=8), "head"), "lever")
    rig.rigid(W.grp(C.tube("rope", [(3, -12, 44), (-6, -12, 47), (-10, -12, 46)], [0.55, 0.55, 0.55], m["rope"], seg=6), "head"), "lever")


def log_roller_idle(ctx, t):
    for o in ctx["log"]:
        o.hide_render = False
    return {"log": 1.5 * math.sin(2 * math.pi * t / 680.0), "lever": 0.0}


def log_roller_fire(ctx, t):
    k = B.keyed([(0, {"x": 0.0, "l": 0.0}), (60, {"x": 12.0, "l": -40.0}), (110, {"x": 26.0, "l": -50.0}),
                 (190, {"x": 26.0, "l": -30.0}), (290, {"x": 0.0, "l": 0.0}), (420, {"x": 0.0, "l": 0.0})], t)
    gone = 100 <= t < 280
    for o in ctx["log"]:
        o.hide_render = gone
    x = k["x"]
    return {"log": dict(r=-x * 5.0, loc=(x * 0.8, 0, -x * 0.55)), "lever": k["l"]}


# ------------------------------------------------------------------------------ Grumpy Toad
def toad_build(rig, m, ctx):
    st = C.blobs("stump", [((0, 1, 6), (15, 13, 7)), ((0, 1, 12), (13, 11.5, 2.5))], m["bark"], res=0.6)
    C.displace(st, 1.0, 0.4)
    rig.rigid(W.grp(st, "mount"), "root")
    top = C.cyl("stumptop", 12.4, 12.4, 1.0, M.wood("#9c8062", "#806850", name="rings", stripes=10), seg=24, loc=(0, 1, 13.6))
    rig.rigid(W.grp(top, "mount"), "root")
    mo = C.blobs("moss", [((-9, -8, 12), (5, 3, 2)), ((8, -7, 10), (4, 3, 3))], m["moss"], res=0.4)
    C.displace(mo, 0.6, 1.0)
    rig.rigid(W.grp(mo, "mount"), "root")
    pennant(rig, m, -13, 6, 13, h=32)
    skin = C.mat("toadskin", "#6f6a4a", rough=0.55, noise=0.3, nscale=1.6, bump=1.4, ramp2="#57513a", coat=0.3)
    belly = C.mat("toadbelly", "#b3a888", rough=0.6, noise=0.15, nscale=2.0, bump=0.5)
    wart = C.mat("wart", "#8a7a52", rough=0.5, noise=0.2, nscale=3, bump=0.6)
    eyem = C.mat("toadeye", "#a8883a", rough=0.08, noise=0.1, nscale=2, bump=0, coat=1.0)
    body = C.blobs("toad", [((0, 0, 26), (17, 14, 11)), ((8, 0, 24), (11, 12, 8.5)), ((-8, 0, 25), (10, 13, 9)),
                            ((9, -9, 18), (4.5, 3.5, 5)), ((9, 9, 18), (4.5, 3.5, 5)),        # front legs
                            ((-8, -13, 20), (8, 4, 6)), ((-8, 13, 20), (8, 4, 6)),            # folded hind legs
                            ((12, -8.5, 15.5), (4, 3, 1.4)), ((12, 8.5, 15.5), (4, 3, 1.4))], skin, res=0.6)
    C.displace(body, 0.8, 0.9)
    rig.rigid(W.grp(body, "head"), "head")
    th = C.blobs("throat", [((11, 0, 19.5), (8, 9, 4.2))], belly, res=0.5)
    rig.rigid(W.grp(th, "head"), "head")
    for i, (x, y, z) in enumerate([(-6, -12.5, 30), (2, -13, 31), (-12, -10, 26), (6, -12, 26), (-2, -13.5, 24), (-10, -6, 34),
                                   (0, -8, 35), (8, -9, 31)]):
        rig.rigid(W.grp(C.sphere(f"wart{i}", 1.2, wart, loc=(x, y, z), scale=(1, 0.6, 0.8)), "head"), "head")
    for y in (-6.5, 6.5):
        rig.rigid(W.grp(C.blobs("eyebump", [((10, y, 33.5), (4.2, 3.8, 3.4))], skin, res=0.35), "head"), "head")
        rig.rigid(W.grp(C.sphere("eye", 2.4, eyem, loc=(12.2, y * 1.12, 34.2), scale=(0.8, 0.7, 0.8)), "head"), "head")
        rig.rigid(W.grp(C.sphere("pupil", 1.2, M.dark(), loc=(14.0, y * 1.2, 34.3), scale=(0.35, 0.4, 0.25)), "head"), "head")
        rig.rigid(W.grp(C.blobs("brow", [((11, y * 1.05, 36.6), (3.8, 2.4, 0.9), (0, 0.25, 0))], skin, res=0.3), "head"), "head")
    band = C.blobs("bandana", [((-5, 0, 30), (9.5, 14.4, 2.4), (0, -0.25, 0))], m["cloth"], res=0.5)
    C.team(band)
    rig.rigid(W.grp(band, "head"), "head")
    knot = C.blobs("knot", [((-15, 0, 31), (2.2, 3, 2)), ((-19, 0, 29), (4, 1.2, 1.8), (0, 0.4, 0))], m["cloth"], res=0.3)
    C.team(knot)
    rig.rigid(W.grp(knot, "head"), "head")
    jaw = C.blobs("jaw", [((9, 0, 21.2), (10.5, 12, 2.6))], skin, res=0.5)
    rig.rigid(W.grp(jaw, "head"), "jaw")
    maw = C.blobs("maw", [((12, 0, 22.8), (7, 9, 1.6))], C.mat("maw", "#5a3a34", rough=0.4, noise=0.1, bump=0.1), res=0.4)
    rig.rigid(W.grp(maw, "head"), "jaw")


def toad_idle(ctx, t):
    w = math.sin(2 * math.pi * t / 680.0)
    return {"jaw": -1.0 - 1.5 * max(0.0, w), "head": 0.8 * w}


def toad_fire(ctx, t):
    k = B.keyed([(0, {"j": -3.0, "h": -3.0}), (60, {"j": -28.0, "h": 4.0}), (110, {"j": -24.0, "h": 3.0}),
                 (190, {"j": -10.0, "h": 1.0}), (290, {"j": -2.0, "h": 0.0}), (420, {"j": -1.0, "h": 0.0})], t)
    return {"jaw": k["j"], "head": k["h"]}


TURRETS = [
    turret("rock_tosser", "Rock Tosser", 72.0, (0, 0, 29), {"arm": ((0, 0, 29), (0, 0, 33), "head")},
           rock_tosser_build, rock_tosser_idle, rock_tosser_fire, ("arm", (-2.4, 0, 65.4)), fire_kind="swing", hit_z=27.3),
    turret("angry_beehive", "Angry Beehive", 72.0, (14, 0, 55), {}, beehive_build, beehive_idle, beehive_fire,
           ("head", (21, -9, 28)), fire_kind="pulse", hit_z=30.0),
    turret("log_roller", "Log Roller", 72.0, (0, 0, 0), {"log": ((-8, 0, 42), (-8, 0, 46), "head"),
                                                          "lever": ((3, -12, 30), (7, -12, 47), "head")},
           log_roller_build, log_roller_idle, log_roller_fire, ("head", (18, 0, 12)), fire_kind="release", hit_z=24.0),
    turret("grumpy_toad", "Grumpy Toad", 68.0, (0, 0, 14), {"jaw": ((-4, 0, 21), (12, 0, 21), "head")},
           toad_build, toad_idle, toad_fire, ("jaw", (16, -2, 22)), aim=(-18, 18), fire_kind="tongue", hit_z=22.0),
]
