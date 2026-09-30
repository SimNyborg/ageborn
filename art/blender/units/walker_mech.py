"""Walker Mech: Future Age heavy (DESIGN A5.6). Armoured mech melee with Reach (60 lu), blunt
damage, ~112 lu, large. Walker rig (A11): hull on two IK legs.

Look (A11, Future palette): a chunky reverse-jointed walker. A rounded white hull with a wide team
chest band carrying the pale Future hex, a team roof stripe, a charcoal belly with hazard chevrons,
panel rivets, a wide dark canopy visor whose mint "eyes" act (angry on the wind-up, slits on the
slam, > < when hit, X when it dies), a magenta vent strip, an engine pack with mint cells, and an
antenna with a team pennant (follow-through). The near arm is an oversized piston ram ending in a
big white hammer-fist with a team knuckle plate, fed by a hose that swings; the far arm is a
smaller claw. Bird-like legs (knees bend back) with piston shins and wide clawed feet.

Animation (art director plan 2026-09-30, `ageborn_art/moves.py`):
  idle    the hull breathes on its pistons, the antenna twitches, a visor blink
  walk    clank: a hard foot plant with the hull jolting down, a vent puff every step
  attack  TWIN-FIST HAMMER: shifts its weight, dips, then rears up tall with both arms swung
          overhead behind the hull (the held extreme), hammers both fists down in a white arc
          (two smear frames) and SLAMS them into the ground in front with the piston ram at full
          reach: the legs buckle on their pistons, impact lines, a ground dust ring and the vents
          flare; then it rocks back and pulls the arms in
  hit     mech: a hard jolt with no squash, a hull panel pops out and back, sparks on the front
  die     D6 fall-apart: sputters, the antenna pops off, the ram arm drops off at the elbow, the
          knees buckle and the hull slams down nose first with a smoke puff, X eyes
"""
import math

from ageborn_art import face as FC
from ageborn_art import kit_future as KF
from ageborn_art import kit_industrial as KI
from ageborn_art import kit_medieval as K
from ageborn_art import moves as M
from ageborn_art import rigs_future as F
from ageborn_art.anim import merge
from ageborn_art.geometry import Geo

SLUG = "walker_mech"
NAME = "Walker Mech"
HEIGHT_LU = 120
YAW_DEG = -20.0
CANVAS = (392, 320)
FEET = (140, 296)
ANCHORS = {"head": (6, 116), "hitCenter": (0, 78)}
NO_RETIME = True

HIP_Z = 50.0
THIGH, SHIN = 27.0, 34.0
ANK_REST = HIP_Z - THIGH - SHIN      # the leg is modelled straight down
ANKLE_H = 7.0                        # ankle height when the foot is flat on the ground
LEG_Y = {"r": -12.0, "l": 12.0}
STANCE_X = {"r": 8.0, "l": -8.0}     # planted foot x at rest

HULL = (0.0, 0.0, 74.0)
SH_R = (6.0, -25.0, 80.0)            # near shoulder (ram arm)
SH_L = (4.0, 22.0, 80.0)             # far shoulder (claw)
UP_L, FORE_L = 16.0, 18.0
FIST = (SH_R[0], SH_R[1], SH_R[2] - UP_L - FORE_L - 6.0)
FIST_BOT = (SH_R[0], SH_R[1] - 2, SH_R[2] - UP_L - FORE_L - 13.0)
ELBOW_R = (SH_R[0], SH_R[1], SH_R[2] - UP_L)
ANT = (-15.0, 8.0, 90.0)


def _ram_parts(rig, j_fore, j_ram):
    """The piston forearm, rod and hammer fist (on two joints, or one for the loose copy)."""
    x, y, z = SH_R
    g = Geo().lathe([(0, -3.6), (5.6, -3.4), (6.0, 0), (5.6, 3.4), (0, 3.6)], (x, y, z - UP_L), (x, y + 1, z - UP_L),
                    segs=18)
    rig.part(j_fore, g, F.GUNMETAL, finish="metal")
    g = Geo().blob((x, y, z - UP_L - 9.0), (6.4, 6.0, 10.0), p=3.2)    # cylinder housing
    rig.part(j_fore, g, F.ARMOR, finish="gloss", outline_hex=F.TRIM)
    g = Geo().blob((x + 5.8, y - 2.0, z - UP_L - 9.0), (1.0, 2.0, 6.0), p=3.0)
    rig.part(j_fore, g, glow=F.MAGENTA, outline=0)
    KF.rivets(rig, j_fore, [(x - 3.0, y - 6.0, z - UP_L - 4.0 - 4.0 * i) for i in range(3)], r=0.9)
    fz = z - UP_L - FORE_L
    g = Geo().capsule((x, y, fz + 8.0), (x, y, fz - 2.0), 2.8)          # piston rod
    rig.part(j_ram, g, F.STEEL, finish="metal", outline=0.8)
    g = Geo().blob((x, y, fz - 7.0), (9.4, 8.6, 7.2), p=3.6)            # hammer fist (bigger)
    rig.part(j_ram, g, F.ARMOR, finish="gloss", outline_hex=F.TRIM)
    g = Geo().blob((x, y - 0.2, fz - 13.4), (9.0, 8.2, 1.9), p=3.4)     # team knuckle plate
    g.blob((x, y - 8.6, fz - 7.0), (7.2, 1.2, 4.8), p=3.2)
    rig.part(j_ram, g, team=True, outline=0.7)
    g = Geo()
    for dx in (-5.0, 0.0, 5.0):
        g.blob((x + dx, y - 9.4, fz - 7.0), (1.3, 0.8, 1.3), p=2.4)
    rig.part(j_ram, g, F.TRIM, finish="metal", outline=0)


def build(rig):
    rig.joint("body", "root", (0, 0, 0))
    rig.joint("hips", "body", (0, 0, HIP_Z))
    rig.joint("hull", "hips", HULL)
    for s in ("r", "l"):
        F.walker_leg(rig, s, (0.0, LEG_Y[s], HIP_Z), THIGH, SHIN)

    # legs: charcoal thighs with a white shell, knee discs, piston shins, team shin guards, feet
    for s in ("r", "l"):
        y = LEG_Y[s]
        sg = 1 if s == "r" else -1
        kz = HIP_Z - THIGH
        g = Geo().capsule((0, y, HIP_Z), (0, y, kz), 4.6, 3.8)
        rig.part(f"thigh_{s}", g, F.SUIT)
        g = Geo().blob((1.6, y - 1.2 * sg, HIP_Z - 8.0), (6.0, 5.4, 9.0), p=2.8, taper=(0.75, 1.05))
        rig.part(f"thigh_{s}", g, F.ARMOR, finish="gloss", outline_hex=F.TRIM)
        g = Geo().lathe([(0, -3.6), (5.6, -3.4), (6.0, 0), (5.6, 3.4), (0, 3.6)], (0, y, kz), (0, y + 1, kz), segs=18)
        rig.part(f"shin_{s}", g, F.GUNMETAL, finish="metal")
        g = Geo().capsule((0, y, kz), (0, y, ANK_REST), 3.6, 3.0)
        rig.part(f"shin_{s}", g, F.SUIT)
        g = Geo().capsule((2.6, y - 2.0 * sg, kz - 4.0), (2.2, y - 2.0 * sg, ANK_REST + 8.0), 2.2, 1.8)
        rig.part(f"shin_{s}", g, F.STEEL, finish="metal", outline=0.8)
        g = Geo().blob((-0.4, y, kz - 12.0), (5.6, 5.6, 12.5), p=2.8, taper=(0.8, 1.15))
        rig.part(f"shin_{s}", g, team=True)
        g = Geo().blob((-0.4, y - 5.4 * sg, kz - 7.0), (3.0, 0.8, 1.2), p=3.0)
        rig.part(f"shin_{s}", g, glow=F.MINT, outline=0)
        a = ANK_REST
        g = Geo().blob((4.0, y, a - 3.8), (11.5, 7.2, 3.6), p=3.0, taper=(1.0, 0.8))
        g.blob((-6.0, y, a - 3.4), (4.4, 4.6, 3.0), p=2.8)
        rig.part(f"foot_{s}", g, F.ARMOR, finish="gloss", outline_hex=F.TRIM)
        g = Geo()
        for dy in (-4.6, 0.0, 4.6):
            g.lathe([(2.2, 0), (1.6, 2.4), (0, 4.6)], (14.0, y + dy, a - 5.0), (18.6, y + dy, a - 5.8), segs=10)
        rig.part(f"foot_{s}", g, F.GUNMETAL, finish="metal", outline=0.8)
        g = Geo().sphere((0, y, a), 3.6, cuts=4)
        rig.part(f"foot_{s}", g, F.GUNMETAL, finish="metal")
    rig.track("_foot", "foot_r", (4.0, LEG_Y["r"], ANK_REST - 7.0))

    # far arm (behind the hull): a smaller claw
    rig.joint("arm_l", "hull", SH_L)
    rig.joint("fore_l", "arm_l", (SH_L[0], SH_L[1], SH_L[2] - UP_L))
    x, y, z = SH_L
    g = Geo().sphere((x, y, z), 6.4, cuts=4)
    rig.part("arm_l", g, F.ARMOR, finish="gloss", outline_hex=F.TRIM)
    g = Geo().capsule((x, y, z), (x, y, z - UP_L), 3.6)
    rig.part("arm_l", g, F.SUIT)
    g = Geo().capsule((x, y, z - UP_L), (x, y, z - UP_L - 13.0), 3.4, 3.0)
    g.lathe([(2.2, 0), (1.5, 4.4), (0, 7.6)], (x + 2.0, y, z - UP_L - 13.0), (x + 5.4, y, z - UP_L - 19.6), segs=10)
    g.lathe([(2.2, 0), (1.5, 4.4), (0, 7.6)], (x - 2.0, y, z - UP_L - 13.0), (x - 4.4, y, z - UP_L - 20.0), segs=10)
    rig.part("fore_l", g, F.GUNMETAL, finish="metal")

    # hull: charcoal belly with hazard chevrons, white shell, team chest band with a hex, roof stripe
    g = Geo().blob((0, 0, 60.0), (17.0, 15.0, 9.0), p=2.6)
    rig.part("hull", g, F.SUIT)
    belly = Geo().blob((0.5, 0, 60.0), (17.4, 15.4, 9.4), p=2.6)
    bf = FC.Face(rig, "hull", [belly], yaw_deg=YAW_DEG)
    g = KI.stripes(bf, Geo(), K.scr(bf, (4.0, -14.0, 57.5)), 16.0, 3.4, n=5, slant=0.7)
    rig.part("hull", g, "#D9CFA8", highlight=False, outline=0)
    g = Geo().blob((0, 0, 76.0), (25.0, 20.0, 17.0), p=3.0, taper=(0.9, 1.0))
    rig.part("hull", g, F.ARMOR, finish="gloss", outline_hex=F.TRIM)
    band = Geo().blob((0.5, 0, 76.4), (25.6, 20.6, 17.6), p=3.0, taper=(0.9, 1.0))
    band.clip((0, 0, 67.5), (0, 0, -1)).clip((0, 0, 82.5), (0, 0, 1))
    hf = FC.Face(rig, "hull", [band], yaw_deg=YAW_DEG)
    g = KF.hexmark(hf, Geo(), K.scr(hf, (-6.0, -19.5, 75.0)), s=1.25, w=1.3)
    rig.part("hull", g, KF.HEX_PALE, highlight=False, outline=0)
    band.blob((-4.0, -20.4, 64.0), (12.0, 2.0, 3.6), p=3.2)   # skirt plate
    rig.part("hull", band, team=True)
    g = Geo().blob((-3.0, 0, 92.4), (15.0, 3.4, 2.2), p=3.0)
    rig.part("hull", g, team=True, outline=0.7)
    KF.rivets(rig, "hull", [(x_, -19.4 + 0.02 * x_, 85.4) for x_ in (-16.0, -9.0, -2.0, 5.0)], r=1.0)
    visor = Geo().blob((20.2, -2.0, 77.0), (6.0, 16.0, 5.6), p=3.4, rot=(0, -10, 0))
    KF.visor_face(rig, "hull", [visor], (19.0, 77.4), eye_dx=(0.0, 5.4), eye_rx=2.2, eye_rz=3.0,
                  yaw_deg=YAW_DEG)
    rig.part("hull", visor, F.VISOR_DARK, finish="gloss", outline_hex=F.SUIT)
    g = Geo()
    for z in (66.0, 69.5):
        g.blob((-6.0, -20.8, z), (9.0, 0.8, 0.9), p=3.0)
    rig.part("hull", g, glow=F.MAGENTA, outline=0)
    g = Geo().blob((-22.0, 0, 80.0), (6.0, 12.0, 9.0), p=3.4)   # engine pack
    rig.part("hull", g, F.SUIT, finish="gloss")
    g = Geo()
    for y in (-6.0, 0.0, 6.0):
        g.capsule((-28.2, y, 76.0), (-28.2, y, 85.0), 1.5)
    rig.part("hull", g, glow=F.MINT, outline=0.8, outline_hex=F.SUIT)
    rig.joint("flare", "hull", (-30.0, 0, 80.0), hidden=True)     # vents flaring on the slam
    g = Geo()
    for y in (-6.0, 0.0, 6.0):
        g.capsule((-31.0, y - 1.0, 74.0), (-31.0, y - 1.0, 87.0), 2.6, segs=10, rings=3)
    rig.part("flare", g, glow=F.MINT_CORE, outline=1.0, outline_hex=F.MINT)
    F.puff(rig, "hull", (-34.0, -4.0, 90.0), size=1.6, name="steam_back", spread=1.4)
    # antenna and team pennant (the antenna pops off in the death)
    rig.joint("antenna", "hull", ANT)
    g = Geo().capsule(ANT, (-16.0, 8.0, 112.0), 1.1)
    rig.part("antenna", g, F.GUNMETAL, outline=0.8)
    g = Geo().sphere((-16.0, 8.0, 112.5), 1.9, cuts=3)
    rig.part("antenna", g, glow=F.MAGENTA, outline=0.8, outline_hex=F.MAGENTA)
    rig.secondary("pennant", "antenna", (-15.6, 8.0, 109.0), (-34.0, 8.0, 104.0), max_deg=20, gain=1.3)
    g = Geo().slab([(-15.6, 110.0), (-36.0, 106.5), (-15.4, 100.0)], 8.0, 1.6)
    rig.part("pennant", g, team=True, outline=0.8)
    # a side panel that pops open when hit
    rig.joint("panel", "hull", (-10.0, -20.0, 74.0))
    g = Geo().blob((-10.0, -20.6, 74.0), (5.4, 1.2, 4.0), p=3.4)
    rig.part("panel", g, F.ARMOR, finish="gloss", outline_hex=F.TRIM)
    F.sparks(rig, "hull", (26.0, -12.0, 70.0), size=1.4, name="hit_spark", rays=6, seed=5)

    # hose from the hull to the ram forearm (follow-through)
    rig.secondary("hose", "hull", (-2.0, -22.0, 70.0), (4.0, -27.0, 58.0), max_deg=16, gain=1.2)
    g = Geo()
    pts = [(-2.0, -21.5, 70.0), (-2.0, -25.0, 63.0), (2.0, -27.5, 58.0)]
    for a_, b_ in zip(pts, pts[1:]):
        g.capsule(a_, b_, 1.5, segs=8, rings=2)
    rig.part("hose", g, F.GUNMETAL, outline=0.6)

    # near arm: the piston ram with a hammer fist (telescoping `ram` joint in the forearm)
    rig.joint("arm_r", "hull", SH_R)
    rig.joint("fore_r", "arm_r", ELBOW_R)
    rig.joint("ram", "fore_r", (SH_R[0], SH_R[1], SH_R[2] - UP_L - FORE_L))
    x, y, z = SH_R
    g = Geo().blob((x, y - 1.0, z + 1.0), (9.6, 8.0, 8.4), p=2.6)
    rig.part("arm_r", g, F.ARMOR, finish="gloss", outline_hex=F.TRIM)
    g = Geo().blob((x, y - 1.4, z + 1.0), (10.0, 8.4, 8.8), p=2.6)
    g.clip((x, y, z + 3.5), (0, 0, 1)).clip((x, y, z - 2.5), (0, 0, -1))
    rig.part("arm_r", g, team=True, outline=0.7)
    g = Geo().blob((x + 2.0, y - 9.0, z + 1.0), (4.6, 0.8, 1.0), p=3.0)
    rig.part("arm_r", g, glow=F.MINT, outline=0)
    g = Geo().capsule((x, y, z), (x, y, z - UP_L), 4.6, 4.2)
    rig.part("arm_r", g, F.SUIT)
    _ram_parts(rig, "fore_r", "ram")
    rig.track("fist", "ram", FIST)
    F.sparks(rig, "ram", (x, y - 3.0, z - UP_L - FORE_L - 15.0), size=2.2, name="sparks", rays=8, seed=1)
    F.puff(rig, "fore_r", (x - 5.0, y - 2.0, z - UP_L - 4.0), size=1.4, name="steam", spread=1.3)

    # loose copies for the death: the ram forearm (drops off at the elbow) and the antenna
    rig.joint("arm_loose", "root", ELBOW_R, hidden=True)
    _ram_parts(rig, "arm_loose", "arm_loose")
    rig.joint("ant_loose", "root", ANT, hidden=True)
    g = Geo().capsule(ANT, (-16.0, 8.0, 112.0), 1.1)
    rig.part("ant_loose", g, F.GUNMETAL, outline=0.8)
    g = Geo().sphere((-16.0, 8.0, 112.5), 1.9, cuts=3)
    rig.part("ant_loose", g, glow=F.MAGENTA, outline=0.8, outline_hex=F.MAGENTA)
    g = Geo().slab([(-15.6, 110.0), (-33.0, 106.5), (-15.4, 100.0)], 8.0, 1.6)
    rig.part("ant_loose", g, team=True, outline=0.8)
    F.puff(rig, "root", (0.0, -10.0, 30.0), size=3.0, name="smoke", color="#B9BEC6", spread=1.6)


# -- poses -----------------------------------------------------------------------------------
def legs(foot_r, foot_l, hips=(0.0, 0.0)):
    """Feet (x, lift) targets in character space for both legs, given the hips offset."""
    pose = {}
    for s, (fx_, lift) in (("r", foot_r), ("l", foot_l)):
        tgt = (fx_ - hips[0], ANKLE_H + lift - hips[1])
        pose.update(F.leg_ik(s, (0.0, HIP_Z), tgt, THIGH, SHIN, knee_fwd=False))
    pose["hips"] = {"x": hips[0], "z": hips[1]}
    return pose


def arms(ra, rf, la=-100.0, lf=-60.0, ram=0.0):
    """Ram arm (upper, fore directions, ram extension) and claw arm."""
    return merge(F.arm("r", ra, rf), F.arm("l", la, lf), {"ram": {"z": -ram}})


REST_ARMS = arms(-100, -25, -85, -25)
CROUCH = 8.0    # the hips are lifted this far above their modelled height


def _stand(bob=0.0, dx=0.0, spread=0.0):
    return legs((STANCE_X["r"] + spread, 0.0), (STANCE_X["l"] - spread, 0.0), (dx, CROUCH + bob))


def _idle(f):
    c = math.cos(2 * math.pi * f / 6)
    lag = math.cos(2 * math.pi * (f - 1) / 6)
    pose = merge(_stand(1.3 * c), REST_ARMS, {
        "hull": {"r": 1.2 * c, "z": 0.4 * lag},
        "arm_r": {"r": 3.0 * lag}, "arm_l": {"r": 2.5 * lag},
        "antenna": {"r": [0, 0, -6, 5, 0, 0][f]},
    })
    if f == 4:
        pose = merge(pose, KF.glyph("g_blink"))
    return pose


WALK_MS = [125] * 8   # a 1 s heavy clank
STRIDE = 25.0         # natural speed 2 x 25 / 1 s = 50 lu/s (sim speed 50)


def _walk(f):
    xr, lr, _ = F.walker_cycle(f, 8, STRIDE, 15.0)
    xl, ll, _ = F.walker_cycle(f, 8, STRIDE, 15.0, phase=0.5)
    bob = [-3.6, -1.0, 1.4, 0.2, -3.6, -1.0, 1.4, 0.2][f]
    lag = [0.2, -3.6, -1.0, 1.4, 0.2, -3.6, -1.0, 1.4][f]
    jolt = [1.0, 0.3, 0, 0, 1.0, 0.3, 0, 0][f]
    p = 2 * math.pi * f / 8
    pose = merge(legs((xr, lr), (xl, ll), (0.0, CROUCH + bob)), REST_ARMS, {
        "hull": dict(r=-3.0 + 1.5 * math.cos(2 * p) - 1.4 * jolt, rz=3.0 * math.sin(p), z=-0.3 * lag),
        "arm_r": {"r": -8 * math.cos(p) + 1.0 * lag}, "fore_r": {"r": 4 * math.cos(p)},
        "arm_l": {"r": 8 * math.cos(p)},
        "antenna": {"r": 2.0 * lag},
        "steam_back": {"show": f in (1, 5), "s": 0.6},
    })
    return pose


# -- attack: twin-fist hammer (heavy timing: impact on pose 6 at 570 of 1230 ms) ----------------
ATTACK_SEQ = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 9, 0]
#      shift  dip  coil  HOLD  smear smear SLAM shock follow recover
RA = [-104, -125, 60, 100, 50, 8, -28, -26, -40, -80]
RF = [-30, -70, 105, 150, 70, 0, -40, -38, -30, -40]
LA = [-88, -110, 68, 96, 46, 4, -32, -30, -44, -82]
LF = [-30, -70, 110, 150, 66, -6, -46, -44, -34, -40]
RAM = [0, 0, 0, 0, 6, 12, 22, 20, 10, 2]
BOB = [-1.0, -4.5, 1.5, 4.0, 1.0, -3.0, -11.0, -9.0, -5.0, -1.5]
DX = [-1.0, -2.5, -3.5, -4.5, 0.0, 3.0, 6.0, 5.5, 3.5, 1.0]
HULL_R = [2.0, 5.0, 12.0, 16.0, 2.0, -10.0, -20.0, -18.0, -10.0, -3.0]
SPREAD = [0, 1.0, 1.5, 2.0, 2.0, 3.0, 5.0, 5.0, 3.0, 1.0]
EYES = ["eyes", "g_angry", "g_angry", "g_angry", "g_squint", "g_squint", "g_squint", "g_angry", "g_angry", "eyes"]


def _attack_pose(f):
    pose = merge(_stand(BOB[f], DX[f], SPREAD[f]),
                 arms(RA[f], RF[f], LA[f], LF[f], RAM[f]), {
        "hull": {"r": HULL_R[f]},
        "antenna": {"r": [0, 3, -4, -8, 6, 10, 14, -6, 4, 0][f]},
        "flare": {"show": f in (6, 7)},
        "steam": {"show": f in (7, 8), "s": 1.3 if f == 8 else 1.0, "z": 3.0 if f == 8 else 0.0},
        "steam_back": {"show": f in (7, 8), "s": 1.3 if f == 8 else 1.0, "z": 4.0 if f == 8 else 0.0},
    })
    if f in (4, 5):
        pose["ram"]["sz"] = 1.15
    return merge(pose, KF.glyph(EYES[f]))


def _attack_clip():
    swing = {"kind": "arc", "joint": "ram", "inner": (FIST[0], FIST[1], FIST[2] + 8.0), "outer": FIST_BOT,
             "color": F.ARMOR, "white": 0.15, "taper": 0.2, "lines": 3, "t0": 0.0, "t1": 0.95}
    ov = {
        4: [dict(swing, **{"from": 3})],
        5: [dict(swing, **{"from": 4})],
        6: [dict(swing, **{"from": 5, "t0": 0.3, "lines": 2}),
            {"kind": "burst", "joint": "ram", "point": FIST_BOT, "r0_lu": 10.0, "r1_lu": 20.0, "n": 7,
             "a0": 10.0, "arc": 160.0},
            {"kind": "dust", "ground": (24.0, 0.0), "size_lu": 7.0, "puffs": 3, "seed": 11, "spread": 1.0, "dir": -1.0},
            {"kind": "dust", "ground": (62.0, 0.0), "size_lu": 7.0, "puffs": 3, "seed": 14, "spread": 1.0, "dir": 1.0},
            {"kind": "dust", "ground": (-12.0, 0.0), "size_lu": 6.0, "puffs": 3, "seed": 12, "spread": 1.0}],
        7: [{"kind": "dust", "ground": (20.0, 0.0), "size_lu": 6.0, "puffs": 3, "seed": 13, "spread": 1.2, "dir": -1.0},
            {"kind": "dust", "ground": (68.0, 0.0), "size_lu": 6.0, "puffs": 3, "seed": 15, "spread": 1.2, "dir": 1.0},
            {"kind": "rings", "joint": "ram", "point": FIST_BOT, "radii_lu": (12.0, 18.0), "a0": 20.0, "a1": 160.0}],
    }
    return M.clip("attack", [_attack_pose(f) for f in range(10)], M.HEAVY_MELEE_MS, impact=6,
                  sequence=ATTACK_SEQ, overlays=ov)


def _hit(k):
    a = M.HIT_AMT[k]
    pose = merge(_stand(-2.0 * max(a, 0)), REST_ARMS, KF.hit_mech(k, (0, 0, 60)), {
        "hull": {"r": 6 * a}, "arm_r": {"r": 14 * a}, "arm_l": {"r": 10 * a},
        "antenna": {"r": 14 * a},
        "panel": {"x": [-1.0, -2.5, -1.0, 0, 0][k], "y": [-2.0, -4.5, -1.5, 0, 0][k], "r": [8, 22, 6, 0, 0][k]},
        "hit_spark": {"show": k <= 1},
        "steam_back": {"show": k in (2, 3), "s": 0.8},
    })
    return merge(pose, KF.glyph("g_hurt" if k <= 1 else ("g_angry" if k == 2 else "eyes")))


# D6 fall-apart: 8 unique poses in the 12 heavy steps (moves.DIE_SEQ_HEAVY)
#        sputter sag  pops  arm-off tip  SLAM bounce slump
D_BOB = [-2.0, -8.0, -12.0, -18.0, -26.0, -34.0, -32.0, -35.0]
D_DX = [-2.0, -3.0, -2.0, 0.0, 3.0, 6.0, 6.0, 6.0]
D_HULL = [6.0, 2.0, -4.0, -10.0, -18.0, -26.0, -22.0, -27.0]
ANT_PATH = [None, None, (2.0, 10.0, -20), (-4.0, 18.0, -70), (-10.0, 12.0, -130), (-16.0, -40.0, -95),
            (-18.0, -38.0, -92), (-18.0, -41.0, -90)]
ARM_PATH = [None, None, None, (8.0, -14.0, 30), (16.0, -36.0, 70), (22.0, -54.0, 92), (23.0, -51.0, 86),
            (24.0, -55.0, 90)]


def _die(k):
    feet = legs((STANCE_X["r"] + [0, 2, 4, 6, 8, 10, 10, 10][k], 0.0), (STANCE_X["l"] - [0, 1, 2, 3, 4, 5, 5, 5][k], 0.0),
                (D_DX[k], CROUCH + D_BOB[k]))
    pose = merge(feet, arms(-100 + [8, 20, 30, 0, 0, 0, 0, 0][k], -25 + [0, 10, 20, 0, 0, 0, 0, 0][k],
                            -85 + [10, 25, 45, 60, 70, 80, 78, 80][k], -25 + [0, 5, 10, 15, 20, 25, 25, 25][k]), {
        "hull": {"r": D_HULL[k], "x": [0, 0.8, -0.8, 0, 0, 0, 0, 0][k]},
        "sparks": {"show": k in (0, 3)},
        "hit_spark": {"show": k in (0, 2)},
        "smoke": {"show": k in (5, 6, 7), "s": [1, 1, 1, 1, 1, 0.8, 1.1, 1.25][k], "z": [0, 0, 0, 0, 0, 0, 3, 6][k]},
        "panel": {"x": -3.0 * min(1, k), "y": -5.0 * min(1, k), "r": 30 * min(1, k)},
    })
    if ANT_PATH[k] is not None:
        x, z, r = ANT_PATH[k]
        pose["antenna"] = {"hide": True}
        pose["ant_loose"] = {"show": True, "x": x, "z": z, "r": r}
    if ARM_PATH[k] is not None:
        x, z, r = ARM_PATH[k]
        pose["fore_r"] = {"hide": True}
        pose["arm_loose"] = {"show": True, "x": x, "z": z, "r": r}
    g = ["g_wide", "g_hurt", "g_spiral", "g_spiral", "eyes_x", "eyes_x", "eyes_x", "eyes_x"][k]
    return merge(pose, KF.glyph(g))


def clips():
    cl = [
        M.clip("idle", [_idle(f) for f in range(6)], [M.IDLE_MS_HEAVY] * 6, loop=True),
        M.clip("walk", [_walk(f) for f in range(8)], WALK_MS, loop=True),
        _attack_clip(),
        M.clip("hit", [_hit(k) for k in range(5)], M.HIT_MS),
        M.clip("die", [_die(k) for k in range(8)], M.DIE_MS_HEAVY, sequence=M.DIE_SEQ_HEAVY,
               extra=M.die_meta(HEIGHT_LU, heavy=True)),
    ]
    return M.check_contract(cl, heavy=True)
