#!/usr/bin/env python3
"""Post analysis for the Ageborn studio.

Fetches the current insights for every post in state/posted.json, appends a snapshot to
state/analytics.csv, and prints a comparison per test variable (medians, with n). The token comes
from IG_ACCESS_TOKEN via tools/ig.py and is never printed.

Each post in state/posted.json should carry these fields (the daily run fills them when it posts):
  length_s    video length in seconds
  format      e.g. "classic" (intro, 13-24 s) or "short-hook" (cold open, 8-12 s)
  hook_type   e.g. "matchup", "reveal", "vote", "satisfying", "evolution"
  slot        "midday" or "evening" (derived from the timestamp when missing)
  experiment  the variable under test that week, e.g. "format"
  trial       true for Trial Reels

Usage: python3 tools/analyze.py [--no-save]
Metrics per post:
  reach, views, watch_pct  = average watch time / length (how much of the video people see)
  eng_rate   = (likes + comments + saves + shares) / reach
  share_rate = shares / reach
  age_h      = hours since posting (posts under 24 h are shown but not used in the medians)
"""
import csv
import json
import os
import statistics
import subprocess
import sys
from datetime import datetime, timezone

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
POSTED = os.path.join(ROOT, "state", "posted.json")
CSV = os.path.join(ROOT, "state", "analytics.csv")
FIELDS = ["snapshot_utc", "media_id", "name", "age_h", "format", "hook_type", "slot", "length_s",
          "trial", "views", "reach", "skip_pct", "likes", "comments", "saved", "shares", "avg_watch_ms",
          "watch_pct", "eng_rate", "share_rate"]
GROUP_BY = ["format", "hook_type", "slot", "pillar"]
MIN_AGE_H = 24
MIN_N = 3


def insights(media_id):
    out = subprocess.run([sys.executable, os.path.join(ROOT, "tools", "ig.py"), "insights", media_id],
                         capture_output=True, text=True)
    if out.returncode:
        return None
    return {m["name"]: m["values"][0]["value"] for m in json.loads(out.stdout)["data"]}


def slot_of(ts):
    # Copenhagen is UTC+2 until 25 Oct, then UTC+1; midday vs evening is clear either way
    return "midday" if datetime.fromisoformat(ts.replace("+0000", "+00:00")).hour < 15 else "evening"


def main():
    save = "--no-save" not in sys.argv
    now = datetime.now(timezone.utc)
    posts = json.load(open(POSTED))["posted"]
    rows = []
    for p in posts:
        if p.get("kind", "reel") != "reel":
            continue  # Stories have their own short-lived metrics
        d = insights(p["id"])
        if d is None:
            print(f"! no insights for {p['name']}")
            continue
        posted_at = datetime.fromisoformat(p["timestamp"].replace("+0000", "+00:00"))
        reach = d.get("reach") or 0
        length = p.get("length_s")
        acts = sum(d.get(k) or 0 for k in ("likes", "comments", "saved", "shares"))
        rows.append({
            "snapshot_utc": now.strftime("%Y-%m-%dT%H:%MZ"), "media_id": p["id"], "name": p["name"],
            "age_h": round((now - posted_at).total_seconds() / 3600, 1),
            "format": p.get("format", "?"), "hook_type": p.get("hook_type", "?"),
            "slot": p.get("slot") or slot_of(p["timestamp"]), "length_s": length or "",
            "trial": p.get("trial", False), "pillar": p.get("pillar", "?"),
            "views": d.get("views"), "reach": reach, "skip_pct": d.get("reels_skip_rate", ""), "likes": d.get("likes"), "comments": d.get("comments"),
            "saved": d.get("saved"), "shares": d.get("shares"), "avg_watch_ms": d.get("ig_reels_avg_watch_time"),
            "watch_pct": round(d.get("ig_reels_avg_watch_time", 0) / 10 / length, 1) if length else "",
            "eng_rate": round(acts / reach, 4) if reach else 0,
            "share_rate": round((d.get("shares") or 0) / reach, 4) if reach else 0,
        })

    print(f"{'post':38} {'age_h':>6} {'reach':>6} {'skip%':>6} {'watch%':>7} {'eng':>6} {'share':>6}  format/hook")
    for r in sorted(rows, key=lambda r: r["age_h"], reverse=True):
        print(f"{r['name'][:38]:38} {r['age_h']:>6} {r['reach']:>6} {str(r['skip_pct']):>6} {str(r['watch_pct']):>7} "
              f"{r['eng_rate']:>6} {r['share_rate']:>6}  {r['format']}/{r['hook_type']}")

    mature = [r for r in rows if r["age_h"] >= MIN_AGE_H and not r["trial"]]
    print(f"\nMedians over grid posts older than {MIN_AGE_H} h (n = number of posts; "
          f"decide only where every group has n >= {MIN_N}):")
    for key in GROUP_BY:
        groups = {}
        for r in mature:
            groups.setdefault(r[key], []).append(r)
        if len(groups) < 2:
            continue
        print(f"  by {key}:")
        for g, rs in sorted(groups.items()):
            med = lambda f: statistics.median([x[f] for x in rs if x[f] != ""]) if any(x[f] != "" for x in rs) else "-"
            flag = "" if len(rs) >= MIN_N else "  (too few to decide)"
            print(f"    {g:14} n={len(rs)}  reach {med('reach')}  skip% {med('skip_pct')}  watch% {med('watch_pct')}  "
                  f"eng {med('eng_rate')}  share {med('share_rate')}{flag}")

    if save and rows:
        new = not os.path.exists(CSV) or open(CSV).readline().strip().split(",") != FIELDS
        if new and os.path.exists(CSV):
            os.replace(CSV, CSV.replace(".csv", "-v1.csv"))
        with open(CSV, "a", newline="") as f:
            w = csv.DictWriter(f, fieldnames=FIELDS, extrasaction="ignore")
            if new:
                w.writeheader()
            w.writerows(rows)
        print(f"\nsnapshot appended to {os.path.relpath(CSV, ROOT)}")


if __name__ == "__main__":
    main()
