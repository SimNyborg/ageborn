"""Hoplite: Bronze Age infantry (short spear, Shield Bash knockback), realistic style. heightLu 68.

A stocky citizen-soldier of the late Bronze Age: an open-faced Chalcidian bronze helmet with hinged
cheek guards and a tall team horsehair crest that trails down the back, a curled black beard, a
laminated linen cuirass over a team chiton with a row of team pteruges, bronze greaves and sandals.
The big round aspis (team face, polished bronze rim and boss, a dark painted blazon) rides on the
near forearm so the unit reads as a shield wall; the ash spear with a bronze leaf head is held in
the far hand. Idle: braced behind the shield, the spear upright. Walk: a planted march, the shield
steady, the crest bobbing. Attack: the spear comes up overhand and draws back (held), a fast
smeared thrust over the shield rim with a shield shove (the knockback), a held extension, recovery.
Hit: knocked back behind the shield. Die: the spear drops, he falls on his back under his shield.
"""
import math

from lib import biped as B
from lib import bronze as BZ
from lib import core as C
from lib import mats as M
from lib import motion as MO

SLUG = "hoplite"
NAME = "Hoplite"
AGE = "bronze"
KIND = "unit"
HEIGHT_LU = 68
PX1 = 1.23
SCALE1 = 1.5
H = 66.0
CANVAS = (184, 118)
FEET = (90, 9)
YAW = -24.0
ANCHORS = {"head": (2, 66), "hitCenter": (0, 32)}

BODY = B.Biped(H=H, bulk=1.06)
K = BODY.k
FIST_B = (0.35 * K, BODY.sw, 31.0 * K)
FRONT, BACK = 40.0 * K, 26.0 * K
HEAD_L = 6.0 * K
TRACKERS = {"spearTip": ("hand_B", (FIST_B[0] + FRONT + HEAD_L * 1.25, FIST_B[1], FIST_B[2]))}
EXTRA_BONES = {"crest": ((-0.6 * K, 0, 70.6 * K), (-7.0 * K, 0, 67.0 * K), "head")}
SHIELD_R = 13.2 * K

STANCE = 0.62
STRIDE = 24.0
WALK = {"strideLu": STRIDE * math.cos(math.radians(YAW)) / STANCE}
G0 = B.ANKLE * H
SMEAR_COLOR = "#bfb29c"
SMEAR_ALPHA = 0.5
SMEAR_N = 30


def build():
    k = K
    m = BZ.kit()
    skin = M.skin("#8c6a56")
    rig = C.Rig("hoplite_rig", BODY.bones(extra=EXTRA_BONES), yaw_deg=YAW)
    BODY.body(rig, skin)
    BZ.linothorax(rig, BODY, m, pteruges="linen", skirt="linen_dk")
    BZ.helmet(rig, k, m, "chalcidian")
    BZ.crest(rig, k, m, bone="crest")
    BZ.hair_beard(rig, k, m)
    BZ.eyes(rig, k, m)
    BZ.greaves(rig, BODY, m)
    BZ.sandals(rig, BODY, m)
    BZ.bracers(rig, BODY, m, sides=("B",))

    # the aspis on the near forearm: strapped along the REST forearm (pointing down) with its face
    # normal forward and out (toward the camera), so the hanging, slightly raised arm carries it
    # facing the enemy and the viewer
    sw = BODY.sw
    el_z = B.ELBOW * H
    nrm = (0.866, -0.5, 0.0)
    ctr = (nrm[0] * 3.4 * k, -sw + nrm[1] * 3.4 * k, el_z - 2.0 * k)
    for o in BZ.aspis(m, SHIELD_R, emblem=("lambda", "ring")):
        C.xform(o, rot=(0, math.radians(90), 0))
        C.xform(o, rot=(0, 0, math.radians(-30)))
        C.xform(o, loc=ctr)
        rig.rigid(o, "forearm_F")
    # arm band (porpax) and grip, hidden behind the shield mostly
    rig.rigid(C.tube("porpax", [(1.8 * k, -sw - 0.6 * k, el_z - 4.0 * k), (1.8 * k, -sw - 0.6 * k, el_z + 0.5 * k)], [0.7 * k] * 2,
                     m["leather"], seg=8), "forearm_F")

    held = BZ.spear(m, FIST_B, FRONT, BACK, r=0.8 * k, head=HEAD_L, name="held")
    for o in held:
        o["weapon"] = 1
        rig.rigid(o, "hand_B")
    dropped = BZ.spear(m, FIST_B, FRONT, BACK, r=0.8 * k, head=HEAD_L, name="drop")
    for o in dropped:
        C.xform(o, loc=(-FIST_B[0] - 8 * k, -FIST_B[1] - 12 * k, -FIST_B[2] + 1.0 * k), rot=(0, 0, math.radians(6)))
        o.parent = rig.obj
        o.hide_render = True
    return dict(rig=rig, held=held, dropped=dropped)


# ------------------------------------------------------------------------------------ poses
def shield_arm(up=14.0, fore=24.0, abduct=6.0):
    return (up, fore, fore + 10, abduct)


def stance(breath=0.0):
    return dict(root=(0.0, -1.6), hips=0, spine=-2, chest=-2 - 0.8 * breath, neck=2, head=-6 - 0.6 * breath,
                footF=(10.0, G0, 0.0), footB=(-10.5, G0, 0.0),
                absF=shield_arm(14 + 0.8 * breath, 24 + breath), handB=((6.5, 37.5 + 0.4 * breath), 82 + 1.5 * breath),
                bones={"crest": 0})


def idle(t):
    a = 2 * math.pi * t / 920.0
    b = math.sin(a)
    P = stance(breath=1.4 * b)
    P["root"] = (0.0, -1.6 - 0.35 * b)
    P["root_dy"] = 1.2 * math.sin(a + 0.8)
    P["hips"] += 1.0 * math.sin(a + 0.8)
    P["head"] += 2.0 * math.sin(a + 0.3)
    P["handB"] = ((6.5 + 0.5 * math.sin(a - 0.7), 37.5 + 0.4 * b), 82 + 2.0 * math.sin(a - 1.0))
    P["bones"] = {"crest": 3.0 * math.sin(a - 1.3)}
    return P


def walk(t):
    P, ph, s1, c2 = MO.walk_legs(t, STRIDE, 4.2, STANCE, G0, lean=4.0)
    P["absF"] = shield_arm(16 + 2 * c2, 26 - 2 * c2)
    P["handB"] = ((7.5 + 2.0 * s1, 37.0 - 1.0 * c2), 80 + 3 * s1)
    P["bones"] = {"crest": -6 - 4 * c2}
    return P


def _atk_keys():
    ready = stance()
    lift = dict(root=(-1.0, -1.8), hips=-2, spine=-3, chest=-3, neck=1, head=-2, footF=(10.5, G0, 2.0), footB=(-11.0, G0, 0.0),
                absF=shield_arm(18, 26), handB=((1.0, 57.0), -2), bones={"crest": 4})
    draw = dict(root=(-3.4, -1.4), hips=-6, spine=-8, chest=-7, neck=3, head=0, footF=(11.0, G0 + 1.0, 10.0),
                footB=(-11.5, G0, 0.0), absF=shield_arm(22, 28), handB=((-9.0, 61.0), -4), bones={"crest": 10})
    draw2 = dict(draw, root=(-3.7, -1.3), handB=((-10.0, 61.3), -4), spine=-9)
    thrust = dict(root=(4.0, -3.6), hips=10, spine=8, chest=4, neck=-4, head=-6, footF=(15.0, G0, 0.0),
                  footB=(-11.0, G0 + 0.6, -16.0), absF=shield_arm(30, 36), handB=((14.0, 57.0), -10), bones={"crest": -8})
    impact = dict(root=(6.5, -5.4), hips=15, spine=11, chest=5, neck=-7, head=-8, footF=(16.5, G0, 0.0),
                  footB=(-11.0, G0 + 1.0, -22.0), absF=shield_arm(38, 44), handB=((21.0, 55.0), -12), bones={"crest": -14})
    held = dict(impact, root=(6.7, -5.6), handB=((21.5, 54.8), -12), bones={"crest": -10})
    back = dict(root=(4.0, -3.8), hips=10, spine=7, chest=3, neck=-5, head=-6, footF=(14.0, G0, 0.0),
                footB=(-10.5, G0 + 0.4, -10.0), absF=shield_arm(26, 32), handB=((10.0, 55.0), 10), bones={"crest": -2})
    rec = dict(root=(1.5, -2.2), hips=4, spine=2, chest=0, neck=0, head=-4, footF=(11.0, G0, 0.0),
               footB=(-10.5, G0, -2.0), absF=shield_arm(16, 26), handB=((7.0, 42.0), 60), bones={"crest": 4})
    keys = MO.flip_torso([(65, lift), (135, draw), (250, draw2), (268, thrust), (290, impact), (420, held),
                          (500, back), (600, rec)])
    return [(0, ready)] + keys + [(680, ready)]


_ATK = _atk_keys()


def hit(t):
    base = stance()
    P = MO.knock_hit(base, t, dict(absF=shield_arm(6, 12), bones={"crest": 14}))
    h = B.keyed([(0, {"h": (6.5, 37.5, 82.0)}), (55, {"h": (2.0, 40.0, 96.0)}), (140, {"h": (3.0, 39.0, 90.0)}),
                 (310, {"h": (6.5, 37.5, 82.0)})], t)["h"]
    P["handB"] = ((h[0] + P["root"][0], h[1]), h[2])
    return P


def die(t):
    base = stance()
    base["pel"] = (0.0, B.PELV * H + base.pop("root")[1])
    base.pop("absF")
    base.pop("handB")
    base["armF"] = (12, 12, 10, 6)
    base["armB"] = (10, 40, 10, 4)
    arms = [dict(armF=(12, 12, 10, 6)), dict(armF=(6, 10, 10, 6)), dict(armF=(0, 10, 10, 6)), dict(armF=(-10, 12, 10, 6)),
            dict(armF=(-14, 14, 10, 6)), dict(armF=(-8, 10, 10, 6)), dict(armF=(-14, 16, 10, 6)), dict(armF=(-14, 16, 10, 6))]
    P = MO.fall_back(base, t, H, G0, arms_up=lambda i: arms[i])
    c = B.keyed([(0, {"c": 0.0}), (120, {"c": 16.0}), (238, {"c": 30.0}), (290, {"c": 10.0}), (360, {"c": 24.0}), (695, {"c": 24.0})], t)
    P["bones"] = {"crest": c["c"]}
    return P


def pose(ctx, clip, t):
    drop = clip == "die" and t >= 100
    for o in ctx["held"]:
        o.hide_render = drop
    for o in ctx["dropped"]:
        o.hide_render = not drop
    if clip == "die" and t <= 0.0:
        clip = "idle"          # the first death frame matches the idle pose (no pop)
    P = {"idle": idle, "walk": walk, "hit": hit, "die": die}.get(clip)
    BODY.apply(ctx["rig"], P(t) if P else B.keyed(_ATK, t))


def clips():
    c = MO.biped_clips(attack_blur={3: 22},
                       die_fx=[{"id": "fx.dust_poof", "atMs": 595, "offsetLu": [-22, 8], "scale": 0.72}],
                       dust=dict(t0=236, origin=(-24, 0), spread=22, size=9.5))
    return c
