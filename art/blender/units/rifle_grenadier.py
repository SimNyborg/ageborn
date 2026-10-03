"""Rifle Grenadier: Modern Age common ranged, Thrower (CONTENT_PLAN 5.6). Rifle grenade (proj.rifle_grenade), 230 lu, ~68 lu.

Look (A11, Modern palette): a calm, moustached veteran in a Brodie helmet (team band, netting), a team tunic
with team sleeves and cream chevrons, a khaki grenade bag on his hip with two finned rifle grenades poking
out, olive trousers and puttees. His long rifle carries a cup launcher on the muzzle with a finned grenade
seated in it.

"A viewer expects him to plant the rifle butt on the ground at an angle and fire the grenade up in an arc
(thoomp), and to march with the rifle on his shoulder."

Animation (ANIM_SPEC G1 jog at card 65 x 1.25 = 81.25 lu/s, appendix B guns and throwers):
  idle      the rifle grounded at his side, he taps the grenade in the cup and twirls his moustache, blink
  walk      walk v3 bounce jog, the rifle sloped on his shoulder, the grenade bag bouncing
  attack    GROUNDED LOB: he drops to one knee, plants the butt on the ground and tilts the rifle up at 50
            degrees (the held extreme), THOOMP: a smoke ring, the rifle kicks into the dirt, a fresh grenade
            goes into the cup
  attack_b  STANDING HIGH SHOT: he braces standing with the rifle tucked under his arm, pointed steeply up
            (the held extreme), fires, staggers back a step from the kick
  hit       light: the head snaps back, the helmet lifts, eyes squeezed
  die       D1 fling and spin: the helmet pops off and the rifle flies; X eyes and tongue
"""
import math

from ageborn_art import face as F
from ageborn_art import kit_industrial as KI
from ageborn_art import kit_modern as KM
from ageborn_art import kit_modern_wave as W
from ageborn_art import moves as M
from ageborn_art import rigs_modern as R
from ageborn_art.anim import merge
from ageborn_art.geometry import Geo

SLUG = "rifle_grenadier"
GAIT_NAME = "biped"
NAME = "Rifle Grenadier"
HEIGHT_LU = 68
CANVAS = (320, 300)
FEET = (130, 262)
ANCHORS = {"head": (2, 67), "hitCenter": (0, 32), "muzzle": (40, 50)}
NO_RETIME = True

G0 = (4.0, -15.0, 27.0)
FORE = 13.0
LENGTH = 44.0
CUP_X = G0[0] + LENGTH
MUZ = (CUP_X + 6.0, G0[1], G0[2] + 1.8)
OLIVE_DK = "#4E5238"


def _nade(rig, joint, at, k=1.0):
    x, y, z = at
    g = Geo().blob((x, y, z), (3.2 * k, 2.0 * k, 2.0 * k), p=2.2)
    rig.part(joint, g, R.OLIVE, finish="gloss", outline=0.5)
    g = Geo().capsule((x - 2.6 * k, y, z), (x - 6.0 * k, y, z), 0.9 * k)
    for dz in (-1.6, 1.6):
        g.blob((x - 5.6 * k, y, z + dz * k), (1.3 * k, 0.4 * k, 1.0 * k), p=2.2)
    rig.part(joint, g, R.GUNMETAL, finish="metal", outline=0.4)
    g = Geo().blob((x + 2.6 * k, y, z), (0.9 * k, 1.6 * k, 1.6 * k), p=2.2)
    rig.part(joint, g, KM.CREAM, outline=0.3)


def _rifle(rig, joint, nade=True):
    gx, gy, gz = G0
    g = Geo()
    g.blob((gx - 8.0, gy, gz - 2.2), (8.0, 2.2, 3.6), p=2.8, rot=(0, 16, 0), taper=(1.0, 0.75))
    g.capsule((gx - 1.0, gy, gz), (gx + LENGTH * 0.66, gy, gz + 0.6), 2.0, 1.6)
    rig.part(joint, g, R.WOOD)
    g = Geo().capsule((gx + 2.0, gy, gz + 1.8), (CUP_X, gy, gz + 1.8), 1.3, 1.15)
    g.blob((gx + 3.5, gy, gz + 2.6), (5.0, 1.8, 1.8), p=3.0)
    rig.part(joint, g, R.GUNMETAL, finish="metal", outline=0.9)
    g = Geo().lathe([(1.4, 0), (2.8, 1.0), (3.0, 6.0), (2.6, 6.4)], (CUP_X - 0.5, gy, gz + 1.8), (CUP_X + 6.0, gy, gz + 1.8),
                    segs=14)                                                           # cup launcher
    rig.part(joint, g, OLIVE_DK, finish="metal", outline=0.7)
    if nade:
        _nade(rig, joint, (CUP_X + 6.5, gy, gz + 1.8), k=0.9)


RIG = None


def build(rig):
    global RIG
    RIG = rig
    face = W.trooper(rig, hat="brodie", brow_angry=False, mouth_w=5.6)
    g = Geo().blob((12.0, -1.0, 40.2), (2.0, 6.4, 1.4), p=2.2, rot=(0, -10, 0))        # moustache
    rig.part("head", g, R.HAIR, finish="hair", outline=0.5)
    del face
    # grenade bag on the near hip with two grenades poking out
    g = Geo().blob((2.0, -11.4, 15.0), (5.0, 2.6, 4.4), p=3.0)
    rig.part("torso", g, R.KHAKI, outline=0.6)
    g = Geo().blob((2.0, -12.2, 18.0), (5.4, 2.2, 2.0), p=3.0)          # team flap
    rig.part("torso", g, team=True, outline=0.4)
    _nade(rig, "torso", (0.0, -11.6, 21.0), k=0.8)
    _nade(rig, "torso", (4.4, -11.8, 20.4), k=0.8)
    rig.joint("gun", "torso", G0)
    _rifle(rig, "gun")
    rig.track("muzzle", "gun", MUZ)
    rig.joint("cup_nade", "gun", (CUP_X + 6.5, G0[1], G0[2] + 1.8))
    KI.loose(rig, "gun_loose", G0, lambda j: _rifle(rig, j, nade=False))
    R.muzzle_flash(rig, "gun", MUZ, size=1.6)
    rig.joint("ring", "gun", MUZ, hidden=True)                                           # smoke ring
    g = Geo().lathe([(4.0, -1.0), (5.6, 0), (4.0, 1.0), (3.2, 0)], (MUZ[0] + 4.0, G0[1], MUZ[2]),
                    (MUZ[0] + 5.0, G0[1], MUZ[2]), segs=18)
    g.sphere((MUZ[0] + 9.0, G0[1] - 1, MUZ[2] + 2.0), 2.6, cuts=3)
    rig.part("ring", g, R.SMOKE, finish="dust", outline=0.6)


def hold(gx, gz, deg):
    return R.hold2("gun", G0, FORE, gx, gz, deg)


REST = (3.0, 20.0, 78.0)     # the rifle grounded upright at his side
STANCE = merge(hold(*REST), {"torso": {"r": -2.0}})


def _idle(f):
    tap = [0.0, 0.0, 0.0, 1.0, 0.4, 0.0][f]
    twirl = [0.0, 0.6, 1.0, 0.0, 0.0, 0.0][f]

    def extra(ctx):
        p = hold(REST[0], REST[1] + 0.4 * ctx["lag"], REST[2] - 2 * tap)
        a, fo = R.ik2(R.SH, (9.0 + 1.0 * twirl, 30.0 + 6.0 * twirl))
        p = merge(p, R.arm("l", a, fo)) if twirl > 0 else p
        return merge(p, {"head": {"r": -4 * twirl + 3 * tap}})
    pose = M.idle_v2(f, {"torso": {"r": -2.0}}, frames=6, extra=extra, face_blink=F.expr("blink"), blink=4)
    return KM.ground_feet(RIG, pose, LEGS)


SPEED = 81.25
LEGS = KM.legs_ik()
GAIT = KM.jog_gait(LEGS, SPEED, cycle_ms=616)
SHOULDER = (4.0, 33.0, 132.0)    # sloped back on his shoulder


def _walk(f, report=None):
    def extra(ctx):
        lag = ctx["bob_lag"] / max(ctx["amp"], 1e-3)
        a, fo = R.ik2(R.SH, (SHOULDER[0], SHOULDER[1] + 0.8 * lag))
        p = merge(R.arm("r", a, fo), {"gun": {"x": SHOULDER[0] - G0[0], "z": SHOULDER[1] + 0.8 * lag - G0[2],
                                               "r": SHOULDER[2] - 6 * lag}})
        return merge(p, {"hat": {"r": -1.4 * lag}})
    return M.walk_v3(RIG, f, {"torso": {"r": -2.0}}, GAIT, legs=LEGS, lean=-9.0, twist=7.0, nod=3.0,
                     arms={"l": KI.ArmChain("l")}, arm=34.0, extra=extra, report=report)


# 10 unique frames in 760 ms; the shot on frame 4 at 330 ms (impactAt 0.4342)
ATTACK_MS = [40, 60, 70, 160, 60, 70, 60, 80, 80, 80]
ATTACK_IMPACT = 4
#        lower kneel plant HOLD  FIRE  kick  reload reload rise  settle      (A: grounded lob, on one knee)
A_DROP = [3.0, 9.0, 13.0, 14.0, 14.0, 13.0, 13.0, 12.0, 7.0, 2.0]
A_GX = [3.0, 5.0, 6.0, 6.5, 6.5, 5.0, 5.5, 6.0, 5.0, 3.0]
A_GZ = [22.0, 26.0, 27.0, 27.0, 27.0, 26.0, 27.0, 27.0, 25.0, 21.0]
A_DEG = [70.0, 62.0, 58.0, 56.0, 56.0, 62.0, 64.0, 64.0, 68.0, 76.0]
A_T = [-2, -8, -12, -14, -10, -6, -10, -10, -6, -2]


def _a_pose(f):
    t = A_T[f]
    pose = merge(hold(A_GX[f], A_GZ[f], A_DEG[f] - t), {
        "torso": {"r": t}, "head": {"r": -0.3 * t + [0, 0, -4, -6, 4, 2, 6, 6, 0, 0][f]},
        "hat": {"r": [0, 0, 0, 0, 6, 2, 0, 0, 0, 0][f]},
        "flash": {"show": f == 4}, "ring": {"show": f in (5, 6), "s": [1, 1, 1, 1, 1, 1.0, 1.5, 1, 1, 1][f]},
        "cup_nade": {"hide": f in (4, 5, 6)},
    }, M.body_about((0, 0, 22), x=[0, 0.5, 1, 1, -1, -0.5, 0, 0, 0, 0][f],
                    q=[0, -0.03, -0.05, -0.06, 0.05, -0.03, 0, 0, 0, 0][f]))
    if f in (6, 7):    # the near hand slides a fresh grenade into the cup
        rad = math.radians(A_DEG[f] - t)
        cx = A_GX[f] + (LENGTH + 4.0) * math.cos(rad)
        cz = A_GZ[f] + (LENGTH + 4.0) * math.sin(rad)
        a, fo = R.ik2(R.SH, (min(cx, 12.0), min(cz, 50.0)))
        pose.update(R.arm("r", a, fo))
        pose["cup_nade"] = {"show": True}
    pose = KM.kneel(RIG, pose, LEGS, drop=A_DROP[f], front=12.0)
    if f in (2, 3):
        pose = merge(pose, F.expr("squeeze"), {"brow": {"z": -1.0}})
    elif f in (4, 5):
        pose = merge(pose, F.expr("squeeze", "o"))
    return pose


def _fire_fx(seed):
    return [{"kind": "burst", "joint": "gun", "point": MUZ, "r0_lu": 7.0, "r1_lu": 12.0, "n": 5, "a0": -50.0,
             "arc": 100.0},
            {"kind": "dust", "ground": (4.0, 0.0), "size_lu": 6.0, "puffs": 4, "seed": seed, "spread": 1.0}]


def _attack_clip():
    return M.clip("attack", [_a_pose(f) for f in range(10)], ATTACK_MS, impact=ATTACK_IMPACT,
                  overlays={4: _fire_fx(91)}, extra={"holdStep": 3})


#        brace tuck  HOLD  FIRE  kick  step  reload reload       (B: standing high shot; 0, 8, 9 = A's)
B_GX = [4.0, 3.0, 2.0, 2.0, -1.0, 0.0, 1.0, 2.0]
B_GZ = [26.0, 25.0, 24.0, 24.0, 25.0, 25.0, 24.0, 23.0]
B_DEG = [40.0, 55.0, 62.0, 62.0, 70.0, 66.0, 70.0, 72.0]
B_T = [0, 6, 10, 10, 14, 8, 4, 2]
B_X = [0.0, -1.0, -1.5, -1.5, -5.0, -4.0, -2.0, -1.0]


def _b_pose(i):
    if i in (0, 8, 9):
        return _a_pose(i)
    k = i - 1
    t = B_T[k]
    pose = merge(hold(B_GX[k], B_GZ[k], B_DEG[k] - t), {
        "torso": {"r": t}, "head": {"r": -0.5 * t + [0, -4, -8, -8, 6, 2, 4, 4][k]},
        "hat": {"r": [0, 0, 0, 0, 8, 3, 0, 0][k], "z": [0, 0, 0, 0, 1.0, 0.4, 0, 0][k]},
        "flash": {"show": k == 3}, "ring": {"show": k in (4, 5), "s": [1, 1, 1, 1, 1.0, 1.5, 1, 1][k]},
        "cup_nade": {"hide": k in (3, 4, 5)},
        "thigh_r": {"r": [6, 10, 14, 14, 4, 6, 6, 4][k]}, "thigh_l": {"r": [-8, -14, -20, -20, -26, -18, -12, -8][k]},
    }, M.body_about((0, 0, 22), x=B_X[k], q=[0, -0.02, -0.04, 0.04, -0.08, -0.02, 0, 0][k]))
    pose = KM.ground_feet(RIG, pose, LEGS)
    if k in (1, 2):
        pose = merge(pose, F.expr("squeeze"), {"brow": {"z": -1.0}})
    elif k in (3, 4):
        pose = merge(pose, F.expr("squeeze", "o"))
    return pose


def _attack_b():
    return M.clip("attack_b", [_b_pose(i) for i in range(10)], ATTACK_MS, impact=ATTACK_IMPACT,
                  overlays={4: _fire_fx(92)[:1]}, reuse={0: ("attack", 0), 8: ("attack", 8), 9: ("attack", 9)},
                  extra={"holdStep": 3})


def _hit(k):
    base = {"torso": {"r": -2.0}} if M.HIT_AMT[k] > 0 else STANCE
    return W.hit_pose(k, base, lambda a: hold(REST[0], REST[1], REST[2] + 10 * a) if a > 0 else {})


def _die(k):
    return W.die_d1_pose(k, STANCE, HEIGHT_LU, prop="gun", prop_path=W.PROP_PATH)


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
    return M.check_variants(M.check_contract(cl, attack_ms=760, attack_impact_at=0.4342))
