# Living content plan

Updated by every daily run (and when the owner gives direction). The daily run reads
`python3 tools/analyze.py`, updates this file, and picks the day's posts from it. Keep it short:
what we believe, how sure we are, and what we post next because of it.

## How the mix is chosen

- **Exploit about 60%:** post more of the content type with the best evidence (see Beliefs).
- **Explore about 40%:** test the open questions, one main variable at a time.
- A belief moves from "signal" to "confirmed" only with at least 3 grid posts per variant older than
  24 h. A confirmed winner gets more slots; a confirmed loser is dropped or reworked, never repeated
  unchanged.
- Main signals, in order: reach (is Instagram showing it to new people), watch % (does it hold
  them), shares and saves (would they send it on), comments. Followers per day from `GET /me`.
- Owner direction overrides the numbers (see Owner notes).

## Beliefs (as of 2026-10-21 morning, 14 Reels, all small numbers)

| # | Belief | Evidence | Status |
|---|---|---|---|
| B1 | Capsule openings reach the most people | R6 124, R9 133, but R10 only 45 (third capsule video in 4 days) | weakened: works when spaced out and varied; repeats are penalised |
| B2 | Shorter Reels are watched further | short duels 39-53 % vs classic 16-37 % | confirmed for watch share (n=5 vs 6), not for reach |
| B3 | A question to the viewer gets reactions but not reach on its own | R5: highest engagement, reach 32 | signal |
| B4 | Nothing gets shared yet | 0 shares on all 14 posts; 1 save (devlog #2) | problem to solve (week-2 test) |
| B5 | Posting time matters | evening 120 vs midday 110 median reach | unknown |
| B6 | Reach is capped at about 110-160 per post | devlog #1 162 and R11 147 are the highs; nothing breaks out | signal |
| B7 | Devlogs score best overall | DV1 162 reach, lowest skip of the battle-free posts, most seconds watched; bandit 68 % best (n=2) | signal, strongest |
| B8 | Followers grow on devlog days | 107 flat all week, then 109, 110, 116 after the two devlogs | signal (n small) |

## Current mix (until the next update)

- Per day: 2 grid Reels + 1 Story. The bandit (tools/bandit.py, now with the "ask" arm) picks the arms each morning.
- Exploit: devlogs (narrated, story first, an open question) get one slot most days; short duels are the steady
  second slot.
- Explore: the indie-dev ask (IA1, 2026-10-21) and plot-twist content (DV3) for shares; capsules at most every
  third day and visibly different from the last one.
- Stories: teasers of the evening Reel.

## Next decisions

- Voice: the owner prefers the ElevenLabs voice "Steve"; the free tier is blocked from this cloud session and its
  terms forbid commercial use without attribution, so it needs the Starter plan (owner's decision, asked 2026-10-19).
  Kokoro bm_george until then. A connector "Social media studio" is half set up (owner told 2026-10-20).

- Experiment queued (owner idea 2026-10-19): "indie dev asks for help". 15-20 s, narrated, first person
  ("I'm one person making this game..."), cold open on a big battle moment, fast cuts across ages, ending on
  a personal ask to send it to one friend who would play it. Avoid the explicit "like, comment, share" list
  (engagement bait is demoted by Meta) and the "just tap share" trick (only sent shares count). Measure
  share rate and skip rate against the other arms. Make on 2026-10-20, post by 2026-10-21.

- Week 2 (from 2026-10-19, see docs/weekly-2026-10-19.md): test shareability; 3 devlogs; first shares or
  saves and one post above 200 reach are the success signals.

- No multi-variable regression before about 150 posts (too little data, high noise); the bandit
  (tools/bandit.py, built 2026-10-18) picks the mix until then.

- After 3 devlogs: do they get comments and shares? If yes, give them a fixed weekly slot.
- If reach per post falls more than 25 % for a week: tell the owner and change course.
- Idea for B4 (shares): a "plot twist" duel. With 7 Riveters the Land Dreadnought falls, its crew bails out
  as two Carbineers and wins anyway. Needs its own shot (follow the crew after the hero dies).

## Owner notes (direction that overrides the numbers)

- 2026-10-14: 2 Reels a day to start; go to 3 only when reach holds and the queue is 2 days ahead.
- 2026-10-16: a daily Story; devlogs with strong storytelling where viewers feel they help build the
  game; drop "nothing for sale" messaging, focus on the game and its development; capsule videos
  are interesting, make them very satisfying.

- 2026-10-18: devlogs are story first: fun and important game-dev problems matter more than exactly
  what happened (keep no fake numbers as facts and no fake community decisions).

- 2026-10-19: no AI-voice line in captions; keep captions about the game and fewer precautions in general.

- 2026-10-20: the no-growth-hacks rule is removed (docs/BRIEF.md rule 2); the API still cannot follow or cold-DM,
  and risky tactics go to the owner first.

## Change log

- 2026-10-17: plan created from the first 7 Reels (B1-B5).
- 2026-10-17: R9 (Aeon capsule) early numbers strengthen B1 and B2. Today: R7 and R8 (first short-hook
  duels, the format test); next capsule Reel scheduled for 2026-10-18 to keep the every-other-day rule.
  Queued for 2026-10-18: R10 "10 capsules at once" (capsule, 18 s) and R11 "1 Land Dreadnought vs 6
  Riveters" (third short-hook duel, completes n=3 for the format test). First devlog planned for Monday.
- 2026-10-17 evening: R7 (short duel) 51 % watch strengthens B2; new B6 (reach ceiling about 120). No change to the
  mix yet: the format test needs R8 and R11 older than 24 h (Monday review). Still 0 shares and 0 comments.
- 2026-10-18: bandit built (owner question 2026-10-17). It ranks short duels and capsules first and wants a
  devlog tried; classic battle Reels are dropped from the mix (4 posts, lowest score). Today R10 (capsule) +
  R11 (duel); Monday: first devlog + a duel.
- 2026-10-18 evening: devlog #2 (33 s) reached 108 in 8.5 h with 20 % watch, i.e. about 6.6 s watched on
  average: the most seconds of any post (short duels about 3-4 s, R9 about 5 s). Watch % favours short videos,
  so compare average seconds watched too. Reach ceiling (B6) holds: every post 105-130. Still 0 comments,
  0 shares, 0 saves; followers 107.
- 2026-10-19 weekly review: short-hook is the default for battles (watch 40 % vs 27 %, same reach); classic
  dropped; bandit now scores watch share and seconds watched together (devlogs were under-scored); week 2
  tests shareability. Queue for 2026-10-20: R12 and R13 (duels).
- 2026-10-19 evening: first save ever (devlog #2) and followers 108 (+1). R11 (short duel) 139 reach, a new high.
  R10 (10 capsules, 18 s, a day after the capsule devlog) only 21 reach after 9.6 h, far below the usual
  ~100 by then: possibly a repeat-content penalty (third capsule-opening video in 4 days, same footage style).
  Watch it tomorrow; if it stays low, space capsule videos further apart and vary them more. Devlogs hold
  the most seconds (7.1-7.4 s). Vote on devlog #1: no comments yet.
- 2026-10-19 late: skip rate (first 3 s) now measured. 52-85 % skip on every post; best R9 52 % (cold open
  on the hammer hit) and devlog #1 31 % early; classic 78 %. The first 3 seconds are the main lever: the bandit
  now scores skip too, and every new Reel opens on motion plus a question or problem in frame 0.
- 2026-10-20 evening: R10 (10 capsules) stayed at 39 reach after 34 h, while R12 (duel) reached 110 in 9.5 h and
  devlog #1 148 (a new high). R10 is the third capsule-opening video in four days: treat repeats as penalised and
  keep capsule Reels at least 3 days apart and visibly different (new hook, new framing). The bandit now gives
  devlogs 76 % chance of being best (2 posts, both top scores); devlogs get more slots this week. R13 was held
  back: it showed the Desert Airbase backdrop (never show); R1, R4, R5 and devlog #1 show Glacier Valley
  (told the owner). No Story today (two worker restarts). Queue for 2026-10-21: the indie-dev ask (explore)
  and a new duel; still 0 shares, 0 comments; followers 110 (+3 since Sunday).

- 2026-10-21: beliefs table rewritten (B1 weakened by R10's repeat penalty, B2 confirmed for watch share, new B7
  devlogs best and B8 followers grow on devlog days: 107 to 116). Today IA1 (indie ask) and R13 (re-recorded);
  for 2026-10-22 devlog #3 "the plot twist" (the landship's crew bails out and wins, option B of devlog #1).
