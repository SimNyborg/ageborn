"""Forts (DESIGN A16.14, the stationary class), realistic style: the shared kit.

A fort is a module-like object for `lib/game.py` (rendered like a unit: a 2x `.hd` sheet at 2.46 px/lu
and a 1x sheet at 1.23 px/lu), installed by `forts/run.py` into `public/art/forts/<age>/<slug>.*`.
The game draws it with `src/visuals/forts/atlasFortView.ts`; the simulation owns all timing, so the
art never changes balance.

Sheet contract (one canvas and one feet anchor for every clip, so overlays line up):

  body      4 frames  the fort at crumble stage 0-3 (intact, 66%, 33%, 12% HP); no flag, door or trap
  front     4 frames  towers with a crew: the parapet drawn OVER the crew (the crew stands between body
                      and front), per crumble stage
  scaffold  1 frame   the building scaffold alone (poles, lashings, a material pile); the game reveals the
                      body from the ground up behind it while the sim's 5 s scaffold runs
  rubble    1 frame   what stays on the ground after the collapse (the game fades it out)
  flag      6 frames  looping team banner on its pole (idle life; hidden above `flag.crumbleMax`)
  door      3 frames  camps only: the entrance closed, half open and open (the levy spawn pulse)
  trap      4 frames  traps only: unarmed (just placed), armed, sprung, spent

Objects carry a family (`grp`) and an inclusive frame range (`lo`..`hi`): an object shows in the clip of
its family on the frames inside its range. So a stake that breaks at stage 2 is two objects: the whole
stake (body 0-1) and the stump (body 2-3).

meta.ageborn adds: kind ('fort'), fortKind, age, material (debris: wood, stone, metal, energy),
flag {crumbleMax}, door {crumbleMax}, crew {visualId, x, y, scale} (towers with a crew: the age's
Ranged Common stands on the platform, drawn from its own unit sheet), muzzleLu (crewless towers),
lightsLu (flickering fire and lamps), smokeLu (chimneys and fire pits), footLu (the footprint half
width, for dust and debris).
"""
import math
import random
from types import SimpleNamespace

import bmesh
import bpy

from lib import core as C
from lib import game as G
from lib import mats as M

PX1 = 1.23
SCALE1 = 1.5

FAMILIES = ("body", "front", "scaffold", "rubble", "flag", "door", "trap")


# ------------------------------------------------------------------------------ groups
def grp(o, fam, lo=0, hi=9):
    o["grp"] = fam
    o["lo"] = lo
    o["hi"] = hi
    return o


def show(clip, frame):
    for o in bpy.context.scene.objects:
        g = o.get("grp")
        if g is None:
            continue
        o.hide_render = not (g == clip and o["lo"] <= frame <= o["hi"])


# ------------------------------------------------------------------------------ clips
def clips_for(kind, flag=True, front=False):
    out = []
    if kind != "trap":
        out.append(G.Clip("body", [1000] * 4))
        if front:
            out.append(G.Clip("front", [1000] * 4))
        out.append(G.Clip("scaffold", [1000]))
        out.append(G.Clip("rubble", [1000]))
    if flag:
        out.append(G.Clip("flag", [120] * 6, loop=True))
    if kind == "camp":
        out.append(G.Clip("door", [90, 90, 500]))
    if kind == "trap":
        out.append(G.Clip("trap", [1000] * 4))
    return out


# ------------------------------------------------------------------------------ the module factory
class Fort:
    """Collects a fort's parts. `build(f)` is called inside a fresh scene with `f.rig` ready."""

    def __init__(self, rig, m, yaw):
        self.rig = rig
        self.m = m
        self.yaw = yaw
        self.rnd = random.Random(7)

    def add(self, o, fam="body", lo=0, hi=9, bone="root", team=False):
        if team:
            C.team(o)
        self.rig.rigid(grp(o, fam, lo, hi), bone)
        return o

    def skin(self, o, bones, fam="flag", lo=0, hi=9, soft=4.0, team=False):
        if team:
            C.team(o)
        self.rig.skin(grp(o, fam, lo, hi), bones, soft=soft)
        return o

    def screen(self, p):
        """Screen lu (x right, y up, from the feet) of a character-space point."""
        a = math.radians(self.yaw)
        x = p[0] * math.cos(a) - p[1] * math.sin(a)
        y = p[0] * math.sin(a) + p[1] * math.cos(a)
        sx, sy = C.screen_lu((x, y, p[2]))
        return [round(sx, 1), round(sy, 1)]


def flag_bones(base, h, length=24.0, n=3, name="flag"):
    """Bones of a banner hanging from a pole top at `base` + h (char space), streaming toward -x."""
    bx, by, bz = base
    top = bz + h - 3.0
    out = {}
    prev = "root"
    seg = length / n
    for i in range(n):
        p0 = (bx - 1 - seg * i, by, top)
        p1 = (bx - 1 - seg * (i + 1), by, top)
        out[f"{name}{i}"] = (p0, p1, prev)
        prev = f"{name}{i}"
    return out


def make(slug, name, age, kind, build, *, canvas, feet, yaw, height, hit, material, flag=None, crew=None,
         muzzle=None, lights=None, smoke=None, foot=24.0, extra_meta=None, flag_len=24.0, flag_crumble=2,
         door_crumble=2, samples=None):
    """A fort module. `flag` = (x, y, z_base, pole height) in character space; `crew` = dict(visualId,
    at=(x, y, z) char-space platform point, scale); `muzzle` = char-space point (crewless towers);
    `lights` / `smoke` = [(x, y, z)] char-space points."""
    bones = {"root": ((0, 0, 0), (0, 0, 4), None)}
    if flag:
        bones.update(flag_bones(flag[:3], flag[3], flag_len))
    clips_ = clips_for(kind, flag=bool(flag), front=bool(crew))
    by_name = {c.name: c for c in clips_}

    def _build():
        m = mats(age)
        rig = C.Rig(slug + "_rig", bones, yaw_deg=yaw)
        f = Fort(rig, m, yaw)
        f.flag = flag
        f.flag_len = flag_len
        build(f)
        return dict(rig=rig, f=f)

    def _pose(ctx, clip, t):
        rig = ctx["rig"]
        rig.rest()
        c = by_name[clip]
        i = 0
        for k, ti in enumerate(c.times):
            if ti <= t + 1e-6:
                i = k
        show(clip, i)
        if clip == "flag" and flag:
            ph = 2 * math.pi * i / 6
            for k in range(3):
                a = ph - k * 1.2
                rig.set(f"flag{k}", r=math.radians(-5 * math.cos(a) - 3), rz=math.radians(15 * math.sin(a) * (0.55 if k == 0 else 1.0)))

    def screen(p):
        a = math.radians(yaw)
        x = p[0] * math.cos(a) - p[1] * math.sin(a)
        y = p[0] * math.sin(a) + p[1] * math.cos(a)
        sx, sy = C.screen_lu((x, y, p[2]))
        return [round(sx, 1), round(sy, 1)]

    meta = {"kind": "fort", "fortKind": kind, "age": age, "material": material, "footLu": foot}
    if flag:
        meta["flag"] = {"crumbleMax": flag_crumble}
    if kind == "camp":
        meta["door"] = {"crumbleMax": door_crumble}
    if crew:
        meta["crew"] = {"visualId": crew["visualId"], "x": screen(crew["at"])[0], "y": screen(crew["at"])[1],
                        "scale": crew.get("scale", 0.75)}
    if muzzle:
        meta["muzzleLu"] = screen(muzzle)
    if lights:
        meta["lightsLu"] = [dict(zip(("x", "y"), screen(p)), r=r, crumbleMax=cm) for p, r, cm in lights]
    if smoke:
        meta["smokeLu"] = [dict(zip(("x", "y"), screen(p)), crumbleMin=cm) for p, cm in smoke]
    if extra_meta:
        meta.update(extra_meta)
    hx, hy = hit
    ns = SimpleNamespace(
        SLUG=slug, FILE=slug, NAME=name, AGE=age, KIND="unit", FORT_KIND=kind, VISUAL_ID="fort." + slug,
        HEIGHT_LU=height, PX1=PX1, SCALE1=SCALE1, CANVAS=canvas, FEET=feet, YAW=yaw,
        ANCHORS={"head": (0, height), "hitCenter": (hx, hy), **({"muzzle": tuple(meta["muzzleLu"])} if muzzle else {})},
        TRACKERS={}, EXTRA_META=meta, build=_build, pose=_pose, clips=lambda: clips_, LREF=None,
        TEAM_GAMMA=2.0)
    if samples:
        ns.SAMPLES = samples
    return ns


# ------------------------------------------------------------------------------ materials per age
def mats(age):
    """Materials every fort of an age can use (the style guide's age palette)."""
    m = dict(
        rope=M.rope("#8c7a5c"), bark=M.bark(), wood=M.wood("#7a6450", "#5a4a3c", name="fwood"),
        wood_dk=M.wood("#5c4a3c", "#43372d", name="fwood_dk"), earth=C.mat("earth", "#6e5c48", rough=0.95, noise=0.25, nscale=0.5, bump=1.2, ramp2="#584a3a"),
        dirt=C.mat("dirt", "#7a6a55", rough=0.95, noise=0.28, nscale=0.9, bump=1.0, ramp2="#5e5242"),
        hole=M.dark("#1b1511", name="hole"), stone=M.stone("#948878", "#746a5e", name="fstone", bump=1.3),
        stone_dk=M.stone("#7a7064", "#5e564c", name="fstone_dk", bump=1.2), moss=M.moss("#5d7036"),
        bone=M.bone(), hide=M.rawhide("#8f7a5c", name="fhide"), leather=M.leather("#4b3b30"),
        team=M.team_paint(), cloth=M.team_cloth(name="fcloth"), team_hide=M.team_hide(name="fteamhide"),
        straw=M.straw("#a8966c"), fire=M.glow("#ffb45a", 8.0, name="ffire"), fire_core=M.glow("#fff0c8", 14.0, name="ffirecore"),
        ember=M.glow("#ff8a3a", 3.0, name="fember"), ash=C.mat("ash", "#4a4440", rough=0.95, noise=0.2, bump=0.5),
    )
    if age in ("bronze", "medieval", "gunpowder", "industrial", "modern", "future", "cosmic"):
        m.update(
            linen=C.mat("linen", "#c8bba0", rough=0.85, noise=0.1, nscale=1.2, bump=0.4, sheen=0.4),
            canvas=C.mat("canvas", "#b8ad94", rough=0.9, noise=0.12, nscale=1.4, bump=0.5, sheen=0.3, ramp2="#9e947e"),
            bronze=C.mat("fbronze", "#8a6a3e", rough=0.35, metal=1.0, noise=0.2, nscale=1.6, bump=0.3, ramp2="#5f7a62"),
            brick=C.mat("mudbrick", "#a08466", rough=0.9, noise=0.2, nscale=0.6, bump=1.0, ramp2="#8a7058"),
            lime=M.stone("#c2b8a4", "#a89e8a", name="limestone_l", bump=1.1),
            steel=C.mat("fsteel", "#9aa0a8", rough=0.38, metal=1.0, noise=0.12, nscale=1.0, bump=0.2, ramp2="#7c828a"),
            iron=C.mat("firon", "#4a4a4c", rough=0.45, metal=1.0, noise=0.2, nscale=1.2, bump=0.35, ramp2="#3a3634"),
            rust=C.mat("rust", "#6a4a3a", rough=0.8, metal=0.3, noise=0.3, nscale=1.4, bump=0.6, ramp2="#4a3a32"),
            brass=C.mat("fbrass", "#a08850", rough=0.3, metal=1.0, noise=0.12, bump=0.2),
            wool=C.mat("fwool", "#7a6e5e", rough=0.9, noise=0.12, nscale=1.6, bump=0.6, sheen=0.5),
            sand=C.mat("sandbag", "#a89a7a", rough=0.95, noise=0.16, nscale=1.2, bump=0.8, sheen=0.3, ramp2="#8e8266"),
            concrete=C.mat("concrete", "#9a9690", rough=0.9, noise=0.16, nscale=0.6, bump=0.9, ramp2="#86827c"),
            gunmetal=C.mat("gunmetal", "#3c4047", rough=0.4, metal=1.0, noise=0.1, bump=0.2),
            olive=C.mat("olive", "#5e604a", rough=0.8, noise=0.12, nscale=1.0, bump=0.4),
            rubber=C.mat("rubber", "#2a2826", rough=0.7, noise=0.05, bump=0.1),
            alloy=C.mat("alloy", "#9aa0a8", rough=0.3, metal=1.0, noise=0.06, nscale=0.8, bump=0.08),
            suit=C.mat("suitpoly", "#3b3e45", rough=0.45, noise=0.05, bump=0.08, coat=0.3),
            ceramic=C.mat("ceramic", "#d8d6d0", rough=0.35, noise=0.05, nscale=0.6, bump=0.06, coat=0.5),
            darkalloy=C.mat("darkalloy", "#2a2c34", rough=0.35, metal=1.0, noise=0.08, bump=0.1),
            glow_mint=M.glow("#3af0b4", 6.0, name="glow_mint"), glow_cyan=M.glow("#7af0ff", 7.0, name="glow_cyan"),
            glow_lilac=M.glow("#c8a8ff", 6.0, name="glow_lilac"), glow_warm=M.glow("#ffe2a8", 6.0, name="glow_warm"),
            glass=C.mat("fglass", "#1c2228", rough=0.1, noise=0.02, bump=0.0, coat=1.0, spec=0.8),
            team_metal=C.mat("team_metal", "#999999", rough=0.45, metal=0.0, noise=0.08, nscale=0.8, bump=0.1, team=True),
            team_wool=C.mat("team_wool2", "#999999", rough=0.9, noise=0.1, nscale=1.2, bump=0.5, team=True, sheen=0.5),
        )
    return m


# ------------------------------------------------------------------------------ builders
def rock(name, c, size, mat, seed=0, sub=3, flat_top=None):
    """A weathered rock: displaced icosphere with angular facets."""
    bm = bmesh.new()
    bmesh.ops.create_icosphere(bm, subdivisions=sub, radius=1.0)
    o = C.from_bm(name, bm, mat, sharp_deg=34)
    C.xform(o, loc=c, scale=size)
    mx = max(size)
    t1 = bpy.data.textures.new(name + "_c", "CLOUDS")
    t1.noise_scale = mx * 0.55
    t1.noise_depth = 2
    d1 = o.modifiers.new("d1", "DISPLACE")
    d1.texture, d1.strength, d1.texture_coords = t1, mx * 0.35, "GLOBAL"
    t2 = bpy.data.textures.new(name + "_v", "VORONOI")
    t2.noise_scale = mx * 0.28
    t2.distance_metric = "DISTANCE"
    d2 = o.modifiers.new("d2", "DISPLACE")
    d2.texture, d2.strength, d2.texture_coords = t2, mx * 0.14, "GLOBAL"
    C.apply_mods(o)
    if flat_top is not None:
        for v in o.data.vertices:
            if v.co.z > flat_top:
                v.co.z = flat_top + (v.co.z - flat_top) * 0.1
    return o


def mound(name, c, axes, mat, disp=1.2):
    o = C.blobs(name, [(c, axes)], mat, res=1.0)
    C.displace(o, disp, 0.25)
    return o


def stake(name, base, top, r, mat, point=6.0, seg=10):
    """A sharpened log from `base` to `top` with a cone point."""
    bx, by, bz = base
    tx, ty, tz = top
    L = math.dist(base, top)
    u = ((tx - bx) / L, (ty - by) / L, (tz - bz) / L)
    k = (L - point) / L
    mid = (bx + (tx - bx) * k, by + (ty - by) * k, bz + (tz - bz) * k)
    return C.tube(name, [base, mid, top], [r, r * 0.96, 0.25], mat, seg=seg)


def broken(name, base, top, r, mat, frac, rnd, seg=10):
    """The stump of a stake snapped at `frac` of its length, with a jagged top."""
    bx, by, bz = base
    tx, ty, tz = top
    p = (bx + (tx - bx) * frac, by + (ty - by) * frac, bz + (tz - bz) * frac)
    pts = [base, p, (p[0] + rnd.uniform(-1.2, 1.2), p[1] + rnd.uniform(-0.6, 0.6), p[2] + r * 1.4)]
    return C.tube(name, pts, [r, r * 0.9, r * 0.35], mat, seg=seg, flat=0.8)


def lash(name, pts, mat, r=0.55):
    return C.tube(name, pts, [r] * len(pts), mat, seg=6)


def pole(name, a, b, mat, r=1.2, seg=8):
    return C.tube(name, [a, b], [r, r * 0.9], mat, seg=seg)


def plank(name, c, size, mat, rot=(0, 0, 0), bevel=0.25):
    return C.box(name, size[0], size[1], size[2], mat, bevel=bevel, loc=c, rot=rot)


def banner_cloth(f, mat, bones=("flag0", "flag1", "flag2"), width=9.0, fam="flag", lo=0, hi=9, pennant=False):
    """The team cloth hanging from the flag bones (a swallowtail pennant when `pennant`)."""
    x, y, z0, h = f.flag
    top = z0 + h - 3.0
    n = 5
    L = f.flag_len
    pts = [(x - 1 - L * i / (n - 1), y, top - 0.25 * i * i) for i in range(n)]
    widths = [width, width * 0.96, width * 0.9, width * 0.78, width * (0.3 if pennant else 0.6)]
    cl = C.tube("bannercloth", pts, widths, mat, seg=12, flat=0.14)
    # drop the cloth so it hangs below the pole top (tube is centred on the line)
    for v in cl.data.vertices:
        v.co.z -= width * 0.72
    return f.skin(cl, list(bones), fam=fam, lo=lo, hi=hi, soft=4.0, team=True)


def flag_pole(f, mat, fin_mat=None, r=1.1, fam="flag", lo=0, hi=9):
    x, y, z0, h = f.flag
    f.add(pole("flagpole", (x, y, z0), (x, y, z0 + h + 1.5), mat, r=r), fam, lo, hi)
    if fin_mat is not None:
        f.add(C.sphere("flagfin", r * 1.6, fin_mat, loc=(x, y, z0 + h + 2.4)), fam, lo, hi)


def scaffold_frame(f, x0, x1, y0, y1, h, mat, rope_mat, levels=2, ladder=True, pile=None, fam="scaffold"):
    """A lashed pole scaffold around a footprint: four standards, ledgers, a brace, a ladder, lashings."""
    rnd = random.Random(11)
    corners = [(x0, y0), (x1, y0), (x0, y1), (x1, y1)]
    for i, (x, y) in enumerate(corners):
        f.add(pole(f"std{i}", (x, y, 0), (x + rnd.uniform(-0.8, 0.8), y, h + rnd.uniform(-2, 3)), mat, r=1.0), fam)
    for lv in range(1, levels + 1):
        z = h * lv / (levels + 0.4)
        for (a, b) in (((x0, y0), (x1, y0)), ((x0, y1), (x1, y1)), ((x0, y0), (x0, y1)), ((x1, y0), (x1, y1))):
            f.add(pole(f"ledger{lv}", (a[0] - 2, a[1], z), (b[0] + 2, b[1], z + rnd.uniform(-0.6, 0.6)), mat, r=0.8), fam)
            for (px, py) in (a, b):
                f.add(lash("sl", [(px - 1.3, py - 1.3, z - 0.6), (px + 1.3, py - 1.3, z + 0.6)], rope_mat, r=0.45), fam)
        f.add(plank(f"board{lv}", ((x0 + x1) / 2, (y0 + y1) / 2, z + 1.0), (x1 - x0 + 3, (y1 - y0) * 0.5, 1.0), mat), fam)
    f.add(pole("brace", (x0, y0 - 0.5, 1), (x1, y0 - 0.5, h * 0.8), mat, r=0.75), fam)
    if ladder:
        lx = x0 - 6
        for s in (-1, 1):
            f.add(pole("rail", (lx - 4, y0 + s * 3, 0), (x0 + 1, y0 + s * 3, h * 0.82), mat, r=0.7), fam)
        for k in range(1, 7):
            t = k / 7
            f.add(pole("rung", (lx - 4 + (x0 + 5 - lx) * t, y0 - 3, h * 0.82 * t), (lx - 4 + (x0 + 5 - lx) * t, y0 + 3, h * 0.82 * t), mat, r=0.45), fam)
    if pile:
        pile(f, fam)
