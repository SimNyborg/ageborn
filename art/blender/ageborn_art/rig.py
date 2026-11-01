"""Part-based rig: joints are empties, parts are meshes parented to joints.

This mirrors the 2D cutout rigs of DESIGN A11 (biped, rider, ...) so clips read the
same way: every joint has a rest position in character space and a pose adds rotation,
offset and scale on top. Characters face +X; the root carries the 3/4 view yaw.

Pose channels per joint (all optional):
  r        rotation in the side plane, degrees, counter-clockwise on screen
           (for a right-facing unit: positive raises a forward-pointing arm)
  rx, rz   roll (toward/away from camera) and yaw, degrees
  x, y, z  offset in lu in the parent's space (x forward, z up)
  s        uniform scale; sx, sy, sz multiply on top (squash and stretch)
  alpha    fade the joint's parts (non-team materials only)
  show     True to reveal a joint that is hidden by default (muzzle flash, yell mouth)
  hide     True to hide a joint and everything under it for this frame

Secondary joints (plume, tail, pennant, hair, hem) get their rotation added per frame by
the follow-through spring (anim.follow_through, driven from render.py). Trackers are
points on a joint whose screen position is exported per frame (muzzle, lance tip).
"""
import math

import bpy
from mathutils import Matrix, Vector

from . import config as C
from . import materials
from .geometry import hull_mesh


class Rig:
    def __init__(self, name, yaw=C.CHARACTER_YAW_DEG):
        self.name = name
        self.coll = bpy.context.scene.collection
        self.joints, self.rest, self.parent_of = {}, {}, {}
        self.hidden_by_default = set()
        self.parts = []  # dicts: obj, hull, joint, team
        self.rest_scale = {}
        self.rest_offset = {}  # joint -> (x, y, z) lu added to its rest location in every pose
        self.secondaries = {}  # name -> {"tip": empty, "max": deg, "gain": g}
        self.trackers = {}     # name -> empty
        self._hidden = set()
        root = self._empty("root", None, (0, 0, 0))
        root.rotation_euler = (0.0, 0.0, math.radians(yaw))
        self.yaw = math.radians(yaw)

    def _empty(self, name, parent, pos):
        e = bpy.data.objects.new(f"{self.name}.{name}", None)
        e.empty_display_size = 2
        self.coll.objects.link(e)
        e.rotation_mode = "XYZ"
        self.joints[name] = e
        self.rest[name] = Vector(pos)
        self.parent_of[name] = parent
        if parent is not None:
            e.parent = self.joints[parent]
            e.location = Vector(pos) - self.rest[parent]
        return e

    def joint(self, name, parent, pos, hidden=False, scale=1.0):
        """Add a pivot at `pos` (character space, rest pose). `scale` is a rest scale about
        the pivot (e.g. the knight rides 1.2x relative to his horse)."""
        self._empty(name, parent, pos)
        if hidden:
            self.hidden_by_default.add(name)
        if scale != 1.0:
            self.rest_scale[name] = scale
        return name

    def secondary(self, name, parent, pos, tip, max_deg, gain=1.0, rot_gain=1.0):
        """A dangling joint driven by follow-through: pivot at `pos`, its part reaching to
        `tip` (both character space, rest pose). Swing is soft-limited to +-max_deg."""
        self.joint(name, parent, pos)
        e = bpy.data.objects.new(f"{self.name}.{name}.tip", None)
        self.coll.objects.link(e)
        e.parent = self.joints[name]
        e.location = Vector(tip) - self.rest[name]
        self.secondaries[name] = {"tip": e, "max": max_deg, "gain": gain, "rot_gain": rot_gain}
        return name

    def track(self, name, joint, pos):
        """A point on `joint` (character space, rest pose) whose position is exported."""
        e = bpy.data.objects.new(f"{self.name}.track.{name}", None)
        self.coll.objects.link(e)
        e.parent = self.joints[joint]
        e.location = Vector(pos) - self.rest[joint]
        self.trackers[name] = e
        return e

    # -- queries (after apply + view_layer.update) -----------------------------------------
    def char_matrix(self, obj):
        """obj's matrix in character space (root space without the view yaw)."""
        return Matrix.Rotation(-self.yaw, 4, "Z") @ obj.matrix_world  # root sits at the origin

    def side_angle(self, joint):
        """Side-plane angle (deg, counter-clockwise on screen) of a joint's local +X."""
        m = self.char_matrix(self.joints[joint])
        return math.degrees(math.atan2(m[2][0], m[0][0]))

    def char_pos(self, obj):
        return self.char_matrix(obj).translation

    def part(self, joint, geo, fill=None, team=False, glow=None, outline=C.OUTLINE_LU,
             outline_hex=None, highlight=True, finish="matte", name=None):
        """Attach geometry built in character space to `joint`.
        fill: palette hex for a cel-shaded part; team=True for a team-coloured part;
        glow: hex for an unshaded emissive part. outline: hull thickness in lu (0 = none)."""
        name = name or f"{joint}.{len(self.parts)}"
        outline = min(outline, C.OUTLINE_LU)  # interior lines only; the outer line is 2D
        me = geo.mesh(f"{self.name}.{name}")
        me.transform(Matrix.Translation(-self.rest[joint]))
        if team:
            mat = materials.team()
        elif glow:
            mat = materials.glow(glow)
        else:
            mat = materials.toon(fill, highlight, finish)
        me.materials.append(mat)
        obj = bpy.data.objects.new(f"{self.name}.{name}", me)
        self.coll.objects.link(obj)
        obj.parent = self.joints[joint]
        hull = None
        if outline > 0:
            hme = hull_mesh(me, outline, f"{self.name}.{name}.hull")
            # outline_hex overrides the colour the interior line is derived from.
            hmat = (materials.outline(team_part=True) if team
                    else materials.outline(outline_hex or fill or glow))
            hme.materials.append(hmat)
            hull = bpy.data.objects.new(f"{self.name}.{name}.hull", hme)
            # the hull is only for the camera: AO and other rays must ignore it
            for flag in ("visible_diffuse", "visible_glossy", "visible_shadow",
                         "visible_transmission", "visible_volume_scatter"):
                setattr(hull, flag, False)
            self.coll.objects.link(hull)
            hull.parent = self.joints[joint]
        self.parts.append({"obj": obj, "hull": hull, "joint": joint, "team": team})
        return obj

    # -- posing ------------------------------------------------------------------------
    def _chain(self, j):
        while j is not None:
            yield j
            j = self.parent_of[j]

    def apply(self, pose):
        """Reset every joint to rest, then apply `pose` = {joint: {channel: value}}."""
        for name, e in self.joints.items():
            p = self.parent_of[name]
            e.location = self.rest[name] - (self.rest[p] if p else Vector())
            if name in self.rest_offset:
                e.location = e.location + Vector(self.rest_offset[name])
            e.rotation_euler = (0.0, 0.0, self.yaw if name == "root" else 0.0)
            rs = self.rest_scale.get(name, 1.0)
            e.scale = (rs, rs, rs)
        for name, ch in pose.items():
            if name not in self.joints:
                continue
            e = self.joints[name]
            e.location = e.location + Vector((ch.get("x", 0.0), ch.get("y", 0.0), ch.get("z", 0.0)))
            rx, ry, rz = e.rotation_euler
            e.rotation_euler = (rx + math.radians(ch.get("rx", 0.0)),
                                ry - math.radians(ch.get("r", 0.0)),
                                rz + math.radians(ch.get("rz", 0.0)))
            s = ch.get("s", 1.0) * self.rest_scale.get(name, 1.0)
            e.scale = (max(1e-3, s * ch.get("sx", 1.0)), max(1e-3, s * ch.get("sy", 1.0)),
                       max(1e-3, s * ch.get("sz", 1.0)))
        hidden = set()
        for name in self.joints:
            for j in self._chain(name):
                ch = pose.get(j, {})
                if (j in self.hidden_by_default and not ch.get("show")) or ch.get("hide") \
                        or ch.get("s", 1.0) < 0.02:
                    hidden.add(name)
                    break
        self._hidden = hidden
        for part in self.parts:
            j = part["joint"]
            alpha = 1.0
            for k in self._chain(j):
                alpha *= pose.get(k, {}).get("alpha", 1.0)
            for o in (part["obj"], part["hull"]):
                if o is None:
                    continue
                o.hide_render = j in hidden or alpha < 0.02
                o.color = (1, 1, 1, alpha)

    def set_pass(self, team_pass):
        """Base pass shows everything (team surfaces as holdout); the team pass shows only team
        parts to the camera, while other parts stay in the scene so AO matches the base pass."""
        materials.set_team_pass(team_pass)
        for part in self.parts:
            vis = part["joint"] not in self._hidden and part["obj"].color[3] >= 0.02
            to_camera = part["team"] or not team_pass
            for o in (part["obj"], part["hull"]):
                if o is not None:
                    o.hide_render = not vis
                    o.visible_camera = to_camera

    def has_visible_team(self):
        return any(p["team"] and p["joint"] not in self._hidden for p in self.parts)

    # -- damage spots and body trackers (queue item 40, item 38 B0; ageborn_art/probe.py) ------------
    # The pipeline writes each spot's per-frame position, rotation, scale and visibility, and every
    # unit's torso box and head point, into the age's damage bundle (public/art/damage/<age>.json).
    # None of this changes a rendered pixel: spots are empties, like trackers.
    @property
    def damage_spots(self):
        """name -> {"empty", "joint", "normal", "radius", "mat", "kind", "team", "on"} (insertion order)."""
        return self.__dict__.setdefault("_damage_spots", {})

    @property
    def body(self):
        """The body trackers set by `body_trackers` (None: the probe picks them by joint names)."""
        return self.__dict__.get("_body")

    def damage_spot(self, name, joint, pos, radius, mat, kind="mark", normal=(0, -1, 0), team=False,
                    on=None):
        """A damage spot on `joint` at `pos` (character space, rest pose, like `track`).

        radius: for a mark the radius of the surface patch (at least 5 lu; the drawn mark is 6-9 lu
        across and stays within about 70% of it), for a strip its longest hanging length, for an
        emitter the puff size. mat: a mark or strip's material (cloth, hide, metal, wood, stone, glass,
        energy) or an emitter's medium (smoke, steam, spark, breath, motes). normal: the surface's
        outward normal in character space at rest ((0, -1, 0) faces the camera). team: the spot sits on
        a team-coloured surface. on: joint name(s) whose parts count as the spot's surface when the
        visibility rays are cast (default: `joint`)."""
        from . import damage  # the bundle's vocabulary
        damage.check_spot(name, kind, mat, radius)
        if name in self.damage_spots:
            raise ValueError(f"damage spot {name!r} defined twice")
        e = bpy.data.objects.new(f"{self.name}.spot.{name}", None)
        self.coll.objects.link(e)
        e.parent = self.joints[joint]
        e.location = Vector(pos) - self.rest[joint]
        n = Vector(normal)
        if n.length < 1e-6:
            raise ValueError(f"damage spot {name!r}: zero normal")
        surface = [joint] if on is None else ([on] if isinstance(on, str) else list(on))
        self.damage_spots[name] = {"empty": e, "joint": joint, "normal": n.normalized(), "radius": float(radius),
                                   "mat": mat, "kind": kind, "team": bool(team), "on": surface}
        return e

    def damage_spot_at(self, name, joint, x, z, radius, mat, kind="mark", team=False, on=None, fill=None):
        """A damage spot where the camera sees `joint`'s surface at side-view position (x, z) of the rest
        pose (character space, x forward, z up): a camera ray is cast at the joint's own parts (as the
        face kit's decals are laid), and the spot sits on the hit with the surface's normal there. Call it
        at the end of `build()`, once every part exists. It raises when the ray misses the joint's parts or
        the part it sees is not what the spot says: a team part for `team=True`, a non-team part otherwise,
        and the palette colour `fill` ("#RRGGBB") when given (use it next to skin)."""
        from . import probe
        pos, normal = probe.surface_point(self, joint, x, z, on, team=team, fill=fill)
        return self.damage_spot(name, joint, pos, radius, mat, kind=kind, normal=normal, team=team, on=on)

    def body_trackers(self, torso, head):
        """The torso box and head point the pipeline writes per frame (item 38 B0), for rigs whose
        joint names the probe does not guess (riders, beasts, machines). Each is a joint name (its own
        parts' screen box; the head is that box's centre), a list of joint names (their union), or
        (joint, box) / (joint, point): an explicit side-view box (x0, z0, x1, z1) or point (x, z) in
        character space at rest, carried by the joint."""
        self.__dict__["_body"] = {"torso": torso, "head": head}
