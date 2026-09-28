"""Bonker: Stone Age club warrior, realistic-miniature style.

A stocky hunter in a team-dyed hide vest and kilt under a natural fur mantle, bare arms and
legs with leather wraps, shaggy hair and beard, and a heavy knotted club set with flints.
"""
import math

from lib import biped as B
from lib import core as C
from lib import pipe as P
from lib import props

SLUG = "bonker"
H = 66.0
CANVAS = (136, 108)       # lu
FEET = (74, 9)            # lu from the left / bottom
YAW = -24.0

BODY = B.Biped(H=H, bulk=1.06)


def build():
    k = BODY.k
    skin = C.mat("skin", "#9c7862", rough=0.5, noise=0.07, nscale=0.6, bump=0.12)
    hair = C.mat("hair", "#3b312b", rough=0.75, noise=0.25, nscale=1.4, bump=0.9)
    fur = C.mat("fur", "#76624f", rough=0.95, noise=0.32, nscale=1.1, bump=1.0, ramp2="#4f4236",
                sheen=0.6)
    leather = C.mat("leather", "#5a4a3e", rough=0.55, noise=0.14, nscale=0.9, bump=0.35)
    wood = C.mat("wood", "#6b5847", rough=0.72, noise=0.18, nscale=0.5, bump=0.6, stripes=1.6,
                 ramp2="#4e4035")
    flint = C.mat("flint", "#8b8a86", rough=0.35, noise=0.28, nscale=1.2, bump=0.4, spec=0.7)
    bone = C.mat("bone", "#d8cdb5", rough=0.5, noise=0.12, nscale=1.0, bump=0.2)
    hide = C.mat("team_hide", "#999999", rough=0.8, noise=0.16, nscale=0.9, bump=0.45, team=True,
                 sheen=0.3)
    dark = C.mat("eye", "#1c1714", rough=0.4, noise=0.0, bump=0)

    rig = C.Rig("bonker_rig", BODY.bones(), yaw_deg=YAW)
    body = BODY.body(rig, skin)
    S = lambda x, y, z: (x * k, y * k, z * k)
    bw = BODY.bulk

    # --- team-dyed hide vest over the torso and a kilt (the big team read)
    vest = C.blobs("vest", [
        (S(0.3, 0, 41.2), (4.6 * bw, 6.3 * bw, 6.0)),
        (S(-0.2, 0, 47.8), (5.3 * bw, 7.3 * bw, 6.8)),
        (S(2.1, -3.2, 50.2), (3.2, 3.9, 2.9)),
        (S(2.1, 3.2, 50.2), (3.2, 3.9, 2.9)),
        (S(-2.0, 0, 49.0), (3.4, 6.8 * bw, 5.6)),
    ], hide)
    C.displace(vest, 0.35, 1.2)
    C.team(vest)
    rig.skin(vest, ["hips", "spine", "chest"], soft=2.0 * k)
    kilt = C.blobs("kilt", [
        (S(-0.2, 0, 36.6), (5.4 * bw, 7.2 * bw, 3.2)),
        (S(0.0, 0, 33.0), (6.0 * bw, 7.8 * bw, 4.0)),
        (S(0.2, 0, 30.0), (6.3 * bw, 8.1 * bw, 2.0)),
    ], hide)
    C.displace(kilt, 0.6, 0.9)
    C.team(kilt)
    rig.skin(kilt, ["hips", "thigh_F", "thigh_B"], soft=3.0 * k,
             bias={"thigh_F": 1.2 * k, "thigh_B": 1.2 * k})
    belt = C.blobs("belt", [(S(-0.1, 0, 37.6), (5.6 * bw, 7.45 * bw, 1.1))], leather)
    rig.skin(belt, ["hips", "spine"], soft=2.0 * k)
    # bone toggle on the belt
    rig.rigid(C.sphere("toggle", 1.1 * k, bone, loc=S(5.6 * bw, -2.5, 37.8), scale=(0.6, 1, 1.4)),
              "hips")

    # --- fur mantle over the shoulders and upper back
    mantle = C.blobs("mantle", [
        (S(-1.2, 0, 54.0), (4.4, 9.4 * bw, 3.0)),
        (S(-3.0, 0, 50.0), (3.0, 8.2 * bw, 5.0)),
        (S(1.2, -5.8, 54.4), (3.0, 3.0, 2.4)),
        (S(1.2, 5.8, 54.4), (3.0, 3.0, 2.4)),
        (S(-3.6, 0, 45.6), (2.2, 6.4 * bw, 2.8)),
    ], fur, res=0.5)
    C.displace(mantle, 1.2, 0.55)
    rig.skin(mantle, ["spine", "chest", "neck"], soft=2.0 * k)

    # --- hair and beard
    hair_o = C.blobs("hair", [
        (S(-0.4, 0, 65.2), (4.9, 4.3, 3.9)),
        (S(-2.6, 0, 62.4), (3.2, 4.1, 4.2)),
        (S(-3.6, 0, 59.2), (2.6, 3.6, 3.2)),
        (S(1.8, 0, 66.6), (3.0, 3.6, 2.0)),
        (S(-1.0, -3.3, 62.6), (2.2, 1.4, 3.2)),
        (S(-1.0, 3.3, 62.6), (2.2, 1.4, 3.2)),
    ], hair, res=0.45)
    C.displace(hair_o, 0.9, 0.35)
    rig.rigid(hair_o, "head")
    beard = C.blobs("beard", [
        (S(3.5, 0, 60.4), (2.2, 3.0, 2.4)),
        (S(4.0, 0, 58.6), (1.6, 2.1, 2.0)),
        (S(2.0, -2.2, 61.2), (1.8, 1.2, 2.2)),
        (S(2.0, 2.2, 61.2), (1.8, 1.2, 2.2)),
    ], hair, res=0.4)
    C.displace(beard, 0.6, 0.3)
    rig.rigid(beard, "head")
    for y in (-1.55, 1.55):
        rig.rigid(C.sphere("eye", 0.55 * k, dark, loc=S(4.25, y, 63.0), scale=(0.5, 1, 0.6)), "head")
    # team war-paint headband
    band = C.lathe("band", [(4.55 * k, 64.4 * k), (4.75 * k, 65.0 * k), (4.55 * k, 65.6 * k)], hide,
                   scale=(1.0, 0.92, 1.0), loc=(0.2 * k, 0, 0))
    C.team(band)
    rig.rigid(band, "head")

    # --- leather bracers and fur-wrapped shins / boots
    for s, y in (("F", -BODY.sw / k), ("B", BODY.sw / k)):
        br = C.blobs("bracer_" + s, [(S(0.3, y, 37.0), (2.6, 2.5, 3.1))], leather)
        rig.skin(br, ["forearm_" + s, "hand_" + s], soft=1.5 * k)
        hy = (-1 if s == "F" else 1) * BODY.hw / k
        wrap = C.blobs("wrap_" + s, [
            (S(-0.1, hy, 9.5), (2.8, 2.7, 5.6)),
            (S(-0.8, hy, 14.2), (3.4, 3.2, 3.0)),
        ], fur, res=0.5)
        C.displace(wrap, 0.45, 0.6)
        rig.skin(wrap, ["shin_" + s], soft=2 * k)
        boot = C.blobs("boot_" + s, [
            (S(0.2, hy, 3.8), (2.2, 2.1, 2.4)),
            (S(3.2, hy, 1.6), (4.6, 2.2, 1.7)),
        ], leather)
        rig.skin(boot, ["shin_" + s, "foot_" + s], soft=1.0 * k, bias={"shin_" + s: 1.0 * k})

    # --- the club: knotted hardwood, flint teeth, leather grip
    club = props.club(k, wood, flint, leather)
    # grip in the near fist (fist centre at the hand bone), club along +X
    fist = (0.35 * k, -BODY.sw, 31.0 * k)
    for o in club:
        C.xform(o, loc=fist)
        rig.rigid(o, "hand_F")

    return dict(rig=rig)


# ------------------------------------------------------------------------------ poses
G = B.ANKLE * H


def stance(breath=0.0, shift=0.0):
    return dict(
        root=(0.0, -1.4 - 0.3 * breath), root_dy=shift, hips=4, spine=3 + 1.2 * breath,
        chest=2 - 0.8 * breath, neck=-4, head=-3 - 0.8 * breath,
        footF=(9.0, G, 0.0), footB=(-10.0, G, 0.0),
        absF=(32 + 1.5 * breath, 84 - 2 * breath, 70), armB=(-6 - 2 * breath, 16, 4, -4),
    )


def pose(ctx, clip, t):
    rig = ctx["rig"]
    if clip == "idle":
        a = 2 * math.pi * t / 8.0
        P_ = stance(breath=math.sin(a), shift=0.9 * math.sin(a + 0.8))
        P_["hips"] += 1.2 * math.sin(a + 0.8)
        P_["absF"] = (P_["absF"][0] + 2.5 * math.sin(a - 0.6), P_["absF"][1] + 3 * math.sin(a - 1.0),
                      P_["absF"][2] + 3 * math.sin(a - 1.4))
    elif clip == "walk":
        P_ = walk(t / 12.0)
    elif clip == "attack":
        P_ = attack(t)
    elif clip == "hit":
        P_ = hit(t)
    else:
        P_ = die(t)
    BODY.apply(rig, P_)


def walk(ph):
    stride, lift = 27.0, 4.2
    fF = B.walk_feet(ph, stride, lift, ground=G)
    fB = B.walk_feet(ph + 0.5, stride, lift, ground=G)
    c2 = math.cos(4 * math.pi * (ph - 0.06))       # low on contact (0, 0.5), high on passing
    s1 = math.sin(2 * math.pi * ph)
    return dict(
        root=(1.2, -1.3 - 1.5 * c2), root_dy=1.1 * math.cos(2 * math.pi * ph),
        hips=5 + 1.5 * c2, twist=7 * s1, spine=4, chest=1.5 - 1.2 * c2, neck=-5, head=-3 + 1.5 * c2,
        footF=fF, footB=fB,
        # club rests on the near shoulder, bouncing a little with each step
        armF=(34 + 3 * c2, 118 - 4 * c2, -40, 8), armB=(24 * s1 - 4, 18 + 10 * max(0, s1), 6, -4),
    )


# attack keys (time in frames)
def _atk_keys():
    ready = stance()
    wind1 = dict(root=(-2.5, -1.0), hips=-4, spine=-7, chest=-8, neck=2, head=4,
                 footF=(10.0, G, 6.0), footB=(-11.0, G, 0.0),
                 absF=(150, 200, 150, 10), armB=(38, 30, 0, -8))
    wind2 = dict(root=(-4.0, -0.4), hips=-8, spine=-12, chest=-10, neck=4, head=6,
                 footF=(10.5, G + 1.5, 16.0), footB=(-11.5, G, 0.0),
                 absF=(168, 228, 196, 12), armB=(55, 34, 0, -10))
    smash = dict(root=(5.0, -6.0), hips=16, spine=12, chest=6, neck=-6, head=-5,
                 footF=(15.0, G, 0.0), footB=(-11.0, G + 0.5, -18.0),
                 absF=(120, 118, 70, 6), armB=(-30, 20, 4, -4))
    impact = dict(root=(7.5, -9.5), hips=20, spine=14, chest=8, neck=-10, head=-8,
                  footF=(16.0, G, 0.0), footB=(-11.0, G + 0.8, -22.0),
                  absF=(74, 80, -48, 4), armB=(-36, 22, 6, -4))
    rebound = dict(impact, root=(7.0, -8.6), hips=18, spine=12, absF=(78, 86, -36, 4))
    rec = dict(root=(3.0, -3.5), hips=10, spine=7, chest=4, neck=-6, head=-5,
               footF=(12.0, G, 0.0), footB=(-10.5, G, -4.0),
               absF=(46, 84, 30, 2), armB=(-14, 18, 4, -4))
    return [(0, ready), (1.2, wind1), (3.0, wind2), (3.6, wind2), (4.4, smash), (5.0, impact),
            (6.0, impact), (7.0, rebound), (9.0, rec), (13.0, ready)]


ATK = None


def attack(t):
    global ATK
    ATK = ATK or _atk_keys()
    return B.keyed(ATK, t)


def relaxed():
    base = stance()
    base.pop("absF")
    base["armF"] = (23, 52, -14)
    return base


def hit(t):
    base = relaxed()
    knock = dict(root=(-5.0, -2.2), hips=-10, spine=-10, chest=-8, neck=8, head=14,
                 footF=(7.0, G + 1.0, 10.0), footB=(-12.5, G, 0.0),
                 armF=(10, 70, -10), armB=(-30, 30, 10, -14))
    keys = [(0, base), (1, knock), (2.2, dict(knock, root=(-4.0, -2.8), head=6)), (4, base)]
    return B.keyed(keys, t)


def die(t):
    pz = B.PELV * H
    base = relaxed()
    base["pel"] = (0.0, pz + base.pop("root")[1])
    k1 = dict(pel=(-4.0, pz - 2.0), hips=-10, spine=-12, chest=-8, neck=10, head=16,
              footF=(7.0, G + 1.0, 10.0), footB=(-12.5, G, 0.0),
              armF=(20, 60, -10), armB=(-40, 30, 10, -14))
    k2 = dict(pel=(-8.0, pz - 11.0), root_r=12, hips=-10, spine=-8, chest=-6, neck=6, head=10,
              footF=(6.0, G, 8.0), footB=(-9.0, G, 0.0),
              armF=(60, 50, -10, 14), armB=(50, 40, 10, -20))
    k3 = dict(pel=(-15.0, pz - 21.0), root_r=46, hips=-6, spine=-4, chest=-4, neck=4, head=8,
              footF=(5.0, G + 1.0, 20.0), footB=(-2.0, G + 2.0, 20.0),
              armF=(120, 30, 0, 24), armB=(110, 30, 0, -24))
    land = dict(pel=(-20.0, 6.0), root_r=86, hips=-4, spine=0, chest=0, neck=0, head=4,
                footF=(1.0, G + 5.0, 60.0), footB=(-4.0, G + 3.0, 50.0),
                armF=(168, 14, -80, 30), armB=(158, 20, 0, -30))
    bounce = dict(land, pel=(-20.5, 7.6), root_r=80, neck=-6, head=-10,
                  armF=(160, 20, -70, 34), footF=(1.0, G + 7.0, 60.0))
    rest = dict(land, pel=(-20.8, 5.6), root_r=87, neck=2, head=6,
                footF=(4.0, G + 3.0, 70.0), footB=(0.0, G + 2.0, 60.0),
                armF=(172, 10, -85, 30))
    keys = [(0, base), (1, k1), (2.5, k2), (4.0, k3), (5.0, land), (5.8, bounce), (7, rest),
            (11, rest)]
    return B.keyed(keys, t)


def die_dust(t):
    """Dust pop when the body lands (frame 5 on)."""
    if t < 4.9:
        return None
    return (t - 4.9) / 6.0


DIE_FX = {5: {'s': 0.016, 'origin': (-22, 0), 'spread': 20, 'size': 7.0}, 6: {'s': 0.145, 'origin': (-22, 0), 'spread': 20, 'size': 7.0}, 7: {'s': 0.274, 'origin': (-22, 0), 'spread': 20, 'size': 7.0}, 8: {'s': 0.403, 'origin': (-22, 0), 'spread': 20, 'size': 7.0}, 9: {'s': 0.565, 'origin': (-22, 0), 'spread': 20, 'size': 7.0}, 10: {'s': 0.758, 'origin': (-22, 0), 'spread': 20, 'size': 7.0}, 11: {'s': 0.984, 'origin': (-22, 0), 'spread': 20, 'size': 7.0}}


def clips():
    return [
        P.Clip("idle", range(8), [150] * 8),
        P.Clip("walk", range(12), [80] * 12),
        P.Clip("attack", [0, 1, 2, 3, 3.6, 4.4, 5, 5.8, 7, 8, 9, 10, 11.5, 13],
               [70, 70, 80, 150, 40, 40, 110, 90, 70, 70, 70, 70, 80, 90], loop=False,
               blur={4: 0.18, 5: 0.15}, impact=6),
        P.Clip("hit", [0, 0.8, 1.6, 2.6, 3.6], [60, 80, 80, 90, 90], loop=False),
        P.Clip("die", [0, 1, 2, 3, 4, 5, 5.8, 6.6, 7.4, 8.4, 9.6, 11],
               [70, 70, 70, 70, 70, 80, 80, 90, 100, 110, 120, 200], loop=False,
               blur={3: 0.2, 4: 0.2}, fx=DIE_FX),
    ]
