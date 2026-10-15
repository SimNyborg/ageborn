# Studio runbook (how the daily loop runs)

Written 2026-10-14 by the Studio session. The brief (`docs/BRIEF.md`) wins where they differ.

## Setup in a fresh container

```
cd /home/user/ageborn && git fetch origin social-media
git worktree add /tmp/soc origin/social-media 2>/dev/null; cd /tmp/soc
git checkout -B social-media origin/social-media
```

Rendering in a fresh container (about 2 min of setup; `public/`, `out/` and `node_modules/` are not in git):

```
(cd /home/user/ageborn && npm ci) & (cd /tmp/soc/studio && npm ci) & pip install -q numpy pillow; wait
cd /tmp/soc/studio && mkdir -p public/fonts public/audio public/art/cut out/reels out/sheets work
cp node_modules/@fontsource/barlow-condensed/files/barlow-condensed-latin-*-*.woff2 \
   node_modules/@fontsource/inter/files/inter-latin-*-normal.woff2 public/fonts/
for c in mammoth_matriarch lindworm star_leviathan ursa_paladin; do
  python3 tools/cutout.py $c attack 6 2f7df6 public/art/cut/$c-attack.png; done
nohup node scripts/server.mjs > /tmp/server.log 2>&1 &
bash scripts/record-batch.sh r1 r5      # then: node scripts/make.mjs r1 (one render at a time)
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
2. Plan today: 2 grid Reels (owner decision 2026-10-14: start with 2), jittered in 11:30-13:30 and
   19:00-21:30 Copenhagen, plus a Trial Reel when spare content exists. Go to 3 a day only when median
   reach per post holds within 20% of the week before and the queue is at least 2 days ahead; tell the
   owner when that happens.
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
- 2026-10-14 21:08 UTC: access works again (GET /me and /me/media OK). The owner checked the Meta app;
  no alerts were shown and the cause is unknown. R3 is held for the next grid slot.
