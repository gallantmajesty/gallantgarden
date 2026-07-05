// Lightweight anonymous match analytics — no PII, localStorage counters only

const KEY = 'lp.analytics'

interface MatchAnalytics {
  matchesPlayed: number
  matchesCompleted: number
  totalSurvivalTime: number
  bestPlacement: number
  totalPlacementSum: number
  disconnectCount: number
}

function load(): MatchAnalytics {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw) as MatchAnalytics
  } catch { /* ignore */ }
  return { matchesPlayed: 0, matchesCompleted: 0, totalSurvivalTime: 0, bestPlacement: 99, totalPlacementSum: 0, disconnectCount: 0 }
}

function save(data: MatchAnalytics) {
  try { localStorage.setItem(KEY, JSON.stringify(data)) } catch { /* ignore */ }
}

export function recordMatchStart() {
  const data = load()
  data.matchesPlayed++
  save(data)
}

export function recordMatchComplete(survivalTime: number, placement: number) {
  const data = load()
  data.matchesCompleted++
  data.totalSurvivalTime += survivalTime
  data.totalPlacementSum += placement
  if (placement < data.bestPlacement) data.bestPlacement = placement
  save(data)
}

export function recordDisconnect() {
  const data = load()
  data.disconnectCount++
  save(data)
}

export function getMatchAnalytics(): MatchAnalytics {
  return load()
}

export function clearAnalytics() {
  try { localStorage.removeItem(KEY) } catch { /* ignore */ }
}
