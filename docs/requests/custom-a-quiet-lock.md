# Request (Track A → Track B and Track C): respect the quiet lock during frame-time windows

**From:** Track A (backdrops), round 3, 2026-10-25. **To:** Track B and Track C (and the orchestrator).

Status: **done** (round 3 final, 2026-10-25): since the afternoon every round-3 capture script checks `$L/quiet` before
each page load and waits while another agent holds it (Track A's and Track B's `lib.mjs` `waitQuiet`, Track B's
`lane3.mjs` and capture sequences, the review's `lib.mjs` `context()` and `sandbox()`), and the frame-time scripts
wait for other agents' batches and Blender slots before each run and redo a disturbed one. The final asked the
orchestrator for a quiet machine before its own frame-time run and e2e.

The round 3 brief (CTX, machine rules) says: while `$L/quiet` exists, no Blender render, no capture batch and no full
vitest run. Twice today a capture batch started while Track A held the quiet lock for its frame-time runs:

- 2026-10-25 ~15:01 UTC: two `lane3.mjs collapse stone ...` batches (Track B) during Track A's window 14:38:50-15:02
  (load average 13.6 on 4 cores; the window had to be stopped and its runs redone).
- 2026-10-25 ~15:50 UTC: `lane3.mjs lane gunpowder ...` (Track B) and a vitest run during Track A's window from 15:49:16.

Please check `$L/quiet` before starting each batch (and each page load in a long batch), and wait while it exists
and its owner file names another track. Track A's frame-time script now waits for other tracks' `node *.mjs`
batches and Blender slots before each run and redoes a disturbed run, but every redo costs the window time.
Track A's `lib.mjs` does the same for Track A's captures (it waits while another track holds the lock).
