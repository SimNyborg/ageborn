#!/usr/bin/env python3
"""Instagram Graph API helper for the Ageborn studio.

The access token is read from IG_ACCESS_TOKEN and is never printed: every
error message is scrubbed before it is shown.

Usage:
  ig.py me                       account summary
  ig.py media [N]                latest N posts (default 25)
  ig.py quota                    content publishing limit
  ig.py reel PATH CAPTION_FILE [--trial] [--cover PATH]
                                 publish a Reel from a file on the
                                 social-media branch (must be pushed first)
  ig.py insights MEDIA_ID        insights for one post (JSON)
"""
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

API = "https://graph.instagram.com/v24.0"
IG_ID = "17841467187927379"
RAW = "https://raw.githubusercontent.com/SimNyborg/ageborn/social-media/"
TOKEN = os.environ.get("IG_ACCESS_TOKEN", "")
INSIGHT_METRICS = ("views,reach,likes,comments,saved,shares,total_interactions,"
                   "follows,profile_visits,ig_reels_avg_watch_time,"
                   "ig_reels_video_view_total_time")


def scrub(text):
    return text.replace(TOKEN, "***") if TOKEN else text


def call(method, path, params=None):
    params = dict(params or {})
    params["access_token"] = TOKEN
    data = urllib.parse.urlencode(params)
    url = f"{API}/{path}"
    if method == "GET":
        req = urllib.request.Request(f"{url}?{data}")
    else:
        req = urllib.request.Request(url, data=data.encode(), method="POST")
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        body = scrub(e.read().decode(errors="replace"))
        raise SystemExit(f"HTTP {e.code} on {method} {path}: {body}")
    except urllib.error.URLError as e:
        raise SystemExit(scrub(f"Network error on {method} {path}: {e}"))


def wait_finished(container, timeout=600):
    start = time.time()
    while time.time() - start < timeout:
        st = call("GET", container, {"fields": "status_code,status"})
        code = st.get("status_code")
        if code == "FINISHED":
            return
        if code in ("ERROR", "EXPIRED"):
            raise SystemExit(f"Container {container} failed: {json.dumps(st)}")
        time.sleep(5)
    raise SystemExit(f"Container {container} not finished after {timeout}s")


def publish(container):
    for attempt in range(4):
        try:
            return call("POST", f"{IG_ID}/media_publish", {"creation_id": container})["id"]
        except SystemExit as e:
            if "9007" in str(e) and attempt < 3:
                time.sleep(10)
                continue
            raise


def reel(path, caption_file, trial=False, cover=None):
    caption = open(caption_file, encoding="utf-8").read().strip()
    params = {"media_type": "REELS", "video_url": RAW + path,
              "caption": caption, "share_to_feed": "true"}
    if cover:
        params["cover_url"] = RAW + cover
    if trial:
        params["trial_params"] = json.dumps({"graduation_strategy": "SS_PERFORMANCE"})
    container = call("POST", f"{IG_ID}/media", params)["id"]
    wait_finished(container)
    media_id = publish(container)
    info = call("GET", media_id, {"fields": "id,permalink,timestamp"})
    print(json.dumps(info))


def main(argv):
    if not TOKEN:
        raise SystemExit("IG_ACCESS_TOKEN is not set")
    cmd = argv[1] if len(argv) > 1 else "me"
    if cmd == "me":
        print(json.dumps(call("GET", "me", {"fields": "user_id,username,followers_count,media_count"})))
    elif cmd == "media":
        n = argv[2] if len(argv) > 2 else "25"
        d = call("GET", "me/media", {"fields": "id,caption,media_type,permalink,timestamp", "limit": n})
        for m in d.get("data", []):
            cap = (m.get("caption") or "").replace("\n", " ")[:70]
            print(m["timestamp"], m["id"], m["media_type"], m["permalink"], cap)
    elif cmd == "quota":
        print(json.dumps(call("GET", f"{IG_ID}/content_publishing_limit", {"fields": "config,quota_usage"})))
    elif cmd == "reel":
        args = argv[2:]
        trial = "--trial" in args
        cover = None
        if "--cover" in args:
            cover = args[args.index("--cover") + 1]
        pos = [a for i, a in enumerate(args)
               if not a.startswith("--") and (i == 0 or args[i - 1] != "--cover")]
        reel(pos[0], pos[1], trial=trial, cover=cover)
    elif cmd == "insights":
        print(json.dumps(call("GET", f"{argv[2]}/insights", {"metric": INSIGHT_METRICS})))
    else:
        raise SystemExit(__doc__)


if __name__ == "__main__":
    main(sys.argv)
