"""Bronze Age kit for the realistic style: materials and the period's armour, clothing and arms,
shared by units/bronze/*.py, turrets/bronze.py and bases/bronze.py.

Materials follow the STYLE_GUIDE palette (linen, aged bronze with a green patina, cedar, mud brick),
kept inside the colour rule: bronze is an AGED, low-saturation alloy (#8c7a5e); only small polished
accents are warmer, and the patina is a grey-green that sits outside the team hue bands.

Parts are authored for a 68 lu figure (biped.py landmarks) and scaled by the Biped's `k`:
  helmet(...)      Chalcidian (open face, cheek guards), Corinthian, conical pilos, boar-tusk, leather cap
  crest(...)       a horsehair crest standing on a stilt (team), follow-through on its own bone
  linothorax(...)  the laminated linen cuirass with shoulder flaps, belt and pteruges (team or linen)
  greaves(...), sandals(...), bracers(...)
  aspis(...)       the big round hoplite shield: team face, bronze rim, bronze boss, wooden back
  spear(...)       ash shaft, bronze leaf head and butt spike, modelled along +X from a fist
  ribbon(...)      a flat cloth / plate sweep with an explicit width direction (banners, crests, straps)
"""
import math

import bmesh
from mathutils import Vector

from . import core as C
from . import mats as M


# ---------------------------------------------------------------------------------- materials
def bronze(name="bronze", base="#8c7a5e", patina="#6b7b6c", rough=0.34, amount=0.2, nscale=1.6):
    """Aged bronze: metallic, with a matte grey-green patina in noise patches (metallic and roughness
    follow the patina mask, so the patina reads as corrosion, not green metal)."""
    if name in C._MATS:
        return C._MATS[name]
    m = C.mat(name, base, rough=rough, metal=1.0, noise=0.12, nscale=nscale, bump=0.12, ramp2=patina)
    nt = m.node_tree
    cr = next(n for n in nt.nodes if n.type == "VALTORGB")
    lo, hi = 0.62 - 0.3 * amount, 0.72 - 0.2 * amount
    cr.color_ramp.elements[0].position, cr.color_ramp.elements[1].position = lo, hi
    fac = cr.inputs[0].links[0].from_socket
    mk = nt.nodes.new("ShaderNodeMapRange")
    mk.inputs["From Min"].default_value = lo
    mk.inputs["From Max"].default_value = hi
    nt.links.new(fac, mk.inputs["Value"])
    bsdf = next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED")
    met = nt.nodes.new("ShaderNodeMath")
    met.operation = "MULTIPLY_ADD"
    met.inputs[1].default_value = -0.9
    met.inputs[2].default_value = 1.0
    nt.links.new(mk.outputs[0], met.inputs[0])
    nt.links.new(met.outputs[0], bsdf.inputs["Metallic"])
    rsrc = bsdf.inputs["Roughness"].links[0].from_socket
    ra = nt.nodes.new("ShaderNodeMath")
    ra.operation = "MULTIPLY_ADD"
    ra.inputs[1].default_value = 0.45
    nt.links.new(mk.outputs[0], ra.inputs[0])
    nt.links.new(rsrc, ra.inputs[2])
    nt.links.new(ra.outputs[0], bsdf.inputs["Roughness"])
    return m


def kit():
    """The Bronze Age material set (created once per scene; presets are cached by name)."""
    return dict(
        bronze=bronze(),
        polished=bronze("polished", "#9c8458", "#76806a", rough=0.24, amount=0.08),
        dark_bronze=bronze("dark_bronze", "#6e604c", "#5d6b5e", rough=0.4, amount=0.4),
        linen=C.mat("linen", "#d2cbb6", rough=0.9, noise=0.08, nscale=1.6, bump=0.45, sheen=0.35),
        linen_dk=C.mat("linen_dk", "#a89c84", rough=0.9, noise=0.1, nscale=1.6, bump=0.45, sheen=0.3),
        wool=C.mat("wool", "#7c6e5c", rough=0.95, noise=0.12, nscale=1.4, bump=0.6, sheen=0.5),
        leather=M.leather("#4f3f33"),
        leather_lt=M.leather("#6e5a46", name="leather_lt"),
        cedar=M.wood("#6b4e36", "#54402e", name="cedar", stripes=1.4),
        ash=M.wood("#8e7a62", "#6e604e", name="ash", stripes=0.5),
        rope=M.rope("#9c8a68"),
        eye=M.eye(),
        dark=M.dark(),
        team_cloth=M.team_cloth(),
        team_paint=C.mat("team_paint", "#999999", rough=0.55, noise=0.14, nscale=0.9, bump=0.3, team=True, coat=0.1),
        team_hair=C.mat("team_hair", "#9a9a9a", rough=0.75, noise=0.2, nscale=3.0, bump=1.0, team=True, sheen=0.5),
    )


# ---------------------------------------------------------------------------------- geometry
def ribbon(name, pts, widths, material, up=(0, 0, 1), thick=0.4, center=0.5, ups=None, seg_w=3):
    """A flat strip swept along `pts`: at each point the strip spans `widths[i]` along the direction
    `up` (or `ups[i]`) made perpendicular to the path, and `thick` across. `center` 0.5 centres the
    strip on the path, 0 grows it from the path along +up (a crest on a helmet, a banner on a pole)."""
    bm = bmesh.new()
    P = [Vector(p) for p in pts]
    rows = []
    for i, p in enumerate(P):
        t = (P[min(i + 1, len(P) - 1)] - P[max(i - 1, 0)]).normalized()
        u = Vector(ups[i] if ups else up)
        u = (u - t * u.dot(t)).normalized()
        s = t.cross(u).normalized()
        w = widths[i]
        row = []
        for j in range(seg_w + 1):
            f = j / seg_w - center
            for side in (-1, 1):
                row.append(bm.verts.new(p + u * (f * w) + s * (side * thick * 0.5)))
        rows.append(row)
    n = seg_w + 1
    for i in range(len(rows) - 1):
        a, b = rows[i], rows[i + 1]
        for j in range(n - 1):
            for side in (0, 1):
                bm.faces.new((a[2 * j + side], a[2 * (j + 1) + side], b[2 * (j + 1) + side], b[2 * j + side]))
        for j in (0, n - 1):
            bm.faces.new((a[2 * j], a[2 * j + 1], b[2 * j + 1], b[2 * j]))
    for row in (rows[0], rows[-1]):
        for j in range(n - 1):
            bm.faces.new((row[2 * j], row[2 * j + 1], row[2 * (j + 1) + 1], row[2 * (j + 1)]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return C.from_bm(name, bm, material, sharp_deg=None)


def disc_xform(o, centre, normal_deg, tilt_deg=0.0):
    """Orient an object modelled with its axis along +Z (a lathe) so the axis points along the
    side-plane direction `normal_deg` (0 = +X forward, toward the camera = -90) and is tilted
    `tilt_deg` (+ = face looks up)."""
    C.xform(o, rot=(0, math.radians(90 - tilt_deg), 0))
    C.xform(o, rot=(0, 0, math.radians(normal_deg)))
    C.xform(o, loc=centre)
    return o


# ---------------------------------------------------------------------------------- head gear
def helmet(rig, k, m, kind="chalcidian", bone="head", ox=0.0, oz=0.0):
    """Helmets on the 68-lu head (biped cranium centre (0.2, 0, 64.5)). Returns the objects."""
    S = lambda x, y, z: ((x + ox) * k, y * k, (z + oz) * k)
    br = m["bronze"]
    out = []
    if kind in ("chalcidian", "corinthian", "colossus"):
        els = [(S(-0.5, 0, 66.0), (4.95, 4.4, 3.95)),
               (S(-3.1, 0, 63.4), (2.6, 4.05, 3.2)),                 # back of the bowl, down to the nape
               (S(-3.9, 0, 60.6), (1.5, 3.8, 1.6), (0, -0.5, 0))]    # flared neck guard
        if kind == "chalcidian":
            els += [(S(2.2, -3.25, 61.6), (2.1, 0.75, 3.0), (0.12, 0.25, 0)),   # hinged cheek guards
                    (S(2.2, 3.25, 61.6), (2.1, 0.75, 3.0), (-0.12, 0.25, 0)),
                    (S(3.9, 0, 65.3), (1.3, 3.5, 1.0))]                        # brow ridge
        else:
            # Corinthian: one hammered shell, cheek plates meeting over the mouth, a nasal
            els += [(S(2.9, -2.2, 61.4), (2.4, 1.4, 3.4), (0.1, 0.3, 0)), (S(2.9, 2.2, 61.4), (2.4, 1.4, 3.4), (-0.1, 0.3, 0)),
                    (S(3.9, 0, 65.0), (1.5, 3.6, 1.2)), (S(4.9, 0, 63.2), (0.7, 0.8, 1.8))]
        h = C.blobs("helmet", els, br, res=0.3 * max(1.0, k ** 0.5))
        rig.rigid(h, bone)
        out.append(h)
        # rolled rim: a darker polished band around the brow
        rim = C.lathe("helmrim", [(4.75, -0.6), (5.05, 0.0), (4.75, 0.6)], m["polished"], seg=28, scale=(1.0, 0.9, 1.0))
        C.xform(rim, rot=(0, math.radians(-12), 0))
        C.xform(rim, loc=(-0.4, 0, 64.3))
        C.xform(rim, scale=(k, k, k), loc=(ox * k, 0, oz * k))
        rig.rigid(rim, bone)
        out.append(rim)
    elif kind == "pilos":
        h = C.lathe("pilos", [(0.0, 10.2), (1.2, 9.8), (3.0, 7.6), (4.4, 4.4), (5.0, 1.6), (5.25, 0.4), (4.9, 0.0)],
                    br, seg=28, scale=(1.0, 0.92, 1.0))
        C.xform(h, rot=(0, math.radians(-8), 0))
        C.xform(h, loc=(-0.3, 0, 63.2))
        C.xform(h, scale=(k, k, k), loc=(ox * k, 0, oz * k))
        rig.rigid(h, bone)
        rim = C.lathe("pilosrim", [(4.9, -0.1), (5.4, 0.3), (5.0, 0.8)], m["polished"], seg=28, scale=(1.0, 0.92, 1.0))
        C.xform(rim, rot=(0, math.radians(-8), 0))
        C.xform(rim, loc=(-0.3, 0, 63.2))
        C.xform(rim, scale=(k, k, k), loc=(ox * k, 0, oz * k))
        rig.rigid(rim, bone)
        out += [h, rim]
    elif kind == "boar":
        # Mycenaean boar's-tusk helmet: a felt cap sewn with rows of tusk plates, cheek flaps
        cap = C.blobs("boarcap", [(S(-0.4, 0, 66.0), (4.9, 4.35, 3.9)), (S(-2.9, 0, 63.2), (2.7, 4.0, 3.2))], m["leather"], res=0.3)
        rig.rigid(cap, bone)
        ivory = M.ivory("#d9ccae", name="tusk")
        for r_i, (z, rr) in enumerate(((63.9, 4.95), (65.7, 4.75), (67.4, 4.2), (68.8, 3.2))):
            n = int(10 + rr * 2)
            for i in range(n):
                a = 2 * math.pi * (i + 0.5 * (r_i % 2)) / n
                if math.cos(a) > 0.6 and z < 66:          # the face stays open
                    continue
                p = S(-0.4 + rr * math.cos(a) * 1.02, rr * math.sin(a) * 0.9, z)
                t = C.blobs("tuskplate", [(p, (0.95 * k, 0.55 * k, 0.8 * k), (0, 0, a))], ivory, res=0.22)
                rig.rigid(t, bone)
                out.append(t)
        for y in (-3.3, 3.3):
            fl = C.blobs("cheekflap", [(S(1.8, y, 61.2), (2.2, 0.7, 2.8), (0, 0.2, 0))], m["leather"], res=0.3)
            rig.rigid(fl, bone)
            out.append(fl)
        knob = C.sphere("capknob", 1.0 * k, m["polished"], loc=S(-0.8, 0, 70.4), scale=(1, 1, 0.8))
        rig.rigid(knob, bone)
        out += [cap, knob]
    elif kind == "cap":
        cap = C.blobs("leathercap", [(S(-0.5, 0, 66.2), (4.8, 4.25, 3.6)), (S(-2.8, 0, 63.6), (2.6, 3.95, 2.8))],
                      m["leather_lt"], res=0.3)
        rig.rigid(cap, bone)
        band = C.lathe("capband", [(4.7, -0.6), (4.95, 0.0), (4.7, 0.6)], m["leather"], seg=24, scale=(1.0, 0.9, 1.0))
        C.xform(band, rot=(0, math.radians(-10), 0))
        C.xform(band, loc=(-0.4, 0, 64.6))
        C.xform(band, scale=(k, k, k), loc=(ox * k, 0, oz * k))
        rig.rigid(band, bone)
        out += [cap, band]
    return out


def crest(rig, k, m, bone="crest", ox=0.0, oz=0.0, height=4.2, trail=True, transverse=False):
    """A horsehair crest on a bronze stilt, swept front to back (team colour). Rig it on its own bone
    parented to the head so it lags the head's motion."""
    S = lambda x, y, z: ((x + ox) * k, y * k, (z + oz) * k)
    out = []
    stilt = C.blobs("creststilt", [(S(-0.6, 0, 70.4), (1.2, 0.8, 1.3))], m["polished"], res=0.25)
    rig.rigid(stilt, bone)
    path = [S(3.4, 0, 69.6), S(1.6, 0, 71.0), S(-0.8, 0, 71.6), S(-3.4, 0, 71.0), S(-5.6, 0, 69.4)]
    widths = [height * 0.55 * k, height * 0.9 * k, height * k, height * 0.95 * k, height * 0.8 * k]
    ups = [(0.5, 0, 1), (0.25, 0, 1), (0, 0, 1), (-0.35, 0, 1), (-0.8, 0, 1)]
    if trail:
        path += [S(-7.4, 0, 67.0), S(-8.4, 0, 63.6), S(-8.8, 0, 60.0)]
        widths += [height * 0.65 * k, height * 0.5 * k, height * 0.3 * k]
        ups += [(-1, 0, 0.4), (-1, 0, 0.1), (-1, 0, 0)]
    hair = ribbon("crest", path, widths, m["team_hair"], thick=1.7 * k, center=0.0, ups=ups, seg_w=3)
    C.displace(hair, 0.35 * k, 0.7)
    C.team(hair)
    rig.rigid(hair, bone)
    base = ribbon("crestbase", path[:5], [0.9 * k] * 5, m["polished"], thick=1.2 * k, center=0.3, ups=ups[:5], seg_w=1)
    rig.rigid(base, bone)
    out += [stilt, hair, base]
    return out


def hair_beard(rig, k, m, hair=None, beard=True, nape=True, bone="head", curly=True):
    """Short curly Mediterranean hair showing under a helmet (nape) and a full curled beard."""
    S = lambda x, y, z: (x * k, y * k, z * k)
    out = []
    hm = hair or M.hair("#2a211c", name="blackhair")
    if beard:
        b = C.blobs("beard", [(S(3.4, 0, 60.2), (2.0, 2.9, 2.3)), (S(3.9, 0, 58.6), (1.5, 2.0, 1.9)),
                              (S(2.0, -2.3, 61.0), (1.7, 1.1, 2.1)), (S(2.0, 2.3, 61.0), (1.7, 1.1, 2.1))], hm, res=0.35)
        C.displace(b, 0.5 * k, 0.4 if curly else 0.25)
        rig.rigid(b, bone)
        out.append(b)
    if nape:
        n = C.blobs("nape", [(S(-3.2, 0, 60.6), (2.0, 3.4, 2.2))], hm, res=0.35)
        C.displace(n, 0.5 * k, 0.45)
        rig.rigid(n, bone)
        out.append(n)
    return out


def full_hair(rig, k, m, color="#2a211c", bone="head", band=None):
    """Thick curly hair (no helmet): a cap of curls over the cranium, fuller at the back."""
    S = lambda x, y, z: (x * k, y * k, z * k)
    hm = M.hair(color, name="curls")
    o = C.blobs("hair", [(S(-0.3, 0, 65.4), (4.65, 4.15, 3.5)), (S(-2.5, 0, 62.8), (3.0, 3.95, 3.7)),
                         (S(1.7, 0, 66.9), (2.8, 3.5, 1.7)), (S(-1.0, -3.3, 63.4), (1.9, 1.2, 2.4)),
                         (S(-1.0, 3.3, 63.4), (1.9, 1.2, 2.4))], hm, res=0.35)
    C.displace(o, 0.55 * k, 0.6)
    rig.rigid(o, bone)
    out = [o]
    if band is not None:
        b = C.lathe("headband", [(4.55, -0.7), (4.85, 0.0), (4.55, 0.7)], band, seg=24, scale=(1.0, 0.92, 1.0))
        C.xform(b, rot=(0, math.radians(-9), 0))
        C.xform(b, loc=(0.0, 0, 65.2))
        C.xform(b, scale=(k, k, k))
        C.team(b)
        rig.rigid(b, bone)
        out.append(b)
    return out


def eyes(rig, k, m, bone="head"):
    for y in (-1.55, 1.55):
        rig.rigid(C.sphere("eye", 0.52 * k, m["eye"], loc=(4.25 * k, y * k, 63.0 * k), scale=(0.5, 1, 0.6)), bone)


# ---------------------------------------------------------------------------------- body armour
def linothorax(rig, BODY, m, pteruges="team", skirt="team", skirt_len=1.0, belt=True, flaps=True):
    """The linen cuirass (laminated linen, off-white) over a chiton skirt, with a row of hanging
    pteruges strips around the hips (team by default: the big team read of the infantry)."""
    k, bw = BODY.k, BODY.bulk
    S = lambda x, y, z: (x * k, y * k, z * k)
    out = {}
    shell = C.blobs("cuirass", [
        (S(0.3, 0, 41.2), (4.55 * bw, 6.3 * bw, 5.3)),
        (S(-0.2, 0, 47.8), (5.15 * bw, 7.2 * bw, 6.9)),
        (S(1.95, -3.2, 50.2), (3.1, 3.8, 3.0)),
        (S(1.95, 3.2, 50.2), (3.1, 3.8, 3.0)),
        (S(-2.1, 0, 49.4), (3.25, 6.8 * bw, 5.9)),
        (S(-0.9, -5.2, 53.4), (3.3, 3.6, 2.6)),
        (S(-0.9, 5.2, 53.4), (3.3, 3.6, 2.6)),
    ], m["linen"], res=0.4 * max(1.0, k ** 0.5))
    C.displace(shell, 0.12 * k, 1.4)
    rig.skin(shell, ["hips", "spine", "chest"], soft=2.0 * k)
    out["cuirass"] = shell
    if flaps:
        for y in (-1, 1):
            f = C.blobs("flap", [(S(0.2, y * 5.0 * bw, 55.2), (3.6, 3.2, 1.0), (y * 0.25, 0.1, 0))], m["linen_dk"], res=0.3)
            rig.skin(f, ["chest", "upperarm_" + ("F" if y < 0 else "B")], soft=2.5 * k, bias={"upperarm_" + ("F" if y < 0 else "B"): 2.5 * k})
    if belt:
        bt = C.blobs("belt", [(S(0.1, 0, 39.4), (4.7 * bw, 6.5 * bw, 1.0))], m["leather"], res=0.3)
        rig.skin(bt, ["hips", "spine"], soft=2.0 * k)
        rig.rigid(C.sphere("buckle", 0.8 * k, m["polished"], loc=S(4.6 * bw, -1.0, 39.4), scale=(0.6, 1, 1)), "hips")
    sk_mat = m["team_cloth"] if skirt == "team" else m[skirt]
    sk = C.blobs("chiton", [(S(-0.1, 0, 35.8), (5.3 * bw, 7.2 * bw, 2.8)),
                            (S(0.1, 0, 32.6), (5.9 * bw, 7.9 * bw, 3.4 * skirt_len)),
                            (S(0.3, 0, 30.0 - 1.6 * (skirt_len - 1)), (6.1 * bw, 8.0 * bw, 1.6))], sk_mat, res=0.4 * max(1.0, k ** 0.5))
    C.displace(sk, 0.4 * k, 1.0)
    if skirt == "team":
        C.team(sk)
    rig.skin(sk, ["hips", "thigh_F", "thigh_B"], soft=3.0 * k, bias={"thigh_F": 1.2 * k, "thigh_B": 1.2 * k})
    out["skirt"] = sk
    if pteruges:
        pm = m["team_cloth"] if pteruges == "team" else m["linen"]
        n = 14
        strips = []
        for i in range(n):
            a = 2 * math.pi * (i + 0.5) / n
            cx, cy = math.cos(a) * 5.35 * bw, math.sin(a) * 7.25 * bw
            ox, oy = math.cos(a) * 0.8, math.sin(a) * 0.8
            p = [S(cx, cy, 38.6), S(cx + ox * 0.5, cy + oy * 0.5, 34.5), S(cx + ox, cy + oy, 30.6)]
            tang = (-math.sin(a), math.cos(a), 0)
            st = ribbon("pterux", p, [2.3 * k] * 3, pm, thick=0.55 * k, ups=[tang] * 3, seg_w=1)
            strips.append(st)
        pt = C.join("pteruges", strips)
        if pteruges == "team":
            C.team(pt)
        rig.skin(pt, ["hips", "thigh_F", "thigh_B"], soft=2.4 * k, bias={"thigh_F": 1.6 * k, "thigh_B": 1.6 * k})
        out["pteruges"] = pt
    return out


def greaves(rig, BODY, m, mat=None):
    k = BODY.k
    out = []
    for s in ("F", "B"):
        hy = (-1 if s == "F" else 1) * BODY.hw / k
        S = lambda x, y, z: (x * k, y * k, z * k)
        g = C.blobs("greave_" + s, [(S(0.35, hy, 10.6), (2.55, 2.5, 6.0)), (S(-0.95, hy, 14.8), (3.3, 2.95, 4.5)),
                                    (S(0.75, hy, 19.2), (2.35, 2.45, 1.6))], mat or m["bronze"], res=0.3)
        rig.skin(g, ["shin_" + s], soft=2 * k)
        out.append(g)
    return out


def sandals(rig, BODY, m, boots=False):
    k = BODY.k
    S = lambda x, y, z: (x * k, y * k, z * k)
    for s in ("F", "B"):
        hy = (-1 if s == "F" else 1) * BODY.hw / k
        sole = C.blobs("sole_" + s, [(S(3.2, hy, 0.45), (4.55, 2.0, 0.55))], m["leather"], res=0.25)
        rig.skin(sole, ["foot_" + s, "shin_" + s], soft=0.8 * k, bias={"shin_" + s: 1.5 * k})
        els = [(S(0.0, hy, 3.6), (1.75, 1.75, 0.55)), (S(2.4, hy, 2.0), (0.6, 1.95, 0.9)), (S(4.2, hy, 1.6), (0.55, 1.9, 0.8))]
        if boots:
            els = [(S(0.1, hy, 4.4), (2.0, 1.95, 3.0)), (S(3.1, hy, 1.7), (4.2, 2.0, 1.45))]
        st = C.blobs("straps_" + s, els, m["leather"], res=0.25)
        rig.skin(st, ["foot_" + s, "shin_" + s], soft=1.0 * k, bias={"shin_" + s: 1.0 * k})


def bracers(rig, BODY, m, mat=None, sides=("F", "B")):
    k = BODY.k
    S = lambda x, y, z: (x * k, y * k, z * k)
    for s in sides:
        y = (-1 if s == "F" else 1) * BODY.sw / k
        br = C.blobs("bracer_" + s, [(S(0.3, y, 37.4), (2.5, 2.4, 3.2))], mat or m["leather"], res=0.3)
        rig.skin(br, ["forearm_" + s, "hand_" + s], soft=1.5 * k)


# ---------------------------------------------------------------------------------- arms
def aspis(m, R, name="aspis", emblem=True):
    """Round shield modelled facing +Z (the axis is the face normal), centred at the origin, the
    convex face toward +Z: team face, polished rim, bronze boss, wooden back, a dark painted blazon."""
    out = []
    prof = [(0.0, 3.4), (R * 0.3, 3.1), (R * 0.6, 2.2), (R * 0.85, 1.0), (R * 0.97, 0.15)]
    face = C.lathe(name + "_face", prof, m["team_paint"], seg=48)
    C.team(face)
    out.append(face)
    back = C.lathe(name + "_back", [(R * 0.97, 0.1), (R * 0.9, -0.3), (R * 0.5, 1.0), (0.0, 1.8)], m["cedar"], seg=48)
    out.append(back)
    rim = C.lathe(name + "_rim", [(R * 0.93, -0.6), (R * 1.03, -0.2), (R * 1.05, 0.35), (R * 0.95, 0.55), (R * 0.9, 0.2)],
                  m["polished"], seg=48)
    out.append(rim)
    if emblem:
        # a painted blazon ring and a small bronze boss (non-team marks on the team face)
        ring = C.lathe(name + "_ring", [(R * 0.62, 2.05), (R * 0.66, 2.15), (R * 0.7, 1.92)], M.dark("#2e2620", name="blazon"), seg=48)
        out.append(ring)
        boss = C.lathe(name + "_boss", [(0.0, 4.6), (R * 0.1, 4.3), (R * 0.16, 3.6), (R * 0.19, 3.2)], m["bronze"], seg=24)
        out.append(boss)
    return out


def spear(m, fist, front, back, r=0.8, head=6.0, name="spear", shaft="ash", head_mat="polished"):
    """A spear along +X through `fist`: ash shaft, bronze leaf head, bronze butt spike (sauroter)."""
    fx, fy, fz = fist
    out = [C.tube(name + "_shaft", [(fx - back, fy, fz), (fx + front * 0.5, fy, fz), (fx + front, fy, fz)],
                  [r * 0.9, r, r * 0.85], m[shaft], seg=10)]
    hl = C.blobs(name + "_head", [((fx + front + head * 0.45, fy, fz), (head * 0.55, r * 0.55, r * 1.55))], m[head_mat], res=0.22)
    out.append(hl)
    out.append(C.tube(name + "_tip", [(fx + front + head * 0.8, fy, fz), (fx + front + head * 1.25, fy, fz)], [r * 1.2, 0.08],
                      m[head_mat], seg=8, flat=0.35))
    out.append(C.tube(name + "_socket", [(fx + front - 1.2, fy, fz), (fx + front + 0.6, fy, fz)], [r * 1.15, r * 1.05],
                      m["bronze"], seg=10))
    out.append(C.tube(name + "_butt", [(fx - back - 0.2, fy, fz), (fx - back - 3.4, fy, fz)], [r * 1.05, 0.2], m["bronze"], seg=8))
    return out
