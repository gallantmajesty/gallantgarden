# Focus Score v2 — "YouTube Studio for your studying"

> One screen where a user can read their entire study life at a glance — the way
> YouTube Studio reads a channel: big numbers, honest deltas, one clear graph,
> and a plain-language takeaway. No hidden penalties, no dead widgets.

---

## 1. Vision

The Focus Score panel becomes the **single analytics hub** of the app. It replaces
tabs, module highlights, penalty messaging, and dead widgets with one coherent,
scannable dashboard:

- **Range selector** — Today | Month | Year (the "partition of today and month").
- **4 big KPI cards** — number, caption, and a green/red % chip *vs previous period*.
- **One large adaptive graph** — hourly today, daily this month, monthly this year.
- **Lifetime strip** — Active Hours, Leaves Earned, Sessions, Avg Session, Lost = 0.
- **Insight line** — a deterministic coaching sentence, like YouTube's "why this changed".

Everything is **computed live from the user's real session history** — no separate
tracking, no dead data.

---

## 2. Design language (mirrors the app's own magnet analytics)

Reuse the existing YouTube-style visual language already in the app
(`premium.css`, classes `.mg-kpis` / `.mg-kpi`):

| Element | Style |
|---|---|
| KPI card | hairline border card, icon + label + huge tabular number + caption + % chip |
| % chip | green `#46d6a0` (good) / red `#e25b4b` (bad), suffix "vs prev" |
| Chart | gradient-filled area + line, hover guide + tooltip, 3 gridlines |
| Cards | `.sp-card` — subtle surface, hairline border, rounded 14px |
| Range pills | segmented control, active = tinted inset ring |

Fonts: `font-variant-numeric: tabular-nums` everywhere numbers are shown.

---

## 3. Data layer (single source of truth)

| Source | Shape | Used for |
|---|---|---|
| `pomodoro.history` (`sg.pomo.history` localStorage) | `SessionHistoryEntry { id, date: ISO, timerType, focusMode, sessionMinutes, breakCount, breakDurations, totalFocusMinutes, leavesEarned, completed, subject, segmentRewards }` | **Everything.** Focus minutes, earned leaves, session count, active days, chart buckets, streak |
| `compute24hStreak(timestamps: number[])` in `lib/magnet/insights.ts` | returns `{ current, longest }` | Day Streak KPI under the 24-hour rule (return within 24h counts the day; calendar midnight never breaks it) |
| `sf.score.history` (localStorage) | `DayRecord { date, login, activeMin, earned, rankId }` mirror written by ScorePanel | Owner dashboard rank history — written as a side effect, never read for KPIs |

**Removed forever** (per the user's earlier list — already done in code):
best streak everywhere, the lives/penalty system (xpEngine, magnet hydrate, LoginPanel,
Lobby popup, OwnerRewardsTab, penalty CSS), daily caps (`DAILY_CAPS`,
`getDailyCapInfo`, `activeMinCap`), module highlight cards, the 30-day "Active Time"
label (→ lifetime), and the breaks / library / web / online tabs.

---

## 4. Metric engine (the hard, testable core)

Extract all math into pure functions in a new `src/lib/focusScore.ts` so the panel
is dumb rendering and every number is provable:

```ts
// ── range aggregation ─────────────────────────────────────────────────────
export interface RangeStats {
  minutes: number        // total focus minutes in window
  earned: number         // leaves earned in window
  sessions: number
  activeDays: number     // distinct days with activity
  prevMinutes: number    // same-length window before it
  delta: number          // (minutes − prevScaled) / prevScaled, 0 when no prev
}
export function aggregateRange(history, period: 'today'|'month'|'year', now: Date): RangeStats
```

Delta honesty rule: mid-period the previous window is **scaled by elapsed days**
(today→yesterday exact; month→last-month × elapsed/31; year→last-year × elapsed/365),
so "you're 20% ahead of last month" is true on the 15th, not just the 31st.

```ts
// ── chart buckets ─────────────────────────────────────────────────────────
export function bucketize(history, period, now): { label: string; value: number }[]
// today → 24 hourly buckets (label "00h"…"23h")
// month → last 30 calendar days (label day-of-month)
// year  → 12 monthly buckets (label "Jan"…"Dec")

// ── lifetime ──────────────────────────────────────────────────────────────
export function lifetimeStats(history): {
  minutes, earned, sessions, activeDays, avgSession
}

// ── insight line (deterministic, like the magnet's "why") ─────────────────
export function buildInsight(stats: RangeStats, streak: number, life: LifetimeStats, period): string
// empty → "Start a focus session — this dashboard fills in live."
// no focus today → "No focus logged today yet. Your N-day streak is safe — a day
//                    counts as long as you return within 24 hours."
// delta ≥ +10% → "You're N% ahead of <last month> in focus time. Keep the rhythm."
// delta ≤ −10% → "Focus is N% behind <last month>. One 25-minute session starts the comeback."
// else → "Steady pace — X focused this <period>, Y active days overall."
```

**Why pure functions:** they can be unit-tested with hand-built history arrays
(midnight crossings, month boundaries, leap-year Feb, all-zero windows) even though
the repo's test runner is Playwright e2e only.

---

## 5. Component map (top → bottom of the modal)

| # | Block | Component / classes | Data |
|---|---|---|---|
| 1 | Header | `sp-top` — ⚔️ Focus Score, subtitle, ✕ close | — |
| 2 | Range selector | `.sp-period-tabs` + `.sp-tab.active` pills | local state `period` |
| 3 | KPI row | `.sp-kpis` → 4 × `.sp-kpi` | `Kpi` presentational component |
| | ⏱ Focus | value `fmtDuration(range.minutes)`, sub "N sessions", chip `range.delta` | `aggregateRange` |
| | 🔥 Day Streak | `compute24hStreak().current`, sub "returns within 24h count", **no chip** | `insights.ts` |
| | 📅 Active Days | `range.activeDays`, sub "in <Period>" | `aggregateRange` |
| | 🍃 Earned | `range.earned.toLocaleString()`, sub "leaves", chip (earned delta vs prev) | `aggregateRange` |
| 4 | Graph card | `.sp-card` "Focus over time" + hint ("per hour" / "last 30 days" / "this year by month") → `TrendChart` | `bucketize` |
| 5 | Lifetime card | `.sp-card` "Lifetime" → `.sp-life` 5 items; **Lost (leaves) = 0 in green** + caption "No penalties, ever — your leaves and XP never decay from missed days." | `lifetimeStats` |
| 6 | Insight strip | `.sp-insight` ✦ + sentence | `buildInsight` |
| 7 | Close button | `.sf-btn` (existing) | — |

`TrendChart` (SVG, already built): 820×220 viewBox, left axis in minutes, 3 gridlines,
gradient area + line + dots, invisible per-point hit rects, hover guide + tooltip
(`left: %` positioned). Uses the accent `#46d6a0`.

---

## 6. Implementation phases

### Phase 0 — code already on disk ✅
New `ScorePanel.tsx` (KPIs, chart, lifetime, insight, adaptive buckets, deltas),
`compute24hStreak` in `insights.ts`, all penalty/daily-cap/best-streak removals.

### Phase 1 — visual layer (next, ~1 file)
Rewrite `ScorePanel.css` for the new class names:
- `.sp-kpis` grid `repeat(auto-fit, minmax(200px, 1fr))`
- `.sp-kpi` card + `.sp-kpi-ico/label/val/sub/delta`
- `.sp-card` / `.sp-card-head` / `.sp-card-hint`
- `.sp-chart` container + `.sp-grid`, `.sp-axis`, `.sp-line`, `.sp-xlabel`, `.sp-guide`, `.sp-dot`, `.sp-chart-tip(-day/-val)`
- `.sp-life` 5-up grid (2-up on mobile)
- `.sp-insight` tinted strip
- delete dead `.sp-tabs`, `.sp-module-*`, `.sp-trend-*`, `.sp-session-*`, `.sp-kv` blocks
- responsive: single column < 640px, chart min-width with horizontal scroll

Verify: `npx tsc -b --noEmit` (already applied: fixed `prevElapsedDays` month bug,
proper yesterday-key for the earned delta, declared `iconColor` on `Kpi`).

### Phase 2 — engine extraction (pure, testable)
Move the three `useMemo` blocks + `buildInsight` out of `ScorePanel.tsx` into
`src/lib/focusScore.ts` as pure functions. Add a lightweight node test script
(`node --test` style or a `focusScore.test.ts` run via tsx if adding a dep is
acceptable) covering: day boundary, month-start delta scaling, empty history,
Feb 29, all-sessions-same-day.

### Phase 3 — polish & hard-but-manageable stretch (pick any)
- **Recent sessions table** (last 10: date, subject, focus, earned) — users love seeing "what did I actually do"
- **Streak sparkline** in the Day Streak KPI (last 14 days of activity)
- **Best-hour heatmap** (24h × 7d) "when are you most productive"
- **Goal mode** — monthly focus target with a progress ring on the KPI row
- **Copy/share** — one tap copies today's stats as text
- **Weekly digest** — the insight line graduates to a "this week vs last week" panel

### Phase 4 — acceptance checklist
- [ ] `npx tsc -b --noEmit` clean for touched files
- [ ] Lobby → Score: KPIs render; toggle Today/Month/Year updates numbers + chart + hint
- [ ] Deltas correct at month boundaries (elapsed-day scaling)
- [ ] Chart buckets: 24 hourly (today) / 30 daily (month) / 12 monthly (year)
- [ ] Day Streak follows the 24h rule; no "best streak" text anywhere (`grep -ri "best.*streak"`)
- [ ] No penalty/daily-cap references left (`grep -rni "penalty\|daily.?cap\|maxMin" src`)
- [ ] Lost (leaves) shows **0** with the no-penalty caption — removal is *visible*
- [ ] Mobile: single-column, no overflow

---

## 7. Design decisions locked in

1. **Delta chip color = outcome, not direction** — earning fewer leaves than yesterday
   is *red* even though it's a number going down. `deltaGood` lets each KPI decide.
2. **Streak has no delta chip** — a streak is a state, not a change; chips on it would
   be noise.
3. **Lost is shown as 0, not hidden** — the user explicitly asked "how will the user
   get to know lightly" that the penalty is gone. A green 0 + caption does that.
4. **Lifetime is absolute truth** — never windowed, never rounded down; hours keep
   minutes (`fmtDuration`: "3h 24m", never "3h").
5. **All text is i18n-ready** — hardcoded English today (matches the rest of the app's
   ScorePanel history), but the insight builder returns strings in one place so
   translation later touches one function.
