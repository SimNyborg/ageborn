"""Hide Shield: Stone Age common infantry guard (CONTENT_PLAN 5.1). Takes 25% less from range >= 100.
Stone axe, blunt, 66 lu.

Look (A11, PLAN.md): a broad, stocky cave guard with a heavy jaw, a shaggy dark mane held by a bone
band, a scar over one brow; a big round shield of stretched mammoth hide on a bent-wood hoop (team
dyed face, a pale bone tusk emblem, fur tufts round the rim, leather lacing) on his far arm, carried
forward so it covers his chest; a short stone axe (a knapped grey head lashed to a haft) in the near
hand. A team pelt tunic and skirt, team shin wraps, fur toe wraps.

"A viewer expects it to shove with the shield and chop over the rim with the axe, and to stomp along
behind the shield."

Animation (ANIM_SPEC G1, appendix B shield infantry: bash then chop, guard-and-cut, over-the-rim):
  idle      peers over the shield rim, taps the axe on it, blink
  walk      walk v3 bounce jog with a stomp (card 65 x 1.25 = 81.25 lu/s): the shield held forward
            on the far arm, the axe resting on his shoulder
  attack    SHOVE, THEN CHOP OVER THE RIM: the shield punches forward (body behind it), the axe
            rises high behind his head (held extreme), then chops down over the rim (arc smear,
            impact lines), bounces, settles
  attack_b  GUARD-AND-CUT: crouches low behind the shield and swings the axe flat out from under
            its edge at knee height
  attack_c  SHIELD SLAM: lifts the shield high overhead with both arms and slams its edge down
  hit       light, the shield dips;  die  D1 fling and spin, the shield rolls away, X eyes
"""
import math

from ageborn_art import face as F
from ageborn_art import kit_stone as K
from ageborn_art import moves as M
from ageborn_art.anim import merge
from ageborn_art.geometry import Geo

SLUG = "hide_shield"
GAIT_NAME = "biped"
NAME = "Hide Shield"
HEIGHT_LU = 66
CANVAS = (264, 228)
FEET = (112, 204)
ANCHORS = {"head": (2, 64), "hitCenter": (0, 30)}
NO_RETIME = True

SKIN = "#D9B496"
HAIR = "#3B2F28"
FUR = "#76695C"
HIDE = "#C9B79A"
HOOP = "#8A7058"
LACE = "#6A5242"
BONE = "#EDE3C8"
STONE = "#7F838A"
STONE_DK = "#62666C"
WOOD = "#9C7E62"
SCAR = "#C39478"

HIP_Y, SH_Y = 6.0, 12.0
AXE_LEN = 20.0
SH_N = (0.62, -0.78, 0.0)     # shield face normal: forward and toward the camera (reads as an oval)
SH_R = 12.5


def _shield(rig, joint, c):
    """Round hide shield centred at c (rest), its face toward SH_N."""
    n = SH_N
    back = (c[0] - n[0] * 1.6, c[1] - n[1] * 1.6, c[2])
    front = (c[0] + n[0] * 2.6, c[1] + n[1] * 2.6, c[2])
    g = Geo().lathe([(0, 0), (SH_R - 0.6, 0.0), (SH_R, 1.6), (SH_R - 1.2, 3.6), (0, 4.4)], back, front, segs=24)
    rig.part(joint, g, team=True)
    g = Geo().lathe([(SH_R - 1.6, 0), (SH_R + 0.8, 0.4), (SH_R + 0.8, 2.6), (SH_R - 1.6, 3.0)], back,
                    (back[0] + n[0] * 3.4, back[1] + n[1] * 3.4, c[2]), segs=24)
    rig.part(joint, g, HOOP, outline=0.8)
    # fur tufts round the rim
    g = Geo()
    ux, uy = -n[1], n[0]   # in-plane horizontal axis
    for k in range(7):
        a = math.radians(200 + k * 25)
        px = c[0] + ux * math.cos(a) * (SH_R + 0.5) + n[0] * 1.5
        py = c[1] + uy * math.cos(a) * (SH_R + 0.5) + n[1] * 1.5
        pz = c[2] + math.sin(a) * (SH_R + 0.5)
        tip = (px + ux * math.cos(a) * 3.2, py + uy * math.cos(a) * 3.2, pz + math.sin(a) * 3.2)
        g.lathe([(1.8, 0), (0, 3.4)], (px, py, pz), tip, segs=8)
    rig.part(joint, g, FUR, finish="hair")
    # a pale bone tusk emblem and a boss on the face
    g = Geo()
    f = (c[0] + n[0] * 4.4, c[1] + n[1] * 4.4, c[2])
    g.lathe([(2.6, 0), (2.0, 1.4), (0, 2.0)], f, (f[0] + n[0] * 1.8, f[1] + n[1] * 1.8, f[2]), segs=14)
    for s in (-1, 1):
        g.capsule((f[0] + ux * s * 3.0, f[1] + uy * s * 3.0, f[2] - 4.0),
                  (f[0] + ux * s * 5.6, f[1] + uy * s * 5.6, f[2] + 5.5), 1.5, 0.6)
    rig.part(joint, g, BONE, outline=0.6)


def _axe(rig, joint, fist):
    fx, fy, fz = fist
    g = Geo().capsule((fx, fy, fz - 4.0), (fx, fy, fz + AXE_LEN), 1.7, 1.5)
    rig.part(joint, g, WOOD)
    g = Geo()
    for z in (-1.5, 2.0):
        g.lathe([(2.0, 0), (2.2, 0.6), (2.2, 2.0), (1.9, 2.4)], (fx, fy, fz + z), segs=12)
    rig.part(joint, g, team=True, outline=0.6)
    # knapped stone head lashed to the haft top, the blade forward
    hz = fz + AXE_LEN - 4.0
    g = Geo().slab([(fx - 2.0, hz - 3.6), (fx + 6.5, hz - 5.8), (fx + 9.2, hz - 1.0), (fx + 9.0, hz + 4.8),
                    (fx + 6.0, hz + 5.2), (fx - 2.0, hz + 3.2)], fy - 1.6, 3.4)
    rig.part(joint, g, STONE, finish="gloss")
    g = Geo().slab([(fx + 7.0, hz - 4.6), (fx + 9.2, hz - 1.0), (fx + 9.0, hz + 4.8), (fx + 7.6, hz + 4.2)],
                   fy - 1.8, 3.6)
    rig.part(joint, g, STONE_DK, outline=0.4)
    g = Geo()
    for dz in (-2.0, 0.6, 3.2):
        g.capsule((fx - 1.8, fy - 2.1, hz + dz), (fx + 1.8, fy - 2.1, hz + dz - 0.8), 1.1)
    rig.part(joint, g, LACE, outline=0.5)


def build(rig):
    global RIG, ARM_R, ARM_L, AXE_TIP
    RIG = rig
    body = K.body(rig, SKIN, FUR, stocky=1.12, hip_y=HIP_Y, shoulder_y=SH_Y, torso_r=(11.0, 9.6, 10.6), foot_len=4.6)
    fr, fl = body.fist["r"], body.fist["l"]
    K.pelt(rig, FUR, r=(11.6, 10.4, 7.6), skirt_r=(11.8, 10.6, 4.4))
    K.wraps(rig, HIP_Y, SH_Y, wrists=("r",))
    # hair cap, back hair and a bone band, then the head with the face kit
    hair = Geo().blob((-2.4, 0, 54.8), (10.4, 11.2, 6.0), p=2.2)
    hair.blob((-8.4, 0, 48.0), (5.0, 10.0, 8.4), p=2.2)
    band = Geo().lathe([(10.2, 0), (11.0, 0.4), (11.0, 2.6), (9.8, 3.0)], (1.6, 0, 52.6), (0.4, 0, 55.4), segs=22)
    face = K.head(rig, SKIN, z=47.5, r=(10.8, 10.4, 10.6), jaw=(8.0, 8.8, 5.6), extra_geos=(hair, band), brow_col=HAIR)
    rig.part("head", hair, HAIR, finish="hair")
    rig.part("head", band, BONE, outline=0.7)
    g = Geo()
    for (x0, z0), (x1, z1), r in (((-4, 58), (-8, 64.5), 3.2), ((2, 59), (2.5, 64.0), 2.8), ((-10, 54), (-15, 57.5), 3.0)):
        g.capsule((x0, 0, z0), (x1, -1, z1), r, 1.0)
    rig.secondary("mane", "head", (-2.0, 0, 58.0), (-8.0, 0, 64.0), max_deg=12, gain=1.1)
    rig.part("mane", g, HAIR, finish="hair")
    g = Geo()   # a pale scar across the near brow
    c = face.hit(10.0, 51.5)
    face.stroke(g, c, [(-1.6, 2.0), (1.4, -1.8)], 1.0, 0.4)
    rig.part("head", g, SCAR, highlight=False, outline=0)
    # bone-tooth necklace
    g = Geo()
    for x, y, z in ((9.2, -5.0, 36.6), (10.4, -0.8, 36.0), (9.4, 3.6, 36.4)):
        g.lathe([(1.6, 0), (1.2, 1.9), (0, 4.0)], (x, y - 1.2, z + 0.8), (x + 0.8, y - 1.6, z - 3.4), segs=8)
    rig.part("torso", g, BONE, outline=0.6)
    # shield on the far fist (held item: its rest "up" is +Z, so c = 90 keeps it upright)
    rig.joint("shield", "fore_l", fl)
    sc = (fl[0] + 3.0, fl[1] - 5.0, fl[2] + 2.0)
    _shield(rig, "shield", sc)
    rig.joint("shield_loose", "root", (0, 0, 0), hidden=True)
    _shield(rig, "shield_loose", (0.0, -4.0, 0.0))
    # axe in the near fist
    rig.joint("axe", "fore_r", fr)
    _axe(rig, "axe", fr)
    AXE_TIP = (fr[0] + 8.0, fr[1], fr[2] + AXE_LEN - 2.0)
    rig.track("axeHead", "axe", AXE_TIP)
    ARM_R = body.arm("r", "axe", (fr[0], fr[1], fr[2] + AXE_LEN))
    ARM_L = body.arm("l", "shield", (fl[0], fl[1], fl[2] + 10.0))


RIG = ARM_R = ARM_L = AXE_TIP = None
SPEED = 81.25
LEGS = K.legs(HIP_Y)
GAIT = K.jog(LEGS, SPEED, cycle=616)


def axe(a, b, c, rz=0.0):
    p = ARM_R.pose(a, b, c)
    if rz:
        p["arm_r"]["rz"] = rz
    return p


def shield(a, b, c=90.0):
    return ARM_L.pose(a, b, c)


def stance():
    # shield forward at the chest, the axe raised behind the rim
    return merge(axe(-62, -12, 48), shield(-10, 30, 90), {"torso": {"r": -3}})


def _idle(f):
    peek = [0.0, 0.3, 0.8, 1.0, 0.6, 0.2, 0.0, 0.0][f]
    tap = [0.0, 0.0, 0.0, 0.0, 0.0, 1.0, -0.4, 0.0][f]

    def extra(ctx):
        return merge(axe(-62 + 10 * tap, -12 + 30 * tap, 48 + 30 * tap),
                     {"head": {"r": -4 * peek, "z": 0.8 * peek}, "pupils": {"x": 0.6 * peek},
                      "shield": {"r": 2 * ctx["lag"]}})
    return M.idle_v2(f, K.strip(stance(), "arm_r", "fore_r", "axe"), extra=extra, face_blink=F.expr("blink"), blink=7)


def _walk(f, report=None):
    def extra(ctx):
        lag = ctx["bob_lag"] / max(ctx["amp"], 1e-3)
        return {"axe": {"r": -5 * lag}, "shield": {"r": 3 * lag}, "mane": {"r": 6 * lag}}
    carry = merge({"torso": {"r": -3}}, axe(-62, 74, 160), shield(-25, 25, 90))
    return K.walk(RIG, f, carry, GAIT, LEGS, lean=-9.0, extra=extra, report=report)


# attack A: 11 unique frames, moves.SMALL_MELEE_MS
#         read  shove1 shove2 HOLD  smear  smear  IMP   bounce recoil settle settle
A_AA = [-62, 30, 60, 100, 70, 20, -10, 0, -10, -40, -60]   # axe arm (upper)
A_AB = [-12, 80, 120, 150, 80, 0, -25, -5, -15, -10, -12]       # axe arm (lower)
A_AC = [48, 110, 150, 165, 100, 20, -5, 25, 0, 30, 46]        # axe
A_SA = [-10, 15, 10, -5, -15, -25, -30, -25, -20, -14, -10]   # shield arm
A_SB = [30, 10, 5, 25, 25, 20, 15, 18, 22, 26, 30]
A_X = [-0.5, 4.0, 6.0, 1.0, 3.0, 6.0, 8.0, 7.5, 7.0, 3.0, 0.5]
A_Z = [0.0, -1.5, -0.6, 2.2, 3.5, 1.5, -2.6, -0.8, -1.6, -0.4, 0.0]
A_Q = [-0.03, -0.10, 0.04, 0.10, 0.08, 0.02, -0.16, 0.04, -0.06, 0.02, 0.0]
A_T = [-3, -12, -6, 18, 4, -14, -26, -18, -20, -8, -3]
A_H = [0, 6, 2, -10, -2, 8, 12, 6, 8, 2, 0]
A_THR = [0, 14, 18, 4, 16, 24, 26, 20, 20, 8, 2]
A_SHR = [0, -12, -10, 0, -24, -18, -16, -10, -12, -4, 0]
A_THL = [0, -14, -18, 8, -6, -16, -22, -18, -18, -6, -1]
A_SHL = [0, -6, -8, -6, -10, -6, -6, -4, -4, -2, 0]


def _attack_pose(f):
    pose = merge(axe(A_AA[f], A_AB[f], A_AC[f]), shield(A_SA[f], A_SB[f]), {
        "torso": {"r": A_T[f]}, "head": {"r": A_H[f]},
        "thigh_r": {"r": A_THR[f]}, "shin_r": {"r": A_SHR[f]},
        "thigh_l": {"r": A_THL[f]}, "shin_l": {"r": A_SHL[f]},
    }, M.body_about((0, 0, 20), x=A_X[f], z=A_Z[f], q=A_Q[f]))
    if f in (4, 5):
        pose["axe"]["sx"] = 1.2
    if f in (1, 2, 3):
        pose = merge(pose, F.expr("grit"), {"brow": {"z": -0.8}})
    elif f in (4, 5, 6, 7):
        pose = merge(pose, F.expr("yell"), {"brow": {"z": -1.2}})
    return pose


def _smear(**kw):
    s = {"kind": "arc", "joint": "axe", "inner": (AXE_TIP[0] - 6, AXE_TIP[1], AXE_TIP[2] - 6), "outer": AXE_TIP,
         "color": STONE, "taper": 0.1, "t0": 0.0, "t1": 0.88, "lines": 3, "white": 0.35}
    s.update(kw)
    return s


def _attack_clip():
    ov = {
        1: [{"kind": "burst", "joint": "shield", "point": (8.0, 6.0, 22.0), "r0_lu": 13.0, "r1_lu": 18.0, "n": 4,
             "a0": -40.0, "arc": 80.0}],
        4: [_smear()],
        5: [_smear(t1=0.8)],
        6: [{"kind": "burst", "joint": "axe", "point": AXE_TIP, "r0_lu": 8.0, "r1_lu": 14.0, "n": 5,
             "a0": -20.0, "arc": 140.0},
            {"kind": "dust", "ground": (16.0, 0.0), "size_lu": 6.0, "puffs": 3, "seed": 51, "spread": 0.8}],
    }
    return M.clip("attack", [_attack_pose(f) for f in range(11)], M.SMALL_MELEE_MS,
                  impact=M.SMALL_MELEE_IMPACT, smear=4, overlays=ov)


# attack B: guard-and-cut from a low crouch. unique 0 = A read, 1 crouch, 2 HOLD (deep crouch behind
# the shield, the axe cocked back low behind the hip), 3 smear (flat swing out under the rim),
# 4 IMPACT (axe level forward at knee height, squash), 5 follow, 6-7 = A settle
B_SEQ = [0, 1, 1, 2, 3, 3, 4, 5, 5, 6, 7]


def _b_pose(i):
    if i == 0:
        return _attack_pose(0)
    if i >= 6:
        return _attack_pose(i + 3)
    tab = [  # aa, ab, ac, rz, sa, sb, x, z, q, t, h, thr, shr, thl, shl
        (-60, -40, -20, 120, -15, 25, -1.0, -3.0, -0.08, -6, 2, 26, -40, -14, -16),
        (-80, -70, -60, 165, -20, 25, -2.0, -6.0, -0.12, -10, 4, 40, -70, -24, -26),
        (-70, -50, -30, 70, -25, 20, 2.0, -6.0, -0.06, -14, 6, 40, -64, -28, -20),
        (-60, -30, -5, 0, -30, 15, 5.0, -6.5, -0.14, -16, 8, 40, -60, -30, -18),
        (-55, -20, 5, -30, -25, 18, 4.0, -5.0, -0.04, -12, 6, 32, -50, -24, -14),
    ][i - 1]
    aa, ab, ac, rz, sa, sb, x, z, q, t, h, thr, shr, thl, shl = tab
    pose = merge(axe(aa, ab, ac, rz), shield(sa, sb), {
        "torso": {"r": t, "rz": -rz * 0.15}, "head": {"r": h},
        "thigh_r": {"r": thr}, "shin_r": {"r": shr}, "thigh_l": {"r": thl}, "shin_l": {"r": shl},
    }, M.body_about((0, 0, 20), x=x, z=z, q=q))
    return merge(pose, F.expr("grit" if i < 3 else "yell"), {"brow": {"z": -1.0}})


def _attack_b():
    ov = {3: [_smear(t0=0.0, t1=0.9, samples=16, **{"from": 2})],
          4: [{"kind": "burst", "joint": "axe", "point": AXE_TIP, "r0_lu": 7.0, "r1_lu": 12.0, "n": 5,
               "a0": -60.0, "arc": 120.0},
              {"kind": "dust", "ground": (10.0, 0.0), "size_lu": 5.0, "puffs": 3, "seed": 52, "spread": 0.8}]}
    reuse = {0: ("attack", 0), 6: ("attack", 9), 7: ("attack", 10)}
    return M.clip("attack_b", [_b_pose(i) for i in range(8)], M.SMALL_MELEE_MS, impact=4,
                  sequence=B_SEQ, overlays=ov, reuse=reuse)


# attack C: shield slam. unique 0 = A read, 1 lift, 2 HOLD (both arms up, the shield high over his
# head, up on his toes), 3 smear (shield coming down), 4 IMPACT (shield edge slammed into the ground
# in front, squash), 5 rebound, 6-7 = A settle
C_SEQ = [0, 1, 1, 2, 3, 3, 4, 5, 5, 6, 7]


def _c_pose(i):
    if i == 0:
        return _attack_pose(0)
    if i >= 6:
        return _attack_pose(i + 3)
    tab = [  # sa, sb, sc, aa, ab, ac, x, z, q, t, h, thr, shr, thl, shl
        (40, 70, 100, 30, 70, 120, -1.0, 1.0, 0.04, 6, -4, 4, -4, 2, -4),
        (95, 110, 120, 70, 110, 150, -2.0, 2.4, 0.10, 12, -8, 2, -10, 2, -10),
        (40, 20, 60, 20, 40, 90, 3.0, 1.0, 0.04, -10, 6, 18, -16, -10, -6),
        (-30, -50, 10, -20, -10, 40, 6.0, -2.6, -0.16, -24, 12, 24, -16, -20, -6),
        (-20, -35, 30, -15, 0, 50, 5.0, -1.4, -0.04, -18, 8, 18, -12, -16, -4),
    ][i - 1]
    sa, sb, scc, aa, ab, ac, x, z, q, t, h, thr, shr, thl, shl = tab
    pose = merge(axe(aa, ab, ac), shield(sa, sb, scc), {
        "torso": {"r": t}, "head": {"r": h},
        "thigh_r": {"r": thr}, "shin_r": {"r": shr}, "thigh_l": {"r": thl}, "shin_l": {"r": shl},
    }, M.body_about((0, 0, 20), x=x, z=z, q=q))
    return merge(pose, F.expr("grit" if i < 3 else "yell"), {"brow": {"z": -1.0}})


def _attack_c():
    ov = {3: [{"kind": "arc", "joint": "shield", "inner": (8.0, 6.0, 20.0), "outer": (10.0, 3.0, 34.0),
               "color": HIDE, "taper": 0.15, "t0": 0.0, "t1": 0.9, "lines": 3, "white": 0.35, "from": 2}],
          4: [{"kind": "dust", "ground": (18.0, 0.0), "size_lu": 9.0, "puffs": 5, "seed": 53, "spread": 1.2},
              {"kind": "burst", "joint": "shield", "point": (10.0, 3.0, 10.0), "r0_lu": 10.0, "r1_lu": 16.0,
               "n": 5, "a0": 10.0, "arc": 160.0}]}
    reuse = {0: ("attack", 0), 6: ("attack", 9), 7: ("attack", 10)}
    return M.clip("attack_c", [_c_pose(i) for i in range(8)], M.SMALL_MELEE_MS, impact=4,
                  sequence=C_SEQ, overlays=ov, reuse=reuse)


def _hit(k):
    return K.hit(k, stance(), extra=lambda a: {"shield": {"r": -10 * a}, "axe": {"r": 14 * a}, "mane": {"r": 10 * a}})


def _die(k):
    loose = [None, None, (14, -4, 30, 40), (22, -4, 44, 120), (30, -4, 40, 210), (36, -4, 24, 300),
             (40, -4, 12, 360), (42, -4, 12, 360), (42, -4, 12, 360), (42, -4, 12, 360)][k]

    def extra(kk, flail):
        out = {"axe": {"r": 40 * flail}}
        if loose:
            x, y, z, r = loose
            out["shield"] = {"hide": True}
            out["shield_loose"] = {"show": True, "x": x, "z": z, "r": r}
        return out
    return K.die_d1(k, stance(), HEIGHT_LU, extra=extra)


def clips():
    cl = [
        M.clip("idle", [_idle(f) for f in range(M.IDLE_FRAMES)], [M.IDLE_MS] * M.IDLE_FRAMES, loop=True),
        M.walk_clip("walk", RIG, _walk, GAIT, "biped"),
        _attack_clip(),
        _attack_b(),
        _attack_c(),
        M.clip("hit", [_hit(k) for k in range(5)], M.HIT_MS),
        M.clip("die", [_die(k) for k in range(10)], M.DIE_MS, extra=M.die_meta(HEIGHT_LU)),
    ]
    return M.check_variants(M.check_contract(cl))
