"""Face kit (art director plan 2026-09-30, tool T3): expressions that read at game size.

Faces in this style are seen close to profile (the unit faces +X, the camera looks from -Y
with a small yaw and a 16 degree tilt), so expression marks are *decals*: flat shapes laid
on the head's surface facing the camera, found by casting camera rays at the head geometry.
They are cheap (a few flat polygons), always face the viewer and never poke through.

    face = Face(rig, "head", [skin_geo, eye_geo], yaw_deg=rig_yaw)   # before rig.part(...)
    face.eye_marks(eyes=[(14.0, 51.4)], r=3.8)       # lids (blink), squeeze, X and spiral
    face.mouths(at=(13.8, 44.6), w=5.0)              # grit, yell, O, KO tongue
    ... then per frame merge face.expr("yell", "squeeze") into the pose.

Joint names (all hidden by default, shown by `expr`): lids, squeeze, ko_x, ko_spiral,
grit, yell2, mouth_o, tongue. The unit's own default mouth joint (`mouth`) and pupils joint
(`pupils`, optional) are hidden when an expression needs it.
"""
import math

import bpy  # noqa: F401 (bpy provides mathutils)
from mathutils import Matrix, Vector
from mathutils.bvhtree import BVHTree

from . import config as C
from .geometry import Geo

MOUTH_DARK = "#4A2424"
TOOTH = "#F4EEDC"
TONGUE = "#D9837A"
LASH = "#2A211D"


def _basis(yaw_deg):
    """Character-space camera basis: view direction, screen right, screen up."""
    y = math.radians(-yaw_deg)  # char = Rz(-yaw) @ world
    e = math.radians(C.CAMERA_ELEVATION_DEG)
    rz = Matrix.Rotation(y, 3, "Z")
    view = rz @ Vector((0.0, math.cos(e), -math.sin(e)))
    right = rz @ Vector((1.0, 0.0, 0.0))
    up = rz @ Vector((0.0, math.sin(e), math.cos(e)))
    return view.normalized(), right.normalized(), up.normalized()


def ellipse(cx, cz, rx, rz, n=14, a0=0.0, a1=360.0):
    return [(cx + rx * math.cos(math.radians(a0 + (a1 - a0) * i / n)),
             cz + rz * math.sin(math.radians(a0 + (a1 - a0) * i / n))) for i in range(n)]


class Face:
    def __init__(self, rig, head, geos, yaw_deg=None, lift=0.35):
        self.rig, self.head = rig, head
        yaw = math.degrees(rig.yaw) if yaw_deg is None else yaw_deg
        self.view, self.right, self.up = _basis(yaw)
        self.trees = [BVHTree.FromBMesh(g.bm) for g in geos]
        self.lift = lift
        self.names = []

    # -- surface --------------------------------------------------------------------------
    def hit(self, x, z, y0=-40.0):
        """Surface point seen at screen position (x, z) of the rest pose (char space)."""
        target = Vector((x, 0.0, z))
        # step the origin back along the view ray until it is in front of everything
        origin = target - self.view * 80.0
        best = None
        for t in self.trees:
            loc, nrm, idx, dist = t.ray_cast(origin, self.view, 200.0)
            if loc is not None and (best is None or dist < best[1]):
                best = (loc, dist)
        if best is None:
            return target
        return best[0] - self.view * self.lift

    def decal(self, g, center, pts, depth=0.5):
        """A flat polygon `pts` [(u, v) in lu, screen right/up] centred on `center`."""
        U, V, N = self.right, self.up, self.view
        n = len(pts)
        verts = [tuple(center + U * u + V * v - N * (depth / 2)) for u, v in pts] + \
                [tuple(center + U * u + V * v + N * (depth / 2)) for u, v in pts]
        faces = [list(range(n - 1, -1, -1)), list(range(n, 2 * n))]
        for i in range(n):
            j = (i + 1) % n
            faces.append([i, j, n + j, n + i])
        g._add(verts, faces, Matrix.Identity(4), smooth=False)
        return g

    def stroke(self, g, center, pts, w, depth=0.5):
        """A polyline of width w (lu) as quads plus round-ish joints."""
        for (u0, v0), (u1, v1) in zip(pts, pts[1:]):
            dx, dy = u1 - u0, v1 - v0
            L = math.hypot(dx, dy) or 1.0
            nx, ny = -dy / L * w / 2, dx / L * w / 2
            self.decal(g, center, [(u0 + nx, v0 + ny), (u1 + nx, v1 + ny), (u1 - nx, v1 - ny),
                                   (u0 - nx, v0 - ny)], depth)
        for u, v in pts:
            self.decal(g, center, ellipse(u, v, w / 2, w / 2, 8), depth)
        return g

    def _joint(self, name, at):
        self.rig.joint(name, self.head, at, hidden=True)
        self.names.append(name)

    # -- eyes -----------------------------------------------------------------------------
    def eye_marks(self, eyes, r, lid_fill, lash=LASH, white="#FAF6EE", shut_tilt=-8.0):
        """eyes: [(x, z)] screen positions (rest pose) of each visible eye's centre; r: the
        eye's screen radius (lu). Builds lids (closed eye), squeeze (> <), X and spiral."""
        pts = [(x, z, self.hit(x, z)) for x, z in eyes]
        cx, cz = eyes[0]
        self._joint("lids", (cx, 0, cz))
        g = Geo()
        for x, z, h in pts:
            self.decal(g, h, ellipse(0, 0, r * 1.12, r * 1.18, 16), 0.4)
        self.rig.part("lids", g, lid_fill, highlight=False, outline=0)
        g = Geo()
        for x, z, h in pts:
            arc = [(r * 0.95 * math.cos(math.radians(a)), -r * 0.35 * math.sin(math.radians(a)) + 0.3)
                   for a in range(200, 341, 28)]
            self.stroke(g, h - self.view * 0.3, arc, 1.3, 0.4)
        self.rig.part("lids", g, lash, highlight=False, outline=0)

        self._joint("squeeze", (cx, 0, cz))
        g = Geo()
        for x, z, h in pts:
            self.decal(g, h, ellipse(0, 0, r * 1.12, r * 1.18, 16), 0.4)
        self.rig.part("squeeze", g, lid_fill, highlight=False, outline=0)
        g = Geo()
        for x, z, h in pts:
            # ">" pointing forward (+x): the eye squeezed shut
            self.stroke(g, h - self.view * 0.3, [(-r * 0.8, r * 0.7), (r * 0.55, 0.0), (-r * 0.8, -r * 0.7)],
                        1.5, 0.4)
        self.rig.part("squeeze", g, lash, highlight=False, outline=0)

        self._joint("ko_x", (cx, 0, cz))
        g = Geo()
        for x, z, h in pts:
            self.decal(g, h, ellipse(0, 0, r * 1.05, r * 1.1, 16), 0.4)
        self.rig.part("ko_x", g, white, highlight=False, outline=0)
        g = Geo()
        for x, z, h in pts:
            k = r * 0.75
            self.stroke(g, h - self.view * 0.3, [(-k, k), (k, -k)], 1.6, 0.4)
            self.stroke(g, h - self.view * 0.3, [(-k, -k), (k, k)], 1.6, 0.4)
        self.rig.part("ko_x", g, lash, highlight=False, outline=0)

        self._joint("ko_spiral", (cx, 0, cz))
        g = Geo()
        for x, z, h in pts:
            self.decal(g, h, ellipse(0, 0, r * 1.05, r * 1.1, 16), 0.4)
        self.rig.part("ko_spiral", g, white, highlight=False, outline=0)
        g = Geo()
        for x, z, h in pts:
            sp = [(r * 0.85 * (t / 20) * math.cos(t * 0.62), r * 0.85 * (t / 20) * math.sin(t * 0.62))
                  for t in range(2, 21)]
            self.stroke(g, h - self.view * 0.3, sp, 1.1, 0.4)
        self.rig.part("ko_spiral", g, lash, highlight=False, outline=0)

    # -- mouths ---------------------------------------------------------------------------
    def mouths(self, at, w, dark=MOUTH_DARK, tooth=TOOTH, tongue=TONGUE):
        """at: screen position (x, z) of the mouth's centre (rest pose); w: its width (lu)."""
        x, z = at
        h = self.hit(x, z)
        # grit: clenched teeth bared, a dark rim around a tooth bar with gaps
        self._joint("grit", (x, 0, z))
        g = Geo()
        self.decal(g, h, [(-w * 0.55, w * 0.22), (w * 0.5, w * 0.3), (w * 0.55, -w * 0.2),
                          (-w * 0.5, -w * 0.26)], 0.4)
        self.rig.part("grit", g, dark, highlight=False, outline=0)
        g = Geo()
        self.decal(g, h - self.view * 0.25, [(-w * 0.44, w * 0.12), (w * 0.42, w * 0.19),
                                             (w * 0.44, -w * 0.1), (-w * 0.42, -w * 0.16)], 0.4)
        self.rig.part("grit", g, tooth, highlight=False, outline=0)
        g = Geo()
        for u in (-w * 0.15, w * 0.15):
            self.stroke(g, h - self.view * 0.5, [(u, w * 0.2), (u, -w * 0.2)], 0.5, 0.3)
        self.rig.part("grit", g, dark, highlight=False, outline=0)
        # yell: a big open mouth, top teeth and a tongue
        self._joint("yell2", (x, 0, z))
        g = Geo()
        pts = ellipse(0, -w * 0.18, w * 0.52, w * 0.5, 16)
        self.decal(g, h, pts, 0.4)
        self.rig.part("yell2", g, dark, highlight=False, outline=0)
        g = Geo()
        self.decal(g, h - self.view * 0.25, [(-w * 0.4, w * 0.2), (w * 0.4, w * 0.24), (w * 0.34, w * 0.05),
                                             (-w * 0.34, w * 0.02)], 0.4)
        self.rig.part("yell2", g, tooth, highlight=False, outline=0)
        g = Geo()
        self.decal(g, h - self.view * 0.25, ellipse(0.0, -w * 0.5, w * 0.3, w * 0.16, 12), 0.4)
        self.rig.part("yell2", g, tongue, highlight=False, outline=0)
        # O: surprised or shouting a short call
        self._joint("mouth_o", (x, 0, z))
        g = Geo()
        self.decal(g, h, ellipse(0, -w * 0.05, w * 0.28, w * 0.34, 14), 0.4)
        self.rig.part("mouth_o", g, dark, highlight=False, outline=0)
        # KO tongue: a slack open mouth with the tongue hanging out
        self._joint("tongue", (x, 0, z))
        g = Geo()
        self.decal(g, h, ellipse(0, 0, w * 0.45, w * 0.22, 14), 0.4)
        self.rig.part("tongue", g, dark, highlight=False, outline=0)
        g = Geo()
        self.decal(g, h - self.view * 0.3, [(w * 0.05, -w * 0.05), (w * 0.4, -w * 0.05), (w * 0.44, -w * 0.5),
                                            (w * 0.3, -w * 0.7), (w * 0.12, -w * 0.62)], 0.4)
        self.rig.part("tongue", g, tongue, highlight=False, outline=0)


# -- expressions -----------------------------------------------------------------------------
EYE_EXPR = {"blink": "lids", "squeeze": "squeeze", "x": "ko_x", "spiral": "ko_spiral"}
MOUTH_EXPR = {"grit": "grit", "yell": "yell2", "o": "mouth_o", "tongue": "tongue"}


def expr(*names, mouth="mouth", pupils="pupils", brow=None):
    """Pose channels for an expression: any of blink, squeeze, x, spiral (eyes) and grit,
    yell, o, tongue (mouth). Hides the default mouth / pupils joints as needed."""
    out = {}
    for n in names:
        if n in EYE_EXPR:
            out[EYE_EXPR[n]] = {"show": True}
            if n in ("x", "spiral", "squeeze", "blink") and pupils:
                out[pupils] = {"hide": True}
        elif n in MOUTH_EXPR:
            out[MOUTH_EXPR[n]] = {"show": True}
            if mouth:
                out[mouth] = {"hide": True}
    return out
