"""Destrier Knight: Medieval Age heavy cavalry (lance charge), realistic style. heightLu 118.

A late 14th-century knight on a bay destrier. The horse: a heavy, deep-chested bay with black
points (mane, tail, lower legs), a steel chanfron, a leather bridle and reins, and a team-dyed wool
caparison over the body to below the belly with a dark wool hem, a high war saddle
with iron stirrups. The knight: a full plate harness (pauldrons, couters, vambraces, gauntlets,
cuisses, poleyns, greaves, sabatons) under a team jupon, a visored bascinet (hounskull) with a
mail aventail and a team plume, a team heater shield with a pale cross on the near arm and an ash
lance with a steel vamplate and a team swallow-tailed pennon in the far hand.
Idle: the horse breathes, shifts its head and swishes its tail; the knight sits tall. Walk: a
rocking canter (body pitch, rider absorbing it). Attack: the horse gathers and half-rears as the
knight draws the lance back (held), then lunges forward as the lance drives in level (smear), a
held impact, recovery. Hit: the horse flinches and throws its head, the rider rocks back. Die: the
horse buckles onto its knees and chest; the knight is thrown off behind it; dust.
"""
import math

from mathutils import Matrix

from lib import biped as B
from lib import core as C
from lib import game as G
from lib import horse as Hs
from lib import mats as M
from lib import medieval as MD
from lib import motion as MO

SLUG = "destrier_knight"
NAME = "Destrier Knight"
AGE = "medieval"
KIND = "unit"
HEIGHT_LU = 118
PX1 = 1.23
SCALE1 = 1.5
CANVAS = (248, 150)
FEET = (112, 10)
YAW = -12.0
ANCHORS = {"head": (0, 112), "hitCenter": (0, 50)}

HR = 62.0
BODY = B.Biped(H=HR, bulk=1.05)
BODY.root = "rider"
BODY.offset = (-3.0, 0.0, 61.5 - B.PELV * HR)
K = BODY.k
FIST_B = (0.35 * K + BODY.offset[0], BODY.sw, 31.0 * K + BODY.offset[2])
LANCE_F = 64.0 * K
LANCE_B = 16.0 * K
TRACKERS = {"lanceTip": ("hand_B", (FIST_B[0] + LANCE_F + 6.0 * K, FIST_B[1], FIST_B[2]))}
SHIELD_FORE = 100.0
EXTRA = {"plume": ((BODY.offset[0] - 0.5 * K, 0, BODY.offset[2] + 70.0 * K), (BODY.offset[0] - 7.0 * K, 0, BODY.offset[2] + 68.0 * K), "head"),
         "pennon": ((FIST_B[0] + LANCE_F - 4.0 * K, FIST_B[1], FIST_B[2]), (FIST_B[0] + LANCE_F - 20.0 * K, FIST_B[1], FIST_B[2]), "hand_B")}

STRIDE = 26.0
DUTY = 0.42
WALK = {"strideLu": STRIDE / DUTY * math.cos(math.radians(YAW))}
ATK_T = [0, 170, 340, 548, 570, 750, 840, 1020, 1120]
SMEAR_COLOR = "#c4bfb4"
SMEAR_ALPHA = 0.5
SMEAR_N = 26


def build():
    k = K
    coat = C.mat("coat", "#5a3e2e", rough=0.55, noise=0.08, nscale=0.5, bump=0.15, sheen=0.2, ramp2="#4a3226")
    points = C.mat("points", "#211c1a", rough=0.6, noise=0.1, nscale=1.0, bump=0.2)
    mane = M.hair("#1a1614", name="mane")
    hoof = M.hoof()
    st = MD.steel()
    dst = MD.dark_steel()
    mail = MD.mail()
    brass = MD.brass()
    leather = M.leather("#3e3028")
    team = MD.team_wool()
    paint = MD.team_paint()
    hem = MD.wool("#2e2622", name="hem")
    cream = MD.linen("#cfc3a6", name="charge")
    wood = M.wood("#9a8468", "#7e6a52", stripes=0.6, name="lance")
    slit = M.dark("#0e0d0d", name="slit")
    eye = M.eye("heye")

    bones = Hs.bones()
    bones.update(BODY.bones(extra=EXTRA, root_parent="h_body"))
    rig = C.Rig("knight_rig", bones, yaw_deg=YAW)

    # ---------------- the horse
    Hs.body(rig, coat, points, hoof, mane, heavy=1.18)
    # the caparison: heavy team-dyed wool over the back and hindquarters, hanging in pleats to below
    # the belly, with a dark wool hem
    cap_bones = ["h_body", "h_pelvis", "h_foreS_F", "h_foreS_B", "h_hindT_F", "h_hindT_B"]
    cap_bias = {"h_foreS_F": 5.0, "h_foreS_B": 5.0, "h_hindT_F": 5.0, "h_hindT_B": 5.0}
    def _top(x):
        pts = [(-30.5, 47.0), (-26.0, 54.5), (-19.0, 59.8), (-8.0, 59.6), (4.0, 59.2), (12.0, 61.6), (19.0, 60.0), (24.5, 55.0)]
        for (x0, z0), (x1, z1) in zip(pts, pts[1:]):
            if x <= x1:
                t = max(0.0, min(1.0, (x - x0) / (x1 - x0)))
                return z0 + (z1 - z0) * (3 * t * t - 2 * t * t * t)
        return pts[-1][1]
    CAP = dict(xs=(-30.5, 24.5), top_z=_top,
               half_w=lambda x: 10.3 - 2.6 * max(0.0, (x - 14) / 10.5) ** 2 + 0.5 * math.cos((x + 16) * 0.12) - 2.4 * max(0.0, (-x - 22) / 8.5) ** 2,
               hem_z=lambda x: 29.0 + 4.5 * max(0.0, (x - 6) / 18.5) ** 1.5 + 3.0 * max(0.0, (-x - 16) / 14.5) ** 1.5,
               folds=1.1, fold_len=4.2, seed=0.4, round_top=0.4)
    cap = MD.drape("caparison", team, thick=0.6, **CAP)
    C.displace(cap, 0.35, 1.6)
    C.team(cap)
    rig.skin(cap, cap_bones, soft=4.0, bias=cap_bias)
    for hm in MD.drape_hem("cap_hem", hem, band=1.5, **CAP):
        rig.skin(hm, cap_bones, soft=4.0, bias=cap_bias)
    # the war saddle and stirrup leathers
    saddle = C.blobs("saddle", [((-2.5, 0, 59.4), (8.2, 6.8, 2.0)), ((-10.0, 0, 62.4), (1.8, 5.6, 4.0)),
                                ((5.0, 0, 62.0), (2.0, 5.0, 3.6))], leather, res=0.45)
    rig.skin(saddle, ["h_body", "h_pelvis"], soft=3.0)
    # chanfron, bridle, reins
    chan = C.blobs("chanfron", [((36.9, 0, 64.8), (2.3, 3.45, 6.5), (0, -0.62, 0)), ((33.6, 0, 70.4), (3.2, 4.0, 2.4))],
                   st, res=0.35)
    rig.rigid(chan, "h_head")
    rig.rigid(C.sphere("chanfron_spike", 0.9, brass, loc=(35.4, -2.9, 68.6)), "h_head")
    for a, b in (((33.0, 0, 71.5), (39.8, 0, 58.2)), ((32.2, 0, 70.8), (35.4, 0, 60.4))):
        for sd in (-1, 1):
            rig.rigid(C.tube("bridle", [(a[0], sd * 3.4, a[2]), (b[0], sd * 3.2, b[2])], [0.3, 0.3], leather, seg=5), "h_head")
    rein = C.tube("rein", [(39.5, -2.8, 59.6), (30, -4.0, 62), (18, -5.4, 63.5), (6.5, -5.4, 62.8)], [0.32] * 4, leather, seg=6)
    rig.skin(rein, ["h_head", "h_neck", "h_body"], soft=3.0)
    for sd in (-1, 1):
        sl = C.tube("stirrup_leather", [(-1.0, sd * 7.2, 59.6), (-0.8, sd * 12.2, 55.0), (-0.4, sd * 15.6, 43.0)], [0.35, 0.35, 0.35], leather, seg=5, flat=0.5)
        rig.rigid(sl, "h_body")

    # ---------------- the knight
    ox, oy, oz = BODY.offset
    MD.dressed_body(rig, BODY, M.skin("#a88468", name="rskin"), mail, mail, torso_mat=mail, glove=dst)
    MD.plate_harness(rig, BODY, st, dst, leather)
    MD.tabard(rig, BODY, team, hem_mat=hem, length=31.0, bulk=1.16, slit=True)
    MD.belt(rig, BODY, leather, z=37.2, bulk=1.2, buckle=brass)
    MD.coif(rig, BODY, mail, open_face=False)
    MD.great_bascinet(rig, BODY, st, slit)
    # a team plume on the crown, a follow-through bone
    Sx = MD.S(k, BODY.offset)
    pl = C.blobs("plume", [(Sx(-0.5 - 2.3 * u, 0, 71.0 + 1.6 * math.sin(u * 2.2)), (2.6 - 0.7 * u, 1.6 - 0.35 * u, 1.9 - 0.4 * u))
                           for u in (0, 0.35, 0.7, 1.05, 1.4, 1.8)], team, res=0.3)
    C.displace(pl, 0.45, 0.6)
    C.team(pl)
    rig.skin(pl, ["head", "plume"], soft=2.0, bias={"head": 2.0})
    # stirrups on the feet
    for s in ("F", "B"):
        hy = (-1 if s == "F" else 1) * BODY.hw
        rig.rigid(C.lathe("stirrup", [(1.5 * k, -0.4 * k), (1.9 * k, 0.0), (1.5 * k, 0.4 * k)], dst, seg=12,
                          loc=(ox + 3.0 * k, hy, oz + 1.4 * k), rot=(math.pi / 2, 0, 0)), "foot_" + s)

    # the heater shield on the near forearm, facing the camera
    parts = MD.heater_shield(k, paint, dst, charge_mat=cream, height=24.0, width=17.0, charge="cross")
    MD.mount_on_forearm(parts, BODY, "F", SHIELD_FORE, (7.2 * k, 3.4 * k, 0.4 * k), yaw_deg=24.0, roll_deg=-8.0)
    for o in parts:
        rig.rigid(o, "forearm_F")

    # the lance in the far fist, along +X; a team swallow-tailed pennon behind the tip
    fx, fy, fz = FIST_B
    lp = [C.lathe("lance", [(0.0, -LANCE_B), (1.1 * k, -LANCE_B), (1.2 * k, -4 * k), (0.95 * k, 0), (1.1 * k, 4 * k),
                            (0.8 * k, LANCE_F * 0.6), (0.55 * k, LANCE_F), (0.0, LANCE_F + 0.5 * k)], wood, seg=12, rot=(0, math.pi / 2, 0)),
          C.lathe("vamplate", [(1.0 * k, 3.0 * k), (4.0 * k, 6.8 * k), (3.6 * k, 7.4 * k), (1.0 * k, 5.6 * k)], st, seg=20,
                  rot=(0, math.pi / 2, 0)),
          C.lathe("lancehead", [(0.62 * k, LANCE_F - 1.0 * k), (0.85 * k, LANCE_F), (0.0, LANCE_F + 6.0 * k)], st, seg=10,
                  rot=(0, math.pi / 2, 0))]
    for o in lp:
        C.xform(o, loc=(fx, fy, fz))
        o["weapon"] = 1
        rig.rigid(o, "hand_B")
    pts = [(-16.0 * k * u, 0.5 * k * math.sin(4 * u), 0.0) for u in (0.0, 0.25, 0.5, 0.75, 1.0)]
    pen = C.tube("pennon", pts, [3.6 * k, 3.4 * k, 3.0 * k, 2.4 * k, 1.6 * k], team, seg=12, flat=0.1)
    # the swallow tail: notch the free end
    for v in pen.data.vertices:
        if v.co.x < -12.0 * k and abs(v.co.y) < 1.4 * k:
            v.co.x += 3.0 * k * (1 - abs(v.co.y) / (1.4 * k))
    C.xform(pen, rot=(math.pi / 2, 0, 0))
    C.xform(pen, loc=(fx + LANCE_F - 4.5 * k, fy, fz - 3.2 * k))
    C.team(pen)
    rig.skin(pen, ["hand_B", "pennon"], soft=2.5 * k, bias={"hand_B": 4.0 * k})
    return dict(rig=rig)


# ------------------------------------------------------------------------------ poses
def rider_base(lean=0.0, b=0.0):
    return dict(root=(0.0, 0.0), hips=-4 + lean * 0.5, spine=4 + lean + 0.8 * b, chest=2 + lean * 0.5 - 0.5 * b,
                neck=-4 - lean, head=-2 - lean * 0.5, footF=(4.5, 7.8, 16.0), footB=(4.5, 7.8, 16.0))


def rider_apply(rig, R):
    BODY.apply(rig, R, rest=False)
    for s, sg in (("F", -1), ("B", 1)):
        # thighs round the barrel (over the caparison), lower legs hanging close to the flank
        pb = rig.obj.pose.bones["thigh_" + s]
        e = pb.rotation_euler
        pb.rotation_euler = (e[0], e[1], math.radians(44 * sg))
        pb = rig.obj.pose.bones["shin_" + s]
        e = pb.rotation_euler
        pb.rotation_euler = (e[0], e[1], math.radians(-30 * sg))


def horse_to_rider(HP, pw):
    """World side-plane point -> rider-local coordinates (the rider rides on h_body)."""
    dx, dz = HP.get("h_root", (0.0, 0.0))
    pitch = math.radians(HP.get("h_pitch", 0.0))
    v = (pw[0] - Hs.PIVOT[0] - dx, pw[1] - Hs.PIVOT[1] - dz)
    v = C.rot2(v, -pitch)
    return (v[0] + Hs.PIVOT[0] - BODY.offset[0], v[1] + Hs.PIVOT[1] - BODY.offset[2])


ARM_F = (26, SHIELD_FORE, 60)


def idle(t):
    a = 2 * math.pi * t / 900.0
    HP = Hs.stand()
    HP.update(h_root=(0, 0.35 * math.sin(a)), h_pitch=0.5 * math.sin(a), h_neck=-4 + 4 * math.sin(a - 0.7),
              h_head=6 + 4 * math.sin(a - 1.4), h_tail=5 * math.sin(a + 0.3), h_tail2=8 * math.sin(a - 0.5))
    R = rider_base(0, math.sin(a))
    R.update(absF=(ARM_F[0], ARM_F[1] + 1.5 * math.sin(a - 0.6), ARM_F[2]),
             absB=(8, 64 + 2 * math.sin(a), 66 + 2 * math.sin(a - 0.5), 6),
             bones={"plume": (4 * math.sin(a - 1.2), 6 * math.sin(a - 0.8)), "pennon": (5 * math.sin(a - 1.6), 14 * math.sin(a - 1.0))})
    return HP, R


def canter(t):
    ph = (t / 800.0) % 1.0
    HP = {}
    phases = {"hind_B": 0.0, "hind_F": 0.1, "fore_B": 0.32, "fore_F": 0.42}
    for leg, off in phases.items():
        kind = leg.split("_")[0]
        HP[leg] = Hs.gallop_leg(ph - off, kind, stride=STRIDE, lift=13.0 if kind == "fore" else 10.0, duty=DUTY) + (0.0,)
    rock = math.sin(2 * math.pi * (ph - 0.3))
    HP["h_root"] = (0.0, -1.0 + 2.2 * math.sin(2 * math.pi * (ph - 0.55)))
    HP["h_pitch"] = 4.5 * rock
    HP["h_neck"] = -8 - 8 * rock
    HP["h_head"] = 8 + 6 * math.sin(2 * math.pi * (ph - 0.1))
    HP["h_tail"] = 20 + 8 * math.sin(2 * math.pi * (ph + 0.2))
    HP["h_tail2"] = 12 + 10 * math.sin(2 * math.pi * (ph + 0.05))
    R = rider_base(lean=6)
    R["hips"] -= 2.5 * rock
    R["spine"] += 2.0 * rock
    R["root"] = (0.0, -0.8 * math.sin(2 * math.pi * (ph - 0.62)))
    R.update(absF=(ARM_F[0] + 2, ARM_F[1], ARM_F[2]), absB=(14, 84, 14 + 3 * rock, 6),
             bones={"plume": (-10 - 6 * rock, 8 * math.sin(2 * math.pi * ph)), "pennon": (-6 - 6 * rock, 16 * math.sin(2 * math.pi * ph - 1.0))})
    return HP, R


def attack(t):
    std = Hs.stand()
    ready_h = dict(std, h_neck=-4, h_head=6, h_tail=6)
    ready_r = dict(rider_base(3), absF=ARM_F, absB=(10, 80, 26, 6), bones={"plume": 0, "pennon": 0})
    gather_h = dict(std, h_root=(-3.0, 1.5), h_pitch=8, h_hip=-4, h_neck=-10, h_head=14, h_tail=16, h_tail2=10,
                    fore_F=(24.0, 8.0, -20.0, 10.0))
    gather_r = dict(rider_base(-2), absF=(28, SHIELD_FORE, 60), absB=(-6, 58, 24, 8), bones={"plume": (8, 0), "pennon": (10, 0)})
    rear_h = dict(h_root=(-5.0, 7.0), h_pitch=22, h_hip=-9, h_neck=-14, h_head=18, h_tail=26, h_tail2=18,
                  fore_F=(26.0, 28.0, -70.0, 28.0), fore_B=(22.0, 22.0, -60.0, 20.0),
                  hind_F=(-13.0, 0.6, Hs.PASTERN_H, 0.0), hind_B=(-15.0, 0.6, Hs.PASTERN_H, 0.0))
    rear_r = dict(rider_base(10), absF=(30, SHIELD_FORE, 60), absB=(-22, 48, 26, 8), bones={"plume": (16, 0), "pennon": (18, 4)})
    rear2_h = dict(rear_h, h_pitch=24, h_root=(-5.4, 7.8))
    rear2_r = dict(rear_r, absB=(-26, 44, 28, 8))
    lunge_h = dict(h_root=(8.0, -3.5), h_pitch=-7, h_hip=2, h_neck=6, h_head=-4, h_tail=14, h_tail2=10,
                   fore_F=(38.0, 0.6, Hs.PASTERN_F + 10, 0.0), fore_B=(33.0, 0.6, Hs.PASTERN_F + 6, 0.0),
                   hind_F=(-14.0, 0.6, Hs.PASTERN_H + 18, 0.0), hind_B=(-20.0, 1.6, Hs.PASTERN_H - 30, 0.0))
    lunge_r = dict(rider_base(16), absF=(34, SHIELD_FORE, 60), absB=(66, 88, -4, 6), bones={"plume": (-18, 0), "pennon": (-20, -6)})
    hold_h = dict(lunge_h, h_root=(9.0, -4.2), h_pitch=-8)
    hold_r = dict(lunge_r, spine=4 + 18, absB=(72, 90, -3, 6), bones={"plume": (-10, 4), "pennon": (-8, 10)})
    rec_h = dict(ready_h, h_root=(4.0, -1.0), h_pitch=-2,
                 fore_F=(28.0, 0.6, Hs.PASTERN_F, 0.0), fore_B=(25.0, 0.6, Hs.PASTERN_F, 0.0))
    rec_r = dict(rider_base(6), absF=ARM_F, absB=(30, 86, 10, 6), bones={"plume": (6, 0), "pennon": (4, 0)})
    kh = [(0, ready_h), (170, gather_h), (340, rear_h), (525, rear2_h), (570, lunge_h), (620, hold_h), (840, hold_h),
          (1020, rec_h), (1230, ready_h)]
    kr = [(0, ready_r), (170, gather_r), (340, rear_r), (525, rear2_r), (570, lunge_r), (620, hold_r), (840, hold_r),
          (1020, rec_r), (1230, ready_r)]
    return B.keyed(kh, t), B.keyed(kr, t)


def hit(t):
    std = dict(Hs.stand(), h_neck=-4, h_head=6)
    flinch = dict(std, h_root=(-4.0, 1.2), h_pitch=6, h_neck=-14, h_head=20, h_tail=20, fore_F=(22.0, 3.0, -10.0, 6.0))
    r0 = dict(rider_base(3), absF=ARM_F, absB=(10, 80, 26, 6), bones={"plume": 0, "pennon": 0})
    r1 = dict(rider_base(-10), neck=10, head=16, absF=(20, SHIELD_FORE - 10, 60), absB=(-10, 60, 44, 6),
              bones={"plume": (18, 6), "pennon": (16, 8)})
    kh = [(0, std), (55, flinch), (140, dict(flinch, h_root=(-3.0, 0.8), h_head=10)), (310, std)]
    kr = [(0, r0), (55, r1), (140, dict(r1, head=6, bones={"plume": (-6, 0), "pennon": (-6, 0)})), (310, r0)]
    return B.keyed(kh, t), B.keyed(kr, t)


def die(t):
    std = dict(Hs.stand(), h_neck=-4, h_head=6)
    k1 = dict(std, h_root=(-3.0, 1.0), h_pitch=8, h_neck=-16, h_head=22, h_tail=24)
    kneel = dict(h_root=(2.0, -16.0), h_pitch=-14, h_hip=6, h_neck=-2, h_head=4, h_tail=10, h_tail2=6,
                 fore_F=(14.0, 0.6, -70.0, -10.0), fore_B=(12.0, 0.6, -75.0, -10.0),
                 hind_F=(-18.0, 0.6, Hs.PASTERN_H, 0.0), hind_B=(-20.0, 0.6, Hs.PASTERN_H, 0.0))
    down = dict(h_root=(2.0, -27.0), h_pitch=-3, h_hip=4, h_neck=16, h_head=30, h_tail=-10, h_tail2=-6,
                fore_F=(22.0, 0.6, -80.0, -24.0), fore_B=(20.0, 0.6, -84.0, -24.0),
                hind_F=(-6.0, 0.6, -60.0, 20.0), hind_B=(-8.0, 0.6, -64.0, 20.0))
    bounce = dict(down, h_root=(2.0, -25.5), h_pitch=-1, h_neck=8, h_head=20)
    rest = dict(down, h_root=(2.0, -27.4), h_neck=24, h_head=38)
    kh = [(0, std), (60, k1), (210, kneel), (350, down), (420, bounce), (500, rest), (990, rest)]
    HP = B.keyed(kh, t)
    pz = B.PELV * HR
    r0 = dict(rider_base(3), absF=ARM_F, absB=(10, 80, 26, 6), bones={"plume": 0, "pennon": 0})
    r0["pel"] = (0.0, pz)
    r1 = dict(r0, pel=(-1.0, pz + 1.0), spine=-8, neck=10, head=16, absB=(-20, 50, 60, 6), bones={"plume": (20, 0), "pennon": (20, 0)})
    world = lambda p: horse_to_rider(HP, p)
    r2 = dict(r1, root_r=38, pel=world((-22.0, 50.0)), spine=-4, absB=(120, 140, 120, 10), absF=(120, 150, 60))
    r3 = dict(r2, root_r=78, pel=world((-40.0, 16.0)), footF=world((-12.0, 26.0)) + (40.0,), footB=world((-14.0, 24.0)) + (40.0,))
    r4 = dict(r3, root_r=88, pel=world((-44.0, 5.0)), footF=world((-24.0, 12.0)) + (60.0,), footB=world((-26.0, 8.0)) + (60.0,),
              absB=(200, 230, 160, 10), absF=(200, 230, 60), bones={"plume": (40, 0), "pennon": (10, 0)})
    r5 = dict(r4, root_r=84, pel=world((-44.5, 6.8)), head=-12)
    r6 = dict(r4, pel=world((-45.0, 5.0)), footF=world((-22.0, 4.0)) + (70.0,), footB=world((-24.0, 3.0)) + (70.0,))
    for r in (r1, r2):
        r.pop("footF", None), r.pop("footB", None)
    kr = [(0, r0), (60, r1), (200, r2), (290, r3), (350, r4), (420, r5), (500, r6), (990, r6)]
    R = B.keyed(kr, t)
    if t < 200:
        R["footF"] = rider_base()["footF"]
        R["footB"] = rider_base()["footB"]
    return HP, R


def pose(ctx, clip, t):
    rig = ctx["rig"]
    rig.rest()
    HP, R = {"idle": idle, "walk": canter, "attack": attack, "hit": hit, "die": die}[clip](t)
    Hs.apply(rig, HP)
    rider_apply(rig, R)


def clips():
    atk = G.Clip("attack", MO.HEAVY_ATTACK_MS, sequence=MO.HEAVY_ATTACK_SEQ, impact=4, smear=3, times=ATK_T, blur={3: 30})
    for i, s in ((4, 0.04), (5, 0.3), (6, 0.55)):
        atk.fx[i] = {"s": s, "origin": (34, 0), "spread": 14, "n": 10, "size": 6.0, "seed": 7}
    die_c = G.Clip("die", MO.HEAVY_DIE_MS, sequence=MO.HEAVY_DIE_SEQ, extra={
        "fx": [{"id": "fx.dust_poof", "atMs": 880, "offsetLu": [-10, 10], "scale": 1.3}], "hideUnitAtMs": 990})
    die_c.fx = MO.dust_frames(die_c, 340, span=560, origin=(-10, 0), spread=36, size=9.0, seed=9)
    return [
        G.Clip("idle", MO.HEAVY_IDLE_MS, loop=True),
        G.Clip("walk", [100] * 8, loop=True),
        atk,
        G.Clip("hit", MO.HIT_MS, times=MO.HIT_TIMES),
        die_c,
    ]
