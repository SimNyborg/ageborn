#!/usr/bin/env bash
# Posts one queued item end to end (publish, log in state/posted.json, git rm, commit, push), detached from the
# agent so a worker restart cannot cut it off. `setsid nohup bash tools/post_item.sh reel <key> <pillar> "<hook>" &`
# or `... story <name> <pillar> "<hook>"`. Writes state/last-post.log. Never prints the token.
set -u
cd "$(dirname "$0")/.."
kind="$1"; key="$2"; pillar="$3"; hook="$4"
log=state/last-post.log
exec >>"$log" 2>&1
echo "=== $(date -u +%FT%TZ) $kind $key"
if [[ "$kind" == reel ]]; then
  if python3 tools/ig.py media 10 | grep -q "$(head -1 queue/captions/$key.txt | cut -c1-40)"; then echo "already live, skipping"; exit 0; fi
  out=$(python3 tools/ig.py reel "queue/reels/$key.mp4" "queue/captions/$key.txt" --cover "queue/reels/$key-cover.jpg" | tail -1)
else
  out=$(python3 tools/ig.py story "queue/stories/$key.jpg" | tail -1)
fi
echo "$out"
python3 - "$kind" "$key" "$pillar" "$hook" "$out" <<'PY' || exit 1
import json, sys
kind, key, pillar, hook, out = sys.argv[1:]
r = json.loads(out)
assert r.get("id"), out
m = json.load(open("queue/meta.json"))
meta = m.pop(key, {})
json.dump(m, open("queue/meta.json", "w"), indent=2)
d = json.load(open("state/posted.json"))
d["posted"].append({"id": r["id"], "permalink": r.get("permalink"), "timestamp": r.get("timestamp"), "name": key, "kind": kind, "pillar": pillar, "hook": hook, "trial": False, **meta})
json.dump(d, open("state/posted.json", "w"), indent=1)
PY
if [[ "$kind" == reel ]]; then git rm -q "queue/reels/$key.mp4" "queue/reels/$key-cover.jpg" "queue/captions/$key.txt"; else git rm -q "queue/stories/$key.jpg"; fi
git add queue/meta.json state/posted.json
git commit -qm "Studio: posted $key" && git push -q origin social-media
echo "done"
