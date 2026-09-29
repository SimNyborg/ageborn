"""Footman: Medieval Age infantry (arming sword, Shield Wall), realistic style. heightLu 68.

A 14th-century man-at-arms: a steel kettle hat over a mail coif, a riveted mail hauberk to mid
thigh under a team-dyed wool tabard with a dark hem, a leather sword belt, wool hose and turnshoe
boots, leather gloves. A big team heater shield (painted wood, iron rim, a pale chevron company
mark) is carried forward on the near arm, so the Shield Wall reads at a glance; the arming sword
is held up in the far hand. Idle: breathing behind the shield, the sword resting on the shoulder.
Walk: a planted-foot march, shield steady. Attack: the sword is hauled back behind the head (held),
chops down over the shield rim (smear), a held impact with a shield shove, recovery. Hit: knocked
back behind the shield. Die: knocked off his feet onto his back, a bounce, dust.
"""
import math

from lib import biped as B
from lib import core as C
from lib import game as G
from lib import mats as M
from lib import medieval as MD
from lib import motion as MO

SLUG = "footman"
NAME = "Footman"
AGE = "medieval"
KIND = "unit"
HEIGHT_LU = 68
PX1 = 1.23
SCALE1 = 1.5
H = 65.5
CANVAS = (178, 118)
FEET = (100, 9)
YAW = -24.0
ANCHORS = {"head": (2, 66), "hitCenter": (0, 32)}

BODY = B.Biped(H=H, bulk=1.04)
K = BODY.k
FIST_B = (0.35 * K, BODY.sw, 31.0 * K)
SWORD = 31.0
TRACKERS = {"swordTip": ("hand_B", (FIST_B[0] + (SWORD + 2.6) * K, FIST_B[1], FIST_B[2]))}
SHIELD_FORE = 96.0              # forearm angle the shield is modelled for

STANCE = 0.62
STRIDE = 25.0
WALK = {"strideLu": STRIDE * math.cos(math.radians(YAW)) / STANCE}
G0 = B.ANKLE * H
SMEAR_COLOR = "#c2c0bc"
SMEAR_ALPHA = 0.55
SMEAR_N = 30


def build():
    k = K
    skin = M.skin("#b08a70")
    hair = M.hair("#3a2e26")
    beard = M.hair("#4a3a2e", name="beard")
    eye = M.eye()
    mail = MD.mail()
    st = MD.steel()
    dst = MD.dark_steel()
    brass = MD.brass()
    hose = MD.wool("#6b5f52", name="hose", dark="#5a5046")
    leather = M.leather("#4b3b30")
    glove = M.leather("#5a4636", name="glove")
    hem = MD.wool("#2e2622", name="hem")
    cream = MD.linen("#cfc3a6", name="charge")
    tab = MD.team_wool()
    paint = MD.team_paint()
    grip = M.leather("#3a2c24", name="grip")

    rig = C.Rig("footman_rig", BODY.bones(), yaw_deg=YAW)
    MD.dressed_body(rig, BODY, skin, mail, hose, torso_mat=mail, glove=glove)
    MD.hauberk(rig, BODY, mail)
    MD.tabard(rig, BODY, tab, hem_mat=hem, length=25.0)
    MD.belt(rig, BODY, leather, z=37.0, bulk=1.12, buckle=brass)
    MD.boots(rig, BODY, leather)
    MD.face(rig, BODY, hair, eye, beard=None, moustache=True, hair=None)
    MD.coif(rig, BODY, mail)
    MD.kettle_hat(rig, BODY, st, rim=dst, brim=7.8, tilt=-9.0)
    # a scabbard on the far hip (the sword is drawn), hanging back
    Sx = MD.S(k)
    sc = C.tube("scabbard", [Sx(-1.0, 7.8, 36.0), Sx(-6.0, 8.2, 24.0), Sx(-10.5, 8.4, 13.5)], [0.95 * k, 0.8 * k, 0.6 * k],
                leather, seg=8, flat=0.5)
    rig.rigid(sc, "hips")
    rig.rigid(C.sphere("chape", 0.7 * k, dst, loc=Sx(-10.7, 8.4, 13.2)), "hips")

    # the heater shield on the near forearm, facing the camera, turned a little toward the enemy
    parts = MD.heater_shield(k, paint, dst, charge_mat=cream, height=23.0, width=16.0, charge="chevron", boss=None)
    MD.mount_on_forearm(parts, BODY, "F", SHIELD_FORE, (7.4 * k, 3.2 * k, 0.6 * k), yaw_deg=38.0, roll_deg=-4.0)
    for o in parts:
        rig.rigid(o, "forearm_F")

    # the arming sword in the far fist
    for o in MD.arming_sword(k, st, grip, brass, length=SWORD):
        o["weapon"] = 1
        C.xform(o, loc=FIST_B)
        rig.rigid(o, "hand_B")
    return dict(rig=rig)


# ------------------------------------------------------------------------------------ poses
def stance(breath=0.0, shift=0.0):
    return dict(root=(0.0, -1.3 - 0.3 * breath), root_dy=shift, hips=0, spine=-2 + 1.2 * breath,
                chest=-2 - 0.8 * breath, neck=2, head=-3 - 0.8 * breath,
                footF=(9.5, G0, 0.0), footB=(-10.0, G0, 0.0),
                absF=(12 + 1.0 * breath, SHIELD_FORE, 96), absB=(28 + 1.5 * breath, 118 - 2 * breath, 78, -4))


def idle(t):
    a = 2 * math.pi * t / 920.0
    P = stance(breath=1.6 * math.sin(a), shift=1.4 * math.sin(a + 0.8))
    P["hips"] += 1.1 * math.sin(a + 0.8)
    P["absB"] = (P["absB"][0] + 3 * math.sin(a - 0.6), P["absB"][1] + 4 * math.sin(a - 1.0),
                 P["absB"][2] + 5 * math.sin(a - 1.4), -4)
    P["head"] += 2.5 * math.sin(a + 0.3)
    return P


def walk(t):
    P, ph, s1, c2 = MO.walk_legs(t, STRIDE, 4.2, STANCE, G0, lean=4.0)
    P["absF"] = (24 + 2 * c2, SHIELD_FORE + 2 * c2, 96)
    P["absB"] = (30 + 3 * c2, 120 - 4 * c2, 76 + 3 * s1, -4)
    return P


def _atk_keys():
    ready = stance()
    wind1 = dict(root=(-2.5, -1.2), hips=-4, spine=-6, chest=-7, neck=2, head=2,
                 footF=(10.0, G0, 4.0), footB=(-11.0, G0, 0.0), absF=(26, SHIELD_FORE + 4, 96), absB=(150, 205, 150, -10))
    wind2 = dict(root=(-4.0, -0.6), hips=-8, spine=-11, chest=-9, neck=3, head=4,
                 footF=(10.5, G0 + 1.4, 14.0), footB=(-11.5, G0, 0.0), absF=(28, SHIELD_FORE + 6, 96), absB=(170, 232, 196, -12))
    wind3 = dict(wind2, root=(-4.4, -0.4), spine=-12, absB=(173, 236, 202, -12))
    chop = dict(root=(4.0, -5.0), hips=14, spine=10, chest=5, neck=-5, head=-4,
                footF=(15.0, G0, 0.0), footB=(-11.0, G0 + 0.5, -16.0), absF=(30, SHIELD_FORE - 4, 96), absB=(128, 120, 66, -6))
    impact = dict(root=(7.0, -8.0), hips=18, spine=12, chest=7, neck=-9, head=-7,
                  footF=(16.0, G0, 0.0), footB=(-11.0, G0 + 0.8, -22.0), absF=(40, SHIELD_FORE - 8, 96), absB=(92, 70, -26, -4))
    held = dict(impact, root=(7.2, -8.3), hips=19)
    rebound = dict(impact, root=(6.4, -7.2), hips=16, spine=10, absB=(96, 80, -14, -4), absF=(34, SHIELD_FORE - 4, 96))
    rec = dict(root=(2.6, -3.2), hips=8, spine=5, chest=3, neck=-4, head=-4,
               footF=(12.0, G0, 0.0), footB=(-10.5, G0, -4.0), absF=(26, SHIELD_FORE, 96), absB=(50, 96, 40, -4))
    keys = MO.flip_torso([(65, wind1), (135, wind2), (245, wind3), (268, chop), (290, impact), (400, held),
                          (470, rebound), (560, rec)])
    return [(0, ready)] + keys + [(680, ready)]


_ATK = _atk_keys()


def hit(t):
    return MO.knock_hit(stance(), t, dict(absF=(12, SHIELD_FORE + 14, 96), absB=(10, 70, 60, -8)))


def die(t):
    base = stance()
    base["pel"] = (0.0, B.PELV * H + base.pop("root")[1])
    base.pop("absF")
    base.pop("absB")
    base["armF"] = (22, 74, 0)
    base["armB"] = (28, 90, -10, -4)
    return MO.fall_back(base, t, H, G0)


def pose(ctx, clip, t):
    P = {"idle": idle, "walk": walk, "hit": hit, "die": die}.get(clip)
    BODY.apply(ctx["rig"], P(t) if P else B.keyed(_ATK, t))


def clips():
    cl = MO.biped_clips(attack_blur={3: 24},
                        die_fx=[{"id": "fx.dust_poof", "atMs": 595, "offsetLu": [-22, 8], "scale": 0.7}],
                        dust=dict(t0=236, origin=(-24, 0), spread=22, size=9.5))
    return cl
