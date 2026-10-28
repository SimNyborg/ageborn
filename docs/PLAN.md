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
| B4 | Shares are starting | first shares 2026-10-21/22: 7 posts with 1 share each (R8, R10, R11, R12, DV1, DV2, IA1); still under 1 per 100 reached | open: week-2 test continues |
| B5 | Posting time matters | evening 120 vs midday 110 median reach | unknown |
| B6 | Reach is capped at about 110-160 per post | devlog #1 162 and R11 147 are the highs; nothing breaks out | signal |
| B7 | Devlogs score best overall | DV1 162 reach, lowest skip of the battle-free posts, most seconds watched; bandit 68 % best (n=2) | signal, strongest |
| B8 | Followers grow on devlog days | 107 flat all week, then 109, 110, 116 after the two devlogs | signal (n small) |

## Current mix (until the next update; owner note 2026-10-22 sets the direction)

- Per day: 2 grid Reels + 1 Story, both Reels from the indie-dev angle: devlogs (a real development problem, story
  first, an open question) and "the game improves" before/after pieces. The bandit still scores the arms, but the
  owner's direction decides the mix; at most one plain duel every other day, captioned as a balance test.
- Before/after series ("Ageborn is getting better"): film the same scene at an older capture pin and a newer one.
  Material now: item 37 natural motion outside battle and item 34 live Ranked matches (both released on the game's
  main branch after 63d5865), round 2's new base models and Home diorama (63d5865). Coming: item 38, more dramatic
  combat animations; film "before" now, "after" when it ships.
- Stories: behind-the-scenes stills and "what should I fix next?" questions.

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

- 2026-10-27: before/after Reels must show a clearly bad "before" and a clearly good "after" (RUNBOOK, Content
  direction); a current version with features switched off is not bad enough.

- 2026-10-26: only narrated Reels from now on. The music-only Reels (duels) were too loud and abrupt, so viewers got
  a fright and scrolled away (their skip is 67-74 % against 55-67 % for narrated devlogs). Every Reel gets a voice;
  music stays low with a soft fade-in, and nothing loud on the first frame.

- 2026-10-22: the account's direction is now the indie game developer angle: viewers get insight into real
  development questions and see the game improve over time (before/after). Battle-only Reels become the
  exception; when a duel goes out, frame it as development (a balance test, a new unit, a fix).

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
- 2026-10-22: first shares (one each on 7 posts) and followers 119 (+12 in 3 days). IA1 (indie ask) 152 reach in 21 h,
  but watch 16 % and skip 71 %: the ask reaches like a devlog but holds poorly; its single share is not yet a signal.
  Duels steady (R12 139, R13 129). No change to the mix: devlog DV3 today, duel R14 tonight; 2026-10-23 a devlog
  and a duel again. The evening status of 2026-10-21 was lost to a worker restart.
- 2026-10-22 evening: best day so far. Followers 120 to 133 (+13), and every post gained reach and engagement today
  (older posts too: DV1 183, IA1 176, R11 163, R13 162). DV3 (plot twist) 150 reach in 10 h with 59 % skip, the
  lowest skip of any devlog. Seven posts now show comments_count > 0, but /comments returns an empty list for all
  of them (probably comments the API may not read, e.g. from private or restricted accounts); check permissions.
  Instagram checkpoint at 18:43 UTC blocked the API for about an hour; R14 went out 72 min late. No mix change.
- 2026-10-22 late: owner direction: indie-dev angle first (insight into development, the game improving). Mix rewritten;
  before/after series planned around game items 34, 37 and 38. R15 (a plain duel) recaptioned as a balance test.
- 2026-10-23 evening: DV3 (plot twist) keeps growing: 296 reach, a new high and the first post past the ~150 ceiling,
  with the lowest skip of any post (55.5 %). DV4 139 reach in 10 h but only 15 % watch: the "simulator" explanation
  holds attention less than a story with a twist. R15 114 reach in 1.4 h (fast start). Followers 137. 29 comments in
  total, still not readable through the API. Lesson for the indie-dev angle: lead with a surprise or a visible
  problem (DV3, BA1), not an explanation. Queue 2026-10-24: BA1 (before/after) and DV5 (item 38 before).
- 2026-10-24 evening: BA1 (before/after) 121 reach in 10 h with 41.8 % watch, the best watch share of any long
  post (33 s; devlogs usually 15-30 %): the before/after format holds viewers. DV5 105 reach in 1.3 h with 53 %
  skip, the lowest early skip so far. DV3 299. Followers 139. DV6 ("a broken Legendary") is held: the owner declined
  its scheduling; three options put to the owner (drop it, soften it, or post as is). Nothing goes out at
  midday 2026-10-25 until he answers. Note: Copenhagen moves to winter time (UTC+1) on 2026-10-25.
- 2026-10-25 evening: DV5 (item 38 before) 187 reach in 26 h, second only to DV3 (299); BA1 129 with 40 % watch.
  BA2 84 reach in 1.5 h. Followers flat at 139 since Saturday. Only one Reel today (midday held for the owner's
  answer on DV6). Weekly review due tomorrow (Monday).
- 2026-10-26 weekly review (docs/weekly-2026-10-26.md): followers 109 to 139; a visible problem or a twist wins
  reach (DV3 299, DV5 188), before/after holds viewers (40-42 %), duels are the safe floor. Week 3 mix: one
  problem-first devlog plus one before/after or balance-test duel a day.
- 2026-10-26 evening: DV7 (base collapse) 127 reach in 9.5 h; R16 78 in 1.5 h with 49.5 % skip, the lowest early
  skip of any duel. BA2 134 with 49 % watch (before/after keeps the best watch share). Followers 140. Queue empty
  apart from DV6 (held); the 2026-10-27 run produces both slots.
- 2026-10-26 late: owner note: only narrated Reels; duel template now has low music (-15 dB, 0.8 s fade-in), no
  opening slam and an optional narration. Duels continue only as narrated balance tests.
- 2026-10-27: no posts (the morning run was delivered 13.5 h late). Followers 144 (+4). DV7 158 reach, R16 152
  with 102 % watch (rewatched). Lesson: keep at least one narrated Reel ready in the queue so a missed run does not
  leave a day empty.
- 2026-10-27 late: owner rule for before/after: the before must be plainly bad (real old version, or a stripped-down
  step 0 with no art, motion, effects or sound), else no before/after.
- 2026-10-28 evening: R17 (first narrated duel, quiet mix) 115 reach in 10 h but 78 % skip, worse than R16's 69 %
  (n=1, the quiet opening may lose the hook; keep watching). DV8 99 reach in 1.6 h. DV7 161, R16 152. Followers 145.
