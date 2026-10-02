"""Pulse Trooper: Future Age ranged (DESIGN A5.6). Plasma bolt, laser damage, ~70 lu.

Look (A11): charcoal undersuit, glossy white armour, a big helmet whose upper dome is a team cap
over a white faceplate with a dark visor and mint robot eyes that act (angry while aiming, a slit
on the shot, > < when hit, X on death), a whip antenna with a magenta tip (follow-through), a team
chest plate with the pale Future hex, team shoulder pads with light strips, a belt with pouches and
a glowing buckle, a backpack power pack with a cable that swings to the rifle, and an oversized
plasma rifle: a charcoal receiver, a white shroud, three mint coil rings, a top cell hatch, a wide
flared muzzle with a magenta ring.

Animation (art director plan 2026-09-30, `ageborn_art/moves.py`):
  idle    rifle at low ready, taps the side of his visor with the far hand, weight shift, a blink
  walk    walk v3 bounce jog at ground speed (ANIM_SPEC G1, 81.25 lu/s): the rifle carried at port
          across the chest and bobbing a frame late, planted feet, the antenna and cable swinging
  attack  SHOULDER, CHARGE, SNAP AND CELL SWAP: snaps the rifle to his shoulder, the coils heat
          up ring by ring while a charge ball grows at the muzzle (the held extreme, angry eyes),
          one flash, a hard kick up and back, then the spent cell pops out of the top hatch,
          steam vents, and he slaps a fresh cell in. The bolt leaves `muzzle` on the fire frame.
  attack_b  HIP-FIRE SNAP: drops into a wide low crouch with the rifle braced at the hip, the
          coils whining (the held extreme), snaps one bolt off from the hip; the kick throws the
          muzzle up and pops the spent cell, then the A cell slap and settle
  attack_c  KNEELING SHOT: drops onto one knee, tucks the rifle in tight and squints down the barrel
          (the held extreme), fires low and level; the kick rocks him back on his heel
  hit     light: the head snaps back, the antenna whips, eyes > <
  die     D1 fling and spin, X eyes, the rifle flung wide
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

SLUG = "pulse_trooper"
GAIT_NAME = "biped"
NAME = "Pulse Trooper"
HEIGHT_LU = 70
CANVAS = (300, 232)
FEET = (104, 204)
ANCHORS = {"head": (2, 68), "hitCenter": (0, 32), "muzzle": (54, 30)}
NO_RETIME = True

G0 = (4.0, -15.0, 27.0)     # rifle grip at rest (character space); the rifle is a torso child
FORE = 15.0                 # the far hand grips the foregrip this far along the rifle
K_ = 1.15
MUZZLE = (G0[0] + 55.0 * K_ - 4.0, G0[1], G0[2] + 3.6)
HATCH = (G0[0] + 10.0 * K_, G0[1], G0[2] + 8.6)


def X(dx):
    return G0[0] + dx * K_


RIG = None


def build(rig):
    global RIG
    RIG = rig
    KF.skeleton_v3(rig, head=(1, 0, 39))
    KF.legs_v3(rig)
    gx, gy, gz = G0
    rig.joint("gun", "torso", G0)

    # antenna behind the helmet (follow-through)
    rig.secondary("antenna", "head", (-7.5, 7.0, 55.0), (-12.5, 8.4, 69.0), max_deg=18, gain=1.4)
    g = Geo().capsule((-7.5, 7.0, 55.0), (-12.2, 8.4, 68.0), 0.9)
    rig.part("antenna", g, F.SUIT, outline=1.0)
    g = Geo().sphere((-12.4, 8.5, 69.0), 2.1, cuts=3)
    rig.part("antenna", g, glow=F.MAGENTA, outline=1.0, outline_hex=F.MAGENTA)

    # power pack cable from the backpack to the rifle butt (follow-through)
    rig.secondary("cable", "torso", (-12.0, -5.0, 25.0), (-6.0, -10.0, 13.0), max_deg=16, gain=1.2)
    g = Geo()
    pts = [(-12.0, -5.0, 25.0), (-11.5, -8.0, 18.0), (-7.0, -10.5, 14.0), (-1.0, -12.5, 15.5)]
    for a, b in zip(pts, pts[1:]):
        g.capsule(a, b, 1.3, segs=8, rings=2)
    rig.part("cable", g, F.GUNMETAL, outline=0.6)

    F.arm_parts(rig, "l")
    F.torso_armor(rig, pack=True)
    g = Geo().blob((-11.4, 0, 36.6), (4.8, 8.8, 2.2), p=3.4)      # team band on the pack
    rig.part("torso", g, team=True, outline=0.6)
    g = Geo().blob((1.0, 0, 39.0), (7.6, 7.8, 1.8), p=2.6)         # white gorget
    rig.part("torso", g, F.ARMOR, finish="gloss", outline_hex=F.TRIM)
    g = Geo().blob((0.6, 0, 16.6), (10.4, 10.2, 4.0), p=2.8, taper=(1.1, 1.0))
    g.clip((0, 0, 13.0), (0, 0, -1))
    rig.part("hips", g, F.ARMOR, finish="gloss", outline_hex=F.TRIM)
    g = Geo().blob((5.0, -9.6, 20.2), (2.6, 1.8, 2.8), p=3.2).blob((-2.8, -9.6, 20.4), (2.4, 1.8, 2.6), p=3.2)
    rig.part("torso", g, F.GUNMETAL, outline=0.6)
    chest = Geo().blob((1.8, 0, 32.0), (9.8, 10.6, 7.6), p=3.0, taper=(0.9, 1.0))
    cf = FC.Face(rig, "torso", [chest])
    g = KF.hexmark(cf, Geo(), K.scr(cf, (6.0, -9.0, 32.0)), s=0.9, w=1.3)
    rig.part("torso", g, KF.HEX_PALE, highlight=False, outline=0)

    # helmet: white dome and faceplate, a team cap with a crest, a dark visor with the eyes
    g = Geo().blob((2, 0, 52), (11.4, 11.0, 11.6), p=2.5)
    g.blob((0, 0, 43.2), (7.5, 7.5, 3.2), p=2.4)
    rig.part("head", g, F.ARMOR, finish="gloss", outline_hex=F.TRIM)
    g = Geo().blob((2, 0, 52.1), (11.75, 11.35, 11.95), p=2.5, cuts=8)
    g.clip((0, 0, 48.6), (0, 0, -1))
    g.clip((8.4, 0, 51.0), (1, 0, -0.3))
    g.blob((-0.5, 0, 63.6), (10.4, 2.8, 2.6), p=2.8, rot=(0, -8, 0))
    rig.part("head", g, team=True)
    visor = Geo().blob((10.2, -0.6, 50.8), (4.8, 10.0, 5.4), p=3.2)
    KF.visor_face(rig, "head", [visor], (11.0, 51.0), eye_dx=(0.0, 3.5), eye_rx=1.7, eye_rz=2.5)
    rig.part("head", visor, F.VISOR_DARK, finish="gloss", outline_hex=F.SUIT)
    g = Geo().blob((-3.5, -10.4, 51.0), (4.4, 2.0, 4.4), p=2.4)       # ear pod
    rig.part("head", g, F.SUIT)
    g = Geo().blob((-3.5, -12.2, 51.0), (1.8, 0.8, 1.8), p=2.2)
    rig.part("head", g, glow=F.MINT, outline=0)

    F.arm_parts(rig, "r")
    F.shoulders(rig)
    KF.strip(rig, "arm_r", [(-4.0, -18.0, 38.0), (0.6, -18.4, 39.4), (5.2, -17.8, 38.0)], r=0.8)

    # the plasma rifle along +X from the grip
    g = Geo().blob((X(12), gy + 1, gz + 3.5), (13.5 * K_, 3.4, 4.2), p=3.6)          # receiver
    g.blob((gx - 7, gy + 1, gz + 2.5), (6.0, 2.6, 3.9), p=3.4, rot=(0, 10, 0))      # stock
    g.blob((gx + 0.5, gy + 1, gz - 1.5), (2.2, 2.0, 4.2), p=2.8, rot=(0, -12, 0))   # grip
    g.blob((X(15), gy + 2, gz - 1.0), (2.0, 1.8, 3.4), p=2.8, rot=(0, -8, 0))       # foregrip
    rig.part("gun", g, F.SUIT)
    g = Geo().blob((X(14), gy + 1, gz + 7.2), (11.5 * K_, 3.0, 2.4), p=3.4)         # top shroud
    g.lathe([(3.4, 0), (3.6, 4), (3.0, 16.5), (0, 16.7)], (X(26), gy + 1, gz + 3.5),
            (X(44), gy + 1, gz + 3.5), segs=14)
    rig.part("gun", g, F.ARMOR, finish="gloss", outline_hex=F.TRIM)
    g = Geo().blob((X(12), gy - 2.2, gz + 3.8), (5.0, 0.8, 1.8), p=3.2)            # team side panel
    rig.part("gun", g, team=True, outline=0.5)
    rings = [X(20), X(24), X(28)]
    g = Geo()
    for x in rings:
        g.lathe([(0, -0.8), (4.4, -0.7), (4.4, 0.7), (0, 0.8)], (x, gy + 1, gz + 3.5), (x + 1, gy + 1, gz + 3.5), segs=16)
    rig.part("gun", g, glow=F.MINT, outline=1.0, outline_hex=F.SUIT)
    for i, x in enumerate(rings):      # heated coils: a bigger pale ring per coil (charge)
        rig.joint(f"coil{i}", "gun", (x, gy, gz + 3.5), hidden=True)
        g = Geo().lathe([(0, -1.2), (5.6, -1.0), (5.6, 1.0), (0, 1.2)], (x, gy + 0.6, gz + 3.5),
                        (x + 1, gy + 0.6, gz + 3.5), segs=18)
        rig.part(f"coil{i}", g, glow=F.MINT_CORE, outline=1.0, outline_hex=F.MINT)
    g = Geo().lathe([(0, -0.5), (3.2, -0.4), (5.8, 1.6), (6.2, 4.0), (4.6, 4.6), (0, 4.7)],
                    (X(44) - 1.0, gy + 1, gz + 3.5), (X(44) + 10, gy + 1, gz + 3.5), segs=18)
    rig.part("gun", g, F.SUIT, finish="gloss")
    g = Geo().lathe([(3.0, 0), (6.4, 0.2), (6.4, 1.8), (3.2, 2.0)], (X(44) + 2.8, gy + 1, gz + 3.5),
                    (X(44) + 12, gy + 1, gz + 3.5), segs=18)
    rig.part("gun", g, F.MAGENTA)
    # the top cell (a glowing capsule in a hatch); swapped after the shot
    hx, hy, hz = HATCH
    g = Geo().blob((hx, hy + 1, hz - 0.4), (4.4, 3.2, 1.6), p=3.0)
    rig.part("gun", g, F.GUNMETAL, outline=0.6)
    rig.joint("cell", "gun", HATCH)
    g = Geo().capsule((hx - 3.0, hy + 0.6, hz + 1.0), (hx + 3.0, hy + 0.6, hz + 1.0), 1.9)
    rig.part("cell", g, glow=F.MINT, outline=1.0, outline_hex=F.SUIT)
    rig.joint("cell_loose", "root", HATCH, hidden=True)
    g = Geo().capsule((hx - 3.0, hy - 1.0, hz + 1.0), (hx + 3.0, hy - 1.0, hz + 1.0), 2.0)
    rig.part("cell_loose", g, "#7FA79A", outline=1.0, outline_hex=F.SUIT)
    # the far hand on the foregrip and the near hand on the grip ride with the rifle
    rig.track("muzzle", "gun", MUZZLE)

    # muzzle charge ball, flash and vent steam
    mx, my, mz = MUZZLE
    rig.joint("charge", "gun", MUZZLE, hidden=True)
    g = Geo().sphere((mx + 2.5, my - 1.0, mz), 3.8, cuts=4)
    rig.part("charge", g, glow=F.MINT_CORE, outline=1.4, outline_hex=F.MINT)
    rig.joint("flash", "gun", MUZZLE, hidden=True)
    g = Geo().blob((mx + 9.5, my - 1, mz), (10.0, 1.6, 3.6), p=2.0)
    g.blob((mx + 5.0, my - 1, mz + 2.6), (6.4, 1.5, 2.0), p=2.0, rot=(0, -34, 0))
    g.blob((mx + 5.0, my - 1, mz - 2.6), (6.4, 1.5, 2.0), p=2.0, rot=(0, 34, 0))
    rig.part("flash", g, glow=F.MINT, outline=0)
    g = Geo().blob((mx + 6.0, my - 2, mz), (6.4, 1.4, 2.1), p=2.0)
    rig.part("flash", g, glow=F.WHITE, outline=0)
    F.puff(rig, "gun", (X(22), gy, gz + 11.0), size=0.9, name="vent", spread=1.4)


# -- poses -----------------------------------------------------------------------------------
LOW = (6.0, 25.0, -8.0)      # low ready: grip x, z (torso space), rifle angle
AIM = (7.5, 34.5, 0.0)       # shouldered


def hold(gx, gz, deg):
    return F.hold2("gun", G0, FORE * K_, gx, gz, deg)


STANCE = merge(hold(*LOW), {"torso": {"r": -2.0}})


def _idle(f):
    tap = [0.0, 0.45, 1.0, 1.0, 0.4, 0.0][f]

    def extra(ctx):
        return {"antenna": {"r": 0.0}}
    pose = M.idle_v2(f, STANCE, frames=6, extra=extra, blink=4, face_blink=KF.glyph("g_blink"))
    pose = merge(pose, {"gun": {"r": 1.4 * math.cos(2 * math.pi * f / 6)}})
    if tap > 0:
        # the far hand leaves the foregrip and taps the side of the visor
        a0, f0 = F.ik2(F.SH, (LOW[0] + FORE * K_ * math.cos(math.radians(LOW[2])),
                              LOW[1] + FORE * K_ * math.sin(math.radians(LOW[2]))))
        a1, f1 = F.ik2(F.SH, (7.0, 50.0))
        pose.update(F.arm("l", a0 + (a1 - a0) * tap, f0 + (f1 - f0) * tap))
        pose["head"] = dict(pose.get("head", {}), r=pose.get("head", {}).get("r", 0.0) - 5 * tap)
        if f == 3:
            pose = merge(pose, KF.glyph("g_happy"))
    return pose


# -- walk v3: G1 bounce jog at ground speed (card 65 x 1.25 = 81.25 lu/s), 8 x 77 ms -------------
SPEED = 81.25
LEGS = KF.legs_ik()
GAIT = KF.jog_gait(LEGS, SPEED, cycle_ms=616)
# walk carry: the rifle at port, slanted up across the chest, the far hand on the receiver
PORT = (1.0, 23.0, 34.0)
PORT_FORE = 9.5


def carry(gx, gz, deg):
    return F.hold2("gun", G0, PORT_FORE, gx, gz, deg)


def _walk(f, report=None):
    def extra(ctx):
        lag = ctx["bob_lag"] / max(ctx["amp"], 1e-3)
        return merge(carry(PORT[0], PORT[1] + 1.0 * lag, PORT[2] - 4.0 * lag),
                     {"antenna": {"r": 0.0}, "head": {"r": 4.0 - 2.0 * lag}})
    return M.walk_v3(RIG, f, {"torso": {"r": -3.0}}, GAIT, legs=LEGS, lean=-10.0, twist=6.0, nod=3.0,
                     extra=extra, report=report)


# -- attack: shoulder, charge, snap, cell swap (748 ms, impact at 374 ms = 0.5, as shipped) -----
ATTACK_MS = [50, 60, 80, 184, 90, 70, 70, 60, 84]
ATTACK_IMPACT = 4
#     raise  aim  charge HOLD  FIRE kick  pop  slap settle
GX = [7.0, 7.5, 7.5, 7.5, 7.5, 4.0, 5.0, 6.0, 6.0]
GZ = [30.0, 34.5, 34.5, 34.0, 34.5, 37.0, 33.0, 29.0, 26.0]
DEG = [-4.0, 0.0, 0.0, 0.0, 0.0, 22.0, 10.0, 0.0, -6.0]
BX = [0.0, 0.5, 0.5, 1.0, 0.0, -4.0, -2.0, -0.5, 0.0]
BZ = [0.0, -0.4, -0.8, -1.4, -0.6, 0.6, 0.2, 0.0, 0.0]
BQ = [0.0, -0.02, -0.04, -0.07, 0.04, -0.10, 0.03, -0.02, 0.0]
TR = [-2, -4, -5, -6, -3, 8, 4, 0, -2]
HR = [-2, -6, -8, -9, -6, 8, 2, -4, -1]
CHG = [0, 0, 0.6, 1.25, 0, 0, 0, 0, 0]
CELL = [None, None, None, None, None, (0.0, 7.0, 40), (-6.0, 16.0, 160), (-12.0, 8.0, 290), None]
EYES = ["eyes", "g_angry", "g_angry", "g_angry", "g_squint", "g_hurt", "eyes", "g_angry", "eyes"]


def _attack_pose(f):
    pose = merge(hold(GX[f], GZ[f], DEG[f]), {
        "torso": {"r": TR[f]},
        "head": {"r": HR[f], "x": 1.0 if f in (1, 2, 3, 4) else 0.0},
        "thigh_r": {"r": [4, 10, 14, 16, 14, 8, 6, 4, 2][f]},
        "shin_r": {"r": [0, -4, -8, -10, -8, -2, -2, 0, 0][f]},
        "thigh_l": {"r": [-4, -10, -14, -16, -18, -14, -10, -6, -4][f]},
        "shin_l": {"r": [0, -2, -6, -8, -6, 0, 0, 0, 0][f]},
        "charge": {"show": CHG[f] > 0, "s": max(CHG[f], 0.01)},
        "coil0": {"show": f in (2, 3)}, "coil1": {"show": f == 3 or f == 2}, "coil2": {"show": f == 3},
        "flash": {"show": f == 4},
        "vent": {"show": f in (5, 6), "s": [1, 1, 1, 1, 1, 0.8, 1.25, 1, 1][f], "z": [0, 0, 0, 0, 0, 0, 3, 0, 0][f]},
    }, M.body_about((0, 0, 22), x=BX[f], z=BZ[f], q=BQ[f]))
    if f in (2, 3):
        pose["body"]["x"] += 0.35 if f == 3 else -0.2       # a charge tremble
    if CELL[f] is not None:
        x, z, r = CELL[f]
        pose["cell"] = {"hide": True}
        pose["cell_loose"] = {"show": True, "x": x, "z": z, "r": r}
    if f == 7:
        # the far hand slaps a fresh cell into the top hatch
        a, fo = F.ik2(F.SH, (GX[f] + 11.0 * K_, GZ[f] + 10.0))
        pose.update(F.arm("l", a, fo))
    return KI.ground_feet(RIG, merge(pose, KF.glyph(EYES[f])), LEGS)


def _attack_clip():
    ov = {
        4: [{"kind": "burst", "joint": "gun", "point": MUZZLE, "r0_lu": 8.0, "r1_lu": 14.0, "n": 5,
             "a0": -60.0, "arc": 120.0, "color": F.MINT_CORE}],
        3: [{"kind": "rings", "joint": "gun", "point": (MUZZLE[0] - 2.0, MUZZLE[1], MUZZLE[2]), "radii_lu": (6.5, 10.0),
             "a0": -70.0, "a1": 70.0, "color": F.MINT_CORE}],
        7: [{"kind": "burst", "joint": "gun", "point": (HATCH[0], HATCH[1], HATCH[2] + 3.0), "r0_lu": 3.5,
             "r1_lu": 7.0, "n": 4, "a0": 30.0, "arc": 120.0, "color": "#FFFFFF"}],
    }
    return M.clip("attack", [_attack_pose(f) for f in range(9)], ATTACK_MS, impact=ATTACK_IMPACT, overlays=ov)


# -- attack B: hip-fire snap (A's 748 ms, impact at 374 ms) -------------------------------------
# steps: drop 50, brace 70, HOLD 194 (a wide low crouch, the rifle braced at the hip, coils
# whining), snap 60 | FIRE 90, kick 70 (the muzzle thrown up, the spent cell pops), rise 70,
# A slap 60, A settle 84
B_MS = [50, 70, 194, 60, 90, 70, 70, 60, 84]
#      drop  brace HOLD  snap  FIRE  kick  rise
B_GX = [5.0, 3.0, 2.0, 3.5, 3.5, 0.5, 4.0]
B_GZ = [26.0, 21.5, 20.0, 20.5, 20.5, 24.0, 27.0]
B_DEG = [-6.0, 4.0, 7.0, 2.0, 2.0, 36.0, 14.0]
B_BX = [0.0, -0.5, -1.0, 0.5, -1.0, -4.5, -2.0]
B_BZ = [-2.0, -6.0, -8.0, -7.5, -7.0, -5.0, -2.5]
B_BQ = [-0.03, -0.06, -0.09, 0.0, 0.05, -0.08, 0.02]
B_TR = [-4, 4, 7, 4, 6, 14, 5]
B_HR = [-4, -6, -8, -6, -4, 10, 2]
B_THR = [10, 24, 30, 30, 30, 24, 12]
B_SHR = [-6, -18, -24, -24, -22, -16, -8]
B_THL = [-10, -22, -28, -28, -30, -24, -12]
B_SHL = [-4, -16, -22, -22, -20, -12, -6]
B_EYES = ["g_angry", "g_angry", "g_angry", "g_squint", "g_squint", "g_hurt", "eyes"]


def _b_pose(i):
    if i in (7, 8):
        return _attack_pose(i)
    k = i
    pose = merge(hold(B_GX[k], B_GZ[k], B_DEG[k]), {
        "torso": {"r": B_TR[k]}, "head": {"r": B_HR[k]},
        "thigh_r": {"r": B_THR[k]}, "shin_r": {"r": B_SHR[k]},
        "thigh_l": {"r": B_THL[k]}, "shin_l": {"r": B_SHL[k]},
        "charge": {"show": k in (2, 3), "s": 0.8 if k == 2 else 1.05},
        "coil0": {"show": k in (1, 2, 3)}, "coil1": {"show": k in (2, 3)}, "coil2": {"show": k == 3},
        "flash": {"show": k == 4},
        "vent": {"show": k == 6, "s": 1.1, "z": 2.0},
    }, M.body_about((0, 0, 22), x=B_BX[k], z=B_BZ[k], q=B_BQ[k]))
    if k == 2:
        pose["body"]["x"] += 0.3      # a charge tremble
    if k in (5, 6):
        x, z, r = CELL[k]
        pose["cell"] = {"hide": True}
        pose["cell_loose"] = {"show": True, "x": x, "z": z, "r": r}
    return KI.ground_feet(RIG, merge(pose, KF.glyph(B_EYES[k])), LEGS)


def _attack_b():
    ov = {
        4: [{"kind": "burst", "joint": "gun", "point": MUZZLE, "r0_lu": 8.0, "r1_lu": 14.0, "n": 5,
             "a0": -60.0, "arc": 120.0, "color": F.MINT_CORE},
            {"kind": "dust", "ground": (-12.0, 0.0), "size_lu": 5.0, "puffs": 3, "seed": 61, "spread": 0.8,
             "color": "#DDE3E8"}],
        2: [{"kind": "rings", "joint": "gun", "point": (MUZZLE[0] - 2.0, MUZZLE[1], MUZZLE[2]), "radii_lu": (5.5, 8.5),
             "a0": -70.0, "a1": 70.0, "color": F.MINT_CORE}],
    }
    reuse = {7: ("attack", 7), 8: ("attack", 8)}
    return M.clip("attack_b", [_b_pose(i) for i in range(9)], B_MS, impact=4, overlays=ov, reuse=reuse,
                  extra={"holdStep": 2})


# -- attack C: kneeling shot (A's timing) --------------------------------------------------------
# steps: A raise 50, kneel 60, tuck 80, HOLD 184 (on one knee, the rifle tucked in tight, squinting
# down the barrel) | FIRE 90, rock back 70, rock 70, rise 60, A settle 84
C_MS = [50, 60, 80, 184, 90, 70, 70, 60, 84]
#      kneel tuck  HOLD  FIRE  rock  rock2 rise
C_GX = [6.5, 8.0, 8.5, 8.5, 5.0, 6.0, 6.5]
C_GZ = [30.0, 31.5, 31.5, 31.5, 34.0, 32.0, 29.0]
C_DEG = [-2.0, 0.0, 0.0, 0.0, 16.0, 6.0, 0.0]
C_DROP = [8.0, 14.0, 14.0, 14.0, 14.0, 12.0, 6.0]
C_TR = [-6, -9, -10, -8, 4, -2, -3]
C_HR = [-6, -10, -12, -8, 6, 0, -2]
C_BX = [0.0, 0.5, 0.8, 0.0, -3.0, -1.5, -0.5]
C_EYES = ["g_angry", "g_squint", "g_squint", "g_squint", "g_hurt", "g_angry", "eyes"]


def _c_pose(i):
    if i in (0, 8):
        return _attack_pose(i)
    k = i - 1
    pose = merge(hold(C_GX[k], C_GZ[k], C_DEG[k]), {
        "torso": {"r": C_TR[k]}, "head": {"r": C_HR[k], "x": 1.0 if k in (1, 2, 3) else 0.0},
        "charge": {"show": k in (1, 2), "s": 0.6 if k == 1 else 1.1},
        "coil0": {"show": k in (1, 2)}, "coil1": {"show": k == 2}, "coil2": {"show": k == 2},
        "flash": {"show": k == 3},
        "vent": {"show": k in (4, 5), "s": 1.0 if k == 4 else 1.2, "z": 0.0 if k == 4 else 3.0},
    }, M.body_about((0, 0, 22), x=C_BX[k]))
    if k == 2:
        pose["body"]["x"] += 0.3
    pose = merge(pose, KF.glyph(C_EYES[k]))
    return KI.kneel(RIG, pose, LEGS, drop=C_DROP[k], front=13.0)


def _attack_c():
    ov = {
        4: [{"kind": "burst", "joint": "gun", "point": MUZZLE, "r0_lu": 8.0, "r1_lu": 14.0, "n": 5,
             "a0": -60.0, "arc": 120.0, "color": F.MINT_CORE},
            {"kind": "dust", "ground": (-14.0, 0.0), "size_lu": 5.5, "puffs": 3, "seed": 62, "spread": 0.9,
             "color": "#DDE3E8"}],
        3: [{"kind": "rings", "joint": "gun", "point": (MUZZLE[0] - 2.0, MUZZLE[1], MUZZLE[2]), "radii_lu": (6.5, 10.0),
             "a0": -70.0, "a1": 70.0, "color": F.MINT_CORE}],
    }
    reuse = {0: ("attack", 0), 8: ("attack", 8)}
    return M.clip("attack_c", [_c_pose(i) for i in range(9)], C_MS, impact=4, overlays=ov, reuse=reuse,
                  extra={"holdStep": 3})


def _hit(k):
    def recoil(a):
        up = max(a, 0)
        return merge(hold(LOW[0] - 2 * up, LOW[1] + 2 * up, LOW[2] + 18 * a),
                     {"head": {"r": 16 * a}, "torso": {"r": 12 * a},
                      "thigh_r": {"r": 22 * up}, "shin_r": {"r": -26 * up}})
    return M.hit_light(k, {"torso": {"r": -2.0}}, recoil, face_hurt=KF.glyph("g_hurt"),
                       face_back=KF.glyph("g_angry") if k == 2 else None)


def _die(k):
    flail = [0.3, 1.0, 1.0, 0.8, 0.2, 0.5, 0.1, 0.0, 0.0, 0.0][k]
    landed = [0, 0, 0, 0, 0.8, 1, 1, 1, 1, 1][k]
    pose = merge(hold(LOW[0] + 2, LOW[1] + 4 * flail - 3 * landed, LOW[2] + 40 * flail - 78 * landed), M.die_d1(k, center_z=28.0, lie_z=11.0,
                                                                                  height=HEIGHT_LU), {
        "torso": {"r": 10 * flail}, "head": {"r": 14 * flail - 6},
        "thigh_r": {"r": 40 * flail + 20}, "shin_r": {"r": -30 * flail},
        "thigh_l": {"r": -20 * flail + 10}, "shin_l": {"r": -20 * flail},
    })
    g = "g_hurt" if k == 0 else ("g_wide" if k < 4 else "eyes_x")
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
    return M.check_variants(M.check_contract(cl, attack_ms=748, attack_impact_at=0.5))
