import { create } from 'zustand'
import {
  type MagnetData,
  type Task,
  type Goal,
  type Project,
  type Habit,
  type TaskTemplate,
  type VisionCard,
  type Achievement,
  type Priority,
  type LifeArea,
  type Recurrence,
} from '../lib/magnet/types'
import {
  XP_VALUES,
  awardLeaves,
  awardGoldenLeaves,
  awardDailyTaskCompletion,
  awardBlueprint,
  awardWeeklyWarrior,
  awardTaskStreak,
  awardHabitStreak,
  checkInactivityPenalty,
  recordActivity,
} from '../lib/xpEngine'
import { rankForTotalXp } from '../lib/ranks'
import { pushMagnet, pullMagnet } from '../lib/magnet/sync'
import { useProfile } from './profile'

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
function todayKeyFor(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
/** Consecutive check-in days for a habit (freeze days keep the streak alive). */
function habitStreakDays(habit: Habit, now: Date): number {
  const covered = new Set([...habit.history, ...habit.freezeDays])
  let streak = 0
  let cursor = covered.has(todayKeyFor(now)) ? now : new Date(now.getTime() - 86400000)
  while (covered.has(todayKeyFor(cursor))) {
    streak += 1
    cursor = new Date(cursor.getTime() - 86400000)
  }
  return streak
}

function maxOrder(tasks: Task[]): number {
  return tasks.reduce((m, t) => (t.order > m ? t.order : m), 0)
}

// Advance a yyyy-mm-dd date by the recurrence interval, returning a new
// yyyy-mm-dd string. Falls back to today when the input is missing/invalid.
function advanceDue(due: string | null, recurrence: Recurrence): string {
  const base = due ? new Date(due + 'T00:00:00') : new Date()
  if (Number.isNaN(base.getTime())) return todayKey()
  if (recurrence === 'daily') base.setDate(base.getDate() + 1)
  else if (recurrence === 'weekly') base.setDate(base.getDate() + 7)
  else if (recurrence === 'monthly') base.setMonth(base.getMonth() + 1)
  return `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, '0')}-${String(base.getDate()).padStart(2, '0')}`
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
    templates: [],
    xp: 0,
    premiumXp: 0,
    rankXp: 0,
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

// Legacy tasks created before manual ordering / dependencies existed have no
// `order`/`blockedBy`/`templateId`. Give them sane defaults so the new sort and
// UI never read undefined. Order preserves the stored array order (newest first
// because new tasks are prepended) under the DESC sort used by TasksView.
function backfillTasks(tasks: Task[]): Task[] {
  return tasks.map((t, i) => ({
    ...t,
    order: typeof t.order === 'number' ? t.order : tasks.length - i,
    blockedBy: Array.isArray(t.blockedBy) ? t.blockedBy : [],
    templateId: t.templateId ?? null,
  }))
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
    // backfill new per-task fields
    merged.tasks = backfillTasks(merged.tasks ?? [])
    merged.templates = merged.templates ?? []
    merged.habits = (merged.habits ?? []).map((h) => ({ ...h, freezeDays: h.freezeDays ?? [] }))
    merged.projects = (merged.projects ?? []).map((p) => ({ ...p, goalId: p.goalId ?? null }))
    merged.goals = (merged.goals ?? []).map((g) => ({ ...g, projectId: g.projectId ?? null }))
    // Backfill lifetime rank XP from the wallet total for accounts created
    // before rankXp existed (rank never dips again when they spend leaves).
    merged.rankXp = typeof merged.rankXp === 'number' ? merged.rankXp : (merged.xp ?? 0) + (merged.premiumXp ?? 0)
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
  // drag-and-drop: reorder the open tasks to match `orderedIds` (top-first)
  reorderTasks: (orderedIds: string[]) => void
  // dependencies: block `taskId` until `blockerId` is done (or unblock)
  toggleBlockedBy: (taskId: string, blockerId: string) => void

  // templates
  addTemplate: (partial: Partial<TaskTemplate> & { title: string }) => void
  deleteTemplate: (id: string) => void
  createFromTemplate: (id: string) => void

  // projects
  addProject: (title: string, color: string, icon: string) => void
  deleteProject: (id: string) => void
  // link a project to a goal (and clear any previous link on either side)
  linkProjectGoal: (projectId: string, goalId: string) => void
  unlinkProjectGoal: (projectId: string) => void

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
  toggleHabitFreeze: (id: string, date?: string) => void

  // ideas / vision / brain dump
  addIdea: (text: string) => void
  deleteIdea: (id: string) => void
  togglePinIdea: (id: string) => void
  addVision: (card: Omit<VisionCard, 'id'>) => void
  updateVision: (id: string, patch: Partial<VisionCard>) => void
  deleteVision: (id: string) => void
  setBrainDump: (text: string) => void

  // focus + subjects
  logFocus: (minutes: number, subject: string, opts?: { award?: boolean }) => void
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
  setFont: (font: string) => void
  // replace the whole world (used by JSON backup restore)
  importData: (next: MagnetData) => void
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
    // Mirror to InsForge (debounced, best-effort) for cross-device sync.
    pushMagnet(userId, data)
  }

  // Apply a data patch, persist, and return for chaining.
  function commit(mutator: (d: MagnetData) => MagnetData) {
    set((s) => {
      const next = mutator(s.data)
      persist(next)
      return { data: next }
    })
  }

  // The PROFILE store is the single source of truth for the spendable wallet
  // (xp / premium_xp) and lifetime rank XP. XP deltas are always applied through
  // profile.applyXp, which syncs to the DB and mirrors the result back into
  // Magnet (see the profile→magnet subscription at the bottom of this file).
  // This eliminates the old "two sources of truth" divergence where Magnet's
  // stale snapshot could overwrite the DB with a LOWER value and wipe earned
  // leaves / rank progress.

    // Award XP via the engine (with caps/cooldown), detect rank changes, sync to DB.
    // The engine is fed the current PROFILE balance — never Magnet's possibly
    // stale snapshot — so the wallet can only move forward from the truth.
    // Tasks/habits/milestones give 0 leaves — only study sources earn currency.
    // Golden leaves are premium-only (purchases + rank-up trickle) — never
    // awarded here. The old 'login'→awardGoldenLeaves branch was a latent trap.
    function award(d: MagnetData, source: 'focus' | 'tree' | 'note' | 'train', amount: number): MagnetData {
      const p = useProfile.getState()
      const rankBase = p.rankXp > 0 ? p.rankXp : p.xp + p.premiumXp
      const currentRank = rankForTotalXp(rankBase)

      const result = awardLeaves(p.xp, p.premiumXp, source, amount, currentRank.id, rankBase)

    if (result.onCooldown || (result.leaves === 0 && result.goldenLeaves === 0)) return d

    let leafDelta = result.leaves
    let goldenDelta = result.goldenLeaves
    let rankDelta = Math.max(0, result.leaves) + result.goldenLeaves
    let achievements = d.achievements
    let toastQueued: { title: string; body: string; icon: string } | null = null

    // Check rank change
    if (result.rankChanged && result.newRankId) {
      const newRank = rankForTotalXp(rankBase + rankDelta)
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
      // Award premium XP for rank up — credit the golden leaves so they
      // actually land in the wallet (was announced but never added before).
      const rankUpResult = awardGoldenLeaves(p.xp + leafDelta, p.premiumXp + goldenDelta, XP_VALUES.rankUp, currentRank.id, rankBase + rankDelta)
      if (rankUpResult.goldenLeaves > 0) {
        goldenDelta += rankUpResult.goldenLeaves
        rankDelta += rankUpResult.goldenLeaves
        achievements = [{ id: uid('ach'), title: 'Rank Up Bonus', detail: `+${rankUpResult.goldenLeaves} Golden Leaves`, icon: 'star', at: nowIso() }, ...achievements]
      }
    }

    // Level-up celebration (level mirrors rankXp for lifetime progress)
    const level = Math.floor(Math.sqrt((rankBase + rankDelta) / 100)) + 1
    const prevLevel = Math.floor(Math.sqrt(rankBase / 100)) + 1

    if (level > prevLevel && !toastQueued) {
      toastQueued = {
        title: `Level ${level}!`,
        body: 'Your universe keeps growing.',
        icon: 'star',
      }
    }

    if (toastQueued) set({ toast: toastQueued })

    // Write through the authoritative wallet — syncs to DB + mirrors back into
    // Magnet automatically. Never writes a stale lower value.
    const balance = p.applyXp({ leaves: leafDelta, golden: goldenDelta, rankXp: rankDelta })

    const updated = { ...d, xp: balance.xp, premiumXp: balance.premiumXp, rankXp: balance.rankXp, achievements }
    return updated
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

       // Check inactivity penalty on daily load
       try {
         const p = useProfile.getState()
         const rankBase = p.rankXp > 0 ? p.rankXp : p.xp + p.premiumXp
         const currentRank = rankForTotalXp(rankBase)
         const penaltyResult = checkInactivityPenalty(p.xp, p.premiumXp, currentRank.id, rankBase)
         if (penaltyResult.leaves < 0 || penaltyResult.goldenLeaves > 0) {
           const balance = p.applyXp({ leaves: penaltyResult.leaves, golden: penaltyResult.goldenLeaves, rankXp: penaltyResult.leaves })
           const newRank = rankForTotalXp(balance.rankXp)
           let achievements = data.achievements
           if (penaltyResult.rankChanged && newRank.id !== currentRank.id) {
             achievements = [
               { id: uid('ach'), title: `Rank Down: ${newRank.name}`, detail: `Inactivity penalty applied.`, icon: 'alert-circle', at: nowIso() },
               ...achievements,
             ]
           }
           const updated = { ...data, xp: balance.xp, premiumXp: balance.premiumXp, rankXp: balance.rankXp, achievements }
           persist(updated)
           set({ data: updated })
   if (penaltyResult.leaves < 0) {
     set({ toast: { title: 'Inactivity Penalty', body: `-${Math.abs(penaltyResult.leaves)} XP deducted for not hitting ${XP_VALUES.inactivityThresholdMin} min focus today. Rank may drop.`, icon: 'alert-circle' } })
           }
         }
       } catch { /* ignore — penalty is best-effort */ }

       // The profile store is the authoritative wallet. Reconcile the local
       // Magnet snapshot with it so stale local XP (earned outside Magnet —
       // e.g. focus / hardcore / blueprint) never surfaces or gets written back.
       const p = useProfile.getState()
       if (p.ready && !p.isGuest) {
         const cur = get().data
         if (cur.xp !== p.xp || cur.premiumXp !== p.premiumXp || cur.rankXp !== p.rankXp) {
           const synced = { ...cur, xp: p.xp, premiumXp: p.premiumXp, rankXp: p.rankXp }
           set({ data: synced })
           try {
             localStorage.setItem(storageKey(userId), JSON.stringify(synced))
           } catch { /* ignore */ }
           pushMagnet(userId, synced)
         }
       }

       // Fresh device? Pull the cloud copy (if any) so the world follows the user.
       // An existing local world is never clobbered — last-writer-per-device wins.
       const isEmpty =
         data.tasks.length === 0 &&
         data.projects.length === 0 &&
         data.goals.length === 0 &&
         data.habits.length === 0 &&
         data.templates.length === 0
       if (isEmpty) {
         void pullMagnet(userId).then((remote) => {
           if (remote && get().userId === userId) {
             const merged = { ...backfillPomodoro(remote), lastVisit: nowIso() }
             persist(merged)
             set({ data: merged })
           }
         })
       }
     },

    clearToast: () => set({ toast: null }),

    // ---------- tasks ----------
    addTask: (partial) => {
      recordActivity()
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
          subtasks: (partial.subtasks ?? []).map((s) => ({ ...s, done: false })),
          icon: partial.icon ?? 'check',
          color: partial.color ?? '',
          projectId: partial.projectId ?? null,
          order: maxOrder(d.tasks) + 1,
          blockedBy: partial.blockedBy ?? [],
          templateId: partial.templateId ?? null,
          createdAt: nowIso(),
          completedAt: null,
        }
        let next = { ...d, tasks: [task, ...d.tasks] }
        if (partial.subject && !next.subjects.includes(partial.subject)) {
          next = { ...next, subjects: [...next.subjects, partial.subject] }
        }
        return next
      })},

    updateTask: (id, patch) => commit((d) => ({ ...d, tasks: d.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) })),

    toggleTask: (id) => {
      recordActivity()
      const d0 = get().data
      const task = d0.tasks.find((t) => t.id === id)
      if (!task) return
      // Dependency guard: an open task blocked by an unfinished task can't be
      // completed. Surface a toast instead of silently failing.
      if (!task.done && task.blockedBy.length > 0) {
        const open = task.blockedBy
          .map((b) => d0.tasks.find((t) => t.id === b))
          .filter((b): b is Task => !!b && !b.done)
        if (open.length > 0) {
          set({
            toast: {
              title: 'Task is blocked',
              body: `Finish "${open[0].title}"${open.length > 1 ? ` +${open.length - 1} more` : ''} first.`,
              icon: 'lock',
            },
          })
          return
        }
      }
      commit((d) => {
        const nowDone = !task.done
        let tasks = d.tasks.map((t) =>
          t.id === id ? { ...t, done: nowDone, completedAt: nowDone ? nowIso() : null } : t,
        )
        // Recurring tasks: when completed, spawn the next occurrence automatically
        // (with a fresh due date and reset subtasks) so the loop keeps running.
        if (nowDone && task.recurring !== 'none') {
          const nextDue = advanceDue(task.due, task.recurring)
          const next: Task = {
            ...task,
            id: uid('task'),
            done: false,
            due: nextDue,
            order: maxOrder(tasks) + 1,
            blockedBy: [],
            subtasks: task.subtasks.map((s) => ({ ...s, done: false })),
            createdAt: nowIso(),
            completedAt: null,
          }
          tasks = [next, ...tasks]
        }

        // Daily task completion bonus: fires when every open task is done —
        // tasks due today AND undated open work. (The old check only counted
        // tasks due today, so a completed undated task dropped out of the set
        // and the bonus never fired — see `n` above. Now any clean slate pays.)
        // Anti-spam: engine pays at most once per day, ever.
        if (nowDone) {
          const today = todayKey()
          const openWork = tasks.filter((t) => !t.done && (t.due === today || !t.due))
          const allDailyDone = tasks.length > 0 && openWork.length === 0
          if (allDailyDone) {
            const p = useProfile.getState()
            const rankBase = p.rankXp > 0 ? p.rankXp : p.xp + p.premiumXp
            const currentRank = rankForTotalXp(rankBase)
            const result = awardDailyTaskCompletion(p.xp, p.premiumXp, currentRank.id, rankBase)
            if (result.leaves > 0) {
              const balance = p.applyXp({ leaves: result.leaves, rankXp: result.leaves })
              const updated = { ...d, tasks, xp: balance.xp, premiumXp: balance.premiumXp, rankXp: balance.rankXp }
              set({ toast: { title: 'Day cleared', body: `+${result.leaves} leaves`, icon: 'leaf' } })
              return updated
            }
          }

          // Task streak: count consecutive days with >=1 completed task (ends
          // today or yesterday). Awarded ONLY at the exact 7 / 30 milestone day,
          // once per streak run (engine keys the payout to the anchor day).
          const days = new Set<string>()
          for (const t of tasks) if (t.done && t.completedAt) days.add(todayKeyFor(new Date(t.completedAt)))
          let streak = 0
          let cursor = days.has(today) ? new Date() : new Date(Date.now() - 86400000)
          while (days.has(todayKeyFor(cursor))) {
            streak += 1
            cursor = new Date(cursor.getTime() - 86400000)
          }
          if (streak === 7 || streak === 30) {
            const p = useProfile.getState()
            const rankBase = p.rankXp > 0 ? p.rankXp : p.xp + p.premiumXp
            const currentRank = rankForTotalXp(rankBase)
            const result = awardTaskStreak(p.xp, p.premiumXp, currentRank.id, streak, rankBase)
            if (result.leaves > 0) {
              const balance = p.applyXp({ leaves: result.leaves, rankXp: result.leaves })
              const updated = { ...d, tasks, xp: balance.xp, premiumXp: balance.premiumXp, rankXp: balance.rankXp }
              set({ toast: { title: `${streak}-day streak!`, body: `+${result.leaves} leaves`, icon: 'fire' } })
              return updated
            }
          }
        }

        // Tasks give no leaves — only study time + milestone streaks earn currency.
        return { ...d, tasks }
      })
    },

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

    // ---------- drag-and-drop reorder ----------
    // `orderedIds` is the desired top-to-bottom order of the OPEN tasks being
    // rearranged. We assign descending order values so the first id sorts to the
    // top under the DESC sort; done tasks keep their existing order.
    reorderTasks: (orderedIds) =>
      commit((d) => {
        const rank = new Map<string, number>()
        orderedIds.forEach((id, i) => rank.set(id, orderedIds.length - i))
        const tasks = d.tasks.map((t) => (rank.has(t.id) ? { ...t, order: rank.get(t.id)! } : t))
        return { ...d, tasks }
      }),

    // ---------- dependencies ----------
    toggleBlockedBy: (taskId, blockerId) =>
      commit((d) => ({
        ...d,
        tasks: d.tasks.map((t) => {
          if (t.id !== taskId) return t
          const has = t.blockedBy.includes(blockerId)
          return {
            ...t,
            blockedBy: has ? t.blockedBy.filter((b) => b !== blockerId) : [...t.blockedBy, blockerId],
          }
      })})),

    // ---------- templates ----------
    addTemplate: (partial) =>
      commit((d) => ({
        ...d,
        templates: [
          {
            id: uid('tpl'),
            title: partial.title,
            notes: partial.notes ?? '',
            priority: (partial.priority as Priority) ?? 'medium',
            subject: partial.subject ?? '',
            area: (partial.area as LifeArea) ?? 'academic',
            estimateMin: partial.estimateMin ?? 0,
            recurring: (partial.recurring as Recurrence) ?? 'none',
            icon: partial.icon ?? 'check',
            color: partial.color ?? '',
            addToTasks: partial.addToTasks ?? true,
            createdAt: nowIso(),
          },
          ...d.templates,
        ],
      })),

    deleteTemplate: (id) =>
      commit((d) => ({ ...d, templates: d.templates.filter((t) => t.id !== id) })),

    createFromTemplate: (id) =>
      commit((d) => {
        const tpl = d.templates.find((t) => t.id === id)
        if (!tpl) return d
        const task: Task = {
          id: uid('task'),
          title: tpl.title,
          notes: tpl.notes,
          priority: tpl.priority,
          subject: tpl.subject,
          area: tpl.area,
          done: false,
          due: null,
          estimateMin: tpl.estimateMin,
          recurring: tpl.recurring,
          subtasks: [],
          icon: tpl.icon,
          color: tpl.color,
          projectId: null,
          order: maxOrder(d.tasks) + 1,
          blockedBy: [],
          templateId: tpl.id,
          createdAt: nowIso(),
          completedAt: null,
        }
        let next = { ...d, tasks: [task, ...d.tasks] }
        if (tpl.subject && !next.subjects.includes(tpl.subject)) {
          next = { ...next, subjects: [...next.subjects, tpl.subject] }
        }
        return next
      }),

    // ---------- projects ----------
    addProject: (title, color, icon) =>
      commit((d) => ({
        ...d,
        projects: [...d.projects, { id: uid('proj'), title, color, icon, goalId: null, createdAt: nowIso() }],
      })),

    deleteProject: (id) =>
      commit((d) => ({
        ...d,
        projects: d.projects.filter((p) => p.id !== id),
        goals: d.goals.map((g) => (g.projectId === id ? { ...g, projectId: null } : g)),
        tasks: d.tasks.map((t) => (t.projectId === id ? { ...t, projectId: null } : t)),
      })),

    // ---------- project <-> goal linking ----------
    linkProjectGoal: (projectId, goalId) =>
      commit((d) => ({
        ...d,
        // clear any previous link on this goal and on this project
        goals: d.goals.map((g) =>
          g.id === goalId ? { ...g, projectId } : g.projectId === projectId ? { ...g, projectId: null } : g,
        ),
        projects: d.projects.map((p) =>
          p.id === projectId ? { ...p, goalId } : p.goalId === goalId ? { ...p, goalId: null } : p,
        ),
      })),

    unlinkProjectGoal: (projectId) =>
      commit((d) => ({
        ...d,
        goals: d.goals.map((g) => (g.projectId === projectId ? { ...g, projectId: null } : g)),
        projects: d.projects.map((p) => (p.id === projectId ? { ...p, goalId: null } : p)),
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
          projectId: partial.projectId ?? null,
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
        habits: [...d.habits, { id: uid('hab'), title, icon, color, history: [], freezeDays: [], createdAt: nowIso() }],
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

        // Habit streak: award ONLY on a fresh check-in that lands the habit on
        // the exact 7 / 30 milestone day, once per streak run. Un-checking and
        // re-checking the same day can never re-award (engine keys by day).
        if (!has) {
          const streak = habitStreakDays(habits.find((h) => h.id === id)!, new Date())
          if (streak === 7 || streak === 30) {
            const p = useProfile.getState()
            const rankBase = p.rankXp > 0 ? p.rankXp : p.xp + p.premiumXp
            const currentRank = rankForTotalXp(rankBase)
            const result = awardHabitStreak(p.xp, p.premiumXp, currentRank.id, id, streak, rankBase)
            if (result.leaves > 0) {
              const balance = p.applyXp({ leaves: result.leaves, rankXp: result.leaves })
              const updated = { ...d, habits, xp: balance.xp, premiumXp: balance.premiumXp, rankXp: balance.rankXp }
              set({ toast: { title: `${streak}-day habit streak!`, body: `+${result.leaves} leaves`, icon: 'fire' } })
              return updated
            }
          }
        }

        // Habits give no leaves — only milestone streaks earn currency.
        return { ...d, habits }
      }),

    // Rest day: mark/unmark a date as an intentional skip so the streak survives
    // travel / scheduled off days. Toggling today also clears any completed entry.
    toggleHabitFreeze: (id, date) =>
      commit((d) => {
        const key = date ?? todayKey()
        const habit = d.habits.find((h) => h.id === id)
        if (!habit) return d
        const has = habit.freezeDays.includes(key)
        const freezeDays = has ? habit.freezeDays.filter((x) => x !== key) : [...habit.freezeDays, key]
        const history = has && habit.history.includes(key) ? habit.history : habit.history.filter((x) => x !== key)
        const habits = d.habits.map((h) => (h.id === id ? { ...h, freezeDays, history } : h))
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
    logFocus: (minutes, subject, opts) => {
      recordActivity()
      commit((d) => {
        const session = { id: uid('foc'), date: todayKey(), minutes, subject }
        let next = { ...d, focus: [session, ...d.focus] }
        if (subject && !next.subjects.includes(subject)) {
          next = { ...next, subjects: [...next.subjects, subject] }
        }
        // Analytics only by default — XP awarding is handled by the focus sink
        // in appInit (awardFocusLeaves) so there's a single award path.
        // Pass { award: true } for manual log-focus entries in AnalyticsView.
        if (opts?.award) {
          return award(next, 'focus', Math.round(minutes * XP_VALUES.focusMin))
        }
        return next
      })},

    recordJourney: ({ minutes, subject, xp, achievements }) => {
      recordActivity()
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
        // Journey commitment bonus — GREEN (golden is purchase/rank-up only).
        const p = useProfile.getState()
        const rankBase = p.rankXp > 0 ? p.rankXp : p.xp + p.premiumXp
        const pResult = awardLeaves(p.xp, p.premiumXp, 'login', XP_VALUES.journeyPremium, rankForTotalXp(rankBase).id, rankBase)
        if (pResult.leaves > 0) {
          const balance = p.applyXp({ leaves: pResult.leaves })
          return { ...result, xp: balance.xp, premiumXp: balance.premiumXp, rankXp: balance.rankXp }
        }
        return result
      })},

    addSubject: (name) =>
      commit((d) =>
        d.subjects.includes(name) ? d : { ...d, subjects: [...d.subjects, name] },
      ),

    // ---------- personalization ----------
    importData: (next) =>
      commit((d) => {
        const merged: MagnetData = { ...emptyData(), ...next }
        return {
          ...d,
          tasks: backfillTasks(merged.tasks),
          templates: merged.templates ?? [],
          projects: (merged.projects ?? []).map((p) => ({ ...p, goalId: p.goalId ?? null })),
          goals: (merged.goals ?? []).map((g) => ({ ...g, projectId: g.projectId ?? null })),
          habits: (merged.habits ?? []).map((h) => ({ ...h, freezeDays: h.freezeDays ?? [] })),
          ideas: merged.ideas ?? [],
          vision: merged.vision ?? [],
          focus: merged.focus ?? [],
          achievements: merged.achievements ?? [],
          subjects: merged.subjects ?? d.subjects,
          xp: merged.xp ?? 0,
          premiumXp: merged.premiumXp ?? 0,
          rankXp: typeof merged.rankXp === 'number' ? merged.rankXp : (merged.xp ?? 0) + (merged.premiumXp ?? 0),
        }
      }),
    setFont: (font) => commit((d) => ({ ...d, font })),
  }
})

// ---- Profile → Magnet wallet mirror ----------------------------------------
// useProfile is the single source of truth for the spendable wallet (xp /
// premium_xp) and lifetime rank XP. Whenever those change anywhere (focus sink,
// hardcore wins, blueprints, achievement claims, shop spends), mirror the new
// balance into the Magnet snapshot so every reader shows the same number and
// a stale local value is never written back to the DB.
let lastMirrored = { xp: -1, premiumXp: -1, rankXp: -1 }
useProfile.subscribe((s) => {
  if (s.xp === lastMirrored.xp && s.premiumXp === lastMirrored.premiumXp && s.rankXp === lastMirrored.rankXp) return
  lastMirrored = { xp: s.xp, premiumXp: s.premiumXp, rankXp: s.rankXp }
  const m = useMagnet.getState()
  if (!m.userId || !m.ready) return
  if (m.data.xp === s.xp && m.data.premiumXp === s.premiumXp && m.data.rankXp === s.rankXp) return
  const updated = { ...m.data, xp: s.xp, premiumXp: s.premiumXp, rankXp: s.rankXp }
  try {
    localStorage.setItem(storageKey(m.userId), JSON.stringify(updated))
  } catch { /* ignore */ }
  useMagnet.setState({ data: updated })
  pushMagnet(m.userId, updated)
})
