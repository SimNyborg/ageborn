"""Radio Operator: Modern Age support (DESIGN A5.5). Bullet, 200 lu; calls in shells. ~68 lu.

Look (A11, Modern palette): a chatty signaller in a soft olive field cap with a team band and big
headphones (one cup over the cap), a team tunic with team sleeves (cream chevrons on the near
sleeve), khaki webbing, olive trousers and khaki puttees. On his back rides a big team-painted
radio set (a gunmetal face panel with two cream dials, a signal lamp, a lid, a coiled cord) with a
tall whip antenna in two segments with follow-through and a signal tip: the antenna is his
silhouette cue at 56 px. His near hand keeps the handset at his ear; the far hand holds a service
pistol.

Animation (art director plan 2026-09-30, `ageborn_art/moves.py`):
  idle    chats into the handset (the mouth moves, he nods and laughs), the antenna sways, blink
  walk    jog: forward lean, the pistol arm pumping, the handset stays at his ear, the antenna whips
  attack  TALK AND POP: still talking into the handset, he swings the pistol up at arm's length,
          squints along it (the held extreme, mouth still going), POPS one shot (one flash, impact
          lines), the kick flips the pistol up, and he shouts the fire mission into the handset
          (the antenna whips) before the pistol comes back down. The bullet leaves the per-frame
          `muzzle` anchor on the fire frame.
  hit     light: the head snaps back, the cap lifts, eyes squeezed, overshoot forward
  die     D3 dizzy sit: spins, sits down hard with the legs out, spiral eyes, the handset dangling
          on its cord and the antenna flopping

Animation standard (ANIM_SPEC 2026-10-02):
  walk      walk v3 bounce jog at ground speed (G1, 65 x 1.25 = 81.25 lu/s), still chatting: the
            handset at his ear, the pistol arm pumping, the antenna whipping, planted feet
  attack    A as above; the aim is split into the hold and a wobble frame (holdLoop: the sim
            wind-up is 2.1x the authored one)
  attack_b  TWO-HANDED AIMED SHOT: he lets the handset drop onto its cord, drops into a low lunge on
            one knee and aims the pistol in both hands at arm's length (the held extreme, holdLoop), fires,
            the kick lifts both arms, and he snatches the handset back up to his ear
"""
import math

from ageborn_art import face as F
from ageborn_art import kit_industrial as KI
from ageborn_art import kit_medieval as K
from ageborn_art import kit_modern as KM
from ageborn_art import moves as M
from ageborn_art import rigs_modern as R
from ageborn_art.anim import merge
from ageborn_art.geometry import Geo

SLUG = "radio_operator"
GAIT_NAME = "biped"
NAME = "Radio Operator"
HEIGHT_LU = 68
CANVAS = (300, 262)
FEET = (130, 234)
ANCHORS = {"head": (2, 66), "hitCenter": (0, 32), "muzzle": (46, 34)}
NO_RETIME = True

ANT_BASE = (-15.0, 6.0, 46.0)
ANT_MID = (-17.0, 6.0, 67.0)
ANT_TOP = (-19.0, 6.0, 88.0)
HANDSET = "#2E3237"
CAP_C = (1.0, 0.0, 56.5)
PF = (0.4, R.ARM_Y["l"], R.HAND_Z - 0.4)     # the far fist (pistol grip)
PMUZ = (PF[0] + 13.5, PF[1] - 1.5, PF[2] + 2.8)


def _pistol(rig, joint):
    x, y, z = PF
    y -= 1.5
    g = Geo()
    g.blob((x + 5.0, y, z + 2.8), (7.2, 1.7, 2.3), p=3.2)          # slide
    g.capsule((x + 8.0, y, z + 2.6), (PMUZ[0] - 0.4, y, PMUZ[2]), 1.2)
    g.blob((x - 0.8, y, z - 0.8), (2.2, 1.6, 4.2), p=3.0, rot=(0, -14, 0))   # grip
    rig.part(joint, g, R.GUNMETAL, finish="metal", outline=0.7)
    g = Geo().blob((x + 2.2, y, z - 0.2), (1.6, 1.0, 1.2), p=2.4)   # trigger guard
    rig.part(joint, g, R.GUNMETAL, finish="metal", outline=0.4)


RIG = None


def build(rig):
    global RIG
    RIG = rig
    KM.skeleton_v3(rig)
    KM.legs_v3(rig, trousers=R.OLIVE)
    # the radio set on his back (behind the torso)
    radio = Geo().blob((-13.8, 1.0, 32.0), (6.8, 10.6, 12.6), p=3.4)
    rig.part("torso", radio, team=True)
    panel = Geo().blob((-13.8, -9.8, 34.0), (5.0, 1.4, 8.0), p=3.2)   # face panel
    pface = F.Face(rig, "torso", [panel])
    rig.part("torso", panel, R.GUNMETAL, finish="metal", outline=0.6)
    g = Geo()
    for x, z in ((-16.0, 37.4), (-11.6, 37.4)):
        pface.decal(g, pface.hit(x, z), F.ellipse(0, 0, 1.8, 1.8, 14), 0.4)
    rig.part("torso", g, KM.CREAM, highlight=False, outline=0)
    g = Geo()
    for x, z in ((-16.0, 37.4), (-11.6, 37.4)):
        pface.stroke(g, pface.hit(x, z) - pface.view * 0.3, [(0, 0), (0.9, 1.2)], 0.6, 0.3)
    rig.part("torso", g, R.GUNMETAL, highlight=False, outline=0)
    g = Geo()
    pface.stroke(g, pface.hit(-13.8, 30.4), [(-3.0, 0), (3.0, 0)], 0.9, 0.4)   # a grille
    pface.stroke(g, pface.hit(-13.8, 28.6), [(-3.0, 0), (3.0, 0)], 0.9, 0.4)
    rig.part("torso", g, "#262A2E", highlight=False, outline=0)
    g = Geo().sphere((-10.8, -11.2, 32.6), 1.4, cuts=3)
    rig.part("torso", g, glow="#E0508E", outline=0.5, outline_hex=R.SIGNAL)
    g = Geo().blob((-13.8, 1.0, 45.2), (5.6, 8.6, 1.7), p=3.0)   # lid
    rig.part("torso", g, R.OLIVE, outline=0.6)
    g = Geo().capsule((2.0, -10.6, 37.0), (-8.0, -9.4, 22.0), 1.5)  # strap
    rig.part("torso", g, R.KHAKI, outline=0.6)
    # the coiled cord from the radio to the handset, hanging as a secondary loop
    rig.secondary("cord", "torso", (-9.0, -11.0, 28.0), (-6.0, -12.0, 16.0), max_deg=20, gain=1.3)
    g = Geo()
    for k in range(7):
        z = 27.0 - k * 1.7
        g.lathe([(1.2, -0.4), (1.4, 0), (1.2, 0.4)], (-8.6 + 0.3 * k, -12.0, z), (-8.6 + 0.3 * k, -12.0, z - 0.8),
                segs=10)
    rig.part("cord", g, HANDSET, outline=0.3)
    # antenna: base mount, two whip segments on follow-through, a signal tip
    g = Geo().lathe([(1.9, 0), (1.7, 3.0), (1.0, 4.0)], ANT_BASE, (ANT_BASE[0], ANT_BASE[1], ANT_BASE[2] + 4), segs=10)
    rig.part("torso", g, R.GUNMETAL, finish="metal", outline=0.5)
    rig.secondary("ant1", "torso", ANT_BASE, ANT_MID, max_deg=12, gain=1.1)
    g = Geo().capsule(ANT_BASE, ANT_MID, 1.1, 0.95)
    rig.part("ant1", g, "#A9B1B8", finish="metal", outline=0.5)
    rig.secondary("ant2", "ant1", ANT_MID, ANT_TOP, max_deg=20, gain=1.5)
    g = Geo().capsule(ANT_MID, ANT_TOP, 0.9, 0.75)
    rig.part("ant2", g, "#A9B1B8", finish="metal", outline=0.5)
    g = Geo().sphere(ANT_TOP, 1.4, cuts=3)
    rig.part("ant2", g, R.SIGNAL, outline=0.6)
    rig.track("antenna", "ant2", ANT_TOP)

    R.tunic(rig, hem_z=13.0)
    KI.head_face(rig, brow=R.HAIR, brow_angry=False, mouth_dz=-9.0, mouth_w=5.6, mouth_shape="smile")
    g = Geo().blob((-6.0, 0, 46.0), (5.6, 9.8, 6.0), p=2.2)
    rig.part("head", g, R.HAIR, finish="hair")

    def cap(j):
        R.field_cap(rig, c=CAP_C, joint=j)
        g = Geo().capsule((0.0, -12.2, 50.0), (0.0, -7.2, 61.5), 1.2).capsule((0.0, -7.2, 61.5), (0.0, 7.2, 61.5), 1.2)
        rig.part(j, g, R.GUNMETAL, finish="metal", outline=0.5)
        g = Geo().blob((-3.6, -12.0, 50.0), (3.6, 2.0, 4.2), p=2.4)       # headphone cup
        rig.part(j, g, R.OLIVE_LT, finish="gloss", outline=0.6)
    rig.joint("hat", "head", CAP_C)
    cap("hat")
    KI.loose(rig, "hat_loose", CAP_C, cap)

    for s in ("r", "l"):
        R.arm_parts(rig, s, fist=4.3)
    R.shoulders(rig)
    sleeve = Geo().capsule((0, R.ARM_Y["r"], R.SHOULDER_Z), (0, R.ARM_Y["r"], R.ELBOW_Z), 4.4, 4.1)
    sface = F.Face(rig, "arm_r", [sleeve])
    g = KM.chevron(sface, Geo(), (0.6, 32.8), s=0.95, n=2, w=1.7, gap=2.9)
    rig.part("arm_r", g, KM.CREAM, highlight=False, outline=0)

    # the handset in the near hand (modelled pointing up from the fist)
    hx, hy, hz = 0.4, R.ARM_Y["r"] - 1.8, R.HAND_Z - 0.4
    rig.joint("handset", "hand_r", (hx, hy, hz))
    g = Geo().capsule((hx, hy - 1.0, hz - 5.2), (hx, hy - 1.0, hz + 5.2), 1.9)
    g.blob((hx + 1.5, hy - 1.0, hz + 6.8), (3.0, 2.3, 2.5), p=2.4)
    g.blob((hx + 1.5, hy - 1.0, hz - 6.8), (3.0, 2.3, 2.5), p=2.4)
    rig.part("handset", g, HANDSET, finish="gloss")
    # the handset dangling on its cord (death)
    rig.joint("handset_hang", "torso", (-8.0, -11.0, 22.0), hidden=True)
    g = Geo()
    pts = [(-11.0, 30.0), (-9.0, 26.0), (-11.0, 23.0), (-9.0, 20.0)]
    for (ax, az), (bx, bz) in zip(pts, pts[1:]):
        g.capsule((ax, -11.5, az), (bx, -11.5, bz), 0.6, segs=6, rings=2)
    rig.part("handset_hang", g, HANDSET, outline=0.4)
    g = Geo().capsule((-8.5, -12.0, 12.5), (-8.0, -12.0, 19.5), 1.7)
    g.blob((-7.0, -12.0, 11.5), (2.3, 1.8, 2.0), p=2.4).blob((-7.0, -12.0, 20.5), (2.3, 1.8, 2.0), p=2.4)
    rig.part("handset_hang", g, HANDSET, finish="gloss", outline=0.6)

    rig.joint("gun", "hand_l", PF)
    _pistol(rig, "gun")
    rig.track("muzzle", "gun", PMUZ)
    R.muzzle_flash(rig, "gun", (PMUZ[0] + 0.5, PMUZ[1] - 6.0, PMUZ[2]), size=1.1)
    rig.joint("smoke", "gun", PMUZ, hidden=True)
    g = Geo()
    for dx, dz, r in ((3.0, 2.0, 2.2), (5.0, 4.4, 1.8), (2.0, 6.0, 1.5)):
        g.sphere((PMUZ[0] + dx, PMUZ[1] - 5.0, PMUZ[2] + dz), r, cuts=3)
    rig.part("smoke", g, R.SMOKE, finish="dust", outline=0.6)


# -- poses ------------------------------------------------------------------------------------------
def talk(k=0.0, lean=0.0):
    """Near hand holds the handset at the ear/mouth (k nods it)."""
    a, f = R.ik2(R.SH, (12.5 + k, 38.5 + k))
    return R.arm("r", a, f, w=104.0 + 6 * k, w_rest=90.0)


def pistol(a, f, w=None, lean=0.0):
    """Far arm (a, f) in WORLD degrees; the pistol points w (default: along the forearm)."""
    w = f if w is None else w
    return R.arm("l", a - lean, f - lean, w=w - lean, w_rest=0.0)


LOW = (-80.0, -62.0, -40.0)      # the pistol hangs low at his side
STANCE = merge(talk(), pistol(*LOW), {"torso": {"r": -2.0}})
MOUTH = [None, "o", None, "o", "yell", None]


def _idle(f):
    def extra(ctx):
        return merge(talk(0.8 * ctx["c"]), pistol(LOW[0] + 3 * ctx["lag"], LOW[1] + 4 * ctx["lag"], LOW[2] + 4 * ctx["lag"]),
                     {"head": {"r": [0, 3, -2, 4, 7, 1][f]}, "brow": {"z": [0, 0.4, 0, 0.6, 1.0, 0][f]}})
    pose = M.idle_v2(f, {"torso": {"r": -2.0}}, frames=6, extra=extra, face_blink=F.expr("blink"), blink=2)
    if MOUTH[f]:
        pose = merge(pose, F.expr(MOUTH[f]))
    return KM.ground_feet(RIG, pose, LEGS)


# -- walk v3: G1 bounce jog at ground speed (card 65 x 1.25 = 81.25 lu/s), 8 x 77 ms --------------
SPEED = 81.25
LEGS = KM.legs_ik()
GAIT = KM.jog_gait(LEGS, SPEED, cycle_ms=616)
WALK_LEAN = -10.0


def _walk(f, report=None):
    def extra(ctx):
        lag = ctx["bob_lag"] / max(ctx["amp"], 1e-3)
        c = -math.cos(ctx["lag_p"])          # +1 = the far (pistol) arm forward
        return merge(talk(0.5 * lag), pistol(-90.0 + 36 * c, -30.0 + 40 * c, -20.0 + 40 * c, lean=WALK_LEAN),
                     {"hat": {"r": -1.4 * lag}})
    pose = M.walk_v3(RIG, f, {"torso": {"r": -2.0}}, GAIT, legs=LEGS, lean=WALK_LEAN + 2.0, twist=7.0, nod=3.0,
                     extra=extra, report=report)
    if f in (1, 5):
        pose = merge(pose, F.expr("o"))
    return pose


# 11 unique frames in 790 ms; fire on frame 4 at 291 ms (impactAt 0.3684, as shipped). The shipped
# 191 ms hold is split into the hold (130) and a wobble partner (61) for the holdLoop.
ATTACK_MS = [40, 60, 130, 61, 60, 80, 70, 70, 70, 75, 74]
ATTACK_IMPACT = 4
U_OF = [0, 1, 2, 2, 3, 4, 5, 6, 7, 8, 9]     # unique frame -> row of the pose tables below
#       swing  aim  HOLD  POP  kick  shout shout  lower low   settle
PA = [-50.0, -34.0, -30.0, -30.0, -20.0, -28.0, -32.0, -50.0, -70.0, -80.0]
PF_ = [-20.0, -6.0, -3.0, -3.0, 28.0, 6.0, -4.0, -40.0, -58.0, -62.0]
PW = [10.0, -1.0, 0.0, 0.0, 55.0, 16.0, 0.0, -30.0, -40.0, -40.0]
LEAN = [-2, -5, -6, -6, 2, -6, -8, -4, -2, -2]
MOUTHS = ["o", None, "o", "grit", "o", "yell", "yell", "o", None, None]


def _attack_pose(i):
    wob = i == 3
    f = U_OF[i]
    t = LEAN[f]
    w = 1.5 if wob else 0.0
    pose = merge(talk([0, 0, 0.3, 0, -0.6, 1.0, 0.6, 0, 0, 0][f] - (0.3 if wob else 0.0)),
                 pistol(PA[f] + w, PF_[f] + w, PW[f] + 2 * w, lean=t), {
        "torso": {"r": t, "rz": [0, 6, 8, 8, 4, 2, 0, 0, 0, 0][f]},
        "head": {"r": [0, -4, -6, -6, 4, 8, 10, 4, 2, 0][f] - 0.3 * t},
        "thigh_r": {"r": [2, 8, 10, 10, 6, 10, 12, 6, 2, 0][f]},
        "shin_r": {"r": [0, -4, -6, -6, -2, -4, -6, -2, 0, 0][f]},
        "thigh_l": {"r": [-2, -8, -12, -12, -10, -12, -14, -8, -4, -2][f]},
        "hat": {"r": [0, 0, 0, 0, 5, -3, -4, 0, 0, 0][f]},
        "flash": {"show": f == 3},
        "smoke": {"show": f in (4, 5), "s": [1, 1, 1, 1, 1.0, 1.35, 1, 1, 1, 1][f],
                  "z": [0, 0, 0, 0, 0, 2.0, 0, 0, 0, 0][f]},
    }, M.body_about((0, 0, 22), x=[0, 0.5, 1.0, 1.0, -2.0, 0.5, 1.0, 0.5, 0, 0][f],
                    q=[0, -0.02, -0.03, 0.03, -0.06, 0.04, 0.02, 0, 0, 0][f]))
    if f in (2, 3):
        pose = merge(pose, F.expr("squeeze"))
    if MOUTHS[f]:
        pose = merge(pose, F.expr(MOUTHS[f]))
    if f in (5, 6):
        pose = merge(pose, {"brow": {"z": 1.4}})
    if wob:
        pose = merge(pose, F.expr("o"))
    return KM.ground_feet(RIG, pose, LEGS)


def _attack_clip():
    ov = {4: [{"kind": "burst", "joint": "gun", "point": PMUZ, "r0_lu": 6.0, "r1_lu": 10.0, "n": 5, "a0": -60.0,
               "arc": 120.0}],
          6: [{"kind": "rings", "joint": "handset", "point": (6.0, R.ARM_Y["r"] - 3.0, R.HAND_Z + 4.0),
               "radii_lu": (6.0, 10.0), "a0": -40.0, "a1": 40.0}],
          7: [{"kind": "rings", "joint": "handset", "point": (6.0, R.ARM_Y["r"] - 3.0, R.HAND_Z + 4.0),
               "radii_lu": (8.0, 12.5), "a0": -40.0, "a1": 40.0}]}
    return M.clip("attack", [_attack_pose(f) for f in range(11)], ATTACK_MS, impact=ATTACK_IMPACT, overlays=ov,
                  extra={"holdStep": 2, "holdLoop": [2, 3]})


# -- attack B: two-handed aimed shot (ANIM_SPEC appendix B) -----------------------------------------
# unique frames: 0 = A swing, 1 drop (the handset falls onto its cord, he sinks), 2 HOLD (a half
# crouch, the pistol in both hands at arm's length, squinting), 3 wobble (holdLoop), 4 FIRE, 5 kick
# (both arms flip up), 6 recover, 7 grab (the handset back at his ear), 8 lower, 9-10 = A settle.
#        drop  HOLD  wob   FIRE  kick  recov  grab  lower
B_PA = [-30.0, -2.0, -1.0, -2.0, 14.0, -4.0, -40.0, -64.0]
B_PF = [-10.0, -2.0, -1.0, -2.0, 40.0, 6.0, -24.0, -50.0]
B_PW = [-4.0, 0.0, 1.6, 0.0, 62.0, 10.0, -16.0, -34.0]
B_LEAN = [-6, -14, -14, -14, -4, -10, -6, -3]
B_DROP = [5.0, 10.0, 10.0, 10.0, 9.5, 9.0, 4.0, 1.0]
B_TWO = [False, True, True, True, True, True, False, False]


def _hand_l(a, f, lean):
    """The far hand's torso-space position for WORLD arm angles."""
    ta, tf = math.radians(a - lean), math.radians(f - lean)
    ex = R.SH[0] + R.UPPER * math.cos(ta)
    ez = R.SH[1] + R.UPPER * math.sin(ta)
    return ex + R.LOWER * math.cos(tf), ez + R.LOWER * math.sin(tf)


def _b_pose(i):
    if i in (0, 9, 10):
        return _attack_pose(i)
    k = i - 1
    t = B_LEAN[k]
    d = B_DROP[k]
    pose = merge({"torso": {"r": t, "rz": [2, 2, 2, 2, 2, 2, 0, 0][k]}},
                 pistol(B_PA[k], B_PF[k], B_PW[k], lean=t), {
        "head": {"r": [-2, -8, -8, -8, 4, 0, 4, 0][k] - 0.3 * t, "x": 1.2 if k in (1, 2, 3) else 0.0},
        "hat": {"r": [0, 0, 0, 0, 6, -2, -3, 0][k]},
        "flash": {"show": k == 3},
        "smoke": {"show": k in (4, 5), "s": [1, 1, 1, 1, 1.0, 1.3, 1, 1][k], "z": [0, 0, 0, 0, 0, 2.0, 0, 0][k]},
        "handset": {"hide": 1 <= k <= 5},
        "handset_hang": {"show": 1 <= k <= 5, "r": [0, -14, 6, 4, -6, 3, 0, 0][k]},
    }, M.body_about((0, 0, 14), x=[0.5, 1.0, 1.0, 1.0, -2.5, -0.5, 0, 0][k],
                    q=[-0.03, -0.05, -0.05, 0.03, -0.07, 0.02, 0, 0][k]))
    if B_TWO[k]:   # the near hand cups the far one under the grip
        hx, hz = _hand_l(B_PA[k], B_PF[k], t)
        a, fo = R.ik2(R.SH, (hx - 1.6, hz - 1.8))
        pose = merge(pose, R.arm("r", a, fo))
    elif k == 0:
        pose = merge(pose, R.arm("r", -60.0, -30.0))
    else:
        pose = merge(pose, talk([0, 0, 0, 0, 0, 0, 1.0, 0.4][k]))
    pose = KM.kneel(RIG, pose, LEGS, drop=d, front=13.0 if d > 6 else 8.0)
    if k in (1, 2, 3):
        pose = merge(pose, F.expr("squeeze", "grit"), {"brow": {"z": -1.0 - (0.3 if k == 3 else 0.0)}})
    elif k == 4:
        pose = merge(pose, F.expr("o"))
    elif k in (6, 7):
        pose = merge(pose, F.expr("yell" if k == 6 else "o"), {"brow": {"z": 1.2}})
    return pose


def _attack_b():
    ov = {4: [{"kind": "burst", "joint": "gun", "point": PMUZ, "r0_lu": 6.0, "r1_lu": 10.0, "n": 5, "a0": -60.0,
               "arc": 120.0}],
          7: [{"kind": "rings", "joint": "handset", "point": (6.0, R.ARM_Y["r"] - 3.0, R.HAND_Z + 4.0),
               "radii_lu": (6.0, 10.0), "a0": -40.0, "a1": 40.0}]}
    reuse = {0: ("attack", 0), 9: ("attack", 9), 10: ("attack", 10)}
    return M.clip("attack_b", [_b_pose(i) for i in range(11)], ATTACK_MS, impact=ATTACK_IMPACT, overlays=ov,
                  reuse=reuse, extra={"holdStep": 2, "holdLoop": [2, 3]})


def _hit(k):
    def recoil(a):
        return merge(pistol(LOW[0] + 30 * a, LOW[1] + 40 * a, LOW[2] + 40 * a) if a > 0 else {},
                     {"head": {"r": 16 * a}, "torso": {"r": 12 * a},
                      "thigh_r": {"r": 22 * max(a, 0)}, "shin_r": {"r": -26 * max(a, 0)},
                      "hat": {"z": 3.0 * max(a, 0), "r": 10 * a}, "brow": {"z": 1.6 * max(a, 0)}})
    base = merge({"torso": {"r": -2.0}}, talk()) if M.HIT_AMT[k] > 0 else STANCE
    return M.hit_light(k, base, recoil, face_hurt=F.expr("squeeze", "grit"),
                       face_back=F.expr("grit") if k == 2 else None)


def _die(k):
    sit = K.d3_sit(k)
    pose = merge({"torso": {"r": -2.0}}, M.die_d3(k, center_z=28.0, height=HEIGHT_LU), sit)
    if k < 3:
        pose = merge(pose, talk(-2.0), pistol(40.0, 80.0, 120.0))
    else:
        # the handset drops onto its cord, the pistol hand flops into his lap
        pose = merge(pose, R.arm("r", -60.0, -40.0), pistol(-70.0 + 40.0, -80.0 + 40.0, -60.0 + 40.0))
        pose["handset"] = {"hide": True}
        pose["handset_hang"] = {"show": True, "r": [0, 0, 0, -20, 10, -6, 3, 0, 0, 0][k]}
        pose["ant1"] = {"r": [0, 0, 0, 20, -10, 14, 10, 12, 12, 12][k]}
    pose["hat"] = {"r": [0, 6, -8, 10, 18, 14, 16, 16, 16, 16][k], "z": [0, 1, 2, 1, 0, 0, 0, 0, 0, 0][k]}
    if k == 0:
        pose = merge(pose, F.expr("squeeze", "o"))
    elif k < 4:
        pose = merge(pose, F.expr("o"), {"brow": {"z": 2.0}})
    else:
        pose = merge(pose, F.expr("spiral", "tongue"))
    return pose


def clips():
    cl = [
        M.clip("idle", [_idle(f) for f in range(6)], [153, 154, 153, 153, 154, 153], loop=True),
        M.walk_clip("walk", RIG, _walk, GAIT, "biped"),
        _attack_clip(),
        _attack_b(),
        M.clip("hit", [_hit(k) for k in range(5)], M.HIT_MS),
        M.clip("die", [_die(k) for k in (0, 1, 2, 3, 4, 5, 6, 8)], M.DIE_MS,
               sequence=[0, 1, 2, 3, 4, 5, 6, 6, 7, 7], extra=M.die_meta(HEIGHT_LU)),
    ]
    return M.check_variants(M.check_contract(cl, attack_ms=790, attack_impact_at=0.3684))
