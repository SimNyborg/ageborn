"""Hover Tank: Cosmic Age heavy (docs/design-lane-ages.md A17.11). Plasma cannon (proj.plasma, range
90), blast damage, armored mech. Hovers but is a ground unit. ~100 lu with the pennant.

Look (A17.12 vehicle rig, Cosmic palette): a low wedge hull with no wheels, floating on four
glowing hover pads. The upper hull is star white with a sloped violet nose and a void belly
skirt; big team side panels with pale Cosmic stars run the length of the hull, mint panel seams
run along the deck. A low violet turret with team cheeks and an open hatch: the pilot sits in it,
a star-white helmet with a team stripe and a dark visor with mint robot eyes that act. A long
plasma cannon: a star-white barrel with three coil rings (they light up in turn on the charge)
and a violet emitter ring at the muzzle. Each pad is a void disc with a mint glow ring and a
mint thrust cone. An antenna at the back of the turret flies a team pennant.

Animation (art director plan 2026-09-30, `ageborn_art/moves.py`):
  idle    bobs and tilts on its pads (the cones pulse); the pilot pops up for a look, a blink
  walk    glides nose-down, cones flickering (an `odo` joint gives the natural speed, 55 lu/s)
  attack  NOSE-DIP PLASMA SHOT: the hull dips its nose and the front pads flare, the coils light up
          one by one and a plasma ball swells at the muzzle (the held extreme, the pilot squints),
          FIRE: a big mint flash, the barrel slams back, the hull rears and slides back on its
          pads with a smoke puff, then drifts forward and settles; the pilot cheers
  hit     vehicle: the hull bounces on its pads, the pilot ducks into the hatch, sparks
  die     D7 wreck and bail: the pads cut out, the hull drops and tilts nose-up, the pilot ejects
          on a mint jet (X eyes), smoke
"""
import math

from ageborn_art import face as FC
from ageborn_art import kit_cosmic as KC
from ageborn_art import kit_future as KF
from ageborn_art import kit_medieval as KM
from ageborn_art import moves as M
from ageborn_art import rigs_cosmic as K
from ageborn_art.anim import merge, squash
from ageborn_art.geometry import Geo

SLUG = "hover_tank"
NAME = "Hover Tank"
HEIGHT_LU = 112
YAW_DEG = -10.0
CANVAS = (500, 360)
FEET = (214, 330)
ANCHORS = {"head": (0, 100), "hitCenter": (0, 36), "muzzle": (59, 66)}
SCALE = 1.25              # the whole vehicle: the Heavy reads big next to 68 lu infantry
NO_RETIME = True

HOVER = 16.0                  # hull bottom above the ground
TURRET = (-6.0, 0.0, 40.0)
BARREL_Z = 44.0
MUZZLE = (62.0, -1.0, BARREL_Z)
PADS = ((-26.0, -16.0), (24.0, -16.0), (-26.0, 16.0), (24.0, 16.0))
COILS = (20.0, 27.0, 34.0)
SPEED = 55.0                  # sim speed, lu/s


def build(rig):
    rig.joint("body", "root", (0, 0, 0), scale=SCALE)
    rig.joint("odo", "root", (0, 0, 0))
    rig.joint("hull", "body", (0, 0, HOVER + 10.0))
    rig.joint("turret", "hull", TURRET)
    rig.joint("barrel", "turret", (8.0, 0, BARREL_Z))

    # hover pads (far pads first), each with a pulsing thrust cone
    for i, (x, y) in enumerate(sorted(PADS, key=lambda p: -p[1])):
        j = f"pad{i}"
        rig.joint(j, "hull", (x, y, HOVER))
        g = Geo().lathe([(0, -1.6), (9.0, -1.6), (10.0, 0.4), (8.6, 2.6), (0, 2.8)], (x, y, HOVER),
                        (x, y, HOVER + 1), segs=24, squash=(1.0, 0.7))
        rig.part(j, g, K.VOID_LT, finish="gloss")
        g = Geo().lathe([(6.8, -0.6), (9.2, -0.4), (9.2, 0.4), (6.8, 0.6)], (x, y - 0.4, HOVER - 1.8),
                        (x, y - 0.4, HOVER - 0.8), segs=24, squash=(1.0, 0.7))
        rig.part(j, g, glow=K.MINT, outline=0)
        rig.joint(f"cone{i}", j, (x, y, HOVER - 2.0))
        g = Geo().lathe([(8.6, 0), (7.0, 3.0), (4.0, 6.4), (0, 8.0)], (x, y, HOVER - 2.0), (x, y, HOVER - 3.0),
                        segs=16, squash=(1.0, 0.7))
        rig.part(f"cone{i}", g, glow="#9CF3D8", outline=0)
        g = Geo().lathe([(3.6, 0), (2.4, 4.0), (0, 7.0)], (x, y - 1.0, HOVER - 2.2), (x, y - 1.0, HOVER - 3.2),
                        segs=12, squash=(1.0, 0.7))
        rig.part(f"cone{i}", g, glow=K.MINT_CORE, outline=0)

    # hull: void belly skirt, star-white upper deck, sloped violet nose, team side panels
    hz = HOVER + 10.0
    g = Geo().blob((0, 0, hz - 3.0), (44.0, 21.0, 6.0), p=4.0, taper=(0.9, 1.0))
    rig.part("hull", g, K.VOID, finish="gloss")
    g = Geo().blob((-4.0, 0, hz + 5.0), (40.0, 19.0, 7.0), p=4.2, taper=(1.0, 0.86))
    rig.part("hull", g, K.STAR, finish="gloss", outline_hex=K.STAR_TRIM)
    g = Geo().blob((33.0, 0, hz + 1.8), (16.0, 18.0, 6.8), p=3.2, rot=(0, 18, 0), taper=(1.0, 0.7))
    rig.part("hull", g, K.VIOLET, finish="gloss", outline_hex=K.VIOLET_DK)
    g = Geo().blob((47.0, -8.0, hz - 0.5), (1.6, 3.0, 1.6), p=2.4)
    g.blob((47.0, 8.0, hz - 0.5), (1.6, 3.0, 1.6), p=2.4)
    rig.part("hull", g, glow=K.MINT, outline=0.8, outline_hex=K.VOID)
    for s in (-1, 1):
        g = Geo().blob((-8.0, s * 20.2, hz + 1.8), (30.0, 2.2, 6.4), p=4.0, taper=(1.0, 0.9))
        if s < 0:
            pf = FC.Face(rig, "hull", [g])
            m = KC.starmark(pf, Geo(), KM.scr(pf, (4.0, -22.4, hz + 2.0)), s=1.25)
            m = KC.starmark(pf, m, KM.scr(pf, (-22.0, -22.4, hz + 2.0)), s=1.0)
            rig.part("hull", m, KC.STAR_PALE, highlight=False, outline=0)
        rig.part("hull", g, team=True)
        g = Geo().blob((-8.0, s * 21.0, hz - 3.6), (31.0, 1.6, 1.3), p=3.6)
        rig.part("hull", g, K.VIOLET_LT, finish="gloss", outline=0.6)
    g = Geo().blob((-40.0, 0, hz + 3.0), (5.0, 17.0, 7.0), p=3.6)            # rear engine block
    rig.part("hull", g, K.VOID_LT, finish="gloss")
    g = Geo()
    for y in (-10.0, 0.0, 10.0):
        g.blob((-45.2, y, hz + 3.4), (1.0, 3.2, 3.6), p=2.4)
    rig.part("hull", g, glow=K.MINT, outline=0.6, outline_hex=K.VOID)
    KC.seam(rig, "hull", [(26.0, -17.4, hz + 7.4), (8.0, -18.8, hz + 8.4), (-16.0, -18.8, hz + 8.4),
                          (-34.0, -17.0, hz + 7.0)], r=0.8)
    KC.seam(rig, "hull", [(40.0, -12.0, hz + 6.0), (46.0, -10.0, hz + 1.0)], r=0.7, color=K.VIOLET_GLOW)
    # top team stripe down the deck
    g = Geo().blob((-4.0, 0, hz + 11.6), (34.0, 5.0, 1.2), p=3.8)
    rig.part("hull", g, team=True, outline=0.6)

    # turret: low violet dome with team cheeks, a sensor, the antenna with the pennant
    tx, ty, tz = TURRET
    g = Geo().blob((tx, ty, tz + 1.0), (19.0, 15.0, 8.0), p=2.6, taper=(1.05, 0.8))
    rig.part("turret", g, K.VIOLET, finish="gloss", outline_hex=K.VIOLET_DK)
    for s in (-1, 1):
        g = Geo().blob((tx - 1.0, s * 11.6, tz + 1.0), (12.0, 3.4, 5.0), p=3.0)
        rig.part("turret", g, team=True)
    g = Geo().blob((tx + 6.0, -6.0, tz + 8.4), (4.2, 3.2, 2.2), p=2.6)
    rig.part("turret", g, K.STAR, finish="gloss", outline_hex=K.STAR_TRIM)
    g = Geo().blob((tx + 10.0, -6.2, tz + 8.4), (0.8, 2.2, 1.2), p=2.4)
    rig.part("turret", g, glow=K.MINT, outline=0)
    K.pennant(rig, "turret", (tx - 14.0, 6.0, tz + 5.0), 40.0, length=18.0, w=9.5)
    # the pilot in an open hatch on top of the turret: a star-white helmet with a team stripe and a
    # dark visor with mint robot eyes that act (squint on the charge, yell on the shot, duck on hits)
    hx, hz = tx - 2.0, tz + 7.0
    g = Geo().lathe([(6.4, -0.8), (8.0, -0.6), (8.2, 1.2), (6.4, 1.4)], (hx, 0, hz), (hx, 0, hz + 1), segs=24,
                    squash=(1.0, 0.85))
    rig.part("turret", g, K.STAR, finish="gloss", outline=0.6, outline_hex=K.STAR_TRIM)
    g = Geo().lathe([(0, 0), (6.4, 0), (6.4, 0.6), (0, 0.8)], (hx, 0, hz + 0.6), (hx, 0, hz + 1.6), segs=24,
                    squash=(1.0, 0.85))
    rig.part("turret", g, K.VISOR, outline=0)
    rig.joint("hatch", "turret", (hx - 7.0, 0, hz + 1.4))
    g = Geo().blob((hx - 9.0, 0.0, hz + 5.0), (1.4, 6.6, 5.2), p=3.0, rot=(0, -12, 0))
    rig.part("hatch", g, K.VIOLET, finish="gloss", outline_hex=K.VIOLET_DK)
    pc = (hx + 0.5, 0.0, hz + 6.0)
    rig.joint("pilot", "turret", (hx, 0, hz))
    g = Geo().blob((pc[0] - 0.5, 0, hz + 1.2), (4.6, 4.8, 3.0), p=2.4)          # shoulders
    rig.part("pilot", g, K.VOID_LT)
    helmet = Geo().blob(pc, (5.6, 5.4, 5.6), p=2.4)
    rig.part("pilot", helmet, K.STAR, finish="gloss", outline_hex=K.STAR_TRIM)
    g = Geo().blob((pc[0] - 0.4, 0, pc[2] + 0.8), (5.9, 1.6, 5.4), p=2.4)
    g.clip((0, 0, pc[2] + 1.0), (0, 0, -1))
    rig.part("pilot", g, team=True, outline=0.5)
    KC.visor(rig, "pilot", pc, (5.6, 5.4, 5.6), x0=pc[0] + 1.2, z_top=pc[2] + 2.2, z_bot=pc[2] - 2.6,
             eye_at=(pc[0] + 4.4, pc[2] - 0.1), eye_dx=(0.0, 2.2), eye_rx=1.25, eye_rz=1.6, color=K.MINT,
             core=K.MINT_CORE, grow=0.5)

    # the plasma cannon, along +X
    bx = 8.0
    g = Geo().blob((bx + 2.0, 0, BARREL_Z), (6.0, 5.0, 4.6), p=3.0)        # mantlet
    rig.part("barrel", g, K.VOID_LT, finish="gloss")
    g = Geo().lathe([(3.6, 0), (3.4, 40.0), (0, 40.2)], (bx + 4.0, -1.0, BARREL_Z), (MUZZLE[0], -1.0, BARREL_Z),
                    segs=16)
    rig.part("barrel", g, K.STAR, finish="gloss", outline_hex=K.STAR_TRIM)
    g = Geo()
    for x in COILS:
        g.lathe([(0, -1.0), (4.8, -0.9), (5.1, 0), (4.8, 0.9), (0, 1.0)], (x, -1.0, BARREL_Z), (x + 1, -1.0, BARREL_Z),
                segs=18)
    rig.part("barrel", g, glow="#2FA884", outline=1.0, outline_hex=K.VOID)
    for i, x in enumerate(COILS):         # lit coils: a bigger pale ring each (the charge runs forward)
        rig.joint(f"coil{i}", "barrel", (x, -1.0, BARREL_Z), hidden=True)
        g = Geo().lathe([(0, -1.3), (6.0, -1.1), (6.4, 0), (6.0, 1.1), (0, 1.3)], (x, -1.4, BARREL_Z),
                        (x + 1, -1.4, BARREL_Z), segs=18)
        rig.part(f"coil{i}", g, glow=K.MINT_CORE, outline=1.0, outline_hex=K.MINT)
    g = Geo().lathe([(0, -0.5), (4.6, -0.4), (5.6, 2.0), (5.2, 5.0), (3.2, 5.4), (0, 5.4)], (MUZZLE[0] - 6.0, -1.0, BARREL_Z),
                    (MUZZLE[0], -1.0, BARREL_Z), segs=18)
    rig.part("barrel", g, K.VOID_LT, finish="gloss")
    g = Geo().lathe([(3.2, 0), (5.8, 0.2), (5.8, 1.6), (3.2, 1.8)], (MUZZLE[0] - 1.4, -1.0, BARREL_Z),
                    (MUZZLE[0] + 1.0, -1.0, BARREL_Z), segs=18)
    rig.part("barrel", g, glow=K.VIOLET_GLOW, outline=0.8, outline_hex=K.VIOLET)
    rig.track("muzzle", "barrel", MUZZLE)

    mx, my, mz = MUZZLE
    K.orb(rig, "barrel", (mx + 1.0, my - 1, mz), 3.6, name="charge", hidden=True, line="#1C8A6A")
    rig.joint("flash", "barrel", MUZZLE, hidden=True)
    g = Geo().star((mx + 6.0, my - 4, mz), 13.0, 4.6, 1.4, points=6)
    rig.part("flash", g, glow=K.MINT, outline=0)
    g = Geo().blob((mx + 12.0, my - 3, mz), (12.0, 1.6, 3.6), p=2.0)
    rig.part("flash", g, glow=K.MINT, outline=0)
    g = Geo().sphere((mx + 4.0, my - 6, mz), 5.0, cuts=3)
    rig.part("flash", g, glow=K.MINT_CORE, outline=0)
    # smoke / vapour (left in place: parented to the body)
    rig.joint("smoke", "body", (mx + 10, -12, BARREL_Z + 10), hidden=True)
    g = Geo()
    for dx, dz, r in ((0, 0, 6.0), (7, 3, 4.8), (-4, 5, 4.4), (4, 8, 4.0), (11, -2, 3.6)):
        g.sphere((mx + 10 + dx, -12, BARREL_Z + 10 + dz), r, cuts=4)
    rig.part("smoke", g, K.SMOKE, finish="dust", outline=0.8)
    rig.joint("wreck", "body", (-10, -24, 40), hidden=True)
    g = Geo()
    for dx, dz, r in ((0, 0, 7.0), (8, 5, 5.6), (-6, 7, 5.0), (3, 12, 4.4)):
        g.sphere((-10 + dx, -24, 40 + dz), r, cuts=4)
    rig.part("wreck", g, "#8C869A", finish="dust", outline=0.8)
    rig.track("_foot", "odo", (0, 0, 0))
    K.sparks(rig, "hull", (20.0, -22.0, HOVER + 16.0), color=K.MINT, size=1.6, name="sparks")
    # the pilot's ejection seat jet (death)
    rig.joint("jet", "pilot", (tx - 2.0, 0, tz + 2.0), hidden=True)
    g = Geo().lathe([(3.4, 0), (2.4, -5.0), (0, -9.0)], (tx - 2.0, -1.0, tz + 2.0), (tx - 2.0, -1.0, tz + 3.0),
                    segs=12)
    rig.part("jet", g, glow=K.MINT, outline=0.6, outline_hex="#1C8A6A")


# -- poses -----------------------------------------------------------------------------------
def _cones(k, flicker=None, front=1.0):
    """Thrust cone length k (pads 0-1 are the far pads, sorted; 1 and 3 are the front ones)."""
    pose = {}
    for i in range(4):
        v = k * (1.0 if flicker is None else flicker[i % len(flicker)])
        x = sorted(PADS, key=lambda p: -p[1])[i][0]
        if x > 0:
            v *= front
        pose[f"cone{i}"] = {"sz": max(0.05, v), "s": 0.9 + 0.1 * min(1.2, v)}
    return pose


def _lit(n):
    return {f"coil{i}": {"show": True} for i in range(n)}


def _idle(f):
    ph = 2 * math.pi * f / 6
    c, lag = math.cos(ph), math.cos(ph - 1.0)
    peek = [0.0, 0.5, 1.0, 1.0, 0.4, 0.0][f]
    pose = merge(_cones(1.0 + 0.18 * c), {
        "hull": dict(squash(0.012 * c), z=1.6 * c, r=0.6 * lag),
        "turret": {"r": 0.6 * lag},
        "barrel": {"r": 0.8 * lag},
        "pilot": {"z": 2.2 * peek, "rz": 14.0 * math.sin(ph)},
        "hatch": {"r": 10.0 * peek},
    })
    if f == 4:
        pose = merge(pose, KF.glyph("g_blink"))
    if f in (2, 3):
        pose = merge(pose, KF.glyph("g_happy" if f == 3 else "g_wide"))
    return pose


def _walk(f):
    p = 2 * math.pi * f / 8
    a = SPEED * 0.5 / 4.0          # odo amplitude: stride = 4a per 0.5 s cycle = sim speed (odo is unscaled)
    return merge(_cones(1.15, [1.0 + 0.2 * math.sin(p + k) for k in (0, 1.6, 3.1, 4.7)]), {
        "odo": {"x": a * math.cos(p)},
        "hull": dict(z=1.2 * math.sin(2 * p) + 0.6, r=-2.2 + 0.6 * math.sin(p)),
        "turret": {"r": 0.8 * math.sin(p - 0.8)},
        "barrel": {"r": 1.0 * math.sin(p - 1.2)},
        "pilot": {"z": -0.6 * math.sin(2 * p - 1.0), "r": 3.0 * math.sin(p - 1.5)},
    })


# -- attack: nose-dip plasma shot (790 ms, impact at 291 ms = 0.3684, as shipped) ------------------
ATTACK_MS = [50, 80, 161, 90, 100, 90, 100, 119]
ATTACK_IMPACT = 3
#      aim   dip   HOLD  FIRE  slide drift return settle
BX = [0.0, 1.0, 1.5, -4.0, -8.0, -6.0, -2.5, 0.0]
BZ = [0.0, -1.5, -2.5, 1.5, 2.0, 1.0, 0.0, 0.0]
HR = [0.0, -3.5, -5.0, 4.0, 5.0, 2.0, -1.0, 0.0]       # hull pitch (negative = nose down)
HQ = [0.0, -0.02, -0.03, 0.05, -0.04, 0.01, 0.0, 0.0]
BAR_X = [0.0, 0.0, 0.0, -7.0, -5.0, -2.0, 0.0, 0.0]
BAR_R = [2.0, 4.0, 5.0, 2.0, 1.0, 0.5, 0.0, 0.0]
CONE = [1.0, 1.25, 1.4, 1.8, 1.6, 1.25, 1.05, 1.0]
FRONT = [1.0, 1.6, 1.7, 0.8, 1.0, 1.1, 1.0, 1.0]
CHG = [0.0, 0.5, 1.3, 0, 0, 0, 0, 0]
LIT = [1, 2, 3, 0, 0, 0, 0, 0]
PILOT = [0.0, -1.0, -1.5, -2.0, -1.0, 0.5, 1.5, 0.5]
EYES = ["g_angry", "g_squint", "g_squint", "g_wide", "g_hurt", "eyes", "g_happy", "eyes"]


def _attack_pose(f):
    pose = merge(_cones(CONE[f], front=FRONT[f]), _lit(LIT[f]), {
        "body": {"x": BX[f], "z": BZ[f]},
        "hull": dict(squash(HQ[f]), r=HR[f]),
        "turret": {"r": [0.5, 1.0, 1.0, 2.0, 1.5, 1.0, 0.3, 0.0][f]},
        "barrel": {"x": BAR_X[f], "r": BAR_R[f], "sz": [1, 1, 1, 1.12, 1.04, 1, 1, 1][f]},
        "charge": {"show": CHG[f] > 0, "s": max(CHG[f], 0.01)},
        "flash": {"show": f == 3},
        "smoke": {"show": f in (4, 5, 6), "s": [1, 1, 1, 1, 0.8, 1.1, 1.3, 1][f],
                  "x": [0, 0, 0, 0, -6, 0, 4, 0][f], "z": [0, 0, 0, 0, -6, 0, 5, 0][f]},
        "pilot": {"z": PILOT[f]},
    })
    return merge(pose, KF.glyph(EYES[f]))


def _attack_clip():
    ov = {
        2: [{"kind": "rings", "joint": "barrel", "point": (MUZZLE[0] + 2.0, MUZZLE[1], MUZZLE[2]),
             "radii_lu": (6.0, 9.5), "a0": -80.0, "a1": 80.0, "color": K.MINT_CORE}],
        3: [{"kind": "burst", "joint": "barrel", "point": (MUZZLE[0] + 6.0, MUZZLE[1], MUZZLE[2]), "r0_lu": 10.0,
             "r1_lu": 17.0, "n": 6, "a0": -65.0, "arc": 130.0, "color": K.MINT_CORE}],
        4: [{"kind": "dust", "ground": (-10.0, 0.0), "size_lu": 7.0, "puffs": 4, "seed": 2, "spread": 1.2,
             "color": "#DCD6E8", "dir": -1.0}],
    }
    return M.clip("attack", [_attack_pose(f) for f in range(8)], ATTACK_MS, impact=ATTACK_IMPACT, overlays=ov)


def _hit(k):
    a = M.HIT_AMT[k]
    up = max(a, 0)
    pose = merge(_cones(1.0 - 0.45 * up), {
        "body": {"x": -4.0 * a, "z": [-1.0, -3.0, -1.0, 1.0, 0.0][k]},
        "hull": dict(squash([-0.04, -0.06, 0.03, -0.01, 0.0][k]), r=5.0 * a),
        "turret": {"r": 2 * a},
        "pilot": {"z": -5.0 * up},
        "hatch": {"r": -6.0 * up},
        "sparks": {"show": k == 0, "s": 0.8},
    })
    return merge(pose, KF.glyph("g_hurt" if k <= 1 else ("g_angry" if k == 2 else "eyes")))


# death: D7 wreck and bail, 8 unique poses in the 12 heavy steps (990 ms, fx times as shipped)
def _die(k):
    drop = [0.0, 0.3, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0][k]
    body = {"x": [-3.0, -4.0, -5.0, -5.5, -6.0, -6.0, -6.0, -6.0][k],
            "z": [2.0, -2.0, -HOVER * SCALE + 1.0, -HOVER * SCALE + 3.0, -HOVER * SCALE + 1.5,
                  -HOVER * SCALE + 1.5, -HOVER * SCALE + 1.5, -HOVER * SCALE + 1.5][k],
            "r": [5.0, 2.0, 0.0, 4.0, 6.0, 6.0, 6.0, 6.0][k]}
    sq = [0.0, 0.02, -0.14, 0.05, -0.04, -0.02, -0.04, -0.07][k]
    body.update(squash(sq))
    if k >= 6:
        body["s"] = [1, 1, 1, 1, 1, 1, 0.97, 0.92][k]
    pose = merge(_cones([0.8, 0.35, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05][k], [1.0, 0.4, 0.8, 0.2]), {"body": body}, {
        "turret": {"z": [0, 2, 4, 6, 5, 5, 5, 5][k], "r": [4, 8, 14, 20, 16, 16, 16, 16][k], "x": -3.0 * drop},
        "barrel": {"r": [-4, -8, -16, -22, -24, -24, -24, -24][k]},
        "hatch": {"r": [10, 50, 80, 80, 80, 80, 80, 80][k]},
        "pilot": {"z": [0, 8, 26, 46, 62, 0, 0, 0][k], "x": [0, -1, -4, -8, -12, 0, 0, 0][k],
                  "r": [0, 8, 20, 34, 50, 0, 0, 0][k], "hide": k >= 5},
        "jet": {"show": k in (1, 2, 3)},
        "sparks": {"show": k in (0, 2), "s": 1.0 if k == 0 else 1.3},
        "wreck": {"show": k >= 2, "s": [0.7, 0.7, 0.8, 1.0, 1.15, 1.25, 1.3, 1.35][k],
                  "z": [0, 0, 0, 3, 6, 9, 11, 12][k]},
        "smoke": {"show": k == 3, "s": 0.9},
    })
    g = ["g_hurt", "g_wide", "g_wide", "eyes_x", "eyes_x", "eyes_x", "eyes_x", "eyes_x"][k]
    return merge(pose, KF.glyph(g))


def clips():
    cl = [
        M.clip("idle", [_idle(f) for f in range(6)], [M.IDLE_MS_HEAVY] * 6, loop=True),
        M.clip("walk", [_walk(f) for f in range(8)], M.WALK_MS, loop=True),
        _attack_clip(),
        M.clip("hit", [_hit(k) for k in range(5)], M.HIT_MS),
        M.clip("die", [_die(k) for k in range(8)], M.DIE_MS_HEAVY, sequence=M.DIE_SEQ_HEAVY,
               extra=M.die_meta(HEIGHT_LU, heavy=True)),
    ]
    return M.check_contract(cl, heavy=True, attack_ms=790, attack_impact_at=0.3684)
