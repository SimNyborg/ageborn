"""Holo Projector: Future Age rare support, Summoner (CONTENT_PLAN 5.7). Wrist emitter, ~68 lu.

Look (A11, Future palette): an operator in a charcoal suit with white armour, a soft charcoal cowl with a
team rim over a round dark visor (mint eyes that act), a team chest plate with the hex, team shoulder
pads, and a big backpack projector: a white housing with a team band and a mast carrying a round mint
lens that swivels. On the near forearm a white gauntlet emitter with a magenta ring fires light pulses.

"A viewer expects a hologram operator: he aims his wrist and fires a pulse, his back dish whirs and casts
light; careful, deliberate steps."

Animation (ANIM_SPEC G1 careful jog at card 65 x 1.25 = 81.25 lu/s, appendix B guns; the sim's 0.6 s
wind-up loops the charge hold):
  idle      adjusts the lens mast over his shoulder (it flickers), a blink
  walk      walk v3 jog, careful and upright, the mast bobbing a frame late
  attack    WRIST PULSE: extends the near arm palm-out, the emitter rings charge (the held extreme,
            looping), a light pulse snaps from the palm, the arm kicks up
  attack_b  DISH CAST: the back mast swings forward over the shoulder, he crouches and steadies it with
            both hands (the held extreme), the lens fires the pulse
  hit       light: the head snaps back, eyes > <
  die       D1 fling and spin, the lens mast snaps off, X eyes
"""
from ageborn_art import kit_future as KF
from ageborn_art import kit_future_wave as W
from ageborn_art import kit_industrial as KI
from ageborn_art import moves as M
from ageborn_art import rigs_future as F
from ageborn_art.anim import merge
from ageborn_art.geometry import Geo

SLUG = "holo_projector"
GAIT_NAME = "biped"
NAME = "Holo Projector"
HEIGHT_LU = 68
CANVAS = (300, 330)
FEET = (130, 290)
ANCHORS = {"head": (2, 66), "hitCenter": (0, 31), "muzzle": (26, 30)}
NO_RETIME = True

HR = (0.0, F.ARM_Y["r"], F.HAND_Z)
PALM = (HR[0] + 1.5, HR[1] - 1.0, HR[2] - 4.5)          # the emitter on the near hand (arm hangs down at rest)
MAST0 = (-12.0, -9.0, 44.0)                               # the mast pivot on the backpack (torso space)
LENS = (-12.0, -10.0, 76.0)


RIG = None


def build(rig):
    global RIG
    RIG = rig
    W.trooper(rig, helmet_kind="hood", team_greave=True, team_thigh=True, team_sleeve=True, pack=True)
    g = Geo().blob((0.4, 0, 21.8), (10.6, 10.6, 2.6), p=3.4)      # a team sash belt
    rig.part("torso", g, team=True, outline=0.5)
    # backpack projector housing
    g = Geo().blob((-15.0, 0, 32.0), (4.6, 8.8, 9.0), p=3.2)
    rig.part("torso", g, F.ARMOR, finish="gloss", outline_hex=F.TRIM)
    g = Geo().blob((-17.6, 0, 33.0), (2.0, 9.0, 2.2), p=3.0)
    rig.part("torso", g, team=True, outline=0.5)
    # the swivelling mast with its lens
    rig.joint("mast", "torso", MAST0)
    mx, my, mz = MAST0
    g = Geo().capsule((mx, my, mz), (mx, my, LENS[2] - 4.0), 1.3)
    rig.part("mast", g, F.GUNMETAL, outline=0.6)
    g = Geo().capsule((mx, my, mz + 9.0), (mx, my, mz + 14.0), 2.0)
    rig.part("mast", g, team=True, outline=0.5)
    lx, ly, lz = LENS
    g = Geo().lathe([(0, 0), (5.2, 0.2), (5.6, 2.4), (5.0, 3.4), (0, 3.2)], (lx - 1.0, ly, lz), (lx + 2.4, ly, lz), segs=20)
    rig.part("mast", g, F.ARMOR, finish="gloss", outline_hex=F.TRIM)
    g = Geo().lathe([(0, 0), (3.8, 0.1), (3.6, 1.0), (0, 1.2)], (lx + 2.2, ly, lz), (lx + 3.4, ly, lz), segs=20)
    rig.part("mast", g, glow=W.HOLO, outline=0.8, outline_hex=W.HOLO_DK)
    rig.joint("lens_glow", "mast", (lx + 3.0, ly, lz), hidden=True)
    g = Geo().lathe([(0, 0), (5.2, 0.1), (5.0, 1.0), (0, 1.2)], (lx + 3.4, ly - 0.2, lz), (lx + 4.6, ly - 0.2, lz), segs=20)
    rig.part("lens_glow", g, glow=W.MINT_CORE, outline=1.0, outline_hex=W.MINT)
    rig.track("lens", "mast", (lx + 4.0, ly, lz))
    # the wrist emitter on the near hand
    hx, hy, hz = HR
    g = Geo().blob((hx + 0.6, hy - 0.4, hz + 2.2), (4.2, 4.0, 3.8), p=2.6)
    rig.part("hand_r", g, F.ARMOR, finish="gloss", outline_hex=F.TRIM)
    g = Geo().lathe([(0, -0.6), (3.0, -0.5), (3.0, 0.5), (0, 0.6)], (PALM[0], PALM[1], PALM[2] + 1.0),
                    (PALM[0], PALM[1], PALM[2]), segs=16)
    rig.part("hand_r", g, F.MAGENTA, outline=0.5)
    rig.joint("palm_glow", "hand_r", PALM, hidden=True)
    g = Geo().sphere(PALM, 2.8, cuts=3)
    rig.part("palm_glow", g, glow=W.MINT_CORE, outline=1.0, outline_hex=W.MINT)
    rig.track("muzzle", "hand_r", PALM)
    KI.loose(rig, "mast_loose", MAST0, lambda j: _loose_mast(rig, j))


def _loose_mast(rig, j):
    mx, my, mz = MAST0
    lx, ly, lz = LENS
    g = Geo().capsule((mx, my, mz), (mx, my, lz - 4.0), 1.3)
    rig.part(j, g, F.GUNMETAL, outline=0.6)
    g = Geo().lathe([(0, 0), (5.2, 0.2), (5.6, 2.4), (5.0, 3.4), (0, 3.2)], (lx - 1.0, ly, lz), (lx + 2.4, ly, lz), segs=20)
    rig.part(j, g, F.ARMOR, finish="gloss", outline_hex=F.TRIM)


def arms(near, far):
    a, f = F.ik2(F.SH, near)
    la, lf = F.ik2(F.SH, far)
    return merge(F.arm("r", a, f), F.arm("l", la, lf))


LOW = ((5.0, 24.0), (7.0, 25.0))
STANCE = merge(arms(*LOW), {"torso": {"r": -2.0}})


def _idle(f):
    adj = [0.0, 0.5, 1.0, 1.0, 0.5, 0.0][f]

    def extra(ctx):
        return merge(arms((5.0, 24.0), (7.0 - 14.0 * adj, 25.0 + 18.0 * adj)), {"mast": {"r": 6.0 * adj}})
    pose = M.idle_v2(f, {"torso": {"r": -2.0}}, frames=6, extra=extra, blink=5, face_blink=KF.glyph("g_blink"))
    if f in (2, 3):
        pose["lens_glow"] = {"show": True}
    return KI.ground_feet(RIG, pose, LEGS)


SPEED = 81.25
LEGS = KF.legs_ik()
GAIT = KF.jog_gait(LEGS, SPEED, cycle_ms=616)


def _walk(f, report=None):
    def extra(ctx):
        lag = ctx["bob_lag"] / max(ctx["amp"], 1e-3)
        return {"mast": {"r": -4.0 * lag}}
    return M.walk_v3(RIG, f, {"torso": {"r": -2.0}}, GAIT, legs=LEGS, lean=-6.0, twist=5.0, nod=2.0,
                     arms={"r": KF.ArmChain("r"), "l": KF.ArmChain("l")}, arm=28.0, extra=extra, report=report)


# SMALL_MELEE_MS timing (impact on step 6 at 290 of 680 ms), 11 poses; hold 3 loops with 4.
#      read     raise    extend   HOLD     flicker  set      PULSE    kick     settle   lower    low     (A: wrist pulse)
A_H = [(5, 24), (12, 30), (17, 33), (18, 33), (18, 33), (18, 33), (19, 33), (15, 39), (11, 32), (7, 26), (5, 24)]
A_TR = [-2, -4, -6, -7, -7, -7, -4, 6, 0, -2, -2]


def _a_pose(f):
    pose = merge(arms(A_H[f], (7.0, 25.0)), {
        "hand_r": {"r": [0, 40, 80, 90, 90, 90, 90, 60, 30, 0, 0][f]},
        "torso": {"r": A_TR[f]}, "head": {"r": A_TR[f] - 2},
        "palm_glow": {"show": f in (3, 5, 6)},
        "thigh_r": {"r": [0, 8, 12, 14, 14, 14, 12, 6, 2, 0, 0][f]}, "thigh_l": {"r": [0, -8, -12, -14, -14, -14, -16, -12, -4, 0, 0][f]},
    }, M.body_about((0, 0, 22), x=[0, 0.5, 1, 1, 1, 1.2, 0, -3, -1, 0, 0][f]))
    if f == 4:
        pose["body"]["x"] += 0.35
    g = ["eyes", "g_angry", "g_squint", "g_squint", "g_squint", "g_squint", "g_wide", "g_happy", "eyes", "eyes", "eyes"][f]
    return KI.ground_feet(RIG, merge(pose, KF.glyph(g)), LEGS)


def _charge(joint, pt, r=(4.0, 7.0)):
    return [{"kind": "rings", "joint": joint, "point": pt, "radii_lu": r, "a0": -80.0, "a1": 80.0, "color": W.MINT_CORE}]


def _pulse(joint, pt):
    return [{"kind": "burst", "joint": joint, "point": pt, "r0_lu": 5.0, "r1_lu": 11.0, "n": 6, "a0": -70.0,
             "arc": 140.0, "color": W.MINT_CORE}]


def _attack_clip():
    ov = {3: _charge("hand_r", PALM), 4: _charge("hand_r", PALM, (5.0, 8.5)), 5: _charge("hand_r", PALM, (5.5, 9.0)),
          6: _pulse("hand_r", PALM)}
    return M.clip("attack", [_a_pose(f) for f in range(11)], M.SMALL_MELEE_MS, impact=M.SMALL_MELEE_IMPACT,
                  overlays=ov, extra={"holdStep": 3, "holdLoop": [3, 4]})


# B: the mast swings forward over the shoulder (r -65: the lens ahead of the face)
B_MAST = [0, -35, -65, -76, -76, -76, -76, -68, -45, -15, 0]
LENS_TIP = (LENS[0] + 4.0, LENS[1], LENS[2])


def _b_pose(f):
    if f in (0, 10):
        return _a_pose(f)
    up = 1.0 if 2 <= f <= 7 else 0.5
    pose = merge(arms((8.0, 30.0 + 8 * up), (10.0, 31.0 + 9 * up)), {
        "mast": {"r": B_MAST[f]}, "torso": {"r": [0, 2, 6, 8, 8, 8, 4, 10, 4, 0, 0][f]},
        "lens_glow": {"show": f in (3, 5, 6)},
    }, M.body_about((0, 0, 22), z=[0, -2, -3.5, -4, -4, -4, -3.5, -2, -1, 0, 0][f]))
    if f == 4:
        pose["body"]["x"] = pose["body"].get("x", 0.0) + 0.3
    g = ["eyes", "g_angry", "g_squint", "g_squint", "g_squint", "g_squint", "g_wide", "g_hurt", "g_happy", "eyes", "eyes"][f]
    return KI.ground_feet(RIG, merge(pose, KF.glyph(g)), LEGS)


def _attack_b():
    ov = {3: _charge("mast", LENS_TIP, (6.0, 9.0)), 4: _charge("mast", LENS_TIP, (7.0, 10.5)),
          5: _charge("mast", LENS_TIP, (7.5, 11.0)), 6: _pulse("mast", LENS_TIP)}
    return M.clip("attack_b", [_b_pose(f) for f in range(11)], M.SMALL_MELEE_MS, impact=M.SMALL_MELEE_IMPACT,
                  overlays=ov, reuse={0: ("attack", 0), 10: ("attack", 10)},
                  extra={"holdStep": 3, "holdLoop": [3, 4], "muzzleTracker": "lens"})


def _hit(k):
    base = {"torso": {"r": -2.0}}
    return W.hit_pose(k, base, lambda a: merge(arms((5.0 - 2 * max(a, 0), 24.0 + 4 * max(a, 0)), (7.0, 25.0 + 4 * max(a, 0))),
                                               {"mast": {"r": 10 * a}}))


MAST_PATH = [None, (-4, 10, -40), (-8, 18, -120), (-12, 14, -200), (-16, 0, -260), (-20, -18, -300),
             (-22, -34, -270), (-22, -38, -270), (-22, -38, -270), (-22, -38, -270)]


def _die(k):
    return W.die_d1(k, STANCE, HEIGHT_LU, prop="mast", prop_path=MAST_PATH)


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
    return M.check_variants(M.check_contract(cl))
