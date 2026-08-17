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
  recordActivity,
} from '../lib/xpEngine'
import { rankForTotalXp } from '../lib/ranks'
import { levelForXp } from '../lib/magnet/types'
import { taskPower, subtaskPower, habitPower, milestonePower, goalCompletePower, MXP_DAILY_EARN_CAP, mxpDailyRoom } from '../lib/magnet/score'
import { pushMagnet, pullMagnet } from '../lib/magnet/sync'
import { useProfile } from './profile'
import { MAGNET_DEFAULT_THEME_ID, starterThemeIds, getTheme, mxpPrice, hasFreeThemeAccess } from '../lib/magnet/themes'

// ---- id + time helpers ------------------------------------------------------
let counter = 0
// Guards the once-per-day "daily Power cap reached" toast so it can't spam.
let mxpCapToastDay = ''
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
    mxp: 0,
    mxpTotal: 0,
    mxpSpent: 0,
    mxpDay: { date: todayKey(), value: 0 },
    theme: MAGNET_DEFAULT_THEME_ID,
    unlockedThemes: starterThemeIds(),
    font: 'Inter',
    lastVisit: null,
    pomoBackfilled: false,
  }
}

// The old pomodoro store accumulated LIFETIME focus minutes (sg.pomo.totalmin).
// A past migration fabricated a single focus session dated "yesterday" holding
// that whole lifetime sum — which made analytics show phantom hours (e.g. "9h
// this week") and a distorted 100% deep-work ratio. Real focus minutes are
// logged live, session-by-session, by the focus sink in appInit — we never
// fabricate a lump anymore. Any legacy "Imported" lump is purged in
// migrateData; backfillPomodoro now just marks the migration done.
function backfillPomodoro(data: MagnetData): MagnetData {
  return { ...data, pomoBackfilled: true }
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

/** Backfill newer fields onto any parsed MagnetData (local or cloud copy) so
 *  accounts saved before a field existed still read + write the full shape. */
function migrateData(data: MagnetData): MagnetData {
  const merged: MagnetData = { ...emptyData(), ...data }
  // Personal Diary was removed for privacy: purge any previously-stored
  // journal entries so sensitive content never lingers in local storage.
  delete (merged as unknown as Record<string, unknown>).journal
  // Purge legacy fabricated focus lump(s): a past migration dumped the whole
  // lifetime pomodoro total into a single "Imported" session dated yesterday,
  // which showed up as phantom hours in analytics (e.g. "9h in 7 days") and a
  // fake 100% deep-work ratio. These were never real sessions — drop them.
  if (Array.isArray(merged.focus)) {
    merged.focus = merged.focus.filter((f) => !(f && (f as { subject?: string }).subject === 'Imported'))
  }
  // backfill new per-task fields
  merged.tasks = backfillTasks(merged.tasks ?? [])
  merged.templates = merged.templates ?? []
  merged.habits = (merged.habits ?? []).map((h) => ({ ...h, freezeDays: h.freezeDays ?? [] }))
  merged.projects = (merged.projects ?? []).map((p) => ({ ...p, goalId: p.goalId ?? null }))
  merged.goals = (merged.goals ?? []).map((g) => ({ ...g, projectId: g.projectId ?? null }))
  // Backfill lifetime rank XP from the wallet total for accounts created
  // before rankXp existed (rank never dips again when they spend leaves).
  merged.rankXp = typeof merged.rankXp === 'number' ? merged.rankXp : (merged.xp ?? 0) + (merged.premiumXp ?? 0)
  // Backfill Magnet Power (magnet-local progression + theme currency).
  merged.mxp = typeof merged.mxp === 'number' ? merged.mxp : 0
  merged.mxpTotal = typeof merged.mxpTotal === 'number' ? merged.mxpTotal : Math.max(merged.mxp, 0)
  merged.mxpSpent = typeof merged.mxpSpent === 'number' ? merged.mxpSpent : 0
  merged.mxpDay = merged.mxpDay && typeof merged.mxpDay.value === 'number'
    ? merged.mxpDay
    : { date: todayKey(), value: 0 }
  merged.unlockedThemes = Array.isArray(merged.unlockedThemes)
    ? merged.unlockedThemes
    : starterThemeIds()
  merged.theme = typeof merged.theme === 'string' && merged.theme ? merged.theme : MAGNET_DEFAULT_THEME_ID
  return merged
}

function load(userId: string): MagnetData {
  try {
    const raw = localStorage.getItem(storageKey(userId))
    if (!raw) return emptyData()
    return migrateData(JSON.parse(raw) as MagnetData)
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

  // theme store — themes live inside the magnet, bought with Magnet Power
  purchaseTheme: (id: string) => void
  applyTheme: (id: string) => void

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

    const leafDelta = result.leaves
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

  // ---- Magnet Power (MXP) — magnet-local progression + theme store ----
  // Apply a signed MXP delta to the snapshot, keep the per-day meter honest
  // (resets at midnight via the date check) and celebrate level crossings.
  // Un-checking refunds the exact same amount, so toggling can never farm.
  // MXP never touches the global wallet / rank — it only levels the magnet
  // and buys themes in the magnet store. Buying themes withdraws the balance
  // (mxp) but never the lifetime total (mxpTotal), so levels never drop.
  // Anti-farm: earning is capped per calendar day (MXP_DAILY_EARN_CAP) so the
  // economy can't be flooded by creating + completing trivial tasks or by fast
  // toggling. Refunds always pass through (bounded by the balance), so a real
  // un-check never costs a user power they already spent.
  function awardMxp(d: MagnetData, delta: number): MagnetData {
    if (!delta) return d
    const total = d.mxpTotal ?? d.mxp
    const prevLevel = levelForXp(total)
    const today = todayKey()
    const day = d.mxpDay.date === today ? d.mxpDay : { date: today, value: 0 }

    let mxp = d.mxp
    let mxpTotal = total
    let dayValue = day.value
    let gained = 0

    if (delta > 0) {
      const room = mxpDailyRoom(day, today)
      gained = Math.min(delta, room)
      mxp = Math.max(0, mxp + gained)
      mxpTotal += gained
      dayValue = day.value + gained
      if (room > 0 && dayValue >= MXP_DAILY_EARN_CAP && mxpCapToastDay !== today) {
        mxpCapToastDay = today
        set({
          toast: {
            title: 'Daily Power cap reached',
            body: "You've banked the day's max Magnet Power. More powers up at midnight.",
            icon: 'spark',
          },
        })
      }
    } else {
      mxp = Math.max(0, mxp + delta)
      dayValue = Math.max(0, day.value + delta)
    }

    const nextLevel = levelForXp(mxpTotal)
    if (nextLevel > prevLevel) {
      set({
        toast: {
          title: `Magnet Level ${nextLevel}`,
          body: `+${gained} Magnet Power`,
          icon: 'spark',
        },
      })
    }
    return { ...d, mxp, mxpTotal, mxpDay: { date: today, value: dayValue } }
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
              const merged = migrateData({ ...backfillPomodoro(remote), lastVisit: nowIso() })
              persist(merged)
              set({ data: merged })
            }
          })
        }
     },

    clearToast: () => set({ toast: null }),

    // ---------- theme store ----------
    purchaseTheme: (id) => {
      const d = get().data
      const owner = new Set(d.unlockedThemes)
      if (owner.has(id)) return
      const theme = getTheme(id)
      const free = hasFreeThemeAccess(useProfile.getState().playerId)
      const price = free ? 0 : mxpPrice(theme)
      if (d.mxp < price) {
        set({
          toast: {
            title: 'Not enough Magnet Power',
            body: `${theme.name} costs ${price} Power — finish tasks, habits and milestones to earn more.`,
            icon: 'spark',
          },
        })
        return
      }
      set({
        toast: {
          title: `${theme.name} unlocked`,
          body: free ? 'Gift catalog — every theme is yours.' : `Spent ${price} Magnet Power. Open it in the store to apply.`,
          icon: 'store',
        },
      })
      commit((d) => ({
        ...d,
        mxp: d.mxp - price,
        mxpSpent: d.mxpSpent + price,
        unlockedThemes: [...owner, id],
      }))
    },
    applyTheme: (id) => {
      const d = get().data
      const owned = d.unlockedThemes.includes(id) || hasFreeThemeAccess(useProfile.getState().playerId)
      if (!owned) return
      commit((d) => ({ ...d, theme: id }))
    },

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
        // Magnet Power: a task pays ONLY when it's due today or undated — a
        // future-due task (including the recurring ones spawned for later
        // days) pays nothing, so repeats can't be farmed within one day.
        // Un-checking refunds the exact amount.
        const today = todayKey()
        const eligible = task.due ? task.due === today : true
        const powerDelta = nowDone
          ? eligible
            ? taskPower(task)
            : 0
          : eligible && task.done
            ? -taskPower(task)
            : 0
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
              return awardMxp(updated, powerDelta)
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
              return awardMxp(updated, powerDelta)
            }
          }
        }

        // Tasks give no leaves — only study time + milestone streaks earn
        // currency. But every completion pays Magnet Power (magnet-local).
        return awardMxp({ ...d, tasks }, powerDelta)
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
      commit((d) => {
        // Subtask power: pay only while the parent is still open (a done
        // parent's sub-checkboxes are housekeeping), refund exactly on un-check.
        const parent = d.tasks.find((t) => t.id === taskId)
        const sub = parent?.subtasks.find((s) => s.id === subId)
        let powerDelta = 0
        if (parent && sub && !parent.done) {
          powerDelta = sub.done ? -subtaskPower() : subtaskPower()
        }
        const tasks = d.tasks.map((t) =>
          t.id === taskId
            ? { ...t, subtasks: t.subtasks.map((s) => (s.id === subId ? { ...s, done: !s.done } : s)) }
            : t,
        )
        return awardMxp({ ...d, tasks }, powerDelta)
      }),

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
        const target = goal.milestones.find((m) => m.id === mId)
        if (!target) return d
        const milestones = goal.milestones.map((m) => (m.id === mId ? { ...m, done: !m.done } : m))
        const doneCount = milestones.filter((m) => m.done).length
        const progress = milestones.length ? Math.round((doneCount / milestones.length) * 100) : goal.progress
        const goals = d.goals.map((g) => (g.id === goalId ? { ...g, milestones, progress } : g))

        // Magnet Power: each milestone pays while flipping done, plus the
        // one-time goal-complete payout on first crossing 100% (refunded if
        // the goal falls back below 100%). Milestones still give no leaves.
        let powerDelta = target.done ? -milestonePower() : milestonePower()
        if (progress >= 100 && goal.progress < 100) powerDelta += goalCompletePower()
        if (progress < 100 && goal.progress >= 100) powerDelta -= goalCompletePower()
        return awardMxp({ ...d, goals }, powerDelta)
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
        let powerDelta = has ? -habitPower() : habitPower()
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
              return awardMxp(updated, powerDelta)
            }
          }
        }

        // Habits give no leaves — only milestone streaks earn currency. Every
        // check-in pays Magnet Power (magnet-local).
        return awardMxp({ ...d, habits }, powerDelta)
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
          mxp: typeof merged.mxp === 'number' ? merged.mxp : 0,
          mxpTotal: typeof merged.mxpTotal === 'number' ? merged.mxpTotal : Math.max(merged.mxp ?? 0, 0),
          mxpSpent: typeof merged.mxpSpent === 'number' ? merged.mxpSpent : 0,
          mxpDay:
            merged.mxpDay && typeof merged.mxpDay.value === 'number'
              ? merged.mxpDay
              : { date: todayKey(), value: 0 },
          theme: typeof merged.theme === 'string' && merged.theme ? merged.theme : MAGNET_DEFAULT_THEME_ID,
          unlockedThemes: Array.isArray(merged.unlockedThemes) ? merged.unlockedThemes : starterThemeIds(),
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
