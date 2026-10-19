#!/usr/bin/env python3
"""Thompson-sampling bandit that suggests the day's content mix (owner question 2026-10-17).

Reads the latest snapshot in state/analytics.csv (written by tools/analyze.py) and the post log in
state/posted.json, scores every grid Reel, and draws the arms for today's slots from each arm's
posterior. Deterministic: the random draw is seeded with the date, so a rerun gives the same answer.

Arms (content types): capsule, duel (short-hook matchup), classic (other battle formats),
question (vote-only Reels) and devlog. A post's arm is its "arm" field in posted.json, or derived
from its name, pillar, format and hook_type.

Score per post: reach/100 * hold  +  10 * (shares + saves) / reach
  hold = the mean of the watch share and the seconds watched / 10 (capped at 1), so short videos are not
  favoured just for being short and long ones not just for being long (weekly review 2026-10-19);
  the bonus makes one share or save per 100 reached worth about as much as that whole term, because
  shares and saves are what breaks the reach ceiling (PLAN B6).

Posterior per arm: normal with known noise. Prior mean = the mean score of all posts, prior weight
= 1 post, noise sd = the spread of all scores (at least 0.1), so an arm with few posts stays uncertain
and still gets tried. Posts younger than 12 h are left out (reach still climbing).

Usage: python3 tools/bandit.py [--slots 2] [--date YYYY-MM-DD]
"""
import csv
import json
import os
import random
import statistics
import sys
from datetime import date

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CSV = os.path.join(ROOT, "state", "analytics.csv")
POSTED = os.path.join(ROOT, "state", "posted.json")
ARMS = ["capsule", "duel", "classic", "question", "devlog"]
MIN_AGE_H = 12
DRAWS = 4000


def arm_of(p):
    if p.get("arm"):
        return p["arm"]
    name, pillar = p.get("name", ""), str(p.get("pillar", "")).lower()
    if "devlog" in pillar or p.get("format") == "devlog":
        return "devlog"
    if "capsule" in name or "rarity reveal" in pillar:
        return "capsule"
    if p.get("hook_type") == "vote":
        return "question"
    if p.get("format") == "short-hook" and p.get("hook_type") == "matchup":
        return "duel"
    return "classic"


def latest_rows():
    rows = list(csv.DictReader(open(CSV)))
    last = max(r["snapshot_utc"] for r in rows)
    return [r for r in rows if r["snapshot_utc"] == last], last


def score(r):
    reach = float(r["reach"] or 0)
    watch = float(r["watch_pct"] or 0) / 100
    secs = min(float(r["avg_watch_ms"] or 0) / 1000 / 10, 1.0)
    hold = (watch + secs) / 2
    acts = float(r["shares"] or 0) + float(r["saved"] or 0)
    return reach / 100 * hold + (10 * acts / reach if reach else 0)


def main():
    args = sys.argv[1:]
    slots = int(args[args.index("--slots") + 1]) if "--slots" in args else 2
    day = args[args.index("--date") + 1] if "--date" in args else date.today().isoformat()
    posts = {p["name"]: p for p in json.load(open(POSTED))["posted"] if p.get("kind", "reel") == "reel"}
    rows, snap = latest_rows()
    data = {a: [] for a in ARMS}
    for r in rows:
        p = posts.get(r["name"])
        if not p or p.get("trial") or float(r["age_h"]) < MIN_AGE_H:
            continue
        data[arm_of(p)].append((r["name"], score(r)))

    every = [s for xs in data.values() for _, s in xs]
    if not every:
        print("no scored posts yet")
        return
    mu0 = statistics.mean(every)
    sd = max(statistics.pstdev(every) if len(every) > 1 else 0.1, 0.1)
    post = {}
    for a in ARMS:
        n = len(data[a])
        mean = (mu0 + sum(s for _, s in data[a])) / (1 + n)
        post[a] = (mean, sd / (1 + n) ** 0.5)

    rng = random.Random(f"ageborn-{day}")
    wins = {a: 0 for a in ARMS}
    for _ in range(DRAWS):
        draw = {a: rng.gauss(m, s) for a, (m, s) in post.items()}
        wins[max(draw, key=draw.get)] += 1
    picks = []
    for _ in range(slots):
        draw = {a: rng.gauss(m, s) for a, (m, s) in post.items()}
        picks.append(max(draw, key=draw.get))

    print(f"Bandit on snapshot {snap} (posts >= {MIN_AGE_H} h, prior mean {mu0:.3f}, noise sd {sd:.3f})")
    print(f"{'arm':9} {'n':>2} {'mean':>6} {'sd':>6} {'P(best)':>8}  posts")
    for a in sorted(ARMS, key=lambda a: -wins[a]):
        m, s = post[a]
        names = ", ".join(f"{nm.split('-', 1)[0]} {sc:.2f}" for nm, sc in data[a]) or "-"
        print(f"{a:9} {len(data[a]):>2} {m:6.3f} {s:6.3f} {wins[a] / DRAWS:8.0%}  {names}")
    print(f"Suggested arms for {day} ({slots} slots): {', '.join(picks)}")


if __name__ == "__main__":
    main()
