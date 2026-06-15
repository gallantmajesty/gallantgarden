// Task Magnet — the student's private "second brain" / life HQ.
// Everything here is owned by one student and never shared. The whole model is
// persisted client-side per user (see src/store/magnet.ts), so it stays instant
// and fully private; a future pass can mirror it into InsForge behind RLS.

export type Priority = 'low' | 'medium' | 'high' | 'urgent'
export type Recurrence = 'none' | 'daily' | 'weekly' | 'monthly'
export type LifeArea = 'academic' | 'personal' | 'health' | 'career' | 'creative' | 'social'

export interface SubTask {
  id: string
  title: string
  done: boolean
}

export interface Task {
  id: string
  title: string
  notes: string
  priority: Priority
  subject: string // free-form subject/course tag, e.g. "Physics"
  area: LifeArea
  done: boolean
  due: string | null // ISO date (yyyy-mm-dd)
  estimateMin: number // planned minutes (0 = unset)
  recurring: Recurrence
  subtasks: SubTask[]
  icon: string
  color: string
  projectId: string | null
  createdAt: string // ISO timestamp
  completedAt: string | null
}

export interface Project {
  id: string
  title: string
  color: string
  icon: string
  createdAt: string
}

export type GoalKind = 'short' | 'long' | 'life' | 'dream'

export interface Milestone {
  id: string
  title: string
  done: boolean
}

export interface Goal {
  id: string
  title: string
  detail: string
  kind: GoalKind
  progress: number // 0..100
  target: string | null // target date (yyyy-mm-dd)
  color: string
  milestones: Milestone[]
  createdAt: string
}

export interface Habit {
  id: string
  title: string
  icon: string
  color: string
  history: string[] // yyyy-mm-dd dates the habit was completed
  createdAt: string
}

export interface Idea {
  id: string
  text: string
  pinned: boolean
  createdAt: string
}

export interface VisionCard {
  id: string
  title: string
  emoji: string
  color: string
  note: string
}

export interface FocusSession {
  id: string
  date: string // yyyy-mm-dd
  minutes: number
  subject: string
}

export interface Achievement {
  id: string
  title: string
  detail: string
  icon: string
  at: string // ISO timestamp earned
}

// The full private universe of one student.
export interface MagnetData {
  tasks: Task[]
  projects: Project[]
  goals: Goal[]
  habits: Habit[]
  ideas: Idea[]
  vision: VisionCard[]
  focus: FocusSession[]
  achievements: Achievement[]
  brainDump: string
  subjects: string[]

  // progression / connection to Focus Lily
  xp: number
  unlockedThemes: string[]

  // personalization
  themeId: string
  accent: string | null // overrides theme accent when set
  particleDensity: number // 0..1
  font: string

  lastVisit: string | null // ISO timestamp of previous visit
}

export const AREA_META: Record<LifeArea, { label: string; icon: string; color: string }> = {
  academic: { label: 'Academic', icon: 'book', color: '#6c8cff' },
  personal: { label: 'Personal', icon: 'heart', color: '#ff7eb3' },
  health: { label: 'Health', icon: 'spark', color: '#46d6a0' },
  career: { label: 'Career', icon: 'rocket', color: '#ffb454' },
  creative: { label: 'Creative', icon: 'palette', color: '#b76cff' },
  social: { label: 'Social', icon: 'people', color: '#4fd1e0' },
}

export const PRIORITY_META: Record<Priority, { label: string; color: string; weight: number }> = {
  low: { label: 'Low', color: '#8aa0b6', weight: 1 },
  medium: { label: 'Medium', color: '#4fb0e0', weight: 2 },
  high: { label: 'High', color: '#ffa53d', weight: 3 },
  urgent: { label: 'Urgent', color: '#ff5d6c', weight: 4 },
}

// ---- XP / level curve -------------------------------------------------------
// Gentle quadratic-ish curve: every level costs a little more than the last.
export const XP_PER_TASK = 12
export const XP_PER_FOCUS_MIN = 1
export const XP_PER_HABIT = 8
export const XP_PER_MILESTONE = 25

export function levelForXp(xp: number): number {
  return Math.floor(Math.sqrt(Math.max(0, xp) / 100)) + 1
}
export function xpForLevel(level: number): number {
  return Math.pow(level - 1, 2) * 100
}
export function levelProgress(xp: number): { level: number; into: number; span: number; pct: number } {
  const level = levelForXp(xp)
  const base = xpForLevel(level)
  const next = xpForLevel(level + 1)
  const span = next - base
  const into = xp - base
  return { level, into, span, pct: span > 0 ? Math.min(1, into / span) : 1 }
}
