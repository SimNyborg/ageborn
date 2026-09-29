"""Training Dummy: the tutorial-only Stone Age dummy (hidden card), realistic style. heightLu 60.

A straw-stuffed burlap practice dummy that walks: a lumpy sewn sack body and head (wooden button
eyes, a stitched grin, a straw tuft sprouting from the tied-off top), stuffed burlap arms, legs of
bound straw bundles, twine ties at the neck, wrists, waist and knees, a team bullseye painted on
its chest (it is a practice target) and a team scarf with a trailing tail. It swings a wooden
practice club with a floppy, over-eager bonk. On death it keels over and straw bursts out.
"""
import math

from lib import biped as B
from lib import core as C
from lib import mats as M
from lib import motion as MO

SLUG = "training_dummy"
NAME = "Training Dummy"
AGE = "stone"
KIND = "unit"
HEIGHT_LU = 60
PX1 = 1.23
SCALE1 = 1.5
H = 58.0
CANVAS = (160, 104)
FEET = (94, 9)
YAW = -24.0
ANCHORS = {"head": (0, 58), "hitCenter": (0, 28)}

BODY = B.Biped(H=H, bulk=1.12)
K = BODY.k
FIST = (0.35 * K, -BODY.sw, 31.0 * K)
TRACKERS = {"clubHead": ("hand_F", (FIST[0] + 26.0 * K, FIST[1], FIST[2]))}
EXTRA_BONES = {"scarf": ((-3.0 * K, 0, 56.5 * K), (-9.0 * K, 0, 50.0 * K), "chest")}
BLUR_BONES = None

STANCE = 0.62
STRIDE = 17.0
WALK = {"strideLu": STRIDE * math.cos(math.radians(YAW)) / STANCE}
G0 = B.ANKLE * H
SMEAR_COLOR = "#b9a88e"
SMEAR_ALPHA = 0.55


def build():
    k = K
    sack = M.burlap("#9c8566")
    sack_dk = M.burlap("#8f7a5c", name="burlap_dk")
    straw = M.straw("#c2ab72")
    twine = M.rope("#7e6a50", name="twine")
    button = M.wood("#3e332b", "#2c241e", name="button", stripes=4)
    wood = M.wood("#9a8166", "#7a6450", name="clubwood")
    paint = M.team_paint()
    scarfm = M.team_cloth()
    white = C.mat("chalk", "#cfc6b4", rough=0.9, noise=0.15, nscale=1.5, bump=0.5)

    rig = C.Rig("dummy_rig", BODY.bones(extra=EXTRA_BONES), yaw_deg=YAW)
    parts = BODY.body(rig, sack, parts=("torso", "arms"), hands=True)
    for o in parts.values():
        C.displace(o, 0.5 * k, 0.5)
    legs = BODY.body(rig, straw, parts=("legs",))
    for o in legs.values():
        C.displace(o, 0.7 * k, 1.6)
    S = lambda x, y, z: (x * k, y * k, z * k)

    # the sack head, tied off on top with a straw tuft
    head = C.blobs("sackhead", [(S(0.8, 0, 62.8), (5.0, 4.6, 5.2)), (S(0.6, 0, 67.8), (2.2, 2.0, 1.8))], sack, res=0.4)
    C.displace(head, 0.5 * k, 0.6)
    rig.rigid(head, "head")
    tuft = C.blobs("tuft", [(S(0.4 + 1.2 * math.cos(a), 1.2 * math.sin(a), 70.2 + 0.8 * (i % 2)), (0.7, 0.7, 2.6))
                            for i, a in enumerate([0, 1.2, 2.4, 3.6, 4.8])], straw, res=0.25)
    C.displace(tuft, 0.5 * k, 2.0)
    rig.rigid(tuft, "head")
    rig.rigid(C.lathe("topknot", [(2.3 * k, 67.4 * k), (2.5 * k, 68.0 * k), (2.2 * k, 68.6 * k)], twine, seg=16), "head")
    for y in (-1.8, 1.8):
        rig.rigid(C.cyl("button", 0.95 * k, 0.95 * k, 0.5 * k, button, seg=12, loc=S(5.9, y, 63.6),
                        rot=(0, math.pi / 2 - 0.1, 0)), "head")
    grin = C.tube("grin", [S(5.3, -2.6, 60.9), S(6.0, -1.0, 60.2), S(6.1, 0.6, 60.2), S(5.6, 2.3, 60.8)],
                  [0.3 * k] * 4, twine, seg=6)
    rig.rigid(grin, "head")
    for i in range(5):
        y = -2.0 + i
        rig.rigid(C.tube("stitch", [S(5.8, y, 61.1), S(6.2, y + 0.2, 59.5)], [0.18 * k] * 2, twine, seg=5), "head")

    # twine ties (neck, waist, wrists, knees) and straw poking out at the cuffs
    rig.rigid(C.lathe("neck_tie", [(2.6 * k, 56.0 * k), (2.9 * k, 56.7 * k), (2.6 * k, 57.4 * k)], twine, seg=16), "neck")
    waist = C.blobs("waist_tie", [(S(-0.2, 0, 37.4), (5.4 * BODY.bulk, 7.2 * BODY.bulk, 0.6))], twine, res=0.4)
    rig.skin(waist, ["hips", "spine"], soft=2 * k)
    for s, y in (("F", -BODY.sw / k), ("B", BODY.sw / k)):
        hy = (-1 if s == "F" else 1) * BODY.hw / k
        rig.rigid(C.lathe("knee_tie", [(2.9 * k, 18.6 * k), (3.2 * k, 19.3 * k), (2.9 * k, 20.0 * k)], twine, seg=14,
                          loc=S(0.6, hy, 0)), "shin_" + s)
        w = C.blobs("cuff_" + s, [(S(0.1, y, 34.8), (2.0, 2.0, 1.1))], twine, res=0.35)
        rig.skin(w, ["forearm_" + s, "hand_" + s], soft=1.2 * k)
        cuff = C.blobs("cuffstraw_" + s, [(S(0.1 + 0.9 * math.cos(a), y + 0.9 * math.sin(a), 36.8), (0.5, 0.5, 1.6))
                                         for a in (0, 1.6, 3.2, 4.8)], straw, res=0.25)
        rig.skin(cuff, ["forearm_" + s], soft=1.2 * k)

    # team bullseye on the chest (painted rings on the sack), team scarf with a tail
    for i, (r, m) in enumerate(((6.6, paint), (4.9, white), (3.3, paint), (1.6, white))):
        d = C.cyl(f"ring{i}", r * k, r * k, 0.25 * k, m, seg=32, loc=S(5.9 + 0.12 * i, -0.8, 46.4),
                  rot=(0, math.pi / 2 - 0.25, 0), scale=(1.0, 1.0, 1.0))
        if m is paint:
            C.team(d)
        rig.rigid(d, "chest")
    scarf = C.blobs("scarf", [(S(0.4, 0, 55.4), (5.0, 6.4, 2.3))], scarfm, res=0.4)
    C.displace(scarf, 0.3, 1.0)
    C.team(scarf)
    rig.skin(scarf, ["chest", "neck"], soft=2 * k)
    tail = C.tube("scarf_tail", [S(-3.2, -2.0, 55.2), S(-6.0, -2.4, 53.8), S(-8.6, -2.6, 51.6), S(-10.8, -2.6, 49.4)],
                  [2.3 * k, 2.5 * k, 2.5 * k, 2.1 * k], scarfm, seg=10, flat=0.35)
    C.team(tail)
    rig.rigid(tail, "scarf")

    # a wooden practice club (a smoothed stick with a knob)
    fx, fy, fz = FIST
    cl = [C.tube("club", [(fx - 3 * k, fy, fz), (fx + 12 * k, fy, fz + 0.3 * k), (fx + 22 * k, fy, fz)],
                 [1.2 * k, 1.4 * k, 2.1 * k], wood, seg=12),
          C.blobs("knob", [((fx + 24 * k, fy, fz), (3.4 * k, 2.8 * k, 2.8 * k))], wood, res=0.3)]
    for o in cl:
        o["weapon"] = 1
        rig.rigid(o, "hand_F")
    return dict(rig=rig)


# ------------------------------------------------------------------------------------ poses
def stance():
    return dict(root=(0.0, -1.2), hips=0, spine=-1, chest=-2, neck=2, head=4, footF=(7.5, G0, 0.0),
                footB=(-8.0, G0, 0.0), absF=(28, 70, 64), armB=(-4, 20, 4, -6), bones={"scarf": 0})


def idle(t):
    a = 2 * math.pi * t / 920.0
    P = MO.breathe(stance(), t, amp=1.3)
    P["head"] += 5 * math.sin(a - 0.8)                   # the sack head lolls
    P["absF"] = (28 + 4 * math.sin(a - 0.6), 70 + 6 * math.sin(a - 1.0), 64 + 8 * math.sin(a - 1.4))
    P["bones"] = {"scarf": 6 * math.sin(a - 1.6)}
    return P


def walk(t):
    P, ph, s1, c2 = MO.walk_legs(t, STRIDE, 4.6, STANCE, G0, lean=2.0, bob=2.2, twist=10.0)
    P["root_dy"] = 2.2 * math.cos(2 * math.pi * ph)        # a waddle
    P["head"] = 4 + 6 * math.sin(2 * math.pi * ph - 1.0)
    P["absF"] = (30 + 4 * c2, 80 - 6 * c2, 60)
    P["armB"] = MO.arm_swing(s1, "B", amp=30)
    P["bones"] = {"scarf": -8 - 6 * c2}
    return P


def _atk_keys():
    ready = stance()
    wind1 = dict(ready, root=(-2.0, -0.8), hips=4, spine=6, chest=6, neck=-2, head=-2, absF=(140, 190, 150),
                 armB=(40, 30, 0, -8), bones={"scarf": 6})
    wind2 = dict(wind1, root=(-3.6, 0.0), hips=8, spine=12, chest=10, neck=-4, head=-8, absF=(165, 222, 190),
                 footF=(8.5, G0 + 2.0, 18.0), bones={"scarf": 12})
    wind3 = dict(wind2, absF=(168, 228, 196))
    swing = dict(ready, root=(3.0, -4.0), hips=-10, spine=-10, chest=-6, neck=6, head=8, absF=(118, 118, 70),
                 armB=(-30, 20, 4, -4), bones={"scarf": 4})
    bonk = dict(ready, root=(6.0, -7.5), hips=-16, spine=-16, chest=-10, neck=10, head=16, absF=(70, 74, -52),
                footF=(12.0, G0, 0.0), footB=(-9.0, G0 + 1.0, -20.0), armB=(-40, 30, 6, -4), bones={"scarf": -14})
    wobble = dict(bonk, root=(5.6, -8.4), head=-6, absF=(64, 62, -64), bones={"scarf": -18})
    wob2 = dict(bonk, root=(5.2, -6.8), head=12, absF=(76, 84, -30), bones={"scarf": 4})
    rec = dict(ready, root=(2.0, -3.0), hips=-6, spine=-6, head=0, absF=(40, 80, 40), bones={"scarf": 6})
    return [(0, ready), (65, wind1), (135, wind2), (245, wind3), (268, swing), (290, bonk), (400, wobble),
            (470, wob2), (570, rec), (680, ready)]


_ATK = _atk_keys()


def pose(ctx, clip, t):
    if clip == "idle":
        P = idle(t)
    elif clip == "walk":
        P = walk(t)
    elif clip == "attack":
        P = B.keyed(_ATK, t)
    elif clip == "hit":
        P = MO.knock_hit(stance(), t, dict(absF=(50, 110, 90), armB=(-40, 30, 10, -14), bones={"scarf": 16}), back=7.0)
    else:
        base = stance()
        base["pel"] = (0.0, B.PELV * H + base.pop("root")[1])
        base.pop("absF")
        base["armF"] = (28, 42, 30)
        P = MO.fall_back(base, t, H, G0)
        P["bones"] = {"scarf": 20}
    BODY.apply(ctx["rig"], P)


def clips():
    cl = MO.biped_clips(attack_blur={3: 24},
                        die_fx=[{"id": "fx.dust_poof", "atMs": 595, "offsetLu": [-18, 8], "scale": 0.6}],
                        dust=dict(t0=236, origin=(-18, 2), spread=18, size=8.0, color=(0.76, 0.68, 0.48)))
    return cl
