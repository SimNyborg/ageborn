"""Bronze Age turrets, realistic style: Archer Tower, Gorgon Bust, Onager, Sun Mirror.

Each turret is a module-like object for `lib/game.py` (KIND 'turret') with the turret clip contract of
`lib/world.py`: a static footing (group 'mount') and a head that turns about its pivot (group 'head').
Every turret stands on a dressed sandstone plinth with a team pennant on a cedar pole; the head
carries a team-painted part. Build: dropped in, it lands in a burst of dust and settles. Destroyed:
the head tips off backwards, the footing sags, dust.

  Archer Tower  a timber platform on a mud-brick base behind a team hide screen; an archer with a
                composite bow draws, holds and looses (the arrow leaves at `muzzle`), then nocks again
  Gorgon Bust   a painted limestone bust of Medusa with verdigris bronze snakes for hair on a column;
                her eyes smoulder, then blaze (the gaze beam starts at `muzzle`)
  Onager        a heavy timber torsion frame; the throwing arm is winched down, then whips up against
                the padded crossbeam and the sling throws its stone (`muzzle`)
  Sun Mirror    a great concave bronze mirror in a yoke on a tall stand; it tilts to catch the sun and
                flares (the beam leaves from its focus, `muzzle`)
"""
import math
from types import SimpleNamespace

import bmesh
import bpy

from lib import biped as B
from lib import bronze as BZ
from lib import core as C
from lib import mats as M
from lib import world as W

AGE = "bronze"
YAW = -12.0
CANVAS = (132, 100)
FEET = (70, 9)


# ------------------------------------------------------------------------------ shared parts
def _mats():
    m = BZ.kit()
    m.update(sand=M.stone("#a8977a", "#8c7c64", name="sandstone", bump=0.9),
             sand_dk=M.stone("#8e7f68", "#766a58", name="sandstone_dk", bump=1.0),
             brick=M.clay("#a08466", name="mudbrick"),
             mortar=M.dark("#4a3e34", name="mortar"),
             cloth=M.team_cloth(name="tcloth"),
             hide=M.team_hide(name="thide"),
             lime=M.stone("#cfc6b4", "#b4aa98", name="limestone_w", bump=0.35))
    return m


def plinth(rig, m, w=34.0, d=26.0, h=7.0, seed=1):
    """A two-step plinth of dressed sandstone blocks (the static mount)."""
    import random
    rnd = random.Random(seed)
    rows = [(0.0, w, d, h * 0.55), (h * 0.55, w * 0.8, d * 0.78, h * 0.45)]
    for ri, (z0, ww, dd, hh) in enumerate(rows):
        n = 3 if ri == 0 else 2
        for i in range(n):
            bw_ = ww / n
            x = -ww / 2 + bw_ * (i + 0.5)
            blk = C.box(f"blk{seed}_{ri}_{i}", bw_ - 0.5, dd, hh - 0.3, m["sand"] if (i + ri) % 2 == 0 else m["sand_dk"], bevel=0.7,
                        loc=(x + rnd.uniform(-0.3, 0.3), rnd.uniform(-0.4, 0.4), z0 + hh / 2))
            C.displace(blk, 0.35, 0.8)
            rig.rigid(W.grp(blk, "mount"), "root")
    for i in range(3):
        a = rnd.uniform(0, 2 * math.pi)
        pb = C.blobs(f"pebble{seed}{i}", [((w * 0.55 * math.cos(a), -d * 0.5 - 1.5, 1.0), (2.2, 1.8, 1.2))], m["sand_dk"], res=0.4)
        C.displace(pb, 0.4, 0.8)
        rig.rigid(W.grp(pb, "mount"), "root")


def pennant(rig, m, x, y, z0, h=32.0):
    """A small team pennant on a cedar pole with a bronze finial (static, on the footing)."""
    rig.rigid(W.grp(C.tube("ppole", [(x, y, z0), (x, y, z0 + h)], [0.8, 0.65], m["cedar"], seg=8), "mount"), "root")
    rig.rigid(W.grp(C.lathe("pfin", [(0.0, 0.0), (1.1, 0.6), (0.9, 1.6), (0.0, 3.2)], m["polished"], seg=10, loc=(x, y, z0 + h)), "mount"),
              "root")
    fl = BZ.ribbon("pflag", [(x - 0.6, y, z0 + h - 0.8), (x - 6, y, z0 + h - 1.6), (x - 11, y, z0 + h - 2.8), (x - 16, y, z0 + h - 4.4)],
                   [6.4, 5.4, 3.8, 0.8], m["cloth"], thick=0.35, up=(0, 0, 1), center=1.0)
    C.displace(fl, 0.35, 1.4)
    C.team(fl)
    rig.rigid(W.grp(fl, "mount"), "root")


def set_tube(o, pts, r, seg=6):
    """Rebuild a thin tube's mesh through world points (bow strings, slings)."""
    bm = bmesh.new()
    from mathutils import Vector
    P = [Vector(p) for p in pts]
    rings = []
    for i, p in enumerate(P):
        t = (P[min(i + 1, len(P) - 1)] - P[max(i - 1, 0)]).normalized()
        ref = Vector((0, 1, 0)) if abs(t.y) < 0.9 else Vector((1, 0, 0))
        n = (ref - t * ref.dot(t)).normalized()
        b = t.cross(n)
        rings.append([bm.verts.new(p + (n * math.cos(2 * math.pi * k / seg) + b * math.sin(2 * math.pi * k / seg)) * r) for k in range(seg)])
    for j in range(len(rings) - 1):
        for k in range(seg):
            bm.faces.new((rings[j][k], rings[j][(k + 1) % seg], rings[j + 1][(k + 1) % seg], rings[j + 1][k]))
    bm.to_mesh(o.data)
    bm.free()
    o.data.update()


def turret(slug, name, height, pivot, bones, build, idle, fire, muzzle, aim=(0, 0), fire_kind="recoil", hit_z=27.0,
           fire_fx=None, after=None):
    """A turret module. `bones` extra {name: (head, tail, parent)}; `idle(ctx, t)` / `fire(ctx, t)` return
    {bone: r or (r, rz) or dict(r=, loc=, s=)} and may pose extra rigs through ctx. `after(ctx)` runs once
    the bones are set (world-space updates such as a bow string)."""
    all_bones = {"root": ((0, 0, 0), (0, 0, 4), None),
                 "pivot": (pivot, (pivot[0], pivot[1], pivot[2] + 4), "root")}
    all_bones.update(bones)
    clips_ = W.turret_clips(
        dust_build={i: {"s": s, "origin": (0, 0), "spread": 18, "size": 7.0, "seed": 21} for i, s in ((1, 0.05), (2, 0.4), (3, 0.92))},
        dust_destroyed={i: {"s": s, "origin": (-6, 0), "spread": 20, "size": 8.0, "seed": 23} for i, s in ((0, 0.05), (1, 0.3), (2, 0.65))},
        fire_fx=fire_fx)

    def _build():
        m = _mats()
        extra = {}
        ctx = dict(m=m)
        pre = getattr(build, "bones", None)
        if pre:
            extra.update(pre())
        allb = dict(all_bones)
        allb.update(extra)
        rig = C.Rig(slug + "_rig", allb, yaw_deg=YAW)
        ctx["rig"] = rig
        build(rig, m, ctx)
        return ctx

    def _set(rig, table):
        for bn, v in table.items():
            if bn.startswith("_"):
                continue
            if isinstance(v, dict):
                rig.set(bn, r=math.radians(v.get("r", 0.0)), rz=math.radians(v.get("rz", 0.0)), loc=v.get("loc"), s=v.get("s"))
            elif isinstance(v, tuple):
                rig.set(bn, r=math.radians(v[0]), rz=math.radians(v[1]))
            else:
                rig.set(bn, r=math.radians(v))

    def _pose(ctx, clip, t):
        rig = ctx["rig"]
        rig.rest()
        W.show_groups(ctx, lambda g: True)
        gr = bpy.data.objects.get("ground")
        if gr is not None:
            # head-only frames: no stray contact shadow under the footing (the ground still bounces light
            # and shows in reflections, so metals keep the same look as in the whole-turret frames)
            gr.visible_camera = clip not in ("idle", "fire")
        if clip in ("mount", "idle", "build"):
            tab = idle(ctx, t if clip == "idle" else 0.0)
        elif clip == "fire":
            tab = fire(ctx, t)
        else:
            tab = idle(ctx, 0.0)
        _set(rig, tab)
        W.turret_visibility(ctx, clip)
        if clip == "build":
            z = B.keyed([(0, {"z": 26.0, "r": 4.0}), (140, {"z": 0.0, "r": 0.0}), (220, {"z": 2.0, "r": -1.0}),
                         (310, {"z": 0.0, "r": 0.0}), (430, {"z": 0.0, "r": 0.0})], t)
            rig.set("root", r=math.radians(z["r"]), loc=(0, 0, z["z"]))
        elif clip == "destroyed":
            k = B.keyed([(0, {"hr": 10.0, "hx": -1.0, "hz": 1.0, "rr": 3.0, "rz": -0.5}),
                         (80, {"hr": 24.0, "hx": -5.0, "hz": 0.0, "rr": 5.0, "rz": -1.5}),
                         (180, {"hr": 40.0, "hx": -10.0, "hz": -3.0, "rr": 7.0, "rz": -2.0}),
                         (340, {"hr": 42.0, "hx": -10.5, "hz": -3.5, "rr": 7.0, "rz": -2.1})], t)
            rig.set("root", r=math.radians(k["rr"]), loc=(0, 0, k["rz"]))
            rig.set("pivot", r=math.radians(k["hr"]), loc=(k["hx"], 0, k["hz"]))
        if after:
            bpy.context.view_layer.update()
            after(ctx, clip)

    return SimpleNamespace(
        SLUG=slug, NAME=name, AGE=AGE, KIND="turret", VISUAL_ID="turret." + slug, HEIGHT_LU=height, PX1=1.23, SCALE1=1.5,
        CANVAS=CANVAS, FEET=FEET, YAW=YAW, ANCHORS={"head": (0, height), "hitCenter": (0, hit_z)},
        TRACKERS={"muzzle": muzzle},
        EXTRA_META={"kind": "turret", "age": AGE, "pivotLu": W.pivot_lu(pivot, YAW), "aimLimits": list(aim),
                    "fireKind": fire_kind, "modelScale": 1.0},
        build=_build, pose=_pose, clips=lambda: clips_, LREF=None)


# ------------------------------------------------------------------------------ Archer Tower
ARCHER = B.Biped(H=34.0, bulk=0.96)
ARCHER.root = "archer"
FLOOR_Z = 27.0
ARCHER.offset = (-2.0, 0.0, FLOOR_Z)
AK = ARCHER.k
A_G0 = B.ANKLE * ARCHER.H
BOW_FIST = (0.35 * AK + ARCHER.offset[0], ARCHER.sw, 31.0 * AK + FLOOR_Z)
BOW_H = 15.0          # half height of the bow along the far hand's axis
ARROW_L = 17.0


def _archer_bones():
    return ARCHER.bones(root_parent="pivot")


def archer_build(rig, m, ctx):
    plinth(rig, m, w=30, d=26, h=6, seed=3)
    # the tower: a mud-brick base with a timber platform on four cedar posts
    base = C.box("towerbase", 22, 20, 10, m["brick"], bevel=0.8, loc=(0, 0, 11))
    C.displace(base, 0.4, 0.6)
    rig.rigid(W.grp(base, "mount"), "root")
    for z in (8.5, 12.0, 15.5):
        rig.rigid(W.grp(C.box("course", 22.4, 20.4, 0.35, m["mortar"], bevel=0.1, loc=(0, 0, z)), "mount"), "root")
    for x in (-9.5, 9.5):
        for y in (-8.5, 8.5):
            rig.rigid(W.grp(C.tube("post", [(x, y, 15.0), (x, y, FLOOR_Z + 9.0)], [1.6, 1.4], m["cedar"], seg=8), "mount"), "root")
    rig.rigid(W.grp(C.box("floor", 24, 22, 1.4, m["cedar"], bevel=0.3, loc=(0, 0, FLOOR_Z - 0.6)), "mount"), "root")
    for x in (-11.0, -5.5, 0.0, 5.5, 11.0):
        rig.rigid(W.grp(C.tube("joist", [(x, -11.2, FLOOR_Z - 1.6), (x, 11.2, FLOOR_Z - 1.6)], [0.7, 0.7], m["cedar"], seg=6), "mount"), "root")
    # the front parapet: a team-dyed hide stretched on a rail, bronze studs, a leather hem
    rail_pts = [(-10.5, -10.4, FLOOR_Z + 9.0), (0.0, -11.0, FLOOR_Z + 9.2), (10.5, -10.4, FLOOR_Z + 9.0)]
    rig.rigid(W.grp(C.tube("rail", rail_pts, [0.8] * 3, m["cedar"], seg=8), "mount"), "root")
    for sx in (-1, 1):
        rig.rigid(W.grp(C.tube("siderail", [(sx * 10.5, -10.4, FLOOR_Z + 9.0), (sx * 10.5, 9.0, FLOOR_Z + 9.0)], [0.7, 0.7], m["cedar"], seg=8),
                        "mount"), "root")
    scr = BZ.ribbon("screen", [(-10.2, -10.9, FLOOR_Z + 8.6), (0.0, -11.4, FLOOR_Z + 8.4), (10.2, -10.9, FLOOR_Z + 8.6)], [9.0, 9.4, 9.0],
                    m["hide"], thick=0.5, up=(0, 0, 1), center=1.0)
    for v in scr.data.vertices:
        v.co.z -= 9.2 * 1.0 if v.co.z > FLOOR_Z + 8.0 else 0.0
    C.displace(scr, 0.35, 1.2)
    C.team(scr)
    rig.rigid(W.grp(scr, "mount"), "root")
    hem = C.tube("screenhem", [(-10.2, -11.2, FLOOR_Z - 0.6), (0.0, -11.7, FLOOR_Z - 0.8), (10.2, -11.2, FLOOR_Z - 0.6)], [0.55] * 3,
                 m["leather"], seg=6)
    rig.rigid(W.grp(hem, "mount"), "root")
    for x in (-8.0, -4.0, 0.0, 4.0, 8.0):
        rig.rigid(W.grp(C.sphere("stud", 0.55, m["polished"], seg=8, ring=6, loc=(x, -11.6 - 0.1 * abs(x) * 0.0, FLOOR_Z + 7.4)), "mount"), "root")
    pennant(rig, m, -11.5, 8.5, FLOOR_Z + 8.0, h=30)

    # the archer: linen tunic, leather cap, a quiver on the back
    skin = M.skin("#8e6b56")
    for o in ARCHER.body(rig, skin).values():
        W.grp(o, "head")
    k = AK
    ox, oy, oz = ARCHER.offset
    S = lambda x, y, z: (x * k + ox, y * k + oy, z * k + oz)
    A = lambda a, b, c: (a * k, b * k, c * k)
    tunic = C.blobs("atunic", [(S(0.3, 0, 41.0), A(4.5, 6.2, 5.6)), (S(-0.3, 0, 47.4), A(5.0, 6.9, 6.2)), (S(1.8, -3.1, 50.2), A(3.0, 3.5, 2.8)),
                               (S(1.8, 3.1, 50.2), A(3.0, 3.5, 2.8)), (S(-1.8, 0, 50.0), A(3.0, 6.5, 5.2)), (S(0.0, 0, 34.8), A(5.4, 7.3, 3.6))],
                    m["linen"], res=0.22)
    C.displace(tunic, 0.25, 1.2)
    rig.skin(W.grp(tunic, "head"), ["hips", "spine", "chest"], soft=2.0 * k)
    belt = C.blobs("abelt", [(S(-0.1, 0, 38.6), A(4.9, 6.8, 1.2))], m["team_cloth"], res=0.2)
    C.team(belt)
    rig.skin(W.grp(belt, "head"), ["hips", "spine"], soft=2.0 * k)
    cap = C.blobs("acap", [(S(-0.5, 0, 66.2), A(4.8, 4.25, 3.6)), (S(-2.8, 0, 63.6), A(2.6, 3.95, 2.8))], m["team_cloth"], res=0.2)
    C.team(cap)
    rig.rigid(W.grp(cap, "head"), "head")
    beard = C.blobs("abeard", [(S(3.4, 0, 60.2), A(2.0, 2.9, 2.3)), (S(3.9, 0, 58.8), A(1.4, 1.9, 1.8))], M.hair("#2a211c", name="ahair"), res=0.2)
    rig.rigid(W.grp(beard, "head"), "head")
    quiver = C.tube("quiver", [S(-5.2, 3.0, 38.0), S(-7.4, 3.4, 56.0)], [2.0 * k, 2.3 * k], m["leather"], seg=10)
    rig.skin(W.grp(quiver, "head"), ["spine", "chest"], soft=3 * k)
    for i in range(3):
        rig.rigid(W.grp(C.tube("qarrow", [S(-7.2 + i * 0.6, 3.0 + (i - 1) * 0.8, 55.0), S(-8.2 + i * 0.6, 3.0 + (i - 1) * 0.8, 60.0)],
                               [0.35, 0.35], m["linen"], seg=5), "head"), "chest")
    # the composite bow in the far hand (vertical in the hand's rest frame: the hand's axis is +X)
    bx, by, bz = BOW_FIST
    pts = [(bx - 4.5 * u * u + 1.6 * u ** 4, by, bz + BOW_H * u) for u in (-1.0, -0.75, -0.5, -0.25, 0.0, 0.25, 0.5, 0.75, 1.0)]
    bow = C.tube("bow", pts, [0.55, 0.7, 0.9, 1.0, 1.1, 1.0, 0.9, 0.7, 0.55], M.horn("#3e342c", name="bowhorn"), seg=8)
    rig.rigid(W.grp(bow, "head"), "hand_B")
    grip = C.tube("bowgrip", [(bx, by, bz - 2.0), (bx, by, bz + 2.0)], [1.25, 1.25], m["leather"], seg=8)
    rig.rigid(W.grp(grip, "head"), "hand_B")
    ctx["bow_tips"] = [pts[0], pts[-1]]
    st = C.tube("bowstring", [pts[0], pts[-1]], [0.2, 0.2], M.rope("#d0c4a8", name="string"), seg=6)
    W.grp(st, "head")
    ctx["string"] = st
    # the arrow, nocked: along +X from the near fist
    fx, fy, fz = (0.35 * k + ox, -ARCHER.sw, 31.0 * k + oz)
    arrow = [C.tube("arshaft", [(fx - 1.0, fy, fz), (fx + ARROW_L, fy, fz)], [0.28, 0.28], m["ash"], seg=6),
             C.tube("arhead", [(fx + ARROW_L - 0.2, fy, fz), (fx + ARROW_L + 2.4, fy, fz)], [0.6, 0.04], m["polished"], seg=6, flat=0.4)]
    for i in range(2):
        arrow.append(BZ.ribbon("arfletch", [(fx - 0.6, fy, fz), (fx + 3.0, fy, fz)], [1.4, 0.6], m["linen"], thick=0.15,
                               up=(0, (-1) ** i * 0.7, 0.7), center=0.0))
    for o in arrow:
        rig.rigid(W.grp(o, "head"), "hand_F")
    ctx["arrow"] = arrow
    ctx["fist_F"] = (fx, fy, fz)


archer_build.bones = _archer_bones


def _archer_pose(ctx, draw, aim=0.0, breath=0.0, recoil=0.0, reach=0.0):
    """draw 0..1 (string at the chin at 1), aim (deg, + = up), recoil (bow hand kick after release)."""
    P = dict(root=(0.0, -0.8), hips=0, spine=-2 + breath, chest=-1 - breath, neck=0, head=-4 - aim * 0.4,
             footF=(4.0, A_G0, 0.0), footB=(-4.5, A_G0, 0.0))
    # bow arm: extended toward the target at shoulder height
    P["absB"] = (86 + aim - recoil * 6, 90 + aim - recoil * 10, aim - recoil * 12, -6)
    f = ARCHER.fk(P)
    sx, sz = f["shoulder"]
    # the drawing hand: from the bow grip (draw 0) back to the chin (draw 1)
    L = ARCHER.L_upper + ARCHER.L_fore
    grip = (sx + L * 0.93 * math.cos(math.radians(aim)), sz + L * 0.93 * math.sin(math.radians(aim)))
    chin = (sx - 1.0, sz + 1.2)
    x = grip[0] + (chin[0] - grip[0]) * draw
    z = grip[1] + (chin[1] - grip[1]) * draw
    if reach > 0:
        x, z = x + (sx - 7.0 - x) * reach, z + (sz + 4.0 - z) * reach
    P["handF"] = ((x, z), aim)
    P["root"] = (P["root"][0], P["root"][1])
    return P


def _apply_archer(ctx, P):
    Q = dict(P)
    Q["handF"] = ((Q["handF"][0][0], Q["handF"][0][1]), Q["handF"][1])
    ARCHER.apply(ctx["rig"], Q, rest=False)


def archer_idle(ctx, t):
    a = 2 * math.pi * t / 680.0
    for o in ctx["arrow"]:
        o.hide_render = False
    P = _archer_pose(ctx, 0.35 + 0.05 * math.sin(a), aim=2.0 * math.sin(a - 0.5), breath=0.8 * math.sin(a))
    _apply_archer(ctx, P)
    ctx["draw"] = 0.35 + 0.05 * math.sin(a)
    return {}


def archer_fire(ctx, t):
    # 0 full draw (anchored), 60 loose, 110 follow-through, 190 reach for the quiver, 290 nock and half draw
    k = B.keyed([(0, {"d": 1.0, "r": 0.0, "q": 0.0}), (60, {"d": 0.0, "r": 1.0, "q": 0.0}), (110, {"d": 0.0, "r": 0.5, "q": 0.1}),
                 (190, {"d": 0.0, "r": 0.1, "q": 1.0}), (290, {"d": 0.3, "r": 0.0, "q": 0.0}), (420, {"d": 0.35, "r": 0.0, "q": 0.0})], t)
    gone = 40 <= t < 280
    for o in ctx["arrow"]:
        o.hide_render = gone
    P = _archer_pose(ctx, k["d"], aim=0.0, recoil=k["r"], reach=k["q"])
    _apply_archer(ctx, P)
    ctx["draw"] = k["d"] if not (40 <= t < 280) else -0.08 * k["r"]
    return {}


def archer_after(ctx, clip):
    rig = ctx["rig"]
    t0 = rig.world_point("hand_B", ctx["bow_tips"][0])
    t1 = rig.world_point("hand_B", ctx["bow_tips"][1])
    fx, fy, fz = ctx["fist_F"]
    nock = rig.world_point("hand_F", (fx - 0.8, fy, fz))
    if ctx.get("draw", 0.0) <= 0.02 or ctx["arrow"][0].hide_render:
        mid = (t0 + t1) / 2
        nock = mid + (nock - mid) * 0.0
        mid_rest = rig.world_point("hand_B", (BOW_FIST[0] - 2.9, BOW_FIST[1], BOW_FIST[2]))
        nock = mid_rest
    set_tube(ctx["string"], [tuple(t0), tuple(nock), tuple(t1)], 0.2)


# ------------------------------------------------------------------------------ Gorgon Bust
BUST = B.Biped(H=90.0, bulk=0.9)
BUST.root = "bust"
BUST.offset = (0.0, 0.0, -23.5)
GK = BUST.k


def gorgon_build(rig, m, ctx):
    plinth(rig, m, w=26, d=22, h=6, seed=5)
    # a fluted column drum as the pedestal
    col = C.lathe("column", [(0.0, 6.0), (8.4, 6.0), (8.6, 7.4), (7.4, 8.6), (7.0, 20.0), (7.2, 22.0), (8.6, 23.2), (8.8, 25.0), (0.0, 25.0)],
                  m["lime"], seg=32)
    rig.rigid(W.grp(col, "mount"), "root")
    for i in range(16):
        a = 2 * math.pi * i / 16
        fl = C.tube("flute", [(7.05 * math.cos(a), 7.05 * math.sin(a), 9.0), (7.05 * math.cos(a), 7.05 * math.sin(a), 19.6)], [0.55, 0.55],
                    M.dark("#6e6558", name="fluteshade"), seg=6)
        rig.rigid(W.grp(fl, "mount"), "root")
    band = C.lathe("colband", [(8.7, 22.4), (9.0, 23.6), (8.7, 24.8)], m["hide"], seg=32)
    C.team(band)
    rig.rigid(W.grp(band, "mount"), "root")
    pennant(rig, m, -12.0, 8.0, 6.0, h=36)
    # the bust: shoulders and a painted team chiton on limestone, a fierce head, bronze snake hair
    k = GK
    ox, oy, oz = BUST.offset
    S = lambda x, y, z: (x * k + ox, y * k + oy, z * k + oz)
    stone = M.stone("#d4cbb8", "#bcb2a0", name="marble", bump=0.25)
    skin = C.mat("paintedskin", "#c9b29a", rough=0.55, noise=0.08, nscale=0.6, bump=0.12)
    parts = BUST.body(rig, skin, parts=("head",), res=0.35)
    for o in parts.values():
        W.grp(o, "head")
    A = lambda a, b, c: (a * k, b * k, c * k)
    chest = C.blobs("bustchest", [(S(-0.2, 0, 48.0), A(4.6, 6.6, 6.6)), (S(1.9, -3.2, 50.4), A(2.8, 3.4, 2.8)), (S(1.9, 3.2, 50.4), A(2.8, 3.4, 2.8)),
                                  (S(-1.2, -5.2, 54.0), A(3.0, 3.6, 2.4)), (S(-1.2, 5.2, 54.0), A(3.0, 3.6, 2.4)), (S(-2.0, 0, 49.5), A(2.8, 6.2, 5.6)),
                                  (S(0.7, 0, 57.4), A(2.3, 2.3, 3.4)), (S(0.0, -7.4, 53.6), A(3.0, 2.9, 3.4)), (S(0.0, 7.4, 53.6), A(3.0, 2.9, 3.4))],
                     skin, res=0.35)
    rig.skin(W.grp(chest, "head"), ["spine", "chest", "neck"], soft=2.0 * k)
    # cut the torso into a bust: a marble socle hides everything below the chest
    socle = C.lathe("socle", [(0.0, 25.0), (7.6, 25.0), (7.9, 26.4), (6.0, 28.0), (5.8, 31.6), (0.0, 31.6)], stone, seg=28)
    rig.rigid(W.grp(socle, "head"), "head_turn")
    chiton = C.blobs("bchiton", [(S(-0.2, 0, 47.4), A(4.9, 6.9, 6.2)), (S(1.9, -3.2, 49.8), A(3.0, 3.6, 2.8)), (S(1.9, 3.2, 49.8), A(3.0, 3.6, 2.8)),
                                 (S(-1.2, -5.2, 53.2), A(3.2, 3.8, 2.4)), (S(-1.2, 5.2, 53.2), A(3.2, 3.8, 2.4)), (S(-2.0, 0, 49.0), A(3.0, 6.4, 5.6)),
                                 (S(0.0, -7.6, 52.4), A(3.2, 3.1, 3.4)), (S(0.0, 7.6, 52.4), A(3.2, 3.1, 3.4))],
                     m["hide"], res=0.35)
    C.displace(chiton, 0.3, 1.0)
    C.team(chiton)
    rig.skin(W.grp(chiton, "head"), ["spine", "chest"], soft=2.0 * k)
    for s in (-1, 1):
        rig.rigid(W.grp(C.sphere("brooch", 0.9, m["polished"], loc=S(2.6, s * 5.4, 54.8)), "head"), "chest")
    # glaring eyes (they flare on fire), a snarling mouth
    eyem = C.emit_mat("gaze", "#e8f0d8", 4.0)
    ctx["gaze"] = eyem
    for y in (-1.5, 1.5):
        rig.rigid(W.grp(C.sphere("geye", 0.62 * k, eyem, loc=S(4.25, y, 63.0), scale=(0.5, 1, 0.55)), "head"), "head")
    rig.rigid(W.grp(C.blobs("gmouth", [(S(4.3, 0, 59.8), (0.6, 1.5, 0.45))], M.dark("#3a2a24", name="gmouth"), res=0.2), "head"), "head")
    # snake hair: verdigris bronze snakes writhing out from the scalp, each with a small head
    import random
    rnd = random.Random(9)
    snake_m = BZ.bronze("snake", "#6b7461", "#55705e", rough=0.45, amount=0.55, nscale=1.2)
    for i in range(15):
        a = -1.2 + 2.9 * i / 14
        side = 1 if i % 2 else -1
        root = S(0.3 + 3.4 * math.cos(a), side * 2.8 * abs(math.sin(a * 1.3)), 64.5 + 3.4 * math.sin(a))
        d = (math.cos(a) * 0.9 - 0.2, side * rnd.uniform(0.6, 1.3), math.sin(a) * 0.8 + 0.25)
        L = rnd.uniform(4.0, 6.5) * k
        pts = [root]
        for j in range(1, 5):
            w = math.sin(j * 1.8 + i) * 1.2 * k
            pts.append((root[0] + d[0] * L * j / 4 + w * 0.3, root[1] + d[1] * L * j / 4 + w, root[2] + d[2] * L * j / 4 + w * 0.5))
        sn = C.tube(f"snake{i}", pts, [0.95 * k, 0.8 * k, 0.65 * k, 0.55 * k, 0.5 * k], snake_m, seg=8)
        rig.rigid(W.grp(sn, "head"), "head")
        hd = C.blobs(f"snakehead{i}", [(pts[-1], (0.9 * k, 0.7 * k, 0.6 * k))], snake_m, res=0.2)
        rig.rigid(W.grp(hd, "head"), "head")
    cap = C.blobs("scalp", [(S(-0.4, 0, 65.4), (4.7, 4.2, 3.8)), (S(-2.6, 0, 62.4), (3.0, 4.0, 3.6))], snake_m, res=0.3)
    C.displace(cap, 0.4 * k, 0.5)
    rig.rigid(W.grp(cap, "head"), "head")


def _gorgon_bones():
    b = BUST.bones(root_parent="pivot")
    b["head_turn"] = ((0, 0, 25.0), (0, 0, 29.0), "pivot")
    return b


gorgon_build.bones = _gorgon_bones


def _gorgon_set(ctx, lean, glare, head_up=0.0):
    rig = ctx["rig"]
    P = dict(root=(lean * 0.3, 0.0), hips=0, spine=-lean * 0.5, chest=-lean * 0.5, neck=-2 - lean, head=-4 + head_up)
    rig.set(BUST.root, loc=(lean * 0.3, 0, 0))
    rig.set("spine", r=math.radians(P["spine"]))
    rig.set("chest", r=math.radians(P["chest"]))
    rig.set("neck", r=math.radians(P["neck"]))
    rig.set("head", r=math.radians(P["head"]))
    for n in ctx["gaze"].node_tree.nodes:
        if n.type == "EMISSION":
            n.inputs["Strength"].default_value = 3.0 + 16.0 * glare


def gorgon_idle(ctx, t):
    a = 2 * math.pi * t / 680.0
    _gorgon_set(ctx, 1.5 * math.sin(a), 0.1 + 0.08 * math.sin(a * 2), head_up=2.0 * math.sin(a - 0.6))
    return {}


def gorgon_fire(ctx, t):
    k = B.keyed([(0, {"l": 4.0, "g": 0.6}), (60, {"l": 9.0, "g": 1.0}), (110, {"l": 8.0, "g": 0.85}), (190, {"l": 4.0, "g": 0.4}),
                 (290, {"l": 1.0, "g": 0.15}), (420, {"l": 0.0, "g": 0.1})], t)
    _gorgon_set(ctx, k["l"], k["g"], head_up=-2.0 * k["g"])
    return {}


# ------------------------------------------------------------------------------ Onager
ON_PIV = (13.3, 0.0, 17.8)
ARM_L = 46.0


def onager_build(rig, m, ctx):
    plinth(rig, m, w=48, d=26, h=5, seed=7)
    wood, dark = m["cedar"], M.wood("#57402e", "#443224", name="odark")
    # the frame: two long side beams, cross beams, the upright crossbeam with a padded buffer
    for y in (-8.5, 8.5):
        rig.rigid(W.grp(C.box("sidebeam", 52, 3.4, 4.2, wood, bevel=0.5, loc=(-4, y, 7.4)), "mount"), "root")
        rig.rigid(W.grp(C.tube("upright", [(15, y, 7), (19, y, 36)], [1.8, 1.6], wood, seg=8), "mount"), "root")
        rig.rigid(W.grp(C.tube("strut", [(4, y, 8), (18, y, 32)], [1.2, 1.1], dark, seg=8), "mount"), "root")
        for x in (-26, 10):
            rig.rigid(W.grp(C.cyl("washerplate", 2.4, 2.4, 0.8, m["bronze"], seg=16, loc=(x + 2.0, y - 1.8 * (1 if y < 0 else -1), 7.4),
                                  rot=(math.pi / 2, 0, 0)), "mount"), "root")
    for x in (-26, -10, 8):
        rig.rigid(W.grp(C.box("crossbeam", 3.6, 20, 3.4, wood, bevel=0.4, loc=(x, 0, 7.2)), "mount"), "root")
    rig.rigid(W.grp(C.box("stopbeam", 3.6, 21, 3.4, wood, bevel=0.4, loc=(19.4, 0, 36.5)), "mount"), "root")
    pad = C.blobs("buffer", [((17.6, 0, 35.0), (2.6, 8.0, 2.8))], M.burlap("#9a8668", name="padding"), res=0.4)
    C.displace(pad, 0.4, 0.8)
    rig.rigid(W.grp(pad, "mount"), "root")
    # the torsion skein: a thick twist of sinew rope across the frame at the pivot, bronze washers
    sk = C.tube("skein", [(ON_PIV[0], -8.5, ON_PIV[2]), (ON_PIV[0], 0, ON_PIV[2]), (ON_PIV[0], 8.5, ON_PIV[2])], [3.2, 3.6, 3.2],
                M.rope("#b5a282", name="sinew"), seg=14)
    C.displace(sk, 0.35, 1.6)
    rig.rigid(W.grp(sk, "mount"), "root")
    for y in (-10.6, 10.6):
        rig.rigid(W.grp(C.cyl("washer", 4.2, 4.2, 1.6, m["polished"], seg=24, loc=(ON_PIV[0], y - 0.8, ON_PIV[2]), rot=(math.pi / 2, 0, 0)), "mount"),
                  "root")
    # team panels on the side beams (painted leather covers) and the winch
    for y in (-10.3, 10.3):
        pn = C.box("panel", 20, 0.5, 3.4, m["team_paint"], bevel=0.2, loc=(-14, y, 7.8))
        C.team(pn)
        rig.rigid(W.grp(pn, "mount"), "root")
    rig.rigid(W.grp(C.tube("winch", [(-24, -10, 12), (-24, 10, 12)], [1.8, 1.8], wood, seg=10), "mount"), "root")
    for y in (-11.0, 11.0):
        rig.rigid(W.grp(C.box("winchspoke", 1.0, 1.0, 9.0, dark, bevel=0.2, loc=(-24, y, 12)), "mount"), "root")
    pennant(rig, m, -28.0, 9.0, 9.0, h=30)
    # the arm (head group, on the 'arm' bone): built pointing straight up from the pivot, a team band
    x0, y0, z0 = ON_PIV
    arm = [C.tube("oarm", [(x0, 0, z0), (x0 - 0.5, 0, z0 + ARM_L * 0.5), (x0, 0, z0 + ARM_L)], [2.3, 2.0, 1.6], wood, seg=10),
           C.lathe("armband", [(2.1, z0 + 22), (2.5, z0 + 24), (2.1, z0 + 26)], m["team_paint"], seg=12, loc=(x0, 0, 0)),
           C.lathe("armcap", [(1.7, z0 + ARM_L - 1.0), (2.0, z0 + ARM_L), (0.0, z0 + ARM_L + 1.0)], m["bronze"], seg=12, loc=(x0, 0, 0))]
    C.team(arm[1])
    for o in arm:
        rig.rigid(W.grp(o, "head"), "arm")
    # the sling pouch hanging from the tip with its stone
    pouch = C.blobs("pouch", [((x0 - 3.0, 0, z0 + ARM_L + 2.0), (3.2, 2.6, 1.8))], m["leather"], res=0.3)
    rig.rigid(W.grp(pouch, "head"), "arm")
    stn = C.blobs("ostone", [((x0 - 3.0, 0, z0 + ARM_L + 3.6), (3.0, 2.8, 2.7))], m["sand_dk"], res=0.3)
    C.displace(stn, 0.5, 0.6)
    rig.rigid(W.grp(stn, "head"), "arm")
    ctx["stone"] = stn
    rig.rigid(W.grp(C.tube("slingcord", [(x0, 0, z0 + ARM_L), (x0 - 3.0, 0, z0 + ARM_L + 1.5)], [0.3, 0.3], m["rope"], seg=6), "head"), "arm")


def onager_idle(ctx, t):
    ctx["stone"].hide_render = False
    # winched down: the arm lies back over the frame, it creaks against the ratchet
    return {"arm": 72.0 + 1.5 * math.sin(2 * math.pi * t / 680.0)}


def onager_fire(ctx, t):
    k = B.keyed([(0, {"a": 75.0}), (60, {"a": 2.0}), (110, {"a": -9.0}), (190, {"a": -4.0}), (290, {"a": 40.0}), (420, {"a": 70.0})], t)
    ctx["stone"].hide_render = 55 <= t < 400
    return {"arm": k["a"]}


# ------------------------------------------------------------------------------ Sun Mirror
MIR_PIV = (4.0, 0.0, 49.5)
MIR_R = 18.0


def mirror_build(rig, m, ctx):
    plinth(rig, m, w=30, d=26, h=6, seed=11)
    # a tall stepped stand: a limestone post on the plinth, a bronze yoke on top
    post = C.lathe("mpost", [(0.0, 6.0), (6.4, 6.0), (6.4, 8.0), (4.4, 9.2), (3.6, 30.0), (4.0, 36.0), (5.4, 37.0), (5.4, 39.0), (0.0, 39.0)],
                   m["lime"], seg=24)
    rig.rigid(W.grp(post, "mount"), "root")
    band = C.lathe("mband", [(4.0, 24.0), (4.4, 26.0), (4.0, 28.0)], m["hide"], seg=24)
    C.team(band)
    rig.rigid(W.grp(band, "mount"), "root")
    rig.rigid(W.grp(C.cyl("turntable", 6.0, 6.0, 1.6, m["bronze"], seg=24, loc=(0, 0, 39.0)), "mount"), "root")
    pennant(rig, m, -12.0, 8.0, 6.0, h=40)
    # the head: a yoke and the great concave mirror, polished bronze, a team-painted back rim
    x0, y0, z0 = MIR_PIV
    yk = C.tube("yoke", [(x0 - 2.0, -MIR_R - 1.5, z0), (x0 - 4.0, -MIR_R - 1.5, 41.5), (x0 - 4.0, MIR_R + 1.5, 41.5), (x0 - 2.0, MIR_R + 1.5, z0)],
                [1.2, 1.2, 1.2, 1.2], m["dark_bronze"], seg=10)
    rig.rigid(W.grp(yk, "head"), "pivot")
    rig.rigid(W.grp(C.cyl("yokepost", 1.6, 1.6, 3.0, m["dark_bronze"], seg=12, loc=(x0 - 4.0, 0, 39.0)), "head"), "pivot")
    mirror_m = BZ.bronze("speculum", "#c2ac80", "#8a8a70", rough=0.26, amount=0.04, nscale=0.8)
    dish = C.lathe("dish", [(0.0, 0.0), (MIR_R * 0.5, 0.6), (MIR_R * 0.9, 2.2), (MIR_R, 3.0)], mirror_m, seg=48)
    back = C.lathe("dishback", [(MIR_R, 3.0), (MIR_R + 0.6, 1.6), (MIR_R * 0.9, -1.0), (MIR_R * 0.4, -2.2), (0.0, -2.4)], m["team_paint"], seg=48)
    C.team(back)
    rim = C.lathe("dishrim", [(MIR_R - 0.6, 3.2), (MIR_R + 0.7, 3.3), (MIR_R + 0.9, 1.8), (MIR_R - 0.2, 2.2)], m["dark_bronze"], seg=48)
    boss = C.lathe("dishboss", [(0.0, -2.4), (3.2, -2.4), (2.4, -4.8), (0.0, -5.2)], m["dark_bronze"], seg=20)
    for o in (dish, back, rim, boss):
        # the dish's axis points forward (+X) and a little toward the camera
        C.xform(o, rot=(0, math.radians(90), 0))
        C.xform(o, rot=(0, 0, math.radians(-18)))
        C.xform(o, loc=(x0 - 1.0, 0, z0))
        rig.rigid(W.grp(o, "head"), "pivot")
    # the focal flare: a small glowing point in front of the dish (bright on fire)
    fl = C.sphere("flare", 2.2, C.emit_mat("mflare", "#fff4dc", 10.0), loc=(x0 + 13.0, -3.6, z0))
    rig.rigid(W.grp(fl, "head"), "pivot")
    ctx["flare"] = fl
    ctx["flare_m"] = bpy.data.materials["mflare"]


def mirror_idle(ctx, t):
    a = 2 * math.pi * t / 680.0
    ctx["flare"].hide_render = True
    return {"pivot": 2.0 * math.sin(a)}


def mirror_fire(ctx, t):
    k = B.keyed([(0, {"r": -3.0, "f": 0.3}), (60, {"r": 1.5, "f": 1.0}), (110, {"r": 1.0, "f": 0.85}), (190, {"r": 0.0, "f": 0.5}),
                 (290, {"r": 0.0, "f": 0.15}), (420, {"r": 0.0, "f": 0.0})], t)
    ctx["flare"].hide_render = k["f"] < 0.05
    for n in ctx["flare_m"].node_tree.nodes:
        if n.type == "EMISSION":
            n.inputs["Strength"].default_value = 4.0 + 16.0 * k["f"]
    return {"pivot": k["r"]}


TURRETS = [
    turret("archer_tower", "Archer Tower", 72.0, (0.0, 0.0, 41.3), {}, archer_build, archer_idle, archer_fire,
           ("hand_B", (BOW_FIST[0] + 3.0, BOW_FIST[1], BOW_FIST[2])), aim=(-40, 30), fire_kind="release", hit_z=42.0,
           after=archer_after),
    turret("gorgon_bust", "Gorgon Bust", 72.0, (1.4, 0.0, 34.5), {}, gorgon_build, gorgon_idle, gorgon_fire,
           ("head", (4.9 * GK + 3.0, 0.0, 63.0 * GK + BUST.offset[2])), aim=(-35, 25), fire_kind="gaze", hit_z=36.0),
    turret("onager", "Onager", 68.0, ON_PIV, {"arm": (ON_PIV, (ON_PIV[0], 0, ON_PIV[2] + 4), "pivot")}, onager_build, onager_idle,
           onager_fire, ("arm", (ON_PIV[0] - 3.0, 0, ON_PIV[2] + ARM_L + 3.6)), fire_kind="swing", hit_z=18.7),
    turret("sun_mirror", "Sun Mirror", 72.0, MIR_PIV, {}, mirror_build, mirror_idle, mirror_fire,
           ("pivot", (MIR_PIV[0] + 13.0, -3.6, MIR_PIV[2])), aim=(-45, 30), fire_kind="beam", hit_z=51.0),
]
