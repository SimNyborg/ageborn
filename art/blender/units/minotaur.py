"""Minotaur: Bronze Age Epic Brawler, armored (CONTENT_PLAN 5.2 #12). First hit x2 and 40 lu knockback;
frenzy below 50% HP. ~94 lu.

A viewer expects a bull-man to lower his horns and charge, then bring a huge double axe down
overhead, and to stomp forward on hooves with his head low, snorting.

Look: a hulking bull-headed giant (the medieval biped at 1.38x): a brown-furred bull head with a
pale muzzle, a polished bronze nose ring, big ivory horns, small angry eyes; a bare furry chest
crossed by a team strap, a team Minoan kilt with a sandstone hem and a bronze belt, bronze
bracers, furry legs ending in dark cloven hooves, a tufted tail. He swings a labrys: a long haft
with two crescent bronze blades.

Animation (cartoon kit v2, heavy timing):
  idle    snorts (steam puffs from the nostrils), shifts his weight, the axe on his shoulder
  walk    a heavy stomp with the head low and the horns forward, the tail flicking
  attack  HORNS DOWN, LABRYS OVERHEAD: he drops his head and lunges a half step (horns
          forward), then rears up with the labrys raised high behind his head in both hands
          (held extreme, snorting), and chops it down overhead into the target (a wide arc
          smear, impact lines, a crack of dust), the head still low behind the blow
  hit     armoured: a grunt and a shake of the horns
  die     D2 heavy topple backwards, the labrys spins away, X eyes and tongue
"""
import math

from ageborn_art import face as F
from ageborn_art import kit_bronze as K
from ageborn_art import moves as M
from ageborn_art import rigs_bronze as B
from ageborn_art.anim import merge
from ageborn_art.geometry import Geo

SLUG = "minotaur"
NAME = "Minotaur"
HEIGHT_LU = 94
CANVAS = (380, 330)
FEET = (170, 290)
ANCHORS = {"head": (6, 92), "hitCenter": (0, 44)}
NO_RETIME = True
SCALE = 1.38

FUR = "#7A6656"
FUR_DK = "#5E4E42"
MUZZLE = "#B59E8A"
HORN = "#EFE7D0"
HOOF = "#3A3330"
HR = (0.0, B.ARM_Y["r"], B.HAND_Z)


def _labrys(rig, joint, grip, haft=34.0, back=8.0):
    gx, gy, gz = grip
    y = gy - 1.2
    g = Geo().capsule((gx, y, gz - back), (gx, y, gz + haft), 1.25, 1.15)
    rig.part(joint, g, B.WOOD_DK, outline=0.6)
    g = Geo()
    for z in (gz - 3.0, gz + 2.0, gz + 7.0):
        g.blob((gx, y, z), (1.7, 1.7, 0.6), p=3.0)
    rig.part(joint, g, B.LEATHER, outline=0.3)
    hz = gz + haft - 4.0
    for sgn in (1, -1):                                    # the two crescent blades
        pts = []
        for i in range(9):
            a = math.radians(-70 + 140 * i / 8)
            pts.append((gx + sgn * (3.0 + 10.0 * math.cos(a) * 0.95), hz + 11.0 * math.sin(a)))
        inner = []
        for i in range(8, -1, -1):
            a = math.radians(-50 + 100 * i / 8)
            inner.append((gx + sgn * (2.0 + 4.0 * math.cos(a)), hz + 5.2 * math.sin(a)))
        g = Geo().slab(pts + inner, y - 0.4, 1.4)
        rig.part(joint, g, B.BRONZE, finish=B.POLISH, outline=0.7)
        edge = Geo()
        for p0, p1 in zip(pts, pts[1:]):
            edge.capsule((p0[0] - sgn * 0.6, y - 1.3, p0[1]), (p1[0] - sgn * 0.6, y - 1.3, p1[1]), 0.5)
        rig.part(joint, edge, "#F4ECD6", outline=0)
    g = Geo().blob((gx, y - 0.6, hz), (2.6, 2.4, 3.6), p=2.6)
    rig.part(joint, g, B.BRONZE_HI, finish=B.POLISH, outline=0.5)
    return (gx + 12.5, y, hz)


def build(rig):
    B.skeleton(rig)
    rig.rest_scale["body"] = SCALE
    # furry legs with cloven hooves
    for s in ("r", "l"):
        y = B.LEG_Y * B.SIDE_Y[s]
        col = FUR if s == "r" else FUR_DK
        g = Geo().capsule((0, y, B.HIP_Z), (0.5, y, B.KNEE_Z), 5.4, 4.6)
        rig.part(f"thigh_{s}", g, col, finish="hair")
        g = Geo().capsule((0.5, y, B.KNEE_Z), (1.6, y, 3.4), 4.6, 3.2)
        rig.part(f"shin_{s}", g, col, finish="hair")
        g = Geo().blob((3.2, y, 1.7), (4.6, 3.8, 2.0), p=2.8, taper=(1.05, 0.8))
        rig.part(f"shin_{s}", g, HOOF, finish="gloss")
        g = Geo().capsule((7.4, y - 3.9 * B.SIDE_Y[s] * -1, 2.6), (7.6, y - 3.9 * B.SIDE_Y[s] * -1, 0.4), 0.5)
        rig.part(f"shin_{s}", g, "#1E1A18", outline=0, highlight=False)
        g = Geo()
        for a in (0, 70, 140, 210, 280):                   # fur fetlock tufts
            r = math.radians(a)
            g.lathe([(1.6, 0), (0, -3.2)], (1.4 + 3.4 * math.cos(r), y + 3.4 * math.sin(r), 5.6), segs=6)
        rig.part(f"shin_{s}", g, FUR_DK, finish="hair", outline=0.5)
    # torso: furry chest and belly, a team strap, a team kilt with a sandstone hem, bronze belt
    g = Geo().blob((0.6, 0, 28.0), (11.6, 10.6, 12.6), p=2.3, taper=(0.92, 1.16))
    rig.part("torso", g, FUR, finish="hair")
    g = Geo().blob((6.4, -1.0, 29.0), (6.6, 8.6, 8.0), p=2.4)
    rig.part("torso", g, MUZZLE, finish="hair", outline=0.6)
    g = Geo().capsule((9.5, -9.5, 37.0), (-9.0, 9.5, 20.0), 3.8)
    rig.part("torso", g, team=True, outline=0.7)
    # a big team cape over the shoulders (follow-through) and a team pauldron on the near arm
    rig.secondary("cape", "torso", (-6.0, 0.0, 40.0), (-20.0, 0.0, 10.0), max_deg=16, gain=1.2)
    g = Geo().blob((-9.0, 0, 26.0), (5.0, 13.4, 16.0), p=2.6, taper=(1.25, 0.85))
    g.clip((-6.0, 0, 0), (1, 0, 0))
    rig.part("cape", g, team=True)
    g = Geo().blob((-1.0, 0, 40.0), (11.0, 12.6, 3.6), p=2.6)
    rig.part("torso", g, team=True, outline=0.7)
    g = Geo().sphere((9.0, -10.4, 35.4), 2.4, cuts=3)
    rig.part("torso", g, B.BRONZE, finish=B.POLISH, outline=0.5)
    rig.secondary("hem", "hips", (0.5, 0, 17.0), (0.5, 0, 8.0), max_deg=12, gain=1.0)
    g = Geo().blob((0.8, 0, 12.0), (12.8, 11.6, 7.8), p=2.4, taper=(1.2, 0.94))
    rig.part("hem", g, team=True)
    g = Geo().blob((0.8, 0, 4.6), (13.2, 12.0, 1.4), p=3.0)
    rig.part("hem", g, B.SAND_LT, outline=0.5)
    g = Geo().blob((0.6, 0, 18.6), (12.4, 11.2, 2.2), p=3.2)
    rig.part("torso", g, B.BRONZE, finish=B.POLISH, outline=0.6)
    K.lambda_mark(rig, "hem", (8.0, -11.6, 13.0), size=1.2)
    rig.secondary("tail", "hips", (-11.0, 0, 16.0), (-17.0, 0, 4.0), max_deg=18, gain=1.3)
    g = Geo().capsule((-11.0, 0, 16.0), (-16.0, 0, 6.0), 1.4, 1.0)
    g.blob((-16.8, 0, 4.4), (2.6, 2.4, 3.4), p=2.2)
    rig.part("tail", g, FUR_DK, finish="hair")

    # bull head: face kit on a furry head with a long muzzle, horns, ears, nose ring
    B.face_kit(rig, cx=12.4, cz=52.0, skin=FUR, brow=FUR_DK, eye_r=(3.2, 3.0, 3.6), eye_dy=(-5.6, 5.4),
               center=(2, 0, 50.0), r=(11.6, 11.0, 11.2), nose=(14.6, -0.4, 44.6), nose_r=(6.6, 7.4, 5.8),
               mouth_z=40.2, mouth_w=6.0, brow_tilt=3.4)
    g = Geo().blob((16.6, -0.4, 43.6), (5.6, 7.2, 5.0), p=2.3)
    rig.part("head", g, MUZZLE)
    g = Geo()
    for y in (-2.8, 2.6):
        g.blob((21.4, y - 0.4, 44.6), (0.9, 1.3, 1.4), p=2.0)
    rig.part("head", g, "#2E2420", outline=0)
    g = Geo().lathe([(0, 0), (2.6, 0.2), (2.6, 0.9), (0, 1.1)], (21.6, -0.4, 40.4), (21.6, -0.4, 41.5), segs=18)
    g.clip((21.6, -0.4, 43.0), (0, 0, 1))
    rig.part("head", g, B.BRONZE_HI, finish=B.POLISH, outline=0.4)
    g = Geo()
    for y in (-1, 1):                                     # horns sweep out, forward and up
        a, b, c = (2.0, 9.0 * y, 59.0), (6.0, 15.0 * y, 63.0), (12.0, 15.6 * y, 70.0)
        g.capsule(a, b, 3.4, 2.8).capsule(b, c, 2.8, 0.9)
    rig.part("head", g, HORN, finish="gloss")
    g = Geo()
    for y in (-1, 1):
        g.blob((-3.0, 11.6 * y, 53.0), (4.4, 2.4, 2.4), p=2.2, rot=(0, -20, 0))
    rig.part("head", g, FUR_DK, finish="hair", outline=0.6)
    rig.joint("steam", "head", (22.0, 0, 44.0), hidden=True)
    g = Geo()
    for dx, dz, r in ((3.0, 0.0, 2.6), (6.4, 1.4, 2.0), (8.8, 3.0, 1.6)):
        g.sphere((22.0 + dx, -2.0, 44.0 + dz), r, cuts=3)
    rig.part("steam", g, "#F2EEE6", finish="dust", outline=0.5)

    for s in ("r", "l"):
        B.arm_parts(rig, s, FUR, hand=FUR_DK, r0=5.0, r1=4.4)
        g = Geo().blob((0.2, B.ARM_Y[s] * 1.05, 37.0), (6.6, 5.8, 5.2), p=2.5)
        rig.part(f"arm_{s}", g, team=True, outline=0.7)
        g = Geo().blob((0, B.ARM_Y[s], B.HAND_Z + 3.4), (5.0, 5.0, 2.4), p=2.6)
        rig.part(f"fore_{s}", g, B.BRONZE, finish=B.POLISH, outline=0.6)
    rig.joint("axe", "hand_r", HR)
    tip = _labrys(rig, "axe", HR)
    rig.track("axeTip", "axe", tip)
    rig.joint("axe_loose", "root", (0, 0, 0), hidden=True)
    _labrys(rig, "axe_loose", (0.0, -18.0, -14.0))
    rig.track("_foot", "shin_r", (3.6, -6.0, 0.4))


# -- poses ---------------------------------------------------------------------------------
def wield(a, f, w, lean=0.0, d=9.0):
    return K.two_hand(a, f, w, d, lean=lean)


STANCE = merge(wield(-40, 40, 120, lean=6), {"torso": {"r": -6}, "head": {"r": -10}})


def _idle(f):
    n = M.IDLE_FRAMES_HEAVY
    snort = [0.0, 0.0, 1.0, 0.6, 0.0, 0.0][f]

    def extra(ctx):
        return {"head": {"r": 4 * snort}, "steam": {"show": snort > 0.5, "s": 0.8 + 0.4 * snort}}
    return M.idle_v2(f, STANCE, frames=n, extra=extra, face_blink=F.expr("blink"), blink=4, bob=1.6)


def _walk(f):
    def extra(ctx):
        lag = ctx["bob_lag"] / max(ctx["amp"], 1e-3)
        return merge(wield(-40 + 3 * lag, 40 + 3 * lag, 120 + 4 * lag, lean=10), {"head": {"r": -4 + 3 * lag}})
    return M.walk_v2(f, STANCE, HEIGHT_LU / SCALE, thigh=30.0, knee=42.0, lift_lu=6.0, bob_pct=0.06,
                     lean=-10.0, arm=0.0, fore=0.0, arms=(), heavy_down=1.5, sway=4.0, extra=extra)


ATTACK_SEQ = [0, 1, 2, 3, 4, 5, 6, 7, 8, 8, 9, 9]
#        shift horns rear HOLD  chop1 chop2 IMPACT shock follow settle
W_A = [-40, -50, 70, 110, 80, 30, -10, -20, -30, -38]
W_F = [40, 20, 120, 150, 90, 20, -20, -30, 0, 36]
W_W = [120, 70, 160, 175, 110, 30, -20, -34, 30, 110]
A_T = [-6, -20, 8, 14, 2, -14, -24, -24, -12, -6]
A_H = [-10, -26, 0, 6, -6, -18, -24, -22, -14, -10]
A_Q = [-0.02, -0.08, 0.06, 0.08, 0.02, -0.04, -0.12, -0.06, -0.02, 0.0]
A_X = [0.0, 4.0, 0.0, -2.0, 0.0, 3.0, 6.0, 6.0, 3.0, 0.5]
A_Z = [0.0, -2.0, 1.4, 2.0, 0.8, -0.6, -2.4, -2.0, -0.8, 0.0]
A_THR = [0, 24, 4, -4, 8, 20, 28, 28, 14, 2]
A_SHR = [0, -26, -6, 0, -10, -18, -28, -26, -14, 0]
A_THL = [0, -18, -8, 2, -6, -16, -24, -24, -12, 0]
A_SHL = [0, -20, -10, -6, -6, -12, -20, -20, -10, 0]


def _attack_pose(f):
    t = A_T[f]
    pose = merge(wield(W_A[f], W_F[f], W_W[f], lean=t), {
        "torso": {"r": t}, "head": {"r": A_H[f]},
        "thigh_r": {"r": A_THR[f]}, "shin_r": {"r": A_SHR[f]},
        "thigh_l": {"r": A_THL[f]}, "shin_l": {"r": A_SHL[f]},
        "steam": {"show": f in (1, 3, 6), "s": 1.2},
    }, M.body_about((0, 0, 22), x=A_X[f], z=A_Z[f], q=A_Q[f]))
    if f in (4, 5):
        pose.setdefault("axe", {})["sz"] = 1.1
    if f in (1, 2, 3):
        pose = merge(pose, F.expr("grit"), {"brow": {"z": -1.0}})
    elif f in (4, 5, 6, 7):
        pose = merge(pose, F.expr("yell"), {"brow": {"z": -1.2}})
    return pose


AXE_TIP = (HR[0] + 12.5, HR[1] - 1.2, HR[2] + 30.0)
AXE_IN = (HR[0] + 3.0, HR[1] - 1.2, HR[2] + 26.0)


def _attack_clip():
    arc = {"kind": "arc", "joint": "axe", "inner": AXE_IN, "outer": AXE_TIP, "color": B.BRONZE_HI,
           "white": 0.3, "taper": 0.2, "lines": 3, "outline_lu": 1.4}
    ov = {
        1: [{"kind": "dust", "ground": (6.0, 0.0), "size_lu": 6.0, "puffs": 3, "seed": 4, "spread": 0.9}],
        4: [dict(arc, **{"from": 3, "t1": 0.95})],
        5: [dict(arc, **{"from": 4, "t0": 0.1, "t1": 0.95})],
        6: [{"kind": "burst", "joint": "axe", "point": AXE_TIP, "r0_lu": 8.0, "r1_lu": 16.0, "n": 6,
             "a0": -70.0, "arc": 160.0},
            {"kind": "dust", "ground": (22.0, 0.0), "size_lu": 9.0, "puffs": 4, "seed": 7, "spread": 1.2},
            {"kind": "dust", "ground": (-6.0, 0.0), "size_lu": 6.0, "puffs": 3, "seed": 8, "spread": 1.0,
             "dir": -1.0}],
    }
    return M.clip("attack", [_attack_pose(f) for f in range(10)], M.HEAVY_MELEE_MS,
                  impact=6, smear=4, sequence=ATTACK_SEQ, overlays=ov)


def _hit(k):
    def recoil(a):
        return merge(wield(-40 + 10 * a, 40 + 16 * a, 120 + 10 * a, lean=6 + 10 * a),
                     {"head": {"r": 10 * a, "rx": 10 * [0, 1, -0.8, 0.4, 0][k]},
                      "brow": {"z": 1.2 * max(a, 0)}})
    base = {k2: v for k2, v in STANCE.items() if not k2.startswith(("arm_", "fore_", "hand_"))}
    return B.hit_armoured(k, base, recoil, face_hurt=F.expr("squeeze", "grit"), helm=None)


DIE_KEEP = [0, 1, 2, 3, 4, 5, 7, 9]
LOOSE = [None, (6, 10, 30), (12, 30, 120), (18, 40, 230), (24, 30, 330), (28, 10, 420), (30, -6, 470),
         (30, -6, 470), (30, -6, 470), (30, -6, 470)]


def _die(k):
    flail = [0.4, 0.3, 0.9, 1.0, 0.3, 0.6, 0.1, 0.0, 0.0, 0.0][k]
    stiff = min(1.0, k / 3.0)
    pose = merge(STANCE, B.die_d2(k, center_z=28.0, lie_z=11.0, height=68.0), {
        "torso": {"r": -4 * stiff}, "head": {"r": 10 * flail},
        "arm_r": {"r": 60 * flail + 40 * stiff}, "fore_r": {"r": 20 * flail},
        "arm_l": {"r": 90 * flail + 40 * stiff}, "fore_l": {"r": 30 * flail},
        "thigh_r": {"r": 10 * flail}, "thigh_l": {"r": -10 * flail},
    })
    if LOOSE[k] is not None:
        x, z, r = LOOSE[k]
        pose["axe"] = dict(pose.get("axe", {}), hide=True)
        pose["axe_loose"] = {"show": True, "x": x, "z": z, "r": -r}
    if k == 0:
        pose = merge(pose, F.expr("squeeze", "yell"))
    elif k < 4:
        pose = merge(pose, F.expr("o"), {"brow": {"z": 2.0}})
    else:
        pose = merge(pose, F.expr("x", "tongue"))
    return pose


def clips():
    cl = [
        M.clip("idle", [_idle(f) for f in range(M.IDLE_FRAMES_HEAVY)],
               [M.IDLE_MS_HEAVY] * M.IDLE_FRAMES_HEAVY, loop=True),
        M.clip("walk", [_walk(f) for f in range(8)], [80] * 8, loop=True),
        _attack_clip(),
        M.clip("hit", [_hit(k) for k in range(5)], M.HIT_MS),
        M.clip("die", [_die(DIE_KEEP[i]) for i in range(8)], M.DIE_MS_HEAVY, sequence=M.DIE_SEQ_HEAVY,
               extra=M.die_meta(HEIGHT_LU, heavy=True)),
    ]
    return M.check_contract(cl, heavy=True)
