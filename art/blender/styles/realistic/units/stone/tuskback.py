"""Tuskback: Stone Age heavy (a war boar, gore), realistic style. heightLu 104 (pennant top).

A hulking wild boar: a huge shoulder hump under a bristly black mane ridge, a low wedge head with
a pale snout disc, small eyes and two big curved ivory tusks. A team war blanket is strapped over
its back under three lashed stone plates (it is armored), and a tall pole carries a team pennant
(every heavy carries one). Short stout legs, dark cloven hooves, a thin tufted tail. Walk: a heavy
four-beat trot with a rolling hump. Attack: the gore (dip the head and dig in, hold, a smeared
upward toss with the tusks at the top, held, recover). Die: the front legs buckle, it rolls onto
its side in a burst of dust.
"""
import math

from lib import biped as B
from lib import core as C
from lib import game as G
from lib import mats as M
from lib import motion as MO
from lib.quad import Quad

SLUG = "tuskback"
NAME = "Tuskback"
AGE = "stone"
KIND = "unit"
HEIGHT_LU = 104
PX1 = 1.23
SCALE1 = 1.5
CANVAS = (196, 128)
FEET = (100, 9)
YAW = -12.0
ANCHORS = {"head": (0, 100), "hitCenter": (0, 42)}

FORE = [(22, 58), (25, 37), (25.5, 16), (26.5, 5.5), (29, 0.9)]
HIND = [(-27, 56), (-20, 37), (-29.5, 20), (-27.5, 6), (-25, 0.9)]
Q = Quad(FORE, HIND, (0, 50), 7.5,
         neck=((28, 58), (38, 55)), head=((38, 55), (58, 34)), tail=((-39, 58), (-44, 51), (-46, 44)),
         jaw=((44, 42), (56, 34)), prefix="b_")
TRACKERS = {"tuskTip": ("b_head", (56.0, -5.0, 50.0))}
EXTRA_BONES = {"pole": ((-8, 0, 68), (-8, 0, 100), "b_body"),
               "flag": ((-8.5, 0, 99), (-24, 0, 95), "pole")}

DUTY = 0.62
STRIDE = 28.0
WALK = {"strideLu": STRIDE / DUTY * math.cos(math.radians(YAW))}
IDLE_MS = MO.HEAVY_IDLE_MS
WALK_MS = [115] * 8
ATK_T = [0, 170, 340, 548, 570, 750, 840, 1020, 1120]


def build():
    bristle = M.fur("#2e2824", "#1e1a18", name="bristle", bump=1.4)
    coat = M.fur("#4a3e36", "#352d28", name="boarcoat", bump=0.8)
    snout = C.mat("snout", "#8a6c62", rough=0.5, noise=0.12, nscale=1.0, bump=0.3)
    ivory = M.ivory()
    hoof = M.hoof()
    stone = M.stone("#8a8074", "#6a6258", name="plate")
    rope = M.rope("#8c7a5c")
    wood = M.wood("#6b5847", "#4e4035", name="pole")
    hide = M.team_hide()
    flagm = M.team_cloth(name="team_flag")
    eye = M.eye()
    leather = M.leather("#4b3b30")

    bones = Q.bones()
    bones.update(EXTRA_BONES)
    rig = C.Rig("boar_rig", bones, yaw_deg=YAW)
    p = Q.p
    body = C.blobs("boar_body", [
        ((18, 0, 51), (17, 14, 18)),          # shoulders
        ((14, 0, 64), (14, 11.5, 9)),         # hump
        ((0, 0, 50), (24, 13.5, 15)),         # barrel
        ((-24, 0, 50), (14, 12.5, 14)),       # hindquarters
        ((0, 0, 39), (22, 12, 7)),            # belly
        ((31, 0, 51), (10, 11, 13)),          # neck
        ((-21, 0, 38), (9, 12, 9)),           # hams
        ((22, 0, 36), (7, 12.5, 8)),          # elbows
    ], coat, res=0.9)
    C.displace(body, 0.9, 0.35)
    rig.skin(body, [p + "body", p + "pelvis", p + "neck", p + "foreS_F", p + "foreS_B", p + "hindT_F", p + "hindT_B"],
             soft=4.0, bias={p + "foreS_F": 4.0, p + "foreS_B": 4.0, p + "hindT_F": 4.0, p + "hindT_B": 4.0, p + "neck": 1.5})
    mane = C.blobs("mane", [((34 - 9 * i, 0, 60 + 2.2 * i - 0.2 * i * i), (5.5, 3.2, 4.2)) for i in range(6)],
                   bristle, res=0.5)
    C.displace(mane, 2.2, 1.0)
    rig.skin(mane, [p + "neck", p + "body"], soft=4)
    head = C.blobs("boar_head", [
        ((42, 0, 51), (9.5, 8.6, 9.5)),       # skull / jowls
        ((48, 0, 44), (7.2, 6.4, 6.4), (0, 0.6, 0)),
        ((53.5, 0, 39), (5.6, 5.0, 4.8), (0, 0.6, 0)),   # snout
        ((38, -6.6, 61), (2.4, 1.2, 4.2), (0.3, -0.3, 0)),   # ears
        ((38, 6.6, 61), (2.4, 1.2, 4.2), (-0.3, -0.3, 0)),
    ], coat, res=0.55)
    C.displace(head, 0.6, 0.5)
    rig.rigid(head, p + "head")
    rig.rigid(C.cyl("disc", 4.6, 4.4, 1.6, snout, seg=24, loc=(57.0, 0, 35.2), rot=(0, math.radians(128), 0),
                    scale=(0.85, 1.0, 1.0)), p + "head")
    for y in (-1.7, 1.7):
        rig.rigid(C.sphere("nostril", 0.7, M.dark(), loc=(58.2, y, 34.6), scale=(0.6, 1, 1)), p + "head")
    for y in (-5.6, 5.6):
        rig.rigid(C.sphere("eye", 0.9, eye, loc=(46.4, y, 50.2), scale=(0.6, 0.5, 0.6)), p + "head")
        s = 1 if y > 0 else -1
        tusk = C.tube("tusk", [(52.5, y * 0.72, 38.0), (55.8, y * 0.95, 39.6), (57.5, y * 1.08, 44.0), (56.5, y * 1.1, 49.5),
                               (54.2, y * 1.05, 52.0)], [1.45, 1.3, 1.05, 0.65, 0.12], ivory, seg=10)
        rig.rigid(tusk, p + "head")
    jaw = C.blobs("jaw", [((49, 0, 38.5), (6.6, 5.2, 2.6), (0, 0.5, 0))], coat, res=0.45)
    rig.rigid(jaw, p + "jaw")
    tail = C.tube("tail", [(-39, 0, 57), (-43, 0, 52), (-45.5, 0, 46)], [1.1, 0.8, 0.6], coat, seg=8)
    rig.skin(tail, [p + "tail", p + "tail2"], soft=2)
    tuft = C.blobs("tuft", [((-46.5, 0, 43), (1.4, 1.2, 2.6))], bristle, res=0.3)
    C.displace(tuft, 0.6, 1.0)
    rig.rigid(tuft, p + "tail2")

    for sd, y in Q.Y.items():
        fore = C.blobs("fore_" + sd, [((24.0, y, 30.0), (5.6, 4.6, 9.0)), ((25.2, y, 17.0), (3.8, 3.6, 5.2)),
                                      ((25.8, y, 8.5), (2.9, 2.8, 4.0))], coat, res=0.5)
        rig.skin(fore, Q.leg_bones("fore", sd), soft=1.4, bias={p + "foreS_" + sd: 2.5})
        hind = C.blobs("hind_" + sd, [((-22.0, y, 34.0), (7.0, 5.0, 10.5)), ((-26.5, y, 20.5), (4.2, 3.8, 6.0)),
                                      ((-27.8, y, 10.0), (3.0, 2.9, 5.0))], coat, res=0.5)
        rig.skin(hind, Q.leg_bones("hind", sd), soft=1.4, bias={p + "hindT_" + sd: 2.5})
        for nm, bone, x in (("fh", p + "foreP_" + sd, 28.2), ("hh", p + "hindP_" + sd, -25.0)):
            h = C.lathe(nm, [(0.0, 0.0), (2.9, 0.0), (2.5, 2.8), (1.9, 3.6), (0.0, 3.6)], hoof, seg=16,
                        loc=(x, y, 0.0), scale=(1.25, 0.95, 1.0))
            rig.rigid(h, bone)

    # team war blanket over the back, three lashed stone plates, girth ropes
    blanket = C.blobs("blanket", [((0, 0, 63.5), (24, 14.8, 4.0)), ((-6, 0, 62), (18, 15, 4)),
                                  ((0, -13.6, 52), (21, 2.2, 10)), ((0, 13.6, 52), (21, 2.2, 10))], hide, res=0.6)
    C.displace(blanket, 0.6, 0.7)
    C.team(blanket)
    rig.skin(blanket, [p + "body", p + "pelvis"], soft=6)
    for i, x in enumerate((12, -2, -16)):
        pl = C.blobs(f"plate{i}", [((x, 0, 68.5 - 0.8 * abs(x) / 8), (6.4, 9.5, 2.2))], stone, res=0.5)
        C.displace(pl, 1.0, 0.45)
        rig.skin(pl, [p + "body", p + "pelvis"], soft=6)
    for x in (6, -9):
        g = C.blobs("girth", [((x, 0, 50), (1.1, 15.3, 17.5))], rope, res=0.5)
        rig.skin(g, [p + "body", p + "pelvis"], soft=6)

    # the pennant pole and a team pennant
    pole = C.tube("pole", [(-8, 0, 66), (-8, 0, 101)], [0.9, 0.8], wood, seg=8)
    rig.rigid(pole, "pole")
    rig.rigid(C.sphere("finial", 1.4, leather, loc=(-8, 0, 101.8)), "pole")
    fl = C.tube("pennant", [(-8.6, 0, 97.0), (-14, 0, 96.2), (-19.5, 0, 95.2), (-25, 0, 94.0)],
                [4.0, 3.4, 2.4, 0.6], flagm, seg=10, flat=0.22)
    C.team(fl)
    rig.rigid(fl, "flag")
    return dict(rig=rig)


# ------------------------------------------------------------------------------------ poses
def stand():
    P = dict(root=(0.0, 0.0), pitch=0.0, hip=0.0, neck=0.0, head=0.0, jaw=0.0, tail=0.0, tail2=0.0, roll=0.0,
             bones={"pole": 0.0, "flag": 0.0})
    P.update(Q.stand(2.0))
    return P


def idle(t):
    a = 2 * math.pi * t / 900.0
    P = stand()
    P["root"] = (0.0, -0.4 + 0.6 * math.sin(a))
    P["pitch"] = 0.6 * math.sin(a + 0.4)
    P["neck"] = 2 * math.sin(a - 0.6)
    P["head"] = -3 + 4 * math.sin(a - 1.1)           # rooting, snuffling
    P["jaw"] = -2 - 2 * max(0.0, math.sin(a * 2))
    P["tail"] = 14 * math.sin(a * 2)
    P["tail2"] = 18 * math.sin(a * 2 - 1.0)
    P["bones"] = {"pole": 1.5 * math.sin(a - 0.8), "flag": (6 * math.sin(a - 1.6), 10 * math.sin(a - 1.2))}
    return P


def walk(t):
    ph = (t / 920.0) % 1.0
    P = stand()
    for key, o in {"hind_B": 0.0, "fore_B": 0.25, "hind_F": 0.5, "fore_F": 0.75}.items():
        kind = key.split("_")[0]
        x, z, pa = Q.step(ph - o, kind, STRIDE, 7.5, duty=DUTY, fold=70 if kind == "fore" else 55, reach=3, sink=8)
        P[key] = (x, z, pa, 0.0)
    w = 4 * math.pi * ph
    P["root"] = (0.0, -1.0 + 1.3 * math.cos(w))
    P["root_dy"] = 0.0
    P["roll"] = 3 * math.sin(2 * math.pi * ph)
    P["pitch"] = 1.5 * math.sin(w + 0.5)
    P["neck"] = -2 + 2 * math.sin(w + 1.2)
    P["head"] = -2 + 3 * math.sin(w + 0.8)
    P["tail"] = 20 * math.sin(2 * math.pi * ph)
    P["tail2"] = 20 * math.sin(2 * math.pi * ph - 1.2)
    P["bones"] = {"pole": -3 + 2.5 * math.sin(w - 0.6), "flag": (-8 + 6 * math.sin(w - 1.4), 14 * math.sin(2 * math.pi * ph))}
    return P


def _legs(dx_f=0.0, dx_h=0.0, zf=None, paf=0.0, pah=0.0):
    out = {}
    for k, v in Q.stand(2.0).items():
        if k.startswith("fore"):
            out[k] = (v[0] + dx_f, zf if zf is not None else v[1], v[2] + paf, 0.0)
        else:
            out[k] = (v[0] + dx_h, v[1], v[2] + pah, 0.0)
    return out


def _atk_keys():
    ready = stand()
    dip = dict(stand(), root=(-3.0, -5.0), pitch=-7, hip=4, neck=-14, head=-12, jaw=-4, tail=20,
               bones={"pole": 4, "flag": (8, 6)})
    dip.update(_legs(-2, -1, paf=16, pah=6))
    dig = dict(dip, root=(-5.0, -7.5), pitch=-10, neck=-22, head=-18, jaw=-10, tail=28, bones={"pole": 6, "flag": (12, 10)})
    dig.update(_legs(-3, -2, paf=24, pah=10))
    dig2 = dict(dig, root=(-5.4, -7.9), head=-20)
    toss = dict(stand(), root=(6.0, 2.0), pitch=12, hip=-4, neck=20, head=26, jaw=-24, tail=-6,
                bones={"pole": -8, "flag": (-10, -8)})
    toss.update(_legs(6, -3, paf=-10, pah=-14))
    top = dict(toss, root=(8.0, 3.6), pitch=15, neck=26, head=34, jaw=-30, bones={"pole": -12, "flag": (-16, -10)})
    top.update({"fore_F": (Q.HOME["fore"] + 8, 6.0, Q.LAST["fore"] - 40, 6), "fore_B": (Q.HOME["fore"] + 5, 2.0,
                                                                                     Q.LAST["fore"] - 20, 3)})
    held = dict(top, root=(8.2, 3.8), head=36, bones={"pole": -8, "flag": (-12, -6)})
    land = dict(stand(), root=(5.0, -3.0), pitch=-3, neck=4, head=6, jaw=-10, bones={"pole": 6, "flag": (10, 8)})
    land.update(_legs(4, -1, paf=10, pah=4))
    rec = dict(stand(), root=(2.0, -1.0), neck=-2, head=0, jaw=-4, bones={"pole": -2, "flag": (-4, 4)})
    return [(0, ready), (170, dip), (340, dig), (525, dig2), (548, toss), (570, top), (740, held),
            (840, land), (1020, rec), (1230, ready)]


_ATK = _atk_keys()


def hit(t):
    base = stand()
    k = dict(base, root=(-5.0, -1.5), pitch=5, neck=10, head=14, jaw=-18, tail=30, bones={"pole": 8, "flag": (14, 8)})
    k2 = dict(k, root=(-4.0, -2.0), neck=2, head=4, bones={"pole": -4, "flag": (-6, -4)})
    return B.keyed([(0, base), (55, k), (140, k2), (310, base)], t)


def die(t):
    base = stand()
    buck = dict(stand(), root=(-2.0, -10.0), pitch=-10, neck=-8, head=-6, jaw=-26, tail=24, roll=-6,
                bones={"pole": 8, "flag": (14, 10)})
    buck.update(_legs(2, 0, zf=10.0, paf=70, pah=20))
    fall = dict(buck, root=(-4.0, -24.0), pitch=-4, roll=-50, head=-10, bones={"pole": 10, "flag": (20, 10)})
    limp = {"fore_F": (Q.HOME["fore"] + 10, 16.0, Q.LAST["fore"] + 30, 10), "fore_B": (Q.HOME["fore"] + 6, 19.0, Q.LAST["fore"] + 40, 10),
            "hind_F": (Q.HOME["hind"] - 8, 16.0, Q.LAST["hind"] - 30, -8), "hind_B": (Q.HOME["hind"] - 4, 19.0, Q.LAST["hind"] - 20, -8)}
    fall.update(limp)
    down = dict(fall, root=(-5.0, -35.5), pitch=0, roll=-84, neck=-6, head=-10, jaw=-16, tail=-10,
                bones={"pole": 16, "flag": (30, 6)})
    bounce = dict(down, root=(-5.2, -33.8), roll=-80, head=-6)
    rest = dict(down, root=(-5.4, -35.8), roll=-86, head=-12, jaw=-12, bones={"pole": 18, "flag": (40, 0)})
    return B.keyed([(0, base), (60, buck), (210, fall), (350, down), (420, bounce), (520, rest), (990, rest)], t)


def pose(ctx, clip, t):
    P = {"idle": idle, "walk": walk, "hit": hit, "die": die}.get(clip)
    Q.apply(ctx["rig"], P(t) if P else B.keyed(_ATK, t))


def clips():
    atk = G.Clip("attack", MO.HEAVY_ATTACK_MS, sequence=MO.HEAVY_ATTACK_SEQ, impact=4, smear=3, times=ATK_T)
    for i, s in ((1, 0.05), (2, 0.3)):
        atk.fx[i] = {"s": s, "origin": (30, 0), "spread": 10, "n": 9, "size": 5.0, "seed": 3}
    die_c = G.Clip("die", MO.HEAVY_DIE_MS, sequence=MO.HEAVY_DIE_SEQ, extra={
        "fx": [{"id": "fx.dust_poof", "atMs": 880, "offsetLu": [-4, 10], "scale": 1.2}], "hideUnitAtMs": 990})
    die_c.fx = MO.dust_frames(die_c, 345, span=640, origin=(-4, 0), spread=48, size=15.0, seed=11)
    return [
        G.Clip("idle", IDLE_MS, loop=True),
        G.Clip("walk", WALK_MS, loop=True),
        atk,
        G.Clip("hit", MO.HIT_MS, times=MO.HIT_TIMES),
        die_c,
    ]
