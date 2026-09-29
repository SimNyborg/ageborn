"""Bronze Colossus: Bronze Age Legendary siege heavy (Stomp: splash, slow; Molten Heart: a burst on
death), realistic style. heightLu 200.

A walking temple statue of a hoplite, cast in bronze and three times the height of a man: the
idealised anatomy of a Riace bronze under a muscle cuirass, dark aged metal streaked with verdigris
in every crease, a Corinthian helmet with glowing eye slits and a towering team horsehair crest, a
team sash across the chest and a skirt of team leather pteruges. The casting has split at the
joints: white-hot seams glow at the neck, shoulders, elbows and knees, and a molten heart burns in a
jagged crack in the chest. The near hand holds a leaf-bladed sword, the far arm a great round shield
(team paint, bronze rim, a pale lambda).

Idle: slow, heavy breathing; the crest sways. Walk: a ponderous stride (1.4 s a cycle), feet planted.
Attack: the sword rises two-handed high over the head (held), a smeared chop into the ground with a
stomp of the front foot (dust bursts), a held impact, a heavy recovery. Hit: a small recoil (it is
very heavy), the seams flare. Die: it staggers, drops onto one knee, the seams and the heart flare
white-hot (the Molten Heart burst, `burstAtMs`), then it topples forward onto its face in a great
cloud of dust.
"""
import math

import bpy

from lib import biped as B
from lib import bronze as BZ
from lib import core as C
from lib import game as G
from lib import mats as M
from lib import motion as MO

SLUG = "bronze_colossus"
NAME = "Bronze Colossus"
AGE = "bronze"
KIND = "unit"
HEIGHT_LU = 200
PX1 = 1.025
SCALE1 = 1.25
H = 170.0
CANVAS = (270, 250)
FEET = (140, 12)
YAW = -24.0
ANCHORS = {"head": (6, 196), "hitCenter": (0, 104)}

BODY = B.Biped(H=H, bulk=1.06)
K = BODY.k
FIST = (0.35 * K, -BODY.sw, 31.0 * K)
SWORD_L = 19.0 * K
TRACKERS = {"swordTip": ("hand_F", (FIST[0] + 2.6 * K + SWORD_L, FIST[1], FIST[2]))}
EXTRA_BONES = {"crest": ((-0.6 * K, 0, 70.6 * K), (-7.0 * K, 0, 67.0 * K), "head")}
SHIELD_R = 14.0 * K

STANCE = 0.64
STRIDE = 22.0 * K
WALK = {"strideLu": STRIDE * math.cos(math.radians(YAW)) / STANCE}
G0 = B.ANKLE * H
SMEAR_COLOR = "#c4b69c"
SMEAR_ALPHA = 0.55
SMEAR_N = 30
TEAM_GAMMA = 2.2

ATK_T = [0, 170, 340, 548, 570, 750, 840, 1020, 1120]
DIE_SEQ = [0, 1, 2, 3, 3, 4, 4, 5, 6, 6, 7, 7]
DIE_MS = [70, 80, 90, 80, 70, 60, 70, 90, 100, 110, 110, 120]


def build():
    k = K
    m = BZ.kit()
    statue = BZ.cast_bronze("statue", "#6e6450", "#5a7868", rough=0.42, dist=12.0, gain=1.5, streak=0.34)
    armour = BZ.cast_bronze("armour", "#7a6c52", "#5d786a", rough=0.38, dist=9.0, gain=1.2, streak=0.26)
    glow = C.emit_mat("seam", "#ffb35c", 7.0)
    core_m = C.emit_mat("heart", "#ffe0a0", 14.0)
    rig = C.Rig("colossus_rig", BODY.bones(extra=EXTRA_BONES), yaw_deg=YAW)
    BODY.body(rig, statue, res=0.9)
    S = lambda x, y, z: (x * k, y * k, z * k)
    bw = BODY.bulk

    # muscle cuirass (a second, slightly larger cast shell over the torso) with a rolled lower edge
    cu = C.blobs("cuirass", [(S(0.3, 0, 41.4), (4.3 * bw, 6.1 * bw, 5.2)), (S(-0.2, 0, 48.0), (4.95 * bw, 7.0 * bw, 6.9)),
                             (S(2.05, -3.2, 50.4), (3.05, 3.6, 2.95)), (S(2.05, 3.2, 50.4), (3.05, 3.6, 2.95)),
                             (S(1.6, 0, 42.6), (2.9, 4.0, 2.8)), (S(-2.2, 0, 49.4), (3.1, 6.6 * bw, 5.8))], armour, res=1.0)
    rig.skin(cu, ["hips", "spine", "chest"], soft=2.0 * k)
    edge = C.blobs("cuirassedge", [(S(0.2, 0, 37.6), (4.7 * bw, 6.5 * bw, 0.9))], m["polished"], res=0.9)
    rig.skin(edge, ["hips", "spine"], soft=2.0 * k)
    BZ.pteruges(rig, BODY, M.team_hide("team_leather"), n=16, z0=37.4, z1=29.4, width=2.4)
    kilt = C.blobs("underkilt", [(S(0.0, 0, 33.4), (5.6 * bw, 7.6 * bw, 3.6))], statue, res=1.0)
    rig.skin(kilt, ["hips", "thigh_F", "thigh_B"], soft=3.0 * k, bias={"thigh_F": 1.2 * k, "thigh_B": 1.2 * k})

    # the molten heart: a jagged crack in the chest with a white-hot core
    heart = C.blobs("heart", [(S(4.6 * bw, -1.0, 48.6), (1.2, 2.3, 3.0))], core_m, res=0.6)
    rig.rigid(heart, "chest")
    for i, pts in enumerate(([(4.9, -1.0, 51.4), (5.0, -2.2, 54.0), (4.6, -3.6, 55.2)], [(5.0, -0.2, 46.0), (5.0, 1.2, 43.6)],
                             [(4.9, -2.4, 48.0), (4.7, -4.8, 47.0), (4.2, -6.2, 45.2)])):
        cr = C.tube(f"crack{i}", [S(x * bw, y, z) for x, y, z in pts], [0.45 * k] * len(pts), glow, seg=6)
        rig.rigid(cr, "chest")
    ctx_glow = [glow, core_m]

    # team sash from the far shoulder across the chest to the near hip, a dark leather hem, a bronze knot
    sash_pts = [S(-1.0, 6.2, 55.4), S(2.4, 4.6, 54.2), S(5.1 * bw, 1.4, 50.4), S(5.2 * bw, -2.6, 45.0), S(4.6 * bw, -5.8, 40.4),
                S(2.2, -7.4 * bw, 38.4)]
    sash = C.tube("sash", sash_pts, [2.2 * k] * 6, m["team_cloth"], seg=12, flat=0.35)
    C.displace(sash, 0.25 * k, 1.0)
    C.team(sash)
    rig.skin(sash, ["spine", "chest"], soft=2.4 * k)
    hem = C.tube("sashhem", [(x, y, z - 0.3 * k) for x, y, z in sash_pts], [2.45 * k] * 6, m["leather"], seg=12, flat=0.22)
    rig.skin(hem, ["spine", "chest"], soft=2.4 * k)
    rig.rigid(C.sphere("sashknot", 1.4 * k, m["polished"], loc=S(3.4, -6.8 * bw, 39.4)), "hips")

    # the seams: white-hot rings where the casting has split
    for nm, c, bone, r in (("neckseam", S(0.5, 0, 57.6), "neck", 2.6), ("kneeF", S(0.6, -BODY.hw / k, 19.6), "shin_F", 2.7),
                           ("kneeB", S(0.6, BODY.hw / k, 19.6), "shin_B", 2.7)):
        rig.rigid(BZ.ring(nm, c, (0, 0, 0), r * k * bw, 0.35 * k, glow), bone)
    for s, y in (("F", -BODY.sw / k), ("B", BODY.sw / k)):
        rig.rigid(BZ.ring("shoulder" + s, S(0.0, y, 52.2), (0, 0, 0), 2.75 * k * bw, 0.35 * k, glow), "upperarm_" + s)
        rig.rigid(BZ.ring("elbow" + s, S(-0.2, y, 43.0), (0, 0, 0), 2.05 * k * bw, 0.3 * k, glow), "forearm_" + s)

    # Corinthian helmet (armour bronze), crest, glowing eye slits, a curled bronze beard
    hm = dict(m, bronze=armour)
    BZ.helmet(rig, k, hm, "corinthian")
    BZ.crest(rig, k, m, bone="crest", height=5.4)
    for y in (-1.5, 1.5):
        rig.rigid(C.blobs("eyeslit", [(S(4.95, y, 63.4), (0.6, 1.0, 0.36))], glow, res=0.35), "head")
    beard = C.blobs("beard", [(S(3.9, 0, 58.9), (1.6, 2.0, 1.8))], statue, res=0.5)
    C.displace(beard, 0.5 * k, 0.4)
    rig.rigid(beard, "head")

    # greaves and bracers (polished), sandal straps
    BZ.greaves(rig, BODY, m, mat=armour)
    BZ.sandals(rig, BODY, dict(m, leather=statue))
    BZ.bracers(rig, BODY, m, mat=m["polished"])

    # the shield on the far forearm, face forward and out
    sw = BODY.sw
    el_z = B.ELBOW * H
    nrm = (0.866, 0.5, 0.0)
    ctr = (nrm[0] * 4.0 * k, sw + 3.0 * k, el_z - 4.0 * k)
    for o in BZ.aspis(dict(m, polished=armour), SHIELD_R, name="cshield", emblem=("lambda", "ring")):
        C.xform(o, rot=(0, math.radians(90), 0))
        C.xform(o, rot=(0, 0, math.radians(-8)))
        C.xform(o, loc=ctr)
        rig.rigid(o, "forearm_B")

    sword = BZ.xiphos(dict(m, bronze=armour), FIST, length=SWORD_L - 2.6 * k, r=k)
    for o in sword:
        o["weapon"] = 1
        rig.rigid(o, "hand_F")
    return dict(rig=rig, glow=ctx_glow)


# ------------------------------------------------------------------------------------ poses
def shield(up=14.0, fore=34.0, hand=40.0):
    return (up, fore, hand, -6)


def stance(breath=0.0):
    return dict(root=(0.0, -2.8), hips=0, spine=-1.5 + 1.0 * breath, chest=-2 - 1.0 * breath, neck=1, head=-7 - 0.6 * breath,
                footF=(10.0 * K, G0, 0.0), footB=(-10.5 * K, G0, 0.0),
                absF=(12 + 1.5 * breath, 52 + 2 * breath, 20), absB=shield(14 + breath, 34), bones={"crest": 0})


def idle(t):
    a = 2 * math.pi * t / 900.0
    b = math.sin(a)
    P = stance(breath=1.6 * b)
    P["root"] = (0.0, -2.8 - 0.8 * b)
    P["root_dy"] = 1.8 * math.sin(a + 0.8)
    P["hips"] += 1.0 * math.sin(a + 0.8)
    P["head"] += 2.5 * math.sin(a + 0.3)
    P["bones"] = {"crest": 4.0 * math.sin(a - 1.3)}
    return P


def walk(t):
    P, ph, s1, c2 = MO.walk_legs(t, STRIDE, 5.0 * K, STANCE, G0, cycle=1400.0, bob=2.2 * K, lean=3.0, twist=6.0)
    P["root"] = (1.2 * K, P["root"][1] - 1.6)
    P["absF"] = (12 - 10 * s1, 50 - 8 * s1, 22)
    P["absB"] = shield(16 + 6 * s1, 36)
    P["bones"] = {"crest": -5 - 5 * c2}
    return P


def _atk_keys():
    ready = stance()
    G1 = G0
    # lift: weight back, the sword comes up past the face
    lift = dict(root=(-3.0, -3.4), hips=-3, spine=-5, chest=-4, neck=2, head=-2, footF=(11.0 * K, G1, 4.0), footB=(-11.0 * K, G1, 0.0),
                absF=(150, 180, 110), absB=shield(24, 50), bones={"crest": 6})
    # wind: high overhead, the body arched back, the front foot lifted for the stomp (held)
    wind = dict(root=(-7.0, -2.0), hips=-8, spine=-12, chest=-8, neck=4, head=2, footF=(12.5 * K, G1 + 8.0, 18.0),
                footB=(-11.5 * K, G1, 0.0), absF=(172, 205, 170), absB=shield(34, 60), bones={"crest": 12})
    wind2 = dict(wind, root=(-7.6, -1.8), spine=-13, absF=(174, 208, 172))
    # chop: the smear frame, mid-swing
    chop = dict(root=(6.0, -7.0), hips=10, spine=10, chest=5, neck=-4, head=-4, footF=(15.0 * K, G1 + 1.0, 0.0),
                footB=(-11.0 * K, G1 + 0.5, -12.0), absF=(120, 120, 60), absB=shield(0, 20), bones={"crest": -8})
    # impact: the blade driven into the ground in front, the front foot stamped down, knees bent
    impact = dict(root=(10.0, -15.0), hips=18, spine=14, chest=8, neck=-8, head=-6, footF=(17.0 * K, G1, 0.0),
                  footB=(-11.0 * K, G1 + 1.0, -22.0), absF=(64, 70, -52), absB=shield(-12, 10), bones={"crest": -16})
    held = dict(impact, root=(10.3, -15.6), hips=19, bones={"crest": -12})
    rebound = dict(impact, root=(9.2, -13.4), hips=16, spine=12, absF=(66, 76, -40), bones={"crest": -4})
    rec = dict(root=(4.0, -6.0), hips=8, spine=5, chest=2, neck=-4, head=-6, footF=(12.5 * K, G1, 0.0), footB=(-10.8 * K, G1, -4.0),
               absF=(30, 60, 20), absB=shield(10, 30), bones={"crest": 4})
    keys = MO.flip_torso([(170, lift), (340, wind), (525, wind2), (548, chop), (570, impact), (750, held), (840, rebound),
                          (1020, rec)])
    return [(0, ready)] + keys + [(1230, ready)]


_ATK = _atk_keys()


def hit(t):
    P = MO.knock_hit(stance(), t, dict(absF=(24, 70, 30), absB=shield(4, 20), bones={"crest": 10}), back=3.5)
    return P


def die(t):
    pz = B.PELV * H
    Ls = BODY.L_shin
    base = stance()
    base["pel"] = (0.0, pz + base.pop("root")[1])
    k1 = dict(base, pel=(-5.0, pz - 3.0), hips=6, spine=6, chest=4, neck=6, head=10, footF=(8.0 * K, G0 + 4.0, 10.0),
              footB=(-12.0 * K, G0, 0.0), absF=(60, 110, 60), absB=shield(40, 70), bones={"crest": 12})
    k2 = dict(k1, pel=(0.0, pz - 18.0), root_r=-6, hips=-6, spine=-8, chest=-6, neck=-2, head=-6, footF=(14.0 * K, G0, 0.0),
              footB=(-12.0 * K, G0 + 6.0, -40.0), absF=(20, 40, -30), absB=shield(10, 40), bones={"crest": 4})
    # on one knee: the far knee on the ground, the near foot planted, the torso bowed
    kneel = dict(k2, pel=(4.0, Ls + 8.0), root_r=-10, hips=-8, spine=-12, chest=-8, neck=-6, head=-8,
                 footF=(20.0 * K, G0, 0.0), footB=(4.0 - Ls - 6.0, G0 + 2.0, -70.0), absF=(10, 30, -60), absB=shield(0, 20))
    # the burst: arched back, arms flung out, head thrown back (the seams flare)
    burst = dict(kneel, pel=(2.0, Ls + 11.0), root_r=4, hips=8, spine=14, chest=10, neck=10, head=18,
                 absF=(110, 150, 120), absB=shield(80, 120), bones={"crest": 24})
    # toppling forward onto the face
    fall = dict(kneel, pel=(16.0, Ls * 0.7), root_r=-58, hips=-6, spine=-4, chest=-2, neck=6, head=10,
                footF=(10.0, G0 + 6.0, 30.0), footB=(-24.0, G0 + 4.0, -60.0), absF=(40, 60, 30), absB=shield(50, 60), bones={"crest": 0})
    down = dict(fall, pel=(30.0, 13.0), root_r=-88, hips=-2, spine=0, chest=0, neck=8, head=12,
                footF=(-30.0, 12.0, 70.0), footB=(-36.0, 14.0, 60.0), absF=(96, 100, 100), absB=shield(80, 90), bones={"crest": -20})
    bounce = dict(down, pel=(30.5, 16.0), root_r=-84, neck=4, head=6, bones={"crest": -30})
    rest = dict(down, pel=(30.8, 12.6), root_r=-89, neck=9, head=13, bones={"crest": -24})
    keys = [(0, base), (70, k1), (150, k2), (240, kneel), (330, dict(kneel, pel=(4.0, Ls + 7.0))), (390, burst),
            (450, dict(burst, root_r=0)), (520, fall), (610, down), (700, bounce), (820, rest), (1050, rest)]
    return B.keyed(keys, t)


def glow_level(clip, t):
    if clip == "die":
        return B.keyed([(0, {"g": 1.0}), (240, {"g": 1.2}), (330, {"g": 2.2}), (390, {"g": 4.0}), (450, {"g": 3.0}),
                        (610, {"g": 0.6}), (820, {"g": 0.25}), (1050, {"g": 0.2})], t)["g"]
    if clip == "hit":
        return B.keyed([(0, {"g": 1.0}), (55, {"g": 2.0}), (200, {"g": 1.2}), (310, {"g": 1.0})], t)["g"]
    if clip == "idle":
        return 1.0 + 0.15 * math.sin(2 * math.pi * t / 900.0)
    return 1.0


def pose(ctx, clip, t):
    g = glow_level(clip, t)
    for mt, base in zip(ctx["glow"], (7.0, 14.0)):
        for n in mt.node_tree.nodes:
            if n.type == "EMISSION":
                n.inputs["Strength"].default_value = base * g
                c = min(1.0, max(0.0, (g - 1.0) / 3.0))
                col0 = C.col("#ffb35c" if base < 10 else "#ffe0a0")
                n.inputs["Color"].default_value = tuple(col0[i] + (1.0 - col0[i]) * c * 0.8 for i in range(3)) + (1.0,)
    P = {"idle": idle, "walk": walk, "hit": hit, "die": die}.get(clip)
    BODY.apply(ctx["rig"], P(t) if P else B.keyed(_ATK, t))


def clips():
    atk = G.Clip("attack", MO.HEAVY_ATTACK_MS, sequence=MO.HEAVY_ATTACK_SEQ, impact=4, smear=3, times=ATK_T, blur={3: 40})
    for i, s in ((4, 0.04), (5, 0.3), (6, 0.5), (7, 0.75)):
        atk.fx[i] = {"s": s, "origin": (46, 0), "spread": 30, "n": 16, "size": 11.0, "seed": 4}
    die_c = G.Clip("die", DIE_MS, sequence=DIE_SEQ, extra={
        "fx": [{"id": "fx.dust_poof", "atMs": 820, "offsetLu": [30, 20], "scale": 1.9}], "burstAtMs": 390, "hideUnitAtMs": 1050})
    die_c.fx = MO.dust_frames(die_c, 600, span=560, origin=(34, 0), spread=48, size=15.0, seed=12)
    return [
        G.Clip("idle", MO.HEAVY_IDLE_MS, loop=True),
        G.Clip("walk", [175] * 8, loop=True),
        atk,
        G.Clip("hit", MO.HIT_MS, times=MO.HIT_TIMES),
        die_c,
    ]


SHEET_FACTOR = 0.9
