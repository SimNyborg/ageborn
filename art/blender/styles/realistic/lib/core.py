"""Realistic-miniature style: scene, lights, PBR materials, mesh builders, rig and skin weights.

Space: 1 Blender unit = 1 lu. Characters face +X, up is +Z, +Y is away from the camera.
Every side-plane bone is rolled so that its local X axis is world -Y: a rotation of `r`
radians about local X then turns the bone counter-clockwise on screen (A11 convention).
"""
import math

import bmesh
import bpy
import numpy as np
from mathutils import Euler, Matrix, Quaternion, Vector

PX_PER_LU_1X = 0.9      # infantry of ~68 lu are ~62 px tall on an 844x390 phone
RENDER_MULT = 3         # frames are rendered at 3x and downsampled to 2x and 1x
ELEV_DEG = 12.0         # camera tilt down
THREADS = 2

TEAM_BLUE = "#2F7DF6"
TEAM_ORANGE = "#F28A1E"


# --------------------------------------------------------------------------- colour
def srgb_to_lin(c):
    return ((c / 12.92) if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4)


def col(h, a=1.0):
    """'#RRGGBB' -> linear RGBA."""
    h = h.lstrip("#")
    return tuple(srgb_to_lin(int(h[i:i + 2], 16) / 255.0) for i in (0, 2, 4)) + (a,)


# --------------------------------------------------------------------------- scene
def reset(samples=40):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    _MATS.clear()
    sc = bpy.context.scene
    sc.render.engine = "CYCLES"
    cy = sc.cycles
    cy.device = "CPU"
    cy.samples = samples
    cy.use_adaptive_sampling = True
    cy.adaptive_threshold = 0.03
    cy.use_denoising = True
    cy.denoiser = "OPENIMAGEDENOISE"
    cy.max_bounces = 4
    cy.diffuse_bounces = 2
    cy.glossy_bounces = 2
    cy.transmission_bounces = 0
    cy.volume_bounces = 0
    cy.transparent_max_bounces = 4
    cy.caustics_reflective = False
    cy.caustics_refractive = False
    cy.pixel_filter_type = "BLACKMAN_HARRIS"
    cy.filter_width = 1.5
    sc.render.film_transparent = True
    sc.render.threads_mode = "FIXED"
    sc.render.threads = THREADS
    sc.render.use_persistent_data = True
    sc.render.image_settings.file_format = "PNG"
    sc.render.image_settings.color_mode = "RGBA"
    sc.render.image_settings.color_depth = "8"
    sc.render.resolution_percentage = 100
    sc.render.fps = 24
    sc.view_settings.view_transform = "AgX"
    sc.view_settings.look = "AgX - Medium High Contrast"
    sc.view_settings.exposure = 0.35
    _world(sc)
    _lights(sc)
    _ground(sc)
    return sc


def _world(sc):
    """Soft sky dome: cool sky from above, warm earth bounce from below (ambient + AO)."""
    w = bpy.data.worlds.new("world")
    w.use_nodes = True
    nt = w.node_tree
    nt.nodes.clear()
    tc = nt.nodes.new("ShaderNodeTexCoord")
    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    bg = nt.nodes.new("ShaderNodeBackground")
    out = nt.nodes.new("ShaderNodeOutputWorld")
    nt.links.new(tc.outputs["Generated"], sep.inputs[0])
    nt.links.new(sep.outputs["Z"], ramp.inputs[0])
    el = ramp.color_ramp.elements
    el[0].position, el[0].color = 0.35, col("#4a3f33")
    el[1].position, el[1].color = 0.75, col("#aebdd3")
    mid = el.new(0.52)
    mid.color = col("#c9c1b0")
    nt.links.new(ramp.outputs["Color"], bg.inputs["Color"])
    bg.inputs["Strength"].default_value = 0.55
    nt.links.new(bg.outputs[0], out.inputs[0])
    sc.world = w


def _sun(name, from_dir, energy, color, angle_deg):
    d = bpy.data.lights.new(name, "SUN")
    d.energy = energy
    d.color = color
    d.angle = math.radians(angle_deg)
    o = bpy.data.objects.new(name, d)
    bpy.context.scene.collection.objects.link(o)
    travel = -Vector(from_dir).normalized()
    o.rotation_euler = travel.to_track_quat("-Z", "Y").to_euler()
    return o


def _lights(sc):
    # Key light from above and in front (no side component, so mirrored sprites match).
    _sun("key", (0.0, -0.55, 1.0), 4.2, (1.0, 0.955, 0.9), 9.0)
    # Two symmetric back rims: a cool edge on both silhouette sides and on top.
    _sun("rimL", (-0.9, 1.0, 0.55), 2.6, (0.82, 0.9, 1.0), 4.0)
    _sun("rimR", (0.9, 1.0, 0.55), 2.6, (0.82, 0.9, 1.0), 4.0)


def _ground(sc):
    bm = bmesh.new()
    bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=400)
    me = bpy.data.meshes.new("ground")
    bm.to_mesh(me)
    o = bpy.data.objects.new("ground", me)
    sc.collection.objects.link(o)
    o.is_shadow_catcher = True
    o["is_ground"] = 1
    return o


def camera(w_lu, h_lu, feet_lu, mult=RENDER_MULT):
    """Orthographic camera; `feet_lu` = (x from the left, y from the bottom) of the canvas."""
    sc = bpy.context.scene
    pxlu = PX_PER_LU_1X * mult
    wpx, hpx = int(round(w_lu * pxlu)), int(round(h_lu * pxlu))
    sc.render.resolution_x, sc.render.resolution_y = wpx, hpx
    cd = bpy.data.cameras.new("cam")
    cd.type = "ORTHO"
    cd.ortho_scale = max(wpx, hpx) / pxlu
    cd.clip_start, cd.clip_end = 1.0, 5000.0
    cam = bpy.data.objects.new("cam", cd)
    sc.collection.objects.link(cam)
    e = math.radians(ELEV_DEG)
    fwd = Vector((0.0, math.cos(e), -math.sin(e)))
    up = Vector((0.0, math.sin(e), math.cos(e)))
    right = Vector((1.0, 0.0, 0.0))
    fx, fy = feet_lu
    centre = right * (w_lu / 2 - fx) + up * (h_lu / 2 - fy)
    cam.location = centre - fwd * 1000.0
    cam.rotation_euler = (math.pi / 2 - e, 0.0, 0.0)
    sc.camera = cam
    return cam, (wpx, hpx), (fx * pxlu, hpx - fy * pxlu)


# --------------------------------------------------------------------------- materials
_MATS = {}


def mat(name, base, rough=0.6, metal=0.0, noise=0.12, nscale=0.35, bump=0.25, coat=0.0,
        emission=None, estrength=0.0, team=False, sheen=0.0, spec=0.5, ramp2=None,
        stripes=None):
    """Principled PBR material with procedural colour variation and bump.

    `base` is '#hex' (sRGB). `noise` is the colour variation amount, `nscale` the noise
    frequency in 1/lu (object coordinates, so the texture sticks to rigid parts; skinned
    parts use generated coordinates). `ramp2` blends toward a second colour by a low
    frequency noise (weathering). Team materials are neutral grey; the game tints them."""
    key = name
    if key in _MATS:
        return _MATS[key]
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    nt.links.new(bsdf.outputs[0], out.inputs["Surface"])
    tc = nt.nodes.new("ShaderNodeTexCoord")
    mapn = nt.nodes.new("ShaderNodeMapping")
    mapn.inputs["Scale"].default_value = (nscale, nscale, nscale)
    nt.links.new(tc.outputs["Object"], mapn.inputs["Vector"])
    nz = nt.nodes.new("ShaderNodeTexNoise")
    nz.inputs["Scale"].default_value = 1.0
    nz.inputs["Detail"].default_value = 6.0
    nz.inputs["Roughness"].default_value = 0.62
    nt.links.new(mapn.outputs[0], nz.inputs["Vector"])
    base_c = col(base) if not team else (0.62, 0.62, 0.62, 1.0)
    # colour variation: base * (1 +- noise)
    mr = nt.nodes.new("ShaderNodeMapRange")
    mr.inputs["To Min"].default_value = 1.0 - noise
    mr.inputs["To Max"].default_value = 1.0 + noise
    nt.links.new(nz.outputs["Fac"], mr.inputs["Value"])
    mix = nt.nodes.new("ShaderNodeMix")
    mix.data_type = "RGBA"
    mix.blend_type = "MULTIPLY"
    mix.inputs["Factor"].default_value = 1.0
    c_in = mix.inputs[6]
    if ramp2 is not None:
        nz2 = nt.nodes.new("ShaderNodeTexNoise")
        nz2.inputs["Scale"].default_value = 0.35
        nz2.inputs["Detail"].default_value = 3.0
        nt.links.new(mapn.outputs[0], nz2.inputs["Vector"])
        cr = nt.nodes.new("ShaderNodeValToRGB")
        cr.color_ramp.elements[0].position = 0.42
        cr.color_ramp.elements[0].color = base_c
        cr.color_ramp.elements[1].position = 0.62
        cr.color_ramp.elements[1].color = col(ramp2)
        nt.links.new(nz2.outputs["Fac"], cr.inputs[0])
        nt.links.new(cr.outputs[0], c_in)
    else:
        c_in.default_value = base_c
    if stripes is not None:
        # banded wood / horn: a wave texture darkens the colour a little
        wv = nt.nodes.new("ShaderNodeTexWave")
        wv.inputs["Scale"].default_value = stripes
        wv.inputs["Distortion"].default_value = 6.0
        nt.links.new(mapn.outputs[0], wv.inputs["Vector"])
        mr2 = nt.nodes.new("ShaderNodeMapRange")
        mr2.inputs["To Min"].default_value = 0.8
        mr2.inputs["To Max"].default_value = 1.05
        nt.links.new(wv.outputs["Fac"], mr2.inputs["Value"])
        mul2 = nt.nodes.new("ShaderNodeMath")
        mul2.operation = "MULTIPLY"
        nt.links.new(mr.outputs[0], mul2.inputs[0])
        nt.links.new(mr2.outputs[0], mul2.inputs[1])
        nt.links.new(mul2.outputs[0], mix.inputs[7])
    else:
        nt.links.new(mr.outputs[0], mix.inputs[7])
    nt.links.new(mix.outputs[2], bsdf.inputs["Base Color"])
    # roughness variation
    mrr = nt.nodes.new("ShaderNodeMapRange")
    mrr.inputs["To Min"].default_value = max(0.02, rough - 0.12)
    mrr.inputs["To Max"].default_value = min(1.0, rough + 0.12)
    nt.links.new(nz.outputs["Fac"], mrr.inputs["Value"])
    nt.links.new(mrr.outputs[0], bsdf.inputs["Roughness"])
    bsdf.inputs["Metallic"].default_value = metal
    bsdf.inputs["Specular IOR Level"].default_value = spec
    if coat:
        bsdf.inputs["Coat Weight"].default_value = coat
        bsdf.inputs["Coat Roughness"].default_value = 0.15
    if sheen:
        bsdf.inputs["Sheen Weight"].default_value = sheen
        bsdf.inputs["Sheen Roughness"].default_value = 0.4
    if bump:
        bn = nt.nodes.new("ShaderNodeBump")
        bn.inputs["Strength"].default_value = bump
        bn.inputs["Distance"].default_value = 0.3
        nz3 = nt.nodes.new("ShaderNodeTexNoise")
        nz3.inputs["Scale"].default_value = 4.0
        nz3.inputs["Detail"].default_value = 4.0
        nt.links.new(mapn.outputs[0], nz3.inputs["Vector"])
        nt.links.new(nz3.outputs["Fac"], bn.inputs["Height"])
        nt.links.new(bn.outputs[0], bsdf.inputs["Normal"])
    if emission:
        bsdf.inputs["Emission Color"].default_value = col(emission)
        bsdf.inputs["Emission Strength"].default_value = estrength
    m["team"] = 1 if team else 0
    _MATS[key] = m
    return m


def emit_mat(name, hexc, strength=6.0):
    if name in _MATS:
        return _MATS[name]
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    em = nt.nodes.new("ShaderNodeEmission")
    em.inputs["Color"].default_value = col(hexc)
    em.inputs["Strength"].default_value = strength
    nt.links.new(em.outputs[0], out.inputs["Surface"])
    m["team"] = 0
    _MATS[name] = m
    return m


def mask_material():
    """Override for the team-mask pass: emission 1 on team objects, 0 elsewhere."""
    m = bpy.data.materials.new("team_mask")
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    at = nt.nodes.new("ShaderNodeAttribute")
    at.attribute_type = "OBJECT"
    at.attribute_name = "is_team"
    em = nt.nodes.new("ShaderNodeEmission")
    nt.links.new(at.outputs["Fac"], em.inputs["Strength"])
    em.inputs["Color"].default_value = (1, 1, 1, 1)
    nt.links.new(em.outputs[0], out.inputs["Surface"])
    return m


# --------------------------------------------------------------------------- meshes
def _link(name, me):
    o = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(o)
    return o


def from_bm(name, bm, material, smooth=True, sharp_deg=None):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    if smooth:
        me.shade_smooth()
        if sharp_deg:
            me.set_sharp_from_angle(angle=math.radians(sharp_deg))
    o = _link(name, me)
    if material is not None:
        o.data.materials.append(material)
    return o


def xform(o, loc=(0, 0, 0), rot=(0, 0, 0), scale=(1, 1, 1)):
    """Bake a transform into the mesh data (objects stay at the origin for skinning)."""
    M = Matrix.Translation(loc) @ Euler(rot).to_matrix().to_4x4() @ Matrix.Diagonal((*scale, 1))
    o.data.transform(M)
    o.data.update()
    return o


def sphere(name, r, material, seg=24, ring=16, loc=(0, 0, 0), scale=(1, 1, 1), rot=(0, 0, 0)):
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=ring, radius=r)
    return xform(from_bm(name, bm, material), loc, rot, scale)


def cyl(name, r1, r2, h, material, seg=24, loc=(0, 0, 0), rot=(0, 0, 0), scale=(1, 1, 1),
        caps=True, sharp=40):
    """Cone/cylinder along +Z from 0 to h."""
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=caps, segments=seg, radius1=r1, radius2=r2, depth=h)
    bmesh.ops.translate(bm, verts=bm.verts, vec=(0, 0, h / 2))
    return xform(from_bm(name, bm, material, sharp_deg=sharp), loc, rot, scale)


def box(name, sx, sy, sz, material, bevel=0.3, loc=(0, 0, 0), rot=(0, 0, 0), segs=2):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=(sx, sy, sz), verts=bm.verts)
    if bevel > 0:
        bmesh.ops.bevel(bm, geom=list(bm.edges), offset=bevel, segments=segs, affect="EDGES",
                        profile=0.5)
    return xform(from_bm(name, bm, material, sharp_deg=50), loc, rot)


def lathe(name, profile, material, seg=28, loc=(0, 0, 0), rot=(0, 0, 0), scale=(1, 1, 1),
          sharp=50):
    """Revolve [(radius, z), ...] around Z."""
    bm = bmesh.new()
    rings = []
    for (r, z) in profile:
        ring = []
        for i in range(seg):
            a = 2 * math.pi * i / seg
            ring.append(bm.verts.new((max(r, 0.0) * math.cos(a), max(r, 0.0) * math.sin(a), z)))
        rings.append(ring)
    for j in range(len(rings) - 1):
        for i in range(seg):
            a, b = rings[j][i], rings[j][(i + 1) % seg]
            c, d = rings[j + 1][(i + 1) % seg], rings[j + 1][i]
            bm.faces.new((a, b, c, d))
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-4)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return xform(from_bm(name, bm, material, sharp_deg=sharp), loc, rot, scale)


def tube(name, pts, radii, material, seg=14, sharp=None, caps=True, flat=1.0):
    """Sweep a circle along a polyline of 3D points (radii per point). `flat` squashes the
    cross-section along the local side axis (for straps and blades)."""
    bm = bmesh.new()
    pts = [Vector(p) for p in pts]
    rings = []
    prev_n = None
    for i, p in enumerate(pts):
        t = (pts[min(i + 1, len(pts) - 1)] - pts[max(i - 1, 0)]).normalized()
        ref = Vector((0, 1, 0)) if abs(t.y) < 0.9 else Vector((1, 0, 0))
        n = t.cross(ref).normalized() if prev_n is None else (t.cross(prev_n.cross(t))).normalized()
        if prev_n is None:
            n = ref - t * ref.dot(t)
            n.normalize()
        b = t.cross(n).normalized()
        prev_n = n
        ring = []
        for k in range(seg):
            a = 2 * math.pi * k / seg
            v = p + (n * math.cos(a) + b * math.sin(a) * flat) * radii[i]
            ring.append(bm.verts.new(v))
        rings.append(ring)
    for j in range(len(rings) - 1):
        for k in range(seg):
            bm.faces.new((rings[j][k], rings[j][(k + 1) % seg], rings[j + 1][(k + 1) % seg],
                          rings[j + 1][k]))
    if caps:
        bm.faces.new(list(reversed(rings[0])))
        bm.faces.new(rings[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return from_bm(name, bm, material, sharp_deg=sharp)


_MB_RES = 0.55


def blobs(name, elements, material, res=None, threshold=0.6, subdiv=0):
    """Organic mesh from metaball ellipsoids. Each element: (centre, (a, b, c) surface
    semi-axes in lu, rotation euler (optional), sign (optional, -1 subtracts)).
    Surface radius is 0.575 x metaball radius at stiffness 2 (calibrated)."""
    mb = bpy.data.metaballs.new(name)
    mb.resolution = mb.render_resolution = res or _MB_RES
    mb.threshold = threshold
    base = "mb_" + name.replace(".", "_")
    o = bpy.data.objects.new(base, mb)
    bpy.context.scene.collection.objects.link(o)
    for el in elements:
        c, axes = el[0], el[1]
        rot = el[2] if len(el) > 2 and el[2] is not None else (0, 0, 0)
        sign = el[3] if len(el) > 3 else 1
        m = max(axes)
        e = mb.elements.new(type="ELLIPSOID")
        e.co = c
        e.radius = m / 0.575
        e.stiffness = 2.0
        e.size_x, e.size_y, e.size_z = axes[0] / m, axes[1] / m, axes[2] / m
        e.rotation = Euler(rot).to_quaternion()
        if sign < 0:
            e.use_negative = True
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(o.evaluated_get(dg))
    bpy.data.objects.remove(o)
    bpy.data.metaballs.remove(mb)
    me.name = name
    me.shade_smooth()
    ob = _link(name, me)
    if material is not None:
        ob.data.materials.append(material)
    if subdiv:
        sm = ob.modifiers.new("sub", "SUBSURF")
        sm.levels = sm.render_levels = subdiv
    return ob


def displace(o, strength=0.4, scale=0.4, tex="CLOUDS"):
    t = bpy.data.textures.new(o.name + "_disp", tex)
    t.noise_scale = scale
    d = o.modifiers.new("disp", "DISPLACE")
    d.texture = t
    d.strength = strength
    d.mid_level = 0.5
    d.texture_coords = "LOCAL"
    return o


def join(name, objs):
    """Join meshes into one object (keeps materials)."""
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.join()
    objs[0].name = name
    return objs[0]


def apply_mods(o):
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(o.evaluated_get(dg))
    old = o.data
    o.modifiers.clear()
    o.data = me
    bpy.data.meshes.remove(old)
    return o


def team(o, value=1):
    o["is_team"] = value
    return o


# --------------------------------------------------------------------------- rig
class Rig:
    """An armature built from {name: (head, tail, parent)} in lu, character space."""

    def __init__(self, name, bones, yaw_deg=-22.0):
        self.bones = bones
        ad = bpy.data.armatures.new(name)
        self.obj = bpy.data.objects.new(name, ad)
        bpy.context.scene.collection.objects.link(self.obj)
        bpy.context.view_layer.objects.active = self.obj
        bpy.ops.object.mode_set(mode="EDIT")
        for bn, (h, t, p) in bones.items():
            eb = ad.edit_bones.new(bn)
            eb.head, eb.tail = Vector(h), Vector(t)
            y = (Vector(t) - Vector(h)).normalized()
            z = Vector((0, -1, 0)).cross(y)
            if z.length < 1e-4:
                z = Vector((0, 0, 1))
            eb.align_roll(z)
        for bn, (h, t, p) in bones.items():
            if p:
                ad.edit_bones[bn].parent = ad.edit_bones[p]
        bpy.ops.object.mode_set(mode="OBJECT")
        self.yaw = math.radians(yaw_deg)
        self.obj.rotation_euler = (0, 0, self.yaw)
        for pb in self.obj.pose.bones:
            pb.rotation_mode = "XYZ"
        self.parts = []
        self.seg = {bn: (np.array(h, float), np.array(t, float)) for bn, (h, t, p) in bones.items()}

    # ---- binding
    def _prep(self, o):
        o.parent = self.obj
        md = o.modifiers.new("arm", "ARMATURE")
        md.object = self.obj
        # armature deform must come before subdivision
        while o.modifiers[0].name != "arm":
            bpy.context.view_layer.objects.active = o
            bpy.ops.object.modifier_move_up(modifier="arm")
        self.parts.append(o)

    def rigid(self, o, bone):
        vg = o.vertex_groups.new(name=bone)
        vg.add(list(range(len(o.data.vertices))), 1.0, "REPLACE")
        self._prep(o)
        return o

    def skin(self, o, allowed, soft=1.6, bias=None):
        """Smooth weights from the distance to each allowed bone segment."""
        V = np.array([v.co[:] for v in o.data.vertices], float)
        D = []
        for bn in allowed:
            a, b = self.seg[bn]
            ab = b - a
            t = np.clip(((V - a) @ ab) / max(ab @ ab, 1e-9), 0.0, 1.0)
            d = np.linalg.norm(V - (a + t[:, None] * ab), axis=1)
            if bias and bn in bias:
                d = d + bias[bn]
            D.append(d)
        D = np.stack(D, 1)
        W = np.exp(-(D - D.min(1, keepdims=True)) / soft)
        W[W < 0.02] = 0.0
        W = W / W.sum(1, keepdims=True)
        for j, bn in enumerate(allowed):
            vg = o.vertex_groups.new(name=bn)
            for i in np.nonzero(W[:, j])[0]:
                vg.add([int(i)], float(W[i, j]), "REPLACE")
        self._prep(o)
        return o

    # ---- posing
    def rest(self):
        for pb in self.obj.pose.bones:
            pb.rotation_euler = (0, 0, 0)
            pb.location = (0, 0, 0)
            pb.scale = (1, 1, 1)

    def set(self, bone, r=0.0, rz=0.0, ry=0.0, loc=None, s=None):
        pb = self.obj.pose.bones[bone]
        pb.rotation_euler = (r, ry, rz)
        if loc is not None:
            # loc given in world-like character axes (dx forward, dy depth, dz up), converted
            # to the bone's local axes
            bm = self.obj.data.bones[bone].matrix_local.to_3x3()
            pb.location = bm.inverted() @ Vector(loc)
        if s is not None:
            pb.scale = s if isinstance(s, tuple) else (s, s, s)

    def key(self, frame):
        for pb in self.obj.pose.bones:
            pb.keyframe_insert("rotation_euler", frame=frame)
            pb.keyframe_insert("location", frame=frame)
            pb.keyframe_insert("scale", frame=frame)


# --------------------------------------------------------------------------- 2D kinematics
def ik2(hip, target, l1, l2, bend=1.0):
    """Two-bone IK in the side plane. Angles are measured from straight down, CCW positive
    (so a thigh swung forward has a positive angle). `bend` +1 puts the knee forward
    (+x), -1 back (elbows). Returns (upper_abs, lower_abs)."""
    dx, dz = target[0] - hip[0], target[1] - hip[1]
    d = max(1e-6, min(math.hypot(dx, dz), l1 + l2 - 1e-4))
    a_t = math.atan2(dx, -dz)  # direction to target, from straight down, CCW
    c = (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d)
    off = math.acos(max(-1, min(1, c)))
    upper = a_t + bend * off
    # lower bone direction
    kx = hip[0] + l1 * math.sin(upper)
    kz = hip[1] - l1 * math.cos(upper)
    lower = math.atan2(target[0] - kx, -(target[1] - kz))
    return upper, lower


def rot2(v, a):
    c, s = math.cos(a), math.sin(a)
    return (v[0] * c - v[1] * s, v[0] * s + v[1] * c)
