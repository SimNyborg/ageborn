"""Shared effect fx.dust_poof: the cartoon death poof (DESIGN A11: units pop into dust).

Frame 0 is the biggest: one round cloud about 1.2x the unit's width with a white flash
core. Frames 1-4 grow to 1.3x and rise 6 lu while the cloud breaks into 6 puffs that
shrink away (shrinking, not fading: fades band badly in a 256-colour PNG).
Rendered once for a unit FX_REF_WIDTH_LU wide; the game scales it by unit width.
No team layer, and only a thin outline at fill x 0.85.
"""
import math

from ageborn_art import config as C
from ageborn_art.anim import Clip
from ageborn_art.geometry import Geo

SLUG = "dust_poof"
FILE_SLUG = "fx_dust_poof"
VISUAL_ID = "fx.dust_poof"
NAME = "Dust poof"
TEAM = False
YAW_DEG = 0.0
OUTER_OUTLINE = (1.0, 0.85, 1.0)
W = C.FX_REF_WIDTH_LU * 1.2          # frame 0 cloud width: 96 lu
HEIGHT_LU = round(W * 0.8)
CANVAS = (300, 260)                   # px at 2x
FEET = (150, 136)                     # the effect's origin (cloud centre) in px at 2x
DUST = "#F4EFE4"
DUST_SHADE = "#E6DDCF"

# puff layout: (angle deg in the screen plane, distance factor, size factor)
PUFFS = [(96, 0.55, 0.64), (28, 0.66, 0.56), (152, 0.62, 0.62), (-22, 0.58, 0.5),
         (208, 0.64, 0.55), (-84, 0.42, 0.48)]
R = W * 0.26                          # puff radius at frame 0


def build(rig):
    rig.joint("cloud", "root", (0, 0, 0))
    g = Geo().blob((0, 2, 0), (W * 0.36, W * 0.3, W * 0.32), p=2.0, cuts=6)
    rig.part("cloud", g, DUST, finish="dust")
    for i, (ang, d, s) in enumerate(PUFFS):
        a = math.radians(ang)
        pos = (math.cos(a) * W * 0.5 * d, -1.0 - i * 0.4, math.sin(a) * W * 0.4 * d)
        rig.joint(f"p{i}", "root", pos)
        g = Geo().sphere(pos, R * s * 1.25, cuts=5)
        g.sphere((pos[0] + R * s * 0.55, pos[1] - 1.5, pos[2] + R * s * 0.4), R * s * 0.7, cuts=4)
        rig.part(f"p{i}", g, DUST if i % 2 else DUST_SHADE, finish="dust")
    rig.joint("core", "root", (0, -34, 2), hidden=True)
    g = Geo().blob((0, -34, 2), (W * 0.24, 2.0, W * 0.19), p=2.0, cuts=5)
    rig.part("core", g, glow="#FFFFFF", outline=0)


def _pose(f):
    # frame 0: one round cloud (puffs tucked in as bumps) with a white flash core: the
    # most area; 1-4: the puffs fly apart (the extent grows to 1.3x), rise 6 lu, shrink
    pose = {"core": {"show": f == 0}}
    u = f / 4.0
    pose["cloud"] = {"s": [1.0, 0.72, 0.45, 0.2, 0.0][f]}
    for i, (ang, d, s) in enumerate(PUFFS):
        a = math.radians(ang)
        spread = W * 0.5 * d * 0.34 * u
        pose[f"p{i}"] = {"x": math.cos(a) * spread,
                         "z": math.sin(a) * spread * 0.8 + 6.0 * u,
                         "s": [1.1, 0.98, 0.78, 0.54, 0.3][f]}
    return pose


def clips():
    return [Clip("play", 5, _pose, durations=[83, 83, 83, 83, 83])]
