"""Art round W3 (Track INDUSTRIAL): small detail helpers shared by the Industrial troops' scripts.

Not a unit (it is not in render_all.AGE_OF). The Industrial troops opt into the detail standard
(`ageborn_art/look.py`, art/blender/README.md "Detail standard") with the pilot's recipe and the W1 and W2 lessons. The
conforming decals, seams, folds, panels and mail rows come from W2's `units/medieval_w2.py` (and through it W1's
`units/stone_w1.py`); this module adds what the Industrial kit needs:

  cog()          the Industrial cog emblem as conforming decals (kit_industrial.cog lays flat decals on one hit, so on a
                 bib or a boiler the teeth above the centre sink in and the cog reads as a ring with a few stubs)
  rivets()       rivet heads set onto a surface along a line (proud domes with a highlight: a row reads as rivets at
                 game scale, where single 1 lu dots would vanish)
  soot()         soot smudges laid on a surface (value breakup on cloth, steel and skin-free plates)
  patch()        a patch sewn onto cloth: a field in a second tone with a stitched border

Every number is in lu at rest, character space (x forward, y away from the camera, z up); decal points are screen
lu as Face.hit takes them.
"""
import math

from ageborn_art import face as F
from ageborn_art import look
from ageborn_art.geometry import Geo
from units import medieval_w2 as MW

# the W1 and W2 helpers the Industrial scripts use as they are
kinds = MW.kinds
skin_palette = MW.skin_palette
field = MW.field
ribbon = MW.ribbon
seam = MW.seam
plate_band = MW.plate_band
folds = MW.folds
panel = MW.panel
piping = MW.piping
cut_loop = MW.cut_loop
mail_rows = MW.mail_rows
shell_bands = MW.shell_bands
lattice = MW.lattice
ring = MW.ring
beads = MW.beads
Coat = MW.Coat
tufts = MW.tufts
shingles = MW.shingles

SHADE_SOLDIER = MW.SHADE_SOLDIER
RIM_SOLDIER = MW.RIM_SOLDIER
HIGHLIGHT_SOLDIER = MW.HIGHLIGHT_SOLDIER
SHADE_BEAST = MW.SHADE_BEAST
RIM_BEAST = MW.RIM_BEAST
HIGHLIGHT_BEAST = MW.HIGHLIGHT_BEAST
SHADE_BIG = MW.SHADE_BIG
SHADE_MOUNT = MW.SHADE_MOUNT


def cog(face, g, center_xz, s=1.0, teeth=8, depth=0.4):
    """kit_industrial.cog's emblem (a toothed ring about 7 x s lu across round a hub hole) as conforming decals: the
    ring as a ribbon round the hole and each tooth as its own field, every vertex cast onto the surface."""
    cx, cz = center_xz
    ro, ri, rt = 2.7 * s, 1.35 * s, 3.55 * s
    rm = (ro + ri) / 2
    loop = [(cx + rm * math.cos(2 * math.pi * k / 24), cz + rm * math.sin(2 * math.pi * k / 24)) for k in range(25)]
    ribbon(g, face, loop, ro - ri, depth)
    for k in range(teeth):
        a = 2 * math.pi * (k + 0.5) / teeth
        ca, sa = math.cos(a), math.sin(a)
        w = 0.95 * s
        pts = [(ca * (ro - 0.3) - sa * w, sa * (ro - 0.3) + ca * w), (ca * (ro - 0.3) + sa * w, sa * (ro - 0.3) - ca * w),
               (ca * rt + sa * w * 0.8, sa * rt - ca * w * 0.8), (ca * rt - sa * w * 0.8, sa * rt + ca * w * 0.8)]
        field(g, face, [(cx + u, cz + v) for u, v in pts], depth)
    return g


def rivets(rig, joint, face, pts, r=1.1, fill="#9AA0A8", proud=0.5, outline=0.3, finish="metal"):
    """Rivet heads at the screen points pts [(x, z)]: domes of radius r set onto `face`'s surface (their centre
    `proud` lu toward the camera, so the dome stands off the plate and catches the light)."""
    V = face.view
    g = Geo()
    for x, z in pts:
        c = face.hit(x, z) - V * proud
        g.sphere(tuple(c), r, cuts=2)
    return rig.part(joint, g, fill, finish=finish, outline=outline)


def rivet_line(p0, p1, n):
    """n screen points evenly along p0 -> p1 (inclusive)."""
    if n == 1:
        return [((p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2)]
    return [(p0[0] + (p1[0] - p0[0]) * k / (n - 1), p0[1] + (p1[1] - p0[1]) * k / (n - 1)) for k in range(n)]


def soot(rig, joint, face, blots, fill="#4A4542", depth=0.3):
    """Soot smudges: blots = [(x, z, rx, rz), ...] in screen lu, conforming ellipses in a soot tone (value breakup on
    work clothes and plates; never on faces)."""
    g = Geo()
    for x, z, rx, rz in blots:
        field(g, face, F.ellipse(x, z, rx, rz, 14), depth)
    return rig.part(joint, g, fill, outline=0, highlight=False)


def dashes(pts, dash=1.3, gap=0.9):
    """A polyline pts [(x, z)] cut into dashes `dash` long with `gap` between them: a list of 2-point segments."""
    out = []
    carry, on = 0.0, True
    for (x0, z0), (x1, z1) in zip(pts, pts[1:]):
        L = math.dist((x0, z0), (x1, z1))
        t = 0.0
        while t < L - 1e-6:
            step = min((dash if on else gap) - carry, L - t)
            if on:
                a, b = t / L, (t + step) / L
                out.append([(x0 + (x1 - x0) * a, z0 + (z1 - z0) * a), (x0 + (x1 - x0) * b, z0 + (z1 - z0) * b)])
            t += step
            carry += step
            if carry >= (dash if on else gap) - 1e-6:
                carry, on = 0.0, not on
    return out


def stitches(rig, joint, face, pts, fill, w=0.75, dash=1.3, gap=0.9, depth=0.42):
    """A stitched seam: dashes of thread colour `fill` along pts [(x, z)] (screen lu), laid on `face`."""
    g = Geo()
    for seg in dashes(pts, dash, gap):
        ribbon(g, face, seg, w, depth)
    return rig.part(joint, g, fill, outline=0, highlight=False)


def patch(rig, joint, face, pts, fill=None, stitch=None, team=False, w=0.75, depth=0.35):
    """A patch sewn onto cloth over the convex polygon pts [(x, z)]: a field in `fill` (or team-dark) with stitches
    round it in the thread colour `stitch` (none if None)."""
    panel(rig, joint, face, pts, depth=depth, team=team, fill=fill)
    if stitch is not None:
        stitches(rig, joint, face, list(pts) + [pts[0]], stitch, w=w, depth=depth + 0.08)


def team_dark(rig, joint, g, outline=0):
    """A part in the team-dark tone (look.team_part)."""
    return look.team_part(rig, joint, g, outline=outline)
