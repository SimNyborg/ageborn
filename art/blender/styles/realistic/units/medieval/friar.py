"""Friar: Medieval Age support (heals allies; sling, rock projectile), realistic style. heightLu 64.

A stout, round-faced mendicant friar with a tonsured head: an undyed grey-brown wool habit to the
ankles with wide sleeves, a team-dyed scapular hanging front and back and a team cowl folded on his
shoulders, a knotted rope cincture with a long hanging end, leather sandals. He hugs a leather-bound
prayer book in the far arm and slings stones with a braided leather sling in the near hand. Attack:
coil and hold, a whipping overhead swing (smear), release level toward the enemy (the projectile
leaves the pouch, the per-frame `muzzle`), follow-through. Hit: knocked back. Die: a heavy fall on
his back, a bounce, dust.
"""
import math

from lib import biped as B
from lib import core as C
from lib import mats as M
from lib import medieval as MD
from lib import motion as MO

SLUG = "friar"
NAME = "Friar"
AGE = "medieval"
KIND = "unit"
HEIGHT_LU = 64
PX1 = 1.23
SCALE1 = 1.5
H = 62.0
CANVAS = (166, 112)
FEET = (100, 9)
YAW = -24.0
ANCHORS = {"head": (2, 62), "hitCenter": (0, 30), "muzzle": (39, 27)}

BODY = B.Biped(H=H, bulk=1.16)
K = BODY.k
FIST = (0.35 * K, -BODY.sw, 31.0 * K)
CORD = 14.0 * K
POUCH = (FIST[0], FIST[1], FIST[2] - CORD)
TRACKERS = {"muzzle": ("sling", POUCH)}
EXTRA_BONES = {"sling": (FIST, (FIST[0], FIST[1], FIST[2] - CORD), "hand_F"),
               "cord": ((3.0 * K, -3.5 * K, 36.0 * K), (3.6 * K, -4.0 * K, 22.0 * K), "hips")}

STANCE = 0.62
STRIDE = 20.0
WALK = {"strideLu": STRIDE * math.cos(math.radians(YAW)) / STANCE}
G0 = B.ANKLE * H
SMEAR_COLOR = "#a89880"
SMEAR_ALPHA = 0.55
SMEAR_N = 44


def build():
    k = K
    skin = M.skin("#b89078")
    hair = M.hair("#5a4432")
    eye = M.eye()
    habit = C.mat("habit", "#66574a", rough=0.92, noise=0.06, nscale=2.4, bump=0.3, sheen=0.5)
    team = MD.team_wool()
    rope = M.rope("#b2a27e", name="cincture")
    leather = M.leather("#4e3b2e")
    lthin = M.rawhide("#8a7458", name="cord")
    stone = M.stone("#8a8680", "#6d6a66", name="rock", bump=0.5)
    book = M.leather("#5a3a2c", name="book")
    pages = MD.linen("#d6ccb4", name="pages")
    brass = MD.brass()

    rig = C.Rig("friar_rig", BODY.bones(extra=EXTRA_BONES), yaw_deg=YAW)
    MD.dressed_body(rig, BODY, skin, habit, skin, torso_mat=habit)
    Sx = MD.S(k)
    bw = BODY.bulk
    # the habit: a full robe from the waist to the ankles (follows the legs), a belly under it
    robe = C.blobs("robe", [
        (Sx(0.4, 0, 35.0), (5.6 * bw, 7.2 * bw, 4.2)),
        (Sx(0.3, 0, 27.0), (6.2 * bw, 7.8 * bw, 6.0)),
        (Sx(0.2, 0, 17.0), (7.0 * bw, 8.4 * bw, 6.4)),
        (Sx(0.0, 0, 8.2), (7.6 * bw, 8.8 * bw, 4.8)),
    ], habit, res=0.4 * k)
    C.displace(robe, 0.35 * k, 0.9)
    rig.skin(robe, ["hips", "thigh_F", "thigh_B", "shin_F", "shin_B"], soft=3.2 * k,
             bias={"hips": 1.0 * k, "shin_F": 1.2 * k, "shin_B": 1.2 * k})
    body = C.blobs("habit_top", [(Sx(1.4, 0, 41.6), (5.4 * bw, 6.6 * bw, 6.4)), (Sx(0.0, 0, 48.0), (5.5 * bw, 7.2 * bw, 6.9))],
                   habit, res=0.4 * k)
    C.displace(body, 0.3 * k, 1.4)
    rig.skin(body, ["hips", "spine", "chest"], soft=2.0 * k)
    # wide bell sleeves
    for s, y in (("F", -BODY.sw / k), ("B", BODY.sw / k)):
        sl = C.blobs("sleeve_" + s, [(Sx(0.2, y, 38.2), (3.3, 3.2, 2.8)), (Sx(0.0, y, 42.4), (2.8, 2.8, 2.6))], habit, res=0.3 * k)
        rig.skin(sl, ["forearm_" + s], soft=1.4 * k)
        sd = C.blobs("sandal_" + s, [(Sx(3.2, (-1 if s == "F" else 1) * BODY.hw / k, 0.7), (4.8, 2.3, 0.7)),
                                    (Sx(1.6, (-1 if s == "F" else 1) * BODY.hw / k, 2.4), (1.2, 2.3, 0.5))], leather, res=0.3 * k)
        rig.skin(sd, ["foot_" + s], soft=1.0 * k)
    # the team scapular (front and back panels) and the team cowl folded on the shoulders
    for nm, sg, fwd in (("scap_f", 1, 1.3), ("scap_b", -1, 0.0)):
        sc = C.blobs(nm, [(Sx(sg * (6.6 + fwd) + 0.6, 0, 43.0), (1.3, 5.2, 8.4)), (Sx(sg * (7.6 + fwd) + 0.4, 0, 31.0), (1.2, 5.0, 5.6)),
                          (Sx(sg * (8.4 + fwd * 0.8) + 0.3, 0, 21.0), (1.1, 4.8, 5.0))], team, res=0.3 * k)
        C.displace(sc, 0.3 * k, 1.0)
        C.team(sc)
        rig.skin(sc, ["hips", "spine", "chest", "thigh_F", "thigh_B"], soft=3.0 * k, bias={"thigh_F": 2.0 * k, "thigh_B": 2.0 * k})
    cowl = C.blobs("cowl", [(Sx(-1.2, 0, 55.0), (4.8, 8.2, 2.8)), (Sx(-3.6, 0, 52.0), (3.0, 6.8, 4.8)),
                            (Sx(1.8, -4.8, 54.2), (2.6, 2.6, 2.2)), (Sx(1.8, 4.8, 54.2), (2.6, 2.6, 2.2)),
                            (Sx(-5.2, 0, 48.0), (1.8, 4.8, 3.2))], team, res=0.3 * k)
    C.displace(cowl, 0.45 * k, 1.2)
    C.team(cowl)
    rig.skin(cowl, ["chest", "neck"], soft=2.0 * k, bias={"neck": 2.0 * k})
    # rope cincture with a knotted hanging end (follows through)
    cin = C.blobs("cincture", [(Sx(0.4, 0, 37.6), (6.0 * bw, 7.9 * bw, 0.75))], rope, res=0.3 * k)
    rig.skin(cin, ["hips", "spine"], soft=2.0 * k)
    end = C.tube("rope_end", [Sx(3.0, -3.8, 36.6), Sx(3.4, -4.2, 29.0), Sx(3.6, -4.2, 22.0)], [0.5 * k] * 3, rope, seg=6)
    rig.skin(end, ["hips", "cord"], soft=2.0 * k, bias={"hips": 3.0 * k})
    for z in (31.0, 25.0):
        rig.rigid(C.sphere("knot", 0.8 * k, rope, loc=Sx(3.3, -4.2, z)), "cord")
    # head: tonsure, shaven round face
    MD.face(rig, BODY, hair, eye, beard=None, moustache=False, hair="tonsure")
    # the prayer book hugged to the chest (far arm)
    bx, by, bz = FIST[0] + 1.6 * k, BODY.sw - 0.6 * k, FIST[2] + 1.8 * k
    bk = C.box("book", 1.6 * k, 5.2 * k, 6.4 * k, book, bevel=0.35 * k, loc=(bx, by, bz))
    pg = C.box("pages", 1.4 * k, 4.9 * k, 6.1 * k, pages, bevel=0.1 * k, loc=(bx + 0.35 * k, by - 0.1 * k, bz))
    cl = C.box("clasp", 1.8 * k, 0.5 * k, 1.0 * k, brass, bevel=0.1 * k, loc=(bx + 0.1 * k, by - 2.7 * k, bz))
    for o in (bk, pg, cl):
        MD.rot_about(o, (bx, by, bz), 8, "Y")
        rig.rigid(o, "hand_B")

    # the sling: two braided cords from the fist to a pouch holding a stone
    fx, fy, fz = FIST
    parts = []
    for dy in (-0.9, 0.9):
        parts.append(C.tube("cord", [(fx, fy, fz - 0.5 * k), (fx + 0.2 * k, fy + dy * 0.5 * k, fz - CORD * 0.55),
                                     (fx, fy + dy * k, fz - CORD + 1.4 * k)], [0.26 * k] * 3, lthin, seg=6))
    parts.append(C.blobs("sling_pouch", [((fx, fy, fz - CORD - 0.4 * k), (1.7 * k, 1.5 * k, 1.1 * k))], lthin, res=0.3))
    for o in parts:
        o["weapon"] = 1
        rig.rigid(o, "sling")
    rock = C.blobs("sling_rock", [((fx, fy - 0.2 * k, fz - CORD + 0.3 * k), (1.8 * k, 1.7 * k, 1.6 * k))], stone, res=0.3)
    C.displace(rock, 0.25 * k, 0.6)
    rock["weapon"] = 1
    rig.rigid(rock, "sling")
    return dict(rig=rig, rock=rock)


# ------------------------------------------------------------------------------------ poses
BOOK_ARM = (6, 88, 4, -14)


def stance():
    return dict(root=(0.0, -1.0), hips=0, spine=1, chest=0, neck=0, head=-5,
                footF=(7.0, G0, 0.0), footB=(-7.5, G0, 0.0),
                absF=(10, 22, 22), sling=6, absB=BOOK_ARM, cord=0)


def _apply(ctx, P):
    P = dict(P)
    ha = P["absF"][2]
    bones = dict(P.pop("bones", {}))
    bones["sling"] = P.pop("sling", 0.0) - ha
    bones["cord"] = P.pop("cord", 0.0)
    P["bones"] = bones
    BODY.apply(ctx["rig"], P)


def idle(t):
    a = 2 * math.pi * t / 920.0
    P = MO.breathe(stance(), t, amp=1.1, arms=False)
    P["absF"] = (10 + 3 * math.sin(a - 0.5), 22 + 4 * math.sin(a - 0.9), 22 + 4 * math.sin(a - 0.9))
    P["absB"] = (BOOK_ARM[0] + 1.5 * math.sin(a), BOOK_ARM[1] + 2 * math.sin(a - 0.4), BOOK_ARM[2], BOOK_ARM[3])
    P["sling"] = 6 + 7 * math.sin(a - 1.8)
    P["cord"] = 4 * math.sin(a - 1.2)
    return P


def walk(t):
    P, ph, s1, c2 = MO.walk_legs(t, STRIDE, 3.4, STANCE, G0, lean=2.0, twist=5.0)
    sw = -18 * s1 + 4
    P["absF"] = (sw, sw + 14 + 6 * max(0, -s1), sw + 14 + 6 * max(0, -s1))
    P["absB"] = (BOOK_ARM[0] + 2 * c2, BOOK_ARM[1], BOOK_ARM[2], BOOK_ARM[3])
    lag = -20 * math.sin(2 * math.pi * ph - 1.1)
    P["sling"] = sw * 0.4 + lag + 4
    P["cord"] = 10 * math.sin(2 * math.pi * ph - 1.3)
    return P


def _atk_keys():
    ready = stance()
    coil = dict(root=(-2.0, -1.6), hips=-4, spine=-6, chest=-6, neck=2, head=3, footF=(8.0, G0, 4.0),
                footB=(-8.5, G0, 0.0), absF=(-50, -40, -40), sling=-25, absB=BOOK_ARM, cord=6)
    cock = dict(root=(-3.4, -1.0), hips=-8, spine=-12, chest=-10, neck=5, head=6, footF=(9.0, G0 + 1.2, 14.0),
                footB=(-9.0, G0, 0.0), absF=(-128, -150, -150), sling=-80, absB=BOOK_ARM, cord=10)
    cock2 = dict(cock, root=(-3.7, -0.8), spine=-13, absF=(-133, -158, -158), sling=-88)
    whip = dict(root=(1.0, -2.5), hips=6, spine=4, chest=2, neck=-2, head=-2, footF=(10.0, G0, 2.0),
                footB=(-8.5, G0 + 0.4, -10.0), absF=(172, 182, 182), sling=-110, absB=BOOK_ARM, cord=-6)
    release = dict(root=(3.6, -4.0), hips=12, spine=9, chest=5, neck=-7, head=-6, footF=(12.0, G0, 0.0),
                   footB=(-8.5, G0 + 0.8, -18.0), absF=(104, 96, 96), sling=112, absB=BOOK_ARM, cord=-14)
    follow = dict(root=(4.2, -5.2), hips=16, spine=12, chest=6, neck=-8, head=-6, footF=(12.5, G0, 0.0),
                  footB=(-8.0, G0 + 1.0, -20.0), absF=(30, 26, 26), sling=70, absB=BOOK_ARM, cord=-10)
    rec = dict(root=(2.0, -2.8), hips=8, spine=6, chest=3, neck=-5, head=-4, footF=(9.0, G0, 0.0),
               footB=(-7.5, G0, -4.0), absF=(-18, -40, -40), sling=-14, absB=BOOK_ARM, cord=-4)
    keys = MO.flip_torso([(65, coil), (135, cock), (250, cock2), (268, whip), (290, release), (430, follow),
                          (510, rec), (600, dict(rec, absF=(0, 0, 0), sling=0))])
    return [(0, ready)] + keys + [(680, ready)]


_ATK = _atk_keys()


def pose(ctx, clip, t):
    ctx["rock"].hide_render = clip == "attack" and 280 <= t < 580
    if clip == "idle":
        P = idle(t)
    elif clip == "walk":
        P = walk(t)
    elif clip == "attack":
        P = B.keyed(_ATK, t)
    elif clip == "hit":
        P = MO.knock_hit(stance(), t, dict(absF=(40, 90, 90), sling=70, absB=(BOOK_ARM[0] - 6, BOOK_ARM[1] + 10, BOOK_ARM[2], -10),
                                           cord=18))
    else:
        base = stance()
        base["pel"] = (0.0, B.PELV * H + base.pop("root")[1])
        base.pop("absB")
        base["armB"] = (14, 104, 30, -10)
        P = MO.fall_back(base, t, H, G0, smooth=True)
        P.pop("absF", None)
        P["absF"] = _die_arm(t)
        P["sling"] = _die_arm(t)[2] - 20
        P["cord"] = 20
        P["armB"] = (14, 104, 30, -10)
    _apply(ctx, P)


def _die_arm(t):
    keys = [(0, (10, 22, 22)), (120, (80, 120, 120)), (238, (215, 240, 240)), (290, (205, 228, 228)),
            (360, (238, 262, 262)), (695, (240, 264, 264))]
    return tuple(B.keyed([(tk, {"a": v}) for tk, v in keys], t)["a"])


def clips():
    return MO.biped_clips(attack_blur={3: 22},
                          die_fx=[{"id": "fx.dust_poof", "atMs": 595, "offsetLu": [-20, 8], "scale": 0.62}],
                          dust=dict(t0=236, origin=(-22, 0), spread=21, size=9.0))
