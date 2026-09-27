# Ageborn v1 GDD: player-lens review (prioritized)

## P0: breaks the pitch or the core loop

**1. The first two hours never deliver "clubs to lasers" or a Legendary pull.**
- **The Future age is locked for hours.** It exists only in Full War, which is gated at Arena 3 (700 trophies). The first 10 matches give about +21 per match (roughly 70% wins, no losses below 400). After that, a 55% win rate at +30/−20 nets 0.55×30 − 0.45×20 = +7.5 per match between 400 and 700. That is about 45-55 ladder matches, or 6-7 hours, before a player sees lasers on the ladder.
- **The Legendary walkout arrives too late.** Capsule charges are 4 per day, and A6.3 never says how many a new save starts with. If the scripted capsules use charges, capsule 10 (the Matriarch walkout, the biggest hook in the game) lands on day 2-3. At best it comes around match 10, 60-75 minutes in, which is long after a typical first web session.
- **Hour two pays almost nothing.** After about 4 wins (~45 min), every win pays only 40 Amber.
- **Fixes:**
  - Make match 1 a compressed Stone-to-Future showcase: thresholds 250/300/350/400, and Grogg stays in Stone. Lasers against clubs then show up by minute 3.
  - Move Arena 2 to 150 trophies and Arena 3 to 400. No trophy loss below Arena 3.
  - From Arena 2, let the player pick any unlocked format on the ladder. Grant the Modern and Future Age Unlock Capsules at Arena 2.
  - New saves start with 12 charges, and scripted capsules 1-10 do not use charges.
  - Move the scripted Legendary to capsule 5, about 35-40 minutes in.
  - Once charges run out, every 3rd win grants a Clay capsule with no cap.

**2. Age Powers wipe whole armies, and the final age turns into power ping-pong.**
- **Damage per unit in the zone blows past the A2.9 target** (60-100% of a light unit, 15-35% of a heavy). Evenly spaced patterns make every unit in the zone take multiple hits, so the real number is well above the "average":
  - Meteor: 14 × 70, r40, over 400 lu. Spacing 28.6 lu gives ~2.8 hits = ~196 per unit. That is 122% of a Bonker, a dead Pebbler, and 35% of a Tuskback.
  - Carpet Bomber: ~2.4 hits × 240 = ~576. That is 146% of a Trench Raider and 42% of a Tankette.
  - Orbital Lance: a flat 650 is 116% of a Photon Knight including its shield.
- **The whole army fits in one zone.** Ranks space at (24+24)×0.3 = 14.4 lu, so 20 small units occupy about 260 lu, and a 400-500 lu zone always covers everything. Hold stance gathers the army at p ≤ 420, which makes Hold a trap against powers. A 1.0 s telegraph cannot be dodged at 70 lu/s.
- **The final age charges too fast.** Base charge is 2%/s. Overcharge (400 XP → +25% at 20-25 XP/s) adds about 1.25-1.5%/s, and Overdrive multiplies charge by 1.5. A full power arrives every ~22 s in Overdrive and ~30 s otherwise, in the phase that decides every format.
- **Power kills pay 100% XP.** One Meteor on a normal Stone army (~475 gold of units) is worth ~475 XP, more than half of Medieval's 900. The first power to land decides the first evolve race.
- **Fixes:**
  - Meteor 70 → 50 (about 140 per unit: 88% of a Bonker, 25% of a Tuskback).
  - Carpet Bomber 240 → 150 (91% of a Trench Raider, 26% of a Tankette).
  - Orbital Lance 650 → 450 (80% of a Photon Knight, 24% of a Walker).
  - Overcharge +25% → +10% per 400 XP. Overdrive charge ×1.5 → ×1.25.
  - Kills by powers and Last Stand pay 50% of the gold and XP bounty.
  - Change the B12 metric to "damage per unit in zone at A2.7 spacing" instead of "average cast".

**3. Bot level mirroring makes upgrades pointless and turns your own progress against you.**
- A6.8 sets the bot's level target to floor(your War Plan average), so every upgrade raises the bot as well. At +5% per level the change can't be felt in battle anyway.
- Once your average reaches 5, bots can field Legendaries (start level 6 ≤ target + 1). That creates a sudden difficulty jump caused by the player upgrading.
- Before that, your L6 Legendary against L1-3 commons is a flat +25% on top of its specialisation, and bots cannot answer it. The result is a steamroll, then a wall.
- **Fixes:**
  - Bots follow a fixed arena level curve instead (Arena N ≈ level N, within ±1). Being above the curve then feels strong, and being below it is a clear signal to upgrade.
  - A bot may field a Legendary only when the player's plan for that format contains one, and at the player's Legendary level.
  - Show levels in battle with a trim on the unit (bronze at L4, silver at L7, gold at L10).

**4. The capsule opening stages near misses and is dull half the time.**
- **Near misses are built in.** The cosmetic RNG decides which of the 4 strikes climb, so a Gold result often plays climb, climb, climb, clunk. The last strike fails at peak hope, which is exactly the staged near miss A10 forbids.
- **Half of all opens are an anticlimax.** 50% of Win Capsules are Clay: 4 taps, 4 clunks, 2 stacks, 4 copies and 60 Amber, over 7-10 s. Players will learn to use "Open all", and the ritual dies.
- **Gold capsules look Legendary.** The Gold tier colour #F5B82E is identical to the Legendary rarity colour, so every Gold capsule reads as "Legendary inside", but only 25% contain one.
- **The walkout gives the answer away first.** It shows the age glyph first, and each age has exactly one Legendary, so the identity is known at step 1. The role icon then shows "Siege heavy" for 4 of the 5, so the rest of the reveal is dead air.
- **Fixes:**
  - Back-load the climbs: clunks first, then climbs. The last strike always climbs when the tier is above the start tier, and a climb is never followed by a clunk.
  - Change the bag to 30 Clay / 40 Bronze / 20 Silver / 7 Gold / 3 Aeon, with copies of 3 / 6 / 12 / 28 / 45. The expected value stays at 9.0 copies, so A6.9 pacing holds.
  - Reserve #F5B82E for Legendary only and recolour the Gold tier.
  - New walkout order: rarity flare, then a silhouette growing from 20%, then the age glyph and name last.
  - A NEW Epic gets a 2 s mini-walkout.

**5. The evolve "power spike" is invisible when the army is full.**
- Built units don't change, queued units keep their old card, and the pop cap is 20. Most evolves happen at 14-20 pop, so for 4-10 s nothing from the new age reaches the lane, and at 20/20 nothing does until something dies. Pillar 2 comes down to a backdrop and a base swap.
- **Fixes:**
  - On evolve, items still waiting in the queue convert to the same-role card of the new age. Prices are flat, so this is free.
  - Spawn 2 free new-age Infantry ("Vanguard") at the gate: summoned, no pop, 0 bounty.

## P1: hurts clarity and retention by hour 2

**6. Deck choices are shallow, and new pulls can't be used without a sacrifice.**
- Each age has exactly one unit per role and 4 slots. The advisor and the counter triangle demand Infantry, Ranged, Heavy and Anti-armor, so every Support, Epic or Legendary pull must replace a triangle piece. The real choice is which single role to drop, and auto-fill makes everyone converge on the same plan.
- Alternate powers unlock at Arenas 2-6. The Future alternate needs about 2,500 trophies, 30+ hours in.
- **Fixes:**
  - 5 unit slots per age.
  - Stone, Medieval and Gunpowder alternates at 100 / 200 / 300 trophies; Modern and Future alternates at 400 and 500.
  - The reveal summary gets an "Equip now" button that fills the same-role or lowest-level slot.
  - Build v1.1 content as role sidegrades, not new roles.

**7. The battle is hard to read.**
- **Units blur together.** Rank spacing is 14.4 lu, but sprites are about 40-55 lu wide, so each unit overlaps 3 neighbours. The y jitter of ±6 lu is only about 5 px.
- **The backdrop fights for attention.** The split-age seam sits at the midpoint of the two front lines, so the moving blend is always directly behind the fight.
- **Soldiers look alike.** Modern and Future ranged, anti-armor and support units are all gunmen that differ only by weapon at about 30 px.
- **The counter triangle can't be seen.** No hit shows that a damage modifier applied.
- **Last Stand is hidden.** An enemy's armed Last Stand isn't shown, so "play around it" is impossible.
- **Colours collide:**
  - Legendary gold (hue ~42°) against opponent orange (~31°) and the Blue/Yellow preset's #F2C21E (~46°).
  - Gunpowder navy #22345C (~222°) on enemy coats against player blue (~217°).
  - The Golden Behemoth skin reads as the yellow team in the Blue/Yellow preset.
  - The Legendary aura contradicts "rarity colours in UI only".
- **Fixes:**
  - Show 3 depth rows in the view only (y −16 / 0 / +16 lu by rank index mod 3, front rank ±8). The sim spacing doesn't change.
  - Fix the seam at x = 600, with drift ≤ 20 lu/s clamped to [450, 750], a 240 lu blend and 30% desaturation.
  - Put a 12 px role glyph on the ground ring.
  - Hits with a ×1.5+ modifier get an orange "effective" spark; ×0.75 or lower gets a grey "resisted" puff.
  - Show a horn icon on the enemy base while its Last Stand is armed.
  - Rule: non-team parts may not use a hue within ±35° of either team hue (in any colourblind preset) at saturation above 40% for more than 10% of the silhouette.
  - Make the Legendary aura white or violet.

**8. Early ages get rote, and matches run long.**
- By around match 20, every Full War opens the same way: the first ~55 s of Stone and ~70 s of Medieval, about 30% of each 7-10 minute match.
- **Fixes:**
  - Stone threshold 900 → 700, Medieval 1,100 → 1,000.
  - Full War Overdrive at 5:30.
  - Ladder format choice (item 1).

**9. Losses are frequent and empty.**
- After match 10 the matchmaking targets a 50-55% win rate, so about 45% of matches are losses. A lost Full War costs 7-10 minutes for 8 Amber and −20 trophies. That is PvP-grade punishment in a PvE game.
- "Shift one tier down" and "Warm-up match" both need a tier below I, and none exists.
- **Fixes:**
  - Target 60% steady state, and 65% for the first 20 matches.
  - A loss pays 15 Amber plus 1 capsule shard; 3 shards make a Clay capsule without using a charge.
  - Add Tier 0: decision interval 2.0 s, 45% mistake rate, at most 1 turret, no Treasury.

**10. There is no mastery goal; trophies just measure hours played.**
- Adaptive MMR plus +30/−20 makes trophies ≈ matches × 7.5. Arena 8 is about 470 matches past Arena 3 (~60 h), and Trophy Road nodes arrive every ~13 matches.
- **Fixes:**
  - Add a v1 "Conquest" board built from existing Generals at fixed tiers: 10 Generals × 3 stars (win; win with base above 50%; win before 6:00), with one-time capsule and power rewards. It needs no new art.
  - Trophy Road nodes every 50 trophies up to 2,000.

**11. Turtling will beat the bots.**
- A human on Hold with 4 turrets inside 480 lu gets farmed pushes: the bot attack clock raises Charge +10% per 5 s after 60 s, marching bots into the turrets. A2.14 tests turret-heavy bot plans, not a human turtle.
- **Fixes:**
  - Bots push only when own army value ≥ 1.3 × (enemy army + 90 s of enemy turret damage in gold terms). Otherwise they bank for Overdrive and build Treasury and outranging units (such as the Bronze Cannon).
  - Add a scripted turtle player-proxy to the balance matrix, with a target of winning < 45% against tier V+.

**12. The phone HUD is overloaded.**
- On a phone about 390 px tall, the top bar is 35 px for 2 HP bars, 2 XP bars, the phase clock, the power ring, pause and speed. The Scouted strip below it would cover the lane band, breaking the no-overlay rule.
- The tray is 94 px tall with 9 controls in ~750 px of usable width. Evolve and Age Power sit side by side, so a misfire means an evolve at the wrong time or a wasted power.
- **Fixes:**
  - Top bar at 12% of height.
  - Scouted strip moves into pause or a pull-down.
  - Evolve attaches to your own XP bar, top left.
  - Emote moves to the top bar; Treasury becomes a tap on the gold counter.
  - Tray: gold, 5 cards, army/stance, power, and Last Stand when unlocked.

**13. Replacing old turrets takes too many steps.**
- Swapping one turret takes about 7 steps (long-press, confirm, 1 s sell, tap, pick, 1 s build), per mount and per age, up to 16 times in a Full War. Players will leave Stone turrets on a Future base.
- **Fix:** a one-tap "Modernise" on the mount: costs the new price minus the 50% refund, takes 1 s, and outdated turrets show a glowing arrow.

**14. The queue head blocks at pop cap.**
- A Heavy at 19/20 pop blocks the Infantry queued behind it.
- **Fix:** if the head item doesn't fit, the first queued item that fits spawns instead.

**15. Global hitstop will stutter.**
- Every Heavy death triggers an 80 ms global freeze, and Heavies are common cards. With both sides trading them in Overdrive, freezes land every 0.5-1 s, freezing 8-16% of the time.
- **Fix:** global freezes only for Legendary deaths, power impacts, your own evolve, Last Stand and base destroyed, capped at 150 ms per 3 s.

**16. Match 2 teaches too much at once.**
- It introduces 3 ages, about 10 cards, Treasury, mounts and clock phases together.
- **Fix:** introduce one new mechanic per age (Stone: Treasury; Medieval: a second mount). Stance and Last Stand unlock in matches 4-5, each with a one-line hint.

## P2: collector depth, polish and risk

**17. The collection runs dry fast.**
- **New cards run out within weeks.** The starter kit already owns 30 of 55 cards. The Arena 1 Rares are done in about 10 capsules and the Epics in about 20; all 5 Legendaries take 2-3 weeks. After that, capsules are copies only, which item 3 makes nearly worthless.
- **Mythics are out of reach.** Crate odds are 0.6%, Mythics can't be crafted and have no pity: about 0.3 per year for an engaged player.
- **Too many currencies.** Seven progression currencies in a game with no store, and Dust only appears after L10, months in.
- **Fixes:**
  - Foil card variants as the long-tail chase: Bronze / Silver / Holo frames at 4% / 1% / 0.25% per stack, procedural and cosmetic only.
  - Mythic hard pity at 40 crates.
  - Replace Wild Shards with Dust (Rare 100, Epic 400, Legendary 1,600) so crafting works from week 1.
  - Rename Collection XP (for example "Codex") so it isn't confused with battle XP.

**18. Bot emotes read as taunts.**
- Laugh or Angry from a bot in PvE feels like taunting.
- **Fix:** bots use only GG, Salute and Thumbs up, once per match, unless the player emotes first.

**19. Spec gaps that will produce bad moments.**
- Arena 1 has "no random Legendaries", but the Aeon and Gold rules and the 40-capsule pity all promise one. A Legendary-less Aeon would be the worst reveal in the game. Define that guaranteed and pity Legendaries always come from the pool's ages.
- Pip "always opens Ranged then Infantry" (A7.4) contradicts "Pip leans on Tuskbacks" (A8).
- The staged result-screen rewards must be tap-to-skip.

**20. Too close to Age of War 1 for "our own IP".**
- The 3 commons per age map almost 1:1 onto AoW1's roster: club, sling, beast rider; sword, archer, knight; duelist, musketeer; knife, gunner, tank; blade, blaster, war machine.
- The default powers closely track AoW1's per-age specials: meteors, arrow rain, bombardment, bomber run, sky laser.
- Players will call it a reskin.
- **Fixes:**
  - Make Stampede, Smoke Screen and Paratroopers the defaults, and turn Meteor, Broadside and Carpet Bomber into the arena unlocks.
  - Give each age's commons one mechanic AoW never had (for example, a Pebbler ricochet or a Corsair grapple).
