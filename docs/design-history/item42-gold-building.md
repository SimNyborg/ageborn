# Queue item 42: a building that generates gold (design pass)

> Kept in the repo on 2026-10-26 (copied from the orchestrating session's scratch folder). Paths under `/tmp/claude-0/...` or `scratchpad/...` inside point at that session's working files (captures, scripts) and may no longer exist. The owner questions are tracked in `docs/owner-queue.md`; until answered, the recommended defaults apply.

Date: 2026-10-25. Designer pass for owner queue item 42, designed to fit item 12's recommended Option C. Nothing here is built; the repository was read only.

Inputs: `CLAUDE.md`; `docs/owner-queue.md` items 12 and 42; `docs/design-history/item12-upgrade-paths.md` (all of it); DESIGN A2.3, A2.8, A2.10, A2.11, A2.13, A2.14, A6.6, A7.1-A7.4, A9.2, A16.1, A16.2, A16.5, A16.14 (all), A18.2-A18.5, A18.7.5, A18.11-A18.13, B3, B12; `docs/ui-plan.md` 4.7 and 5.3-5.5; `docs/ui-principles-short.md`; `docs/decisions.md` (forts: owner request, AI v1, F3, review fixes, "forts go live"); `docs/research/{a18-upgrades-pacing,a18-classics,genre-peers,depth-benchmarks,aow-deepdive}.md`; the code in `src/sim/systems/{forts,economy,deaths,turrets,targeting}.ts`, `src/sim/{research,researchRules,hashState,state}.ts`, `src/core/{forts,fortPads}.ts`, `src/content/raw/{economy,research,fortKit,stone,bronze}.ts`, `src/contracts/{content,sim}.ts`, `src/ai/{brain,forts,ledger,tiers,personalities,view}.ts`, `src/render/eventMapper.ts`, `src/render/hudModel.ts`, `tools/{proxies,exploits,forts,sim-cli}.ts`.

**Measurements.** Five small headless batches on the real sim (34 matches, tier VII Echo at L7 unless noted), run with a scratch script while three build agents shared the machine. They give the gold flow and a crude "Mint overlay": a model laid over finished matches that does not feed gold back into play. Every such number is marked *indicative*; the prototype gate (5.5) measures the real thing. Web facts come from search-result summaries: the pages themselves could not be opened from this environment (DNS and proxy refused them), so their details are as summarised.

---

## 0. Summary

- **Recommendation: the Mint** (working name), a fifth kind of Fort beside Wall, Tower, Camp and Trap. You pick it in the War Plan's Fort slot for an age, drag it onto one of the three Home pads in front of your base, and it pays **25 gold every 10 s, 10 times** (250 gold) for **150 gold**. It pays back after about a minute, has paid 100 more by 1:45, then closes; you can build the next one at once.
- **It is open to counterplay.** It stands on the lane with half the HP of the age's Heavy Common; Heavies, siege and artillery deal ×2 to it; long-range units can reach it from outside your turret cover. Whoever destroys it gets 75 gold (no XP).
- **It cannot snowball or turtle easily:** one fort up at a time, it is never doubled in Overdrive, it stops in Siege, no research ever makes it stronger, and its purse runs dry after 100 s.
- **Gold arrives by itself.** A coin pops over the Mint with a chime and flies to your gold counter, and the counter's "+6/s" reads "+8.5/s" while it stands. No new button: it is the age's Fort card in the placement dock.
- **The AI uses it and attacks it** with the same commands and public information: bots place it on a quiet lane when they are not behind and it can pay back before Siege; from tier V they push a little earlier against a standing enemy Mint.
- **It fits Option C.** The Economy line stays safe, permanent income that grows with match length; the Mint is risky mid-game tempo that does not. Each answers a different situation, and the stack is gated by proxies.
- **One prototype gate for items 12 and 42** (about 4.5 agent-days instead of 5.5 apart), with the go/no-go written down in 5.5. In all, item 42 adds about 11-13 agent-days to item 12's 25-31.
- **Correction to the queue note:** Clash Royale's Elixir Collector was not removed. It was nerfed again on 6 October 2026, and the lesson of that nerf is the useful one (3.1).
- **Three owner questions** (section 7): where it stands, whether gold arrives by itself, and whether it is temporary.

---

## 1. The goal

### 1.1 In the owner's words

> "There must also be a building that generates cash in the game, like in Clash Royale or like the sunflower in Plants vs. Zombies." (owner, 2026-10-20, `docs/owner-queue.md` item 42)

The orchestrator's reading with it: an investment the player chooses (pay gold now, earn more over time), visible on the field (coins popping up with a sound) and open to counterplay (the enemy can attack or destroy it), one per age in its own art, used and targeted by the AI, probably a new kind of Fort chosen in the War Plan in place of a defensive fort, with a cap per side and a payback time set by the balance gates; designed with item 12 so the economy levers do not overlap.

### 1.2 What "done" means (our reading)

1. **A building, not a number.** It stands on the battlefield, you place it, and it visibly makes gold.
2. **An investment with a real choice:** it costs gold now and something else (a fort for that age), pays back only if it survives, and is wrong in some situations.
3. **Counterplay:** the opponent sees it and can destroy it; destroying it is worth doing.
4. **Satisfying feedback:** coins pop up with a sound and reach your gold; nothing to tap, no new button (A16.1 HUD ceiling, U5, U15).
5. **One per age in its own art,** rendered in Blender like the forts.
6. **The AI places it and attacks it** under the player's rules (A7.1).
7. **No snowball, no turtle, no must-pick:** it fits Option C's Economy line, and gates prove it before anything ships (the A16.14.9 and DESIGN-12 style).

---

## 2. What exists today

### 2.1 Gold today

| Source | Rule | Share of a side's gold |
|---|---|---|
| Start gold | 175 | ~3% |
| Passive income | 6 gold/s, ×2 in Overdrive and Siege | **68%** (Short War, measured: 4,625 of 6,789) |
| Kill bounty | 50% of the victim's cost (powers 30%); fort kills the same; underdog +50% | **28%** (1,916 of 6,789) |
| Economy research (War Council) | Granary +1.5 g/s or Forage (+40% bounty in your half); Market +2 g/s or Bounty Hunters (65% bounty); Option C adds Guildhall (+2.5 g/s, queue −1) or Levy (Commons −12%, income −1 g/s). Never doubled in Overdrive. Built prices 150 / 300, Option C 125 / 250 / 400 | Research in all tracks took 14.7% of gold (measured) |
| Shown where | The gold counter reads "+6/s" plus research income; the base grows a Treasury prop per Economy pick (coins burst out of it); the research ring is public | |

Measured (indicative), Short War, tier VII Echo mirror, n = 6: median length 7:29; gold earned per side 6,789 (A18.3.3 expected ~6,500; Standard ~9,800 and Full ~14,000 are its estimates). An enemy ground unit stood within 350 lu of a side's gate in 9.5% of the seconds before Siege (median); for the eventual winner 0-4%, for the loser 10-38%. The quiet stretches between such incursions lasted 42 s at the median (p25 11 s, p75 102 s).

### 2.2 Structures on the lane today (A16.14, live since 2026-10-01)

- One Fort slot per age loadout; four kinds compete for it: Wall (125 gold, 1.0 H), Tower (150, 0.5 H, shoots), Camp (150, 0.6 H, a weak levy every 10 s), Trap (100). H is the age's Heavy Common HP, scaled by the loadout multiplier.
- Placed by dragging the Fort button onto a pad: **Home pads** at p 160, 230, 300 (inside every age's 150-gold turret), **Field pads** 640 and 820 (camps only, with your army in front).
- 25 s recharge (first ready at 0:20), a 5 s scaffold at 50% HP, **one fort or trap up at a time** (`maxAlive` 1), decay from 60 s after completion, ×2 from Heavy, Legendary, siege and artillery, ×0.5 from other attacks with range 100+, a 5-attacker contact cap, never hit by powers, crumble in Siege. A fallen fort pays the killer 50% gold and 70% XP.
- Unlocked at War Path Bronze L4 or 400 trophies; never in capsules. Bots bring their General's preferred kind, else the wall. Open since the review: bots still use forts weakly (fort AI value 42.8-52.4% against a 50-62% band).

### 2.3 Why a building must differ in form, not just add income

1. **More flat income is the Treasury again.** The owner called linear money upgrades boring (A18.1); the classic's flat Income level "is not remembered", while economy choices with risk are (a18-classics findings 4 and 8). The Economy track already covers safe, permanent income, and its picks already show on the base.
2. **Permanent income compounds.** A second permanent source stacks with Granary, Market and Guildhall into a snowball. A18.5.4 already rejected interest on banked gold and anything that multiplies with Overdrive for that reason, and the 2007 classic's worst exploit was "turtle and idle farm" (aow-deepdive 2.9).
3. **A decision needs counterplay and information** (the five tests, A16.1). Research is public but cannot be attacked. Both of the owner's references are objects the enemy can kill: the form is the point.
4. **The core loop** (bank, then wave; A16.1) gains from it only if the building gives the opponent a reason to wave and the owner a reason to defend.

So the building must be **on the field, attackable, temporary or capped, chosen at a cost, public, never multiplied by Overdrive or research, used and attacked by the AI, and added without a new button.**

---

## 3. Lessons from the peers

### 3.1 What they did, what was fun, what went wrong

| Game and building | Numbers | Fun | Degenerate | Lesson |
|---|---|---|---|---|
| **Clash Royale, Elixir Collector** (Rare building card) [1-6] | 5 elixir at launch, **6 from 20 Oct 2016**. 2022 rework: 1 elixir every 9.0 s (was 8.5), lifetime 65 s (was 70), plus **1 guaranteed elixir at destruction**, 8 in total. Nov 2025: 12 → 13 s per elixir, lifetime 1:26 → 1:33. **6 Oct 2026: 13 → 15 s, lifetime 1:33 → 1:50**: by our arithmetic still 7 produced plus 1 at destruction, 8 for 6 (+33%) | "Pump up" when the opponent cannot punish, then out-elixir them; double elixir with 3-4 pumps wins games [4] | May 2016: use rate "very high at the top", "feels like an auto-include", "too good in its role as a distraction and damage absorber": HP −20% (preview), later −13% [3]. 2025-26: Three Musketeers decks depended on it, so Supercell slowed its payback twice: "we wanted them to be viable without depending on Elixir Collector. Its RoE (Return on Elixir) will now take longer to pay off" [2] | Keep the total return fixed and tune the **payback time**. Avoid decoy value and archetype dependence. Punish decks (spell the pump, rush the other lane) keep it honest [5]. **It was not removed** (the queue note says it was): it is still a card and was nerfed on 6 Oct 2026 |
| Clash Royale, Elixir Golem [7] | Gives the **opponent** 4 elixir in total as its parts die | High risk, high reward | Unsupported, it "just gives your opponent free elixir" | The economic risk can be paid to the opponent: our 75-gold kill bounty |
| **Plants vs. Zombies, Sunflower and Twin Sunflower** [8-10] | Sunflower 50 sun, 25 sun about every 24 s, 7.5 s recharge; Twin Sunflower 150 sun on top of a Sunflower, double output, very slow recharge | George Fan made the engine plant cheap to teach engine building (depth-benchmarks [S29]); players are advised to plant at least a column of them [8] | In single player it is a must-pick in every day level, by design. Sun must be clicked: Replanted (2025) added a **Sun Magnet** to collect many at once [10] | Engines are fun when early and visible. Clicking coins becomes a chore at scale |
| PvZ Versus mode [9] | The zombie side's **Gravestone** is its Sunflower; the plant side destroys graves with Grave Buster, whose recharge is "much slower in Versus Mode, due to balancing" | Mirrored economies with a direct counter | | In PvP the economy building needs a counter that exists but does not dominate |
| **Bloons TD 6, Banana Farm** [11-13] | Farms make money every round; the Monkey Bank stores cash with 15% interest up to a cap and stops when full; Marketplace and Banana Salvage auto-collect | Farming is a favourite late-game plan | CHIMPS, the hardest mode, **disables all farm income**; players say farming is the snowball that makes the game easy [11] | Even tower-defence games automate collection and ban income where it trivialises the challenge |
| Bloons TD Battles 2 [14] | Two incomes: eco from sending bloons (pressure) or Banana Farms (greed) | | "All sources of income will be gone if your rush fails"; farms "aren't the best strategy" | In PvP, income tied to pressure keeps players interacting (Ageborn: Forage, Bounty Hunters) |
| StarCraft II, fast expansions [15] | A greedy expansion pays off "if you can defend it but it is more risky"; the 6-Rax all-in "is designed to punish an opponent for opening with an economic build" | The greed-versus-rush read | | Greed must be punishable by a commitment the opponent can see coming |
| Age of Empires II, Feitoria [16] | A building that produces resources every second whatever is left on the map | | Player threads: it lets the owner "wait out opponents in late game", rewards defending at home; proposals: cap the count, slow it as the game goes on | A passive building with no end feeds turtling. Cap it and let it end |
| Stick War: Legacy, miners; The Battle Cats, Worker Cat; Legion TD 2 sends | Miners cost army space and can be killed; the Worker Cat levels income in battle; income sends weaken your defence (genre-peers, a18-classics, depth-benchmarks [S35], [S44]) | "Greed against safety" is the decision each match turns on | | genre-peers' own recommendation: "add an upgradable income building or worker track each age, so players choose between raising income and spending now" |

### 3.2 What makes a production building a real decision

1. **It can be punished, and punishing it is worth it.** It stands where the opponent's normal play reaches it, and killing it pays (CR punish decks, SC2 all-ins, PvZ Grave Buster).
2. **The payback time is the main dial.** Supercell kept the total at 8 and slowed the rate twice; a longer payback means more exposure and a smaller edge for a side that is already safe.
3. **It ends, and it is capped.** A lifetime or purse plus a cap stops compounding and idle farming (the Feitoria complaints, the 2007 classic's idle farm).
4. **It is a sidegrade to what it replaces,** never what a plan depends on (CR 2025-26), so it competes for a slot.
5. **No decoy value.** It must not be the best wall in the game (CR May 2016).
6. **No late-game multiplier.** Double elixir made several pumps decisive; ours must not double in Overdrive and must stop in Siege.
7. **No collection tax.** Tapping coins is an attention cost that favours fast fingers, fails in a live match that runs while the tab is hidden, and bots would collect perfectly (PvZ's Sun Magnet, BTD6's auto-collect upgrades).
8. **Everyone sees it** (the opponent, the bots, the replay), so it can be read and answered.

### 3.3 Sources

Search-result summaries; the pages could not be opened from this environment.

1. Clash Royale Fandom wiki, Elixir Collector and 6-elixir history (cost 5 → 6 on 20/10/2016): https://clashroyale.fandom.com/wiki/Elixir_Collector ; https://clashroyale.fandom.com/wiki/Category:6-Elixir_Cards
2. Supercell, October 2026 balance changes (Season 88): https://supercell.com/en/games/clashroyale/blog/release-notes/october-balance-changes-2026/ ; summaries: https://youmind.com/landing/x-viral-articles/clash-royale-oct-2026-balance , https://trophycoach.com/tools/meta-tracker/elixir-collector ; November 2025 (Season 77): https://supercell.com/en/games/clashroyale/blog/release-notes/november-balance-changes-2 , https://royaleapi.com/blog/season-77-balance-wip-november-2025?lang=en
3. TouchArcade, 29 Apr and 16 May 2016 (HP nerfs, "auto-include", "distraction and damage absorber"): https://toucharcade.com/2016/04/29/mortar-and-bomb-tower-nerfs-coming-as-well-as-more-clash-royale-balance-changes/ ; https://toucharcade.com/2016/05/16/freeze-is-finally-getting-nerfed-and-more-clash-royale-changes-coming-this-wednesday/ ; Supercell, December update (−13% HP): https://clashroyale.com/blog/release-notes/balance-update-coming-12-12.html
4. Clash Royale Fandom wiki, deck 3M Collectors (3-4 pumps in double elixir; "spending 6 elixir in the back can leave you open"): https://clashroyale.fandom.com/wiki/Deck:3M_Collectors
5. Clash Royale Fandom wiki, deck Pump Punisher: https://clashroyale.fandom.com/wiki/Deck:Pump_Punisher
6. cr-api.com, Season 34 balance (April 2022 rework): https://cr-api.com/blog/season-34-balance
7. Sportskeeda, Elixir Golem: https://www.sportskeeda.com/esports/elixir-golem-clash-royale-details-stats-strategies
8. StrategyWiki, Plants vs. Zombies plants (Sunflower, Twin Sunflower): https://strategywiki.org/wiki/Special:MobileDiff/1077376
9. Plants vs. Zombies wiki, Versus Mode and Grave Buster: https://plantsvszombies.wiki.gg/wiki/Versus_Mode ; https://plantsvszombies.wiki.gg/wiki/Grave_Buster_(PvZ)
10. Wikipedia, Plants vs. Zombies: Replanted (Sun Magnet): https://en.wikipedia.org/wiki/Plants_vs._Zombies:_Replanted
11. Bloons wiki, CHIMPS: https://www.bloonswiki.com/CHIMPS ; Steam discussion: https://steamcommunity.com/app/960090/discussions/0/3820795131605596905
12. Bloons wiki, Monkey Bank (BTD6): https://www.bloonswiki.com/Monkey_Bank_(BTD6)
13. Bloons wiki, Banana Salvage (BTD6): https://www.bloonswiki.com/Banana_Salvage_(BTD6)
14. Bloons wiki, Banana Farm (BTDB2); Charlie Intel, Battles 2 eco guide: https://bloons.fandom.com/wiki/Banana_Farm_(BTDB2) ; https://www.charlieintel.com/games/bloons-td-battles-2-beginners-guide-eco-best-loadouts-more-235850/
15. Liquipedia, Siege Expand (TvT) and 6Rax All-in: https://liquipedia.net/starcraft2/Siege_Expand_(vs._Terran) ; https://liquipedia.net/starcraft2/6Rax_Allin
16. Age of Empires forums, Feitoria threads (player opinions): https://forums.ageofempires.com/t/the-balance-nightmare-of-the-feitoria-and-why-it-needs-to-be-reworked/224293 ; https://forums.ageofempires.com/t/concerning-feitorias-an-analysis-and-a-suggestion/72852
17. Internal: `docs/research/a18-classics.md` (findings 4, 8), `genre-peers.md` (recommendation 4), `depth-benchmarks.md` (2.4-2.8), `aow-deepdive.md` (2.9).

---

## 4. Options

### 4.0 Rules every option keeps

1. Paid with battle gold. No real money, no new currency, nothing sold.
2. Public: both sides and the bots see the building, its state and its payouts (A7.1).
3. Same rules for bots; difficulty changes behaviour, never stats.
4. Gold from it is flat across ages (unit prices are), never doubled in Overdrive, and never raised by research.
5. Content is data, integer math, new state hashed, every command in the replay, one contract bump (with item 12's if built together).
6. No new always-visible control; a spend takes a confirming gesture; a denied press says why; nothing flashes to nag.
7. Our own names; nothing from the classic.

### 4.1 Option A: the Mint, a fifth fort kind on the lane (recommended)

**Idea.** A new Fort kind, the Mint, one card per age. It goes in the War Plan's Fort slot instead of that age's wall, tower, camp or trap. In battle you drag it onto a Home pad; after the 5 s scaffold it pays 25 gold every 10 s, ten times, then closes. It uses every fort rule (pads, scaffold, recharge, one fort up at a time, ×2 from breakers, crumbling in Siege, bounty to the killer), with three differences: it pays gold, it has no decay before Siege (its purse is its clock), and its kill bounty is gold only.

**The decision it creates.**
- *In the War Plan (commitment):* which ages carry a Mint instead of a fort that defends. A greedy plan puts Mints in quiet early ages and walls later; a defensive plan never takes one.
- *In battle:* when to spend 150 gold (three Bonkers) on gold later: in a lull, not with a wave coming; whether to stay near it (Hold at the line) or keep pushing; whether to build one just before an evolve (it holds your fort cap for up to 105 s).
- *For the opponent:* punish now, while the owner is 150 gold short and has a target on its pads, or out-tempo the investment elsewhere.
- The five tests (A16.1): a trade-off (gold now, a fort slot, the cap), information (the scaffold, the purse and every payout are visible), counterplay (below), attribution (you see each coin and each loss), state-dependence (a quiet lane, your army against theirs, the time to Siege).

**Counterplay.** A wave that reaches your pads breaks it in about 5 s (Stone at L7: 364 HP; three Bonkers deal 78 per second, a Tuskback 73 with its ×2). Heavies, siege, artillery and Legendaries deal ×2; the Heavy Breaker pick (Option C) adds 25%. Long-range units (range 400-440) and artillery can hit a Mint on any Home pad while standing outside a 480-560 lu turret cover (they shoot it when no enemy unit or base is in range, A16.14.2), and other ranged units shoot it when it is the only thing in range. Bombers drop on it. A scaffold destroyed pays the full bounty, so building into a wave is punished. Powers never touch it (the fort rule).

**How the AI plays it** (`src/ai/forts.ts`, a Mint branch beside walls and camps):
- *When:* the slot is ready; gold ≥ cost + the tier's gold float; no enemy trained ground unit in the bot's half and no wave worth 300+ within 900 lu of mid-lane (the existing wave reading); the bot's army is worth at least 0.8 × the enemy's; the Mint can pay back before Siege (now + scaffold + 60 s + 10 s margin ≤ the Siege tick from `observedClock`); VII+ never while banking for a wave (the existing `fortNoBank`).
- *Where:* the most rearward safe Home pad (pad 160 in most states), the opposite of a wall.
- *Gold ledger:* a `mint` saving goal after the income-research goal, so trains wait for it on a quiet lane, the way Treasury goals already work.
- *Tiers:* the Mint joins the kind list from tier III (it is a quiet-lane purchase, like the hint tier's income research); tiers 0-II never build it.
- *Fort card:* Baroness Ledger prefers the Mint (`fortPrefer: ['mint']`), so do procedural Commanders that copy her; others keep their kinds; Echo of You plays the player's own plan, Mints included.
- *Targeting the enemy's Mint:* it counts in the push gate's D at 1 × its cost (it blocks about half as long as a wall, which counts 2×); from tier V a scouted, standing enemy Mint lowers the push gate by 10% (the enemy has 150 gold less in its army), VII+ only while the bot's army is at least 1.0 × D; Rook (`fortAnswer`) by 15%. Units break it on their own when they reach it, and the existing structure row in counter scoring brings Heavies, siege and artillery.
- *Reading gold:* the bots' estimate of the player's gold adds the enemy Mint's public payouts.
- *Mistakes:* a tier-scaled "builds a Mint with a wave coming".

**HUD and feedback.** No new control: the Mint is the age's Fort card in the placement dock.

```
+----------------------------------------------------------------------------------------+
| [St] HP ########-- 92%      3:12  (:)    [AI][St] HP #######--- 88% (o)(o)(R)  [||][1x]|  44
|      XP #####----- 410/620                        XP ####------ 380/620   [Scouted 4]  |
|        [<]  ====================@============|============o====================  [>]   |  24
| .----.    +25                                                                  .----.  |
| | T  |    ($)  the coin pops on each payout and arcs to the gold counter         | T  |  |
| | T  |  [Mint]                      ^ ^  i i r a  >>>      <<<  h i r            | T  |  |  207
| |    |   ####   HP bar                                                         |    |  |
| '----'   ====   purse bar: 7 of 10 payouts left (gold, under the HP bar)       '----'  |
+----------------------------------------------------------------------------------------+
| (o)640 +8.5/s .----.----.----.----.----.----.----. .---. .----. .---. .---.            |
| Army 32/60    |50 I|75 R|150H|100A|110S|200I|75 R| |Chg| |Mint| |Hm | |Fd |            |  94
| (Cn)(Ev)      |Bonk|Pebb|Tusk|Spea|Drum|Sabe|Atla| '---' |150 | |125| |100|            |
|               '----'----'----'----'----'----'----'       '----' '---' '---'            |
+----------------------------------------------------------------------------------------+
```

- *Placing* is the fort drag (A16.14.7): Home pads light green, amber "Builds under fire" where a wave can reach the scaffold, grey with the reason; the ghost shows "Pays 250 over 1:40". The gold floats "−150" and the scaffold rises in dust (MR-70b).
- *Payout:* on each payout the worker's stroke lands, the building gives a small squash (1.04) and a coin pops with "+25" (the existing gold number) and arcs to the gold counter (the existing `fxFly` to `gold`), with `coin_gain` at its climbing pitch. When the Mint is off screen, the counter bumps with a "+25" chip instead. It is feedback, not an attention pulse (U15): small, every 10 s, never looping.
- *Rate:* the counter's income line includes the standing Mint (+6/s → +8.5/s; +12 → +14.5 in Overdrive), with a green tick when it completes and a red tick when it falls or closes.
- *Purse:* a thin gold bar under the HP bar (payouts left), plus the art's coin heap in four stages; the enemy's shows too, so a full enemy Mint reads as a target.
- *The enemy's payouts:* a muted orange coin sparkle with no number and no sound.
- *Falls:* fort debris plus a coin spill; the attacker's bounty coins fly as for any kill. *Closes:* shutters close with one last glint, quietly; the Fort button is ready again (a steady rim, no pulse).
- *Siege:* the purse bar greys, the Fort button shows "Siege: forts crumble" (existing).
- *Tip* (long-press or hover): "Mint · 150 · pays 25 every 10 s, 10 times. Heavies break it ×2. Stops in Siege." A first-seen caption the first time one completes.
- *Reduce motion:* the coin fades at the counter instead of flying; numbers and sounds stay.

**Art.** Eight Mints, one per age, rendered in the realistic Blender fort pipeline (`art/blender/styles/realistic/forts/`, about an hour per static rig, A16.14.8) with the fort sheet contract plus a `purse` layer (four coin-heap stages) and a `close` clip. Each has a small crew drawn from the age's Infantry Common sheet at 0.6 scale, as tower crews are, whose swing becomes the hammer, sieve or shovel stroke and lands on the payout tick (the view reads the next payout time; the sim owns it). Working names: Stone **Gold Panners**, Bronze **Coin Press**, Medieval **Moneyer's Hall**, Gunpowder **Counting House**, Industrial **Gold Pithead**, Modern **Bank Vault**, Future **Fusion Mint**, Cosmic **Star Refinery**. Team colour on a banner or awning; idle life on every rig; squash on build and payout; collapse into rubble with coins.

**Interplay with Option C's Economy line.** The Mint is a separate lever: no research changes it (A16.14.5 keeps "no research of any track touches forts", Engineers' scaffold time apart), and it never raises the passive income the Economy picks add to. The roles differ (5.4): Granary, Market and Guildhall are safe and permanent and grow with match length; Forage and Bounty Hunters pay in busy games; the Mint pays when you can hold your pads for a minute, then ends. A greedy player can take both; the `mint_rush` proxy gates that stack.

**Effort:** about 11-13 agent-days (6.3). **Risks:** bots use forts weakly today (the value row must pass); the leader's Mints are safe while the trailer's are not (4.4, gated in 5.5); the one-fort cap can lock a wall out after an evolve (a lever if the owner check dislikes it); a fifth kind may be ignored or become the only kind (the per-card rows).

### 4.2 Option B: the Counting House on a turret mount

**Idea.** A building you put on a turret mount instead of a turret: tap an empty mount and the popover lists the age's two turrets and its Counting House. 200 gold, +2 g/s for the rest of the match. Like turrets it cannot be attacked, so its counterplay is indirect: it **closes while an enemy ground unit is within 300 lu of your gate** and in Siege (shutters down, no income), and a Suppress power closes it for its duration. Sell refunds 50%.

- **Decision:** a mount for defence or for income (a real trade, visible to the opponent: one turret fewer); when to build it; whether to sell it for a turret later.
- **Counterplay:** pressure on your gate shuts it; a base with a Counting House has one turret less, so push. It can never be destroyed.
- **AI:** builds it on a free mount when the lane is quiet and it pays back before a minute into Overdrive (the existing income timing); turtle styles never; bots never sell. Against it: the push gate counts one turret less.
- **HUD:** one more row in the mount popover; coins rise from the base; the counter's rate; shutters and a lock glyph while closed. No new button.
- **Art:** eight mount-sized buildings rendered in Blender like the turrets and forts, with an open and a closed state.
- **Interplay with Option C:** heavy overlap. It is permanent, safe income like Granary, Market and Guildhall, it competes with Option C's turret paths for the same mounts, and a turtle whose turrets keep enemies 300+ lu away earns its full income.
- **Effort:** about 9 agent-days. **Risks:** no real counterplay ("just adds income" in a new place), it helps turtles, it overlaps the Economy line, and taking a turret away makes the already weak turret plan weaker still.

### 4.3 Option C: a War Council pick that raises a building

**Idea.** The Economy line's rank III gets a building pick: **Royal Mint** (replacing DESIGN-12's unbuilt Levy) against Guildhall. Researching it raises a Mint on your rear Home pad that pays +3 g/s while it stands; when destroyed it rebuilds itself 45 s later. The pick stays owned all match.

- **Decision:** once per match, safe income (Guildhall) or more income that can be knocked out; then defend it.
- **Counterplay:** destroy it for 45 s of silence; there must be no bounty, or a leader could farm it every 50 s.
- **AI:** `chooseResearch` with an `aiHint` (`quiet`); targets it as in Option A.
- **HUD:** the existing Council sheet (Economy III shows "Guildhall or Royal Mint"); the building, coins and a rebuild ring on its ruins.
- **Art:** the same eight buildings as Option A.
- **Interplay with Option C:** it lives inside the line and excludes Guildhall, so rank III cannot stack; Granary + Market + Royal Mint still can.
- **Effort:** about 10 agent-days. **Risks:** it arrives late (rank III opens in the 3rd age of Short War, the 4th of Standard, the 5th of Full); it is one decision per match, not an investment you renew; a permanent building on pad 160 complicates fort placement; and it is a research upgrade, not a card you play like the owner's two references.

### 4.4 What the quick runs say (indicative)

The overlay placed a model Mint on finished tier VII Echo matches under three policies, with an earlier draft of the numbers (150 gold, 20 every 8 s, 15 times = 300). It feeds nothing back into play, so it shows exposure, not outcomes. Net gold per side and match (paid − cost − 75 per Mint lost to the enemy's bounty):

| Batch | A: Home pad 160, placed whenever no enemy is within 600 lu | B: as A, only while not behind in army (≥ 0.8 ×) | C: Field pad 640, with the army in front |
|---|---|---|---|
| Short mirror (n = 8): winner / loser | +416 / −53 | +408 / +30 | +91 / −258 |
| Standard mirror (n = 6): winner / loser | +429 / +231 | +443 / +260 | +71 / −499 |
| Tier VII vs `turret_turtle`, Short (n = 6): bot / turtle | +430 / +23 | +430 / +33 | +357 / 0 |
| Tier VII vs `rush`, Short (n = 6): bot / rusher | −73 / +121 | +109 / +179 | −156 / +112 |

What it says:
1. **Home pads are safe for the side that holds the lane**, so a Mint tilts toward the leader (about +400 gold, ~6% of a war's gold, in the draft numbers). That tilt is the main thing to gate and soften (5.4, 5.5).
2. **"Not while behind" removes most of the trailing side's losses** (B), so it is the AI's rule.
3. **Field pads are raided constantly and swing hard to the winner**, so the Mint stays on Home pads.
4. **A turtle gains almost nothing** when the attacker reaches its gate (+23 to +33), but the turtle row must confirm it on the real rules, where the gold feeds back.
5. **A rush punishes careless Mints** (−73 for naive placement against +109 with the rule): greed is punishable.

### 4.5 Side by side

| | A: the Mint (fort kind) | B: Counting House (mount) | C: Royal Mint (Council pick) |
|---|---|---|---|
| Like the owner's references | yes: a card you place, it pays, it can die, you place another | partly: a building, but it cannot die | partly: a building from research |
| Counterplay | strong: break it, punish the scaffold, artillery outranges cover | weak: pressure closes it | medium: break it for 45 s |
| Decisions | War Plan slot per age, and when to invest, again and again | mount use, once or twice | one pick per match |
| Overlap with the Economy line | low (temporary, exposed, flat) | high (permanent, safe) | inside the line (excludes Guildhall) |
| Snowball and turtle risk | medium, capped and gated | high for turtles | medium |
| New controls | none | none | none |
| Reuses | the whole fort system (pads, drag, HUD, AI planner, tools' fort rows) | mounts and popover | Council sheet and research AI |
| Arrives | when forts unlock (Bronze L4 or 400 trophies) | from match 1 with turrets | at rank III |
| Effort (agent-days) | 11-13 | about 9 | about 10 |

---

## 5. Recommendation and starting numbers

### 5.1 Recommendation: Option A, the Mint

1. **It is what the owner described:** a card in the deck that you place on the field, that makes gold you can see, that the enemy can destroy, and that you build again.
2. **It is a real decision every time,** with a commitment in the War Plan and a timing read in battle, and the opponent can answer it.
3. **It reuses a gated, live system,** so the new code is small: a payout timer, a purse and a few AI rules.
4. **It does not overlap the Economy line:** permanent safe income stays research; the Mint is risky, temporary tempo.
5. **On the two open questions:** on the lane and attackable (Home pads only), and gold that arrives by itself.

### 5.2 Starting numbers (for the prototype)

| Property | Value | Why |
|---|---|---|
| Kind and rarity | Fort kind `mint`, Rare; one card per age (8) | Forts are the lane-structure system; Rare like camps and traps |
| Cost, pop | **150 gold**, 3 pop | The price of a camp or tower; pop like a trap |
| Pads | Home pads only (160, 230, 300) | Inside every age's 150-gold turret; Field pads failed in 4.4 |
| Build | 5 s scaffold at 50% HP (Engineers 3 s); a destroyed scaffold pays the full bounty | Fort rule |
| HP | **0.5 × the age's Heavy Common HP** × loadout multiplier (L1: 280, 315, 378, 509, 593, 689, 930, 1,254 Stone to Cosmic; the towers' values) | Three Infantry or one Heavy break it in about 5 s |
| Size, blocking | Medium (like a tower); blocks like the other forts, with the contact cap of 5 | No targeting exception; it holds a blob about half as long as a wall |
| Payout | **25 gold every 10 s** from completion (2.5 g/s), **10 payouts** (250) | A calm 10 s beat, like a camp's levy |
| Payback | **60 s of work** (6th payout), 65 s after placement | Survive one lull plus a little: the median quiet stretch is 42 s, p75 102 s |
| If it stands to the end | **+100 net (+67%)** in 105 s | CR's collector: +33%, but no bounty to the opponent |
| Then | It closes (quiet, no bounty, pop freed); the next one may go up at once (the 25 s recharge is long done) | A renewable investment, never a permanent engine |
| Cap per side | **One fort or trap up at a time** (the existing `maxAlive` 1) | Simple and already taught ("Max 1 up at once") |
| Overdrive | Never doubled | A18.5.4 |
| Siege | No placing; stops paying; crumbles (−2% per second from the Siege start, ×2 damage taken) | Fort rule: no end-game turtling |
| Decay | None before Siege; its purse is its clock | |
| Destroyed | Stops; **the killer gets 75 gold** (50% of cost; Bounty Hunters applies) and **no XP**; the owner gets no loss XP | Worth punishing; the winner is not paid twice in XP (A18.2 rule 6) |
| Evolve | Keeps paying (gold is flat) with its own age's HP; the next age's Fort card waits for the cap | |
| Research | None applies (A16.14.5) except Engineers' scaffold; Heavy Breaker (Option C) deals +25% to it | |
| Powers | Never hit it | Fort rule |
| Visibility | Scaffold, purse and payouts public; the enemy's Fort card joins Scouted at the first placement | A7.1 |

### 5.3 Fair at Short, Standard and Long

If a side places a Mint at 0:20 and another the moment each one closes, and nobody touches them:

| Length | Siege | Last placement that pays back before Siege | Mints | Net gold | Gold per side | Net share | The Granary (Option C, 125 at ~0:35, to a 7:30 / 10:30 / 15:00 end) by comparison |
|---|---|---|---|---|---|---|---|
| Short | 6:30 | 5:25 | 3 | +300 | ~6,800 (measured) | 4.4% | +497 (7.3%) |
| Standard | 10:00 | 8:55 | 5 | +500 | ~9,800 | 5.1% | +767 (7.8%) |
| Long | 14:30 | 13:25 | 8 | +800 | ~14,000 | 5.7% | +1,172 (8.4%) |

Why this is fair:
- **The same share at every length.** An untouched Mint chain is worth about 5% of a side's gold, a contested one about half that. Its gold is flat across ages and lengths, so a longer war only means more chances to renew it, never compounding.
- **Research keeps the long game.** The Granary's value grows with match length; the Mint's does not, so neither dominates the other.
- **A Short War punishes greed.** A 0:20 Mint must survive until 1:25, a fifth of the match, against the first waves; the collector-rush proxy measures it.
- **Overdrive halves its weight** in every format equally (passive income doubles, the Mint does not), and Siege ends it in every format, so the last minutes are decided by armies.
- **The AI and the HUD know the cut-off:** bots do not place a Mint that cannot pay back before Siege, and the tip says "Stops in Siege".
- One-age War Path windows (Siege at 4:30) allow two Mints; the per-card rows against the wall run there.

### 5.4 How it fits Option C's Economy line: no overlap, no snowball

| Lever | Pays best when | Risk | Lasts | The opponent's answer |
|---|---|---|---|---|
| Passive income | always | none | the match | none |
| Granary, Market, Guildhall | quiet and long wars | 10-18 s of research, then none | the match | push while you research |
| Forage, Bounty Hunters | busy wars, defending | none | the match | do not feed kills |
| Levy (Option C) | cheap Common armies | −1 g/s income | the match | counter the Commons |
| **The Mint** | you can hold your pads for a minute, mid-game | 150 gold, 75 to them, your fort for 105 s | 100 s, renewable | break it, punish the scaffold, outrange your cover |

Rules that keep them apart:
1. **No multiplication:** research never touches the Mint, and the Mint never touches research or passive income. Everything adds; nothing multiplies.
2. **No Overdrive doubling** for research income or the Mint, and **no Mint income in Siege.**
3. **Different shapes:** research grows with length, the Mint stays flat (5.3).
4. **Anti-snowball:** gold-only bounty, one fort at a time, a 100 s purse, bots that do not build while behind, and (if the gates need it) the levers in 5.6.
5. **The stack is measured, not assumed:** `mint_rush` takes Granary, Market and Guildhall first and keeps a Mint up, and must not beat tier VII more than 45% of the time, while the rush proxy must still beat it.

Item 12's numbers stay as DESIGN-12 wrote them. Option C's upgrade-share target (20-30% Standard, 15-25% Short) does not count Mints, which are forts; their gold is reported on its own row.

### 5.5 Exploit proxies and the P0 go/no-go (written down before the run)

New proxies and rows (`tools/proxies.ts`, `tools/forts.ts`; tier VII at L7, baseline plans, paired seeds; Short and Standard every run, Full at gates):

| Row | What it plays | Gate |
|---|---|---|
| `forced.mint` mirror | Both sides re-place a Mint whenever the rules allow, on the most rearward safe Home pad, vs the no-fort mirror | Bell Δ ≤ +2 points (95% upper bound ≤ +5); mean length ≤ +30 s |
| `mirror.mint` (fort AI) | Both sides carry Mints and use the planner | Same Bell and length rows; the winner's evolve lead at the 3rd evolve: median ≤ 30 s and ≤ +5 s over the no-fort mirror; Mint gold 2-8% of gold; Mints per side per Standard War 1-4 (median); comeback share reported |
| `mint_turtle` (turtle with collectors) | `turret_turtle` (4 turrets, Hold at 320) plus Granary and Market, re-placing a Mint on pad 160 whenever the rules allow | Bell ≤ the same proxy without forts + 2 (paired, upper bound + 5); wins ≤ 45% |
| `mint_rush` (collector rush) | The Balanced script with a Mint at 0:20 and again whenever the rules allow while no enemy ground unit is within 600 lu of its gate, saving for it first; Granary, Market and Guildhall first | Wins ≤ 45% vs tier VII |
| Rules sanity (scripts only) | `rush` vs `mint_rush`; `mint_rush` vs `turret_turtle` | Rush wins ≥ 50% (greed is punishable); the turtle row reported |
| `spam.mint` | The tier VII brain with the Mint forced on every recharge on any legal pad, vs tier VII without | ≤ 55% (the `fort_spam` row) |
| `card.mint` | Each age's Mint vs its wall in the one-age window, forced placement | Within ±3 (1,000 paired per card); ±6 at smoke |
| `value.mint` | Tier VII with a Mint card vs without | 50-62% at gate |
| With item 12 (merged gate) | `turret_rank_turtle` plus Mints | As `mint_turtle` |
| Static | Purse = payouts × gold; no payout in Siege; no research reads a Mint; payback ≤ 70 s; gold flat across ages | Pass |
| B3 | A headless Full War | ≤ 850 ms |

*Comeback share* (a new report row): of the decided matches, the share won by the side whose base HP % was lower when Overdrive began. It is reported at P0 (too noisy at smoke size) and gated at P4: not more than 3 points below the no-fort mirror, n = 1,000.

**Go only if all of these hold at smoke size** (100 per row, paired):
1. `forced.mint` and `mirror.mint`: Bell Δ ≤ +2 (upper bound ≤ +5) and mean length ≤ +30 s, in Short and Standard.
2. `mirror.mint`: the winner's evolve lead at the 3rd evolve ≤ 30 s and ≤ +5 s over the no-fort mirror.
3. `mint_turtle` (and with item 12 `turret_rank_turtle` plus Mints): Bell ≤ their fort-free proxy + 2 (upper bound + 5); wins ≤ 45%.
4. `mint_rush` ≤ 45% vs tier VII, and `rush` beats `mint_rush` at least 50% of the time.
5. `spam.mint` ≤ 55%.
6. `card.mint` within ±6 in every age, and `value.mint` ≥ 47%.
7. Mint gold 2-8% of gold and 1-4 Mints per side per Standard War in `mirror.mint`.
8. B3 within 850 ms.

### 5.6 Levers, in order, re-run after each

- **Snowball or Bell rows fail:** payout 25 → 20 (purse 200); then a salvage payout (a falling Mint pays its owner its next 25, the Clash Royale 2022 rule); then an underdog yield (+40% while the side is behind by the A18.5.1 test, disclosed like the research discount).
- **Turtle rows fail:** HP 0.5 → 0.4 H; then no Mint on pad 160 (pads 230 and 300 only); then cost +25.
- **Too strong** (card rows above +6, value above 62%): 10 → 8 payouts; then cost 150 → 175.
- **Too weak** (card rows below −6, value below 47%): payout 25 → 30; then the first payout 5 s after completion; then pop 3 → 0.
- **Greed beats the rush:** cost +25 and the first payout 5 s later.
- **The cap lock annoys at the owner check:** the Mint stops counting toward the one-fort cap (then re-run the turtle rows).

Still failing: the lead reports to the owner with a proposal before P1.

---

## 6. What changes where, and the plan

### 6.1 Changes by work package (Option A)

| WP | Files | Change |
|---|---|---|
| WP0 (lead) | `src/contracts/{content,sim,events,observation,hud}.ts`, `src/content/raw/{fortKit,economy,stone,bronze,medieval,gunpowder,industrial,modern,future,cosmic}.ts`, `tests/fixtures/content`, `docs/DESIGN.md`, `docs/decisions.md` | `FortKind` + `'mint'`; `FortDef.mint { goldPerPayout, everyMs, firstMs, payouts }`; `FortState` + `mintNextTick`, `mintLeft`; `EconomyRules.fort` + `mintHpBp` 5,000 and `mintBountyXpBp` 0; `goldEarned.reason` + `'mint'` (with `x`); event `fortEmptied { id }`; forts in `Observation` carry `mintLeft`; `HudModel.fort` Mint fields and the Mint in `goldPerSec`; `MatchStats` Mints placed, gold paid, lost; the raw tables; a frozen fixture copy of one Mint; DESIGN A16.14 (a fifth kind), A2.3 (a gold source), A7 (AI), A18.12 (rows). One bump, shared with item 12's P1a bump |
| WP1 | `src/content/{schema,compile}.ts`, `src/core/forts.ts`, `src/i18n/content.en.json` | The `mint()` builder; HP from 0.5 H; schema: one Mint per age, Home pads only, the purse static check; `released: false` on each Mint until its art ships; strings (`card.<slug>.*`, `fort.kind.mint`, `fort.trait.{pays,purse,siegeStops}`) |
| WP2 | `src/sim/systems/{forts,deaths,economy}.ts`, `src/sim/{hashState,observe,stats,replay}.ts` | The payout in the spawn step (B3 step 5, after camps), no decay before Siege, the Siege stop and switch, the emptied removal with no bounty, the gold-only bounty, Mint fields hashed only for Mints, golden `19-mints.json`, unit tests |
| WP3 | `src/ai/{forts,brain,tiers,personalities,estimate,view,mistakes}.ts` | The Mint planner and saving goal, D at 1 × cost, the greed read (V+), the gold estimate, the tier list (III+), Ledger's preference, the mistake; tests (never illegal, never into a wave at VII, pays back before Siege) |
| WP4 | `art/blender/styles/realistic/forts/`, `src/visuals/fortViews/`, `src/visuals/manifest*.ts` | Eight Mint rigs (crew, purse stages, payout, close, collapse), code motion, `fx.mint_coin`, `fx.mint_close`, `icon.fort.mint` |
| WP5 | `src/ui/hud/{FortButton,FortLane,Tray}.tsx`, `src/render/{eventMapper,hudModel,fortFeel}.ts`, `src/render/feel.config.json`, `src/i18n/hud.en.json` | Purse bar, payout coin and number, the counter's rate, the tip and first-seen caption, the enemy sparkle, the ghost's label; Playwright at 844 × 390, 844 × 340, 800 × 360 and 1280 × 720; `docs/ui-plan.md` 4.7 and the motion catalogue through a request |
| WP6 | `src/audio/**` | `mint_payout`, `mint_close`, `mint_collapse` (ZzFX first, in the `match` group like the fort sounds) |
| WP7, WP8 | `src/content/raw/warPath.ts` (through WP1), `src/meta/**`, `src/save/**` | Sources: the Stone Mint joins the fort unlock set; each later region grants its Mint at its L2 first clear (L2 pays only Amber today; L3 grants a Rare, L4/L6/L8 forts, the boss an Epic), with the region's Road fort set as the fallback; idempotent grants for existing saves (no schema change: new ids in `fortsOwned`); the bot source filter; fixtures |
| WP9 | `src/ui/screens/**` | The Army Fort slot takes the Mint; card detail ("Pays 25 every 10 s, 10 times · pays back in 1:00") with the Home pads lit |
| WP11 | `src/app/**`, `src/tutorial/**` | Bronze L5 teaches the Mint ("Build a Mint and keep it standing", A18.7.5 has room there); a one-time hint for trophy unlockers; the narrator line through i18n |
| WP12 | `tools/**`, `tests/**` | `FORT_KINDS` + `mint` (placebo, mirror, forced, value, spam, turtle and card rows), the rearward pad for forced Mints, `mint_rush`, `mint_turtle`, the rules-sanity rows, the Mint gold, comeback-share and evolve-lead rows, the static checks, an e2e that drags a Mint and sees its coins |

### 6.2 SIM_VERSION, goldens, saves and replays

- **One contract bump with item 12** (P1a). If the Mint fields are hashed only for Mint forts (the X0 M3 pattern in `hashState.ts`), goldens 01-17 keep their hashes; the version follows the A2.9.11 / F3 policy (10.1.0 if no golden changes, 11.0.0 if item 12's changes force a major), and the lead re-records deliberately.
- **New golden `19-mints.json`** on the fixture: a placement, a destroyed scaffold (75 gold, no XP), payouts on the 10 s grid, an emptied removal with no bounty, an evolve with a standing Mint, the Siege stop and crumble, and the one-fort cap refusing a second fort.
- **Saves:** no schema change; the grant step is idempotent with fixtures (A16.14.6 style). **Replays:** older replays keep their result card and are labelled "Recorded on an older build" (D8); single-player resume logs from before the bump do not resume.
- **Release gate:** every Mint carries `released: false` until its art and the HUD ship, so `main` stays playable and nothing changes for players before P2/P3.

### 6.3 Phased plan, merged with item 12

| Phase | Item 12 (DESIGN-12) | Item 42 adds | Merged | Ends with |
|---|---|---|---|---|
| **P0** one prototype gate (throwaway branch, nothing shipped; runs when the machine is free) | 3 | 1.5 (WP2 0.5 payout, WP3 0.5 planner, WP12 0.5 rows and proxies) | **4.5** | Both go/no-go lists, told to the owner in plain words |
| **P1a** rules, one WP0 bump | 9 | 4 (WP0 0.5, WP1 0.5, WP2 1, WP3 1, WP12 1) | **13** | Smoke gates green, golden 19 |
| **P1b** behaviour picks | 4 | 0 | **4** | Their rows |
| **P2** HUD, Army, teaching, sources | 4.5 | 2.5 (WP5 1, WP9 0.5, WP11 0.5, WP7/WP8 0.5) | **7** | Screenshots reviewed at four viewports |
| **P3** art and sound | 5 | 2.5 (WP4 2, WP6 0.5) | **7.5** | Playwright and frame time in budget |
| **Owner check** | | | | Short and Standard Wars on Normal and Hard, with a Mint in the plan |
| **P4** tuning at gate sizes | 3 | 1 | **4** | Every row green or reported to the owner |
| **Total** | 25-31 | **11.5 (about 11-13)** | **about 36-44** (2-2.5 weeks with 3-4 agents in parallel) | |

One gate is cheaper: one branch, one batch window on a free machine, one owner briefing, and the cross rows (Mints with Economy III, turret paths with Mints) need both items anyway. Built on its own after item 12, item 42 costs about 1.5-2 agent-days more (its own gate and a second contract bump).

### 6.4 What to cut, in this order

1. The salvage and underdog levers (only if the gates need them).
2. Mint styles for Generals other than Ledger.
3. The enemy's payout sparkle.
4. The Bronze L5 teaching level (keep the hint and the first-seen caption).
5. The purse bar (the art's coin heap carries the purse).
6. Ship the art in two waves (Stone to Gunpowder first, Industrial to Cosmic later); a Mint without art stays `released: false`, so no age ever shows a placeholder.

Never cut: the P0 gate, the AI's use of the Mint, the coins with their sound, the Siege stop, the gold-only bounty.

**Rejected:** tap-to-collect (3.2 rule 7); Field pads or a forward bonus (4.4); a permanent building (rule 3, the Feitoria and idle-farm lessons, overlap with research); interest on banked gold (A18.5.4); worker units walking between a mine and the base (new unit behaviour and pathing, a later idea); powers that hit Mints (Ageborn's reach rules make it rare, and the power gates are fragile); a non-blocking Mint (needs a targeting exception; kept as a lever if decoy value shows); a separate Mint slot or button (A16.1); Mints in capsules (A16.14.6).

---

## 7. Questions for the owner

1. **Where should the building stand?** On the lane in front of your base, on the same spots as walls, where enemies can attack it; or on a turret spot on the base, where it cannot be destroyed but stops paying while enemies are at your gate. **Recommended: on the lane.** That is what makes it a choice with a risk, like the Elixir Collector and the Sunflower: you protect it, and the enemy gets 75 gold for breaking it.
2. **Should gold arrive by itself, or by tapping coins as with the Sunflower?** **Recommended: by itself.** A coin still pops up with a sound and flies to your gold, so it feels the same. Tapping would pull your eyes and thumb away from the battle on a phone, would not work in a live match that runs while the app is in the background, and the computer would collect perfectly.
3. **Should it be temporary or stay all match?** **Recommended: temporary.** It pays 25 gold every 10 seconds ten times (250 gold for 150), then closes, and you can build a new one. A building that paid all match would make the side that is already winning richer and richer and would be in every deck.

---

## 8. Kort på dansk

Du ønskede en bygning, der tjener guld under kampen, ligesom Elixir Collector i Clash Royale eller solsikken i Plants vs. Zombies.

Mit forslag er Møntværket (på engelsk Mint, et arbejdsnavn). Det er en ny slags fort. I din krigsplan vælger du det for en tidsalder i stedet for en mur, et tårn, en lejr eller en fælde. I kampen trækker du det ud på en af de tre pladser foran din base, ligesom en mur.

Det koster 150 guld og er færdigt efter 5 sekunder. Derefter giver det 25 guld hvert 10. sekund, ti gange i alt. Det har betalt sig hjem efter et minut og giver 100 guld ekstra, hvis det står hele tiden. Så lukker det, og du kan bygge et nyt med det samme.

Fjenden kan se det og slå det i stykker. Tunge enheder og artilleri gør dobbelt skade på det. Hvis fjenden ødelægger det, får fjenden 75 guld. Det holder op med at betale, når Siege begynder, og det tjener ikke dobbelt i Overdrive. Du kan kun have ét fort ad gangen.

Guldet kommer af sig selv. En mønt springer op over bygningen med en lyd og flyver hen til dit guld, og tallet for din indtægt stiger, så længe den står. Der kommer ingen nye knapper. Hver tidsalder får sin egen bygning, lavet i Blender ligesom fortene. Computeren bruger den efter de samme regler og angriber din, når den ser den.

Det passer sammen med opgraderingerne i War Council. Forskningen giver sikker indtægt hele kampen, mens Møntværket giver hurtigere guld, som kan gå tabt. Forskningen gør aldrig Møntværket stærkere, så de to ikke vokser sammen til en sneboldeffekt.

En lille rettelse: Elixir Collector er ikke fjernet fra Clash Royale. Den blev gjort svagere igen den 6. oktober 2026, fordi den skulle tage længere tid om at betale sig hjem. Den erfaring har jeg brugt.

Vi bygger først en prøve sammen med prøven for opgraderingsstierne (punkt 12) og måler den med vores testværktøjer, før noget kommer med i spillet.

Tre spørgsmål til dig:

1. Skal bygningen stå på banen foran basen, hvor fjenden kan angribe den (min anbefaling), eller på en af basens tårnpladser i stedet for et tårn?
2. Skal guldet komme af sig selv (min anbefaling), eller skal man trykke på mønterne, som med solerne i Plants vs. Zombies?
3. Skal bygningen holde i knap to minutter og så lukke, så man bygger en ny (min anbefaling), eller skal den stå resten af kampen, indtil fjenden ødelægger den?
