"""Overclock Engineer: Future Age rare support, aura (CONTENT_PLAN 5.7). Multitool zapper, ~68 lu.

Look (A11, Future palette): a field engineer in a charcoal suit with white armour pieces, a team hard
hat over a dark half visor (mint eyes that act), a team chest plate with the hex, team shoulder pads, a
tool belt with pouches and a spanner, and a holo-tablet on the far forearm (a mint glowing pane). In the
near hand a chunky multitool zapper: a charcoal body, a white nozzle with two prongs and a magenta coil.

"A viewer expects a tinkerer: points a gadget, it crackles, a zap leaps out; taps his tablet between."

Animation (ANIM_SPEC G1 jog at card 65 x 1.25 = 81.25 lu/s, appendix B guns; the sim's 0.6 s wind-up
loops the charge hold):
  idle      taps the holo-tablet on his forearm (it brightens), checks it, a blink and a happy glyph
  walk      walk v3 jog with the zapper held up by the shoulder, the tablet arm pumping
  attack    TWO-HANDED ZAP: braces the zapper with both hands at chest height, the prongs charge
            (the held extreme, looping a crackle), the zap snaps out, the tool kicks up
  attack_b  HIP ZAP AND TAP: one-handed from the hip while the far hand jabs the tablet (the held
            extreme), a quick zap, he blows on the nozzle
  hit       light: the head snaps back, eyes > <
  die       D1 fling and spin, the zapper flung away, X eyes
"""
from ageborn_art import kit_future as KF
from ageborn_art import kit_future_wave as W
from ageborn_art import kit_industrial as KI
from ageborn_art import moves as M
from ageborn_art import rigs_future as F
from ageborn_art.anim import merge
from ageborn_art.geometry import Geo

SLUG = "overclock_engineer"
GAIT_NAME = "biped"
NAME = "Overclock Engineer"
HEIGHT_LU = 68
CANVAS = (300, 256)
FEET = (120, 222)
ANCHORS = {"head": (2, 66), "hitCenter": (0, 31), "muzzle": (30, 30)}
NO_RETIME = True

HR = (0.0, F.ARM_Y["r"], F.HAND_Z)
HL = (0.0, F.ARM_Y["l"], F.HAND_Z)
TOOL_LEN = 27.0
MUZZLE = (HR[0], HR[1] - 0.5, HR[2] + TOOL_LEN + 2.0)     # the tool points along +Z from the hand (rest)


def _tool(rig, j, k=1.55):
    hx, hy, hz = HR
    g = Geo().blob((hx, hy, hz + 5.0 * k), (3.4 * k, 3.0 * k, 6.0 * k), p=2.8)      # body
    g.blob((hx - 2.6, hy, hz - 1.0), (2.0, 2.0, 3.6), p=2.8, rot=(0, 20, 0))            # grip
    g.blob((hx - 3.0 * k, hy, hz + 4.0 * k), (2.4 * k, 2.6 * k, 3.0 * k), p=2.8)    # battery hump
    rig.part(j, g, F.SUIT)
    g = Geo().lathe([(0, 0), (2.6 * k, 0.2), (2.2 * k, 6.0 * k), (0, 6.2 * k)], (hx, hy, hz + 10.0 * k),
                    (hx, hy, hz + 16.0 * k), segs=14)
    rig.part(j, g, F.ARMOR, finish="gloss", outline_hex=F.TRIM)
    g = Geo().capsule((hx + 1.6 * k, hy, hz + 15.0 * k), (hx + 1.6 * k, hy, hz + (TOOL_LEN + 1.0)), 0.9)
    g.capsule((hx - 1.6 * k, hy, hz + 15.0 * k), (hx - 1.6 * k, hy, hz + (TOOL_LEN + 1.0)), 0.9)
    rig.part(j, g, F.TRIM, finish="metal", outline=0.5)
    g = Geo().lathe([(0, -1.2), (3.4 * k, -1.1), (3.4 * k, 1.1), (0, 1.2)], (hx, hy, hz + 7.0 * k),
                    (hx, hy, hz + 8.0 * k), segs=14)
    rig.part(j, g, F.MAGENTA, outline=0.6)
    g = Geo().blob((hx + 2.0 * k, hy - 2.6 * k, hz + 4.0 * k), (1.6 * k, 0.8, 3.0 * k), p=2.6)    # team side plate
    rig.part(j, g, team=True, outline=0.4)


RIG = None


def build(rig):
    global RIG
    RIG = rig
    W.trooper(rig, helmet_kind="hardhat", team_greave=True, team_sleeve=False, pack=False)
    # tool belt: pouches and a spanner on the hip
    g = Geo().blob((5.0, -10.0, 19.6), (2.6, 1.8, 2.8), p=3.0).blob((-3.0, -10.0, 19.8), (2.4, 1.8, 2.6), p=3.0)
    g.blob((-8.0, -6.0, 19.8), (2.2, 1.8, 2.6), p=3.0)
    rig.part("torso", g, "#6E5F4E", outline=0.6)
    g = Geo().capsule((1.0, -11.4, 21.0), (2.0, -11.6, 12.0), 0.9)
    rig.part("torso", g, F.STEEL, finish="metal", outline=0.5)
    # the holo-tablet on the far forearm
    hx, hy, hz = HL
    g = Geo().blob((hx + 1.5, hy - 4.0, hz + 4.0), (3.6, 1.2, 4.6), p=3.0)
    rig.part("fore_l", g, F.GUNMETAL, outline=0.6)
    g = Geo().blob((hx + 1.5, hy - 5.2, hz + 4.0), (3.0, 0.6, 3.8), p=3.0)
    rig.part("fore_l", g, glow=W.HOLO, outline=0.6, outline_hex=W.HOLO_DK)
    rig.joint("tablet_glow", "fore_l", (hx + 1.5, hy - 5.6, hz + 4.0), hidden=True)
    g = Geo().blob((hx + 1.5, hy - 5.8, hz + 4.0), (3.8, 0.4, 4.6), p=3.0)
    rig.part("tablet_glow", g, glow=W.MINT_CORE, outline=0.8, outline_hex=W.MINT)
    rig.joint("tool", "hand_r", HR)
    _tool(rig, "tool")
    mx, my, mz = MUZZLE
    rig.joint("arc", "tool", MUZZLE, hidden=True)
    F.sparks(rig, "tool", MUZZLE, name="arc", size=0.7, seed=7)
    rig.track("muzzle", "tool", MUZZLE)
    KI.loose(rig, "tool_loose", HR, lambda j: _tool(rig, j))


def aim(hand, w, far=None):
    a, f = F.ik2(F.SH, hand)
    pose = F.arm("r", a, f, w, 90.0)
    if far is not None:
        la, lf = F.ik2(F.SH, far)
        pose = merge(pose, F.arm("l", la, lf))
    return pose


LOW = ((7.0, 24.0), 30.0, (8.0, 30.0))
STANCE = merge(aim(*LOW), {"torso": {"r": -2.0}})


def _idle(f):
    tap = [0.0, 0.5, 1.0, 1.0, 0.5, 0.0][f]

    def extra(ctx):
        # the near hand's fingers (the tool) tap the tablet held up on the far forearm
        return merge(aim((7.0 + 1.0 * tap, 24.0 + 3.0 * tap), 30.0 - 30 * tap, (8.0 + 2 * tap, 30.0 + 3 * tap)),
                     {"head": {"r": -8 * tap}})
    pose = M.idle_v2(f, {"torso": {"r": -2.0}}, frames=6, extra=extra, blink=5, face_blink=KF.glyph("g_blink"))
    if f in (2, 3):
        pose["tablet_glow"] = {"show": True}
    if f == 3:
        pose = merge(pose, KF.glyph("g_happy"))
    return KI.ground_feet(RIG, pose, LEGS)


SPEED = 81.25
LEGS = KF.legs_ik()
GAIT = KF.jog_gait(LEGS, SPEED, cycle_ms=616)


def _walk(f, report=None):
    def extra(ctx):
        lag = ctx["bob_lag"] / max(ctx["amp"], 1e-3)
        return aim((4.0, 32.0 + 0.8 * lag), 100.0 - 6 * lag)
    return M.walk_v3(RIG, f, {"torso": {"r": -3.0}}, GAIT, legs=LEGS, lean=-9.0, twist=6.0, nod=3.0,
                     arms={"l": KF.ArmChain("l")}, arm=32.0, extra=extra, report=report)


# SMALL_MELEE_MS timing (impact on step 6 at 290 of 680 ms), 11 poses; hold 3 loops with 4.
#      read     raise    brace    HOLD     crackle  set      ZAP      kick     settle   lower    low
A_H = [(7, 24), (9, 30), (11, 32), (11, 32), (11, 32), (11, 32), (12, 32), (9, 35), (8, 30), (7, 26), (7, 24)]
A_W = [30, 4, 0, 0, 0, 0, 0, 34, 14, 26, 30]
A_TR = [-2, -4, -6, -7, -7, -7, -4, 6, 0, -2, -2]
A_BX = [0.0, 0.5, 0.5, 0.8, 0.8, 1.0, 0.0, -3.0, -1.0, 0.0, 0.0]
A_EYES = ["eyes", "g_angry", "g_squint", "g_squint", "g_squint", "g_squint", "g_wide", "g_happy", "eyes", "eyes", "eyes"]


def _a_pose(f):
    hx, hz = A_H[f]
    far = (hx + 4.0, hz + 1.0) if 1 <= f <= 7 else (8.0, 30.0)
    pose = merge(aim(A_H[f], A_W[f], far), {
        "torso": {"r": A_TR[f]}, "head": {"r": A_TR[f] - 2},
        "thigh_r": {"r": [0, 8, 12, 14, 14, 14, 12, 6, 2, 0, 0][f]}, "thigh_l": {"r": [0, -8, -12, -14, -14, -14, -16, -12, -4, 0, 0][f]},
        "arc": {"show": f in (3, 5, 6)},
    }, M.body_about((0, 0, 22), x=A_BX[f], z=[0, -0.5, -1, -1.4, -1.2, -1.5, -0.8, 0.4, 0, 0, 0][f]))
    if f == 4:
        pose["body"]["x"] += 0.35
    return KI.ground_feet(RIG, merge(pose, KF.glyph(A_EYES[f])), LEGS)


def _charge(r=(4.0, 7.0)):
    return [{"kind": "rings", "joint": "tool", "point": MUZZLE, "radii_lu": r, "a0": -80.0, "a1": 80.0,
             "color": W.MINT_CORE}]


def _zap(seed):
    return [{"kind": "burst", "joint": "tool", "point": MUZZLE, "r0_lu": 5.0, "r1_lu": 11.0, "n": 6, "a0": -70.0,
             "arc": 140.0, "color": W.MINT_CORE}]


def _attack_clip():
    ov = {3: _charge(), 4: _charge((5.0, 8.5)), 5: _charge((5.5, 9.0)), 6: _zap(171)}
    return M.clip("attack", [_a_pose(f) for f in range(11)], M.SMALL_MELEE_MS, impact=M.SMALL_MELEE_IMPACT,
                  overlays=ov, extra={"holdStep": 3, "holdLoop": [3, 4]})


#      read     drop     hip      HOLD     crackle  set      ZAP      kick     blow     lower    low     (B: hip zap and tap)
B_H = [(7, 24), (8, 21), (9, 20), (9, 20), (9, 20), (9, 20), (10, 20), (8, 24), (9, 34), (7, 26), (7, 24)]
B_W = [30, 10, 4, 4, 4, 4, 4, 30, 80, 26, 30]
B_TR = [-2, 2, 6, 8, 8, 8, 6, 10, 0, -2, -2]


def _b_pose(f):
    if f in (0, 10):
        return _a_pose(f)
    far = (10.0, 31.0) if 2 <= f <= 6 else (8.0, 30.0)
    pose = merge(aim(B_H[f], B_W[f], far), {
        "torso": {"r": B_TR[f], "rz": 10.0 if 2 <= f <= 6 else 0.0}, "head": {"r": -10.0 if 2 <= f <= 5 else 0.0},
        "arc": {"show": f in (3, 5, 6)}, "tablet_glow": {"show": f in (3, 4, 5)},
    }, M.body_about((0, 0, 22), z=[0, -2, -3.5, -4, -4, -4, -3.5, -2, -1, 0, 0][f]))
    if f == 4:
        pose["body"]["x"] = pose["body"].get("x", 0.0) + 0.3
    g = ["eyes", "g_angry", "g_squint", "g_squint", "g_squint", "g_squint", "g_wide", "g_hurt", "g_happy", "eyes", "eyes"][f]
    return KI.ground_feet(RIG, merge(pose, KF.glyph(g)), LEGS)


def _attack_b():
    ov = {3: _charge(), 4: _charge((5.0, 8.5)), 5: _charge((5.5, 9.0)), 6: _zap(172)}
    return M.clip("attack_b", [_b_pose(f) for f in range(11)], M.SMALL_MELEE_MS, impact=M.SMALL_MELEE_IMPACT,
                  overlays=ov, reuse={0: ("attack", 0), 10: ("attack", 10)}, extra={"holdStep": 3, "holdLoop": [3, 4]})


def _hit(k):
    base = {"torso": {"r": -2.0}}
    return W.hit_pose(k, base, lambda a: aim((7.0 - 2 * max(a, 0), 24.0 + 3 * max(a, 0)), 30.0 + 30 * a, (8.0, 30.0)))


def _die(k):
    return W.die_d1(k, STANCE, HEIGHT_LU, prop="tool", prop_path=W.PROP_PATH)


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
