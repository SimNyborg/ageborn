#!/usr/bin/env bash
# Waits for today's slots and posts queued Reels without the agent (worker restarts keep cutting agent turns).
cd /tmp/soc
wait_until() { local t=$(date -u -d "$1" +%s); local n=$(date -u +%s); [ $t -gt $n ] && sleep $((t-n)); }
wait_until "today 11:21"
[ -f queue/reels/dv14-devlog-14-i-filmed-the-same-fight-twice.mp4 ] && bash tools/post_item.sh reel dv14-devlog-14-i-filmed-the-same-fight-twice devlog "Devlog #14: I filmed the same fight twice (determinism, side by side)"
wait_until "today 18:57"
[ -f queue/reels/dv15-devlog-15-the-riders-jump-down.mp4 ] && bash tools/post_item.sh reel dv15-devlog-15-the-riders-jump-down devlog "Devlog #15: the riders jump down (mammoth falls, riders win)"
