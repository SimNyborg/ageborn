"""The detail standard for world items (art round, world wave A; item 47 audit 5.2, rows Turrets, Forts, Bases and
base skins, Decorations): the per-item opt-in and the checks against the installed sheet.

World items live several to a module, each a namespace from its factory (`common.turret_module`,
`common.base_module`, `fort_toon.make`, `decorations.deco_module`, `base_collapse` kits), so the opt-in is per item:

    look_world.opt_in(MOD, {"#8C7B68": "stone", "#7A5A3C": "wood", ..., "team": "cloth"}, highlight=1.2, shade={...})

sets the units' opt-in on that namespace (`DETAIL_STANDARD`, `MATERIAL_KINDS`, `LOOK_HIGHLIGHT`, `LOOK_SHADE`,
`LOOK_RIM`; `ageborn_art/look.py`: the lifts L1, L2, L3 and L5, two-tone team parts through `look.team_part`) plus
three world knobs that `look.py` reads:

  LOOK_HEIGHT_LU  a turret's dirt bands in its authored lu (its parts are built at authored size and scaled by
                  TURRET_SCALE at render, while HEIGHT_LU is the rendered height)
  LOOK_OUTLINE    a decoration keeps its own thinner prop line, with outline v4's inner cover (0.35 lu); a base
                  keeps the v3 line's outer width (2.5 px: the base skins' footprint contract measures the
                  standard base's silhouette, which v4's 2.3 px would pull in by a pixel) with v4's colour and
                  inner cover
  LOOK_CHECKS     `checks` below in place of the unit checks: a turret's team zone is a pennant or a band (not 18%
                  of the silhouette), bases are outside the A11 colour rule, and the reference is the installed
                  world sheet (not public/art/units)

An item without the opt-in renders exactly as before (every look hook is a no-op for it).

As a tool (no Blender), the same comparison for installed sheets, e.g. a fort after `finish_meta`, or the gate's
numbers for a whole set:

    <venv>/bin/python art/blender/world/look_world.py public/art/turrets/stone/rock_tosser.json [...] --ref 45647d4

`checks` (a hard failure stops the install, as for the units; the reference is AGEBORN_LOOK_REF, a directory tree or a
git ref, default HEAD: pass the wave's base commit so a re-render is measured against the shipped sheet):
  contract  the same clips (frames, sequence, durations, impact, loop), canvas, feet and contract meta (pivot, aim
            limits, mounts, flags, lights, smoke, horn, props, glow, shadow, the fort keys) as the reference; per-frame
            anchors (the turret's muzzle, the base's mounts) within 0.05 lu
  pixels    the 1x sheet (and a fort's HD sheet, which the game loads on dense screens) within +2% of the reference's
            pixels (audit 5.1 rule 11: decoded memory must not grow)
  colour    turrets: the A11 colour rule <= 10% on the RGBA frames and the encoded sheet; bases, skins, forts,
            decorations and kits (outside the rule's scope): no frame worse than the reference's (+0.5 points)
  team      no frame's team share below the reference frame's (-0.5 points) and the composed item's visible team
            share not below the reference's (-0.3 points): never less team than today
  orange    bases and skins: the blue side's share of non-team pixels that read as the orange team (README "Orange
            check": hue 10-45 degrees, saturation and value >= 45%) not above the reference's (+0.5 points)
  metrics   the composed item at game scale (`look2d.game_metrics` at the sheet's own density) against its class's
            floors (`FLOORS`; reported, the review's guide, not a gate)
"""
import argparse
import json
import os
import subprocess
import sys
import tempfile

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(os.path.dirname(HERE)))

# Game-scale floors per class at the class's own sheet density (flat <=, micro >=, edge >=, highlight >=): the war
# machines' row of audit 5.2 (flat 0.30, micro 3.4, edge 0.45, highlight 0.06 on the HD sheet), carried to the world
# densities by what the density alone does to 16 detailed war machines (Bronze to Modern; their idle 0 on the HD sheet,
# on the 1x sheet and box-resized to 1.025 px/lu): flat -0.05 / -0.08, micro +0.45 / +0.6, edge -0.01, highlight
# x0.44 / x0.37. Forts load their HD sheet on dense screens, so they take the row itself.
FLOORS = {
    "turret": {"flat": 0.25, "micro": 3.85, "edge": 0.44, "highlight": 0.026},       # 1x, 1.23 px/lu, drawn 1.49x
    "decoration": {"flat": 0.25, "micro": 3.85, "edge": 0.44, "highlight": 0.026},   # 1x in battle; HD in Customize
    "base": {"flat": 0.22, "micro": 4.0, "edge": 0.44, "highlight": 0.022},          # 1.025 px/lu, drawn 1.79x
    "fort": {"flat": 0.30, "micro": 3.4, "edge": 0.45, "highlight": 0.06},           # HD, 2.46 px/lu, drawn 0.74x
}
CONTRACT_META = ("kind", "age", "pxPerLu", "feetPx", "heightLu", "pivotLu", "aimLimits", "fireKind", "modelScale",
                 "mountsLu", "flags", "lightsLu", "smokeLu", "hornLu", "props", "skin", "topple", "collapseMaterial",
                 "auraLu", "glowLu", "glintsLu", "shadowLu", "motion", "mirror", "id", "style", "fortKind", "material",
                 "footLu", "flag", "door", "crew", "muzzleLu", "pieces", "heaps")
CLIP_KEYS = ("frames", "sequence", "durations", "loop", "impact")
# a frame's team share may sit this far below the installed frame's (points); the composed item's may not drop
TEAM_FRAME_TOL = 0.5
TEAM_BLUE = (0x2F / 255, 0x7D / 255, 0xF6 / 255)
ALT_TINT = (1.0, 0.0, 1.0)


# -- opt-in -------------------------------------------------------------------------------------------------------
def opt_in(mod, kinds, *, highlight=None, shade=None, rim=None):
    """Opts one world item into the detail standard (see the module doc). Returns the item."""
    from ageborn_art import look
    kind = mod.EXTRA_META.get("kind")
    mod.DETAIL_STANDARD = True
    mod.MATERIAL_KINDS = dict(kinds)
    if highlight is not None:
        mod.LOOK_HIGHLIGHT = highlight
    if shade:
        mod.LOOK_SHADE = dict(shade)
    if rim:
        mod.LOOK_RIM = dict(rim)
    if kind == "turret":
        mod.LOOK_HEIGHT_LU = round(mod.HEIGHT_LU / mod.EXTRA_META.get("modelScale", 1.0), 2)
    if kind == "decoration":
        mod.LOOK_OUTLINE = tuple(mod.OUTER_OUTLINE[:3]) + (look.UNIT_OUTLINE_V4[3],)
    if kind == "base":
        from ageborn_art import config
        width = getattr(mod, "OUTER_OUTLINE", config.UNIT_OUTLINE_V3)[0]
        mod.LOOK_OUTLINE = (width,) + tuple(look.UNIT_OUTLINE_V4[1:])
    mod.LOOK_CHECKS = checks
    return mod


# -- the reference sheet --------------------------------------------------------------------------------------------
def installed(mod):
    """The repository paths of an item's installed sheets (the 1x sheet first; a fort also its HD sheet)."""
    k = mod.EXTRA_META.get("kind")
    skin = getattr(mod, "SKIN", None)
    if k == "turret":
        return [f"public/art/turrets/{mod.AGE}/{mod.FILE_SLUG}.json"]
    if k in ("base", "baseCollapseKit"):
        return [f"public/art/bases/skins/{mod.FILE_SLUG}.json" if skin else f"public/art/bases/{mod.FILE_SLUG}.json"]
    if k == "decoration":
        return [f"public/art/cosmetics/decorations/{mod.FILE_SLUG}.json"]
    if k == "fort":
        return [f"public/art/forts/{mod.AGE}/{mod.SLUG}.json", f"public/art/forts/{mod.AGE}/{mod.SLUG}.hd.json"]
    raise ValueError(f"{mod.SLUG}: no world kind {k!r}")


def ref_sheet(rel, ref=None):
    """A local copy of the reference sheet `rel` (json and png): AGEBORN_LOOK_REF names a directory tree or a git ref
    (default HEAD). None when the reference has no such sheet."""
    ref = ref or os.environ.get("AGEBORN_LOOK_REF", "HEAD")
    if os.path.isdir(ref):
        p = os.path.join(ref, rel)
        return p if os.path.exists(p) else None
    tmp = tempfile.mkdtemp(prefix="lookref_world_")
    try:
        data = subprocess.run(["git", "-C", REPO, "show", f"{ref}:{rel}"], capture_output=True, check=True).stdout
        with open(os.path.join(tmp, os.path.basename(rel)), "wb") as fh:
            fh.write(data)
        image = json.loads(data)["meta"]["image"]
        png = os.path.join(os.path.dirname(rel), image)
        data = subprocess.run(["git", "-C", REPO, "show", f"{ref}:{png}"], capture_output=True, check=True).stdout
        with open(os.path.join(tmp, image), "wb") as fh:
            fh.write(data)
    except (subprocess.CalledProcessError, KeyError, ValueError):
        return None
    return os.path.join(tmp, os.path.basename(rel))


# -- composition ----------------------------------------------------------------------------------------------------
def _named(fr, clip, i=0):
    for n in fr:
        if n.endswith(f"_{clip}_{i:02d}"):
            return n
    return None


def _comp(fr, name, tint):
    from ageborn_art import look2d
    if name is None or name not in fr:
        return None
    return look2d.composite(fr[name], fr.get(name + "_team"), tint)


def _stack(parts):
    from ageborn_art import look2d
    out = None
    for p in parts:
        if p is not None:
            out = p.copy() if out is None else look2d.over(p, out)
    return out


def composed(fr, d, tint=TEAM_BLUE, step=0):
    """The item as the game shows it: a turret's mount with its head (idle frame `step`) over it; a base's body
    (crumble `step`) with its flags and props at their hold frame; a fort's body with its crew front and flag; a
    decoration's body with its loop (frame `step`); a collapse kit's first piece."""
    a = d["meta"]["ageborn"]
    k = a.get("kind")
    if k == "turret":
        return _stack([_comp(fr, _named(fr, "mount"), tint), _comp(fr, _named(fr, "idle", step), tint)])
    if k == "base":
        back, front = [], []
        for f in a.get("flags", []):
            if step <= f.get("crumbleMax", 3):
                (back if f.get("z") == "back" else front).append(_comp(fr, _named(fr, f["clip"]), tint))
        for p in a.get("props", []):
            if p.get("crumbleMin", 0) <= step <= p.get("crumbleMax", 3):
                c = _comp(fr, _named(fr, p["clip"], p.get("holdFrame", 0)), tint)
                (back if p.get("z") == "back" else front).append(c)
        return _stack(back + [_comp(fr, _named(fr, "body", step), tint)] + front)
    if k == "fort":
        if "body" in a["clips"]:
            return _stack([_comp(fr, _named(fr, "body", step), tint), _comp(fr, _named(fr, "front", step), tint),
                           _comp(fr, _named(fr, "flag"), tint)])
        return _comp(fr, _named(fr, "trap", step), tint)
    if k == "decoration":
        return _stack([_comp(fr, _named(fr, "body"), tint), _comp(fr, _named(fr, "loop", step), tint)])
    return _comp(fr, _named(fr, "piece", step), tint)


def team_visible(fr, d, step=0):
    """The composed item's visible team share (% of its silhouette): pixels whose colour changes with the tint."""
    a = composed(fr, d, TEAM_BLUE, step)
    b = composed(fr, d, ALT_TINT, step)
    if a is None:
        return 0.0
    sil = a[..., 3] > 0.5
    diff = np.abs(a[..., :3] - b[..., :3]).max(-1) > 0.08
    return 100.0 * (diff & sil).sum() / max(1, sil.sum())


def orange_pct(fr, d, step=0):
    """README's orange check on the blue side: non-team pixels with hue 10-45 degrees and saturation and value at
    least 45%, % of the silhouette of the composed item."""
    a = composed(fr, d, TEAM_BLUE, step)
    b = composed(fr, d, ALT_TINT, step)
    if a is None:
        return 0.0
    sil = a[..., 3] > 0.5
    team = np.abs(a[..., :3] - b[..., :3]).max(-1) > 0.08
    rgb = a[..., :3]
    mx, mn = rgb.max(-1), rgb.min(-1)
    sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0)
    d_ = np.maximum(mx - mn, 1e-6)
    r, g, bb = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    hue = np.where(mx == r, ((g - bb) / d_) % 6, np.where(mx == g, (bb - r) / d_ + 2, (r - g) / d_ + 4)) * 60
    bad = sil & ~team & (hue >= 10) & (hue <= 45) & (sat >= 0.45) & (mx >= 0.45)
    return 100.0 * bad.sum() / max(1, sil.sum())


def item_metrics(path, steps=None):
    """Game-scale metrics of the composed item (rest: step 0) and their mean over `steps`."""
    from ageborn_art import look2d
    fr, d = look2d.frames_of(path)
    a = d["meta"]["ageborn"]
    out = {"rest": look2d.game_metrics(composed(fr, d), a["pxPerLu"])}
    if steps:
        ms = [look2d.game_metrics(c, a["pxPerLu"]) for c in (composed(fr, d, step=s) for s in steps) if c is not None]
        out["mean"] = {k: round(float(np.mean([m[k] for m in ms])), 3) for k in ms[0]}
    return out


def floor_misses(cls, m):
    f = FLOORS.get(cls)
    if not f:
        return []
    miss = []
    if m["flat"] > f["flat"]:
        miss.append(f"flat {m['flat']} > {f['flat']}")
    for k in ("micro", "edge", "highlight"):
        if m[k] < f[k]:
            miss.append(f"{k} {m[k]} < {f[k]}")
    return miss


def _class(d):
    k = d["meta"]["ageborn"].get("kind")
    return "base" if k in ("base", "baseCollapseKit") else k


def _steps(d):
    a = d["meta"]["ageborn"]
    clips = a["clips"]
    k = a.get("kind")
    if k == "turret":
        return list(range(clips["idle"]["frames"]))
    if k == "base":
        return list(range(clips["body"]["frames"]))
    if k == "fort":
        return list(range(clips["body"]["frames"])) if "body" in clips else list(range(clips["trap"]["frames"]))
    if k == "decoration":
        return list(range(clips["loop"]["frames"])) if "loop" in clips else [0]
    return [0]


# -- the checks -----------------------------------------------------------------------------------------------------
def compare(new_path, ref_path, rgba_rule=None):
    """Every check of the module doc for one new sheet against its reference. Returns (results, hard failures)."""
    from ageborn_art import look2d
    a, ad = look2d.frames_of(new_path)
    b, bd = look2d.frames_of(ref_path)
    am, bm = ad["meta"]["ageborn"], bd["meta"]["ageborn"]
    cls = _class(ad)
    hard, res = [], {"class": cls}
    # contract
    for key in CONTRACT_META:
        if key in bm and key in am and am[key] != bm[key]:
            hard.append(f"meta {key} {am[key]!r} != installed {bm[key]!r}")
    if am.get("widthLu") != bm.get("widthLu"):
        res["widthLu"] = [am.get("widthLu"), bm.get("widthLu")]
        if cls != "base" and abs((am.get("widthLu") or 0) - (bm.get("widthLu") or 0)) > 3.0:
            hard.append(f"widthLu {am.get('widthLu')} vs installed {bm.get('widthLu')}")
    worst_anchor = 0.0
    for clip, bc in bm["clips"].items():
        ac = am["clips"].get(clip)
        if ac is None:
            hard.append(f"clip {clip} missing")
            continue
        for k in CLIP_KEYS:
            if k in bc and ac.get(k) != bc[k]:
                hard.append(f"clip {clip} {k} {ac.get(k)!r} != installed {bc[k]!r}")
        for tr, pts in (bc.get("anchorsLu") or {}).items():
            mine = (ac.get("anchorsLu") or {}).get(tr)
            if mine is None or len(mine) != len(pts):
                hard.append(f"clip {clip} anchor {tr} missing or a different length")
                continue
            dev = max(max(abs(p[0] - q[0]), abs(p[1] - q[1])) for p, q in zip(mine, pts))
            worst_anchor = max(worst_anchor, dev)
            if dev > 0.05:
                hard.append(f"clip {clip} anchor {tr} moved {dev:.2f} lu")
    res["anchorWorstLu"] = round(worst_anchor, 3)
    any_b = next(iter(bd["frames"].values()))["sourceSize"]
    any_a = next(iter(ad["frames"].values()))["sourceSize"]
    if any_a != any_b:
        hard.append(f"canvas {any_a} != installed {any_b}")
    # pixels
    px = ad["meta"]["size"]["w"] * ad["meta"]["size"]["h"]
    rpx = bd["meta"]["size"]["w"] * bd["meta"]["size"]["h"]
    res["sheetPx"] = [ad["meta"]["size"]["w"], ad["meta"]["size"]["h"]]
    res["sheetPxVsRef"] = round(px / rpx, 4)
    if px > rpx * 1.02:
        hard.append(f"sheet pixels {px / rpx:.3f} x the installed sheet (limit 1.02)")
    # colour rule
    worst_new = worst_up = (0.0, None)
    for n in a:
        if n.endswith("_team"):
            continue
        p = look2d.rule_pct(a[n], a.get(n + "_team"))
        if p > worst_new[0]:
            worst_new = (p, n)
        if cls != "turret" and n in b:
            q = look2d.rule_pct(b[n], b.get(n + "_team"))
            if p > max(10.0, q) + 0.5 and p - max(10.0, q) > worst_up[0]:
                worst_up = (p - max(10.0, q), n)
    res["colourRuleEncodedPct"] = [round(worst_new[0], 2), worst_new[1]]
    if cls == "turret":
        if worst_new[0] > 10.0 or (rgba_rule or 0.0) > 10.0:
            hard.append(f"colour rule {max(worst_new[0], rgba_rule or 0.0):.1f}% > 10%")
        if rgba_rule is not None:
            res["colourRuleRgbaPct"] = rgba_rule
    elif worst_up[1]:
        hard.append(f"colour rule {worst_up[1]} {worst_up[0]:.1f} points above max(10%, the installed frame)")
    # team share per frame and of the composed item
    low = (0.0, None)
    for n in b:
        if n.endswith("_team") or b.get(n + "_team") is None:
            continue
        q = look2d.team_share(b[n], b[n + "_team"])
        p = look2d.team_share(a[n], a.get(n + "_team")) if n in a else 0.0
        if q - p > low[0]:
            low = (q - p, n)
    if low[0] > TEAM_FRAME_TOL:
        hard.append(f"team share of {low[1]} {low[0]:.1f} points below the installed frame")
    res["teamFrameDropWorst"] = [round(low[0], 2), low[1]]
    tv, tr = team_visible(a, ad), team_visible(b, bd)
    res["teamVisiblePct"] = [round(tv, 2), round(tr, 2)]
    if tv < tr - 0.3:
        hard.append(f"visible team share {tv:.1f}% < installed {tr:.1f}%")
    # orange check (bases and skins)
    if am.get("kind") == "base":
        steps = [0, ad["meta"]["ageborn"]["clips"]["body"]["frames"] - 1]
        ora = [(round(orange_pct(a, ad, s), 2), round(orange_pct(b, bd, s), 2)) for s in steps]
        res["orangePct"] = ora
        for (p, q), s in zip(ora, steps):
            if p > q + 0.5:
                hard.append(f"orange share at crumble {s} {p}% > installed {q}%")
    # metrics (soft)
    steps = _steps(ad)
    m_new = {"rest": look2d.game_metrics(composed(a, ad), am["pxPerLu"])}
    m_ref = {"rest": look2d.game_metrics(composed(b, bd), bm["pxPerLu"])}
    ms = [look2d.game_metrics(c, am["pxPerLu"]) for c in (composed(a, ad, step=s) for s in steps) if c is not None]
    m_new["mean"] = {k: round(float(np.mean([m[k] for m in ms])), 3) for k in ms[0]}
    res["metrics"] = m_new
    res["refMetrics"] = m_ref
    res["floorMisses"] = floor_misses(cls, m_new["rest"])
    return res, hard


def checks(mod, out_dir, file_slug, stats, clip_meta, log=print):
    """`look.checks` for an opted-in world item (LOOK_CHECKS): see the module doc. Returns stats["look"]."""
    res = {"outline": "v4", "world": True}
    hard = []
    rgba = stats.get("colourRule", {}).get("worstPct")
    for rel in installed(mod):
        suffix = ".hd.json" if rel.endswith(".hd.json") else ".json"
        mine = os.path.join(out_dir, file_slug + suffix)
        ref = ref_sheet(rel)
        key = "hd" if suffix == ".hd.json" else "x1"
        if ref is None:
            res[key] = {"note": f"no reference sheet {rel}"}
            continue
        r, h = compare(mine, ref, rgba if key == "x1" else None)
        res[key] = r
        hard += [f"{key}: {x}" for x in h]
    res["failures"] = hard
    if hard:
        log("  LOOK (world) failures: " + "; ".join(hard))
    return res


def main():
    ap = argparse.ArgumentParser(description="Compare installed world sheets with their reference copies.")
    ap.add_argument("sheets", nargs="+", help="world sheets under public/art (a fort's .json and .hd.json)")
    ap.add_argument("--ref", default=None, help="a directory tree or a git ref (default AGEBORN_LOOK_REF or HEAD)")
    args = ap.parse_args()
    out = {}
    for p in args.sheets:
        rel = os.path.relpath(os.path.abspath(p), REPO)
        ref = ref_sheet(rel, args.ref)
        if ref is None:
            out[rel] = {"note": "no reference sheet"}
            continue
        res, hard = compare(p, ref)
        out[rel] = dict(res, failures=hard)
    print(json.dumps(out, indent=1))


if __name__ == "__main__":
    sys.path.insert(0, os.path.dirname(HERE))
    sys.dont_write_bytecode = True
    main()
