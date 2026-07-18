import { insforge } from './insforge'
import { rankForTotalXp, RANKS } from './ranks'

// Profile statistics. We surface REAL numbers wherever a data source exists
// (focus sessions + minutes from the pomodoro store, notes/trees from the DB,
// rank from the profile, achievements/level from the magnet store) and mark the
// not-yet-tracked metrics with state:'soon' so the dashboard stays honest
// instead of showing fabricated figures.

export interface StatCard {
  id: string
  label: string
  /** magnet Icon name (SVG, no emoji) */
  icon: string
  /** formatted value, or null when state === 'soon' */
  value: string | null
  sub?: string
  state: 'ready' | 'soon'
  accent: string
}

export interface StudyCounts {
  blueprints: number
}

/** Count the user's blueprints (owner-scoped via RLS). */
export async function loadStudyCounts(userId: string): Promise<StudyCounts> {
  const [notes] = await Promise.all([
    insforge
      .from('blueprints')
      .select('*', { count: 'exact', head: true })
      .eq('owner_id', userId),
  ])
  return {
    blueprints: notes.count ?? 0,
  }
}

function formatHours(min: number): string {
  if (min < 60) return `${min}m`
  const h = min / 60
  return h >= 10 ? `${Math.round(h)}h` : `${h.toFixed(1)}h`
}

export interface StatsInput {
  focusSessions: number
  totalFocusMin: number
  counts: StudyCounts
  rankId: string | null
  xp: number
  achievementsUnlocked: number
  interestCount: number
}

/** Assemble the ordered set of stat cards from real + pending sources. */
export function buildProfileStats(i: StatsInput): StatCard[] {
  const totalXp = i.xp
  const rankObj = rankForTotalXp(totalXp)
  const rankIdx = Math.max(0, RANKS.findIndex((r) => r.id === rankObj.id))
  return [
    {
      id: 'study-hours',
      label: 'Total Study Hours',
      icon: 'clock',
      value: formatHours(i.totalFocusMin),
      sub: 'focused time',
      state: 'ready',
      accent: '#5ec6e6',
    },
    {
      id: 'focus-sessions',
      label: 'Focus Sessions',
      icon: 'fire',
      value: String(i.focusSessions),
      sub: 'completed',
      state: 'ready',
      accent: '#ff6a1a',
    },
    {
      id: 'blueprints',
      label: 'Blueprints',
      icon: 'note',
      value: String(i.counts.blueprints),
      sub: 'boards',
      state: 'ready',
      accent: '#ffce54',
    },
    {
      id: 'rank',
      label: 'Current Rank',
      icon: 'trophy',
      value: rankObj.name,
      sub: `Tier ${rankIdx + 1}`,
      state: 'ready',
      accent: rankObj.accent,
    },
    {
      id: 'achievements',
      label: 'Achievement Progress',
      icon: 'star',
      value: String(i.achievementsUnlocked),
      sub: 'unlocked',
      state: 'ready',
      accent: '#e8b300',
    },
    {
      id: 'interests',
      label: 'Study Interests',
      icon: 'brain',
      value: String(i.interestCount),
      sub: 'categories',
      state: 'ready',
      accent: '#8a6cff',
    },
    {
      id: 'homework',
      label: 'Homework Completion',
      icon: 'check',
      value: null,
      sub: 'tracking soon',
      state: 'soon',
      accent: '#46b84a',
    },
    {
      id: 'consistency',
      label: 'Study Consistency',
      icon: 'chart',
      value: null,
      sub: 'tracking soon',
      state: 'soon',
      accent: '#4fd1c5',
    },
  ]
}
