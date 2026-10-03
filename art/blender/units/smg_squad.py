"""SMG Squad: Modern Age common ranged, Trio (CONTENT_PLAN 5.6). One trooper of the three; bullets, 170 lu, ~66 lu.

Look (A11, Modern palette): a young, wide-eyed trooper in a team-covered round helmet (khaki netting), a
team tunic with team sleeves and one cream chevron, khaki magazine pouches strapped across his chest and a
canteen, olive trousers and puttees. He carries a stubby submachine gun: a short wooden stock, a perforated
barrel shroud and a long straight magazine sticking out of the side. The squad plays three of this sheet,
each on its own phase, so the three read as a loose file.

"A viewer expects short hip bursts with casings flying, and a quick jog in a loose file."

Animation (ANIM_SPEC G1 jog at card 65 x 1.25 = 81.25 lu/s, appendix B guns):
  idle      the gun at the ready across his chest, he checks the magazine and glances round, blink
  walk      walk v3 bounce jog, the gun at port across his chest, the helmet and pouches lagging
  attack    HIP BURST: he leans in with the gun low at the hip (the held extreme), a burst flash,
            the muzzle climbs, three brass casings spray out
  attack_b  KNEELING BURST: he drops to one knee with the stock at his shoulder and squints along it
            (the held extreme), fires, rides the kick and stays low
  hit       light: the head snaps back, the helmet lifts, eyes squeezed
  die       D1 fling and spin: the helmet pops off and the gun flies; X eyes and tongue
"""
from ageborn_art import face as F
from ageborn_art import kit_industrial as KI
from ageborn_art import kit_modern as KM
from ageborn_art import kit_modern_wave as W
from ageborn_art import moves as M
from ageborn_art import rigs_modern as R
from ageborn_art.anim import merge
from ageborn_art.geometry import Geo

SLUG = "smg_squad"
GAIT_NAME = "biped"
NAME = "SMG Squad"
HEIGHT_LU = 66
CANVAS = (300, 262)
FEET = (120, 232)
ANCHORS = {"head": (2, 65), "hitCenter": (0, 32), "muzzle": (40, 30)}
NO_RETIME = True

G0 = (4.0, -15.0, 25.0)
FORE = 9.0
LENGTH = 25.0
MUZ = (G0[0] + LENGTH + 0.8, G0[1], G0[2] + 1.6)
BRASS = "#C8B27A"


def _smg(rig, joint):
    gx, gy, gz = G0
    g = Geo().blob((gx - 7.0, gy, gz - 1.4), (6.0, 2.0, 3.0), p=2.8, rot=(0, 14, 0), taper=(1.0, 0.8))
    g.blob((gx + 0.6, gy, gz - 3.0), (1.6, 1.6, 3.0), p=2.4, rot=(0, -14, 0))       # pistol grip
    rig.part(joint, g, R.WOOD)
    g = Geo().capsule((gx - 1.0, gy, gz + 1.4), (gx + 12.0, gy, gz + 1.4), 2.2, 2.2)  # receiver
    rig.part(joint, g, R.GUNMETAL, finish="metal", outline=0.9)
    shroud = Geo().capsule((gx + 11.0, gy, gz + 1.6), (gx + LENGTH, gy, gz + 1.6), 1.8, 1.6)
    sface = F.Face(rig, joint, [shroud])
    rig.part(joint, shroud, R.GUNMETAL, finish="metal", outline=0.8)
    g = Geo()
    for i in range(4):                                                               # cooling holes
        c = sface.hit(gx + 13.5 + 3.0 * i, gz + 1.6)
        sface.decal(g, c, F.ellipse(0, 0, 0.7, 0.7, 8), 0.3)
    rig.part(joint, g, "#1E1C1C", outline=0, highlight=False)
    g = Geo().blob((gx + 7.0, gy - 2.6, gz - 1.0), (1.5, 1.2, 5.2), p=3.0, rot=(0, -6, 0))   # magazine
    rig.part(joint, g, R.GUNMETAL, finish="metal", outline=0.7)


RIG = None


def build(rig):
    global RIG
    RIG = rig
    W.trooper(rig, hat="round", brow_angry=False, mouth_w=5.2, chevrons=1)
    g = Geo().capsule((7.6, -10.0, 33.0), (6.0, -8.0, 21.0), 1.4)                     # chest strap
    rig.part("torso", g, R.KHAKI, outline=0.5)
    KM.pouches(rig, "torso", [(10.4, -4.4, 26.6), (10.2, -0.2, 26.6), (10.0, 4.0, 26.6)], size=(1.6, 1.6, 3.2))
    KM.canteen(rig, "torso", (-8.4, -9.6, 16.4), r=3.0)
    rig.joint("gun", "torso", G0)
    _smg(rig, "gun")
    rig.track("muzzle", "gun", MUZ)
    KI.loose(rig, "gun_loose", G0, lambda j: _smg(rig, j))
    R.muzzle_flash(rig, "gun", MUZ, size=1.5)
    rig.joint("casing", "root", (G0[0] + 6, G0[1] - 3, G0[2] + 6), hidden=True)
    g = Geo()
    for dx, dz in ((0.0, 0.0), (-3.0, 3.0), (-6.0, 0.8)):
        g.capsule((G0[0] + 5.0 + dx, G0[1] - 3.5, G0[2] + 6.0 + dz), (G0[0] + 7.4 + dx, G0[1] - 3.5, G0[2] + 7.2 + dz), 0.9)
    rig.part("casing", g, BRASS, finish="metal", outline=0.4)


def hold(gx, gz, deg):
    return R.hold2("gun", G0, FORE, gx, gz, deg)


PORT = (5.0, 26.0, 30.0)
STANCE = merge(hold(*PORT), {"torso": {"r": -3.0}})


def _idle(f):
    look = [0.0, 0.0, 0.5, 1.0, 0.5, 0.0][f]
    check = [0.0, 0.6, 1.0, 0.4, 0.0, 0.0][f]

    def extra(ctx):
        return merge(hold(PORT[0] + 1.0 * check, PORT[1] + 0.5 * ctx["lag"], PORT[2] - 22 * check + 2 * ctx["lag"]),
                     {"head": {"r": -8 * check, "rz": 26 * look}, "pupils": {"z": -0.8 * check, "y": 0.8 * look}})
    pose = M.idle_v2(f, {"torso": {"r": -3.0}}, frames=6, extra=extra, face_blink=F.expr("blink"), blink=4)
    return KM.ground_feet(RIG, pose, LEGS)


SPEED = 81.25
LEGS = KM.legs_ik()
GAIT = KM.jog_gait(LEGS, SPEED, cycle_ms=616)
WALK_PORT = (5.0, 27.0, 44.0)


def _walk(f, report=None):
    def extra(ctx):
        lag = ctx["bob_lag"] / max(ctx["amp"], 1e-3)
        return merge(hold(WALK_PORT[0], WALK_PORT[1] + 0.9 * lag, WALK_PORT[2] - 4.0 * lag), {"hat": {"r": -1.5 * lag}})
    return M.walk_v3(RIG, f, {"torso": {"r": -2.0}}, GAIT, legs=LEGS, lean=-9.0, twist=7.0, nod=3.0, extra=extra,
                     report=report)


# 8 unique frames in 520 ms; the burst on frame 3 at 250 ms (impactAt 0.4808)
ATTACK_MS = [40, 60, 150, 50, 50, 50, 60, 60]
ATTACK_IMPACT = 3
#        raise brace HOLD  FIRE  climb climb settle settle
A_GX = [5.0, 6.0, 6.5, 6.5, 5.5, 5.0, 5.0, 5.0]
A_GZ = [25.0, 23.0, 22.0, 22.0, 23.0, 23.5, 24.5, 25.5]
A_DEG = [12.0, 0.0, -2.0, -2.0, 10.0, 6.0, 14.0, 26.0]
A_T = [-5, -12, -16, -16, -10, -12, -8, -4]
A_X = [0.0, 0.5, 1.0, 1.0, -1.5, -0.5, 0.0, 0.0]
A_Q = [0.0, -0.03, -0.05, 0.04, -0.06, -0.02, 0.0, 0.0]


def _a_pose(f):
    t = A_T[f]
    pose = merge(hold(A_GX[f], A_GZ[f], A_DEG[f] - t), {
        "torso": {"r": t}, "head": {"r": -0.4 * t + [0, -2, -4, -4, 4, 2, 0, 0][f]},
        "hat": {"r": [0, 0, 0, 0, 5, 2, 0, 0][f], "z": [0, 0, 0, 0, 0.8, 0.3, 0, 0][f]},
        "thigh_r": {"r": [4, 14, 18, 18, 14, 12, 8, 4][f]}, "shin_r": {"r": [0, -8, -12, -12, -10, -8, -4, 0][f]},
        "thigh_l": {"r": [-4, -14, -18, -18, -16, -14, -10, -4][f]},
        "flash": {"show": f == 3},
    }, M.body_about((0, 0, 22), x=A_X[f], q=A_Q[f]))
    if f in (4, 5):
        pose["casing"] = {"show": True, "x": [0, 0, 0, 0, -2, -6, 0, 0][f], "z": [0, 0, 0, 0, 3, 5, 0, 0][f],
                          "r": [0, 0, 0, 0, 80, 200, 0, 0][f]}
    if f in (1, 2):
        pose = merge(pose, F.expr("grit"), {"brow": {"z": -1.0}})
    elif f in (3, 4):
        pose = merge(pose, F.expr("squeeze", "yell"))
    return KM.ground_feet(RIG, pose, LEGS)


def _burst(point):
    return [{"kind": "burst", "joint": "gun", "point": point, "r0_lu": 6.0, "r1_lu": 11.0, "n": 5, "a0": -60.0,
             "arc": 120.0}]


def _attack_clip():
    return M.clip("attack", [_a_pose(f) for f in range(8)], ATTACK_MS, impact=ATTACK_IMPACT, overlays={3: _burst(MUZ)},
                  extra={"holdStep": 2})


#        drop  HOLD  FIRE  kick  kick  low       (B: kneeling burst; 0 and 7 = A's)
KB_DROP = [9.0, 14.0, 14.0, 13.5, 14.0, 12.0]
KB_GX = [6.0, 7.0, 7.0, 5.5, 6.0, 6.0]
KB_GZ = [31.0, 33.5, 33.5, 35.0, 34.0, 32.0]
KB_DEG = [6.0, 2.0, 2.0, 14.0, 8.0, 14.0]
KB_T = [-6, -8, -8, 0, -4, -4]
KB_Q = [-0.04, -0.06, 0.03, -0.08, -0.02, 0.0]


def _b_pose(i):
    if i in (0, 7):
        return _a_pose(i)
    k = i - 1
    t = KB_T[k]
    pose = merge(hold(KB_GX[k], KB_GZ[k], KB_DEG[k] - t), {
        "torso": {"r": t}, "head": {"r": -0.3 * t + [-4, -6, -6, 6, 0, 0][k], "x": 1.4 if k in (1, 2) else 0.0,
                                     "z": -1.2 if k in (1, 2) else 0.0},
        "hat": {"r": [0, 0, 0, 7, 2, 0][k]}, "flash": {"show": k == 2},
    }, M.body_about((0, 0, 22), x=[0.5, 1.0, 1.0, -2.0, -1.0, 0.0][k], q=KB_Q[k]))
    if k in (3, 4):
        pose["casing"] = {"show": True, "x": [0, 0, 0, -2, -6, 0][k], "z": [0, 0, 0, 3 - KB_DROP[k], 5 - KB_DROP[k], 0][k],
                          "r": [0, 0, 0, 80, 200, 0][k]}
    pose = KM.kneel(RIG, pose, LEGS, drop=KB_DROP[k], front=12.0)
    if k in (0, 1):
        pose = merge(pose, F.expr("squeeze"), {"brow": {"z": -1.0}})
    elif k in (2, 3):
        pose = merge(pose, F.expr("squeeze", "yell"))
    return pose


def _attack_b():
    ov = {3: _burst(MUZ) + [{"kind": "dust", "ground": (-12.0, 0.0), "size_lu": 5.0, "puffs": 3, "seed": 81,
                             "spread": 0.7, "dir": -1.0}]}
    return M.clip("attack_b", [_b_pose(i) for i in range(8)], ATTACK_MS, impact=ATTACK_IMPACT, overlays=ov,
                  reuse={0: ("attack", 0), 7: ("attack", 7)}, extra={"holdStep": 2})


def _hit(k):
    base = {"torso": {"r": -3.0}} if M.HIT_AMT[k] > 0 else STANCE
    return W.hit_pose(k, base, lambda a: hold(PORT[0], PORT[1], PORT[2] + 16 * a) if a > 0 else {})


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
    return M.check_variants(M.check_contract(cl, attack_ms=520, attack_impact_at=0.4808))
