"""Future Age cartoon kit v2 (art director plan 2026-09-30): helpers the Future units and turrets
share on top of `moves.py`, `face.py`, `smear2.py` and `kit_medieval.py`. Kept in its own module so
the older `rigs_future.py` API (also re-exported by the Cosmic rigs and used by the Bronze
Colossus) stays unchanged.

  visor_face()  emissive eye glyphs laid on a dark visor as camera-facing decals, one joint per
                expression: `eyes` (neutral, round robot eyes), `g_angry` (lids slanted down to the
                front), `g_squint` (thin slits), `g_hurt` (> <), `eyes_x` (KO), `g_spiral` (dizzy),
                `g_wide` (big round eyes), `g_blink` (closed lines), `g_happy` (^ ^). Every glyph
                has a pale core, so it reads as light and not as paint
  glyph()       pose channels that show one expression (and hide the neutral eyes)
  hexmark()     the Future emblem as a decal: a pale hex ring with a dot, laid on a team slab so
                the slab is broken up (A11 detail bible 3.4)
  strip()       a thin emissive light strip (panel line with light) along a polyline
  rivets()      a row of small 2 lu dots (panel rivets)
  hit_mech()    a mech hit: a hard jolt with no body squash, a panel that pops out and back and a
                baked spark on the attacker-facing side of the hull
  D6            the mech fall-apart path (sputter, sag at the knees, the head pops, a tilt)
"""
import math

from . import face as FC
from . import moves as M
from . import rigs_future as F
from .anim import merge
from .geometry import Geo

HEX_PALE = "#E9EDF2"
HEX_DARK = "#2E323C"


def visor_face(rig, joint, geos, center, eye_dx=(0.0, -5.6), eye_rx=1.8, eye_rz=2.6, color=F.MINT,
               core=F.MINT_CORE, far_k=0.78, yaw_deg=None, tilt=0.0):
    """Eye glyphs on the visor geometry `geos` (built but not yet given to rig.part: the ray casts
    need their bmesh). center = screen (x, z) of the near eye in the rest pose; eye_dx = screen x
    offsets of the near and far eye (the far one is drawn a little smaller: `far_k`). Returns the
    Face so a unit can lay more decals on the same surface."""
    face = FC.Face(rig, joint, list(geos), yaw_deg=yaw_deg)
    cx, cz = center
    eyes = [(cx + dx, cz + (0.25 if k else 0.0), (1.0 if k == 0 else far_k)) for k, dx in enumerate(eye_dx)]
    hits = [(face.hit(x, z), k) for x, z, k in eyes]

    def add(name, shape, hidden=True, w=None):
        """shape(k) -> list of polygons (u, v) for an eye of scale k (strokes if w is given)."""
        rig.joint(name, joint, (cx, 0, cz), hidden=hidden)
        outer, inner = Geo(), Geo()
        for h, k in hits:
            for poly in shape(k):
                if w is None:
                    face.decal(outer, h, poly, 0.4)
                    cpoly = [(u * 0.5, v * 0.5 + 0.15 * eye_rz * k) for u, v in poly]
                    face.decal(inner, h - face.view * 0.3, cpoly, 0.4)
                else:
                    face.stroke(outer, h, poly, w * k, 0.4)
                    face.stroke(inner, h - face.view * 0.3, poly, w * k * 0.42, 0.4)
        rig.part(name, outer, glow=color, outline=0)
        rig.part(name, inner, glow=core, outline=0)

    rx, rz = eye_rx, eye_rz
    tl = math.tan(math.radians(tilt))
    # neutral: tall rounded eyes (a friendly robot face)
    add("eyes", lambda k: [[(u * k, v * k + u * k * tl) for u, v in FC.ellipse(0, 0, rx, rz, 14)]],
        hidden=False)
    # angry: the top edge slanted down toward the front (a brow cut)
    add("g_angry", lambda k: [[(-rx * k, rz * 0.75 * k), (rx * k, -rz * 0.05 * k), (rx * k, -rz * 0.8 * k),
                               (0.0, -rz * 1.0 * k), (-rx * k, -rz * 0.8 * k)]])
    # squint: a thin slit, a little angled
    add("g_squint", lambda k: [[(-rx * 1.25 * k, rz * 0.12 * k), (rx * 1.25 * k, -rz * 0.1 * k),
                                (rx * 1.25 * k, -rz * 0.42 * k), (-rx * 1.25 * k, -rz * 0.2 * k)]])
    # hurt: > (squeezed shut), a chevron stroke
    add("g_hurt", lambda k: [[(-rx * 0.9 * k, rz * 0.7 * k), (rx * 0.8 * k, 0.0), (-rx * 0.9 * k, -rz * 0.7 * k)]],
        w=1.25)
    # KO: X
    add("eyes_x", lambda k: [[(-rx * k, rz * 0.8 * k), (rx * k, -rz * 0.8 * k)],
                             [(-rx * k, -rz * 0.8 * k), (rx * k, rz * 0.8 * k)]], w=1.2)
    # dizzy: a spiral
    add("g_spiral", lambda k: [[(rx * 1.1 * k * (t / 18) * math.cos(t * 0.62), rz * 0.85 * k * (t / 18) * math.sin(t * 0.62))
                                for t in range(2, 19)]], w=0.9)
    # wide: bigger round eyes (surprise, a charge)
    add("g_wide", lambda k: [FC.ellipse(0, 0, rx * 1.35 * k, rz * 1.22 * k, 16)])
    # blink: a closed line
    add("g_blink", lambda k: [[(-rx * 1.1 * k, -rz * 0.2 * k), (rx * 1.1 * k, -rz * 0.2 * k)]], w=1.0)
    # happy: ^
    add("g_happy", lambda k: [[(-rx * 1.0 * k, -rz * 0.4 * k), (0.0, rz * 0.5 * k), (rx * 1.0 * k, -rz * 0.4 * k)]],
        w=1.15)
    return face


GLYPHS = ("eyes", "g_angry", "g_squint", "g_hurt", "eyes_x", "g_spiral", "g_wide", "g_blink", "g_happy")


def glyph(name):
    """Pose channels showing one eye expression (and hiding the neutral eyes)."""
    if name == "eyes":
        return {}
    return {"eyes": {"hide": True}, name: {"show": True}}


def hexmark(face, g, center_xz, s=1.0, w=1.2, dot=True, depth=0.4):
    """Hex emblem decal (a ring about 6.4 x s lu across and an optional centre dot)."""
    c = face.hit(*center_xz)
    r = 3.2 * s
    pts = [(r * math.cos(math.radians(30 + 60 * k)), r * math.sin(math.radians(30 + 60 * k))) for k in range(7)]
    face.stroke(g, c, pts, w * s, depth)
    if dot:
        face.decal(g, c, FC.ellipse(0, 0, 1.0 * s, 1.0 * s, 10), depth)
    return g


def strip(rig, joint, pts, r=0.8, color=F.MINT, edge=F.SUIT):
    """An emissive light strip along a polyline of char-space points."""
    g = Geo()
    for a, b in zip(pts, pts[1:]):
        g.capsule(a, b, r, segs=8, rings=2)
    rig.part(joint, g, glow=color, outline=0.6, outline_hex=edge)


def rivets(rig, joint, pts, r=1.0, color=F.TRIM):
    g = Geo()
    for p in pts:
        g.sphere(p, r, cuts=2)
    rig.part(joint, g, color, finish="metal", outline=0)


# -- mech hit (plan 2.4) -----------------------------------------------------------------------
# a hard jolt: no body squash, a quick shove back with a pitch, a stutter, a settle
MECH_HIT = [dict(x=-3.2, r=6.0), dict(x=-4.4, r=9.0), dict(x=-1.4, r=2.5), dict(x=0.8, r=-1.5), dict(x=0.0, r=0.0)]


def hit_mech(k, center, scale=1.0):
    """Body channels (about `center`, char space) for mech hit step k of 5."""
    h = MECH_HIT[k]
    return M.body_about(center, x=h["x"] * scale, r=h["r"])
