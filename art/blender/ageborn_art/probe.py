"""Per-frame measurements of a posed rig that the game needs besides pixels (queue items 40, 44 and
item 38 B0): damage spots, the torso box and head point, the drawn weapon's angle, and (for the
anchors-only self-check) the silhouette box.

`render.render_clips` creates one `Probe` per unit and calls it on every unique frame right where it
reads the trackers, so a render and the anchors-only mode (`art/blender/anchors_only.py`, which runs
the same setup and stops before Cycles) measure the same poses with the same code.

Screen coordinates are lu from the feet, x right in the facing direction, y up, like `anchorsLu`: the
camera is orthographic, so a world point p lands at (p.x, p.y sin e + p.z cos e) with e the camera's
16 degree tilt (`scene.camera` puts the character origin on the feet pixel).

A spot frame is [x, y, rotDeg, scalePct, visPct]:
  x, y      the spot's centre (0.1 lu)
  rotDeg    the spot's in-plane turn since the rest pose, counter-clockwise on screen positive (1 deg)
  scalePct  how big a patch of the surface looks against the rest pose (100): the square root of the ratio
            of a unit patch's projected areas, so foreshortening and the joint's squash and stretch together;
            the spot's `r` is its size at rest
  visPct    0 when the spot's part is hidden, else for a mark 0 when its surface is turned away and otherwise
            the share of five camera rays (the centre and four points half a radius out) that reach the
            spot's surface; a strip's rays without the facing test (it hangs free); an emitter 100 (its
            puffs float in front of the body)
"""
import math

import bpy
import numpy as np
from mathutils import Matrix, Vector
from mathutils.bvhtree import BVHTree

from . import config as C

RAYS = 5   # visibility rays per spot and frame: the centre and four points half a radius out


# -- body trackers ------------------------------------------------------------------------------------
# Joint names tried in order when a script does not call rig.body_trackers: the first one with parts.
# Bipeds add their hips to the torso. Riders and mounts take the mount's barrel and head (COMMON C1).
TORSO_NAMES = ("torso", "trunk", "chest", "horse", "hull", "plane", "pod", "orb")
HEAD_NAMES = ("hhead", "head", "nh", "c_head", "p_head", "crew_head", "cmdr", "pilot", "driver", "eyes")
# rigs the names above do not cover (or cover wrongly); a script's own rig.body_trackers call wins
BODY = {
    # a mount's barrel and head, not the rider's (riders on a bear, a bike)
    "ursa_paladin": {"torso": "bear", "head": "bhead"},
    "dispatch_rider": {"torso": "bike", "head": "head"},
    "hover_bike": {"torso": "bike", "head": "head"},
    # a cart is the body (the crew stands beside it; a chariot's horse leads with its head)
    "war_chariot": {"torso": "cart", "head": "hhead"},
    "bronze_cannon": {"torso": "cart", "head": "head"},
    "scorpion": {"torso": "cart", "head": "head"},
    # a balloon's body is its envelope
    "balloon_admiral": {"torso": "envelope", "head": "head"},
    # the battering ram's crew: the head peeking over the roof
    "battering_ram": {"torso": "hull", "head": "peek"},
    # the hydra's three heads: the middle neck's head leads
    "hydra": {"torso": "trunk", "head": "nbh"},
    # the dreadnought's front gunner
    "land_dreadnought": {"torso": "hull", "head": "g0"},
    # the belfry's front archer
    "siege_belfry": {"torso": "hull", "head": "archer0"},
}


def _own_parts(rig, joints):
    return [p for p in rig.parts if p["joint"] in joints]


def _subtree(rig, joint):
    out = []
    for name in rig.joints:
        j = name
        while j is not None:
            if j == joint:
                out.append(name)
                break
            if j in rig.hidden_by_default:
                break
            j = rig.parent_of[j]
    return [j for j in out if j not in rig.hidden_by_default]


def resolve_body(rig, slug=None, required=True):
    """{"torso": spec, "head": spec} with each spec ("joints", [names]) or ("box"/"point", joint, values);
    None for a rig without a body (a turret, a fort, a shared effect) when not `required`."""
    spec = rig.body or BODY.get(slug or rig.name)

    def norm(v, what):
        if isinstance(v, str):
            return ("joints", [v])
        if isinstance(v, (list, tuple)) and len(v) == 2 and isinstance(v[0], str) and isinstance(v[1], (list, tuple)):
            vals = tuple(float(a) for a in v[1])
            if len(vals) == 4:
                return ("box", v[0], vals)
            if len(vals) == 2:
                return ("point", v[0], vals)
            raise ValueError(f"{rig.name}: body tracker {what} {v!r}: a box has 4 numbers, a point 2")
        if isinstance(v, (list, tuple)) and all(isinstance(a, str) for a in v):
            return ("joints", list(v))
        raise ValueError(f"{rig.name}: body tracker {what} {v!r} is not a joint, a joint list or (joint, box/point)")

    with_parts = {p["joint"] for p in rig.parts if p["joint"] not in rig.hidden_by_default}
    if spec:
        out = {k: norm(spec[k], k) for k in ("torso", "head")}
    else:
        out = {}
        for name in TORSO_NAMES:
            if name in with_parts:
                js = [name] + (["hips"] if name == "torso" and "hips" in with_parts else [])
                out["torso"] = ("joints", js)
                break
        for name in HEAD_NAMES:
            if name in with_parts:
                out["head"] = ("joints", [name])
                break
    if not required and ("torso" not in out or "head" not in out):
        return None
    for k in ("torso", "head"):
        if k not in out:
            raise ValueError(f"{rig.name}: no {k} joint found ({'/'.join(TORSO_NAMES if k == 'torso' else HEAD_NAMES)}); "
                             f"call rig.body_trackers(torso, head) in build() or add it to probe.BODY")
        s = out[k]
        for j in (s[1] if s[0] == "joints" else [s[1]]):
            if j not in rig.joints:
                raise ValueError(f"{rig.name}: body tracker {k} names an unknown joint {j!r}")
    return out


# -- screen projection ----------------------------------------------------------------------------------
def _basis():
    e = math.radians(C.CAMERA_ELEVATION_DEG)
    view = Vector((0.0, math.cos(e), -math.sin(e)))   # camera forward (world)
    up = Vector((0.0, math.sin(e), math.cos(e)))
    return view, up, math.sin(e), math.cos(e)


def _scr(v, se, ce):
    """A world vector or point (relative to the feet) on screen: (x, y up) in lu."""
    return v[0], v[1] * se + v[2] * ce


def _r1(v):
    return round(float(v) + 0.0, 1) + 0.0  # + 0.0 turns -0.0 into 0.0


def _wrap(deg):
    return (deg + 180.0) % 360.0 - 180.0


# -- damage_spot_at: the surface under a side-view point ------------------------------------------------
def _fill_of(part):
    """A part's palette fill ("#RRGGBB"), "team" or "glow"."""
    if part["team"]:
        return "team"
    m = part["obj"].data.materials[0].name if part["obj"].data.materials else ""
    if m.startswith("glow_"):
        return "glow"
    return m.split("_")[1][:7].upper() if m.startswith("toon_") else m


def surface_point(rig, joint, x, z, on=None, team=False, fill=None):
    """(pos, normal) in the joint's authoring space (`pos - rest[joint]` is the empty's location, as
    `rig.track` does) of the surface the camera sees at side-view (x, z) on the joint's parts at rest.
    The nearest part hit must be a team part for a team spot and not one otherwise, and have the palette
    `fill` when one is given (so a mark meant for a sash or a quiver never lands on the skin beside it)."""
    joints = [joint] if on is None else ([on] if isinstance(on, str) else list(on))
    rig.apply({})
    bpy.context.view_layer.update()
    view, _, _, _ = _basis()
    yaw = Matrix.Rotation(rig.yaw, 4, "Z")
    target = yaw @ Vector((x, 0.0, z))
    origin = target - view * 400.0
    best = None
    for p in rig.parts:
        if p["joint"] not in joints:
            continue
        o = p["obj"]
        M = o.matrix_world
        tree = BVHTree.FromPolygons([M @ v.co for v in o.data.vertices], [list(f.vertices) for f in o.data.polygons])
        loc, nrm, _, dist = tree.ray_cast(origin, view, 1000.0)
        if loc is not None and (best is None or dist < best[2]):
            best = (loc, nrm, dist, p)
    if best is None:
        raise ValueError(f"{rig.name}: damage_spot_at({joint!r}, {x}, {z}) misses the joint's parts")
    loc, nrm, _, part = best
    got = _fill_of(part)
    if (got == "team") != bool(team) or (fill is not None and got != fill.upper()):
        want = fill.upper() if fill else ("team" if team else "a non-team part")
        raise ValueError(f"{rig.name}: damage_spot_at({joint!r}, {x}, {z}) sees {got} ({part['obj'].name}), "
                         f"not {want}")
    if nrm.dot(view) > 0:   # the polygon's winding faces away: take the side toward the camera
        nrm = -nrm
    J = rig.joints[joint].matrix_world
    local = J.inverted_safe() @ loc
    n_local = (J.to_3x3().transposed() @ nrm).normalized()
    # back to authoring space (the space `damage_spot` takes, like `track`): local + rest[joint]
    return tuple(local + rig.rest[joint]), tuple(n_local)


# -- the probe -----------------------------------------------------------------------------------------
def for_clips(rig, clips, feet_px, boxes=False):
    """The probe `render.render_clips` measures a unit with: its spots, its body trackers and the weapon
    axes of its shot clips (aimdata.py)."""
    from . import aimdata
    return Probe(rig, feet_px, boxes=boxes, aims=aimdata.axes_for(rig, clips))


class Probe:
    """Measures every unique frame of every clip as `render_clips` poses it.

    data[clip] = {"spots": {id: [frame, ...]}, "torso": [...], "head": [...], "axis": [deg, ...] or None,
    "box": [...] (silhouette, only with `boxes=True`)}; frames are unique frames (indexed like anchorsLu).
    `axis` is the screen angle of the clip's weapon axis (`aims`: {clip: (joint, local axis)}, aimdata.py)."""

    def __init__(self, rig, feet_px, boxes=False, aims=None):
        self.rig = rig
        self.feet_px = feet_px
        r = bpy.context.scene.render
        self.canvas = (r.resolution_x, r.resolution_y)
        self.boxes = boxes
        self.view, self.up, self.se, self.ce = _basis()
        # world renders (turrets, forts, bases) and shared effects run through render_clips too: no body
        self.body = resolve_body(rig, required=False)
        self.aims = dict(aims or {})
        self.data = {}
        self._geo = {}
        # ray hits name the object (scene.ray_cast may hand back the evaluated copy): parts by name
        self._parts_by_name = {p["obj"].name: p for p in rig.parts}
        self._spot_rest = {}
        if rig.damage_spots:
            rig.apply({})
            bpy.context.view_layer.update()
            for name, s in rig.damage_spots.items():
                v = self._spot_frame_vectors(s)
                self._spot_rest[name] = (v[1], max(v[2], 1e-3))

    # geometry ----------------------------------------------------------------------------------------
    def _verts(self, obj):
        v = self._geo.get(obj)
        if v is None:
            me = obj.data
            v = np.empty(len(me.vertices) * 3, dtype=np.float64)
            me.vertices.foreach_get("co", v)
            v = v.reshape(-1, 3)
            self._geo[obj] = v
        return v

    def _screen_box(self, objs, clip=None):
        """The screen box of the objects' vertices; with `clip` (a screen rect), each object is cut to it
        and one wholly outside adds nothing (it is not drawn: the canvas ends there)."""
        lo_x = lo_y = math.inf
        hi_x = hi_y = -math.inf
        for o in objs:
            v = self._verts(o)
            if not len(v):
                continue
            M = np.array(o.matrix_world)
            w = v @ M[:3, :3].T + M[:3, 3]
            sx = w[:, 0]
            sy = w[:, 1] * self.se + w[:, 2] * self.ce
            b = [sx.min(), sy.min(), sx.max(), sy.max()]
            if clip is not None:
                b = [max(b[0], clip[0]), max(b[1], clip[1]), min(b[2], clip[2]), min(b[3], clip[3])]
                if b[0] > b[2] or b[1] > b[3]:
                    continue
            lo_x, lo_y, hi_x, hi_y = min(lo_x, b[0]), min(lo_y, b[1]), max(hi_x, b[2]), max(hi_y, b[3])
        if lo_x == math.inf:
            return None
        return [lo_x, lo_y, hi_x, hi_y]

    def canvas_lu(self):
        """The render canvas as a screen rect in lu from the feet."""
        k = C.PX_PER_LU
        (W, H), (fx, fy) = self.canvas, self.feet_px
        return [-fx / k, (fy - H) / k, (W - fx) / k, fy / k]

    def _point(self, joint, x, y, z):
        p = self.rig.joints[joint].matrix_world @ (Vector((x, y, z)) - self.rig.rest[joint])
        return _scr(p, self.se, self.ce)

    def _body_box(self, spec):
        kind = spec[0]
        if kind == "joints":
            parts = _own_parts(self.rig, spec[1])
            if not parts:
                parts = _own_parts(self.rig, [j for jj in spec[1] for j in _subtree(self.rig, jj)])
            return self._screen_box([p["obj"] for p in parts])
        if kind == "box":
            x0, z0, x1, z1 = spec[2]
            pts = [self._point(spec[1], x, 0.0, z) for x, z in ((x0, z0), (x1, z0), (x0, z1), (x1, z1))]
            return [min(p[0] for p in pts), min(p[1] for p in pts), max(p[0] for p in pts), max(p[1] for p in pts)]
        x, z = spec[2]
        p = self._point(spec[1], x, 0.0, z)
        return [p[0], p[1], p[0], p[1]]

    # spots -------------------------------------------------------------------------------------------
    def _spot_frame_vectors(self, s):
        """World centre, the screen angle of the spot's tangent, the screen area of a unit patch, the
        world normal and the world tangents."""
        e = s["empty"]
        J = self.rig.joints[s["joint"]].matrix_world
        M3 = J.to_3x3()
        n = s["normal"]
        ref = Vector((1.0, 0.0, 0.0)) if abs(n.x) < 0.9 else Vector((0.0, 0.0, 1.0))
        t1 = (ref - n * ref.dot(n)).normalized()
        t2 = n.cross(t1)
        w1, w2 = M3 @ t1, M3 @ t2
        nw = (M3.inverted_safe().transposed() @ n).normalized()
        a1, a2 = _scr(w1, self.se, self.ce), _scr(w2, self.se, self.ce)
        area = abs(a1[0] * a2[1] - a1[1] * a2[0])
        return e.matrix_world.translation.copy(), math.degrees(math.atan2(a1[1], a1[0])), area, nw, w1, w2

    def _reaches(self, s, target, depsgraph):
        scene = bpy.context.scene
        origin = target - self.view * 600.0
        want = (target - origin).length
        tol = max(1.5, 0.5 * s["radius"])
        o = origin
        left = 1200.0
        for _ in range(24):
            ok, loc, _, _, obj, _ = scene.ray_cast(depsgraph, o, self.view, distance=left)
            if not ok:
                return False
            part = self._parts_by_name.get(obj.name) if obj is not None else None
            if part is not None and not part["obj"].hide_render:
                return part["joint"] in s["on"] or (loc - origin).length >= want - tol
            step = (loc - o).length + 1e-3
            o = loc + self.view * 1e-3
            left -= step
            if left <= 0:
                return False
        return False

    def _spot(self, name, s, depsgraph):
        rig = self.rig
        c, ang, area, nw, w1, w2 = self._spot_frame_vectors(s)
        x, y = _scr(c, self.se, self.ce)
        ang0, area0 = self._spot_rest[name]
        rot = int(round(_wrap(ang - ang0)))
        scale = int(round(100.0 * math.sqrt(area / area0)))
        hidden = s["joint"] in rig._hidden
        if not hidden:
            alpha = 1.0
            j = s["joint"]
            # the joint's parts fade with the alpha of its chain (rig.apply); a faded part shows no mark
            for p in rig.parts:
                if p["joint"] == j:
                    alpha = p["obj"].color[3]
                    break
            hidden = alpha < 0.5
        vis = 0
        if not hidden and s["kind"] == "emit":
            vis = 100
        elif not hidden and (s["kind"] == "strip" or nw.dot(self.view) < -0.05):
            r = 0.5 * s["radius"]
            u1 = w1.normalized() * r
            u2 = w2.normalized() * r
            hits = sum(self._reaches(s, c + d, depsgraph) for d in (Vector(), u1, -u1, u2, -u2))
            vis = int(round(100.0 * hits / RAYS))
        return [_r1(x), _r1(y), rot + 0, scale, vis]

    # frames ------------------------------------------------------------------------------------------
    def _clip(self, clip):
        d = self.data.get(clip.name)
        if d is None:
            n = clip.frames
            d = {"spots": {k: [None] * n for k in self.rig.damage_spots}, "torso": [None] * n, "head": [None] * n,
                 "axis": [None] * n if clip.name in self.aims else None}
            if self.boxes:
                d["box"] = [None] * n    # the rig's parts and interior-line hulls (the outline goes round it)
                d["xbox"] = [None] * n   # the smear ribbon and the 2D accents (no outline)
            self.data[clip.name] = d
        return d

    def measure(self, clip, i):
        """The posed frame `i` of `clip` (the rig is posed and the view layer updated)."""
        d = self._clip(clip)
        rig = self.rig
        if rig.damage_spots:
            depsgraph = bpy.context.evaluated_depsgraph_get()
            for name, s in rig.damage_spots.items():
                d["spots"][name][i] = self._spot(name, s, depsgraph)
        if self.body is not None:
            t = self._body_box(self.body["torso"])
            d["torso"][i] = [_r1(t[0]), _r1(t[1]), _r1(t[2]), _r1(t[3])] if t else None
            h = self._body_box(self.body["head"])
            d["head"][i] = [_r1((h[0] + h[2]) / 2), _r1((h[1] + h[3]) / 2)] if h else None
        if d["axis"] is not None:
            joint, axis = self.aims[clip.name]
            v = rig.joints[joint].matrix_world.to_3x3() @ Vector(axis)
            ax, ay = _scr(v, self.se, self.ce)
            d["axis"][i] = math.degrees(math.atan2(ay, ax))
        if self.boxes:
            objs = []
            for p in rig.parts:
                for o in (p["obj"], p["hull"]):
                    if o is not None and not o.hide_render:
                        objs.append(o)
            d["box"][i] = self._screen_box(objs, clip=self.canvas_lu())

    def add_box(self, clip, i, box):
        """Widens frame i's accent box (a smear ribbon, a 2D accent: drawn without an outline)."""
        d = self._clip(clip)
        if not self.boxes or box is None:
            return
        b = d["xbox"][i]
        d["xbox"][i] = list(box) if b is None else [min(b[0], box[0]), min(b[1], box[1]), max(b[2], box[2]), max(b[3], box[3])]

    def _axis_now(self, clip, src, k):
        return None

    def object_box(self, obj):
        return self._screen_box([obj])

    def copy(self, clip, i, src, k):
        """Frame i of `clip` reuses frame k of clip `src` (ANIM_SPEC P3): the same pixels, the same data."""
        d = self._clip(clip)
        s = self.data.get(src)
        for name in d["spots"]:
            d["spots"][name][i] = list(s["spots"][name][k]) if s and s["spots"][name][k] else None
        for key in ("torso", "head"):
            d[key][i] = list(s[key][k]) if s and s[key][k] else None
        if d["axis"] is not None:
            # a reused frame shows the source clip's pose: its weapon points where the source's did
            d["axis"][i] = s["axis"][k] if s and s["axis"] is not None else self._axis_now(clip, src, k)
        if self.boxes:
            for key in ("box", "xbox"):
                d[key][i] = list(s[key][k]) if s and s.get(key) and s[key][k] else None
