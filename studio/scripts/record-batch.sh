#!/usr/bin/env bash
# Records several shot scripts one after another (one software-rendered browser at a time).
# `bash scripts/record-batch.sh r1 r2:cosmic r3` (shot[:clip]); a failed shot is retried once.
# `WAIT_PID=123 bash scripts/record-batch.sh ...` starts once process 123 has exited.
set -u
cd "$(dirname "$0")/.."
if [[ -n "${WAIT_PID:-}" ]]; then
  while kill -0 "$WAIT_PID" 2>/dev/null; do sleep 20; done
fi
for spec in "$@"; do
  shot="${spec%%:*}"
  clip=""
  [[ "$spec" == *:* ]] && clip="${spec#*:}"
  for attempt in 1 2; do
    echo "=== $spec $(date +%H:%M:%S) (attempt $attempt)"
    if node scripts/record.mjs "$shot" $clip; then break; fi
    echo "!!! $spec failed"
    sleep 60
  done
done
echo "=== batch done $(date +%H:%M:%S)"
