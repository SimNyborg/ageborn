#!/usr/bin/env bash
# Renders every sound and music cue, encodes them into public/audio and regenerates
# src/audio/assets.gen.ts, then prints the numerical analysis. See README.md.
#
#   tools/audio/render_all.sh            # everything
#   tools/audio/render_all.sh sfx        # only the sound effects (+ build)
#   tools/audio/render_all.sh music      # only the music (+ build)
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PY="${AUDIO_PYTHON:-python3}"
WHAT="${1:-all}"
JOBS="${JOBS:-$(nproc 2>/dev/null || echo 2)}"

if [[ "$WHAT" == "all" || "$WHAT" == "music" ]]; then
  echo "== music (FluidSynth + mix, $JOBS jobs)"
  cues=$(cd "$HERE/music" && "$PY" -c 'import render_music as r; print(" ".join(r.cue_names()))')
  printf '%s\n' $cues | xargs -P "$JOBS" -I{} sh -c "cd '$HERE/music' && '$PY' render_music.py {} > /dev/null"
  (cd "$HERE/music" && "$PY" -c 'import render_music as r; r.main(["__index_only__"])')
fi
if [[ "$WHAT" == "all" || "$WHAT" == "sfx" ]]; then
  echo "== sound effects"
  (cd "$HERE/sfx" && "$PY" render_sfx.py > /dev/null)
fi
echo "== encode + manifest"
"$PY" "$HERE/build.py"
echo "== analysis"
"$PY" "$HERE/analyze.py" all | tail -n 80
