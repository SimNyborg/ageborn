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
from . import pipe as _pipe


def _border_safe(fn, px=3):
    """Denoiser noise can leave a few faint pixels in the corners of a wide render; one of them
    makes every packed frame span the whole canvas. Clear a thin border before the layers are built
    (content never belongs there: the canvas is sized with a margin)."""
    def load(tmp, clip, i):
        L = fn(tmp, clip, i)
        for key in ("t", "ab", "obj"):
            a = L[key]
            a[:px, :] = 0
            a[-px:, :] = 0
            a[:, :px] = 0
            a[:, -px:] = 0
        return L
    load._bronze = True
    return load


if not getattr(_pipe.load_layers, "_bronze", False):
    _pipe.load_layers = _border_safe(_pipe.load_layers)


# ---------------------------------------------------------------------------------- materials
def bronze(name="bronze", base="#857559", patina="#65766a", rough=0.45, amount=0.3, nscale=1.6):
    """Aged bronze: metallic, with a matte grey-green patina in noise patches (metallic and roughness
    follow the patina mask, so the patina reads as corrosion, not green metal)."""
    if name in C._MATS:
        return C._MATS[name]
    m = C.mat(name, base, rough=rough, metal=1.0, noise=0.16, nscale=nscale, bump=0.22, ramp2=patina)
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


def strands(m, scale=0.55, axis="X", amount=(0.6, 1.05), bump=0.9):
    """Horsehair / combed strands: fine wave bands across `axis` darken the colour and drive the bump,
    so a crest or a plume reads as hair instead of a smooth painted slab."""
    if m.get("_strands"):
        return m
    nt = m.node_tree
    bsdf = next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED")
    tc = nt.nodes.new("ShaderNodeTexCoord")
    wv = nt.nodes.new("ShaderNodeTexWave")
    wv.bands_direction = axis
    wv.inputs["Scale"].default_value = scale
    wv.inputs["Distortion"].default_value = 3.0
    wv.inputs["Detail"].default_value = 3.0
    nt.links.new(tc.outputs["Object"], wv.inputs["Vector"])
    mr = nt.nodes.new("ShaderNodeMapRange")
    mr.inputs["To Min"].default_value, mr.inputs["To Max"].default_value = amount
    nt.links.new(wv.outputs["Fac"], mr.inputs["Value"])
    src = bsdf.inputs["Base Color"].links[0].from_socket
    mul = nt.nodes.new("ShaderNodeMix")
    mul.data_type, mul.blend_type = "RGBA", "MULTIPLY"
    mul.inputs["Factor"].default_value = 1.0
    nt.links.new(src, mul.inputs[6])
    nt.links.new(mr.outputs[0], mul.inputs[7])
    nt.links.new(mul.outputs[2], bsdf.inputs["Base Color"])
    bn = nt.nodes.new("ShaderNodeBump")
    bn.inputs["Strength"].default_value = bump
    bn.inputs["Distance"].default_value = 0.2
    nt.links.new(wv.outputs["Fac"], bn.inputs["Height"])
    old = bsdf.inputs["Normal"].links[0].from_socket if bsdf.inputs["Normal"].links else None
    if old is not None:
        nt.links.new(old, bn.inputs["Normal"])
    nt.links.new(bn.outputs[0], bsdf.inputs["Normal"])
    m["_strands"] = 1
    return m


def kit():
    """The Bronze Age material set (created once per scene; presets are cached by name)."""
    return dict(
        bronze=bronze(),
        polished=bronze("polished", "#968462", "#76806a", rough=0.34, amount=0.1),
        dark_bronze=bronze("dark_bronze", "#665c4c", "#5d6b5e", rough=0.48, amount=0.45),
        blazon=C.mat("blazon", "#d9d0bc", rough=0.6, noise=0.1, nscale=1.2, bump=0.1),
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
        team_paint=C.mat("team_paint", "#999999", rough=0.55, noise=0.24, nscale=0.8, bump=0.35, team=True, coat=0.1),
        team_hair=strands(C.mat("team_hair", "#9a9a9a", rough=0.75, noise=0.2, nscale=3.0, bump=0.6, team=True, sheen=0.5)),
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
def aspis(m, R, name="aspis", emblem="lambda", depth=None):
    """Round hoplite shield modelled facing +Z (the axis is the face normal), centred at the origin:
    a team-painted face on a shallow bowl, a broad offset bronze rim (the aspis' defining shape),
    a wooden back and a painted blazon in off-white (`emblem` 'lambda', 'horns', 'ring' or None),
    kept small so the team paint stays the read."""
    out = []
    d = depth if depth is not None else R * 0.24
    prof = [(0.0, d), (R * 0.3, d * 0.93), (R * 0.6, d * 0.68), (R * 0.8, d * 0.4), (R * 0.9, d * 0.18)]
    face = C.lathe(name + "_face", prof, m["team_paint"], seg=48)
    C.team(face)
    out.append(face)
    back = C.lathe(name + "_back", [(R * 0.97, -0.2), (R * 0.9, -0.5), (R * 0.5, d * 0.3), (0.0, d * 0.5)], m["cedar"], seg=48)
    out.append(back)
    # the offset rim: a flat bronze band standing proud of the face, rolled at its outer edge
    rim = C.lathe(name + "_rim", [(R * 0.86, d * 0.24), (R * 0.9, d * 0.3), (R * 0.97, d * 0.2), (R * 1.03, 0.1),
                                  (R * 1.04, -0.35), (R * 0.99, -0.6), (R * 0.9, -0.3)], m["polished"], seg=48)
    out.append(rim)

    def zf(r):   # face height at radius r (profile interpolation) + a paint lift
        for (r0, z0), (r1, z1) in zip(prof, prof[1:]):
            if r0 <= r <= r1:
                return z0 + (z1 - z0) * (r - r0) / max(1e-6, r1 - r0) + 0.12
        return prof[-1][1] + 0.12

    def stroke(tag, pts2, w):
        # (u, v) = (across, up) on the shield; placed shields map local -x to screen up (disc_xform)
        pts = [(-v, u, zf(math.hypot(u, v))) for u, v in pts2]
        o = C.tube(name + tag, pts, [w] * len(pts), m["blazon"], seg=10, flat=0.18)
        out.append(o)
    ems = emblem if isinstance(emblem, (tuple, list)) else (emblem,)
    if "lambda" in ems:
        a, h = R * 0.34, R * 0.42
        stroke("_lam1", [(-a, -h), (-a * 0.45, -h * 0.05), (0.0, h * 0.95)], R * 0.095)
        stroke("_lam2", [(0.0, h * 0.95), (a * 0.45, -h * 0.05), (a, -h)], R * 0.095)
    if "horns" in ems:
        n = 12
        pts = [(R * 0.4 * math.cos(math.radians(200 + 140 * i / n)), R * 0.1 + R * 0.4 * math.sin(math.radians(200 + 140 * i / n)) + R * 0.3)
               for i in range(n + 1)]
        stroke("_horns", pts, R * 0.07)
        stroke("_disc", [(0.0, R * 0.05), (0.0, R * 0.12)], R * 0.12)
    if "ring" in ems:
        n = 36
        stroke("_ring", [(R * 0.71 * math.cos(2 * math.pi * i / n), R * 0.71 * math.sin(2 * math.pi * i / n)) for i in range(n + 1)], R * 0.05)
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


def pteruges(rig, BODY, mat, n=14, z0=38.6, z1=30.6, team=True, width=2.3, rx=5.35, ry=7.25):
    """A row of hanging strips (dyed leather or linen) around the hips, skinned so they follow the
    thighs. Authored on the 68-lu figure."""
    k, bw = BODY.k, BODY.bulk
    ox, oy, oz = BODY.offset
    S = lambda x, y, z: (x * k + ox, y * k + oy, z * k + oz)
    strips = []
    for i in range(n):
        a = 2 * math.pi * (i + 0.5) / n
        cx, cy = math.cos(a) * rx * bw, math.sin(a) * ry * bw
        dx, dy = math.cos(a) * 0.8, math.sin(a) * 0.8
        p = [S(cx, cy, z0), S(cx + dx * 0.5, cy + dy * 0.5, (z0 + z1) / 2), S(cx + dx, cy + dy, z1)]
        tang = (-math.sin(a), math.cos(a), 0)
        strips.append(ribbon("ptx", p, [width * k] * 3, mat, thick=0.55 * k, ups=[tang] * 3, seg_w=1))
    pt = C.join("pteruges", strips)
    if team:
        C.team(pt)
    rig.skin(pt, ["hips", "thigh_F", "thigh_B"], soft=2.4 * k, bias={"thigh_F": 1.6 * k, "thigh_B": 1.6 * k})
    return pt


def xiphos(m, fist, length=16.0, r=1.0, name="xiphos"):
    """A leaf-bladed bronze short sword along +X from the fist: a bone grip, a bar guard and a
    leaf-shaped blade with a raised midrib (a flat ribbon, edge-on to the camera less often)."""
    fx, fy, fz = fist
    out = [C.tube(name + "_grip", [(fx - 2.6 * r, fy, fz), (fx + 2.2 * r, fy, fz)], [0.75 * r, 0.8 * r], M.bone("#cdbf9f", name="gripbone"), seg=8),
           C.sphere(name + "_pommel", 1.05 * r, m["polished"], loc=(fx - 3.0 * r, fy, fz), scale=(0.7, 1.2, 1.0)),
           C.tube(name + "_guard", [(fx + 2.4 * r, fy, fz - 2.2 * r), (fx + 2.4 * r, fy, fz + 2.2 * r)], [0.6 * r, 0.6 * r], m["bronze"], seg=8)]
    L = length
    pts = [(fx + 2.6 * r + L * u, fy, fz) for u in (0.0, 0.25, 0.55, 0.8, 0.95, 1.0)]
    widths = [1.9 * r, 2.2 * r, 2.9 * r, 2.4 * r, 1.0 * r, 0.1 * r]
    out.append(ribbon(name + "_blade", pts, widths, m["polished"], thick=0.5 * r, up=(0, 0, 1), center=0.5))
    out.append(C.tube(name + "_rib", pts[:5], [0.4 * r] * 5, m["bronze"], seg=6))
    return out


def ring(name, centre, axis_rot, r, w, mat):
    """A thin torus-like ring (lathe) around a joint; `axis_rot` euler for the ring axis (default +Z)."""
    o = C.lathe(name, [(r - w * 0.4, -w), (r + w * 0.5, 0.0), (r - w * 0.4, w)], mat, seg=24)
    C.xform(o, rot=axis_rot)
    C.xform(o, loc=centre)
    return o


def cast_bronze(name, base="#75674f", patina="#5f7a6a", rough=0.42, dist=3.0, gain=1.6, streak=0.35):
    """Weathered cast bronze for statues: verdigris gathers where the metal is occluded (an ambient
    occlusion mask: folds, joints, under the chin) and runs down in faint streaks, instead of random
    blotches; the exposed, rubbed surfaces stay metallic."""
    if name in C._MATS:
        return C._MATS[name]
    import bpy
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    nt.links.new(bsdf.outputs[0], out.inputs["Surface"])
    tc = nt.nodes.new("ShaderNodeTexCoord")
    ao = nt.nodes.new("ShaderNodeAmbientOcclusion")
    ao.inputs["Distance"].default_value = dist
    ao.samples = 8
    inv = nt.nodes.new("ShaderNodeMath")
    inv.operation = "MULTIPLY_ADD"          # (AO * -gain) + gain  = gain * (1 - AO)
    inv.inputs[1].default_value = -gain
    inv.inputs[2].default_value = gain
    nt.links.new(ao.outputs["AO"], inv.inputs[0])
    # vertical streaks: a noise stretched along Z
    sm = nt.nodes.new("ShaderNodeMapping")
    sm.inputs["Scale"].default_value = (0.6, 0.6, 0.04)
    nt.links.new(tc.outputs["Object"], sm.inputs["Vector"])
    sn = nt.nodes.new("ShaderNodeTexNoise")
    sn.inputs["Scale"].default_value = 1.0
    sn.inputs["Detail"].default_value = 5.0
    nt.links.new(sm.outputs[0], sn.inputs["Vector"])
    sr = nt.nodes.new("ShaderNodeMapRange")
    sr.inputs["From Min"].default_value = 0.52
    sr.inputs["From Max"].default_value = 0.72
    sr.inputs["To Max"].default_value = streak
    nt.links.new(sn.outputs["Fac"], sr.inputs["Value"])
    add = nt.nodes.new("ShaderNodeMath")
    add.operation = "ADD"
    add.use_clamp = True
    nt.links.new(inv.outputs[0], add.inputs[0])
    nt.links.new(sr.outputs[0], add.inputs[1])
    # fine hammered variation of the metal colour
    fn = nt.nodes.new("ShaderNodeTexNoise")
    fn.inputs["Scale"].default_value = 1.4
    fn.inputs["Detail"].default_value = 6.0
    nt.links.new(tc.outputs["Object"], fn.inputs["Vector"])
    fr = nt.nodes.new("ShaderNodeMapRange")
    fr.inputs["To Min"].default_value = 0.85
    fr.inputs["To Max"].default_value = 1.12
    nt.links.new(fn.outputs["Fac"], fr.inputs["Value"])
    mc = nt.nodes.new("ShaderNodeMix")
    mc.data_type, mc.blend_type = "RGBA", "MULTIPLY"
    mc.inputs["Factor"].default_value = 1.0
    mc.inputs[6].default_value = C.col(base)
    nt.links.new(fr.outputs[0], mc.inputs[7])
    mix = nt.nodes.new("ShaderNodeMix")
    mix.data_type = "RGBA"
    nt.links.new(add.outputs[0], mix.inputs["Factor"])
    nt.links.new(mc.outputs[2], mix.inputs[6])
    mix.inputs[7].default_value = C.col(patina)
    nt.links.new(mix.outputs[2], bsdf.inputs["Base Color"])
    met = nt.nodes.new("ShaderNodeMath")
    met.operation = "MULTIPLY_ADD"
    met.inputs[1].default_value = -0.9
    met.inputs[2].default_value = 1.0
    nt.links.new(add.outputs[0], met.inputs[0])
    nt.links.new(met.outputs[0], bsdf.inputs["Metallic"])
    rg = nt.nodes.new("ShaderNodeMath")
    rg.operation = "MULTIPLY_ADD"
    rg.inputs[1].default_value = 0.45
    rg.inputs[2].default_value = rough
    nt.links.new(add.outputs[0], rg.inputs[0])
    nt.links.new(rg.outputs[0], bsdf.inputs["Roughness"])
    bn = nt.nodes.new("ShaderNodeBump")
    bn.inputs["Strength"].default_value = 0.25
    bn.inputs["Distance"].default_value = 0.3
    nt.links.new(fn.outputs["Fac"], bn.inputs["Height"])
    nt.links.new(bn.outputs[0], bsdf.inputs["Normal"])
    m["team"] = 0
    C._MATS[name] = m
    return m
