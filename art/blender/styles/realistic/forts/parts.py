"""Reusable fort parts for the realistic forts (bronze to cosmic): masonry that breaks by crumble stage,
sandbags, gabions, tents, banners, scaffolds and trap patches.

Crumble by construction: `breakable(...)` gives every piece a stage at which it falls off (top and edge
pieces first); it shows on the body frames before that stage, and a fallen copy lies at the foot from
that stage on. So each age's walls, towers and huts crumble in three believable steps without
hand-authoring every broken frame.
"""
import math
import random

import bmesh

from lib import core as C
import kit as K


def blockbox(name, c, size, mat, rnd, bevel=0.6, jitter=0.12, rot=None):
    """A dressed stone block (bevelled box with a little shape noise)."""
    o = C.box(name, size[0], size[1], size[2], mat, bevel=min(bevel, min(size) * 0.3), loc=c,
              rot=rot if rot is not None else (rnd.uniform(-0.03, 0.03), rnd.uniform(-0.03, 0.03), rnd.uniform(-0.05, 0.05)), segs=2)
    if jitter:
        C.displace(o, jitter * min(size), 0.5)
    return o


def stage_for(zfrac, edge, rnd, keep=0.0):
    """The crumble stage (1-3) at which a piece falls; 9 = never. High and edge pieces go first."""
    r = rnd.random()
    score = zfrac * 0.7 + edge * 0.45 + r * 0.5 - keep
    if score > 1.05:
        return 1
    if score > 0.82:
        return 2
    if score > 0.62:
        return 3
    return 9


def breakable(f, make, zfrac, edge, rnd, fall_to=None, keep=0.0, fam="body"):
    """Adds a piece that falls off at its crumble stage; `make(name_suffix, fallen)` builds it (fallen:
    the copy lying at the foot, or None when it never falls)."""
    st = stage_for(zfrac, edge, rnd, keep)
    f.add(make("", False), fam, 0, st - 1 if st < 9 else 3)
    if st < 9 and fall_to is not None:
        o = make("_f", True)
        if o is not None:
            f.add(o, fam, st, 3)
    return st


def sandbag(name, c, mat, length=9.0, rot_z=0.0, squash=1.0):
    """A filled sack: a pillow-shaped blob."""
    cx, cy, cz = c
    ca, sa = math.cos(rot_z), math.sin(rot_z)
    els = []
    for t in (-0.34, 0.0, 0.34):
        els.append(((cx + ca * t * length, cy + sa * t * length, cz), (length * 0.34, 3.6, 2.5 * squash)))
    o = C.blobs(name, els, mat, res=0.55)
    C.displace(o, 0.35, 1.3)
    return o


def sandbag_wall(f, pts, rows, mat, rnd, length=9.0, fam="body", keep=0.0, fall_x=10.0, z0=0.0):
    """Courses of sandbags along a polyline of (x, y) points (char space), staggered, crumbling by stage."""
    # resample the polyline by bag length
    segs = []
    for (a, b) in zip(pts[:-1], pts[1:]):
        L = math.dist(a, b)
        n = max(1, int(L // (length * 0.92)))
        for i in range(n):
            t0 = (i + 0.5) / n
            segs.append(((a[0] + (b[0] - a[0]) * t0, a[1] + (b[1] - a[1]) * t0), math.atan2(b[1] - a[1], b[0] - a[0])))
    N = len(segs)
    for r in range(rows):
        z = z0 + 2.4 + r * 4.4
        for i, ((x, y), ang) in enumerate(segs):
            if r % 2 and i == N - 1:
                continue
            sh = 0.5 if r % 2 else 0.0
            if r % 2:
                (x2, y2), _ = segs[min(N - 1, i + 1)]
                x, y = (x + x2) / 2, (y + y2) / 2
            edge = abs(i - (N - 1) / 2) / max(1, (N - 1) / 2)

            def make(sfx, fallen, x=x, y=y, z=z, ang=ang, i=i, r=r):
                if fallen:
                    return sandbag(f"bagf{r}_{i}", (x + fall_x + rnd.uniform(-3, 5), y + rnd.uniform(-4, 4), 2.3), mat, length, ang + rnd.uniform(-0.8, 0.8))
                return sandbag(f"bag{r}_{i}", (x, y, z), mat, length, ang + rnd.uniform(-0.06, 0.06))
            breakable(f, make, (r + 1) / rows, edge, rnd, fall_to=True, keep=keep, fam=fam)
            del sh


def rubble_heap(f, c, spread, mat, rnd, n=10, size=(3, 6), fam="rubble", name="rub"):
    for k in range(n):
        s = rnd.uniform(*size)
        f.add(K.rock(f"{name}{k}", (c[0] + rnd.uniform(-spread[0], spread[0]), c[1] + rnd.uniform(-spread[1], spread[1]), s * 0.4),
                     (s, s * rnd.uniform(0.7, 1.0), s * rnd.uniform(0.5, 0.8)), mat, seed=rnd.randint(0, 999), sub=2), fam)


def cloth_panel(name, x0, x1, z0, z1, y, mat, sag=1.2, ragged=0.0, rnd=None, facing="y", seg=(10, 8), wave=0.6):
    """A hanging cloth panel (banner, tarp) facing the camera (-y) or the lane (+x)."""
    bm = bmesh.new()
    nx, nz = seg
    rows = []
    for j in range(nz + 1):
        v = j / nz
        row = []
        for i in range(nx + 1):
            u = i / nx
            x = x0 + (x1 - x0) * u
            z = z1 + (z0 - z1) * v
            if ragged and rnd and j == nz:
                z += rnd.uniform(-ragged, ragged)
            d = -sag * math.sin(math.pi * u) * (1 - v * 0.3) + wave * math.sin(u * 9 + v * 3) * v
            if facing == "y":
                row.append(bm.verts.new((x, y + d, z)))
            else:
                row.append(bm.verts.new((y + d, x, z)))
        rows.append(row)
    for j in range(nz):
        for i in range(nx):
            bm.faces.new((rows[j][i], rows[j][i + 1], rows[j + 1][i + 1], rows[j + 1][i]))
    o = C.from_bm(name, bm, mat)
    so = o.modifiers.new("so", "SOLIDIFY")
    so.thickness = 0.5
    return o


def a_tent(name, x0, x1, half_w, h, mat, y=0.0, sag=0.8, skew=0.0):
    """An A-frame (ridge) tent along x: two sloping cloth planes and triangular ends."""
    bm = bmesh.new()
    nx, nz = 12, 6
    sides = []
    for s in (-1, 1):
        rows = []
        for j in range(nz + 1):
            v = j / nz
            row = []
            for i in range(nx + 1):
                u = i / nx
                x = x0 + (x1 - x0) * u + skew * (1 - v)
                sagv = sag * math.sin(math.pi * u) * math.sin(math.pi * v)
                row.append(bm.verts.new((x, y + s * (half_w * v + 0.2) - s * sagv * 0.0, h * (1 - v) - sagv)))
            rows.append(row)
        sides.append(rows)
        for j in range(nz):
            for i in range(nx):
                q = (rows[j][i], rows[j][i + 1], rows[j + 1][i + 1], rows[j + 1][i])
                bm.faces.new(q if s < 0 else tuple(reversed(q)))
    for xe in (x0, x1):
        tri = [bm.verts.new((xe + skew, y - half_w, 0)), bm.verts.new((xe + skew, y + half_w, 0)), bm.verts.new((xe, y, h))]
        bm.faces.new(tri)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.3)
    o = C.from_bm(name, bm, mat)
    so = o.modifiers.new("so", "SOLIDIFY")
    so.thickness = 0.5
    C.displace(o, 0.4, 1.2)
    return o


def bell_tent(name, R, h, wall_h, mat, cx=0.0, cy=0.0, seg=32, sag=0.0, lean=(0.0, 0.0)):
    """A round bell tent: a short vertical wall and a conical roof to a centre pole."""
    prof = [(R, 0), (R * 1.01, wall_h * 0.5), (R, wall_h), (R * 0.72, wall_h + (h - wall_h) * 0.35), (R * 0.36, wall_h + (h - wall_h) * 0.72), (0.4, h)]
    o = C.lathe(name, prof, mat, seg=seg, loc=(cx, cy, 0))
    for v in o.data.vertices:
        t = v.co.z / h
        v.co.x += lean[0] * t
        v.co.y += lean[1] * t
        if sag:
            v.co.z -= sag * math.sin(math.pi * min(1.0, t)) * (0.5 + 0.5 * math.cos(math.atan2(v.co.y - cy, v.co.x - cx) * 3))
    so = o.modifiers.new("so", "SOLIDIFY")
    so.thickness = 0.5
    C.displace(o, 0.3, 1.2)
    return o


def spear_stack(f, c, n, shaft, head, rnd, fam="body", lo=0, hi=9, h=40.0):
    """Spears or pikes leaned together in a tripod stack."""
    x, y = c
    for k in range(n):
        a = 2 * math.pi * k / n + 0.3
        b = (x + 7 * math.cos(a), y + 5 * math.sin(a), 0)
        t = (x - 2 * math.cos(a), y - 1.5 * math.sin(a), h + rnd.uniform(-3, 3))
        f.add(C.tube(f"spr{k}", [b, t], [0.7, 0.55], shaft, seg=6), fam, lo, hi)
        dx, dy, dz = t[0] - b[0], t[1] - b[1], t[2] - b[2]
        L = math.sqrt(dx * dx + dy * dy + dz * dz)
        e = (t[0] + dx / L * 5, t[1] + dy / L * 5, t[2] + dz / L * 5)
        f.add(C.tube(f"sprh{k}", [t, e], [1.0, 0.1], head, seg=6, flat=0.45), fam, lo, hi)


def brazier(f, c, bowl, fire, fire_core, ember, fam="body", lo=0, hi=1):
    x, y, z = c
    for k in range(3):
        a = 2 * math.pi * k / 3
        f.add(C.tube("bleg", [(x + 4 * math.cos(a), y + 4 * math.sin(a), 0), (x + 2 * math.cos(a), y + 2 * math.sin(a), z)], [0.6, 0.5], bowl, seg=6), fam, lo, 3)
    f.add(C.lathe("bowl", [(0.2, 0), (3.2, 0.6), (4.6, 2.6), (4.8, 3.4)], bowl, seg=16, loc=(x, y, z)), fam, lo, 3)
    f.add(C.blobs("bembers", [((x, y, z + 3.0), (3.6, 3.6, 1.0))], ember, res=0.4), fam, lo, hi)
    f.add(C.blobs("bflame", [((x, y, z + 5.5), (2.2, 1.8, 3.4)), ((x + 0.6, y, z + 8.2), (1.1, 0.9, 2.2))], fire, res=0.35), fam, lo, hi)
    f.add(C.blobs("bcore", [((x, y - 0.6, z + 4.6), (1.1, 0.9, 1.6))], fire_core, res=0.3), fam, lo, hi)


def pit_patch(f, m, rnd, cover, stakes_mat, tips_mat, marker, fam="trap", R=(22, 9), stones=True, stone_mat=None):
    """A spiked pit (the stone kit generalised): dark hollow, dug rim, the cover (armed), stakes (sprung,
    spent), marker stones and the owner's marker. `cover(f)` adds the armed cover objects."""
    for fr in range(4):
        f.add(C.blobs(f"pitdark{fr}", [((0, 0, 0.2), (R[0] * 0.82, R[1] * 0.9, 0.35))], m["hole"], res=0.5), fam, fr, fr)
    rim = C.blobs("rim", [((0, 0, 0.6), (R[0] + 3, R[1] + 3, 1.6)), ((0, 0, 0.6), (R[0] * 0.82, R[1] * 0.9, 3.0), None, -1)], m["dirt"], res=0.7)
    C.displace(rim, 0.9, 0.8)
    f.add(rim, fam, 0, 3)
    for k, (x, y, s) in enumerate(((-R[0] - 6, 6, 6), (R[0] + 4, 8, 5), (-10, R[1] + 5, 4.5))):
        f.add(K.mound(f"spoil{k}", (x, y, 0), (s * 1.6, s, s * 0.8), m["earth"], disp=0.8), fam, 0, 0)
    for k in range(4):
        y = -R[1] - 5 - k * 1.8
        f.add(K.stake(f"lstake{k}", (-18 + k * 5, y, 1.3), (-4 + k * 5, y - 1, 1.6), 1.3, stakes_mat, point=3.5), fam, 0, 0)
    cover(f)
    if stones:
        for k in range(8):
            a = 2 * math.pi * k / 8 + 0.2
            f.add(K.rock(f"marker{k}", ((R[0] + 5) * math.cos(a), (R[1] + 4) * math.sin(a), 1.2), (2.2, 1.9, 1.6), stone_mat or m["stone"], seed=80 + k, sub=2), fam, 1, 3)
    for k in range(9):
        x = -R[0] * 0.7 + k * R[0] * 0.17 + rnd.uniform(-0.8, 0.8)
        y = rnd.uniform(-R[1] * 0.5, R[1] * 0.5)
        h = rnd.uniform(11, 16)
        f.add(K.stake(f"spike{k}", (x, y, 0), (x + rnd.uniform(-1.5, 1.5), y + rnd.uniform(-1, 1), h), 1.2, tips_mat, point=3.5), fam, 2, 2)
        f.add(K.broken(f"spent{k}", (x, y, 0), (x + rnd.uniform(-2.5, 2.5), y, h), 1.2, stakes_mat, rnd.uniform(0.25, 0.55), rnd), fam, 3, 3)
    marker(f)


def marker_flag(f, m, pole_mat, cloth_mat, at=(-26, 10), h=20.0, fam="trap"):
    x, y = at
    f.add(K.pole("markerstick", (x, y, 0), (x - 1, y, h), pole_mat, r=0.8), fam, 0, 3)
    rag = C.tube("rag", [(x - 1, y, h - 1), (x - 5, y - 0.4, h - 2), (x - 8.5, y - 0.8, h - 3.2)], [2.6, 2.3, 1.2], cloth_mat, seg=8, flat=0.25)
    for v in rag.data.vertices:
        v.co.z -= 2.0
    f.add(rag, fam, 0, 3, team=True)


def crater(f, m, rnd, R=18.0, fam="trap", lo=3, hi=3, scorch=None):
    """A blast crater: a dark scorched ring and thrown earth."""
    f.add(C.blobs("crater", [((0, 0, 0.2), (R, R * 0.45, 0.4))], scorch or m["ash"], res=0.6), fam, lo, hi)
    ring = C.blobs("craterrim", [((0, 0, 0.6), (R + 3, R * 0.45 + 3, 1.8)), ((0, 0, 0.6), (R * 0.9, R * 0.4, 3.0), None, -1)], m["dirt"], res=0.7)
    C.displace(ring, 1.0, 0.7)
    f.add(ring, fam, lo, hi)
    for k in range(7):
        a = rnd.uniform(0, 6.28)
        d = R + rnd.uniform(2, 10)
        f.add(K.rock(f"clod{k}", (d * math.cos(a), d * 0.5 * math.sin(a), 1.0), (1.8, 1.5, 1.2), m["dirt"], seed=300 + k, sub=2), fam, lo, hi)


def a_tent_valance(f, name, x0, x1, half_w, h, y, sag, skew, v0, v1, lo, hi, team_mat, hem_mat):
    """A dyed band along both roof slopes of an `a_tent` (v0..v1 down the slope), with a dark hem."""
    bm = bmesh.new()
    for sgn in (-1, 1):
        rows = []
        for v in (v0, (v0 + v1) / 2, v1):
            row = []
            for i in range(13):
                u = i / 12
                x = x0 + (x1 - x0) * u + skew * (1 - v)
                sv = sag * math.sin(math.pi * u) * math.sin(math.pi * v)
                row.append(bm.verts.new((x, y + sgn * (half_w * v + 0.9), h * (1 - v) - sv + 0.5)))
            rows.append(row)
        for j in range(2):
            for i in range(12):
                q = (rows[j][i], rows[j][i + 1], rows[j + 1][i + 1], rows[j + 1][i])
                bm.faces.new(q if sgn < 0 else tuple(reversed(q)))
        f.add(K.lash(name + "hem", [(x0 + skew * (1 - v1), y + sgn * (half_w * v1 + 1.1), h * (1 - v1) + 0.4), (x1 + skew * (1 - v1), y + sgn * (half_w * v1 + 1.1), h * (1 - v1) + 0.4)], hem_mat, r=0.45), "body", lo, hi)
    o = C.from_bm(name, bm, team_mat)
    so = o.modifiers.new("so", "SOLIDIFY")
    so.thickness = 0.5
    f.add(o, "body", lo, hi, team=True)


def barrel(name, c, r, h, wood, hoop, lying=False, rot=0.0):
    """A coopered barrel (staves bulging in the middle) with iron hoops."""
    prof = [(r * 0.86, 0), (r * 0.97, h * 0.25), (r, h * 0.5), (r * 0.97, h * 0.75), (r * 0.86, h), (0.1, h)]
    o = C.lathe(name, [(0.1, 0)] + prof, wood, seg=20)
    hoops = []
    for t in (0.1, 0.32, 0.68, 0.9):
        rr = r * (0.86 + 0.14 * math.sin(math.pi * t)) + 0.25
        pts = [(rr * math.cos(a), rr * math.sin(a), h * t) for a in [i * 2 * math.pi / 24 for i in range(25)]]
        hoops.append(C.tube(name + "hoop", pts, [0.35] * 25, hoop, seg=5, caps=False))
    objs = [o] + hoops
    from mathutils import Euler, Matrix
    M_ = Matrix.Translation(c) @ Euler((math.pi / 2 if lying else 0.0, 0.0, rot)).to_matrix().to_4x4()
    if lying:
        M_ = Matrix.Translation((c[0], c[1], c[2] + r)) @ Euler((math.pi / 2, 0.0, rot)).to_matrix().to_4x4() @ Matrix.Translation((0, 0, -h / 2))
    for x in objs:
        x.data.transform(M_)
    return objs


def gabion(name, c, r, h, wicker, earth):
    """A wicker gabion filled with earth."""
    x, y, z = c
    o = C.lathe(name, [(r * 0.95, 0), (r, h * 0.2), (r * 1.02, h * 0.5), (r, h * 0.8), (r * 0.96, h), (r * 0.8, h + 0.4)], wicker, seg=22, loc=(x, y, z))
    C.displace(o, 0.25, 1.4)
    top = C.blobs(name + "earth", [((x, y, z + h + 0.4), (r * 0.85, r * 0.85, 1.6))], earth, res=0.6)
    C.displace(top, 0.5, 0.8)
    out = [o, top]
    # the weave: stakes round the outside and three binding rings
    for k in range(9):
        a = 2 * math.pi * k / 9
        out.append(C.tube(name + f"st{k}", [(x + (r + 0.3) * math.cos(a), y + (r + 0.3) * math.sin(a), z - 0.5), (x + (r + 0.3) * math.cos(a), y + (r + 0.3) * math.sin(a), z + h + 1.2)], [0.42, 0.38], stake_mat(), seg=5))
    for t in (0.18, 0.52, 0.86):
        rr = r * 1.02 + 0.45
        pts = [(x + rr * math.cos(a), y + rr * math.sin(a), z + h * t) for a in [i * 2 * math.pi / 20 for i in range(21)]]
        out.append(C.tube(name + f"ring{t}", pts, [0.5] * 21, stake_mat(), seg=5, caps=False))
    return out


def stake_mat():
    return C.mat("gabstake", "#4e4034", rough=0.85, noise=0.2, nscale=1.0, bump=0.6)
