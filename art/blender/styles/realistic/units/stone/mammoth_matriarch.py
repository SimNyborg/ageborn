"""Mammoth Matriarch: Stone Age Legendary siege heavy (stomp; two riders throw rocks), realistic
style. heightLu 196 (banner top).

A towering woolly mammoth: a high domed head, a steep shoulder hump sloping to the rump, long
shaggy red-brown hair hanging in a fringe from the belly and legs, pillar legs with pale toenails,
a long trunk and two huge sweeping ivory tusks. A team caparison with a bone-bead hem covers her
back under a lashed wooden howdah with a team-painted rim; two young riders in team tunics sit in
it (the front one throws rocks: the projectile leaves from his hand, the per-frame `muzzle`), and
a tall team banner flies from the back of the howdah. Walk: a slow four-beat amble with the trunk
and tail swinging. Attack: the stomp (rock back and rear up with the trunk raised, hold, crash down
with a smear, a held impact with dust bursting from the forefeet, recovery; the front rider
throws). Die: she sinks onto her knees and rolls onto her side in a great cloud of dust.
"""
import math

from lib import biped as B
from lib import core as C
from lib import game as G
from lib import mats as M
from lib import motion as MO
from lib.quad import Quad

SLUG = "mammoth_matriarch"
NAME = "Mammoth Matriarch"
AGE = "stone"
KIND = "unit"
HEIGHT_LU = 196
PX1 = 1.025
SCALE1 = 1.25
CANVAS = (356, 232)
FEET = (182, 12)
YAW = -12.0
ANCHORS = {"head": (0, 190), "hitCenter": (0, 90)}

FORE = [(40, 112), (44, 70), (45.5, 30), (46.5, 11), (49, 1.5)]
HIND = [(-48, 112), (-41, 72), (-50, 38), (-48.5, 12), (-46, 1.5)]
Q = Quad(FORE, HIND, (0, 100), 19.0,
         neck=((56, 118), (72, 126)), head=((72, 126), (96, 102)), tail=((-78, 114), (-86, 102), (-89, 90)),
         jaw=((84, 108), (94, 100)), prefix="m_")
TRUNK = [(97, 104), (104, 82), (106, 58), (102, 36), (96, 22)]
RB = B.Biped(H=34.0, bulk=0.95)
RB.root = "rider"
SEAT = (8.0, -6.0, 155.0)
RB.offset = (SEAT[0], SEAT[1], SEAT[2] - B.PELV * RB.H)
RK = RB.k
FIST = (0.35 * RK + RB.offset[0], -RB.sw + RB.offset[1], 31.0 * RK + RB.offset[2])
TRACKERS = {"muzzle": ("hand_F", (FIST[0] + 0.5, FIST[1] - 0.5, FIST[2] - 0.5)),
            "tuskTip": ("m_head", (130.0, -3.0, 114.0))}
EXTRA = {"trunk1": ((97, 0, 104), (104, 0, 82), "m_head"), "trunk2": ((104, 0, 82), (106, 0, 58), "trunk1"),
         "trunk3": ((106, 0, 58), (102, 0, 36), "trunk2"), "trunk4": ((102, 0, 36), (96, 0, 22), "trunk3"),
         "pole": ((-34, 0, 150), (-34, 0, 190), "m_body"), "banner": ((-34.5, 0, 188), (-58, 0, 180), "pole")}

DUTY = 0.68
STRIDE = 48.0
WALK = {"strideLu": STRIDE / DUTY * math.cos(math.radians(YAW))}
ATK_T = [0, 170, 340, 548, 570, 750, 840, 1020, 1120]


def build():
    wool = M.fur("#5d4331", "#3f2e23", name="wool", bump=1.4)
    wool_lt = M.fur("#7a5c44", "#5a4232", name="wool_lt", bump=1.2)
    skin = C.mat("mskin", "#4a3a32", rough=0.8, noise=0.2, nscale=0.4, bump=0.8)
    ivory = M.ivory("#e0d3b6")
    nail = M.bone("#c9bda3", name="nail")
    wood = M.wood("#7a6450", "#5a4a3c", name="howdah")
    rope = M.rope("#8c7a5c")
    bone = M.bone()
    hide = M.team_hide()
    cloth = M.team_cloth(name="team_banner")
    paint = M.team_paint()
    eye = M.eye()
    rskin = M.skin("#a07a62", name="rskin")
    rhair = M.hair("#3a2c24", name="rhair")
    stone = M.stone("#8a8680", "#6d6a66", name="rock", bump=0.5)

    bones = Q.bones()
    bones.update(EXTRA)
    bones.update(RB.bones(root_parent="m_body"))
    rig = C.Rig("mammoth_rig", bones, yaw_deg=YAW)
    p = Q.p
    body = C.blobs("m_body", [
        ((36, 0, 102), (33, 28, 36)),         # shoulders / chest
        ((28, 0, 134), (26, 21, 14)),         # hump (the high point of the back)
        ((-4, 0, 100), (46, 28, 29)),         # barrel, sloping back
        ((-52, 0, 94), (27, 25, 25)),         # rump (low)
        ((0, 0, 76), (46, 26, 12)),           # belly
        ((60, 0, 112), (18, 21, 24)),         # neck
        ((42, 0, 72), (14, 26, 16)),          # upper forelegs
        ((-44, 0, 76), (18, 25, 18)),         # thighs
    ], wool, res=1.8)
    C.displace(body, 2.6, 0.18)
    rig.skin(body, [p + "body", p + "pelvis", p + "neck", p + "foreS_F", p + "foreS_B", p + "hindT_F", p + "hindT_B"],
             soft=8.0, bias={p + "foreS_F": 8.0, p + "foreS_B": 8.0, p + "hindT_F": 8.0, p + "hindT_B": 8.0, p + "neck": 3.0})
    # the shaggy fringe hanging from the flanks and belly
    import random
    rnd = random.Random(8)
    fr = []
    for i in range(30):
        x = -72 + 5.2 * i + rnd.uniform(-1.5, 1.5)
        for y in (-25.0, 25.0):
            ln = rnd.uniform(11, 20)
            fr.append(((x, y + rnd.uniform(-1.5, 1.5), 84 + 0.08 * x - ln * 0.55), (rnd.uniform(2.6, 3.8), 3.0, ln)))
        if i % 2 == 0:
            fr.append(((x, 0, 80 + 0.08 * x), (5.0, 20.0, 12.0)))
    fringe = C.blobs("fringe", fr, wool, res=1.3)
    C.displace(fringe, 1.8, 0.6)
    rig.skin(fringe, [p + "body", p + "pelvis"], soft=10)
    head = C.blobs("m_head", [
        ((79, 0, 140), (15, 14, 15)),          # dome
        ((82, 0, 122), (17, 16, 19)),          # skull
        ((94, 0, 108), (10, 12, 14)),          # trunk root
        ((67, -16, 126), (5, 3, 9), (0.2, -0.3, 0)),    # ears
        ((67, 16, 126), (5, 3, 9), (-0.2, -0.3, 0)),
    ], wool, res=1.3)
    C.displace(head, 2.0, 0.22)
    rig.rigid(head, p + "head")
    for y in (-13.0, 13.0):
        rig.rigid(C.sphere("eye", 1.6, eye, loc=(92, y, 121), scale=(0.6, 0.5, 0.6)), p + "head")
        s = 1 if y > 0 else -1
        tp, tr = C.smooth_path([(95, y * 0.7, 104), (101, y * 0.95, 92), (112, y * 1.15, 83), (125, y * 1.0, 86),
                                (132, y * 0.65, 98), (131, y * 0.3, 112)], [4.4, 4.2, 3.7, 3.0, 2.2, 0.8])
        tusk = C.tube("tusk", tp, tr, ivory, seg=14)
        rig.rigid(tusk, p + "head")
    trunk = C.tube("trunk", [(TRUNK[i][0], 0, TRUNK[i][1]) for i in range(5)] + [(93, 0, 18)],
                   [8.0, 6.4, 5.0, 3.8, 3.0, 2.6], skin, seg=16)
    C.displace(trunk, 0.8, 0.5)
    rig.skin(trunk, [p + "head", "trunk1", "trunk2", "trunk3", "trunk4"], soft=3.0, bias={p + "head": 3.0})
    thair = C.blobs("trunkhair", [((98, 0, 100), (8, 7, 9)), ((102, 0, 88), (6, 6, 8))], wool, res=1.0)
    C.displace(thair, 1.5, 0.4)
    rig.skin(thair, [p + "head", "trunk1"], soft=4)
    tail = C.tube("tail", [(-78, 0, 113), (-85, 0, 102), (-89, 0, 90)], [3.0, 2.2, 1.6], wool, seg=8)
    rig.skin(tail, [p + "tail", p + "tail2"], soft=3)
    tt = C.blobs("tailtuft", [((-90, 0, 86), (3, 3, 6))], wool, res=0.8)
    C.displace(tt, 1.2, 0.5)
    rig.rigid(tt, p + "tail2")

    for sd, y in Q.Y.items():
        fore = C.blobs("fore_" + sd, [((44, y, 58), (13, 11, 22)), ((45.5, y, 30), (11.5, 10, 14)),
                                      ((47, y, 12), (11, 10.5, 10))], wool, res=1.1)
        C.displace(fore, 2.0, 0.3)
        rig.skin(fore, Q.leg_bones("fore", sd), soft=3, bias={p + "foreS_" + sd: 5})
        hind = C.blobs("hind_" + sd, [((-44, y, 60), (14, 11.5, 22)), ((-49, y, 32), (11, 10, 14)),
                                      ((-48, y, 12), (10.5, 10, 10))], wool, res=1.1)
        C.displace(hind, 2.0, 0.3)
        rig.skin(hind, Q.leg_bones("hind", sd), soft=3, bias={p + "hindT_" + sd: 5})
        for nm, bone_, x in (("ff", p + "foreP_" + sd, 48.5), ("hf", p + "hindP_" + sd, -46.5)):
            pad = C.lathe(nm, [(0, 0), (10.5, 0), (10.8, 3.5), (9.5, 6), (0, 6)], skin, seg=24, loc=(x, y, 0))
            rig.rigid(pad, bone_)
            for k in range(3):
                a = math.radians(-40 + 40 * k)
                rig.rigid(C.sphere("nail", 2.2, nail, loc=(x + 10.2 * math.cos(a), y + 10.2 * math.sin(a) * 0.9, 2.6),
                                   scale=(0.7, 1.0, 0.9)), bone_)

    # team caparison with a bone-bead hem
    cap = C.blobs("caparison", [((0, 0, 132), (46, 31.5, 8)), ((-6, 0, 118), (44, 32.5, 16)),
                                ((12, 0, 104), (26, 32.0, 10))], hide, res=1.4)
    C.displace(cap, 1.2, 0.4)
    C.team(cap)
    rig.skin(cap, [p + "body", p + "pelvis"], soft=12)
    for i in range(12):
        x = -44 + 8 * i
        rig.rigid(C.sphere("bead", 1.6, bone, seg=8, ring=6, loc=(x, -32.8, 101 + 3 * math.sin(i))), p + "body")
    # the howdah: a lashed pole frame with hide sides and a team-painted rim
    hw = []
    for x in (-30, 22):
        for yy in (-18, 18):
            hw.append(C.tube("post", [(x, yy, 136), (x, yy, 160)], [1.6, 1.4], wood, seg=8))
    for z in (148, 159):
        for yy in (-18, 18):
            hw.append(C.tube("rail", [(-31, yy, z), (23, yy, z)], [1.3, 1.3], wood, seg=8))
    for (sx, sy, lx, ly) in ((56, 3.2, -4, -18), (56, 3.2, -4, 18), (3.2, 38, -31, 0), (3.2, 38, 23, 0)):
        rim = C.box("rim", sx, sy, 3.4, paint, bevel=0.8, loc=(lx, ly, 160))
        C.team(rim)
        hw.append(rim)
    hh = M.rawhide("#8a7458", name="howdahhide")
    for (sx, sy, lx, ly) in ((52, 1.2, -4, -17.4), (52, 1.2, -4, 17.4), (1.2, 34, -30.4, 0), (1.2, 34, 22.4, 0)):
        hw.append(C.box("side", sx, sy, 13, hh, bevel=0.4, loc=(lx, ly, 152)))
    for o in hw:
        rig.rigid(o, p + "body")
    for x in (-18, 10):
        g = C.blobs("lash", [((x, 0, 118), (1.6, 33, 26))], rope, res=1.0)
        rig.skin(g, [p + "body"], soft=12)
    # the banner pole at the back of the howdah and a team banner
    rig.rigid(C.tube("bpole", [(-34, 0, 150), (-34, 0, 192)], [1.4, 1.2], wood, seg=8), "pole")
    rig.rigid(C.sphere("bfin", 2.2, bone, loc=(-34, 0, 193.5)), "pole")
    ban = C.tube("banner", [(-35, 0, 185), (-42, 0, 184), (-50, 0, 182.5), (-58, 0, 180.5)], [6.5, 6.0, 5.0, 3.2],
                 cloth, seg=10, flat=0.18)
    C.team(ban)
    rig.rigid(ban, "banner")

    # the front rider (animated) and the back rider (rigid)
    rb = RB.body(rig, rskin, parts=("torso", "head", "arms"))
    ox, oy, oz = RB.offset
    S = lambda x, y, z: (x * RK + ox, y * RK + oy, z * RK + oz)
    tun = C.blobs("r_tunic", [(S(0.2, 0, 41.0), (4.7, 6.4, 6.4)), (S(-0.2, 0, 47.8), (5.4, 7.4, 6.8))], hide, res=0.3)
    C.team(tun)
    rig.skin(tun, ["hips", "spine", "chest"], soft=2 * RK)
    hr = C.blobs("r_hair", [(S(-0.6, 0, 65.4), (4.9, 4.4, 3.8)), (S(-2.6, 0, 62.2), (3.2, 4.2, 4.2))], rhair, res=0.25)
    C.displace(hr, 0.4, 0.8)
    rig.rigid(hr, "head")
    rock = C.blobs("r_rock", [(FIST, (2.2, 2.0, 1.9))], stone, res=0.3)
    C.displace(rock, 0.3, 0.8)
    rig.rigid(rock, "hand_F")
    # back rider: a simple seated figure holding the rim
    b0 = (-18.0, 4.0, 153.0)
    bk = [C.blobs("b_torso", [((b0[0], b0[1], b0[2] + 5), (3.8, 5.0, 6.2)), ((b0[0] + 0.5, b0[1], b0[2] + 12.5), (2.2, 2.2, 2.6))],
                  rskin, res=0.25)]
    bt = C.blobs("b_tunic", [((b0[0], b0[1], b0[2] + 5.5), (4.2, 5.4, 6.0))], hide, res=0.25)
    C.team(bt)
    bk.append(bt)
    bk.append(C.blobs("b_head", [((b0[0] + 0.8, b0[1], b0[2] + 16.6), (3.1, 2.7, 3.2))], rskin, res=0.2))
    bh = C.blobs("b_hair", [((b0[0] - 0.2, b0[1], b0[2] + 17.8), (3.2, 2.9, 2.6))], rhair, res=0.2)
    C.displace(bh, 0.3, 0.8)
    bk.append(bh)
    bk.append(C.tube("b_arm", [(b0[0] + 1, b0[1] - 4.5, b0[2] + 9), (b0[0] + 5, b0[1] - 5, b0[2] + 5),
                               (b0[0] + 9, b0[1] - 6, b0[2] + 9.5)], [1.3, 1.1, 1.2], rskin, seg=8))
    for o in bk:
        rig.rigid(o, p + "body")
    return dict(rig=rig, rock=rock)


# ------------------------------------------------------------------------------------ poses
def stand():
    P = dict(root=(0.0, 0.0), pitch=0.0, hip=0.0, neck=0.0, head=0.0, jaw=0.0, tail=0.0, tail2=0.0, roll=0.0,
             bones={"trunk1": 0.0, "trunk2": 0.0, "trunk3": 0.0, "trunk4": 0.0, "pole": 0.0, "banner": 0.0})
    P.update(Q.stand(3.0))
    return P


def rider(t, clip):
    """Front rider pose (FK arms; he sits in the howdah and bounces with the mammoth)."""
    R = dict(root=(0.0, 0.0), hips=0, spine=-2, chest=-2, neck=2, head=0, armF=(20, 40, 20), armB=(10, 50, 10, -8))
    if clip == "idle":
        a = 2 * math.pi * t / 900.0
        R["head"] = 6 * math.sin(a)
        R["armF"] = (20 + 6 * math.sin(a), 40, 20)
    elif clip == "walk":
        a = 2 * math.pi * t / 680.0
        R["spine"] = -2 + 3 * math.sin(a)
        R["head"] = 3 * math.sin(a - 0.8)
    elif clip == "attack":
        keys = [(0, dict(R)), (170, dict(R, spine=4, chest=4, armF=(-60, -40, -30))),
                (340, dict(R, spine=10, chest=8, head=6, armF=(-150, -170, -160))),
                (548, dict(R, spine=4, chest=2, armF=(160, 170, 160))),
                (570, dict(R, spine=-8, chest=-6, head=-6, armF=(100, 100, 80))),
                (750, dict(R, spine=-10, chest=-6, armF=(50, 40, 20))),
                (1020, dict(R, armF=(30, 50, 30))), (1230, dict(R))]
        R = B.keyed(keys, t)
    elif clip == "hit":
        R = B.keyed([(0, dict(R)), (60, dict(R, spine=10, head=12, armF=(60, 90, 40))), (310, dict(R))], t)
    else:
        R = B.keyed([(0, dict(R)), (210, dict(R, spine=20, chest=10, head=20, armF=(120, 140, 90), armB=(110, 130, 60, -20))),
                     (990, dict(R, spine=30, chest=14, head=24, armF=(150, 150, 100), armB=(140, 140, 60, -20)))], t)
    return R


def idle(t):
    a = 2 * math.pi * t / 900.0
    P = stand()
    P["root"] = (0.0, -0.8 + 1.0 * math.sin(a))
    P["pitch"] = 0.5 * math.sin(a + 0.4)
    P["neck"] = 1.5 * math.sin(a - 0.6)
    P["head"] = 2 * math.sin(a - 1.0)
    P["tail"] = 10 * math.sin(a)
    P["tail2"] = 14 * math.sin(a - 1.0)
    P["bones"] = {"trunk1": 4 * math.sin(a - 0.8), "trunk2": 8 * math.sin(a - 1.4), "trunk3": 12 * math.sin(a - 2.0),
                  "trunk4": 16 * math.sin(a - 2.6), "pole": 1.0 * math.sin(a - 0.8),
                  "banner": (4 * math.sin(a - 1.6), 10 * math.sin(a - 1.2))}
    return P


def walk(t):
    ph = (t / 1360.0) % 1.0
    P = stand()
    for key, o in {"hind_B": 0.0, "fore_B": 0.25, "hind_F": 0.5, "fore_F": 0.75}.items():
        kind = key.split("_")[0]
        x, z, pa = Q.step(ph - o, kind, STRIDE, 14.0, duty=DUTY, fold=40, reach=4, sink=5)
        P[key] = (x, z, pa, 0.0)
    w = 4 * math.pi * ph
    P["root"] = (0.0, -1.5 + 1.8 * math.cos(w))
    P["roll"] = 2.5 * math.sin(2 * math.pi * ph)
    P["pitch"] = 1.0 * math.sin(w + 0.5)
    P["neck"] = -1 + 1.5 * math.sin(w + 1.2)
    P["head"] = 2 * math.sin(w + 0.8)
    P["tail"] = 14 * math.sin(2 * math.pi * ph)
    P["tail2"] = 16 * math.sin(2 * math.pi * ph - 1.0)
    s1 = math.sin(2 * math.pi * ph)
    P["bones"] = {"trunk1": 6 * s1, "trunk2": 9 * math.sin(2 * math.pi * ph - 0.6), "trunk3": 12 * math.sin(2 * math.pi * ph - 1.2),
                  "trunk4": 14 * math.sin(2 * math.pi * ph - 1.8), "pole": -2 + 2 * math.sin(w - 0.6),
                  "banner": (-8 + 5 * math.sin(w - 1.4), 12 * s1)}
    return P


def _legs(dxf=0.0, zf=None, paf=0.0, dxh=0.0, pah=0.0):
    out = {}
    for k, v in Q.stand(3.0).items():
        if k.startswith("fore"):
            out[k] = (v[0] + dxf, zf if zf is not None else v[1], v[2] + paf, 0.0)
        else:
            out[k] = (v[0] + dxh, v[1], v[2] + pah, 0.0)
    return out


def _trunk(a, b, c, d):
    return {"trunk1": a, "trunk2": b, "trunk3": c, "trunk4": d}


def _atk_keys():
    ready = stand()
    back = dict(stand(), root=(-6.0, -3.0), pitch=4, hip=-3, neck=6, head=6, tail=10)
    back.update(_legs(-3, paf=6, pah=10))
    back["bones"] = dict(_trunk(10, 14, 18, 20), pole=4, banner=(8, 6))
    rear = dict(stand(), root=(-12.0, 8.0), pitch=16, hip=-10, neck=14, head=22, jaw=-10, tail=20)
    rear.update({"fore_F": (Q.HOME["fore"] + 4, 44.0, Q.LAST["fore"] - 50, 16),
                 "fore_B": (Q.HOME["fore"] - 2, 36.0, Q.LAST["fore"] - 40, 12),
                 "hind_F": (Q.HOME["hind"] - 2, Q.TOE_Z["hind"], Q.LAST["hind"] + 12, 0),
                 "hind_B": (Q.HOME["hind"] + 2, Q.TOE_Z["hind"], Q.LAST["hind"] + 12, 0)})
    rear["bones"] = dict(_trunk(40, 40, 36, 30), pole=10, banner=(16, 10))
    rear2 = dict(rear, root=(-12.5, 9.0), pitch=17)
    crash = dict(stand(), root=(2.0, -4.0), pitch=-3, hip=2, neck=-2, head=-4, jaw=-6, tail=4)
    crash.update(_legs(6, zf=8.0, paf=-10))
    crash["bones"] = dict(_trunk(-6, -10, -14, -18), pole=-6, banner=(-10, -8))
    impact = dict(stand(), root=(4.0, -7.0), pitch=-5, hip=3, neck=-4, head=-8, jaw=-4, tail=-6)
    impact.update(_legs(8, paf=14, pah=-4))
    impact["bones"] = dict(_trunk(-12, -16, -20, -24), pole=-10, banner=(-16, -10))
    held = dict(impact, root=(4.0, -7.5))
    held["bones"] = dict(_trunk(-6, -8, -10, -12), pole=-4, banner=(-8, 10))
    reb = dict(stand(), root=(3.0, -3.0), pitch=-1, neck=2, head=2)
    reb.update(_legs(6, paf=6))
    reb["bones"] = dict(_trunk(6, 8, 10, 12), pole=4, banner=(6, 8))
    rec = dict(stand(), root=(1.0, -1.0))
    rec.update(_legs(2))
    rec["bones"] = dict(_trunk(2, 2, 4, 6), pole=0, banner=(2, 2))
    return [(0, ready), (170, back), (340, rear), (525, rear2), (548, crash), (570, impact), (740, held),
            (840, reb), (1020, rec), (1230, ready)]


_ATK = _atk_keys()


def hit(t):
    base = stand()
    k = dict(base, root=(-5.0, -2.0), pitch=3, neck=6, head=8, tail=20)
    k["bones"] = dict(_trunk(10, 12, 12, 10), pole=6, banner=(10, 8))
    k2 = dict(k, root=(-4.0, -2.5), neck=0, head=2)
    k2["bones"] = dict(_trunk(4, 6, 8, 10), pole=-3, banner=(-6, -4))
    return B.keyed([(0, base), (55, k), (140, k2), (310, base)], t)


def die(t):
    """She sinks onto her knees, then her chest; the head and trunk drop, the banner snaps back."""
    base = stand()
    kneel = dict(stand(), root=(-2.0, -26.0), pitch=-10, neck=-6, head=-8, tail=16, roll=-3)
    kneel.update(_legs(6, zf=22.0, paf=90, pah=20))
    kneel["bones"] = dict(_trunk(20, 20, 24, 30), pole=6, banner=(10, 6))
    sprawl = {"fore_F": (Q.HOME["fore"] + 28, 6.0, Q.LAST["fore"] - 80, -14), "fore_B": (Q.HOME["fore"] + 22, 6.0, Q.LAST["fore"] - 70, -10),
              "hind_F": (Q.HOME["hind"] - 26, 6.0, Q.LAST["hind"] + 80, 14), "hind_B": (Q.HOME["hind"] - 20, 6.0, Q.LAST["hind"] + 70, 10)}
    fall = dict(kneel, root=(-4.0, -46.0), pitch=-6, roll=-8, head=-10)
    fall.update(sprawl)
    fall["bones"] = dict(_trunk(10, 10, 10, 10), pole=12, banner=(20, 4))
    down = dict(fall, root=(-6.0, -62.0), pitch=-3, roll=-12, neck=-10, head=-14)
    down["bones"] = dict(_trunk(30, 30, 20, 10), pole=18, banner=(30, 0))
    bounce = dict(down, root=(-6.2, -59.0), roll=-11)
    rest = dict(down, root=(-6.4, -62.5), roll=-12, head=-16)
    rest["bones"] = dict(_trunk(34, 34, 24, 12), pole=22, banner=(40, 0))
    return B.keyed([(0, base), (60, kneel), (210, fall), (350, down), (420, bounce), (520, rest), (990, rest)], t)


def pose(ctx, clip, t):
    P = {"idle": idle, "walk": walk, "hit": hit, "die": die}.get(clip)
    Q.apply(ctx["rig"], P(t) if P else B.keyed(_ATK, t))
    RB.apply(ctx["rig"], rider(t, clip), rest=False)
    ctx["rock"].hide_render = clip == "attack" and 560 <= t < 1000


def clips():
    atk = G.Clip("attack", MO.HEAVY_ATTACK_MS, sequence=MO.HEAVY_ATTACK_SEQ, impact=4, smear=3, times=ATK_T)
    for i, s in ((4, 0.04), (5, 0.3), (6, 0.5), (7, 0.75)):
        atk.fx[i] = {"s": s, "origin": (52, 0), "spread": 34, "n": 16, "size": 13.0, "seed": 4}
    die_c = G.Clip("die", MO.HEAVY_DIE_MS, sequence=MO.HEAVY_DIE_SEQ, extra={
        "fx": [{"id": "fx.dust_poof", "atMs": 880, "offsetLu": [-8, 20], "scale": 2.0}], "hideUnitAtMs": 990})
    die_c.fx = MO.dust_frames(die_c, 345, span=640, origin=(-8, 0), spread=62, size=18.0, seed=12)
    return [
        G.Clip("idle", MO.HEAVY_IDLE_MS, loop=True),
        G.Clip("walk", [170] * 8, loop=True),
        atk,
        G.Clip("hit", MO.HIT_MS, times=MO.HIT_TIMES),
        die_c,
    ]
