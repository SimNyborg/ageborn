# Instagram growth research for ageborn_game

Prepared 2026-10-13 from 41 web searches. Direct page fetches were blocked in this environment, so claims rest on search-engine extracts of the cited pages. **UNVERIFIED** = not confirmed against a primary or credible source. Not legal advice.

## 1. Summary

### Ten key findings (sources in section 3)

1. **New accounts grow through Reels recommendations.** Each Reel is tested on a few non-followers, and the winners spread. Top signals (Mosseri, Jan 2025): watch time, likes per reach and sends per reach. Sends count most with non-followers. (A)
2. **Originality is judged per account.** Since 30 Apr 2026, accounts that mainly post unoriginal content lose recommendations (judged over a rolling month). Our own renders are an asset; reposted memes are a liability. (A)
3. **Trial Reels are the test bench.** They reach non-followers first and can auto-share to followers if they perform within 72 hours. That allows wide experiments without spamming followers. (A)
4. **Hook and length.** Win the first 3 seconds (Instagram's own advice). Reels up to 3 minutes can be recommended. 45–60 s had the best median views in a 2026 dataset, but completion rate decides. (A, C)
5. **More posts help, with shrinking returns.** Buffer (2M posts, 2025): 3–5 posts a week roughly doubled growth versus 1–2, and 10+ a week grew fastest. No data covers 84 a week, and feeds space out one account's posts. (B)
6. **Each format has a job.** For small accounts, Reels reach 9.8% of followers vs 8.8% for carousels and 7% for images (2026). Carousels get about 9 times more saves than single images. (C)
7. **Search works through keywords.** Hashtags are capped at 5 (Dec 2025) and do not add reach. Keywords in captions and on-screen text matter. Google indexes public posts from professional accounts since 10 Jul 2025. (C)
8. **Meta requires AI labels on realistic content.** Photorealistic AI video and realistic AI audio must be labelled, or Meta "may apply penalties". Files carrying C2PA metadata get labelled automatically. No credible evidence shows that labels lower reach. Since 31 Aug 2026, profiles fronted by an AI-generated person need a profile label or lose reach. (E)
9. **EU and Danish law apply.** Since 2 Aug 2026 the AI Act requires deepfakes to be disclosed, with a light disclosure for evidently artistic, satirical or fictional work. Denmark's bill (Oct 2026) would ban realistic imitations of a person's face or voice without consent, until 50 years after death. So: no sound-alike of a famous narrator. (E, F)
10. **Music is a copyright trap.** Trending or copyrighted songs baked into an API-published video risk muting or removal. Use original audio, or AI songs from a paid plan with commercial rights. (F)

### Verdict on the three risky ideas

| Idea | Verdict | Why |
|---|---|---|
| ~12 posts a day, around the clock | **No.** Start with 2 grid Reels, 2–3 Trial Reels and 3–5 Stories a day. Scale only if reach per post holds. | The API allows 100 posts per 24 h, so nothing blocks it. But feeds space out one account's posts, so followers see few of them. Quality drops at 84 posts a week, and repetitive or low-effort posts risk the account-level originality check. No data shows a benefit at that volume. |
| Follow/unfollow | **No.** | There is no official follow endpoint, so it needs automation the Terms forbid. Instagram removes fake follows and blocks such accounts. Follow-backs rarely engage, which weakens likes and sends per reach. Flagged accounts can face identity checks that could expose the owner (UNVERIFIED). |
| Never ticking the AI label | **No** for photorealistic AI video and realistic AI voices. Cel-shaded game renders need no label. | Meta requires the label and may penalise. C2PA-tagged files (e.g. from Sora) get labelled anyway. No evidence shows labels cut reach. Undisclosed deepfakes breach the EU AI Act since 2 Aug 2026. |

## 2. Four-week experiment plan

**Setup (days −3 to 0)**
- **Account type:** a Creator account, which is professional (Trial Reels and Insights need that). Check that the publishing tool supports it.
- **Separation from the owner:** new email, no contact sync, no link to the owner's Facebook or Accounts Center, separate browser profile (how Instagram links accounts is UNVERIFIED).
- **Profile:** keywords in the Name field ("Ageborn | Stone Age to Cosmic battles"), short bio, no link. Confirm in Account Status that the account can be recommended, and publish 6–9 posts before the test starts.
- **Trial Reels via the API:** check whether the API can publish them (UNVERIFIED). If not, schedule them in the app.

**Content pillars** (made from our own assets unless marked)

| Pillar | Audience | Format |
|---|---|---|
| P1 Age Clash: battle clips, "Stone Age vs Cosmic: who wins?" | Strategy and mobile gamers | Reels 8–30 s |
| P2 Choose & rank: unit picks, rarity reveals, capsule openings, tier lists | Clash Royale-style collectors | Carousels with music, Reels |
| P3 Voices of the Ages: public-domain quotes, original deep narrator, cinematic renders | History fans | Reels 20–45 s |
| P4 History memes in our own art ("each age reacts to…") | Broad history-meme audience | Reels, carousels |
| P5 Devlog: Blender turntables, animation before/after, "browser games are back" (no other game names) | Indie fans, Flash nostalgia | Reels, Stories |
| P6 AI cinematic or humour clips: at most 20% of posts, labelled, no real people or third-party characters | Broad | Reels |

**Daily cadence:** 2 grid Reels, 2–3 Trial Reels, 3–5 Stories (polls, quizzes, work in progress) and a carousel every second day. Post in jittered windows, e.g. 07–09, 12–13 and 18–22 CET, plus 01–03 CET for US evenings.

**One main variable per week**
1. **Week 1, topic:** at least 6 posts per pillar.
2. **Week 2, hook:** one clip with 3 openings (on-screen question, action-first impact, "what if" text), run as Trial Reels.
3. **Week 3, length and format:** 8–15, 20–35, 45–60 and 90+ s; the same idea as a Reel and as a carousel with music.
4. **Week 4, time and audio:** time window, audio (narrator vs AI song vs game sounds) and first collab posts with small history and game accounts.

**Metrics** (per post at 72 h and 7 days): views, reach, share of reach from non-followers, average watch time (also as % of length), 3-second view rate, likes/sends/saves per reach, follows per 1,000 reach, profile visits, unfollows, negative comments.

**Decision rules**
- **Evidence:** compare medians, never single posts, and wait for at least 3 posts per test cell before deciding.
- **Trial Reels:** if one beats the account's median views at 72 h, share it with everyone and make 3 variants.
- **Pillars:** keep a pillar at or above the median on follows per 1,000 reach. After 6+ posts, drop or rework a pillar below half the median on both views and follows per 1,000 reach. From week 3, give 60–70% of slots to the two best pillars and keep 30–40% for exploration.
- **Volume:** add 1 grid Reel a day only if median reach per post stays within 20% of the previous week. Cut back if it falls more than 25% or unfollows rise.
- **AI clips (P6):** keep the share only if P6 beats the non-AI median on follows per 1,000 reach by 20% or more, with "AI slop" complaints under 5% of comments.
- **Stop rules:** if Account Status marks the account as not recommendable, pause the suspected content type and audit originality. After any action block, pause engagement actions for 48 h.
- **Engagement:** the agent may reply to comments on our posts through the official API. Comments on others' posts and follows: only by a human, if at all.

## 3. Detailed findings

### A. Ranking and reach to non-followers

- **Signals.** Mosseri: "pay close attention to average watch time, likes per reach, and sends per reach". Likes weigh slightly more with followers, sends with non-followers ([Social Media Today, Jan 2025](https://www.socialmediatoday.com/news/instagram-shares-algorithm-insights-2025/738034/)). The claim that sends weigh 3–5 times more than likes comes from a vendor (UNVERIFIED). He also stresses saves and the first 3 seconds ([Inman, 7 Mar 2025](https://www.inman.com/2025/03/07/head-of-instagram-reveals-secrets-to-social-media-success/)).
- **Reels model.** Meta says the model predicts sharing off Instagram, watching to the end, watching longer than 95% of viewers of same-length Reels, and following the author ([Meta Transparency Center, c. Nov 2025](https://transparency.meta.com/features/explaining-ranking/ig-reels-chaining/)).
- **Each surface** ([Instagram Ranking Explained, 31 May 2023](https://about.instagram.com/blog/announcements/instagram-ranking-explained)):
  - **Feed** avoids "too many posts from the same person in a row".
  - **Stories** mostly reach followers.
  - **Explore** shows accounts the viewer does not follow.
  - **Reels** weigh watch-through, reshares and audio-page visits.
- **Small creators.** Reels go to a small non-follower group first, and the winners go wider ([@creators, 2024](https://creators.instagram.com/blog/helping-creators-of-all-sizes-break-through)).
- **Originality.**
  - Since 30 Apr 2026, accounts that mainly post unoriginal photos, carousels or Reels are excluded from recommendations, assessed month by month ([TechCrunch, 30 Apr 2026](https://techcrunch.com/2026/04/30/instagram-restricts-reach-of-content-aggregators-in-new-crackdown/); [PetaPixel](https://petapixel.com/2026/04/30/new-instagram-policies-target-reposted-content/)).
  - About 75% of US recommendations now come from original posts. On-screen text that adds context can make a clip count as original ([MediaPost, 4 May 2026](https://www.mediapost.com/publications/article/414773/instagram-algorithm-update-discourages-reposted-co.html)).
  - A watermark alone is not a material edit ([Help Center](https://help.instagram.com/1800814370401535/)).
- **Trial Reels.** Launched 10 Dec 2024 for professional accounts. Instagram can auto-share one based on its views in the first 72 h ([@creators](https://creators.instagram.com/blog/instagram-trial-reels)). They can be scheduled since 2026 ([HeyOrca](https://www.heyorca.com/blog/instagram-social-news)). Vendor claims of a 200- or 1,000-follower minimum are UNVERIFIED.
- **Length.** Reels up to 3 minutes were announced on 18 Jan 2025 ([Engadget](https://www.engadget.com/social-media/instagram-swoops-in-with-3-minute-reels-and-rectangular-profile-grids-as-the-tiktok-ban-gets-real-201316339.html)). Longer Reels are not recommended to non-followers ([@creators tips](https://creators.instagram.com/blog/tips-for-improving-your-reach)).
- **Metric.** "Views" became the main metric for all formats (announced Aug 2024, [Hypebot](https://www.hypebot.com/hypebot/2024/08/views-become-top-metric-for-instagram-content.html)). The API metrics changed on 21 Apr 2025 ([SocialPilot](https://www.socialpilot.co/instagram-marketing/instagram-views-metrics-changes)).
- **New in 2026.** "Your Algorithm" lets users edit their topics, so clear topic signals help ([SocialBee, 12 Oct 2026](https://socialbee.com/blog/instagram-updates/)). Mosseri on 31 Dec 2025: "authenticity is becoming infinitely reproducible" ([Betanews, 1 Jan 2026](https://betanews.com/2026/01/01/adam-mosseri-suggests-highlighting-real-media-rather-than-ai-content-on-social-media/)).

### B. Posting frequency

- **Buffer** (2M+ posts from 100k+ accounts; Stories not included) ([Buffer, 13 Aug 2025](https://buffer.com/resources/how-often-to-post-on-instagram/); [Hypebot](https://www.hypebot.com/hypebot/2025/08/how-often-should-you-post-on-instagram.html)):
  - Weekly follower growth: +0.12% at 1–2 posts a week, +0.26% at 3–5, +0.44% at 6–9 and +0.66% at 10+.
  - The study shows correlation only and does not control for account size.
- **Mosseri:** "the more you post, the more people you'll reach", but quality comes first ([RouteNote, secondary, date UNVERIFIED](https://routenote.com/blog/how-often-you-should-post-on-instagram/)). In 2021 he suggested "a couple feed posts a week, and a couple stories a day" ([SocialPilot, secondary](https://www.socialpilot.co/instagram-marketing/how-often-to-post-on-instagram)).
- **12 posts a day:** no data, and no documented penalty per post. Three points argue against it: feed spacing, the spam rule against "repetitive... content" (section E), and the account-level originality check.
- **API limits:** 100 API-published posts per rolling 24 h; a carousel counts as one ([Meta developer docs](https://developers.facebook.com/docs/instagram-platform/content-publishing/)).

### C. Craft

- **Hook.** Make the first 3 seconds engaging and track the 3-second view rate ([@creators FAQ](https://creators.instagram.com/faq?locale=en_US); [@creators, 2025](https://creators.instagram.com/blog/the-latest-with-instagram)). Watermarks from other apps reduce recommendation (same FAQ).
- **Length.** Median views were 10,374 at 45–60 s, 4,700 at 1–30 s and 4,428 at 180 s+ (about 140,000 Reels). A smaller study favoured 15–30 s ([Socialinsider](https://socialinsider.io/blog/instagram-reels-length/)). Test it.
- **Specs.** Reels and Stories 1080x1920, feed 1080x1350. Keep text out of roughly the top 250 px, the bottom 400 px and the right 120 px (industry guidance, UNVERIFIED). Burn in captions.
- **Carousels.** In Q2 2026 carousels had 0.50% engagement against 0.48% for Reels ([Socialinsider](https://www.socialinsider.io/instagram-benchmarks)). Single-image reach fell 21.96% year on year ([Metricool, 16 Jun 2026](https://metricool.com/press-release-instagram-study-2026/)). Photos and carousels with audio can appear in the Reels tab ([Help Center](https://help.instagram.com/329208821595430)).
- **Hashtags and search.**
  - Use at most 5 hashtags, targeted rather than generic ([Social Media Today, Dec 2025](https://www.socialmediatoday.com/news/instagram-implements-new-limits-on-hashtag-use/808309/)).
  - The text a user types is Instagram search's strongest signal ([Instagram](https://about.instagram.com/blog/announcements/break-down-how-instagram-search-works)).
  - Google indexes posts from public professional accounts of users over 18 ([PPC Land](https://ppc.land/instagram-content-becomes-searchable-on-google-starting-july-10/)).
- **Posting times.** The studies disagree: Buffer favours Wednesday and Thursday ([Buffer 2026](https://buffer.com/resources/when-is-the-best-time-to-post-on-instagram)), while Later says 5 a.m. local time and that consistency matters more than the slot ([Later](https://later.com/blog/best-time-to-post-on-instagram/)). Test it.

### D. Games and audiences

- **Case studies.** These numbers are self-reported and measure wishlists, not followers.
  - *A Game About Digging A Hole*: about 14.5M Instagram views led to 82,000 wishlists in 4 weeks. The developer credits a clear hook and a clip that looked native to the platform ([LinkedIn](https://ca.linkedin.com/in/bmweeks)).
  - *DREADMOOR*: TikTok and Reels clips with about 1M impressions added 13,000 wishlists in a week ([Game World Observer, 21 May 2026](https://gameworldobserver.com/2026/05/21/case-study-how-dreadmoor-reached-200000-wishlists-and-where-they-came-from)).
  - *Infinitum*: a Reel with 1.2M views brought 8,000 wishlists. The author calls Instagram usually weak for games ([How To Market A Game, 11 Sep 2023](https://howtomarketagame.com/2023/09/11/three-inspiring-marketing-success-stories/)).
- **AI video.** "History POV" clips spread after Veo 3 launched (May 2025), but the account numbers come from course sellers (UNVERIFIED, [tech.az](https://tech.az/en/posts/veo-3-generated-videos-go-viral-on-social-media-5417)). A backlash against "AI slop" is reported in 2026 ([Opus, Apr 2026](https://www.opus.pro/blog/ai-video-news-april-2026)), so authentic game renders stand out.
- **Audiences.** I found no direct data, so these are hypotheses to test:
  - History fans: quotes and matchups between ages.
  - Strategy players: counters, without naming other games.
  - Clash Royale players: card picks and rarity reveals.
  - Flash nostalgia: the browser-game look.
  - Never mention "Age of War", including in hashtags.

### E. Platform rules and risks

- **AI labels.**
  - Meta requires its disclosure tool for "photorealistic video or realistic-sounding audio that was digitally created or altered" and may apply penalties ([Meta, 6 Feb 2024](https://about.fb.com/news/2024/02/labeling-ai-generated-images-on-facebook-instagram-and-threads/)).
  - It detects C2PA and other industry signals and shows whether a label came from them ([Meta, Feb 2026, updated 1 Jun 2026](https://about.fb.com/news/2026/02/meta-prepares-for-2026-us-midterms/)).
  - On 10 Mar 2026 the Oversight Board asked Meta to publish its penalty criteria; Meta is "assessing feasibility" ([Oversight Board](https://www.oversightboard.com/decision/fb-46usuh23/)).
  - Effect on reach: Meta reports 330M+ Instagram views of labelled content but no comparison with unlabelled posts ([Meta](https://transparency.meta.com/governance/tracking-impact/labeling-ai-content)). Any effect on reach is UNVERIFIED.
- **AI-generated profiles.** Since 31 Aug 2026, profiles that feature an AI-generated person need the "AI-generated profile" label or face limited reach. Using AI for editing or graphics does not require it ([Metricool](https://metricool.com/instagrams-new-ai-label/)). Avoid a synthetic human host.
- **Watermarks.** Sora embeds visible and invisible markers plus C2PA metadata ([FutureFive, Mar 2026](https://futurefive.com.au/story/openai-details-sora-2-safeguards-on-likeness-teens)). Whether Meta detects Veo's SynthID is UNVERIFIED. Stripped metadata does not remove the duty to disclose.
- **EU AI Act, Art. 50(4).**
  - Deployers must disclose deepfakes. For evidently artistic, creative, satirical or fictional work, disclosure is only needed "in an appropriate manner that does not hamper the display or enjoyment of the work" ([Art. 50](https://artificialintelligenceact.eu/article/50/)).
  - A deepfake resembles existing persons, objects, places, entities or events and would falsely appear authentic (Art. 3(60)).
  - The duty applies from 2 Aug 2026; personal, non-professional use is exempt ([Commission FAQ](https://digital-strategy.ec.europa.eu/en/faqs/transparency-obligations-under-article-50-ai-act)).
  - The Digital Omnibus grace period to 2 Dec 2026 covers tool providers' watermarking, not Ageborn ([William Fry, 2026](https://www.williamfry.com/knowledge/eu-ai-act-omnibus-deal-reached-postponed-deadlines-watermarking-compromise-and-the-nudificiation-prohibition/)).
- **Inauthentic behaviour.**
  - The Terms ban automated access or collection without permission and getting around technical limits ([Terms](https://help.instagram.com/581066165581870/)).
  - The Guidelines say not to artificially collect "likes, followers, or shares" or post "repetitive comments or content" ([Guidelines](https://help.instagram.com/customer/portal/articles/262387-community-guidelines)).
  - Instagram uses machine learning to remove fake engagement ([Instagram, 2018](https://about.instagram.com/blog/announcements/reducing-inauthentic-activity-on-instagram)). Accounts that buy likes may not be recommended ([Help Center](https://help.instagram.com/313829416281232/)).
  - Instagram does not publish its limits. Vendors estimate 100–200 follows a day and blocks of 12–48 h ([Unfollr, 2026](https://www.unfollr.com/blog/instagram-follow-unfollow-limits); UNVERIFIED).
  - Engagement pods fall under "artificially collecting". I found no credible evidence that follow/unfollow works.

### F. Legal and safety

- **Quotes.**
  - In the EU, protection lasts until 70 years after the author's death (Directive 2006/116/EC; not re-checked this session). Churchill (died 1965) is protected until the end of 2035.
  - Use public-domain translations (Giles's *Art of War*, 1910; Long's *Meditations*, 1862) or our own.
  - Verify attributions, and avoid living people.
- **Voices.**
  - No sound-alike of a recognisable narrator (Civilization IV's Leonard Nimoy, died 2015).
  - Denmark's bill would require consent for realistic imitations of a person's voice or appearance, until 50 years after death, with satire and parody exempt. It is still in parliament ([Euronews, 8 Oct 2026](https://www.euronews.com/2026/10/08/denmark-introduces-a-bill-protecting-peoples-faces-and-voices-from-deepfakes); [EPRS, Jan 2026](https://eprs.europarl.europa.eu/contents/publications/EPRS/2026/01/EPRS_ATA(2026)782611.html)).
  - US courts treat sound-alikes of famous voices in ads as misappropriation (Midler v. Ford, 1988; not re-checked).
- **Music.**
  - Business accounts are limited to royalty-free libraries, and mainstream songs risk muting or blocking ([Foxi Music, 2026, secondary](https://www.foximusic.com/blog/instagram-reels-music-copyright-legal-guide/)).
  - The API uploads finished videos, so the in-app music library cannot be attached (UNVERIFIED).
  - Suno's free plan is non-commercial. A paid plan gives commercial rights, but Suno no longer says users own their songs ([Music in Africa](https://www.musicinafrica.net/magazine/suno-adjusts-ai-music-ownership-terms-after-warner-music-partnership)).
- **AI video.** No real people and no third-party characters, brands or game assets. Sora requires consent for a person's likeness ([FutureFive, Mar 2026](https://futurefive.com.au/story/openai-details-sora-2-safeguards-on-likeness-teens)). Prefer image-to-video made from our own renders.
