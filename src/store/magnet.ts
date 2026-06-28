import { create } from 'zustand'
import {
  type MagnetData,
  type Task,
  type Goal,
  type VisionCard,
  type Achievement,
  type Priority,
  type LifeArea,
  type Recurrence,
} from '../lib/magnet/types'
import { DEFAULT_THEME_ID, STARTER_THEME_IDS, THEMES } from '../lib/magnet/themes'
import {
  XP_VALUES,
  awardLeaves,
  awardGoldenLeaves,
  syncXpToDb,
} from '../lib/xpEngine'
import { rankForTotalXp } from '../lib/ranks'

// ---- id + time helpers ------------------------------------------------------
let counter = 0
function uid(prefix = 'm'): string {
  counter += 1
  return `${prefix}_${Date.now().toString(36)}_${counter.toString(36)}`
}
function nowIso(): string {
  return new Date().toISOString()
}
function todayKey(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// ---- persistence (per user) -------------------------------------------------
const KEY_PREFIX = 'sf.magnet.v1'
function storageKey(userId: string): string {
  return `${KEY_PREFIX}:${userId}`
}

function emptyData(): MagnetData {
  return {
    tasks: [],
    projects: [],
    goals: [],
    habits: [],
    ideas: [],
    vision: [],
    focus: [],
    achievements: [],
    brainDump: '',
    subjects: ['Maths', 'Physics', 'Chemistry', 'Biology', 'English', 'History'],
    xp: 0,
    premiumXp: 0,
    unlockedThemes: [...STARTER_THEME_IDS],
    themeId: DEFAULT_THEME_ID,
    accent: null,
    particleDensity: 0.7,
    font: 'Inter',
    lastVisit: null,
    pomoBackfilled: false,
  }
}

// One-time import of lifetime focus minutes from the old standalone pomodoro
// store (sg.pomo.totalmin) into Magnet's focus history, so existing users don't
// see their hours vanish when analytics becomes the single source of truth.
// Idempotent via the `pomoBackfilled` flag. Dated to yesterday so it never
// inflates "today's pulse", and deliberately awards no XP (it's history, not a
// fresh session).
const OLD_POMO_MIN_KEY = 'sg.pomo.totalmin'
function backfillPomodoro(data: MagnetData): MagnetData {
  if (data.pomoBackfilled) return data
  let oldMin = 0
  try {
    oldMin = Number(localStorage.getItem(OLD_POMO_MIN_KEY) ?? 0)
  } catch {
    oldMin = 0
  }
  if (!Number.isFinite(oldMin) || oldMin <= 0) {
    return { ...data, pomoBackfilled: true }
  }
  const y = new Date()
  y.setDate(y.getDate() - 1)
  const date = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, '0')}-${String(y.getDate()).padStart(2, '0')}`
  const session = { id: uid('foc'), date, minutes: Math.round(oldMin), subject: 'Imported' }
  return { ...data, focus: [session, ...data.focus], pomoBackfilled: true }
}

function load(userId: string): MagnetData {
  try {
    const raw = localStorage.getItem(storageKey(userId))
    if (!raw) return emptyData()
    const parsed = JSON.parse(raw) as Partial<MagnetData>
    // merge over defaults so new fields added later are always present
    const base = emptyData()
    const merged: MagnetData = { ...base, ...parsed }
    // Personal Diary was removed for privacy: purge any previously-stored
    // journal entries so sensitive content never lingers in local storage.
    delete (merged as unknown as Record<string, unknown>).journal
    // make sure starter themes are always owned
    merged.unlockedThemes = Array.from(new Set([...STARTER_THEME_IDS, ...(parsed.unlockedThemes ?? [])]))
    // if the saved active theme was retired (e.g. the old light themes), fall
    // back to the default so the world never renders an unknown theme.
    if (!THEMES.some((t) => t.id === merged.themeId)) merged.themeId = DEFAULT_THEME_ID
    return merged
  } catch {
    return emptyData()
  }
}

interface MagnetState {
  userId: string | null
  ready: boolean
  data: MagnetData
  // a transient banner for unlocks / level-ups, surfaced by the UI then cleared
  toast: { title: string; body: string; icon: string } | null

  hydrate: (userId: string) => void
  clearToast: () => void

  // tasks
  addTask: (partial: Partial<Task> & { title: string }) => void
  updateTask: (id: string, patch: Partial<Task>) => void
  toggleTask: (id: string) => void
  deleteTask: (id: string) => void
  addSubtask: (taskId: string, title: string) => void
  toggleSubtask: (taskId: string, subId: string) => void
  removeSubtask: (taskId: string, subId: string) => void

  // projects
  addProject: (title: string, color: string, icon: string) => void
  deleteProject: (id: string) => void

  // goals
  addGoal: (partial: Partial<Goal> & { title: string }) => void
  updateGoal: (id: string, patch: Partial<Goal>) => void
  deleteGoal: (id: string) => void
  addMilestone: (goalId: string, title: string) => void
  toggleMilestone: (goalId: string, mId: string) => void

  // habits
  addHabit: (title: string, icon: string, color: string) => void
  deleteHabit: (id: string) => void
  toggleHabitToday: (id: string) => void

  // ideas / vision / brain dump
  addIdea: (text: string) => void
  deleteIdea: (id: string) => void
  togglePinIdea: (id: string) => void
  addVision: (card: Omit<VisionCard, 'id'>) => void
  updateVision: (id: string, patch: Partial<VisionCard>) => void
  deleteVision: (id: string) => void
  setBrainDump: (text: string) => void

  // focus + subjects
  logFocus: (minutes: number, subject: string) => void
  /** Train Station journeys: record a completed journey as a focus session and
   *  award its (diminishing-returns) XP + any unlocked achievements in one shot.
   *  XP is passed in pre-computed (NOT per-minute) so it never double-counts. */
  recordJourney: (input: {
    minutes: number
    subject: string
    xp: number
    achievements: { id: string; title: string; detail: string; icon: string }[]
  }) => void
  addSubject: (name: string) => void

  // personalization
  setTheme: (id: string) => void
  setAccent: (hex: string | null) => void
  setParticleDensity: (v: number) => void
  setFont: (font: string) => void
}

export const useMagnet = create<MagnetState>((set, get) => {
  function persist(data: MagnetData) {
    const userId = get().userId
    if (!userId) return
    try {
      localStorage.setItem(storageKey(userId), JSON.stringify(data))
    } catch {
      /* storage full / blocked — ignore */
    }
  }

  // Apply a data patch, persist, and return for chaining.
  function commit(mutator: (d: MagnetData) => MagnetData) {
    set((s) => {
      const next = mutator(s.data)
      persist(next)
      return { data: next }
    })
  }

    // Award XP via the engine (with caps/cooldown), detect rank changes, sync to DB.
    // Tasks/habits/milestones give 0 leaves — only study sources earn currency.
    function award(d: MagnetData, source: 'focus' | 'login' | 'tree' | 'note' | 'train', amount: number): MagnetData {
      const currentRank = rankForTotalXp(d.xp + d.premiumXp)

      const result = source === 'login'
        ? awardGoldenLeaves(d.xp, d.premiumXp, amount, currentRank.id)
        : awardLeaves(d.xp, d.premiumXp, source, amount, currentRank.id)

    if (result.onCooldown || (result.leaves === 0 && result.goldenLeaves === 0)) return d

    const xp = d.xp + result.leaves
    const premiumXp = d.premiumXp + result.goldenLeaves
    let unlockedThemes = d.unlockedThemes
    let achievements = d.achievements
    let toastQueued: { title: string; body: string; icon: string } | null = null

    // Check rank change
    if (result.rankChanged && result.newRankId) {
      const newRank = rankForTotalXp(xp + premiumXp)
      const rankAch: Achievement = {
        id: uid('ach'),
        title: `Rank Up: ${newRank.name}!`,
        detail: `You've been promoted to ${newRank.name}.`,
        icon: 'star',
        at: nowIso(),
      }
      achievements = [rankAch, ...achievements]
      toastQueued = {
        title: `${newRank.name}!`,
        body: "You\u2019ve been promoted.",
        icon: 'star',
      }
      // Award premium XP for rank up
      const rankUpResult = awardGoldenLeaves(xp, premiumXp, XP_VALUES.rankUp, currentRank.id)
      if (rankUpResult.goldenLeaves > 0) {
        achievements = [{ id: uid('ach'), title: 'Rank Up Bonus', detail: `+${rankUpResult.goldenLeaves} Golden Leaves`, icon: 'star', at: nowIso() }, ...achievements]
      }
    }

    // Check level-based theme unlocks
    const totalXp = xp + premiumXp
    const level = Math.floor(Math.sqrt(totalXp / 100)) + 1
    const prevLevel = Math.floor(Math.sqrt((d.xp + d.premiumXp) / 100)) + 1

    if (level > prevLevel) {
      const newly = THEMES.filter(
        (t) => t.unlockLevel > 0 && t.unlockLevel <= level && !unlockedThemes.includes(t.id),
      )
      if (newly.length > 0) {
        unlockedThemes = [...unlockedThemes, ...newly.map((t) => t.id)]
        const ach: Achievement[] = newly.map((t) => ({
          id: uid('ach'),
          title: `Unlocked: ${t.name}`,
          detail: `Reached level ${level} and opened the ${t.name} theme.`,
          icon: 'palette',
          at: nowIso(),
        }))
        achievements = [...ach, ...achievements]
      }
      if (!toastQueued) {
        toastQueued = {
          title: `Level ${level}!`,
          body: newly.length
            ? `You unlocked ${newly.length} new theme${newly.length > 1 ? 's' : ''}.`
            : 'Your universe keeps growing.',
          icon: 'star',
        }
      }
    }

    if (toastQueued) set({ toast: toastQueued })

    // Sync to DB (debounced)
    const userId = get().userId
    if (userId) syncXpToDb(userId, xp, premiumXp)

    return { ...d, xp, premiumXp, unlockedThemes, achievements }
  }

  return {
    userId: null,
    ready: false,
    data: emptyData(),
    toast: null,

    hydrate: (userId) => {
      if (get().userId === userId && get().ready) return
      const data = backfillPomodoro(load(userId))
      const prevVisit = data.lastVisit
      const withVisit: MagnetData = { ...data, lastVisit: prevVisit }
      // record this visit time but remember the *previous* one for greetings
      set({ userId, data: withVisit, ready: true })
      const stamped = { ...withVisit, lastVisit: nowIso() }
      // persist the new visit timestamp without clobbering the greeting value
      try {
        localStorage.setItem(storageKey(userId), JSON.stringify(stamped))
      } catch {
        /* ignore */
      }
    },

    clearToast: () => set({ toast: null }),

    // ---------- tasks ----------
    addTask: (partial) =>
      commit((d) => {
        const task: Task = {
          id: uid('task'),
          title: partial.title,
          notes: partial.notes ?? '',
          priority: (partial.priority as Priority) ?? 'medium',
          subject: partial.subject ?? '',
          area: (partial.area as LifeArea) ?? 'academic',
          done: false,
          due: partial.due ?? null,
          estimateMin: partial.estimateMin ?? 0,
          recurring: (partial.recurring as Recurrence) ?? 'none',
          subtasks: partial.subtasks ?? [],
          icon: partial.icon ?? 'check',
          color: partial.color ?? '',
          projectId: partial.projectId ?? null,
          createdAt: nowIso(),
          completedAt: null,
        }
        let next = { ...d, tasks: [task, ...d.tasks] }
        if (partial.subject && !next.subjects.includes(partial.subject)) {
          next = { ...next, subjects: [...next.subjects, partial.subject] }
        }
        return next
      }),

    updateTask: (id, patch) =>
      commit((d) => ({ ...d, tasks: d.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) })),

    toggleTask: (id) =>
      commit((d) => {
        const task = d.tasks.find((t) => t.id === id)
        if (!task) return d
        const nowDone = !task.done
        const tasks = d.tasks.map((t) =>
          t.id === id ? { ...t, done: nowDone, completedAt: nowDone ? nowIso() : null } : t,
        )
        // Tasks give no leaves — only study time earns currency.
        return { ...d, tasks }
      }),

    deleteTask: (id) => commit((d) => ({ ...d, tasks: d.tasks.filter((t) => t.id !== id) })),

    addSubtask: (taskId, title) =>
      commit((d) => ({
        ...d,
        tasks: d.tasks.map((t) =>
          t.id === taskId
            ? { ...t, subtasks: [...t.subtasks, { id: uid('sub'), title, done: false }] }
            : t,
        ),
      })),

    toggleSubtask: (taskId, subId) =>
      commit((d) => ({
        ...d,
        tasks: d.tasks.map((t) =>
          t.id === taskId
            ? {
                ...t,
                subtasks: t.subtasks.map((s) => (s.id === subId ? { ...s, done: !s.done } : s)),
              }
            : t,
        ),
      })),

    removeSubtask: (taskId, subId) =>
      commit((d) => ({
        ...d,
        tasks: d.tasks.map((t) =>
          t.id === taskId ? { ...t, subtasks: t.subtasks.filter((s) => s.id !== subId) } : t,
        ),
      })),

    // ---------- projects ----------
    addProject: (title, color, icon) =>
      commit((d) => ({
        ...d,
        projects: [...d.projects, { id: uid('proj'), title, color, icon, createdAt: nowIso() }],
      })),

    deleteProject: (id) =>
      commit((d) => ({
        ...d,
        projects: d.projects.filter((p) => p.id !== id),
        tasks: d.tasks.map((t) => (t.projectId === id ? { ...t, projectId: null } : t)),
      })),

    // ---------- goals ----------
    addGoal: (partial) =>
      commit((d) => {
        const goal: Goal = {
          id: uid('goal'),
          title: partial.title,
          detail: partial.detail ?? '',
          kind: partial.kind ?? 'long',
          progress: partial.progress ?? 0,
          target: partial.target ?? null,
          color: partial.color ?? '#9a6cff',
          milestones: partial.milestones ?? [],
          createdAt: nowIso(),
        }
        return { ...d, goals: [goal, ...d.goals] }
      }),

    updateGoal: (id, patch) =>
      commit((d) => ({ ...d, goals: d.goals.map((g) => (g.id === id ? { ...g, ...patch } : g)) })),

    deleteGoal: (id) => commit((d) => ({ ...d, goals: d.goals.filter((g) => g.id !== id) })),

    addMilestone: (goalId, title) =>
      commit((d) => ({
        ...d,
        goals: d.goals.map((g) =>
          g.id === goalId
            ? { ...g, milestones: [...g.milestones, { id: uid('ms'), title, done: false }] }
            : g,
        ),
      })),

    toggleMilestone: (goalId, mId) =>
      commit((d) => {
        const goal = d.goals.find((g) => g.id === goalId)
        if (!goal) return d
        const ms = goal.milestones.find((m) => m.id === mId)
        void ms
        const milestones = goal.milestones.map((m) => (m.id === mId ? { ...m, done: !m.done } : m))
        const doneCount = milestones.filter((m) => m.done).length
        const progress = milestones.length ? Math.round((doneCount / milestones.length) * 100) : goal.progress
        const goals = d.goals.map((g) => (g.id === goalId ? { ...g, milestones, progress } : g))
        // Milestones give no leaves — only study time earns currency.
        return { ...d, goals }
      }),

    // ---------- habits ----------
    addHabit: (title, icon, color) =>
      commit((d) => ({
        ...d,
        habits: [...d.habits, { id: uid('hab'), title, icon, color, history: [], createdAt: nowIso() }],
      })),

    deleteHabit: (id) => commit((d) => ({ ...d, habits: d.habits.filter((h) => h.id !== id) })),

    toggleHabitToday: (id) =>
      commit((d) => {
        const key = todayKey()
        const habit = d.habits.find((h) => h.id === id)
        if (!habit) return d
        const has = habit.history.includes(key)
        const history = has ? habit.history.filter((x) => x !== key) : [...habit.history, key]
        const habits = d.habits.map((h) => (h.id === id ? { ...h, history } : h))
        // Habits give no leaves — only study time earns currency.
        return { ...d, habits }
      }),

    // ---------- ideas / vision / brain dump ----------
    addIdea: (text) =>
      commit((d) => ({
        ...d,
        ideas: [{ id: uid('idea'), text, pinned: false, createdAt: nowIso() }, ...d.ideas],
      })),
    deleteIdea: (id) => commit((d) => ({ ...d, ideas: d.ideas.filter((i) => i.id !== id) })),
    togglePinIdea: (id) =>
      commit((d) => ({
        ...d,
        ideas: d.ideas.map((i) => (i.id === id ? { ...i, pinned: !i.pinned } : i)),
      })),

    addVision: (card) =>
      commit((d) => ({ ...d, vision: [...d.vision, { ...card, id: uid('vis') }] })),
    updateVision: (id, patch) =>
      commit((d) => ({ ...d, vision: d.vision.map((v) => (v.id === id ? { ...v, ...patch } : v)) })),
    deleteVision: (id) => commit((d) => ({ ...d, vision: d.vision.filter((v) => v.id !== id) })),

    setBrainDump: (text) => commit((d) => ({ ...d, brainDump: text })),

    // ---------- focus + subjects ----------
    logFocus: (minutes, subject) =>
      commit((d) => {
        const session = { id: uid('foc'), date: todayKey(), minutes, subject }
        let next = { ...d, focus: [session, ...d.focus] }
        if (subject && !next.subjects.includes(subject)) {
          next = { ...next, subjects: [...next.subjects, subject] }
        }
        // Leaves earned: 1 per focus minute (study rooms / library)
        return award(next, 'focus', Math.round(minutes * XP_VALUES.focusMin))
      }),

    recordJourney: ({ minutes, subject, xp, achievements }) =>
      commit((d) => {
        const session = { id: uid('foc'), date: todayKey(), minutes, subject }
        let next = { ...d, focus: [session, ...d.focus] }
        if (subject && !next.subjects.includes(subject)) {
          next = { ...next, subjects: [...next.subjects, subject] }
        }
        // De-dupe achievements
        const have = new Set(next.achievements.map((a) => a.id))
        const fresh = achievements
          .filter((a) => !have.has(a.id))
          .map((a) => ({ ...a, at: nowIso() }))
        if (fresh.length) next = { ...next, achievements: [...fresh, ...next.achievements] }
        // Award regular XP for focus time (train source for diminishing returns)
        const result = award(next, 'train', Math.max(0, Math.round(xp)))
        // Award premium XP for journey commitment (golden leaves, uncapped)
        const pResult = awardGoldenLeaves(result.xp, result.premiumXp, XP_VALUES.journeyPremium, rankForTotalXp(result.xp + result.premiumXp).id)
        return { ...result, premiumXp: result.premiumXp + pResult.goldenLeaves }
      }),

    addSubject: (name) =>
      commit((d) =>
        d.subjects.includes(name) ? d : { ...d, subjects: [...d.subjects, name] },
      ),

    // ---------- personalization ----------
    setTheme: (id) => commit((d) => (d.unlockedThemes.includes(id) ? { ...d, themeId: id } : d)),
    setAccent: (hex) => commit((d) => ({ ...d, accent: hex })),
    setParticleDensity: (v) => commit((d) => ({ ...d, particleDensity: Math.max(0, Math.min(1, v)) })),
    setFont: (font) => commit((d) => ({ ...d, font })),
  }
})
