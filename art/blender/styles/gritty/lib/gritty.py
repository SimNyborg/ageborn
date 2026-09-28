"""Gritty Epic style: shared setup, materials, follow-through chains and the unit pipeline.

Reuses the shared `ageborn_art` library read-only (rig, geometry, anim, render, sheet) and
swaps in its own look:

  * painterly 3-tone shading: a dramatic top-front key light (no side component, so mirrored
    opponents are lit identically), a noise-broken terminator (brush edge), deep cool shadows
    (fill x 0.42 turned toward slate blue), a warm light tone on the planes facing the key;
  * a cool back rim light on top and back edges (the "epic" edge that separates units from
    the backdrop);
  * weathering: large grime blotches, crevice occlusion and mud toward the feet;
  * metal: a fake environment reflection (bright sky band over a dark ground band with a
    hard horizon), a sharp specular and scratch specks;
  * a dark, warm near-black outer outline (2 px at 1x) and darker interior lines.

In-game size: infantry are about 62 px tall on an 844x390 phone, i.e. 0.912 px/lu. Frames are
rendered at 3x that (2.735 px/lu) and box-downsampled to the 1x sheet.
"""
import json
import math
import os
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
BLENDER_DIR = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
sys.path.insert(0, BLENDER_DIR)
sys.path.insert(0, os.path.abspath(os.path.join(HERE, "..")))
sys.dont_write_bytecode = True

import bpy  # noqa: E402
import numpy as np  # noqa: E402
from PIL import Image  # noqa: E402

from ageborn_art import config as C  # noqa: E402
from ageborn_art import materials as M  # noqa: E402
from ageborn_art import render, scene, sheet  # noqa: E402
from ageborn_art.colors import hex_to_rgb, mix, rgb_to_hex, to_linear  # noqa: E402
from ageborn_art.rig import Rig  # noqa: E402

# -- scale -------------------------------------------------------------------------------------
PX_PER_LU_GAME = 62.0 / 68.0          # 0.912 px/lu: infantry about 62 px on an 844x390 phone
HD = 3                                 # frames are rendered at 3x in-game size
PX_PER_LU = PX_PER_LU_GAME * HD        # 2.735 px/lu
C.set_render_scale(PX_PER_LU / C.PX_PER_LU_1X)
C.FILTER_WIDTH = 1.0
C.SAMPLES = int(os.environ.get("AGEBORN_SAMPLES", "16"))
C.OUTLINE_LU = 0.9                     # interior hull lines (cap applied by rig.part)
C.CAMERA_ELEVATION_DEG = 13.0
YAW_BIPED = -16.0
YAW_RIDER = -10.0

# outer outline: px at 1x, fill factor, max HSV value (dark, warm, near black)
OUTER = (2.0, 0.26, 0.17)
TEAM_LINE_GREY = 0.30
INNER_LINE = 0.34                      # interior line = fill x 0.34

# -- light -------------------------------------------------------------------------------------
def _n(v):
    l = math.sqrt(sum(c * c for c in v))
    return tuple(c / l for c in v)


KEY = _n((0.0, -0.40, 0.92))          # from above and in front (no x: mirror-safe)
RIM = _n((0.0, 0.80, 0.60))           # cool back light, from behind and above
SHADOW_TINT = "#2B3350"               # deep shadows turn toward slate blue
LIGHT_TINT = "#FFE9C4"                 # warm key light
RIM_COLOR = "#CFE0F5"

FINISH = {
    # shadow: value factor; cool: how far the shadow turns toward SHADOW_TINT;
    # light: how much the key-facing planes lift toward LIGHT_TINT; grime: blotch strength;
    # noise: brush edge jitter; rim: back rim strength
    "cloth":   dict(shadow=0.42, cool=0.28, light=0.22, grime=0.22, noise=0.34, rim=0.40),
    "skin":    dict(shadow=0.50, cool=0.20, light=0.28, grime=0.14, noise=0.22, rim=0.40),
    "leather": dict(shadow=0.40, cool=0.25, light=0.20, grime=0.25, noise=0.34, rim=0.35),
    "wood":    dict(shadow=0.40, cool=0.22, light=0.22, grime=0.30, noise=0.40, rim=0.35),
    "hair":    dict(shadow=0.38, cool=0.22, light=0.18, grime=0.10, noise=0.40, rim=0.50),
    "stone":   dict(shadow=0.40, cool=0.25, light=0.25, grime=0.35, noise=0.45, rim=0.35),
    "metal":   dict(shadow=0.45, cool=0.30, light=0.10, grime=0.20, noise=0.20, rim=0.55,
                    metal=True),
    "team":    dict(shadow=0.50, cool=0.0, light=0.0, grime=0.12, noise=0.30, rim=0.0, var=0.18),
}

# -- node helpers (reused from the shared materials module) -------------------------------------
_nodes, _smoothstep, _dot, _mix_rgb, _math = M._nodes, M._smoothstep, M._dot, M._mix_rgb, M._math
_emission, _mix_shader, _fade, _output = M._emission, M._mix_shader, M._fade, M._output


def _noise(nodes, links, scale, detail=2.0, coord="Object", seed=0.0):
    tc = nodes.new("ShaderNodeTexCoord")
    tex = nodes.new("ShaderNodeTexNoise")
    tex.noise_dimensions = "4D"
    tex.inputs["W"].default_value = seed
    tex.inputs["Scale"].default_value = scale
    tex.inputs["Detail"].default_value = detail
    tex.inputs["Roughness"].default_value = 0.55
    links.new(tc.outputs[coord], tex.inputs["Vector"])
    return tex.outputs["Fac"]


def _col(nodes, links, hex_or_socket):
    return hex_or_socket if isinstance(hex_or_socket, bpy.types.NodeSocket) else to_linear(hex_or_socket)


def _mul_col(nodes, links, col, fac):
    m = nodes.new("ShaderNodeMixRGB")
    m.blend_type = "MULTIPLY"
    m.inputs[0].default_value = 1.0
    links.new(col, m.inputs[1]) if isinstance(col, bpy.types.NodeSocket) else None
    if not isinstance(col, bpy.types.NodeSocket):
        m.inputs[1].default_value = col
    if isinstance(fac, bpy.types.NodeSocket):
        comb = nodes.new("ShaderNodeCombineColor")
        for k in ("Red", "Green", "Blue"):
            links.new(fac, comb.inputs[k])
        links.new(comb.outputs[0], m.inputs[2])
    else:
        m.inputs[2].default_value = (fac, fac, fac, 1.0)
    return m.outputs[0]


def _shade(nodes, links, fill_hex, finish, seed):
    """Returns (colour socket, masks) for the gritty painterly shading."""
    F = FINISH[finish]
    geo = nodes.new("ShaderNodeNewGeometry")
    N = geo.outputs["Normal"]
    ndl = _dot(nodes, links, N, KEY)
    brush = _noise(nodes, links, 0.16, 3.0, seed=seed)                 # brush-edge jitter
    blot = _noise(nodes, links, 0.11, 3.0, seed=seed + 3.1)            # grime blotches
    jit = _math(nodes, links, "MULTIPLY", _math(nodes, links, "SUBTRACT", brush, 0.5), F["noise"])
    ndl_p = _math(nodes, links, "ADD", ndl, jit)
    lit = _smoothstep(nodes, links, ndl_p, 0.54, 0.60)
    hi = _smoothstep(nodes, links, ndl_p, 0.84, 0.90)
    # three tones: deep cool shadow, fill, warm light
    from ageborn_art.colors import hsv
    import colorsys
    if finish == "team":
        dark = rgb_to_hex(tuple(c * F["shadow"] for c in hex_to_rgb(fill_hex)))
        light = fill_hex
    else:
        d = tuple(c * F["shadow"] for c in hex_to_rgb(fill_hex))
        dark = mix(rgb_to_hex(d), SHADOW_TINT, F["cool"])
        light = mix(fill_hex, LIGHT_TINT, F["light"])
        hh, ss, vv = colorsys.rgb_to_hsv(*hex_to_rgb(light))
        light = rgb_to_hex(colorsys.hsv_to_rgb(hh, ss, min(1.0, vv * 1.10)))
    col = _mix_rgb(nodes, links, lit, to_linear(dark), to_linear(fill_hex))
    col = _mix_rgb(nodes, links, hi, col, to_linear(light))
    stroke = _noise(nodes, links, 0.45, 1.0, seed=seed + 11.0)
    var = _math(nodes, links, "ADD", 1.0, _math(nodes, links, "MULTIPLY",
                _math(nodes, links, "SUBTRACT", stroke, 0.5), F.get("var", 0.30)))
    col = _mul_col(nodes, links, col, var)
    if F.get("metal"):
        # fake environment: reflect the view about the normal; sky above a hard horizon,
        # dark ground below; tinted by the metal fill
        refl = nodes.new("ShaderNodeVectorMath")
        refl.operation = "REFLECT"
        neg = nodes.new("ShaderNodeVectorMath")
        neg.operation = "SCALE"
        links.new(geo.outputs["Incoming"], neg.inputs[0])
        neg.inputs["Scale"].default_value = -1.0
        links.new(neg.outputs[0], refl.inputs[0])
        links.new(N, refl.inputs[1])
        sep = nodes.new("ShaderNodeSeparateXYZ")
        links.new(refl.outputs[0], sep.inputs[0])
        rz = _math(nodes, links, "ADD", sep.outputs["Z"],
                   _math(nodes, links, "MULTIPLY", _math(nodes, links, "SUBTRACT", brush, 0.5), 0.25))
        sky = _smoothstep(nodes, links, rz, -0.02, 0.06)
        sky_col = mix(fill_hex, "#E8EEF5", 0.45)
        gnd_col = mix(rgb_to_hex(tuple(c * 0.45 for c in hex_to_rgb(fill_hex))), "#3A2A20", 0.35)
        env = _mix_rgb(nodes, links, sky, to_linear(gnd_col), to_linear(sky_col))
        # key light still shapes the metal
        env = _mul_col(nodes, links, env, _math(nodes, links, "ADD", 0.55,
                                                _math(nodes, links, "MULTIPLY", lit, 0.45)))
        col = _mix_rgb(nodes, links, 0.65, col, env)
        spec = _smoothstep(nodes, links, _dot(nodes, links, refl.outputs[0], KEY), 0.93, 0.965)
        col = _mix_rgb(nodes, links, _math(nodes, links, "MULTIPLY", spec, 0.85), col,
                       to_linear("#FFF6E6"))
        # scratches: fine bright specks on lit metal
        scr = _smoothstep(nodes, links, _noise(nodes, links, 0.9, 1.0, seed=seed + 7.0), 0.66, 0.70)
        col = _mix_rgb(nodes, links, _math(nodes, links, "MULTIPLY", scr, 0.35), col,
                       to_linear(mix(fill_hex, "#FFFFFF", 0.6)))
    # grime: blotches, crevice occlusion and mud toward the feet
    ao = nodes.new("ShaderNodeAmbientOcclusion")
    ao.samples = 8
    ao.inputs["Distance"].default_value = 4.5
    occ = _math(nodes, links, "SUBTRACT", 1.0, ao.outputs["AO"])
    g_ao = _math(nodes, links, "MULTIPLY", occ, 0.55)
    g_blot = _math(nodes, links, "MULTIPLY", _smoothstep(nodes, links, blot, 0.48, 0.62), F["grime"] * 1.5)
    pos = nodes.new("ShaderNodeSeparateXYZ")
    links.new(geo.outputs["Position"], pos.inputs[0])
    mud = _math(nodes, links, "MULTIPLY",
                _smoothstep(nodes, links, _math(nodes, links, "SUBTRACT", 14.0, pos.outputs["Z"]), 0.0, 12.0),
                0.28 if finish != "team" else 0.12)
    dirt = _math(nodes, links, "MAXIMUM", _math(nodes, links, "ADD", g_ao, g_blot), mud)
    shade = _math(nodes, links, "SUBTRACT", 1.0, _math(nodes, links, "MINIMUM", dirt, 0.6))
    col = _mul_col(nodes, links, col, shade)
    # cool back rim on the top and back edges
    vm = nodes.new("ShaderNodeVectorMath")
    vm.operation = "DOT_PRODUCT"
    links.new(N, vm.inputs[0])
    links.new(geo.outputs["Incoming"], vm.inputs[1])
    facing = _math(nodes, links, "ABSOLUTE", vm.outputs["Value"])
    edge = _smoothstep(nodes, links, _math(nodes, links, "SUBTRACT", 1.0, facing), 0.30, 0.55)
    rimd = _smoothstep(nodes, links, _dot(nodes, links, N, RIM), 0.05, 0.35)
    rim = _math(nodes, links, "MULTIPLY", edge, rimd)
    if F["rim"] > 0:
        col = _mix_rgb(nodes, links, _math(nodes, links, "MULTIPLY", rim, F["rim"]), col,
                       to_linear(mix(fill_hex, RIM_COLOR, 0.75)))
    return col, {"rim": rim, "hi": hi}


_seed = [0.0]


def _next_seed():
    _seed[0] += 1.37
    return _seed[0]


def toon(fill_hex, highlight=True, finish="matte"):
    finish = {"matte": "cloth", "gloss": "leather", "hair": "hair"}.get(finish, finish)
    key = ("g", fill_hex, finish)
    if key not in M._cache:
        mat = bpy.data.materials.new(f"g_{fill_hex}_{finish}")
        nt, nodes, links = _nodes(mat)
        col, _ = _shade(nodes, links, fill_hex, finish, _next_seed())
        _output(nodes, links, _fade(nodes, links, _emission(nodes, links, col)))
        M._cache[key] = mat
    return M._cache[key]


def team():
    key = ("gteam",)
    if key not in M._cache:
        mat = bpy.data.materials.new("gteam")
        nt, nodes, links = _nodes(mat)
        switch = M._team_switch(nodes)
        col, masks = _shade(nodes, links, "#FFFFFF", "team", _next_seed())
        team_shader = _emission(nodes, links, col)
        overlay = _math(nodes, links, "MAXIMUM", _math(nodes, links, "MULTIPLY", masks["rim"], 0.35),
                        _math(nodes, links, "MULTIPLY", masks["hi"], 0.10))
        holdout = nodes.new("ShaderNodeHoldout").outputs[0]
        white = _emission(nodes, links, to_linear("#F4F0E6"))
        base_shader = _mix_shader(nodes, links, overlay, holdout, white)
        _output(nodes, links, _mix_shader(nodes, links, switch, base_shader, team_shader))
        M._cache[key] = mat
        M.TEAM_MATERIALS.append(mat)
    return M._cache[key]


def outline(fill_hex=None, team_part=False):
    key = ("goutline", fill_hex, team_part)
    if key not in M._cache:
        mat = bpy.data.materials.new(f"gout_{'team' if team_part else fill_hex}")
        nt, nodes, links = _nodes(mat)
        geo = nodes.new("ShaderNodeNewGeometry")
        transparent = nodes.new("ShaderNodeBsdfTransparent").outputs[0]
        if team_part:
            switch = M._team_switch(nodes)
            holdout = nodes.new("ShaderNodeHoldout").outputs[0]
            grey = _emission(nodes, links, to_linear(rgb_to_hex((INNER_LINE,) * 3)))
            line = _mix_shader(nodes, links, switch, holdout, grey)
            M.TEAM_MATERIALS.append(mat)
        else:
            c = mix(rgb_to_hex(tuple(v * INNER_LINE for v in hex_to_rgb(fill_hex))), "#140E0C", 0.3)
            line = _emission(nodes, links, to_linear(c))
        shader = _mix_shader(nodes, links, geo.outputs["Backfacing"], line, transparent)
        _output(nodes, links, shader if team_part else _fade(nodes, links, shader))
        M._cache[key] = mat
    return M._cache[key]


M.toon, M.team, M.outline = toon, team, outline


# -- follow-through chains ----------------------------------------------------------------------
def clip_poses(rig, clip):
    """Unique poses with follow-through, solved level by level so chains (cape segments) bend:
    each segment reacts to its parent's already-sprung motion."""
    poses = [clip.pose(i) for i in range(clip.frames)]
    secs = rig.secondaries

    def depth(n):
        d, p = 0, rig.parent_of[n]
        while p is not None:
            if p in secs:
                d += 1
            p = rig.parent_of[p]
        return d

    levels = {}
    for n in secs:
        levels.setdefault(depth(n), []).append(n)
    saved = dict(secs)
    try:
        for lv in sorted(levels):
            rig.secondaries = {n: saved[n] for n in levels[lv]}
            render.add_follow_through(rig, clip, poses)
    finally:
        rig.secondaries = saved
    return poses


# -- pipeline ----------------------------------------------------------------------------------
def _down(arr, k):
    """Exact k:1 box downsample in premultiplied alpha."""
    h, w = arr.shape[0] // k * k, arr.shape[1] // k * k
    a = arr[:h, :w]
    pm = a[..., :3] * a[..., 3:4]
    pm = pm.reshape(h // k, k, w // k, k, 3).mean(axis=(1, 3))
    al = a[..., 3].reshape(h // k, k, w // k, k).mean(axis=(1, 3))[..., None]
    rgb = np.where(al > 1e-6, pm / np.maximum(al, 1e-6), 0)
    return np.concatenate([rgb, al], -1)


def _flash(base, team, amount):
    """Hit flash baked into a frame: base toward warm white, team layer toward full grey."""
    b = base.copy()
    b[..., :3] = b[..., :3] + (np.array([1.0, 0.97, 0.9]) - b[..., :3]) * amount
    t = None
    if team is not None:
        t = team.copy()
        t[..., :3] = t[..., :3] + (1.0 - t[..., :3]) * amount
    return b, t


def finish(bp, tp, sp, flash=0.0):
    base = sheet.load(bp)
    team = sheet.load(tp) if tp else None
    under = sheet.load(sp) if sp else None
    w, f, v = OUTER
    base, team = sheet.outline(base, team, w * HD, f, v, seed_inset_px=4, team_grey=TEAM_LINE_GREY,
                               inner_px=0.8 * HD, under=under)
    if flash:
        base, team = _flash(base, team, flash)
    return base, team


def make_rig(mod):
    scene.reset()
    bpy.context.scene.cycles.samples = C.SAMPLES
    scene.camera(mod.CANVAS[0], mod.CANVAS[1], mod.FEET)
    rig = Rig(mod.SLUG, yaw=getattr(mod, "YAW_DEG", YAW_BIPED))
    mod.build(rig)
    return rig


def render_frames(rig, mod, clips, frame_dir, log=print, only=None):
    """Renders unique frames (base, team, smear) and returns {clip: [(b, t, s)]}, tracks."""
    os.makedirs(frame_dir, exist_ok=True)
    out, tracks = {}, {}
    smears = getattr(mod, "SMEARS", {})
    for clip in clips:
        if only and clip.name not in only:
            continue
        poses = clip_poses(rig, clip)
        frames, tr = [], {n: [] for n in rig.trackers}
        for i in range(clip.frames):
            spec = smears.get((clip.name, i))
            smear = None
            if spec:
                prev = clip.sequence[clip.sequence.index(i) - 1]
                smear = render._smear(rig, spec, poses[prev], poses[i], samples=14)
            rig.apply(poses[i])
            bpy.context.view_layer.update()
            for n, e in rig.trackers.items():
                tr[n].append(render._screen_lu(e.matrix_world.translation, mod.FEET))
            base = os.path.join(frame_dir, f"{clip.name}_{i:02d}.png")
            frames.append(render.render_frame(rig, poses[i], base, True, smear))
        out[clip.name] = frames
        tracks[clip.name] = tr
        log(f"  {clip.name}: {clip.frames} frames")
    return out, tracks


def run(mod, out_root, log=print, only=None):
    t0 = time.time()
    out_dir = os.path.join(out_root, mod.SLUG)
    os.makedirs(out_dir, exist_ok=True)
    rig = make_rig(mod)
    clips = mod.clips()
    raw, tracks = render_frames(rig, mod, clips, os.path.join(out_dir, "_raw"), log, only)
    t_render = time.time() - t0
    flashes = getattr(mod, "FLASH", {"hit": {0: 0.55}})
    hd, one = {}, {}
    for d in ("_hd", "_1x"):
        os.makedirs(os.path.join(out_dir, d), exist_ok=True)
    for c in clips:
        if c.name not in raw:
            continue
        hd[c.name], one[c.name] = [], []
        for i, (bp, tp, sp) in enumerate(raw[c.name]):
            b, t = finish(bp, tp, sp, flashes.get(c.name, {}).get(i, 0.0))
            pair_hd, pair_1 = [], []
            for arr, suf in ((b, ""), (t, "_team")):
                if arr is None:
                    pair_hd.append(None)
                    pair_1.append(None)
                    continue
                p = os.path.join(out_dir, "_hd", f"{c.name}_{i:02d}{suf}.png")
                sheet.save(arr, p)
                pair_hd.append(p)
                q = os.path.join(out_dir, "_1x", f"{c.name}_{i:02d}{suf}.png")
                sheet.save(_down(arr, HD), q)
                pair_1.append(q)
            hd[c.name].append(tuple(pair_hd))
            one[c.name].append(tuple(pair_1))
    clip_meta = {}
    for c in clips:
        if c.name not in raw:
            continue
        m = c.meta()
        tr = {k: v for k, v in tracks.get(c.name, {}).items() if not k.startswith("_")}
        if tr:
            m["anchorsLu"] = tr
        foot = tracks.get(c.name, {}).get("_foot")
        if foot and c.name == "walk":
            xs = [p[0] for p in foot]
            m["strideLu"] = round(2 * (max(xs) - min(xs)), 1)
            m["naturalSpeedLuPerS"] = round(m["strideLu"] / (c.total_ms() / 1000.0), 1)
        clip_meta[c.name] = m
    extra = {"visualId": f"unit.{mod.SLUG}", "name": mod.NAME, "heightLu": mod.HEIGHT_LU,
             "style": "gritty", "pxPerLu": round(PX_PER_LU, 4), "feetPx": list(mod.FEET),
             "facing": "right"}
    size_hd = sheet.build_atlas(mod.SLUG, hd, clip_meta, extra, out_dir, HD, f"{mod.SLUG}.hd",
                                variants=False)
    extra1 = dict(extra, pxPerLu=round(PX_PER_LU_GAME, 4), feetPx=[mod.FEET[0] / HD, mod.FEET[1] / HD])
    size_1 = sheet.build_atlas(mod.SLUG, one, clip_meta, extra1, out_dir, 1, mod.SLUG, variants=False)
    bg = "#3B3F3A"
    tints = {"blue": C.TEAM_COLORS["blue"], "orange": C.TEAM_COLORS["orange"]}
    sheet.previews(mod.SLUG, hd, clip_meta, out_dir, HD, bg, tints, fx=None)
    kb = lambda p: round(os.path.getsize(os.path.join(out_dir, p)) / 1024, 1)
    stats = {"slug": mod.SLUG, "frames": sum(c.frames for c in clips if c.name in raw),
             "sheetPx_1x": list(size_1), "sheetPx_hd": list(size_hd),
             "kb_1x": kb(f"{mod.SLUG}.png"), "kb_hd": kb(f"{mod.SLUG}.hd.png"),
             "renderSeconds": round(t_render, 1), "totalSeconds": round(time.time() - t0, 1)}
    with open(os.path.join(out_dir, "stats.json"), "w") as fh:
        json.dump(stats, fh, indent=1)
    log(json.dumps(stats))
    return stats


def preview(mod, items, out_path):
    """Look-dev strip: chosen frames at 3x (blue) on top, at 1x blue and orange below, and a
    black silhouette row."""
    import tempfile
    rig = make_rig(mod)
    clips = {c.name: c for c in mod.clips()}
    tmp = tempfile.mkdtemp()
    cache, tiles = {}, []
    smears = getattr(mod, "SMEARS", {})
    for item in items:
        name, idx = item.split(":")
        idx = int(idx)
        clip = clips[name]
        if name not in cache:
            cache[name] = clip_poses(rig, clip)
        poses = cache[name]
        smear = None
        spec = smears.get((name, idx))
        if spec:
            prev = clip.sequence[clip.sequence.index(idx) - 1]
            smear = render._smear(rig, spec, poses[prev], poses[idx], samples=14)
        raw = render.render_frame(rig, poses[idx], os.path.join(tmp, f"{name}_{idx}.png"), True, smear)
        fl = getattr(mod, "FLASH", {"hit": {0: 0.55}}).get(name, {}).get(idx, 0.0)
        b, t = finish(*raw, flash=fl)
        tiles.append([sheet.to_image(sheet.composite(b, t, C.TEAM_COLORS[k])) for k in ("blue", "orange")])
    w, h = mod.CANVAS
    bg = (70, 74, 66, 255)
    sw, sh = w // HD, h // HD
    out = Image.new("RGBA", (w * len(tiles), h + sh + 4), bg)
    for i, (blue, orange) in enumerate(tiles):
        out.alpha_composite(blue, (i * w, 0))
        out.alpha_composite(blue.resize((sw, sh), Image.Resampling.BOX), (i * w, h + 2))
        out.alpha_composite(orange.resize((sw, sh), Image.Resampling.BOX), (i * w + sw, h + 2))
        a = np.asarray(blue.resize((sw, sh), Image.Resampling.BOX))[..., 3]
        sil = np.zeros((sh, sw, 4), np.uint8)
        sil[..., 3] = a
        out.alpha_composite(Image.fromarray(sil, "RGBA"), (i * w + 2 * sw, h + 2))
    out.save(out_path)
    return out_path
