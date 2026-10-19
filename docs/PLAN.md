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

## Beliefs (as of 2026-10-17 evening, 9 Reels, all small numbers)

| # | Belief | Evidence | Status |
|---|---|---|---|
| B1 | Capsule openings reach the most people | R6 120 reach / 28 % watch; R9 114 reach / 37 % watch after 8.5 h (both top 3 of 8); owner sees interest | signal, strongest (n=2) |
| B2 | Shorter Reels are watched further | 13-14 s reveals 28-37 %, 21-24 s posts 16-19 %; R9 (13 s) 38 %; R7 (7.6 s) 51 % after 10 h, the best so far | confirmed for watch share (n=3 vs 6, 40 % vs 27 %), not for reach |
| B3 | A question to the viewer gets reactions but not reach on its own | R5: 10 % engagement, reach 29 | signal |
| B4 | Nothing gets shared yet; followers flat at 107 | 0 shares on all 8 posts | problem to solve |
| B5 | Posting time matters | midday vs evening too close (reach 102 vs 117, n=3 each) | unknown |
| B6 | Reach is capped at about 100-125 per post | 7 of 9 posts land at 100-125 whatever the format; Instagram shows each post to a first test batch and does not push further | signal: we need rewatches, shares and saves to break out |

## Current mix (until the next update)

- Per day: 2 grid Reels + 1 Story. `python3 tools/bandit.py` (Thompson sampling over capsule, duel,
  classic, question, devlog) suggests the arms each morning; the daily run follows it unless an owner
  note or a running test says otherwise. 2026-10-18 posteriors: duel 45 % and capsule 33 % chance of
  being best, devlog untested (19 %), classic 1 %, question 2 %.
- Exploit: at least 1 capsule Reel every other day (B1), short (12-17 s), cold open on the action.
- Explore this week: short-hook duels (R7, R8) vs classic; devlogs (narrated, a real open question at
  the end) as the bet on B4; questions built into capsule and devlog Reels instead of vote-only Reels (B3).
- Stories: teasers and "which would you pick" frames from the day's Reels.

## Next decisions

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
