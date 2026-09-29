"""Pikeman: Medieval Age anti-armor (pike, reach 70, Brace), realistic style. heightLu 72.

A late 15th-century pikeman: a steel sallet with a flared tail, a steel breast- and backplate with a
laced fauld, a team-dyed wool doublet with full puffed sleeves and a pleated team skirt to mid
thigh, wool hose and leather ankle boots. The pike is a long ash shaft with a steel leaf head on
iron langets and a small team pennon that streams behind it. He stands braced with the pike levelled
in both hands. Attack: draw back and coil (held), a long level lunge (smear), a held full extension
at the contact, recovery. Hit: knocked back. Die: a heavy fall on his back; the pike drops.
"""
import math

from lib import biped as B
from lib import core as C
from lib import mats as M
from lib import medieval as MD
from lib import motion as MO

SLUG = "pikeman"
NAME = "Pikeman"
AGE = "medieval"
KIND = "unit"
HEIGHT_LU = 72
PX1 = 1.23
SCALE1 = 1.5
H = 69.0
CANVAS = (252, 112)
FEET = (122, 9)
YAW = -24.0
ANCHORS = {"head": (2, 68), "hitCenter": (0, 33)}

BODY = B.Biped(H=H, bulk=1.0)
K = BODY.k
FIST = (0.35 * K, -BODY.sw, 31.0 * K)
FRONT = 50.0 * K           # shaft length in front of the near fist
BACK = 32.0 * K
GRIP = 17.0 * K            # far hand behind the near hand along the shaft
TRACKERS = {"pikeTip": ("hand_F", (FIST[0] + FRONT + 9.5 * K, FIST[1], FIST[2]))}
EXTRA_BONES = {"pennon": ((FIST[0] + FRONT - 1.0 * K, FIST[1], FIST[2]), (FIST[0] + FRONT - 14.0 * K, FIST[1], FIST[2]), "hand_F")}

STANCE = 0.62
STRIDE = 25.0
WALK = {"strideLu": STRIDE * math.cos(math.radians(YAW)) / STANCE}
G0 = B.ANKLE * H
SMEAR_COLOR = "#bdb8ae"
SMEAR_ALPHA = 0.5
SMEAR_N = 30


def build():
    k = K
    skin = M.skin("#a9866c")
    hair = M.hair("#4a3a2c")
    eye = M.eye()
    st = MD.steel()
    dst = MD.dark_steel()
    brass = MD.brass()
    hose = MD.wool("#5e544a", name="hose", dark="#4f463e")
    leather = M.leather("#4b3b30")
    glove = M.leather("#5e4a3a", name="glove")
    team = MD.team_wool()
    wood = M.wood("#8a7560", "#6a5a4a", stripes=0.6, name="ash")
    lace = M.leather("#3a2e26", name="lace")

    rig = C.Rig("pikeman_rig", BODY.bones(extra=EXTRA_BONES), yaw_deg=YAW)
    parts = MD.dressed_body(rig, BODY, skin, team, hose, torso_mat=team, glove=glove)
    for nm in ("arm_F", "arm_B", "torso"):
        C.team(parts[nm])
    Sx = MD.S(k)
    # full puffed upper sleeves (team) with a dark band at the elbow
    for s, y in (("F", -BODY.sw / k), ("B", BODY.sw / k)):
        sg = -1 if s == "F" else 1
        pf = C.blobs("puff_" + s, [(Sx(0.0, y + sg * 0.3, 51.4), (3.3, 3.2, 4.0)), (Sx(0.2, y, 47.8), (2.9, 2.9, 2.7))],
                     team, res=0.3 * k)
        C.displace(pf, 0.45 * k, 1.4)
        C.team(pf)
        rig.skin(pf, ["upperarm_" + s, "chest"], soft=1.4 * k, bias={"chest": 2.5 * k})
        cuff = C.blobs("cuff_" + s, [(Sx(-0.4, y, 43.8), (2.35, 2.35, 0.9))], lace, res=0.25 * k)
        rig.skin(cuff, ["upperarm_" + s, "forearm_" + s], soft=1.0 * k)
    # pleated skirt (bases) below the cuirass
    sk = C.blobs("bases", [(Sx(-0.2, 0, 35.2), (5.6, 7.4, 3.2)), (Sx(0.3, -3.4, 30.6), (5.0, 4.0, 3.6)),
                           (Sx(0.3, 3.4, 30.6), (5.0, 4.0, 3.6))], team, res=0.35 * k)
    C.displace(sk, 0.5 * k, 1.8)
    C.team(sk)
    rig.skin(sk, ["hips", "thigh_F", "thigh_B"], soft=2.4 * k, bias={"thigh_F": 1.0 * k, "thigh_B": 1.0 * k})
    # breast- and backplate with a fauld of lames
    cu = C.blobs("cuirass", [
        (Sx(0.9, 0, 47.2), (5.0, 6.9, 6.8)), (Sx(2.3, 0, 49.0), (3.4, 6.2, 4.0)),
        (Sx(-1.6, 0, 48.6), (3.8, 6.8, 6.0)), (Sx(0.4, 0, 42.0), (4.6, 6.3, 3.4))], st, res=0.3 * k)
    rig.skin(cu, ["spine", "chest"], soft=2.0 * k)
    for i, z in enumerate((39.2, 37.4)):
        f = C.blobs(f"lame{i}", [(Sx(0.4 - 0.2 * i, 0, z), (5.0 + 0.2 * i, 6.95 + 0.25 * i, 1.0))], st, res=0.3 * k)
        rig.skin(f, ["hips", "spine"], soft=2.0 * k)
    rig.rigid(C.box("gorget", 1.0 * k, 1.0 * k, 1.0 * k, dst, bevel=0.2 * k, loc=Sx(0.6, 0, 56.0)), "chest")
    g = C.blobs("gorget_ring", [(Sx(0.4, 0, 56.2), (3.2, 3.8, 1.3))], st, res=0.25 * k)
    rig.skin(g, ["chest", "neck"], soft=1.5 * k)
    MD.belt(rig, BODY, leather, z=36.8, bulk=1.12)
    MD.boots(rig, BODY, leather)
    MD.face(rig, BODY, hair, eye, beard=None, moustache=True, hair="short")
    MD.sallet(rig, BODY, st)

    # the pike, along +X from the near fist; a copy lies on the ground once he falls
    def pike(tag, pennon=True):
        fx, fy, fz = FIST
        head_x = fx + FRONT
        out = [C.tube(tag + "shaft", [(fx - BACK, fy, fz), (fx + FRONT * 0.5, fy, fz + 0.15 * k), (head_x + 1.0 * k, fy, fz)],
                      [0.85 * k, 0.9 * k, 0.75 * k], wood, seg=10)]
        bl = MD.blade(tag + "head", 9.0 * k, 1.25 * k, 1.0 * k, 0.45 * k, st, tip=4.0 * k, x0=head_x + 0.5 * k)
        C.xform(bl, loc=(0, fy, fz))
        out.append(bl)
        out.append(C.tube(tag + "socket", [(head_x - 3.2 * k, fy, fz), (head_x + 1.0 * k, fy, fz)], [0.95 * k, 0.8 * k], dst, seg=10))
        for dz in (-0.7, 0.7):
            out.append(C.tube(tag + "langet", [(head_x - 9.0 * k, fy, fz + dz * k), (head_x - 2.0 * k, fy, fz + dz * k)],
                              [0.3 * k] * 2, dst, seg=6, flat=0.6))
        out.append(C.tube(tag + "butt", [(fx - BACK - 1.2 * k, fy, fz), (fx - BACK + 1.6 * k, fy, fz)], [0.95 * k] * 2, dst, seg=8))
        return out

    held = pike("held_")
    for o in held:
        o["weapon"] = 1
        rig.rigid(o, "hand_F")
    # the team pennon: a swallow-tailed streamer on its own follow-through bone
    fx, fy, fz = FIST
    x0 = fx + FRONT - 1.5 * k
    pts = [(-15.0 * k * u, 0.4 * k * math.sin(5 * u), 0.0) for u in (0.0, 0.3, 0.6, 0.85, 1.0)]
    pen = C.tube("pennon", pts, [3.2 * k, 3.0 * k, 2.6 * k, 2.0 * k, 0.5 * k], team, seg=10, flat=0.12)
    C.xform(pen, rot=(math.pi / 2, 0, 0))
    C.xform(pen, loc=(x0, fy, fz - 2.4 * k))
    C.displace(pen, 0.25 * k, 1.0)
    C.team(pen)
    rig.skin(pen, ["hand_F", "pennon"], soft=2.0 * k, bias={"hand_F": 4.0 * k})
    dropped = pike("drop_")
    for o in dropped:
        C.xform(o, loc=(-FIST[0] - 8 * k, -FIST[1] - 9 * k, -FIST[2] + 1.0 * k), rot=(0, 0, math.radians(6)))
        o.parent = rig.obj
        o.hide_render = True
    return dict(rig=rig, held=held + [pen], dropped=dropped)


# ------------------------------------------------------------------------------------ poses
def grip(P, x, z, wa):
    """Both hands on the pike: near wrist at (x, z) with the shaft at angle wa (deg from +X)."""
    a = math.radians(wa)
    P["handF"] = ((x, z), wa)
    bx, bz = x - GRIP * math.cos(a), z - GRIP * math.sin(a)
    P["handB"] = (B.far_grip(bx, bz, 2 * BODY.sw, YAW), wa)
    return P


def stance(breath=0.0):
    P = dict(root=(0.0, -1.6), hips=1, spine=-1, chest=-2, neck=0, head=-6, footF=(11.0, G0, 0.0), footB=(-12.0, G0, 0.0),
             bones={"pennon": 0})
    return grip(P, 12.0, 35.0 + 0.4 * breath, 10 + breath)


def idle(t):
    a = 2 * math.pi * t / 920.0
    P = MO.breathe(stance(), t, amp=1.0, arms=False)
    P = grip(P, 12.0 + 0.6 * math.sin(a - 0.8), 35.0 - 0.5 * math.sin(a - 0.8), 10 + 2.0 * math.sin(a - 1.2))
    P["bones"] = {"pennon": (6 * math.sin(a - 1.8), 14 * math.sin(a - 1.4))}
    return P


def walk(t):
    P, ph, s1, c2 = MO.walk_legs(t, STRIDE, 4.2, STANCE, G0, lean=4.0)
    P["bones"] = {"pennon": (-4 - 5 * c2, 10 * s1)}
    return grip(P, 12.5 + 1.4 * s1, 35.5 - 1.2 * c2, 9 + 2 * c2)


def _atk_keys():
    ready = stance()
    draw = grip(dict(root=(-2.0, -2.0), hips=-2, spine=-4, chest=-4, neck=3, head=2, footF=(11.5, G0, 2.0),
                     footB=(-12.5, G0, 0.0), bones={"pennon": 6}), 2.0, 36.0, 7)
    coil = grip(dict(root=(-4.6, -3.2), hips=-6, spine=-8, chest=-6, neck=5, head=4, footF=(12.5, G0 + 0.8, 10.0),
                     footB=(-13.0, G0, 0.0), bones={"pennon": 12}), -6.0, 37.0, 5)
    coil2 = grip(dict(coil, root=(-5.0, -3.4)), -7.0, 37.2, 5)
    lunge = grip(dict(root=(6.0, -6.2), hips=16, spine=10, chest=4, neck=-5, head=-4, footF=(21.0, G0, 0.0),
                      footB=(-13.0, G0 + 1.0, -22.0), bones={"pennon": -14}), 24.0, 37.4, 4)
    hitp = grip(dict(root=(9.0, -8.0), hips=20, spine=12, chest=5, neck=-7, head=-6, footF=(24.0, G0, 0.0),
                     footB=(-12.5, G0 + 1.4, -28.0), bones={"pennon": -20}), 30.0, 38.0, 3)
    hold = grip(dict(hitp, root=(9.4, -8.3), bones={"pennon": -12}), 31.0, 37.8, 3)
    back = grip(dict(root=(5.0, -5.0), hips=12, spine=8, chest=3, neck=-4, head=-2, footF=(19.0, G0, 0.0),
                     footB=(-12.0, G0 + 0.6, -12.0), bones={"pennon": 4}), 20.0, 36.6, 7)
    rec = grip(dict(root=(1.5, -2.4), hips=7, spine=5, chest=2, neck=0, head=-2, footF=(12.0, G0, 0.0),
                    footB=(-11.5, G0, -2.0), bones={"pennon": 6}), 13.0, 35.4, 9)
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
    return MO.fall_back(base, t, H, G0, smooth=True)


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
        P = MO.knock_hit(stance(), t, {})
        a = [(0, (12.0, 35.0, 10)), (55, (5.0, 38.0, 26)), (140, (6.0, 37.0, 20)), (310, (12.0, 35.0, 10))]
        x, z, wa = B.keyed([(tk, {"v": v}) for tk, v in a], t)["v"]
        P = grip(P, x, z, wa)
        P["bones"] = {"pennon": B.keyed([(0, {"p": 0}), (55, {"p": 16}), (140, {"p": -8}), (310, {"p": 0})], t)["p"]}
    else:
        P = _die(t)
    BODY.apply(ctx["rig"], P)


def clips():
    return MO.biped_clips(attack_blur={3: 20},
                          die_fx=[{"id": "fx.dust_poof", "atMs": 595, "offsetLu": [-22, 8], "scale": 0.72}],
                          dust=dict(t0=236, origin=(-24, 0), spread=24, size=9.5))
