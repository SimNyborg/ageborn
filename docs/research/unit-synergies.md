# Unit synergies and formations across games: a catalogue for a one-lane tug-of-war

**Status.** Research note for queue item 52 (owner, 2026-11-03, translated): "Think more about how the troops work together strategically. Brainstorm and research it. For example, several Romans with shields form a tortoise, and several of Napoleon's troops form firing formations where the front rank kneels and fires so the rear can fire over them, and so on." Nothing here is decided; the design is in `docs/design-history/item51-signatures.md` (the second axis next to the signatures). Companion note: `docs/research/unit-abilities.md`.

**Method.** Web searches on 2026-11-03 (sources at the end); "(own knowledge)" marks what rests on my knowledge of a game rather than a fetched page. The testudo itself is researched in depth in `docs/design-history/item45-testudo.md` and not repeated here.

---

## 0. Key findings

1. **Historical formations are a rock-paper-scissors that players already know.** The Napoleonic case is the cleanest: the line gives the most firepower but is weak against cavalry; the square presents no flank to cavalry and holds it off, but packed squares are the best target for artillery (canister "devastating against packed squares"); cavalry rides down lines and gunners. In the square the front rank knelt and presented bayonets while the rear ranks fired over their heads (Wikipedia, Line (formation); Plastic Soldier Review on British two-rank squares). This is exactly the owner's picture, and it maps onto troops we already have in the Gunpowder age.
2. **Every formation trades one thing for another, and its counter is visible.** Testudo: safe from missiles, slow, open to blows and heavy stones (item 45). Shield wall: strong until breached, then it collapses quickly (Wikipedia, Shield wall). Schiltron and pike square: deadly to cavalry, an easy target for archers (Total War community notes). Line: maximum fire, weak flanks. A formation that gives a bonus without a cost and a counter would just be a stat.
3. **Games make formations automatic or ordered.** Total War and Stick War give orders (form square, raise shields, "Defend" to pull archers behind the spearmen); in Stick War Legacy, Speartons in Shield Wall take 70% less damage while blocking and Archidons fire from behind them (Stick War Wiki). We have no unit orders (A16.1), so our formations must form by themselves from a rule the player can predict, like item 45's testudo.
4. **Adjacency is the 1D version of a formation.** Super Auto Pets is a single line of pets in which most synergy is "the friend ahead" or "the friend behind": the Snake fires when the friend ahead attacks, the Ox when the friend ahead faints (superautopets.wiki.gg). Our lane is also a line (each side's ground units sorted by position every tick, A2.7), so "the ally directly ahead" and "N of the same troop linked in the file" are natural, cheap and readable.
5. **Card-game combos are about roles, not bonuses.** Clash Royale's famous pairs have no combo rule at all: a tank absorbs while support kills (Golem and Night Witch), a building-targeter plus a freeze on the defenders (Hog Rider and Freeze), and Lumberjack's death drops Rage that speeds up the Balloon flying right behind it (LumberLoon guides). Ageborn should get most of its cross-class synergy the same way: from signatures that fit together (a shield in front of archers, a slow that keeps targets in an arc's splash, a hook that pulls into a cone).
6. **Trait breakpoints reward building around a tag, and push mono-decks.** Teamfight Tactics activates trait bonuses at unit counts (often 2/4/6), with stronger effects at higher breakpoints; Battle Cats rewards specific cats in the top row of the lineup with small "Cat Combo" bonuses (Sm to XL). DESIGN A16.17 already chose interactions over a deck bonus system ("Synergy comes from keyword interactions designed into content, not from a bonus system"). We keep that: no War Plan-wide trait bonuses; synergies happen on the lane, where both players see them and can break them.
7. **Auras need a stacking rule.** Warcraft III's community knowledge is that the same aura does not stack with itself while different auras do. Our A2.7 rule (auras never stack; the strongest applies) and the A18.2 caps (damage +35%, attack speed +25% and so on) already bound every combination; formations must live inside them, so the useful formations pick axes that an age's aura does not already use.
8. **Formations in a tug-of-war happen at the front and at the Hold flag, not on the march.** Troops spawn one by one 1.5-7 s apart and walk at 80-140 lu/s, so a wave strings out over 150-300 lu while walking and packs together only when its leaders stop: at the contact point, at the Hold flag (A18.4) or when a banked wave is released. That suits formations: they matter exactly where fights happen, and "hold to form up, then charge" becomes a visible tactic.
9. **The counters to synergy are already in the game, and need a second role:** splash and arcs punish tight groups, divers and tunnelers land behind lines, knockback and hooks break a link, slows pull a member out of step, stuns stop a formation from acting, overruns trample formations of small troops, and killing the linchpin (the shield in front of the spears) ends the bonus.

---

## 1. Formations: history and games

| Formation | In history | In games | What it gives | What it costs | What breaks it |
|---|---|---|---|---|---|
| Testudo (tortoise) | Roman legions: shields locked front, sides and top (Wikipedia, Testudo formation); first recorded at Heracleum, 169 BC (item 45) | Total War: missile protection, slow, cannot run (item 45) | Near immunity to arrows and stones | Slow, no attacks, cramped | Heavy stones, artillery, fire, close assault, stuns (item 45) |
| Shield wall | Overlapping shields; "a breached shield wall tended to collapse quickly" (Wikipedia, Shield wall) | Total War, Mount & Blade (own knowledge); Stick War's Shield Wall stance (70% less damage while blocking, Legacy) | Protection for the wall and those behind it | Slower; little offence from the wall itself | Arcs, a breach, flanking |
| Phalanx and pike block | Greek phalanx: spears over interlocked shields; pike squares | Total War phalanx and pike formations (own knowledge) | A front that kills what walks into it | Slow, weak flanks | Missiles, flanks, broken ground |
| Schiltron / hedgehog | Scottish spear rings against cavalry; "a wall of spears with archers firing from inside... especially deadly against cavalry" (Total War community guide) | Total War schiltron (own knowledge) | Anti-cavalry | Static, an easy missile target | Archers and artillery |
| Wedge | Cavalry or infantry wedge to break a line (own knowledge) | Total War wedge for cavalry (own knowledge; a forum notes Medieval II has none for infantry) | A stronger impact on one point | Fewer weapons in contact | Braced spears, a square |
| Infantry square | Hollow square, front rank kneeling with bayonets, rear ranks firing over them; "presented no flank or rear", held cavalry at Waterloo; vulnerable to musketry and canister (Wikipedia, Napoleonic tactics, Infantry square) | Empire: Total War square: "extends a regiment's range but greatly reduces firepower" (Empire Total War wiki) | Holds cavalry off | Less firepower, slow, a dense target | Artillery, infantry fire |
| Line and rank fire | Two or three ranks firing in turn; the line gave the most firepower (Wikipedia, Line (formation)) | Empire: Total War fire by rank (own knowledge; the wiki notes rank fire is usually better than square fire) | Maximum fire | Weak against cavalry | Cavalry, artillery |
| Skirmish order | Light troops spread out, fire and fall back (own knowledge: voltigeurs, rifle companies) | Total War skirmish mode: missile units back away from melee (own knowledge) | Survives melee pressure | Little punch | Fast cavalry, other skirmishers |
| Spear and shield pair | Hoplite and phalangite; men-at-arms with pikes behind | Stick War: Speartons with Archidons behind (Stick War Wiki) | Two roles in one place | A link that can be cut | Divers, pushes, arcs |

---

## 2. Combos in card and lane games

| Game | Combo | Why it works | What it teaches us |
|---|---|---|---|
| Clash Royale | Tank in front, support behind (Golem and Night Witch) | The tank soaks; the support kills what attacks the tank and covers air | Our Cover and Hardened troops in front of shooters and healers; no rule needed |
| Clash Royale | Building-targeter plus a freeze (Hog Rider and Freeze) | The defenders stop while the runner reaches its target | Siege or Raider plus a daze or a slow on the defenders |
| Clash Royale | Lumberjack plus Balloon ("LumberLoon"): the Lumberjack's death drops Rage; the Balloon "should be played right behind" it to get the Rage | A death effect feeds the unit behind | "The friend behind" synergies exist in card games too; ours would be War Cry speed into a charger's run-up |
| Battle Cats | Cat Combos: specific cats in the top row give small bonuses (Sm to XL), for example a Worker Cat bonus from Killer Cat and Basic Cat | Collection breadth pays without raw stat inflation | Deck-level bonuses: rejected for us (A16.17), but "small, visible, specific pairs" is a good size |
| Kingdom Rush | Barracks soldiers block enemies inside tower range; armoured enemies are answered by mages, fliers ignore barracks | Blockers and damage dealers complement each other | Our melee front plus ranks is the same pair; a formation makes the pairing visible |
| Plants vs. Zombies | A wall plant in front of shooters; lobbers behind a wall hit shielded zombies | Roles by lane position | Shot geometry decides who a shield protects |
| Super Auto Pets | Snake behind a strong front pet; Elephant behind a Peacock (feeds its attack); Ox behind a pet that faints | Adjacency triggers in a line | Our "ally directly ahead" checks |
| Teamfight Tactics | Traits at 2/4/6 units (more at higher breakpoints) | Build around tags | Rejected as a deck rule; keep thresholds small (2-3) on the lane |
| Warcraft III | Auras on a hero lift an army; different auras stack, the same one does not | Area team buffs | Our auras and War Cry, inside the A18.2 caps |

---

## 3. What our lane allows (from the code)

- **The file.** Each tick the movement system sorts each side's ground units by progress p (descending, ties by id) and walks the file once (`src/sim/systems/movement.ts`): the three frontmost form the front rank; behind it a unit keeps at least (wA + wB) x 0.3 behind the ally ahead; ranked units keep 25% (Long range 40%) of their range behind the melee front (A2.7 Ranks, SIM 8.0.0). So the sim already knows, every tick, each unit's neighbours ahead and behind and their distances, at O(n) per side.
- **Spawning.** One shared queue of 5; train times 1.5-7 s; spawn at p = 20. Two Fusiliers trained back to back spawn 2 s apart and walk about 160 lu apart until the first one stops.
- **Gathering points.** The contact point (the front stops; the ranks fill in behind it), the Hold flag (A18.4: units hold at the flag, ranked units their gap behind it) and the gate in Fall back. A banked wave released together arrives together.
- **The view.** Depth rows are view-only (`src/render/battleView.ts` staging): the front rank gets three rows, others rank mod 3, and the staging keeps rows sticky. A formation can ask the staging to keep linked members in neighbouring rows and play their pose; the sim never sees rows.
- **Precedents for per-tick derived state.** The Dread aura and the ranks are recomputed every tick from positions, so they add no hashed state and moved no golden beyond the version string.

---

## 4. Brainstorm: formations and combos for Ageborn

Rules shared by every formation (starting values for the prototype):

- **Link.** Two units are linked when they are neighbours in their side's ground file and their centres are at most 48 lu apart. A formation is a run of linked members that satisfy its rule; a unit belongs to at most one formation (priority: Testudo, Square, Shield Wall, Phalanx, Firing Line, Wedge, Pack).
- **Members** must be alive, not stunned, not leaping and not burrowed. A knockback, pull or slow that opens a gap over 48 lu breaks the link at once.
- **When.** Recomputed every tick after movement from positions only (like the Dread aura); bonuses apply from the next tick, inside the A18.2 caps; the size never scales the bonus beyond the minimum (no mega-balls).
- **Seen.** A pose, a small formation glyph over the front member, a faint team-coloured ground band under the members, and a lock sound; Lite keeps the glyph only.

| Formation | Who | Rule | Bonus | Pose and tell | Counter |
|---|---|---|---|---|---|
| **Shield Wall** | Cover troops (one per age: Hide Shield, Shield Bearer, Footman, Iron Mantlet, Sandbag Carrier, Barrier Trooper, Crystal Guard) | 2+ linked | Their cover reaches 100 lu behind (60 alone) and stops 40% (30% alone) of straight shots | `shield_lock`; shields overlap, glancing sparks | Arcs and lobs, blasts, powers, shield breakers, melee, a hook that pulls one out |
| **Phalanx** | A Reach troop directly behind a Cover or Shove troop (Spear Hunter behind Hide Shield; Phalangite behind Shield Bearer or Hoplite; Pikeman behind Footman; Steam Driller behind Iron Mantlet; Walker Mech behind Barrier Trooper; Graviton Halberdier behind Crystal Guard) | linked pair | The Reach troop deals +25% | `spear_set` / `pike_set` over the shield | Arcs, divers landing behind, shoves and hooks that break the pair, killing the shield |
| **Firing Line** | Line infantry: Fusilier (Gunpowder), Carbineer (Industrial) | 2+ of the same card linked and shooting | +20% damage (rolling volleys); the kneeling front member takes 20% less from straight shots | `kneel_fire` for the front member, standing fire behind | Artillery and lobs (a dense target), chargers in the open, divers |
| **Square** | Fusiliers (Gunpowder) | a Firing Line (or 2+ linked Fusiliers) with an enemy charging or leaping troop within 160 lu | Brace (no knockback, no charge or first-hit bonus against them) and +50% damage against charging or leaping troops; but half fire rate against everything else and half speed; ends 2 s after the threat is gone | `square` (bayonets levelled) | Artillery, lobs and splash (the classic answer), shooters (out-firing a square) |
| **Wedge** | Momentum troops (the charging heavies) | 2+ linked, both charging | The charge also hits the enemy behind the target, and knocks back 20 lu further | Shared dust and streamers (no pose) | Braced troops, the Square, slows that stop one of them |
| **Pack** | Beasts: Hunting Wolves, Cave Pups, Sabertooth, War Hounds, Swarmlings | 3+ linked | +15% move and attack speed | A howl ring | Splash, ricochet, cleave, dazes, an overrun |
| **Testudo** | The Legion (item 45, a new Bronze Epic squad of four) | by itself under shots its shields stop | 70% less from those shots, half pace, no attacks (item 45) | the shell | Blasts, fire, artillery, melee, stuns (item 45) |

Combos without a rule (they come from signatures; each roster row names them in its "works with" column):

| Combo | How it works | Counter |
|---|---|---|
| Shield in front of shooters | Cover protects allies up to 60 lu behind it | Arcs, Shatter |
| Healer behind armour | Heal plus Hardened makes a tank that small hits cannot wear down | Burn (halves healing), big hits, divers on the healer |
| War Cry into a charge | A speed burst lets chargers build their run-up sooner | Slows, braced troops |
| Slow plus arcs | Arcs splash where the target stood when they fired; a slowed target cannot walk out | Ranged fire on the slower, air |
| Hook plus splash or cone | A pulled shooter lands in your cone or your lobber's splash | Braced and large troops resist pulls |
| Daze or slow plus siege | The defenders stand still while the ram or tunneler works | Kill the siege troop before it arrives |
| Mark plus artillery (**Spotting**, one rule) | Long range and siege range troops may shell a marked enemy up to 100 lu beyond their range | Kill the marker; the mark fades |
| Decoys plus an aimed shot | Decoys soak fire while the shot is aimed | Splash on the decoys |
| Drummer tempo plus a firing line | Attack speed (aura) and damage (line) sit under different caps | Kill the drummer |
| Riders plus escort | The riders shoot what attacks the carrier | Anti-heavy on the carrier |

Rejected for our lane:

| Idea | Why not |
|---|---|
| War Plan trait bonuses (TFT, Battle Cats style) | A16.17 chose interactions over a bonus system; they push mono-decks and happen off the lane |
| Formations by order (form square, lock shields) | We have no unit orders (A16.1); automatic rules are readable and the AI can use them |
| Bonuses that grow with formation size | Mega-balls and stalemates (the depth audit's `flag_ball` lesson) |
| Battery (artillery side by side) | No visible benefit that is not "more damage"; Spotting does the job with a tell |
| Formations of mixed ages | Confusing at an evolve seam; members must be in the same age's tray anyway |

---

## Sources

Fetched through web search on 2026-11-03:

- Testudo formation (Wikipedia): https://en.wikipedia.org/wiki/Testudo_formation
- Shield wall (Wikipedia): https://www.Wikipedia.org/wiki/Shieldwall
- Line (formation) (Wikipedia): https://en.wikipedia.org/wiki/Line_(formation)
- Napoleonic tactics (Wikipedia): https://en.wikipedia.org/wiki/Napoleonic_tactics
- Infantry square (Wikipedia mirror): https://ipfs.ssi.eecc.de/ipns/en.wikipedia-on-ipfs.org/wiki/Infantry_square
- Plastic Soldier Review (British two-rank squares, kneeling front rank): https://plasticsoldierreview.com/Review.aspx?id=3006
- Empire: Total War square formation (fan wiki): https://empiretotalwar.fandom.com/wiki/Square_Formation ; Let's Play Archive Q&A on squares and rank fire: https://lparchive.org/Empire-Total-War/QA%2010
- Schiltron in Rome: Total War (community guide): https://forums.totalwar.org/vb/archive/index.php/t-63532.html
- Total War: Three Kingdoms formations (guide): https://www.gamepressure.com/total-war-three-kingdoms/unit-formations/z9c4aa
- Stick War Shield Wall and Spearton strategies (fan wiki): https://stick-war.fandom.com/wiki/Shield_Wall ; https://stick-war.fandom.com/wiki/Spearton/Strategies
- Super Auto Pets adjacency (fan wiki): https://superautopets.wiki.gg/wiki/Snake ; https://superautopets.wiki.gg/wiki/Ox ; https://superautopets.wiki.gg/wiki/Panda ; https://superautopets.wiki.gg/wiki/List_of_Strategies
- Teamfight Tactics traits and breakpoints: https://www.gamepressure.com/teamfight-tactics/synergies/zcc5ac ; https://dotesports.com/tft/news/tft-cheat-sheet-all-traits-stats-and-synergies
- Clash Royale combos (fan wiki and guides): https://clashroyale.fandom.com/wiki/Deck:3.9_LumberLoon_Freeze ; https://clashroyale.fandom.com/wiki/Deck:Golem_Hog_Deck ; https://sportskeeda.com/esports/best-anti-lumberloon-decks-clash-royale
- Battle Cats Cat Combos (community guide): https://thanksfeanor.pythonanywhere.com/guides/documents/catcombos.html
- Kingdom Rush barracks and towers (fan wiki): https://kingdomrushtd.fandom.com/wiki/Encyclopedia
- Warcraft III aura stacking (community knowledge): https://www.hiveworkshop.com/threads/about-stacking-and-not-stacking.265614

Internal: `docs/design-history/item45-testudo.md` (testudo research and design), `src/sim/systems/movement.ts` (the file, ranks), `src/render/battleView.ts` (depth-row staging), DESIGN A2.7, A16.17, A18.2, A18.4.
