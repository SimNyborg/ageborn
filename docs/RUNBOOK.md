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
# capture from a pinned, known-good game commit (main-ipy06f is under active development again);
# move the pin only when the orchestrator says a newer commit is published to main and green
# (2026-10-17: moved 1b48e80 -> 63d5865, game round 2: six new capsule backdrops, six base models,
# the Home diorama, emotes. Never show the backdrops Glacier Valley or Desert Airbase: released: false.)
# 2026-10-20: at 1b48e80 the capture's default `scenes=best` dresses Stone in Glacier Valley and Modern in
# Desert Airbase. R1, R4, R5 and devlog #1 went out with Glacier Valley; R13 was held. Until /tmp/game-capture
# is at 63d5865, add `&scenes=game` to every capture query, and frame-check every Stone or Modern shot
# against public/art/backdrops/{stone/glacier_valley,modern/desert_airbase}/thumb.webp before it is queued.
git -C /home/user/ageborn fetch -q origin main; git -C /home/user/ageborn worktree add /tmp/game-capture 63d5865
export AGEBORN_REPO=/tmp/game-capture
(cd /tmp/game-capture && npm ci) & (cd /tmp/soc/studio && npm ci) & pip install -q numpy pillow; wait
cd /tmp/soc/studio && mkdir -p public/fonts public/audio public/art/cut out/reels out/sheets work
cp node_modules/@fontsource/barlow-condensed/files/barlow-condensed-latin-*-*.woff2 \
   node_modules/@fontsource/inter/files/inter-latin-*-normal.woff2 public/fonts/
for c in mammoth_matriarch lindworm star_leviathan ursa_paladin; do
  python3 tools/cutout.py $c attack 6 2f7df6 public/art/cut/$c-attack.png; done
AGEBORN_REPO=/tmp/game-capture nohup node scripts/server.mjs > /tmp/server.log 2>&1 &
bash scripts/record-batch.sh r1 r5      # then: node scripts/make.mjs r1 (one render at a time)
```

All Instagram calls go through `tools/ig.py` (token from `IG_ACCESS_TOKEN`, never printed):
`me`, `media`, `quota`, `reel PATH CAPTION_FILE [--trial] [--cover PATH]`, `insights ID`.

## Posting one item (when a scheduled "STUDIO POST" message fires)

1. `git pull` in /tmp/soc. Check `tools/ig.py media 5` so the item is not already live.
2. Make sure the file is pushed to `social-media` (raw URL must resolve).
3. `python3 tools/ig.py reel queue/reels/<name>.mp4 queue/captions/<name>.txt --cover queue/reels/<name>-cover.jpg`
4. Append to `state/posted.json` (id, permalink, timestamp, name, kind, pillar, hook, trial, and the test
   fields `length_s`, `format`, `hook_type`, `experiment` from `queue/meta.json`; see `tools/analyze.py`).
5. `git rm` the mp4, cover and caption file, commit "Studio: posted <name>", push to `social-media`.

## Daily run (cron, about 08:4x Copenhagen)

1. `python3 tools/analyze.py` (insights snapshot for every post -> `state/analytics.csv`, plus medians per
   test variable). Use its output for the plan and the evening status.
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

## Testing plan (what to post to learn the most)

One main variable per week; decide on medians of at least 3 grid posts per variant older than 24 h
(`tools/analyze.py` marks groups that are too small). Main signals: watch_pct (share of the video
watched), share_rate, eng_rate, reach. Followers per post are not available from the API, so watch
`followers_count` per day alongside.

- Week 1 (from 2026-10-16): **format**. "classic" (intro, 13-24 s) vs "short-hook" (cold open on the
  action, 8-12 s). Baseline after 4 classic posts: watch_pct 15-37 %, the longest (24 s) lowest.
- Week 2: **hook_type** within the winning format (matchup vs reveal vs vote vs satisfying).
- Week 3: **slot** (midday vs evening) and length within the winner.
- Trial Reels: same clip, a different first 2 seconds or title, to test hooks without touching the grid.

## Content direction (from the first week)

Owner note 2026-10-27, before/after Reels: the "before" must look clearly bad and the "after" clearly good, so
the improvement is obvious at a glance on a phone. A "before" that is only the current version with a few features
switched off is not bad enough (the capsule layer-by-layer devlog was criticised for this).
- Use the real old version when it exists and is clearly worse (an older game commit, filmed the same way).
- Otherwise build the "before" as a stripped-down, plainly bad version: no art (grey boxes or flat shapes), no
  animation (frozen or stepped poses), no effects, no sound, flat lighting. Show it long enough to register (2-3 s).
- Then the "after" with everything on, ideally the same moment, and a hard cut or a wipe between them.
- If the difference is still subtle after that, do not make it a before/after; pick another subject.
- The story may dramatize the "before" (owner note 2026-10-18), but never present a rebuilt "before" as a dated
  screenshot of the real past ("this is what it looked like in June"); say "at the start" or "step 0" instead.

Owner note 2026-10-26: every Reel is narrated (no music-only Reels). Music sits low (about -15 dB) with a soft fade-in;
nothing loud or sudden in the first second (no slam or explosion on frame 0).
Owner direction 2026-10-22: the account is an indie developer's channel. Every Reel shows a development question
or the game getting better (before/after, a fix, a balance test, a new feature), told in first person. See PLAN.

The first 3 seconds decide reach: Instagram ranks Reels by skip rate (viewers gone within 3 s), then share,
like, save, repost and comment rates per view (owner note 2026-10-19). Every Reel must earn its first 3 s:
movement and a clear question or problem in frame 0, no slow build-up. `tools/analyze.py` shows skip%.

Open cold on the most dramatic moment (impact, explosion, reveal) with the title over the action;
no intro shots; 8-12 s; a question on screen in the first second; short end card (1.5 s).
`shots/duel.mjs` + `reels/duel.mjs` make "1 Legendary vs N" duels in this format: scout with
`tools/scout.ts`, add a `shots/rN.mjs` + `reels/rN.mjs` pair, record, make, frame-check.

## Daily Story (owner request 2026-10-16)

One Story a day, around 15:30-17:30 Copenhagen (between the two grid Reels), jittered, scheduled by the
daily run with send_later as "STUDIO STORY: ...". Publish with `python3 tools/ig.py story <path>`, log it
in `state/posted.json` (kind "story"), then delete the file. 1080x1920, text inside the safe zone.

What the API cannot do (checked 2026-10-16): no poll, question, link or mention stickers, and no way to
add a Story to a Highlight. So Stories must work without stickers ("reply with 1 or 2" works through DMs,
"tap to watch" does not), and Highlights are added by the owner in the app (Stories stay in the archive).

Story ideas, rotating: a 5-7 s cold-open teaser of tonight's Reel ("Tonight: 1 Hydra vs 5 Hoplites"),
"which age would you play?" splits, a Legendary card still with its stats, a capsule reveal moment,
a behind-the-scenes still (an unfinished unit, a new backdrop) without the owner's identity.
Do not post `queue/stories/teaser-40-cavemen.mp4`: its "tap to watch" cannot work without a link sticker.

## Devlog pillar (owner request 2026-10-16, inspired by a devlog account the owner likes)

Format: first-person developer voice ("I'm building Ageborn...", never the owner's name or identity),
narrated with an approved Kokoro voice and word-timed captions, over real development footage, ending
with a design question to the viewer ("Which would you pick?", "Too fast or just right?").
No AI-voice line in captions (owner decision 2026-10-19: it takes focus from the message). Story first (owner note 2026-10-18): a good game-dev story
about a fun or important development problem matters more than retelling exactly what happened. Build
each episode on a real kind of problem (balance, readability, game feel, pacing, art, AI opponents) and
use the game repo's docs for material, then dramatize freely. Two limits: no invented numbers presented
as hard facts, and never claim the community decided something unless their votes were really used.

Episode ideas, each 20-35 s (each framed as a problem: "I had a problem...", "This broke my game..."):
1. "Why every age is 1.35x stronger" (A2.2 power scale): a caveman vs a Cosmic tank, and why
   counters, not numbers, decide fights (R1 footage plus the sim's numbers).
2. "Eight ages, one lane": how a single battle can climb from clubs to lasers, and the hardest
   part of making every age feel different (art, music, units).
3. "Making the bear knight": the Ursa Paladin from sprite sheet to animated unit (cut-outs,
   frames side by side, then in battle).
4. "Comeback tools" (A2.11): how a losing player can still turn a match, shown in a real battle.
5. "Making the capsule feel amazing": the hammer strikes, the rising tones and the burst, and what
   was tuned to make an opening satisfying.

Test plan: post 3 devlogs in week 2 as their own variant (format "devlog") against the short duels,
first as Trial Reels if reach is a worry. Measure watch_pct and comments especially.

### Devlog storytelling (owner request 2026-10-16: it must feel like the viewer helps build the game)

Every devlog is one small story with a real open decision, not a feature tour:
1. Hook (0-2 s): a problem or tension, shown, not explained. "This bear knight was broken." "I almost
   deleted this age." Never open on a logo or a greeting.
2. Stakes (2-8 s): why it matters to a player, in one sentence, over footage that shows it.
3. Journey (8-25 s): what was tried, with honest before/after footage, including what did not work.
4. Open decision (last 5 s): a real choice that is still open, as two clear options on screen
   ("A or B? Comment below"). Never ask about something already decided.
5. Close the loop: the next episode starts with the result ("Last time 64% of you picked B. Here it
   is."). Only claim the community decided something if their votes really were used.

Making the votes real: tally the comments on each devlog in the evening status; write the result
to `docs/community-votes.md` and pass it to the game as a suggestion through the game repo's
`docs/requests/` (the owner decides). Choices the studio controls fully (which unit or age gets the
next episode, which matchup to film, a unit's nickname) can be decided by the votes directly.
Voice: warm, curious, a bit self-deprecating, first person "I", short sentences, no hype words.
Series label on screen: "Devlog #N" so viewers follow the thread.

## Messaging (owner note 2026-10-16)

Lead with the game itself and its development: battles, ages, units, capsules, how things were made
and why. Do not use "nothing is for sale", "every card earned" or similar monetisation lines in
videos, end cards or captions; they are not a selling point for this audience.
- 2026-10-22 18:43 UTC: API returned OAuthException 190 'You cannot access the app till you log in to www.instagram.com and follow the instructions given' (an Instagram checkpoint). R14 not posted; owner asked to log in and clear it.
- 2026-10-27: the daily run (07:47 UTC) reached the session only at 21:23 UTC with the evening status; no posts or story went out on 2026-10-27. Cause unknown (scheduler delivery). Queue was empty apart from DV6 (held).
