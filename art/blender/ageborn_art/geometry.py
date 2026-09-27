"""Procedural mesh primitives built with bmesh, authored in lu in character space.

Characters face +X, up is +Z, and +Y points away from the camera (the character's left).
Every builder appends into one `Geo` so a part can be made of several primitives.
All shapes are rounded on purpose: the style is chunky cartoon (DESIGN A11).
"""
import math

import bmesh
import bpy
from mathutils import Matrix, Vector


def _align_z(direction):
    """Rotation matrix that maps local +Z onto `direction`."""
    d = Vector(direction).normalized()
    return Vector((0, 0, 1)).rotation_difference(d).to_matrix().to_4x4()


def _euler(rot_deg):
    rx, ry, rz = (math.radians(a) for a in rot_deg)
    from mathutils import Euler
    return Euler((rx, ry, rz), "XYZ").to_matrix().to_4x4()


class Geo:
    """Accumulates primitives into one bmesh, then becomes a Blender mesh."""

    def __init__(self):
        self.bm = bmesh.new()
        self.flat_faces = set()

    # -- low level -------------------------------------------------------------------
    def _add(self, verts, faces, matrix, smooth=True):
        bm = self.bm
        base = [bm.verts.new(matrix @ Vector(v)) for v in verts]
        for f in faces:
            try:
                face = bm.faces.new([base[i] for i in f])
            except ValueError:
                continue
            face.smooth = smooth
        return self

    def _add_bm(self, tmp, matrix, smooth=True):
        index = {v: i for i, v in enumerate(tmp.verts)}
        verts = [tuple(v.co) for v in tmp.verts]
        faces = [[index[v] for v in f.verts] for f in tmp.faces]
        tmp.free()
        return self._add(verts, faces, matrix, smooth)

    # -- primitives ------------------------------------------------------------------
    def lathe(self, profile, p0=(0, 0, 0), p1=None, segs=18, rot=(0, 0, 0), squash=(1, 1)):
        """Surface of revolution. `profile` is [(radius, height)] from the bottom up,
        along the axis from p0 toward p1 (default +Z). radius 0 makes a pole.
        `squash` scales the local X/Y of the section (ellipse sections)."""
        verts, faces, rings = [], [], []
        for r, z in profile:
            if r < 1e-6:
                rings.append([len(verts)])
                verts.append((0.0, 0.0, z))
                continue
            ring = []
            for i in range(segs):
                a = 2 * math.pi * i / segs
                ring.append(len(verts))
                verts.append((r * math.cos(a) * squash[0], r * math.sin(a) * squash[1], z))
            rings.append(ring)
        for a, b in zip(rings, rings[1:]):
            if len(a) == 1 and len(b) == 1:
                continue
            for i in range(segs):
                j = (i + 1) % segs
                ai, aj = (a[0], a[0]) if len(a) == 1 else (a[i], a[j])
                bi, bj = (b[0], b[0]) if len(b) == 1 else (b[i], b[j])
                quad = [ai, aj, bj, bi]
                dedup = []
                for v in quad:
                    if v not in dedup:
                        dedup.append(v)
                faces.append(dedup)
        if len(rings[0]) > 1:
            faces.append(list(reversed(rings[0])))
        if len(rings[-1]) > 1:
            faces.append(list(rings[-1]))
        m = Matrix.Translation(Vector(p0))
        if p1 is not None:
            m = m @ _align_z(Vector(p1) - Vector(p0))
        m = m @ _euler(rot)
        return self._add(verts, faces, m)

    def capsule(self, p0, p1, r0, r1=None, segs=16, rings=5):
        """Tapered capsule from p0 (radius r0) to p1 (radius r1): limbs, handles, fingers."""
        r1 = r0 if r1 is None else r1
        length = (Vector(p1) - Vector(p0)).length
        prof = []
        for k in range(rings + 1):
            phi = -math.pi / 2 + (math.pi / 2) * k / rings
            prof.append((r0 * math.cos(phi), r0 * math.sin(phi)))
        for k in range(rings + 1):
            phi = (math.pi / 2) * k / rings
            prof.append((r1 * math.cos(phi), length + r1 * math.sin(phi)))
        prof[0] = (0.0, prof[0][1])
        prof[-1] = (0.0, prof[-1][1])
        return self.lathe(prof, p0, p1 if length > 1e-6 else None, segs)

    def blob(self, center, radii, p=2.0, cuts=6, rot=(0, 0, 0), taper=(1.0, 1.0),
             shift=(0.0, 0.0), smooth=True):
        """Superellipsoid from a subdivided cube: p=2 is an ellipsoid, p=3-5 a rounded box.
        `taper` scales X/Y at the bottom and top; `shift` leans the top in X/Y (fraction of radius)."""
        tmp = bmesh.new()
        bmesh.ops.create_cube(tmp, size=2.0)
        bmesh.ops.subdivide_edges(tmp, edges=tmp.edges[:], cuts=cuts, use_grid_fill=True)
        rx, ry, rz = radii
        for v in tmp.verts:
            x, y, z = v.co
            n = (abs(x) ** p + abs(y) ** p + abs(z) ** p) ** (1.0 / p)
            x, y, z = x / n, y / n, z / n
            t = (z + 1) / 2
            k = taper[0] + (taper[1] - taper[0]) * t
            v.co = Vector((x * rx * k + shift[0] * rx * t, y * ry * k + shift[1] * ry * t, z * rz))
        return self._add_bm(tmp, Matrix.Translation(Vector(center)) @ _euler(rot), smooth)

    def sphere(self, center, r, cuts=5):
        return self.blob(center, (r, r, r), 2.0, cuts)

    def star(self, center, r_out, r_in, depth, points=5, rot=(0, 0, 0)):
        """Chunky extruded star facing the camera (-Y), for KO stars and badges."""
        verts, faces = [], []
        n = points * 2
        for side, y in ((0, -depth / 2), (1, depth / 2)):
            for i in range(n):
                a = math.pi / 2 + math.pi * i / points
                r = r_out if i % 2 == 0 else r_in
                verts.append((r * math.cos(a), y, r * math.sin(a)))
        # front (-Y) face and back face, as fans around a centre vertex
        cf = len(verts)
        verts.append((0, -depth / 2 - depth * 0.35, 0))
        cb = len(verts)
        verts.append((0, depth / 2, 0))
        for i in range(n):
            j = (i + 1) % n
            faces.append([cf, j, i])
            faces.append([cb, n + i, n + j])
            faces.append([i, j, n + j, n + i])
        return self._add(verts, faces, Matrix.Translation(Vector(center)) @ _euler(rot), smooth=False)

    # -- output ----------------------------------------------------------------------
    def mesh(self, name):
        bmesh.ops.remove_doubles(self.bm, verts=self.bm.verts[:], dist=1e-4)
        bmesh.ops.recalc_face_normals(self.bm, faces=self.bm.faces[:])
        me = bpy.data.meshes.new(name)
        self.bm.to_mesh(me)
        self.bm.free()
        return me


def hull_mesh(src, thickness, name):
    """Inverted hull for the toon outline: the mesh pushed out along its vertex normals
    with faces reversed, so only its far side shows around the silhouette."""
    bm = bmesh.new()
    bm.from_mesh(src)
    bm.normal_update()
    for v in bm.verts:
        v.co += v.normal * thickness
    bmesh.ops.reverse_faces(bm, faces=bm.faces[:])
    for f in bm.faces:
        f.smooth = True
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    return me


def translate_mesh(me, offset):
    me.transform(Matrix.Translation(-Vector(offset)))
