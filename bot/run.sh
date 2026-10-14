#!/usr/bin/env bash
# Daily Ageborn Reel: build the latest game, record a battle, compose a 9:16 Reel, host it on the
# `media` branch (Instagram fetches media from a public URL) and publish it to @ageborn_game.
#
# usage: REPO=/path/to/ageborn-clone bash run.sh
#   DRY_RUN=1   stop before anything is published or pushed (the video is left in $WORK)
# Needs: IG_ACCESS_TOKEN in the environment, node + npm, ffmpeg, python3, Playwright's Chromium,
# and push access to SimNyborg/ageborn (for the media branch and the log).
#
# The token is only ever passed to curl through --data-urlencode; never echo it or run with -x.
set -euo pipefail
set +x

HERE=$(cd "$(dirname "$0")" && pwd)
REPO=${REPO:-/home/user/ageborn}
WORK=${WORK:-/tmp/ageborn-reel}
DRY=${DRY_RUN:-0}
API=https://graph.instagram.com/v24.0
IG_USER=17841467187927379
FPS=${FPS:-30}
SECS=${SECS:-24}
PORT=${PORT:-8765}
RAW=https://raw.githubusercontent.com/SimNyborg/ageborn
CDN=https://cdn.jsdelivr.net/gh/SimNyborg/ageborn@media
T0=$(date +%s)

log() { echo "[reel $(date -u +%H:%M:%S)] $*"; }
fail() { echo "REEL_RESULT {\"ok\":false,\"step\":\"$1\",\"error\":$(python3 -c 'import json,sys;print(json.dumps(sys.argv[1]))' "$2")}"; exit 1; }
jget() { python3 -c 'import sys,json
try: d=json.load(sys.stdin)
except Exception: d={}
print(d.get(sys.argv[1],""))' "$1"; }
ig_get() { local p=$1; shift; curl -sS -G "$API/$p" "$@" --data-urlencode "access_token=$IG_ACCESS_TOKEN"; }
ig_post() { local p=$1; shift; curl -sS -X POST "$API/$p" "$@" --data-urlencode "access_token=$IG_ACCESS_TOKEN"; }
gitc() { git -C "$1" -c user.name="Ageborn reel bot" -c user.email="reel-bot@users.noreply.github.com" "${@:2}"; }
push_retry() { # dir ref
  local i
  for i in 0 2 4 8 16; do
    sleep "$i"
    if git -C "$1" push origin "HEAD:$2" >/dev/null 2>&1; then return 0; fi
    git -C "$1" fetch --depth 1 origin "$2" >/dev/null 2>&1 && gitc "$1" rebase FETCH_HEAD >/dev/null 2>&1 || true
  done
  return 1
}

[ -n "${IG_ACCESS_TOKEN:-}" ] || fail token "IG_ACCESS_TOKEN is not set"

# 1. Right account?
ME=$(ig_get me --data-urlencode fields=username)
[ "$(echo "$ME" | jget username)" = ageborn_game ] || fail account "unexpected /me answer: $(echo "$ME" | head -c 300)"
log "account ok"

# 2. Build the latest game from main.
rm -rf "$WORK"; mkdir -p "$WORK"
git -C "$REPO" worktree prune
git -C "$REPO" fetch --depth 1 origin main >/dev/null 2>&1 || fail build "git fetch main failed"
git -C "$REPO" worktree add --detach "$WORK/game" FETCH_HEAD >/dev/null 2>&1 || fail build "worktree failed"
GAME_SHA=$(git -C "$WORK/game" rev-parse --short HEAD)
(cd "$WORK/game" && npm ci --no-audit --no-fund >"$WORK/npm.log" 2>&1 && npm run build >"$WORK/build.log" 2>&1) || fail build "npm ci/build failed, see $WORK/*.log"
log "built main $GAME_SHA"

# 3. Serve it locally at /ageborn/ (the Pages base path).
mkdir -p "$WORK/www"; ln -s "$WORK/game/dist" "$WORK/www/ageborn"
python3 -m http.server "$PORT" --bind 127.0.0.1 --directory "$WORK/www" >/dev/null 2>&1 &
SRV=$!
trap 'kill $SRV 2>/dev/null || true; git -C "$REPO" worktree remove --force "$WORK/game" 2>/dev/null || true; git -C "$REPO" worktree remove --force "$WORK/media" 2>/dev/null || true' EXIT
sleep 1

# 4. Pick today's battle, moment, music and text (day-based, so each day differs).
DAY=$(( $(date -u +%s) / 86400 ))
RND=$(od -An -N4 -tu4 /dev/urandom | tr -d ' ')
SEED=$(( (DAY * 7919 + RND % 997) % 1000000 + 1 ))
SKIP=$(( 2000 + (RND % 15000) ))
URL_GAME="http://127.0.0.1:$PORT/ageborn/?quick=full&dev=1&autopilot=1"
REC=""
for attempt in 1 2 3; do
  rm -rf "$WORK/frames"
  log "recording: seed $SEED, skip $SKIP ticks, ${SECS}s at ${FPS} fps (attempt $attempt)"
  if REC=$(cd "$HERE" && node record.cjs "$URL_GAME" "$WORK/frames" "$SEED" "$SKIP" "$SECS" "$FPS" full 2>"$WORK/record.err"); then
    if echo "$REC" | grep -q '"route":"battle"'; then break; fi
    log "battle left the screen during recording: $REC"
  else
    log "record failed: $(tail -c 300 "$WORK/record.err")"
  fi
  REC=""; SKIP=$(( SKIP * 6 / 10 )); SEED=$(( SEED + 1 ))
done
[ -n "$REC" ] || fail record "three recording attempts failed"
log "recorded: $REC"

mapfile -t PICK < <(python3 - "$HERE/captions.json" "$DAY" <<'EOF'
import json, sys
c = json.load(open(sys.argv[1], encoding="utf-8"))
p = c["posts"][int(sys.argv[2]) % len(c["posts"])]
print(p["top"]); print(p["sub"])
print(json.dumps(p["caption"] + "\n\n" + c["hashtags"]))
EOF
)
TOP=${PICK[0]}; SUB=${PICK[1]}
CAPTION=$(python3 -c 'import json,sys;print(json.loads(sys.argv[1]))' "${PICK[2]}")
# The music of the age on screen; any age theme if that is unknown.
AGE=$(echo "$REC" | jget age)
MUSIC=$(ls "$WORK"/game/public/audio/music/music."${AGE:-none}".*.m4a 2>/dev/null | head -1 || true)
if [ -z "$MUSIC" ]; then
  MUSICS=( "$WORK"/game/public/audio/music/music.{stone,bronze,medieval,gunpowder,industrial,modern,future,cosmic}.*.m4a )
  MUSIC=${MUSICS[$(( DAY % ${#MUSICS[@]} ))]}
fi
log "age: ${AGE:-?}; text: '$TOP' / '$SUB'; music: $(basename "$MUSIC")"

# 5. Compose the Reel.
python3 "$HERE/compose.py" "$WORK/frames" "$FPS" "$MUSIC" "$TOP" "$SUB" "$WORK/reel.mp4" "$WORK/cover.jpg" || fail compose "ffmpeg failed"
SIZE=$(stat -c %s "$WORK/reel.mp4")
log "composed $SIZE bytes"
if [ "$DRY" = 1 ]; then
  echo "REEL_RESULT {\"ok\":true,\"dry_run\":true,\"video\":\"$WORK/reel.mp4\"}"
  exit 0
fi

# 6. Host it on the media branch.
STAMP=$(date -u +%Y%m%d%H%M)-$(od -An -N4 -tx4 /dev/urandom | tr -d ' ')
git -C "$REPO" fetch --depth 1 origin media >/dev/null 2>&1 || fail host "git fetch media failed"
git -C "$REPO" worktree add --detach "$WORK/media" FETCH_HEAD >/dev/null 2>&1 || fail host "media worktree failed"
mkdir -p "$WORK/media/m/$STAMP"; cp "$WORK/reel.mp4" "$WORK/media/m/$STAMP/reel.mp4"
gitc "$WORK/media" add "m/$STAMP/reel.mp4"
gitc "$WORK/media" commit -q -m "media: reel $STAMP"
push_retry "$WORK/media" media || fail host "push to media failed"
VIDEO_URL="$RAW/media/m/$STAMP/reel.mp4"
for i in $(seq 1 24); do
  LEN=$(curl -sSIL "$VIDEO_URL" 2>/dev/null | tr -d '\r' | awk 'tolower($1)=="content-length:"{v=$2} END{print v}')
  [ "$LEN" = "$SIZE" ] && break
  sleep 5
done
[ "$LEN" = "$SIZE" ] || fail host "video URL not live after 2 min"
log "hosted at $VIDEO_URL"

# 7. Publish the Reel.
THUMB=$(( SECS * 1000 / 3 ))
publish_from() { # url -> sets CID, STATUS
  local r
  r=$(ig_post "$IG_USER/media" --data-urlencode media_type=REELS --data-urlencode "video_url=$1" \
      --data-urlencode "caption=$CAPTION" --data-urlencode share_to_feed=true --data-urlencode "thumb_offset=$THUMB")
  CID=$(echo "$r" | jget id)
  [ -n "$CID" ] || { STATUS="create failed: $(echo "$r" | head -c 300)"; return 1; }
  local i code s
  for i in $(seq 1 120); do
    sleep 5
    s=$(ig_get "$CID" --data-urlencode fields=status_code,status)
    code=$(echo "$s" | jget status_code)
    [ "$code" = IN_PROGRESS ] || break
  done
  STATUS=$(echo "$s" | head -c 300)
  [ "$code" = FINISHED ]
}
P0=$(date +%s); USED=raw
if ! publish_from "$VIDEO_URL"; then
  log "raw URL failed: $STATUS; trying jsDelivr"
  FIRST_ERR=$STATUS; USED=jsdelivr
  publish_from "$CDN/m/$STAMP/reel.mp4" || fail publish "raw: $FIRST_ERR | jsdelivr: $STATUS"
fi
PROC=$(( $(date +%s) - P0 ))
R=$(ig_post "$IG_USER/media_publish" --data-urlencode "creation_id=$CID")
MID=$(echo "$R" | jget id)
[ -n "$MID" ] || fail publish "media_publish failed: $(echo "$R" | head -c 300)"
INFO=$(ig_get "$MID" --data-urlencode fields=id,media_type,media_product_type,timestamp,permalink)
PERMALINK=$(echo "$INFO" | jget permalink); TS=$(echo "$INFO" | jget timestamp)
log "published $MID $PERMALINK"

# 8. Tidy up the hosted file (Meta has its own copy now) and log the post.
gitc "$WORK/media" rm -q "m/$STAMP/reel.mp4" && gitc "$WORK/media" commit -q -m "media: remove reel $STAMP after publishing" && push_retry "$WORK/media" media || log "warning: could not remove the hosted file"
git -C "$REPO" fetch --depth 1 origin social-media >/dev/null 2>&1 && git -C "$REPO" worktree add --detach "$WORK/social" FETCH_HEAD >/dev/null 2>&1 && {
  mkdir -p "$WORK/social/bot"
  [ -f "$WORK/social/bot/log.md" ] || printf '# Reel log\n\n| Time (UTC) | Media id | Link | Text | Game | Seed/skip | Processing |\n|---|---|---|---|---|---|---|\n' >"$WORK/social/bot/log.md"
  echo "| $TS | $MID | $PERMALINK | $TOP / $SUB | $GAME_SHA | $SEED/$SKIP | ${PROC}s ($USED) |" >>"$WORK/social/bot/log.md"
  gitc "$WORK/social" add bot/log.md && gitc "$WORK/social" commit -q -m "bot: log reel $MID" && push_retry "$WORK/social" social-media
} || log "warning: could not update bot/log.md"
git -C "$REPO" worktree remove --force "$WORK/social" >/dev/null 2>&1 || true

echo "REEL_RESULT $(python3 -c 'import json,sys;print(json.dumps(dict(ok=True,media_id=sys.argv[1],permalink=sys.argv[2],timestamp=sys.argv[3],text=sys.argv[4],game=sys.argv[5],url=sys.argv[6],processing_s=int(sys.argv[7]),total_s=int(sys.argv[8]))))' "$MID" "$PERMALINK" "$TS" "$TOP / $SUB" "$GAME_SHA" "$USED" "$PROC" "$(( $(date +%s) - T0 ))")"
