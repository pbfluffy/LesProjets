# Trailer plan: Wildlight Expedition

**Length:** 45 seconds (Steam allows longer, but 30-60 s is what store visitors watch; the page's autoplay uses the first seconds, so the hook is everything).
**Format:** 1920x1080, 30 fps (60 fps if your capture allows), H.264 MP4, no black bars, no letterboxing. Upload at 1080p; Steam makes the lower sizes.
**Music:** `assets/music/fight.mp3` (Medieval: Battle, RandomMind, CC0) as the main bed, `assets/music/boss.mp3` (Battle Theme A, cynicmusic, CC0) for the boss beat, `assets/music/village1.mp3` (The Bard's Tale) for the first 5 seconds and the closing card. Credit them in the video description. All tracks are CC0, so no permission is needed.
**Sound:** the game's own recorded sound effects (hits, skills, coins, merge anvil, victory fanfare) are part of the capture; keep them at about 60% under the music so the two do not fight. Record game audio on a separate track.
**No voice-over.** Captions only (large, 2 to 5 words, one line, Georgia / the game's serif heading font, cream on a soft dark band; always readable on a phone).
**Footage must be from the real game** (Steam rule). Capture with OBS at 1920x1080 from the Steam build (or the browser at 1920x1080 using the same saves as in `screenshots.md`). Use the staging recipe there to set up each scene; record 20-30 s of each and cut the best 2-5 s. Slow the speed to 100%, never speed up fights to fake action.

## Storyboard

| Time | Shot | What it shows (how to stage it) | Caption | Music / sound |
|---|---|---|---|---|
| **0:00-0:02** | **Hook 1** | Close, full-frame: Bren's sword hits, a crit number pops gold ("-112!") against the Storm Drake's lightning sky. Start on the impact, not a logo. (Skyreach Spire fight, `castSkill('storm')`.) | *(none)* | Cut straight in on a drum hit; village1 is still ducked low |
| **0:02-0:05** | **Hook 2** | Whip pan to the Danger meter and the big gold **Challenge the boss** button being tapped, the boss banner slams in. | **Lead your heroes** | Fight bed starts, one bar of build |
| **0:05-0:10** | The cast | A fast row of the eight heroes in their idle poses over the painted backdrops (Milo with pitchfork, Bren, Tavi, Iona, Rook, Elric, Maren, Tobin), 0.6 s each. Use the hero pictures at big size over a map. | **8 heroes. 26 weapons.** | Fight bed, steady beat |
| **0:10-0:17** | Auto fight with skills | Goblin Mines fight (shot 6 setup): the party works on its own, Whirlwind, Fireball, Arrow Rain banners fly; skill buttons light up and a finger/cursor taps one. | **Fights run on their own... until you step in** | Fight bed, accent on each skill |
| **0:17-0:22** | Armor | Party tab: tap Maren, the armor row, switch Garb → Chainmail → Plate: the portrait and battle picture change each time (3 cuts of 1.2 s). | **Armor you can see** | Soft pause in the beat, a metal "equip" sound |
| **0:22-0:28** | Boss telegraph | Warlord's Throne: the red banner "Orc Warlord is about to charge!", the red lane, the party reacts, then the boss falls and the **VICTORY** banner with 3 stars. | **Read the boss.** (hold) **Beat the boss.** | **Switch to boss.mp3** on the banner; fanfare on victory |
| **0:28-0:33** | Loot and forge | A weapon drop card ("New weapon!"), then the Forge: "12 merges ready!", tap **Merge all**, tiles flash, a Legendary badge appears. | **Three become one. Up to Legendary** | Anvil / merge sound, bright chime |
| **0:33-0:38** | Offline farming | Send the party to farm, clock cut ("24 hours later" on a plain card), the Farm report: gold, lumber, weapons found. | **Farm while you are away** | Beat drops to the village1 melody under, coin sounds |
| **0:38-0:42** | Six regions | A fast pan across the six painted maps (Pinewood Vale, Mirewood, Frostpeak, Emberwaste, Goblin Warrens, Orc Highlands), a watchtower lighting up on each. | **6 regions. One long road.** | Music rises back to full |
| **0:42-0:45** | End card | The library hero art (`art/library-hero-3840x1240.jpg`, cropped to 16:9 around the party) with the logo (`art/library-logo-1280.png`) centered, then "Wishlist now on Steam" and the Steam logo (use Valve's official asset, only on the end card). Hold 2 s. | **Wildlight Expedition**  *Wishlist on Steam* | Last chord of village1, clean tail, no cut-off |

Pacing rules: no shot longer than 6 s; a visible change every 1.5 to 2 s; the first caption appears at 0:02 (not at 0:00: the first frame is pure action); keep the logo out of the first 5 seconds (it is on the page already); end on the logo at 0:42 so the "wishlist" ask is visible for the last 3 seconds. Put a 10-frame fade only at the very end.

## Checklist for the trailer

- [ ] The first 5 seconds work **muted** (most store visitors have sound off). Test it.
- [ ] Every shot is real game footage (UI visible). No test tools, no build label, no account button.
- [ ] Captions readable on a 5-inch phone; at most 5 words each.
- [ ] Music credits in the description: RandomMind, "Medieval: Battle" / "The Bard's Tale"; cynicmusic, "Battle Theme A" (all CC0, from OpenGameArt.org).
- [ ] AI disclosure on the store page covers the art in the trailer (same art as the game).
- [ ] Export 1920x1080 MP4 (H.264, AAC 192 kbps), under 1 GB; also a 15-second cut of shots 0:00-0:17 for social.
- [ ] Upload to Steamworks as the first trailer (it becomes the page's header video) and to YouTube for the website link.

---

## Ten short vertical clips for social media (9:16, 10-20 s, TikTok / Reels / Shorts)

The game began on phones: record these from the **phone layout** (390x844 in the browser, `?v=dev` ok, hide the test card) and say "on Steam" in the caption, not in the picture. Always start on motion and end on a loop-friendly frame.

1. **"Three of the same becomes one."** Forge: three Common copies, tap Merge, the tile pops to Fine, repeat up to Legendary with a rising tone. Caption: *Merge to Legendary*.
2. **"The boss tells you."** Tight on the red warning line and "about to charge!" banner, party takes a hit anyway, then next time Iron Guard is up and the damage drops. Caption: *Learn the tell*.
3. **"24 hours later."** Send the party out, a clock spins, claim: numbers count up, a Legendary drop card. Caption: *Idle RPG that pays you while you sleep*.
4. **"Armor changes the picture."** One hero, tap through Garb, Leather, Chainmail, Plate in 1 s steps with a beat on each. Caption: *Gear you can see*.
5. **"Start with a pitchfork."** Milo clears Pinewood Path alone with his pitchfork, then a time-lapse of hiring Bren, Tavi, Iona, Rook, Elric, Maren, Tobin. Caption: *From farmhand to expedition*.
6. **"Storm Call vs the Storm Drake."** Slow-motion lightning strike on the boss with the skill banner. Caption: *Cast it yourself or leave Auto on*.
7. **"Tap the signposts."** A fast swipe through the six regions on the home map, each ends on the boss portrait. Caption: *6 regions, 6 bosses*.
8. **"Goblin shaman first."** The shaman heals a goblin, the player taps Piercing Shot, the shaman drops, the pack falls. Caption: *Kill the healer*.
9. **"Danger meter."** The meter goes from *Too strong* to *Fair fight* as a level-up button is tapped three times, then the fight is won with 60% health left. Caption: *Know before you go*.
10. **"Meet the party."** Eight heroes, one per second, idle animation, name on screen, last frame the wishlist button text. Caption: *Who is your favourite?* (ends with a question to bait comments).

Posting plan: 3 clips a week in the 8 weeks before launch, then daily in the launch week. Reuse the same clips on Reddit (r/incremental_games, r/WebGames, r/IndieGaming, r/playmygame: read each subreddit's self-promotion rules first, post once, answer every comment), on X / Bluesky, and in the Steam page's community hub. Post the AI-art disclosure plainly in the first comment if asked; do not hide it. Every post links to the Steam page, never to a shortened URL.
