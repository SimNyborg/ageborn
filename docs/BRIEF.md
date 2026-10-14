# Ageborn Instagram Studio: brief

Written 2026-10-14 by the orchestrator session. Read this first, then `docs/PUBLISHING-NOTES.md`, `docs/research-growth.md`, `docs/research-tools.md` (its claim that videos can be uploaded through rupload.facebook.com is wrong for our API path), `docs/REPORT.md`, `docs/voice.md` and `studio/README.md`.

## Mission

Grow the Instagram account **@ageborn_game** to as many followers as possible, autonomously, with high-quality content. Ageborn is a browser game in development: a one-lane tug-of-war battler across 8 ages (Stone, Bronze, Medieval, Gunpowder, Industrial, Modern, Future, Cosmic) with cel-shaded Blender-rendered units and a Clash Royale-style card collection. There is no public link to the game yet, and posts must not link to it.

## The owner

Simon, Danish, not a developer. Talk to him in Danish, short and plain, without em dashes. Give time estimates. He wants the account run fully autonomously and cares about quality more than speed. Say clearly when he must do something, with exact steps. His decisions so far:
- Mainly Reels; Stories only now and then.
- No approval step: publish automatically and give him a short status in the evening. If he asks for approval later, switch to sending him the day's Reels first.
- Voices: free Kokoro voices George, Lewis and Michael (see Voice).
- The account's separation from his private profiles (Accounts Center, email, phone) is postponed by his choice. Do not raise it again unless something changes.

## Hard rules

1. **Separation:** never mention the owner's name, identity, private profiles or GitHub in any content, caption, comment or message, and never contact anyone he knows.
2. **No growth hacks:** never follow or unfollow accounts, never buy engagement, no engagement pods, and no automation outside the official API.
3. **AI disclosure:** photorealistic AI video and realistic AI voices must be disclosed (Meta's rules; the EU AI Act for deepfakes). The API has no field for Meta's AI label, so add a short disclosure to the caption, for example "Narration: AI voice". The game's own renders need no disclosure.
4. **Music:** no copyrighted or trending songs baked into videos. Use the game's own music and sound effects, or later AI music from a plan that grants commercial rights.
5. **Quotes:** only public-domain historical figures in public-domain translations (for example Sun Tzu, tr. Lionel Giles 1910; Marcus Aurelius, tr. George Long 1862). Check every attribution, quote no living people, and never imitate a real person's voice.
6. **Names:** never use the name "Age of War" anywhere, hashtags included. Never name or show other games.
7. **Token:** the access token is in the environment variable `IG_ACCESS_TOKEN`. Never print, log, commit or message it, and never run commands that echo it.
8. **Git:** push only to the branch `social-media` of SimNyborg/ageborn, which is public. Never push to `main` or `main-ipy06f` and never open a PR. Keep the session's own checkout clean and work in a git worktree of `social-media`. Delete a media file from the branch once its post is live.
9. **Quality:** look at stills or a contact sheet of every video and image before it goes out. Never post anything broken, cropped, unreadable or off-brand.
10. **Usage:** the owner's weekly Claude quota is shared with everything else. Keep daily runs lean: no needless re-renders, few sub-agents, and no polling loops. If the quota runs out, posting stops until it resets.

## Publishing (verified on 2026-10-13 and 2026-10-14)

- IG user id `17841467187927379`; API base `https://graph.instagram.com/v24.0`; quota 100 API posts per rolling 24 h (`GET /{ig-id}/content_publishing_limit`).
- **The Instagram Login API cannot upload files.** Media must sit at a public URL. Commit each file to `social-media` and pass `https://raw.githubusercontent.com/SimNyborg/ageborn/social-media/<path>` as `video_url` or `image_url`. raw serves mp4 as application/octet-stream and Meta accepts it. Images must be JPEG.
- **Flow:**
  1. `POST /{ig-id}/media` with `media_type=REELS`, `video_url`, `caption` and `share_to_feed=true`. Use `media_type=STORIES` for a Story, `image_url` for an image, and for a carousel make child containers first, then a `CAROUSEL` container with `children`.
  2. Poll `GET /{container}?fields=status_code,status` every 5 s until `FINISHED`. A Reel takes about 30 s.
  3. `POST /{ig-id}/media_publish` with `creation_id`.
  4. Confirm with `GET /{media}?fields=id,permalink,timestamp`.
  5. A carousel may need one publish retry (code 9007, "media not ready").
- **Trial Reels:** `media_type=REELS` with `trial_params={"graduation_strategy":"SS_PERFORMANCE"}`. Check this on the first try; if Meta rejects it, note the error and post normal Reels instead.
- **Insights:** `GET /{media}/insights?metric=views,reach,likes,comments,saved,shares,total_interactions,follows,profile_visits,ig_reels_avg_watch_time,ig_reels_video_view_total_time`. Data can lag up to 48 h. Track follower counts with `GET /me?fields=followers_count,media_count`.
- **Comments:** reply to comments on our own posts in the account's friendly voice, with no spam and no links.
- **Token lifetime:** the long-lived token was generated on 2026-10-13 and lasts 60 days. Around 2026-12-04, ask the owner to generate a new one: in the Meta app "Ageborn Publisher" go to Instagram → API setup with Instagram business login → Generate token, then replace `IG_ACCESS_TOKEN` in the environment settings. Only new sessions pick it up, so after the change the daily trigger must fire into a new session.

## Strategy (summary of docs/research-growth.md)

- **How new accounts grow:** through Reels recommendations to non-followers. The signals are watch time, sends per reach and likes per reach, and the first 3 seconds decide. Original content only: since April 2026, accounts that mainly repost lose recommendations, and our own game renders are our edge.
- **Starting cadence:** 2 Reels a day on the grid plus 2 Trial Reels (shown to non-followers only), at jittered times. Grid Reels go out around 11:30-13:30 and 18:30-21:30 Danish time; Trial Reels any time.
  - Add one grid Reel a day only if the median reach per post stays within 20% of the week before.
  - Cut back if reach falls more than 25% or unfollows rise.
- **Pillars:**
  - P1 Age clash: "X vs Y: who wins?"
  - P2 Choose and rank, rarity reveals.
  - P3 Voices of the ages: public-domain quotes read by the narrator over cinematic game shots.
  - P4 History memes made in our own art.
  - P5 Behind the scenes and devlog, without the owner's identity.
  - P6 AI cinematic or humour clips: at most 20%, disclosed, and only once paid tools exist.
- **Experiments:** test one main variable a week, in this order: topic, hook, length and format, then time and audio. Decide on medians of at least 3 posts per variant, never on single posts. Use Trial Reels as hook variants of the day's main Reel.
- **Captions:** a keyword-rich first line, a question or call to action, at most 5 hashtags, and no link.

## Voice

- **Approved voices:** the owner approved the free Kokoro voices `bm_george`, `bm_lewis` and `am_michael` with the round-1 processing. Rotate them and compare how they perform.
- **Pending variant:** a deeper round-2 variant is waiting for his verdict: 70% voice and 30% `am_onyx`, speed 0.82, sentence_pause 0.65, clause_pause 0.35, plus deeper processing. If he prefers it, use it.
- **Recipes:** both are in `docs/voice.md`.
- **Captions and disclosure:** use `create_timed` for word timings and burn in word-timed captions. Disclose the AI narration in the caption.

## Pipeline

- **Game capture mode:** the game repo branch `main-ipy06f` (commit 1b48e80 or later) has `?dev=1#capture`, a frame-exact battle renderer. Commands, ports (7951-7959) and Remotion settings (Chromium at /opt/pw-browsers) are in `studio/README.md`. Run `npm install` in the game repo and in `studio/`.
- **Speed:** one Reel takes 15-25 minutes to render on 4 CPU cores without a GPU, so render only what the plan needs.
- **Ready posts in `queue/`:**
  - 6 Reels with covers; their captions are in `studio/captions.md`.
  - the "Rank the legends" carousel (7 JPEGs);
  - a poll Story and a teaser Story;
  - 3 profile picture proposals. The API cannot change the profile; the current logo is fine.
- **Known fixes:** each is ready in the scripts but not yet rendered. Render them before posting the Reel concerned (details in `docs/REPORT.md`):
  - R1: the tighter re-edit.
  - R4: the base is cut at the left edge, so it needs a re-record.
  - R5: the captions need moving.
  - R6: it lacks the hammer strikes.
- **Already live:** these went up from the test sessions:
  - an image post;
  - a Reel built from the old stone-vs-cosmic story clip;
  - a carousel;
  - a soft-looking gameplay Reel recorded in real time;
  - Stories, now expired.

  Do not repost the same clips. Check `GET /me/media` before choosing.

## Daily routine (set this up first)

- **Daily trigger:** a cron trigger that fires into this session (`persistent_session_id` = this session's id) at about 06:4x UTC. Each run:
  1. Read insights for recent posts and append them to `state/analytics.csv`.
  2. Choose the day's posts, from the queue first and then new ones.
  3. Produce enough content to stay at least 2 days ahead.
  4. Schedule each post with `send_later` into this session at a jittered time.

  When a scheduled message fires, publish the item, verify it, log it to `state/posted.json` and delete its media from the branch.
- **Evening:** a short Danish status for the owner in this session: what went out, the numbers, what you learned and what comes next.
- **Weekly:** a short review and a plan adjustment.
- **State:** keep everything that must survive in `state/` and `docs/` on the branch, because this session's container can be reclaimed between runs and local files are then lost.

## First tasks

1. Read the docs above and verify the token with `GET /me`.
2. Publish the strongest finished Reel now (for example R2 or R3, after a frame check).
3. Set up the daily trigger, the evening status and the token reminder.
4. Tell the owner in Danish what is running and when the next posts go out.
