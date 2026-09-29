"""Medieval kit for the realistic style: the materials, armour, helmets, shields, weapons and cloth
shared by the Medieval Age units (units/medieval/*.py), the turrets and the keep.

Everything is authored for a 68 lu figure (like `biped.Biped`) and scaled by `k = H / 68`.
Historical reference: 14th-15th century Western European infantry and knights. Mail is dark,
speckled iron; plate is satin steel with dirt in the recesses (never mirror-clean chrome); cloth
is wool and linen in undyed browns and greys; the team colour is dyed wool (tabards, livery
coats, surcoats, caparisons) and painted wood (shields, pavises).
"""
import math

import bmesh
from mathutils import Matrix

from . import biped as B
from . import core as C
from . import mats as M

PI = math.pi


# ------------------------------------------------------------------------------------ materials
def steel(name="steel", color="#9aa0a8", rough=0.38):
    """Satin plate steel with darker weathering in patches (never a mirror)."""
    return C.mat(name, color, rough=rough, metal=1.0, noise=0.16, nscale=1.4, bump=0.06, ramp2="#7b8088")


def dark_steel(name="dsteel", color="#5d6168", rough=0.42):
    """Blackened / russet iron fittings: bands, rivets, hoops."""
    return C.mat(name, color, rough=rough, metal=1.0, noise=0.2, nscale=1.2, bump=0.12, ramp2="#4f4a46")


def iron(name="iron", color="#4a4a4c"):
    """Wrought iron: dark, rough, hammered."""
    return C.mat(name, color, rough=0.55, metal=0.9, noise=0.22, nscale=1.0, bump=0.4, ramp2="#3e3a36")


def mail(name="mail", color="#6e7278"):
    """Riveted iron mail: dark metal with a fine ring speckle (a voronoi bump) and rough sheen."""
    m = C.mat(name, color, rough=0.46, metal=1.0, noise=0.22, nscale=1.0, bump=0.0, ramp2="#595c62")
    nt = m.node_tree
    bsdf = next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED")
    tc = nt.nodes.new("ShaderNodeTexCoord")
    vo = nt.nodes.new("ShaderNodeTexVoronoi")
    vo.inputs["Scale"].default_value = 2.6
    nt.links.new(tc.outputs["Object"], vo.inputs["Vector"])
    bn = nt.nodes.new("ShaderNodeBump")
    bn.inputs["Strength"].default_value = 0.75
    bn.inputs["Distance"].default_value = 0.25
    nt.links.new(vo.outputs["Distance"], bn.inputs["Height"])
    nt.links.new(bn.outputs[0], bsdf.inputs["Normal"])
    return m


def brass(name="brass", color="#a08850"):
    return C.mat(name, color, rough=0.34, metal=1.0, noise=0.12, nscale=1.2, bump=0.05, ramp2="#86703f")


def wool(color="#7a6e5e", name="wool", dark=None):
    return C.mat(name, color, rough=0.92, noise=0.12, nscale=1.8, bump=0.35, sheen=0.55, ramp2=dark)


def linen(color="#c8bba0", name="linen"):
    return C.mat(name, color, rough=0.85, noise=0.1, nscale=2.2, bump=0.25, sheen=0.4)


def gambeson(color="#b3a68a", name="gambeson"):
    """Quilted linen jack: vertical quilting lines (stripes) and a soft sheen."""
    return C.mat(name, color, rough=0.9, noise=0.1, nscale=0.9, bump=0.7, sheen=0.4, stripes=3.2, ramp2="#9c9076")


def team_wool(name="team_wool"):
    """Dyed wool (tabards, livery coats, caparisons): the medieval team read."""
    return C.mat(name, "#999999", rough=0.9, noise=0.12, nscale=1.6, bump=0.4, team=True, sheen=0.55)


def team_paint(name="team_paint"):
    """Painted wood / gessoed leather (shields, pavises)."""
    return C.mat(name, "#999999", rough=0.5, noise=0.12, nscale=0.7, bump=0.18, team=True)


# ------------------------------------------------------------------------------------ helpers
def S(k, off=(0.0, 0.0, 0.0)):
    return lambda x, y, z: (x * k + off[0], y * k + off[1], z * k + off[2])


def rot_about(o, centre, deg, axis="Y"):
    """Rotate mesh data about a point (degrees, Blender axis sense)."""
    cx, cy, cz = centre
    o.data.transform(Matrix.Translation((cx, cy, cz)) @ Matrix.Rotation(math.radians(deg), 4, axis)
                     @ Matrix.Translation((-cx, -cy, -cz)))
    o.data.update()
    return o


def blade(name, length, w0, w1, thick, mat, tip=None, x0=0.0, seg=10):
    """A lozenge-section blade along +X from x0, flat faces toward +-Y (edges up and down)."""
    tip = tip if tip is not None else w1 * 2.2
    bm = bmesh.new()
    rings = []
    n = seg
    for i in range(n + 1):
        u = i / n
        x = x0 + (length - tip) * u
        w = w0 + (w1 - w0) * u
        rings.append((x, w, thick * (1 - 0.3 * u)))
    rings.append((x0 + length, 0.02, 0.02))
    vs = []
    for x, w, t in rings:
        vs.append([bm.verts.new((x, 0, w)), bm.verts.new((x, t, 0)), bm.verts.new((x, 0, -w)), bm.verts.new((x, -t, 0))])
    for a, b in zip(vs, vs[1:]):
        for j in range(4):
            bm.faces.new((a[j], a[(j + 1) % 4], b[(j + 1) % 4], b[j]))
    bm.faces.new(list(reversed(vs[0])))
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-4)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return C.from_bm(name, bm, mat, smooth=True, sharp_deg=40)


def plate_shell(name, els, mat, res=0.4, disp=None):
    o = C.blobs(name, els, mat, res=res)
    if disp:
        C.displace(o, disp[0], disp[1])
    return o


# ------------------------------------------------------------------------------------ bodies
def dressed_body(rig, BODY, skin, arms_mat, legs_mat, torso_mat=None, glove=None, res=None):
    """The anatomical body with clothing materials per part: head in skin, arms in their sleeve
    material with separate gloved (or bare) hands, legs in hose. Returns {part: obj}."""
    k = BODY.k
    out = {}
    out.update(BODY.body(rig, skin, parts=("head",), res=res))
    out.update(BODY.body(rig, torso_mat or arms_mat, parts=("torso",), res=res))
    out.update(BODY.body(rig, arms_mat, parts=("arms",), hands=False, res=res))
    out.update(BODY.body(rig, legs_mat, parts=("legs",), res=res))
    ox, oy, oz = BODY.offset
    for s, y in (("F", -BODY.sw), ("B", BODY.sw)):
        h = C.blobs("hand_" + s, [((0.35 * k + ox, y + oy, 31.0 * k + oz), (1.75 * k, 1.4 * k, 2.6 * k)),
                                  ((1.2 * k + ox, y + oy, 32.4 * k + oz), (0.9 * k, 0.9 * k, 1.4 * k))],
                    glove or skin, res=(res or C._MB_RES) * 0.7)
        rig.skin(h, ["forearm_" + s, "hand_" + s], soft=0.9 * k, bias={"forearm_" + s: 1.6 * k})
        out["hand_" + s] = h
    return out


def boots(rig, BODY, mat, high=False):
    k = BODY.k
    ox, oy, oz = BODY.offset
    Sx = S(k, BODY.offset)
    for s in ("F", "B"):
        hy = (-1 if s == "F" else 1) * BODY.hw / k
        els = [(Sx(0.2, hy, 3.9), (2.25, 2.15, 2.5)), (Sx(3.3, hy, 1.6), (4.7, 2.25, 1.75))]
        if high:
            els.append((Sx(-0.4, hy, 9.5), (2.8, 2.6, 5.0)))
        b = C.blobs("boot_" + s, els, mat, res=0.4 * k)
        rig.skin(b, ["shin_" + s, "foot_" + s], soft=1.0 * k, bias={"shin_" + s: 1.0 * k})


def belt(rig, BODY, mat, z=37.4, bulk=1.0, buckle=None):
    k = BODY.k
    Sx = S(k, BODY.offset)
    b = C.blobs("belt", [(Sx(-0.1, 0, z), (5.5 * bulk, 7.35 * bulk, 0.95))], mat, res=0.4 * k)
    rig.skin(b, ["hips", "spine"], soft=2.0 * k)
    if buckle is not None:
        rig.rigid(C.box("buckle", 0.8 * k, 2.2 * k, 1.9 * k, buckle, bevel=0.25 * k, loc=Sx(5.6 * bulk, -1.8, z)), "hips")
    return b


def hauberk(rig, BODY, mat, skirt_z=27.5, bulk=1.06):
    """A mail shirt over the torso to mid thigh (the arms carry the sleeves)."""
    k = BODY.k
    Sx = S(k, BODY.offset)
    bw = BODY.bulk * bulk
    shirt = C.blobs("hauberk", [
        (Sx(0.3, 0, 41.2), (4.7 * bw, 6.3 * bw, 6.2)),
        (Sx(-0.2, 0, 48.0), (5.3 * bw, 7.2 * bw, 6.9)),
        (Sx(2.0, -3.2, 50.4), (3.1, 3.7, 3.0)), (Sx(2.0, 3.2, 50.4), (3.1, 3.7, 3.0)),
        (Sx(-1.2, -5.4, 54.0), (3.3, 3.9, 2.8)), (Sx(-1.2, 5.4, 54.0), (3.3, 3.9, 2.8)),
        (Sx(-2.0, 0, 49.5), (3.2, 6.6 * bw, 5.8)),
    ], mat, res=0.42 * k)
    rig.skin(shirt, ["hips", "spine", "chest"], soft=2.0 * k)
    skirt = C.blobs("mailskirt", [
        (Sx(-0.2, 0, 35.6), (5.2 * bw, 7.1 * bw, 3.4)),
        (Sx(0.4, -3.4, (35 + skirt_z) / 2), (4.6 * bw, 3.8, (35 - skirt_z) / 2 + 1.2)),
        (Sx(0.4, 3.4, (35 + skirt_z) / 2), (4.6 * bw, 3.8, (35 - skirt_z) / 2 + 1.2)),
    ], mat, res=0.42 * k)
    rig.skin(skirt, ["hips", "thigh_F", "thigh_B"], soft=2.4 * k, bias={"thigh_F": 0.8 * k, "thigh_B": 0.8 * k})
    return shirt, skirt


def tabard(rig, BODY, mat, hem_mat=None, length=26.0, bulk=1.1, slit=True, disp=0.3):
    """A team tabard / surcoat: a shell over the chest and back, front and back skirt panels to
    `length` (z, 68-lu units) that follow the thighs, a dark hem proud of the free edges."""
    k = BODY.k
    Sx = S(k, BODY.offset)
    bw = BODY.bulk * bulk
    top = C.blobs("tabard", [
        (Sx(0.4, 0, 41.2), (4.8 * bw, 6.2 * bw, 6.3)),
        (Sx(-0.1, 0, 47.8), (5.35 * bw, 6.9 * bw, 6.9)),
        (Sx(2.2, 0, 50.6), (3.1, 6.2 * bw, 3.0)),
        (Sx(-2.2, 0, 49.4), (3.1, 6.4 * bw, 5.4)),
        (Sx(-0.4, 0, 54.6), (3.8, 5.8, 1.6)),
    ], mat, res=0.4 * k)
    C.displace(top, disp * k, 1.2)
    C.team(top)
    rig.skin(top, ["hips", "spine", "chest"], soft=2.0 * k)
    zc = (36.0 + length) / 2
    hz = (36.0 - length) / 2 + 1.0
    panels = []
    for side, x in (("f", 3.3), ("b", -3.4)):
        els = [(Sx(x * bw, 0, zc), (1.6, 5.2 * bw, hz))]
        if not slit:
            els.append((Sx(0, 0, zc + hz * 0.3), (4.4 * bw, 6.8 * bw, hz * 0.7)))
        p = C.blobs("tabard_" + side, els + [(Sx(x * 0.7 * bw, 0, 36.5), (3.4 * bw, 6.6 * bw, 2.4))], mat, res=0.4 * k)
        C.displace(p, disp * 1.4 * k, 1.0)
        C.team(p)
        rig.skin(p, ["hips", "thigh_F", "thigh_B"], soft=2.8 * k, bias={"thigh_F": 1.4 * k, "thigh_B": 1.4 * k})
        panels.append(p)
        if hem_mat is not None:
            # the hem: the panel's lower edge only, a dark band just proud of it
            hm = C.blobs("tabhem_" + side, [(Sx(x * bw + (0.2 if x > 0 else -0.2), 0, length + 0.7), (1.55, 5.35 * bw, 1.0))],
                         hem_mat, res=0.35 * k)
            rig.skin(hm, ["hips", "thigh_F", "thigh_B"], soft=2.8 * k, bias={"thigh_F": 1.4 * k, "thigh_B": 1.4 * k})
    return top, panels


# ------------------------------------------------------------------------------------ heads
def face(rig, BODY, hair_mat, eye_mat, beard=None, moustache=True, hair="short", brow=True):
    """Hair, beard / moustache and eyes on the Biped head (68-lu authoring)."""
    k = BODY.k
    Sx = S(k, BODY.offset)
    if hair == "short":
        h = C.blobs("hair", [(Sx(-0.6, 0, 65.4), (4.6, 4.1, 3.6)), (Sx(-2.4, 0, 62.4), (2.8, 3.9, 3.8)),
                             (Sx(-1.0, -3.2, 62.8), (2.0, 1.2, 2.6)), (Sx(-1.0, 3.2, 62.8), (2.0, 1.2, 2.6))],
                    hair_mat, res=0.35 * k)
        C.displace(h, 0.5 * k, 0.4)
        rig.rigid(h, "head")
    elif hair == "tonsure":
        # the friar's ring of hair around a bald crown
        h = C.lathe("tonsure", [(4.35 * k, 61.8 * k), (4.75 * k, 63.4 * k), (4.55 * k, 65.4 * k), (3.7 * k, 66.2 * k)],
                    hair_mat, seg=24, scale=(1.0, 0.94, 1.0), loc=(0.2 * k + BODY.offset[0], BODY.offset[1], BODY.offset[2]))
        C.displace(h, 0.35 * k, 0.5)
        rig.rigid(h, "head")
    if beard:
        b = C.blobs("beard", [(Sx(3.5, 0, 60.3), (2.1, 2.9, 2.2)), (Sx(3.9, 0, 58.8), (1.4, 1.9, 1.7)),
                              (Sx(2.0, -2.2, 61.0), (1.8, 1.1, 2.0)), (Sx(2.0, 2.2, 61.0), (1.8, 1.1, 2.0))],
                    beard, res=0.3 * k)
        C.displace(b, 0.4 * k, 0.35)
        rig.rigid(b, "head")
    if moustache:
        for y in (-1.0, 1.0):
            rig.rigid(C.blobs("moustache", [(Sx(4.6, y * 1.1, 61.1), (0.9, 1.4, 0.55), (0, 0, 0))], beard or hair_mat,
                              res=0.2 * k), "head")
    for y in (-1.5, 1.5):
        rig.rigid(C.sphere("eye", 0.52 * k, eye_mat, loc=Sx(4.25, y, 63.0), scale=(0.5, 1, 0.6)), "head")
    if brow:
        for y in (-1.5, 1.5):
            rig.rigid(C.blobs("brow", [(Sx(4.35, y, 64.2), (0.5, 1.3, 0.35))], hair_mat, res=0.2 * k), "head")


def coif(rig, BODY, mat, open_face=True):
    """A mail coif: covers the crown, sides, neck and throat; the face stays open."""
    k = BODY.k
    Sx = S(k, BODY.offset)
    els = [(Sx(-0.2, 0, 64.8), (4.9, 4.35, 4.4)),
           (Sx(-1.4, 0, 60.5), (4.0, 4.5, 3.6)),
           (Sx(0.2, 0, 57.6), (4.0, 5.2, 2.2)),
           (Sx(-0.6, 0, 55.8), (4.6, 6.2, 1.8))]
    if open_face:
        els.append((Sx(4.6, 0, 62.4), (3.4, 2.9, 3.6), None, -1))
    o = C.blobs("coif", els, mat, res=0.35 * k)
    rig.skin(o, ["neck", "head", "chest"], soft=1.6 * k, bias={"chest": 2.0 * k})
    return o


def kettle_hat(rig, BODY, mat, rim=None, brim=8.6, tilt=-4.0):
    """Chapel de fer: a rounded skull with a wide sloping brim (14th-15th c. infantry)."""
    k = BODY.k
    ox, oy, oz = BODY.offset
    prof = [(0.0, 70.6), (2.8, 70.3), (4.7, 68.9), (5.5, 66.8), (5.65, 65.0), (5.75, 64.3),
            (brim * 0.8, 63.2), (brim, 62.2), (brim + 0.1, 61.8), (brim - 0.3, 61.85), (brim * 0.78, 62.8), (5.4, 63.9)]
    o = C.lathe("kettle", [(r * k, z * k) for r, z in prof], mat, seg=36, scale=(1.0, 0.94, 1.0),
                loc=(0.9 * k + ox, oy, oz), sharp=60)
    rot_about(o, (0.9 * k + ox, 0, 64 * k + oz), tilt)
    rig.rigid(o, "head")
    if rim is not None:
        r = C.lathe("kettle_rim", [((brim - 0.1) * k, 61.3 * k), ((brim + 0.35) * k, 61.6 * k), ((brim - 0.1) * k, 61.95 * k)],
                    rim, seg=36, scale=(1.0, 0.94, 1.0), loc=(0.9 * k + ox, oy, oz + 0.3 * k))
        rot_about(r, (0.9 * k + ox, 0, 64 * k + oz), tilt)
        rig.rigid(r, "head")
    return o


def sallet(rig, BODY, mat, tail=True):
    """A 15th c. sallet: a rounded bowl with a flared tail at the back and an open face."""
    k = BODY.k
    Sx = S(k, BODY.offset)
    els = [(Sx(0.7, 0, 65.2), (5.3, 4.7, 4.8)), (Sx(-3.2, 0, 62.6), (3.2, 4.8, 2.2), (0, -0.35, 0))]
    if tail:
        els.append((Sx(-6.0, 0, 61.2), (2.8, 4.3, 0.9), (0, -0.25, 0)))
    els.append((Sx(5.6, 0, 61.0), (2.6, 3.6, 2.6), None, -1))
    o = C.blobs("sallet", els, mat, res=0.3 * k)
    rig.rigid(o, "head")
    return o


def great_bascinet(rig, BODY, mat, slit_mat, crest=None):
    """A pointed bascinet with a rounded visor (hounskull) and a mail aventail."""
    k = BODY.k
    ox, oy, oz = BODY.offset
    prof = [(0.0, 71.0), (1.4, 70.2), (3.6, 68.2), (4.8, 65.8), (5.1, 62.8), (5.0, 59.5), (4.2, 58.2)]
    o = C.lathe("bascinet", [(r * k, z * k) for r, z in prof], mat, seg=32, scale=(1.1, 0.95, 1.0), loc=(0.3 * k + ox, oy, oz))
    rig.rigid(o, "head")
    # the snouted visor
    v = C.blobs("visor", [((4.2 * k + ox, oy, 63.0 * k + oz), (3.0 * k, 3.6 * k, 3.2 * k)),
                          ((6.4 * k + ox, oy, 62.2 * k + oz), (1.8 * k, 1.9 * k, 1.6 * k), (0, 0.4, 0))], mat, res=0.3 * k)
    rig.rigid(v, "head")
    for dz in (0.0,):
        rig.rigid(C.box("slit", 1.8 * k, 5.6 * k, 0.45 * k, slit_mat, bevel=0.1 * k,
                        loc=(6.0 * k + ox, oy, (64.2 + dz) * k + oz)), "head")
    return o


def great_helm(rig, BODY, mat, slit_mat, cross=None):
    """A late great helm (barrel with a tapered crown), eye slits and a brass cross."""
    k = BODY.k
    ox, oy, oz = BODY.offset
    prof = [(0.0, 57.6), (4.3, 57.6), (4.8, 59.2), (5.0, 64.0), (4.8, 67.2), (3.9, 69.0), (1.8, 69.9), (0.0, 70.1)]
    o = C.lathe("greathelm", [(r * k, z * k) for r, z in prof], mat, seg=28, scale=(1.14, 0.97, 1.0), loc=(0.8 * k + ox, oy, oz))
    rig.rigid(o, "head")
    for dz in (64.4,):
        rig.rigid(C.box("slit", 1.4 * k, 8.8 * k, 0.55 * k, slit_mat, bevel=0.1 * k, loc=(6.2 * k + ox, oy, dz * k + oz)), "head")
    if cross is not None:
        rig.rigid(C.box("helmcross", 0.9 * k, 1.1 * k, 6.4 * k, cross, bevel=0.25 * k, loc=(6.35 * k + ox, oy, 61.2 * k + oz)), "head")
        rig.rigid(C.box("helmcross2", 0.9 * k, 5.4 * k, 0.9 * k, cross, bevel=0.25 * k, loc=(6.2 * k + ox, oy, 62.3 * k + oz)), "head")
    return o


# ------------------------------------------------------------------------------------ plate
def plate_harness(rig, BODY, st, dst, leather, legs=True, arms=True):
    """Plate over the limbs (pauldrons, couters, vambraces, cuisses, poleyns, greaves, sabatons).
    The torso plate / coat of plates is added by the unit (usually under a team surcoat)."""
    k = BODY.k
    Sx = S(k, BODY.offset)
    sw = BODY.sw / k
    hw = BODY.hw / k
    for s, sg in (("F", -1), ("B", 1)):
        y = sg * sw
        if arms:
            pa = C.blobs("pauldron_" + s, [(Sx(-0.2, y + sg * 0.6, 55.0), (3.9, 3.7, 3.1)),
                                           (Sx(-0.2, y + sg * 0.9, 52.6), (3.5, 3.4, 1.7)),
                                           (Sx(-0.2, y + sg * 1.0, 50.8), (3.2, 3.2, 1.4))], st, res=0.3 * k)
            rig.skin(pa, ["upperarm_" + s, "chest"], soft=1.2 * k, bias={"chest": 3.0 * k})
            rb = C.blobs("rerebrace_" + s, [(Sx(0.0, y, 48.6), (2.75, 2.7, 4.0))], st, res=0.3 * k)
            rig.skin(rb, ["upperarm_" + s], soft=1.5 * k)
            cou = C.blobs("couter_" + s, [(Sx(-0.7, y, 43.3), (2.45, 2.55, 2.3)), (Sx(-1.9, y + sg * 1.4, 43.3), (0.6, 1.6, 1.8))],
                          st, res=0.28 * k)
            rig.skin(cou, ["upperarm_" + s, "forearm_" + s], soft=1.0 * k)
            vb = C.blobs("vambrace_" + s, [(Sx(0.3, y, 39.4), (2.55, 2.45, 3.8)), (Sx(0.2, y, 35.4), (1.85, 1.85, 1.6))],
                         st, res=0.28 * k)
            rig.skin(vb, ["forearm_" + s], soft=1.5 * k)
            gc = C.blobs("gauntlet_" + s, [(Sx(0.25, y, 33.8), (2.2, 2.1, 1.6))], dst, res=0.25 * k)
            rig.skin(gc, ["forearm_" + s, "hand_" + s], soft=0.8 * k)
        if legs:
            hy = sg * hw
            cu = C.blobs("cuisse_" + s, [(Sx(0.9, hy * 1.05, 29.0), (4.0, 3.9, 5.6)), (Sx(1.4, hy, 24.0), (3.3, 3.2, 3.4))],
                         st, res=0.3 * k)
            rig.skin(cu, ["thigh_" + s], soft=2.0 * k)
            po = C.blobs("poleyn_" + s, [(Sx(1.2, hy, 19.4), (2.5, 2.8, 2.4)), (Sx(1.2, hy + sg * 1.8, 19.4), (1.3, 1.0, 2.2))],
                         st, res=0.28 * k)
            rig.skin(po, ["thigh_" + s, "shin_" + s], soft=1.0 * k)
            gr = C.blobs("greave_" + s, [(Sx(-0.5, hy, 14.2), (2.95, 2.75, 4.4)), (Sx(0.0, hy, 8.8), (2.25, 2.25, 3.4))],
                         st, res=0.28 * k)
            rig.skin(gr, ["shin_" + s], soft=1.6 * k)
            sb = C.blobs("sabaton_" + s, [(Sx(0.2, hy, 4.0), (2.3, 2.3, 2.6)), (Sx(3.6, hy, 1.7), (4.9, 2.3, 1.7))], dst, res=0.3 * k)
            rig.skin(sb, ["shin_" + s, "foot_" + s], soft=1.0 * k, bias={"shin_" + s: 1.0 * k})


# ------------------------------------------------------------------------------------ shields
def heater_shield(k, face_mat, rim_mat, charge_mat=None, height=26.0, width=18.0, charge="chevron", boss=None):
    """A curved heater shield: flat top, arced sides to the point; face toward -Y, centred at the
    origin, top edge up. Returns [face, rim, (charge ...)]."""
    Hh, W = height * k, width * k / 2
    rows, cols = 20, 12

    def half_w(v):     # v: 0 top .. 1 point
        if v < 0.38:
            return W
        u = (v - 0.38) / 0.62
        return W * max(0.0, 1 - u ** 1.8) ** 0.62

    def pt(u, v, off):
        x = u * half_w(v)
        z = Hh * 0.46 - v * Hh
        y = 2.2 * k * (x / W) ** 2 + off           # curved around the arm
        return (x, y, z)

    bm = bmesh.new()
    grid = {}
    for side, off in ((0, 0.0), (1, 0.8 * k)):
        for j in range(rows + 1):
            for i in range(cols + 1):
                grid[(side, i, j)] = bm.verts.new(pt(-1 + 2 * i / cols, j / rows, off))
    for side in (0, 1):
        for j in range(rows):
            for i in range(cols):
                q = [grid[(side, i, j)], grid[(side, i + 1, j)], grid[(side, i + 1, j + 1)], grid[(side, i, j + 1)]]
                bm.faces.new(q if side else list(reversed(q)))
    ring = [(i, 0) for i in range(cols + 1)] + [(cols, j) for j in range(1, rows + 1)] + \
           [(i, rows) for i in range(cols - 1, -1, -1)] + [(0, j) for j in range(rows - 1, 0, -1)]
    for a, b in zip(ring, ring[1:] + ring[:1]):
        try:
            bm.faces.new([grid[(0, *a)], grid[(0, *b)], grid[(1, *b)], grid[(1, *a)]])
        except ValueError:
            pass
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-4)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    face_o = C.from_bm("shield", bm, face_mat, sharp_deg=70)
    C.team(face_o)
    pts = [pt(1, j / rows, -0.15 * k) for j in range(rows + 1)] + [pt(-1, j / rows, -0.15 * k) for j in range(rows, -1, -1)]
    pts += [pt(u, 0, -0.15 * k) for u in (-0.6, -0.2, 0.2, 0.6, 1.0)]
    rim = C.tube("shield_rim", pts, [0.5 * k] * len(pts), rim_mat, seg=6, caps=False)
    out = [face_o, rim]
    if charge_mat is not None:
        # a small heraldic charge in a pale non-team tincture (the unit's company mark)
        def on(u, v, lift=0.35):
            p = pt(u, v, 0.0)
            return (p[0], p[1] - lift * k, p[2])
        if charge == "chevron":
            for a, b in (((-0.72, 0.62), (0.0, 0.26)), ((0.0, 0.26), (0.72, 0.62))):
                pts2 = [on(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t) for t in (0, 0.25, 0.5, 0.75, 1.0)]
                out.append(C.tube("charge", pts2, [1.25 * k] * 5, charge_mat, seg=6, flat=0.25))
        elif charge == "cross":
            for pts2 in ([on(0, v) for v in (0.08, 0.3, 0.5, 0.7, 0.86)], [on(u, 0.3) for u in (-0.8, -0.4, 0, 0.4, 0.8)]):
                out.append(C.tube("charge", pts2, [1.0 * k] * 5, charge_mat, seg=6, flat=0.25))
        elif charge == "bend":
            pts2 = [on(-0.85 + 1.7 * t, 0.05 + 0.62 * t) for t in (0, 0.25, 0.5, 0.75, 1.0)]
            out.append(C.tube("charge", pts2, [1.2 * k] * 5, charge_mat, seg=6, flat=0.25))
    if boss is not None:
        out.append(C.sphere("boss", 1.3 * k, boss, loc=(0, -0.6 * k, Hh * 0.08), scale=(1, 0.45, 1)))
    return out


def mount_on_forearm(objs, BODY, side, fore_abs, offset, yaw_deg=0.0, roll_deg=0.0):
    """Place prop meshes (authored centred at the origin, facing -Y) on a forearm that will be posed
    at absolute angle `fore_abs` (deg, CCW from straight down): `offset` = (along the forearm from
    the elbow, toward the camera, sideways in the arm plane) in lu. `yaw_deg` turns the prop about Z
    first (+ = its face turns toward +X)."""
    elbow_z = BODY.offset[2] + B.ELBOW * BODY.H
    ex, ey = BODY.offset[0], (-1 if side == "F" else 1) * BODY.sw + BODY.offset[1]
    a = math.radians(fore_abs)
    along, toward, perp = offset
    # the pose direction of the forearm (from straight down, CCW) and its perpendicular
    dx, dz = math.sin(a), -math.cos(a)
    px, pz = -dz, dx
    cx = ex + along * dx + perp * px
    cz = elbow_z + along * dz + perp * pz
    for o in objs:
        if roll_deg:
            o.data.transform(Matrix.Rotation(math.radians(-roll_deg), 4, "Y"))
        if yaw_deg:
            o.data.transform(Matrix.Rotation(math.radians(yaw_deg), 4, "Z"))
        o.data.transform(Matrix.Translation((cx, ey - toward, cz)))
        # un-rotate about the elbow so the posed forearm brings the prop back to this placement
        rot_about(o, (ex, 0, elbow_z), fore_abs, "Y")
    return objs


# ------------------------------------------------------------------------------------ weapons
def arming_sword(k, st, grip, brass_m, length=31.0):
    """An arming sword along +X from the origin (the fist): grip, cross, blade, pommel."""
    out = [blade("sword_blade", length * k, 1.05 * k, 0.55 * k, 0.28 * k, st, tip=3.2 * k, x0=2.6 * k)]
    out.append(C.tube("sword_cross", [(2.5 * k, 0, -3.6 * k), (2.4 * k, 0, 0), (2.5 * k, 0, 3.6 * k)], [0.42 * k] * 3, brass_m, seg=8))
    out.append(C.tube("sword_grip", [(-3.4 * k, 0, 0), (2.2 * k, 0, 0)], [0.55 * k, 0.6 * k], grip, seg=8))
    out.append(C.sphere("sword_pommel", 0.95 * k, brass_m, loc=(-3.9 * k, 0, 0), scale=(0.8, 0.7, 1)))
    return out


def poleaxe_head(k, st, x0):
    """Not used yet: a place for later polearms."""
    return []


def skin_fn(rig, o, fn):
    """Skin a mesh with explicit weights: fn(vertex co tuple) -> {bone: weight}."""
    groups = {}
    for v in o.data.vertices:
        for bn, w in fn(tuple(v.co)).items():
            if w <= 0:
                continue
            if bn not in groups:
                groups[bn] = o.vertex_groups.new(name=bn)
            groups[bn].add([v.index], float(w), "REPLACE")
    rig._prep(o)
    return o


def arm_fist(BODY, P, side, fist_local):
    """Side-plane position of a fist for pose P with abs arm angles P['abs<side>'] = (upper, fore,
    hand[, abduct]). `fist_local` = (dx, dz) of the fist from the wrist in the rest pose (hand down)."""
    f = BODY.fk(dict(P))
    s = f["shoulder"]
    a = P["abs" + side]
    ua, fa, ha = (math.radians(x) for x in a[:3])
    e = (s[0] + BODY.L_upper * math.sin(ua), s[1] - BODY.L_upper * math.cos(ua))
    w = (e[0] + BODY.L_fore * math.sin(fa), e[1] - BODY.L_fore * math.cos(fa))
    d = C.rot2(fist_local, ha)
    return (w[0] + d[0], w[1] + d[1]), ha


# ------------------------------------------------------------------------------------ drapes
def drape(name, mat, xs, top_z, half_w, hem_z, folds=1.2, fold_len=5.5, seed=0.0, nu=60, nv=36, thick=0.7,
          round_top=0.35):
    """A hanging cloth (caparison, trapper) over an animal's back: for each x in [xs[0], xs[1]] the
    cross-section is an arc over the back at `top_z(x)` between y = -half_w(x) and +half_w(x), then
    the cloth hangs straight down both sides to `hem_z(x)`. Vertical pleats grow toward the hem
    (amplitude `folds`, wavelength `fold_len`), so it reads as heavy wool, not a pillow.
    Returns the mesh (not rigged)."""
    bm = bmesh.new()
    x0, x1 = xs
    grid = {}
    for j in range(nv + 1):
        v = -1 + 2 * j / nv
        for i in range(nu + 1):
            u = i / nu
            x = x0 + (x1 - x0) * u
            w, zt, zh = half_w(x), top_z(x), hem_z(x)
            av = abs(v)
            arc = round_top
            if av <= arc:
                a = (av / arc) * (PI / 2)
                y = w * math.sin(a)
                z = zt - (1 - math.cos(a)) * w * 0.55
                drop = 0.0
            else:
                t = (av - arc) / (1 - arc)
                y = w
                z0 = zt - w * 0.55
                z = z0 - (z0 - zh) * t
                drop = t
            amp = folds * (0.15 + 0.85 * drop ** 1.3)
            ph = 2 * PI * x / fold_len + seed + 0.6 * math.sin(x * 0.21 + seed)
            y = y + amp * (0.5 + 0.5 * math.sin(ph)) * (1.0 if av > arc * 0.6 else 0.3)
            z += 0.35 * drop * math.sin(ph * 0.5 + 1.3)
            y *= 1 if v >= 0 else -1
            grid[(i, j)] = bm.verts.new((x, y, z))
    for j in range(nv):
        for i in range(nu):
            bm.faces.new((grid[(i, j)], grid[(i + 1, j)], grid[(i + 1, j + 1)], grid[(i, j + 1)]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    o = C.from_bm(name, bm, mat)
    so = o.modifiers.new("so", "SOLIDIFY")
    so.thickness = thick
    so.offset = 1.0
    C.apply_mods(o)
    o.data.shade_smooth()
    return o


def drape_hem(name, mat, xs, top_z, half_w, hem_z, folds=1.2, fold_len=5.5, seed=0.0, band=1.4, n=60, round_top=0.35):
    """Dark hem bands along the bottom edges of `drape` (same parameters), just proud of the cloth."""
    out = []
    for sg in (-1, 1):
        pts = []
        for i in range(n + 1):
            x = xs[0] + (xs[1] - xs[0]) * i / n
            w, zh = half_w(x), hem_z(x)
            ph = 2 * PI * x / fold_len + seed + 0.6 * math.sin(x * 0.21 + seed)
            y = w + folds * (0.5 + 0.5 * math.sin(ph)) + 0.45
            pts.append((x, sg * y, zh + band * 0.5 + 0.35 * math.sin(ph * 0.5 + 1.3)))
        out.append(C.tube(name, pts, [band * 0.5] * len(pts), mat, seg=6, flat=0.45))
    return out


def fringe(name, mat, xs, half_w, hem_z, folds=1.2, fold_len=5.5, seed=0.0, step=2.2, length=2.6, r=0.4):
    """Wool fringe hanging from the hem (tubes)."""
    out = []
    n = int((xs[1] - xs[0]) / step)
    for sg in (-1, 1):
        for i in range(n + 1):
            x = xs[0] + step * i
            w, zh = half_w(x), hem_z(x)
            ph = 2 * PI * x / fold_len + seed + 0.6 * math.sin(x * 0.21 + seed)
            y = sg * (w + folds * (0.5 + 0.5 * math.sin(ph)) + 0.3)
            z = zh + 0.35 * math.sin(ph * 0.5 + 1.3)
            out.append(C.tube(name, [(x, y, z + 0.4), (x - 0.2, y + sg * 0.2, z - length)], [r, r * 0.6], mat, seg=5))
    return out


def pavise(k, face_mat, rim_mat, charge_mat=None, height=24.0, width=14.0):
    """A pavise: a tall rectangular shield with a rounded top and a vertical central ridge (the
    'channel'); face toward -Y, centred at the origin. Returns [face, rim, (charge)]."""
    Hh, W = height * k, width * k / 2
    rows, cols = 18, 10
    bm = bmesh.new()
    grid = {}

    def pt(u, v, off):
        x = u * W * (1.0 - 0.06 * v)
        top = Hh * 0.5 + 1.2 * k * math.cos(u * PI / 2)
        z = top - v * Hh
        ridge = 1.6 * k * max(0.0, 1 - abs(u) / 0.22)
        y = 1.2 * k * u * u + off - ridge
        return (x, y, z)

    for side, off in ((0, 0.0), (1, 0.9 * k)):
        for j in range(rows + 1):
            for i in range(cols + 1):
                grid[(side, i, j)] = bm.verts.new(pt(-1 + 2 * i / cols, j / rows, off))
    for side in (0, 1):
        for j in range(rows):
            for i in range(cols):
                q = [grid[(side, i, j)], grid[(side, i + 1, j)], grid[(side, i + 1, j + 1)], grid[(side, i, j + 1)]]
                bm.faces.new(q if side else list(reversed(q)))
    ring = [(i, 0) for i in range(cols + 1)] + [(cols, j) for j in range(1, rows + 1)] + \
           [(i, rows) for i in range(cols - 1, -1, -1)] + [(0, j) for j in range(rows - 1, 0, -1)]
    for a, b in zip(ring, ring[1:] + ring[:1]):
        try:
            bm.faces.new([grid[(0, *a)], grid[(0, *b)], grid[(1, *b)], grid[(1, *a)]])
        except ValueError:
            pass
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-4)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    face_o = C.from_bm("pavise", bm, face_mat, sharp_deg=70)
    C.team(face_o)
    rimpts = [pt(1, j / rows, -0.2 * k) for j in range(rows + 1)] + [pt(-1, j / rows, -0.2 * k) for j in range(rows, -1, -1)]
    rimpts += [pt(u, 0, -0.2 * k) for u in (-0.75, -0.5, -0.25, 0.0, 0.25, 0.5, 0.75, 1.0)]
    out = [face_o, C.tube("pavise_rim", rimpts, [0.45 * k] * len(rimpts), rim_mat, seg=6, caps=False)]
    if charge_mat is not None:
        pts = [(0.0, -2.0 * k, Hh * 0.28 - t * Hh * 0.5) for t in (0, 0.25, 0.5, 0.75, 1.0)]
        out.append(C.tube("pavise_charge", pts, [1.0 * k] * 5, charge_mat, seg=6, flat=0.4))
        for z in (Hh * 0.12,):
            out.append(C.tube("pavise_charge2", [(-W * 0.55, -1.4 * k + 1.2 * k * 0.3, z), (0, -2.0 * k, z), (W * 0.55, -1.4 * k + 1.2 * k * 0.3, z)],
                              [0.9 * k] * 3, charge_mat, seg=6, flat=0.4))
    return out
