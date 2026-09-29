"""Spear Hunter: Stone Age anti-armor with reach (long flint spear, pierce), realistic style. heightLu 72.

The tallest and leanest of the hunters: dark weathered skin, a swept-back black mane with two team
feathers, ochre cheek stripes, a bone tooth necklace, a team sash across the chest and a team
loincloth over a hide belt. The long ash spear (about his height, a knapped flint head lashed with
sinew) is held low and forward in both hands. Attack: a lunging two-handed thrust (draw back and
coil, a held extreme, a smeared lunge, a held full extension at the contact, recovery).
"""
import math

from lib import biped as B
from lib import core as C
from lib import mats as M
from lib import motion as MO

SLUG = "spear_hunter"
NAME = "Spear Hunter"
AGE = "stone"
KIND = "unit"
HEIGHT_LU = 72
PX1 = 1.23
SCALE1 = 1.5
H = 70.5
CANVAS = (210, 112)
FEET = (114, 9)
YAW = -24.0
ANCHORS = {"head": (2, 70), "hitCenter": (0, 34)}

BODY = B.Biped(H=H, bulk=0.94)
K = BODY.k
FIST = (0.35 * K, -BODY.sw, 31.0 * K)
FRONT = 40.0 * K           # spear length in front of the near fist
BACK = 30.0 * K
GRIP = 17.0 * K            # far hand behind the near hand along the shaft
TRACKERS = {"spearTip": ("hand_F", (FIST[0] + FRONT + 5.5 * K, FIST[1], FIST[2]))}
EXTRA_BONES = {"feathers": ((-3.0 * K, 0, 66.0 * K), (-8.0 * K, 0, 70.0 * K), "head")}

STANCE = 0.62
STRIDE = 26.0
WALK = {"strideLu": STRIDE * math.cos(math.radians(YAW)) / STANCE}
G0 = B.ANKLE * H
SMEAR_COLOR = "#b3a58f"
SMEAR_ALPHA = 0.5
SMEAR_N = 30
WRIST_DROP = 2.2 * K       # fist centre below the wrist along the hand


def build():
    k = K
    skin = M.skin("#7d5e4b")
    hair = M.hair("#221c19")
    leather = M.leather("#54443a")
    wood = M.wood("#8a7560", "#6a5a4a", stripes=0.6, name="ash")
    flint = M.flint("#6f6d6a")
    sinew = M.rope("#a8987a", name="sinew")
    bone = M.bone()
    ochre = M.ochre()
    fur = M.fur("#6f6255", "#4c4238")
    hide = M.team_hide()
    feather = M.team_feather()
    eye = M.eye()

    rig = C.Rig("spear_rig", BODY.bones(extra=EXTRA_BONES), yaw_deg=YAW)
    BODY.body(rig, skin)
    S = lambda x, y, z: (x * k, y * k, z * k)
    bw = BODY.bulk

    # team sash from the near hip over the far shoulder, team loincloth with front and back flaps
    sash = C.tube("sash", [S(2.6, -5.8, 37.0), S(4.6, -3.0, 43.0), S(4.4, 0.6, 49.0), S(2.2, 3.6, 54.0),
                           S(-1.8, 5.2, 55.2), S(-4.6, 3.0, 49.0), S(-4.4, 0.0, 43.0), S(-3.0, -4.6, 37.6)],
                  [2.0 * k] * 8, hide, seg=10, flat=0.42)
    C.team(sash)
    rig.skin(sash, ["hips", "spine", "chest"], soft=2.2 * k)
    loin = C.blobs("loin", [
        (S(-0.1, 0, 36.2), (5.1 * bw, 7.0 * bw, 2.6)),
        (S(3.4, 0, 31.2), (1.8, 4.4, 4.6)),
        (S(-3.6, 0, 31.6), (1.8, 4.6, 4.4)),
        (S(0.0, 0, 34.0), (5.4 * bw, 7.4 * bw, 2.4)),
    ], hide)
    C.displace(loin, 0.3, 1.0)
    C.team(loin)
    rig.skin(loin, ["hips", "thigh_F", "thigh_B"], soft=2.4 * k, bias={"thigh_F": 1.5 * k, "thigh_B": 1.5 * k})
    belt = C.blobs("belt", [(S(-0.1, 0, 37.4), (5.2 * bw, 7.1 * bw, 0.9))], leather)
    rig.skin(belt, ["hips", "spine"], soft=2.0 * k)
    for i in range(9):
        a = math.radians(-64 + 16 * i)
        p = S(3.0 + 1.3 * math.cos(a), 4.4 * math.sin(a), 55.4 - 1.8 * math.cos(a))
        rig.rigid(C.cyl("tooth", 0.4 * k, 0.05 * k, 1.9 * k, bone, seg=6, loc=p, rot=(0, math.pi * 0.92, 0)), "chest")

    # swept-back mane, two team feathers, ochre cheek stripes
    hair_o = C.blobs("hair", [
        (S(-0.4, 0, 65.4), (4.8, 4.2, 3.6)),
        (S(-3.0, 0, 62.6), (3.2, 4.0, 4.2)),
        (S(-5.4, 0, 60.2), (2.6, 3.2, 3.4)),
        (S(-7.2, 0, 58.0), (2.0, 2.4, 2.8)),
    ], hair, res=0.4)
    C.displace(hair_o, 0.6, 0.4)
    rig.rigid(hair_o, "head")
    for i, (dy, ang) in enumerate(((-1.4, 58), (1.4, 70))):
        q = C.blobs(f"feather{i}", [(S(-6.0 - 0.3 * i, dy, 70.5), (1.0, 0.35, 5.2))], feather, res=0.25)
        C.xform(q, loc=S(3.0, 0, -66.0))
        C.xform(q, loc=S(-3.0, 0, 66.0), rot=(0, math.radians(ang - 90), 0))
        C.team(q)
        rig.rigid(q, "feathers")
    for y in (-1.5, 1.5):
        rig.rigid(C.sphere("eye", 0.52 * k, eye, loc=S(4.25, y, 63.0), scale=(0.5, 1, 0.6)), "head")
        for dz in (0.0, -1.1):
            rig.rigid(C.sphere("stripe", 0.45 * k, ochre, loc=S(3.2, y * 2.2, 61.3 + dz), scale=(1.9, 0.4, 0.5)), "head")

    # hide wraps on the shins, fur boots
    for s, y in (("F", -BODY.sw / k), ("B", BODY.sw / k)):
        hy = (-1 if s == "F" else 1) * BODY.hw / k
        wrap = C.blobs("wrap_" + s, [(S(-0.2, hy, 11.0), (2.4, 2.4, 4.4))], fur, res=0.5)
        C.displace(wrap, 0.35, 0.6)
        rig.skin(wrap, ["shin_" + s], soft=2 * k)
        boot = C.blobs("boot_" + s, [(S(0.2, hy, 3.6), (2.0, 1.9, 2.1)), (S(3.0, hy, 1.6), (4.2, 2.0, 1.4))], leather)
        rig.skin(boot, ["shin_" + s, "foot_" + s], soft=1.0 * k, bias={"shin_" + s: 1.0 * k})
        br = C.blobs("bracer_" + s, [(S(0.2, y, 36.4), (2.0, 2.0, 2.2))], leather)
        rig.skin(br, ["forearm_" + s, "hand_" + s], soft=1.5 * k)

    # the spear, along +X from the near fist
    fx, fy, fz = FIST
    parts = [C.tube("shaft", [(fx - BACK, fy, fz), (fx + FRONT * 0.5, fy, fz + 0.2 * k), (fx + FRONT, fy, fz)],
                    [0.95 * k, 1.05 * k, 0.9 * k], wood, seg=10)]
    head = C.blobs("spearhead", [((fx + FRONT + 3.6 * k, fy, fz), (4.8 * k, 0.7 * k, 1.9 * k))], flint, res=0.3)
    C.xform(head, loc=(0, 0, 0))
    parts.append(head)
    tip = C.tube("tip", [(fx + FRONT + 5 * k, fy, fz), (fx + FRONT + 9.2 * k, fy, fz)], [1.4 * k, 0.1 * k], flint,
                 seg=6, flat=0.4)
    parts.append(tip)
    lash = C.tube("lash", [(fx + FRONT - 2.2 * k, fy, fz), (fx + FRONT + 0.8 * k, fy, fz)], [1.35 * k] * 2, sinew, seg=10)
    parts.append(lash)
    butt = C.tube("buttwrap", [(fx - 3 * k, fy, fz), (fx + 3.5 * k, fy, fz)], [1.25 * k] * 2, leather, seg=10)
    parts.append(butt)
    for o in parts:
        o["weapon"] = 1
        rig.rigid(o, "hand_F")
    return dict(rig=rig)


# ------------------------------------------------------------------------------------ poses
def grip(P, x, z, wa):
    """Both hands on the spear: near wrist at (x, z) with the shaft at angle wa (deg from +X)."""
    a = math.radians(wa)
    P["handF"] = ((x, z), wa)
    bx, bz = x - GRIP * math.cos(a), z - GRIP * math.sin(a)
    P["handB"] = (B.far_grip(bx, bz, 2 * BODY.sw, YAW), wa)
    return P


def stance(breath=0.0):
    P = dict(root=(0.0, -1.2), hips=1, spine=-1, chest=-2, neck=0, head=-6, footF=(9.5, G0, 0.0), footB=(-10.5, G0, 0.0),
             bones={"feathers": 0})
    return grip(P, 11.0, 35.0 + 0.4 * breath, 14 + breath)


def idle(t):
    a = 2 * math.pi * t / 920.0
    P = MO.breathe(stance(), t, amp=1.0, arms=False)
    return grip(P, 11.0 + 0.6 * math.sin(a - 0.8), 35.0 - 0.5 * math.sin(a - 0.8), 14 + 2.5 * math.sin(a - 1.2)) | {
        "bones": {"feathers": 4 * math.sin(a - 1.6)}}


def walk(t):
    P, ph, s1, c2 = MO.walk_legs(t, STRIDE, 4.4, STANCE, G0, lean=5.0)
    P["bones"] = {"feathers": -6 - 4 * c2}
    return grip(P, 12.0 + 1.5 * s1, 35.5 - 1.2 * c2, 12 + 2 * c2)


def _atk_keys():
    ready = stance()
    draw = grip(dict(root=(-2.0, -1.8), hips=-2, spine=-4, chest=-4, neck=3, head=4, footF=(10.5, G0, 2.0),
                     footB=(-11.5, G0, 0.0), bones={"feathers": 4}), 2.0, 36.0, 8)
    coil = grip(dict(root=(-4.6, -3.0), hips=-6, spine=-8, chest=-6, neck=5, head=6, footF=(11.5, G0 + 0.8, 10.0),
                     footB=(-12.0, G0, 0.0), bones={"feathers": 8}), -6.0, 37.5, 5)
    coil2 = dict(coil, root=(-5.0, -3.3))
    coil2 = grip(coil2, -7.0, 37.8, 5)
    lunge = grip(dict(root=(6.0, -6.0), hips=16, spine=10, chest=4, neck=-5, head=-4, footF=(20.0, G0, 0.0),
                      footB=(-12.0, G0 + 1.0, -22.0), bones={"feathers": -10}), 24.0, 38.0, 4)
    hitp = grip(dict(root=(9.0, -8.0), hips=20, spine=12, chest=5, neck=-7, head=-6, footF=(23.0, G0, 0.0),
                     footB=(-11.5, G0 + 1.4, -28.0), bones={"feathers": -16}), 30.0, 38.5, 3)
    hold = grip(dict(hitp, root=(9.4, -8.3), bones={"feathers": -12}), 31.0, 38.3, 3)
    back = grip(dict(root=(5.0, -5.0), hips=12, spine=8, chest=3, neck=-4, head=-2, footF=(18.0, G0, 0.0),
                     footB=(-11.0, G0 + 0.6, -12.0), bones={"feathers": -4}), 20.0, 37.0, 8)
    rec = grip(dict(root=(1.5, -2.2), hips=7, spine=5, chest=2, neck=0, head=2, footF=(11.0, G0, 0.0),
                    footB=(-10.5, G0, -2.0), bones={"feathers": 2}), 13.0, 35.5, 12)
    keys = MO.flip_torso([(65, draw), (135, coil), (250, coil2), (268, lunge), (290, hitp), (420, hold),
                          (490, back), (590, rec)])
    return [(0, ready)] + keys + [(680, ready)]


_ATK = _atk_keys()


def _die(t):
    base = stance()
    base["pel"] = (0.0, B.PELV * H + base.pop("root")[1])
    for kk in ("handF", "handB"):
        base.pop(kk)
    base["armF"] = (20, 40, 60)
    base["armB"] = (-10, 40, 6, -4)
    return MO.fall_back(base, t, H, G0)


def pose(ctx, clip, t):
    if clip == "idle":
        P = idle(t)
    elif clip == "walk":
        P = walk(t)
    elif clip == "attack":
        P = B.keyed(_ATK, t)
    elif clip == "hit":
        base = stance()
        P = MO.knock_hit(base, t, {})
        a = [(0, (11.0, 35.0, 14)), (55, (4.0, 38.0, 30)), (140, (5.0, 37.0, 24)), (310, (11.0, 35.0, 14))]
        x, z, wa = B.keyed([(tk, {"v": v}) for tk, v in a], t)["v"]
        rx = P["root"][0]
        P = grip(P, x + rx * 0.0, z, wa)
    else:
        P = _die(t)
    BODY.apply(ctx["rig"], P)


def clips():
    return MO.biped_clips(attack_blur={3: 20},
                          die_fx=[{"id": "fx.dust_poof", "atMs": 595, "offsetLu": [-22, 8], "scale": 0.72}],
                          dust=dict(t0=236, origin=(-24, 0), spread=24, size=9.5))
