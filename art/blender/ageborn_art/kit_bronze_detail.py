"""Bronze Age detail kit for the art round's wave W1 (item 47 audit, sections 5.1 and 5.2): small parts that
bring the Bronze troops to the detail standard on top of the shared `rigs_bronze` and `kit_bronze` parts.

Only the unit scripts of wave W1 import it; the shared modules are unchanged, so a unit that does not import
this module renders byte for byte as before.

  shell, band_z, stripe_x
                painted bands, stripes and panels that follow a blob part exactly (its own blob grown a little
                and cut down to the region): the robust way to put a second tone on a curved tunic or skirt (a
                flat decal there loses about half its width under the curve, a separate blob sinks into it)
  face_band     a band on a round (aspis) or oval (thureos) shield face that follows the face's bow; team-dark
                by default (audit 5.1 rule 5: the team zone in two tones)
  ring_y        a flat painted ring facing the camera (a drum's face), with no caps over its hole
  sheet         a banner or hanging cloth with vertical folds (a flat slab shades as one flat value)
  blob_y, ridge the camera-side surface of a blob part, and a fold (a capsule chain) lying on it
  lathe_points  points round a lathe part (punched dots, rivets on a helmet)
  crest_base    a team-dark base along a `rigs_bronze.helmet` horsehair crest (the two-tone crest)
  plume_base    a team-dark base on a `kit_bronze.pilos` / `kit_bronze.boeotian` plume tuft
  surface_line  a line drawn on a curved part's surface, segment by segment (incised and tooled lines)
  volute        the points of an embossed scroll (the temple volutes of Chalcidian helmets)
  aimed_hand    hand-posed aimed variants (item 44) of throws without a measured weapon (a disc, a sling)
  scabbard      a sword in a scabbard on a follow-through joint (a hip sheath that swings a frame late)
"""
import math

from . import face as F
from . import look
from . import rigs_bronze as B
from .geometry import Geo


def shell(center, radii, p=2.4, taper=(1.0, 1.0), grow=0.3, keep=(), rot=(0, 0, 0), shift=(0.0, 0.0)):
    """A painted band, stripe or panel that follows a blob part exactly: the part's own blob (the same centre,
    radii, p, taper, shift and rot) grown by `grow` lu, cut down to the region `keep` describes, a list of
    (point, normal) planes whose normal points to the side that is cut away (Geo.clip). The cuts are capped
    inside the part, so only the grown skin shows. Returns the Geo."""
    g = Geo().blob(center, tuple(r + grow for r in radii), p=p, taper=taper, rot=rot, shift=shift)
    for point, normal in keep:
        g.clip(point, normal)
    return g


def band_z(center, radii, z0, z1, **kw):
    """A shell (see `shell`) between the heights z0 and z1: a band round a tunic, a skirt or a helmet."""
    return shell(center, radii, keep=(((0, 0, z1), (0, 0, 1)), ((0, 0, z0), (0, 0, -1))), **kw)


def stripe_x(center, radii, x0, x1, z0=None, z1=None, near=True, **kw):
    """A shell (see `shell`) between x0 and x1 on the near side (-Y, the side the camera sees) of a blob part,
    optionally between the heights z0 and z1: a clavus or a painted panel."""
    keep = [((x1, 0, 0), (1, 0, 0)), ((x0, 0, 0), (-1, 0, 0))]
    if near:
        keep.append(((0, center[1], 0), (0, 1, 0)))
    if z1 is not None:
        keep.append(((0, 0, z1), (0, 0, 1)))
    if z0 is not None:
        keep.append(((0, 0, z0), (0, 0, -1)))
    return shell(center, radii, keep=keep, **kw)


def face_band(rig, joint, c, rx, rz, depth, rim_w, w0, w1, lift=0.25, fill=None, segs=48, outline=0):
    """A band on a shield face between the insets w0 < w1 (lu in from the face's edge), following the face's bow.
    The face is the one `rigs_bronze.aspis` (rx = rz = r) and `kit_bronze.oval_shield` build: an ellipsoid
    (rx - rim_w, depth x 0.95, rz - rim_w) about (cx, cy + 0.2, cz) that bulges toward the camera (-Y). The band
    sits `lift` in front of the face and tucks its two edges 0.6 lu back into it; team-dark unless `fill`."""
    from mathutils import Matrix
    cx, cy, cz = c
    A, C, D = rx - rim_w, rz - rim_w, depth * 0.95

    def ring(w, extra):
        a, b = A - w, C - w
        pts = []
        for i in range(segs):
            t = 2 * math.pi * i / segs
            x, z = a * math.cos(t), b * math.sin(t)
            u = (x / A) ** 2 + (z / C) ** 2
            pts.append((cx + x, cy + 0.2 - D * math.sqrt(max(0.0, 1.0 - u)) - lift + extra, cz + z))
        return pts
    n = 5
    # a closed cross-section (the front from the inner to the outer edge, then back behind it), so the mesh is a
    # closed ring and its normals come out facing outward (the front toward the camera)
    rows = [ring(w1, 0.6)] + [ring(w1 + (w0 - w1) * k / n, 0.0) for k in range(n + 1)] + [ring(w0, 0.6)]
    verts = [p for r in rows for p in r]
    faces = []
    m = len(rows)
    for k in range(m):
        k2 = (k + 1) % m
        for i in range(segs):
            j = (i + 1) % segs
            faces.append([k * segs + i, k * segs + j, k2 * segs + j, k2 * segs + i])
    g = Geo()._add(verts, faces, Matrix.Identity(4))
    if fill:
        return rig.part(joint, g, fill, outline=outline)
    return look.team_part(rig, joint, g, outline=outline)


def ring_y(c, r0, r1, y0, y1, segs=28):
    """A flat ring (an annulus) round the axis parallel to Y through (cx, cz), between the radii r0 < r1 and
    the depths y0 > y1 (y1 nearer the camera): a painted ring on a drum or a boss. A closed cross-section with
    no caps (`Geo.lathe` caps its first and last rings, which fills a ring's hole). Returns the Geo."""
    from mathutils import Matrix
    cx, cz = c
    rows = [(r0, y0), (r1, y0), (r1, y1), (r0, y1)]
    verts = []
    for r, y in rows:
        for i in range(segs):
            t = 2 * math.pi * i / segs
            verts.append((cx + r * math.cos(t), y, cz + r * math.sin(t)))
    faces = []
    m = len(rows)
    for k in range(m):
        k2 = (k + 1) % m
        for i in range(segs):
            j = (i + 1) % segs
            faces.append([k * segs + i, k * segs + j, k2 * segs + j, k2 * segs + i])
    return Geo()._add(verts, faces, Matrix.Identity(4))


def sheet(x0, x1, top, bottom, front, depth, nx=48, ny=12):
    """A cloth sheet facing the camera (a banner, a hanging panel) with folds: between x0 and x1, from the edge
    z = top(x) down to z = bottom(x), its front (the camera side) at y = front(x, z) and `depth` lu thick behind
    it. Vertical folds come from a `front` that waves in x; they shade like cloth where a flat slab is one flat
    value. A closed, smooth mesh (front, back, four sides). Returns the Geo."""
    from mathutils import Matrix
    verts = []

    def vid(side, i, j):
        return side * (nx + 1) * (ny + 1) + j * (nx + 1) + i
    for side in (0, 1):
        for j in range(ny + 1):
            for i in range(nx + 1):
                x = x0 + (x1 - x0) * i / nx
                zt, zb = top(x), bottom(x)
                z = zt + (zb - zt) * j / ny
                verts.append((x, front(x, z) + (depth if side else 0.0), z))
    faces = []
    for j in range(ny):
        for i in range(nx):
            faces.append([vid(0, i, j), vid(0, i + 1, j), vid(0, i + 1, j + 1), vid(0, i, j + 1)])
            faces.append([vid(1, i, j), vid(1, i, j + 1), vid(1, i + 1, j + 1), vid(1, i + 1, j)])
    edge = ([(i, 0) for i in range(nx)] + [(nx, j) for j in range(ny)] + [(i, ny) for i in range(nx, 0, -1)]
            + [(0, j) for j in range(ny, 0, -1)])
    for k in range(len(edge)):
        (i, j), (i2, j2) = edge[k], edge[(k + 1) % len(edge)]
        faces.append([vid(0, i, j), vid(1, i, j), vid(1, i2, j2), vid(0, i2, j2)])
    return Geo()._add(verts, faces, Matrix.Identity(4))


def blob_y(center, radii, x, z, p=2.4, taper=(1.0, 1.0), shift=(0.0, 0.0), near=True):
    """The y of a `Geo.blob` surface (no rot) seen at side-view (x, z): its camera side (-Y) when `near`."""
    cx, cy, cz = center
    rx, ry, rz = radii
    zn = max(-1.0, min(1.0, (z - cz) / rz))
    t = (zn + 1) / 2
    k = taper[0] + (taper[1] - taper[0]) * t
    xn = (x - cx - shift[0] * rx * t) / (rx * k)
    s = max(0.0, 1.0 - abs(xn) ** p - abs(zn) ** p) ** (1.0 / p)
    return cy + shift[1] * ry * t + (-s if near else s) * ry * k


def ridge(center, radii, pts, r, p=2.4, taper=(1.0, 1.0), shift=(0.0, 0.0), bulge=0.5, geo=None):
    """A fold on a blob part (a cloak, a skirt): a chain of capsules through the side-view points `pts`
    [(x, z)] lying on the blob's camera side, each `r` thick and standing `bulge` x r proud of it. `r` may be a
    list (one radius per point) for a fold that tapers out. Returns the Geo."""
    g = geo or Geo()
    rs = r if isinstance(r, (list, tuple)) else [r] * len(pts)
    ps = [(x, blob_y(center, radii, x, z, p, taper, shift) + rr * (1.0 - bulge), z) for (x, z), rr in zip(pts, rs)]
    for a_, b_, ra, rb in zip(ps, ps[1:], rs, rs[1:]):
        g.capsule(a_, b_, ra, rb, segs=10, rings=3)
    return g


def lathe_points(p0, p1, r, h, n, squash=(1.0, 1.0), a0=0.0):
    """n points round a `Geo.lathe` axis (p0 toward p1) at radius r and height h (the lathe's own frame)."""
    from mathutils import Matrix, Vector
    from .geometry import _align_z
    m = Matrix.Translation(Vector(p0)) @ _align_z(Vector(p1) - Vector(p0))
    out = []
    for i in range(n):
        a = a0 + 2 * math.pi * i / n
        out.append(tuple(m @ Vector((r * math.cos(a) * squash[0], r * math.sin(a) * squash[1], h))))
    return out


def crest_base(rig, joint, c=(1.5, 0, 55.0), crest_len=26.0, crest_h=10.0, tall=0.0, drop=0.62, depth=2.75):
    """A team-dark band along the base of a `rigs_bronze.helmet` crest (its arc of 9 blobs, same arguments):
    smaller blobs on the crest's own arc, lowered so they cover its lower half and its bottom edge."""
    cx, cy, cz = c
    top = cz + 10.0 + tall
    g = Geo()
    n = 9
    for i in range(n):
        t = i / (n - 1)
        a = math.pi * (0.1 + 0.95 * t)
        x = cx + 4.0 + 7.0 * math.cos(a) - (crest_len - 6.0) * t
        z = top + 3.0 + crest_h * math.sin(a) * (1.0 - 0.25 * t)
        r = 3.6 + 1.6 * math.sin(math.pi * t) - 1.2 * t
        g.blob((x, cy, z - r * drop), (r * 1.08, depth, r * 0.52), p=2.1)
    return look.team_part(rig, joint, g, outline=0)


def plume_base(rig, joint, tufts, drop=0.55, depth=2.8):
    """A team-dark base on a plume tuft: `tufts` are the plume's (x, y, z, r) blobs as its kit function made
    them (`kit_bronze.pilos`, `kit_bronze.boeotian`); each gets a smaller, lowered team-dark blob."""
    g = Geo()
    for x, y, z, r in tufts:
        g.blob((x, y, z - r * drop), (r * 1.12, depth, r * 0.5), p=2.1)
    return look.team_part(rig, joint, g, outline=0)


def surface_line(rig, joint, ref, pts, w, fill, depth=0.4):
    """A line of width w (lu) through the screen points `pts` [(x, z) of the rest pose] drawn on the surface of
    `ref` (a Geo shaped like the part): every segment is a decal at its own surface point (face.Face's camera
    ray), so the line follows a curved part instead of floating over it. Unlit (highlight=False)."""
    fc = F.Face(rig, joint, [ref])
    g = Geo()
    for (x0, z0), (x1, z1) in zip(pts, pts[1:]):
        mx, mz = (x0 + x1) / 2, (z0 + z1) / 2
        fc.stroke(g, fc.hit(mx, mz), [(x0 - mx, z0 - mz), (x1 - mx, z1 - mz)], w, depth)
    return rig.part(joint, g, fill, outline=0, highlight=False)


def volute(c, r0, r1, turns=1.0, a0=90.0, tail=(0.0, -2.6), step=20.0):
    """The screen points of an embossed scroll: an Archimedean spiral from r0 to r1 about c (x, z), starting at
    the angle a0 (degrees), with a short straight tail."""
    pts = []
    n = int(360.0 * turns / step)
    for i in range(n + 1):
        t = i / n
        a = math.radians(a0 + 360.0 * turns * t)
        r = r0 + (r1 - r0) * t
        pts.append((c[0] + r * math.cos(a), c[1] + r * math.sin(a)))
    pts.append((pts[-1][0] + tail[0], pts[-1][1] + tail[1]))
    return pts


def aimed_hand(rig, clip, pose, weights, joint, axis, aims=("up45", "up70"), targets=None, release=None,
               drift_lu=1.0, log=print):
    """Aimed variants (queue item 44) of a throw that has no measured weapon: a disc or a sling stone, which
    aimdata.SPEC gives an authored `deg` per variant clip. Built like `aimed.variants` (the base clip's exact
    timing and extras plus `aimOf`, the base frame reused wherever the weight is 0, the 2D accents on `joint`
    turned with it, planted feet checked), with the turn solved so that `axis` of `joint` (the throwing hand, a
    sling's cord) points at the target angle at the frame `release` (default: the impact frame, where the
    throw leaves the hand)."""
    from . import aimed as AM
    from .anim import Clip
    if len(weights) != clip.frames:
        raise ValueError(f"aimed {clip.name}: {len(weights)} weights for {clip.frames} frames")
    rf = clip.impact if release is None else release
    if weights[rf] != 1.0:
        raise ValueError(f"aimed {clip.name}: the release frame {rf} must be fully aimed (weight {weights[rf]})")
    base0 = AM._drawn(rig, pose(rf, 0.0), joint, axis)
    base_feet = {f: AM._feet(rig, pose(f, 0.0)) for f in range(clip.frames) if weights[f] > 0}
    out = []
    for aim in aims:
        target = (targets or {}).get(aim, AM.TARGETS[aim])
        turn = AM.solve_turn(rig, pose, rf, joint, axis, target)
        got = AM._drawn(rig, pose(rf, turn), joint, axis)
        if abs(AM._wrap(got - target)) > AM.TOLERANCE_DEG:
            raise ValueError(f"aimed {clip.name}_{aim}: drawn {got:.2f} deg, target {target}")
        for f, fb in base_feet.items():
            fa = AM._feet(rig, pose(f, turn * weights[f]))
            for k, p in fa.items():
                d = (p - fb[k]).length
                if d > drift_lu and fb[k].z < 1.5:
                    raise ValueError(f"aimed {clip.name}_{aim}: frame {f} moves planted {k} by {d:.2f} lu")
        table = [pose(f, turn * weights[f]) if weights[f] > 0 else pose(f, 0.0) for f in range(clip.frames)]
        name = AM.name_of(clip.name, aim)
        v = Clip(name, clip.frames, (lambda t: (lambda f: t[f]))(table), loop=clip.loop, impact=clip.impact,
                 sequence=clip.sequence, durations=clip.durations, smear=clip.smear,
                 extra=dict(clip.extra, aimOf=clip.name))
        reuse = {}
        base_reuse = getattr(clip, "reuse", None) or {}
        for f in range(clip.frames):
            if weights[f] == 0:
                reuse[f] = base_reuse.get(f, (clip.name, f))
        if reuse:
            v.reuse = reuse
        ov = getattr(clip, "overlays2", None)
        if ov:
            v.overlays2 = AM._turn_overlays(ov, AM._wrap(got - base0), weights, joint)
        log(f"  aimed {name}: turn {turn:+.1f} deg, {joint} drawn {got:.2f} at frame {rf} (base {base0:.1f}), "
            f"{clip.frames - len(reuse)} new frames")
        out.append(v)
    return out


def scabbard(rig, name, parent, top, bottom, r=(2.1, 1.5), hilt=4.0, sheath=B.LEATHER_DK, metal=B.AGED,
             grip=B.LINEN, max_deg=12, gain=1.2):
    """A short sword in a scabbard on a follow-through joint `name` under `parent`, hanging from `top` to
    `bottom` (character space): a dark sheath with a metal locket at the mouth and a ball chape, and the hilt
    (a grip, a crossguard and a pommel) sticking out of the mouth, away from the tip, `hilt` lu long."""
    tx, ty, tz = top
    bx, by, bz = bottom
    L = math.dist(top, bottom)
    ux, uy, uz = (tx - bx) / L, (ty - by) / L, (tz - bz) / L        # up the scabbard, toward the mouth
    rig.secondary(name, parent, top, bottom, max_deg=max_deg, gain=gain)
    g = Geo().capsule((tx - ux * 0.6, ty - uy * 0.6, tz - uz * 0.6), (bx + ux * 0.8, by + uy * 0.8, bz + uz * 0.8),
                      r[0], r[1])
    rig.part(name, g, sheath, outline=0.6)
    g = Geo().capsule((tx + ux * 0.2, ty + uy * 0.2, tz + uz * 0.2), (tx - ux * 1.9, ty - uy * 1.9, tz - uz * 1.9),
                      r[0] + 0.35)
    g.sphere((bx - ux * 0.1, by, bz - uz * 0.1), r[1] + 0.4, cuts=3)
    rig.part(name, g, metal, finish="metal", outline=0.5)
    gx, gy, gz = tx + ux * 1.2, ty + uy * 0.3, tz + uz * 1.2
    g = Geo().capsule((gx, gy, gz), (gx + ux * hilt * 0.75, gy, gz + uz * hilt * 0.75), 1.15)
    rig.part(name, g, grip, outline=0.5)
    px, pz = gx + ux * (hilt * 0.75 + 0.9), gz + uz * (hilt * 0.75 + 0.9)
    nx, nz = -uz, ux                                                 # across the scabbard (the guard)
    g = Geo().capsule((gx + nx * 1.6 - ux * 0.2, gy, gz + nz * 1.6 - uz * 0.2),
                      (gx - nx * 1.6 - ux * 0.2, gy, gz - nz * 1.6 - uz * 0.2), 0.95)
    g.sphere((px, gy, pz), 1.5, cuts=3)
    rig.part(name, g, metal, finish="metal", outline=0.5)
    return name
