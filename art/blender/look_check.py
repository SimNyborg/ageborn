"""Game-scale review numbers of unit sheets (art round W0, item 47 audit 5.2 and 7.3).

  <venv>/bin/python art/blender/look_check.py <sheet>.hd.json [more.hd.json ...] [--ref <dir or git ref>]
      [--frame idle_00] [--all-frames]

Per sheet: the audit's game-scale metrics (flat share, micro, edge density, highlight share; look2d.game_metrics)
of one frame (default idle 0) or the mean over every base frame, the A11 colour rule on the encoded sheets (core
and extras, HD and 1x), and, with --ref (a directory with public/art/units/... or a git ref such as HEAD or
main), the silhouette area per frame and the sheet pixels against the reference sheet. Floors from the audit
(5.2): infantry and ranged flat <= 0.20, micro >= 4.3, edge >= 0.52, highlight 0.06-0.10; cavalry, beasts and
flyers flat <= 0.28; war machines flat <= 0.30, micro >= 3.4, edge >= 0.45, highlight >= 0.06.
Needs numpy and Pillow only (no Blender).
"""
import argparse
import json
import os
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
sys.path.insert(0, HERE)
sys.dont_write_bytecode = True


def ref_sheet(path, ref):
    """The reference copy of `path` (a sheet json under public/art/units) from a directory or a git ref."""
    rel = os.path.relpath(os.path.abspath(path), ROOT)
    if not rel.startswith("public"):
        rel = os.path.join("public", "art", "units", *os.path.abspath(path).split(os.sep)[-2:])
    if os.path.isdir(ref):
        p = os.path.join(ref, rel)
        return p if os.path.exists(p) else None
    tmp = tempfile.mkdtemp(prefix="lookref_")
    for f in (rel, rel[:-5] + ".png"):
        r = subprocess.run(["git", "-C", ROOT, "show", f"{ref}:{f}"], capture_output=True)
        if r.returncode:
            return None
        with open(os.path.join(tmp, os.path.basename(f)), "wb") as fh:
            fh.write(r.stdout)
    return os.path.join(tmp, os.path.basename(rel))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("sheets", nargs="+")
    ap.add_argument("--ref", default=None)
    ap.add_argument("--frame", default=None)
    ap.add_argument("--all-frames", action="store_true")
    args = ap.parse_args()
    import numpy as np
    from ageborn_art import look2d
    out = {}
    for path in args.sheets:
        fr, d = look2d.frames_of(path)
        a = d["meta"]["ageborn"]
        slug = a["visualId"].split(".", 1)[1]
        res = {"sheetPx": [d["meta"]["size"]["w"], d["meta"]["size"]["h"]]}
        if args.all_frames:
            ms = [look2d.game_metrics(look2d.composite(fr[n], fr.get(n + "_team")), a["pxPerLu"])
                  for n in fr if not n.endswith("_team") and fr[n][..., 3].max() > 0]
            res["metricsMean"] = {k: round(float(np.mean([m[k] for m in ms])), 3) for k in ms[0]}
        else:
            name = args.frame and f"{slug}_{args.frame}" or f"{slug}_idle_00"
            if name in fr:
                res["metrics"] = look2d.game_metrics(look2d.composite(fr[name], fr.get(name + "_team")), a["pxPerLu"])
        rule = {}
        for suffix in ("", ".x"):
            for dens in (".hd", ""):
                p = path.replace(".hd.json", f"{suffix}{dens}.json")
                if os.path.exists(p):
                    pct, worst = look2d.sheet_rule(p)
                    rule[os.path.basename(p)] = [round(pct, 2), worst]
        res["colourRuleEncoded"] = rule
        if args.ref:
            rp = ref_sheet(path, args.ref)
            if rp:
                rf, rd = look2d.frames_of(rp)
                rslug = rd["meta"]["ageborn"]["visualId"].split(".", 1)[1]
                ratios = []
                for n in fr:
                    if n.endswith("_team"):
                        continue
                    other = rslug + n[len(slug):]
                    if other in rf:
                        sb = look2d.silhouette(rf, other).sum()
                        if sb:
                            ratios.append((look2d.silhouette(fr, n).sum() / sb, n[len(slug) + 1:]))
                if ratios:
                    res["silhouetteVsRef"] = {"min": [round(min(ratios)[0], 3), min(ratios)[1]],
                                              "max": [round(max(ratios)[0], 3), max(ratios)[1]],
                                              "mean": round(float(np.mean([r for r, _ in ratios])), 3)}
                res["sheetPxVsRef"] = round(res["sheetPx"][0] * res["sheetPx"][1] /
                                            (rd["meta"]["size"]["w"] * rd["meta"]["size"]["h"]), 4)
                rname = f"{rslug}_{args.frame or 'idle_00'}"
                if rname in rf:
                    res["refMetrics"] = look2d.game_metrics(look2d.composite(rf[rname], rf.get(rname + "_team")),
                                                            rd["meta"]["ageborn"]["pxPerLu"])
        out[os.path.basename(path)] = res
    print(json.dumps(out, indent=1))


if __name__ == "__main__":
    main()
