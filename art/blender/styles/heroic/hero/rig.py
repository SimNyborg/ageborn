"""HeroRig: the base Rig (joints are empties, parts are meshes on joints) plus what the heroic
style needs:

  part()     heroic materials (finish per surface, far-side darkening, thinner interior lines)
  skin()     soft parts that BEND: a mesh skinned to a chain of joints (capes, pelts, manes,
             tails, plumes, pennants). Vertices are deformed in Python every time the rig is
             posed (linear blend skinning, hat-function weights along the chain), so a cape
             waves as one piece instead of swinging as rigid plates.
  chain()    a chain of secondary joints driven by the follow-through spring, link by link, so
             each link lags the one before it (overlapping action).
  fx()       parts rendered in a separate pass on top of the unit without an outline (muzzle
             flashes, glow halos, charge orbs).
"""
import math

import bpy
import numpy as np
from mathutils import Matrix, Vector

from ageborn_art.geometry import hull_mesh
from ageborn_art.rig import Rig

from . import config as H
from . import materials as M


class HeroRig(Rig):
    def __init__(self, name, yaw):
        super().__init__(name, yaw=yaw)
        self.skinned = []
        self.fx_parts = []
        self.chain_order = []     # secondary joints in dependency order
        self._rest_inv = None

    # -- parts ------------------------------------------------------------------------------
    def _material(self, fill, finish, team, glow, far):
        if team:
            return M.team(finish if finish in ("metal", "gloss", "fur", "leather") else "cloth", far)
        if glow:
            return M.glow(glow)
        return M.surface(fill, finish, far)

    def _hull(self, me, name, line, fill, team, line_hex, glow):
        hme = hull_mesh(me, line, f"{self.name}.{name}.hull")
        hmat = M.line(team_part=True) if team else M.line(line_hex or fill or glow)
        hme.materials.append(hmat)
        hull = bpy.data.objects.new(f"{self.name}.{name}.hull", hme)
        for flag in ("visible_diffuse", "visible_glossy", "visible_shadow",
                     "visible_transmission", "visible_volume_scatter"):
            setattr(hull, flag, False)
        self.coll.objects.link(hull)
        return hull

    def part(self, joint, geo, fill=None, finish="cloth", team=False, glow=None, far=False,
             line=H.INTERIOR_LINE_LU, line_hex=None, name=None, fx=False):
        name = name or f"{joint}.{len(self.parts)}"
        me = geo.mesh(f"{self.name}.{name}")
        me.transform(Matrix.Translation(-self.rest[joint]))
        me.materials.append(self._material(fill, finish, team, glow, far))
        obj = bpy.data.objects.new(f"{self.name}.{name}", me)
        self.coll.objects.link(obj)
        obj.parent = self.joints[joint]
        hull = None
        if line > 0 and not fx:
            hull = self._hull(me, name, line, fill, team, line_hex, glow)
            hull.parent = self.joints[joint]
        rec = {"obj": obj, "hull": hull, "joint": joint, "team": team, "fx": fx}
        if fx:
            # fx parts never cast AO onto the unit and are only shown in the fx pass
            for flag in ("visible_diffuse", "visible_glossy", "visible_shadow"):
                setattr(obj, flag, False)
            self.fx_parts.append(rec)
        else:
            self.parts.append(rec)
        return obj

    def skin(self, bones, geo, fill=None, finish="cloth", team=False, far=False,
             line=H.INTERIOR_LINE_LU, line_hex=None, name=None, tip=None, stiff=0.0):
        """A mesh (built in character space) that bends with the joint chain `bones`
        (root first). `tip` is the chain's end point (character space); `stiff` in 0..1
        keeps the root region rigid for longer."""
        name = name or f"skin.{bones[0]}.{len(self.skinned)}"
        me = geo.mesh(f"{self.name}.{name}")
        yaw = Matrix.Rotation(self.yaw, 4, "Z")
        me.transform(yaw)                     # world rest (the root only carries the yaw)
        me.materials.append(self._material(fill, finish, team, None, far))
        obj = bpy.data.objects.new(f"{self.name}.{name}", me)
        self.coll.objects.link(obj)
        hull = None
        if line > 0:
            hull = self._hull(me, name, line, fill, team, line_hex, None)
        pts = [self.rest[b] for b in bones] + [Vector(tip)]
        rec = {"obj": obj, "hull": hull, "joint": bones[0], "team": team, "fx": False,
               "bones": bones}
        for key, mesh in (("w", me), ("wh", hull.data if hull else None)):
            if mesh is None:
                continue
            co = np.empty(len(mesh.vertices) * 3, np.float64)
            mesh.vertices.foreach_get("co", co)
            co = co.reshape(-1, 3)
            char = (np.array(yaw.inverted().to_3x3()) @ co.T).T
            rec[key] = _weights(char, pts, stiff)
            rec[key + "_rest"] = np.concatenate([co, np.ones((len(co), 1))], 1)
        self.parts.append(rec)
        self.skinned.append(rec)
        return obj

    def chain(self, names, parent, points, max_deg=25.0, gain=1.0, hz=1.8, damping=0.35,
              rot_gain=1.0):
        """A chain of secondary joints through `points` (character space; len(names) + 1
        points, the last one is the tip). Returns the joint names."""
        prev = parent
        for i, nm in enumerate(names):
            self.secondary(nm, prev, points[i], points[i + 1], max_deg=max_deg * (1 + 0.25 * i),
                           gain=gain, rot_gain=rot_gain)
            self.secondaries[nm].update(hz=hz, damping=damping)
            self.chain_order.append(nm)
            prev = nm
        return names

    # -- posing -----------------------------------------------------------------------------
    def finish_build(self):
        super().apply({})
        bpy.context.view_layer.update()
        self._rest_inv = {n: e.matrix_world.inverted() for n, e in self.joints.items()}
        for rec in self.fx_parts:
            rec["obj"].hide_render = True

    def apply(self, pose):
        super().apply(pose)
        for rec in self.fx_parts:
            j = rec["joint"]
            alpha = 1.0
            for k in self._chain(j):
                alpha *= pose.get(k, {}).get("alpha", 1.0)
            rec["obj"].hide_render = j in self._hidden or alpha < 0.02
            rec["obj"].color = (1, 1, 1, alpha)
        if self.skinned and self._rest_inv is not None:
            bpy.context.view_layer.update()
            for rec in self.skinned:
                mats = [np.array(self.joints[b].matrix_world @ self._rest_inv[b]) for b in rec["bones"]]
                for key, obj in (("w", rec["obj"]), ("wh", rec["hull"])):
                    if obj is None:
                        continue
                    rest, w = rec[key + "_rest"], rec[key]
                    out = np.zeros((len(rest), 3))
                    for k, Mx in enumerate(mats):
                        out += w[:, k:k + 1] * (rest @ Mx.T)[:, :3]
                    obj.data.vertices.foreach_set("co", out.ravel())
                    obj.data.update()

    def set_pass(self, team_pass, fx_pass=False):
        """base: unit (team surfaces as holdout); team: team parts only; fx: fx parts only."""
        super().set_pass(team_pass and not fx_pass)
        if fx_pass:
            for part in self.parts:
                for o in (part["obj"], part["hull"]):
                    if o is not None:
                        o.visible_camera = False
        for rec in self.fx_parts:
            rec["obj"].visible_camera = fx_pass

    def has_visible_fx(self):
        return any(not r["obj"].hide_render for r in self.fx_parts)


def _weights(char, pts, stiff):
    """Hat-function weights of each vertex over the chain's bones (bone i spans pts[i] ->
    pts[i+1]); the vertex's position along the chain comes from its nearest segment."""
    n = len(pts) - 1
    P = np.array([[p.x, p.y, p.z] for p in pts])
    best = np.full(len(char), np.inf)
    s = np.zeros(len(char))
    for i in range(n):
        a, b = P[i], P[i + 1]
        ab = b - a
        L2 = max(1e-9, ab @ ab)
        # distance in the side plane (x, z): the chain is authored in profile
        u = np.clip(((char - a) * ab).sum(1) / L2, 0.0, 1.0)
        proj = a + u[:, None] * ab
        d = np.hypot(char[:, 0] - proj[:, 0], char[:, 2] - proj[:, 2])
        better = d < best - 1e-9
        best = np.where(better, d, best)
        s = np.where(better, i + u, s)
    if stiff > 0:
        s = np.where(s < stiff, 0.0, (s - stiff) * n / max(1e-6, n - stiff))
    w = np.zeros((len(char), n))
    for i in range(n):
        c = i + 0.5
        w[:, i] = np.maximum(0.0, 1.0 - np.abs(s - c))
    w[s <= 0.5, 0] = 1.0
    w[s >= n - 0.5, n - 1] = 1.0
    w /= np.maximum(1e-9, w.sum(1, keepdims=True))
    return w
