"""Anchors-only mode: evaluate every unit's clips frame by frame without Cycles and write what the game needs
besides pixels: the damage bundles (`public/art/damage/<age>.json`: family, per-frame torso box and head point,
damage spots where authored; COMMON C1, item40 appendix B) and, with `--aim`, the aim data of every shot clip in
the shipped sheet JSONs (COMMON C2). It runs each unit's real setup (`pipeline.run_unit` up to the render step,
`render.PROBE_ONLY`), so it measures the same poses a render would, with the same code (`ageborn_art/probe.py`).

It checks itself against the shipped sheets first: clip frame counts, sequences, step durations and impact
frames, `feetPx`, every tracker (`anchorsLu`) within 0.3 lu and every frame's silhouette box within 2 lu of
the packed frame's trim. A unit whose script no longer reproduces its sheet is listed and left out of the
bundles (the runtime falls back to its team-layer estimate for it) until its script is fixed.

Usage (from the repository root; no Blender slot needed, nothing is rendered):
  .venv-blender/bin/python art/blender/anchors_only.py --units all --bundles [--aim] [--report <json>]
  .venv-blender/bin/python art/blender/anchors_only.py --units bonker,hoplite --check-only

Rerunnable and idempotent: the same scripts and sheets give the same bytes.
"""
import argparse
import importlib
import json
import os
import shutil
import sys
import tempfile
import time

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, HERE)
sys.dont_write_bytecode = True

UNITS_DIR = os.path.join(REPO, "public", "art", "units")
TIP_TOL_LU = 0.3
BOX_TOL_LU = 2.0


def shipped_units():
    """{slug: age} of every installed unit sheet (core 1x JSON; skins and copies left out)."""
    out = {}
    for age in sorted(os.listdir(UNITS_DIR)):
        d = os.path.join(UNITS_DIR, age)
        if not os.path.isdir(d):
            continue
        for f in sorted(os.listdir(d)):
            if f.endswith(".json") and f.count(".") == 1 and "@" not in f:
                out[f[:-5]] = age
    return out


def _load(path):
    with open(path) as fh:
        return json.load(fh)


def sheets_of(slug, age):
    """The shipped HD core and extras sheets and the 1x core sheet (extras may be None)."""
    d = os.path.join(UNITS_DIR, age)
    hd = _load(os.path.join(d, f"{slug}.hd.json"))
    x = os.path.join(d, f"{slug}.x.hd.json")
    return hd, (_load(x) if os.path.exists(x) else None), _load(os.path.join(d, f"{slug}.json"))


def wait_for_quiet():
    """On a shared machine (`AGEBORN_LOCKS` names its lock folder): wait while another job holds `quiet` or
    `e2e` (a frame-time measurement, a Playwright suite), so this CPU work never disturbs one."""
    d = os.environ.get("AGEBORN_LOCKS")
    while d and any(os.path.isdir(os.path.join(d, n)) for n in ("quiet", "e2e")):
        time.sleep(20)


def probe_unit(slug, tmp):
    """Runs the unit's render setup and measures every frame (nothing rendered). Returns (mod, rig, clips,
    tracks, probe)."""
    from ageborn_art import pipeline, render
    wait_for_quiet()
    mod = importlib.import_module(f"units.{slug}")
    render.PROBE_ONLY = True
    try:
        pipeline.run_unit(mod, tmp, os.path.join(tmp, "_frames"), log=lambda *a, **k: None, previews=False, v3=True)
    except render.ProbeOnly as done:
        return mod, done.rig, done.clips, done.tracks, done.rig.__dict__["_probe"]
    finally:
        render.PROBE_ONLY = False
    raise RuntimeError(f"{slug}: run_unit returned without reaching the render step")


def _box_px_to_lu(fr, feet, k):
    s = fr["spriteSourceSize"]
    return [(s["x"] - feet[0]) / k, (feet[1] - s["y"] - s["h"]) / k, (s["x"] + s["w"] - feet[0]) / k, (feet[1] - s["y"]) / k]


def _union(a, b):
    if a is None:
        return b
    if b is None:
        return a
    return [min(a[0], b[0]), min(a[1], b[1]), max(a[2], b[2]), max(a[3], b[3])]


def check_unit(slug, mod, rig, clips, tracks, probe, hd, xhd, sd):
    """The self-check against the shipped sheets. Returns {"ok", "errors", "tipMaxLu", "boxMaxLu", ...}."""
    from ageborn_art import config as C, pipeline
    errors = []
    meta = hd["meta"]["ageborn"]
    shipped = dict(meta["clips"])
    frames = dict(hd["frames"])
    if xhd is not None:
        for k, v in xhd["meta"]["ageborn"]["clips"].items():
            shipped.setdefault(k, v)
        frames.update(xhd["frames"])
    feet = list(probe.feet_px)
    if meta.get("feetPx") != feet:
        errors.append(f"feetPx {meta.get('feetPx')} != {feet}")
    if sd["meta"]["ageborn"].get("feetPx") != [feet[0] / 2, feet[1] / 2]:
        errors.append(f"1x feetPx {sd['meta']['ageborn'].get('feetPx')} != {[feet[0] / 2, feet[1] / 2]}")
    sizes = {(f["sourceSize"]["w"], f["sourceSize"]["h"]) for f in frames.values()}
    if sizes != {tuple(probe.canvas)}:
        errors.append(f"canvas {probe.canvas} != the sheet's sourceSize {sorted(sizes)}")
    # nothing outside the canvas is drawn (a plate flying off below the ground, a lance past the edge)
    W, H = probe.canvas
    k = C.PX_PER_LU
    canvas = [-feet[0] / k, (feet[1] - H) / k, (W - feet[0]) / k, feet[1] / k]
    names = [c.name for c in clips]
    for n in shipped:
        if n not in names:
            errors.append(f"{n}: in the sheet, not in the script")
    spec = pipeline.default_outline(mod)
    if spec is not None and not hasattr(mod, "OUTER_OUTLINE"):
        spec = C.UNIT_OUTLINE_V3
    grow = (spec[0] * C.RENDER_SCALE + 1.0) / C.PX_PER_LU if spec is not None else 1.0 / C.PX_PER_LU
    tip_max, box_max, box_where, tip_where = 0.0, 0.0, None, None
    for c in clips:
        s = shipped.get(c.name)
        if s is None:
            errors.append(f"{c.name}: in the script, not in the sheet")
            continue
        m = c.meta()
        for key in ("frames", "sequence", "durationsMs", "impactFrame", "impactAt"):
            if m.get(key) != s.get(key):
                errors.append(f"{c.name}.{key}: script {m.get(key)} != sheet {s.get(key)}")
        ours = {k: v for k, v in (tracks.get(c.name) or {}).items() if not k.startswith("_")}
        theirs = s.get("anchorsLu") or {}
        if set(ours) != set(theirs):
            errors.append(f"{c.name}: trackers {sorted(ours)} != sheet {sorted(theirs)}")
        for k in set(ours) & set(theirs):
            for i, (a, b) in enumerate(zip(ours[k], theirs[k])):
                if b is None:
                    continue
                dev = max(abs(a[0] - b[0]), abs(a[1] - b[1]))
                if dev > tip_max:
                    tip_max, tip_where = dev, f"{c.name}[{i}].{k}"
        reuse = getattr(c, "reuse", None) or {}
        d = probe.data[c.name]
        for i in range(c.frames):
            if i in reuse:
                continue
            base = frames.get(f"{slug}_{c.name}_{i:02d}")
            if base is None:
                errors.append(f"{c.name}[{i}]: no packed frame")
                continue
            want = _box_px_to_lu(base, feet, C.PX_PER_LU)
            team = frames.get(f"{slug}_{c.name}_{i:02d}_team")
            if team is not None and not (team["spriteSourceSize"]["w"] == 1 and team["spriteSourceSize"]["h"] == 1):
                want = _union(want, _box_px_to_lu(team, feet, C.PX_PER_LU))
            g = d["box"][i]
            got = [g[0] - grow, g[1] - grow, g[2] + grow, g[3] + grow] if g else None
            got = _union(got, d["xbox"][i])
            if got is not None:
                got = [max(got[0], canvas[0]), max(got[1], canvas[1]), min(got[2], canvas[2]), min(got[3], canvas[3])]
            if got is None:
                errors.append(f"{c.name}[{i}]: nothing visible")
                continue
            dev = max(abs(a - b) for a, b in zip(got, want))
            if dev > box_max:
                box_max, box_where = dev, f"{c.name}[{i}]"
    if tip_max > TIP_TOL_LU:
        errors.append(f"tracker off by {tip_max:.2f} lu at {tip_where} (limit {TIP_TOL_LU})")
    if box_max > BOX_TOL_LU:
        errors.append(f"silhouette box off by {box_max:.2f} lu at {box_where} (limit {BOX_TOL_LU})")
    return {"ok": not errors, "errors": errors, "tipMaxLu": round(tip_max, 2), "tipAt": tip_where,
            "boxMaxLu": round(box_max, 2), "boxAt": box_where}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--units", default="all", help="all, or a comma-separated list of slugs")
    ap.add_argument("--bundles", action="store_true", help="write public/art/damage/<age>.json")
    ap.add_argument("--aim", action="store_true", help="write aimDeg / release / omni into the shipped sheet JSONs")
    ap.add_argument("--aim-dry", help="write the aim keys every shot clip would get to this JSON (sheets untouched)")
    ap.add_argument("--check-only", action="store_true", help="only the self-check (write nothing)")
    ap.add_argument("--report", help="write the per-unit report (JSON) here")
    ap.add_argument("--keep-failing", action="store_true",
                    help="write bundle entries also for units that fail the self-check")
    args = ap.parse_args()
    from ageborn_art import damage

    ages = shipped_units()
    slugs = sorted(ages) if args.units == "all" else args.units.split(",")
    unknown = [s for s in slugs if s not in ages]
    if unknown:
        sys.exit(f"no installed sheet for {unknown}")
    tmp = tempfile.mkdtemp(prefix="anchors_only_")
    report, entries, failing, dry = {}, {}, [], {}
    t_all = time.time()
    try:
        for slug in slugs:
            t0 = time.time()
            age = ages[slug]
            hd, xhd, sd = sheets_of(slug, age)
            mod, rig, clips, tracks, probe = probe_unit(slug, tmp)
            r = check_unit(slug, mod, rig, clips, tracks, probe, hd, xhd, sd)
            r["age"] = age
            r["seconds"] = round(time.time() - t0, 1)
            report[slug] = r
            if r["ok"] or args.keep_failing:
                entries.setdefault(age, {})[slug] = damage.entry(mod, rig, clips)
            if not r["ok"]:
                failing.append(slug)
            if (args.aim or args.aim_dry) and r["ok"]:
                from ageborn_art import aimdata
                for c in clips:
                    keys = aimdata.aim_keys(rig, c, tracks.get(c.name))
                    if keys:
                        dry[f"{slug}.{c.name}"] = dict(keys, _age=age)
                if args.aim and not args.check_only:
                    r["aim"] = aimdata.rewrite_sheets(slug, age, rig, clips, tracks, UNITS_DIR)
            status = "ok" if r["ok"] else "FAIL " + "; ".join(r["errors"][:3])
            print(f"[{slug}] {age} tips {r['tipMaxLu']} box {r['boxMaxLu']} {r['seconds']} s {status}", flush=True)
            shutil.rmtree(os.path.join(tmp, "_frames"), ignore_errors=True)
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
    if args.bundles and not args.check_only:
        for age, ents in sorted(entries.items()):
            if args.units == "all":
                # a full run owns the whole bundle: units that left the roster (or now fail) drop out
                keep = {}
                if failing:
                    old = damage.read_bundle(age)["units"]
                    keep = {s: e for s, e in old.items() if s in failing and ages.get(s) == age}
                p = damage.write_bundle(age, {**keep, **ents})
            else:
                p = damage.merge_entries(age, ents)
            print(f"wrote {os.path.relpath(p, REPO)} ({len(ents)} units)")
    if args.aim_dry:
        with open(args.aim_dry, "w") as fh:
            json.dump(dry, fh, indent=1)
    if args.report:
        with open(args.report, "w") as fh:
            json.dump(report, fh, indent=1)
    print(f"{len(slugs) - len(failing)} of {len(slugs)} units pass the self-check in {time.time() - t_all:.0f} s"
          + (f"; failing: {', '.join(failing)}" if failing else ""))
    return 1 if failing else 0


if __name__ == "__main__":
    sys.exit(main())
