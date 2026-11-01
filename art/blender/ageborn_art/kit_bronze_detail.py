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


def shell(center, radii, p=2.4, taper=(1.0, 1.0), grow=0.3, keep=(), rot=(0, 0, 0)):
    """A painted band, stripe or panel that follows a blob part exactly: the part's own blob (the same centre,
    radii, p, taper and rot) grown by `grow` lu, cut down to the region `keep` describes, a list of
    (point, normal) planes whose normal points to the side that is cut away (Geo.clip). The cuts are capped
    inside the part, so only the grown skin shows. Returns the Geo."""
    g = Geo().blob(center, tuple(r + grow for r in radii), p=p, taper=taper, rot=rot)
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
