# Engagement, law and ethics: what Ageborn may use, and where the lines are (September 2026)

**Not legal advice.** This is a research summary by a non-lawyer, written to help design decisions. Before any launch that involves money, accounts, a mobile app or large-scale marketing to children, have a Danish lawyer who knows consumer and gambling law check the final design.

**Scope.** The owner wants every psychological pull that makes games absorbing: competition, rare collectibles, the joy of random rewards when opening packs, treasure hunting (Pokémon GO), what makes TikTok gripping, and the Clash of Clans / Hay Day feeling of improving for years. This report checks those levers against the rules and guidance that apply, or will soon apply, to a free browser game with no real money, played in Denmark and the EU and probably by minors. It then classifies each lever as healthy, grey or red-line, for v1 (offline, no money) and for later (online 1v1, accounts, portals, a mobile app).

**Builds on, does not repeat:**
- `engagement-benchmarks.md` covers what each benchmark game does and proposes E1-E21. This report gives the legal and ethical footing for those proposals. Where it disagrees, it says so in section 7.
- `meta-collection.md` covers the reveal psychology and the pity maths.
- `market-portals.md` covers the portal rules in detail.

**Method and confidence.** I ran about 30 web searches on 27 September 2026 before the session's shared search budget ran out. The egress proxy blocked all page fetches, so verified claims rest on search-result extracts from official pages (the Commission, Forbrugerombudsmanden, Spillemyndigheden, UNICEF Denmark, PEGI, the Danish ministries) and law-firm summaries. I could not read the full text of any law. Every source carries a tag:
- **[V]** verified by search in this session.
- **[R]** from earlier research in this repo (its sources are listed there).
- **[K]** from background knowledge and not re-verified in this session. Treat these as pointers to check, not as facts.

---

## 0. Key findings

1. **v1 as designed is on the safe side of every binding rule I found.**
   - **Gambling.** Nothing can be bought and nothing can be cashed out, so capsules are not gambling under Danish law. Spillemyndigheden needs a stake of money value, chance, and a prize of money value [DK1 V].
   - **Age ratings.** Capsules are not "paid random items" under PEGI's June 2026 criteria [EU7 V].
   - **Virtual currency.** The CPC virtual-currency principles target currencies bought with real money [EU4 V]. Amber and Dust cannot be bought.
   - **Other law.** No personal data leaves the device, so GDPR exposure is minimal. Our own static site hosts no user content, so it is not a DSA "online platform" [K].
2. **In v1 the real constraint is reputation in Denmark and portal acceptance, not the law.**
   - UNICEF Denmark and Center for Digital Pædagogik (6 May 2026) found that 52% of Danish 11-16-year-olds have bought loot boxes and that 34% feel the urge to buy another right after opening one. They call for an under-18 ban [DK4 V].
   - Forbrugerrådet Tænk reported 17 popular games (Fortnite, Minecraft, Roblox, Pokémon GO, Candy Crush) to the Consumer Ombudsman in September 2024 [DK3 V].
   - Denmark led the Jutland Declaration (10 Oct 2025, 25 member states). It names streaks, "missing out" notifications, infinite scroll, loot boxes and in-game coins as harmful for minors [EU1 V].

   A capsule that *looks* like a CS:GO case will be judged by its look, not by the fact that it is free.
3. **The EU direction for minors has converged on five rules:**
   - (a) no paid random rewards
   - (b) no rewards for logging in regularly and no penalties for stopping
   - (c) streaks, notifications and autoplay off by default
   - (d) real-money value shown for any virtual currency
   - (e) no time pressure or direct appeals to buy

   The sources are the DSA minors guidelines [EU3 V], the EP resolution of 26 Nov 2025 [EU2 V], the Jutland Declaration [EU1 V], PEGI 2026 [EU7 V] and the KIDS Act proposal [EU6 V]. Ageborn already meets (a), (c), (d) and (e). **(b) is where Ageborn is exposed:** the Daily Capsule, the daily quest refresh, the Daily Challenge first-win reward and the 6-hour capsule charges are all calendar-based rewards.
4. **The biggest new item is the EU KIDS Act proposal, COM(2026) 681 of 17 September 2026 [EU6 V].**
   - **Scope.** It covers "online games" broadly: free or paid, and software that runs locally but is distributed online. Only games sold purely on physical media with no online component are excluded. A GitHub Pages game is in scope.
   - **No small-developer exemption,** except from post-market monitoring.
   - **Pre-market evaluation** of risks to minors.
   - **Login rewards.** As reported, it would stop games from rewarding minors for logging in regularly or penalising them for stopping.
   - **Variable rewards and currency.** It targets variable reward systems and loot boxes, and requires minors to see the real money value of virtual-currency and variable-reward transactions.

   It is a proposal. It needs the Parliament and the Council, and I estimate it applies no earlier than 2028 (unsure). **The reports conflict on one point that matters to us.** Some say the adopted text bans exposing minors to loot boxes or similar random-outcome products outright. Another says that for games this is sent to a PEGI-based code of conduct. **I could not determine whether free, earned random rewards are caught.**
5. **The Digital Fairness Act had still not been tabled on 7 September 2026.** The Commission's 2026 work programme lists it for Q4 2026. It is expected to cover dark patterns, addictive design and unfair personalisation for all consumers, with virtual currencies and loot boxes in view [EU5 V].
6. **Belgium and the Netherlands regulate paid or cash-out loot boxes only.**
   - Belgium: the Gaming Act since 2018 [BE1 R/K].
   - Netherlands: the Council of State limited the Dutch gambling route in 2022 [K]. Parliament wants a ban, and the government is pushing for it at EU level through the DFA [NL1 V].

   Earn-only rewards are outside both regimes.
7. **What rating Ageborn would get under PEGI 2026 [EU7 V]:**
   - Daily rewards that bank and never punish = the PEGI 7 category.
   - Paid random items = 16. Time-limited offers = 12. Neither applies to us.

   Our rating would be set by cartoon violence, most likely 7 or 12 (unsure). A web game on our own site needs no PEGI rating. App stores and some portals use one.
8. **Portals and app stores.**
   - Poki bans gambling themes and in-app purchases, requires kid-safe content and allows no chat.
   - CrazyGames caps content at PEGI 12. Its loot-box country restrictions apply only to *monetised* random rewards [P1 R].
   - Apple and Google require odds disclosure only for loot boxes that can be bought [ST1][ST2 K]. We show odds anyway.
9. **The ethics literature names the dark version of every lever the owner asked for:**
   - grinding and "playing by appointment" (temporal)
   - pay-to-skip and monetised rivalries (monetary)
   - social obligation and impersonation (social)
   - nagging, confirmshaming and obstruction (interface)

   The same literature describes a healthy version of each [LIT1-LIT6 K]. The healthy versions satisfy competence, autonomy and relatedness (self-determination theory) and let the player stop cleanly.
10. **"Cannot put it down" is the one part of the brief we should not adopt literally.** It is exactly what the Commission's preliminary DSA finding against TikTok (Feb 2026) [EU8 R], the Jutland Declaration and the KIDS Act target. The design goal should be **"wants to come back, easy to stop"**. The research in `engagement-benchmarks.md` (RES1-RES4) shows this is also what predicts wellbeing.
11. **Five low-cost changes keep today's design fit for the KIDS Act and the DFA** (section 7):
    - (1) make "designed for a 12-year-old" the default for everyone
    - (2) make capsules switchable to a disclosed, predictable cycle behind a platform flag
    - (3) make calendar rewards switchable to play-based rewards behind a flag
    - (4) turn the CS-style Wardrobe reel off by default
    - (5) disclose the scripted starter capsules, and that tapping never changes a capsule's result

---

## 1. What actually binds Ageborn, stage by stage

| Stage | What changes | Rules that start to bite | Must do |
|---|---|---|---|
| **A. v1** (GitHub Pages, offline, no money, no data leaves the device) | Nothing is sold; there are no accounts, no user content, no ads | Almost none are binding. Gambling law is not triggered (no stake). Markedsføringsloven applies to traders (erhvervsdrivende); a free hobby release with no revenue is arguably not a commercial practice (unsure). ePrivacy: storing the save in localStorage is "strictly necessary" and needs no consent [K]. | Keep the CLAUDE.md hard rules. Design for minors anyway (A7.1, A6.4-A6.5 already do most of it) |
| **B. Portal launch** (Poki or CrazyGames; portal SDK ads; revenue share) | Revenue makes the game a commercial practice. The portal is a DSA online platform | UCPD / markedsføringsloven, including § 8 on children [K] and the UCPD guidance that "continuing to use a service" can be a transactional decision [K]. Portal rules. DSA Art. 28(2): no profiling-based ads to minors, which the portal handles [K] | Poki: no reel, no gambling look, no chat. Ads only at natural breaks. Rewarded ads give fixed rewards only |
| **C. Online 1v1, optional accounts, cloud save, leaderboards** | Personal data and contact between players | GDPR, including Art. 8 (Denmark: age 13 for consent to online services [K]). If players can publish content (names, share codes on our server), we may become a hosting service or online platform under the DSA. Micro and small enterprises are exempt from Art. 25 and Art. 28 [EU3 V / K]. UK Children's Code if we target the UK [UK1 K] | Emotes only; pseudonyms built from preset parts; privacy-high defaults; no "last seen"; age assurance only if contact features exist |
| **D. Mobile app** (Capacitor, App Store and Google Play) | Store policies and age-rating questionnaires | Apple Guideline 3.1.1 and the Google Play loot-box odds rule (only for purchasable boxes); Apple age ratings (4+/9+/13+/16+/18+ since 2025 [K]); IARC/PEGI via Google Play; Kids category and Families policy if we target children [ST1][ST2 K] | Answer the questionnaires honestly: no purchases, random rewards earned only, no chat. Do not enter the Kids category unless we accept its ad and analytics bans (we have neither anyway) |
| **E. If the KIDS Act and DFA are adopted** (estimate 2028 or later, unsure) | Binding EU rules for games likely to be played by minors | KIDS Act [EU6 V]: safe defaults, pre-market risk evaluation, no login rewards or absence penalties for minors, variable-reward and virtual-currency rules, age assurance where needed. DFA [EU5 V]: dark patterns and addictive design for all users | The feature flags in section 7 let us switch to the compliant profile with data, not a redesign |

---

## 2. The rules one by one

### 2.1 Denmark

**Spillemyndigheden (Danish Gambling Authority) [DK1 V]**
- **The test.** A loot box is not necessarily gambling, and a game with loot boxes does not necessarily need a licence. A licence is needed when three criteria are met:
  - a stake
  - chance
  - a prize of money value

  Its public statements have been summarised as "buying loot boxes is not gambling" where the content cannot be converted to money [DK1 V, press titles].
- **Skin betting is gambling.** Loot boxes "cannot be ruled out" in some cases, and each case is judged on its own facts.
- **Trends.** The authority reports more and more worried parents. It gives free talks in schools and clubs, and it is part of an international collaboration of about 17 regulators on the gaming-gambling overlap [DK1 V].
- **Transferable items.** Academic work finds loot boxes with transferable content, such as Steam items with a market price, likely illegal in several countries and poorly enforced [DK1b V].

**For Ageborn:**
- Earn-only capsules with no trading, no cash-out and no purchasable currency have no stake and no money-value prize. They are outside Danish gambling law.
- The danger is **transferability**. Any later trading, gifting or marketplace gives items a market value. Third-party skin sites then appear, and the three criteria come into play. Trading is therefore a red line (R14).

**Forbrugerombudsmanden (Consumer Ombudsman) and markedsføringsloven**
- **The CPC principles in Denmark.** The Ombudsman's 21 March 2025 release adopts the CPC principles on virtual currency [DK2 V]:
  - clear price information before purchase
  - no pressure to buy virtual currency
  - respect for the right of withdrawal
  - special care for vulnerable consumers, especially children
- **Rules for children:**
  - it is illegal to encourage children directly to buy virtual items, or to get their parents to buy them
  - companies must avoid pressuring children with time-limited offers
  - the game developer is responsible for influencers disclosing commercial intent
- **Markedsføringsloven § 8 [K].** Marketing aimed at children and young people must respect their natural credulity and lack of experience. The Ombudsman has published guidance on commercial practices towards children [K; year and title not re-verified].
- **Forbrugerrådet Tænk complaint (September 2024) [DK3 V].** It reported 17 games (Fortnite, Minecraft, Roblox, Pokémon GO, Candy Crush and others) for breaching markedsføringsloven, mainly for hiding real prices behind virtual currencies. I found no published outcome (unsure).

**For Ageborn:**
- With nothing sold, there is no price to hide and no purchase to exhort.
- The guidance still sets the tone. Time pressure on children and appeals to children are what Danish enforcers look for.
- If we ever run creator campaigns (D1 Clip Mode marketing), any paid or gifted content must be labelled as advertising, and we are responsible for that.

**Politics and civil society (2025-2026) [DK4-DK6 V]**
- **UNICEF Denmark and Center for Digital Pædagogik (6 May 2026).**
  - 1,785 children aged 11-16 were surveyed. 52% had bought loot boxes, and 34% wanted to buy more right after opening one.
  - Motives: 46% want cool skins, 40% say it is fun, 33% want "the big prize".
  - Recommendation: ban loot-box purchases for under-18s, as gambling is banned.
- **Political agreement on digital child protection (7 Nov 2025).** DKK 160M across 14 initiatives. The headline is a social-media age limit of 15, with parental consent from 13. The bill is expected in early 2027, in force 1 July 2027.
- **Loot boxes in national law.** Version2 reports that loot boxes were left out of a national legislative package on betting ads and influencers. The Danish government has asked the Commission to revise the UCPD and to examine a ban on certain behaviour-influencing designs and loot boxes for children (search extract; exact document not read).
- **Civil society.** 17 organisations have publicly called for a ban on paid "lykkeposer" (grab bags) in games [DK6 V].

**For Ageborn:** the Danish debate is loud, recent and child-focused. The owner is Danish, and Danish players and press will see the game first. Anything that looks like a casino (reels, ticking wheels, slot sounds) is a reputational risk even at zero price.

### 2.2 EU consumer law (in force now)

**UCPD (Unfair Commercial Practices Directive), implemented in Denmark by markedsføringsloven [K]**
- **Blacklist items that matter later:**
  - Annex I No. 7: falsely saying a product is available for a very limited time in order to force a quick decision
  - Annex I No. 28: directly telling children to buy, or to persuade their parents to buy
  - No. 20: calling something "free" when it is not
- **Engagement counts.** The Commission's 2021 UCPD guidance treats data-driven "dark patterns" as possible unfair practices. It notes that a transactional decision can include continuing to use a service. Engagement-maximising design can therefore be a consumer-law problem once the game is commercial, even without a price [K].
- **For Ageborn:** "Free" is literally true, which is a strength. Countdown pressure, "gone forever" claims and guilt copy become legal risks the moment the game earns money through a portal.

**CPC Network Key Principles on in-game virtual currencies (21 March 2025) [EU4 V]**
- **Status and scope.** These are joint guidance from EU consumer authorities, not a new law. Currencies whose main purpose is payment are "digital representations of value", so both buying them and spending them fall under consumer law.
- **Principles:**
  - the real price shown alongside the virtual price
  - no hiding of costs, and no forcing players to buy currency
  - pre-contractual information and the right of withdrawal
  - respect for vulnerabilities, especially of children: no direct exhortation, no time-limited pressure
- **Enforcement.** Action against Star Stable Online was launched the same day: time-limited offers, direct appeals to children, unclear currency information and undisclosed influencers. Star Stable had one month to offer commitments. I did not find the outcome. The Commission held stakeholder talks on applying the principles on 3 June 2025 [EU4 V].
- **For Ageborn:** Amber and Dust are earn-only, so the principles do not apply. Adding one honest line costs nothing and anticipates the KIDS Act's "real monetary value" rule: "Amber can't be bought. It has no money value." (see S12).

### 2.3 Digital Services Act (DSA)

- **Who it binds.** Art. 25 (dark patterns) and Art. 28 (protection of minors) bind *online platforms*. The Art. 28 guidelines of 14 July 2025 apply to platforms that minors can access, except micro and small enterprises [EU3 V].
- **What the guidelines say:**
  - Disable by default the features that drive excessive use: streaks, autoplay, push notifications, read receipts and ephemeral content.
  - Remove persuasive design "aimed predominantly at engagement".
  - Do not expose minors to paid loot boxes or other gambling-like features, or to monetisation that hides real-world value. Show prices in national currency.
  - Commercial content with intermittent or random rewards, scarcity or persuasive design should not be used on minors [EU3 V].
- **TikTok precedent.** On 6 February 2026 the Commission preliminarily found TikTok's infinite scroll, autoplay, push notifications and recommender to be addictive design in breach of the DSA [EU8 R].
- **For Ageborn:**
  - Our own static site is not a platform [K].
  - Poki and CrazyGames are platforms, and their rules pass these expectations on to hosted games.
  - If we later host user content (share codes, profiles, clips) on our own server, we may become a hosting service. As a micro-enterprise we would still be exempt from Art. 25 and Art. 28 [K].
  - The guidelines are the clearest statement of what EU regulators consider harmful for minors. That makes them the right design yardstick even where they do not bind us.

### 2.4 Digital Fairness Act (DFA): status

- **Timeline [EU5 V].** The public consultation closed on 24 October 2025. The Commission's 2026 work programme lists the DFA for Q4 2026. As of 7 September 2026, no proposal had been tabled. Commissioner McGrath is responsible and has said the aim is a draft by the end of the year.
- **Expected content:**
  - dark patterns
  - addictive design
  - influencer marketing
  - unfair personalisation
  - virtual currencies and loot boxes, with minors a special concern
- **Likely shape.** Commentators expect transparency on odds, restrictions for under-18s and safe defaults rather than an EU-wide loot-box ban [EU5 V]. Adoption would come in 2027 at the earliest. Unlike the KIDS Act, the DFA would protect adults too, so "we only protect children" would not be enough.

### 2.5 EU KIDS Act proposal (17 September 2026): the most important new item

What the search extracts say [EU6 V]. **I could not read the text itself, so treat the details as reported, not confirmed.**

- **Name and scope.**
  - The name is "Keeping Internet Digital Spaces Accountable and Trustworthy" Act, COM(2026) 681.
  - It covers social media, video-sharing platforms, **online games**, AI companions and chatbots, app stores and operating systems.
  - An "online game" is any game on a computer, mobile device or console: software run locally or remotely, free, paid or hybrid. Only purely physical-media games with no online component are excluded.
  - **Ageborn on GitHub Pages is in scope.**
- **No size exemption.** Micro and small enterprises are exempt only from post-market monitoring. They still owe protective design, safe default settings and a pre-market evaluation.
- **Games:**
  - avoid designs that lead to excessive, impulsive or unwanted spending
  - make it clear when an economic transaction happens, and show its real-money value, including for virtual currencies and variable reward systems
  - **no login bonuses and no loss of benefits for not playing within a set time, for users under 18** (PocketGamer.biz, reporting the online-games article, said to be Art. 15)
  - safeguards so that games cannot be used to lure minors into contact on other services
  - parental controls
  - "age assurance" for games, reported as a lighter standard than social media (age estimation or other proportionate methods). One source instead says "certified age verification". **The reports conflict.**
- **Loot boxes: the reports conflict.**
  - Servola and others say the adopted text bans exposing minors to loot boxes or similar products with random or unpredictable outcomes.
  - Information Labs says the mechanic is prohibited for social media, but for games it goes to a code-of-conduct process built on the pan-European age-rating frameworks (reported as Art. 17, with PEGI named as a possible benchmark).
  - **Neither extract says clearly whether free, earned random rewards count.** The wording "real monetary value of transactions … through … variable reward systems" suggests the target is paid ones (unsure).
- **Status.** The proposal still needs the European Parliament and the Council. The Parliament already asked for more (section 2.6), so the final text may be stricter.

**For Ageborn:**
- (1) The calendar rewards (Daily Capsule, daily quests, Daily Challenge first win, capsule charges) are the mechanics most exposed. They are rewards for coming back on a schedule, even though they bank.
- (2) If the final text catches free variable rewards for minors, capsules need a non-random or disclosed-cycle mode for players who may be minors, which without age assurance means everyone.
- (3) A pre-market risk evaluation will be a written duty. The classification in section 4 is a head start.

### 2.6 European Parliament resolution on protecting minors online (26 November 2025) [EU2 V]

- Adopted by 483 votes to 92, with 86 abstentions. It is non-binding.
- It asks the Commission to prohibit loot boxes and other randomised paid content in games likely to be accessed by minors.
- It asks the Commission to tackle in-game currencies, micro-transactions, pay-to-progress and pay-to-win where they encourage overspending.
- It supports banning engagement-based recommenders for minors, and disabling by default the most addictive features (infinite scroll, autoplay, pull-to-refresh, "reward loops").

**For Ageborn:** this is the Parliament's negotiating position on the KIDS Act. Expect it to push the text further, and "reward loops" is its own phrase.

### 2.7 Belgium and the Netherlands

- **Belgium.**
  - In 2018 the Gaming Commission concluded that paid loot boxes are games of chance under the Gaming Act 1999 (stake, chance, win or loss) [BE1 K]. Since then they have been illegal without a licence.
  - Enforcement has been weak: Xiao (2023) found paid loot boxes still widespread in top-grossing iPhone games [BE1 R].
  - Free rewards with no stake are outside the law.
  - Belgium (with Estonia) did not sign the Jutland Declaration [EU1 V]. The reason is not in my sources.
- **Netherlands.**
  - In 2018 the Kansspelautoriteit found some loot boxes with tradable prizes illegal and later fined EA over FIFA Ultimate Team packs. The Raad van State overturned that fine on 9 March 2022, finding the packs part of a larger skill game [K].
  - A parliamentary majority (the CDA motion by Bontenbal) wants a ban. The government's route is to urge the Commission to include a ban in the DFA, and the Netherlands has filed a non-paper on the DFA [NL1 V].
  - The Dutch consumer authority ACM co-authored the CPC principles [EU4 V].
- **CrazyGames** restricts *monetised* random rewards for players in Belgium, the Netherlands and some other countries [P1 R].
- **Rewarded ads.** Whether a rewarded ad that grants a *random* reward counts as "monetised" in Belgium or the Netherlands is untested [P1 R].

**For Ageborn:** earn-only capsules are fine in both countries. Never let money, or an ad view, be the key to a random reward.

### 2.8 United Kingdom (for later)

- **Age Appropriate Design Code (Children's Code, in force since 2 Sept 2021) [UK1 K].**
  - It applies to online services likely to be accessed by children that process personal data.
  - Standard 5 (detrimental use of data) warns against features that use personal data to exploit reward-seeking, such as reward loops and streaks.
  - Standard 13 (nudge techniques) bans nudging children towards weaker privacy.
  - Standard 10: geolocation off by default. Standard 12: profiling off by default.
  - v1 processes no personal data, so the code does not bite now. It will once there are accounts.
- **Loot boxes [UK2 K].** They are not gambling under the Gambling Act 2005 unless prizes can be cashed out. In 2022 the government chose industry self-regulation. The Ukie principles (2023) include parental consent for under-18 purchases of paid loot boxes and probability disclosure.
- **Online Safety Act 2023 [K].** It matters only if we add user-to-user features such as chat or user content.
- **Evidence review.** The UK government's review of skins gambling flags near-miss animations and slot-machine resemblance as harmful features [R, market-portals].

### 2.9 PEGI (criteria in force from June 2026) [EU7 V]

| PEGI trigger (2026) | Minimum rating | Ageborn |
|---|---|---|
| Paid random items (loot boxes, card packs, gacha, keys to random rewards bought with money or with currency that money can buy) | 16 | None. Capsules are earned only |
| Time-limited or quantity-limited offers (such as a paid pass with a countdown) | 12, or 7 if spending is off by default with parental opt-in | None. Nothing is offered for sale |
| Daily or login rewards that are neutral or positive | 7 | Daily Capsule, quests, charges: all bank and nothing is lost |
| Players penalised for not returning (lost content, reduced progress) | 12 | None today. E12's 7-day tile expiry would edge towards this (section 7) |
| Social casino | 18 (case by case) | None |

- Existing ratings are not reviewed unless an update warrants it.
- The **simulated gambling** criteria were revised after the Balatro case [R]. Whether a CS-style reel for free cosmetics counts is unclear. I think it probably does not, but it is exactly the kind of imagery the revision looked at (unsure).
- **Our likely rating** is driven by violence: cartoon soldiers fighting and poofing into dust. That is probably PEGI 7 or 12 (unsure). A web game needs no PEGI rating. Google Play gets one through IARC. CrazyGames caps content at PEGI 12.

### 2.10 Portals [P1 R]

- **Poki:**
  - no in-app purchases
  - no gambling
  - kid-safe content and no chat
  - "rewarded videos are an optional extra, never a gate"
  - web-exclusive

  DESIGN already plans a Poki build with the reel disabled (D1).
- **CrazyGames:**
  - content up to PEGI 12
  - in-game purchases by invitation only
  - loot-box restrictions by country for monetised random rewards only
  - rewarded ads recommended with daily caps

### 2.11 App stores (for the Capacitor app) [ST1][ST2 K]

- **Apple:**
  - **Guideline 3.1.1:** apps that sell loot boxes or other mechanisms giving randomised virtual items for purchase must disclose the odds before purchase.
  - **Age ratings:** since the 2025 overhaul the tiers are 4+, 9+, 13+, 16+ and 18+, and the questionnaire covers in-app controls and similar topics.
  - **Kids category:** strict limits on third-party analytics and ads, and parental gates for links and purchases.
- **Google Play:**
  - **Payments policy:** randomised items from a purchase need odds disclosed before, and close to, the purchase.
  - **Families policy:** applies to apps aimed at children. Ad SDKs must be self-certified for families.
  - **Ratings:** IARC.
- **For Ageborn:** neither store's loot-box rule applies to earn-only rewards. Honest answers ("random rewards: earned only, never sold; no chat") keep the rating low.

### 2.12 Outside Europe (only if we go global) [K]

- **United States:**
  - FTC v. Epic Games (2022): about $520M in total, $245M of it in refunds over "dark patterns" in purchase flows.
  - FTC v. HoYoverse (January 2025, Genshin Impact): $20M; no loot-box sales to under-16s without parental consent; clear odds and exchange rates.
  - COPPA rule amendments in 2025.
- **Brazil:** Law 15.211/2025 (ECA Digital) bans loot boxes in games aimed at, or likely used by, children and adolescents, in force from March 2026. I did not verify whether it covers free rewards.
- **Australia:** since 22 Sept 2024, games with paid loot boxes are rated at least M, and simulated gambling is rated R18+.
- **Odds disclosure:** mandatory in South Korea (since March 2024) and China. Japan has banned "kompu gacha" since 2012.

None of these regimes is aimed at earn-only rewards, as far as I know.

### 2.13 Privacy and AI labelling

- **GDPR [K].** Denmark set the age of consent for online services at 13 (databeskyttelsesloven § 6). v1 sends nothing off the device: the event log "never leaves the device" (A8). Keep it that way.
- **ePrivacy [K].** Keeping the save in localStorage is strictly necessary for the service and needs no consent. Analytics or telemetry later would need consent.
- **AI Act Art. 50 [K].** Systems that interact with people must disclose that they are AI, from 2 August 2026. A hand-written utility AI is probably not an "AI system" under the Commission's definition guidelines (unsure). Ageborn labels bots on every surface anyway (A7.1), which goes beyond Art. 50 whether or not it applies.

---

## 3. What the ethical design literature says

**Dark-pattern taxonomies that map onto the owner's list:**

- **Zagal, Björk and Lewis, "Dark Patterns in the Design of Games" (FDG 2013) [LIT1 K].**
  - Temporal: grinding, playing by appointment.
  - Monetary: pay to skip, pre-delivered content, monetised rivalries.
  - Social-capital: social pyramid schemes, impersonation.

  **The Hay Day / Clash of Clans "come back when the timer ends" loop is their example of playing by appointment.** It becomes dark when timers exist to sell skips or when missing an appointment costs something.
- **Gray et al., "The Dark (Patterns) Side of UX Design" (CHI 2018) [LIT2 K]:** nagging, obstruction, sneaking, interface interference, forced action. Confirmshaming and "roach motel" quitting belong here.
- **Petrovskaya and Zendle (2022), "Predatory Monetisation?" (Journal of Business Ethics) [LIT3 K]:** 35 unfair, misleading or aggressive monetisation techniques, from the player's view. Almost all need money. Without money, the remaining risk is in time and attention.
- **King, Delfabbro et al. (2019), "Unfair play? Video games as exploitative monetized services" [LIT4 K].** Industry patents for engagement-optimised matchmaking and for tuning offers to player data. This is the reason Ageborn's MMR must stay fairness-only (G2).
- **Karlsen (2019), "Exploited or engaged?" [LIT5 K]:** dark patterns in clicker, farming and casual games, the direct ancestors of Hay Day's loops.

**Evidence on random rewards:**
- Zendle and Cairns (2018) and later meta-analyses find a consistent link between loot-box *spending* and problem gambling [LIT6 K]. Drummond and Sauer (2018) judged loot boxes psychologically akin to gambling [LIT6 K].
- Larche et al. (2019) measured arousal rising during the pre-reveal shake [R, meta-collection]. The same pleasure works without money. The harm literature concerns paying and chasing.
- The UNICEF DK "34% urge to buy another" figure [DK4 V] shows that the chasing impulse exists in Danish children.
- In Ageborn the impulse is harmless only because the next capsule cannot be bought. Capsules must never be purchasable, and the sequence should never invite "just one more" without a natural stop (S5).

**Evidence on engagement and wellbeing** (already in `engagement-benchmarks.md`):
- Hours played do not predict harm. The feeling of "having to" does (RES1-RES3).
- Streak obligations drive problematic use in early adolescents (RES4).

**Positive frameworks to design towards [LIT7-LIT9 K]:**
- **Self-determination theory in games** (Ryan, Rigby and Przybylski 2006; PENS). Durable fun comes from competence, autonomy and relatedness, not from compulsion loops. Ageborn's pillars (a decision every 5-10 s, mastery, honest bots) are competence-and-autonomy design.
- **UNICEF and the LEGO Group, RITEC (Responsible Innovation in Technology for Children), 2024.** Eight wellbeing outcomes for children's digital play: competence, emotional regulation, empowerment, social connection, creativity, identity, safety and security, self-actualisation. It is a useful checklist for the KIDS Act's pre-market evaluation.
- **Designing for Children's Rights Guide** (Danish-founded) and **5Rights, "Disrupted Childhood" (2018)** on persuasive design.
- **"Ethical Games" guidelines:** I could not verify a single canonical document by that name in this session. The frameworks above are the established ones. If the owner means a specific initiative, it should be checked by name.

**Synthesis: the healthy test for each lever (extends T1-T5 in `engagement-benchmarks.md`):**
- (1) Would it still work if the player could see exactly how it works?
- (2) Does stopping cost nothing?
- (3) Would we be comfortable describing it to a Danish parent, a journalist, or the Consumer Ombudsman?
- (4) Does the fun come from competence, discovery or self-expression, rather than from fear of missing out or from a variable-ratio schedule alone?

---

## 4. The mechanics table

**Class:** **H** healthy; **G** grey (allowed only with the guardrail); **R** red line.

**Risk:** Low / Med / High is my judgement of combined legal, portal and reputational risk.

**"Later"** means online 1v1, accounts, portals or a mobile app, and assumes the KIDS Act as reported.

DESIGN and E-numbers refer to `docs/DESIGN.md` and `engagement-benchmarks.md`.

### 4.1 Competition

| # | Mechanic | Class | Now: v1 offline, no money | Later | Guardrail / verdict |
|---|---|---|---|---|---|
| C1 | AI ladder: trophies, arenas, Trophy Road, labelled AI Generals (A6.3, A7.1) | H | Legal. Low | Legal. Low. The labels meet AI Act Art. 50 if it applies | Keep the labels on every surface |
| C2 | Hidden MMR aiming at about a 60% win rate; +10 mistake points for new players (A6.8) | G | Legal; disclosed in help text. Low | Low if disclosed and aimed at fairness. **High** if ever tuned on session length or return rate (engagement-optimised matchmaking, [LIT4]) | Disclose on the bot card and in help. Tune only on win rate. Record this constraint in `decisions.md` |
| C3 | Loss protection, "Warm-up match" label (A6.3) | H | Low | Low | Keep. It is honest because it is labelled |
| C4 | Online ranked PvP (D1) | H | n/a | Low with emotes only. Med with text chat (DSA, Online Safety Act, KIDS Act contact rules) | Emotes only; no text chat |
| C5 | Public leaderboards with real players | G | n/a | Med: minors' names on show, bullying, KIDS Act visibility defaults | Pseudonyms built from preset parts or filtered; boards by tier; opt out of listing; no "last seen" |
| C6 | Seasonal trophy reset (E8) | G | Low | Low-Med | Only the season counter resets, on a date shown from day 1. Permanent trophies and arena untouched. Unclaimed rewards delivered automatically |
| C7 | Rank decay for inactivity | R | Not in design | PEGI 12 "punishes not returning". KIDS Act "penalise for stopping". High | Never |
| C8 | Bots shown as humans; fake "players online"; AI leagues with an undisclosed pace | R | Misleading under the UCPD once commercial; breaks the CLAUDE.md rule | High | Never. E18 only with the AI label and a published fixed pace |
| C9 | Tournaments with entry fees or money-value prizes | R | Gambling or prize-competition law [K] | High | Never. Free entry and cosmetic prizes only |

### 4.2 Collecting rare items

| # | Mechanic | Class | Now | Later | Guardrail / verdict |
|---|---|---|---|---|---|
| K1 | Collection with rarities, foils, Codex level (A6.6-A6.7) | H | Low | Low | Keep |
| K2 | Dust crafting of any card or crate skin (A6.6) | H | Low | Low, and a mitigation for the others | **The key defence.** Randomness speeds things up but is never the only way in. Every item has a known, deterministic path |
| K3 | Collectibles that are gone for good if missed | R | FOMO; UCPD No. 7 if the claim is false | KIDS Act "loss of benefits for not playing within a certain time". High | Never. Everything returns or can be crafted |
| K4 | Recurring limited-window cosmetics (Age Festival E11, seasons E8, guest Generals E9) | G | Low | Med | Every window recurs on a published calendar; cosmetic only; crafting fallback after the window |
| K5 | Set completion / museum (E13) | H | Low | Low | Crafting path for every piece; no trade-only or window-only pieces |
| K6 | Trading, gifting or a marketplace between players | R | Not in design | Gives items a market value → Spillemyndigheden's criteria, skin-betting sites, scams. High | Never. Items are bound to the save |

### 4.3 Random rewards and pack opening

| # | Mechanic | Class | Now | Later | Guardrail / verdict |
|---|---|---|---|---|---|
| P1 | Earn-only Time Capsules: pre-rolled, 100-slot bag with exact counts, odds and pity always shown (A6.4-A6.5) | G (H in v1) | Not gambling in DK (no stake). Not PEGI "paid random items". Outside the CPC principles. Low | **Med.** The KIDS Act may restrict variable rewards for minors, and the reports disagree on whether earned ones count. The DSA guidelines use "random rewards" language | Keep. Add the disclosed-cycle fallback flag (section 7, P-1) so that a minors or EU profile can switch without a redesign |
| P2 | Capsules, keys, charges or currency sold for money, or for anything money can buy | R | Banned by CLAUDE.md | Gambling in BE, possibly NL. PEGI 16. Store odds rules. KIDS Act and Brazil bans. High | Never |
| P3 | Rewarded ad that grants a random reward | R | No ads in v1 | Untested in BE/NL; probably "monetised" for CrazyGames; PEGI treatment unclear. High | Never. Rewarded ads, if ever used, give fixed rewards only |
| P4 | Hammer-strike climb: tap to reveal a pre-rolled tier (A10 step 3) | G | Low | Low-Med: "illusion of control" is a recognised gambling design feature | Keep, but say it plainly on the odds panel and the first capsule: "The result was decided when you earned it. Tapping only reveals it." |
| P5 | CS-style Wardrobe reel: 50 tiles, ticking, deceleration (A10.1, default on) | G, R for a kids audience | Legal. Poki rejects it. Reputational risk in the Danish debate. Med | Med-High: PEGI simulated-gambling judgement unclear; Jutland Declaration and UNICEF DK language | **Default off everywhere** (section 7, P-4). Card flip as the standard. At most an opt-in cosmetic setting on non-Poki builds, and not in a minors profile |
| P6 | Near misses, fake odds, rigged filler tiles | R | Already forbidden (A10, A10.1) | High | Keep forbidden; test it (WP12) |
| P7 | Honest rarity pre-signal, walkouts, skip after first view (A10) | H | Low | Low | Keep |
| P8 | Scripted starter capsules 1-5, including a Legendary at about 35-40 min (A6.5) | G | Pillar 4 risk if undisclosed: a new player over-reads their luck. Low | Low | Disclose: "Starter capsules 1-5 have set contents" on the odds panel |
| P9 | "Open all", skip, summary grid (A10) | H | Low | Low | Keep. It shortens the loop and supports stopping |

### 4.4 Daily and return rewards (the most exposed area)

| # | Mechanic | Class | Now | Later | Guardrail / verdict |
|---|---|---|---|---|---|
| D1 | Daily Capsule, 1 per day, banks 3 (A6.3) | G | PEGI 7 category ("rewards return", never punishes). Low | **Med-High:** the KIDS Act as reported bars rewarding minors for "logging in regularly" | Keep the bank. Add the play-based fallback flag (section 7, P-2), for example "1 Supply Capsule per 3 matches, up to 1 per day" |
| D2 | Daily quests, 3 per day, bank 6 (A6.7) | G | Low | Med (a calendar refresh, but play-based tasks) | Keep the bank; show "Nothing expires" (E19) |
| D3 | Daily Challenge first-win Age Capsule (A9.1); a missed day is not banked | G | Low | Med | Make the last 7 days' challenges playable, each paying once, so a missed day is not lost. Ideally a full archive, since the modifier is date-seeded |
| D4 | Capsule charges, +1 every 6 h, bank 12 (A6.3) | G | Mild "playing by appointment" [LIT1]. Low | Low-Med | Keep a bank of 3 days or more. Clay meter pips keep losses and play rewarding |
| D5 | Streak counters that reset, flame icons, "don't lose your streak" | R | Not in design | DSA guidelines: off by default; KIDS Act; Jutland Declaration. High | Never |
| D6 | Non-consecutive stamp card (E2) | G | Low | Med (calendar-based) | Frame as play milestones: "stamp on your first win of a play day". No penalty, no reset copy |
| D7 | Welcome-back bonus after 3+ days away (E3) | H | Low | Low (it rewards return after absence, not regularity) | In-game only; never pushed by email or notification |
| D8 | Expiring rewards, decaying banks, "claim within 24 h" | R | Not in design | PEGI 12; KIDS Act. High | Never |

### 4.5 Treasure hunting

| # | Mechanic | Class | Now | Later | Guardrail / verdict |
|---|---|---|---|---|---|
| T1 | Date-seeded Rift Expedition, one tile per finished match (E12) | H (G as proposed) | Low | Med if tiles expire | **Change E12's 7-day tile expiry to an archive**: old maps stay diggable. A finite daily map is a good natural stop |
| T2 | Time-of-day relic windows, 4 × 6 h (E12) | G | Low | Med: late-night windows reward children for playing at night | Every window's pool must also be available in daytime windows, or nothing exclusive may sit in 22:00-06:00. Pair with the night note (E20) |
| T3 | Real-world location, GPS, region exclusives | R | Not possible offline | GDPR for minors' location; Children's Code std 10; physical safety. High | Never |
| T4 | Secrets and hidden cosmetic unlocks (E14) | H | Low | Low | Hint list after 60 days, so no one is locked out |
| T5 | Relic Compass pity (E12) | H | Low | Low | Keep; show the counter |

### 4.6 TikTok-style pull

| # | Mechanic | Class | Now | Later | Guardrail / verdict |
|---|---|---|---|---|---|
| V1 | Instant start in 3 s or less, no menus before the first win (A8) | H | Low | Low | Keep |
| V2 | One-tap "Next battle", no countdown (A9) | H | Low | Low | Keep. **Auto-queue or autoplay into the next match = R** (DSA TikTok finding) |
| V3 | Session wrap, optional play-time reminder, night note (E1, E20) | H | Low | Low, and it is the remedy regulators ask for | Put E1 and E19 into v1 if possible |
| V4 | Push or browser notifications, email or badge nags | R | None in v1 | DSA guidelines: off by default for minors; KIDS Act; Jutland Declaration. High | Never register push, including after PWA install (D1 v1.2) or in the Capacitor app |
| V5 | Personalisation tuned for time-on-app or return rate | R | None | High | Never. Adaptation is for fairness and learning only, and disclosed |
| V6 | Clip export, share codes, "Who wins?" sandbox (E4, E5, E15) | H | Low | Low | Export only. Creator campaigns labelled as ads |
| V7 | In-game social feed, likes, follower counts | R for minors | None | DSA and KIDS Act platform duties; Poki forbids chat. High | Never in-game. Sharing happens outside the game |
| V8 | Rewards for watching, liking, inviting or referring | R | None | The Commission forced TikTok Lite Rewards out of the EU [R]. High | Never |

### 4.7 "Improve for years" (Clash of Clans / Hay Day)

| # | Mechanic | Class | Now | Later | Guardrail / verdict |
|---|---|---|---|---|---|
| Y1 | Card upgrades with a permanent L10 cap (A6.6) | H | Low | Low | Keep the cap. Never raise it, which would devalue progress |
| Y2 | Mastery ladders (Chrono Heat E7), Conquest, campaign, new ages every year (D1) | H | Low | Low | Keep. This is the cheapest healthy "forever" content |
| Y3 | Long real-time build timers (Clash of Clans builders) | G | Not in design | Low-Med | Avoid. If ever used, they are pacing only, with no skips for sale |
| Y4 | Paid skips, speed-ups, pay-to-win | R | Banned by CLAUDE.md | High | Never |
| Y5 | Clans with contribution quotas, public "last seen", shaming | R | None | DSA guidelines; RES4 social-obligation evidence. High | Never. If groups come, they are casual and emote-only, with no quotas |

### 4.8 Money, data and copy

| # | Mechanic | Class | Now | Later | Guardrail / verdict |
|---|---|---|---|---|---|
| M1 | Earn-only Amber and Dust | H | Outside the CPC principles. Low | Low if a line states "cannot be bought, no money value" | Add that line (section 7, P-6) |
| M2 | Real-money store, IAP, passes, subscriptions | R | Banned by CLAUDE.md | High | Never (owner decision) |
| M3 | Portal ads (not in v1) | G | n/a | Med | Natural breaks only; never personalised for minors; rewarded ads optional and fixed-reward; never gate progress |
| M4 | Local event log that never leaves the device (A8) | H | Low | n/a | Keep local |
| M5 | Analytics or telemetry, accounts, cloud save | G | n/a | Med: GDPR (Art. 8, DK age 13); ePrivacy consent; KIDS Act defaults | Opt-in; minimal data; privacy-high defaults |
| M6 | Guilt or confirmshaming copy, loss framing, fake countdowns, quit friction | R | None planned | UCPD once commercial; DSA Art. 25 for platforms; DFA target. High | Never. Quitting is always one tap. Copy review in the Phase 3 bug bash |
| M7 | "Nothing expires" copy under every bank (E19) | H | Low | Low | Add to v1 strings |

---

## 5. Red lines (never, in v1 or later)

Each line cites the rule or evidence behind it.

1. **Selling anything, or letting money reach randomness.** This covers real money, currency that money can buy, keys, passes, and ad views that grant random rewards. [CLAUDE.md; BE gambling; PEGI 16; Apple 3.1.1, Google Play; KIDS Act; EP resolution; Brazil]
2. **Trading, gifting or marketplaces that give items a value outside the save.** [Spillemyndigheden's three criteria; skin betting; DK1b]
3. **Penalties for absence.**
   - streaks that reset
   - inactivity decay
   - expiring rewards
   - decaying banks
   - collectibles gone for good
   - "come back or lose it" copy

   [PEGI 12; KIDS Act; DSA guidelines; Jutland Declaration]
4. **Push notifications, browser notifications, emails or badge nags to bring players back,** including after PWA install and in the mobile app. [DSA guidelines; EU8; KIDS Act]
5. **Autoplay or auto-queue into the next match; any endless chain with no end state.** [EU8; EP resolution]
6. **Engagement-optimised personalisation** of difficulty, odds, rewards or content. [LIT4; EP resolution; DSA guidelines]
7. **Near misses, fake odds, staged rarity teases, slot-machine or roulette framing.** [UK skins review; meta-collection; A10]
8. **Bots or AI presented as people; fake social proof; undisclosed AI-league pacing.** [CLAUDE.md; A7.1; UCPD; AI Act Art. 50]
9. **Rewards for passive or social-graph actions:** watching, liking, inviting, referrals. [TikTok Lite precedent R]
10. **Real-world location data, or real-region exclusives.** [GDPR; Children's Code std 10]
11. **Text chat, friend-of-friend contact, or anything that lets strangers reach a child.** [Poki; KIDS Act contact safeguards; Online Safety Act]
12. **Social obligation mechanics:** contribution quotas, public "last seen", "your team needs you". [RES4; DSA guidelines]
13. **Time pressure and appeals aimed at children:** countdown offers, "ask your parents", limited-time "deals". These stay forbidden even for free items, because the habit is the harm. [CPC principles; UCPD Annex I No. 7 and No. 28; Star Stable]
14. **Guilt copy, confirmshaming, obstruction when quitting or skipping.** [LIT2; DSA Art. 25; DFA]
15. **Tournaments with entry fees or prizes of money value.** [gambling and prize-competition law K]

---

## 6. Safe practices (keep or add)

- **S1. Design for a 12-year-old by default.** We cannot know ages without accounts. Designing the whole game for minors avoids age-assurance duties for gated features. It also means the KIDS Act's "minor" rules are already met.
- **S2. Earn-only, pre-rolled, bag-based capsules with exact odds, visible pity and a Dust crafting path for everything.** This exists in A6.4-A6.6 and is the strongest honest version of pack opening I know of.
- **S3. Bank everything.** Charges, the Daily Capsule and quests already bank. Extend this to the Daily Challenge (7-day window or archive) and to expedition maps (archive, not expiry). Put the "Nothing expires" line under every bank.
- **S4. Every limited window recurs on a published calendar.** Cosmetics only; a crafting fallback after the window.
- **S5. Natural stopping points:**
  - a finite daily expedition map
  - a session wrap after every third match or when the capsule tray is empty
  - an optional play-time reminder and a night note
  - no auto-queue
- **S6. Labels and disclosures on screen, not only in Settings:**
  - AI chip and "same rules as you"
  - "difficulty adapts to your results"
  - "Warm-up match"
  - "Starter capsules have set contents"
  - "Tapping only reveals the result"
  - "Amber can't be bought"
- **S7. Card-flip reveal as the default.** Anticipation comes from honest pre-signals: shake, glow, rarity-coloured backs, walkouts. No reels, wheels or slot sounds.
- **S8. Competition that is fair and kind:**
  - identical rules for bots
  - level caps in PvP (A6.8)
  - emotes only
  - pseudonymous, tiered boards
  - no inactivity decay
- **S9. Mastery and discovery as the long-term engine:**
  - Heat levels
  - Conquest
  - Records and achievements
  - secrets
  - new ages and cards every year
  - museum sets with crafting fallback

  This is how "improve for years" works without compulsion.
- **S10. No personal data off the device in v1.** Any later telemetry is opt-in and minimal.
- **S11. A written pre-market risk note before each public release,** using sections 4-5 as the checklist and the RITEC wellbeing outcomes as the lens. The KIDS Act will likely require this, and it is cheap to start now (for example in `docs/decisions.md`).
- **S12. Honest copy review in Phase 3 (C5).** Scan every string for guilt, urgency, loss framing and "free" claims.

---

## 7. Proposed changes for the orchestrator (not filed; this report may only touch its own file)

| ID | Change | Why | Owner (DESIGN Part C) | Size |
|---|---|---|---|---|
| P-1 | Add `platform.features.capsuleMode: 'random' \| 'disclosedCycle'`. In `disclosedCycle` the save's bag order and card picks are generated as now, and the next 10 capsules' tiers are shown ahead ("Next: Bronze, Silver, Clay…"). The rolls are the same, but they are visible before they are earned. | Makes a compliant mode possible if the KIDS Act catches free variable rewards for minors, with no economy change | WP0 contract request (`features` is frozen in B15), WP7, WP10 | S-M |
| P-2 | Add `platform.features.calendarRewards: 'daily' \| 'playBased'`. In `playBased`, the Daily Capsule becomes "1 Supply Capsule per 3 finished matches, at most 1 per 24 h, banks 3". Quests refresh on play. | The KIDS Act, as reported, targets login rewards for minors | WP0, WP7, WP9 | S |
| P-3 | Make the last 7 days of Daily Challenges playable, one reward each | Removes the only unbanked daily reward (A9.1) | WP7, WP9 | S |
| P-4 | Set `reelReveal` default to **false** in `NonePlatform` (A10.1, B11). Keep the reel code as an opt-in setting on non-Poki builds, or cut it (it is already first in the D2 cut order). | Gambling look; Poki; the Danish debate; PEGI simulated-gambling uncertainty | WP11, WP10 | XS |
| P-5 | Odds panel strings: "Starter capsules 1-5 have set contents" and "Your capsule's result was decided when you earned it; tapping only reveals it" | Pillar 4; illusion-of-control guardrail | WP10 strings, WP1 | XS |
| P-6 | One line on the Amber and Dust info panels: "Amber can't be bought. It has no money value." | Anticipates the KIDS Act and CPC "real monetary value" rule; costs nothing | WP9 strings | XS |
| P-7 | In `engagement-benchmarks.md` E12: replace the 7-day tile carry-over with an archive of past maps, and make night windows non-exclusive | PEGI 12 "punishes non-return"; KIDS Act; children and night play | Research note / design lead | XS |
| P-8 | Add E1 (session wrap) and E19 ("Nothing expires") to v1 | They are the remedies regulators ask for; strings plus a small component | WP9 | S |
| P-9 | Record in `decisions.md`: "MMR and bot tuning may target fairness (win rate) only; never session length, return rate or retention" | Prevents drift into engagement-optimised matchmaking | Design lead | XS |

---

## 8. Where I am unsure (verify before relying on it)

1. **The KIDS Act text.**
   - Whether its loot-box and variable-reward rule for games covers *free, earned* random rewards.
   - Whether it bans them for minors directly or leaves games to a PEGI-based code of conduct.
   - The exact article numbers (reported as 14, 15 and 17).
   - Whether games need certified age verification or lighter age assurance.

   Read COM(2026) 681 and the Commission's "KIDS Act explained" FAQ directly.
2. **The KIDS Act's likely application date.** My estimate of 2028 or later is a guess based on the usual legislative pace.
3. **The DFA's content.** It had not been tabled on 7 September 2026, and all descriptions are expectations.
4. **The Forbrugerrådet Tænk complaint (September 2024) and the Star Stable CPC action (March 2025).** I found no outcome for either.
5. **Whether a free hobby release is a "commercial practice"** under markedsføringsloven before any revenue exists. I assume not, but a portal revenue share clearly changes that.
6. **PEGI treatment of a CS-style reel for free cosmetics** under the revised simulated-gambling criteria, and Ageborn's likely violence rating (7 or 12).
7. **Items tagged [K].** These are from background knowledge and were not re-checked in this session, because the search budget ran out and page fetches were blocked:
   - the UK Children's Code standards and Ukie principles
   - Apple's and Google's current guideline wording and the Apple age tiers
   - Brazil's ECA Digital scope
   - the Dutch Raad van State date
   - the Danish GDPR age of 13
   - AI Act Art. 50 timing
   - markedsføringsloven § 8 wording
   - the literature citations
8. **"Ethical Games" guidelines.** I could not identify a single canonical document by that name. Section 3 lists the established frameworks instead.

---

## Sources

Tags: [V] verified by search on 27 Sept 2026 (search-result extracts; full pages could not be opened). [R] from earlier repo research. [K] background knowledge, not re-verified.

**Denmark**
- [DK1] Spillemyndigheden [V]:
  - "Skin betting and loot boxes - Video gaming or gambling?": https://www.spillemyndigheden.dk/en/skin-betting-and-loot-boxes-video-gaming-or-gambling
  - "Skinbetting and lootboxes": https://spillemyndigheden.dk/en-us/public-and-players/gaming-or-gambling/skinbetting-and-lootboxes
  - "Statement about loot boxes / loot crates": https://spillemyndigheden.master.re-cph.dk/en/news/statement-about-loot-boxes-loot-crates
  - "Part of international collaboration on video gaming and gambling": https://www.spillemyndigheden.dk/en/news/danish-gambling-authority-part-international-collaboration-video-gaming-and-gambling
  - Free talks: https://www.spillemyndigheden.dk/nyheder/gratis-tilbud-oplaeg-om-skinbetting-og-lootboxes
  - Press: Pixel.tv, "Lootboxes er IKKE gambling": https://www.pixel.tv/nyhed/lootboxes-er-ikke-gambling/ ; BetXpert: https://www.betxpert.com/artikel/spillemyndigheden-koeb-af-loot-boxes-er-ikke-gambling
- [DK1b] "Illegal video game loot boxes with transferable content on Steam: a longitudinal study on their presence and non-compliance with and non-enforcement of gambling law", International Gambling Studies (2024): https://www.tandfonline.com/doi/full/10.1080/14459795.2024.2390827 [V, title and abstract extract only]
- [DK2] Forbrugerombudsmanden, "Europæiske forbrugermyndigheder griber ind overfor computerspils virtuelle penge og værdier" (21 Mar 2025): https://forbrugerombudsmanden.dk/nyheder/forbrugerombudsmanden/pressemeddelelser/2025/20250321-europaeiske-forbrugermyndigheder-griber-ind-overfor-computerspils-virtuelle-penge-og-vaerdier [V]
- [DK3] Forbrugerrådet Tænk complaint (Sept 2024) [V]:
  - Tænk: https://taenk.dk/forbrugerliv/elektronik-og-digitale-tjenester/anmeldelse-spil-manipulation-virtuel-valuta-boern
  - DR: https://www.dr.dk/nyheder/indland/fortnite-roblox-og-candy-crush-er-blandt-17-spil-som-anmeldes-manipulere-spillere
  - TV 2: https://nyheder.tv2.dk/samfund/2024-09-11-fortnite-og-16-andre-spil-anmeldt-for-manipulerende-design
- [DK4] UNICEF Danmark and Center for Digital Pædagogik (6 May 2026) [V]:
  - News: https://www.unicef.dk/nyheder/ny-rapport-om-spilplatforme-boern-navigerer-mellem-venskaber-ubehageligt-indhold-og-gamblinglignende-mekanismer/
  - Report: https://www.unicef.dk/wp-content/uploads/2026/05/faellesskaber-digitale-koeb-og-influencerreklame-i-boern-og-unges-gamingliv.pdf
  - Kristeligt Dagblad: https://www.kristeligt-dagblad.dk/danmark/unicef-vil-have-forbud-mod-boerns-gambling-i-computerspil
- [DK5] Digitaliseringsministeriet, political agreement on digital child protection (7 Nov 2025) [V]:
  - Announcement: https://www.digmin.dk/digitalisering/nyheder/nyhedsarkiv/2025/nov/ny-politisk-aftale
  - Agreement text: https://www.digmin.dk/Media/638981156766342129/Aftaletekst%20om%20digital%20brnebeskyttelse.pdf
  - UFM, "Nu kommer aldersgrænse" (Sept 2026): https://ufm.dk/aktuelt/pressemeddelelser/2026/september/nu-kommer-aldersgraense-regering-og-aftalepartier-saetter-haardt-ind-mod-sociale-medier/
- [DK6] Debate and parliament [V]:
  - Version2, "Børn møder gambling hver dag i spil: Ny lovpakke ignorerer det": https://www.version2.dk/artikel/boern-moeder-gambling-hver-dag-i-spil-ny-lovpakke-ignorerer-det
  - Altinget, "17 aktører i opråb": https://www.altinget.dk/digital/artikel/17-aktoerer-i-opraab-boern-og-unges-fristes-fra-gaming-til-gambling-af-lykkeposer-forbyd-dem
  - Folketinget, B 120 (2022-23), answer to question 13 on loot boxes: https://www.ft.dk/samling/20222/beslutningsforslag/b120/spm/13/svar/1968354/2729050/index.htm

**EU**
- [EU1] Jutland Declaration (10 Oct 2025) [V]:
  - Text: https://www.digmin.dk/Media/638956829775203140/DIGMIN_The%20Jutland%20Declaration%20Shaping%20a%20Safe%20Online%20World%20for%20Minors%20101025.pdf
  - Danish Presidency: https://danish-presidency.consilium.europa.eu/en/news/eu-ministers-united-minors-must-be-protected-better-online/
  - The Next Web: https://thenextweb.com/news/estonia-eu-child-social-media-ban-opposition
- [EU2] European Parliament resolution on the protection of minors online (26 Nov 2025) [V]:
  - Press release: https://www.europarl.europa.eu/news/en/press-room/20251013IPR30892/new-eu-measures-needed-to-make-online-services-safer-for-minors
  - Report A10-0213/2025: https://www.europarl.europa.eu/doceo/document/A-10-2025-0213_EN.html
  - Digital Policy Alert: https://digitalpolicyalert.org/event/35723-european-parliament-adopted-resolution-on-protection-of-minors-online-20252060ini
  - PC Gamer: https://www.pcgamer.com/hardware/eu-meps-agree-on-recommendation-for-europe-to-make-full-use-of-its-powers-to-ban-loot-boxes-for-minors-and-social-media-for-those-under-16/
- [EU3] Commission guidelines on the protection of minors under DSA Art. 28 (14 Jul 2025) [V]:
  - Commission: https://digital-strategy.ec.europa.eu/en/library/commission-publishes-guidelines-protection-minors
  - Hunton: https://www.hunton.com/privacy-and-cybersecurity-law-blog/european-commission-issues-guidelines-on-the-protection-of-minors
  - Eurochild briefing: https://eurochild.org/uploads/2025/11/The-DSA-Guidelines-for-the-protection-of-minors-online.pdf
  - Freshfields: https://technologyquotient.freshfields.com/post/102kv4s/dsa-decoded-6-the-european-commission-finalises-guidelines-on-the-protection-of
- [EU4] CPC Network Key Principles on in-game virtual currencies (21 Mar 2025) and the Star Stable action [V]:
  - Commission stakeholder talks (3 Jun 2025): https://commission.europa.eu/news-and-media/news/european-commission-hosts-stakeholders-talks-application-cpc-networks-key-principles-games-virtual-2025-06-03_en
  - Reed Smith Q&A: https://www.reedsmith.com/articles/qas-on-the-eu-consumer-protection-authorities-joint-guidance-paper/
  - Linklaters: https://techinsights.linklaters.com/post/102k6t4/game-changer-eu-introduces-consumer-protection-guidance-for-in-game-virtual-curr
  - Euronews: https://www.euronews.com/next/2025/03/21/european-commission-targets-in-game-currency-in-childrens-video-games
  - ACM: https://www.acm.nl/en/publications/acm-and-european-consumer-authorities-use-game-virtual-currencies-must-be-clearer-order-protect-consumers
  - Medianama on Star Stable: https://www.medianama.com/2025/03/223-star-stables-kids-targeted-in-game-purchase-and-loot-box-regulations-explained/
- [EU5] Digital Fairness Act status [V]:
  - EP Legislative Train: https://www.europarl.europa.eu/legislative-train/theme-protecting-our-democracy-upholding-our-values/file-digital-fairness-act
  - Chambers, what the consultation tells the games industry: https://chambers.com/articles/digital-fairness-act-what-the-public-consultation-tells-the-video-game-industry
  - IAPP, McGrath on the DFA: https://iapp.org/news/a/european-commissioner-mcgrath-discusses-digital-simplification-upcoming-digital-fairness-act-proposal
  - Tracker: https://digitalfairnessact.com/
  - Freshfields game-developer guide (REG3 in engagement-benchmarks)
- [EU6] EU KIDS Act proposal, COM(2026) 681 (17 Sept 2026) [V, secondary extracts only]:
  - Commission news: https://commission.europa.eu/news-and-media/news/eu-kids-act-helping-children-navigate-safer-online-world-2026-09-17_en
  - Commission FAQ: https://digital-strategy.ec.europa.eu/en/faqs/kids-act-explained
  - EUR-Lex: https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A52026PC0681
  - CMS: https://cms.law/en/int/legal-updates/the-eu-kids-act-new-rules-for-children-s-use-of-social-media-gaming-and-ai-services
  - Freshfields: https://www.freshfields.com/en/our-thinking/blogs/technology-quotient/the-eu-kids-act-europe-moves-online-child-safety-beyond-social-media-bans-102o1ld
  - Bird & Bird: https://www.twobirds.com/en/insights/2026/the-eu-kids-act-a-new-generation-of-rules-for-child-online-safety
  - William Fry: https://www.williamfry.com/knowledge/eu-kids-act-grown-up-rules-for-online-providers/
  - PocketGamer.biz: https://www.pocketgamer.biz/daily-log-in-bonuses-and-activity-streaks-under-threat-in-eu-kids-act/
  - Massively OP: https://massivelyop.com/2026/09/22/european-unions-kids-act-wants-more-age-verification-and-less-login-bonuses-for-online-games/
  - Servola: https://servola.de/journal/loot-boxes-for-minors-are-now-illegal-in-the-eus-own-draft-law/
  - Information Labs: https://informationlabs.org/games-without-frontiers-the-eu-kids-act-might-regulate-the-feed-and-spare-the-game/
  - Euronews: https://www.euronews.com/my-europe/2026/09/23/the-eu-kids-act-targets-addictive-apps-to-protect-children-online
  - 5Rights: https://5rightsfoundation.com/new-eu-kids-act-can-put-paid-to-the-tech-exploitation-of-children-but-must-apply-equally-to-all-platforms/
  - The Star, leaked-draft coverage (Jul 2026): https://www.thestar.com.my/tech/tech-news/2026/07/04/video-games-in-europe-face-new-restrictions-on-age-loot-boxes
- [EU7] PEGI interactive risk categories (announced 12 Mar 2026; in force June 2026) [V]:
  - PEGI: https://pegi.info/news/pegi-expands-age-rating-criteria-interactive-risk-categories
  - Reed Smith: https://www.reedsmith.com/articles/pegi-launches-interactive-risk-categories-overhauls-age-ratings-for-loot-boxes-in-game-spending-and-communication-features/
  - Lewis Silkin: https://www.lewissilkin.com/insights/2026/03/18/pegi-announces-major-update-to-age-rating-criteria-what-games-businesses-need-to-102mn9y
  - Bird & Bird: https://mediawrites.twobirds.com/post/102mn2b/pegi-age-rating-classification-update
  - Wccftech: https://wccftech.com/games-with-loot-boxes-now-get-pegi-16-rating-starting-june-2026-ea-sports-fc/
- [EU8] Commission's preliminary DSA findings on TikTok's addictive design (6 Feb 2026) and the TikTok Lite Rewards withdrawal: see TT1 and TT2 in `engagement-benchmarks.md` [R]

**Belgium and the Netherlands**
- [BE1] Xiao, "Breaking Ban: Belgium's ineffective gambling law regulation of video game loot boxes", Collabra 2023: https://online.ucpress.edu/collabra/article/9/1/57641/195100/Breaking-Ban-Belgium-s-Ineffective-Gambling-Law [R]. Belgian Gaming Commission loot box report (2018) [K]
- [NL1] Netherlands [V]:
  - Bright.nl, "Tweede Kamer wil verbod op lootboxes": https://www.bright.nl/nieuws/1132678/lootboxes-games-verbod-verbieden-nederland-fifa.html
  - CasinoNieuws: https://www.casinonieuws.nl/online/meerderheid-tweede-kamer-lijkt-voor-verbod-op-loot-boxes/
  - Franssen Tolboom overview: https://www.franssentolboom.nl/en/loot-boxes-an-overview-of-recent-developments/
  - Dutch non-paper on the DFA: https://open.overheid.nl/documenten/605d3346-c973-40d7-bf35-0994f777e8aa/file
  - Raad van State ruling on EA / FIFA Ultimate Team (9 Mar 2022) [K]

**UK, portals, stores, rest of world**
- [UK1] ICO, Age appropriate design code (Children's Code), standards 5, 10, 12, 13 [K]
- [UK2] DCMS government response on loot boxes (2022) and Ukie "Principles and guidance on paid loot boxes" (2023) [K]. UK government, rapid evidence review of skins gambling: https://www.gov.uk/government/publications/a-rapid-evidence-review-of-skins-gambling/a-rapid-evidence-review-of-skins-gambling [R]
- [P1] Poki and CrazyGames requirements and loot-box rules: see the Sources section of `market-portals.md` [R]
- [ST1] Apple App Review Guidelines (3.1.1 loot boxes; Kids category 1.3): https://developer.apple.com/app-store/review/guidelines/ [K]
- [ST2] Google Play Developer Policy Center (Payments: loot-box odds; Families policy): https://play.google.com/about/developer-content-policy/ [K]
- [INT] Rest of world [K]:
  - FTC v. Epic Games (Dec 2022)
  - FTC and HoYoverse settlement (Jan 2025)
  - Brazil Law 15.211/2025 (ECA Digital)
  - Australian classification guidelines on loot boxes and simulated gambling (Sept 2024)
  - South Korea's probability-disclosure law (Mar 2024)

**Literature** [K unless noted]
- [LIT1] Zagal, J. P., Björk, S., and Lewis, C. (2013). "Dark Patterns in the Design of Games." Foundations of Digital Games (FDG 2013).
- [LIT2] Gray, C. M., Kou, Y., Battles, B., Hoggatt, J., and Toombs, A. L. (2018). "The Dark (Patterns) Side of UX Design." CHI 2018.
- [LIT3] Petrovskaya, E., and Zendle, D. (2022). "Predatory Monetisation? A Categorisation of Unfair, Misleading and Aggressive Monetisation Techniques in Digital Games from the Player Perspective." Journal of Business Ethics.
- [LIT4] King, D. L., Delfabbro, P. H., Gainsbury, S. M., Dreier, M., Greer, N., and Billieux, J. (2019). "Unfair play? Video games as exploitative monetized services: An examination of game patents from a consumer protection perspective." Computers in Human Behavior.
- [LIT5] Karlsen, F. (2019). "Exploited or Engaged? Dark Game Design Patterns in Clicker Games, Farming Toys and Casual Games." Transactions of the Digital Games Research Association.
- [LIT6] Zendle, D., and Cairns, P. (2018). "Video game loot boxes are linked to problem gambling: Results of a large-scale survey." PLOS ONE. Drummond, A., and Sauer, J. D. (2018). "Video game loot boxes are psychologically akin to gambling." Nature Human Behaviour. Larche et al. (2019) on rare loot-box rewards and arousal: see meta-collection [36] [R].
- [LIT7] Ryan, R. M., Rigby, C. S., and Przybylski, A. (2006). "The Motivational Pull of Video Games: A Self-Determination Theory Approach." Motivation and Emotion.
- [LIT8] UNICEF and the LEGO Group, "Responsible Innovation in Technology for Children (RITEC)" (2024).
- [LIT9] Designing for Children's Rights Guide; 5Rights Foundation, "Disrupted Childhood: The Cost of Persuasive Design" (2018).
- Wellbeing and streak research (RES1-RES4): see `engagement-benchmarks.md` [R].
