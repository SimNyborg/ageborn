# Ageborn on Instagram: content and publishing tools

Research for @ageborn_game. All checks were made on 2026-10-13.

**How this was checked.** WebFetch could not open any site from this container: DNS lookups failed, and the egress proxy also denies the vendor hosts. So every figure comes from web searches limited to the vendor's own domain, run on 2026-10-13. The URL given for each figure is the official page the search read. Where a vendor's own pages disagree, both values are shown. **UNVERIFIED** means the figure was not confirmed on an official page today; it comes from a third-party source or from prior knowledge. Quality rankings are analyst judgement, not benchmark results. Prices are in USD and exclude VAT. The source keys [S#] are listed at the end. 48 searches were used.

---

## 1. Summary

### Five facts that shape the plan

1. **Sora is gone.** OpenAI closed the Sora app on 26 Apr 2026 and removed `sora-2` and `sora-2-pro` from the API on 24 Sep 2026 [S3][S4]. Drop it from all plans.
2. **No video model has a free API tier.** The Gemini API has no free tier for Veo [S1]. The free web tiers of Runway, Luma and Pika are watermarked, non-commercial, or both [S5][S9][S10]. The only free source of usable AI video is the owner working by hand in Google Flow, which gives 100 credits a month or 50 a day; Google's help pages disagree on which [S14]. Flow's watermark and commercial terms are UNVERIFIED.
3. **The cheapest good video the agent can drive** is Veo 3.1 Lite on the Gemini API. It costs $0.05/s with audio at 720p, so $0.40 for an 8 s clip. Veo 3.1 Fast costs $0.10/s [S1]. Kling's own API is sold in prepaid packs, and the smallest one listed costs $700 [S7]. So use Kling, Seedance and Wan through fal.ai instead [S12].
4. **Narration can be free and automated; songs cannot.** Gemini 3.1 Flash TTS (preview) is free of charge on the Gemini free tier [S1], and Kokoro-82M (Apache-2.0) runs offline on CPU [S28]. Suno makes the best songs (judgement) but has no official API that I could find [S33]. Udio has kept downloads switched off since its 2025 label settlements, according to third-party sources [S34].
5. **Publishing is free and needs no App Review for your own account.** It uses the Instagram API with Instagram Login, with Standard Access and the app left in development mode [S46]. It can post images, carousels, reels (including trial reels and collab invites) and stories. It cannot add Instagram library music, schedule a post, follow accounts, edit the profile or send the first DM (section 2). **The container's proxy currently blocks every API host the work needs.** On 2026-10-13 its log shows refused connections to graph.instagram.com, graph.facebook.com, api.openai.com, ai.google.dev, api.elevenlabs.io, api.dev.runwayml.com, fal.run and api.replicate.com.

### Free starter stack ($0/month)

| Job | Tool | Driven by | Why |
|---|---|---|---|
| Battle clips, hero shots | The game itself: Playwright recording of real matches, Blender (bpy) renders of units, cut and zoomed with ffmpeg | Agent | Unique to Ageborn, on-brand, free. The strongest asset a game account has |
| Narrator for the quote series | Gemini 3.1 Flash TTS, free tier, with the style set in the prompt (for example "slow, deep, resonant elder"). Fallback: Kokoro-82M voices `am_fenrir`, `am_michael` or `bm_george`, deepened with ffmpeg pitch, EQ and reverb | Agent | Free synthetic voices that imitate no real person |
| Captions | faster-whisper on CPU (int8) for word timestamps, then ASS subtitles burned in with ffmpeg | Agent | Free; takes seconds per reel |
| Motion graphics, meme layouts | Remotion (free for an individual or a team of up to 3) or HTML/CSS rendered in headless Chromium, then ffmpeg | Agent | Free and scriptable |
| Stock footage and images | Pexels and Pixabay APIs | Agent | Free, and the licences require no attribution |
| Music and SFX | The game's own audio. For trend formats, the owner adds Instagram library music by hand when posting from the app | Agent / owner | The API cannot add library music |
| AI video (occasional) | Google Flow free credits | Owner (UI only) | No free video API exists |
| Publishing and analytics | Instagram API with Instagram Login, app in development mode | Agent | Free |

### Upgrade stack (each product at or under ~$20/month)

| Product | $/month | What it unlocks | Driven by |
|---|---|---|---|
| **Gemini API pay-as-you-go (Veo 3.1)**, with a $20 budget | 20 | About 50 clips of 8 s at 720p with native audio on Veo 3.1 Lite, or 25 on Veo 3.1 Fast ($0.12/s at 1080p) [S1]. Google bills after use, so set a budget alert; whether it can hard-stop spending is UNVERIFIED. For a firm ceiling and more models, buy fal.ai credits up front instead (prepaid model UNVERIFIED): Veo 3.1 Fast with audio $0.15/s, Kling 3.0 Pro with audio $0.168/s, Seedance 2.0 $0.30/s [S12] | Agent |
| **ElevenLabs Starter** | 6 ($1 the first month) | Commercial licence, Voice Design (make a unique deep narrator voice), expressive v3 speech, sound effects, and Eleven Music; the music API needs Starter or higher [S25][S26] | Agent |
| **Suno Pro** | 10 ($96/yr) | 2,500 credits a month (Suno says about 500 songs), with commercial rights for songs made while subscribed [S33] | Owner (no API) |
| Google AI Pro (optional) | 19.99 | 1,000 Flow credits a month: about 50 Veo 3.1 Fast or 10 Veo 3.1 Quality generations [S14] | Owner (UI only) |
| Runway API credits (optional) | 10-20 | At $0.01/credit: gen4_turbo image-to-video $0.05/s, Gen-4.5 $0.12/s [S6]. Use it to turn Blender renders into cinematic shots | Agent |

**Total:** the core upgrade (Veo budget, ElevenLabs Starter and Suno Pro) costs **$36/month**. Adding both optional products brings it to about **$66-76/month**.

### The five paid tools ranked by impact on content quality

1. **Veo 3.1 (Gemini API or fal):** hyperrealistic, funny clips with dialogue and sound effects generated in one pass. Nothing free comes close.
2. **ElevenLabs Starter:** a distinctive, owned narrator voice for the recurring quote series, plus sound effects. A clear step up from free TTS.
3. **Suno Pro:** the only route to full, professional-sounding songs. Manual work by the owner.
4. **Google AI Pro (Flow):** more Veo clips per dollar (about $0.40 per Fast clip), but the agent cannot drive it.
5. **Runway API:** cheap image-to-video for epic shots built from the game's own renders.

---

## 2. Instagram publishing path (official Meta docs)

**Use the Instagram API with Instagram Login.** It needs a professional account (Business or Creator), does not need a linked Facebook Page, and calls graph.instagram.com [S46]. The Facebook Login variant needs a Page and adds ads and tagging, which you don't need now [S46]. If an app serves only your own accounts, you don't have to build a login flow. Standard Access covers accounts you own and have added to the app; Advanced Access is only for other people's accounts [S46].

### What the API can and cannot do

| Action | Via API? | Details | Src |
|---|---|---|---|
| Single image post | Yes | Meta downloads the file from a **public URL** you give it. JPEG only (UNVERIFIED today) | S44 |
| Carousel | Yes | Up to 10 images and videos; counts as one post | S44 |
| Reel | Yes | `media_type=REELS`; `share_to_feed`, `cover_url`, `thumb_offset`, `location_id` | S45 |
| **Trial reel** (shown to non-followers only) | **Yes** | `trial_params.graduation_strategy` = `MANUAL` or `SS_PERFORMANCE` (auto-graduates if it performs well) | S45 |
| **Collab invite** | **Yes** | `collaborators`: up to 3 usernames on feed images, reels and carousels; not stories | S45 |
| Story | Yes | Video 3-60 s, up to 100 MB. Interactive stickers via the API: UNVERIFIED (probably not) | S45 |
| Name the original audio | Yes, once | `audio_name` | S45 |
| Add Instagram library music | **No** | The media endpoint has no music parameter (no explicit statement found; UNVERIFIED). Ship the audio inside the file | S45 |
| Schedule a post for later | **No** | No scheduling parameter is documented, so the agent must publish at the chosen time (UNVERIFIED as an explicit statement) | S44 |
| Change profile picture, bio, link or settings | **No** | No write endpoint exists (UNVERIFIED as an explicit statement) | - |
| Follow or unfollow; like other accounts' posts | **No** | No endpoint exists (UNVERIFIED as an explicit statement) | - |
| Comment on other accounts' posts | **No** | Only comment management on your own media (UNVERIFIED as an explicit statement) | - |
| Send the first DM | **No** | The user must message first (details below) | S49 |
| Ads, product or people tagging | No with Instagram Login | "Cannot access ads or tagging" | S46 |
| Hashtag search, Business Discovery, trending audio | Not with Instagram Login (UNVERIFIED) | Trend research must be done outside the API | - |
| Publishing limit | 100 API posts per rolling 24 h; another section of the same page says 50 | Check the live quota with `GET /<IG_ID>/content_publishing_limit` | S44 |
| Video upload | Public `video_url`, or a resumable upload to `rupload.facebook.com` | A resumable upload means video files need no public host | S44 |
| Reel file spec | - | MOV/MP4 with the moov atom at the front; H.264 or HEVC, progressive, closed GOP, 4:2:0; AAC up to 48 kHz; 23-60 fps; at most 1920 px wide; 9:16 recommended; 3 s to 15 min; up to 300 MB; video up to 25 Mbps, audio 128 kbps | S45 |

Suggested encode for reels: `ffmpeg -i in.mp4 -vf scale=1080:1920,fps=30 -c:v libx264 -pix_fmt yuv420p -maxrate 20M -bufsize 20M -g 60 -c:a aac -ar 48000 -b:a 128k -movflags +faststart out.mp4`

### Insights the API exposes

| Level | Metrics | Src |
|---|---|---|
| Reels and posts | `views` (replaced impressions), `reach`, `likes`, `comments`, `saved`, `shares`, `total_interactions`, `follows`, `profile_visits`; for reels also `ig_reels_avg_watch_time` and `ig_reels_video_view_total_time` (**watch time: yes**) | S47 |
| Stories | `views`, `reach`, `replies`, `navigation` (exits, forward, back, next story) | S47 |
| Account | `follower_count` (new followers per day). Account-level `views`, `reach`, `accounts_engaged` and demographics: UNVERIFIED today | S47 |
| Caveats | Data can lag up to 48 h. A metric with no data returns an empty set, not 0. `impressions` has returned errors since 21 Apr 2025. No retention curve was found (UNVERIFIED) | S47 |

### Messaging and tokens

- **DMs:** the app can reply only after the user has written first, and only within 24 h of the user's message. The `human_agent` tag allows a human to reply up to 7 days later. One-time notifications are not available on Instagram. A private reply to a comment must be sent within 7 days. Rate limits: 300 sends/s for text, 10/s for audio or video, 750 private replies per hour. Group chats are not supported [S49].
- **Tokens:** login gives a short-lived token valid for 1 h. Exchanging it for a long-lived token (60 days) needs the app secret, so it must happen server-side. Refresh with `GET graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token`; the token must be at least 24 h old, each refresh gives another 60 days, and a token left unrefreshed for 60 days dies [S48].

### Setup steps for one owner (no App Review)

1. **In the Instagram app**, logged in as ageborn_game, switch to a professional account. I suggest Creator, because third-party sources say Business accounts get only the smaller Meta Sound Collection in the app [S37]. The menu path is usually Profile → ☰ → Account type and tools → Switch to professional account (UNVERIFIED; the menu moves).
2. **On a computer**, open developers.facebook.com, log in with Facebook and register as a developer.
3. Click **My Apps → Create app**. Pick the Instagram use case (wording UNVERIFIED) and the Business app type. Name it, for example, "Ageborn Publisher".
4. Go to **App roles → Roles → Add people → Instagram Tester** and enter ageborn_game. Then accept the invite in Instagram's settings under Apps and websites → Tester invites (path UNVERIFIED). Testers can grant every permission while the app is in development [S50].
5. Go to **Instagram → API setup with Instagram business login → Generate access tokens → Add account → Continue**, log in as ageborn_game in the popup and approve the permissions [S51]: `instagram_business_basic`, `instagram_business_content_publish`, `instagram_business_manage_insights`, and optionally `instagram_business_manage_comments` and `instagram_business_manage_messages`.
6. Copy the token and the Instagram user ID into the cloud environment's secrets, never into the repo. Leave the app in **Development mode**. Standard Access is meant for apps used by people with a role on the app [S46][S50]. That no review is needed follows from this; I found no page that says it in so many words.
7. **Allowlist** `graph.instagram.com` and `rupload.facebook.com`. Image posts also need a public URL, for example a GitHub Pages path, that Meta can download from.
8. The agent refreshes the token about every 50 days. If it cannot write its own secrets, the owner must paste a new token every 60 days, so set a reminder.

---

## 3. Findings by category

### A. Video generation

| Tool | Best at (judgement) | Free tier | Cheapest plan ≤ ~$20 | API and price | Commercial | Agent? |
|---|---|---|---|---|---|---|
| **Google Veo 3.1** (Gemini API) | Realism, native dialogue and SFX, up to 4K. 9:16 output: UNVERIFIED | None [S1] | Pay-as-you-go | Lite $0.05/s (720p) and $0.08 (1080p); Fast $0.10, $0.12 and $0.30 (4K); Standard $0.40/s (third-party [S2]) [S1] | Paid API: UNVERIFIED (terms not read) | Yes |
| Google Flow | The same models through a UI | 100 credits/month or 50/day (pages conflict) [S14] | AI Plus $4.99 (200 credits); AI Pro $19.99 (1,000 credits); Fast costs 20 credits per generation, Quality 100 [S14] | No API | UNVERIFIED | Owner |
| Runway (web) | Cinematic control and references | 125 one-off credits, watermarked [S5] | Standard $15 ($12/month billed yearly): 625 credits = 52 s of Gen-4.5 or 104 s of Gen-4 Turbo [S5] | Web credits cannot be used in the API [S6] | UNVERIFIED | Owner |
| Runway API | Image-to-video | None | Prepaid credits at $0.01 | gen4.5 $0.12/s; gen4_turbo $0.05/s [S6] | UNVERIFIED | Yes |
| OpenAI Sora 2 | - | - | - | App closed 26 Apr 2026; API removed 24 Sep 2026 [S3][S4] | - | No |
| Kling (official) | Realistic motion, native audio; the API page also mentions Kling 4.0 | Consumer credits not checked | API minimum $700 for 5,000 units at $0.14 | Kling 3.0 Turbo with audio, 720p: 0.8 unit/s = $0.112/s [S7] | UNVERIFIED | Over budget; use fal |
| MiniMax Hailuo | Value, physics | Not checked | Pay-as-you-go | Hailuo 2.3 Fast, 768p, 6 s: $0.19; 2.3 at 768p 6 s $0.28 and 1080p 6 s $0.49; MiniMax H3 $0.08/s [S8] | UNVERIFIED | Yes |
| Luma Ray3.2 | HDR, reframing | Watermarked and non-commercial (Lite too) [S9] | Plus is $30, the first commercial plan [S9] | Per 5 s block: $0.30 (720p), $1.20 (1080p) [S9] | Plus and higher [S9] | Yes |
| Pika | Effects; consumer app | No commercial use | Starter $10 has no watermark but no commercial licence; Creator ($35) does [S10] | $10/month membership plus a fee per generation; it resells other models (for example Seedance 2.0); API output is commercial [S10] | API: yes | Yes |
| ByteDance Seedance 2.0/2.5 | Multi-shot, native audio, portrait video | No free quota found | Seedance 2.5 token pack: $32 for 5M tokens, valid 3 months [S11] | 2.0: $4.3-7.7 per 1M tokens [S11] | UNVERIFIED | Yes |
| Wan 2.2 (open weights) | Self-hosting | Apache-2.0 | - | Needs a GPU with about 24 GB of memory and takes about 9 min for 5 s of 720p on an RTX 4090 [S15]. **Not feasible on 4 CPU cores** (estimate: many hours per clip; UNVERIFIED). Wan 2.5 and later have API access only (third-party) [S15] | Yes | No |
| **fal.ai** (aggregator) | Many models, one key | Not checked | Top up as needed | See the cost table | Per model | Yes |
| Replicate (aggregator) | Same idea as fal | - | - | Billed per output second; current prices for Veo, Kling and Seedance not retrieved (UNVERIFIED) [S13] | Per model | Yes |

**Cost per clip.** fal prices come from fal model pages of different ages, so recheck them before buying [S12].

| Route | Model and setting | Price | One clip | Clips per $20 |
|---|---|---|---|---|
| Gemini API | Veo 3.1 Lite, 720p, audio, 8 s | $0.05/s | $0.40 | 50 |
| Gemini API | Veo 3.1 Fast, 720p / 1080p, audio, 8 s | $0.10 / $0.12 per s | $0.80 / $0.96 | 25 / 20 |
| Gemini API | Veo 3.1 Standard, 1080p, 8 s | $0.40/s (third-party) | $3.20 | 6 |
| Google Flow | Veo 3.1 Fast / Quality, via AI Pro | 20 / 100 credits | ~$0.40 / ~$2.00 | ~50 / ~10 |
| fal | Veo 3.1 Fast, audio, 8 s | $0.15/s | $1.20 | 16 |
| fal | Kling 3.0 Pro, audio, 5 s | $0.168/s | $0.84 | 23 |
| fal | Kling 2.5 Turbo Pro, 5 s | $0.07/s | $0.35 | 57 |
| fal | Seedance 2.0, 720p (audio included), 5 s | $0.3034/s | $1.52 | 13 |
| fal | Wan 3.0, 720p, 5 s | $0.10/s | $0.50 | 40 |
| Runway API | gen4_turbo image-to-video / Gen-4.5, 5 s | $0.05 / $0.12 per s | $0.25 / $0.60 | 80 / 33 |
| MiniMax API | Hailuo 2.3 Fast, 768p, 6 s | Per video | $0.19 | 105 |
| Luma API | Ray3.2 720p / 1080p, 5 s | Per 5 s block | $0.30 / $1.20 | 66 / 16 |

**Rankings (judgement).** These rest on each model's generation, its native-audio support and how vendors position it; fal's own comparison pages treat Seedance 2.0, Kling 3.0 and Veo 3.1 as the top tier. No benchmark was checked today.

- **(1) Hyperrealistic funny clips:** Veo 3.1 → Seedance 2.x → Kling 3.0 (audio on) → Hailuo 2.3 (cheap; whether it has audio is UNVERIFIED) → Runway Gen-4.5 → Luma Ray3.2 → Pika. Sora 2 is discontinued, and running Wan locally is not feasible.
- **(2) Epic cinematic shots:** Veo 3.1 Standard or Quality → Runway Gen-4.5 (image-to-video from game renders keeps the cel-shaded look) → Kling 3.0 Pro → Seedance 2.x → Luma Ray3.2 (HDR) → Hailuo 2.3.

Two cautions. Veo's options for generating people may be restricted in the EU, UK and Switzerland (UNVERIFIED). Meta expects photorealistic AI video to carry a disclosure, and I found no API field for the "AI info" label (UNVERIFIED).

### B. Avatar and presenter video

| Tool | Free | Cheapest plan | API | Src |
|---|---|---|---|---|
| HeyGen | Web: 3 videos a month, up to 1 min each | Web Creator $29 (600 credits), over budget | Pay-as-you-go from $5. No free API credits since Feb 2026. Avatar IV costs about $4/min at 1080p and $5 at 4K. Host api.heygen.com (UNVERIFIED) | S16 |
| Synthesia | 10 min of video a month on every plan | Starter $29/month (one page also shows $18/month billed yearly) | Paid plans only; 1 API minute = 160 credits | S17 |
| D-ID | Trial has a watermark | Lite (watermarked); price UNVERIFIED | API minutes come out of the same balance as the web app | S18 |

**Verdict: skip all three.** A faceless account gains little from a presenter. The one tempting use, a public-domain portrait of a historical figure "speaking" a quote, carries policy risk around depicting real people (UNVERIFIED). A cheaper option is subtle image-to-video motion on the portrait with Veo or Kling, plus the narrator voice-over.

### C. Editing, compositing and captions

| Tool | Programmatic? | Free / licence | Notes | Src |
|---|---|---|---|---|
| Descript | Yes, an API (early access) | API at no extra cost for all paying users; jobs use your media minutes and AI credits | Edits run through Underlord (captions, filler removal, highlights). **Media files cannot be exported directly yet**, so it fits a pipeline poorly. Plan price UNVERIFIED | S19 |
| CapCut | No official public API found | Its terms grant a broad licence over user content (secondary sources) | Owner by hand only | S20 |
| Instagram Edits | **UI only** (mobile app) | Free, no watermark | Templates built on trending audio, AI captions, AI image animation, green screen, teleprompter. "Edits Plus" is coming with Meta One (Sept 2026) | S21 |
| **Remotion** | Yes (React → MP4) | **Free for an individual or an organisation of up to 3 people, including commercial use.** From 4 people up, a licence is needed: "Automators" at $0.01 per render with a $100/month minimum, or "Creators" at $25 per seat per month | Recommended compositor | S22 |
| Revideo / Motion Canvas | Yes (TypeScript) | MIT (UNVERIFIED today) | Alternatives to Remotion | - |
| Shotstack | API | 10 credits at signup, valid 30 days | Pay-as-you-go $0.20/min; Starter $39/month | S23 |
| Creatomate | API | 50 trial credits (about 14 credits per minute at 720p) | Paid price UNVERIFIED | S23 |
| JSON2Video | API | 600 one-off credits, watermarked, **non-commercial** | Hobby plan price conflicts ($16.95 vs $49.95) | S23 |
| **faster-whisper** | Yes, CPU | MIT (UNVERIFIED today) | Small model, int8 on CPU: 1 min 42 s for the README benchmark (8 threads, i7-12700K, 1.5 GB RAM), so a 30 s reel should take seconds (estimate) | S24 |
| whisperX | Yes, CPU | BSD (UNVERIFIED) | Adds forced alignment for tighter word timing | - |

**Verdict:** ffmpeg, Remotion (free for this owner) and faster-whisper do everything the cloud editors offer, at $0. Descript, CapCut and Edits are tools for the owner's own hand edits.

### D. Voice and TTS

| Tool | Best at | Free tier | Cheapest plan ≤ ~$20 | API price | Commercial | Src |
|---|---|---|---|---|---|---|
| **ElevenLabs** | Most expressive TTS (v3), Voice Design, SFX, music | 10k credits a month. **Non-commercial, and you must credit "elevenlabs.io" or "11.ai" in the title.** Includes 3 Voice Design slots | Starter $6 (first month $1; credit amount UNVERIFIED). Creator $22 (121k credits) is just over the ceiling | Pay-as-you-go per 1k characters: Flash/Turbo $0.04-0.05, Multilingual v2/v3 $0.08-0.10 (pages conflict). SFX about 200 credits per generation, or $0.12/min via the API. Whether the free plan includes TTS API access: UNVERIFIED | All paid plans | S25, S26 |
| OpenAI gpt-4o-mini-tts | Cheap, steerable | None | Pay-as-you-go | $0.60/1M text tokens in, $12/1M audio tokens out ≈ $0.015/min. The model page shows "deprecated"; the successor was not checked | UNVERIFIED | S32 |
| **Gemini 3.1 Flash TTS** (preview) | Style steered by the prompt | **Free of charge on the free tier** | Pay-as-you-go | $1/1M text tokens in, $20/1M audio tokens out | EU terms for the free tier and its data use: UNVERIFIED | S1 |
| Google Cloud TTS | Volume | Every month: Chirp 3 HD 1M characters free; WaveNet and Standard 4M; Neural2 1M | Pay-as-you-go | Chirp 3 HD $30/1M characters; WaveNet $4/1M. Billing must be enabled | Yes (UNVERIFIED) | S27 |
| **Kokoro-82M** | Best quality per unit of CPU | Apache-2.0 weights, MIT code; depends on espeak-ng (GPLv3) | - | Local | Yes | S28 |
| Piper | Fastest, very light | GPL-3.0 (piper1-gpl; rhasspy/piper is archived); each voice inherits its dataset's licence | - | Local | Depends on the voice | S29 |
| Chatterbox | Emotion control, cloning | MIT; **every output carries a Perth watermark** | - | Local; CPU speed UNVERIFIED | Yes | S30 |
| F5-TTS | Cloning | Code is MIT; the weights were trained on Emilia (CC-BY-NC), so they are likely non-commercial (UNVERIFIED) | - | Local | Likely no | S52 |
| XTTS-v2 | Cloning | Coqui Public Model License: **non-commercial only, and no commercial licence can be bought** (Coqui has closed) | - | Local | No | S31 |

**Deep narrator without imitating anyone.** Do not clone a voice. In Kokoro's VOICES.md, the male voices `am_fenrir` and `am_michael` are graded C+ and `bm_george` and `bm_fable` C; the grades reflect training data. Expect a clean but not cinematic read, so deepen it with a slight pitch drop, a low-shelf EQ boost and a hall reverb in ffmpeg. Gemini TTS is the better free option because the delivery can be steered in the prompt. The best paid option is a **designed** ElevenLabs voice: create it with Voice Design from a text description, so the account owns a unique voice. Voices in ElevenLabs' Voice Library belong to real, consenting people, which is legal but sits less well with the "no real person" rule. Treat the account as commercial, because it promotes a product, so free tiers that ban commercial use (ElevenLabs, Suno, Freesound API) are out.

### E. Music

| Tool | Free | Cheapest plan ≤ ~$20 | API | Commercial rights | Src |
|---|---|---|---|---|---|
| **Suno** (v5.5) | Non-commercial; free tracks reportedly can no longer be downloaded since the Warner deal (secondary source [S34]) | **Pro $10/month ($96/yr)**: 2,500 credits (about 500 songs). Premier $30. An older page caps downloads at 20/month on Pro (UNVERIFIED today) | **No official API found**; third-party wrappers are unofficial | Pro and Premier, for songs made while subscribed; not retroactive | S33 |
| Udio | - | - | - | Downloads off since Nov 2025 (a 48 h export window followed the UMG settlement). A licensed, streaming-first platform is rolling out. **Not usable for exporting tracks** (secondary sources; UNVERIFIED) | S34 |
| **Eleven Music** | Non-commercial; credit "Eleven Music" | ElevenLabs Starter $6 (credits shared with TTS; about 900 credits per minute of music) | Starter and higher; pay-as-you-go $0.15/min | "Broad commercial use on all paid plans"; film and TV need Enterprise. **Other ElevenLabs pages say marketing and advertising need an extra licence, so check the Music Terms** | S25, S26 |
| Stable Audio 2.5 | - | Pay-as-you-go | 20 credits ($0.20) per generation according to the API reference; the pricing page says 8 credits (conflict) | Outputs owned according to a Stability explainer; licence text not read (UNVERIFIED) | S35 |
| Mubert | - | Creator about $11.69, Pro about $39 | API from about $49/month for 100 generations | Creator may exclude ads (third-party) | S36 |
| Soundraw | - | Creator about $11-17 | API from $29.99/month for 100 songs | Covers social media | S36 |
| AIVA, Beatoven | Not checked (UNVERIFIED) | | | | - |

**How Instagram treats AI music.** Meta compares the audio and video in a reel against reference files supplied by rights holders. A match can automatically mute the reel, remove it, cut its reach or block it in some regions [S37, a secondary source summarising Meta's Transparency Centre]. I found nothing specific to AI tracks. What follows is my analysis, not a sourced fact. An AI song is only matched if someone has registered it, or if it closely copies a registered recording. The main self-inflicted risk is distributing a Suno song through a distributor that enrols it in Meta's or YouTube's content-ID systems; the account's own reels could then be claimed unless it is whitelisted. Post AI music as original audio and name it with `audio_name`.

### F. Images

| Tool | API price | Free | Notes | Src |
|---|---|---|---|---|
| Nano Banana 2 (Gemini 3.1 Flash Image) | $0.067 (1K), $0.101 (2K), $0.151 (4K); batch about half | **No free tier for image generation** | One source says this model ID retires on 29 Oct 2026 (UNVERIFIED) | S1 |
| Nano Banana Pro (Gemini 3 Pro Image) | $0.134 (1K/2K), $0.24 (4K) (third-party) | None | | S2 |
| OpenAI gpt-image-1-mini | $0.005 / $0.011 / $0.036 per 1024² image at low / medium / high quality | None | Shown as deprecated; gpt-image-1.5 price not found (UNVERIFIED) | S32 |
| FLUX via fal or Replicate | Not checked (UNVERIFIED) | | | - |
| Ideogram 4.0 | Turbo $0.03, Default $0.06, Quality $0.10 per image | | Strongest for text inside images (memes, title cards; judgement). The API spends the same credits as the app | S38 |
| Recraft V3 | $0.04 raster, $0.08 vector | | Brand-consistent styles | S39 |
| Midjourney | **No public API** (only an old survey about an enterprise API) | None | Basic $10/month: 200 fast minutes, video in SD only. Commercial use is allowed; a company earning more than $1M a year must buy Pro or Mega | S40 |

The free image source is the game itself: Blender renders of units and scenes. Use AI images for memes and backgrounds.

### G. Free stock media with an API

| Source | Limits | Licence for social posts | Src |
|---|---|---|---|
| Pexels | 200 requests/h and 20,000/month. Increases are free with attribution, but currently paused | No attribution required; the API asks you to credit photographers where possible | S41 |
| Pixabay | 100 requests per 60 s. Responses must be cached for 24 h. No permanent hotlinking: download the files | Pixabay Content License: no attribution, commercial use allowed | S42 |
| Freesound | 60 requests/min and 2,000/day. Original-file downloads need OAuth2 | **The API is free only for non-commercial use** unless you agree terms with Freesound. Sounds are CC0, CC-BY or CC-BY-NC. Don't use the API for this account; the owner can hand-pick CC0 sounds | S43 |

### Hosts to allowlist

"Blocked" means the proxy log showed the host being refused on 2026-10-13. Hosts marked UNVERIFIED come from vendor docs and SDK defaults recalled from prior knowledge, not checked today.

| Purpose | Hosts |
|---|---|
| Instagram (Instagram Login) | `graph.instagram.com` (blocked); `rupload.facebook.com` [S44]; `graph.facebook.com` only for the Facebook Login path (blocked); `api.instagram.com` only if the agent itself swaps OAuth codes for tokens (UNVERIFIED) |
| Gemini API (Veo, TTS, images) | `generativelanguage.googleapis.com` (UNVERIFIED). ai.google.dev (blocked) is only the docs site |
| Google Cloud TTS | `texttospeech.googleapis.com`, `oauth2.googleapis.com` (UNVERIFIED) |
| OpenAI | `api.openai.com` (blocked) |
| Runway | `api.dev.runwayml.com` (blocked), plus whatever CDN host appears in the output URLs |
| fal / Replicate | `fal.run` (blocked), `queue.fal.run`, `fal.media`, `v3.fal.media`; `api.replicate.com` (blocked), `replicate.delivery` (UNVERIFIED) |
| ElevenLabs | `api.elevenlabs.io` (blocked) |
| MiniMax / Luma / Stability | `api.minimax.io`, `api.lumalabs.ai`, `api.stability.ai` (UNVERIFIED) |
| Ideogram / Recraft | `api.ideogram.ai`, `external.api.recraft.ai` (UNVERIFIED) |
| Stock media | `api.pexels.com`, `images.pexels.com`, `videos.pexels.com`, `pixabay.com`, `cdn.pixabay.com` (UNVERIFIED) |
| Model downloads | `huggingface.co` and its file CDN, for Kokoro and Whisper weights (UNVERIFIED). `pypi.org` and `files.pythonhosted.org` already bypass the proxy (from the proxy's config) |

### Sources (all checked 2026-10-13, through searches limited to each official domain)

- S1 https://ai.google.dev/gemini-api/docs/pricing
- S2 https://benchlm.ai/media-pricing/veo, https://benchlm.ai/media-pricing/nano-banana (third-party, dated 2026-09-11)
- S3 https://help.openai.com/en/articles/20001152-what-to-know-about-the-sora-discontinuation
- S4 https://developers.openai.com/api/docs/deprecations
- S5 https://runwayml.com/pricing, https://help.runwayml.com/hc/en-us/articles/50404627334547-Free-plan-details, https://help.runwayml.com/hc/en-us/articles/49191105352339-Standard-plan-details
- S6 https://docs.dev.runwayml.com/guides/pricing/, https://help.runwayml.com/hc/en-us/articles/15124877443219-How-do-credits-work
- S7 https://kling.ai/dev/pricing, https://kling.ai/document-api/pricing/base/video
- S8 https://platform.minimax.io/docs/pricing/overview
- S9 https://lumalabs.ai/pricing, https://lumalabs.ai/learning-hub/licensing, https://lumalabs.ai/api/pricing
- S10 https://pika.art/pricing, https://dev.pika.art/pricing
- S11 https://www.byteplus.com/en/product/modelark, https://www.byteplus.com/en/product/seedance, https://docs.byteplus.com/en/docs/ModelArk/2608626
- S12 https://fal.ai/models/fal-ai/veo3.1, https://fal.ai/models/fal-ai/veo3.1/fast, https://fal.ai/explore/kling, https://fal.ai/pricing, https://fal.ai/learn/tools/seedance-2-0-vs-kling-3-0
- S13 https://replicate.com/pricing, https://replicate.com/google/veo-3.1-fast
- S14 https://gemini.google/subscriptions/, https://support.google.com/flow/answer/16894016, https://support.google.com/flow/answer/16526234
- S15 https://blog.fal.ai/wan-2-2-api-complete-developer-guide-to-next-generation-video-synthesis/, https://www.atlascloud.ai/blog/tips/wan-3.0-vram-requirements (third-party)
- S16 https://help.heygen.com/en/articles/10060327-heygen-api-pricing-explained, https://www.heygen.com/pricing
- S17 https://www.synthesia.io/pricing, https://help.synthesia.io/en/articles/15972650-what-are-synthesia-s-pricing-plans
- S18 https://www.d-id.com/pricing/studio/
- S19 https://help.descript.com/hc/en-us/articles/43370311322509-Descript-API, https://www.descript.com/api
- S20 Search for an official CapCut API (none found); terms commentary at https://podcastle.ai/blog/capcut-terms-of-service (secondary)
- S21 https://creators.instagram.com/edits, https://about.fb.com/news/2026/04/one-year-of-edits-built-for-and-with-creators/, https://about.fb.com/news/2026/09/introducing-meta-one-subscription-service-more-features-ai/
- S22 https://www.remotion.dev/docs/license/pricing, https://www.remotion.dev/docs/license/faq, https://www.remotion.dev/docs/terms
- S23 https://shotstack.io/pricing/, https://creatomate.com/pricing, https://json2video.com/docs/v2/reference/credits/plans
- S24 https://github.com/SYSTRAN/faster-whisper
- S25 https://elevenlabs.io/pricing, https://help.elevenlabs.io/hc/en-us/articles/13313564601361-Can-I-publish-the-content-I-generate-on-the-platform
- S26 https://elevenlabs.io/pricing/api, https://elevenlabs.io/eleven-music-api, https://elevenlabs.io/music-terms, https://elevenlabs.io/creative
- S27 https://cloud.google.com/text-to-speech/pricing
- S28 https://huggingface.co/hexgrad/Kokoro-82M, https://huggingface.co/hexgrad/Kokoro-82M/blob/main/VOICES.md
- S29 https://github.com/OHF-Voice/piper1-gpl, https://github.com/rhasspy/piper, https://github.com/rhasspy/piper/discussions/271
- S30 https://github.com/resemble-ai/chatterbox
- S31 https://huggingface.co/coqui/XTTS-v2/blob/main/LICENSE.txt, https://github.com/coqui-ai/TTS/discussions/4304
- S32 https://developers.openai.com/api/docs/models/gpt-4o-mini-tts, https://developers.openai.com/api/docs/models/gpt-image-1-mini
- S33 https://suno.com/pricing, https://help.suno.com/en/articles/2410177, https://help.suno.com/en/categories/550145
- S34 https://blog.dubspot.com/ai-music-licensing-explained-2026, https://sonilo.com/blog/comparisons/udio-v4-warner-music-licensing-explained (secondary)
- S35 https://platform.stability.ai/pricing, https://platform.stability.ai/docs/api-reference, https://stability.ai/api-pricing-update-25
- S36 https://mubert.com/render/pricing, https://mubert.com/api, https://soundraw.io/blog/post/soundraw-api-ethical-ai-music-for-royalty-free-songs-at-scale
- S37 https://www.theippress.com/2026/08/04/why-your-viral-reel-got-muted-the-hidden-copyright-system-of-instagram-everyday-ip/, https://www.foximusic.com/blog/instagram-reels-music-copyright-legal-guide/ (secondary)
- S38 https://ideogram.ai/pricing, https://docs.ideogram.ai/plans-and-billing/ideogram-api
- S39 https://www.recraft.ai/docs/api-reference/pricing
- S40 https://docs.midjourney.com/hc/en-us/articles/27870484040333-Comparing-Midjourney-Plans, https://updates.midjourney.com/enterprise-api-survey/
- S41 https://help.pexels.com/hc/en-us/articles/900005851863-Do-I-have-to-pay-for-higher-limits, https://www.pexels.com/license/
- S42 https://pixabay.com/api/docs/
- S43 https://freesound.org/docs/api/overview.html, https://freesound.org/help/tos_api/
- S44 https://developers.facebook.com/docs/instagram-platform/content-publishing/
- S45 https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user/media/
- S46 https://developers.facebook.com/docs/instagram-platform/overview/, https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-instagram-login/business-login
- S47 https://developers.facebook.com/docs/instagram-platform/insights/, https://developers.facebook.com/documentation/instagram-platform/reference/instagram-media/insights
- S48 https://developers.facebook.com/docs/instagram-platform/reference/refresh_access_token/, https://developers.facebook.com/docs/instagram-platform/reference/access_token/
- S49 https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-instagram-login/messaging-api, https://developers.facebook.com/documentation/business-messaging/messenger-platform/overview/rate-limiting
- S50 https://developers.facebook.com/documentation/development/build-and-test/app-roles
- S51 https://developers.facebook.com/docs/instagram-platform/create-an-instagram-app/, https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/
- S52 https://github.com/Awesome-llms-labs/Awesome-llm-tts (third-party list; F5-TTS licence and Emilia dataset)
