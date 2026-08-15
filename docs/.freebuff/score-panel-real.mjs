// 1) xpEngine: track penalty losses per day (penaltyLostToday)
// 2) ScorePanel: build the 30-day grid from real pomodoro sessions + engagement
// 3) ScorePanel: streaks from real session dates across the full history
import { readFileSync, writeFileSync } from 'node:fs'

function patch(path, pairs) {
  let s = readFileSync(path, 'utf8')
  for (const [from, to] of pairs) {
    if (!s.includes(from)) {
      console.error(`MISS in ${path}: ${JSON.stringify(from.slice(0, 70))}`)
      process.exit(1)
    }
    s = s.split(from).join(to)
  }
  writeFileSync(path, s)
  console.log(`patched ${path}`)
}

// ---- xpEngine.ts ----
patch('src/lib/xpEngine.ts', [
  // interface DailyRecord: add field
  ["  /** whether today's daily focus claim has been taken */\n  focusClaimed: boolean\n}", "  /** whether today's daily focus claim has been taken */\n  focusClaimed: boolean\n  /** leaves lost to the inactivity penalty today (drives ScorePanel \"Lost\") */\n  penaltyLostToday: number\n}"],
  // loadDaily: parse it
  ["  activeMinToday: (parsed.activeMinToday as number) || 0,\n  focusClaimed: (parsed.focusClaimed as boolean) || false,\n    }", "  activeMinToday: (parsed.activeMinToday as number) || 0,\n  focusClaimed: (parsed.focusClaimed as boolean) || false,\n  penaltyLostToday: (parsed.penaltyLostToday as number) || 0,\n    }"],
  // freshDaily: init it
  ["  activeMinToday: 0,\n  focusClaimed: false,\n  }", "  activeMinToday: 0,\n  focusClaimed: false,\n  penaltyLostToday: 0,\n  }"],
  // checkInactivityPenalty: record the loss before returning the deduction
  ["  return {\n    leaves: -Math.min(currentLeaves, penalty),", "  daily.penaltyLostToday = (daily.penaltyLostToday ?? 0) + Math.min(currentLeaves, penalty)\n  saveDaily(daily)\n\n  return {\n    leaves: -Math.min(currentLeaves, penalty),"],
  // getDailyEngagement: expose it
  ["    focusClaimLeaves: XP_VALUES.dailyFocusClaim,\n  }", "    focusClaimLeaves: XP_VALUES.dailyFocusClaim,\n    penaltyLostToday: daily.penaltyLostToday ?? 0,\n  }"],
])

// ---- ScorePanel.tsx (grid from real data) ----
patch('src/components/ScorePanel.tsx', [
  ["  const pomoHistory = usePomodoro((s) => s.history)\n  const [history, setHistory] = useState<DayRecord[]>([])\n  const [tab, setTab] = useState<TabKey>('overview')\n\n  useEffect(() => {\n    const stored = loadHistory()\n    const now = new Date()\n    let base: DayRecord[]\n    if (stored.length === 0) {\n      base = []\n      for (let i = DAYS - 1; i >= 0; i--) {\n        const d = new Date(now)\n        d.setDate(d.getDate() - i)\n        base.push({\n          date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,\n          login: false,\n          activeMin: 0,\n          earned: 0,\n          lost: 0,\n          net: 0,\n          rankId: 'bronze-1',\n        })\n      }\n      saveHistory(base)\n    } else {\n      base = stored\n    }\n    // Ensure today's record exists and carries today's live active minutes.\n    const tk = todayKey()\n    const eng = getDailyEngagement()\n    const withToday = base.some((r) => r.date === tk)\n      ? base\n      : [\n          ...base,\n          {\n            date: tk,\n            login: true,\n            activeMin: eng.activeMinToday,\n            earned: 0,\n            lost: 0,\n            net: 0,\n            rankId: 'bronze-1',\n          },\n        ].slice(-DAYS)\n    setHistory(withToday)\n  }, [])\n\n  const engagement = getDailyEngagement()",
    "  const pomoHistory = usePomodoro((s) => s.history)\n  const [tab, setTab] = useState<TabKey>('overview')\n\n  const engagement = getDailyEngagement()\n\n  // ── 30-day grid built from REAL data: pomodoro sessions grouped by day, plus\n  //    today's live engagement and any recorded penalty losses. The stored\n  //    sf.score.history is kept as a mirror (owner tab) and as the source of\n  //    legacy per-day \"lost\" values.\n  const history = useMemo<DayRecord[]>(() => {\n    const stored = loadHistory()\n    const storedByDate = new Map(stored.map((r) => [r.date, r]))\n    const now = new Date()\n    const tk = todayKey()\n    const byDay = new Map<string, { min: number; earned: number; count: number }>()\n    for (const h of pomoHistory) {\n      const day = h.date.slice(0, 10)\n      const g = byDay.get(day) ?? { min: 0, earned: 0, count: 0 }\n      g.min += h.totalFocusMinutes\n      g.earned += h.leavesEarned ?? 0\n      g.count += 1\n      byDay.set(day, g)\n    }\n    const rows: DayRecord[] = []\n    for (let i = DAYS - 1; i >= 0; i--) {\n      const d = new Date(now)\n      d.setDate(d.getDate() - i)\n      const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`\n      const g = byDay.get(date)\n      const prev = storedByDate.get(date)\n      const isToday = date === tk\n      const sessionMin = g?.min ?? 0\n      const earned = g?.earned ?? 0\n      let lost = prev?.lost ?? 0\n      if (isToday) lost += engagement.penaltyLostToday ?? 0\n      rows.push({\n        date,\n        login: isToday || (g?.count ?? 0) > 0,\n        activeMin: isToday ? Math.max(sessionMin, engagement.activeMinToday) : sessionMin,\n        earned,\n        lost,\n        net: earned - lost,\n        rankId: prev?.rankId ?? 'bronze-1',\n      })\n    }\n    return rows\n  }, [pomoHistory, engagement.activeMinToday, engagement.penaltyLostToday])\n\n  // Mirror the derived grid so the owner tab (sf.score.history) sees real data.\n  useEffect(() => {\n    saveHistory(history)\n  }, [history])"],
])

// ---- ScorePanel.tsx (streaks from real session dates) ----
patch('src/components/ScorePanel.tsx', [
  ["  const currentStreak = useMemo(() => {\n    let streak = 0\n    for (let i = history.length - 1; i >= 0; i--) {\n      if (history[i].login) streak++\n      else break\n    }\n    return streak\n  }, [history])\n  const bestStreak = useMemo(() => {\n    let best = 0\n    let cur = 0\n    for (const r of history) {\n      if (r.login) { cur++; best = Math.max(best, cur) }\n      else cur = 0\n    }\n    return best\n  }, [history])",
    "  // Streaks from REAL session dates across the full pomodoro history (not the\n  // 30-day grid, so a streak older than 30 days isn't truncated). Consecutive\n  // days with at least one focus session count — same logic as the pomodoro\n  // summary's streak.\n  const { currentStreak, bestStreak } = useMemo(() => {\n    const days = [...new Set(pomoHistory.map((h) => {\n      const d = new Date(h.date)\n      d.setHours(0, 0, 0, 0)\n      return d.getTime()\n    }))].sort((a, b) => a - b)\n    let best = 0\n    let cur = 0\n    let prev: number | null = null\n    for (const t of days) {\n      cur = prev !== null && t - prev === 86400000 ? cur + 1 : 1\n      best = Math.max(best, cur)\n      prev = t\n    }\n    return { currentStreak: cur, bestStreak: best }\n  }, [pomoHistory])"],
])
