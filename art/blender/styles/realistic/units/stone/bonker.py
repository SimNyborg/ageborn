"""Bonker: Stone Age infantry (club, blunt), realistic style. heightLu 68.

A stocky hunter in a team-dyed hide vest and kilt under a natural fur mantle, bare arms and legs
with leather wraps, shaggy hair and beard, a tooth necklace and a heavy knotted club set with
flints. Idle: heavy breathing, club resting on the shoulder. Walk: planted-foot stride with hip
twist and a bouncing club. Attack: overhead wind-up (held), a motion-blurred smash to the ground,
a held impact with the body driven down, rebound and recovery. Hit: knocked back a step. Die:
knocked off his feet, a heavy fall on his back, a bounce and dust.
"""
import math

from lib import biped as B
from lib import core as C
from lib import game as G
from lib import mats as M
from lib import motion as MO
from lib import props

SLUG = "bonker"
NAME = "Bonker"
AGE = "stone"
KIND = "unit"
HEIGHT_LU = 68
PX1 = 1.23
SCALE1 = 1.5
H = 66.5
CANVAS = (178, 110)
FEET = (110, 9)
YAW = -24.0
ANCHORS = {"head": (2, 66), "hitCenter": (0, 32)}

BODY = B.Biped(H=H, bulk=1.06)
K = BODY.k
FIST = (0.35 * K, -BODY.sw, 31.0 * K)
BLUR_BONES = {"attack": {"upperarm_F", "forearm_F", "hand_F", "upperarm_B", "forearm_B", "hand_B"}}
TRACKERS = {"clubHead": ("hand_F", (FIST[0] + 31.0 * K, FIST[1], FIST[2]))}

STANCE = 0.62
STRIDE = 24.0
WALK = {"strideLu": STRIDE * math.cos(math.radians(YAW)) / STANCE}


def build():
    k = K
    skin = M.skin("#9c7862")
    hair = M.hair("#3b312b")
    fur = M.fur("#76624f", "#4f4236")
    leather = M.leather("#5a4a3e")
    wood = M.wood("#6b5847", "#4e4035")
    flint = M.flint()
    bone = M.bone()
    hide = M.team_hide()
    eye = M.eye()

    rig = C.Rig("bonker_rig", BODY.bones(), yaw_deg=YAW)
    BODY.body(rig, skin)
    S = lambda x, y, z: (x * k, y * k, z * k)
    bw = BODY.bulk

    # team-dyed hide vest and kilt (the big team read)
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
    rig.skin(kilt, ["hips", "thigh_F", "thigh_B"], soft=3.0 * k, bias={"thigh_F": 1.2 * k, "thigh_B": 1.2 * k})
    belt = C.blobs("belt", [(S(-0.1, 0, 37.6), (5.6 * bw, 7.45 * bw, 1.1))], leather)
    rig.skin(belt, ["hips", "spine"], soft=2.0 * k)
    rig.rigid(C.sphere("toggle", 1.1 * k, bone, loc=S(5.6 * bw, -2.5, 37.8), scale=(0.6, 1, 1.4)), "hips")

    # fur mantle over the shoulders and upper back
    mantle = C.blobs("mantle", [
        (S(-1.2, 0, 54.0), (4.4, 9.4 * bw, 3.0)),
        (S(-3.0, 0, 50.0), (3.0, 8.2 * bw, 5.0)),
        (S(1.2, -5.8, 54.4), (3.0, 3.0, 2.4)),
        (S(1.2, 5.8, 54.4), (3.0, 3.0, 2.4)),
        (S(-3.6, 0, 45.6), (2.2, 6.4 * bw, 2.8)),
    ], fur, res=0.5)
    C.displace(mantle, 1.2, 0.55)
    rig.skin(mantle, ["spine", "chest", "neck"], soft=2.0 * k)
    # tooth necklace
    for i in range(7):
        a = math.radians(-60 + 20 * i)
        p = S(3.2 + 1.2 * math.cos(a), 4.6 * math.sin(a), 55.6 - 1.6 * math.cos(a))
        rig.rigid(C.cyl("tooth", 0.45 * k, 0.05 * k, 1.8 * k, bone, seg=6, loc=p, rot=(0, math.pi * 0.92, 0)),
                  "chest")

    # hair and beard
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
        rig.rigid(C.sphere("eye", 0.55 * k, eye, loc=S(4.25, y, 63.0), scale=(0.5, 1, 0.6)), "head")
    band = C.lathe("band", [(4.55 * k, 64.4 * k), (4.75 * k, 65.0 * k), (4.55 * k, 65.6 * k)], hide,
                   scale=(1.0, 0.92, 1.0), loc=(0.2 * k, 0, 0))
    C.team(band)
    rig.rigid(band, "head")

    # leather bracers, fur-wrapped shins, hide boots
    for s, y in (("F", -BODY.sw / k), ("B", BODY.sw / k)):
        br = C.blobs("bracer_" + s, [(S(0.3, y, 37.0), (2.6, 2.5, 3.1))], leather)
        rig.skin(br, ["forearm_" + s, "hand_" + s], soft=1.5 * k)
        hy = (-1 if s == "F" else 1) * BODY.hw / k
        wrap = C.blobs("wrap_" + s, [(S(-0.1, hy, 9.5), (2.8, 2.7, 5.6)), (S(-0.8, hy, 14.2), (3.4, 3.2, 3.0))],
                       fur, res=0.5)
        C.displace(wrap, 0.45, 0.6)
        rig.skin(wrap, ["shin_" + s], soft=2 * k)
        boot = C.blobs("boot_" + s, [(S(0.2, hy, 3.8), (2.2, 2.1, 2.4)), (S(3.2, hy, 1.6), (4.6, 2.2, 1.7))],
                       leather)
        rig.skin(boot, ["shin_" + s, "foot_" + s], soft=1.0 * k, bias={"shin_" + s: 1.0 * k})

    for o in props.club(k, wood, flint, leather):
        o["weapon"] = 1
        C.xform(o, loc=FIST)
        rig.rigid(o, "hand_F")
    return dict(rig=rig)


# ------------------------------------------------------------------------------------ poses
G0 = B.ANKLE * H


def stance(breath=0.0, shift=0.0):
    return dict(root=(0.0, -1.4 - 0.3 * breath), root_dy=shift, hips=0, spine=-2 + 1.2 * breath,
                chest=-3 - 0.8 * breath, neck=3, head=2 - 0.8 * breath,
                footF=(9.0, G0, 0.0), footB=(-10.0, G0, 0.0),
                absF=(32 + 1.5 * breath, 84 - 2 * breath, 70), armB=(-6 - 2 * breath, 16, 4, -4))


def idle(t):
    a = 2 * math.pi * t / 920.0
    P = stance(breath=1.8 * math.sin(a), shift=1.5 * math.sin(a + 0.8))
    P["hips"] += 1.2 * math.sin(a + 0.8)
    P["absF"] = (P["absF"][0] + 4 * math.sin(a - 0.6), P["absF"][1] + 5 * math.sin(a - 1.0),
                 P["absF"][2] + 6 * math.sin(a - 1.4))
    P["head"] += 3 * math.sin(a + 0.3)
    return P


def walk(t):
    ph = (t / 500.0) % 1.0
    fF = B.walk_feet(ph, STRIDE, 4.2, stance=STANCE, ground=G0)
    fB = B.walk_feet(ph + 0.5, STRIDE, 4.2, stance=STANCE, ground=G0)
    c2 = math.cos(4 * math.pi * (ph - 0.06))
    s1 = math.sin(2 * math.pi * ph)
    return dict(root=(1.2, -1.3 - 1.5 * c2), root_dy=1.1 * math.cos(2 * math.pi * ph),
                hips=-3 + 1.5 * c2, twist=7 * s1, spine=-3, chest=1.5 - 1.2 * c2, neck=3, head=1 + 1.5 * c2,
                footF=fF, footB=fB,
                armF=(34 + 3 * c2, 118 - 4 * c2, -40, 8), armB=(24 * s1 - 4, 18 + 10 * max(0, s1), 6, -4))


def _atk_keys():
    ready = stance()
    wind1 = dict(root=(-2.5, -1.0), hips=-4, spine=-7, chest=-8, neck=2, head=4,
                 footF=(10.0, G0, 6.0), footB=(-11.0, G0, 0.0), absF=(150, 200, 150, 10), armB=(38, 30, 0, -8))
    wind2 = dict(root=(-4.0, -0.4), hips=-8, spine=-12, chest=-10, neck=4, head=6,
                 footF=(10.5, G0 + 1.5, 16.0), footB=(-11.5, G0, 0.0), absF=(168, 228, 196, 12), armB=(55, 34, 0, -10))
    wind3 = dict(wind2, root=(-4.4, -0.2), spine=-13, absF=(171, 232, 200, 12))
    smash = dict(root=(5.0, -6.0), hips=16, spine=12, chest=6, neck=-6, head=-5,
                 footF=(15.0, G0, 0.0), footB=(-11.0, G0 + 0.5, -18.0), absF=(120, 118, 70, 6), armB=(-30, 20, 4, -4))
    impact = dict(root=(7.5, -9.5), hips=20, spine=14, chest=8, neck=-10, head=-8,
                  footF=(16.0, G0, 0.0), footB=(-11.0, G0 + 0.8, -22.0), absF=(74, 80, -48, 4), armB=(-36, 22, 6, -4))
    held = dict(impact, root=(7.6, -9.9), hips=21)
    rebound = dict(impact, root=(7.0, -8.6), hips=18, spine=12, absF=(78, 86, -36, 4))
    rec = dict(root=(3.0, -3.5), hips=10, spine=7, chest=4, neck=-6, head=-5,
               footF=(12.0, G0, 0.0), footB=(-10.5, G0, -4.0), absF=(46, 84, 30, 2), armB=(-14, 18, 4, -4))
    keys = MO.flip_torso([(65, wind1), (135, wind2), (245, wind3), (268, smash), (290, impact), (400, held),
                          (470, rebound), (560, rec)])
    return [(0, ready)] + keys + [(680, ready)]


_ATK = _atk_keys()


def relaxed():
    b = stance()
    b.pop("absF")
    b["armF"] = (23, 52, -14)
    return b


def hit(t):
    return MO.knock_hit(stance(), t, dict(absF=(40, 110, 90), armB=(-30, 30, 10, -14)))


def die(t):
    pz = B.PELV * H
    base = relaxed()
    base["pel"] = (0.0, pz + base.pop("root")[1])
    k1 = dict(pel=(-4.0, pz - 2.0), hips=-10, spine=-12, chest=-8, neck=10, head=16,
              footF=(7.0, G0 + 1.0, 10.0), footB=(-12.5, G0, 0.0), armF=(20, 60, -10), armB=(-40, 30, 10, -14))
    k2 = dict(pel=(-8.0, pz - 11.0), root_r=12, hips=-10, spine=-8, chest=-6, neck=6, head=10,
              footF=(6.0, G0, 8.0), footB=(-9.0, G0, 0.0), armF=(60, 50, -10, 14), armB=(50, 40, 10, -20))
    k3 = dict(pel=(-15.0, pz - 21.0), root_r=46, hips=-6, spine=-4, chest=-4, neck=4, head=8,
              footF=(5.0, G0 + 1.0, 20.0), footB=(-2.0, G0 + 2.0, 20.0), armF=(120, 30, 0, 24), armB=(110, 30, 0, -24))
    land = dict(pel=(-20.0, 6.0), root_r=86, hips=-4, spine=0, chest=0, neck=0, head=4,
                footF=(1.0, G0 + 5.0, 60.0), footB=(-4.0, G0 + 3.0, 50.0), armF=(168, 14, -80, 30), armB=(158, 20, 0, -30))
    bounce = dict(land, pel=(-20.5, 7.6), root_r=80, neck=-6, head=-10, armF=(160, 20, -70, 34), footF=(1.0, G0 + 7.0, 60.0))
    rest = dict(land, pel=(-20.8, 5.6), root_r=87, neck=2, head=6, footF=(4.0, G0 + 3.0, 70.0),
                footB=(0.0, G0 + 2.0, 60.0), armF=(172, 10, -85, 30))
    keys = [(0, base), (50, k1), (120, k2), (185, k3), (238, land), (290, bounce), (360, rest), (695, rest)]
    return B.keyed(keys, t)


def pose(ctx, clip, t):
    P = {"idle": idle, "walk": walk, "hit": hit, "die": die}.get(clip)
    BODY.apply(ctx["rig"], P(t) if P else B.keyed(_ATK, t))


# ------------------------------------------------------------------------------------ clips
DIE_MS = [45, 60, 70, 60, 50, 60, 70, 90, 90, 100]


def _dust(t0, frames_t, span=420.0, origin=(-24, 0), spread=22, size=9.5):
    return {i: {"s": max(0.01, (t - t0) / span), "origin": origin, "spread": spread, "size": size}
            for i, t in frames_t if t >= t0}


def clips():
    die_c = G.Clip("die", DIE_MS, extra={
        "fx": [{"id": "fx.dust_poof", "atMs": 595, "offsetLu": [-22, 8], "scale": 0.7}],
        "hideUnitAtMs": 695})
    die_c.fx = _dust(236, [(i, t) for i, t in enumerate(die_c.times)])
    atk = G.Clip("attack", [65, 70, 120, 35, 140, 80, 80, 90], impact=4, smear=3,
                 times=[0, 65, 135, 268, 290, 430, 510, 590], blur={3: 24})
    for i, s in ((4, 0.04), (5, 0.3), (6, 0.55)):      # the club hits the ground: a puff of dust
        atk.fx[i] = {"s": s, "origin": (48, 0), "spread": 7, "n": 9, "size": 4.2, "seed": 13}
    return [
        G.Clip("idle", [115] * 8, loop=True),
        G.Clip("walk", [62, 63, 62, 63, 62, 63, 62, 63], loop=True),
        atk,
        G.Clip("hit", [45, 75, 60, 60, 70], times=[0, 50, 125, 185, 245]),
        die_c,
    ]
