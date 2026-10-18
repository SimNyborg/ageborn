# Track O (queue item 34) → Settings strings: "For parents" and quick chat

**From:** Track O, live matches (2026-10-17). **To:** the owner of `src/i18n/ui.en.json` (`ui.parents.noChat`, Settings › For parents) and DESIGN A7.1 / A15 (For parents). **Status:** applied 2026-10-18 by FIX-O (orchestrator decision 6) in `ui.parents.noChat` and DESIGN A7.1, A15.3 and A15.6, with one word changed: "no typed chat" instead of "no free chat", because the copy-review integrity test bans the word "free" in every string (Pillar 4). The line now reads: "There is no typed chat, only preset emotes and short lines such as “Good game!”. Players cannot contact each other. All opponents are AI."

Live matches now have **quick chat**: a fixed list of seven preset lines (`src/i18n/quickchat.en.json`: Good luck!, Nice!, Wow!, Oops!, Thanks!, Well played!, Good game!) that both the player and the simulated opponent can send next to the emotes. There is still no free text and no way for players to reach each other (every opponent is AI), but a parent who reads "There is no chat" and then sees the opponent's bubble say "Good game!" may take it for chat. Pillar 4 asks that every line on screen be literally true.

Proposed copy (`ui.parents.noChat`):

> "There is no free chat, only preset emotes and short lines such as "Good game!". Players cannot contact each other. All opponents are AI."

The same sentence would replace the quoted For parents line in DESIGN A7.1 (the online preview's "The facts stay") and A15 (For parents). Nothing else changes: Settings › About keeps "All opponents in this version are AI.", and Mute opponent (in the battle menu and the emote wheel) or Settings › Mute opponent emotes hides the opponent's emotes and lines.
