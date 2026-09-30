"""Steam Golem: Industrial Age heavy (docs/design-lane-ages.md A17.10). Armoured mech melee, blunt,
~110 lu, large. Piston Punch: the first hit of each engagement deals x2 with 30 lu knockback.
Walker rig (A11): a hull on two legs.

Look (A17.12, Industrial palette): a squat, top-heavy riveted steam automaton. A big iron boiler
belly with copper bands, rows of rivets, a wide team armour band round the middle and a firebox
door whose grate glows warm; a small domed head with two round porthole eyes (warm glass) under a
heavy brow plate; a tall coal chimney on its back that puffs steam in the idle and walk (A17.12
"a chimney that puffs in idle"); it is turned well toward the camera, and its face is the
furnace itself: a dark furnace mouth on the boiler front with a glowing grate and two angry
glowing eye slits under iron brow plates, a low riveted dome cap above; stumpy iron legs with knee discs and wide flat feet; the near arm
an oversized piston ram ending in a huge riveted fist with a team knuckle plate, the far arm a
smaller clamp. A team pennant on a pole rises from the far shoulder plate (the heavy's team cue). The walk is a
heavy 1 s stomp; the attack ("piston punch with a steam burst") cocks the ram back, holds, fires
the piston out (the rod visibly extends about 26 lu) with a smear and slams the fist home (held impact, sparks, a burst of steam from the
elbow valve), then retracts. Heavy melee timing (retime.HEAVY_MELEE).
"""
import math

from ageborn_art import kit_industrial as KI
from ageborn_art import moves as M
from ageborn_art import rigs_industrial as I
from ageborn_art.anim import merge, squash
from ageborn_art.geometry import Geo

SLUG = "steam_golem"
NAME = "Steam Golem"
HEIGHT_LU = 110
YAW_DEG = -24.0          # turned toward the camera so the furnace face on the boiler front reads
CANVAS = (360, 300)
FEET = (132, 280)
ANCHORS = {"head": (4, 106), "hitCenter": (0, 58)}

NO_RETIME = True

HIP_Z = 36.0
THIGH, SHIN = 17.0, 19.0
ANK_REST = HIP_Z - THIGH - SHIN
ANKLE_H = 5.0
LEG_Y = {"r": -13.0, "l": 13.0}
STANCE_X = {"r": 7.0, "l": -7.0}

BOILER = (0.0, 0.0, 58.0)
SH_R = (4.0, -27.0, 72.0)
SH_L = (2.0, 25.0, 72.0)
UP_L, FORE_L = 13.0, 15.0
FIST = (SH_R[0], SH_R[1], SH_R[2] - UP_L - FORE_L - 10.0)
CHIMNEY = (-16.0, 6.0, 80.0)


def build(rig):
    rig.joint("body", "root", (0, 0, 0))
    rig.joint("hips", "body", (0, 0, HIP_Z))
    rig.joint("hull", "hips", BOILER)
    for s in ("r", "l"):
        I.walker_leg(rig, s, (0.0, LEG_Y[s], HIP_Z), THIGH, SHIN)

    # legs: stumpy iron columns, copper knee discs, wide riveted feet
    for s in ("r", "l"):
        y = LEG_Y[s]
        sy = 1 if s == "r" else -1
        kz = HIP_Z - THIGH
        g = Geo().capsule((0, y, HIP_Z), (0, y, kz), 6.4, 5.8)
        rig.part(f"thigh_{s}", g, I.IRON_DK, finish="metal")
        g = Geo().blob((1.0, y - 1.0 * sy, HIP_Z - 6.0), (7.4, 6.8, 7.0), p=2.8)
        rig.part(f"thigh_{s}", g, team=True)
        g = Geo().lathe([(0, -3.4), (5.4, -3.2), (5.8, 0), (5.4, 3.2), (0, 3.4)], (1.0, y, kz), (1.0, y - sy, kz),
                        segs=18)
        rig.part(f"shin_{s}", g, I.COPPER, finish="metal", outline=0.8)
        g = Geo().capsule((0, y, kz), (0, y, ANK_REST + 1.0), 5.8, 6.8)
        rig.part(f"shin_{s}", g, I.IRON, finish="metal")
        g = Geo()
        I.rivets(g, [(4.6, y - 3.8 * sy, kz - 6.0), (5.4, y - 3.4 * sy, kz - 12.0)], r=0.9)
        rig.part(f"shin_{s}", g, I.IRON_LT, finish="metal", outline=0)
        a = ANK_REST
        g = Geo().blob((3.6, y, a - 2.6), (11.8, 8.2, 3.4), p=3.4, taper=(1.0, 0.85))
        rig.part(f"foot_{s}", g, I.IRON_DK, finish="metal")
        g = Geo()
        I.rivets(g, [(dx, y - 8.2 * sy, a - 2.4) for dx in (-4.0, 2.0, 8.0)], r=0.9)
        rig.part(f"foot_{s}", g, I.BRASS_LT, finish="metal", outline=0)
    rig.track("_foot", "foot_r", (3.6, LEG_Y["r"], ANK_REST - 5.0))

    # the boiler belly: iron barrel, copper bands, team armour band, firebox with a glowing grate
    hx, hy, hz = BOILER
    g = Geo().blob((0, 0, hz), (25.0, 23.0, 24.0), p=2.6, taper=(0.86, 0.94))
    rig.part("hull", g, I.IRON, finish="metal")
    g = Geo().blob((0.3, 0, hz - 1.0), (25.6, 23.6, 24.4), p=2.6, taper=(0.86, 0.94))
    g.clip((0, 0, hz - 12.0), (0, 0, -1)).clip((0, 0, hz + 4.0), (0, 0, 1))
    rig.part("hull", g, team=True)
    g = Geo()
    for z in (hz + 8.0, hz - 16.0):
        g.blob((0.3, 0, z), (25.4 * (0.93 if z < hz else 0.99), 23.4, 1.6), p=2.6)
    rig.part("hull", g, I.COPPER, finish="metal", outline=0.6)
    # rivet rows along the top and bottom bands (front half, facing the camera)
    g = Geo()
    for z in (hz + 11.0, hz - 19.0):
        rr = 24.6 if z > hz else 21.8
        for a in range(-150, -20, 18):
            t = math.radians(a)
            g.sphere((rr * math.cos(t) * 1.0, rr * 0.93 * math.sin(t), z), 1.1, cuts=2)
    rig.part("hull", g, I.IRON_LT, finish="metal", outline=0)
    # the furnace face on the boiler front (turned toward the camera): a dark rounded furnace
    # mouth with a glowing grate of horizontal bars and two angry glowing eye slits above it
    ang = math.radians(-42.0)
    nx, ny = math.cos(ang), math.sin(ang)
    ux, uy = -ny, nx

    def on(u, v, d=0.0):     # a point on the boiler front: u across, v up, d out of the surface
        return (24.2 * nx + ux * u + nx * d, 22.4 * ny + uy * u + ny * d, hz + v)
    g = Geo().lathe([(0, 0), (11.4, 0), (12.2, 1.8), (11.2, 3.2), (0, 3.4)], on(0, -5.0, -1.8), on(0, -5.0, 1.6),
                    segs=24, squash=(1.0, 0.72))
    rig.part("hull", g, I.COAL_LT, finish="metal", outline=0.8)
    rig.joint("fire", "hull", on(0, -5.0, 1.8))
    g = Geo().lathe([(0, 0), (9.0, 0), (8.8, 0.6), (0, 0.8)], on(0, -5.0, 1.4), on(0, -5.0, 2.4), segs=24,
                    squash=(1.0, 0.66))
    rig.part("fire", g, "#4A3A33", outline=0)
    g = Geo()
    for dv in (-3.6, 0.0, 3.6):
        w = 7.6 - abs(dv) * 0.5
        g.capsule(on(-w, -5.0 + dv, 2.8), on(w, -5.0 + dv, 2.8), 1.25)
    rig.part("fire", g, glow=I.EMBER, outline=0)
    g = Geo().sphere(on(0, -5.0, 2.2), 3.4, cuts=3)
    rig.part("fire", g, glow=I.FIRE, outline=0)
    rig.joint("eyes", "hull", on(0, 9.0, 1.0))
    g = Geo()
    for sgn in (-1, 1):
        g.capsule(on(4.0 * sgn, 7.4, 1.4), on(10.4 * sgn, 10.2, 1.4), 1.9, 1.5)
    rig.part("eyes", g, glow=I.FLASH, outline=1.0, outline_hex="#8A4A2A")
    g = Geo()
    for sgn in (-1, 1):
        g.blob(on(7.4 * sgn, 13.4, 0.8), (4.6, 4.6, 1.4), p=2.6, rot=(0, 0, 0))
    rig.part("hull", g, I.IRON_DK, finish="metal", outline=0.6)          # brow plates
    rig.joint("eyes_x", "hull", on(0, 9.0, 1.0), hidden=True)
    g = Geo()
    for sgn in (-1, 1):
        c = on(7.2 * sgn, 8.8, 1.8)
        g.capsule((c[0] - 2.2 * ux, c[1] - 2.2 * uy, c[2] + 2.2), (c[0] + 2.2 * ux, c[1] + 2.2 * uy, c[2] - 2.2), 0.9)
        g.capsule((c[0] - 2.2 * ux, c[1] - 2.2 * uy, c[2] - 2.2), (c[0] + 2.2 * ux, c[1] + 2.2 * uy, c[2] + 2.2), 0.9)
    rig.part("eyes_x", g, I.COAL, outline=0)
    # pressure gauge on the chest: its needle climbs on the wind-up and pins in the red
    KI.gauge(rig, "hull", (2.0, -22.4, hz + 13.0), r=3.6, name="gauge", normal=(0.2, -1.0))
    g = Geo().blob((2.6, -24.6, hz + 16.4), (1.4, 0.6, 0.9), p=2.4)          # the red zone mark
    rig.part("hull", g, "#8A3A2A", outline=0, highlight=False)
    # hidden accents: a rivet that pops out on a hit, a spark on the struck plate, knee steam
    rig.joint("bolt", "hull", (18.0, -16.0, hz + 2.0), hidden=True)
    g = Geo().blob((18.0, -18.0, hz + 2.0), (1.8, 1.4, 1.8), p=2.6)
    g.capsule((18.0, -16.5, hz + 2.0), (18.0, -14.0, hz + 2.0), 0.8)
    rig.part("bolt", g, I.BRASS_LT, finish="metal", outline=0.6)
    I.fuse_spark(rig, "hull", (20.0, -22.0, hz + 6.0), size=2.2, name="hitspark", seed=4, hidden=True)
    for s_ in ("r", "l"):
        I.steam_puff(rig, f"shin_{s_}", (4.0, LEG_Y[s_] - 6.0, HIP_Z - THIGH), size=0.9, name=f"ksteam_{s_}")
    # the chimney on the back and the pennant pole behind it
    cx, cy, cz = CHIMNEY
    g = Geo()
    I_cyl = [(4.4, 0), (4.6, 2.0), (4.0, 20.0), (5.8, 22.0), (6.2, 26.0), (5.0, 27.0), (3.6, 26.4)]
    g.lathe(I_cyl, (cx, cy, cz), (cx - 3.0, cy, cz + 27.0), segs=20)
    rig.part("hull", g, I.COAL_LT, finish="metal")
    g = Geo().lathe([(5.2, -1.0), (5.5, 0), (5.2, 1.0)], (cx - 1.0, cy, cz + 9.0), (cx - 1.1, cy, cz + 10.0), segs=18)
    rig.part("hull", g, I.COPPER, finish="metal", outline=0.5)
    I.steam_puff(rig, "hull", (cx - 3.0, cy - 3.0, cz + 31.0), size=1.5, name="puff")
    I.steam_puff(rig, "hull", (cx - 4.0, cy - 3.0, cz + 38.0), size=1.1, name="puff2")

    # head: a low riveted dome cap with a copper knob and a pressure whistle (the face is the
    # furnace below it)
    rig.joint("head", "hull", (8.0, 0, hz + 22.0))
    g = Geo().blob((6.0, 0, hz + 23.0), (13.0, 12.4, 8.4), p=2.3)
    g.clip((6.0, 0, hz + 18.0), (0, 0, -1))
    rig.part("head", g, I.IRON_LT, finish="metal")
    g = Geo()
    for a_ in range(-150, -20, 26):
        t = math.radians(a_)
        g.sphere((6.0 + 12.4 * math.cos(t), 11.8 * math.sin(t), hz + 21.0), 0.9, cuts=2)
    rig.part("head", g, I.BRASS_LT, finish="metal", outline=0)
    g = Geo().sphere((5.0, 0, hz + 31.4), 2.6, cuts=3)
    g.capsule((12.0, -4.0, hz + 27.0), (13.0, -4.0, hz + 33.0), 1.3)
    rig.part("head", g, I.COPPER, finish="metal", outline=0.5)

    # far arm: a smaller clamp
    rig.joint("arm_l", "hull", SH_L)
    rig.joint("fore_l", "arm_l", (SH_L[0], SH_L[1], SH_L[2] - UP_L))
    x, y, z = SH_L
    g = Geo().sphere((x, y, z), 7.6, cuts=4)
    rig.part("arm_l", g, team=True)
    g = Geo().blob((x - 1.0, y, z + 6.0), (9.0, 8.0, 2.0), p=2.8)             # shoulder plate
    rig.part("arm_l", g, I.IRON_DK, finish="metal", outline=0.6)
    I.pennant(rig, "arm_l", (x - 3.0, y, z + 7.0), 34.0, length=18.0, w=10.0, max_deg=18)
    g = Geo().capsule((x, y, z), (x, y, z - UP_L), 4.2)
    rig.part("arm_l", g, I.IRON_DK, finish="metal")
    g = Geo().capsule((x, y, z - UP_L), (x, y, z - UP_L - FORE_L), 6.0, 5.2)
    g.lathe([(2.4, 0), (1.8, 4.0), (0, 7.0)], (x + 2.6, y, z - UP_L - FORE_L), (x + 5.0, y, z - UP_L - FORE_L - 7.0), segs=10)
    g.lathe([(2.4, 0), (1.8, 4.0), (0, 7.0)], (x - 2.6, y, z - UP_L - FORE_L), (x - 4.0, y, z - UP_L - FORE_L - 7.5), segs=10)
    rig.part("fore_l", g, I.IRON, finish="metal")

    # near arm: shoulder dome (team), piston cylinder, ram, riveted fist with a team knuckle plate
    rig.joint("arm_r", "hull", SH_R)
    rig.joint("fore_r", "arm_r", (SH_R[0], SH_R[1], SH_R[2] - UP_L))
    rig.joint("ram", "fore_r", (SH_R[0], SH_R[1], SH_R[2] - UP_L - FORE_L))
    x, y, z = SH_R
    g = Geo().blob((x, y - 1.0, z + 1.0), (10.4, 9.0, 9.2), p=2.4)
    rig.part("arm_r", g, team=True)
    g = Geo()
    I.rivets(g, [(x + 9.0 * math.cos(math.radians(a)), y - 8.0, z + 1.0 + 8.0 * math.sin(math.radians(a)))
                 for a in (20, 60, 100, 140)], r=1.0)
    rig.part("arm_r", g, I.IRON_LT, finish="metal", outline=0)
    g = Geo().capsule((x, y, z), (x, y, z - UP_L), 6.2, 5.8)
    rig.part("arm_r", g, I.IRON_DK, finish="metal")
    g = Geo().lathe([(0, -3.6), (5.6, -3.4), (6.0, 0), (5.6, 3.4), (0, 3.6)], (x, y, z - UP_L), (x, y - 1, z - UP_L),
                    segs=18)
    rig.part("fore_r", g, I.COPPER, finish="metal", outline=0.7)
    g = Geo().lathe([(7.8, 0), (8.6, 1.2), (8.6, FORE_L - 3.0), (7.8, FORE_L - 1.0), (5.0, FORE_L)],
                    (x, y, z - UP_L - 1.0), (x, y, z - UP_L - FORE_L - 1.0), segs=20)
    rig.part("fore_r", g, I.IRON, finish="metal")
    g = Geo().capsule((x + 5.0, y - 4.0, z - UP_L - 4.0), (x + 7.0, y - 4.0, z - UP_L - 1.0), 1.4)   # valve
    rig.part("fore_r", g, I.BRASS, finish="metal", outline=0.5)
    fz = z - UP_L - FORE_L
    g = Geo().capsule((x, y, fz + 26.0), (x, y, fz - 3.0), 3.2)          # the piston rod (slides out)
    rig.part("ram", g, I.IRON_LT, finish="metal", outline=0.8)
    g = Geo()
    for dz in (2.0, 8.0):
        g.lathe([(3.4, -0.6), (3.8, 0), (3.4, 0.6)], (x, y, fz - dz), (x, y, fz - dz + 1), segs=14)
    rig.part("ram", g, I.BRASS_LT, finish="metal", outline=0.4)
    g = Geo().blob((x, y, fz - 10.0), (13.4, 11.6, 9.6), p=3.4)
    rig.part("ram", g, I.IRON_DK, finish="metal")
    g = Geo()
    for dx in (-7.5, -2.5, 2.5, 7.5):   # knuckles
        g.blob((x + dx, y - 1.0, fz - 19.0), (2.5, 10.4, 2.8), p=2.6)
    rig.part("ram", g, I.IRON, finish="metal", outline=0.6)
    g = Geo().blob((x, y - 11.8, fz - 10.0), (11.0, 1.4, 7.0), p=3.2)
    rig.part("ram", g, team=True, outline=0.7)
    g = Geo()
    I.rivets(g, [(x + dx, y - 13.4, fz - 10.0 + dz) for dx in (-7.6, 7.6) for dz in (-4.6, 4.6)], r=1.1)
    rig.part("ram", g, I.BRASS_LT, finish="metal", outline=0)
    rig.track("fist", "ram", FIST)
    I.fuse_spark(rig, "ram", (x, y - 3.0, fz - 22.0), size=2.6, name="sparks", seed=2, hidden=True)
    I.steam_puff(rig, "fore_r", (x + 8.0, y - 4.0, z - UP_L - 2.0), size=1.6, name="steam")


# -- poses ---------------------------------------------------------------------------------
def legs(foot_r, foot_l, hips=(0.0, 0.0)):
    pose = {}
    for s, (fx_, lift) in (("r", foot_r), ("l", foot_l)):
        tgt = (fx_ - hips[0], ANKLE_H + lift - hips[1])
        pose.update(I.leg_ik(s, (0.0, HIP_Z), tgt, THIGH, SHIN, knee_fwd=True))
    pose["hips"] = {"x": hips[0], "z": hips[1]}
    return pose


def arms(ra, rf, la=-100.0, lf=-60.0, ram=0.0):
    return merge(I.arm("r", ra, rf), I.arm("l", la, lf), {"ram": {"z": -ram}})


REST_ARMS = arms(-104, -86, -86, -60)     # the ram hangs at the side (the face stays clear)
CROUCH = 6.0


def _stand(bob=0.0, dx=0.0):
    return legs((STANCE_X["r"], 0.0), (STANCE_X["l"], 0.0), (dx, CROUCH + bob))


def _idle(f):
    # 6 poses in 900 ms: the boiler breathes (a slow rise), the chimney puffs twice, the fire
    # flickers, the gauge needle trembles and the pennant arm sways
    c = math.cos(2 * math.pi * f / 6)
    lag = math.cos(2 * math.pi * (f - 1) / 6)
    return merge(_stand(1.0 * c), REST_ARMS, {
        "hull": {"r": 1.0 * c, "z": 0.5 * lag},
        "head": {"r": -1.5 * lag, "z": 0.4 * max(0.0, -c)},
        "arm_r": {"r": 3.0 * lag}, "arm_l": {"r": 2.5 * lag},
        "ram": {"z": 1.0 * max(0.0, c)},
        "puff": {"show": f in (1, 2, 4), "s": [1, 0.75, 1.1, 1, 0.8, 1][f], "z": [0, 0, 4, 0, 0, 0][f]},
        "puff2": {"show": f in (2, 3, 5), "s": [1, 1, 0.9, 1.2, 1, 1.1][f], "z": [0, 0, 0, 5, 0, 3][f]},
        "fire": {"s": [1.0, 0.92, 1.06, 0.96, 1.04, 0.9][f]},
        "gauge_needle": {"rx": [-10, -4, -12, -6, -9, -3][f]},
    })


WALK_MS = [125] * 8
STRIDE = 27.5          # 2 x 27.5 lu per 1 s cycle = 55 lu/s (sim speed 55)


def _walk(f):
    # clank: a hard contact (the hull jolts down, the knee vents steam), the hull pitching and
    # yawing with each step, the ram swinging a beat late
    xr, lr, _ = I.walker_cycle(f, 8, STRIDE, 11.0)
    xl, ll, _ = I.walker_cycle(f, 8, STRIDE, 11.0, phase=0.5)
    bob = [-3.6, -1.6, 1.2, 0.6, -3.6, -1.6, 1.2, 0.6][f]
    lag = [0.6, -3.6, -1.6, 1.2, 0.6, -3.6, -1.6, 1.2][f]
    p = 2 * math.pi * f / 8
    return merge(legs((xr, lr), (xl, ll), (0.0, CROUCH + bob)), REST_ARMS, {
        "hull": dict(r=-3.0 + 1.8 * math.cos(2 * p), rz=4.0 * math.sin(p), z=-0.35 * lag),
        "head": {"r": 1.4 * lag, "z": -0.3 * lag},
        "arm_r": {"r": -12 * math.cos(p - 0.8)}, "fore_r": {"r": 6 * math.cos(p - 0.8)},
        "arm_l": {"r": 10 * math.cos(p - 0.8)},
        "ram": {"z": 1.2 * max(0.0, -lag)},
        "puff": {"show": f in (0, 1, 4, 5), "x": [0, -3, 0, 0, 0, -3, 0, 0][f],
                 "s": [0.8, 1.1, 1, 1, 0.8, 1.1, 1, 1][f]},
        "puff2": {"show": f in (1, 5), "x": -5.0},
        "ksteam_r": {"show": f == 0, "s": 0.8}, "ksteam_l": {"show": f == 4, "s": 0.8},
        "gauge_needle": {"rx": -8.0 + 3.0 * math.sin(2 * p)},
    })


def _walk_clip():
    ov = {0: [{"kind": "dust", "ground": (17.0, 0.0), "size_lu": 5.5, "puffs": 3, "seed": 41, "spread": 0.9}],
          4: [{"kind": "dust", "ground": (17.0, 0.0), "size_lu": 5.5, "puffs": 3, "seed": 42, "spread": 0.9}]}
    return M.clip("walk", [_walk(f) for f in range(8)], WALK_MS, loop=True, overlays=ov)


# attack: 10 unique frames in the 12 heavy steps (moves.HEAVY_MELEE_MS; impact on step 6 at 570 ms)
#        shift dip  coil HOLD smear smear IMP  shock follow recover
RA = [-110, -130, -160, -178, -84, -38, -22, -24, -46, -86]
RF = [-94, -118, -154, -172, -64, -30, -22, -24, -42, -76]
RAM = [0, -2, -5, -7, 8, 18, 28, 25, 12, 3]
HULL_R = [2, 5, 9, 12, -2, -8, -13, -11, -6, -2]
HULL_RZ = [3, 7, 12, 16, 3, -4, -8, -7, -4, -1]
HIP_X = [-1, -2, -3, -4, 2, 5, 7, 6.5, 4, 1]
HZ_A = [0, -3, -2.5, -2, -1, -2, -4.5, -3.5, -1.5, -0.5]
LA = [-92, -84, -74, -68, -104, -122, -134, -130, -114, -98]
LF = [-56, -46, -36, -30, -70, -86, -96, -92, -76, -62]
NEEDLE = [-8, -30, -60, -95, -80, -60, -20, -10, -8, -8]
ATTACK_SEQ = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 9, 9]


def _attack_pose(f):
    pose = merge(_stand(HZ_A[f], HIP_X[f]), arms(RA[f], RF[f], LA[f], LF[f], RAM[f]), {
        "hull": {"r": HULL_R[f], "rz": HULL_RZ[f]},
        "head": {"r": [0, 2, 4, 5, -2, -4, -6, -5, -3, -1][f]},
        "sparks": {"show": f == 6},
        "steam": {"show": f in (3, 6, 7, 8), "s": [1, 1, 1, 0.55, 1, 1, 0.95, 1.15, 1.0, 1][f],
                  "z": [0, 0, 0, 0, 0, 0, 0, 2, 5, 0][f]},
        "puff": {"show": f in (2, 3, 7, 8), "s": [1, 1, 1.1, 1.25, 1, 1, 1, 1.4, 1.6, 1][f],
                 "z": [0, 0, 0, 2, 0, 0, 0, 3, 6, 0][f]},
        "puff2": {"show": f in (3, 8), "s": 1.2},
        "fire": {"s": [1.0, 1.05, 1.12, 1.25, 1.15, 1.1, 1.0, 0.95, 1.0, 1.0][f]},
        "eyes": {"s": [1, 1, 1.1, 1.3, 1.2, 1.2, 1.25, 1.1, 1, 1][f]},
        "gauge_needle": {"rx": NEEDLE[f]},
        "ksteam_r": {"show": f == 6, "s": 1.0}, "ksteam_l": {"show": f == 6, "s": 1.0},
    })
    if f in (4, 5):   # the piston rod stretches along the jab
        pose["ram"]["sz"] = 1.12
    if f == 6:        # the rubber knuckle pad and the rod squash on the hit
        pose["ram"]["sz"] = 0.9
    return pose


FIST_TIP = (FIST[0], FIST[1] - 2.0, FIST[2] - 12.0)


def _attack_clip():
    jab = {"kind": "streak", "joint": "ram", "point": FIST_TIP, "color": I.IRON_LT, "width_lu": 16.0,
           "white": 0.35}
    ov = {
        4: [dict(jab, **{"from": 3, "t0": 0.0, "t1": 1.0})],
        5: [dict(jab, **{"from": 3, "t0": 0.3, "t1": 1.0, "width_lu": 14.0})],
        6: [dict(jab, **{"from": 4, "t0": 0.4, "t1": 1.0, "width_lu": 11.0}),
            {"kind": "burst", "joint": "ram", "point": FIST_TIP, "r0_lu": 12.0, "r1_lu": 21.0, "n": 7,
             "a0": -80.0, "arc": 160.0},
            {"kind": "dust", "ground": (26.0, 0.0), "size_lu": 9.0, "puffs": 4, "seed": 43, "spread": 1.0},
            {"kind": "dust", "ground": (-16.0, 0.0), "size_lu": 7.0, "puffs": 3, "seed": 44, "spread": 0.8,
             "dir": -1.0}],
        7: [{"kind": "dust", "ground": (28.0, 0.0), "size_lu": 7.5, "puffs": 4, "seed": 45, "spread": 1.3}],
    }
    return M.clip("attack", [_attack_pose(f) for f in range(10)], M.HEAVY_MELEE_MS,
                  impact=M.HEAVY_MELEE_IMPACT, smear=4, sequence=ATTACK_SEQ, overlays=ov)


def _hit(k):
    # mech: a hard jolt (no squash), a rivet pops out of the plate and back, a spark on the struck
    # plate, the chimney coughs, the eye slits flicker
    a = M.HIT_AMT[k]
    return merge(_stand(-1.5 * max(a, 0), -3.5 * a), REST_ARMS, {
        "hull": {"r": 8 * a, "rz": -4 * a}, "head": {"r": 6 * a, "z": 1.5 * max(a, 0)},
        "arm_r": {"r": 14 * a}, "arm_l": {"r": 10 * a},
        "bolt": {"show": k in (0, 1, 2), "x": [3.0, 7.0, 4.0, 0, 0][k], "y": [-2.0, -5.0, -3.0, 0, 0][k],
                 "r": [40, 120, 200, 0, 0][k]},
        "hitspark": {"show": k in (0, 1), "s": [1.2, 0.8, 1, 1, 1][k]},
        "puff": {"show": k in (1, 2), "s": [1, 1.2, 1.4, 1, 1][k]},
        "eyes": {"s": [0.55, 0.7, 1.0, 1.0, 1.0][k]},
        "gauge_needle": {"rx": [-40, -70, -20, -10, -8][k]},
    })


# D6 mech fall-apart (8 unique poses in the 12 heavy death steps, moves.DIE_SEQ_HEAVY):
# 0 sputter (steam from the joints), 1 the dome cap pops up, 2 the knees sag, 3 the ram arm drops
# off, 4 the boiler slumps to the ground, 5 the cap lands, 6-7 settled, smoke rising, fire out
DIE_HIPS = [0, -1, -6, -10, -18, -19, -19, -19]
DIE_HULL_R = [4, -3, 6, 10, 14, 12, 12, 12]
DIE_HEAD = [(0, 0, 0), (3, 16, 40), (8, 28, 110), (14, 26, 190), (20, 8, 260), (26, -30, 330),
            (30, -50, 358), (30, -50, 358)]
DIE_ARM = [None, None, None, (8, -10, 20), (16, -30, 50), (20, -40, 70), (21, -42, 74), (21, -42, 74)]


def _die(k):
    sag = [0, 0.1, 0.45, 0.7, 1.0, 1.0, 1.0, 1.0][k]
    hz = DIE_HIPS[k]
    pose = merge(legs((STANCE_X["r"] + 6 * sag, 0.0), (STANCE_X["l"] - 5 * sag, 0.0),
                      ([2, -1, -3, -4, -5, -5, -5, -5][k], CROUCH + hz)),
                 arms(-104 + 40 * sag, -86 + 50 * sag, -86 + 30 * sag, -60 + 40 * sag), {
        "hull": {"r": DIE_HULL_R[k], "rz": [3, -3, 2, 0, 0, 0, 0, 0][k]},
        "sparks": {"show": k == 0},
        "steam": {"show": k in (0, 1, 2), "s": [1.1, 1.3, 1.0, 1, 1, 1, 1, 1][k]},
        "ksteam_r": {"show": k in (0, 2, 4), "s": 1.1}, "ksteam_l": {"show": k in (1, 3), "s": 1.1},
        "puff": {"show": True, "s": [1.2, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 2.0][k],
                 "z": [0, 2, 4, 6, 8, 10, 12, 14][k]},
        "puff2": {"show": k >= 3, "s": [1, 1, 1, 1.2, 1.4, 1.6, 1.8, 2.0][k]},
        "fire": {"s": [1.2, 0.8, 0.6, 0.5, 0.4, 0.3, 0.2, 0.2][k]},
        "gauge_needle": {"rx": [-95, 20, -60, 10, 0, 0, 0, 0][k]},
    })
    hx, hzz, hr = DIE_HEAD[k]
    pose["head"] = {"x": -hx, "z": hzz, "r": hr}
    if DIE_ARM[k] is not None:
        ax, az, ar = DIE_ARM[k]
        pose["arm_r"] = merge({"arm_r": pose.get("arm_r", {})}, {"arm_r": {"x": ax, "z": az, "r": ar}})["arm_r"]
    if k >= 1:
        pose.update({"eyes": {"hide": True}, "eyes_x": {"show": True}})
    else:
        pose["eyes"] = {"s": 0.6}
    return pose


def clips():
    cl = [
        M.clip("idle", [_idle(f) for f in range(6)], [150] * 6, loop=True),
        _walk_clip(),
        _attack_clip(),
        M.clip("hit", [_hit(k) for k in range(5)], M.HIT_MS),
        M.clip("die", [_die(k) for k in range(8)], M.DIE_MS_HEAVY, sequence=M.DIE_SEQ_HEAVY,
               extra=M.die_meta(HEIGHT_LU, heavy=True)),
    ]
    return M.check_contract(cl, heavy=True)
