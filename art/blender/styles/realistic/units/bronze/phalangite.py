"""Phalangite: Bronze Age anti-armor (sarissa, reach 65, priority armored), realistic style. heightLu 72.

A tall, lean phalanx pikeman: an open-faced bronze helmet with cheek guards and a tall team crest,
a linen cuirass over a team chiton with team pteruges, bronze greaves, sandals, and a small round
team shield (pelte) slung from the near shoulder so both hands stay on the weapon. The sarissa is
very long (about 1.7x his height): a cornel shaft with a bronze leaf head and a bronze butt spike,
held low and level in both hands. He stands braced, feet wide. Attack: he coils the sarissa back
and holds, then drives it forward in a long braced thrust (smear, held impact) and recovers.
"""
import math

from lib import biped as B
from lib import bronze as BZ
from lib import core as C
from lib import mats as M
from lib import motion as MO

SLUG = "phalangite"
NAME = "Phalangite"
AGE = "bronze"
KIND = "unit"
HEIGHT_LU = 72
PX1 = 1.23
SCALE1 = 1.5
H = 69.5
CANVAS = (214, 104)
FEET = (64, 9)
YAW = -24.0
ANCHORS = {"head": (2, 70), "hitCenter": (0, 33)}

BODY = B.Biped(H=H, bulk=0.97)
K = BODY.k
FIST = (0.35 * K, -BODY.sw, 31.0 * K)
FRONT = 86.0
BACK = 30.0
HEAD_L = 8.0
GRIP = 19.0 * K
TRACKERS = {"sarissaTip": ("hand_F", (FIST[0] + FRONT + HEAD_L * 1.25, FIST[1], FIST[2]))}
EXTRA_BONES = {"crest": ((-0.6 * K, 0, 70.6 * K), (-7.0 * K, 0, 67.0 * K), "head")}

STANCE = 0.62
STRIDE = 22.0
WALK = {"strideLu": STRIDE * math.cos(math.radians(YAW)) / STANCE}
G0 = B.ANKLE * H
SMEAR_COLOR = "#bfb29c"
SMEAR_ALPHA = 0.5
SMEAR_N = 30


def build():
    k = K
    m = BZ.kit()
    skin = M.skin("#94705b")
    rig = C.Rig("phalangite_rig", BODY.bones(extra=EXTRA_BONES), yaw_deg=YAW)
    BODY.body(rig, skin)
    BZ.linothorax(rig, BODY, m, pteruges="team", skirt="team")
    # team sleeves of the chiton under the cuirass flaps
    for s, y in (("F", -BODY.sw / k), ("B", BODY.sw / k)):
        S = lambda x, yy, z: (x * k, yy * k, z * k)
        sl = C.blobs("sleeve_" + s, [(S(0, y, 52.6), (3.5, 3.4, 3.4)), (S(0, y * 1.02, 49.6), (3.0, 2.9, 2.6))], m["team_cloth"], res=0.3)
        C.team(sl)
        rig.skin(sl, ["chest", "upperarm_" + s], soft=1.4 * k, bias={"chest": 2.5 * k})
    BZ.helmet(rig, k, m, "chalcidian")
    BZ.crest(rig, k, m, bone="crest", height=5.2)
    BZ.hair_beard(rig, k, m, hair=M.hair("#33271f", name="brownhair"), beard=True)
    BZ.eyes(rig, k, m)
    BZ.greaves(rig, BODY, m)
    BZ.sandals(rig, BODY, m)

    # the pelte: a small round shield slung on the near shoulder, facing forward and out
    for o in BZ.aspis(m, 8.6 * k, name="pelte"):
        BZ.disc_xform(o, (3.8 * k, -BODY.sw - 3.6 * k, 46.0 * k), -34.0, tilt_deg=8.0)
        rig.rigid(o, "chest")
    strap = C.tube("peltestrap", [(3.4 * k, -BODY.sw - 1.0 * k, 53.0 * k), (1.0 * k, -2.0 * k, 56.0 * k), (-3.0 * k, 4.0 * k, 54.5 * k)],
                   [0.5 * k] * 3, m["leather"], seg=6)
    rig.skin(strap, ["chest"], soft=2 * k)

    def sarissa(tag):
        return BZ.spear(m, FIST, FRONT, BACK, r=0.85 * k, head=HEAD_L, name=tag, shaft="cedar")
    held = sarissa("held")
    for o in held:
        o["weapon"] = 1
        rig.rigid(o, "hand_F")
    dropped = sarissa("drop")
    for o in dropped:
        C.xform(o, loc=(-FIST[0] - 10 * k, -FIST[1] - 10 * k, -FIST[2] + 1.0 * k), rot=(0, 0, math.radians(4)))
        o.parent = rig.obj
        o.hide_render = True
    return dict(rig=rig, held=held, dropped=dropped)


# ------------------------------------------------------------------------------------ poses
def grip(P, x, z, wa):
    """Both hands on the sarissa: near wrist at (x, z), the shaft at angle wa (deg from +X)."""
    a = math.radians(wa)
    P["handF"] = ((x, z), wa)
    bx, bz = x - GRIP * math.cos(a), z - GRIP * math.sin(a)
    P["handB"] = (B.far_grip(bx, bz, 2 * BODY.sw, YAW), wa)
    return P


def stance():
    P = dict(root=(0.0, -2.2), hips=1, spine=-1, chest=-2, neck=0, head=-6, footF=(11.5, G0, 0.0), footB=(-12.0, G0, 0.0),
             bones={"crest": 0})
    return grip(P, 12.0, 34.5, 3)


def idle(t):
    a = 2 * math.pi * t / 920.0
    P = MO.breathe(stance(), t, amp=1.0, arms=False)
    P["bones"] = {"crest": 3.0 * math.sin(a - 1.3)}
    return grip(P, 12.0 + 0.5 * math.sin(a - 0.8), 34.5 - 0.5 * math.sin(a - 0.8), 3 + 1.2 * math.sin(a - 1.2))


def walk(t):
    P, ph, s1, c2 = MO.walk_legs(t, STRIDE, 4.0, STANCE, G0, lean=3.0)
    P["bones"] = {"crest": -6 - 4 * c2}
    return grip(P, 13.0 + 1.0 * s1, 35.0 - 1.2 * c2, 3 + 1.0 * c2)


def _atk_keys():
    ready = stance()
    draw = grip(dict(root=(-2.0, -2.4), hips=-2, spine=-3, chest=-3, neck=2, head=-3, footF=(12.5, G0, 2.0),
                     footB=(-12.5, G0, 0.0), bones={"crest": 4}), 3.0, 35.0, 2)
    coil = grip(dict(root=(-5.0, -3.4), hips=-6, spine=-7, chest=-5, neck=4, head=0, footF=(13.0, G0 + 0.8, 8.0),
                     footB=(-13.0, G0, 0.0), bones={"crest": 9}), -5.0, 36.0, 1)
    coil2 = grip(dict(coil, root=(-5.4, -3.6)), -6.0, 36.2, 1)
    lunge = grip(dict(root=(6.0, -6.0), hips=14, spine=9, chest=4, neck=-5, head=-8, footF=(21.0, G0, 0.0),
                      footB=(-13.0, G0 + 1.0, -20.0), bones={"crest": -10}), 24.0, 37.0, 0)
    hitp = grip(dict(root=(9.0, -7.6), hips=18, spine=11, chest=5, neck=-7, head=-9, footF=(24.0, G0, 0.0),
                     footB=(-12.5, G0 + 1.4, -26.0), bones={"crest": -16}), 31.0, 37.5, -1)
    hold = grip(dict(hitp, root=(9.4, -7.9), bones={"crest": -12}), 32.0, 37.3, -1)
    back = grip(dict(root=(5.0, -5.0), hips=10, spine=7, chest=3, neck=-4, head=-6, footF=(19.0, G0, 0.0),
                     footB=(-12.0, G0 + 0.6, -12.0), bones={"crest": -4}), 21.0, 36.0, 2)
    rec = grip(dict(root=(1.5, -2.8), hips=5, spine=3, chest=1, neck=0, head=-4, footF=(12.5, G0, 0.0),
                    footB=(-12.0, G0, -2.0), bones={"crest": 3}), 13.5, 34.8, 3)
    keys = MO.flip_torso([(65, draw), (135, coil), (250, coil2), (268, lunge), (290, hitp), (420, hold),
                          (490, back), (590, rec)])
    return [(0, ready)] + keys + [(680, ready)]


_ATK = _atk_keys()


def _die(t):
    base = stance()
    base["pel"] = (0.0, B.PELV * H + base.pop("root")[1])
    for kk in ("handF", "handB"):
        base.pop(kk)
    base["armF"] = (24, 60, 50)
    base["armB"] = (8, 60, 10, -4)
    P = MO.fall_back(base, t, H, G0)
    c = B.keyed([(0, {"c": 0.0}), (120, {"c": 16.0}), (238, {"c": 30.0}), (290, {"c": 10.0}), (360, {"c": 24.0}), (695, {"c": 24.0})], t)
    P["bones"] = {"crest": c["c"]}
    return P


def pose(ctx, clip, t):
    drop = clip == "die" and t >= 100
    for o in ctx["held"]:
        o.hide_render = drop
    for o in ctx["dropped"]:
        o.hide_render = not drop
    if clip == "idle":
        P = idle(t)
    elif clip == "walk":
        P = walk(t)
    elif clip == "attack":
        P = B.keyed(_ATK, t)
    elif clip == "hit":
        P = MO.knock_hit(stance(), t, {"bones": {"crest": 14}})
        a = [(0, (12.0, 34.5, 3)), (55, (5.0, 37.0, 16)), (140, (6.0, 36.0, 11)), (310, (12.0, 34.5, 3))]
        x, z, wa = B.keyed([(tk, {"v": v}) for tk, v in a], t)["v"]
        P = grip(P, x, z, wa)
    else:
        P = _die(t)
    BODY.apply(ctx["rig"], P)


def clips():
    return MO.biped_clips(attack_blur={3: 22},
                          die_fx=[{"id": "fx.dust_poof", "atMs": 595, "offsetLu": [-22, 8], "scale": 0.74}],
                          dust=dict(t0=236, origin=(-24, 0), spread=24, size=9.5))
