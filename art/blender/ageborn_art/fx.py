"""Shared death effect: the unit pops into a dust cloud with KO stars (no blood, DESIGN A11).

The FX parts live in the unit's own rig as joints hidden by default, so the death clip is
self-contained. Colours stay low-saturation to respect the A11 colour rule.
"""
import math

from .anim import ease, key
from .geometry import Geo

DUST = "#E4DACB"
DUST_DARK = "#CDBFA8"
STAR = "#FFF3CC"

# (angle in the screen plane in degrees, radius factor, size factor)
_PUFFS = [(90, 0.20, 1.15), (20, 0.55, 0.85), (160, 0.55, 0.9), (-35, 0.5, 0.75),
          (215, 0.5, 0.8), (60, 0.62, 0.7), (125, 0.65, 0.72)]
_STARS = 3


def add_death_fx(rig, height, width=None, puff_scale=1.0):
    """Add hidden dust puffs and KO stars scaled to a unit `height` (lu)."""
    width = width or height * 0.9
    cz = height * 0.42
    rig.death_fx = {"height": height, "width": width, "cz": cz}
    base_r = height * 0.19 * puff_scale
    for i, (ang, rf, sf) in enumerate(_PUFFS):
        name = f"fx_puff{i}"
        a = math.radians(ang)
        pos = (math.cos(a) * width * 0.25 * rf, -6.0 - i * 0.7, cz + math.sin(a) * height * 0.25 * rf)
        rig.joint(name, "root", pos, hidden=True)
        g = Geo()
        r = base_r * sf
        g.blob(pos, (r, r * 0.9, r * 0.92), p=2.0, cuts=5)
        g.blob((pos[0] + r * 0.55, pos[1] - 1, pos[2] + r * 0.35), (r * 0.62,) * 3, p=2.0, cuts=4)
        g.blob((pos[0] - r * 0.5, pos[1] - 1, pos[2] + r * 0.25), (r * 0.55,) * 3, p=2.0, cuts=4)
        rig.part(name, g, fill=DUST if i % 2 == 0 else DUST_DARK, outline=2.2)
    for i in range(_STARS):
        name = f"fx_star{i}"
        pos = (0.0, -12.0, height * 0.95)
        rig.joint(name, "root", pos, hidden=True)
        g = Geo()
        g.star(pos, height * 0.085, height * 0.038, height * 0.035)
        rig.part(name, g, fill=STAR, outline=2.0)


def death_fx_pose(f, pop_frame, n):
    """Pose for the FX joints at frame f of a death clip that pops at `pop_frame`."""
    pose = {}
    if f < pop_frame:
        return pose
    u = (f - pop_frame) / max(1, (n - 1 - pop_frame))  # 0 at the pop, 1 at the last frame
    for i, (ang, rf, sf) in enumerate(_PUFFS):
        a = math.radians(ang)
        grow = key(u, [(0.0, 0.55), (0.3, 1.1, "out"), (1.0, 0.25, "in")])
        drift = 16.0 * ease("out", u)
        pose[f"fx_puff{i}"] = {"show": True, "s": grow,
                               "x": math.cos(a) * drift, "z": math.sin(a) * drift * 0.8 + 6 * u,
                               "alpha": key(u, [(0.0, 1.0), (0.6, 1.0), (1.0, 0.0)])}
    for i in range(_STARS):
        ph = 2 * math.pi * (i / _STARS + 0.35 * u)
        pose[f"fx_star{i}"] = {"show": True,
                               "x": math.cos(ph) * 15.0, "y": math.sin(ph) * 10.0,
                               "z": 6.0 * ease("out", u),
                               "rz": 0.0, "r": 40.0 * u + 25 * i,
                               "s": key(u, [(0.0, 0.3), (0.25, 1.15, "back"), (0.8, 1.0), (1.0, 0.0, "in")])}
    return pose
