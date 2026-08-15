// Magnet Power (MXP) — Task-Magnet-only progression scoring.
//
// MXP is earned ONLY inside the magnet (tasks, subtasks, habits, milestones)
// and is NEVER spendable or exported to the global leaves/rank economy. The
// same pure functions are used by the store (to ensure award/refund values
// match exactly) and by the views (to show the "+N" floating chip on the
// element that was just checked).
//
// Balance goals:
//   - Checking a task off must feel instantly earned (base 10).
//   - Priority and a planned estimate make it worth more — planning pays.
//   - Small actions (subtasks, habits) give small steady trickle.
//   - Milestones and goal-completion give the big one-time payouts.
//   - Un-checking refunds the exact amount — no farming via toggle loops.
//   - Recurring/spawned tasks only pay when their due date is today (or they
//     are undated), so completing a day's worth of repeats pays once per day.

import type { Priority, Task, Goal, Milestone } from './types'

export const MXP_VALUES = {
  /** Base power for a medium-priority task. */
  taskBase: 10,
  /** +5 per planned 25-minute block, capped so estimates can't be inflated. */
  estimateStep: 5,
  estimateBlockMin: 25,
  estimateCap: 20,
  /** Each subtask checked off. */
  subtask: 3,
  /** Each habit check-in. */
  habit: 5,
  /** Each goal milestone. */
  milestone: 25,
  /** A goal crossing 100% (all milestones done). */
  goalComplete: 50,
} as const

// Priority multiplies the task base: low .5 · medium 1 · high 1.5 · urgent 2.
const PRIO_MULT: Record<Priority, number> = {
  low: 0.5,
  medium: 1,
  high: 1.5,
  urgent: 2,
}

/** Power earned for completing a single task. */
export function taskPower(task: Pick<Task, 'priority' | 'estimateMin'>): number {
  const base = Math.round(MXP_VALUES.taskBase * PRIO_MULT[task.priority])
  const blocks = Math.floor(task.estimateMin / MXP_VALUES.estimateBlockMin)
  const est = Math.min(MXP_VALUES.estimateCap, blocks * MXP_VALUES.estimateStep)
  return base + est
}

/** Power earned for a habit check-in. */
export function habitPower(): number {
  return MXP_VALUES.habit
}

/** Power earned for a subtask. */
export function subtaskPower(): number {
  return MXP_VALUES.subtask
}

/** Power earned for a milestone. */
export function milestonePower(): number {
  return MXP_VALUES.milestone
}

/** Power earned when a goal crosses 100% (all milestones done). */
export function goalCompletePower(): number {
  return MXP_VALUES.goalComplete
}

/** Total power sitting in an unfinished goal's milestones (for the daily
 *  "what's still on the table" meter). */
export function goalRemainingPower(goal: Pick<Goal, 'milestones'>): number {
  return goal.milestones.filter((m: Milestone) => !m.done).length * MXP_VALUES.milestone
}

// Anti-farm: the most Magnet Power that can be *earned* in a single calendar day.
// This blocks trivial task-spam (create + complete hundreds of dummy tasks) and
// rapid toggling from flooding the economy or buying out the theme store in one
// sitting. Refunds are never capped, so a genuine un-check never costs a user
// power they already spent. The lifetime total only counts earned, capped power,
// so the magnet level bar can't be inflated by farming either.
export const MXP_DAILY_EARN_CAP = 800

/** Power still earnable today before the daily anti-farm cap kicks in (0 once hit). */
export function mxpDailyRoom(day: { date: string; value: number }, today: string): number {
  if (day.date !== today) return MXP_DAILY_EARN_CAP
  return Math.max(0, MXP_DAILY_EARN_CAP - day.value)
}