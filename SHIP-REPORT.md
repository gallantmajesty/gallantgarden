# Ship-Ready Report — Focus Lily (3.5 / 3.6 / 3.7 / 3.8)

Date: 2026-08-06 · Build: `npm run build` OK · Typecheck: `npx tsc --noEmit` clean

**Summary: 24 PASS · 0 FAIL · 5 MANUAL (browser/deploy) · Launch readiness: 8.5/10**

---

## 3.5 — Security hardening audit

### 1. Console logs / debug output — ✅ PASS
Zero `console.log`/`console.debug` in `src/`. Remaining `console.warn/error` are
legitimate error paths. `PerfLogger` is DEV-only. `DebugOverlay` is dead code
(only imported by unregistered scenes) and now fully DEV-gated.

### 2. XSS — ✅ PASS
- `dangerouslySetInnerHTML` exists in exactly 2 places (`NotesEditor.tsx:204`,
  `NoteNode.tsx:161`), both wrapped in `sanitizeHtml(...)` (DOMPurify).
- All user text renders as React text nodes (chat bubbles `ChatWindow.tsx:144`,
  display names, profile fields). Report reasons are a fixed enum — no free text.

### 3. FREE_PLAYER_ID — ✅ PASS
`src/shop/store.ts:11`: `import.meta.env.DEV ? -1 : -1`. Production always
`-1`, never collides with real UUID-based players.

### 4. `window.__` globals — ✅ PASS (fixed)
`DebugOverlay.tsx:38` `window.__debugStats` was unguarded → now `import.meta.env.DEV`-gated.
All others (`LibraryScene.tsx` 84/587/597/672/673/681/682/782/786) were already DEV-gated.

### 5. Rate limiting — ✅ PASS (fixed)
- **Before:** client called unlimited RPCs `send_friend_request` / `send_message`; DB
  wrapper functions existed but were never used. ❌
- **After:** client-side limiter `src/lib/rateLimit.ts` (5 friend req/min, 30 msgs/min,
  5 reports/min) + server-side `send_friend_request_limited` (10/min),
  `send_message_limited` (30/min), new `report_user_limited` (5/min).

### 6. SQL injection — ✅ PASS
All `.rpc()` calls use named parameters (`{ p_addressee }`, `{ p_conversation }`, …);
all table access uses the query builder (parameterized). No string concatenation
anywhere in data access. Full scan of migrations + `supabase-schema.sql` clean.

### 7. Edge function JWT enforcement — ✅ PASS (fixed)
- **Before:** `ai-proxy` had `verify_jwt = false` → unauthenticated anyone could burn
  OpenAI/Anthropic budget. ❌
- **After:** `verify_jwt = true` in `supabase/config.toml`. Client already sends the
  session JWT via `supabase.functions.invoke`. Guests lose AI chat (intentional —
  AI costs money).
- Webhooks correctly `false` (Stripe/Razorpay signature auth); checkout/verify `true`.

### 8. Edge function secrets — ✅ PASS
No hardcoded keys anywhere in `supabase/functions/`. All keys read via
`Deno.env.get(...)`. Verified across ai-proxy, stripe-*, razorpay-*.

### 9. Input length limits — ✅ PASS (fixed)
| Field | UI | Client lib | DB CHECK (new migration) |
|---|---|---|---|
| Display name | `maxLength=20` (Onboarding/Profile/Auth) | `slice(0,20)` profile.ts:293 | `profiles_display_name_len` ≤ 20 |
| Chat message | `maxLength=500` (was 4000 — fixed) | `MESSAGE_MAX=500` chat.ts | `messages_body_len` ≤ 500 |
| Report context | enum reason, no free text | `slice(0,1000)` friends.ts | `reports_context_len` ≤ 1000 |

### 10. Error handling dedup — ✅ PASS (fixed)
`main.tsx` crash overlay now reuses the pre-bundle `#crash-error` div from
`index.html` instead of stacking a second overlay.

**3.5 result: 10/10 PASS, 0 FAIL.**

---

## 3.6 — Pre-launch checklist

### Verified by code (PASS — 14)
1. Landing loads — `routes: /` → `Landing`; `dist/` builds; meta/OG/Twitter tags complete
2. Signup / login — `AuthScreen` (email+password, GitHub/Google OAuth); password
   policy ≥8 chars with number/lower/upper/special (config.toml)
3. Onboarding — 3-step (name → character → realm), name validated via `checkDisplayName`
4. Lobby — `Lobby.tsx`, realm grid, guest-mode aware
5. Avatar creator — `/avatar` registered
6. Timer / leaves — `TimerControls`, `PlayerTimerBar`, `ExamTimer`, leaf economy
7. Shop & purchase — `/shop` + `/store`, catalog visible-only items (3.1), Stripe +
   Razorpay checkout/verify/webhook functions
8. Profile — `/profile` + `/u/:playerId`, display name change w/ change budget,
   public profile, sign out
9. Friends & chat — requests, accept/decline, DM chat w/ read receipts, block,
   report (SafetyMenu), profanity filter at render
10. Settings — `LobbySettings`, train `SettingsPanel`
11. Logout — `Profile.tsx:252`, `Lobby.tsx:253`, `GuestMode`
12. Notes — `/notes`, `/notes/doc` (sanitized rich text)
13. Analytics — GA4 `G-P6L9R0BXM2` live in index.html
14. 30fps performance — 2.3 pass (postTier gating, culled lights/particles/draws) — verified pre-build

### Requires manual browser test (MANUAL — 3)
15. Full user journey on dev/preview build (signup → lobby → library → focus → shop)
16. Mobile touch pass (library + train controls)
17. Payment sandbox test (Stripe test mode, Razorpay test) — confirm webhook credits

### Requires deployment action (MANUAL — 2)
18. Set `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` in Vercel env
19. Apply new migrations (`supabase db push`):
    - `20260806000000_add-error-logs.sql`
    - `20260806010000_security-hardening.sql`
    - **also** `20260727010000_add-rate-limits.sql` — the app now calls the
      `_limited` RPCs; if this migration is not deployed, friend requests and
      messages will fail.

---

## 3.7 — Marketing kit ✅ (deliverables in `marketing/`)

- `reddit-post.md` — r/GetStudying post, ~280 words, honest first-launch angle
- `x-thread.md` — 5-tweet launch thread with timing + tips
- `discord-guide.md` — phased server plan, mod/safety rules for a 16yo owner,
  free growth tactics

Landing review (src/screens/public/Landing.tsx): copy is strong — clear hero
("Plant your focus. Grow your forest."), philosophy section, feature tablets,
realm map, FAQ. No changes needed. Minor notes: only 2 of 5 realm pins active
(3 marked Coming Soon) — intentional at launch; FAQ "free" claim consistent with
current monetization (cosmetic-only shop).

---

## 3.8 — Error monitoring ✅

- `src/lib/errorLogger.ts` — zero-config logger (no DSN needed): window error +
  unhandledrejection → `error_logs` table. DEV only console.logs; 200 sends/session
  cap; strips nothing sensitive; includes user id, URL, UA.
- `migrations/20260806000000_add-error-logs.sql` — table + RLS (insert: all, read/delete: owner).
- Wired into `src/main.tsx` via `initErrorReporting()`.
- Future upgrade path: replace `src/lib/sentry.ts` stub with `@sentry/react` when a
  DSN is available — logger API is already shaped like it.

---

## Launch readiness

| Area | Score |
|---|---|
| Security (3.5) | 10/10 |
| Checklist (3.6) | 14/14 code-verified, 5 manual pending |
| Marketing (3.7) | ready to post |
| Monitoring (3.8) | ready (needs migration deploy) |

**READY TO SHIP** once: (1) migrations pushed, (2) Vercel env set, (3) one manual
browser pass, (4) one sandbox payment test.
