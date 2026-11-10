"""Art round W2 (Track MEDIEVAL): small detail helpers shared by the Medieval troops' scripts.

Not a unit (it is not in render_all.AGE_OF). The Medieval troops opt into the detail standard (`ageborn_art/look.py`,
art/blender/README.md "Detail standard") with the pilot's recipe and W1's lessons. The generic helpers come from the
Stone round's `units/stone_w1.py` (material kinds with the far side's copies, team-dark decals, lathed bands, beads,
rounded fur tufts); this module adds what Medieval kit needs:

  mail_rows()     riveted mail as rows: thin darker bands lathed round a limb or a shirt (a 2.4 lu rhythm reads as
                  mail at game scale, where single rings would vanish)
  plate_band()    a polished highlight band on a plate or a helmet (a lighter steel strip that carries the shine)
  folds()         cloth folds: darker pleat lines laid down a skirt or a tabard (team-dark on team cloth)
  field() / ribbon()  conforming decals: a mesh cast vertex by vertex onto the surface (a flat decal sinks into a
                  vertical shield above its centre and splits when a pose turns it)
  seam()          a line laid on a surface (a stitched seam, a border band)
  panel()         heraldry (a pale, a chief, a bend) in the team-dark tone (the team zone in two tones)
  paw()           the bear paw emblem with every pad and toe on the surface (kit_medieval.paw loses the upper toes)
  cut_loop() / piping()  a rolled edge round the rim a clip left (a hood's facing round the face opening)
  shell_bands()   mail rows (or lames) on a blob's own shape; lattice(): diagonal quilting lines for folds()
  skin_palette()  a skin's palette with the far side's shaded copies mapped as well
  smear_two_tone()  a swing smear (smear2 "arc") as a narrower crescent in two values: a darker trailing band under a
                  lighter leading edge (the W2 review, S1: one flat cream or steel fill held the extras sheets' flat
                  and micro means off their floors)

Every number is in lu at rest, character space (x forward, y away from the camera, z up).
"""
import math

from ageborn_art import face as F
from ageborn_art import look
from ageborn_art.geometry import Geo
from units import stone_w1 as W1

# the W1 helpers the Medieval scripts use as they are
kinds = W1.kinds
ring = W1.ring
beads = W1.beads
team_spots = W1.team_spots
Coat = W1.Coat
tufts = W1.tufts
tuft_at = W1.tuft_at
shingles = W1.shingles
fan = W1.fan
register_aims = W1.register_aims
authored_variants = W1.authored_variants

# the pilot's soldier look (W0 milestone 7) and W1's beasts and mounts
SHADE_SOLDIER = W1.SHADE_SOLDIER
RIM_SOLDIER = W1.RIM_SOLDIER
HIGHLIGHT_SOLDIER = W1.HIGHLIGHT_SOLDIER
SHADE_BEAST = W1.SHADE_BEAST
RIM_BEAST = W1.RIM_BEAST
HIGHLIGHT_BEAST = W1.HIGHLIGHT_BEAST
SHADE_BIG = W1.SHADE_BIG
SHADE_MOUNT = W1.SHADE_MOUNT


def smear_two_tone(spec, band=0.6, shade=0.8, edge=0.3):
    """A smear2 "arc" spec as two: the swept crescent cut to `band` of the sweep (from the weapon's outer path in) in
    the colour x `shade` with less white (the trailing band, with the arc's outline and speed lines), and on top a
    lighter strip `edge` of the sweep along the outer, leading edge (no outline, no speed lines)."""
    from ageborn_art import colors as C
    b0 = spec.get("band", 1.0)
    white = spec.get("white", 0.3)
    base = dict(spec, band=band * b0, color=C.scale(spec["color"], shade), white=white * 0.5)
    lead = dict(spec, band=edge * b0, white=min(0.75, white + 0.25), outline_lu=0.0, lines=0)
    return [base, lead]


def skin_palette(mapping, far=0.8):
    """A skin's palette {unit hex: skin hex} with the far side's shaded copies mapped as well (the legs kit darkens
    the far leg by `far`, so its hose, boot and cuff colours are other hexes)."""
    from ageborn_art import colors as C
    out = {a.upper(): b.upper() for a, b in mapping.items()}
    for a, b in mapping.items():
        out.setdefault(C.scale(a, far).upper(), C.scale(b, far).upper())
    return out


def mail_rows(rig, joint, p0, p1, radii, fill, step=2.4, w=0.85, bulge=0.32, squash=(1.0, 1.0), outline=0,
              finish="metal"):
    """Mail rows round a limb or a shirt: bands of width `w` every `step` lu along the axis p0 -> p1, each lathed at
    the radius `radii(t)` gives for its place t (0 at p0, 1 at p1; a number for a cylinder), standing `bulge` proud.
    `fill` is a darker iron than the mail, so the rows read as the rings' shadowed lower edges."""
    L = math.dist(p0, p1)
    n = max(1, int(L / step))
    d = tuple((b - a) / L for a, b in zip(p0, p1))
    g = Geo()
    for k in range(n):
        t = (k + 0.5) / n
        r = radii(t) if callable(radii) else radii
        c = tuple(a + (b - a) * t for a, b in zip(p0, p1))
        prof = [(r - 0.05, -w / 2), (r + bulge, -w * 0.25), (r + bulge, w * 0.25), (r - 0.05, w / 2)]
        g.lathe(prof, c, tuple(ci + di for ci, di in zip(c, d)), segs=20, squash=squash)
    rig.part(joint, g, fill, finish=finish, outline=outline)
    return g


def shell_bands(rig, joint, center, radii, zs, fill, w=0.85, proud=0.3, p=2.0, taper=(1.0, 1.0), shift=(0.0, 0.0),
                cuts=(), finish="metal", outline=0):
    """Bands `w` lu tall at heights zs on a blob's own shape (a copy of it `proud` lu bigger, cut to each band): mail
    rows round a coif or a hauberk that follow a superellipsoid exactly (a lathed ring is round and sinks into a
    p > 2 blob's shoulders); `cuts` are extra (point, normal) clips, e.g. a face opening."""
    big = tuple(r + proud for r in radii)
    for z in zs:
        g = Geo().blob(center, big, p=p, taper=taper, shift=shift)
        for pt, n in cuts:
            g.clip(pt, n)
        g.clip((0, 0, z + w / 2), (0, 0, 1))
        g.clip((0, 0, z - w / 2), (0, 0, -1))
        rig.part(joint, g, fill, finish=finish, outline=outline)


def lattice(x0, x1, z0, z1, step):
    """Diagonal quilting lines (both diagonals, `step` lu apart) clipped to the box x0..x1, z0..z1: a list of
    [(x, z), (x, z)] segments for folds()."""
    out = []
    for sgn in (1, -1):
        k = -int((x1 - x0 + z1 - z0) / step) - 1
        while k * step <= (x1 - x0 + z1 - z0):
            c = k * step                      # the line z - z0 = sgn * (x - x0) + c
            pts = []
            for x in (x0, x1):
                z = z0 + sgn * (x - x0) + c
                if z0 <= z <= z1:
                    pts.append((x, z))
            for z in (z0, z1):
                x = x0 + (z - z0 - c) * sgn
                if x0 <= x <= x1:
                    pts.append((x, z))
            pts = sorted(set((round(a, 4), round(b, 4)) for a, b in pts))
            if len(pts) >= 2 and math.dist(pts[0], pts[-1]) > 1.5:
                out.append([pts[0], pts[-1]])
            k += 1
    return out


# A decal from face.decal / face.stroke is flat in the screen plane, which the 16 degree camera tilts away from a
# vertical surface: on a shield or a straight skirt it sinks in about 0.29 lu per lu above its centre and vanishes
# beyond ~1.8 lu (kit_medieval.paw's upper toes), and pieces laid at different depths open gaps once a pose turns
# them. The helpers below build conforming decals instead: a mesh whose every vertex is cast onto the surface (a
# grid over a field, a ribbon along a line), lifted `depth` toward the camera, so it follows the surface in any pose.
STEP = 1.2


def _mesh(g, face, grid, depth):
    """A shell over grid[k][j] (screen points, rows of equal length) cast onto `face`'s surface, `depth` thick."""
    from mathutils import Matrix
    V = face.view
    n, m = len(grid) - 1, len(grid[0]) - 1
    hits = [[face.hit(x, z) for x, z in row] for row in grid]
    verts = [tuple(h - V * (depth / 2)) for row in hits for h in row] + \
            [tuple(h + V * (depth / 2)) for row in hits for h in row]
    nf = (n + 1) * (m + 1)
    i = lambda k, j: k * (m + 1) + j
    faces = []
    for k in range(n):
        for j in range(m):
            faces.append([i(k, j), i(k, j + 1), i(k + 1, j + 1), i(k + 1, j)])
            faces.append([nf + i(k + 1, j), nf + i(k + 1, j + 1), nf + i(k, j + 1), nf + i(k, j)])
    ring = [i(0, j) for j in range(m + 1)] + [i(k, m) for k in range(1, n + 1)] + \
           [i(n, j) for j in range(m - 1, -1, -1)] + [i(k, 0) for k in range(n - 1, 0, -1)]
    for a, b in zip(ring, ring[1:] + ring[:1]):
        faces.append([a, b, nf + b, nf + a])
    g._add(verts, faces, Matrix.Identity(4), smooth=False)
    return g


def field(g, face, pts, depth=0.35, step=STEP):
    """A conforming decal over the convex polygon pts [(x, z)] (screen lu): rows across it every ~`step` lu."""
    lo, hi = min(p[1] for p in pts), max(p[1] for p in pts)
    n = max(1, math.ceil((hi - lo) / step))
    rows = []
    for k in range(n + 1):
        z = lo + 0.04 + (hi - lo - 0.08) * k / n
        xs = [x0 + (x1 - x0) * (z - z0) / (z1 - z0) for (x0, z0), (x1, z1) in zip(pts, pts[1:] + pts[:1])
              if (z0 - z) * (z1 - z) <= 0 and z0 != z1]
        rows.append((z, min(xs), max(xs)))
    m = max(1, math.ceil(max(r[2] - r[1] for r in rows) / step))
    return _mesh(g, face, [[(x0 + (x1 - x0) * j / m, z) for j in range(m + 1)] for z, x0, x1 in rows], depth)


def ribbon(g, face, pts, w, depth=0.35, step=STEP):
    """A conforming line of width w along pts [(x, z)] (screen lu), with rounded ends."""
    path = []
    for (x0, z0), (x1, z1) in zip(pts, pts[1:]):
        k = max(1, math.ceil(math.dist((x0, z0), (x1, z1)) / step))
        path += [(x0 + (x1 - x0) * t / k, z0 + (z1 - z0) * t / k) for t in range(k)]
    path.append(pts[-1])
    rows = []
    for t, (x, z) in enumerate(path):
        a, b = path[max(t - 1, 0)], path[min(t + 1, len(path) - 1)]
        L = math.dist(a, b) or 1.0
        nx, nz = -(b[1] - a[1]) / L * w / 2, (b[0] - a[0]) / L * w / 2
        rows.append([(x - nx, z - nz), (x, z), (x + nx, z + nz)])
    _mesh(g, face, rows, depth)
    for x, z in (pts[0], pts[-1]):     # round caps
        field(g, face, F.ellipse(x, z, w / 2, w / 2, 10), depth)
    return g


def seam(rig, joint, face, pts, fill=None, w=1.1, depth=0.35, team=False):
    """A line laid on a surface along pts [(x, z)] in screen lu (a stitched seam, a border band); team=True:
    team-dark."""
    g = ribbon(Geo(), face, pts, w, depth)
    if team:
        return look.team_part(rig, joint, g, outline=0)
    return rig.part(joint, g, fill, outline=0, highlight=False)


def plate_band(rig, joint, face, pts, fill, w=1.6, depth=0.3):
    """A polished band on a plate (a lighter steel strip laid on `face` along pts [(x, z)] in screen lu): it carries
    the plate's highlight as a clear band at game scale (plate with a highlight band, mail with rows, cloth with
    folds: three materials side by side)."""
    return seam(rig, joint, face, pts, fill=fill, w=w, depth=depth)


def folds(rig, joint, face, lines, w=1.3, team=True, fill=None, depth=0.3):
    """Pleat lines down a skirt or a tabard: lines = [[(x, z), ...], ...] in screen lu. On team cloth they are
    team-dark (the cloth's folds and the team zone's second tone at once)."""
    g = Geo()
    for pts in lines:
        ribbon(g, face, pts, w, depth)
    if team:
        return look.team_part(rig, joint, g, outline=0)
    return rig.part(joint, g, fill, outline=0, highlight=False)


def panel(rig, joint, face, pts, depth=0.35, team=True, fill=None):
    """A heraldic field (a pale, a chief, a bend) over the convex polygon pts [(x, z)] (screen lu), conforming to the
    surface (it stays whole on a vertical shield); team-dark, or `fill`."""
    g = field(Geo(), face, pts, depth)
    if team:
        look.team_part(rig, joint, g, outline=0)
    else:
        rig.part(joint, g, fill, outline=0, highlight=False)
    return g


def paw(face, g, center_xz, s=1.0, depth=0.4):
    """kit_medieval.paw's bear paw (a pad and four toes) as conforming decals: K.paw centres every piece on one hit,
    so on a shield or a caparison the toes above the centre sink in and the paw reads as a pad and a blob."""
    cx, cz = center_xz
    field(g, face, F.ellipse(cx, cz - 1.0 * s, 2.7 * s, 2.2 * s, 16), depth)
    for a, r in ((152, 0.95), (114, 1.08), (66, 1.08), (28, 0.95)):
        u = math.cos(math.radians(a)) * 3.0 * s
        v = math.sin(math.radians(a)) * 2.4 * s + 0.9 * s
        field(g, face, F.ellipse(cx + u, cz + v, 1.2 * s * r, 1.35 * s * r, 12), depth)
    return g


def cut_loop(g, point, normal, tol=1e-3):
    """The rim a Geo.clip(point, normal) left: the vertices on the cut plane, ordered round their centre (a closed
    loop, character space). Take it before rig.part, which frees the Geo's bmesh."""
    from mathutils import Vector
    n = Vector(normal).normalized()
    c0 = Vector(point)
    pts = [v.co.copy() for v in g.bm.verts if abs((v.co - c0).dot(n)) < tol]
    c = sum(pts, Vector()) / len(pts)
    e1 = n.orthogonal().normalized()
    e2 = n.cross(e1)
    pts.sort(key=lambda p: math.atan2((p - c).dot(e2), (p - c).dot(e1)))
    return [tuple(p) for p in pts]


def piping(rig, joint, pts, r, closed=True, team=True, fill=None, outline=0.5):
    """A rolled edge laid through pts (a hood's facing round its face opening, a cuff's roll): capsules of radius r
    from point to point; team-dark (team=True) or `fill`. A tube reads as a clean band at any view, where a decal on
    a rim seen edge-on breaks into beads."""
    g = Geo()
    seq = list(pts) + list(pts[:1]) if closed else list(pts)
    for a, b in zip(seq, seq[1:]):
        g.capsule(a, b, r, segs=10, rings=2)
    if team:
        return look.team_part(rig, joint, g, outline=outline)
    return rig.part(joint, g, fill, outline=outline)
