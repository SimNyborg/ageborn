"""Star Mortar: Cosmic Age rare ranged, Long range (CONTENT_PLAN 5.8, H6). A gravity mortar lobbing a tiny star,
~70 lu.

Look (A11, Cosmic palette): a legion artillerist in the void undersuit and violet armour, the legion dome helmet
(team brow band and crest, a dark visor with light violet eyes that act), a team chest plate with the pale star,
team shoulder pads and team greaves. On his shoulder a squat gravity mortar: a star-white bell-mouthed tube with
a team band and two mint field rings, a violet breech. On his back a rack of three tiny stars in a star-white
frame. The shot is a tiny white star wrapped in a mint glow.

"A viewer expects a mortarman of the stars: the tube tilts up, the field rings charge around a captured star,
thoomp, and the star sails high; he reaches back for the next one."

Animation (ANIM_SPEC G1 jog at card 60 x 1.25 = 75 lu/s, appendix B artillery; the sim fires every 2.6 s):
  idle      the tube on the shoulder, he taps the field ring, a blink
  walk      walk v3 jog with the mortar sloped back on the shoulder
  attack    SHOULDER LOB: tilts the tube up, the rings charge around the star (the held extreme, a hold loop with
            the charge flicker), thoomp, the recoil kicks him back, he loads a new star from the back rack
  attack_b  KNEELING HIGH LOB: drops to one knee with the tube near vertical (the held extreme), fires, the
            shot kicks him down onto his heel
  hit       light: the head snaps back, eyes > <
  die       D1 fling and spin, the tube flung away, X eyes
"""
from ageborn_art import kit_cosmic as KC
from ageborn_art import kit_cosmic_wave as W
from ageborn_art import kit_future as KF
from ageborn_art import kit_industrial as KI
from ageborn_art import moves as M
from ageborn_art import rigs_cosmic as F
from ageborn_art.anim import merge
from ageborn_art.geometry import Geo

SLUG = "star_mortar"
GAIT_NAME = "biped"
NAME = "Star Mortar"
HEIGHT_LU = 70
CANVAS = (300, 280)
FEET = (120, 246)
ANCHORS = {"head": (2, 68), "hitCenter": (0, 32), "muzzle": (30, 58)}
NO_RETIME = True

G0 = (4.0, -15.0, 27.0)        # tube grip at rest (character space), the tube along +X above it
TUBE_Z = 5.5                   # the tube axis sits this far above the grip
FORE = 16.0
MUZZLE = (G0[0] + 34.0, G0[1], G0[2] + TUBE_Z)


def _tube(rig, j):
    gx, gy, gz = G0
    tz = gz + TUBE_Z
    g = Geo().lathe([(0, 0), (4.4, 0.2), (4.6, 3.0), (4.2, 20.0), (6.8, 24.0), (7.0, 26.0), (0, 26.2)], (gx - 6.0, gy, tz),
                    (gx + 30.0, gy, tz), segs=20)
    rig.part(j, g, F.STAR, finish="gloss", outline_hex=F.STAR_TRIM)
    g = Geo().lathe([(0, -1.6), (4.8, -1.5), (4.8, 1.5), (0, 1.6)], (gx + 4.0, gy, tz), (gx + 7.0, gy, tz), segs=18)
    rig.part(j, g, team=True, outline=0.6)                                     # team band
    g = Geo()
    for x in (gx + 12.0, gx + 17.0):
        g.lathe([(0, -0.8), (5.2, -0.7), (5.2, 0.7), (0, 0.8)], (x, gy, tz), (x + 1, gy, tz), segs=16)
    rig.part(j, g, glow=W.MINT, outline=1.0, outline_hex=F.VOID)
    g = Geo().blob((gx - 7.0, gy, tz), (3.4, 4.8, 4.8), p=2.8)                   # breech
    rig.part(j, g, F.VIOLET, finish="gloss", outline_hex=F.VIOLET_DK)
    g = Geo().blob((gx + 0.5, gy + 1, gz - 1.0), (2.2, 2.0, 4.0), p=2.8, rot=(0, -12, 0))   # grip
    g.blob((gx + FORE, gy + 2, gz + 0.6), (2.0, 1.8, 3.2), p=2.8, rot=(0, -8, 0))   # fore grip
    rig.part(j, g, F.VOID_LT)


RIG = None


def build(rig):
    global RIG
    RIG = rig
    W.trooper(rig, helmet_kind="dome", team_shin=True, pack=False)
    # back rack: three glowing shells in a frame
    g = Geo().blob((-13.5, 0, 31.0), (2.6, 8.6, 10.0), p=3.4)
    rig.part("torso", g, F.STAR, finish="gloss", outline_hex=F.STAR_TRIM)
    g = Geo().blob((-14.0, 0, 40.6), (2.9, 8.8, 2.6), p=3.0)
    rig.part("torso", g, team=True, outline=0.6)
    for z in (25.0, 31.0, 37.0):
        g = Geo().star((-17.0, -3.0, z), 3.0, 1.3, 1.4, points=5)
        rig.part("torso", g, glow=W.MINT_CORE, outline=0.8, outline_hex=W.MINT)
    rig.joint("tube", "torso", G0)
    _tube(rig, "tube")
    mx, my, mz = MUZZLE
    rig.joint("shell", "tube", MUZZLE, hidden=True)
    g = Geo().sphere((mx - 1.0, my - 1.0, mz), 4.2, cuts=4)
    rig.part("shell", g, glow=W.MINT, outline=1.4, outline_hex="#1C8A6A")
    g = Geo().star((mx - 1.0, my - 4.0, mz), 3.6, 1.5, 1.2, points=5)
    rig.part("shell", g, glow=F.WHITE, outline=0)
    rig.joint("flash", "tube", MUZZLE, hidden=True)
    g = Geo().blob((mx + 6.0, my - 1, mz), (7.0, 2.0, 5.0), p=2.0)
    rig.part("flash", g, glow=W.MINT, outline=0)
    g = Geo().blob((mx + 3.5, my - 2, mz), (4.0, 1.6, 3.0), p=2.0)
    rig.part("flash", g, glow=F.WHITE, outline=0)
    F.puff(rig, "tube", (mx + 3.0, my, mz + 3.0), size=1.0, name="smoke")
    rig.joint("held_shell", "hand_l", (0.0, F.ARM_Y["l"], F.HAND_Z), hidden=True)
    g = Geo().star((1.5, F.ARM_Y["l"] - 3.0, F.HAND_Z + 1.0), 3.0, 1.3, 1.4, points=5)
    rig.part("held_shell", g, glow=W.MINT_CORE, outline=0.8, outline_hex=W.MINT)
    rig.track("muzzle", "tube", MUZZLE)
    KI.loose(rig, "tube_loose", G0, lambda j: _tube(rig, j))


def hold(gx, gz, deg):
    return F.hold2("tube", G0, FORE, gx, gz, deg)


REST = (2.0, 29.0, 20.0)
STANCE = merge(hold(*REST), {"torso": {"r": -2.0}})


def _idle(f):
    tap = [0.0, 0.5, 1.0, 1.0, 0.5, 0.0][f]
    pose = M.idle_v2(f, STANCE, frames=6, blink=4, face_blink=KF.glyph("g_blink"))
    pose = merge(pose, {"head": {"r": 6.0 * tap}})
    if tap > 0:
        a, fo = F.ik2(F.SH, (REST[0] + 14.0, REST[1] + 8.0 + 2 * tap))
        pose.update(F.arm("l", a, fo))
    return KI.ground_feet(RIG, pose, LEGS)


SPEED = 75.0
LEGS = KC.legs_ik()
GAIT = KC.jog_gait(LEGS, SPEED, cycle_ms=640, stance=0.52, lift=5.0)


def _walk(f, report=None):
    def extra(ctx):
        lag = ctx["bob_lag"] / max(ctx["amp"], 1e-3)
        return merge(F.hold2("tube", G0, 9.0, -2.0, 30.0 + 1.0 * lag, 34.0 - 4.0 * lag),
                     {"head": {"r": 3.0 - 2.0 * lag}})
    return M.walk_v3(RIG, f, {"torso": {"r": -3.0}}, GAIT, legs=LEGS, lean=-9.0, twist=6.0, nod=3.0,
                     extra=extra, report=report)


# SMALL_MELEE_MS timing (impact on step 6 at 290 of 680 ms), 11 poses; the hold (3) loops with the
# charge flicker (2) while the sim's 1.3 s wind-up runs.
#      read  raise aim2 HOLD  chg2  set   FIRE  kick  rock  reach load
A_G = [(2, 29, 20), (4, 32, 34), (5, 33, 44), (5, 33, 45), (5, 33, 45), (5, 33, 46), (5, 34, 46),
       (2, 36, 62), (1, 33, 50), (2, 30, 30), (2, 29, 22)]
A_TR = [-2, -6, -9, -10, -10, -10, -8, 6, 2, -2, -2]
A_BX = [0.0, 0.0, 0.5, 0.5, 0.5, 0.8, 0.0, -4.0, -2.5, -1.0, 0.0]
A_BZ = [0.0, -0.5, -1.0, -1.5, -1.3, -1.6, -1.0, 0.6, 0.0, 0.0, 0.0]
A_Q = [0.0, -0.02, -0.04, -0.07, -0.06, -0.08, 0.05, -0.10, 0.03, 0.0, 0.0]
A_EYES = ["eyes", "g_angry", "g_angry", "g_squint", "g_squint", "g_squint", "g_hurt", "g_wide", "eyes", "eyes", "eyes"]
A_SHELL = [0, 0, 0.5, 0.9, 1.1, 1.2, 0, 0, 0, 0, 0]


def _a_pose(f):
    gx, gz, deg = A_G[f]
    pose = merge(hold(gx, gz, deg), {
        "torso": {"r": A_TR[f]}, "head": {"r": A_TR[f] + 6.0},
        "thigh_r": {"r": [0, 8, 12, 14, 14, 14, 12, 4, 6, 2, 0][f]}, "shin_r": {"r": [0, -4, -6, -8, -8, -8, -6, 0, -2, 0, 0][f]},
        "thigh_l": {"r": [0, -8, -12, -14, -14, -14, -16, -20, -12, -4, 0][f]},
        "shell": {"show": A_SHELL[f] > 0, "s": max(A_SHELL[f], 0.01)},
        "flash": {"show": f == 6}, "smoke": {"show": f in (7, 8), "z": 3.0 if f == 8 else 0.0},
    }, M.body_about((0, 0, 22), x=A_BX[f], z=A_BZ[f], q=A_Q[f]))
    if f == 4:
        pose["body"]["x"] += 0.35
    if f in (9, 10):
        # the far hand reaches over the shoulder to the back rack, then drops the shell in the breech
        tgt = (-8.0, 40.0) if f == 9 else (gx - 4.0, gz + 8.0)
        a, fo = F.ik2(F.SH, tgt)
        pose.update(F.arm("l", a, fo))
        pose["held_shell"] = {"show": True}
    return KI.ground_feet(RIG, merge(pose, KF.glyph(A_EYES[f])), LEGS)


def _charge_ov(r=(6.0, 9.5)):
    return [{"kind": "rings", "joint": "tube", "point": (MUZZLE[0] - 1.0, MUZZLE[1], MUZZLE[2]), "radii_lu": r,
             "a0": -80.0, "a1": 80.0, "color": W.MINT_CORE}]


def _fire_ov(seed):
    return [{"kind": "burst", "joint": "tube", "point": MUZZLE, "r0_lu": 7.0, "r1_lu": 13.0, "n": 6,
             "a0": -40.0, "arc": 120.0, "color": W.MINT_CORE},
            {"kind": "dust", "ground": (-8.0, 0.0), "size_lu": 5.5, "puffs": 3, "seed": seed, "spread": 0.9,
             "color": W.DUST}]


def _attack_clip():
    ov = {3: _charge_ov(), 4: _charge_ov((7.0, 11.0)), 5: _charge_ov((7.5, 12.0)), 6: _fire_ov(401)}
    return M.clip("attack", [_a_pose(f) for f in range(11)], M.SMALL_MELEE_MS, impact=M.SMALL_MELEE_IMPACT,
                  overlays=ov, extra={"holdStep": 3, "holdLoop": [3, 4]})


#      kneel tilt  HOLD  chg2  set   FIRE  kick  rise                       (B: kneeling high lob)
B_G = [(3, 31, 50), (3, 32, 62), (3, 32, 66), (3, 32, 66), (3, 32, 67), (3, 33, 67), (1, 34, 80), (2, 31, 50)]
B_DROP = [8.0, 14.0, 14.0, 14.0, 14.0, 14.0, 15.0, 8.0]
B_TR = [-4, -8, -10, -10, -10, -8, 4, -2]


def _b_pose(f):
    if f in (0, 9, 10):
        return _a_pose(f)
    k = f - 1
    gx, gz, deg = B_G[k]
    pose = merge(hold(gx, gz, deg), {
        "torso": {"r": B_TR[k]}, "head": {"r": B_TR[k] + 10.0},
        "shell": {"show": k in (2, 3, 4), "s": [0, 0, 0.9, 1.1, 1.2, 0, 0, 0][k] or 0.01},
        "flash": {"show": k == 5}, "smoke": {"show": k in (6, 7)},
    }, M.body_about((0, 0, 22), x=-3.0 if k == 6 else 0.0))
    if k == 3:
        pose["body"]["x"] += 0.3
    g = ["g_angry", "g_squint", "g_squint", "g_squint", "g_squint", "g_hurt", "g_wide", "eyes"][k]
    return KI.kneel(RIG, merge(pose, KF.glyph(g)), LEGS, drop=B_DROP[k], front=13.0)


def _attack_b():
    ov = {3: _charge_ov(), 4: _charge_ov((7.0, 11.0)), 5: _charge_ov((7.5, 12.0)), 6: _fire_ov(402)}
    reuse = {0: ("attack", 0), 9: ("attack", 9), 10: ("attack", 10)}
    return M.clip("attack_b", [_b_pose(f) for f in range(11)], M.SMALL_MELEE_MS, impact=M.SMALL_MELEE_IMPACT,
                  overlays=ov, reuse=reuse, extra={"holdStep": 3, "holdLoop": [3, 4]})


def _hit(k):
    base = {"torso": {"r": -2.0}}
    return W.hit_pose(k, base, lambda a: hold(REST[0] - 2 * max(a, 0), REST[1] + 2 * max(a, 0), REST[2] + 18 * a))


TUBE_PATH = [None, (6, 14, 60), (10, 26, 170), (14, 28, 300), (18, 16, 430), (22, 0, 560),
             (24, -22, 700), (25, -26, 720), (25, -26, 720), (25, -26, 720)]


def _die(k):
    return W.die_d1(k, STANCE, HEIGHT_LU, prop="tube", prop_path=TUBE_PATH)


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
