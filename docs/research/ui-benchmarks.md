# UI and UX benchmarks: how the best strategy and collection games stay clear, and what Ageborn should adopt

Written 2026-09-28 for the owner's request: "make a clear, thorough plan for the interface; right now it is rather confusing and not very intuitive; research the principles of good UI; make animations more satisfying across the whole game."

This report benchmarks Clash Royale, Brawl Stars, Clash of Clans, Marvel Snap, Hearthstone, Kingdom Rush, Rush Royale, Legends of Runeterra and Pokemon TCG Pocket, plus Battle Cats (the closest landscape lane game) and Candy Crush (the reference level map). It turns what they do into a ranked list of patterns for Ageborn (section 7). It adds to `docs/research/feel-ux.md`, which covers in-battle juice (hitstop, shake, particles, sound) and the first-time user experience. This report covers the **meta UI, navigation, card and reward flows, the landscape HUD layout, and UI motion**.

## How to read this

- **[S]** means a source says it (linked in the text and listed at the end).
- **[O]** means it was observed in the shipped game, known from playing it, or taken from widely shared screenshots and videos. Verify [O] measurements against the screenshots in the Game UI Database ([Clash Royale](https://www.gameuidatabase.com/gameData.php?id=1299), [Brawl Stars](https://www.gameuidatabase.com/gameData.php?id=465), [Clash of Clans](https://www.gameuidatabase.com/gameData.php?id=1298), [Marvel Snap](https://www.gameuidatabase.com/gameData.php?id=1785)) before copying a number.
- **Limit:** this session's network policy blocked page fetches (WebFetch) to most sites. Findings come from search-engine summaries of the linked pages plus [O] knowledge. The GDC talks cited (Hearthstone UI, Marvel Snap design) are video and were not transcribed here.
- Ageborn's own rules still apply on top of every pattern: no real money (so no Shop tab), bots always labelled AI (A7.1), honest capsule copy (A15.3), the screen and counter budget (A15.13), i18n for all text, and art through the `ArtProvider`.

---

## 1. Summary: the ten things the best games all do

1. **One screen, one obvious next action.** Clash Royale's Home is "a simple, actionable hub": one big Battle button, the reward slots, and a bottom bar for everything else [S] ([GameGrin](https://www.gamegrin.com/articles/what-can-online-apps-learn-from-clash-royales-user-interface/)). Brawl Stars' Play button is "big and bold in bright yellow" [S] ([Pratt IXD](https://ixd.prattsi.org/2025/02/design-critique-brawl-stars/)). In landscape (Brawl Stars, Clash of Clans) that button lives in a bottom corner under the thumb [O].
2. **Shallow navigation.** Clash Royale's UI "almost never goes more than one level" deep, and where it does, it is hidden to look like one level [S] ([Gornicki, UX in Clash Royale](https://www.gornicki.me/blog/90l/ux-in-clash-royale-part-1)). Every main section is one tap from Home, with "no confusing submenus" [S] (GameGrin).
3. **Colour means the same thing everywhere.** Clash Royale uses yellow for the most important "go" buttons (Battle, Request, Use, Invite) and green for secondary progress actions (Donate, Buy, Upgrade) [S] (Gornicki).
4. **The content is the hero.** In Marvel Snap "the cards should always take precedence in the visual hierarchy, and the UI should always serve the purpose of highlighting the cards" [S] ([Tiffany Smart, Marvel Snap](https://www.tiffanysmart.com/work/marvel-snap)).
5. **Everything the thumb needs sits low.** Marvel Snap moved "many interactable elements closer to the bottom half of the screen" [S] ([Marvel Snap UX case study](https://medium.com/design-bootcamp/marvels-snap-ui-ux-case-study-9f727d8f3875)). Clash Royale keeps all key elements in one-handed reach [S] (Gornicki).
6. **Feedback in under 0.1 s.** Under 0.1 s a response feels caused by the user; 1 s is the limit for unbroken flow; 10 s is the limit of attention [S] ([NN/g, response time limits](https://www.nngroup.com/articles/response-times-3-important-limits/)).
7. **Rewards are shown flying to where they are stored.** Currency "flows from the claim button to the wallet's UI location", which draws the cause-and-effect line between action and reward [S] ([Game Economist Consulting](https://www.gameeconomistconsulting.com/the-best-currency-animations-of-all-time/)).
8. **Reveal is theatre, but the result is fixed and the player can skip.** Brawl Stars' Starr Drops and Clash Royale's Lucky Drops let each tap "upgrade" the rarity, and the outcome is rolled before the animation starts [S] ([Starr Drops](https://brawlstars.fandom.com/wiki/Starr_Drops), [Lucky Drops](https://supercell.com/en/games/clashroyale/blog/release-notes/game-update-lucky-drops/)). Ageborn's A10 capsule already works this way.
9. **Features appear when they become useful.** Progressive disclosure: start with the essentials and unlock destinations by battles played or cards owned [S] ([UXPin](https://www.uxpin.com/studio/blog/what-is-progressive-disclosure/), [UX Planet](https://uxplanet.org/design-patterns-progressive-disclosure-for-mobile-apps-f41001a293ba)). Clash Royale's Training Camp teaches through three matches with "almost no text bubbles" [S] ([Matt Le](https://medium.com/@Matthewwspencerr/clash-royale-creating-a-sticky-first-time-user-experience-113e17b18f36), [Giulia Palma](https://medium.com/design-bootcamp/6-lessons-from-clash-royal-onboarding-40ed13bf2483)).
10. **Motion is short, eased and purposeful.** 200-500 ms for UI motion, small elements at 150-200 ms, full-screen mobile transitions about 300-375 ms, above 400 ms feels slow; ease-out for entries, ease-in for exits [S] ([NN/g, animation duration](https://www.nngroup.com/articles/animation-duration/), [Material motion](https://m1.material.io/motion/duration-easing.html), [Val Head](https://valhead.com/2016/05/05/how-fast-should-your-ui-animations-be/)). Stagger at no more than 50 ms per item [S] ([userinterface.wiki](https://www.userinterface.wiki/12-principles-of-animation)).

---

## 2. UI principles, translated for a game

The owner asked to research the principles of good UI and keep them in mind all the time. These are Nielsen's ten usability heuristics, which NN/g has shown apply to games [S] ([NN/g, heuristics applied to games](https://www.nngroup.com/articles/usability-heuristics-applied-video-games/)), plus the game-specific rules that the benchmarks follow. Use this table as a checklist in every UI review.

| # | Principle | What it means in a game | Benchmark example | Ageborn test |
|---|---|---|---|---|
| 1 | Visibility of system status | Show what is happening, what is ready and what is next, all the time | Clash Royale chest slots and upgrade bars; Kingdom Rush shows stars on every map flag [O] | Can a player tell in 2 s what to do next and what is ready to claim? |
| 2 | Match the real world | Use metaphors players know: a map, a deck, a chest, a card | Hearthstone's physical board and "virtual binder" [S] ([Gamer's Experience](https://www.gamersexperience.com/how-hearthstone-perfects-the-digital-card-collecting-and-deck-building-experience/)) | The War Path looks like a path; the deck looks like cards in slots |
| 3 | User control and freedom | Back always works; skip works; undo for edits | Clash Royale's tap-to-skip reveals [O]; TCG Pocket was criticised for having no undo after an action slip [S] ([Pratt IXD, TCG Pocket](https://ixd.prattsi.org/2025/09/design-critique-pokemon-tcg-pocket-android-app/)) | Every screen has one Back in the same place; every sequence over 1 s can be skipped |
| 4 | Consistency and standards | The same colour, shape and position mean the same thing everywhere | Clash Royale yellow = go, green = progress [S] | One button colour code, one card component, one close button position |
| 5 | Error prevention | Grey out what cannot be done; confirm spending | LoR greys out cards from a third region and turns the deck count red when invalid [S] ([LoR deck](https://leagueoflegends.fandom.com/wiki/Deck_(Legends_of_Runeterra))); Kingdom Rush's two-tap tower build [O] | Disabled states explain why; spending Amber or Dust shows the price first |
| 6 | Recognition rather than recall | Icons, previews and inline info instead of remembering rules | Brawl Stars shows each brawler's class name [S] ([Supercell support](https://support.supercell.com/brawl-stars/en/articles/brawler-classes.html)); Kingdom Rush's encyclopedia lists strengths and weaknesses [S] ([Steam](https://steamcommunity.com/app/246420/discussions/0/630800447160190821)) | Class icon, Strong vs and Weak vs visible where a choice is made |
| 7 | Flexibility and efficiency | Shortcuts for experts that do not confuse beginners | Clash Royale drag or tap to place a card [S] ([Fandom](https://clashroyale.fandom.com/f/p/4400000000000335993)); Kingdom Rush hotkeys [S] | Tap and drag both work in the deck builder; keyboard keys on desktop |
| 8 | Aesthetic and minimalist design | Only what is needed now; what survives must be bigger | "Needed frequently, needed urgently, or it is not on screen" [S] ([WANDR](https://www.wandr.studio/blog/mobile-game-ui-design)) | A15.13 budget: count the tappable things on each screen |
| 9 | Help users recover from errors | Say what went wrong in plain words, with a way out | Clash Royale's "Not enough elixir" state on the card [O] | Deny shake plus a short reason ("Need 40 gold") |
| 10 | Help and documentation | Help is in context, one tap away | Kingdom Rush's new-enemy tip on first appearance [O]; Marvel Snap's tap-to-inspect card panel [S] ([SnapComplete](https://snapcomplete.com/collect/cards)) | An "i" on every system panel; long-press any card for details |

Game-specific rules the benchmarks add:

- **Fitts's law and the thumb.** Targets that are used often must be large and near the thumbs. Minimum touch target 44 pt (iOS) or 48 dp (Android), both about 9 mm [S] ([LogRocket](https://blog.logrocket.com/ux-design/all-accessible-touch-target-sizes/), [Android](https://support.google.com/accessibility/android/answer/7101858?hl=en)). On a 6.5 inch phone only part of the screen is in thumb reach, which "pushes primary actions to the bottom corners" [S] (WANDR). In landscape, both thumbs rest on the lower left and lower right corners.
- **Safe areas.** Notches and gesture bars cut into the screen; anchor HUD elements to platform insets, not fixed pixels [S] (WANDR).
- **Progressive disclosure** (see above).
- **Honest anticipation.** Pre-signals must tell the truth (A10, A15.3; `feel-ux.md` section 5).
- **Accessible motion.** Honour the OS "reduce motion" setting and give an in-game switch; no more than 3 flashes per second (WCAG 2.3.1); let players turn off non-essential animation triggered by their actions (WCAG 2.3.3) [S] ([W3C 2.3.3](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html), [MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Media_queries/Using_for_accessibility)).

---

## 3. Game-by-game benchmark

### 3.1 Clash Royale (Supercell, portrait)

- **Home:** the Battle screen is the centre of a swipeable row of tabs: Shop, Cards, Battle, Clan, Events (tournaments) [S] ([ethan761](https://ethan761.wordpress.com/clash-royale-tabs/), GameGrin). The Battle button is the largest yellow element, in the lower middle; the arena art fills the background; reward slots sit under it [O]. Game modes are behind a small mode switcher next to Battle; in 2025 Training Camp and tournaments moved into that switcher [S] ([gamingonphone](https://gamingonphone.com/news/clash-royale-march-2025-update/)).
- **Depth:** one level, with pop-ups instead of new screens [S] (Gornicki).
- **Rewards:** in March 2025 Supercell removed chest timers because they "interrupted the rewarding experience of winning a battle" and delayed enjoying success. Wins now pay an instant Lucky Drop, and a **Play Again** button on the result screen goes straight into the next battle without Home [S] ([RoyaleAPI](https://royaleapi.com/blog/rip-chests-2025-q1-update?lang=en), gamingonphone). Lucky Drops take 3 taps; each tap may raise the star rating from 1 to 5, and stars (not a question mark) show during the opening [S] ([Supercell](https://supercell.com/en/games/clashroyale/blog/release-notes/game-update-lucky-drops/), [Game Rant](https://gamerant.com/clash-royale-how-do-lucky-drops-work/)). October 2025 Lucky Chests work the same way with rarities Common to Champion [S] ([Fandom, Lucky Chests](https://clashroyale.fandom.com/wiki/Lucky_Chests)).
- **Deck builder (Cards tab)** [O]: the active deck (8 cards, 2 rows of 4) is on top with the average elixir cost; the collection grid is below on the same scrolling screen; deck tabs sit above the deck. Tap a collection card: a small pop-up offers **Info** and **Use**. Tap Use: the chosen card lifts and the 8 deck cards wiggle; tap the deck card to replace. Drag and drop also works. If a card is already in the deck, choosing it again swaps the two positions [S] ([deck builder documentation](https://clashroyale.fandom.com/wiki/Clash_Royale_Wiki:Deck_Builder_Documentation)). Criticism: switching between viewing and editing is not easy, and vertical space is used poorly [S] ([redesign study](https://rhythmd22.github.io/Portfolio/Clash%20Royale%20Redesign.html)).
- **Card face** [O]: elixir cost drop in the top-left corner, level ribbon at the bottom, rarity frame colour, copies bar ("12/20") that turns green with an arrow when an upgrade is ready.
- **Card info** [O]: stat rows, each with an icon (Hitpoints, Damage, Hit Speed, Speed, Range, **Targets: Air & Ground**, Count). When an upgrade is ready the rows show the green "+N" each stat will gain. The upgrade plays a short sequence: the card shakes (anticipation), bursts, the level number rolls up, and each stat ticks up with its green increment. Stats rise about 10% per level [S] ([Fandom, Cards](https://clashroyale.fandom.com/wiki/Cards)).
- **Battle** (portrait) [O]: 4 cards in hand plus a "next" preview at the bottom; the elixir bar under the cards; drag a card onto the field shows a translucent placement preview with its range; the enemy half is tinted red where you cannot deploy; a tap-to-select then tap-to-place mode also exists [S] (Fandom).
- **Tutorial:** three Training Camp battles against an AI trainer; the first has a fixed 6-card deck and is easy; a progress bar shows the way out [S] (Training Camp wiki, Matt Le, Giulia Palma).

### 3.2 Brawl Stars (Supercell, landscape)

The best landscape home screen reference, since Ageborn is landscape on phones.

- **Home layout** [O]: the selected brawler stands in the centre as a live 3D model with idle animation; the yellow **Play** button sits in the **bottom-right corner** (right thumb) with the current game-mode tile just left of it; a vertical column of menu buttons on the left (Shop, Brawlers, News, Catalogue); the trophy progress bar across the top; player profile top-left and currencies top-right.
- **Discoverability:** the many home buttons "act as obvious signifiers that enable good discoverability" [S] (Pratt IXD, Brawl Stars). The same critique warns the home can feel crowded, which Supercell answered in 2026 by moving Starr Road and Fame off Home into the Brawler Collection [S] ([gamingonphone](https://gamingonphone.com/news/brawl-stars-is-replacing-starr-road-with-a-new-brawler-blast-system-in-the-next-update/)). Lesson: Supercell actively removes Home buttons when it can.
- **Classes:** seven brawler classes (Damage Dealer, Tank, Marksman, Artillery, Controller, Assassin, Support), each with a name and an icon on the brawler card [S] ([Supercell support](https://support.supercell.com/brawl-stars/en/articles/brawler-classes.html)). This is the direct model for the owner's "card class visible" request.
- **Starr Drops:** start at Rare and get up to four chances to climb (Super Rare, Epic, Mythic, Legendary); odds 50 / 28 / 15 / 5 / 2%; the rarity is decided before the animation [S] (Fandom, [Supercell odds](https://support.supercell.com/brawl-stars/en/articles/starr-drops-chances-2.html)). Each tap is a climb chance with a colour change, a louder sound and a bigger burst [O].

### 3.3 Clash of Clans (Supercell, landscape)

- **Home** is the player's village itself: the world is the menu [O]. The **Attack!** button is a large round button in the **bottom-left corner**, Shop in the bottom-right, resources with storage bars top-right, level and trophies top-left [O]. Landscape on phone and tablet [S] (Game UI Database).
- **Single-player** campaign is a map of goblin bases, each with up to 3 stars [O].
- **Attack HUD** [O]: a single row of troop and spell buttons along the bottom edge, each with a count badge; the selected button is raised and outlined; tapping the ground drops the selected troop. The top-left shows the opponent's name and loot, the top-right the star progress and damage percentage and the timer.

### 3.4 Marvel Snap (Second Dinner, portrait)

- **Navigation:** a bottom bar (Shop, Collection, Main, Season Pass, News) plus large call-to-action buttons [S] (Marvel Snap case study). Interactive elements were moved to the lower half for thumbs [S].
- **Hierarchy:** cards first, UI serves the cards [S] (Tiffany Smart).
- **Upgrades as the core reward:** each card has its own upgrade path of cosmetic stages that add parallax, frame breaking and animated effects; upgrading raises the Collection Level, and the Collection Level track pays new cards and boosters every few levels [S] ([Wikipedia](https://en.wikipedia.org/wiki/Marvel_Snap), [Fandom, Collection Level](https://marvelsnap.fandom.com/en/wiki/Collection_Level), [Dexerto](https://www.dexerto.com/gaming/marvel-snap-progression-explained-upgrade-cards-collection-level-boosters-more-1976343/)). Observed flow [O]: tap Upgrade on a card, the card rises, its frame changes with a flash, a "+CL" number flies into the Collection Level counter, and the track below scrolls to the next reward. Lesson: an upgrade must visibly move another progress bar.
- **Inspect:** tapping any card opens an enlarged detail panel with cost, power and ability text [S] (SnapComplete).
- **Deck builder** [O]: 12 deck slots on top, the collection below, tap to add or remove, filters by cost and ability, and a search field.

### 3.5 Hearthstone (Blizzard)

- **Physical UI:** "our game is UI": the board and menus are designed as a physical box with tactile buttons and toys, which made touch controls "feel magical" [S] ([GDC talk by Derek Sakamoto](https://www.gamedeveloper.com/design/video-designing-an-immersive-user-interface-for-i-hearthstone-i-), [Nucanon summary](https://nucanon.com/blog/nucanon-com-blog-uncovering-your-game-s-seed-crafting-an-immersive-ui-experience-like-hearthstone-s)). Endless grids damage that physicality [S].
- **Pack opening:** drag the pack onto the centre (or double-click); 5 cards appear face down; hovering a card shows a glow in its rarity colour; a rarer card flips with a burst of colour and an announcer line [S] ([Hearthstone wiki, Open Packs](https://hearthstone.wiki.gg/wiki/Open_Packs)). The Legendary glow is orange and has its own sound [O]. A Done button appears when all 5 are flipped [O].
- **Collection manager:** filters by set and mana cost in the lower left, search and crafting in the lower right; a mana curve chart (0 to 7+) shows the deck's shape; craftable cards glow blue, non-craftable ones fade [S] (Gamer's Experience, [Hearthstone wiki, mana curve](https://hearthstone.fandom.com/wiki/Mana_curve)). The deck list sits on the right; clicking a card in the collection adds it with a card-fly animation into the list [O].
- **Design wisdom** (GDC 2014): "immediate fun" and "little victories" [S] ([GDC Vault](https://www.gdcvault.com/play/1020775/Hearthstone-10-Bits-of-Design)).

### 3.6 Kingdom Rush (Ironhide, landscape)

- **Level map:** an illustrated world map with a flag per level; each flag shows 0 to 3 stars (3 stars at 18+ lives left, 2 at 6-17, 1 at 1-5) plus Heroic and Iron challenge marks, up to 5 stars per level [S] ([Kingdom Rush wiki, Campaign](https://kingdomrushtd.fandom.com/wiki/Campaign)). After a win the dotted path draws itself to the next flag, which drops in and bounces [O]. The map gives quick access to the hero room, store and encyclopedia [S], as big round buttons at the map's corners [O] ([Emily Miles](https://emilym.space/thumbelina-hurts-mobile-ui-blog/2018/6/26/kingdom-rush-a-tower-defense-trilogy-with-ui-design-approaching-perfection-and-entertainment-worth-missing-bedtime-for)).
- **Buttons:** "clear and memorable" circular icons "perfect for thumbs"; a very minimal UI [S] (Emily Miles, [joshbauer94](https://joshbauer94.wordpress.com/2014/11/08/user-interface-analysis-of-tower-defence-games/)).
- **HUD** [O]: lives, gold and wave counter small at the top-left; hero portrait and two spell buttons at the bottom-left; spells are aimed by selecting the button and then tapping the map, with an area circle following the finger. A pulsing skull at the path entrance calls the next wave early and shows what is coming on hover [S] (Steam).
- **Tower build** [O]: tap an empty build spot and a ring of 4 tower icons with prices opens around it; unaffordable ones are grey; the first tap on an icon previews the tower's range, the second confirms. This two-tap confirm prevents costly mis-taps.
- **Just-in-time help:** the first time a new enemy appears, a card pops up with its picture, name and a one-line tip, and it is added to the encyclopedia [O]. Strengths and weaknesses of each enemy and tower are one tap away in the encyclopedia [S] (Steam).

### 3.7 Rush Royale (MY.GAMES, portrait)

- Deck of 5 units plus a hero; talents chosen at levels [S] ([Wikipedia](https://en.wikipedia.org/wiki/Rush_Royale)).
- A 2024 hero-window redesign replaced a tiny unit picture with large artwork while keeping the stats and talents layout familiar, and added **recommended decks**, **replays of other players' battles** and **a short video of each unit's ability** in the unit window [S] ([MY.GAMES](https://medium.com/my-games-company/see-your-heroes-in-a-new-light-redesigning-rush-royales-hero-windows-98b72b62c1f1)). Lesson: showing a unit in motion explains it better than text.
- Battle: a big summon button bottom-centre with its mana cost; drag a unit onto an identical one to merge [S] ([Level Winner](https://www.levelwinner.com/rush-royale-beginners-guide-tips-tricks-strategies-to-dominate-your-opponents/)).

### 3.8 Legends of Runeterra (Riot)

- **Deck builder validation:** the champion count and card count sit bottom-left as "n/6" and "n/40"; going over turns them red and the deck is marked invalid; once two regions are used, cards from other regions grey out [S] (LoR wiki). Filters by region, cost, type, rarity and set, plus search [S] ([Inven Global](https://www.invenglobal.com/articles/9832/guide-how-do-you-build-a-deck-in-legends-of-runeterra)).
- **Region identity:** each region has its own icon and palette, used as the frame for deck building [S] ([Ryan O'Donoghue](https://www.ryanodon.com/case-studies/legends-of-runeterra)). Champion cards have dynamic frame states for level-up progress [S]. Keyword tooltips appear on hover or long-press [O].
- **Path of Champions:** a node map of fights and events; nodes branch, but all paths lead to the boss; boss and power nodes are visible in advance [S] ([Path of Champions nodes](https://leagueoflegends.fandom.com/wiki/The_Path_of_Champions_1.0_(Legends_of_Runeterra)/Nodes)).

### 3.9 Pokemon TCG Pocket (Creatures / DeNA, portrait)

- **Physical opening:** the player swipes across the pack to tear it open, then swipes through the cards one by one "just like you would in real life" [S] ([60fps.design](https://60fps.design/apps/poke-mon-tcg-pocket), [dxcollection](https://dxcollection.com.sg/the-hidden-joy-of-tcg-pack-opening/)). The gradual reveal builds tension to the final rare card [S].
- **Tilt and hold:** some rarities can be tilted to show foil effects; tap and hold on Immersive cards plays an animation of the story behind the art [S] ([Pokemon Zone](https://www.pokemon-zone.com/articles/arts-rarities-in-tcg-pocket/)).
- **Critique:** swiping and flipping packs on the selection screen are "not immediately discoverable", and a tap-through action slip locks the player in with no undo [S] (Pratt IXD, TCG Pocket). Lesson: a gesture needs a visible hint the first time.

### 3.10 Battle Cats (PONOS, landscape lane game)

The closest genre peer to Ageborn's battle HUD.

- **HUD:** the unit buttons each show cost and a recharge time; the Worker Cat is tapped to raise income and wallet size; the Cat Cannon is a charged special [S] ([Battle Cats wiki](https://battlecats.miraheze.org/wiki/Battle), [Cat Cannon](https://battle-cats.fandom.com/wiki/Cat_Cannon)). The unit row runs along the bottom, the Worker Cat sits at the bottom-left and the Cat Cannon at the bottom-right [O].
- **More than 5 units:** with 6 or more units the player flicks up or down to see the second row of 5; since version 10.4 a two-column layout is an option [S] (Battle Cats wiki). Lesson for six troops: one row of 6 fits on Ageborn's tray; do not hide the 6th card behind a flick.

### 3.11 Candy Crush Saga (King, the level-map reference)

- The map visibly changes with every level passed, which works as a reward and builds anticipation for what is next [S] ([Faye Stover](https://fayejstover.medium.com/game-breakdown-candy-crush-1d89f4f930f1)).
- Early levels are almost trivially easy to build confidence, then new mechanics arrive one at a time [S] (Faye Stover).
- A win ends with a positive word and 1 to 3 stars [S] ([PatternFly](https://medium.com/patternfly/crushing-the-microcopy-game-a-candy-crush-ux-writing-review-32b37c187a8)).
- Ageborn must skip the "pinch level to sell boosters" part [S] ([Game Developer](https://www.gamedeveloper.com/design/rethinking-progression-in-mobile-puzzle-games)): there is nothing to sell.

---

## 4. Patterns by surface

### 4.1 Home and navigation

| Pattern | Seen in | Detail |
|---|---|---|
| One dominant call to action | CR, BS, CoC, Snap | The biggest, brightest (yellow/gold) element; nothing else uses that colour at that size |
| Primary action in a bottom corner in landscape | BS (bottom-right Play), CoC (bottom-left Attack) [O] | Under a resting thumb; the mode or level tile sits right next to it |
| The world is the background | CR arena, BS brawler, CoC village [O] | A live, animated scene behind the UI; the player's own army or base shown there makes it personal |
| Few top-level destinations | CR 5 tabs, Snap 5 tabs [S] | 4 to 5 labelled destinations; everything else is a pop-up or lives inside a destination |
| Depth of one | CR [S] | Destination screens open pop-ups, not deeper screens |
| Remove before adding | BS 2026 moved Starr Road and Fame off Home [S] | When a new feature arrives, something else moves inside a destination |
| Rewards and claims at the side, not the centre | CR reward slots under Battle [O] | Claimable items are visible but never compete with Play |

### 4.2 The next action is always one tap away

- **Play Again on the Result screen** (CR 2025) [S]. Ageborn's Result already has Next battle; make it the primary button in the same place as Home's Battle button.
- **The level map opens on the current node**, auto-scrolled so the next node sits near the Play button [O] (Kingdom Rush, Candy Crush).
- **The mode tile sits next to Play** (BS) [O], so changing mode never means leaving Home.

### 4.3 Deck builder and card equip

- **Loadout on top, collection below, one screen** (CR, Snap, Hearthstone with the list on the side) [O].
- **Two input paths:** tap a card then tap a slot (the slots wiggle or glow as drop targets), or drag the card onto a slot [O][S].
- **Instant validity:** counts like "6/6 troops" turn red when invalid; cards that cannot be added grey out with the reason (LoR) [S].
- **Deck shape at a glance:** average cost (CR) or a cost curve (Hearthstone) [S]. For Ageborn: average level, cost, and a class mix strip (for example 2 Infantry, 2 Ranged, 1 Heavy, 1 Air) with the advisor's warning next to it.
- **Drag feedback:** lift the card with a shadow, show a ghost, highlight valid drop zones, snap into place with a quick animation, and support undo [S] ([NN/g drag and drop](https://www.nngroup.com/articles/drag-drop/), [Smart Interface Design Patterns](https://smart-interface-design-patterns.com/articles/drag-and-drop-ux/)). A haptic bump of 10-20 ms on grab and on drop [S] (drag-and-drop guides above); Ageborn keeps vibration default Off (A9 Settings).

### 4.4 Collection and card detail

- **Owned cards in full colour, unowned as silhouettes or faded**, filters as chips, sort options [O] (all).
- **Upgrade-ready state is loud on the card itself:** a green bar with an arrow (CR) [O].
- **Card detail shows the unit moving** (Rush Royale's ability video [S], Ageborn's A9 #11 "animated idle on a stage"). Add a short attack loop, not only idle.
- **Next-level preview** with green "+N" per stat before confirming the upgrade (CR) [O].

### 4.5 Card class and counters

- **Class = icon + word** on the card face (Brawl Stars brawler classes [S]; LoR region icons [S]).
- **Counters in plain words where the choice is made:** Kingdom Rush's encyclopedia "strengths and weaknesses" [S]; CR's "Targets: Air & Ground" row [O].
- **Long-press or hover opens a tooltip** with the details (LoR keywords, Snap inspect) [O][S].
- For Ageborn: a class icon in a fixed corner of every card (tray, War Plan, Collection, capsule reveal), the class word under the name on larger cards, and a "Strong vs / Weak vs" row of class icons in the card detail and tooltip. This is the owner's request of 2026-09-28 and matches the benchmarks.

### 4.6 Reward and chest flows

- **No wait between win and reward** (CR 2025) [S].
- **Tap-to-climb with a pre-rolled result** (Starr Drop, Lucky Drop) [S]; stars or tier colour visible during the climb [S].
- **Rarity pre-signal before the flip** (Hearthstone hover glow) [S].
- **A physical gesture for the big moment** (TCG Pocket swipe-to-tear, Hearthstone drag pack to centre) [S], with a visible hint the first time [S].
- **Collect animation to the destination:** currency and copies fly into their counters and bars [S] (Game Economist).
- **End on actions, not a dead end:** a summary with Equip, Upgrade and Open next (A10 step 8 already).

### 4.7 Level and saga maps

- **Nodes on a visible path, current node pulsing, next node one tap** [O] (Kingdom Rush, Candy Crush).
- **Stars per node with criteria known before the battle** (Kingdom Rush lives thresholds) [S].
- **The path draws itself after a win and the next node drops in** [O].
- **Regions change the art as you advance** (Candy Crush) [S]; for Ageborn, each age is a region of the War Path.
- **Bosses and special nodes are visible ahead** (Path of Champions) [S] to give a goal.

### 4.8 Battle HUD in landscape

- **Bottom row = actions, top strip = status** (Battle Cats, CoC attack, Kingdom Rush) [S][O].
- **Economy upgrade bottom-left, big special bottom-right** (Battle Cats Worker Cat and Cat Cannon) [O]. Ageborn's A9.2 tray already puts gold left and the Age Power right.
- **Unit buttons show cost and a recharge fill**, and glow when affordable [S] (Battle Cats; `feel-ux.md` section 5).
- **Aimed specials: select or drag, then an area circle follows the finger** (Kingdom Rush spells, CR card drag) [O]. The owner's power-drag request matches.
- **Nothing persistent over the play field** (A9.2 already).

### 4.9 Tutorials

- **Learn by playing, almost no text** (CR Training Camp) [S]; at most about 8 words at a time (`feel-ux.md`).
- **One new mechanic per battle** (CR, Candy Crush) [S].
- **Just-in-time cards** for new enemies or features (Kingdom Rush) [O].
- **A visible hint for any gesture** the first time (TCG Pocket critique) [S]: a ghost hand for the power drag and the capsule gesture.
- **Unlock features with a small ceremony**: the new nav button flies in and is spotlighted once [O] (CR arena unlocks, BS trophy road unlocks).

---

## 5. Motion and juice for the UI

`feel-ux.md` covers battle juice. This section sets numbers for **menu motion**, so every screen feels the same. The numbers below are Ageborn proposals based on the sources in section 1; measured values from the shipped games are marked [O].

### 5.1 Motion tokens

| Token | Duration | Easing | Used for |
|---|---|---|---|
| `press` | 60-80 ms down | ease-out | Button and card press: scale 0.94-0.96 and the 3D lip moves down |
| `release` | 160-220 ms | back (overshoot about 1.04) | Button spring back after release |
| `micro` | 120-180 ms | ease-out | Toggles, chip select, tab underline |
| `panel-in` | 220-280 ms | ease-out (emphasised decelerate) | Pop-ups and sheets; scale 0.92 to 1 from the tapped element's position, plus fade |
| `panel-out` | 150-180 ms | ease-in | Exits are faster than entries [S] |
| `screen` | 280-340 ms | ease-in-out | Full-screen transitions; slide in from the side the nav button sits on |
| `stagger` | 30-50 ms per item, total at most 300 ms | none | Grids, lists, reward rows [S] |
| `fill` | 400-600 ms | ease-out | Progress bars; a bright leading edge; a flash and pop when full |
| `count` | 400-900 ms, grows with the log of the amount | ease-out | Number roll-ups; the digits scale to 1.15 and back when the roll ends |
| `fly` | 450-700 ms per item, 40 ms stagger, 6-12 items | arc with ease-in at the end | Currency and copies flying into their counter; the counter bumps as each item lands |
| `ceremony` | 1.2-2.0 s, skippable | scripted | Level-ups, unlocks, upgrades: anticipation, burst, reveal, settle |
| `idle` | 1.6-2.4 s loop | sine | The one primary button's breathing (scale 1.00-1.03) and a sheen sweep every 3-4 s |

Rules:

- **Visual feedback on pointer-down, within one frame** (under 0.1 s [S]). Sound can play on release.
- **At most one element breathes or pulses per screen**: the primary action. Badges do not pulse forever.
- **Motion has a direction that explains space:** a sheet opens from the button that opened it and closes back into it; a reward flies to where it is stored; a screen slides in from the side of its nav button.
- **Every sequence longer than 1 s can be skipped or sped up by a tap** (A10 rules; CR [O]).
- **Anticipation, action, follow-through** for every ceremony (Disney principles applied to UI [S], [IxDF](https://ixdf.org/literature/article/ui-animation-how-to-apply-disney-s-12-principles-of-animation-to-ui-design)): a 100-150 ms wind-up (shrink or shake), the main change, then a small overshoot and settle.
- **Pair each motion tier with a sound tier**: tick (press), pop (panel), whoosh (screen), chime (claim), fanfare (ceremony).

### 5.2 Reference sequences

- **Button press** (all games) [O]: down at once, scale 0.95 and the lip shortens; on release a spring to 1.04 and back to 1.0; a click sound.
- **Currency claim** [S][O]: the claim button pops; 6-12 coin sprites burst out, arc to the counter with a 40 ms stagger; the counter rolls up and bumps with each arrival; a final chime.
- **Card flip** (Hearthstone, CR, A10) [O][S]: the back glows in the rarity colour for about 0.3 s (A10), a 3D turn with the card scaling to about 1.1 at the midpoint, a burst in the rarity colour behind it, and the rarity sound. Common cards flip fast (A10: 0.15 s); rare ones slow down.
- **Chest or capsule open** (CR, BS, TCG Pocket) [S][O]: arrival bounce, charge with shaking and light leaks, tap climbs with a colour step and a louder sound each time, burst, cards fan out. A10 already specifies this; the benchmarks add the **stars or tier pips visible during the climb** (Lucky Drop) and an optional **physical gesture** for the final break (TCG Pocket).
- **Card upgrade** (CR, Snap) [O]: the card lifts and shakes (anticipation); a burst; the level number rolls; each stat ticks up with a green "+N"; the new frame or trim snaps on; a progress number (Snap's Collection Level, Ageborn's Plan level or Codex) flies to its counter. About 1.5 s, skippable.
- **Level map advance** (Kingdom Rush, Candy Crush) [O]: after returning from a win, the stars stamp onto the node one by one (about 250 ms each with a rising pitch), the path dots draw to the next node (about 600 ms), the next node drops in with a bounce, and the Play button pulses on it.
- **Feature unlock** [O]: the screen dims, the new nav button scales in from 0 with an overshoot, a light sweep crosses it, and a one-line label says what it is; one tap opens it.

### 5.3 Reduce motion, done well

Replace, do not remove: under "reduce motion" swap slides, scales and shakes for 120-150 ms cross-fades and colour changes, keep state feedback (pressed, ready, denied), and keep the flashes under 3 per second [S] (W3C, MDN). Note for Ageborn: `src/ui/theme.css` currently sets every animation and transition to 1 ms under reduce motion, which removes feedback as well as motion. The UI plan should switch to reduced variants per token.

---

## 6. Anti-patterns to avoid

| Anti-pattern | Why | Seen or warned in |
|---|---|---|
| Many equal buttons on Home | No clear next action; the owner's "confusing" | BS crowding, fixed by removing Home buttons in 2026 [S] |
| Badge on everything | Badge blindness and low-grade anxiety [S] ([Braze](https://www.braze.com/resources/articles/beware-red-dot-badging), [Eleken](https://www.eleken.co/blog-posts/badge-ui-design)) | Use one badge meaning: "something here is ready for you" |
| Hidden gestures | Players do not find them [S] | TCG Pocket critique |
| Irreversible taps without confirm or undo | Action slips [S] | TCG Pocket critique |
| Waiting between win and reward | Breaks the high of winning [S] | CR removed chest timers in 2025 |
| Long unskippable reveals | Past 10 s attention drops [S] | NN/g; A10's 10 s cap |
| Flashing reminders | Eye strain; players hated Age of War's blinking upgrade button | `feel-ux.md` section 5 |
| Fake near misses and "pinch" levels | Dishonest; sells nothing in a no-money game | `feel-ux.md`; Game Developer |
| Linear easing and uniform durations | Feels robotic [S] | Tween and easing guides |
| Deep menus | Lost players | CR's one-level rule [S] |

---

## 7. Ranked patterns to adopt

Ranked by how much each one fixes the owner's complaint ("confusing, not intuitive"), then by how often the player meets it, then by cost. "Surface" names the Ageborn screen or package. Items marked **owner** match earlier owner feedback.

| Rank | Pattern | Benchmarks | Ageborn surface | What to do | Effort |
|---|---|---|---|---|---|
| 1 | **One primary action per screen, in the thumb corner** | CR, BS, CoC [S][O] | Home, Result, War Path | Home's gold Battle button (on the current War Path node) is the only gold, only breathing element, placed bottom-right in landscape; the Result's Next battle sits in the same spot | M |
| 2 | **War Path as Home's centrepiece, opened on the current node** (**owner**) | Kingdom Rush, Candy Crush, Path of Champions [S][O] | Home / War Path | Auto-scroll to the current node; nodes show 0-3 stars with criteria shown before the battle; boss nodes visible ahead; each age is a map region | L |
| 3 | **At most 5 labelled destinations, depth of one** | CR, Snap [S] | Home nav, router | Today Home shows 6 nav buttons, a quests column, a capsule column, a road bar and top chips. Group into about 5: War Path (Home), Army (War Plan and Collection as one screen), Capsules (tray on Home), Customize, Progress (Trophy Road, Conquest, quests). Pop-ups inside, not new levels | M |
| 4 | **One button colour code** | CR [S] | `src/ui/components/Button.tsx`, theme | Gold = go and continue (Battle, Next, Open); green = progress (Upgrade, Claim, Equip); blue = neutral; red = destructive or leave; grey = disabled with a reason. Audit every button | S |
| 5 | **Deck builder: loadout on top, collection below, tap-or-drag into slots** (**owner**) | CR, Snap, Hearthstone, LoR [S][O] | War Plan | Per-age tabs with "6/6"; selected card lifts and the slots glow; drag with ghost and snap; counts turn red when invalid; class mix strip plus the advisor; undo for the last change | L |
| 6 | **Class icon and word on every card; Strong vs / Weak vs one long-press away** (**owner**) | Brawl Stars, LoR, Kingdom Rush, CR "Targets" [S][O] | `CardTile`, `ClassIcon`, tray, card detail | Fixed corner for the icon on every card face; tooltip on long-press or hover; card detail shows counters as class icons plus one plain sentence | M |
| 7 | **Pointer-down feedback under 0.1 s everywhere, plus a deny state with a reason** | NN/g, CR [S][O] | UI kit, HUD | `press` and `release` tokens on every button and card; the deny shake adds a short reason ("Need 40 gold") | S |
| 8 | **Motion tokens and one animation helper for the whole UI** | Material, NN/g, IxDF [S] | `theme.css`, `kit.ts` | Define the section 5.1 tokens as CSS variables and a small helper for fly, count and stagger; every screen uses them; reduced-motion variants per token | M |
| 9 | **Rewards fly to where they are stored** | Currency flyout best practice [S]; CR, Snap [O] | Result, capsule summary, quests, Trophy Road | Coins and Amber fly to the counter, copies to the card's bar, stars to the node; counters roll and bump | M |
| 10 | **No wait and no dead end after a win; Play again** | CR 2025 [S] | Result | Staged rewards (A15.13 max 3 steps) skippable with one tap; Next battle primary; capsules open from the Result without visiting Home | S |
| 11 | **Capsule climb shows tier pips or stars during the climb; optional physical final gesture with a first-time hint** (**owner**: more satisfying) | Lucky Drop, Starr Drop, TCG Pocket, Hearthstone [S] | `src/capsule` | Keep A10's pre-rolled honest climb; add a swipe or hold to break at step 4 with a ghost hand the first time; tap still works | M |
| 12 | **Upgrade ceremony with stat roll-ups and a second bar that moves** (**owner**: base upgrades more satisfying) | CR, Marvel Snap [S][O] | Card detail, base upgrades, Customize | Anticipation shake, burst, level roll, green "+N" per stat, new trim snaps on, and the Plan level or collection counter flies up | M |
| 13 | **Progressive disclosure with an unlock ceremony** | CR, BS, progressive-disclosure research [S] | Home nav, onboarding | Start with War Path and Battle only; each destination arrives with a one-time spotlight and a one-line label; locked items say how to unlock ("Win War Path 3") | M |
| 14 | **Drag-to-target with ghost, valid and invalid tint, snap, and cancel by dragging back** (**owner**: power drag) | CR card drag, Kingdom Rush spells, drag-and-drop research [S][O] | HUD Age Power, War Plan, stationary class placement | One shared drag behaviour for powers, fortifications and deck slots | M |
| 15 | **Landscape HUD: actions bottom, status top, 6 cards in one row** (**owner**: six troops) | Battle Cats, CoC, Kingdom Rush [S][O] | `src/ui/hud` | Gold bottom-left, 6 cards centre (no second row or flick), Age Power bottom-right; status in a thin top strip; minimum 48 px targets on an 844 x 390 phone | M |
| 16 | **Tutorial by doing, one mechanic per battle, just-in-time cards for new things** | CR, Kingdom Rush, Candy Crush [S][O] | Tutorial, War Path early nodes | Each early War Path node introduces one thing; the first sight of a new enemy class shows a small card with its counter | M |
| 17 | **Badges mean one thing only** | Badge research [S] | Home nav | A green count only for "ready to claim or upgrade"; no dots for news; at most 2 badges visible at once on Home | S |
| 18 | **The world is the background: a live diorama of the player's army and base** | BS brawler, CR arena, CoC village [O] | Home backdrop (`ArenaScene`) | The equipped base and a few equipped units idle, react to taps and show the equipped skin, flag and decorations; it makes Customize visible (**owner**: cosmetics) | M |
| 19 | **Card detail shows the unit in action** | Rush Royale video [S] | Card detail | A 2-3 s loop of walk, attack and ability on a small lane backdrop, not idle only | M |
| 20 | **Spatial transitions** | Material, Disney principles [S] | Router, `ScreenHost` | Sheets grow from the tapped element and shrink back; destination screens slide from their nav side; Back reverses the motion | M |
| 21 | **Level map advance ceremony** | Kingdom Rush, Candy Crush [O] | War Path | Stars stamp one by one, the path draws, the next node drops in and the Play button lands on it | S |
| 22 | **Consistent back and close** | Nielsen 3 and 4 [S] | All screens | Back always top-left, close on sheets always top-right, and the Escape key and the browser back gesture do the same | S |
| 23 | **Two-tap confirm for spending, undo for edits** | Kingdom Rush build, LoR invalid state [S][O] | Upgrade, crafting, deck edits | First tap shows the price and the result; second tap confirms; deck edits have undo instead of a confirm | S |
| 24 | **Sound tier for each motion tier** | Hearthstone announcer, CR [S][O] | UI sound ids (WP6) | tick, pop, whoosh, chime, fanfare; one per event, never stacked | S |
| 25 | **Reduce motion that replaces instead of removing** | W3C, MDN [S] | `theme.css` | Cross-fades and colour changes under reduce motion; feedback stays | S |

Effort: S = one package, under a day; M = one package, a few days or a cross-package request; L = several packages or a new screen.

### Suggested order

1. **Foundations first** (ranks 4, 7, 8, 22, 25): the button code, press feedback, motion tokens, back and close positions, reduce motion. They are small, touch the shared kit, and make every later screen consistent.
2. **Structure** (ranks 1, 2, 3, 13, 17): the Home layout with War Path and one primary action, the grouped navigation, and progressive unlocks.
3. **Core flows** (ranks 5, 6, 14, 15, 16): deck builder, class and counters, drag, HUD, tutorial.
4. **Satisfaction** (ranks 9, 10, 11, 12, 18, 19, 20, 21, 24): reward flights, ceremonies, diorama, transitions, sound tiers.

---

## 8. A quick UI review checklist

Run this on every screen before calling it done (use Playwright screenshots at 844 x 390 and 1280 x 720):

1. What is the one primary action? Is it the only gold, breathing element, and is it under a thumb?
2. How many tappable things are on screen? Can any move inside a destination?
3. Is every target at least 48 px on the phone viewport?
4. Does every press react on pointer-down? Does every disabled thing say why?
5. Does every number that changes roll, and does every reward fly to where it is stored?
6. Does every sequence over 1 s skip on tap?
7. Does the screen look right with reduce motion on?
8. Are all strings in i18n, all bots labelled AI, and all capsule copy honest (A15.3)?
9. Is Back in the same place as on every other screen?
10. Would a new player know what to do next within 2 seconds?

---

## Sources

UI principles and motion

- [NN/g: Response time limits](https://www.nngroup.com/articles/response-times-3-important-limits/)
- [NN/g: 10 usability heuristics applied to video games](https://www.nngroup.com/articles/usability-heuristics-applied-video-games/)
- [NN/g: Animation duration and motion characteristics](https://www.nngroup.com/articles/animation-duration/)
- [NN/g: Drag and drop](https://www.nngroup.com/articles/drag-drop/)
- [Material Design 1: Duration and easing](https://m1.material.io/motion/duration-easing.html)
- [Val Head: How fast should your UI animations be?](https://valhead.com/2016/05/05/how-fast-should-your-ui-animations-be/)
- [userinterface.wiki: 12 principles of animation](https://www.userinterface.wiki/12-principles-of-animation)
- [IxDF: Disney's 12 principles applied to UI](https://ixdf.org/literature/article/ui-animation-how-to-apply-disney-s-12-principles-of-animation-to-ui-design)
- [Smart Interface Design Patterns: Drag and drop UX](https://smart-interface-design-patterns.com/articles/drag-and-drop-ux/)
- [Pencil & Paper: Drag and drop UX](https://www.pencilandpaper.io/articles/ux-pattern-drag-and-drop)
- [LogRocket: Accessible touch target sizes](https://blog.logrocket.com/ux-design/all-accessible-touch-target-sizes/)
- [Android: Touch target size](https://support.google.com/accessibility/android/answer/7101858?hl=en)
- [WANDR: Mobile game UI design, thumbs, sessions and constraints](https://www.wandr.studio/blog/mobile-game-ui-design)
- [UXPin: Progressive disclosure](https://www.uxpin.com/studio/blog/what-is-progressive-disclosure/)
- [UX Planet: Progressive disclosure for mobile apps](https://uxplanet.org/design-patterns-progressive-disclosure-for-mobile-apps-f41001a293ba)
- [Braze: Red dot blindness](https://www.braze.com/resources/articles/beware-red-dot-badging)
- [Eleken: Badge UI design](https://www.eleken.co/blog-posts/badge-ui-design)
- [W3C: WCAG 2.3.3 Animation from interactions](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html)
- [MDN: Media queries for accessibility](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Media_queries/Using_for_accessibility)
- [Game Economist Consulting: The best currency animations](https://www.gameeconomistconsulting.com/the-best-currency-animations-of-all-time/)
- [GameJuice: Juice it or lose it](https://gamejuice.co.uk/resources/juice-it-or-lose-it)

Clash Royale

- [GameGrin: What apps can learn from Clash Royale's UI](https://www.gamegrin.com/articles/what-can-online-apps-learn-from-clash-royales-user-interface/)
- [Maciej Gornicki: UX in Clash Royale, part 1](https://www.gornicki.me/blog/90l/ux-in-clash-royale-part-1)
- [The Rookies: Clash Royale UX breakdown](https://discover.therookies.co/2020/02/24/game-design-ux-best-practices-detailed-breakdown-of-clash-royale/)
- [Clash Royale redesign study](https://rhythmd22.github.io/Portfolio/Clash%20Royale%20Redesign.html)
- [Clash Royale tabs](https://ethan761.wordpress.com/clash-royale-tabs/)
- [Fandom: Deck builder documentation](https://clashroyale.fandom.com/wiki/Clash_Royale_Wiki:Deck_Builder_Documentation)
- [Fandom: Cards](https://clashroyale.fandom.com/wiki/Cards)
- [Fandom: Lucky Chests](https://clashroyale.fandom.com/wiki/Lucky_Chests)
- [Fandom: Training Camp](https://clashroyale.fandom.com/wiki/Training_Camp)
- [Fandom: How do you place a card?](https://clashroyale.fandom.com/f/p/4400000000000335993)
- [Supercell: Game update, Lucky Drops](https://supercell.com/en/games/clashroyale/blog/release-notes/game-update-lucky-drops/)
- [Game Rant: How Lucky Drops work](https://gamerant.com/clash-royale-how-do-lucky-drops-work/)
- [RoyaleAPI: RIP Chests, 2025 Q1 update](https://royaleapi.com/blog/rip-chests-2025-q1-update?lang=en)
- [gamingonphone: March 2025 update](https://gamingonphone.com/news/clash-royale-march-2025-update/)
- [Matt Le: Creating a sticky first-time user experience](https://medium.com/@Matthewwspencerr/clash-royale-creating-a-sticky-first-time-user-experience-113e17b18f36)
- [Giulia Palma: 6 lessons from Clash Royale onboarding](https://medium.com/design-bootcamp/6-lessons-from-clash-royal-onboarding-40ed13bf2483)
- [Game UI Database: Clash Royale](https://www.gameuidatabase.com/gameData.php?id=1299)

Brawl Stars and Clash of Clans

- [Pratt IXD: Design critique, Brawl Stars](https://ixd.prattsi.org/2025/02/design-critique-brawl-stars/)
- [Supercell support: Brawler classes](https://support.supercell.com/brawl-stars/en/articles/brawler-classes.html)
- [Fandom: Starr Drops](https://brawlstars.fandom.com/wiki/Starr_Drops)
- [Supercell support: Starr Drop chances](https://support.supercell.com/brawl-stars/en/articles/starr-drops-chances-2.html)
- [gamingonphone: Brawler Blast replaces Starr Road](https://gamingonphone.com/news/brawl-stars-is-replacing-starr-road-with-a-new-brawler-blast-system-in-the-next-update/)
- [Game UI Database: Brawl Stars](https://www.gameuidatabase.com/gameData.php?id=465)
- [Game UI Database: Clash of Clans](https://www.gameuidatabase.com/gameData.php?id=1298)

Marvel Snap

- [Tiffany Smart: Marvel Snap UI](https://www.tiffanysmart.com/work/marvel-snap)
- [Marvel's Snap UI/UX case study](https://medium.com/design-bootcamp/marvels-snap-ui-ux-case-study-9f727d8f3875)
- [Andrew Hutcheson: SNAPPY U.I.](https://www.artstation.com/artwork/GemNDd)
- [Wikipedia: Marvel Snap](https://en.wikipedia.org/wiki/Marvel_Snap)
- [Fandom: Collection Level](https://marvelsnap.fandom.com/en/wiki/Collection_Level)
- [Dexerto: Marvel Snap progression explained](https://www.dexerto.com/gaming/marvel-snap-progression-explained-upgrade-cards-collection-level-boosters-more-1976343/)
- [SnapComplete: card detail panel](https://snapcomplete.com/collect/cards)
- [GDC: Designing Marvel Snap](https://www.youtube.com/watch?v=HjhsY2Zuo-c)
- [Game UI Database: Marvel Snap](https://www.gameuidatabase.com/gameData.php?id=1785)

Hearthstone

- [Game Developer: Designing an immersive UI for Hearthstone (Derek Sakamoto)](https://www.gamedeveloper.com/design/video-designing-an-immersive-user-interface-for-i-hearthstone-i-)
- [GDC Vault: Hearthstone, how to create an immersive UI](https://gdcvault.com/play/1022036/Hearthstone-How-to-Create-an)
- [Nucanon: Crafting an immersive UI like Hearthstone's](https://nucanon.com/blog/nucanon-com-blog-uncovering-your-game-s-seed-crafting-an-immersive-ui-experience-like-hearthstone-s)
- [GDC Vault: Hearthstone, 10 bits of design wisdom](https://www.gdcvault.com/play/1020775/Hearthstone-10-Bits-of-Design)
- [Hearthstone wiki: Open Packs](https://hearthstone.wiki.gg/wiki/Open_Packs)
- [Hearthstone wiki: Mana curve](https://hearthstone.fandom.com/wiki/Mana_curve)
- [The Gamer's Experience: Hearthstone collecting and deck building](https://www.gamersexperience.com/how-hearthstone-perfects-the-digital-card-collecting-and-deck-building-experience/)

Kingdom Rush, Rush Royale, Legends of Runeterra, Pokemon TCG Pocket, Battle Cats, Candy Crush

- [Emily Miles: Kingdom Rush UI](https://emilym.space/thumbelina-hurts-mobile-ui-blog/2018/6/26/kingdom-rush-a-tower-defense-trilogy-with-ui-design-approaching-perfection-and-entertainment-worth-missing-bedtime-for)
- [joshbauer94: UI analysis of tower defence games](https://joshbauer94.wordpress.com/2014/11/08/user-interface-analysis-of-tower-defence-games/)
- [Kingdom Rush wiki: Campaign](https://kingdomrushtd.fandom.com/wiki/Campaign)
- [Steam: Kingdom Rush 2.1 discussion](https://steamcommunity.com/app/246420/discussions/0/630800447160190821)
- [MY.GAMES: Redesigning Rush Royale's hero windows](https://medium.com/my-games-company/see-your-heroes-in-a-new-light-redesigning-rush-royales-hero-windows-98b72b62c1f1)
- [Wikipedia: Rush Royale](https://en.wikipedia.org/wiki/Rush_Royale)
- [Level Winner: Rush Royale beginner's guide](https://www.levelwinner.com/rush-royale-beginners-guide-tips-tricks-strategies-to-dominate-your-opponents/)
- [LoR wiki: Deck](https://leagueoflegends.fandom.com/wiki/Deck_(Legends_of_Runeterra))
- [Inven Global: How to build a deck in LoR](https://www.invenglobal.com/articles/9832/guide-how-do-you-build-a-deck-in-legends-of-runeterra)
- [Ryan O'Donoghue: Legends of Runeterra case study](https://www.ryanodon.com/case-studies/legends-of-runeterra)
- [LoR wiki: Path of Champions nodes](https://leagueoflegends.fandom.com/wiki/The_Path_of_Champions_1.0_(Legends_of_Runeterra)/Nodes)
- [Pratt IXD: Design critique, Pokemon TCG Pocket](https://ixd.prattsi.org/2025/09/design-critique-pokemon-tcg-pocket-android-app/)
- [60fps.design: Pokemon TCG Pocket animations](https://60fps.design/apps/poke-mon-tcg-pocket)
- [dxcollection: The hidden joy of pack opening](https://dxcollection.com.sg/the-hidden-joy-of-tcg-pack-opening/)
- [Pokemon Zone: Arts and rarities in TCG Pocket](https://www.pokemon-zone.com/articles/arts-rarities-in-tcg-pocket/)
- [Battle Cats wiki: Battle](https://battlecats.miraheze.org/wiki/Battle)
- [Battle Cats wiki: Cat Cannon](https://battle-cats.fandom.com/wiki/Cat_Cannon)
- [Faye Stover: Candy Crush breakdown](https://fayejstover.medium.com/game-breakdown-candy-crush-1d89f4f930f1)
- [PatternFly: Candy Crush UX writing review](https://medium.com/patternfly/crushing-the-microcopy-game-a-candy-crush-ux-writing-review-32b37c187a8)
- [Game Developer: Rethinking progression in mobile puzzle games](https://www.gamedeveloper.com/design/rethinking-progression-in-mobile-puzzle-games)
