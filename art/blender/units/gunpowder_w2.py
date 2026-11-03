"""Gunpowder Age detail helpers for the art round's wave W2 (Track GUNPOWDER): small parts that bring the Gunpowder
troops to the detail standard on top of the shared `rigs_gunpowder`, `kit_gunpowder` and `kit_bronze_detail` parts.

Only the Gunpowder unit scripts of wave W2 import it; no shared module changes, so every other unit renders byte for
byte as before.

  diag_band   a cross-belt, baldric or sash across a coat: the coat's own blob grown a little and cut down to the
              strip between two parallel tilted planes (kit_bronze_detail.shell), so it follows the curve
  studs       buttons, studs or rivets on the camera-side surface of a part, placed by the camera ray
  on_surface  the camera-side surface point of a part at a side-view (x, z)
  team_line   a fold, crease or seam drawn on a team surface in a darker team tone (a team part, so it keeps the
              team area): kit_bronze_detail.surface_line's strokes as a team part
"""
import math

from ageborn_art import face as F
from ageborn_art import kit_bronze_detail as KD
from ageborn_art import look
from ageborn_art import rigs_gunpowder as B
from ageborn_art.geometry import Geo


def diag_band(center, radii, a_deg, d0, d1, p=2.4, taper=(1.0, 1.0), grow=0.3, keep=(), rot=(0, 0, 0),
              shift=(0.0, 0.0)):
    """A shell of a blob part (the same centre, radii, p, taper, rot and shift) between two parallel planes whose
    normal n = (cos a, 0, sin a) lies in the side view: the strip at signed distances d0 < d1 from the centre
    along n. `keep` adds more cut planes (point, normal toward the side cut away). Returns the Geo."""
    a = math.radians(a_deg)
    n = (math.cos(a), 0.0, math.sin(a))
    cx, cy, cz = center
    planes = [((cx + n[0] * d1, cy, cz + n[2] * d1), n),
              ((cx + n[0] * d0, cy, cz + n[2] * d0), (-n[0], 0.0, -n[2]))] + list(keep)
    return KD.shell(center, radii, p=p, taper=taper, grow=grow, keep=planes, rot=rot, shift=shift)


def on_surface(rig, joint, refs, x, z):
    """The camera-side surface point of the Geos `refs` (shaped like the joint's parts at rest) seen at the
    side-view (x, z), lifted a little toward the camera (face.Face.hit)."""
    return tuple(F.Face(rig, joint, refs).hit(x, z))


def team_line(rig, joint, ref, pts, w, tone=0.78, depth=0.4):
    """A line of width w (lu) through the side-view points `pts` on the surface of `ref` (a fresh Geo shaped like
    the part), in the team tone `tone` (look.team_part; 1 is the team colour, look.TEAM_DARK the team-dark)."""
    fc = F.Face(rig, joint, [ref])
    g = Geo()
    for (x0, z0), (x1, z1) in zip(pts, pts[1:]):
        mx, mz = (x0 + x1) / 2, (z0 + z1) / 2
        fc.stroke(g, fc.hit(mx, mz), [(x0 - mx, z0 - mz), (x1 - mx, z1 - mz)], w, depth)
    return look.team_part(rig, joint, g, tone=tone, outline=0, highlight=False)


def studs(rig, joint, refs, pts, r=1.3, color=B.BRASS, outline=0.4, finish="metal", squash=None):
    """Buttons, studs or rivets of radius r on the camera-side surface of `refs` at the side-view points `pts`
    (`refs` must be fresh Geos: rig.part frees the Geo it is given).
    `squash` (sx, sy, sz) flattens them into discs. New parts under 2.5 lu vanish at game scale (W0 review), so
    keep r >= 1.25."""
    fc = F.Face(rig, joint, refs)
    g = Geo()
    for x, z in pts:
        c = tuple(fc.hit(x, z))
        if squash:
            g.blob(c, (r * squash[0], r * squash[1], r * squash[2]), p=2.2)
        else:
            g.sphere(c, r, cuts=2)
    return rig.part(joint, g, color, finish=finish, outline=outline)
