# Launch checklist: Wildlight Expedition on Steam (first-time solo developer)

Written on **28 November 2026**. All dates assume a release on **Thursday 15 July 2027**, about 7.5 months out: enough time to build the Steam version, collect wishlists and use the June Next Fest. Moving the release date later is free; moving it earlier is risky. **Nothing in this file has been done, and nothing has been sent to Steam**: it is a plan. Steam rules and dates change, so check each "verify" item on partner.steamgames.com (Steamworks documentation) on the day.

How to read the numbers: they are rules of thumb from public developer talks and my reading of Steam's documents, not guarantees. Games with no audience, no marketing and an unknown genre often sell far less than the examples here. Plan for the low case and be happy with the high one.

---

## Phase 0: Steamworks account and money (28 Nov - 6 Dec 2026)

- [ ] **Sat 28 Nov - Mon 30 Nov**: decide who the seller is: you as a person (sole proprietor) or a company. A person is fine and fastest. Use your legal name and address exactly as on your ID and bank account; mismatches are the number one cause of delays.
- [ ] **Mon 30 Nov**: sign up for **Steamworks** (partner.steamgames.com) with a Steam account you will keep (not a throwaway; the app credit is tied to the account of whoever pays the fee).
- [ ] **Tue 1 Dec**: complete the **business information**: identity verification (a photo ID, sometimes a video call, 1-5 days), **tax interview** (non-US: form W-8BEN, which can reduce US withholding to 0-15% depending on your country's treaty; US: W-9), **bank details** (IBAN or account and SWIFT; the name must match) and the contact details. Keep the confirmation emails.
- [ ] **Wed 2 Dec**: pay the **Steam Direct fee: US$100 per app**, non-refundable but **recouped** from your payout once the game earns US$1,000 of adjusted gross revenue on Steam (verified in Steamworks docs). Pay with a card in your own name.
- [ ] **Thu 3 Dec**: create the app in Steamworks (App Admin) with the working title "Wildlight Expedition". Note the **App ID**. Create a **demo** app later (see Phase 5).
- [ ] **Do now, free:** read "Steamworks documentation → Getting started" and "Store page" once; write down the release date rule: **there is a waiting period (30 days after the fee and the legal and tax information are done) before you can release**, and the store page must be public as "Coming Soon" **at least 2 weeks** before release (verify both).
- [ ] Open a small business bank account or a separate savings account for payouts (Steam pays about 30 days after the end of each month). Keep 30% of every payout for income tax, and know your country's VAT rules for digital goods (Steam collects and pays sales taxes in most regions; income tax is yours).

**Cost so far:** US$100. No other fee is needed to publish (no engine licence, no certification). Optional: a domain (about $12/yr), a Discord server (free), capsule art revisions (included in this kit).

## Phase 1: make the game ready to ship as a desktop app (Dec 2026 - Feb 2027)

The game is a static web game. Steam needs an app you can start, so wrap it:

- [ ] **Mon 7 Dec - Fri 18 Dec**: pick the wrapper (NW.js or Electron are the easiest for a plain HTML/JS game; Tauri makes a much smaller download but needs more setup). Make a Windows build that opens full-screen / windowed at 1280x720 minimum. Test on a low-end PC (4 GB RAM) and on a Steam Deck if you have one.
- [ ] Remove or replace the web-only parts in the Steam build: the **Test tools** card and `TEST_PERIOD` (set to false), the build label, Google sign-in and Firestore cloud save (use **Steam Cloud** via Steamworks instead, or ship local saves only), the PWA install card and service worker, the web update bar.
- [ ] Add a **Credits** screen with the music and SFX credits (`assets/music/CREDITS.md`, `assets/sfx/CREDITS.md`), the AI-art note, and a version number.
- [ ] Add **Steam achievements** (10 to 20 simple ones: first win, first merge, first Legendary, light each watchtower, clear all six regions...). They raise engagement and show on the page. Use steamworks.js (Electron / NW.js) or the C++ SDK through a tiny helper. Achievements are optional for launch but worth about a week of work.
- [ ] Add a **language note**: English only at launch.
- [ ] Decide **Early Access vs 1.0**: launch as 1.0 (the game has six regions and a complete loop). Early Access would need the page to promise a roadmap.
- [ ] Write a **privacy note** (the game stores a local save; with Steam Cloud it stores it with Steam; no analytics) and a short EULA, or use Steam's default.
- [ ] Balance check before screenshots: farming rewards looked inflated in the capture (about 1 M gold for 24 h at level 24); see `screenshots.md`.

## Phase 2: the store page (Dec 2026 - Jan 2027)

- [ ] **Mon 14 Dec**: copy the texts from `store-page.md` into Steamworks (short and long description, tags, genre, languages, system requirements, the AI-content survey, content descriptors).
- [ ] **Tue 15 Dec**: upload the art from `art/` (see `art-preview.html` for the Steamworks slot of each file): header, small, main, vertical, library capsule, library hero, library logo, page background. Upload the 8 screenshots from `screenshots/` (order: 2, 1, 3, 5, 6, 4, 7, 8).
- [ ] **Mon 21 Dec**: trailer first cut (see `trailer-plan.md`); upload as soon as it is ready, even if it is not perfect: a page with a trailer converts clearly better.
- [ ] **Mon 21 Dec**: **submit the store page for review** (Steamworks: "Mark ready for review"). Review takes about **3-5 business days** (longer around holidays: expect early January). Fix what they ask. You can edit afterwards without review for most fields.
- [ ] **Mon 11 Jan 2027**: the page is **public as Coming Soon**, with a "Wishlist" button. This is **about 6 months before release**, far beyond the 2-week minimum; the earlier it is up, the more wishlists you collect. Do not wait for "perfect".
- [ ] Do **not** announce a day yet. Put "Summer 2027" as the release date text.

## Phase 3: build an audience (Jan - Jun 2027): the main job

**What matters most is wishlists** (they decide how Steam shows your game on launch day and how many people buy in week 1).

- [ ] Post one **devlog** on the Steam page every 2-3 weeks (a new region, a hero, the forge). Each post notifies wishlisters and counts as a free reminder.
- [ ] Post the 10 short clips from `trailer-plan.md` 3 per week (TikTok, Reels, Shorts), and on Reddit where self-promotion is allowed (r/incremental_games, r/WebGames, r/IndieGaming, r/playmygame; read each subreddit's rules, post once per update, answer every comment). Always link to the Steam page.
- [ ] Join a Discord with an indie dev channel and a game-dev community that does "wishlist Wednesday" style threads; give feedback to others.
- [ ] Be honest and ready about the **AI art** (it is in the survey and on the page). Expect a few negative comments; answer calmly once, never delete them.
- [ ] Email or message **10 to 30 small streamers and YouTubers** who play idle or RPG games with under 20,000 subscribers; send a short, personal message and Steam keys only when they ask (Steamworks lets you generate keys; 20-50 keys is enough). Never mass-send.
- [ ] Track in a sheet every Monday: wishlists total and new, page visits, visit-to-wishlist rate (Steamworks sales and marketing reports, "Wishlists" and "Traffic" under the app's page). A healthy page converts **10-20% of visitors into wishlists**; below 5% means the capsule, trailer, screenshots or tags need work.

**Wishlist goals (realistic for a first solo game, no publisher, a small budget):**

| When | Low case | Good case | Great case |
|---|---|---|---|
| 11 Jan (page up) | 0 | 0 | 0 |
| 22 Feb (Next Fest in Feb: skipped) | 100 | 300 | 800 |
| 14 Jun (June Next Fest start) | 500 | 1,500 | 3,500 |
| 21 Jun (Next Fest ends) | 800 | 2,500 | 6,000 |
| 15 Jul (launch) | 1,200 | 3,500 | 8,000 |

- A **first-time unknown game** often launches with 500-1,500 wishlists; **7,000-10,000** is the usual level to appear in "Popular Upcoming" and get a strong first week; **3,000 or more** is a healthy goal for this project.
- Rough conversion: about **10-20% of wishlists become purchases in the first weeks** (a lot of them in the launch week and the first sale). So 3,500 wishlists is roughly 350 to 700 copies in the first months: at US$4.99 and Steam's 30% cut that is about US$1,200 to 2,400 before taxes. It is a good first release and a way to learn, not a salary. Plan the next project and updates.

## Phase 4: Steam Playtest (Feb - Mar 2027)

- [ ] **Mon 18 Jan**: in Steamworks, add **Steam Playtest** to the app (a separate playtest app, free; it needs the store page to be reviewed first; verify the current steps).
- [ ] **Mon 1 Feb**: upload the wrapper build to a playtest branch, set "request access" on the Coming Soon page (this builds your wishlist-like "playtest signups" and gives you real players).
- [ ] **Mon 8 Feb**: accept 100-300 testers in batches (the first 50, then more every few days). Make a short **feedback form** (Google Form: did you understand the Forge, Danger meter, offline farming; did anything crash; the price you would pay) and a Discord channel.
- [ ] **Mar 2027**: fix the top 10 issues (crashes, confusing screens, save bugs); thank every tester by name in the credits if they agree.
- [ ] **Do not skip the Steam Deck check** if the playtest gives you a Deck owner.

## Phase 5: demo and Next Fest (Apr - Jun 2027)

- [ ] **Mon 5 Apr**: build the **demo**: Pinewood Vale and Mirewood (six stages, two bosses), 3 heroes, with a clear "wishlist the full game" end screen. Steam rules: the demo is its own app (create it in Steamworks), free, with its own store page (a demo button on the main page). Saves must not carry into the full game unless you build that on purpose.
- [ ] **Mon 19 Apr**: submit the demo for **build review** (about 3-5 business days).
- [ ] **Steam Next Fest, June 14-21, 2027** (verified at Steamworks: Feb 22 - Mar 1, 2027 and June 14-21, 2027 are the official events; **registration is due several weeks before each**, for February by 10 January 2027, so check the exact June deadline on the Next Fest page the day it opens). **Mon 12 Apr**: register the game and the demo for the June fest as soon as registration opens.
- [ ] **June 14-21**: stay present: answer comments, post a devlog the day it starts, stream or live-chat one evening. Typical result for a small game with a decent demo: **1,000 to 3,000 new wishlists** in the week; with a weak page, 200-500.
- [ ] The **February Next Fest** (22 Feb - 1 Mar 2027): skip it unless the demo and the Steam build are ready by early February. You do not need both, and the first showing of a demo should be the best one.

## Phase 6: release preparation (Jun - Jul 2027)

- [ ] **Mon 17 May**: set the **release date** (15 July 2027) in Steamworks once the build is final; it is public as soon as you set it, so only do it when you are sure. Check the Steam 2027 sale calendar: do not release in the 2 weeks before a big sale or during it, so the game is not buried (move the date if it collides).
- [ ] **Mon 24 May**: **final price and launch discount** (see `store-page.md`: US$4.99, 15% off the first week), regional prices checked, **age rating questionnaire** done, **content survey** (AI) done and matching the page text, **achievements** published, **Steam Cloud** configured, store page "Mark ready for review".
- [ ] **Mon 31 May**: upload the **release build** via SteamPipe (`steamcmd` + a depot script) to the default branch, **submit it for review**; build review takes about **3-5 business days**; the store page is reviewed again if it changed. Fix what is asked; resubmit.
- [ ] **Mon 14 Jun**: Next Fest week (see above).
- [ ] **Mon 5 Jul**: release candidate frozen. Last full playthrough on a clean Windows install (no Node, no browser), on a low-end PC and (if you can) on a Steam Deck. Fix only crashes.
- [ ] **Mon 5 Jul - Wed 14 Jul**: press and creator keys sent (10-30 people, 5 days before), the launch trailer final, the **"Release date: 15 July" announcement** written (Steam announcement, Discord, social), the launch discount set up in Steamworks (set a start and end; Steam lets you set a launch discount of up to 40%; use 15%).
- [ ] **Wed 14 Jul**: the day before: check in Steamworks that the build is approved and the Release button is available for 15 July. Sleep.

## Release day: Thursday 15 July 2027

By convention Steam games go live at about **10:00 AM Pacific** (the time the Release button is pressed or the date is reached; check the time zone in Steamworks). Be awake and calm.

- [ ] **Early morning**: check the build is on the default branch; if the release does not start automatically, press **Release Game** in Steamworks > App Admin > Publish (you have to confirm the date, build and price).
- [ ] **Within the first hour**: buy the game yourself? **No**: do not buy your own game or ask friends to fake reviews (against Steam rules and Steam can remove your game). Do ask friends who really played it for an honest review.
- [ ] Post the **launch announcement** on the Steam page (it notifies all wishlisters), on Discord, on X / Bluesky, on Reddit (once, where allowed), and your own channels; send the Discord ping.
- [ ] Reply to **every** review and forum post in the first 24 hours, politely. Be present in the Discord all day.
- [ ] Watch for crashes: keep the Steam build, the log files and an email address ready. If a crash is common, put out a patch the same day (a bug-fix update is a good reason for an announcement).
- [ ] Take a screenshot of the wishlist graph and sales at hour 1, 6 and 24 for your own notes (it is gold for planning the next game).
- [ ] Check the **launch discount** is live (15%, 7 days).

## First week (16-22 July 2027)

- [ ] **Day 2 (Fri 16 Jul)**: first patch for the top 3 bugs and a "thank you" post with the one-day numbers (shared only if you want to).
- [ ] **Day 3-7**: ask satisfied players in the Discord and Steam forum to leave a review; never offer a reward. Get to **10 reviews** (Steam shows an overall rating at 10) and then **50**: that is when the page starts to convert better.
- [ ] Post a short **dev diary** and the 10 clips again with the discount reminder; contact the creators who played it for a thank-you.
- [ ] **Day 7 (Thu 22 Jul)**: the launch discount ends; write down total sales, wishlists remaining, reviews and their top complaints. Plan **one content update within 4-6 weeks** (a new hero or region, Steam achievements if you shipped without), and announce it: updates are free advertising on Steam, and they are what keep a small game selling.
- [ ] **Day 30**: the first payout is calculated after the end of the month and paid about 30 days later (a one-month delay). Your first US$1,000 of revenue triggers the US$100 fee refund (verified in the Steamworks docs).

---

## What to do if wishlists are low

Check at three points: **11 April (3 months out)**, **12 June (2 days before Next Fest)** and **1 July (2 weeks before launch)**.

1. **Do not launch into silence.** If you have under about **1,000 wishlists two weeks before release**, **move the release date** (a later Next Fest, a quieter calendar week in autumn). A launch week is worth much less than a month of audience building. Changing the date is free; just announce it.
2. **Find out where the problem is** (Steamworks traffic report):
   - **Few visits** (under ~2,000 in a month): the game is unseen. Fix by posting more, in more places (clips, Reddit, Discord, streamers), joining a **themed Steam sale / festival** page (Idler fest, Cozy fest, RPG fest, when one is open; apply early).
   - **Many visits, few wishlists** (under 5-8%): the page is the problem. Check: does the **capsule** read at 231 px; is the first screenshot an action shot; does the **trailer hook** (the first 5 seconds) work muted; are the **tags** right (wrong tags bring the wrong people); does the **short description** say what you play in one breath.
   - **Wishlists but low demo plays**: the demo is hard to start or too slow. Shorten the first 10 minutes: skip to the first boss and the first merge.
3. **Do not buy ads** until the page converts at 10% or more; ads send people to a page that does not sell yet. Steam's own "wishlist" ads are cheap, test with US$50 only after fixing the page.
4. **Run a second Next Fest** (October 2027) or an event for idlers; every Fest is a fresh chance with a better demo.
5. **Lower the price** only as the last step: a US$4.99 game does not sell more at US$2.99, it just earns less.
6. **Accept the learning**: a low launch is not the end. Games are found over months through updates, sales (30-50%) and creator videos. Ship updates, answer reviews, run a 30% sale at the next Steam seasonal sale, and apply what you learned to the next project.

## Costs and time, honestly

| Item | Cost | Time |
|---|---|---|
| Steam Direct fee | US$100 (recoupable after US$1,000 revenue) | 1 hour + identity checks (1-5 days) |
| Desktop wrapper, achievements, Steam Cloud | $0 (your time) | 2-4 weeks part-time |
| Store page + trailer + clips | $0 (this kit) | 2-3 weeks part-time |
| Demo and playtest | $0 | 2-3 weeks |
| Audience work (clips, devlogs, creators) | $0-100 (optional ads / a domain) | 4-6 hours a week for 6 months |
| Support after launch | $0 | 1-2 hours daily for 2 weeks, then a few hours a week |

**Do not**: contact Steam about the game before you have a page ready for review; promise a date you do not control; use the words "hand-drawn" for the art; buy followers or reviews; use another game's name or artwork; forget to turn off the Test tools before the build you upload.
