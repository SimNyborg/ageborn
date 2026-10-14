# Studio runbook (how the daily loop runs)

Written 2026-10-14 by the Studio session. The brief (`docs/BRIEF.md`) wins where they differ.

## Setup in a fresh container

```
cd /home/user/ageborn && git fetch origin social-media
git worktree add /tmp/soc origin/social-media 2>/dev/null; cd /tmp/soc
git checkout -B social-media origin/social-media
```

All Instagram calls go through `tools/ig.py` (token from `IG_ACCESS_TOKEN`, never printed):
`me`, `media`, `quota`, `reel PATH CAPTION_FILE [--trial] [--cover PATH]`, `insights ID`.

## Posting one item (when a scheduled "STUDIO POST" message fires)

1. `git pull` in /tmp/soc. Check `tools/ig.py media 5` so the item is not already live.
2. Make sure the file is pushed to `social-media` (raw URL must resolve).
3. `python3 tools/ig.py reel queue/reels/<name>.mp4 queue/captions/<name>.txt --cover queue/reels/<name>-cover.jpg`
4. Append to `state/posted.json` (id, permalink, timestamp, name, kind, pillar, hook, trial).
5. `git rm` the mp4, cover and caption file, commit "Studio: posted <name>", push to `social-media`.

## Daily run (cron, about 08:4x Copenhagen)

1. Insights for posts from the last 7 days -> `state/analytics.csv` (one row per post per day).
2. Plan today: 2 grid Reels (11:30-13:30 and 18:30-21:30 Copenhagen, jittered) plus up to 2 Trial Reels.
3. Keep at least 2 days of finished, frame-checked content in `queue/`; render what is missing.
4. Schedule each post with `send_later` (message starts with "STUDIO POST:" and names the file).

## Evening status (cron, about 21:5x Copenhagen)

Short Danish status for the owner: what went out today, numbers, what was learned, what comes next.
No em dashes. Never mention the owner's identity.

## Incident log

- 2026-10-14 18:42 UTC: every Graph API call (GET /me, /me/media, content_publishing_limit) returns
  `OAuthException code 200 "API access blocked."`. R3 was not published and stays in queue/.
  Waiting for the owner to check the Meta app "Ageborn Publisher" and the Instagram account.
  Before any post, run `tools/ig.py me`; if it still fails, do not retry in a loop.
