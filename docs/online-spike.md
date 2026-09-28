# Online 1v1 spike (local, not deployed)

Status: **working local spike**, September 2026. Code in `server/` (own `package.json` and lockfile).
Nothing is deployed and nothing costs money. This document is the input for the D1 "Online 1v1" milestone.

## TL;DR

- Two headless Chromium pages played complete Short Wars against each other through a local
  Cloudflare Worker + Durable Object relay (`wrangler dev`, local workerd), with 50-150 ms simulated
  round trips and jitter. **3 of 3 scenarios passed**: real time, a mid-match disconnect and
  reconnect, and quick-match pairing. Both clients ended with the same final hash, the same outcome
  and the same command log. Both replays verified. The server re-simulated the log and agreed.
  Out of 1,013 hash checks, 0 mismatched.
- **Reviewer pass** (see "Review" below): the relay was attacked with a modified client, packet
  delay up to 400 ms, two disconnects and junk input. 8 holes were found and fixed in `server/`
  (server now decides the result by its own re-simulation, whitelists commands, ignores impossible
  hash/end claims, forfeits/abandons rooms, caps match length, crypto tokens, dev-only fast clock,
  hibernation-safe seats). `npm run adversarial` has 23 checks (all pass) and the new e2e
  scenario `hostile` passes with 0 desyncs.
- Cost per 5-minute match in this design: about **900 incoming and 5,000 outgoing messages**, about
  **120 KB in total** (about 60 KB per player), about **8 ms of relay CPU**, and about **42 ms of CPU**
  (100 ms at most) for the optional server re-simulation.
- On the **Workers Free plan** this design holds up to about **350 matches a day**. The limit is
  Durable Object duration, because a match's frame timer keeps the object awake. A
  hibernation-friendly variant (described below) raises that to about **2,000-5,000 matches a day**.
- The owner has nothing to do now. What the owner must do later is at the end.

## Architecture

```
 Browser / app (Capacitor)                     Cloudflare (free plan)
 ┌─────────────────────────────┐   HTTPS   ┌──────────────────────────────────────────┐
 │ UI + renderer (unchanged)   │──────────▶│ Worker: routes /api/rooms, /api/quick     │
 │ OnlineMatch adapter         │           │   idFromName(code) ─┐                     │
 │  - local Sim (src/sim)      │    WS     │                     ▼                     │
 │  - steps only up to "u"     │◀═════════▶│ MatchDO (one per room code)               │
 │  - sends cmds, hashes, end  │           │  - server clock, stamps tick = now + 4    │
 └─────────────────────────────┘           │  - frames every 2 ticks: cmds with tick≤u │
                                           │  - compares hashes every 20 ticks         │
                                           │  - keeps the command log; re-sims at end  │
                                           │ LobbyDO (one): quick-match queue          │
                                           └──────────────────────────────────────────┘
```

### Netcode: lockstep with an authoritative input relay (DESIGN D1)

1. **Matchmaking.** `POST /api/rooms` creates a private room and returns a 6-character code (a friend
   duel by code). `POST /api/quick` pairs you with whoever is waiting in `LobbyDO`. Both players open
   `GET /api/rooms/:code/ws`. Seats are assigned in join order, and each seat gets a secret token for
   reconnecting.
2. **Start.** When both seats are taken, the DO picks the seed and sends a `start` with a `MatchSpec`
   (seed, format, level 8, labels, tick length). Both clients build the same `MatchConfig` from it
   (`server/shared/match.ts`). Tick 0 begins 1 s later.
3. **Commands.** A client sends a bare `Command` the moment the player taps. The DO sets `side` from
   the socket (never from the client) and gives each side its own `seq`. It stamps the command at
   **execution tick = server tick + 4** (D1). It never stamps a tick it has already declared
   complete, and it keeps the log sorted.
4. **Frames.** Every 2 ticks (10 per second) the DO sends each client
   `{u, c: [[tick, seq, cmd], ...]}`, where `u = serverTick + 3`. No later command can be stamped at
   or before `u`, so a client may simulate up to `u` and never needs a rollback. Most frames carry no
   commands (`{"t":"f","u":1234}`, about 20 bytes).
5. **Hash checks.** Every 20 ticks each client sends `sim.hash()` (FNV-1a, B3 step 17). The DO
   compares the two sides and broadcasts `desync` on a mismatch.
6. **Reconnect.** A client reconnects with its token. The DO answers with `start` plus the whole
   command log up to `u`, and the client re-simulates it (**15-25 ms** for about 1,500-2,500 ticks in
   Chromium). No state snapshot is needed, because the sim is fast and deterministic. Snapshots are
   worth adding only if Full Wars make catch-up slow on weak phones. It would still be at most about
   400 ms (B3 target).
7. **End.** Each client sends `{end, tick, outcome, finalHash}`. The DO checks that both agree,
   **re-simulates the log** (anti-cheat, `VERIFY=1`), saves `{spec, log, outcome, claims}`, and
   sends `result`. With `VERIFY=1` the result is the **server's re-simulation outcome**; client
   claims are only compared with it. An end claim for a tick after the last complete tick the client
   was sent (`u`) is ignored.
8. **Forfeit / abandon / timeout.** A seat gone for 60 s forfeits (`endReason: 'forfeit'`,
   `abandonedBy`); both seats gone for 20 s ends the room (`'abandoned'`); past the Final Bell + 2 min
   the room ends (`'timeout'`). Each of these stops the frame timer, which is what the free duration
   budget pays for.

The server never runs the sim during a match. It only relays, which keeps it cheap. The same code
(`server/src/room.ts`) runs in the DO and in a plain Node benchmark.

### Files

| Path | What |
|---|---|
| `server/src/worker.ts` | Worker routes, `MatchDO` (hibernation WebSocket API, frame timer), `LobbyDO` |
| `server/src/room.ts` | `MatchRoom`: seats, stamping, frames, hash checks, reconnect, end, re-sim hook. Transport-agnostic |
| `server/shared/protocol.ts` | Wire messages and constants (`INPUT_DELAY = 4`, `FRAME_TICKS = 2`, `HASH_EVERY = 20`) |
| `server/shared/match.ts` | `MatchSpec` → `MatchConfig` (baseline War Plans for the spike) and `reSimulate` |
| `server/client/online.ts` | **The client adapter** `OnlineMatch`: socket, simulated latency/jitter (order-preserving), steps the local sim to `u`, sends hashes and the end, reconnects, measures input latency |
| `server/client/bot-page.ts` | Test driver: an AI General plays one side through `OnlineMatch` in a page |
| `server/test/e2e.mjs` | Starts `wrangler dev`; 3 scenarios × 2 headless Chromium pages; checks and measurements |
| `server/test/bench.ts` | Node CPU benchmark of the relay and the re-simulation over 20 recorded bot matches |
| `server/test/adversarial.ts` | 23 checks of what a modified client can and cannot do (fake clock, plain Node, about 1 s) |

`src/` is reused through the `@/*` path alias (`server/tsconfig.json` points at `../src/*`), bundled by
wrangler (the Worker, 337 KiB raw / 77 KiB gzip, well under the 3 MB free limit) and by esbuild (the
client, 245 KiB minified, including the AI used by the test bots). Nothing in `src/` was changed.

## How to run it

```
cd server
npm install
npm run build:client          # client/dist/bot.js
npm run e2e                   # all 4 scenarios, about 5 minutes (the real-time one is the long one)
node test/e2e.mjs --only reconnect,quick,hostile   # the fast ones, about 80 s
npm run adversarial           # relay attack checks, about 1 s
npm run bench                 # CPU benchmark (N=20 matches by default)
npm run dev                   # just the server on http://127.0.0.1:5063
```

`wrangler dev` is started with `--var DEV_FAST:1`; only then does `?tickMs=` speed up the clock.
A deployed Worker always runs 50 ms ticks. Results are written to `server/test/results/` (git-ignored). Note: **do not use port 5060 or 5061**.
Browsers and Node's `fetch` refuse them (SIP ports), so the spike uses 5063.

## Results

### End-to-end (local workerd + headless Chromium, 2 pages per match)

Latency is simulated inside each page for both directions: `oneWay + random(0..jitter)` ms per
message, with order preserved as on a real WebSocket.

| Scenario | Clock | Latency (one-way + jitter) | Result | Game time | Checks |
|---|---|---|---|---|---|
| realtime | 50 ms ticks (real speed) | A: 25 + 0-20, B: 75 + 0-40 (RTT about 50-100 / 150-230) | side 0 destroyed the base at tick 5263 | 4.4 min | all pass |
| reconnect | 10 ms ticks (5× speed) | 40 + 0-30 / 60 + 0-30; **B disconnected at tick 1500 for 2 s** | draw at Final Bell | 6.3 min | all pass |
| quick | 10 ms ticks (5× speed) | 50 + 0-50 both | draw at Final Bell | 6.3 min | all pass |

The checks in every scenario: same final hash, same outcome, same command log on both clients, both
replays pass `verifyReplay`, the server saw both clients agree, the server re-sim reproduced the
hash, 0 hash mismatches (263 + 375 + 375 checks), and 0 commands arrived late for a tick already
simulated.

**Traffic per match** (server view, JSON text):

| | realtime (4.4 min) | reconnect (6.3 min) | quick (6.3 min) |
|---|---|---|---|
| Messages in (both players) | 626 | 977 | 915 |
| Messages out (both players) | 4,842 | 5,427 | 5,486 |
| Bytes in | 23.5 KB | 36.6 KB | 34.6 KB |
| Bytes out | 96.7 KB | 113.1 KB | 114.5 KB |
| Commands | 98 | 151 | 163 |
| Replay size (`ReplayDoc` JSON) | 13.7 KB | 17.7 KB | 18.3 KB |

That is about **5 messages/s up and 10/s down per player**, and **about 14 KB per player per minute**
(2 kbit/s). Frames dominate. Most outgoing frames are empty heartbeats.

**Input latency** (from the tap to the local sim executing the command), real-time scenario:

| Player line | p50 | p95 | max |
|---|---|---|---|
| A: RTT about 50-90 ms | 173 ms | 270 ms | 336 ms |
| B: RTT about 150-230 ms | 306 ms | 419 ms | 999 ms (one jitter spike) |

Roughly RTT + 100 ms: the uplink, the 4-tick stamp delay minus the 3 ticks a client may run ahead,
and frame cadence. D1 plans to hide 200 ms behind the spawn-gate animation, so a good line feels
instant and a 150 ms line feels slightly soft. In the 5× runs the tick-based part shrinks, so their
latencies are not comparable.

### CPU (Node benchmark of the same code, 20 bot-vs-bot Short Wars, about 6,000 ticks and 120 commands each)

| | Per match |
|---|---|
| Relay (`MatchRoom`: parse, stamp, 3,000 frames per client, 600 hash checks) | **7.5-8 ms CPU** |
| Server re-simulation of the whole log (anti-cheat) | **42 ms average, 71-99 ms max** |
| A cheating client that claims a wrong final hash | caught (bench `cheatCaught: true`) |

Inside local workerd the handlers took 270-420 ms of wall time per match in total (`handlerMs`
minus `verifyMs`). workerd's timers are coarse (1 ms steps, frozen during execution in
production), so that number is an upper bound. The Node figure is the real CPU cost. Either way, CPU
is not the constraint. Durable Objects allow 30 s of CPU per request even on the free plan.

## Review (skeptical netcode pass, September 2026)

A second agent re-ran the spike and tried to break it. Everything below is in `server/` only.

### Re-run

| Run | Result |
|---|---|
| `npm run e2e -- --only reconnect,quick,hostile` | **3/3 PASS**: same final hash, outcome and command log on both pages, replays verify, server re-sim agrees, **0 of 1,049 hash checks mismatched**, 0 late commands |
| `hostile` (new) | Side B is a modified client: every 50 ticks it sends a command with the opponent's side and tick 1, a malformed command, `null`, a 900-byte padded command, a hash for a tick 20,000 ahead and an end claim ("I won") 5,000 ticks ahead. Its line has 100 ms + 0-300 ms jitter, and it **drops twice** (1.5 s at tick 800, 3 s at tick 2500). Result: 683 messages rejected, spoofed commands stamped as B's own, 0 desyncs, no early end, draw at the Final Bell |
| `npm run adversarial` (new) | 23/23 checks pass (list below) |
| `npm run bench` | relay 6.4 ms CPU per match, re-sim 39.5 ms avg / 69 ms max; unchanged by the fixes |

The real-time scenario was not re-run (4.4 minutes of wall time; the fixes do not touch timing).

### Holes found and fixed

| # | Problem | Impact | Fix |
|---|---|---|---|
| 1 | The result was the client's claim even when the server re-sim disagreed (`verified: false` but `o` = the claim). The re-sim also stopped at the *claimed* tick. | A modified client could win by claiming "I won at tick k" while the opponent was briefly disconnected. | With `VERIFY=1` the result is the re-sim outcome; the re-sim runs until the sim ends the match (capped), not to the claimed tick. An end claim with `k > u` is ignored. |
| 2 | `JSON.parse('null')` then `m.t` threw inside the handler; any extra fields in a command were stored and relayed. | A single `null` message threw in the DO; a client could pad every command to bloat the log, storage and the opponent's download. | Messages > 512 bytes dropped; non-objects rejected; commands **rebuilt from a whitelist** of fields and value ranges (`sanitizeCommand`). |
| 3 | Hash messages were accepted for any tick. | Unbounded memory growth in the DO from one client. | Only ticks `0 < k <= u`, integers; unpaired entries are pruned and counted. |
| 4 | No forfeit, abandon or length cap; the frame timer ran as long as the room existed. | Two players closing the tab mid-match kept a DO awake, burning the free duration budget (the binding limit). | Forfeit after 60 s, abandon after 20 s, timeout at Final Bell + 2 min. |
| 5 | No per-socket message limit (only commands were capped). | One client could burn the shared 100k/day request quota (about 2 M messages) in minutes. | More than 60 messages/s closes the socket (1008). Reconnect catch-up no longer sends a burst of hashes (the client only hashes live ticks), so honest reconnects stay under the cap. A per-IP limit is still needed at launch. |
| 6 | Reconnect tokens came from `Math.random()`. | Predictable in principle; the token is the only credential for a seat. | 128-bit tokens from `crypto.getRandomValues`. |
| 7 | `?tickMs=` was honoured by any client. | Anyone could open a 10× speed room, including through quick match, where the second player gets the first player's settings. | Only when the Worker has `DEV_FAST=1` (set by the e2e test); deployed rooms are always 50 ms. |
| 8 | Seats and the quick-match queue lived only in memory, but the DO uses the Hibernation API. | A player waiting alone for more than about 10 s could be hibernated; the second player would then create a fresh room and both would wait forever. Same for the lobby. | Seats are saved on join and re-attached to open sockets through `serializeAttachment` on wake; the lobby queue is in storage. A player who leaves before the start frees the seat. Not testable locally (workerd in `wrangler dev` does not hibernate); check after deploy. |

### What `npm run adversarial` checks

Side, tick and seq cannot be spoofed; 19 kinds of junk neither throw nor reach the log; extra fields
are stripped and oversized messages dropped; 20 commands per side per second; a message flood closes
the socket; far-future hashes are ignored; a mismatch reaches both players; a future end claim is
ignored; a false win claim while the opponent is away is overruled by the re-sim; both-gone rooms end
after 20 s, one-gone rooms forfeit after 60 s, and a reconnect in time cancels the forfeit; rooms end
at the length cap; a wrong token cannot enter a full room and the right one gets its seat and log
back; and frames delivered in bursts plus a reconnect catch-up give exactly the same state as a
straight replay of the log (tick 2,924, identical hashes).

### Findings that are not bugs but matter for launch

- **Packet reordering cannot happen inside one WebSocket** (it runs over TCP). The real risks are
  delay spikes (head-of-line blocking) and reconnects, and both were tested. Commands a player taps
  while the socket is reconnecting are lost; the client now drops them explicitly, and the UI must
  show "reconnecting".
- **Hitching:** the client steps the sim only when a frame arrives. In the real-time run about 12%
  of frames arrived after a gap and the sim jumped several ticks at once; with 300 ms jitter it is
  about half. The game needs a **playout buffer**: render 1-2 frames behind `u` at a steady 50 ms
  clock and speed up or slow down by a few percent to stay there.
- **Fixed input delay:** p50 input latency was 311 ms and p95 658 ms on the 100 + 0-300 ms line
  (123 / 336 ms on the good line of the same match). An adaptive delay per match (from measured
  RTT, e.g. 3-8 ticks) would help poor lines without hurting good ones.
- **Lockstep shows everything.** Each client holds the full state, so a modified client can read
  the opponent's gold, queue and power charge, and a script can play for a person. The server cannot
  stop that. It matters only if the game has hidden information; the re-sim at least guarantees that
  nobody can *change* the outcome.
- **Remaining trust gaps for launch:** the reconnect token travels in the URL query (it can end up in
  logs; send it in the first message instead); no `Origin` check and `CORS: *` (any website can open
  sockets); `/api/rooms/:code/stats` is public (remove it); player names are unfiltered text shown to
  the opponent (filter, and never render them as HTML); anyone who knows a room code can take a
  free seat before the start; room codes never expire; stored match logs are never deleted
  (about 250,000 matches fill the 5 GB).
- **Mid-match durability** is unchanged: a DO restart mid-match loses the room. Cloudflare can also
  evict an object that has had no incoming request for a while even if a timer is pending; during a
  match the clients send about 5 messages/s, so this only bites when both are gone, and then the
  abandon rule ends the room anyway. Confirm on deploy.
- **Free-tier estimate:** the 38 GB-s per match and about 350 matches/day hold for this design
  (128 MB × about 300 s). The "intermediate step" was wrong and is struck out above. The flood and
  abandon fixes matter more for the free budget than any optimisation: one abandoned room or one
  flooding client could otherwise use a large share of the day.

## Free-tier capacity (Cloudflare Workers Free, checked September 2026)

Limits (Cloudflare docs, "Durable Objects pricing/limits" and "Workers limits"):

- Workers: 100,000 requests/day, 10 ms CPU per request.
- Durable Objects (SQLite backend only on Free): **100,000 requests/day** and **13,000 GB-s duration/day**,
  reset at 00:00 UTC. Incoming WebSocket messages count **20:1** as requests. Outgoing messages are free.
  Duration is billed at 128 MB while an object is active and *not eligible for hibernation*.
  30 s of CPU per request. 5 GB of storage. SQLite: 100,000 rows written and 1.25 M rows read per day.
- On Free, going over a limit makes further operations of that type fail. **It never bills.**

Per 5-minute Short War in this design:

| Resource | Use per match | Free per day | Matches/day |
|---|---|---|---|
| DO duration (the frame timer keeps the object awake about 5 min × 0.125 GB) | about 38 GB-s | 13,000 GB-s | **about 350** ← limit |
| DO requests (about 900 incoming msgs ÷ 20, + 2 socket upgrades + init RPC) | about 50 | 100,000 | about 2,000 |
| Worker requests (create/quick + 2 upgrades) | 3 | 100,000 | about 33,000 |
| SQLite rows written (opts, 2 seats, final log, lobby entry) | about 4-6 | 100,000 | about 17,000 |
| Storage (about 15-20 KB log per match) | | 5 GB | about 250,000 kept (needs a retention rule) |

So the spike as built serves **about 350 matches a day (700 player-matches)** for free. That is plenty
for friends and a soft launch. It is not enough for a portal hit.

**The hibernation-friendly variant** (recommended before launch): drop the server timer. Clients run
their own clock and simulate ticks with no commands ahead of confirmation. The DO answers only
messages (commands, hashes every 100 ticks = 5 s), so it is eligible for hibernation between them
and duration nearly vanishes. The price is that a client which already ran past a late command's
tick must roll back: restore a snapshot and re-simulate a few ticks. The sim is fast enough (about
0.05 ms per tick), but it needs a `snapshot()/restore()` on `Sim` (a contract change for WP2).
Requests then bound capacity: about (150 commands + 150 hashes) ÷ 20 + 3 ≈ 18 per match, so about
**5,000 matches/day**. ~~An intermediate step with no sim change: keep lockstep, but send frames only when a command
exists or every 200 ms. That is about 2,000/day.~~ *Reviewer: this does not work as stated.* Any
pending server timer (a 200 ms heartbeat included) makes the object ineligible for hibernation, so
duration stays at the full match length. Driving frames from client pings instead removes the timer
but costs about 10 pings/s × 2 players × 300 s ÷ 20 = 300 requests per match, which is again about
330 matches/day. Without rollback the realistic free ceiling is about **350 matches/day**. The
5,000/day figure for the rollback variant depends on Cloudflare not billing idle-but-hibernatable
time, which the docs say but which must be confirmed on the dashboard after the first deploy.

When free limits run out, the game should say "Online is full today, play an AI General" (AI
labelled, A7.1) instead of failing silently. The Worker can see the error, and a small daily counter
in a DO can pre-empt it.

## What is missing for a real launch

**Netcode and match rules**
- The hibernation-friendly variant with rollback (above), or at least event-driven frames.
- Mid-match persistence: the log is saved only at the end. If a DO is evicted or restarted
  mid-match, the room is lost. Checkpoint the log every N commands, or use SQLite row inserts per
  command (about 150 rows written per match, still about 600 matches/day on the free rows).
- Abandonment: the relay now forfeits after 60 s and ends empty rooms after 20 s (reviewer fix).
  Still missing: a "waiting for opponent / reconnecting" UI, a rematch, and what a forfeit means for
  rating and rewards.
- A desync policy: a mismatch is still only reported mid-match, but the result is now always the
  server's re-simulation, so a faked desync or faked end cannot change who won. Launch policy:
  resync the out-of-step client from the log, and flag accounts whose claims disagree with the
  re-sim.
- Real War Plans in the `MatchSpec`: the server validates the deck rules (A3) and, for ranked, sets
  L8 for every card (A16.7). The spike uses the baseline plan for both sides.
- The PvP rules from D1: no pause or speed, global hitstop view-only, and emotes only (rate-limited;
  the relay already caps commands at 20 per second per side).
- Integration into the game: an online mode in `BattleSession` that uses `OnlineMatch` instead of
  stamping `tick + 1`, a lobby/room-code screen, and all strings through i18n.
- Per-IP rate limits on room creation and connects, and room-code expiry (see Review).

**Accounts, cloud save, economy**
- Accounts: start with anonymous device accounts (a random id + secret stored in `SaveStore`, a DO
  or D1 row per account). Add optional sign-in later. Every login provider we would use (Google,
  Apple, email magic links through a free tier) needs its own developer setup.
- Cloud save behind `SaveStore`: a D1 table or a DO per account holding the save document, with
  last-write-wins plus the v1 migration chain. D1 free: 5 GB, 100k rows written/day.
- Anti-tamper (D1): the server rolls capsules for online accounts with the same tables
  (`src/meta` is pure, so the Worker can run it), and server re-sim of replays for leaderboards and
  ranked. Re-sim costs about 42 ms CPU per match, well inside the DO limit. The 10 ms Worker CPU
  limit means re-sim must run in a DO, not in the plain Worker.
- Matchmaking: `LobbyDO` is a single global queue. Ranked needs a Glicko-2 rating (A16.21), rating
  bands that widen with wait time, AI Generals labelled AI as fallback when queues are thin (those
  matches never move the rating), and per-region lobbies later.
- The safety rules for minors (A16.21): no free chat, pseudonymous names, preset emotes, report and
  block.

**Browser ↔ app cross-play**
- The app (Capacitor, D1) ships the same web build, so it runs the same `src/sim`. Cross-play works if
  both run the **same `SIM_VERSION` and content hash**. The DO already sends both in `start`, and the
  client refuses a mismatch. Needed: the server keeps a list of accepted versions, and the client shows
  "update required" (app stores lag web deploys by days). Queue players by version.
- The WebSocket URL must be configurable per build (web vs app). The app needs the Worker domain in
  its allowed origins.
- D1 names Colyseus 0.17 for the server. This spike recommends **Cloudflare Durable Objects instead**:
  Colyseus needs an always-on Node host, and no free host runs one reliably. A DO per match is free up
  to the limits above, scales to zero, and runs the same TypeScript sim. The Colyseus choice should be
  updated in DESIGN D1 if the owner agrees.
- The D1 plan to split `src/sim` into a workspace package still makes sense. The spike reached it
  through a path alias and a relative import of `tools/lib/plans.ts` (the baseline War Plan), which a
  real build should replace with a proper shared module.

## What the owner must do later (not now)

Nothing costs money. The free plan needs no credit card.

1. **Create a free Cloudflare account:** go to https://dash.cloudflare.com/sign-up, use your email,
   confirm the email. Do not add a payment method and do not pick a paid plan. "Workers Free" is the
   default.
2. **Tell Claude when it is done.** Claude will then:
   - run `npx wrangler login` in `server/`. A browser window opens, you click **Allow**, and nothing
     else is needed.
   - run `npx wrangler deploy`. The server gets a free address like
     `https://ageborn-online-spike.<your-name>.workers.dev`.
3. **For automatic deploys from GitHub** (optional, later): in the Cloudflare dashboard go to
   **My Profile → API Tokens → Create Token**, choose the template **"Edit Cloudflare Workers"**,
   click **Continue to summary → Create Token**, and copy the token. Then in GitHub go to
   **simnyborg/ageborn → Settings → Secrets and variables → Actions → New repository secret**,
   with name `CLOUDFLARE_API_TOKEN` and the token as value. Also add `CLOUDFLARE_ACCOUNT_ID`
   (shown on the right side of the dashboard's Workers page). Claude adds the workflow.
4. **Decisions for the owner** before a real launch:
   - Cloudflare Durable Objects instead of Colyseus (recommended, see above).
   - Accounts: anonymous device accounts first (recommended), or sign-in from day one.
   - What happens when the free daily limit is reached: "play an AI General" (recommended), or
     upgrading to Workers Paid ($5/month). **The paid option is listed only for completeness and
     is against the current "free tiers only" rule.**
5. **App cross-play** additionally needs the app store accounts, which are separate from this
   server. Apple costs money (the Developer Program fee) and is outside the free-only rule until the
   owner decides otherwise.
