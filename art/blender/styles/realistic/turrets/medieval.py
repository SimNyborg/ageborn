"""Medieval Age turrets, realistic style: Crossbow Nest, Pitch Cauldron, Trebuchet, Honk Ballista.

Each turret is a module-like object for `lib/game.py` (KIND 'turret'): a static footing (group
'mount') and a head that turns about its pivot (group 'head'), with the turret clip contract of
`lib/world.py`. Every footing is a plinth of dressed limestone ashlar (the keep's masonry) with a
team swallow-tailed pennant on an ash pole; each head carries a team-painted part (a painted stock,
a heraldic plaque, a painted counterweight, a painted torsion frame).

  crossbow_nest   a heavy windlass crossbow (steel prod, hemp string, iron stirrup) on an oak post
                  with an iron swivel; a team pavise leans on the plinth.
  pitch_cauldron  an iron cauldron of boiling pitch slung on trunnions between two oak uprights over
                  a coal hearth; it tips forward to pour.
  trebuchet       a small hinged-counterweight trebuchet on two oak A-frames: the arm is winched down
                  at the back and the sling lies on the plinth; on the shot the painted counterweight
                  drops and the arm whips over the top.
  honk_ballista   a torsion ballista (two sinew skeins in a painted oak frame, iron washers, a winch)
                  loaded with an indignant domestic goose.

Build: dropped in from above, lands in dust and settles. Destroyed: the head tips off backwards,
the footing sags, dust.
"""
import math
import random
from types import SimpleNamespace

from lib import biped as B
from lib import core as C
from lib import mats as M
from lib import medieval as MD
from lib import world as W

AGE = "medieval"
YAW = -12.0


# ------------------------------------------------------------------------------ shared parts
def _mats():
    return dict(
        ash=M.stone("#b3aa98", "#958b7b", name="ashlar", bump=0.9),
        ash2=M.stone("#a69d8a", "#8a8171", name="ashlar2", bump=0.9),
        oak=M.wood("#6b5847", "#4e4035", name="oak", stripes=1.2),
        oak_lt=M.wood("#86725c", "#6a5a48", name="oak_lt", stripes=1.4),
        iron=MD.iron(), dsteel=MD.dark_steel(), steel=MD.steel(), brass=MD.brass(),
        rope=M.rope("#a08c6a"), leather=M.leather("#4b3b30"),
        paint=MD.team_paint(), cloth=MD.team_wool(name="tpennant"),
        hem=MD.wool("#2e2622", name="them"), charge=MD.linen("#d2c7ad", name="tcharge"),
    )


def plinth(rig, m, w=32.0, d=24.0, h=9.0, seed=1):
    """Two courses of dressed limestone blocks in running bond with a chamfered cap course."""
    rnd = random.Random(seed)
    courses = 2
    ch = h / courses
    for c in range(courses):
        inset = 0.8 * c
        x = -w / 2 + inset + (0.0 if c % 2 == 0 else -rnd.uniform(3.0, 5.0))
        i = 0
        while x < w / 2 - inset - 0.5:
            bw = rnd.uniform(7.5, 11.0)
            x1 = min(x + bw, w / 2 - inset)
            x0 = max(x, -w / 2 + inset)
            if x1 - x0 > 1.5:
                mat = m["ash"] if (i + c) % 2 == 0 else m["ash2"]
                o = C.box(f"ashlar{seed}_{c}_{i}", x1 - x0 - 0.35, d - 2 * inset - rnd.uniform(0, 0.4), ch - 0.3, mat,
                          bevel=0.7, segs=2, loc=((x0 + x1) / 2, 1.5 + rnd.uniform(-0.25, 0.25), ch * (c + 0.5) + 0.05))
                C.displace(o, 0.25, 0.9)
                rig.rigid(W.grp(o, "mount"), "root")
            x += bw
            i += 1


def pennant(rig, m, x, y, z0, h=38.0, length=17.0):
    """A swallow-tailed team pennant on an ash pole with an iron finial, streaming back (-X)."""
    rig.rigid(W.grp(C.tube("ppole", [(x, y, z0), (x, y, z0 + h)], [0.75, 0.6], m["oak_lt"], seg=8), "mount"), "root")
    rig.rigid(W.grp(C.lathe("pfin", [(0.0, 0.0), (0.9, 0.4), (0.7, 1.6), (0.0, 3.4)], m["iron"], seg=10,
                            loc=(x, y, z0 + h)), "mount"), "root")
    n = 7
    pts, radii = [], []
    for i in range(n):
        u = i / (n - 1)
        pts.append((x - 0.6 - length * u, y + 0.9 * math.sin(u * 5.0), z0 + h - 3.4 - 2.6 * u * u + 0.8 * math.sin(u * 7.0)))
        radii.append(3.0 * (1 - 0.35 * u))
    fl = C.tube("pflag", pts, radii, m["cloth"], seg=12, flat=0.12)
    # the swallow tail: notch the free end
    tip = x - 0.6 - length
    for v in fl.data.vertices:
        if v.co.x < tip + 5.0:
            dz = abs(v.co.z - (z0 + h - 6.0 + 0.8 * math.sin(7.0)))
            v.co.x += max(0.0, 4.0 * (1 - dz / 2.2))
    C.team(fl)
    rig.rigid(W.grp(fl, "mount"), "root")


def oak_post(rig, m, top, r=2.8):
    """A squared oak post with two braces and iron bands, from the plinth to `top`."""
    rig.rigid(W.grp(C.box("post", 2 * r, 2 * r, top - 9.0, m["oak"], bevel=0.5, loc=(0, 1.5, (top + 9.0) / 2)), "mount"), "root")
    for sx in (-1, 1):
        rig.rigid(W.grp(C.tube("brace", [(sx * 10.0, 1.5, 9.0), (sx * 2.2, 1.5, 9.0 + (top - 9.0) * 0.62)], [1.2, 1.1],
                               m["oak"], seg=6), "mount"), "root")
    for z in (11.0, top - 2.5):
        rig.rigid(W.grp(C.box("band", 2 * r + 0.5, 2 * r + 0.5, 1.1, m["iron"], bevel=0.25, loc=(0, 1.5, z)), "mount"), "root")
    rig.rigid(W.grp(C.cyl("swivel", 3.8, 3.6, 1.4, m["dsteel"], seg=18, loc=(0, 1.5, top - 0.2)), "mount"), "root")


def turret(slug, name, height, pivot, bones, build, idle, fire, muzzle, aim=(0, 0), fire_kind="recoil", hit_z=27.0,
           canvas=(132, 104), feet=(70, 9), fire_fx=None, scale=1.0):
    """A turret module. `bones` extra {name: (head, tail, parent)} under 'head'; `idle(ctx, t)` /
    `fire(ctx, t)` return {bone: r or (r, rz) or dict(r=, loc=, s=)} and may hide objects."""
    all_bones = {"root": ((0, 0, 0), (0, 0, 4), None),
                 "head": (pivot, (pivot[0], pivot[1], pivot[2] + 4), "root")}
    all_bones.update(bones)
    clips_ = W.turret_clips(
        dust_build={i: {"s": s, "origin": (0, 0), "spread": 20, "size": 7.0, "seed": 21} for i, s in ((1, 0.05), (2, 0.4), (3, 0.92))},
        dust_destroyed={i: {"s": s, "origin": (-6, 0), "spread": 22, "size": 8.0, "seed": 23} for i, s in ((0, 0.05), (1, 0.3), (2, 0.65))},
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
        import bpy
        rig = ctx["rig"]
        rig.rest()
        rig.set("root", s=scale)
        W.show_groups(ctx, lambda g: True)
        g = bpy.data.objects.get("ground")
        if g is not None:
            g.hide_render = clip in ("idle", "fire")        # head-only frames: no ground shadow
        if clip in ("mount", "idle", "build"):
            tab = idle(ctx, t if clip == "idle" else 0.0)
        elif clip == "fire":
            tab = fire(ctx, t)
        else:
            tab = idle(ctx, 0.0)
        _set(rig, tab)
        W.turret_visibility(ctx, clip)
        if clip == "build":
            z = B.keyed([(0, {"z": 28.0, "r": 4.0}), (140, {"z": 0.0, "r": 0.0}), (220, {"z": 2.0, "r": -1.0}),
                         (310, {"z": 0.0, "r": 0.0}), (430, {"z": 0.0, "r": 0.0})], t)
            rig.set("root", r=math.radians(z["r"]), loc=(0, 0, z["z"]), s=scale)
        elif clip == "destroyed":
            k = B.keyed([(0, {"hr": 10.0, "hx": -1.0, "hz": 1.0, "rr": 3.0, "rz": -0.5}),
                         (80, {"hr": 24.0, "hx": -5.0, "hz": 0.0, "rr": 5.0, "rz": -1.5}),
                         (180, {"hr": 40.0, "hx": -10.0, "hz": -3.0, "rr": 7.0, "rz": -2.0}),
                         (340, {"hr": 42.0, "hx": -10.5, "hz": -3.5, "rr": 7.0, "rz": -2.1})], t)
            rig.set("root", r=math.radians(k["rr"]), loc=(0, 0, k["rz"]), s=scale)
            rig.set("head", r=math.radians(k["hr"]), loc=(k["hx"], 0, k["hz"]))

    return SimpleNamespace(
        SLUG=slug, NAME=name, AGE=AGE, KIND="turret", VISUAL_ID="turret." + slug, HEIGHT_LU=height, PX1=1.23, SCALE1=1.5,
        CANVAS=canvas, FEET=feet, YAW=YAW, ANCHORS={"head": (0, height), "hitCenter": (0, hit_z)},
        TRACKERS={"muzzle": muzzle},
        EXTRA_META={"kind": "turret", "age": AGE, "pivotLu": W.pivot_lu(tuple(c * scale for c in pivot), YAW), "aimLimits": list(aim),
                    "fireKind": fire_kind, "modelScale": 1.0},
        build=_build, pose=_pose, clips=lambda: clips_, LREF=None)


def _show(objs, on):
    for o in objs:
        o.hide_render = not on


# ------------------------------------------------------------------------------ Crossbow Nest
XB_PIV = (0.0, 1.5, 34.0)
XB_Z = 37.0        # stock centre line
XB_NUT = 1.0       # string at full draw
XB_PROD = 15.5     # prod centre


def _prod(name, m, flex):
    pts, radii = [], []
    for i in range(13):
        u = -1 + 2 * i / 12
        pts.append((XB_PROD - (5.2 - flex) * u * u, 1.5 + 17.0 * u, XB_Z + 0.4))
        radii.append(1.05 - 0.45 * abs(u))
    return C.tube(name, pts, radii, m["steel"], seg=8, flat=0.55)


def crossbow_build(rig, m, ctx):
    plinth(rig, m, w=32, d=24, h=9, seed=3)
    oak_post(rig, m, 32.0)
    pennant(rig, m, -14.0, 10.0, 9.0, h=40)
    # a team pavise leaning on the rear of the plinth: tall shield with a central ridge and an iron rim
    pv = MD.heater_shield(1.0, m["paint"], m["iron"], charge_mat=m["charge"], height=21.0, width=14.0, charge="bend")
    for o in pv:
        C.xform(o, rot=(math.radians(-10), 0, math.radians(-38)))
        C.xform(o, loc=(-10.5, -6.5, 20.0))
        rig.rigid(W.grp(o, "mount"), "root")
    rig.rigid(W.grp(C.tube("pavprop", [(-9.5, -3.0, 29.0), (-6.0, 3.5, 9.0)], [0.55, 0.55], m["oak"], seg=6), "mount"), "root")

    # the head: a fork on the swivel, the stock (painted), prod, stirrup, windlass, string and bolt
    H = []
    H.append(C.box("fork", 4.2, 5.4, 3.6, m["iron"], bevel=0.4, loc=(0, 1.5, 34.4)))
    H.append(C.box("stock", 33.0, 3.4, 3.4, m["oak"], bevel=0.6, loc=(1.5, 1.5, XB_Z)))
    H.append(C.box("stockpaint", 18.0, 3.8, 2.4, m["paint"], bevel=0.35, loc=(-1.5, 1.5, XB_Z - 0.3)))
    C.team(H[-1])
    for x in (-10.8, 7.8):
        H.append(C.box("stockband", 1.0, 4.0, 3.0, m["dsteel"], bevel=0.2, loc=(x, 1.5, XB_Z - 0.2)))
    H.append(C.box("nut", 2.0, 2.2, 1.6, m["brass"], bevel=0.3, loc=(XB_NUT, 1.5, XB_Z + 1.9)))
    H.append(C.tube("trigger", [(-1.0, 1.5, XB_Z - 1.6), (-3.4, 1.5, XB_Z - 6.0)], [0.4, 0.3], m["dsteel"], seg=6))
    H.append(C.box("prodseat", 3.0, 4.4, 4.4, m["iron"], bevel=0.4, loc=(XB_PROD + 0.4, 1.5, XB_Z + 0.2)))
    H.append(C.tube("stirrup", [(XB_PROD + 1.4, -1.5, XB_Z - 1.0), (XB_PROD + 5.5, -1.2, XB_Z - 1.4), (XB_PROD + 6.5, 1.5, XB_Z - 1.6),
                                (XB_PROD + 5.5, 4.2, XB_Z - 1.4), (XB_PROD + 1.4, 4.5, XB_Z - 1.0)], [0.45] * 5, m["dsteel"], seg=6))
    # windlass: a drum with two cranks at the butt
    H.append(C.cyl("drum", 1.9, 1.9, 9.0, m["oak_lt"], seg=14, loc=(-15.4, -3.0, XB_Z + 0.3), rot=(-math.pi / 2, 0, 0)))
    for y in (-3.4, 6.4):
        H.append(C.tube("crank", [(-15.4, y, XB_Z + 0.3), (-15.4, y, XB_Z + 5.6), (-15.4, y + (-1.4 if y < 0 else 1.4), XB_Z + 5.6)],
                        [0.4, 0.4, 0.55], m["iron"], seg=6))
    for o in H:
        rig.rigid(W.grp(o, "head"), "head")
    drawn = [_prod("prod", m, 0.0),
             C.tube("string", [(XB_PROD - 5.2, -15.5, XB_Z + 0.4), (XB_NUT, 1.5, XB_Z + 2.0), (XB_PROD - 5.2, 18.5, XB_Z + 0.4)],
                    [0.3] * 3, m["rope"], seg=6)]
    loose = [_prod("prod_l", m, 2.4),
             C.tube("string_l", [(XB_PROD - 2.8, -15.5, XB_Z + 0.4), (XB_PROD - 2.0, 1.5, XB_Z + 0.6), (XB_PROD - 2.8, 18.5, XB_Z + 0.4)],
                    [0.3] * 3, m["rope"], seg=6)]
    bolt = [C.tube("bolt", [(XB_NUT + 0.2, 1.5, XB_Z + 2.4), (XB_NUT + 21.0, 1.5, XB_Z + 2.4)], [0.5, 0.5], m["oak_lt"], seg=8),
            C.lathe("bolthead", [(0.0, 0.0), (0.95, 0.2), (0.8, 1.8), (0.0, 4.2)], m["steel"], seg=4,
                    loc=(XB_NUT + 21.0, 1.5, XB_Z + 2.4), rot=(0, math.pi / 2, 0))]
    for y in (-1.0, 1.0):
        bolt.append(C.box("vane", 3.6, 0.2, 1.2, m["leather"], bevel=0.05, loc=(XB_NUT + 2.8, 1.5 + y * 0.45, XB_Z + 2.4 + y * 0.5),
                          rot=(math.radians(35 * y), 0, 0)))
    for o in drawn + loose + bolt:
        rig.rigid(W.grp(o, "head"), "head")
    ctx.update(drawn=drawn, loose=loose, bolt=bolt)


def crossbow_idle(ctx, t):
    _show(ctx["drawn"], True)
    _show(ctx["loose"], False)
    _show(ctx["bolt"], True)
    return {"head": 1.2 * math.sin(2 * math.pi * t / 1020.0)}


def crossbow_fire(ctx, t):
    loose = 50 <= t < 280
    _show(ctx["drawn"], not loose)
    _show(ctx["loose"], loose)
    _show(ctx["bolt"], not (50 <= t < 280))
    k = B.keyed([(0, {"r": -1.5, "x": 0.4}), (60, {"r": 4.5, "x": -2.2}), (110, {"r": 3.0, "x": -1.6}), (190, {"r": 0.8, "x": -0.5}),
                 (290, {"r": 0.0, "x": 0.0}), (420, {"r": 0.0, "x": 0.0})], t)
    return {"head": dict(r=k["r"], loc=(k["x"], 0, 0))}


# ------------------------------------------------------------------------------ Pitch Cauldron
PC_PIV = (0.0, 1.5, 41.0)


def cauldron_build(rig, m, ctx):
    plinth(rig, m, w=34, d=26, h=9, seed=5)
    pennant(rig, m, -15.0, 11.0, 9.0, h=42)
    # the hearth: a ring of fire-blackened stones around glowing coals, low flames
    soot = M.stone("#5e5750", "#45403b", name="soot", bump=1.0)
    rnd = random.Random(8)
    for i in range(9):
        a = 2 * math.pi * i / 9
        o = C.blobs(f"hearth{i}", [((7.8 * math.cos(a), 1.5 + 6.4 * math.sin(a), 11.2), (2.8, 2.4, 2.2))], soot, res=0.45)
        C.displace(o, 0.5, 0.6)
        rig.rigid(W.grp(o, "mount"), "root")
    coals = C.blobs("coals", [((rnd.uniform(-4, 4), 1.5 + rnd.uniform(-3, 3), 10.4), (2.0, 1.8, 1.2)) for _ in range(8)],
                    C.mat("coal", "#2a2420", rough=0.8, noise=0.3, nscale=2, bump=0.6, emission="#ff6a20", estrength=1.2), res=0.4)
    rig.rigid(W.grp(coals, "mount"), "root")
    fire = M.glow("#ffa048", 7.0, name="fire")
    core = M.glow("#fff0c8", 12.0, name="firecore")
    for i, (x, y, h) in enumerate(((-2.0, -1.0, 9.0), (2.4, 0.5, 7.0), (0.0, -2.8, 6.0))):
        rig.rigid(W.grp(C.blobs(f"flame{i}", [((x, 1.5 + y, 12.5 + h * 0.35), (2.0, 1.6, h * 0.5))], fire, res=0.35), "mount"), "root")
        rig.rigid(W.grp(C.blobs(f"flamec{i}", [((x, 1.5 + y - 0.6, 12.0 + h * 0.25), (1.0, 0.8, h * 0.28))], core, res=0.3), "mount"), "root")
    # two oak uprights on sole blocks with raking braces, iron bearing caps
    for y in (-13.0, 16.0):
        rig.rigid(W.grp(C.box("upright", 3.8, 3.4, 36.0, m["oak"], bevel=0.5, loc=(0, y, 27.0)), "mount"), "root")
        rig.rigid(W.grp(C.box("sole", 20.0, 4.0, 2.4, m["oak"], bevel=0.5, loc=(0, y, 10.2)), "mount"), "root")
        for sx in (-1, 1):
            rig.rigid(W.grp(C.tube("rake", [(sx * 9.0, y, 11.0), (sx * 1.8, y, 26.0)], [1.1, 1.0], m["oak"], seg=6), "mount"), "root")
        rig.rigid(W.grp(C.box("bearing", 4.6, 4.2, 2.4, m["iron"], bevel=0.3, loc=(0, y, 44.4)), "mount"), "root")
    rig.rigid(W.grp(C.box("tiebeam", 3.0, 30.0, 2.6, m["oak"], bevel=0.4, loc=(-1.0, 1.5, 46.6)), "mount"), "root")

    # the cauldron (head): a cast-iron pot hung on trunnions, a heraldic team plaque, a tipping bar
    prof = [(0.0, 23.0), (4.0, 23.2), (8.5, 25.0), (11.2, 29.0), (12.0, 33.5), (11.4, 38.0), (11.0, 39.4), (12.3, 40.0),
            (12.5, 41.2), (11.2, 41.4), (10.6, 40.0), (0.0, 38.4)]
    pot = C.lathe("cauldron", prof, MD.iron(name="castiron"), seg=28, loc=(0, 1.5, 0))
    C.displace(pot, 0.15, 1.2)
    H = [pot]
    H.append(C.cyl("pitch", 10.8, 10.8, 0.6, C.mat("pitch", "#1a1614", rough=0.12, noise=0.1, nscale=1.0, bump=0.35, coat=1.0,
                                                  emission="#ff5a18", estrength=0.08), seg=24, loc=(0, 1.5, 38.6)))
    for y, sg in ((-10.4, -1), (13.4, 1)):
        H.append(C.cyl("trunnion", 1.4, 1.4, 4.4, m["iron"], seg=12, loc=(0, y, 41.0), rot=(-sg * math.pi / 2, 0, 0)))
    H.append(C.tube("bail", [(0, -11.0, 41.0), (-3, -10.8, 38.0), (-8, -9.0, 35.5)], [0.6] * 3, m["iron"], seg=6))
    H.append(C.tube("tipbar", [(-10.0, 1.5, 38.0), (-16.0, 1.5, 44.0), (-20.0, 1.5, 49.0)], [0.9, 0.8, 0.8], m["iron"], seg=8))
    H.append(C.tube("tipgrip", [(-17.8, 1.5, 46.4), (-21.6, 1.5, 51.0)], [1.3, 1.3], m["oak_lt"], seg=8))
    H.append(C.tube("lip", [(10.8, -2.0, 40.4), (14.4, 1.5, 40.8), (10.8, 5.0, 40.4)], [1.0, 1.4, 1.0], MD.iron(name="castiron"), seg=8))
    plaque = MD.heater_shield(0.62, m["paint"], m["brass"], charge_mat=m["charge"], height=14.0, width=11.0, charge="cross")
    for o in plaque:
        C.xform(o, rot=(math.radians(8), 0, math.radians(-8)))
        C.xform(o, loc=(1.5, -11.2, 32.6))
    H += plaque
    for o in H:
        rig.rigid(W.grp(o, "head"), "head")
    # the pour: a thick rope of hot pitch from the lip, falling in front (world space: on root)
    pour = C.tube("pour", [(10.5, 1.5, 32.5), (15.0, 1.5, 30.0), (18.0, 1.5, 24.0), (19.4, 1.5, 16.0), (20.0, 1.5, 9.0)],
                  [2.2, 2.0, 1.6, 1.3, 1.0], C.mat("pourpitch", "#1e1612", rough=0.08, noise=0.1, nscale=1.0, bump=0.2, coat=1.0,
                                                 emission="#ff5a18", estrength=0.06), seg=10)
    rig.rigid(W.grp(pour, "head"), "root")
    ctx["pour"] = [pour]


def cauldron_idle(ctx, t):
    _show(ctx["pour"], False)
    return {"head": 1.5 * math.sin(2 * math.pi * t / 1020.0)}


def cauldron_fire(ctx, t):
    _show(ctx["pour"], 50 <= t < 250)
    k = B.keyed([(0, {"r": 7.0}), (60, {"r": -44.0}), (110, {"r": -50.0}), (190, {"r": -26.0}), (290, {"r": -4.0}),
                 (420, {"r": 0.0})], t)
    return {"head": k["r"]}


# ------------------------------------------------------------------------------ Trebuchet
TB_AXLE = (0.0, 1.5, 44.0)
TB_LONG = 40.0
TB_SHORT = 11.0
TB_COCK = -148.0            # arm angle (deg, CCW from +X) winched down at the back


def trebuchet_build(rig, m, ctx):
    plinth(rig, m, w=40, d=26, h=8, seed=7)
    pennant(rig, m, -19.0, 11.0, 8.0, h=38)
    ax, ay, az = TB_AXLE
    # two A-frame trestles with sills, cross ties and iron bearing straps
    for y in (-8.5, 11.5):
        rig.rigid(W.grp(C.box("sill", 34.0, 3.4, 2.8, m["oak"], bevel=0.5, loc=(0, y, 9.4)), "mount"), "root")
        for sx in (-1, 1):
            rig.rigid(W.grp(C.tube("trestle", [(sx * 15.0, y, 10.0), (sx * 0.8, y, az + 1.0)], [1.7, 1.4], m["oak"], seg=8, sharp=40),
                            "mount"), "root")
        rig.rigid(W.grp(C.box("apex", 4.4, 3.8, 5.0, m["oak"], bevel=0.5, loc=(0, y, az - 0.2)), "mount"), "root")
        rig.rigid(W.grp(C.box("strap", 5.0, 4.2, 1.2, m["iron"], bevel=0.25, loc=(0, y, az + 2.4)), "mount"), "root")
        rig.rigid(W.grp(C.tube("tie", [(-7.5, y, 27.0), (7.5, y, 27.0)], [1.0, 1.0], m["oak"], seg=6), "mount"), "root")
    for x in (-10.0, 10.0):
        rig.rigid(W.grp(C.box("crosstie", 2.4, 22.0, 2.4, m["oak"], bevel=0.4, loc=(x, 1.5, 15.0)), "mount"), "root")
    rig.rigid(W.grp(C.cyl("axle", 1.3, 1.3, 26.0, m["iron"], seg=12, loc=(ax, -11.5, az), rot=(-math.pi / 2, 0, 0)), "mount"), "root")
    # a winch at the back to haul the arm down
    rig.rigid(W.grp(C.cyl("winch", 2.2, 2.2, 18.0, m["oak_lt"], seg=14, loc=(-12.0, -7.5, 14.0), rot=(-math.pi / 2, 0, 0)), "mount"), "root")
    for y in (-8.5, 11.5):
        rig.rigid(W.grp(C.tube("spoke", [(-12.0, y - 1.4 if y < 0 else y + 1.4, 14.0), (-12.0, y - 1.4 if y < 0 else y + 1.4, 20.0)],
                               [0.6, 0.6], m["oak"], seg=6), "mount"), "root")

    # the throwing arm (built along +X from the axle), a hinged painted counterweight, the sling
    arm = [C.tube("arm", [(-TB_SHORT - 2.0, 1.5, az), (0, 1.5, az), (TB_LONG * 0.5, 1.5, az), (TB_LONG, 1.5, az)],
                  [2.2, 2.4, 1.8, 1.2], m["oak"], seg=10, sharp=40)]
    for x in (-6.0, 5.0, 16.0):
        arm.append(C.lathe("armband", [(2.2, -0.5), (2.6, 0.0), (2.2, 0.5)], m["iron"], seg=12, loc=(x, 1.5, az), rot=(0, math.pi / 2, 0)))
    arm.append(C.box("hub", 5.2, 6.0, 5.2, m["oak"], bevel=0.6, loc=(0, 1.5, az)))
    arm.append(C.tube("hook", [(TB_LONG - 0.5, 1.5, az), (TB_LONG + 1.8, 1.5, az + 0.6), (TB_LONG + 2.6, 1.5, az + 2.2)],
                      [0.5, 0.4, 0.3], m["iron"], seg=6))
    for o in arm:
        rig.rigid(W.grp(o, "head"), "arm")
    # the counterweight box hangs from a hinge pin at the short end (its own bone keeps it vertical)
    hx = -TB_SHORT
    cw = [C.box("cwbox", 11.0, 10.0, 11.5, m["oak"], bevel=0.6, loc=(hx, 1.5, az - 8.2)),
          C.box("cwpaint", 11.4, 10.4, 7.0, m["paint"], bevel=0.5, loc=(hx, 1.5, az - 8.6))]
    C.team(cw[1])
    for z in (az - 3.0, az - 13.6):
        cw.append(C.box("cwband", 11.8, 10.8, 1.1, m["iron"], bevel=0.25, loc=(hx, 1.5, z)))
    for sy in (-1, 1):
        cw.append(C.tube("cwhanger", [(hx, 1.5 + sy * 4.6, az - 2.8), (hx, 1.5 + sy * 3.0, az)], [0.5, 0.5], m["iron"], seg=6))
    stones = C.blobs("cwstones", [((hx + rx, 1.5 + ry, az - 2.4), (2.4, 2.0, 1.6)) for rx, ry in ((-2.5, -2.0), (2.0, 1.5), (0.0, -0.5), (2.5, -2.5))],
                     m["ash2"], res=0.5)
    cw.append(stones)
    for o in cw:
        rig.rigid(W.grp(o, "head"), "cw")
    # the sling: two ropes and a leather pouch with a round stone, on a bone at the arm tip
    tip = (TB_LONG + 2.6, 1.5, az + 2.2)
    sl = [C.tube("slingrope", [tip, (tip[0] + 6.0, 1.5 - 1.2, az + 2.0), (tip[0] + 12.0, 1.5 - 1.4, az + 1.2)], [0.3] * 3, m["rope"], seg=6),
          C.tube("slingrope2", [tip, (tip[0] + 6.0, 1.5 + 1.2, az + 2.0), (tip[0] + 12.0, 1.5 + 1.4, az + 1.2)], [0.3] * 3, m["rope"], seg=6),
          C.blobs("pouch", [((tip[0] + 13.2, 1.5, az + 1.0), (2.8, 2.4, 1.6))], m["leather"], res=0.35)]
    for o in sl:
        rig.rigid(W.grp(o, "head"), "sling")
    stone = C.blobs("shot", [((tip[0] + 13.2, 1.5, az + 2.6), (2.9, 2.7, 2.7))], M.stone("#9c9484", "#7c7466", name="shot", bump=1.0),
                    res=0.35)
    C.displace(stone, 0.4, 1.0)
    rig.rigid(W.grp(stone, "head"), "sling")
    ctx["stone"] = [stone]
    ctx["winch_rope"] = []


def _tb(arm, sling, cw_swing=0.0):
    """Arm angle (deg, CCW from +X), sling angle relative to the arm, counterweight swing."""
    return {"arm": arm, "sling": sling, "cw": -arm + cw_swing}


def trebuchet_idle(ctx, t):
    _show(ctx["stone"], True)
    w = math.sin(2 * math.pi * t / 1020.0)
    return _tb(TB_COCK + 0.8 * w, 108.0 + 2.0 * w, 1.2 * w)


def trebuchet_fire(ctx, t):
    _show(ctx["stone"], t < 50 or t >= 290)
    k = B.keyed([(0, {"a": TB_COCK - 3.0, "s": 110.0, "c": 0.0}), (60, {"a": -262.0, "s": -40.0, "c": 18.0}),
                 (110, {"a": -312.0, "s": -8.0, "c": 26.0}), (190, {"a": -292.0, "s": -128.0, "c": -14.0}),
                 (290, {"a": -300.0, "s": -150.0, "c": 6.0}), (420, {"a": -298.0, "s": -150.0, "c": 0.0})], t)
    return _tb(k["a"], k["s"], k["c"])


# ------------------------------------------------------------------------------ Honk Ballista
HB_Z = 33.0


def goose(m, x0, y0, z0, name="goose"):
    """A domestic grey-white goose sitting in the groove, neck up, looking at the enemy."""
    white = M.feather("#e4e0d6", name="goosewhite")
    grey = M.feather("#aaa394", name="goosegrey")
    beak = C.mat("beak", "#c28a52", rough=0.4, noise=0.08, nscale=1.0, bump=0.1, coat=0.3)
    nail = M.dark("#2a2420", name="nail")
    eye = M.eye("gooseeye")
    P = lambda x, y, z: (x0 + x, y0 + y, z0 + z)
    out = []
    body = C.blobs(name + "body", [(P(0, 0, 0), (8.2, 5.2, 4.6)), (P(-6.4, 0, 1.4), (3.4, 3.4, 2.4), (0, 0.4, 0)),
                                   (P(4.6, 0, 0.6), (4.4, 4.4, 4.2)), (P(-1, 0, -2.6), (6.4, 4.4, 2.2))], white, res=0.3)
    C.displace(body, 0.2, 1.4)
    out.append(body)
    for sy in (-1, 1):
        wg = C.blobs(name + "wing", [(P(-1.4, sy * 4.2, 1.6), (6.8, 1.4, 2.9), (0.0, -0.12, 0)),
                                     (P(-6.8, sy * 3.2, 2.8), (3.0, 1.1, 1.5), (0.0, -0.4, 0))], grey, res=0.25)
        C.displace(wg, 0.2, 1.6)
        out.append(wg)
    neck = C.tube(name + "neck", [P(5.6, 0, 2.4), P(7.6, 0, 6.8), P(7.6, 0, 11.0), P(8.8, 0, 13.4)], [2.4, 1.8, 1.6, 1.7], white, seg=12)
    out.append(neck)
    head = C.blobs(name + "head", [(P(9.6, 0, 14.2), (2.7, 2.0, 2.1)), (P(11.2, 0, 13.8), (1.5, 1.5, 1.4))], white, res=0.2)
    out.append(head)
    out.append(C.lathe(name + "beak", [(1.25, 0.0), (1.0, 1.8), (0.55, 3.4), (0.0, 4.0)], beak, seg=12, scale=(1.0, 0.8, 1.0),
                       loc=P(11.6, 0, 13.6), rot=(0, math.radians(97), 0)))
    out.append(C.sphere(name + "nail", 0.45, nail, loc=P(15.4, 0, 13.2), scale=(1, 0.8, 0.6)))
    for sy in (-1, 1):
        out.append(C.sphere(name + "eye", 0.5, eye, loc=P(10.4, sy * 1.55, 14.9)))
        out.append(C.blobs(name + "brow", [(P(10.5, sy * 1.6, 15.8), (1.1, 0.35, 0.3), (0, -0.35, 0))], grey, res=0.12))
    out.append(C.blobs(name + "feet", [(P(1.0, -3.0, -4.6), (2.4, 1.6, 0.6)), (P(1.0, 3.0, -4.6), (2.4, 1.6, 0.6))], beak, res=0.2))
    return out


def ballista_build(rig, m, ctx):
    plinth(rig, m, w=32, d=24, h=9, seed=11)
    oak_post(rig, m, 28.0)
    pennant(rig, m, -14.0, 10.0, 9.0, h=40)
    # a wicker crate of geese at the back (spare ammunition)
    wick = M.straw("#9c8458", name="wicker")
    rig.rigid(W.grp(C.box("crate", 10.0, 9.0, 8.0, wick, bevel=0.8, loc=(-10.5, -5.0, 13.2)), "mount"), "root")
    rig.rigid(W.grp(C.box("cratelid", 10.6, 9.6, 1.0, M.wood("#7a6450", "#5a4a3c", name="lid"), bevel=0.3, loc=(-10.5, -5.0, 17.6)),
                    "mount"), "root")
    # a goose head peeks out of the crate (only the head and neck are kept)
    import bpy
    for i, o in enumerate(goose(m, -12.5, -6.0, 13.0, name="spare")):
        if 3 <= i <= 10:
            rig.rigid(W.grp(o, "mount"), "root")
        else:
            bpy.data.objects.remove(o)

    H = [C.box("fork", 4.2, 5.4, 3.4, m["iron"], bevel=0.4, loc=(0, 1.5, 29.8)),
         C.box("case", 36.0, 4.2, 3.2, m["oak"], bevel=0.6, loc=(0.5, 1.5, HB_Z)),
         C.box("slider", 22.0, 3.0, 1.4, m["oak_lt"], bevel=0.3, loc=(2.0, 1.5, HB_Z + 2.2))]
    # the torsion frame (capitulum): two painted oak stiles, top and bottom rails, iron washers
    fx = 14.0
    for y in (-8.5, 11.5):
        H.append(C.box("stile", 3.2, 3.2, 17.0, m["paint"], bevel=0.4, loc=(fx, y, HB_Z + 1.0)))
        C.team(H[-1])
    for z in (HB_Z - 7.6, HB_Z + 9.6):
        H.append(C.box("rail", 4.0, 24.0, 3.0, m["paint"], bevel=0.45, loc=(fx, 1.5, z)))
        C.team(H[-1])
    for y in (-4.6, 7.6):
        H.append(C.cyl("skein", 1.9, 1.9, 14.4, M.rope("#6a5a44", name="sinew"), seg=12, loc=(fx, y, HB_Z - 6.2)))
        for z in (HB_Z - 9.6, HB_Z + 11.2):
            H.append(C.cyl("washer", 2.6, 2.6, 1.2, m["brass"], seg=16, loc=(fx, y, z)))
            H.append(C.box("key", 5.4, 0.8, 0.8, m["iron"], bevel=0.15, loc=(fx, y, z + (0.9 if z > HB_Z else -0.2))))
    # the winch at the butt
    H.append(C.cyl("winch", 1.8, 1.8, 11.0, m["oak_lt"], seg=12, loc=(-15.5, -4.0, HB_Z + 0.2), rot=(-math.pi / 2, 0, 0)))
    for y in (-4.4, 7.4):
        for a in (0.0, 1.2):
            H.append(C.tube("handspike", [(-15.5, y, HB_Z + 0.2), (-15.5 + 5.5 * math.cos(a + 1.0), y, HB_Z + 0.2 + 5.5 * math.sin(a + 1.0))],
                            [0.45, 0.4], m["oak"], seg=6))
    H.append(C.box("claw", 2.6, 2.4, 2.0, m["iron"], bevel=0.3, loc=(-5.0, 1.5, HB_Z + 3.4)))
    for o in H:
        rig.rigid(W.grp(o, "head"), "head")

    def arms(tag, sweep):
        out = []
        for sy, y in ((-1, -4.6), (1, 7.6)):
            tipy = y + sy * (13.0 - sweep * 0.6)
            out.append(C.tube(tag + "arm", [(fx, y, HB_Z + 1.0), (fx - 2.0 + sweep, y + sy * 6.0, HB_Z + 1.2), (fx - 6.0 + sweep * 1.6, tipy, HB_Z + 1.4)],
                              [1.3, 1.1, 0.8], m["oak"], seg=8))
        return out

    tipL, tipR = (fx - 6.0, -4.6 - 13.0, HB_Z + 1.4), (fx - 6.0, 7.6 + 13.0, HB_Z + 1.4)
    drawn = arms("d", 0.0) + [C.tube("string", [tipL, (-4.6, 1.5, HB_Z + 3.6), tipR], [0.35] * 3, m["rope"], seg=6)]
    tl2, tr2 = (fx - 6.0 + 4.0 * 1.6, -4.6 - (13.0 - 2.4), HB_Z + 1.4), (fx - 6.0 + 4.0 * 1.6, 7.6 + (13.0 - 2.4), HB_Z + 1.4)
    loose = arms("l", 4.0) + [C.tube("string_l", [tl2, (fx + 1.5, 1.5, HB_Z + 2.6), tr2], [0.35] * 3, m["rope"], seg=6)]
    for o in drawn + loose:
        rig.rigid(W.grp(o, "head"), "head")
    g = goose(m, 1.0, 1.5, HB_Z + 7.2)
    for o in g:
        rig.rigid(W.grp(o, "head"), "head")
    ctx.update(drawn=drawn, loose=loose, goose=g)


def ballista_idle(ctx, t):
    _show(ctx["drawn"], True)
    _show(ctx["loose"], False)
    _show(ctx["goose"], True)
    return {"head": 1.0 * math.sin(2 * math.pi * t / 1020.0)}


def ballista_fire(ctx, t):
    loose = 50 <= t < 280
    _show(ctx["drawn"], not loose)
    _show(ctx["loose"], loose)
    _show(ctx["goose"], not loose)
    k = B.keyed([(0, {"r": -1.5, "x": 0.5}), (60, {"r": 4.0, "x": -2.4}), (110, {"r": 2.6, "x": -1.8}), (190, {"r": 0.6, "x": -0.4}),
                 (290, {"r": 0.0, "x": 0.0}), (420, {"r": 0.0, "x": 0.0})], t)
    return {"head": dict(r=k["r"], loc=(k["x"], 0, 0))}


# ------------------------------------------------------------------------------ the list
TURRETS = [
    turret("crossbow_nest", "Crossbow Nest", 68.0, XB_PIV, {}, crossbow_build, crossbow_idle, crossbow_fire,
           ("head", (XB_NUT + 25.2, 1.5, XB_Z + 2.4)), aim=(-55, 40), fire_kind="recoil", hit_z=36.0,
           canvas=(132, 100), feet=(62, 9), scale=1.35),
    turret("pitch_cauldron", "Pitch Cauldron", 72.0, PC_PIV, {}, cauldron_build, cauldron_idle, cauldron_fire,
           ("head", (14.4, 1.5, 40.8)), aim=(0, 20), fire_kind="pour", hit_z=36.0, canvas=(132, 100), feet=(66, 9), scale=1.15),
    turret("trebuchet", "Trebuchet", 72.0, TB_AXLE,
           {"arm": (TB_AXLE, (TB_AXLE[0] + 4, TB_AXLE[1], TB_AXLE[2]), "head"),
            "cw": ((-TB_SHORT, 1.5, TB_AXLE[2]), (-TB_SHORT, 1.5, TB_AXLE[2] - 4), "arm"),
            "sling": ((TB_LONG + 2.6, 1.5, TB_AXLE[2] + 2.2), (TB_LONG + 6.6, 1.5, TB_AXLE[2] + 2.2), "arm")},
           trebuchet_build, trebuchet_idle, trebuchet_fire, ("sling", (TB_LONG + 15.8, 1.5, TB_AXLE[2] + 2.6)), aim=(0, 0),
           fire_kind="swing", hit_z=30.0, canvas=(150, 128), feet=(72, 9)),
    turret("honk_ballista", "Honk Ballista", 72.0, (0.0, 1.5, 30.0), {}, ballista_build, ballista_idle, ballista_fire,
           ("head", (16.5, 1.5, HB_Z + 20.8)), aim=(-55, 40), fire_kind="recoil", hit_z=36.0, canvas=(132, 100), feet=(62, 9),
           scale=1.3),
]
