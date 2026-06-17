import { insforge } from './insforge'
import { getRank } from './ranks'
import { levelForXp } from './magnet/types'

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
  trees: number
  notes: number
}

/** Count the user's planted trees + grown notes (owner-scoped via RLS). */
export async function loadStudyCounts(userId: string): Promise<StudyCounts> {
  const [trees, notes] = await Promise.all([
    insforge.database
      .from('trees')
      .select('*', { count: 'exact', head: true })
      .eq('owner_id', userId),
    insforge.database
      .from('sticky_notes')
      .select('*', { count: 'exact', head: true })
      .eq('owner_id', userId),
  ])
  return {
    trees: trees.count ?? 0,
    notes: notes.count ?? 0,
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
  const rank = getRank(i.rankId)
  const level = levelForXp(i.xp)
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
      id: 'notes',
      label: 'Notes Grown',
      icon: 'note',
      value: String(i.counts.notes),
      sub: 'sticky notes',
      state: 'ready',
      accent: '#ffce54',
    },
    {
      id: 'trees',
      label: 'Trees Planted',
      icon: 'leaf',
      value: String(i.counts.trees),
      sub: 'in your forest',
      state: 'ready',
      accent: '#6bbf4f',
    },
    {
      id: 'rank',
      label: 'Current Rank',
      icon: 'trophy',
      value: rank.name,
      sub: `Level ${level}`,
      state: 'ready',
      accent: rank.accent,
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
