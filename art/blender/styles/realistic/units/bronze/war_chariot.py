"""War Chariot: Bronze Age heavy (Scythe Charge: first hit x2, knockback), realistic style. heightLu 110.

A two-horse war chariot of the late Bronze Age: a pair of horses under a yoke (a dark bay on the
near side, a dapple grey beyond it), team breast collars and team plumes on the bridles, pulling a
light car on two six-spoked wheels set at the back of the car, bronze hubs with short scythe blades.
The car is a bent-wood frame with a team-painted leather side panel studded with bronze, a curved
breastwork and a quiver; a team swallowtail pennant flies from a pole at the back. The charioteer
wears a boar's-tusk helmet with a team plume, a linen corslet over a team kilt, holds the reins in
the far hand and a bronze khopesh in the near hand.

Walk: a gallop (a suspension phase with every hoof off the ground), the wheels rolling at the ground
speed. Attack: the charge lean: the horses gather and lunge, the car lurches forward, the khopesh
sweeps down in a big smeared arc (held impact, dust off the hubs). Die: the horses stumble onto
their knees and collapse, the car tips over onto its side and the driver is thrown on his back.
"""
import math

from lib import biped as B
from lib import bronze as BZ
from lib import core as C
from lib import game as G
from lib import mats as M
from lib import motion as MO
from lib.quad import Quad

SLUG = "war_chariot"
NAME = "War Chariot"
AGE = "bronze"
KIND = "unit"
HEIGHT_LU = 110
PX1 = 1.23
SCALE1 = 1.5
CANVAS = (214, 138)
FEET = (108, 10)
YAW = -12.0
ANCHORS = {"head": (-10, 104), "hitCenter": (0, 42)}

HX = 24.0                       # horses' centre ahead of the unit origin
HY = 9.5                        # horse half spacing (near -HY, far +HY)
FORE = [(15.5, 50.0), (18.0, 35.0), (18.0, 19.0), (18.4, 7.0), (21.0, 0.6)]
HIND = [(-19.0, 52.0), (-12.5, 36.0), (-21.5, 21.5), (-21.2, 7.0), (-18.8, 0.6)]


def _shift(pts):
    return [(x + HX, z) for x, z in pts]


def _quad(prefix):
    return Quad(_shift(FORE), _shift(HIND), (HX, 47.0), 5.2, neck=((HX + 19, 55), (HX + 31, 76)), head=((HX + 31, 77), (HX + 42, 62)),
                tail=((HX - 27, 55), (HX - 31, 44), (HX - 32, 30)), prefix=prefix)


QN, QF = _quad("hn_"), _quad("hf_")
DY = {"hn_": -HY, "hf_": HY}

AX = -30.0                      # car axle
WR = 15.5
TRACK = 13.5
FLOOR = 21.0
DRV = B.Biped(H=62.0, bulk=1.0)
DRV.root = "drv"
DRV.offset = (-24.0, 0.0, FLOOR)
DK = DRV.k
G0 = B.ANKLE * DRV.H
FIST = (0.35 * DK + DRV.offset[0], -DRV.sw, 31.0 * DK + DRV.offset[2])
BLADE = 19.0
TRACKERS = {"bladeTip": ("hand_F", (FIST[0] + BLADE + 3.0, FIST[1], FIST[2] - 4.0))}

DUTY = 0.42
STRIDE = 34.0
CYCLE = 800.0
WALK = {"strideLu": STRIDE / DUTY * math.cos(math.radians(YAW))}
ROLL = STRIDE / DUTY / CYCLE
IDLE_MS = MO.HEAVY_IDLE_MS
ATK_T = [0, 170, 340, 548, 570, 750, 840, 1020, 1120]
SMEAR_COLOR = "#c2b49c"
SMEAR_ALPHA = 0.55
SMEAR_N = 30

EXTRA = {"car": ((AX, 0, WR), (AX + 12, 0, WR), None),
         "wheel_F": ((AX, -TRACK, WR), (AX, -TRACK, WR + 6), "car"),
         "wheel_B": ((AX, TRACK, WR), (AX, TRACK, WR + 6), "car"),
         "pole": ((-42, 4, 38), (-42, 4, 80), "car"),
         "flag": ((-42.5, 4, 104), (-58, 4, 101), "pole"),
         "flag2": ((-58, 4, 101), (-72, 4, 98), "flag")}


def _bones(Q):
    b = Q.bones()
    dy = DY[Q.p]
    return {n: ((h[0], h[1] + dy, h[2]), (t[0], t[1] + dy, t[2]), p) for n, (h, t, p) in b.items()}


def horse_body(rig, Q, coat, dark, hoof, mane_mat, sock_mat):
    """The study horse (lib/horse.py) on a prefixed quad, offset in depth."""
    p, dy = Q.p, DY[Q.p]

    def T(c):
        return (c[0] + HX, c[1] + dy, c[2])
    els = [((0, 0, 47), (19.5, 8.6, 10.5)), ((16, 0, 46.5), (8.5, 8.4, 11.2)), ((22.5, 0, 44.5), (4.8, 6.9, 8.0)),
           ((-15.5, 0, 48.5), (10.8, 9.2, 11.6)), ((-18.5, 0, 54.5), (7.5, 8.0, 5.8)), ((11, 0, 55.5), (8.0, 5.6, 5.8)),
           ((2, 0, 40.5), (15, 7.9, 6.0)), ((-12.5, 0, 40), (7.0, 8.0, 8.0)), ((17.5, 0, 42), (5.0, 8.2, 6.0)),
           ((21.5, 0, 58.5), (7.6, 5.6, 9.6), (0, 0.6, 0)), ((26.5, 0, 66.5), (5.8, 4.4, 8.4), (0, 0.55, 0)),
           ((30.5, 0, 73.0), (4.5, 3.7, 6.0), (0, 0.5, 0))]
    b = C.blobs(p + "body", [(T(c), a) + tuple(r) for c, a, *r in els], coat, res=0.7)
    rig.skin(b, [p + "body", p + "pelvis", p + "neck", p + "foreS_F", p + "foreS_B", p + "hindT_F", p + "hindT_B"],
             soft=3.0, bias={p + "foreS_F": 3.0, p + "foreS_B": 3.0, p + "hindT_F": 3.0, p + "hindT_B": 3.0, p + "neck": 1.0})
    head = C.blobs(p + "head", [(T((34.0, 0, 76.5)), (4.4, 3.7, 4.4)), (T((38.2, 0, 70.0)), (3.4, 3.0, 7.4), (0, -0.62, 0)),
                                (T((35.6, 0, 73.0)), (3.9, 3.5, 4.0)), (T((42.2, 0, 64.2)), (3.0, 2.6, 3.0)),
                                (T((40.8, 0, 63.2)), (2.6, 2.3, 2.4))], coat, res=0.45)
    rig.rigid(head, p + "head")
    muzzle = C.blobs(p + "muzzle", [(T((42.4, 0, 64.0)), (2.8, 2.5, 2.7))], dark, res=0.35)
    rig.rigid(muzzle, p + "head")
    for y in (-1.9, 1.9):
        ear = C.blobs(p + "ear", [(T((32.6, y, 81.2)), (0.8, 0.55, 1.7), (0, -0.25, 0))], coat, res=0.3)
        rig.rigid(ear, p + "head")
        rig.rigid(C.sphere(p + "eye", 0.75, M.eye(), loc=T((36.4, y * 1.72, 74.8)), scale=(0.7, 0.5, 0.8)), p + "head")
    mane = C.blobs(p + "mane", [(T((18.5 + 12.5 * u, 0, 60.5 + 19.0 * u)), (2.6, 1.5, 3.2), (0, 0.6, 0)) for u in (0.0, 0.2, 0.4, 0.6, 0.8, 1.0)],
                   mane_mat, res=0.45)
    C.displace(mane, 0.8, 0.35)
    rig.skin(mane, [p + "body", p + "neck", p + "head"], soft=2.0)
    tail = C.blobs(p + "tail", [(T((-27.5, 0, 53)), (2.2, 2.0, 3.0)), (T((-30, 0, 46)), (2.6, 2.2, 5.0)), (T((-31.2, 0, 38)), (2.8, 2.2, 5.0)),
                                (T((-31.8, 0, 31)), (2.2, 1.8, 3.4))], mane_mat, res=0.45)
    C.displace(tail, 0.9, 0.35)
    rig.skin(tail, [p + "pelvis", p + "tail", p + "tail2"], soft=2.0, bias={p + "pelvis": 4.0})
    for s, y in (("F", -5.2), ("B", 5.2)):
        fore = C.blobs(p + "fore_" + s, [(T((18.0, y, 30.0)), (3.9, 3.1, 7.4)), (T((18.0, y, 23.0)), (2.5, 2.2, 3.6)),
                                         (T((18.0, y, 19.0)), (1.95, 1.85, 2.6)), (T((18.2, y, 13.0)), (1.75, 1.6, 5.6)),
                                         (T((18.4, y, 7.0)), (1.85, 1.75, 1.9)), (T((19.6, y, 4.0)), (1.5, 1.45, 2.3))], coat, res=0.4)
        rig.skin(fore, Q.leg_bones("fore", s), soft=1.0, bias={p + "foreS_" + s: 2.0})
        hind = C.blobs(p + "hind_" + s, [(T((-16.5, y, 30.0)), (4.0, 3.1, 6.6), (0, 0.5, 0)), (T((-19.8, y, 25.0)), (2.7, 2.2, 3.4), (0, 0.5, 0)),
                                         (T((-21.3, y, 21.5)), (2.1, 1.85, 2.7)), (T((-21.4, y, 14.0)), (1.8, 1.65, 6.0)),
                                         (T((-21.2, y, 7.0)), (1.85, 1.75, 1.9)), (T((-20.0, y, 4.0)), (1.5, 1.45, 2.3))], coat, res=0.4)
        rig.skin(hind, Q.leg_bones("hind", s), soft=1.0, bias={p + "hindT_" + s: 2.0})
        for nm, bone, x in (("fhoof", p + "foreP_", 20.6), ("hhoof", p + "hindP_", -19.4)):
            h = C.lathe(nm, [(0.0, 0.0), (2.2, 0.0), (1.8, 2.3), (1.2, 2.9), (0.0, 2.9)], hoof, seg=16, loc=T((x, y, 0.0)),
                        scale=(1.15, 0.95, 1.0))
            rig.rigid(h, bone + s)
            sock = C.blobs(p + "sock", [(T((x - 1.0, y, 5.0)), (1.75, 1.7, 2.6))], sock_mat, res=0.35)
            rig.rigid(sock, bone + s)


def harness(rig, Q, m, team_cloth):
    p, dy = Q.p, DY[Q.p]

    def T(c):
        return (c[0] + HX, c[1] + dy, c[2])
    # team breast collar with a bronze-studded strap and a yoke saddle
    col = C.blobs(p + "collar", [(T((23.0, 0, 50.5)), (3.4, 7.8, 4.4), (0, -0.5, 0)), (T((17.5, 0, 56.0)), (3.2, 7.0, 3.2), (0, 0.4, 0))],
                  team_cloth, res=0.4)
    C.displace(col, 0.3, 1.2)
    C.team(col)
    rig.skin(col, [p + "body", p + "neck"], soft=3.0)
    for k_ in range(5):
        a = -0.7 + 0.35 * k_
        rig.rigid(C.sphere(p + "stud", 0.7, m["polished"], loc=T((24.6 + 1.5 * math.cos(a), 7.0 * math.sin(a) - 0.5, 50.5 + 2.4 * math.cos(a)))),
                  p + "body")
    sad = C.blobs(p + "yokesaddle", [(T((12.0, 0, 60.5)), (3.4, 5.6, 2.0))], m["leather"], res=0.35)
    rig.skin(sad, [p + "body"], soft=2.0)
    girth = C.blobs(p + "girth", [(T((8.0, 0, 47.0)), (1.2, 9.0, 12.0))], m["leather"], res=0.4)
    rig.skin(girth, [p + "body"], soft=3.0)
    # bridle, bronze cheek disc, team plume on the head
    br = C.blobs(p + "bridle", [(T((38.2, 0, 68.4)), (0.6, 3.5, 5.8), (0, -0.62, 0)), (T((34.4, 0, 77.0)), (1.2, 4.1, 0.6))],
                 m["leather"], res=0.3)
    rig.rigid(br, p + "head")
    for y in (-3.3, 3.3):
        rig.rigid(C.cyl(p + "cheekdisc", 1.4, 1.4, 0.4, m["polished"], seg=16, loc=T((39.6, y, 67.2)), rot=(math.pi / 2, 0, 0)), p + "head")
    if p != QN.p:
        return          # one tall plume on the near horse (a second one behind it read as a pair of horns)
    pl = BZ.ribbon(p + "plume", [T((33.2, 0, 79.6)), T((33.0, 0, 84.5)), T((31.0, 0, 88.5)), T((27.5, 0, 90.5)), T((23.5, 0, 90.0))],
                   [2.0, 3.4, 4.2, 3.6, 1.4],
                   m["team_hair"], thick=1.6, ups=[(1, 0, 0), (1, 0, 0.2), (0.7, 0, 1), (0.2, 0, 1), (0.0, 0, 1)], center=0.5)
    C.displace(pl, 0.35, 0.8)
    C.team(pl)
    rig.rigid(pl, p + "head")
    rig.rigid(C.cyl(p + "plumebase", 0.9, 0.7, 2.0, m["polished"], seg=10, loc=T((33.2, 0, 78.2))), p + "head")


def khopesh(m):
    fx, fy, fz = FIST
    out = [C.tube("grip", [(fx - 3.5, fy, fz), (fx + 3.0, fy, fz)], [0.8, 0.8], m["leather"], seg=8),
           C.sphere("pommel", 1.0, m["polished"], loc=(fx - 3.8, fy, fz)),
           C.tube("guard", [(fx + 3.0, fy - 1.0, fz), (fx + 3.0, fy + 1.0, fz)], [0.7, 0.7], m["bronze"], seg=8),
           C.tube("shank", [(fx + 3.0, fy, fz), (fx + 9.0, fy, fz + 0.4)], [0.75, 0.7], m["bronze"], seg=8, flat=0.45)]
    pts = [(fx + 8.8, fy, fz + 0.4), (fx + 13.0, fy, fz + 1.4), (fx + 17.0, fy, fz + 0.9), (fx + 20.0, fy, fz - 1.4), (fx + 21.2, fy, fz - 4.4),
           (fx + 20.0, fy, fz - 6.8)]
    ups = [(0, 0, 1), (0.2, 0, 1), (0.6, 0, 1), (1, 0, 0.6), (1, 0, -0.2), (0.8, 0, -1)]
    out.append(BZ.ribbon("blade", pts, [1.4, 2.4, 2.8, 2.8, 2.3, 0.6], m["polished"], thick=0.45, ups=ups, center=0.3))
    return out


def build():
    m = BZ.kit()
    bones = {"root": ((0, 0, 0), (0, 0, 4), None)}
    for Q in (QN, QF):
        bones.update(_bones(Q))
    bones.update(EXTRA)
    bones["car"] = (EXTRA["car"][0], EXTRA["car"][1], "root")
    bones.update(DRV.bones(root_parent="root"))
    rig = C.Rig("chariot_rig", bones, yaw_deg=YAW)
    ctx = dict(rig=rig)
    bay = M.coat("#5b4637", "#4a372b", name="bay", bump=0.12, sheen=0.2, noise=0.06, nscale=0.7)
    grey = M.coat("#8e8780", "#6f6964", name="grey", bump=0.12, sheen=0.2, noise=0.14, nscale=0.9)
    mane_dk = M.hair("#1f1a18", name="mane")
    mane_gr = M.hair("#58524c", name="mane_grey")
    dark = C.mat("muzzledark", "#2e2724", rough=0.5, noise=0.1, bump=0.2)
    hoof = M.hoof()
    horse_body(rig, QN, bay, dark, hoof, mane_dk, M.coat("#2c2522", "#231d1a", name="sock", bump=0.2, sheen=0.1))
    horse_body(rig, QF, grey, M.coat("#4e4844", "#403a36", name="greymuzzle", bump=0.2, sheen=0.1), hoof, mane_gr,
               M.coat("#5a5450", "#4a4440", name="greysock", bump=0.2, sheen=0.1))
    for Q in (QN, QF):
        harness(rig, Q, m, m["team_cloth"])

    # ---- the car
    wood = m["cedar"]
    rig.rigid(C.tube("axle", [(AX, -TRACK - 2.5, WR), (AX, TRACK + 2.5, WR)], [1.3, 1.3], wood, seg=10), "car")
    floor = C.box("floor", 22.0, 24.0, 1.6, M.wood("#5e4632", "#4a3828", name="floorwood"), bevel=0.4, loc=(-24.0, 0, FLOOR - 0.8))
    rig.rigid(floor, "car")
    # bent-wood frame: a rail running round the front and sides at waist height
    rail = []
    for i in range(13):
        a = math.radians(-90 + 15 * i)
        rail.append((-24.0 + 9.0 * math.cos(a) + 2.5, 11.5 * math.sin(a), FLOOR + 22.0 - 2.0 * math.cos(a)))
    rail = [(-35.0, -11.5, FLOOR + 18.0)] + rail + [(-35.0, 11.5, FLOOR + 18.0)]
    pts, rad = C.smooth_path(rail, [0.9] * len(rail), n=3)
    rig.rigid(C.tube("rail", pts, rad, wood, seg=8), "car")
    for x, y in ((-35.0, -11.5), (-35.0, 11.5), (-13.0, -8.0), (-13.0, 8.0), (-11.0, 0.0)):
        rig.rigid(C.tube("post", [(x, y, FLOOR), (x, y, FLOOR + 19.0 if x < -30 else FLOOR + 21.0)], [0.9, 0.8], wood, seg=8), "car")
    # team leather siding on the near and far sides and the breastwork (studded)
    for sg in (-1, 1):
        pts = [(-35.0, sg * 11.4, FLOOR + 8.5), (-26.0, sg * 11.6, FLOOR + 9.5), (-18.0, sg * 10.6, FLOOR + 10.0), (-12.5, sg * 7.2, FLOOR + 10.5)]
        side = BZ.ribbon("siding", pts, [17.0, 19.0, 20.0, 20.5], m["team_paint"], thick=0.6, up=(0, 0, 1))
        C.team(side)
        rig.rigid(side, "car")
        for x, y, z in ((-33.0, 11.6, 15.0), (-28.0, 11.8, 16.0), (-23.0, 11.5, 16.5), (-18.0, 10.9, 17.0), (-33.0, 11.6, 3.0),
                        (-23.0, 11.6, 3.5), (-15.0, 9.2, 4.0)):
            rig.rigid(C.sphere("carstud", 0.65, m["polished"], seg=8, ring=6, loc=(x, sg * (y + 0.4), FLOOR + z)), "car")
    front = BZ.ribbon("breastwork", [(-12.2, -7.0, FLOOR + 10.5), (-10.8, 0.0, FLOOR + 11.0), (-12.2, 7.0, FLOOR + 10.5)], [20.5, 21.5, 20.5],
                      m["team_paint"], thick=0.6, up=(0, 0, 1))
    C.team(front)
    rig.rigid(front, "car")
    # a painted device on the siding (non-team, a dark rosette) and a quiver on the near side
    for i in range(8):
        a = 2 * math.pi * i / 8
        rig.rigid(C.sphere("rosette", 1.1, M.dark("#3a2c22", name="device"), seg=8, ring=6,
                           loc=(-24.0 + 3.2 * math.cos(a), -12.3, FLOOR + 11.0 + 3.2 * math.sin(a)), scale=(1, 0.3, 1)), "car")
    rig.rigid(C.sphere("rosettec", 1.5, m["polished"], loc=(-24.0, -12.4, FLOOR + 11.0), scale=(1, 0.4, 1)), "car")
    quiv = C.tube("quiver", [(-15.0, -12.8, FLOOR + 2.0), (-20.0, -13.4, FLOOR + 18.0)], [2.0, 2.3], m["leather"], seg=12)
    rig.rigid(quiv, "car")
    for i in range(3):
        rig.rigid(C.tube("arrow", [(-19.5 + i * 0.8, -13.2, FLOOR + 17.0), (-21.2 + i * 0.8, -13.4 + (i - 1) * 0.6, FLOOR + 22.5)], [0.3, 0.3],
                         m["linen"], seg=5), "car")
    # the draught pole from under the floor up to the yoke between the horses
    pts, rad = C.smooth_path([(-22.0, 0, FLOOR - 1.5), (-10.0, 0, FLOOR - 1.0), (4.0, 0, 30.0), (18.0, 0, 48.0), (HX + 13.0, 0, 58.5)],
                             [1.5, 1.5, 1.4, 1.3, 1.2], n=4)
    rig.rigid(C.tube("draughtpole", pts, rad, wood, seg=10), "car")
    yoke = C.tube("yoke", [(HX + 12.5, -HY - 4.0, 60.5), (HX + 13.0, -HY + 1.0, 62.5), (HX + 13.0, 0.0, 59.2), (HX + 13.0, HY - 1.0, 62.5),
                           (HX + 12.5, HY + 4.0, 60.5)], [1.1, 1.3, 1.4, 1.3, 1.1], wood, seg=10)
    rig.rigid(yoke, QN.p + "body")
    rig.rigid(C.sphere("yokeknob", 1.3, m["polished"], loc=(HX + 13.0, 0, 60.2)), QN.p + "body")
    # the wheels: six spokes, bronze hub with a short scythe blade, studded tyre
    for sg, bn in ((-1, "wheel_F"), (1, "wheel_B")):
        y = sg * TRACK
        fel = C.lathe("felloe", [(WR - 2.2, -1.4), (WR, -1.5), (WR + 0.3, 0.0), (WR, 1.5), (WR - 2.2, 1.4), (WR - 2.2, -1.4)], wood, seg=48)
        C.xform(fel, rot=(math.pi / 2, 0, 0), loc=(AX, y, WR))
        rig.rigid(fel, bn)
        for i in range(14):
            a = 2 * math.pi * i / 14
            rig.rigid(C.sphere("tyrestud", 0.6, m["bronze"], seg=8, ring=6, loc=(AX + (WR + 0.3) * math.cos(a), y, WR + (WR + 0.3) * math.sin(a))), bn)
        for i in range(6):
            a = 2 * math.pi * i / 6
            rig.rigid(C.tube("spoke", [(AX + 2.2 * math.cos(a), y, WR + 2.2 * math.sin(a)), (AX + (WR - 1.9) * math.cos(a), y, WR + (WR - 1.9) * math.sin(a))],
                             [1.0, 0.75], wood, seg=8), bn)
        hub = C.lathe("hub", [(0.0, -3.6), (1.5, -3.6), (2.8, -1.8), (3.0, 0.0), (2.8, 1.8), (1.5, 3.6), (0.0, 3.6)], m["bronze"], seg=20)
        C.xform(hub, rot=(math.pi / 2, 0, 0), loc=(AX, y, WR))
        rig.rigid(hub, bn)
        # scythe blade on the hub cap (sticks out sideways, fixed to the axle end, not the wheel)
        bl = BZ.ribbon("scythe", [(AX, y + sg * 3.0, WR), (AX, y + sg * 7.0, WR - 0.5), (AX - 2.0, y + sg * 10.5, WR - 2.5)], [2.6, 2.2, 0.4],
                       m["polished"], thick=0.35, up=(1, 0, 0.3))
        rig.rigid(bl, "car")
    # the pennant: a pole at the back of the car with a team swallowtail
    rig.rigid(C.tube("penpole", [(-42.0, 4.0, 16.0), (-42.0, 4.0, 108.0)], [0.8, 0.65], wood, seg=8), "pole")
    rig.rigid(C.cyl("penbracket", 1.2, 1.2, 4.0, m["bronze"], seg=10, loc=(-42.0, 4.0, FLOOR + 14.0)), "car")
    rig.rigid(C.sphere("penfinial", 1.2, m["polished"], loc=(-42.0, 4.0, 108.6)), "pole")
    pts = [(-42.4, 4.0, 104.0), (-49.0, 4.0, 103.2), (-56.0, 4.0, 102.0), (-63.0, 4.0, 100.6), (-70.0, 4.0, 99.0), (-76.0, 4.0, 97.6)]
    pen = BZ.ribbon("pennant", pts, [9.0, 8.4, 7.6, 6.6, 5.6, 5.0], m["team_cloth"], thick=0.4, up=(0, 0, 1), center=1.0)
    # swallowtail: notch the trailing end
    for v in pen.data.vertices:
        if v.co.x < -70.0:
            mid = 104.0 - 0.5 * 5.0 - (v.co.x + 42.4) * 0.19
            v.co.x += 4.0 * (1.0 - abs(v.co.z - (99.0 - 2.5)) / 2.5) if abs(v.co.z - (99.0 - 2.5)) < 2.5 else 0.0
    C.displace(pen, 0.4, 1.4)
    C.team(pen)
    rig.skin(pen, ["pole", "flag", "flag2"], soft=4.0)

    # ---- the charioteer
    k = DK
    skin = M.skin("#8c6a56")
    DRV.body(rig, skin)
    import bpy
    before = set(bpy.data.objects)
    BZ.linothorax(rig, DRV, m, pteruges=None, skirt="team", flaps=True)
    BZ.helmet(rig, k, m, "boar")
    BZ.crest(rig, k, m, bone="head", height=3.6, trail=True)
    BZ.hair_beard(rig, k, m)
    BZ.eyes(rig, k, m)
    BZ.bracers(rig, DRV, m)
    BZ.sandals(rig, DRV, m)
    ox, oy, oz = DRV.offset
    for o in set(bpy.data.objects) - before:
        if o.type == "MESH":
            C.xform(o, loc=(ox, oy, oz))
    kh = khopesh(m)
    for o in kh:
        o["weapon"] = 1
        rig.rigid(o, "hand_F")
    # the reins: from both bits to the driver's far hand (skinned between the bits and the hand)
    for Q in (QN, QF):
        dy = DY[Q.p]
        a = (HX + 41.5, dy - 3.0, 65.5)
        bft = (FIST[0] + 0.0, DRV.sw, FIST[2])
        n = 7
        pts = [(a[0] + (bft[0] - a[0]) * u, a[1] + (bft[1] - a[1]) * u, a[2] + (bft[2] - a[2]) * u - 4.0 * math.sin(math.pi * u)) for u in
               [i / (n - 1) for i in range(n)]]
        rn = C.tube("rein", pts, [0.28] * n, m["leather"], seg=6)
        g1, g2 = rn.vertex_groups.new(name=Q.p + "head"), rn.vertex_groups.new(name="hand_B")
        L = math.dist(a, bft)
        for v in rn.data.vertices:
            u = max(0.0, min(1.0, math.dist(v.co, a) / L))
            g1.add([v.index], 1 - u, "REPLACE")
            g2.add([v.index], u, "REPLACE")
        rig._prep(rn)
    return ctx


# ------------------------------------------------------------------------------------ poses
def hstand(Q):
    P = dict(root=(0.0, 0.0), pitch=0.0, hip=0.0, neck=0.0, head=0.0, tail=0.0, tail2=0.0, roll=0.0)
    P.update(Q.stand(1.8))
    return P


def gallop(Q, t, off):
    ph = (t / CYCLE + off) % 1.0
    P = hstand(Q)
    for key, o in {"hind_B": 0.0, "hind_F": 0.1, "fore_B": 0.34, "fore_F": 0.46}.items():
        kind = key.split("_")[0]
        x, z, pa = Q.step(ph - o, kind, STRIDE, 13.0 if kind == "fore" else 10.0, duty=DUTY, fold=95 if kind == "fore" else 70,
                          reach=6, sink=14)
        P[key] = (x, z, pa, 0.0)
    w = 2 * math.pi * ph
    P["root"] = (0.0, 1.2 + 2.2 * math.sin(w - 1.2))
    P["pitch"] = 4.0 * math.sin(w + 0.4)
    P["neck"] = -4 + 6 * math.sin(w - 0.3)
    P["head"] = 3 - 5 * math.sin(w - 0.8)
    P["tail"] = 18 + 8 * math.sin(w - 1.6)
    P["tail2"] = 10 * math.sin(w - 2.2)
    return P


def drv_stance():
    return dict(root=(0.0, -2.0), hips=0, spine=-6, chest=-3, neck=3, head=-4, footF=(6.0, G0, 0.0), footB=(-6.0, G0, 0.0),
                absF=(-10, 40, 34, 6), handB=((13.0, 36.0), 0))


def apply(ctx, PN, PF, PD, car=(0.0, 0.0, 0.0, 0.0, 0.0), wheel=0.0, pole=0.0, flag=(0.0, 0.0), flag2=(0.0, 0.0)):
    rig = ctx["rig"]
    rig.rest()
    orig = rig.rest
    rig.rest = lambda: None
    try:
        QN.apply(rig, PN)
        QF.apply(rig, PF)
        cx, cz, cp, croll, cdy = car
        PD = dict(PD)
        rx, rz = PD.get("root", (0.0, 0.0))
        if "pel" not in PD:
            PD["root"] = (rx + cx, rz + cz)
        DRV.apply(rig, PD, rest=False)
    finally:
        rig.rest = orig
    rig.set("car", r=math.radians(cp), ry=math.radians(croll), loc=(cx, cdy, cz))
    rig.set("wheel_F", r=math.radians(wheel))
    rig.set("wheel_B", r=math.radians(wheel))
    rig.set("pole", r=math.radians(pole))
    rig.set("flag", r=math.radians(flag[0]), rz=math.radians(flag[1]))
    rig.set("flag2", r=math.radians(flag2[0]), rz=math.radians(flag2[1]))


def idle(ctx, t):
    a = 2 * math.pi * t / 900.0
    PN, PF = hstand(QN), hstand(QF)
    for P, o in ((PN, 0.0), (PF, 1.7)):
        P["root"] = (0.0, 0.5 * math.sin(a + o))
        P["neck"] = 3 * math.sin(a + o - 0.5)
        P["head"] = -4 + 6 * max(0.0, math.sin(a * 2 + o))       # tossing heads, champing at the bit
        P["tail"] = 10 + 8 * math.sin(a + o)
        P["tail2"] = 10 * math.sin(a + o - 1.0)
    PF["fore_F"] = (PF["fore_F"][0] + 2.0, 1.5 + 2.5 * max(0.0, math.sin(a * 2 + 1.0)), PF["fore_F"][2] - 30 * max(0.0, math.sin(a * 2 + 1.0)), 0.0)
    PD = MO.breathe(drv_stance(), t, amp=0.8, arms=False)
    PD["absF"] = (-10 + 3 * math.sin(a - 0.4), 40 + 4 * math.sin(a - 0.8), 34 + 4 * math.sin(a - 0.8), 6)
    PD["handB"] = ((13.0 + 0.6 * math.sin(a + 0.4), 36.0 + 0.5 * math.sin(a)), 0)
    apply(ctx, PN, PF, PD, car=(0.0, 0.2 * math.sin(a), 0.0, 0.0, 0.0), pole=1.5 * math.sin(a - 0.6),
          flag=(4 * math.sin(a - 1.2), 10 * math.sin(a - 1.0)), flag2=(4 * math.sin(a - 2.0), 14 * math.sin(a - 1.8)))


def walk(ctx, t):
    PN, PF = gallop(QN, t, 0.0), gallop(QF, t, 0.07)
    ph = (t / CYCLE) % 1.0
    w = 2 * math.pi * ph
    bounce = 1.0 * math.sin(2 * w - 0.6)
    PD = drv_stance()
    PD["spine"] -= 6
    PD["chest"] -= 2
    PD["root"] = (0.0, -3.0 + 1.2 * math.sin(2 * w - 1.2))
    PD["footF"], PD["footB"] = (7.5, G0, 0.0), (-7.0, G0, 0.0)
    PD["head"] = -2 - 3 * math.sin(2 * w - 1.6)
    PD["absF"] = (-4 + 4 * math.sin(2 * w - 1.0), 50 + 6 * math.sin(2 * w - 1.4), 40, 6)
    PD["handB"] = ((15.0, 38.0 + 1.0 * math.sin(2 * w - 1.0)), 0)
    wheel = -math.degrees(t * ROLL / WR)
    apply(ctx, PN, PF, PD, car=(0.0, 0.5 * bounce, 1.2 * math.sin(2 * w), 2.0 * math.sin(w), 0.0), wheel=wheel,
          pole=-5 + 2 * math.sin(2 * w - 0.8), flag=(-6 + 3 * math.sin(2 * w - 1.4), 12 * math.sin(w)),
          flag2=(-8 + 4 * math.sin(2 * w - 2.2), 18 * math.sin(w - 1.0)))


def _atk():
    """Keys: horses (root dx, dz, pitch, neck, head, fore toe dz), car (dx, pitch), driver pose."""
    def hk(dx, dz, pitch, neck, head, fore=0.0, fold=0.0):
        return dict(hdx=dx, hdz=dz, hp=pitch, hn=neck, hh=head, fu=fore, ff=fold)
    ready = dict(hk(0, 0, 0, 0, 0), cx=0.0, cp=0.0, d=drv_stance())
    gather = dict(hk(-3, -3, -4, -8, -6, 0, 0), cx=-2.0, cp=1.0,
                  d=dict(drv_stance(), root=(-2.0, -3.0), spine=4, chest=4, neck=-2, head=-6, absF=(-150, -170, -160, 6)))
    wind = dict(hk(-5, -4, -6, -12, -8, 0, 0), cx=-3.5, cp=1.5,
                d=dict(drv_stance(), root=(-3.5, -3.2), spine=8, chest=6, neck=-4, head=-4, absF=(-162, -186, -176, 6)))
    wind2 = dict(wind, d=dict(wind["d"], absF=(-165, -190, -180, 6)))
    lunge = dict(hk(10, 4, 10, 10, 12, 10, 60), cx=6.0, cp=-2.0,
                 d=dict(drv_stance(), root=(6.0, -4.0), spine=-16, chest=-8, neck=4, head=0, absF=(80, 120, 110, 6)))
    impact = dict(hk(12, 2, 4, 6, 6, 4, 30), cx=8.0, cp=-3.0,
                  d=dict(drv_stance(), root=(8.0, -5.0), spine=-20, chest=-10, neck=6, head=2, absF=(40, 30, 0, 6)))
    held = dict(impact, hdx=12.5, cx=8.4)
    settle = dict(hk(6, -1, -2, -4, -4, 0, 0), cx=4.0, cp=0.5,
                  d=dict(drv_stance(), root=(4.0, -3.0), spine=-10, chest=-4, head=-2, absF=(10, 30, 20, 6)))
    rec = dict(hk(2, 0, 0, 2, 2, 0, 0), cx=1.0, cp=0.0, d=dict(drv_stance(), absF=(-6, 44, 36, 6)))
    return [(0, ready), (170, gather), (340, wind), (525, wind2), (548, lunge), (570, impact), (740, held), (840, settle),
            (1020, rec), (1230, ready)]


_ATK = _atk()


def attack(ctx, t):
    k = B.keyed([(tk, {kk: v for kk, v in P.items() if kk != "d"}) for tk, P in _ATK], t)
    PD = B.keyed([(tk, P["d"]) for tk, P in _ATK], t)
    PN, PF = hstand(QN), hstand(QF)
    for P in (PN, PF):
        P["root"] = (k["hdx"], k["hdz"])
        P["pitch"] = k["hp"]
        P["neck"] = k["hn"]
        P["head"] = k["hh"]
        for s in ("F", "B"):
            x, z, pa, top = P["fore_" + s]
            P["fore_" + s] = (x + k["hdx"] + 3.0, z + max(0.0, k["fu"]), pa - k["ff"], top)
            hx, hz, hpa, htop = P["hind_" + s]
            P["hind_" + s] = (hx + k["hdx"] * 0.4, hz, hpa, htop)
        P["tail"] = 20 + k["hp"]
    wheel = -math.degrees(k["cx"] / WR)
    apply(ctx, PN, PF, PD, car=(k["cx"], 0.0, k["cp"], 0.0, 0.0), wheel=wheel, pole=-k["cp"] * 3 - k["cx"] * 0.4,
          flag=(-k["cx"], 10 * math.sin(t / 130.0)), flag2=(-k["cx"] * 1.2, 16 * math.sin(t / 130.0 - 1.0)))


def hit(ctx, t):
    k = B.keyed([(0, {"c": 0.0}), (55, {"c": 1.0}), (140, {"c": -0.35}), (310, {"c": 0.0})], t)["c"]
    PN, PF = hstand(QN), hstand(QF)
    for P in (PN, PF):
        P["root"] = (-3.0 * k, 1.5 * k)
        P["pitch"] = 5 * k
        P["neck"] = 8 * k
        P["head"] = 10 * k
        P["tail"] = 20 * k
    PD = MO.knock_hit(drv_stance(), t, {}, back=4.0)
    apply(ctx, PN, PF, PD, car=(-2.0 * k, 0.5 * k, 2.0 * k, 0.0, 0.0), pole=8 * k, flag=(12 * k, 8 * k), flag2=(16 * k, 10 * k))


def hdie(Q, t, lag=0.0):
    t = max(0.0, t - lag)
    base = hstand(Q)
    buck = dict(hstand(Q), root=(2.0, -9.0), pitch=-10, neck=-8, head=-6, tail=24, roll=-3)
    L = {k: v for k, v in Q.stand(1.8).items()}
    fh, hh = Q.HOME["fore"], Q.HOME["hind"]
    lf, lh = Q.LAST["fore"], Q.LAST["hind"]
    buck.update({"fore_F": (fh + 4, 9.0, lf + 80, 0), "fore_B": (fh + 2, 7.0, lf + 70, 0), "hind_F": L["hind_F"], "hind_B": L["hind_B"]})
    sprawl = {"fore_F": (fh + 6, 3.0, lf - 70, -18), "fore_B": (fh + 4, 3.0, lf - 60, -14),
              "hind_F": (hh - 16, 3.0, lh + 70, 18), "hind_B": (hh - 12, 3.0, lh + 60, 14)}
    fall = dict(buck, root=(0.0, -20.0), pitch=-6, roll=-10, neck=-4, head=-8)
    fall.update(sprawl)
    down = dict(fall, root=(-1.0, -30.0), pitch=-2, roll=-16, neck=6, head=10, tail=-6)
    bounce = dict(down, root=(-1.2, -28.4), roll=-14, head=14)
    rest = dict(down, root=(-1.4, -30.4), roll=-17, neck=4, head=9)
    return B.keyed([(0, base), (70, buck), (240, fall), (380, down), (440, bounce), (560, rest), (970, rest)], t)


def die(ctx, t):
    PN, PF = hdie(QN, t), hdie(QF, t, lag=40.0)
    base = drv_stance()
    base["pel"] = (0.0, B.PELV * DRV.H + base.pop("root")[1])
    base.pop("absF")
    base.pop("handB")
    base["armF"] = (20, 50, 0, 6)
    base["armB"] = (30, 40, 0, -4)
    PD = MO.fall_back(base, t, DRV.H, G0)
    # thrown out of the car backward: the pelvis also travels back and drops the height of the floor
    d = B.keyed([(0, {"x": 0.0, "z": 0.0}), (120, {"x": -8.0, "z": 2.0}), (238, {"x": -22.0, "z": -FLOOR}), (695, {"x": -22.0, "z": -FLOOR})], t)
    PD["pel"] = (PD["pel"][0] + d["x"], PD["pel"][1] + d["z"])
    c = B.keyed([(0, {"x": 0.0, "z": 0.0, "p": 0.0, "r": 0.0, "dy": 0.0}), (130, {"x": 2.0, "z": 0.0, "p": -6.0, "r": 10.0, "dy": 0.0}),
                 (340, {"x": 5.0, "z": 2.0, "p": -10.0, "r": 58.0, "dy": -6.0}), (400, {"x": 5.5, "z": 0.0, "p": -8.0, "r": 70.0, "dy": -9.0}),
                 (570, {"x": 5.6, "z": -0.6, "p": -8.0, "r": 76.0, "dy": -10.0}), (970, {"x": 5.6, "z": -0.6, "p": -8.0, "r": 76.0, "dy": -10.0})], t)
    apply(ctx, PN, PF, PD, car=(c["x"], c["z"], c["p"], -c["r"], c["dy"]), pole=c["r"] * 0.2, flag=(20, 0), flag2=(20, 0))


def pose(ctx, clip, t):
    {"idle": idle, "walk": walk, "attack": attack, "hit": hit, "die": die}[clip](ctx, t)


def clips():
    atk = G.Clip("attack", MO.HEAVY_ATTACK_MS, sequence=MO.HEAVY_ATTACK_SEQ, impact=4, smear=3, times=ATK_T, blur={3: 28})
    for i, s in ((4, 0.05), (5, 0.35), (6, 0.6)):
        atk.fx[i] = {"s": s, "origin": (-22, 0), "spread": 16, "n": 10, "size": 5.5, "seed": 5}
    die_c = G.Clip("die", [60, 70, 80, 70, 60, 60, 80, 90, 90, 100, 100, 110], sequence=[0, 1, 2, 3, 3, 4, 5, 5, 6, 6, 7, 7], extra={
        "fx": [{"id": "fx.dust_poof", "atMs": 860, "offsetLu": [0, 12], "scale": 1.5}], "hideUnitAtMs": 970})
    die_c.fx = MO.dust_frames(die_c, 240, span=640, origin=(0, 0), spread=40, size=9.0, seed=9)
    return [
        G.Clip("idle", IDLE_MS, loop=True),
        G.Clip("walk", [100] * 8, loop=True),
        atk,
        G.Clip("hit", MO.HIT_MS, times=MO.HIT_TIMES),
        die_c,
    ]
