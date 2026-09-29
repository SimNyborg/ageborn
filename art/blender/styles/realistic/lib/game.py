"""Game-contract sheets for the realistic style: render a unit, turret or base module and write
PixiJS sprite sheets exactly in the format the game's atlas tier loads (art/blender/README.md,
src/visuals/adapters/atlas.ts and worldAtlas.ts).

Per visual it writes, into `out`:
  <file>.hd.png/.hd.json   2x sheet (2 x the 1x density), 256-colour PNG
  <file>.png/.json         1x sheet (e.g. 1.23 px/lu for units), 256-colour PNG
  <file>_<clip>_{1,2}x.gif previews with real timing, <file>_contact.png (2x, blue and orange rows)
  <file>.stats.json        render time, sheet sizes, team coverage, colour rule, clipped frames
  _frames/<file>/final/idle_00.png, idle_00_team.png   2x master of the first idle frame
                                                       (art/blender/gen_portraits.py reads them)

A module (units/<age>/<slug>.py, turrets/<age>.py, bases/<age>.py) provides:
  SLUG, NAME, AGE, KIND ('unit' | 'turret' | 'base'), VISUAL_ID (default '<kind>.<slug>'),
  FILE (file name, default SLUG), HEIGHT_LU, PX1 (1x px/lu), SCALE1 (meta.scale of the 1x sheet),
  CANVAS (w, h lu), FEET (x from the left, y from the bottom, lu), ANCHORS {head, hitCenter},
  TRACKERS {name: (bone, rest character-space point)}  -> per-frame clip anchorsLu,
  EXTRA_META (merged into meta.ageborn), build() -> ctx (with ctx['rig']),
  pose(ctx, clip, t_ms), clips() -> [Clip].
Units add WALK = {'strideLu': ..} (or a callable) and die clips carry DIE (fx, hideUnitAtMs).
"""
import json
import os
import shutil
import time

import bpy
import numpy as np
from PIL import Image

from . import core as C
from . import pipe

TEAMS = {"blue": "#2F7DF6", "orange": "#F28A1E"}
TEAM_META = {"mode": "tint-underlay", "frameSuffix": "_team",
             "howTo": "draw <frame>_team tinted with the team colour, then <frame> on top"}


class Clip:
    """A clip: unique frames played in `sequence` order with per-step `durations` (ms).

    Frame i is posed at `times[i]` (ms on the clip timeline; default: the start of its first
    step). `blur` {frame: ms} renders a motion-blurred smear over the preceding ms. `fx`
    {frame: dust2d kwargs} composites 2D dust in front. `impact` / `smear` are unique frame
    indices. `extra` is merged into the clip's meta (e.g. fx hand-off for die)."""

    def __init__(self, name, durations, loop=False, sequence=None, impact=None, smear=None, blur=None,
                 fx=None, times=None, extra=None):
        self.name = name
        self.durations = [int(d) for d in durations]
        self.sequence = list(sequence) if sequence is not None else list(range(len(durations)))
        assert len(self.sequence) == len(self.durations), name
        self.n = max(self.sequence) + 1
        starts = np.cumsum([0] + self.durations[:-1])
        first = {}
        for step, f in enumerate(self.sequence):
            first.setdefault(f, float(starts[step]))
        self.times = list(times) if times is not None else [first[i] for i in range(self.n)]
        self.loop = loop
        self.impact = impact
        self.smear = smear
        self.blur = blur or {}
        self.fx = fx or {}
        self.extra = extra or {}

    @property
    def total(self):
        return sum(self.durations)

    def step_start(self, frame):
        s = 0
        for d, f in zip(self.durations, self.sequence):
            if f == frame:
                return s
            s += d
        return None

    def meta(self):
        m = {"frames": self.n, "loop": self.loop, "sequence": self.sequence, "durationsMs": self.durations,
             "durationMs": self.total}
        if self.impact is not None:
            m["impactFrame"] = self.impact
            m["impactAt"] = round(self.step_start(self.impact) / self.total, 4)
        if self.smear is not None:
            m["smearFrame"] = self.smear
        m.update(self.extra)
        return m


# ---------------------------------------------------------------------------------- render
def _set_mode(mode, ctx):
    pipe._mode(mode, ctx)


def _pose(unit, ctx, clip, t, blur):
    sc = bpy.context.scene
    rig = ctx["rig"]
    rig.obj.animation_data_clear()
    if blur and any(o.get("weapon") for o in sc.objects):
        blur = 0.0              # weapons smear in 2D (_render_smears); the body stays crisp
    if blur:
        keep = getattr(unit, "BLUR_BONES", None)
        if isinstance(keep, dict):
            keep = keep.get(clip.name)
        if keep:
            # only the weapon chain smears; the body is held at the frame's pose (readable)
            unit.pose(ctx, clip.name, t)
            now = {pb.name: (tuple(pb.rotation_euler), tuple(pb.location), tuple(pb.scale))
                   for pb in rig.obj.pose.bones}
        unit.pose(ctx, clip.name, t - blur)
        if keep:
            for pb in rig.obj.pose.bones:
                if pb.name not in keep:
                    pb.rotation_euler, pb.location, pb.scale = now[pb.name]
        rig.key(1)
        unit.pose(ctx, clip.name, t)
        rig.key(2)
        sc.frame_set(2)
        sc.render.use_motion_blur = True
        sc.render.motion_blur_shutter = 1.0
        sc.render.motion_blur_position = "END"
        for o in sc.objects:
            if o.type == "MESH":
                o.cycles.motion_steps = 5      # curved sweeps, not straight vertex smears
    else:
        sc.render.use_motion_blur = False
        unit.pose(ctx, clip.name, t)
        sc.frame_set(1)
    if ctx.get("mode") == "mask":
        for o in sc.objects:
            if o.get("is_fx") or o.get("no_mask"):
                o.hide_render = True
    bpy.context.view_layer.update()


def render(unit, out, samples=28, only=None):
    """Render beauty + team-mask passes for every (clip, frame). Returns a run dict."""
    os.makedirs(out, exist_ok=True)
    C.PX_PER_LU_1X = unit.PX1
    C.reset(samples)
    ctx = unit.build()
    ctx["samples"] = samples
    ctx["exposure"] = getattr(unit, "EXPOSURE", 0.15)
    mult = C.RENDER_MULT
    cam, (wpx, hpx), feet_px = C.camera(unit.CANVAS[0], unit.CANVAS[1], unit.FEET, mult=mult, px1=unit.PX1)
    clips = unit.clips()
    jobs = [(c, i) for c in clips for i in range(c.n)]
    if only:
        jobs = [(c, i) for c, i in jobs if (c.name, i) in only or c.name in only]
    tmp = os.path.join(out, "_frames", _file(unit))
    os.makedirs(tmp, exist_ok=True)
    trackers = {}
    t0 = time.time()
    for mode in ("beauty", "mask"):
        _set_mode(mode, ctx)
        ctx["mode"] = mode
        for clip, i in jobs:
            _pose(unit, ctx, clip, clip.times[i], clip.blur.get(i, 0.0))
            if mode == "beauty":
                for name, (bone, p) in getattr(unit, "TRACKERS", {}).items():
                    w = ctx["rig"].world_point(bone, p)
                    trackers.setdefault(clip.name, {}).setdefault(name, {})[i] = [round(v, 1) for v in C.screen_lu(w)]
            bpy.context.scene.render.filepath = os.path.join(tmp, f"{mode}_{clip.name}_{i:02d}.png")
            bpy.ops.render.render(write_still=True)
    smear_jobs = [(c, i) for c, i in jobs if c.blur.get(i) and any(o.get("weapon") for o in bpy.context.scene.objects)]
    if smear_jobs:
        _render_smears(unit, ctx, smear_jobs, tmp, n=getattr(unit, "SMEAR_N", 24))
    secs = time.time() - t0
    run = dict(tmp=tmp, secs=secs, feet_px=feet_px, size=(wpx, hpx), trackers=trackers,
               jobs=[(c.name, i) for c, i in jobs])
    with open(os.path.join(tmp, "run.json"), "w") as f:
        json.dump(run, f)
    print(f"[{_file(unit)}] rendered {len(jobs)} frames x2 passes in {secs:.1f}s", flush=True)
    return run


def _white_mat():
    m = bpy.data.materials.new("smear_white")
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    em = nt.nodes.new("ShaderNodeEmission")
    em.inputs["Color"].default_value = (1, 1, 1, 1)
    nt.links.new(em.outputs[0], out.inputs["Surface"])
    return m


def _render_smears(unit, ctx, jobs, tmp, n=20):
    """2D smear for fast weapon strikes: the weapon objects (tagged `weapon`) are rendered as a
    white silhouette at n sub-times over the frame's blur span; the older end fades out. Written as
    smear_<clip>_<i>.png (alpha) and composited under the crisp frame by `finish_frames`."""
    sc = bpy.context.scene
    vl = bpy.context.view_layer
    _set_mode("mask", ctx)
    vl.material_override = _white_mat()
    sc.cycles.samples = 4
    ground = bpy.data.objects.get("ground")
    if ground:
        ground.hide_render = True
    others = [o for o in sc.objects if o.type == "MESH" and not o.get("weapon")]
    for o in others:
        o["_was_hidden"] = o.hide_render
        o.hide_render = True
    sc.render.use_motion_blur = False
    ctx["mode"] = "smear"
    path = os.path.join(tmp, "_smear.png")
    for clip, i in jobs:
        span = clip.blur[i]
        acc = None
        for k in range(n + 1):
            u = k / n
            unit.pose(ctx, clip.name, clip.times[i] - span * (1 - u))
            bpy.context.view_layer.update()
            sc.render.filepath = path
            bpy.ops.render.render(write_still=True)
            a = np.asarray(Image.open(path), float)[..., 3] / 255.0
            a = a * (0.25 + 0.75 * u ** 0.8)
            acc = a if acc is None else np.maximum(acc, a)
        Image.fromarray((np.clip(acc, 0, 1) * 255 + 0.5).astype(np.uint8), "L").save(
            os.path.join(tmp, f"smear_{clip.name}_{i:02d}.png"))
    for o in others:
        o.hide_render = bool(o.get("_was_hidden", False))
    vl.material_override = None


def load_run(unit, out):
    with open(os.path.join(out, "_frames", _file(unit), "run.json")) as f:
        r = json.load(f)
    r["jobs"] = [tuple(j) for j in r["jobs"]]
    # json turns int keys into strings
    r["trackers"] = {c: {n: {int(k): v for k, v in d.items()} for n, d in t.items()}
                     for c, t in r["trackers"].items()}
    return r


def _file(unit):
    return getattr(unit, "FILE", unit.SLUG)


# ---------------------------------------------------------------------------------- finish
def finish_frames(unit, run):
    """Team / base layers at 3x (master), 2x and 1x, with outline and 2D dust."""
    clips = {c.name: c for c in unit.clips()}
    tmp = run["tmp"]
    jobs = run["jobs"]
    C.PX_PER_LU_1X = unit.PX1          # dust2d sizes are in lu
    lref = getattr(unit, "LREF", None) or pipe.lref_for(tmp, jobs)
    frames = {}
    feet = run["feet_px"]
    for c, i in jobs:
        L = pipe.load_layers(tmp, c, i)
        tm, bs, ob, du = pipe.build_layers(L, lref, clips[c].fx.get(i), feet)
        sp = os.path.join(tmp, f"smear_{c}_{i:02d}.png")
        if os.path.exists(sp) and clips[c].blur.get(i):
            sa = np.asarray(Image.open(sp), float) / 255.0
            sa = _box(sa, 2) * getattr(unit, "SMEAR_ALPHA", 0.7)
            col = np.array(C.col(getattr(unit, "SMEAR_COLOR", "#b8aa98"))[:3]) ** (1 / 2.2)
            sm = np.dstack([col[None, None, :] * sa[..., None], sa])
            bs = pipe.over(bs, sm)
        for s in (1, 2):
            frames[(c, i, s)] = pipe.finish(tm, bs, ob, s, full=C.RENDER_MULT, sharpen=0.25 if s == 1 else 0.0,
                                            dust=du)
    return frames, lref


def _box(a, r):
    p = np.pad(a, r, mode="edge")
    out = np.zeros_like(a)
    h, w = a.shape
    for dy in range(-r, r + 1):
        for dx in range(-r, r + 1):
            out += p[r + dy:r + dy + h, r + dx:r + dx + w]
    return out / (2 * r + 1) ** 2


def colour_rule(team, base, obj):
    import colorsys
    a = base[..., 3]
    sel = (obj > 0.5) & (team[..., 3] < 0.3) & (a > 0.5)
    rgb = base[..., :3][sel] / np.maximum(a[sel][:, None], 1e-4)
    if len(rgb) == 0:
        return 0.0
    mx, mn = rgb.max(1), rgb.min(1)
    sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0)
    pts = rgb[sat > 0.4]
    if len(pts) == 0:
        return 0.0
    hsv = np.array([colorsys.rgb_to_hsv(*p)[0] * 360 for p in pts])
    bad = ((hsv >= 350) | (hsv <= 81) | ((hsv >= 182) & (hsv <= 254))).sum()
    return float(bad) / max(1, (obj > 0.5).sum())


def write_outputs(unit, run, out, previews=True):
    os.makedirs(out, exist_ok=True)
    frames, lref = finish_frames(unit, run)
    clips = [c for c in unit.clips() if any(j[0] == c.name for j in run["jobs"])]
    fname = _file(unit)
    fx, fy = run["feet_px"]
    kind = getattr(unit, "KIND", "unit")
    stats = {"file": fname, "renderSeconds": round(run["secs"], 1), "frames": len(run["jobs"]), "lref": lref,
             "clips": {}, "clipped": []}
    scale1 = float(getattr(unit, "SCALE1", 1.5))
    # widthLu: the rest pose's silhouette width (first idle / body frame, 1x)
    first = clips[0].name
    _, b1, o1 = frames[(first, 0, 1)]
    xs = np.nonzero(o1.max(0) > 0.05)[0]
    width_lu = round((xs.max() - xs.min() + 1) / unit.PX1, 1) if len(xs) else 0.0
    for s, tag in (((2, ".hd"), (1, "")) if kind == "unit" else ((1, ""),)):
        items = []
        for c, i in run["jobs"]:
            tm, bs, _ = frames[(c, i, s)]
            anc = (fx * s / C.RENDER_MULT, fy * s / C.RENDER_MULT)
            items.append((f"{fname}_{c}_{i:02d}", _clean(pipe.to_img(bs)), anc))
            items.append((f"{fname}_{c}_{i:02d}_team", _clean(pipe.to_img(tm)), anc))
        sheet, meta = pipe.pack(items, max_w=2048 if s == 2 else 1024)
        img = f"{fname}{tag}.png"
        n8 = pipe.save_png8(sheet, os.path.join(out, img))
        anims = {}
        clipmeta = {}
        for clip in clips:
            anims[clip.name] = [f"{fname}_{clip.name}_{f:02d}" for f in clip.sequence]
            anims[clip.name + "_team"] = [f"{fname}_{clip.name}_{f:02d}_team" for f in clip.sequence]
            cm = clip.meta()
            tr = run["trackers"].get(clip.name, {})
            if tr:
                cm["anchorsLu"] = {n: [d[i] for i in range(clip.n)] for n, d in tr.items()}
            if kind == "unit" and clip.name == "walk":
                w = unit.WALK(clip) if callable(getattr(unit, "WALK", None)) else getattr(unit, "WALK", {})
                if w:
                    stride = w["strideLu"]
                    cm["strideLu"] = round(stride, 1)
                    cm["naturalSpeedLuPerS"] = round(stride / (clip.total / 1000.0), 1)
            clipmeta[clip.name] = cm
        px = unit.PX1 * s
        ab = {"visualId": getattr(unit, "VISUAL_ID", f"{kind}.{unit.SLUG}"), "name": unit.NAME,
              "heightLu": unit.HEIGHT_LU, "widthLu": width_lu, "pxPerLu": round(px, 4),
              "feetPx": [round(fx * s / C.RENDER_MULT, 1), round(fy * s / C.RENDER_MULT, 1)],
              "anchorsLu": {k: list(v) for k, v in unit.ANCHORS.items()}, "facing": "right",
              "note": "anchorsLu are screen-plane lu from the feet (x right, y up)", "style": "realistic"}
        ab.update(getattr(unit, "EXTRA_META", {}))
        ab["team"] = TEAM_META
        ab["clips"] = clipmeta
        js = {"frames": meta, "animations": anims,
              "meta": {"app": "ageborn art/blender/styles/realistic", "version": "3", "image": img,
                       "format": "RGBA8888", "size": {"w": sheet.width, "h": sheet.height},
                       "scale": _fmt(scale1 * s), "ageborn": ab}}
        with open(os.path.join(out, f"{fname}{tag}.json"), "w") as f:
            json.dump(js, f, separators=(",", ":"))
        stats["sheet" + tag] = {"w": sheet.width, "h": sheet.height, "png8KB": round(n8 / 1024, 1)}
    # stats: coverage, colour rule, clipping
    for clip in clips:
        cov, rule = [], []
        for i in range(clip.n):
            tm, bs, ob = frames[(clip.name, i, 2)]
            cov.append(float(tm[..., 3].sum() / max(1.0, ob.sum())))
            rule.append(colour_rule(tm, bs, ob))
            a = np.maximum(bs[..., 3], tm[..., 3])
            if a[0].max() > 0.1 or a[-1].max() > 0.1 or a[:, 0].max() > 0.1 or a[:, -1].max() > 0.1:
                stats["clipped"].append(f"{clip.name}_{i:02d}")
        stats["clips"][clip.name] = {"teamCoverageMin": round(min(cov), 3), "colourRuleMax": round(max(rule), 4)}
    # 3x master of the first frame for the card portrait
    fin = os.path.join(run["tmp"], "final")
    os.makedirs(fin, exist_ok=True)
    tm, bs, _ = frames[(first, 0, 2)]
    pipe.to_img(bs).save(os.path.join(fin, "idle_00.png"))
    pipe.to_img(tm).save(os.path.join(fin, "idle_00_team.png"))
    if previews:
        _previews(unit, clips, frames, run, out)
    with open(os.path.join(out, f"{fname}.stats.json"), "w") as f:
        json.dump(stats, f, indent=1)
    print(json.dumps({k: v for k, v in stats.items() if k != "clips"}), flush=True)
    return stats, frames


ALPHA_FLOOR = 16


def _clean(im):
    """Drops near-transparent pixels (shadow and dust tails below 6% alpha): they cost about a
    quarter of a sheet's PNG size and are invisible in the game."""
    a = np.asarray(im).copy()
    a[a[..., 3] < ALPHA_FLOOR] = 0
    return Image.fromarray(a, "RGBA")


def _fmt(v):
    return str(int(v)) if float(v).is_integer() else str(v)


def _previews(unit, clips, frames, run, out):
    fname = _file(unit)
    fy = run["feet_px"][1]
    for clip in clips:
        for s in (1, 2):
            ims = []
            for f in clip.sequence:
                tm, bs, _ = frames[(clip.name, f, s)]
                h, w = bs.shape[:2]
                ims.append(pipe.to_rgb(pipe.composite(tm, bs, TEAMS["blue"], pipe.preview_bg(w, h, fy * s / C.RENDER_MULT))))
            pal = [im.quantize(colors=255, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.FLOYDSTEINBERG)
                   for im in ims]
            pal[0].save(os.path.join(out, f"{fname}_{clip.name}_{s}x.gif"), save_all=True, append_images=pal[1:],
                        duration=clip.durations, loop=0, disposal=1)
    rows = []
    for clip in clips:
        for team in ("blue", "orange"):
            row = []
            for i in range(clip.n):
                tm, bs, _ = frames[(clip.name, i, 2)]
                h, w = bs.shape[:2]
                row.append(pipe.composite(tm, bs, TEAMS[team], pipe.preview_bg(w, h, fy * 2 / C.RENDER_MULT)))
            rows.append(np.hstack(row))
    W = max(x.shape[1] for x in rows)
    rows = [np.pad(x, ((0, 0), (0, W - x.shape[1]), (0, 0)), constant_values=0.16) for x in rows]
    pipe.to_rgb(np.vstack(rows)).save(os.path.join(out, f"{fname}_contact.png"))


# ---------------------------------------------------------------------------------- install
REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "..", ".."))


def install_dir(unit):
    kind = getattr(unit, "KIND", "unit")
    if kind == "unit":
        return os.path.join(REPO, "public", "art", "units", unit.AGE)
    if kind == "turret":
        return os.path.join(REPO, "public", "art", "turrets", unit.AGE)
    return os.path.join(REPO, "public", "art", "bases")


def install(unit, out):
    dst = install_dir(unit)
    os.makedirs(dst, exist_ok=True)
    fname = _file(unit)
    exts = (".png", ".json", ".hd.png", ".hd.json") if getattr(unit, "KIND", "unit") == "unit" else (".png", ".json")
    for ext in exts:
        shutil.copyfile(os.path.join(out, fname + ext), os.path.join(dst, fname + ext))
    print(f"installed {fname} -> {dst}")


def strip(unit, run, png, teams=("#2F7DF6", "#F28A1E")):
    """Look-dev strip: 3x frames (blue) on top, 1x blue/orange below at 3x nearest and at 1x."""
    frames, _ = finish_frames(unit, run)
    fy = run["feet_px"][1]
    big, small = [], []
    for c, i in run["jobs"]:
        t3, b3, _ = frames[(c, i, 2)]
        big.append(pipe.composite(t3, b3, teams[0], pipe.preview_bg(b3.shape[1], b3.shape[0], fy * 2 / C.RENDER_MULT)))
        row = []
        for tc in teams:
            t1, b1, _ = frames[(c, i, 1)]
            row.append(pipe.composite(t1, b1, tc, pipe.preview_bg(b1.shape[1], b1.shape[0], fy / C.RENDER_MULT)))
        small.append(np.hstack(row))
    per = 4
    h, w = big[0].shape[:2]
    rows = []
    for r0 in range(0, len(big), per):
        row = big[r0:r0 + per]
        row += [np.full_like(big[0], 0.16)] * (per - len(row))
        rows.append(np.hstack(row))
    top = pipe.to_rgb(np.vstack(rows))
    bot = pipe.to_rgb(np.hstack(small))
    up = bot.resize((bot.width * 2, bot.height * 2), Image.NEAREST)
    W = max(top.width, up.width)
    canvas = Image.new("RGB", (W, top.height + up.height + bot.height + 8), (40, 40, 40))
    canvas.paste(top, (0, 0))
    canvas.paste(up, (0, top.height + 4))
    canvas.paste(bot, (0, top.height + up.height + 8))
    canvas.save(png)
