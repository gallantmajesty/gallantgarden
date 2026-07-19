# StudyForest (FocusLily) — A Deep Study

## What this web *is* and why it exists

StudyForest — branded "FocusLily" in places — is a **gamified, multiplayer study platform** that wraps serious productivity tools (focus timer, tasks, notes, study rooms, a 3D "realm") in a Free-Fire / Clash-of-Clans-style game shell. The design goal is **retention through game feel**: instead of a dry to-do app, you get avatars, ranks, a competitive ladder, themed 3D worlds, ambient audio, and a social layer so studying feels like hanging out in a cozy, magical library with other people.

It's a **React + TypeScript single-page app** (Vite) backed by **InsForge** (a Postgres-based backend-as-a-service: database, auth, realtime, file storage). Multiplayer presence is run over **Supabase realtime channels** (InsForge's realtime layer). The 3D worlds are built with **Three.js** (a "library" world and a "train station" world), plus a browser-based mini-game ("Lava Pad").

The project file is `C:\Users\taksh\studyforest`. Stack highlights: Zustand for state, react-router for navigation, react-i18next for (at least English) localization, and a lot of custom CSS-var theming.

---

## How it works (the loop)

1. **Auth + onboarding.** You sign in (AuthScreen), go through Onboarding, pick a character and a display name.
2. **The Lobby** is your home base — a themed hub (Web Customization) where you launch every feature.
3. **You study, and you earn XP.** Two currencies:
   - **Leaves** (regular XP) — earned *only* from real study time (focus sessions, train journeys, library time). Tasks/habits award **0** leaves (anti-farm).
   - **Golden leaves** (premium XP) — earned from engagement habits & achievements (daily login, streaks, deep-work, social study, blueprints).
4. **Rank climbs** automatically as `total_xp = leaves + golden_leaves` crosses thresholds.
5. **You socialize** in live 3D Realms, send friend requests, follow people, chat (friend-only DMs/groups), and view public profiles at `/u/:playerId`.

XP is protected by an **anti-spam / daily-caps** engine (`src/lib/xpEngine.ts`): focus XP only counts for visible-tab time; train journeys have diminishing returns after 60 min/day and cut off at 120 min; there is a debounced DB sync with localStorage as the offline-authoritative store.

---

## Everything it has (small to big)

**Small / atomic:**
- Pomodoro focus timer (`store/pomodoro.ts`), streaks, daily login bonus.
- Mascots & character art (the `mascot-*.png` set) and ambient audio (`birds`, `rain`, `train-rumble`, `door-open`, etc. under `public/audio`).
- UI icons (`public/icons/ui/*`), rank badges, character SVGs.

**Mid:**
- **Notes** (NotesHub / NotesEditor) — a notes system.
- **Blueprint** — a node-based visual thinking canvas (canvas, edges, mini-map, AI/Jarvis panel, search) for mind-mapping study material.
- **Task Magnet** — a "magnet" dock with views: Dashboard, Tasks, Habits, Goals, Calendar, Analytics, Sanctuary, Sheet, Weekly Review. This is the productivity core.
- **Calc Hub** — a floating multi-module calculator (math, science, finance, health, conversions, daily, utilities).
- **Study Rooms** (`/rooms`, `/room/:id`) — focused rooms, with presence.
- **Realm** — the live 3D worlds (Library + Train Station), with Explore and invite (`/realm/:code`).
- **Games** — a Lava Pad 3D mini-game with matchmaking/lobbies, plus a "break" game-integration that gates play during study.
- **TrainX** — a train-themed study journey with booking UI and a study HUD.
- **Profile** (`/profile` and public `/u/:playerId`) — the customizable "study base."
- **Avatar Creator / Character Selection** — pick and customize a character.
- **Friends / Social** — friend requests, follow/unfollow, follower/following lists, chat, study status.

**Big / systemic:**
- A **real-time multiplayer engine** (presence, movement, seat claims, shared cinematic camera) across realms.
- A **rank ladder** of 19 ranks.
- A **theming engine** that re-skins the entire app via CSS variables.
- An **InsForge backend** (auth, DB, storage, realtime, AI gateway, payments-ready).

---

## The rank system

Defined in `src/lib/ranks.ts`. It is **Free-Fire–inspired**: 7 tiers × 3 subdivisions + 1 apex rank = **19 ranks**.

Tiers (each with I/II/III):
1. Bronze (0 / 150 / 400)
2. Silver (800 / 1500 / 2500)
3. Gold (4000 / 6000 / 9000)
4. Platinum (13000 / 18000 / 2500→25000)
5. Diamond (34000 / 46000 / 62000)
6. Crystal (82000 / 108000 / 140000)
7. **Focuster** — apex rank at 200,000 total XP.

Numbers are the **`total_xp` (leaves + golden leaves)** needed. The curve is **exponential** (~1.35× between tiers): Bronze→Silver is ~1 week, Diamond→Focuster is months — a deliberate hook-then-grind retention curve. Everyone starts at **Bronze I**; rank upgrades **automatically** when a threshold is crossed (`rankForTotalXp`). Helpers expose `xpToNextRank` and `rankProgress` (0..1 within the current rank). Each rank has a badge image under `/public/icons/ranks` and an accent color for the glow.

---

## The username / identity system — *why* it's designed this way

This app deliberately moved **away from classic text usernames** to a **dual identity model** (see `src/lib/types.ts`, `usernames.ts`, `playerId.ts`, `displayName.ts`):

- **Player ID** (`generatePlayerId`): a random **9-digit number** (100,000,000–999,999,999), assigned once at signup, **permanent**, globally unique (unique index on `profiles.player_id`). It is the **shareable, searchable identity key** — like Free Fire. Profiles are reached at `/u/:playerId`. This avoids the "username taken" friction and impersonation problems of text handles.
- **Display name** (`checkDisplayName`): the user-facing name (2–40 chars, letters/numbers/spaces/`.-'`). It is **NOT unique**, can be changed only **2 times in a lifetime** for free (`DISPLAY_NAME_CHANGES_MAX = 2`); further changes need a paid "Name Card." This mirrors gacha-game naming limits.
- **(Legacy) Username** (`usernames.ts`): still supported for mentions/profile links but validated 3–20 chars `a–z0-9_`, with **reserved words** (`admin`, `system`, `lobby`, `realm`, etc.) blocked and a live availability check. Auto-suggested via `slugifyUsername` / `suggestUsername` / `generateRandomUsername` (`fl_xxxxxx`). The newer Player ID is the primary share key; username is secondary.

**Why this design?** A numeric Player ID is short, shareable, collision-resistant, and removes the "everything good is taken" signup drop-off; the non-unique display name keeps personalization without identity collisions; lifetime name changes create a soft monetization hook.

---

## For whom this is

Students and self-learners of all ages who want **accountability + cozy game aesthetics**. The audience ranges from casual "I need to focus" users (Pomodoro + tasks) to competitive ones chasing ranks and social study, to night-owl/early-bird types (time-of-day XP bonuses). It's multi-device but **desktop-first** — there's a `MobileControlCenter` and `MobileBlocker`/`DesktopOnly` gating, and a `TouchControls` layer, but the 3D realms are clearly built for desktop.

---

## Is it multiplayer?

**Yes — live multiplayer.** The Realm uses Supabase realtime (`src/multiplayer/net.ts`): one channel per room (`realm:<roomId>`) with broadcast events `hello` / `move` / `bye`, plus `cine-state`, `cine-cam`, `seat-claim`, `seat-release`.

- Players see **each other move, animate, and wear their avatar cosmetics in real time** (~10 position updates/sec, only when something changed).
- A **roster** of *real* connected players (no fake counts). Stale players are pruned after 12s.
- A **shared Cinematic Tour** camera: whoever has the lexicographically smallest ID among cinematic viewers "hosts" the camera everyone else renders.
- **Train seats** are claimed/released across players.
- Realms come in two flavors (`src/lib/realm.ts`):
  - **Global Realm** — pre-made public rooms (Library rooms like *Forest Hall*, *Silent Valley*; Train Station rooms like *Platform 1–3*), each capped at **ROOM_CAPACITY = 50**, auto-instancing (#1, #2…) when full.
  - **Custom Realm** — a private world you create (friends-invite ready; creation not payment-gated yet).
- Presence toggle: `REALM_PRESENCE_LIVE = true` (kill-switch).

Study Rooms and the Lava Pad game also have presence/matchmaking. So: the productivity tools are single-player, but the **worlds and games are genuinely multiplayer**.

---

## Lobby customization (Web Customization)

Reached via **Settings → Web Customization** (`src/components/settings/WebCustomization.tsx`, `src/lib/webThemes.ts`). It re-skins the *entire app* by writing CSS custom properties onto `<html>` (`applyWebTheme`), so every widget re-tints (glass, ink, panels, glows) while staying readable.

What you can set:
- **Theme** — pick from: Fantasy 🏛️, Love 💗, Cyber 💻, Cozy Night 🌙. (Coming soon: Sakura 🌸, Ember 🔥.) Each theme has a "mood" line.
- **Background** — choose one full-screen image per theme (e.g., Silent Ruins, Shadow Citadel, Royal Dominion, Matrix Rain, Trading Floor, Study Nook, Night Scholar). Some backgrounds override the glass colors.
- **Accent color** — curated swatches per theme + a **custom color wheel**.
- **Font color** — "Auto" (matches theme) or presets (White/Cream/Charcoal/Ink) + a **custom color wheel**, so text stays legible on any background.
- A separate **"wait for lobby to load before closing intro"** toggle (`LobbySettings.tsx`).

Themes ship as image assets (`/public/themes/*`) plus adaptive palettes (accent, glass fill/strong/border/shadow, ink/ink-soft, panel gradients, scrim, glows).

---

## Personal profile customization (the "study base")

The Profile (`/profile`, editable; `/u/:playerId`, read-only) is a draggable widget dashboard (`src/screens/Profile.tsx`, `src/lib/profileLayout.ts`). The **identity header** (fixed) shows avatar + rank badge + Player ID + country flag + follower/following counts. The **editable widgets** (reorderable by drag, hideable) are:

1. **About** — bio (max 280 chars).
2. **Favorite Subject** — free text.
3. **Study Goals** — chosen via a selector (own profile only).
4. **Interests** — tag chips (max 12).
5. **Study Schedule** — free text.
6. **Performance / Stats** — StatCards (focus sessions, focus minutes, XP, achievements, rank, interest count). On *others'* profiles only the public rank card shows (private data is RLS-protected).
7. **Achievements** — visible to you; **private** on others' profiles ("Achievements are private for now").
8. **Social Links** — up to 6 external links (http/https/mailto only; XSS-guarded).

Other identity editing:
- **Banner** — pick a magical CSS-gradient banner (Aurora, Ember, Forest, Sakura, Midnight, Dawn, Tide, Mystic) **or upload your own image**, with a vertical **position slider** (0–100%).
- **Avatar** — upload + crop (`AvatarCropper`).
- **Display name** — editable (limited free changes; Name Card after).
- **Layout** — order + hidden set saved to localStorage and mirrored to cloud `profileLayout` so it follows you across devices.

The character roster (`src/avatar/characters.ts`) you pick in Character Selection:
- **Common:** James (male), Lily (female), Mia (female), Ruslana (female).
- **Epic:** Dino, Bunny, Piggy (animal costumes).
- **Legendary:** Robot, Alien, Seraphine/Angel (special).
All share one skeleton/height; gender is shown via body shape, hair, clothes, color. Each ships a baked `.glb` with a procedural fallback rig so the app always renders.

---

## Public vs private

**Public (any authenticated user can read via the `public_profiles` view):**
- Display name, Player ID, avatar, country, rank, the `ProfilePublic` blob (bio, favorite subject, schedule, interests, banner, social links).
- Follower/following counts; you can view someone's profile at `/u/:playerId` and see their followers/following/mutual lists.

**Private (never exposed):**
- Email, age, and the `settings` jsonb are explicitly excluded from `PublicProfile`.
- **Achievements** are private on others' profiles.
- **Detailed study stats** (device-local focus data + owner-only RLS) are not readable on someone else's profile — only their public rank card shows.
- Chat is **friend-only** (DMs/groups); `StudyStatus` of `'focus'` silences chat popups. Group conversations cap at **20 members**. Report reasons: spam / harassment / inappropriate.

So the model is: a **public, game-style identity card** (great for the competitive/social hook) layered over **strictly private productivity data**.

---

## Character of the product

In one line: **a cozy, magical, game-fied study MMO-lite** — part productivity suite, part social hangout, part competitive ladder. Its "really character" is the tension between *genuinely useful study tools* (Pomodoro, tasks, notes, blueprints, study rooms) and *addictive game scaffolding* (ranks, leaves/golden-leaves, avatars, themed 3D realms, ambient sound, friends, mini-games). The XP economy is carefully tuned to reward *real study* and *healthy engagement* while resisting farming — a sign the team is thinking about long-term retention and fairness, not just dopamine.

If you want, I can go deeper on any single pillar — e.g., the full Realm networking protocol, the Blueprint node engine, the Lava Pad game, or the InsForge schema/migrations.
