"""Rail Gunner: Future Age anti-armour ranged (DESIGN A5.6). Instant rail (fx.beam_rail, laser
damage), pierces; ~74 lu, medium.

Look (A11, Future palette): heavier than the pulse trooper so the two read apart. A broad
white-armoured gunner with a big team pauldron (a mint light strip), a team chest plate with the
pale Future hex, a flat-topped helmet with a team cap, a dark visor with mint robot eyes that act and
a magenta scope monocle over the near eye, a tall capacitor pack with cooling fins and a team side
panel, cabled to an oversized twin-rail cannon held at the hip: two long white prongs that open
apart, a magenta channel between them, three team coil rings round the breech.

Animation (art director plan 2026-09-30, `ageborn_art/moves.py`):
  idle    the cannon at the hip, the capacitor pack vents a puff of steam, a blink
  walk    walk v3 jog at ground speed (ANIM_SPEC G1, 81.25 lu/s): heavy and a little bow-legged,
          the cannon carried up on the near shoulder, bobbing a frame late, planted feet
  attack  KNEEL AND RAIL SNAP: drops to one knee and levels the cannon on his thigh, the rails
          spread open, magenta arcs crackle between them and grow (the held extreme, angry eyes),
          one long snap flash with a shock ring, the recoil shoves him back sliding on his knee
          (dust), the rails clack shut and vent steam, he stands. The rail beam starts at the
          per-frame `muzzle` anchor of the fire frame.
  attack_b  STANDING SHOULDER SHOT: plants his feet wide and snaps the cannon up to his shoulder,
          level at eye height, the rails spread and crackle (the held extreme), one snap; the
          recoil shoves him back a hop with the muzzle kicked high, then the rails clack shut
  hit     light: the head snaps back, the cannon kicks up, eyes > <
  die     D1 fling and spin, X eyes, the cannon flung wide
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

SLUG = "rail_gunner"
GAIT_NAME = "biped"
NAME = "Rail Gunner"
HEIGHT_LU = 74
CANVAS = (340, 240)
FEET = (112, 214)
ANCHORS = {"head": (2, 70), "hitCenter": (0, 34), "muzzle": (62, 17)}
NO_RETIME = True

G0 = (2.0, -15.5, 25.0)     # grip at rest (character space); the gun is a torso child
FORE = 17.0                 # far hand: this far along the gun from the grip
RAIL0, RAIL1 = 20.0, 58.0   # rails from/to (x from the grip)
MUZZLE = (G0[0] + RAIL1 + 1.0, G0[1], G0[2] + 3.0)


RIG = None


def build(rig):
    global RIG
    RIG = rig
    KF.skeleton_v3(rig, head=(1, 0, 39))
    KF.legs_v3(rig, thigh_r=4.8)
    rig.joint("gun", "torso", G0)
    gx, gy, gz = G0

    # capacitor pack (behind the torso): a charcoal cylinder, a magenta window, a team panel, fins
    g = Geo().capsule((-13.5, 0.5, 21.0), (-15.0, 0.5, 46.0), 6.2, 5.6)
    rig.part("torso", g, F.SUIT)
    g = Geo().blob((-13.8, -4.8, 33.0), (4.6, 1.6, 8.6), p=3.2)
    rig.part("torso", g, team=True, outline=0.6)
    g = Geo().capsule((-19.6, -1.0, 27.0), (-20.5, -1.0, 42.0), 1.6)
    rig.part("torso", g, glow=F.MAGENTA, outline=1.0, outline_hex=F.SUIT)
    g = Geo()
    for z in (48.0, 51.0, 54.0):
        g.blob((-15.0, 0.5, z), (5.4 - 0.5 * (z - 48) / 3, 5.4, 0.9), p=3.0)
    rig.part("torso", g, F.ARMOR, finish="gloss", outline_hex=F.TRIM)
    F.puff(rig, "torso", (-15.0, -2.0, 58.0), size=0.9, name="pack_steam", spread=1.2)

    # cable from the pack to the breech (follow-through)
    rig.secondary("cable", "torso", (-17.0, -2.0, 24.0), (-4.0, -10.0, 16.0), max_deg=14, gain=1.1)
    g = Geo()
    pts = [(-17.0, -2.0, 24.0), (-12.0, -6.0, 17.0), (-4.0, -10.0, 16.5), (gx - 2.0, gy + 3.0, gz - 3.0)]
    for a, b in zip(pts, pts[1:]):
        g.capsule(a, b, 1.3, segs=8, rings=2)
    rig.part("cable", g, F.GUNMETAL, outline=0.6)

    F.arm_parts(rig, "l", r0=4.4, r1=3.9, fist=4.4)
    g = Geo().blob((0.5, 11.6, 38.0), (6.2, 5.4, 5.0), p=2.6)
    rig.part("arm_l", g, team=True)
    F.torso_armor(rig, pack=False, bulk=1.08)
    g = Geo().blob((1.0, 0, 38.2), (8.8, 9.0, 2.6), p=2.6)     # white gorget
    rig.part("torso", g, F.ARMOR, finish="gloss", outline_hex=F.TRIM)
    g = Geo().blob((0.6, 0, 16.8), (10.8, 10.6, 4.4), p=2.8, taper=(1.1, 1.0))
    g.clip((0, 0, 12.6), (0, 0, -1))
    rig.part("hips", g, F.ARMOR, finish="gloss", outline_hex=F.TRIM)
    g = Geo().blob((5.0, -10.4, 20.2), (2.8, 1.8, 2.8), p=3.2).blob((-3.0, -10.2, 20.4), (2.6, 1.8, 2.6), p=3.2)
    rig.part("torso", g, F.GUNMETAL, outline=0.6)
    chest = Geo().blob((1.8, 0, 32.0), (10.4, 11.2, 7.6), p=3.0, taper=(0.9, 1.0))
    cf = FC.Face(rig, "torso", [chest])
    g = KF.hexmark(cf, Geo(), K.scr(cf, (6.0, -9.6, 31.5)), s=0.9, w=1.3)
    rig.part("torso", g, KF.HEX_PALE, highlight=False, outline=0)

    # helmet: white, flat-topped with a team cap, dark visor with the eyes, magenta scope
    g = Geo().blob((2.0, 0, 51.0), (11.8, 11.4, 11.4), p=2.8)
    g.blob((1.5, 0, 42.4), (7.6, 7.6, 3.2), p=2.4)
    rig.part("head", g, F.ARMOR, finish="gloss", outline_hex=F.TRIM)
    g = Geo().blob((1.0, 0, 55.5), (12.4, 12.0, 7.6), p=3.2)
    g.clip((0, 0, 54.0), (0, 0, -1))
    g.clip((9.2, 0, 57.0), (1, 0, -0.5))
    rig.part("head", g, team=True)
    visor = Geo().blob((10.2, 0, 49.8), (4.2, 9.0, 4.4), p=3.4)
    KF.visor_face(rig, "head", [visor], (11.4, 50.0), eye_dx=(0.0, 3.2), eye_rx=1.5, eye_rz=2.2)
    rig.part("head", visor, F.VISOR_DARK, finish="gloss", outline_hex=F.SUIT)
    rig.joint("scope", "head", (4.0, -12.0, 51.0))
    g = Geo().capsule((-2.0, -12.0, 51.0), (9.0, -11.0, 52.6), 1.4)
    rig.part("scope", g, F.SUIT, outline=0.7)
    g = Geo().lathe([(0, 0), (2.8, 0.2), (3.0, 3.0), (0, 3.2)], (9.6, -10.2, 53.4), (12.6, -9.4, 53.6), segs=16)
    rig.part("scope", g, F.SUIT, finish="gloss")
    g = Geo().lathe([(0, 0), (1.9, 0.2), (1.7, 0.8), (0, 1.0)], (12.4, -9.4, 53.6), (13.4, -9.1, 53.6), segs=16)
    rig.part("scope", g, glow=F.MAGENTA, outline=0)

    F.arm_parts(rig, "r", r0=4.4, r1=3.9, fist=4.4)
    g = Geo().blob((0.2, -13.4, 38.6), (8.0, 6.6, 6.4), p=2.6)
    g.blob((0.8, -14.2, 34.2), (6.4, 5.4, 2.6), p=2.6)
    rig.part("arm_r", g, team=True)
    KF.strip(rig, "arm_r", [(-5.0, -19.6, 38.4), (0.2, -20.0, 40.2), (5.2, -19.4, 38.4)], r=0.85)

    # the rail cannon along +X from the grip
    g = Geo().blob((gx + 6.0, gy + 1.0, gz + 2.0), (13.0, 3.8, 5.0), p=3.6)          # receiver
    g.blob((gx - 7.0, gy + 1.0, gz + 1.0), (6.0, 3.0, 4.2), p=3.4, rot=(0, 12, 0))  # stock
    g.blob((gx + 0.5, gy + 1.0, gz - 2.6), (2.2, 2.0, 4.0), p=2.8, rot=(0, -12, 0))  # grip
    g.blob((gx + FORE, gy + 2.0, gz - 2.0), (2.0, 1.8, 3.4), p=2.8, rot=(0, -8, 0))  # foregrip
    rig.part("gun", g, F.SUIT, finish="gloss")
    g = Geo().blob((gx + 8.0, gy + 1.0, gz + 7.2), (10.0, 3.0, 2.2), p=3.4)          # top shroud
    rig.part("gun", g, F.ARMOR, finish="gloss", outline_hex=F.TRIM)
    g = Geo()
    for x in (gx + 10.5, gx + 14.0, gx + 17.5):
        g.lathe([(0, -0.9), (5.6, -0.8), (5.6, 0.8), (0, 0.9)], (x, gy + 1.0, gz + 2.0),
                (x + 1, gy + 1.0, gz + 2.0), segs=18)
    rig.part("gun", g, team=True, outline=0.7)
    # twin rails on their own joints (they open apart on the charge)
    for name, dz, h in (("rail_top", 7.4, 2.4), ("rail_bot", -1.4, 2.2)):
        rig.joint(name, "gun", (gx + RAIL0, gy, gz + dz))
        g = Geo().blob((gx + (RAIL0 + RAIL1) / 2, gy + 1.0, gz + dz), ((RAIL1 - RAIL0) / 2 + 1, 2.9, h),
                       p=3.4, taper=(1.0, 1.0))
        rig.part(name, g, F.ARMOR, finish="gloss", outline_hex=F.TRIM)
        g = Geo().blob((gx + RAIL1 - 3.0, gy + 1.0, gz + dz), (3.2, 3.1, h + 0.3), p=3.0)
        rig.part(name, g, F.GUNMETAL, finish="metal", outline=0.6)
    g = Geo().blob((gx + (RAIL0 + RAIL1) / 2 - 1, gy + 0.4, gz + 3.0), ((RAIL1 - RAIL0) / 2, 1.8, 1.6), p=3.0)
    rig.part("gun", g, glow=F.MAGENTA, outline=0.8, outline_hex=F.SUIT)
    g = Geo().blob((gx + 3.0, gy + 1.0, gz + 10.4), (3.2, 1.6, 1.8), p=3.0)          # rear scope
    rig.part("gun", g, F.SUIT, outline=0.7)
    g = Geo().blob((gx + 6.4, gy + 0.4, gz + 10.4), (0.6, 1.2, 1.2), p=2.4)
    rig.part("gun", g, glow=F.CYAN, outline=0)
    rig.track("muzzle", "gun", MUZZLE)

    # charge arcs between the rails (two sizes), the fire flash with a shock ring, vent steam
    mx, my, mz = MUZZLE
    for name, k in (("arc_a", 0.9), ("arc_b", 1.55)):
        rig.joint(name, "gun", (gx + 40.0, gy, gz + 3.0), hidden=True)
        g = Geo()
        xs = [gx + RAIL0 + 3 + i * 7.0 for i in range(6)]
        for i, x in enumerate(xs):
            s = 1 if i % 2 else -1
            g.capsule((x, gy - 3.5, gz + 3.0 + 4.5 * k * s), (x + 3.5, gy - 3.5, gz + 3.0 - 4.0 * k * s), 0.9 * k + 0.3,
                      segs=8, rings=2)
        rig.part(name, g, glow=F.MAGENTA_CORE, outline=1.0, outline_hex=F.MAGENTA)
        g = Geo().sphere((mx - 1.0, my - 3.5, mz), 3.4 * k + 0.8, cuts=4)
        rig.part(name, g, glow=F.MAGENTA_CORE, outline=1.2, outline_hex=F.MAGENTA)
    rig.joint("flash", "gun", MUZZLE, hidden=True)
    g = Geo().blob((mx + 22.0, my - 1.0, mz), (24.0, 1.6, 5.4), p=2.0)
    g.blob((mx + 7.0, my - 1.0, mz + 5.6), (9.0, 1.4, 2.2), p=2.0, rot=(0, -30, 0))
    g.blob((mx + 7.0, my - 1.0, mz - 5.6), (9.0, 1.4, 2.2), p=2.0, rot=(0, 30, 0))
    rig.part("flash", g, glow=F.MAGENTA, outline=0)
    g = Geo().blob((mx + 18.0, my - 2.0, mz), (19.0, 1.4, 2.6), p=2.0)
    rig.part("flash", g, glow=F.WHITE, outline=0)
    g = Geo().lathe([(9.0, -1.0), (11.0, 0), (9.0, 1.0), (7.6, 0)], (mx + 3.0, my, mz), (mx + 4.0, my, mz), segs=22)
    rig.part("flash", g, glow=F.MAGENTA_CORE, outline=1.0, outline_hex=F.MAGENTA)
    F.puff(rig, "gun", (gx + 36.0, gy, gz + 10.0), size=1.1, name="vent", spread=1.6)


# -- poses -----------------------------------------------------------------------------------
PORT = (6.5, 23.5, -3.0)   # grip x, z, gun angle: held low at the hip


def hold(gx, gz, deg):
    return F.hold2("gun", G0, FORE, gx, gz, deg)


STANCE = hold(*PORT)


def _idle(f):
    def extra(ctx):
        return {}
    pose = M.idle_v2(f, STANCE, frames=6, bob=1.2, extra=extra, blink=1, face_blink=KF.glyph("g_blink"))
    pose = merge(pose, {"gun": {"r": 1.5 * math.cos(2 * math.pi * (f - 1) / 6)}})
    if f in (3, 4):
        pose["pack_steam"] = {"show": True, "s": 0.8 if f == 3 else 1.1, "z": 0.0 if f == 3 else 2.5}
    return pose


# -- walk v3: G1 jog at ground speed (card 65 x 1.25 = 81.25 lu/s), 8 x 77 ms --------------------
SPEED = 81.25
LEGS = KF.legs_ik()
GAIT = KF.jog_gait(LEGS, SPEED, cycle_ms=640, stance=0.40, lift=6.0)
# walk carry: the cannon up on the near shoulder, muzzle tipped up, the far hand on the shroud
SHOULDERED = (-3.0, 26.5, 42.0)


def _walk(f, report=None):
    def extra(ctx):
        lag = ctx["bob_lag"] / max(ctx["amp"], 1e-3)
        return merge(F.hold2("gun", G0, 11.0, SHOULDERED[0], SHOULDERED[1] + 1.2 * lag, SHOULDERED[2] - 3.5 * lag),
                     {"cable": {"r": 0.0}, "head": {"r": 3.0 - 1.5 * lag}})
    return M.walk_v3(RIG, f, {"torso": {"r": -2.0}}, GAIT, legs=LEGS, lean=-8.0, twist=5.0, nod=3.0,
                     sway=3.0, extra=extra, report=report)


# -- attack: kneel and rail snap (832 ms, impact at 416 ms = 0.5, as shipped) ------------------
ATTACK_MS = [60, 60, 80, 216, 90, 80, 80, 80, 86]
ATTACK_IMPACT = 4
#      drop  kneel spread HOLD FIRE  slide  shut  rise settle
KNEEL = [0.6, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 0.45, 0.0]
GX = [6.5, 7.0, 7.5, 7.5, 7.5, 2.0, 4.5, 6.0, 6.5]
GZ = [25.0, 27.0, 27.5, 27.5, 27.5, 30.0, 27.5, 25.5, 23.5]
DEG = [-2.0, 0.0, 0.0, 0.0, 0.0, 14.0, 4.0, 0.0, -3.0]
SPREAD = [0, 0, 1.0, 1.4, 1.6, 1.0, 0.0, 0, 0]
BX = [0.0, 0.5, 0.5, 1.0, 0.5, -7.5, -9.0, -5.0, -1.5]
BQ = [-0.06, 0.03, -0.03, -0.06, 0.05, -0.08, 0.02, 0.02, 0.0]
TR = [-6, -10, -12, -13, -11, -2, -6, -3, 0]
HR = [5, 10, 12, 13, 11, -4, 2, 1, 0]
EYES = ["eyes", "g_angry", "g_angry", "g_angry", "g_squint", "g_hurt", "eyes", "eyes", "eyes"]


def _kneel(t):
    """Down on the near knee (the far foot planted forward), blended in by t."""
    return {"hips": {"z": -9.5 * t},
            "thigh_r": {"r": -12 * t}, "shin_r": {"r": -86 * t},
            "thigh_l": {"r": 78 * t}, "shin_l": {"r": -80 * t}}


def _attack_pose(f):
    k = KNEEL[f]
    pose = merge(hold(GX[f], GZ[f] - 2.0 * k, DEG[f] - TR[f] * k), {
        "torso": {"r": TR[f] * k - 2.0 * (1 - k)}, "head": {"r": HR[f] * k},
        "rail_top": {"z": 2.4 * SPREAD[f], "r": 2.2 * SPREAD[f]},
        "rail_bot": {"z": -2.4 * SPREAD[f], "r": -2.2 * SPREAD[f]},
        "arc_a": {"show": f == 2},
        "arc_b": {"show": f == 3},
        "flash": {"show": f == 4},
        "vent": {"show": f in (5, 6), "s": [1, 1, 1, 1, 1, 0.8, 1.2, 1, 1][f], "z": [0, 0, 0, 0, 0, 0, 3, 0, 0][f]},
        "pack_steam": {"show": f == 6, "s": 1.1},
    }, M.body_about((0, 0, 20), x=BX[f], q=BQ[f]))
    if f in (2, 3):
        pose["body"]["x"] += 0.35 if f == 3 else -0.25
    pose = merge(pose, KF.glyph(EYES[f]))
    if k <= 0:
        return KI.ground_feet(RIG, pose, LEGS)
    return KI.kneel(RIG, pose, LEGS, drop=14.0 * k, front=13.0)


def _attack_clip():
    ov = {
        4: [{"kind": "burst", "joint": "gun", "point": MUZZLE, "r0_lu": 10.0, "r1_lu": 16.0, "n": 6,
             "a0": -70.0, "arc": 140.0, "color": F.MAGENTA_CORE}],
        3: [{"kind": "rings", "joint": "gun", "point": (MUZZLE[0] - 1.0, MUZZLE[1], MUZZLE[2]), "radii_lu": (7.0, 11.0),
             "a0": -70.0, "a1": 70.0, "color": F.MAGENTA_CORE}],
        5: [{"kind": "dust", "ground": (-4.0, 0.0), "size_lu": 6.5, "puffs": 4, "seed": 21, "spread": 1.3,
             "color": "#DDE3E8", "dir": 1.0}],
        6: [{"kind": "dust", "ground": (-10.0, 0.0), "size_lu": 5.0, "puffs": 3, "seed": 22, "spread": 1.0,
             "color": "#DDE3E8"}],
    }
    return M.clip("attack", [_attack_pose(f) for f in range(9)], ATTACK_MS, impact=ATTACK_IMPACT, overlays=ov)


# -- attack B: standing shoulder shot (A's 832 ms, impact at 416 ms) ----------------------------
# steps: brace 60, shoulder 60, spread 80, HOLD 216 (feet wide, the cannon level at eye height, the
# rails spread and crackling) | FIRE 90, shove 80 (a hop back, the muzzle kicked high), shut 80,
# lower 80, A settle 86
B_MS = [60, 60, 80, 216, 90, 80, 80, 80, 86]
#      brace shoul spread HOLD FIRE shove shut lower
B_GX = [5.0, 7.0, 7.5, 7.5, 7.5, 3.0, 5.0, 6.0]
B_GZ = [28.0, 33.5, 34.0, 34.0, 34.0, 38.0, 33.0, 27.0]
B_DEG = [6.0, 0.0, 0.0, 0.0, 0.0, 26.0, 10.0, 0.0]
B_SPREAD = [0, 0.4, 1.0, 1.5, 1.6, 1.0, 0.0, 0.0]
B_BX = [0.0, 0.5, 0.8, 1.0, 0.0, -6.0, -4.0, -1.5]
B_BZ = [-1.0, -2.0, -2.5, -3.0, -2.5, 1.5, -1.0, -0.5]
B_BQ = [-0.03, 0.0, -0.03, -0.06, 0.05, 0.04, -0.06, 0.0]
B_TR = [-2, -4, -5, -6, -4, 10, 2, 0]
B_HR = [-2, -6, -8, -9, -6, 10, 2, 0]
B_THR = [8, 16, 20, 22, 22, 6, 12, 6]
B_SHR = [-4, -10, -12, -14, -12, -24, -10, -4]
B_THL = [-8, -16, -20, -22, -24, -30, -16, -8]
B_SHL = [-4, -8, -10, -12, -10, -30, -8, -4]
B_EYES = ["eyes", "g_angry", "g_angry", "g_angry", "g_squint", "g_hurt", "eyes", "eyes"]


def _b_pose(i):
    if i == 8:
        return _attack_pose(8)
    k = i
    sp = B_SPREAD[k]
    pose = merge(hold(B_GX[k], B_GZ[k], B_DEG[k]), {
        "torso": {"r": B_TR[k]}, "head": {"r": B_HR[k], "x": 1.0 if k in (2, 3, 4) else 0.0},
        "thigh_r": {"r": B_THR[k]}, "shin_r": {"r": B_SHR[k]},
        "thigh_l": {"r": B_THL[k]}, "shin_l": {"r": B_SHL[k]},
        "rail_top": {"z": 2.4 * sp, "r": 2.2 * sp},
        "rail_bot": {"z": -2.4 * sp, "r": -2.2 * sp},
        "arc_a": {"show": k == 2},
        "arc_b": {"show": k == 3},
        "flash": {"show": k == 4},
        "vent": {"show": k in (5, 6), "s": [1, 1, 1, 1, 1, 0.8, 1.2, 1][k], "z": [0, 0, 0, 0, 0, 0, 3, 0][k]},
        "pack_steam": {"show": k in (5, 6), "s": 0.9 if k == 5 else 1.2, "z": 0.0 if k == 5 else 2.5},
    }, M.body_about((0, 0, 22), x=B_BX[k], z=B_BZ[k], q=B_BQ[k]))
    if k == 3:
        pose["body"]["x"] += 0.35
    pose = merge(pose, KF.glyph(B_EYES[k]))
    if k == 5:          # the hop back: both feet just off the ground
        return pose
    return KI.ground_feet(RIG, pose, LEGS)


def _attack_b():
    ov = {
        4: [{"kind": "burst", "joint": "gun", "point": MUZZLE, "r0_lu": 10.0, "r1_lu": 16.0, "n": 6,
             "a0": -70.0, "arc": 140.0, "color": F.MAGENTA_CORE}],
        3: [{"kind": "rings", "joint": "gun", "point": (MUZZLE[0] - 1.0, MUZZLE[1], MUZZLE[2]), "radii_lu": (7.0, 11.0),
             "a0": -70.0, "a1": 70.0, "color": F.MAGENTA_CORE}],
        5: [{"kind": "dust", "ground": (-8.0, 0.0), "size_lu": 6.0, "puffs": 4, "seed": 71, "spread": 1.2,
             "color": "#DDE3E8", "dir": 1.0}],
        6: [{"kind": "dust", "ground": (-14.0, 0.0), "size_lu": 4.5, "puffs": 3, "seed": 72, "spread": 0.9,
             "color": "#DDE3E8"}],
    }
    return M.clip("attack_b", [_b_pose(i) for i in range(9)], B_MS, impact=4, overlays=ov,
                  reuse={8: ("attack", 8)}, extra={"holdStep": 3})


def _hit(k):
    def recoil(a):
        up = max(a, 0)
        return merge(hold(PORT[0] - 2 * up, PORT[1] + 2 * up, PORT[2] + 16 * a),
                     {"head": {"r": 14 * a}, "torso": {"r": 10 * a},
                      "thigh_r": {"r": 18 * up}, "shin_r": {"r": -22 * up}})
    return M.hit_light(k, {}, recoil, face_hurt=KF.glyph("g_hurt"),
                       face_back=KF.glyph("g_angry") if k == 2 else None)


def _die(k):
    flail = [0.3, 1.0, 1.0, 0.8, 0.2, 0.5, 0.1, 0.0, 0.0, 0.0][k]
    landed = [0, 0, 0, 0, 0.8, 1, 1, 1, 1, 1][k]
    pose = merge(hold(PORT[0] + 2, PORT[1] + 4 * flail - 3 * landed, PORT[2] + 36 * flail - 80 * landed),
                 M.die_d1(k, center_z=29.0, lie_z=12.0, height=HEIGHT_LU), {
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
        M.clip("hit", [_hit(k) for k in range(5)], M.HIT_MS),
        M.clip("die", [_die(k) for k in (0, 1, 2, 3, 4, 5, 6, 8)], M.DIE_MS,
               sequence=[0, 1, 2, 3, 4, 5, 6, 6, 7, 7], extra=M.die_meta(HEIGHT_LU)),
    ]
    return M.check_variants(M.check_contract(cl, attack_ms=832, attack_impact_at=0.5))
