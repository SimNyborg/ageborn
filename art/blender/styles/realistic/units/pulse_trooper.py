"""Pulse Trooper: Future ranged soldier, realistic-miniature style.

A lean soldier in a charcoal undersuit with team-painted hard armour (helmet, chest,
pauldrons, shin guards), a mint visor, a backpack cell and a long plasma rifle whose
magenta coils charge before each shot.
"""
import math

from lib import biped as B
from lib import core as C
from lib import pipe as P
from lib import props

SLUG = "pulse_trooper"
H = 70.0
CANVAS = (150, 104)
FEET = (74, 9)
YAW = -24.0

BODY = B.Biped(H=H, bulk=1.0)
FIST = (0.36, -2.4)          # fist centre relative to the wrist, hand hanging down (68-lu units)


def build():
    k = BODY.k
    suit = C.mat("suit", "#2e3138", rough=0.7, noise=0.1, nscale=1.2, bump=0.35, sheen=0.4)
    plate = C.mat("team_plate", "#999999", rough=0.32, noise=0.06, nscale=0.4, bump=0.08,
                  coat=0.6, team=True)
    gun = C.mat("gunmetal", "#3c4047", rough=0.35, metal=0.9, noise=0.12, nscale=0.8, bump=0.1)
    dark = C.mat("darkpoly", "#1e2025", rough=0.5, noise=0.08, nscale=1.0, bump=0.15)
    steel = C.mat("steel", "#8d939b", rough=0.25, metal=1.0, noise=0.1, nscale=1.0, bump=0.05)
    visor = C.mat("visor", "#123a31", rough=0.08, coat=1.0, emission="#3AF0B4", estrength=2.5,
                  noise=0.0, bump=0)
    mint = C.emit_mat("mint_glow", "#3AF0B4", 5.0)
    magenta = C.emit_mat("magenta_glow", "#F03AA8", 6.0)

    rig = C.Rig("trooper_rig", BODY.bones(), yaw_deg=YAW)
    BODY.body(rig, suit, parts=("torso", "arms", "legs"))
    S = lambda x, y, z: (x * k, y * k, z * k)
    sw, hw = BODY.sw / k, BODY.hw / k

    # --- helmet (team shell), visor, neck seal, face shadow
    head = C.blobs("head", [((0.6 * k, 0, 63.8 * k), (4.4 * k, 3.7 * k, 4.3 * k)),
                            ((2.4 * k, 0, 61.2 * k), (2.6 * k, 2.8 * k, 2.7 * k))], dark)
    rig.rigid(head, "head")
    helm = C.blobs("helmet", [
        (S(0.3, 0, 64.6), (5.2, 4.5, 4.6)),
        (S(-1.6, 0, 61.8), (3.8, 4.4, 3.8)),
        (S(3.6, 0, 66.2), (2.2, 3.4, 1.6)),
        (S(0.0, -4.0, 62.4), (2.4, 1.2, 2.6)),
        (S(0.0, 4.0, 62.4), (2.4, 1.2, 2.6)),
    ], plate, res=0.4)
    C.team(helm)
    rig.rigid(helm, "head")
    vis = C.blobs("visor", [(S(4.0, 0, 62.9), (1.6, 3.4, 1.25))], visor, res=0.35)
    rig.rigid(vis, "head")
    crest = C.box("crest", 7.0 * k, 0.9 * k, 1.1 * k, dark, bevel=0.25 * k, loc=S(-0.2, 0, 69.2))
    rig.rigid(crest, "head")
    ant = C.tube("antenna", [S(-3.0, 3.6, 64.0), S(-4.4, 3.8, 72.0)], [0.35 * k, 0.18 * k], steel, seg=6)
    rig.rigid(ant, "head")

    # --- chest and back armour
    chest = C.blobs("chestplate", [
        (S(1.6, 0, 48.4), (4.1, 6.6, 6.4)),
        (S(2.6, -3.1, 50.6), (2.9, 3.6, 3.0)),
        (S(2.6, 3.1, 50.6), (2.9, 3.6, 3.0)),
        (S(1.8, 0, 42.4), (3.4, 5.6, 2.8)),
        (S(-1.6, 0, 49.0), (3.4, 6.6, 6.0)),
    ], plate, res=0.45)
    C.team(chest)
    rig.skin(chest, ["spine", "chest"], soft=3.0 * k)
    pack = C.box("backpack", 6.0 * k, 10.0 * k, 12.5 * k, dark, bevel=1.0 * k, loc=S(-7.4, 0, 48.6))
    rig.rigid(pack, "chest")
    cell = C.cyl("cell", 1.5 * k, 1.5 * k, 8.0 * k, mint, loc=S(-10.8, -2.4, 44.6))
    rig.rigid(cell, "chest")
    for z in (45.0, 49.0, 53.0):
        rig.rigid(C.box("strap", 1.2 * k, 11.0 * k, 0.9 * k, gun, bevel=0.2 * k, loc=S(-10.6, 0, z)),
                  "chest")
    belt = C.blobs("belt", [(S(-0.2, 0, 38.0), (4.8, 6.6, 1.5))], dark)
    rig.skin(belt, ["hips", "spine"], soft=2 * k)
    for y in (-4.2, 4.2):
        rig.rigid(C.box("pouch", 3.2 * k, 2.4 * k, 3.4 * k, dark, bevel=0.5 * k, loc=S(2.8, y, 37.0)),
                  "hips")

    # --- pauldrons, forearm guards, gloves
    for s, y in (("F", -sw), ("B", sw)):
        sgn = -1 if s == "F" else 1
        pa = C.blobs("pauldron_" + s, [(S(0.2, y + sgn * 0.6, 55.0), (3.9, 3.6, 3.0)),
                                       (S(0.2, y + sgn * 1.0, 52.6), (3.5, 3.2, 1.8))], plate, res=0.4)
        C.team(pa)
        rig.skin(pa, ["upperarm_" + s], soft=2 * k)
        fg = C.blobs("vambrace_" + s, [(S(0.4, y, 38.4), (2.6, 2.5, 3.6))], gun, res=0.4)
        rig.skin(fg, ["forearm_" + s], soft=2 * k)
        gl = C.blobs("glove_" + s, [(S(0.36, y, 31.0), (1.9, 1.55, 2.6))], dark, res=0.35)
        rig.rigid(gl, "hand_" + s)
        hy = sgn * hw
        th = C.blobs("thighplate_" + s, [(S(1.6, hy, 27.5), (2.6, 3.8, 4.6))], gun, res=0.4)
        rig.skin(th, ["thigh_" + s], soft=2 * k)
        sh = C.blobs("shin_" + s, [(S(1.1, hy, 11.5), (2.2, 2.7, 6.4)), (S(1.2, hy, 18.8), (2.5, 2.8, 2.2))],
                     plate, res=0.4)
        C.team(sh)
        rig.skin(sh, ["shin_" + s], soft=2 * k)
        boot = C.blobs("boot_" + s, [(S(0.2, hy, 4.2), (2.5, 2.4, 3.0)), (S(3.4, hy, 1.7), (4.9, 2.4, 1.8))],
                       dark, res=0.45)
        rig.skin(boot, ["shin_" + s, "foot_" + s], soft=1.0 * k, bias={"shin_" + s: 1.0 * k})

    # --- plasma rifle along +X from the near fist
    fist = (FIST[0] * k, -BODY.sw, (B.WRIST * 68 + FIST[1]) * k)
    parts = []
    parts.append(C.box("receiver", 18 * k, 2.6 * k, 4.4 * k, gun, bevel=0.6 * k, loc=(2.5 * k, 0, 2.8 * k)))
    parts.append(C.box("stock", 9 * k, 2.2 * k, 3.2 * k, dark, bevel=0.7 * k, loc=(-10.5 * k, 0, 2.2 * k),
                       rot=(0, math.radians(-6), 0)))
    parts.append(C.box("grip", 2.0 * k, 1.8 * k, 4.0 * k, dark, bevel=0.5 * k, loc=(0.2 * k, 0, 0.2 * k),
                       rot=(0, math.radians(-14), 0)))
    parts.append(C.box("mag", 3.0 * k, 2.0 * k, 3.6 * k, dark, bevel=0.4 * k, loc=(6.0 * k, 0, 0.0)))
    parts.append(C.box("scope", 5.5 * k, 1.4 * k, 1.5 * k, dark, bevel=0.4 * k, loc=(3.0 * k, 0, 5.8 * k)))
    parts.append(C.tube("barrel", [(11 * k, 0, 3.4 * k), (28 * k, 0, 3.4 * k)], [1.0 * k, 0.85 * k], steel, seg=12))
    parts.append(C.box("shroud", 8 * k, 2.2 * k, 2.6 * k, gun, bevel=0.5 * k, loc=(15.5 * k, 0, 3.4 * k)))
    coils = []
    for x in (20.5, 23.0, 25.5):
        c = C.lathe("coil", [(1.25 * k, -0.45 * k), (1.55 * k, 0), (1.25 * k, 0.45 * k)], C.emit_mat("coil_glow", "#F03AA8", 6.0),
                    seg=16, rot=(0, math.pi / 2, 0), loc=(x * k, 0, 3.4 * k))
        coils.append(c)
    parts += coils
    parts.append(C.cyl("gcell", 0.9 * k, 0.9 * k, 5 * k, mint, rot=(0, math.pi / 2, 0),
                       loc=(0.5 * k, -1.5 * k, 3.4 * k)))
    for o in parts:
        C.xform(o, loc=fist)
        rig.rigid(o, "hand_F")
    # muzzle flash and bolt (shown on the fire frame only)
    flash = [C.sphere("flash", 2.6 * k, magenta, loc=(30.5 * k, 0, 3.4 * k), scale=(1.5, 1, 1)),
             C.sphere("flash2", 1.6 * k, C.emit_mat("flash_core", "#fff4fb", 12.0),
                      loc=(30.0 * k, 0, 3.4 * k), scale=(1.3, 1, 1)),
             C.tube("bolt", [(33 * k, 0, 3.4 * k), (52 * k, 0, 3.4 * k)], [0.2 * k, 1.1 * k], magenta, seg=10)]
    for o in flash:
        C.xform(o, loc=fist)
        rig.rigid(o, "hand_F")
        o.hide_render = True
    dust = props.dust_cloud("dust", k, color="#9a968e")
    return dict(rig=rig, flash=flash, coils=coils, dust=dust)


# ------------------------------------------------------------------------------ poses
G = B.ANKLE * H


def rifle(P_, fist_rel, ang, abduct=-18):
    """Both hands on the rifle: near fist at shoulder + fist_rel, rifle at `ang` deg from +X."""
    k = BODY.k
    sh = BODY.fk(P_)["shoulder"]
    fist = (sh[0] + fist_rel[0], sh[1] + fist_rel[1])
    off = C.rot2((FIST[0] * k, FIST[1] * k), math.radians(ang))
    P_["handF"] = ((fist[0] - off[0], fist[1] - off[1]), ang)
    fg = C.rot2((14.5 * k, 0.0), math.radians(ang))
    fgp = (fist[0] + fg[0], fist[1] + fg[1] - 0.8 * k)
    P_["handB"] = ((fgp[0] - off[0], fgp[1] - off[1]), ang)
    P_["abductB"] = abduct
    return P_


def stance(b=0.0, shift=0.0):
    return dict(root=(0.0, -0.8 - 0.25 * b), root_dy=shift, hips=3, spine=2 + 0.8 * b, chest=1 - 0.6 * b,
                neck=-2, head=-1 - 0.6 * b, footF=(8.0, G, 0.0), footB=(-8.5, G, 0.0))


def pose(ctx, clip, t):
    rig = ctx["rig"]
    props.dust_state(ctx["dust"], None)
    fire = False
    glow = 1.0
    if clip == "idle":
        a = 2 * math.pi * t / 8.0
        P_ = stance(math.sin(a), 0.8 * math.sin(a + 0.8))
        P_["head"] += 3 * math.sin(a * 0.5)
        rifle(P_, (7.0, -13.0 + 0.4 * math.sin(a - 0.5)), -32 + 1.5 * math.sin(a - 0.9))
    elif clip == "walk":
        P_ = walk(t / 12.0)
    elif clip == "attack":
        P_, fire, glow = attack(t)
    elif clip == "hit":
        P_ = hit(t)
    else:
        P_ = die(t)
        props.dust_state(ctx["dust"], None if t < 4.9 else (t - 4.9) / 6.0,
                         origin=(-22 * BODY.k, 0, 0), rig=rig.obj)
    for o in ctx["flash"]:
        o.hide_render = not fire
    for c in ctx["coils"]:
        c.data.materials[0].node_tree.nodes["Emission"].inputs["Strength"].default_value = 6.0 * glow
    BODY.apply(rig, P_)


def walk(ph):
    stride, lift = 25.0, 3.6
    fF = B.walk_feet(ph, stride, lift, ground=G)
    fB = B.walk_feet(ph + 0.5, stride, lift, ground=G)
    c2 = math.cos(4 * math.pi * (ph - 0.06))
    s1 = math.sin(2 * math.pi * ph)
    P_ = dict(root=(1.0, -1.0 - 1.1 * c2), root_dy=0.9 * math.cos(2 * math.pi * ph),
              hips=4 + 1.0 * c2, twist=5 * s1, spine=3, chest=1 - 0.8 * c2, neck=-3, head=-1 + 1.2 * c2,
              footF=fF, footB=fB)
    return rifle(P_, (7.5, -12.5 + 0.6 * c2), -26 + 1.5 * c2)


def _aim(P_, recoil=0.0, up=0.0):
    return rifle(P_, (9.0 - 3.2 * recoil, -3.2 + 1.2 * recoil), 0.0 + up)


def attack(t):
    ready = stance()
    aim = dict(root=(0.5, -1.4), hips=2, spine=-1, chest=-2, neck=-3, head=-4,
               footF=(9.0, G, 0.0), footB=(-9.5, G, 0.0))
    kick = dict(aim, root=(-1.8, -1.0), hips=-2, spine=-5, chest=-6, head=-1)
    # t: 0 ready, 1.5 aim, 3 hold (charge), 4 fire, 5 recoil, 7.5 settle aim, 11 ready
    if t <= 1.5:
        u = B.ease_in_out(t / 1.5)
        P_ = B.lerp_pose(ready, aim, u)
        rifle(P_, (B.lerp(7.0, 9.0, u), B.lerp(-13.0, -3.2, u)), B.lerp(-32, 0, u))
        return P_, False, 1.0 + u
    if t < 4.0:
        P_ = dict(aim)
        return _aim(P_), False, 2.0 + (t - 1.5) * 0.8
    if t < 5.0:
        u = t - 4.0
        P_ = B.lerp_pose(aim, kick, B.ease_out(u))
        return _aim(P_, recoil=B.ease_out(u), up=9 * B.ease_out(u)), u < 0.5, 4.0 if u < 0.5 else 1.0
    if t < 7.5:
        u = B.ease_in_out((t - 5.0) / 2.5)
        P_ = B.lerp_pose(kick, aim, u)
        return _aim(P_, recoil=1 - u, up=9 * (1 - u)), False, 0.4 + 0.6 * u
    u = B.ease_in_out(min(1.0, (t - 7.5) / 3.5))
    P_ = B.lerp_pose(aim, ready, u)
    rifle(P_, (B.lerp(9.0, 7.0, u), B.lerp(-3.2, -13.0, u)), B.lerp(0, -32, u))
    return P_, False, 1.0


def hit(t):
    base = stance()
    knock = dict(root=(-4.5, -2.0), hips=-9, spine=-9, chest=-7, neck=7, head=12,
                 footF=(6.0, G + 1.0, 10.0), footB=(-11.0, G, 0.0))
    keys = [(0, base), (1, knock), (2.2, dict(knock, root=(-3.6, -2.4), head=5)), (4, base)]
    P_ = B.keyed(keys, t)
    w = max(0.0, 1 - abs(t - 1.2) / 2.5)
    return rifle(P_, (7.0 - 3 * w, -13.0 + 4 * w), -32 + 30 * w)


def die(t):
    pz = B.PELV * H
    base = stance()
    base["pel"] = (0.0, pz + base.pop("root")[1])
    base.update(absF=(26, 70, -32), absB=(24, 80, -32, -18))
    k1 = dict(pel=(-4.0, pz - 2.0), hips=-10, spine=-12, chest=-8, neck=10, head=16,
              footF=(6.0, G + 1.0, 10.0), footB=(-11.0, G, 0.0), absF=(10, 60, 30), absB=(-20, 20, 0, -14))
    k2 = dict(pel=(-8.0, pz - 11.0), root_r=12, hips=-10, spine=-8, chest=-6, neck=6, head=10,
              footF=(6.0, G, 8.0), footB=(-9.0, G, 0.0), absF=(80, 120, 90, 14), absB=(60, 90, 0, -20))
    k3 = dict(pel=(-15.0, pz - 21.0), root_r=46, hips=-6, spine=-4, chest=-4, neck=4, head=8,
              footF=(5.0, G + 1.0, 20.0), footB=(-2.0, G + 2.0, 20.0), absF=(150, 170, 120, 24),
              absB=(150, 170, 0, -24))
    land = dict(pel=(-20.0, 6.0), root_r=86, hips=-4, spine=0, chest=0, neck=0, head=4,
                footF=(1.0, G + 5.0, 60.0), footB=(-4.0, G + 3.0, 50.0), absF=(250, 262, 175, 30),
                absB=(244, 262, 0, -30))
    bounce = dict(land, pel=(-20.5, 7.6), root_r=80, neck=-6, head=-10, absF=(240, 250, 170, 34),
                  footF=(1.0, G + 7.0, 60.0))
    rest = dict(land, pel=(-20.8, 5.6), root_r=87, neck=2, head=6, footF=(4.0, G + 3.0, 70.0),
                footB=(0.0, G + 2.0, 60.0), absF=(256, 264, 180, 30))
    keys = [(0, base), (1, k1), (2.5, k2), (4.0, k3), (5.0, land), (5.8, bounce), (7, rest), (11, rest)]
    return B.keyed(keys, t)


def clips():
    return [
        P.Clip("idle", range(8), [150] * 8),
        P.Clip("walk", range(12), [80] * 12),
        P.Clip("attack", [0, 0.75, 1.5, 3.0, 4.0, 4.5, 5.0, 5.8, 6.6, 7.5, 8.5, 9.5, 10.5, 11],
               [60, 60, 70, 150, 50, 50, 70, 70, 70, 80, 70, 70, 70, 80], loop=False,
               blur={5: 0.25}, impact=4),
        P.Clip("hit", [0, 0.8, 1.6, 2.6, 3.6], [60, 80, 80, 90, 90], loop=False),
        P.Clip("die", [0, 1, 2, 3, 4, 5, 5.8, 6.6, 7.4, 8.4, 9.6, 11],
               [70, 70, 70, 70, 70, 80, 80, 90, 100, 110, 120, 200], loop=False,
               blur={3: 0.2, 4: 0.2}),
    ]
