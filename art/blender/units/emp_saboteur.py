"""EMP Saboteur: Future Age Epic anti-mech melee (DESIGN A5.6). Shock baton (laser damage),
fast (speed 85), medium; EMP pulse ability (the game draws fx.emp_ring).

Look (A11, Future palette): a lean, low infiltrator, so the silhouette reads "fast and sneaky"
against the upright troopers. A pointed team hood with a tip that flicks behind (follow-
through), a white face mask with a single wide magenta goggle band, a long team scarf that
streams back, a charcoal stealth suit with a team chest harness and shoulder, and on the
back a tall EMP generator ring (white with a magenta core and fins) that flares when he
strikes. In the near hand an oversized shock baton with mint coils and a white tip. The run
is a forward-leaning sprint; the attack is a coiled lunge-jab with a mint smear and an
electric spark burst on the held impact while the back ring flashes; the shock kicks back
through him (his hair spikes out of the hood). Death: D3 dizzy sit with spiral goggles.

Animation standard (ANIM_SPEC 2026-10-02):
  walk      walk v3 sprint at ground speed (G1, 106.25 lu/s, 540 ms): leaning in hard, the baton
            trailing back low in the pumping fist, planted feet, scarf and hood tip streaming
  attack_b  OVERHEAD BATON SLAM: springs up on his toes with the baton high over his head and tipped
            back (the held extreme), then slams it down in front onto the target (sparks, dust)
  attack_c  SPINNING BACKHAND: crouches deep and twists away with the baton cocked back low behind
            his hip (the held extreme), then whips round in a flat backhand, arm and baton level at the target
"""
import math

from ageborn_art import face as FC
from ageborn_art import kit_industrial as KI
from ageborn_art import kit_future as KF
from ageborn_art import kit_medieval as K
from ageborn_art import moves as M
from ageborn_art import rigs_future as F
from ageborn_art.anim import merge
from ageborn_art.geometry import Geo

SLUG = "emp_saboteur"
GAIT_NAME = "biped"
NAME = "EMP Saboteur"
HEIGHT_LU = 70
CANVAS = (340, 262)
FEET = (130, 222)
ANCHORS = {"head": (6, 64), "hitCenter": (2, 30)}
NO_RETIME = True

HR = (0.0, F.ARM_Y["r"], F.HAND_Z)
BATON = 30.0
TIP = (HR[0], HR[1] - 1.0, HR[2] + 4.0 + BATON)
RING = (-19.0, 6.0, 47.0)


RIG = None


def build(rig):
    global RIG
    RIG = rig
    KF.skeleton_v3(rig, head=(2, 0, 37))
    KF.legs_v3(rig, thigh_r=4.3, knee_pad=False, team_thigh=True)
    rig.joint("baton", "hand_r", HR)

    # EMP generator ring on the back (behind everything): a white ring in the side plane
    rx, ry, rz = RING
    rig.joint("ring", "torso", RING)
    g = Geo().lathe([(9.5, -1.6), (12.5, -1.4), (13.2, 0), (12.5, 1.4), (9.5, 1.6), (8.8, 0)],
                    (rx, ry, rz), (rx, ry + 1, rz), segs=28)
    rig.part("ring", g, F.ARMOR, finish="gloss", outline_hex=F.TRIM)
    g = Geo().lathe([(0, -1.0), (8.8, -0.9), (8.8, 0.9), (0, 1.0)], (rx, ry + 0.8, rz), (rx, ry + 1.8, rz), segs=28)
    rig.part("ring", g, F.SUIT)
    g = Geo().lathe([(0, -1.6), (4.6, -1.4), (4.6, 1.4), (0, 1.6)], (rx, ry - 0.2, rz), (rx, ry + 0.8, rz), segs=20)
    rig.part("ring", g, glow=F.MAGENTA, outline=1.0, outline_hex=F.SUIT)
    g = Geo()
    for a in (30, 150, 270):
        ca, sa = math.cos(math.radians(a)), math.sin(math.radians(a))
        g.blob((rx + 14.8 * ca, ry, rz + 14.8 * sa), (2.6, 2.0, 2.6), p=2.6)
    rig.part("ring", g, team=True, outline=0.7)
    rig.joint("ring_flash", "ring", RING, hidden=True)
    g = Geo()
    for i in range(16):
        a0, a1 = 2 * math.pi * i / 16, 2 * math.pi * (i + 0.7) / 16
        g.capsule((rx + 15.5 * math.cos(a0), ry - 3.0, rz + 15.5 * math.sin(a0)),
                  (rx + 15.5 * math.cos(a1), ry - 3.0, rz + 15.5 * math.sin(a1)), 1.3, segs=8, rings=2)
    rig.part("ring_flash", g, glow=F.MAGENTA_CORE, outline=1.0, outline_hex=F.MAGENTA)
    g = Geo().capsule((-8.0, 2.0, 32.0), (rx + 2.0, ry, rz - 6.0), 2.2)
    rig.part("torso", g, F.GUNMETAL, outline=0.6)

    # scarf streaming back from the neck (follow-through)
    rig.secondary("scarf", "torso", (-4.0, -2.0, 38.0), (-24.0, -2.0, 36.0), max_deg=18, gain=1.3)
    g = Geo().blob((-11.0, -2.0, 37.0), (8.0, 1.8, 2.4), p=2.4, rot=(0, 6, 0))
    g.blob((-19.5, -2.0, 35.8), (4.2, 1.5, 2.0), p=2.4, rot=(0, 14, 0))
    rig.part("scarf", g, F.MAGENTA)

    F.arm_parts(rig, "l", glove=F.SUIT_LT, bracer=True, r0=3.8, r1=3.4, fist=3.9, team_sleeve=True)
    # torso: slim charcoal suit, team chest harness
    g = Geo().blob((0, 0, 28), (8.8, 8.8, 10.6), p=2.4, taper=(0.92, 1.05))
    g.blob((0, 0, 18.0), (8.2, 8.6, 4.0), p=2.6)
    rig.part("torso", g, F.SUIT)
    g = Geo().blob((1.5, 0, 31.5), (8.6, 9.4, 6.2), p=3.0, taper=(0.9, 1.0))
    rig.part("torso", g, team=True)
    g = Geo().capsule((9.0, -8.0, 36.0), (8.4, 7.5, 22.0), 1.6)
    rig.part("torso", g, F.GUNMETAL, outline=0.6)
    g = Geo().blob((0.4, 0, 21.4), (9.2, 9.4, 2.2), p=3.4)
    rig.part("torso", g, F.TRIM)
    g = Geo().blob((7.0, -7.4, 19.6), (2.8, 2.2, 3.0), p=3.2).blob((-2.0, -9.0, 19.8), (3.0, 2.0, 3.0), p=3.2)
    rig.part("torso", g, F.GUNMETAL, outline=0.6)
    g = Geo().blob((9.6, -2.0, 21.4), (1.2, 2.0, 1.2), p=2.4)
    rig.part("torso", g, glow=F.MAGENTA, outline=0)

    # head: white mask, magenta goggle band, team hood with a pointed tip
    g = Geo().blob((3.0, 0, 48.0), (10.2, 9.8, 10.6), p=2.4)
    g.blob((8.0, 0, 42.0), (6.6, 7.4, 4.4), p=2.4)
    rig.part("head", g, F.ARMOR, finish="gloss", outline_hex=F.TRIM)
    g = Geo().blob((1.5, 0, 50.0), (11.4, 11.0, 12.0), p=2.3)
    g.clip((2.5, 0, 50.0), (1, 0, -0.35))          # open face: the hood covers crown and back
    g.clip((0, 0, 39.0), (0, 0, -1))
    rig.part("head", g, team=True)
    rig.secondary("hood_tip", "head", (-8.0, 0, 57.0), (-18.0, 0, 60.0), max_deg=16, gain=1.1)
    g = Geo().lathe([(6.0, 0), (4.6, 4.0), (2.4, 8.0), (0, 11.0)], (-7.0, 0, 56.0), (-18.0, 0, 60.5), segs=16)
    rig.part("hood_tip", g, team=True)
    goggle = Geo().blob((11.6, -0.4, 49.0), (3.2, 9.0, 3.6), p=3.6)
    KF.visor_face(rig, "head", [goggle], (12.0, 49.2), eye_dx=(0.0, 2.9), eye_rx=1.5, eye_rz=2.2,
                  color=F.MAGENTA, core=F.MAGENTA_CORE)
    rig.part("head", goggle, F.VISOR_DARK, finish="gloss", outline_hex=F.SUIT)
    # a spiky hair tuft that pokes out of the hood when he zaps himself
    rig.joint("tuft", "head", (6.0, 0, 57.0), hidden=True)
    g = Geo()
    for dx, a_ in ((-2.0, 20), (1.5, 0), (5.0, -22), (-5.5, 40)):
        ca, sa = math.cos(math.radians(90 + a_)), math.sin(math.radians(90 + a_))
        g.lathe([(1.8, 0), (1.1, 3.5), (0, 7.0)], (6.0 + dx, -3.0, 56.0), (6.0 + dx + 7 * ca, -3.0, 56.0 + 7 * sa), segs=8)
    rig.part("tuft", g, "#E8E2D0", finish="hair", outline=0.8)
    chest = Geo().blob((1.5, 0, 31.5), (8.8, 9.6, 6.4), p=3.0, taper=(0.9, 1.0))
    cf = FC.Face(rig, "torso", [chest])
    g = KF.hexmark(cf, Geo(), K.scr(cf, (5.0, -8.6, 30.5)), s=0.8, w=1.3)
    rig.part("torso", g, KF.HEX_PALE, highlight=False, outline=0)

    F.arm_parts(rig, "r", glove=F.SUIT_LT, r0=3.9, r1=3.5, fist=4.1)
    g = Geo().blob((0.4, -12.9, 37.4), (6.4, 5.4, 5.0), p=2.6)
    rig.part("arm_r", g, team=True)

    # the shock baton along +Z from the near fist
    hx, hy, hz = HR
    g = Geo().capsule((hx, hy - 0.4, hz - 4.0), (hx, hy - 0.4, hz + BATON + 2.0), 1.8, 1.6)
    rig.part("baton", g, F.SUIT, finish="gloss", outline=0.8)
    g = Geo().blob((hx, hy - 0.4, hz + 4.6), (2.8, 2.8, 1.3), p=2.6)
    g.lathe([(2.6, 0), (3.0, 3.0), (2.4, 6.0), (0, 7.4)], (hx, hy - 0.4, hz + BATON - 3.0),
            (hx, hy - 0.4, hz + BATON + 4.4), segs=14)
    rig.part("baton", g, F.ARMOR, finish="gloss", outline_hex=F.TRIM)
    g = Geo()
    for z in (hz + 10.0, hz + 14.5, hz + 19.0, hz + 23.5):
        g.lathe([(0, -0.6), (2.9, -0.5), (2.9, 0.5), (0, 0.6)], (hx, hy - 0.4, z), (hx, hy - 0.4, z + 1), segs=14)
    rig.part("baton", g, glow=F.MINT, outline=1.0, outline_hex=F.SUIT)
    rig.track("batonTip", "baton", TIP)
    # crackle round the baton head (idle flicker and strike), and the impact burst
    rig.joint("crackle", "baton", TIP, hidden=True)
    g = Geo()
    tx, ty, tz = TIP
    for a0 in (20, 140, 250):
        pts = []
        for i in range(4):
            a = math.radians(a0 + i * 22)
            r = 4.5 + (1.8 if i % 2 else 0)
            pts.append((tx + r * math.cos(a), ty - 2.0, tz - 2.0 + r * math.sin(a)))
        for p, q in zip(pts, pts[1:]):
            g.capsule(p, q, 0.55, segs=6, rings=2)
    rig.part("crackle", g, glow=F.MINT_CORE, outline=1.0, outline_hex=F.MINT)
    F.sparks(rig, "baton", (tx, ty - 1.0, tz + 2.0), size=1.4, name="sparks", rays=8, seed=2)


# -- poses -----------------------------------------------------------------------------------
def grip(sa, sf, sw, fa=-50.0, ff=-5.0):
    """Baton arm (upper, fore, baton directions) and the free far arm (torso space)."""
    return merge(F.arm("r", sa, sf, sw, 90.0), F.arm("l", fa, ff))


# crouched, leaning in, baton held low and forward
STANCE = merge(grip(-70, -15, 38, -40, 10), {
    "hips": {"z": -1.6}, "torso": {"r": -12}, "head": {"r": 8},
    "thigh_r": {"r": 18}, "shin_r": {"r": -26}, "thigh_l": {"r": -8}, "shin_l": {"r": -18},
})


def _idle(f):
    # rubs the baton with the far hand (a crackle on the stroke), weight shift, a blink
    rub = [0.0, 0.6, 1.0, 0.7, 0.2, 0.0][f]

    def extra(ctx):
        return {"arm_r": {"r": 3 * ctx["lag"]}, "hand_r": {"r": -4 * ctx["lag"]}}
    pose = M.idle_v2(f, STANCE, frames=6, bob=1.0, chest=0.035, extra=extra, blink=5,
                     face_blink=KF.glyph("g_blink"))
    if rub > 0:
        # the far hand slides along the baton shaft
        a, fo = F.ik2(F.SH, (13.0 + 5.0 * rub, 29.0 + 5.0 * rub))
        pose.update(F.arm("l", a, fo))
    if f in (2, 3):
        pose["crackle"] = {"show": True, "r": 40 * f}
    return KI.ground_feet(RIG, pose, LEGS)


# -- walk v3: G1 sprint at ground speed (card 85 x 1.25 = 106.25 lu/s), 8 x 67.5 ms ---------------
SPEED = 106.25
LEGS = KF.legs_ik()
GAIT = KF.jog_gait(LEGS, SPEED, cycle_ms=540)
# walk carry: the near arm swept back with the baton trailing level behind him (a ninja sprint), the
# far arm pumping
CARRY = merge(grip(-125, -105, 196, -40, 10), {"torso": {"r": -4.0}})


def _walk(f, report=None):
    def extra(ctx):
        lag = ctx["bob_lag"] / max(ctx["amp"], 1e-3)
        return {"head": {"r": 10.0 - 2.0 * lag}, "arm_r": {"r": 4 * lag}, "hand_r": {"r": -8 * lag}, "scarf": {"r": 0.0},
                "hood_tip": {"r": 0.0}}
    return M.walk_v3(RIG, f, CARRY, GAIT, legs=LEGS, lean=-18.0, twist=8.0, nod=3.0,
                     arms={"l": KF.ArmChain("l")}, arm=40.0, extra=extra, report=report)


# -- attack: crouch-sneak zap jab (small melee timing) -------------------------------------------
#        read  crouch cock  HOLD  smear lead  IMPACT zap  recoil settle settle
SA = [-70, -85, -110, -125, -40, -10, 0, 2, -30, -55, -68]
SF = [-15, -35, -40, -45, -5, 2, 4, 6, -8, -12, -15]
W_WORLD = [26, 8, 0, -2, 2, 2, 4, 6, 10, 18, 24]   # baton direction in world degrees
FA = [-40, -20, 10, 30, -40, -60, -70, -50, -45, -42, -40]
FF = [10, 30, 45, 60, 0, -20, -25, -10, 0, 6, 10]
BX = [0, -1.5, -3.5, -5.0, 2.0, 6.0, 10.0, 8.0, 6.0, 3.0, 1.0]
BZ = [0, -2.0, -2.6, -3.2, -2.0, -2.2, -3.0, 0.8, -1.0, -1.4, -1.6]
BQ = [0, -0.08, -0.04, -0.10, 0.10, 0.08, -0.12, 0.10, -0.04, 0.0, 0.0]
TR = [-12, -14, -8, -6, -20, -26, -32, -10, -18, -14, -12]
HD = [8, 10, 6, 4, 12, 14, 16, 0, 10, 8, 8]
THR = [18, 20, 8, 2, 30, 38, 46, 34, 30, 22, 18]
SHR = [-26, -34, -36, -38, -30, -30, -30, -20, -26, -26, -26]
THL = [-8, -2, 6, 12, -14, -24, -32, -20, -16, -10, -8]
SHL = [-18, -26, -30, -34, -12, -8, -6, -10, -14, -16, -18]
EYES = ["eyes", "g_angry", "g_angry", "g_angry", "g_squint", "g_squint", "g_angry", "g_spiral", "g_hurt",
        "eyes", "eyes"]


def _attack_pose(f):
    pose = merge(grip(SA[f], SF[f], W_WORLD[f] - TR[f], FA[f], FF[f]), {
        "torso": {"r": TR[f]}, "head": {"r": HD[f]},
        "thigh_r": {"r": THR[f]}, "shin_r": {"r": SHR[f]},
        "thigh_l": {"r": THL[f]}, "shin_l": {"r": SHL[f]},
        "sparks": {"show": f == 6},
        "crackle": {"show": f in (2, 3, 7), "r": 50 * f, "s": 1.3 if f == 3 else 1.0},
        "ring_flash": {"show": f in (3, 6, 7), "s": [1, 1, 1, 0.85, 1, 1, 1.0, 1.25, 1, 1, 1][f]},
        "tuft": {"show": f in (7, 8), "s": 1.15 if f == 7 else 0.9},
        "hood_tip": {"r": -20.0 if f == 7 else 0.0},
    }, M.body_about((0, 0, 24), x=BX[f], z=BZ[f], q=BQ[f]))
    if f in (4, 5):
        pose.setdefault("baton", {})["sz"] = 1.2
    return KI.ground_feet(RIG, merge(pose, KF.glyph(EYES[f])), LEGS)


def _attack_clip():
    streak = {"kind": "streak", "joint": "baton", "point": TIP, "color": F.MINT, "width_lu": 6.0, "white": 0.35}
    ov = {
        4: [dict(streak, **{"from": 3, "t1": 0.95})],
        5: [dict(streak, **{"from": 3, "t0": 0.3, "t1": 0.95})],
        6: [dict(streak, **{"from": 4, "t0": 0.3, "t1": 0.9, "width_lu": 5.0}),
            {"kind": "burst", "joint": "baton", "point": TIP, "r0_lu": 6.0, "r1_lu": 13.0, "n": 7,
             "a0": -80.0, "arc": 160.0, "color": F.MINT_CORE},
            {"kind": "dust", "ground": (14.0, 0.0), "size_lu": 5.0, "puffs": 3, "seed": 31, "spread": 0.9,
             "color": "#DDE3E8"}],
        7: [{"kind": "rings", "joint": "head", "point": (4.0, 0.0, 52.0), "radii_lu": (12.0, 17.0),
             "a0": 30.0, "a1": 150.0, "color": F.MINT_CORE}],
    }
    return M.clip("attack", [_attack_pose(f) for f in range(11)], M.SMALL_MELEE_MS,
                  impact=M.SMALL_MELEE_IMPACT, overlays=ov)


# -- attack B: overhead baton slam (A's timing; impact on frame 6) -------------------------------
# frames: 0 = A read, 1 spring, 2 raise, 3 HOLD (up on his toes, the baton high over his head and
# tipped back), 4-5 smears over the top, 6 IMPACT (slammed down in front), 7 bounce, 8 recoil, 9-10 = A
B_SA = [10, 80, 110, 70, 0, -30, -26, -40]
B_SF = [60, 120, 140, 60, -10, -38, -34, -20]
B_WW = [120, 140, 160, 70, -10, -30, -26, -6]     # baton direction, world degrees
B_FA = [-30, -10, 10, -40, -70, -80, -76, -60]
B_FF = [0, 20, 30, -10, -40, -50, -46, -30]
B_TR = [-6, 2, 8, -6, -18, -26, -22, -14]
B_BX = [-1.0, -2.0, -2.5, 2.0, 6.0, 9.0, 9.0, 6.0]
B_BZ = [0.0, 2.0, 3.0, 2.0, -1.0, -5.0, -4.0, -2.5]
B_BQ = [0.04, 0.08, 0.10, 0.06, 0.0, -0.16, 0.04, -0.04]
B_THR = [10, 4, 0, 20, 30, 40, 36, 24]
B_SHR = [-20, -10, -8, -20, -26, -34, -30, -24]
B_THL = [-6, 0, 4, -14, -24, -32, -30, -16]
B_SHL = [-18, -12, -10, -10, -8, -20, -16, -14]
B_EYES = ["g_angry", "g_angry", "g_angry", "g_squint", "g_squint", "g_angry", "g_spiral", "g_hurt"]


def _b_pose(i):
    if i in (0, 9, 10):
        return _attack_pose(i)
    k = i - 1
    pose = merge(grip(B_SA[k], B_SF[k], B_WW[k] - B_TR[k], B_FA[k], B_FF[k]), {
        "torso": {"r": B_TR[k]}, "head": {"r": 8 - 0.3 * B_TR[k]},
        "thigh_r": {"r": B_THR[k]}, "shin_r": {"r": B_SHR[k]},
        "thigh_l": {"r": B_THL[k]}, "shin_l": {"r": B_SHL[k]},
        "sparks": {"show": k == 5},
        "crackle": {"show": k in (2, 5), "r": 50 * k, "s": 1.3 if k == 2 else 1.0},
        "ring_flash": {"show": k in (2, 5, 6), "s": [1, 1, 0.85, 1, 1, 1.0, 1.25, 1][k]},
        "tuft": {"show": k in (6, 7), "s": 1.15 if k == 6 else 0.9},
        "hood_tip": {"r": -20.0 if k == 6 else 0.0},
    }, M.body_about((0, 0, 24), x=B_BX[k], z=B_BZ[k], q=B_BQ[k]))
    if k in (3, 4):
        pose.setdefault("baton", {})["sz"] = 1.2
    pose = merge(pose, KF.glyph(B_EYES[k]))
    return KI.ground_feet(RIG, pose, LEGS, toes={"r": -16, "l": -20} if k in (1, 2) else None)


def _attack_b():
    slam = {"kind": "arc", "joint": "baton", "inner": (HR[0], HR[1] - 1.0, HR[2] + 12.0), "outer": TIP,
            "color": F.MINT, "white": 0.35, "taper": 0.2, "lines": 3, "t0": 0.0, "t1": 0.95}
    ov = {
        4: [dict(slam, **{"from": 3})],
        5: [dict(slam, **{"from": 3, "t0": 0.35, "t1": 1.0})],
        6: [dict(slam, **{"from": 5, "t0": 0.2, "t1": 1.0, "lines": 2}),
            {"kind": "burst", "joint": "baton", "point": TIP, "r0_lu": 6.0, "r1_lu": 13.0, "n": 7,
             "a0": 10.0, "arc": 160.0, "color": F.MINT_CORE},
            {"kind": "dust", "joint": "baton", "point": TIP, "ground_snap": True, "size_lu": 7.0, "puffs": 4,
             "seed": 91, "spread": 1.2, "color": "#DDE3E8"}],
        7: [{"kind": "rings", "joint": "head", "point": (4.0, 0.0, 52.0), "radii_lu": (12.0, 17.0),
             "a0": 30.0, "a1": 150.0, "color": F.MINT_CORE}],
    }
    reuse = {0: ("attack", 0), 9: ("attack", 9), 10: ("attack", 10)}
    return M.clip("attack_b", [_b_pose(i) for i in range(11)], M.SMALL_MELEE_MS, impact=M.SMALL_MELEE_IMPACT,
                  smear=4, overlays=ov, reuse=reuse)


# -- attack C: spinning backhand ----------------------------------------------------------------
# frames: 0 = A read, 1 twist, 2 cock, 3 HOLD (crouched deep and twisted away, the baton cocked back
# low behind his hip), 4-5 smears (the backhand whip, rising), 6 IMPACT (arm and baton level at the target),
# 7 follow, 8 recoil, 9-10 = A settle
C_HAND = [(-4.0, 26.0), (-7.0, 23.0), (-9.0, 21.5), None, None, None, None, None]
C_SA = [0, 0, 0, -30, -10, -6, -4, -35]
C_SF = [0, 0, 0, -20, -8, -4, -2, -15]
C_WW = [170, 186, 194, 120, 50, 0, -8, 20]
C_FA = [-100, -120, -130, -80, -40, -20, -24, -40]
C_FF = [-80, -100, -110, -60, -20, 0, -4, -20]
C_TR = [-10, -8, -6, -14, -22, -26, -24, -16]
C_TZ = [8, 14, 18, 8, -10, -22, -20, -10]
C_BX = [-1.0, -2.0, -3.0, 2.0, 6.0, 9.0, 9.0, 6.0]
C_BZ = [-2.5, -4.5, -6.0, -4.0, -3.0, -3.5, -3.0, -2.0]
C_BQ = [-0.04, -0.07, -0.09, 0.06, 0.04, -0.12, 0.03, -0.04]
C_THR = [14, 20, 24, 30, 36, 42, 40, 26]
C_SHR = [-28, -34, -38, -30, -28, -30, -28, -24]
C_THL = [-6, -12, -16, -24, -30, -36, -34, -18]
C_SHL = [-20, -24, -28, -14, -8, -6, -6, -14]
C_EYES = ["g_angry", "g_angry", "g_angry", "g_squint", "g_squint", "g_angry", "g_angry", "eyes"]


def _c_pose(i):
    if i in (0, 9, 10):
        return _attack_pose(i)
    k = i - 1
    if C_HAND[k] is not None:
        a, fo = F.ik2(F.SH, C_HAND[k])
    else:
        a, fo = C_SA[k], C_SF[k]
    pose = merge(grip(a, fo, C_WW[k] - C_TR[k], C_FA[k], C_FF[k]), {
        "torso": {"r": C_TR[k], "rz": C_TZ[k]}, "head": {"r": 8 - 0.3 * C_TR[k], "rz": -0.5 * C_TZ[k]},
        "thigh_r": {"r": C_THR[k]}, "shin_r": {"r": C_SHR[k]},
        "thigh_l": {"r": C_THL[k]}, "shin_l": {"r": C_SHL[k]},
        "sparks": {"show": k == 5},
        "crackle": {"show": k in (2, 6), "r": 60 * k},
        "ring_flash": {"show": k in (5, 6), "s": 1.1 if k == 5 else 1.0},
    }, M.body_about((0, 0, 24), x=C_BX[k], z=C_BZ[k], q=C_BQ[k]))
    if k in (3, 4):
        pose.setdefault("baton", {})["sz"] = 1.2
    pose = merge(pose, KF.glyph(C_EYES[k]))
    return KI.ground_feet(RIG, pose, LEGS)


def _attack_c():
    whip = {"kind": "arc", "joint": "baton", "inner": (HR[0], HR[1] - 1.0, HR[2] + 12.0), "outer": TIP,
            "color": F.MINT, "white": 0.35, "taper": 0.2, "lines": 3, "t0": 0.0, "t1": 0.95}
    ov = {
        4: [dict(whip, **{"from": 3})],
        5: [dict(whip, **{"from": 3, "t0": 0.35, "t1": 1.0})],
        6: [dict(whip, **{"from": 5, "t0": 0.2, "t1": 1.0, "lines": 2}),
            {"kind": "burst", "joint": "baton", "point": TIP, "r0_lu": 6.0, "r1_lu": 13.0, "n": 7,
             "a0": -80.0, "arc": 160.0, "color": F.MINT_CORE},
            {"kind": "dust", "ground": (16.0, 0.0), "size_lu": 5.0, "puffs": 3, "seed": 92, "spread": 0.9,
             "color": "#DDE3E8"}],
    }
    reuse = {0: ("attack", 0), 9: ("attack", 9), 10: ("attack", 10)}
    return M.clip("attack_c", [_c_pose(i) for i in range(11)], M.SMALL_MELEE_MS, impact=M.SMALL_MELEE_IMPACT,
                  smear=4, overlays=ov, reuse=reuse)


def _hit(k):
    def recoil(a):
        up = max(a, 0)
        return {"arm_r": {"r": 16 * a}, "hand_r": {"r": 12 * a}, "arm_l": {"r": 26 * a},
                "head": {"r": 14 * a}, "torso": {"r": 12 * a},
                "thigh_r": {"r": -10 * up}, "shin_r": {"r": 10 * up}, "hood_tip": {"r": -12 * a}}
    return KI.ground_feet(RIG, M.hit_light(k, STANCE, recoil, face_hurt=KF.glyph("g_hurt"),
                                           face_back=KF.glyph("g_angry") if k == 2 else None), LEGS)


def _die(k):
    # D3 dizzy sit: spins in place, sits down hard, legs out, the baton drops into his lap
    t = [0, 0, 0.1, 0.3, 1.0, 0.95, 1.0, 1.0, 1.0, 1.0][k]
    pose = merge(STANCE, {k2: {c: -v for c, v in ch.items() if not isinstance(v, bool)}
                          for k2, ch in STANCE.items() if k2 in ("hips", "torso", "head", "thigh_r", "shin_r",
                                                                  "thigh_l", "shin_l")},
                 M.die_d3(k, center_z=26.0, height=HEIGHT_LU), K.d3_sit(k, amount=t), {"torso": {"r": -16 * t}}, {
        "hand_r": {"r": -60 * t}, "crackle": {"show": k in (1, 3), "r": 70 * k},
        "head": {"r": 10 * t},
        "tuft": {"show": k in (0, 1, 2)},
    })
    g = ["g_hurt", "g_wide", "g_spiral", "g_spiral", "g_spiral", "g_spiral", "g_spiral", "g_spiral",
         "g_spiral", "g_spiral"][k]
    return merge(pose, KF.glyph(g))


def clips():
    cl = [
        M.clip("idle", [_idle(f) for f in range(6)], [153, 154, 153, 153, 154, 153], loop=True),
        M.walk_clip("walk", RIG, _walk, GAIT, "biped"),
        _attack_clip(),
        _attack_b(),
        _attack_c(),
        M.clip("hit", [_hit(k) for k in range(5)], M.HIT_MS),
        M.clip("die", [_die(k) for k in (0, 1, 2, 3, 4, 5, 6, 8)], M.DIE_MS,
               sequence=[0, 1, 2, 3, 4, 5, 6, 6, 7, 7], extra=M.die_meta(HEIGHT_LU)),
    ]
    return M.check_variants(M.check_contract(cl))
