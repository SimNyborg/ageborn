"""Shared model detail for the world items of art round world wave A (Track WORLD: Stone and Bronze turrets, forts,
bases, base skins and decorations to the detail standard; `look_world.py` opts them in and checks them).

The detail the audit's world rows ask for (item 47 audit 5.2): plinths of fitted blocks 4-6 lu with chips and moss,
lashings and wraps that read (2.5 lu), two-tone team zones on pennants and painted bands, wear on corners. Every
helper adds parts to a joint in character space (authored lu: a turret's parts are scaled by TURRET_SCALE at render).
"""
import math

from ageborn_art import look
from ageborn_art.geometry import Geo

from world.common import rock

# the world items' shading on top of the standard (W3's machines: a darker shadow band, a core shadow just below the
# terminator, a lit top plane, a stronger in-band gradient and cavity, a brighter grazing rim)
SHADE_WORLD = {"shadow": 0.82, "core": 0.22, "core_width": 0.30, "gradient": 2.4, "cavity": 0.7, "rim_mix": 0.52,
               "top": 0.12, "top_t": 0.60, "team_core": 0.45}
# the world sheets are drawn upscaled (1x at 1.49x, bases at 1.79x): small highlights average out, so a stronger finish
# highlight keeps the class floor (look_world.FLOORS)
HIGHLIGHT_WORLD = 1.3


def drystone(rig, joint, courses, colors, seed=0, depth=(-11.0, 14.0), jag=0.07, gap=0.5):
    """A drystone plinth: `courses` = [(z0, z1, [x0, x1, x2, ...]), ...] bottom up, each course a row of blocks
    between consecutive x edges (4-6 lu tall, the audit's plinth blocks), spanning `depth` (y0, y1); the blocks take
    the colours in turn (light, mid, dark) and are cut a little apart (`gap`) so the joints read as dark lines."""
    y0, y1 = depth
    k = 0
    for ci, (z0, z1, xs) in enumerate(courses):
        for a, b in zip(xs, xs[1:]):
            g = Geo()
            c = ((a + b) / 2, (y0 + y1) / 2, (z0 + z1) / 2)
            r = ((b - a) / 2 - gap / 2, (y1 - y0) / 2 - gap / 2, (z1 - z0) / 2 - gap / 2)
            rock(g, c, r, seed=seed + 11 * ci + k, jag=jag, p=3.6, cuts=3)
            rig.part(joint, g, colors[k % len(colors)])
            k += 1


def moss(rig, joint, tufts, color, seed=0):
    """Moss cushions on the top edges: `tufts` = [(x, y, z, r), ...], flattened lumps (fur kind: clumps)."""
    g = Geo()
    for i, (x, y, z, r) in enumerate(tufts):
        rock(g, (x, y, z), (r, r * 0.8, r * 0.45), seed=seed + i, jag=0.22, p=2.2, cuts=3)
    rig.part(joint, g, color, outline=0.5)


def wraps(rig, joint, p0, p1, r, n, color, w=0.75, outline=0.4):
    """`n` rope or hide wraps round a pole from p0 to p1 of radius r: rings of width 2w (a lashing reads at 2.5 lu)."""
    g = Geo()
    for i in range(n):
        t = (i + 0.5) / n
        c = tuple(a + (b - a) * t for a, b in zip(p0, p1))
        d = tuple(b - a for a, b in zip(p0, p1))
        L = math.sqrt(sum(v * v for v in d)) or 1.0
        u = tuple(v / L * w for v in d)
        g.lathe([(r + 0.45, -1.0), (r + 0.75, 0.0), (r + 0.45, 1.0)], tuple(cc - uu for cc, uu in zip(c, u)),
                tuple(cc + uu for cc, uu in zip(c, u)), segs=12)
    rig.part(joint, g, color, outline=outline)


def team_band(rig, joint, p0, p1, r, tone=1.0, outline=0.4):
    """A team-painted band (or a tied team rag) round a pole of radius r from p0 to p1 (its width): lit team, or
    team-dark with tone < 1 (`look.team_part`)."""
    L = math.sqrt(sum((b - a) ** 2 for a, b in zip(p0, p1)))
    g = Geo().lathe([(r + 0.2, 0.0), (r + 0.6, 0.4), (r + 0.6, L - 0.4), (r + 0.2, L)], p0, p1, segs=14)
    return look.team_part(rig, joint, g, tone=tone, outline=outline)


def pennant(rig, joint, x, y, z0, h=30.0, length=16.0, width=9.0, pole="#6A5A4A", finial="#C8B488", emblem=True):
    """world.common.pennant with a two-tone team zone (audit rule 5): the cloth in team, a team-dark border along its
    fly edge and a team-dark disc emblem of 4 lu, a hide tie at the hoist; the pole with a lashed finial."""
    g = Geo().capsule((x, y, z0), (x, y, z0 + h), 1.1)
    rig.part(joint, g, pole, outline=0.6)
    g = Geo().sphere((x, y, z0 + h + 1.5), 1.8, cuts=2)
    rig.part(joint, g, finial, finish="metal", outline=0.5)
    zt = z0 + h - 1
    g = Geo().slab([(x - 0.5, zt), (x - length, zt - width * 0.35), (x - length * 0.8, zt - width * 0.6),
                    (x - 0.5, zt - width)], y, 1.2)
    rig.part(joint, g, team=True, outline=0.5)
    # the fly's border (team-dark), on the camera side of the cloth
    g = Geo().slab([(x - length + 0.4, zt - width * 0.35), (x - length * 0.8, zt - width * 0.6),
                    (x - length * 0.8 + 2.4, zt - width * 0.62), (x - length + 3.0, zt - width * 0.36)], y - 0.75, 0.3)
    look.team_part(rig, joint, g)
    if emblem:
        cx, cz = x - length * 0.42, zt - width * 0.42
        pts = [(cx + 2.0 * math.cos(a), cz + 2.0 * math.sin(a)) for a in (2 * math.pi * k / 12 for k in range(12))]
        g = Geo().slab(pts, y - 0.75, 0.3)
        look.team_part(rig, joint, g)
    wraps(rig, joint, (x, y, zt - width - 0.4), (x, y, zt + 0.4), 1.1, 3, "#8A6A50", w=0.55, outline=0.3)
