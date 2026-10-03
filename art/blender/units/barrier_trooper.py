"""Barrier Trooper: Future Age common infantry, Guard (CONTENT_PLAN 5.7). Hardlight shield and plasma blade,
~70 lu.

Look (A11, Future palette): a broad trooper in glossy white armour over a charcoal suit, the Pulse Trooper
helmet with a team cap and a dark visor (mint eyes that act), a team chest plate with the hex, big team
shoulder pads and team shin guards. On the far forearm a white emitter bracer projects a tall hardlight
shield: a mint glowing pane between a white top and bottom emitter bar, with a team stripe on each bar.
In the near hand a short plasma blade (a white guard, a mint blade).

"A viewer expects a riot trooper: hunker behind the shield, shove with it, then stab over the rim."

Animation (ANIM_SPEC G1 stomp jog at card 70 x 1.25 = 87.5 lu/s, appendix B shield infantry):
  idle      behind the shield, the pane flickers, the blade lowered, a blink
  walk      walk v3 jog with the shield carried forward on the forearm, the blade low behind the hip
  attack    SHIELD PULSE BASH: pulls the shield back to the chest and hunkers (the held extreme), then rams
            it forward with a ring pulse at the pane (a thrust with the shield)
  attack_b  STAB OVER THE RIM: the blade raised high and back behind the head (the held extreme), then a
            downward stab over the top of the shield (an overhead hit)
  attack_c  GUARD AND CUT: crouched behind the shield with the blade cocked low behind the hip (the held
            extreme), then a rising slash out from under the shield (a rising hit)
  hit       armoured: a dip behind the raised shield, the helmet clanks down, eyes > <
  die       D2 plank topple onto the back, the shield pane flickers out, X eyes
"""
from ageborn_art import kit_future as KF
from ageborn_art import kit_future_wave as W
from ageborn_art import kit_industrial as KI
from ageborn_art import kit_medieval as K
from ageborn_art import moves as M
from ageborn_art import rigs_future as F
from ageborn_art.anim import merge
from ageborn_art.geometry import Geo

SLUG = "barrier_trooper"
GAIT_NAME = "biped"
NAME = "Barrier Trooper"
HEIGHT_LU = 70
CANVAS = (300, 256)
FEET = (130, 222)
ANCHORS = {"head": (2, 68), "hitCenter": (0, 32)}
NO_RETIME = True

HR = (0.0, F.ARM_Y["r"], F.HAND_Z)
HL = (0.0, F.ARM_Y["l"], F.HAND_Z)
BLADE = 20.0
TIP = (HR[0], HR[1] - 0.6, HR[2] + 5.5 + BLADE)
MID = (HR[0], HR[1] - 0.6, HR[2] + 5.5 + BLADE * 0.45)
PANE = (HL[0] + 6.0, HL[1] - 8.0, HL[2] + 4.0)      # the shield pane centre, far hand space at rest


RIG = None


def build(rig):
    global RIG
    RIG = rig
    W.trooper(rig, helmet_kind="dome", team_greave=True, bulk=1.06)
    rig.joint("shield", "hand_l", HL)
    px, py, pz = PANE
    import math
    YAW = -55.0         # the pane turned toward the camera so its face reads (the Photon Knight buckler does -42)
    ca, sa = math.cos(math.radians(YAW)), math.sin(math.radians(YAW))

    def at(u, v, z):
        """u along the pane normal (forward), v across the pane (toward the far side), z up."""
        return (px + u * ca - v * sa, py + u * sa + v * ca, pz + z)
    rot = (0, 0, YAW)
    # emitter bracer on the forearm and two emitter bars with team stripes
    g = Geo().blob((HL[0] + 1.0, HL[1] - 2.5, HL[2] + 3.0), (3.2, 2.2, 5.0), p=2.6)
    rig.part("shield", g, F.ARMOR, finish="gloss", outline_hex=F.TRIM)
    for dz in (-17.0, 17.0):
        g = Geo().blob(at(0, 0, dz), (2.6, 11.4, 2.0), p=2.8, rot=rot)
        rig.part("shield", g, F.ARMOR, finish="gloss", outline_hex=F.TRIM)
        g = Geo().blob(at(1.6, 0, dz), (1.4, 8.0, 1.4), p=2.8, rot=rot)
        rig.part("shield", g, team=True, outline=0.4)
    g = Geo().capsule(at(0, -10.6, -17.0), at(0, -10.6, 17.0), 1.1)       # side rails
    g.capsule(at(0, 10.6, -17.0), at(0, 10.6, 17.0), 1.1)
    rig.part("shield", g, F.TRIM, finish="metal", outline=0.6)
    # the hardlight pane: a mint glow with a pale core band
    g = Geo().blob(at(0, 0, 0), (1.2, 10.4, 15.8), p=4.0, rot=rot)
    rig.part("shield", g, glow=W.HOLO, outline=1.0, outline_hex=W.HOLO_DK)
    g = Geo().blob(at(0.6, -2.0, 4.0), (0.8, 6.0, 7.0), p=3.0, rot=rot)
    rig.part("shield", g, glow=W.MINT_CORE, outline=0)
    rig.joint("pulse", "shield", (px + 2.0, py, pz), hidden=True)
    g = Geo().blob(at(1.8, 0, 0), (1.0, 12.4, 18.0), p=4.0, rot=rot)
    rig.part("pulse", g, glow=W.MINT_CORE, outline=1.2, outline_hex=W.MINT)
    rig.joint("pane_out", "shield", (px, py, pz), hidden=True)      # the die flicker: only the bars stay
    # the plasma blade
    rig.joint("blade", "hand_r", HR)
    hx, hy, hz = HR
    g = Geo().capsule((hx, hy, hz - 3.6), (hx, hy, hz + 3.8), 1.7)
    rig.part("blade", g, F.SUIT, outline=0.8)
    g = Geo().blob((hx, hy, hz + 4.6), (5.0, 2.6, 1.6), p=2.6)
    rig.part("blade", g, F.ARMOR, finish="gloss", outline_hex=F.TRIM)
    g = Geo().blob((hx, hy - 0.6, hz + 5.5 + BLADE / 2), (3.0, 1.4, BLADE / 2 + 0.4), p=2.3, taper=(1.0, 0.45))
    rig.part("blade", g, glow=W.MINT, outline=1.0, outline_hex=W.MINT)
    g = Geo().blob((hx + 0.2, hy - 1.4, hz + 5.0 + BLADE / 2), (1.2, 0.8, BLADE / 2 - 1.5), p=2.3, taper=(1.0, 0.35))
    rig.part("blade", g, glow=W.MINT_CORE, outline=0)
    rig.track("clubHead", "blade", TIP)


def arms(blade_hand, bw, shield_hand, sw=90.0):
    a, f = F.ik2(F.SH, blade_hand)
    la, lf = F.ik2(F.SH, shield_hand)
    return merge(F.arm("r", a, f, bw, 90.0), F.arm("l", la, lf, sw, 90.0))


GUARD = ((4.0, 22.0), -60.0, (9.0, 27.0))
STANCE = merge(arms(*GUARD), {"torso": {"r": -3.0}})


def _idle(f):
    def extra(ctx):
        return arms((4.0, 22.0 + 0.6 * ctx["lag"]), -60.0 + 4 * ctx["lag"], (9.0, 27.0 + 0.6 * ctx["c"]))
    pose = M.idle_v2(f, {"torso": {"r": -3.0}}, frames=6, extra=extra, blink=4, face_blink=KF.glyph("g_blink"))
    if f in (1, 4):
        pose["pulse"] = {"show": True}
    return KI.ground_feet(RIG, pose, LEGS)


SPEED = 87.5
LEGS = KF.legs_ik()
GAIT = KF.jog_gait(LEGS, SPEED, cycle_ms=616)


def _walk(f, report=None):
    def extra(ctx):
        lag = ctx["bob_lag"] / max(ctx["amp"], 1e-3)
        return arms((-2.0, 21.0 + 0.6 * lag), -120.0 + 6 * lag, (8.0, 28.0 + 1.0 * lag))
    return M.walk_v3(RIG, f, {"torso": {"r": -3.0}}, GAIT, legs=LEGS, lean=-8.0, twist=5.0, nod=3.0,
                     extra=extra, report=report)


def _pose(bh, bw, sh, t, rz, x, z, q, k, sw=90.0, pulse=False):
    pose = merge(arms(bh, bw, sh, sw), {"torso": {"r": t, "rz": rz}, "head": {"r": -0.4 * t, "rz": -0.4 * rz}},
                 M.body_about((0, 0, 22), x=x, z=z, q=q))
    pose = KI.ground_feet(RIG, pose, LEGS)
    if pulse:
        pose["pulse"] = {"show": True}
    g = "g_angry" if k in (1, 2, 3, 6, 7) else ("g_squint" if k in (4, 5) else "eyes")
    return merge(pose, KF.glyph(g))


#      read     hunker   pull     HOLD     smear    smear    IMP      over     recoil   settle    (A: shield bash)
A_S = [(9, 27), (6, 28), (3, 29), (1, 29), (8, 29), (15, 29), (19, 29), (18, 29), (13, 28), (9, 27)]
A_T = [-3, -8, -12, -14, -18, -22, -26, -24, -12, -3]
A_X = [0.0, -1.0, -2.0, -3.0, 2.0, 7.0, 10.0, 10.0, 5.0, 0.5]
A_Z = [0.0, -2.0, -3.5, -4.5, -4.0, -4.0, -4.0, -3.0, -1.5, 0.0]
A_Q = [0.0, -0.04, -0.06, -0.08, 0.03, 0.05, -0.12, -0.05, -0.02, 0.0]


def _a_pose(f):
    return _pose((4.0, 22.0), -60.0, A_S[f], A_T[f], 0.0, A_X[f], A_Z[f], A_Q[f], f, pulse=f in (6, 7))


#      read     raise    cock     HOLD     smear    smear    IMP      over     recoil   settle    (B: stab over the rim)
B_H = [(4, 22), (4, 36), (0, 44), (-3, 46), (6, 46), (12, 42), (15, 36), (15, 35), (10, 28), (4, 22)]
B_W = [-60, 60, 150, 160, 40, -20, -40, -44, -60, -60]
B_T = [-3, 2, 6, 8, -4, -12, -18, -16, -8, -3]
B_X = [0.0, -0.5, -1.5, -2.0, 1.0, 4.0, 6.0, 6.0, 3.0, 0.5]
B_Z = [0.0, 1.0, 1.5, 2.0, 0.5, -1.5, -3.0, -2.5, -1.0, 0.0]
B_Q = [0.0, 0.03, 0.05, 0.07, 0.02, -0.04, -0.12, -0.05, -0.02, 0.0]


def _b_pose(f):
    if f in (0, 9):
        return _a_pose(f)
    return _pose(B_H[f], B_W[f], (10.0, 27.0), B_T[f], 0.0, B_X[f], B_Z[f], B_Q[f], f)


#      read     crouch   cock     HOLD     smear    smear    IMP      over     recoil   settle    (C: rising cut)
C_H = [(4, 22), (-2, 18), (-6, 16), (-8, 15), (4, 17), (12, 26), (15, 34), (14, 36), (9, 28), (4, 22)]
C_W = [-60, -130, -160, -170, -60, 10, 50, 60, 0, -60]
C_T = [-3, -12, -18, -22, -16, -6, 2, 2, -4, -3]
C_RZ = [0, 10, 20, 26, 8, -10, -20, -18, -8, 0]
C_X = [0.0, -1.0, -2.0, -2.5, 1.5, 4.5, 6.0, 6.0, 3.0, 0.5]
C_Z = [0.0, -4.0, -6.5, -7.5, -6.0, -2.0, 0.5, 0.5, -0.5, 0.0]
C_Q = [0.0, -0.05, -0.08, -0.10, -0.02, 0.05, 0.10, 0.04, -0.02, 0.0]


def _c_pose(f):
    if f in (0, 9):
        return _a_pose(f)
    return _pose(C_H[f], C_W[f], (10.0, 25.0), C_T[f], C_RZ[f], C_X[f], C_Z[f], C_Q[f], f)


BASH = {"kind": "streak", "joint": "shield", "point": (PANE[0] + 2.0, PANE[1], PANE[2]), "color": W.MINT,
        "width_lu": 14.0, "white": 0.4}
CUT = {"kind": "arc", "joint": "blade", "inner": MID, "outer": TIP, "color": W.MINT, "taper": 0.15, "white": 0.35,
       "t0": 0.0, "t1": 0.95, "lines": 3, "samples": 16}


def _bash_fx():
    return [{"kind": "rings", "joint": "shield", "point": (PANE[0] + 3.0, PANE[1], PANE[2]), "radii_lu": (9.0, 15.0),
             "a0": -70.0, "a1": 70.0, "color": W.MINT_CORE},
            {"kind": "dust", "ground": (20.0, 0.0), "size_lu": 5.0, "puffs": 3, "seed": 131, "spread": 0.9,
             "color": W.DUST}]


def _hit(k):
    def recoil(a):
        up = max(a, 0)
        return merge(arms((4.0, 22.0 + 2 * up), -60.0 + 20 * up, (9.0 - 2 * up, 27.0 + 6 * up)),
                     {"torso": {"r": 10 * a}, "head": {"r": 8 * a}})
    return K.hit_armoured(k, {"torso": {"r": -3.0}}, recoil, face_hurt=KF.glyph("g_hurt"),
                          face_back=KF.glyph("g_angry"), helm="head", clank=1.6)


def _die(k):
    def extra(k, flail, stiff):
        p = {"shield": {"r": 20 * flail}}
        if k >= 3:
            p["pulse"] = {"show": k == 3}
        return p
    pose = W.die_d2(k, STANCE, extra=extra)
    if k >= 5:
        # the pane flickers out: shrink it to the emitter bars' gap
        pose.setdefault("shield", {})["sx"] = 0.6
    return pose


def clips():
    rr = {0: ("attack", 0), 9: ("attack", 9)}
    cl = [
        M.clip("idle", [_idle(f) for f in range(6)], [153, 154, 153, 153, 154, 153], loop=True),
        M.walk_clip("walk", RIG, _walk, GAIT, "biped"),
        W.melee_clip("attack", _a_pose, BASH, _bash_fx()),
        W.melee_clip("attack_b", _b_pose, CUT, W.impact_fx("blade", TIP, 132, a0=-120.0, ground_x=22.0), rr),
        W.melee_clip("attack_c", _c_pose, CUT, W.impact_fx("blade", TIP, 133, a0=-20.0, ground_x=22.0), rr),
        M.clip("hit", [_hit(k) for k in range(5)], M.HIT_MS),
        M.clip("die", [_die(k) for k in (0, 1, 2, 3, 4, 5, 6, 8)], M.DIE_MS,
               sequence=[0, 1, 2, 3, 4, 5, 6, 6, 7, 7], extra=M.die_meta(HEIGHT_LU)),
    ]
    return M.check_variants(M.check_contract(cl))
