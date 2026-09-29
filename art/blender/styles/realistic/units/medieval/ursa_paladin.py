"""Ursa Paladin: Medieval Age Legendary siege heavy (cleave, roar), realistic style. heightLu 190.

A giant brown war bear: a massive shoulder hump, a broad dished face with a pale muzzle, small
round ears, a heavy grizzled coat (darker legs, paler tips on the hump), long pale claws. It wears a
steel chanfron on its brow, a leather breast strap and a team-dyed quilted caparison over its back
and flanks with a dark leather hem and a wool fringe, under a high war saddle. On it rides a
paladin in full plate under a team surcoat: a great helm with a brass crown and a team plume, a
dark wool cape, an oversized steel warhammer (brass-banded ash haft) in the near hand and a tall
team war banner in the far hand. Plume, cape, banner and the bear's head follow through.
Idle: the bear breathes and swings its head; the banner stirs. Walk: a heavy four-beat walk with a
rolling shoulder. Attack: the bear rears and roars while the paladin hauls the hammer overhead
(held); the bear crashes down on its forepaws as the hammer smashes in front of its muzzle (smear,
held impact, dust), recovery. Hit: the bear flinches and snarls. Die: the bear sinks onto its chest
and rolls onto its side; the paladin slumps; dust.
"""
import math

from lib import biped as B
from lib import core as C
from lib import game as G
from lib import mats as M
from lib import medieval as MD
from lib import motion as MO
from lib.quad import Quad

SLUG = "ursa_paladin"
NAME = "Ursa Paladin"
AGE = "medieval"
KIND = "unit"
HEIGHT_LU = 190
PX1 = 1.025
SCALE1 = 1.25
CANVAS = (340, 236)
FEET = (170, 12)
YAW = -12.0
ANCHORS = {"head": (10, 186), "hitCenter": (0, 80)}

FORE = [(39.1, 84), (46, 48.72), (50.6, 20.16), (52.9, 7.56), (62.1, 1.51)]
HIND = [(-46, 77.28), (-34.5, 48.72), (-52.9, 18.48), (-51.75, 5.88), (-35.65, 1.51)]
Q = Quad(FORE, HIND, (0, 67.2), 17.0,
         neck=((50.6, 80.64), (73.6, 73.92)), head=((73.6, 73.92), (115, 58.8)), tail=((-71.3, 72.24), (-77.05, 67.2), (-79.35, 62.16)),
         jaw=((89.7, 60.48), (115, 55.44)), prefix="u_")

HR = 70.0
BODY = B.Biped(H=HR, bulk=1.12)
BODY.root = "rider"
SEAT = (4.6, 0.0, 96.0)
BODY.offset = (SEAT[0], SEAT[1], SEAT[2] - B.PELV * HR)
K = BODY.k
FIST_F = (0.35 * K + BODY.offset[0], -BODY.sw + BODY.offset[1], 31.0 * K + BODY.offset[2])
FIST_B = (0.35 * K + BODY.offset[0], BODY.sw + BODY.offset[1], 31.0 * K + BODY.offset[2])
HAFT = 40.0
TRACKERS = {"hammerHead": ("hand_F", (FIST_F[0] + HAFT, FIST_F[1], FIST_F[2]))}
POLE_UP, POLE_DN = 70.0, 26.0


def _rb(pt, a_deg=88.0):
    a = math.radians(a_deg)
    x, z = pt[0] - FIST_B[0], pt[2] - FIST_B[2]
    return (FIST_B[0] + x * math.cos(a) + z * math.sin(a), pt[1], FIST_B[2] - x * math.sin(a) + z * math.cos(a))


EXTRA = {
    "plume": ((BODY.offset[0] - 0.8 * K, 0, BODY.offset[2] + 71.5 * K), (BODY.offset[0] - 8.0 * K, 0, BODY.offset[2] + 69.0 * K), "head"),
    "cape": ((BODY.offset[0] - 3.5 * K, 0, BODY.offset[2] + 56.0 * K), (BODY.offset[0] - 6.5 * K, 0, BODY.offset[2] + 34.0 * K), "chest"),
}
BAN_A = 88.0
EXTRA["ban1"] = (_rb((FIST_B[0] - 1.0, FIST_B[1], FIST_B[2] + POLE_UP - 6.0)), _rb((FIST_B[0] - 13.0, FIST_B[1], FIST_B[2] + POLE_UP - 12.0)), "hand_B")
EXTRA["ban2"] = (_rb((FIST_B[0] - 13.0, FIST_B[1], FIST_B[2] + POLE_UP - 12.0)), _rb((FIST_B[0] - 24.0, FIST_B[1], FIST_B[2] + POLE_UP - 26.0)), "ban1")

DUTY = 0.66
STRIDE = 38.0
WALK_MS = [110] * 8
WALK = {"strideLu": STRIDE / DUTY * math.cos(math.radians(YAW))}
ATK_T = [0, 170, 340, 548, 570, 750, 840, 1020, 1120]
SMEAR_COLOR = "#c2bcb0"
SMEAR_ALPHA = 0.55
SMEAR_N = 28
SHARPEN1 = 0.0
SHEET_FACTOR = 0.82


def _rot_banner(pt):
    """Banner parts are authored upright (as held, hand angle BAN_A) and turned into the hand's rest
    frame (props lie along +X from the fist)."""
    a = math.radians(BAN_A)
    x, z = pt[0] - FIST_B[0], pt[2] - FIST_B[2]
    return (FIST_B[0] + x * math.cos(a) + z * math.sin(a), pt[1], FIST_B[2] - x * math.sin(a) + z * math.cos(a))


def build():
    fur = M.coat("#5a4334", "#43322a", name="bearfur", noise=0.14, nscale=1.6, bump=0.3, sheen=0.15)
    fur_tip = M.coat("#7a624e", "#5e4a3a", name="beartip", noise=0.16, nscale=1.3, bump=0.55, sheen=0.25)
    fur_far = M.coat("#45352b", "#362a22", name="bearfar", noise=0.14, nscale=1.6, bump=0.3, sheen=0.15)
    leg_dk = M.coat("#4a382d", "#3a2c24", name="bearleg", noise=0.14, nscale=1.6, bump=0.3, sheen=0.15)
    muzzle_m = C.mat("bearmuzzle", "#7c6650", rough=0.7, noise=0.12, nscale=1.4, bump=0.4, sheen=0.2)
    nose = C.mat("bearnose", "#1e1a18", rough=0.3, noise=0.1, nscale=1.0, bump=0.3, coat=0.4)
    gum = C.mat("beargum", "#5a3a34", rough=0.4, noise=0.1, bump=0.2)
    claw = M.horn("#b8ab94", name="claw")
    tooth = M.ivory("#ddd2bc", name="tooth")
    eye = C.mat("beareye", "#2a1c14", rough=0.15, noise=0.05, bump=0, coat=1.0)
    st = MD.steel()
    dst = MD.dark_steel()
    mail = MD.mail()
    brass = MD.brass()
    leather = M.leather("#3e3028")
    team = MD.team_wool()
    quilt = C.mat("team_quilt", "#999999", rough=0.9, noise=0.1, nscale=1.0, bump=0.7, team=True, sheen=0.5)
    hem = M.leather("#2e2420", name="caphem")
    cape = MD.wool("#4e3a36", name="cape", dark="#3e2e2c")
    ash = M.wood("#9a8468", "#7e6a52", stripes=0.6, name="ash")
    slit = M.dark("#0e0d0d", name="slit")
    cloth = MD.team_wool(name="banner")
    charge = MD.linen("#d8ccb0", name="charge")

    bones = Q.bones()
    bones.update(BODY.bones(extra=EXTRA, root_parent="u_body"))
    rig = C.Rig("ursa_rig", bones, yaw_deg=YAW)
    p = Q.p

    # ---------------------------------------------------------------- the bear
    body = C.blobs("bear_body", [
        (( 26, 0, 104), (20.7, 17, 8.4)),                 # shoulder hump
        (( 34, 0, 82), (25.3, 22, 19.32)),                  # chest / shoulders
        ((  0, 0, 80), (39.1, 23, 17.64)),                  # barrel
        ((  0, 0, 64), (32.2, 18, 7.56)),                   # belly
        ((-41.4, 0, 68.88), (24.15, 21, 15.96)),                  # hips
        ((-48.3, 0, 77.28), (14.95, 16, 5.04)),                   # rump
        (( 50, 0, 88), (17.25, 16, 12.6), (0, 0.35, 0)),    # neck (carried low)
        (( 38, 0, 60), (13.8, 20, 12.6)),                  # forelimb masses
        ((-41.4, 0, 52.08), (17.25, 20, 14.28)),                  # thigh masses
    ], fur, res=1.0)
    C.displace(body, 0.9, 0.3)
    rig.skin(body, [p + "body", p + "pelvis", p + "neck", p + "foreS_F", p + "foreS_B", p + "hindT_F", p + "hindT_B"],
             soft=5.0, bias={p + "foreS_F": 5.0, p + "foreS_B": 5.0, p + "hindT_F": 5.0, p + "hindT_B": 5.0, p + "neck": 2.0})
    # long shaggy hair hanging under the belly and chest
    skirt = C.blobs("bear_skirt", [((6.9, 0, 49.56), (29.9, 16, 4.2)), ((36.8, 0, 52.08), (11.5, 17, 5.04)), ((-25.3, 0, 51.24), (13.8, 16, 4.2))], fur, res=0.8)
    C.displace(skirt, 2.0, 0.22)
    rig.skin(skirt, [p + "body", p + "pelvis"], soft=5.0)
    tips = C.blobs("bear_tips", [((27.6, 0, 91.56), (16.1, 13, 5.04)), ((50.6, 0, 84), (10.35, 12, 5.04), (0, 0.3, 0))], fur_tip, res=0.9)
    C.displace(tips, 1.2, 0.2)
    rig.skin(tips, [p + "body", p + "neck"], soft=4.0)
    for sd, y in Q.Y.items():
        lm = leg_dk if sd == "F" else fur_far
        fore = C.blobs("fore_" + sd, [((43.7, y, 48.72), (13.8, 10, 14.28)), ((48.3, y, 28.56), (10.92, 8.0, 10.92)), ((51.75, y, 12.6), (8.28, 7.0, 5.88)),
                                      ((58.65, y, 4.2), (10.92, 7.6, 3.86))], lm, res=0.7)
        C.displace(fore, 0.6, 0.35)
        rig.skin(fore, Q.leg_bones("fore", sd), soft=2.2, bias={p + "foreS_" + sd: 3.0})
        hind = C.blobs("hind_" + sd, [((-39.1, y, 55.44), (17.25, 11, 15.12), (0, 0.3, 0)), ((-44.85, y, 33.6), (11.5, 8.5, 11.76), (0, -0.4, 0)),
                                      ((-51.75, y, 15.12), (8.05, 6.8, 6.72)), ((-43.7, y, 3.86), (13.22, 7.6, 3.7))], lm, res=0.7)
        C.displace(hind, 0.6, 0.35)
        rig.skin(hind, Q.leg_bones("hind", sd), soft=2.2, bias={p + "hindT_" + sd: 3.0})
        for i in range(4):
            dy = (i - 1.5) * 2.9
            rig.rigid(C.tube("claw", [(66.12, y + dy, 3.7), (70.72, y + dy, 2.52), (72.45, y + dy, 0.67)], [0.85, 0.6, 0.12], claw, seg=6),
                      p + "foreP_" + sd)
            rig.rigid(C.tube("hclaw", [(-32.2, y + dy, 2.86), (-29.32, y + dy, 1.85), (-28.29, y + dy, 0.67)], [0.75, 0.5, 0.1], claw, seg=6),
                      p + "hindP_" + sd)
    head = C.blobs("bear_head", [((79.6, 0, 73.92), (12, 11, 10.5)), ((77.6, 0, 65.92), (10, 12.5, 8)), ((89.6, 0, 72.92), (6, 8, 4)),
                                 ((100.6, 0, 63.92), (10.5, 6.6, 6.2), (0, 0.3, 0)), ((95.6, 0, 58.92), (8, 7.4, 4.5))], fur, res=0.55)
    C.displace(head, 0.6, 0.35)
    rig.rigid(head, p + "head")
    mz = C.blobs("bear_muzzle", [((105.6, 0, 63.13), (6.2, 5.0, 4.6), (0, 0.3, 0))], muzzle_m, res=0.45)
    rig.rigid(mz, p + "head")
    rig.rigid(C.blobs("bear_nose", [((111.4, 0, 62.92), (2.4, 3.4, 2.4))], nose, res=0.3), p + "head")
    for sy in (-1, 1):
        rig.rigid(C.blobs("bear_ear", [((72.6, sy * 9.2, 82.92), (2.8, 1.6, 2.8), (0, -0.3, 0))], fur, res=0.4), p + "head")
        rig.rigid(C.sphere("bear_eye", 1.1, eye, loc=(92.1, sy * 6.2, 70.92), scale=(0.8, 0.6, 0.5)), p + "head")
        rig.rigid(C.blobs("bear_brow", [((91.6, sy * 6.6, 73.13), (3.2, 1.4, 1.1), (0, -0.25, 0))], fur, res=0.3), p + "head")
        rig.rigid(C.tube("fang", [(104.6, sy * 3.4, 59.52), (105, sy * 3.2, 55.92)], [0.9, 0.2], tooth, seg=6), p + "head")
    jaw = C.blobs("bear_jaw", [((97.6, 0, 56.33), (10.5, 6.2, 3.2), (0, 0.2, 0)), ((105.6, 0, 55.92), (4.2, 4.4, 2.3))], fur, res=0.4)
    rig.rigid(jaw, p + "jaw")
    rig.rigid(C.blobs("bear_mouth", [((99.6, 0, 58.72), (8.4, 5.0, 1.6))], gum, res=0.35), p + "jaw")
    for sy in (-1, 1):
        rig.rigid(C.tube("lfang", [(106.6, sy * 2.9, 56.92), (106.8, sy * 2.8, 59.72)], [0.8, 0.2], tooth, seg=6), p + "jaw")
    tail = C.blobs("bear_tail", [((-71.3, 0, 72.24), (4.6, 4.0, 3.36)), ((-75.32, 0, 68.04), (3.45, 3.0, 2.86))], fur, res=0.5)
    rig.skin(tail, [p + "tail", p + "tail2"], soft=2.0)

    # chanfron on the brow, breast strap with a brass boss
    chan = C.blobs("chanfron", [((88.6, 0, 76.33), (9.5, 7.8, 2.2), (0, 0.3, 0)), ((79.6, 0, 81.92), (4.5, 8.6, 2.4), (0, -0.3, 0))], st, res=0.4)
    rig.rigid(chan, p + "head")
    rig.rigid(C.lathe("chanspike", [(0.0, 0.0), (1.6, 0.5), (1.1, 2.4), (0.0, 5.0)], brass, seg=12, loc=(85.6, 0, 78.92),
                      rot=(0, math.radians(-30), 0)), p + "head")
    for sy in (-1, 1):
        rig.rigid(C.sphere("rivet", 0.8, brass, loc=(92.6, sy * 5.6, 73.92)), p + "head")
    strap = C.blobs("breast", [((62.1, 0, 63.84), (3.68, 22.5, 2.52), (0, 0.9, 0))], leather, res=0.5)
    rig.skin(strap, [p + "body", p + "neck"], soft=4.0)
    rig.rigid(C.sphere("boss", 2.6, brass, loc=(68.42, -8.0, 62.16), scale=(0.8, 1, 0.84)), p + "body")

    # the team caparison: heavy quilted wool over the back and flanks in pleats, a dark leather hem
    cap_b = [p + "body", p + "pelvis", p + "foreS_F", p + "foreS_B", p + "hindT_F", p + "hindT_B"]
    cap_bias = {p + "foreS_F": 8.0, p + "foreS_B": 8.0, p + "hindT_F": 8.0, p + "hindT_B": 8.0}

    def _top(x):
        pts = [(-62, 74.0), (-48, 85.5), (-30, 88.5), (0, 89.5), (16, 92.0), (30, 99.5), (44, 95.0), (53, 88.0)]
        for (x0, z0), (x1, z1) in zip(pts, pts[1:]):
            if x <= x1:
                t = max(0.0, min(1.0, (x - x0) / (x1 - x0)))
                return z0 + (z1 - z0) * (3 * t * t - 2 * t * t * t)
        return pts[-1][1]
    CAP = dict(xs=(-62.0, 53.0), top_z=_top,
               half_w=lambda x: 23.6 - 3.0 * max(0.0, (x - 34) / 19) ** 2 - 3.0 * max(0.0, (-x - 46) / 16) ** 2,
               hem_z=lambda x: 58.0 + 3.0 * max(0.0, (x - 28) / 25) + 1.5 * math.sin(x * 0.05),
               folds=2.0, fold_len=7.5, seed=1.1, round_top=0.42)
    cap = MD.drape("caparison", quilt, thick=0.9, nu=70, nv=40, **CAP)
    C.displace(cap, 0.5, 1.4)
    C.team(cap)
    rig.skin(cap, cap_b, soft=6.0, bias=cap_bias)
    for hm in MD.drape_hem("cap_hem", hem, band=2.4, **CAP):
        rig.skin(hm, cap_b, soft=6.0, bias=cap_bias)
    saddle = C.blobs("saddle", [((4.6, 0, 92.6), (14.95, 10, 2.35)), ((-8.05, 0, 96.4), (2.76, 9, 4.54)), ((17.25, 0, 95.6), (2.99, 8, 3.86))],
                     leather, res=0.6)
    rig.skin(saddle, [p + "body"], soft=4.0)
    for sy in (-1, 1):
        g = C.tube("girth", [(4.6, sy * 10, 91.4), (4.6, sy * 25.6, 78.0), (4.6, sy * 26.0, 60.5)], [1.3, 1.3, 1.3], leather, seg=6, flat=0.4)
        rig.skin(g, [p + "body"], soft=4.0)

    # ---------------------------------------------------------------- the paladin
    ox, oy, oz = BODY.offset
    MD.dressed_body(rig, BODY, M.skin("#a88468", name="rskin"), mail, mail, torso_mat=mail, glove=dst)
    MD.plate_harness(rig, BODY, st, dst, leather)
    MD.tabard(rig, BODY, team, hem_mat=hem, length=30.0, bulk=1.18, slit=True)
    MD.belt(rig, BODY, leather, z=37.2, bulk=1.22, buckle=brass)
    MD.coif(rig, BODY, mail, open_face=False)
    MD.great_helm(rig, BODY, st, slit, cross=brass)
    Sx = MD.S(K, BODY.offset)
    crown = C.lathe("crown", [(4.3 * K, 69.2 * K), (4.6 * K, 69.6 * K), (4.6 * K, 71.2 * K), (4.2 * K, 71.0 * K)], brass, seg=28,
                    scale=(1.14, 0.97, 1.0), loc=(0.8 * K + ox, oy, oz))
    rig.rigid(crown, "head")
    for i in range(8):
        a = 2 * math.pi * i / 8
        rig.rigid(C.lathe("crownpt", [(0.9 * K, 0.0), (0.2 * K, 2.4 * K), (0.0, 2.6 * K)], brass, seg=8,
                          loc=(0.8 * K + ox + 4.9 * K * math.cos(a), oy + 4.3 * K * math.sin(a), 70.8 * K + oz)), "head")
    pl = C.blobs("plume", [(Sx(-0.8 - 2.4 * u, 0, 72.5 + 1.8 * math.sin(u * 2.0)), (2.8 - 0.7 * u, 1.8 - 0.4 * u, 2.1 - 0.4 * u))
                           for u in (0, 0.35, 0.7, 1.05, 1.4, 1.8)], team, res=0.35)
    C.displace(pl, 0.5, 0.6)
    C.team(pl)
    rig.skin(pl, ["head", "plume"], soft=2.0, bias={"head": 2.0})
    cp = C.blobs("cape", [(Sx(-4.2, 0, 53.0), (2.2, 7.8, 4.0)), (Sx(-5.6, 0, 44.0), (1.8, 8.4, 6.0)), (Sx(-6.8, 0, 34.0), (1.6, 8.8, 5.0))],
                 cape, res=0.45)
    C.displace(cp, 0.5, 0.8)
    rig.skin(cp, ["chest", "cape"], soft=3.0, bias={"chest": 3.0})
    for s in ("F", "B"):
        hy = (-1 if s == "F" else 1) * BODY.hw
        rig.rigid(C.lathe("stirrup", [(1.6 * K, -0.4 * K), (2.0 * K, 0.0), (1.6 * K, 0.4 * K)], dst, seg=12,
                          loc=(ox + 3.0 * K, hy, oz + 1.4 * K), rot=(math.pi / 2, 0, 0)), "foot_" + s)

    # the warhammer in the near fist: an ash haft, brass bands, a steel head with a back spike
    fx, fy, fz = FIST_F
    hm_parts = [C.tube("haft", [(fx - 9.0, fy, fz), (fx + HAFT + 2.0, fy, fz)], [1.05, 0.95], ash, seg=10)]
    for x in (fx - 8.0, fx + HAFT - 6.0, fx + HAFT - 12.0):
        hm_parts.append(C.lathe("hband", [(1.1, -0.9), (1.35, 0.0), (1.1, 0.9)], brass, seg=12, loc=(x, fy, fz), rot=(0, math.pi / 2, 0)))
    hx = fx + HAFT
    hm_parts.append(C.box("hhead", 6.4, 5.6, 9.0, st, bevel=0.9, loc=(hx, fy, fz + 1.0)))
    hm_parts.append(C.box("hface", 7.2, 6.2, 2.4, dst, bevel=0.5, loc=(hx, fy, fz + 6.4)))
    hm_parts.append(C.lathe("hspike", [(2.2, 0.0), (1.4, 3.0), (0.0, 7.5)], st, seg=10, loc=(hx, fy, fz - 3.2), rot=(math.pi, 0, 0)))
    hm_parts.append(C.lathe("htop", [(1.6, 0.0), (0.0, 4.0)], st, seg=10, loc=(hx + 3.0, fy, fz + 1.0), rot=(0, math.pi / 2, 0)))
    hm_parts.append(C.sphere("hpommel", 1.6, brass, loc=(fx - 9.6, fy, fz)))
    for o in hm_parts:
        o["weapon"] = 1
        rig.rigid(o, "hand_F")

    # the war banner in the far fist (authored upright as held, then turned into the hand's rest frame)
    bx, by, bz = FIST_B
    ban_parts = [(C.tube("bpole", [(bx, by, bz - POLE_DN), (bx, by, bz + POLE_UP)], [0.95, 0.8], ash, seg=10), None),
                 (C.lathe("bfinial", [(0.0, 0.0), (1.4, 0.6), (1.0, 2.6), (0.0, 5.6)], brass, seg=10, loc=(bx, by, bz + POLE_UP)), None),
                 (C.tube("bcross", [(bx, by, bz + POLE_UP - 2.6), (bx - 26.0, by, bz + POLE_UP - 3.6)], [0.55, 0.5], ash, seg=8), None)]
    for o, _ in ban_parts:
        rig.rigid(o, "hand_B")
    top = bz + POLE_UP - 3.6
    import bmesh
    bmb = bmesh.new()
    nu, nv = 14, 16
    vv = {}
    for j in range(nv + 1):
        for i in range(nu + 1):
            u, v = i / nu, j / nv
            x = bx - 1.0 - 24.5 * u
            zz = top - 30.0 * v
            if v > 0.82:                          # swallow-tailed end: notch the middle of the fly
                zz = top - 30.0 * (0.82 + (v - 0.82) * (1.0 - 0.9 * max(0.0, 1 - abs(u - 0.5) / 0.25)))
            yy = by - 0.9 * math.sin(u * 7.0 + v * 2.0) * (0.3 + v)
            vv[(i, j)] = bmb.verts.new((x, yy, zz))
    for j in range(nv):
        for i in range(nu):
            bmb.faces.new((vv[(i, j)], vv[(i + 1, j)], vv[(i + 1, j + 1)], vv[(i, j + 1)]))
    ban = C.from_bm("banner", bmb, cloth)
    so = ban.modifiers.new("so", "SOLIDIFY")
    so.thickness = 0.5
    C.apply_mods(ban)
    ban.data.shade_smooth()
    C.team(ban)
    ch = C.blobs("bcharge", [((bx - 13.0, by - 1.4, top - 13.0), (1.9, 0.5, 7.0)), ((bx - 13.0, by - 1.4, top - 10.5), (6.4, 0.5, 1.7))],
                 charge, res=0.3)
    edge = C.tube("bhem", [(bx - 1.0 - 24.5 * i / 12, by - 0.2, top - 0.6) for i in range(13)], [0.6] * 13, brass, seg=5)
    # turn everything on the banner into the hand's rest frame, then skin the cloth to its bones
    for o in [x for x, _ in ban_parts] + [ban, ch, edge]:
        MD.rot_about(o, FIST_B, BAN_A, "Y")
    for o in (ban, ch, edge):
        rig.skin(o, ["hand_B", "ban1", "ban2"], soft=4.0, bias={"hand_B": 3.0})
    return dict(rig=rig)


# ------------------------------------------------------------------------------ poses
def stand():
    P = dict(root=(0.0, 0.0), pitch=0.0, hip=0.0, neck=0.0, head=0.0, jaw=0.0, tail=0.0, tail2=0.0, roll=0.0)
    P.update(Q.stand(2.5))
    return P


ARM_F = (22, 88, 30)            # hammer carried forward and up
ARM_B = (26, 86, 88, 6)         # banner held upright


def rider_base(lean=0.0, b=0.0):
    return dict(root=(0.0, 0.0), hips=-3 + lean * 0.5, spine=2 + lean + 0.8 * b, chest=2 + lean * 0.5 - 0.5 * b,
                neck=-3 - lean, head=-2 - lean * 0.5, footF=(5.0, 9.0, 14.0), footB=(5.0, 9.0, 14.0),
                absF=ARM_F, absB=ARM_B)


def rider_apply(rig, R):
    BODY.apply(rig, R, rest=False)
    for s, sg in (("F", -1), ("B", 1)):
        pb = rig.obj.pose.bones["thigh_" + s]
        e = pb.rotation_euler
        pb.rotation_euler = (e[0], e[1], math.radians(34 * sg))


def _xb(P, R, bones):
    P["bones"] = bones
    return P, R


def idle(t):
    a = 2 * math.pi * t / 900.0
    P = stand()
    P.update(root=(0.0, -0.6 + 0.8 * math.sin(a)), pitch=0.5 * math.sin(a + 0.4), neck=2 * math.sin(a - 0.6),
             head=-2 + 3 * math.sin(a - 1.2), jaw=-2 - 2 * max(0.0, math.sin(a - 2.0)), tail=6 * math.sin(a))
    R = rider_base(0, math.sin(a))
    R["absF"] = (ARM_F[0] + 2 * math.sin(a - 0.5), ARM_F[1] + 2 * math.sin(a - 0.8), ARM_F[2])
    R["absB"] = (ARM_B[0], ARM_B[1] + 1.5 * math.sin(a - 0.4), ARM_B[2], ARM_B[3])
    return _xb(P, R, {"plume": (4 * math.sin(a - 1.2), 6 * math.sin(a - 0.8)), "cape": 3 * math.sin(a - 1.0),
                      "ban1": (4 * math.sin(a - 1.4), 10 * math.sin(a - 1.0)), "ban2": (6 * math.sin(a - 2.0), 14 * math.sin(a - 1.6))})


def walk(t):
    ph = (t / 880.0) % 1.0
    P = stand()
    for key, o in {"hind_B": 0.0, "fore_B": 0.25, "hind_F": 0.5, "fore_F": 0.75}.items():
        kind = key.split("_")[0]
        x, z, pa = Q.step(ph - o, kind, STRIDE, 13.0, duty=DUTY, fold=70 if kind == "fore" else 55, reach=5, sink=8)
        P[key] = (x, z, pa, 0.0)
    w = 4 * math.pi * ph
    s1 = math.sin(2 * math.pi * ph)
    P["root"] = (0.0, -1.4 + 1.8 * math.cos(w))
    P["roll"] = 2.4 * s1
    P["pitch"] = 1.2 * math.sin(w + 0.5)
    P["neck"] = -4 + 3 * math.sin(w + 1.2)
    P["head"] = -2 + 3 * math.sin(w + 0.8)
    P["tail"] = 8 * s1
    R = rider_base(4)
    R["spine"] += 2.0 * math.sin(w - 0.6)
    R["root"] = (0.0, -0.6 * math.sin(w - 0.8))
    R["absF"] = (ARM_F[0] + 3 * math.sin(w - 0.9), ARM_F[1], ARM_F[2])
    return _xb(P, R, {"plume": (-10 - 4 * math.sin(w), 6 * s1), "cape": -8 - 3 * math.sin(w - 0.8),
                      "ban1": (-6 - 3 * math.sin(w - 1.0), 14 * math.sin(2 * math.pi * ph - 1.0)),
                      "ban2": (-8 - 4 * math.sin(w - 1.6), 18 * math.sin(2 * math.pi * ph - 1.8))})


def _legs(dxf=0.0, zf=None, paf=0.0, dxh=0.0, pah=0.0):
    out = {}
    for k, v in Q.stand(2.5).items():
        if k.startswith("fore"):
            out[k] = (v[0] + dxf, zf if zf is not None else v[1], v[2] + paf, 0.0)
        else:
            out[k] = (v[0] + dxh, v[1], v[2] + pah, 0.0)
    return out


def attack(t):
    ready = stand()
    back = dict(stand(), root=(-6.0, -4.0), pitch=3, hip=-3, neck=6, head=6, jaw=-8, tail=8)
    back.update(_legs(-3, paf=6, pah=10))
    rear = dict(stand(), root=(-16.0, 12.0), pitch=24, hip=-18, neck=14, head=18, jaw=-34, tail=16)
    rear.update({"fore_F": (Q.HOME["fore"] + 6, 40.0, Q.LAST["fore"] - 70, 20),
                 "fore_B": (Q.HOME["fore"] - 2, 32.0, Q.LAST["fore"] - 60, 14),
                 "hind_F": (Q.HOME["hind"] - 4, Q.TOE_Z["hind"], Q.LAST["hind"] + 16, 0),
                 "hind_B": (Q.HOME["hind"] + 1, Q.TOE_Z["hind"], Q.LAST["hind"] + 16, 0)})
    rear2 = dict(rear, root=(-16.6, 13.0), pitch=25, jaw=-38)
    crash = dict(stand(), root=(4.0, -3.0), pitch=-4, hip=3, neck=-4, head=-6, jaw=-30, tail=4)
    crash.update(_legs(8, zf=7.0, paf=-12))
    impact = dict(stand(), root=(7.0, -9.0), pitch=-7, hip=4, neck=-8, head=-10, jaw=-36, tail=-4)
    impact.update(_legs(10, paf=16, pah=-6))
    held = dict(impact, root=(7.2, -9.4), jaw=-32)
    reb = dict(stand(), root=(4.0, -4.0), pitch=-2, neck=0, head=0, jaw=-14)
    reb.update(_legs(6, paf=6))
    rec = dict(stand(), root=(1.0, -1.0), jaw=-4)
    rec.update(_legs(2))
    kh = [(0, ready), (170, back), (340, rear), (525, rear2), (548, crash), (570, impact), (740, held),
          (840, reb), (1020, rec), (1230, ready)]
    r0 = rider_base(0)
    r1 = dict(rider_base(-4), absF=(90, 150, 130), absB=(20, 80, 88, 6))
    r2 = dict(rider_base(16), spine=-6, chest=-8, absF=(170, 210, 190), absB=(10, 70, 88, 6), head=4)
    r2b = dict(r2, absF=(174, 214, 196))
    r3 = dict(rider_base(10), absF=(120, 128, 80), absB=(24, 84, 88, 6))
    r4 = dict(rider_base(22), spine=18, chest=10, absF=(64, 70, -20), absB=(34, 90, 88, 6))
    r5 = dict(r4, spine=20, absF=(62, 66, -24))
    r6 = dict(rider_base(10), absF=(50, 80, 10), absB=(30, 88, 88, 6))
    r7 = dict(rider_base(4), absF=(34, 88, 26))
    kr = [(0, r0), (170, r1), (340, r2), (525, r2b), (548, r3), (570, r4), (740, r5), (840, r6), (1020, r7), (1230, r0)]
    ban = [(0, {"b": (0.0, 0.0)}), (340, {"b": (14.0, 8.0)}), (548, {"b": (-6.0, -4.0)}), (570, {"b": (-18.0, -10.0)}),
           (740, {"b": (-8.0, 10.0)}), (1020, {"b": (4.0, 2.0)}), (1230, {"b": (0.0, 0.0)})]
    b = B.keyed(ban, t)["b"]
    P, R = B.keyed(kh, t), B.keyed(kr, t)
    for k in ("footF", "footB"):
        R[k] = r0[k]
    return _xb(P, R, {"plume": (b[0], b[1] * 0.5), "cape": b[0] * 0.6, "ban1": (b[0], b[1]), "ban2": (b[0] * 1.3, b[1] * 1.3)})


def hit(t):
    base = stand()
    k = dict(base, root=(-6.0, -2.0), pitch=4, neck=10, head=14, jaw=-26, tail=12)
    k2 = dict(k, root=(-5.0, -2.6), neck=2, head=4, jaw=-16)
    P = B.keyed([(0, base), (55, k), (140, k2), (310, base)], t)
    r0 = rider_base(0)
    r1 = dict(rider_base(-10), neck=10, head=14, absF=(10, 70, 40), absB=(12, 74, 88, 6))
    R = B.keyed([(0, r0), (55, r1), (140, dict(r1, head=4)), (310, r0)], t)
    for kk in ("footF", "footB"):
        R[kk] = r0[kk]
    b = B.keyed([(0, {"b": 0.0}), (55, {"b": 16.0}), (140, {"b": -8.0}), (310, {"b": 0.0})], t)["b"]
    return _xb(P, R, {"plume": (b, 0), "cape": b * 0.6, "ban1": (b, b * 0.5), "ban2": (b * 1.2, b * 0.6)})


def die(t):
    base = stand()
    buck = dict(stand(), root=(-3.0, -10.0), pitch=6, hip=-4, neck=12, head=16, jaw=-30, tail=10, roll=-3)
    buck.update({k: (v[0], v[1], v[2] + 30, 0) for k, v in Q.stand(2.5).items()})
    sprawl = {"fore_F": (Q.HOME["fore"] + 22, 4.0, Q.LAST["fore"] - 70, -18), "fore_B": (Q.HOME["fore"] + 16, 4.0, Q.LAST["fore"] - 60, -14),
              "hind_F": (Q.HOME["hind"] - 22, 4.0, Q.LAST["hind"] + 70, 18), "hind_B": (Q.HOME["hind"] - 16, 4.0, Q.LAST["hind"] + 60, 14)}
    fall = dict(buck, root=(-5.0, -24.0), pitch=2, roll=-10, neck=0, head=-4, jaw=-20)
    fall.update(sprawl)
    down = dict(fall, root=(-6.0, -35.0), pitch=-3, roll=-16, neck=-14, head=-10, jaw=-10)
    bounce = dict(down, root=(-6.0, -33.0), neck=-10, head=-6)
    rest = dict(down, root=(-6.2, -35.6), neck=-16, head=-12, jaw=-8)
    P = B.keyed([(0, base), (60, buck), (210, fall), (350, down), (420, bounce), (500, rest), (990, rest)], t)
    r0 = rider_base(0)
    r1 = dict(rider_base(-12), neck=12, head=16, absF=(40, 110, 60), absB=(8, 60, 88, 6))
    r2 = dict(rider_base(-20), spine=-16, chest=-10, neck=14, head=20, absF=(100, 150, 90), absB=(-10, 40, 80, 6))
    r3 = dict(rider_base(30), spine=30, chest=16, neck=10, head=10, absF=(20, 40, -20), absB=(40, 60, 20, 6))
    r4 = dict(r3, spine=34, chest=20, head=20)
    R = B.keyed([(0, r0), (60, r1), (210, r2), (350, r3), (420, r4), (500, r3), (990, r3)], t)
    for kk in ("footF", "footB"):
        R[kk] = r0[kk]
    b = B.keyed([(0, {"b": 0.0}), (210, {"b": 20.0}), (350, {"b": -20.0}), (500, {"b": -10.0}), (990, {"b": -10.0})], t)["b"]
    return _xb(P, R, {"plume": (b, 0), "cape": b * 0.8, "ban1": (b, 4.0), "ban2": (b * 1.3, 6.0)})


def pose(ctx, clip, t):
    rig = ctx["rig"]
    P, R = {"idle": idle, "walk": walk, "attack": attack, "hit": hit, "die": die}[clip](t)
    Q.apply(rig, P)
    rider_apply(rig, R)


def clips():
    atk = G.Clip("attack", MO.HEAVY_ATTACK_MS, sequence=MO.HEAVY_ATTACK_SEQ, impact=4, smear=3, times=ATK_T, blur={3: 30})
    for i, s in ((4, 0.04), (5, 0.3), (6, 0.5), (7, 0.75)):
        atk.fx[i] = {"s": s, "origin": (58, 0), "spread": 30, "n": 14, "size": 11.0, "seed": 4}
    die_c = G.Clip("die", MO.HEAVY_DIE_MS, sequence=MO.HEAVY_DIE_SEQ, extra={
        "fx": [{"id": "fx.dust_poof", "atMs": 880, "offsetLu": [-6, 18], "scale": 1.9}], "hideUnitAtMs": 990})
    die_c.fx = MO.dust_frames(die_c, 345, span=640, origin=(-6, 0), spread=46, size=16.0, seed=12)
    return [
        G.Clip("idle", MO.HEAVY_IDLE_MS, loop=True),
        G.Clip("walk", WALK_MS, loop=True),
        atk,
        G.Clip("hit", MO.HIT_MS, times=MO.HIT_TIMES),
        die_c,
    ]
