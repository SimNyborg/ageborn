# Daily Reel bot

Posts one Reel a day to @ageborn_game, made from real gameplay of the latest `main`.

A scheduled Claude Code routine starts a fresh cloud session each day (only a new session can read the
`IG_ACCESS_TOKEN` environment variable). The session clones this repo, checks out this branch and runs:

```
REPO=/home/user/ageborn bash bot/run.sh
```

What `run.sh` does:

1. Checks the token belongs to `ageborn_game`.
2. Builds the latest `main` and serves it locally (GitHub Pages is not reachable from the cloud sandbox).
3. `record.cjs` starts a Full quick battle with a fresh seed and the dev autopilot, fast-forwards to a
   random moment (so the age shown varies), then records 24 s frame by frame on a fake clock (the
   sandbox has no GPU, so real-time capture would stutter).
4. `compose.py` makes a 1080x1920 video: blurred gameplay behind, sharp gameplay in the middle, the
   title and the day's two lines above, one of the game's age themes as music.
5. Pushes the video to the `media` branch, because Instagram downloads media from a public URL.
6. Publishes it as a Reel (also shown in the feed), then removes the hosted file and appends a line to
   `bot/log.md`.

The last line of output is `REEL_RESULT {...}` with the outcome.

## Tuning

- Text on the video and the post caption: `captions.json` (one entry per day, in order).
- Length and frame rate: `SECS` and `FPS` in `run.sh`.
- Layout, fonts, colours: `compose.py`.
- `DRY_RUN=1` makes the video without pushing or publishing.

## Token

The Instagram token lasts about 60 days. When it runs out, the daily run fails at step 1; replace
`IG_ACCESS_TOKEN` in the cloud environment's settings with a new long-lived token.
