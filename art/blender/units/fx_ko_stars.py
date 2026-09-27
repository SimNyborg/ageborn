"""Shared effect fx.ko_stars: three pale-yellow stars circling above a defeated unit.

3 frames, each turning the ring by 40 degrees, so the 3 stars (120 degrees apart) loop
seamlessly. Rendered for a unit FX_REF_WIDTH_LU wide; the game scales it by
sqrt(unit width / reference). No team layer.
"""
import math

from ageborn_art import config as C
from ageborn_art.anim import Clip
from ageborn_art.geometry import Geo

SLUG = "ko_stars"
FILE_SLUG = "fx_ko_stars"
VISUAL_ID = "fx.ko_stars"
NAME = "KO stars"
TEAM = False
YAW_DEG = 0.0
OUTER_OUTLINE = (1.5, 0.62, 1.0)
HEIGHT_LU = 20
CANVAS = (136, 72)      # px at 2x
FEET = (68, 36)         # ring centre
STAR = "#F7E7A1"
RING = (C.FX_REF_WIDTH_LU * 0.24, 7.0)   # ring radii: x (screen), y (depth)


def build(rig):
    for i in range(3):
        rig.joint(f"s{i}", "root", (0, 0, 0))
        g = Geo().star((0, 0, 0), 6.2, 2.9, 2.8)
        rig.part(f"s{i}", g, STAR, finish="dust")


def _pose(f):
    pose = {}
    for i in range(3):
        a = math.radians(40 * f + 120 * i + 90)
        depth = math.sin(a)                    # +1 far side, -1 near side
        pose[f"s{i}"] = {"x": math.cos(a) * RING[0], "y": depth * RING[1],
                         "z": -depth * 2.5, "s": 0.85 - 0.15 * depth, "r": 25 * f + 40 * i}
    return pose


def clips():
    return [Clip("play", 3, _pose, loop=True, durations=[83, 83, 83])]
